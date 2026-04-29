import { Clock, ChevronRight, CircleUserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

const patients = [
  { id: "P-1042", name: "Anita Sharma", age: 54, reason: "Post-op observation", wait: "8m", priority: "High" },
  { id: "P-1043", name: "Rohan Mehta", age: 32, reason: "Fever & fatigue", wait: "14m", priority: "Medium" },
  { id: "P-1044", name: "Priya Iyer", age: 67, reason: "Diabetic review", wait: "22m", priority: "Medium" },
  { id: "P-1045", name: "Arjun Kapoor", age: 41, reason: "Chest pain follow-up", wait: "4m", priority: "High" },
  { id: "P-1046", name: "Neha Gupta", age: 28, reason: "IV drip change", wait: "30m", priority: "Low" },
];

const priorityTone = {
  High: "bg-destructive/10 text-destructive",
  Medium: "bg-[var(--color-warning)]/20 text-[oklch(0.45_0.12_70)]",
  Low: "bg-primary-soft text-primary",
} as const;

export function PendingPatients() {
  return (
    <section className="card-medical p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-xl font-bold">Pending Patients</h2>
          <p className="text-sm text-muted-foreground">Awaiting nurse attention</p>
        </div>
        <span className="rounded-full bg-primary-soft text-primary px-3 py-1 text-xs font-semibold">
          {patients.length} queued
        </span>
      </div>

      <ul className="space-y-3">
        {patients.map((p, i) => (
          <li
            key={p.id}
            className="flex items-center gap-4 rounded-2xl border border-border bg-background/60 p-4 hover:bg-primary-soft/40 transition-colors animate-slide-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="h-11 w-11 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
              <CircleUserRound size={22} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">{p.name}</p>
                <span className="text-xs text-muted-foreground">· {p.age}y</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {p.id} — {p.reason}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={14} />
              {p.wait}
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityTone[p.priority as keyof typeof priorityTone]}`}>
              {p.priority}
            </span>
            <Button size="sm" variant="ghost" className="shrink-0 gap-1">
              Attend <ChevronRight size={14} />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
