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
  Globe, Lock, Building2, Edit2, Save, CheckCircle2, Pin,
  TrendingUp, BarChart2, PieChart, Table2, Hash, X, ArrowUp, ArrowDown,
  AlertTriangle, Eye, Lightbulb, ChevronRight, Send,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import type { AnalyticsDashboardDefinition, AnalyticsDashboardItem, AnalyticsInsight } from "@shared/schema";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
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

function MiniChart({ insight }: { insight: AnalyticsInsight }) {
  const cfg = insight.chartConfig as Record<string, unknown> | null;
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

function InsightCard({ item, idx, total, onRemove, onMoveUp, onMoveDown }: {
  item: InsightFull; idx: number; total: number;
  onRemove: () => void; onMoveUp: () => void; onMoveDown: () => void;
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
        <MiniChart insight={item.insight} />
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
  const [generatingNarrative, setGeneratingNarrative] = useState(false);

  const { data: dash, isLoading } = useQuery<DashboardFull>({
    queryKey: ["/api/v2/analytics/definitions", id],
    queryFn: () => fetch(`/api/v2/analytics/definitions/${id}`, { credentials: "include" }).then(r => r.json()),
    enabled: !isNew && !!id,
  });

  const { data: allInsights = [] } = useQuery<AnalyticsInsight[]>({
    queryKey: ["/api/v2/analytics/insights"],
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

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: number[]) => apiRequest("POST", `/api/v2/analytics/definitions/${id}/reorder`, { orderedIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions", id] }),
  });

  const handleNarrative = async () => {
    setGeneratingNarrative(true);
    try {
      await apiRequest("POST", `/api/v2/analytics/definitions/${id}/narrative`);
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions", id] });
      toast({ title: "AI Narrative generated!" });
    } catch {
      toast({ title: "Narrative generation failed", variant: "destructive" });
    } finally {
      setGeneratingNarrative(false);
    }
  };

  const handleMoveUp = (idx: number) => {
    if (!dash) return;
    const items = [...dash.items];
    [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
    reorderMutation.mutate(items.map(i => i.id));
  };

  const handleMoveDown = (idx: number) => {
    if (!dash) return;
    const items = [...dash.items];
    [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
    reorderMutation.mutate(items.map(i => i.id));
  };

  const pinnedInsightIds = new Set(dash?.items.map(i => i.insightId) || []);
  const unpinnedInsights = allInsights.filter(i => !pinnedInsightIds.has(i.id));

  const VisIcon = dash?.visibility === "company" ? Globe : dash?.visibility === "department" ? Building2 : Lock;

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
    <div className="h-full overflow-auto">
      <div className="p-5 max-w-screen-xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
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
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleNarrative} disabled={generatingNarrative} data-testid="button-generate-narrative">
              {generatingNarrative ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} AI Narrative
            </Button>
            <Button size="sm" className="gap-1.5 h-8" onClick={() => setPublishDialog(true)} data-testid="button-publish">
              <Globe className="h-3.5 w-3.5" /> {dash.status === "published" ? "Update" : "Publish"}
            </Button>
          </div>
        </div>

        {/* AI Narrative */}
        {dash.narrativeSummary && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold">AI Executive Summary</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{dash.narrativeSummary}</p>
            </CardContent>
          </Card>
        )}

        {/* Insights grid */}
        {dash.items.length === 0 ? (
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
              <p className="text-sm font-semibold text-muted-foreground">{dash.items.length} insight{dash.items.length !== 1 ? "s" : ""}</p>
              <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setAddInsightDialog(true)} disabled={unpinnedInsights.length === 0} data-testid="button-add-more">
                <Plus className="h-3.5 w-3.5" /> Add Insight
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dash.items.map((item, idx) => (
                <InsightCard
                  key={item.id}
                  item={item}
                  idx={idx}
                  total={dash.items.length}
                  onRemove={() => setRemoveId(item.id)}
                  onMoveUp={() => handleMoveUp(idx)}
                  onMoveDown={() => handleMoveDown(idx)}
                />
              ))}
            </div>
          </>
        )}
      </div>

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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" /> Add Insight to Dashboard</DialogTitle>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto space-y-2 py-2">
            {unpinnedInsights.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No saved insights available. Create insights from the Explore screen first.</p>
            ) : (
              unpinnedInsights.map(ins => (
                <button key={ins.id} onClick={() => addItemMutation.mutate(ins.id)}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                  disabled={addItemMutation.isPending}
                  data-testid={`select-insight-${ins.id}`}>
                  <Lightbulb className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{ins.title}</p>
                    <p className="text-xs text-muted-foreground italic truncate">"{ins.question}"</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove confirm */}
      <AlertDialog open={removeId !== null} onOpenChange={() => setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Remove Insight</AlertDialogTitle>
            <AlertDialogDescription>Remove this insight from the dashboard? The insight itself will not be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (removeId) { removeItemMutation.mutate(removeId); setRemoveId(null); } }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
