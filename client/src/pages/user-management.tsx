import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield, Eye, EyeOff, Mail, User, Users, Pencil, Building2, Plus, Lock, CheckCircle2, Edit2, Copy, KeyRound, ArrowRight, Target, LayoutDashboard, Globe, Link as LinkIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { TeamMember, Department, UserDepartmentAccess, BscDepartment, AnalyticsDashboardDefinition, PowerBiDashboard } from "@shared/schema";

interface CompanyUser {
  id: number;
  name: string;
  email: string;
  role: string;
  companyId: number | null;
  createdAt: string;
}

interface DeptAccessEntry extends UserDepartmentAccess {
  departmentName: string;
}

interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  role: string;
}

interface TeamMemberForm {
  name: string;
  email: string;
  department: string;
  jobTitle: string;
}

const ACCESS_LEVELS = [
  { value: "view", label: "View Only", description: "Can see data but cannot edit", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "edit", label: "Edit", description: "Can create and update records", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "full", label: "Full Access", description: "Can create, edit, and delete records", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
];

function accessLevelBadge(level: string) {
  const found = ACCESS_LEVELS.find(a => a.value === level);
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${found?.color || "bg-muted text-muted-foreground"}`}>
      {found?.label || level}
    </span>
  );
}

const TEMP_PASSWORD = "Welcome@123";

function SetupMemberAccessDialog({ member, departments }: { member: TeamMember; departments: Department[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [createdUser, setCreatedUser] = useState<CompanyUser | null>(null);
  const [email, setEmail] = useState(member.email || "");
  const [role, setRole] = useState("executive");
  const [copied, setCopied] = useState(false);

  const handleClose = (o: boolean) => {
    if (!o) { setOpen(false); setStep(1); setCreatedUser(null); setCopied(false); }
    else setOpen(true);
  };

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/users", {
        name: member.name,
        email,
        password: TEMP_PASSWORD,
        role,
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed to create account"); }
      return res.json() as Promise<CompanyUser>;
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setCreatedUser(user);
      setStep(2);
      toast({ title: "Login account created", description: `${member.name} can now log in.` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const copyPassword = () => {
    navigator.clipboard.writeText(TEMP_PASSWORD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
          data-testid={`button-setup-access-${member.id}`}>
          <KeyRound className="h-3.5 w-3.5" />
          Setup Access
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? `Create Login — ${member.name}` : `Department Access — ${member.name}`}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-300">
              A login account will be created so <strong>{member.name}</strong> can access the platform. Share the temporary password with them — they can change it after logging in.
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. fatima@company.com"
                  data-testid="input-setup-email"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Role</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger data-testid="select-setup-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executive"><div className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-amber-600" /><span>Executive — view only</span></div></SelectItem>
                    <SelectItem value="team_member"><div className="flex items-center gap-2"><Pencil className="h-3.5 w-3.5 text-green-600" /><span>Team Member — edit &amp; view</span></div></SelectItem>
                    <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-blue-600" /><span>Admin — full access</span></div></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Temporary Password</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono font-medium tracking-wide">
                    {TEMP_PASSWORD}
                  </div>
                  <Button size="sm" variant="outline" onClick={copyPassword} className="shrink-0 gap-1.5" data-testid="button-copy-password">
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Share this with {member.name}. They can change it after first login.</p>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                disabled={!email || createMut.isPending}
                onClick={() => createMut.mutate()}
                className="gap-1.5"
                data-testid="button-create-account"
              >
                {createMut.isPending ? "Creating..." : <><span>Create Account</span><ArrowRight className="h-4 w-4" /></>}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && createdUser && (
          <DeptAccessContent user={createdUser} departments={departments} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeptAccessContent({ user, departments, onDone }: { user: CompanyUser; departments: Department[]; onDone: () => void }) {
  const { toast } = useToast();
  const [newDeptId, setNewDeptId] = useState<string>("");
  const [newLevel, setNewLevel] = useState<string>("view");

  const { data: access = [], isLoading } = useQuery<DeptAccessEntry[]>({
    queryKey: ["/api/users", user.id, "department-access"],
    queryFn: () => apiRequest("GET", `/api/users/${user.id}/department-access`).then(r => r.json()),
  });

  const addMut = useMutation({
    mutationFn: ({ departmentId, accessLevel }: { departmentId: number; accessLevel: string }) =>
      apiRequest("POST", `/api/users/${user.id}/department-access`, { departmentId, accessLevel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "department-access"] });
      setNewDeptId(""); setNewLevel("view");
      toast({ title: "Department access added" });
    },
    onError: () => toast({ title: "Failed to add access", variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: (deptId: number) => apiRequest("DELETE", `/api/users/${user.id}/department-access/${deptId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "department-access"] });
      toast({ title: "Department access removed" });
    },
    onError: () => toast({ title: "Failed to remove access", variant: "destructive" }),
  });

  const clearAllMut = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/users/${user.id}/department-access`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "department-access"] });
      toast({ title: "Access set to All Departments" });
    },
    onError: () => toast({ title: "Failed to update access", variant: "destructive" }),
  });

  const availableDepts = departments.filter(d => !access.some(a => a.departmentId === d.id));
  const isAllDepts = !isLoading && access.length === 0;

  return (
    <div className="space-y-4 py-2">
      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-3 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Account created. Now configure which departments <strong>{user.name}</strong> can access.
      </div>

      <div className={`rounded-xl border-2 p-4 transition-colors ${isAllDepts ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "border-muted bg-muted/30"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full ${isAllDepts ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-muted"}`}>
              {isAllDepts ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div>
              <p className={`text-sm font-semibold ${isAllDepts ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>All Departments</p>
              <p className="text-xs text-muted-foreground">{isAllDepts ? "Sees all departments — no restrictions" : "Restricted to specific departments"}</p>
            </div>
          </div>
          {!isAllDepts && !isLoading && (
            <Button size="sm" variant="outline" className="shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
              onClick={() => clearAllMut.mutate()} disabled={clearAllMut.isPending}>
              {clearAllMut.isPending ? "Updating..." : "Grant All"}
            </Button>
          )}
        </div>
      </div>

      {isLoading && <div className="h-16 bg-muted rounded animate-pulse" />}

      {!isLoading && access.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Restricted To</p>
          {access.map(entry => (
            <div key={entry.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{entry.departmentName}</span>
                {accessLevelBadge(entry.accessLevel)}
              </div>
              <button onClick={() => removeMut.mutate(entry.departmentId)} disabled={removeMut.isPending}
                className="text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {availableDepts.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {isAllDepts ? "Restrict to a Department" : "Add Department"}
          </p>
          <div className="flex gap-2">
            <Select value={newDeptId} onValueChange={setNewDeptId}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>{availableDepts.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={newLevel} onValueChange={setNewLevel}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCESS_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" size="sm" disabled={!newDeptId || addMut.isPending}
            onClick={() => addMut.mutate({ departmentId: parseInt(newDeptId), accessLevel: newLevel })}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {addMut.isPending ? "Adding..." : "Add Department"}
          </Button>
        </div>
      )}

      <DialogFooter className="pt-2">
        <Button onClick={onDone}>Done</Button>
      </DialogFooter>
    </div>
  );
}

// ── BSC Scorecard Department Access ──────────────────────────────────────────
interface BscDeptAccessEntry { id: number; userId: number; deptId: string; accessLevel: string; }

function BscDeptAccessContent({ user }: { user: CompanyUser }) {
  const { toast } = useToast();
  const [newDeptId, setNewDeptId] = useState("");
  const [newLevel, setNewLevel] = useState("view");

  const { data: bscDepts = [] } = useQuery<BscDepartment[]>({
    queryKey: ["/api/scorecard/departments"],
    queryFn: () => apiRequest("GET", "/api/scorecard/departments").then(r => r.json()),
  });

  const { data: access = [], isLoading } = useQuery<BscDeptAccessEntry[]>({
    queryKey: ["/api/users", user.id, "bsc-dept-access"],
    queryFn: () => apiRequest("GET", `/api/users/${user.id}/bsc-dept-access`).then(r => r.json()),
  });

  const addMut = useMutation({
    mutationFn: ({ deptId, accessLevel }: { deptId: string; accessLevel: string }) =>
      apiRequest("POST", `/api/users/${user.id}/bsc-dept-access`, { deptId, accessLevel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "bsc-dept-access"] });
      setNewDeptId(""); setNewLevel("view");
      toast({ title: "Scorecard access added" });
    },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: (deptId: string) => apiRequest("DELETE", `/api/users/${user.id}/bsc-dept-access/${deptId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "bsc-dept-access"] });
      toast({ title: "Scorecard access removed" });
    },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const clearAllMut = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/users/${user.id}/bsc-dept-access`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "bsc-dept-access"] });
      toast({ title: "Access set to All Scorecard Departments" });
    },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  if (user.role === "admin") {
    return (
      <div className="py-6 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Shield className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <p className="font-medium">Admin — Full Scorecard Access</p>
          <p className="text-sm text-muted-foreground">Admins can see all departments in the Balanced Scorecard.</p>
        </div>
      </div>
    );
  }

  const assignedDeptIds = new Set(access.map(a => a.deptId));
  const availableDepts = bscDepts.filter(d => !assignedDeptIds.has(d.deptId));
  const isAllDepts = !isLoading && access.length === 0;

  return (
    <div className="space-y-4 py-2">
      <p className="text-xs text-muted-foreground">
        Control which Balanced Scorecard departments this user can see. No restrictions = sees all departments.
      </p>

      <div className={`rounded-xl border-2 p-3 transition-colors ${isAllDepts ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "border-muted bg-muted/30"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isAllDepts ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-muted"}`}>
              {isAllDepts ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div>
              <p className={`text-sm font-semibold ${isAllDepts ? "text-emerald-700 dark:text-emerald-400" : ""}`}>All Departments</p>
              <p className="text-xs text-muted-foreground">{isAllDepts ? "No restrictions — sees entire scorecard" : "Restricted to specific departments below"}</p>
            </div>
          </div>
          {!isAllDepts && !isLoading && (
            <Button size="sm" variant="outline" className="shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 text-xs h-7"
              onClick={() => clearAllMut.mutate()} disabled={clearAllMut.isPending}>
              {clearAllMut.isPending ? "…" : "Grant All"}
            </Button>
          )}
        </div>
      </div>

      {isLoading && <div className="h-12 bg-muted rounded animate-pulse" />}

      {!isLoading && access.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Restricted To</p>
          {access.map(entry => {
            const dept = bscDepts.find(d => d.deptId === entry.deptId);
            return (
              <div key={entry.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">{dept?.icon || "🏢"}</span>
                  <span className="text-sm font-medium truncate">{dept?.name || entry.deptId}</span>
                  {accessLevelBadge(entry.accessLevel)}
                </div>
                <button onClick={() => removeMut.mutate(entry.deptId)} disabled={removeMut.isPending}
                  className="text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {availableDepts.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {isAllDepts ? "Restrict to a Department" : "Add Department"}
          </p>
          <div className="flex gap-2">
            <Select value={newDeptId} onValueChange={setNewDeptId}>
              <SelectTrigger className="flex-1 h-8 text-sm"><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {availableDepts.map(d => <SelectItem key={d.deptId} value={d.deptId}>{d.icon} {d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={newLevel} onValueChange={setNewLevel}>
              <SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCESS_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" size="sm" disabled={!newDeptId || addMut.isPending}
            onClick={() => addMut.mutate({ deptId: newDeptId, accessLevel: newLevel })}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {addMut.isPending ? "Adding…" : "Add Department"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Analytics Dashboard Access ────────────────────────────────────────────────
interface DashboardAccessEntry {
  id: number; userId: number; dashboardId: number;
  accessLevel: string; dashboardTitle: string | null; visibility: string | null;
}

function DashboardAccessContent({ user }: { user: CompanyUser }) {
  const { toast } = useToast();
  const [newDashboardId, setNewDashboardId] = useState("");
  const [newLevel, setNewLevel] = useState("view");

  const { data: allDashboards = [] } = useQuery<AnalyticsDashboardDefinition[]>({
    queryKey: ["/api/dashboard-access/available"],
    queryFn: () => apiRequest("GET", "/api/dashboard-access/available").then(r => r.json()),
  });

  const { data: access = [], isLoading } = useQuery<DashboardAccessEntry[]>({
    queryKey: ["/api/users", user.id, "dashboard-access"],
    queryFn: () => apiRequest("GET", `/api/users/${user.id}/dashboard-access`).then(r => r.json()),
  });

  const addMut = useMutation({
    mutationFn: ({ dashboardId, accessLevel }: { dashboardId: number; accessLevel: string }) =>
      apiRequest("POST", `/api/users/${user.id}/dashboard-access`, { dashboardId, accessLevel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "dashboard-access"] });
      setNewDashboardId(""); setNewLevel("view");
      toast({ title: "Dashboard access granted" });
    },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: (dashboardId: number) => apiRequest("DELETE", `/api/users/${user.id}/dashboard-access/${dashboardId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "dashboard-access"] });
      toast({ title: "Dashboard access removed" });
    },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  if (user.role === "admin") {
    return (
      <div className="py-6 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Shield className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <p className="font-medium">Admin — Full Dashboard Access</p>
          <p className="text-sm text-muted-foreground">Admins can see all Analytics dashboards.</p>
        </div>
      </div>
    );
  }

  const assignedIds = new Set(access.map(a => a.dashboardId));
  const privateDashboards = allDashboards.filter(d => d.visibility === "private" && !assignedIds.has(d.id));

  return (
    <div className="space-y-4 py-2">
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-800 dark:text-blue-300">
        <p><strong>Company dashboards</strong> are visible to all users automatically.</p>
        <p className="mt-1">Grant access below to give this user visibility of <strong>private</strong> dashboards.</p>
      </div>

      {isLoading && <div className="h-12 bg-muted rounded animate-pulse" />}

      {!isLoading && access.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No private dashboard access yet. Grant access below.
        </div>
      )}

      {!isLoading && access.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Has Access To</p>
          {access.map(entry => (
            <div key={entry.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 min-w-0">
                <LayoutDashboard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{entry.dashboardTitle || `Dashboard #${entry.dashboardId}`}</span>
                {accessLevelBadge(entry.accessLevel)}
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Private</span>
              </div>
              <button onClick={() => removeMut.mutate(entry.dashboardId)} disabled={removeMut.isPending}
                className="text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {privateDashboards.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Grant Private Dashboard Access</p>
          <div className="flex gap-2">
            <Select value={newDashboardId} onValueChange={setNewDashboardId}>
              <SelectTrigger className="flex-1 h-8 text-sm"><SelectValue placeholder="Select dashboard" /></SelectTrigger>
              <SelectContent>
                {privateDashboards.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={newLevel} onValueChange={setNewLevel}>
              <SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCESS_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" size="sm" disabled={!newDashboardId || addMut.isPending}
            onClick={() => addMut.mutate({ dashboardId: parseInt(newDashboardId), accessLevel: newLevel })}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {addMut.isPending ? "Granting…" : "Grant Access"}
          </Button>
        </div>
      )}

      {privateDashboards.length === 0 && access.length > 0 && (
        <p className="text-xs text-muted-foreground text-center pt-1">All private dashboards have been assigned.</p>
      )}

      {allDashboards.filter(d => d.visibility === "private").length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No private dashboards exist. Dashboards set to "Company" visibility are accessible to everyone.
        </div>
      )}
    </div>
  );
}

// ── Power BI Dashboard Access ─────────────────────────────────────────────────
interface PbiAccessEntry {
  id: number; userId: number; dashboardId: number;
  dashboardName: string | null; visibility: string | null;
}

function PowerBiAccessContent({ user }: { user: CompanyUser }) {
  const { toast } = useToast();

  const { data: allPbi = [], isLoading: pbiLoading } = useQuery<PowerBiDashboard[]>({
    queryKey: ["/api/powerbi-access/available"],
    queryFn: () => apiRequest("GET", "/api/powerbi-access/available").then(r => r.json()),
  });

  const { data: access = [], isLoading: accessLoading } = useQuery<PbiAccessEntry[]>({
    queryKey: ["/api/users", user.id, "powerbi-access"],
    queryFn: () => apiRequest("GET", `/api/users/${user.id}/powerbi-access`).then(r => r.json()),
  });

  const grantMut = useMutation({
    mutationFn: (dashboardId: number) =>
      apiRequest("POST", `/api/users/${user.id}/powerbi-access`, { dashboardId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "powerbi-access"] });
      toast({ title: "Access granted" });
    },
    onError: () => toast({ title: "Failed to grant access", variant: "destructive" }),
  });

  const revokeMut = useMutation({
    mutationFn: (dashboardId: number) =>
      apiRequest("DELETE", `/api/users/${user.id}/powerbi-access/${dashboardId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "powerbi-access"] });
      toast({ title: "Access removed" });
    },
    onError: () => toast({ title: "Failed to remove access", variant: "destructive" }),
  });

  if (user.role === "admin") {
    return (
      <div className="py-6 flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <Shield className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <p className="font-medium">Admin — Full Power BI Access</p>
          <p className="text-sm text-muted-foreground">Admins can see all Power BI dashboards.</p>
        </div>
      </div>
    );
  }

  const isLoading = pbiLoading || accessLoading;
  const grantedIds = new Set(access.map(a => a.dashboardId));
  const isPending = grantMut.isPending || revokeMut.isPending;

  if (isLoading) return <div className="space-y-2 py-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}</div>;

  if (allPbi.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No Power BI dashboards have been linked yet.
      </div>
    );
  }

  return (
    <div className="space-y-1.5 py-2">
      {allPbi.map(pbi => {
        const isCompany = pbi.visibility === "company";
        const hasAccess = isCompany || grantedIds.has(pbi.id);
        return (
          <div
            key={pbi.id}
            className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
              isCompany
                ? "bg-muted/30 border-dashed"
                : hasAccess
                  ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                  : "bg-card"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isCompany ? "bg-muted" : "bg-amber-500/10"}`}>
                <LinkIcon className={`h-3.5 w-3.5 ${isCompany ? "text-muted-foreground" : "text-amber-600"}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{pbi.name}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  {isCompany
                    ? <><Globe className="h-2.5 w-2.5" /> Company — visible to everyone</>
                    : <><Lock className="h-2.5 w-2.5" /> Private</>
                  }
                </p>
              </div>
            </div>
            {isCompany ? (
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md shrink-0">Always on</span>
            ) : (
              <button
                disabled={isPending}
                onClick={() => hasAccess ? revokeMut.mutate(pbi.id) : grantMut.mutate(pbi.id)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all shrink-0 disabled:opacity-50 ${
                  hasAccess
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-red-100 hover:text-red-600"
                    : "bg-muted text-muted-foreground hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
                }`}
                data-testid={`button-pbi-access-toggle-${pbi.id}`}
              >
                {hasAccess ? <><Eye className="h-3.5 w-3.5" /> Can view</> : <><EyeOff className="h-3.5 w-3.5" /> No access</>}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DeptAccessDialog({ user, departments, isSelf, triggerLabel }: { user: CompanyUser; departments: Department[]; isSelf: boolean; triggerLabel?: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [newDeptId, setNewDeptId] = useState<string>("");
  const [newLevel, setNewLevel] = useState<string>("view");

  const { data: access = [], isLoading } = useQuery<DeptAccessEntry[]>({
    queryKey: ["/api/users", user.id, "department-access"],
    queryFn: () => apiRequest("GET", `/api/users/${user.id}/department-access`).then(r => r.json()),
    enabled: open,
  });

  const addMut = useMutation({
    mutationFn: ({ departmentId, accessLevel }: { departmentId: number; accessLevel: string }) =>
      apiRequest("POST", `/api/users/${user.id}/department-access`, { departmentId, accessLevel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "department-access"] });
      setNewDeptId(""); setNewLevel("view");
      toast({ title: "Department access added" });
    },
    onError: () => toast({ title: "Failed to add access", variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: (deptId: number) => apiRequest("DELETE", `/api/users/${user.id}/department-access/${deptId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "department-access"] });
      toast({ title: "Department access removed" });
    },
    onError: () => toast({ title: "Failed to remove access", variant: "destructive" }),
  });

  const clearAllMut = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/users/${user.id}/department-access`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "department-access"] });
      toast({ title: "Access set to All Departments" });
    },
    onError: () => toast({ title: "Failed to update access", variant: "destructive" }),
  });

  const availableDepts = departments.filter(d => !access.some(a => a.departmentId === d.id));
  const isAllDepts = !isLoading && access.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerLabel ? (
          <Button size="sm" variant="outline" className="gap-1.5"
            data-testid={`button-dept-access-${user.id}`}>
            <Shield className="h-3.5 w-3.5" />
            {triggerLabel}
          </Button>
        ) : (
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary"
            data-testid={`button-dept-access-${user.id}`} title="Manage Access Control">
            <Shield className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Access Control — {user.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-2">
            <TabsTrigger value="general" className="text-xs gap-1">
              <Building2 className="h-3.5 w-3.5" />Depts
            </TabsTrigger>
            <TabsTrigger value="scorecard" className="text-xs gap-1">
              <Target className="h-3.5 w-3.5" />Scorecard
            </TabsTrigger>
            <TabsTrigger value="dashboards" className="text-xs gap-1">
              <LayoutDashboard className="h-3.5 w-3.5" />Dashboards
            </TabsTrigger>
            <TabsTrigger value="powerbi" className="text-xs gap-1">
              <LinkIcon className="h-3.5 w-3.5" />Power BI
            </TabsTrigger>
          </TabsList>

          {/* ── General Department Access ── */}
          <TabsContent value="general" className="max-h-[420px] overflow-y-auto">
            {user.role === "admin" ? (
              <div className="py-4 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Admin — Full Access</p>
                  <p className="text-sm text-muted-foreground">Admins have unrestricted access to all departments and data.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-2">
                <p className="text-xs text-muted-foreground">Controls which execution modules (KPIs, projects, actions) this user can access.</p>
                <div className={`rounded-xl border-2 p-3 transition-colors ${isAllDepts ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "border-muted bg-muted/30"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isAllDepts ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-muted"}`}>
                        {isAllDepts ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isAllDepts ? "text-emerald-700 dark:text-emerald-400" : ""}`}>All Departments</p>
                        <p className="text-xs text-muted-foreground">{isAllDepts ? "No restrictions" : "Restricted to specific departments"}</p>
                      </div>
                    </div>
                    {!isAllDepts && !isLoading && (
                      <Button size="sm" variant="outline" className="shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 text-xs h-7"
                        onClick={() => clearAllMut.mutate()} disabled={clearAllMut.isPending} data-testid="button-grant-all-access">
                        {clearAllMut.isPending ? "…" : "Grant All"}
                      </Button>
                    )}
                  </div>
                </div>
                {isLoading && <div className="h-12 bg-muted rounded animate-pulse" />}
                {!isLoading && access.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Restricted To</p>
                    {access.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 border" data-testid={`row-dept-access-${entry.id}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate">{entry.departmentName}</span>
                          {accessLevelBadge(entry.accessLevel)}
                        </div>
                        <button onClick={() => removeMut.mutate(entry.departmentId)} disabled={removeMut.isPending}
                          className="text-muted-foreground hover:text-red-500 transition-colors shrink-0" data-testid={`button-remove-dept-access-${entry.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {availableDepts.length > 0 && (
                  <div className="space-y-2 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {isAllDepts ? "Restrict to a Specific Department" : "Add Another Department"}
                    </p>
                    <div className="flex gap-2">
                      <Select value={newDeptId} onValueChange={setNewDeptId}>
                        <SelectTrigger className="flex-1 h-8" data-testid="select-new-dept"><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>{availableDepts.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={newLevel} onValueChange={setNewLevel}>
                        <SelectTrigger className="w-28 h-8" data-testid="select-access-level"><SelectValue /></SelectTrigger>
                        <SelectContent>{ACCESS_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" size="sm" disabled={!newDeptId || addMut.isPending}
                      onClick={() => addMut.mutate({ departmentId: parseInt(newDeptId), accessLevel: newLevel })} data-testid="button-add-dept-access">
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      {addMut.isPending ? "Adding..." : "Add Department"}
                    </Button>
                  </div>
                )}
                {availableDepts.length === 0 && access.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">All departments assigned.</p>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── BSC Scorecard Access ── */}
          <TabsContent value="scorecard" className="max-h-[420px] overflow-y-auto">
            <BscDeptAccessContent user={user} />
          </TabsContent>

          {/* ── Analytics Dashboard Access ── */}
          <TabsContent value="dashboards" className="max-h-[420px] overflow-y-auto">
            <DashboardAccessContent user={user} />
          </TabsContent>

          {/* ── Power BI Dashboard Access ── */}
          <TabsContent value="powerbi" className="max-h-[420px] overflow-y-auto">
            <PowerBiAccessContent user={user} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UserManagementPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompanyUser | null>(null);
  const [memberOpen, setMemberOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<TeamMember | null>(null);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground">Only admins can manage users.</p>
      </div>
    );
  }

  const { data: users = [], isLoading: usersLoading } = useQuery<CompanyUser[]>({ queryKey: ["/api/users"] });
  const { data: members = [], isLoading: membersLoading } = useQuery<TeamMember[]>({ queryKey: ["/api/team-members"] });
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ["/api/departments"] });

  const userForm = useForm<CreateUserForm>({ defaultValues: { name: "", email: "", password: "", role: "executive" } });
  const memberForm = useForm<TeamMemberForm>({ defaultValues: { name: "", email: "", department: "", jobTitle: "" } });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      const res = await apiRequest("POST", "/api/users", data);
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setCreateOpen(false); userForm.reset();
      toast({ title: "User created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, { role });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/users"] }); toast({ title: "Role updated" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/users/${id}`);
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed"); }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/users"] }); setDeleteTarget(null); toast({ title: "User removed" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const saveMemberMutation = useMutation({
    mutationFn: async (data: TeamMemberForm) => {
      if (editMember) {
        const res = await apiRequest("PATCH", `/api/team-members/${editMember.id}`, data);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/team-members", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      setMemberOpen(false); setEditMember(null); memberForm.reset();
      toast({ title: editMember ? "Team member updated" : "Team member added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/team-members/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      setDeleteMemberTarget(null); toast({ title: "Team member removed" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openAddMember = () => {
    setEditMember(null);
    memberForm.reset({ name: "", email: "", department: "", jobTitle: "" });
    setMemberOpen(true);
  };

  const openEditMember = (m: TeamMember) => {
    setEditMember(m);
    memberForm.reset({ name: m.name, email: m.email || "", department: m.department || "", jobTitle: m.jobTitle || "" });
    setMemberOpen(true);
  };

  const roleBadge = (role: string) =>
    role === "admin" ? (
      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 gap-1"><Shield className="h-3 w-3" />Admin</Badge>
    ) : role === "team_member" ? (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 gap-1"><Pencil className="h-3 w-3" />Team Member</Badge>
    ) : (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 gap-1"><Eye className="h-3 w-3" />Executive</Badge>
    );

  const mergedPeople = useMemo(() => {
    const usedEmails = new Set<string>();
    const rows: Array<{ member?: TeamMember; user?: CompanyUser }> = [];
    for (const m of members) {
      const email = m.email?.toLowerCase();
      const linkedUser = email ? users.find(u => u.email.toLowerCase() === email) : undefined;
      rows.push({ member: m, user: linkedUser });
      if (email) usedEmails.add(email);
    }
    for (const u of users) {
      if (!usedEmails.has(u.email.toLowerCase())) rows.push({ member: undefined, user: u });
    }
    return rows;
  }, [members, users]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="People"
        description="Manage team members, login access, and department-level permissions."
      />

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">{mergedPeople.length} {mergedPeople.length === 1 ? "person" : "people"}</p>
          <div className="flex items-center gap-2">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-add-user"><UserPlus className="h-4 w-4 mr-2" />Add Login User</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
                <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit(d => createUserMutation.mutate(d))} className="space-y-4">
                    <FormField control={userForm.control} name="name" rules={{ required: "Name is required" }}
                      render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g. Sarah Al Maktoum" {...field} data-testid="input-user-name" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={userForm.control} name="email" rules={{ required: "Email is required", pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email" } }}
                      render={({ field }) => (<FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="user@company.com" {...field} data-testid="input-user-email" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={userForm.control} name="password" rules={{ required: "Password is required", minLength: { value: 6, message: "Minimum 6 characters" } }}
                      render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="Minimum 6 characters" {...field} data-testid="input-user-password" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={userForm.control} name="role"
                      render={({ field }) => (
                        <FormItem><FormLabel>Role</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl><SelectTrigger data-testid="select-user-role"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="executive"><div className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-amber-600" /><div><div className="font-medium">Executive</div><div className="text-xs text-muted-foreground">Read access (dept restrictions apply)</div></div></div></SelectItem>
                              <SelectItem value="team_member"><div className="flex items-center gap-2"><Pencil className="h-3.5 w-3.5 text-green-600" /><div><div className="font-medium">Team Member</div><div className="text-xs text-muted-foreground">Edit &amp; view (dept restrictions apply)</div></div></div></SelectItem>
                              <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-blue-600" /><div><div className="font-medium">Admin</div><div className="text-xs text-muted-foreground">Full access — all departments</div></div></div></SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    <div className="flex gap-2 pt-2">
                      <Button type="submit" disabled={createUserMutation.isPending} className="flex-1" data-testid="button-create-user">{createUserMutation.isPending ? "Creating..." : "Create User"}</Button>
                      <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            <Button onClick={openAddMember} data-testid="button-add-member"><UserPlus className="h-4 w-4 mr-2" />Add Member</Button>
          </div>
        </div>

        {usersLoading || membersLoading ? (
          <div className="space-y-1">{[1,2,3,4].map(i => <div key={i} className="h-12 rounded bg-muted animate-pulse" />)}</div>
        ) : (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <div className="w-8 shrink-0" />
                <div className="flex-1 min-w-0">Name &amp; Email</div>
                <div className="hidden sm:block w-36 shrink-0">Title / Dept</div>
                <div className="w-[140px] shrink-0">Login Role</div>
                <div className="w-32 shrink-0">Access Control</div>
                <div className="w-20 shrink-0 text-right">Actions</div>
              </div>
              {mergedPeople.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No people yet. Add team members or login users above.</div>
              ) : mergedPeople.map(({ member, user }) => {
                const name = member?.name || user?.name || "";
                const email = member?.email || user?.email || "";
                const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                const isSelf = user?.id === currentUser?.id;
                const rowKey = member ? `m-${member.id}` : `u-${user!.id}`;
                return (
                  <div key={rowKey} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 hover:bg-muted/20 transition-colors" data-testid={`card-person-${rowKey}`}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold shrink-0 ${member ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-primary/10 text-primary"}`}>{initials}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-sm">{name}</span>
                        {isSelf && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">You</Badge>}
                      </div>
                      {email && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate">{email}</span>
                        </div>
                      )}
                    </div>
                    <div className="hidden sm:block w-36 shrink-0">
                      <div className="flex flex-wrap gap-1">
                        {member?.jobTitle && <Badge variant="secondary" className="font-normal text-xs">{member.jobTitle}</Badge>}
                        {member?.department && <Badge variant="outline" className="font-normal text-xs">{member.department}</Badge>}
                      </div>
                    </div>
                    <div className="w-[140px] shrink-0">
                      {user ? (
                        isSelf ? roleBadge(user.role) : (
                          <Select value={user.role} onValueChange={role => updateRoleMutation.mutate({ id: user.id, role })}>
                            <SelectTrigger className="h-7 text-xs" data-testid={`select-role-${user.id}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="team_member">Team Member</SelectItem>
                              <SelectItem value="executive">Executive</SelectItem>
                            </SelectContent>
                          </Select>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No login access</span>
                      )}
                    </div>
                    <div className="w-32 shrink-0">
                      {user ? (
                        <DeptAccessDialog user={user} departments={departments} isSelf={isSelf} triggerLabel="Manage Access" />
                      ) : member ? (
                        <SetupMemberAccessDialog member={member} departments={departments} />
                      ) : null}
                    </div>
                    <div className="w-20 shrink-0 flex items-center justify-end gap-1">
                      {member && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditMember(member)} data-testid={`button-edit-member-${member.id}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {user && !isSelf && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(user)} data-testid={`button-delete-user-${user.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {member && !user && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteMemberTarget(member)} data-testid={`button-delete-member-${member.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <div className="space-y-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-3 border border-dashed">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-blue-600" /><span><strong>Admin</strong> — full access, all modules</span></div>
            <div className="flex items-center gap-1.5"><Pencil className="h-3.5 w-3.5 text-green-600" /><span><strong>Team Member</strong> — edit &amp; view, restrictions apply</span></div>
            <div className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-amber-600" /><span><strong>Executive</strong> — view only, restrictions apply</span></div>
          </div>
          <div className="flex flex-wrap gap-4 pt-1 border-t border-border/50">
            <div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /><span><strong>Departments</strong> — restricts KPIs, projects &amp; actions</span></div>
            <div className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5 text-muted-foreground" /><span><strong>Scorecard</strong> — restricts Balanced Scorecard departments</span></div>
            <div className="flex items-center gap-1.5"><LayoutDashboard className="h-3.5 w-3.5 text-muted-foreground" /><span><strong>Dashboards</strong> — grants access to private Analytics dashboards</span></div>
          </div>
        </div>
      </div>


      {/* Add/Edit Team Member Dialog */}
      <Dialog open={memberOpen} onOpenChange={(o) => { if (!o) { setMemberOpen(false); setEditMember(null); memberForm.reset(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editMember ? "Edit Team Member" : "Add Team Member"}</DialogTitle></DialogHeader>
          <Form {...memberForm}>
            <form onSubmit={memberForm.handleSubmit(d => saveMemberMutation.mutate(d))} className="space-y-4">
              <FormField control={memberForm.control} name="name" rules={{ required: "Name is required" }}
                render={({ field }) => (<FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input placeholder="e.g. Fatima Al Rashid" {...field} data-testid="input-member-name" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={memberForm.control} name="email"
                render={({ field }) => (<FormItem><FormLabel>Email Address <span className="text-muted-foreground font-normal">(for reminders)</span></FormLabel><FormControl><Input type="email" placeholder="fatima@company.com" {...field} data-testid="input-member-email" /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={memberForm.control} name="jobTitle"
                  render={({ field }) => (<FormItem><FormLabel>Job Title</FormLabel><FormControl><Input placeholder="e.g. HR Manager" {...field} data-testid="input-member-title" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={memberForm.control} name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select value={field.value || "none"} onValueChange={v => field.onChange(v === "none" ? "" : v)}>
                        <FormControl>
                          <SelectTrigger data-testid="select-member-dept"><SelectValue placeholder="Select department" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No department</SelectItem>
                          {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saveMemberMutation.isPending} className="flex-1" data-testid="button-save-member">
                  {saveMemberMutation.isPending ? "Saving..." : editMember ? "Save Changes" : "Add Member"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setMemberOpen(false); setEditMember(null); }}>Cancel</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}) from your company. They will no longer be able to log in.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteUserMutation.mutate(deleteTarget.id)} data-testid="button-confirm-delete-user">
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Member Confirm */}
      <AlertDialog open={!!deleteMemberTarget} onOpenChange={(o) => !o && setDeleteMemberTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>This removes <strong>{deleteMemberTarget?.name}</strong> from the team members list. Existing owner assignments will remain as text but the name won't appear in future dropdowns.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMemberTarget && deleteMemberMutation.mutate(deleteMemberTarget.id)} data-testid="button-confirm-delete-member">
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
