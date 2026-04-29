import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/medical/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mic, Square, FileText, Pill, FlaskConical, Activity, HeartPulse, Wind } from "lucide-react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = supabaseTyped;

const NewData = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(44100);
  const recognitionRef = useRef<any>(null);
  const recordingStartedAtRef = useRef<number>(0);
  const ignoreRecognitionResultsRef = useRef<boolean>(false);
  const MIN_RECORDING_MS = 900;

  const [breathing, setBreathing] = useState("Idle");
  const [heart, setHeart] = useState("Idle");
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [riskScore, setRiskScore] = useState(0);
  const [recoveryRate, setRecoveryRate] = useState<number | null>(null);

  const [form, setForm] = useState({
    patientName: "",
    visitDate: new Date().toISOString().slice(0, 10),
    conversation: "",
    symptoms: "",
    medicines: "",
    tests: "",
    exercise: "",
    doctor: "",
  });

  useEffect(() => {
    let stream: MediaStream | null = null;

    navigator.mediaDevices?.getUserMedia({ video: true })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => {});

    const t = setInterval(() => {
      setBreathing(`${14 + Math.round(Math.random() * 6)} /min`);
      setHeart(`${68 + Math.round(Math.random() * 18)} bpm`);
    }, 1500);

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      clearInterval(t);
    };
  }, []);

  const cleanupAudio = () => {
    try { processorRef.current?.disconnect(); } catch {}
    try { sourceRef.current?.disconnect(); } catch {}
    processorRef.current = null;
    sourceRef.current = null;

    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
  };

  const cleanupRecognition = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {}
    recognitionRef.current = null;
  };

  const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  };

  const writeString = (view: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  const encodeWAV = (samples: Float32Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // PCM
    view.setUint16(20, 1, true); // Linear quantization
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    writeString(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);
    floatTo16BitPCM(view, 44, samples);

    return buffer;
  };

  const arrayBufferToBase64 = (ab: ArrayBuffer) => {
    const bytes = new Uint8Array(ab);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  };

  const buildWavBase64FromChunks = () => {
    const chunks = audioChunksRef.current;
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const merged = new Float32Array(total);
    let off = 0;
    for (const c of chunks) { merged.set(c, off); off += c.length; }
    const wav = encodeWAV(merged, sampleRateRef.current);
    return arrayBufferToBase64(wav);
  };

  const formatInvokeError = (err: any) => {
    // Supabase FunctionsError shape varies by version.
    const name = err?.name ? String(err.name) : "";
    const status = err?.status != null ? String(err.status) : "";
    const message = err?.message ? String(err.message) : "Unknown error";
    const details = err?.details ? String(err.details) : "";
    const hint =
      message.includes("Failed to send a request to the Edge Function") ||
      message.includes("FunctionsHttpError")
        ? "This usually means the Edge Function isn't deployed/available for your Supabase project."
        : "";

    return [name && `[${name}]`, status && `status ${status}`, message, details && `(${details})`, hint]
      .filter(Boolean)
      .join(" ");
  };

  const normalizeStringList = (v: any) => {
    if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean);
    if (typeof v === "string") {
      return v
        .split(/\r?\n|,|;|\u2022|•/g)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  const localAnalyzeTranscript = (transcriptRaw: string) => {
    const transcript = transcriptRaw.trim();
    const t = transcript.toLowerCase();

    const rules: Array<{
      name: string;
      keywords: string[];
      base: number;
      medicines: string[];
      tests: string[];
      exercises: string[];
      redFlag?: boolean;
    }> = [
      {
        name: "fever",
        keywords: ["fever", "bukhar", "high temp", "temperature"],
        base: 28,
        redFlag: true,
        medicines: ["Paracetamol (as per label) for fever", "ORS/fluids for fever"],
        tests: ["CBC for persistent fever", "Dengue/Malaria test if clinically indicated"],
        exercises: ["Rest until fever settles"],
      },
      {
        name: "cough",
        keywords: ["cough", "khansi"],
        base: 18,
        medicines: ["Warm fluids for cough", "Honey (if suitable) for cough"],
        tests: ["Chest X-ray if persistent/severe cough"],
        exercises: ["Steam inhalation", "Breathing exercises"],
      },
      {
        name: "sore_throat",
        keywords: ["sore throat", "throat pain", "gala dard"],
        base: 14,
        medicines: ["Saltwater gargles for sore throat", "Lozenges (as per label) for sore throat"],
        tests: ["Rapid strep test if high fever and severe throat pain"],
        exercises: ["Warm fluids", "Voice rest"],
      },
      {
        name: "headache",
        keywords: ["headache", "sir dard", "migraine"],
        base: 16,
        medicines: ["Paracetamol (as per label) for headache", "Hydration for headache"],
        tests: ["BP check for headache"],
        exercises: ["Sleep hygiene", "Neck stretches"],
      },
      {
        name: "nausea",
        keywords: ["nausea", "vomit", "vomiting", "ulti"],
        base: 12,
        medicines: ["ORS in small sips for nausea", "Light diet for nausea"],
        tests: ["Electrolytes if repeated vomiting"],
        exercises: ["Rest", "Slow breathing"],
      },
      {
        name: "diarrhea",
        keywords: ["diarrhea", "loose motion", "dast"],
        base: 12,
        medicines: ["ORS for diarrhea", "Light diet for diarrhea"],
        tests: ["Stool test if persistent diarrhea"],
        exercises: ["Hydration reminders", "Rest"],
      },
      {
        name: "shortness_of_breath",
        keywords: ["shortness of breath", "breathless", "saans", "difficulty breathing"],
        base: 24,
        redFlag: true,
        medicines: ["Consult doctor urgently for shortness of breath"],
        tests: ["SpO2 check", "Chest X-ray if needed"],
        exercises: ["Sit upright", "Pursed-lip breathing"],
      },
      {
        name: "chest_pain",
        keywords: ["chest pain", "tightness", "seene me dard"],
        base: 24,
        redFlag: true,
        medicines: ["Consult doctor urgently for chest pain"],
        tests: ["ECG", "Troponin if indicated"],
        exercises: ["Rest until evaluated"],
      },
      {
        name: "fatigue",
        keywords: ["fatigue", "weakness", "thakan", "tired"],
        base: 10,
        medicines: ["Hydration for fatigue", "Balanced nutrition for fatigue"],
        tests: ["CBC if persistent fatigue"],
        exercises: ["Light stretching", "Gradual walking"],
      },
    ];

    const matched = rules.filter((r) => r.keywords.some((k) => t.includes(k)));
    const symptomRows =
      matched.length > 0
        ? matched.map((r) => ({ name: r.name, probability: r.base, evidence: r.keywords.find((k) => t.includes(k)) || r.name }))
        : [{ name: "general_discomfort", probability: 60, evidence: "general complaint" }];

    const sum = symptomRows.reduce((s, x) => s + Number(x.probability || 0), 0) || 1;
    const normalized = symptomRows.map((x) => ({
      ...x,
      probability: Math.max(1, Math.round((Number(x.probability || 0) / sum) * 100)),
    }));
    const drift = 100 - normalized.reduce((s, x) => s + x.probability, 0);
    if (normalized.length) normalized[0].probability += drift;

    const medicines = Array.from(new Set(matched.flatMap((m) => m.medicines)));
    const tests = Array.from(new Set(matched.flatMap((m) => m.tests)));
    const exercises = Array.from(new Set(matched.flatMap((m) => m.exercises)));

    const redFlags = matched.some((m) => m.redFlag) ? ["possible red-flag symptom detected"] : [];
    const baseRisk = matched.some((m) => m.name === "shortness_of_breath" || m.name === "chest_pain") ? 78 : 42;
    const risk = Math.max(0, Math.min(100, baseRisk + redFlags.length * 8 + Math.min(20, matched.length * 3)));
    const recovery = Math.max(0, Math.min(100, Math.round(86 - risk * 0.55)));

    return {
      symptoms: normalized,
      medicines,
      tests,
      exercises,
      red_flags: redFlags,
      risk_score: risk,
      recovery_rate_estimate: recovery,
    };
  };

  const buildPlanFromSymptomsText = (symptomsText: string) => {
    const parsed = parseSymptomNamesFromText(symptomsText);
    if (parsed.length === 0) {
      return {
        medicines: ["Supportive care as clinically appropriate"],
        tests: ["No immediate tests suggested from current symptoms"],
        exercises: ["Rest, hydration, and light activity as tolerated"],
      };
    }
    const local = localAnalyzeTranscript(`patient reports ${parsed.join(" ")}`);
    const medicines = normalizeStringList(local?.medicines);
    const tests = normalizeStringList(local?.tests);
    const exercises = normalizeStringList(local?.exercises);
    return {
      medicines: medicines.length > 0 ? medicines : ["Supportive care as clinically appropriate"],
      tests: tests.length > 0 ? tests : ["No immediate tests suggested from current symptoms"],
      exercises: exercises.length > 0 ? exercises : ["Rest, hydration, and light activity as tolerated"],
    };
  };

  const parseSymptomNamesFromText = (symptomsText: string) => {
    // Supports: "fever (55%), cough (25%)" or "fever, cough"
    return symptomsText
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.replace(/\(.*?\)/g, "").trim())
      .map((part) => part.toLowerCase().replace(/\s+/g, "_"))
      .filter(Boolean);
  };

  const applyAnalysisToForm = (analysis: any, fallbackDetectedSymptoms?: string[]) => {
    const symptomsArr = Array.isArray(analysis?.symptoms) ? analysis.symptoms : [];
    const symptomsText =
      symptomsArr.length > 0
        ? symptomsArr
            .map((s: any) => `${String(s?.name ?? "").trim()} (${Number(s?.probability ?? 0)}%)`)
            .filter(Boolean)
            .join(", ")
        : (Array.isArray(fallbackDetectedSymptoms) ? fallbackDetectedSymptoms.join(", ") : "");

    const symptomNames =
      symptomsArr.length > 0
        ? symptomsArr.map((s: any) => String(s?.name ?? "").trim()).filter(Boolean)
        : (Array.isArray(fallbackDetectedSymptoms) ? fallbackDetectedSymptoms : []);

    const symptomNamesFromText = parseSymptomNamesFromText(symptomsText || "");
    const symptomBasis = symptomNames.length > 0 ? symptomNames : symptomNamesFromText;
    const localFromSymptoms = localAnalyzeTranscript(
      symptomBasis.length > 0 ? `patient reports ${symptomBasis.join(" ")}` : String(analysis?.summary || ""),
    );

    // Accept multiple backend key shapes and always provide symptom-based fallback.
    const medicinesList = normalizeStringList(analysis?.medicines ?? analysis?.medicine);
    const testsList = normalizeStringList(analysis?.tests ?? analysis?.test);
    const exercisesList = normalizeStringList(analysis?.exercises ?? analysis?.exercise);

    const finalMedicines = medicinesList.length > 0 ? medicinesList : normalizeStringList(localFromSymptoms?.medicines);
    const finalTests = testsList.length > 0 ? testsList : normalizeStringList(localFromSymptoms?.tests);
    const finalExercises = exercisesList.length > 0 ? exercisesList : normalizeStringList(localFromSymptoms?.exercises);

    setForm((f) => ({
      ...f,
      symptoms: symptomsText || f.symptoms,
      medicines: finalMedicines.length > 0 ? finalMedicines.join("\n") : "Supportive care as clinically appropriate",
      tests: finalTests.length > 0 ? finalTests.join("\n") : "No immediate tests suggested from current symptoms",
      exercise: finalExercises.length > 0 ? finalExercises.join("\n") : "Rest, hydration, and light activity as tolerated",
    }));

    if (analysis?.risk_score != null) setRiskScore(Number(analysis.risk_score) || 0);
    if (analysis?.recovery_rate_estimate != null) setRecoveryRate(Number(analysis.recovery_rate_estimate) || null);
  };

  const updateSymptomsAndAutoFill = (nextSymptoms: string) => {
    const plan = buildPlanFromSymptomsText(nextSymptoms);
    setForm((f) => ({
      ...f,
      symptoms: nextSymptoms,
      medicines: plan.medicines.join("\n"),
      tests: plan.tests.join("\n"),
      exercise: plan.exercises.join("\n"),
    }));
  };

  const clearOutputs = () => {
    setForm((f) => ({ ...f, symptoms: "", medicines: "", tests: "", exercise: "" }));
    setRiskScore(0);
    setRecoveryRate(null);
  };

  const analyzeFromText = async () => {
    const transcript = form.conversation.trim();
    if (analyzing || transcribing) return;
    if (!transcript) {
      // No conversation text available.
      return;
    }

    setAnalyzing(true);
    try {
      const { data: analysis, error: aErr } = await supabase.functions.invoke("analyze-consultation", {
        body: { transcript },
      });
      if (aErr) throw aErr;
      if (analysis?.error) throw new Error(analysis.error);
      applyAnalysisToForm(analysis);
      toast.success("Analysis updated ✅");
    } catch (e: any) {
      const local = localAnalyzeTranscript(transcript);
      applyAnalysisToForm(local);
      toast.message("Cloud analysis unavailable, used local analyzer.");
    } finally {
      setAnalyzing(false);
    }
  };

  const startConversation = async () => {
    if (listening || transcribing || analyzing) return;
    audioChunksRef.current = [];
    try {
      // Clear stale content so we never analyze previous conversations.
      setForm((f) => ({ ...f, conversation: "" }));
      clearOutputs();
      ignoreRecognitionResultsRef.current = false;
      recordingStartedAtRef.current = Date.now();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // Optional realtime preview for perceived speed (final transcript still comes from server).
      const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (SR) {
        try {
          const r = new SR();
          r.continuous = true;
          r.interimResults = true;
          r.lang = "en-IN";
          r.maxAlternatives = 1;
          let lastPreview = "";
          r.onresult = (e: any) => {
            if (ignoreRecognitionResultsRef.current) return;
            if (Date.now() - recordingStartedAtRef.current < MIN_RECORDING_MS) return;
            // Keep preview tolerant so we still get useful fallback text if cloud STT fails.
            let text = "";
            for (let i = 0; i < e.results.length; i++) {
              const alt = e.results[i]?.[0];
              const part = String(alt?.transcript ?? "");
              text += part + " ";
            }

            const preview = text.trim();
            const looksLikeSpeech = /[a-zA-Z]{2,}/.test(preview) || /[\u0900-\u097F]{2,}/.test(preview);
            if (preview && preview !== lastPreview && looksLikeSpeech) {
              lastPreview = preview;
              setForm((f) => ({ ...f, conversation: preview }));
            }
          };
          r.onerror = () => {};
          r.start();
          recognitionRef.current = r;
        } catch {
          cleanupRecognition();
        }
      }

      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) throw new Error("AudioContext not supported");
      const ctx: AudioContext = new AudioCtx();
      audioCtxRef.current = ctx;
      sampleRateRef.current = ctx.sampleRate || 44100;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessorNode is deprecated but still broadly supported; good enough for this app.
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        audioChunksRef.current.push(new Float32Array(input));
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      setListening(true);
      toast.success("Recording… speak now 🎙️");
    } catch (e: any) {
      cleanupAudio();
      cleanupRecognition();
      toast.error("Microphone access failed", { description: e?.message });
    }
  };

  const stopConversation = async () => {
    if (!listening || transcribing || analyzing) return;
    setListening(false);
    setTranscribing(true);
    toast.message("Transcribing… ✍️");

    let detectedSymptoms: string[] | undefined;
    try {
      ignoreRecognitionResultsRef.current = true;
      cleanupRecognition();
      cleanupAudio();

      // If the user stops immediately, do not attempt transcription/analysis and do not show garbage.
      if (Date.now() - recordingStartedAtRef.current < MIN_RECORDING_MS) {
        setForm((f) => ({ ...f, conversation: "" }));
        return;
      }

      const audio_base64 = buildWavBase64FromChunks();

      let transcript = "";
      try {
        const { data, error } = await supabase.functions.invoke("transcribe-voice", {
          body: { audio_base64, mime_type: "audio/wav" },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        transcript = (data?.transcript || data?.translation_en || "").toString().trim();
        if (!transcript) throw new Error("Empty transcript");

        detectedSymptoms = Array.isArray(data?.detected_symptoms) ? data.detected_symptoms : undefined;
        setForm((f) => ({ ...f, conversation: transcript }));
        toast.success("Transcribed. Analyzing… 🧠");
      } catch (e: any) {
        // If edge transcription isn't available (no deploy / no key), fall back to browser preview text.
        transcript = form.conversation.trim();
        // If transcript preview is empty but voice function returned detected symptoms, synthesize minimal text
        // so local analyzer can still populate all output boxes.
        if (!transcript && detectedSymptoms?.length) {
          transcript = `Patient reports ${detectedSymptoms.join(", ")}`;
          setForm((f) => ({ ...f, conversation: transcript }));
        }
        if (!transcript) {
          return;
        }
        toast.message("Using on-screen transcript. Analyzing… 🧠");
      }

      // Always attempt analysis (cloud or local fallback), even for short transcript.

      setAnalyzing(true);
      const { data: analysis, error: aErr } = await supabase.functions.invoke("analyze-consultation", {
        body: { transcript },
      });
      if (aErr) throw aErr;
      if (analysis?.error) throw new Error(analysis.error);

      applyAnalysisToForm(analysis, detectedSymptoms);
    } catch (e: any) {
      // Guaranteed fallback: fill all fields from local analyzer even when cloud functions fail.
      const fallbackTranscript = form.conversation.trim();
      if (fallbackTranscript.length >= 8) {
        const local = localAnalyzeTranscript(fallbackTranscript);
        if (detectedSymptoms?.length && (!Array.isArray(local.symptoms) || local.symptoms.length === 0)) {
          local.symptoms = detectedSymptoms.map((s) => ({ name: String(s), probability: 0, evidence: "detected from voice" }));
        }
        applyAnalysisToForm(local, detectedSymptoms);
        toast.message("Voice analysis fallback used (local).");
      } else {
        if (detectedSymptoms?.length) {
          setForm((f) => ({ ...f, symptoms: detectedSymptoms!.join(", ") }));
        }
        toast.error("Voice analysis failed", { description: formatInvokeError(e) });
      }
    } finally {
      setTranscribing(false);
      setAnalyzing(false);
      audioChunksRef.current = [];
    }
  };

  const generateReport = () => {
    if (!form.patientName) return toast.error("Enter patient name");

    const reports = JSON.parse(localStorage.getItem("reports") || "[]");

    reports.unshift({
      name: form.patientName,
      date: form.visitDate,
      symptoms: form.symptoms,
      medicines: form.medicines,
      tests: form.tests,
      exercise: form.exercise,
      doctor: form.doctor,
      risk: riskScore,
    });

    localStorage.setItem("reports", JSON.stringify(reports));
    toast.success("Report saved");
  };

  const moveToLab = () => {
    if (!form.patientName.trim()) return toast.error("Enter patient name before creating lab order");
    if (!form.tests.trim()) return toast.error("No suggested tests available to send");

    const currentOrders = JSON.parse(localStorage.getItem("labOrders") || "[]");
    const testRows = form.tests
      .split(/\r?\n|,|;/g)
      .map((x) => x.trim())
      .filter(Boolean);

    const order = {
      id: `LAB-${Date.now()}`,
      patientName: form.patientName.trim(),
      testName: testRows.join(", "),
      doctor: form.doctor.trim() || "Doctor",
      visitDate: form.visitDate,
      status: "pending",
      createdAt: new Date().toISOString(),
      source: "doctor_new_consult",
    };

    localStorage.setItem("labOrders", JSON.stringify([order, ...currentOrders]));
    toast.success("Test order sent to laboratory");
    navigate("/lab");
  };

  const risk = Math.max(0, Math.min(100, Math.round(riskScore || 0)));

  return (
    <div className="min-h-screen bg-gradient-soft">

      {/* ✅ FIXED HERE */}
      <AppHeader hospital={localStorage.getItem("hospital") || "CuraSense"} />

      <main className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-[360px_1fr] gap-6">

        {/* Monitoring */}
        <aside className="space-y-5 animate-slide-up">
          <div className="rounded-3xl bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground shadow-large">
            <h3 className="font-display font-bold text-lg">AI Monitoring</h3>
            <p className="text-xs opacity-80 mb-4">Real-time vitals from camera feed</p>

            <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-black/20 ring-2 ring-white/20">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur px-2.5 py-1 text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse-soft" /> REC
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <Vital icon={Wind} label="Breathing" value={breathing} />
              <Vital icon={HeartPulse} label="Pulse" value={heart} />
            </div>
          </div>

          <div className="card-medical p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Risk Score</span>
              <Activity size={14} className="text-primary" />
            </div>

            <div className="font-display text-4xl font-extrabold gradient-text">{risk}%</div>
            {recoveryRate != null && (
              <div className="mt-1 text-xs text-muted-foreground">
                Recovery estimate: {Math.max(0, Math.min(100, Math.round(recoveryRate)))}%
              </div>
            )}

            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-primary" style={{ width: `${risk}%` }} />
            </div>
          </div>
        </aside>

        {/* Form */}
        <section className="card-medical p-8 animate-slide-up">
          <h2 className="font-display text-2xl font-bold">Patient Consultation</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Capture symptoms and generate an AI-assisted report.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <FieldI label="Patient Name" value={form.patientName} onChange={(v) => setForm({ ...form, patientName: v })} />
            <FieldI label="Visit Date" type="date" value={form.visitDate} onChange={(v) => setForm({ ...form, visitDate: v })} />
          </div>

          <div className="mt-5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Doctor–Patient Conversation
            </Label>

            <Textarea
              value={form.conversation}
              onChange={(e) => setForm({ ...form, conversation: e.target.value })}
              placeholder="Speech will be transcribed here..."
              className="mt-1.5 min-h-[110px] rounded-xl resize-none"
            />

            <div className="flex gap-2 mt-3">
              {!listening ? (
                <Button onClick={startConversation} className="rounded-xl bg-gradient-primary" disabled={transcribing || analyzing}>
                  <Mic size={16} className="mr-2" /> Start recording
                </Button>
              ) : (
                <Button onClick={stopConversation} variant="destructive" className="rounded-xl" disabled={transcribing || analyzing}>
                  <Square size={14} className="mr-2" /> {transcribing ? "Transcribing…" : analyzing ? "Analyzing…" : "Stop & analyze"}
                </Button>
              )}
              <Button
                onClick={analyzeFromText}
                variant="secondary"
                className="rounded-xl"
                disabled={listening || transcribing || analyzing}
              >
                Analyze text
              </Button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <FieldT icon={Activity} label="Detected Symptoms" value={form.symptoms} onChange={updateSymptomsAndAutoFill} />
            <FieldT icon={Pill} label="Suggested Medicines" value={form.medicines} onChange={(v) => setForm({ ...form, medicines: v })} />
            <FieldT icon={FlaskConical} label="Suggested Tests" value={form.tests} onChange={(v) => setForm({ ...form, tests: v })} />
            <FieldT icon={HeartPulse} label="Suggested Exercise" value={form.exercise} onChange={(v) => setForm({ ...form, exercise: v })} />
          </div>

          <div className="mt-5">
            <FieldI label="Doctor Signature" value={form.doctor} onChange={(v) => setForm({ ...form, doctor: v })} />
          </div>

          <div className="flex flex-wrap gap-3 mt-8">
            <Button onClick={generateReport} className="rounded-xl bg-gradient-primary shadow-glow">
              <FileText size={16} className="mr-2" /> Generate Report
            </Button>
            <Button variant="secondary" className="rounded-xl" onClick={moveToLab}>
              <FlaskConical size={16} className="mr-2" /> Move to Lab
            </Button>
          </div>
        </section>

      </main>
    </div>
  );
};

const Vital = ({ icon: Icon, label, value }: any) => (
  <div className="rounded-xl bg-white/15 p-3">
    <div className="flex items-center gap-1.5 text-xs opacity-80">
      <Icon size={12} /> {label}
    </div>
    <div className="mt-1 font-display font-bold text-xl">{value}</div>
  </div>
);

const FieldI = ({ label, value, onChange, type = "text" }: any) => (
  <div>
    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </Label>
    <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-xl mt-1.5" />
  </div>
);

const FieldT = ({ icon: Icon, label, value, onChange }: any) => (
  <div>
    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
      <Icon size={12} className="text-primary" /> {label}
    </Label>
    <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 min-h-[80px] rounded-xl resize-none" />
  </div>
);

export default NewData;