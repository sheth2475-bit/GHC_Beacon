import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Loader2, LayoutDashboard, Plus, Trash2, Sparkles,
  Globe, Lock, Building2, Edit2, CheckCircle2, Pin,
  X, ArrowUp, ArrowDown,
  AlertTriangle, Lightbulb, ChevronRight, ChevronDown, ChevronUp,
  RefreshCw, SlidersHorizontal, Filter, Search, Calendar, Database,
  Maximize2, Eye, EyeOff,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  LabelList, Legend,
} from "recharts";
import type { AnalyticsDashboardDefinition, AnalyticsDashboardItem, AnalyticsInsight } from "@shared/schema";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DashboardFull = AnalyticsDashboardDefinition & {
  items: (AnalyticsDashboardItem & { insight: AnalyticsInsight })[];
};

type InsightFull = AnalyticsDashboardItem & { insight: AnalyticsInsight };

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"];

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

type NumberDisplayFormat = "compact" | "full";
type ValueFormat = "number" | "percent" | "minutes" | "hours" | "count";

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

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Parse a date value into UTC-based parts (avoids timezone shift bugs)
function parseUtcDate(val: unknown): Date | null {
  const str = String(val ?? "").trim();
  if (!str) return null;

  // Try native parsing first (handles ISO "2024-04-01", "2024-04", etc.)
  let d = new Date(str);

  // "Apr 2024" / "April 2024"
  if (isNaN(d.getTime())) {
    const m = str.match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (m) d = new Date(`${m[1]} 1, ${m[2]}`);
  }

  // "YYYY-MM"
  if (isNaN(d.getTime())) {
    const m = str.match(/^(\d{4})-(\d{2})$/);
    if (m) d = new Date(`${m[1]}-${m[2]}-01`);
  }

  // "MM/YYYY" or "M/YYYY"
  if (isNaN(d.getTime())) {
    const m = str.match(/^(\d{1,2})\/(\d{4})$/);
    if (m) d = new Date(`${m[2]}-${m[1].padStart(2,"0")}-01`);
  }

  if (isNaN(d.getTime())) return null;

  // For ISO-style dates (YYYY-MM-DD), use UTC to avoid timezone shift
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return new Date(str + (str.length === 10 ? "T00:00:00Z" : ""));
  }
  return d;
}

function utcMonthLabel(d: Date): string {
  // Use UTC year/month to avoid timezone-shifting dates by one month
  const iso = d.toISOString(); // always UTC
  const [yearStr, monStr] = iso.split("-");
  return `${MONTH_NAMES[Number(monStr) - 1]} ${yearStr}`;
}

// Client-side re-implementation of server aggregateData — used for live filtering
function clientAggregateData(
  rows: Record<string, unknown>[],
  measure: string,
  dimension: string | null,
  aggregation: string = "sum"
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
    if (parsed) {
      key = utcMonthLabel(parsed);
    } else {
      key = String(rawKey ?? "Unknown").trim() || "Unknown";
    }
    if (!groups[key]) groups[key] = [];
    const val = Number(row[measure]);
    if (!isNaN(val)) groups[key].push(val);
  }
  const result = Object.entries(groups).map(([name, vals]) => {
    const value = aggregation === "avg" ? vals.reduce((a, b) => a + b, 0) / (vals.length || 1) : aggregation === "count" ? vals.length : aggregation === "min" ? Math.min(...vals) : aggregation === "max" ? Math.max(...vals) : vals.reduce((a, b) => a + b, 0);
    return { name, value: Math.round(value * 100) / 100 };
  });
  const isDimDate = /month|date|year|period|quarter|week/i.test(dimension);
  if (isDimDate) {
    result.sort((a, b) => {
      const da = new Date(a.name), db = new Date(b.name);
      return !isNaN(da.getTime()) && !isNaN(db.getTime()) ? da.getTime() - db.getTime() : 0;
    });
  } else {
    result.sort((a, b) => b.value - a.value);
  }
  return result;
}

// Mirrors server-side applyFormulaColumns — evaluates formula expressions on the client
// Also stores results by label ("Net Sales") so measure lookups in computeFilteredData work
type DatasetColumnLike = { columnName: string; label: string; isFormula?: boolean | null; formulaExpression?: string | null };
function applyFormulaColumnsClient(
  rows: Record<string, unknown>[],
  columns: DatasetColumnLike[]
): Record<string, unknown>[] {
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
        out[col.columnName] = computed; // store by internal name
        out[col.label] = computed;     // also store by label so insight measure lookups work
      } catch {
        out[col.columnName] = 0;
        out[col.label] = 0;
      }
    }
    return out;
  });
}

function computeFilteredData(rows: Record<string, unknown>[], insight: AnalyticsInsight): unknown {
  const cfg = insight.chartConfig as { measure?: string; dimension?: string | null; aggregation?: string; measureLabel?: string; dimensionLabel?: string; comparisonMeasure?: string | null; comparisonLabel?: string | null; comparisonType?: string | null } | null;
  if (!cfg?.measure) return null;
  const measure = cfg.measure;
  const dimension = cfg.dimension || null;
  const agg = cfg.aggregation || "sum";
  if (insight.chartType === "kpi") {
    const vals = rows.map(r => Number(r[measure])).filter(v => !isNaN(v));
    const value = agg === "avg" ? vals.reduce((a, b) => a + b, 0) / (vals.length || 1) : agg === "count" ? vals.length : agg === "min" ? Math.min(...vals) : agg === "max" ? Math.max(...vals) : vals.reduce((a, b) => a + b, 0);
    const data: Record<string, unknown> = { value: Math.round(value * 100) / 100, label: cfg.measureLabel || measure, count: vals.length };
    if (cfg.comparisonMeasure) {
      const comparisonVals = rows.map(r => Number(r[cfg.comparisonMeasure!])).filter(v => !isNaN(v));
      const comparisonValue = agg === "avg" ? comparisonVals.reduce((a, b) => a + b, 0) / (comparisonVals.length || 1) : agg === "count" ? comparisonVals.length : agg === "min" ? Math.min(...comparisonVals) : agg === "max" ? Math.max(...comparisonVals) : comparisonVals.reduce((a, b) => a + b, 0);
      data.comparisonValue = Math.round(comparisonValue * 100) / 100;
      data.comparisonLabel = cfg.comparisonLabel || "Comparison";
      data.variance = Math.round((Number(data.value) - Number(data.comparisonValue)) * 100) / 100;
      data.variancePct = Number(data.comparisonValue) ? Math.round(((Number(data.value) - Number(data.comparisonValue)) / Math.abs(Number(data.comparisonValue))) * 1000) / 10 : null;
    }
    return data;
  }
  const aggData = clientAggregateData(rows, measure, dimension, agg);
  if (cfg.comparisonMeasure) {
    const comparisonRows = clientAggregateData(rows, cfg.comparisonMeasure, dimension, agg);
    const comparisonMap = new Map(comparisonRows.map(r => [r.name, r.value]));
    return {
      data: aggData.map(r => {
        const comparisonValue = comparisonMap.get(r.name);
        return {
          ...r,
          comparisonValue,
          variance: typeof comparisonValue === "number" ? Math.round((r.value - comparisonValue) * 100) / 100 : undefined,
          variancePct: typeof comparisonValue === "number" && comparisonValue ? Math.round(((r.value - comparisonValue) / Math.abs(comparisonValue)) * 1000) / 10 : null,
        };
      }),
      xKey: "name",
      yKey: "value",
      measureLabel: cfg.measureLabel,
      dimensionLabel: cfg.dimensionLabel,
      comparisonLabel: cfg.comparisonLabel || "Comparison",
      comparisonType: cfg.comparisonType,
    };
  }
  return { data: aggData, xKey: "name", yKey: "value", measureLabel: cfg.measureLabel, dimensionLabel: cfg.dimensionLabel };
}

// ── Date Hierarchy Helpers ──────────────────────────────────────────────────
const QUARTERS: Record<string, string> = { Jan: "Q1", Feb: "Q1", Mar: "Q1", Apr: "Q2", May: "Q2", Jun: "Q2", Jul: "Q3", Aug: "Q3", Sep: "Q3", Oct: "Q4", Nov: "Q4", Dec: "Q4" };
const MONTH_ORDER: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

function parseDateParts(val: unknown): { year: string; quarter: string; month: string } | null {
  const d = parseUtcDate(val);
  if (!d) return null;
  // Always use UTC to avoid timezone-shifted month/year
  const iso = d.toISOString();
  const yearNum = Number(iso.slice(0, 4));
  const monIdx = Number(iso.slice(5, 7)) - 1; // 0-indexed
  const year = String(yearNum);
  const month = MONTH_NAMES[monIdx];
  const q = `Q${Math.ceil((monIdx + 1) / 3)}`;
  return { year, quarter: `${year}|${q}`, month: `${year}|${month}` };
}

type DateHierarchy = Record<string, Record<string, Record<string, number>>>; // year → quarter → month → count
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

// Shorten axis labels: "Jan 2023" → "Jan '23", long strings get truncated
function shortLabel(name: string, maxLen = 8): string {
  const m = name.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m) return `${m[1]} '${m[2].slice(2)}`;
  return name.length > maxLen ? name.slice(0, maxLen - 1) + "…" : name;
}

// ── Smart narrative generator — context-aware insights for CEO / manager ────
/**
 * Normalises chart data into [{name, value}] regardless of whether the backend
 * stored it as the standard `data.data` array or the AI-query `data.rows + data.columns` format.
 */
function normalizeSeriesData(d: Record<string, unknown>): { name: string; value: number; comparisonValue?: number }[] {
  if (Array.isArray((d as { data?: unknown }).data)) {
    return (d as { data: { name: string; value: number; comparisonValue?: number }[] }).data;
  }
  const rows = (d as { rows?: Record<string, unknown>[] }).rows;
  const cols = (d as { columns?: string[] }).columns;
  if (Array.isArray(rows) && Array.isArray(cols) && cols.length >= 2) {
    return rows.map(r => ({
      name: String(r[cols[0]] ?? ""),
      value: Number(r[cols[1]] ?? 0),
    }));
  }
  return [];
}

/** Returns true when an insight's stored data includes a comparison series (e.g. prev year). */
function insightHasComparison(insight: AnalyticsInsight): boolean {
  const data = (insight.chartConfig as { data?: Record<string, unknown> } | null)?.data;
  if (!data) return false;
  return !!(data as { comparisonLabel?: string }).comparisonLabel;
}

function generateSmartNarrative(insight: AnalyticsInsight, filteredData?: unknown): string | null {
  const cfg = insight.chartConfig as {
    data?: unknown;
    measure?: string;
    measureLabel?: string;
    dimension?: string | null;
    dimensionLabel?: string;
    aggregation?: string;
  } | null;
  if (!cfg) return null;

  const chartType = insight.chartType;
  const measureLabel = cfg.measureLabel || cfg.measure || "Value";
  const dimLabel = cfg.dimensionLabel || cfg.dimension || "";

  // Prefer live filtered data over stored snapshot
  const activeData = filteredData != null
    ? (filteredData as Record<string, unknown>)
    : (cfg.data as Record<string, unknown> | null);
  if (!activeData) return null;

  // ── KPI Card ─────────────────────────────────────────────────────────────
  if (chartType === "kpi") {
    const kpi = activeData as { value?: number; count?: number };
    if (kpi.value == null) return null;
    const val = kpi.value;
    const count = kpi.count;
    const formatted = formatValue(val);
    const agg = cfg.aggregation || "sum";
    const recordCtx = count ? ` (${count.toLocaleString()} records)` : "";
    if (agg === "avg") {
      return `Average ${measureLabel} is ${formatted}${recordCtx}. Values well above or below this mean warrant investigation — they may signal seasonal spikes, underperformers, or data anomalies.`;
    }
    if (agg === "count") {
      return `${formatted} total ${measureLabel}${recordCtx}. Monitor this volume over time — a declining count can signal reduced activity, while a surge may require operational scaling.`;
    }
    // sum / default
    return `Total ${measureLabel}: ${formatted}${recordCtx}. This is the cumulative figure for the selected scope. Compare month-over-month or filter by segment to identify growth drivers or gaps.`;
  }

  // ── Bar / Line / Area (time series or categorical) ───────────────────────
  if (chartType === "bar" || chartType === "column" || chartType === "horizontal-bar" || chartType === "line" || chartType === "area") {
    const seriesData = normalizeSeriesData(activeData as Record<string, unknown>);
    if (!seriesData || seriesData.length === 0) return null;

    const values = seriesData.map(d => d.value).filter(v => isFinite(v));
    if (!values.length) return null;
    const total = values.reduce((a, b) => a + b, 0);
    const avg = total / values.length;
    const maxItem = seriesData.reduce((a, b) => (b.value > a.value ? b : a));
    const minItem = seriesData.reduce((a, b) => (b.value < a.value ? b : a));
    const isTimeSeries = /month|date|year|period|quarter|week/i.test(dimLabel) ||
      /^[A-Za-z]{3}\s+'\d{2}/.test(seriesData[0]?.name || "") ||
      /^\d{4}$/.test(seriesData[0]?.name || "") ||
      /^Q[1-4]/.test(seriesData[0]?.name || "");

    if (isTimeSeries && seriesData.length >= 3) {
      const recentN = Math.max(1, Math.floor(seriesData.length / 5));
      const recentSlice = seriesData.slice(-recentN);
      const recentAvg = recentSlice.reduce((a, b) => a + b.value, 0) / recentSlice.length;
      const trendPct = avg > 0 ? Math.round(((recentAvg - avg) / avg) * 100) : 0;
      const trendWord = trendPct > 5 ? "trending up" : trendPct < -5 ? "trending down" : "holding steady";
      const swing = minItem.value > 0 ? Math.round(((maxItem.value - minItem.value) / minItem.value) * 100) : 0;

      return `Average ${measureLabel} per period: ${formatValue(Math.round(avg))}. Peak was ${maxItem.name} (${formatValue(maxItem.value)}); trough was ${minItem.name} (${formatValue(minItem.value)}) — a ${swing}% swing. Recent performance is ${trendWord} (${trendPct > 0 ? "+" : ""}${trendPct}% vs overall avg). ${trendPct > 10 ? "Positive momentum — consider accelerating investment." : trendPct < -10 ? "Declining trend — investigate root cause before next review." : "Performance is consistent — look for opportunities to break the ceiling."}`;
    }

    // Categorical bar narrative
    const sorted = [...seriesData].sort((a, b) => b.value - a.value);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const topN = sorted.slice(0, Math.min(3, sorted.length));
    const topNShare = total > 0 ? Math.round(topN.reduce((a, b) => a + b.value, 0) / total * 100) : 0;
    const gapPct = bottom.value > 0 ? Math.round(((top.value - bottom.value) / bottom.value) * 100) : 0;

    return `${top.name} leads with ${formatValue(top.value)}, ${Math.round(((top.value / avg) - 1) * 100)}% above average. ${bottom.name} trails at ${formatValue(bottom.value)} — a ${gapPct}% gap from the top. Top ${topN.length} (${topN.map(d => d.name).join(", ")}) account for ${topNShare}% of total ${measureLabel}. ${gapPct > 100 ? "Large gap between top and bottom — focus on closing underperformers or doubling down on leaders." : "Performance is relatively balanced across segments."}`;
  }

  // ── Pie chart ────────────────────────────────────────────────────────────
  if (chartType === "pie") {
    const seriesData = normalizeSeriesData(activeData as Record<string, unknown>);
    if (!seriesData || seriesData.length === 0) return null;

    const total = seriesData.reduce((a, b) => a + b.value, 0);
    if (!total) return null;
    const sorted = [...seriesData].sort((a, b) => b.value - a.value);
    const top = sorted[0];
    const second = sorted[1];
    const topPct = Math.round((top.value / total) * 100);
    const top2Pct = second ? Math.round(((top.value + second.value) / total) * 100) : topPct;
    const concentration = topPct > 50 ? "highly concentrated" : topPct > 35 ? "moderately concentrated" : "evenly distributed";

    return `${top.name} is the largest segment at ${topPct}% of total ${measureLabel} (${formatValue(top.value)}).${second ? ` Combined with ${second.name}, the top 2 account for ${top2Pct}%.` : ""} Distribution is ${concentration} across ${sorted.length} segments. ${topPct > 50 ? "Heavy reliance on a single segment — diversification may reduce risk." : "Healthy spread — no single segment is a critical dependency."}`;
  }

  return null;
}

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
        <div className="text-4xl font-black tracking-tight">{formatKpiValue(kpi.value, displayFormat, kpiVf)}</div>
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
          <XAxis
            dataKey="shortName"
            tick={{ fontSize: tickSize, fill: "currentColor" }}
            angle={labelAngle}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fontSize: 8 }} tickFormatter={fv} width={44} />
          <Tooltip
            formatter={(v, name, props) => [fv(Number(v)), name === "comparisonValue" ? comparisonLabel : props.payload?.name || ""]}
            contentStyle={{ fontSize: 11, borderRadius: 6 }}
            labelFormatter={() => ""}
          />
          {hasComparison && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "10px" }} />}
          <Bar dataKey="value" name={measureLabel} radius={[3, 3, 0, 0]}>
            {displayData.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
            <LabelList
              dataKey="value"
              position="top"
              formatter={fv}
              style={{ fontSize: hasTons ? 7 : 8, fill: "currentColor", fontWeight: 600 }}
            />
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
          <XAxis
            dataKey="shortName"
            tick={{ fontSize: tickSize, fill: "currentColor" }}
            angle={labelAngle}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fontSize: 8 }} tickFormatter={fv} width={44} />
          <Tooltip
            formatter={(v, name, props) => [fv(Number(v)), name === "comparisonValue" ? comparisonLabel : props.payload?.name || ""]}
            contentStyle={{ fontSize: 11, borderRadius: 6 }}
            labelFormatter={() => ""}
          />
          {hasComparison && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "10px" }} />}
          <Area type="monotone" dataKey="value" name={measureLabel} stroke={c0} strokeWidth={2} fill={c0 + "20"} dot={count <= 40 ? { r: 2.5, fill: c0 } : false}>
            {count <= 40 && (
              <LabelList
                dataKey="value"
                position="top"
                formatter={fv}
                style={{ fontSize: hasTons ? 7 : 8, fill: "currentColor", fontWeight: 600 }}
              />
            )}
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
              {slices.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => [fv(Number(v)), ""]} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
          </RechartPie>
        </ResponsiveContainer>
        {/* Compact legend */}
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

/* ── Full-size chart for focus mode ── */
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

/* ── Focus mode overlay ── */
function FocusInsightOverlay({ item, filteredData, onClose }: { item: InsightFull; filteredData?: unknown; onClose: () => void }) {
  const [hideComparison, setHideComparison] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const smartNarrative = generateSmartNarrative(item.insight, filteredData);
  const narrativeText = smartNarrative || item.insight.narrative;
  const themePalette = getPalette(item.colorOverride);
  const hasComparisonData = insightHasComparison(item.insight);
  const comparisonLabel = ((item.insight.chartConfig as { data?: { comparisonLabel?: string } } | null)?.data?.comparisonLabel) || "Comparison";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background" data-testid="focus-mode-overlay">
      <div className="h-1 shrink-0" style={{ background: `linear-gradient(to right, ${themePalette.slice(0, 5).join(", ")})` }} />
      <div className="flex items-center justify-between px-6 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {themePalette.slice(0, 4).map((c, i) => <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c }} />)}
          </div>
          <span className="font-bold text-sm">{item.titleOverride || item.insight.title}</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">{item.insight.chartType} · Focus Mode</span>
          {hasComparisonData && (
            <button
              onClick={() => setHideComparison(h => !h)}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${hideComparison ? "text-muted-foreground border-border" : "text-primary border-primary/30 bg-primary/5"}`}
              title={hideComparison ? "Show comparison period" : "Hide comparison period"}
              data-testid="button-toggle-comparison-focus"
            >
              {hideComparison ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              vs {comparisonLabel}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-3 py-1.5 hover:bg-muted/50 transition-colors"
          data-testid="button-exit-focus"
        >
          <X className="h-3.5 w-3.5" />
          Back to dashboard
        </button>
      </div>
      <div className="flex-1 overflow-hidden p-6 flex flex-col min-h-0">
        <FullChart insight={item.insight} filteredData={filteredData} color={item.colorOverride || undefined} hideComparison={hideComparison} />
      </div>
      {narrativeText && (
        <div className="shrink-0 border-t bg-muted/20 px-6 py-3 max-h-28 overflow-auto">
          <p className="text-xs text-muted-foreground leading-relaxed">{narrativeText}</p>
        </div>
      )}
    </div>
  );
}

function InsightCard({ item, idx, total, onRemove, onMoveUp, onMoveDown, filteredData, onFocus, dashboardId, onColorChange }: {
  item: InsightFull; idx: number; total: number; dashboardId: number;
  onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void;
  filteredData?: unknown; onFocus: () => void;
  onColorChange: (color: string | null) => void;
}) {
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [hideComparison, setHideComparison] = useState(false);
  const chartLabel: Record<string, string> = { kpi: "KPI Card", bar: "Bar", line: "Line", pie: "Pie", table: "Table", area: "Area", donut: "Donut", column: "Column" };
  const currentTheme = item.colorOverride || DEFAULT_THEME;
  const currentPalette = getPalette(currentTheme);
  const hasComparisonData = insightHasComparison(item.insight);
  const comparisonLabel = ((item.insight.chartConfig as { data?: { comparisonLabel?: string } } | null)?.data?.comparisonLabel) || "Comparison";

  return (
    <div className="group rounded-xl border bg-card overflow-hidden hover:shadow-md transition-all" data-testid={`item-insight-${item.id}`}>
      {/* Rainbow stripe using theme palette */}
      <div className="h-[3px]" style={{ background: `linear-gradient(to right, ${currentPalette.slice(0, 5).join(", ")})` }} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h4 className="font-bold text-sm leading-snug line-clamp-2">{item.titleOverride || item.insight.title}</h4>
            <span className="text-[10px] text-muted-foreground">{chartLabel[item.insight.chartType] || item.insight.chartType}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
            {/* Theme picker */}
            <div className="relative">
              <button
                onClick={() => setThemePickerOpen(o => !o)}
                className="h-5 flex items-center gap-0.5 px-1 rounded hover:bg-muted/60"
                title="Change color theme"
                data-testid={`button-color-widget-${item.id}`}
              >
                {currentPalette.slice(0, 3).map((c, i) => (
                  <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c }} />
                ))}
              </button>
              {themePickerOpen && (
                <div className="absolute right-0 top-6 z-50 bg-card border rounded-xl shadow-lg p-2.5 w-48" data-testid={`color-picker-${item.id}`}>
                  <p className="text-[9px] font-semibold text-muted-foreground mb-2 px-0.5 uppercase tracking-wide">Color theme</p>
                  <div className="flex flex-col gap-1">
                    {Object.entries(THEMES).map(([key, theme]) => {
                      const isActive = currentTheme === key;
                      return (
                        <button
                          key={key}
                          onClick={() => { onColorChange(key); setThemePickerOpen(false); }}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/60 transition-colors text-left w-full ${isActive ? "bg-muted/80 ring-1 ring-border" : ""}`}
                          data-testid={`color-theme-${key}-${item.id}`}
                        >
                          <div className="flex gap-0.5 shrink-0">
                            {theme.colors.slice(0, 5).map((c, i) => (
                              <span key={i} className="h-3 w-3 rounded-full" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                          <span className="text-[10px] font-medium">{theme.name}</span>
                          {isActive && <span className="ml-auto text-[8px] text-primary font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                  {item.colorOverride && (
                    <button
                      onClick={() => { onColorChange(null); setThemePickerOpen(false); }}
                      className="mt-1.5 w-full text-[9px] text-muted-foreground hover:text-foreground text-center py-1 rounded hover:bg-muted/50"
                    >
                      Reset to Classic
                    </button>
                  )}
                </div>
              )}
            </div>
            {hasComparisonData && (
              <button
                onClick={() => setHideComparison(h => !h)}
                className={`h-5 flex items-center gap-0.5 px-1.5 rounded transition-colors ${hideComparison ? "text-muted-foreground/50 hover:bg-muted/60" : "text-primary hover:bg-primary/10"}`}
                title={hideComparison ? `Show vs ${comparisonLabel}` : `Hide vs ${comparisonLabel}`}
                data-testid={`button-toggle-comparison-${item.id}`}
              >
                {hideComparison ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            )}
            <button onClick={onFocus} className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted/60" title="Focus mode" data-testid={`button-focus-widget-${item.id}`}>
              <Maximize2 className="h-3 w-3 text-muted-foreground" />
            </button>
            {idx > 0 && <button onClick={onMoveUp} className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted/60"><ArrowUp className="h-3 w-3" /></button>}
            {idx < total - 1 && <button onClick={onMoveDown} className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted/60"><ArrowDown className="h-3 w-3" /></button>}
            <button onClick={onRemove} className="h-5 w-5 flex items-center justify-center rounded hover:bg-red-500/10 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
          </div>
        </div>
        <MiniChart insight={item.insight} filteredData={filteredData} color={currentTheme} hideComparison={hideComparison} />
        {(() => {
          const smartNarrative = generateSmartNarrative(item.insight, filteredData);
          const text = smartNarrative || item.insight.narrative;
          if (!text) return null;
          return (
            <div className="mt-3 pt-2.5 border-t border-border/50">
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-4">{text}</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default function AnalyticsDashboardComposePage() {
  const [, params] = useRoute("/analytics/dashboards/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const id = params?.id;
  const isNew = id === "new";

  const [editingTitle, setEditingTitle] = useState(isNew);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [publishDialog, setPublishDialog] = useState(false);
  const [publishVisibility, setPublishVisibility] = useState("company");
  const [shareDialog, setShareDialog] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [addInsightDialog, setAddInsightDialog] = useState(false);
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [deleteInsightId, setDeleteInsightId] = useState<number | null>(null);
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [narrativeOpen, setNarrativeOpen] = useState(false);
  const [filterPaneOpen, setFilterPaneOpen] = useState(false);
  const [focusedItem, setFocusedItem] = useState<InsightFull | null>(null);
  const [focusedItemFilteredData, setFocusedItemFilteredData] = useState<unknown>(undefined);
  // Pending = what user is editing in the pane (not yet applied to charts)
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  // Applied = what actually drives chart computation (updated only on Apply)
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string[]>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [filterSearch, setFilterSearch] = useState<Record<string, string>>({});
  // Date hierarchy filter state: col → { years, quarters ("2023|Q1"), months ("2023|Jan") }
  type DateColFilter = { years: string[]; quarters: string[]; months: string[] };
  const [dateFilters, setDateFilters] = useState<Record<string, DateColFilter>>({});     // pending
  const [appliedDateFilters, setAppliedDateFilters] = useState<Record<string, DateColFilter>>({}); // applied
  const [expandedDateYears, setExpandedDateYears] = useState<Record<string, Record<string, boolean>>>({});
  const [expandedDateQuarters, setExpandedDateQuarters] = useState<Record<string, Record<string, boolean>>>({});

  const { data: dash, isLoading } = useQuery<DashboardFull>({
    queryKey: ["/api/v2/analytics/definitions", id],
    queryFn: () => fetch(`/api/v2/analytics/definitions/${id}`, { credentials: "include" }).then(r => r.json()),
    enabled: !isNew && !!id,
  });

  const { data: allInsights = [] } = useQuery<AnalyticsInsight[]>({
    queryKey: ["/api/v2/analytics/insights"],
  });

  // Get primary dataset id from the first insight that has one
  const primaryDatasetId = dash?.items?.[0]?.insight?.datasetId ?? null;

  const { data: primaryDataset } = useQuery<{ id: number; name: string; rawData: Record<string, unknown>[]; columns: { columnName: string; label: string; columnType: string }[] }>({
    queryKey: ["/api/v2/analytics/datasets", primaryDatasetId],
    queryFn: () => fetch(`/api/v2/analytics/datasets/${primaryDatasetId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!primaryDatasetId && !isNew,
  });

  const refreshMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/v2/analytics/definitions/${id}/refresh`).then(r => r.json()),
    onSuccess: (data: { refreshed: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions", id] });
      toast({ title: `Charts refreshed! (${data.refreshed} insight${data.refreshed !== 1 ? "s" : ""} updated)` });
    },
    onError: () => toast({ title: "Refresh failed", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/v2/analytics/definitions", { title, description }).then(r => r.json()),
    onSuccess: (data: AnalyticsDashboardDefinition) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions"] });
      navigate(`/analytics/dashboards/${data.id}`);
      toast({ title: "Dashboard created!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest("PATCH", `/api/v2/analytics/definitions/${id}`, body).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions"] });
      setEditingTitle(false);
      toast({ title: "Saved!" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/v2/analytics/definitions/${id}/publish`, { visibility: publishVisibility }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions"] });
      setPublishDialog(false);
      toast({ title: "Dashboard published!", description: "Now visible to your team." });
    },
  });

  // Sync share state from loaded dashboard
  useEffect(() => {
    if (dash) {
      setShareEnabled(!!(dash as any).shareEnabled);
      setShareToken((dash as any).shareToken ?? null);
    }
  }, [dash]);

  const shareMutation = useMutation({
    mutationFn: (enabled: boolean) => apiRequest("POST", `/api/v2/analytics/definitions/${id}/share`, { enabled }).then(r => r.json()),
    onSuccess: (data: { shareToken: string; shareEnabled: boolean }) => {
      setShareEnabled(data.shareEnabled);
      setShareToken(data.shareToken);
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions", id] });
      toast({ title: data.shareEnabled ? "Public link enabled!" : "Public link disabled" });
    },
    onError: () => toast({ title: "Failed to update share link", variant: "destructive" }),
  });

  const addItemMutation = useMutation({
    mutationFn: (insightId: number) => apiRequest("POST", `/api/v2/analytics/definitions/${id}/items`, {
      insightId, position: dash?.items?.length || 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions", id] });
      setAddInsightDialog(false);
      toast({ title: "Insight added!" });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: number) => apiRequest("DELETE", `/api/v2/analytics/definitions/${id}/items/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions", id] });
      toast({ title: "Insight removed" });
    },
  });

  const deleteInsightMutation = useMutation({
    mutationFn: (insightId: number) => apiRequest("DELETE", `/api/v2/analytics/insights/${insightId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions", id] });
      setDeleteInsightId(null);
      toast({ title: "Insight deleted permanently" });
    },
    onError: () => toast({ title: "Failed to delete insight", variant: "destructive" }),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: number[]) => apiRequest("POST", `/api/v2/analytics/definitions/${id}/reorder`, { orderedIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions", id] }),
  });

  const colorMutation = useMutation({
    mutationFn: ({ itemId, colorOverride }: { itemId: number; colorOverride: string | null }) =>
      apiRequest("PATCH", `/api/v2/analytics/definitions/${id}/items/${itemId}/color`, { colorOverride }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions", id] }),
    onError: () => toast({ title: "Failed to update chart color", variant: "destructive" }),
  });

  const generateNarrative = async () => {
    setGeneratingNarrative(true);
    try {
      await apiRequest("POST", `/api/v2/analytics/definitions/${id}/narrative`);
      await queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions", id] });
      setNarrativeOpen(true);
      toast({ title: "AI Narrative generated!" });
    } catch {
      toast({ title: "Narrative generation failed", variant: "destructive" });
    } finally {
      setGeneratingNarrative(false);
    }
  };

  const handleNarrative = () => {
    if (dash?.narrativeSummary) { setNarrativeOpen(true); return; }
    generateNarrative();
  };

  const handleMoveUp = (idx: number) => {
    if (!dash || !dash.items) return;
    const items = [...dash.items];
    [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
    reorderMutation.mutate(items.map(i => i.id));
  };

  const handleMoveDown = (idx: number) => {
    if (!dash || !dash.items) return;
    const items = [...dash.items];
    [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
    reorderMutation.mutate(items.map(i => i.id));
  };

  const pinnedInsightIds = new Set((dash?.items ?? []).map(i => i.insightId));
  const unpinnedInsights = allInsights.filter(i => !pinnedInsightIds.has(i.id));
  // Group insights for "Add" dialog: current dataset first, then others
  const currentDatasetInsights = unpinnedInsights.filter(i => i.datasetId === primaryDatasetId);
  const otherInsights = unpinnedInsights.filter(i => i.datasetId !== primaryDatasetId);

  const VisIcon = dash?.visibility === "company" ? Globe : dash?.visibility === "department" ? Building2 : Lock;

  // Power BI-style filter pane computations
  const rawRows: Record<string, unknown>[] = primaryDataset?.rawData || [];

  // Detect date columns from dataset column config
  const datasetCols = primaryDataset?.columns || [];
  // Apply formula columns on the client so measure lookups ("Net Sales") work correctly
  const computedRows: Record<string, unknown>[] = applyFormulaColumnsClient(rawRows, datasetCols);

  const dateColNames = new Set(datasetCols.filter(c => c.columnType === "date").map(c => c.columnName));
  const dateColLabels: Record<string, string> = Object.fromEntries(datasetCols.filter(c => c.columnType === "date").map(c => [c.columnName, c.label]));

  // Build date hierarchies
  const dateHierarchies: Record<string, DateHierarchy> = {};
  for (const col of dateColNames) {
    dateHierarchies[col] = buildDateHierarchy(computedRows, col);
  }

  // Detect categorical (non-numeric) columns — EXCLUDING date columns and formula internal names
  const categoryCols: string[] = computedRows.length
    ? Object.keys(computedRows[0]).filter(col => {
        if (dateColNames.has(col)) return false; // date columns handled separately
        if (col.startsWith("__formula_")) return false; // skip internal formula column keys
        const vals = computedRows.map(r => r[col]);
        const numericCount = vals.filter(v => v !== null && v !== "" && !isNaN(Number(v))).length;
        const unique = new Set(vals.map(v => String(v)));
        return numericCount / vals.length < 0.8 && unique.size >= 2 && unique.size <= 100;
      })
    : [];

  // Unique values per column (for checkboxes)
  const colValueMap: Record<string, string[]> = {};
  for (const col of categoryCols) {
    colValueMap[col] = [...new Set(computedRows.map(r => String(r[col] ?? "")).filter(Boolean))].sort();
  }

  // Sync pending filter state when filter pane opens
  useEffect(() => {
    if (filterPaneOpen) {
      setActiveFilters({ ...appliedFilters });
      setDateFilters({ ...appliedDateFilters });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPaneOpen]);

  // Apply PENDING filters to charts — called by the Apply button
  const applyPendingFilters = () => {
    setAppliedFilters({ ...activeFilters });
    setAppliedDateFilters({ ...dateFilters });
  };

  const hasPendingChanges =
    JSON.stringify(activeFilters) !== JSON.stringify(appliedFilters) ||
    JSON.stringify(dateFilters) !== JSON.stringify(appliedDateFilters);

  // Apply APPLIED filters (not pending) to rows for chart computation
  const filteredRows: Record<string, unknown>[] = computedRows.filter(row => {
    // Categorical filters (applied)
    if (!Object.entries(appliedFilters).every(([col, vals]) => vals.length === 0 || vals.includes(String(row[col] ?? "")))) return false;
    // Date hierarchy filters (applied)
    for (const [col, df] of Object.entries(appliedDateFilters)) {
      const hasFilter = df.years.length > 0 || df.quarters.length > 0 || df.months.length > 0;
      if (!hasFilter) continue;
      const parts = parseDateParts(row[col]);
      if (!parts) continue; // can't parse date — keep row
      const passes = df.years.includes(parts.year) || df.quarters.includes(parts.quarter) || df.months.includes(parts.month);
      if (!passes) return false;
    }
    return true;
  });

  const activeDateFilterCount = Object.values(appliedDateFilters).filter(df => df.years.length > 0 || df.quarters.length > 0 || df.months.length > 0).length;
  const isFiltered = Object.values(appliedFilters).some(v => v.length > 0) || activeDateFilterCount > 0;
  const activeFilterCount = Object.values(appliedFilters).filter(v => v.length > 0).length + activeDateFilterCount;

  // Categorical filter helpers (update PENDING state only — require Apply)
  const toggleFilterValue = (col: string, val: string) => {
    setActiveFilters(prev => {
      const curr = prev[col] || [];
      const next = curr.includes(val) ? curr.filter(v => v !== val) : [...curr, val];
      return { ...prev, [col]: next };
    });
  };
  const clearColFilter = (col: string) => setActiveFilters(prev => ({ ...prev, [col]: [] }));
  // Clear all: resets both pending and applied immediately
  const clearAllFilters = () => {
    setActiveFilters({});
    setDateFilters({});
    setAppliedFilters({});
    setAppliedDateFilters({});
  };
  const toggleSection = (col: string) => setExpandedSections(prev => {
    const current = prev[col] === true; // default false (collapsed)
    return { ...prev, [col]: !current };
  });
  const isSectionExpanded = (col: string) => expandedSections[col] === true; // default COLLAPSED

  // Date hierarchy filter helpers
  const toggleDateYear = (col: string, year: string) => {
    setDateFilters(prev => {
      const df = prev[col] || { years: [], quarters: [], months: [] };
      const years = df.years.includes(year) ? df.years.filter(y => y !== year) : [...df.years, year];
      return { ...prev, [col]: { ...df, years } };
    });
  };
  const toggleDateQuarter = (col: string, qKey: string) => { // qKey = "2023|Q1"
    setDateFilters(prev => {
      const df = prev[col] || { years: [], quarters: [], months: [] };
      const quarters = df.quarters.includes(qKey) ? df.quarters.filter(q => q !== qKey) : [...df.quarters, qKey];
      return { ...prev, [col]: { ...df, quarters } };
    });
  };
  const toggleDateMonth = (col: string, mKey: string) => { // mKey = "2023|Jan"
    setDateFilters(prev => {
      const df = prev[col] || { years: [], quarters: [], months: [] };
      const months = df.months.includes(mKey) ? df.months.filter(m => m !== mKey) : [...df.months, mKey];
      return { ...prev, [col]: { ...df, months } };
    });
  };
  const clearDateColFilter = (col: string) => setDateFilters(prev => ({ ...prev, [col]: { years: [], quarters: [], months: [] } }));
  const toggleDateYear_expand = (col: string, year: string) => setExpandedDateYears(prev => {
    const current = prev[col]?.[year] === true; // default false (collapsed)
    return { ...prev, [col]: { ...(prev[col] || {}), [year]: !current } };
  });
  const toggleDateQuarter_expand = (col: string, qKey: string) => setExpandedDateQuarters(prev => {
    const current = prev[col]?.[qKey] === true; // default false (collapsed)
    return { ...prev, [col]: { ...(prev[col] || {}), [qKey]: !current } };
  });
  const isDateYearExpanded = (col: string, year: string) => expandedDateYears[col]?.[year] === true; // default COLLAPSED
  const isDateQuarterExpanded = (col: string, qKey: string) => expandedDateQuarters[col]?.[qKey] === true; // default COLLAPSED

  // New dashboard creation screen
  if (isNew) {
    return (
      <div className="h-full overflow-auto">
        <div className="p-5 max-w-lg mx-auto space-y-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/analytics")} className="gap-1.5 h-8 text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Analytics Studio
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
              <LayoutDashboard className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-xl font-black">Create Dashboard</h1>
          </div>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold">Dashboard Title *</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Q1 Sales Performance" className="mt-1.5 h-9" data-testid="input-dashboard-title" />
              </div>
              <div>
                <label className="text-xs font-semibold">Description <span className="font-normal text-muted-foreground">(optional)</span></label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this dashboard for?" rows={2} className="mt-1.5 resize-none" data-testid="input-dashboard-description" />
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate("/analytics")}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || createMutation.isPending} className="gap-2" data-testid="button-create-dashboard">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutDashboard className="h-4 w-4" />} Create Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !dash) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      {focusedItem && (
        <FocusInsightOverlay
          item={focusedItem}
          filteredData={focusedItemFilteredData}
          onClose={() => { setFocusedItem(null); setFocusedItemFilteredData(undefined); }}
        />
      )}

      {/* ── Main scrollable area ── */}
      <div className="flex-1 overflow-auto min-w-0">
        <div className="p-5 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => navigate("/analytics")} className="gap-1.5 h-8 text-muted-foreground" data-testid="button-back">
                <ArrowLeft className="h-3.5 w-3.5" /> Analytics Studio
              </Button>
              <span className="text-muted-foreground/40">/</span>
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <Input value={dash.title} onChange={e => updateMutation.mutate({ title: e.target.value })} className="h-8 text-sm font-bold w-56" data-testid="input-title-edit" />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingTitle(false)}>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </Button>
                </div>
              ) : (
                <button className="flex items-center gap-1.5 group" onClick={() => setEditingTitle(true)}>
                  <h1 className="text-lg font-black">{dash.title}</h1>
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </button>
              )}
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${dash.status === "published" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}`}>
                {dash.status === "published" ? <><Globe className="h-2.5 w-2.5" /> Published</> : "Draft"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending} data-testid="button-refresh-charts">
                <RefreshCw className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              {(categoryCols.length > 0 || dateColNames.size > 0) && (
                <Button
                  variant={filterPaneOpen ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5 h-8 relative"
                  onClick={() => setFilterPaneOpen(o => !o)}
                  data-testid="button-filters"
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1.5 h-8 relative" onClick={handleNarrative} disabled={generatingNarrative} data-testid="button-generate-narrative">
                {generatingNarrative ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
                AI Summary
                {dash.narrativeSummary && !generatingNarrative && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setShareDialog(true)} data-testid="button-share" disabled={isNew}>
                <Globe className="h-3.5 w-3.5" /> Share
                {shareEnabled && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-0.5" />}
              </Button>
              <Button size="sm" className="gap-1.5 h-8" onClick={() => setPublishDialog(true)} data-testid="button-publish">
                <Globe className="h-3.5 w-3.5" /> {dash.status === "published" ? "Update" : "Publish"}
              </Button>
            </div>
          </div>

          {/* Active filter summary bar — shows APPLIED filters only */}
          {isFiltered && (
            <div className="flex flex-wrap items-center gap-2" data-testid="active-filter-summary">
              {Object.entries(appliedFilters).filter(([, vals]) => vals.length > 0).map(([col, vals]) => (
                vals.map(val => (
                  <span key={`${col}-${val}`} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <span className="text-muted-foreground">{col}:</span> {val}
                    <button onClick={() => {
                      const updated = { ...appliedFilters, [col]: (appliedFilters[col] || []).filter(v => v !== val) };
                      setAppliedFilters(updated);
                      setActiveFilters(updated);
                    }} className="hover:text-primary/70 ml-0.5"><X className="h-2.5 w-2.5" /></button>
                  </span>
                ))
              ))}
              {Object.entries(appliedDateFilters).flatMap(([col, df]) => {
                const label = dateColLabels[col] || col;
                const pills: JSX.Element[] = [];
                const removeYear = (y: string) => {
                  const upd = { ...appliedDateFilters, [col]: { ...df, years: df.years.filter(x => x !== y) } };
                  setAppliedDateFilters(upd); setDateFilters(upd);
                };
                const removeQuarter = (qk: string) => {
                  const upd = { ...appliedDateFilters, [col]: { ...df, quarters: df.quarters.filter(x => x !== qk) } };
                  setAppliedDateFilters(upd); setDateFilters(upd);
                };
                const removeMonth = (mk: string) => {
                  const upd = { ...appliedDateFilters, [col]: { ...df, months: df.months.filter(x => x !== mk) } };
                  setAppliedDateFilters(upd); setDateFilters(upd);
                };
                df.years.forEach(y => pills.push(
                  <span key={`${col}-y-${y}`} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                    <Calendar className="h-2.5 w-2.5" /><span className="text-muted-foreground">{label}:</span> {y}
                    <button onClick={() => removeYear(y)} className="ml-0.5 hover:text-amber-500"><X className="h-2.5 w-2.5" /></button>
                  </span>
                ));
                df.quarters.forEach(qk => pills.push(
                  <span key={`${col}-q-${qk}`} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                    <Calendar className="h-2.5 w-2.5" /><span className="text-muted-foreground">{label}:</span> {qk.replace("|", " ")}
                    <button onClick={() => removeQuarter(qk)} className="ml-0.5 hover:text-amber-500"><X className="h-2.5 w-2.5" /></button>
                  </span>
                ));
                df.months.forEach(mk => pills.push(
                  <span key={`${col}-m-${mk}`} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                    <Calendar className="h-2.5 w-2.5" /><span className="text-muted-foreground">{label}:</span> {mk.replace("|", " ")}
                    <button onClick={() => removeMonth(mk)} className="ml-0.5 hover:text-amber-500"><X className="h-2.5 w-2.5" /></button>
                  </span>
                ));
                return pills;
              })}
              <span className="text-xs text-muted-foreground">{filteredRows.length} of {computedRows.length} rows</span>
              <button onClick={clearAllFilters} className="text-xs text-muted-foreground underline hover:text-foreground">Clear all</button>
            </div>
          )}

          {/* Insights grid */}
          {(dash.items?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border-2 border-dashed border-border">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10 mb-4">
                <Pin className="h-7 w-7 text-primary/40" />
              </div>
              <p className="text-base font-semibold mb-1">No insights pinned yet</p>
              <p className="text-sm text-muted-foreground max-w-xs mb-4">Save insights from the Explore view and pin them here to build your dashboard.</p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => setAddInsightDialog(true)} disabled={allInsights.length === 0} className="gap-1.5" data-testid="button-add-insight">
                  <Plus className="h-3.5 w-3.5" /> Add Saved Insight
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-muted-foreground">{dash.items?.length ?? 0} insight{(dash.items?.length ?? 0) !== 1 ? "s" : ""}</p>
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setAddInsightDialog(true)} disabled={unpinnedInsights.length === 0} data-testid="button-add-more">
                  <Plus className="h-3.5 w-3.5" /> Add Insight
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(dash.items ?? []).map((item, idx) => {
                  const overrideData = (isFiltered && computedRows.length > 0) ? computeFilteredData(filteredRows, item.insight) : undefined;
                  return (
                    <InsightCard
                      key={item.id}
                      item={item}
                      idx={idx}
                      total={dash.items?.length ?? 0}
                      dashboardId={Number(id)}
                      onRemove={() => setRemoveId(item.id)}
                      onMoveUp={() => handleMoveUp(idx)}
                      onMoveDown={() => handleMoveDown(idx)}
                      filteredData={overrideData}
                      onFocus={() => { setFocusedItem(item); setFocusedItemFilteredData(overrideData); }}
                      onColorChange={(colorOverride) => colorMutation.mutate({ itemId: item.id, colorOverride })}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Power BI-style Filter Pane ── */}
      {filterPaneOpen && (categoryCols.length > 0 || dateColNames.size > 0) && (
        <div className="w-72 border-l bg-background shrink-0 flex flex-col overflow-hidden" data-testid="filter-pane">
          {/* Pane header */}
          <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
            <span className="font-bold text-sm flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-primary" /> Filters
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{activeFilterCount} active</span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {isFiltered && (
                <button onClick={clearAllFilters} className="text-[11px] text-muted-foreground hover:text-foreground underline mr-1">Clear all</button>
              )}
              <button onClick={() => setFilterPaneOpen(false)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Filter sections */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">

            {/* ── Date Hierarchy sections (Power BI style) ── */}
            {[...dateColNames].map(col => {
              const label = dateColLabels[col] || col;
              const hierarchy = dateHierarchies[col] || {};
              const df = dateFilters[col] || { years: [], quarters: [], months: [] };
              const activeDateCount = df.years.length + df.quarters.length + df.months.length;
              const sectionExpanded = isSectionExpanded(`__date__${col}`);

              return (
                <div key={`date-${col}`} className="rounded-lg border border-amber-200/60 dark:border-amber-800/40 overflow-hidden bg-amber-50/40 dark:bg-amber-950/10" data-testid={`filter-section-date-${col}`}>
                  {/* Date section header */}
                  <button
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-amber-100/50 dark:hover:bg-amber-950/30 transition-colors text-left"
                    onClick={() => toggleSection(`__date__${col}`)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0 h-6 w-6 flex items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/60 border border-amber-300/60 dark:border-amber-700/60">
                        <Calendar className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      </span>
                      <span className="text-xs font-semibold text-foreground truncate">{label}</span>
                      {activeDateCount > 0 && (
                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">{activeDateCount}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {activeDateCount > 0 && (
                        <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); clearDateColFilter(col); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); clearDateColFilter(col); }}} className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded hover:bg-muted/40">
                          <X className="h-3 w-3" />
                        </span>
                      )}
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${sectionExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {sectionExpanded && (
                    <div className="bg-background px-2 py-2 space-y-0.5">
                      {Object.keys(hierarchy).sort((a, b) => Number(b) - Number(a)).map(year => {
                        const yearExpanded = isDateYearExpanded(col, year);
                        const yearActive = df.years.includes(year);
                        const yearRowCount = Object.values(hierarchy[year]).flatMap(q => Object.values(q)).reduce((s, n) => s + n, 0);

                        return (
                          <div key={year}>
                            {/* Year row */}
                            <div className="flex items-center gap-1 rounded hover:bg-muted/30 -mx-1 px-1 py-1 group">
                              <button onClick={() => toggleDateYear_expand(col, year)} className="text-muted-foreground hover:text-foreground">
                                {yearExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </button>
                              <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                <Checkbox checked={yearActive} onCheckedChange={() => toggleDateYear(col, year)} className="h-3.5 w-3.5 shrink-0" data-testid={`date-year-${col}-${year}`} />
                                <span className={`text-xs font-bold ${yearActive ? "text-foreground" : "text-muted-foreground"}`}>{year}</span>
                                <span className="text-[10px] text-muted-foreground ml-auto">{yearRowCount}</span>
                              </label>
                            </div>

                            {/* Quarter + Month sub-tree */}
                            {yearExpanded && (
                              <div className="ml-5 space-y-0.5 border-l border-border pl-2 pb-1">
                                {["Q1", "Q2", "Q3", "Q4"].filter(q => hierarchy[year][q]).map(q => {
                                  const qKey = `${year}|${q}`;
                                  const qActive = df.quarters.includes(qKey);
                                  const qExpanded = isDateQuarterExpanded(col, qKey);
                                  const qRowCount = Object.values(hierarchy[year][q]).reduce((s, n) => s + n, 0);
                                  const qMonths = hierarchy[year][q];

                                  return (
                                    <div key={q}>
                                      {/* Quarter row */}
                                      <div className="flex items-center gap-1 rounded hover:bg-muted/30 -mx-1 px-1 py-0.5 group">
                                        <button onClick={() => toggleDateQuarter_expand(col, qKey)} className="text-muted-foreground hover:text-foreground">
                                          {qExpanded ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                                        </button>
                                        <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                          <Checkbox checked={qActive} onCheckedChange={() => toggleDateQuarter(col, qKey)} className="h-3 w-3 shrink-0" data-testid={`date-quarter-${col}-${qKey}`} />
                                          <span className={`text-[11px] font-semibold ${qActive ? "text-amber-700" : "text-muted-foreground"}`}>{q}</span>
                                          <span className="text-[10px] text-muted-foreground ml-auto">{qRowCount}</span>
                                        </label>
                                      </div>

                                      {/* Month rows */}
                                      {qExpanded && (
                                        <div className="ml-4 space-y-0.5 border-l border-border pl-2">
                                          {Object.keys(qMonths).sort((a, b) => (MONTH_ORDER[a] || 0) - (MONTH_ORDER[b] || 0)).map(mon => {
                                            const mKey = `${year}|${mon}`;
                                            const mActive = df.months.includes(mKey);
                                            return (
                                              <label key={mon} className="flex items-center gap-2 py-0.5 cursor-pointer rounded hover:bg-muted/30 -mx-1 px-1">
                                                <Checkbox checked={mActive} onCheckedChange={() => toggleDateMonth(col, mKey)} className="h-3 w-3 shrink-0" data-testid={`date-month-${col}-${mKey}`} />
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
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {Object.keys(hierarchy).length === 0 && (
                        <p className="text-[11px] text-muted-foreground py-1 px-1">No valid dates found</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Categorical filter sections ── */}
            {categoryCols.map(col => {
              const selected = activeFilters[col] || [];
              const expanded = isSectionExpanded(col);
              const search = filterSearch[col] || "";
              const allVals = colValueMap[col] || [];
              const visibleVals = search ? allVals.filter(v => v.toLowerCase().includes(search.toLowerCase())) : allVals;

              return (
                <div key={col} className="rounded-lg border border-border/70 overflow-hidden bg-background" data-testid={`filter-section-${col}`}>
                  {/* Section header */}
                  <button
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => toggleSection(col)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate">{col}</span>
                      {selected.length > 0 && (
                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">{selected.length}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {selected.length > 0 && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={e => { e.stopPropagation(); clearColFilter(col); }}
                          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); clearColFilter(col); }}}
                          className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded hover:bg-muted/40"
                        >
                          <X className="h-3 w-3" />
                        </span>
                      )}
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {/* Section body */}
                  {expanded && (
                    <div className="bg-background">
                      {/* Search within values */}
                      {allVals.length > 6 && (
                        <div className="px-3 pt-2 pb-1">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <input
                              className="w-full pl-6 pr-2 py-1 text-xs border rounded bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary/30"
                              placeholder="Search…"
                              value={search}
                              onChange={e => setFilterSearch(prev => ({ ...prev, [col]: e.target.value }))}
                            />
                          </div>
                        </div>
                      )}

                      {/* Select all / Deselect all */}
                      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-muted/30">
                        <button
                          className="text-[11px] text-primary hover:underline"
                          onClick={() => setActiveFilters(prev => ({ ...prev, [col]: [...allVals] }))}
                        >Select all</button>
                        <span className="text-muted-foreground text-[10px]">·</span>
                        <button
                          className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                          onClick={() => clearColFilter(col)}
                        >Clear</button>
                      </div>

                      {/* Value checkboxes */}
                      <div className="max-h-48 overflow-y-auto px-3 py-1.5 space-y-1">
                        {visibleVals.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground py-1">No matches</p>
                        ) : (
                          visibleVals.map(val => {
                            const checked = selected.includes(val);
                            const rowCount = computedRows.filter(r => String(r[col] ?? "") === val).length;
                            return (
                              <label
                                key={val}
                                className="flex items-center gap-2.5 py-1 cursor-pointer group rounded hover:bg-muted/30 -mx-1 px-1"
                                data-testid={`filter-val-${col}-${val}`}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleFilterValue(col, val)}
                                  className="h-3.5 w-3.5 shrink-0"
                                />
                                <span className={`text-xs truncate flex-1 ${checked ? "font-semibold text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{val}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0">{rowCount}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer: Apply button + row count */}
          <div className="px-3 py-3 border-t shrink-0 space-y-2">
            <Button
              size="sm"
              className="w-full h-9 font-semibold gap-1.5"
              onClick={applyPendingFilters}
              disabled={!hasPendingChanges}
              data-testid="button-apply-filters"
            >
              Apply Filters
              {hasPendingChanges && (
                <span className="text-[10px] opacity-80 font-normal">
                  ({Object.values(activeFilters).filter(v => v.length > 0).length + Object.values(dateFilters).filter(d => d.years.length + d.quarters.length + d.months.length > 0).length} selected)
                </span>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              {isFiltered
                ? <><span className="font-semibold text-foreground">{filteredRows.length}</span> of {computedRows.length} rows (applied)</>
                : <>{computedRows.length} rows total</>
              }
            </p>
          </div>
        </div>
      )}

      {/* AI Narrative Sheet */}
      <Sheet open={narrativeOpen} onOpenChange={setNarrativeOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 py-4 border-b">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" /> AI Executive Summary
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {dash?.narrativeSummary ? (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{dash.narrativeSummary}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No narrative generated yet.</p>
            )}
          </div>
          {dash?.narrativeSummary && (
            <div className="border-t px-5 py-3 flex justify-end">
              <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => { setNarrativeOpen(false); generateNarrative(); }} disabled={generatingNarrative} data-testid="button-regenerate-narrative">
                {generatingNarrative ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Regenerate
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Publish dialog */}
      <Dialog open={publishDialog} onOpenChange={setPublishDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Globe className="h-4 w-4 text-emerald-600" /> Publish Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Choose who can view this dashboard</p>
            <Select value={publishVisibility} onValueChange={setPublishVisibility} data-testid="select-visibility">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Private — only me</span></SelectItem>
                <SelectItem value="department"><span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Department</span></SelectItem>
                <SelectItem value="company"><span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Company-wide</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialog(false)}>Cancel</Button>
            <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" data-testid="button-confirm-publish">
              {publishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={shareDialog} onOpenChange={setShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Share Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Generate a public link that anyone can view — no login required.</p>
            <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
              <div>
                <p className="text-sm font-medium">Public link</p>
                <p className="text-xs text-muted-foreground mt-0.5">{shareEnabled ? "Anyone with the link can view" : "Link is currently disabled"}</p>
              </div>
              <button
                onClick={() => shareMutation.mutate(!shareEnabled)}
                disabled={shareMutation.isPending}
                data-testid="toggle-share-enabled"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${shareEnabled ? "bg-emerald-500" : "bg-muted border"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${shareEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            {shareEnabled && shareToken && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Share link</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={`${window.location.origin}/public/dashboard/${shareToken}`}
                    className="flex-1 text-xs px-3 py-2 rounded-md border bg-muted font-mono truncate"
                    data-testid="input-share-link"
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/public/dashboard/${shareToken}`);
                    toast({ title: "Link copied!" });
                  }} data-testid="button-copy-link">Copy</Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add insight dialog */}
      <Dialog open={addInsightDialog} onOpenChange={setAddInsightDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" /> Add Insight to Dashboard</DialogTitle>
          </DialogHeader>
          <div className="max-h-[420px] overflow-y-auto py-2 space-y-3">
            {unpinnedInsights.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No saved insights available. Create insights from the Explore screen first.</p>
            ) : (
              <>
                {/* Current dataset insights */}
                {currentDatasetInsights.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 px-1">
                      <Database className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">From Current Dataset</span>
                      <div className="flex-1 h-px bg-emerald-500/20" />
                    </div>
                    {currentDatasetInsights.map(ins => (
                      <div key={ins.id} className="flex items-center gap-2" data-testid={`insight-row-${ins.id}`}>
                        <button onClick={() => addItemMutation.mutate(ins.id)}
                          className="flex-1 text-left flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                          disabled={addItemMutation.isPending}
                          data-testid={`select-insight-${ins.id}`}>
                          <Lightbulb className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{ins.title}</p>
                            <p className="text-xs text-muted-foreground italic truncate">"{ins.question}"</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        </button>
                        <button
                          onClick={() => setDeleteInsightId(ins.id)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 text-muted-foreground transition-colors shrink-0"
                          title="Delete insight"
                          data-testid={`delete-insight-${ins.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Other insights */}
                {otherInsights.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 px-1">
                      <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        {currentDatasetInsights.length > 0 ? "Other Saved Insights" : "All Saved Insights"}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    {otherInsights.map(ins => (
                      <div key={ins.id} className="flex items-center gap-2" data-testid={`insight-row-${ins.id}`}>
                        <button onClick={() => addItemMutation.mutate(ins.id)}
                          className="flex-1 text-left flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                          disabled={addItemMutation.isPending}
                          data-testid={`select-insight-${ins.id}`}>
                          <Lightbulb className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{ins.title}</p>
                            <p className="text-xs text-muted-foreground italic truncate">"{ins.question}"</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        </button>
                        <button
                          onClick={() => setDeleteInsightId(ins.id)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 text-muted-foreground transition-colors shrink-0"
                          title="Delete insight"
                          data-testid={`delete-insight-${ins.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove from dashboard confirm */}
      <AlertDialog open={removeId !== null} onOpenChange={() => setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Remove Insight</AlertDialogTitle>
            <AlertDialogDescription>Remove this insight from the dashboard? The insight itself will not be deleted — you can re-add it later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (removeId) { removeItemMutation.mutate(removeId); setRemoveId(null); } }}>Remove from Dashboard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete insight permanently confirm */}
      <AlertDialog open={deleteInsightId !== null} onOpenChange={() => setDeleteInsightId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Trash2 className="h-4 w-4 text-red-500" />Delete Insight Permanently</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this insight and remove it from any dashboard it's pinned to. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteInsightId) deleteInsightMutation.mutate(deleteInsightId); }}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="confirm-delete-insight"
            >
              {deleteInsightMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
