import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Target, ListChecks, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, ArrowUpRight, BarChart3, Activity, LayoutDashboard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import type { ActionItem, MonthlyReview } from "@shared/schema";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalKpis: number; onTrack: number; belowTarget: number;
    totalActions: number; overdueActions: number; completedActions: number;
  }>({ queryKey: ["/api/dashboard-stats"] });

  const { data: actions } = useQuery<ActionItem[]>({ queryKey: ["/api/action-items"] });
  const { data: reviews } = useQuery<MonthlyReview[]>({ queryKey: ["/api/monthly-reviews"] });
  const { data: kpis } = useQuery<Kpi[]>({ queryKey: ["/api/kpis"] });

  const kpiStatusData = stats ? [
    { name: "On Track", value: stats.onTrack, fill: "#10b981" },
    { name: "At Risk", value: Math.max(0, stats.totalKpis - stats.onTrack - stats.belowTarget), fill: "#f59e0b" },
    { name: "Below Target", value: stats.belowTarget, fill: "#ef4444" },
  ].filter(d => d.value > 0) : [];

  const actionChartData = stats ? [
    { name: "Completed", count: stats.completedActions, fill: "#10b981" },
    { name: "Active", count: Math.max(0, stats.totalActions - stats.completedActions - stats.overdueActions), fill: "#3b82f6" },
    { name: "Overdue", count: stats.overdueActions, fill: "#ef4444" },
  ].filter(d => d.count > 0) : [];

  const today = new Date().toISOString().split("T")[0];
  const recentActions = (actions || []).slice(0, 6);
  const latestReview = reviews?.[0];
  const overdueCount = (actions || []).filter(a => a.dueDate && a.dueDate < today && a.status !== "Completed" && a.status !== "Cancelled").length;

  if (statsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-56 mb-1" />
        <Skeleton className="h-4 w-80" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-4 w-20 mb-3" /><Skeleton className="h-8 w-14" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6"><Skeleton className="h-[240px]" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-[240px]" /></CardContent></Card>
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Total KPIs", value: stats?.totalKpis || 0, icon: Target, color: "text-primary", bg: "bg-primary/10" },
    { title: "On Track", value: stats?.onTrack || 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { title: "Below Target", value: stats?.belowTarget || 0, icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10" },
    { title: "Total Actions", value: stats?.totalActions || 0, icon: ListChecks, color: "text-blue-600", bg: "bg-blue-500/10" },
    { title: "Overdue", value: overdueCount, icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: "Completed", value: stats?.completedActions || 0, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dashboard"
        description="Business performance overview"
        icon={LayoutDashboard}
        testId="text-dashboard-title"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover-elevate">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-3xl font-bold tabular-nums" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
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
                  <Pie data={kpiStatusData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value" stroke="none">
                    {kpiStatusData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} formatter={(value: string) => <span className="text-xs text-foreground">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                No KPI data yet — use KPI Builder to get started
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
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
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              Recent Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActions.length > 0 ? (
              <div className="space-y-3">
                {recentActions.map((action) => {
                  const isOverdue = action.dueDate && action.dueDate < today && action.status !== "Completed" && action.status !== "Cancelled";
                  return (
                    <div key={action.id} className={`flex items-center justify-between gap-3 p-2.5 rounded-lg ${isOverdue ? "bg-red-500/5" : "bg-muted/30"}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" data-testid={`text-action-title-${action.id}`}>{action.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{action.ownerName}</span>
                          {action.dueDate && (
                            <>
                              <span className="text-border">|</span>
                              <span className={isOverdue ? "text-red-500 font-medium" : ""}>{action.dueDate}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={action.status} testId={`badge-action-status-${action.id}`} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No actions yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
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
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4" data-testid="text-review-summary">
                  {latestReview.overallSummary?.split("\n")[0]}
                </p>
                {latestReview.strengths && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Key Strengths</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{latestReview.strengths?.split("\n").slice(0, 2).join("; ").replace(/^- /gm, "")}</p>
                  </div>
                )}
                {latestReview.gaps && (
                  <div>
                    <p className="text-xs font-semibold text-red-500 mb-1">Key Gaps</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{latestReview.gaps?.split("\n").slice(0, 2).join("; ").replace(/^- /gm, "")}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No reviews yet — generate one from Monthly Reviews</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
