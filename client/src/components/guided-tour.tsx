import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  X, ChevronRight, ChevronLeft, BarChart2, Target,
  Sparkles, Globe, Upload, Check,
} from "lucide-react";

const TOUR_KEY = "ghc_beacon_tour_done_v1";

export function useTourDone() {
  return typeof window !== "undefined" && !!localStorage.getItem(TOUR_KEY);
}

export function markTourDone() {
  localStorage.setItem(TOUR_KEY, "1");
}

export function resetTour() {
  localStorage.removeItem(TOUR_KEY);
}

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  targetId: string;
  placement: "top" | "bottom" | "left" | "right";
  navigateTo?: string;
}

const STEPS: TourStep[] = [
  {
    id: "analytics-studio",
    title: "Analytics Studio",
    description: "Upload any spreadsheet and instantly get AI-generated charts, KPI cards and insights — no manual setup required.",
    icon: BarChart2,
    iconColor: "text-blue-500",
    targetId: "nav-analytics-studio",
    placement: "right",
    navigateTo: "/analytics",
  },
  {
    id: "upload-data",
    title: "Upload Your Data",
    description: "Drop a CSV or Excel file to create a dataset. The AI analyses it automatically and suggests the best visualisations.",
    icon: Upload,
    iconColor: "text-violet-500",
    targetId: "button-upload-data",
    placement: "bottom",
    navigateTo: "/analytics",
  },
  {
    id: "balanced-scorecard",
    title: "Balanced Scorecard",
    description: "Track strategic KPIs across 4 perspectives — Financial, Customer, Internal, and Learning — with live RAG status and a weighted Performance Score.",
    icon: Target,
    iconColor: "text-emerald-500",
    targetId: "nav-scorecard",
    placement: "right",
    navigateTo: "/scorecard",
  },
  {
    id: "share-link",
    title: "Share with Anyone",
    description: "Generate a public share link for any dashboard or scorecard department view. Recipients see a live read-only page — no login needed.",
    icon: Globe,
    iconColor: "text-cyan-500",
    targetId: "button-share-scorecard",
    placement: "bottom",
    navigateTo: "/scorecard",
  },
  {
    id: "assistant",
    title: "Beacon Assistant",
    description: "Ask questions in plain English — \"Which KPIs are at risk?\" or \"Summarise my dashboard\" — and get instant, data-driven answers.",
    icon: Sparkles,
    iconColor: "text-primary",
    targetId: "button-open-assistant",
    placement: "bottom",
  },
];

interface Rect { top: number; left: number; width: number; height: number }

const PADDING = 10;

function getTooltipPosition(
  target: Rect,
  placement: TourStep["placement"],
  tooltipW: number,
  tooltipH: number,
  vw: number,
  vh: number,
): { top: number; left: number } {
  let top = 0;
  let left = 0;

  switch (placement) {
    case "right":
      top = target.top + target.height / 2 - tooltipH / 2;
      left = target.left + target.width + PADDING + 8;
      break;
    case "left":
      top = target.top + target.height / 2 - tooltipH / 2;
      left = target.left - tooltipW - PADDING - 8;
      break;
    case "bottom":
      top = target.top + target.height + PADDING + 8;
      left = target.left + target.width / 2 - tooltipW / 2;
      break;
    case "top":
    default:
      top = target.top - tooltipH - PADDING - 8;
      left = target.left + target.width / 2 - tooltipW / 2;
      break;
  }

  // Clamp to viewport
  left = Math.max(PADDING, Math.min(left, vw - tooltipW - PADDING));
  top = Math.max(PADDING, Math.min(top, vh - tooltipH - PADDING));
  return { top, left };
}

interface GuidedTourProps {
  onClose: () => void;
}

export function GuidedTour({ onClose }: GuidedTourProps) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const [visible, setVisible] = useState(false);

  const current = STEPS[step];

  // Navigate to page if needed, then locate the target element
  const resolveTarget = useCallback(() => {
    const el = document.getElementById(current.targetId);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const rect: Rect = { top: r.top, left: r.left, width: r.width, height: r.height };
    setTargetRect(rect);

    // Position tooltip
    const tw = tooltipRef.current?.offsetWidth ?? 300;
    const th = tooltipRef.current?.offsetHeight ?? 180;
    const pos = getTooltipPosition(rect, current.placement, tw, th, window.innerWidth, window.innerHeight);
    setTooltipPos(pos);
  }, [current]);

  useEffect(() => {
    setVisible(false);
    if (current.navigateTo) navigate(current.navigateTo);
    const timer = setTimeout(() => {
      resolveTarget();
      setVisible(true);
    }, 350);
    return () => clearTimeout(timer);
  }, [step, current, navigate, resolveTarget]);

  useEffect(() => {
    const handler = () => resolveTarget();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [resolveTarget]);

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleFinish();
  };

  const handlePrev = () => setStep(s => Math.max(0, s - 1));

  const handleFinish = () => {
    markTourDone();
    onClose();
  };

  const handleSkip = () => {
    markTourDone();
    onClose();
  };

  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <>
      {/* Dark overlay with spotlight cutout */}
      <div className="fixed inset-0 z-[100] pointer-events-none">
        {targetRect ? (
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={targetRect.left - PADDING}
                  y={targetRect.top - PADDING}
                  width={targetRect.width + PADDING * 2}
                  height={targetRect.height + PADDING * 2}
                  rx="10"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.55)"
              mask="url(#spotlight-mask)"
            />
            {/* Highlight ring */}
            <rect
              x={targetRect.left - PADDING}
              y={targetRect.top - PADDING}
              width={targetRect.width + PADDING * 2}
              height={targetRect.height + PADDING * 2}
              rx="10"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeDasharray="6 3"
              opacity="0.9"
            />
          </svg>
        ) : (
          <div className="absolute inset-0 bg-black/50" />
        )}
      </div>

      {/* Click-through for overlay */}
      <div
        className="fixed inset-0 z-[101]"
        style={{ pointerEvents: targetRect ? "auto" : "none" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) { /* don't skip on backdrop click */ }
        }}
      />

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className={cn(
          "fixed z-[102] w-[300px] bg-background border border-border rounded-2xl shadow-2xl transition-all duration-200",
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-2">
            <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10")}>
              <Icon className={cn("h-4 w-4", current.iconColor)} />
            </div>
            <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 font-normal text-muted-foreground">
              {step + 1} of {STEPS.length}
            </Badge>
          </div>
          <button
            onClick={handleSkip}
            className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            data-testid="button-tour-skip"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          <h3 className="text-sm font-semibold mb-1">{current.title}</h3>
          <p className="text-[12px] text-muted-foreground leading-relaxed">{current.description}</p>
        </div>

        {/* Progress bar */}
        <div className="px-4">
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleSkip}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            data-testid="button-tour-skip-text"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs gap-1"
                onClick={handlePrev}
                data-testid="button-tour-prev"
              >
                <ChevronLeft className="h-3 w-3" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              className="h-7 px-3 text-xs gap-1"
              onClick={handleNext}
              data-testid="button-tour-next"
            >
              {isLast ? (
                <>
                  <Check className="h-3 w-3" />
                  Done
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-3 w-3" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

interface TourLauncherProps {
  onStart: () => void;
}

export function TourLauncher({ onStart }: TourLauncherProps) {
  return (
    <button
      onClick={onStart}
      className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
      data-testid="button-tour-restart"
    >
      <Sparkles className="h-3 w-3" />
      Take the tour
    </button>
  );
}
