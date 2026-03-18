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
import { Trash2, Plus, Target, Search } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import type { Kpi, Department, KpiActual } from "@shared/schema";

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
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#spark-${kpiId})`} dot={false} />
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

export default function KpiManagementPage() {
  const { toast } = useToast();
  const { data: kpis, isLoading, error, refetch } = useQuery<Kpi[]>({ queryKey: ["/api/kpis"] });
  const { data: departments } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: allActuals = [] } = useQuery<(KpiActual & { kpiName: string })[]>({
    queryKey: ["/api/kpi-actuals/company"],
  });
  const [filterDept, setFilterDept] = useState("all");
  const [filterFreq, setFilterFreq] = useState("all");
  const [search, setSearch] = useState("");
  const [actualDialog, setActualDialog] = useState<Kpi | null>(null);
  const [actualValue, setActualValue] = useState("");
  const [actualMonth, setActualMonth] = useState("");
  const [actualComment, setActualComment] = useState("");
  const [actualStatus, setActualStatus] = useState("On Track");

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
      await apiRequest("POST", "/api/kpi-actuals", {
        kpiId: actualDialog!.id,
        reviewMonth: actualMonth,
        actualValue,
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
      toast({ title: "Actual value saved" });
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

  const kpiColumnMap: Record<string, string> = {
    "KPI Name": "kpiName", "Description": "description", "Formula": "formula",
    "Unit": "unit", "Frequency": "frequency", "Target Value": "targetValue",
    "Green Threshold": "greenThreshold", "Amber Threshold": "amberThreshold",
    "Red Threshold": "redThreshold", "Owner": "ownerName", "Data Source": "dataSource",
    "Department": "department",
  };

  if (error) return <div className="p-6"><ErrorState message="Failed to load KPIs" onRetry={() => refetch()} /></div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="KPI Management"
        description="View, track, and manage all your key performance indicators"
        icon={Target}
        testId="text-kpi-mgmt-title"
        actions={
          <ExcelUpload
            templateUrl="/api/templates/kpis"
            uploadUrl="/api/upload/kpis"
            entityName="KPIs"
            columnMap={kpiColumnMap}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/kpis"] })}
          />
        }
      />

      <div className="flex gap-3 flex-wrap items-center">
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
          </SelectContent>
        </Select>
        {(filterDept !== "all" || filterFreq !== "all" || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterDept("all"); setFilterFreq("all"); setSearch(""); }}>
            Clear filters
          </Button>
        )}
      </div>

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
                        <div>
                          <p className="font-medium text-sm" data-testid={`text-kpi-${kpi.id}`}>{kpi.kpiName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{kpi.formula}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">{getDeptName(kpi.departmentId)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium tabular-nums">{kpi.targetValue} {kpi.unit}</TableCell>
                      <TableCell>
                        <KpiSparkline kpiId={kpi.id} actuals={allActuals} />
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
                          <Button size="sm" variant="ghost" onClick={() => setActualDialog(kpi)} data-testid={`button-add-actual-${kpi.id}`}>
                            <Plus className="h-3 w-3 mr-1" />Actual
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteMutation.mutate(kpi.id)} data-testid={`button-delete-kpi-${kpi.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                <Label>Actual Value</Label>
                <Input value={actualValue} onChange={(e) => setActualValue(e.target.value)} placeholder="Enter value" data-testid="input-actual-value" />
              </div>
            </div>
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
