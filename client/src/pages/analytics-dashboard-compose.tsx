import { useState } from "react";
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
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
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

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4"];

function formatValue(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2);
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
    const parsed = rawKey ? new Date(String(rawKey)) : null;
    if (parsed && !isNaN(parsed.getTime()) && String(rawKey).length >= 6) {
      key = parsed.toLocaleDateString("en-US", { month: "short", year: "numeric" });
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
    result.sort((a, b) => { const da = new Date(a.name), db = new Date(b.name); return !isNaN(da.getTime()) && !isNaN(db.getTime()) ? da.getTime() - db.getTime() : 0; });
  } else {
    result.sort((a, b) => b.value - a.value);
  }
  return result;
}

function computeFilteredData(rows: Record<string, unknown>[], insight: AnalyticsInsight): unknown {
  const cfg = insight.chartConfig as { measure?: string; dimension?: string | null; aggregation?: string; measureLabel?: string; dimensionLabel?: string } | null;
  if (!cfg?.measure) return null;
  const measure = cfg.measure;
  const dimension = cfg.dimension || null;
  const agg = cfg.aggregation || "sum";
  if (insight.chartType === "kpi") {
    const vals = rows.map(r => Number(r[measure])).filter(v => !isNaN(v));
    const value = agg === "avg" ? vals.reduce((a, b) => a + b, 0) / (vals.length || 1) : agg === "count" ? vals.length : agg === "min" ? Math.min(...vals) : agg === "max" ? Math.max(...vals) : vals.reduce((a, b) => a + b, 0);
    return { value: Math.round(value * 100) / 100, label: cfg.measureLabel || measure, count: vals.length };
  }
  const aggData = clientAggregateData(rows, measure, dimension, agg);
  return { data: aggData, xKey: "name", yKey: "value", measureLabel: cfg.measureLabel, dimensionLabel: cfg.dimensionLabel };
}

// ── Date Hierarchy Helpers ──────────────────────────────────────────────────
const QUARTERS: Record<string, string> = { Jan: "Q1", Feb: "Q1", Mar: "Q1", Apr: "Q2", May: "Q2", Jun: "Q2", Jul: "Q3", Aug: "Q3", Sep: "Q3", Oct: "Q4", Nov: "Q4", Dec: "Q4" };
const MONTH_ORDER: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

function parseDateParts(val: unknown): { year: string; quarter: string; month: string } | null {
  const d = new Date(String(val ?? ""));
  if (isNaN(d.getTime())) return null;
  const year = String(d.getFullYear());
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const q = `Q${Math.ceil((d.getMonth() + 1) / 3)}`;
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

function MiniChart({ insight, filteredData }: { insight: AnalyticsInsight; filteredData?: unknown }) {
  const baseCfg = insight.chartConfig as Record<string, unknown> | null;
  const cfg: Record<string, unknown> | null = filteredData != null ? { ...(baseCfg || {}), data: filteredData } : baseCfg;
  if (!cfg) return <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">No data</div>;
  const { chartType } = insight;
  const data = cfg.data as Record<string, unknown>;

  if (chartType === "kpi" && data) {
    const kpi = data as { value: number; label: string };
    return (
      <div className="flex flex-col items-center justify-center h-32">
        <div className="text-3xl font-black">{formatValue(kpi.value)}</div>
        <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
      </div>
    );
  }

  if ((chartType === "bar" || chartType === "line") && data) {
    const chartData = (data as { data?: { name: string; value: number }[] }).data || [];
    if (chartType === "bar") return (
      <ResponsiveContainer width="100%" height={128}>
        <BarChart data={chartData.slice(0, 8)} margin={{ top: 2, right: 2, left: -20, bottom: 20 }}>
          <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 8 }} tickFormatter={v => formatValue(v)} />
          <Tooltip formatter={v => [formatValue(Number(v)), ""]} contentStyle={{ fontSize: 10 }} />
          <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
    return (
      <ResponsiveContainer width="100%" height={128}>
        <AreaChart data={chartData.slice(0, 20)} margin={{ top: 2, right: 2, left: -20, bottom: 20 }}>
          <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 8 }} tickFormatter={v => formatValue(v)} />
          <Tooltip formatter={v => [formatValue(Number(v)), ""]} contentStyle={{ fontSize: 10 }} />
          <Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={1.5} fill={CHART_COLORS[0] + "20"} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "pie" && data) {
    const pieData = (data as { data?: { name: string; value: number }[] }).data || [];
    return (
      <ResponsiveContainer width="100%" height={128}>
        <RechartPie>
          <Pie data={pieData.slice(0, 8)} cx="50%" cy="50%" outerRadius={55} dataKey="value">
            {pieData.slice(0, 8).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={v => [formatValue(Number(v)), ""]} contentStyle={{ fontSize: 10 }} />
        </RechartPie>
      </ResponsiveContainer>
    );
  }

  if (chartType === "table" && data) {
    const tableData = data as { rows?: Record<string, unknown>[]; columns?: string[] };
    const rows = tableData.rows?.slice(0, 3) || [];
    const cols = tableData.columns?.slice(0, 3) || [];
    return (
      <div className="overflow-hidden rounded border">
        <table className="w-full text-[10px]">
          <thead className="bg-muted/50"><tr>{cols.map(c => <th key={c} className="px-2 py-1 text-left font-medium">{c}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{cols.map(c => <td key={c} className="px-2 py-1 truncate max-w-[80px]">{String(r[c] ?? "")}</td>)}</tr>)}</tbody>
        </table>
        {(tableData.rows?.length || 0) > 3 && <p className="text-[9px] text-center text-muted-foreground py-1">+{(tableData.rows?.length || 0) - 3} more rows</p>}
      </div>
    );
  }

  return <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">Preview unavailable</div>;
}

function InsightCard({ item, idx, total, onRemove, onMoveUp, onMoveDown, filteredData }: {
  item: InsightFull; idx: number; total: number;
  onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void;
  filteredData?: unknown;
}) {
  const chartLabel: Record<string, string> = { kpi: "KPI Card", bar: "Bar", line: "Line", pie: "Pie", table: "Table" };
  return (
    <div className="group rounded-xl border bg-card overflow-hidden hover:shadow-md transition-all" data-testid={`item-insight-${item.id}`}>
      <div className="h-[3px] bg-gradient-to-r from-purple-500 to-purple-400" />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h4 className="font-bold text-sm truncate">{item.titleOverride || item.insight.title}</h4>
            <span className="text-[10px] text-muted-foreground">{chartLabel[item.insight.chartType] || item.insight.chartType}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
            {idx > 0 && <button onClick={onMoveUp} className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted/60"><ArrowUp className="h-3 w-3" /></button>}
            {idx < total - 1 && <button onClick={onMoveDown} className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted/60"><ArrowDown className="h-3 w-3" /></button>}
            <button onClick={onRemove} className="h-5 w-5 flex items-center justify-center rounded hover:bg-red-500/10 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
          </div>
        </div>
        <MiniChart insight={item.insight} filteredData={filteredData} />
        {item.insight.narrative && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-2">{item.insight.narrative}</p>
        )}
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
  const [addInsightDialog, setAddInsightDialog] = useState(false);
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [deleteInsightId, setDeleteInsightId] = useState<number | null>(null);
  const [generatingNarrative, setGeneratingNarrative] = useState(false);
  const [narrativeOpen, setNarrativeOpen] = useState(false);
  const [filterPaneOpen, setFilterPaneOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [filterSearch, setFilterSearch] = useState<Record<string, string>>({});
  // Date hierarchy filter state: col → { years, quarters ("2023|Q1"), months ("2023|Jan") }
  type DateColFilter = { years: string[]; quarters: string[]; months: string[] };
  const [dateFilters, setDateFilters] = useState<Record<string, DateColFilter>>({});
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
  const dateColNames = new Set(datasetCols.filter(c => c.columnType === "date").map(c => c.columnName));
  const dateColLabels: Record<string, string> = Object.fromEntries(datasetCols.filter(c => c.columnType === "date").map(c => [c.columnName, c.label]));

  // Build date hierarchies
  const dateHierarchies: Record<string, DateHierarchy> = {};
  for (const col of dateColNames) {
    dateHierarchies[col] = buildDateHierarchy(rawRows, col);
  }

  // Detect categorical (non-numeric) columns — EXCLUDING date columns
  const categoryCols: string[] = rawRows.length
    ? Object.keys(rawRows[0]).filter(col => {
        if (dateColNames.has(col)) return false; // date columns handled separately
        const vals = rawRows.map(r => r[col]);
        const numericCount = vals.filter(v => v !== null && v !== "" && !isNaN(Number(v))).length;
        const unique = new Set(vals.map(v => String(v)));
        return numericCount / vals.length < 0.8 && unique.size >= 2 && unique.size <= 100;
      })
    : [];

  // Unique values per column (for checkboxes)
  const colValueMap: Record<string, string[]> = {};
  for (const col of categoryCols) {
    colValueMap[col] = [...new Set(rawRows.map(r => String(r[col] ?? "")).filter(Boolean))].sort();
  }

  // Apply all active filters (categorical AND date, AND logic across columns)
  const filteredRows: Record<string, unknown>[] = rawRows.filter(row => {
    // Categorical filters
    if (!Object.entries(activeFilters).every(([col, vals]) => vals.length === 0 || vals.includes(String(row[col] ?? "")))) return false;
    // Date hierarchy filters
    for (const [col, df] of Object.entries(dateFilters)) {
      const hasFilter = df.years.length > 0 || df.quarters.length > 0 || df.months.length > 0;
      if (!hasFilter) continue;
      const parts = parseDateParts(row[col]);
      if (!parts) return false;
      const passes = df.years.includes(parts.year) || df.quarters.includes(parts.quarter) || df.months.includes(parts.month);
      if (!passes) return false;
    }
    return true;
  });

  const activeDateFilterCount = Object.values(dateFilters).filter(df => df.years.length > 0 || df.quarters.length > 0 || df.months.length > 0).length;
  const isFiltered = Object.values(activeFilters).some(v => v.length > 0) || activeDateFilterCount > 0;
  const activeFilterCount = Object.values(activeFilters).filter(v => v.length > 0).length + activeDateFilterCount;

  // Categorical filter helpers
  const toggleFilterValue = (col: string, val: string) => {
    setActiveFilters(prev => {
      const curr = prev[col] || [];
      const next = curr.includes(val) ? curr.filter(v => v !== val) : [...curr, val];
      return { ...prev, [col]: next };
    });
  };
  const clearColFilter = (col: string) => setActiveFilters(prev => ({ ...prev, [col]: [] }));
  const clearAllFilters = () => { setActiveFilters({}); setDateFilters({}); };
  const toggleSection = (col: string) => setExpandedSections(prev => ({ ...prev, [col]: !prev[col] }));
  const isSectionExpanded = (col: string) => expandedSections[col] !== false; // default expanded

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
  const toggleDateYear_expand = (col: string, year: string) => setExpandedDateYears(prev => ({ ...prev, [col]: { ...(prev[col] || {}), [year]: !(prev[col]?.[year] ?? true) } }));
  const toggleDateQuarter_expand = (col: string, qKey: string) => setExpandedDateQuarters(prev => ({ ...prev, [col]: { ...(prev[col] || {}), [qKey]: !(prev[col]?.[qKey] ?? false) } }));
  const isDateYearExpanded = (col: string, year: string) => expandedDateYears[col]?.[year] !== false;
  const isDateQuarterExpanded = (col: string, qKey: string) => expandedDateQuarters[col]?.[qKey] === true;

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
              <Button size="sm" className="gap-1.5 h-8" onClick={() => setPublishDialog(true)} data-testid="button-publish">
                <Globe className="h-3.5 w-3.5" /> {dash.status === "published" ? "Update" : "Publish"}
              </Button>
            </div>
          </div>

          {/* Active filter summary bar */}
          {isFiltered && (
            <div className="flex flex-wrap items-center gap-2" data-testid="active-filter-summary">
              {Object.entries(activeFilters).filter(([, vals]) => vals.length > 0).map(([col, vals]) => (
                vals.map(val => (
                  <span key={`${col}-${val}`} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <span className="text-muted-foreground">{col}:</span> {val}
                    <button onClick={() => toggleFilterValue(col, val)} className="hover:text-primary/70 ml-0.5"><X className="h-2.5 w-2.5" /></button>
                  </span>
                ))
              ))}
              {Object.entries(dateFilters).flatMap(([col, df]) => {
                const label = dateColLabels[col] || col;
                const pills: JSX.Element[] = [];
                df.years.forEach(y => pills.push(
                  <span key={`${col}-y-${y}`} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                    <Calendar className="h-2.5 w-2.5" /><span className="text-muted-foreground">{label}:</span> {y}
                    <button onClick={() => toggleDateYear(col, y)} className="ml-0.5 hover:text-amber-500"><X className="h-2.5 w-2.5" /></button>
                  </span>
                ));
                df.quarters.forEach(qk => pills.push(
                  <span key={`${col}-q-${qk}`} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                    <Calendar className="h-2.5 w-2.5" /><span className="text-muted-foreground">{label}:</span> {qk.replace("|", " ")}
                    <button onClick={() => toggleDateQuarter(col, qk)} className="ml-0.5 hover:text-amber-500"><X className="h-2.5 w-2.5" /></button>
                  </span>
                ));
                df.months.forEach(mk => pills.push(
                  <span key={`${col}-m-${mk}`} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                    <Calendar className="h-2.5 w-2.5" /><span className="text-muted-foreground">{label}:</span> {mk.replace("|", " ")}
                    <button onClick={() => toggleDateMonth(col, mk)} className="ml-0.5 hover:text-amber-500"><X className="h-2.5 w-2.5" /></button>
                  </span>
                ));
                return pills;
              })}
              <span className="text-xs text-muted-foreground">{filteredRows.length} of {rawRows.length} rows</span>
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
                  const overrideData = isFiltered ? computeFilteredData(filteredRows, item.insight) : undefined;
                  return (
                    <InsightCard
                      key={item.id}
                      item={item}
                      idx={idx}
                      total={dash.items?.length ?? 0}
                      onRemove={() => setRemoveId(item.id)}
                      onMoveUp={() => handleMoveUp(idx)}
                      onMoveDown={() => handleMoveDown(idx)}
                      filteredData={overrideData}
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
          <div className="flex-1 overflow-y-auto p-3 space-y-1">

            {/* ── Date Hierarchy sections (Power BI style) ── */}
            {[...dateColNames].map(col => {
              const label = dateColLabels[col] || col;
              const hierarchy = dateHierarchies[col] || {};
              const df = dateFilters[col] || { years: [], quarters: [], months: [] };
              const activeDateCount = df.years.length + df.quarters.length + df.months.length;
              const sectionExpanded = isSectionExpanded(`__date__${col}`);

              return (
                <div key={`date-${col}`} className="rounded-lg border overflow-hidden" data-testid={`filter-section-date-${col}`}>
                  {/* Date section header */}
                  <button
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 transition-colors text-left"
                    onClick={() => toggleSection(`__date__${col}`)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span className="text-xs font-semibold truncate">{label}</span>
                      {activeDateCount > 0 && (
                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">{activeDateCount}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {activeDateCount > 0 && (
                        <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); clearDateColFilter(col); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); clearDateColFilter(col); }}} className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer">
                          <X className="h-3 w-3" />
                        </span>
                      )}
                      {sectionExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
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
                <div key={col} className="rounded-lg border overflow-hidden" data-testid={`filter-section-${col}`}>
                  {/* Section header */}
                  <button
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
                    onClick={() => toggleSection(col)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold truncate">{col}</span>
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
                          className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </span>
                      )}
                      {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
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
                            const rowCount = rawRows.filter(r => String(r[col] ?? "") === val).length;
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

          {/* Footer: row count */}
          <div className="px-4 py-2.5 border-t text-[11px] text-muted-foreground shrink-0">
            {isFiltered ? (
              <span className="text-foreground font-medium">{filteredRows.length} of {rawRows.length} rows match</span>
            ) : (
              <span>{rawRows.length} rows total</span>
            )}
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
