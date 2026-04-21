import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import {
  Target, ListChecks, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, ArrowUpRight, BarChart3,
  Activity, CalendarDays, Building2,
  Briefcase, Zap, Clock, Printer, Layers,
  AlertCircle, Lightbulb, MessageSquare,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import type {
  ActionItem, MonthlyReview, Department, Kpi, Company,
  Milestone as MilestoneType, Project, KpiActual,
} from "@shared/schema";

/* ─── animated counter ─── */
function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(Math.round(t * target));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);
  return value;
}

function StatTile({ title, value, icon: Icon, iconBg, iconColor, topBar, accent, pct, pctLabel, link }: {
  title: string; value: number; icon: React.ElementType;
  iconBg: string; iconColor: string; topBar: string; accent: string;
  pct?: number | null; pctLabel?: string; link: string;
}) {
  const animated = useCountUp(value);
  return (
    <Link href={link} data-testid={`link-stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="relative rounded-xl border bg-card cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full overflow-hidden">
        <div className={`absolute top-0 inset-x-0 h-[3px] ${topBar}`} />
        <div className="p-3 pt-4">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 leading-none">{title}</p>
            <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${iconBg} shrink-0`}>
              <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
            </div>
          </div>
          <p className={`text-2xl font-black tabular-nums leading-none tracking-tight ${accent}`}
             data-testid={`text-stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>{animated}</p>
          {pct !== null && pct !== undefined && (
            <div className="mt-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-muted-foreground">{pctLabel}</span>
                <span className={`text-[10px] font-bold ${accent}`}>{pct}%</span>
              </div>
              <Progress value={pct} className="h-1" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─── Widget shell ─── */
function WidgetCard({ accentClass, children }: { accentClass: string; children: React.ReactNode }) {
  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <div className={`h-[3px] shrink-0 ${accentClass}`} />
      {children}
    </Card>
  );
}

function WidgetHeader({ icon: Icon, iconBg, iconColor, children, right }: {
  icon: React.ElementType; iconBg: string; iconColor: string;
  children: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 pt-3 pb-2 select-none shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${iconBg} shrink-0`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
        <span className="text-sm font-bold truncate">{children}</span>
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
}

const tabCls = (active: boolean) =>
  `px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
    active ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
  }`;

export default function DashboardPage() {
  const { user } = useAuth();

  /* ─── data ─── */
  const { data: companyData } = useQuery<Company & { departments: Department[] } | null>({ queryKey: ["/api/company"] });
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalKpis: number; onTrack: number; belowTarget: number;
    totalActions: number; overdueActions: number; completedActions: number;
  }>({ queryKey: ["/api/dashboard-stats"] });
  const { data: actions } = useQuery<ActionItem[]>({ queryKey: ["/api/action-items"] });
  const { data: reviews } = useQuery<MonthlyReview[]>({ queryKey: ["/api/monthly-reviews"] });
  const { data: kpis } = useQuery<Kpi[]>({ queryKey: ["/api/kpis"] });
  const { data: departments } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: portfolioStats } = useQuery<{
    total: number; active: number; completed: number; atRisk: number; overdueTasks: number; upcomingMilestones: number; delayedSubtasks: number;
  }>({ queryKey: ["/api/portfolio/stats"] });
  const { data: projects = [] } = useQuery<(Project & { health: string; taskCount: number; completedTaskCount: number })[]>({ queryKey: ["/api/projects"] });
  const { data: milestones = [] } = useQuery<MilestoneType[]>({ queryKey: ["/api/milestones"] });
  const { data: allActuals = [] } = useQuery<(KpiActual & { kpiName: string })[]>({ queryKey: ["/api/kpi-actuals/company"] });

  /* ─── derived ─── */
  const today = new Date().toISOString().split("T")[0];
  const latestReview = reviews?.[0];
  const companyName = companyData?.companyName || "Your Company";
  const formattedDate = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const overdueActions = (actions || []).filter(a => {
    const eff = a.revisedDueDate || a.dueDate;
    return eff && eff < today && a.status !== "Completed" && a.status !== "Cancelled";
  }).sort((a, b) => (a.revisedDueDate || a.dueDate || "").localeCompare(b.revisedDueDate || b.dueDate || ""));

  const latestActualByKpi: Record<number, KpiActual & { kpiName: string }> = {};
  for (const a of allActuals) {
    const existing = latestActualByKpi[a.kpiId];
    if (!existing || a.reviewMonth > existing.reviewMonth) latestActualByKpi[a.kpiId] = a;
  }
  const atRiskKpis = Object.values(latestActualByKpi).filter(a => a.status === "Amber" || a.status === "Below Target");

  const in7Days = new Date(); in7Days.setDate(in7Days.getDate() + 7);
  const in7DaysStr = in7Days.toISOString().split("T")[0];
  const upcomingMilestones = milestones.filter(m =>
    m.status !== "Completed" && m.dueDate && m.dueDate >= today && m.dueDate <= in7DaysStr
  ).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

  const deptSummary = (departments || []).map(dept => {
    const deptKpis = (kpis || []).filter(k => k.departmentId === dept.id);
    const deptActions = (actions || []).filter(a => a.departmentId === dept.id);
    const overdue = deptActions.filter(a => {
      const eff = a.revisedDueDate || a.dueDate;
      return eff && eff < today && a.status !== "Completed" && a.status !== "Cancelled";
    });
    const activeActions = deptActions.filter(a => a.status !== "Completed" && a.status !== "Cancelled").length;
    const kpiGreen = deptKpis.filter(k => latestActualByKpi[k.id]?.status === "Green").length;
    const kpiAmber = deptKpis.filter(k => latestActualByKpi[k.id]?.status === "Amber").length;
    const kpiRed = deptKpis.filter(k => latestActualByKpi[k.id]?.status === "Red").length;
    const kpiNoData = deptKpis.filter(k => !latestActualByKpi[k.id]).length;
    const deptProjects = (projects || []).filter(p => p.departmentId === dept.id);
    const activeProjectCount = deptProjects.filter(p => p.status !== "Completed").length;
    const redProjects = deptProjects.filter(p => p.health === "Red").length;
    const amberProjects = deptProjects.filter(p => p.health === "Amber").length;
    return {
      id: dept.id, name: dept.name,
      overdueCount: overdue.length, activeActions,
      kpiGreen, kpiAmber, kpiRed, kpiNoData, kpiCount: deptKpis.length, actionCount: deptActions.length,
      activeProjectCount, redProjects, amberProjects,
    };
  }).filter(d => d.kpiCount > 0 || d.actionCount > 0);

  const pctOnTrack = stats && stats.totalKpis > 0 ? Math.round((stats.onTrack / stats.totalKpis) * 100) : 0;
  const pctCompleted = stats && stats.totalActions > 0 ? Math.round((stats.completedActions / stats.totalActions) * 100) : 0;
  const pctOverdue = stats && stats.totalActions > 0 ? Math.round((stats.overdueActions / stats.totalActions) * 100) : 0;
  const hasKpis = (stats?.totalKpis || 0) > 0;
  const focusCount = overdueActions.length + atRiskKpis.length + upcomingMilestones.length;

  const kpiStatusData = stats
    ? [
        { name: "On Track", value: stats.onTrack, fill: "#10b981" },
        { name: "At Risk", value: Math.max(0, stats.totalKpis - stats.onTrack - stats.belowTarget), fill: "#f59e0b" },
        { name: "Below Target", value: stats.belowTarget, fill: "#ef4444" },
      ].filter(d => d.value > 0)
    : [];

  const actionChartData = stats
    ? [
        { name: "Done", count: stats.completedActions, fill: "#10b981" },
        { name: "Active", count: Math.max(0, stats.totalActions - stats.completedActions - stats.overdueActions), fill: "#3b82f6" },
        { name: "Overdue", count: stats.overdueActions, fill: "#ef4444" },
      ].filter(d => d.count > 0)
    : [];

  const kpiGroup = [
    { title: "Total KPIs", value: stats?.totalKpis || 0, icon: Target, iconBg: "bg-blue-500/10", iconColor: "text-primary", topBar: "bg-gradient-to-r from-primary to-primary/60", pct: pctOnTrack, pctLabel: "on track", link: "/kpis", accent: "text-primary" },
    { title: "On Track", value: stats?.onTrack || 0, icon: CheckCircle2, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600", topBar: "bg-gradient-to-r from-emerald-500 to-emerald-400", link: "/kpis", accent: "text-emerald-600" },
    { title: "Below Target", value: stats?.belowTarget || 0, icon: TrendingDown, iconBg: "bg-red-500/10", iconColor: "text-red-500", topBar: "bg-gradient-to-r from-red-500 to-red-400", link: "/kpis", accent: "text-red-500" },
  ];
  const projectGroup = [
    { title: "Active Projects", value: portfolioStats?.active || 0, icon: Briefcase, iconBg: "bg-blue-500/10", iconColor: "text-primary", topBar: "bg-gradient-to-r from-primary to-primary/60", link: "/portfolio", accent: "text-primary" },
    { title: "At Risk", value: portfolioStats?.atRisk || 0, icon: AlertTriangle, iconBg: "bg-red-500/10", iconColor: "text-red-500", topBar: "bg-gradient-to-r from-red-500 to-red-400", link: "/portfolio", accent: "text-red-500" },
    { title: "Overdue Tasks", value: portfolioStats?.overdueTasks || 0, icon: Clock, iconBg: "bg-orange-500/10", iconColor: "text-orange-500", topBar: "bg-gradient-to-r from-orange-500 to-amber-400", link: "/portfolio", accent: "text-orange-500" },
    { title: "Delayed Subtasks", value: portfolioStats?.delayedSubtasks || 0, icon: AlertCircle, iconBg: "bg-red-500/10", iconColor: "text-red-500", topBar: "bg-gradient-to-r from-red-400 to-rose-400", link: "/portfolio", accent: "text-red-500" },
  ];
  const actionGroup = [
    { title: "Total Actions", value: stats?.totalActions || 0, icon: ListChecks, iconBg: "bg-blue-500/10", iconColor: "text-blue-600", topBar: "bg-gradient-to-r from-blue-500 to-blue-400", pct: pctCompleted, pctLabel: "done", link: "/actions", accent: "text-blue-600" },
    { title: "Overdue", value: stats?.overdueActions || 0, icon: AlertTriangle, iconBg: "bg-orange-500/10", iconColor: "text-orange-500", topBar: "bg-gradient-to-r from-orange-500 to-amber-400", pct: pctOverdue, pctLabel: "of total", link: "/actions", accent: "text-orange-500" },
    { title: "Completed", value: stats?.completedActions || 0, icon: TrendingUp, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600", topBar: "bg-gradient-to-r from-emerald-500 to-emerald-400", link: "/actions", accent: "text-emerald-600" },
  ];
  const statCards = hasKpis ? [...kpiGroup, ...actionGroup] : [...projectGroup, ...actionGroup];

  /* ─── widget tab states ─── */
  const [attentionTab, setAttentionTab] = useState<"all" | "actions" | "kpis" | "milestones">("all");
  const [chartTab, setChartTab] = useState<"kpi" | "actions">("kpi");
  const chartTabInitialized = useRef(false);
  const [actionFilter, setActionFilter] = useState<"all" | "overdue" | "inprogress">("all");

  useEffect(() => {
    if (chartTabInitialized.current || !stats) return;
    chartTabInitialized.current = true;
    if (kpiStatusData.length === 0 && actionChartData.length > 0) setChartTab("actions");
  }, [stats]);

  const showActions = attentionTab === "all" || attentionTab === "actions";
  const showKpis = attentionTab === "all" || attentionTab === "kpis";
  const showMilestones = attentionTab === "all" || attentionTab === "milestones";

  const filteredActions = (actions || []).filter(a => {
    if (actionFilter === "overdue") {
      const eff = a.revisedDueDate || a.dueDate;
      return eff && eff < today && a.status !== "Completed" && a.status !== "Cancelled";
    }
    if (actionFilter === "inprogress") return a.status === "In Progress";
    return true;
  }).slice(0, 8);

  const activeProjects = projects.filter(p => p.status !== "Completed").slice(0, 6);

  const handleDashboardPrint = () => {
    document.body.classList.add("printing-dashboard");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-dashboard"), 1000);
  };

  if (statsLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 h-full overflow-auto">
        <div className="h-20 bg-muted/40 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-muted/40 rounded-lg animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 h-80 bg-muted/40 rounded-xl animate-pulse" />
          <div className="lg:col-span-3 space-y-4">
            <div className="h-48 bg-muted/40 rounded-xl animate-pulse" />
            <div className="h-28 bg-muted/40 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="p-4 md:p-6 space-y-4 max-w-screen-2xl mx-auto w-full">

        {/* ═══ Banner ═══ */}
        <div
          className="relative rounded-xl border overflow-hidden px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
          data-testid="card-welcome-banner"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.07) 0%, hsl(var(--background)) 60%)" }}
        >
          <div className="pointer-events-none absolute -top-8 -left-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="min-w-0 relative">
            <h1 className="text-xl font-bold tracking-tight" data-testid="text-welcome-title">
              Welcome back, <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{user?.name?.split(" ")[0] || "there"}</span> 👋
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3 shrink-0" />
              <span data-testid="text-today-date">{formattedDate}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/kpis">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all hover:scale-105 ${
                pctOnTrack >= 80 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" :
                pctOnTrack >= 50 ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" :
                "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
              }`}>
                <Target className="h-3 w-3" />{stats?.onTrack || 0}/{stats?.totalKpis || 0} KPIs on track
              </span>
            </Link>
            {(stats?.overdueActions || 0) > 0 && (
              <Link href="/actions">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 cursor-pointer hover:scale-105 transition-all">
                  <AlertTriangle className="h-3 w-3" />{stats?.overdueActions} overdue
                </span>
              </Link>
            )}
            {(portfolioStats?.active || 0) > 0 && (
              <Link href="/portfolio">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:scale-105 transition-all">
                  <Briefcase className="h-3 w-3" />{portfolioStats?.active} active projects
                </span>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0 relative">
            <button onClick={handleDashboardPrint} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-2.5 py-1.5 hover:bg-muted/50 transition-colors" data-testid="button-export-dashboard">
              <Printer className="h-3.5 w-3.5" /><span className="hidden sm:inline">Export</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shrink-0">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold leading-none" data-testid="text-company-name">{companyName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{companyData?.industry || "Business"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Stat tiles ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="grid-stat-cards">
          {statCards.map(s => <StatTile key={s.title} {...s} />)}
        </div>

        {/* ═══ Main widget grid — row 1 ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Needs Attention — left, tall */}
          <div className="lg:col-span-2 h-[420px] lg:h-[480px]" data-testid="section-todays-focus">
            <WidgetCard accentClass="bg-gradient-to-r from-amber-500 via-orange-400 to-transparent">
              <WidgetHeader
                icon={Zap} iconBg="bg-amber-500/10" iconColor="text-amber-500"
                right={focusCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">{focusCount}</span>
                )}
              >Needs Attention</WidgetHeader>
              <div className="px-4 pb-2 shrink-0">
                <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5 w-fit flex-wrap">
                  <button className={tabCls(attentionTab === "all")} onClick={() => setAttentionTab("all")} data-testid="tab-attention-all">All</button>
                  <button className={tabCls(attentionTab === "actions")} onClick={() => setAttentionTab("actions")} data-testid="tab-attention-actions">
                    Actions{overdueActions.length > 0 && <span className="ml-1 text-red-500">({overdueActions.length})</span>}
                  </button>
                  <button className={tabCls(attentionTab === "kpis")} onClick={() => setAttentionTab("kpis")} data-testid="tab-attention-kpis">
                    KPIs{atRiskKpis.length > 0 && <span className="ml-1 text-amber-500">({atRiskKpis.length})</span>}
                  </button>
                  <button className={tabCls(attentionTab === "milestones")} onClick={() => setAttentionTab("milestones")} data-testid="tab-attention-milestones">
                    Due{upcomingMilestones.length > 0 && <span className="ml-1 text-violet-500">({upcomingMilestones.length})</span>}
                  </button>
                </div>
              </div>
              <CardContent className="px-4 pb-3 pt-0 flex-1 overflow-y-auto">
                {focusCount === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {showActions && overdueActions.slice(0, attentionTab === "actions" ? 12 : 3).map(a => {
                      const eff = a.revisedDueDate || a.dueDate || "";
                      const daysOver = eff ? Math.floor((Date.now() - new Date(eff).getTime()) / 86400000) : 0;
                      return (
                        <Link key={`oa-${a.id}`} href="/actions">
                          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-red-500/5 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all cursor-pointer group" data-testid={`focus-action-${a.id}`}>
                            <span className="text-[9px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 px-1.5 py-0.5 rounded shrink-0 w-[44px] text-center">Action</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate group-hover:text-red-600 transition-colors">{a.title}</p>
                              <p className="text-[10px] text-muted-foreground">{a.ownerName || "Unassigned"}</p>
                            </div>
                            <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded shrink-0">{daysOver}d late</span>
                          </div>
                        </Link>
                      );
                    })}
                    {showKpis && atRiskKpis.slice(0, attentionTab === "kpis" ? 12 : 3).map(a => (
                      <Link key={`kpi-${a.kpiId}`} href="/kpis">
                        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-amber-500/5 border border-transparent hover:border-amber-200 dark:hover:border-amber-900/30 transition-all cursor-pointer group" data-testid={`focus-kpi-${a.kpiId}`}>
                          <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 px-1.5 py-0.5 rounded shrink-0 w-[44px] text-center">KPI</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate group-hover:text-amber-600 transition-colors">{a.kpiName}</p>
                            <p className="text-[10px] text-muted-foreground">Actual: {a.actualValue}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${a.status === "Below Target" ? "text-red-600 bg-red-500/10" : "text-amber-600 bg-amber-500/10"}`}>
                            {a.status === "Below Target" ? "Below" : "At Risk"}
                          </span>
                        </div>
                      </Link>
                    ))}
                    {showMilestones && upcomingMilestones.slice(0, attentionTab === "milestones" ? 12 : 3).map(m => {
                      const daysLeft = m.dueDate ? Math.ceil((new Date(m.dueDate).getTime() - Date.now()) / 86400000) : 0;
                      return (
                        <Link key={`ms-${m.id}`} href="/portfolio">
                          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-violet-500/5 border border-transparent hover:border-violet-200 dark:hover:border-violet-900/30 transition-all cursor-pointer group" data-testid={`focus-milestone-${m.id}`}>
                            <span className="text-[9px] font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 px-1.5 py-0.5 rounded shrink-0 w-[44px] text-center">Due</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate group-hover:text-violet-600 transition-colors">{m.title}</p>
                              <p className="text-[10px] text-muted-foreground">{m.dueDate ? `${m.dueDate.split("-")[2]}-${m.dueDate.split("-")[1]}-${m.dueDate.split("-")[0]}` : ""}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${daysLeft <= 1 ? "text-red-600 bg-red-500/10" : daysLeft <= 3 ? "text-amber-600 bg-amber-500/10" : "text-violet-600 bg-violet-500/10"}`}>
                              {daysLeft <= 0 ? "today" : `${daysLeft}d`}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </WidgetCard>
          </div>

          {/* Right side: chart + project health stacked */}
          <div className="lg:col-span-3 flex flex-col gap-4">

            {/* Analytics chart */}
            <div className="h-[220px] md:h-[240px]" data-testid="card-analytics">
              <WidgetCard accentClass={chartTab === "kpi" ? "bg-gradient-to-r from-primary to-primary/40" : "bg-gradient-to-r from-blue-500 to-blue-400/40"}>
                <WidgetHeader
                  icon={chartTab === "kpi" ? Activity : BarChart3}
                  iconBg={chartTab === "kpi" ? "bg-primary/10" : "bg-blue-500/10"}
                  iconColor={chartTab === "kpi" ? "text-primary" : "text-blue-600"}
                  right={
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5">
                        <button className={tabCls(chartTab === "kpi")} onClick={() => setChartTab("kpi")} data-testid="tab-chart-kpi">KPI</button>
                        <button className={tabCls(chartTab === "actions")} onClick={() => setChartTab("actions")} data-testid="tab-chart-actions">Actions</button>
                      </div>
                      <Link href={chartTab === "kpi" ? "/kpis" : "/actions"}>
                        <span className="text-[10px] font-medium text-primary hover:underline">View →</span>
                      </Link>
                    </div>
                  }
                >{chartTab === "kpi" ? "KPI Health" : "Action Status"}</WidgetHeader>
                <CardContent className="px-4 pb-3 pt-0 flex-1 min-h-0">
                  {chartTab === "kpi" ? (
                    kpiStatusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={kpiStatusData} cx="50%" cy="45%" innerRadius="32%" outerRadius="55%" paddingAngle={3} dataKey="value" stroke="none" label={({ value }) => value} labelLine={false}>
                            {kpiStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "11px" }} formatter={(v: number, n: string) => [`${v} KPIs`, n]} />
                          <Legend verticalAlign="bottom" height={24} iconType="circle" iconSize={7} formatter={(v: string) => <span className="text-[10px] text-foreground">{v}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No KPI data yet</div>
                  ) : (
                    actionChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={actionChartData} barSize={36}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={20} />
                          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "11px" }} formatter={(v: number) => [`${v} actions`]} />
                          <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                            <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: "currentColor", fontWeight: 700 }} />
                            {actionChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No action data yet</div>
                  )}
                </CardContent>
              </WidgetCard>
            </div>

            {/* Project Health */}
            <div className="flex-1 min-h-[200px]" data-testid="card-project-health">
              <WidgetCard accentClass="bg-gradient-to-r from-violet-500 to-violet-400/40">
                <WidgetHeader
                  icon={Briefcase} iconBg="bg-violet-500/10" iconColor="text-violet-600"
                  right={<Link href="/portfolio"><span className="text-[10px] font-medium text-primary hover:underline">View all →</span></Link>}
                >Project Health</WidgetHeader>
                <CardContent className="px-4 pb-3 pt-0 flex-1 overflow-y-auto">
                  {activeProjects.length === 0
                    ? <p className="text-xs text-muted-foreground py-4 text-center">No active projects</p>
                    : (
                      <div className="space-y-2">
                        {activeProjects.map(p => {
                          const pct = p.progress ?? 0;
                          const hc = p.health === "Red" ? "bg-red-500" : p.health === "Amber" ? "bg-amber-500" : "bg-emerald-500";
                          return (
                            <Link key={p.id} href={`/projects/${p.id}`}>
                              <div className="group flex items-center gap-2.5 hover:bg-muted/30 rounded-lg px-2 py-2 transition-colors cursor-pointer">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${hc}`} />
                                <span className="text-xs font-medium flex-1 truncate">{p.name}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${hc}`} style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-[10px] font-semibold text-muted-foreground w-7 text-right">{pct}%</span>
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                </CardContent>
              </WidgetCard>
            </div>
          </div>
        </div>

        {/* ═══ Main widget grid — row 2 ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Recent Actions */}
          <div className="h-[340px]" data-testid="card-recent-actions">
            <WidgetCard accentClass="bg-gradient-to-r from-blue-500 to-blue-400/40">
              <WidgetHeader
                icon={ListChecks} iconBg="bg-blue-500/10" iconColor="text-blue-600"
                right={<Link href="/actions"><span className="text-[10px] font-medium text-primary hover:underline">View all →</span></Link>}
              >Recent Actions</WidgetHeader>
              <div className="px-4 pb-2 shrink-0">
                <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5 w-fit">
                  <button className={tabCls(actionFilter === "all")} onClick={() => setActionFilter("all")}>All</button>
                  <button className={tabCls(actionFilter === "overdue")} onClick={() => setActionFilter("overdue")}>
                    Overdue{overdueActions.length > 0 && <span className="ml-1 text-red-500">({overdueActions.length})</span>}
                  </button>
                  <button className={tabCls(actionFilter === "inprogress")} onClick={() => setActionFilter("inprogress")}>In Progress</button>
                </div>
              </div>
              <CardContent className="px-4 pb-3 pt-0 flex-1 overflow-y-auto">
                {filteredActions.length === 0
                  ? <p className="text-sm text-muted-foreground py-6 text-center">No actions</p>
                  : (
                    <div className="space-y-0.5">
                      {filteredActions.map(action => {
                        const eff = action.revisedDueDate || action.dueDate;
                        const isOverdue = eff && eff < today && action.status !== "Completed" && action.status !== "Cancelled";
                        return (
                          <Link key={action.id} href="/actions">
                            <div className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all group ${isOverdue ? "hover:bg-red-500/5" : "hover:bg-muted/50"}`}>
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${action.status === "Completed" ? "bg-emerald-500" : isOverdue ? "bg-red-500" : action.status === "In Progress" ? "bg-blue-500" : "bg-muted-foreground/40"}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{action.title}</p>
                                <p className="text-[10px] text-muted-foreground">{action.ownerName || "Unassigned"}</p>
                              </div>
                              <StatusBadge status={action.status} />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
              </CardContent>
            </WidgetCard>
          </div>

          {/* Department Pulse */}
          <div className="h-[340px]" data-testid="card-department-summary">
            <WidgetCard accentClass="bg-gradient-to-r from-emerald-500 to-emerald-400/40">
              <WidgetHeader icon={Building2} iconBg="bg-emerald-500/10" iconColor="text-emerald-600">Department Pulse</WidgetHeader>
              <CardContent className="px-4 pb-3 pt-0 flex-1 overflow-y-auto">
                {deptSummary.length === 0
                  ? <p className="text-sm text-muted-foreground py-4 text-center">No departments yet</p>
                  : (
                    <div className="space-y-2.5">
                      {deptSummary.map(dept => {
                        const overallHealth = dept.overdueCount > 0 || dept.kpiRed > 0 ? "red" : dept.kpiAmber > 0 || dept.amberProjects > 0 ? "amber" : "green";
                        return (
                          <div key={dept.id} className="rounded-lg border bg-muted/20 p-2.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold">{dept.name}</span>
                              <div className={`w-2 h-2 rounded-full ${overallHealth === "red" ? "bg-red-500" : overallHealth === "amber" ? "bg-amber-500" : "bg-emerald-500"}`} />
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                              <div className="rounded bg-background border px-1.5 py-1">
                                <p className="text-muted-foreground font-medium mb-0.5">KPIs</p>
                                <div className="flex items-center gap-1 flex-wrap">
                                  {dept.kpiGreen > 0 && <span className="flex items-center gap-0.5 text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{dept.kpiGreen}</span>}
                                  {dept.kpiAmber > 0 && <span className="flex items-center gap-0.5 text-amber-600"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />{dept.kpiAmber}</span>}
                                  {dept.kpiRed > 0 && <span className="flex items-center gap-0.5 text-red-600"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />{dept.kpiRed}</span>}
                                  {dept.kpiNoData > 0 && <span className="text-muted-foreground">{dept.kpiNoData} N/A</span>}
                                  {dept.kpiCount === 0 && <span className="text-muted-foreground">—</span>}
                                </div>
                              </div>
                              <div className="rounded bg-background border px-1.5 py-1">
                                <p className="text-muted-foreground font-medium mb-0.5">Projects</p>
                                {dept.activeProjectCount === 0 ? <span className="text-muted-foreground">—</span> : (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-foreground font-semibold">{dept.activeProjectCount} active</span>
                                    {dept.redProjects > 0 && <span className="text-red-600">{dept.redProjects} red</span>}
                                    {dept.amberProjects > 0 && !dept.redProjects && <span className="text-amber-600">{dept.amberProjects} amber</span>}
                                  </div>
                                )}
                              </div>
                              <div className="rounded bg-background border px-1.5 py-1">
                                <p className="text-muted-foreground font-medium mb-0.5">Actions</p>
                                {dept.actionCount === 0 ? <span className="text-muted-foreground">—</span> : (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-foreground font-semibold">{dept.activeActions} active</span>
                                    {dept.overdueCount > 0 && <span className="text-red-600 font-bold">{dept.overdueCount} overdue</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </CardContent>
            </WidgetCard>
          </div>

          {/* Latest Review */}
          <div className="h-[340px]" data-testid="card-latest-review">
            <WidgetCard accentClass="bg-gradient-to-r from-violet-500 to-violet-400/40">
              <WidgetHeader
                icon={ArrowUpRight} iconBg="bg-violet-500/10" iconColor="text-violet-600"
                right={
                  <div className="flex items-center gap-1.5">
                    {latestReview && <Badge variant="secondary" className="text-[10px]">{latestReview.reviewMonth}</Badge>}
                    <Link href="/reviews"><span className="text-[10px] font-medium text-primary hover:underline">View →</span></Link>
                  </div>
                }
              >Latest Review</WidgetHeader>
              <CardContent className="px-4 pb-4 pt-0 flex-1 overflow-y-auto">
                {latestReview ? (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-muted/30 border">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1 text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />Executive Summary
                      </p>
                      {latestReview.overallSummary?.split("\n").filter(l => l.trim()).slice(0, 3).map((para, i) => (
                        <p key={i} className="text-xs text-muted-foreground leading-relaxed mb-1 last:mb-0">{para}</p>
                      ))}
                    </div>
                    {latestReview.strengths && (
                      <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-2.5">
                        <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />Strengths
                        </p>
                        {latestReview.strengths.split("\n").filter(l => l.trim()).slice(0, 2).map((line, i) => (
                          <div key={i} className="flex items-start gap-1.5 py-0.5">
                            <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                            <span className="text-xs text-muted-foreground leading-relaxed">{line.replace(/^[-•]\s*/, "")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {latestReview.gaps && (
                      <div className="rounded-lg bg-red-500/5 border border-red-500/15 p-2.5">
                        <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />Gaps
                        </p>
                        {latestReview.gaps.split("\n").filter(l => l.trim()).slice(0, 2).map((line, i) => (
                          <div key={i} className="flex items-start gap-1.5 py-0.5">
                            <span className="text-red-400 mt-0.5 shrink-0">•</span>
                            <span className="text-xs text-muted-foreground leading-relaxed">{line.replace(/^[-•]\s*/, "")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Layers className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No reviews generated yet</p>
                    <Link href="/reviews"><span className="text-xs text-primary hover:underline mt-1">Generate one →</span></Link>
                  </div>
                )}
              </CardContent>
            </WidgetCard>
          </div>
        </div>

      </div>
    </div>
  );
}
