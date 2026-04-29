// Symptom + vitals -> ranked disease probabilities via Gemini tool-calling.
// NOT a medical device. Output is a decision-support hint for clinicians.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a triage assistant for a general hospital in India.
Given symptoms, vitals, and patient age/sex, return a ranked list of the most likely
common conditions as probabilities that sum to ~100. Consider conditions that are
common in the Indian subcontinent (dengue, typhoid, malaria, chikungunya, viral fever,
pneumonia, gastroenteritis, UTI, etc.) alongside general conditions.

Rules:
- Always return 3–5 candidate conditions. Probabilities are integers summing to 100.
- Add a "red_flags" array of findings that need urgent attention (e.g. high fever with
  low BP, SpO2 < 92, severe dehydration).
- Add a "recommended_tests" array: small list of inexpensive first-line tests.
- Add a "priority" field: "low" | "medium" | "high" | "critical".
- Add a concise "rationale" (max 40 words).
- This is decision support, not a diagnosis. Err on the side of flagging serious conditions.`;

const tool = {
  type: "function",
  function: {
    name: "return_diagnosis",
    description: "Return ranked differential diagnosis with triage priority.",
    parameters: {
      type: "object",
      properties: {
        candidates: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              condition: { type: "string" },
              probability: { type: "integer", minimum: 0, maximum: 100 },
              reasoning: { type: "string" },
            },
            required: ["condition", "probability", "reasoning"],
            additionalProperties: false,
          },
        },
        red_flags: { type: "array", items: { type: "string" } },
        recommended_tests: { type: "array", items: { type: "string" } },
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        rationale: { type: "string" },
      },
      required: ["candidates", "red_flags", "recommended_tests", "priority", "rationale"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { symptoms = [], vitals = {}, age, sex, notes = "" } = body ?? {};
    if (!Array.isArray(symptoms) || symptoms.length === 0) {
      return new Response(JSON.stringify({ error: "symptoms array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPayload = {
      age: age ?? null,
      sex: sex ?? null,
      symptoms,
      vitals: {
        heart_rate: vitals.heart_rate ?? null,
        bp: vitals.bp_systolic && vitals.bp_diastolic ? `${vitals.bp_systolic}/${vitals.bp_diastolic}` : null,
        temperature_c: vitals.temperature_c ?? null,
        spo2: vitals.spo2 ?? null,
        respiratory_rate: vitals.respiratory_rate ?? null,
        glucose: vitals.glucose ?? null,
      },
      notes,
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "return_diagnosis" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted — add funds in Settings → Workspace → Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error", detail: t.slice(0, 500) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    if (!args) {
      return new Response(JSON.stringify({ error: "No diagnosis returned", raw: data }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(args);
    } catch {
      return new Response(JSON.stringify({ error: "Could not parse diagnosis JSON" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize probabilities to sum to 100
    if (Array.isArray(parsed.candidates)) {
      const sum = parsed.candidates.reduce((s: number, c: { probability?: number }) => s + (c.probability ?? 0), 0);
      if (sum > 0 && sum !== 100) {
        parsed.candidates = parsed.candidates.map((c: { probability: number }) => ({
          ...c,
          probability: Math.round((c.probability / sum) * 100),
        }));
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("diagnose-symptoms error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
