import { useState } from "react";
import { AppHeader } from "@/components/medical/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, UserRound } from "lucide-react";

type Message = { id: string; from: "doctor" | "patient"; text: string; ts: number };
type Thread = { id: string; patientName: string; unread: number; messages: Message[] };

const DoctorMessages = () => {
  const doc = JSON.parse(localStorage.getItem("doctorDetails") || "{}");
  const hospital = doc.hospital || "CuraSense Hospital";
  const doctorName = doc.name || "Doctor";

  const [threads, setThreads] = useState<Thread[]>([
    {
      id: "p-1",
      patientName: "Aanya Patel",
      unread: 1,
      messages: [
        { id: "m1", from: "patient", text: "Doctor, I still have mild fever since yesterday.", ts: Date.now() - 100000 },
      ],
    },
    {
      id: "p-2",
      patientName: "Rohit Mehra",
      unread: 0,
      messages: [
        { id: "m2", from: "patient", text: "Can I continue my BP medicine with this cough syrup?", ts: Date.now() - 200000 },
      ],
    },
  ]);
  const [activeId, setActiveId] = useState("p-1");
  const [input, setInput] = useState("");

  const active = threads.find((t) => t.id === activeId) || threads[0];

  const openThread = (id: string) => {
    setActiveId(id);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: 0 } : t)));
  };

  const send = () => {
    const text = input.trim();
    if (!text || !active) return;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === active.id
          ? {
              ...t,
              messages: [...t.messages, { id: `d-${Date.now()}`, from: "doctor", text, ts: Date.now() }],
            }
          : t,
      ),
    );
    setInput("");
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <AppHeader userName={doctorName} hospital={hospital} />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Doctor Console</p>
            <h1 className="font-display text-3xl font-bold">Patient Messages</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-5">
          <section className="card-medical p-4 space-y-2">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => openThread(t.id)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  active?.id === t.id ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{t.patientName}</p>
                  {t.unread > 0 && <Badge className="bg-amber-100 text-amber-700">{t.unread} new</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t.messages[t.messages.length - 1]?.text}</p>
              </button>
            ))}
          </section>

          <section className="card-medical p-0 flex flex-col min-h-[560px]">
            <div className="p-4 border-b flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                <UserRound size={18} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold">{active?.patientName || "Patient"}</p>
                <p className="text-xs text-muted-foreground">Direct chat</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
              {active?.messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === "doctor" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm ${
                      m.from === "doctor" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Reply to patient..."
                className="rounded-xl resize-none min-h-[44px] max-h-32"
                rows={1}
              />
              <Button onClick={send} size="icon" className="h-11 w-11 rounded-xl shrink-0">
                <Send size={16} />
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default DoctorMessages;
