import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/owner-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";

const planColors: Record<string, string> = {
  Trial: "bg-gray-700/60 text-gray-300",
  Starter: "bg-blue-900/50 text-blue-300",
  Growth: "bg-emerald-900/50 text-emerald-300",
  Enterprise: "bg-purple-900/50 text-purple-300",
};

export default function OwnerAiUsage() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/owner/ai-usage"],
  });

  const companies = data?.companies || [];
  const dailyTrend = data?.dailyTrend || [];
  const totalToday = companies.reduce((s: number, c: any) => s + (c.today || 0), 0);
  const totalWeek = companies.reduce((s: number, c: any) => s + (c.week || 0), 0);
  const atLimit = companies.filter((c: any) => c.today >= (c.dailyLimit || 75)).length;

  return (
    <OwnerLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white" data-testid="text-ai-usage-title">AI Usage Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">AI request consumption across all companies</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-gray-900 border-white/10">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Requests Today</p>
                <Bot className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white mt-1">{totalToday}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-white/10">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 uppercase tracking-wide">This Week</p>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white mt-1">{totalWeek}</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-white/10">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 uppercase tracking-wide">At Limit Today</p>
                <AlertTriangle className="h-4 w-4 text-red-400" />
              </div>
              <p className="text-2xl font-bold text-white mt-1">{atLimit}</p>
            </CardContent>
          </Card>
        </div>

        {dailyTrend.length > 0 && (
          <Card className="bg-gray-900 border-white/10 mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">7-Day Trend</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="flex items-end gap-2 h-20">
                {dailyTrend.map((d: any, i: number) => {
                  const max = Math.max(...dailyTrend.map((x: any) => x.count), 1);
                  const height = Math.max(4, (d.count / max) * 80);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <p className="text-xs text-gray-500">{d.count}</p>
                      <div
                        className="w-full bg-blue-600/70 rounded-t"
                        style={{ height: `${height}px` }}
                        title={`${d.date}: ${d.count} requests`}
                      />
                      <p className="text-xs text-gray-600 truncate w-full text-center">
                        {d.date ? format(new Date(d.date), "M/d") : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gray-900 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300">Usage by Company</CardTitle>
          </CardHeader>
          <div className="divide-y divide-white/5">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
              </div>
            ) : companies.length === 0 ? (
              <p className="text-sm text-gray-500 px-5 py-6">No AI usage recorded yet</p>
            ) : (
              companies.map((c: any, i: number) => {
                const pct = Math.min(100, (c.today / (c.dailyLimit || 75)) * 100);
                const atLimit = c.today >= (c.dailyLimit || 75);
                return (
                  <div key={i} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{c.companyName}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${planColors[c.planName] || planColors.Trial}`}>
                          {c.planName || "Trial"}
                        </span>
                        {atLimit && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/40 text-red-400 font-medium">Limit reached</span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white">{c.today} <span className="text-gray-500">/ {c.dailyLimit || 75} today</span></p>
                        <p className="text-xs text-gray-500">{c.week} this week · {c.total} total</p>
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${atLimit ? "bg-red-500" : "bg-blue-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </OwnerLayout>
  );
}
