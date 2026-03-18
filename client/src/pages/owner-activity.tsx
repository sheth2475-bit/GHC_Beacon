import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Search, Loader2, Bot, LogIn, Key, Settings } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

const actionIcons: Record<string, JSX.Element> = {
  login: <LogIn className="h-3.5 w-3.5 text-blue-400" />,
  ai_request: <Bot className="h-3.5 w-3.5 text-purple-400" />,
  key_activation: <Key className="h-3.5 w-3.5 text-amber-400" />,
};

const actionColor: Record<string, string> = {
  login: "bg-blue-900/30",
  ai_request: "bg-purple-900/30",
  key_activation: "bg-amber-900/30",
};

export default function OwnerActivity() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/owner/activity"],
  });

  const filtered = logs.filter(l => {
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.userName?.toLowerCase().includes(q) || l.companyName?.toLowerCase().includes(q) || l.details?.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: logs.length,
    logins: logs.filter(l => l.action === "login").length,
    aiRequests: logs.filter(l => l.action === "ai_request").length,
    keyActivations: logs.filter(l => l.action === "key_activation").length,
  };

  return (
    <OwnerLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white" data-testid="text-activity-title">User Activity</h1>
          <p className="text-sm text-gray-400 mt-0.5">Recent activity across all companies</p>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Events", value: stats.total, icon: Activity, color: "text-gray-400" },
            { label: "Logins", value: stats.logins, icon: LogIn, color: "text-blue-400" },
            { label: "AI Requests", value: stats.aiRequests, icon: Bot, color: "text-purple-400" },
            { label: "Key Activations", value: stats.keyActivations, icon: Key, color: "text-amber-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="bg-gray-900 border-white/10">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">{label}</p>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
                <p className="text-xl font-bold text-white mt-1">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users, companies, or details..."
              className="pl-8 bg-gray-800 border-white/10 text-white placeholder:text-gray-500 h-8 text-sm"
              data-testid="input-activity-search"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40 bg-gray-800 border-white/10 text-white h-8 text-sm" data-testid="select-activity-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-white/10">
              <SelectItem value="all" className="text-white">All actions</SelectItem>
              <SelectItem value="login" className="text-white">Logins</SelectItem>
              <SelectItem value="ai_request" className="text-white">AI Requests</SelectItem>
              <SelectItem value="key_activation" className="text-white">Key Activations</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          </div>
        ) : (
          <Card className="bg-gray-900 border-white/10">
            <div className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <Activity className="h-8 w-8 text-gray-600" />
                  <p className="text-sm text-gray-500">No activity found</p>
                </div>
              ) : (
                filtered.map((l: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${actionColor[l.action] || "bg-gray-800"}`}>
                      {actionIcons[l.action] || <Activity className="h-3.5 w-3.5 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        <span className="font-medium">{l.userName || "Unknown"}</span>
                        <span className="text-gray-400"> · </span>
                        <span className="text-gray-300">{l.action?.replace("_", " ")}</span>
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {l.companyName && <span className="text-gray-400">{l.companyName} · </span>}
                        {l.details}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 flex-shrink-0">
                      {formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </div>
    </OwnerLayout>
  );
}
