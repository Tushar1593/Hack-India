import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  tone?: "primary" | "warning" | "destructive" | "accent";
  delay?: number;
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-primary-soft text-primary",
  warning: "bg-[var(--color-warning)]/15 text-[var(--color-warning-foreground)]",
  destructive: "bg-destructive/10 text-destructive",
  accent: "bg-accent/10 text-accent",
};

export function StatCard({ label, value, icon: Icon, trend, tone = "primary", delay = 0 }: StatCardProps) {
  return (
    <div
      className="card-medical p-5 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${toneStyles[tone]}`}>
          <Icon size={18} />
        </div>
        {trend && (
          <span className="text-xs font-semibold text-primary bg-primary-soft rounded-full px-2 py-0.5">
            {trend}
          </span>
        )}
      </div>
      <div className="mt-3 font-display text-3xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
