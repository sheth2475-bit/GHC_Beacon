import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart as RechartPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LabelList, Legend,
} from "recharts";

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4"];

type NumberDisplayFormat = "compact" | "full";

function formatValue(v: number, mode: NumberDisplayFormat = "compact") {
  if (mode === "full") return Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2);
}

function formatVariancePct(v: unknown): string {
  if (typeof v !== "number" || !isFinite(v)) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function shortLabel(name: string, maxLen = 8): string {
  const m = name.match(/^([A-Za-z]{3})\s+'?(\d{2,4})/);
  if (m) return `${m[1]} '${m[2].slice(2)}`;
  return name.length > maxLen ? name.slice(0, maxLen - 1) + "…" : name;
}

type CfgData = Record<string, unknown>;

function MiniChart({ chartType, chartConfig, color }: { chartType: string; chartConfig: unknown; color?: string }) {
  const cfg = chartConfig as Record<string, unknown> | null;
  if (!cfg) return <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">No data</div>;
  const data = cfg.data as CfgData;
  const displayFormat = (cfg.displayFormat === "full" ? "full" : "compact") as NumberDisplayFormat;
  const c0 = color || CHART_COLORS[0];
  const c3 = CHART_COLORS[3];

  if (chartType === "kpi" && data) {
    const kpi = data as { value: number; label: string; comparisonValue?: number; comparisonLabel?: string; variance?: number; variancePct?: number | null };
    return (
      <div className="flex flex-col items-center justify-center h-40">
        <div className="text-4xl font-black tracking-tight" style={{ color: c0 }}>{formatValue(kpi.value, displayFormat)}</div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center px-2">{kpi.label}</p>
        {typeof kpi.comparisonValue === "number" && (
          <p className={`text-[10px] mt-1 font-semibold ${Number(kpi.variance) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            vs {kpi.comparisonLabel || "Comparison"} {formatValue(kpi.comparisonValue, displayFormat)} · {formatVariancePct(kpi.variancePct)}
          </p>
        )}
      </div>
    );
  }

  if ((chartType === "bar" || chartType === "column" || chartType === "horizontal-bar" || chartType === "line" || chartType === "area") && data) {
    const chartData = (data as { data?: { name: string; value: number; comparisonValue?: number }[]; comparisonLabel?: string }).data || [];
    const comparisonLabel = (data as { comparisonLabel?: string }).comparisonLabel || "Comparison";
    const maxItems = (chartType === "bar" || chartType === "column" || chartType === "horizontal-bar") ? 20 : 30;
    const displayData = chartData.slice(0, maxItems).map(d => ({ ...d, shortName: shortLabel(d.name) }));
    const count = displayData.length;
    const hasComparison = displayData.some(d => typeof d.comparisonValue === "number");
    const hasMany = count > 8;
    const hasTons = count > 15;
    const chartH = hasTons ? 240 : hasMany ? 210 : count > 5 ? 185 : 165;
    const bottomMargin = hasTons ? 44 : hasMany ? 36 : 26;
    const labelAngle = hasTons ? -50 : hasMany ? -35 : -20;
    const tickSize = hasTons ? 7 : hasMany ? 7.5 : 8;

    if (chartType === "bar" || chartType === "column" || chartType === "horizontal-bar") return (
      <ResponsiveContainer width="100%" height={chartH}>
        <BarChart data={displayData} margin={{ top: 20, right: 6, left: -16, bottom: bottomMargin }}>
          <XAxis
            dataKey="shortName"
            tick={{ fontSize: tickSize, fill: "currentColor" }}
            angle={labelAngle}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fontSize: 8 }} tickFormatter={v => formatValue(v, displayFormat)} width={44} />
          <Tooltip
            formatter={(v, name, props) => [formatValue(Number(v), displayFormat), name === "comparisonValue" ? comparisonLabel : props.payload?.name || ""]}
            contentStyle={{ fontSize: 11, borderRadius: 6 }}
            labelFormatter={() => ""}
          />
          {hasComparison && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "10px" }} />}
          <Bar dataKey="value" fill={c0} radius={[3, 3, 0, 0]}>
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v: number) => formatValue(v, displayFormat)}
              style={{ fontSize: hasTons ? 7 : 8, fill: "currentColor", fontWeight: 600 }}
            />
          </Bar>
          {hasComparison && <Bar dataKey="comparisonValue" name={comparisonLabel} fill={c3} radius={[3, 3, 0, 0]}>
            <LabelList dataKey="comparisonValue" position="top" formatter={(v: number) => formatValue(v, displayFormat)} style={{ fontSize: hasTons ? 7 : 8, fill: "currentColor", fontWeight: 600 }} />
          </Bar>}
        </BarChart>
      </ResponsiveContainer>
    );
    return (
      <ResponsiveContainer width="100%" height={chartH}>
        <AreaChart data={displayData} margin={{ top: 20, right: 6, left: -16, bottom: bottomMargin }}>
          <XAxis
            dataKey="shortName"
            tick={{ fontSize: tickSize, fill: "currentColor" }}
            angle={labelAngle}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fontSize: 8 }} tickFormatter={v => formatValue(v, displayFormat)} width={44} />
          <Tooltip
            formatter={(v, name, props) => [formatValue(Number(v), displayFormat), name === "comparisonValue" ? comparisonLabel : props.payload?.name || ""]}
            contentStyle={{ fontSize: 11, borderRadius: 6 }}
            labelFormatter={() => ""}
          />
          {hasComparison && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "10px" }} />}
          <Area type="monotone" dataKey="value" stroke={c0} strokeWidth={2} fill={c0 + "20"} dot={count <= 40 ? { r: 2.5, fill: c0 } : false}>
            {count <= 40 && (
              <LabelList
                dataKey="value"
                position="top"
                formatter={(v: number) => formatValue(v, displayFormat)}
                style={{ fontSize: hasTons ? 7 : 8, fill: "currentColor", fontWeight: 600 }}
              />
            )}
          </Area>
          {hasComparison && <Area type="monotone" dataKey="comparisonValue" name={comparisonLabel} stroke={c3} strokeWidth={2} fill={c3 + "10"} dot={count <= 40 ? { r: 2.5, fill: c3 } : false}>
            {count <= 40 && <LabelList dataKey="comparisonValue" position="bottom" formatter={(v: number) => formatValue(v, displayFormat)} style={{ fontSize: hasTons ? 7 : 8, fill: "currentColor", fontWeight: 600 }} />}
          </Area>}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "pie" && data) {
    const pieData = (data as { data?: { name: string; value: number }[] }).data || [];
    const slices = pieData.slice(0, 7);
    const total = slices.reduce((s, d) => s + d.value, 0);
    return (
      <div className="flex flex-col gap-1">
        <ResponsiveContainer width="100%" height={140}>
          <RechartPie>
            <Pie
              data={slices}
              cx="50%"
              cy="50%"
              outerRadius={58}
              innerRadius={22}
              dataKey="value"
              paddingAngle={2}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                if (percent < 0.07) return null;
                const RADIAN = Math.PI / 180;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return (
                  <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 9, fontWeight: 700 }}>
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                );
              }}
              labelLine={false}
            >
              {slices.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => [formatValue(Number(v), displayFormat), ""]} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
          </RechartPie>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
          {slices.map((d, i) => (
            <div key={i} className="flex items-center gap-1 min-w-0">
              <span className="shrink-0 h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-[9px] text-muted-foreground truncate max-w-[70px]" title={d.name}>{d.name}</span>
              <span className="text-[9px] font-semibold shrink-0">{formatValue(d.value, displayFormat)}</span>
              <span className="text-[9px] text-muted-foreground shrink-0">{total ? `(${((d.value / total) * 100).toFixed(0)}%)` : ""}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (chartType === "table" && data) {
    const tableData = data as { rows?: Record<string, unknown>[]; columns?: string[] };
    const rows = tableData.rows?.slice(0, 4) || [];
    const cols = tableData.columns?.slice(0, 4) || [];
    return (
      <div className="overflow-hidden rounded border">
        <table className="w-full text-[10px]">
          <thead className="bg-muted/50"><tr>{cols.map(c => <th key={c} className="px-2 py-1 text-left font-medium truncate max-w-[90px]">{c}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-border/50">{cols.map(c => <td key={c} className="px-2 py-1 truncate max-w-[90px]">{typeof r[c] === "number" ? formatValue(Number(r[c]), displayFormat) : String(r[c] ?? "")}</td>)}</tr>)}</tbody>
        </table>
        {(tableData.rows?.length || 0) > 4 && <p className="text-[9px] text-center text-muted-foreground py-1">+{(tableData.rows?.length || 0) - 4} more rows</p>}
      </div>
    );
  }

  return <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">Preview unavailable</div>;
}

type Item = { id: number; position?: number; sortOrder?: number; insight: { title: string; chartType: string; chartConfig: unknown; narrativeSummary?: string } };
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
  const sorted = [...items].sort((a, b) => ((a.position ?? a.sortOrder ?? 0) - (b.position ?? b.sortOrder ?? 0)));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/ghc-beacon-logo.jpg" alt="GHC Beacon" className="h-8 w-8 rounded-md object-cover" />
          <span className="font-bold text-lg tracking-tight">GHC Beacon</span>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Globe className="h-3 w-3" /> Public Dashboard
        </Badge>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{dashboard.title}</h1>
          {dashboard.description && <p className="text-muted-foreground mt-1 text-sm">{dashboard.description}</p>}
        </div>

        {dashboard.narrativeSummary && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {dashboard.narrativeSummary}
            </CardContent>
          </Card>
        )}

        {sorted.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No insights added to this dashboard.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map(item => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3 truncate">{item.insight.title}</p>
                  <MiniChart chartType={item.insight.chartType} chartConfig={item.insight.chartConfig} color={(item as { colorOverride?: string | null }).colorOverride || undefined} />
                  {item.insight.narrativeSummary && (
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-3">{item.insight.narrativeSummary}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Powered by <span className="font-semibold text-foreground">GHC Beacon</span>
      </footer>
    </div>
  );
}
