import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Search, Loader2, Bot, LogIn, Key, Settings,
  PlusCircle, PencilLine, Trash2, UploadCloud, BarChart2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";

const ACTION_META: Record<string, { label: string; icon: JSX.Element; color: string }> = {
  login: { label: "Login", icon: <LogIn className="h-3.5 w-3.5 text-blue-400" />, color: "bg-blue-900/30 text-blue-400" },
  ai_request: { label: "AI Query", icon: <Bot className="h-3.5 w-3.5 text-purple-400" />, color: "bg-purple-900/30 text-purple-400" },
  key_activation: { label: "Key Activated", icon: <Key className="h-3.5 w-3.5 text-amber-400" />, color: "bg-amber-900/30 text-amber-400" },
  create_kpi: { label: "Created KPI", icon: <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />, color: "bg-emerald-900/30 text-emerald-400" },
  update_kpi: { label: "Updated KPI", icon: <PencilLine className="h-3.5 w-3.5 text-sky-400" />, color: "bg-sky-900/30 text-sky-400" },
  delete_kpi: { label: "Deleted KPI", icon: <Trash2 className="h-3.5 w-3.5 text-rose-400" />, color: "bg-rose-900/30 text-rose-400" },
  create_action: { label: "Created Action", icon: <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />, color: "bg-emerald-900/30 text-emerald-400" },
  update_action: { label: "Updated Action", icon: <PencilLine className="h-3.5 w-3.5 text-sky-400" />, color: "bg-sky-900/30 text-sky-400" },
  create_project: { label: "Created Initiative", icon: <PlusCircle className="h-3.5 w-3.5 text-violet-400" />, color: "bg-violet-900/30 text-violet-400" },
  update_project: { label: "Updated Initiative", icon: <PencilLine className="h-3.5 w-3.5 text-indigo-400" />, color: "bg-indigo-900/30 text-indigo-400" },
  delete_project: { label: "Deleted Initiative", icon: <Trash2 className="h-3.5 w-3.5 text-rose-400" />, color: "bg-rose-900/30 text-rose-400" },
  create_task: { label: "Created Task", icon: <PlusCircle className="h-3.5 w-3.5 text-teal-400" />, color: "bg-teal-900/30 text-teal-400" },
  update_task: { label: "Updated Task", icon: <PencilLine className="h-3.5 w-3.5 text-cyan-400" />, color: "bg-cyan-900/30 text-cyan-400" },
};

const MODULE_LABELS: Record<string, string> = {
  kpis: "KPI Tracker",
  actions: "Action Tracker",
  initiatives: "Initiatives",
  assistant: "AI Assistant",
  analytics: "Analytics Studio",
  settings: "Settings",
  other: "Other",
};

function fallbackMeta(action: string) {
  return { label: action.replace(/_/g, " "), icon: <Activity className="h-3.5 w-3.5 text-gray-400" />, color: "bg-gray-800 text-gray-400" };
}

export default function OwnerActivity() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/owner/activity"],
  });

  const companies = useMemo(() => Array.from(new Set(logs.map((l: any) => l.companyName).filter(Boolean))).sort(), [logs]);
  const modules = useMemo(() => Array.from(new Set(logs.map((l: any) => l.moduleName).filter(Boolean))).sort(), [logs]);

  const filtered = useMemo(() => logs.filter((l: any) => {
    if (actionFilter !== "all" && l.activityType !== actionFilter) return false;
    if (companyFilter !== "all" && l.companyName !== companyFilter) return false;
    if (moduleFilter !== "all" && l.moduleName !== moduleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.userName?.toLowerCase().includes(q) || l.companyName?.toLowerCase().includes(q) || l.details?.toLowerCase().includes(q);
    }
    return true;
  }), [logs, actionFilter, companyFilter, moduleFilter, search]);

  const stats = useMemo(() => ({
    total: logs.length,
    logins: logs.filter(l => l.activityType === "login").length,
    aiRequests: logs.filter(l => l.activityType === "ai_request").length,
    creates: logs.filter(l => l.activityType?.startsWith("create_")).length,
    updates: logs.filter(l => l.activityType?.startsWith("update_")).length,
    deletes: logs.filter(l => l.activityType?.startsWith("delete_")).length,
  }), [logs]);

  return (
    <OwnerLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white" data-testid="text-activity-title">User Activity</h1>
          <p className="text-sm text-gray-400 mt-0.5">All recorded actions across the platform</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-white" },
            { label: "Logins", value: stats.logins, color: "text-blue-400" },
            { label: "AI Queries", value: stats.aiRequests, color: "text-purple-400" },
            { label: "Creates", value: stats.creates, color: "text-emerald-400" },
            { label: "Updates", value: stats.updates, color: "text-sky-400" },
            { label: "Deletes", value: stats.deletes, color: "text-rose-400" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="bg-gray-900 border-white/10">
              <CardContent className="pt-4 pb-4 px-4">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-xl font-bold ${color} mt-0.5`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
            <Input
              placeholder="Search user, company, details..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 bg-gray-800 border-white/10 text-white placeholder:text-gray-500 text-sm"
              data-testid="input-activity-search"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-8 w-40 bg-gray-800 border-white/10 text-sm text-gray-300" data-testid="select-action-filter">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-white/10">
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="ai_request">AI Query</SelectItem>
              <SelectItem value="key_activation">Key Activation</SelectItem>
              <SelectItem value="create_kpi">Create KPI</SelectItem>
              <SelectItem value="update_kpi">Update KPI</SelectItem>
              <SelectItem value="create_action">Create Action</SelectItem>
              <SelectItem value="update_action">Update Action</SelectItem>
              <SelectItem value="create_project">Create Initiative</SelectItem>
              <SelectItem value="update_project">Update Initiative</SelectItem>
              <SelectItem value="create_task">Create Task</SelectItem>
              <SelectItem value="update_task">Update Task</SelectItem>
            </SelectContent>
          </Select>
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="h-8 w-36 bg-gray-800 border-white/10 text-sm text-gray-300">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-white/10">
              <SelectItem value="all">All Modules</SelectItem>
              {modules.map(m => <SelectItem key={m} value={m}>{MODULE_LABELS[m] || m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="h-8 w-40 bg-gray-800 border-white/10 text-sm text-gray-300">
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-white/10">
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-gray-500 ml-auto">{filtered.length} events</span>
        </div>

        {/* Activity Log */}
        <Card className="bg-gray-900 border-white/10">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading activity...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-500 text-sm">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No activity events found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {["Action", "User", "Company", "Module", "Details", "Time"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 300).map((log: any, i: number) => {
                      const meta = ACTION_META[log.activityType] || fallbackMeta(log.activityType);
                      return (
                        <tr key={log.id || i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${meta.color}`}>
                              {meta.icon}
                              {meta.label}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
                                {log.userName?.[0] || "?"}
                              </div>
                              <span className="text-white text-xs whitespace-nowrap">{log.userName || "Unknown"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">{log.companyName || "—"}</td>
                          <td className="px-4 py-2.5">
                            {log.moduleName ? (
                              <Badge variant="outline" className="text-xs border-white/10 text-gray-400">
                                {MODULE_LABELS[log.moduleName] || log.moduleName}
                              </Badge>
                            ) : <span className="text-gray-600">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-gray-400 text-xs max-w-xs truncate">{log.details || "—"}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                            <div>{format(new Date(log.createdAt), "MMM d HH:mm")}</div>
                            <div className="text-gray-600">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length > 300 && (
                  <p className="text-center py-3 text-xs text-gray-500">Showing 300 of {filtered.length} events</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
