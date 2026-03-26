import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Users, Search, LogIn, Activity, Bot, Monitor, Globe, ChevronRight, User, Building2, Calendar, Clock, Wifi, AlertTriangle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const roleColors: Record<string, string> = {
  admin: "border-violet-500/40 text-violet-400",
  team_member: "border-blue-500/40 text-blue-400",
  executive: "border-amber-500/40 text-amber-400",
};

const planColors: Record<string, string> = {
  Trial: "border-gray-600 text-gray-400",
  Starter: "border-blue-500/40 text-blue-400",
  Growth: "border-emerald-500/40 text-emerald-400",
  Enterprise: "border-violet-500/40 text-violet-400",
};

const MODULE_LABELS: Record<string, string> = {
  kpis: "KPI Tracker", actions: "Actions", initiatives: "Initiatives",
  assistant: "AI Assistant", analytics: "Analytics Studio", settings: "Settings", other: "Other",
};

const ACTION_LABELS: Record<string, string> = {
  create_kpi: "Created KPI", update_kpi: "Updated KPI", delete_kpi: "Deleted KPI",
  create_action: "Created Action", update_action: "Updated Action",
  create_project: "Created Initiative", update_project: "Updated Initiative", delete_project: "Deleted Initiative",
  create_task: "Created Task", update_task: "Updated Task", ai_request: "Used AI", key_activation: "Activated Key",
};

function UserDrillDown({ userId, onClose }: { userId: number; onClose: () => void }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: [`/api/owner/users/${userId}/profile`],
  });

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading user profile...
          </div>
        ) : !data ? (
          <div className="text-center py-16 text-gray-500">User not found</div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-white text-lg">User Profile</DialogTitle>
            </DialogHeader>

            {/* User Info */}
            <div className="flex items-start gap-4 p-4 bg-gray-800/50 rounded-xl border border-white/10">
              <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                {data.user?.name?.[0] || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-semibold">{data.user?.name}</h3>
                  <Badge variant="outline" className={`text-xs ${roleColors[data.user?.role] || "border-gray-600 text-gray-400"} capitalize`}>{data.user?.role}</Badge>
                </div>
                <p className="text-gray-400 text-sm">{data.user?.email}</p>
                {data.company && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500 flex items-center gap-1"><Building2 className="h-3 w-3" />{data.company.name}</span>
                    <span className="text-xs text-gray-500">·</span>
                    <Badge variant="outline" className={`text-xs ${planColors[data.company.planName] || ""}`}>{data.company.planName}</Badge>
                    <span className="text-xs text-gray-500">·</span>
                    <span className="text-xs text-gray-500">{data.company.country}</span>
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-0.5">Member since {data.user?.createdAt ? format(new Date(data.user.createdAt), "MMM d, yyyy") : "—"}</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Logins", value: data.stats?.totalLogins ?? 0, icon: LogIn, color: "text-blue-400" },
                { label: "Failed Logins", value: data.stats?.failedLogins ?? 0, icon: AlertTriangle, color: "text-rose-400" },
                { label: "Total Actions", value: data.stats?.totalActions ?? 0, icon: Activity, color: "text-indigo-400" },
                { label: "AI Queries", value: data.stats?.aiUsage ?? 0, icon: Bot, color: "text-amber-400" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-gray-800/60 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Login Details</h4>
                <div className="bg-gray-800/40 rounded-lg p-3 space-y-2 border border-white/5">
                  <InfoRow icon={Clock} label="Last Login" value={data.stats?.lastLogin ? formatDistanceToNow(new Date(data.stats.lastLogin), { addSuffix: true }) : "Never"} />
                  <InfoRow icon={Activity} label="Last Activity" value={data.stats?.lastActivity ? formatDistanceToNow(new Date(data.stats.lastActivity), { addSuffix: true }) : "Never"} />
                  <InfoRow icon={Monitor} label="Browser" value={data.stats?.preferredBrowser || "—"} />
                  <InfoRow icon={Globe} label="OS" value={data.stats?.preferredOs || "—"} />
                  <InfoRow icon={Monitor} label="Device" value={data.stats?.preferredDevice || "—"} />
                </div>
                {data.stats?.ipHistory?.length > 0 && (
                  <div className="bg-gray-800/40 rounded-lg p-3 border border-white/5">
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Wifi className="h-3 w-3" /> IP History</p>
                    {data.stats.ipHistory.slice(0, 5).map((ip: string, i: number) => (
                      <p key={i} className="text-xs font-mono text-gray-300 py-0.5">{ip}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Module Usage</h4>
                <div className="bg-gray-800/40 rounded-lg p-3 border border-white/5 space-y-2">
                  {(data.moduleUsage || []).slice(0, 6).map((m: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-300 flex-1">{MODULE_LABELS[m.module] || m.module}</span>
                      <div className="w-16 h-1.5 bg-gray-700 rounded-full">
                        <div className="h-1.5 bg-indigo-500 rounded-full" style={{ width: `${Math.min((m.count / (data.moduleUsage[0]?.count || 1)) * 100, 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-6 text-right">{m.count}</span>
                    </div>
                  ))}
                  {(!data.moduleUsage || data.moduleUsage.length === 0) && (
                    <p className="text-xs text-gray-600">No module activity recorded</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Recent Activity</h4>
              <div className="bg-gray-800/40 rounded-lg border border-white/5 overflow-hidden">
                {(data.recentActivity || []).slice(0, 10).length === 0 ? (
                  <p className="text-xs text-gray-600 p-3">No activity recorded yet</p>
                ) : (
                  data.recentActivity.slice(0, 10).map((log: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-2.5 border-b border-white/5 last:border-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 truncate">
                          <span className="text-gray-500 mr-1">{ACTION_LABELS[log.activityType] || log.activityType?.replace(/_/g, " ")}</span>
                          {log.details && <span className="text-gray-400">{log.details}</span>}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">{log.moduleName && `${MODULE_LABELS[log.moduleName] || log.moduleName} · `}{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Logins */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Recent Login Sessions</h4>
              <div className="bg-gray-800/40 rounded-lg border border-white/5 overflow-hidden">
                {(data.recentLogins || []).slice(0, 8).length === 0 ? (
                  <p className="text-xs text-gray-600 p-3">No login sessions recorded</p>
                ) : (
                  data.recentLogins.slice(0, 8).map((log: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0">
                      <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${log.status === "success" ? "bg-emerald-500" : "bg-rose-500"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-medium ${log.status === "success" ? "text-emerald-400" : "text-rose-400"} capitalize`}>{log.status}</span>
                          {log.browser && <span className="text-xs text-gray-500">{log.browser}</span>}
                          {log.os && <span className="text-xs text-gray-500">· {log.os}</span>}
                          {log.ipAddress && <span className="text-xs font-mono text-gray-600">{log.ipAddress}</span>}
                        </div>
                        <p className="text-xs text-gray-600">{log.loginAt ? format(new Date(log.loginAt), "MMM d, yyyy HH:mm:ss") : "—"}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
      <span className="text-xs text-gray-500 w-24 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-300 truncate">{value}</span>
    </div>
  );
}

export default function OwnerUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"totalActions" | "totalLogins" | "aiUsage">("totalActions");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: users = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/owner/users"] });

  const filtered = useMemo(() => {
    let list = [...users];
    if (roleFilter !== "all") list = list.filter(u => u.role === roleFilter);
    if (planFilter !== "all") list = list.filter(u => u.planName === planFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.companyName?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
  }, [users, roleFilter, planFilter, search, sortBy]);

  return (
    <OwnerLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white" data-testid="text-users-title">All Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">Every user across all companies — click any row to view their full activity profile</p>
        </div>

        {/* Summary stats */}
        {!isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-gray-900 border-white/10">
              <CardContent className="pt-4 pb-4 px-5">
                <p className="text-xs text-gray-500 uppercase">Total Users</p>
                <p className="text-2xl font-bold text-white mt-1">{users.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-white/10">
              <CardContent className="pt-4 pb-4 px-5">
                <p className="text-xs text-gray-500 uppercase">Active Today</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{users.filter((u: any) => u.actionsToday > 0).length}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-white/10">
              <CardContent className="pt-4 pb-4 px-5">
                <p className="text-xs text-gray-500 uppercase">Total Logins</p>
                <p className="text-2xl font-bold text-indigo-400 mt-1">{users.reduce((s: number, u: any) => s + (u.totalLogins || 0), 0)}</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-white/10">
              <CardContent className="pt-4 pb-4 px-5">
                <p className="text-xs text-gray-500 uppercase">AI Usage (Total)</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{users.reduce((s: number, u: any) => s + (u.aiUsage || 0), 0)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
            <Input
              placeholder="Search name, email, company..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 bg-gray-800 border-white/10 text-white placeholder:text-gray-500 text-sm"
              data-testid="input-users-search"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-8 w-36 bg-gray-800 border-white/10 text-sm text-gray-300">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-white/10">
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="team_member">Team Member</SelectItem>
              <SelectItem value="executive">Executive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="h-8 w-32 bg-gray-800 border-white/10 text-sm text-gray-300">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-white/10">
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="Trial">Trial</SelectItem>
              <SelectItem value="Starter">Starter</SelectItem>
              <SelectItem value="Growth">Growth</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="h-8 w-40 bg-gray-800 border-white/10 text-sm text-gray-300">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-white/10">
              <SelectItem value="totalActions">Most Actions</SelectItem>
              <SelectItem value="totalLogins">Most Logins</SelectItem>
              <SelectItem value="aiUsage">Most AI Usage</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-gray-500 ml-auto">{filtered.length} users</span>
        </div>

        {/* Users Table */}
        <Card className="bg-gray-900 border-white/10">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading users...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-500 text-sm">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />No users found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {["User", "Company", "Role", "Plan", "Logins", "Actions Today", "Actions Week", "AI Usage", "Last Login", "Last Active", "Browser", ""].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 100).map((u: any) => (
                      <tr
                        key={u.id}
                        className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer"
                        onClick={() => setSelectedUserId(u.id)}
                        data-testid={`row-user-${u.id}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-indigo-700/50 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">
                              {u.name?.[0] || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white text-xs font-medium whitespace-nowrap">{u.name}</p>
                              <p className="text-gray-500 text-xs">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{u.companyName || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-xs ${roleColors[u.role] || "border-gray-600 text-gray-400"} capitalize`}>{u.role}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-xs ${planColors[u.planName] || "border-gray-600 text-gray-400"}`}>{u.planName}</Badge>
                        </td>
                        <td className="px-4 py-3 text-indigo-400 font-mono text-sm">{u.totalLogins}</td>
                        <td className="px-4 py-3 text-emerald-400 font-mono text-sm">{u.actionsToday}</td>
                        <td className="px-4 py-3 text-blue-400 font-mono text-sm">{u.actionsWeek}</td>
                        <td className="px-4 py-3 text-amber-400 font-mono text-sm">{u.aiUsage}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {u.lastLogin ? formatDistanceToNow(new Date(u.lastLogin), { addSuffix: true }) : "Never"}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {u.lastActivity ? formatDistanceToNow(new Date(u.lastActivity), { addSuffix: true }) : "Never"}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{u.preferredBrowser || "—"} · {u.preferredOs || "—"}</td>
                        <td className="px-4 py-3">
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length > 100 && (
                  <p className="text-center py-3 text-xs text-gray-500">Showing 100 of {filtered.length} users</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedUserId && (
          <UserDrillDown userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
        )}
      </div>
    </OwnerLayout>
  );
}
