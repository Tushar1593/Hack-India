// Transcribe patient complaint audio (Hindi / English / mixed code-switched)
// Uses Lovable AI Gateway with Gemini for audio understanding.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a medical transcription assistant at an Indian clinic.
The audio may be in Hindi, English, or Hinglish (mixed code-switching).

Return STRICT JSON with this exact shape, no prose, no markdown:
{
  "transcript": "<verbatim transcript in the original language(s) as spoken>",
  "translation_en": "<faithful English translation of the transcript>",
  "language": "hi" | "en" | "hi-en",
  "detected_symptoms": ["<symptom in lowercase English>", ...],
  "duration_description": "<e.g. '2 days', 'since last night', or null>"
}

Known symptom vocabulary (prefer these keys when matching):
fever, cough, dry_cough, sore_throat, runny_nose, headache, body_ache,
fatigue, nausea, vomiting, diarrhea, abdominal_pain, chest_pain,
shortness_of_breath, dizziness, chills, rash, joint_pain, loss_of_appetite,
loss_of_smell, loss_of_taste.

Example: "2 din se bukhar hai" → symptoms: ["fever"], duration: "2 days".`;

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

    const { audio_base64, mime_type } = await req.json();
    if (!audio_base64 || typeof audio_base64 !== "string") {
      return new Response(JSON.stringify({ error: "audio_base64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (audio_base64.length > 8_000_000) {
      return new Response(JSON.stringify({ error: "Audio too large (max ~6MB)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mime = mime_type && typeof mime_type === "string" ? mime_type : "audio/webm";

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
          {
            role: "user",
            content: [
              { type: "text", text: "Transcribe and extract symptoms from this patient complaint audio." },
              {
                type: "input_audio",
                input_audio: { data: audio_base64, format: mime.includes("mp3") ? "mp3" : "wav" },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted — add funds in Settings → Workspace → Usage." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error", detail: t.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { transcript: String(content), translation_en: null, language: "unknown", detected_symptoms: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe-voice error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
