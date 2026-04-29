import { useState } from "react";
import { Upload, Plus, Trash2, Sparkles, Send, Loader2 } from "lucide-react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = supabaseTyped;
import { toast } from "sonner";

type ResultRow = {
  name: string;
  value: string;
  unit: string;
  ref_low: string;
  ref_high: string;
};

type Abnormality = {
  parameter: string;
  value: string;
  severity: "mild" | "moderate" | "severe" | "critical";
  explanation: string;
  reference?: string;
};

type AIResult = {
  summary: string;
  severity: "normal" | "mild" | "moderate" | "severe" | "critical";
  abnormalities: Abnormality[];
  recommended_actions?: string[];
};

const severityStyle: Record<string, string> = {
  normal: "bg-success/15 text-success border-success/30",
  mild: "bg-warning/15 text-warning border-warning/30",
  moderate: "bg-warning/20 text-warning border-warning/40",
  severe: "bg-destructive/15 text-destructive border-destructive/30",
  critical: "bg-destructive/25 text-destructive border-destructive/50 animate-pulse-danger",
};

export function ReportUpload({
  test,
  onCompleted,
}: {
  test: {
    id: string;
    test_name: string;
    patient_id: string;
    doctor_id: string | null;
    patients?: { full_name: string; age: number | null; sex: string | null } | null;
  } | null;
  onCompleted: () => void;
}) {
  const [rows, setRows] = useState<ResultRow[]>([
    { name: "", value: "", unit: "", ref_low: "", ref_high: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ai, setAI] = useState<AIResult | null>(null);

  if (!test) {
    return (
      <section className="card-medical p-8 text-center">
        <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
        <h3 className="font-display font-bold text-lg">Select a test</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Pick an assigned test on the left to upload its report.
        </p>
      </section>
    );
  }

  const updateRow = (i: number, patch: Partial<ResultRow>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const runAI = async () => {
    const clean = rows
      .filter((r) => r.name && r.value)
      .map((r) => ({
        name: r.name,
        value: r.value,
        unit: r.unit || undefined,
        ref_low: r.ref_low ? Number(r.ref_low) : undefined,
        ref_high: r.ref_high ? Number(r.ref_high) : undefined,
      }));
    if (clean.length === 0) {
      toast.error("Add at least one result value");
      return;
    }
    setAnalyzing(true);
    setAI(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-lab-report", {
        body: {
          results: clean,
          test_name: test.test_name,
          patient_age: test.patients?.age,
          patient_sex: test.patients?.sex,
          notes,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAI(data as AIResult);
      toast.success("AI analysis complete");
    } catch (e: any) {
      toast.error("Analysis failed", { description: e.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const saveAndNotify = async () => {
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;

      // upload file if present
      let file_path: string | null = null;
      let file_name: string | null = null;
      let file_mime: string | null = null;
      if (file) {
        const path = `${test.patient_id}/${test.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("lab-reports")
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        file_path = path;
        file_name = file.name;
        file_mime = file.type;
      }

      const cleanResults = rows
        .filter((r) => r.name && r.value)
        .map((r) => ({
          name: r.name,
          value: r.value,
          unit: r.unit || null,
          ref_low: r.ref_low ? Number(r.ref_low) : null,
          ref_high: r.ref_high ? Number(r.ref_high) : null,
        }));

      const { error: repErr } = await supabase.from("lab_reports").insert({
        lab_test_id: test.id,
        patient_id: test.patient_id,
        uploaded_by: uid,
        file_path,
        file_name,
        file_mime,
        results: cleanResults,
        notes: notes || null,
        ai_summary: ai?.summary ?? null,
        ai_abnormalities: ai?.abnormalities ?? [],
        ai_severity: ai?.severity ?? null,
        doctor_notified: !!test.doctor_id,
        doctor_notified_at: test.doctor_id ? new Date().toISOString() : null,
      });
      if (repErr) throw repErr;

      // mark test completed
      const { error: tErr } = await supabase
        .from("lab_tests")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", test.id);
      if (tErr) throw tErr;

      // notify doctor
      if (test.doctor_id) {
        const critical = ai?.severity === "critical" || ai?.severity === "severe";
        await supabase.from("notifications").insert({
          recipient_id: test.doctor_id,
          sender_id: uid,
          kind: "lab_result",
          title: `Lab result: ${test.test_name}`,
          body:
            ai?.summary ??
            `Report uploaded for ${test.patients?.full_name ?? "patient"}.`,
          severity: critical ? "critical" : ai?.abnormalities?.length ? "warning" : "info",
          payload: { test_id: test.id, patient_id: test.patient_id },
        });
      }

      toast.success("Report saved. Doctor notified.");
      setRows([{ name: "", value: "", unit: "", ref_low: "", ref_high: "" }]);
      setNotes("");
      setFile(null);
      setAI(null);
      onCompleted();
    } catch (e: any) {
      toast.error("Save failed", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card-medical p-6 animate-slide-up">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-xl">{test.test_name}</h2>
          <p className="text-sm text-muted-foreground">
            {test.patients?.full_name}
            {test.patients?.age ? ` · ${test.patients.age}y` : ""}
            {test.patients?.sex ? ` · ${test.patients.sex}` : ""}
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-soft text-primary">
          In progress
        </span>
      </div>

      {/* Results table */}
      <div className="space-y-2 mb-4">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-1">
          <span>Parameter</span>
          <span>Value</span>
          <span>Unit</span>
          <span>Ref Low</span>
          <span>Ref High</span>
          <span />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2">
            <input
              placeholder="Hemoglobin"
              value={r.name}
              onChange={(e) => updateRow(i, { name: e.target.value })}
              className="h-9 px-3 rounded-lg bg-muted/60 border border-transparent focus:bg-card focus:border-primary/40 focus:outline-none text-sm"
            />
            <input
              placeholder="12.5"
              value={r.value}
              onChange={(e) => updateRow(i, { value: e.target.value })}
              className="h-9 px-3 rounded-lg bg-muted/60 border border-transparent focus:bg-card focus:border-primary/40 focus:outline-none text-sm"
            />
            <input
              placeholder="g/dL"
              value={r.unit}
              onChange={(e) => updateRow(i, { unit: e.target.value })}
              className="h-9 px-3 rounded-lg bg-muted/60 border border-transparent focus:bg-card focus:border-primary/40 focus:outline-none text-sm"
            />
            <input
              placeholder="13"
              value={r.ref_low}
              onChange={(e) => updateRow(i, { ref_low: e.target.value })}
              className="h-9 px-3 rounded-lg bg-muted/60 border border-transparent focus:bg-card focus:border-primary/40 focus:outline-none text-sm"
            />
            <input
              placeholder="17"
              value={r.ref_high}
              onChange={(e) => updateRow(i, { ref_high: e.target.value })}
              className="h-9 px-3 rounded-lg bg-muted/60 border border-transparent focus:bg-card focus:border-primary/40 focus:outline-none text-sm"
            />
            <button
              onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
              className="h-9 w-9 rounded-lg hover:bg-destructive/10 text-destructive flex items-center justify-center"
              aria-label="Remove row"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          onClick={() => setRows((r) => [...r, { name: "", value: "", unit: "", ref_low: "", ref_high: "" }])}
          className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 pt-1"
        >
          <Plus size={12} /> Add parameter
        </button>
      </div>

      {/* Notes + file */}
      <div className="grid md:grid-cols-2 gap-3 mb-4">
        <textarea
          placeholder="Technician notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="px-3 py-2 rounded-lg bg-muted/60 border border-transparent focus:bg-card focus:border-primary/40 focus:outline-none text-sm resize-none"
        />
        <label className="rounded-lg border-2 border-dashed border-border hover:border-primary/40 bg-muted/30 p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition text-center">
          <Upload size={18} className="text-muted-foreground" />
          <span className="text-xs font-semibold">
            {file ? file.name : "Upload report file (PDF/image)"}
          </span>
          <span className="text-[10px] text-muted-foreground">Optional</span>
          <input
            type="file"
            className="hidden"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {/* AI section */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={runAI}
          disabled={analyzing}
          className="h-10 px-4 rounded-xl bg-gradient-primary text-primary-foreground font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-60 shadow-glow"
        >
          {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {analyzing ? "Analyzing…" : "AI abnormality check"}
        </button>
        <button
          onClick={saveAndNotify}
          disabled={saving}
          className="h-10 px-4 rounded-xl bg-card border border-primary/40 text-primary font-semibold text-sm inline-flex items-center gap-2 hover:bg-primary-soft disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Save & notify doctor
        </button>
      </div>

      {ai && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-primary" />
            <span className="font-display font-bold text-sm">AI analysis</span>
            <span
              className={`ml-auto text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${
                severityStyle[ai.severity] ?? severityStyle.normal
              }`}
            >
              {ai.severity}
            </span>
          </div>
          <p className="text-sm text-foreground/90">{ai.summary}</p>
          {ai.abnormalities?.length > 0 && (
            <ul className="space-y-2">
              {ai.abnormalities.map((a, i) => (
                <li
                  key={i}
                  className={`p-3 rounded-lg border ${severityStyle[a.severity] ?? severityStyle.mild}`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>
                      {a.parameter}: {a.value}
                    </span>
                    <span className="uppercase tracking-wider">{a.severity}</span>
                  </div>
                  <p className="text-xs mt-1 opacity-90">{a.explanation}</p>
                  {a.reference && (
                    <p className="text-[10px] mt-1 opacity-70">Ref: {a.reference}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {ai.recommended_actions && ai.recommended_actions.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                Recommended
              </p>
              <ul className="text-xs list-disc list-inside space-y-0.5">
                {ai.recommended_actions.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
