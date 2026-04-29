import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Bell, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AppHeaderProps {
  userName?: string;
  hospital?: string;
}

export const AppHeader = ({ userName, hospital }: AppHeaderProps) => {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem("userPhone");
    localStorage.removeItem("userRole");
    localStorage.removeItem("patientDetails");
    localStorage.removeItem("patientPhoto");
    navigate("/login");
  };
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />
        {hospital && (
          <div className="hidden md:block text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Hospital</p>
            <p className="font-display font-bold text-primary">{hospital}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          {userName && (
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5">
              <User size={14} className="text-primary" />
              <span className="text-sm font-medium text-primary">{userName}</span>
            </div>
          )}
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={logout}>
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </header>
  );
};
