import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import {
  Target, ListChecks, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, ArrowUpRight, BarChart3,
  Activity, CalendarDays, Building2, FolderOpen,
  Briefcase, ChevronRight, Zap, Clock, Printer, Layers,
  AlertCircle, Lightbulb, MessageSquare, Flag, Milestone,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import type {
  ActionItem, MonthlyReview, Department, Kpi, Company, Milestone as MilestoneType, Project, KpiActual,
} from "@shared/schema";

/* ─── animated counter hook ─── */
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

/* ─── animated stat tile ─── */
function StatTile({ title, value, icon: Icon, iconBg, iconColor, topBar, accent, pct, pctLabel, link }: {
  title: string; value: number; icon: React.ElementType;
  iconBg: string; iconColor: string; topBar: string; accent: string;
  pct?: number | null; pctLabel?: string; link: string;
}) {
  const animated = useCountUp(value);
  return (
    <Link href={link} data-testid={`link-stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="relative rounded-xl border bg-card cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group h-full overflow-hidden">
        <div className={`absolute top-0 inset-x-0 h-[3px] ${topBar}`} />
        <div className="p-3 pt-4">
          <div className="flex items-center justify-between gap-1 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 group-hover:text-muted-foreground transition-colors leading-none">{title}</p>
            <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${iconBg} shrink-0`}>
              <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
            </div>
          </div>
          <p className={`text-2xl font-black tabular-nums leading-none tracking-tight ${accent}`}
             data-testid={`text-stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
            {animated}
          </p>
          {pct !== null && pct !== undefined && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
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

export default function DashboardPage() {
  const { user } = useAuth();

  /* ─── data queries ─── */
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
    total: number; active: number; completed: number; atRisk: number; overdueTasks: number; upcomingMilestones: number;
  }>({ queryKey: ["/api/portfolio/stats"] });
  const { data: projects = [] } = useQuery<(Project & { health: string; taskCount: number; completedTaskCount: number })[]>({ queryKey: ["/api/projects"] });
  const { data: milestones = [] } = useQuery<MilestoneType[]>({ queryKey: ["/api/milestones"] });
  const { data: allActuals = [] } = useQuery<(KpiActual & { kpiName: string })[]>({ queryKey: ["/api/kpi-actuals/company"] });

  /* ─── derived values ─── */
  const today = new Date().toISOString().split("T")[0];
  const latestReview = reviews?.[0];

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

  const companyName = companyData?.companyName || "Your Company";
  const formattedDate = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const deptSummary = (departments || []).map(dept => {
    const deptKpis = (kpis || []).filter(k => k.departmentId === dept.id);
    const deptActions = (actions || []).filter(a => a.departmentId === dept.id);
    const overdue = deptActions.filter(a => {
      const eff = a.revisedDueDate || a.dueDate;
      return eff && eff < today && a.status !== "Completed" && a.status !== "Cancelled";
    });
    return { id: dept.id, name: dept.name, kpiCount: deptKpis.length, actionCount: deptActions.length, overdueCount: overdue.length };
  }).filter(d => d.kpiCount > 0 || d.actionCount > 0);

  const pctOnTrack = stats && stats.totalKpis > 0 ? Math.round((stats.onTrack / stats.totalKpis) * 100) : 0;
  const pctCompleted = stats && stats.totalActions > 0 ? Math.round((stats.completedActions / stats.totalActions) * 100) : 0;
  const pctOverdue = stats && stats.totalActions > 0 ? Math.round((stats.overdueActions / stats.totalActions) * 100) : 0;
  const hasKpis = (stats?.totalKpis || 0) > 0;

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
  ];
  const actionGroup = [
    { title: "Total Actions", value: stats?.totalActions || 0, icon: ListChecks, iconBg: "bg-blue-500/10", iconColor: "text-blue-600", topBar: "bg-gradient-to-r from-blue-500 to-blue-400", pct: pctCompleted, pctLabel: "done", link: "/actions", accent: "text-blue-600" },
    { title: "Overdue", value: stats?.overdueActions || 0, icon: AlertTriangle, iconBg: "bg-orange-500/10", iconColor: "text-orange-500", topBar: "bg-gradient-to-r from-orange-500 to-amber-400", pct: pctOverdue, pctLabel: "of total", link: "/actions", accent: "text-orange-500" },
    { title: "Completed", value: stats?.completedActions || 0, icon: TrendingUp, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600", topBar: "bg-gradient-to-r from-emerald-500 to-emerald-400", link: "/actions", accent: "text-emerald-600" },
  ];
  const statCards = hasKpis ? [...kpiGroup, ...actionGroup] : [...projectGroup, ...actionGroup];

  /* ─── interactive state ─── */
  const [attentionTab, setAttentionTab] = useState<"all" | "actions" | "kpis" | "milestones">("all");
  const [chartTab, setChartTab] = useState<"kpi" | "actions">("kpi");
  const [actionFilter, setActionFilter] = useState<"all" | "overdue" | "inprogress">("all");

  const focusCount = overdueActions.length + atRiskKpis.length + upcomingMilestones.length;

  /* ─── attention items filtered by tab ─── */
  const showActions = attentionTab === "all" || attentionTab === "actions";
  const showKpis = attentionTab === "all" || attentionTab === "kpis";
  const showMilestones = attentionTab === "all" || attentionTab === "milestones";
  const attentionItems =
    (showActions ? overdueActions.slice(0, attentionTab === "actions" ? 8 : 3) : []).length +
    (showKpis ? atRiskKpis.slice(0, attentionTab === "kpis" ? 8 : 3) : []).length +
    (showMilestones ? upcomingMilestones.slice(0, attentionTab === "milestones" ? 8 : 3) : []).length;

  /* ─── recent actions filtered ─── */
  const filteredActions = (actions || []).filter(a => {
    if (actionFilter === "overdue") {
      const eff = a.revisedDueDate || a.dueDate;
      return eff && eff < today && a.status !== "Completed" && a.status !== "Cancelled";
    }
    if (actionFilter === "inprogress") return a.status === "In Progress";
    return true;
  }).slice(0, 7);

  /* ─── active projects with health ─── */
  const activeProjects = projects.filter(p => p.status !== "Completed").slice(0, 5);

  const handleDashboardPrint = () => {
    document.body.classList.add("printing-dashboard");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-dashboard"), 1000);
  };

  if (statsLoading) {
    return (
      <div className="p-4 space-y-4 h-full overflow-auto">
        <div className="h-20 bg-muted/40 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-muted/40 rounded-lg animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="h-52 bg-muted/40 rounded-lg animate-pulse" />
          <div className="h-52 bg-muted/40 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const attentionTabCls = (t: typeof attentionTab) =>
    `px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
      attentionTab === t
        ? "bg-background text-foreground shadow-sm border border-border"
        : "text-muted-foreground hover:text-foreground"
    }`;

  const chartTabCls = (t: typeof chartTab) =>
    `px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
      chartTab === t
        ? "bg-background text-foreground shadow-sm border border-border"
        : "text-muted-foreground hover:text-foreground"
    }`;

  const actionFilterCls = (f: typeof actionFilter) =>
    `px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
      actionFilter === f
        ? "bg-background text-foreground shadow-sm border border-border"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-3 max-w-screen-2xl mx-auto">

        {/* ═══ ROW 1 — Hero Banner ═══ */}
        <div
          className="relative rounded-xl border overflow-hidden px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
          data-testid="card-welcome-banner"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.07) 0%, hsl(var(--background)) 60%)" }}
        >
          <div className="pointer-events-none absolute -top-8 -left-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

          <div className="min-w-0 relative">
            <h1 className="text-xl font-bold tracking-tight truncate" data-testid="text-welcome-title">
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
                pctOnTrack >= 80
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15"
                  : pctOnTrack >= 50
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/15"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/15"
              }`}>
                <Target className="h-3 w-3" />
                {stats?.onTrack || 0}/{stats?.totalKpis || 0} KPIs on track
              </span>
            </Link>
            {(stats?.overdueActions || 0) > 0 && (
              <Link href="/actions">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 cursor-pointer hover:bg-red-500/15 hover:scale-105 transition-all">
                  <AlertTriangle className="h-3 w-3" />
                  {stats?.overdueActions} overdue
                </span>
              </Link>
            )}
            {(portfolioStats?.active || 0) > 0 && (
              <Link href="/portfolio">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:bg-primary/15 hover:scale-105 transition-all">
                  <Briefcase className="h-3 w-3" />
                  {portfolioStats?.active} active projects
                </span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 relative">
            <button
              onClick={handleDashboardPrint}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-2.5 py-1.5 hover:bg-muted/50 transition-colors"
              data-testid="button-export-dashboard"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
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

        {/* ═══ ROW 2 — 6 animated stat tiles ═══ */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3" data-testid="grid-stat-cards">
          {statCards.map(s => (
            <StatTile key={s.title} {...s} />
          ))}
        </div>

        {/* ═══ ROW 3 — Needs Attention (2 col) + Chart + Project Health (3 col) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">

          {/* ── Needs Attention ── */}
          <Card className="lg:col-span-2 overflow-hidden flex flex-col" data-testid="section-todays-focus">
            <div className="h-[3px] bg-gradient-to-r from-amber-500 via-orange-400 to-transparent" />
            <CardHeader className="pb-0 pt-3 px-4 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  Needs Attention
                  {focusCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">{focusCount}</span>
                  )}
                </CardTitle>
              </div>
              {/* filter tabs */}
              <div className="flex items-center gap-0.5 mt-2 bg-muted/40 rounded-lg p-0.5 w-fit">
                <button className={attentionTabCls("all")} onClick={() => setAttentionTab("all")} data-testid="tab-attention-all">
                  All {focusCount > 0 && <span className="ml-1 opacity-60">({focusCount})</span>}
                </button>
                <button className={attentionTabCls("actions")} onClick={() => setAttentionTab("actions")} data-testid="tab-attention-actions">
                  Actions {overdueActions.length > 0 && <span className="ml-1 text-red-500">({overdueActions.length})</span>}
                </button>
                <button className={attentionTabCls("kpis")} onClick={() => setAttentionTab("kpis")} data-testid="tab-attention-kpis">
                  KPIs {atRiskKpis.length > 0 && <span className="ml-1 text-amber-500">({atRiskKpis.length})</span>}
                </button>
                <button className={attentionTabCls("milestones")} onClick={() => setAttentionTab("milestones")} data-testid="tab-attention-milestones">
                  Due {upcomingMilestones.length > 0 && <span className="ml-1 text-violet-500">({upcomingMilestones.length})</span>}
                </button>
              </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 pt-2 flex-1 overflow-y-auto max-h-[320px]">
              {focusCount === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">You're all caught up!</p>
                  <p className="text-xs text-muted-foreground">Nothing urgent needs your attention.</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {showActions && overdueActions.slice(0, attentionTab === "actions" ? 10 : 3).map(a => {
                    const eff = a.revisedDueDate || a.dueDate || "";
                    const daysOver = eff ? Math.floor((Date.now() - new Date(eff).getTime()) / 86400000) : 0;
                    return (
                      <Link key={`oa-${a.id}`} href="/actions">
                        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-red-500/5 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all cursor-pointer group" data-testid={`focus-action-${a.id}`}>
                          <span className="text-[9px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded shrink-0 w-[46px] text-center">Action</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{a.title}</p>
                            <p className="text-[10px] text-muted-foreground">{a.ownerName || "Unassigned"}</p>
                          </div>
                          <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded shrink-0">{daysOver}d late</span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                  {showKpis && atRiskKpis.slice(0, attentionTab === "kpis" ? 10 : 3).map(a => (
                    <Link key={`kpi-${a.kpiId}`} href="/kpis">
                      <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-amber-500/5 border border-transparent hover:border-amber-200 dark:hover:border-amber-900/30 transition-all cursor-pointer group" data-testid={`focus-kpi-${a.kpiId}`}>
                        <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded shrink-0 w-[46px] text-center">KPI</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{a.kpiName}</p>
                          <p className="text-[10px] text-muted-foreground">Actual: {a.actualValue}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          a.status === "Below Target" ? "text-red-600 bg-red-500/10" : "text-amber-600 bg-amber-500/10"
                        }`}>{a.status === "Below Target" ? "Below" : "At Risk"}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                      </div>
                    </Link>
                  ))}
                  {showMilestones && upcomingMilestones.slice(0, attentionTab === "milestones" ? 10 : 3).map(m => {
                    const daysLeft = m.dueDate ? Math.ceil((new Date(m.dueDate).getTime() - Date.now()) / 86400000) : 0;
                    return (
                      <Link key={`ms-${m.id}`} href="/portfolio">
                        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-violet-500/5 border border-transparent hover:border-violet-200 dark:hover:border-violet-900/30 transition-all cursor-pointer group" data-testid={`focus-milestone-${m.id}`}>
                          <span className="text-[9px] font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 px-1.5 py-0.5 rounded shrink-0 w-[46px] text-center">Due</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{m.title}</p>
                            <p className="text-[10px] text-muted-foreground">{m.dueDate ? `${m.dueDate.split("-")[2]}-${m.dueDate.split("-")[1]}-${m.dueDate.split("-")[0]}` : ""}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            daysLeft <= 1 ? "text-red-600 bg-red-500/10" : daysLeft <= 3 ? "text-amber-600 bg-amber-500/10" : "text-violet-600 bg-violet-500/10"
                          }`}>{daysLeft <= 0 ? "today" : `${daysLeft}d`}</span>
                          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Chart + Project Health (3 of 5) ── */}
          <div className="lg:col-span-3 grid grid-rows-[auto_1fr] gap-3">

            {/* Tabbed chart */}
            <Card className="overflow-hidden" data-testid="card-analytics">
              <div className={`h-[3px] ${chartTab === "kpi" ? "bg-gradient-to-r from-primary to-primary/40" : "bg-gradient-to-r from-blue-500 to-blue-400/40"}`} />
              <CardHeader className="pb-0 pt-3 px-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                    <div className={`flex h-5 w-5 items-center justify-center rounded-md ${chartTab === "kpi" ? "bg-primary/10" : "bg-blue-500/10"}`}>
                      {chartTab === "kpi"
                        ? <Activity className="h-3 w-3 text-primary" />
                        : <BarChart3 className="h-3 w-3 text-blue-600" />
                      }
                    </div>
                    {chartTab === "kpi" ? "KPI Health" : "Action Status"}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5">
                      <button className={chartTabCls("kpi")} onClick={() => setChartTab("kpi")} data-testid="tab-chart-kpi">KPI Health</button>
                      <button className={chartTabCls("actions")} onClick={() => setChartTab("actions")} data-testid="tab-chart-actions">Actions</button>
                    </div>
                    <Link href={chartTab === "kpi" ? "/kpis" : "/actions"}>
                      <span className="text-[10px] font-medium text-primary hover:underline">View →</span>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-1">
                {chartTab === "kpi" ? (
                  kpiStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={130}>
                      <PieChart>
                        <Pie data={kpiStatusData} cx="50%" cy="50%" innerRadius={42} outerRadius={58} paddingAngle={3} dataKey="value" stroke="none">
                          {kpiStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "11px" }} formatter={(v: number, n: string) => [`${v} KPIs`, n]} />
                        <Legend verticalAlign="bottom" height={28} iconType="circle" iconSize={7} formatter={(v: string) => <span className="text-[10px] text-foreground">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[130px] flex items-center justify-center text-xs text-muted-foreground">No KPI data yet</div>
                  )
                ) : (
                  actionChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={130}>
                      <BarChart data={actionChartData} barSize={36}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={20} />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "11px" }} formatter={(v: number) => [`${v} actions`]} />
                        <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                          {actionChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[130px] flex items-center justify-center text-xs text-muted-foreground">No action data yet</div>
                  )
                )}
              </CardContent>
            </Card>

            {/* Active Projects health strip */}
            <Card className="overflow-hidden" data-testid="card-project-health">
              <div className="h-[3px] bg-gradient-to-r from-violet-500 to-violet-400/40" />
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-bold flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-500/10">
                      <Briefcase className="h-3 w-3 text-violet-600" />
                    </div>
                    Project Health
                  </span>
                  <Link href="/portfolio"><span className="text-[10px] font-medium text-primary hover:underline">View all →</span></Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                {activeProjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No active projects</p>
                ) : (
                  <div className="space-y-2">
                    {activeProjects.map(p => {
                      const pct = p.progress ?? 0;
                      const healthColor = p.health === "Red" ? "bg-red-500" : p.health === "Amber" ? "bg-amber-500" : "bg-emerald-500";
                      const barColor = p.health === "Red" ? "bg-red-500" : p.health === "Amber" ? "bg-amber-500" : "bg-emerald-500";
                      return (
                        <Link key={p.id} href={`/projects/${p.id}`} data-testid={`dashboard-project-${p.id}`}>
                          <div className="group flex items-center gap-2.5 hover:bg-muted/30 rounded-lg px-1.5 py-1 transition-colors cursor-pointer">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${healthColor}`} title={`Health: ${p.health}`} />
                            <span className="text-xs font-medium flex-1 truncate group-hover:text-primary transition-colors">{p.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] font-semibold text-muted-foreground w-8 text-right">{pct}%</span>
                            </div>
                            <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ═══ ROW 4 — Recent Actions | Department Pulse | Latest Review ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* Recent Actions with filter tabs */}
          <Card className="overflow-hidden" data-testid="card-recent-actions">
            <div className="h-[3px] bg-gradient-to-r from-blue-500 to-blue-400/40" />
            <CardHeader className="pb-1 pt-3.5 px-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10">
                    <ListChecks className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  Recent Actions
                </CardTitle>
                <Link href="/actions"><span className="text-xs font-medium text-primary hover:underline">View all →</span></Link>
              </div>
              <div className="flex items-center gap-0.5 mt-1.5 bg-muted/40 rounded-lg p-0.5 w-fit">
                <button className={actionFilterCls("all")} onClick={() => setActionFilter("all")} data-testid="tab-actions-all">All</button>
                <button className={actionFilterCls("overdue")} onClick={() => setActionFilter("overdue")} data-testid="tab-actions-overdue">
                  Overdue {overdueActions.length > 0 && <span className="ml-0.5 text-red-500">({overdueActions.length})</span>}
                </button>
                <button className={actionFilterCls("inprogress")} onClick={() => setActionFilter("inprogress")} data-testid="tab-actions-inprogress">In Progress</button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1">
              {filteredActions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No actions</p>
              ) : (
                <div className="space-y-0.5">
                  {filteredActions.map(action => {
                    const eff = action.revisedDueDate || action.dueDate;
                    const isOverdue = eff && eff < today && action.status !== "Completed" && action.status !== "Cancelled";
                    return (
                      <Link key={action.id} href="/actions">
                        <div className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer hover:shadow-sm transition-all group ${isOverdue ? "hover:bg-red-500/5" : "hover:bg-muted/50"}`} data-testid={`card-action-${action.id}`}>
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            action.status === "Completed" ? "bg-emerald-500" :
                            isOverdue ? "bg-red-500" :
                            action.status === "In Progress" ? "bg-blue-500" : "bg-muted-foreground/40"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate group-hover:text-primary transition-colors" data-testid={`text-action-title-${action.id}`}>{action.title}</p>
                            <p className="text-[10px] text-muted-foreground">{action.ownerName || "Unassigned"}{eff ? ` · ${eff}` : ""}</p>
                          </div>
                          <StatusBadge status={action.status} testId={`badge-action-status-${action.id}`} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Department Pulse */}
          <Card className="overflow-hidden" data-testid="card-department-summary">
            <div className="h-[3px] bg-gradient-to-r from-emerald-500 to-emerald-400/40" />
            <CardHeader className="pb-2 pt-3.5 px-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                Department Pulse
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {deptSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No departments yet</p>
              ) : (
                <div className="space-y-2.5">
                  {deptSummary.map(dept => {
                    const totalItems = dept.actionCount || 1;
                    const overdueRatio = dept.overdueCount / totalItems;
                    const healthPct = Math.max(8, dept.overdueCount > 0 ? overdueRatio * 100 : 100);
                    return (
                      <div key={dept.id} className="space-y-1" data-testid={`row-department-${dept.id}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold" data-testid={`text-dept-name-${dept.id}`}>{dept.name}</span>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span data-testid={`text-dept-kpis-${dept.id}`}>{dept.kpiCount} KPIs</span>
                            <span data-testid={`text-dept-actions-${dept.id}`}>{dept.actionCount} actions</span>
                            {dept.overdueCount > 0 && (
                              <span className="text-red-500 font-bold" data-testid={`text-dept-overdue-${dept.id}`}>{dept.overdueCount} late</span>
                            )}
                          </div>
                        </div>
                        <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${overdueRatio > 0.3 ? "bg-red-500" : overdueRatio > 0 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${healthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Latest Review */}
          <Card className="overflow-hidden" data-testid="card-latest-review">
            <div className="h-[3px] bg-gradient-to-r from-violet-500 to-violet-400/40" />
            <CardHeader className="pb-2 pt-3.5 px-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/10">
                    <ArrowUpRight className="h-3.5 w-3.5 text-violet-600" />
                  </div>
                  Latest Review
                </CardTitle>
                <div className="flex items-center gap-2">
                  {latestReview && <Badge variant="secondary" className="text-[10px]" data-testid="badge-review-month">{latestReview.reviewMonth}</Badge>}
                  <Link href="/reviews"><span className="text-xs font-medium text-primary hover:underline">View →</span></Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {latestReview ? (
                <div className="overflow-y-auto max-h-64 space-y-2.5 pr-0.5">
                  <div className="p-2.5 rounded-lg bg-muted/30 border">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1 text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />Executive Summary
                    </p>
                    {latestReview.overallSummary?.split("\n").filter(l => l.trim()).map((para, i) => (
                      <p key={i} className="text-xs text-muted-foreground leading-relaxed mb-1 last:mb-0" data-testid={i === 0 ? "text-review-summary" : undefined}>
                        {para}
                      </p>
                    ))}
                  </div>
                  {latestReview.strengths && (
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-2.5">
                      <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />Strengths
                      </p>
                      {latestReview.strengths.split("\n").filter(l => l.trim()).map((line, i) => (
                        <div key={i} className="flex items-start gap-1.5 py-0.5">
                          <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                          <span className="text-xs text-muted-foreground leading-relaxed">{line.replace(/^[-•]\s*/, "")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {latestReview.gaps && (
                    <div className="rounded-lg bg-red-500/5 border border-red-500/15 p-2.5">
                      <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />Gaps & Concerns
                      </p>
                      {latestReview.gaps.split("\n").filter(l => l.trim()).map((line, i) => (
                        <div key={i} className="flex items-start gap-1.5 py-0.5">
                          <span className="text-red-400 mt-0.5 shrink-0">•</span>
                          <span className="text-xs text-muted-foreground leading-relaxed">{line.replace(/^[-•]\s*/, "")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {latestReview.recommendations && (
                    <div className="rounded-lg bg-primary/5 border border-primary/15 p-2.5">
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" />Recommendations
                      </p>
                      {latestReview.recommendations.split("\n").filter(l => l.trim()).map((line, i) => (
                        <div key={i} className="flex items-start gap-1.5 py-0.5">
                          <span className="text-primary mt-0.5 shrink-0">•</span>
                          <span className="text-xs text-muted-foreground leading-relaxed">{line.replace(/^[-•]\s*/, "")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Layers className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No reviews generated yet</p>
                  <Link href="/reviews"><span className="text-xs text-primary hover:underline mt-1">Generate one →</span></Link>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
