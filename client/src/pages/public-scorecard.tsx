import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Perspective = "Financial" | "Customer" | "Internal" | "Learning";
interface KpiDef {
  id: string; name: string; perspective: Perspective;
  unit: string; target: number; lowerIsBetter?: boolean;
}
interface BscDepartment { id: string; name: string; icon: string; color: string; }

const P_COLOR: Record<Perspective, { accent: string; badge: string }> = {
  Financial: { accent: "#3B82F6", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  Customer:  { accent: "#8B5CF6", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  Internal:  { accent: "#F59E0B", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  Learning:  { accent: "#10B981", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
};

const DEPT_KPIS: Record<string, KpiDef[]> = {
  ops: [
    { id:"ops_f1", name:"Revenue per Aircraft", perspective:"Financial", unit:"USD", target:12000 },
    { id:"ops_f2", name:"Cost Efficiency Ratio", perspective:"Financial", unit:"%", target:72, lowerIsBetter:true },
    { id:"ops_c1", name:"On-Time Performance", perspective:"Customer", unit:"%", target:95 },
    { id:"ops_c2", name:"Customer Score", perspective:"Customer", unit:"/5", target:4.3 },
    { id:"ops_i1", name:"Turnaround Compliance", perspective:"Internal", unit:"%", target:94 },
    { id:"ops_i2", name:"Ground Damage Rate", perspective:"Internal", unit:"/1000", target:0.5, lowerIsBetter:true },
    { id:"ops_l1", name:"Training Completion", perspective:"Learning", unit:"%", target:95 },
    { id:"ops_l2", name:"Turnover Rate", perspective:"Learning", unit:"%", target:10, lowerIsBetter:true },
  ],
  eng: [
    { id:"eng_f1", name:"Maintenance Cost/AC", perspective:"Financial", unit:"USD", target:8500, lowerIsBetter:true },
    { id:"eng_f2", name:"Budget Utilization", perspective:"Financial", unit:"%", target:95 },
    { id:"eng_c1", name:"SLA Compliance", perspective:"Customer", unit:"%", target:98 },
    { id:"eng_c2", name:"Client Satisfaction", perspective:"Customer", unit:"/5", target:4.2 },
    { id:"eng_i1", name:"Equipment Availability", perspective:"Internal", unit:"%", target:96 },
    { id:"eng_i2", name:"Defect Rate", perspective:"Internal", unit:"%", target:1.5, lowerIsBetter:true },
    { id:"eng_l1", name:"Certifications Issued", perspective:"Learning", unit:"#", target:24 },
    { id:"eng_l2", name:"Tooling Compliance", perspective:"Learning", unit:"%", target:100 },
  ],
  fin: [
    { id:"fin_f1", name:"Operating Margin", perspective:"Financial", unit:"%", target:22 },
    { id:"fin_f2", name:"Cash Conversion Days", perspective:"Financial", unit:"days", target:45, lowerIsBetter:true },
    { id:"fin_c1", name:"Internal Satisfaction", perspective:"Customer", unit:"/5", target:4.0 },
    { id:"fin_c2", name:"Report Accuracy", perspective:"Customer", unit:"%", target:99 },
    { id:"fin_i1", name:"Month-End Close Days", perspective:"Internal", unit:"days", target:5, lowerIsBetter:true },
    { id:"fin_i2", name:"Budget Variance", perspective:"Internal", unit:"%", target:5, lowerIsBetter:true },
    { id:"fin_l1", name:"Staff Training Hours", perspective:"Learning", unit:"hrs", target:40 },
    { id:"fin_l2", name:"Digital Adoption", perspective:"Learning", unit:"%", target:80 },
  ],
  hr: [
    { id:"hr_f1", name:"Cost per Hire", perspective:"Financial", unit:"USD", target:2500, lowerIsBetter:true },
    { id:"hr_f2", name:"Training Cost/Employee", perspective:"Financial", unit:"USD", target:1200 },
    { id:"hr_c1", name:"Employee Satisfaction", perspective:"Customer", unit:"/5", target:4.2 },
    { id:"hr_c2", name:"Offer Acceptance Rate", perspective:"Customer", unit:"%", target:85 },
    { id:"hr_i1", name:"Time to Hire", perspective:"Internal", unit:"days", target:30, lowerIsBetter:true },
    { id:"hr_i2", name:"Absenteeism Rate", perspective:"Internal", unit:"%", target:3, lowerIsBetter:true },
    { id:"hr_l1", name:"Training Completion", perspective:"Learning", unit:"%", target:95 },
    { id:"hr_l2", name:"Turnover Rate", perspective:"Learning", unit:"%", target:12, lowerIsBetter:true },
  ],
  qhse: [
    { id:"q_f1", name:"Safety Budget Util", perspective:"Financial", unit:"%", target:95 },
    { id:"q_c1", name:"Audit Compliance Score", perspective:"Customer", unit:"%", target:97 },
    { id:"q_c2", name:"Incident Resolution Days", perspective:"Customer", unit:"days", target:5, lowerIsBetter:true },
    { id:"q_i1", name:"FOD Incidents", perspective:"Internal", unit:"#", target:0, lowerIsBetter:true },
    { id:"q_i2", name:"Near Miss Reports Filed", perspective:"Internal", unit:"#", target:12 },
    { id:"q_l1", name:"Safety Training Compl.", perspective:"Learning", unit:"%", target:100 },
    { id:"q_l2", name:"Safety Culture Score", perspective:"Learning", unit:"/5", target:4.5 },
  ],
  it: [
    { id:"it_f1", name:"IT Budget Utilization", perspective:"Financial", unit:"%", target:95 },
    { id:"it_f2", name:"Cost per Ticket", perspective:"Financial", unit:"USD", target:120, lowerIsBetter:true },
    { id:"it_c1", name:"System Uptime", perspective:"Customer", unit:"%", target:99.5 },
    { id:"it_c2", name:"User Satisfaction", perspective:"Customer", unit:"/5", target:4.2 },
    { id:"it_i1", name:"Ticket Resolution (hrs)", perspective:"Internal", unit:"hrs", target:4, lowerIsBetter:true },
    { id:"it_i2", name:"First Call Resolution", perspective:"Internal", unit:"%", target:75 },
    { id:"it_l1", name:"Digital Tool Adoption", perspective:"Learning", unit:"%", target:80 },
    { id:"it_l2", name:"Training Completion", perspective:"Learning", unit:"%", target:90 },
  ],
  comm: [
    { id:"co_f1", name:"Revenue Growth", perspective:"Financial", unit:"%", target:10 },
    { id:"co_f2", name:"Contract Value", perspective:"Financial", unit:"MUSD", target:25 },
    { id:"co_c1", name:"Customer Retention", perspective:"Customer", unit:"%", target:92 },
    { id:"co_c2", name:"Customer Satisfaction", perspective:"Customer", unit:"/5", target:4.3 },
    { id:"co_i1", name:"Proposal Win Rate", perspective:"Internal", unit:"%", target:40 },
    { id:"co_i2", name:"Contract Renewal Rate", perspective:"Internal", unit:"%", target:85 },
    { id:"co_l1", name:"Sales Training Hours", perspective:"Learning", unit:"hrs", target:40 },
    { id:"co_l2", name:"Product Knowledge Score", perspective:"Learning", unit:"%", target:85 },
  ],
  camo: [
    { id:"ca_f1", name:"Maintenance Budget Util", perspective:"Financial", unit:"%", target:92 },
    { id:"ca_c1", name:"Airworthiness Compliance", perspective:"Customer", unit:"%", target:100 },
    { id:"ca_c2", name:"Customer Satisfaction", perspective:"Customer", unit:"/5", target:4.4 },
    { id:"ca_i1", name:"Aircraft Availability", perspective:"Internal", unit:"%", target:96 },
    { id:"ca_i2", name:"On-Time Maintenance", perspective:"Internal", unit:"%", target:95 },
    { id:"ca_l1", name:"Tech Training Hours", perspective:"Learning", unit:"hrs", target:60 },
    { id:"ca_l2", name:"Regulatory Compliance", perspective:"Learning", unit:"%", target:100 },
  ],
  mro: [
    { id:"mr_f1", name:"MRO Revenue", perspective:"Financial", unit:"MUSD", target:8 },
    { id:"mr_f2", name:"Cost per Man-Hour", perspective:"Financial", unit:"USD", target:85, lowerIsBetter:true },
    { id:"mr_c1", name:"TAT Compliance", perspective:"Customer", unit:"%", target:93 },
    { id:"mr_c2", name:"Customer Score", perspective:"Customer", unit:"/5", target:4.2 },
    { id:"mr_i1", name:"Rework Rate", perspective:"Internal", unit:"%", target:2, lowerIsBetter:true },
    { id:"mr_i2", name:"First-Time Fix Rate", perspective:"Internal", unit:"%", target:88 },
    { id:"mr_l1", name:"Certification Rate", perspective:"Learning", unit:"%", target:95 },
    { id:"mr_l2", name:"Tech Training Hours", perspective:"Learning", unit:"hrs", target:50 },
  ],
  corp: [
    { id:"cr_f1", name:"Revenue Growth", perspective:"Financial", unit:"%", target:8 },
    { id:"cr_f2", name:"EBITDA Margin", perspective:"Financial", unit:"%", target:22 },
    { id:"cr_c1", name:"On-Time Performance", perspective:"Customer", unit:"%", target:95 },
    { id:"cr_c2", name:"Customer Satisfaction", perspective:"Customer", unit:"/5", target:4.2 },
    { id:"cr_i1", name:"Ground Damage Rate", perspective:"Internal", unit:"/1000", target:0.5, lowerIsBetter:true },
    { id:"cr_i2", name:"Turnaround Compliance", perspective:"Internal", unit:"%", target:94 },
    { id:"cr_l1", name:"Training Hrs/Employee", perspective:"Learning", unit:"hrs", target:40 },
    { id:"cr_l2", name:"Staff Turnover Rate", perspective:"Learning", unit:"%", target:12, lowerIsBetter:true },
  ],
};

function genericKpis(deptId: string): KpiDef[] {
  return [
    { id:`${deptId}_f1`, name:"Revenue / Budget Utilization", perspective:"Financial", unit:"%", target:95 },
    { id:`${deptId}_f2`, name:"Cost Efficiency", perspective:"Financial", unit:"%", target:80 },
    { id:`${deptId}_c1`, name:"Customer Satisfaction", perspective:"Customer", unit:"/5", target:4.0 },
    { id:`${deptId}_c2`, name:"Service Level Achievement", perspective:"Customer", unit:"%", target:95 },
    { id:`${deptId}_i1`, name:"Process Compliance", perspective:"Internal", unit:"%", target:98 },
    { id:`${deptId}_i2`, name:"Incident Rate", perspective:"Internal", unit:"#", target:0, lowerIsBetter:true },
    { id:`${deptId}_l1`, name:"Training Completion", perspective:"Learning", unit:"%", target:90 },
    { id:`${deptId}_l2`, name:"Employee Satisfaction", perspective:"Learning", unit:"/5", target:4.0 },
  ];
}

function getKpisForDept(id: string): KpiDef[] { return DEPT_KPIS[id] || genericKpis(id); }

function getStatus(kpi: KpiDef, actual: number | null | undefined): "green" | "amber" | "red" | "nodata" {
  if (actual === null || actual === undefined || isNaN(Number(actual))) return "nodata";
  const pct = kpi.lowerIsBetter
    ? actual <= kpi.target ? 100 : Math.max(0, 100 - ((actual - kpi.target) / kpi.target) * 100)
    : Math.min(100, (actual / kpi.target) * 100);
  if (pct >= 95) return "green";
  if (pct >= 80) return "amber";
  return "red";
}

const STATUS_COLOR = { green: "#10b981", amber: "#f59e0b", red: "#ef4444", nodata: "#94a3b8" };
const STATUS_LABEL = { green: "On Track", amber: "At Risk", red: "Off Track", nodata: "No Data" };

function RagDot({ status }: { status: "green" | "amber" | "red" | "nodata" }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLOR[status] }} />;
}

function healthPct(kpis: KpiDef[], actuals: Record<string, number | null>): number {
  const withData = kpis.filter(k => actuals[k.id] !== null && actuals[k.id] !== undefined && !isNaN(Number(actuals[k.id])));
  if (!withData.length) return 0;
  return Math.round(withData.filter(k => getStatus(k, actuals[k.id]!) === "green").length / withData.length * 100);
}

function healthColor(pct: number): string { return pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444"; }

const PERSPECTIVES: Perspective[] = ["Financial", "Customer", "Internal", "Learning"];

export default function PublicScorecard() {
  const [, params] = useRoute("/public/scorecard/:token");
  const token = params?.token ?? "";

  const { data, isLoading, error } = useQuery<{ departments: BscDepartment[]; actuals: Record<string, Record<string, number>> }>({
    queryKey: ["/api/public/scorecard", token],
    queryFn: () => fetch(`/api/public/scorecard/${token}`).then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); }),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-semibold">Scorecard not available</h2>
        <p className="text-muted-foreground text-sm">This link may be disabled or invalid.</p>
      </div>
    );
  }

  const { departments, actuals } = data;

  const now = new Date();
  const pk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthName = now.toLocaleString("default", { month: "long", year: "numeric" });

  const allKpis = departments.flatMap(d => getKpisForDept(d.id));
  const allActs: Record<string, number | null> = {};
  allKpis.forEach(k => { const v = actuals[pk]?.[k.id]; allActs[k.id] = v !== undefined ? Number(v) : null; });
  const overallHp = healthPct(allKpis, allActs);

  const countsByStatus = { green: 0, amber: 0, red: 0, nodata: 0 };
  allKpis.forEach(k => { countsByStatus[getStatus(k, allActs[k.id])]++; });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/ghc-beacon-logo.jpg" alt="GHC Beacon" className="h-8 w-8 rounded-md object-cover" />
          <span className="font-bold text-lg tracking-tight">GHC Beacon</span>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Globe className="h-3 w-3" /> Public Scorecard
        </Badge>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-8">
        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Balanced Scorecard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{monthName} · {departments.length} departments</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Overall Health</p>
              <p className="text-3xl font-bold tabular-nums" style={{ color: healthColor(overallHp) }}>{overallHp}%</p>
            </div>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground border-l pl-3">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />{countsByStatus.green} on track</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />{countsByStatus.amber} at risk</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" />{countsByStatus.red} off track</span>
            </div>
          </div>
        </div>

        {/* Department cards */}
        {departments.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No departments configured.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {departments.map(dept => {
              const kpis = getKpisForDept(dept.id);
              const acts: Record<string, number | null> = {};
              kpis.forEach(k => { const v = actuals[pk]?.[k.id]; acts[k.id] = v !== undefined ? Number(v) : null; });
              const hp = healthPct(kpis, acts);
              const hc = healthColor(hp);

              return (
                <Card key={dept.id} className="overflow-hidden border-l-[3px]" style={{ borderLeftColor: dept.color }}>
                  <CardContent className="p-5">
                    {/* Dept header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{dept.icon}</span>
                        <div>
                          <p className="font-semibold text-base">{dept.name}</p>
                          <p className="text-xs text-muted-foreground">{kpis.length} KPIs</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold tabular-nums" style={{ color: hc }}>{hp}%</p>
                        <p className="text-[10px] text-muted-foreground">healthy</p>
                      </div>
                    </div>

                    {/* KPIs by perspective */}
                    <div className="space-y-3">
                      {PERSPECTIVES.map(persp => {
                        const pk2 = kpis.filter(k => k.perspective === persp);
                        if (!pk2.length) return null;
                        return (
                          <div key={persp}>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                              {persp === "Internal" ? "Internal Process" : persp === "Learning" ? "Learning & Growth" : persp}
                            </p>
                            <div className="space-y-1">
                              {pk2.map(kpi => {
                                const actual = acts[kpi.id];
                                const status = getStatus(kpi, actual);
                                return (
                                  <div key={kpi.id} className="flex items-center justify-between gap-2 py-0.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <RagDot status={status} />
                                      <span className="text-xs text-foreground truncate">{kpi.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                      <span className="text-xs tabular-nums font-medium">
                                        {actual !== null && actual !== undefined ? `${actual} ${kpi.unit}` : "—"}
                                      </span>
                                      <span className={cn("text-[9px] font-semibold px-1 py-0.5 rounded", {
                                        "bg-emerald-100 text-emerald-700": status === "green",
                                        "bg-amber-100 text-amber-700": status === "amber",
                                        "bg-red-100 text-red-700": status === "red",
                                        "bg-muted text-muted-foreground": status === "nodata",
                                      })}>
                                        {STATUS_LABEL[status]}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground mt-8">
        Powered by <span className="font-semibold text-foreground">GHC Beacon</span>
      </footer>
    </div>
  );
}
