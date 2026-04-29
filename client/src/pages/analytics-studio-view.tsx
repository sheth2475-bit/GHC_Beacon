import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, ArrowLeft, Sparkles, Globe, Lock, Building2, Upload,
  RefreshCw, Send, Loader2, Download, TrendingUp, AlertCircle,
  CheckCircle2, Lightbulb, MessageSquare, FileSpreadsheet, Clock,
  Check, Archive, Eye, MoreHorizontal, BookOpen, SlidersHorizontal, X as XIcon,
  Maximize2,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, LabelList,
} from "recharts";
import type { AnalyticsDashboard, AnalyticsDashboardWidget, AnalyticsDashboardNarrative, AnalyticsDashboardChat, AnalyticsDashboardUpload } from "@shared/schema";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#84cc16"];

function parseNumeric(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/[,$%\s]/g, "").trim();
  return s === "" ? NaN : Number(s);
}

function buildClientWidgets(rows: Record<string, unknown>[]): Partial<AnalyticsDashboardWidget>[] {
  if (!rows.length) return [];
  const cols = Object.keys(rows[0]);
  const numericCols = cols.filter(c => {
    const nonEmpty = rows.filter(r => r[c] !== null && r[c] !== "" && r[c] !== undefined);
    if (nonEmpty.length === 0) return false;
    const numericCount = nonEmpty.filter(r => !isNaN(parseNumeric(r[c]))).length;
    return numericCount / nonEmpty.length >= 0.7;
  });
  const textCols = cols.filter(c => !numericCols.includes(c));
  const timeCol = cols.find(c => /date|month|period|week|year|quarter/i.test(c));
  const categoryCol = textCols.find(c => c !== timeCol) || textCols[0];
  const widgets: Partial<AnalyticsDashboardWidget>[] = [];
  let pos = 0;

  for (const col of numericCols.slice(0, 4)) {
    const vals = rows.map(r => parseNumeric(r[col])).filter(v => !isNaN(v));
    const total = vals.reduce((a, b) => a + b, 0);
    const avg = vals.length ? total / vals.length : 0;
    widgets.push({ id: -(pos + 1), widgetType: "kpi_card", title: col.replace(/_/g, " "), config: { metric: col, value: total, avg, total, count: vals.length, label: col.replace(/_/g, " ") }, position: pos++ });
  }

  if (timeCol && numericCols.length > 0) {
    const metric = numericCols[0];
    const grouped: Record<string, number> = {};
    for (const r of rows) { const k = String(r[timeCol] || ""); grouped[k] = (grouped[k] || 0) + parseNumeric(r[metric] || 0); }
    const chartData = Object.entries(grouped).map(([k, v]) => ({ [timeCol]: k, [metric]: Math.round(v * 100) / 100 }));
    widgets.push({ id: -(pos + 1), widgetType: "line_chart", title: `${metric.replace(/_/g, " ")} over time`, config: { data: chartData, xKey: timeCol, yKey: metric, color: "#3b82f6" }, position: pos++ });
  }

  if (categoryCol && numericCols.length > 0) {
    const metric = numericCols[0];
    const grouped: Record<string, number> = {};
    for (const r of rows) { const k = String(r[categoryCol] || "Other"); grouped[k] = (grouped[k] || 0) + parseNumeric(r[metric] || 0); }
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const chartData = sorted.map(([k, v]) => ({ [categoryCol]: k, [metric]: Math.round(v * 100) / 100 }));
    widgets.push({ id: -(pos + 1), widgetType: "bar_chart", title: `${metric.replace(/_/g, " ")} by ${categoryCol.replace(/_/g, " ")}`, config: { data: chartData, xKey: categoryCol, yKey: metric, color: "#8b5cf6" }, position: pos++ });
  }

  if (categoryCol && numericCols.length >= 2) {
    const metric = numericCols[1];
    const grouped: Record<string, number> = {};
    for (const r of rows) { const k = String(r[categoryCol] || "Other"); grouped[k] = (grouped[k] || 0) + parseNumeric(r[metric] || 0); }
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const pieData = sorted.map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
    widgets.push({ id: -(pos + 1), widgetType: "pie_chart", title: `${metric.replace(/_/g, " ")} distribution`, config: { data: pieData }, position: pos++ });
  }

  // ── Auto date detection: Year-over-Year & Month-on-Month ──
  const parseMonthYear = (val: string): { year: string; month: number } | null => {
    const m = val.match(/^(\d{4})-(\d{2})(?:-\d{2})?/);
    return m ? { year: m[1], month: parseInt(m[2]) } : null;
  };
  const monthCol = cols.find(c => {
    if (numericCols.includes(c)) return false;
    const sample = rows.slice(0, 30).map(r => String(r[c] ?? "")).filter(v => v !== "");
    if (sample.length === 0) return false;
    return sample.filter(v => parseMonthYear(v) !== null).length / sample.length >= 0.5;
  });
  if (monthCol && numericCols.length > 0) {
    const metric = numericCols[0];
    const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const byYearMonth: Record<string, Record<number, number>> = {};
    for (const r of rows) {
      const parsed = parseMonthYear(String(r[monthCol] ?? ""));
      if (!parsed) continue;
      const { year, month } = parsed;
      if (!byYearMonth[year]) byYearMonth[year] = {};
      byYearMonth[year][month] = (byYearMonth[year][month] || 0) + parseNumeric(r[metric] || 0);
    }
    const years = Object.keys(byYearMonth).sort();
    if (years.length >= 2) {
      const yearData = years.map(y => ({ year: y, [metric]: Math.round(Object.values(byYearMonth[y]).reduce((a, b) => a + b, 0) * 100) / 100 }));
      widgets.push({ id: -(pos + 1), widgetType: "bar_chart", title: `${metric.replace(/_/g, " ")} — Year over Year`, config: { data: yearData, xKey: "year", yKey: metric, color: "#10b981" }, position: pos++ });

      const currentYear = years[years.length - 1];
      const priorYear = years[years.length - 2];
      const momData = MONTH_LABELS
        .map((label, i) => {
          const mo = i + 1;
          return { month: label, [currentYear]: Math.round((byYearMonth[currentYear]?.[mo] || 0) * 100) / 100, [priorYear]: Math.round((byYearMonth[priorYear]?.[mo] || 0) * 100) / 100 };
        })
        .filter(d => (d[currentYear] as number) > 0 || (d[priorYear] as number) > 0);
      if (momData.length > 0) {
        widgets.push({
          id: -(pos + 1),
          widgetType: "comparison_chart",
          title: `${metric.replace(/_/g, " ")} — ${currentYear} vs ${priorYear} (Month by Month)`,
          config: {
            data: momData, xKey: "month",
            series: [
              { key: currentYear, color: "#3b82f6", label: `${currentYear} (Current)` },
              { key: priorYear, color: "#94a3b8", label: `${priorYear} (Prior Year)` },
            ],
          },
          position: pos++,
        });
      }
    }
  }

  widgets.push({ id: -(pos + 1), widgetType: "table", title: "Data Table", config: { columns: cols, rows: rows.slice(0, 100) }, position: pos++ });
  return widgets;
}

type DashboardFull = AnalyticsDashboard & {
  widgets: AnalyticsDashboardWidget[];
  narrative: AnalyticsDashboardNarrative | null;
  uploads: AnalyticsDashboardUpload[];
  chat: AnalyticsDashboardChat[];
};

/* ── Focus mode overlay ── */
function FocusModeOverlay({ widget, onClose }: { widget: AnalyticsDashboardWidget; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-background"
      data-testid="focus-mode-overlay"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Maximize2 className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm">{widget.title}</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Focus Mode</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-3 py-1.5 hover:bg-muted/50 transition-colors"
          data-testid="button-exit-focus"
        >
          <XIcon className="h-3.5 w-3.5" />
          Back to dashboard
        </button>
      </div>
      {/* Expanded widget */}
      <div className="flex-1 overflow-auto p-6 flex flex-col">
        <FocusWidgetContent widget={widget} />
      </div>
    </div>
  );
}

function FocusWidgetContent({ widget }: { widget: AnalyticsDashboardWidget }) {
  if (widget.widgetType === "kpi_card") {
    const cfg = widget.config as { metric: string; value: number; avg?: number; total: number; count: number; label: string } | null;
    if (!cfg) return null;
    const total = typeof cfg.total === "number" ? cfg.total : (typeof cfg.value === "number" ? cfg.value : 0);
    const displayVal = Number.isInteger(total) ? total.toLocaleString() : total.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const avg = typeof cfg.avg === "number" ? cfg.avg : null;
    const displayAvg = avg !== null ? avg.toLocaleString(undefined, { maximumFractionDigits: 2 }) : null;
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <TrendingUp className="h-8 w-8 text-primary" />
        </div>
        <p className="text-8xl font-black tabular-nums text-foreground">{displayVal}</p>
        <p className="text-sm text-muted-foreground">{cfg.count} rows{displayAvg ? ` · Avg per row: ${displayAvg}` : ""}</p>
      </div>
    );
  }

  if (["bar_chart", "line_chart", "area_chart"].includes(widget.widgetType)) {
    const cfg = widget.config as { data: Record<string, unknown>[]; xKey: string; yKey: string; color?: string } | null;
    if (!cfg || !cfg.data || cfg.data.length === 0) return null;
    const color = cfg.color || CHART_COLORS[0];
    return (
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {widget.widgetType === "line_chart" || widget.widgetType === "area_chart" ? (
            <AreaChart data={cfg.data} margin={{ top: 12, right: 24, bottom: 12, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey={cfg.xKey} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "13px" }} />
              <Area type="monotone" dataKey={cfg.yKey} stroke={color} fill={`${color}20`} strokeWidth={2.5} dot={{ r: 4, fill: color, stroke: "hsl(var(--background))", strokeWidth: 2 }}>
                <LabelList dataKey={cfg.yKey} position="top" style={{ fontSize: 10, fill: "currentColor", fontWeight: 700 }} />
              </Area>
            </AreaChart>
          ) : (
            <BarChart data={cfg.data} barSize={36} margin={{ top: 12, right: 24, bottom: 12, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey={cfg.xKey} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "13px" }} />
              <Bar dataKey={cfg.yKey} fill={color} radius={[6, 6, 0, 0]}>
                <LabelList dataKey={cfg.yKey} position="top" style={{ fontSize: 10, fill: "currentColor", fontWeight: 700 }} />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  }

  if (widget.widgetType === "comparison_chart") {
    const cfg = widget.config as { data: Record<string, unknown>[]; xKey: string; series: { key: string; color: string; label: string }[] } | null;
    if (!cfg || !cfg.data || cfg.data.length === 0 || !cfg.series?.length) return null;
    return (
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cfg.data} barGap={4} barSize={24} margin={{ top: 12, right: 24, bottom: 12, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey={cfg.xKey} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={52} />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "13px" }} />
            <Legend iconType="circle" iconSize={10} formatter={(v: string) => <span className="text-sm text-foreground">{v}</span>} />
            {cfg.series.map(s => (
              <Bar key={s.key} dataKey={s.key} fill={s.color} name={s.label} radius={[4, 4, 0, 0]}>
                <LabelList dataKey={s.key} position="top" style={{ fontSize: 10, fill: "currentColor", fontWeight: 700 }} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (widget.widgetType === "pie_chart") {
    const cfg = widget.config as { data: { name: string; value: number }[] } | null;
    if (!cfg || !cfg.data || cfg.data.length === 0) return null;
    return (
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={cfg.data} cx="50%" cy="45%" outerRadius="60%" innerRadius="32%" paddingAngle={3} dataKey="value" stroke="none" label={({ value }) => value} labelLine={false}>
              {cfg.data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "13px" }} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={10} formatter={(v: string) => <span className="text-sm text-foreground">{v}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (widget.widgetType === "table") {
    const cfg = widget.config as { columns: string[]; rows: Record<string, unknown>[] } | null;
    if (!cfg || !cfg.rows || cfg.rows.length === 0) return null;
    return (
      <div className="rounded-xl border bg-card overflow-hidden flex flex-col min-h-0 flex-1">
        <div className="px-4 py-2.5 border-b bg-muted/30 shrink-0">
          <p className="text-xs text-muted-foreground">{cfg.rows.length} rows</p>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50">
              <tr>{cfg.columns.map(c => <th key={c} className="px-4 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{c.replace(/_/g, " ")}</th>)}</tr>
            </thead>
            <tbody>
              {cfg.rows.map((row, i) => (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                  {cfg.columns.map(c => <td key={c} className="px-4 py-2 whitespace-nowrap text-foreground/80">{String(row[c] ?? "—")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}

/* ── KPI Card widget ── */
function KpiCard({ widget, onFocus }: { widget: AnalyticsDashboardWidget; onFocus: () => void }) {
  const cfg = widget.config as { metric: string; value: number; avg?: number; total: number; count: number; label: string } | null;
  if (!cfg) return null;
  const total = typeof cfg.total === "number" ? cfg.total : (typeof cfg.value === "number" ? cfg.value : 0);
  const displayVal = Number.isInteger(total) ? total.toLocaleString() : total.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const avg = typeof cfg.avg === "number" ? cfg.avg : (typeof cfg.value === "number" && cfg.count ? cfg.value / cfg.count : null);
  const displayAvg = avg !== null ? (Number.isInteger(avg) ? avg.toLocaleString() : avg.toLocaleString(undefined, { maximumFractionDigits: 2 })) : null;
  return (
    <div className="group relative rounded-xl border bg-card p-4 hover:shadow-sm transition-all" data-testid={`widget-kpi-${widget.id}`}>
      <button
        onClick={onFocus}
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted border border-transparent hover:border-border"
        title="Focus mode"
        data-testid={`button-focus-widget-${widget.id}`}
      >
        <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-none">{widget.title}</p>
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
      <p className="text-3xl font-black tabular-nums text-foreground">{displayVal}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{cfg.count} rows{displayAvg ? ` · Avg: ${displayAvg}` : ""}</p>
    </div>
  );
}

/* ── Chart widget ── */
function ChartWidget({ widget, onFocus }: { widget: AnalyticsDashboardWidget; onFocus: () => void }) {
  const cfg = widget.config as { data: Record<string, unknown>[]; xKey: string; yKey: string; color?: string } | null;
  if (!cfg || !cfg.data || cfg.data.length === 0) return null;
  const color = cfg.color || CHART_COLORS[0];

  return (
    <div className="group relative rounded-xl border bg-card p-4" data-testid={`widget-chart-${widget.id}`}>
      <button
        onClick={onFocus}
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted border border-transparent hover:border-border"
        title="Focus mode"
        data-testid={`button-focus-widget-${widget.id}`}
      >
        <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <p className="text-sm font-bold mb-3">{widget.title}</p>
      <ResponsiveContainer width="100%" height={220}>
        {widget.widgetType === "line_chart" || widget.widgetType === "area_chart" ? (
          <AreaChart data={cfg.data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey={cfg.xKey} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "11px" }} />
            <Area type="monotone" dataKey={cfg.yKey} stroke={color} fill={`${color}20`} strokeWidth={2} dot={{ r: 2, fill: color }}>
              <LabelList dataKey={cfg.yKey} position="top" style={{ fontSize: 8, fill: "currentColor", fontWeight: 700 }} />
            </Area>
          </AreaChart>
        ) : (
          <BarChart data={cfg.data} barSize={28} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey={cfg.xKey} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "11px" }} />
            <Bar dataKey={cfg.yKey} fill={color} radius={[4, 4, 0, 0]}>
              <LabelList dataKey={cfg.yKey} position="top" style={{ fontSize: 8, fill: "currentColor", fontWeight: 700 }} />
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/* ── Comparison (YoY / MoM grouped bar) widget ── */
function ComparisonWidget({ widget, onFocus }: { widget: AnalyticsDashboardWidget; onFocus: () => void }) {
  const cfg = widget.config as { data: Record<string, unknown>[]; xKey: string; series: { key: string; color: string; label: string }[] } | null;
  if (!cfg || !cfg.data || cfg.data.length === 0 || !cfg.series?.length) return null;
  return (
    <div className="group relative rounded-xl border bg-card p-4 col-span-full" data-testid={`widget-comparison-${widget.id}`}>
      <button
        onClick={onFocus}
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted border border-transparent hover:border-border"
        title="Focus mode"
        data-testid={`button-focus-widget-${widget.id}`}
      >
        <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <p className="text-sm font-bold mb-3">{widget.title}</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={cfg.data} barGap={3} barSize={18} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey={cfg.xKey} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "11px" }} />
          <Legend iconType="circle" iconSize={7} formatter={(v: string) => <span className="text-[10px] text-foreground">{v}</span>} />
          {cfg.series.map(s => (
            <Bar key={s.key} dataKey={s.key} fill={s.color} name={s.label} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Pie chart widget ── */
function PieWidget({ widget, onFocus }: { widget: AnalyticsDashboardWidget; onFocus: () => void }) {
  const cfg = widget.config as { data: { name: string; value: number }[] } | null;
  if (!cfg || !cfg.data || cfg.data.length === 0) return null;
  return (
    <div className="group relative rounded-xl border bg-card p-4" data-testid={`widget-pie-${widget.id}`}>
      <button
        onClick={onFocus}
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted border border-transparent hover:border-border"
        title="Focus mode"
        data-testid={`button-focus-widget-${widget.id}`}
      >
        <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <p className="text-sm font-bold mb-2">{widget.title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={cfg.data} cx="50%" cy="45%" outerRadius="55%" innerRadius="30%" paddingAngle={3} dataKey="value" stroke="none" label={({ value }) => value} labelLine={false}>
            {cfg.data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "11px" }} />
          <Legend verticalAlign="bottom" height={24} iconType="circle" iconSize={7} formatter={(v: string) => <span className="text-[10px] text-foreground">{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Data table widget ── */
function TableWidget({ widget, onFocus }: { widget: AnalyticsDashboardWidget; onFocus: () => void }) {
  const cfg = widget.config as { columns: string[]; rows: Record<string, unknown>[] } | null;
  if (!cfg || !cfg.rows || cfg.rows.length === 0) return null;
  const cols = cfg.columns.slice(0, 8);
  return (
    <div className="group relative rounded-xl border bg-card overflow-hidden" data-testid={`widget-table-${widget.id}`}>
      <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">{widget.title}</p>
          <p className="text-[10px] text-muted-foreground">{cfg.rows.length} rows</p>
        </div>
        <button
          onClick={onFocus}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted border border-transparent hover:border-border"
          title="Focus mode"
          data-testid={`button-focus-widget-${widget.id}`}
        >
          <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className="overflow-x-auto max-h-64">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/50">
            <tr>{cols.map(c => <th key={c} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{c.replace(/_/g, " ")}</th>)}</tr>
          </thead>
          <tbody>
            {cfg.rows.slice(0, 50).map((row, i) => (
              <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                {cols.map(c => <td key={c} className="px-3 py-1.5 whitespace-nowrap text-foreground/80">{String(row[c] ?? "—")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Narrative panel ── */
function NarrativePanel({ narrative, onGenerate, isGenerating }: {
  narrative: AnalyticsDashboardNarrative | null;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  if (!narrative) {
    return (
      <div className="rounded-xl border bg-card p-5 flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-bold text-sm mb-0.5">Generate AI Narrative</p>
          <p className="text-xs text-muted-foreground">Let AI analyse your data and write an executive summary with insights, highlights, and recommendations.</p>
        </div>
        <Button onClick={onGenerate} disabled={isGenerating} size="sm" className="gap-2" data-testid="button-generate-narrative">
          {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />Generating…</> : <><Sparkles className="h-4 w-4" />Generate Narrative</>}
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {narrative.executiveSummary && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Executive Summary</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed" data-testid="text-narrative-summary">{narrative.executiveSummary}</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {narrative.highlights && (
          <div className="rounded-xl border bg-emerald-500/5 border-emerald-500/15 p-4">
            <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Highlights</span></div>
            {narrative.highlights.split("\n").filter(l => l.trim()).map((l, i) => <p key={i} className="text-xs text-muted-foreground flex gap-1.5 mb-1"><span className="text-emerald-500 shrink-0">•</span>{l.replace(/^[-•]\s*/, "")}</p>)}
          </div>
        )}
        {narrative.risks && (
          <div className="rounded-xl border bg-red-500/5 border-red-500/15 p-4">
            <div className="flex items-center gap-2 mb-2"><AlertCircle className="h-3.5 w-3.5 text-red-500" /><span className="text-xs font-bold text-red-500 uppercase tracking-wide">Risks & Concerns</span></div>
            {narrative.risks.split("\n").filter(l => l.trim()).map((l, i) => <p key={i} className="text-xs text-muted-foreground flex gap-1.5 mb-1"><span className="text-red-400 shrink-0">•</span>{l.replace(/^[-•]\s*/, "")}</p>)}
          </div>
        )}
      </div>
      {narrative.insights && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-2"><BookOpen className="h-3.5 w-3.5 text-blue-500" /><span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Key Insights</span></div>
          {narrative.insights.split("\n").filter(l => l.trim()).map((l, i) => <p key={i} className="text-xs text-muted-foreground flex gap-1.5 mb-1"><span className="text-blue-400 shrink-0">•</span>{l.replace(/^[-•]\s*/, "")}</p>)}
        </div>
      )}
      {narrative.suggestedActions && (
        <div className="rounded-xl border bg-primary/5 border-primary/15 p-4">
          <div className="flex items-center gap-2 mb-2"><Lightbulb className="h-3.5 w-3.5 text-primary" /><span className="text-xs font-bold text-primary uppercase tracking-wide">Recommended Actions</span></div>
          {narrative.suggestedActions.split("\n").filter(l => l.trim()).map((l, i) => <p key={i} className="text-xs text-muted-foreground flex gap-1.5 mb-1"><span className="text-primary shrink-0">•</span>{l.replace(/^[-•]\s*/, "")}</p>)}
        </div>
      )}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onGenerate} disabled={isGenerating} className="gap-1.5 text-xs" data-testid="button-regenerate-narrative">
          {isGenerating ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Regenerating…</> : <><RefreshCw className="h-3.5 w-3.5" />Regenerate</>}
        </Button>
      </div>
    </div>
  );
}

export default function AnalyticsStudioViewPage() {
  const [, params] = useRoute("/analytics/:id");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const id = Number(params?.id);
  const [activeTab, setActiveTab] = useState<"dashboard" | "narrative" | "chat" | "uploads">("dashboard");
  const [chatInput, setChatInput] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [filterCol, setFilterCol] = useState<string>("");
  const [filterVal, setFilterVal] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [focusedWidget, setFocusedWidget] = useState<AnalyticsDashboardWidget | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: dash, isLoading } = useQuery<DashboardFull>({ queryKey: ["/api/analytics/dashboards", id], queryFn: () => fetch(`/api/analytics/dashboards/${id}`).then(r => r.json()) });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, string>) => apiRequest("PATCH", `/api/analytics/dashboards/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboards", id] }); queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboards"] }); },
  });

  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const generateNarrative = async () => {
    setGeneratingNarrative(true);
    try {
      await fetch(`/api/analytics/dashboards/${id}/narrative`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboards", id] });
    } catch { toast({ title: "Failed to generate narrative", variant: "destructive" }); }
    finally { setGeneratingNarrative(false); }
  };

  const [sendingChat, setSendingChat] = useState(false);
  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setSendingChat(true);
    setChatInput("");
    try {
      await apiRequest("POST", `/api/analytics/dashboards/${id}/chat`, { content: msg });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboards", id] });
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch { toast({ title: "Failed to send message", variant: "destructive" }); }
    finally { setSendingChat(false); }
  };

  const handleRefreshUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      const res = await fetch(`/api/analytics/dashboards/${id}/upload`, { method: "POST", body: fd });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Upload failed", description: result?.message || "An unexpected error occurred.", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboards", id] });
      setUploadFile(null);
      setFilterCol(""); setFilterVal("");
      const rowCount: number = result?.rowCount ?? 0;
      const errors: { row: number; column: string; message: string }[] = result?.errors ?? [];
      if (errors.length > 0) {
        const sample = errors.slice(0, 5).map(e => `Row ${e.row}: ${e.column} — ${e.message}`).join("\n");
        toast({
          title: `Uploaded with ${errors.length} row warning${errors.length > 1 ? "s" : ""}`,
          description: `${rowCount} rows read. Issues found:\n${sample}${errors.length > 5 ? `\n…and ${errors.length - 5} more` : ""}`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Data refreshed successfully", description: `${rowCount} rows processed` });
      }
    } catch { toast({ title: "Upload failed", description: "Could not connect to the server.", variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const handleRefreshCharts = async () => {
    setRefreshing(true);
    try {
      await fetch(`/api/analytics/dashboards/${id}/regenerate`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboards", id] });
      setFilterCol(""); setFilterVal("");
      toast({ title: "Charts refreshed", description: "All widgets updated from latest uploaded data." });
    } catch { toast({ title: "Refresh failed", variant: "destructive" }); }
    finally { setRefreshing(false); }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dash?.chat?.length]);

  if (isLoading) return (
    <div className="p-5 space-y-4 h-full overflow-auto">
      <div className="h-10 bg-muted/40 rounded-xl animate-pulse w-48" />
      <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted/40 rounded-xl animate-pulse" />)}</div>
      <div className="h-64 bg-muted/40 rounded-xl animate-pulse" />
    </div>
  );

  if (!dash) return (
    <div className="p-8 text-center">
      <p className="text-muted-foreground">Dashboard not found.</p>
      <Link href="/analytics"><Button variant="ghost" className="mt-2">Back to Analytics Studio</Button></Link>
    </div>
  );

  // ── Filter & active widget derivation ──────────────────────────────────────
  const rawRows = (dash.uploads?.[0]?.data || []) as Record<string, unknown>[];
  const allCols = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
  const numericOnly = allCols.filter(c => rawRows.every(r => r[c] !== null && r[c] !== "" && !isNaN(Number(r[c]))));
  const categoryCols = allCols.filter(c => !numericOnly.includes(c));
  const colValues = filterCol
    ? [...new Set(rawRows.map(r => String(r[filterCol] ?? "")).filter(Boolean))].sort()
    : [];
  const filteredRows = (filterCol && filterVal)
    ? rawRows.filter(r => String(r[filterCol] ?? "") === filterVal)
    : rawRows;
  const filterActive = !!(filterCol && filterVal);
  // When filter active, compute widgets client-side from filtered data
  const activeWidgets: AnalyticsDashboardWidget[] = filterActive && filteredRows.length > 0
    ? (buildClientWidgets(filteredRows) as unknown as AnalyticsDashboardWidget[])
    : dash.widgets;

  const kpiWidgets = activeWidgets.filter(w => w.widgetType === "kpi_card");
  const chartWidgets = activeWidgets.filter(w => ["bar_chart", "line_chart", "area_chart"].includes(w.widgetType));
  const comparisonWidgets = activeWidgets.filter(w => w.widgetType === "comparison_chart");
  const pieWidgets = activeWidgets.filter(w => w.widgetType === "pie_chart");
  const tableWidgets = activeWidgets.filter(w => w.widgetType === "table");
  const hasData = dash.widgets.length > 0;
  const latestUpload = dash.uploads?.[0];
  const VisIcon = dash.visibility === "company" ? Globe : dash.visibility === "department" ? Building2 : Lock;
  const isOwner = dash.createdBy === user?.id;

  const tabCls = (t: string) => `px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${activeTab === t ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="h-full overflow-auto">
      {focusedWidget && (
        <FocusModeOverlay widget={focusedWidget} onClose={() => setFocusedWidget(null)} />
      )}
      <div className="p-5 max-w-screen-xl mx-auto space-y-4">

        {/* Top bar */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <Link href="/analytics">
              <button className="flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-muted/50 transition-colors mt-0.5 shrink-0" data-testid="button-back-to-studio">
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black truncate" data-testid="text-dashboard-title">{dash.title}</h1>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  dash.status === "published" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" :
                  dash.status === "archived" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" :
                  "bg-muted text-muted-foreground border-border"
                }`}>{(dash.status || "draft").charAt(0).toUpperCase() + (dash.status || "draft").slice(1)}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap mt-0.5 text-[11px] text-muted-foreground">
                {dash.audience && <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{dash.audience}</span>}
                {dash.businessArea && <span>{dash.businessArea}</span>}
                <span className="flex items-center gap-1"><VisIcon className="h-3 w-3" />
                  {dash.visibility === "company" ? "Company-wide" : dash.visibility === "department" ? "Department" : "Private"}
                </span>
                {latestUpload && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Updated {new Date(latestUpload.uploadedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>}
              </div>
            </div>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2 shrink-0">
              <Select value={dash.visibility} onValueChange={v => updateMutation.mutate({ visibility: v })}>
                <SelectTrigger className="h-8 text-xs w-36" data-testid="select-dash-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="company">Company-wide</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" data-testid="button-dash-actions">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {dash.status !== "published" && (
                    <DropdownMenuItem onClick={() => updateMutation.mutate({ status: "published" })} className="gap-2" data-testid="menuitem-publish">
                      <Globe className="h-3.5 w-3.5 text-emerald-500" />Publish Dashboard
                    </DropdownMenuItem>
                  )}
                  {dash.status === "published" && (
                    <DropdownMenuItem onClick={() => updateMutation.mutate({ status: "draft" })} className="gap-2" data-testid="menuitem-unpublish">
                      <Lock className="h-3.5 w-3.5" />Unpublish
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => updateMutation.mutate({ status: "archived" })} className="gap-2" data-testid="menuitem-archive">
                    <Archive className="h-3.5 w-3.5 text-amber-500" />Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab("uploads")} className="gap-2">
                    <Upload className="h-3.5 w-3.5" />Upload New Data
                  </DropdownMenuItem>
                  {dash.uploads?.length > 0 && (
                    <DropdownMenuItem onClick={handleRefreshCharts} disabled={refreshing} className="gap-2">
                      <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />Refresh Charts from Data
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {dash.uploads?.length > 0 && (
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleRefreshCharts} disabled={refreshing} data-testid="button-refresh-charts">
                  {refreshing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Refreshing…</> : <><RefreshCw className="h-3.5 w-3.5" />Refresh Charts</>}
                </Button>
              )}
              {dash.status !== "published" && (
                <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => updateMutation.mutate({ status: "published" })} data-testid="button-publish-dashboard">
                  <Globe className="h-3.5 w-3.5" />Publish
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5 w-fit">
          <button className={tabCls("dashboard")} onClick={() => setActiveTab("dashboard")} data-testid="tab-dashboard">Dashboard</button>
          <button className={tabCls("narrative")} onClick={() => setActiveTab("narrative")} data-testid="tab-narrative">
            AI Narrative{dash.narrative ? <span className="ml-1 text-primary">•</span> : null}
          </button>
          <button className={tabCls("chat")} onClick={() => setActiveTab("chat")} data-testid="tab-chat">
            Chat{dash.chat?.length > 0 ? <span className="ml-1 text-xs text-muted-foreground">({dash.chat.length})</span> : null}
          </button>
          <button className={tabCls("uploads")} onClick={() => setActiveTab("uploads")} data-testid="tab-uploads">
            Data Uploads{dash.uploads?.length > 0 ? <span className="ml-1 text-xs text-muted-foreground">({dash.uploads.length})</span> : null}
          </button>
        </div>

        {/* ── Dashboard tab ── */}
        {activeTab === "dashboard" && (
          <div className="space-y-4">
            {!hasData ? (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                  <BarChart3 className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <p className="font-bold text-base mb-1">No data yet</p>
                <p className="text-sm text-muted-foreground mb-4 max-w-xs">Upload an Excel file to generate your dashboard widgets automatically.</p>
                <Button size="sm" onClick={() => setActiveTab("uploads")} className="gap-2" data-testid="button-go-upload">
                  <Upload className="h-4 w-4" />Upload Data
                </Button>
              </div>
            ) : (
              <>
                {/* ── Global filter bar ── */}
                {rawRows.length > 0 && categoryCols.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl border bg-muted/30" data-testid="dashboard-filter-bar">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Filter Dashboard
                    </div>
                    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                      <Select value={filterCol} onValueChange={v => { setFilterCol(v); setFilterVal(""); }} data-testid="select-filter-column">
                        <SelectTrigger className="h-7 text-xs w-44 bg-background">
                          <SelectValue placeholder="Select column…" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryCols.map(c => (
                            <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {filterCol && (
                        <Select value={filterVal} onValueChange={setFilterVal} data-testid="select-filter-value">
                          <SelectTrigger className="h-7 text-xs w-48 bg-background">
                            <SelectValue placeholder="Select value…" />
                          </SelectTrigger>
                          <SelectContent>
                            {colValues.map(v => (
                              <SelectItem key={v} value={v}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {filterActive && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold border border-primary/20">
                            {filteredRows.length} rows · {filterCol.replace(/_/g, " ")} = {filterVal}
                          </span>
                          <button
                            onClick={() => { setFilterCol(""); setFilterVal(""); }}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-muted hover:bg-muted/70 transition-colors"
                            data-testid="button-clear-filter"
                          >
                            <XIcon className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* KPI cards */}
                {kpiWidgets.length > 0 && (
                  <div className={`grid gap-3 ${kpiWidgets.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : kpiWidgets.length === 3 ? "grid-cols-3" : kpiWidgets.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                    {kpiWidgets.map(w => <KpiCard key={w.id} widget={w} onFocus={() => setFocusedWidget(w)} />)}
                  </div>
                )}

                {/* Charts */}
                {chartWidgets.length > 0 && (
                  <div className={`grid gap-4 ${chartWidgets.length >= 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
                    {chartWidgets.map(w => <ChartWidget key={w.id} widget={w} onFocus={() => setFocusedWidget(w)} />)}
                  </div>
                )}

                {/* Year-over-Year / Month-on-Month comparison charts */}
                {comparisonWidgets.length > 0 && (
                  <div className="space-y-4">
                    {comparisonWidgets.map(w => <ComparisonWidget key={w.id} widget={w} onFocus={() => setFocusedWidget(w)} />)}
                  </div>
                )}

                {/* Pie charts */}
                {pieWidgets.length > 0 && (
                  <div className={`grid gap-4 ${pieWidgets.length >= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 max-w-sm"}`}>
                    {pieWidgets.map(w => <PieWidget key={w.id} widget={w} onFocus={() => setFocusedWidget(w)} />)}
                  </div>
                )}

                {/* Table */}
                {tableWidgets.map(w => <TableWidget key={w.id} widget={w} onFocus={() => setFocusedWidget(w)} />)}

                {/* Prompt to generate narrative */}
                {!dash.narrative && (
                  <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-bold">Generate AI Narrative</p>
                        <p className="text-xs text-muted-foreground">Get an executive summary, insights, and recommendations from your data.</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={generateNarrative} disabled={generatingNarrative} className="gap-2 shrink-0" data-testid="button-generate-narrative-inline">
                      {generatingNarrative ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</> : <><Sparkles className="h-3.5 w-3.5" />Generate</>}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Narrative tab ── */}
        {activeTab === "narrative" && (
          <div>
            {!hasData ? (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed">
                <Sparkles className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Upload data first, then generate an AI narrative.</p>
                <Button size="sm" onClick={() => setActiveTab("uploads")} variant="ghost" className="mt-2">Upload Data</Button>
              </div>
            ) : (
              <NarrativePanel narrative={dash.narrative} onGenerate={generateNarrative} isGenerating={generatingNarrative} />
            )}
          </div>
        )}

        {/* ── Chat tab ── */}
        {activeTab === "chat" && (
          <div className="space-y-3">
            <div className="rounded-xl border bg-card overflow-hidden flex flex-col" style={{ height: "460px" }}>
              <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center gap-2 shrink-0">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold">AI Refinement Chat</span>
                <span className="text-xs text-muted-foreground">Ask for changes, insights, or explanations</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="chat-messages">
                {dash.chat.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-2 opacity-60">
                    <Sparkles className="h-8 w-8 text-primary/50" />
                    <p className="text-sm font-medium">Start a conversation</p>
                    <p className="text-xs text-muted-foreground max-w-xs">Ask to change chart types, add filters, explain specific numbers, or rewrite the narrative.</p>
                    <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                      {["Show top 5 by revenue", "Explain the biggest drop", "What are the main trends?", "Compare this month vs last"].map(s => (
                        <button key={s} onClick={() => setChatInput(s)} className="text-[11px] bg-muted/50 hover:bg-muted px-2.5 py-1 rounded-full border transition-colors">{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {dash.chat.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`chat-msg-${msg.id}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted/60 text-foreground rounded-bl-sm"
                    }`}>
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sparkles className="h-3 w-3 text-primary" />
                          <span className="text-[10px] font-semibold text-primary">AI Assistant</span>
                        </div>
                      )}
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {sendingChat && (
                  <div className="flex justify-start">
                    <div className="bg-muted/60 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">AI is thinking…</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="px-4 py-3 border-t bg-background/50 shrink-0">
                <div className="flex gap-2">
                  <Textarea
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                    placeholder="Ask for changes or insights… (Enter to send)"
                    className="resize-none min-h-0 h-9 py-2 text-sm"
                    rows={1}
                    data-testid="input-chat-message"
                    disabled={!hasData}
                  />
                  <Button size="sm" onClick={sendChat} disabled={sendingChat || !chatInput.trim() || !hasData} className="h-9 px-3 shrink-0" data-testid="button-send-chat">
                    {sendingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                {!hasData && <p className="text-[10px] text-muted-foreground mt-1">Upload data first to enable the chat.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── Uploads tab ── */}
        {activeTab === "uploads" && (
          <div className="space-y-4">
            {/* Upload zone */}
            {isOwner && (
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div>
                  <h3 className="font-bold text-sm mb-0.5">{dash.uploads?.length > 0 ? "Refresh Data" : "Upload Data"}</h3>
                  <p className="text-xs text-muted-foreground">
                    {dash.uploads?.length > 0
                      ? "Upload an updated version of your Excel template to refresh all charts and regenerate the narrative."
                      : "Upload your filled Excel template to generate the dashboard."
                    }
                  </p>
                </div>
                <label htmlFor="refresh-upload" className={`flex items-center gap-3 rounded-xl border-2 border-dashed p-4 cursor-pointer transition-colors ${uploadFile ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/20"}`} data-testid="label-refresh-upload-zone">
                  {uploadFile ? <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" /> : <Upload className="h-5 w-5 text-muted-foreground shrink-0" />}
                  <div>
                    {uploadFile ? (
                      <p className="text-sm font-semibold text-primary">{uploadFile.name}</p>
                    ) : (
                      <p className="text-sm font-medium">Click to select Excel file</p>
                    )}
                    <p className="text-xs text-muted-foreground">.xlsx or .xls · up to 10MB</p>
                  </div>
                  <input id="refresh-upload" type="file" accept=".xlsx,.xls" className="hidden" onChange={e => setUploadFile(e.target.files?.[0] || null)} data-testid="input-refresh-file" />
                </label>
                {uploadFile && (
                  <Button onClick={handleRefreshUpload} disabled={uploading} className="w-full gap-2" data-testid="button-refresh-upload">
                    {uploading ? <><Loader2 className="h-4 w-4 animate-spin" />Processing…</> : <><RefreshCw className="h-4 w-4" />Upload & Refresh Dashboard</>}
                  </Button>
                )}
              </div>
            )}

            {/* Upload history */}
            {dash.uploads?.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Upload History</p>
                {dash.uploads.map((u, i) => (
                  <div key={u.id} className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3" data-testid={`upload-history-${u.id}`}>
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{u.fileName}</p>
                      <p className="text-xs text-muted-foreground">{u.rowCount} rows · {new Date(u.uploadedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {i === 0 && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Latest</span>}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.validationStatus === "valid" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                        {u.validationStatus === "valid" ? <Check className="h-2.5 w-2.5" /> : null}{u.validationStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !isOwner && (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed">
                  <Upload className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No data uploads yet.</p>
                </div>
              )
            )}
          </div>
        )}

      </div>
    </div>
  );
}
