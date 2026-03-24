import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import {
  Target,
  ListChecks,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  BarChart3,
  Activity,
  CalendarDays,
  Building2,
  FolderOpen,
  Briefcase,
  Flag,
  ChevronRight,
  Zap,
  Clock,
  Printer,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { ActionItem, MonthlyReview, Department, Kpi, Company, Milestone, Project, KpiActual } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();
  const [focusTab, setFocusTab] = useState<"actions" | "kpis" | "milestones">("actions");

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
  const { data: milestones = [] } = useQuery<Milestone[]>({ queryKey: ["/api/milestones"] });
  const { data: allActuals = [] } = useQuery<(KpiActual & { kpiName: string })[]>({ queryKey: ["/api/kpi-actuals/company"] });

  const today = new Date().toISOString().split("T")[0];
  const recentActions = (actions || []).slice(0, 6);
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
  });

  const pctOnTrack = stats && stats.totalKpis > 0 ? Math.round((stats.onTrack / stats.totalKpis) * 100) : 0;
  const pctCompleted = stats && stats.totalActions > 0 ? Math.round((stats.completedActions / stats.totalActions) * 100) : 0;
  const pctOverdue = stats && stats.totalActions > 0 ? Math.round((stats.overdueActions / stats.totalActions) * 100) : 0;

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

  const handleDashboardPrint = () => {
    document.body.classList.add("printing-dashboard");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-dashboard"), 1000);
  };

  const statCards = [
    { title: "Total KPIs", value: stats?.totalKpis || 0, icon: Target, color: "text-primary", ring: "bg-primary/10", border: "border-l-primary", pct: pctOnTrack, pctLabel: "on track", link: "/kpis", accent: "text-primary" },
    { title: "On Track", value: stats?.onTrack || 0, icon: CheckCircle2, color: "text-emerald-600", ring: "bg-emerald-500/10", border: "border-l-emerald-500", pct: null, pctLabel: "", link: "/kpis", accent: "text-emerald-600" },
    { title: "Below Target", value: stats?.belowTarget || 0, icon: TrendingDown, color: "text-red-500", ring: "bg-red-500/10", border: "border-l-red-500", pct: null, pctLabel: "", link: "/kpis", accent: "text-red-500" },
    { title: "Total Actions", value: stats?.totalActions || 0, icon: ListChecks, color: "text-blue-600", ring: "bg-blue-500/10", border: "border-l-blue-500", pct: pctCompleted, pctLabel: "done", link: "/actions", accent: "text-blue-600" },
    { title: "Overdue", value: stats?.overdueActions || 0, icon: AlertTriangle, color: "text-orange-500", ring: "bg-orange-500/10", border: "border-l-orange-500", pct: pctOverdue, pctLabel: "of total", link: "/actions", accent: "text-orange-500" },
    { title: "Completed", value: stats?.completedActions || 0, icon: TrendingUp, color: "text-emerald-600", ring: "bg-emerald-500/10", border: "border-l-emerald-500", pct: null, pctLabel: "", link: "/actions", accent: "text-emerald-600" },
  ];

  const focusCount = overdueActions.length + atRiskKpis.length + upcomingMilestones.length;

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

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-3 max-w-screen-2xl mx-auto">

        {/* ══════════════════════════════════════════════════════════════════
            ROW 1 — Hero Banner
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="rounded-xl border bg-gradient-to-r from-primary/5 via-background to-background px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
          data-testid="card-welcome-banner"
        >
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate" data-testid="text-welcome-title">
              Welcome back, {user?.name || "there"} 👋
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3 shrink-0" />
              <span data-testid="text-today-date">{formattedDate}</span>
            </div>
          </div>

          {/* ── Quick stat pills ── */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/kpis">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all hover:scale-105 ${
                pctOnTrack >= 80 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15"
                : pctOnTrack >= 50 ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15"
                : "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/15"
              }`}>
                <Target className="h-3 w-3" />
                {stats?.onTrack || 0}/{stats?.totalKpis || 0} KPIs on track
              </span>
            </Link>
            {(stats?.overdueActions || 0) > 0 && (
              <Link href="/actions">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-500/15 hover:scale-105 transition-all">
                  <AlertTriangle className="h-3 w-3" />
                  {stats?.overdueActions} overdue
                </span>
              </Link>
            )}
            {(portfolioStats?.active || 0) > 0 && (
              <Link href="/portfolio">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary cursor-pointer hover:bg-primary/15 hover:scale-105 transition-all">
                  <Briefcase className="h-3 w-3" />
                  {portfolioStats?.active} active projects
                </span>
              </Link>
            )}
          </div>

          {/* ── Company + Export ── */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleDashboardPrint}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-2.5 py-1.5 hover:bg-muted/50 transition-colors"
              data-testid="button-export-dashboard"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Building2 className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold leading-none" data-testid="text-company-name">{companyName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{companyData?.industry || "Business"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            ROW 2 — 6 Stat Metric Tiles
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3" data-testid="grid-stat-cards">
          {statCards.map(stat => (
            <Link key={stat.title} href={stat.link} data-testid={`link-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <Card className={`border-l-4 ${stat.border} cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group h-full`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors leading-none">{stat.title}</p>
                    <div className={`flex h-6 w-6 items-center justify-center rounded-md ${stat.ring} shrink-0`}>
                      <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                    </div>
                  </div>
                  <p className={`text-2xl font-bold tabular-nums leading-none ${stat.accent}`} data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    {stat.value}
                  </p>
                  {stat.pct !== null && stat.pct !== undefined && (
                    <div className="mt-1.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-muted-foreground">{stat.pctLabel}</span>
                        <span className="text-[10px] font-semibold text-muted-foreground">{stat.pct}%</span>
                      </div>
                      <Progress value={stat.pct} className="h-1" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            ROW 3 — Main Content: Focus Panel + Charts (2-col)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">

          {/* ── Today's Focus (3 of 5 cols) ── */}
          <Card className="lg:col-span-3" data-testid="section-todays-focus">
            <CardHeader className="pb-0 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Today's Focus
                  {focusCount > 0 && (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">{focusCount}</span>
                  )}
                </CardTitle>
                {/* Tabs */}
                <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                  {([
                    { id: "actions", label: "Overdue", count: overdueActions.length, color: "text-red-500" },
                    { id: "kpis", label: "KPIs", count: atRiskKpis.length, color: "text-amber-500" },
                    { id: "milestones", label: "Milestones", count: upcomingMilestones.length, color: "text-violet-500" },
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setFocusTab(tab.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        focusTab === tab.id
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      data-testid={`tab-focus-${tab.id}`}
                    >
                      {tab.label}
                      {tab.count > 0 && (
                        <span className={`text-[10px] font-bold ${tab.color}`}>{tab.count}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-3">
              {/* Overdue Actions Tab */}
              {focusTab === "actions" && (
                <div>
                  {overdueActions.length === 0 ? (
                    <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      All actions are on time — great work!
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {overdueActions.slice(0, 5).map(a => {
                        const eff = a.revisedDueDate || a.dueDate || "";
                        const daysOver = eff ? Math.floor((Date.now() - new Date(eff).getTime()) / 86400000) : 0;
                        return (
                          <Link key={a.id} href="/actions">
                            <div className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-red-500/5 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all cursor-pointer group" data-testid={`focus-action-${a.id}`}>
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{a.title}</p>
                                <p className="text-xs text-muted-foreground">{a.ownerName || "Unassigned"}</p>
                              </div>
                              <span className="text-xs font-semibold text-red-500 bg-red-500/10 px-2 py-0.5 rounded shrink-0">{daysOver}d late</span>
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                          </Link>
                        );
                      })}
                      {overdueActions.length > 5 && (
                        <Link href="/actions"><span className="text-xs text-primary hover:underline cursor-pointer pl-2">+{overdueActions.length - 5} more actions →</span></Link>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* At-Risk KPIs Tab */}
              {focusTab === "kpis" && (
                <div>
                  {atRiskKpis.length === 0 ? (
                    <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      All KPIs are on track — excellent!
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {atRiskKpis.slice(0, 5).map(a => (
                        <Link key={a.kpiId} href="/kpis">
                          <div className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-amber-500/5 border border-transparent hover:border-amber-200 dark:hover:border-amber-900/30 transition-all cursor-pointer group" data-testid={`focus-kpi-${a.kpiId}`}>
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.status === "Below Target" ? "bg-red-500" : "bg-amber-500"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{a.kpiName}</p>
                              <p className="text-xs text-muted-foreground">Actual: {a.actualValue}</p>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
                              a.status === "Below Target" ? "text-red-600 bg-red-500/10" : "text-amber-600 bg-amber-500/10"
                            }`}>{a.status}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                        </Link>
                      ))}
                      {atRiskKpis.length > 5 && (
                        <Link href="/kpis"><span className="text-xs text-primary hover:underline cursor-pointer pl-2">+{atRiskKpis.length - 5} more KPIs →</span></Link>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Milestones Tab */}
              {focusTab === "milestones" && (
                <div>
                  {upcomingMilestones.length === 0 ? (
                    <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      No milestones due this week
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {upcomingMilestones.slice(0, 5).map(m => {
                        const daysLeft = m.dueDate ? Math.ceil((new Date(m.dueDate).getTime() - Date.now()) / 86400000) : 0;
                        return (
                          <Link key={m.id} href="/portfolio">
                            <div className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-violet-500/5 border border-transparent hover:border-violet-200 dark:hover:border-violet-900/30 transition-all cursor-pointer group" data-testid={`focus-milestone-${m.id}`}>
                              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{m.title}</p>
                                <p className="text-xs text-muted-foreground">Due {m.dueDate ? `${m.dueDate.split("-")[2]}-${m.dueDate.split("-")[1]}-${m.dueDate.split("-")[0]}` : ""}</p>
                              </div>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
                                daysLeft <= 1 ? "text-red-600 bg-red-500/10" : daysLeft <= 3 ? "text-amber-600 bg-amber-500/10" : "text-violet-600 bg-violet-500/10"
                              }`}>{daysLeft <= 0 ? "today!" : `${daysLeft}d`}</span>
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Charts (2 of 5 cols) ── */}
          <div className="lg:col-span-2 grid grid-rows-2 gap-3">
            {/* KPI Health donut */}
            <Card data-testid="card-kpi-health">
              <CardHeader className="pb-0 pt-3 px-4">
                <CardTitle className="text-xs font-semibold flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-primary" />KPI Health</span>
                  <Link href="/kpis"><span className="text-[10px] font-normal text-primary hover:underline">View →</span></Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-1">
                {kpiStatusData.length > 0 ? (
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
                )}
              </CardContent>
            </Card>

            {/* Action Progress bar */}
            <Card data-testid="card-action-progress">
              <CardHeader className="pb-0 pt-3 px-4">
                <CardTitle className="text-xs font-semibold flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-primary" />Action Status</span>
                  <Link href="/actions"><span className="text-[10px] font-normal text-primary hover:underline">View →</span></Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-1">
                {actionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={130}>
                    <BarChart data={actionChartData} barSize={28}>
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
                  <div className="h-[130px] flex items-center justify-center text-xs text-muted-foreground">No action items yet</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            ROW 4 — Bottom: Recent Actions | Dept Summary | Review + Projects
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          {/* Recent Actions */}
          <Card data-testid="card-recent-actions">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
                <span className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" />Recent Actions</span>
                <Link href="/actions"><span className="text-xs font-normal text-primary hover:underline">View all →</span></Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {recentActions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No actions yet</p>
              ) : (
                <div className="space-y-1">
                  {recentActions.map(action => {
                    const eff = action.revisedDueDate || action.dueDate;
                    const isOverdue = eff && eff < today && action.status !== "Completed" && action.status !== "Cancelled";
                    return (
                      <Link key={action.id} href="/actions">
                        <div className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:shadow-sm transition-all group ${isOverdue ? "hover:bg-red-500/5" : "hover:bg-muted/50"}`} data-testid={`card-action-${action.id}`}>
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
          <Card data-testid="card-department-summary">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Department Pulse
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {deptSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No departments yet</p>
              ) : (
                <div className="space-y-2">
                  {deptSummary.map(dept => {
                    const totalItems = dept.actionCount || 1;
                    const overdueRatio = dept.overdueCount / totalItems;
                    return (
                      <div key={dept.id} className="space-y-1" data-testid={`row-department-${dept.id}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium" data-testid={`text-dept-name-${dept.id}`}>{dept.name}</span>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span data-testid={`text-dept-kpis-${dept.id}`}>{dept.kpiCount} KPIs</span>
                            <span data-testid={`text-dept-actions-${dept.id}`}>{dept.actionCount} actions</span>
                            {dept.overdueCount > 0 && (
                              <span className="text-red-500 font-semibold" data-testid={`text-dept-overdue-${dept.id}`}>{dept.overdueCount} late</span>
                            )}
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${overdueRatio > 0.3 ? "bg-red-500" : overdueRatio > 0 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.max(8, dept.overdueCount > 0 ? overdueRatio * 100 : 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Active Projects mini */}
              {projects.filter(p => p.status !== "Completed").length > 0 && (
                <div className="mt-4 pt-3 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><FolderOpen className="h-3 w-3" />Active Projects</p>
                    <Link href="/portfolio"><span className="text-[10px] text-primary hover:underline">View all →</span></Link>
                  </div>
                  {projects.filter(p => p.status !== "Completed").slice(0, 3).map(p => (
                    <Link key={p.id} href={`/projects/${p.id}`} data-testid={`dashboard-project-${p.id}`}>
                      <div className="flex items-center gap-2 group hover:bg-muted/30 rounded-md px-1 py-0.5 transition-colors">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.health === "Red" ? "bg-red-500" : p.health === "Amber" ? "bg-amber-500" : "bg-emerald-500"}`} />
                        <span className="text-xs font-medium flex-1 truncate group-hover:text-primary transition-colors">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{p.progress ?? 0}%</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Latest Review */}
          <Card data-testid="card-latest-review">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                  Latest Review
                </CardTitle>
                <div className="flex items-center gap-2">
                  {latestReview && <Badge variant="secondary" className="text-[10px]" data-testid="badge-review-month">{latestReview.reviewMonth}</Badge>}
                  <Link href="/reviews"><span className="text-xs font-normal text-primary hover:underline">View →</span></Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {latestReview ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3" data-testid="text-review-summary">
                    {latestReview.overallSummary?.split("\n")[0]}
                  </p>
                  {latestReview.strengths && (
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-2.5">
                      <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">✓ Key Strengths</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {latestReview.strengths.split("\n").slice(0, 2).join("; ").replace(/^[-•]\s*/gm, "")}
                      </p>
                    </div>
                  )}
                  {latestReview.gaps && (
                    <div className="rounded-lg bg-red-500/5 border border-red-500/15 p-2.5">
                      <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1">⚠ Key Gaps</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {latestReview.gaps.split("\n").slice(0, 2).join("; ").replace(/^[-•]\s*/gm, "")}
                      </p>
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
