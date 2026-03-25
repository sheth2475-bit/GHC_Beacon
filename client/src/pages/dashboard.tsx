import { useState, useEffect, useRef, useCallback } from "react";
import { ResponsiveGridLayout } from "react-grid-layout";
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
  Activity, CalendarDays, Building2,
  Briefcase, ChevronRight, Zap, Clock, Printer, Layers,
  AlertCircle, Lightbulb, MessageSquare, GripVertical, RotateCcw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import type {
  ActionItem, MonthlyReview, Department, Kpi, Company, Milestone as MilestoneType, Project, KpiActual,
} from "@shared/schema";

const LAYOUT_KEY = "performo-dashboard-layout";

const DEFAULT_LAYOUTS = {
  lg: [
    { i: "attention",     x: 0, y: 0, w: 4, h: 11, minW: 3, minH: 6  },
    { i: "analytics",     x: 4, y: 0, w: 5, h: 6,  minW: 3, minH: 5  },
    { i: "projhealth",    x: 4, y: 6, w: 5, h: 5,  minW: 3, minH: 4  },
    { i: "actions",       x: 9, y: 0, w: 3, h: 6,  minW: 2, minH: 5  },
    { i: "deptpulse",     x: 9, y: 6, w: 3, h: 5,  minW: 2, minH: 4  },
    { i: "review",        x: 0, y: 11, w: 12, h: 9, minW: 4, minH: 6  },
  ],
  md: [
    { i: "attention",  x: 0, y: 0,  w: 5, h: 11 },
    { i: "analytics",  x: 5, y: 0,  w: 5, h: 6  },
    { i: "projhealth", x: 5, y: 6,  w: 5, h: 5  },
    { i: "actions",    x: 0, y: 11, w: 5, h: 7  },
    { i: "deptpulse",  x: 5, y: 11, w: 5, h: 7  },
    { i: "review",     x: 0, y: 18, w: 10, h: 9 },
  ],
  sm: [
    { i: "attention",  x: 0, y: 0,  w: 6, h: 10 },
    { i: "analytics",  x: 0, y: 10, w: 6, h: 6  },
    { i: "projhealth", x: 0, y: 16, w: 6, h: 5  },
    { i: "actions",    x: 0, y: 21, w: 6, h: 7  },
    { i: "deptpulse",  x: 0, y: 28, w: 6, h: 5  },
    { i: "review",     x: 0, y: 33, w: 6, h: 9  },
  ],
};

function loadLayouts() {
  try {
    const saved = localStorage.getItem(LAYOUT_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_LAYOUTS;
  } catch {
    return DEFAULT_LAYOUTS;
  }
}

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
      <div className="relative rounded-xl border bg-card cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group h-full overflow-hidden">
        <div className={`absolute top-0 inset-x-0 h-[3px] ${topBar}`} />
        <div className="p-3 pt-4">
          <div className="flex items-center justify-between gap-1 mb-1.5">
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

/* ─── drag handle header shared by all widgets ─── */
function WidgetHeader({ icon: Icon, iconBg, iconColor, title, badge, action }: {
  icon: React.ElementType; iconBg: string; iconColor: string;
  title: React.ReactNode; badge?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="drag-handle flex items-center justify-between px-4 pt-3 pb-0 cursor-grab active:cursor-grabbing select-none">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${iconBg} shrink-0`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
        <span className="text-sm font-bold truncate">{title}</span>
        {badge}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action}
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [layouts, setLayouts] = useState(loadLayouts);

  const handleLayoutChange = useCallback((_: unknown[], all: Record<string, unknown[]>) => {
    setLayouts(all);
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(all)); } catch {}
  }, []);

  const resetLayout = () => {
    setLayouts(DEFAULT_LAYOUTS);
    try { localStorage.removeItem(LAYOUT_KEY); } catch {}
  };

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
    total: number; active: number; completed: number; atRisk: number; overdueTasks: number; upcomingMilestones: number;
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

  /* ─── tab states ─── */
  const [attentionTab, setAttentionTab] = useState<"all" | "actions" | "kpis" | "milestones">("all");
  const [chartTab, setChartTab] = useState<"kpi" | "actions">("kpi");
  const [actionFilter, setActionFilter] = useState<"all" | "overdue" | "inprogress">("all");

  const focusCount = overdueActions.length + atRiskKpis.length + upcomingMilestones.length;
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

  const activeProjects = projects.filter(p => p.status !== "Completed").slice(0, 5);

  const handleDashboardPrint = () => {
    document.body.classList.add("printing-dashboard");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-dashboard"), 1000);
  };

  const tabCls = (active: boolean) =>
    `px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
      active ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
    }`;

  if (statsLoading) {
    return (
      <div className="p-4 space-y-4 h-full overflow-auto">
        <div className="h-20 bg-muted/40 rounded-xl animate-pulse" />
        <div className="grid grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-muted/40 rounded-lg animate-pulse" />)}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-muted/40 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-3 max-w-screen-2xl mx-auto">

        {/* ═══ Hero Banner ═══ */}
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
                pctOnTrack >= 80 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" :
                pctOnTrack >= 50 ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" :
                "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
              }`}>
                <Target className="h-3 w-3" />
                {stats?.onTrack || 0}/{stats?.totalKpis || 0} KPIs on track
              </span>
            </Link>
            {(stats?.overdueActions || 0) > 0 && (
              <Link href="/actions">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 cursor-pointer hover:bg-red-500/15 hover:scale-105 transition-all">
                  <AlertTriangle className="h-3 w-3" />{stats?.overdueActions} overdue
                </span>
              </Link>
            )}
            {(portfolioStats?.active || 0) > 0 && (
              <Link href="/portfolio">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:bg-primary/15 hover:scale-105 transition-all">
                  <Briefcase className="h-3 w-3" />{portfolioStats?.active} active projects
                </span>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0 relative">
            <button
              onClick={resetLayout}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-2.5 py-1.5 hover:bg-muted/50 transition-colors"
              title="Reset dashboard layout"
              data-testid="button-reset-layout"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
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

        {/* ═══ Stat Tiles ═══ */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3" data-testid="grid-stat-cards">
          {statCards.map(s => <StatTile key={s.title} {...s} />)}
        </div>

        {/* ═══ Draggable Widget Grid ═══ */}
        <div className="relative">
          <p className="text-[10px] text-muted-foreground/50 mb-1 text-right select-none">
            Drag headers to rearrange · Drag corners to resize
          </p>
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768 }}
            cols={{ lg: 12, md: 10, sm: 6 }}
            rowHeight={30}
            margin={[10, 10]}
            draggableHandle=".drag-handle"
            onLayoutChange={handleLayoutChange}
            resizeHandles={["se"]}
          >

            {/* ── Needs Attention ── */}
            <div key="attention" data-testid="section-todays-focus">
              <Card className="h-full overflow-hidden flex flex-col">
                <div className="h-[3px] bg-gradient-to-r from-amber-500 via-orange-400 to-transparent shrink-0" />
                <WidgetHeader
                  icon={Zap} iconBg="bg-amber-500/10" iconColor="text-amber-500"
                  title={<>Needs Attention {focusCount > 0 && <span className="inline-flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold ml-1">{focusCount}</span>}</>}
                />
                <div className="px-4 pt-2 shrink-0">
                  <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5 w-fit">
                    <button className={tabCls(attentionTab === "all")} onClick={() => setAttentionTab("all")} data-testid="tab-attention-all">All</button>
                    <button className={tabCls(attentionTab === "actions")} onClick={() => setAttentionTab("actions")} data-testid="tab-attention-actions">
                      Actions {overdueActions.length > 0 && <span className="ml-0.5 text-red-500">({overdueActions.length})</span>}
                    </button>
                    <button className={tabCls(attentionTab === "kpis")} onClick={() => setAttentionTab("kpis")} data-testid="tab-attention-kpis">
                      KPIs {atRiskKpis.length > 0 && <span className="ml-0.5 text-amber-500">({atRiskKpis.length})</span>}
                    </button>
                    <button className={tabCls(attentionTab === "milestones")} onClick={() => setAttentionTab("milestones")} data-testid="tab-attention-milestones">
                      Due {upcomingMilestones.length > 0 && <span className="ml-0.5 text-violet-500">({upcomingMilestones.length})</span>}
                    </button>
                  </div>
                </div>
                <CardContent className="px-4 pb-3 pt-2 flex-1 overflow-y-auto">
                  {focusCount === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-6 justify-center">
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
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              a.status === "Below Target" ? "text-red-600 bg-red-500/10" : "text-amber-600 bg-amber-500/10"
                            }`}>{a.status === "Below Target" ? "Below" : "At Risk"}</span>
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
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                daysLeft <= 1 ? "text-red-600 bg-red-500/10" : daysLeft <= 3 ? "text-amber-600 bg-amber-500/10" : "text-violet-600 bg-violet-500/10"
                              }`}>{daysLeft <= 0 ? "today" : `${daysLeft}d`}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Analytics Chart ── */}
            <div key="analytics" data-testid="card-analytics">
              <Card className="h-full overflow-hidden flex flex-col">
                <div className={`h-[3px] shrink-0 ${chartTab === "kpi" ? "bg-gradient-to-r from-primary to-primary/40" : "bg-gradient-to-r from-blue-500 to-blue-400/40"}`} />
                <WidgetHeader
                  icon={chartTab === "kpi" ? Activity : BarChart3}
                  iconBg={chartTab === "kpi" ? "bg-primary/10" : "bg-blue-500/10"}
                  iconColor={chartTab === "kpi" ? "text-primary" : "text-blue-600"}
                  title={chartTab === "kpi" ? "KPI Health" : "Action Status"}
                  action={
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5">
                        <button className={tabCls(chartTab === "kpi")} onClick={() => setChartTab("kpi")} data-testid="tab-chart-kpi">KPI</button>
                        <button className={tabCls(chartTab === "actions")} onClick={() => setChartTab("actions")} data-testid="tab-chart-actions">Actions</button>
                      </div>
                      <Link href={chartTab === "kpi" ? "/kpis" : "/actions"}><span className="text-[10px] font-medium text-primary hover:underline ml-1">View →</span></Link>
                    </div>
                  }
                />
                <CardContent className="px-4 pb-3 pt-2 flex-1 min-h-0">
                  {chartTab === "kpi" ? (
                    kpiStatusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={kpiStatusData} cx="50%" cy="45%" innerRadius="35%" outerRadius="55%" paddingAngle={3} dataKey="value" stroke="none">
                            {kpiStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "11px" }} formatter={(v: number, n: string) => [`${v} KPIs`, n]} />
                          <Legend verticalAlign="bottom" height={28} iconType="circle" iconSize={7} formatter={(v: string) => <span className="text-[10px] text-foreground">{v}</span>} />
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
                            {actionChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No action data yet</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Project Health ── */}
            <div key="projhealth" data-testid="card-project-health">
              <Card className="h-full overflow-hidden flex flex-col">
                <div className="h-[3px] bg-gradient-to-r from-violet-500 to-violet-400/40 shrink-0" />
                <WidgetHeader
                  icon={Briefcase} iconBg="bg-violet-500/10" iconColor="text-violet-600"
                  title="Project Health"
                  action={<Link href="/portfolio"><span className="text-[10px] font-medium text-primary hover:underline">View all →</span></Link>}
                />
                <CardContent className="px-4 pb-3 pt-2 flex-1 overflow-y-auto">
                  {activeProjects.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No active projects</p>
                  ) : (
                    <div className="space-y-2">
                      {activeProjects.map(p => {
                        const pct = p.progress ?? 0;
                        const hc = p.health === "Red" ? "bg-red-500" : p.health === "Amber" ? "bg-amber-500" : "bg-emerald-500";
                        return (
                          <Link key={p.id} href={`/projects/${p.id}`} data-testid={`dashboard-project-${p.id}`}>
                            <div className="group flex items-center gap-2 hover:bg-muted/30 rounded-lg px-1.5 py-1 transition-colors cursor-pointer">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${hc}`} />
                              <span className="text-xs font-medium flex-1 truncate group-hover:text-primary transition-colors">{p.name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${hc}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] font-semibold text-muted-foreground w-7 text-right">{pct}%</span>
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

            {/* ── Recent Actions ── */}
            <div key="actions" data-testid="card-recent-actions">
              <Card className="h-full overflow-hidden flex flex-col">
                <div className="h-[3px] bg-gradient-to-r from-blue-500 to-blue-400/40 shrink-0" />
                <WidgetHeader
                  icon={ListChecks} iconBg="bg-blue-500/10" iconColor="text-blue-600"
                  title="Recent Actions"
                  action={<Link href="/actions"><span className="text-[10px] font-medium text-primary hover:underline">View all →</span></Link>}
                />
                <div className="px-4 pt-2 shrink-0">
                  <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5 w-fit">
                    <button className={tabCls(actionFilter === "all")} onClick={() => setActionFilter("all")} data-testid="tab-actions-all">All</button>
                    <button className={tabCls(actionFilter === "overdue")} onClick={() => setActionFilter("overdue")} data-testid="tab-actions-overdue">
                      Overdue {overdueActions.length > 0 && <span className="ml-0.5 text-red-500">({overdueActions.length})</span>}
                    </button>
                    <button className={tabCls(actionFilter === "inprogress")} onClick={() => setActionFilter("inprogress")} data-testid="tab-actions-inprogress">In Progress</button>
                  </div>
                </div>
                <CardContent className="px-4 pb-3 pt-2 flex-1 overflow-y-auto">
                  {filteredActions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No actions</p>
                  ) : (
                    <div className="space-y-0.5">
                      {filteredActions.map(action => {
                        const eff = action.revisedDueDate || action.dueDate;
                        const isOverdue = eff && eff < today && action.status !== "Completed" && action.status !== "Cancelled";
                        return (
                          <Link key={action.id} href="/actions">
                            <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:shadow-sm transition-all group ${isOverdue ? "hover:bg-red-500/5" : "hover:bg-muted/50"}`} data-testid={`card-action-${action.id}`}>
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                action.status === "Completed" ? "bg-emerald-500" : isOverdue ? "bg-red-500" : action.status === "In Progress" ? "bg-blue-500" : "bg-muted-foreground/40"
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{action.title}</p>
                                <p className="text-[10px] text-muted-foreground">{action.ownerName || "Unassigned"}</p>
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
            </div>

            {/* ── Department Pulse ── */}
            <div key="deptpulse" data-testid="card-department-summary">
              <Card className="h-full overflow-hidden flex flex-col">
                <div className="h-[3px] bg-gradient-to-r from-emerald-500 to-emerald-400/40 shrink-0" />
                <WidgetHeader icon={Building2} iconBg="bg-emerald-500/10" iconColor="text-emerald-600" title="Department Pulse" />
                <CardContent className="px-4 pb-3 pt-2 flex-1 overflow-y-auto">
                  {deptSummary.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No departments yet</p>
                  ) : (
                    <div className="space-y-2.5">
                      {deptSummary.map(dept => {
                        const totalItems = dept.actionCount || 1;
                        const overdueRatio = dept.overdueCount / totalItems;
                        return (
                          <div key={dept.id} className="space-y-1" data-testid={`row-department-${dept.id}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold">{dept.name}</span>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span>{dept.kpiCount} KPIs</span>
                                <span>{dept.actionCount} actions</span>
                                {dept.overdueCount > 0 && <span className="text-red-500 font-bold">{dept.overdueCount} late</span>}
                              </div>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${overdueRatio > 0.3 ? "bg-red-500" : overdueRatio > 0 ? "bg-amber-500" : "bg-emerald-500"}`}
                                style={{ width: `${Math.max(8, dept.overdueCount > 0 ? overdueRatio * 100 : 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Latest Review ── */}
            <div key="review" data-testid="card-latest-review">
              <Card className="h-full overflow-hidden flex flex-col">
                <div className="h-[3px] bg-gradient-to-r from-violet-500 to-violet-400/40 shrink-0" />
                <WidgetHeader
                  icon={ArrowUpRight} iconBg="bg-violet-500/10" iconColor="text-violet-600"
                  title="Latest Review"
                  badge={latestReview && <Badge variant="secondary" className="text-[10px] ml-1">{latestReview.reviewMonth}</Badge>}
                  action={<Link href="/reviews"><span className="text-[10px] font-medium text-primary hover:underline">View →</span></Link>}
                />
                <CardContent className="px-4 pb-4 pt-2 flex-1 overflow-y-auto">
                  {latestReview ? (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-muted/30 border">
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1 text-muted-foreground"><MessageSquare className="h-3 w-3" />Executive Summary</p>
                        {latestReview.overallSummary?.split("\n").filter(l => l.trim()).map((para, i) => (
                          <p key={i} className="text-xs text-muted-foreground leading-relaxed mb-1 last:mb-0" data-testid={i === 0 ? "text-review-summary" : undefined}>{para}</p>
                        ))}
                      </div>
                      {latestReview.strengths && (
                        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-2.5">
                          <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Strengths</p>
                          {latestReview.strengths.split("\n").filter(l => l.trim()).map((line, i) => (
                            <div key={i} className="flex items-start gap-1.5 py-0.5"><span className="text-emerald-500 mt-0.5 shrink-0">•</span><span className="text-xs text-muted-foreground leading-relaxed">{line.replace(/^[-•]\s*/, "")}</span></div>
                          ))}
                        </div>
                      )}
                      {latestReview.gaps && (
                        <div className="rounded-lg bg-red-500/5 border border-red-500/15 p-2.5">
                          <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Gaps & Concerns</p>
                          {latestReview.gaps.split("\n").filter(l => l.trim()).map((line, i) => (
                            <div key={i} className="flex items-start gap-1.5 py-0.5"><span className="text-red-400 mt-0.5 shrink-0">•</span><span className="text-xs text-muted-foreground leading-relaxed">{line.replace(/^[-•]\s*/, "")}</span></div>
                          ))}
                        </div>
                      )}
                      {latestReview.recommendations && (
                        <div className="rounded-lg bg-primary/5 border border-primary/15 p-2.5">
                          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1"><Lightbulb className="h-3 w-3" />Recommendations</p>
                          {latestReview.recommendations.split("\n").filter(l => l.trim()).map((line, i) => (
                            <div key={i} className="flex items-start gap-1.5 py-0.5"><span className="text-primary mt-0.5 shrink-0">•</span><span className="text-xs text-muted-foreground leading-relaxed">{line.replace(/^[-•]\s*/, "")}</span></div>
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
              </Card>
            </div>

          </ResponsiveGridLayout>
        </div>

      </div>
    </div>
  );
}
