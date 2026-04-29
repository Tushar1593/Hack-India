import { useState } from "react";
import { Activity, Thermometer, HeartPulse, Wind, Droplet, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fields = [
  { key: "hr", label: "Heart Rate", unit: "bpm", icon: HeartPulse, placeholder: "78" },
  { key: "bp", label: "Blood Pressure", unit: "mmHg", icon: Activity, placeholder: "120/80" },
  { key: "temp", label: "Temperature", unit: "°C", icon: Thermometer, placeholder: "36.8" },
  { key: "spo2", label: "SpO₂", unit: "%", icon: Wind, placeholder: "98" },
  { key: "glucose", label: "Glucose", unit: "mg/dL", icon: Droplet, placeholder: "105" },
] as const;

export function VitalsEntry() {
  const [patient, setPatient] = useState("P-1042 · Anita Sharma");
  const [saved, setSaved] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <section className="card-medical p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-xl font-bold">Vitals Entry</h2>
          <p className="text-sm text-muted-foreground">Record patient vitals</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Activity size={18} className="text-primary-foreground" />
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="patient" className="text-xs font-semibold text-muted-foreground">
            Patient
          </Label>
          <Input
            id="patient"
            value={patient}
            onChange={(e) => setPatient(e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key}>
              <Label htmlFor={f.key} className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <f.icon size={12} className="text-primary" />
                {f.label}
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id={f.key}
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  className="pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {f.unit}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
          {saved ? (
            <>
              <Check size={16} className="mr-1" /> Saved to chart
            </>
          ) : (
            "Save Vitals"
          )}
        </Button>
      </form>
    </section>
  );
}
