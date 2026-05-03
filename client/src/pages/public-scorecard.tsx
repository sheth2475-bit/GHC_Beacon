import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LabelList, Legend,
} from "recharts";
import {
  Loader2, Globe, AlertTriangle, AlertCircle, CheckCircle2,
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  Trophy, ArrowUpRight, ArrowDownRight, Minus, Maximize2, X,
  Download, FileImage, FileText, Presentation, ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getKpisForDept, getStatus, periodKey,
  MONTHS, type KpiDef, type Perspective,
} from "@/lib/scorecard-data";

// ── Perspective constants ────────────────────────────────────────────────────
const PERSPECTIVES: Perspective[] = ["Financial", "Customer", "Internal", "Learning"];
const PERSP_FULL: Record<Perspective, string> = {
  Financial: "Financial", Customer: "Customer", Internal: "Internal Process", Learning: "Learning",
};
const PERSP_WEIGHTS: Record<Perspective, number> = { Financial: 30, Customer: 25, Internal: 25, Learning: 20 };
const PERSP_COLORS: Record<Perspective, string> = {
  Financial: "#3B82F6", Customer: "#8B5CF6", Internal: "#F59E0B", Learning: "#10B981",
};
const PERSP_ICONS: Record<Perspective, string> = { Financial: "💲", Customer: "🎯", Internal: "⚙️", Learning: "💡" };
const PERSP_INITIALS: Record<Perspective, string> = { Financial: "F", Customer: "C", Internal: "I", Learning: "L" };
const P_COLOR: Record<Perspective, { accent: string; bg: string; text: string }> = {
  Financial: { accent: "#3B82F6", bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-300" },
  Customer: { accent: "#8B5CF6", bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300" },
  Internal: { accent: "#F59E0B", bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300" },
  Learning: { accent: "#10B981", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function performanceScore(kpis: KpiDef[], actuals: Record<string, number | null>, weights: Record<string, number>): number {
  const withData = kpis.filter(k => actuals[k.id] !== null && actuals[k.id] !== undefined);
  if (!withData.length) return 0;
  const hasUserWeights = withData.some(k => (weights[k.id] ?? 0) > 0);
  const equalWeight = 100 / withData.length;
  let totalScore = 0, totalWeight = 0;
  for (const k of withData) {
    const actual = Number(actuals[k.id]!);
    const w = hasUserWeights ? (weights[k.id] ?? 0) : equalWeight;
    let achievement: number;
    if (k.lowerIsBetter) {
      achievement = actual === 0 ? 100 : Math.min((k.target / actual) * 100, 100);
    } else {
      achievement = k.target === 0 ? 100 : Math.min((actual / k.target) * 100, 100);
    }
    totalScore += achievement * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

// ── Small UI components ───────────────────────────────────────────────────────
function PeriodSelector({ year, month, onChange }: { year: number; month: number; onChange: (y: number, m: number) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 border rounded-lg px-2 py-1.5 bg-background">
        <button onClick={() => onChange(year - 1, month)} className="p-0.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-sm font-semibold px-1 min-w-[38px] text-center">{year}</span>
        <button onClick={() => onChange(year + 1, month)} className="p-0.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex gap-1 flex-wrap">
        {MONTHS.map((m, i) => (
          <button key={m} onClick={() => onChange(year, i)}
            className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-all",
              i === month ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

function WidgetShell({ title, className, contentClassName, children, focusContent }: {
  title: string; className?: string; contentClassName?: string;
  children: React.ReactNode; focusContent?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <>
      {focused && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-background">
          <div className="flex items-center justify-between px-6 py-3 border-b bg-card shrink-0">
            <div className="flex items-center gap-2">
              <Maximize2 className="h-4 w-4 text-primary" />
              <span className="font-bold text-sm">{title}</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Focus Mode</span>
            </div>
            <button onClick={() => setFocused(false)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-3 py-1.5 hover:bg-muted/50 transition-colors">
              <X className="h-3.5 w-3.5" />Close
            </button>
          </div>
          <div className="flex-1 overflow-auto p-8 min-h-0">{focusContent ?? children}</div>
        </div>
      )}
      <Card className={className}>
        <div className="flex items-center justify-between px-5 pt-4 gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
          <button onClick={() => setFocused(true)}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/60 transition-colors group/focus"
            title="Focus mode">
            <Maximize2 className="h-3.5 w-3.5 text-muted-foreground group-hover/focus:text-primary" />
          </button>
        </div>
        <CardContent className={cn("pt-3 px-5 pb-5", contentClassName)}>
          {children}
        </CardContent>
      </Card>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
type DeptInfo = { id: string; name: string; icon: string; color: string };
type Store = Record<string, Record<string, number>>;

export default function PublicScorecard() {
  const [, params] = useRoute("/public/scorecard/:token");
  const token = params?.token ?? "";

  const { data, isLoading, error } = useQuery<{ dept: DeptInfo; store: Store; kpiDefinitions: KpiDef[] | null }>({
    queryKey: ["/api/public/scorecard", token],
    queryFn: () => fetch(`/api/public/scorecard/${token}`).then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); }),
    retry: false,
  });

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [dashFilter, setDashFilter] = useState<{ status: "green" | "amber" | "red" | null; perspective: string | null }>({ status: null, perspective: null });

  const exportRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const kpiSectionRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setExportMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportMenuOpen]);

  function sliceCanvas(src: HTMLCanvasElement, fromY: number, toY: number): HTMLCanvasElement {
    const sliceH = Math.max(1, Math.round(toY - fromY));
    const out = document.createElement("canvas");
    out.width = src.width; out.height = sliceH;
    out.getContext("2d")!.drawImage(src, 0, -Math.round(fromY));
    return out;
  }

  async function captureArea(): Promise<{ canvas: HTMLCanvasElement; breakPx: number }> {
    const html2canvas = (await import("html2canvas")).default;
    const el = exportRef.current!;
    const CAPTURE_W = 2400;
    const prevStyle = el.style.cssText;
    el.style.cssText += `;width:${CAPTURE_W}px!important;max-width:${CAPTURE_W}px!important;min-width:${CAPTURE_W}px!important;`;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    let breakPx = 0;
    if (kpiSectionRef.current) {
      const containerRect = el.getBoundingClientRect();
      const sectionRect = kpiSectionRef.current.getBoundingClientRect();
      breakPx = Math.round((sectionRect.top - containerRect.top) * 2);
    }
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false, allowTaint: false, windowWidth: CAPTURE_W, width: CAPTURE_W, height: el.scrollHeight, x: 0, y: 0 });
      return { canvas, breakPx };
    } finally {
      el.style.cssText = prevStyle;
    }
  }

  async function handleExportImage() {
    setExporting(true); setExportMenuOpen(false);
    try {
      const { canvas } = await captureArea();
      const link = document.createElement("a");
      link.download = `${data?.dept.name ?? "Scorecard"}_${MONTHS[month]}_${year}.png`;
      link.href = canvas.toDataURL("image/png"); link.click();
    } catch(e: any) { alert("Export failed: " + e.message); } finally { setExporting(false); }
  }

  async function handleExportPdf() {
    setExporting(true); setExportMenuOpen(false);
    try {
      const [{ jsPDF }, { canvas, breakPx }] = await Promise.all([import("jspdf"), captureArea()]);
      const PAGE_W = 420, PAGE_H = 297;
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
      const addSec = (sec: HTMLCanvasElement, first: boolean) => {
        const sh = (sec.height / sec.width) * PAGE_W;
        const np = Math.max(1, Math.ceil(sh / PAGE_H));
        const url = sec.toDataURL("image/jpeg", 0.94);
        for (let i = 0; i < np; i++) { if (!first || i > 0) doc.addPage("a3", "landscape"); doc.addImage(url, "JPEG", 0, -(i * PAGE_H), PAGE_W, sh); }
        return np;
      };
      const safe = breakPx > 10 && breakPx < canvas.height - 10 ? breakPx : 0;
      let total = addSec(sliceCanvas(canvas, 0, safe || canvas.height), true);
      if (safe > 0) total += addSec(sliceCanvas(canvas, safe, canvas.height), false);
      doc.save(`${data?.dept.name ?? "Scorecard"}_${MONTHS[month]}_${year}.pdf`);
    } catch(e: any) { alert("Export failed: " + e.message); } finally { setExporting(false); }
  }

  async function handleExportPptx() {
    setExporting(true); setExportMenuOpen(false);
    try {
      const [PptxMod, { canvas, breakPx }] = await Promise.all([import("pptxgenjs"), captureArea()]);
      const pres = new PptxMod.default(); pres.layout = "LAYOUT_WIDE";
      const SW = 13.33, SH = 7.5;
      const addSec = (sec: HTMLCanvasElement) => {
        const sh = (sec.height / sec.width) * SW;
        const ns = Math.max(1, Math.ceil(sh / SH));
        const url = sec.toDataURL("image/jpeg", 0.94);
        for (let i = 0; i < ns; i++) pres.addSlide().addImage({ data: url, x: 0, y: -(i * SH), w: SW, h: sh });
        return ns;
      };
      const safe = breakPx > 10 && breakPx < canvas.height - 10 ? breakPx : 0;
      addSec(sliceCanvas(canvas, 0, safe || canvas.height));
      if (safe > 0) addSec(sliceCanvas(canvas, safe, canvas.height));
      await pres.writeFile({ fileName: `${data?.dept.name ?? "Scorecard"}_${MONTHS[month]}_${year}.pptx` });
    } catch(e: any) { alert("Export failed: " + e.message); } finally { setExporting(false); }
  }

  // Auto-jump to most recent period with data
  useEffect(() => {
    if (!data?.store) return;
    const keys = Object.keys(data.store).sort().reverse();
    if (keys.length === 0) return;
    const latest = keys[0];
    const [y, m] = latest.split("-").map(Number);
    setYear(y); setMonth(m - 1);
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-semibold">Scorecard not available</h2>
        <p className="text-muted-foreground text-sm">This link may be disabled or invalid.</p>
      </div>
    );
  }

  return <ScorecardView dept={data.dept} store={data.store} kpiDefinitions={data.kpiDefinitions ?? null}
    year={year} month={month} setYear={setYear} setMonth={setMonth}
    dashFilter={dashFilter} setDashFilter={setDashFilter} />;
}

function ScorecardView({ dept, store, kpiDefinitions, year, month, setYear, setMonth, dashFilter, setDashFilter }: {
  dept: DeptInfo; store: Store; kpiDefinitions: KpiDef[] | null;
  year: number; month: number;
  setYear: (y: number) => void; setMonth: (m: number) => void;
  dashFilter: { status: "green" | "amber" | "red" | null; perspective: string | null };
  setDashFilter: (f: { status: "green" | "amber" | "red" | null; perspective: string | null }) => void;
}) {
  const weights: Record<string, number> = {};
  // Use stored kpiDefinitions only if they actually have matching data in the store.
  // If the definitions are stale (e.g. KPIs were replaced since sharing), fall back to built-in.
  const candidateKpis = (kpiDefinitions && kpiDefinitions.length > 0) ? kpiDefinitions : getKpisForDept(dept.id);
  const allStoreIds = new Set(Object.values(store ?? {}).flatMap(v => Object.keys(v)));
  const hasMatch = candidateKpis.some(k => allStoreIds.has(k.id));
  const kpis = hasMatch ? candidateKpis : getKpisForDept(dept.id);
  const pk = periodKey(year, month);
  const ppk = month === 0 ? periodKey(year - 1, 11) : periodKey(year, month - 1);

  const getActual = useCallback((id: string, p = pk): number | null => {
    const v = store?.[p]?.[id]; return v !== undefined ? Number(v) : null;
  }, [store, pk]);

  const allActuals: Record<string, number | null> = {};
  kpis.forEach(k => { allActuals[k.id] = getActual(k.id); });
  const hp = performanceScore(kpis, allActuals, weights);
  const onTrack = kpis.filter(k => getStatus(k, allActuals[k.id]) === "green").length;
  const atRisk = kpis.filter(k => getStatus(k, allActuals[k.id]) === "amber").length;
  const offTrack = kpis.filter(k => getStatus(k, allActuals[k.id]) === "red").length;

  const statusLabel = hp >= 95 ? "Excellent" : hp >= 85 ? "On Track" : hp >= 70 ? "Needs Attention" : "Critical";
  const statusColor = hp >= 95 ? "#10b981" : hp >= 85 ? "#3b82f6" : hp >= 70 ? "#f59e0b" : "#ef4444";

  const perspScores = useMemo(() => PERSPECTIVES.map(p => {
    const pkpis = kpis.filter(k => k.perspective === p);
    const pActs: Record<string, number | null> = {};
    const pPrev: Record<string, number | null> = {};
    pkpis.forEach(k => { pActs[k.id] = getActual(k.id); pPrev[k.id] = getActual(k.id, ppk); });
    const score = performanceScore(pkpis, pActs, weights);
    const prevScore = performanceScore(pkpis, pPrev, weights);
    const trend = score - prevScore;
    const label = score >= 95 ? "Excellent" : score >= 85 ? "On Track" : score >= 70 ? "Needs Attention" : "Critical";
    const color = score >= 95 ? "#10b981" : score >= 85 ? "#3b82f6" : score >= 70 ? "#f59e0b" : "#ef4444";
    return { p, score, prevScore, trend, label, color };
  }), [kpis, store, pk, ppk]);

  const scoreTrend = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    let m = month - 6 + i; let y = year;
    while (m < 0) { m += 12; y--; }
    const p = periodKey(y, m);
    const acts: Record<string, number | null> = {};
    kpis.forEach(k => { const v = store?.[p]?.[k.id]; acts[k.id] = v !== undefined ? Number(v) : null; });
    return { label: `${MONTHS[m]} ${String(y).slice(2)}`, score: performanceScore(kpis, acts, weights) };
  }), [kpis, store, year, month]);

  const kpiData = useMemo(() => kpis.map(k => {
    const actual = getActual(k.id);
    const ach = actual === null ? null
      : k.lowerIsBetter ? (actual === 0 ? 100 : Math.min((k.target / actual) * 100, 100))
        : (k.target === 0 ? 100 : Math.min((actual / k.target) * 100, 100));
    const w = 100 / kpis.length;
    return { kpi: k, actual, ach, status: getStatus(k, actual), w };
  }), [kpis, store, pk]);

  const topKpis = useMemo(() => [...kpiData].filter(d => d.ach !== null).sort((a, b) => b.ach! - a.ach!).slice(0, 5), [kpiData]);
  const lowestKpis = useMemo(() => [...kpiData].filter(d => d.ach !== null).sort((a, b) => a.ach! - b.ach!).slice(0, 5), [kpiData]);
  const prevHp = scoreTrend.length >= 2 ? scoreTrend[scoreTrend.length - 2].score : undefined;

  const applyFilter = (update: { status?: "green" | "amber" | "red" | null; perspective?: string | null }) => {
    setDashFilter({
      status: "status" in update ? (dashFilter.status === update.status ? null : (update.status ?? null)) : dashFilter.status,
      perspective: "perspective" in update ? (dashFilter.perspective === update.perspective ? null : (update.perspective ?? null)) : dashFilter.perspective,
    });
  };
  const clearFilter = () => setDashFilter({ status: null, perspective: null });

  const filteredKpis = useMemo(() => {
    return kpis.filter(k => {
      const actual = getActual(k.id);
      const st = getStatus(k, actual);
      if (dashFilter.status && st !== dashFilter.status) return false;
      if (dashFilter.perspective && k.perspective !== dashFilter.perspective) return false;
      return true;
    });
  }, [kpis, dashFilter, store, pk]);

  const statusOrder: Record<string, number> = { red: 0, amber: 1, green: 2, none: 3 };
  const sortedFilteredKpis = useMemo(() => [...filteredKpis].sort((a, b) => {
    const aS = getStatus(a, getActual(a.id)) || "none";
    const bS = getStatus(b, getActual(b.id)) || "none";
    return (statusOrder[aS] ?? 3) - (statusOrder[bS] ?? 3);
  }), [filteredKpis, store, pk]);

  const pieData = [
    { name: "On Track", value: onTrack, color: "#10b981" },
    { name: "At Risk", value: atRisk, color: "#f59e0b" },
    { name: "Off Track", value: offTrack, color: "#ef4444" },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/ghc-beacon-logo.jpg" alt="GHC Beacon" className="h-8 w-8 rounded-md object-cover" />
          <span className="font-bold text-lg tracking-tight">GHC Beacon</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setExportMenuOpen(o => !o)}
              disabled={exporting}
              className="flex items-center gap-1.5 text-xs font-medium border rounded-lg px-3 py-1.5 hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-9 z-50 bg-card border rounded-xl shadow-lg p-1.5 w-48">
                <button onClick={handleExportImage} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted/60 transition-colors text-left">
                  <FileImage className="h-4 w-4 text-muted-foreground" />Image (PNG)
                </button>
                <button onClick={handleExportPdf} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted/60 transition-colors text-left">
                  <FileText className="h-4 w-4 text-muted-foreground" />PDF (A3 Landscape)
                </button>
                <button onClick={handleExportPptx} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-muted/60 transition-colors text-left">
                  <Presentation className="h-4 w-4 text-muted-foreground" />PowerPoint
                </button>
              </div>
            )}
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <Globe className="h-3 w-3" /> Public Scorecard
          </Badge>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6" ref={exportRef}>

        {/* Dept header + period + health */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: `${dept.color}18` }}>
              {dept.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{dept.name}</h1>
              <p className="text-sm text-muted-foreground">Balanced Scorecard · {MONTHS[month]} {year}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Performance Score</p>
              <svg width={56} height={56} style={{ transform: "rotate(-90deg)" }}>
                {(() => {
                  const r = 24, c = 2 * Math.PI * r;
                  const color = hp >= 75 ? "#10b981" : hp >= 50 ? "#f59e0b" : "#ef4444";
                  return (<>
                    <circle cx={28} cy={28} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={5} />
                    <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={5}
                      strokeDasharray={`${(hp / 100) * c} ${c}`} strokeLinecap="round" />
                    <text x={28} y={28} dominantBaseline="middle" textAnchor="middle"
                      fill={color} fontSize={11} fontWeight="700"
                      style={{ transform: "rotate(90deg)", transformOrigin: "28px 28px" }}>{hp}%</text>
                  </>);
                })()}
              </svg>
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />{onTrack} on track</span>
              <span className="flex items-center gap-1.5 text-amber-600"><AlertTriangle className="h-3.5 w-3.5" />{atRisk} at risk</span>
              <span className="flex items-center gap-1.5 text-red-600"><AlertCircle className="h-3.5 w-3.5" />{offTrack} off track</span>
            </div>
          </div>
        </div>

        {/* Period selector */}
        <PeriodSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />

        {/* ── Row 1: Overall Score + Perspective Performance ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Overall Performance Score */}
          <WidgetShell title="Overall Performance Score" className="lg:col-span-2"
            focusContent={
              <div className="flex flex-col items-center justify-center h-full gap-8">
                <div className="relative">
                  <PieChart width={220} height={220}>
                    <Pie data={[{ value: hp }, { value: 100 - hp }]} cx="50%" cy="50%"
                      innerRadius={76} outerRadius={104} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0} label={({ value, index }) => index === 0 ? value : ""} labelLine={false}>
                      <Cell fill={statusColor} />
                      <Cell fill="hsl(var(--muted))" />
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Trophy className="h-8 w-8 mb-1" style={{ color: statusColor }} />
                    <p className="text-4xl font-extrabold tabular-nums" style={{ color: statusColor }}>{hp}%</p>
                    <p className="text-sm font-semibold" style={{ color: statusColor }}>{statusLabel}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-8 text-center">
                  <div><p className="text-4xl font-bold text-emerald-600">{onTrack}</p><p className="text-sm text-muted-foreground">On Track</p></div>
                  <div><p className="text-4xl font-bold text-amber-500">{atRisk}</p><p className="text-sm text-muted-foreground">At Risk</p></div>
                  <div><p className="text-4xl font-bold text-red-600">{offTrack}</p><p className="text-sm text-muted-foreground">Off Track</p></div>
                </div>
              </div>
            }
          >
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <PieChart width={110} height={110}>
                  <Pie data={[{ value: hp }, { value: 100 - hp }]} cx="50%" cy="50%"
                    innerRadius={38} outerRadius={52} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0} label={({ value, index }) => index === 0 ? value : ""} labelLine={false}>
                    <Cell fill={statusColor} />
                    <Cell fill="hsl(var(--muted))" />
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Trophy className="h-5 w-5" style={{ color: statusColor }} />
                </div>
              </div>
              <div>
                <p className="text-4xl font-extrabold tabular-nums leading-none" style={{ color: statusColor }}>{hp}%</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <CheckCircle2 className="h-4 w-4" style={{ color: statusColor }} />
                  <span className="text-sm font-semibold" style={{ color: statusColor }}>{statusLabel}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Target: ≥ 85%</p>
                <p className="text-xs text-muted-foreground">{MONTHS[month]} {year}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 border-t pt-3 text-center">
              {[
                { label: "On Track", count: onTrack, st: "green" as const, cls: "text-emerald-600", ring: "ring-emerald-400" },
                { label: "At Risk", count: atRisk, st: "amber" as const, cls: "text-amber-500", ring: "ring-amber-400" },
                { label: "Off Track", count: offTrack, st: "red" as const, cls: "text-red-600", ring: "ring-red-400" },
              ].map(({ label, count, st, cls, ring }) => (
                <button key={st}
                  onClick={() => applyFilter({ status: st })}
                  className={cn("rounded-lg py-1.5 transition-all cursor-pointer hover:bg-muted/50",
                    dashFilter.status === st && `ring-2 ${ring} bg-muted/30`)}>
                  <p className={cn("text-xl font-bold", cls)}>{count}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </button>
              ))}
            </div>
          </WidgetShell>

          {/* Perspective Performance */}
          <WidgetShell title="Balanced Scorecard Perspective Performance" className="lg:col-span-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {perspScores.map(({ p, score, trend, label, color }) => (
                <button key={p}
                  onClick={() => applyFilter({ perspective: p })}
                  className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border bg-muted/30 transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer text-left",
                    dashFilter.perspective === p && "ring-2 ring-offset-1")}
                  style={dashFilter.perspective === p ? { outline: `2px solid ${color}` } : undefined}>
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-lg"
                    style={{ background: PERSP_COLORS[p as Perspective] + "20" }}>
                    {PERSP_ICONS[p as Perspective]}
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center leading-tight">
                    {PERSP_FULL[p as Perspective]}
                  </p>
                  <p className="text-2xl font-extrabold tabular-nums" style={{ color }}>{score}%</p>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: color + "20", color }}>{label}</span>
                  <div className="flex items-center gap-0.5 text-xs" style={{ color: trend >= 0 ? "#10b981" : "#ef4444" }}>
                    {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
                  </div>
                </button>
              ))}
            </div>
          </WidgetShell>
        </div>

        {/* ── Row 2: Score Trend + Score by Perspective + Status Summary ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Score Trend */}
          <WidgetShell title="Score Trend (Overall)" contentClassName="px-3 pb-3"
            focusContent={
              <div className="h-full min-h-[400px] flex flex-col">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreTrend} margin={{ top: 20, right: 20, bottom: 10, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 13 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 13 }} />
                    <Tooltip contentStyle={{ fontSize: 13, borderRadius: 6 }} formatter={(v: any) => [`${v}%`, "Score"]} />
                    <Line type="monotone" dataKey="score" stroke={statusColor} strokeWidth={3}
                      dot={{ r: 5, fill: statusColor }} activeDot={{ r: 7 }}>
                      <LabelList dataKey="score" position="top" content={(p: any) => {
                        const { x, y, value } = p;
                        if (!value || x == null || y == null) return null;
                        return <text x={x} y={y - 10} fill={statusColor} fontSize={12} textAnchor="middle" fontWeight={700}>{value}%</text>;
                      }} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={scoreTrend} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid hsl(var(--border))" }}
                  formatter={(v: any) => [`${v}%`, "Score"]} />
                <Line type="monotone" dataKey="score" stroke={statusColor} strokeWidth={2.5}
                  dot={{ r: 3, fill: statusColor }} activeDot={{ r: 5 }}>
                  <LabelList dataKey="score" position="top" content={(p: any) => {
                    const { x, y, value } = p;
                    if (value === 0 || x === undefined || y === undefined) return null;
                    return <text x={x} y={y - 6} fill={statusColor} fontSize={9} textAnchor="middle" fontWeight={700}>{value}%</text>;
                  }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </WidgetShell>

          {/* Score by Perspective (Weighted) */}
          <WidgetShell title="Score by Perspective (Weighted)"
            focusContent={
              <div className="flex flex-col items-center justify-center h-full gap-8">
                <div className="relative">
                  <PieChart width={260} height={260}>
                    <Pie data={perspScores.map(ps => ({ name: ps.p, value: PERSP_WEIGHTS[ps.p as Perspective] }))}
                      cx="50%" cy="50%" innerRadius={70} outerRadius={120} dataKey="value"
                      strokeWidth={2} stroke="hsl(var(--background))" label={({ value }) => `${value}%`} labelLine={false}>
                      {perspScores.map(ps => <Cell key={ps.p} fill={PERSP_COLORS[ps.p as Perspective]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, name: string) => [`${v}%`, name]} contentStyle={{ fontSize: 12 }} />
                    <Legend />
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold" style={{ color: statusColor }}>{hp}%</p>
                    <p className="text-xs text-muted-foreground">Overall</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                  {perspScores.map(({ p, score }) => (
                    <div key={p} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: PERSP_COLORS[p as Perspective] }} />
                        <span className="text-sm">{PERSP_FULL[p as Perspective]}</span>
                      </div>
                      <span className="font-bold">{score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            }
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <PieChart width={110} height={110}>
                  <Pie data={perspScores.map(ps => ({ name: ps.p, value: PERSP_WEIGHTS[ps.p as Perspective] }))}
                    cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="value" strokeWidth={1} stroke="hsl(var(--background))" label={({ value }) => `${value}%`} labelLine={false}>
                    {perspScores.map(ps => <Cell key={ps.p} fill={PERSP_COLORS[ps.p as Perspective]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, name: string) => [`${v}%`, name]} contentStyle={{ fontSize: 10, borderRadius: 6 }} />
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-sm font-bold tabular-nums" style={{ color: statusColor }}>{hp}%</p>
                  <p className="text-[8px] text-muted-foreground">Overall</p>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                {perspScores.map(({ p, score }) => (
                  <button key={p} onClick={() => applyFilter({ perspective: p })}
                    className={cn("w-full flex items-center justify-between gap-2 text-xs rounded px-1 py-0.5 transition-colors hover:bg-muted/60 cursor-pointer",
                      dashFilter.perspective === p && "bg-muted/50 font-semibold")}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PERSP_COLORS[p as Perspective] }} />
                      <span className="text-muted-foreground">{PERSP_FULL[p as Perspective]}</span>
                    </div>
                    <div className="flex gap-3 tabular-nums">
                      <span className="font-semibold">{score}%</span>
                      <span className="text-muted-foreground w-6 text-right">{PERSP_WEIGHTS[p as Perspective]}%</span>
                    </div>
                  </button>
                ))}
                <div className="flex justify-end gap-3 text-[10px] text-muted-foreground border-t pt-1 mt-1">
                  <span>Score</span><span className="w-6 text-right">Wt.</span>
                </div>
              </div>
            </div>
          </WidgetShell>

          {/* Performance Status Summary */}
          <WidgetShell title="Performance Status Summary"
            focusContent={
              <div className="flex flex-col items-center justify-center h-full gap-8">
                <div className="relative">
                  <PieChart width={260} height={260}>
                    <Pie data={pieData.length ? pieData : [{ name: "No data", value: 1, color: "#e5e7eb" }]}
                      cx="50%" cy="50%" innerRadius={70} outerRadius={120} dataKey="value"
                      strokeWidth={2} stroke="hsl(var(--background))" label={({ value }) => value} labelLine={false}>
                      {(pieData.length ? pieData : [{ color: "#e5e7eb" }]).map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend />
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold">{kpis.length}</p>
                    <p className="text-xs text-muted-foreground">Total KPIs</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-4xl font-bold text-emerald-600">{onTrack}</p><p className="text-sm text-muted-foreground">On Track ≥95%</p></div>
                  <div><p className="text-4xl font-bold text-amber-500">{atRisk}</p><p className="text-sm text-muted-foreground">At Risk 80–94%</p></div>
                  <div><p className="text-4xl font-bold text-red-600">{offTrack}</p><p className="text-sm text-muted-foreground">Off Track &lt;80%</p></div>
                </div>
              </div>
            }
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <PieChart width={110} height={110}>
                  <Pie data={pieData.length ? pieData : [{ name: "No data", value: 1, color: "#e5e7eb" }]}
                    cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="value" strokeWidth={1} stroke="hsl(var(--background))" label={({ value }) => value} labelLine={false}>
                    {(pieData.length ? pieData : [{ color: "#e5e7eb" }]).map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-sm font-bold">{kpis.length}</p>
                  <p className="text-[8px] text-muted-foreground">Total KPIs</p>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {[
                  { label: "On Track", count: onTrack, color: "#10b981", note: "(≥ 95%)", st: "green" as const },
                  { label: "At Risk", count: atRisk, color: "#f59e0b", note: "(80–94%)", st: "amber" as const },
                  { label: "Off Track", count: offTrack, color: "#ef4444", note: "(< 80%)", st: "red" as const },
                ].map(({ label, count, color, note, st }) => (
                  <button key={label} onClick={() => applyFilter({ status: st })}
                    className={cn("w-full flex items-center justify-between text-xs rounded px-1 py-0.5 transition-colors hover:bg-muted/60 cursor-pointer",
                      dashFilter.status === st && "bg-muted/50 font-semibold")}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-muted-foreground">{label} <span className="text-[10px]">{note}</span></span>
                    </div>
                    <div className="flex gap-2 tabular-nums">
                      <span className="font-semibold">{count}</span>
                      <span className="text-muted-foreground">{kpis.length ? Math.round(count / kpis.length * 100) : 0}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </WidgetShell>
        </div>

        {/* ── Row 3: Top KPIs + Lowest Performing ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <WidgetShell title="Top KPIs Performance Overview" contentClassName="p-0 pb-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-y bg-muted/30">
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">KPI</th>
                  <th className="text-left px-2 py-2 font-semibold text-muted-foreground">Persp.</th>
                  <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Target</th>
                  <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Actual</th>
                  <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Ach %</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topKpis.map(({ kpi: k, actual, ach, status }) => {
                  const pc = P_COLOR[k.perspective];
                  const achColor = ach! >= 95 ? "#10b981" : ach! >= 80 ? "#f59e0b" : "#ef4444";
                  return (
                    <tr key={k.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-2.5 font-medium max-w-[140px]"><span className="line-clamp-1">{k.name}</span></td>
                      <td className="px-2 py-2.5">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", pc.bg, pc.text)}>
                          {PERSP_INITIALS[k.perspective]}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right text-muted-foreground tabular-nums">{k.target}{k.unit}</td>
                      <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{actual !== null ? `${actual}${k.unit}` : "—"}</td>
                      <td className="px-2 py-2.5 text-right font-bold tabular-nums" style={{ color: achColor }}>
                        {ach !== null ? `${ach.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                          status === "green" ? "bg-emerald-100 text-emerald-700" : status === "amber" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                          {status === "green" ? "On Track" : status === "amber" ? "At Risk" : "Critical"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </WidgetShell>

          <WidgetShell title="Lowest Performing KPIs" contentClassName="p-0 pb-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-y bg-muted/30">
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">KPI</th>
                  <th className="text-left px-2 py-2 font-semibold text-muted-foreground">Persp.</th>
                  <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Ach %</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lowestKpis.map(({ kpi: k, ach, status }) => {
                  const pc = P_COLOR[k.perspective];
                  const achColor = ach! >= 95 ? "#10b981" : ach! >= 80 ? "#f59e0b" : "#ef4444";
                  return (
                    <tr key={k.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-2.5 font-medium max-w-[180px]"><span className="line-clamp-1">{k.name}</span></td>
                      <td className="px-2 py-2.5">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", pc.bg, pc.text)}>
                          {PERSP_INITIALS[k.perspective]}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right font-bold tabular-nums" style={{ color: achColor }}>
                        {ach !== null ? `${ach.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                          status === "green" ? "bg-emerald-100 text-emerald-700" : status === "amber" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                          {status === "green" ? "On Track" : status === "amber" ? "At Risk" : "Critical"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </WidgetShell>
        </div>

        {/* ── KPI Scorecard Table ── */}
        <div ref={kpiSectionRef}>
        <WidgetShell
          title={`KPI Scorecard — ${MONTHS[month]} ${year}`}
          contentClassName="p-0 pb-0 mt-3"
        >
          {(dashFilter.status || dashFilter.perspective) && (
            <div className="flex items-center gap-1.5 px-5 pb-2">
              {dashFilter.status && (
                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                  dashFilter.status === "green" ? "bg-emerald-100 text-emerald-700" :
                  dashFilter.status === "amber" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                  {dashFilter.status === "green" ? "On Track" : dashFilter.status === "amber" ? "At Risk" : "Off Track"}
                </span>
              )}
              {dashFilter.perspective && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ background: PERSP_COLORS[dashFilter.perspective as Perspective] + "20", color: PERSP_COLORS[dashFilter.perspective as Perspective] }}>
                  {PERSP_FULL[dashFilter.perspective as Perspective]}
                </span>
              )}
              <button onClick={clearFilter}
                className="h-4 w-4 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/40 flex items-center justify-center transition-colors"
                title="Clear filter">
                <X className="h-2.5 w-2.5" />
              </button>
              <span className="text-xs text-muted-foreground">{sortedFilteredKpis.length} of {kpis.length} KPIs</span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">KPI Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Perspective</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Target</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Actual</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Ach %</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Weight %</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sortedFilteredKpis.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No KPIs match the current filter.{" "}
                      <button onClick={clearFilter} className="underline text-primary hover:text-primary/80">Clear filter</button>
                    </td>
                  </tr>
                )}
                {sortedFilteredKpis.map(k => {
                  const d = kpiData.find(x => x.kpi.id === k.id)!;
                  const actual = d?.actual ?? null;
                  const ach = d?.ach ?? null;
                  const st = d?.status ?? "nodata";
                  const pc = P_COLOR[k.perspective];
                  const prev = getActual(k.id, ppk);
                  const rawDelta = actual !== null && prev !== null ? actual - prev : null;
                  const goodDelta = rawDelta !== null ? (k.lowerIsBetter ? -rawDelta : rawDelta) : null;
                  const achColor = ach === null ? undefined : ach >= 95 ? "#10b981" : ach >= 80 ? "#f59e0b" : "#ef4444";
                  const rowBg = st === "red" ? "bg-red-50/40 dark:bg-red-950/10" : st === "amber" ? "bg-amber-50/40 dark:bg-amber-950/10" : "";
                  return (
                    <tr key={k.id} className={cn("hover:bg-muted/50 transition-colors", rowBg)}>
                      <td className="px-4 py-3">
                        <div className={cn("w-2.5 h-2.5 rounded-full mx-auto",
                          st === "green" ? "bg-emerald-500" : st === "amber" ? "bg-amber-500" : st === "red" ? "bg-red-500" : "bg-muted-foreground/30")} />
                      </td>
                      <td className="px-4 py-3 font-medium max-w-[200px]"><span className="line-clamp-1">{k.name}</span></td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", pc.bg, pc.text)}>
                          {PERSP_FULL[k.perspective]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                        {k.target}<span className="text-xs ml-0.5">{k.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">
                        {actual !== null ? <>{actual}<span className="text-xs text-muted-foreground ml-1 font-normal">{k.unit}</span></> : <span className="text-muted-foreground font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: achColor }}>
                        {ach !== null ? `${ach.toFixed(1)}%` : <span className="text-muted-foreground font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                        {d ? `${d.w.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {goodDelta !== null
                          ? <span className="inline-flex items-center gap-0.5 text-xs font-semibold"
                            style={{ color: goodDelta > 0 ? "#10b981" : goodDelta < 0 ? "#ef4444" : "#94a3b8" }}>
                            {goodDelta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : goodDelta < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                            {Math.abs(rawDelta!).toFixed(1)}
                          </span>
                          : <span className="text-muted-foreground/50 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </WidgetShell>
        </div>
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Powered by <span className="font-semibold text-foreground">GHC Beacon</span>
      </footer>
    </div>
  );
}
