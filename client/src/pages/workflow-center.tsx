import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Workflow, Plus, Search, Filter, RefreshCw, Clock, AlertTriangle, CheckCircle2,
  Ticket, RotateCcw, ShieldCheck, FileCheck2, BarChart2, Home, Layers, ListFilter,
  User, Calendar, Building2, Tag, ChevronRight, Edit2, Trash2, Eye, MessageSquare,
  Activity, ArrowUpRight, Package, TrendingUp, X, SendHorizontal, Star,
  Bell, Zap, ClipboardList, Settings,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type WorkflowType = "recurring_task" | "service_ticket" | "license" | "certificate";
interface Submission {
  id: number; referenceNumber: string; workflowType: WorkflowType;
  title: string; description?: string; status: string; priority: string;
  ownerName?: string; assignedTo?: string; requesterName?: string;
  departmentName?: string; category?: string;
  dueDate?: string; expiryDate?: string; renewalDate?: string; nextOccurrence?: string;
  recurrenceType?: string; vendorName?: string; issueAuthority?: string;
  licenseType?: string; holderName?: string; slaTarget?: string;
  createdAt: string; updatedAt: string;
  comments?: Comment[]; activity?: ActivityEntry[];
}
interface Comment { id: number; authorName: string; content: string; isInternal: boolean; createdAt: string; }
interface ActivityEntry { id: number; actorName: string; action: string; oldValue?: string; newValue?: string; field?: string; createdAt: string; }
interface Template { id: number; title: string; description?: string; workflowType: WorkflowType; category?: string; isDefault: boolean; }
interface Analytics { total: number; open: number; overdue: number; expiringSoon: number; byType: Record<string, number>; byStatus: Record<string, number>; byPriority: Record<string, number>; }

// ── Constants ─────────────────────────────────────────────────────────────────
const WF_TYPES: Record<WorkflowType, { label: string; icon: typeof Workflow; color: string; bg: string }> = {
  recurring_task: { label: "Recurring Task", icon: RotateCcw, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40" },
  service_ticket: { label: "Service Ticket", icon: Ticket, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/40" },
  license: { label: "License", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  certificate: { label: "Certificate", icon: FileCheck2, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40" },
};

const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Assigned: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "In Progress": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Closed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  Escalated: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Scheduled: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  "Due Soon": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Overdue: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Expiring Soon": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "Renewal in Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Renewed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Expired: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Suspended: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-gray-100 text-gray-500",
  Medium: "bg-blue-100 text-blue-600",
  High: "bg-orange-100 text-orange-600",
  Critical: "bg-red-100 text-red-600 font-semibold",
};

const SECTIONS = [
  { key: "home", label: "Home", icon: Home },
  { key: "builder", label: "Workflow Builder", icon: Settings },
  { key: "submissions", label: "Submissions", icon: ClipboardList },
  { key: "my-requests", label: "My Requests", icon: User },
  { key: "renewal-tracker", label: "Renewal Tracker", icon: Bell },
  { key: "service-desk", label: "Service Desk", icon: Ticket },
  { key: "analytics", label: "Workflow Analytics", icon: BarChart2 },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function daysUntil(date?: string) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}
function isOverdue(s: Submission) {
  if (!s.dueDate) return false;
  return s.dueDate < new Date().toISOString().slice(0, 10) && !["Completed", "Resolved", "Closed", "Renewed"].includes(s.status);
}
function isExpiringSoon(s: Submission, days = 30) {
  if (!s.expiryDate) return false;
  const d = daysUntil(s.expiryDate);
  return d !== null && d >= 0 && d <= days;
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_COLORS[status] || "bg-muted text-muted-foreground"}`}>{status}</span>;
}
function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${PRIORITY_COLORS[priority] || ""}`}>{priority}</span>;
}

// ── Submission row ─────────────────────────────────────────────────────────────
function SubmissionRow({ s, onClick }: { s: Submission; onClick: () => void }) {
  const wf = WF_TYPES[s.workflowType];
  const Icon = wf?.icon || Workflow;
  const overdue = isOverdue(s);
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/40 cursor-pointer transition-colors group ${overdue ? "bg-red-50/30 dark:bg-red-950/10" : ""}`}
      onClick={onClick}
      data-testid={`row-submission-${s.id}`}
    >
      <div className={`mt-0.5 p-1.5 rounded-md ${wf?.bg || "bg-muted"} shrink-0`}>
        <Icon className={`h-3.5 w-3.5 ${wf?.color || "text-muted-foreground"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-muted-foreground">{s.referenceNumber}</span>
          <StatusBadge status={s.status} />
          <PriorityBadge priority={s.priority} />
          {overdue && <span className="inline-flex items-center gap-0.5 text-[10px] text-red-600 font-medium"><AlertTriangle className="h-2.5 w-2.5" />Overdue</span>}
        </div>
        <p className="text-sm font-medium text-foreground mt-0.5 truncate group-hover:text-primary transition-colors">{s.title}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-muted-foreground">
          {s.departmentName && <span className="flex items-center gap-0.5"><Building2 className="h-2.5 w-2.5" />{s.departmentName}</span>}
          {s.ownerName && <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" />{s.ownerName}</span>}
          {s.dueDate && <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />Due {fmt(s.dueDate)}</span>}
          {s.expiryDate && <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />Expires {fmt(s.expiryDate)}</span>}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1 group-hover:text-primary/60 transition-colors" />
    </div>
  );
}

// ── Create Submission Dialog ───────────────────────────────────────────────────
function CreateSubmissionDialog({ open, onClose, defaultType, departments }: {
  open: boolean; onClose: () => void; defaultType?: WorkflowType; departments: { id: number; name: string }[];
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<WorkflowType>(defaultType || "service_ticket");
  const [form, setForm] = useState<Record<string, string>>({
    title: "", description: "", priority: "Medium", status: "", ownerName: "", departmentName: "",
    dueDate: "", expiryDate: "", recurrenceType: "Monthly", vendorName: "", issueAuthority: "", licenseType: "", holderName: "", category: "", slaTarget: "",
  });

  const defaultStatuses: Record<WorkflowType, string> = {
    recurring_task: "Scheduled", service_ticket: "New", license: "Active", certificate: "Active",
  };

  const mut = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/workflow/submissions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/analytics"] });
      toast({ title: "Submission created", description: "Your workflow record has been created." });
      onClose();
      setForm({ title: "", description: "", priority: "Medium", status: "", ownerName: "", departmentName: "", dueDate: "", expiryDate: "", recurrenceType: "Monthly", vendorName: "", issueAuthority: "", licenseType: "", holderName: "", category: "", slaTarget: "" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create submission.", variant: "destructive" }),
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function submit() {
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    mut.mutate({ ...form, workflowType: type, status: form.status || defaultStatuses[type], requesterName: user?.name });
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />New Workflow Submission
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Workflow Type */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Workflow Type</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.entries(WF_TYPES) as [WorkflowType, typeof WF_TYPES[WorkflowType]][]).map(([k, v]) => {
                const Icon = v.icon;
                return (
                  <button key={k} onClick={() => setType(k)} data-testid={`btn-type-${k}`}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-center transition-all ${type === k ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"}`}>
                    <div className={`p-2 rounded-lg ${v.bg}`}><Icon className={`h-4 w-4 ${v.color}`} /></div>
                    <span className="text-[11px] font-medium leading-tight">{v.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Core fields */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="text-xs">Title <span className="text-red-500">*</span></Label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Enter a clear title" data-testid="input-wf-title" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the purpose or details..." rows={3} className="mt-1 resize-none" data-testid="input-wf-description" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger className="mt-1 h-9 text-sm" data-testid="select-wf-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Low", "Medium", "High", "Critical"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Department</Label>
              <Select value={form.departmentName} onValueChange={v => set("departmentName", v)}>
                <SelectTrigger className="mt-1 h-9 text-sm" data-testid="select-wf-dept"><SelectValue placeholder="Select dept." /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Owner / Assignee</Label>
              <Input value={form.ownerName} onChange={e => set("ownerName", e.target.value)} placeholder="Full name" className="mt-1 h-9" data-testid="input-wf-owner" />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Input value={form.category} onChange={e => set("category", e.target.value)} placeholder="e.g. IT, HR, Finance" className="mt-1 h-9" />
            </div>
          </div>

          {/* Type-specific fields */}
          {type === "recurring_task" && (
            <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-3">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1"><RotateCcw className="h-3 w-3" />Recurring Task Settings</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Recurrence</Label>
                  <Select value={form.recurrenceType} onValueChange={v => set("recurrenceType", v)}>
                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} className="mt-1 h-9" data-testid="input-wf-due-date" />
                </div>
              </div>
            </div>
          )}

          {type === "service_ticket" && (
            <div className="p-3 rounded-lg bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 space-y-3">
              <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide flex items-center gap-1"><Ticket className="h-3 w-3" />Service Ticket Settings</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Due Date</Label>
                  <Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} className="mt-1 h-9" data-testid="input-tkt-due" />
                </div>
                <div>
                  <Label className="text-xs">SLA Target</Label>
                  <Input value={form.slaTarget} onChange={e => set("slaTarget", e.target.value)} placeholder="e.g. 4 hours, 1 day" className="mt-1 h-9" />
                </div>
              </div>
            </div>
          )}

          {(type === "license" || type === "certificate") && (
            <div className={`p-3 rounded-lg border space-y-3 ${type === "license" ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40" : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40"}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1 ${type === "license" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                {type === "license" ? <><ShieldCheck className="h-3 w-3" />License Details</> : <><FileCheck2 className="h-3 w-3" />Certificate Details</>}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{type === "license" ? "License Type" : "Certificate Type"}</Label>
                  <Input value={form.licenseType} onChange={e => set("licenseType", e.target.value)} placeholder="e.g. Software, Trade, Professional" className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">{type === "license" ? "Vendor / Provider" : "Issuing Authority"}</Label>
                  <Input value={type === "license" ? form.vendorName : form.issueAuthority} onChange={e => set(type === "license" ? "vendorName" : "issueAuthority", e.target.value)} placeholder="Name" className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">{type === "certificate" ? "Holder Name" : "License Number / ID"}</Label>
                  <Input value={form.holderName} onChange={e => set("holderName", e.target.value)} placeholder={type === "certificate" ? "Employee or asset name" : "Reference ID"} className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">Issue Date</Label>
                  <Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">Expiry Date</Label>
                  <Input type="date" value={form.expiryDate} onChange={e => set("expiryDate", e.target.value)} className="mt-1 h-9" data-testid="input-expiry-date" />
                </div>
                <div>
                  <Label className="text-xs">Reminder (days before expiry)</Label>
                  <Select value={form.slaTarget || "30"} onValueChange={v => set("slaTarget", v)}>
                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["7", "14", "30", "60", "90"].map(d => <SelectItem key={d} value={d}>{d} days</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={mut.isPending} data-testid="btn-submit-workflow">
            {mut.isPending ? "Submitting…" : "Create Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Submission Detail Dialog ───────────────────────────────────────────────────
function SubmissionDetail({ sub, onClose, onUpdate, departments }: {
  sub: Submission; onClose: () => void; onUpdate: () => void; departments: { id: number; name: string }[];
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [editStatus, setEditStatus] = useState(sub.status);
  const [tab, setTab] = useState("details");
  const wf = WF_TYPES[sub.workflowType];
  const Icon = wf?.icon || Workflow;

  const statusOptions: Record<WorkflowType, string[]> = {
    recurring_task: ["Scheduled", "Due Soon", "In Progress", "Completed", "Overdue"],
    service_ticket: ["New", "Assigned", "In Progress", "Pending", "Resolved", "Closed", "Escalated"],
    license: ["Active", "Expiring Soon", "Renewal in Progress", "Renewed", "Expired", "Suspended"],
    certificate: ["Active", "Expiring Soon", "Renewal in Progress", "Renewed", "Expired"],
  };

  const updateMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("PATCH", `/api/workflow/submissions/${sub.id}`, data),
    onSuccess: () => { onUpdate(); toast({ title: "Updated" }); },
  });

  const commentMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/workflow/submissions/${sub.id}/comments`, { content: comment }),
    onSuccess: () => { onUpdate(); setComment(""); toast({ title: "Comment added" }); },
    onError: () => toast({ title: "Error", description: "Failed to post comment.", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/workflow/submissions/${sub.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/analytics"] });
      onClose();
      toast({ title: "Deleted" });
    },
  });

  const overdue = isOverdue(sub);
  const expiring = isExpiringSoon(sub);

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${wf?.bg}`}><Icon className={`h-5 w-5 ${wf?.color}`} /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono text-muted-foreground">{sub.referenceNumber}</span>
                <StatusBadge status={sub.status} />
                <PriorityBadge priority={sub.priority} />
                {overdue && <span className="text-[10px] text-red-600 font-medium flex items-center gap-0.5"><AlertTriangle className="h-2.5 w-2.5" />Overdue</span>}
                {expiring && <span className="text-[10px] text-orange-600 font-medium flex items-center gap-0.5"><Bell className="h-2.5 w-2.5" />Expiring Soon</span>}
              </div>
              <DialogTitle className="text-base mt-1 leading-snug">{sub.title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-3 h-8">
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="comments" className="text-xs">Comments{(sub.comments?.length || 0) > 0 && ` (${sub.comments?.length})`}</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 space-y-4">
            {/* Status change */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
              <div className="flex-1">
                <Label className="text-xs">Update Status</Label>
                <Select value={editStatus} onValueChange={v => { setEditStatus(v); updateMut.mutate({ status: v }); }}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(statusOptions[sub.workflowType] || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 mt-5">
                <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending}>
                  <Trash2 className="h-3 w-3 mr-1" />Delete
                </Button>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Type", value: wf?.label },
                { label: "Priority", value: sub.priority },
                { label: "Department", value: sub.departmentName },
                { label: "Owner", value: sub.ownerName },
                { label: "Requester", value: sub.requesterName },
                { label: "Assigned To", value: sub.assignedTo },
                { label: "Category", value: sub.category },
                { label: "Due Date", value: fmt(sub.dueDate) },
                { label: "Expiry Date", value: fmt(sub.expiryDate) },
                { label: "Renewal Date", value: fmt(sub.renewalDate) },
                sub.recurrenceType && { label: "Recurrence", value: sub.recurrenceType },
                sub.vendorName && { label: "Vendor", value: sub.vendorName },
                sub.issueAuthority && { label: "Issuing Authority", value: sub.issueAuthority },
                sub.licenseType && { label: "Type", value: sub.licenseType },
                sub.holderName && { label: "Holder", value: sub.holderName },
                sub.slaTarget && { label: "SLA / Reminder", value: sub.slaTarget },
              ].filter(Boolean).map((item: any) => item.value && item.value !== "—" && (
                <div key={item.label} className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>

            {sub.description && (
              <div>
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{sub.description}</p>
              </div>
            )}

            <div className="text-[10px] text-muted-foreground">
              Created {fmt(sub.createdAt)} · Last updated {fmt(sub.updatedAt)}
            </div>
          </TabsContent>

          <TabsContent value="comments" className="mt-4 space-y-3">
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {(sub.comments || []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Be the first to add one.</p>
              )}
              {(sub.comments || []).map(c => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                    {c.authorName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{c.authorName}</span>
                      <span className="text-[10px] text-muted-foreground">{fmt(c.createdAt)}</span>
                      {c.isInternal && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 rounded font-medium">Internal</span>}
                    </div>
                    <p className="text-sm text-foreground/80 mt-0.5 leading-snug">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex gap-2">
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                className="resize-none text-sm flex-1"
                data-testid="input-comment"
                onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey && comment.trim()) commentMut.mutate(); }}
              />
              <Button size="icon" className="self-end h-9 w-9 shrink-0" onClick={() => commentMut.mutate()} disabled={!comment.trim() || commentMut.isPending} data-testid="btn-send-comment">
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(sub.activity || []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No activity recorded yet.</p>
              )}
              {(sub.activity || []).map(a => (
                <div key={a.id} className="flex items-start gap-2.5 text-sm">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                  <div>
                    <span className="font-medium">{a.actorName}</span>
                    {" "}{a.action === "status_changed" ? <>changed status from <span className="font-medium">{a.oldValue}</span> to <span className="font-medium">{a.newValue}</span></> : a.action === "commented" ? "posted a comment" : a.action === "created" ? <>created this {WF_TYPES[sub.workflowType]?.label?.toLowerCase()}</> : a.action}
                    <span className="text-[10px] text-muted-foreground ml-2">{fmt(a.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: typeof Workflow; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl bg-muted/50`}><Icon className={`h-5 w-5 ${color}`} /></div>
      </div>
    </div>
  );
}

// ── Template Builder section ───────────────────────────────────────────────────
function TemplateCard({ t, onDelete }: { t: Template; onDelete: () => void }) {
  const wf = WF_TYPES[t.workflowType];
  const Icon = wf?.icon || Workflow;
  return (
    <div className="rounded-xl border bg-card hover:shadow-md transition-all group" data-testid={`card-template-${t.id}`}>
      <div className="h-1.5 rounded-t-xl bg-gradient-to-r from-primary/60 to-primary/30" />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl ${wf?.bg} shrink-0`}><Icon className={`h-5 w-5 ${wf?.color}`} /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold leading-snug">{t.title}</h3>
              {t.isDefault && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Default</span>}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{wf?.label}</p>
            {t.description && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{t.description}</p>}
          </div>
        </div>
        {!t.isDefault && (
          <div className="flex justify-end mt-3 pt-3 border-t border-border/50">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onDelete}>
              <Trash2 className="h-3 w-3 mr-1" />Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WorkflowCenterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [section, setSection] = useState("home");
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<WorkflowType | undefined>();
  const [detailSub, setDetailSub] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderForm, setBuilderForm] = useState({ title: "", description: "", workflowType: "service_ticket" as WorkflowType, category: "" });

  const { data: submissions = [], refetch: refetchSubs } = useQuery<Submission[]>({
    queryKey: ["/api/workflow/submissions"],
    enabled: !!user,
  });
  const { data: templates = [], refetch: refetchTpl } = useQuery<Template[]>({
    queryKey: ["/api/workflow/templates"],
    enabled: !!user,
  });
  const { data: analytics } = useQuery<Analytics>({
    queryKey: ["/api/workflow/analytics"],
    enabled: !!user,
  });
  const { data: company } = useQuery<{ departments: { id: number; name: string }[] }>({
    queryKey: ["/api/company"],
    enabled: !!user,
  });

  // Detail query (to get comments + activity)
  const { data: detailFull, refetch: refetchDetail } = useQuery<Submission>({
    queryKey: ["/api/workflow/submissions", detailSub?.id],
    queryFn: () => fetch(`/api/workflow/submissions/${detailSub?.id}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!detailSub,
  });

  const deleteTplMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/workflow/templates/${id}`),
    onSuccess: () => { refetchTpl(); toast({ title: "Template deleted" }); },
  });

  const createTplMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/workflow/templates", data),
    onSuccess: () => { refetchTpl(); setBuilderOpen(false); setBuilderForm({ title: "", description: "", workflowType: "service_ticket", category: "" }); toast({ title: "Template saved" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const departments = company?.departments || [];
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  // Filtered submissions
  const filtered = useMemo(() => submissions.filter(s => {
    if (filterType !== "all" && s.workflowType !== filterType) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterPriority !== "all" && s.priority !== filterPriority) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.referenceNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [submissions, filterType, filterStatus, filterPriority, search]);

  const myRequests = useMemo(() => submissions.filter(s => s.createdBy === user?.id || s.requesterName === user?.name), [submissions, user]);
  const renewalItems = useMemo(() => submissions.filter(s => s.workflowType === "license" || s.workflowType === "certificate"), [submissions]);
  const serviceTickets = useMemo(() => submissions.filter(s => s.workflowType === "service_ticket"), [submissions]);
  const recentSubs = [...submissions].slice(0, 8);

  function openCreate(type?: WorkflowType) {
    setCreateType(type);
    setCreateOpen(true);
  }

  function openDetail(s: Submission) {
    setDetailSub(s);
  }

  // Filter bar
  const FilterBar = () => (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or ref…" className="pl-8 h-8 text-sm" data-testid="input-search-submissions" />
      </div>
      <Select value={filterType} onValueChange={setFilterType}>
        <SelectTrigger className="h-8 text-xs w-36" data-testid="select-filter-type"><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {Object.entries(WF_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filterPriority} onValueChange={setFilterPriority}>
        <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {["Low", "Medium", "High", "Critical"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>
      {(search || filterType !== "all" || filterStatus !== "all" || filterPriority !== "all") && (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); setFilterPriority("all"); }}>
          <X className="h-3 w-3 mr-1" />Clear
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Left nav */}
      <aside className="w-56 shrink-0 border-r bg-muted/20 flex flex-col py-4 px-2 gap-0.5 hidden md:flex">
        <div className="px-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10"><Workflow className="h-4 w-4 text-primary" /></div>
            <div>
              <h2 className="text-sm font-bold leading-tight">Workflow Center</h2>
              <p className="text-[10px] text-muted-foreground">Manage & Track</p>
            </div>
          </div>
        </div>
        <div className="h-px bg-border mb-2" />
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const active = section === s.key;
          return (
            <button key={s.key} onClick={() => setSection(s.key)} data-testid={`nav-wf-${s.key}`}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all w-full text-left ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}>
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} />
              <span className="truncate">{s.label}</span>
              {s.key === "renewal-tracker" && renewalItems.filter(s => isExpiringSoon(s)).length > 0 && (
                <span className="ml-auto text-[9px] bg-orange-500 text-white rounded-full px-1.5 font-bold">{renewalItems.filter(s => isExpiringSoon(s)).length}</span>
              )}
            </button>
          );
        })}
        <div className="flex-1" />
        <div className="px-3 mt-2">
          <Button onClick={() => openCreate()} className="w-full h-8 text-xs gap-1.5" data-testid="btn-new-submission-sidebar">
            <Plus className="h-3.5 w-3.5" />New Submission
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile top nav */}
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b overflow-x-auto">
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setSection(s.key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${section === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── HOME ── */}
          {section === "home" && (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold">Workflow Center</h1>
                  <p className="text-sm text-muted-foreground">Submit, track, and manage all operational workflows in one place.</p>
                </div>
                <Button onClick={() => openCreate()} className="gap-2" data-testid="btn-new-submission-home">
                  <Plus className="h-4 w-4" />New Submission
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Records" value={analytics?.total ?? submissions.length} icon={Layers} color="text-foreground" />
                <StatCard label="Open Items" value={analytics?.open ?? 0} icon={Activity} color="text-blue-600" />
                <StatCard label="Overdue" value={analytics?.overdue ?? 0} icon={AlertTriangle} color="text-red-500" />
                <StatCard label="Expiring Soon" value={analytics?.expiringSoon ?? 0} icon={Bell} color="text-orange-500" />
              </div>

              {/* Workflow type cards */}
              <div>
                <h2 className="text-sm font-semibold mb-3">Create New Workflow</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {(Object.entries(WF_TYPES) as [WorkflowType, typeof WF_TYPES[WorkflowType]][]).map(([k, v]) => {
                    const Icon = v.icon;
                    const count = (analytics?.byType?.[k] ?? submissions.filter(s => s.workflowType === k).length);
                    return (
                      <button key={k} onClick={() => openCreate(k)} data-testid={`card-wf-type-${k}`}
                        className={`flex items-start gap-3 p-4 rounded-xl border bg-card hover:shadow-md transition-all text-left group`}>
                        <div className={`p-2.5 rounded-xl ${v.bg} shrink-0`}><Icon className={`h-5 w-5 ${v.color}`} /></div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">{v.label}</h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{count} record{count !== 1 ? "s" : ""}</p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors shrink-0 mt-0.5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recent submissions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">Recent Submissions</h2>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSection("submissions")}>View all <ChevronRight className="h-3 w-3 ml-1" /></Button>
                </div>
                <div className="rounded-xl border overflow-hidden">
                  {recentSubs.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Workflow className="h-8 w-8 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">No submissions yet</p>
                      <p className="text-xs mt-1">Create your first workflow submission above</p>
                    </div>
                  )}
                  {recentSubs.map(s => <SubmissionRow key={s.id} s={s} onClick={() => openDetail(s)} />)}
                </div>
              </div>

              {/* Expiring soon panel */}
              {renewalItems.filter(s => isExpiringSoon(s, 30)).length > 0 && (
                <div className="rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="h-4 w-4 text-orange-500" />
                    <h2 className="text-sm font-semibold text-orange-700 dark:text-orange-400">Expiring Within 30 Days</h2>
                  </div>
                  <div className="space-y-2">
                    {renewalItems.filter(s => isExpiringSoon(s, 30)).slice(0, 5).map(s => {
                      const d = daysUntil(s.expiryDate);
                      return (
                        <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/60 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/30 cursor-pointer hover:bg-white dark:hover:bg-orange-950/40 transition-colors" onClick={() => openDetail(s)}>
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${d !== null && d <= 7 ? "bg-red-500" : "bg-orange-400"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{s.title}</p>
                            <p className="text-[10px] text-muted-foreground">{s.referenceNumber} · {WF_TYPES[s.workflowType]?.label}</p>
                          </div>
                          <span className={`text-[11px] font-semibold ${d !== null && d <= 7 ? "text-red-600" : "text-orange-600"}`}>{d === 0 ? "Today" : d === 1 ? "Tomorrow" : `${d}d`}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── BUILDER ── */}
          {section === "builder" && (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold">Workflow Builder</h1>
                  <p className="text-sm text-muted-foreground">Create and manage workflow templates. Templates provide pre-configured settings for each workflow type.</p>
                </div>
                <Button onClick={() => setBuilderOpen(true)} className="gap-2" data-testid="btn-new-template">
                  <Plus className="h-4 w-4" />New Template
                </Button>
              </div>

              {/* Default templates */}
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Built-in Templates</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {(Object.entries(WF_TYPES) as [WorkflowType, typeof WF_TYPES[WorkflowType]][]).map(([k, v]) => {
                    const Icon = v.icon;
                    const descriptions: Record<string, string> = {
                      recurring_task: "Create periodic tasks with automatic reminders and recurrence tracking.",
                      service_ticket: "Submit and track support or service requests with SLA management.",
                      license: "Manage software, trade, or regulatory licenses with expiry alerts.",
                      certificate: "Track employee and asset certificates with renewal workflows.",
                    };
                    return (
                      <div key={k} className="rounded-xl border bg-card hover:shadow-md transition-all">
                        <div className={`h-1.5 rounded-t-xl bg-gradient-to-r from-primary/60 to-primary/20`} />
                        <div className="p-4">
                          <div className={`p-2.5 rounded-xl ${v.bg} w-fit mb-3`}><Icon className={`h-5 w-5 ${v.color}`} /></div>
                          <h3 className="text-sm font-semibold">{v.label}</h3>
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Default</span>
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{descriptions[k]}</p>
                          <Button variant="outline" size="sm" className="w-full mt-3 h-7 text-xs" onClick={() => openCreate(k)}>
                            <Plus className="h-3 w-3 mr-1" />New Submission
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom templates */}
              {templates.filter(t => !t.isDefault).length > 0 && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Custom Templates</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {templates.filter(t => !t.isDefault).map(t => (
                      <TemplateCard key={t.id} t={t} onDelete={() => deleteTplMut.mutate(t.id)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SUBMISSIONS ── */}
          {(section === "submissions" || section === "my-requests") && (() => {
            const list = section === "my-requests" ? filtered.filter(s => s.createdBy === user?.id || s.requesterName === user?.name) : filtered;
            return (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-xl font-bold">{section === "my-requests" ? "My Requests" : "All Submissions"}</h1>
                    <p className="text-sm text-muted-foreground">{list.length} record{list.length !== 1 ? "s" : ""} {section === "my-requests" ? "submitted by you" : "total"}</p>
                  </div>
                  <Button onClick={() => openCreate()} className="gap-2" data-testid="btn-new-sub-list">
                    <Plus className="h-4 w-4" />New Submission
                  </Button>
                </div>
                <FilterBar />
                <div className="rounded-xl border overflow-hidden">
                  {list.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <ClipboardList className="h-8 w-8 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">No submissions found</p>
                      <p className="text-xs mt-1">Try adjusting your filters or create a new submission</p>
                    </div>
                  )}
                  {list.map(s => <SubmissionRow key={s.id} s={s} onClick={() => openDetail(s)} />)}
                </div>
              </div>
            );
          })()}

          {/* ── RENEWAL TRACKER ── */}
          {section === "renewal-tracker" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold">Renewal Tracker</h1>
                  <p className="text-sm text-muted-foreground">Track licenses and certificates approaching expiry or renewal.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openCreate("license")} className="gap-2 text-sm h-8" data-testid="btn-new-license"><Plus className="h-3.5 w-3.5" />License</Button>
                  <Button onClick={() => openCreate("certificate")} className="gap-2 text-sm h-8" data-testid="btn-new-cert"><Plus className="h-3.5 w-3.5" />Certificate</Button>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total", value: renewalItems.length, color: "text-foreground", icon: Layers },
                  { label: "Active", value: renewalItems.filter(s => s.status === "Active").length, color: "text-emerald-600", icon: CheckCircle2 },
                  { label: "Expiring ≤30d", value: renewalItems.filter(s => isExpiringSoon(s, 30)).length, color: "text-orange-500", icon: Bell },
                  { label: "Expired", value: renewalItems.filter(s => s.status === "Expired" || (s.expiryDate && s.expiryDate < today)).length, color: "text-red-500", icon: AlertTriangle },
                ].map(c => <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} color={c.color} />)}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="expiring">
                <TabsList className="h-8">
                  <TabsTrigger value="expiring" className="text-xs">Expiring Soon</TabsTrigger>
                  <TabsTrigger value="all" className="text-xs">All Renewals</TabsTrigger>
                  <TabsTrigger value="expired" className="text-xs">Expired</TabsTrigger>
                </TabsList>
                <TabsContent value="expiring">
                  <div className="rounded-xl border overflow-hidden mt-3">
                    {renewalItems.filter(s => isExpiringSoon(s, 60)).length === 0 && (
                      <div className="text-center py-12 text-muted-foreground"><CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-50" /><p className="text-sm">No items expiring in the next 60 days.</p></div>
                    )}
                    {[...renewalItems].filter(s => isExpiringSoon(s, 60)).sort((a, b) => (a.expiryDate || "").localeCompare(b.expiryDate || "")).map(s => {
                      const d = daysUntil(s.expiryDate);
                      const urgent = d !== null && d <= 7;
                      return (
                        <div key={s.id} className={`flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors ${urgent ? "bg-red-50/30 dark:bg-red-950/10" : ""}`} onClick={() => openDetail(s)}>
                          <div className={`p-2 rounded-lg ${WF_TYPES[s.workflowType]?.bg} shrink-0`}>
                            {s.workflowType === "license" ? <ShieldCheck className={`h-4 w-4 ${WF_TYPES.license.color}`} /> : <FileCheck2 className={`h-4 w-4 ${WF_TYPES.certificate.color}`} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.title}</p>
                            <p className="text-[11px] text-muted-foreground">{s.referenceNumber} · {s.departmentName || "—"} · {s.ownerName || "—"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <StatusBadge status={s.status} />
                            <p className={`text-[11px] font-semibold mt-1 ${urgent ? "text-red-600" : "text-orange-600"}`}>{d === 0 ? "Expires today" : d === 1 ? "Expires tomorrow" : `${d} days`}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
                <TabsContent value="all">
                  <div className="rounded-xl border overflow-hidden mt-3">
                    {renewalItems.length === 0 && <div className="text-center py-12 text-muted-foreground"><p className="text-sm">No license or certificate records yet.</p></div>}
                    {renewalItems.map(s => <SubmissionRow key={s.id} s={s} onClick={() => openDetail(s)} />)}
                  </div>
                </TabsContent>
                <TabsContent value="expired">
                  <div className="rounded-xl border overflow-hidden mt-3">
                    {renewalItems.filter(s => s.status === "Expired" || (s.expiryDate && s.expiryDate < today && s.status !== "Renewed")).length === 0 && (
                      <div className="text-center py-12 text-muted-foreground"><CheckCircle2 className="h-7 w-7 mx-auto mb-2 text-emerald-500 opacity-50" /><p className="text-sm">No expired items.</p></div>
                    )}
                    {renewalItems.filter(s => s.status === "Expired" || (s.expiryDate && s.expiryDate < today && s.status !== "Renewed")).map(s => <SubmissionRow key={s.id} s={s} onClick={() => openDetail(s)} />)}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* ── SERVICE DESK ── */}
          {section === "service-desk" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold">Service Desk</h1>
                  <p className="text-sm text-muted-foreground">Manage service and support tickets with priority and SLA tracking.</p>
                </div>
                <Button onClick={() => openCreate("service_ticket")} className="gap-2" data-testid="btn-new-ticket">
                  <Plus className="h-4 w-4" />New Ticket
                </Button>
              </div>

              {/* Ticket summary by status */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {["New", "Assigned", "In Progress", "Pending", "Resolved", "Escalated"].map(st => {
                  const count = serviceTickets.filter(t => t.status === st).length;
                  return (
                    <div key={st} className={`rounded-lg border p-3 text-center cursor-pointer hover:shadow-sm transition-all ${filterStatus === st ? "border-primary bg-primary/5" : ""}`} onClick={() => setFilterStatus(filterStatus === st ? "all" : st)}>
                      <p className={`text-lg font-bold ${count > 0 ? "" : "text-muted-foreground"}`}>{count}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{st}</p>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 flex-wrap">
                <FilterBar />
              </div>

              {/* Ticket list */}
              <div className="space-y-2">
                {["Critical", "High", "Medium", "Low"].map(prio => {
                  const tickets = serviceTickets.filter(t => t.priority === prio && (filterStatus === "all" || t.status === filterStatus) && (!search || t.title.toLowerCase().includes(search.toLowerCase())));
                  if (tickets.length === 0) return null;
                  return (
                    <div key={prio}>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-b ${prio === "Critical" ? "bg-red-50 dark:bg-red-950/20" : prio === "High" ? "bg-orange-50 dark:bg-orange-950/20" : prio === "Medium" ? "bg-blue-50 dark:bg-blue-950/20" : "bg-muted/30"}`}>
                        <PriorityBadge priority={prio} />
                        <span className="text-[11px] text-muted-foreground">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="rounded-b-xl border-x border-b overflow-hidden">
                        {tickets.map(t => <SubmissionRow key={t.id} s={t} onClick={() => openDetail(t)} />)}
                      </div>
                    </div>
                  );
                })}
                {serviceTickets.filter(t => (filterStatus === "all" || t.status === filterStatus)).length === 0 && (
                  <div className="text-center py-16 text-muted-foreground rounded-xl border">
                    <Ticket className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No tickets found</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => openCreate("service_ticket")}><Plus className="h-3.5 w-3.5 mr-1" />Create Ticket</Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {section === "analytics" && (
            <div className="p-6 space-y-6">
              <div>
                <h1 className="text-xl font-bold">Workflow Analytics</h1>
                <p className="text-sm text-muted-foreground">Overview of all workflow activity, statuses, and priorities across your organization.</p>
              </div>

              {/* Top stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Submissions" value={analytics?.total ?? 0} icon={Layers} color="text-foreground" />
                <StatCard label="Open Items" value={analytics?.open ?? 0} icon={Activity} color="text-blue-600" />
                <StatCard label="Overdue" value={analytics?.overdue ?? 0} icon={AlertTriangle} color="text-red-500" />
                <StatCard label="Expiring Soon" value={analytics?.expiringSoon ?? 0} icon={Bell} color="text-orange-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* By Type */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">By Workflow Type</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(WF_TYPES).map(([k, v]) => {
                      const count = analytics?.byType?.[k] ?? 0;
                      const total = analytics?.total || 1;
                      const pct = Math.round((count / total) * 100);
                      const Icon = v.icon;
                      return (
                        <div key={k}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="flex items-center gap-1.5 text-xs font-medium"><Icon className={`h-3.5 w-3.5 ${v.color}`} />{v.label}</span>
                            <span className="text-xs font-semibold">{count}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${v.color.replace("text-", "bg-")}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* By Status */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">By Status</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(analytics?.byStatus || {}).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([st, count]) => (
                      <div key={st} className="flex items-center justify-between">
                        <StatusBadge status={st} />
                        <span className="text-sm font-semibold tabular-nums">{count}</span>
                      </div>
                    ))}
                    {!analytics?.byStatus && <p className="text-xs text-muted-foreground">No data yet</p>}
                  </CardContent>
                </Card>

                {/* By Priority */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">By Priority</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {["Critical", "High", "Medium", "Low"].map(p => {
                      const count = analytics?.byPriority?.[p] ?? 0;
                      const total = analytics?.total || 1;
                      const pct = Math.round((count / total) * 100);
                      const barColors: Record<string, string> = { Critical: "bg-red-500", High: "bg-orange-500", Medium: "bg-blue-500", Low: "bg-gray-400" };
                      return (
                        <div key={p}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium">{p}</span>
                            <span className="font-semibold tabular-nums">{count}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColors[p]}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Overdue breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Overdue Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    {submissions.filter(isOverdue).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground"><CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-emerald-500 opacity-60" /><p className="text-sm">No overdue items. Great work!</p></div>
                    )}
                    {submissions.filter(isOverdue).map(s => <SubmissionRow key={s.id} s={s} onClick={() => openDetail(s)} />)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>

      {/* Create dialog */}
      <CreateSubmissionDialog open={createOpen} onClose={() => setCreateOpen(false)} defaultType={createType} departments={departments} />

      {/* Detail dialog */}
      {detailSub && (
        <SubmissionDetail
          sub={detailFull || detailSub}
          onClose={() => setDetailSub(null)}
          onUpdate={() => { refetchDetail(); refetchSubs(); queryClient.invalidateQueries({ queryKey: ["/api/workflow/analytics"] }); }}
          departments={departments}
        />
      )}

      {/* Template builder dialog */}
      <Dialog open={builderOpen} onOpenChange={v => !v && setBuilderOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary" />New Workflow Template</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Template Name <span className="text-red-500">*</span></Label>
              <Input value={builderForm.title} onChange={e => setBuilderForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Monthly Compliance Check" className="mt-1" data-testid="input-template-name" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={builderForm.description} onChange={e => setBuilderForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe this template's purpose..." rows={2} className="mt-1 resize-none" />
            </div>
            <div>
              <Label className="text-xs">Based On</Label>
              <Select value={builderForm.workflowType} onValueChange={v => setBuilderForm(f => ({ ...f, workflowType: v as WorkflowType }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(WF_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Input value={builderForm.category} onChange={e => setBuilderForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. IT, HR, Compliance" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuilderOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!builderForm.title.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
              createTplMut.mutate(builderForm);
            }} disabled={createTplMut.isPending} data-testid="btn-save-template">
              {createTplMut.isPending ? "Saving…" : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
