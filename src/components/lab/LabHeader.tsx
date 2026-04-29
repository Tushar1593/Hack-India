import { Bell, FlaskConical, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export function LabHeader() {
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
            <FlaskConical size={18} className="text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <p className="font-display font-extrabold text-lg">CareJR</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Lab Station
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 ml-6 text-sm">
          <Link to="/nurse" className="px-3 py-1.5 rounded-lg hover:bg-muted transition">Nurse</Link>
          <Link to="/lab" className="px-3 py-1.5 rounded-lg bg-primary-soft text-primary font-semibold">Lab</Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <button className="relative h-10 w-10 rounded-xl bg-muted hover:bg-primary-soft transition flex items-center justify-center">
            <Bell size={18} />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
          </button>
          <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            LT
          </div>
          <button onClick={logout} title="Logout" className="h-10 w-10 rounded-xl bg-muted hover:bg-destructive hover:text-destructive-foreground transition flex items-center justify-center">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
