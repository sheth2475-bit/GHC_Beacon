import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, ListChecks, AlertTriangle } from "lucide-react";
import type { ActionItem, Department } from "@shared/schema";

const STATUSES = ["Not Started", "In Progress", "Completed", "Delayed", "Cancelled"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

export default function ActionsPage() {
  const { toast } = useToast();
  const { data: actions, isLoading } = useQuery<ActionItem[]>({ queryKey: ["/api/action-items"] });
  const { data: departments } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const [showDialog, setShowDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("Not Started");
  const [deptId, setDeptId] = useState("");

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
      setTitle(""); setDescription(""); setOwnerName(""); setDueDate(""); setPriority("Medium"); setStatus("Not Started"); setDeptId("");
      toast({ title: "Created", description: "Action item added" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PATCH", `/api/action-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/action-items/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-stats"] });
      toast({ title: "Deleted" });
    },
  });

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = (item: ActionItem) => item.dueDate && item.dueDate < today && item.status !== "Completed" && item.status !== "Cancelled";

  const filtered = (actions || []).filter(a => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterPriority !== "all" && a.priority !== filterPriority) return false;
    return true;
  });

  const getDeptName = (deptId: number | null) => departments?.find(d => d.id === deptId)?.name || "-";

  const statusVariant = (s: string | null) => {
    if (s === "Completed") return "default" as const;
    if (s === "Delayed" || s === "Cancelled") return "destructive" as const;
    return "secondary" as const;
  };

  const priorityVariant = (p: string | null) => {
    if (p === "Critical" || p === "High") return "destructive" as const;
    return "secondary" as const;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-actions-title">Action Tracker</h1>
          <p className="text-muted-foreground">Track and manage action items</p>
        </div>
        <Button onClick={() => setShowDialog(true)} data-testid="button-new-action">
          <Plus className="h-4 w-4 mr-2" />New Action
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-priority"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ListChecks className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No action items found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(item => (
                    <TableRow key={item.id} className={isOverdue(item) ? "bg-destructive/5" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isOverdue(item) && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                          <div>
                            <p className="font-medium text-sm" data-testid={`text-action-${item.id}`}>{item.title}</p>
                            {item.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{item.ownerName || "-"}</TableCell>
                      <TableCell><Badge variant="secondary">{getDeptName(item.departmentId)}</Badge></TableCell>
                      <TableCell className="text-sm">{item.dueDate || "-"}</TableCell>
                      <TableCell><Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge></TableCell>
                      <TableCell>
                        <Select value={item.status || "Not Started"} onValueChange={(v) => updateMutation.mutate({ id: item.id, data: { status: v } })}>
                          <SelectTrigger className="w-[130px] h-7 text-xs" data-testid={`select-status-${item.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)} data-testid={`button-delete-action-${item.id}`}>
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
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Action title" data-testid="input-action-title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..." data-testid="input-action-desc" />
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
              Create Action
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
