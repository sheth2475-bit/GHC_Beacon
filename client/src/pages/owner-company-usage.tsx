import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Users, Activity, Bot, LogIn, Search, TrendingUp, Shield } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";

const planColors: Record<string, string> = {
  Trial: "border-gray-600 text-gray-400",
  Starter: "border-blue-500/40 text-blue-400",
  Growth: "border-emerald-500/40 text-emerald-400",
  Enterprise: "border-violet-500/40 text-violet-400",
};

const statusColors: Record<string, string> = {
  "Trial Active": "bg-gray-800 text-gray-300",
  "Active": "bg-emerald-900/40 text-emerald-400",
  "Suspended": "bg-rose-900/40 text-rose-400",
  "Expired": "bg-amber-900/40 text-amber-400",
};

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <Card className="bg-gray-900 border-white/10">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
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

export default function OwnerCompanyUsage() {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"totalActions" | "totalLogins" | "activeUsersWeek" | "aiUsageTotal">("totalActions");

  const { data: companies = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/owner/company-usage"] });

  const filtered = useMemo(() => {
    let list = [...companies];
    if (planFilter !== "all") list = list.filter(c => c.planName === planFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name?.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q) || c.country?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
  }, [companies, planFilter, search, sortBy]);

  const topByAction = [...companies].sort((a, b) => b.totalActions - a.totalActions).slice(0, 6);
  const topByLogin = [...companies].sort((a, b) => b.totalLogins - a.totalLogins).slice(0, 6);

  const totalUsers = companies.reduce((s, c) => s + (c.totalUsers || 0), 0);
  const totalActiveToday = companies.reduce((s, c) => s + (c.activeUsersToday || 0), 0);
  const totalLogins = companies.reduce((s, c) => s + (c.totalLogins || 0), 0);
  const totalAi = companies.reduce((s, c) => s + (c.aiUsageTotal || 0), 0);

  return (
    <OwnerLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white" data-testid="text-company-usage-title">Company Usage</h1>
          <p className="text-sm text-gray-400 mt-0.5">Adoption and engagement across all companies</p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Companies" value={companies.length} sub="across all plans" icon={Building2} color="bg-blue-600" />
              <StatCard label="Total Users" value={totalUsers} sub="registered" icon={Users} color="bg-indigo-600" />
              <StatCard label="Active Today" value={totalActiveToday} sub="unique users" icon={Activity} color="bg-emerald-600" />
              <StatCard label="Total Logins" value={totalLogins} sub="all time" icon={LogIn} color="bg-violet-600" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-gray-900 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Top Companies by Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={topByAction.map(c => ({ name: c.name.slice(0, 16), total: c.totalActions }))} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                      <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} itemStyle={{ color: "#a5b4fc" }} />
                      <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} name="Actions">
                        <LabelList dataKey="total" position="right" style={{ fontSize: 9, fill: "#e5e7eb", fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Top Companies by Logins</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={topByLogin.map(c => ({ name: c.name.slice(0, 16), logins: c.totalLogins }))} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                      <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} itemStyle={{ color: "#a5b4fc" }} />
                      <Bar dataKey="logins" fill="#22d3ee" radius={[0, 4, 4, 0]} name="Logins">
                        <LabelList dataKey="logins" position="right" style={{ fontSize: 9, fill: "#e5e7eb", fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
                <Input
                  placeholder="Search company, industry, country..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 bg-gray-800 border-white/10 text-white placeholder:text-gray-500 text-sm"
                  data-testid="input-company-search"
                />
              </div>
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
                  <SelectItem value="activeUsersWeek">Most Active (Week)</SelectItem>
                  <SelectItem value="aiUsageTotal">Most AI Usage</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-500 ml-auto">{filtered.length} companies</span>
            </div>

            {/* Company Cards */}
            <div className="space-y-3">
              {filtered.map((c: any) => (
                <Card key={c.id} className="bg-gray-900 border-white/10 hover:border-white/20 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-lg bg-gray-800 border border-white/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-white font-semibold text-sm">{c.name}</h3>
                              <Badge variant="outline" className={`text-xs ${planColors[c.planName] || "border-gray-600 text-gray-400"}`}>{c.planName}</Badge>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[c.status] || "bg-gray-800 text-gray-300"}`}>{c.status}</span>
                            </div>
                            <div className="flex gap-3 mt-0.5 flex-wrap">
                              <span className="text-xs text-gray-500">{c.industry}</span>
                              <span className="text-xs text-gray-500">·</span>
                              <span className="text-xs text-gray-500">{c.country}</span>
                              {c.lastActivity && (
                                <>
                                  <span className="text-xs text-gray-500">·</span>
                                  <span className="text-xs text-gray-500">Last active {formatDistanceToNow(new Date(c.lastActivity), { addSuffix: true })}</span>
                                </>
                              )}
                            </div>
                            {c.topModules?.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                <span className="text-xs text-gray-600">Top modules:</span>
                                {c.topModules.map((m: string) => (
                                  <span key={m} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{m}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 md:grid-cols-6 gap-3 flex-shrink-0">
                        {[
                          { label: "Users", value: c.totalUsers, color: "text-white" },
                          { label: "Active Today", value: c.activeUsersToday, color: "text-emerald-400" },
                          { label: "Active Week", value: c.activeUsersWeek, color: "text-blue-400" },
                          { label: "Logins", value: c.totalLogins, color: "text-indigo-400" },
                          { label: "Actions", value: c.totalActions, color: "text-violet-400" },
                          { label: "AI Usage", value: c.aiUsageTotal, color: "text-amber-400" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="text-center">
                            <p className={`text-base font-bold ${color}`}>{value ?? 0}</p>
                            <p className="text-xs text-gray-600 mt-0.5 leading-tight">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </OwnerLayout>
  );
}
