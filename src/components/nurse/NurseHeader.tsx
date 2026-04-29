import { Bell, LogOut, Search, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function NurseHeader() {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Stethoscope size={18} className="text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <p className="font-display font-extrabold text-lg">CuraSense</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Nurse Station
            </p>
          </div>
        </div>

        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search patients, rooms, medicines…"
              className="w-full h-10 rounded-xl bg-muted/70 border border-transparent focus:bg-card focus:border-primary/40 focus:outline-none pl-9 pr-3 text-sm transition"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button className="relative h-10 w-10 rounded-xl bg-muted hover:bg-primary-soft transition flex items-center justify-center">
            <Bell size={18} className="text-foreground" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              SK
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="font-semibold text-sm">Anamika</p>
              <p className="text-xs text-muted-foreground">RN · Shift 08–16</p>
            </div>
          </div>
          <button onClick={logout} title="Logout" className="h-10 w-10 rounded-xl bg-muted hover:bg-destructive hover:text-destructive-foreground transition flex items-center justify-center">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
