import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  LogIn, AlertTriangle, Users, Monitor, Smartphone, Globe, Search, TrendingUp,
  CheckCircle2, XCircle, Calendar, Loader2, Filter
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const PIE_COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#a78bfa"];

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: number | string; sub?: string; icon: any; color: string }) {
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

export default function OwnerLogins() {
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [browserFilter, setBrowserFilter] = useState("all");
  const [osFilter, setOsFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");

  const { data: stats, isLoading: statsLoading } = useQuery<any>({ queryKey: ["/api/owner/login-stats"] });
  const { data: logs = [], isLoading: logsLoading } = useQuery<any[]>({ queryKey: ["/api/owner/login-logs"] });

  const companies = useMemo(() => Array.from(new Set(logs.map((l: any) => l.companyName).filter(Boolean))).sort(), [logs]);
  const roles = useMemo(() => Array.from(new Set(logs.map((l: any) => l.userRole).filter(Boolean))).sort(), [logs]);
  const browsers = useMemo(() => Array.from(new Set(logs.map((l: any) => l.browser).filter(Boolean))).sort(), [logs]);
  const oses = useMemo(() => Array.from(new Set(logs.map((l: any) => l.os).filter(Boolean))).sort(), [logs]);
  const devices = useMemo(() => Array.from(new Set(logs.map((l: any) => l.deviceType).filter(Boolean))).sort(), [logs]);

  const filtered = useMemo(() => logs.filter((l: any) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (companyFilter !== "all" && l.companyName !== companyFilter) return false;
    if (roleFilter !== "all" && l.userRole !== roleFilter) return false;
    if (browserFilter !== "all" && l.browser !== browserFilter) return false;
    if (osFilter !== "all" && l.os !== osFilter) return false;
    if (deviceFilter !== "all" && l.deviceType !== deviceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.email?.toLowerCase().includes(q) || l.userName?.toLowerCase().includes(q) || l.companyName?.toLowerCase().includes(q) || l.ipAddress?.includes(q);
    }
    return true;
  }), [logs, search, statusFilter, companyFilter, roleFilter, browserFilter, osFilter, deviceFilter]);

  const isLoading = statsLoading || logsLoading;

  return (
    <OwnerLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white" data-testid="text-logins-title">Login Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Full login history — who logged in, when, from where, and how</p>
        </div>

        {/* Stat Cards */}
        {statsLoading ? (
          <div className="flex items-center gap-2 text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading stats...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="col-span-2">
              <StatCard label="Logins Today" value={stats?.totalToday ?? 0} sub={`${stats?.uniqueToday ?? 0} unique users`} icon={LogIn} color="bg-blue-600" />
            </div>
            <div className="col-span-2">
              <StatCard label="Logins This Week" value={stats?.totalWeek ?? 0} sub={`${stats?.uniqueWeek ?? 0} unique users`} icon={TrendingUp} color="bg-indigo-600" />
            </div>
            <div className="col-span-2">
              <StatCard label="Logins This Month" value={stats?.totalMonth ?? 0} sub="last 30 days" icon={Calendar} color="bg-violet-600" />
            </div>
            <div className="col-span-2">
              <StatCard label="Failed Logins" value={stats?.failedToday ?? 0} sub={`${stats?.failedTotal ?? 0} total`} icon={AlertTriangle} color="bg-rose-600" />
            </div>
          </div>
        )}

        {/* Charts Row */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="bg-gray-900 border-white/10 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Login Trend (Last 14 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={stats.dailyTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} labelStyle={{ color: "#e5e7eb" }} itemStyle={{ color: "#a5b4fc" }} />
                    <Line type="monotone" dataKey="success" stroke="#6366f1" strokeWidth={2} dot={false} name="Successful" />
                    <Line type="monotone" dataKey="failed" stroke="#f43f5e" strokeWidth={2} dot={false} name="Failed" />
                    <Legend formatter={(v) => <span style={{ color: "#9ca3af", fontSize: 11 }}>{v}</span>} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Logins by Company</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.byCompany?.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                    <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} itemStyle={{ color: "#a5b4fc" }} />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Logins" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Browser / OS / Device breakdowns */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "By Browser", data: stats.byBrowser },
              { title: "By OS", data: stats.byOs },
              { title: "By Device", data: stats.byDevice },
            ].map(({ title, data }, idx) => (
              <Card key={idx} className="bg-gray-900 border-white/10">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm font-medium text-gray-300">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={data || []} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={55} paddingAngle={2}>
                        {(data || []).map((_: any, i: number) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} itemStyle={{ color: "#e5e7eb" }} />
                      <Legend formatter={(v) => <span style={{ color: "#9ca3af", fontSize: 11 }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card className="bg-gray-900 border-white/10">
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
                <Input
                  placeholder="Search email, name, company, IP..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 bg-gray-800 border-white/10 text-white placeholder:text-gray-500 text-sm"
                  data-testid="input-login-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-32 bg-gray-800 border-white/10 text-sm text-gray-300" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="h-8 w-40 bg-gray-800 border-white/10 text-sm text-gray-300" data-testid="select-company-filter">
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-8 w-32 bg-gray-800 border-white/10 text-sm text-gray-300">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={browserFilter} onValueChange={setBrowserFilter}>
                <SelectTrigger className="h-8 w-32 bg-gray-800 border-white/10 text-sm text-gray-300">
                  <SelectValue placeholder="Browser" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  <SelectItem value="all">All Browsers</SelectItem>
                  {browsers.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={osFilter} onValueChange={setOsFilter}>
                <SelectTrigger className="h-8 w-32 bg-gray-800 border-white/10 text-sm text-gray-300">
                  <SelectValue placeholder="OS" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  <SelectItem value="all">All OS</SelectItem>
                  {oses.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                <SelectTrigger className="h-8 w-32 bg-gray-800 border-white/10 text-sm text-gray-300">
                  <SelectValue placeholder="Device" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/10">
                  <SelectItem value="all">All Devices</SelectItem>
                  {devices.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-500 ml-auto">{filtered.length} records</span>
            </div>
          </CardContent>
        </Card>

        {/* Login Table */}
        <Card className="bg-gray-900 border-white/10">
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading login logs...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-500 text-sm">
                <LogIn className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No login records found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {["Status", "User", "Company", "Role", "Plan", "Date & Time", "IP Address", "Browser", "OS", "Device", "Login Method"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 200).map((log: any) => (
                      <tr key={log.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3">
                          {log.status === "success" ? (
                            <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Success
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-rose-400 text-xs font-medium">
                              <XCircle className="h-3.5 w-3.5" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-white text-xs font-medium whitespace-nowrap">{log.userName || "—"}</div>
                          <div className="text-gray-500 text-xs">{log.email}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{log.companyName || "—"}</td>
                        <td className="px-4 py-3">
                          {log.userRole ? (
                            <Badge variant="outline" className="text-xs border-white/10 text-gray-400 capitalize">{log.userRole}</Badge>
                          ) : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {log.planName ? (
                            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">{log.planName}</Badge>
                          ) : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">
                          {log.loginAt ? format(new Date(log.loginAt), "MMM d, yyyy HH:mm:ss") : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono whitespace-nowrap">
                          {log.ipAddress || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{log.browser || "—"}</td>
                        <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{log.os || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-gray-400 text-xs">
                            {log.deviceType === "Mobile" ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                            {log.deviceType || "Desktop"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs border-white/10 text-gray-400">Email/Password</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length > 200 && (
                  <p className="text-center py-3 text-xs text-gray-500">Showing 200 of {filtered.length} records</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
