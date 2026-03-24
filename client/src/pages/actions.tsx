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
import { Plus, Trash2, ListChecks, AlertTriangle, Search, Pencil, Check, X, Bell, BellRing, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { ActionItem, Department, MeetingType } from "@shared/schema";

const STATUSES = ["Not Started", "In Progress", "Completed", "Delayed", "Cancelled"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

export default function ActionsPage() {
  const { toast } = useToast();
  const { data: actions, isLoading, error, refetch } = useQuery<ActionItem[]>({ queryKey: ["/api/action-items"] });
  const { data: departments } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: meetingTypes } = useQuery<MeetingType[]>({ queryKey: ["/api/meeting-types"] });
  const [showDialog, setShowDialog] = useState(false);
  const [remindDialog, setRemindDialog] = useState<ActionItem | null>(null);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [showOverdueDialog, setShowOverdueDialog] = useState(false);
  const [overdueCc, setOverdueCc] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterMeetingType, setFilterMeetingType] = useState("all");
  const [search, setSearch] = useState("");

  const [meetingType, setMeetingType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [revisedDueDate, setRevisedDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("Not Started");
  const [deptId, setDeptId] = useState("");

  // ── Inline editing ────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editRevisedDue, setEditRevisedDue] = useState("");
  const [editPriority, setEditPriority] = useState("Medium");
  const [editCompletion, setEditCompletion] = useState(0);

  const startEdit = (item: ActionItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description || "");
    setEditOwner(item.ownerName || "");
    setEditDueDate(item.dueDate || "");
    setEditRevisedDue(item.revisedDueDate || "");
    setEditPriority(item.priority || "Medium");
    setEditCompletion(item.completion ?? 0);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const autoStatus = editCompletion === 100 ? "Completed" : undefined;
    updateMutation.mutate(
      { id: editingId, data: { title: editTitle, description: editDescription, ownerName: editOwner, dueDate: editDueDate, revisedDueDate: editRevisedDue || null, priority: editPriority, completion: editCompletion, ...(autoStatus ? { status: autoStatus } : {}) } },
      { onSuccess: () => { setEditingId(null); toast({ title: "Action updated" }); } }
    );
  };

  const resetForm = () => {
    setMeetingType(""); setTitle(""); setDescription(""); setOwnerName("");
    setDueDate(""); setRevisedDueDate(""); setPriority("Medium");
    setStatus("Not Started"); setDeptId("");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/action-items", {
        meetingType: meetingType || null,
        title, description, ownerName, dueDate,
        revisedDueDate: revisedDueDate || null,
        priority, status,
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

  const remindMutation = useMutation({
    mutationFn: async ({ id, ownerEmail }: { id: number; ownerEmail?: string }) => {
      const res = await apiRequest("POST", `/api/action-items/${id}/remind`, { ownerEmail: ownerEmail || undefined });
      return res.json();
    },
    onSuccess: (data) => {
      setRemindDialog(null);
      setOwnerEmail("");
      toast({ title: "Reminder sent", description: `Sent to ${data.sentTo?.join(", ")}` });
    },
    onError: (err: any) => toast({ title: "Failed to send reminder", description: err.message, variant: "destructive" }),
  });

  const remindOverdueMutation = useMutation({
    mutationFn: async ({ cc }: { cc: string[] }) => {
      const res = await apiRequest("POST", "/api/action-items/remind-overdue", { cc });
      return res.json();
    },
    onSuccess: (data) => {
      setShowOverdueDialog(false);
      setOverdueCc("");
      if (data.sent > 0) {
        toast({ title: "Overdue reminders sent", description: `${data.sent} reminder${data.sent !== 1 ? "s" : ""} sent successfully.` });
      } else if (data.errors?.length > 0) {
        toast({ title: "Reminders failed to send", description: data.errors[0], variant: "destructive" });
      } else {
        toast({ title: "No overdue actions", description: "There are no overdue action items to remind." });
      }
    },
    onError: (err: any) => toast({ title: "Failed to send reminders", description: err.message, variant: "destructive" }),
  });

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = (item: ActionItem) => {
    const effectiveDue = item.revisedDueDate || item.dueDate;
    return effectiveDue && effectiveDue < today && item.status !== "Completed" && item.status !== "Cancelled";
  };

  const filtered = (actions || []).filter(a => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterPriority !== "all" && a.priority !== filterPriority) return false;
    if (filterMeetingType !== "all" && a.meetingType !== filterMeetingType) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) &&
        !a.ownerName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getDeptName = (deptId: number | null) => departments?.find(d => d.id === deptId)?.name || "-";

  const meetingTypeNames = (meetingTypes || []).map(mt => mt.name);
  const actionMeetingTypes = Array.from(new Set((actions || []).map(a => a.meetingType).filter((x): x is string => !!x)));
  const uniqueMeetingTypes = Array.from(new Set([...meetingTypeNames, ...actionMeetingTypes]));

  const actionColumnMap: Record<string, string> = {
    "Meeting Type": "meetingType", "Title": "title", "Description": "description",
    "Owner": "ownerName", "Due Date (DD-MM-YYYY)": "dueDate",
    "Revised Due Date (DD-MM-YYYY)": "revisedDueDate",
    "Priority (Low/Medium/High/Critical)": "priority",
    "Status (Not Started/In Progress/Completed/Delayed)": "status", "Department": "department",
  };

  if (error) return <div className="p-6"><ErrorState message="Failed to load action items" onRetry={() => refetch()} /></div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none px-6 pt-5 pb-0">
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
              <Button
                variant="outline"
                onClick={() => setShowOverdueDialog(true)}
                disabled={remindOverdueMutation.isPending}
                data-testid="button-remind-overdue"
              >
                {remindOverdueMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BellRing className="h-4 w-4 mr-2 text-amber-500" />
                )}
                Remind Overdue
              </Button>
              <Button onClick={() => setShowDialog(true)} data-testid="button-new-action">
                <Plus className="h-4 w-4 mr-2" />New Action
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex-none px-6 py-3 border-b flex gap-3 flex-wrap items-center bg-background">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search actions or owners..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-search-actions" />
        </div>
        <Select value={filterMeetingType} onValueChange={setFilterMeetingType}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-meeting-type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Meeting Types</SelectItem>
            {uniqueMeetingTypes.map(mt => <SelectItem key={mt} value={mt}>{mt}</SelectItem>)}
          </SelectContent>
        </Select>
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
        {(filterStatus !== "all" || filterPriority !== "all" || filterMeetingType !== "all" || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterStatus("all"); setFilterPriority("all"); setFilterMeetingType("all"); setSearch(""); }}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-6 py-4">
      {isLoading ? (
        <LoadingTable rows={6} cols={7} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No action items found"
          description={search || filterStatus !== "all" || filterPriority !== "all" || filterMeetingType !== "all"
            ? "No actions match your filters. Try adjusting your search."
            : "Create your first action item or import from Excel."}
          action={!search && filterStatus === "all" && filterPriority === "all" && filterMeetingType === "all" ? {
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
                    <TableHead className="w-[155px] whitespace-nowrap">Meeting Type</TableHead>
                    <TableHead className="min-w-[180px] w-[22%]">Title</TableHead>
                    <TableHead className="min-w-[200px] w-[28%]">Description</TableHead>
                    <TableHead className="w-[110px] whitespace-nowrap">Owner</TableHead>
                    <TableHead className="w-[105px] whitespace-nowrap">Due Date</TableHead>
                    <TableHead className="w-[120px] whitespace-nowrap">Revised Due</TableHead>
                    <TableHead className="w-[100px]">Priority</TableHead>
                    <TableHead className="w-[110px] whitespace-nowrap">% Completion</TableHead>
                    <TableHead className="w-[130px]">Status</TableHead>
                    <TableHead className="text-right w-[72px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(item => {
                    const effectiveDue = item.revisedDueDate || item.dueDate;
                    const overdue = isOverdue(item);
                    const isEditing = editingId === item.id;
                    return (
                      <TableRow key={item.id} className={overdue && !isEditing ? "bg-red-500/5" : isEditing ? "bg-primary/5 ring-1 ring-primary/20" : ""}>
                        <TableCell className="align-top py-3">
                          {item.meetingType ? (
                            <Badge variant="secondary" className="font-normal text-xs whitespace-nowrap" data-testid={`badge-meeting-type-${item.id}`}>
                              {item.meetingType}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top py-3">
                          {isEditing ? (
                            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="h-8 text-sm min-w-[160px]" data-testid={`input-edit-title-${item.id}`} autoFocus />
                          ) : (
                            <div className="flex items-start gap-1.5">
                              {overdue && <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />}
                              <p className="font-medium text-sm leading-snug" data-testid={`text-action-${item.id}`}>{item.title}</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="align-top py-3">
                          {isEditing ? (
                            <Textarea
                              value={editDescription}
                              onChange={e => setEditDescription(e.target.value)}
                              placeholder="Description..."
                              className="text-sm min-w-[180px] min-h-[72px] resize-y"
                              data-testid={`textarea-edit-desc-${item.id}`}
                            />
                          ) : item.description ? (
                            <p className="text-sm text-muted-foreground leading-snug whitespace-pre-wrap break-words">{item.description}</p>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top py-3">
                          {isEditing ? (
                            <Input value={editOwner} onChange={e => setEditOwner(e.target.value)} className="h-8 text-sm w-[110px]" data-testid={`input-edit-owner-${item.id}`} />
                          ) : (
                            <span className="text-sm text-muted-foreground">{item.ownerName || "-"}</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top py-3">
                          {isEditing ? (
                            <Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="h-8 text-sm w-[136px]" data-testid={`input-edit-due-${item.id}`} />
                          ) : (
                            <span className="text-sm tabular-nums whitespace-nowrap">{formatDate(item.dueDate)}</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top py-3">
                          {isEditing ? (
                            <Input type="date" value={editRevisedDue} onChange={e => setEditRevisedDue(e.target.value)} className="h-8 text-sm w-[136px]" data-testid={`input-edit-revised-due-${item.id}`} />
                          ) : item.revisedDueDate ? (
                            <span className={`text-sm tabular-nums whitespace-nowrap ${overdue ? "text-red-500 font-medium" : "text-amber-600 dark:text-amber-400 font-medium"}`} data-testid={`text-revised-due-${item.id}`}>
                              {formatDate(item.revisedDueDate)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top py-3">
                          {isEditing ? (
                            <Select value={editPriority} onValueChange={setEditPriority}>
                              <SelectTrigger className="w-[100px] h-8 text-xs" data-testid={`select-edit-priority-${item.id}`}><SelectValue /></SelectTrigger>
                              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : (
                            <PriorityBadge status={item.priority} />
                          )}
                        </TableCell>
                        <TableCell className="align-top py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 w-[100px]">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={editCompletion}
                                onChange={e => {
                                  const v = Math.min(100, Math.max(0, Number(e.target.value)));
                                  setEditCompletion(v);
                                }}
                                className="h-8 text-sm w-[70px] text-center"
                                data-testid={`input-edit-completion-${item.id}`}
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 w-[90px]">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium tabular-nums" data-testid={`text-completion-${item.id}`}>{item.completion ?? 0}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${(item.completion ?? 0) === 100 ? "bg-emerald-500" : (item.completion ?? 0) >= 50 ? "bg-primary" : "bg-amber-500"}`}
                                  style={{ width: `${item.completion ?? 0}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="align-top py-3">
                          <Select
                            value={item.status || "Not Started"}
                            onValueChange={(v) => updateMutation.mutate({ id: item.id, data: { status: v, ...(v === "Completed" ? { completion: 100 } : {}) } })}
                          >
                            <SelectTrigger className="w-[124px] h-8 text-xs" data-testid={`select-status-${item.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="align-top py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={saveEdit} disabled={updateMutation.isPending} data-testid={`button-save-edit-${item.id}`}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingId(null)} data-testid={`button-cancel-edit-${item.id}`}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-amber-500" onClick={() => { setRemindDialog(item); setOwnerEmail(""); }} title="Send reminder email" data-testid={`button-remind-action-${item.id}`}>
                                  <Bell className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => startEdit(item)} data-testid={`button-edit-action-${item.id}`}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteMutation.mutate(item.id)} data-testid={`button-delete-action-${item.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Action Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Meeting Type</Label>
              <Select value={meetingType} onValueChange={setMeetingType}>
                <SelectTrigger data-testid="select-action-meeting-type"><SelectValue placeholder="Select meeting type" /></SelectTrigger>
                <SelectContent>{uniqueMeetingTypes.length > 0 ? uniqueMeetingTypes.map(mt => <SelectItem key={mt} value={mt}>{mt}</SelectItem>) : <SelectItem value="Other">Other</SelectItem>}</SelectContent>
              </Select>
            </div>
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
                <Label>Department</Label>
                <Select value={deptId} onValueChange={setDeptId}>
                  <SelectTrigger data-testid="select-action-dept"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(departments || []).map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} data-testid="input-action-due" />
              </div>
              <div className="space-y-2">
                <Label>Revised Due Date</Label>
                <Input type="date" value={revisedDueDate} onChange={(e) => setRevisedDueDate(e.target.value)} data-testid="input-action-revised-due" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-action-priority"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !title} className="w-full" data-testid="button-create-action">
              {createMutation.isPending ? "Creating..." : "Create Action"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remind Overdue Dialog */}
      <Dialog open={showOverdueDialog} onOpenChange={(open) => { if (!open) { setShowOverdueDialog(false); setOverdueCc(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-amber-500" />
              Send Overdue Reminders
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              An email reminder will be sent to all admin users for every overdue action item.
              Optionally add CC recipients to loop in other people on all the reminders.
            </p>
            <div className="space-y-2">
              <Label>CC Recipients (optional)</Label>
              <Input
                type="text"
                placeholder="email1@company.com, email2@company.com"
                value={overdueCc}
                onChange={e => setOverdueCc(e.target.value)}
                data-testid="input-overdue-cc"
              />
              <p className="text-xs text-muted-foreground">Separate multiple emails with commas</p>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  const cc = overdueCc.split(",").map(e => e.trim()).filter(e => e.includes("@"));
                  remindOverdueMutation.mutate({ cc });
                }}
                disabled={remindOverdueMutation.isPending}
                data-testid="button-send-overdue-reminder"
              >
                {remindOverdueMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
                ) : (
                  <><BellRing className="h-4 w-4 mr-2" />Send Reminders</>
                )}
              </Button>
              <Button variant="outline" onClick={() => { setShowOverdueDialog(false); setOverdueCc(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remind Dialog */}
      <Dialog open={!!remindDialog} onOpenChange={(open) => { if (!open) { setRemindDialog(null); setOwnerEmail(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              Send Reminder Email
            </DialogTitle>
          </DialogHeader>
          {remindDialog && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 border p-3 space-y-1">
                <p className="text-sm font-medium">{remindDialog.title}</p>
                <p className="text-xs text-muted-foreground">Owner: {remindDialog.ownerName || "—"}</p>
                <p className="text-xs text-muted-foreground">Due: {formatDate(remindDialog.revisedDueDate || remindDialog.dueDate)}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                A reminder email will be sent to all admin users. Optionally enter the owner's email to include them directly.
              </p>
              <div className="space-y-2">
                <Label>Owner's Email (optional)</Label>
                <Input
                  type="email"
                  placeholder="owner@company.com"
                  value={ownerEmail}
                  onChange={e => setOwnerEmail(e.target.value)}
                  data-testid="input-owner-email"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => remindMutation.mutate({ id: remindDialog.id, ownerEmail: ownerEmail || undefined })}
                  disabled={remindMutation.isPending}
                  data-testid="button-send-reminder"
                >
                  {remindMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</>
                  ) : (
                    <><Bell className="h-4 w-4 mr-2" />Send Reminder</>
                  )}
                </Button>
                <Button variant="outline" onClick={() => { setRemindDialog(null); setOwnerEmail(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
