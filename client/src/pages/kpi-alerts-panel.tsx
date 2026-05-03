import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, Plus, Trash2, CheckCheck, AlertTriangle, AlertCircle,
  Info, Edit2, ToggleLeft, ToggleRight, Mail, MailOff, X, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { KpiAlert, KpiAlertEvent } from "@shared/schema";

interface KpiDef {
  id: string;
  name: string;
  target: number;
  lowerIsBetter?: boolean;
}

interface Department {
  id: string;
  name: string;
}

interface KpiAlertsPanelProps {
  open: boolean;
  onClose: () => void;
  departments: Department[];
  getKpisForDept: (deptId: string) => KpiDef[];
}

const CONDITION_LABELS: Record<string, string> = {
  ach_below: "Achievement % drops below threshold",
  ach_above: "Achievement % rises above threshold",
  status_red: "KPI turns Off Track (Ach < 80%)",
  drop_pct:   "Achievement drops by X% vs previous period",
};

const NEEDS_THRESHOLD = ["ach_below", "ach_above", "drop_pct"];

function severityIcon(severity: string) {
  if (severity === "critical") return <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />;
  if (severity === "warning")  return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
  return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
}

function fmtPeriod(pk: string) {
  const [y, m] = pk.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function fmtRelTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── New Alert Form ─────────────────────────────────────────────────────────────
interface AlertFormState {
  name: string;
  deptId: string;
  kpiId: string;
  conditionType: string;
  threshold: string;
  notifyEmail: boolean;
  emailAddress: string;
}
const EMPTY_FORM: AlertFormState = {
  name: "", deptId: "", kpiId: "", conditionType: "ach_below",
  threshold: "80", notifyEmail: false, emailAddress: "",
};

function AlertFormDialog({
  open, onClose, departments, getKpisForDept, editAlert,
}: {
  open: boolean;
  onClose: () => void;
  departments: Department[];
  getKpisForDept: (deptId: string) => KpiDef[];
  editAlert?: KpiAlert | null;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<AlertFormState>(() => {
    if (editAlert) {
      return {
        name: editAlert.name,
        deptId: editAlert.deptId,
        kpiId: editAlert.kpiId,
        conditionType: editAlert.conditionType,
        threshold: editAlert.threshold !== null && editAlert.threshold !== undefined ? String(editAlert.threshold) : "80",
        notifyEmail: editAlert.notifyEmail,
        emailAddress: editAlert.emailAddress ?? "",
      };
    }
    return { ...EMPTY_FORM };
  });

  const deptKpis = useMemo(() => {
    if (!form.deptId) return [];
    return getKpisForDept(form.deptId);
  }, [form.deptId, getKpisForDept]);

  const set = (k: keyof AlertFormState, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/scorecard/alerts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scorecard/alerts"] });
      toast({ title: "Alert created" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/scorecard/alerts/${editAlert!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scorecard/alerts"] });
      toast({ title: "Alert updated" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  function handleSubmit() {
    if (!form.deptId || !form.kpiId || !form.conditionType) {
      return toast({ title: "Please fill all required fields", variant: "destructive" });
    }
    const kpi = deptKpis.find(k => k.id === form.kpiId);
    const threshold = NEEDS_THRESHOLD.includes(form.conditionType) ? parseFloat(form.threshold) : null;
    const payload = {
      deptId: form.deptId,
      kpiId: form.kpiId,
      kpiName: kpi?.name ?? form.kpiId,
      name: form.name || `${kpi?.name ?? form.kpiId} Alert`,
      conditionType: form.conditionType,
      threshold,
      targetValue: kpi?.target ?? null,
      lowerIsBetter: kpi?.lowerIsBetter ?? false,
      notifyEmail: form.notifyEmail,
      emailAddress: form.notifyEmail ? form.emailAddress : null,
      isActive: true,
    };
    if (editAlert) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editAlert ? "Edit Alert" : "New KPI Alert"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Department */}
          <div className="space-y-1.5">
            <Label>Department <span className="text-red-500">*</span></Label>
            <Select value={form.deptId} onValueChange={v => { set("deptId", v); set("kpiId", ""); }}>
              <SelectTrigger data-testid="select-alert-dept">
                <SelectValue placeholder="Select department…" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* KPI */}
          <div className="space-y-1.5">
            <Label>KPI <span className="text-red-500">*</span></Label>
            <Select value={form.kpiId} onValueChange={v => {
              const kpi = deptKpis.find(k => k.id === v);
              set("kpiId", v);
              if (kpi && !form.name) set("name", `${kpi.name} Alert`);
            }} disabled={!form.deptId}>
              <SelectTrigger data-testid="select-alert-kpi">
                <SelectValue placeholder={form.deptId ? "Select KPI…" : "Select department first"} />
              </SelectTrigger>
              <SelectContent>
                {deptKpis.map(k => (
                  <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Condition */}
          <div className="space-y-1.5">
            <Label>Condition <span className="text-red-500">*</span></Label>
            <Select value={form.conditionType} onValueChange={v => set("conditionType", v)}>
              <SelectTrigger data-testid="select-alert-condition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONDITION_LABELS).map(([v, lbl]) => (
                  <SelectItem key={v} value={v}>{lbl}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Threshold */}
          {NEEDS_THRESHOLD.includes(form.conditionType) && (
            <div className="space-y-1.5">
              <Label>
                {form.conditionType === "drop_pct" ? "Drop by more than (%) " : "Threshold (%)"}
                <span className="text-red-500"> *</span>
              </Label>
              <Input
                type="number"
                min={0}
                max={500}
                value={form.threshold}
                onChange={e => set("threshold", e.target.value)}
                data-testid="input-alert-threshold"
              />
              <p className="text-[11px] text-muted-foreground">
                {form.conditionType === "ach_below" && `Fire when achievement is below ${form.threshold}%`}
                {form.conditionType === "ach_above" && `Fire when achievement exceeds ${form.threshold}%`}
                {form.conditionType === "drop_pct"  && `Fire when achievement drops by ≥${form.threshold}% vs previous month`}
              </p>
            </div>
          )}

          {/* Alert name */}
          <div className="space-y-1.5">
            <Label>Alert name</Label>
            <Input
              placeholder="Auto-generated if empty"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              data-testid="input-alert-name"
            />
          </div>

          {/* Email notification */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email notification</p>
                <p className="text-xs text-muted-foreground">Send an email when this alert fires</p>
              </div>
              <Switch
                checked={form.notifyEmail}
                onCheckedChange={v => set("notifyEmail", v)}
                data-testid="switch-alert-email"
              />
            </div>
            {form.notifyEmail && (
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={form.emailAddress}
                onChange={e => set("emailAddress", e.target.value)}
                data-testid="input-alert-email"
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-alert">
            {isPending ? "Saving…" : editAlert ? "Update Alert" : "Create Alert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────
export function KpiAlertsPanel({ open, onClose, departments, getKpisForDept }: KpiAlertsPanelProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState("notifications");
  const [formOpen, setFormOpen] = useState(false);
  const [editAlert, setEditAlert] = useState<KpiAlert | null>(null);

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<KpiAlert[]>({
    queryKey: ["/api/scorecard/alerts"],
    enabled: open,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<KpiAlertEvent[]>({
    queryKey: ["/api/scorecard/alert-events"],
    enabled: open,
    refetchInterval: open ? 30000 : false,
  });

  const unreadCount = events.filter(e => !e.acknowledged).length;

  const ackMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/scorecard/alert-events/${id}/ack`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/scorecard/alert-events"] }),
  });

  const ackAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/scorecard/alert-events/ack-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/scorecard/alert-events"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/scorecard/alerts/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/scorecard/alerts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/scorecard/alerts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scorecard/alerts"] });
      toast({ title: "Alert deleted" });
    },
  });

  const checkMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/scorecard/alerts/check"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/scorecard/alert-events"] });
      toast({ title: `Alert check complete`, description: `${data.fired} new notification${data.fired !== 1 ? "s" : ""} fired` });
    },
  });

  return (
    <>
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent side="right" className="w-[440px] sm:w-[480px] p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-3 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                KPI Alerts
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 min-w-[20px] text-center">
                    {unreadCount}
                  </Badge>
                )}
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="mx-5 mt-3 w-auto self-start">
              <TabsTrigger value="notifications" className="text-xs gap-1.5" data-testid="tab-notifications">
                Notifications
                {unreadCount > 0 && <span className="bg-red-500 text-white text-[9px] rounded-full px-1.5 leading-4">{unreadCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="rules" className="text-xs" data-testid="tab-alert-rules">
                Alert Rules
                <span className="ml-1 text-muted-foreground">({alerts.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* ── Notifications tab ──────────────────────────────────────── */}
            <TabsContent value="notifications" className="flex-1 overflow-y-auto mt-0 px-5 pb-5">
              <div className="flex items-center justify-between py-3">
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "All caught up"}
                </p>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => ackAllMutation.mutate()} disabled={ackAllMutation.isPending}>
                      <CheckCheck className="h-3.5 w-3.5" />Mark all read
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => checkMutation.mutate()} disabled={checkMutation.isPending} data-testid="button-check-alerts">
                    {checkMutation.isPending ? "Checking…" : "Check Now"}
                  </Button>
                </div>
              </div>

              {eventsLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />)}
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                  <Bell className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground">Alerts will appear here when KPI conditions are triggered</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map(ev => (
                    <div
                      key={ev.id}
                      className={cn(
                        "rounded-xl border p-3 text-sm transition-colors",
                        !ev.acknowledged ? "bg-card border-border shadow-sm" : "bg-muted/30 border-muted"
                      )}
                      data-testid={`alert-event-${ev.id}`}
                    >
                      <div className="flex items-start gap-2">
                        {severityIcon(ev.severity)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={cn("text-sm font-medium truncate", ev.acknowledged && "text-muted-foreground")}>
                              {ev.kpiName}
                            </p>
                            <span className="text-[10px] text-muted-foreground shrink-0">{fmtRelTime(ev.createdAt as any)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ev.message}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{fmtPeriod(ev.periodKey)}</span>
                            {ev.achPct !== null && (
                              <span className={cn(
                                "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                                ev.severity === "critical" ? "bg-red-50 text-red-600 dark:bg-red-950/40" :
                                ev.severity === "warning"  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40" :
                                "bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                              )}>
                                {ev.achPct.toFixed(1)}% achieved
                              </span>
                            )}
                            {!ev.acknowledged && (
                              <Button
                                size="sm" variant="ghost"
                                className="h-5 text-[10px] px-1.5 ml-auto text-muted-foreground hover:text-foreground"
                                onClick={() => ackMutation.mutate(ev.id)}
                                data-testid={`button-ack-${ev.id}`}
                              >
                                <Check className="h-3 w-3 mr-0.5" />Dismiss
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Alert Rules tab ────────────────────────────────────────── */}
            <TabsContent value="rules" className="flex-1 overflow-y-auto mt-0 px-5 pb-5">
              <div className="flex items-center justify-between py-3">
                <p className="text-xs text-muted-foreground">
                  {alerts.filter(a => a.isActive).length} active rule{alerts.filter(a => a.isActive).length !== 1 ? "s" : ""}
                </p>
                <Button size="sm" className="h-7 text-xs gap-1" onClick={() => { setEditAlert(null); setFormOpen(true); }} data-testid="button-new-alert">
                  <Plus className="h-3.5 w-3.5" />New Alert
                </Button>
              </div>

              {alertsLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-muted/40 animate-pulse" />)}
                </div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                  <AlertTriangle className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No alert rules configured</p>
                  <p className="text-xs text-muted-foreground">Create rules to get notified when KPIs hit thresholds</p>
                  <Button size="sm" className="mt-2 gap-1" onClick={() => { setEditAlert(null); setFormOpen(true); }}>
                    <Plus className="h-3.5 w-3.5" />Create First Alert
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map(alert => (
                    <div
                      key={alert.id}
                      className={cn(
                        "rounded-xl border p-3 text-sm",
                        alert.isActive ? "bg-card border-border" : "bg-muted/30 border-muted opacity-60"
                      )}
                      data-testid={`alert-rule-${alert.id}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">{alert.name}</p>
                            {!alert.isActive && <Badge variant="outline" className="text-[10px] h-4">Paused</Badge>}
                            {alert.notifyEmail && <Mail className="h-3 w-3 text-muted-foreground" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{alert.kpiName}</p>
                          <p className="text-xs text-muted-foreground">
                            {CONDITION_LABELS[alert.conditionType]}
                            {alert.threshold !== null && alert.threshold !== undefined ? ` · ${alert.threshold}%` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => toggleMutation.mutate({ id: alert.id, isActive: !alert.isActive })}
                            title={alert.isActive ? "Pause alert" : "Enable alert"}
                            data-testid={`button-toggle-alert-${alert.id}`}
                          >
                            {alert.isActive
                              ? <ToggleRight className="h-4 w-4 text-emerald-500" />
                              : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => { setEditAlert(alert); setFormOpen(true); }}
                            title="Edit alert"
                            data-testid={`button-edit-alert-${alert.id}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600"
                            onClick={() => deleteMutation.mutate(alert.id)}
                            title="Delete alert"
                            data-testid={`button-delete-alert-${alert.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {formOpen && (
        <AlertFormDialog
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditAlert(null); }}
          departments={departments}
          getKpisForDept={getKpisForDept}
          editAlert={editAlert}
        />
      )}
    </>
  );
}

// ── Bell trigger button ────────────────────────────────────────────────────────
export function AlertsBellButton({ onClick }: { onClick: () => void }) {
  const { data: events = [] } = useQuery<KpiAlertEvent[]>({
    queryKey: ["/api/scorecard/alert-events"],
    refetchInterval: 60000,
  });
  const unreadCount = events.filter(e => !e.acknowledged).length;

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 h-8 relative"
      onClick={onClick}
      data-testid="button-alerts-bell"
      data-export-hide
    >
      <Bell className="h-3.5 w-3.5" />
      Alerts
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-semibold">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );
}
