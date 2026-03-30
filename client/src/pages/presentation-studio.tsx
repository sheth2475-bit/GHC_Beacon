import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Presentation, Plus, Sparkles, ChevronRight, ChevronLeft, ArrowLeft,
  FileText, BarChart3, Target, FolderOpen, Workflow, BookOpen, Upload,
  Wand2, Layers, Check, Edit3, Trash2, Download, Share2, Clock,
  Save, Eye, RotateCcw, Copy, AlignLeft, AlignCenter, ImageIcon,
  Star, Zap, Users, Globe, Lock, MoreHorizontal, GripVertical,
  ChevronDown, PlayCircle, X, RefreshCw, PanelLeft, MessageSquare,
  Type, List, BarChart2, Quote, Columns, Minus, Maximize2,
  Monitor, FileOutput, History, Grid, LayoutTemplate,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type SlideType = "title" | "agenda" | "content" | "two-column" | "data" | "quote" | "section" | "closing";
type Theme = "executive-dark" | "clean-light" | "bold-purple" | "fresh-teal" | "minimal-gray" | "warm-amber";
type SourceType = "prompt" | "kpis" | "projects" | "workflow" | "reviews" | "analytics";
type WizardStep = "source" | "brief" | "outline" | "generating";
type View = "home" | "library" | "templates" | "wizard" | "editor";

interface Slide {
  id: string;
  type: SlideType;
  title: string;
  subtitle?: string;
  bullets?: string[];
  stat?: { value: string; label: string; change?: string }[];
  quote?: string;
  notes?: string;
  emphasis?: string;
}

interface OutlineItem {
  id: string;
  type: SlideType;
  title: string;
  description: string;
}

interface Brief {
  title: string;
  audience: string;
  objective: string;
  tone: string;
  deckType: string;
  targetSlides: number;
  designStyle: string;
  instructions: string;
}

interface PresentationRecord {
  id: number;
  title: string;
  status: string;
  theme: string;
  slides: Slide[];
  outline: OutlineItem[];
  brief: Brief;
  sourceTypes: SourceType[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ── Theme definitions ─────────────────────────────────────────────────────────
const THEMES: Record<Theme, {
  label: string;
  bg: string; titleColor: string; bodyColor: string; accent: string;
  subtleColor: string; cardBg: string; borderColor: string; preview: string;
}> = {
  "executive-dark": {
    label: "Executive Dark",
    bg: "#0f1929", titleColor: "#f59e0b", bodyColor: "#e2e8f0",
    accent: "#f59e0b", subtleColor: "#64748b", cardBg: "#1e293b",
    borderColor: "#334155", preview: "from-slate-900 to-slate-800",
  },
  "clean-light": {
    label: "Clean Light",
    bg: "#ffffff", titleColor: "#0f172a", bodyColor: "#475569",
    accent: "#3b82f6", subtleColor: "#94a3b8", cardBg: "#f1f5f9",
    borderColor: "#e2e8f0", preview: "from-white to-slate-50",
  },
  "bold-purple": {
    label: "Bold Purple",
    bg: "#2e1065", titleColor: "#e9d5ff", bodyColor: "#ddd6fe",
    accent: "#a78bfa", subtleColor: "#7c3aed", cardBg: "#4c1d95",
    borderColor: "#6d28d9", preview: "from-purple-950 to-purple-900",
  },
  "fresh-teal": {
    label: "Fresh Teal",
    bg: "#0f4c4c", titleColor: "#ccfbf1", bodyColor: "#99f6e4",
    accent: "#2dd4bf", subtleColor: "#0f766e", cardBg: "#134e4a",
    borderColor: "#0d9488", preview: "from-teal-950 to-teal-900",
  },
  "minimal-gray": {
    label: "Minimal",
    bg: "#f8fafc", titleColor: "#0f172a", bodyColor: "#334155",
    accent: "#6366f1", subtleColor: "#94a3b8", cardBg: "#f1f5f9",
    borderColor: "#cbd5e1", preview: "from-slate-50 to-gray-100",
  },
  "warm-amber": {
    label: "Warm Amber",
    bg: "#1c0a00", titleColor: "#fde68a", bodyColor: "#fef3c7",
    accent: "#f59e0b", subtleColor: "#92400e", cardBg: "#2d1200",
    borderColor: "#78350f", preview: "from-amber-950 to-amber-900",
  },
};

const SOURCE_OPTIONS: { key: SourceType; label: string; desc: string; icon: typeof FileText; color: string }[] = [
  { key: "prompt",    label: "AI Prompt",       desc: "Describe your presentation and AI does the rest",        icon: Wand2,      color: "text-violet-500" },
  { key: "kpis",      label: "KPI Data",         desc: "Pull live KPI metrics and performance data",             icon: Target,     color: "text-blue-500" },
  { key: "projects",  label: "Projects",         desc: "Use project status, milestones, and progress",           icon: FolderOpen, color: "text-emerald-500" },
  { key: "workflow",  label: "Workflow Center",  desc: "Include operational records, tasks and compliance data", icon: Workflow,   color: "text-orange-500" },
  { key: "reviews",   label: "Monthly Reviews",  desc: "Pull insights from monthly performance reviews",          icon: BookOpen,   color: "text-pink-500" },
  { key: "analytics", label: "Analytics Studio", desc: "Use dashboard charts and AI-generated insights",         icon: BarChart3,  color: "text-cyan-500" },
];

const DECK_TYPES = ["Strategy", "Pitch", "Report", "Review", "Proposal", "Update", "Training", "Board Pack"];
const TONES      = ["Executive", "Formal", "Conversational", "Inspirational", "Technical", "Concise"];
const STYLES     = ["Clean", "Data-heavy", "Bold", "Minimal", "Visual", "Text-focused"];

const SLIDE_TYPE_ICONS: Record<SlideType, typeof Type> = {
  title: Type, agenda: List, content: AlignLeft, "two-column": Columns,
  data: BarChart2, quote: Quote, section: Minus, closing: PlayCircle,
};

// ── Slide Canvas ──────────────────────────────────────────────────────────────
function SlideCanvas({
  slide, theme, scale = 1, editable = false,
  onEdit,
}: {
  slide: Slide; theme: Theme; scale?: number; editable?: boolean;
  onEdit?: (field: string, value: string | string[]) => void;
}) {
  const t = THEMES[theme];
  const baseStyle: React.CSSProperties = {
    background: t.bg, width: "100%", aspectRatio: "16/9",
    fontFamily: "'Inter', system-ui, sans-serif", position: "relative",
    overflow: "hidden", borderRadius: scale < 1 ? "4px" : "8px",
    transform: `scale(${scale})`, transformOrigin: "top left",
  };

  const titleStyle: React.CSSProperties = { color: t.titleColor, fontWeight: 700, lineHeight: 1.1 };
  const bodyStyle: React.CSSProperties = { color: t.bodyColor };
  const accentBar: React.CSSProperties = {
    position: "absolute", left: 0, top: 0, bottom: 0,
    width: "4px", background: t.accent,
  };
  const logoMark = (
    <div style={{ position: "absolute", bottom: "4%", right: "4%", fontSize: "9px", color: t.subtleColor, fontWeight: 600, letterSpacing: "0.08em", opacity: 0.6 }}>
      PERFORMO AI
    </div>
  );

  if (slide.type === "title") {
    return (
      <div style={baseStyle}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${t.bg} 0%, ${t.cardBg} 100%)` }} />
        <div style={{ position: "absolute", top: "8%", left: "8%", right: "8%", height: "4px", background: t.accent, borderRadius: "2px" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8%" }}>
          <div style={{ ...titleStyle, fontSize: "clamp(18px,4vw,36px)", textAlign: "center", marginBottom: "3%" }}>{slide.title}</div>
          {slide.subtitle && <div style={{ ...bodyStyle, fontSize: "clamp(10px,2vw,18px)", textAlign: "center", opacity: 0.75 }}>{slide.subtitle}</div>}
          {slide.emphasis && (
            <div style={{ marginTop: "5%", padding: "2% 5%", border: `1px solid ${t.accent}`, borderRadius: "4px", color: t.accent, fontSize: "clamp(8px,1.5vw,14px)", letterSpacing: "0.1em" }}>
              {slide.emphasis}
            </div>
          )}
        </div>
        {logoMark}
      </div>
    );
  }

  if (slide.type === "section") {
    return (
      <div style={baseStyle}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${t.accent}22 0%, ${t.bg} 60%)` }} />
        <div style={accentBar} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "8% 10%" }}>
          <div style={{ color: t.accent, fontSize: "clamp(8px,1.2vw,12px)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "2%", fontWeight: 600 }}>SECTION</div>
          <div style={{ ...titleStyle, fontSize: "clamp(16px,3.5vw,32px)" }}>{slide.title}</div>
          {slide.subtitle && <div style={{ ...bodyStyle, fontSize: "clamp(9px,1.5vw,14px)", marginTop: "2%", opacity: 0.7 }}>{slide.subtitle}</div>}
        </div>
        {logoMark}
      </div>
    );
  }

  if (slide.type === "quote") {
    return (
      <div style={baseStyle}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, ${t.cardBg} 0%, ${t.bg} 100%)` }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8% 12%", textAlign: "center" }}>
          <div style={{ color: t.accent, fontSize: "clamp(24px,6vw,60px)", lineHeight: 0.8, marginBottom: "3%", opacity: 0.6 }}>"</div>
          <div style={{ ...titleStyle, fontSize: "clamp(11px,2vw,20px)", fontStyle: "italic", fontWeight: 400, color: t.bodyColor, lineHeight: 1.5 }}>{slide.quote || slide.title}</div>
          {slide.subtitle && <div style={{ color: t.accent, fontSize: "clamp(8px,1.2vw,12px)", marginTop: "4%", letterSpacing: "0.1em" }}>— {slide.subtitle}</div>}
        </div>
        {logoMark}
      </div>
    );
  }

  if (slide.type === "data") {
    const stats = slide.stat || [];
    return (
      <div style={baseStyle}>
        <div style={accentBar} />
        <div style={{ position: "absolute", inset: 0, padding: "5% 7%" }}>
          <div style={{ ...titleStyle, fontSize: "clamp(12px,2.2vw,22px)", marginBottom: "4%" }}>{slide.title}</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(stats.length || 3, 3)}, 1fr)`, gap: "3%", marginBottom: "4%" }}>
            {(stats.length > 0 ? stats : [{ value: "—", label: "Metric 1" }, { value: "—", label: "Metric 2" }, { value: "—", label: "Metric 3" }]).map((s, i) => (
              <div key={i} style={{ background: t.cardBg, borderRadius: "4px", padding: "4%", border: `1px solid ${t.borderColor}` }}>
                <div style={{ color: t.accent, fontSize: "clamp(14px,2.5vw,26px)", fontWeight: 700 }}>{s.value}</div>
                <div style={{ color: t.bodyColor, fontSize: "clamp(7px,1vw,10px)", marginTop: "3%", opacity: 0.75 }}>{s.label}</div>
                {s.change && <div style={{ color: s.change.startsWith("+") ? "#22c55e" : "#ef4444", fontSize: "clamp(6px,0.9vw,9px)", marginTop: "1%" }}>{s.change}</div>}
              </div>
            ))}
          </div>
          {slide.bullets && slide.bullets.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5%" }}>
              {slide.bullets.slice(0, 3).map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "2%", color: t.bodyColor, fontSize: "clamp(8px,1.1vw,11px)" }}>
                  <span style={{ color: t.accent, flexShrink: 0, marginTop: "0.1em" }}>▪</span>
                  <span>{b}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {logoMark}
      </div>
    );
  }

  if (slide.type === "two-column") {
    const half = Math.ceil((slide.bullets || []).length / 2);
    const left = (slide.bullets || []).slice(0, half);
    const right = (slide.bullets || []).slice(half);
    return (
      <div style={baseStyle}>
        <div style={accentBar} />
        <div style={{ position: "absolute", inset: 0, padding: "5% 7%" }}>
          <div style={{ ...titleStyle, fontSize: "clamp(12px,2.2vw,22px)", marginBottom: "4%" }}>{slide.title}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4%", height: "72%" }}>
            {[left, right].map((col, ci) => (
              <div key={ci} style={{ background: t.cardBg, borderRadius: "4px", padding: "4%", border: `1px solid ${t.borderColor}20` }}>
                {col.map((b, i) => (
                  <div key={i} style={{ display: "flex", gap: "2%", marginBottom: "3%", color: t.bodyColor, fontSize: "clamp(7px,1vw,10px)", alignItems: "flex-start" }}>
                    <span style={{ color: t.accent, flexShrink: 0 }}>▸</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        {logoMark}
      </div>
    );
  }

  if (slide.type === "agenda") {
    const items = slide.bullets || [];
    return (
      <div style={baseStyle}>
        <div style={accentBar} />
        <div style={{ position: "absolute", inset: 0, padding: "5% 7%" }}>
          <div style={{ ...titleStyle, fontSize: "clamp(12px,2.2vw,22px)", marginBottom: "5%" }}>{slide.title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5%" }}>
            {items.slice(0, 6).map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "3%", padding: "2% 3%", background: t.cardBg, borderRadius: "3px", border: `1px solid ${t.borderColor}30` }}>
                <span style={{ color: t.accent, fontWeight: 700, fontSize: "clamp(10px,1.5vw,14px)", width: "5%", flexShrink: 0 }}>0{i + 1}</span>
                <span style={{ color: t.bodyColor, fontSize: "clamp(8px,1.1vw,11px)" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
        {logoMark}
      </div>
    );
  }

  if (slide.type === "closing") {
    return (
      <div style={baseStyle}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${t.accent}22 0%, ${t.bg} 100%)` }} />
        <div style={{ position: "absolute", top: "8%", left: "8%", right: "8%", height: "2px", background: `${t.accent}40` }} />
        <div style={{ position: "absolute", bottom: "8%", left: "8%", right: "8%", height: "2px", background: `${t.accent}40` }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8%" }}>
          <div style={{ ...titleStyle, fontSize: "clamp(18px,4vw,36px)", textAlign: "center", marginBottom: "3%" }}>{slide.title}</div>
          {slide.subtitle && <div style={{ color: t.accent, fontSize: "clamp(9px,1.5vw,14px)", textAlign: "center", letterSpacing: "0.05em" }}>{slide.subtitle}</div>}
          {slide.bullets && slide.bullets[0] && (
            <div style={{ marginTop: "5%", padding: "2% 6%", background: t.accent, borderRadius: "4px", color: t.bg, fontSize: "clamp(8px,1.3vw,13px)", fontWeight: 600 }}>
              {slide.bullets[0]}
            </div>
          )}
        </div>
        {logoMark}
      </div>
    );
  }

  // Default: content slide
  return (
    <div style={baseStyle}>
      <div style={accentBar} />
      <div style={{ position: "absolute", inset: 0, padding: "5% 7%" }}>
        <div style={{ ...titleStyle, fontSize: "clamp(12px,2.2vw,22px)", marginBottom: "4%", paddingLeft: "3%" }}>{slide.title}</div>
        {slide.emphasis && (
          <div style={{ marginBottom: "3%", paddingLeft: "3%", color: t.accent, fontSize: "clamp(9px,1.4vw,14px)", fontWeight: 600 }}>{slide.emphasis}</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "2%" }}>
          {(slide.bullets || []).slice(0, 6).map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "2.5%", padding: "1.5% 2.5%", color: t.bodyColor, fontSize: "clamp(8px,1.1vw,11px)" }}>
              <span style={{ color: t.accent, flexShrink: 0, marginTop: "0.1em", fontSize: "clamp(6px,0.8vw,8px)" }}>●</span>
              <span style={{ lineHeight: 1.4 }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
      {logoMark}
    </div>
  );
}

// ── Slide Thumbnail (mini version for left panel) ─────────────────────────────
function SlideThumbnail({ slide, theme, index, active, onClick }: {
  slide: Slide; theme: Theme; index: number; active: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded transition-all group ${active ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "hover:opacity-90"}`}
      data-testid={`thumb-slide-${index}`}
    >
      <div className="text-[9px] text-muted-foreground mb-1 text-center font-medium">{index + 1}</div>
      <div className="w-full" style={{ aspectRatio: "16/9", overflow: "hidden", borderRadius: "3px" }}>
        <SlideCanvas slide={slide} theme={theme} />
      </div>
    </div>
  );
}

// ── Home View ────────────────────────────────────────────────────────────────
function HomeView({
  presentations, isLoading, onNew, onOpen, onDelete,
}: {
  presentations: PresentationRecord[];
  isLoading: boolean;
  onNew: () => void;
  onOpen: (p: PresentationRecord) => void;
  onDelete: (id: number) => void;
}) {
  const recent = presentations.slice(0, 3);
  const rest = presentations.slice(3);

  return (
    <div className="min-h-full bg-background">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-b border-border px-8 py-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <Presentation className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary/80">Presentation Studio</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">Create AI presentations</h1>
            <p className="text-slate-400 text-sm max-w-md">Generate executive-ready presentations from your Performo data, uploaded files, or a simple prompt — in seconds.</p>
          </div>
          <Button onClick={onNew} size="lg" className="gap-2 shadow-lg shadow-primary/20 h-11 px-6" data-testid="btn-new-presentation">
            <Plus className="h-4 w-4" />New Presentation
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
        {/* Quick start tiles */}
        {presentations.length === 0 && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Wand2, label: "From a Prompt", desc: "Describe your deck in words", color: "text-violet-500", bg: "bg-violet-500/10" },
              { icon: Target, label: "From KPI Data", desc: "Turn metrics into a story", color: "text-blue-500", bg: "bg-blue-500/10" },
              { icon: BarChart3, label: "From Analytics", desc: "Charts + AI narrative", color: "text-cyan-500", bg: "bg-cyan-500/10" },
            ].map(opt => (
              <button key={opt.label} onClick={onNew}
                className="text-left rounded-xl border bg-card p-5 hover:shadow-md hover:border-primary/40 transition-all group">
                <div className={`inline-flex p-2.5 rounded-lg ${opt.bg} mb-3`}>
                  <opt.icon className={`h-5 w-5 ${opt.color}`} />
                </div>
                <p className="font-semibold text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* Recent presentations */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        )}

        {!isLoading && presentations.length > 0 && (
          <>
            <div>
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Recent</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recent.map(p => (
                  <PresentationCard key={p.id} p={p} onOpen={onOpen} onDelete={onDelete} />
                ))}
                {/* + New card */}
                <button onClick={onNew}
                  className="rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 min-h-[180px] group"
                  data-testid="btn-new-card">
                  <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/30 group-hover:border-primary/40 flex items-center justify-center transition-all">
                    <Plus className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary/60" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">New Presentation</span>
                </button>
              </div>
            </div>

            {rest.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold mb-3">All Presentations</h2>
                <div className="rounded-xl border overflow-hidden">
                  {rest.map(p => (
                    <div key={p.id}
                      className="flex items-center gap-4 px-4 py-3 border-b border-border/40 hover:bg-muted/30 cursor-pointer group transition-colors"
                      onClick={() => onOpen(p)}>
                      <div className={`w-12 h-7 rounded shrink-0 bg-gradient-to-br ${THEMES[p.theme as Theme]?.preview || "from-slate-900 to-slate-800"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{p.title}</p>
                        <p className="text-[10px] text-muted-foreground">{(p.slides as any[])?.length || 0} slides · v{p.version} · {new Date(p.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${p.status === "published" ? "border-emerald-400/60 text-emerald-600" : "border-amber-400/60 text-amber-600"}`}>
                        {p.status}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/60 transition-colors shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PresentationCard({ p, onOpen, onDelete }: { p: PresentationRecord; onOpen: (p: PresentationRecord) => void; onDelete: (id: number) => void }) {
  const slides = (p.slides as Slide[]) || [];
  const firstSlide = slides[0];
  const t = THEMES[p.theme as Theme] || THEMES["executive-dark"];

  return (
    <div className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
      onClick={() => onOpen(p)} data-testid={`card-presentation-${p.id}`}>
      {/* Slide preview */}
      <div className="w-full" style={{ aspectRatio: "16/9", background: t.bg, position: "relative", overflow: "hidden" }}>
        {firstSlide ? (
          <SlideCanvas slide={firstSlide} theme={p.theme as Theme} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Presentation className="h-8 w-8 opacity-20" style={{ color: t.bodyColor }} />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-xs font-medium flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />Open
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{p.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{slides.length} slides · {new Date(p.updatedAt).toLocaleDateString()}</p>
          </div>
          <button onClick={e => { e.stopPropagation(); onDelete(p.id); }}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
            data-testid={`btn-delete-presentation-${p.id}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Source Step ───────────────────────────────────────────────────────────────
function SourceStep({ selected, onChange, onNext }: {
  selected: SourceType[]; onChange: (s: SourceType[]) => void; onNext: () => void;
}) {
  const toggle = (key: SourceType) => {
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Choose your sources</h2>
        <p className="text-sm text-muted-foreground">Select one or more data sources. AI will combine them into a coherent presentation.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SOURCE_OPTIONS.map(opt => {
          const active = selected.includes(opt.key);
          return (
            <button key={opt.key} onClick={() => toggle(opt.key)}
              className={`text-left p-4 rounded-xl border-2 transition-all relative group ${active ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40 bg-card"}`}
              data-testid={`source-${opt.key}`}>
              {active && <div className="absolute top-2.5 right-2.5 h-4.5 w-4.5 rounded-full bg-primary flex items-center justify-center"><Check className="h-2.5 w-2.5 text-white" /></div>}
              <div className={`inline-flex p-2 rounded-lg bg-muted/50 mb-2.5`}>
                <opt.icon className={`h-4 w-4 ${opt.color}`} />
              </div>
              <p className="font-semibold text-sm">{opt.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{opt.desc}</p>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={selected.length === 0} className="gap-2" data-testid="btn-next-brief">
          Set up brief <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Brief Step ────────────────────────────────────────────────────────────────
function BriefStep({ brief, onChange, onBack, onNext }: {
  brief: Brief; onChange: (b: Brief) => void; onBack: () => void; onNext: () => void;
}) {
  const set = (field: keyof Brief, val: string | number) => onChange({ ...brief, [field]: val });
  const valid = brief.title.trim().length > 0 && brief.audience.trim().length > 0 && brief.objective.trim().length > 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold mb-1">Presentation brief</h2>
        <p className="text-sm text-muted-foreground">Tell AI about your presentation. The more context you give, the better the output.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-1.5">
          <Label>Presentation title *</Label>
          <Input value={brief.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Q2 2026 Business Review" data-testid="input-brief-title" />
        </div>
        <div className="space-y-1.5">
          <Label>Target audience *</Label>
          <Input value={brief.audience} onChange={e => set("audience", e.target.value)} placeholder="e.g. Board of Directors, C-Suite" data-testid="input-brief-audience" />
        </div>
        <div className="space-y-1.5">
          <Label>Deck type</Label>
          <Select value={brief.deckType} onValueChange={v => set("deckType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DECK_TYPES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>Objective *</Label>
          <Input value={brief.objective} onChange={e => set("objective", e.target.value)} placeholder="e.g. Present Q2 performance and align on H2 strategy" data-testid="input-brief-objective" />
        </div>
        <div className="space-y-1.5">
          <Label>Tone</Label>
          <Select value={brief.tone} onValueChange={v => set("tone", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Design style</Label>
          <Select value={brief.designStyle} onValueChange={v => set("designStyle", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Target slide count</Label>
          <Select value={String(brief.targetSlides)} onValueChange={v => set("targetSlides", Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{[5, 8, 10, 12, 15, 20].map(n => <SelectItem key={n} value={String(n)}>{n} slides</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Presentation theme</Label>
          <Select value={brief.designStyle} onValueChange={v => set("designStyle", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>Additional instructions</Label>
          <Textarea value={brief.instructions} onChange={e => set("instructions", e.target.value)}
            placeholder="Any specific points to include, data to highlight, or sections to add…"
            className="min-h-[80px] text-sm" data-testid="input-brief-instructions" />
        </div>
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2"><ChevronLeft className="h-4 w-4" />Back</Button>
        <Button onClick={onNext} disabled={!valid} className="gap-2" data-testid="btn-generate-outline">
          <Sparkles className="h-4 w-4" />Generate Outline
        </Button>
      </div>
    </div>
  );
}

// ── Outline Step ──────────────────────────────────────────────────────────────
function OutlineStep({ outline, isGenerating, onRegenerate, onApprove, onBack, onEdit }: {
  outline: OutlineItem[]; isGenerating: boolean;
  onRegenerate: () => void; onApprove: () => void; onBack: () => void;
  onEdit: (id: string, field: "title" | "description", val: string) => void;
}) {
  const typeLabels: Record<SlideType, string> = {
    title: "Title", agenda: "Agenda", content: "Content", "two-column": "Two Column",
    data: "Data / Stats", quote: "Quote", section: "Section Break", closing: "Closing",
  };

  if (isGenerating) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
        </div>
        <h3 className="font-semibold text-lg">Generating outline…</h3>
        <p className="text-sm text-muted-foreground">AI is structuring your presentation storyboard</p>
        <div className="flex justify-center gap-1.5 mt-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold mb-1">Review your outline</h2>
          <p className="text-sm text-muted-foreground">Edit slide titles and descriptions before generating the full presentation. Click any field to edit.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRegenerate} className="gap-1.5 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" />Regenerate
        </Button>
      </div>
      <div className="space-y-2">
        {outline.map((item, idx) => {
          const Icon = SLIDE_TYPE_ICONS[item.type] || Type;
          return (
            <div key={item.id} className="flex items-start gap-3 p-3.5 rounded-xl border bg-card hover:border-primary/30 transition-colors group">
              <div className="flex items-center gap-2 shrink-0 pt-0.5">
                <span className="text-[11px] font-bold text-muted-foreground/50 w-5 text-right">{idx + 1}</span>
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
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
              <Badge variant="outline" className="text-[10px] shrink-0 self-start mt-0.5">{typeLabels[item.type] || item.type}</Badge>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2"><ChevronLeft className="h-4 w-4" />Back</Button>
        <Button onClick={onApprove} disabled={outline.length === 0} className="gap-2 shadow-md" data-testid="btn-approve-outline">
          <Wand2 className="h-4 w-4" />Generate Presentation
        </Button>
      </div>
    </div>
  );
}

// ── Generating View ───────────────────────────────────────────────────────────
function GeneratingView({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="text-center py-24 space-y-5">
      <div className="relative h-16 w-16 mx-auto">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
      </div>
      <div>
        <h3 className="font-bold text-xl">Building your presentation</h3>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </div>
      <div className="max-w-xs mx-auto">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{Math.round(progress)}% complete</p>
      </div>
    </div>
  );
}

// ── Editor View ───────────────────────────────────────────────────────────────
function EditorView({
  presentation, onBack, onSave, isSaving,
}: {
  presentation: PresentationRecord;
  onBack: () => void;
  onSave: (data: Partial<PresentationRecord>, version?: boolean) => void;
  isSaving: boolean;
}) {
  const { toast } = useToast();
  const [slides, setSlides] = useState<Slide[]>((presentation.slides as Slide[]) || []);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [theme, setTheme] = useState<Theme>((presentation.theme as Theme) || "executive-dark");
  const [title, setTitle] = useState(presentation.title);
  const [rightPanel, setRightPanel] = useState<"ai" | "notes" | "history">("ai");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [editField, setEditField] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedSlide = slides[selectedIdx] || slides[0];

  // Auto-save every 30 seconds
  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      onSave({ title, slides: slides as any, theme });
    }, 30000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [slides, theme, title]);

  const updateSlide = (idx: number, data: Partial<Slide>) => {
    setSlides(prev => prev.map((s, i) => i === idx ? { ...s, ...data } : s));
  };

  const addSlide = (type: SlideType) => {
    const newSlide: Slide = {
      id: `slide-${Date.now()}`, type,
      title: type === "title" ? "New Slide" : type === "section" ? "New Section" : "New Slide",
      bullets: ["Add your content here"],
      notes: "",
    };
    const next = [...slides];
    next.splice(selectedIdx + 1, 0, newSlide);
    setSlides(next);
    setSelectedIdx(selectedIdx + 1);
    setAddMenuOpen(false);
  };

  const deleteSlide = (idx: number) => {
    if (slides.length <= 1) { toast({ title: "Cannot delete the last slide", variant: "destructive" }); return; }
    const next = slides.filter((_, i) => i !== idx);
    setSlides(next);
    setSelectedIdx(Math.min(idx, next.length - 1));
  };

  const duplicateSlide = (idx: number) => {
    const dup = { ...slides[idx], id: `slide-${Date.now()}` };
    const next = [...slides];
    next.splice(idx + 1, 0, dup);
    setSlides(next);
    setSelectedIdx(idx + 1);
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
      if (data.slide) {
        updateSlide(selectedIdx, data.slide);
        setAiPrompt("");
        toast({ title: "Slide refined successfully" });
      }
    } catch { toast({ title: "AI refinement failed", variant: "destructive" }); }
    finally { setAiLoading(false); }
  };

  const handleManualSave = () => {
    onSave({ title, slides: slides as any, theme }, true);
    toast({ title: "Presentation saved", description: "A new version has been created." });
  };

  const exportPDF = () => {
    toast({ title: "Opening print dialog", description: "Use your browser's Save as PDF option." });
    setTimeout(() => window.print(), 300);
  };

  const SLIDE_TYPE_OPTIONS: { type: SlideType; label: string }[] = [
    { type: "content", label: "Content" }, { type: "two-column", label: "Two Column" },
    { type: "data", label: "Data / Stats" }, { type: "quote", label: "Quote" },
    { type: "agenda", label: "Agenda" }, { type: "section", label: "Section Break" },
    { type: "title", label: "Title" }, { type: "closing", label: "Closing" },
  ];

  return (
    <div className="flex flex-col h-full bg-background" style={{ minHeight: 0 }}>
      {/* ── Top toolbar ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-card shrink-0 z-10">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground h-8" data-testid="btn-editor-back">
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <div className="h-4 w-px bg-border" />
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="font-semibold text-sm bg-transparent outline-none border-b border-transparent focus:border-primary/40 px-1 min-w-0 flex-1 max-w-xs"
          data-testid="input-presentation-title"
        />
        <div className="ml-auto flex items-center gap-1.5">
          {/* Theme selector */}
          <Select value={theme} onValueChange={v => setTheme(v as Theme)}>
            <SelectTrigger className="h-8 text-xs w-36 gap-1" data-testid="select-theme">
              <div className={`h-3 w-3 rounded-sm bg-gradient-to-br ${THEMES[theme]?.preview} shrink-0`} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(THEMES) as [Theme, typeof THEMES[Theme]][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-4 rounded bg-gradient-to-br ${v.preview}`} />
                    {v.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="h-4 w-px bg-border" />
          {/* Add slide */}
          <div className="relative">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setAddMenuOpen(v => !v)} data-testid="btn-add-slide">
              <Plus className="h-3.5 w-3.5" />Slide <ChevronDown className="h-3 w-3 ml-0.5" />
            </Button>
            {addMenuOpen && (
              <div className="absolute top-9 right-0 z-50 bg-popover border rounded-xl shadow-xl p-1.5 w-44 grid grid-cols-1 gap-0.5">
                {SLIDE_TYPE_OPTIONS.map(opt => {
                  const Icon = SLIDE_TYPE_ICONS[opt.type] || Type;
                  return (
                    <button key={opt.type} onClick={() => addSlide(opt.type)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-muted transition-colors text-left">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />{opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="h-4 w-px bg-border" />
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleManualSave} disabled={isSaving} data-testid="btn-save">
            <Save className="h-3.5 w-3.5" />{isSaving ? "Saving…" : "Save"}
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={exportPDF} data-testid="btn-export-pdf">
            <FileOutput className="h-3.5 w-3.5" />Export
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => onSave({ status: "published" })} data-testid="btn-publish">
            <Globe className="h-3.5 w-3.5" />Publish
          </Button>
        </div>
      </div>

      {/* ── Main editor area ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: slide thumbnails */}
        <div className="w-44 shrink-0 border-r overflow-y-auto bg-muted/20 p-2 space-y-2" data-testid="slide-panel">
          {slides.map((s, i) => (
            <div key={s.id} className="group relative">
              <SlideThumbnail slide={s} theme={theme} index={i} active={i === selectedIdx} onClick={() => setSelectedIdx(i)} />
              <div className="absolute top-5 right-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => duplicateSlide(i)} className="p-0.5 rounded bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground" title="Duplicate">
                  <Copy className="h-3 w-3" />
                </button>
                <button onClick={() => deleteSlide(i)} className="p-0.5 rounded bg-background/80 hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500" title="Delete">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Center: slide canvas */}
        <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 overflow-hidden p-6" data-testid="slide-canvas">
          {selectedSlide && (
            <div className="w-full max-w-3xl">
              <SlideCanvas slide={selectedSlide} theme={theme} />
              {/* Editable fields below canvas */}
              <div className="mt-4 space-y-2 bg-card rounded-xl border p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Edit slide content</p>
                <div className="space-y-2">
                  <div>
                    <Label className="text-[11px]">Title</Label>
                    <Input value={selectedSlide.title || ""} onChange={e => updateSlide(selectedIdx, { title: e.target.value })}
                      className="h-8 text-sm" data-testid="input-slide-title" />
                  </div>
                  {["title", "section", "closing", "quote"].includes(selectedSlide.type) && (
                    <div>
                      <Label className="text-[11px]">Subtitle</Label>
                      <Input value={selectedSlide.subtitle || ""} onChange={e => updateSlide(selectedIdx, { subtitle: e.target.value })}
                        className="h-8 text-sm" data-testid="input-slide-subtitle" />
                    </div>
                  )}
                  {selectedSlide.type === "quote" && (
                    <div>
                      <Label className="text-[11px]">Quote text</Label>
                      <Textarea value={selectedSlide.quote || ""} onChange={e => updateSlide(selectedIdx, { quote: e.target.value })}
                        className="min-h-[60px] text-sm" />
                    </div>
                  )}
                  {["content", "two-column", "agenda", "data", "closing"].includes(selectedSlide.type) && (
                    <div>
                      <Label className="text-[11px]">Bullet points (one per line)</Label>
                      <Textarea
                        value={(selectedSlide.bullets || []).join("\n")}
                        onChange={e => updateSlide(selectedIdx, { bullets: e.target.value.split("\n") })}
                        className="min-h-[80px] text-sm" data-testid="textarea-bullets"
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-[11px]">Speaker notes</Label>
                    <Textarea value={selectedSlide.notes || ""} onChange={e => updateSlide(selectedIdx, { notes: e.target.value })}
                      className="min-h-[50px] text-xs text-muted-foreground" placeholder="Add speaker notes…" data-testid="textarea-notes" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>Slide {selectedIdx + 1} of {slides.length}</span>
            <span>·</span>
            <span>{selectedSlide?.type}</span>
            <span>·</span>
            <span className="text-primary/70">Auto-saved every 30s</span>
          </div>
        </div>

        {/* Right: AI assist panel */}
        <div className="w-72 shrink-0 border-l flex flex-col bg-card" data-testid="ai-panel">
          <div className="flex border-b">
            {[
              { key: "ai", icon: Sparkles, label: "AI Assist" },
              { key: "notes", icon: AlignLeft, label: "Notes" },
              { key: "history", icon: History, label: "History" },
            ].map(tab => (
              <button key={tab.key} onClick={() => setRightPanel(tab.key as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors ${rightPanel === tab.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <tab.icon className="h-3.5 w-3.5" />{tab.label}
              </button>
            ))}
          </div>

          {rightPanel === "ai" && (
            <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-[11px] font-semibold text-primary mb-1 flex items-center gap-1.5"><Wand2 className="h-3.5 w-3.5" />AI Slide Refiner</p>
                <p className="text-[10px] text-muted-foreground">Tell AI how to improve this slide. It will rewrite the content based on your instruction.</p>
              </div>
              <div className="space-y-2 flex-1">
                <Label className="text-[11px]">Quick suggestions</Label>
                {[
                  "Make it more concise", "Add more data points",
                  "Make it executive-friendly", "Improve the flow",
                  "Add a strong opening line",
                ].map(s => (
                  <button key={s} onClick={() => setAiPrompt(s)}
                    className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg border hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground">
                    {s}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="Describe how to improve this slide…"
                  className="min-h-[70px] text-xs resize-none"
                  data-testid="textarea-ai-prompt"
                  onKeyDown={e => { if (e.key === "Enter" && e.metaKey) refineWithAI(); }}
                />
                <Button onClick={refineWithAI} disabled={!aiPrompt.trim() || aiLoading} className="w-full h-8 text-xs gap-1.5" data-testid="btn-refine-slide">
                  <Sparkles className="h-3.5 w-3.5" />
                  {aiLoading ? "Refining…" : "Refine Slide"}
                </Button>
              </div>
            </div>
          )}

          {rightPanel === "notes" && (
            <div className="flex-1 p-3">
              <p className="text-[11px] font-semibold mb-2">Speaker notes</p>
              <Textarea
                value={selectedSlide?.notes || ""}
                onChange={e => updateSlide(selectedIdx, { notes: e.target.value })}
                placeholder="Add speaker notes for this slide…"
                className="min-h-[200px] text-xs resize-none"
                data-testid="textarea-notes-panel"
              />
            </div>
          )}

          {rightPanel === "history" && (
            <div className="flex-1 p-3 space-y-2 overflow-y-auto">
              <p className="text-[11px] font-semibold">Version history</p>
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-7 w-7 mx-auto mb-2 opacity-20" />
                <p className="text-xs">Save a version to see it here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Wizard Wrapper ─────────────────────────────────────────────────────────────
function WizardView({
  onComplete, onCancel,
}: {
  onComplete: (pres: PresentationRecord) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<WizardStep>("source");
  const [sources, setSources] = useState<SourceType[]>(["prompt"]);
  const [brief, setBrief] = useState<Brief>({
    title: "", audience: "", objective: "", tone: "Executive",
    deckType: "Report", targetSlides: 10, designStyle: "Clean", instructions: "",
  });
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [generatingLabel, setGeneratingLabel] = useState("Preparing…");
  const [progress, setProgress] = useState(0);

  // Fetch Performo source data
  const { data: kpiData } = useQuery<any[]>({ queryKey: ["/api/kpi-actuals/company"], enabled: sources.includes("kpis") });
  const { data: projectData } = useQuery<any[]>({ queryKey: ["/api/milestones"], enabled: sources.includes("projects") });

  const buildSourceData = () => {
    const d: any = {};
    if (sources.includes("kpis") && kpiData) d.kpis = kpiData.slice(0, 10);
    if (sources.includes("projects") && projectData) d.projects = projectData.slice(0, 10);
    return Object.keys(d).length > 0 ? d : null;
  };

  const generateOutline = async () => {
    setStep("outline");
    setOutline([]);
    try {
      const resp = await fetch("/api/presentations/generate-outline", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ brief, sourceData: buildSourceData() }),
      });
      const data = await resp.json();
      setOutline(data.outline || []);
    } catch {
      toast({ title: "Outline generation failed", variant: "destructive" });
      setStep("brief");
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/presentations", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/presentations"] }),
  });

  const generateSlides = async () => {
    setStep("generating");
    const labels = [
      "Creating presentation structure…",
      "Writing slide content…",
      "Adding speaker notes…",
      "Finalising design…",
    ];
    let prog = 0;
    const interval = setInterval(() => {
      prog = Math.min(prog + 8, 90);
      setProgress(prog);
      setGeneratingLabel(labels[Math.floor(prog / 25)] || labels[3]);
    }, 400);

    try {
      // Create the presentation record first
      const created = await createMutation.mutateAsync({
        title: brief.title || "Untitled Presentation",
        sourceTypes: sources,
        brief,
        outline,
        theme: "executive-dark",
      }) as any;

      // Generate slides
      const resp = await fetch(`/api/presentations/${created.id}/generate-slides`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ outline, brief, sourceData: buildSourceData() }),
      });
      const data = await resp.json();
      clearInterval(interval);
      setProgress(100);
      setGeneratingLabel("Done!");
      setTimeout(() => {
        onComplete({ ...created, slides: data.slides, outline });
      }, 600);
    } catch {
      clearInterval(interval);
      toast({ title: "Slide generation failed", variant: "destructive" });
      setStep("outline");
    }
  };

  const editOutlineItem = (id: string, field: "title" | "description", val: string) => {
    setOutline(prev => prev.map(o => o.id === id ? { ...o, [field]: val } : o));
  };

  const STEPS = ["source", "brief", "outline", "generating"];
  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* Step header */}
      <div className="border-b bg-card px-8 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />Cancel
            </button>
            <div className="flex items-center gap-2">
              {["Source", "Brief", "Outline", "Generate"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${i <= stepIdx ? "text-primary" : "text-muted-foreground/50"}`}>
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${i < stepIdx ? "bg-primary text-primary-foreground" : i === stepIdx ? "bg-primary/20 text-primary ring-1 ring-primary/40" : "bg-muted text-muted-foreground/50"}`}>
                      {i < stepIdx ? <Check className="h-2.5 w-2.5" /> : i + 1}
                    </div>
                    {s}
                  </div>
                  {i < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground/30" />}
                </div>
              ))}
            </div>
            <div className="w-16" />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8">
          {step === "source" && <SourceStep selected={sources} onChange={setSources} onNext={() => setStep("brief")} />}
          {step === "brief" && <BriefStep brief={brief} onChange={setBrief} onBack={() => setStep("source")} onNext={generateOutline} />}
          {step === "outline" && (
            <OutlineStep
              outline={outline}
              isGenerating={outline.length === 0}
              onRegenerate={generateOutline}
              onApprove={generateSlides}
              onBack={() => setStep("brief")}
              onEdit={editOutlineItem}
            />
          )}
          {step === "generating" && <GeneratingView progress={progress} label={generatingLabel} />}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PresentationStudioPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [view, setView] = useState<View>("home");
  const [activePres, setActivePres] = useState<PresentationRecord | null>(null);

  const { data: presentations = [], isLoading } = useQuery<PresentationRecord[]>({
    queryKey: ["/api/presentations"],
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/presentations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presentations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/presentations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/presentations"] });
      toast({ title: "Presentation deleted" });
    },
  });

  const handleSave = (data: Partial<PresentationRecord>, saveVersion = false) => {
    if (!activePres) return;
    saveMutation.mutate({ id: activePres.id, data: { ...data, saveVersion } });
    setActivePres(prev => prev ? { ...prev, ...data } : prev);
  };

  const openPresentation = (p: PresentationRecord) => {
    setActivePres(p);
    setView("editor");
  };

  if (view === "wizard") {
    return (
      <WizardView
        onComplete={p => { setActivePres(p); setView("editor"); }}
        onCancel={() => setView("home")}
      />
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
      presentations={presentations}
      isLoading={isLoading}
      onNew={() => setView("wizard")}
      onOpen={openPresentation}
      onDelete={id => deleteMutation.mutate(id)}
    />
  );
}
