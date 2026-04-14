import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle,
  AlertCircle, Info, RotateCcw, Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────
interface RawRow {
  kpiName: string;
  target: number;
  actual: number;
  lowerIsBetter: boolean;
  weight: number | null;   // null = not provided
}

interface ResultRow extends RawRow {
  achievementPct: number;
  assignedWeight: number;
  weightedScore: number;
  cappedWeightedScore: number;
}

type CapMode = "none" | "100" | "120";
type WeightErrorMode = "error" | "normalize";

// ── Excel column aliases ─────────────────────────────────────────────────────
const aliases: Record<string, string> = {
  "kpi name": "kpiName", "kpi": "kpiName", "name": "kpiName", "indicator": "kpiName",
  "target": "target", "target value": "target",
  "actual": "actual", "actual value": "actual", "actuals": "actual",
  "lower is better": "lowerIsBetter", "lower better": "lowerIsBetter",
  "lower": "lowerIsBetter", "direction": "lowerIsBetter",
  "kpi weight %": "weight", "weight %": "weight", "weight": "weight",
  "kpi weight": "weight", "weighting": "weight", "weighting %": "weight",
};

function normalizeHeader(h: string): string {
  return (aliases[h.toLowerCase().trim()] ?? h.toLowerCase().trim());
}

function parseBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v).toLowerCase().trim();
  return ["yes", "y", "true", "1", "lower", "lower is better"].includes(s);
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function PerformanceScorePage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [weightWarning, setWeightWarning] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // ── Config ────────────────────────────────────────────────────────────────
  const [capMode, setCapMode] = useState<CapMode>("100");
  const [weightErrorMode, setWeightErrorMode] = useState<WeightErrorMode>("normalize");
  const [autoCalculated, setAutoCalculated] = useState(false);

  // ── Excel parsing ─────────────────────────────────────────────────────────
  function parseExcel(file: File) {
    setParseError(null);
    setResults(null);
    setRawRows([]);
    setWeightWarning(null);
    setAutoCalculated(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

        if (!json.length) {
          setParseError("The uploaded file appears to be empty.");
          return;
        }

        // Normalise headers
        const firstRow = json[0];
        const headerMap: Record<string, string> = {};
        Object.keys(firstRow).forEach(h => {
          const norm = normalizeHeader(h);
          headerMap[h] = norm;
        });

        const rows: RawRow[] = [];
        const errors: string[] = [];

        json.forEach((raw, i) => {
          const mapped: Record<string, unknown> = {};
          Object.entries(raw).forEach(([k, v]) => { mapped[headerMap[k]] = v; });

          const kpiName = String(mapped.kpiName || "").trim();
          if (!kpiName) return; // skip blank rows

          const target = parseFloat(String(mapped.target));
          const actual = parseFloat(String(mapped.actual));

          if (isNaN(target)) { errors.push(`Row ${i + 2}: Target is not a number for "${kpiName}".`); return; }
          if (isNaN(actual)) { errors.push(`Row ${i + 2}: Actual is not a number for "${kpiName}".`); return; }

          const lowerIsBetter = mapped.lowerIsBetter !== undefined && mapped.lowerIsBetter !== ""
            ? parseBool(mapped.lowerIsBetter)
            : false;

          let weight: number | null = null;
          if (mapped.weight !== undefined && mapped.weight !== "") {
            const w = parseFloat(String(mapped.weight));
            if (!isNaN(w)) weight = w;
          }

          rows.push({ kpiName, target, actual, lowerIsBetter, weight });
        });

        if (errors.length) {
          setParseError(errors.join("\n"));
          return;
        }
        if (!rows.length) {
          setParseError("No valid KPI rows found in the file. Check that the columns include KPI Name, Target, and Actual.");
          return;
        }

        setFileName(file.name);
        setRawRows(rows);
      } catch (err) {
        setParseError("Failed to parse the file. Make sure it is a valid Excel (.xlsx, .xls) or CSV file.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // ── Calculate ─────────────────────────────────────────────────────────────
  function calculate(rows: RawRow[]) {
    setWeightWarning(null);
    setAutoCalculated(false);

    const hasWeights = rows.some(r => r.weight !== null);
    let assignedWeights: number[];

    if (!hasWeights) {
      // Auto equal weights
      const eq = 100 / rows.length;
      assignedWeights = rows.map(() => eq);
      setAutoCalculated(true);
    } else {
      // Check all have weights
      const missingWeight = rows.some(r => r.weight === null);
      if (missingWeight) {
        setWeightWarning("Some KPIs are missing KPI Weight %. Equal weights have been assigned to those KPIs.");
        const totalProvided = rows.reduce((s, r) => s + (r.weight ?? 0), 0);
        const missingCount = rows.filter(r => r.weight === null).length;
        const remaining = 100 - totalProvided;
        const eqForMissing = missingCount > 0 ? remaining / missingCount : 0;
        assignedWeights = rows.map(r => r.weight !== null ? r.weight : eqForMissing);
      } else {
        assignedWeights = rows.map(r => r.weight!);
      }

      const totalW = assignedWeights.reduce((s, w) => s + w, 0);
      const diff = Math.abs(totalW - 100);

      if (diff > 0.01) {
        if (weightErrorMode === "error") {
          setParseError(`KPI weights total ${totalW.toFixed(2)}% but must equal 100%. Please fix the weights in your file.`);
          return;
        } else {
          // normalize
          assignedWeights = assignedWeights.map(w => (w / totalW) * 100);
          setWeightWarning(`Weights totalled ${totalW.toFixed(2)}% — they have been normalized to 100%.`);
        }
      }
    }

    const capVal = capMode === "100" ? 100 : capMode === "120" ? 120 : Infinity;

    const resultRows: ResultRow[] = rows.map((r, i) => {
      let achievementPct: number;
      if (r.lowerIsBetter) {
        achievementPct = r.actual === 0 ? 100 : (r.target / r.actual) * 100;
      } else {
        achievementPct = r.target === 0 ? 100 : (r.actual / r.target) * 100;
      }
      const cappedAchievement = Math.min(achievementPct, capVal);
      const assignedWeight = assignedWeights[i];
      const weightedScore = (cappedAchievement * assignedWeight) / 100;
      const cappedWeightedScore = weightedScore;

      return {
        ...r,
        achievementPct,
        assignedWeight,
        weightedScore: (achievementPct * assignedWeight) / 100,
        cappedWeightedScore,
      };
    });

    const overall = resultRows.reduce((s, r) => s + r.cappedWeightedScore, 0);
    const cappedOverall = Math.min(overall, capVal);

    setResults(resultRows);
    setOverallScore(Math.round(cappedOverall * 100) / 100);
  }

  // ── Download Excel ────────────────────────────────────────────────────────
  function downloadExcel() {
    if (!results) return;
    const overall = overallScore ?? 0;

    const sheetData = results.map((r, i) => ({
      "KPI Name": r.kpiName,
      "Target": r.target,
      "Actual": r.actual,
      "Lower is Better": r.lowerIsBetter ? "Yes" : "No",
      "Achievement %": +r.achievementPct.toFixed(2),
      "KPI Weight %": +r.assignedWeight.toFixed(4),
      "Weighted Score": +r.cappedWeightedScore.toFixed(4),
      ...(i === 0 ? { "Overall Performance Score": +overall.toFixed(2) } : { "Overall Performance Score": "" }),
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);

    // Style header row (bold) — basic column widths
    ws["!cols"] = [
      { wch: 32 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
      { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 26 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Performance Score");
    XLSX.writeFile(wb, "performance_score_output.xlsx");
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseExcel(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseExcel(file);
  };

  function reset() {
    setFileName(null);
    setRawRows([]);
    setResults(null);
    setOverallScore(null);
    setWeightWarning(null);
    setParseError(null);
    setAutoCalculated(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Score colour ──────────────────────────────────────────────────────────
  function scoreColor(s: number) {
    if (s >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (s >= 70) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  }

  function achievementBadge(pct: number) {
    if (pct >= 100) return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-medium">{pct.toFixed(1)}%</Badge>;
    if (pct >= 80)  return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-xs font-medium">{pct.toFixed(1)}%</Badge>;
    return <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-medium">{pct.toFixed(1)}%</Badge>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Score</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload a KPI spreadsheet to calculate a weighted performance score for any department or period.
          </p>
        </div>
        {results && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset} data-testid="button-reset">
              <RotateCcw className="h-4 w-4 mr-1.5" /> Start Over
            </Button>
            <Button size="sm" onClick={downloadExcel} data-testid="button-download-excel">
              <Download className="h-4 w-4 mr-1.5" /> Download Results
            </Button>
          </div>
        )}
      </div>

      {/* Template hint */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-3 px-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your Excel file should have columns: <strong>KPI Name</strong>, <strong>Target</strong>, <strong>Actual</strong>.
            Optionally include <strong>Lower is Better</strong> (Yes/No, default No) and <strong>KPI Weight %</strong> (numbers that sum to 100).
            If weights are missing they will be auto-assigned equally.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Config */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Cap setting */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Achievement Cap</Label>
                <RadioGroup value={capMode} onValueChange={v => setCapMode(v as CapMode)} data-testid="radio-cap-mode">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="none" id="cap-none" data-testid="radio-cap-none" />
                    <Label htmlFor="cap-none" className="text-sm cursor-pointer">No cap</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="100" id="cap-100" data-testid="radio-cap-100" />
                    <Label htmlFor="cap-100" className="text-sm cursor-pointer">Cap at 100%</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="120" id="cap-120" data-testid="radio-cap-120" />
                    <Label htmlFor="cap-120" className="text-sm cursor-pointer">Cap at 120%</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Weight validation */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">If weights ≠ 100%</Label>
                <RadioGroup value={weightErrorMode} onValueChange={v => setWeightErrorMode(v as WeightErrorMode)} data-testid="radio-weight-mode">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="normalize" id="wm-normalize" data-testid="radio-wm-normalize" />
                    <Label htmlFor="wm-normalize" className="text-sm cursor-pointer">Auto-normalize</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="error" id="wm-error" data-testid="radio-wm-error" />
                    <Label htmlFor="wm-error" className="text-sm cursor-pointer">Show error</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Upload area */}
          {!results && (
            <Card
              className={cn(
                "border-2 border-dashed transition-colors cursor-pointer",
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
              )}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="card-upload-zone"
            >
              <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileSpreadsheet className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{fileName ?? "Upload your Excel file"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fileName ? `${rawRows.length} KPIs loaded` : "Drag & drop or click to browse"}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground/60">.xlsx · .xls · .csv</p>
              </CardContent>
            </Card>
          )}

          {/* Calculate button */}
          {rawRows.length > 0 && !results && (
            <Button className="w-full" onClick={() => calculate(rawRows)} data-testid="button-calculate">
              <Calculator className="h-4 w-4 mr-2" />
              Calculate Performance Score
            </Button>
          )}

          {/* After results: change file */}
          {results && (
            <Button variant="outline" className="w-full" onClick={reset} data-testid="button-change-file">
              <Upload className="h-4 w-4 mr-2" /> Upload Different File
            </Button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
            data-testid="input-file-upload"
          />
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Parse error */}
          {parseError && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
              <CardContent className="py-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">Error</p>
                  <pre className="text-xs text-red-600 dark:text-red-500 mt-1 whitespace-pre-wrap">{parseError}</pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weight warning */}
          {weightWarning && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="py-3 flex gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">{weightWarning}</p>
              </CardContent>
            </Card>
          )}

          {/* Auto-weight note */}
          {autoCalculated && results && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
              <CardContent className="py-3 flex gap-3">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  No KPI weights were found in the file. Equal weights ({(100 / (results?.length ?? 1)).toFixed(2)}% each) were automatically assigned.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Overall Score banner */}
          {results && overallScore !== null && (
            <Card className="bg-card border">
              <CardContent className="py-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Overall Performance Score</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {results.length} KPIs · {capMode !== "none" ? `capped at ${capMode}%` : "no cap"} ·{" "}
                    {autoCalculated ? "equal weights" : "weighted"}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("text-5xl font-bold tabular-nums", scoreColor(overallScore))}>
                    {overallScore.toFixed(1)}
                    <span className="text-2xl">%</span>
                  </p>
                  <div className="flex justify-end mt-1.5">
                    {overallScore >= 90 && (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Strong Performance
                      </Badge>
                    )}
                    {overallScore >= 70 && overallScore < 90 && (
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Needs Attention
                      </Badge>
                    )}
                    {overallScore < 70 && (
                      <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" /> Underperforming
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* KPI Table */}
          {results && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">KPI Breakdown</CardTitle>
                <CardDescription className="text-xs">Achievement % × Weight = Weighted Score</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-kpi-results">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">KPI Name</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Target</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Actual</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">Lower↓</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Achievement</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Weight</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Weighted Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-kpi-${i}`}>
                          <td className="px-4 py-2.5 font-medium max-w-[200px] truncate" title={r.kpiName}>{r.kpiName}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{r.target.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{r.actual.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-center">
                            {r.lowerIsBetter ? (
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Yes</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">No</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">{achievementBadge(Math.min(r.achievementPct, capMode === "100" ? 100 : capMode === "120" ? 120 : Infinity))}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{r.assignedWeight.toFixed(2)}%</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{r.cappedWeightedScore.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50 border-t-2">
                        <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overall Performance Score</td>
                        <td className="px-3 py-3 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                          {results.reduce((s, r) => s + r.assignedWeight, 0).toFixed(2)}%
                        </td>
                        <td className={cn("px-4 py-3 text-right text-lg font-bold tabular-nums", scoreColor(overallScore ?? 0))}>
                          {overallScore?.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {!results && !parseError && rawRows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <Calculator className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">No data yet</p>
              <p className="text-xs mt-1">Upload an Excel file to calculate your Performance Score</p>
            </div>
          )}

          {/* Loaded but not calculated */}
          {!results && rawRows.length > 0 && !parseError && (
            <div className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              <CheckCircle2 className="h-10 w-10 mb-3 text-emerald-500" />
              <p className="text-sm font-medium text-foreground">{rawRows.length} KPIs loaded from <span className="font-semibold">{fileName}</span></p>
              <p className="text-xs mt-1">Adjust configuration if needed, then click "Calculate Performance Score"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
