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
  LayoutList, LayoutGrid, Circle, CalendarDays,
} from "lucide-react";
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

function priorityBorderColor(p: string) {
  if (p === "Critical") return "border-l-red-500";
  if (p === "High") return "border-l-orange-500";
  if (p === "Medium") return "border-l-blue-500";
  return "border-l-gray-300 dark:border-l-gray-600";
}

function subStatusPill(s: string) {
  if (s === "Completed") return "text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (s === "In Progress") return "text-violet-700 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400";
  if (s === "At Risk") return "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
  return "text-muted-foreground bg-muted";
}

function TaskCard({
  task, isAdmin, onStatusChange, onDelete
}: {
  task: TaskWithSubtasks;
  isAdmin: boolean;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [subForm, setSubForm] = useState({ title: "", owner: "", dueDate: "", status: "Not Started" });

  const toggleSubtask = useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      apiRequest("PATCH", `/api/subtasks/${id}`, { completed, status: completed ? "Completed" : "Not Started" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/projects"] }),
  });

  const addSubtask = useMutation({
    mutationFn: (data: typeof subForm) =>
      apiRequest("POST", `/api/tasks/${task.id}/subtasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setSubForm({ title: "", owner: "", dueDate: "", status: "Not Started" });
      setShowSubtaskForm(false);
    },
  });

  const deleteSubtask = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/subtasks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/projects"] }),
  });

  const doneCount = task.subtasks?.filter(s => s.completed).length || 0;
  const totalSubs = task.subtasks?.length || 0;
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = task.dueDate && task.dueDate < today && task.status !== "Completed";
  const owner = (task as any).owner || task.assignee;

  return (
    <Card className={`border-l-4 ${priorityBorderColor(task.priority)} hover:shadow-sm transition-all`} data-testid={`card-task-${task.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="font-semibold text-sm" data-testid={`text-task-title-${task.id}`}>{task.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${priorityColor(task.priority)}`}>{task.priority}</span>
              {isOverdue && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                </span>
              )}
            </div>
            {task.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{task.description}</p>}
            <div className="flex items-center gap-3 flex-wrap">
              {isAdmin ? (
                <Select value={task.status} onValueChange={v => onStatusChange(task.id, v)}>
                  <SelectTrigger className="h-6 text-[11px] w-auto px-2 py-0" data-testid={`select-task-status-${task.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusPill(task.status)}`}>{task.status}</span>
              )}
              {owner && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> {owner}
                </span>
              )}
              {task.dueDate && (
                <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                  <Calendar className="h-3 w-3" /> {formatDate(task.dueDate)}
                </span>
              )}
              <button
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors ml-auto"
                onClick={() => setExpanded(!expanded)}
                data-testid={`button-expand-subtasks-${task.id}`}
              >
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {doneCount}/{totalSubs} tasks
              </button>
            </div>

            {/* Subtasks */}
            {expanded && (
              <div className="mt-3 space-y-1.5 pl-3 border-l-2 border-border">
                {task.subtasks.map(sub => (
                  <div key={sub.id} className="flex items-start gap-2 group/sub" data-testid={`row-subtask-${sub.id}`}>
                    <Checkbox
                      checked={sub.completed ?? false}
                      disabled={!isAdmin || toggleSubtask.isPending}
                      onCheckedChange={v => toggleSubtask.mutate({ id: sub.id, completed: !!v })}
                      className="mt-0.5"
                      data-testid={`checkbox-subtask-${sub.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs ${sub.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {sub.title}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {(sub as any).owner && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Users className="h-2.5 w-2.5" /> {(sub as any).owner}
                          </span>
                        )}
                        {(sub as any).dueDate && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Calendar className="h-2.5 w-2.5" /> {formatDate((sub as any).dueDate)}
                          </span>
                        )}
                        {(sub as any).status && (sub as any).status !== "Not Started" && (
                          <span className={`text-[10px] px-1.5 py-0 rounded-full font-medium ${subStatusPill((sub as any).status)}`}>
                            {(sub as any).status}
                          </span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => deleteSubtask.mutate(sub.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover/sub:opacity-100 mt-0.5"
                        data-testid={`button-delete-subtask-${sub.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {isAdmin && (
                  showSubtaskForm ? (
                    <div className="mt-2 space-y-2 pt-2 border-t border-border/50">
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
                          <Input
                            value={subForm.owner}
                            onChange={e => setSubForm(f => ({ ...f, owner: e.target.value }))}
                            placeholder="Owner"
                            className="h-7 text-xs"
                          />
                        )}
                        <Input
                          type="date"
                          value={subForm.dueDate}
                          onChange={e => setSubForm(f => ({ ...f, dueDate: e.target.value }))}
                          className="h-7 text-xs"
                        />
                      </div>
                      <Select value={subForm.status} onValueChange={v => setSubForm(f => ({ ...f, status: v }))}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => { if (subForm.title.trim()) addSubtask.mutate(subForm); }}
                          disabled={!subForm.title.trim() || addSubtask.isPending}
                          data-testid={`button-save-subtask-${task.id}`}
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowSubtaskForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors mt-1"
                      onClick={() => setShowSubtaskForm(true)}
                      data-testid={`button-add-subtask-${task.id}`}
                    >
                      <Plus className="h-3 w-3" /> Add Task
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {isAdmin && (
            <button
              onClick={() => onDelete(task.id)}
              className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
              data-testid={`button-delete-task-${task.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
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
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [boardView, setBoardView] = useState(false);
  const [milestoneView, setMilestoneView] = useState<"list" | "calendar">("list");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [comment, setComment] = useState("");

  const [taskForm, setTaskForm] = useState({
    title: "", description: "", owner: "", dueDate: "",
    status: "Not Started", priority: "Medium",
  });
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
      setTaskForm({ title: "", description: "", owner: "", dueDate: "", status: "Not Started", priority: "Medium" });
      toast({ title: "Initiative created" });
    },
    onError: () => toast({ title: "Failed to create initiative", variant: "destructive" }),
  });

  const updateTaskMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) =>
      apiRequest("PATCH", `/api/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
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
        {isAdmin && (
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
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button
                variant={boardView ? "ghost" : "secondary"} size="sm"
                onClick={() => setBoardView(false)} data-testid="button-list-view"
              >
                <LayoutList className="h-4 w-4 mr-1" /> List
              </Button>
              <Button
                variant={boardView ? "secondary" : "ghost"} size="sm"
                onClick={() => setBoardView(true)} data-testid="button-board-view"
              >
                <LayoutGrid className="h-4 w-4 mr-1" /> Board
              </Button>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowTaskForm(true)} data-testid="button-add-task">
                <Plus className="h-4 w-4 mr-1" /> Add Initiative
              </Button>
            )}
          </div>

          {tasksLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
          ) : !boardView ? (
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Target className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">No initiatives yet</p>
                      <p className="text-sm text-muted-foreground">{isAdmin ? "Add initiatives to start tracking project progress." : "No initiatives have been added yet."}</p>
                    </div>
                    {isAdmin && <Button size="sm" onClick={() => setShowTaskForm(true)}><Plus className="h-4 w-4 mr-1" /> Add First Initiative</Button>}
                  </CardContent>
                </Card>
              ) : tasks.map(t => (
                <TaskCard
                  key={t.id}
                  task={t}
                  isAdmin={isAdmin}
                  onStatusChange={(id, status) => updateTaskMut.mutate({ id, data: { status } })}
                  onDelete={id => deleteTaskMut.mutate(id)}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 overflow-x-auto">
              {TASK_STATUSES.map(s => (
                <div key={s} className="space-y-2">
                  <div className={`text-xs font-semibold px-2 py-1 rounded-md text-center ${statusPill(s)}`}>{s} ({byStatus(s).length})</div>
                  {byStatus(s).map(t => {
                    const tOwner = (t as any).owner || t.assignee;
                    return (
                      <Card key={t.id} className="border" data-testid={`board-task-${t.id}`}>
                        <CardContent className="p-3">
                          <p className="text-xs font-medium leading-tight">{t.title}</p>
                          {tOwner && <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Users className="h-2.5 w-2.5" />{tOwner}</p>}
                          {t.dueDate && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{formatDate(t.dueDate)}</p>}
                        </CardContent>
                      </Card>
                    );
                  })}
                  {byStatus(s).length === 0 && (
                    <div className="border border-dashed border-border rounded-lg py-4 text-center text-xs text-muted-foreground">Empty</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─ Milestones ─ */}
        <TabsContent value="milestones" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={milestoneView === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5"
                onClick={() => setMilestoneView("list")}
                data-testid="button-milestone-list-view"
              >
                <LayoutList className="h-3.5 w-3.5 mr-1" /> List
              </Button>
              <Button
                variant={milestoneView === "calendar" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5"
                onClick={() => setMilestoneView("calendar")}
                data-testid="button-milestone-calendar-view"
              >
                <CalendarDays className="h-3.5 w-3.5 mr-1" /> Calendar
              </Button>
            </div>
            {isAdmin && (
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
                  <p className="text-sm text-muted-foreground">{isAdmin ? "Add milestones to track key initiative checkpoints." : "No milestones have been added."}</p>
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
                          {isAdmin ? (
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
                        {typeof m.progress === "number" && (
                          <div className="mt-2 space-y-1">
                            <Progress value={m.progress} className="h-1" />
                            <p className="text-[10px] text-muted-foreground">{m.progress}% complete</p>
                          </div>
                        )}
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => deleteMsMut.mutate(m.id)}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                          data-testid={`button-delete-milestone-${m.id}`}
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
                      {(isAdmin || user?.id === c.userId) && (
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
                <Select value={taskForm.status} onValueChange={v => setTaskForm(f => ({ ...f, status: v }))}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskForm(false)}>Cancel</Button>
            <Button onClick={() => createTaskMut.mutate(taskForm)} disabled={!taskForm.title || createTaskMut.isPending} data-testid="button-submit-task">
              {createTaskMut.isPending ? "Creating..." : "Create Initiative"}
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
                <Select value={msForm.status} onValueChange={v => setMsForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-milestone-status-new"><SelectValue /></SelectTrigger>
                  <SelectContent>{MILESTONE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
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
