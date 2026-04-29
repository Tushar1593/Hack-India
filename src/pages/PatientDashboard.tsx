import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/medical/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
import AIChat from "@/components/medical/AIChat";
import {
  Calendar, FileText, Pill, FlaskConical, MessageCircle, CreditCard,
  HeartPulse, Stethoscope, Activity, Droplets, Thermometer, Download,
  Search, Send, CheckCircle2, Clock, AlertTriangle, Plus,
  Video, MapPin, Star, TrendingUp, ShieldCheck,
} from "lucide-react";

type Doctor = {
  id: string; name: string; spec: string; avail: string;
  rating: number; fee: number; mode: ("in-person" | "video")[];
};
type Appointment = {
  id: string; doctor: string; spec: string; date: string;
  time: string; mode: "in-person" | "video"; status: "upcoming" | "done";
};
type Prescription = { id: string; medicine: string; dose: string; freq: string; duration: string; doctor: string };
type LabTest = { id: string; name: string; date: string; status: "pending" | "ready"; result?: string };
type Bill = { id: string; item: string; amount: number; date: string; status: "paid" | "unpaid" };
type ChatMsg = { id: string; from: "me" | "doc" | "ai"; text: string; ts: number };

const PatientDashboard = () => {
  const supabase: any = supabaseTyped;
  const stored = JSON.parse(localStorage.getItem("patientDetails") || "{}");
  const photo = localStorage.getItem("patientPhoto");
  const name = stored.name || "Aanya Patel";
  const hospital = stored.hospital || "CareJR Hospital";

  const [vitals, setVitals] = useState({
    heart: 78, bpSys: 120, bpDia: 80, spo2: 98, temp: 36.7, steps: 4820,
  });
  useEffect(() => {
    const id = setInterval(() => {
      setVitals((v) => ({
        heart: clamp(v.heart + rand(-2, 2), 62, 96),
        bpSys: clamp(v.bpSys + rand(-2, 2), 108, 132),
        bpDia: clamp(v.bpDia + rand(-1, 1), 70, 86),
        spo2: clamp(v.spo2 + rand(-1, 1), 94, 100),
        temp: +(clamp(v.temp + (Math.random() - 0.5) * 0.1, 36.2, 37.4)).toFixed(1),
        steps: v.steps + rand(0, 8),
      }));
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const services = [
    { key: "book",    title: "Book Appointment", icon: Calendar,      color: "from-emerald-500 to-teal-500" },
    { key: "reports", title: "My Reports",       icon: FileText,      color: "from-cyan-500 to-blue-500" },
    { key: "rx",      title: "Prescriptions",    icon: Pill,          color: "from-rose-500 to-pink-500" },
    { key: "lab",     title: "Lab Tests",        icon: FlaskConical,  color: "from-violet-500 to-purple-500" },
    { key: "chat",    title: "Chat Doctor",      icon: MessageCircle, color: "from-amber-500 to-orange-500" },
    { key: "bills",   title: "Bills & Payments", icon: CreditCard,    color: "from-green-500 to-emerald-500" },
  ] as const;

  const doctors: Doctor[] = [
    { id: "d1", name: "Dr. Sharma", spec: "Cardiologist",      avail: "Today · 3:00 PM",     rating: 4.9, fee: 600, mode: ["in-person", "video"] },
    { id: "d2", name: "Dr. Verma",  spec: "General Physician", avail: "Tomorrow · 10:00 AM", rating: 4.7, fee: 400, mode: ["in-person", "video"] },
    { id: "d3", name: "Dr. Patel",  spec: "Pediatrician",      avail: "Today · 5:30 PM",     rating: 4.8, fee: 500, mode: ["in-person"] },
    { id: "d4", name: "Dr. Khan",   spec: "Dermatologist",     avail: "Wed · 11:00 AM",      rating: 4.6, fee: 550, mode: ["video"] },
  ];

  const [appointments, setAppointments] = useState<Appointment[]>([
    { id: "a1", doctor: "Dr. Verma", spec: "General Physician", date: "Tomorrow", time: "10:00 AM", mode: "in-person", status: "upcoming" },
  ]);
  const [prescriptions] = useState<Prescription[]>([
    { id: "p1", medicine: "Atorvastatin", dose: "10 mg",  freq: "1-0-1",  duration: "30 days", doctor: "Dr. Sharma" },
    { id: "p2", medicine: "Metformin",    dose: "500 mg", freq: "1-0-1",  duration: "60 days", doctor: "Dr. Verma" },
    { id: "p3", medicine: "Vitamin D3",   dose: "60k IU", freq: "Weekly", duration: "8 wks",   doctor: "Dr. Verma" },
  ]);
  const [labTests, setLabTests] = useState<LabTest[]>([
    { id: "l1", name: "Complete Blood Count", date: "12 Apr", status: "ready",   result: "Normal" },
    { id: "l2", name: "Lipid Profile",        date: "20 Apr", status: "ready",   result: "Borderline" },
    { id: "l3", name: "HbA1c",                date: "27 Apr", status: "pending" },
  ]);
  const [bills, setBills] = useState<Bill[]>([
    { id: "b1", item: "Consultation – Dr. Sharma", amount: 600, date: "10 Apr", status: "paid" },
    { id: "b2", item: "Lipid Profile",             amount: 850, date: "20 Apr", status: "paid" },
    { id: "b3", item: "HbA1c Test",                amount: 450, date: "27 Apr", status: "unpaid" },
  ]);

  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [bookingDoc, setBookingDoc] = useState<Doctor | null>(null);
  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("");
  const [bookMode, setBookMode] = useState<"in-person" | "video">("in-person");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPickerOpen, setChatPickerOpen] = useState(false);
  const [chatMode, setChatMode] = useState<"doctor" | "ai">("doctor");
  const [chatDoctor, setChatDoctor] = useState<Doctor>(doctors[0]);
  const [doctorChat, setDoctorChat] = useState<ChatMsg[]>([
    { id: "m1", from: "doc", text: "Hello! How can I help you today?", ts: Date.now() - 60000 },
  ]);

  const filteredDoctors = useMemo(
    () => doctors.filter((x) => (x.name + x.spec).toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const onServiceClick = (key: string) => {
    if (key === "book")    return setTab("doctors");
    if (key === "reports") return setTab("reports");
    if (key === "rx")      return setTab("rx");
    if (key === "lab")     return setTab("lab");
    if (key === "bills")   return setTab("bills");
    if (key === "chat")    return setChatPickerOpen(true);
  };

  const confirmBooking = () => {
    if (!bookingDoc || !bookDate || !bookTime) return toast.error("Please pick a date and time");
    setAppointments((a) => [{
      id: `a${Date.now()}`, doctor: bookingDoc.name, spec: bookingDoc.spec,
      date: bookDate, time: bookTime, mode: bookMode, status: "upcoming",
    }, ...a]);
    setBookingDoc(null); setBookDate(""); setBookTime("");
    toast.success("Appointment booked");
    setTab("overview");
  };

  const cancelAppointment = (id: string) => {
    setAppointments((a) => a.filter((x) => x.id !== id));
    toast.success("Appointment cancelled");
  };

  const payBill = (id: string) => {
    setBills((bs) => bs.map((b) => b.id === id ? { ...b, status: "paid" } : b));
    toast.success("Payment successful");
  };

  const downloadReport = (lab: LabTest) => {
    if (lab.status !== "ready") return toast.error("Result not ready yet");
    const blob = new Blob(
      [`CareJR Lab Report\n\nTest: ${lab.name}\nDate: ${lab.date}\nResult: ${lab.result}\nPatient: ${name}\n`],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${lab.name.replace(/\s+/g, "_")}.txt`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const refillRx = (rx: Prescription) => toast.success(`Refill requested: ${rx.medicine}`);

  const sendDoctorChat = (text: string) => {
    if (!text.trim()) return;
    setDoctorChat((c) => [...c, { id: `c${Date.now()}`, from: "me", text: text.trim(), ts: Date.now() }]);
    setTimeout(() => {
      setDoctorChat((c) => [...c, { id: `c${Date.now() + 1}`, from: "doc", text: autoReplyDoctor(text.trim()), ts: Date.now() }]);
    }, 800);
  };

  const upcoming = appointments.filter((a) => a.status === "upcoming");
  const unpaidTotal = bills.filter((b) => b.status === "unpaid").reduce((s, b) => s + b.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-cyan-50">
      <AppHeader userName={name} hospital={hospital} />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section className="rounded-3xl bg-gradient-to-br from-primary to-primary/70 p-8 text-primary-foreground shadow-xl flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="h-20 w-20 rounded-2xl ring-4 ring-white/30 shrink-0 bg-white/10 flex items-center justify-center overflow-hidden">
            {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <HeartPulse size={28} />}
          </div>
          <div className="flex-1">
            <p className="text-sm opacity-80">Hello,</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold">{name}</h1>
            <p className="mt-1 text-sm opacity-90 flex items-center gap-2">
              <ShieldCheck size={14} /> {hospital}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
            <MiniStat label="Heart" value={`${vitals.heart}`} unit="bpm" />
            <MiniStat label="BP" value={`${vitals.bpSys}/${vitals.bpDia}`} />
            <MiniStat label="SpO₂" value={`${vitals.spo2}%`} />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Services</h2>
            <Badge variant="secondary" className="rounded-full">{upcoming.length} upcoming</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {services.map((s) => (
              <button
                key={s.key}
                onClick={() => onServiceClick(s.key)}
                className="rounded-2xl border bg-card p-5 text-center hover:shadow-lg hover:-translate-y-0.5 transition group"
              >
                <div className={`h-12 w-12 mx-auto rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                  <s.icon size={20} className="text-white" strokeWidth={2.3} />
                </div>
                <div className="mt-3 text-sm font-semibold">{s.title}</div>
              </button>
            ))}
          </div>
        </section>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 rounded-2xl p-1 h-auto">
            <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
            <TabsTrigger value="doctors" className="rounded-xl">Doctors</TabsTrigger>
            <TabsTrigger value="rx" className="rounded-xl">Rx</TabsTrigger>
            <TabsTrigger value="lab" className="rounded-xl">Lab</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-xl">Reports</TabsTrigger>
            <TabsTrigger value="bills" className="rounded-xl">Bills</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 grid lg:grid-cols-3 gap-5">
            <div className="rounded-2xl border bg-card p-6 lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <Activity size={18} className="text-primary" /> Live Vitals
                </h3>
                <Badge className="bg-accent text-primary">Realtime</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <VitalTile icon={HeartPulse}  label="Heart" value={`${vitals.heart}`} unit="bpm" tone="rose" />
                <VitalTile icon={Activity}    label="BP"    value={`${vitals.bpSys}/${vitals.bpDia}`} unit="mmHg" tone="emerald" />
                <VitalTile icon={Droplets}    label="SpO₂"  value={`${vitals.spo2}`} unit="%" tone="cyan" />
                <VitalTile icon={Thermometer} label="Temp"  value={`${vitals.temp}`} unit="°C" tone="amber" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Daily Steps</span>
                  <span>{vitals.steps.toLocaleString()} / 8,000</span>
                </div>
                <Progress value={Math.min(100, (vitals.steps / 8000) * 100)} />
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6 space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Calendar size={18} className="text-primary" /> Upcoming
              </h3>
              {upcoming.length === 0 && <EmptyHint text="No upcoming visits" />}
              {upcoming.map((a) => (
                <div key={a.id} className="rounded-xl bg-accent p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{a.doctor}</p>
                      <p className="text-xs text-muted-foreground">{a.spec}</p>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {a.mode === "video" ? <Video size={12} className="mr-1" /> : <MapPin size={12} className="mr-1" />}
                      {a.mode}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-primary">
                      <Clock size={12} className="inline mr-1" />{a.date} · {a.time}
                    </span>
                    <button onClick={() => cancelAppointment(a.id)} className="text-destructive hover:underline">Cancel</button>
                  </div>
                </div>
              ))}
              <Button onClick={() => setTab("doctors")} variant="outline" className="w-full rounded-xl">
                <Plus size={16} className="mr-1" /> Book new
              </Button>
            </div>

            <div className="rounded-2xl border bg-card p-6 lg:col-span-3">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <TrendingUp size={18} className="text-primary" /> Health Snapshot
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <Snapshot label="Active Rx" value={prescriptions.length} hint="medications" tone="rose" />
                <Snapshot label="Pending Tests" value={labTests.filter((l) => l.status === "pending").length} hint="lab results" tone="violet" />
                <Snapshot label="Outstanding" value={`₹${unpaidTotal}`} hint="unpaid bills" tone="amber" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="doctors" className="mt-6 space-y-4">
            <div className="relative max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search doctors or specialty…" className="pl-9 h-11 rounded-xl" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDoctors.map((doc) => (
                <div key={doc.id} className="rounded-2xl border bg-card p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
                      <Stethoscope size={18} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{doc.name}</h3>
                      <p className="text-xs text-muted-foreground">{doc.spec}</p>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Star size={12} className="text-amber-500 fill-amber-500" />{doc.rating}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="rounded-lg bg-accent px-2 py-1 font-semibold text-primary">{doc.avail}</span>
                    <span className="font-bold">₹{doc.fee}</span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {doc.mode.map((m) => (
                      <Badge key={m} variant="outline" className="text-[10px] capitalize">
                        {m === "video" ? <Video size={10} className="mr-1" /> : <MapPin size={10} className="mr-1" />}{m}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => { setChatDoctor(doc); setChatMode("doctor"); setChatOpen(true); }}>
                      <MessageCircle size={14} className="mr-1" /> Chat
                    </Button>
                    <Button className="rounded-xl" onClick={() => { setBookingDoc(doc); setBookMode(doc.mode[0]); }}>
                      Book
                    </Button>
                  </div>
                </div>
              ))}
              {filteredDoctors.length === 0 && <EmptyHint text="No doctors match your search" />}
            </div>
          </TabsContent>

          <TabsContent value="rx" className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prescriptions.map((rx) => (
              <div key={rx.id} className="rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center">
                    <Pill size={18} className="text-rose-600" />
                  </div>
                  <div>
                    <h4 className="font-bold">{rx.medicine}</h4>
                    <p className="text-xs text-muted-foreground">{rx.doctor}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Pill1 label="Dose" value={rx.dose} />
                  <Pill1 label="Freq" value={rx.freq} />
                  <Pill1 label="For" value={rx.duration} />
                </div>
                <Button onClick={() => refillRx(rx)} className="w-full mt-4 rounded-xl" variant="outline">
                  Request Refill
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="lab" className="mt-6 space-y-3">
            {labTests.map((lab) => (
              <div key={lab.id} className="rounded-2xl border bg-card p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <FlaskConical size={18} className="text-violet-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{lab.name}</p>
                  <p className="text-xs text-muted-foreground">Sample: {lab.date}</p>
                </div>
                {lab.status === "ready" ? (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <CheckCircle2 size={12} className="mr-1" />{lab.result}
                  </Badge>
                ) : (
                  <Badge variant="secondary"><Clock size={12} className="mr-1" /> Pending</Badge>
                )}
                <Button size="sm" variant="outline" className="rounded-lg" onClick={() => downloadReport(lab)}>
                  <Download size={14} className="mr-1" /> Report
                </Button>
              </div>
            ))}
            <Button variant="outline" className="rounded-xl" onClick={() => {
              setLabTests((ls) => [{ id: `l${Date.now()}`, name: "Thyroid Panel", date: "Today", status: "pending" }, ...ls]);
              toast.success("Lab test booked");
            }}>
              <Plus size={16} className="mr-1" /> Book new test
            </Button>
          </TabsContent>

          <TabsContent value="reports" className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {labTests.filter((l) => l.status === "ready").map((l) => (
              <div key={l.id} className="rounded-2xl border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                    <FileText size={18} className="text-cyan-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold">{l.name}</h4>
                    <p className="text-xs text-muted-foreground">{l.date}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm">Result: <span className="font-semibold">{l.result}</span></p>
                <Button onClick={() => downloadReport(l)} className="w-full mt-4 rounded-xl">
                  <Download size={14} className="mr-1" /> Download
                </Button>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="bills" className="mt-6 space-y-3">
            <div className="rounded-2xl border bg-card p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-destructive">₹{unpaidTotal}</p>
              </div>
              {unpaidTotal > 0 && (
                <Button className="rounded-xl" onClick={() => {
                  setBills((bs) => bs.map((b) => ({ ...b, status: "paid" as const })));
                  toast.success("All bills paid");
                }}>Pay All</Button>
              )}
            </div>
            {bills.map((b) => (
              <div key={b.id} className="rounded-2xl border bg-card p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CreditCard size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{b.item}</p>
                  <p className="text-xs text-muted-foreground">{b.date}</p>
                </div>
                <p className="font-bold">₹{b.amount}</p>
                {b.status === "paid" ? (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <CheckCircle2 size={12} className="mr-1" /> Paid
                  </Badge>
                ) : (
                  <Button size="sm" className="rounded-lg" onClick={() => payBill(b.id)}>Pay</Button>
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!bookingDoc} onOpenChange={(o) => !o && setBookingDoc(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Book with {bookingDoc?.name}</DialogTitle>
            <DialogDescription>{bookingDoc?.spec} · ₹{bookingDoc?.fee} consultation</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" className="rounded-xl mt-1" value={bookDate} onChange={(e) => setBookDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
            </div>
            <div>
              <Label className="text-xs">Time slot</Label>
              <Select value={bookTime} onValueChange={setBookTime}>
                <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="Pick a time" /></SelectTrigger>
                <SelectContent>
                  {["09:00 AM","10:30 AM","12:00 PM","03:00 PM","04:30 PM","06:00 PM"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Mode</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {bookingDoc?.mode.map((m) => (
                  <button key={m} onClick={() => setBookMode(m)}
                    className={`rounded-xl border-2 p-3 text-sm font-medium capitalize transition ${bookMode === m ? "border-primary bg-accent text-primary" : "border-border"}`}>
                    {m === "video" ? <><Video size={14} className="inline mr-1" /> Video</> : <><MapPin size={14} className="inline mr-1" /> In-person</>}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBookingDoc(null)}>Cancel</Button>
            <Button onClick={confirmBooking} className="rounded-xl">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={chatPickerOpen} onOpenChange={setChatPickerOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Messages</DialogTitle>
            <DialogDescription>Choose how you want to continue.</DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                setChatMode("doctor");
                setChatPickerOpen(false);
                setChatOpen(true);
              }}
              className="rounded-xl border p-4 text-left hover:border-primary/50 hover:bg-accent transition"
            >
              <p className="font-semibold">Chat with Doctor</p>
              <p className="text-xs text-muted-foreground mt-1">Directly connect with your doctor from home.</p>
            </button>
            <button
              onClick={() => {
                setChatMode("ai");
                setChatPickerOpen(false);
                setChatOpen(true);
              }}
              className="rounded-xl border p-4 text-left hover:border-primary/50 hover:bg-accent transition"
            >
              <p className="font-semibold">AI Health Assistant</p>
              <p className="text-xs text-muted-foreground mt-1">Get precautions and general guidance.</p>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent className="flex flex-col p-0 sm:max-w-md">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <Stethoscope size={18} className="text-primary" />
              </div>
              <div>
                <p className="font-bold">{chatMode === "doctor" ? chatDoctor.name : "CuraSense AI Assistant"}</p>
                <p className="text-xs text-muted-foreground font-normal">
                  {chatMode === "doctor" ? chatDoctor.spec : "Your personal health companion"}
                </p>
              </div>
            </SheetTitle>
          </SheetHeader>
          {chatMode === "doctor" ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
                {doctorChat.map((m) => (
                  <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${m.from === "me" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card rounded-bl-sm"}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t flex gap-2">
                <Textarea
                  placeholder="Type your message…"
                  className="rounded-xl resize-none min-h-[44px] max-h-32 flex-1"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      const target = e.target as HTMLTextAreaElement;
                      sendDoctorChat(target.value);
                      target.value = "";
                    }
                  }}
                />
                <Button
                  onClick={(e) => {
                    const textarea = (e.currentTarget.parentElement?.querySelector("textarea") as HTMLTextAreaElement);
                    if (textarea) {
                      sendDoctorChat(textarea.value);
                      textarea.value = "";
                    }
                  }}
                  size="icon"
                  className="rounded-xl h-11 w-11 shrink-0"
                >
                  <Send size={16} />
                </Button>
              </div>
            </>
          ) : (
            <AIChat patientName={name} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const MiniStat = ({ label, value, unit }: { label: string; value: string; unit?: string }) => (
  <div className="rounded-xl bg-white/15 backdrop-blur px-3 py-2 text-center">
    <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
    <div className="font-bold">{value} {unit && <span className="text-xs opacity-70">{unit}</span>}</div>
  </div>
);

const VitalTile = ({ icon: Icon, label, value, unit, tone }: { icon: any; label: string; value: string; unit: string; tone: string }) => {
  const tones: Record<string, string> = {
    rose: "bg-rose-100 text-rose-600",
    emerald: "bg-emerald-100 text-emerald-600",
    cyan: "bg-cyan-100 text-cyan-600",
    amber: "bg-amber-100 text-amber-600",
  };
  return (
    <div className="rounded-2xl bg-card p-4 border">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon size={18} /></div>
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold leading-tight">{value} <span className="text-xs font-medium text-muted-foreground">{unit}</span></p>
    </div>
  );
};

const Snapshot = ({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone: string }) => {
  const tones: Record<string, string> = {
    rose: "from-rose-500/15 to-rose-500/5 text-rose-700",
    violet: "from-violet-500/15 to-violet-500/5 text-violet-700",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-700",
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} p-4`}>
      <p className="text-xs uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-2xl font-extrabold mt-1">{value}</p>
      <p className="text-xs opacity-70">{hint}</p>
    </div>
  );
};

const Pill1 = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-accent px-2 py-1.5">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-sm font-bold text-primary">{value}</p>
  </div>
);

const EmptyHint = ({ text }: { text: string }) => (
  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-6">
    <AlertTriangle size={16} /> {text}
  </div>
);

const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const autoReplyDoctor = (msg: string) => {
  const m = msg.toLowerCase();
  if (m.includes("pain"))   return "Can you describe where the pain is and how long you've had it?";
  if (m.includes("fever"))  return "Please monitor your temperature every 4 hours and stay hydrated.";
  if (m.includes("appointment")) return "Sure — I have a slot tomorrow at 10:00 AM. Shall I book it?";
  if (m.includes("thanks") || m.includes("thank")) return "You're welcome! Take care.";
  return "Got it. I'll review and get back to you shortly.";
};

export default PatientDashboard;
