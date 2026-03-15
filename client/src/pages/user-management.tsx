import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield, Eye, Mail, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

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

export default function UserManagementPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompanyUser | null>(null);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground">Only admins can manage users.</p>
      </div>
    );
  }

  const { data: users = [], isLoading } = useQuery<CompanyUser[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<CreateUserForm>({
    defaultValues: { name: "", email: "", password: "", role: "executive" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateUserForm) => {
      const res = await apiRequest("POST", "/api/users", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setCreateOpen(false);
      form.reset();
      toast({ title: "User created", description: "The new user can now log in with their credentials." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, { role });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update role");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Role updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/users/${id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeleteTarget(null);
      toast({ title: "User removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const onCreateSubmit = (data: CreateUserForm) => {
    createMutation.mutate(data);
  };

  const roleBadge = (role: string) =>
    role === "admin" ? (
      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 gap-1">
        <Shield className="h-3 w-3" />
        Admin
      </Badge>
    ) : (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 gap-1">
        <Eye className="h-3 w-3" />
        Executive
      </Badge>
    );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="User Management"
        description="Manage who has access to your company's Performo AI workspace."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-user">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: "Name is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Sarah Al Maktoum" {...field} data-testid="input-user-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    rules={{ required: "Email is required", pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email" } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="user@company.com" {...field} data-testid="input-user-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    rules={{ required: "Password is required", minLength: { value: 6, message: "Minimum 6 characters" } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Minimum 6 characters" {...field} data-testid="input-user-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-user-role">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="executive">
                              <div className="flex items-center gap-2">
                                <Eye className="h-3.5 w-3.5 text-amber-600" />
                                <div>
                                  <div className="font-medium">Executive</div>
                                  <div className="text-xs text-muted-foreground">Read-only access to dashboards and reports</div>
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-3.5 w-3.5 text-blue-600" />
                                <div>
                                  <div className="font-medium">Admin</div>
                                  <div className="text-xs text-muted-foreground">Full access to manage data and settings</div>
                                </div>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={createMutation.isPending} className="flex-1" data-testid="button-create-user">
                      {createMutation.isPending ? "Creating..." : "Create User"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <span>{users.length} {users.length === 1 ? "user" : "users"} in your company</span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No users found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id;
              const initials = u.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <Card key={u.id} data-testid={`card-user-${u.id}`} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary shrink-0">
                        {initials}
                      </div>
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
                          <Select
                            value={u.role}
                            onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role })}
                          >
                            <SelectTrigger className="h-8 w-32 text-xs" data-testid={`select-role-${u.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="executive">Executive</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {!isSelf && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(u)}
                            data-testid={`button-delete-user-${u.id}`}
                          >
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
      </div>

      <Card className="bg-muted/40 border-dashed">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0 mt-0.5">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Admin</p>
                <p className="text-xs text-muted-foreground">Full access — manage KPIs, meetings, actions, settings, and users. Can add and remove data.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0 mt-0.5">
                <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Executive</p>
                <p className="text-xs text-muted-foreground">Read-only access — view dashboards, KPIs, actions, and monthly reviews. Cannot modify data.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}) from your company. They will no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              data-testid="button-confirm-delete-user"
            >
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
