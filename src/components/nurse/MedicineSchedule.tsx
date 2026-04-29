import { useState } from "react";
import { Pill, Check } from "lucide-react";

type Dose = {
  id: string;
  time: string;
  patient: string;
  room: string;
  med: string;
  dose: string;
  done?: boolean;
};

const initial: Dose[] = [
  { id: "m1", time: "08:00", patient: "Anita Sharma", room: "A-104", med: "Amoxicillin", dose: "500 mg", done: true },
  { id: "m2", time: "09:30", patient: "Rohan Mehta", room: "A-107", med: "Paracetamol", dose: "650 mg", done: true },
  { id: "m3", time: "11:00", patient: "Priya Iyer", room: "B-210", med: "Metformin", dose: "500 mg" },
  { id: "m4", time: "12:30", patient: "Arjun Kapoor", room: "ICU-03", med: "Atorvastatin", dose: "20 mg" },
  { id: "m5", time: "14:00", patient: "Neha Gupta", room: "B-215", med: "IV Saline", dose: "500 mL" },
  { id: "m6", time: "16:00", patient: "Ravi Kumar", room: "ICU-03", med: "Furosemide", dose: "40 mg" },
];

export function MedicineSchedule() {
  const [doses, setDoses] = useState(initial);
  const toggle = (id: string) =>
    setDoses((d) => d.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));

  return (
    <section className="card-medical p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-xl font-bold">Medicine Schedule</h2>
          <p className="text-sm text-muted-foreground">Today's administration rounds</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-primary-soft flex items-center justify-center">
          <Pill size={18} className="text-primary" />
        </div>
      </div>

      <ol className="relative ml-3 border-l-2 border-dashed border-border space-y-4">
        {doses.map((d) => (
          <li key={d.id} className="pl-5 relative">
            <span
              className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 ${
                d.done ? "bg-primary border-primary" : "bg-background border-border"
              }`}
            />
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-sm w-12 tabular-nums">{d.time}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${d.done ? "line-through text-muted-foreground" : ""}`}>
                  {d.med} · {d.dose}
                </p>
                <p className="text-xs text-muted-foreground">
                  {d.patient} — Room {d.room}
                </p>
              </div>
              <button
                onClick={() => toggle(d.id)}
                aria-label="Mark administered"
                className={`h-8 w-8 rounded-full flex items-center justify-center transition ${
                  d.done
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-primary-soft hover:text-primary"
                }`}
              >
                <Check size={14} />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
