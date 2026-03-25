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
  Eye, Clock, TrendingUp, Layers, RefreshCw, BookOpen, Sparkles,
  ChevronRight, FileSpreadsheet, AlertTriangle,
} from "lucide-react";
import type { AnalyticsDashboard } from "@shared/schema";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  published: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  archived: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
};
const VIS_ICON: Record<string, typeof Lock> = { private: Lock, department: Building2, company: Globe };

function DashboardCard({ dash, onDelete }: { dash: AnalyticsDashboard; onDelete: (id: number) => void }) {
  const VisIcon = VIS_ICON[dash.visibility || "private"] || Lock;
  const fmtDate = (d: string | Date | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  return (
    <div className="group relative rounded-xl border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden" data-testid={`card-analytics-dashboard-${dash.id}`}>
      <div className={`h-[3px] ${dash.status === "published" ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : dash.status === "archived" ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-gradient-to-r from-primary to-primary/60"}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[dash.status || "draft"]}`}>
                {(dash.status || "draft").charAt(0).toUpperCase() + (dash.status || "draft").slice(1)}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <VisIcon className="h-2.5 w-2.5" />
                {dash.visibility === "company" ? "Company-wide" : dash.visibility === "department" ? "Department" : "Private"}
              </span>
            </div>
            <h3 className="font-bold text-sm leading-tight truncate" data-testid={`text-dash-title-${dash.id}`}>{dash.title}</h3>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); onDelete(dash.id); }}
            className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded-md hover:bg-red-500/10 hover:text-red-500 transition-all shrink-0"
            data-testid={`button-delete-dash-${dash.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {dash.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{dash.description}</p>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground mb-3">
          {dash.audience && <span className="flex items-center gap-1"><Eye className="h-2.5 w-2.5" />{dash.audience}</span>}
          {dash.businessArea && <span className="flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5" />{dash.businessArea}</span>}
          <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />Updated {fmtDate(dash.updatedAt)}</span>
        </div>
        <Link href={`/analytics/${dash.id}`}>
          <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5" data-testid={`button-open-dash-${dash.id}`}>
            Open Dashboard <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10 mb-4">
        {tab === "templates" ? <BookOpen className="h-7 w-7 text-primary/50" /> : <BarChart3 className="h-7 w-7 text-primary/50" />}
      </div>
      <p className="text-base font-semibold mb-1">
        {tab === "mine" ? "No dashboards yet" : tab === "shared" ? "No shared dashboards" : tab === "published" ? "No published dashboards" : "Template Library"}
      </p>
      <p className="text-sm text-muted-foreground max-w-xs">
        {tab === "mine" ? "Create your first analytics dashboard using the button above." :
         tab === "shared" ? "Dashboards shared with your department will appear here." :
         tab === "published" ? "Published company-wide dashboards will appear here." :
         "Start with a dashboard to auto-generate an Excel template tailored to your data."}
      </p>
    </div>
  );
}

export default function AnalyticsStudioPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<"mine" | "shared" | "published">("mine");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: dashboards = [], isLoading } = useQuery<AnalyticsDashboard[]>({
    queryKey: ["/api/analytics/dashboards"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/analytics/dashboards/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboards"] }); toast({ title: "Dashboard deleted" }); },
  });

  const filtered = dashboards.filter(d => {
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (tab === "mine") return d.createdBy === user?.id;
    if (tab === "shared") return d.createdBy !== user?.id && d.status === "published";
    if (tab === "published") return d.status === "published" && d.visibility === "company";
    return true;
  });

  const tabCls = (t: string) => `px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tab === t ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`;

  const stats = {
    total: dashboards.length,
    published: dashboards.filter(d => d.status === "published").length,
    draft: dashboards.filter(d => d.status === "draft").length,
    mine: dashboards.filter(d => d.createdBy === user?.id).length,
  };

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
            <p className="text-sm text-muted-foreground">Build dynamic dashboards from your data — describe, upload, and let AI do the rest.</p>
          </div>
          <Button
            onClick={() => navigate("/analytics/new")}
            className="gap-2 shrink-0"
            data-testid="button-new-analytics-dashboard"
          >
            <Plus className="h-4 w-4" /> New Dashboard
          </Button>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, icon: Layers, color: "text-primary" },
            { label: "My Dashboards", value: stats.mine, icon: BarChart3, color: "text-blue-600" },
            { label: "Published", value: stats.published, icon: Globe, color: "text-emerald-600" },
            { label: "Drafts", value: stats.draft, icon: Clock, color: "text-amber-600" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
              <s.icon className={`h-5 w-5 shrink-0 ${s.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5">
            <button className={tabCls("mine")} onClick={() => setTab("mine")} data-testid="tab-my-dashboards">My Dashboards</button>
            <button className={tabCls("shared")} onClick={() => setTab("shared")} data-testid="tab-shared-dashboards">Shared</button>
            <button className={tabCls("published")} onClick={() => setTab("published")} data-testid="tab-published-dashboards">Published</button>
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dashboards…" className="pl-8 h-8 text-sm" data-testid="input-search-dashboards" />
          </div>
        </div>

        {/* How it works banner (first-time) */}
        {stats.total === 0 && (
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm">How Analytics Studio works</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: FileSpreadsheet, step: "1", title: "Describe", desc: "Tell us what you want to see in plain language" },
                  { icon: RefreshCw, step: "2", title: "Get Template", desc: "AI generates the perfect Excel template for your data" },
                  { icon: BarChart3, step: "3", title: "Upload Data", desc: "Fill and upload the template — we validate it" },
                  { icon: Sparkles, step: "4", title: "AI Dashboard", desc: "Charts, KPIs, and narrative generated automatically" },
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
            </CardContent>
          </Card>
        )}

        {/* Dashboard grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-muted/40 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.length > 0 ? (
              filtered.map(d => <DashboardCard key={d.id} dash={d} onDelete={setDeleteId} />)
            ) : (
              <EmptyState tab={tab} />
            )}
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Delete Dashboard</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the dashboard and all its data, uploads, widgets, and narratives. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
