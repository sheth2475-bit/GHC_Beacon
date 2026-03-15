import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FolderOpen, Plus, Search, Filter, CheckCircle2, AlertTriangle,
  Activity, Target, ChevronRight, Users, Calendar, BarChart3, Briefcase,
} from "lucide-react";
import type { Project, Department } from "@shared/schema";

type ProjectWithHealth = Project & {
  health: "Green" | "Amber" | "Red" | "Completed";
  taskCount: number;
  completedTaskCount: number;
};

function healthColor(h: string) {
  if (h === "Green") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (h === "Amber") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  if (h === "Red") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
}

function statusColor(s: string) {
  if (s === "Completed") return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  if (s === "In Progress") return "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300";
  if (s === "At Risk") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (s === "Delayed") return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
  return "bg-muted text-muted-foreground";
}

function priorityColor(p: string) {
  if (p === "Critical") return "text-red-600 dark:text-red-400";
  if (p === "High") return "text-orange-600 dark:text-orange-400";
  if (p === "Medium") return "text-blue-600 dark:text-blue-400";
  return "text-muted-foreground";
}

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: number; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const STATUSES = ["All", "Not Started", "In Progress", "At Risk", "Delayed", "Completed"];
const PRIORITIES = ["All", "Critical", "High", "Medium", "Low"];

export default function PortfolioPage() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterHealth, setFilterHealth] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", owner: "", businessUnit: "",
    startDate: "", dueDate: "", status: "Not Started", priority: "High",
  });

  const { data: projects = [], isLoading } = useQuery<ProjectWithHealth[]>({
    queryKey: ["/api/projects"],
  });

  const { data: stats } = useQuery<{
    total: number; active: number; completed: number; atRisk: number; overdueTasks: number; upcomingMilestones: number;
  }>({ queryKey: ["/api/portfolio/stats"] });

  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ["/api/departments"] });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/projects", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      setShowCreate(false);
      setForm({ name: "", description: "", owner: "", businessUnit: "", startDate: "", dueDate: "", status: "Not Started", priority: "High" });
      toast({ title: "Project created" });
    },
    onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-primary" />
            Project Portfolio
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">All projects across your organisation</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)} data-testid="button-create-project">
            <Plus className="h-4 w-4 mr-1.5" /> New Project
          </Button>
        )}
      </div>

      {/* Stats */}
      {stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Projects" value={stats.total} icon={Briefcase} color="bg-primary/10 text-primary" />
          <StatCard title="Active" value={stats.active} sub="In progress or not started" icon={Activity} color="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" />
          <StatCard title="At Risk" value={stats.atRisk} sub="Health score Red" icon={AlertTriangle} color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" />
          <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      )}

      {/* Filters */}
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
      </div>

      {/* Project Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No projects found</p>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? 'Create your first project to get started.' : 'No projects match your filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(p => (
            <Link key={p.id} href={`/projects/${p.id}`} data-testid={`card-project-${p.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer border hover:border-primary/30 h-full">
                <CardContent className="p-5 space-y-3">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm leading-tight truncate" data-testid={`text-project-name-${p.id}`}>{p.name}</h3>
                      {p.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(p.status)}`}>{p.status}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${healthColor(p.health)}`}>● {p.health}</span>
                    <span className={`text-xs font-semibold ${priorityColor(p.priority)}`}>{p.priority}</span>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span className="font-medium text-foreground">{p.progress ?? 0}%</span>
                    </div>
                    <Progress value={p.progress ?? 0} className="h-1.5" />
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                    {p.owner && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {p.owner}
                      </span>
                    )}
                    {p.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {p.dueDate}
                      </span>
                    )}
                    <span className="flex items-center gap-1 ml-auto">
                      <Target className="h-3 w-3" />
                      {p.completedTaskCount}/{p.taskCount} tasks
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Project Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Loyalty Program Launch" data-testid="input-project-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What is this project about?" rows={3} data-testid="input-project-description" />
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
