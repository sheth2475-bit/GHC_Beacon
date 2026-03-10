import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, ListChecks, AlertTriangle, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { ActionItem, MonthlyReview } from "@shared/schema";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalKpis: number; onTrack: number; belowTarget: number;
    totalActions: number; overdueActions: number; completedActions: number;
  }>({ queryKey: ["/api/dashboard-stats"] });

  const { data: actions } = useQuery<ActionItem[]>({ queryKey: ["/api/action-items"] });
  const { data: reviews } = useQuery<MonthlyReview[]>({ queryKey: ["/api/monthly-reviews"] });

  const kpiChartData = stats ? [
    { name: "On Track", value: stats.onTrack, fill: "hsl(var(--chart-2))" },
    { name: "Below Target", value: stats.belowTarget, fill: "hsl(var(--destructive))" },
    { name: "No Data", value: Math.max(0, stats.totalKpis - stats.onTrack - stats.belowTarget), fill: "hsl(var(--muted))" },
  ] : [];

  const actionChartData = stats ? [
    { name: "Completed", count: stats.completedActions },
    { name: "Overdue", count: stats.overdueActions },
    { name: "Active", count: Math.max(0, stats.totalActions - stats.completedActions - stats.overdueActions) },
  ] : [];

  const recentActions = actions?.slice(0, 5) || [];
  const latestReview = reviews?.[0];

  if (statsLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Total KPIs", value: stats?.totalKpis || 0, icon: Target, color: "text-primary" },
    { title: "On Track", value: stats?.onTrack || 0, icon: CheckCircle2, color: "text-chart-2" },
    { title: "Below Target", value: stats?.belowTarget || 0, icon: AlertTriangle, color: "text-destructive" },
    { title: "Total Actions", value: stats?.totalActions || 0, icon: ListChecks, color: "text-primary" },
    { title: "Overdue", value: stats?.overdueActions || 0, icon: Clock, color: "text-destructive" },
    { title: "Completed", value: stats?.completedActions || 0, icon: TrendingUp, color: "text-chart-2" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">Your business performance at a glance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs text-muted-foreground">{stat.title}</p>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold mt-1" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">KPI Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.totalKpis > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={kpiChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                    {kpiChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No KPI data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Action Status</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.totalActions > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={actionChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No action data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActions.length > 0 ? (
              <div className="space-y-3">
                {recentActions.map((action) => (
                  <div key={action.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" data-testid={`text-action-title-${action.id}`}>{action.title}</p>
                      <p className="text-xs text-muted-foreground">{action.ownerName} | Due: {action.dueDate}</p>
                    </div>
                    <Badge
                      variant={action.status === "Completed" ? "default" : action.status === "Delayed" ? "destructive" : "secondary"}
                      data-testid={`badge-action-status-${action.id}`}
                    >
                      {action.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No actions yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Latest Monthly Review</CardTitle>
          </CardHeader>
          <CardContent>
            {latestReview ? (
              <div className="space-y-2">
                <Badge variant="secondary" data-testid="badge-review-month">{latestReview.reviewMonth}</Badge>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6" data-testid="text-review-summary">
                  {latestReview.overallSummary}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No reviews yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
