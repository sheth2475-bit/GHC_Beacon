import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  BarChart3, CheckSquare, FolderKanban, LineChart, Workflow,
  LayoutGrid, Presentation, ClipboardList, Sparkles, CheckCircle2,
  TrendingUp, Star, Activity, Users, AlertTriangle, FileSpreadsheet,
  Mail, GitBranch, Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ─── Types ──────────────────────────────────────────────────────────────────

type Beat = { from: number; to: number; text: string };
type Chapter = {
  id: string; title: string; subtitle: string; duration: number;
  icon: React.ComponentType<any>; color: string; beats: Beat[];
};

// ─── Chapters ────────────────────────────────────────────────────────────────

const CHAPTERS: Chapter[] = [
  {
    id: "problem",
    title: "The Challenge",
    subtitle: "Why performance management is broken",
    duration: 52,
    icon: AlertTriangle,
    color: "#ef4444",
    beats: [
      { from: 0,    to: 0.28, text: "Most organisations manage performance the hard way — KPIs in spreadsheets, actions tracked in emails, and strategy completely disconnected from day-to-day execution." },
      { from: 0.28, to: 0.56, text: "Leadership teams spend hours pulling data before every board meeting. By the time the report is ready, it's already outdated — and decisions get made on stale information." },
      { from: 0.56, to: 0.78, text: "Risks surface too late. Accountability slips through the cracks. And nobody has a clear, live view of whether the business is actually on track." },
      { from: 0.78, to: 1,    text: "There had to be a better way. That's exactly why we built Performo AI." },
    ],
  },
  {
    id: "intro",
    title: "Welcome to Performo AI",
    subtitle: "Complete Performance Platform",
    duration: 36,
    icon: Sparkles,
    color: "#3b82f6",
    beats: [
      { from: 0,    to: 0.45, text: "Performo AI is the complete performance management platform that connects strategy to daily execution — everything your leadership team needs, in one intelligent system." },
      { from: 0.45, to: 1,    text: "From live KPI dashboards to AI-generated board presentations, every module is designed to give your organisation clarity, speed, and accountability — at every level." },
    ],
  },
  {
    id: "kpi",
    title: "KPI Dashboard",
    subtitle: "Live metric visibility for every team",
    duration: 46,
    icon: BarChart3,
    color: "#10b981",
    beats: [
      { from: 0,    to: 0.30, text: "Your KPI Dashboard puts every critical metric in one place — live, colour-coded, and instantly actionable." },
      { from: 0.30, to: 0.62, text: "Traffic lights tell the whole story at a glance — green for on track, amber for at risk, red for action needed. No more guessing where you stand." },
      { from: 0.62, to: 1,    text: "Drill into any KPI for trend history, monthly actuals versus target, and the owner responsible for delivery — so accountability is always clear." },
    ],
  },
  {
    id: "actions",
    title: "Actions & Accountability",
    subtitle: "From insight to execution",
    duration: 44,
    icon: CheckSquare,
    color: "#f59e0b",
    beats: [
      { from: 0,    to: 0.34, text: "Every insight in Performo AI can be turned into an accountable action with a single click — no more decisions that disappear after the meeting." },
      { from: 0.34, to: 0.67, text: "Assign owners, set due dates, and track progress in real time — from Not Started to In Progress to Completed, all in one view." },
      { from: 0.67, to: 1,    text: "Overdue items surface automatically and escalate to leadership — so every commitment is visible and nothing slips through the cracks." },
    ],
  },
  {
    id: "portfolio",
    title: "Portfolio & Projects",
    subtitle: "Strategic initiatives at a glance",
    duration: 44,
    icon: FolderKanban,
    color: "#8b5cf6",
    beats: [
      { from: 0,    to: 0.33, text: "The Portfolio module gives leadership a real-time view of every strategic initiative — so you always know where your most important projects stand." },
      { from: 0.33, to: 0.66, text: "See project health, milestone completion, and task progress at a glance — with risk status visible the moment something goes off track." },
      { from: 0.66, to: 1,    text: "Drill into any project for full detail — tasks, subtasks, team workload, blockers, and dependencies — all connected and always up to date." },
    ],
  },
  {
    id: "analytics",
    title: "Analytics Studio",
    subtitle: "Upload data, unlock insights instantly",
    duration: 54,
    icon: LineChart,
    color: "#06b6d4",
    beats: [
      { from: 0,    to: 0.24, text: "Upload any Excel file and Performo AI builds rich, interactive charts and datasets in seconds — no data team required." },
      { from: 0.24, to: 0.48, text: "Build custom dashboards with drag-and-drop widgets — bar charts, line trends, pie breakdowns, and KPI summary cards, all in one view." },
      { from: 0.48, to: 0.72, text: "Create formula columns, apply intelligent filters, and let the AI generate written narrative insights from your data — automatically." },
      { from: 0.72, to: 1,    text: "Ask the AI assistant any business question in plain English — and get an instant, data-backed answer without touching a pivot table." },
    ],
  },
  {
    id: "workflow",
    title: "Workflow Center",
    subtitle: "Operational discipline across every team",
    duration: 44,
    icon: Workflow,
    color: "#f43f5e",
    beats: [
      { from: 0,    to: 0.33, text: "The Workflow Center brings operational structure to every department — from IT helpdesk to Finance reporting to Legal and Compliance." },
      { from: 0.33, to: 0.65, text: "Manage service desk tickets, recurring tasks, license renewals, and safety certificate tracking — all grouped into smart, manageable workflows." },
      { from: 0.65, to: 1,    text: "Due dates, live status tracking, and automatic overdue alerts ensure that nothing is missed, forgotten, or left without an owner." },
    ],
  },
  {
    id: "scorecard",
    title: "Balanced Scorecard",
    subtitle: "One strategic view across four perspectives",
    duration: 38,
    icon: LayoutGrid,
    color: "#0ea5e9",
    beats: [
      { from: 0,    to: 0.44, text: "The Balanced Scorecard maps every KPI across four strategic perspectives — giving leadership a single, unified view of organisational health." },
      { from: 0.44, to: 1,    text: "Financial, Customer, Internal Processes, and Learning & Growth — your entire strategy distilled onto one screen, updated in real time." },
    ],
  },
  {
    id: "presentations",
    title: "Presentation Studio",
    subtitle: "Board-ready slides in seconds",
    duration: 44,
    icon: Presentation,
    color: "#d946ef",
    beats: [
      { from: 0,    to: 0.34, text: "Presentation Studio generates board-ready slides directly from your live Performo AI data — in seconds, not hours." },
      { from: 0.34, to: 0.66, text: "Simply describe what you need. The AI builds polished, professional slides complete with your KPIs, charts, and strategic commentary — ready to present." },
      { from: 0.66, to: 1,    text: "No manual copy-paste. No stale data. No design effort. Just click, review, and walk into the boardroom with confidence." },
    ],
  },
  {
    id: "reviews",
    title: "Monthly Reviews",
    subtitle: "Structured, AI-powered performance conversations",
    duration: 44,
    icon: ClipboardList,
    color: "#84cc16",
    beats: [
      { from: 0,    to: 0.33, text: "Monthly Reviews bring structure and real accountability to your leadership performance conversations — every single month." },
      { from: 0.33, to: 0.66, text: "The AI generates a complete narrative from your live data — wins, risks, team commitments, and follow-up actions — ready before the meeting starts." },
      { from: 0.66, to: 1,    text: "Every review becomes a permanent performance record. Month by month, your organisation builds a clear, auditable history of decisions and outcomes." },
    ],
  },
];

const TOTAL_DURATION = CHAPTERS.reduce((s, c) => s + c.duration, 0);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCaption(chapter: Chapter, progress: number): string {
  const beat = chapter.beats.find(b => progress >= b.from && progress < b.to)
    || chapter.beats[chapter.beats.length - 1];
  return beat?.text ?? "";
}

function getNarration(chapter: Chapter): string {
  return chapter.beats.map(b => b.text).join("  ");
}

// ─── Visual Components ───────────────────────────────────────────────────────

function ProblemVisual({ progress }: { progress: number }) {
  const pains = [
    { icon: FileSpreadsheet, label: "KPIs in spreadsheets", desc: "No live view · Always outdated · Manually updated", color: "#ef4444" },
    { icon: Mail, label: "Actions in emails", desc: "No ownership · No due dates · Nothing tracked", color: "#f59e0b" },
    { icon: GitBranch, label: "Strategy vs execution gap", desc: "Initiatives disconnected from daily operations", color: "#8b5cf6" },
    { icon: Clock, label: "Hours on board reports", desc: "Manual data gathering · Stale by the time it's done", color: "#06b6d4" },
  ];
  return (
    <div className="w-full h-full p-5 flex flex-col gap-4">
      <div className="text-center" style={{ opacity: progress > 0.04 ? 1 : 0, transition: "opacity 0.8s" }}>
        <div className="text-white font-semibold text-sm mb-1">The Performance Management Problem</div>
        <div className="text-white/40 text-xs">Why traditional approaches fail leadership teams</div>
      </div>
      <div className="grid grid-cols-2 gap-3 flex-1">
        {pains.map((p, i) => {
          const show = progress > 0.10 + i * 0.18;
          return (
            <div key={p.label} className="rounded-xl p-3.5 flex flex-col gap-2 transition-all duration-800"
              style={{ background: `${p.color}08`, border: `1.5px solid ${p.color}25`,
                opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(18px)" }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${p.color}18`, border: `1px solid ${p.color}30` }}>
                  <p.icon className="w-3.5 h-3.5" style={{ color: p.color }} />
                </div>
                <div className="text-white text-[11px] font-semibold leading-tight">{p.label}</div>
              </div>
              <div className="text-white/40 text-[10px] leading-relaxed">{p.desc}</div>
            </div>
          );
        })}
      </div>
      <div className="rounded-xl p-3 text-center transition-all duration-800"
        style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
          opacity: progress > 0.74 ? 1 : 0, transform: progress > 0.74 ? "scale(1)" : "scale(0.95)",
          transition: "opacity 0.8s, transform 0.8s" }}>
        <div className="text-blue-300 text-[11px] font-semibold">✦ Performo AI solves all of this — in one connected platform.</div>
      </div>
    </div>
  );
}

function IntroVisual({ progress }: { progress: number }) {
  const modules = [
    { Icon: BarChart3, label: "KPI Dashboard", color: "#10b981" },
    { Icon: CheckSquare, label: "Actions", color: "#f59e0b" },
    { Icon: FolderKanban, label: "Portfolio", color: "#8b5cf6" },
    { Icon: LineChart, label: "Analytics Studio", color: "#06b6d4" },
    { Icon: Workflow, label: "Workflow Center", color: "#f43f5e" },
    { Icon: LayoutGrid, label: "Scorecard", color: "#0ea5e9" },
    { Icon: Presentation, label: "Presentations", color: "#d946ef" },
    { Icon: ClipboardList, label: "Monthly Reviews", color: "#84cc16" },
  ];
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-5 px-4">
      <div className="text-center transition-all duration-800"
        style={{ opacity: progress > 0.06 ? 1 : 0, transform: progress > 0.06 ? "scale(1)" : "scale(0.85)" }}>
        <div className="flex items-center gap-3 mb-2 justify-center">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-3xl font-bold text-white tracking-tight">Performo <span className="text-blue-400">AI</span></span>
        </div>
        <p className="text-white/45 text-sm">Complete Performance Management · Powered by AI</p>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {modules.map(({ Icon, label, color }, i) => {
          const show = progress > 0.20 + i * 0.09;
          return (
            <div key={label} className="flex flex-col items-center gap-1.5 transition-all duration-600"
              style={{ opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(14px)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${color}18`, border: `1.5px solid ${color}35` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <span className="text-[9px] text-white/45 text-center leading-tight">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KpiVisual({ progress }: { progress: number }) {
  const kpis = [
    { name: "Occupancy Rate", value: "82%", target: "85%", status: "amber", pct: 82 },
    { name: "RevPAR", value: "AED 561", target: "AED 578", status: "amber", pct: 75 },
    { name: "Guest Score", value: "4.6 / 5", target: "4.5", status: "green", pct: 92 },
    { name: "GOP Margin", value: "36%", target: "35%", status: "green", pct: 90 },
    { name: "Staff Turnover", value: "24%", target: "20%", status: "red", pct: 48 },
    { name: "ADR", value: "AED 685", target: "AED 680", status: "green", pct: 88 },
  ];
  const sc: Record<string, string> = { green: "#10b981", amber: "#f59e0b", red: "#ef4444" };
  return (
    <div className="w-full h-full p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-white font-semibold text-sm">KPI Performance — April 2026</span>
        <div className="flex gap-2 text-[10px]">
          {[["🟢","3 On Track"],["🟡","2 At Risk"],["🔴","1 Off Track"]].map(([e,l]) =>
            <span key={l} className="text-white/50">{e} {l}</span>)}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 flex-1">
        {kpis.map((k, i) => {
          const show = progress > i * 0.13;
          return (
            <div key={k.name} className="rounded-xl p-3 flex flex-col gap-2 transition-all duration-700"
              style={{ background: "rgba(255,255,255,0.06)", border: `1.5px solid ${sc[k.status]}35`,
                opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(16px)" }}>
              <div className="flex items-center justify-between">
                <span className="text-white/55 text-[10px] leading-tight">{k.name}</span>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: sc[k.status] }} />
              </div>
              <div className="text-white font-bold text-sm">{k.value}</div>
              <div className="text-white/35 text-[10px]">Target {k.target}</div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1200"
                  style={{ width: show ? `${k.pct}%` : "0%", background: sc[k.status] }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionsVisual({ progress }: { progress: number }) {
  const items = [
    { title: "Finalise Q2 Revenue Strategy", owner: "Dharmesh Sheth", due: "Apr 20", status: "In Progress" },
    { title: "Fire Safety Audit — All Floors", owner: "Noura Bin Rashid", due: "Apr 15", status: "Overdue" },
    { title: "Launch Guest Loyalty Programme", owner: "Ravi Mehta", due: "May 1", status: "Not Started" },
    { title: "Update Staff Training Matrix", owner: "Noura Bin Rashid", due: "Apr 30", status: "In Progress" },
    { title: "Review F&B Supplier Contracts", owner: "Dharmesh Sheth", due: "Apr 25", status: "Completed" },
    { title: "Q1 Performance Board Report", owner: "Ravi Mehta", due: "Apr 18", status: "In Progress" },
  ];
  const sc: Record<string, string> = { "In Progress":"#3b82f6","Overdue":"#ef4444","Not Started":"#6b7280","Completed":"#10b981" };
  return (
    <div className="w-full h-full p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-white font-semibold text-sm">Action Items</span>
        <div className="flex gap-2 text-[10px]">
          {[["#3b82f6","3 In Progress"],["#ef4444","1 Overdue"],["#10b981","1 Done"]].map(([c,l]) =>
            <span key={l} style={{ color: c as string }}>{l}</span>)}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((a, i) => {
          const show = progress > i * 0.14;
          return (
            <div key={a.title} className="rounded-lg px-3 py-2 flex items-center gap-3 transition-all duration-700"
              style={{ background: "rgba(255,255,255,0.055)", opacity: show ? 1 : 0, transform: show ? "translateX(0)" : "translateX(-18px)" }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sc[a.status] }} />
              <div className="flex-1 min-w-0">
                <div className="text-white text-[11px] font-medium truncate">{a.title}</div>
                <div className="text-white/40 text-[10px]">{a.owner} · Due {a.due}</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: `${sc[a.status]}18`, color: sc[a.status] }}>{a.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PortfolioVisual({ progress }: { progress: number }) {
  const projects = [
    { name: "Hotel Brand Refresh 2026", status: "On Track", pct: 67, tasks: "8/12", milestones: "3/4", color: "#10b981" },
    { name: "PMS Migration to Cloud", status: "At Risk", pct: 50, tasks: "9/18", milestones: "2/5", color: "#f59e0b" },
    { name: "Staff L&D Programme Q2", status: "On Track", pct: 70, tasks: "7/10", milestones: "2/3", color: "#10b981" },
  ];
  return (
    <div className="w-full h-full p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-white font-semibold text-sm">Strategic Portfolio</span>
        <Badge className="bg-white/10 text-white/70 border-white/10 text-[10px]">3 Active Projects</Badge>
      </div>
      <div className="flex flex-col gap-2.5 flex-1">
        {projects.map((p, i) => {
          const show = progress > i * 0.25;
          return (
            <div key={p.name} className="rounded-xl p-3.5 transition-all duration-700"
              style={{ background: "rgba(255,255,255,0.065)", border: `1.5px solid ${p.color}28`,
                opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(18px)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-[11px] font-semibold">{p.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: `${p.color}18`, color: p.color }}>{p.status}</span>
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1500"
                    style={{ width: show ? `${p.pct}%` : "0%", background: p.color }} />
                </div>
                <span className="text-white font-medium text-[11px] w-8 text-right">{p.pct}%</span>
              </div>
              <div className="flex gap-4 text-[10px] text-white/40">
                <span>Tasks {p.tasks}</span><span>Milestones {p.milestones}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsVisual({ progress }: { progress: number }) {
  const bars = [58, 72, 61, 84, 70, 88, 65, 79, 74, 90, 68, 95];
  const months = ["J","F","M","A","M","J","J","A","S","O","N","D"];
  const widgets = ["Revenue Trend","Occupancy Rate","Guest Score Avg","GOP Analysis"];
  return (
    <div className="w-full h-full p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-white font-semibold text-sm">Analytics Studio — Revenue 2025</span>
        <div className="flex gap-1.5">
          {["📊 Dashboard","✨ AI Insights","📁 Datasets"].map(l =>
            <span key={l} className="text-[9px] px-2 py-0.5 rounded-md bg-white/8 text-white/50 border border-white/10">{l}</span>)}
        </div>
      </div>
      <div className="flex gap-2 flex-1">
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-end gap-1 flex-1 px-1">
            {bars.map((h, i) => {
              const show = progress > i * 0.07;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full rounded-t transition-all duration-800 relative"
                    style={{ height: show ? `${h}%` : "0%",
                      background: i === 11 ? "linear-gradient(to top,#06b6d4,#3b82f6)" : "rgba(6,182,212,0.35)",
                      border: "1px solid rgba(6,182,212,0.25)" }}>
                    {i === 11 && show && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] text-cyan-300 font-bold whitespace-nowrap">Peak</div>
                    )}
                  </div>
                  <span className="text-[7px] text-white/25">{months[i]}</span>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {[["Total Revenue","AED 4.2M","#10b981"],["Best Month","Dec · AED 412K","#06b6d4"],["YoY Growth","+12%","#3b82f6"]].map(([l,v,c]) =>
              <div key={l} className="rounded-lg p-1.5 text-center"
                style={{ background: "rgba(255,255,255,0.05)", opacity: progress > 0.45 ? 1 : 0, transition: "opacity 0.8s" }}>
                <div className="text-[8px] text-white/40 mb-0.5">{l}</div>
                <div className="text-[10px] font-bold" style={{ color: c as string }}>{v}</div>
              </div>)}
          </div>
        </div>
        <div className="w-28 flex flex-col gap-1.5">
          <div className="text-[9px] text-white/40 mb-0.5">Dashboard Widgets</div>
          {widgets.map((w, i) => {
            const show = progress > 0.32 + i * 0.14;
            return (
              <div key={w} className="rounded-lg p-2 text-[9px] text-white/60 border border-white/8 transition-all duration-600"
                style={{ background: "rgba(255,255,255,0.05)", opacity: show ? 1 : 0, transform: show ? "translateX(0)" : "translateX(10px)" }}>
                {w}
              </div>
            );
          })}
          <div className="mt-auto rounded-lg p-2 border border-cyan-500/25 bg-cyan-500/8 text-[9px] text-cyan-400"
            style={{ opacity: progress > 0.78 ? 1 : 0, transition: "opacity 0.8s" }}>
            ✨ "Revenue peaks Q4 — driven by occupancy uplift from Oct"
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowVisual({ progress }: { progress: number }) {
  const groups = [
    { name: "IT Helpdesk", type: "Service Desk", total: 5, open: 3, overdue: 1, color: "#f43f5e" },
    { name: "Finance & Reporting", type: "Recurring Tasks", total: 4, open: 2, overdue: 0, color: "#f59e0b" },
    { name: "Legal & Compliance Licenses", type: "Licenses", total: 4, open: 2, overdue: 1, color: "#8b5cf6" },
    { name: "Safety Certificates", type: "Certificates", total: 5, open: 3, overdue: 0, color: "#06b6d4" },
  ];
  const tickets = [
    { ref: "ST-042", title: "PMS login issue — Front Desk", status: "Open" },
    { ref: "RT-018", title: "Monthly P&L Report submission", status: "Due Soon" },
    { ref: "LIC-007", title: "Trade License renewal", status: "Overdue" },
  ];
  return (
    <div className="w-full h-full p-4 flex flex-col gap-2.5">
      <span className="text-white font-semibold text-sm mb-0.5">Workflow Center — 4 Modules</span>
      <div className="grid grid-cols-2 gap-2">
        {groups.map((g, i) => {
          const show = progress > i * 0.18;
          return (
            <div key={g.name} className="rounded-xl p-2.5 transition-all duration-700"
              style={{ background: "rgba(255,255,255,0.055)", border: `1.5px solid ${g.color}28`,
                opacity: show ? 1 : 0, transform: show ? "scale(1)" : "scale(0.9)" }}>
              <div className="text-[9px] font-medium mb-0.5" style={{ color: g.color }}>{g.type}</div>
              <div className="text-white text-[11px] font-semibold leading-snug mb-1.5">{g.name}</div>
              <div className="flex gap-3 text-[10px]">
                <span className="text-white/60">{g.total} Total</span>
                <span className="text-blue-400">{g.open} Open</span>
                {g.overdue > 0 && <span className="text-red-400">{g.overdue} Overdue</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-1 mt-1">
        {tickets.map((t, i) => {
          const show = progress > 0.60 + i * 0.13;
          return (
            <div key={t.ref} className="rounded-lg px-2.5 py-1.5 flex items-center gap-2 transition-all duration-600"
              style={{ background: "rgba(255,255,255,0.04)", opacity: show ? 1 : 0, transform: show ? "translateX(0)" : "translateX(-14px)" }}>
              <span className="text-[9px] text-white/30 w-12">{t.ref}</span>
              <span className="text-[10px] text-white/70 flex-1 truncate">{t.title}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: t.status === "Overdue" ? "#ef444418" : t.status === "Due Soon" ? "#f59e0b18" : "#3b82f618",
                  color: t.status === "Overdue" ? "#ef4444" : t.status === "Due Soon" ? "#f59e0b" : "#3b82f6" }}>{t.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScorecardVisual({ progress }: { progress: number }) {
  const persp = [
    { label: "Financial", Icon: TrendingUp, kpis: ["RevPAR","GOP Margin","ADR"], score: 78, color: "#10b981" },
    { label: "Customer", Icon: Star, kpis: ["Guest Score","Repeat Rate","NPS"], score: 85, color: "#3b82f6" },
    { label: "Internal Processes", Icon: Activity, kpis: ["Occupancy","Room Turnaround","SLA"], score: 62, color: "#f59e0b" },
    { label: "Learning & Growth", Icon: Users, kpis: ["Staff Turnover","Training Hrs","Engagement"], score: 54, color: "#ef4444" },
  ];
  return (
    <div className="w-full h-full p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-white font-semibold text-sm">Balanced Scorecard — Q1 2026</span>
        <Badge className="bg-white/10 text-white/60 border-white/10 text-[10px]">10 KPIs mapped</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {persp.map((p, i) => {
          const show = progress > i * 0.20;
          return (
            <div key={p.label} className="rounded-xl p-3 flex flex-col gap-2 transition-all duration-700"
              style={{ background: `${p.color}0e`, border: `1.5px solid ${p.color}28`,
                opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(14px)" }}>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${p.color}20` }}>
                  <p.Icon className="w-3 h-3" style={{ color: p.color }} />
                </div>
                <span className="text-white text-[11px] font-semibold">{p.label}</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold leading-none" style={{ color: p.color }}>{p.score}</span>
                <span className="text-white/35 text-xs mb-0.5">/100</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1400"
                  style={{ width: show ? `${p.score}%` : "0%", background: p.color }} />
              </div>
              <div className="text-[9px] text-white/35">{p.kpis.join(" · ")}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PresentationVisual({ progress }: { progress: number }) {
  const prompt = "Q2 2026 board presentation — KPI performance, project status, and strategic priorities";
  const slides = [
    { n: "01", title: "Q2 2026 Performance Review", sub: "OYO Hospitality — Confidential" },
    { n: "02", title: "KPI Dashboard Overview", sub: "6 of 10 KPIs on track · 2 at risk" },
    { n: "03", title: "Revenue & Financial Analysis", sub: "AED 4.2M total · +12% YoY" },
    { n: "04", title: "Strategic Portfolio Status", sub: "3 projects · 67% avg completion" },
    { n: "05", title: "Key Risks & Mitigations", sub: "Staff turnover · Safety audit" },
    { n: "06", title: "Q3 Priorities & Commitments", sub: "5 initiatives · ownership assigned" },
  ];
  const promptChars = Math.floor(prompt.length * Math.min(progress * 3.5, 1));
  return (
    <div className="w-full h-full p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-white font-semibold text-sm">Presentation Studio</span>
        <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/25 text-[10px]">✨ AI Generated</Badge>
      </div>
      <div className="rounded-lg p-2.5 border border-purple-500/20 bg-purple-500/5 text-[10px] text-purple-300"
        style={{ opacity: progress > 0 ? 1 : 0 }}>
        <span className="text-purple-500/60 mr-1">Prompt:</span>
        {prompt.slice(0, promptChars)}
        {promptChars < prompt.length && <span className="inline-block w-0.5 h-3 bg-purple-400 ml-0.5 animate-pulse align-middle" />}
      </div>
      <div className="grid grid-cols-3 gap-1.5 flex-1">
        {slides.map((s, i) => {
          const show = progress > 0.30 + i * 0.12;
          return (
            <div key={s.n} className="rounded-lg p-2 flex flex-col items-center justify-center text-center gap-1 transition-all duration-700"
              style={{ background: i === 0 ? "linear-gradient(135deg,#3b82f618,#8b5cf618)" : "rgba(255,255,255,0.055)",
                border: "1px solid rgba(255,255,255,0.08)", opacity: show ? 1 : 0, transform: show ? "scale(1)" : "scale(0.88)" }}>
              <div className="text-[8px] text-white/30">Slide {s.n}</div>
              <div className="text-[9px] text-white font-semibold leading-snug">{s.title}</div>
              <div className="text-[8px] text-white/40 leading-tight">{s.sub}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewsVisual({ progress }: { progress: number }) {
  const narrative = "March delivered strong results with occupancy at 82% and guest satisfaction holding above target at 4.6. RevPAR improved 6% month-on-month. Staff turnover at 24% remains the primary risk for Q2 — targeted retention actions are in progress.";
  const narChars = Math.floor(narrative.length * Math.min(progress * 3, 1));
  return (
    <div className="w-full h-full p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-white font-semibold text-sm">March 2026 — Monthly Review</span>
        <Badge className="bg-lime-500/20 text-lime-300 border border-lime-500/25 text-[10px]">Review Complete</Badge>
      </div>
      <div className="rounded-xl p-3 bg-white/[0.05] border border-white/8"
        style={{ opacity: progress > 0.05 ? 1 : 0, transition: "opacity 0.8s" }}>
        <div className="text-[9px] text-white/35 mb-1.5">✨ AI-Generated Narrative</div>
        <p className="text-white/80 text-[11px] leading-relaxed">
          {narrative.slice(0, narChars)}
          {narChars < narrative.length && <span className="inline-block w-0.5 h-3 bg-white/60 ml-0.5 animate-pulse align-middle" />}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {[
          { label: "🏆 Key Wins", items: ["RevPAR +6% MoM","Guest score 4.6 ✓","ADR above target"], color: "#10b981" },
          { label: "⚠️ Key Risks", items: ["Turnover at 24%","Fire audit overdue","2 stalled actions"], color: "#ef4444" },
          { label: "📋 Team Commitments", items: ["L&D programme launch","Safety audit by Apr 15"], color: "#3b82f6" },
          { label: "🎯 Q2 Focus Areas", items: ["Reach 85% occupancy","Reduce turnover to 22%"], color: "#f59e0b" },
        ].map((s, i) => {
          const show = progress > 0.38 + i * 0.15;
          return (
            <div key={s.label} className="rounded-xl p-2.5 transition-all duration-700"
              style={{ background: `${s.color}0d`, border: `1px solid ${s.color}22`,
                opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(10px)" }}>
              <div className="text-[9px] font-semibold mb-1" style={{ color: s.color }}>{s.label}</div>
              {s.items.map(it => <div key={it} className="text-[9px] text-white/55 leading-tight">· {it}</div>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const VISUALS: Record<string, (p: { progress: number }) => JSX.Element> = {
  problem: ProblemVisual, intro: IntroVisual, kpi: KpiVisual, actions: ActionsVisual,
  portfolio: PortfolioVisual, analytics: AnalyticsVisual, workflow: WorkflowVisual,
  scorecard: ScorecardVisual, presentations: PresentationVisual, reviews: ReviewsVisual,
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DemoPage() {
  const [, navigate] = useLocation();
  const [chIdx, setChIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [caption, setCaption] = useState("");
  const [voicesReady, setVoicesReady] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chIdxRef = useRef(0);
  const mutedRef = useRef(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const activeUttRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => { chIdxRef.current = chIdx; }, [chIdx]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // ── Load voices (Chrome loads them async) ─────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) { voicesRef.current = v; setVoicesReady(true); }
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  const chapter = CHAPTERS[chIdx];
  const chProgress = Math.min(elapsed / chapter.duration, 1);
  const totalPct = Math.min(totalElapsed / TOTAL_DURATION, 1);

  // ── Speech ────────────────────────────────────────────────────────────────

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    activeUttRef.current = null;
  }, []);

  const speakChapter = useCallback((idx: number, onDone: () => void) => {
    stopSpeech();
    if (mutedRef.current || typeof window === "undefined" || !window.speechSynthesis) {
      onDone();
      return;
    }
    const utt = new SpeechSynthesisUtterance(getNarration(CHAPTERS[idx]));
    utt.rate = 0.88;
    utt.pitch = 1.0;
    utt.volume = 1.0;
    const voices = voicesRef.current;
    const preferred = voices.find(v =>
      v.name.includes("Google UK English Female") ||
      v.name.includes("Samantha") ||
      v.name.includes("Karen") ||
      v.name.includes("Victoria") ||
      (v.lang === "en-GB" && v.name.includes("Female"))
    ) || voices.find(v => v.lang === "en-GB")
      || voices.find(v => v.lang.startsWith("en-US"))
      || voices.find(v => v.lang.startsWith("en"));
    if (preferred) utt.voice = preferred;
    utt.onend = () => { activeUttRef.current = null; onDone(); };
    utt.onerror = () => { activeUttRef.current = null; onDone(); };
    activeUttRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, [stopSpeech]);

  // ── Chapter navigation ────────────────────────────────────────────────────

  const advanceChapter = useCallback(() => {
    const nextIdx = chIdxRef.current + 1;
    if (nextIdx < CHAPTERS.length) {
      setChIdx(nextIdx);
      setElapsed(0);
      setTotalElapsed(CHAPTERS.slice(0, nextIdx).reduce((s, c) => s + c.duration, 0));
    } else {
      setPlaying(false);
    }
  }, []);

  // When chIdx changes while playing, start the next chapter's narration
  const playingRef = useRef(false);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  useEffect(() => {
    if (!playing) return;
    speakChapter(chIdx, advanceChapter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chIdx, playing]);

  const goChapter = useCallback((idx: number, autoSpeak = false) => {
    stopSpeech();
    setChIdx(idx);
    setElapsed(0);
    setTotalElapsed(CHAPTERS.slice(0, idx).reduce((s, c) => s + c.duration, 0));
    if (autoSpeak) {
      // speakChapter will be called by the useEffect above when chIdx changes
    }
  }, [stopSpeech]);

  // ── Visual animation timer ────────────────────────────────────────────────
  // Advances elapsed for animation progress. In muted mode also drives chapter skip.

  useEffect(() => {
    if (!playing) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 0.1;
        // In muted mode, skip chapter when timer runs out
        if (mutedRef.current && next >= CHAPTERS[chIdxRef.current].duration) {
          setTimeout(advanceChapter, 0);
          return CHAPTERS[chIdxRef.current].duration;
        }
        return next;
      });
      setTotalElapsed(prev => Math.min(prev + 0.1, TOTAL_DURATION));
    }, 100);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, advanceChapter]);

  useEffect(() => { setCaption(getCaption(chapter, chProgress)); }, [chapter, chProgress]);

  const togglePlay = () => {
    if (!playing) {
      setPlaying(true);
      // speakChapter triggered by the useEffect on [chIdx, playing]
    } else {
      setPlaying(false);
      stopSpeech();
    }
  };

  const toggleMute = () => {
    const nowMuted = !muted;
    setMuted(nowMuted);
    if (nowMuted) {
      stopSpeech();
    } else if (playing) {
      speakChapter(chIdx, advanceChapter);
    }
  };

  useEffect(() => () => {
    stopSpeech();
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [stopSpeech]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const Visual = VISUALS[chapter.id];
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 bg-[#080c14] flex flex-col select-none overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/60 border-b border-white/8 z-20 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/35 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-white font-semibold text-sm">Performo AI</span>
          <span className="text-white/25 text-xs ml-1">· Product Demo</span>
        </div>
        <button onClick={() => { stopSpeech(); navigate("/"); }}
          className="text-white/35 hover:text-white/75 text-xs transition-colors px-3 py-1.5 rounded-lg hover:bg-white/8">
          Sign In →
        </button>
      </div>

      {/* Layout */}
      <div className="flex flex-1 min-h-0">

        {/* Sidebar */}
        <div className="hidden lg:flex flex-col w-52 bg-black/50 border-r border-white/8 overflow-y-auto py-2 flex-shrink-0">
          {CHAPTERS.map((ch, i) => {
            const isActive = i === chIdx, isPast = i < chIdx;
            return (
              <button key={ch.id} onClick={() => { goChapter(i, playing); }}
                className="flex items-center gap-2.5 px-3 py-2.5 text-left transition-all"
                style={{ background: isActive ? `${ch.color}12` : "transparent", borderLeft: `3px solid ${isActive ? ch.color : "transparent"}` }}>
                <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: isActive ? `${ch.color}22` : "rgba(255,255,255,0.04)", border: `1px solid ${isActive ? ch.color + "40" : "transparent"}` }}>
                  <ch.icon className="w-3 h-3" style={{ color: isActive ? ch.color : "rgba(255,255,255,0.25)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium truncate" style={{ color: isActive ? "white" : "rgba(255,255,255,0.38)" }}>{ch.title}</div>
                  <div className="text-[10px]" style={{ color: isActive ? ch.color : "rgba(255,255,255,0.2)" }}>{fmtTime(ch.duration)}</div>
                </div>
                {isPast && <CheckCircle2 className="w-3 h-3 text-white/18 flex-shrink-0" />}
                {isActive && playing && <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: ch.color }} />}
              </button>
            );
          })}
        </div>

        {/* Screen */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative overflow-hidden"
            style={{ background: `radial-gradient(ellipse at 25% 25%, ${chapter.color}07 0%, transparent 55%), #080c14` }}>

            {/* Chapter header */}
            <div className="absolute top-0 left-0 right-0 px-5 pt-3.5 z-10"
              style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.45),transparent)" }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: `${chapter.color}22`, border: `1px solid ${chapter.color}35` }}>
                  <chapter.icon className="w-3.5 h-3.5" style={{ color: chapter.color }} />
                </div>
                <span className="text-white/80 text-[13px] font-semibold">{chapter.title}</span>
                <span className="text-white/30 text-[11px]">· {chapter.subtitle}</span>
                <span className="text-white/25 text-[11px] ml-auto">{chIdx + 1}/{CHAPTERS.length}</span>
              </div>
            </div>

            {/* Visual */}
            <div className="absolute inset-0 flex items-center justify-center px-5 pt-12 pb-24">
              <div className="w-full max-w-2xl h-full max-h-[320px] rounded-2xl overflow-hidden"
                style={{ background: "rgba(255,255,255,0.035)", border: `1px solid ${chapter.color}18`, boxShadow: `0 0 80px ${chapter.color}0c` }}>
                <Visual progress={chProgress} />
              </div>
            </div>

            {/* Caption */}
            <div className="absolute bottom-0 left-0 right-0 px-8 pb-4 z-10"
              style={{ opacity: caption ? 1 : 0, transition: "opacity 0.4s", background: "linear-gradient(to top,rgba(0,0,0,0.65),transparent)" }}>
              <p className="text-white/90 text-sm text-center leading-relaxed max-w-2xl mx-auto"
                style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
                {caption}
              </p>
            </div>

            {/* Play overlay */}
            {!playing && (
              <div className="absolute inset-0 flex items-center justify-center cursor-pointer z-20" onClick={togglePlay}>
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur border border-white/18 flex items-center justify-center hover:bg-white/18 transition-all hover:scale-105">
                  <Play className="w-7 h-7 text-white ml-1" />
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-black/80 border-t border-white/8 px-4 py-3 flex-shrink-0">
            <div className="mb-3 relative">
              <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-200"
                  style={{ width: `${totalPct * 100}%`, background: `linear-gradient(to right,${chapter.color},${chapter.color}cc)` }} />
              </div>
              <div className="absolute inset-0 flex">
                {CHAPTERS.map((ch, i) => {
                  if (i === 0) return null;
                  const pct = (CHAPTERS.slice(0, i).reduce((s, c) => s + c.duration, 0) / TOTAL_DURATION) * 100;
                  return <div key={ch.id} className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2.5 bg-white/15" style={{ left: `${pct}%` }} />;
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => goChapter(Math.max(0, chIdx - 1), playing)} disabled={chIdx === 0}
                className="text-white/45 hover:text-white transition-colors disabled:opacity-25">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={togglePlay} className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-105 transition-all"
                style={{ background: chapter.color }}>
                {playing ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
              </button>
              <button onClick={() => goChapter(Math.min(CHAPTERS.length - 1, chIdx + 1), playing)} disabled={chIdx === CHAPTERS.length - 1}
                className="text-white/45 hover:text-white transition-colors disabled:opacity-25">
                <SkipForward className="w-4 h-4" />
              </button>
              <div className="text-white/35 text-xs tabular-nums">{fmtTime(totalElapsed)} / {fmtTime(TOTAL_DURATION)}</div>
              <div className="flex-1" />
              <button onClick={toggleMute} className="text-white/45 hover:text-white transition-colors">
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <span className="text-white/25 text-[11px] hidden sm:inline">{chapter.title}</span>
            </div>
            {/* Mobile chapter strip */}
            <div className="flex gap-1.5 mt-2.5 overflow-x-auto lg:hidden">
              {CHAPTERS.map((ch, i) => {
                const isActive = i === chIdx;
                return (
                  <button key={ch.id} onClick={() => goChapter(i, playing)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] whitespace-nowrap flex-shrink-0 transition-all"
                    style={{ background: isActive ? `${ch.color}18` : "rgba(255,255,255,0.05)", border: `1px solid ${isActive ? ch.color + "35" : "transparent"}`, color: isActive ? "white" : "rgba(255,255,255,0.35)" }}>
                    <ch.icon className="w-3 h-3" style={{ color: isActive ? ch.color : "rgba(255,255,255,0.28)" }} />
                    {ch.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
