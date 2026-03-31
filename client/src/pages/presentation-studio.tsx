import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
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
  Wand2, Check, Trash2, Download, Clock, Save, Eye, Table,
  Copy, RefreshCw, X, Type, List, BarChart2, Quote,
  Columns, Minus, PlayCircle, History, Globe, FileOutput,
  ChevronDown, AlignLeft, MoreHorizontal, Paperclip, GripVertical,
  Maximize2, Minimize2, FileDown, Image, ZoomIn, ZoomOut,
  ChevronUp, Layers,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 1: PRESENTATION JSON SCHEMA ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
type SlideType = "title" | "agenda" | "content" | "two-column" | "data" | "quote" | "section" | "closing" | "table" | "image";
type Theme = "executive-dark" | "clean-light" | "bold-purple" | "fresh-teal" | "minimal-gray" | "warm-amber";
type SourceType = "kpis" | "projects" | "workflow" | "reviews" | "analytics";
type View = "home" | "questions" | "outline" | "generating" | "editor";
type TransitionType = "fade" | "slide" | "zoom" | "morph";

interface AiQuestion { id: string; question: string; placeholder: string; why: string; }

interface TableData {
  headers: string[];
  rows: string[][];
}

interface Slide {
  id: string; type: SlideType; title: string;
  subtitle?: string; bullets?: string[];
  body?: string;
  stat?: { value: string; label: string; change?: string; trend?: "up" | "down" | "flat"; pct?: number; color?: "green" | "amber" | "red" }[];
  chartData?: { label: string; value: number; color?: string }[];
  tableData?: TableData;
  quote?: string; notes?: string; emphasis?: string;
  colorCode?: "green" | "amber" | "red";
  icon?: string; imageUrl?: string;
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

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 3: THEME & STYLE MODULE
// ═══════════════════════════════════════════════════════════════════════════════
const THEMES: Record<Theme, {
  label: string; bg: string; titleColor: string; bodyColor: string;
  accent: string; subtleColor: string; cardBg: string; borderColor: string; preview: string;
}> = {
  "executive-dark": { label: "Executive Dark", bg: "#0f1929", titleColor: "#f59e0b", bodyColor: "#e2e8f0", accent: "#f59e0b", subtleColor: "#64748b", cardBg: "#1e293b", borderColor: "#334155", preview: "from-slate-900 to-slate-800" },
  "clean-light":    { label: "Clean Light",    bg: "#ffffff",  titleColor: "#0f172a", bodyColor: "#475569", accent: "#3b82f6", subtleColor: "#94a3b8", cardBg: "#f1f5f9", borderColor: "#e2e8f0", preview: "from-white to-slate-50" },
  "bold-purple":    { label: "Bold Purple",    bg: "#2e1065",  titleColor: "#e9d5ff", bodyColor: "#ddd6fe", accent: "#a78bfa", subtleColor: "#7c3aed", cardBg: "#4c1d95", borderColor: "#6d28d9", preview: "from-purple-950 to-purple-900" },
  "fresh-teal":     { label: "Fresh Teal",     bg: "#0f4c4c",  titleColor: "#ccfbf1", bodyColor: "#99f6e4", accent: "#2dd4bf", subtleColor: "#0f766e", cardBg: "#134e4a", borderColor: "#0d9488", preview: "from-teal-950 to-teal-900" },
  "minimal-gray":   { label: "Minimal",        bg: "#f8fafc",  titleColor: "#0f172a", bodyColor: "#334155", accent: "#6366f1", subtleColor: "#94a3b8", cardBg: "#f1f5f9", borderColor: "#cbd5e1", preview: "from-slate-50 to-gray-100" },
  "warm-amber":     { label: "Warm Amber",     bg: "#1c0a00",  titleColor: "#fde68a", bodyColor: "#fef3c7", accent: "#f59e0b", subtleColor: "#92400e", cardBg: "#2d1200", borderColor: "#78350f", preview: "from-amber-950 to-amber-900" },
};

const SOURCE_CHIPS: { key: SourceType; label: string; icon: typeof Target; color: string }[] = [
  { key: "kpis",      label: "KPI Data",       icon: Target,     color: "text-blue-500" },
  { key: "projects",  label: "Projects",        icon: FolderOpen, color: "text-emerald-500" },
  { key: "workflow",  label: "Workflow",        icon: Workflow,   color: "text-orange-500" },
  { key: "reviews",   label: "Monthly Reviews", icon: BookOpen,   color: "text-pink-500" },
  { key: "analytics", label: "Analytics",       icon: BarChart3,  color: "text-cyan-500" },
];

const SLIDE_TYPE_ICONS: Record<SlideType, typeof Type> = {
  title: Type, agenda: List, content: AlignLeft, "two-column": Columns,
  data: BarChart2, quote: Quote, section: Minus, closing: PlayCircle,
  table: Table, image: Image,
};

const SLIDE_TYPE_LABELS: Record<SlideType, string> = {
  title: "Title Slide", agenda: "Agenda", content: "Content", "two-column": "Two Column",
  data: "Data / Stats", quote: "Quote", section: "Section", closing: "Closing",
  table: "Table", image: "Image",
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 13: EXPORT ENGINE — PPTX + PDF
// ═══════════════════════════════════════════════════════════════════════════════
const pptxColor = (hex: string) => {
  const c = hex.startsWith("#") ? hex.slice(1) : hex;
  return c.slice(0, 6);
};

// ─── PPTX canvas constants ────────────────────────────────────────────────────
// Slide: 10 in × 5.625 in  (16 : 9 landscape — exact PowerPoint Widescreen)
const PPTX_W = 10;      // inches, full slide width
const PPTX_H = 5.625;   // inches, full slide height
// Helpers to keep coordinates readable; nothing is scaled, values are native inches.
const PH = PPTX_H;      // alias
const PW = PPTX_W;      // alias

async function exportToPptx(slides: Slide[], theme: Theme, title: string) {
  const t = THEMES[theme];
  try {
    const pptxgenjs = await import("pptxgenjs");
    const PptxGenJS = (pptxgenjs as any).default || pptxgenjs;
    const pptx = new PptxGenJS();

    // ── Define exact 10 × 5.625 layout ──────────────────────────────────────
    pptx.defineLayout({ name: "WIDESCREEN_16x9", width: PW, height: PH });
    pptx.layout = "WIDESCREEN_16x9";
    pptx.title   = title;
    pptx.company = "Performo AI";

    for (let si = 0; si < slides.length; si++) {
      const slide = slides[si];
      const ps = pptx.addSlide();

      ps.background = { fill: pptxColor(t.bg) };

      // Left accent bar — full slide height
      ps.addShape("rect", {
        x: 0, y: 0, w: 0.07, h: PH,
        fill: { color: pptxColor(t.accent) },
        line: { type: "none" },
      });

      // Footer: slide counter + branding
      const footerY = PH - 0.28;
      ps.addText(`${si + 1} / ${slides.length}`, {
        x: 0.15, y: footerY, w: 1, h: 0.22,
        fontSize: 6, color: pptxColor(t.subtleColor), align: "left",
      });
      ps.addText("PERFORMO AI", {
        x: 8.5, y: footerY, w: 1.4, h: 0.22,
        fontSize: 6, color: pptxColor(t.subtleColor), align: "right", charSpacing: 2,
      });

      // ── Per-slide layouts, designed for 10 × 5.625 ────────────────────────
      switch (slide.type) {

        case "title": {
          // Decorative circles (background)
          ps.addShape("ellipse", {
            x: 7.2, y: -0.5, w: 3.5, h: 3.5,
            fill: { color: pptxColor(t.accent) }, line: { type: "none" }, transparency: 92,
          });
          if (slide.emphasis) {
            ps.addText(slide.emphasis, {
              x: 0.5, y: 1.1, w: 6.5, h: 0.35,
              fontSize: 9, color: pptxColor(t.accent), bold: true, charSpacing: 4,
            });
          }
          ps.addText(slide.title, {
            x: 0.5, y: slide.emphasis ? 1.52 : 1.1, w: 7.0, h: 2.1,
            fontSize: 32, color: pptxColor(t.titleColor), bold: true, breakLine: true,
          });
          if (slide.subtitle) {
            ps.addText(slide.subtitle, {
              x: 0.5, y: 3.75, w: 6.0, h: 0.9,
              fontSize: 14, color: pptxColor(t.bodyColor), opacity: 0.75,
            });
          }
          // Horizontal rule
          ps.addShape("line", {
            x: 0.5, y: 5.2, w: 9.3, h: 0,
            line: { color: pptxColor(t.accent), pt: 0.75, transparency: 70 },
          });
          break;
        }

        case "content": {
          // Header band
          ps.addShape("rect", {
            x: 0, y: 0, w: PW, h: 0.62,
            fill: { color: pptxColor(t.cardBg) }, line: { type: "none" },
          });
          ps.addText(slide.title, {
            x: 0.5, y: 0.1, w: 9.3, h: 0.44,
            fontSize: 18, color: pptxColor(t.titleColor), bold: true, valign: "middle",
          });
          let contentY = 0.62;
          if (slide.emphasis) {
            ps.addText(slide.emphasis, {
              x: 0.5, y: 0.62, w: 9.3, h: 0.36,
              fontSize: 10, color: pptxColor(t.accent), bold: true,
            });
            contentY = 1.02;
          }
          if (slide.body) {
            ps.addText(slide.body, {
              x: 0.6, y: contentY, w: 9.1, h: 0.42,
              fontSize: 9.5, color: pptxColor(t.bodyColor), italic: true,
            });
            contentY += 0.46;
          }
          if (slide.bullets && slide.bullets.length > 0) {
            const bulletItems = slide.bullets.slice(0, 6).map(b => ({
              text: b,
              options: { bullet: { code: "2022" }, fontSize: 11.5, color: pptxColor(t.bodyColor), paraSpaceAfter: 5 },
            }));
            ps.addText(bulletItems, { x: 0.6, y: contentY, w: 9.1, h: PH - contentY - 0.3 });
          }
          break;
        }

        case "agenda": {
          ps.addText("AGENDA", {
            x: 0.5, y: 0.22, w: 9, h: 0.30,
            fontSize: 8, color: pptxColor(t.accent), bold: true, charSpacing: 5,
          });
          ps.addText(slide.title, {
            x: 0.5, y: 0.55, w: 9, h: 0.60,
            fontSize: 20, color: pptxColor(t.titleColor), bold: true,
          });
          const items = (slide.bullets || []).slice(0, 7);
          const rowH  = Math.min(0.56, (PH - 1.35) / Math.max(items.length, 1));
          items.forEach((b, i) => {
            const ry = 1.3 + i * (rowH + 0.04);
            ps.addShape("rect", {
              x: 0.5, y: ry, w: 9.2, h: rowH,
              fill: { color: pptxColor(t.cardBg) }, line: { color: pptxColor(t.borderColor), pt: 0.5 },
            });
            ps.addText(`${String(i + 1).padStart(2, "0")}   ${b}`, {
              x: 0.7, y: ry + 0.04, w: 8.8, h: rowH - 0.08,
              fontSize: 11, color: pptxColor(t.bodyColor), valign: "middle",
            });
          });
          break;
        }

        case "data": {
          // Header band
          ps.addShape("rect", {
            x: 0, y: 0, w: PW, h: 0.58,
            fill: { color: pptxColor(t.cardBg) }, line: { type: "none" },
          });
          ps.addText(slide.title, {
            x: 0.5, y: 0.09, w: 9.3, h: 0.42,
            fontSize: 18, color: pptxColor(t.titleColor), bold: true, valign: "middle",
          });

          const stats = (slide.stat || []).slice(0, 4);
          const statCols  = Math.min(stats.length, 4);
          const cardW     = (9.2 - (statCols - 1) * 0.15) / statCols;
          const cardH     = 1.9;
          const cardsTopY = 0.7;

          stats.forEach((s, i) => {
            const cx = 0.4 + i * (cardW + 0.15);
            const bColor = s.color === "green" ? "22c55e" : s.color === "red" ? "ef4444" : s.color === "amber" ? "f59e0b" : pptxColor(t.borderColor);
            // Card background
            ps.addShape("rect", {
              x: cx, y: cardsTopY, w: cardW, h: cardH,
              fill: { color: pptxColor(t.cardBg) }, line: { color: pptxColor(t.borderColor), pt: 0.5 },
            });
            // Color accent top strip
            ps.addShape("rect", {
              x: cx, y: cardsTopY, w: cardW, h: 0.055,
              fill: { color: bColor }, line: { type: "none" },
            });
            // KPI value
            ps.addText(s.value, {
              x: cx + 0.12, y: cardsTopY + 0.14, w: cardW - 0.24, h: 0.78,
              fontSize: 26, color: pptxColor(t.accent), bold: true,
            });
            // Label
            ps.addText(s.label, {
              x: cx + 0.12, y: cardsTopY + 0.96, w: cardW - 0.24, h: 0.40,
              fontSize: 9, color: pptxColor(t.bodyColor),
            });
            // Change / trend
            if (s.change) {
              ps.addText(s.change, {
                x: cx + 0.12, y: cardsTopY + 1.44, w: cardW - 0.24, h: 0.30,
                fontSize: 8, color: s.trend === "up" ? "22c55e" : "ef4444", bold: true,
              });
            }
          });

          // Insight bullets below cards
          const bulletsY = cardsTopY + cardH + 0.1;
          if (slide.bullets && slide.bullets.length > 0 && bulletsY < PH - 0.4) {
            const bulletItems = slide.bullets.slice(0, 3).map(b => ({
              text: `▪  ${b}`,
              options: { fontSize: 9, color: pptxColor(t.bodyColor), paraSpaceAfter: 3 },
            }));
            ps.addText(bulletItems, {
              x: 0.5, y: bulletsY, w: 9.2, h: PH - bulletsY - 0.32,
            });
          }
          break;
        }

        case "quote": {
          // Large decorative open-quote
          ps.addText("\u201C", {
            x: 0.1, y: -0.55, w: 2.5, h: 2.5,
            fontSize: 160, color: pptxColor(t.accent), transparency: 88, fontFace: "Georgia",
          });
          ps.addText(slide.quote || slide.title, {
            x: 1.0, y: 0.9, w: 8.0, h: 3.2,
            fontSize: 20, color: pptxColor(t.bodyColor), italic: true,
            align: "center", valign: "middle", paraSpaceAfter: 8, fontFace: "Georgia",
          });
          if (slide.subtitle) {
            ps.addShape("line", {
              x: 3.8, y: 4.35, w: 2.4, h: 0,
              line: { color: pptxColor(t.accent), pt: 1.5 },
            });
            ps.addText(`— ${slide.subtitle}`, {
              x: 2.0, y: 4.55, w: 6.0, h: 0.40,
              fontSize: 11, color: pptxColor(t.accent), align: "center", bold: true,
            });
          }
          break;
        }

        case "section": {
          // Semi-transparent left panel
          ps.addShape("rect", {
            x: 0, y: 0, w: 3.2, h: PH,
            fill: { color: pptxColor(t.accent) }, line: { type: "none" }, transparency: 88,
          });
          ps.addText("SECTION", {
            x: 0.9, y: 1.7, w: 8.5, h: 0.38,
            fontSize: 8, color: pptxColor(t.accent), bold: true, charSpacing: 5,
          });
          ps.addText(slide.title, {
            x: 0.9, y: 2.15, w: 8.8, h: 1.85,
            fontSize: 30, color: pptxColor(t.titleColor), bold: true,
          });
          if (slide.subtitle) {
            ps.addText(slide.subtitle, {
              x: 0.9, y: 4.1, w: 7.5, h: 0.72,
              fontSize: 14, color: pptxColor(t.bodyColor),
            });
          }
          break;
        }

        case "closing": {
          // Subtle glow circle
          ps.addShape("ellipse", {
            x: 1.8, y: 0.4, w: 6.4, h: 5.0,
            fill: { color: pptxColor(t.accent) }, line: { type: "none" }, transparency: 94,
          });
          // Horizontal rule top
          ps.addShape("line", {
            x: 0.5, y: 0.22, w: 9.3, h: 0,
            line: { color: pptxColor(t.accent), pt: 0.75, transparency: 72 },
          });
          ps.addText(slide.title, {
            x: 0.5, y: 1.2, w: 9.0, h: 1.6,
            fontSize: 28, color: pptxColor(t.titleColor), bold: true, align: "center",
          });
          if (slide.subtitle) {
            ps.addText(slide.subtitle, {
              x: 0.5, y: 2.9, w: 9.0, h: 0.60,
              fontSize: 14, color: pptxColor(t.bodyColor), align: "center",
            });
          }
          if (slide.bullets?.[0]) {
            ps.addShape("rect", {
              x: 3.2, y: 3.65, w: 3.6, h: 0.60,
              fill: { color: pptxColor(t.accent) }, line: { type: "none" },
            });
            ps.addText(slide.bullets[0], {
              x: 3.2, y: 3.66, w: 3.6, h: 0.58,
              fontSize: 11, color: pptxColor(t.bg), bold: true, align: "center", valign: "middle",
            });
          }
          if (slide.bullets?.[1]) {
            ps.addText(slide.bullets[1], {
              x: 0.5, y: 4.42, w: 9.0, h: 0.35,
              fontSize: 9, color: pptxColor(t.subtleColor), align: "center",
            });
          }
          // Bottom rule
          ps.addShape("line", {
            x: 0.5, y: 5.18, w: 9.3, h: 0,
            line: { color: pptxColor(t.accent), pt: 0.75, transparency: 72 },
          });
          break;
        }

        case "table": {
          // Header band
          ps.addShape("rect", {
            x: 0, y: 0, w: PW, h: 0.58,
            fill: { color: pptxColor(t.cardBg) }, line: { type: "none" },
          });
          ps.addText(slide.title, {
            x: 0.5, y: 0.09, w: 9.3, h: 0.42,
            fontSize: 18, color: pptxColor(t.titleColor), bold: true, valign: "middle",
          });
          if (slide.tableData) {
            const { headers, rows } = slide.tableData;
            const tableRows: any[][] = [
              headers.map(h => ({
                text: h,
                options: { bold: true, color: pptxColor(t.bg), fill: { color: pptxColor(t.accent) }, fontSize: 10 },
              })),
              ...rows.map((row, ri) =>
                row.map(cell => ({
                  text: cell,
                  options: {
                    fill: { color: ri % 2 === 0 ? pptxColor(t.cardBg) : pptxColor(t.bg) },
                    color: cell.startsWith("+") ? "22c55e" : cell.startsWith("-") ? "ef4444" : pptxColor(t.bodyColor),
                    fontSize: 10,
                  },
                }))
              ),
            ];
            ps.addTable(tableRows, {
              x: 0.4, y: 0.70, w: 9.2,
              border: { pt: 0.5, color: pptxColor(t.borderColor) },
              fontSize: 10,
              rowH: 0.32,
            });
          }
          break;
        }

        default: {
          // Generic content fallback
          ps.addShape("rect", {
            x: 0, y: 0, w: PW, h: 0.62,
            fill: { color: pptxColor(t.cardBg) }, line: { type: "none" },
          });
          ps.addText(slide.title, {
            x: 0.5, y: 0.1, w: 9.3, h: 0.44,
            fontSize: 18, color: pptxColor(t.titleColor), bold: true, valign: "middle",
          });
          if (slide.bullets && slide.bullets.length > 0) {
            const bulletItems = slide.bullets.slice(0, 7).map(b => ({
              text: b,
              options: { bullet: { code: "2022" }, fontSize: 13, color: pptxColor(t.bodyColor), paraSpaceAfter: 5 },
            }));
            ps.addText(bulletItems, { x: 0.6, y: 0.75, w: 9.1, h: PH - 0.75 - 0.35 });
          }
        }
      }

      if (slide.notes) ps.addNotes(slide.notes);
    }

    await pptx.writeFile({ fileName: `${title.replace(/[^a-zA-Z0-9\s]/g, "").slice(0, 50) || "presentation"}.pptx` });
  } catch (err: any) {
    throw new Error(`PPTX export failed: ${err.message}`);
  }
}

function exportToPdf(slides: Slide[], theme: Theme, title: string) {
  const t = THEMES[theme];
  const slideHtmls = slides.map((slide, i) => {
    let inner = "";

    const badge = slide.emphasis
      ? `<div style="color:${t.accent};font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin-bottom:16px;">${slide.emphasis}</div>`
      : "";
    const titleHtml = `<div style="color:${t.titleColor};font-weight:800;line-height:1.1;margin-bottom:12px;font-size:${slide.type === "title" ? "2.6rem" : "1.7rem"};">${slide.title}</div>`;
    const subHtml = slide.subtitle ? `<div style="color:${t.bodyColor};font-size:1.05rem;opacity:.75;margin-bottom:12px;">${slide.subtitle}</div>` : "";

    if (slide.type === "title") {
      inner = `${badge}${titleHtml}${subHtml}`;
    } else if (slide.type === "quote") {
      inner = `<div style="color:${t.accent};font-size:5rem;opacity:.18;line-height:1;font-family:Georgia,serif;margin-bottom:-10px;">"</div>
               <div style="color:${t.bodyColor};font-style:italic;font-size:1.4rem;line-height:1.65;text-align:center;padding:0 5%;">${slide.quote || slide.title}</div>
               ${slide.subtitle ? `<div style="color:${t.accent};margin-top:20px;font-size:.85rem;font-weight:700;text-align:center;">— ${slide.subtitle}</div>` : ""}`;
    } else if (slide.type === "section") {
      inner = `<div style="color:${t.accent};font-size:9px;font-weight:700;letter-spacing:.14em;margin-bottom:14px;">SECTION</div>${titleHtml}${subHtml}`;
    } else if (slide.type === "data") {
      const statCards = (slide.stat || []).slice(0, 4).map(s => {
        const bCol = s.color === "green" ? "#22c55e" : s.color === "red" ? "#ef4444" : s.color === "amber" ? "#f59e0b" : t.borderColor;
        return `<div style="background:${t.cardBg};border:1px solid ${t.borderColor}60;border-top:3px solid ${bCol};border-radius:6px;padding:14px 16px;flex:1;">
          <div style="color:${t.accent};font-size:1.8rem;font-weight:800;">${s.value}</div>
          <div style="color:${t.bodyColor};font-size:.75rem;margin-top:6px;opacity:.8;">${s.label}</div>
          ${s.change ? `<div style="color:${s.trend === "up" ? "#22c55e" : "#ef4444"};font-size:.7rem;font-weight:700;margin-top:4px;">${s.change}</div>` : ""}
        </div>`;
      }).join("");
      inner = `${titleHtml}<div style="display:flex;gap:12px;margin-bottom:12px;">${statCards}</div>
               ${(slide.bullets || []).map(b => `<div style="color:${t.bodyColor};font-size:.8rem;margin-bottom:5px;">▪ ${b}</div>`).join("")}`;
    } else if (slide.type === "table" && slide.tableData) {
      const { headers, rows } = slide.tableData;
      const colWidth = `${Math.floor(100 / headers.length)}%`;
      const headerCells = headers.map(h => `<th style="background:${t.accent};color:${t.bg};padding:8px 12px;font-size:.75rem;text-align:left;">${h}</th>`).join("");
      const dataRows = rows.map((row, ri) =>
        `<tr style="background:${ri % 2 === 0 ? `${t.cardBg}80` : "transparent"};">
          ${row.map(cell => `<td style="color:${cell.startsWith("+") ? "#22c55e" : cell.startsWith("-") ? "#ef4444" : t.bodyColor};padding:7px 12px;font-size:.75rem;border-bottom:1px solid ${t.borderColor}30;">${cell}</td>`).join("")}
        </tr>`
      ).join("");
      inner = `${titleHtml}<table style="width:100%;border-collapse:collapse;border-radius:6px;overflow:hidden;border:1px solid ${t.borderColor}40;">
        <thead><tr>${headerCells}</tr></thead><tbody>${dataRows}</tbody>
      </table>`;
    } else {
      const bodyHtml = slide.body ? `<div style="color:${t.bodyColor};font-size:.82rem;font-style:italic;opacity:.82;line-height:1.6;margin-bottom:10px;padding-left:4px;">${slide.body}</div>` : "";
      inner = `${titleHtml}${badge}${bodyHtml}
               ${(slide.bullets || []).slice(0, 6).map(b => `<div style="display:flex;gap:10px;color:${t.bodyColor};font-size:.82rem;margin-bottom:7px;line-height:1.5;"><span style="color:${t.accent};flex-shrink:0;margin-top:2px;">▸</span>${b}</div>`).join("")}`;
    }

    return `<div class="slide" style="background:${t.bg};">
      <div class="accent-bar" style="background:${t.accent};"></div>
      <div class="slide-content">${inner}</div>
      <div class="slide-footer">
        <span style="color:${t.subtleColor};font-size:8px;">${i + 1} / ${slides.length}</span>
        <span style="color:${t.subtleColor};font-size:7px;letter-spacing:.12em;">PERFORMO AI</span>
      </div>
    </div>`;
  }).join("");

  const css = `
    @page { size: A4 landscape; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Inter',system-ui,sans-serif; background:#111; }
    .slide {
      width: 297mm; height: 210mm;
      page-break-after: always;
      page-break-inside: avoid;
      position: relative; overflow: hidden;
      display: flex; align-items: center; justify-content: center;
    }
    .slide:last-child { page-break-after: auto; }
    .accent-bar { position:absolute; left:0; top:0; width:8px; height:100%; }
    .slide-content { padding: 7% 9% 7% 10%; width:100%; }
    .slide-footer {
      position:absolute; bottom:4%; left:5%; right:4%;
      display:flex; justify-content:space-between; align-items:center;
    }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  `;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>${css}</style></head>
    <body>${slideHtmls}
    <script>window.onload=()=>{ setTimeout(()=>{ window.print(); }, 1200); }</script>
    </body></html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE NATIVE RESOLUTION — everything renders at 960×540, then CSS-scaled
// ═══════════════════════════════════════════════════════════════════════════════
const SLIDE_W = 960;
const SLIDE_H = 540;

function ScaledSlide({ slide, theme }: { slide: Slide; theme: Theme }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.getBoundingClientRect().width;
        if (w > 0) setScale(w / SLIDE_W);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative", paddingBottom: `${(SLIDE_H / SLIDE_W) * 100}%`, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}>
          <SlideCanvas slide={slide} theme={theme} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 2 + 4 + 5 + 6 + 7 + 8: LAYOUT ENGINE — all px values for 960×540
// ═══════════════════════════════════════════════════════════════════════════════
function SlideCanvas({ slide, theme }: { slide: Slide; theme: Theme }) {
  const t = THEMES[theme] || THEMES["executive-dark"];
  const base: React.CSSProperties = {
    background: t.bg, width: SLIDE_W, height: SLIDE_H,
    fontFamily: "'Inter', system-ui, sans-serif", position: "relative", overflow: "hidden",
  };

  // ── Shared sub-components — fixed px sizes for 960×540 canvas ──────────────

  const Logo = () => (
    <div style={{ position: "absolute", bottom: 14, right: 22, display: "flex", alignItems: "center", gap: 5, opacity: 0.28 }}>
      <svg width="7" height="7" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill={t.accent}/></svg>
      <span style={{ fontSize: 8, color: t.subtleColor, fontWeight: 700, letterSpacing: "0.12em" }}>PERFORMO AI</span>
    </div>
  );

  const TrendBadge = ({ s }: { s: { value: string; label: string; change?: string; trend?: string; color?: string; pct?: number } }) => {
    const bColor = s.color === "green" ? "#22c55e" : s.color === "red" ? "#ef4444" : s.color === "amber" ? "#f59e0b" : t.accent;
    const arrow = s.trend === "up" ? "▲" : s.trend === "down" ? "▼" : "→";
    const arrowColor = s.trend === "up" ? (s.color === "red" ? "#ef4444" : "#22c55e") : s.trend === "down" ? (s.color === "green" ? "#22c55e" : "#ef4444") : "#94a3b8";
    const pct = Math.min(Math.max(s.pct ?? 75, 0), 100);
    return (
      <div style={{ background: t.cardBg, borderRadius: 8, padding: "14px 18px 12px", display: "flex", flexDirection: "column", borderTop: `4px solid ${bColor}`, borderRight: `1px solid ${t.borderColor}50`, borderBottom: `1px solid ${t.borderColor}50`, borderLeft: `1px solid ${t.borderColor}50` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
          <div style={{ color: t.accent, fontSize: 46, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
          <span style={{ color: arrowColor, fontSize: 14, fontWeight: 700 }}>{arrow}</span>
        </div>
        <div style={{ color: t.bodyColor, fontSize: 13, opacity: 0.82, lineHeight: 1.3, marginBottom: 6 }}>{s.label}</div>
        {s.change && <div style={{ color: arrowColor, fontSize: 11, fontWeight: 700, marginBottom: 5 }}>{s.change}</div>}
        <div style={{ height: 6, background: `${t.borderColor}50`, borderRadius: 3, overflow: "hidden", marginTop: "auto" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: bColor, borderRadius: 3 }} />
        </div>
        <div style={{ fontSize: 10, color: t.subtleColor, marginTop: 4, opacity: 0.7 }}>{pct}% of target</div>
      </div>
    );
  };

  // Horizontal bar chart — rendered at fixed px for 960×540
  const BarChart = ({ data }: { data: { label: string; value: number; color?: string }[] }) => {
    const max = Math.max(...data.map(d => d.value), 1);
    const colors = [t.accent, "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a78bfa"];
    const rows = data.slice(0, 6);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%", justifyContent: "center" }}>
        {rows.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 130, color: t.bodyColor, fontSize: 12, textAlign: "right", opacity: 0.85, lineHeight: 1.2, flexShrink: 0 }}>{d.label}</div>
            <div style={{ flex: 1, height: 18, background: `${t.borderColor}35`, borderRadius: 4, overflow: "hidden", position: "relative" }}>
              <div style={{ width: `${(d.value / max) * 100}%`, height: "100%", background: d.color || colors[i % colors.length], borderRadius: 4, minWidth: 4 }} />
            </div>
            <div style={{ width: 48, color: t.accent, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{d.value}</div>
          </div>
        ))}
      </div>
    );
  };

  // Donut chart with legend
  const DonutChart = ({ data }: { data: { label: string; value: number; color?: string }[] }) => {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const colors = [t.accent, "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#a78bfa"];
    let startAngle = -90;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const polar = (cx: number, cy: number, r: number, deg: number) => ({ x: cx + r * Math.cos(toRad(deg)), y: cy + r * Math.sin(toRad(deg)) });
    const cx = 75; const cy = 75; const R = 62; const IR = 36;
    const slices = data.slice(0, 5).map((d, i) => {
      const angle = (d.value / total) * 360;
      const end = startAngle + angle;
      const s1 = polar(cx, cy, R, startAngle); const e1 = polar(cx, cy, R, end);
      const s2 = polar(cx, cy, IR, end);       const e2 = polar(cx, cy, IR, startAngle);
      const large = angle > 180 ? 1 : 0;
      const path = `M${s1.x} ${s1.y} A${R} ${R} 0 ${large} 1 ${e1.x} ${e1.y} L${s2.x} ${s2.y} A${IR} ${IR} 0 ${large} 0 ${e2.x} ${e2.y}Z`;
      startAngle = end;
      return { path, color: d.color || colors[i % colors.length], label: d.label, value: d.value, pct: Math.round((d.value / total) * 100) };
    });
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 18, height: "100%" }}>
        <svg viewBox="0 0 150 150" width={150} height={150} style={{ flexShrink: 0 }}>
          {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity={0.92} />)}
          <circle cx={cx} cy={cy} r={IR - 2} fill={t.cardBg} />
          <text x={cx} y={cy - 6} textAnchor="middle" fill={t.accent} fontSize="14" fontWeight="700">{data[0]?.value}</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill={t.subtleColor} fontSize="8">{data[0]?.label?.slice(0, 10)}</text>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {slices.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <div style={{ fontSize: 11, color: t.bodyColor, flex: 1, lineHeight: 1.2 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: t.accent, fontWeight: 700, flexShrink: 0 }}>{s.pct}%</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── TITLE SLIDE ──────────────────────────────────────────────────────────────
  if (slide.type === "title") return (
    <div style={base}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 960 540" preserveAspectRatio="none">
        <defs>
          <linearGradient id="tg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={t.bg}/><stop offset="100%" stopColor={t.cardBg}/>
          </linearGradient>
          <linearGradient id="tg2" x1="1" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor={t.accent} stopOpacity="0.14"/><stop offset="100%" stopColor={t.accent} stopOpacity="0.01"/>
          </linearGradient>
        </defs>
        <rect width="960" height="540" fill="url(#tg)"/>
        <circle cx="820" cy="80" r="280" fill={t.accent} fillOpacity="0.065"/>
        <circle cx="790" cy="20" r="160" fill={t.accent} fillOpacity="0.05"/>
        <circle cx="95" cy="500" r="180" fill={t.accent} fillOpacity="0.04"/>
        <rect x="580" y="0" width="380" height="540" fill="url(#tg2)"/>
        <rect x="0" y="0" width="8" height="540" fill={t.accent}/>
        <rect x="76" y="510" width="830" height="2" fill={t.accent} fillOpacity="0.18"/>
        <rect x="76" y="26" width="340" height="2" fill={t.accent} fillOpacity="0.14"/>
      </svg>
      <div style={{ position: "absolute", top: 18, left: 20, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.accent }} />
        <span style={{ color: t.subtleColor, fontSize: 9, letterSpacing: "0.15em", fontWeight: 600 }}>PERFORMO AI</span>
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", padding: "60px 64px 80px" }}>
        {slide.emphasis && (
          <div style={{ marginBottom: 18, padding: "5px 16px", background: `${t.accent}20`, border: `1px solid ${t.accent}45`, borderRadius: 4, color: t.accent, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{slide.emphasis}</div>
        )}
        <div style={{ color: t.titleColor, fontWeight: 800, fontSize: 52, lineHeight: 1.1, marginBottom: 20, maxWidth: 620 }}>{slide.title}</div>
        {slide.subtitle && <div style={{ color: t.bodyColor, fontSize: 18, opacity: 0.72, maxWidth: 560, lineHeight: 1.55 }}>{slide.subtitle}</div>}
        <div style={{ position: "absolute", bottom: 22, left: 64, display: "flex", alignItems: "center", gap: 6, opacity: 0.38 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: t.accent }} />
          <span style={{ color: t.subtleColor, fontSize: 9, letterSpacing: "0.1em" }}>CONFIDENTIAL</span>
        </div>
      </div>
    </div>
  );

  // ── AGENDA SLIDE ─────────────────────────────────────────────────────────────
  if (slide.type === "agenda") {
    const items = (slide.bullets || []).slice(0, 7);
    const rowH = Math.min(58, Math.floor((440 - (items.length - 1) * 6) / Math.max(items.length, 1)));
    return (
      <div style={base}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 960 540" preserveAspectRatio="none">
          <rect width="960" height="540" fill={t.bg}/>
          <rect x="0" y="0" width="300" height="540" fill={t.accent} fillOpacity="0.04"/>
          <rect x="0" y="0" width="7" height="540" fill={t.accent}/>
          <circle cx="880" cy="480" r="120" fill={t.accent} fillOpacity="0.05"/>
          <circle cx="900" cy="40" r="60" fill={t.accent} fillOpacity="0.04"/>
        </svg>
        <div style={{ position: "absolute", inset: 0, padding: "28px 32px 24px 32px" }}>
          <div style={{ paddingLeft: 12, marginBottom: 20 }}>
            <div style={{ color: t.accent, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700, marginBottom: 5 }}>AGENDA</div>
            <div style={{ color: t.titleColor, fontWeight: 800, fontSize: 28, lineHeight: 1.1 }}>{slide.title}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, height: rowH, padding: "0 18px", background: `${t.cardBg}dd`, borderRadius: 6, border: `1px solid ${t.borderColor}28` }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${t.accent}1e`, border: `2px solid ${t.accent}50`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: t.accent, fontWeight: 800, fontSize: 13 }}>{String(i + 1).padStart(2, "0")}</span>
                </div>
                <span style={{ color: t.bodyColor, fontSize: 17, lineHeight: 1.35, fontWeight: i === 0 ? 600 : 400, flex: 1 }}>{b}</span>
                <div style={{ width: 28, height: 1, background: `${t.accent}25`, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
        <Logo />
      </div>
    );
  }

  // ── SECTION SLIDE ────────────────────────────────────────────────────────────
  if (slide.type === "section") return (
    <div style={base}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 960 540" preserveAspectRatio="none">
        <rect width="960" height="540" fill={t.bg}/>
        <rect x="0" y="0" width="380" height="540" fill={t.accent} fillOpacity="0.1"/>
        <rect x="0" y="0" width="8" height="540" fill={t.accent}/>
        <circle cx="270" cy="270" r="200" fill={t.accent} fillOpacity="0.055"/>
        <circle cx="820" cy="420" r="95" fill={t.accent} fillOpacity="0.04"/>
        <rect x="390" y="224" width="520" height="2" fill={t.accent} fillOpacity="0.12"/>
        <rect x="390" y="310" width="340" height="2" fill={t.accent} fillOpacity="0.08"/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 72px" }}>
        <div style={{ color: t.accent, fontSize: 72, fontWeight: 900, opacity: 0.08, lineHeight: 1, marginBottom: -12 }}>§</div>
        <div style={{ color: t.accent, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, marginBottom: 14 }}>SECTION</div>
        <div style={{ color: t.titleColor, fontWeight: 800, fontSize: 46, lineHeight: 1.12, marginBottom: 14 }}>{slide.title}</div>
        {slide.subtitle && <div style={{ color: t.bodyColor, fontSize: 16, opacity: 0.7, lineHeight: 1.5, maxWidth: 580 }}>{slide.subtitle}</div>}
      </div>
      <Logo />
    </div>
  );

  // ── DATA / KPI SLIDE ─────────────────────────────────────────────────────────
  if (slide.type === "data") {
    const stats = slide.stat?.length ? slide.stat : [
      { value: "—", label: "Metric A", trend: "flat" as const },
      { value: "—", label: "Metric B", trend: "flat" as const },
      { value: "—", label: "Metric C", trend: "flat" as const },
    ];
    const hasChart = slide.chartData && slide.chartData.length > 0;
    const chartType = slide.chartData && slide.chartData.length <= 3 ? "donut" : "bar";
    const statCount = Math.min(stats.length, hasChart ? 3 : 4);
    return (
      <div style={base}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 960 540" preserveAspectRatio="none">
          <rect width="960" height="540" fill={t.bg}/>
          <rect x="0" y="0" width="8" height="540" fill={t.accent}/>
          <rect x="0" y="0" width="960" height="56" fill={t.cardBg} fillOpacity="0.5"/>
          <rect x="0" y="56" width="960" height="1.5" fill={t.borderColor} fillOpacity="0.4"/>
          <circle cx="880" cy="460" r="110" fill={t.accent} fillOpacity="0.04"/>
        </svg>
        <div style={{ position: "absolute", inset: 0, padding: "0 24px 18px 24px" }}>
          <div style={{ height: 56, display: "flex", alignItems: "center", paddingLeft: 14 }}>
            <div style={{ color: t.titleColor, fontWeight: 800, fontSize: 26 }}>{slide.title}</div>
            {slide.emphasis && <div style={{ marginLeft: 14, padding: "3px 12px", background: `${t.accent}1e`, borderRadius: 4, color: t.accent, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em" }}>{slide.emphasis}</div>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: hasChart ? "1fr 340px" : "1fr", gap: 16, height: "calc(100% - 56px - 18px)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${statCount}, 1fr)`, gap: 12 }}>
                {stats.slice(0, statCount).map((s, i) => <TrendBadge key={i} s={s} />)}
              </div>
              {(slide.bullets || []).slice(0, 2).map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 8, color: t.bodyColor, fontSize: 13, alignItems: "flex-start", lineHeight: 1.45 }}>
                  <span style={{ color: t.accent, flexShrink: 0, marginTop: 1 }}>▪</span><span>{b}</span>
                </div>
              ))}
            </div>
            {hasChart && (
              <div style={{ background: t.cardBg, borderRadius: 8, padding: 18, border: `1px solid ${t.borderColor}40`, display: "flex", flexDirection: "column" }}>
                <div style={{ color: t.subtleColor, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>
                  {chartType === "donut" ? "DISTRIBUTION" : "BREAKDOWN"}
                </div>
                <div style={{ flex: 1 }}>
                  {chartType === "donut" ? <DonutChart data={slide.chartData!} /> : <BarChart data={slide.chartData!} />}
                </div>
              </div>
            )}
          </div>
        </div>
        <Logo />
      </div>
    );
  }

  // ── TWO-COLUMN SLIDE ─────────────────────────────────────────────────────────
  if (slide.type === "two-column") {
    const bullets = slide.bullets || [];
    const mid = Math.ceil(bullets.length / 2);
    const colA = bullets.slice(0, mid);
    const colB = bullets.slice(mid);
    return (
      <div style={base}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 960 540" preserveAspectRatio="none">
          <rect width="960" height="540" fill={t.bg}/>
          <rect x="0" y="0" width="8" height="540" fill={t.accent}/>
          <rect x="0" y="0" width="960" height="58" fill={t.cardBg} fillOpacity="0.55"/>
          <rect x="0" y="58" width="960" height="1.5" fill={t.borderColor} fillOpacity="0.4"/>
        </svg>
        <div style={{ position: "absolute", inset: 0, padding: "0 24px 18px 24px" }}>
          <div style={{ height: 58, display: "flex", alignItems: "center", paddingLeft: 14 }}>
            <div style={{ color: t.titleColor, fontWeight: 800, fontSize: 26 }}>{slide.title}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, height: "calc(100% - 58px - 18px)" }}>
            {([colA, colB] as string[][]).map((col, ci) => (
              <div key={ci} style={{ background: ci === 0 ? t.cardBg : `${t.cardBg}80`, borderRadius: 8, padding: "20px 22px", borderTop: `4px solid ${ci === 0 ? t.accent : `${t.accent}60`}`, borderRight: `1px solid ${t.borderColor}50`, borderBottom: `1px solid ${t.borderColor}50`, borderLeft: `1px solid ${t.borderColor}50` }}>
                <div style={{ color: t.accent, fontSize: 10, letterSpacing: "0.14em", fontWeight: 700, marginBottom: 16, textTransform: "uppercase" }}>
                  {ci === 0 ? (slide.emphasis || "Overview") : "Details"}
                </div>
                {col.map((b, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" style={{ flexShrink: 0, marginTop: 4 }}><polygon points="0,0 8,4 0,8" fill={t.accent}/></svg>
                    <span style={{ color: t.bodyColor, fontSize: 15, lineHeight: 1.5 }}>{b}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <Logo />
      </div>
    );
  }

  // ── QUOTE SLIDE ──────────────────────────────────────────────────────────────
  if (slide.type === "quote") return (
    <div style={base}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 960 540" preserveAspectRatio="none">
        <defs>
          <linearGradient id="qg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={t.cardBg}/><stop offset="100%" stopColor={t.bg}/>
          </linearGradient>
        </defs>
        <rect width="960" height="540" fill="url(#qg)"/>
        <text x="42" y="320" fontSize="420" fontWeight="900" fill={t.accent} fillOpacity="0.055" fontFamily="Georgia,serif">"</text>
        <rect x="300" y="494" width="360" height="3" fill={t.accent} fillOpacity="0.26"/>
        <circle cx="870" cy="70" r="95" fill={t.accent} fillOpacity="0.04"/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "70px 110px", textAlign: "center" }}>
        <div style={{ color: t.bodyColor, fontSize: 24, fontStyle: "italic", lineHeight: 1.65, fontWeight: 400, maxWidth: 700 }}>{slide.quote || slide.title}</div>
        {slide.subtitle && (
          <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 28, height: 2, background: t.accent }} />
            <span style={{ color: t.accent, fontSize: 13, fontWeight: 600, letterSpacing: "0.08em" }}>{slide.subtitle}</span>
            <div style={{ width: 28, height: 2, background: t.accent }} />
          </div>
        )}
      </div>
      <Logo />
    </div>
  );

  // ── CLOSING SLIDE ────────────────────────────────────────────────────────────
  if (slide.type === "closing") return (
    <div style={base}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 960 540" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={t.bg}/><stop offset="100%" stopColor={t.cardBg}/>
          </linearGradient>
        </defs>
        <rect width="960" height="540" fill="url(#cg)"/>
        <circle cx="480" cy="270" r="310" fill={t.accent} fillOpacity="0.04"/>
        <circle cx="480" cy="270" r="230" fill={t.accent} fillOpacity="0.032"/>
        <circle cx="480" cy="270" r="155" fill={t.accent} fillOpacity="0.028"/>
        <rect x="0" y="0" width="8" height="540" fill={t.accent}/>
        <rect x="952" y="0" width="8" height="540" fill={t.accent} fillOpacity="0.35"/>
        <rect x="80" y="36" width="800" height="2" fill={t.accent} fillOpacity="0.16"/>
        <rect x="80" y="498" width="800" height="2" fill={t.accent} fillOpacity="0.16"/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "50px 60px", textAlign: "center" }}>
        <div style={{ color: t.titleColor, fontWeight: 800, fontSize: 44, marginBottom: 16, lineHeight: 1.1, maxWidth: 720 }}>{slide.title}</div>
        {slide.subtitle && <div style={{ color: t.bodyColor, fontSize: 18, opacity: 0.72, marginBottom: 32, lineHeight: 1.45 }}>{slide.subtitle}</div>}
        {slide.bullets?.[0] && (
          <div style={{ padding: "14px 42px", background: t.accent, borderRadius: 6, color: t.bg, fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 14 }}>
            {slide.bullets[0]}
          </div>
        )}
        {slide.bullets?.[1] && <div style={{ color: t.bodyColor, fontSize: 12, opacity: 0.5 }}>{slide.bullets[1]}</div>}
      </div>
      <Logo />
    </div>
  );

  // ── TABLE SLIDE ──────────────────────────────────────────────────────────────
  if (slide.type === "table") {
    const table = slide.tableData || {
      headers: ["Category", "Q1", "Q2", "Target", "Status"],
      rows: [
        ["Revenue",   "$2.4M", "$2.8M", "$2.6M", "✓ On Track"],
        ["EBITDA",    "$0.8M", "$1.0M", "$0.9M", "✓ On Track"],
        ["Occupancy", "82%",   "88%",   "85%",   "✓ On Track"],
        ["NPS",       "48",    "54",    "50",    "✓ On Track"],
      ],
    };
    const cols = table.headers.length;
    const rows = table.rows.length;
    return (
      <div style={base}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 960 540" preserveAspectRatio="none">
          <rect width="960" height="540" fill={t.bg}/>
          <rect x="0" y="0" width="8" height="540" fill={t.accent}/>
          <rect x="0" y="0" width="960" height="58" fill={t.cardBg} fillOpacity="0.6"/>
          <rect x="0" y="58" width="960" height="1.5" fill={t.borderColor} fillOpacity="0.5"/>
          <circle cx="880" cy="460" r="95" fill={t.accent} fillOpacity="0.03"/>
        </svg>
        <div style={{ position: "absolute", inset: 0, padding: "0 24px 18px 24px" }}>
          <div style={{ height: 58, display: "flex", alignItems: "center", paddingLeft: 14 }}>
            <div style={{ color: t.titleColor, fontWeight: 800, fontSize: 26 }}>{slide.title}</div>
            {slide.emphasis && <div style={{ marginLeft: 14, padding: "3px 12px", background: `${t.accent}1e`, borderRadius: 4, color: t.accent, fontSize: 11, fontWeight: 600 }}>{slide.emphasis}</div>}
          </div>
          <div style={{ borderRadius: 6, overflow: "hidden", border: `1px solid ${t.borderColor}40` }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {table.headers.map((h, i) => (
                <div key={i} style={{ background: i === 0 ? t.accent : `${t.accent}cc`, color: t.bg, padding: "10px 14px", fontWeight: 700, fontSize: 12, borderRight: i < cols - 1 ? "1px solid rgba(0,0,0,0.15)" : "none", letterSpacing: "0.04em" }}>{h}</div>
              ))}
            </div>
            {table.rows.map((row, ri) => (
              <div key={ri} style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, background: ri % 2 === 0 ? `${t.cardBg}55` : "transparent" }}>
                {row.map((cell, ci) => (
                  <div key={ci} style={{ color: ci === 0 ? t.bodyColor : (cell.includes("✓") || cell.startsWith("+") ? "#22c55e" : cell.startsWith("-") || cell.includes("✗") ? "#ef4444" : t.bodyColor), fontWeight: ci === 0 ? 600 : 400, padding: "9px 14px", fontSize: 13, borderRight: ci < cols - 1 ? `1px solid ${t.borderColor}25` : "none", borderBottom: ri < rows - 1 ? `1px solid ${t.borderColor}15` : "none", lineHeight: 1.35 }}>{cell}</div>
                ))}
              </div>
            ))}
          </div>
          {slide.subtitle && <div style={{ marginTop: 8, color: t.subtleColor, fontSize: 11, fontStyle: "italic", paddingLeft: 4 }}>{slide.subtitle}</div>}
        </div>
        <Logo />
      </div>
    );
  }

  // ── IMAGE SLIDE ──────────────────────────────────────────────────────────────
  if (slide.type === "image") return (
    <div style={base}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 960 540" preserveAspectRatio="none">
        <rect width="960" height="540" fill={t.bg}/>
        <rect x="0" y="0" width="8" height="540" fill={t.accent}/>
      </svg>
      {slide.imageUrl ? (
        <div style={{ position: "absolute", top: "12%", left: "6%", right: "6%", bottom: "18%", borderRadius: 8, overflow: "hidden", boxShadow: "0 6px 32px rgba(0,0,0,0.4)" }}>
          <img src={slide.imageUrl} alt={slide.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ) : (
        <div style={{ position: "absolute", top: "12%", left: "6%", right: "6%", bottom: "18%", borderRadius: 8, background: `${t.cardBg}80`, border: `2px dashed ${t.borderColor}60`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={t.subtleColor} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span style={{ color: t.subtleColor, fontSize: 13 }}>Image placeholder</span>
        </div>
      )}
      <div style={{ position: "absolute", bottom: "4%", left: "7%", right: "7%" }}>
        <div style={{ color: t.titleColor, fontWeight: 700, fontSize: 20 }}>{slide.title}</div>
        {slide.subtitle && <div style={{ color: t.bodyColor, fontSize: 14, opacity: 0.7, marginTop: 4 }}>{slide.subtitle}</div>}
      </div>
      <Logo />
    </div>
  );

  // ── CONTENT SLIDE (default) ──────────────────────────────────────────────────
  const bullets = slide.bullets || [];
  const hasManyBullets = bullets.length >= 5;
  const bulletFontSize = hasManyBullets ? 14 : 16;
  const bulletPadV = hasManyBullets ? 7 : 9;
  return (
    <div style={base}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 960 540" preserveAspectRatio="none">
        <rect width="960" height="540" fill={t.bg}/>
        <rect x="0" y="0" width="8" height="540" fill={t.accent}/>
        <rect x="0" y="0" width="960" height="54" fill={t.cardBg} fillOpacity="0.52"/>
        <rect x="0" y="54" width="960" height="1.5" fill={t.borderColor} fillOpacity="0.4"/>
        <circle cx="860" cy="460" r="100" fill={t.accent} fillOpacity="0.04"/>
      </svg>
      <div style={{ position: "absolute", inset: 0, padding: "0 24px 14px 24px" }}>
        <div style={{ height: 54, display: "flex", alignItems: "center", paddingLeft: 14 }}>
          <div style={{ color: t.titleColor, fontWeight: 800, fontSize: 24 }}>{slide.title}</div>
        </div>
        {slide.emphasis && (
          <div style={{ marginBottom: 8, marginLeft: 14, padding: "8px 16px", background: `${t.accent}12`, borderLeft: `4px solid ${t.accent}`, borderRadius: "0 4px 4px 0", color: t.accent, fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{slide.emphasis}</div>
        )}
        {slide.body && (
          <div style={{ marginBottom: 9, marginLeft: 14, marginRight: 14, color: t.bodyColor, fontSize: 12.5, lineHeight: 1.6, opacity: 0.78, fontStyle: "italic", paddingLeft: 4 }}>{slide.body}</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 14 }}>
          {bullets.slice(0, 6).map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: `${bulletPadV}px 12px`, background: i % 2 === 0 ? `${t.cardBg}40` : "transparent", borderRadius: 4 }}>
              <svg width="8" height="8" viewBox="0 0 9 9" style={{ flexShrink: 0, marginTop: 4 }}>
                <circle cx="4.5" cy="4.5" r="4" fill={t.accent} fillOpacity="0.9"/>
              </svg>
              <span style={{ color: t.bodyColor, fontSize: bulletFontSize, lineHeight: 1.48 }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
      <Logo />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 14: PREVIEW RENDERER — Slide Thumbnail (CSS-scale based, crisp)
// ═══════════════════════════════════════════════════════════════════════════════
function SlideThumbnail({ slide, theme, index, active, onClick }: {
  slide: Slide; theme: Theme; index: number; active: boolean; onClick: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useLayoutEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.getBoundingClientRect().width;
        if (w > 0) setScale(w / SLIDE_W);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} onClick={onClick}
      className={`cursor-pointer group transition-all ${active ? "ring-2 ring-primary ring-offset-1 ring-offset-background rounded" : ""}`}
      data-testid={`thumb-slide-${index}`}>
      <div className="text-[9px] text-center font-medium mb-0.5 tabular-nums" style={{ color: active ? "var(--primary)" : "var(--muted-foreground)" }}>{index + 1}</div>
      <div className="w-full rounded overflow-hidden" style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
        <div style={{
          position: "absolute", top: 0, left: 0,
          width: SLIDE_W, height: SLIDE_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}>
          <SlideCanvas slide={slide} theme={theme} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 9: TRANSITION & ANIMATION — FullscreenViewer (Morph-inspired)
// ═══════════════════════════════════════════════════════════════════════════════
function FullscreenViewer({ slides, theme, initialIdx, onClose }: {
  slides: Slide[]; theme: Theme; initialIdx: number; onClose: () => void;
}) {
  const [idx, setIdx] = useState(initialIdx);
  const [transitioning, setTransitioning] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [visible, setVisible] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = THEMES[theme];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, []);

  const navigate = useCallback((newIdx: number, dir: "next" | "prev") => {
    if (newIdx < 0 || newIdx >= slides.length || transitioning) return;
    setDirection(dir);
    setTransitioning(true);
    setTimeout(() => {
      setIdx(newIdx);
      setTransitioning(false);
    }, 300);
    resetControlsTimer();
  }, [slides.length, transitioning, resetControlsTimer]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); navigate(idx + 1, "next"); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); navigate(idx - 1, "prev"); }
      else if (e.key === "Home") navigate(0, "prev");
      else if (e.key === "End") navigate(slides.length - 1, "next");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [idx, navigate, onClose, slides.length]);

  const slide = slides[idx];
  const progress = ((idx + 1) / slides.length) * 100;

  const slideStyle: React.CSSProperties = {
    opacity: transitioning ? 0 : 1,
    transform: transitioning
      ? `translateX(${direction === "next" ? "-30px" : "30px"}) scale(0.97)`
      : "translateX(0) scale(1)",
    transition: "opacity 0.3s ease, transform 0.3s ease",
  };

  return (
    <div
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#000",
        display: "flex", flexDirection: "column",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
        cursor: showControls ? "default" : "none",
      }}>

      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "12px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)",
        zIndex: 10,
        opacity: showControls ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent }} />
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 600, fontFamily: "system-ui" }}>
            {slides[0]?.type === "title" ? (slides[0].title || "Presentation") : "Presentation"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "system-ui" }}>
            {idx + 1} / {slides.length}
          </span>
          <button
            onClick={onClose}
            style={{ padding: "6px 14px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 6, color: "rgba(255,255,255,0.8)", fontSize: 12, cursor: "pointer", fontFamily: "system-ui", display: "flex", alignItems: "center", gap: 6 }}
            data-testid="btn-fullscreen-close">
            <X style={{ width: 12, height: 12 }} /> ESC
          </button>
        </div>
      </div>

      {/* Slide area */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "70px 80px 80px" }}>
        <div style={{ width: "100%", maxWidth: "min(calc(100vh * 16 / 9 - 140px), 100%)", ...slideStyle }}>
          <div style={{ borderRadius: 10, overflow: "hidden", boxShadow: "0 25px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)" }}>
            <ScaledSlide slide={slide} theme={theme} />
          </div>
        </div>
      </div>

      {/* Left arrow */}
      {idx > 0 && (
        <button
          onClick={() => navigate(idx - 1, "prev")}
          style={{
            position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)",
            width: 48, height: 48, borderRadius: "50%",
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "rgba(255,255,255,0.8)",
            opacity: showControls ? 1 : 0, transition: "opacity 0.4s ease",
            zIndex: 10,
          }}
          data-testid="btn-fullscreen-prev">
          <ChevronLeft style={{ width: 22, height: 22 }} />
        </button>
      )}

      {/* Right arrow */}
      {idx < slides.length - 1 && (
        <button
          onClick={() => navigate(idx + 1, "next")}
          style={{
            position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)",
            width: 48, height: 48, borderRadius: "50%",
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "rgba(255,255,255,0.8)",
            opacity: showControls ? 1 : 0, transition: "opacity 0.4s ease",
            zIndex: 10,
          }}
          data-testid="btn-fullscreen-next">
          <ChevronRight style={{ width: 22, height: 22 }} />
        </button>
      )}

      {/* Bottom controls */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "16px 24px 20px",
        display: "flex", flexDirection: "column", gap: 10,
        background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
        opacity: showControls ? 1 : 0, transition: "opacity 0.4s ease",
        zIndex: 10,
      }}>
        {/* Progress bar */}
        <div style={{ height: 2, background: "rgba(255,255,255,0.12)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: t.accent, borderRadius: 2, transition: "width 0.3s ease" }} />
        </div>
        {/* Dot navigation */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => navigate(i, i > idx ? "next" : "prev")}
              style={{
                width: i === idx ? 20 : 6, height: 6, borderRadius: 3,
                background: i === idx ? t.accent : "rgba(255,255,255,0.3)",
                border: "none", cursor: "pointer", padding: 0,
                transition: "all 0.3s ease",
              }}
              title={slides[i].title}
            />
          ))}
        </div>
        {/* Speaker notes */}
        {slide.notes && (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 11, fontStyle: "italic", maxWidth: 600, margin: "0 auto" }}>
            {slide.notes}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Theme Picker
// ═══════════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════════
// Questions View
// ═══════════════════════════════════════════════════════════════════════════════
function QuestionsView({
  prompt, questions, answers, isLoading,
  onAnswer, onSkip, onGenerate, onBack,
}: {
  prompt: string; questions: AiQuestion[];
  answers: Record<string, string>; isLoading: boolean;
  onAnswer: (id: string, val: string) => void;
  onSkip: () => void; onGenerate: () => void; onBack: () => void;
}) {
  const answeredCount = questions.filter(q => answers[q.id]?.trim()).length;
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" data-testid="btn-questions-back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="font-semibold text-base">A few quick questions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Help me tailor the presentation to your exact needs</p>
          </div>
        </div>
        <div className="bg-muted/40 rounded-xl p-4 border border-border/50">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">Your request</p>
          <p className="text-sm text-foreground leading-relaxed">{prompt}</p>
        </div>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl border p-5 space-y-3 animate-pulse">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2.5 bg-muted rounded w-1/2 opacity-60" />
                <div className="h-9 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.id} className="rounded-xl border bg-card p-5 space-y-3 transition-all hover:border-primary/30" data-testid={`question-card-${i}`}>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-snug">{q.question}</p>
                    <p className="text-[11px] text-muted-foreground">{q.why}</p>
                  </div>
                </div>
                <Textarea
                  value={answers[q.id] || ""}
                  onChange={e => onAnswer(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  className="min-h-[64px] text-sm resize-none"
                  data-testid={`answer-input-${i}`}
                />
              </div>
            ))}
          </div>
        )}
        {!isLoading && (
          <div className="flex items-center justify-between pt-2">
            <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2" data-testid="btn-skip-questions">
              Skip and generate anyway
            </button>
            <Button onClick={onGenerate} className="gap-2" data-testid="btn-generate-from-answers">
              <Sparkles className="h-4 w-4" />
              Generate Outline
              {answeredCount > 0 && <span className="ml-1 text-xs opacity-75">({answeredCount} answered)</span>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Home / Create View
// ═══════════════════════════════════════════════════════════════════════════════
function HomeView({
  presentations, isLoading,
  onGenerate, onOpen, onDelete,
}: {
  presentations: PresentationRecord[]; isLoading: boolean;
  onGenerate: (opts: { prompt: string; sources: SourceType[]; fileText: string | null; fileName: string | null; slideCount: number; theme: Theme }) => void;
  onOpen: (p: PresentationRecord) => void;
  onDelete: (id: number) => void;
}) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [sources, setSources] = useState<SourceType[]>([]);
  const [slideCount, setSlideCount] = useState(10);
  const [theme, setTheme] = useState<Theme>("executive-dark");
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => promptRef.current?.focus(), 100); }, []);

  const toggleSource = (key: SourceType) =>
    setSources(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const resp = await fetch("/api/presentations/upload-source", { method: "POST", body: fd, credentials: "include" });
      if (!resp.ok) throw new Error((await resp.json()).message);
      const data = await resp.json();
      setFileText(data.text); setFileName(data.fileName);
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
    try { await onGenerate({ prompt: prompt.trim(), sources, fileText, fileName, slideCount, theme }); }
    finally { setGenerating(false); }
  };

  return (
    <div className="min-h-full bg-background">
      <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-background border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Presentation className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Presentation Studio</h1>
              <p className="text-slate-400 text-xs">AI-powered slides from your Performo data</p>
            </div>
          </div>

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
            <div className="border-t border-slate-700/60 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Slides:</span>
                  <select value={slideCount} onChange={e => setSlideCount(Number(e.target.value))}
                    className="bg-slate-800 border border-slate-600 text-slate-200 text-[11px] rounded-lg px-2 py-1 outline-none"
                    data-testid="select-slide-count">
                    {[5, 8, 10, 12, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Theme:</span>
                  <select value={theme} onChange={e => setTheme(e.target.value as Theme)}
                    className="bg-slate-800 border border-slate-600 text-slate-200 text-[11px] rounded-lg px-2 py-1 outline-none"
                    data-testid="select-theme-home">
                    {(Object.entries(THEMES) as [Theme, any][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <Button onClick={handleGenerate} disabled={!prompt.trim() || generating}
                className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-8 px-5 text-sm"
                data-testid="btn-generate-outline">
                {generating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {generating ? "Generating outline…" : "Generate Outline"}
                {!generating && <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center">
            <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
              className="flex items-center gap-2 text-[11px] text-slate-600 border border-dashed border-slate-700 rounded-lg px-4 py-2 w-full text-center justify-center hover:border-slate-500 hover:text-slate-500 transition-colors cursor-default">
              <Upload className="h-3 w-3" />Drop a file here (.txt, .md, .csv, .xlsx) to include as context
            </div>
          </div>
        </div>
      </div>

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
                const thm = THEMES[p.theme as Theme] || THEMES["executive-dark"];
                const firstSlide = (p.slides as Slide[])?.[0];
                const THUMB_W = 80; const THUMB_H = 45;
                const thumbScale = THUMB_W / SLIDE_W;
                return (
                  <div key={p.id} onClick={() => onOpen(p)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 cursor-pointer group transition-all"
                    data-testid={`card-presentation-${p.id}`}>
                    <div className="rounded overflow-hidden shrink-0" style={{ width: THUMB_W, height: THUMB_H, background: thm.bg, position: "relative" }}>
                      {firstSlide ? (
                        <div style={{ position: "absolute", top: 0, left: 0, width: SLIDE_W, height: SLIDE_H, transform: `scale(${thumbScale})`, transformOrigin: "top left", pointerEvents: "none" }}>
                          <SlideCanvas slide={firstSlide} theme={p.theme as Theme} />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Presentation className="h-4 w-4 opacity-20" style={{ color: thm.bodyColor }} />
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

// ═══════════════════════════════════════════════════════════════════════════════
// Outline Review View
// ═══════════════════════════════════════════════════════════════════════════════
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
        <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="h-6 w-6 text-primary animate-pulse" /></div>
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

  return (
    <div className="flex flex-col h-full">
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
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-2">
          {outline.map((item, idx) => {
            const Icon = SLIDE_TYPE_ICONS[item.type] || Type;
            return (
              <div key={item.id} className="flex items-start gap-3 p-3.5 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all group">
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  <span className="text-[11px] font-bold text-muted-foreground/40 w-5 text-right tabular-nums">{idx + 1}</span>
                  <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <input className="w-full bg-transparent font-semibold text-sm outline-none focus:text-primary transition-colors border-b border-transparent focus:border-primary/30 pb-0.5"
                    value={item.title} onChange={e => onEdit(item.id, "title", e.target.value)} data-testid={`outline-title-${idx}`} />
                  <input className="w-full bg-transparent text-[11px] text-muted-foreground outline-none focus:text-foreground transition-colors"
                    value={item.description} onChange={e => onEdit(item.id, "description", e.target.value)} data-testid={`outline-desc-${idx}`} />
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0 self-start mt-0.5 whitespace-nowrap">
                  {SLIDE_TYPE_LABELS[item.type] || item.type}
                </Badge>
              </div>
            );
          })}
        </div>
        <div className="max-w-2xl mx-auto mt-6 flex justify-end">
          <Button onClick={onBuild} disabled={outline.length === 0} className="gap-2 shadow-lg" data-testid="btn-build-presentation-bottom">
            <Wand2 className="h-4 w-4" />Build Presentation ({outline.length} slides)
          </Button>
        </div>
      </div>
    </div>
  );
}

// Generating View
function GeneratingView({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-24">
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="h-8 w-8 text-primary animate-pulse" /></div>
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

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 11: SLIDE COMPOSITION ENGINE — Editor View
// ═══════════════════════════════════════════════════════════════════════════════
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
  const [canvasKey, setCanvasKey] = useState(0);
  const [canvasFlash, setCanvasFlash] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [exporting, setExporting] = useState<"pptx" | "pdf" | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const selectedSlide = slides[selectedIdx] || slides[0];

  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => { onSave({ title, slides: slides as any, theme }); }, 30000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [slides, theme, title]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setExportMenuOpen(false);
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setAddMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateSlide = (idx: number, data: Partial<Slide>) =>
    setSlides(prev => prev.map((s, i) => i === idx ? { ...s, ...data } : s));

  const addSlide = (type: SlideType) => {
    const ns: Slide = {
      id: `slide-${Date.now()}`, type, title: "New Slide",
      bullets: ["Add your content here"], notes: "",
      ...(type === "table" ? { tableData: { headers: ["Column 1", "Column 2", "Column 3", "Column 4"], rows: [["Row 1", "Data", "Data", "Data"], ["Row 2", "Data", "Data", "Data"]] } } : {}),
    };
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

  const moveSlide = (idx: number, dir: "up" | "down") => {
    const newIdx = dir === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= slides.length) return;
    const next = [...slides];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setSlides(next); setSelectedIdx(newIdx);
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
      if (!resp.ok) throw new Error(data.message || `Server error ${resp.status}`);
      if (!data.slide) throw new Error("No refined slide returned");
      // Merge AI result — preserve original fields not returned by AI
      const merged: Slide = { ...selectedSlide, ...data.slide };
      updateSlide(selectedIdx, merged);
      // Force canvas remount + flash so changes are always visible
      setCanvasKey(k => k + 1);
      setCanvasFlash(true);
      setTimeout(() => setCanvasFlash(false), 800);
      setAiPrompt("");
      toast({ title: "Slide refined", description: "Changes applied to canvas" });
    } catch (err: any) {
      toast({ title: "AI refinement failed", description: err.message || "Unknown error", variant: "destructive" });
    } finally { setAiLoading(false); }
  };

  const handleExportPptx = async () => {
    setExportMenuOpen(false);
    setExporting("pptx");
    try {
      await exportToPptx(slides, theme, title);
      toast({ title: "PPTX exported successfully" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally { setExporting(null); }
  };

  const handleExportPdf = () => {
    setExportMenuOpen(false);
    setExporting("pdf");
    try {
      exportToPdf(slides, theme, title);
      toast({ title: "PDF print dialog opened", description: "Use your browser's Print → Save as PDF" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally { setExporting(null); }
  };

  const SLIDE_TYPES: { type: SlideType; label: string }[] = [
    { type: "content", label: "Content" }, { type: "two-column", label: "Two Column" },
    { type: "data", label: "Data / Stats" }, { type: "quote", label: "Quote" },
    { type: "agenda", label: "Agenda" }, { type: "section", label: "Section" },
    { type: "table", label: "Table" }, { type: "image", label: "Image" },
    { type: "title", label: "Title" }, { type: "closing", label: "Closing" },
  ];

  return (
    <div className="flex flex-col h-full bg-background" style={{ minHeight: 0 }}>
      {/* Fullscreen viewer overlay */}
      {fullscreen && (
        <FullscreenViewer
          slides={slides}
          theme={theme}
          initialIdx={selectedIdx}
          onClose={() => setFullscreen(false)}
        />
      )}

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
          <div className="relative" ref={addMenuRef}>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setAddMenuOpen(v => !v)} data-testid="btn-add-slide">
              <Plus className="h-3 w-3" />Slide <ChevronDown className="h-2.5 w-2.5" />
            </Button>
            {addMenuOpen && (
              <div className="absolute top-8 right-0 z-50 bg-popover border rounded-xl shadow-xl p-1.5 w-44">
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

          {/* Fullscreen */}
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setFullscreen(true)} data-testid="btn-fullscreen">
            <Maximize2 className="h-3 w-3" />Present
          </Button>

          {/* Export */}
          <div className="relative" ref={exportMenuRef}>
            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setExportMenuOpen(v => !v)} disabled={!!exporting} data-testid="btn-export">
              {exporting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              {exporting ? (exporting === "pptx" ? "Exporting…" : "Opening…") : "Export"}
              <ChevronDown className="h-2.5 w-2.5" />
            </Button>
            {exportMenuOpen && (
              <div className="absolute top-8 right-0 z-50 bg-popover border rounded-xl shadow-xl p-1.5 w-48">
                <button onClick={handleExportPptx}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-muted w-full text-left">
                  <div className="h-6 w-6 rounded bg-orange-500/15 flex items-center justify-center shrink-0">
                    <Layers className="h-3 w-3 text-orange-500" />
                  </div>
                  <div>
                    <div className="font-medium">Export as PPTX</div>
                    <div className="text-muted-foreground text-[10px]">PowerPoint presentation</div>
                  </div>
                </button>
                <button onClick={handleExportPdf}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-muted w-full text-left">
                  <div className="h-6 w-6 rounded bg-red-500/15 flex items-center justify-center shrink-0">
                    <FileDown className="h-3 w-3 text-red-500" />
                  </div>
                  <div>
                    <div className="font-medium">Export as PDF</div>
                    <div className="text-muted-foreground text-[10px]">Print-ready slides</div>
                  </div>
                </button>
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
              <div className="absolute top-5 right-0 hidden group-hover:flex gap-0.5 flex-col">
                <button onClick={() => moveSlide(i, "up")} disabled={i === 0} className="p-0.5 rounded bg-background/90 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30" title="Move up">
                  <ChevronUp className="h-2.5 w-2.5" />
                </button>
                <button onClick={() => moveSlide(i, "down")} disabled={i === slides.length - 1} className="p-0.5 rounded bg-background/90 hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30" title="Move down">
                  <ChevronDown className="h-2.5 w-2.5" />
                </button>
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
          {slides.length === 0 && (
            <div className="w-full max-w-2xl flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                <Layers className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-base">No slides generated</p>
                <p className="text-sm text-muted-foreground mt-1">The slide generation didn't complete. Use the <strong>+ Slide</strong> button to add slides manually, or go back to regenerate from the outline.</p>
              </div>
              <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />Return to home
              </Button>
            </div>
          )}
          {selectedSlide && (
            <div className="w-full max-w-2xl">
              {/* Live preview with fullscreen button */}
              <div className={`relative group/canvas rounded-xl overflow-hidden shadow-xl transition-all duration-300 ${canvasFlash ? "ring-2 ring-primary ring-offset-2" : "ring-1 ring-border/50"}`}>
                <ScaledSlide key={canvasKey} slide={selectedSlide} theme={theme} />
                <button
                  onClick={() => setFullscreen(true)}
                  className="absolute top-2 right-2 opacity-0 group-hover/canvas:opacity-100 transition-opacity p-1.5 rounded-lg bg-black/50 backdrop-blur text-white hover:bg-black/70"
                  title="Full-screen presentation"
                  data-testid="btn-canvas-fullscreen">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Edit panel */}
              <div className="mt-4 bg-card rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Slide {selectedIdx + 1} — {SLIDE_TYPE_LABELS[selectedSlide.type]}
                  </p>
                  <div className="flex items-center gap-1">
                    {/* Slide type switcher */}
                    <Select value={selectedSlide.type} onValueChange={v => updateSlide(selectedIdx, { type: v as SlideType })}>
                      <SelectTrigger className="h-6 text-[10px] w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SLIDE_TYPES.map(opt => (
                          <SelectItem key={opt.type} value={opt.type}><span className="text-xs">{opt.label}</span></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Title</Label>
                    <Input value={selectedSlide.title || ""} onChange={e => updateSlide(selectedIdx, { title: e.target.value })} className="h-8 text-sm" data-testid="input-slide-title" />
                  </div>
                  {["title", "section", "closing", "quote", "image"].includes(selectedSlide.type) && (
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
                  {selectedSlide.type === "table" && selectedSlide.tableData && (
                    <div className="space-y-1">
                      <Label className="text-[11px]">Table headers (comma-separated)</Label>
                      <Input
                        value={selectedSlide.tableData.headers.join(", ")}
                        onChange={e => updateSlide(selectedIdx, { tableData: { ...selectedSlide.tableData!, headers: e.target.value.split(",").map(h => h.trim()) } })}
                        className="h-8 text-sm"
                      />
                      <Label className="text-[11px]">Table rows (one row per line, cells comma-separated)</Label>
                      <Textarea
                        value={selectedSlide.tableData.rows.map(r => r.join(", ")).join("\n")}
                        onChange={e => updateSlide(selectedIdx, { tableData: { ...selectedSlide.tableData!, rows: e.target.value.split("\n").filter(Boolean).map(r => r.split(",").map(c => c.trim())) } })}
                        className="min-h-[80px] text-sm font-mono"
                      />
                    </div>
                  )}
                  {["title", "content", "data", "two-column"].includes(selectedSlide.type) && (
                    <div className="space-y-1">
                      <Label className="text-[11px]">Emphasis / label</Label>
                      <Input value={selectedSlide.emphasis || ""} onChange={e => updateSlide(selectedIdx, { emphasis: e.target.value })} className="h-8 text-sm" placeholder="e.g. Q2 2026 BOARD REVIEW" />
                    </div>
                  )}
                  {["content", "two-column"].includes(selectedSlide.type) && (
                    <div className="space-y-1">
                      <Label className="text-[11px]">Body paragraph</Label>
                      <Textarea value={selectedSlide.body || ""} onChange={e => updateSlide(selectedIdx, { body: e.target.value })}
                        className="min-h-[60px] text-xs" placeholder="Add a brief explanatory paragraph shown above the bullets…" data-testid="textarea-body" />
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
          <p className="text-[11px] text-muted-foreground mt-3">Slide {selectedIdx + 1} of {slides.length} · auto-saves every 30s · <kbd className="bg-muted px-1 py-0.5 rounded text-[10px]">Space</kbd> / <kbd className="bg-muted px-1 py-0.5 rounded text-[10px]">←→</kbd> in fullscreen</p>
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
                {["Make it more concise", "Add more data points", "Executive-friendly language", "Strengthen the opening", "Add a call to action", "Rewrite with stronger verbs", "Add supporting statistics"].map(s => (
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

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function PresentationStudioPage() {
  const { toast } = useToast();
  const [view, setView] = useState<View>("home");
  const [activePres, setActivePres] = useState<PresentationRecord | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [generateLabel, setGenerateLabel] = useState("Preparing…");
  const [pendingCreate, setPendingCreate] = useState<any>(null);
  const [aiQuestions, setAiQuestions] = useState<AiQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data: presentations = [], isLoading } = useQuery<PresentationRecord[]>({
    queryKey: ["/api/presentations"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => { const r = await apiRequest("POST", "/api/presentations", data); return r.json(); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/presentations"] }),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { const r = await apiRequest("PATCH", `/api/presentations/${id}`, data); return r.json(); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/presentations"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/presentations/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/presentations"] }); toast({ title: "Presentation deleted" }); },
  });

  const handleGenerate = async (opts: { prompt: string; sources: SourceType[]; fileText: string | null; fileName: string | null; slideCount: number; theme: Theme }) => {
    // Clean up prompt into a proper presentation title
    const cleanTitle = (p: string) => {
      let t = p.trim();
      t = t.replace(/^(create|make|build|develop|generate|write|prepare|produce)\s+(a|an|me|us|the)?\s*(presentation|deck|slides|slide deck)\s*(for|on|about|covering|of|titled)?\s*/i, "");
      t = t.replace(/^(presentation|deck|slides?)\s+(for|on|about|covering|of)\s*/i, "");
      t = t.trim();
      t = t.charAt(0).toUpperCase() + t.slice(1);
      return t.slice(0, 72).trim() || "Business Presentation";
    };

    // Auto-detect sources from the prompt so user doesn't have to manually select them
    const autoDetectSources = (p: string): SourceType[] => {
      const lower = p.toLowerCase();
      const detected: SourceType[] = [...opts.sources];
      if (/kpi|metric|target|occupancy|revenue|adr|revpar|gop|nps|score|rate|performance/.test(lower) && !detected.includes("kpis")) detected.push("kpis");
      if (/project|portfolio|initiative|program|roadmap|milestone|progress|status/.test(lower) && !detected.includes("projects")) detected.push("projects");
      if (/review|monthly|summary|gap|recommendation|last month/.test(lower) && !detected.includes("reviews")) detected.push("reviews");
      if (/action|task|workflow|ticket|license|certificate|due|overdue/.test(lower) && !detected.includes("workflow")) detected.push("workflow");
      return detected;
    };

    const finalSources = autoDetectSources(opts.prompt);
    const brief = {
      title: cleanTitle(opts.prompt),
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

    setPendingCreate({ brief, sources: finalSources, theme: opts.theme, sourceData });
    setAnswers({});
    setAiQuestions([]);
    setQuestionsLoading(true);
    setView("questions");

    try {
      const resp = await fetch("/api/presentations/generate-questions", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ prompt: opts.prompt, sources: opts.sources }),
      });
      if (!resp.ok) {
        setView("outline");
        await generateOutline(brief, sourceData, opts.sources, {});
        return;
      }
      const data = await resp.json();
      setAiQuestions(data.questions || []);
    } catch {
      setView("outline");
      await generateOutline(brief, sourceData, opts.sources, {});
    } finally {
      setQuestionsLoading(false);
    }
  };

  const generateOutline = async (brief: any, sourceData: any, sources: SourceType[], answersMap: Record<string, string>) => {
    setOutlineLoading(true);
    setOutline([]);
    try {
      const answeredPairs = Object.entries(answersMap)
        .filter(([, v]) => v.trim())
        .map(([id, answer]) => {
          const q = aiQuestions.find(q => q.id === id);
          return { question: q?.question || id, answer };
        });
      const resp = await fetch("/api/presentations/generate-outline", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ brief, sourceData, sources, answers: answeredPairs }),
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

  const handleGenerateFromQuestions = async () => {
    if (!pendingCreate) return;
    setView("outline");
    await generateOutline(pendingCreate.brief, pendingCreate.sourceData, pendingCreate.sources, answers);
  };

  const handleRegenerate = () => {
    if (!pendingCreate) return;
    generateOutline(pendingCreate.brief, pendingCreate.sourceData, pendingCreate.sources, answers);
  };

  const handleBuild = async () => {
    if (!pendingCreate || outline.length === 0) return;
    setView("generating");
    setGenerateProgress(0);
    const LABELS = ["Creating presentation…", "Writing slide content…", "Adding speaker notes…", "Finalising design…"];
    let prog = 0;
    const interval = setInterval(() => {
      prog = Math.min(prog + 7, 90);
      setGenerateProgress(prog);
      setGenerateLabel(LABELS[Math.floor(prog / 25)] || LABELS[3]);
    }, 400);

    try {
      const created = await createMutation.mutateAsync({
        title: pendingCreate.brief.title || "Untitled Presentation",
        sourceTypes: pendingCreate.sources,
        brief: pendingCreate.brief,
        outline,
        theme: pendingCreate.theme,
      }) as any;

      const resp = await fetch(`/api/presentations/${created.id}/generate-slides`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ outline, brief: pendingCreate.brief, sourceData: pendingCreate.sourceData, sources: pendingCreate.sources }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Slide generation failed");
      const slides = Array.isArray(data.slides) ? data.slides : [];
      if (slides.length === 0) throw new Error("AI returned no slides — please try regenerating the outline or simplify the prompt");
      clearInterval(interval);
      setGenerateProgress(100);
      setGenerateLabel("Done!");
      setTimeout(() => {
        setActivePres({ ...created, slides, outline, theme: pendingCreate.theme });
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

  if (view === "questions") return (
    <div className="flex flex-col h-full overflow-hidden">
      <QuestionsView
        prompt={pendingCreate?.brief?.prompt || ""}
        questions={aiQuestions} answers={answers}
        isLoading={questionsLoading}
        onAnswer={(id, val) => setAnswers(prev => ({ ...prev, [id]: val }))}
        onSkip={handleGenerateFromQuestions}
        onGenerate={handleGenerateFromQuestions}
        onBack={() => setView("home")}
      />
    </div>
  );

  if (view === "outline") return (
    <div className="flex flex-col h-full">
      <OutlineView
        outline={outline} brief={pendingCreate?.brief || {}}
        theme={pendingCreate?.theme || "executive-dark"}
        isLoading={outlineLoading}
        onEdit={(id, field, val) => setOutline(prev => prev.map(o => o.id === id ? { ...o, [field]: val } : o))}
        onRegenerate={handleRegenerate} onBuild={handleBuild}
        onBack={() => setView("home")}
      />
    </div>
  );

  if (view === "generating") return (
    <div className="flex flex-col h-full">
      <GeneratingView progress={generateProgress} label={generateLabel} />
    </div>
  );

  if (view === "editor" && activePres) return (
    <EditorView
      presentation={activePres}
      onBack={() => { setView("home"); setActivePres(null); }}
      onSave={handleSave}
      isSaving={saveMutation.isPending}
    />
  );

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
