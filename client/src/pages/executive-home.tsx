import { useEffect, useMemo, useState } from "react";
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
  CalendarDays,
  CheckCircle2,
  Clock,
  Database,
  FileSpreadsheet,
  LayoutDashboard,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";
import type { AnalyticsDashboardDefinition, AnalyticsDataset } from "@shared/schema";
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

const KPI_OVERRIDE_KEY = "ghc_beacon_kpi_override_v1";
const WEIGHTS_KEY = "ghc_beacon_weights_v1";

function loadKpiOverride(deptId: string): KpiDef[] | null {
  try {
    const all = JSON.parse(localStorage.getItem(KPI_OVERRIDE_KEY) || "{}");
    return all[deptId] ?? null;
  } catch {
    return null;
  }
}

function loadWeights(deptId: string): Record<string, number> {
  try {
    const all = JSON.parse(localStorage.getItem(WEIGHTS_KEY) || "{}");
    return all[deptId] || {};
  } catch {
    return {};
  }
}

function scoreForKpi(kpi: KpiDef, actual: number | null) {
  if (actual === null || actual === undefined || Number.isNaN(Number(actual))) return 0;
  if (kpi.lowerIsBetter) {
    return actual === 0 ? 100 : Math.min((kpi.target / actual) * 100, 100);
  }
  if (kpi.target === 0) return 100;
  return Math.min((Number(actual) / kpi.target) * 100, 100);
}

function performanceScore(kpis: KpiDef[], actuals: Record<string, number | null>, weights: Record<string, number>) {
  const withData = kpis.filter(kpi => actuals[kpi.id] !== null && actuals[kpi.id] !== undefined);
  if (!withData.length) return 0;
  const hasUserWeights = withData.some(kpi => (weights[kpi.id] ?? 0) > 0);
  const equalWeight = 100 / withData.length;
  let totalScore = 0;
  let totalWeight = 0;
  for (const kpi of withData) {
    const weight = hasUserWeights ? (weights[kpi.id] ?? 0) : equalWeight;
    totalScore += scoreForKpi(kpi, actuals[kpi.id]) * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
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

function periodLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return `${MONTHS[month - 1]} ${year}`;
}

function scoreColor(score: number) {
  if (score >= 85) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export default function ExecutiveHomePage() {
  const today = new Date();
  const currentPk = periodKey(today.getFullYear(), today.getMonth());
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    try { return localStorage.getItem("ghc_command_center_period") || currentPk; } catch { return currentPk; }
  });
  const [alertTab, setAlertTab] = useState<"scorecard" | "updates" | "dashboards">("scorecard");

  const { data: datasets = [] } = useQuery<AnalyticsDataset[]>({ queryKey: ["/api/v2/analytics/datasets"] });
  const { data: dashboards = [] } = useQuery<AnalyticsDashboardDefinition[]>({ queryKey: ["/api/v2/analytics/definitions"] });
  const { data: apiDepts = [] } = useQuery<ApiBscDepartment[]>({ queryKey: ["/api/scorecard/departments"] });
  const { data: actuals = {} } = useQuery<Record<string, Record<string, number>>>({ queryKey: ["/api/scorecard/actuals"] });

  const depts = useMemo<BscDepartment[]>(() => (
    apiDepts.map(d => ({ id: d.deptId, name: d.name, icon: d.icon, color: d.color }))
  ), [apiDepts]);

  const normalizedStore = useMemo(() => normalizeStore(actuals, depts), [actuals, depts]);

  const availablePeriods = useMemo(() => {
    const periods = new Set<string>([currentPk]);
    Object.keys(normalizedStore).forEach(key => {
      if (/^[0-9]{4}-[0-9]{2}$/.test(key)) periods.add(key);
    });
    return [...periods].sort().reverse();
  }, [currentPk, normalizedStore]);

  useEffect(() => {
    const currentHasData = Object.keys(normalizedStore[currentPk] || {}).length > 0;
    const selectedExists = availablePeriods.includes(selectedPeriod);
    if (!selectedExists && availablePeriods.length > 0) {
      setSelectedPeriod(availablePeriods[0]);
      return;
    }
    if (!currentHasData && selectedPeriod === currentPk) {
      const latestWithData = availablePeriods.find(period => Object.keys(normalizedStore[period] || {}).length > 0);
      if (latestWithData) setSelectedPeriod(latestWithData);
    }
  }, [availablePeriods, currentPk, normalizedStore, selectedPeriod]);

  useEffect(() => {
    try { localStorage.setItem("ghc_command_center_period", selectedPeriod); } catch {}
  }, [selectedPeriod]);

  const scorecard = useMemo(() => {
    const periodActuals = normalizedStore[selectedPeriod] || {};
    const deptStats = depts.map(dept => {
      const kpis = loadKpiOverride(dept.id) ?? getKpisForDept(dept.id);
      const weights = loadWeights(dept.id);
      const values: Record<string, number | null> = {};
      kpis.forEach(kpi => { values[kpi.id] = periodActuals[kpi.id] ?? null; });
      const score = performanceScore(kpis, values, weights);
      const complete = kpis.filter(kpi => values[kpi.id] !== null).length;
      const red = kpis.filter(kpi => getStatus(kpi, values[kpi.id]) === "red").length;
      const amber = kpis.filter(kpi => getStatus(kpi, values[kpi.id]) === "amber").length;
      return { dept, score, complete, total: kpis.length, red, amber };
    });
    const withData = deptStats.filter(item => item.complete > 0);
    const overall = withData.length ? Math.round(withData.reduce((sum, item) => sum + item.score, 0) / withData.length) : 0;
    const completeness = deptStats.length ? Math.round(deptStats.reduce((sum, item) => sum + item.complete / Math.max(1, item.total), 0) / deptStats.length * 100) : 0;
    const focusDepartments = deptStats
      .filter(item => item.complete > 0 && item.score < 85)
      .sort((a, b) => a.score - b.score || b.red - a.red);
    return {
      overall,
      completeness,
      green: deptStats.filter(item => item.score >= 85 && item.complete > 0).length,
      amber: deptStats.filter(item => item.score >= 70 && item.score < 85 && item.complete > 0).length,
      red: deptStats.filter(item => item.score < 70 && item.complete > 0).length,
      noData: deptStats.filter(item => item.complete === 0).length,
      risks: focusDepartments,
      latestPeriod: Object.keys(normalizedStore).sort().at(-1),
    };
  }, [depts, normalizedStore, selectedPeriod]);

  const latestDataset = [...datasets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const latestDashboard = [...dashboards].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const publishedDashboards = dashboards.filter(d => d.status === "published").length;
  const sharedDashboards = dashboards.filter(d => d.shareEnabled).length;
  const recentDashboards = [...dashboards].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4);

  const scorecardAlerts = scorecard.risks.map(item => ({
      icon: item.red > 0 ? AlertCircle : AlertTriangle,
      title: `${item.dept.name} needs attention`,
      detail: `${item.score}% score for ${periodLabel(selectedPeriod)} · ${item.red} red KPI${item.red === 1 ? "" : "s"} · ${item.amber} amber · ${item.complete}/${item.total} populated`,
      href: `/scorecard/department/${item.dept.id}`,
      color: item.red > 0 ? "text-red-500 bg-red-500/10" : "text-amber-500 bg-amber-500/10",
  }));

  const updateAlerts = [
    ...(latestDataset ? [{
      icon: Database,
      title: "Latest analytics upload",
      detail: `${latestDataset.name} · ${fmtDate(latestDataset.updatedAt)} · ${latestDataset.rowCount ?? 0} rows`,
      href: `/analytics/datasets/${latestDataset.id}/explore`,
      color: "text-blue-500 bg-blue-500/10",
    }] : []),
    ...(latestDashboard ? [{
      icon: LayoutDashboard,
      title: "Latest dashboard update",
      detail: `${latestDashboard.title} · ${fmtDate(latestDashboard.updatedAt)} · ${latestDashboard.status}`,
      href: `/analytics/dashboards/${latestDashboard.id}`,
      color: "text-primary bg-primary/10",
    }] : []),
  ];

  const dashboardAlerts = recentDashboards.map(dashboard => ({
    icon: LayoutDashboard,
    title: dashboard.title,
    detail: `${dashboard.status} · ${dashboard.shareEnabled ? "Shared" : "Private"} · Updated ${fmtDate(dashboard.updatedAt)}`,
    href: `/analytics/dashboards/${dashboard.id}`,
    color: dashboard.status === "published" ? "text-emerald-500 bg-emerald-500/10" : "text-blue-500 bg-blue-500/10",
  }));

  const currentAlerts = alertTab === "scorecard" ? scorecardAlerts : alertTab === "updates" ? updateAlerts : dashboardAlerts;

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_12%_0%,hsl(var(--primary)/0.14),transparent_32%),radial-gradient(circle_at_88%_10%,rgba(14,165,233,0.13),transparent_30%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.22))]">
      <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
        <section className="rounded-[2rem] border bg-card/80 overflow-hidden shadow-xl shadow-primary/5 backdrop-blur">
          <div className="relative p-6 lg:p-8 bg-[linear-gradient(135deg,hsl(var(--card)/0.95),hsl(var(--primary)/0.08)),radial-gradient(circle_at_top_right,hsl(var(--primary)/0.25),transparent_36%)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-primary to-violet-500" />
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
              <div className="space-y-4 max-w-3xl">
                <Badge variant="outline" className="gap-1.5 bg-background/70 border-primary/20 shadow-sm" data-testid="badge-executive-view">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Executive Command Center
                </Badge>
                <div>
                  <h1 className="text-3xl lg:text-5xl font-bold tracking-tight leading-tight">
                    Performance command view for <span className="text-primary">{periodLabel(selectedPeriod)}</span>
                  </h1>
                  <p className="text-muted-foreground mt-3 max-w-2xl text-base">
                    A sharper executive view across KPI health, below-target departments, dashboard activity, and action alerts.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">{scorecard.risks.length} departments below 85%</span>
                  <span className="rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">{scorecard.noData} departments awaiting data</span>
                  <span className="rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">{scorecard.completeness}% KPI completeness</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 xl:items-center">
                <div className="flex items-center gap-2 rounded-xl border bg-background/80 px-3 py-2 shadow-sm">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <select
                    value={selectedPeriod}
                    onChange={(event) => setSelectedPeriod(event.target.value)}
                    className="bg-transparent text-sm font-semibold outline-none"
                    data-testid="select-command-period"
                  >
                    {availablePeriods.map(period => (
                      <option key={period} value={period}>{periodLabel(period)}</option>
                    ))}
                  </select>
                </div>
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
          <Card className="overflow-hidden border-0 shadow-md bg-card/90">
            <CardContent className="p-5 relative">
              <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-primary/10" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Overall performance</p>
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <p className={`text-4xl font-bold mt-3 ${scoreColor(scorecard.overall)}`} data-testid="text-overall-performance">{scorecard.overall}%</p>
              <p className="text-xs text-muted-foreground mt-1">Average of departments with data · {scorecard.green} green · {scorecard.amber} amber · {scorecard.red} red</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-0 shadow-md bg-card/90">
            <CardContent className="p-5 relative">
              <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-emerald-500/10" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Scorecard data completeness</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-4xl font-bold mt-3" data-testid="text-scorecard-completeness">{scorecard.completeness}%</p>
              <p className="text-xs text-muted-foreground mt-1">Latest KPI data: {scorecard.latestPeriod || "No KPI data yet"}</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-0 shadow-md bg-card/90">
            <CardContent className="p-5 relative">
              <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-blue-500/10" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Analytics dashboards</p>
                <LayoutDashboard className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-4xl font-bold mt-3" data-testid="text-dashboard-count">{dashboards.length}</p>
              <p className="text-xs text-muted-foreground mt-1">{publishedDashboards} published · {sharedDashboards} shared</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-0 shadow-md bg-card/90">
            <CardContent className="p-5 relative">
              <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-cyan-500/10" />
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

        <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <Card className="shadow-md bg-card/90">
            <CardHeader className="pb-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                  Decision alerts
                </CardTitle>
                <div className="flex rounded-xl border bg-muted/40 p-1">
                  {[
                    { key: "scorecard" as const, label: "Scorecard", count: scorecardAlerts.length },
                    { key: "updates" as const, label: "Updates", count: updateAlerts.length },
                    { key: "dashboards" as const, label: "Dashboards", count: dashboardAlerts.length },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setAlertTab(tab.key)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${alertTab === tab.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      data-testid={`tab-alerts-${tab.key}`}
                    >
                      {tab.label} <span className="ml-1 opacity-70">{tab.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {currentAlerts.length > 0 ? currentAlerts.map((item, index) => (
                <Link key={`${item.title}-${index}`} href={item.href}>
                  <button className="w-full flex items-center gap-3 rounded-2xl border p-4 text-left hover:bg-muted/40 transition-colors bg-background/50" data-testid={`button-decision-alert-${index}`}>
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{item.detail}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </Link>
              )) : (
                <div className="py-10 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                  <p className="font-semibold">No alerts in this tab right now</p>
                  <p className="text-sm text-muted-foreground">Choose another tab to review scorecard, update, or dashboard activity.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md bg-card/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-blue-500" />
                Analytics dashboards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentDashboards.length > 0 ? recentDashboards.map(dashboard => (
                <Link key={dashboard.id} href={`/analytics/dashboards/${dashboard.id}`}>
                  <button className="w-full rounded-2xl border p-3 text-left hover:bg-muted/40 transition-colors bg-background/50" data-testid={`button-dashboard-${dashboard.id}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{dashboard.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{dashboard.status} · {dashboard.shareEnabled ? "Shared externally" : "Internal only"}</p>
                      </div>
                      <Badge variant={dashboard.status === "published" ? "default" : "secondary"}>{dashboard.status}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Updated {fmtDate(dashboard.updatedAt)}
                    </p>
                  </button>
                </Link>
              )) : (
                <div className="rounded-xl border border-dashed p-6 text-center">
                  <LayoutDashboard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-semibold">No dashboards yet</p>
                  <p className="text-xs text-muted-foreground">Published dashboards will appear here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2 shadow-md bg-card/90">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-violet-500" />
                  Departments needing leadership focus
                </CardTitle>
                <Badge variant="secondary" data-testid="badge-focus-count">Below 85%: {scorecard.risks.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scorecard.risks.length > 0 ? scorecard.risks.map(item => (
                  <Link key={item.dept.id} href={`/scorecard/department/${item.dept.id}`}>
                    <button className="w-full rounded-2xl border p-4 text-left hover:bg-muted/40 transition-colors bg-background/60" data-testid={`button-risk-dept-${item.dept.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.dept.color}18` }}>{item.dept.icon}</span>
                          <div>
                            <p className="font-semibold">{item.dept.name}</p>
                            <p className="text-[10px] text-muted-foreground">Target threshold: 85%</p>
                          </div>
                        </div>
                        <span className={`text-xl font-bold ${scoreColor(item.score)}`}>{item.score}%</span>
                      </div>
                      <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={item.score >= 70 ? "h-full bg-amber-500 rounded-full" : "h-full bg-red-500 rounded-full"}
                          style={{ width: `${Math.min(100, item.score)}%` }}
                        />
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

          <Card className="shadow-md bg-card/90">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Score calculation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border bg-background/50 p-4">
                <p className="text-sm font-semibold">Overall performance = average department score</p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Each department score is calculated from populated KPIs for {periodLabel(selectedPeriod)}. KPI achievement is capped at 100%, lower-is-better KPIs are inverted, and saved KPI weights are used when present. The Command Center then averages departments that have data.
                </p>
              </div>
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