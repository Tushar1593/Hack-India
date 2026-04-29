import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/medical/AppHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2, ClipboardList, FlaskConical, Search, UserRound } from "lucide-react";

type LabOrder = {
  id: string;
  patientName: string;
  testName?: string;
  test_name?: string;
  doctor?: string;
  visitDate?: string;
  status?: "pending" | "completed";
  createdAt?: string;
};

const Laboratory = () => {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"pending" | "completed">("pending");
  const [selected, setSelected] = useState<LabOrder | null>(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("labOrders") || "[]") as LabOrder[];
    setOrders(saved);
    if (saved.length > 0) setSelected(saved[0]);
  }, []);

  const saveOrders = (next: LabOrder[]) => {
    setOrders(next);
    localStorage.setItem("labOrders", JSON.stringify(next));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const statusOk = (o.status || "pending") === tab;
      const name = String(o.patientName || "").toLowerCase();
      const test = String(o.testName || o.test_name || "").toLowerCase();
      return statusOk && (!q || name.includes(q) || test.includes(q) || String(o.id).toLowerCase().includes(q));
    });
  }, [orders, search, tab]);

  const markCompleted = (id: string) => {
    const next = orders.map((o) => (o.id === id ? { ...o, status: "completed" as const } : o));
    saveOrders(next);
    setSelected(next.find((x) => x.id === id) || null);
    toast.success("Order marked completed");
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <AppHeader hospital={localStorage.getItem("hospital") || "CuraSense"} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <FlaskConical className="text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">CuraSense</p>
            <h1 className="font-display text-3xl font-bold">Laboratory System</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-[420px_1fr] gap-5">
          <section className="card-medical p-5">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList size={18} className="text-primary" />
              <h2 className="font-semibold">Test Orders</h2>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "pending" | "completed")} className="mb-3">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient / test / id"
                className="pl-8 h-10 rounded-lg"
              />
            </div>

            <div className="space-y-2 max-h-[58vh] overflow-auto pr-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No {tab} orders found.</p>
              ) : (
                filtered.map((o) => {
                  const active = selected?.id === o.id;
                  const test = o.testName || o.test_name || "Test Order";
                  return (
                    <button
                      key={o.id}
                      onClick={() => setSelected(o)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        active ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <p className="text-sm font-semibold">{o.patientName || "Unknown patient"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{test}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">#{o.id}</p>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="card-medical p-6">
            {!selected ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center">
                <UserRound className="text-muted-foreground mb-2" />
                <p className="font-semibold">Select an order</p>
                <p className="text-sm text-muted-foreground">Choose a test order from the left panel.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-2xl font-bold">{selected.patientName}</h3>
                    <p className="text-muted-foreground mt-1">{selected.testName || selected.test_name || "Test Order"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Order ID: {selected.id}</p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      (selected.status || "pending") === "completed"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {(selected.status || "pending").toUpperCase()}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mt-5 text-sm">
                  <Info label="Doctor" value={selected.doctor || "—"} />
                  <Info label="Visit Date" value={selected.visitDate || "—"} />
                  <Info label="Created At" value={selected.createdAt ? new Date(selected.createdAt).toLocaleString() : "—"} />
                  <Info label="Hospital" value={localStorage.getItem("hospital") || "CuraSense"} />
                </div>

                {(selected.status || "pending") !== "completed" && (
                  <div className="mt-6">
                    <Button onClick={() => markCompleted(selected.id)} className="rounded-xl bg-gradient-primary">
                      <CheckCircle2 size={15} className="mr-2" /> Mark Completed
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border bg-card p-3">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-1 font-medium">{value}</p>
  </div>
);

export default Laboratory;