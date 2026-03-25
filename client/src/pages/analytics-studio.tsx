import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, Plus, Search, Trash2, Globe, Lock, Building2,
  Clock, Layers, Upload, Sparkles, ChevronRight, Database,
  Lightbulb, LayoutDashboard, FileSpreadsheet, TrendingUp,
  BookMarked, Eye, AlertTriangle, ArrowRight,
} from "lucide-react";
import type { AnalyticsDataset, AnalyticsInsight, AnalyticsDashboardDefinition } from "@shared/schema";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CHART_TYPE_LABEL: Record<string, string> = { kpi: "KPI Card", bar: "Bar Chart", line: "Line Chart", pie: "Pie Chart", table: "Table" };
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  published: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  archived: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  active: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
};

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function DatasetCard({ ds, onDelete }: { ds: AnalyticsDataset; onDelete: (id: number) => void }) {
  return (
    <div className="group relative rounded-xl border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden" data-testid={`card-dataset-${ds.id}`}>
      <div className="h-[3px] bg-gradient-to-r from-blue-500 to-blue-400" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 shrink-0">
              <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm leading-tight truncate" data-testid={`text-dataset-name-${ds.id}`}>{ds.name}</h3>
              <p className="text-[11px] text-muted-foreground">{ds.rowCount?.toLocaleString()} rows · {ds.fileName}</p>
            </div>
          </div>
          <button onClick={(e) => { e.preventDefault(); onDelete(ds.id); }} className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded-md hover:bg-red-500/10 hover:text-red-500 transition-all shrink-0" data-testid={`button-delete-dataset-${ds.id}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {ds.description && <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{ds.description}</p>}
        <p className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1"><Clock className="h-2.5 w-2.5" />Updated {fmtDate(ds.updatedAt)}</p>
        <div className="flex gap-2">
          <Link href={`/analytics/datasets/${ds.id}/explore`} className="flex-1">
            <Button variant="default" size="sm" className="w-full h-7 text-xs gap-1.5" data-testid={`button-explore-dataset-${ds.id}`}>
              <Sparkles className="h-3 w-3" /> Explore
            </Button>
          </Link>
          <Link href={`/analytics/datasets/${ds.id}/configure`}>
            <Button variant="outline" size="sm" className="h-7 text-xs" data-testid={`button-configure-dataset-${ds.id}`}>Configure</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ insight, onDelete }: { insight: AnalyticsInsight; onDelete: (id: number) => void }) {
  const chartLabel = CHART_TYPE_LABEL[insight.chartType] || insight.chartType;
  return (
    <div className="group relative rounded-xl border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden" data-testid={`card-insight-${insight.id}`}>
      <div className="h-[3px] bg-gradient-to-r from-purple-500 to-purple-400" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 shrink-0">
              <Lightbulb className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm leading-tight truncate">{insight.title}</h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${STATUS_COLORS[insight.status || "draft"]}`}>{insight.status || "draft"}</span>
                <span className="text-[10px] text-muted-foreground">{chartLabel}</span>
              </div>
            </div>
          </div>
          <button onClick={(e) => { e.preventDefault(); onDelete(insight.id); }} className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded-md hover:bg-red-500/10 hover:text-red-500 transition-all shrink-0">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 italic">"{insight.question}"</p>
        {insight.narrative && <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{insight.narrative}</p>}
        <Link href={`/analytics/datasets/${insight.datasetId}/explore?insight=${insight.id}`}>
          <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5">
            View Insight <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function DashboardCard({ def, onDelete }: { def: AnalyticsDashboardDefinition; onDelete: (id: number) => void }) {
  const VisIcon = def.visibility === "company" ? Globe : def.visibility === "department" ? Building2 : Lock;
  return (
    <div className="group relative rounded-xl border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden" data-testid={`card-definition-${def.id}`}>
      <div className={`h-[3px] ${def.status === "published" ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-primary to-primary/60"}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <LayoutDashboard className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm leading-tight truncate">{def.title}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${STATUS_COLORS[def.status || "draft"]}`}>{def.status}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><VisIcon className="h-2.5 w-2.5" />{def.visibility}</span>
              </div>
            </div>
          </div>
          <button onClick={(e) => { e.preventDefault(); onDelete(def.id); }} className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded-md hover:bg-red-500/10 hover:text-red-500 transition-all shrink-0">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {def.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{def.description}</p>}
        <p className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1"><Clock className="h-2.5 w-2.5" />Updated {fmtDate(def.updatedAt)}</p>
        <Link href={`/analytics/dashboards/${def.id}`}>
          <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5" data-testid={`button-open-def-${def.id}`}>
            Open Dashboard <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

type Tab = "datasets" | "insights" | "dashboards";

export default function AnalyticsStudioPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("datasets");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ type: "dataset" | "insight" | "definition"; id: number } | null>(null);

  const { data: datasets = [], isLoading: loadingDS } = useQuery<AnalyticsDataset[]>({ queryKey: ["/api/v2/analytics/datasets"] });
  const { data: insights = [], isLoading: loadingIns } = useQuery<AnalyticsInsight[]>({ queryKey: ["/api/v2/analytics/insights"] });
  const { data: definitions = [], isLoading: loadingDef } = useQuery<AnalyticsDashboardDefinition[]>({ queryKey: ["/api/v2/analytics/definitions"] });

  const deleteDatasetMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/v2/analytics/datasets/${id}`).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/datasets"] }); toast({ title: "Dataset deleted" }); },
  });
  const deleteInsightMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/v2/analytics/insights/${id}`).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/insights"] }); toast({ title: "Insight deleted" }); },
  });
  const deleteDefMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/v2/analytics/definitions/${id}`).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions"] }); toast({ title: "Dashboard deleted" }); },
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "dataset") deleteDatasetMutation.mutate(deleteTarget.id);
    else if (deleteTarget.type === "insight") deleteInsightMutation.mutate(deleteTarget.id);
    else deleteDefMutation.mutate(deleteTarget.id);
    setDeleteTarget(null);
  };

  const q = search.toLowerCase();
  const filteredDS = datasets.filter(d => !q || d.name.toLowerCase().includes(q));
  const filteredIns = insights.filter(i => !q || i.title.toLowerCase().includes(q) || i.question.toLowerCase().includes(q));
  const filteredDef = definitions.filter(d => !q || d.title.toLowerCase().includes(q));

  const tabCls = (t: Tab) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tab === t ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`;

  const stats = [
    { label: "Datasets", value: datasets.length, icon: Database, color: "text-blue-600 dark:text-blue-400" },
    { label: "My Insights", value: insights.filter(i => i.createdBy === user?.id).length, icon: Lightbulb, color: "text-purple-600 dark:text-purple-400" },
    { label: "Dashboards", value: definitions.length, icon: LayoutDashboard, color: "text-primary" },
    { label: "Published", value: definitions.filter(d => d.status === "published").length, icon: Globe, color: "text-emerald-600 dark:text-emerald-400" },
  ];

  const isLoading = loadingDS || loadingIns || loadingDef;

  return (
    <div className="h-full overflow-auto">
      <div className="p-5 max-w-screen-xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">Analytics Studio</h1>
              <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">BETA</span>
            </div>
            <p className="text-sm text-muted-foreground">Upload data, ask questions, build insights, publish dashboards.</p>
          </div>
          <Button onClick={() => navigate("/analytics/upload")} className="gap-2 shrink-0" data-testid="button-upload-dataset">
            <Upload className="h-4 w-4" /> Upload Dataset
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
              <s.icon className={`h-5 w-5 shrink-0 ${s.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Onboarding banner */}
        {datasets.length === 0 && !isLoading && (
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm">Get started — upload your data</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {[
                  { icon: Upload, step: "1", title: "Upload Data", desc: "Drop your Excel file to get started instantly" },
                  { icon: Database, step: "2", title: "Configure", desc: "Classify columns as dimensions, measures, or dates" },
                  { icon: Sparkles, step: "3", title: "Ask Questions", desc: "Type a question, get the best-fit chart automatically" },
                  { icon: LayoutDashboard, step: "4", title: "Build & Publish", desc: "Pin insights to a dashboard and share with your team" },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <item.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{item.step}. {item.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={() => navigate("/analytics/upload")} className="gap-2" size="sm">
                <Upload className="h-3.5 w-3.5" /> Upload Your First Dataset <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs + search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5">
            <button className={tabCls("datasets")} onClick={() => setTab("datasets")} data-testid="tab-datasets">
              <Database className="h-3.5 w-3.5" /> Datasets <span className="ml-0.5 text-[10px] bg-muted rounded-full px-1.5 font-normal">{datasets.length}</span>
            </button>
            <button className={tabCls("insights")} onClick={() => setTab("insights")} data-testid="tab-insights">
              <Lightbulb className="h-3.5 w-3.5" /> Insights <span className="ml-0.5 text-[10px] bg-muted rounded-full px-1.5 font-normal">{insights.length}</span>
            </button>
            <button className={tabCls("dashboards")} onClick={() => setTab("dashboards")} data-testid="tab-dashboards">
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboards <span className="ml-0.5 text-[10px] bg-muted rounded-full px-1.5 font-normal">{definitions.length}</span>
            </button>
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-8 h-8 text-sm" data-testid="input-search" />
          </div>
          {tab === "dashboards" && (
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => navigate("/analytics/dashboards/new")} data-testid="button-new-dashboard">
              <Plus className="h-3.5 w-3.5" /> New Dashboard
            </Button>
          )}
        </div>

        {/* Content grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-muted/40 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tab === "datasets" && (
              filteredDS.length > 0 ? filteredDS.map(ds => (
                <DatasetCard key={ds.id} ds={ds} onDelete={id => setDeleteTarget({ type: "dataset", id })} />
              )) : (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10 mb-4">
                    <FileSpreadsheet className="h-7 w-7 text-primary/50" />
                  </div>
                  <p className="text-base font-semibold mb-1">No datasets yet</p>
                  <p className="text-sm text-muted-foreground max-w-xs mb-4">Upload an Excel or CSV file to start exploring your data.</p>
                  <Button onClick={() => navigate("/analytics/upload")} className="gap-2" size="sm">
                    <Upload className="h-3.5 w-3.5" /> Upload Dataset
                  </Button>
                </div>
              )
            )}
            {tab === "insights" && (
              filteredIns.length > 0 ? filteredIns.map(ins => (
                <InsightCard key={ins.id} insight={ins} onDelete={id => setDeleteTarget({ type: "insight", id })} />
              )) : (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10 mb-4">
                    <Lightbulb className="h-7 w-7 text-primary/50" />
                  </div>
                  <p className="text-base font-semibold mb-1">No saved insights yet</p>
                  <p className="text-sm text-muted-foreground max-w-xs mb-4">Ask questions about your datasets to generate and save insights.</p>
                  {datasets.length > 0 && (
                    <Link href={`/analytics/datasets/${datasets[0].id}/explore`}>
                      <Button className="gap-2" size="sm"><Sparkles className="h-3.5 w-3.5" /> Explore a Dataset</Button>
                    </Link>
                  )}
                </div>
              )
            )}
            {tab === "dashboards" && (
              filteredDef.length > 0 ? filteredDef.map(d => (
                <DashboardCard key={d.id} def={d} onDelete={id => setDeleteTarget({ type: "definition", id })} />
              )) : (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10 mb-4">
                    <LayoutDashboard className="h-7 w-7 text-primary/50" />
                  </div>
                  <p className="text-base font-semibold mb-1">No dashboards yet</p>
                  <p className="text-sm text-muted-foreground max-w-xs mb-4">Create a dashboard and pin your saved insights to it.</p>
                  <Button onClick={() => navigate("/analytics/dashboards/new")} className="gap-2" size="sm">
                    <Plus className="h-3.5 w-3.5" /> Create Dashboard
                  </Button>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this {deleteTarget?.type} and all associated data. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
