import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Sparkles, Loader2, Send, Save, Pin, BarChart2, BarChart3,
  TrendingUp, PieChart, Table2, Hash, AlignLeft, Calendar, Activity,
  RefreshCw, Lightbulb, ChevronRight, CheckCircle2, X, Plus, Download,
  Settings2, Layers, Info, Zap, Eye, EyeOff, BookMarked, LayoutDashboard, ArrowRight,
  SlidersHorizontal, Clock, Database, BarChartHorizontal,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadialBarChart, RadialBar, LabelList,
} from "recharts";
import type {
  AnalyticsDataset, AnalyticsDatasetColumn, AnalyticsInsight,
  AnalyticsAutoInsight, AnalyticsDashboardDefinition,
} from "@shared/schema";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

// ─── Types ───────────────────────────────────────────────────────────────────

type FullDataset = AnalyticsDataset & {
  columns: AnalyticsDatasetColumn[];
  insights: AnalyticsInsight[];
  autoInsights: AnalyticsAutoInsight[];
  dimensionValues?: Record<string, string[]>;
};

type ActiveFilter = { column: string; value: string };

type AskResult = {
  title: string;
  subtitle?: string | null;
  interpretation: string;
  chartType: string;
  chartConfig: Record<string, unknown>;
  narrative: string;
  suggestedQuestions: string[];
  question: string;
  trendDirection?: string | null;
  anomalyDetected?: boolean;
  anomalyNote?: string | null;
  topValue?: { name: string; value: number } | null;
  bottomValue?: { name: string; value: number } | null;
  isFollowUp?: boolean;
  previousQuestion?: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

const CHART_TYPE_OPTIONS = [
  { value: "kpi",    label: "KPI Card",    Icon: Hash },
  { value: "bar",    label: "Bar Chart",   Icon: BarChart2 },
  { value: "column", label: "Column",      Icon: BarChartHorizontal },
  { value: "line",   label: "Line",        Icon: TrendingUp },
  { value: "area",   label: "Area",        Icon: Activity },
  { value: "pie",    label: "Pie",         Icon: PieChart },
  { value: "donut",  label: "Donut",       Icon: Layers },
  { value: "table",  label: "Table",       Icon: Table2 },
] as const;

const EXAMPLE_PROMPTS = [
  "Total Sales", "Revenue by Region", "Sales by Month",
  "Attrition Rate by Department", "Top 5 branches by profit",
  "Average order value by customer", "Revenue trend last 12 months",
];

const TYPE_COLORS: Record<string, string> = {
  measure: "text-emerald-600 dark:text-emerald-400",
  dimension: "text-blue-600 dark:text-blue-400",
  date: "text-amber-600 dark:text-amber-400",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

type NumberDisplayFormat = "compact" | "full";
type ValueFormat = "number" | "percent" | "minutes" | "hours" | "count";

function formatValue(v: number | null | undefined, mode: NumberDisplayFormat = "compact"): string {
  if (v === null || v === undefined || isNaN(v as number)) return "—";
  if (mode === "full") {
    return Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2);
}

function formatKpiValue(v: number | null | undefined, displayFormat: NumberDisplayFormat = "compact", valueFormat: ValueFormat = "number"): string {
  if (v === null || v === undefined || isNaN(v as number)) return "—";
  const n = Number(v);
  if (valueFormat === "percent") return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
  if (valueFormat === "minutes") return `${Math.round(n)} mins`;
  if (valueFormat === "hours") return `${n % 1 === 0 ? n : n.toFixed(1)} hrs`;
  if (valueFormat === "count") return Number.isInteger(n) ? n.toLocaleString() : Math.round(n).toLocaleString();
  return formatValue(n, displayFormat);
}

function resolveValueFormat(cfg: Record<string, unknown> | null): ValueFormat {
  const vf = (cfg?.valueFormat as string) || ((cfg?.data as Record<string, unknown>)?.valueFormat as string);
  if (vf === "percent" || vf === "minutes" || vf === "hours" || vf === "count") return vf;
  return "number";
}

function formatVariancePct(v: unknown): string {
  if (typeof v !== "number" || !isFinite(v)) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

type ChartDatum = { name: string; value: number; comparisonValue?: number };

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/,/g, ""));
    return isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeSeriesData(raw: Record<string, unknown> | null | undefined): ChartDatum[] {
  if (!raw) return [];
  const nested = raw as { data?: unknown[] };
  if (Array.isArray(nested.data)) {
    return nested.data.map((d, i) => {
      const row = d as Record<string, unknown>;
      return {
        name: String(row.name ?? row.label ?? `Item ${i + 1}`),
        value: asNumber(row.value) ?? 0,
        ...(asNumber(row.comparisonValue) !== null ? { comparisonValue: asNumber(row.comparisonValue)! } : {}),
      };
    });
  }
  const table = raw as { rows?: Record<string, unknown>[]; columns?: string[] };
  if (Array.isArray(table.rows) && Array.isArray(table.columns) && table.columns.length > 0) {
    const nameCol = table.columns[0];
    const numericCols = table.columns.slice(1).filter(col => table.rows?.some(row => asNumber(row[col]) !== null));
    const valueCol = numericCols[0];
    const comparisonCol = numericCols[1];
    if (valueCol) {
      return table.rows.map((row, i) => ({
        name: String(row[nameCol] ?? `Row ${i + 1}`),
        value: asNumber(row[valueCol]) ?? 0,
        ...(comparisonCol && asNumber(row[comparisonCol]) !== null ? { comparisonValue: asNumber(row[comparisonCol])! } : {}),
      }));
    }
  }
  const value = asNumber(raw.value);
  if (value !== null) {
    const comparisonValue = asNumber(raw.comparisonValue);
    return [{
      name: String(raw.label ?? "Value"),
      value,
      ...(comparisonValue !== null ? { comparisonValue } : {}),
    }];
  }
  return [];
}

function buildKpiData(raw: Record<string, unknown> | null | undefined, cfg: Record<string, unknown>, series: ChartDatum[]) {
  if (asNumber(raw?.value) !== null) {
    return raw as { value?: number | null; label?: string; count?: number; comparisonValue?: number | null; comparisonLabel?: string; variance?: number | null; variancePct?: number | null };
  }
  const value = series.reduce((sum, row) => sum + (asNumber(row.value) ?? 0), 0);
  const comparisonValues = series.map(row => asNumber(row.comparisonValue)).filter((v): v is number => v !== null);
  const comparisonValue = comparisonValues.length ? comparisonValues.reduce((sum, value) => sum + value, 0) : null;
  const variance = comparisonValue !== null ? value - comparisonValue : null;
  const variancePct = comparisonValue ? (variance! / comparisonValue) * 100 : null;
  return {
    value,
    label: String((raw as { measureLabel?: string } | undefined)?.measureLabel ?? cfg.measure ?? cfg.title ?? "Total"),
    count: series.length,
    comparisonValue,
    comparisonLabel: String((raw as { comparisonLabel?: string } | undefined)?.comparisonLabel ?? "Comparison"),
    variance,
    variancePct,
  };
}

function buildTableData(raw: Record<string, unknown> | null | undefined, series: ChartDatum[]) {
  const table = raw as { rows?: Record<string, unknown>[]; columns?: string[] } | undefined;
  if (Array.isArray(table?.rows) && Array.isArray(table?.columns) && table.columns.length > 0) return table;
  const dimensionLabel = String(raw?.dimensionLabel ?? "Name");
  const measureLabel = String(raw?.measureLabel ?? "Value");
  const comparisonLabel = String(raw?.comparisonLabel ?? "Comparison");
  const hasComparison = series.some(row => typeof row.comparisonValue === "number");
  return {
    rows: series.map(row => ({
      [dimensionLabel]: row.name,
      [measureLabel]: row.value,
      ...(hasComparison ? { [comparisonLabel]: row.comparisonValue } : {}),
    })),
    columns: [dimensionLabel, measureLabel, ...(hasComparison ? [comparisonLabel] : [])],
  };
}

function formatTableCell(value: unknown, displayFormat: NumberDisplayFormat): string {
  const numericValue = asNumber(value);
  if (numericValue !== null) return formatValue(numericValue, displayFormat);
  return String(value ?? "—");
}

function downloadCSV(data: { name: string; value: number }[], title: string) {
  const rows = [["Name", "Value"], ...data.map(d => [d.name, String(d.value)])];
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${title}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Chart Components ─────────────────────────────────────────────────────────

const CHART_MARGIN = { top: 8, right: 16, left: 0, bottom: 60 };
const CHART_HEIGHT = 300;

function KpiCard({ data, displayFormat, valueFormat = "number" }: { data: { value?: number | null; label?: string; count?: number; comparisonValue?: number | null; comparisonLabel?: string; variance?: number | null; variancePct?: number | null; valueFormat?: string }; displayFormat: NumberDisplayFormat; valueFormat?: ValueFormat }) {
  const hasComparison = typeof data?.comparisonValue === "number";
  const variance = typeof data?.variance === "number" ? data.variance : null;
  const varianceGood = variance === null ? null : variance >= 0;
  const vf: ValueFormat = (data?.valueFormat === "percent" || data?.valueFormat === "minutes" || data?.valueFormat === "hours" || data?.valueFormat === "count") ? data.valueFormat as ValueFormat : valueFormat;
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative mb-2">
        <div className="absolute inset-0 blur-2xl bg-primary/10 rounded-full scale-150" />
        <p className="relative text-6xl font-black tabular-nums text-foreground tracking-tight">
          {formatKpiValue(data?.value, displayFormat, vf)}
        </p>
      </div>
      <p className="text-base text-muted-foreground font-medium mt-1">{data?.label ?? "—"}</p>
      {hasComparison && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs" data-testid="text-kpi-comparison">
          <span className="rounded-full border bg-muted/30 px-2.5 py-1 text-muted-foreground">
            vs {data.comparisonLabel || "Comparison"}: <strong className="text-foreground">{formatKpiValue(data.comparisonValue, displayFormat, vf)}</strong>
          </span>
          <span className={`rounded-full border px-2.5 py-1 font-semibold ${varianceGood ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"}`}>
            {variance !== null && variance > 0 ? "+" : ""}{formatKpiValue(variance, displayFormat, vf)} · {formatVariancePct(data.variancePct)}
          </span>
        </div>
      )}
      <p className="text-xs text-muted-foreground/50 mt-1">{data?.count?.toLocaleString()} records</p>
    </div>
  );
}

const LABEL_STYLE = { fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 500 };

function BarChartWidget({ cfg, horizontal, displayFormat, formatter, hideComparison }: { cfg: { data: { name: string; value: number; comparisonValue?: number }[]; measureLabel?: string; comparisonLabel?: string }; horizontal?: boolean; displayFormat: NumberDisplayFormat; formatter?: (v: number) => string; hideComparison?: boolean }) {
  const fv = formatter ?? ((v: number) => formatValue(v, displayFormat));
  const showLabels = cfg.data.length <= 15;
  const measureLabel = cfg.measureLabel || "Value";
  const hasComparison = !hideComparison && cfg.data.some(d => typeof d.comparisonValue === "number");
  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={cfg.data} layout="vertical" margin={{ top: 4, right: showLabels ? 52 : 24, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fv} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
          <Tooltip formatter={(v, name) => [fv(Number(v)), name === "comparisonValue" ? (cfg.comparisonLabel || "Comparison") : measureLabel]} />
          {hasComparison && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />}
          <Bar dataKey="value" name={measureLabel} radius={[0, 4, 4, 0]}>
            {cfg.data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            {showLabels && <LabelList dataKey="value" position="right" formatter={fv} style={LABEL_STYLE} />}
          </Bar>
          {hasComparison && <Bar dataKey="comparisonValue" name={cfg.comparisonLabel || "Comparison"} fill={CHART_COLORS[3]} radius={[0, 4, 4, 0]}>
            {showLabels && <LabelList dataKey="comparisonValue" position="right" formatter={fv} style={LABEL_STYLE} />}
          </Bar>}
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={cfg.data} margin={{ top: showLabels ? 22 : 8, right: 16, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={fv} />
        <Tooltip formatter={(v, name) => [fv(Number(v)), name === "comparisonValue" ? (cfg.comparisonLabel || "Comparison") : measureLabel]} />
        {hasComparison && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />}
        <Bar dataKey="value" name={measureLabel} radius={[4, 4, 0, 0]}>
          {cfg.data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          {showLabels && <LabelList dataKey="value" position="top" formatter={fv} style={LABEL_STYLE} />}
        </Bar>
        {hasComparison && <Bar dataKey="comparisonValue" name={cfg.comparisonLabel || "Comparison"} fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]}>
          {showLabels && <LabelList dataKey="comparisonValue" position="top" formatter={fv} style={LABEL_STYLE} />}
        </Bar>}
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartWidget({ cfg, filled, displayFormat, formatter, hideComparison }: { cfg: { data: { name: string; value: number; comparisonValue?: number }[]; measureLabel?: string; comparisonLabel?: string }; filled?: boolean; displayFormat: NumberDisplayFormat; formatter?: (v: number) => string; hideComparison?: boolean }) {
  const fv = formatter ?? ((v: number) => formatValue(v, displayFormat));
  const showLabels = cfg.data.length <= 15;
  const lineMargin = { top: showLabels ? 22 : 8, right: 16, left: 0, bottom: 60 };
  const measureLabel = cfg.measureLabel || "Value";
  const hasComparison = !hideComparison && cfg.data.some(d => typeof d.comparisonValue === "number");
  if (filled) {
    return (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <AreaChart data={cfg.data} margin={lineMargin}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={fv} />
          <Tooltip formatter={(v, name) => [fv(Number(v)), name === "comparisonValue" ? (cfg.comparisonLabel || "Comparison") : measureLabel]} />
          {hasComparison && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />}
          <Area type="monotone" dataKey="value" name={measureLabel} stroke={CHART_COLORS[0]} strokeWidth={2.5} fill="url(#areaGrad)" dot={{ r: 3, fill: CHART_COLORS[0] }} activeDot={{ r: 5 }}>
            {showLabels && <LabelList dataKey="value" position="top" formatter={fv} style={LABEL_STYLE} />}
          </Area>
          {hasComparison && <Area type="monotone" dataKey="comparisonValue" name={cfg.comparisonLabel || "Comparison"} stroke={CHART_COLORS[3]} strokeWidth={2} fill={CHART_COLORS[3] + "10"} dot={{ r: 3, fill: CHART_COLORS[3] }}>
            {showLabels && <LabelList dataKey="comparisonValue" position="bottom" formatter={fv} style={LABEL_STYLE} />}
          </Area>}
        </AreaChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={cfg.data} margin={lineMargin}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={fv} />
        <Tooltip formatter={(v, name) => [fv(Number(v)), name === "comparisonValue" ? (cfg.comparisonLabel || "Comparison") : measureLabel]} />
        {hasComparison && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />}
        <Line type="monotone" dataKey="value" name={measureLabel} stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS[0] }} activeDot={{ r: 5 }}>
          {showLabels && <LabelList dataKey="value" position="top" formatter={fv} style={LABEL_STYLE} />}
        </Line>
        {hasComparison && <Line type="monotone" dataKey="comparisonValue" name={cfg.comparisonLabel || "Comparison"} stroke={CHART_COLORS[3]} strokeWidth={2.5} dot={{ r: 3, fill: CHART_COLORS[3] }}>
          {showLabels && <LabelList dataKey="comparisonValue" position="bottom" formatter={fv} style={LABEL_STYLE} />}
        </Line>}
      </LineChart>
    </ResponsiveContainer>
  );
}

function PieChartWidget({ cfg, donut, displayFormat, formatter }: { cfg: { data: { name: string; value: number }[] }; donut?: boolean; displayFormat: NumberDisplayFormat; formatter?: (v: number) => string }) {
  const fv = formatter ?? ((v: number) => formatValue(v, displayFormat));
  const total = cfg.data.reduce((s, d) => s + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <RechartPie>
        <Pie
          data={cfg.data}
          cx="50%" cy="50%"
          innerRadius={donut ? 65 : 0}
          outerRadius={110}
          dataKey="value"
          paddingAngle={donut ? 3 : 0}
          label={({ name, value, percent }) => `${name} ${fv(Number(value))} (${(percent * 100).toFixed(0)}%)`}
          labelLine={false}
        >
          {cfg.data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={v => [fv(Number(v)), "Value"]} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
      </RechartPie>
    </ResponsiveContainer>
  );
}

function TableWidget({ cfg, displayFormat }: { cfg: { rows?: Record<string, unknown>[]; columns?: string[] }; displayFormat: NumberDisplayFormat }) {
  const cols = cfg?.columns ?? [];
  const rowData = cfg?.rows ?? [];
  if (cols.length === 0 || rowData.length === 0) {
    return <div className="flex items-center justify-center h-28 text-xs text-muted-foreground">No table data available</div>;
  }
  return (
    <div className="overflow-auto max-h-72 rounded-lg border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 sticky top-0">
          <tr>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-8">#</th>
            {cols.map(c => <th key={c} className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">{c}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rowData.map((row, i) => (
            <tr key={i} className="hover:bg-muted/20 transition-colors">
              <td className="px-3 py-1.5 text-muted-foreground/50">{i + 1}</td>
              {cols.map(c => <td key={c} className="px-3 py-1.5 whitespace-nowrap font-medium">{formatTableCell(row[c], displayFormat)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsightChart({ result, override, hideComparison }: { result: AskResult; override: string; hideComparison?: boolean }) {
  const chartType = override || result.chartType;
  const cfg = result.chartConfig;
  if (!cfg) return null;
  const data = cfg.data as Record<string, unknown> | null | undefined;
  const displayFormat = (cfg.displayFormat === "full" ? "full" : "compact") as NumberDisplayFormat;
  const valueFormat = resolveValueFormat(cfg as Record<string, unknown>);
  const normalizedData = normalizeSeriesData(data);
  const fv = (v: number) => formatKpiValue(v, displayFormat, valueFormat);

  if (chartType === "kpi") return <KpiCard data={buildKpiData(data, cfg, normalizedData)} displayFormat={displayFormat} valueFormat={valueFormat} />;

  const barData = data as { data?: { name: string; value: number; comparisonValue?: number }[]; measureLabel?: string; comparisonLabel?: string } | null | undefined;
  const chartData = normalizedData;

  if (chartType === "bar") return <BarChartWidget cfg={{ data: chartData, measureLabel: barData?.measureLabel, comparisonLabel: barData?.comparisonLabel }} displayFormat={displayFormat} formatter={fv} hideComparison={hideComparison} />;
  if (chartType === "column") return <BarChartWidget cfg={{ data: chartData, measureLabel: barData?.measureLabel, comparisonLabel: barData?.comparisonLabel }} horizontal displayFormat={displayFormat} formatter={fv} hideComparison={hideComparison} />;
  if (chartType === "line") return <LineChartWidget cfg={{ data: chartData, measureLabel: barData?.measureLabel, comparisonLabel: barData?.comparisonLabel }} displayFormat={displayFormat} formatter={fv} hideComparison={hideComparison} />;
  if (chartType === "area") return <LineChartWidget cfg={{ data: chartData, measureLabel: barData?.measureLabel, comparisonLabel: barData?.comparisonLabel }} filled displayFormat={displayFormat} formatter={fv} hideComparison={hideComparison} />;
  if (chartType === "pie") return <PieChartWidget cfg={{ data: chartData }} displayFormat={displayFormat} formatter={fv} />;
  if (chartType === "donut") return <PieChartWidget cfg={{ data: chartData }} donut displayFormat={displayFormat} formatter={fv} />;
  if (chartType === "table") return <TableWidget cfg={buildTableData(data, normalizedData)} displayFormat={displayFormat} />;

  return null;
}

// ─── Field Explorer item ──────────────────────────────────────────────────────

function FieldItem({ icon: Icon, label, detail, color, onClick }: {
  icon: typeof Hash; label: string; detail?: string; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 group transition-all"
    >
      <div className={`flex h-5 w-5 items-center justify-center rounded-md bg-muted/60 shrink-0 group-hover:bg-muted ${color}`}>
        <Icon className="h-3 w-3" />
      </div>
      <span className="text-xs font-medium truncate flex-1">{label}</span>
      {detail && <span className="text-[9px] text-muted-foreground/50 shrink-0">{detail}</span>}
    </button>
  );
}

// ─── Interpretation Row ───────────────────────────────────────────────────────

function InterpRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className={`text-[11px] font-semibold text-right leading-snug ${highlight ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsExplorePage() {
  const [, params] = useRoute("/analytics/datasets/:id/explore");
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const { toast } = useToast();
  const id = Number(params?.id);
  const inputRef = useRef<HTMLInputElement>(null);

  const preloadInsightId = useMemo(() => {
    const v = new URLSearchParams(searchStr).get("insightId");
    return v ? Number(v) : null;
  }, [searchStr]);

  const { data: ds, isLoading, isError } = useQuery<FullDataset>({
    queryKey: ["/api/v2/analytics/datasets", id],
    queryFn: () => fetch(`/api/v2/analytics/datasets/${id}`, { credentials: "include" }).then(r => {
      if (!r.ok) throw new Error("Dataset not found");
      return r.json();
    }),
    retry: false,
  });

  const { data: definitions = [] } = useQuery<AnalyticsDashboardDefinition[]>({
    queryKey: ["/api/v2/analytics/definitions"],
  });

  // State
  const [question, setQuestion] = useState("");
  const [chartOverride, setChartOverride] = useState<string>("");
  const [hideComparison, setHideComparison] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [history, setHistory] = useState<AskResult[]>([]);
  const [savedInsightId, setSavedInsightId] = useState<number | null>(null);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [selectedDashId, setSelectedDashId] = useState<string>("");
  const [newDashName, setNewDashName] = useState("");
  const [followUpMode, setFollowUpMode] = useState(false);
  const [preloadApplied, setPreloadApplied] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [filterPanelExpanded, setFilterPanelExpanded] = useState<Record<string, boolean>>({});

  // Auto-load a saved insight when navigated via ?insightId=
  useEffect(() => { setHideComparison(false); }, [result]);

  useEffect(() => {
    if (!ds || !preloadInsightId || preloadApplied) return;
    const insight = ds.insights?.find(i => i.id === preloadInsightId);
    if (!insight) return;
    setPreloadApplied(true);
    setQuestion(insight.question || "");
    setSavedInsightId(insight.id);
    setResult({
      title: insight.title,
      subtitle: null,
      interpretation: insight.interpretation || "",
      chartType: insight.chartType,
      chartConfig: (insight.chartConfig as Record<string, unknown>) || {},
      narrative: insight.narrative || "",
      suggestedQuestions: [],
      question: insight.question || "",
    });
  }, [ds, preloadInsightId, preloadApplied]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const toggleFilter = useCallback((col: string, val: string) => {
    setActiveFilters(prev => {
      const exists = prev.some(f => f.column === col && f.value === val);
      if (exists) return prev.filter(f => !(f.column === col && f.value === val));
      return [...prev, { column: col, value: val }];
    });
  }, []);

  const askMutation = useMutation({
    mutationFn: (q: string) => apiRequest("POST", `/api/v2/analytics/datasets/${id}/ask`, {
      question: q,
      chartTypeOverride: chartOverride && !["area", "column", "donut"].includes(chartOverride) ? chartOverride : undefined,
      filters: activeFilters.length > 0 ? activeFilters : undefined,
      // Send previous result as context for follow-up questions
      ...(followUpMode && result ? {
        previousQuestion: result.question,
        previousResult: {
          title: result.title,
          chartType: result.chartType,
          measure: (result.chartConfig as { measure?: string }).measure,
          dimension: (result.chartConfig as { dimension?: string }).dimension,
          aggregation: (result.chartConfig as { aggregation?: string }).aggregation,
        },
      } : {}),
    }).then(r => r.json()),
    onSuccess: (data: AskResult) => {
      setResult(data);
      setChartOverride("");
      setHistory(prev => [data, ...prev.slice(0, 14)]);
      setSavedInsightId(null);
    },
    onError: () => toast({ title: "Analysis failed", description: "Could not generate insight. Try rephrasing your question.", variant: "destructive" }),
  });

  const autoInsightsMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/v2/analytics/datasets/${id}/auto-insights`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/datasets", id] });
      toast({ title: "Suggestions refreshed!" });
    },
  });

  const saveInsightMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/v2/analytics/insights", {
      datasetId: id,
      title: result?.title,
      question: result?.question,
      interpretation: result?.interpretation,
      chartType: chartOverride || result?.chartType,
      chartConfig: result?.chartConfig,
      narrative: result?.narrative,
      status: "saved",
    }).then(r => r.json()),
    onSuccess: (data: AnalyticsInsight) => {
      setSavedInsightId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/datasets", id] });
      toast({ title: "Insight saved!" });
    },
  });

  const pinInsightMutation = useMutation({
    mutationFn: async ({ insightId, dashId }: { insightId: number; dashId: number }) => {
      await apiRequest("PATCH", `/api/v2/analytics/insights/${insightId}`, { status: "pinned" });
      const dash = await fetch(`/api/v2/analytics/definitions/${dashId}`, { credentials: "include" }).then(r => r.json());
      return apiRequest("POST", `/api/v2/analytics/definitions/${dashId}/items`, {
        insightId, position: (dash.items?.length || 0),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions"] });
      toast({ title: "Pinned to dashboard!" });
      setPinDialogOpen(false);
    },
    onError: () => toast({ title: "Pin failed", variant: "destructive" }),
  });

  const createDashAndPinMutation = useMutation({
    mutationFn: async ({ insightId, name }: { insightId: number; name: string }) => {
      const dash: AnalyticsDashboardDefinition = await apiRequest("POST", "/api/v2/analytics/definitions", { title: name }).then(r => r.json());
      await apiRequest("POST", `/api/v2/analytics/definitions/${dash.id}/items`, { insightId, position: 0 });
      return dash;
    },
    onSuccess: (dash) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions"] });
      toast({ title: "New dashboard created!" });
      setPinDialogOpen(false);
      navigate(`/analytics/dashboards/${dash.id}`);
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAsk = useCallback((q?: string, asFollowUp?: boolean) => {
    const query = (q || question).trim();
    if (!query || askMutation.isPending) return;
    if (!q) setQuestion(query);
    // If explicitly triggered as follow-up, set mode; otherwise start fresh
    if (asFollowUp !== undefined) setFollowUpMode(asFollowUp);
    askMutation.mutate(query);
  }, [question, askMutation]);

  const handleNewQuestion = useCallback(() => {
    setFollowUpMode(false);
    setResult(null);
    setSavedInsightId(null);
    setQuestion("");
    setChartOverride("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handlePinConfirm = async () => {
    let insightId = savedInsightId;
    if (!insightId) {
      const saved = await saveInsightMutation.mutateAsync();
      insightId = saved.id;
    }
    if (selectedDashId === "new") {
      if (!newDashName.trim()) return;
      createDashAndPinMutation.mutate({ insightId: insightId!, name: newDashName });
    } else if (selectedDashId) {
      pinInsightMutation.mutate({ insightId: insightId!, dashId: Number(selectedDashId) });
    }
  };

  const handleExport = () => {
    if (!result) return;
    const cfg = result.chartConfig?.data as Record<string, unknown>;
    const chartData = (cfg as { data?: { name: string; value: number }[] })?.data;
    if (chartData) {
      downloadCSV(chartData, result.title);
    } else {
      toast({ title: "Export not available for this chart type" });
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const measures = (ds?.columns ?? []).filter(c => c.columnType === "measure");
  const dimensions = (ds?.columns ?? []).filter(c => c.columnType === "dimension");
  const dates = (ds?.columns ?? []).filter(c => c.columnType === "date");

  const starterPrompts = [
    measures[0] && `Total ${measures[0].label}`,
    measures[0] && dimensions[0] && `${measures[0].label} by ${dimensions[0].label}`,
    measures[0] && dates[0] && `${measures[0].label} over time`,
    dimensions[0] && measures[0] && `Top 5 ${dimensions[0].label} by ${measures[0].label}`,
    measures[0] && dimensions[1] && `${measures[0].label} by ${dimensions[1]?.label}`,
    measures[1] && `Average ${measures[1].label}`,
    measures[0] && dimensions[0] && `${measures[0].label} share by ${dimensions[0].label}`,
  ].filter(Boolean) as string[];

  const activeChartType = chartOverride || result?.chartType || "";
  const currentChartLabel = CHART_TYPE_OPTIONS.find(o => o.value === activeChartType)?.label || "Auto";
  const currentDisplayFormat = (result?.chartConfig?.displayFormat === "full" ? "full" : "compact") as NumberDisplayFormat;
  const _resCfg = result?.chartConfig as { data?: { comparisonLabel?: string }; comparisonLabel?: string; comparisonMeasure?: string } | null | undefined;
  const resultHasComparison = !!(_resCfg?.data?.comparisonLabel || _resCfg?.comparisonLabel || _resCfg?.comparisonMeasure);

  const setNumberDisplayFormat = (displayFormat: NumberDisplayFormat) => {
    setResult(prev => prev ? {
      ...prev,
      chartConfig: { ...prev.chartConfig, displayFormat },
    } : prev);
    if (savedInsightId) setSavedInsightId(null);
  };

  // ── Parse interpretation for the details panel ─────────────────────────────

  const interpParts = result ? (() => {
    const cfg = result.chartConfig as {
      measure?: string; dimension?: string; aggregation?: string;
    } | null;
    return {
      measure: cfg?.measure || "—",
      dimension: cfg?.dimension || "None",
      aggregation: cfg?.aggregation ? (cfg.aggregation === "countd" ? "Distinct Count" : cfg.aggregation.charAt(0).toUpperCase() + cfg.aggregation.slice(1)) : "—",
      chartType: currentChartLabel,
    };
  })() : null;

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
          <p className="text-sm text-muted-foreground">Loading dataset…</p>
        </div>
      </div>
    );
  }

  if (isError || !ds) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
          <div className="h-14 w-14 rounded-2xl bg-muted/40 flex items-center justify-center">
            <Database className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <div>
            <p className="font-semibold mb-1">Dataset not found</p>
            <p className="text-sm text-muted-foreground">This dataset may have been deleted or you don't have access to it.</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/analytics")} className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" /> Back to Analytics Studio
          </Button>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b bg-background/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate("/analytics")} className="gap-1.5 h-8 text-muted-foreground shrink-0" data-testid="button-back">
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="h-4 w-px bg-border shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 shrink-0">
              <Database className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-none truncate">{ds.name}</p>
              <p className="text-[10px] text-muted-foreground">{ds.rowCount?.toLocaleString()} rows · {ds.columns.length} columns</p>
            </div>
          </div>
          {result && (
            <>
              <span className="text-muted-foreground/30 hidden sm:block">/</span>
              <Badge variant="outline" className="text-[10px] hidden sm:flex">{result.title}</Badge>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs text-muted-foreground" onClick={() => navigate(`/analytics/datasets/${id}/configure`)} data-testid="button-configure">
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Configure</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs text-muted-foreground" onClick={() => autoInsightsMutation.mutate()} disabled={autoInsightsMutation.isPending} data-testid="button-auto-insights">
            {autoInsightsMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Suggest</span>
          </Button>
        </div>
      </div>

      {/* ── Main 3-column layout ───────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT: Field Explorer ─────────────────────────────────────────── */}
        <div className="w-[200px] shrink-0 border-r overflow-y-auto hidden lg:flex flex-col">
          <div className="p-3 space-y-4 flex-1">

            {/* Dataset info */}
            <div className="rounded-lg bg-muted/30 p-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Dataset</p>
              <p className="text-xs font-semibold truncate">{ds.name}</p>
              {ds.sheetNames && ds.sheetNames.length > 1 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{ds.sheetNames.length} sheets</p>
              )}
            </div>

            {/* Measures */}
            {measures.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Measures</p>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 rounded-full">{measures.length}</span>
                </div>
                <div className="space-y-0.5">
                  {measures.map(c => (
                    <FieldItem
                      key={c.id}
                      icon={Hash}
                      label={c.label}
                      detail={c.aggregation || undefined}
                      color="text-emerald-600"
                      onClick={() => { setQuestion(`Total ${c.label}`); inputRef.current?.focus(); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Dimensions */}
            {dimensions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Dimensions</p>
                  <span className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-400 px-1.5 rounded-full">{dimensions.length}</span>
                </div>
                <div className="space-y-0.5">
                  {dimensions.map(c => (
                    <FieldItem
                      key={c.id}
                      icon={AlignLeft}
                      label={c.label}
                      color="text-blue-600"
                      onClick={() => { setQuestion(`${measures[0]?.label || "Value"} by ${c.label}`); inputRef.current?.focus(); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            {dates.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Dates</p>
                  <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 rounded-full">{dates.length}</span>
                </div>
                <div className="space-y-0.5">
                  {dates.map(c => (
                    <FieldItem
                      key={c.id}
                      icon={Calendar}
                      label={c.label}
                      color="text-amber-600"
                      onClick={() => { setQuestion(`${measures[0]?.label || "Value"} by ${c.label}`); inputRef.current?.focus(); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Saved Insights */}
            {ds.insights && ds.insights.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Saved Insights</p>
                <div className="space-y-0.5">
                  {ds.insights.slice(0, 8).map(ins => (
                    <FieldItem
                      key={ins.id}
                      icon={Lightbulb}
                      label={ins.title}
                      color="text-purple-600"
                      onClick={() => {
                        setQuestion(ins.question || "");
                        setSavedInsightId(ins.id);
                        setChartOverride("");
                        setResult({
                          title: ins.title,
                          subtitle: null,
                          interpretation: ins.interpretation || "",
                          chartType: ins.chartType,
                          chartConfig: (ins.chartConfig as Record<string, unknown>) || {},
                          narrative: ins.narrative || "",
                          suggestedQuestions: [],
                          question: ins.question || "",
                        });
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Data Filters — dimension value explorer */}
            {ds.dimensionValues && Object.keys(ds.dimensionValues).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Data Filters</p>
                  {activeFilters.length > 0 && (
                    <button onClick={() => setActiveFilters([])} className="text-[9px] text-destructive/70 hover:text-destructive transition-colors">Clear</button>
                  )}
                </div>
                <div className="space-y-2">
                  {Object.entries(ds.dimensionValues).filter(([, v]) => v.length > 0).map(([col, vals]) => {
                    const isExpanded = filterPanelExpanded[col] === true;
                    const displayVals = isExpanded ? vals : vals.slice(0, 6);
                    const hasMore = !isExpanded && vals.length > 6;
                    return (
                      <div key={col}>
                        <button
                          onClick={() => setFilterPanelExpanded(p => ({ ...p, [col]: !isExpanded }))}
                          className="w-full flex items-center justify-between px-1 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="uppercase tracking-wide">{col}</span>
                          <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </button>
                        <div className="flex flex-wrap gap-1 mt-1 pl-1">
                          {displayVals.map(val => {
                            const active = activeFilters.some(f => f.column === col && f.value === val);
                            return (
                              <button
                                key={val}
                                onClick={() => toggleFilter(col, val)}
                                data-testid={`filter-value-${col}-${val}`}
                                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                                  active
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                                }`}
                                title={val}
                              >
                                {val.length > 18 ? val.slice(0, 16) + "…" : val}
                              </button>
                            );
                          })}
                          {hasMore && (
                            <button onClick={() => setFilterPanelExpanded(p => ({ ...p, [col]: true }))} className="text-[10px] text-primary/70 hover:text-primary px-1">+{vals.length - 6} more</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Recent</p>
                <div className="space-y-0.5">
                  {history.slice(0, 6).map((h, i) => (
                    <FieldItem
                      key={i}
                      icon={Clock}
                      label={h.question}
                      color="text-muted-foreground"
                      onClick={() => { setQuestion(h.question); handleAsk(h.question); }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: Main insight area ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* Search bar — always sticky at top of center */}
          <div className="px-5 py-4 border-b bg-background shrink-0 space-y-2">
            {/* Active filter chips */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Filters:</span>
                {activeFilters.map(f => (
                  <button
                    key={`${f.column}:${f.value}`}
                    onClick={() => toggleFilter(f.column, f.value)}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors"
                    data-testid={`filter-chip-${f.column}-${f.value}`}
                  >
                    <span className="font-medium">{f.column}</span>
                    <span className="opacity-60">=</span>
                    <span>{f.value}</span>
                    <X className="h-2.5 w-2.5" />
                  </button>
                ))}
                <button onClick={() => setActiveFilters([])} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors ml-1">Clear all</button>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <div className={`flex-1 flex gap-2 items-center rounded-xl border-2 bg-background px-4 py-3 transition-all duration-200 ${askMutation.isPending ? "border-primary/40 shadow-lg shadow-primary/5" : "border-border hover:border-primary/40 focus-within:border-primary/60 focus-within:shadow-lg focus-within:shadow-primary/5"}`}>
                <Sparkles className={`h-4 w-4 shrink-0 transition-colors ${askMutation.isPending ? "text-primary animate-pulse" : "text-muted-foreground/50"}`} />
                <input
                  ref={inputRef}
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAsk()}
                  placeholder={`Ask about your data — e.g. "${EXAMPLE_PROMPTS[Math.floor(Date.now() / 8000) % EXAMPLE_PROMPTS.length]}"`}
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/40"
                  disabled={askMutation.isPending}
                  data-testid="input-analytics-question"
                />
                {question && !askMutation.isPending && (
                  <button onClick={() => setQuestion("")} className="text-muted-foreground/50 hover:text-foreground shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button
                onClick={() => handleAsk()}
                disabled={!question.trim() || askMutation.isPending}
                className="h-[46px] px-5 gap-2 shrink-0"
                data-testid="button-ask"
              >
                {askMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing</>
                  : <><Send className="h-4 w-4" /> Ask</>}
              </Button>
            </div>
          </div>

          {/* Scrollable center body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* ── Loading state ─────────────────────────────────────── */}
            {askMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-primary animate-pulse" />
                  </div>
                  <div className="absolute -inset-1 bg-primary/5 rounded-2xl animate-ping" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold mb-1">Analyzing your data…</p>
                  <p className="text-xs text-muted-foreground max-w-xs">"{question}"</p>
                </div>
                <div className="flex gap-2 mt-1">
                  {["Interpreting question", "Selecting chart", "Computing data"].map((step, i) => (
                    <span key={step} className="text-[10px] px-2.5 py-1 rounded-full border bg-muted/30 text-muted-foreground animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Empty state ──────────────────────────────────────── */}
            {!result && !askMutation.isPending && (
              <div className="space-y-5">
                {/* AI suggestions */}
                {ds.autoInsights && ds.autoInsights.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <p className="text-xs font-semibold text-muted-foreground">AI Suggested Questions</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ds.autoInsights.slice(0, 8).map(ai => {
                        const q = (ai.chartConfig as { suggestedQuestion?: string } | null)?.suggestedQuestion || ai.title;
                        return (
                          <button
                            key={ai.id}
                            onClick={() => handleAsk(q)}
                            className="text-xs px-3 py-1.5 rounded-full border bg-card hover:bg-primary/5 hover:border-primary/40 hover:text-primary transition-all"
                            data-testid={`suggestion-${ai.id}`}
                          >
                            {ai.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Starter prompts */}
                {starterPrompts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Zap className="h-3 w-3" /> Quick Start
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {starterPrompts.slice(0, 6).map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleAsk(q)}
                          className="text-left text-xs px-3.5 py-2.5 rounded-xl border bg-card hover:bg-muted/40 hover:border-primary/30 hover:shadow-sm transition-all group"
                        >
                          <span className="text-muted-foreground group-hover:text-foreground transition-colors">{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No columns warning */}
                {measures.length === 0 && dimensions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border-2 border-dashed">
                    <Settings2 className="h-8 w-8 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-semibold mb-1">Configure your columns first</p>
                    <p className="text-xs text-muted-foreground mb-4 max-w-xs">Classify at least one column as a measure to start asking questions.</p>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/analytics/datasets/${id}/configure`)}>
                      Configure Columns
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── Result ───────────────────────────────────────────── */}
            {result && !askMutation.isPending && (
              <div className="space-y-4">

                {/* Follow-up context ribbon */}
                {result.isFollowUp && result.previousQuestion && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-border/60">
                    <ArrowRight className="h-3 w-3 shrink-0 text-primary/60" />
                    <span className="truncate">Follow-up of: <em className="text-foreground">"{result.previousQuestion}"</em></span>
                    <button onClick={handleNewQuestion} className="ml-auto shrink-0 hover:text-foreground transition-colors" title="Start fresh">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Chart header */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-black leading-tight" data-testid="text-insight-title">{result.title}</h2>
                      {/* Trend direction badge */}
                      {result.trendDirection === "up" && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full" data-testid="badge-trend-up">
                          ↑ Trending Up
                        </span>
                      )}
                      {result.trendDirection === "down" && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full" data-testid="badge-trend-down">
                          ↓ Trending Down
                        </span>
                      )}
                      {result.anomalyDetected && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full" data-testid="badge-anomaly">
                          ⚡ Anomaly Detected
                        </span>
                      )}
                    </div>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground mt-0.5">{result.subtitle}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {ds.rowCount?.toLocaleString()} records · {CHART_TYPE_OPTIONS.find(o => o.value === activeChartType)?.label || activeChartType}
                    </p>
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground" onClick={handleNewQuestion} data-testid="button-new-question">
                      <RefreshCw className="h-3.5 w-3.5" /> New
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-muted-foreground" onClick={handleExport} data-testid="button-export">
                      <Download className="h-3.5 w-3.5" /> Export
                    </Button>
                    {savedInsightId ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold px-3 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20" data-testid="status-saved">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                      </span>
                    ) : (
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => saveInsightMutation.mutate()} disabled={saveInsightMutation.isPending} data-testid="button-save-insight">
                        {saveInsightMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                      </Button>
                    )}
                    <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => { if (!savedInsightId) saveInsightMutation.mutate(); setPinDialogOpen(true); }} data-testid="button-pin-insight">
                      <Pin className="h-3.5 w-3.5" /> Pin to Dashboard
                    </Button>
                  </div>
                </div>

                {/* Anomaly note */}
                {result.anomalyDetected && result.anomalyNote && (
                  <div className="flex items-start gap-2.5 text-xs bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2.5" data-testid="anomaly-note">
                    <span className="text-amber-600 shrink-0 mt-0.5">⚡</span>
                    <p className="text-amber-800 dark:text-amber-300">{result.anomalyNote}</p>
                  </div>
                )}

                {/* Chart type switcher */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mr-1 shrink-0">Visual:</span>
                  {CHART_TYPE_OPTIONS.map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      onClick={() => setChartOverride(activeChartType === value ? "" : value)}
                      className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${activeChartType === value ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"}`}
                      data-testid={`chart-type-${value}`}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </button>
                  ))}
                  <span className="h-5 w-px bg-border mx-1" />
                  <button
                    onClick={() => setNumberDisplayFormat(currentDisplayFormat === "full" ? "compact" : "full")}
                    className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${currentDisplayFormat === "full" ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"}`}
                    data-testid="button-number-format"
                  >
                    <Hash className="h-3 w-3" />
                    {currentDisplayFormat === "full" ? "Full numbers" : "Compact numbers"}
                  </button>
                  {resultHasComparison && (
                    <>
                      <span className="h-5 w-px bg-border mx-1" />
                      <button
                        onClick={() => setHideComparison(h => !h)}
                        className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${hideComparison ? "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground" : "bg-primary text-primary-foreground border-primary shadow-sm"}`}
                        data-testid="button-toggle-comparison"
                        title={hideComparison ? "Show comparison" : "Hide comparison"}
                      >
                        {hideComparison ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        Comparison
                      </button>
                    </>
                  )}
                </div>

                {/* Chart canvas */}
                <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                  <div className={`h-[3px] bg-gradient-to-r ${result.trendDirection === "up" ? "from-emerald-500 to-emerald-300" : result.trendDirection === "down" ? "from-red-500 to-red-300" : result.anomalyDetected ? "from-amber-500 to-amber-300" : "from-primary via-primary/60 to-primary/20"}`} />
                  <div className="p-5">
                    <InsightChart result={result} override={activeChartType} hideComparison={hideComparison} />
                  </div>
                </div>

                {/* Follow-up questions */}
                {result.suggestedQuestions?.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <ArrowRight className="h-3 w-3" /> Follow-up questions
                      </p>
                      <button
                        onClick={() => { setFollowUpMode(!followUpMode); }}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full border transition-all ${followUpMode ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"}`}
                        data-testid="button-followup-mode"
                      >
                        {followUpMode ? "Context ON" : "Context OFF"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.suggestedQuestions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleAsk(q, true)}
                          className="text-xs px-3 py-1.5 rounded-full border bg-card hover:bg-primary/5 hover:border-primary/40 hover:text-primary transition-all group"
                          data-testid={`followup-${i}`}
                        >
                          <ArrowRight className="h-2.5 w-2.5 inline mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Insight Details Panel ─────────────────────────────────── */}
        <div className={`w-[260px] shrink-0 border-l overflow-y-auto hidden xl:flex flex-col transition-all duration-300 ${result ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          <div className="p-4 space-y-5">

            {!result ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Lightbulb className="h-8 w-8 text-muted-foreground/20 mb-3" />
                <p className="text-xs text-muted-foreground">Ask a question to see insight details here</p>
              </div>
            ) : (
              <>
                {/* Question asked */}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Send className="h-2.5 w-2.5" /> Question
                  </p>
                  <p className="text-xs italic text-foreground leading-relaxed bg-muted/30 rounded-lg p-2.5">"{result.question}"</p>
                </div>

                {/* Interpretation */}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Info className="h-2.5 w-2.5" /> How it was interpreted
                  </p>
                  <p className="text-[11px] text-muted-foreground italic mb-2 leading-relaxed">{result.interpretation}</p>
                  <div className="rounded-lg border overflow-hidden">
                    {interpParts && (
                      <div className="px-3 py-1 divide-y divide-border/50">
                        <InterpRow label="Measure" value={interpParts.measure} highlight />
                        <InterpRow label="Dimension" value={interpParts.dimension} />
                        <InterpRow label="Aggregation" value={interpParts.aggregation} />
                        <InterpRow label="Chart" value={currentChartLabel} />
                        {result.trendDirection && result.trendDirection !== "null" && (
                          <InterpRow label="Trend" value={result.trendDirection === "up" ? "↑ Upward" : result.trendDirection === "down" ? "↓ Downward" : "→ Flat"} />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Top / Bottom performers */}
                {(result.topValue || result.bottomValue) && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Zap className="h-2.5 w-2.5" /> Key Values
                    </p>
                    <div className="space-y-1.5">
                      {result.topValue && (
                        <div className="flex items-center justify-between rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2">
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">▲ Highest</span>
                          <div className="text-right">
                            <p className="text-xs font-bold">{formatValue(result.topValue.value)}</p>
                            <p className="text-[10px] text-muted-foreground">{result.topValue.name}</p>
                          </div>
                        </div>
                      )}
                      {result.bottomValue && (
                        <div className="flex items-center justify-between rounded-lg bg-red-500/5 border border-red-500/20 px-3 py-2">
                          <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold">▼ Lowest</span>
                          <div className="text-right">
                            <p className="text-xs font-bold">{formatValue(result.bottomValue.value)}</p>
                            <p className="text-[10px] text-muted-foreground">{result.bottomValue.name}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Narrative */}
                {result.narrative && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> AI Analysis
                    </p>
                    <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                      <p className="text-xs text-foreground leading-relaxed">{result.narrative}</p>
                    </div>
                  </div>
                )}

                {/* Suggested questions */}
                {result.suggestedQuestions?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <ArrowRight className="h-2.5 w-2.5" /> Explore Further
                    </p>
                    <div className="space-y-1.5">
                      {result.suggestedQuestions.slice(0, 4).map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleAsk(q, true)}
                          className="w-full text-left text-xs px-3 py-2 rounded-lg border bg-card hover:bg-muted/40 hover:border-primary/30 transition-all flex items-center gap-2 group"
                        >
                          <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0 group-hover:text-primary transition-colors" />
                          <span className="leading-snug">{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick actions */}
                <div className="pt-1 space-y-2">
                  <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-2 justify-start" onClick={() => saveInsightMutation.mutate()} disabled={!!savedInsightId || saveInsightMutation.isPending} data-testid="button-save-insight-panel">
                    {savedInsightId ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Saved</> : <><Save className="h-3.5 w-3.5" /> Save Insight</>}
                  </Button>
                  <Button size="sm" className="w-full h-8 text-xs gap-2 justify-start" onClick={() => { if (!savedInsightId) saveInsightMutation.mutate(); setPinDialogOpen(true); }} data-testid="button-pin-panel">
                    <Pin className="h-3.5 w-3.5" /> Pin to Dashboard
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full h-8 text-xs gap-2 justify-start text-muted-foreground" onClick={handleExport}>
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full h-8 text-xs gap-2 justify-start text-muted-foreground" onClick={handleNewQuestion}>
                    <RefreshCw className="h-3.5 w-3.5" /> New Question
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Pin to Dashboard Dialog ───────────────────────────────────────── */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pin className="h-4 w-4 text-primary" /> Pin to Dashboard
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Choose an existing dashboard or create a new one.</p>
            <Select value={selectedDashId} onValueChange={setSelectedDashId} data-testid="select-pin-dashboard">
              <SelectTrigger>
                <SelectValue placeholder="Select dashboard…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">
                  <span className="flex items-center gap-2"><Plus className="h-3.5 w-3.5" /> Create new dashboard</span>
                </SelectItem>
                {definitions.map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    <span className="flex items-center gap-2">
                      <LayoutDashboard className="h-3.5 w-3.5 text-muted-foreground" /> {d.title}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDashId === "new" && (
              <Input
                value={newDashName}
                onChange={e => setNewDashName(e.target.value)}
                placeholder="New dashboard name…"
                data-testid="input-new-dashboard-name"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handlePinConfirm}
              disabled={
                !selectedDashId ||
                (selectedDashId === "new" && !newDashName.trim()) ||
                pinInsightMutation.isPending ||
                createDashAndPinMutation.isPending ||
                saveInsightMutation.isPending
              }
              className="gap-1.5"
              data-testid="button-confirm-pin"
            >
              {(pinInsightMutation.isPending || createDashAndPinMutation.isPending || saveInsightMutation.isPending)
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Pin className="h-4 w-4" />}
              Pin Insight
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
