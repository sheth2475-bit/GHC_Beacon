import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { LoadingTable } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { ExcelUpload } from "@/components/excel-upload";
import { Plus, Trash2, ListChecks, AlertTriangle, Search } from "lucide-react";
import type { ActionItem, Department } from "@shared/schema";

const STATUSES = ["Not Started", "In Progress", "Completed", "Delayed", "Cancelled"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

export default function ActionsPage() {
  const { toast } = useToast();
  const { data: actions, isLoading, error, refetch } = useQuery<ActionItem[]>({ queryKey: ["/api/action-items"] });
  const { data: departments } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const [showDialog, setShowDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [search, setSearch] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("Not Started");
  const [deptId, setDeptId] = useState("");

  const resetForm = () => {
    setTitle(""); setDescription(""); setOwnerName(""); setDueDate("");
    setPriority("Medium"); setStatus("Not Started"); setDeptId("");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/action-items", {
        title, description, ownerName, dueDate, priority, status,
        departmentId: deptId ? parseInt(deptId) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "Action item created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PATCH", `/api/action-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/action-items/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      toast({ title: "Action item deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = (item: ActionItem) => item.dueDate && item.dueDate < today && item.status !== "Completed" && item.status !== "Cancelled";

  const filtered = (actions || []).filter(a => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterPriority !== "all" && a.priority !== filterPriority) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) &&
        !a.ownerName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getDeptName = (deptId: number | null) => departments?.find(d => d.id === deptId)?.name || "-";

  const actionColumnMap: Record<string, string> = {
    "Title": "title", "Description": "description", "Owner": "ownerName",
    "Due Date (YYYY-MM-DD)": "dueDate", "Priority (Low/Medium/High/Critical)": "priority",
    "Status (Not Started/In Progress/Completed/Delayed)": "status", "Department": "department",
  };

  if (error) return <div className="p-6"><ErrorState message="Failed to load action items" onRetry={() => refetch()} /></div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Action Tracker"
        description="Track and manage action items across departments"
        icon={ListChecks}
        testId="text-actions-title"
        actions={
          <div className="flex items-center gap-2">
            <ExcelUpload
              templateUrl="/api/templates/actions"
              uploadUrl="/api/upload/actions"
              entityName="Actions"
              columnMap={actionColumnMap}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/action-items"] })}
            />
            <Button onClick={() => setShowDialog(true)} data-testid="button-new-action">
              <Plus className="h-4 w-4 mr-2" />New Action
            </Button>
          </div>
        }
      />

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search actions or owners..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-actions" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[150px]" data-testid="select-filter-priority"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterStatus !== "all" || filterPriority !== "all" || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterStatus("all"); setFilterPriority("all"); setSearch(""); }}>
            Clear filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingTable rows={6} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No action items found"
          description={search || filterStatus !== "all" || filterPriority !== "all"
            ? "No actions match your filters. Try adjusting your search."
            : "Create your first action item or import from Excel."}
          action={!search && filterStatus === "all" && filterPriority === "all" ? {
            label: "New Action",
            onClick: () => setShowDialog(true),
            testId: "button-empty-new-action"
          } : undefined}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[280px]">Title</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(item => (
                    <TableRow key={item.id} className={isOverdue(item) ? "bg-red-500/5" : ""}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          {isOverdue(item) && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />}
                          <div>
                            <p className="font-medium text-sm" data-testid={`text-action-${item.id}`}>{item.title}</p>
                            {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[240px]">{item.description}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.ownerName || "-"}</TableCell>
                      <TableCell><Badge variant="secondary" className="font-normal">{getDeptName(item.departmentId)}</Badge></TableCell>
                      <TableCell className={`text-sm tabular-nums ${isOverdue(item) ? "text-red-500 font-medium" : ""}`}>{item.dueDate || "-"}</TableCell>
                      <TableCell><PriorityBadge status={item.priority} /></TableCell>
                      <TableCell>
                        <Select value={item.status || "Not Started"} onValueChange={(v) => updateMutation.mutate({ id: item.id, data: { status: v } })}>
                          <SelectTrigger className="w-[130px] h-8 text-xs" data-testid={`select-status-${item.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteMutation.mutate(item.id)} data-testid={`button-delete-action-${item.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Action Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Action title" data-testid="input-action-title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What needs to be done and why..." data-testid="input-action-desc" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Owner</Label>
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Person responsible" data-testid="input-action-owner" />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} data-testid="input-action-due" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="select-action-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={deptId} onValueChange={setDeptId}>
                  <SelectTrigger data-testid="select-action-dept"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(departments || []).map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !title} className="w-full" data-testid="button-create-action">
              {createMutation.isPending ? "Creating..." : "Create Action"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
