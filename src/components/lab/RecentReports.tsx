import { FileCheck2, BellRing } from "lucide-react";

type Report = {
  id: string;
  created_at: string;
  ai_severity: string | null;
  ai_summary: string | null;
  doctor_notified: boolean;
  file_name: string | null;
  lab_test_id: string;
};

const sevStyle: Record<string, string> = {
  normal: "bg-success/15 text-success",
  mild: "bg-warning/15 text-warning",
  moderate: "bg-warning/20 text-warning",
  severe: "bg-destructive/15 text-destructive",
  critical: "bg-destructive/25 text-destructive",
};

export function RecentReports({ reports }: { reports: Report[] }) {
  return (
    <section className="card-medical p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileCheck2 size={18} className="text-primary" />
        <h2 className="font-display font-bold text-lg">Recent Reports</h2>
      </div>
      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No reports yet.</p>
      ) : (
        <ul className="space-y-2">
          {reports.slice(0, 6).map((r) => (
            <li
              key={r.id}
              className="p-3 rounded-lg bg-muted/40 border border-border text-sm"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold truncate">
                  {r.file_name ?? "Structured result"}
                </span>
                {r.ai_severity && (
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                      sevStyle[r.ai_severity] ?? sevStyle.normal
                    }`}
                  >
                    {r.ai_severity}
                  </span>
                )}
              </div>
              {r.ai_summary && (
                <p className="text-xs text-muted-foreground line-clamp-2">{r.ai_summary}</p>
              )}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5">
                <span>{new Date(r.created_at).toLocaleString()}</span>
                {r.doctor_notified && (
                  <span className="inline-flex items-center gap-1 text-primary font-semibold">
                    <BellRing size={10} /> Doctor notified
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
