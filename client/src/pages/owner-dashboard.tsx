import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Building2, Users, Bot, Activity, TrendingUp, AlertCircle, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function StatCard({ title, value, sub, icon: Icon, color, onClick }: {
  title: string; value: string | number; sub?: string; icon: any; color: string; onClick?: () => void;
}) {
  return (
    <Card
      className={`bg-gray-900 border-white/10 ${onClick ? "cursor-pointer hover:border-white/20 transition-colors" : ""}`}
      onClick={onClick}
    >
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
          </div>
          <div className={`h-9 w-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
            <Icon className="h-4.5 w-4.5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const planColors: Record<string, string> = {
  Trial: "bg-gray-700 text-gray-200",
  Starter: "bg-blue-900/60 text-blue-300",
  Growth: "bg-emerald-900/60 text-emerald-300",
  Enterprise: "bg-purple-900/60 text-purple-300",
};

const roleColors: Record<string, string> = {
  admin: "bg-violet-900/50 text-violet-300",
  executive: "bg-blue-900/50 text-blue-300",
  member: "bg-gray-700/60 text-gray-300",
};

export default function OwnerDashboard() {
  const [showUsers, setShowUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/dashboard"],
  });

  const filteredUsers = (stats?.allUsers || []).filter((u: any) =>
    !userSearch ||
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.companyName?.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <OwnerLayout>
        <div className="p-8 flex items-center justify-center h-full">
          <div className="text-gray-400 text-sm">Loading dashboard...</div>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white" data-testid="text-owner-dashboard-title">Platform Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Overview of all companies and usage</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Companies" value={stats?.totalCompanies ?? 0} icon={Building2} color="bg-blue-600" sub="Registered" />
          <StatCard title="Active Today" value={stats?.activeCompanies ?? 0} icon={TrendingUp} color="bg-emerald-600" sub="With AI usage" />
          <StatCard
            title="Total Users"
            value={stats?.totalUsers ?? 0}
            icon={Users}
            color="bg-violet-600"
            sub="Click to view all"
            onClick={() => setShowUsers(true)}
            data-testid="card-total-users"
          />
          <StatCard title="AI Requests Today" value={stats?.aiRequestsToday ?? 0} icon={Bot} color="bg-amber-600" sub="All companies" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gray-900 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                Recent Companies
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {(!stats?.recentCompanies || stats.recentCompanies.length === 0) ? (
                <p className="text-sm text-gray-500 px-5 pb-4">No companies yet</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {stats.recentCompanies.slice(0, 6).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between px-5 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{c.name}</p>
                        <p className="text-xs text-gray-500 truncate">{c.email || `${c.userCount} user${c.userCount !== 1 ? "s" : ""}`}{c.industry ? ` · ${c.industry}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <span className="text-xs text-gray-500">{c.userCount}u</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColors[c.planName] || planColors.Trial}`}>
                          {c.planName || "Trial"}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === "Active" ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
                          {c.status || "Active"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-400" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {(!stats?.recentActivity || stats.recentActivity.length === 0) ? (
                <p className="text-sm text-gray-500 px-5 pb-4">No activity yet</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {stats.recentActivity.slice(0, 6).map((a: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-2.5">
                      <div className="h-6 w-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300 flex-shrink-0 mt-0.5">
                        {a.userName?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white">
                          <span className="font-medium">{a.userName}</span>
                          {" · "}
                          <span className="text-gray-400">{a.action}</span>
                        </p>
                        <p className="text-xs text-gray-600 truncate">{a.details}</p>
                      </div>
                      <p className="text-xs text-gray-600 flex-shrink-0">
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-white/10 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Bot className="h-4 w-4 text-gray-400" />
                Today's AI Usage by Company
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {(!stats?.aiUsageByCompany || stats.aiUsageByCompany.length === 0) ? (
                <p className="text-sm text-gray-500 px-5 pb-4">No AI usage today</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {stats.aiUsageByCompany.map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-2.5">
                      <p className="text-sm text-white font-medium w-40 truncate">{c.companyName}</p>
                      <div className="flex-1 bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (c.count / (c.dailyLimit || 75)) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 w-16 text-right">{c.count} / {c.dailyLimit || 75}</p>
                      {c.count >= (c.dailyLimit || 75) && (
                        <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Users Dialog */}
      <Dialog open={showUsers} onOpenChange={open => { setShowUsers(open); if (!open) setUserSearch(""); }}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-400" />
              All Users
              <span className="text-sm font-normal text-gray-400 ml-1">({stats?.totalUsers ?? 0} total)</span>
            </DialogTitle>
          </DialogHeader>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <Input
              placeholder="Search by name, email or company..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="pl-8 bg-gray-800 border-white/10 text-white placeholder:text-gray-500 text-sm h-8"
              data-testid="input-user-search"
            />
          </div>

          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            <div className="divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No users found</p>
              ) : (
                filteredUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-3 py-2.5" data-testid={`row-user-${u.id}`}>
                    <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-200 flex-shrink-0">
                      {u.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate" data-testid={`text-user-name-${u.id}`}>{u.name}</p>
                      <p className="text-xs text-gray-400 truncate" data-testid={`text-user-email-${u.id}`}>{u.email}</p>
                      {u.companyName && (
                        <p className="text-xs text-gray-600 truncate">{u.companyName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${roleColors[u.role] || roleColors.member}`}>
                        {u.role}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
}
