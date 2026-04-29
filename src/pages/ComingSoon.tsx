import { AppHeader } from "@/components/medical/AppHeader";
import { UserRound, FlaskConical } from "lucide-react";

export const ComingSoon = ({ role }: { role: "nurse" | "lab" }) => {
  const Icon = role === "nurse" ? UserRound : FlaskConical;
  const title = role === "nurse" ? "Nurse Station" : "Laboratory";
  return (
    <div className="min-h-screen bg-gradient-soft">
      <AppHeader hospital="CareJR" />
      <main className="max-w-3xl mx-auto px-6 py-20 text-center animate-slide-up">
        <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow">
          <Icon size={32} className="text-primary-foreground" />
        </div>
        <h1 className="font-display text-4xl font-extrabold mt-6">{title}</h1>
        <p className="text-muted-foreground mt-3">This portal is coming soon. Your role is authenticated and ready.</p>
      </main>
    </div>
  );
};

export const NursePage = () => <ComingSoon role="nurse" />;
export const LabPage = () => <ComingSoon role="lab" />;
