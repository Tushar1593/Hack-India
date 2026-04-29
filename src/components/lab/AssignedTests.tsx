import { ClipboardList, Clock, User, AlertTriangle } from "lucide-react";
type LabTest = {
  id: string;
  status?: string | null;
  priority?: string | null;
  test_name?: string | null;
  assigned_at?: string | null;
  patients?: { full_name: string; age: number | null; sex: string | null; room: string | null } | null;
  [key: string]: any;
};

const priorityStyle: Record<string, string> = {
  stat: "bg-destructive/15 text-destructive border-destructive/30",
  urgent: "bg-warning/15 text-warning border-warning/30",
  routine: "bg-muted text-muted-foreground border-border",
};

export function AssignedTests({
  tests,
  selectedId,
  onSelect,
}: {
  tests: LabTest[];
  selectedId: string | null;
  onSelect: (t: LabTest) => void;
}) {
  const pending = tests.filter((t) => t.status !== "completed" && t.status !== "cancelled");

  return (
    <section className="card-medical p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-primary" />
          <h2 className="font-display font-bold text-lg">Assigned Tests</h2>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-soft text-primary">
          {pending.length} pending
        </span>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No pending tests. All caught up 🧪
        </p>
      ) : (
        <ul className="space-y-2">
          {pending.map((t) => {
            const active = t.id === selectedId;
            return (
              <li key={t.id}>
                <button
                  onClick={() => onSelect(t)}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    active
                      ? "bg-primary-soft border-primary/40 shadow-sm"
                      : "bg-card border-border hover:border-primary/30 hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm truncate">{t.test_name}</span>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                            priorityStyle[t.priority] ?? priorityStyle.routine
                          }`}
                        >
                          {t.priority === "stat" && <AlertTriangle size={10} className="inline mr-0.5" />}
                          {t.priority}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <User size={11} />
                        {t.patients?.full_name ?? "Unknown patient"}
                        {t.patients?.room && <span className="text-foreground/60">· Room {t.patients.room}</span>}
                      </p>
                      {t.instructions && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{t.instructions}</p>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                      <Clock size={10} />
                      {new Date(t.assigned_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
