import { BedDouble } from "lucide-react";

type Room = {
  id: string;
  status: "occupied" | "available" | "cleaning" | "critical";
  patient?: string;
};

const rooms: Room[] = [
  { id: "A-101", status: "occupied", patient: "M. Singh" },
  { id: "A-102", status: "available" },
  { id: "A-103", status: "cleaning" },
  { id: "A-104", status: "occupied", patient: "A. Sharma" },
  { id: "A-105", status: "available" },
  { id: "A-106", status: "occupied", patient: "V. Khanna" },
  { id: "A-107", status: "occupied", patient: "R. Mehta" },
  { id: "B-210", status: "occupied", patient: "P. Iyer" },
  { id: "B-211", status: "available" },
  { id: "B-212", status: "cleaning" },
  { id: "B-215", status: "occupied", patient: "N. Gupta" },
  { id: "ICU-03", status: "critical", patient: "R. Kumar" },
];

const statusStyle: Record<Room["status"], { dot: string; chip: string; label: string }> = {
  occupied: {
    dot: "bg-primary",
    chip: "bg-primary-soft text-primary",
    label: "Occupied",
  },
  available: {
    dot: "bg-muted-foreground/40",
    chip: "bg-muted text-muted-foreground",
    label: "Available",
  },
  cleaning: {
    dot: "bg-[var(--color-warning)]",
    chip: "bg-[var(--color-warning)]/20 text-[oklch(0.45_0.12_70)]",
    label: "Cleaning",
  },
  critical: {
    dot: "bg-destructive",
    chip: "bg-destructive/10 text-destructive",
    label: "Critical",
  },
};

export function RoomAssignment() {
  const counts = rooms.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {} as Record<Room["status"], number>,
  );

  return (
    <section className="card-medical p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-xl font-bold">Room Assignment</h2>
          <p className="text-sm text-muted-foreground">Live ward occupancy</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <BedDouble size={18} className="text-accent" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5 text-xs">
        {(Object.keys(statusStyle) as Room["status"][]).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${statusStyle[s].dot}`} />
            <span className="text-muted-foreground">
              {statusStyle[s].label} <span className="font-semibold text-foreground">{counts[s] ?? 0}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {rooms.map((r, i) => {
          const s = statusStyle[r.status];
          return (
            <button
              key={r.id}
              className="text-left rounded-2xl border border-border bg-background/60 p-3 hover:border-primary/50 hover:shadow-soft transition animate-slide-up"
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm">{r.id}</span>
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground truncate min-h-4">
                {r.patient ?? "—"}
              </div>
              <div className={`mt-2 inline-block text-[10px] font-semibold rounded-full px-2 py-0.5 ${s.chip}`}>
                {s.label}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
