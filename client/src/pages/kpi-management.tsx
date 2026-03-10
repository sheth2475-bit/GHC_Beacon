import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trash2, Plus, Edit, BarChart3 } from "lucide-react";
import type { Kpi, Department } from "@shared/schema";

export default function KpiManagementPage() {
  const { toast } = useToast();
  const { data: kpis, isLoading } = useQuery<Kpi[]>({ queryKey: ["/api/kpis"] });
  const { data: departments } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const [filterDept, setFilterDept] = useState("all");
  const [filterFreq, setFilterFreq] = useState("all");
  const [actualDialog, setActualDialog] = useState<Kpi | null>(null);
  const [actualValue, setActualValue] = useState("");
  const [actualMonth, setActualMonth] = useState("");
  const [actualComment, setActualComment] = useState("");
  const [actualStatus, setActualStatus] = useState("On Track");

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/kpis/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      toast({ title: "Deleted", description: "KPI removed" });
    },
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
      toast({ title: "Saved", description: "Actual value recorded" });
    },
  });

  const filteredKpis = (kpis || []).filter(kpi => {
    if (filterDept !== "all") {
      const dept = departments?.find(d => d.id === kpi.departmentId);
      if (dept?.name !== filterDept) return false;
    }
    if (filterFreq !== "all" && kpi.frequency !== filterFreq) return false;
    return true;
  });

  const getDeptName = (deptId: number | null) => {
    if (!deptId) return "-";
    return departments?.find(d => d.id === deptId)?.name || "-";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-kpi-mgmt-title">KPI Management</h1>
          <p className="text-muted-foreground">View and manage all your KPIs</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-dept"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {(departments || []).map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterFreq} onValueChange={setFilterFreq}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-freq"><SelectValue placeholder="Frequency" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frequencies</SelectItem>
            <SelectItem value="Weekly">Weekly</SelectItem>
            <SelectItem value="Monthly">Monthly</SelectItem>
            <SelectItem value="Quarterly">Quarterly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading KPIs...</p>
      ) : filteredKpis.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No KPIs found. Use the KPI Builder to generate some.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KPI Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Thresholds</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKpis.map(kpi => (
                    <TableRow key={kpi.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm" data-testid={`text-kpi-${kpi.id}`}>{kpi.kpiName}</p>
                          <p className="text-xs text-muted-foreground">{kpi.formula}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{getDeptName(kpi.departmentId)}</Badge></TableCell>
                      <TableCell className="text-sm">{kpi.targetValue} {kpi.unit}</TableCell>
                      <TableCell className="text-sm">{kpi.frequency}</TableCell>
                      <TableCell className="text-sm">{kpi.ownerName}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500" title={kpi.greenThreshold || ""} />
                          <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" title={kpi.amberThreshold || ""} />
                          <span className="inline-block w-2 h-2 rounded-full bg-red-500" title={kpi.redThreshold || ""} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setActualDialog(kpi)} data-testid={`button-add-actual-${kpi.id}`}>
                            <Plus className="h-3 w-3 mr-1" />Actual
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(kpi.id)} data-testid={`button-delete-kpi-${kpi.id}`}>
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
            <DialogTitle>Add Actual Value - {actualDialog?.kpiName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Review Month</Label>
              <Input type="month" value={actualMonth} onChange={(e) => setActualMonth(e.target.value)} data-testid="input-actual-month" />
            </div>
            <div className="space-y-2">
              <Label>Actual Value</Label>
              <Input value={actualValue} onChange={(e) => setActualValue(e.target.value)} placeholder={`Target: ${actualDialog?.targetValue} ${actualDialog?.unit}`} data-testid="input-actual-value" />
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
              <Textarea value={actualComment} onChange={(e) => setActualComment(e.target.value)} placeholder="Add notes..." data-testid="input-actual-comment" />
            </div>
            <Button onClick={() => addActualMutation.mutate()} disabled={addActualMutation.isPending || !actualMonth || !actualValue} className="w-full" data-testid="button-save-actual">
              Save Actual
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
