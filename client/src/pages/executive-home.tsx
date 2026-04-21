import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  FileSpreadsheet,
  LayoutDashboard,
  Lightbulb,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { AnalyticsDashboardDefinition, AnalyticsDataset, AnalyticsInsight } from "@shared/schema";
import {
  getKpisForDept,
  getStatus,
  periodKey,
  MONTHS,
  type BscDepartment,
  type KpiDef,
} from "@/lib/scorecard-data";

interface ApiBscDepartment {
  deptId: string;
  name: string;
  icon: string;
  color: string;
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "No update yet";
  const date = new Date(d);
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function scoreForKpi(kpi: KpiDef, actual: number | null) {
  if (actual === null || actual === undefined || Number.isNaN(Number(actual))) return null;
  if (kpi.lowerIsBetter) {
    if (kpi.target === 0) return actual === 0 ? 100 : 0;
    return Math.max(0, Math.min(140, (1 - (actual - kpi.target) / Math.abs(kpi.target)) * 100));
  }
  if (kpi.target === 0) return 100;
  return Math.max(0, Math.min(140, (Number(actual) / kpi.target) * 100));
}

function performanceScore(kpis: KpiDef[], actuals: Record<string, number | null>) {
  const scores = kpis.map(kpi => scoreForKpi(kpi, actuals[kpi.id])).filter((v): v is number => v !== null);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

function normalizeStore(store: Record<string, Record<string, number>>, depts: BscDepartment[]) {
  const current: Record<string, Record<string, number>> = {};
  const deptIds = new Set(depts.map(d => d.id));
  for (const [key, values] of Object.entries(store || {})) {
    const match = key.match(/^(.+)_([0-9]{4}-[0-9]{2})$/);
    const pk = match && deptIds.has(match[1]) ? match[2] : key;
    current[pk] = { ...(current[pk] || {}), ...values };
  }
  return current;
}

function freshnessClass(date: string | Date | null | undefined) {
  if (!date) return "text-red-600 dark:text-red-400";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 7) return "text-emerald-600 dark:text-emerald-400";
  if (days <= 30) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export default function ExecutiveHomePage() {
  const today = new Date();
  const currentPk = periodKey(today.getFullYear(), today.getMonth());
  const monthLabel = `${MONTHS[today.getMonth()]} ${today.getFullYear()}`;

  const { data: datasets = [] } = useQuery<AnalyticsDataset[]>({ queryKey: ["/api/v2/analytics/datasets"] });
  const { data: insights = [] } = useQuery<AnalyticsInsight[]>({ queryKey: ["/api/v2/analytics/insights"] });
  const { data: dashboards = [] } = useQuery<AnalyticsDashboardDefinition[]>({ queryKey: ["/api/v2/analytics/definitions"] });
  const { data: apiDepts = [] } = useQuery<ApiBscDepartment[]>({ queryKey: ["/api/scorecard/departments"] });
  const { data: actuals = {} } = useQuery<Record<string, Record<string, number>>>({ queryKey: ["/api/scorecard/actuals"] });

  const depts = useMemo<BscDepartment[]>(() => (
    apiDepts.map(d => ({ id: d.deptId, name: d.name, icon: d.icon, color: d.color }))
  ), [apiDepts]);

  const scorecard = useMemo(() => {
    const normalized = normalizeStore(actuals, depts);
    const periodActuals = normalized[currentPk] || {};
    const deptStats = depts.map(dept => {
      const kpis = getKpisForDept(dept.id);
      const values: Record<string, number | null> = {};
      kpis.forEach(kpi => { values[kpi.id] = periodActuals[kpi.id] ?? null; });
      const score = performanceScore(kpis, values);
      const complete = kpis.filter(kpi => values[kpi.id] !== null).length;
      const red = kpis.filter(kpi => getStatus(kpi, values[kpi.id]) === "red").length;
      const amber = kpis.filter(kpi => getStatus(kpi, values[kpi.id]) === "amber").length;
      return { dept, score, complete, total: kpis.length, red, amber };
    });
    const withData = deptStats.filter(item => item.complete > 0);
    const overall = withData.length ? Math.round(withData.reduce((sum, item) => sum + item.score, 0) / withData.length) : 0;
    const completeness = deptStats.length ? Math.round(deptStats.reduce((sum, item) => sum + item.complete / Math.max(1, item.total), 0) / deptStats.length * 100) : 0;
    return {
      overall,
      completeness,
      green: deptStats.filter(item => item.score >= 85 && item.complete > 0).length,
      amber: deptStats.filter(item => item.score >= 70 && item.score < 85 && item.complete > 0).length,
      red: deptStats.filter(item => item.score < 70 && item.complete > 0).length,
      noData: deptStats.filter(item => item.complete === 0).length,
      risks: deptStats.filter(item => item.red > 0 || item.score < 70).sort((a, b) => b.red - a.red || a.score - b.score).slice(0, 4),
      latestPeriod: Object.keys(normalized).sort().at(-1),
    };
  }, [actuals, currentPk, depts]);

  const latestDataset = [...datasets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const latestDashboard = [...dashboards].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const latestInsight = [...insights].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const publishedDashboards = dashboards.filter(d => d.status === "published").length;
  const sharedDashboards = dashboards.filter(d => d.shareEnabled).length;

  const decisionAlerts = [
    ...scorecard.risks.map(item => ({
      icon: item.red > 0 ? AlertCircle : AlertTriangle,
      title: `${item.dept.name} needs attention`,
      detail: `${item.score}% score · ${item.red} red KPI${item.red === 1 ? "" : "s"} · ${item.amber} amber`,
      href: `/scorecard/department/${item.dept.id}`,
      color: item.red > 0 ? "text-red-500 bg-red-500/10" : "text-amber-500 bg-amber-500/10",
    })),
    ...(latestDataset ? [{
      icon: Database,
      title: "Latest analytics upload",
      detail: `${latestDataset.name} · ${fmtDate(latestDataset.updatedAt)}`,
      href: `/analytics/datasets/${latestDataset.id}/explore`,
      color: "text-blue-500 bg-blue-500/10",
    }] : []),
    ...(latestInsight ? [{
      icon: Lightbulb,
      title: "Latest AI insight",
      detail: latestInsight.title,
      href: `/analytics/datasets/${latestInsight.datasetId}/explore?insightId=${latestInsight.id}`,
      color: "text-violet-500 bg-violet-500/10",
    }] : []),
  ].slice(0, 6);

  return (
    <div className="min-h-full bg-gradient-to-b from-background via-background to-muted/20">
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
        <section className="rounded-3xl border bg-card overflow-hidden">
          <div className="relative p-6 lg:p-8 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.35))]">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="space-y-4 max-w-3xl">
                <Badge variant="outline" className="gap-1.5 bg-background/70" data-testid="badge-executive-view">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Executive Command Center
                </Badge>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Good morning. Here is what needs attention.</h1>
                  <p className="text-muted-foreground mt-2 max-w-2xl">
                    A leadership view across performance, analytics intelligence, freshness and decision alerts for {monthLabel}.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/analytics">
                  <Button variant="outline" className="gap-2" data-testid="button-open-analytics">
                    <BarChart3 className="h-4 w-4" /> Analytics
                  </Button>
                </Link>
                <Link href="/scorecard">
                  <Button className="gap-2" data-testid="button-open-scorecard">
                    <Target className="h-4 w-4" /> Scorecard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Overall performance</p>
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <p className="text-4xl font-bold mt-3" data-testid="text-overall-performance">{scorecard.overall}%</p>
              <p className="text-xs text-muted-foreground mt-1">{scorecard.green} green · {scorecard.amber} amber · {scorecard.red} red</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Scorecard data completeness</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-4xl font-bold mt-3" data-testid="text-scorecard-completeness">{scorecard.completeness}%</p>
              <p className="text-xs text-muted-foreground mt-1">Latest KPI data: {scorecard.latestPeriod || "No KPI data yet"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Analytics dashboards</p>
                <LayoutDashboard className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-4xl font-bold mt-3" data-testid="text-dashboard-count">{dashboards.length}</p>
              <p className="text-xs text-muted-foreground mt-1">{publishedDashboards} published · {sharedDashboards} shared</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Latest upload</p>
                <FileSpreadsheet className="h-4 w-4 text-cyan-500" />
              </div>
              <p className={`text-2xl font-bold mt-4 ${freshnessClass(latestDataset?.updatedAt)}`} data-testid="text-latest-upload">
                {fmtDate(latestDataset?.updatedAt)}
              </p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{latestDataset?.name || "No analytics upload yet"}</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                Decision alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {decisionAlerts.length > 0 ? decisionAlerts.map((item, index) => (
                <Link key={`${item.title}-${index}`} href={item.href}>
                  <button className="w-full flex items-center gap-3 rounded-xl border p-3 text-left hover:bg-muted/40 transition-colors" data-testid={`button-decision-alert-${index}`}>
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </Link>
              )) : (
                <div className="py-10 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                  <p className="font-semibold">No critical alerts right now</p>
                  <p className="text-sm text-muted-foreground">Scorecard and analytics signals are clear.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Data freshness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Analytics data</p>
                    <p className="text-xs text-muted-foreground">Last upload or dataset replacement</p>
                  </div>
                  <span className={`text-sm font-bold ${freshnessClass(latestDataset?.updatedAt)}`} data-testid="text-analytics-freshness">
                    {fmtDate(latestDataset?.updatedAt)}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Dashboard intelligence</p>
                    <p className="text-xs text-muted-foreground">Last dashboard update</p>
                  </div>
                  <span className={`text-sm font-bold ${freshnessClass(latestDashboard?.updatedAt)}`} data-testid="text-dashboard-freshness">
                    {fmtDate(latestDashboard?.updatedAt)}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Balanced Scorecard</p>
                    <p className="text-xs text-muted-foreground">Latest KPI reporting period</p>
                  </div>
                  <span className="text-sm font-bold text-foreground" data-testid="text-bsc-freshness">
                    {scorecard.latestPeriod || "No KPI data"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-violet-500" />
                Departments needing leadership focus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scorecard.risks.length > 0 ? scorecard.risks.map(item => (
                  <Link key={item.dept.id} href={`/scorecard/department/${item.dept.id}`}>
                    <button className="w-full rounded-xl border p-4 text-left hover:bg-muted/40 transition-colors" data-testid={`button-risk-dept-${item.dept.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{item.dept.icon}</span>
                          <p className="font-semibold">{item.dept.name}</p>
                        </div>
                        <span className={item.score < 70 ? "text-red-500 font-bold" : "text-amber-500 font-bold"}>{item.score}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">{item.complete}/{item.total} KPIs populated · {item.red} red · {item.amber} amber</p>
                    </button>
                  </Link>
                )) : (
                  <div className="md:col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold">No departments are currently off track.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Analytics intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {latestInsight ? (
                <Link href={`/analytics/datasets/${latestInsight.datasetId}/explore?insightId=${latestInsight.id}`}>
                  <button className="w-full rounded-xl border p-3 text-left hover:bg-muted/40 transition-colors" data-testid="button-latest-insight">
                    <p className="text-sm font-semibold line-clamp-2">{latestInsight.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{latestInsight.question}</p>
                  </button>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">No AI insights saved yet.</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Link href="/analytics?tab=dashboards">
                  <Button variant="outline" className="w-full gap-1.5" data-testid="button-view-dashboards">
                    <LayoutDashboard className="h-3.5 w-3.5" /> Dashboards
                  </Button>
                </Link>
                <Link href="/analytics?tab=datasets">
                  <Button variant="outline" className="w-full gap-1.5" data-testid="button-view-datasets">
                    <Database className="h-3.5 w-3.5" /> Datasets
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}