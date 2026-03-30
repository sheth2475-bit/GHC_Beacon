import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Presentation, Plus, Sparkles, ChevronRight, ChevronLeft, ArrowLeft,
  FileText, BarChart3, Target, FolderOpen, Workflow, BookOpen, Upload,
  Wand2, Check, Trash2, Download, Clock, Save, Eye,
  Copy, RefreshCw, X, Type, List, BarChart2, Quote,
  Columns, Minus, PlayCircle, History, Globe, FileOutput,
  ChevronDown, AlignLeft, MoreHorizontal, Paperclip, GripVertical,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type SlideType = "title" | "agenda" | "content" | "two-column" | "data" | "quote" | "section" | "closing";
type Theme = "executive-dark" | "clean-light" | "bold-purple" | "fresh-teal" | "minimal-gray" | "warm-amber";
type SourceType = "kpis" | "projects" | "workflow" | "reviews" | "analytics";
type View = "home" | "outline" | "generating" | "editor";

interface Slide {
  id: string; type: SlideType; title: string;
  subtitle?: string; bullets?: string[];
  stat?: { value: string; label: string; change?: string }[];
  quote?: string; notes?: string; emphasis?: string;
}

interface OutlineItem {
  id: string; type: SlideType; title: string; description: string;
}

interface Brief {
  title: string; audience: string; objective: string; tone: string;
  deckType: string; targetSlides: number; designStyle: string;
  instructions: string; prompt: string;
}

interface PresentationRecord {
  id: number; title: string; status: string; theme: string;
  slides: Slide[]; outline: OutlineItem[]; brief: Brief;
  sourceTypes: SourceType[]; version: number;
  createdAt: string; updatedAt: string;
}

// ── Theme definitions ─────────────────────────────────────────────────────────
const THEMES: Record<Theme, {
  label: string; bg: string; titleColor: string; bodyColor: string;
  accent: string; subtleColor: string; cardBg: string; borderColor: string; preview: string;
}> = {
  "executive-dark": { label: "Executive Dark", bg: "#0f1929", titleColor: "#f59e0b", bodyColor: "#e2e8f0", accent: "#f59e0b", subtleColor: "#64748b", cardBg: "#1e293b", borderColor: "#334155", preview: "from-slate-900 to-slate-800" },
  "clean-light":   { label: "Clean Light",    bg: "#ffffff",  titleColor: "#0f172a", bodyColor: "#475569", accent: "#3b82f6", subtleColor: "#94a3b8", cardBg: "#f1f5f9", borderColor: "#e2e8f0", preview: "from-white to-slate-50" },
  "bold-purple":   { label: "Bold Purple",    bg: "#2e1065",  titleColor: "#e9d5ff", bodyColor: "#ddd6fe", accent: "#a78bfa", subtleColor: "#7c3aed", cardBg: "#4c1d95", borderColor: "#6d28d9", preview: "from-purple-950 to-purple-900" },
  "fresh-teal":    { label: "Fresh Teal",     bg: "#0f4c4c",  titleColor: "#ccfbf1", bodyColor: "#99f6e4", accent: "#2dd4bf", subtleColor: "#0f766e", cardBg: "#134e4a", borderColor: "#0d9488", preview: "from-teal-950 to-teal-900" },
  "minimal-gray":  { label: "Minimal",        bg: "#f8fafc",  titleColor: "#0f172a", bodyColor: "#334155", accent: "#6366f1", subtleColor: "#94a3b8", cardBg: "#f1f5f9", borderColor: "#cbd5e1", preview: "from-slate-50 to-gray-100" },
  "warm-amber":    { label: "Warm Amber",     bg: "#1c0a00",  titleColor: "#fde68a", bodyColor: "#fef3c7", accent: "#f59e0b", subtleColor: "#92400e", cardBg: "#2d1200", borderColor: "#78350f", preview: "from-amber-950 to-amber-900" },
};

const SOURCE_CHIPS: { key: SourceType; label: string; icon: typeof Target; color: string }[] = [
  { key: "kpis",      label: "KPI Data",        icon: Target,     color: "text-blue-500" },
  { key: "projects",  label: "Projects",         icon: FolderOpen, color: "text-emerald-500" },
  { key: "workflow",  label: "Workflow",         icon: Workflow,   color: "text-orange-500" },
  { key: "reviews",   label: "Monthly Reviews",  icon: BookOpen,   color: "text-pink-500" },
  { key: "analytics", label: "Analytics",        icon: BarChart3,  color: "text-cyan-500" },
];

const SLIDE_TYPE_ICONS: Record<SlideType, typeof Type> = {
  title: Type, agenda: List, content: AlignLeft, "two-column": Columns,
  data: BarChart2, quote: Quote, section: Minus, closing: PlayCircle,
};

const SLIDE_TYPE_LABELS: Record<SlideType, string> = {
  title: "Title Slide", agenda: "Agenda", content: "Content", "two-column": "Two Column",
  data: "Data / Stats", quote: "Quote", section: "Section", closing: "Closing",
};

// ── Slide Canvas ──────────────────────────────────────────────────────────────
function SlideCanvas({ slide, theme }: { slide: Slide; theme: Theme }) {
  const t = THEMES[theme] || THEMES["executive-dark"];
  const base: React.CSSProperties = {
    background: t.bg, width: "100%", aspectRatio: "16/9",
    fontFamily: "'Inter', system-ui, sans-serif", position: "relative", overflow: "hidden",
  };
  const bar: React.CSSProperties = { position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: t.accent };
  const logo = <div style={{ position: "absolute", bottom: "4%", right: "4%", fontSize: "8px", color: t.subtleColor, fontWeight: 600, letterSpacing: "0.08em", opacity: 0.5 }}>PERFORMO AI</div>;

  if (slide.type === "title") return (
    <div style={base}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg,${t.bg} 0%,${t.cardBg} 100%)` }} />
      <div style={{ position: "absolute", top: "8%", left: "8%", right: "8%", height: "3px", background: t.accent, borderRadius: "2px" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8%", textAlign: "center" }}>
        <div style={{ color: t.titleColor, fontWeight: 700, fontSize: "clamp(14px,3vw,28px)", lineHeight: 1.1, marginBottom: "3%" }}>{slide.title}</div>
        {slide.subtitle && <div style={{ color: t.bodyColor, fontSize: "clamp(9px,1.5vw,14px)", opacity: 0.75 }}>{slide.subtitle}</div>}
        {slide.emphasis && <div style={{ marginTop: "5%", padding: "1.5% 4%", border: `1px solid ${t.accent}`, borderRadius: "4px", color: t.accent, fontSize: "clamp(7px,1.2vw,11px)", letterSpacing: "0.1em" }}>{slide.emphasis}</div>}
      </div>
      {logo}
    </div>
  );

  if (slide.type === "quote") return (
    <div style={base}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg,${t.cardBg} 0%,${t.bg} 100%)` }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8% 14%", textAlign: "center" }}>
        <div style={{ color: t.accent, fontSize: "clamp(20px,5vw,48px)", lineHeight: 0.8, marginBottom: "3%", opacity: 0.5 }}>"</div>
        <div style={{ color: t.bodyColor, fontSize: "clamp(9px,1.6vw,16px)", fontStyle: "italic", lineHeight: 1.5 }}>{slide.quote || slide.title}</div>
        {slide.subtitle && <div style={{ color: t.accent, fontSize: "clamp(7px,1vw,10px)", marginTop: "4%", letterSpacing: "0.1em" }}>— {slide.subtitle}</div>}
      </div>
      {logo}
    </div>
  );

  if (slide.type === "section") return (
    <div style={base}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg,${t.accent}20 0%,${t.bg} 60%)` }} />
      <div style={bar} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "8% 10%" }}>
        <div style={{ color: t.accent, fontSize: "clamp(7px,1vw,10px)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "2%", fontWeight: 600 }}>SECTION</div>
        <div style={{ color: t.titleColor, fontWeight: 700, fontSize: "clamp(14px,3vw,28px)" }}>{slide.title}</div>
        {slide.subtitle && <div style={{ color: t.bodyColor, fontSize: "clamp(8px,1.2vw,12px)", marginTop: "2%", opacity: 0.7 }}>{slide.subtitle}</div>}
      </div>
      {logo}
    </div>
  );

  if (slide.type === "data") {
    const stats = slide.stat?.length ? slide.stat : [{ value: "—", label: "Metric" }, { value: "—", label: "Metric" }, { value: "—", label: "Metric" }];
    return (
      <div style={base}>
        <div style={bar} />
        <div style={{ position: "absolute", inset: 0, padding: "5% 7%" }}>
          <div style={{ color: t.titleColor, fontWeight: 700, fontSize: "clamp(10px,1.8vw,18px)", marginBottom: "4%", paddingLeft: "3%" }}>{slide.title}</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, 1fr)`, gap: "3%", marginBottom: "3%" }}>
            {stats.slice(0, 3).map((s, i) => (
              <div key={i} style={{ background: t.cardBg, borderRadius: "4px", padding: "4%", border: `1px solid ${t.borderColor}` }}>
                <div style={{ color: t.accent, fontSize: "clamp(12px,2.2vw,22px)", fontWeight: 700 }}>{s.value}</div>
                <div style={{ color: t.bodyColor, fontSize: "clamp(6px,0.9vw,9px)", marginTop: "3%", opacity: 0.7 }}>{s.label}</div>
                {s.change && <div style={{ color: s.change.startsWith("+") ? "#22c55e" : "#ef4444", fontSize: "clamp(5px,0.8vw,8px)", marginTop: "1%" }}>{s.change}</div>}
              </div>
            ))}
          </div>
          {(slide.bullets || []).slice(0, 2).map((b, i) => (
            <div key={i} style={{ display: "flex", gap: "2%", color: t.bodyColor, fontSize: "clamp(7px,0.9vw,9px)", marginBottom: "1.5%", paddingLeft: "3%" }}>
              <span style={{ color: t.accent, flexShrink: 0 }}>▪</span><span>{b}</span>
            </div>
          ))}
        </div>
        {logo}
      </div>
    );
  }

  if (slide.type === "two-column") {
    const half = Math.ceil((slide.bullets || []).length / 2);
    return (
      <div style={base}>
        <div style={bar} />
        <div style={{ position: "absolute", inset: 0, padding: "5% 7%" }}>
          <div style={{ color: t.titleColor, fontWeight: 700, fontSize: "clamp(10px,1.8vw,18px)", marginBottom: "4%", paddingLeft: "3%" }}>{slide.title}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3%", height: "72%" }}>
            {[(slide.bullets||[]).slice(0, half), (slide.bullets||[]).slice(half)].map((col, ci) => (
              <div key={ci} style={{ background: t.cardBg, borderRadius: "4px", padding: "4%", border: `1px solid ${t.borderColor}20` }}>
                {col.map((b, i) => (
                  <div key={i} style={{ display: "flex", gap: "2%", marginBottom: "3%", color: t.bodyColor, fontSize: "clamp(7px,0.9vw,9px)", alignItems: "flex-start" }}>
                    <span style={{ color: t.accent, flexShrink: 0 }}>▸</span><span>{b}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        {logo}
      </div>
    );
  }

  if (slide.type === "agenda") return (
    <div style={base}>
      <div style={bar} />
      <div style={{ position: "absolute", inset: 0, padding: "5% 7%" }}>
        <div style={{ color: t.titleColor, fontWeight: 700, fontSize: "clamp(10px,1.8vw,18px)", marginBottom: "5%", paddingLeft: "3%" }}>{slide.title}</div>
        {(slide.bullets || []).slice(0, 5).map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "3%", padding: "1.5% 3%", background: t.cardBg, borderRadius: "3px", marginBottom: "2%", border: `1px solid ${t.borderColor}30` }}>
            <span style={{ color: t.accent, fontWeight: 700, fontSize: "clamp(9px,1.3vw,13px)", width: "6%", flexShrink: 0 }}>0{i + 1}</span>
            <span style={{ color: t.bodyColor, fontSize: "clamp(7px,0.9vw,9px)" }}>{b}</span>
          </div>
        ))}
      </div>
      {logo}
    </div>
  );

  if (slide.type === "closing") return (
    <div style={base}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg,${t.accent}20 0%,${t.bg} 100%)` }} />
      <div style={{ position: "absolute", top: "8%", left: "8%", right: "8%", height: "2px", background: `${t.accent}40` }} />
      <div style={{ position: "absolute", bottom: "8%", left: "8%", right: "8%", height: "2px", background: `${t.accent}40` }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8%", textAlign: "center" }}>
        <div style={{ color: t.titleColor, fontWeight: 700, fontSize: "clamp(14px,3vw,28px)", marginBottom: "3%" }}>{slide.title}</div>
        {slide.subtitle && <div style={{ color: t.accent, fontSize: "clamp(8px,1.2vw,12px)", letterSpacing: "0.05em" }}>{slide.subtitle}</div>}
        {slide.bullets?.[0] && <div style={{ marginTop: "5%", padding: "1.5% 5%", background: t.accent, borderRadius: "4px", color: t.bg, fontSize: "clamp(7px,1.1vw,11px)", fontWeight: 600 }}>{slide.bullets[0]}</div>}
      </div>
      {logo}
    </div>
  );

  // content (default)
  return (
    <div style={base}>
      <div style={bar} />
      <div style={{ position: "absolute", inset: 0, padding: "5% 7%" }}>
        <div style={{ color: t.titleColor, fontWeight: 700, fontSize: "clamp(10px,1.8vw,18px)", marginBottom: "4%", paddingLeft: "3%" }}>{slide.title}</div>
        {slide.emphasis && <div style={{ color: t.accent, fontSize: "clamp(8px,1.1vw,11px)", fontWeight: 600, paddingLeft: "3%", marginBottom: "2%" }}>{slide.emphasis}</div>}
        {(slide.bullets || []).slice(0, 5).map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "2.5%", padding: "1% 2.5%", color: t.bodyColor, fontSize: "clamp(7px,0.9vw,9px)" }}>
            <span style={{ color: t.accent, flexShrink: 0, marginTop: "0.1em" }}>●</span>
            <span style={{ lineHeight: 1.4 }}>{b}</span>
          </div>
        ))}
      </div>
      {logo}
    </div>
  );
}

// ── Slide Thumbnail ───────────────────────────────────────────────────────────
function SlideThumbnail({ slide, theme, index, active, onClick }: {
  slide: Slide; theme: Theme; index: number; active: boolean; onClick: () => void;
}) {
  return (
    <div onClick={onClick} className={`cursor-pointer group transition-all ${active ? "ring-2 ring-primary ring-offset-1 ring-offset-background rounded" : ""}`}
      data-testid={`thumb-slide-${index}`}>
      <div className="text-[9px] text-center font-medium mb-0.5" style={{ color: active ? "var(--primary)" : "var(--muted-foreground)" }}>{index + 1}</div>
      <div className="w-full rounded overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <SlideCanvas slide={slide} theme={theme} />
      </div>
    </div>
  );
}

// ── Theme Picker ──────────────────────────────────────────────────────────────
function ThemePicker({ value, onChange }: { value: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {(Object.entries(THEMES) as [Theme, typeof THEMES[Theme]][]).map(([k, v]) => (
        <button key={k} onClick={() => onChange(k)}
          className={`flex flex-col items-center gap-1 group transition-all ${value === k ? "opacity-100" : "opacity-60 hover:opacity-90"}`}
          title={v.label}>
          <div className={`h-7 w-12 rounded-md bg-gradient-to-br ${v.preview} transition-all ${value === k ? "ring-2 ring-primary ring-offset-1" : "hover:ring-1 hover:ring-border"}`} />
          <span className="text-[10px] text-muted-foreground">{v.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Home / Create View ────────────────────────────────────────────────────────
function HomeView({
  presentations, isLoading, initialPromptMode,
  onGenerate, onOpen, onDelete,
}: {
  presentations: PresentationRecord[]; isLoading: boolean;
  initialPromptMode?: SourceType | "prompt" | null;
  onGenerate: (opts: { prompt: string; sources: SourceType[]; fileText: string | null; fileName: string | null; slideCount: number; theme: Theme }) => void;
  onOpen: (p: PresentationRecord) => void;
  onDelete: (id: number) => void;
}) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [sources, setSources] = useState<SourceType[]>([]);
  const [slideCount, setSlideCount] = useState(10);
  const [theme, setTheme] = useState<Theme>("executive-dark");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialPromptMode && initialPromptMode !== "prompt") {
      setSources([initialPromptMode as SourceType]);
    }
    setTimeout(() => promptRef.current?.focus(), 100);
  }, [initialPromptMode]);

  const toggleSource = (key: SourceType) => {
    setSources(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const resp = await fetch("/api/presentations/upload-source", {
        method: "POST", body: fd, credentials: "include",
      });
      if (!resp.ok) throw new Error((await resp.json()).message);
      const data = await resp.json();
      setFileText(data.text);
      setFileName(data.fileName);
      toast({ title: `File uploaded: ${data.fileName}`, description: `${data.chars} characters extracted` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFileUpload(f);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { promptRef.current?.focus(); return; }
    setGenerating(true);
    try {
      await onGenerate({ prompt: prompt.trim(), sources, fileText, fileName, slideCount, theme });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-full bg-background">
      {/* ── Create area ── */}
      <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-background border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Presentation className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Presentation Studio</h1>
              <p className="text-slate-400 text-xs">AI-powered slides from your Performo data</p>
            </div>
          </div>

          {/* Main prompt area */}
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4">
              <Textarea
                ref={promptRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleGenerate(); }}
                placeholder="Describe the presentation you need… e.g. Q2 2026 business performance review for our board of directors, focusing on revenue, occupancy rates, and H2 targets"
                className="min-h-[100px] bg-transparent border-0 text-white placeholder:text-slate-500 text-sm resize-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                data-testid="textarea-main-prompt"
              />
            </div>

            {/* Source chips */}
            <div className="border-t border-slate-700/60 px-4 py-3 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-500 font-medium shrink-0">Add data from:</span>
              {SOURCE_CHIPS.map(chip => {
                const active = sources.includes(chip.key);
                return (
                  <button key={chip.key} onClick={() => toggleSource(chip.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${active ? "bg-primary text-primary-foreground border-primary" : "border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200"}`}
                    data-testid={`chip-source-${chip.key}`}>
                    <chip.icon className="h-3 w-3" />
                    {chip.label}
                    {active && <X className="h-2.5 w-2.5 ml-0.5" onClick={e => { e.stopPropagation(); toggleSource(chip.key); }} />}
                  </button>
                );
              })}

              {/* File upload chip */}
              <button onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${fileName ? "bg-emerald-600 text-white border-emerald-500" : "border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200"}`}
                data-testid="chip-upload-file">
                {uploading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                {fileName ? fileName.slice(0, 20) + (fileName.length > 20 ? "…" : "") : "Upload file"}
                {fileName && <X className="h-2.5 w-2.5 ml-0.5" onClick={e => { e.stopPropagation(); setFileText(null); setFileName(null); }} />}
              </button>
              <input ref={fileInputRef} type="file" className="hidden" accept=".txt,.md,.csv,.json,.xlsx,.xls"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
            </div>

            {/* Options row */}
            <div className="border-t border-slate-700/60 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Slides:</span>
                  <select
                    value={slideCount}
                    onChange={e => setSlideCount(Number(e.target.value))}
                    className="bg-slate-800 border border-slate-600 text-slate-200 text-[11px] rounded-lg px-2 py-1 outline-none"
                    data-testid="select-slide-count">
                    {[5, 8, 10, 12, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Theme:</span>
                  <select
                    value={theme}
                    onChange={e => setTheme(e.target.value as Theme)}
                    className="bg-slate-800 border border-slate-600 text-slate-200 text-[11px] rounded-lg px-2 py-1 outline-none"
                    data-testid="select-theme-home">
                    {(Object.entries(THEMES) as [Theme, any][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating}
                className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-8 px-5 text-sm"
                data-testid="btn-generate-outline">
                {generating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {generating ? "Generating outline…" : "Generate Outline"}
                {!generating && <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* File drop hint */}
          <div className="mt-3 flex items-center justify-center">
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="flex items-center gap-2 text-[11px] text-slate-600 border border-dashed border-slate-700 rounded-lg px-4 py-2 w-full text-center justify-center hover:border-slate-500 hover:text-slate-500 transition-colors cursor-default">
              <Upload className="h-3 w-3" />Drop a file here (.txt, .md, .csv, .xlsx) to include as context
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent presentations ── */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        {isLoading && (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        )}

        {!isLoading && presentations.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />Recent Presentations
            </h2>
            <div className="space-y-1.5">
              {presentations.map(p => {
                const slideCount = (p.slides as any[])?.length || 0;
                const t = THEMES[p.theme as Theme] || THEMES["executive-dark"];
                const firstSlide = (p.slides as Slide[])?.[0];
                return (
                  <div key={p.id}
                    onClick={() => onOpen(p)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 cursor-pointer group transition-all"
                    data-testid={`card-presentation-${p.id}`}>
                    {/* Thumbnail */}
                    <div className="w-20 h-12 rounded overflow-hidden shrink-0" style={{ background: t.bg }}>
                      {firstSlide ? <SlideCanvas slide={firstSlide} theme={p.theme as Theme} /> : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Presentation className="h-4 w-4 opacity-20" style={{ color: t.bodyColor }} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{p.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {slideCount} slide{slideCount !== 1 ? "s" : ""} · v{p.version} · {new Date(p.updatedAt).toLocaleDateString()}
                        {(p.sourceTypes as any[])?.length > 0 && ` · ${(p.sourceTypes as any[]).join(", ")}`}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${p.status === "published" ? "border-emerald-400/60 text-emerald-600" : "border-amber-400/60 text-amber-600"}`}>
                      {p.status}
                    </Badge>
                    <button onClick={e => { e.stopPropagation(); onDelete(p.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground/30 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                      data-testid={`btn-delete-${p.id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isLoading && presentations.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Presentation className="h-12 w-12 mx-auto mb-3 opacity-15" />
            <p className="text-sm font-medium">No presentations yet</p>
            <p className="text-xs mt-1">Describe your deck above and click Generate Outline to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Outline Review View ───────────────────────────────────────────────────────
function OutlineView({
  outline, brief, theme, isLoading,
  onEdit, onRegenerate, onBuild, onBack,
}: {
  outline: OutlineItem[]; brief: Partial<Brief>; theme: Theme; isLoading: boolean;
  onEdit: (id: string, field: "title" | "description", val: string) => void;
  onRegenerate: () => void; onBuild: () => void; onBack: () => void;
}) {
  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center flex-col gap-5 py-24">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-lg">Generating your outline…</h3>
        <p className="text-sm text-muted-foreground mt-1">AI is structuring your presentation storyboard</p>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => <div key={i} className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
      </div>
    </div>
  );

  const typeLabels = SLIDE_TYPE_LABELS;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b bg-card shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="font-bold text-sm">{brief.title || "Review your outline"}</h2>
            <p className="text-[11px] text-muted-foreground">{outline.length} slides · click any field to edit</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRegenerate} className="gap-1.5 h-8 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />Regenerate
          </Button>
          <Button size="sm" onClick={onBuild} disabled={outline.length === 0} className="gap-1.5 h-8 text-xs shadow-md" data-testid="btn-build-presentation">
            <Wand2 className="h-3.5 w-3.5" />Build Presentation
          </Button>
        </div>
      </div>

      {/* Outline list */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-2">
          {outline.map((item, idx) => {
            const Icon = SLIDE_TYPE_ICONS[item.type] || Type;
            return (
              <div key={item.id}
                className="flex items-start gap-3 p-3.5 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all group">
                {/* Number + icon */}
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  <span className="text-[11px] font-bold text-muted-foreground/40 w-5 text-right tabular-nums">{idx + 1}</span>
                  <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
                {/* Editable fields */}
                <div className="flex-1 min-w-0 space-y-1">
                  <input
                    className="w-full bg-transparent font-semibold text-sm outline-none focus:text-primary transition-colors border-b border-transparent focus:border-primary/30 pb-0.5"
                    value={item.title}
                    onChange={e => onEdit(item.id, "title", e.target.value)}
                    data-testid={`outline-title-${idx}`}
                  />
                  <input
                    className="w-full bg-transparent text-[11px] text-muted-foreground outline-none focus:text-foreground transition-colors"
                    value={item.description}
                    onChange={e => onEdit(item.id, "description", e.target.value)}
                    data-testid={`outline-desc-${idx}`}
                  />
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0 self-start mt-0.5 whitespace-nowrap">
                  {typeLabels[item.type] || item.type}
                </Badge>
              </div>
            );
          })}
        </div>
        {/* Bottom build button */}
        <div className="max-w-2xl mx-auto mt-6 flex justify-end">
          <Button onClick={onBuild} disabled={outline.length === 0} className="gap-2 shadow-lg" data-testid="btn-build-presentation-bottom">
            <Wand2 className="h-4 w-4" />Build Presentation ({outline.length} slides)
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Generating View ───────────────────────────────────────────────────────────
function GeneratingView({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-24">
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-primary animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <h3 className="font-bold text-2xl">Building your presentation</h3>
        <p className="text-sm text-muted-foreground mt-2">{label}</p>
      </div>
      <div className="w-72">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">{Math.round(progress)}% complete</p>
      </div>
    </div>
  );
}

// ── Editor View ───────────────────────────────────────────────────────────────
function EditorView({
  presentation, onBack, onSave, isSaving,
}: {
  presentation: PresentationRecord; onBack: () => void;
  onSave: (data: Partial<PresentationRecord>, version?: boolean) => void; isSaving: boolean;
}) {
  const { toast } = useToast();
  const [slides, setSlides] = useState<Slide[]>((presentation.slides as Slide[]) || []);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [theme, setTheme] = useState<Theme>((presentation.theme as Theme) || "executive-dark");
  const [title, setTitle] = useState(presentation.title);
  const [rightPanel, setRightPanel] = useState<"ai" | "notes">("ai");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedSlide = slides[selectedIdx] || slides[0];

  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => { onSave({ title, slides: slides as any, theme }); }, 30000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [slides, theme, title]);

  const updateSlide = (idx: number, data: Partial<Slide>) =>
    setSlides(prev => prev.map((s, i) => i === idx ? { ...s, ...data } : s));

  const addSlide = (type: SlideType) => {
    const ns: Slide = { id: `slide-${Date.now()}`, type, title: "New Slide", bullets: ["Add your content here"], notes: "" };
    const next = [...slides]; next.splice(selectedIdx + 1, 0, ns);
    setSlides(next); setSelectedIdx(selectedIdx + 1); setAddMenuOpen(false);
  };

  const deleteSlide = (idx: number) => {
    if (slides.length <= 1) { toast({ title: "Cannot delete the last slide", variant: "destructive" }); return; }
    const next = slides.filter((_, i) => i !== idx);
    setSlides(next); setSelectedIdx(Math.min(idx, next.length - 1));
  };

  const duplicateSlide = (idx: number) => {
    const dup = { ...slides[idx], id: `slide-${Date.now()}` };
    const next = [...slides]; next.splice(idx + 1, 0, dup);
    setSlides(next); setSelectedIdx(idx + 1);
  };

  const refineWithAI = async () => {
    if (!aiPrompt.trim() || !selectedSlide) return;
    setAiLoading(true);
    try {
      const resp = await fetch(`/api/presentations/${presentation.id}/refine-slide`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ slide: selectedSlide, instruction: aiPrompt, brief: presentation.brief }),
      });
      const data = await resp.json();
      if (data.slide) { updateSlide(selectedIdx, data.slide); setAiPrompt(""); toast({ title: "Slide refined" }); }
    } catch { toast({ title: "AI refinement failed", variant: "destructive" }); }
    finally { setAiLoading(false); }
  };

  const SLIDE_TYPES: { type: SlideType; label: string }[] = [
    { type: "content", label: "Content" }, { type: "two-column", label: "Two Column" },
    { type: "data", label: "Data / Stats" }, { type: "quote", label: "Quote" },
    { type: "agenda", label: "Agenda" }, { type: "section", label: "Section" },
    { type: "title", label: "Title" }, { type: "closing", label: "Closing" },
  ];

  return (
    <div className="flex flex-col h-full bg-background" style={{ minHeight: 0 }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-card shrink-0">
        <button onClick={onBack} className="p-1.5 rounded hover:bg-muted text-muted-foreground" data-testid="btn-editor-back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-4 w-px bg-border mx-1" />
        <input value={title} onChange={e => setTitle(e.target.value)}
          className="font-semibold text-sm bg-transparent outline-none border-b border-transparent focus:border-primary/40 px-1 min-w-0 max-w-xs"
          data-testid="input-presentation-title" />
        <div className="ml-auto flex items-center gap-1.5">
          {/* Theme */}
          <Select value={theme} onValueChange={v => setTheme(v as Theme)}>
            <SelectTrigger className="h-7 text-xs w-36" data-testid="select-theme">
              <div className={`h-2.5 w-2.5 rounded-sm bg-gradient-to-br ${THEMES[theme]?.preview} shrink-0 mr-1`} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(THEMES) as [Theme, any][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  <div className="flex items-center gap-2"><div className={`h-2.5 w-4 rounded bg-gradient-to-br ${v.preview}`} />{v.label}</div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="h-4 w-px bg-border" />
          {/* Add slide */}
          <div className="relative">
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setAddMenuOpen(v => !v)} data-testid="btn-add-slide">
              <Plus className="h-3 w-3" />Slide <ChevronDown className="h-2.5 w-2.5" />
            </Button>
            {addMenuOpen && (
              <div className="absolute top-8 right-0 z-50 bg-popover border rounded-xl shadow-xl p-1.5 w-40">
                {SLIDE_TYPES.map(opt => {
                  const Icon = SLIDE_TYPE_ICONS[opt.type] || Type;
                  return (
                    <button key={opt.type} onClick={() => addSlide(opt.type)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-muted w-full text-left">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />{opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="h-4 w-px bg-border" />
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" disabled={isSaving}
            onClick={() => { onSave({ title, slides: slides as any, theme }, true); toast({ title: "Saved" }); }}
            data-testid="btn-save">
            <Save className="h-3 w-3" />{isSaving ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => onSave({ status: "published" })} data-testid="btn-publish">
            <Globe className="h-3 w-3" />Publish
          </Button>
        </div>
      </div>

      {/* Main editor */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: thumbnails */}
        <div className="w-40 shrink-0 border-r overflow-y-auto bg-muted/20 p-2 space-y-2" data-testid="slide-panel">
          {slides.map((s, i) => (
            <div key={s.id} className="group relative">
              <SlideThumbnail slide={s} theme={theme} index={i} active={i === selectedIdx} onClick={() => setSelectedIdx(i)} />
              <div className="absolute top-5 right-0 hidden group-hover:flex gap-0.5">
                <button onClick={() => duplicateSlide(i)} className="p-0.5 rounded bg-background/90 hover:bg-muted text-muted-foreground hover:text-foreground" title="Duplicate">
                  <Copy className="h-2.5 w-2.5" />
                </button>
                <button onClick={() => deleteSlide(i)} className="p-0.5 rounded bg-background/90 hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500" title="Delete">
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Center: canvas */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-muted/10 p-5 items-center" data-testid="slide-canvas">
          {selectedSlide && (
            <div className="w-full max-w-2xl">
              {/* Live preview */}
              <div className="rounded-xl overflow-hidden shadow-xl ring-1 ring-border/50">
                <SlideCanvas slide={selectedSlide} theme={theme} />
              </div>
              {/* Edit panel */}
              <div className="mt-4 bg-card rounded-xl border p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Edit slide {selectedIdx + 1} — {SLIDE_TYPE_LABELS[selectedSlide.type]}</p>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Title</Label>
                    <Input value={selectedSlide.title || ""} onChange={e => updateSlide(selectedIdx, { title: e.target.value })} className="h-8 text-sm" data-testid="input-slide-title" />
                  </div>
                  {["title", "section", "closing", "quote"].includes(selectedSlide.type) && (
                    <div className="space-y-1">
                      <Label className="text-[11px]">Subtitle</Label>
                      <Input value={selectedSlide.subtitle || ""} onChange={e => updateSlide(selectedIdx, { subtitle: e.target.value })} className="h-8 text-sm" />
                    </div>
                  )}
                  {selectedSlide.type === "quote" && (
                    <div className="space-y-1">
                      <Label className="text-[11px]">Quote text</Label>
                      <Textarea value={selectedSlide.quote || ""} onChange={e => updateSlide(selectedIdx, { quote: e.target.value })} className="min-h-[60px] text-sm" />
                    </div>
                  )}
                  {["content", "two-column", "agenda", "data", "closing"].includes(selectedSlide.type) && (
                    <div className="space-y-1">
                      <Label className="text-[11px]">Bullet points (one per line)</Label>
                      <Textarea
                        value={(selectedSlide.bullets || []).join("\n")}
                        onChange={e => updateSlide(selectedIdx, { bullets: e.target.value.split("\n") })}
                        className="min-h-[80px] text-sm" data-testid="textarea-bullets"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-[11px]">Speaker notes</Label>
                    <Textarea value={selectedSlide.notes || ""} onChange={e => updateSlide(selectedIdx, { notes: e.target.value })}
                      className="min-h-[50px] text-xs text-muted-foreground" placeholder="Add speaker notes…" data-testid="textarea-notes" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-3">Slide {selectedIdx + 1} of {slides.length} · auto-saves every 30s</p>
        </div>

        {/* Right: AI assist */}
        <div className="w-64 shrink-0 border-l flex flex-col bg-card" data-testid="ai-panel">
          <div className="flex border-b">
            {[{ key: "ai", icon: Sparkles, label: "AI" }, { key: "notes", icon: AlignLeft, label: "Notes" }].map(tab => (
              <button key={tab.key} onClick={() => setRightPanel(tab.key as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors ${rightPanel === tab.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <tab.icon className="h-3.5 w-3.5" />{tab.label}
              </button>
            ))}
          </div>

          {rightPanel === "ai" && (
            <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-[11px] font-semibold text-primary mb-1 flex items-center gap-1.5"><Wand2 className="h-3 w-3" />AI Slide Refiner</p>
                <p className="text-[10px] text-muted-foreground">Tell AI how to improve this slide.</p>
              </div>
              <div className="space-y-1 flex-1 overflow-y-auto">
                {["Make it more concise", "Add more data points", "Executive-friendly language", "Strengthen the opening", "Add a call to action"].map(s => (
                  <button key={s} onClick={() => setAiPrompt(s)}
                    className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg border hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground">
                    {s}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Describe how to improve this slide…"
                  className="min-h-[64px] text-xs resize-none" data-testid="textarea-ai-prompt"
                  onKeyDown={e => { if (e.key === "Enter" && e.metaKey) refineWithAI(); }} />
                <Button onClick={refineWithAI} disabled={!aiPrompt.trim() || aiLoading} className="w-full h-8 text-xs gap-1.5" data-testid="btn-refine-slide">
                  <Sparkles className="h-3.5 w-3.5" />
                  {aiLoading ? "Refining…" : "Refine Slide"}
                </Button>
              </div>
            </div>
          )}

          {rightPanel === "notes" && (
            <div className="flex-1 p-3">
              <Textarea value={selectedSlide?.notes || ""} onChange={e => updateSlide(selectedIdx, { notes: e.target.value })}
                placeholder="Speaker notes for this slide…" className="min-h-[200px] text-xs resize-none h-full" data-testid="textarea-notes-panel" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PresentationStudioPage() {
  const { toast } = useToast();
  const [view, setView] = useState<View>("home");
  const [activePres, setActivePres] = useState<PresentationRecord | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [generateLabel, setGenerateLabel] = useState("Preparing…");
  const [pendingCreate, setPendingCreate] = useState<any>(null);

  const { data: presentations = [], isLoading } = useQuery<PresentationRecord[]>({
    queryKey: ["/api/presentations"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/presentations", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/presentations"] }),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/presentations/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/presentations"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/presentations/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/presentations"] }); toast({ title: "Presentation deleted" }); },
  });

  // Step 1: Generate outline from prompt
  const handleGenerate = async (opts: { prompt: string; sources: SourceType[]; fileText: string | null; fileName: string | null; slideCount: number; theme: Theme }) => {
    const brief = {
      title: opts.prompt.slice(0, 80),
      audience: "Leadership team",
      objective: opts.prompt,
      tone: "Executive",
      deckType: "Report",
      targetSlides: opts.slideCount,
      designStyle: "Clean",
      instructions: opts.fileName ? `Source file: ${opts.fileName}` : "",
      prompt: opts.prompt,
    };

    const sourceData: any = {};
    if (opts.fileText) sourceData.fileContent = opts.fileText;

    setPendingCreate({ brief, sources: opts.sources, theme: opts.theme, sourceData });
    setOutlineLoading(true);
    setView("outline");
    setOutline([]);

    try {
      const resp = await fetch("/api/presentations/generate-outline", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ brief, sourceData }),
      });
      if (!resp.ok) throw new Error((await resp.json()).message || "Outline generation failed");
      const data = await resp.json();
      setOutline(data.outline || []);
    } catch (err: any) {
      toast({ title: "Outline generation failed", description: err.message, variant: "destructive" });
      setView("home");
    } finally {
      setOutlineLoading(false);
    }
  };

  const handleRegenerate = () => {
    if (!pendingCreate) return;
    setOutlineLoading(true);
    setOutline([]);
    fetch("/api/presentations/generate-outline", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ brief: pendingCreate.brief, sourceData: pendingCreate.sourceData }),
    })
      .then(r => r.json())
      .then(data => setOutline(data.outline || []))
      .catch(err => toast({ title: "Regeneration failed", description: err.message, variant: "destructive" }))
      .finally(() => setOutlineLoading(false));
  };

  // Step 2: Build slides from outline
  const handleBuild = async () => {
    if (!pendingCreate || outline.length === 0) return;
    setView("generating");
    setGenerateProgress(0);

    const LABELS = ["Creating presentation…", "Writing slide content…", "Adding speaker notes…", "Finalising…"];
    let prog = 0;
    const interval = setInterval(() => {
      prog = Math.min(prog + 7, 90);
      setGenerateProgress(prog);
      setGenerateLabel(LABELS[Math.floor(prog / 25)] || LABELS[3]);
    }, 400);

    try {
      // Create DB record
      const created = await createMutation.mutateAsync({
        title: pendingCreate.brief.title || "Untitled Presentation",
        sourceTypes: pendingCreate.sources,
        brief: pendingCreate.brief,
        outline,
        theme: pendingCreate.theme,
      }) as any;

      // Generate slides
      const resp = await fetch(`/api/presentations/${created.id}/generate-slides`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ outline, brief: pendingCreate.brief, sourceData: pendingCreate.sourceData }),
      });
      const data = await resp.json();
      clearInterval(interval);
      setGenerateProgress(100);
      setGenerateLabel("Done!");
      setTimeout(() => {
        setActivePres({ ...created, slides: data.slides || [], outline, theme: pendingCreate.theme });
        setView("editor");
      }, 600);
    } catch (err: any) {
      clearInterval(interval);
      toast({ title: "Slide generation failed", description: err.message, variant: "destructive" });
      setView("outline");
    }
  };

  const handleSave = (data: Partial<PresentationRecord>, saveVersion = false) => {
    if (!activePres) return;
    saveMutation.mutate({ id: activePres.id, data: { ...data, saveVersion } });
    setActivePres(prev => prev ? { ...prev, ...data } : prev);
  };

  if (view === "outline") {
    return (
      <div className="flex flex-col h-full">
        <OutlineView
          outline={outline}
          brief={pendingCreate?.brief || {}}
          theme={pendingCreate?.theme || "executive-dark"}
          isLoading={outlineLoading}
          onEdit={(id, field, val) => setOutline(prev => prev.map(o => o.id === id ? { ...o, [field]: val } : o))}
          onRegenerate={handleRegenerate}
          onBuild={handleBuild}
          onBack={() => setView("home")}
        />
      </div>
    );
  }

  if (view === "generating") {
    return (
      <div className="flex flex-col h-full">
        <GeneratingView progress={generateProgress} label={generateLabel} />
      </div>
    );
  }

  if (view === "editor" && activePres) {
    return (
      <EditorView
        presentation={activePres}
        onBack={() => { setView("home"); setActivePres(null); }}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
      />
    );
  }

  return (
    <HomeView
      presentations={presentations as PresentationRecord[]}
      isLoading={isLoading}
      onGenerate={handleGenerate}
      onOpen={p => { setActivePres(p); setView("editor"); }}
      onDelete={id => deleteMutation.mutate(id)}
    />
  );
}
