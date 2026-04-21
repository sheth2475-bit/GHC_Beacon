import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, Plus, Search, Trash2, Globe, Lock, Building2,
  Clock, Upload, Sparkles, ChevronRight, Database,
  Lightbulb, LayoutDashboard, FileSpreadsheet,
  AlertTriangle, ArrowRight, Play, MoreVertical, Eye,
} from "lucide-react";
import type { AnalyticsDataset, AnalyticsInsight, AnalyticsDashboardDefinition } from "@shared/schema";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CHART_TYPE_LABEL: Record<string, string> = {
  kpi: "KPI Card", bar: "Bar Chart", line: "Line Chart", pie: "Pie Chart",
  area: "Area Chart", donut: "Donut Chart", "horizontal-bar": "H-Bar", table: "Table",
};

const CHART_TYPE_COLOR: Record<string, string> = {
  kpi: "from-amber-500 to-orange-500",
  bar: "from-blue-500 to-blue-600",
  line: "from-violet-500 to-purple-600",
  pie: "from-pink-500 to-rose-500",
  area: "from-teal-500 to-emerald-600",
  donut: "from-indigo-500 to-blue-600",
  "horizontal-bar": "from-cyan-500 to-blue-500",
  table: "from-slate-500 to-gray-600",
};

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function freshnessTone(d: string | Date | null | undefined) {
  if (!d) return "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days <= 7) return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (days <= 30) return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
  return "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20";
}

// ── Dataset thumbnail card (YouTube style) ───────────────────────────────────
function DatasetThumbnail({ ds, onDelete }: { ds: AnalyticsDataset; onDelete: (id: number) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="group relative flex flex-col rounded-xl overflow-hidden bg-card border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200" data-testid={`card-dataset-${ds.id}`}>
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center border-b overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 19px,hsl(var(--border)) 19px,hsl(var(--border)) 20px),repeating-linear-gradient(90deg,transparent,transparent 19px,hsl(var(--border)) 19px,hsl(var(--border)) 20px)" }} />
        </div>
        <div className="relative flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Database className="h-5 w-5 text-blue-500" />
          </div>
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
            {ds.rowCount?.toLocaleString() ?? 0} rows
          </span>
        </div>
        {/* Hover overlay with play-like action */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Link href={`/analytics/datasets/${ds.id}/explore`}>
            <button className="flex items-center gap-1.5 bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full hover:bg-white/90 transition-colors" data-testid={`button-explore-dataset-${ds.id}`}>
              <Sparkles className="h-3.5 w-3.5" /> Explore
            </button>
          </Link>
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-start gap-2.5 p-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 shrink-0 mt-0.5">
          <FileSpreadsheet className="h-4 w-4 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight line-clamp-2 mb-1" data-testid={`text-dataset-name-${ds.id}`}>{ds.name}</p>
          <p className="text-[11px] text-muted-foreground">{ds.fileName}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="h-2.5 w-2.5" /> {fmtDate(ds.updatedAt)}
          </p>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen(v => !v)} className="opacity-0 group-hover:opacity-100 h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-all">
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border bg-card shadow-lg py-1">
              <Link href={`/analytics/datasets/${ds.id}/configure`}>
                <button className="w-full text-left text-xs px-3 py-1.5 hover:bg-muted" onClick={() => setMenuOpen(false)}>Configure</button>
              </Link>
              <button className="w-full text-left text-xs px-3 py-1.5 hover:bg-muted text-red-500" onClick={() => { onDelete(ds.id); setMenuOpen(false); }} data-testid={`button-delete-dataset-${ds.id}`}>Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Insight thumbnail card ────────────────────────────────────────────────────
function InsightThumbnail({ insight, onDelete }: { insight: AnalyticsInsight; onDelete: (id: number) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [, navigate] = useLocation();
  const gradient = CHART_TYPE_COLOR[insight.chartType] || "from-violet-500 to-purple-600";
  const chartLabel = CHART_TYPE_LABEL[insight.chartType] || insight.chartType;
  const href = `/analytics/datasets/${insight.datasetId}/explore?insightId=${insight.id}`;
  return (
    <div
      className="group relative flex flex-col rounded-xl overflow-hidden bg-card border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
      data-testid={`card-insight-${insight.id}`}
      onClick={() => navigate(href)}
    >
      {/* Thumbnail */}
      <div className={`relative aspect-video bg-gradient-to-br ${gradient} opacity-90 flex items-center justify-center border-b`}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 38L10 20L20 30L30 10L40 22' stroke='white' stroke-width='2' fill='none'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat-x", backgroundSize: "40px 40px" }} />
        <div className="relative flex flex-col items-center gap-1.5">
          <Lightbulb className="h-8 w-8 text-white/90" />
          <span className="text-[10px] font-bold text-white/90 bg-white/20 px-2 py-0.5 rounded-full">{chartLabel}</span>
        </div>
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="flex items-center gap-1.5 bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full">
            <Eye className="h-3.5 w-3.5" /> View
          </span>
        </div>
      </div>
      {/* Info */}
      <div className="flex items-start gap-2.5 p-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} bg-opacity-10 shrink-0 mt-0.5`}>
          <BarChart3 className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight line-clamp-2 mb-1">{insight.title}</p>
          <p className="text-[11px] text-muted-foreground line-clamp-1">{insight.question}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="h-2.5 w-2.5" /> {fmtDate(insight.createdAt)}
          </p>
        </div>
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button onClick={() => setMenuOpen(v => !v)} className="opacity-0 group-hover:opacity-100 h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-all">
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border bg-card shadow-lg py-1">
              <button className="w-full text-left text-xs px-3 py-1.5 hover:bg-muted text-red-500" onClick={() => { onDelete(insight.id); setMenuOpen(false); }}>Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard thumbnail card ──────────────────────────────────────────────────
function DashboardThumbnail({ def, onDelete }: { def: AnalyticsDashboardDefinition; onDelete: (id: number) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const VisIcon = def.visibility === "company" ? Globe : def.visibility === "department" ? Building2 : Lock;
  const isPublished = def.status === "published";
  return (
    <div className="group relative flex flex-col rounded-xl overflow-hidden bg-card border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200" data-testid={`card-definition-${def.id}`}>
      {/* Thumbnail */}
      <div className={`relative aspect-video flex items-center justify-center border-b overflow-hidden ${isPublished ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/10" : "bg-gradient-to-br from-primary/15 to-primary/5"}`}>
        <div className="absolute inset-0 opacity-10">
          {[...Array(3)].map((_, row) => (
            <div key={row} className="flex items-end gap-1 px-4 absolute bottom-4 w-full" style={{ bottom: row * 0 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`flex-1 rounded-t-sm ${isPublished ? "bg-emerald-500" : "bg-primary"}`}
                  style={{ height: `${20 + Math.sin(i * 1.2 + row) * 15 + 15}px`, opacity: 0.6 + i * 0.05 }} />
              ))}
            </div>
          ))}
        </div>
        <div className="relative flex flex-col items-center gap-2">
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isPublished ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-primary/10 border border-primary/20"}`}>
            <LayoutDashboard className={`h-5 w-5 ${isPublished ? "text-emerald-600" : "text-primary"}`} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isPublished ? "bg-emerald-500/20 text-emerald-700 border-emerald-500/30 dark:text-emerald-400" : "bg-muted text-muted-foreground border-border"}`}>
              {isPublished ? "Published" : "Draft"}
            </span>
          </div>
        </div>
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Link href={`/analytics/dashboards/${def.id}`}>
            <button className="flex items-center gap-1.5 bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full hover:bg-white/90 transition-colors" data-testid={`button-open-def-${def.id}`}>
              <Play className="h-3.5 w-3.5" /> Open
            </button>
          </Link>
        </div>
      </div>
      {/* Info */}
      <div className="flex items-start gap-2.5 p-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5 ${isPublished ? "bg-emerald-500/10" : "bg-primary/10"}`}>
          <LayoutDashboard className={`h-4 w-4 ${isPublished ? "text-emerald-600 dark:text-emerald-400" : "text-primary"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight line-clamp-2 mb-1">{def.title}</p>
          {def.description && <p className="text-[11px] text-muted-foreground line-clamp-1">{def.description}</p>}
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> {fmtDate(def.updatedAt)}
            </p>
            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
              <VisIcon className="h-2.5 w-2.5" /> {def.visibility}
            </span>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen(v => !v)} className="opacity-0 group-hover:opacity-100 h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-all">
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border bg-card shadow-lg py-1">
              <Link href={`/analytics/dashboards/${def.id}`}>
                <button className="w-full text-left text-xs px-3 py-1.5 hover:bg-muted" onClick={() => setMenuOpen(false)}>Open</button>
              </Link>
              <button className="w-full text-left text-xs px-3 py-1.5 hover:bg-muted text-red-500" onClick={() => { onDelete(def.id); setMenuOpen(false); }}>Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ icon: Icon, title, count, action }: { icon: React.ElementType; title: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-bold">{title}</h2>
        {count !== undefined && <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">{count}</span>}
      </div>
      {action}
    </div>
  );
}

type Section = "home" | "dashboards" | "insights" | "datasets";

export default function AnalyticsStudioPage() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ type: "dataset" | "insight" | "definition"; id: number } | null>(null);

  const section: Section = (() => {
    const tab = new URLSearchParams(searchParams).get("tab");
    if (tab === "dashboards" || tab === "insights" || tab === "datasets") return tab;
    return "home";
  })();

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
  const filteredIns = insights.filter(i => !q || i.title.toLowerCase().includes(q) || i.question?.toLowerCase().includes(q));
  const filteredDef = definitions.filter(d => !q || d.title.toLowerCase().includes(q));

  const isLoading = loadingDS || loadingIns || loadingDef;
  const latestDataset = [...datasets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const latestDashboard = [...definitions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  const latestInsight = [...insights].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";

  const EmptyState = ({ icon: Icon, title, desc, action }: { icon: React.ElementType; title: string; desc: string; action?: React.ReactNode }) => (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10 mb-4">
        <Icon className="h-7 w-7 text-primary/40" />
      </div>
      <p className="text-base font-semibold mb-1">{title}</p>
      <p className="text-sm text-muted-foreground max-w-xs mb-4">{desc}</p>
      {action}
    </div>
  );

  const SkeletonGrid = () => (
    <div className={GRID}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-xl border bg-card overflow-hidden">
          <div className="aspect-video bg-muted/40 animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-3 w-3/4 bg-muted/40 rounded animate-pulse" />
            <div className="h-2.5 w-1/2 bg-muted/30 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Top search bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b bg-background/80 backdrop-blur sticky top-0 z-10 shrink-0">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${section === "home" ? "everything" : section}…`}
            className="pl-9 h-9 bg-muted/30 border-muted text-sm"
            data-testid="input-search"
          />
        </div>
        <Button onClick={() => navigate("/analytics/upload")} className="gap-2 shrink-0 h-9" data-testid="button-upload-dataset">
          <Upload className="h-4 w-4" /> Upload
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-8">
        <Card className="border-primary/10 bg-gradient-to-r from-primary/5 via-background to-background">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Analytics data freshness
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use this before reading charts: it shows when source data, dashboards, and AI insight outputs last changed.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:min-w-[560px]">
                <div className={`rounded-xl border px-3 py-2 ${freshnessTone(latestDataset?.updatedAt)}`}>
                  <p className="text-[10px] uppercase tracking-wide font-semibold opacity-80">Last upload</p>
                  <p className="text-sm font-bold" data-testid="text-analytics-last-upload">{fmtDate(latestDataset?.updatedAt)}</p>
                  <p className="text-[10px] truncate opacity-75">{latestDataset?.name || "No dataset yet"}</p>
                </div>
                <div className={`rounded-xl border px-3 py-2 ${freshnessTone(latestDashboard?.updatedAt)}`}>
                  <p className="text-[10px] uppercase tracking-wide font-semibold opacity-80">Dashboard refresh</p>
                  <p className="text-sm font-bold" data-testid="text-analytics-last-dashboard">{fmtDate(latestDashboard?.updatedAt)}</p>
                  <p className="text-[10px] truncate opacity-75">{latestDashboard?.title || "No dashboard yet"}</p>
                </div>
                <div className={`rounded-xl border px-3 py-2 ${freshnessTone(latestInsight?.createdAt)}`}>
                  <p className="text-[10px] uppercase tracking-wide font-semibold opacity-80">Latest AI insight</p>
                  <p className="text-sm font-bold" data-testid="text-analytics-last-insight">{fmtDate(latestInsight?.createdAt)}</p>
                  <p className="text-[10px] truncate opacity-75">{latestInsight?.title || "No insight yet"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── HOME ── */}
        {section === "home" && (
          <>
            {/* Onboarding banner */}
            {datasets.length === 0 && !isLoading && (
              <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
                <CardContent className="px-6 py-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="font-bold">Get started — upload your first dataset</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-5">
                    {[
                      { icon: Upload, step: "1", title: "Upload Data", desc: "Drop your Excel or CSV file" },
                      { icon: Database, step: "2", title: "Configure", desc: "Classify columns as measures, dimensions or dates" },
                      { icon: Sparkles, step: "3", title: "Ask Questions", desc: "Get AI-generated chart answers instantly" },
                      { icon: LayoutDashboard, step: "4", title: "Publish", desc: "Pin insights to dashboards and share" },
                    ].map(item => (
                      <div key={item.step} className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/15 shrink-0">
                          <item.icon className="h-4 w-4 text-primary" />
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

            {/* Dashboards section */}
            {(filteredDef.length > 0 || isLoading) && (
              <section>
                <SectionHeading
                  icon={LayoutDashboard}
                  title="Dashboards"
                  count={filteredDef.length}
                  action={
                    <Link href="/analytics?tab=dashboards" className="text-xs text-primary hover:underline flex items-center gap-1">
                      View all <ChevronRight className="h-3 w-3" />
                    </Link>
                  }
                />
                {isLoading ? <SkeletonGrid /> : (
                  <div className={GRID}>
                    {filteredDef.slice(0, 8).map(d => (
                      <DashboardThumbnail key={d.id} def={d} onDelete={id => setDeleteTarget({ type: "definition", id })} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Insights section */}
            {(filteredIns.length > 0 || isLoading) && (
              <section>
                <SectionHeading
                  icon={Lightbulb}
                  title="Insights"
                  count={filteredIns.length}
                  action={
                    <Link href="/analytics?tab=insights" className="text-xs text-primary hover:underline flex items-center gap-1">
                      View all <ChevronRight className="h-3 w-3" />
                    </Link>
                  }
                />
                {isLoading ? <SkeletonGrid /> : (
                  <div className={GRID}>
                    {filteredIns.slice(0, 8).map(i => (
                      <InsightThumbnail key={i.id} insight={i} onDelete={id => setDeleteTarget({ type: "insight", id })} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Datasets section */}
            {(filteredDS.length > 0 || isLoading) && (
              <section>
                <SectionHeading
                  icon={Database}
                  title="Datasets"
                  count={filteredDS.length}
                  action={
                    <Link href="/analytics?tab=datasets" className="text-xs text-primary hover:underline flex items-center gap-1">
                      View all <ChevronRight className="h-3 w-3" />
                    </Link>
                  }
                />
                {isLoading ? <SkeletonGrid /> : (
                  <div className={GRID}>
                    {filteredDS.slice(0, 4).map(ds => (
                      <DatasetThumbnail key={ds.id} ds={ds} onDelete={id => setDeleteTarget({ type: "dataset", id })} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Empty home */}
            {!isLoading && filteredDef.length === 0 && filteredIns.length === 0 && filteredDS.length === 0 && search && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-base font-semibold mb-1">No results for "{search}"</p>
                <p className="text-sm text-muted-foreground">Try a different search term</p>
              </div>
            )}
          </>
        )}

        {/* ── DASHBOARDS ── */}
        {section === "dashboards" && (
          <section>
            <SectionHeading
              icon={LayoutDashboard}
              title="Dashboards"
              count={filteredDef.length}
              action={
                <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => navigate("/analytics/dashboards/new")} data-testid="button-new-dashboard">
                  <Plus className="h-3 w-3" /> New
                </Button>
              }
            />
            {isLoading ? <SkeletonGrid /> : (
              <div className={GRID}>
                {filteredDef.length > 0 ? filteredDef.map(d => (
                  <DashboardThumbnail key={d.id} def={d} onDelete={id => setDeleteTarget({ type: "definition", id })} />
                )) : (
                  <EmptyState
                    icon={LayoutDashboard}
                    title="No dashboards yet"
                    desc="Create a dashboard and pin saved insights to it to build a live view."
                    action={<Button onClick={() => navigate("/analytics/dashboards/new")} size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> Create Dashboard</Button>}
                  />
                )}
              </div>
            )}
          </section>
        )}

        {/* ── INSIGHTS ── */}
        {section === "insights" && (
          <section>
            <SectionHeading icon={Lightbulb} title="Insights" count={filteredIns.length} />
            {isLoading ? <SkeletonGrid /> : (
              <div className={GRID}>
                {filteredIns.length > 0 ? filteredIns.map(i => (
                  <InsightThumbnail key={i.id} insight={i} onDelete={id => setDeleteTarget({ type: "insight", id })} />
                )) : (
                  <EmptyState
                    icon={Lightbulb}
                    title="No saved insights yet"
                    desc="Explore a dataset and save AI-generated chart answers as insights."
                    action={datasets.length > 0 ? (
                      <Link href={`/analytics/datasets/${datasets[0].id}/explore`}>
                        <Button size="sm" className="gap-2"><Sparkles className="h-3.5 w-3.5" /> Explore a Dataset</Button>
                      </Link>
                    ) : undefined}
                  />
                )}
              </div>
            )}
          </section>
        )}

        {/* ── DATASETS ── */}
        {section === "datasets" && (
          <section>
            <SectionHeading
              icon={Database}
              title="Datasets"
              count={filteredDS.length}
              action={
                <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => navigate("/analytics/upload")}>
                  <Upload className="h-3 w-3" /> Upload
                </Button>
              }
            />
            {isLoading ? <SkeletonGrid /> : (
              <div className={GRID}>
                {filteredDS.length > 0 ? filteredDS.map(ds => (
                  <DatasetThumbnail key={ds.id} ds={ds} onDelete={id => setDeleteTarget({ type: "dataset", id })} />
                )) : (
                  <EmptyState
                    icon={FileSpreadsheet}
                    title="No datasets yet"
                    desc="Upload an Excel or CSV file to start exploring your data with AI."
                    action={<Button onClick={() => navigate("/analytics/upload")} size="sm" className="gap-2"><Upload className="h-3.5 w-3.5" /> Upload Dataset</Button>}
                  />
                )}
              </div>
            )}
          </section>
        )}

      </div>

      {/* Delete confirmation */}
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
