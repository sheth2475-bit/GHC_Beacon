import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield, Eye, Mail, User, Users, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { TeamMember } from "@shared/schema";

interface CompanyUser {
  id: number;
  name: string;
  email: string;
  role: string;
  companyId: number | null;
  createdAt: string;
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
    ) : (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 gap-1"><Eye className="h-3 w-3" />Executive</Badge>
    );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="User Management"
        description="Manage login users and team members for your Performo AI workspace."
      />

      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users" data-testid="tab-users"><User className="h-4 w-4 mr-2" />Login Users</TabsTrigger>
          <TabsTrigger value="members" data-testid="tab-members"><Users className="h-4 w-4 mr-2" />Team Members</TabsTrigger>
        </TabsList>

        {/* ── Login Users Tab ── */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{users.length} user{users.length !== 1 ? "s" : ""} with login access</p>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-user"><UserPlus className="h-4 w-4 mr-2" />Add User</Button>
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
                              <SelectItem value="executive"><div className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-amber-600" /><div><div className="font-medium">Executive</div><div className="text-xs text-muted-foreground">Read-only access</div></div></div></SelectItem>
                              <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-blue-600" /><div><div className="font-medium">Admin</div><div className="text-xs text-muted-foreground">Full access</div></div></div></SelectItem>
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
          </div>

          {usersLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2">
              {users.map(u => {
                const isSelf = u.id === currentUser?.id;
                const initials = u.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <Card key={u.id} data-testid={`card-user-${u.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary shrink-0">{initials}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm" data-testid={`text-user-name-${u.id}`}>{u.name}</span>
                            {isSelf && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">You</Badge>}
                            {roleBadge(u.role)}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate" data-testid={`text-user-email-${u.id}`}>{u.email}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!isSelf && (
                            <Select value={u.role} onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role })}>
                              <SelectTrigger className="h-8 w-32 text-xs" data-testid={`select-role-${u.id}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="executive">Executive</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {!isSelf && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(u)} data-testid={`button-delete-user-${u.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="bg-muted/40 border-dashed">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0"><Shield className="h-4 w-4 text-blue-600" /></div>
                  <div><p className="font-medium text-sm">Admin</p><p className="text-xs text-muted-foreground">Full access — manage KPIs, actions, settings, and users.</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0"><Eye className="h-4 w-4 text-amber-600" /></div>
                  <div><p className="font-medium text-sm">Executive</p><p className="text-xs text-muted-foreground">Read-only — view dashboards, KPIs, actions, and reviews.</p></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Team Members Tab ── */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{members.length} team member{members.length !== 1 ? "s" : ""} — used as owners/assignees across the platform</p>
            <Button onClick={openAddMember} data-testid="button-add-member"><UserPlus className="h-4 w-4 mr-2" />Add Member</Button>
          </div>

          {membersLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : members.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium mb-1">No team members yet</p>
                <p className="text-sm text-muted-foreground mb-4">Add team members here so their names appear as owner/assignee options across the platform. Adding their email allows automated reminders to be sent directly to them.</p>
                <Button onClick={openAddMember}><UserPlus className="h-4 w-4 mr-2" />Add First Member</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {members.map(m => {
                const initials = m.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <Card key={m.id} data-testid={`card-member-${m.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-sm font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">{initials}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm" data-testid={`text-member-name-${m.id}`}>{m.name}</span>
                            {m.jobTitle && <Badge variant="secondary" className="font-normal text-xs">{m.jobTitle}</Badge>}
                            {m.department && <Badge variant="outline" className="font-normal text-xs">{m.department}</Badge>}
                          </div>
                          {m.email ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground" data-testid={`text-member-email-${m.id}`}>{m.email}</span>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground/60 mt-0.5 italic">No email — reminders will go to admins only</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditMember(m)} data-testid={`button-edit-member-${m.id}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteMemberTarget(m)} data-testid={`button-delete-member-${m.id}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">How team members are used</p>
              <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
                <li>Their names appear in owner/assignee dropdowns across KPIs, projects, initiatives, and action items</li>
                <li>When a verified email domain is configured, automated reminders are sent directly to their email</li>
                <li>Members without an email will still appear in dropdowns — reminders go to admin users instead</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                  render={({ field }) => (<FormItem><FormLabel>Department</FormLabel><FormControl><Input placeholder="e.g. HR" {...field} data-testid="input-member-dept" /></FormControl><FormMessage /></FormItem>)} />
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
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
