// Analyzes lab result values using Lovable AI Gateway (Gemini)
// Input: { results: [{name, value, unit, ref_low?, ref_high?}], test_name, patient_age?, patient_sex? }
// Output: { summary, abnormalities: [{parameter, value, severity, explanation}], severity }
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { results, test_name, patient_age, patient_sex, notes } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const system = `You are a senior clinical pathologist. Analyze lab results and flag abnormalities with clinical context. Be precise, conservative, and clearly mark life-threatening values as "critical". Never fabricate reference ranges — if missing, use standard adult ranges.`;

    const user = `Lab test: ${test_name}
Patient: ${patient_age ?? "?"}y ${patient_sex ?? ""}
Results: ${JSON.stringify(results)}
Tech notes: ${notes ?? "none"}

Return structured analysis: overall severity, concise summary, and per-abnormal-parameter explanations.`;

    const tools = [{
      type: "function",
      function: {
        name: "emit_analysis",
        description: "Emit structured lab analysis",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string", description: "2-3 sentence clinical summary" },
            severity: {
              type: "string",
              enum: ["normal", "mild", "moderate", "severe", "critical"],
            },
            abnormalities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  parameter: { type: "string" },
                  value: { type: "string" },
                  reference: { type: "string" },
                  severity: { type: "string", enum: ["mild", "moderate", "severe", "critical"] },
                  explanation: { type: "string" },
                },
                required: ["parameter", "value", "severity", "explanation"],
              },
            },
            recommended_actions: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "severity", "abnormalities"],
        },
      },
    }];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "emit_analysis" } },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway: ${res.status} ${t}`);
    }

    const data = await res.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : { summary: "", severity: "normal", abnormalities: [] };

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
