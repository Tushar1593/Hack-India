import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/medical/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, ArrowRight, CheckCircle2 } from "lucide-react";

const Details = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Starting camera...");
  const [form, setForm] = useState({
    hospital: "", name: "", age: "", gender: "", city: "", contact: "",
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: true })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setStatus("Face detected · Ready");
      })
      .catch(() => setStatus("Camera unavailable"));
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const saveDetails = () => {
    if (!form.hospital || !form.name) {
      toast.error("Please fill hospital and name");
      return;
    }
    localStorage.setItem("doctorDetails", JSON.stringify(form));
    localStorage.setItem("hospital", form.hospital);
    toast.success("Details saved");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen hero-bg">
      <header className="px-6 py-5 max-w-7xl mx-auto">
        <Logo size="lg" />
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-12 grid lg:grid-cols-2 gap-8 items-start">
        {/* Camera */}
        <div className="glass rounded-3xl p-6 shadow-large animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg">Identity Verification</h3>
            <div className="flex items-center gap-2 text-xs text-primary font-medium">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
              Live
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-muted aspect-[4/3]">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-6 rounded-2xl border-2 border-primary/60 pointer-events-none" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-xl bg-background/80 backdrop-blur px-3 py-2">
              <CheckCircle2 size={16} className="text-primary" />
              <span className="text-sm font-medium">{status}</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground text-center">
            <Camera size={12} className="inline mr-1" />
            Your face is only used for session verification.
          </p>
        </div>

        {/* Form */}
        <div className="glass rounded-3xl p-8 shadow-large animate-slide-up">
          <h2 className="font-display text-2xl font-bold">Professional Details</h2>
          <p className="text-sm text-muted-foreground mb-6">Complete your profile to continue.</p>

          <div className="space-y-4">
            <Field label="Hospital Name" value={form.hospital} onChange={(v) => setForm({ ...form, hospital: v })} placeholder="CuraSense Medical Center" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Dr. Smith" />
              <Field label="Age" value={form.age} onChange={(v) => setForm({ ...form, age: v })} placeholder="35" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger className="h-12 rounded-xl mt-1.5"><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="Mumbai" />
              <Field label="Contact" value={form.contact} onChange={(v) => setForm({ ...form, contact: v })} placeholder="+91..." />
            </div>

            <Button onClick={saveDetails} className="w-full h-12 rounded-xl bg-gradient-primary shadow-glow font-semibold mt-2">
              Continue <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

const Field = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div>
    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-12 rounded-xl mt-1.5" />
  </div>
);

export default Details;
