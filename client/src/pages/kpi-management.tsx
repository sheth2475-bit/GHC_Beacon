import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { LoadingTable } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { ExcelUpload } from "@/components/excel-upload";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Plus, Target, Search, Zap, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AreaChart, Area, ResponsiveContainer, Tooltip, LabelList } from "recharts";
import type { Kpi, Department, KpiActual, TeamMember } from "@shared/schema";

function KpiSparkline({ kpiId, actuals }: { kpiId: number; actuals: (KpiActual & { kpiName: string })[] }) {
  const kpiActuals = actuals
    .filter(a => a.kpiId === kpiId)
    .sort((a, b) => a.reviewMonth.localeCompare(b.reviewMonth))
    .slice(-3)
    .map(a => ({ month: a.reviewMonth.slice(5), value: parseFloat(a.actualValue || "0"), status: a.status }));

  if (kpiActuals.length === 0) {
    return <span className="text-xs text-muted-foreground/50 italic">no data</span>;
  }

  const lastStatus = kpiActuals[kpiActuals.length - 1]?.status;
  const color = lastStatus === "On Track" ? "#10b981" : lastStatus === "Below Target" ? "#ef4444" : "#f59e0b";

  return (
    <div className="flex items-center gap-2">
      <ResponsiveContainer width={60} height={28}>
        <AreaChart data={kpiActuals} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={`spark-${kpiId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#spark-${kpiId})`} dot={{ r: 1.5, fill: color }}>
            <LabelList dataKey="value" position="top" style={{ fontSize: 7, fill: color, fontWeight: 700 }} />
          </Area>
          <Tooltip
            contentStyle={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
            formatter={(v: number) => [v, kpiActuals[0]?.month]}
            labelFormatter={() => ""}
          />
        </AreaChart>
      </ResponsiveContainer>
      <span className={`text-xs font-semibold tabular-nums ${lastStatus === "On Track" ? "text-emerald-600 dark:text-emerald-400" : lastStatus === "Below Target" ? "text-red-500" : "text-amber-500"}`}>
        {kpiActuals[kpiActuals.length - 1]?.value}
      </span>
    </div>
  );
}

function QuickActualPopover({ kpi }: { kpi: Kpi }) {
  const { toast } = useToast();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [status, setStatus] = useState("On Track");

  const addActualMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/kpi-actuals`, {
        kpiId: kpi.id,
        actualValue: value,
        reviewMonth: month,
        status,
        commentary: "",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Actual recorded", description: `${kpi.kpiName} — ${month}` });
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kpi-actuals/company"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kpi-actuals", kpi.id] });
      setValue("");
      setMonth(currentMonth);
      setStatus("On Track");
      setOpen(false);
    },
    onError: () => toast({ title: "Failed to record", variant: "destructive" }),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="group flex items-center gap-1.5 rounded px-1 -mx-1 hover:bg-muted/70 transition-colors"
          title="Click to log a quick actual"
          data-testid={`button-quick-entry-${kpi.id}`}
        >
          <Zap className="h-2.5 w-2.5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 space-y-3" data-testid={`popover-quick-entry-${kpi.id}`}>
        <div>
          <p className="text-xs font-semibold">{kpi.kpiName}</p>
          <p className="text-[10px] text-muted-foreground">Target: {kpi.targetValue} {kpi.unit}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Month</label>
            <Input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="h-7 text-xs"
              data-testid={`input-quick-month-${kpi.id}`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Actual</label>
            <Input
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={kpi.targetValue || "value"}
              className="h-7 text-xs"
              data-testid={`input-quick-value-${kpi.id}`}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-7 text-xs" data-testid={`select-quick-status-${kpi.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="On Track">On Track</SelectItem>
              <SelectItem value="Amber">At Risk</SelectItem>
              <SelectItem value="Below Target">Below Target</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => addActualMutation.mutate()}
          disabled={addActualMutation.isPending || !value || !month}
          data-testid={`button-quick-save-${kpi.id}`}
        >
          {addActualMutation.isPending ? "Saving…" : "Save Actual"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

interface EditKpiForm {
  kpiName: string;
  description: string;
  formula: string;
  unit: string;
  frequency: string;
  targetValue: string;
  targetType: string;
  targetDate: string;
  targetFrequency: string;
  milestoneStartDate: string;
  greenThreshold: string;
  amberThreshold: string;
  redThreshold: string;
  ownerName: string;
  dataSource: string;
  departmentId: string;
}

export default function KpiManagementPage() {
  const { toast } = useToast();
  const { canEdit } = useAuth();
  const { data: kpis, isLoading, error, refetch } = useQuery<Kpi[]>({ queryKey: ["/api/kpis"] });
  const { data: departments } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: allActuals = [] } = useQuery<(KpiActual & { kpiName: string })[]>({
    queryKey: ["/api/kpi-actuals/company"],
  });
  const { data: teamMembers = [] } = useQuery<TeamMember[]>({ queryKey: ["/api/team-members"] });
  const [filterDept, setFilterDept] = useState("all");
  const [filterFreq, setFilterFreq] = useState("all");
  const [search, setSearch] = useState("");
  const [actualDialog, setActualDialog] = useState<Kpi | null>(null);
  const [actualValue, setActualValue] = useState("");
  const [actualMonth, setActualMonth] = useState("");
  const [actualComment, setActualComment] = useState("");
  const [actualStatus, setActualStatus] = useState("On Track");
  const [actualMilestoneTarget, setActualMilestoneTarget] = useState("");
  const [editKpi, setEditKpi] = useState<Kpi | null>(null);
  const [editForm, setEditForm] = useState<EditKpiForm>({
    kpiName: "", description: "", formula: "", unit: "", frequency: "Monthly",
    targetValue: "", targetType: "numeric", targetDate: "", targetFrequency: "monthly", milestoneStartDate: "",
    greenThreshold: "", amberThreshold: "", redThreshold: "",
    ownerName: "", dataSource: "", departmentId: "",
  });

  const openEditKpi = (kpi: Kpi) => {
    setEditKpi(kpi);
    setEditForm({
      kpiName: kpi.kpiName || "",
      description: kpi.description || "",
      formula: kpi.formula || "",
      unit: kpi.unit || "",
      frequency: kpi.frequency || "Monthly",
      targetValue: kpi.targetValue || "",
      targetType: (kpi as any).targetType || "numeric",
      targetDate: (kpi as any).targetDate || "",
      targetFrequency: (kpi as any).targetFrequency || "monthly",
      milestoneStartDate: (kpi as any).milestoneStartDate || "",
      greenThreshold: kpi.greenThreshold || "",
      amberThreshold: kpi.amberThreshold || "",
      redThreshold: kpi.redThreshold || "",
      ownerName: kpi.ownerName || "",
      dataSource: kpi.dataSource || "",
      departmentId: kpi.departmentId ? String(kpi.departmentId) : "",
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/kpis/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      toast({ title: "KPI deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addActualMutation = useMutation({
    mutationFn: async () => {
      const kpiType = (actualDialog as any)?.targetType;
      await apiRequest("POST", "/api/kpi-actuals", {
        kpiId: actualDialog!.id,
        reviewMonth: actualMonth,
        actualValue,
        milestoneTarget: kpiType === "milestone_numeric" && actualMilestoneTarget ? actualMilestoneTarget : undefined,
        commentary: actualComment,
        status: actualStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      setActualDialog(null);
      setActualValue("");
      setActualMonth("");
      setActualComment("");
      setActualMilestoneTarget("");
      toast({ title: "Actual value saved" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateKpiMutation = useMutation({
    mutationFn: async () => {
      if (!editKpi) return;
      const payload: Record<string, any> = { ...editForm };
      payload.departmentId = editForm.departmentId ? parseInt(editForm.departmentId) : null;
      await apiRequest("PATCH", `/api/kpis/${editKpi.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      setEditKpi(null);
      toast({ title: "KPI updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filteredKpis = (kpis || []).filter(kpi => {
    if (filterDept !== "all") {
      const dept = departments?.find(d => d.id === kpi.departmentId);
      if (dept?.name !== filterDept) return false;
    }
    if (filterFreq !== "all" && kpi.frequency !== filterFreq) return false;
    if (search && !kpi.kpiName.toLowerCase().includes(search.toLowerCase()) &&
        !kpi.ownerName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getDeptName = (deptId: number | null) => {
    if (!deptId) return "-";
    return departments?.find(d => d.id === deptId)?.name || "-";
  };

  const latestActualByKpi: Record<number, string> = {};
  for (const a of allActuals) {
    const existing = allActuals
      .filter(x => x.kpiId === a.kpiId)
      .reduce((best, cur) => (cur.reviewMonth > best.reviewMonth ? cur : best), a);
    latestActualByKpi[a.kpiId] = existing.status ?? "On Track";
  }

  const trafficDot = (kpiId: number) => {
    const status = latestActualByKpi[kpiId];
    if (!status) return "bg-muted-foreground/30";
    if (status === "On Track") return "bg-emerald-500";
    if (status === "Below Target") return "bg-red-500";
    return "bg-amber-500";
  };

  const trafficTitle = (kpiId: number) => {
    const status = latestActualByKpi[kpiId];
    return status || "No data";
  };

  const kpiColumnMap: Record<string, string> = {
    "KPI Name": "kpiName", "Description": "description", "Formula": "formula",
    "Unit": "unit", "Frequency": "frequency", "Target Value": "targetValue",
    "Green Threshold": "greenThreshold", "Amber Threshold": "amberThreshold",
    "Red Threshold": "redThreshold", "Owner": "ownerName", "Data Source": "dataSource",
    "Department": "department",
  };

  if (error) return <div className="p-6"><ErrorState message="Failed to load KPIs" onRetry={() => refetch()} /></div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none px-6 pt-5 pb-0">
        <PageHeader
          title="KPI Management"
          description="View, track, and manage all your key performance indicators"
          icon={Target}
          testId="text-kpi-mgmt-title"
          actions={canEdit ? (
            <ExcelUpload
              templateUrl="/api/templates/kpis"
              uploadUrl="/api/upload/kpis"
              entityName="KPIs"
              columnMap={kpiColumnMap}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/kpis"] })}
            />
          ) : undefined}
        />
      </div>

      <div className="flex-none px-6 py-3 border-b flex gap-3 flex-wrap items-center bg-background">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search KPIs or owners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-kpis"
          />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-dept"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {(departments || []).map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterFreq} onValueChange={setFilterFreq}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-freq"><SelectValue placeholder="Frequency" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frequencies</SelectItem>
            <SelectItem value="Weekly">Weekly</SelectItem>
            <SelectItem value="Monthly">Monthly</SelectItem>
            <SelectItem value="Quarterly">Quarterly</SelectItem>
            <SelectItem value="One Time">One Time</SelectItem>
          </SelectContent>
        </Select>
        {(filterDept !== "all" || filterFreq !== "all" || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterDept("all"); setFilterFreq("all"); setSearch(""); }}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
      {isLoading ? (
        <LoadingTable rows={6} cols={5} />
      ) : filteredKpis.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No KPIs found"
          description={search || filterDept !== "all" || filterFreq !== "all"
            ? "No KPIs match your current filters. Try adjusting your search."
            : "Start by using the KPI Builder to generate AI-powered KPIs, or import from Excel."}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">KPI Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Trend (Latest)</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Thresholds</TableHead>
                    <TableHead className="text-right w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKpis.map(kpi => (
                    <TableRow key={kpi.id}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${trafficDot(kpi.id)}`}
                            title={trafficTitle(kpi.id)}
                            data-testid={`dot-kpi-status-${kpi.id}`}
                          />
                          <div>
                            <p className="font-medium text-sm" data-testid={`text-kpi-${kpi.id}`}>{kpi.kpiName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{kpi.formula}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">{getDeptName(kpi.departmentId)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium tabular-nums">{kpi.targetValue} {kpi.unit}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <KpiSparkline kpiId={kpi.id} actuals={allActuals} />
                          {canEdit && <QuickActualPopover kpi={kpi} />}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{kpi.frequency}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{kpi.ownerName}</TableCell>
                      <TableCell>
                        <div className="flex gap-1.5 items-center">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" title={kpi.greenThreshold || ""} />
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" title={kpi.amberThreshold || ""} />
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" title={kpi.redThreshold || ""} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => setActualDialog(kpi)} data-testid={`button-add-actual-${kpi.id}`}>
                                <Plus className="h-3 w-3 mr-1" />Actual
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditKpi(kpi)} data-testid={`button-edit-kpi-${kpi.id}`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutate(kpi.id)} data-testid={`button-delete-kpi-${kpi.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      </div>

      {/* Edit KPI Dialog */}
      <Dialog open={!!editKpi} onOpenChange={(open) => !open && setEditKpi(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit KPI — {editKpi?.kpiName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>KPI Name *</Label>
                <Input value={editForm.kpiName} onChange={e => setEditForm(f => ({ ...f, kpiName: e.target.value }))} data-testid="input-edit-kpi-name" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description</Label>
                <Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="resize-none" rows={2} data-testid="input-edit-kpi-desc" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Formula / How it's calculated</Label>
                <Input value={editForm.formula} onChange={e => setEditForm(f => ({ ...f, formula: e.target.value }))} placeholder="e.g. (Sales / Total Leads) × 100" data-testid="input-edit-kpi-formula" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} placeholder="e.g. %, AED, #" data-testid="input-edit-kpi-unit" />
              </div>
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select value={editForm.frequency} onValueChange={v => setEditForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger data-testid="select-edit-kpi-freq"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="One Time">One Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Target Type</Label>
                <Select value={editForm.targetType} onValueChange={v => setEditForm(f => ({ ...f, targetType: v }))}>
                  <SelectTrigger data-testid="select-edit-kpi-target-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="numeric">Numeric (standard)</SelectItem>
                    <SelectItem value="milestone_numeric">Milestone — Numeric (period targets)</SelectItem>
                    <SelectItem value="milestone_date">Milestone — Date (deadline based)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Target Frequency</Label>
                <Select value={editForm.targetFrequency} onValueChange={v => setEditForm(f => ({ ...f, targetFrequency: v }))}>
                  <SelectTrigger data-testid="select-edit-kpi-target-freq"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly (compare each month)</SelectItem>
                    <SelectItem value="annual">Annual (annualize monthly actuals × 12)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editForm.targetType !== "milestone_date" ? (
              <div className="space-y-1.5">
                <Label>Target Value</Label>
                <Input value={editForm.targetValue} onChange={e => setEditForm(f => ({ ...f, targetValue: e.target.value }))} placeholder="e.g. 85" data-testid="input-edit-kpi-target" />
              </div>
              ) : (
              <div className="space-y-1.5">
                <Label>Target Deadline (Month)</Label>
                <Input type="month" value={editForm.targetDate} onChange={e => setEditForm(f => ({ ...f, targetDate: e.target.value }))} data-testid="input-edit-kpi-target-date" />
              </div>
              )}
              {(editForm.targetType === "milestone_numeric" || editForm.targetType === "milestone_date") && (
              <div className="space-y-1.5">
                <Label>Milestone Start Date</Label>
                <Input type="month" value={editForm.milestoneStartDate} onChange={e => setEditForm(f => ({ ...f, milestoneStartDate: e.target.value }))} placeholder="e.g. 2026-01" data-testid="input-edit-kpi-milestone-start" />
              </div>
              )}
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={editForm.departmentId || "none"} onValueChange={v => setEditForm(f => ({ ...f, departmentId: v === "none" ? "" : v }))}>
                  <SelectTrigger data-testid="select-edit-kpi-dept"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No department</SelectItem>
                    {(departments || []).map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />Green Threshold</Label>
                <Input value={editForm.greenThreshold} onChange={e => setEditForm(f => ({ ...f, greenThreshold: e.target.value }))} placeholder="e.g. ≥ 85%" data-testid="input-edit-kpi-green" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />Amber Threshold</Label>
                <Input value={editForm.amberThreshold} onChange={e => setEditForm(f => ({ ...f, amberThreshold: e.target.value }))} placeholder="e.g. 70-84%" data-testid="input-edit-kpi-amber" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />Red Threshold</Label>
                <Input value={editForm.redThreshold} onChange={e => setEditForm(f => ({ ...f, redThreshold: e.target.value }))} placeholder="e.g. < 70%" data-testid="input-edit-kpi-red" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Owner</Label>
                <Select value={editForm.ownerName || "none"} onValueChange={v => setEditForm(f => ({ ...f, ownerName: v === "none" ? "" : v }))}>
                  <SelectTrigger data-testid="select-edit-kpi-owner"><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No owner</SelectItem>
                    {teamMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}{m.jobTitle ? ` (${m.jobTitle})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data Source</Label>
                <Input value={editForm.dataSource} onChange={e => setEditForm(f => ({ ...f, dataSource: e.target.value }))} placeholder="e.g. CRM, Finance system" data-testid="input-edit-kpi-source" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => updateKpiMutation.mutate()} disabled={updateKpiMutation.isPending || !editForm.kpiName} className="flex-1" data-testid="button-save-kpi-edit">
                {updateKpiMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={() => setEditKpi(null)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!actualDialog} onOpenChange={(open) => !open && setActualDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Actual — {actualDialog?.kpiName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <span className="text-muted-foreground">Target: </span>
              <span className="font-medium">{actualDialog?.targetValue} {actualDialog?.unit}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Review Month</Label>
                <Input type="month" value={actualMonth} onChange={(e) => setActualMonth(e.target.value)} data-testid="input-actual-month" />
              </div>
              <div className="space-y-2">
                <Label>{(actualDialog as any)?.targetType === "milestone_date" ? "% Complete" : "Actual Value"}</Label>
                <Input value={actualValue} onChange={(e) => setActualValue(e.target.value)} placeholder="Enter value" data-testid="input-actual-value" />
              </div>
            </div>
            {(actualDialog as any)?.targetType === "milestone_numeric" && (
            <div className="space-y-2">
              <Label>Period Milestone Target</Label>
              <Input value={actualMilestoneTarget} onChange={(e) => setActualMilestoneTarget(e.target.value)} placeholder="e.g. 30 for 30% completion" data-testid="input-actual-milestone-target" />
              <p className="text-xs text-muted-foreground">The target % or value this period's milestone should reach.</p>
            </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={actualStatus} onValueChange={setActualStatus}>
                <SelectTrigger data-testid="select-actual-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="On Track">On Track (Green)</SelectItem>
                  <SelectItem value="Amber">At Risk (Amber)</SelectItem>
                  <SelectItem value="Below Target">Below Target (Red)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Commentary</Label>
              <Textarea value={actualComment} onChange={(e) => setActualComment(e.target.value)} placeholder="What drove this result?" data-testid="input-actual-comment" />
            </div>
            <Button
              onClick={() => addActualMutation.mutate()}
              disabled={addActualMutation.isPending || !actualMonth || !actualValue}
              className="w-full"
              data-testid="button-save-actual"
            >
              {addActualMutation.isPending ? "Saving..." : "Save Actual"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
