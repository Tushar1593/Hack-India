import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/medical/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, CheckCircle2, ArrowRight } from "lucide-react";

const PatientDetails = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [captured, setCaptured] = useState(false);

  const [form, setForm] = useState({
    hospital: "",
    name: "",
    phone: localStorage.getItem("userPhone") || "",
  });

  useEffect(() => {
    let stream: MediaStream | null = null;

    navigator.mediaDevices?.getUserMedia({ video: true })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => {});

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capturePhoto = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;

    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);

    localStorage.setItem("patientPhoto", c.toDataURL("image/png"));
    setCaptured(true);
    toast.success("Photo captured");
  };

  const login = () => {
    if (!form.hospital || !form.name) {
      return toast.error("Please fill all details");
    }

    localStorage.setItem("patientDetails", JSON.stringify(form));

    // ✅ FIXED HERE
    toast.success("Welcome to CuraSense");

    navigate("/patient-dashboard");
  };

  return (
    <div className="min-h-screen hero-bg flex flex-col">
      <header className="px-6 py-5 max-w-5xl mx-auto w-full">
        <Logo size="lg" />
      </header>

      <main className="flex-1 grid md:grid-cols-2 gap-6 max-w-5xl w-full mx-auto px-6 pb-12 items-center">
        
        {/* Camera */}
        <div className="glass rounded-3xl p-6 shadow-large animate-slide-up">
          <h3 className="font-display font-bold">Identity Check</h3>
          <p className="text-xs text-muted-foreground mb-4">
            We capture a quick photo for your profile.
          </p>

          <div className="relative rounded-2xl overflow-hidden aspect-square bg-muted">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />

            {captured && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center animate-fade-in">
                <div className="rounded-full bg-background p-4 shadow-large">
                  <CheckCircle2 size={32} className="text-primary" />
                </div>
              </div>
            )}
          </div>

          <Button onClick={capturePhoto} variant="secondary" className="w-full mt-4 rounded-xl h-11">
            <Camera size={16} className="mr-2" />
            {captured ? "Retake Photo" : "Capture Photo"}
          </Button>
        </div>

        {/* Form */}
        <div className="glass rounded-3xl p-8 shadow-large animate-slide-up">
          <h2 className="font-display text-2xl font-bold">Your Details</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Just a few details to get you started.
          </p>

          <div className="space-y-4">

            {/* ✅ FIXED PLACEHOLDER */}
            <Field
              label="Hospital Name"
              value={form.hospital}
              onChange={(v) => setForm({ ...form, hospital: v })}
              placeholder="CuraSense Medical Center"
            />

            <Field
              label="Full Name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="Your name"
            />

            <Field
              label="Mobile Number"
              value={form.phone}
              onChange={() => {}}
              disabled
            />

            <Button
              onClick={login}
              className="w-full h-12 rounded-xl bg-gradient-primary shadow-glow font-semibold mt-2"
            >
              Continue <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

const Field = ({ label, value, onChange, placeholder, disabled }: any) => (
  <div>
    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </Label>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="h-12 rounded-xl mt-1.5"
    />
  </div>
);

export default PatientDetails;