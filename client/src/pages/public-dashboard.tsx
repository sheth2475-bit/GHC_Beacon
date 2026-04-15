import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend,
} from "recharts";

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4"];

function formatValue(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2);
}

type ChartData = { data?: { name: string; value: number }[]; xKey?: string; yKey?: string; measureLabel?: string; dimensionLabel?: string; value?: number; label?: string; count?: number };

function ChartView({ chartType, chartConfig }: { chartType: string; chartConfig: unknown }) {
  const cfg = chartConfig as ChartData;
  if (!cfg) return <div className="text-muted-foreground text-sm text-center py-8">No chart data</div>;

  if (chartType === "kpi") {
    const v = cfg.value ?? 0;
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-1">
        <span className="text-4xl font-bold tabular-nums tracking-tight" style={{ color: CHART_COLORS[0] }}>{formatValue(v)}</span>
        {cfg.label && <span className="text-sm text-muted-foreground font-medium">{cfg.label}</span>}
        {cfg.count !== undefined && <span className="text-xs text-muted-foreground">{cfg.count} records</span>}
      </div>
    );
  }

  const data = Array.isArray(cfg.data) ? cfg.data : [];
  const xKey = cfg.xKey || "name";
  const yKey = cfg.yKey || "value";
  const h = 220;

  if (chartType === "pie" || chartType === "donut") {
    return (
      <ResponsiveContainer width="100%" height={h}>
        <RechartPie>
          <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%"
            innerRadius={chartType === "donut" ? "55%" : 0} outerRadius="75%" paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => formatValue(v)} />
          <Legend />
        </RechartPie>
      </ResponsiveContainer>
    );
  }
  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={h}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatValue} width={48} />
          <Tooltip formatter={(v: number) => formatValue(v)} />
          <Line type="monotone" dataKey={yKey} stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (chartType === "area") {
    return (
      <ResponsiveContainer width="100%" height={h}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatValue} width={48} />
          <Tooltip formatter={(v: number) => formatValue(v)} />
          <Area type="monotone" dataKey={yKey} stroke={CHART_COLORS[0]} fill="url(#ag)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} layout={chartType === "horizontal-bar" ? "vertical" : "horizontal"}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        {chartType === "horizontal-bar"
          ? <><XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatValue} /><YAxis type="category" dataKey={xKey} tick={{ fontSize: 11 }} width={80} /></>
          : <><XAxis dataKey={xKey} tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={formatValue} width={48} /></>}
        <Tooltip formatter={(v: number) => formatValue(v)} />
        <Bar dataKey={yKey} radius={[3, 3, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

type Item = { id: number; sortOrder: number; insight: { title: string; chartType: string; chartConfig: unknown; narrativeSummary?: string } };
type Dashboard = { title: string; description?: string; narrativeSummary?: string };

export default function PublicDashboard() {
  const [, params] = useRoute("/public/dashboard/:token");
  const token = params?.token ?? "";

  const { data, isLoading, error } = useQuery<{ dashboard: Dashboard; items: Item[] }>({
    queryKey: ["/api/public/dashboard", token],
    queryFn: () => fetch(`/api/public/dashboard/${token}`).then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); }),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-semibold">Dashboard not available</h2>
        <p className="text-muted-foreground text-sm">This link may be disabled or invalid.</p>
      </div>
    );
  }

  const { dashboard, items } = data;
  const sorted = [...items].sort((a, b) => ((a as any).position ?? 0) - ((b as any).position ?? 0));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/ghc-beacon-logo.jpg" alt="GHC Beacon" className="h-8 w-8 rounded-md object-cover" />
          <span className="font-bold text-lg tracking-tight">GHC Beacon</span>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Globe className="h-3 w-3" /> Public Dashboard
        </Badge>
      </header>

      {/* Body */}
      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{dashboard.title}</h1>
          {dashboard.description && <p className="text-muted-foreground mt-1 text-sm">{dashboard.description}</p>}
        </div>

        {/* Narrative */}
        {dashboard.narrativeSummary && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {dashboard.narrativeSummary}
            </CardContent>
          </Card>
        )}

        {/* Charts grid */}
        {sorted.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No insights added to this dashboard.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map(item => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3 truncate">{item.insight.title}</p>
                  <ChartView chartType={item.insight.chartType} chartConfig={item.insight.chartConfig} />
                  {item.insight.narrativeSummary && (
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-3">{item.insight.narrativeSummary}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Powered by <span className="font-semibold text-foreground">GHC Beacon</span>
      </footer>
    </div>
  );
}
