import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  ChevronRight, BarChart3, CheckSquare, FolderKanban,
  LineChart, Workflow, LayoutGrid, Presentation, ClipboardList,
  Sparkles, ArrowRight, Target, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle2, Clock, Users, Building2, Star,
  Activity, PieChart, FileText, Calendar, Zap, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const CHAPTERS = [
  {
    id: "intro",
    title: "Welcome to Performo AI",
    duration: 10,
    icon: Sparkles,
    color: "#3b82f6",
    narration: "Welcome to Performo AI — the all-in-one performance management platform built for SMEs. In the next few minutes, you'll see how every module works together to turn your strategy into measurable results.",
  },
  {
    id: "kpi",
    title: "KPI Dashboard",
    duration: 22,
    icon: BarChart3,
    color: "#10b981",
    narration: "The KPI module gives your team live visibility into every metric that matters. Traffic-light ratings — green, amber, red — make it instantly clear where you're on track, at risk, or falling behind. Click any KPI to drill into its trend history, targets, and department-level breakdowns.",
  },
  {
    id: "actions",
    title: "Actions & Accountability",
    duration: 18,
    icon: CheckSquare,
    color: "#f59e0b",
    narration: "Turn insights into execution. The Actions module tracks every initiative, assigns clear ownership, and monitors progress — so nothing falls through the cracks. Filter by owner, department, or due date to see exactly where things stand.",
  },
  {
    id: "portfolio",
    title: "Portfolio & Projects",
    duration: 20,
    icon: FolderKanban,
    color: "#8b5cf6",
    narration: "The Portfolio module gives leadership a clear view of every strategic initiative. Track milestones, monitor task completion, and manage team workload — all in one place. Drill into any project for a full breakdown of tasks, subtasks, and progress.",
  },
  {
    id: "analytics",
    title: "Analytics Studio",
    duration: 22,
    icon: LineChart,
    color: "#06b6d4",
    narration: "Upload your Excel data and Performo AI automatically builds rich charts and insights. Compose custom dashboards with drag-and-drop widgets, create calculated formula columns, and ask the AI assistant any question about your data in plain language.",
  },
  {
    id: "workflow",
    title: "Workflow Center",
    duration: 20,
    icon: Workflow,
    color: "#f43f5e",
    narration: "The Workflow Center manages service desk tickets, recurring tasks, licenses, and certificates — all organised into logical groups with due dates, status tracking, and automated overdue alerts. No more chasing on email.",
  },
  {
    id: "scorecard",
    title: "Balanced Scorecard",
    duration: 16,
    icon: LayoutGrid,
    color: "#0ea5e9",
    narration: "Map your KPIs across the four balanced scorecard perspectives — Financial, Customer, Internal Processes, and Learning & Growth — giving leadership a single strategic view of the entire business.",
  },
  {
    id: "presentations",
    title: "Presentation Studio",
    duration: 16,
    icon: Presentation,
    color: "#d946ef",
    narration: "Generate professional presentations from your live data in seconds. Tell Performo AI what you need, and it builds slides with your KPIs, charts, and strategic insights — ready to present to your board or leadership team.",
  },
  {
    id: "reviews",
    title: "Monthly Reviews",
    duration: 16,
    icon: ClipboardList,
    color: "#84cc16",
    narration: "Run structured monthly performance reviews with AI-generated narratives. Highlight wins, flag risks, track commitments, and build a running record of your organisation's performance story over time.",
  },
  {
    id: "close",
    title: "Get Started Today",
    duration: 12,
    icon: Zap,
    color: "#3b82f6",
    narration: "Performo AI — where strategy meets execution. Every module, every insight, every action — connected in one intelligent platform. Sign up today and have your team up and running in under an hour.",
  },
];

const TOTAL_DURATION = CHAPTERS.reduce((s, c) => s + c.duration, 0);

function KpiVisual({ progress }: { progress: number }) {
  const kpis = [
    { name: "Occupancy Rate", value: "82%", target: "85%", status: "amber", trend: "up" },
    { name: "RevPAR", value: "AED 561", target: "AED 578", status: "amber", trend: "up" },
    { name: "Guest Score", value: "4.6", target: "4.5", status: "green", trend: "up" },
    { name: "Staff Turnover", value: "24%", target: "20%", status: "red", trend: "down" },
    { name: "GOP Margin", value: "36%", target: "35%", status: "green", trend: "up" },
    { name: "ADR", value: "AED 685", target: "AED 680", status: "green", trend: "up" },
  ];
  const colors: Record<string, string> = { green: "#10b981", amber: "#f59e0b", red: "#ef4444" };
  return (
    <div className="w-full h-full p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-semibold text-sm">KPI Performance — April 2026</span>
        <Badge className="bg-white/10 text-white text-[10px]">10 KPIs</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 flex-1">
        {kpis.map((k, i) => {
          const show = progress > i * 0.13;
          return (
            <div
              key={k.name}
              className="rounded-xl p-3 flex flex-col gap-1.5 transition-all duration-500"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: `1.5px solid ${colors[k.status]}40`,
                opacity: show ? 1 : 0,
                transform: show ? "translateY(0)" : "translateY(12px)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-[10px] leading-tight">{k.name}</span>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors[k.status] }} />
              </div>
              <div className="text-white font-bold text-base leading-none">{k.value}</div>
              <div className="text-white/40 text-[10px]">Target: {k.target}</div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: show ? "75%" : "0%", background: colors[k.status] }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 text-[11px]">
        {[["🟢", "On Track", "3"], ["🟡", "At Risk", "2"], ["🔴", "Off Track", "1"]].map(([e, l, n]) => (
          <div key={l} className="flex items-center gap-1.5 text-white/60">
            <span>{e}</span><span>{n} {l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionsVisual({ progress }: { progress: number }) {
  const actions = [
    { title: "Finalise Q2 Revenue Strategy", owner: "Dharmesh", due: "Apr 20", status: "In Progress", priority: "High" },
    { title: "Complete Fire Safety Audit", owner: "Noura", due: "Apr 15", status: "Overdue", priority: "High" },
    { title: "Launch Guest Loyalty Programme", owner: "Ravi", due: "May 1", status: "Not Started", priority: "Medium" },
    { title: "Update Staff Training Matrix", owner: "Noura", due: "Apr 30", status: "In Progress", priority: "Medium" },
    { title: "Review F&B Supplier Contracts", owner: "Dharmesh", due: "Apr 25", status: "Completed", priority: "Low" },
  ];
  const statusColors: Record<string, string> = {
    "In Progress": "#3b82f6", "Overdue": "#ef4444", "Not Started": "#6b7280", "Completed": "#10b981",
  };
  return (
    <div className="w-full h-full p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-semibold text-sm">Action Items</span>
        <span className="text-white/40 text-xs">6 items</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {actions.map((a, i) => {
          const show = progress > i * 0.15;
          return (
            <div
              key={a.title}
              className="rounded-lg px-3 py-2 flex items-center gap-3 transition-all duration-500"
              style={{
                background: "rgba(255,255,255,0.06)",
                opacity: show ? 1 : 0,
                transform: show ? "translateX(0)" : "translateX(-16px)",
              }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColors[a.status] }} />
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-medium truncate">{a.title}</div>
                <div className="text-white/40 text-[10px]">{a.owner} · Due {a.due}</div>
              </div>
              <div className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${statusColors[a.status]}20`, color: statusColors[a.status] }}>
                {a.status}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PortfolioVisual({ progress }: { progress: number }) {
  const projects = [
    { name: "Hotel Brand Refresh 2026", status: "On Track", tasks: 12, done: 8, pct: 67, color: "#10b981" },
    { name: "PMS Migration to Cloud", status: "At Risk", tasks: 18, done: 9, pct: 50, color: "#f59e0b" },
    { name: "Staff L&D Programme", status: "On Track", tasks: 10, done: 7, pct: 70, color: "#10b981" },
  ];
  return (
    <div className="w-full h-full p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-semibold text-sm">Strategic Portfolio</span>
        <Badge className="bg-white/10 text-white text-[10px]">3 Projects</Badge>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {projects.map((p, i) => {
          const show = progress > i * 0.2;
          return (
            <div
              key={p.name}
              className="rounded-xl p-3 transition-all duration-600"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: `1.5px solid ${p.color}30`,
                opacity: show ? 1 : 0,
                transform: show ? "translateY(0)" : "translateY(16px)",
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-white text-xs font-semibold leading-snug">{p.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full ml-2 flex-shrink-0" style={{ background: `${p.color}20`, color: p.color }}>{p.status}</span>
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1200" style={{ width: show ? `${p.pct}%` : "0%", background: p.color }} />
                </div>
                <span className="text-white/60 text-[10px] w-8 text-right">{p.pct}%</span>
              </div>
              <div className="text-white/40 text-[10px]">{p.done}/{p.tasks} tasks complete</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsVisual({ progress }: { progress: number }) {
  const bars = [62, 78, 55, 88, 72, 91, 65, 84, 70, 95, 60, 82];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return (
    <div className="w-full h-full p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-semibold text-sm">Revenue Analytics — 2025</span>
        <div className="flex gap-2">
          <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px] border border-cyan-500/30">Bar Chart</Badge>
          <Badge className="bg-white/10 text-white/60 text-[10px]">AI Insights ✨</Badge>
        </div>
      </div>
      <div className="flex items-end gap-1.5 flex-1 px-2">
        {bars.map((h, i) => {
          const show = progress > i * 0.07;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-md transition-all duration-700 relative" style={{
                height: show ? `${h}%` : "0%",
                background: i === 11 ? "linear-gradient(to top, #06b6d4, #3b82f6)" : "rgba(6,182,212,0.4)",
                border: "1px solid rgba(6,182,212,0.3)",
              }}>
                {i === 11 && show && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-cyan-400 font-bold whitespace-nowrap">↑ Best</div>
                )}
              </div>
              <span className="text-[8px] text-white/30">{months[i]}</span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-1">
        {[["Total Revenue", "AED 4.2M", "+12%", "#10b981"], ["Avg Monthly", "AED 350K", "+8%", "#3b82f6"], ["Peak Month", "Dec (AED 412K)", "", "#f59e0b"]].map(([l, v, c, col]) => (
          <div key={l} className="rounded-lg p-2 text-center" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="text-[9px] text-white/40">{l}</div>
            <div className="text-xs text-white font-bold">{v}</div>
            {c && <div className="text-[9px] font-medium" style={{ color: col }}>{c}</div>}
          </div>
        ))}
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
  return (
    <div className="w-full h-full p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-semibold text-sm">Workflow Center</span>
        <span className="text-white/40 text-xs">4 modules · 18 items</span>
      </div>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {groups.map((g, i) => {
          const show = progress > i * 0.18;
          return (
            <div
              key={g.name}
              className="rounded-xl p-3 transition-all duration-500"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1.5px solid ${g.color}30`,
                opacity: show ? 1 : 0,
                transform: show ? "scale(1)" : "scale(0.9)",
              }}
            >
              <div className="text-[9px] font-medium mb-0.5" style={{ color: g.color }}>{g.type}</div>
              <div className="text-white text-xs font-semibold leading-snug mb-2">{g.name}</div>
              <div className="flex gap-2 text-[10px]">
                <div className="flex flex-col"><span className="text-white font-bold text-sm">{g.total}</span><span className="text-white/40">Total</span></div>
                <div className="flex flex-col"><span className="text-blue-400 font-bold text-sm">{g.open}</span><span className="text-white/40">Open</span></div>
                {g.overdue > 0 && <div className="flex flex-col"><span className="text-red-400 font-bold text-sm">{g.overdue}</span><span className="text-white/40">Overdue</span></div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScorecardVisual({ progress }: { progress: number }) {
  const perspectives = [
    { label: "Financial", icon: TrendingUp, kpis: ["RevPAR", "GOP Margin", "ADR"], score: 78, color: "#10b981" },
    { label: "Customer", icon: Star, kpis: ["Guest Score", "Repeat Rate", "NPS"], score: 85, color: "#3b82f6" },
    { label: "Internal Processes", icon: Activity, kpis: ["Room Turnaround", "Occupancy", "Maintenance"], score: 62, color: "#f59e0b" },
    { label: "Learning & Growth", icon: Users, kpis: ["Turnover", "Training Hrs", "Engagement"], score: 54, color: "#ef4444" },
  ];
  return (
    <div className="w-full h-full p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-semibold text-sm">Balanced Scorecard</span>
        <Badge className="bg-white/10 text-white text-[10px]">Q1 2026</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {perspectives.map((p, i) => {
          const show = progress > i * 0.2;
          const Icon = p.icon;
          return (
            <div
              key={p.label}
              className="rounded-xl p-3 flex flex-col gap-2 transition-all duration-600"
              style={{
                background: `${p.color}10`,
                border: `1.5px solid ${p.color}30`,
                opacity: show ? 1 : 0,
                transform: show ? "translateY(0)" : "translateY(10px)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${p.color}20` }}>
                  <Icon className="w-3 h-3" style={{ color: p.color }} />
                </div>
                <span className="text-white text-[11px] font-semibold">{p.label}</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold" style={{ color: p.color }}>{p.score}</span>
                <span className="text-white/40 text-xs mb-0.5">/100</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: show ? `${p.score}%` : "0%", background: p.color }} />
              </div>
              <div className="text-[9px] text-white/40">{p.kpis.join(" · ")}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PresentationVisual({ progress }: { progress: number }) {
  const slides = [
    { title: "Q1 Performance Review", subtitle: "OYO Hospitality — April 2026", type: "cover" },
    { title: "KPI Dashboard", subtitle: "6 of 10 KPIs on track", type: "kpi" },
    { title: "Revenue Analysis", subtitle: "AED 4.2M total · +12% YoY", type: "chart" },
    { title: "Strategic Actions", subtitle: "5 initiatives in progress", type: "actions" },
  ];
  return (
    <div className="w-full h-full p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-semibold text-sm">Presentation Studio</span>
        <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px]">AI Generated ✨</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {slides.map((s, i) => {
          const show = progress > i * 0.2;
          return (
            <div
              key={s.title}
              className="rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1 transition-all duration-500"
              style={{
                background: i === 0
                  ? "linear-gradient(135deg, #3b82f620, #8b5cf620)"
                  : "rgba(255,255,255,0.06)",
                border: "1.5px solid rgba(255,255,255,0.1)",
                opacity: show ? 1 : 0,
                transform: show ? "scale(1)" : "scale(0.85)",
              }}
            >
              <div className="text-[9px] text-white/40 uppercase tracking-wider">Slide {i + 1}</div>
              <div className="text-white text-[11px] font-semibold leading-snug">{s.title}</div>
              <div className="text-white/50 text-[10px]">{s.subtitle}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewsVisual({ progress }: { progress: number }) {
  return (
    <div className="w-full h-full p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white font-semibold text-sm">March 2026 Performance Review</span>
        <Badge className="bg-lime-500/20 text-lime-300 border border-lime-500/30 text-[10px]">Completed</Badge>
      </div>
      <div
        className="rounded-xl p-3 transition-all duration-500"
        style={{
          background: "rgba(255,255,255,0.06)",
          opacity: progress > 0.1 ? 1 : 0,
        }}
      >
        <div className="text-[10px] text-white/40 mb-1">AI-Generated Narrative</div>
        <p className="text-white/80 text-xs leading-relaxed">
          March was a strong month for OYO Hospitality with occupancy reaching 82% — just 3 points below target. RevPAR improved by 6% month-on-month driven by rate optimisation. Guest satisfaction remained above target at 4.6. Staff turnover remains the key risk area requiring focused attention in Q2.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {[
          { label: "Key Wins", items: ["RevPAR up 6% MoM", "Guest score 4.6 ✓"], color: "#10b981", icon: "🏆" },
          { label: "Risks", items: ["Turnover at 24%", "2 overdue action items"], color: "#ef4444", icon: "⚠️" },
          { label: "Commitments", items: ["L&D programme launch", "Safety audit completion"], color: "#3b82f6", icon: "📋" },
          { label: "Next Month Focus", items: ["Hit 85% occupancy", "Reduce turnover to 22%"], color: "#f59e0b", icon: "🎯" },
        ].map((s, i) => {
          const show = progress > 0.15 + i * 0.15;
          return (
            <div
              key={s.label}
              className="rounded-xl p-2.5 transition-all duration-500"
              style={{ background: `${s.color}10`, border: `1px solid ${s.color}25`, opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(8px)" }}
            >
              <div className="text-[10px] font-semibold mb-1" style={{ color: s.color }}>{s.icon} {s.label}</div>
              {s.items.map(it => <div key={it} className="text-[10px] text-white/60 leading-tight">· {it}</div>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IntroVisual({ progress }: { progress: number }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6">
      <div
        className="transition-all duration-700"
        style={{ opacity: progress > 0.05 ? 1 : 0, transform: progress > 0.05 ? "scale(1)" : "scale(0.8)" }}
      >
        <div className="flex items-center gap-3 mb-2 justify-center">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-3xl font-bold text-white tracking-tight">Performo <span className="text-blue-400">AI</span></span>
        </div>
        <p className="text-center text-white/50 text-sm">Performance Management · Powered by AI</p>
      </div>
      <div className="flex gap-4 flex-wrap justify-center">
        {[
          { icon: BarChart3, label: "KPIs", color: "#10b981" },
          { icon: CheckSquare, label: "Actions", color: "#f59e0b" },
          { icon: FolderKanban, label: "Portfolio", color: "#8b5cf6" },
          { icon: LineChart, label: "Analytics", color: "#06b6d4" },
          { icon: Workflow, label: "Workflow", color: "#f43f5e" },
          { icon: LayoutGrid, label: "Scorecard", color: "#0ea5e9" },
          { icon: Presentation, label: "Presentations", color: "#d946ef" },
          { icon: ClipboardList, label: "Reviews", color: "#84cc16" },
        ].map((m, i) => {
          const show = progress > 0.15 + i * 0.09;
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="flex flex-col items-center gap-1.5 transition-all duration-500"
              style={{ opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(12px)" }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${m.color}20`, border: `1.5px solid ${m.color}40` }}>
                <Icon className="w-4.5 h-4.5" style={{ color: m.color }} />
              </div>
              <span className="text-[10px] text-white/50">{m.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CloseVisual({ progress }: { progress: number }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-5 text-center px-6">
      <div className="transition-all duration-700" style={{ opacity: progress > 0.1 ? 1 : 0, transform: progress > 0.1 ? "translateY(0)" : "translateY(20px)" }}>
        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mx-auto mb-4">
          <Zap className="w-7 h-7 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Ready to Transform Your Performance?</h2>
        <p className="text-white/50 text-sm max-w-xs mx-auto">Every module. Every insight. Every action — connected in one intelligent platform.</p>
      </div>
      <div
        className="flex flex-col gap-2 items-center transition-all duration-700"
        style={{ opacity: progress > 0.4 ? 1 : 0, transform: progress > 0.4 ? "translateY(0)" : "translateY(12px)" }}
      >
        <div className="text-white/70 text-sm">Login with demo credentials to explore:</div>
        <div className="flex gap-3 flex-wrap justify-center text-xs">
          <div className="bg-white/10 rounded-lg px-3 py-2 text-white/80"><span className="text-white/40">Admin:</span> demo@performo.ai / demo123</div>
          <div className="bg-white/10 rounded-lg px-3 py-2 text-white/80"><span className="text-white/40">Exec:</span> exec@performo.ai / exec123</div>
        </div>
      </div>
    </div>
  );
}

const CHAPTER_VISUALS: Record<string, (props: { progress: number }) => JSX.Element> = {
  intro: IntroVisual,
  kpi: KpiVisual,
  actions: ActionsVisual,
  portfolio: PortfolioVisual,
  analytics: AnalyticsVisual,
  workflow: WorkflowVisual,
  scorecard: ScorecardVisual,
  presentations: PresentationVisual,
  reviews: ReviewsVisual,
  close: CloseVisual,
};

export default function DemoPage() {
  const [, navigate] = useLocation();
  const [chapterIdx, setChapterIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [elapsedInChapter, setElapsedInChapter] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [captionText, setCaptionText] = useState("");
  const [captionVisible, setCaptionVisible] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const chapter = CHAPTERS[chapterIdx];
  const chapterProgress = elapsedInChapter / chapter.duration;

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speakChapter = useCallback((idx: number) => {
    stopSpeech();
    if (muted || typeof window === "undefined" || !window.speechSynthesis) return;
    const utt = new SpeechSynthesisUtterance(CHAPTERS[idx].narration);
    utt.rate = 0.92;
    utt.pitch = 1.0;
    utt.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes("Google UK English Female") ||
      v.name.includes("Samantha") ||
      v.name.includes("Karen") ||
      v.name.includes("Daniel") ||
      v.lang === "en-GB"
    ) || voices.find(v => v.lang.startsWith("en")) || voices[0];
    if (preferred) utt.voice = preferred;
    speechRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, [muted, stopSpeech]);

  const goToChapter = useCallback((idx: number, autoPlay = false) => {
    stopSpeech();
    setChapterIdx(idx);
    setElapsedInChapter(0);
    const elapsed = CHAPTERS.slice(0, idx).reduce((s, c) => s + c.duration, 0);
    setTotalElapsed(elapsed);
    if (autoPlay) {
      speakChapter(idx);
    }
  }, [stopSpeech, speakChapter]);

  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setElapsedInChapter(prev => {
        const next = prev + 0.1;
        if (next >= chapter.duration) {
          const nextIdx = chapterIdx + 1;
          if (nextIdx < CHAPTERS.length) {
            goToChapter(nextIdx, true);
            return 0;
          } else {
            setPlaying(false);
            stopSpeech();
            return chapter.duration;
          }
        }
        return next;
      });
      setTotalElapsed(prev => {
        const max = TOTAL_DURATION;
        return Math.min(prev + 0.1, max);
      });
    }, 100);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, chapter.duration, chapterIdx, goToChapter, stopSpeech]);

  const togglePlay = () => {
    if (!playing) {
      setPlaying(true);
      speakChapter(chapterIdx);
    } else {
      setPlaying(false);
      stopSpeech();
    }
  };

  const toggleMute = () => {
    setMuted(m => {
      if (!m) stopSpeech();
      else if (playing) speakChapter(chapterIdx);
      return !m;
    });
  };

  useEffect(() => {
    const words = chapter.narration.split(" ");
    const wordsPerSecond = 2.5;
    const wordIdx = Math.min(Math.floor(elapsedInChapter * wordsPerSecond), words.length);
    const visible = words.slice(0, wordIdx).join(" ");
    setCaptionText(visible);
    setCaptionVisible(visible.length > 0);
  }, [elapsedInChapter, chapter.narration]);

  useEffect(() => {
    return () => {
      stopSpeech();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stopSpeech]);

  const Visual = CHAPTER_VISUALS[chapter.id];
  const totalPct = (totalElapsed / TOTAL_DURATION) * 100;

  return (
    <div className="fixed inset-0 bg-black flex flex-col select-none" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/80 border-b border-white/10 z-20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-white font-semibold text-sm">Performo AI</span>
          <span className="text-white/30 text-xs ml-1">· Product Demo</span>
        </div>
        <button
          onClick={() => { stopSpeech(); navigate("/"); }}
          className="text-white/40 hover:text-white/80 text-xs transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
        >
          Sign In →
        </button>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Chapter sidebar */}
        <div className="hidden lg:flex flex-col w-52 bg-black/60 border-r border-white/10 overflow-y-auto py-2">
          {CHAPTERS.map((ch, i) => {
            const Icon = ch.icon;
            const isActive = i === chapterIdx;
            const isPast = i < chapterIdx;
            return (
              <button
                key={ch.id}
                onClick={() => { goToChapter(i, playing); }}
                className="flex items-center gap-2.5 px-3 py-2.5 text-left transition-all relative"
                style={{
                  background: isActive ? `${ch.color}15` : "transparent",
                  borderLeft: `3px solid ${isActive ? ch.color : "transparent"}`,
                }}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isActive ? `${ch.color}25` : isPast ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${isActive ? ch.color + "50" : "transparent"}`,
                  }}
                >
                  <Icon className="w-3 h-3" style={{ color: isActive ? ch.color : isPast ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.3)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium truncate" style={{ color: isActive ? "white" : "rgba(255,255,255,0.4)" }}>{ch.title}</div>
                  <div className="text-[10px]" style={{ color: isActive ? ch.color : "rgba(255,255,255,0.2)" }}>{ch.duration}s</div>
                </div>
                {isPast && (
                  <CheckCircle2 className="w-3 h-3 text-white/25 flex-shrink-0" />
                )}
                {isActive && playing && (
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: ch.color }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Video screen */}
        <div className="flex-1 flex flex-col">
          {/* Screen */}
          <div
            className="flex-1 relative overflow-hidden"
            style={{
              background: `radial-gradient(ellipse at 30% 30%, ${chapter.color}08 0%, transparent 60%), #0a0a0f`,
            }}
          >
            {/* Chapter header */}
            <div className="absolute top-0 left-0 right-0 px-5 pt-4 pb-2 z-10" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)" }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${chapter.color}25`, border: `1px solid ${chapter.color}40` }}>
                  <chapter.icon className="w-3.5 h-3.5" style={{ color: chapter.color }} />
                </div>
                <span className="text-white/80 text-sm font-semibold">{chapter.title}</span>
                <span className="text-white/30 text-xs ml-auto">{chapterIdx + 1} / {CHAPTERS.length}</span>
              </div>
            </div>

            {/* Visual content */}
            <div className="absolute inset-0 flex items-center justify-center px-5 pt-14 pb-20">
              <div
                className="w-full max-w-2xl h-full max-h-80 rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${chapter.color}20`,
                  boxShadow: `0 0 60px ${chapter.color}10`,
                }}
              >
                <Visual progress={chapterProgress} />
              </div>
            </div>

            {/* Caption */}
            <div
              className="absolute bottom-0 left-0 right-0 px-8 pb-5 transition-opacity duration-300"
              style={{ opacity: captionVisible ? 1 : 0, background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}
            >
              <p className="text-white/90 text-sm text-center leading-relaxed max-w-2xl mx-auto" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                {captionText}
                {playing && captionText.length < chapter.narration.length && (
                  <span className="inline-block w-0.5 h-4 bg-white/60 ml-0.5 animate-pulse align-middle" />
                )}
              </p>
            </div>

            {/* Play overlay when paused */}
            {!playing && (
              <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer z-20"
                onClick={togglePlay}
              >
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all hover:scale-105">
                  <Play className="w-7 h-7 text-white ml-1" />
                </div>
              </div>
            )}
          </div>

          {/* Controls bar */}
          <div className="bg-black/90 border-t border-white/10 px-4 py-3">
            {/* Overall progress bar */}
            <div className="mb-3 relative group cursor-pointer">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-100"
                  style={{
                    width: `${totalPct}%`,
                    background: `linear-gradient(to right, ${chapter.color}, ${chapter.color}cc)`,
                  }}
                />
              </div>
              {/* Chapter markers */}
              <div className="absolute inset-0 flex">
                {CHAPTERS.map((ch, i) => {
                  if (i === 0) return null;
                  const pct = (CHAPTERS.slice(0, i).reduce((s, c) => s + c.duration, 0) / TOTAL_DURATION) * 100;
                  return (
                    <div
                      key={ch.id}
                      className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2 bg-white/20 rounded-full"
                      style={{ left: `${pct}%` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => goToChapter(Math.max(0, chapterIdx - 1), playing)}
                className="text-white/50 hover:text-white transition-colors"
                disabled={chapterIdx === 0}
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105"
                style={{ background: chapter.color }}
              >
                {playing ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
              </button>

              <button
                onClick={() => goToChapter(Math.min(CHAPTERS.length - 1, chapterIdx + 1), playing)}
                className="text-white/50 hover:text-white transition-colors"
                disabled={chapterIdx === CHAPTERS.length - 1}
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <div className="text-white/40 text-xs tabular-nums">
                {Math.floor(totalElapsed / 60)}:{String(Math.floor(totalElapsed % 60)).padStart(2, "0")} / {Math.floor(TOTAL_DURATION / 60)}:{String(TOTAL_DURATION % 60).padStart(2, "0")}
              </div>

              <div className="flex-1" />

              <button onClick={toggleMute} className="text-white/50 hover:text-white transition-colors">
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <span className="text-white/30 text-[11px] hidden sm:inline">{chapter.title}</span>
            </div>

            {/* Mobile chapter list */}
            <div className="flex gap-1.5 mt-2.5 overflow-x-auto lg:hidden pb-0.5">
              {CHAPTERS.map((ch, i) => {
                const Icon = ch.icon;
                const isActive = i === chapterIdx;
                return (
                  <button
                    key={ch.id}
                    onClick={() => goToChapter(i, playing)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] whitespace-nowrap flex-shrink-0 transition-all"
                    style={{
                      background: isActive ? `${ch.color}20` : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isActive ? ch.color + "40" : "transparent"}`,
                      color: isActive ? "white" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    <Icon className="w-3 h-3" style={{ color: isActive ? ch.color : "rgba(255,255,255,0.3)" }} />
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
