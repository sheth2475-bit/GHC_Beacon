import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, ArrowRight, Loader2, Database, Save, CheckCircle2,
  Info, Sparkles, Settings2, Hash, Calendar, AlignLeft, EyeOff,
  Upload, FileSpreadsheet, RefreshCw, ChevronDown, ChevronUp, X,
  Plus, Sigma, Trash2, FlaskConical, AlertCircle,
} from "lucide-react";
import type { AnalyticsDataset, AnalyticsDatasetColumn } from "@shared/schema";

type FullDataset = AnalyticsDataset & { columns: AnalyticsDatasetColumn[] };

const TYPE_ICONS: Record<string, typeof Hash> = {
  measure: Hash,
  dimension: AlignLeft,
  date: Calendar,
  ignore: EyeOff,
};

const TYPE_COLORS: Record<string, string> = {
  measure: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  dimension: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  date: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  ignore: "bg-muted text-muted-foreground border-border",
};

const TYPE_DESC: Record<string, string> = {
  measure: "Numeric value to aggregate (sum, avg, count…)",
  dimension: "Category to group or filter by",
  date: "Date/time column for trend analysis",
  ignore: "Exclude this column from analysis",
};

type ColState = {
  id: number;
  columnName: string;
  label: string;
  columnType: string;
  aggregation: string;
  format: string;
  dateFormat: string;
  dateGrains: string[];
  position: number;
  isFormula: boolean;
  formulaExpression: string;
};

export default function AnalyticsConfigurePage() {
  const [, params] = useRoute("/analytics/datasets/:id/configure");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const id = Number(params?.id);

  const { data: ds, isLoading } = useQuery<FullDataset>({
    queryKey: ["/api/v2/analytics/datasets", id],
    queryFn: () => fetch(`/api/v2/analytics/datasets/${id}`, { credentials: "include" }).then(r => r.json()),
  });

  const [cols, setCols] = useState<ColState[]>([]);

  // Custom Measures state
  const [measuresOpen, setMeasuresOpen] = useState(true);
  const [addingMeasure, setAddingMeasure] = useState(false);
  const [editingMeasureIdx, setEditingMeasureIdx] = useState<number | null>(null);
  const [newMeasureName, setNewMeasureName] = useState("");
  const [newMeasureFormula, setNewMeasureFormula] = useState("");
  const [newMeasureAgg, setNewMeasureAgg] = useState("sum");
  const [newMeasureFormat, setNewMeasureFormat] = useState("number");
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const formulaRef = useRef<HTMLTextAreaElement>(null);

  // Insert [Label] at cursor in formula textarea
  const insertColRef = useCallback((label: string) => {
    const ta = formulaRef.current;
    if (!ta) { setNewMeasureFormula(f => f + `[${label}]`); return; }
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const insert = `[${label}]`;
    const next = ta.value.slice(0, start) + insert + ta.value.slice(end);
    setNewMeasureFormula(next);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + insert.length, start + insert.length); }, 0);
  }, []);

  // Evaluate formula against first raw row for preview
  const previewFormula = useCallback(() => {
    const rawRows = (ds as any)?.rawData as Record<string, unknown>[] | undefined;
    if (!rawRows?.length || !newMeasureFormula.trim()) { setPreviewResult(null); return; }
    const baseRow = rawRows[0];
    try {
      let expr = newMeasureFormula;
      for (const c of cols.filter(x => !x.isFormula)) {
        const labelRe = new RegExp(`\\[${c.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`, "g");
        const nameRe  = new RegExp(`\\[${c.columnName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`, "g");
        const val = String(Number(baseRow[c.columnName]) || 0);
        expr = expr.replace(labelRe, val).replace(nameRe, val);
      }
      expr = expr.replace(/\[[^\]]+\]/g, "0");
      // eslint-disable-next-line no-new-func
      const result = new Function(`"use strict"; return (${expr})`)();
      setPreviewResult(typeof result === "number" && isFinite(result) ? String(Math.round(result * 1000) / 1000) : "Error");
      setPreviewError(null);
    } catch (e: any) {
      setPreviewResult(null);
      setPreviewError(e.message || "Invalid formula");
    }
  }, [newMeasureFormula, cols, ds]);

  const resetMeasureForm = () => {
    setAddingMeasure(false); setEditingMeasureIdx(null);
    setNewMeasureName(""); setNewMeasureFormula(""); setNewMeasureAgg("sum"); setNewMeasureFormat("number");
    setPreviewResult(null); setPreviewError(null);
  };

  const addMeasure = () => {
    if (!newMeasureName.trim() || !newMeasureFormula.trim()) return;
    const colName = `__formula_${newMeasureName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;
    const newCol: ColState = {
      id: -Date.now(), columnName: colName, label: newMeasureName.trim(),
      columnType: "measure", aggregation: newMeasureAgg, format: newMeasureFormat,
      dateFormat: "", dateGrains: [], position: cols.length,
      isFormula: true, formulaExpression: newMeasureFormula.trim(),
    };
    if (editingMeasureIdx !== null) {
      setCols(prev => prev.map((c, i) => i === editingMeasureIdx ? { ...c, label: newMeasureName.trim(), formulaExpression: newMeasureFormula.trim(), aggregation: newMeasureAgg, format: newMeasureFormat } : c));
    } else {
      setCols(prev => [...prev, newCol]);
    }
    resetMeasureForm();
  };

  const startEditMeasure = (idx: number) => {
    const c = cols[idx];
    setNewMeasureName(c.label); setNewMeasureFormula(c.formulaExpression); setNewMeasureAgg(c.aggregation); setNewMeasureFormat(c.format);
    setEditingMeasureIdx(idx); setAddingMeasure(true); setPreviewResult(null); setPreviewError(null);
  };

  const deleteMeasure = (idx: number) => setCols(prev => prev.filter((_, i) => i !== idx));

  // Source columns (non-formula) for chips
  const sourceCols = cols.filter(c => !c.isFormula && c.columnType !== "ignore");
  const formulaCols = cols.filter(c => c.isFormula);

  // Replace data state
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceDragOver, setReplaceDragOver] = useState(false);
  const replaceFileRef = useRef<HTMLInputElement>(null);

  const handleReplaceFile = useCallback((f: File) => {
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({ title: "Invalid file", description: "Please upload an Excel (.xlsx, .xls) or CSV file.", variant: "destructive" });
      return;
    }
    setReplaceFile(f);
  }, [toast]);

  const replaceMutation = useMutation({
    mutationFn: async (f: File) => {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch(`/api/v2/analytics/datasets/${id}/replace`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Replace failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/datasets", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/datasets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/dashboards"] });
      setReplaceFile(null);
      setReplaceOpen(false);
      toast({ title: "Data replaced!", description: `${data.rowCount?.toLocaleString()} rows loaded. Dashboards and insights will reflect the updated data.` });
    },
    onError: (err: Error) => {
      toast({ title: "Replace failed", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (ds?.columns) {
      setCols(ds.columns.map(c => ({
        id: c.id,
        columnName: c.columnName,
        label: c.label,
        columnType: c.columnType || "dimension",
        aggregation: c.aggregation || "sum",
        format: c.format || "number",
        dateFormat: c.dateFormat || "",
        dateGrains: c.dateGrains || ["year", "month"],
        position: c.position || 0,
        isFormula: c.isFormula || false,
        formulaExpression: c.formulaExpression || "",
      })));
    }
  }, [ds]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/v2/analytics/datasets/${id}/columns`, {
      columns: cols.map(c => ({
        columnName: c.columnName, label: c.label, columnType: c.columnType,
        aggregation: c.columnType === "measure" ? c.aggregation : null,
        format: c.format, dateFormat: c.dateFormat || null,
        dateGrains: c.columnType === "date" ? c.dateGrains : [],
        isFormula: c.isFormula, formulaExpression: c.formulaExpression || null, position: c.position,
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/analytics/datasets", id] });
      toast({ title: "Configuration saved!" });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const updateCol = (idx: number, field: keyof ColState, value: unknown) => {
    setCols(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const counts = cols.reduce((acc, c) => {
    acc[c.columnType] = (acc[c.columnType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading || !ds) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-5 max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/analytics")} className="gap-1.5 h-8 text-muted-foreground" data-testid="button-back">
              <ArrowLeft className="h-3.5 w-3.5" /> Analytics Studio
            </Button>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-sm font-semibold">{ds.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-1.5 h-8" data-testid="button-save-columns">
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </Button>
            <Button size="sm" onClick={() => { saveMutation.mutate(); setTimeout(() => navigate(`/analytics/datasets/${id}/explore`), 500); }} className="gap-1.5 h-8" data-testid="button-save-and-explore">
              <Sparkles className="h-3.5 w-3.5" /> Save & Explore <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/10">
            <Settings2 className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Configure Dataset</h1>
            <p className="text-xs text-muted-foreground">Classify each column so the analytics engine knows how to use it</p>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-muted/50 text-muted-foreground">
            <Database className="h-3 w-3" /> {ds.rowCount?.toLocaleString()} rows
          </span>
          {Object.entries(counts).filter(([k]) => k !== "ignore").map(([type, count]) => {
            const Icon = TYPE_ICONS[type] || AlignLeft;
            return (
              <span key={type} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${TYPE_COLORS[type]}`}>
                <Icon className="h-3 w-3" /> {count} {type}{count !== 1 ? "s" : ""}
              </span>
            );
          })}
          {counts.ignore > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border bg-muted text-muted-foreground">
              <EyeOff className="h-3 w-3" /> {counts.ignore} ignored
            </span>
          )}
        </div>

        {/* Replace Data Panel */}
        <Card className="border-dashed">
          <CardContent className="p-0">
            <button
              onClick={() => setReplaceOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors rounded-xl"
              data-testid="button-toggle-replace"
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <span>Replace Data File</span>
                <span className="text-xs text-muted-foreground font-normal">— upload a new version, including multi-sheet actual/budget workbooks</span>
              </div>
              {replaceOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {replaceOpen && (
              <div className="px-4 pb-4 space-y-3">
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Column labels and types will be preserved for any columns that exist in both files. Multi-sheet Excel files are modeled by matching shared keys like date, period, hotel, department, or region, so actuals and budgets can update together.
                  </p>
                </div>

                {/* Current file info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Current file: <span className="font-medium text-foreground">{ds.fileName}</span></span>
                  <span>·</span>
                  <span>{ds.rowCount?.toLocaleString()} rows</span>
                  {(ds.sheetNames?.length || 0) > 1 && (
                    <>
                      <span>·</span>
                      <span>{ds.sheetNames?.length} sheets modeled</span>
                    </>
                  )}
                </div>

                {/* Drop zone */}
                {!replaceFile ? (
                  <div
                    onDragOver={e => { e.preventDefault(); setReplaceDragOver(true); }}
                    onDragLeave={() => setReplaceDragOver(false)}
                    onDrop={e => { e.preventDefault(); setReplaceDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleReplaceFile(f); }}
                    onClick={() => replaceFileRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 cursor-pointer transition-colors ${replaceDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/20"}`}
                    data-testid="dropzone-replace"
                  >
                    <Upload className="h-7 w-7 text-muted-foreground/50" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Drop your updated file here</p>
                      <p className="text-xs text-muted-foreground">or click to browse · .xlsx, .xls, .csv</p>
                    </div>
                    <input
                      ref={replaceFileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleReplaceFile(f); }}
                      data-testid="input-replace-file"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{replaceFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(replaceFile.size / 1024).toFixed(1)} KB · Ready to upload</p>
                    </div>
                    <button onClick={() => setReplaceFile(null)} className="text-muted-foreground hover:text-foreground" data-testid="button-clear-replace-file">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {replaceFile && (
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setReplaceFile(null)} data-testid="button-cancel-replace">Cancel</Button>
                    <Button
                      size="sm"
                      onClick={() => replaceMutation.mutate(replaceFile)}
                      disabled={replaceMutation.isPending}
                      className="gap-1.5"
                      data-testid="button-confirm-replace"
                    >
                      {replaceMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Replace Data
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["measure", "dimension", "date", "ignore"] as const).map(t => {
                const Icon = TYPE_ICONS[t];
                return (
                  <div key={t} className="flex items-start gap-2">
                    <span className={`inline-flex items-center justify-center h-5 w-5 rounded-md border text-[10px] shrink-0 mt-0.5 ${TYPE_COLORS[t]}`}>
                      <Icon className="h-3 w-3" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold capitalize">{t}</p>
                      <p className="text-[10px] text-muted-foreground">{TYPE_DESC[t]}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Column table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_120px_120px] text-xs font-semibold text-muted-foreground bg-muted/30 px-4 py-2.5 border-b">
            <div>Column</div>
            <div>Type</div>
            <div>Aggregation</div>
            <div>Format</div>
          </div>
          <div className="divide-y">
            {cols.map((col, idx) => {
              if (col.isFormula) return null; // formula cols managed in Custom Measures section
              const Icon = TYPE_ICONS[col.columnType] || AlignLeft;
              return (
                <div key={col.columnName} className={`grid grid-cols-[1fr_140px_120px_120px] items-center px-4 py-2.5 hover:bg-muted/20 transition-colors ${col.columnType === "ignore" ? "opacity-50" : ""}`} data-testid={`col-row-${idx}`}>
                  {/* Name + Label */}
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${col.columnType === "measure" ? "text-emerald-600" : col.columnType === "date" ? "text-amber-600" : col.columnType === "ignore" ? "text-muted-foreground" : "text-blue-600"}`} />
                      <Input
                        value={col.label}
                        onChange={e => updateCol(idx, "label", e.target.value)}
                        className="h-7 text-xs border-0 bg-transparent focus:bg-background focus:border px-1 font-medium"
                        data-testid={`input-col-label-${idx}`}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground pl-5 truncate">{col.columnName}</p>
                  </div>

                  {/* Type */}
                  <Select value={col.columnType} onValueChange={v => updateCol(idx, "columnType", v)}>
                    <SelectTrigger className="h-7 text-xs" data-testid={`select-col-type-${idx}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dimension">Dimension</SelectItem>
                      <SelectItem value="measure">Measure</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="ignore">Ignore</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Aggregation (only for measures) */}
                  <div>
                    {col.columnType === "measure" ? (
                      <Select value={col.aggregation} onValueChange={v => updateCol(idx, "aggregation", v)}>
                        <SelectTrigger className="h-7 text-xs" data-testid={`select-col-agg-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sum">Sum</SelectItem>
                          <SelectItem value="avg">Average</SelectItem>
                          <SelectItem value="count">Count</SelectItem>
                          <SelectItem value="min">Min</SelectItem>
                          <SelectItem value="max">Max</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : col.columnType === "date" ? (
                      <span className="text-xs text-muted-foreground pl-1">By month/year</span>
                    ) : (
                      <span className="text-xs text-muted-foreground pl-1">—</span>
                    )}
                  </div>

                  {/* Format (only for measures) */}
                  <div>
                    {col.columnType === "measure" ? (
                      <Select value={col.format} onValueChange={v => updateCol(idx, "format", v)}>
                        <SelectTrigger className="h-7 text-xs" data-testid={`select-col-format-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="currency">Currency</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground pl-1">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════ Custom Measures ═══════ */}
        <Card>
          <CardContent className="p-0">
            {/* Section header */}
            <button
              onClick={() => setMeasuresOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors rounded-xl"
              data-testid="button-toggle-measures"
            >
              <div className="flex items-center gap-2">
                <Sigma className="h-4 w-4 text-purple-600" />
                <span>Custom Measures</span>
                {formulaCols.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 border border-purple-500/20">
                    {formulaCols.length}
                  </span>
                )}
                <span className="text-xs text-muted-foreground font-normal">— calculated fields built from existing columns</span>
              </div>
              {measuresOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            {measuresOpen && (
              <div className="px-4 pb-4 space-y-3">
                {/* How it works banner */}
                <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 px-3 py-2.5 flex items-start gap-2">
                  <FlaskConical className="h-3.5 w-3.5 text-purple-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-700 dark:text-purple-400">
                    Custom measures work like Power BI's calculated columns. Write formulas using <code className="bg-purple-100 dark:bg-purple-900 px-1 rounded">[Column Name]</code> references (e.g. <code className="bg-purple-100 dark:bg-purple-900 px-1 rounded">[Revenue] / [Rooms]</code>). They appear as regular measures in all charts and analyses.
                  </p>
                </div>

                {/* Existing formula measures */}
                {formulaCols.length > 0 && (
                  <div className="space-y-2">
                    {formulaCols.map((col) => {
                      const globalIdx = cols.findIndex(c => c.columnName === col.columnName);
                      return (
                        <div key={col.columnName} className="flex items-start gap-3 rounded-lg border bg-muted/20 px-3 py-2.5" data-testid={`measure-row-${col.columnName}`}>
                          <Sigma className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{col.label}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">{col.aggregation}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border">{col.format}</span>
                            </div>
                            <code className="text-[11px] text-muted-foreground font-mono block mt-0.5 truncate">{col.formulaExpression}</code>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => startEditMeasure(globalIdx)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground" data-testid={`button-edit-measure-${col.columnName}`}>
                              <Settings2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => deleteMeasure(globalIdx)} className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-500/10 hover:text-red-500 text-muted-foreground" data-testid={`button-delete-measure-${col.columnName}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty state */}
                {formulaCols.length === 0 && !addingMeasure && (
                  <div className="flex flex-col items-center py-6 text-center rounded-lg border-2 border-dashed">
                    <Sigma className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground mb-1">No custom measures yet</p>
                    <p className="text-xs text-muted-foreground max-w-xs">Create calculated fields like RevPAR, Cost per Unit, or Margin %</p>
                  </div>
                )}

                {/* Add Measure form */}
                {addingMeasure ? (
                  <div className="rounded-xl border bg-background shadow-sm p-4 space-y-3" data-testid="add-measure-form">
                    <div className="flex items-center gap-2">
                      <Sigma className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-bold">{editingMeasureIdx !== null ? "Edit Measure" : "New Custom Measure"}</span>
                    </div>

                    {/* Measure Name */}
                    <div>
                      <label className="text-xs font-semibold mb-1 block">Measure Name *</label>
                      <Input
                        value={newMeasureName}
                        onChange={e => setNewMeasureName(e.target.value)}
                        placeholder="e.g. RevPAR, Profit Margin, Cost per Room"
                        className="h-8 text-sm"
                        data-testid="input-measure-name"
                      />
                    </div>

                    {/* Formula */}
                    <div>
                      <label className="text-xs font-semibold mb-1 block">Formula *</label>
                      <Textarea
                        ref={formulaRef}
                        value={newMeasureFormula}
                        onChange={e => setNewMeasureFormula(e.target.value)}
                        placeholder="e.g. [Total Revenue] / [Available Rooms]"
                        className="text-sm font-mono resize-none min-h-[60px]"
                        rows={2}
                        data-testid="input-measure-formula"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Operators: + − * / ( )  |  Reference columns with [Column Name]</p>
                    </div>

                    {/* Column chips */}
                    {sourceCols.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Click a column to insert it:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {sourceCols.map(c => (
                            <button
                              key={c.columnName}
                              onClick={() => insertColRef(c.label)}
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border bg-muted/30 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
                              data-testid={`chip-col-${c.columnName}`}
                            >
                              <Hash className="h-2.5 w-2.5 text-emerald-600" />
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Agg + Format */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold mb-1 block">Aggregation</label>
                        <Select value={newMeasureAgg} onValueChange={setNewMeasureAgg}>
                          <SelectTrigger className="h-8 text-xs" data-testid="select-measure-agg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sum">Sum</SelectItem>
                            <SelectItem value="avg">Average</SelectItem>
                            <SelectItem value="min">Min</SelectItem>
                            <SelectItem value="max">Max</SelectItem>
                            <SelectItem value="count">Count</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold mb-1 block">Format</label>
                        <Select value={newMeasureFormat} onValueChange={setNewMeasureFormat}>
                          <SelectTrigger className="h-8 text-xs" data-testid="select-measure-format">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="currency">Currency</SelectItem>
                            <SelectItem value="percentage">Percentage</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={previewFormula} data-testid="button-preview-formula">
                        <FlaskConical className="h-3 w-3" /> Preview (row 1)
                      </Button>
                      {previewResult !== null && (
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">= {previewResult}</span>
                      )}
                      {previewError && (
                        <span className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{previewError}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1 border-t">
                      <button onClick={resetMeasureForm} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                      <Button
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={addMeasure}
                        disabled={!newMeasureName.trim() || !newMeasureFormula.trim()}
                        data-testid="button-add-measure"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {editingMeasureIdx !== null ? "Update Measure" : "Add Measure"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8 w-full border-dashed text-purple-700 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                    onClick={() => { setNewMeasureName(""); setNewMeasureFormula(""); setNewMeasureAgg("sum"); setNewMeasureFormat("number"); setPreviewResult(null); setPreviewError(null); setEditingMeasureIdx(null); setAddingMeasure(true); }}
                    data-testid="button-new-measure"
                  >
                    <Plus className="h-3.5 w-3.5" /> New Custom Measure
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="flex items-start gap-2 rounded-lg bg-muted/30 border p-3">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">Column labels can be edited — they appear in charts and questions. The original column names from your file are shown below each label. You can always come back and adjust this configuration.</p>
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <Button variant="outline" onClick={() => navigate("/analytics")} data-testid="button-cancel">Back to Studio</Button>
          <Button onClick={() => { saveMutation.mutate(); setTimeout(() => navigate(`/analytics/datasets/${id}/explore`), 600); }} disabled={saveMutation.isPending} className="gap-2" data-testid="button-save-explore">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Save & Start Exploring
          </Button>
        </div>
      </div>
    </div>
  );
}
