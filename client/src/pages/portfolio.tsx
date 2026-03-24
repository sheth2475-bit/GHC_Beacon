import { useState, useRef } from "react";
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
import {
  FolderOpen, Plus, Search, CheckCircle2, AlertTriangle,
  Activity, Target, ChevronRight, Users, Calendar, Briefcase,
  LayoutGrid, List, Trash2, TrendingUp, Download, Upload, FileSpreadsheet,
} from "lucide-react";
import type { Project } from "@shared/schema";

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
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-bold mt-1.5 tabular-nums">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const STATUSES = ["All", "Not Started", "In Progress", "At Risk", "Delayed", "Completed"];
const PRIORITIES = ["All", "Critical", "High", "Medium", "Low"];

function InitiativeGridCard({ p, isAdmin, onDelete }: { p: ProjectWithHealth; isAdmin: boolean; onDelete: (id: number) => void }) {
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
            {isAdmin && (
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
              <Calendar className="h-3 w-3" /> {p.dueDate}
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

function InitiativeListRow({ p, isAdmin, onDelete }: { p: ProjectWithHealth; isAdmin: boolean; onDelete: (id: number) => void }) {
  return (
    <Card className="group hover:shadow-sm transition-all hover:border-primary/20" data-testid={`card-project-list-${p.id}`}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-1 self-stretch rounded-full shrink-0 ${healthDot(p.health)}`} />
        <div className="flex-1 min-w-0">
          <Link href={`/projects/${p.id}`}>
            <span className="font-semibold text-sm hover:text-primary transition-colors cursor-pointer" data-testid={`text-project-list-name-${p.id}`}>{p.name}</span>
          </Link>
          {p.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.description}</p>}
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusPill(p.status)}`}>{p.status}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${priorityBadge(p.priority)}`}>{p.priority}</span>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground shrink-0 min-w-[160px]">
          <div className="w-24">
            <Progress value={p.progress ?? 0} className="h-1.5" />
          </div>
          <span className="font-medium w-8 text-right">{p.progress ?? 0}%</span>
        </div>
        {p.owner && <span className="hidden lg:block text-xs text-muted-foreground shrink-0 w-28 truncate">{p.owner}</span>}
        {p.dueDate && <span className="hidden lg:block text-xs text-muted-foreground shrink-0">{p.dueDate}</span>}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{p.completedTaskCount}/{p.taskCount} initiatives</span>
          <Link href={`/projects/${p.id}`}>
            <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
          </Link>
          {isAdmin && (
            <button
              onClick={() => onDelete(p.id)}
              className="text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              data-testid={`button-delete-project-list-${p.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PortfolioPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterHealth, setFilterHealth] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showCreate, setShowCreate] = useState(false);
  const [uploadPending, setUploadPending] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", owner: "", businessUnit: "",
    strategicGoal: "", riskNotes: "",
    startDate: "", dueDate: "", status: "Not Started", priority: "High",
  });

  const { data: projects = [], isLoading } = useQuery<ProjectWithHealth[]>({ queryKey: ["/api/projects"] });

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

  const handleDownloadTemplate = () => {
    window.open("/api/initiatives/template", "_blank");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadPending(true);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
      if (rows.length === 0) {
        toast({ title: "No data found in the file", variant: "destructive" });
        return;
      }
      const res = await apiRequest("POST", "/api/initiatives/bulk-upload", { rows });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      toast({ title: `${data.created} project${data.created !== 1 ? "s" : ""} imported successfully` });
    } catch (err: any) {
      toast({ title: "Upload failed: " + (err.message || "Unknown error"), variant: "destructive" });
    } finally {
      setUploadPending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} data-testid="button-download-template">
              <Download className="h-4 w-4 mr-1.5" /> Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadPending} data-testid="button-bulk-upload">
              {uploadPending ? (
                <><span className="h-4 w-4 mr-1.5 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block" /> Uploading...</>
              ) : (
                <><Upload className="h-4 w-4 mr-1.5" /> Bulk Import</>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
              data-testid="input-bulk-upload-file"
            />
            <Button onClick={() => setShowCreate(true)} data-testid="button-create-project">
              <Plus className="h-4 w-4 mr-1.5" /> New Project
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
          <StatCard title="Total" value={stats.total} icon={Briefcase} color="text-primary" bg="bg-primary/10" />
          <StatCard title="Active" value={stats.active} sub="In progress" icon={Activity} color="text-violet-600" bg="bg-violet-100 dark:bg-violet-900/30" />
          <StatCard title="At Risk" value={stats.atRisk} sub="Red health" icon={AlertTriangle} color="text-red-600" bg="bg-red-100 dark:bg-red-900/30" />
          <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-100 dark:bg-emerald-900/30" />
          <StatCard title="Overdue Tasks" value={stats.overdueTasks} icon={AlertTriangle} color="text-orange-600" bg="bg-orange-100 dark:bg-orange-900/30" />
          <StatCard title="Milestones" value={stats.upcomingMilestones} sub="Upcoming" icon={TrendingUp} color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/30" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24" />)}
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
        <div className="flex items-center gap-1 border rounded-md p-1 ml-auto">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMode("grid")}
            data-testid="button-grid-view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMode("list")}
            data-testid="button-list-view"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
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

      {/* Initiative Cards / List */}
      {isLoading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-2"}>
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className={viewMode === "grid" ? "h-52" : "h-20"} />)}
        </div>
      ) : filtered.length === 0 ? (
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
                  : isAdmin
                  ? "Create your first project to get started."
                  : "No projects have been created yet."}
              </p>
            </div>
            {isAdmin && !search && filterStatus === "All" && filterPriority === "All" && filterHealth === "All" && (
              <div className="flex items-center gap-2">
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Create First Project
                </Button>
                <span className="text-xs text-muted-foreground">or</span>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Download Template
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <InitiativeGridCard key={p.id} p={p} isAdmin={isAdmin} onDelete={id => deleteMutation.mutate(id)} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <InitiativeListRow key={p.id} p={p} isAdmin={isAdmin} onDelete={id => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}

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
                <Input value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
                  placeholder="Name" data-testid="input-project-owner" />
              </div>
              <div className="space-y-1.5">
                <Label>Business Unit</Label>
                <Input value={form.businessUnit} onChange={e => setForm(f => ({ ...f, businessUnit: e.target.value }))}
                  placeholder="e.g. Marketing" data-testid="input-project-bu" />
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
