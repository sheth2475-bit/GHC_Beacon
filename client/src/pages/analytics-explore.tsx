import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Sparkles, Loader2, Send, Save, Pin, BarChart2,
  TrendingUp, PieChart, Table2, Hash, AlignLeft, Calendar,
  RefreshCw, Lightbulb, BookMarked, LayoutDashboard, ChevronRight,
  CheckCircle2, X, Plus, ArrowRight,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import type { AnalyticsDataset, AnalyticsDatasetColumn, AnalyticsInsight, AnalyticsAutoInsight, AnalyticsDashboardDefinition } from "@shared/schema";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FullDataset = AnalyticsDataset & {
  columns: AnalyticsDatasetColumn[];
  insights: AnalyticsInsight[];
  autoInsights: AnalyticsAutoInsight[];
};

type AskResult = {
  title: string;
  interpretation: string;
  chartType: string;
  chartConfig: Record<string, unknown>;
  narrative: string;
  suggestedQuestions: string[];
  question: string;
};

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#84cc16"];

function formatValue(v: number, format = "number") {
  if (format === "currency") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" }).format(v);
  if (format === "percentage") return `${v.toFixed(1)}%`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2);
}

function KpiChart({ data }: { data: { value: number; label: string; count: number } }) {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="text-5xl font-black tabular-nums text-foreground mb-1">{formatValue(data.value)}</div>
      <p className="text-sm text-muted-foreground">{data.label}</p>
      <p className="text-xs text-muted-foreground/60 mt-1">{data.count?.toLocaleString()} data points</p>
    </div>
  );
}

function BarChartWidget({ cfg }: { cfg: { data: { name: string; value: number }[]; measureLabel?: string } }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={cfg.data} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatValue(v)} />
        <Tooltip formatter={v => [formatValue(Number(v)), cfg.measureLabel || "Value"]} />
        <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartWidget({ cfg }: { cfg: { data: { name: string; value: number }[]; measureLabel?: string } }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={cfg.data} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
        <defs>
          <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.2} />
            <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatValue(v)} />
        <Tooltip formatter={v => [formatValue(Number(v)), cfg.measureLabel || "Value"]} />
        <Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} fill="url(#colorVal)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function PieChartWidget({ cfg }: { cfg: { data: { name: string; value: number }[] } }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RechartPie>
        <Pie data={cfg.data} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
          {cfg.data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={v => [formatValue(Number(v)), "Value"]} />
      </RechartPie>
    </ResponsiveContainer>
  );
}

function TableWidget({ cfg }: { cfg: { rows: Record<string, unknown>[]; columns: string[] } }) {
  return (
    <div className="overflow-auto max-h-64 rounded-lg border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 sticky top-0">
          <tr>{cfg.columns.map(c => <th key={c} className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {cfg.rows.map((row, i) => (
            <tr key={i} className="hover:bg-muted/20">
              {cfg.columns.map(c => <td key={c} className="px-3 py-1.5 whitespace-nowrap">{String(row[c] ?? "—")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsightChart({ result }: { result: AskResult }) {
  const { chartType, chartConfig } = result;
  if (!chartConfig) return null;
  const data = chartConfig.data as Record<string, unknown>;

  if (chartType === "kpi" && data) return <KpiChart data={data as { value: number; label: string; count: number }} />;
  if (chartType === "bar") return <BarChartWidget cfg={data as { data: { name: string; value: number }[]; measureLabel?: string }} />;
  if (chartType === "line") return <LineChartWidget cfg={data as { data: { name: string; value: number }[]; measureLabel?: string }} />;
  if (chartType === "pie") return <PieChartWidget cfg={data as { data: { name: string; value: number }[] }} />;
  if (chartType === "table") return <TableWidget cfg={data as { rows: Record<string, unknown>[]; columns: string[] }} />;
  return null;
}

const CHART_TYPE_OPTIONS = [
  { value: "kpi", label: "KPI Card", Icon: Hash },
  { value: "bar", label: "Bar Chart", Icon: BarChart2 },
  { value: "line", label: "Line Chart", Icon: TrendingUp },
  { value: "pie", label: "Pie Chart", Icon: PieChart },
  { value: "table", label: "Table", Icon: Table2 },
];

export default function AnalyticsExplorePage() {
  const [, params] = useRoute("/analytics/datasets/:id/explore");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const id = Number(params?.id);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: ds, isLoading } = useQuery<FullDataset>({
    queryKey: ["/api/v2/analytics/datasets", id],
    queryFn: () => fetch(`/api/v2/analytics/datasets/${id}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: definitions = [] } = useQuery<AnalyticsDashboardDefinition[]>({ queryKey: ["/api/v2/analytics/definitions"] });

  const [question, setQuestion] = useState("");
  const [chartOverride, setChartOverride] = useState<string>("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [history, setHistory] = useState<AskResult[]>([]);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [selectedDashId, setSelectedDashId] = useState<string>("");
  const [newDashName, setNewDashName] = useState("");
  const [savedInsightId, setSavedInsightId] = useState<number | null>(null);

  const askMutation = useMutation({
    mutationFn: (q: string) => apiRequest("POST", `/api/v2/analytics/datasets/${id}/ask`, {
      question: q,
      chartTypeOverride: chartOverride || undefined,
    }).then(r => r.json()),
    onSuccess: (data: AskResult) => {
      setResult(data);
      setHistory(prev => [data, ...prev.slice(0, 9)]);
      setSavedInsightId(null);
    },
    onError: () => toast({ title: "Analysis failed", description: "Could not generate insight. Please try again.", variant: "destructive" }),
  });

  const autoInsightsMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/v2/analytics/datasets/${id}/auto-insights`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/datasets", id] });
      toast({ title: "AI suggestions generated!" });
    },
  });

  const saveInsightMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/v2/analytics/insights", {
      datasetId: id,
      title: result?.title,
      question: result?.question,
      interpretation: result?.interpretation,
      chartType: result?.chartType,
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
      const items = await apiRequest("GET", `/api/v2/analytics/definitions/${dashId}`).then(r => r.json());
      return apiRequest("POST", `/api/v2/analytics/definitions/${dashId}/items`, {
        insightId, position: (items.items?.length || 0),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions"] });
      toast({ title: "Insight pinned to dashboard!" });
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
      toast({ title: "Dashboard created and insight pinned!" });
      setPinDialogOpen(false);
      navigate(`/analytics/dashboards/${dash.id}`);
    },
  });

  const handleAsk = () => {
    if (!question.trim()) return;
    askMutation.mutate(question.trim());
  };

  const handleSuggestionClick = (q: string) => {
    setQuestion(q);
    askMutation.mutate(q);
  };

  const handlePinConfirm = async () => {
    const insightId = savedInsightId || (await saveInsightMutation.mutateAsync()).id;
    if (selectedDashId === "new") {
      if (!newDashName.trim()) return;
      createDashAndPinMutation.mutate({ insightId, name: newDashName });
    } else if (selectedDashId) {
      pinInsightMutation.mutate({ insightId, dashId: Number(selectedDashId) });
    }
  };

  const measures = ds?.columns.filter(c => c.columnType === "measure") || [];
  const dimensions = ds?.columns.filter(c => c.columnType === "dimension") || [];
  const dates = ds?.columns.filter(c => c.columnType === "date") || [];

  if (isLoading || !ds) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="flex flex-col h-full min-h-0">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b bg-background/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/analytics")} className="gap-1.5 h-8 text-muted-foreground" data-testid="button-back">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="h-4 w-px bg-border" />
            <div>
              <p className="text-sm font-bold leading-none">{ds.name}</p>
              <p className="text-[10px] text-muted-foreground">{ds.rowCount?.toLocaleString()} rows</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => navigate(`/analytics/datasets/${id}/configure`)} data-testid="button-configure">
              Configure Columns
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => autoInsightsMutation.mutate()} disabled={autoInsightsMutation.isPending} data-testid="button-auto-insights">
              {autoInsightsMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Suggest Insights
            </Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left panel: Field explorer */}
          <div className="w-52 shrink-0 border-r overflow-y-auto p-3 space-y-4 hidden lg:block">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Measures</p>
              <div className="space-y-1">
                {measures.length === 0 && <p className="text-[11px] text-muted-foreground/60">None configured</p>}
                {measures.map(c => (
                  <button key={c.id} onClick={() => { setQuestion(`Total ${c.label}`); inputRef.current?.focus(); }}
                    className="w-full text-left flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/40 text-xs transition-colors" data-testid={`field-measure-${c.id}`}>
                    <Hash className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{c.label}</span>
                    <span className="ml-auto text-[9px] text-muted-foreground/60">{c.aggregation}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Dimensions</p>
              <div className="space-y-1">
                {dimensions.length === 0 && <p className="text-[11px] text-muted-foreground/60">None configured</p>}
                {dimensions.map(c => (
                  <button key={c.id} onClick={() => { setQuestion(`${measures[0]?.label || "Value"} by ${c.label}`); inputRef.current?.focus(); }}
                    className="w-full text-left flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/40 text-xs transition-colors" data-testid={`field-dimension-${c.id}`}>
                    <AlignLeft className="h-3 w-3 text-blue-600 shrink-0" />
                    <span className="truncate">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {dates.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Dates</p>
                <div className="space-y-1">
                  {dates.map(c => (
                    <button key={c.id} onClick={() => { setQuestion(`${measures[0]?.label || "Value"} by ${c.label}`); inputRef.current?.focus(); }}
                      className="w-full text-left flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/40 text-xs transition-colors">
                      <Calendar className="h-3 w-3 text-amber-600 shrink-0" />
                      <span className="truncate">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Saved insights */}
            {ds.insights && ds.insights.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Saved Insights</p>
                <div className="space-y-1">
                  {ds.insights.slice(0, 8).map(ins => (
                    <button key={ins.id} onClick={() => { setQuestion(ins.question); askMutation.mutate(ins.question); }}
                      className="w-full text-left flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/40 text-xs transition-colors">
                      <Lightbulb className="h-3 w-3 text-purple-500 shrink-0" />
                      <span className="truncate">{ins.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Search bar */}
            <div className="flex gap-2 items-center">
              <div className="flex-1 flex gap-2 items-center rounded-xl border bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/30">
                <Sparkles className="h-4 w-4 text-primary/60 shrink-0" />
                <input
                  ref={inputRef}
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAsk()}
                  placeholder="Ask a question about your data…"
                  className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
                  data-testid="input-analytics-question"
                />
                {question && <button onClick={() => setQuestion("")} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
              </div>
              <Select value={chartOverride} onValueChange={setChartOverride}>
                <SelectTrigger className="w-36 h-10 text-xs" data-testid="select-chart-override">
                  <SelectValue placeholder="Auto chart" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto chart</SelectItem>
                  {CHART_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleAsk} disabled={!question.trim() || askMutation.isPending} className="h-10 px-4 gap-1.5" data-testid="button-ask">
                {askMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Ask</>}
              </Button>
            </div>

            {/* Suggested questions from auto-insights */}
            {!result && ds.autoInsights && ds.autoInsights.length > 0 && (
              <Card className="bg-muted/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-semibold">AI Suggested Questions</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ds.autoInsights.slice(0, 6).map(ai => {
                      const q = (ai.chartConfig as { suggestedQuestion?: string } | null)?.suggestedQuestion || ai.title;
                      return (
                        <button key={ai.id} onClick={() => handleSuggestionClick(q)}
                          className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-muted/40 hover:border-primary/40 transition-colors text-left"
                          data-testid={`suggestion-${ai.id}`}>
                          {ai.title}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Starter prompts when empty */}
            {!result && !askMutation.isPending && measures.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  measures[0] && `Total ${measures[0].label}`,
                  measures[0] && dimensions[0] && `${measures[0].label} by ${dimensions[0].label}`,
                  measures[0] && dates[0] && `${measures[0].label} over time`,
                  dimensions[0] && measures[0] && `Top 5 ${dimensions[0].label} by ${measures[0].label}`,
                  measures[0] && dimensions[1] && `${measures[0].label} by ${dimensions[1].label}`,
                  measures[1] && `Average ${measures[1].label}`,
                ].filter(Boolean).slice(0, 6).map((q, i) => (
                  <button key={i} onClick={() => handleSuggestionClick(q as string)}
                    className="text-left text-xs px-3 py-2 rounded-lg border bg-card hover:bg-muted/40 hover:border-primary/30 transition-all">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Loading */}
            {askMutation.isPending && (
              <Card className="border-primary/20">
                <CardContent className="p-6 flex flex-col items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                  </div>
                  <p className="text-sm font-semibold">Analyzing your data…</p>
                  <p className="text-xs text-muted-foreground">"{question}"</p>
                </CardContent>
              </Card>
            )}

            {/* Result */}
            {result && !askMutation.isPending && (
              <Card className="border-primary/20 overflow-hidden">
                <div className="h-[3px] bg-gradient-to-r from-primary to-primary/40" />
                <CardContent className="p-4">
                  {/* Result header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="font-bold text-base">{result.title}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5 italic">"{result.interpretation}"</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {CHART_TYPE_OPTIONS.find(o => o.value === result.chartType)?.label || result.chartType}
                      </Badge>
                      {savedInsightId ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                        </span>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => saveInsightMutation.mutate()} disabled={saveInsightMutation.isPending} data-testid="button-save-insight">
                          {saveInsightMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                        </Button>
                      )}
                      <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => { if (!savedInsightId) saveInsightMutation.mutate(); setPinDialogOpen(true); }} data-testid="button-pin-insight">
                        <Pin className="h-3 w-3" /> Pin to Dashboard
                      </Button>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="bg-muted/20 rounded-xl p-4 mb-4">
                    <InsightChart result={result} />
                  </div>

                  {/* Narrative */}
                  {result.narrative && (
                    <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 mb-4">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Lightbulb className="h-3.5 w-3.5 text-primary" />
                        <p className="text-xs font-semibold">AI Analysis</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{result.narrative}</p>
                    </div>
                  )}

                  {/* Follow-up suggestions */}
                  {result.suggestedQuestions?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Follow-up questions</p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.suggestedQuestions.map((q, i) => (
                          <button key={i} onClick={() => { setQuestion(q); askMutation.mutate(q); }}
                            className="text-xs px-2.5 py-1 rounded-full border bg-background hover:bg-muted/40 hover:border-primary/40 transition-colors"
                            data-testid={`followup-${i}`}>
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* History */}
            {history.length > 1 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Recent questions</p>
                <div className="space-y-1">
                  {history.slice(1, 6).map((h, i) => (
                    <button key={i} onClick={() => { setQuestion(h.question); askMutation.mutate(h.question); }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/30 transition-colors text-xs">
                      <RefreshCw className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate italic">"{h.question}"</span>
                      <span className="ml-auto text-muted-foreground/60 shrink-0">{h.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pin to Dashboard dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pin className="h-4 w-4 text-primary" /> Pin to Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Choose an existing dashboard or create a new one</p>
            <Select value={selectedDashId} onValueChange={setSelectedDashId} data-testid="select-pin-dashboard">
              <SelectTrigger>
                <SelectValue placeholder="Select dashboard…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">+ Create new dashboard</SelectItem>
                {definitions.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedDashId === "new" && (
              <Input value={newDashName} onChange={e => setNewDashName(e.target.value)} placeholder="Dashboard name…" data-testid="input-new-dashboard-name" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePinConfirm} disabled={!selectedDashId || (selectedDashId === "new" && !newDashName.trim()) || pinInsightMutation.isPending || createDashAndPinMutation.isPending} className="gap-1.5" data-testid="button-confirm-pin">
              {pinInsightMutation.isPending || createDashAndPinMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pin className="h-4 w-4" />} Pin Insight
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
