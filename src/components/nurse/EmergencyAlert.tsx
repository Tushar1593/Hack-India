import { useState } from "react";
import { Siren, AlertTriangle, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";

const activeAlerts = [
  { room: "ICU-03", patient: "Ravi Kumar", issue: "Oxygen drop", time: "1 min ago" },
  { room: "Ward B-12", patient: "Sunita Rao", issue: "Fall detected", time: "6 min ago" },
];

export function EmergencyAlert() {
  const [triggered, setTriggered] = useState(false);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-danger p-6 text-destructive-foreground shadow-large animate-slide-up">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center animate-pulse-danger">
              <Siren size={22} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Emergency Alert</h2>
              <p className="text-xs opacity-90">{activeAlerts.length} active incidents</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setTriggered(true)}
            className="bg-white text-destructive hover:bg-white/90 font-semibold gap-1"
          >
            <AlertTriangle size={14} />
            {triggered ? "Sent" : "Trigger"}
          </Button>
        </div>

        <ul className="mt-5 space-y-2">
          {activeAlerts.map((a) => (
            <li
              key={a.room}
              className="flex items-center gap-3 rounded-xl bg-white/15 backdrop-blur px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {a.room} · {a.patient}
                </p>
                <p className="text-xs opacity-85">{a.issue} — {a.time}</p>
              </div>
              <button className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <PhoneCall size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
