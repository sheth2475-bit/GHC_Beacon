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
import { Switch } from "@/components/ui/switch";
import {
  Workflow, Plus, Search, X, Clock, AlertTriangle, CheckCircle2,
  Ticket, RotateCcw, ShieldCheck, FileCheck2, BarChart2, Home, Settings,
  User, Calendar, Building2, ChevronRight, Trash2, SendHorizontal,
  Activity, ArrowUpRight, Layers, Bell, Zap, ClipboardList,
  LayoutList, Kanban, Table2, CalendarDays, Star, Filter,
  TrendingUp, TrendingDown, Users, BarChart3, Lightbulb,
  RefreshCw, AlertCircle, CheckSquare, Timer, ArrowRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type WorkflowType = "recurring_task" | "service_ticket" | "license" | "certificate";
type ViewMode = "list" | "board" | "table" | "calendar";
interface Submission {
  id: number; referenceNumber: string; workflowType: WorkflowType;
  title: string; description?: string; status: string; priority: string;
  ownerName?: string; ownerEmail?: string;
  assignedTo?: string; assignedToEmail?: string;
  requesterName?: string; requesterEmail?: string;
  departmentName?: string; category?: string; createdBy?: number;
  dueDate?: string; expiryDate?: string; renewalDate?: string; nextOccurrence?: string;
  recurrenceType?: string; vendorName?: string; issueAuthority?: string;
  licenseType?: string; holderName?: string; holderEmail?: string; slaTarget?: string;
  createdAt: string; updatedAt: string;
  comments?: Comment[]; activity?: ActivityEntry[];
}
interface Comment { id: number; authorName: string; content: string; isInternal: boolean; createdAt: string; }
interface ActivityEntry { id: number; actorName: string; action: string; oldValue?: string; newValue?: string; field?: string; createdAt: string; }
interface Analytics { total: number; open: number; overdue: number; expiringSoon: number; byType: Record<string, number>; byStatus: Record<string, number>; byPriority: Record<string, number>; }

// ── Constants ─────────────────────────────────────────────────────────────────
const WF_TYPES: Record<WorkflowType, { label: string; icon: typeof Workflow; color: string; bg: string; accent: string }> = {
  recurring_task: { label: "Recurring Tasks", icon: RotateCcw, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40", accent: "border-blue-400" },
  service_ticket: { label: "Service Tickets", icon: Ticket, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/40", accent: "border-violet-400" },
  license: { label: "Licenses", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40", accent: "border-emerald-400" },
  certificate: { label: "Certificates", icon: FileCheck2, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40", accent: "border-amber-400" },
};

const STATUS_BY_TYPE: Record<WorkflowType, string[]> = {
  service_ticket: ["New", "Assigned", "In Progress", "Pending", "Resolved", "Closed", "Escalated"],
  recurring_task: ["Scheduled", "Due Soon", "In Progress", "Completed", "Overdue"],
  license: ["Active", "Expiring Soon", "Renewal in Progress", "Renewed", "Expired", "Suspended"],
  certificate: ["Active", "Expiring Soon", "Renewal in Progress", "Renewed", "Expired"],
};

const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Assigned: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "In Progress": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Closed: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
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
  Suspended: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  Low: "bg-gray-100 text-gray-500",
  Medium: "bg-blue-100 text-blue-600",
  High: "bg-orange-100 text-orange-600",
  Critical: "bg-red-100 text-red-600 font-semibold",
};

const BOARD_COLS: Record<WorkflowType, string[]> = {
  service_ticket: ["New", "Assigned", "In Progress", "Pending", "Escalated"],
  recurring_task: ["Scheduled", "Due Soon", "In Progress", "Completed"],
  license: ["Active", "Expiring Soon", "Renewal in Progress", "Renewed"],
  certificate: ["Active", "Expiring Soon", "Renewal in Progress", "Renewed"],
};

const SECTIONS = [
  { key: "home", label: "Home", icon: Home },
  { key: "builder", label: "Workflow Builder", icon: Settings },
  { key: "records", label: "Records", icon: ClipboardList },
  { key: "renewals", label: "Renewals", icon: Bell },
  { key: "analytics", label: "Analytics", icon: BarChart2 },
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
const today = () => new Date().toISOString().slice(0, 10);
function isOverdue(s: Submission) {
  return !!s.dueDate && s.dueDate < today() && !["Completed", "Resolved", "Closed", "Renewed"].includes(s.status);
}
function isExpiringSoon(s: Submission, days = 30) {
  const d = daysUntil(s.expiryDate);
  return d !== null && d >= 0 && d <= days;
}

// ── Micro components ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_COLORS[status] || "bg-muted text-muted-foreground"}`}>{status}</span>;
}
function PriorityDot({ priority }: { priority: string }) {
  const c = { Critical: "bg-red-500", High: "bg-orange-400", Medium: "bg-blue-400", Low: "bg-gray-300" };
  return <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${c[priority as keyof typeof c] || "bg-muted"}`} />;
}
function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: number | string; icon: typeof Workflow; color: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className="p-2 rounded-lg bg-muted/50"><Icon className={`h-4 w-4 ${color}`} /></div>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Submission card (list row) ─────────────────────────────────────────────────
function SubRow({ s, onClick }: { s: Submission; onClick: () => void }) {
  const wf = WF_TYPES[s.workflowType];
  const Icon = wf.icon;
  const overdue = isOverdue(s);
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-border/40 hover:bg-muted/40 cursor-pointer transition-colors group ${overdue ? "bg-red-50/30 dark:bg-red-950/10" : ""}`}
      onClick={onClick} data-testid={`row-submission-${s.id}`}
    >
      <div className={`p-1.5 rounded-lg ${wf.bg} shrink-0`}><Icon className={`h-3.5 w-3.5 ${wf.color}`} /></div>
      <div className="w-28 shrink-0 hidden sm:block"><span className="text-[10px] font-mono text-muted-foreground">{s.referenceNumber}</span></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{s.title}</p>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
          {s.departmentName && <span>{s.departmentName}</span>}
          {s.ownerName && <span>· {s.ownerName}</span>}
          {overdue && <span className="text-red-500 flex items-center gap-0.5"><AlertTriangle className="h-2.5 w-2.5" />Overdue</span>}
          {s.expiryDate && <span>· Exp {fmt(s.expiryDate)}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <PriorityDot priority={s.priority} />
        <StatusBadge status={s.status} />
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 group-hover:text-primary/40 transition-colors" />
    </div>
  );
}

// ── Board card ────────────────────────────────────────────────────────────────
function BoardCard({ s, onClick }: { s: Submission; onClick: () => void }) {
  const wf = WF_TYPES[s.workflowType];
  const overdue = isOverdue(s);
  return (
    <div
      className={`rounded-lg border bg-card p-3 hover:shadow-md cursor-pointer transition-all group space-y-2 ${overdue ? "border-red-200 dark:border-red-900/40" : ""}`}
      onClick={onClick} data-testid={`card-board-${s.id}`}
    >
      <div className="flex items-start gap-2">
        <PriorityDot priority={s.priority} />
        <p className="text-xs font-medium leading-snug flex-1 group-hover:text-primary transition-colors">{s.title}</p>
      </div>
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <span className="text-[9px] font-mono text-muted-foreground">{s.referenceNumber}</span>
        {s.dueDate && <span className={`text-[10px] flex items-center gap-0.5 ${overdue ? "text-red-500" : "text-muted-foreground"}`}><Clock className="h-2.5 w-2.5" />{fmt(s.dueDate)}</span>}
      </div>
      {s.ownerName && (
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">
            {s.ownerName.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
          <span className="text-[10px] text-muted-foreground truncate">{s.ownerName}</span>
        </div>
      )}
    </div>
  );
}

// ── Table view row ─────────────────────────────────────────────────────────────
function TableRow({ s, onClick }: { s: Submission; onClick: () => void }) {
  return (
    <tr className="border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors group" onClick={onClick} data-testid={`tr-submission-${s.id}`}>
      <td className="px-3 py-2.5 text-[10px] font-mono text-muted-foreground whitespace-nowrap">{s.referenceNumber}</td>
      <td className="px-3 py-2.5 text-sm font-medium group-hover:text-primary transition-colors max-w-xs"><span className="truncate block">{s.title}</span></td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{s.departmentName || "—"}</td>
      <td className="px-3 py-2.5 whitespace-nowrap"><StatusBadge status={s.status} /></td>
      <td className="px-3 py-2.5 whitespace-nowrap"><span className={`text-[11px] px-2 py-0.5 rounded font-medium ${PRIORITY_COLORS[s.priority] || ""}`}>{s.priority}</span></td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{s.ownerName || "—"}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmt(s.dueDate || s.expiryDate)}</td>
    </tr>
  );
}

// ── Calendar view ─────────────────────────────────────────────────────────────
function CalendarView({ submissions, onSelect }: { submissions: Submission[]; onSelect: (s: Submission) => void }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const year = month.getFullYear(), mon = month.getMonth();
  const firstDay = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
  const itemsByDay: Record<number, Submission[]> = {};
  for (const s of submissions) {
    const dateStr = s.dueDate || s.expiryDate;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    if (d.getFullYear() === year && d.getMonth() === mon) {
      const day = d.getDate();
      if (!itemsByDay[day]) itemsByDay[day] = [];
      itemsByDay[day].push(s);
    }
  }
  const todayDate = new Date();
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <button onClick={() => setMonth(new Date(year, mon - 1, 1))} className="p-1.5 rounded hover:bg-muted transition-colors">‹</button>
        <span className="text-sm font-semibold">{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
        <button onClick={() => setMonth(new Date(year, mon + 1, 1))} className="p-1.5 rounded hover:bg-muted transition-colors">›</button>
      </div>
      <div className="grid grid-cols-7 text-center border-b">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <div key={d} className="py-2 text-[10px] font-bold text-muted-foreground uppercase">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-border/30">
        {cells.map((day, i) => {
          const isToday = day === todayDate.getDate() && mon === todayDate.getMonth() && year === todayDate.getFullYear();
          const items = day ? (itemsByDay[day] || []) : [];
          return (
            <div key={i} className={`min-h-[72px] p-1.5 text-xs ${!day ? "bg-muted/20" : "hover:bg-muted/20 transition-colors"}`}>
              {day && (
                <>
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium mb-1 ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{day}</span>
                  <div className="space-y-0.5">
                    {items.slice(0, 2).map(s => {
                      const wf = WF_TYPES[s.workflowType];
                      return (
                        <div key={s.id} className={`text-[9px] px-1 py-0.5 rounded cursor-pointer truncate font-medium ${wf.bg} ${wf.color} hover:opacity-80`} onClick={() => onSelect(s)} title={s.title}>{s.title}</div>
                      );
                    })}
                    {items.length > 2 && <div className="text-[9px] text-muted-foreground px-1">+{items.length - 2} more</div>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Board view ────────────────────────────────────────────────────────────────
function BoardView({ submissions, wfType, onSelect }: { submissions: Submission[]; wfType: WorkflowType; onSelect: (s: Submission) => void }) {
  const cols = BOARD_COLS[wfType] || [];
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {cols.map(status => {
        const cards = submissions.filter(s => s.status === status && s.workflowType === wfType);
        return (
          <div key={status} className="flex-shrink-0 w-64">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                <span className="text-xs font-semibold text-muted-foreground">{cards.length}</span>
              </div>
            </div>
            <div className="space-y-2 min-h-[120px] rounded-xl bg-muted/30 p-2">
              {cards.map(s => <BoardCard key={s.id} s={s} onClick={() => onSelect(s)} />)}
              {cards.length === 0 && <div className="text-center py-6 text-[11px] text-muted-foreground/60">No items</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Create dialog ─────────────────────────────────────────────────────────────
function CreateDialog({ open, onClose, defaultType, departments }: {
  open: boolean; onClose: () => void; defaultType?: WorkflowType; departments: { id: number; name: string }[];
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<WorkflowType>(defaultType || "service_ticket");
  const [form, setForm] = useState<Record<string, string>>({
    title: "", description: "", priority: "Medium",
    ownerName: "", ownerEmail: "",
    assignedTo: "", assignedToEmail: "",
    requesterName: "", requesterEmail: "",
    departmentName: "", dueDate: "", expiryDate: "",
    recurrenceType: "Monthly", vendorName: "", issueAuthority: "",
    licenseType: "", holderName: "", holderEmail: "", category: "", slaTarget: "",
  });
  const defaults: Record<WorkflowType, string> = { recurring_task: "Scheduled", service_ticket: "New", license: "Active", certificate: "Active" };

  const mut = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiRequest("POST", "/api/workflow/submissions", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/analytics"] });
      toast({ title: "Record created" });
      onClose();
      setForm({ title: "", description: "", priority: "Medium", ownerName: "", departmentName: "", dueDate: "", expiryDate: "", recurrenceType: "Monthly", vendorName: "", issueAuthority: "", licenseType: "", holderName: "", category: "", slaTarget: "" });
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }
  function submit() {
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    mut.mutate({ ...form, workflowType: type, status: defaults[type], requesterName: user?.name });
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />New Record</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.entries(WF_TYPES) as [WorkflowType, typeof WF_TYPES[WorkflowType]][]).map(([k, v]) => {
              const Icon = v.icon;
              return (
                <button key={k} onClick={() => setType(k)} data-testid={`btn-type-${k}`}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-center transition-all ${type === k ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                  <div className={`p-2 rounded-lg ${v.bg}`}><Icon className={`h-4 w-4 ${v.color}`} /></div>
                  <span className="text-[11px] font-medium leading-tight">{v.label}</span>
                </button>
              );
            })}
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-3">
            <div><Label className="text-xs">Title *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} className="mt-1" data-testid="input-wf-title" /></div>
            <div><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} className="mt-1 resize-none" data-testid="input-wf-description" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={form.priority} onValueChange={v => set("priority", v)}>
                <SelectTrigger className="mt-1 h-9 text-sm" data-testid="select-wf-priority"><SelectValue /></SelectTrigger>
                <SelectContent>{["Low", "Medium", "High", "Critical"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Department</Label>
              <Select value={form.departmentName} onValueChange={v => set("departmentName", v)}>
                <SelectTrigger className="mt-1 h-9 text-sm" data-testid="select-wf-dept"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="General">General</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Category</Label><Input value={form.category} onChange={e => set("category", e.target.value)} className="mt-1 h-9" /></div>
          </div>

          {/* ── Assignment block ── */}
          <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><User className="h-3 w-3" />Assignment &amp; Notifications</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Owner Name</Label>
                <Input value={form.ownerName} onChange={e => set("ownerName", e.target.value)} placeholder="Full name" className="mt-1 h-8 text-sm" data-testid="input-wf-owner" />
              </div>
              <div>
                <Label className="text-xs">Owner Email</Label>
                <Input type="email" value={form.ownerEmail} onChange={e => set("ownerEmail", e.target.value)} placeholder="owner@company.com" className="mt-1 h-8 text-sm" data-testid="input-wf-owner-email" />
              </div>
              <div>
                <Label className="text-xs">Assigned To (Name)</Label>
                <Input value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)} placeholder="Full name" className="mt-1 h-8 text-sm" data-testid="input-wf-assigned" />
              </div>
              <div>
                <Label className="text-xs">Assigned To (Email)</Label>
                <Input type="email" value={form.assignedToEmail} onChange={e => set("assignedToEmail", e.target.value)} placeholder="assignee@company.com" className="mt-1 h-8 text-sm" data-testid="input-wf-assigned-email" />
              </div>
              {(type === "service_ticket") && (
                <>
                  <div>
                    <Label className="text-xs">Requester Name</Label>
                    <Input value={form.requesterName} onChange={e => set("requesterName", e.target.value)} placeholder="Full name" className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Requester Email</Label>
                    <Input type="email" value={form.requesterEmail} onChange={e => set("requesterEmail", e.target.value)} placeholder="requester@company.com" className="mt-1 h-8 text-sm" data-testid="input-wf-requester-email" />
                  </div>
                </>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Bell className="h-2.5 w-2.5" />Automation reminder emails will be sent to these addresses based on your configured rules.</p>
          </div>
          {type === "recurring_task" && (
            <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-3">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Recurring Task Settings</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Recurrence</Label>
                  <Select value={form.recurrenceType} onValueChange={v => set("recurrenceType", v)}>
                    <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Start / Due Date</Label><Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} className="mt-1 h-9" /></div>
              </div>
            </div>
          )}
          {type === "service_ticket" && (
            <div className="p-3 rounded-lg bg-violet-50/60 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 space-y-3">
              <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide">Ticket Settings</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Due Date</Label><Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} className="mt-1 h-9" /></div>
                <div><Label className="text-xs">SLA Target</Label><Input value={form.slaTarget} onChange={e => set("slaTarget", e.target.value)} placeholder="e.g. 4 hours" className="mt-1 h-9" /></div>
              </div>
            </div>
          )}
          {(type === "license" || type === "certificate") && (
            <div className={`p-3 rounded-lg border space-y-3 ${type === "license" ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40" : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40"}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${type === "license" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>{type === "license" ? "License Details" : "Certificate Details"}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Type</Label><Input value={form.licenseType} onChange={e => set("licenseType", e.target.value)} placeholder="e.g. Trade, Software" className="mt-1 h-9" /></div>
                <div><Label className="text-xs">{type === "license" ? "Vendor" : "Issuing Authority"}</Label>
                  <Input value={type === "license" ? form.vendorName : form.issueAuthority} onChange={e => set(type === "license" ? "vendorName" : "issueAuthority", e.target.value)} className="mt-1 h-9" />
                </div>
                <div><Label className="text-xs">Holder Name</Label><Input value={form.holderName} onChange={e => set("holderName", e.target.value)} className="mt-1 h-9" /></div>
                <div><Label className="text-xs">Holder Email</Label><Input type="email" value={form.holderEmail} onChange={e => set("holderEmail", e.target.value)} placeholder="holder@company.com" className="mt-1 h-9" data-testid="input-wf-holder-email" /></div>
                <div><Label className="text-xs">Issue Date</Label><Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} className="mt-1 h-9" /></div>
                <div><Label className="text-xs">Expiry Date</Label><Input type="date" value={form.expiryDate} onChange={e => set("expiryDate", e.target.value)} className="mt-1 h-9" data-testid="input-expiry-date" /></div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={mut.isPending} data-testid="btn-submit-workflow">{mut.isPending ? "Saving…" : "Create Record"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Detail dialog ─────────────────────────────────────────────────────────────
function DetailDialog({ sub, onClose, onUpdate }: { sub: Submission; onClose: () => void; onUpdate: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [tab, setTab] = useState("details");
  const wf = WF_TYPES[sub.workflowType];
  const Icon = wf.icon;

  const updateMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiRequest("PATCH", `/api/workflow/submissions/${sub.id}`, d),
    onSuccess: () => { onUpdate(); toast({ title: "Updated" }); },
  });
  const commentMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/workflow/submissions/${sub.id}/comments`, { content: comment }),
    onSuccess: () => { onUpdate(); setComment(""); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/workflow/submissions/${sub.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/workflow/submissions"] }); queryClient.invalidateQueries({ queryKey: ["/api/workflow/analytics"] }); onClose(); toast({ title: "Deleted" }); },
  });

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${wf.bg} shrink-0`}><Icon className={`h-5 w-5 ${wf.color}`} /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-muted-foreground">{sub.referenceNumber}</span>
                <StatusBadge status={sub.status} />
                <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${PRIORITY_COLORS[sub.priority] || ""}`}>{sub.priority}</span>
                {isOverdue(sub) && <span className="text-[10px] text-red-500 flex items-center gap-0.5"><AlertTriangle className="h-2.5 w-2.5" />Overdue</span>}
                {isExpiringSoon(sub) && <span className="text-[10px] text-orange-500 flex items-center gap-0.5"><Bell className="h-2.5 w-2.5" />Expiring</span>}
              </div>
              <DialogTitle className="text-base mt-1">{sub.title}</DialogTitle>
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
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
              <div className="flex-1">
                <Label className="text-xs">Update Status</Label>
                <Select defaultValue={sub.status} onValueChange={v => updateMut.mutate({ status: v })}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_BY_TYPE[sub.workflowType].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button variant="destructive" size="sm" className="h-8 text-xs mt-5" onClick={() => deleteMut.mutate()} disabled={deleteMut.isPending}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { l: "Workflow Type", v: wf.label }, { l: "Priority", v: sub.priority },
                { l: "Department", v: sub.departmentName }, { l: "Category", v: sub.category },
                { l: "Due Date", v: fmt(sub.dueDate) }, { l: "Expiry Date", v: fmt(sub.expiryDate) },
                sub.recurrenceType && { l: "Recurrence", v: sub.recurrenceType },
                sub.slaTarget && { l: "SLA Target", v: sub.slaTarget },
                sub.vendorName && { l: "Vendor", v: sub.vendorName },
                sub.issueAuthority && { l: "Authority", v: sub.issueAuthority },
                sub.licenseType && { l: "Type", v: sub.licenseType },
              ].filter(Boolean).map((item: any) => item.v && item.v !== "—" && (
                <div key={item.l} className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{item.l}</span>
                  <span className="text-sm font-medium">{item.v}</span>
                </div>
              ))}
            </div>

            {/* Assignment & contact emails */}
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><User className="h-3 w-3" />Assignment &amp; Notification Contacts</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {[
                  { l: "Owner", name: sub.ownerName, email: sub.ownerEmail },
                  { l: "Assigned To", name: sub.assignedTo, email: sub.assignedToEmail },
                  { l: "Requester", name: sub.requesterName, email: sub.requesterEmail },
                  ...(sub.holderName || sub.holderEmail ? [{ l: "Certificate / License Holder", name: sub.holderName, email: sub.holderEmail }] : []),
                ].filter(r => r.name || r.email).map(r => (
                  <div key={r.l} className="flex items-start gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {r.name ? r.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2) : "?"}
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">{r.l}</p>
                      {r.name && <p className="text-xs font-medium leading-tight">{r.name}</p>}
                      {r.email && <a href={`mailto:${r.email}`} className="text-[11px] text-primary hover:underline">{r.email}</a>}
                    </div>
                  </div>
                ))}
                {!sub.ownerName && !sub.ownerEmail && !sub.assignedTo && !sub.assignedToEmail && !sub.requesterName && !sub.requesterEmail && (
                  <p className="text-xs text-muted-foreground col-span-2">No assignment contacts set. Edit this record to add them.</p>
                )}
              </div>
            </div>

            {sub.description && <><p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Description</p><p className="text-sm text-foreground/80 leading-relaxed">{sub.description}</p></>}
            <p className="text-[10px] text-muted-foreground">Created {fmt(sub.createdAt)} · Updated {fmt(sub.updatedAt)}</p>
          </TabsContent>
          <TabsContent value="comments" className="mt-4 space-y-3">
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {(sub.comments || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>}
              {(sub.comments || []).map(c => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{c.authorName.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-xs font-semibold">{c.authorName}</span><span className="text-[10px] text-muted-foreground">{fmt(c.createdAt)}</span></div><p className="text-sm text-foreground/80 mt-0.5">{c.content}</p></div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex gap-2">
              <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment…" rows={2} className="resize-none text-sm" data-testid="input-comment" />
              <Button size="icon" className="self-end h-9 w-9 shrink-0" onClick={() => commentMut.mutate()} disabled={!comment.trim() || commentMut.isPending} data-testid="btn-send-comment"><SendHorizontal className="h-4 w-4" /></Button>
            </div>
          </TabsContent>
          <TabsContent value="activity" className="mt-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(sub.activity || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No activity recorded.</p>}
              {(sub.activity || []).map(a => (
                <div key={a.id} className="flex items-start gap-2 text-sm">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                  <div><span className="font-medium">{a.actorName}</span>{" "}{a.action === "status_changed" ? <>changed status <span className="font-medium">{a.oldValue}</span> → <span className="font-medium">{a.newValue}</span></> : a.action === "commented" ? "added a comment" : a.action === "created" ? "created this record" : a.action}<span className="text-[10px] text-muted-foreground ml-2">{fmt(a.createdAt)}</span></div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Automation rule cards for Builder ─────────────────────────────────────────
const AUTOMATION_RULES: Record<WorkflowType, { id: string; trigger: string; action: string; icon: typeof Workflow; enabled: boolean }[]> = {
  service_ticket: [
    { id: "tkt-1", trigger: "Ticket created", action: "Auto-assign to department owner", icon: User, enabled: true },
    { id: "tkt-2", trigger: "SLA due date nearing (2 hours)", action: "Alert assignee and department head", icon: Bell, enabled: true },
    { id: "tkt-3", trigger: "SLA breached", action: "Escalate to manager and change status to Escalated", icon: AlertCircle, enabled: true },
    { id: "tkt-4", trigger: "No update for 48 hours", action: "Send reminder to assignee", icon: Timer, enabled: false },
  ],
  recurring_task: [
    { id: "rt-1", trigger: "Task completed", action: "Generate next occurrence automatically", icon: RefreshCw, enabled: true },
    { id: "rt-2", trigger: "Due date within 3 days", action: "Change status to Due Soon and alert owner", icon: Bell, enabled: true },
    { id: "rt-3", trigger: "Due date passed", action: "Change status to Overdue and notify department head", icon: AlertTriangle, enabled: true },
    { id: "rt-4", trigger: "Task overdue for 7+ days", action: "Escalate to manager", icon: AlertCircle, enabled: false },
  ],
  license: [
    { id: "lic-1", trigger: "60 days before expiry", action: "Notify renewal owner and start renewal checklist", icon: Bell, enabled: true },
    { id: "lic-2", trigger: "30 days before expiry", action: "Send escalation alert to department head", icon: AlertTriangle, enabled: true },
    { id: "lic-3", trigger: "7 days before expiry", action: "Send critical reminder, change status to Expiring Soon", icon: AlertCircle, enabled: true },
    { id: "lic-4", trigger: "License expired", action: "Change status to Expired and notify compliance team", icon: X, enabled: true },
  ],
  certificate: [
    { id: "cert-1", trigger: "60 days before expiry", action: "Notify certificate holder and renewal owner", icon: Bell, enabled: true },
    { id: "cert-2", trigger: "30 days before expiry", action: "Send escalation alert to HR/Compliance", icon: AlertTriangle, enabled: true },
    { id: "cert-3", trigger: "7 days before expiry", action: "Critical reminder, change status to Expiring Soon", icon: AlertCircle, enabled: true },
    { id: "cert-4", trigger: "Certificate expired", action: "Change status to Expired, flag in compliance report", icon: X, enabled: true },
  ],
};

// ── Mini bar chart ─────────────────────────────────────────────────────────────
function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1"><span className="text-muted-foreground truncate">{label}</span><span className="font-semibold tabular-nums">{value}</span></div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WorkflowCenterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [section, setSection] = useState("home");
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<WorkflowType | undefined>();
  const [detailSub, setDetailSub] = useState<Submission | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | WorkflowType>("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [myWork, setMyWork] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [builderType, setBuilderType] = useState<WorkflowType>("service_ticket");
  const [builderTab, setBuilderTab] = useState("overview");
  const [automationRules, setAutomationRules] = useState(AUTOMATION_RULES);
  const [renewalView, setRenewalView] = useState<"list" | "calendar">("list");
  const [renewalTab, setRenewalTab] = useState("expiring");
  const [analyticsType, setAnalyticsType] = useState<"all" | WorkflowType>("all");

  const { data: allSubs = [], refetch: refetchSubs } = useQuery<Submission[]>({ queryKey: ["/api/workflow/submissions"], enabled: !!user });
  const { data: analytics } = useQuery<Analytics>({ queryKey: ["/api/workflow/analytics"], enabled: !!user });
  const { data: company } = useQuery<{ departments: { id: number; name: string }[] }>({ queryKey: ["/api/company"], enabled: !!user });
  const { data: detailFull, refetch: refetchDetail } = useQuery<Submission>({
    queryKey: ["/api/workflow/submissions", detailSub?.id],
    queryFn: () => fetch(`/api/workflow/submissions/${detailSub?.id}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!detailSub,
  });

  const departments = company?.departments || [];
  const t = today();
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const in60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

  const filtered = useMemo(() => allSubs.filter(s => {
    if (filterType !== "all" && s.workflowType !== filterType) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterPriority !== "all" && s.priority !== filterPriority) return false;
    if (myWork && s.createdBy !== user?.id && s.ownerName !== user?.name) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.referenceNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [allSubs, filterType, filterStatus, filterPriority, myWork, search, user]);

  const renewalItems = useMemo(() => allSubs.filter(s => s.workflowType === "license" || s.workflowType === "certificate"), [allSubs]);
  const expiringItems = useMemo(() => renewalItems.filter(s => isExpiringSoon(s, 60)).sort((a, b) => (a.expiryDate || "").localeCompare(b.expiryDate || "")), [renewalItems]);
  const expiredItems = useMemo(() => renewalItems.filter(s => s.expiryDate && s.expiryDate < t && !["Renewed", "Renewal in Progress"].includes(s.status)), [renewalItems, t]);

  function openCreate(type?: WorkflowType) { setCreateType(type); setCreateOpen(true); }
  function openDetail(s: Submission) { setDetailSub(s); }
  function toggleRule(type: WorkflowType, id: string) {
    setAutomationRules(r => ({ ...r, [type]: r[type].map(rule => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule) }));
  }

  // Workload by owner
  const ownerLoad = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of allSubs) {
      if (s.ownerName && !["Completed", "Resolved", "Closed", "Renewed", "Expired"].includes(s.status)) {
        map[s.ownerName] = (map[s.ownerName] || 0) + 1;
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [allSubs]);

  const FilterBar = () => (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or ref…" className="pl-8 h-8 text-sm" data-testid="input-search-submissions" />
      </div>
      <Select value={filterType} onValueChange={v => setFilterType(v as any)}>
        <SelectTrigger className="h-8 text-xs w-36" data-testid="select-filter-type"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">All Types</SelectItem>{Object.entries(WF_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent><SelectItem value="all">All Status</SelectItem>{Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={filterPriority} onValueChange={setFilterPriority}>
        <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent><SelectItem value="all">All</SelectItem>{["Low", "Medium", "High", "Critical"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
      </Select>
      <div className="flex items-center gap-1.5">
        <Switch checked={myWork} onCheckedChange={setMyWork} id="my-work" className="h-4 w-7" />
        <Label htmlFor="my-work" className="text-xs cursor-pointer">My Work</Label>
      </div>
      {(search || filterType !== "all" || filterStatus !== "all" || filterPriority !== "all" || myWork) && (
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearch(""); setFilterType("all"); setFilterStatus("all"); setFilterPriority("all"); setMyWork(false); }}>
          <X className="h-3 w-3 mr-1" />Clear
        </Button>
      )}
    </div>
  );

  const ViewSwitcher = ({ modes }: { modes: ViewMode[] }) => (
    <div className="flex items-center border rounded-lg overflow-hidden">
      {modes.map(m => {
        const icons: Record<ViewMode, typeof Workflow> = { list: LayoutList, board: Kanban, table: Table2, calendar: CalendarDays };
        const Icon = icons[m];
        return (
          <button key={m} onClick={() => setView(m)}
            className={`px-2.5 py-1.5 transition-colors ${view === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}
            data-testid={`btn-view-${m}`} title={m.charAt(0).toUpperCase() + m.slice(1)}>
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Sidebar nav */}
      <aside className="w-52 shrink-0 border-r bg-muted/10 flex flex-col py-4 px-2 gap-0.5 hidden md:flex">
        <div className="px-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10"><Workflow className="h-4 w-4 text-primary" /></div>
            <div><h2 className="text-sm font-bold">Workflow Center</h2><p className="text-[10px] text-muted-foreground">Operations Hub</p></div>
          </div>
        </div>
        <div className="h-px bg-border mb-2" />
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const active = section === s.key;
          const badge = s.key === "renewals" ? expiringItems.filter(i => isExpiringSoon(i, 14)).length : 0;
          return (
            <button key={s.key} onClick={() => setSection(s.key)} data-testid={`nav-wf-${s.key}`}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all w-full text-left ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}>
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary-foreground" : ""}`} />
              <span className="flex-1 truncate">{s.label}</span>
              {badge > 0 && <span className="text-[9px] bg-red-500 text-white rounded-full px-1.5 font-bold">{badge}</span>}
            </button>
          );
        })}
        <div className="flex-1" />
        <div className="px-3"><Button onClick={() => openCreate()} className="w-full h-8 text-xs gap-1.5" data-testid="btn-new-submission-sidebar"><Plus className="h-3.5 w-3.5" />New Record</Button></div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile nav */}
        <div className="md:hidden flex items-center gap-1 px-3 py-2 border-b overflow-x-auto">
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setSection(s.key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${section === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ═══════════ HOME ═══════════ */}
          {section === "home" && (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><h1 className="text-xl font-bold">Workflow Center</h1><p className="text-sm text-muted-foreground">Command center for all operational workflows.</p></div>
                <Button onClick={() => openCreate()} className="gap-2" data-testid="btn-new-submission-home"><Plus className="h-4 w-4" />New Record</Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Records" value={analytics?.total ?? allSubs.length} icon={Layers} color="text-foreground" />
                <StatCard label="Open Items" value={analytics?.open ?? 0} icon={Activity} color="text-blue-600" sub="across all types" />
                <StatCard label="Overdue" value={analytics?.overdue ?? 0} icon={AlertTriangle} color="text-red-500" sub="requires attention" />
                <StatCard label="Expiring ≤30d" value={analytics?.expiringSoon ?? 0} icon={Bell} color="text-orange-500" sub="licenses & certs" />
              </div>

              {/* Per-type summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.entries(WF_TYPES) as [WorkflowType, typeof WF_TYPES[WorkflowType]][]).map(([k, v]) => {
                  const Icon = v.icon;
                  const total = allSubs.filter(s => s.workflowType === k).length;
                  const open = allSubs.filter(s => s.workflowType === k && !["Completed", "Resolved", "Closed", "Renewed", "Expired"].includes(s.status)).length;
                  const overdue = allSubs.filter(s => s.workflowType === k && isOverdue(s)).length;
                  return (
                    <button key={k} onClick={() => { setFilterType(k); setSection("records"); setView("list"); }} data-testid={`card-wf-type-${k}`}
                      className={`text-left rounded-xl border bg-card p-4 hover:shadow-md transition-all group border-l-4 ${v.accent}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-lg ${v.bg}`}><Icon className={`h-4 w-4 ${v.color}`} /></div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
                      </div>
                      <h3 className="text-sm font-semibold">{v.label}</h3>
                      <p className="text-xl font-bold mt-1">{total}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span>{open} open</span>
                        {overdue > 0 && <span className="text-red-500">· {overdue} overdue</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Workload by owner */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Workload by Owner</CardTitle></CardHeader>
                  <CardContent className="space-y-2.5">
                    {ownerLoad.length === 0 && <p className="text-xs text-muted-foreground">No active records.</p>}
                    {ownerLoad.map(([name, count]) => (
                      <MiniBar key={name} label={name} value={count} max={ownerLoad[0]?.[1] || 1} color="bg-primary/70" />
                    ))}
                  </CardContent>
                </Card>

                {/* Expiring soon panel */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4 text-orange-500" />Expiring Within 30 Days</CardTitle></CardHeader>
                  <CardContent className="space-y-1.5">
                    {expiringItems.filter(s => isExpiringSoon(s, 30)).length === 0 && <p className="text-xs text-muted-foreground">No items expiring within 30 days.</p>}
                    {expiringItems.filter(s => isExpiringSoon(s, 30)).slice(0, 5).map(s => {
                      const d = daysUntil(s.expiryDate);
                      return (
                        <div key={s.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/40 cursor-pointer" onClick={() => openDetail(s)}>
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${d !== null && d <= 7 ? "bg-red-500" : "bg-orange-400"}`} />
                          <p className="text-xs flex-1 truncate">{s.title}</p>
                          <span className={`text-[11px] font-semibold shrink-0 ${d !== null && d <= 7 ? "text-red-600" : "text-orange-600"}`}>{d === 0 ? "Today" : d === 1 ? "1d" : `${d}d`}</span>
                        </div>
                      );
                    })}
                    {expiringItems.filter(s => isExpiringSoon(s, 30)).length > 5 && (
                      <Button variant="ghost" size="sm" className="w-full h-7 text-xs mt-1" onClick={() => setSection("renewals")}>View all renewals <ChevronRight className="h-3 w-3 ml-1" /></Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent records */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">Recent Records</h2>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSection("records")}>View all <ChevronRight className="h-3 w-3 ml-1" /></Button>
                </div>
                <div className="rounded-xl border overflow-hidden">
                  {allSubs.length === 0 && <div className="text-center py-12 text-muted-foreground"><Workflow className="h-8 w-8 mx-auto mb-2 opacity-20" /><p className="text-sm">No records yet. Create your first workflow record.</p></div>}
                  {allSubs.slice(0, 6).map(s => <SubRow key={s.id} s={s} onClick={() => openDetail(s)} />)}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ WORKFLOW BUILDER ═══════════ */}
          {section === "builder" && (
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div><h1 className="text-xl font-bold">Workflow Builder</h1><p className="text-sm text-muted-foreground">Configure how each workflow type works — statuses, automation, and rules.</p></div>
              </div>

              {/* Type selector */}
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(WF_TYPES) as [WorkflowType, typeof WF_TYPES[WorkflowType]][]).map(([k, v]) => {
                  const Icon = v.icon;
                  return (
                    <button key={k} onClick={() => { setBuilderType(k); setBuilderTab("overview"); }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${builderType === k ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                      data-testid={`btn-builder-type-${k}`}>
                      <div className={`p-1 rounded ${v.bg}`}><Icon className={`h-3.5 w-3.5 ${v.color}`} /></div>
                      {v.label}
                    </button>
                  );
                })}
              </div>

              <Tabs value={builderTab} onValueChange={setBuilderTab}>
                <TabsList className="h-8">
                  <TabsTrigger value="overview" className="text-xs">Overview & Fields</TabsTrigger>
                  <TabsTrigger value="statuses" className="text-xs">Status Workflow</TabsTrigger>
                  <TabsTrigger value="automation" className="text-xs flex items-center gap-1"><Zap className="h-3 w-3" />Automation Rules</TabsTrigger>
                </TabsList>

                {/* Overview tab */}
                <TabsContent value="overview" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3"><CardTitle className="text-sm">Workflow Configuration</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          { label: "Workflow Name", value: WF_TYPES[builderType].label },
                          { label: "Reference Prefix", value: { recurring_task: "RT", service_ticket: "TKT", license: "LIC", certificate: "CERT" }[builderType] + "-XXXXX-XXX" },
                          { label: "Priority Levels", value: "Low · Medium · High · Critical" },
                          { label: "Assignment", value: "Owner + Department" },
                          { label: "Attachments", value: "Allowed" },
                          { label: "Comments", value: "Enabled (public + internal)" },
                        ].map(row => (
                          <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                            <span className="text-xs text-muted-foreground">{row.label}</span>
                            <span className="text-xs font-medium">{row.value}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3"><CardTitle className="text-sm">Required Fields</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-1.5">
                          {[
                            "Title",
                            "Priority",
                            builderType === "service_ticket" ? "Requester" : null,
                            builderType === "service_ticket" ? "SLA Target" : null,
                            builderType === "recurring_task" ? "Recurrence Type" : null,
                            builderType === "recurring_task" ? "Due Date" : null,
                            (builderType === "license" || builderType === "certificate") ? "Expiry Date" : null,
                            (builderType === "license" || builderType === "certificate") ? "Holder Name" : null,
                            builderType === "license" ? "Vendor" : null,
                            builderType === "certificate" ? "Issuing Authority" : null,
                          ].filter(Boolean).map(f => (
                            <div key={f} className="flex items-center gap-2">
                              <CheckSquare className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs">{f}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1.5">Optional Fields</p>
                          {["Description", "Department", "Owner", "Category", "Comments", "Custom Fields"].map(f => (
                            <div key={f} className="flex items-center gap-2 mb-1">
                              <div className="h-3.5 w-3.5 rounded border border-muted-foreground/40 flex items-center justify-center"><div className="h-1.5 w-1.5 rounded-sm bg-muted-foreground/40" /></div>
                              <span className="text-xs text-muted-foreground">{f}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Status workflow tab */}
                <TabsContent value="statuses" className="mt-4">
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-sm">Status Flow — {WF_TYPES[builderType].label}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-center gap-2">
                        {STATUS_BY_TYPE[builderType].map((st, i) => (
                          <div key={st} className="flex items-center gap-2">
                            <div className={`px-3 py-2 rounded-lg border-2 ${STATUS_COLORS[st] || "bg-muted"} border-transparent`}>
                              <p className="text-xs font-semibold">{st}</p>
                              <p className="text-[9px] text-muted-foreground mt-0.5">
                                {i === 0 ? "Initial" : i === STATUS_BY_TYPE[builderType].length - 1 ? "Terminal" : "Active"}
                              </p>
                            </div>
                            {i < STATUS_BY_TYPE[builderType].length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 p-3 rounded-lg bg-muted/30 border">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5 text-amber-500" />Status transitions are tracked in the activity log per record. Any status can transition to any other status by the record owner or admin.</p>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                    {STATUS_BY_TYPE[builderType].map(st => {
                      const count = allSubs.filter(s => s.workflowType === builderType && s.status === st).length;
                      return (
                        <div key={st} className={`rounded-lg border p-3 ${STATUS_COLORS[st] || "bg-muted"}`}>
                          <p className="text-xs font-semibold">{st}</p>
                          <p className="text-xl font-bold mt-1">{count}</p>
                          <p className="text-[10px] mt-0.5 opacity-70">records</p>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Automation tab */}
                <TabsContent value="automation" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                      <Zap className="h-4 w-4 text-amber-600 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">Automation rules run automatically in the background. Reminder notifications are sent to record owners and department heads. Toggle rules on or off per workflow type.</p>
                    </div>
                    {automationRules[builderType].map(rule => {
                      const Icon = rule.icon;
                      return (
                        <div key={rule.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${rule.enabled ? "bg-card" : "bg-muted/30 opacity-60"}`}>
                          <div className={`p-2 rounded-lg shrink-0 ${rule.enabled ? "bg-primary/10" : "bg-muted"}`}>
                            <Icon className={`h-4 w-4 ${rule.enabled ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trigger</p>
                            <p className="text-sm font-medium mt-0.5">{rule.trigger}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-2">Action</p>
                            <p className="text-sm mt-0.5">{rule.action}</p>
                          </div>
                          <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(builderType, rule.id)} data-testid={`toggle-rule-${rule.id}`} />
                        </div>
                      );
                    })}
                    <div className="rounded-xl border border-dashed p-4 text-center text-muted-foreground hover:bg-muted/20 cursor-default">
                      <Plus className="h-5 w-5 mx-auto mb-1.5 opacity-40" />
                      <p className="text-xs">Custom automation rules — available in advanced configuration</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* ═══════════ RECORDS ═══════════ */}
          {section === "records" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold">Records</h1>
                  <p className="text-sm text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""} · All workflow types</p>
                </div>
                <div className="flex items-center gap-2">
                  <ViewSwitcher modes={["list", "board", "table", "calendar"]} />
                  <Button onClick={() => openCreate(filterType !== "all" ? filterType : undefined)} className="gap-2 h-8 text-sm" data-testid="btn-new-sub-list"><Plus className="h-3.5 w-3.5" />New</Button>
                </div>
              </div>
              <FilterBar />

              {/* Board view requires a single type */}
              {view === "board" && filterType === "all" && (
                <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                  <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" />Board view is best with a single workflow type selected. Choose a type filter above to see the kanban board.</p>
                </div>
              )}

              {view === "list" && (
                <div className="rounded-xl border overflow-hidden">
                  {filtered.length === 0 && <div className="text-center py-16 text-muted-foreground"><ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-20" /><p className="text-sm">No records match your filters.</p></div>}
                  {filtered.map(s => <SubRow key={s.id} s={s} onClick={() => openDetail(s)} />)}
                </div>
              )}

              {view === "board" && filterType !== "all" && (
                <BoardView submissions={filtered} wfType={filterType as WorkflowType} onSelect={openDetail} />
              )}

              {view === "table" && (
                <div className="rounded-xl border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr>{["Ref", "Title", "Department", "Status", "Priority", "Owner", "Due / Expiry"].map(h => <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">No records found.</td></tr>}
                      {filtered.map(s => <TableRow key={s.id} s={s} onClick={() => openDetail(s)} />)}
                    </tbody>
                  </table>
                </div>
              )}

              {view === "calendar" && <CalendarView submissions={filtered} onSelect={openDetail} />}
            </div>
          )}

          {/* ═══════════ RENEWALS ═══════════ */}
          {section === "renewals" && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><h1 className="text-xl font-bold">Renewals</h1><p className="text-sm text-muted-foreground">Track licenses and certificates with expiry and renewal management.</p></div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <button onClick={() => setRenewalView("list")} className={`px-2.5 py-1.5 transition-colors ${renewalView === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}><LayoutList className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setRenewalView("calendar")} className={`px-2.5 py-1.5 transition-colors ${renewalView === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}><CalendarDays className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => openCreate("license")}><Plus className="h-3 w-3" />License</Button>
                    <Button size="sm" className="h-8 text-xs gap-1" onClick={() => openCreate("certificate")}><Plus className="h-3 w-3" />Certificate</Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total", value: renewalItems.length, icon: Layers, color: "text-foreground" },
                  { label: "Active", value: renewalItems.filter(s => s.status === "Active").length, icon: CheckCircle2, color: "text-emerald-600" },
                  { label: "Expiring ≤30d", value: renewalItems.filter(s => isExpiringSoon(s, 30)).length, icon: Bell, color: "text-orange-500" },
                  { label: "Expired", value: expiredItems.length, icon: AlertTriangle, color: "text-red-500" },
                ].map(c => <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} color={c.color} />)}
              </div>

              {renewalView === "list" && (
                <>
                  <div className="flex gap-2 flex-wrap border-b pb-2">
                    {[
                      { key: "expiring", label: "Expiring Soon", count: expiringItems.length },
                      { key: "all", label: "All Records", count: renewalItems.length },
                      { key: "expired", label: "Expired", count: expiredItems.length },
                    ].map(tab => (
                      <button key={tab.key} onClick={() => setRenewalTab(tab.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${renewalTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                        {tab.label}
                        <span className={`text-[9px] px-1.5 rounded-full font-bold ${renewalTab === tab.key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>{tab.count}</span>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-xl border overflow-hidden">
                    {renewalTab === "expiring" && (
                      <>
                        {expiringItems.length === 0 && <div className="text-center py-12 text-muted-foreground"><CheckCircle2 className="h-7 w-7 mx-auto mb-2 text-emerald-500 opacity-50" /><p className="text-sm">No items expiring in the next 60 days.</p></div>}
                        {expiringItems.map(s => {
                          const d = daysUntil(s.expiryDate);
                          return (
                            <div key={s.id} className={`flex items-center gap-3 px-4 py-3 border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors ${d !== null && d <= 7 ? "bg-red-50/30 dark:bg-red-950/10" : ""}`} onClick={() => openDetail(s)}>
                              <div className={`p-2 rounded-lg ${WF_TYPES[s.workflowType].bg} shrink-0`}>
                                {s.workflowType === "license" ? <ShieldCheck className={`h-4 w-4 ${WF_TYPES.license.color}`} /> : <FileCheck2 className={`h-4 w-4 ${WF_TYPES.certificate.color}`} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{s.title}</p>
                                <p className="text-[11px] text-muted-foreground">{s.referenceNumber} · {s.holderName || s.departmentName || "—"}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <StatusBadge status={s.status} />
                                <p className={`text-[11px] font-semibold mt-1 ${d !== null && d <= 7 ? "text-red-600" : "text-orange-600"}`}>{d === 0 ? "Today" : `${d}d`}</p>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                    {renewalTab === "all" && (
                      <>
                        {renewalItems.length === 0 && <div className="text-center py-12 text-muted-foreground"><p className="text-sm">No license or certificate records yet.</p></div>}
                        {renewalItems.map(s => <SubRow key={s.id} s={s} onClick={() => openDetail(s)} />)}
                      </>
                    )}
                    {renewalTab === "expired" && (
                      <>
                        {expiredItems.length === 0 && <div className="text-center py-10 text-muted-foreground"><CheckCircle2 className="h-7 w-7 mx-auto mb-2 text-emerald-500 opacity-40" /><p className="text-sm">No expired items.</p></div>}
                        {expiredItems.map(s => <SubRow key={s.id} s={s} onClick={() => openDetail(s)} />)}
                      </>
                    )}
                  </div>
                </>
              )}

              {renewalView === "calendar" && <CalendarView submissions={renewalItems} onSelect={openDetail} />}
            </div>
          )}

          {/* ═══════════ ANALYTICS ═══════════ */}
          {section === "analytics" && (
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><h1 className="text-xl font-bold">Workflow Analytics</h1><p className="text-sm text-muted-foreground">Drill down into performance, trends, and workload across all workflow types.</p></div>
                <div className="flex gap-1">
                  {(["all", "service_ticket", "recurring_task", "license", "certificate"] as const).map(k => {
                    const label = k === "all" ? "All" : WF_TYPES[k].label;
                    return (
                      <button key={k} onClick={() => setAnalyticsType(k)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${analyticsType === k ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filtered analytics scope */}
              {(() => {
                const scope = analyticsType === "all" ? allSubs : allSubs.filter(s => s.workflowType === analyticsType);
                const scopeOpen = scope.filter(s => !["Completed", "Resolved", "Closed", "Renewed", "Expired"].includes(s.status));
                const scopeOverdue = scope.filter(isOverdue);
                const scopeExpiring = scope.filter(s => isExpiringSoon(s, 30));
                const total = scope.length;

                // Status breakdown
                const byStatus: Record<string, number> = {};
                const byPriority: Record<string, number> = {};
                const byOwner: Record<string, number> = {};
                const byDept: Record<string, number> = {};
                for (const s of scope) {
                  byStatus[s.status] = (byStatus[s.status] || 0) + 1;
                  byPriority[s.priority] = (byPriority[s.priority] || 0) + 1;
                  if (s.ownerName) byOwner[s.ownerName] = (byOwner[s.ownerName] || 0) + 1;
                  if (s.departmentName) byDept[s.departmentName] = (byDept[s.departmentName] || 0) + 1;
                }
                const maxStatus = Math.max(...Object.values(byStatus), 1);
                const maxOwner = Math.max(...Object.values(byOwner), 1);
                const maxDept = Math.max(...Object.values(byDept), 1);

                return (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard label="Total" value={total} icon={Layers} color="text-foreground" />
                      <StatCard label="Open" value={scopeOpen.length} icon={Activity} color="text-blue-600" />
                      <StatCard label="Overdue" value={scopeOverdue.length} icon={AlertTriangle} color="text-red-500" />
                      <StatCard label="Expiring ≤30d" value={scopeExpiring.length} icon={Bell} color="text-orange-500" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">By Status</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                          {Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([st, count]) => (
                            <div key={st} className="flex items-center justify-between gap-2">
                              <StatusBadge status={st} />
                              <div className="flex items-center gap-2 flex-1 ml-2">
                                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary/60 rounded-full" style={{ width: `${(count / maxStatus) * 100}%` }} /></div>
                                <span className="text-xs font-semibold tabular-nums w-6 text-right">{count}</span>
                              </div>
                            </div>
                          ))}
                          {Object.keys(byStatus).length === 0 && <p className="text-xs text-muted-foreground">No data.</p>}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">By Priority</CardTitle></CardHeader>
                        <CardContent className="space-y-2.5">
                          {["Critical", "High", "Medium", "Low"].map(p => {
                            const count = byPriority[p] || 0;
                            const pct = total > 0 ? (count / total) * 100 : 0;
                            const barC = { Critical: "bg-red-500", High: "bg-orange-500", Medium: "bg-blue-500", Low: "bg-gray-400" };
                            return (
                              <div key={p}>
                                <div className="flex items-center justify-between text-xs mb-1"><span className="font-medium">{p}</span><span className="tabular-nums">{count} <span className="text-muted-foreground text-[10px]">({Math.round(pct)}%)</span></span></div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${barC[p as keyof typeof barC]}`} style={{ width: `${pct}%` }} /></div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Workload by Owner</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                          {Object.entries(byOwner).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => (
                            <MiniBar key={name} label={name} value={count} max={maxOwner} color="bg-primary/60" />
                          ))}
                          {Object.keys(byOwner).length === 0 && <p className="text-xs text-muted-foreground">No data.</p>}
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">By Department</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                          {Object.entries(byDept).sort((a, b) => b[1] - a[1]).map(([dept, count]) => (
                            <MiniBar key={dept} label={dept} value={count} max={maxDept} color="bg-emerald-500/70" />
                          ))}
                          {Object.keys(byDept).length === 0 && <p className="text-xs text-muted-foreground">No data.</p>}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Overdue Items</CardTitle></CardHeader>
                        <CardContent>
                          {scopeOverdue.length === 0 && <div className="text-center py-4"><CheckCircle2 className="h-6 w-6 mx-auto text-emerald-500 opacity-60 mb-1" /><p className="text-xs text-muted-foreground">No overdue items.</p></div>}
                          <div className="space-y-1.5">
                            {scopeOverdue.slice(0, 5).map(s => (
                              <div key={s.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 cursor-pointer text-xs" onClick={() => openDetail(s)}>
                                <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                                <span className="flex-1 truncate font-medium">{s.title}</span>
                                <span className="text-muted-foreground shrink-0">{fmt(s.dueDate)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {analyticsType === "all" && (
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Volume by Workflow Type</CardTitle></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {(Object.entries(WF_TYPES) as [WorkflowType, typeof WF_TYPES[WorkflowType]][]).map(([k, v]) => {
                              const Icon = v.icon;
                              const typeTotal = allSubs.filter(s => s.workflowType === k).length;
                              const pct = total > 0 ? Math.round((typeTotal / total) * 100) : 0;
                              return (
                                <div key={k} className={`rounded-xl border p-4 border-l-4 ${v.accent}`}>
                                  <div className="flex items-center gap-2 mb-2"><div className={`p-1.5 rounded-lg ${v.bg}`}><Icon className={`h-4 w-4 ${v.color}`} /></div></div>
                                  <p className="text-xs text-muted-foreground">{v.label}</p>
                                  <p className="text-2xl font-bold">{typeTotal}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">{pct}% of total</p>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                );
              })()}
            </div>
          )}

        </div>
      </div>

      {/* Dialogs */}
      <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)} defaultType={createType} departments={departments} />
      {detailSub && (
        <DetailDialog
          sub={detailFull || detailSub}
          onClose={() => setDetailSub(null)}
          onUpdate={() => { refetchDetail(); refetchSubs(); queryClient.invalidateQueries({ queryKey: ["/api/workflow/analytics"] }); }}
        />
      )}
    </div>
  );
}
