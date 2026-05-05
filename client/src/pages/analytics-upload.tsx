import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, FileSpreadsheet, ArrowLeft, ArrowRight, Loader2,
  CheckCircle2, AlertCircle, X, Database, Sparkles,
  FileImage, Presentation, LayoutDashboard, Link as LinkIcon,
} from "lucide-react";
import type { AnalyticsDataset, AnalyticsDatasetColumn, AnalyticsDashboardDefinition } from "@shared/schema";

type UploadResult = AnalyticsDataset & { columns: AnalyticsDatasetColumn[]; modelingStrategy?: string; dashboard?: AnalyticsDashboardDefinition; insights?: unknown[]; sourceType?: string };

const TYPE_COLORS: Record<string, string> = {
  dimension: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  measure: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  date: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  ignore: "bg-muted text-muted-foreground border-border",
};

export default function AnalyticsUploadPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [uploadMode, setUploadMode] = useState<"data" | "visual" | "powerbi">("data");

  // Power BI specific state
  const [pbiName, setPbiName] = useState("");
  const [pbiUrl, setPbiUrl] = useState("");
  const [pbiSaved, setPbiSaved] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/v2/analytics/datasets", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json() as Promise<UploadResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/datasets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/insights"] });
      toast({ title: "Dataset uploaded!", description: `${data.rowCount?.toLocaleString()} rows detected across ${data.sheetNames?.length || 1} sheet(s).` });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const visualUploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/v2/analytics/datasets/from-visual", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Dashboard generation failed");
      }
      return res.json() as Promise<UploadResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.dashboard) {
        queryClient.setQueryData<AnalyticsDashboardDefinition[]>(["/api/v2/analytics/definitions"], (current = []) => [
          data.dashboard!,
          ...current.filter(def => def.id !== data.dashboard!.id),
        ]);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/datasets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/definitions"] });
      toast({ title: "Dashboard generated!", description: `${data.rowCount?.toLocaleString()} starter rows, ${data.insights?.length || 0} insights, and a dashboard were created.` });
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const pbiMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/powerbi-dashboards", { name: pbiName.trim(), url: pbiUrl.trim() }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/powerbi-dashboards"] });
      setPbiSaved(true);
      toast({ title: "Dashboard linked!", description: `"${pbiName}" has been added to your Dashboards section.` });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const handleFile = useCallback((f: File) => {
    const validData = /\.(xlsx|xlsm|xls|csv)$/i.test(f.name);
    const validVisual = /\.(png|jpe?g|webp|pptx)$/i.test(f.name);
    if (uploadMode === "data" && !validData) {
      toast({ title: "Invalid file type", description: "Please upload an Excel (.xlsx, .xlsm, .xls) or CSV file, or switch to Screenshot / PowerPoint mode.", variant: "destructive" });
      return;
    }
    if (uploadMode === "visual" && !validVisual) {
      toast({ title: "Invalid file type", description: "Please upload a dashboard screenshot (.png, .jpg, .webp) or PowerPoint (.pptx).", variant: "destructive" });
      return;
    }
    setFile(f);
    if (!name) setName(f.name.replace(/\.(xlsx|xlsm|xls|csv|png|jpe?g|webp|pptx)$/i, ""));
  }, [name, toast, uploadMode]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSubmit = () => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", name || file.name);
    if (description) fd.append("description", description);
    if (uploadMode === "visual") visualUploadMutation.mutate(fd);
    else uploadMutation.mutate(fd);
  };

  const colTypeGroups = result ? {
    measure: result.columns.filter(c => c.columnType === "measure").length,
    dimension: result.columns.filter(c => c.columnType === "dimension").length,
    date: result.columns.filter(c => c.columnType === "date").length,
  } : null;

  return (
    <div className="h-full overflow-auto">
      <div className="p-5 max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/analytics")} className="gap-1.5 h-8 text-muted-foreground" data-testid="button-back">
            <ArrowLeft className="h-3.5 w-3.5" /> Analytics Studio
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/10">
            <Database className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Upload Dataset</h1>
            <p className="text-xs text-muted-foreground">Upload Excel/CSV data, generate from a visual, or link a Power BI dashboard</p>
          </div>
        </div>

        {!result ? (
          <>
            {/* Mode selector — 3 options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => { setUploadMode("data"); setFile(null); setPbiSaved(false); }}
                className={`text-left rounded-xl border p-3 transition-all ${uploadMode === "data" ? "border-primary bg-primary/5 shadow-sm" : "bg-card hover:border-primary/40"}`}
                data-testid="button-mode-data-upload"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">Upload data file</span>
                </div>
                <p className="text-xs text-muted-foreground">Use Excel or CSV when you already have the source data.</p>
              </button>
              <button
                type="button"
                onClick={() => { setUploadMode("visual"); setFile(null); setPbiSaved(false); }}
                className={`text-left rounded-xl border p-3 transition-all ${uploadMode === "visual" ? "border-primary bg-primary/5 shadow-sm" : "bg-card hover:border-primary/40"}`}
                data-testid="button-mode-visual-upload"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileImage className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">Create from screenshot / PPT</span>
                </div>
                <p className="text-xs text-muted-foreground">Generate starter data, insights, and a dashboard from an existing visual.</p>
              </button>
              <button
                type="button"
                onClick={() => { setUploadMode("powerbi"); setFile(null); setPbiSaved(false); }}
                className={`text-left rounded-xl border p-3 transition-all ${uploadMode === "powerbi" ? "border-amber-500 bg-amber-500/5 shadow-sm" : "bg-card hover:border-amber-500/40"}`}
                data-testid="button-mode-powerbi"
              >
                <div className="flex items-center gap-2 mb-1">
                  <LinkIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-bold">Power BI Dashboard</span>
                </div>
                <p className="text-xs text-muted-foreground">Link an existing Power BI report or dashboard by URL.</p>
              </button>
            </div>

            {/* ── Power BI mode ── */}
            {uploadMode === "powerbi" && (
              <>
                {pbiSaved ? (
                  <Card className="border-emerald-500/20 bg-emerald-500/5">
                    <CardContent className="p-5 flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div className="flex-1">
                        <p className="font-bold text-sm">"{pbiName}" added to Dashboards</p>
                        <p className="text-xs text-muted-foreground">You'll find it in the Dashboards section of Analytics Studio.</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <LinkIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Link Power BI Dashboard</p>
                          <p className="text-xs text-muted-foreground">Paste the report URL and give it a name — it will appear as a card in your Dashboards section.</p>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="pbi-name" className="text-xs font-semibold">Dashboard Name *</Label>
                        <Input
                          id="pbi-name"
                          value={pbiName}
                          onChange={e => setPbiName(e.target.value)}
                          placeholder="e.g. Sales Performance Dashboard"
                          className="mt-1.5 h-9"
                          data-testid="input-powerbi-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pbi-url" className="text-xs font-semibold">Power BI URL *</Label>
                        <Input
                          id="pbi-url"
                          value={pbiUrl}
                          onChange={e => setPbiUrl(e.target.value)}
                          placeholder="https://app.powerbi.com/..."
                          className="mt-1.5 h-9"
                          data-testid="input-powerbi-url"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Paste the full Power BI report or dashboard link. Clicking the card will open it in a new tab.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => navigate("/analytics")} data-testid="button-cancel">Cancel</Button>
                  {!pbiSaved ? (
                    <Button
                      onClick={() => pbiMutation.mutate()}
                      disabled={!pbiName.trim() || !pbiUrl.trim() || pbiMutation.isPending}
                      className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                      data-testid="button-powerbi-submit"
                    >
                      {pbiMutation.isPending
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                        : <><LinkIcon className="h-4 w-4" /> Add to Dashboards</>}
                    </Button>
                  ) : (
                    <Button onClick={() => navigate("/analytics?tab=dashboards")} className="gap-2" data-testid="button-go-dashboards">
                      <LayoutDashboard className="h-4 w-4" /> View Dashboards <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* ── File upload modes ── */}
            {uploadMode !== "powerbi" && (
              <>
                {/* Drop zone */}
                <div
                  className={`relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => !file && fileInputRef.current?.click()}
                  data-testid="dropzone-upload"
                >
                  <input ref={fileInputRef} type="file" accept={uploadMode === "visual" ? ".png,.jpg,.jpeg,.webp,.pptx" : ".xlsx,.xlsm,.xls,.csv"} className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} data-testid="input-file" />
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    {file ? (
                      <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 mb-3">
                          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                        </div>
                        <p className="font-bold text-sm mb-0.5">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                        <button className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" onClick={e => { e.stopPropagation(); setFile(null); }}>
                          <X className="h-3 w-3" /> Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                          {uploadMode === "visual" ? <Presentation className="h-7 w-7 text-primary/60" /> : <FileSpreadsheet className="h-7 w-7 text-primary/60" />}
                        </div>
                        <p className="font-bold text-sm mb-1">{dragOver ? "Drop to upload" : "Drop your file here"}</p>
                        <p className="text-xs text-muted-foreground mb-3">or click to browse</p>
                        <p className="text-[11px] text-muted-foreground/60">
                          {uploadMode === "visual" ? "Supports .png, .jpg, .webp, .pptx · creates starter Excel data + dashboard · Max 20 MB" : "Supports .xlsx, .xlsm, .xls, .csv · multi-sheet Excel modeling · Max 20 MB"}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <Label htmlFor="ds-name" className="text-xs font-semibold">Dataset Name *</Label>
                      <Input id="ds-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q1 Sales Data" className="mt-1.5 h-9" data-testid="input-dataset-name" />
                    </div>
                    <div>
                      <Label htmlFor="ds-desc" className="text-xs font-semibold">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
                      <Textarea id="ds-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Briefly describe what this dataset contains…" className="mt-1.5 resize-none" rows={2} data-testid="input-dataset-description" />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => navigate("/analytics")} data-testid="button-cancel">Cancel</Button>
                  <Button onClick={handleSubmit} disabled={!file || !name || uploadMutation.isPending || visualUploadMutation.isPending} className="gap-2" data-testid="button-upload-submit">
                    {uploadMutation.isPending || visualUploadMutation.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> {uploadMode === "visual" ? "Generating…" : "Uploading…"}</>
                      : <><Upload className="h-4 w-4" /> {uploadMode === "visual" ? "Generate Dataset & Dashboard" : "Upload & Detect Columns"}</>}
                  </Button>
                </div>
              </>
            )}
          </>
        ) : (
          /* Success state */
          <div className="space-y-4">
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">{result.name} — uploaded successfully</p>
                    <p className="text-xs text-muted-foreground">
                      {result.rowCount?.toLocaleString()} rows · {result.columns.length} columns detected · {result.sheetNames?.length || 1} sheet(s)
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {(result.sheetNames || []).map(sheet => (
                    <div key={sheet} className="text-xs rounded-full border bg-muted/40 px-2 py-0.5">
                      <span className="text-muted-foreground">Sheet</span>
                      <span className="font-semibold ml-1">{sheet}</span>
                    </div>
                  ))}
                  {result.modelingStrategy && (
                    <div className="text-xs rounded-full border bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 px-2 py-0.5">
                      {result.modelingStrategy.replace(/-/g, " ")}
                    </div>
                  )}
                  {colTypeGroups && [
                    { label: "Measures", count: colTypeGroups.measure, color: "text-emerald-600" },
                    { label: "Dimensions", count: colTypeGroups.dimension, color: "text-blue-600" },
                    { label: "Dates", count: colTypeGroups.date, color: "text-amber-600" },
                  ].map(g => (
                    <div key={g.label} className="text-xs">
                      <span className={`font-bold ${g.color}`}>{g.count}</span>
                      <span className="text-muted-foreground ml-1">{g.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Column preview */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-semibold mb-2.5 text-muted-foreground uppercase tracking-wide">Auto-detected columns</p>
                <div className="flex flex-wrap gap-2">
                  {result.columns.map(c => (
                    <span key={c.columnName} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${TYPE_COLORS[c.columnType]}`}>
                      {c.label}
                      <span className="opacity-60 text-[10px]">{c.columnType}</span>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Column types are auto-detected. Review and adjust them in the next step.
                </p>
              </CardContent>
            </Card>

            {result.dashboard && (
              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <LayoutDashboard className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">Dashboard created: {result.dashboard.title}</p>
                      <p className="text-xs text-muted-foreground">Download the starter Excel from Configure, update the rows, then replace the file to refresh this dashboard.</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/analytics/dashboards/${result.dashboard!.id}`)} data-testid="button-open-generated-dashboard">
                    Open Dashboard
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => navigate(`/analytics/datasets/${result.id}/explore`)} className="gap-2" data-testid="button-skip-configure">
                <Sparkles className="h-4 w-4" /> Skip to Explore
              </Button>
              <Button onClick={() => navigate(`/analytics/datasets/${result.id}/configure`)} className="gap-2" data-testid="button-go-configure">
                Configure Columns <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
