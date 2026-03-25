import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ExcelUpload } from "@/components/excel-upload";
import { formatDate } from "@/lib/utils";
import {
  FolderOpen, Plus, Search, CheckCircle2, AlertTriangle,
  Activity, Target, ChevronRight, Users, Calendar, Briefcase,
  List, Trash2, TrendingUp, FileSpreadsheet, Kanban, ChevronLeft,
} from "lucide-react";
import type { Project, Department, TeamMember } from "@shared/schema";

const projectColumnMap: Record<string, string> = {
  "Name *": "name",
  "Description": "description",
  "Owner": "owner",
  "Business Unit": "businessUnit",
  "Strategic Goal": "strategicGoal",
  "Start Date (DD-MM-YYYY)": "startDate",
  "Due Date (DD-MM-YYYY)": "dueDate",
  "Status": "status",
  "Priority": "priority",
};

type ProjectWithHealth = Project & {
  health: "Green" | "Amber" | "Red" | "Completed";
  taskCount: number;
  completedTaskCount: number;
};

function healthDot(h: string) {
  if (h === "Green") return "bg-emerald-500";
  if (h === "Amber") return "bg-amber-500";
  if (h === "Red") return "bg-red-500";
  return "bg-blue-500";
}

function healthLabel(h: string) {
  if (h === "Green") return "text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (h === "Amber") return "text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400";
  if (h === "Red") return "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
  return "text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300";
}

function statusPill(s: string) {
  if (s === "Completed") return "text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300";
  if (s === "In Progress") return "text-violet-700 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300";
  if (s === "At Risk") return "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
  if (s === "Delayed") return "text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400";
  return "text-muted-foreground bg-muted";
}

function priorityBadge(p: string) {
  if (p === "Critical") return "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
  if (p === "High") return "text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400";
  if (p === "Medium") return "text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
  return "text-muted-foreground bg-muted";
}

function StatCard({ title, value, sub, icon: Icon, color, bg }: {
  title: string; value: number; sub?: string; icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5 flex items-center gap-3">
      <div className={`p-2 rounded-lg shrink-0 ${bg}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">{title}</p>
        <p className={`text-2xl font-black tabular-nums leading-tight mt-0.5 ${color}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const STATUSES = ["All", "Not Started", "In Progress", "At Risk", "Delayed", "Completed"];
const PRIORITIES = ["All", "Critical", "High", "Medium", "Low"];

function InitiativeGridCard({ p, canEdit, onDelete }: { p: ProjectWithHealth; canEdit: boolean; onDelete: (id: number) => void }) {
  return (
    <Card className="group hover:shadow-md transition-all hover:border-primary/30 h-full overflow-hidden relative" data-testid={`card-project-${p.id}`}>
      <div className={`h-1 w-full ${healthDot(p.health)}`} />
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link href={`/projects/${p.id}`}>
              <h3 className="font-semibold text-sm leading-tight hover:text-primary transition-colors line-clamp-1 cursor-pointer" data-testid={`text-project-name-${p.id}`}>{p.name}</h3>
            </Link>
            {p.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Link href={`/initiatives/${p.id}`}>
              <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
            {canEdit && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(p.id); }}
                className="text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                data-testid={`button-delete-project-${p.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusPill(p.status)}`}>{p.status}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${healthLabel(p.health)}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${healthDot(p.health)}`} /> {p.health}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${priorityBadge(p.priority)}`}>{p.priority}</span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="font-semibold text-foreground">{p.progress ?? 0}%</span>
          </div>
          <Progress value={p.progress ?? 0} className="h-2 rounded-full" />
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5 border-t border-border/40">
          {p.owner && (
            <span className="flex items-center gap-1 truncate min-w-0">
              <Users className="h-3 w-3 shrink-0" /> <span className="truncate">{p.owner}</span>
            </span>
          )}
          {p.dueDate && (
            <span className="flex items-center gap-1 shrink-0 ml-auto">
              <Calendar className="h-3 w-3" /> {formatDate(p.dueDate)}
            </span>
          )}
          <span className="flex items-center gap-1 shrink-0">
            <Target className="h-3 w-3" />
            {p.completedTaskCount}/{p.taskCount}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function InitiativeListRow({ p, canEdit, onDelete }: { p: ProjectWithHealth; canEdit: boolean; onDelete: (id: number) => void }) {
  return (
    <div
      className="group flex items-center gap-0 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
      data-testid={`card-project-list-${p.id}`}
    >
      <div className={`w-1 self-stretch shrink-0 ${healthDot(p.health)}`} />
      <div className="w-7 flex items-center justify-center px-1.5 shrink-0">
        <span className={`w-2 h-2 rounded-full ${healthDot(p.health)}`} title={p.health} />
      </div>
      <div className="flex-1 min-w-0 py-2.5 pr-3">
        <Link href={`/projects/${p.id}`}>
          <span className="font-medium text-sm hover:text-primary transition-colors cursor-pointer" data-testid={`text-project-list-name-${p.id}`}>{p.name}</span>
        </Link>
        {p.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.description}</p>}
      </div>
      <div className="hidden sm:flex w-[130px] shrink-0 items-center gap-1.5 py-2.5">
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium truncate ${statusPill(p.status)}`}>{p.status}</span>
      </div>
      <div className="hidden sm:block w-[85px] shrink-0 py-2.5">
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${priorityBadge(p.priority)}`}>{p.priority}</span>
      </div>
      <div className="hidden md:flex w-[150px] shrink-0 items-center gap-2 py-2.5">
        <Progress value={p.progress ?? 0} className="h-1.5 flex-1" />
        <span className="text-xs font-semibold tabular-nums w-8 text-right">{p.progress ?? 0}%</span>
      </div>
      <div className="hidden lg:block w-[130px] shrink-0 py-2.5">
        <span className="text-xs text-muted-foreground truncate">{p.owner || "-"}</span>
      </div>
      <div className="hidden lg:block w-[100px] shrink-0 py-2.5">
        <span className="text-xs text-muted-foreground">{p.dueDate ? formatDate(p.dueDate) : "-"}</span>
      </div>
      <div className="w-[110px] shrink-0 py-2.5 text-xs text-muted-foreground">
        {p.completedTaskCount}/{p.taskCount} initiatives
      </div>
      <div className="w-[60px] shrink-0 flex items-center justify-end gap-1 pr-3 py-2.5">
        <Link href={`/projects/${p.id}`}>
          <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
        </Link>
        {canEdit && (
          <button
            onClick={() => onDelete(p.id)}
            className="text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            data-testid={`button-delete-project-list-${p.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const { canEdit } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterHealth, setFilterHealth] = useState("All");
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "calendar">("list");
  const [calMonth, setCalMonth] = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", owner: "", businessUnit: "",
    strategicGoal: "", riskNotes: "",
    startDate: "", dueDate: "", status: "Not Started", priority: "High",
  });

  const { data: projects = [], isLoading } = useQuery<ProjectWithHealth[]>({ queryKey: ["/api/projects"] });
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: teamMembers = [] } = useQuery<TeamMember[]>({ queryKey: ["/api/team-members"] });

  const { data: stats } = useQuery<{
    total: number; active: number; completed: number; atRisk: number; overdueTasks: number; upcomingMilestones: number;
  }>({ queryKey: ["/api/portfolio/stats"] });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      setShowCreate(false);
      setForm({ name: "", description: "", owner: "", businessUnit: "", strategicGoal: "", riskNotes: "", startDate: "", dueDate: "", status: "Not Started", priority: "High" });
      toast({ title: "Project created successfully" });
    },
    onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      toast({ title: "Project deleted" });
    },
    onError: () => toast({ title: "Failed to delete project", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/projects/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
    },
  });

  const onProjectImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
  };

  const filtered = projects.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.owner?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "All" && p.status !== filterStatus) return false;
    if (filterPriority !== "All" && p.priority !== filterPriority) return false;
    if (filterHealth !== "All" && p.health !== filterHealth) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <FolderOpen className="h-6 w-6 text-primary" />
            Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">All strategic projects across your organisation</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 flex-wrap">
            <ExcelUpload
              templateUrl="/api/projects/template"
              uploadUrl="/api/upload/projects"
              entityName="Projects"
              columnMap={projectColumnMap}
              onSuccess={onProjectImportSuccess}
            />
            <Button onClick={() => setShowCreate(true)} data-testid="button-create-project">
              <Plus className="h-4 w-4 mr-1.5" /> New Project
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats ? (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard title="Total" value={stats.total} icon={Briefcase} color="text-primary" bg="bg-primary/10" />
          <StatCard title="Active" value={stats.active} sub="In progress" icon={Activity} color="text-violet-600" bg="bg-violet-100 dark:bg-violet-900/30" />
          <StatCard title="At Risk" value={stats.atRisk} sub="Red health" icon={AlertTriangle} color="text-red-600" bg="bg-red-100 dark:bg-red-900/30" />
          <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-100 dark:bg-emerald-900/30" />
          <StatCard title="Overdue Tasks" value={stats.overdueTasks} icon={AlertTriangle} color="text-orange-600" bg="bg-orange-100 dark:bg-orange-900/30" />
          <StatCard title="Milestones" value={stats.upcomingMilestones} sub="Upcoming" icon={TrendingUp} color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/30" />
        </div>
      ) : (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      )}

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects or owners..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-project-search"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36" data-testid="select-filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36" data-testid="select-filter-priority">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterHealth} onValueChange={setFilterHealth}>
          <SelectTrigger className="w-36" data-testid="select-filter-health">
            <SelectValue placeholder="Health" />
          </SelectTrigger>
          <SelectContent>
            {["All", "Green", "Amber", "Red", "Completed"].map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 gap-0.5 ml-auto shrink-0">
          {([
            { mode: "list", icon: List, label: "List" },
            { mode: "kanban", icon: Kanban, label: "Kanban" },
            { mode: "calendar", icon: Calendar, label: "Calendar" },
          ] as const).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              data-testid={`button-view-${mode}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === mode
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "project" : "projects"}
            {filtered.length !== projects.length && ` (filtered from ${projects.length})`}
          </p>
          {(filterStatus !== "All" || filterPriority !== "All" || filterHealth !== "All" || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => { setSearch(""); setFilterStatus("All"); setFilterPriority("All"); setFilterHealth("All"); }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* ══════ Loading ══════ */}
      {isLoading && (
        <div className="space-y-2">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-14" />)}
        </div>
      )}

      {/* ══════ Empty state ══════ */}
      {!isLoading && filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-base">No projects found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || filterStatus !== "All" || filterPriority !== "All" || filterHealth !== "All"
                  ? "Try adjusting your search or filters."
                  : canEdit
                  ? "Create your first project to get started."
                  : "No projects have been created yet."}
              </p>
            </div>
            {canEdit && !search && filterStatus === "All" && filterPriority === "All" && filterHealth === "All" && (
              <div className="flex items-center gap-2">
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Create First Project
                </Button>
                <span className="text-xs text-muted-foreground">or</span>
                <Button variant="outline" size="sm" onClick={() => window.open("/api/projects/template", "_blank")}>
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Download Template
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════ LIST VIEW ══════ */}
      {!isLoading && filtered.length > 0 && viewMode === "list" && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-0 border-b bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <div className="w-1 shrink-0" />
              <div className="w-7 shrink-0" />
              <div className="flex-1 min-w-0 py-2 pr-3">Project</div>
              <div className="hidden sm:block w-[130px] shrink-0 py-2">Status</div>
              <div className="hidden sm:block w-[85px] shrink-0 py-2">Priority</div>
              <div className="hidden md:block w-[150px] shrink-0 py-2">Progress</div>
              <div className="hidden lg:block w-[130px] shrink-0 py-2">Owner</div>
              <div className="hidden lg:block w-[100px] shrink-0 py-2">Due Date</div>
              <div className="w-[110px] shrink-0 py-2">Initiatives</div>
              <div className="w-[60px] shrink-0 pr-3" />
            </div>
            {filtered.map(p => (
              <InitiativeListRow key={p.id} p={p} canEdit={canEdit} onDelete={id => deleteMutation.mutate(id)} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* ══════ KANBAN VIEW ══════ */}
      {!isLoading && filtered.length > 0 && viewMode === "kanban" && (() => {
        const COLS = ["Not Started", "In Progress", "At Risk", "Delayed", "Completed"] as const;
        const colTopColors: Record<string, string> = {
          "Not Started": "border-t-slate-400",
          "In Progress": "border-t-blue-500",
          "At Risk": "border-t-red-500",
          "Delayed": "border-t-amber-500",
          "Completed": "border-t-emerald-500",
        };
        const colDotColors: Record<string, string> = {
          "Not Started": "bg-slate-400",
          "In Progress": "bg-blue-500",
          "At Risk": "bg-red-500",
          "Delayed": "bg-amber-500",
          "Completed": "bg-emerald-500",
        };
        return (
          <div className="flex gap-4 min-h-[440px] overflow-x-auto pb-4" data-testid="view-kanban">
            {COLS.map(col => {
              const colProjects = filtered.filter(p => (p.status || "Not Started") === col);
              const isDragOver = dragOverCol === col;
              return (
                <div
                  key={col}
                  className={`flex flex-col min-w-[260px] w-[260px] rounded-xl border-t-4 ${colTopColors[col]} bg-muted/30 border transition-colors ${isDragOver ? "bg-primary/5 border-primary/30" : ""}`}
                  onDragOver={e => { e.preventDefault(); setDragOverCol(col); }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOverCol(null);
                    if (dragId !== null) {
                      const item = projects.find(p => p.id === dragId);
                      if (item && item.status !== col) {
                        updateMutation.mutate({ id: dragId, data: { status: col } });
                      }
                      setDragId(null);
                    }
                  }}
                  data-testid={`kanban-col-${col.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${colDotColors[col]}`} />
                      <span className="text-xs font-semibold">{col}</span>
                    </div>
                    <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded-full border">{colProjects.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {colProjects.length === 0 && (
                      <div className={`flex items-center justify-center h-16 rounded-lg border-2 border-dashed text-xs text-muted-foreground transition-colors ${isDragOver ? "border-primary/40 text-primary/60" : "border-border/40"}`}>
                        Drop here
                      </div>
                    )}
                    {colProjects.map(p => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => setDragId(p.id)}
                        onDragEnd={() => { setDragId(null); setDragOverCol(null); }}
                        className={`bg-background rounded-lg border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all select-none ${dragId === p.id ? "opacity-40 scale-95" : ""}`}
                        data-testid={`kanban-card-${p.id}`}
                      >
                        <div className="flex items-start gap-1.5 mb-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${healthDot(p.health)}`} />
                          <Link href={`/projects/${p.id}`}>
                            <p className="text-sm font-medium leading-snug line-clamp-2 hover:text-primary transition-colors cursor-pointer">{p.name}</p>
                          </Link>
                        </div>
                        <div className="flex items-center flex-wrap gap-1 mb-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${priorityBadge(p.priority)}`}>{p.priority}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${healthLabel(p.health)}`}>{p.health}</span>
                        </div>
                        {(p.progress ?? 0) > 0 && (
                          <div className="mb-2">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${(p.progress ?? 0) === 100 ? "bg-emerald-500" : "bg-primary"}`}
                                style={{ width: `${p.progress ?? 0}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{p.progress ?? 0}%</p>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                          {p.owner ? (
                            <div className="flex items-center gap-1">
                              <div className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold shrink-0">
                                {p.owner.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                              </div>
                              <span className="truncate max-w-[80px]">{p.owner}</span>
                            </div>
                          ) : <span />}
                          {p.dueDate && <span className="shrink-0">{formatDate(p.dueDate)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ══════ CALENDAR VIEW ══════ */}
      {!isLoading && filtered.length > 0 && viewMode === "calendar" && (() => {
        const year = calMonth.getFullYear();
        const month = calMonth.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date().toISOString().split("T")[0];
        const monthLabel = calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

        const projectsByDate: Record<string, ProjectWithHealth[]> = {};
        for (const p of filtered) {
          const d = p.dueDate;
          if (d) { projectsByDate[d] = [...(projectsByDate[d] || []), p]; }
        }

        const cells = Array.from({ length: firstDay }, () => null as null)
          .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

        return (
          <div data-testid="view-calendar">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCalMonth(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted/50 transition-colors"
                data-testid="button-cal-prev"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <h2 className="text-base font-bold">{monthLabel}</h2>
              <button
                onClick={() => setCalMonth(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted/50 transition-colors"
                data-testid="button-cal-next"
              >
                Next
                <ChevronRight className="h-4 w-4" />
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
                const dayProjects = projectsByDate[dateStr] || [];
                const isToday = dateStr === today;
                const isPast = dateStr < today;
                return (
                  <div
                    key={dateStr}
                    className={`min-h-[80px] rounded-lg border p-1.5 transition-colors ${
                      isToday ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border/60 hover:border-border bg-background"
                    }`}
                    data-testid={`cal-day-${dateStr}`}
                  >
                    <p className={`text-[11px] font-semibold mb-1 ${isToday ? "text-primary" : isPast ? "text-muted-foreground" : "text-foreground"}`}>{day}</p>
                    <div className="space-y-0.5">
                      {dayProjects.slice(0, 3).map(p => (
                        <div
                          key={p.id}
                          title={p.name}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${healthLabel(p.health)}`}
                          data-testid={`cal-project-${p.id}`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${healthDot(p.health)}`} />
                          <span className="truncate">{p.name}</span>
                        </div>
                      ))}
                      {dayProjects.length > 3 && (
                        <p className="text-[10px] text-muted-foreground pl-1">+{dayProjects.length - 3} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Create Project Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Project Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Loyalty Programme Launch" data-testid="input-project-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What is this project about?" rows={2} data-testid="input-project-description" />
            </div>
            <div className="space-y-1.5">
              <Label>Strategic Goal</Label>
              <Input value={form.strategicGoal} onChange={e => setForm(f => ({ ...f, strategicGoal: e.target.value }))}
                placeholder="e.g. Increase Revenue by 20%" data-testid="input-project-strategic-goal" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Owner</Label>
                {teamMembers.length > 0 ? (
                  <Select value={form.owner || "none"} onValueChange={v => setForm(f => ({ ...f, owner: v === "none" ? "" : v }))}>
                    <SelectTrigger data-testid="select-project-owner"><SelectValue placeholder="Select owner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No owner</SelectItem>
                      {teamMembers.map(m => <SelectItem key={m.id} value={m.name}>{m.name}{m.jobTitle ? ` — ${m.jobTitle}` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                    placeholder="Name" data-testid="input-project-owner" />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Business Unit / Dept</Label>
                <Select value={form.businessUnit || "none"} onValueChange={v => setForm(f => ({ ...f, businessUnit: v === "none" ? "" : v }))}>
                  <SelectTrigger data-testid="select-project-bu"><SelectValue placeholder="Select department" /></SelectTrigger>
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
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} data-testid="input-project-start" />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} data-testid="input-project-due" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-project-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Not Started","In Progress","At Risk","Delayed","Completed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger data-testid="select-project-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Critical","High","Medium","Low"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Risk Notes</Label>
              <Textarea value={form.riskNotes} onChange={e => setForm(f => ({ ...f, riskNotes: e.target.value }))}
                placeholder="Any known risks or blockers?" rows={2} data-testid="input-project-risk-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name || createMutation.isPending}
              data-testid="button-submit-project"
            >
              {createMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
