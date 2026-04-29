// Transcript -> symptom probabilities + suggested meds/tests/exercise + risk & recovery estimate.
// NOT a medical device. Output is decision-support only.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SymptomOut = { name: string; probability: number; evidence: string };

const SYSTEM_PROMPT = `You are a careful clinical triage assistant for an Indian outpatient clinic.
You will be given a doctor–patient conversation transcript (may be Hindi/English/Hinglish).
Focus primarily on the patient-reported symptoms and complaints from the conversation.

Extract the most likely symptoms *the patient is experiencing* (not diseases) with probabilities.
Then suggest conservative first-line actions:
- Medicines: Suggest only symptom-based medicines/supportive care.
  - Prefer OTC-safe first-line options.
  - If prescription treatment may be needed, include "consult doctor".
  - For each medicine suggestion, include short context like "for <symptom>" so doctors understand why it is suggested.
- Tests: first-line, inexpensive, only if clinically indicated.
- Exercises: safe lifestyle/exercise advice relevant to symptoms.

Also compute:
- risk_score (0-100): risk of meaningful health issue needing clinical attention soon.
- recovery_rate_estimate (0-100): estimated chance of uncomplicated recovery within 7-10 days assuming appropriate care.

Rules:
- Always return 4–8 symptoms. Symptom probabilities are integers that sum to 100.
- Use lowercase snake_case symptom names when possible (e.g. sore_throat, shortness_of_breath).
- Include evidence quotes/snippets from the transcript per symptom.
- Do not suggest medicines that are unrelated to extracted symptoms.
- If transcript suggests emergency signs, add them to red_flags and raise risk_score.
- Never give definitive diagnosis. Avoid harmful medication advice.
`;

const tool = {
  type: "function",
  function: {
    name: "emit_consultation_analysis",
    description: "Emit structured consultation analysis from transcript",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "1-3 sentences summary of the complaint" },
        symptoms: {
          type: "array",
          minItems: 4,
          maxItems: 8,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              probability: { type: "integer", minimum: 0, maximum: 100 },
              evidence: { type: "string" },
            },
            required: ["name", "probability", "evidence"],
            additionalProperties: false,
          },
        },
        medicines: { type: "array", items: { type: "string" } },
        tests: { type: "array", items: { type: "string" } },
        exercises: { type: "array", items: { type: "string" } },
        red_flags: { type: "array", items: { type: "string" } },
        risk_score: { type: "integer", minimum: 0, maximum: 100 },
        recovery_rate_estimate: { type: "integer", minimum: 0, maximum: 100 },
      },
      required: [
        "summary",
        "symptoms",
        "medicines",
        "tests",
        "exercises",
        "red_flags",
        "risk_score",
        "recovery_rate_estimate",
      ],
      additionalProperties: false,
    },
  },
};

const MEDICINE_SYSTEM_PROMPT = `You are a clinical support assistant.
Given a list of patient symptoms, suggest conservative symptom-based medicines for an Indian outpatient setting.
Rules:
- Focus only on symptom relief medicines/supportive care.
- Prefer OTC-safe options first.
- If prescription treatment may be required, add "consult doctor".
- Every medicine line must clearly include "for <symptom>".
- Do not include diagnosis claims.
- Return ONLY valid JSON array of strings.`;

function clampInt(n: unknown, lo: number, hi: number, fallback: number) {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(lo, Math.min(hi, Math.round(x)));
}

function normalizeTo100(items: SymptomOut[]): SymptomOut[] {
  if (items.length === 0) return items;
  const sum = items.reduce((s, x) => s + (Number.isFinite(x.probability) ? x.probability : 0), 0);
  if (sum <= 0) {
    const p = Math.floor(100 / items.length);
    let remaining = 100 - p * items.length;
    return items.map((x, i) => ({ ...x, probability: p + (i === 0 ? remaining : 0) }));
  }
  // scale to 100
  const scaled = items.map((x) => ({
    ...x,
    probability: Math.max(0, Math.round((x.probability / sum) * 100)),
  }));
  // fix rounding drift
  const drift = 100 - scaled.reduce((s, x) => s + x.probability, 0);
  if (drift !== 0) scaled[0].probability = Math.max(0, scaled[0].probability + drift);
  return scaled;
}

function sanitizeSymptomToken(input: string) {
  return String(input || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMedicineArray(text: string): string[] {
  const raw = String(text || "").trim();
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr.map((x) => String(x ?? "").trim()).filter(Boolean);
    }
  } catch {
    // Fallback below.
  }
  return raw
    .split(/\r?\n|,|;|•|\u2022/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

async function generateMedicinesFromSymptoms(
  symptomNames: string[],
  lovableKey?: string | null,
) {
  const cleanedSymptoms = Array.from(new Set(symptomNames.map(sanitizeSymptomToken).filter(Boolean))).slice(0, 8);
  if (cleanedSymptoms.length === 0) return [];
  if (!lovableKey) return [];

  const res = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: MEDICINE_SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              symptoms: cleanedSymptoms,
              required_format:
                '["Paracetamol (as per label) for fever", "Warm fluids for sore throat", "Consult doctor for severe shortness of breath"]',
            }),
          },
        ],
        temperature: 0.2,
      }),
    },
  );

  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  const content = data?.choices?.[0]?.message?.content;
  return parseMedicineArray(content);
}

function ruleBasedAnalysis(transcript: string) {
  const t = transcript.toLowerCase();
  const evidence = (kw: string) => {
    const idx = t.indexOf(kw);
    if (idx < 0) return "";
    return transcript.slice(Math.max(0, idx - 24), Math.min(transcript.length, idx + kw.length + 24));
  };

  const symptomRules: Array<{
    name: string;
    keywords: string[];
    base: number;
    redFlag?: boolean;
    medicines: string[];
    tests: string[];
    exercises: string[];
  }> = [
    {
      name: "fever",
      keywords: ["fever", "temperature", "bukhar", "high temp"],
      base: 28,
      redFlag: true,
      medicines: ["Paracetamol (as per label)", "ORS / fluids", "Rest"],
      tests: ["CBC", "Dengue NS1/IgM (if fever ≥2 days)", "Malaria rapid test (if chills/region)"],
      exercises: ["Rest until afebrile", "Gentle walking after improvement"],
    },
    {
      name: "cough",
      keywords: ["cough", "khansi"],
      base: 16,
      medicines: ["Warm fluids", "Honey + ginger (if suitable)", "Consult doctor if persistent >7 days"],
      tests: ["Chest X-ray (if severe/persistent)", "Pulse oximetry"],
      exercises: ["Steam inhalation", "Breathing exercises (diaphragmatic)"],
    },
    {
      name: "sore_throat",
      keywords: ["sore throat", "throat pain", "gala dard"],
      base: 10,
      medicines: ["Warm saltwater gargles", "Lozenges (as per label)"],
      tests: ["Rapid strep test (if high fever, exudates)"],
      exercises: ["Voice rest", "Warm fluids"],
    },
    {
      name: "headache",
      keywords: ["headache", "migraine", "sir dard"],
      base: 12,
      redFlag: true,
      medicines: ["Paracetamol (as per label)", "Hydration", "Avoid bright screens if migraine-like"],
      tests: ["BP check", "Consult doctor if severe/sudden"],
      exercises: ["Neck stretches", "Sleep hygiene"],
    },
    {
      name: "nausea",
      keywords: ["nausea", "vomit", "vomiting", "ulti"],
      base: 12,
      redFlag: true,
      medicines: ["ORS / small sips of fluids", "Light diet (banana, rice, toast)"],
      tests: ["Electrolytes (if repeated vomiting)", "Urine test (dehydration/UTI symptoms)"],
      exercises: ["Rest", "Slow breathing"],
    },
    {
      name: "diarrhea",
      keywords: ["diarrhea", "loose motion", "loose motions", "dast"],
      base: 12,
      redFlag: true,
      medicines: ["ORS", "Zinc (if advised)", "Avoid oily/spicy food"],
      tests: ["Stool test (if blood/persistent)", "Electrolytes (if dehydration)"],
      exercises: ["Rest", "Hydration reminders"],
    },
    {
      name: "shortness_of_breath",
      keywords: ["shortness of breath", "breathless", "saans", "difficulty breathing"],
      base: 20,
      redFlag: true,
      medicines: ["Seek urgent care if worsening", "Avoid exertion"],
      tests: ["SpO₂ check", "Chest X-ray", "ECG (if chest pain)"],
      exercises: ["Pursed-lip breathing", "Positioning (sit upright)"],
    },
    {
      name: "chest_pain",
      keywords: ["chest pain", "tightness", "seene me dard"],
      base: 18,
      redFlag: true,
      medicines: ["Seek urgent care immediately if severe", "Avoid exertion"],
      tests: ["ECG", "Troponin (if indicated)", "Chest X-ray"],
      exercises: ["Rest only until evaluated"],
    },
    {
      name: "fatigue",
      keywords: ["fatigue", "tired", "weakness", "thakan"],
      base: 10,
      medicines: ["Rest", "Hydration", "Balanced diet"],
      tests: ["CBC", "TSH (if persistent)", "Blood sugar (if symptoms)"],
      exercises: ["Gradual walking", "Light stretching"],
    },
  ];

  const matched = symptomRules
    .map((r) => {
      const hit = r.keywords.find((k) => t.includes(k));
      return hit
        ? ({
            ...r,
            hit,
          } as const)
        : null;
    })
    .filter(Boolean) as Array<(typeof symptomRules)[number] & { hit: string }>;

  const symptoms: SymptomOut[] =
    matched.length > 0
      ? normalizeTo100(
          matched
            .slice(0, 8)
            .map((m) => ({ name: m.name, probability: m.base, evidence: evidence(m.hit) || m.hit })),
        )
      : normalizeTo100([
          { name: "general_discomfort", probability: 50, evidence: "No clear symptom keywords found" },
          { name: "fatigue", probability: 50, evidence: "General complaint" },
        ]);

  const medicines = Array.from(new Set(matched.flatMap((m) => m.medicines))).slice(0, 8);
  const tests = Array.from(new Set(matched.flatMap((m) => m.tests))).slice(0, 8);
  const exercises = Array.from(new Set(matched.flatMap((m) => m.exercises))).slice(0, 8);

  const redFlags: string[] = [];
  if (t.includes("spo2") || t.includes("oxygen") || t.includes("low oxygen")) redFlags.push("low oxygen mentioned");
  if (matched.some((m) => m.redFlag) && (t.includes("severe") || t.includes("very high") || t.includes("unbearable")))
    redFlags.push("severe symptoms mentioned");
  if (t.includes("faint") || t.includes("passed out")) redFlags.push("syncope/fainting");

  const baseRisk = matched.some((m) => m.name === "shortness_of_breath" || m.name === "chest_pain") ? 78 : 45;
  const risk = clampInt(baseRisk + redFlags.length * 8 + Math.min(20, matched.length * 4), 0, 100, 50);
  const recovery = clampInt(85 - risk * 0.6, 0, 100, 60);

  return {
    summary: "Rule-based analysis (no AI key configured).",
    symptoms,
    medicines,
    tests,
    exercises,
    red_flags: redFlags,
    risk_score: risk,
    recovery_rate_estimate: recovery,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const body = await req.json().catch(() => ({}));
    const transcript = body?.transcript;
    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 8) {
      return new Response(JSON.stringify({ error: "transcript required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No-key fallback so the project works without external AI credentials.
    if (!lovableKey) {
      const out = ruleBasedAnalysis(transcript.trim());
      return new Response(JSON.stringify(out), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      transcript: transcript.trim(),
      age: body?.age ?? null,
      sex: body?.sex ?? null,
      vitals: body?.vitals ?? null,
      notes: body?.notes ?? null,
    };

    const res = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify(payload) },
          ],
          tools: [tool],
          tool_choice: { type: "function", function: { name: "emit_consultation_analysis" } },
        }),
      },
    );

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted — add funds in Settings → Workspace → Usage." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const t = await res.text();
      console.error("analyze-consultation upstream error", res.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error", detail: t.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    if (!args) {
      return new Response(JSON.stringify({ error: "No analysis returned", raw: data }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(args);
    } catch {
      return new Response(JSON.stringify({ error: "Could not parse analysis JSON" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize symptom probabilities to sum to 100 (best-effort)
    if (Array.isArray(parsed.symptoms)) {
      const sum = parsed.symptoms.reduce((s: number, x: any) => s + (Number(x?.probability) || 0), 0);
      if (sum > 0 && sum !== 100) {
        parsed.symptoms = parsed.symptoms.map((x: any) => ({
          ...x,
          probability: Math.round(((Number(x?.probability) || 0) / sum) * 100),
        }));
      }
    }

    parsed.risk_score = clampInt(parsed.risk_score, 0, 100, 50);
    parsed.recovery_rate_estimate = clampInt(parsed.recovery_rate_estimate, 0, 100, 60);

    // Hard requirement: once symptoms are detected, ask AI specifically for symptom-linked medicines.
    const symptomNames = Array.isArray(parsed?.symptoms)
      ? parsed.symptoms.map((s: any) => String(s?.name ?? "")).filter(Boolean)
      : [];
    const symptomBasedMedicines = await generateMedicinesFromSymptoms(symptomNames, lovableKey);
    if (symptomBasedMedicines.length > 0) {
      parsed.medicines = symptomBasedMedicines;
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-consultation error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

