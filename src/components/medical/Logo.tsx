import { HeartPulse } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
}

export const Logo = ({ size = "md", variant = "dark" }: LogoProps) => {
  const sizes = {
    sm: { icon: 18, text: "text-lg" },
    md: { icon: 22, text: "text-xl" },
    lg: { icon: 28, text: "text-2xl" },
  };

  const s = sizes[size];

  return (
    <div className="flex items-center gap-2">
      {/* Icon */}
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
        <HeartPulse size={s.icon} className="text-primary-foreground" strokeWidth={2.5} />
      </div>

      {/* ✅ FIXED TEXT */}
      <div
        className={`font-display font-extrabold ${s.text} ${
          variant === "light" ? "text-primary-foreground" : "text-foreground"
        }`}
      >
        Cura<span className="gradient-text">Sense</span>
      </div>
    </div>
  );
};