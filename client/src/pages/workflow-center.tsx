import { useState, useMemo, useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
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
  LayoutList, Kanban, Table2, CalendarDays, Filter,
  Users, Lightbulb, RefreshCw, AlertCircle,
  CheckSquare, Timer, ArrowRight, Star, Mail, Paperclip, Pencil,
} from "lucide-react";
import { DocumentAttachments } from "@/components/document-attachments";

// ── Types ─────────────────────────────────────────────────────────────────────
type WorkflowType = "recurring_task" | "service_ticket" | "license" | "certificate";
type ViewMode = "list" | "board" | "table" | "calendar";

interface Submission {
  id: number; referenceNumber: string; workflowType: WorkflowType;
  title: string; description?: string; status: string; priority: string;
  ownerName?: string; ownerEmail?: string;
  assignedTo?: string; assignedToEmail?: string;
  requesterName?: string; requesterEmail?: string;
  holderName?: string; holderEmail?: string;
  departmentName?: string; category?: string; createdBy?: number;
  dueDate?: string; expiryDate?: string; renewalDate?: string; nextOccurrence?: string;
  recurrenceType?: string; vendorName?: string; issueAuthority?: string;
  licenseType?: string; slaTarget?: string;
  serviceDeskId?: number;
  createdAt: string; updatedAt: string;
  comments?: Comment[]; activity?: ActivityEntry[];
}
interface ServiceDeskEntry {
  id: number; name: string; description?: string; icon?: string; color?: string; createdAt: string;
}
interface Comment { id: number; authorName: string; content: string; isInternal: boolean; createdAt: string; }
interface ActivityEntry { id: number; actorName: string; action: string; oldValue?: string; newValue?: string; field?: string; createdAt: string; }
interface Analytics { total: number; open: number; overdue: number; expiringSoon: number; byType: Record<string, number>; byStatus: Record<string, number>; byPriority: Record<string, number>; }

// ── Constants ─────────────────────────────────────────────────────────────────
const WF_TYPES: Record<WorkflowType, { label: string; icon: typeof Workflow; color: string; bg: string; accent: string; navKey: string }> = {
  recurring_task: { label: "Recurring Tasks", icon: RotateCcw, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/40", accent: "border-blue-400", navKey: "recurring_tasks" },
  service_ticket: { label: "Service Desk", icon: Ticket, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/40", accent: "border-violet-400", navKey: "service_desk" },
  license: { label: "Licenses", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40", accent: "border-emerald-400", navKey: "licenses" },
  certificate: { label: "Certificates", icon: FileCheck2, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/40", accent: "border-amber-400", navKey: "certificates" },
};

const SECTION_TYPE: Record<string, WorkflowType> = {
  recurring_tasks: "recurring_task",
  service_desk: "service_ticket",
  licenses: "license",
  certificates: "certificate",
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

const AUTOMATION_RULES: Record<WorkflowType, { id: string; trigger: string; action: string; icon: typeof Workflow; enabled: boolean }[]> = {
  service_ticket: [
    { id: "tkt-1", trigger: "Ticket created", action: "Auto-assign to department owner and send confirmation to requester email", icon: User, enabled: true },
    { id: "tkt-2", trigger: "SLA due date nearing (2 hours)", action: "Alert assigned-to email and department head", icon: Bell, enabled: true },
    { id: "tkt-3", trigger: "SLA breached", action: "Escalate to manager, update status to Escalated, notify assigned-to email", icon: AlertCircle, enabled: true },
    { id: "tkt-4", trigger: "No update for 48 hours", action: "Send reminder to assigned-to email", icon: Timer, enabled: false },
  ],
  recurring_task: [
    { id: "rt-1", trigger: "Task marked Completed", action: "Auto-generate next occurrence, notify assigned-to email", icon: RefreshCw, enabled: true },
    { id: "rt-2", trigger: "Due date within 3 days", action: "Change status to Due Soon, email reminder to assigned-to email", icon: Bell, enabled: true },
    { id: "rt-3", trigger: "Due date passed without completion", action: "Change status to Overdue, notify assigned-to email and department head", icon: AlertTriangle, enabled: true },
    { id: "rt-4", trigger: "Overdue for 7+ days", action: "Escalate to manager, send alert to assigned-to email", icon: AlertCircle, enabled: false },
  ],
  license: [
    { id: "lic-1", trigger: "60 days before expiry", action: "Email renewal reminder to owner email and holder email", icon: Bell, enabled: true },
    { id: "lic-2", trigger: "30 days before expiry", action: "Escalation alert to department head, update status to Expiring Soon", icon: AlertTriangle, enabled: true },
    { id: "lic-3", trigger: "7 days before expiry", action: "Critical reminder to owner email — immediate renewal required", icon: AlertCircle, enabled: true },
    { id: "lic-4", trigger: "License expired", action: "Change status to Expired, notify owner email and compliance team", icon: X, enabled: true },
  ],
  certificate: [
    { id: "cert-1", trigger: "60 days before expiry", action: "Email renewal reminder to holder email and owner email", icon: Bell, enabled: true },
    { id: "cert-2", trigger: "30 days before expiry", action: "Escalation alert to HR/Compliance, email holder email", icon: AlertTriangle, enabled: true },
    { id: "cert-3", trigger: "7 days before expiry", action: "Critical reminder — change status to Expiring Soon, email holder email", icon: AlertCircle, enabled: true },
    { id: "cert-4", trigger: "Certificate expired", action: "Change status to Expired, notify holder email and compliance", icon: X, enabled: true },
  ],
};

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

// ── Micro-components ──────────────────────────────────────────────────────────
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
function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1"><span className="text-muted-foreground truncate">{label}</span><span className="font-semibold tabular-nums">{value}</span></div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
function Avatar({ name, size = "md" }: { name?: string; size?: "sm" | "md" }) {
  const s = size === "sm" ? "h-5 w-5 text-[9px]" : "h-7 w-7 text-[10px]";
  return (
    <div className={`${s} rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0`}>
      {name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
    </div>
  );
}

// ── SubRow (list view row) ────────────────────────────────────────────────────
function SubRow({ s, onClick }: { s: Submission; onClick: () => void }) {
  const wf = WF_TYPES[s.workflowType];
  const Icon = wf.icon;
  const overdue = isOverdue(s);
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-border/40 hover:bg-muted/40 cursor-pointer transition-colors group ${overdue ? "bg-red-50/30 dark:bg-red-950/10" : ""}`}
      onClick={onClick} data-testid={`row-submission-${s.id}`}>
      <div className={`p-1.5 rounded-lg ${wf.bg} shrink-0`}><Icon className={`h-3.5 w-3.5 ${wf.color}`} /></div>
      <div className="w-28 shrink-0 hidden sm:block"><span className="text-[10px] font-mono text-muted-foreground">{s.referenceNumber}</span></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{s.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {(s.assignedTo || s.ownerName) && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <User className="h-2.5 w-2.5" />{s.assignedTo || s.ownerName}
            </span>
          )}
          {s.departmentName && <span className="text-[10px] text-muted-foreground">{s.departmentName}</span>}
          {overdue && <span className="text-[10px] text-red-500 flex items-center gap-0.5"><AlertTriangle className="h-2.5 w-2.5" />Overdue</span>}
          {s.expiryDate && <span className="text-[10px] text-muted-foreground">Exp {fmt(s.expiryDate)}</span>}
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
  const overdue = isOverdue(s);
  return (
    <div className={`rounded-lg border bg-card p-3 hover:shadow-md cursor-pointer transition-all group space-y-2 ${overdue ? "border-red-200 dark:border-red-900/40" : ""}`}
      onClick={onClick} data-testid={`card-board-${s.id}`}>
      <div className="flex items-start gap-2">
        <PriorityDot priority={s.priority} />
        <p className="text-xs font-medium leading-snug flex-1 group-hover:text-primary transition-colors">{s.title}</p>
      </div>
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <span className="text-[9px] font-mono text-muted-foreground">{s.referenceNumber}</span>
        {s.dueDate && <span className={`text-[10px] flex items-center gap-0.5 ${overdue ? "text-red-500" : "text-muted-foreground"}`}><Clock className="h-2.5 w-2.5" />{fmt(s.dueDate)}</span>}
      </div>
      {(s.assignedTo || s.ownerName) && (
        <div className="flex items-center gap-1.5">
          <Avatar name={s.assignedTo || s.ownerName} size="sm" />
          <span className="text-[10px] text-muted-foreground truncate">{s.assignedTo || s.ownerName}</span>
        </div>
      )}
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────
function TableRow({ s, onClick, onEdit, onDelete }: {
  s: Submission;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const overdue = isOverdue(s);
  return (
    <tr className={`border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors group ${overdue ? "bg-red-50/20 dark:bg-red-950/10" : ""}`}
      onClick={onClick} data-testid={`tr-submission-${s.id}`}>
      <td className="px-3 py-2.5 text-[10px] font-mono text-muted-foreground whitespace-nowrap">{s.referenceNumber}</td>
      <td className="px-3 py-2.5 text-sm font-medium group-hover:text-primary transition-colors max-w-xs"><span className="truncate block">{s.title}</span></td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
        <div>{s.assignedTo || s.ownerName || "—"}</div>
        {(s.assignedToEmail || s.ownerEmail) && <div className="text-[10px] text-primary">{s.assignedToEmail || s.ownerEmail}</div>}
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{s.departmentName || "—"}</td>
      <td className="px-3 py-2.5 whitespace-nowrap"><StatusBadge status={s.status} /></td>
      <td className="px-3 py-2.5 whitespace-nowrap"><span className={`text-[11px] px-2 py-0.5 rounded font-medium ${PRIORITY_COLORS[s.priority] || ""}`}>{s.priority}</span></td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
        {overdue ? <span className="text-red-500 flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" />{fmt(s.dueDate || s.expiryDate)}</span> : fmt(s.dueDate || s.expiryDate)}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Edit" data-testid={`btn-edit-${s.id}`}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-muted-foreground hover:text-red-500" title="Delete" data-testid={`btn-delete-${s.id}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Calendar view ─────────────────────────────────────────────────────────────
function CalendarView({ submissions, onSelect }: { submissions: Submission[]; onSelect: (s: Submission) => void }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const year = month.getFullYear(), mon = month.getMonth();
  const firstDay = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => { const d = i - firstDay + 1; return d >= 1 && d <= daysInMonth ? d : null; });
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
        <button onClick={() => setMonth(new Date(year, mon - 1, 1))} className="p-1.5 rounded hover:bg-muted transition-colors text-lg leading-none">‹</button>
        <span className="text-sm font-semibold">{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
        <button onClick={() => setMonth(new Date(year, mon + 1, 1))} className="p-1.5 rounded hover:bg-muted transition-colors text-lg leading-none">›</button>
      </div>
      <div className="grid grid-cols-7 text-center border-b">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <div key={d} className="py-2 text-[10px] font-bold text-muted-foreground uppercase">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-border/30">
        {cells.map((day, i) => {
          const isToday = day === todayDate.getDate() && mon === todayDate.getMonth() && year === todayDate.getFullYear();
          const items = day ? (itemsByDay[day] || []) : [];
          return (
            <div key={i} className={`min-h-[72px] p-1.5 ${!day ? "bg-muted/20" : "hover:bg-muted/10 transition-colors"}`}>
              {day && (<>
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium mb-1 ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{day}</span>
                <div className="space-y-0.5">
                  {items.slice(0, 2).map(s => {
                    const wf = WF_TYPES[s.workflowType];
                    return <div key={s.id} className={`text-[9px] px-1 py-0.5 rounded cursor-pointer truncate font-medium ${wf.bg} ${wf.color} hover:opacity-80`} onClick={() => onSelect(s)} title={s.title}>{s.title}</div>;
                  })}
                  {items.length > 2 && <div className="text-[9px] text-muted-foreground px-1">+{items.length - 2}</div>}
                </div>
              </>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Board view ────────────────────────────────────────────────────────────────
function BoardView({ submissions, wfType, onSelect }: { submissions: Submission[]; wfType: WorkflowType; onSelect: (s: Submission) => void }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {BOARD_COLS[wfType].map(status => {
        const cards = submissions.filter(s => s.status === status);
        return (
          <div key={status} className="flex-shrink-0 w-64">
            <div className="flex items-center gap-2 mb-2 px-1">
              <StatusBadge status={status} />
              <span className="text-xs font-semibold text-muted-foreground">{cards.length}</span>
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

// ── View switcher ─────────────────────────────────────────────────────────────
function ViewSwitcher({ modes, view, setView }: { modes: ViewMode[]; view: ViewMode; setView: (v: ViewMode) => void }) {
  const icons: Record<ViewMode, typeof Workflow> = { list: LayoutList, board: Kanban, table: Table2, calendar: CalendarDays };
  return (
    <div className="flex items-center border rounded-lg overflow-hidden">
      {modes.map(m => { const Icon = icons[m]; return (
        <button key={m} onClick={() => setView(m)} className={`px-2.5 py-1.5 transition-colors ${view === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`} data-testid={`btn-view-${m}`} title={m.charAt(0).toUpperCase() + m.slice(1)}><Icon className="h-3.5 w-3.5" /></button>
      ); })}
    </div>
  );
}

// ── Records view (reused across type sections) ────────────────────────────────
function RecordsView({ submissions, wfType, onSelect, onNew }: {
  submissions: Submission[]; wfType: WorkflowType; onSelect: (s: Submission) => void; onNew: () => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [view, setView] = useState<ViewMode>("table");
  const [confirmDelete, setConfirmDelete] = useState<Submission | null>(null);
  const hasBoard = ["service_ticket", "recurring_task", "license", "certificate"].includes(wfType);
  const viewModes: ViewMode[] = hasBoard ? ["list", "board", "table", "calendar"] : ["list", "table", "calendar"];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/workflow/submissions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/analytics"] });
      toast({ title: "Record deleted successfully" });
      setConfirmDelete(null);
    },
    onError: () => toast({ title: "Delete failed", description: "Could not delete the record.", variant: "destructive" }),
  });

  const filtered = useMemo(() => submissions.filter(s => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterPriority !== "all" && s.priority !== filterPriority) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.referenceNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [submissions, filterStatus, filterPriority, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-8 h-8 text-sm" data-testid="input-search-records" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs w-32" data-testid="select-status-filter"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Status</SelectItem>{STATUS_BY_TYPE[wfType].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem>{["Low", "Medium", "High", "Critical"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        {(search || filterStatus !== "all" || filterPriority !== "all") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSearch(""); setFilterStatus("all"); setFilterPriority("all"); }}><X className="h-3 w-3 mr-1" />Clear</Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ViewSwitcher modes={viewModes} view={view} setView={setView} />
          <Button onClick={onNew} size="sm" className="h-8 text-xs gap-1.5" data-testid="btn-new-record-type"><Plus className="h-3.5 w-3.5" />New</Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</p>

      {view === "list" && (
        <div className="rounded-xl border overflow-hidden">
          {filtered.length === 0 && <div className="text-center py-14 text-muted-foreground"><ClipboardList className="h-7 w-7 mx-auto mb-2 opacity-20" /><p className="text-sm">No records match your filters.</p></div>}
          {filtered.map(s => <SubRow key={s.id} s={s} onClick={() => onSelect(s)} />)}
        </div>
      )}
      {view === "board" && <BoardView submissions={filtered} wfType={wfType} onSelect={onSelect} />}
      {view === "table" && (
        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {["Ref", "Title", "Assigned To / Email", "Department", "Status", "Priority", "Due / Expiry", "Actions"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-muted-foreground text-sm">No records found.</td></tr>}
              {filtered.map(s => (
                <TableRow key={s.id} s={s}
                  onClick={() => onSelect(s)}
                  onEdit={e => { e.stopPropagation(); onSelect(s); }}
                  onDelete={e => { e.stopPropagation(); setConfirmDelete(s); }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {view === "calendar" && <CalendarView submissions={filtered} onSelect={onSelect} />}

      {/* ── Delete confirmation dialog ── */}
      <Dialog open={!!confirmDelete} onOpenChange={open => { if (!open) setConfirmDelete(null); }}>
        <DialogContent className="max-w-sm" aria-describedby="delete-confirm-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="h-4 w-4" />Delete Record</DialogTitle>
          </DialogHeader>
          <p id="delete-confirm-desc" className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-semibold text-foreground">"{confirmDelete?.title}"</span>? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)} disabled={deleteMutation.isPending}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending} data-testid="btn-confirm-delete">
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Type analytics ────────────────────────────────────────────────────────────
function TypeAnalytics({ submissions, wfType }: { submissions: Submission[]; wfType: WorkflowType }) {
  const scope = submissions.filter(s => s.workflowType === wfType);
  const open = scope.filter(s => !["Completed", "Resolved", "Closed", "Renewed", "Expired"].includes(s.status));
  const overdue = scope.filter(isOverdue);
  const expiring = scope.filter(s => isExpiringSoon(s, 30));
  const total = scope.length;

  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byOwner: Record<string, number> = {};
  const byDept: Record<string, number> = {};
  for (const s of scope) {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    byPriority[s.priority] = (byPriority[s.priority] || 0) + 1;
    const assignee = s.assignedTo || s.ownerName;
    if (assignee) byOwner[assignee] = (byOwner[assignee] || 0) + 1;
    if (s.departmentName) byDept[s.departmentName] = (byDept[s.departmentName] || 0) + 1;
  }
  const maxStatus = Math.max(...Object.values(byStatus), 1);
  const maxOwner = Math.max(...Object.values(byOwner), 1);
  const maxDept = Math.max(...Object.values(byDept), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={total} icon={Layers} color="text-foreground" />
        <StatCard label="Open / Active" value={open.length} icon={Activity} color="text-blue-600" />
        <StatCard label="Overdue" value={overdue.length} icon={AlertTriangle} color="text-red-500" />
        <StatCard label="Expiring ≤30d" value={expiring.length} icon={Bell} color="text-orange-500" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">By Status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([st, count]) => (
              <div key={st} className="flex items-center gap-2">
                <StatusBadge status={st} />
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary/60 rounded-full" style={{ width: `${(count / maxStatus) * 100}%` }} /></div>
                  <span className="text-xs font-semibold tabular-nums w-5 text-right">{count}</span>
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
                  <div className="flex justify-between text-xs mb-1"><span className="font-medium">{p}</span><span className="tabular-nums">{count}</span></div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${barC[p as keyof typeof barC]}`} style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Workload by Assignee</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(byOwner).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => (
              <MiniBar key={name} label={name} value={count} max={maxOwner} color="bg-primary/60" />
            ))}
            {Object.keys(byOwner).length === 0 && <p className="text-xs text-muted-foreground">No assignees.</p>}
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">By Department</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(byDept).sort((a, b) => b[1] - a[1]).map(([d, count]) => <MiniBar key={d} label={d} value={count} max={maxDept} color="bg-emerald-500/60" />)}
            {Object.keys(byDept).length === 0 && <p className="text-xs text-muted-foreground">No department data.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Overdue Items</CardTitle></CardHeader>
          <CardContent>
            {overdue.length === 0 && <div className="text-center py-4"><CheckCircle2 className="h-6 w-6 mx-auto text-emerald-500 opacity-60 mb-1" /><p className="text-xs text-muted-foreground">No overdue items.</p></div>}
            <div className="space-y-1.5">
              {overdue.slice(0, 6).map(s => (
                <div key={s.id} className="flex items-center gap-2 text-xs p-1 rounded hover:bg-muted/20">
                  <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                  <span className="flex-1 truncate font-medium">{s.title}</span>
                  <span className="text-muted-foreground shrink-0">{fmt(s.dueDate)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Type config ───────────────────────────────────────────────────────────────
// ── All possible fields per type for the Config > Fields tab ─────────────────
const ALL_FIELDS_BY_TYPE: Record<WorkflowType, { name: string; required: boolean; locked?: boolean }[]> = {
  service_ticket: [
    { name: "Title", required: true, locked: true },
    { name: "Priority", required: true },
    { name: "Assigned To (Name)", required: true },
    { name: "Assigned To (Email)", required: true },
    { name: "Requester Name", required: true },
    { name: "Requester Email", required: true },
    { name: "SLA Target", required: false },
    { name: "Description", required: false },
    { name: "Department", required: false },
    { name: "Category", required: false },
    { name: "Owner Name", required: false },
    { name: "Owner Email", required: false },
  ],
  recurring_task: [
    { name: "Title", required: true, locked: true },
    { name: "Priority", required: true },
    { name: "Assigned To (Name)", required: true },
    { name: "Assigned To (Email)", required: true },
    { name: "Recurrence Type", required: true },
    { name: "Due Date", required: true },
    { name: "Description", required: false },
    { name: "Department", required: false },
    { name: "Category", required: false },
    { name: "Owner Name", required: false },
    { name: "Owner Email", required: false },
  ],
  license: [
    { name: "Title", required: true, locked: true },
    { name: "Priority", required: true },
    { name: "Assigned To (Name)", required: true },
    { name: "Assigned To (Email)", required: true },
    { name: "Expiry Date", required: true },
    { name: "Vendor", required: true },
    { name: "License Type", required: false },
    { name: "Holder Name", required: false },
    { name: "Holder Email", required: false },
    { name: "Description", required: false },
    { name: "Department", required: false },
    { name: "Owner Name", required: false },
    { name: "Owner Email", required: false },
  ],
  certificate: [
    { name: "Title", required: true, locked: true },
    { name: "Priority", required: true },
    { name: "Assigned To (Name)", required: true },
    { name: "Assigned To (Email)", required: true },
    { name: "Expiry Date", required: true },
    { name: "Issuing Authority", required: true },
    { name: "Certificate Type", required: false },
    { name: "Holder Name", required: false },
    { name: "Holder Email", required: false },
    { name: "Description", required: false },
    { name: "Department", required: false },
    { name: "Owner Name", required: false },
    { name: "Owner Email", required: false },
  ],
};

function TypeConfig({ wfType, automationRules, toggleRule, editRule, onRunAutomations }: {
  wfType: WorkflowType;
  automationRules: typeof AUTOMATION_RULES;
  toggleRule: (type: WorkflowType, id: string) => void;
  editRule: (type: WorkflowType, id: string, field: "trigger" | "action", value: string) => void;
  onRunAutomations: (wfType: WorkflowType) => void;
}) {
  const { toast } = useToast();
  const [configTab, setConfigTab] = useState("statuses");

  // ── Editable statuses (persisted to localStorage per type) ─────────────────
  const storageKey = `wf_statuses_${wfType}`;
  const [statuses, setStatuses] = useState<string[]>(() => {
    try { const s = localStorage.getItem(storageKey); return s ? JSON.parse(s) : [...STATUS_BY_TYPE[wfType]]; } catch { return [...STATUS_BY_TYPE[wfType]]; }
  });
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingVal, setEditingVal] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const saveStatuses = (next: string[]) => {
    setStatuses(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    toast({ title: "Status workflow saved", description: `${next.length} statuses updated.` });
  };
  const startEdit = (idx: number) => { setEditingIdx(idx); setEditingVal(statuses[idx]); };
  const commitEdit = () => {
    if (editingIdx === null || !editingVal.trim()) { setEditingIdx(null); return; }
    const next = statuses.map((s, i) => i === editingIdx ? editingVal.trim() : s);
    setEditingIdx(null);
    setEditingVal("");
    saveStatuses(next);
  };
  const deleteStatus = (idx: number) => {
    if (statuses.length <= 2) { toast({ title: "Cannot delete", description: "At least 2 statuses required.", variant: "destructive" }); return; }
    saveStatuses(statuses.filter((_, i) => i !== idx));
  };
  const addStatus = () => {
    if (!newStatus.trim()) return;
    if (statuses.includes(newStatus.trim())) { toast({ title: "Duplicate status", variant: "destructive" }); return; }
    const next = [...statuses, newStatus.trim()];
    setNewStatus("");
    saveStatuses(next);
  };
  const resetStatuses = () => { saveStatuses([...STATUS_BY_TYPE[wfType]]); toast({ title: "Reset to defaults" }); };

  // ── Editable fields (persisted to localStorage per type) ───────────────────
  const fieldsKey = `wf_fields_${wfType}`;
  const [fields, setFields] = useState<{ name: string; required: boolean; locked?: boolean }[]>(() => {
    try { const s = localStorage.getItem(fieldsKey); return s ? JSON.parse(s) : ALL_FIELDS_BY_TYPE[wfType]; } catch { return ALL_FIELDS_BY_TYPE[wfType]; }
  });
  const [fieldsSaved, setFieldsSaved] = useState(false);
  const toggleField = (name: string) => {
    setFields(f => f.map(fi => fi.name === name && !fi.locked ? { ...fi, required: !fi.required } : fi));
  };
  const saveFields = () => {
    localStorage.setItem(fieldsKey, JSON.stringify(fields));
    setFieldsSaved(true);
    toast({ title: "Field settings saved" });
    setTimeout(() => setFieldsSaved(false), 2000);
  };
  const resetFields = () => {
    const defaults = ALL_FIELDS_BY_TYPE[wfType];
    setFields(defaults);
    localStorage.setItem(fieldsKey, JSON.stringify(defaults));
    toast({ title: "Fields reset to defaults" });
  };

  // ── Automation run state ───────────────────────────────────────────────────
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{ sent: number; errors: string[] } | null>(null);

  const runAutomations = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const rules = automationRules[wfType];
      const resp = await fetch("/api/workflow/automations/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ workflowType: wfType, rules }),
      });
      const data = await resp.json();
      setRunResult({ sent: data.sent, errors: data.errors || [] });
      toast({
        title: data.sent > 0 ? `${data.sent} email${data.sent !== 1 ? "s" : ""} sent` : "No emails triggered",
        description: data.sent > 0 ? "Automation emails dispatched to assignees and owners." : "No records currently match the active rule conditions.",
        variant: data.errors?.length ? "destructive" : "default",
      });
    } catch (e: any) {
      toast({ title: "Automation failed", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b pb-1">
        {[{ key: "statuses", label: "Status Workflow" }, { key: "fields", label: "Fields & Rules" }, { key: "automation", label: "Automation Rules" }].map(t => (
          <button key={t.key} onClick={() => setConfigTab(t.key)}
            className={`px-3 py-1.5 rounded-t text-xs font-medium transition-all ${configTab === t.key ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Status Workflow tab ── */}
      {configTab === "statuses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Status Flow</h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetStatuses}>Reset Defaults</Button>
            </div>
          </div>

          {/* Flow preview */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center gap-2">
                {statuses.map((st, i) => (
                  <div key={`${st}-${i}`} className="flex items-center gap-2">
                    <div className={`px-3 py-2 rounded-lg ${STATUS_COLORS[st] || "bg-muted/60"}`}>
                      <p className="text-xs font-semibold">{st}</p>
                      <p className="text-[9px] opacity-70">{i === 0 ? "Initial" : i === statuses.length - 1 ? "Terminal" : "Active"}</p>
                    </div>
                    {i < statuses.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Editable status list */}
          <div className="space-y-2">
            {statuses.map((st, idx) => (
              <div key={`edit-${st}-${idx}`} className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${idx === 0 ? "bg-sky-400" : idx === statuses.length - 1 ? "bg-gray-400" : "bg-emerald-400"}`} />
                {editingIdx === idx ? (
                  <Input value={editingVal} onChange={e => setEditingVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingIdx(null); }}
                    className="h-7 text-xs flex-1" autoFocus data-testid={`input-status-${idx}`} />
                ) : (
                  <span className="flex-1 text-sm font-medium">{st}</span>
                )}
                <span className="text-[10px] text-muted-foreground shrink-0 w-14 text-right">{idx === 0 ? "Initial" : idx === statuses.length - 1 ? "Terminal" : "Active"}</span>
                {editingIdx === idx ? (
                  <Button size="sm" className="h-7 text-xs px-2" onClick={commitEdit}>Save</Button>
                ) : (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(idx)} data-testid={`btn-edit-status-${idx}`}><Settings className="h-3 w-3" /></Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" onClick={() => deleteStatus(idx)} data-testid={`btn-delete-status-${idx}`}><X className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>

          {/* Add new status */}
          <div className="flex gap-2">
            <Input value={newStatus} onChange={e => setNewStatus(e.target.value)} placeholder="New status name…"
              onKeyDown={e => { if (e.key === "Enter") addStatus(); }}
              className="h-8 text-sm flex-1" data-testid="input-new-status" />
            <Button size="sm" className="h-8 gap-1.5" onClick={addStatus} disabled={!newStatus.trim()} data-testid="btn-add-status">
              <Plus className="h-3.5 w-3.5" />Add
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">First status = Initial state. Last status = Terminal state. Click the gear icon to rename.</p>
        </div>
      )}

      {/* ── Fields & Rules tab ── */}
      {configTab === "fields" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Field Configuration</h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetFields}>Reset Defaults</Button>
              <Button size="sm" className={`h-7 text-xs gap-1.5 ${fieldsSaved ? "bg-emerald-600 hover:bg-emerald-700" : ""}`} onClick={saveFields} data-testid="btn-save-fields">
                {fieldsSaved ? <CheckCircle2 className="h-3 w-3" /> : <CheckSquare className="h-3 w-3" />}{fieldsSaved ? "Saved!" : "Save Changes"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Toggle fields between Required and Optional. Locked fields cannot be changed.</p>
          <div className="space-y-1.5">
            {fields.map(f => (
              <div key={f.name} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${f.required ? "bg-primary/5 border-primary/20" : "bg-card"} ${f.locked ? "opacity-70" : ""}`}>
                <Switch checked={f.required} onCheckedChange={() => toggleField(f.name)} disabled={!!f.locked} data-testid={`toggle-field-${f.name.replace(/\s+/g, "-")}`} />
                <span className="text-sm flex-1">{f.name}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${f.required ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {f.locked ? "Always Required" : f.required ? "Required" : "Optional"}
                </span>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Reference Number Format</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 font-mono text-sm">
                <span className="text-primary font-bold">{({ recurring_task: "RT", service_ticket: "TKT", license: "LIC", certificate: "CERT" })[wfType]}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-foreground">TIMESTAMP</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-foreground">NNN</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Automation Rules tab ── */}
      {configTab === "automation" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 flex-1">
              <Zap className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">Rules send emails to <strong>Assigned To Email</strong> and <strong>Owner Email</strong>. Click any field to edit the trigger or action text.</p>
            </div>
            <Button onClick={runAutomations} disabled={running} className="gap-2 h-9 shrink-0" data-testid="btn-run-automations">
              {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
              {running ? "Running…" : "Run Active Rules Now"}
            </Button>
          </div>

          {runResult && (
            <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${runResult.errors.length ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
              {runResult.errors.length ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
              <span>
                {runResult.sent} email{runResult.sent !== 1 ? "s" : ""} sent.
                {runResult.errors.length > 0 && ` ${runResult.errors.length} error(s): ${runResult.errors.slice(0, 2).join("; ")}`}
              </span>
            </div>
          )}

          {automationRules[wfType].map(rule => {
            const Icon = rule.icon;
            return (
              <div key={rule.id} className={`rounded-xl border transition-all ${rule.enabled ? "bg-card" : "bg-muted/20 opacity-60"}`}>
                <div className="flex items-center gap-3 p-3 border-b border-border/40">
                  <div className={`p-2 rounded-lg shrink-0 ${rule.enabled ? "bg-primary/10" : "bg-muted"}`}>
                    <Icon className={`h-4 w-4 ${rule.enabled ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">Rule {rule.id}</span>
                  <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(wfType, rule.id)} data-testid={`toggle-rule-${rule.id}`} />
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5 block">When (Trigger)</Label>
                    <Input
                      value={rule.trigger}
                      onChange={e => editRule(wfType, rule.id, "trigger", e.target.value)}
                      className="text-sm h-8"
                      placeholder="Trigger condition…"
                      data-testid={`input-trigger-${rule.id}`}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5 block">Then (Action & Email)</Label>
                    <Textarea
                      value={rule.action}
                      onChange={e => editRule(wfType, rule.id, "action", e.target.value)}
                      className="text-sm resize-none"
                      rows={2}
                      placeholder="Action and email description…"
                      data-testid={`input-action-${rule.id}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Type overview (per-type landing) ─────────────────────────────────────────
function TypeOverview({ wfType, submissions, onSelect, onNew, setTypeTab }: {
  wfType: WorkflowType; submissions: Submission[];
  onSelect: (s: Submission) => void; onNew: () => void;
  setTypeTab: (t: string) => void;
}) {
  const wf = WF_TYPES[wfType];
  const scope = submissions.filter(s => s.workflowType === wfType);
  const open = scope.filter(s => !["Completed", "Resolved", "Closed", "Renewed", "Expired"].includes(s.status)).length;
  const overdue = scope.filter(isOverdue).length;
  const expiring = scope.filter(s => isExpiringSoon(s, 30)).length;
  const recent = scope.slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Records" value={scope.length} icon={Layers} color="text-foreground" />
        <StatCard label="Open / Active" value={open} icon={Activity} color={wf.color} />
        <StatCard label="Overdue" value={overdue} icon={AlertTriangle} color="text-red-500" />
        {(wfType === "license" || wfType === "certificate") && <StatCard label="Expiring ≤30d" value={expiring} icon={Bell} color="text-orange-500" />}
        {(wfType === "recurring_task" || wfType === "service_ticket") && <StatCard label="Completed" value={scope.filter(s => ["Completed", "Resolved", "Closed"].includes(s.status)).length} icon={CheckCircle2} color="text-emerald-600" />}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button onClick={onNew} className="gap-2 h-9" data-testid={`btn-new-${wfType}`}><Plus className="h-4 w-4" />New {wf.label.replace(/s$/, "")}</Button>
        <Button variant="outline" className="gap-2 h-9" onClick={() => setTypeTab("records")}><ClipboardList className="h-4 w-4" />View All Records</Button>
        <Button variant="outline" className="gap-2 h-9" onClick={() => setTypeTab("analytics")}><BarChart2 className="h-4 w-4" />Analytics</Button>
        <Button variant="outline" className="gap-2 h-9" onClick={() => setTypeTab("config")}><Settings className="h-4 w-4" />Config</Button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Recent Records</h3>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setTypeTab("records")}>View all <ChevronRight className="h-3 w-3 ml-1" /></Button>
        </div>
        <div className="rounded-xl border overflow-hidden">
          {scope.length === 0 && (
            <div className="text-center py-14 text-muted-foreground">
              <div className={`inline-flex p-4 rounded-2xl ${wf.bg} mb-3`}><wf.icon className={`h-8 w-8 ${wf.color} opacity-60`} /></div>
              <p className="text-sm font-medium">No {wf.label} yet</p>
              <p className="text-xs mt-1">Create your first record to get started.</p>
              <Button onClick={onNew} className="mt-4 h-8 text-xs gap-1.5" size="sm"><Plus className="h-3.5 w-3.5" />New {wf.label.replace(/s$/, "")}</Button>
            </div>
          )}
          {recent.map(s => <SubRow key={s.id} s={s} onClick={() => onSelect(s)} />)}
        </div>
      </div>

      {overdue > 0 && (
        <div className="p-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-red-500" /><p className="text-sm font-semibold text-red-700 dark:text-red-400">{overdue} overdue item{overdue !== 1 ? "s" : ""} need attention</p></div>
          <div className="space-y-1">
            {scope.filter(isOverdue).slice(0, 3).map(s => (
              <div key={s.id} className="flex items-center gap-2 text-xs cursor-pointer hover:opacity-80" onClick={() => onSelect(s)}>
                <span className="flex-1 truncate font-medium">{s.title}</span>
                <span className="text-red-600 shrink-0">{fmt(s.dueDate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create dialog ─────────────────────────────────────────────────────────────
function CreateDialog({ open, onClose, defaultType, departments, defaultServiceDeskId }: {
  open: boolean; onClose: () => void; defaultType?: WorkflowType;
  departments: { id: number; name: string }[];
  defaultServiceDeskId?: number;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [type, setType] = useState<WorkflowType>(defaultType || "service_ticket");
  const blank = {
    title: "", description: "", priority: "Medium",
    ownerName: "", ownerEmail: "",
    assignedTo: "", assignedToEmail: "",
    requesterName: "", requesterEmail: "",
    holderName: "", holderEmail: "",
    departmentName: "", dueDate: "", expiryDate: "",
    recurrenceType: "Monthly", vendorName: "", issueAuthority: "",
    licenseType: "", category: "", slaTarget: "",
  };
  const [form, setForm] = useState<Record<string, string>>(blank);
  // Sync type and reset form every time the dialog opens or the intended type changes
  useEffect(() => {
    if (open) {
      setType(defaultType || "service_ticket");
      setForm(blank);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultType]);
  const defaults: Record<WorkflowType, string> = { recurring_task: "Scheduled", service_ticket: "New", license: "Active", certificate: "Active" };

  const mut = useMutation({
    mutationFn: (d: Record<string, unknown>) => apiRequest("POST", "/api/workflow/submissions", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/analytics"] });
      toast({ title: "Record created successfully" });
      onClose(); setForm(blank);
    },
    onError: () => toast({ title: "Failed to create record", variant: "destructive" }),
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }
  function submit() {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    const extra: Record<string, unknown> = { ...form, workflowType: type, status: defaults[type], requesterName: form.requesterName || user?.name };
    if (type === "service_ticket" && defaultServiceDeskId) extra.serviceDeskId = defaultServiceDeskId;
    mut.mutate(extra);
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />New Workflow Record</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          {!defaultType && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
            </>
          )}

          <div className="grid gap-3">
            <div><Label className="text-xs">Title *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} className="mt-1" data-testid="input-wf-title" /></div>
            <div><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} className="mt-1 resize-none" /></div>
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

          {/* ── Assignment & Notifications ── */}
          <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3" />Assignment &amp; Notification Contacts</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><Label className="text-xs">Assigned To (Name)</Label><Input value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)} placeholder="Full name" className="mt-1 h-8 text-sm" data-testid="input-wf-assigned" /></div>
              <div><Label className="text-xs">Assigned To (Email)</Label><Input type="email" value={form.assignedToEmail} onChange={e => set("assignedToEmail", e.target.value)} placeholder="assignee@company.com" className="mt-1 h-8 text-sm" data-testid="input-wf-assigned-email" /></div>
              <div><Label className="text-xs">Owner Name</Label><Input value={form.ownerName} onChange={e => set("ownerName", e.target.value)} placeholder="Full name" className="mt-1 h-8 text-sm" data-testid="input-wf-owner" /></div>
              <div><Label className="text-xs">Owner Email</Label><Input type="email" value={form.ownerEmail} onChange={e => set("ownerEmail", e.target.value)} placeholder="owner@company.com" className="mt-1 h-8 text-sm" data-testid="input-wf-owner-email" /></div>
              {type === "service_ticket" && (
                <>
                  <div><Label className="text-xs">Requester Name</Label><Input value={form.requesterName} onChange={e => set("requesterName", e.target.value)} placeholder="Full name" className="mt-1 h-8 text-sm" /></div>
                  <div><Label className="text-xs">Requester Email</Label><Input type="email" value={form.requesterEmail} onChange={e => set("requesterEmail", e.target.value)} placeholder="requester@company.com" className="mt-1 h-8 text-sm" data-testid="input-wf-requester-email" /></div>
                </>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Bell className="h-2.5 w-2.5" />Automation emails go to Assigned To Email and Owner Email based on configured rules.</p>
          </div>

          {/* ── Type-specific fields ── */}
          {type === "recurring_task" && (
            <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-3 space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">Recurrence Settings</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Recurrence Pattern</Label>
                  <Select value={form.recurrenceType} onValueChange={v => set("recurrenceType", v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Due Date</Label><Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} className="mt-1 h-8" /></div>
              </div>
            </div>
          )}
          {type === "service_ticket" && (
            <div className="rounded-lg border bg-violet-50/50 dark:bg-violet-950/20 p-3 space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400">Ticket Settings</p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Due Date</Label><Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} className="mt-1 h-8" /></div>
                <div><Label className="text-xs">SLA Target</Label><Input value={form.slaTarget} onChange={e => set("slaTarget", e.target.value)} placeholder="e.g. 4 hours" className="mt-1 h-8" /></div>
              </div>
            </div>
          )}
          {(type === "license" || type === "certificate") && (
            <div className={`rounded-lg border p-3 space-y-2.5 ${type === "license" ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "bg-amber-50/50 dark:bg-amber-950/20"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${type === "license" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                {type === "license" ? "License Details" : "Certificate Details"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">{type === "license" ? "License Type" : "Certificate Type"}</Label><Input value={form.licenseType} onChange={e => set("licenseType", e.target.value)} placeholder="e.g. Trade, Software" className="mt-1 h-8" /></div>
                <div><Label className="text-xs">{type === "license" ? "Vendor" : "Issuing Authority"}</Label>
                  <Input value={type === "license" ? form.vendorName : form.issueAuthority} onChange={e => set(type === "license" ? "vendorName" : "issueAuthority", e.target.value)} className="mt-1 h-8" />
                </div>
                <div><Label className="text-xs">Holder Name</Label><Input value={form.holderName} onChange={e => set("holderName", e.target.value)} className="mt-1 h-8" /></div>
                <div><Label className="text-xs">Holder Email</Label><Input type="email" value={form.holderEmail} onChange={e => set("holderEmail", e.target.value)} placeholder="holder@company.com" className="mt-1 h-8" data-testid="input-wf-holder-email" /></div>
                <div><Label className="text-xs">Issue Date</Label><Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} className="mt-1 h-8" /></div>
                <div><Label className="text-xs">Expiry Date *</Label><Input type="date" value={form.expiryDate} onChange={e => set("expiryDate", e.target.value)} className="mt-1 h-8" data-testid="input-expiry-date" /></div>
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
    onError: () => toast({ title: "Error posting comment", variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/workflow/submissions/${sub.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow/analytics"] });
      onClose(); toast({ title: "Record deleted" });
    },
  });

  const contacts = [
    { l: "Assigned To", name: sub.assignedTo, email: sub.assignedToEmail },
    { l: "Owner", name: sub.ownerName, email: sub.ownerEmail },
    { l: "Requester", name: sub.requesterName, email: sub.requesterEmail },
    ...(sub.holderName || sub.holderEmail ? [{ l: "Holder", name: sub.holderName, email: sub.holderEmail }] : []),
  ].filter(c => c.name || c.email);

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${wf.bg} shrink-0`}><Icon className={`h-5 w-5 ${wf.color}`} /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-mono text-muted-foreground">{sub.referenceNumber}</span>
                <StatusBadge status={sub.status} />
                <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${PRIORITY_COLORS[sub.priority] || ""}`}>{sub.priority}</span>
                {isOverdue(sub) && <span className="text-[10px] text-red-500 flex items-center gap-0.5"><AlertTriangle className="h-2.5 w-2.5" />Overdue</span>}
                {isExpiringSoon(sub) && <span className="text-[10px] text-orange-500 flex items-center gap-0.5"><Bell className="h-2.5 w-2.5" />Expiring Soon</span>}
              </div>
              <DialogTitle className="text-base">{sub.title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-4 h-8">
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="comments" className="text-xs">Comments{(sub.comments?.length || 0) > 0 && ` (${sub.comments?.length})`}</TabsTrigger>
            <TabsTrigger value="attachments" className="text-xs"><Paperclip className="h-3 w-3 mr-1 inline" />Files</TabsTrigger>
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

            {/* Contacts */}
            {contacts.length > 0 && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3" />Assignment &amp; Notification Contacts</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {contacts.map(c => (
                    <div key={c.l} className="flex items-start gap-2">
                      <Avatar name={c.name || undefined} />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">{c.l}</p>
                        {c.name && <p className="text-xs font-medium">{c.name}</p>}
                        {c.email && <a href={`mailto:${c.email}`} className="text-[11px] text-primary hover:underline flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" />{c.email}</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Record details grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { l: "Type", v: wf.label }, { l: "Priority", v: sub.priority },
                { l: "Department", v: sub.departmentName }, { l: "Category", v: sub.category },
                { l: "Due Date", v: fmt(sub.dueDate) }, { l: "Expiry Date", v: fmt(sub.expiryDate) },
                sub.recurrenceType && { l: "Recurrence", v: sub.recurrenceType },
                sub.slaTarget && { l: "SLA Target", v: sub.slaTarget },
                sub.vendorName && { l: "Vendor", v: sub.vendorName },
                sub.issueAuthority && { l: "Authority", v: sub.issueAuthority },
                sub.licenseType && { l: "License/Cert Type", v: sub.licenseType },
              ].filter(Boolean).map((item: any) => item.v && item.v !== "—" && (
                <div key={item.l} className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{item.l}</span>
                  <span className="text-sm font-medium">{item.v}</span>
                </div>
              ))}
            </div>
            {sub.description && (
              <div><p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">Description</p><p className="text-sm text-foreground/80 leading-relaxed">{sub.description}</p></div>
            )}
            <p className="text-[10px] text-muted-foreground">Created {fmt(sub.createdAt)} · Updated {fmt(sub.updatedAt)}</p>
          </TabsContent>
          <TabsContent value="comments" className="mt-4 space-y-3">
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {(sub.comments || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>}
              {(sub.comments || []).map(c => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar name={c.authorName} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="text-xs font-semibold">{c.authorName}</span><span className="text-[10px] text-muted-foreground">{fmt(c.createdAt)}</span></div>
                    <p className="text-sm text-foreground/80 mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex gap-2">
              <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment…" rows={2} className="resize-none text-sm" data-testid="input-comment" />
              <Button size="icon" className="self-end h-9 w-9 shrink-0" onClick={() => commentMut.mutate()} disabled={!comment.trim() || commentMut.isPending} data-testid="btn-send-comment"><SendHorizontal className="h-4 w-4" /></Button>
            </div>
          </TabsContent>
          <TabsContent value="attachments" className="mt-4">
            <DocumentAttachments entityType="workflow_submission" entityId={sub.id} />
          </TabsContent>
          <TabsContent value="activity" className="mt-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(sub.activity || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No activity recorded.</p>}
              {(sub.activity || []).map(a => (
                <div key={a.id} className="flex items-start gap-2 text-sm">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                  <div>
                    <span className="font-medium">{a.actorName}</span>{" "}
                    {a.action === "status_changed" ? <>changed status <span className="font-medium">{a.oldValue}</span> → <span className="font-medium">{a.newValue}</span></> : a.action === "commented" ? "added a comment" : a.action === "created" ? "created this record" : a.action}
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

// ── Main page ─────────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { key: "home", label: "Home", icon: Home, group: "main" },
  { key: "recurring_tasks", label: "Recurring Tasks", icon: RotateCcw, group: "workflows", wfType: "recurring_task" as WorkflowType },
  { key: "service_desk", label: "Service Desk", icon: Ticket, group: "workflows", wfType: "service_ticket" as WorkflowType },
  { key: "licenses", label: "Licenses", icon: ShieldCheck, group: "workflows", wfType: "license" as WorkflowType },
  { key: "certificates", label: "Certificates", icon: FileCheck2, group: "workflows", wfType: "certificate" as WorkflowType },
  { key: "analytics", label: "Analytics", icon: BarChart2, group: "tools" },
  { key: "my_work", label: "My Work", icon: User, group: "tools" },
  { key: "automations", label: "Automations", icon: Zap, group: "tools" },
] as const;

export default function WorkflowCenterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const search = useSearch();
  const [, navigate] = useLocation();

  // Derive section from URL search param ?s=recurring_tasks etc.
  const sectionFromUrl = useMemo(() => {
    const p = new URLSearchParams(search);
    return p.get("s") || "home";
  }, [search]);

  const [section, setSection] = useState(sectionFromUrl);
  const [typeTab, setTypeTab] = useState("overview"); // overview | config | records | analytics
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<WorkflowType | undefined>();
  const [detailSub, setDetailSub] = useState<Submission | null>(null);
  const [automationRules, setAutomationRules] = useState(AUTOMATION_RULES);
  const [analyticsFilter, setAnalyticsFilter] = useState<"all" | WorkflowType>("all");
  const [selectedDeskId, setSelectedDeskId] = useState<number | null>(null);
  const [createDeskOpen, setCreateDeskOpen] = useState(false);
  const [deskForm, setDeskForm] = useState({ name: "", description: "" });

  // Keep section in sync when the URL changes externally (e.g. sidebar link click)
  useEffect(() => {
    setSection(sectionFromUrl);
    setTypeTab("overview");
    if (sectionFromUrl !== "service_desk") setSelectedDeskId(null);
  }, [sectionFromUrl]);

  const { data: allSubs = [], refetch: refetchSubs } = useQuery<Submission[]>({ queryKey: ["/api/workflow/submissions"], enabled: !!user });
  const { data: analytics } = useQuery<Analytics>({ queryKey: ["/api/workflow/analytics"], enabled: !!user });
  const { data: company } = useQuery<{ departments: { id: number; name: string }[] }>({ queryKey: ["/api/company"], enabled: !!user });
  const { data: serviceDesks = [], refetch: refetchDesks } = useQuery<ServiceDeskEntry[]>({ queryKey: ["/api/service-desks"], enabled: !!user });
  const { data: detailFull, refetch: refetchDetail } = useQuery<Submission>({
    queryKey: ["/api/workflow/submissions", detailSub?.id],
    queryFn: () => fetch(`/api/workflow/submissions/${detailSub?.id}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!detailSub,
  });

  const createDeskMut = useMutation({
    mutationFn: (d: Record<string, string>) => apiRequest("POST", "/api/service-desks", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-desks"] });
      toast({ title: "Service Desk created" });
      setCreateDeskOpen(false);
      setDeskForm({ name: "", description: "" });
    },
    onError: () => toast({ title: "Failed to create desk", variant: "destructive" }),
  });

  const deleteDeskMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/service-desks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-desks"] });
      if (selectedDeskId !== null) setSelectedDeskId(null);
      toast({ title: "Service Desk deleted" });
    },
    onError: () => toast({ title: "Failed to delete desk", variant: "destructive" }),
  });

  const departments = company?.departments || [];
  const t = today();

  function goSection(s: string) {
    setSection(s);
    setTypeTab("overview");
    if (s !== "service_desk") setSelectedDeskId(null);
    navigate(s === "home" ? "/workflow" : `/workflow?s=${s}`);
  }
  function openCreate(type?: WorkflowType) { setCreateType(type); setCreateOpen(true); }
  function openDetail(s: Submission) { setDetailSub(s); }
  function toggleRule(type: WorkflowType, id: string) {
    setAutomationRules(r => ({ ...r, [type]: r[type].map(rule => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule) }));
  }
  function editRule(type: WorkflowType, id: string, field: "trigger" | "action", value: string) {
    setAutomationRules(r => ({ ...r, [type]: r[type].map(rule => rule.id === id ? { ...rule, [field]: value } : rule) }));
  }

  const currentWfType = SECTION_TYPE[section] as WorkflowType | undefined;
  const currentWf = currentWfType ? WF_TYPES[currentWfType] : null;

  const myWork = useMemo(() => allSubs.filter(s =>
    s.createdBy === user?.id || s.ownerName === user?.name || s.assignedTo === user?.name || s.assignedToEmail === user?.email
  ), [allSubs, user]);

  const overallStats = {
    total: allSubs.length,
    open: allSubs.filter(s => !["Completed", "Resolved", "Closed", "Renewed", "Expired"].includes(s.status)).length,
    overdue: allSubs.filter(isOverdue).length,
    expiring: allSubs.filter(s => isExpiringSoon(s, 30)).length,
  };

  const ownerLoad = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of allSubs) {
      const name = s.assignedTo || s.ownerName;
      if (name && !["Completed", "Resolved", "Closed", "Renewed", "Expired"].includes(s.status))
        map[name] = (map[name] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [allSubs]);

  return (
    <div className="flex h-full flex-col">
      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile nav */}
        <div className="md:hidden flex items-center gap-1 px-3 py-2 border-b overflow-x-auto">
          {NAV_SECTIONS.map(s => (
            <button key={s.key} onClick={() => goSection(s.key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${section === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Per-type secondary tab bar — hidden on service-desk landing */}
        {currentWfType && !(section === "service_desk" && selectedDeskId === null) && (
          <div className={`flex items-center gap-1 px-6 py-2 border-b ${currentWf?.bg}`}>
            {section === "service_desk" && selectedDeskId !== null && (
              <button onClick={() => setSelectedDeskId(null)} className="mr-2 p-1 rounded hover:bg-white/40 dark:hover:bg-black/20 transition-colors" title="Back to Service Desks">
                <ChevronRight className="h-4 w-4 rotate-180 text-muted-foreground" />
              </button>
            )}
            <div className={`p-1.5 rounded-lg bg-white/60 dark:bg-black/20 mr-2`}>
              {currentWf && <currentWf.icon className={`h-4 w-4 ${currentWf.color}`} />}
            </div>
            <h1 className={`text-sm font-bold mr-1 ${currentWf?.color}`}>
              {section === "service_desk" && selectedDeskId !== null
                ? (serviceDesks.find(d => d.id === selectedDeskId)?.name || "Service Desk")
                : currentWf?.label}
            </h1>
            {section === "service_desk" && selectedDeskId !== null && (
              <span className="text-xs text-muted-foreground mr-3">/ Service Desk</span>
            )}
            {["overview", "config", "records", "analytics"].map(t => (
              <button key={t} onClick={() => setTypeTab(t)} data-testid={`tab-type-${t}`}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${typeTab === t ? "bg-white dark:bg-black/30 shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-black/20"}`}>
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">

          {/* ═══ HOME ═══ */}
          {section === "home" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><h1 className="text-xl font-bold">Workflow Center</h1><p className="text-sm text-muted-foreground">Command center for all operational workflows across your organisation.</p></div>
                <Button onClick={() => openCreate()} className="gap-2" data-testid="btn-new-submission-home"><Plus className="h-4 w-4" />New Record</Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Records" value={overallStats.total} icon={Layers} color="text-foreground" />
                <StatCard label="Open Items" value={overallStats.open} icon={Activity} color="text-blue-600" sub="across all types" />
                <StatCard label="Overdue" value={overallStats.overdue} icon={AlertTriangle} color="text-red-500" sub="requires attention" />
                <StatCard label="Expiring ≤30d" value={overallStats.expiring} icon={Bell} color="text-orange-500" sub="licenses & certs" />
              </div>

              {/* Per-type summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.entries(WF_TYPES) as [WorkflowType, typeof WF_TYPES[WorkflowType]][]).map(([k, v]) => {
                  const Icon = v.icon;
                  const total = allSubs.filter(s => s.workflowType === k).length;
                  const open = allSubs.filter(s => s.workflowType === k && !["Completed", "Resolved", "Closed", "Renewed", "Expired"].includes(s.status)).length;
                  const overdue = allSubs.filter(s => s.workflowType === k && isOverdue(s)).length;
                  return (
                    <button key={k} onClick={() => goSection(v.navKey)} data-testid={`card-home-${k}`}
                      className={`text-left rounded-xl border bg-card p-4 hover:shadow-md transition-all group border-l-4 ${v.accent}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-lg ${v.bg}`}><Icon className={`h-4 w-4 ${v.color}`} /></div>
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
                      </div>
                      <h3 className="text-xs font-semibold text-muted-foreground">{v.label}</h3>
                      <p className="text-2xl font-bold mt-1">{total}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px]">
                        <span className="text-muted-foreground">{open} open</span>
                        {overdue > 0 && <span className="text-red-500 font-medium">{overdue} overdue</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Workload by Assignee</CardTitle></CardHeader>
                  <CardContent className="space-y-2.5">
                    {ownerLoad.length === 0 && <p className="text-xs text-muted-foreground">No active assigned records.</p>}
                    {ownerLoad.map(([name, count]) => <MiniBar key={name} label={name} value={count} max={ownerLoad[0]?.[1] || 1} color="bg-primary/70" />)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4 text-orange-500" />Expiring Within 30 Days</CardTitle></CardHeader>
                  <CardContent className="space-y-1.5">
                    {allSubs.filter(s => isExpiringSoon(s, 30)).length === 0 && <p className="text-xs text-muted-foreground">No items expiring within 30 days.</p>}
                    {allSubs.filter(s => isExpiringSoon(s, 30)).sort((a, b) => (a.expiryDate || "").localeCompare(b.expiryDate || "")).slice(0, 5).map(s => {
                      const d = daysUntil(s.expiryDate);
                      return (
                        <div key={s.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/40 cursor-pointer" onClick={() => openDetail(s)}>
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${d !== null && d <= 7 ? "bg-red-500" : "bg-orange-400"}`} />
                          <p className="text-xs flex-1 truncate">{s.title}</p>
                          <span className={`text-[11px] font-semibold shrink-0 ${d !== null && d <= 7 ? "text-red-600" : "text-orange-600"}`}>{d === 0 ? "Today" : `${d}d`}</span>
                        </div>
                      );
                    })}
                    <Button variant="ghost" size="sm" className="w-full h-7 text-xs mt-1" onClick={() => goSection("licenses")}>View Renewals <ChevronRight className="h-3 w-3 ml-1" /></Button>
                  </CardContent>
                </Card>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">Recent Activity</h2>
                </div>
                <div className="rounded-xl border overflow-hidden">
                  {allSubs.length === 0 && <div className="text-center py-12 text-muted-foreground"><Workflow className="h-8 w-8 mx-auto mb-2 opacity-20" /><p className="text-sm">No records yet. Create your first workflow record.</p></div>}
                  {allSubs.slice(0, 8).map(s => <SubRow key={s.id} s={s} onClick={() => openDetail(s)} />)}
                </div>
              </div>
            </div>
          )}

          {/* ═══ SERVICE DESK LANDING ═══ */}
          {section === "service_desk" && selectedDeskId === null && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold">Service Desks</h1>
                  <p className="text-sm text-muted-foreground">Create and manage service desks, then track tickets within each desk.</p>
                </div>
                <Button onClick={() => setCreateDeskOpen(true)} className="gap-2" data-testid="btn-create-desk">
                  <Plus className="h-4 w-4" />New Service Desk
                </Button>
              </div>

              {serviceDesks.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/20 p-12 text-center">
                  <Ticket className="h-10 w-10 mx-auto text-violet-400 mb-3" />
                  <h3 className="font-semibold text-lg mb-1">No Service Desks Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Create your first service desk (e.g., IT Services, Facility Management, HR) to start tracking tickets.</p>
                  <Button onClick={() => setCreateDeskOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Create First Desk</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {serviceDesks.map(desk => {
                    const deskTickets = allSubs.filter(s => s.workflowType === "service_ticket" && s.serviceDeskId === desk.id);
                    const openTickets = deskTickets.filter(s => !["Resolved", "Closed"].includes(s.status));
                    const overdueTickets = deskTickets.filter(isOverdue);
                    return (
                      <div key={desk.id} className="rounded-xl border bg-card hover:shadow-md transition-all group border-l-4 border-violet-400">
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/40">
                                <Ticket className="h-5 w-5 text-violet-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-sm leading-tight">{desk.name}</h3>
                                {desk.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{desk.description}</p>}
                              </div>
                            </div>
                            <button onClick={e => { e.stopPropagation(); deleteDeskMut.mutate(desk.id); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500"
                              title="Delete desk" data-testid={`btn-delete-desk-${desk.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                            <span className="font-medium text-foreground">{deskTickets.length}</span> total
                            <span className="text-blue-600 font-medium">{openTickets.length}</span> open
                            {overdueTickets.length > 0 && <span className="text-red-600 font-medium">{overdueTickets.length} overdue</span>}
                          </div>
                          <Button size="sm" className="w-full h-7 text-xs" onClick={() => { setSelectedDeskId(desk.id); setTypeTab("overview"); }}
                            data-testid={`btn-open-desk-${desk.id}`}>
                            View Tickets <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Create Desk Dialog */}
              <Dialog open={createDeskOpen} onOpenChange={v => !v && setCreateDeskOpen(false)}>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle className="flex items-center gap-2"><Ticket className="h-5 w-5 text-violet-600" />New Service Desk</DialogTitle></DialogHeader>
                  <div className="space-y-3 py-1">
                    <div>
                      <Label className="text-xs">Desk Name *</Label>
                      <Input value={deskForm.name} onChange={e => setDeskForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. IT Services Desk, Facility Management, HR" className="mt-1" data-testid="input-desk-name" />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Textarea value={deskForm.description} onChange={e => setDeskForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="What types of tickets does this desk handle?" className="mt-1 text-sm" rows={3} data-testid="input-desk-description" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDeskOpen(false)}>Cancel</Button>
                    <Button onClick={() => { if (!deskForm.name.trim()) { toast({ title: "Desk name is required", variant: "destructive" }); return; } createDeskMut.mutate(deskForm); }}
                      disabled={createDeskMut.isPending} data-testid="btn-submit-desk">
                      {createDeskMut.isPending ? "Creating…" : "Create Desk"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* ═══ WORKFLOW TYPE SECTIONS ═══ */}
          {currentWfType && !(section === "service_desk" && selectedDeskId === null) && (
            <>
              {typeTab === "overview" && (
                <TypeOverview wfType={currentWfType}
                  submissions={section === "service_desk" && selectedDeskId !== null ? allSubs.filter(s => s.workflowType === "service_ticket" && s.serviceDeskId === selectedDeskId) : allSubs}
                  onSelect={openDetail} onNew={() => openCreate(currentWfType)} setTypeTab={setTypeTab} />
              )}
              {typeTab === "config" && (
                <TypeConfig wfType={currentWfType} automationRules={automationRules} toggleRule={toggleRule} editRule={editRule} onRunAutomations={() => {}} />
              )}
              {typeTab === "records" && (
                <RecordsView
                  submissions={section === "service_desk" && selectedDeskId !== null
                    ? allSubs.filter(s => s.workflowType === "service_ticket" && s.serviceDeskId === selectedDeskId)
                    : allSubs.filter(s => s.workflowType === currentWfType)}
                  wfType={currentWfType} onSelect={openDetail} onNew={() => openCreate(currentWfType)} />
              )}
              {typeTab === "analytics" && (
                <TypeAnalytics
                  submissions={section === "service_desk" && selectedDeskId !== null
                    ? allSubs.filter(s => s.workflowType === "service_ticket" && s.serviceDeskId === selectedDeskId)
                    : allSubs}
                  wfType={currentWfType} />
              )}
            </>
          )}

          {/* ═══ ANALYTICS (global) ═══ */}
          {section === "analytics" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><h1 className="text-xl font-bold">Workflow Analytics</h1><p className="text-sm text-muted-foreground">Cross-workflow performance, trends, and workload overview.</p></div>
                <div className="flex gap-1 flex-wrap">
                  {(["all", "recurring_task", "service_ticket", "license", "certificate"] as const).map(k => (
                    <button key={k} onClick={() => setAnalyticsFilter(k)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${analyticsFilter === k ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}>
                      {k === "all" ? "All" : WF_TYPES[k].label}
                    </button>
                  ))}
                </div>
              </div>
              {analyticsFilter === "all" ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total" value={allSubs.length} icon={Layers} color="text-foreground" />
                    <StatCard label="Open" value={overallStats.open} icon={Activity} color="text-blue-600" />
                    <StatCard label="Overdue" value={overallStats.overdue} icon={AlertTriangle} color="text-red-500" />
                    <StatCard label="Expiring ≤30d" value={overallStats.expiring} icon={Bell} color="text-orange-500" />
                  </div>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Volume by Workflow Type</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(Object.entries(WF_TYPES) as [WorkflowType, typeof WF_TYPES[WorkflowType]][]).map(([k, v]) => {
                          const Icon = v.icon;
                          const typeTotal = allSubs.filter(s => s.workflowType === k).length;
                          const pct = allSubs.length > 0 ? Math.round((typeTotal / allSubs.length) * 100) : 0;
                          return (
                            <button key={k} onClick={() => goSection(v.navKey)} className={`text-left rounded-xl border p-4 border-l-4 ${v.accent} hover:shadow-md transition-all`}>
                              <div className={`inline-flex p-1.5 rounded-lg ${v.bg} mb-2`}><Icon className={`h-4 w-4 ${v.color}`} /></div>
                              <p className="text-xs text-muted-foreground">{v.label}</p>
                              <p className="text-2xl font-bold">{typeTotal}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">{pct}% of total</p>
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Workload by Assignee</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        {ownerLoad.map(([name, count]) => <MiniBar key={name} label={name} value={count} max={ownerLoad[0]?.[1] || 1} color="bg-primary/60" />)}
                        {ownerLoad.length === 0 && <p className="text-xs text-muted-foreground">No data.</p>}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Overdue Items</CardTitle></CardHeader>
                      <CardContent>
                        {allSubs.filter(isOverdue).length === 0 && <div className="text-center py-4"><CheckCircle2 className="h-6 w-6 mx-auto text-emerald-500 opacity-60 mb-1" /><p className="text-xs text-muted-foreground">No overdue items.</p></div>}
                        <div className="space-y-1.5">
                          {allSubs.filter(isOverdue).slice(0, 6).map(s => (
                            <div key={s.id} className="flex items-center gap-2 text-xs p-1 rounded hover:bg-muted/20 cursor-pointer" onClick={() => openDetail(s)}>
                              <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                              <span className="flex-1 truncate font-medium">{s.title}</span>
                              <span className="text-muted-foreground shrink-0">{fmt(s.dueDate)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <TypeAnalytics submissions={allSubs} wfType={analyticsFilter as WorkflowType} />
              )}
            </div>
          )}

          {/* ═══ MY WORK ═══ */}
          {section === "my_work" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div><h1 className="text-xl font-bold">My Work</h1><p className="text-sm text-muted-foreground">Records assigned to you or owned by you across all workflow types.</p></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Assigned" value={myWork.length} icon={User} color="text-foreground" />
                <StatCard label="Open" value={myWork.filter(s => !["Completed", "Resolved", "Closed", "Renewed", "Expired"].includes(s.status)).length} icon={Activity} color="text-blue-600" />
                <StatCard label="Overdue" value={myWork.filter(isOverdue).length} icon={AlertTriangle} color="text-red-500" />
                <StatCard label="Completed" value={myWork.filter(s => ["Completed", "Resolved", "Closed", "Renewed"].includes(s.status)).length} icon={CheckCircle2} color="text-emerald-600" />
              </div>
              <div className="rounded-xl border overflow-hidden">
                {myWork.length === 0 && <div className="text-center py-14 text-muted-foreground"><User className="h-8 w-8 mx-auto mb-2 opacity-20" /><p className="text-sm">No records assigned to you.</p></div>}
                {myWork.map(s => <SubRow key={s.id} s={s} onClick={() => openDetail(s)} />)}
              </div>
            </div>
          )}

          {/* ═══ AUTOMATIONS ═══ */}
          {section === "automations" && (
            <div className="space-y-5">
              <div><h1 className="text-xl font-bold">Automation Rules</h1><p className="text-sm text-muted-foreground">Configure when and how automated email reminders and alerts are sent for each workflow type.</p></div>
              <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 flex items-start gap-2">
                <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">How automation emails work</p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">When a rule triggers, the system sends email reminders to the <strong>Assigned To Email</strong> and <strong>Owner Email</strong> stored on the record. Make sure all records have valid email addresses set.</p>
                </div>
              </div>
              {(Object.entries(WF_TYPES) as [WorkflowType, typeof WF_TYPES[WorkflowType]][]).map(([k, v]) => {
                const Icon = v.icon;
                const enabledCount = automationRules[k].filter(r => r.enabled).length;
                return (
                  <div key={k} className={`rounded-xl border border-l-4 ${v.accent}`}>
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-t-xl ${v.bg}`}>
                      <div className="p-1.5 rounded-lg bg-white/60 dark:bg-black/20"><Icon className={`h-4 w-4 ${v.color}`} /></div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold">{v.label}</h3>
                        <p className="text-[10px] text-muted-foreground">{enabledCount} of {automationRules[k].length} rules active</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { goSection(v.navKey); setTypeTab("config"); }}>Configure <ChevronRight className="h-3 w-3 ml-1" /></Button>
                    </div>
                    <div className="divide-y divide-border/30">
                      {automationRules[k].map(rule => {
                        const RuleIcon = rule.icon;
                        return (
                          <div key={rule.id} className={`flex items-center gap-3 px-4 py-3 transition-all ${rule.enabled ? "" : "opacity-50"}`}>
                            <RuleIcon className={`h-4 w-4 shrink-0 ${rule.enabled ? "text-primary" : "text-muted-foreground"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">{rule.trigger}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{rule.action}</p>
                            </div>
                            <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(k, rule.id)} data-testid={`toggle-rule-${rule.id}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* ── Dialogs ── */}
      <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)} defaultType={createType} departments={departments}
        defaultServiceDeskId={section === "service_desk" && selectedDeskId !== null ? selectedDeskId : undefined} />
      {detailSub && (
        <DetailDialog sub={detailFull || detailSub} onClose={() => setDetailSub(null)}
          onUpdate={() => { refetchDetail(); refetchSubs(); queryClient.invalidateQueries({ queryKey: ["/api/workflow/analytics"] }); }} />
      )}
    </div>
  );
}
