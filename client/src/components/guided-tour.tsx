import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  X, ChevronRight, ChevronLeft, BarChart2, Target,
  Sparkles, Upload, Check, Home, Bell, CalendarDays,
  Search, PanelLeft, LayoutDashboard, Database, Lightbulb,
  Plus, Share2, Save, Download, FileSpreadsheet, Users,
  Settings, MousePointerClick, Gauge, ClipboardList,
} from "lucide-react";

const TOUR_KEY = "ghc_beacon_tour_done_v1";

function tourKey(userId?: string | number | null) {
  return userId ? `${TOUR_KEY}_${userId}` : TOUR_KEY;
}

export function useTourDone(userId?: string | number | null) {
  return typeof window !== "undefined" && !!localStorage.getItem(tourKey(userId));
}

export function markTourDone(userId?: string | number | null) {
  localStorage.setItem(tourKey(userId), "1");
}

export function resetTour(userId?: string | number | null) {
  localStorage.removeItem(tourKey(userId));
}

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  targetId: string;
  targetSelector?: string;
  placement: "top" | "bottom" | "left" | "right";
  navigateTo?: string;
  openTargetId?: string;
  optional?: boolean;
}

const STEPS: TourStep[] = [
  {
    id: "command-center",
    title: "Command Center",
    description: "Start here for the executive overview: overall performance, departments below target, decision alerts, and dashboard activity.",
    icon: Home,
    iconColor: "text-primary",
    targetId: "link-nav-command-center",
    placement: "right",
    navigateTo: "/",
  },
  {
    id: "sidebar-toggle",
    title: "Collapse or Expand the Sidebar",
    description: "Use this control to make more room for dashboards, scorecard tables, or data-entry work.",
    icon: PanelLeft,
    iconColor: "text-slate-500",
    targetId: "button-sidebar-toggle",
    placement: "bottom",
    navigateTo: "/",
  },
  {
    id: "global-search",
    title: "Global Search",
    description: "Search across dashboards, datasets, insights, scorecard departments, and key actions from one place.",
    icon: Search,
    iconColor: "text-cyan-500",
    targetId: "button-global-search",
    placement: "bottom",
    navigateTo: "/",
  },
  {
    id: "period-filter",
    title: "Choose the Reporting Month",
    description: "Use this month filter when your team is reporting one period behind. The Command Center recalculates department scores for the selected month.",
    icon: CalendarDays,
    iconColor: "text-violet-500",
    targetId: "select-command-period",
    placement: "bottom",
    navigateTo: "/",
  },
  {
    id: "open-analytics",
    title: "Open Analytics from the Command Center",
    description: "This shortcut takes executives straight into Analytics Studio when a dashboard or dataset needs deeper review.",
    icon: BarChart2,
    iconColor: "text-blue-500",
    targetId: "button-open-analytics",
    placement: "bottom",
    navigateTo: "/",
  },
  {
    id: "open-scorecard",
    title: "Open the Balanced Scorecard",
    description: "Use this shortcut to move from the executive summary into strategic KPI tracking and monthly updates.",
    icon: Target,
    iconColor: "text-emerald-500",
    targetId: "button-open-scorecard",
    placement: "bottom",
    navigateTo: "/",
  },
  {
    id: "decision-alerts",
    title: "Decision Alerts",
    description: "This panel brings together items that need attention: weak scorecard performance, stale updates, and dashboard activity.",
    icon: Bell,
    iconColor: "text-red-500",
    targetId: "section-decision-alerts",
    placement: "bottom",
    navigateTo: "/",
  },
  {
    id: "scorecard-alert-tab",
    title: "Scorecard Alert Tab",
    description: "Review departments and KPI areas that are currently below target for the selected reporting month.",
    icon: Target,
    iconColor: "text-emerald-500",
    targetId: "tab-alerts-scorecard",
    placement: "bottom",
    navigateTo: "/",
  },
  {
    id: "updates-alert-tab",
    title: "Updates Alert Tab",
    description: "Check whether reporting inputs are fresh enough for leadership review.",
    icon: CalendarDays,
    iconColor: "text-amber-500",
    targetId: "tab-alerts-updates",
    placement: "bottom",
    navigateTo: "/",
  },
  {
    id: "dashboards-alert-tab",
    title: "Dashboards Alert Tab",
    description: "See dashboard-related activity and jump into published analytics from the Command Center.",
    icon: LayoutDashboard,
    iconColor: "text-blue-500",
    targetId: "tab-alerts-dashboards",
    placement: "bottom",
    navigateTo: "/",
  },
  {
    id: "command-dashboards",
    title: "Analytics Dashboards Snapshot",
    description: "This card lists the most recently updated dashboards so leadership can open the latest published views quickly.",
    icon: LayoutDashboard,
    iconColor: "text-blue-500",
    targetId: "section-command-dashboards",
    placement: "left",
    navigateTo: "/",
  },
  {
    id: "leadership-focus",
    title: "Departments Needing Leadership Focus",
    description: "Every department below the 85% threshold appears here, sorted from most urgent to least urgent.",
    icon: Gauge,
    iconColor: "text-violet-500",
    targetId: "section-leadership-focus",
    placement: "top",
    navigateTo: "/",
  },
  {
    id: "focus-count",
    title: "Focus Count Badge",
    description: "This badge tells you how many departments are currently below the leadership threshold.",
    icon: Gauge,
    iconColor: "text-violet-500",
    targetId: "badge-focus-count",
    placement: "bottom",
    navigateTo: "/",
  },
  {
    id: "score-calculation",
    title: "How Scores Are Calculated",
    description: "This explains the Performance Score logic: populated KPIs, weights, capped achievement, and lower-is-better measures.",
    icon: ClipboardList,
    iconColor: "text-primary",
    targetId: "section-score-calculation",
    placement: "left",
    navigateTo: "/",
  },
  {
    id: "view-dashboards",
    title: "Jump to Dashboards",
    description: "Use this button to open the full dashboard library from the executive page.",
    icon: LayoutDashboard,
    iconColor: "text-blue-500",
    targetId: "button-view-dashboards",
    placement: "top",
    navigateTo: "/",
  },
  {
    id: "view-datasets",
    title: "Jump to Datasets",
    description: "Use this button to inspect uploaded source datasets behind the analytics experience.",
    icon: Database,
    iconColor: "text-cyan-500",
    targetId: "button-view-datasets",
    placement: "top",
    navigateTo: "/",
  },
  {
    id: "analytics-studio",
    title: "Analytics Studio",
    description: "Upload any spreadsheet and instantly get AI-generated charts, KPI cards and insights — no manual setup required.",
    icon: BarChart2,
    iconColor: "text-blue-500",
    targetId: "link-nav-analytics-studio",
    placement: "right",
    navigateTo: "/analytics",
  },
  {
    id: "analytics-search",
    title: "Search Inside Analytics Studio",
    description: "Filter dashboards, saved insights, and datasets without leaving Analytics Studio.",
    icon: Search,
    iconColor: "text-cyan-500",
    targetId: "input-search",
    placement: "bottom",
    navigateTo: "/analytics",
  },
  {
    id: "upload-data",
    title: "Upload Your Data",
    description: "Drop a CSV or Excel file to create a dataset. The AI analyses it automatically and suggests the best visualisations.",
    icon: Upload,
    iconColor: "text-violet-500",
    targetId: "button-upload-dataset",
    placement: "bottom",
    navigateTo: "/analytics",
  },
  {
    id: "analytics-freshness",
    title: "Analytics Freshness Panel",
    description: "Use this before reading charts. It shows the latest upload, dashboard refresh, and AI insight dates.",
    icon: CalendarDays,
    iconColor: "text-amber-500",
    targetId: "section-analytics-freshness",
    placement: "bottom",
    navigateTo: "/analytics",
  },
  {
    id: "analytics-home-dashboards",
    title: "Dashboard Preview Section",
    description: "Recent dashboards appear here on the Analytics home page for quick access.",
    icon: LayoutDashboard,
    iconColor: "text-blue-500",
    targetId: "section-analytics-home-dashboards",
    placement: "bottom",
    navigateTo: "/analytics",
  },
  {
    id: "analytics-home-insights",
    title: "Saved Insights Section",
    description: "AI-generated chart answers that were saved for later review appear in this section.",
    icon: Lightbulb,
    iconColor: "text-amber-500",
    targetId: "section-analytics-home-insights",
    placement: "bottom",
    navigateTo: "/analytics",
  },
  {
    id: "analytics-home-datasets",
    title: "Dataset Preview Section",
    description: "Uploaded spreadsheets appear here so users can reopen, configure, or explore them.",
    icon: Database,
    iconColor: "text-cyan-500",
    targetId: "section-analytics-home-datasets",
    placement: "bottom",
    navigateTo: "/analytics",
  },
  {
    id: "analytics-dashboards-nav",
    title: "Dashboards Library",
    description: "This sidebar link opens the full dashboard library where published and draft dashboards are managed.",
    icon: LayoutDashboard,
    iconColor: "text-blue-500",
    targetId: "link-nav-analytics-dashboards",
    placement: "right",
    navigateTo: "/analytics?tab=dashboards",
  },
  {
    id: "new-dashboard",
    title: "Create a Dashboard",
    description: "Create a new dashboard, pin saved insights, and publish it for internal or shared access.",
    icon: Plus,
    iconColor: "text-primary",
    targetId: "button-new-dashboard",
    placement: "bottom",
    navigateTo: "/analytics?tab=dashboards",
  },
  {
    id: "analytics-insights-nav",
    title: "Insights Library",
    description: "This link opens saved AI insights, which are reusable answers and charts generated from uploaded data.",
    icon: Lightbulb,
    iconColor: "text-amber-500",
    targetId: "link-nav-analytics-insights",
    placement: "right",
    navigateTo: "/analytics?tab=insights",
  },
  {
    id: "analytics-datasets-nav",
    title: "Datasets Library",
    description: "This link opens every uploaded dataset so users can manage source files and continue analysis.",
    icon: Database,
    iconColor: "text-cyan-500",
    targetId: "link-nav-analytics-datasets",
    placement: "right",
    navigateTo: "/analytics?tab=datasets",
  },
  {
    id: "datasets-upload-button",
    title: "Upload from the Dataset Library",
    description: "Users can upload another spreadsheet directly from the Datasets tab.",
    icon: Upload,
    iconColor: "text-violet-500",
    targetId: "button-datasets-upload",
    placement: "bottom",
    navigateTo: "/analytics?tab=datasets",
  },
  {
    id: "analytics-upload-nav",
    title: "Upload Data Page",
    description: "This sidebar link opens the upload flow for Excel or CSV files.",
    icon: Upload,
    iconColor: "text-violet-500",
    targetId: "link-nav-analytics-upload",
    placement: "right",
    navigateTo: "/analytics/upload",
  },
  {
    id: "upload-file-control",
    title: "Choose a Spreadsheet File",
    description: "Drop or choose a spreadsheet here. After upload, the app validates the file and prepares it for analytics.",
    icon: FileSpreadsheet,
    iconColor: "text-violet-500",
    targetId: "input-file-upload",
    placement: "bottom",
    navigateTo: "/analytics/upload",
  },
  {
    id: "balanced-scorecard",
    title: "Balanced Scorecard",
    description: "Track strategic KPIs across 4 perspectives — Financial, Customer, Internal, and Learning — with live RAG status and a weighted Performance Score.",
    icon: Target,
    iconColor: "text-emerald-500",
    targetId: "link-nav-balanced-scorecard",
    placement: "right",
    navigateTo: "/scorecard",
  },
  {
    id: "scorecard-overview",
    title: "Scorecard Overview",
    description: "This overview shows every department, monthly performance score, RAG health, and reporting freshness.",
    icon: Target,
    iconColor: "text-emerald-500",
    targetId: "link-nav-scorecard-overview",
    placement: "right",
    navigateTo: "/scorecard",
  },
  {
    id: "scorecard-month-prev",
    title: "Previous Reporting Month",
    description: "Move back one month to review historic KPI entries and department performance.",
    icon: ChevronLeft,
    iconColor: "text-slate-500",
    targetId: "button-prev-month",
    placement: "bottom",
    navigateTo: "/scorecard",
  },
  {
    id: "scorecard-month-next",
    title: "Next Reporting Month",
    description: "Move forward again when reviewing month-by-month scorecard history.",
    icon: ChevronRight,
    iconColor: "text-slate-500",
    targetId: "button-next-month",
    placement: "bottom",
    navigateTo: "/scorecard",
  },
  {
    id: "scorecard-freshness",
    title: "Scorecard Freshness Panel",
    description: "This confirms whether the current reporting period has enough KPI actuals for executive review.",
    icon: CalendarDays,
    iconColor: "text-violet-500",
    targetId: "section-bsc-freshness",
    placement: "bottom",
    navigateTo: "/scorecard",
  },
  {
    id: "add-department",
    title: "Add a Department",
    description: "Create new departments when the organisation expands or needs a separate scorecard owner.",
    icon: Plus,
    iconColor: "text-primary",
    targetId: "button-add-department",
    placement: "bottom",
    navigateTo: "/scorecard",
  },
  {
    id: "department-grid",
    title: "Department Cards",
    description: "Each card shows performance score, trend, perspective dots, RAG status, and data freshness. Cards can also be dragged to reorder.",
    icon: MousePointerClick,
    iconColor: "text-emerald-500",
    targetId: "section-department-grid",
    placement: "top",
    navigateTo: "/scorecard",
  },
  {
    id: "department-card",
    title: "Open a Department Scorecard",
    description: "Click any department card to inspect its dashboard, KPI list, and monthly data-entry table.",
    icon: Target,
    iconColor: "text-emerald-500",
    targetId: "first-department-card",
    targetSelector: "[data-testid^='card-dept-']",
    placement: "bottom",
    navigateTo: "/scorecard",
  },
  {
    id: "department-freshness",
    title: "Department Freshness",
    description: "This small line shows the latest KPI period and how complete the department's current entries are.",
    icon: CalendarDays,
    iconColor: "text-violet-500",
    targetId: "first-department-freshness",
    targetSelector: "[data-testid^='text-dept-freshness-']",
    placement: "bottom",
    navigateTo: "/scorecard",
  },
  {
    id: "add-department-card",
    title: "Add Department Card",
    description: "The dashed card is another quick way to create a new department from the overview grid.",
    icon: Plus,
    iconColor: "text-primary",
    targetId: "card-add-department",
    placement: "bottom",
    navigateTo: "/scorecard",
  },
  {
    id: "department-detail-share",
    title: "Share a Department Scorecard",
    description: "On a department page, use Share to generate or manage a public scorecard link.",
    icon: Share2,
    iconColor: "text-blue-500",
    targetId: "button-share-scorecard",
    placement: "bottom",
    navigateTo: "__first_scorecard_department__",
  },
  {
    id: "department-dashboard-tab",
    title: "Department Dashboard Tab",
    description: "The Dashboard tab explains performance visually with perspective summaries, charts, and KPI status.",
    icon: LayoutDashboard,
    iconColor: "text-blue-500",
    targetId: "tab-dashboard",
    placement: "bottom",
    navigateTo: "__first_scorecard_department__",
  },
  {
    id: "department-detail-freshness",
    title: "Department Detail Freshness",
    description: "These values show the latest available KPI period, completeness, and how many actuals have been entered.",
    icon: CalendarDays,
    iconColor: "text-violet-500",
    targetId: "text-dept-completeness",
    placement: "bottom",
    navigateTo: "__first_scorecard_department__",
  },
  {
    id: "department-entry-tab",
    title: "Data Entry Tab",
    description: "Switch here when a department needs to enter, edit, import, or save KPI actuals for the month.",
    icon: ClipboardList,
    iconColor: "text-amber-500",
    targetId: "tab-entry",
    placement: "bottom",
    navigateTo: "__first_scorecard_department__",
  },
  {
    id: "download-template",
    title: "Download KPI Template",
    description: "Download the department's Excel template, fill actual values, then upload it back into the scorecard.",
    icon: Download,
    iconColor: "text-cyan-500",
    targetId: "button-download-template",
    placement: "top",
    navigateTo: "__first_scorecard_department__",
  },
  {
    id: "upload-excel",
    title: "Upload KPI Excel",
    description: "Upload the completed KPI template to populate the scorecard faster than manual entry.",
    icon: Upload,
    iconColor: "text-violet-500",
    targetId: "button-upload-excel",
    placement: "top",
    navigateTo: "__first_scorecard_department__",
  },
  {
    id: "save-all-kpis",
    title: "Save KPI Entries",
    description: "After editing actual values, use Save All to persist the month's KPI actuals.",
    icon: Save,
    iconColor: "text-emerald-500",
    targetId: "button-save-all",
    placement: "top",
    navigateTo: "__first_scorecard_department__",
  },
  {
    id: "share-toggle",
    title: "Enable Public Scorecard Sharing",
    description: "Inside the share dialog, turn sharing on or off and copy the generated scorecard link.",
    icon: Share2,
    iconColor: "text-blue-500",
    targetId: "toggle-share-scorecard",
    placement: "left",
    navigateTo: "__first_scorecard_department__",
    openTargetId: "button-share-scorecard",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Review red and amber KPI alerts plus the latest data and dashboard updates without leaving your current page.",
    icon: Bell,
    iconColor: "text-red-500",
    targetId: "button-notification-bell",
    placement: "bottom",
    navigateTo: "/analytics",
  },
  {
    id: "notification-popover",
    title: "Notification Details",
    description: "Open the bell to see KPI alerts, latest uploads, dashboard updates, and shortcuts to the right module.",
    icon: Bell,
    iconColor: "text-red-500",
    targetId: "popover-notifications",
    placement: "bottom",
    navigateTo: "/analytics",
    openTargetId: "button-notification-bell",
  },
  {
    id: "notification-analytics-shortcut",
    title: "Notification Shortcut to Analytics",
    description: "This shortcut takes users directly to Analytics Studio when an update or dataset needs review.",
    icon: BarChart2,
    iconColor: "text-blue-500",
    targetId: "notif-goto-analytics",
    placement: "top",
    navigateTo: "/analytics",
  },
  {
    id: "notification-scorecard-shortcut",
    title: "Notification Shortcut to Scorecard",
    description: "This shortcut takes users directly to the Balanced Scorecard for KPI follow-up.",
    icon: Target,
    iconColor: "text-emerald-500",
    targetId: "notif-goto-scorecard",
    placement: "top",
    navigateTo: "/analytics",
  },
  {
    id: "assistant",
    title: "Beacon Assistant",
    description: "Ask questions in plain English — \"Which KPIs are at risk?\" or \"Summarise my dashboard\" — and get instant, data-driven answers.",
    icon: Sparkles,
    iconColor: "text-primary",
    targetId: "button-open-assistant",
    placement: "bottom",
    navigateTo: "/analytics",
  },
  {
    id: "assistant-message",
    title: "Ask the Assistant",
    description: "Type a question about analytics, KPIs, alerts, or next actions. The assistant uses the current app context.",
    icon: Sparkles,
    iconColor: "text-primary",
    targetId: "input-assistant-message",
    placement: "left",
    navigateTo: "/analytics",
    openTargetId: "button-open-assistant",
  },
  {
    id: "assistant-send",
    title: "Send Assistant Questions",
    description: "Send the question when you are ready. The assistant can summarise, compare, and recommend follow-up actions.",
    icon: Sparkles,
    iconColor: "text-primary",
    targetId: "button-assistant-send",
    placement: "left",
    navigateTo: "/analytics",
  },
  {
    id: "assistant-reset",
    title: "Start a New Assistant Conversation",
    description: "Use this when you want to clear the current assistant thread and begin a fresh question.",
    icon: Sparkles,
    iconColor: "text-primary",
    targetId: "button-assistant-reset",
    placement: "left",
    navigateTo: "/analytics",
  },
  {
    id: "assistant-minimise",
    title: "Minimise the Assistant",
    description: "Keep your conversation available while returning more screen space to the current page.",
    icon: Sparkles,
    iconColor: "text-primary",
    targetId: "button-assistant-minimise",
    placement: "left",
    navigateTo: "/analytics",
  },
  {
    id: "admin-users",
    title: "People and Access",
    description: "Admins can manage users, roles, and access to scorecard departments or analytics dashboards here.",
    icon: Users,
    iconColor: "text-indigo-500",
    targetId: "link-nav-users",
    placement: "right",
    navigateTo: "/analytics",
  },
  {
    id: "admin-settings",
    title: "Settings",
    description: "Admins can manage organisation settings and platform configuration from this link.",
    icon: Settings,
    iconColor: "text-slate-500",
    targetId: "link-nav-settings",
    placement: "right",
    navigateTo: "/analytics",
  },
  {
    id: "restart-tour",
    title: "Restart the Tour Anytime",
    description: "Users can relaunch this step-by-step guide from the sidebar whenever they need a refresher.",
    icon: Sparkles,
    iconColor: "text-primary",
    targetId: "button-start-tour",
    placement: "right",
    navigateTo: "/analytics",
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
  userId?: string | number | null;
}

export function GuidedTour({ onClose, userId }: GuidedTourProps) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const skippedMissingRef = useRef<Set<string>>(new Set());
  const [, navigate] = useLocation();
  const [visible, setVisible] = useState(false);

  const current = STEPS[step];

  const getStepNavigation = useCallback((navigateTo?: string) => {
    if (navigateTo === "__first_scorecard_department__") {
      const card = document.querySelector<HTMLElement>("[data-testid^='card-dept-']");
      const testId = card?.getAttribute("data-testid");
      const deptId = testId?.replace("card-dept-", "");
      return deptId ? `/scorecard/department/${deptId}` : "/scorecard";
    }
    return navigateTo;
  }, []);

  const getTarget = useCallback(() => {
    if (current.targetSelector) {
      return document.querySelector<HTMLElement>(current.targetSelector);
    }
    return (
      document.getElementById(current.targetId) ||
      document.querySelector<HTMLElement>(`[data-testid="${current.targetId}"]`)
    );
  }, [current]);

  const clickElement = useCallback((targetId: string) => {
    const el =
      document.getElementById(targetId) ||
      document.querySelector<HTMLElement>(`[data-testid="${targetId}"]`);
    el?.click();
  }, []);

  // Navigate to page if needed, then locate the target element
  const resolveTarget = useCallback(() => {
    const el = getTarget();
    if (!el) {
      setTargetRect(null);
      if (current.optional !== false && !skippedMissingRef.current.has(current.id)) {
        skippedMissingRef.current.add(current.id);
        window.setTimeout(() => {
          setStep(s => {
            if (s >= STEPS.length - 1) {
              markTourDone(userId);
              onClose();
              return s;
            }
            return s + 1;
          });
        }, 250);
      }
      return;
    }
    skippedMissingRef.current.delete(current.id);
    el.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
    const r = el.getBoundingClientRect();
    const rect: Rect = { top: r.top, left: r.left, width: r.width, height: r.height };
    setTargetRect(rect);

    // Position tooltip
    const tw = tooltipRef.current?.offsetWidth ?? 300;
    const th = tooltipRef.current?.offsetHeight ?? 180;
    const pos = getTooltipPosition(rect, current.placement, tw, th, window.innerWidth, window.innerHeight);
    setTooltipPos(pos);
  }, [current, getTarget, onClose, userId]);

  useEffect(() => {
    setVisible(false);
    const destination = getStepNavigation(current.navigateTo);
    if (destination) navigate(destination);
    const timer = setTimeout(() => {
      if (current.openTargetId) {
        clickElement(current.openTargetId);
      }
      window.setTimeout(() => {
        resolveTarget();
        setVisible(true);
      }, current.openTargetId ? 250 : 0);
    }, 550);
    return () => clearTimeout(timer);
  }, [step, current, navigate, resolveTarget, getStepNavigation, clickElement]);

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
    markTourDone(userId);
    onClose();
  };

  const handleSkip = () => {
    markTourDone(userId);
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
