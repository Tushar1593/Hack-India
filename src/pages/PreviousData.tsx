import { useEffect, useState } from "react";
import { AppHeader } from "@/components/medical/AppHeader";
import { Button } from "@/components/ui/button";
import { Download, Trash2, FileText, Calendar, User, Pill, FlaskConical, Activity } from "lucide-react";
import { toast } from "sonner";

interface Report {
  name: string; date: string; symptoms: string; medicines: string;
  tests: string; exercise?: string; doctor: string; risk?: number;
}

const PreviousData = () => {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => { load(); }, []);
  const load = () => setReports(JSON.parse(localStorage.getItem("reports") || "[]"));

  const del = (i: number) => {
    if (!confirm("Delete this report?")) return;
    const r = [...reports]; r.splice(i, 1);
    localStorage.setItem("reports", JSON.stringify(r));
    setReports(r);
    toast.success("Report deleted");
  };

  const downloadPDF = (r: Report) => {
    // @ts-ignore
    const jsPDF = (window as any).jspdf?.jsPDF;
    if (!jsPDF) {
      // fallback: text file
      const blob = new Blob([JSON.stringify(r, null, 2)], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${r.name}-report.txt`; a.click();
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("CareJR Medical Report", 20, 20);
    doc.setFontSize(11);
    let y = 35;
    Object.entries(r).forEach(([k, v]) => { doc.text(`${k}: ${v}`, 20, y); y += 8; });
    doc.save(`${r.name}-report.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <AppHeader hospital={localStorage.getItem("hospital") || "CareJR"} />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8 animate-slide-up">
          <h1 className="font-display text-4xl font-extrabold">Previous <span className="gradient-text">Reports</span></h1>
          <p className="text-muted-foreground mt-2">All generated patient reports in one place.</p>
        </div>

        {reports.length === 0 ? (
          <div className="card-medical p-16 text-center animate-fade-in">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary-soft flex items-center justify-center mb-4">
              <FileText size={28} className="text-primary" />
            </div>
            <h3 className="font-display font-bold text-xl">No reports yet</h3>
            <p className="text-muted-foreground text-sm mt-1">Generate your first report from a new consultation.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((r, i) => (
              <div key={i} className="card-medical p-6 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-xl bg-primary-soft flex items-center justify-center">
                        <User size={16} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg">{r.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar size={11} /> {r.date}</p>
                      </div>
                    </div>
                  </div>
                  {r.risk !== undefined && (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Risk</div>
                      <div className="font-display font-bold gradient-text">{r.risk}%</div>
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-3 gap-3 mt-5">
                  <Info icon={Activity} label="Symptoms" value={r.symptoms} />
                  <Info icon={Pill} label="Medicines" value={r.medicines} />
                  <Info icon={FlaskConical} label="Tests" value={r.tests} />
                </div>

                <div className="flex gap-2 mt-5 pt-5 border-t border-border/60">
                  <Button onClick={() => downloadPDF(r)} size="sm" className="rounded-lg bg-gradient-primary">
                    <Download size={14} className="mr-1.5" /> PDF
                  </Button>
                  <Button onClick={() => del(i)} size="sm" variant="destructive" className="rounded-lg">
                    <Trash2 size={14} className="mr-1.5" /> Delete
                  </Button>
                  <span className="ml-auto text-xs text-muted-foreground self-center">Dr. {r.doctor || "—"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const Info = ({ icon: Icon, label, value }: any) => (
  <div className="rounded-xl bg-muted/40 p-3">
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon size={11} /> {label}
    </div>
    <div className="text-sm mt-1 line-clamp-2">{value || "—"}</div>
  </div>
);

export default PreviousData;
