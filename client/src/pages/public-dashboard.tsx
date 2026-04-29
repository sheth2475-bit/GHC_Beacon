import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Loader2, Globe, AlertTriangle, RefreshCw, Filter, Search, Calendar,
  Sparkles, X, ChevronRight, ChevronDown, Eye, EyeOff,
  Maximize2,
} from "lucide-react";
import {
  BarChart, Bar, LineChart as ReLineChart, Line, AreaChart, Area,
  PieChart as RechartPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LabelList, Legend,
} from "recharts";
import type { AnalyticsInsight } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────
type NumberDisplayFormat = "compact" | "full";
type ValueFormat = "number" | "percent" | "minutes" | "hours" | "count";
type Dashboard = {
  id: number; title: string; description?: string | null;
  narrativeSummary?: string | null; shareToken?: string; shareEnabled?: boolean;
};
type InsightFull = {
  id: number; insightId: number; sortOrder?: number; position?: number;
  titleOverride?: string | null; colorOverride?: string | null;
  insight: AnalyticsInsight;
};
type DatasetInfo = {
  id: number;
  rawData: Record<string, unknown>[];
  columns: { columnName: string; label: string; columnType: string; isFormula?: boolean | null; formulaExpression?: string | null }[];
};

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_COLORS = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4","#84cc16","#f97316","#6366f1"];

const THEMES: Record<string, { name: string; colors: string[] }> = {
  classic:    { name: "Classic",    colors: ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4","#84cc16","#f97316","#6366f1"] },
  ocean:      { name: "Ocean",      colors: ["#0ea5e9","#06b6d4","#0891b2","#38bdf8","#67e8f9","#2563eb","#1d4ed8","#7dd3fc","#93c5fd","#bfdbfe"] },
  sunset:     { name: "Sunset",     colors: ["#f97316","#f59e0b","#ef4444","#ec4899","#d946ef","#fb923c","#fbbf24","#e11d48","#c026d3","#a855f7"] },
  forest:     { name: "Forest",     colors: ["#10b981","#22c55e","#84cc16","#34d399","#4ade80","#a3e635","#6ee7b7","#86efac","#059669","#16a34a"] },
  rose:       { name: "Rose",       colors: ["#f43f5e","#ec4899","#a855f7","#8b5cf6","#fb7185","#f9a8d4","#e879f9","#c084fc","#fda4af","#d946ef"] },
  slate:      { name: "Mono",       colors: ["#64748b","#475569","#334155","#94a3b8","#1e293b","#0f172a","#cbd5e1","#e2e8f0","#374151","#6b7280"] },
};
const DEFAULT_THEME = "classic";
function getPalette(colorOverride?: string | null): string[] {
  if (!colorOverride) return THEMES[DEFAULT_THEME].colors;
  return THEMES[colorOverride]?.colors ?? THEMES[DEFAULT_THEME].colors;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_ORDER: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const QUARTERS: Record<string, string> = { Jan: "Q1", Feb: "Q1", Mar: "Q1", Apr: "Q2", May: "Q2", Jun: "Q2", Jul: "Q3", Aug: "Q3", Sep: "Q3", Oct: "Q4", Nov: "Q4", Dec: "Q4" };

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatValue(v: number, mode: NumberDisplayFormat = "compact") {
  if (mode === "full") return Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
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
  const vf = (cfg?.valueFormat as string) || (cfg?.data as Record<string, unknown>)?.valueFormat as string;
  if (vf === "percent" || vf === "minutes" || vf === "hours" || vf === "count") return vf;
  return "number";
}
function formatVariancePct(v: unknown): string {
  if (typeof v !== "number" || !isFinite(v)) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function parseUtcDate(val: unknown): Date | null {
  const str = String(val ?? "").trim();
  if (!str) return null;
  let d = new Date(str);
  if (isNaN(d.getTime())) {
    const m = str.match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (m) d = new Date(`${m[1]} 1, ${m[2]}`);
  }
  if (isNaN(d.getTime())) {
    const m = str.match(/^(\d{4})-(\d{2})$/);
    if (m) d = new Date(`${m[1]}-${m[2]}-01`);
  }
  if (isNaN(d.getTime())) {
    const m = str.match(/^(\d{1,2})\/(\d{4})$/);
    if (m) d = new Date(`${m[2]}-${m[1].padStart(2,"0")}-01`);
  }
  if (isNaN(d.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return new Date(str + (str.length === 10 ? "T00:00:00Z" : ""));
  }
  return d;
}
function utcMonthLabel(d: Date): string {
  const iso = d.toISOString();
  const [yearStr, monStr] = iso.split("-");
  return `${MONTH_NAMES[Number(monStr) - 1]} ${yearStr}`;
}
function parseDateParts(val: unknown): { year: string; quarter: string; month: string } | null {
  const d = parseUtcDate(val);
  if (!d) return null;
  const iso = d.toISOString();
  const yearNum = Number(iso.slice(0, 4));
  const monIdx = Number(iso.slice(5, 7)) - 1;
  const year = String(yearNum);
  const month = MONTH_NAMES[monIdx];
  const q = `Q${Math.ceil((monIdx + 1) / 3)}`;
  return { year, quarter: `${year}|${q}`, month: `${year}|${month}` };
}
type DateHierarchy = Record<string, Record<string, Record<string, number>>>;
function buildDateHierarchy(rows: Record<string, unknown>[], col: string): DateHierarchy {
  const h: DateHierarchy = {};
  for (const row of rows) {
    const parts = parseDateParts(row[col]);
    if (!parts) continue;
    const mon = parts.month.split("|")[1];
    const q = QUARTERS[mon] || "Q?";
    if (!h[parts.year]) h[parts.year] = {};
    if (!h[parts.year][q]) h[parts.year][q] = {};
    h[parts.year][q][mon] = (h[parts.year][q][mon] || 0) + 1;
  }
  return h;
}

// ─── Chart data helpers ────────────────────────────────────────────────────────
function shortLabel(name: string, maxLen = 8): string {
  const m = name.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m) return `${m[1]} '${m[2].slice(2)}`;
  return name.length > maxLen ? name.slice(0, maxLen - 1) + "…" : name;
}
function normalizeSeriesData(d: Record<string, unknown>): { name: string; value: number; comparisonValue?: number }[] {
  if (Array.isArray((d as { data?: unknown }).data)) {
    return (d as { data: { name: string; value: number; comparisonValue?: number }[] }).data;
  }
  const rows = (d as { rows?: Record<string, unknown>[] }).rows;
  const cols = (d as { columns?: string[] }).columns;
  if (Array.isArray(rows) && Array.isArray(cols) && cols.length >= 2) {
    return rows.map(r => ({ name: String(r[cols[0]] ?? ""), value: Number(r[cols[1]] ?? 0) }));
  }
  return [];
}
function insightHasComparison(insight: AnalyticsInsight): boolean {
  const data = (insight.chartConfig as { data?: Record<string, unknown> } | null)?.data;
  if (!data) return false;
  return !!(data as { comparisonLabel?: string }).comparisonLabel ||
    normalizeSeriesData(data as Record<string, unknown>).some(d => typeof d.comparisonValue === "number");
}

// ─── Client-side filter compute helpers ───────────────────────────────────────
type DatasetColumnLike = { columnName: string; label: string; isFormula?: boolean | null; formulaExpression?: string | null };
function applyFormulaColumnsClient(rows: Record<string, unknown>[], columns: DatasetColumnLike[]): Record<string, unknown>[] {
  const formulaCols = columns.filter(c => c.isFormula && c.formulaExpression);
  if (!formulaCols.length) return rows;
  const baseCols = columns.filter(c => !c.isFormula);
  return rows.map(row => {
    const out = { ...row };
    for (const col of formulaCols) {
      try {
        let expr = col.formulaExpression!;
        for (const c of baseCols) {
          const labelRe = new RegExp(`\\[${c.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`, "g");
          const nameRe  = new RegExp(`\\[${c.columnName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`, "g");
          const val = String(Number(row[c.columnName]) || 0);
          expr = expr.replace(labelRe, val).replace(nameRe, val);
        }
        expr = expr.replace(/\[[^\]]+\]/g, "0");
        // eslint-disable-next-line no-new-func
        const result = new Function(`"use strict"; return (${expr})`)();
        const computed = typeof result === "number" && isFinite(result) ? Math.round(result * 1000) / 1000 : 0;
        out[col.columnName] = computed;
        out[col.label] = computed;
      } catch {
        out[col.columnName] = 0;
        out[col.label] = 0;
      }
    }
    return out;
  });
}
function clientAggregateData(
  rows: Record<string, unknown>[], measure: string, dimension: string | null, aggregation: string = "sum"
): { name: string; value: number }[] {
  if (!dimension) {
    const vals = rows.map(r => Number(r[measure])).filter(v => !isNaN(v));
    const total = aggregation === "avg" ? vals.reduce((a, b) => a + b, 0) / (vals.length || 1) : aggregation === "count" ? vals.length : aggregation === "min" ? Math.min(...vals) : aggregation === "max" ? Math.max(...vals) : vals.reduce((a, b) => a + b, 0);
    return [{ name: measure, value: Math.round(total * 100) / 100 }];
  }
  const groups: Record<string, number[]> = {};
  for (const row of rows) {
    const rawKey = row[dimension];
    let key: string;
    const parsed = parseUtcDate(rawKey);
    if (parsed) { key = utcMonthLabel(parsed); } else { key = String(rawKey ?? "Unknown").trim() || "Unknown"; }
    if (!groups[key]) groups[key] = [];
    const val = Number(row[measure]);
    if (!isNaN(val)) groups[key].push(val);
  }
  const result = Object.entries(groups).map(([name, vals]) => {
    const value = aggregation === "avg" ? vals.reduce((a, b) => a + b, 0) / (vals.length || 1) : aggregation === "count" ? vals.length : aggregation === "min" ? Math.min(...vals) : aggregation === "max" ? Math.max(...vals) : vals.reduce((a, b) => a + b, 0);
    return { name, value: Math.round(value * 100) / 100 };
  });
  const isDimDate = /month|date|year|period|quarter|week/i.test(dimension);
  if (isDimDate) { result.sort((a, b) => { const da = new Date(a.name), db = new Date(b.name); return !isNaN(da.getTime()) && !isNaN(db.getTime()) ? da.getTime() - db.getTime() : 0; }); }
  else { result.sort((a, b) => b.value - a.value); }
  return result;
}
function computeFilteredData(rows: Record<string, unknown>[], insight: AnalyticsInsight): unknown {
  const cfg = insight.chartConfig as { measure?: string; dimension?: string | null; aggregation?: string; measureLabel?: string; comparisonMeasure?: string | null; comparisonLabel?: string | null } | null;
  if (!cfg?.measure) return null;
  const measure = cfg.measure;
  const dimension = cfg.dimension || null;
  const agg = cfg.aggregation || "sum";
  if (insight.chartType === "kpi") {
    const vals = rows.map(r => Number(r[measure])).filter(v => !isNaN(v));
    const value = agg === "avg" ? vals.reduce((a, b) => a + b, 0) / (vals.length || 1) : agg === "count" ? vals.length : agg === "min" ? Math.min(...vals) : agg === "max" ? Math.max(...vals) : vals.reduce((a, b) => a + b, 0);
    const data: Record<string, unknown> = { value: Math.round(value * 100) / 100, label: cfg.measureLabel || measure, count: vals.length };
    if (cfg.comparisonMeasure) {
      const compVals = rows.map(r => Number(r[cfg.comparisonMeasure!])).filter(v => !isNaN(v));
      const compValue = agg === "avg" ? compVals.reduce((a, b) => a + b, 0) / (compVals.length || 1) : compVals.reduce((a, b) => a + b, 0);
      data.comparisonValue = Math.round(compValue * 100) / 100;
      data.comparisonLabel = cfg.comparisonLabel || "Comparison";
      data.variance = (data.value as number) - (data.comparisonValue as number);
      data.variancePct = (data.comparisonValue as number) !== 0 ? (((data.value as number) - (data.comparisonValue as number)) / Math.abs(data.comparisonValue as number)) * 100 : null;
    }
    return data;
  }
  const series = clientAggregateData(rows, measure, dimension, agg);
  if (cfg.comparisonMeasure) {
    const compSeries = clientAggregateData(rows, cfg.comparisonMeasure, dimension, agg);
    const compMap = Object.fromEntries(compSeries.map(d => [d.name, d.value]));
    const merged = series.map(d => ({ ...d, comparisonValue: compMap[d.name] ?? undefined }));
    return { data: merged, measureLabel: cfg.measureLabel || measure, comparisonLabel: cfg.comparisonLabel || "Comparison" };
  }
  return { data: series, measureLabel: cfg.measureLabel || measure };
}

// ─── MiniChart ────────────────────────────────────────────────────────────────
function MiniChart({ insight, filteredData, color, hideComparison }: { insight: AnalyticsInsight; filteredData?: unknown; color?: string; hideComparison?: boolean }) {
  const baseCfg = insight.chartConfig as Record<string, unknown> | null;
  const cfg: Record<string, unknown> | null = filteredData != null ? { ...(baseCfg || {}), data: filteredData } : baseCfg;
  if (!cfg) return <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">No data</div>;
  const { chartType } = insight;
  const data = cfg.data as Record<string, unknown>;
  const displayFormat = (cfg.displayFormat === "full" ? "full" : "compact") as NumberDisplayFormat;
  const valueFormat = resolveValueFormat(cfg);
  const palette = getPalette(color);
  const c0 = palette[0];
  const c3 = palette[3] ?? CHART_COLORS[3];

  if (chartType === "kpi" && data) {
    const kpi = data as { value: number; label: string; comparisonValue?: number; comparisonLabel?: string; variance?: number; variancePct?: number | null; valueFormat?: string };
    const kpiVf = (kpi.valueFormat === "percent" || kpi.valueFormat === "minutes" || kpi.valueFormat === "hours" || kpi.valueFormat === "count") ? kpi.valueFormat as ValueFormat : valueFormat;
    return (
      <div className="flex flex-col items-center justify-center h-40">
        <div className="text-4xl font-black tracking-tight" style={{ color: c0 }}>{formatKpiValue(kpi.value, displayFormat, kpiVf)}</div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center px-2">{kpi.label}</p>
        {typeof kpi.comparisonValue === "number" && (
          <p className={`text-[10px] mt-1 font-semibold ${Number(kpi.variance) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            vs {kpi.comparisonLabel || "Comparison"} {formatKpiValue(kpi.comparisonValue, displayFormat, kpiVf)} · {formatVariancePct(kpi.variancePct)}
          </p>
        )}
      </div>
    );
  }

  if ((chartType === "bar" || chartType === "column" || chartType === "horizontal-bar" || chartType === "line" || chartType === "area") && data) {
    const chartData = normalizeSeriesData(data as Record<string, unknown>);
    const comparisonLabel = (data as { comparisonLabel?: string }).comparisonLabel || "Comparison";
    const measureLabel = (data as { measureLabel?: string }).measureLabel || "Value";
    const maxItems = (chartType === "bar" || chartType === "column" || chartType === "horizontal-bar") ? 20 : 30;
    const displayData = chartData.slice(0, maxItems).map(d => ({ ...d, shortName: shortLabel(d.name) }));
    const count = displayData.length;
    const hasComparison = !hideComparison && displayData.some(d => typeof d.comparisonValue === "number");
    const hasMany = count > 8;
    const hasTons = count > 15;
    const chartH = hasTons ? 240 : hasMany ? 210 : count > 5 ? 185 : 165;
    const bottomMargin = hasTons ? 44 : hasMany ? 36 : 26;
    const labelAngle = hasTons ? -50 : hasMany ? -35 : -20;
    const tickSize = hasTons ? 7 : hasMany ? 7.5 : 8;
    const fv = (v: number) => formatKpiValue(v, displayFormat, valueFormat);

    if (chartType === "bar" || chartType === "column" || chartType === "horizontal-bar") return (
      <ResponsiveContainer width="100%" height={chartH}>
        <BarChart data={displayData} margin={{ top: 20, right: 6, left: -16, bottom: bottomMargin }}>
          <XAxis dataKey="shortName" tick={{ fontSize: tickSize, fill: "currentColor" }} angle={labelAngle} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 8 }} tickFormatter={fv} width={44} />
          <Tooltip formatter={(v, name, props) => [fv(Number(v)), name === "comparisonValue" ? comparisonLabel : props.payload?.name || ""]} contentStyle={{ fontSize: 11, borderRadius: 6 }} labelFormatter={() => ""} />
          {hasComparison && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "10px" }} />}
          <Bar dataKey="value" name={measureLabel} radius={[3, 3, 0, 0]}>
            {displayData.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
            <LabelList dataKey="value" position="top" formatter={fv} style={{ fontSize: hasTons ? 7 : 8, fill: "currentColor", fontWeight: 600 }} />
          </Bar>
          {hasComparison && <Bar dataKey="comparisonValue" name={comparisonLabel} fill={c3} radius={[3, 3, 0, 0]}>
            <LabelList dataKey="comparisonValue" position="top" formatter={fv} style={{ fontSize: hasTons ? 7 : 8, fill: "currentColor", fontWeight: 600 }} />
          </Bar>}
        </BarChart>
      </ResponsiveContainer>
    );
    return (
      <ResponsiveContainer width="100%" height={chartH}>
        <AreaChart data={displayData} margin={{ top: 20, right: 6, left: -16, bottom: bottomMargin }}>
          <XAxis dataKey="shortName" tick={{ fontSize: tickSize, fill: "currentColor" }} angle={labelAngle} textAnchor="end" interval={0} />
          <YAxis tick={{ fontSize: 8 }} tickFormatter={fv} width={44} />
          <Tooltip formatter={(v, name, props) => [fv(Number(v)), name === "comparisonValue" ? comparisonLabel : props.payload?.name || ""]} contentStyle={{ fontSize: 11, borderRadius: 6 }} labelFormatter={() => ""} />
          {hasComparison && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "10px" }} />}
          <Area type="monotone" dataKey="value" name={measureLabel} stroke={c0} strokeWidth={2} fill={c0 + "20"} dot={count <= 40 ? { r: 2.5, fill: c0 } : false}>
            {count <= 40 && <LabelList dataKey="value" position="top" formatter={fv} style={{ fontSize: hasTons ? 7 : 8, fill: "currentColor", fontWeight: 600 }} />}
          </Area>
          {hasComparison && <Area type="monotone" dataKey="comparisonValue" name={comparisonLabel} stroke={c3} strokeWidth={2} fill={c3 + "10"} dot={count <= 40 ? { r: 2.5, fill: c3 } : false}>
            {count <= 40 && <LabelList dataKey="comparisonValue" position="bottom" formatter={fv} style={{ fontSize: hasTons ? 7 : 8, fill: "currentColor", fontWeight: 600 }} />}
          </Area>}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "pie" && data) {
    const pieData = (data as { data?: { name: string; value: number }[] }).data || [];
    const slices = pieData.slice(0, 7);
    const total = slices.reduce((s, d) => s + d.value, 0);
    const fv = (v: number) => formatKpiValue(v, displayFormat, valueFormat);
    return (
      <div className="flex flex-col gap-1">
        <ResponsiveContainer width="100%" height={140}>
          <RechartPie>
            <Pie data={slices} cx="50%" cy="50%" outerRadius={58} innerRadius={22} dataKey="value" paddingAngle={2}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                if (percent < 0.07) return null;
                const RADIAN = Math.PI / 180;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 9, fontWeight: 700 }}>{`${(percent * 100).toFixed(0)}%`}</text>;
              }} labelLine={false}>
              {slices.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
            </Pie>
            <Tooltip formatter={v => [fv(Number(v)), ""]} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
          </RechartPie>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
          {slices.map((d, i) => (
            <div key={i} className="flex items-center gap-1 min-w-0">
              <span className="shrink-0 h-2 w-2 rounded-full" style={{ backgroundColor: palette[i % palette.length] }} />
              <span className="text-[9px] text-muted-foreground truncate max-w-[70px]" title={d.name}>{d.name}</span>
              <span className="text-[9px] font-semibold shrink-0">{fv(d.value)}</span>
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
    const fv = (v: number) => formatKpiValue(v, displayFormat, valueFormat);
    return (
      <div className="overflow-hidden rounded border">
        <table className="w-full text-[10px]">
          <thead className="bg-muted/50"><tr>{cols.map(c => <th key={c} className="px-2 py-1 text-left font-medium truncate max-w-[90px]">{c}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-border/50">{cols.map(c => <td key={c} className="px-2 py-1 truncate max-w-[90px]">{typeof r[c] === "number" ? fv(Number(r[c])) : String(r[c] ?? "")}</td>)}</tr>)}</tbody>
        </table>
        {(tableData.rows?.length || 0) > 4 && <p className="text-[9px] text-center text-muted-foreground py-1">+{(tableData.rows?.length || 0) - 4} more rows</p>}
      </div>
    );
  }

  return <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">Preview unavailable</div>;
}

// ─── FullChart ────────────────────────────────────────────────────────────────
function FullChart({ insight, filteredData, color, hideComparison }: { insight: AnalyticsInsight; filteredData?: unknown; color?: string; hideComparison?: boolean }) {
  const baseCfg = insight.chartConfig as Record<string, unknown> | null;
  const cfg: Record<string, unknown> | null = filteredData != null ? { ...(baseCfg || {}), data: filteredData } : baseCfg;
  if (!cfg) return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data</div>;
  const { chartType } = insight;
  const data = cfg.data as Record<string, unknown>;
  const displayFormat = (cfg.displayFormat === "full" ? "full" : "compact") as NumberDisplayFormat;
  const valueFormat = resolveValueFormat(cfg);
  const palette = getPalette(color);
  const c0 = palette[0];
  const c3 = palette[3] ?? CHART_COLORS[3];

  if (chartType === "kpi" && data) {
    const kpi = data as { value: number; label: string; count?: number; comparisonValue?: number; comparisonLabel?: string; variance?: number; variancePct?: number | null; valueFormat?: string };
    const kpiVf = (kpi.valueFormat === "percent" || kpi.valueFormat === "minutes" || kpi.valueFormat === "hours" || kpi.valueFormat === "count") ? kpi.valueFormat as ValueFormat : valueFormat;
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="text-8xl font-black tracking-tight">{formatKpiValue(kpi.value, displayFormat, kpiVf)}</div>
        <p className="text-lg text-muted-foreground">{kpi.label}</p>
        {typeof kpi.comparisonValue === "number" && (
          <p className={`text-sm font-semibold ${Number(kpi.variance) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            vs {kpi.comparisonLabel || "Comparison"} {formatKpiValue(kpi.comparisonValue, displayFormat, kpiVf)} · {formatVariancePct(kpi.variancePct)}
          </p>
        )}
        {kpi.count && <p className="text-sm text-muted-foreground">{kpi.count.toLocaleString()} records</p>}
      </div>
    );
  }

  if ((chartType === "bar" || chartType === "column" || chartType === "horizontal-bar" || chartType === "line" || chartType === "area") && data) {
    const seriesData = normalizeSeriesData(data as Record<string, unknown>);
    const displayData = seriesData.map(d => ({ ...d, shortName: d.name, value: typeof d.value === "number" ? d.value : Number(d.value) }));
    const comparisonLabel = (data as { comparisonLabel?: string }).comparisonLabel || "Comparison";
    const measureLabel = (data as { measureLabel?: string }).measureLabel || "Value";
    const hasComparison = !hideComparison && displayData.some(d => typeof d.comparisonValue === "number");
    const fv = (v: number) => formatKpiValue(v, displayFormat, valueFormat);
    if (chartType === "bar" || chartType === "column" || chartType === "horizontal-bar") return (
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={displayData} margin={{ top: 24, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="shortName" tick={{ fontSize: 11, fill: "currentColor" }} angle={displayData.length > 10 ? -35 : 0} textAnchor={displayData.length > 10 ? "end" : "middle"} interval={0} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fv} width={52} />
            <Tooltip formatter={(v, name, p) => [fv(Number(v)), name === "comparisonValue" ? comparisonLabel : p.payload?.name || ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} labelFormatter={() => ""} />
            {hasComparison && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />}
            <Bar dataKey="value" name={measureLabel} radius={[5, 5, 0, 0]}>
              {displayData.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
              <LabelList dataKey="value" position="top" formatter={fv} style={{ fontSize: 10, fill: "currentColor", fontWeight: 700 }} />
            </Bar>
            {hasComparison && <Bar dataKey="comparisonValue" name={comparisonLabel} fill={c3} radius={[5, 5, 0, 0]}>
              <LabelList dataKey="comparisonValue" position="top" formatter={fv} style={{ fontSize: 10, fill: "currentColor", fontWeight: 700 }} />
            </Bar>}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
    return (
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData} margin={{ top: 24, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="shortName" tick={{ fontSize: 11, fill: "currentColor" }} angle={displayData.length > 10 ? -35 : 0} textAnchor={displayData.length > 10 ? "end" : "middle"} interval={0} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fv} width={52} />
            <Tooltip formatter={(v, name, p) => [fv(Number(v)), name === "comparisonValue" ? comparisonLabel : p.payload?.name || ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} labelFormatter={() => ""} />
            {hasComparison && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />}
            <Area type="monotone" dataKey="value" name={measureLabel} stroke={c0} strokeWidth={2.5} fill={c0 + "20"} dot={displayData.length <= 40 ? { r: 4, fill: c0 } : false}>
              {displayData.length <= 40 && <LabelList dataKey="value" position="top" formatter={fv} style={{ fontSize: displayData.length > 20 ? 9 : 10, fill: "currentColor", fontWeight: 700 }} />}
            </Area>
            {hasComparison && <Area type="monotone" dataKey="comparisonValue" name={comparisonLabel} stroke={c3} strokeWidth={2.5} fill={c3 + "10"} dot={displayData.length <= 40 ? { r: 4, fill: c3 } : false}>
              {displayData.length <= 40 && <LabelList dataKey="comparisonValue" position="bottom" formatter={fv} style={{ fontSize: displayData.length > 20 ? 9 : 10, fill: "currentColor", fontWeight: 700 }} />}
            </Area>}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === "pie" && data) {
    const pieData = (data as { data?: { name: string; value: number }[] }).data || [];
    const slices = pieData.slice(0, 10);
    const total = slices.reduce((s, d) => s + d.value, 0);
    const fv = (v: number) => formatKpiValue(v, displayFormat, valueFormat);
    return (
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        <ResponsiveContainer width="100%" height="80%">
          <RechartPie>
            <Pie data={slices} cx="50%" cy="50%" outerRadius="55%" innerRadius="28%" dataKey="value" paddingAngle={2}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                if (percent < 0.05) return null;
                const r = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + r * Math.cos(-midAngle * Math.PI / 180);
                const y = cy + r * Math.sin(-midAngle * Math.PI / 180);
                return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 12, fontWeight: 700 }}>{`${(percent * 100).toFixed(0)}%`}</text>;
              }} labelLine={false}>
              {slices.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
            </Pie>
            <Tooltip formatter={v => [fv(Number(v)), ""]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          </RechartPie>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center">
          {slices.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: palette[i % palette.length] }} />
              <span className="text-sm text-muted-foreground">{d.name}</span>
              <span className="text-sm font-bold">{fv(d.value)}</span>
              <span className="text-sm text-muted-foreground">{total ? `(${((d.value / total) * 100).toFixed(1)}%)` : ""}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (chartType === "table" && data) {
    const tableData = data as { rows?: Record<string, unknown>[]; columns?: string[] };
    const rows = tableData.rows || [];
    const cols = tableData.columns || [];
    return (
      <div className="flex-1 rounded-xl border bg-card overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/50"><tr>{cols.map(c => <th key={c} className="px-4 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{c}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-border/50 hover:bg-muted/20">{cols.map(c => <td key={c} className="px-4 py-2 whitespace-nowrap">{typeof r[c] === "number" ? formatValue(Number(r[c]), displayFormat) : String(r[c] ?? "")}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  }

  return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Preview unavailable</div>;
}

// ─── Focus overlay ────────────────────────────────────────────────────────────
function FocusOverlay({ item, filteredData, onClose }: { item: InsightFull; filteredData?: unknown; onClose: () => void }) {
  const [hideComparison, setHideComparison] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const narrative = item.insight.narrative || "";
  const palette = getPalette(item.colorOverride);
  const hasComp = insightHasComparison(item.insight);
  const compLabel = ((item.insight.chartConfig as { data?: { comparisonLabel?: string } } | null)?.data?.comparisonLabel) || "Comparison";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="h-1 shrink-0" style={{ background: `linear-gradient(to right, ${palette.slice(0, 5).join(", ")})` }} />
      <div className="flex items-center justify-between px-6 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {palette.slice(0, 4).map((c, i) => <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c }} />)}
          </div>
          <span className="font-bold text-sm">{item.titleOverride || item.insight.title}</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">{item.insight.chartType} · Focus Mode</span>
          {hasComp && (
            <button
              onClick={() => setHideComparison(h => !h)}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${hideComparison ? "text-muted-foreground border-border" : "text-primary border-primary/30 bg-primary/5"}`}
            >
              {hideComparison ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              vs {compLabel}
            </button>
          )}
        </div>
        <button onClick={onClose} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-3 py-1.5 hover:bg-muted/50 transition-colors">
          <X className="h-3.5 w-3.5" /> Back to dashboard
        </button>
      </div>
      <div className="flex-1 overflow-hidden p-6 flex flex-col min-h-0">
        <FullChart insight={item.insight} filteredData={filteredData} color={item.colorOverride || undefined} hideComparison={hideComparison} />
      </div>
      {narrative && (
        <div className="shrink-0 border-t bg-muted/20 px-6 py-3 max-h-28 overflow-auto">
          <p className="text-xs text-muted-foreground leading-relaxed">{narrative}</p>
        </div>
      )}
    </div>
  );
}

// ─── InsightCard (view-only) ──────────────────────────────────────────────────
function InsightCard({ item, filteredData, onFocus }: { item: InsightFull; filteredData?: unknown; onFocus: () => void }) {
  const [hideComparison, setHideComparison] = useState(false);
  const palette = getPalette(item.colorOverride);
  const hasComp = insightHasComparison(item.insight);
  const compLabel = ((item.insight.chartConfig as { data?: { comparisonLabel?: string } } | null)?.data?.comparisonLabel) || "Comparison";
  const narrative = item.insight.narrative || "";

  return (
    <div className="group relative rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
      <div className="h-0.5 shrink-0" style={{ background: `linear-gradient(to right, ${palette.slice(0, 4).join(", ")})` }} />
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-sm font-semibold leading-snug">{item.titleOverride || item.insight.title}</p>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {hasComp && (
              <button
                onClick={() => setHideComparison(h => !h)}
                className={`h-6 flex items-center gap-0.5 px-1.5 rounded transition-colors text-[10px] font-medium ${hideComparison ? "text-muted-foreground/50 hover:bg-muted/60" : "text-primary hover:bg-primary/10"}`}
                title={hideComparison ? `Show vs ${compLabel}` : `Hide vs ${compLabel}`}
              >
                {hideComparison ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            )}
            <button
              onClick={onFocus}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground"
              title="Expand"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <MiniChart insight={item.insight} filteredData={filteredData} color={item.colorOverride || undefined} hideComparison={hideComparison} />
        {narrative && (
          <div className="mt-3 pt-2.5 border-t border-border/50">
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-4">{narrative}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PublicDashboard() {
  const [, params] = useRoute("/public/dashboard/:token");
  const token = params?.token ?? "";

  const { data, isLoading, error, refetch, isRefetching } = useQuery<{ dashboard: Dashboard; items: InsightFull[]; dataset: DatasetInfo | null }>({
    queryKey: ["/api/public/dashboard", token],
    queryFn: () => fetch(`/api/public/dashboard/${token}`).then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); }),
    retry: false,
  });

  // Filter pane state
  const [filterPaneOpen, setFilterPaneOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string[]>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [filterSearch, setFilterSearch] = useState<Record<string, string>>({});
  type DateColFilter = { years: string[]; quarters: string[]; months: string[] };
  const [dateFilters, setDateFilters] = useState<Record<string, DateColFilter>>({});
  const [appliedDateFilters, setAppliedDateFilters] = useState<Record<string, DateColFilter>>({});
  const [expandedDateYears, setExpandedDateYears] = useState<Record<string, Record<string, boolean>>>({});
  const [expandedDateQuarters, setExpandedDateQuarters] = useState<Record<string, Record<string, boolean>>>({});

  // Focus / AI summary state
  const [focusedItem, setFocusedItem] = useState<InsightFull | null>(null);
  const [focusedFilteredData, setFocusedFilteredData] = useState<unknown>(undefined);
  const [narrativeOpen, setNarrativeOpen] = useState(false);

  // Dataset compute
  const rawRows: Record<string, unknown>[] = (data?.dataset?.rawData as Record<string, unknown>[]) ?? [];
  const datasetCols: DatasetColumnLike[] = (data?.dataset?.columns as DatasetColumnLike[]) ?? [];
  const computedRows = applyFormulaColumnsClient(rawRows, datasetCols);
  const dateColNames = new Set(datasetCols.filter(c => c.columnType === "date").map(c => c.columnName));
  const dateColLabels: Record<string, string> = Object.fromEntries(datasetCols.filter(c => c.columnType === "date").map(c => [c.columnName, c.label]));
  const dateHierarchies: Record<string, DateHierarchy> = {};
  for (const col of dateColNames) { dateHierarchies[col] = buildDateHierarchy(computedRows, col); }
  const categoryCols: string[] = computedRows.length
    ? Object.keys(computedRows[0]).filter(col => {
        if (dateColNames.has(col)) return false;
        if (col.startsWith("__formula_")) return false;
        const vals = computedRows.map(r => r[col]);
        const numericCount = vals.filter(v => v !== null && v !== "" && !isNaN(Number(v))).length;
        const unique = new Set(vals.map(v => String(v)));
        return numericCount / vals.length < 0.8 && unique.size >= 2 && unique.size <= 100;
      })
    : [];
  const colValueMap: Record<string, string[]> = {};
  for (const col of categoryCols) {
    colValueMap[col] = [...new Set(computedRows.map(r => String(r[col] ?? "")).filter(Boolean))].sort();
  }

  // Sync pending when pane opens
  useEffect(() => {
    if (filterPaneOpen) {
      setActiveFilters({ ...appliedFilters });
      setDateFilters({ ...appliedDateFilters });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPaneOpen]);

  const applyPendingFilters = () => {
    setAppliedFilters({ ...activeFilters });
    setAppliedDateFilters({ ...dateFilters });
  };
  const hasPendingChanges = JSON.stringify(activeFilters) !== JSON.stringify(appliedFilters) || JSON.stringify(dateFilters) !== JSON.stringify(appliedDateFilters);

  const filteredRows: Record<string, unknown>[] = computedRows.filter(row => {
    if (!Object.entries(appliedFilters).every(([col, vals]) => vals.length === 0 || vals.includes(String(row[col] ?? "")))) return false;
    for (const [col, df] of Object.entries(appliedDateFilters)) {
      const hasFilter = df.years.length > 0 || df.quarters.length > 0 || df.months.length > 0;
      if (!hasFilter) continue;
      const parts = parseDateParts(row[col]);
      if (!parts) continue;
      const passes = df.years.includes(parts.year) || df.quarters.includes(parts.quarter) || df.months.includes(parts.month);
      if (!passes) return false;
    }
    return true;
  });

  const activeDateFilterCount = Object.values(appliedDateFilters).filter(df => df.years.length > 0 || df.quarters.length > 0 || df.months.length > 0).length;
  const isFiltered = Object.values(appliedFilters).some(v => v.length > 0) || activeDateFilterCount > 0;
  const activeFilterCount = Object.values(appliedFilters).filter(v => v.length > 0).length + activeDateFilterCount;

  const toggleFilterValue = (col: string, val: string) => {
    setActiveFilters(prev => { const curr = prev[col] || []; return { ...prev, [col]: curr.includes(val) ? curr.filter(v => v !== val) : [...curr, val] }; });
  };
  const clearColFilter = (col: string) => setActiveFilters(prev => ({ ...prev, [col]: [] }));
  const clearAllFilters = () => { setActiveFilters({}); setDateFilters({}); setAppliedFilters({}); setAppliedDateFilters({}); };
  const toggleSection = (col: string) => setExpandedSections(prev => ({ ...prev, [col]: !prev[col] }));
  const isSectionExpanded = (col: string) => expandedSections[col] === true;

  const toggleDateYear = (col: string, year: string) => setDateFilters(prev => { const df = prev[col] || { years: [], quarters: [], months: [] }; return { ...prev, [col]: { ...df, years: df.years.includes(year) ? df.years.filter(y => y !== year) : [...df.years, year] } }; });
  const toggleDateQuarter = (col: string, qKey: string) => setDateFilters(prev => { const df = prev[col] || { years: [], quarters: [], months: [] }; return { ...prev, [col]: { ...df, quarters: df.quarters.includes(qKey) ? df.quarters.filter(q => q !== qKey) : [...df.quarters, qKey] } }; });
  const toggleDateMonth = (col: string, mKey: string) => setDateFilters(prev => { const df = prev[col] || { years: [], quarters: [], months: [] }; return { ...prev, [col]: { ...df, months: df.months.includes(mKey) ? df.months.filter(m => m !== mKey) : [...df.months, mKey] } }; });
  const clearDateColFilter = (col: string) => setDateFilters(prev => ({ ...prev, [col]: { years: [], quarters: [], months: [] } }));
  const toggleDateYearExpand = (col: string, year: string) => setExpandedDateYears(prev => ({ ...prev, [col]: { ...(prev[col] || {}), [year]: !prev[col]?.[year] } }));
  const toggleDateQuarterExpand = (col: string, qKey: string) => setExpandedDateQuarters(prev => ({ ...prev, [col]: { ...(prev[col] || {}), [qKey]: !prev[col]?.[qKey] } }));

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
  const hasDataset = computedRows.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {focusedItem && (
        <FocusOverlay
          item={focusedItem}
          filteredData={focusedFilteredData}
          onClose={() => { setFocusedItem(null); setFocusedFilteredData(undefined); }}
        />
      )}

      {/* Header */}
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src="/ghc-beacon-logo.jpg" alt="GHC Beacon" className="h-8 w-8 rounded-md object-cover" />
          <span className="font-bold text-lg tracking-tight">GHC Beacon</span>
        </div>
        <Badge variant="secondary" className="gap-1.5">
          <Globe className="h-3 w-3" /> Public Dashboard
        </Badge>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto min-w-0">
          <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">

            {/* Title + toolbar */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{dashboard.title}</h1>
                {dashboard.description && <p className="text-muted-foreground mt-1 text-sm">{dashboard.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => refetch()} disabled={isRefetching} data-testid="button-refresh">
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} /> Refresh
                </Button>
                {hasDataset && (categoryCols.length > 0 || dateColNames.size > 0) && (
                  <Button
                    variant={filterPaneOpen ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5 h-8 relative"
                    onClick={() => setFilterPaneOpen(o => !o)}
                    data-testid="button-filters"
                  >
                    <Filter className="h-3.5 w-3.5" /> Filters
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                )}
                {dashboard.narrativeSummary && (
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 relative" onClick={() => setNarrativeOpen(true)} data-testid="button-ai-summary">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Summary
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                  </Button>
                )}
              </div>
            </div>

            {/* Active filter summary */}
            {isFiltered && (
              <div className="flex flex-wrap items-center gap-2">
                {Object.entries(appliedFilters).filter(([, vals]) => vals.length > 0).map(([col, vals]) =>
                  vals.map(val => (
                    <span key={`${col}-${val}`} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                      <span className="text-muted-foreground">{col}:</span> {val}
                      <button onClick={() => { const u = { ...appliedFilters, [col]: (appliedFilters[col] || []).filter(v => v !== val) }; setAppliedFilters(u); setActiveFilters(u); }} className="hover:text-primary/70 ml-0.5"><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ))
                )}
                {Object.entries(appliedDateFilters).flatMap(([col, df]) => {
                  const label = dateColLabels[col] || col;
                  const pills: JSX.Element[] = [];
                  df.years.forEach(y => pills.push(
                    <span key={`${col}-y-${y}`} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                      <Calendar className="h-2.5 w-2.5" /><span className="text-muted-foreground">{label}:</span> {y}
                      <button onClick={() => { const u = { ...appliedDateFilters, [col]: { ...df, years: df.years.filter(x => x !== y) } }; setAppliedDateFilters(u); setDateFilters(u); }} className="ml-0.5 hover:text-amber-500"><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ));
                  df.quarters.forEach(qk => pills.push(
                    <span key={`${col}-q-${qk}`} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                      <Calendar className="h-2.5 w-2.5" /><span className="text-muted-foreground">{label}:</span> {qk.replace("|", " ")}
                      <button onClick={() => { const u = { ...appliedDateFilters, [col]: { ...df, quarters: df.quarters.filter(x => x !== qk) } }; setAppliedDateFilters(u); setDateFilters(u); }} className="ml-0.5 hover:text-amber-500"><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ));
                  df.months.forEach(mk => pills.push(
                    <span key={`${col}-m-${mk}`} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                      <Calendar className="h-2.5 w-2.5" /><span className="text-muted-foreground">{label}:</span> {mk.replace("|", " ")}
                      <button onClick={() => { const u = { ...appliedDateFilters, [col]: { ...df, months: df.months.filter(x => x !== mk) } }; setAppliedDateFilters(u); setDateFilters(u); }} className="ml-0.5 hover:text-amber-500"><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ));
                  return pills;
                })}
                <span className="text-xs text-muted-foreground">{filteredRows.length} of {computedRows.length} rows</span>
                <button onClick={clearAllFilters} className="text-xs text-muted-foreground underline hover:text-foreground">Clear all</button>
              </div>
            )}

            {/* Insights grid */}
            {sorted.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">No insights added to this dashboard.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sorted.map(item => {
                  const overrideData = (isFiltered && computedRows.length > 0) ? computeFilteredData(filteredRows, item.insight) : undefined;
                  return (
                    <InsightCard
                      key={item.id}
                      item={item}
                      filteredData={overrideData}
                      onFocus={() => { setFocusedItem(item); setFocusedFilteredData(overrideData); }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Filter pane */}
        {filterPaneOpen && hasDataset && (categoryCols.length > 0 || dateColNames.size > 0) && (
          <div className="w-72 border-l bg-background shrink-0 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
              <span className="font-bold text-sm flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-primary" /> Filters
                {activeFilterCount > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{activeFilterCount} active</span>}
              </span>
              <div className="flex items-center gap-1">
                {isFiltered && <button onClick={clearAllFilters} className="text-[11px] text-muted-foreground hover:text-foreground underline mr-1">Clear all</button>}
                <button onClick={() => setFilterPaneOpen(false)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">

              {/* Date hierarchy sections */}
              {[...dateColNames].map(col => {
                const label = dateColLabels[col] || col;
                const hierarchy = dateHierarchies[col] || {};
                const df = dateFilters[col] || { years: [], quarters: [], months: [] };
                const activeDateCount = df.years.length + df.quarters.length + df.months.length;
                const sectionExpanded = isSectionExpanded(`__date__${col}`);
                return (
                  <div key={`date-${col}`} className="rounded-lg border border-amber-200/60 dark:border-amber-800/40 overflow-hidden bg-amber-50/40 dark:bg-amber-950/10">
                    <button className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-amber-100/50 dark:hover:bg-amber-950/30 transition-colors text-left" onClick={() => toggleSection(`__date__${col}`)}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="shrink-0 h-6 w-6 flex items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/60 border border-amber-300/60">
                          <Calendar className="h-3.5 w-3.5 text-amber-600" />
                        </span>
                        <span className="text-xs font-semibold truncate">{label}</span>
                        {activeDateCount > 0 && <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">{activeDateCount}</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {activeDateCount > 0 && <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); clearDateColFilter(col); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); clearDateColFilter(col); }}} className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded hover:bg-muted/40"><X className="h-3 w-3" /></span>}
                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${sectionExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {sectionExpanded && (
                      <div className="bg-background px-2 py-2 space-y-0.5">
                        {Object.keys(hierarchy).sort((a, b) => Number(b) - Number(a)).map(year => {
                          const yearExpanded = expandedDateYears[col]?.[year] === true;
                          const yearActive = df.years.includes(year);
                          const yearRowCount = Object.values(hierarchy[year]).flatMap(q => Object.values(q)).reduce((s, n) => s + n, 0);
                          return (
                            <div key={year}>
                              <div className="flex items-center gap-1 rounded hover:bg-muted/30 -mx-1 px-1 py-1">
                                <button onClick={() => toggleDateYearExpand(col, year)} className="text-muted-foreground hover:text-foreground">
                                  {yearExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </button>
                                <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                  <Checkbox checked={yearActive} onCheckedChange={() => toggleDateYear(col, year)} className="h-3.5 w-3.5 shrink-0" />
                                  <span className={`text-xs font-bold ${yearActive ? "text-foreground" : "text-muted-foreground"}`}>{year}</span>
                                  <span className="text-[10px] text-muted-foreground ml-auto">{yearRowCount}</span>
                                </label>
                              </div>
                              {yearExpanded && (
                                <div className="ml-5 space-y-0.5 border-l border-border pl-2 pb-1">
                                  {["Q1","Q2","Q3","Q4"].filter(q => hierarchy[year][q]).map(q => {
                                    const qKey = `${year}|${q}`;
                                    const qActive = df.quarters.includes(qKey);
                                    const qExpanded = expandedDateQuarters[col]?.[qKey] === true;
                                    const qRowCount = Object.values(hierarchy[year][q]).reduce((s, n) => s + n, 0);
                                    const qMonths = hierarchy[year][q];
                                    return (
                                      <div key={q}>
                                        <div className="flex items-center gap-1 rounded hover:bg-muted/30 -mx-1 px-1 py-0.5">
                                          <button onClick={() => toggleDateQuarterExpand(col, qKey)} className="text-muted-foreground hover:text-foreground">
                                            {qExpanded ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                                          </button>
                                          <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                            <Checkbox checked={qActive} onCheckedChange={() => toggleDateQuarter(col, qKey)} className="h-3 w-3 shrink-0" />
                                            <span className={`text-[11px] font-semibold ${qActive ? "text-amber-700" : "text-muted-foreground"}`}>{q}</span>
                                            <span className="text-[10px] text-muted-foreground ml-auto">{qRowCount}</span>
                                          </label>
                                        </div>
                                        {qExpanded && (
                                          <div className="ml-4 space-y-0.5 border-l border-border pl-2">
                                            {Object.keys(qMonths).sort((a, b) => (MONTH_ORDER[a] || 0) - (MONTH_ORDER[b] || 0)).map(mon => {
                                              const mKey = `${year}|${mon}`;
                                              const mActive = df.months.includes(mKey);
                                              return (
                                                <label key={mon} className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-muted/30 rounded -mx-1 px-1">
                                                  <Checkbox checked={mActive} onCheckedChange={() => toggleDateMonth(col, mKey)} className="h-3 w-3 shrink-0" />
                                                  <span className={`text-[11px] ${mActive ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{mon}</span>
                                                  <span className="text-[10px] text-muted-foreground ml-auto">{qMonths[mon]}</span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {Object.keys(hierarchy).length === 0 && <p className="text-[11px] text-muted-foreground py-1 px-1">No valid dates found</p>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Categorical filter sections */}
              {categoryCols.map(col => {
                const selected = activeFilters[col] || [];
                const expanded = isSectionExpanded(col);
                const search = filterSearch[col] || "";
                const allVals = colValueMap[col] || [];
                const visibleVals = search ? allVals.filter(v => v.toLowerCase().includes(search.toLowerCase())) : allVals;
                return (
                  <div key={col} className="rounded-lg border border-border/70 overflow-hidden bg-background">
                    <button className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors text-left" onClick={() => toggleSection(col)}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate">{col}</span>
                        {selected.length > 0 && <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{selected.length}</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {selected.length > 0 && <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); clearColFilter(col); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); clearColFilter(col); }}} className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded hover:bg-muted/40"><X className="h-3 w-3" /></span>}
                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {expanded && (
                      <div className="bg-background">
                        {allVals.length > 6 && (
                          <div className="px-3 pt-2 pb-1">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                              <input className="w-full pl-6 pr-2 py-1 text-xs border rounded bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary/30" placeholder="Search…" value={search} onChange={e => setFilterSearch(prev => ({ ...prev, [col]: e.target.value }))} />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-muted/30">
                          <button className="text-[11px] text-primary hover:underline" onClick={() => setActiveFilters(prev => ({ ...prev, [col]: [...allVals] }))}>Select all</button>
                          <span className="text-muted-foreground text-[10px]">·</span>
                          <button className="text-[11px] text-muted-foreground hover:text-foreground hover:underline" onClick={() => clearColFilter(col)}>Clear</button>
                        </div>
                        <div className="max-h-48 overflow-y-auto px-3 py-1.5 space-y-1">
                          {visibleVals.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground py-1">No matches</p>
                          ) : visibleVals.map(val => {
                            const checked = selected.includes(val);
                            const rowCount = computedRows.filter(r => String(r[col] ?? "") === val).length;
                            return (
                              <label key={val} className="flex items-center gap-2.5 py-1 cursor-pointer group rounded hover:bg-muted/30 -mx-1 px-1">
                                <Checkbox checked={checked} onCheckedChange={() => toggleFilterValue(col, val)} className="h-3.5 w-3.5 shrink-0" />
                                <span className={`text-xs truncate flex-1 ${checked ? "font-semibold text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{val}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0">{rowCount}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-3 py-3 border-t shrink-0 space-y-2">
              <Button size="sm" className="w-full h-9 font-semibold gap-1.5" onClick={applyPendingFilters} disabled={!hasPendingChanges} data-testid="button-apply-filters">
                Apply Filters
                {hasPendingChanges && <span className="text-[10px] opacity-80 font-normal">({Object.values(activeFilters).filter(v => v.length > 0).length + Object.values(dateFilters).filter(d => d.years.length + d.quarters.length + d.months.length > 0).length} selected)</span>}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                {isFiltered ? <><span className="font-semibold text-foreground">{filteredRows.length}</span> of {computedRows.length} rows (applied)</> : <>{computedRows.length} rows total</>}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI Summary Sheet */}
      <Sheet open={narrativeOpen} onOpenChange={setNarrativeOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 py-4 border-b">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" /> AI Executive Summary
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{dashboard.narrativeSummary}</p>
          </div>
        </SheetContent>
      </Sheet>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground shrink-0">
        Powered by <span className="font-semibold text-foreground">GHC Beacon</span>
      </footer>
    </div>
  );
}
