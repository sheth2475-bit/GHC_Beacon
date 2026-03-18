import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, AlertTriangle, Target, Flag, CheckCircle2, ChevronRight } from "lucide-react";
import type { ActionItem, KpiActual, Milestone } from "@shared/schema";

export function NotificationBell() {
  const [, setLocation] = useLocation();

  const { data: actions = [] } = useQuery<ActionItem[]>({ queryKey: ["/api/action-items"] });
  const { data: allActuals = [] } = useQuery<(KpiActual & { kpiName: string })[]>({
    queryKey: ["/api/kpi-actuals/company"],
  });
  const { data: milestones = [] } = useQuery<Milestone[]>({ queryKey: ["/api/milestones"] });

  const today = new Date().toISOString().split("T")[0];

  const overdueActions = actions.filter(a => {
    const eff = a.revisedDueDate || a.dueDate;
    return eff && eff < today && a.status !== "Completed" && a.status !== "Cancelled";
  }).sort((a, b) => (a.revisedDueDate || a.dueDate || "").localeCompare(b.revisedDueDate || b.dueDate || ""));

  const latestActualByKpi: Record<number, KpiActual & { kpiName: string }> = {};
  for (const a of allActuals) {
    const existing = latestActualByKpi[a.kpiId];
    if (!existing || a.reviewMonth > existing.reviewMonth) latestActualByKpi[a.kpiId] = a;
  }
  const atRiskKpis = Object.values(latestActualByKpi).filter(a =>
    a.status === "Amber" || a.status === "Below Target"
  );

  const in3Days = new Date();
  in3Days.setDate(in3Days.getDate() + 3);
  const in3DaysStr = in3Days.toISOString().split("T")[0];
  const urgentMilestones = milestones.filter(m =>
    m.status !== "Completed" && m.dueDate && m.dueDate >= today && m.dueDate <= in3DaysStr
  );

  const totalCount = overdueActions.length + atRiskKpis.length + urgentMilestones.length;

  function daysLate(date: string) {
    return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  }

  return (
    <Popover>
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
      <PopoverContent align="end" className="w-80 p-0" data-testid="popover-notifications">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {totalCount > 0 ? (
            <span className="text-xs text-muted-foreground">{totalCount} items need attention</span>
          ) : (
            <span className="text-xs text-muted-foreground">All clear</span>
          )}
        </div>

        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-0.5">No overdue items or at-risk KPIs</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[360px]">
            {/* Overdue Actions */}
            {overdueActions.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Overdue Actions ({overdueActions.length})
                  </span>
                  <button
                    className="text-[10px] text-primary hover:underline"
                    onClick={() => setLocation("/actions")}
                  >
                    View all <ChevronRight className="h-2.5 w-2.5 inline" />
                  </button>
                </div>
                <div className="divide-y divide-border">
                  {overdueActions.slice(0, 5).map(a => {
                    const eff = a.revisedDueDate || a.dueDate || "";
                    const days = eff ? daysLate(eff) : 0;
                    return (
                      <button
                        key={a.id}
                        className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-muted/50 text-left transition-colors"
                        onClick={() => setLocation("/actions")}
                        data-testid={`notif-action-${a.id}`}
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mt-0.5">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{a.title}</p>
                          <p className="text-[10px] text-muted-foreground">{a.ownerName}</p>
                        </div>
                        <span className="text-[10px] font-semibold text-red-500 shrink-0 whitespace-nowrap mt-0.5">{days}d late</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* At-risk KPIs */}
            {atRiskKpis.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                    <Target className="h-3 w-3" /> KPIs At Risk ({atRiskKpis.length})
                  </span>
                  <button
                    className="text-[10px] text-primary hover:underline"
                    onClick={() => setLocation("/kpis")}
                  >
                    View all <ChevronRight className="h-2.5 w-2.5 inline" />
                  </button>
                </div>
                <div className="divide-y divide-border">
                  {atRiskKpis.slice(0, 4).map(a => (
                    <button
                      key={a.kpiId}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 text-left transition-colors"
                      onClick={() => setLocation("/kpis")}
                      data-testid={`notif-kpi-${a.kpiId}`}
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                        <Target className="h-3 w-3 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{a.kpiName}</p>
                        <p className="text-[10px] text-muted-foreground">Latest: {a.actualValue}</p>
                      </div>
                      <span className={`text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded ${
                        a.status === "Below Target"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}>
                        {a.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Urgent Milestones */}
            {urgentMilestones.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-500 flex items-center gap-1">
                    <Flag className="h-3 w-3" /> Milestones Due Soon ({urgentMilestones.length})
                  </span>
                  <button
                    className="text-[10px] text-primary hover:underline"
                    onClick={() => setLocation("/portfolio")}
                  >
                    View <ChevronRight className="h-2.5 w-2.5 inline" />
                  </button>
                </div>
                <div className="divide-y divide-border">
                  {urgentMilestones.map(m => {
                    const daysLeft = m.dueDate ? Math.ceil((new Date(m.dueDate).getTime() - Date.now()) / 86400000) : 0;
                    return (
                      <button
                        key={m.id}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 text-left transition-colors"
                        onClick={() => setLocation("/portfolio")}
                        data-testid={`notif-milestone-${m.id}`}
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                          <Flag className="h-3 w-3 text-violet-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{m.title}</p>
                          <p className="text-[10px] text-muted-foreground">Due {m.dueDate}</p>
                        </div>
                        <span className={`text-[10px] font-semibold shrink-0 ${daysLeft <= 1 ? "text-red-500" : "text-amber-500"}`}>
                          {daysLeft <= 0 ? "today" : `${daysLeft}d`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="h-2" />
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
