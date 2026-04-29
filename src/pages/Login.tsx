import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/medical/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Stethoscope, Heart, UserRound, FlaskConical, ShieldCheck, Phone } from "lucide-react";
import heroImg from "@/assets/medical-hero.jpg";

type Role = "doctor" | "patient" | "nurse" | "lab" | "";

const ROLES: { value: Role; label: string; icon: any; desc: string }[] = [
  { value: "doctor", label: "Doctor", icon: Stethoscope, desc: "Physician access" },
  { value: "patient", label: "Patient", icon: Heart, desc: "Personal health" },
  { value: "nurse", label: "Nurse", icon: UserRound, desc: "Care staff" },
  { value: "lab", label: "Laboratory", icon: FlaskConical, desc: "Test reports" },
];

const Login = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("");
  const [generatedOTP, setGeneratedOTP] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const sendOTP = () => {
    if (phone.length < 10) return toast.error("Enter a valid phone number");
    if (!role) return toast.error("Select your position");
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedOTP(code);
    setOtpSent(true);
    localStorage.setItem("userPhone", phone);
    localStorage.setItem("userRole", role);
    toast.success(`OTP sent`, { description: `Demo code: ${code}` });
  };

  const verifyOTP = () => {
    if (otp !== generatedOTP) return toast.error("Invalid OTP");
    toast.success("Login successful");
    const routes: Record<string, string> = {
      doctor: "/details",
      patient: "/patient-details",
      nurse: "/nurse",
      lab: "/lab",
    };
    navigate(routes[role] || "/");
  };

  return (
    <div className="min-h-screen hero-bg flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between">
        <Logo size="lg" />
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck size={16} className="text-primary" />
          HIPAA-ready · Encrypted
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-2 gap-8 items-center max-w-7xl w-full mx-auto px-6 py-10">
        {/* Left — hero */}
        <div className="hidden lg:block animate-slide-up">
          <div className="relative overflow-hidden rounded-3xl shadow-large">
            <img src={heroImg} alt="Healthcare" className="w-full h-[460px] object-cover" width={1536} height={1024} />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 p-8">
              <h1 className="font-display text-4xl font-extrabold text-foreground leading-tight">
                Care, reimagined.
                <br /><span className="gradient-text">Intelligent. Human. Trusted.</span>
              </h1>
              <p className="mt-3 text-muted-foreground max-w-md">
                A unified portal for doctors, patients, nurses and laboratories — powered by CuraSense.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { n: "24/7", l: "Monitoring" },
              { n: "AI", l: "Screening" },
              { n: "Secure", l: "Reports" },
            ].map((s) => (
              <div key={s.l} className="card-medical p-4 text-center">
                <div className="font-display font-bold text-2xl gradient-text">{s.n}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — login card */}
        <div className="w-full max-w-md mx-auto lg:mx-0 animate-slide-up">
          <div className="glass rounded-3xl p-8 shadow-large">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" /> Secure OTP login
              </div>
              <h2 className="mt-4 font-display text-3xl font-bold">Welcome back</h2>
              <p className="mt-1 text-muted-foreground text-sm">Sign in to continue to CuraSense.</p>
            </div>

            <div className="space-y-5">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone number</Label>
                <div className="relative mt-1.5">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="Enter 10-digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="pl-9 h-12 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">I am a</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const active = role === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRole(r.value)}
                        className={`group relative rounded-xl border-2 p-3 text-left transition-all ${
                          active
                            ? "border-primary bg-primary-soft shadow-soft"
                            : "border-border hover:border-primary/40 bg-card"
                        }`}
                      >
                        <Icon size={18} className={active ? "text-primary" : "text-muted-foreground"} />
                        <div className={`mt-2 text-sm font-semibold ${active ? "text-primary" : ""}`}>{r.label}</div>
                        <div className="text-[10px] text-muted-foreground">{r.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {!otpSent ? (
                <Button onClick={sendOTP} className="w-full h-12 rounded-xl bg-gradient-primary shadow-glow font-semibold text-base">
                  Send OTP
                </Button>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enter OTP</Label>
                  <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                    <InputOTPGroup className="w-full justify-between gap-2">
                      {[0, 1, 2, 3].map((i) => (
                        <InputOTPSlot key={i} index={i} className="h-14 w-full rounded-xl border-2 text-xl font-bold" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <Button onClick={verifyOTP} className="w-full h-12 rounded-xl bg-gradient-primary shadow-glow font-semibold">
                    Verify & Login
                  </Button>
                  <button onClick={sendOTP} className="w-full text-xs text-muted-foreground hover:text-primary">
                    Didn't receive code? Resend
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo environment · OTP shown in toast for testing
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
