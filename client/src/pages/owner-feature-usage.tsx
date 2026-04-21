import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart2, Bot, TrendingUp, Activity, Users } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const PIE_COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#a78bfa", "#fb923c", "#34d399"];

const MODULE_LABELS: Record<string, string> = {
  kpis: "KPI Tracker",
  actions: "Action Tracker",
  initiatives: "Initiatives",
  assistant: "AI Assistant",
  analytics: "Analytics Studio",
  settings: "Settings",
  other: "Other",
};

const ACTION_LABELS: Record<string, string> = {
  create_kpi: "Create KPI",
  update_kpi: "Update KPI",
  delete_kpi: "Delete KPI",
  create_action: "Create Action",
  update_action: "Update Action",
  create_project: "Create Initiative",
  update_project: "Update Initiative",
  delete_project: "Delete Initiative",
  create_task: "Create Task",
  update_task: "Update Task",
  ai_request: "AI Query",
  key_activation: "Key Activation",
};

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

export default function OwnerFeatureUsage() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/owner/feature-usage"] });

  if (isLoading) {
    return (
      <OwnerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-gray-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading feature usage...</div>
        </div>
      </OwnerLayout>
    );
  }

  const { moduleStats = [], actionStats = [], dailyActivity = [], topUsers = [], totalActions = 0, actionsToday = 0, actionsWeek = 0, actionsMonth = 0 } = data || {};

  const chartModules = moduleStats.slice(0, 8).map((m: any) => ({
    name: MODULE_LABELS[m.module] || m.module,
    total: m.total,
    week: m.week,
    today: m.today,
  }));

  const chartActions = actionStats.slice(0, 8).map((a: any) => ({
    name: ACTION_LABELS[a.action] || a.action.replace(/_/g, " "),
    count: a.count,
  }));

  return (
    <OwnerLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white" data-testid="text-feature-usage-title">Feature Usage Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Which features are being used most across all companies</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Actions" value={totalActions} sub="all time" icon={Activity} color="bg-indigo-600" />
          <StatCard label="Actions Today" value={actionsToday} sub="since midnight" icon={TrendingUp} color="bg-blue-600" />
          <StatCard label="Actions This Week" value={actionsWeek} sub="last 7 days" icon={BarChart2} color="bg-violet-600" />
          <StatCard label="Actions This Month" value={actionsMonth} sub="last 30 days" icon={Users} color="bg-emerald-600" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-gray-900 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Daily Activity (Last 14 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyActivity} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} itemStyle={{ color: "#a5b4fc" }} />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} name="Actions">
                    <LabelList dataKey="count" position="top" style={{ fontSize: 9, fill: "#e5e7eb", fontWeight: 700 }} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Module Usage (Total)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartModules} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} itemStyle={{ color: "#a5b4fc" }} />
                  <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} name="Total">
                    <LabelList dataKey="total" position="top" style={{ fontSize: 9, fill: "#e5e7eb", fontWeight: 700 }} />
                  </Bar>
                  <Bar dataKey="week" fill="#22d3ee" radius={[4, 4, 0, 0]} name="This Week">
                    <LabelList dataKey="week" position="top" style={{ fontSize: 9, fill: "#e5e7eb", fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Action Breakdown + Module Pie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-gray-900 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Top Actions Performed</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartActions} layout="vertical" margin={{ top: 0, right: 8, left: 20, bottom: 0 }}>
                  <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} itemStyle={{ color: "#a5b4fc" }} />
                  <Bar dataKey="count" fill="#a78bfa" radius={[0, 4, 4, 0]} name="Count">
                    <LabelList dataKey="count" position="right" style={{ fontSize: 9, fill: "#e5e7eb", fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Module Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={moduleStats.slice(0, 7).map((m: any) => ({ name: MODULE_LABELS[m.module] || m.module, value: m.total }))}
                    dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={2} label={({ value }) => value} labelLine={false}
                  >
                    {moduleStats.slice(0, 7).map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} itemStyle={{ color: "#e5e7eb" }} />
                  <Legend formatter={(v) => <span style={{ color: "#9ca3af", fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Module Stats Table */}
        <Card className="bg-gray-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Module Usage Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {["Module", "Today", "This Week", "This Month", "All Time", "Trend"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {moduleStats.map((m: any, i: number) => {
                  const weekPct = m.total > 0 ? Math.round((m.week / m.total) * 100) : 0;
                  return (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-5 py-3 text-white font-medium">{MODULE_LABELS[m.module] || m.module}</td>
                      <td className="px-5 py-3 text-blue-400 font-mono text-sm">{m.today}</td>
                      <td className="px-5 py-3 text-indigo-400 font-mono text-sm">{m.week}</td>
                      <td className="px-5 py-3 text-gray-300 font-mono text-sm">{m.total}</td>
                      <td className="px-5 py-3 text-gray-400 font-mono text-sm">{m.total}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-800 rounded-full max-w-20">
                            <div className="h-1.5 bg-indigo-500 rounded-full" style={{ width: `${Math.min(weekPct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{weekPct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Top Active Users */}
        <Card className="bg-gray-900 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Most Active Users (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {["#", "User", "Company", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topUsers.map((u: any, i: number) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3 text-gray-500 text-sm font-mono">{i + 1}</td>
                    <td className="px-5 py-3 text-white text-sm font-medium">{u.name}</td>
                    <td className="px-5 py-3 text-gray-400 text-sm">{u.companyName || "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full max-w-24">
                          <div className="h-1.5 bg-indigo-500 rounded-full" style={{ width: `${Math.min((u.count / (topUsers[0]?.count || 1)) * 100, 100)}%` }} />
                        </div>
                        <span className="text-sm font-mono text-indigo-400">{u.count}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
