import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft, Calendar, Users, Target, AlertTriangle, Edit3,
  Plus, Trash2, MessageSquare, Send, Flag, ChevronDown, ChevronRight,
  LayoutList, Circle, CalendarDays, Pencil, CheckCircle2,
  Kanban, ChevronLeft, List, Paperclip,
} from "lucide-react";
import { DocumentAttachments } from "@/components/document-attachments";
import type { Project, Task, Subtask, Milestone, ProjectComment, Department, TeamMember } from "@shared/schema";
import { formatDate } from "@/lib/utils";

type ProjectDetail = Project & {
  health: "Green" | "Amber" | "Red" | "Completed";
  tasks: Task[];
  milestones: Milestone[];
};

type TaskWithSubtasks = Task & { subtasks: Subtask[] };

function healthBadge(h: string) {
  if (h === "Green") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (h === "Amber") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  if (h === "Red") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
}

function statusPill(s: string) {
  if (s === "Completed") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (s === "In Progress") return "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400";
  if (s === "At Risk") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (s === "Not Started") return "bg-muted text-muted-foreground";
  return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
}

function priorityColor(p: string) {
  if (p === "Critical") return "text-red-600 dark:text-red-400";
  if (p === "High") return "text-orange-600 dark:text-orange-400";
  if (p === "Medium") return "text-blue-600 dark:text-blue-400";
  return "text-muted-foreground";
}

const TASK_STATUSES = ["Not Started", "In Progress", "At Risk", "Completed"];
const MILESTONE_STATUSES = ["Upcoming", "In Progress", "Completed", "Overdue"];

function statusDot(s: string) {
  if (s === "Completed") return "bg-emerald-500";
  if (s === "In Progress") return "bg-violet-500";
  if (s === "At Risk") return "bg-red-500";
  return "bg-slate-300 dark:bg-slate-600";
}

function priorityBg(p: string) {
  if (p === "Critical") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (p === "High") return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  if (p === "Medium") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  return "bg-muted text-muted-foreground";
}

function subStatusPill(s: string) {
  if (s === "Completed") return "text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (s === "In Progress") return "text-violet-700 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400";
  if (s === "At Risk") return "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
  return "text-muted-foreground bg-muted";
}

function subProgressToStatus(pct: number) {
  if (pct >= 100) return "Completed";
  if (pct > 0) return "In Progress";
  return "Not Started";
}

function TaskCard({
  task, canEdit, onStatusChange, onDelete, onEdit, teamMembers
}: {
  task: TaskWithSubtasks;
  canEdit: boolean;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  onEdit: (task: TaskWithSubtasks) => void;
  teamMembers: TeamMember[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [subForm, setSubForm] = useState({ title: "", owner: "", dueDate: "", status: "Not Started", progress: 0 });
  const [editSubId, setEditSubId] = useState<number | null>(null);
  const [editSubForm, setEditSubForm] = useState({ title: "", owner: "", dueDate: "", status: "Not Started", progress: 0 });
  const { toast } = useToast();

  const toggleSubtask = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      apiRequest("PATCH", `/api/subtasks/${id}`, { completed, status: completed ? "Completed" : "Not Started", progress: completed ? 100 : 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", task.projectId, "tasks"] });
    },
  });

  const addSubtask = useMutation({
    mutationFn: (data: typeof subForm) =>
      apiRequest("POST", `/api/tasks/${task.id}/subtasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", task.projectId, "tasks"] });
      setSubForm({ title: "", owner: "", dueDate: "", status: "Not Started", progress: 0 });
      setShowSubtaskForm(false);
    },
  });

  const updateSubtask = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof editSubForm }) =>
      apiRequest("PATCH", `/api/subtasks/${id}`, { ...data, completed: data.progress >= 100 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", task.projectId, "tasks"] });
      setEditSubId(null);
      toast({ title: "Task updated" });
    },
    onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
  });

  const deleteSubtask = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/subtasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", task.projectId, "tasks"] });
    },
  });

  const doneCount = task.subtasks?.filter(s => s.completed).length || 0;
  const totalSubs = task.subtasks?.length || 0;
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = task.dueDate && task.dueDate < today && task.status !== "Completed";
  const owner = (task as any).owner || task.assignee;

  const computedProgress = totalSubs > 0
    ? Math.round(task.subtasks.reduce((sum, s) => sum + ((s as any).progress ?? (s.completed ? 100 : 0)), 0) / totalSubs)
    : (task.progress ?? 0);
  const isCompleted = task.status === "Completed" || computedProgress >= 100;

  return (
    <>
      {/* ── Initiative row (ClickUp-style) ── */}
      <div
        className={`group flex items-center border-b last:border-b-0 transition-colors min-h-[44px] ${isOverdue && !isCompleted ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-muted/40"}`}
        data-testid={`card-task-${task.id}`}
      >
        {/* Expand chevron (28px) */}
        <button
          className="w-7 flex items-center justify-center shrink-0 self-stretch text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setExpanded(!expanded)}
          data-testid={`button-expand-subtasks-${task.id}`}
        >
          {totalSubs > 0
            ? (expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />)
            : <span className="w-3.5 h-3.5 block" />}
        </button>

        {/* Status dot / selector (28px) */}
        <div className="w-7 flex items-center justify-center shrink-0">
          {canEdit ? (
            <Select value={task.status} onValueChange={v => onStatusChange(task.id, v)}>
              <SelectTrigger
                className="border-0 p-0 h-auto w-auto shadow-none bg-transparent focus:ring-0 [&>svg]:hidden"
                data-testid={`select-task-status-${task.id}`}
              >
                <div className={`w-3.5 h-3.5 rounded-sm ${statusDot(task.status)} cursor-pointer hover:opacity-80 transition-opacity`} title={task.status} />
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map(s => (
                  <SelectItem key={s} value={s} className="text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-sm ${statusDot(s)}`} />
                      {s}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className={`w-3.5 h-3.5 rounded-sm ${statusDot(task.status)}`} title={task.status} />
          )}
        </div>

        {/* Title (flex-1) */}
        <div className="flex-1 min-w-0 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" data-testid={`icon-completed-${task.id}`} />}
            <span
              className={`text-sm font-medium truncate ${isCompleted ? "line-through text-muted-foreground" : ""}`}
              data-testid={`text-task-title-${task.id}`}
            >
              {task.title}
            </span>
            {isOverdue && !isCompleted && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
          </div>
          {task.description && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{task.description}</p>}
          {totalSubs > 0 && (
            <span className="text-[10px] text-muted-foreground/70">{doneCount}/{totalSubs} tasks</span>
          )}
        </div>

        {/* Owner (145px) */}
        <div className="w-[145px] shrink-0 px-2 hidden sm:block">
          {owner ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 min-w-0">
              <Users className="h-3 w-3 shrink-0" />
              <span className="truncate">{owner}</span>
            </span>
          ) : <span className="text-xs text-muted-foreground">—</span>}
        </div>

        {/* Due date (105px) */}
        <div className="w-[105px] shrink-0 px-2 hidden md:block">
          {task.dueDate ? (
            <span className={`text-xs flex items-center gap-1 ${isOverdue && !isCompleted ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
              <Calendar className="h-3 w-3 shrink-0" />
              {formatDate(task.dueDate)}
            </span>
          ) : <span className="text-xs text-muted-foreground">—</span>}
        </div>

        {/* Priority (90px) */}
        <div className="w-[90px] shrink-0 px-2 hidden md:block">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${priorityBg(task.priority)}`}>
            {task.priority}
          </span>
        </div>

        {/* Progress (130px) */}
        <div className="w-[130px] shrink-0 px-2 hidden lg:block">
          <div className="flex items-center gap-2">
            <Progress
              value={computedProgress}
              className={`h-1.5 flex-1 ${isCompleted ? "[&>div]:bg-emerald-500" : computedProgress > 0 ? "[&>div]:bg-violet-500" : ""}`}
            />
            <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right shrink-0">{computedProgress}%</span>
          </div>
        </div>

        {/* Actions (60px) */}
        <div className="w-[60px] shrink-0 flex items-center justify-end gap-0.5 pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {canEdit && (
            <>
              <button
                onClick={() => onEdit(task)}
                className="p-1 text-muted-foreground hover:text-primary transition-colors"
                data-testid={`button-edit-task-${task.id}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                data-testid={`button-delete-task-${task.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Subtask rows (expanded) ── */}
      {expanded && (
        <div className="bg-muted/10">
          {task.subtasks.map(sub => {
            const subProg = (sub as any).progress ?? (sub.completed ? 100 : 0);
            const subDone = subProg >= 100 || sub.completed;
            return (
              <div
                key={sub.id}
                className="group/sub flex items-center border-b last:border-b-0 hover:bg-muted/30 transition-colors min-h-[38px]"
                data-testid={`row-subtask-${sub.id}`}
              >
                {/* Indent spacer (28px) */}
                <div className="w-7 shrink-0 flex items-center justify-center">
                  <div className="w-px h-full bg-border/60" />
                </div>

                {/* Checkbox (28px) */}
                <div className="w-7 flex items-center justify-center shrink-0">
                  <Checkbox
                    checked={sub.completed ?? false}
                    disabled={!canEdit || toggleSubtask.isPending}
                    onCheckedChange={v => toggleSubtask.mutate({ id: sub.id, completed: !!v })}
                    className="h-3.5 w-3.5"
                    data-testid={`checkbox-subtask-${sub.id}`}
                  />
                </div>

                {/* Title (flex-1) */}
                <div className="flex-1 min-w-0 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-medium ${subDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {sub.title}
                    </span>
                  </div>
                </div>

                {/* Owner (145px) */}
                <div className="w-[145px] shrink-0 px-2 hidden sm:block">
                  {(sub as any).owner ? (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                      <Users className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{(sub as any).owner}</span>
                    </span>
                  ) : <span className="text-[11px] text-muted-foreground">—</span>}
                </div>

                {/* Due date (105px) */}
                <div className="w-[105px] shrink-0 px-2 hidden md:block">
                  {(sub as any).dueDate ? (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5 shrink-0" />
                      {formatDate((sub as any).dueDate)}
                    </span>
                  ) : <span className="text-[11px] text-muted-foreground">—</span>}
                </div>

                {/* Status pill (90px) — instead of priority for subtasks */}
                <div className="w-[90px] shrink-0 px-2 hidden md:block">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${subStatusPill(subDone ? "Completed" : (sub as any).status || "Not Started")}`}>
                    {subDone ? "Completed" : ((sub as any).status || "Not Started")}
                  </span>
                </div>

                {/* Progress (130px) */}
                <div className="w-[130px] shrink-0 px-2 hidden lg:block">
                  <div className="flex items-center gap-2">
                    <Progress
                      value={subProg}
                      className={`h-1 flex-1 ${subDone ? "[&>div]:bg-emerald-500" : subProg > 0 ? "[&>div]:bg-violet-500" : ""}`}
                    />
                    <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right shrink-0">{subProg}%</span>
                  </div>
                </div>

                {/* Actions (60px) */}
                <div className="w-[60px] shrink-0 flex items-center justify-end gap-0.5 pr-3 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                  {canEdit && (
                    <>
                      <button
                        onClick={() => { setEditSubId(sub.id); setEditSubForm({ title: sub.title, owner: (sub as any).owner || "", dueDate: (sub as any).dueDate || "", status: sub.status, progress: subProg }); }}
                        className="p-1 text-muted-foreground hover:text-primary transition-colors"
                        data-testid={`button-edit-subtask-${sub.id}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => deleteSubtask.mutate(sub.id)}
                        className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                        data-testid={`button-delete-subtask-${sub.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add task form */}
          {canEdit && (
            showSubtaskForm ? (
              <div className="pl-14 pr-4 py-3 border-b border-border/50 space-y-2 bg-background/50">
                <Input
                  value={subForm.title}
                  onChange={e => setSubForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Task title"
                  className="h-7 text-xs"
                  data-testid={`input-subtask-title-${task.id}`}
                />
                <div className="grid grid-cols-2 gap-2">
                  {teamMembers.length > 0 ? (
                    <Select value={subForm.owner || "none"} onValueChange={v => setSubForm(f => ({ ...f, owner: v === "none" ? "" : v }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Owner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No owner</SelectItem>
                        {teamMembers.map(m => <SelectItem key={m.id} value={m.name} className="text-xs">{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={subForm.owner} onChange={e => setSubForm(f => ({ ...f, owner: e.target.value }))} placeholder="Owner" className="h-7 text-xs" />
                  )}
                  <Input type="date" value={subForm.dueDate} onChange={e => setSubForm(f => ({ ...f, dueDate: e.target.value }))} className="h-7 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={subForm.status} onValueChange={v => setSubForm(f => ({ ...f, status: v, progress: v === "Completed" ? 100 : v === "Not Started" ? 0 : f.progress }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number" min={0} max={100}
                      value={subForm.progress}
                      onChange={e => {
                        const pct = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setSubForm(f => ({ ...f, progress: pct, status: subProgressToStatus(pct) }));
                      }}
                      className="h-7 text-xs w-16"
                      data-testid={`input-subtask-progress-${task.id}`}
                      placeholder="%"
                    />
                    <span className="text-[10px] text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={() => { if (subForm.title.trim()) addSubtask.mutate(subForm); }} disabled={!subForm.title.trim() || addSubtask.isPending} data-testid={`button-save-subtask-${task.id}`}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowSubtaskForm(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="pl-14 py-2 border-b border-border/30">
                <button
                  className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  onClick={() => { setShowSubtaskForm(true); }}
                  data-testid={`button-add-subtask-${task.id}`}
                >
                  <Plus className="h-3 w-3" /> Add Task
                </button>
              </div>
            )
          )}

          {/* Attachments section */}
          <div className="pl-14 pr-4 py-3 border-t border-border/40">
            <DocumentAttachments entityType="task" entityId={task.id} />
          </div>
        </div>
      )}

      {/* Edit Task (Subtask) Dialog */}
      <Dialog open={editSubId !== null} onOpenChange={open => { if (!open) setEditSubId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={editSubForm.title} onChange={e => setEditSubForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" data-testid="input-edit-subtask-title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Owner</Label>
                {teamMembers.length > 0 ? (
                  <Select value={editSubForm.owner || "none"} onValueChange={v => setEditSubForm(f => ({ ...f, owner: v === "none" ? "" : v }))}>
                    <SelectTrigger className="text-xs" data-testid="select-edit-subtask-owner"><SelectValue placeholder="No owner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No owner</SelectItem>
                      {teamMembers.map(m => <SelectItem key={m.id} value={m.name} className="text-xs">{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={editSubForm.owner} onChange={e => setEditSubForm(f => ({ ...f, owner: e.target.value }))} placeholder="Owner" data-testid="input-edit-subtask-owner" />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={editSubForm.dueDate} onChange={e => setEditSubForm(f => ({ ...f, dueDate: e.target.value }))} data-testid="input-edit-subtask-due" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editSubForm.status} onValueChange={v => setEditSubForm(f => ({ ...f, status: v, progress: v === "Completed" ? 100 : v === "Not Started" ? 0 : f.progress }))}>
                <SelectTrigger data-testid="select-edit-subtask-status"><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>% Completion</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number" min={0} max={100}
                  value={editSubForm.progress}
                  onChange={e => {
                    const pct = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                    setEditSubForm(f => ({ ...f, progress: pct, status: subProgressToStatus(pct) }));
                  }}
                  className="w-24"
                  data-testid="input-edit-subtask-progress"
                />
                <Progress value={editSubForm.progress} className={`flex-1 h-2 ${editSubForm.progress >= 100 ? "[&>div]:bg-emerald-500" : editSubForm.progress > 0 ? "[&>div]:bg-violet-500" : ""}`} />
                <span className="text-xs text-muted-foreground w-10 text-right">{editSubForm.progress}%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSubId(null)}>Cancel</Button>
            <Button
              onClick={() => { if (editSubId && editSubForm.title.trim()) updateSubtask.mutate({ id: editSubId, data: editSubForm }); }}
              disabled={!editSubForm.title.trim() || updateSubtask.isPending}
              data-testid="button-submit-edit-subtask"
            >
              {updateSubtask.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MilestoneCalendar({ milestones }: { milestones: Milestone[] }) {
  const today = new Date();
  const year = today.getFullYear();
  const currentMonth = today.getMonth();

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, currentMonth + i, 1);
    return {
      label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    };
  });

  const grouped: Record<string, Milestone[]> = {};
  for (const m of milestones) {
    if (!m.dueDate) continue;
    const key = m.dueDate.substring(0, 7);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }

  const msBorderColor = (s: string) => {
    if (s === "Completed") return "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20";
    if (s === "Overdue") return "border-red-400 bg-red-50 dark:bg-red-900/20";
    if (s === "In Progress") return "border-violet-400 bg-violet-50 dark:bg-violet-900/20";
    return "border-primary/40 bg-primary/5";
  };

  return (
    <div className="space-y-3">
      {months.map(m => {
        const msList = grouped[m.key] || [];
        return (
          <div key={m.key} className={msList.length === 0 ? "opacity-50" : ""}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20 shrink-0">{m.label}</span>
              <div className="flex-1 h-px bg-border" />
              {msList.length > 0 && <span className="text-[10px] text-muted-foreground">{msList.length} milestone{msList.length !== 1 ? "s" : ""}</span>}
            </div>
            {msList.length > 0 ? (
              <div className="space-y-1.5 pl-4">
                {msList.map(ms => (
                  <div key={ms.id} className={`border-l-2 pl-3 py-1.5 rounded-r-lg ${msBorderColor(ms.status)}`} data-testid={`calendar-milestone-${ms.id}`}>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-xs font-medium">{ms.title}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{formatDate(ms.dueDate)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${statusPill(ms.status)}`}>{ms.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pl-4">
                <p className="text-xs text-muted-foreground italic">No milestones this month</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ProjectDetailPage() {
  const [location] = useLocation();
  const idMatch = location.match(/\/(?:projects|initiatives)\/(\d+)/);
  const projectId = parseInt(idMatch?.[1] ?? "0");
  const { canEdit, user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [taskView, setTaskView] = useState<"list" | "kanban" | "calendar">("list");
  const [taskCalMonth, setTaskCalMonth] = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });
  const [taskDragId, setTaskDragId] = useState<number | null>(null);
  const [taskDragOverCol, setTaskDragOverCol] = useState<string | null>(null);
  const [milestoneView, setMilestoneView] = useState<"list" | "calendar">("list");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [editTaskId, setEditTaskId] = useState<number | null>(null);
  const [editTaskForm, setEditTaskForm] = useState({ title: "", description: "", owner: "", dueDate: "", status: "Not Started", priority: "Medium", progress: 0 });
  const [editMilestoneId, setEditMilestoneId] = useState<number | null>(null);
  const [editMsForm, setEditMsForm] = useState({ title: "", dueDate: "", status: "Upcoming", progress: 0 });
  const [comment, setComment] = useState("");

  const [taskForm, setTaskForm] = useState({
    title: "", description: "", owner: "", dueDate: "",
    status: "Not Started", priority: "Medium", progress: 0,
  });

  const progressToStatus = (pct: number) => {
    if (pct >= 100) return "Completed";
    if (pct > 0) return "In Progress";
    return "Not Started";
  };
  const msProgressToStatus = (pct: number) => {
    if (pct >= 100) return "Completed";
    if (pct > 0) return "In Progress";
    return "Upcoming";
  };
  const [msForm, setMsForm] = useState({
    title: "", dueDate: "", status: "Upcoming", progress: 0,
  });
  const [editForm, setEditForm] = useState<Partial<Project & { strategicGoal?: string; riskNotes?: string }>>({});

  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: teamMembers = [] } = useQuery<TeamMember[]>({ queryKey: ["/api/team-members"] });

  const { data: project, isLoading } = useQuery<ProjectDetail>({
    queryKey: ["/api/projects", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<TaskWithSubtasks[]>({
    queryKey: ["/api/projects", projectId, "tasks"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/tasks`, { credentials: "include" });
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: ["/api/projects", projectId, "milestones"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/milestones`, { credentials: "include" });
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: comments = [] } = useQuery<ProjectComment[]>({
    queryKey: ["/api/comments", "project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/comments/project/${projectId}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!projectId,
  });

  const createTaskMut = useMutation({
    mutationFn: (data: typeof taskForm) =>
      apiRequest("POST", "/api/tasks", { ...data, projectId, companyId: project?.companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowTaskForm(false);
      setTaskForm({ title: "", description: "", owner: "", dueDate: "", status: "Not Started", priority: "Medium", progress: 0 });
      toast({ title: "Initiative created" });
    },
    onError: () => toast({ title: "Failed to create initiative", variant: "destructive" }),
  });

  const updateTaskMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) =>
      apiRequest("PATCH", `/api/tasks/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      if (variables.data.title !== undefined) {
        setEditTaskId(null);
        toast({ title: "Initiative updated" });
      }
    },
    onError: () => toast({ title: "Failed to update initiative", variant: "destructive" }),
  });

  const deleteTaskMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Initiative deleted" });
    },
  });

  const createMsMut = useMutation({
    mutationFn: (data: typeof msForm) =>
      apiRequest("POST", "/api/milestones", { ...data, projectId, companyId: project?.companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "milestones"] });
      setShowMilestoneForm(false);
      setMsForm({ title: "", dueDate: "", status: "Upcoming", progress: 0 });
      toast({ title: "Milestone created" });
    },
    onError: () => toast({ title: "Failed to create milestone", variant: "destructive" }),
  });

  const updateMsMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Milestone> }) =>
      apiRequest("PATCH", `/api/milestones/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "milestones"] }),
  });

  const deleteMsMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/milestones/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "milestones"] }),
  });

  const updateProjectMut = useMutation({
    mutationFn: (data: typeof editForm) => apiRequest("PATCH", `/api/projects/${projectId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowEditProject(false);
      toast({ title: "Project updated" });
    },
    onError: () => toast({ title: "Failed to update project", variant: "destructive" }),
  });

  const addCommentMut = useMutation({
    mutationFn: (content: string) =>
      apiRequest("POST", `/api/comments/project/${projectId}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", "project", projectId] });
      setComment("");
      toast({ title: "Comment added" });
    },
    onError: () => toast({ title: "Failed to add comment", variant: "destructive" }),
  });

  const deleteCommentMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/comments/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/comments", "project", projectId] }),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Project not found.</p>
        <Link href="/projects"><Button variant="outline" className="mt-4">Back to Projects</Button></Link>
      </div>
    );
  }

  const byStatus = (s: string) => tasks.filter(t => t.status === s);
  const completedCount = tasks.filter(t => t.status === "Completed").length;
  const ep = project as any;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb" data-testid="breadcrumb-project">
        <Link href="/projects">
          <span className="hover:text-foreground transition-colors cursor-pointer flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Projects
          </span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        <span className="text-foreground font-medium truncate max-w-[300px]" data-testid="breadcrumb-project-name">{project.name}</span>
      </nav>

      {/* Initiative Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold" data-testid="text-project-detail-name">{project.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusPill(project.status)}`}>{project.status}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${healthBadge(project.health)}`}>● {project.health}</span>
            <span className={`text-xs font-semibold ${priorityColor(project.priority)}`}>{project.priority}</span>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{project.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
            {project.owner && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {project.owner}</span>}
            {project.businessUnit && <span className="flex items-center gap-1"><Flag className="h-3 w-3" /> {project.businessUnit}</span>}
            {ep.strategicGoal && <span className="flex items-center gap-1"><Target className="h-3 w-3" /> {ep.strategicGoal}</span>}
            {project.startDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Start: {formatDate(project.startDate)}</span>}
            {project.dueDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Due: {formatDate(project.dueDate)}</span>}
          </div>
          {ep.riskNotes && (
            <div className="mt-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-400 max-w-2xl">
              <span className="font-semibold">Risk: </span>{ep.riskNotes}
            </div>
          )}
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => { setEditForm(project as any); setShowEditProject(true); }}
            data-testid="button-edit-project">
            <Edit3 className="h-4 w-4 mr-1.5" /> Edit
          </Button>
        )}
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{project.progress ?? 0}%</p>
              <p className="text-xs text-muted-foreground">Overall Progress</p>
              <Progress value={project.progress ?? 0} className="h-1 mt-1" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tasks.length}</p>
              <p className="text-xs text-muted-foreground">Total Initiatives</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{milestones.length}</p>
              <p className="text-xs text-muted-foreground">Milestones</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-project-detail">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="initiatives" data-testid="tab-initiatives">Initiatives ({tasks.length})</TabsTrigger>
          <TabsTrigger value="milestones" data-testid="tab-milestones">Milestones ({milestones.length})</TabsTrigger>
          <TabsTrigger value="comments" data-testid="tab-comments">Comments ({comments.length})</TabsTrigger>
          <TabsTrigger value="attachments" data-testid="tab-attachments" className="flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5" /> Attachments
          </TabsTrigger>
        </TabsList>

        {/* ─ Overview ─ */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">Initiative Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {TASK_STATUSES.map(s => {
                  const count = tasks.filter(t => t.status === s).length;
                  const pct = tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0;
                  return (
                    <div key={s} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{s}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">Upcoming Milestones</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {milestones.filter(m => m.status !== "Completed").slice(0, 4).map(m => (
                  <div key={m.id} className="flex items-center gap-2 text-xs" data-testid={`row-milestone-overview-${m.id}`}>
                    <Circle className="h-2 w-2 shrink-0 text-primary" />
                    <span className="flex-1 truncate">{m.title}</span>
                    {m.dueDate && <span className="text-muted-foreground shrink-0">{formatDate(m.dueDate)}</span>}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusPill(m.status)}`}>{m.status}</span>
                  </div>
                ))}
                {milestones.filter(m => m.status !== "Completed").length === 0 && (
                  <p className="text-sm text-muted-foreground">No upcoming milestones</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─ Initiatives ─ */}
        <TabsContent value="initiatives" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 gap-0.5">
              {([
                { mode: "list", icon: List, label: "List" },
                { mode: "kanban", icon: Kanban, label: "Kanban" },
                { mode: "calendar", icon: Calendar, label: "Calendar" },
              ] as const).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setTaskView(mode)}
                  data-testid={`button-task-view-${mode}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    taskView === mode
                      ? "bg-background text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            {canEdit && (
              <Button size="sm" onClick={() => setShowTaskForm(true)} data-testid="button-add-task">
                <Plus className="h-4 w-4 mr-1" /> Add Initiative
              </Button>
            )}
          </div>

          {tasksLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
          ) : tasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Target className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No initiatives yet</p>
                  <p className="text-sm text-muted-foreground">{canEdit ? "Add initiatives to start tracking project progress." : "No initiatives have been added yet."}</p>
                </div>
                {canEdit && <Button size="sm" onClick={() => setShowTaskForm(true)}><Plus className="h-4 w-4 mr-1" /> Add First Initiative</Button>}
              </CardContent>
            </Card>
          ) : taskView === "list" ? (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center bg-muted/50 border-b text-xs font-medium text-muted-foreground select-none">
                <div className="w-7 shrink-0" />
                <div className="w-7 shrink-0" />
                <div className="flex-1 px-3 py-2.5">Initiative</div>
                <div className="w-[145px] shrink-0 px-2 py-2.5 hidden sm:block">Owner</div>
                <div className="w-[105px] shrink-0 px-2 py-2.5 hidden md:block">Due Date</div>
                <div className="w-[90px] shrink-0 px-2 py-2.5 hidden md:block">Priority</div>
                <div className="w-[130px] shrink-0 px-2 py-2.5 hidden lg:block">Progress</div>
                <div className="w-[60px] shrink-0" />
              </div>
              {tasks.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  canEdit={canEdit}
                  teamMembers={teamMembers}
                  onStatusChange={(id, status) => updateTaskMut.mutate({ id, data: { status, progress: status === "Completed" ? 100 : status === "Not Started" ? 0 : undefined } })}
                  onDelete={id => deleteTaskMut.mutate(id)}
                  onEdit={t => { setEditTaskId(t.id); setEditTaskForm({ title: t.title, description: (t as any).description || "", owner: (t as any).owner || t.assignee || "", dueDate: t.dueDate || "", status: t.status, priority: t.priority, progress: t.progress ?? 0 }); }}
                />
              ))}
              {canEdit && (
                <div className="flex items-center px-4 py-2.5 border-t border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                  <button className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors" onClick={() => setShowTaskForm(true)} data-testid="button-add-task-inline">
                    <Plus className="h-3.5 w-3.5" /> Add Initiative
                  </button>
                </div>
              )}
            </div>
          ) : taskView === "kanban" ? (
            <div className="flex gap-4 min-h-[400px] overflow-x-auto pb-4" data-testid="task-kanban">
              {TASK_STATUSES.map(col => {
                const colTopColors: Record<string, string> = {
                  "Not Started": "border-t-slate-400",
                  "In Progress": "border-t-violet-500",
                  "At Risk": "border-t-red-500",
                  "Completed": "border-t-emerald-500",
                };
                const colDotColors: Record<string, string> = {
                  "Not Started": "bg-slate-400",
                  "In Progress": "bg-violet-500",
                  "At Risk": "bg-red-500",
                  "Completed": "bg-emerald-500",
                };
                const colItems = byStatus(col);
                const isDragOver = taskDragOverCol === col;
                return (
                  <div
                    key={col}
                    className={`flex flex-col min-w-[240px] w-[240px] rounded-xl border-t-4 ${colTopColors[col] || "border-t-slate-400"} bg-muted/30 border transition-colors ${isDragOver ? "bg-primary/5 border-primary/30" : ""}`}
                    onDragOver={e => { e.preventDefault(); setTaskDragOverCol(col); }}
                    onDragLeave={() => setTaskDragOverCol(null)}
                    onDrop={e => {
                      e.preventDefault();
                      setTaskDragOverCol(null);
                      if (taskDragId !== null) {
                        const item = tasks.find(t => t.id === taskDragId);
                        if (item && item.status !== col) {
                          updateTaskMut.mutate({ id: taskDragId, data: { status: col, progress: col === "Completed" ? 100 : col === "Not Started" ? 0 : undefined } });
                        }
                        setTaskDragId(null);
                      }
                    }}
                    data-testid={`task-kanban-col-${col.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${colDotColors[col] || "bg-slate-400"}`} />
                        <span className="text-xs font-semibold">{col}</span>
                      </div>
                      <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded-full border">{colItems.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {colItems.length === 0 && (
                        <div className={`flex items-center justify-center h-16 rounded-lg border-2 border-dashed text-xs text-muted-foreground transition-colors ${isDragOver ? "border-primary/40 text-primary/60" : "border-border/40"}`}>
                          Drop here
                        </div>
                      )}
                      {colItems.map(t => {
                        const tOwner = (t as any).owner || t.assignee;
                        const today = new Date().toISOString().split("T")[0];
                        const isOverdue = t.dueDate && t.dueDate < today && t.status !== "Completed";
                        const computedProgress = t.subtasks?.length > 0
                          ? Math.round(t.subtasks.reduce((sum: number, s: any) => sum + (s.progress ?? (s.completed ? 100 : 0)), 0) / t.subtasks.length)
                          : (t.progress ?? 0);
                        return (
                          <div
                            key={t.id}
                            draggable
                            onDragStart={() => setTaskDragId(t.id)}
                            onDragEnd={() => { setTaskDragId(null); setTaskDragOverCol(null); }}
                            className={`bg-background rounded-lg border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all select-none ${taskDragId === t.id ? "opacity-40 scale-95" : ""} ${isOverdue ? "border-red-300 dark:border-red-800" : ""}`}
                            data-testid={`task-kanban-card-${t.id}`}
                          >
                            <div className="flex items-start gap-1.5 mb-2">
                              {isOverdue && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />}
                              <p className="text-sm font-medium leading-snug line-clamp-2">{t.title}</p>
                            </div>
                            <div className="flex items-center flex-wrap gap-1 mb-2">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${priorityBg(t.priority)}`}>{t.priority}</span>
                            </div>
                            {computedProgress > 0 && (
                              <div className="mb-2">
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${computedProgress === 100 ? "bg-emerald-500" : "bg-violet-500"}`} style={{ width: `${computedProgress}%` }} />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{computedProgress}%</p>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                              {tOwner ? (
                                <div className="flex items-center gap-1">
                                  <div className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold shrink-0">
                                    {tOwner.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                                  </div>
                                  <span className="truncate max-w-[80px]">{tOwner}</span>
                                </div>
                              ) : <span />}
                              {t.dueDate && (
                                <span className={`shrink-0 ${isOverdue ? "text-red-500 font-semibold" : ""}`}>{formatDate(t.dueDate)}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (() => {
            // Calendar view for initiatives
            const year = taskCalMonth.getFullYear();
            const month = taskCalMonth.getMonth();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = new Date().toISOString().split("T")[0];
            const monthLabel = taskCalMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

            const tasksByDate: Record<string, TaskWithSubtasks[]> = {};
            for (const t of tasks) {
              const d = t.dueDate;
              if (d) { tasksByDate[d] = [...(tasksByDate[d] || []), t]; }
            }
            const cells = Array.from({ length: firstDay }, () => null as null)
              .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

            return (
              <div data-testid="task-calendar">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setTaskCalMonth(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted/50 transition-colors"
                    data-testid="button-task-cal-prev"
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </button>
                  <h2 className="text-base font-bold">{monthLabel}</h2>
                  <button
                    onClick={() => setTaskCalMonth(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted/50 transition-colors"
                    data-testid="button-task-cal-next"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                    <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} />;
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const dayTasks = tasksByDate[dateStr] || [];
                    const isToday = dateStr === today;
                    const isPast = dateStr < today;
                    return (
                      <div
                        key={dateStr}
                        className={`min-h-[80px] rounded-lg border p-1.5 transition-colors ${isToday ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border/60 hover:border-border bg-background"}`}
                        data-testid={`task-cal-day-${dateStr}`}
                      >
                        <p className={`text-[11px] font-semibold mb-1 ${isToday ? "text-primary" : isPast ? "text-muted-foreground" : "text-foreground"}`}>{day}</p>
                        <div className="space-y-0.5">
                          {dayTasks.slice(0, 3).map(t => (
                            <div key={t.id} title={t.title} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${t.status === "Completed" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : t.status === "At Risk" ? "bg-red-500/10 text-red-700 dark:text-red-400" : "bg-violet-500/10 text-violet-700 dark:text-violet-400"}`} data-testid={`task-cal-item-${t.id}`}>
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(t.status)}`} />
                              <span className="truncate">{t.title}</span>
                            </div>
                          ))}
                          {dayTasks.length > 3 && <p className="text-[10px] text-muted-foreground pl-1">+{dayTasks.length - 3} more</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </TabsContent>

        {/* ─ Milestones ─ */}
        <TabsContent value="milestones" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 gap-0.5">
              {([
                { mode: "list", icon: LayoutList, label: "List" },
                { mode: "calendar", icon: CalendarDays, label: "Calendar" },
              ] as const).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setMilestoneView(mode as "list" | "calendar")}
                  data-testid={`button-milestone-${mode}-view`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    milestoneView === mode
                      ? "bg-background text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            {canEdit && (
              <Button size="sm" onClick={() => setShowMilestoneForm(true)} data-testid="button-add-milestone">
                <Plus className="h-4 w-4 mr-1" /> Add Milestone
              </Button>
            )}
          </div>

          {milestones.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Flag className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No milestones yet</p>
                  <p className="text-sm text-muted-foreground">{canEdit ? "Add milestones to track key initiative checkpoints." : "No milestones have been added."}</p>
                </div>
              </CardContent>
            </Card>
          ) : milestoneView === "calendar" ? (
            <Card>
              <CardContent className="p-5">
                <MilestoneCalendar milestones={milestones} />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {milestones.map(m => (
                <Card key={m.id} data-testid={`card-milestone-${m.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${m.status === "Completed" ? "bg-emerald-500" : m.status === "Overdue" ? "bg-red-500" : "bg-primary"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{m.title}</span>
                          {canEdit ? (
                            <Select
                              value={m.status}
                              onValueChange={v => updateMsMut.mutate({ id: m.id, data: { status: v } })}
                            >
                              <SelectTrigger className="h-6 text-[11px] w-auto px-2 py-0" data-testid={`select-milestone-status-${m.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MILESTONE_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusPill(m.status)}`}>{m.status}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                          {m.dueDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(m.dueDate)}</span>}
                        </div>
                        {typeof m.progress === "number" && (m.progress > 0 || m.status === "Completed") && (
                          <div className="mt-2 space-y-1">
                            <Progress value={m.status === "Completed" ? 100 : m.progress} className="h-1" />
                            <p className="text-[10px] text-muted-foreground">{m.status === "Completed" ? 100 : m.progress}% complete</p>
                          </div>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { setEditMilestoneId(m.id); setEditMsForm({ title: m.title, dueDate: m.dueDate || "", status: m.status, progress: m.progress ?? 0 }); }}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            data-testid={`button-edit-milestone-${m.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteMsMut.mutate(m.id)}
                            className="text-muted-foreground hover:text-red-500 transition-colors"
                            data-testid={`button-delete-milestone-${m.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─ Comments ─ */}
        <TabsContent value="comments" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                data-testid="input-comment"
              />
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  onClick={() => { if (comment.trim()) addCommentMut.mutate(comment.trim()); }}
                  disabled={!comment.trim() || addCommentMut.isPending}
                  data-testid="button-submit-comment"
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  {addCommentMut.isPending ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {comments.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground gap-2">
              <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
              No comments yet. Be the first to comment.
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {comments.map(c => (
                <Card key={c.id} data-testid={`card-comment-${c.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                        {c.userName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{c.userName}</span>
                          <span className="text-xs text-muted-foreground capitalize">{c.userRole}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm mt-1 text-foreground/90">{c.content}</p>
                      </div>
                      {(canEdit || user?.id === c.userId) && (
                        <button
                          onClick={() => deleteCommentMut.mutate(c.id)}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                          data-testid={`button-delete-comment-${c.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─ Attachments ─ */}
        <TabsContent value="attachments" className="mt-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Project Attachments</h3>
                <p className="text-xs text-muted-foreground">Upload and manage files for this project</p>
              </div>
              <DocumentAttachments entityType="project" entityId={project!.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Initiative Dialog */}
      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Initiative</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Initiative title" data-testid="input-task-title" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Owner</Label>
                {teamMembers.length > 0 ? (
                  <Select value={taskForm.owner || "none"} onValueChange={v => setTaskForm(f => ({ ...f, owner: v === "none" ? "" : v }))}>
                    <SelectTrigger data-testid="select-task-owner"><SelectValue placeholder="Select owner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No owner</SelectItem>
                      {teamMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}{m.jobTitle ? ` — ${m.jobTitle}` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={taskForm.owner} onChange={e => setTaskForm(f => ({ ...f, owner: e.target.value }))}
                    placeholder="Name" data-testid="input-task-owner" />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} data-testid="input-task-due" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={taskForm.status} onValueChange={v => setTaskForm(f => ({ ...f, status: v, progress: v === "Completed" ? 100 : v === "Not Started" ? 0 : f.progress }))}>
                  <SelectTrigger data-testid="select-task-status-new"><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger data-testid="select-task-priority-new"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Critical","High","Medium","Low"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>% Completion</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number" min={0} max={100}
                  value={taskForm.progress}
                  onChange={e => {
                    const pct = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                    setTaskForm(f => ({ ...f, progress: pct, status: progressToStatus(pct) }));
                  }}
                  className="w-24"
                  data-testid="input-task-progress-new"
                />
                <Progress value={taskForm.progress} className="flex-1 h-2" />
                <span className="text-xs text-muted-foreground w-10 text-right">{taskForm.progress}%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskForm(false)}>Cancel</Button>
            <Button onClick={() => createTaskMut.mutate(taskForm)} disabled={!taskForm.title || createTaskMut.isPending} data-testid="button-submit-task">
              {createTaskMut.isPending ? "Creating..." : "Create Initiative"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Initiative Dialog */}
      <Dialog open={editTaskId !== null} onOpenChange={open => { if (!open) setEditTaskId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Initiative</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={editTaskForm.title} onChange={e => setEditTaskForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Initiative title" data-testid="input-edit-task-title" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={editTaskForm.description} onChange={e => setEditTaskForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Owner</Label>
                {teamMembers.length > 0 ? (
                  <Select value={editTaskForm.owner || "none"} onValueChange={v => setEditTaskForm(f => ({ ...f, owner: v === "none" ? "" : v }))}>
                    <SelectTrigger data-testid="select-edit-task-owner"><SelectValue placeholder="Select owner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No owner</SelectItem>
                      {teamMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}{m.jobTitle ? ` — ${m.jobTitle}` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={editTaskForm.owner} onChange={e => setEditTaskForm(f => ({ ...f, owner: e.target.value }))}
                    placeholder="Name" data-testid="input-edit-task-owner" />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={editTaskForm.dueDate} onChange={e => setEditTaskForm(f => ({ ...f, dueDate: e.target.value }))} data-testid="input-edit-task-due" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editTaskForm.status} onValueChange={v => setEditTaskForm(f => ({ ...f, status: v, progress: v === "Completed" ? 100 : v === "Not Started" ? 0 : f.progress }))}>
                  <SelectTrigger data-testid="select-edit-task-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={editTaskForm.priority} onValueChange={v => setEditTaskForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger data-testid="select-edit-task-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Critical","High","Medium","Low"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {(() => {
              const editingTask = tasks.find(t => t.id === editTaskId);
              const hasSubs = (editingTask?.subtasks?.length ?? 0) > 0;
              const autoProgress = hasSubs && editingTask
                ? Math.round(editingTask.subtasks.reduce((sum, s) => sum + ((s as any).progress ?? (s.completed ? 100 : 0)), 0) / editingTask.subtasks.length)
                : editTaskForm.progress;
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>% Completion</Label>
                    {hasSubs && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Auto-calculated from tasks</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {hasSubs ? (
                      <span className="text-sm font-semibold w-24 text-center tabular-nums" data-testid="text-auto-progress">{autoProgress}%</span>
                    ) : (
                      <Input
                        type="number" min={0} max={100}
                        value={editTaskForm.progress}
                        onChange={e => {
                          const pct = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                          setEditTaskForm(f => ({ ...f, progress: pct, status: progressToStatus(pct) }));
                        }}
                        className="w-24"
                        data-testid="input-edit-task-progress"
                      />
                    )}
                    <Progress value={autoProgress} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground w-10 text-right">{autoProgress}%</span>
                  </div>
                  {hasSubs && <p className="text-[10px] text-muted-foreground">Update task completion percentages below to change this value.</p>}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTaskId(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (editTaskId && editTaskForm.title.trim()) {
                  const editingTask = tasks.find(t => t.id === editTaskId);
                  const hasSubs = (editingTask?.subtasks?.length ?? 0) > 0;
                  const saveData = hasSubs ? { ...editTaskForm, assignee: editTaskForm.owner } : { ...editTaskForm, assignee: editTaskForm.owner };
                  updateTaskMut.mutate({ id: editTaskId, data: saveData });
                }
              }}
              disabled={!editTaskForm.title.trim() || updateTaskMut.isPending}
              data-testid="button-submit-edit-task"
            >
              {updateTaskMut.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Milestone Dialog */}
      <Dialog open={showMilestoneForm} onOpenChange={setShowMilestoneForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Milestone</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={msForm.title} onChange={e => setMsForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Milestone title" data-testid="input-milestone-title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={msForm.dueDate} onChange={e => setMsForm(f => ({ ...f, dueDate: e.target.value }))} data-testid="input-milestone-due" />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={msForm.status} onValueChange={v => setMsForm(f => ({ ...f, status: v, progress: v === "Completed" ? 100 : f.progress }))}>
                  <SelectTrigger data-testid="select-milestone-status-new"><SelectValue /></SelectTrigger>
                  <SelectContent>{MILESTONE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>% Completion</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number" min={0} max={100}
                  value={msForm.progress}
                  onChange={e => {
                    const pct = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                    setMsForm(f => ({ ...f, progress: pct, status: msProgressToStatus(pct) }));
                  }}
                  className="w-24"
                  data-testid="input-milestone-progress-new"
                />
                <Progress value={msForm.progress} className="flex-1 h-2" />
                <span className="text-xs text-muted-foreground w-10 text-right">{msForm.progress}%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMilestoneForm(false)}>Cancel</Button>
            <Button onClick={() => createMsMut.mutate(msForm)} disabled={!msForm.title || createMsMut.isPending} data-testid="button-submit-milestone">
              {createMsMut.isPending ? "Creating..." : "Create Milestone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Milestone Dialog */}
      <Dialog open={editMilestoneId !== null} onOpenChange={open => { if (!open) setEditMilestoneId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Milestone</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={editMsForm.title} onChange={e => setEditMsForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Milestone title" data-testid="input-edit-milestone-title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={editMsForm.dueDate} onChange={e => setEditMsForm(f => ({ ...f, dueDate: e.target.value }))} data-testid="input-edit-milestone-due" />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editMsForm.status} onValueChange={v => setEditMsForm(f => ({ ...f, status: v, progress: v === "Completed" ? 100 : f.progress }))}>
                  <SelectTrigger data-testid="select-edit-milestone-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{MILESTONE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>% Completion</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number" min={0} max={100}
                  value={editMsForm.progress}
                  onChange={e => {
                    const pct = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                    setEditMsForm(f => ({ ...f, progress: pct, status: msProgressToStatus(pct) }));
                  }}
                  className="w-24"
                  data-testid="input-edit-milestone-progress"
                />
                <Progress value={editMsForm.progress} className="flex-1 h-2" />
                <span className="text-xs text-muted-foreground w-10 text-right">{editMsForm.progress}%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMilestoneId(null)}>Cancel</Button>
            <Button
              onClick={() => { if (editMilestoneId && editMsForm.title.trim()) { updateMsMut.mutate({ id: editMilestoneId, data: editMsForm }); setEditMilestoneId(null); } }}
              disabled={!editMsForm.title.trim() || updateMsMut.isPending}
              data-testid="button-submit-edit-milestone"
            >
              {updateMsMut.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={showEditProject} onOpenChange={setShowEditProject}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Project Name</Label>
              <Input value={editForm.name ?? ""} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} data-testid="input-edit-project-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={editForm.description ?? ""} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Strategic Goal</Label>
              <Input value={(editForm as any).strategicGoal ?? ""} onChange={e => setEditForm(f => ({ ...f, strategicGoal: e.target.value }))} placeholder="e.g. Increase Revenue by 20%" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Owner</Label>
                {teamMembers.length > 0 ? (
                  <Select value={editForm.owner || "none"} onValueChange={v => setEditForm(f => ({ ...f, owner: v === "none" ? "" : v }))}>
                    <SelectTrigger data-testid="select-edit-project-owner"><SelectValue placeholder="Select owner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No owner</SelectItem>
                      {teamMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}{m.jobTitle ? ` — ${m.jobTitle}` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={editForm.owner ?? ""} onChange={e => setEditForm(f => ({ ...f, owner: e.target.value }))} data-testid="input-edit-owner" />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Business Unit / Dept</Label>
                <Select value={editForm.businessUnit || "none"} onValueChange={v => setEditForm(f => ({ ...f, businessUnit: v === "none" ? "" : v }))}>
                  <SelectTrigger data-testid="select-edit-project-bu"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={editForm.startDate ?? ""} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={editForm.dueDate ?? ""} onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.status ?? "Not Started"} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Not Started","In Progress","At Risk","Delayed","Completed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={editForm.priority ?? "Medium"} onValueChange={v => setEditForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Critical","High","Medium","Low"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Progress (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={editForm.progress ?? 0}
                onChange={e => setEditForm(f => ({ ...f, progress: parseInt(e.target.value) || 0 }))}
                data-testid="input-edit-progress"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Risk Notes</Label>
              <Textarea value={(editForm as any).riskNotes ?? ""} onChange={e => setEditForm(f => ({ ...f, riskNotes: e.target.value }))} rows={2} placeholder="Any known risks or blockers?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProject(false)}>Cancel</Button>
            <Button onClick={() => updateProjectMut.mutate(editForm)} disabled={updateProjectMut.isPending} data-testid="button-save-edit-project">
              {updateProjectMut.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
