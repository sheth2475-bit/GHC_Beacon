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
  LayoutDashboard,
  CalendarDays,
  Building2,
  FolderOpen,
  Briefcase,
  Flag,
  ChevronRight,
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
import type { ActionItem, MonthlyReview, Department, Kpi, Company, Milestone, Project } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: companyData } = useQuery<Company & { departments: Department[] } | null>({
    queryKey: ["/api/company"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalKpis: number;
    onTrack: number;
    belowTarget: number;
    totalActions: number;
    overdueActions: number;
    completedActions: number;
  }>({ queryKey: ["/api/dashboard-stats"] });

  const { data: actions } = useQuery<ActionItem[]>({ queryKey: ["/api/action-items"] });
  const { data: reviews } = useQuery<MonthlyReview[]>({ queryKey: ["/api/monthly-reviews"] });
  const { data: kpis } = useQuery<Kpi[]>({ queryKey: ["/api/kpis"] });
  const { data: departments } = useQuery<Department[]>({ queryKey: ["/api/departments"] });

  const { data: portfolioStats } = useQuery<{
    total: number; active: number; completed: number; atRisk: number; overdueTasks: number; upcomingMilestones: number;
  }>({ queryKey: ["/api/portfolio/stats"] });

  const { data: projects = [] } = useQuery<(Project & { health: string; taskCount: number; completedTaskCount: number })[]>({
    queryKey: ["/api/projects"],
  });

  const { data: milestones = [] } = useQuery<Milestone[]>({ queryKey: ["/api/milestones"] });

  const kpiStatusData = stats
    ? [
        { name: "On Track", value: stats.onTrack, fill: "#10b981" },
        {
          name: "At Risk",
          value: Math.max(0, stats.totalKpis - stats.onTrack - stats.belowTarget),
          fill: "#f59e0b",
        },
        { name: "Below Target", value: stats.belowTarget, fill: "#ef4444" },
      ].filter((d) => d.value > 0)
    : [];

  const actionChartData = stats
    ? [
        { name: "Completed", count: stats.completedActions, fill: "#10b981" },
        {
          name: "Active",
          count: Math.max(0, stats.totalActions - stats.completedActions - stats.overdueActions),
          fill: "#3b82f6",
        },
        { name: "Overdue", count: stats.overdueActions, fill: "#ef4444" },
      ].filter((d) => d.count > 0)
    : [];

  const today = new Date().toISOString().split("T")[0];
  const recentActions = (actions || []).slice(0, 5);
  const latestReview = reviews?.[0];

  const companyName = companyData?.companyName || "Your Company";
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const deptSummary = (departments || []).map((dept) => {
    const deptKpis = (kpis || []).filter((k) => k.departmentId === dept.id);
    const deptActions = (actions || []).filter((a) => a.departmentId === dept.id);
    const overdueActions = deptActions.filter((a) => {
      const effectiveDate = a.revisedDueDate || a.dueDate;
      return effectiveDate && effectiveDate < today && a.status !== "Completed" && a.status !== "Cancelled";
    });
    return {
      id: dept.id,
      name: dept.name,
      kpiCount: deptKpis.length,
      actionCount: deptActions.length,
      overdueCount: overdueActions.length,
    };
  });

  const summaryParts: string[] = [];
  if (stats) {
    if (stats.totalKpis > 0) {
      const pct = stats.totalKpis > 0 ? Math.round((stats.onTrack / stats.totalKpis) * 100) : 0;
      summaryParts.push(`${pct}% of KPIs are on track`);
    }
    if (stats.overdueActions > 0) {
      summaryParts.push(`${stats.overdueActions} action${stats.overdueActions !== 1 ? "s" : ""} overdue`);
    }
    if (stats.completedActions > 0) {
      summaryParts.push(`${stats.completedActions} action${stats.completedActions !== 1 ? "s" : ""} completed`);
    }
  }
  const summaryText = summaryParts.length > 0 ? summaryParts.join(" \u00B7 ") : "Get started by setting up your KPIs and action items.";

  if (statsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-64 mb-2" />
            <Skeleton className="h-4 w-48 mb-1" />
            <Skeleton className="h-4 w-80" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-14" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-[240px]" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-[240px]" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const pctOnTrack = stats && stats.totalKpis > 0 ? Math.round((stats.onTrack / stats.totalKpis) * 100) : null;
  const pctBelowTarget = stats && stats.totalKpis > 0 ? Math.round((stats.belowTarget / stats.totalKpis) * 100) : null;
  const pctCompleted = stats && stats.totalActions > 0 ? Math.round((stats.completedActions / stats.totalActions) * 100) : null;
  const pctOverdue = stats && stats.totalActions > 0 ? Math.round((stats.overdueActions / stats.totalActions) * 100) : null;

  const statCards = [
    { title: "Total KPIs", value: stats?.totalKpis || 0, icon: Target, color: "text-primary", bg: "bg-primary/10", pct: null as number | null },
    { title: "On Track", value: stats?.onTrack || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10", pct: pctOnTrack },
    { title: "Below Target", value: stats?.belowTarget || 0, icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10", pct: pctBelowTarget },
    { title: "Total Actions", value: stats?.totalActions || 0, icon: ListChecks, color: "text-blue-600", bg: "bg-blue-500/10", pct: null },
    { title: "Overdue", value: stats?.overdueActions || 0, icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10", pct: pctOverdue },
    { title: "Completed", value: stats?.completedActions || 0, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-500/10", pct: pctCompleted },
  ];

  return (
    <div className="p-6 space-y-6">
      <Card data-testid="card-welcome-banner">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-welcome-title">
                Welcome back, {user?.name || "there"}
              </h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                <span data-testid="text-today-date">{formattedDate}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2" data-testid="text-summary">
                {summaryText}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium" data-testid="text-company-name">{companyName}</p>
                <p className="text-xs text-muted-foreground">{companyData?.industry || "Business"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4" data-testid="grid-stat-cards">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover-elevate">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-1 mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <p
                  className="text-3xl font-bold tabular-nums"
                  data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {stat.value}
                </p>
                {stat.pct !== null && (
                  <span className="text-xs text-muted-foreground mb-1" data-testid={`text-pct-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    {stat.pct}%
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─ Execution Stats ─────────────────────────────────────────────────── */}
      {portfolioStats && (portfolioStats.total > 0 || projects.length > 0) && (
        <div className="space-y-4" data-testid="section-execution">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
              <FolderOpen className="h-4 w-4" /> Execution Overview
            </h2>
            <Link href="/portfolio">
              <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1" data-testid="link-view-portfolio">
                View Portfolio <ChevronRight className="h-3 w-3" />
              </span>
            </Link>
          </div>

          {/* Exec stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card data-testid="stat-exec-active" className="border-l-4 border-l-violet-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="h-3.5 w-3.5 text-violet-500" />
                  <p className="text-xs text-muted-foreground font-medium">Active Projects</p>
                </div>
                <p className="text-2xl font-bold tabular-nums" data-testid="text-exec-active">{portfolioStats.active}</p>
              </CardContent>
            </Card>
            <Card data-testid="stat-exec-atrisk" className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  <p className="text-xs text-muted-foreground font-medium">At Risk</p>
                </div>
                <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400" data-testid="text-exec-atrisk">{portfolioStats.atRisk}</p>
              </CardContent>
            </Card>
            <Card data-testid="stat-exec-overdue-tasks" className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                  <p className="text-xs text-muted-foreground font-medium">Overdue Tasks</p>
                </div>
                <p className="text-2xl font-bold tabular-nums text-orange-600 dark:text-orange-400" data-testid="text-exec-overdue-tasks">{portfolioStats.overdueTasks}</p>
              </CardContent>
            </Card>
            <Card data-testid="stat-exec-milestones" className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Flag className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs text-muted-foreground font-medium">Upcoming Milestones</p>
                </div>
                <p className="text-2xl font-bold tabular-nums" data-testid="text-exec-milestones">{portfolioStats.upcomingMilestones}</p>
              </CardContent>
            </Card>
          </div>

          {/* Active Projects mini-list */}
          {projects.filter(p => p.status !== "Completed").length > 0 && (
            <div className="grid md:grid-cols-2 gap-3">
              {projects.filter(p => p.status !== "Completed").slice(0, 4).map(p => (
                <Link key={p.id} href={`/projects/${p.id}`} data-testid={`dashboard-project-${p.id}`}>
                  <Card className="hover:shadow-md transition-all cursor-pointer border hover:border-primary/25 group overflow-hidden">
                    <div className={`h-0.5 w-full ${p.health === "Red" ? "bg-red-500" : p.health === "Amber" ? "bg-amber-500" : "bg-emerald-500"}`} />
                    <CardContent className="p-3.5">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${p.health === "Red" ? "bg-red-500" : p.health === "Amber" ? "bg-amber-500" : "bg-emerald-500"}`} />
                        <span className="text-sm font-semibold flex-1 truncate group-hover:text-primary transition-colors">{p.name}</span>
                        <div className="flex items-center gap-2 shrink-0 text-xs">
                          {p.health === "Red" && (
                            <span className="text-red-500 flex items-center gap-1 font-medium">
                              <AlertTriangle className="h-3 w-3" /> At Risk
                            </span>
                          )}
                          <span className="text-muted-foreground font-medium">{p.progress ?? 0}%</span>
                        </div>
                      </div>
                      <Progress value={p.progress ?? 0} className="h-1.5" />
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                        {p.status && <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          p.status === "At Risk" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                          p.status === "In Progress" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" :
                          "bg-muted text-muted-foreground"
                        }`}>{p.status}</span>}
                        <span className="ml-auto">{p.completedTaskCount}/{p.taskCount} tasks</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-kpi-health">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              KPI Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpiStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={kpiStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {kpiStatusData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => [`${value} KPIs`, name]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                No KPI data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-action-progress">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Action Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {actionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={actionChartData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => [`${value} actions`, name]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {actionChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                No action items yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card data-testid="card-recent-actions">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              Recent Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActions.length > 0 ? (
              <div className="space-y-2">
                {recentActions.map((action) => {
                  const effectiveDate = action.revisedDueDate || action.dueDate;
                  const isOverdue =
                    effectiveDate &&
                    effectiveDate < today &&
                    action.status !== "Completed" &&
                    action.status !== "Cancelled";
                  return (
                    <div
                      key={action.id}
                      className={`p-2.5 rounded-lg ${isOverdue ? "bg-red-500/5" : "bg-muted/30"}`}
                      data-testid={`card-action-${action.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-sm font-medium truncate flex-1"
                          data-testid={`text-action-title-${action.id}`}
                        >
                          {action.title}
                        </p>
                        <StatusBadge
                          status={action.status}
                          testId={`badge-action-status-${action.id}`}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                        {action.ownerName && <span>{action.ownerName}</span>}
                        {effectiveDate && (
                          <>
                            <span className="text-border">|</span>
                            <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                              {effectiveDate}
                            </span>
                          </>
                        )}
                        {action.meetingType && (
                          <>
                            <span className="text-border">|</span>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                              data-testid={`badge-meeting-type-${action.id}`}
                            >
                              {action.meetingType}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No actions yet</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-department-summary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Department Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deptSummary.length > 0 ? (
              <div className="space-y-2">
                {deptSummary.map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/30"
                    data-testid={`row-department-${dept.id}`}
                  >
                    <p className="text-sm font-medium truncate" data-testid={`text-dept-name-${dept.id}`}>
                      {dept.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      <span data-testid={`text-dept-kpis-${dept.id}`}>{dept.kpiCount} KPIs</span>
                      <span data-testid={`text-dept-actions-${dept.id}`}>{dept.actionCount} actions</span>
                      {dept.overdueCount > 0 && (
                        <span className="text-red-500 font-medium" data-testid={`text-dept-overdue-${dept.id}`}>
                          {dept.overdueCount} overdue
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No departments yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-latest-review">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-primary" />
                Latest Review
              </CardTitle>
              {latestReview && (
                <StatusBadge status={latestReview.reviewMonth} testId="badge-review-month" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {latestReview ? (
              <div className="space-y-3">
                <p
                  className="text-sm text-muted-foreground leading-relaxed line-clamp-4"
                  data-testid="text-review-summary"
                >
                  {latestReview.overallSummary?.split("\n")[0]}
                </p>
                {latestReview.strengths && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                      Key Strengths
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {latestReview.strengths
                        ?.split("\n")
                        .slice(0, 2)
                        .join("; ")
                        .replace(/^- /gm, "")}
                    </p>
                  </div>
                )}
                {latestReview.gaps && (
                  <div>
                    <p className="text-xs font-semibold text-red-500 mb-1">Key Gaps</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {latestReview.gaps
                        ?.split("\n")
                        .slice(0, 2)
                        .join("; ")
                        .replace(/^- /gm, "")}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No reviews yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
