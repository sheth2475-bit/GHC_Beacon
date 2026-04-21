import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell, AlertTriangle, AlertCircle, CheckCircle2, ChevronRight,
  BarChart2, Activity, TrendingDown, Database, LayoutDashboard, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  loadStore, loadDepartments, getKpisForDept, getStatus, periodKey, MONTHS,
  type KpiDef, type BscDepartment,
} from "@/lib/scorecard-data";

interface AnalyticsDefinition {
  id: number; title: string; status: string; shareEnabled: boolean;
  updatedAt: string; narrativeSummary?: string | null;
}

interface AnalyticsDataset {
  id: number; name: string; fileName?: string | null; updatedAt: string; rowCount?: number | null;
}

interface KpiAlert {
  kpi: KpiDef;
  dept: BscDepartment;
  severity: "red" | "amber";
  actual: number;
}

export function NotificationBell() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  const { data: dbActuals } = useQuery<Record<string, Record<string, number>>>({
    queryKey: ["/api/scorecard/actuals"],
  });

  const { data: dbDepts } = useQuery<{ deptId: string; name: string; icon: string; color: string }[]>({
    queryKey: ["/api/scorecard/departments"],
  });

  const { data: analyticsDefs = [] } = useQuery<AnalyticsDefinition[]>({
    queryKey: ["/api/v2/analytics/definitions"],
  });

  const { data: analyticsDatasets = [] } = useQuery<AnalyticsDataset[]>({
    queryKey: ["/api/v2/analytics/datasets"],
  });

  const today = new Date();
  const currentPk = periodKey(today.getFullYear(), today.getMonth());

  const alerts = useMemo<KpiAlert[]>(() => {
    const store = loadStore();
    const localDepts = loadDepartments();

    const depts: BscDepartment[] = dbDepts
      ? dbDepts.map(d => ({ id: d.deptId, name: d.name, icon: d.icon, color: d.color }))
      : localDepts;

    const mergedStore = dbActuals
      ? { ...store, ...Object.fromEntries(Object.entries(dbActuals).map(([pk, vals]) => [pk, { ...(store[pk] || {}), ...vals }])) }
      : store;

    const periodActuals = mergedStore[currentPk] || {};
    const results: KpiAlert[] = [];

    for (const dept of depts) {
      const kpis = getKpisForDept(dept.id);
      for (const kpi of kpis) {
        const actual = periodActuals[kpi.id];
        if (actual === undefined || actual === null) continue;
        const st = getStatus(kpi, actual);
        if (st === "red" || st === "amber") {
          results.push({ kpi, dept, severity: st, actual });
        }
      }
    }

    return results.sort((a, b) => {
      if (a.severity === "red" && b.severity !== "red") return -1;
      if (a.severity !== "red" && b.severity === "red") return 1;
      return 0;
    });
  }, [dbActuals, dbDepts, currentPk]);

  const redAlerts = alerts.filter(a => a.severity === "red");
  const amberAlerts = alerts.filter(a => a.severity === "amber");

  const publishedDashboards = analyticsDefs.filter(d => d.status === "published");
  const sharedDashboards = analyticsDefs.filter(d => d.shareEnabled);
  const latestDataset = [...analyticsDatasets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const latestDashboard = [...analyticsDefs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

  const totalCount = redAlerts.length + amberAlerts.length;

  const monthLabel = `${MONTHS[today.getMonth()]} ${today.getFullYear()}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          data-testid="button-notification-bell"
        >
          <Bell className="h-4 w-4" />
          {totalCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none"
              data-testid="badge-notification-count"
            >
              {totalCount > 9 ? "9+" : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-84 p-0 w-[340px]" data-testid="popover-notifications">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h3 className="text-sm font-semibold">Notifications</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">{monthLabel} · Scorecard & Analytics</p>
          </div>
          {totalCount > 0
            ? <span className="text-xs font-medium text-red-500">{totalCount} need attention</span>
            : <span className="text-xs text-muted-foreground">All clear</span>
          }
        </div>

        <ScrollArea className="max-h-[420px]">
          {/* ── Analytics Studio summary ────────────────────────────── */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={() => { setLocation("/analytics"); setOpen(false); }}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BarChart2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">Analytics Studio</p>
              <p className="text-[10px] text-muted-foreground">
                {analyticsDatasets.length} dataset{analyticsDatasets.length !== 1 ? "s" : ""}
                {publishedDashboards.length > 0 && ` · ${publishedDashboards.length} published`}
                {sharedDashboards.length > 0 && ` · ${sharedDashboards.length} shared`}
              </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </div>

          {(latestDataset || latestDashboard) && (
            <div className="border-b">
              <div className="px-4 pt-3 pb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Data updates
                </span>
              </div>
              {latestDataset && (
                <button
                  className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-muted/50 text-left transition-colors"
                  onClick={() => { setLocation(`/analytics/datasets/${latestDataset.id}/explore`); setOpen(false); }}
                  data-testid="notif-latest-dataset"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 mt-0.5">
                    <Database className="h-3 w-3 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">Analytics data updated</p>
                    <p className="text-[10px] text-muted-foreground truncate">{latestDataset.name}</p>
                  </div>
                </button>
              )}
              {latestDashboard && (
                <button
                  className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-muted/50 text-left transition-colors"
                  onClick={() => { setLocation(`/analytics/dashboards/${latestDashboard.id}`); setOpen(false); }}
                  data-testid="notif-latest-dashboard"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                    <LayoutDashboard className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">Dashboard intelligence updated</p>
                    <p className="text-[10px] text-muted-foreground truncate">{latestDashboard.title}</p>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* ── Scorecard alerts ──────────────────────────────────────── */}
          {totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-500 mb-2" />
              <p className="text-sm font-medium">Scorecard looks healthy!</p>
              <p className="text-xs text-muted-foreground mt-0.5">No KPIs are off track this month</p>
            </div>
          ) : (
            <>
              {/* Off Track (red) */}
              {redAlerts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Off Track ({redAlerts.length})
                    </span>
                    <button
                      className="text-[10px] text-primary hover:underline"
                      onClick={() => { setLocation("/scorecard"); setOpen(false); }}
                    >
                      View scorecard <ChevronRight className="h-2.5 w-2.5 inline" />
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {redAlerts.slice(0, 6).map(({ kpi, dept, actual }) => (
                      <button
                        key={kpi.id}
                        className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-muted/50 text-left transition-colors"
                        onClick={() => { setLocation(`/scorecard/kpi/${kpi.id}`); setOpen(false); }}
                        data-testid={`notif-kpi-${kpi.id}`}
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mt-0.5">
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{kpi.name}</p>
                          <p className="text-[10px] text-muted-foreground">{dept.icon} {dept.name} · {kpi.perspective}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-bold text-red-500">{actual}{kpi.unit}</p>
                          <p className="text-[10px] text-muted-foreground">tgt {kpi.target}{kpi.unit}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* At Risk (amber) */}
              {amberAlerts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> At Risk ({amberAlerts.length})
                    </span>
                    <button
                      className="text-[10px] text-primary hover:underline"
                      onClick={() => { setLocation("/scorecard"); setOpen(false); }}
                    >
                      View scorecard <ChevronRight className="h-2.5 w-2.5 inline" />
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {amberAlerts.slice(0, 5).map(({ kpi, dept, actual }) => (
                      <button
                        key={kpi.id}
                        className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-muted/50 text-left transition-colors"
                        onClick={() => { setLocation(`/scorecard/kpi/${kpi.id}`); setOpen(false); }}
                        data-testid={`notif-kpi-risk-${kpi.id}`}
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mt-0.5">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{kpi.name}</p>
                          <p className="text-[10px] text-muted-foreground">{dept.icon} {dept.name} · {kpi.perspective}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] font-bold text-amber-500">{actual}{kpi.unit}</p>
                          <p className="text-[10px] text-muted-foreground">tgt {kpi.target}{kpi.unit}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <div className="h-3" />
        </ScrollArea>

        {/* Footer — quick nav */}
        <div className="border-t border-border/50 grid grid-cols-2 divide-x divide-border/50">
          <button
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            onClick={() => { setLocation("/analytics"); setOpen(false); }}
            data-testid="notif-goto-analytics"
          >
            <BarChart2 className="h-3 w-3" /> Analytics Studio
          </button>
          <button
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            onClick={() => { setLocation("/scorecard"); setOpen(false); }}
            data-testid="notif-goto-scorecard"
          >
            <Activity className="h-3 w-3" /> Balanced Scorecard
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
