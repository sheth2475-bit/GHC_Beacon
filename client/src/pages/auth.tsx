import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, ArrowRight, Sparkles, FileText, LayoutTemplate, TrendingUp,
  Shield, Zap, CheckCircle2, ChevronRight, Building2, LineChart, FolderOpen,
  Users, LayoutGrid, Play, Pause, Search, Activity, X, Target, ListChecks,
  Calendar, Settings, Home, Star, ChevronLeft,
} from "lucide-react";

/* ──────────── Shared "App Chrome" Layout ──────────── */
const NAV_ITEMS = [
  { icon: Home, label: "Dashboard", key: "dashboard" },
  { icon: Star, label: "KPI Management", key: "kpis" },
  { icon: ListChecks, label: "Action Tracker", key: "actions" },
  { icon: Building2, label: "Meetings", key: "meetings" },
  { icon: FileText, label: "Monthly Reviews", key: "reviews" },
  { icon: LayoutTemplate, label: "Dashboard Planner", key: "planner" },
  { icon: FolderOpen, label: "Portfolio", key: "portfolio" },
  { icon: LayoutGrid, label: "Workload", key: "workload" },
  { icon: Settings, label: "Settings", key: "settings" },
];

function AppChrome({ activeKey, children }: { activeKey: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full bg-background overflow-hidden rounded-xl border-2 border-border shadow-2xl">
      {/* Sidebar */}
      <div className="w-44 bg-sidebar border-r border-sidebar-border flex flex-col py-3 shrink-0">
        <div className="flex items-center gap-2 px-3 pb-3 border-b border-sidebar-border mb-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <BarChart3 className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-[11px] font-bold">Performo AI</span>
        </div>
        <div className="px-2 space-y-0.5 flex-1">
          {NAV_ITEMS.map(item => (
            <div
              key={item.key}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
                activeKey === item.key
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent"
              }`}
            >
              <item.icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>
        <div className="px-3 pt-2 border-t border-sidebar-border mt-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">DS</div>
            <div className="min-w-0">
              <div className="text-[9px] font-semibold truncate">Dharmesh Sheth</div>
              <div className="text-[8px] text-muted-foreground truncate">Admin</div>
            </div>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95">
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-semibold text-muted-foreground">OYO Hospitality</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2.5 py-1 text-[10px] text-muted-foreground border cursor-pointer">
              <Search className="h-3 w-3" /> Search...
              <span className="ml-1 text-[9px] bg-border rounded px-1">⌘K</span>
            </div>
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">DS</div>
          </div>
        </div>
        {/* Page content */}
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ──────────── Individual demo slide content ──────────── */

// Dashboard slides
const DashboardSlides = [
  {
    caption: "Welcome banner greets you with your company name and live performance summary",
    content: () => (
      <div className="space-y-3">
        <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-4">
          <div className="text-sm font-bold mb-1">Good morning, Dharmesh 👋</div>
          <div className="text-xs text-muted-foreground">Sunday, March 15, 2026 · OYO Hospitality, UAE</div>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="text-emerald-600 font-medium">● 8 KPIs on track</span>
            <span className="text-red-500 font-medium">● 1 action overdue</span>
            <span className="text-muted-foreground">● 3 projects active</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Total KPIs", v: "10", c: "text-primary", sub: "2 need attention" },
            { l: "Actions Due", v: "6", c: "text-orange-500", sub: "1 overdue" },
            { l: "Projects", v: "4", c: "text-violet-600", sub: "3 in progress" },
          ].map((s, i) => (
            <div key={i} className="rounded-lg border bg-card p-3">
              <div className="text-[10px] text-muted-foreground mb-1">{s.l}</div>
              <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
              <div className="text-[9px] text-muted-foreground mt-1">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    caption: "KPI Health Donut shows instant breakdown: On Track, At Risk, Below Target",
    content: () => (
      <div className="space-y-3">
        <div className="text-sm font-semibold">KPI Performance Overview</div>
        <div className="flex gap-6 items-center">
          <div className="relative w-32 h-32 shrink-0">
            <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--muted))" strokeWidth="4"/>
              <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="56 88" strokeLinecap="round"/>
              <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="17 88" strokeDashoffset="-56" strokeLinecap="round"/>
              <circle cx="18" cy="18" r="14" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="15 88" strokeDashoffset="-73" strokeLinecap="round"/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-lg font-bold">10</div>
              <div className="text-[9px] text-muted-foreground">KPIs</div>
            </div>
          </div>
          <div className="space-y-2.5 flex-1">
            {[
              { l: "On Track", v: 8, c: "bg-emerald-500", tc: "text-emerald-700" },
              { l: "At Risk", v: 1, c: "bg-amber-500", tc: "text-amber-700" },
              { l: "Below Target", v: 1, c: "bg-red-500", tc: "text-red-700" },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${r.c} shrink-0`} />
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full ${r.c}`} style={{ width: `${(r.v / 10) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold w-3">{r.v}</span>
                <span className={`text-[10px] ${r.tc}`}>{r.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    caption: "Execution section shows live project health — colours update automatically",
    content: () => (
      <div className="space-y-3">
        <div className="text-sm font-semibold">Execution Overview</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { n: "Loyalty Program Launch", h: "bg-emerald-500", p: 55, s: "In Progress", t: 5, done: 2 },
            { n: "F&B Menu Overhaul", h: "bg-amber-500", p: 40, s: "In Progress", t: 4, done: 1 },
            { n: "Staff Retention Initiative", h: "bg-emerald-500", p: 30, s: "In Progress", t: 4, done: 1 },
            { n: "Q2 Revenue Recovery", h: "bg-amber-500", p: 0, s: "Not Started", t: 4, done: 0 },
          ].map((p, i) => (
            <div key={i} className="rounded-lg border overflow-hidden">
              <div className={`h-1 w-full ${p.h}`} />
              <div className="p-2.5">
                <div className="text-[10px] font-semibold leading-tight mb-2">{p.n}</div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1.5">
                  <div className={`h-full rounded-full ${p.h} transition-all duration-700`} style={{ width: `${p.p}%` }} />
                </div>
                <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                  <span>{p.p}% complete</span>
                  <span>{p.done}/{p.t} tasks</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

// KPI slides
const KpiSlides = [
  {
    caption: "All KPIs listed with live RAG status — Green, Amber, Red based on actuals vs targets",
    content: () => (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-semibold">KPI Management</div>
          <div className="flex items-center gap-2">
            <div className="h-7 px-3 rounded-md border text-[10px] flex items-center gap-1 bg-muted/50">All Departments ▾</div>
            <div className="h-7 px-3 rounded-md bg-violet-500 text-white text-[10px] flex items-center gap-1 font-medium">
              <Sparkles className="h-3 w-3" /> AI Generate
            </div>
          </div>
        </div>
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-5 gap-0 bg-muted/40 px-3 py-1.5 text-[9px] font-semibold text-muted-foreground border-b">
            <span className="col-span-2">KPI Name</span><span>Target</span><span>Latest Actual</span><span>Status</span>
          </div>
          {[
            { n: "Occupancy Rate", t: "85%", a: "78%", s: "Amber", sd: "bg-amber-500" },
            { n: "ADR", t: "$180", a: "$192", s: "Green", sd: "bg-emerald-500" },
            { n: "RevPAR", t: "$153", a: "$157", s: "Green", sd: "bg-emerald-500" },
            { n: "Guest Complaint Rate", t: "≤2/100", a: "3.2/100", s: "Red", sd: "bg-red-500" },
            { n: "Employee Turnover", t: "18%", a: "22%", s: "Red", sd: "bg-red-500" },
            { n: "Training Completion", t: "90%", a: "88%", s: "Amber", sd: "bg-amber-500" },
          ].map((r, i) => (
            <div key={i} className="grid grid-cols-5 gap-0 px-3 py-2 border-b last:border-0 hover:bg-muted/20 text-[10px] items-center">
              <div className="col-span-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${r.sd} shrink-0`} />
                <span className="font-medium truncate">{r.n}</span>
              </div>
              <span className="text-muted-foreground">{r.t}</span>
              <span className="font-semibold">{r.a}</span>
              <span className={`text-[9px] font-medium ${r.s === "Green" ? "text-emerald-600" : r.s === "Amber" ? "text-amber-600" : "text-red-500"}`}>{r.s}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    caption: "Click AI Generate — GPT-4o creates industry KPIs with targets and thresholds in seconds",
    content: () => (
      <div className="space-y-3">
        <div className="text-sm font-semibold">AI KPI Generator</div>
        <div className="rounded-lg border p-4 bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-violet-600 animate-pulse" />
            <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">GPT-4o generating KPIs for Hospitality...</span>
          </div>
          <div className="space-y-2">
            {["Revenue Per Available Room (RevPAR)","Average Daily Rate (ADR)","Occupancy Rate","Net Promoter Score (NPS)","Food & Beverage Revenue per Cover","Employee Turnover Rate"].map((k, i) => (
              <div key={i} className="flex items-center gap-2 bg-background rounded-md border p-2 text-[10px]">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                <span className="flex-1">{k}</span>
                <span className="text-muted-foreground">with thresholds ✓</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <div className="h-8 px-4 rounded-md border text-[10px] flex items-center">Review & Edit</div>
          <div className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[10px] flex items-center font-medium">Save All KPIs</div>
        </div>
      </div>
    ),
  },
  {
    caption: "Add this month's actual — status updates instantly from Red to Amber or Green",
    content: () => (
      <div className="space-y-3">
        <div className="text-sm font-semibold">Update KPI Actual</div>
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold">Occupancy Rate</span>
            <span className="ml-auto text-[10px] text-amber-700 font-medium">Currently: Amber</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Target: 85% · Last actual: 78% (January)</div>
        </div>
        <div className="space-y-2">
          <div className="text-[10px] text-muted-foreground font-medium">March 2026 Actual</div>
          <div className="flex gap-2">
            <div className="flex-1 rounded-md border px-3 py-2 text-sm font-medium bg-background border-primary ring-2 ring-primary/20">86%</div>
            <div className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-[11px] flex items-center font-medium">Save</div>
          </div>
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-2.5 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <div>
              <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Status improved: Amber → Green ✓</div>
              <div className="text-[9px] text-muted-foreground">Occupancy 86% exceeds 85% target</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

// Portfolio slides
const PortfolioSlides = [
  {
    caption: "Portfolio view — 6 live stat cards, health colour bars, and project grid at a glance",
    content: () => (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Project Portfolio</div>
          <div className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[10px] flex items-center font-medium">+ New Project</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Total Projects", v: "4", c: "border-l-primary" },
            { l: "Active", v: "3", c: "border-l-violet-500" },
            { l: "At Risk", v: "0", c: "border-l-red-500" },
          ].map((s, i) => (
            <div key={i} className={`rounded-lg border border-l-4 ${s.c} bg-card p-2.5`}>
              <div className="text-[10px] text-muted-foreground">{s.l}</div>
              <div className="text-xl font-bold mt-0.5">{s.v}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { n: "Loyalty Program Launch", h: "bg-emerald-500", p: 55, s: "In Progress", pri: "High", owner: "Noura B." },
            { n: "F&B Menu Overhaul", h: "bg-amber-500", p: 40, s: "In Progress", pri: "High", owner: "Khalid M." },
            { n: "Staff Retention Initiative", h: "bg-emerald-500", p: 30, s: "In Progress", pri: "Critical", owner: "Fatima A." },
            { n: "Q2 Revenue Recovery", h: "bg-amber-500", p: 0, s: "Not Started", pri: "Critical", owner: "Priya S." },
          ].map((p, i) => (
            <div key={i} className="rounded-lg border overflow-hidden cursor-pointer hover:border-primary/30">
              <div className={`h-1 w-full ${p.h}`} />
              <div className="p-2.5">
                <div className="text-[10px] font-semibold mb-1 leading-snug">{p.n}</div>
                <div className="flex gap-1 mb-2">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${p.s === "In Progress" ? "bg-violet-100 text-violet-700" : "bg-muted text-muted-foreground"}`}>{p.s}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${p.pri === "Critical" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>{p.pri}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1">
                  <div className={`h-full rounded-full ${p.h}`} style={{ width: `${p.p}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>{p.owner}</span><span>{p.p}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    caption: "Click into a project to see tasks — coloured priority borders and Kanban board view",
    content: () => (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm font-semibold">Loyalty Program Launch</div>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Green · 55%</span>
        </div>
        <div className="flex gap-2 text-[10px]">
          {["Overview", "Tasks", "Milestones", "Comments"].map((t, i) => (
            <div key={i} className={`px-3 py-1 rounded-md font-medium ${i === 1 ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"}`}>{t}</div>
          ))}
        </div>
        <div className="space-y-2">
          {[
            { t: "Design loyalty app mockups", p: "Critical", pb: "border-l-red-500", s: "In Progress", a: "Ravi M.", due: "Mar 15" },
            { t: "PMS integration testing", p: "High", pb: "border-l-orange-400", s: "Not Started", a: "Pooja S.", due: "Apr 1" },
            { t: "Email campaign content", p: "Medium", pb: "border-l-blue-400", s: "In Progress", a: "Omar K.", due: "Mar 20" },
            { t: "Beta launch with 100 members", p: "High", pb: "border-l-orange-400", s: "Not Started", a: "Noura B.", due: "Apr 15" },
          ].map((task, i) => (
            <div key={i} className={`rounded-lg border border-l-4 ${task.pb} bg-card p-2.5`}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-[10px] font-semibold">{task.t}</div>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${task.s === "In Progress" ? "bg-violet-100 text-violet-700" : "bg-muted text-muted-foreground"}`}>{task.s}</span>
              </div>
              <div className="flex gap-3 mt-1 text-[9px] text-muted-foreground">
                <span>{task.p}</span><span>{task.a}</span><span>Due {task.due}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    caption: "Milestone Calendar — see all upcoming project checkpoints plotted by month",
    content: () => (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Milestones</div>
          <div className="flex gap-1.5">
            <div className="h-7 px-3 rounded-md border text-[10px] flex items-center text-muted-foreground">☰ List</div>
            <div className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[10px] flex items-center font-medium">📅 Calendar</div>
          </div>
        </div>
        {[
          { m: "February 2026", ms: [{ t: "Loyalty Platform Vendor Selected", s: "Completed", c: "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" }] },
          { m: "April 2026", ms: [{ t: "PMS Integration Live", s: "Upcoming", c: "border-l-primary/50 bg-primary/5" }] },
          { m: "April 2026 (late)", ms: [{ t: "Loyalty Program Public Launch", s: "Upcoming", c: "border-l-violet-400 bg-violet-50 dark:bg-violet-900/20" }] },
        ].map((mo, i) => (
          <div key={i}>
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground">{mo.m}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {mo.ms.map((ms, j) => (
              <div key={j} className={`border-l-4 pl-3 py-2 rounded-r-lg ${ms.c} mb-1`}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium flex-1">{ms.t}</span>
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-medium ${ms.s === "Completed" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{ms.s}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
  },
];

// Workload slides
const WorkloadSlides = [
  {
    caption: "Team Workload — stacked bars per person show Done, Active, Queued, Overdue instantly",
    content: () => (
      <div className="space-y-3">
        <div className="text-sm font-semibold">Team Workload</div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { l: "Team Members", v: "5", c: "text-primary" },
            { l: "Total Tasks", v: "17", c: "text-foreground" },
            { l: "Overdue", v: "2", c: "text-red-500" },
            { l: "Completion", v: "41%", c: "text-emerald-600" },
          ].map((s, i) => (
            <div key={i} className="rounded-lg border bg-card p-2 text-center">
              <div className={`text-lg font-bold ${s.c}`}>{s.v}</div>
              <div className="text-[8px] text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 text-[9px] text-muted-foreground">
          {[{c:"bg-emerald-500",l:"Done"},{c:"bg-violet-500",l:"Active"},{c:"bg-muted-foreground/25",l:"Queued"},{c:"bg-red-500",l:"Overdue"}].map(l => (
            <span key={l.l} className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-sm inline-block ${l.c}`} />{l.l}</span>
          ))}
        </div>
        {[
          { n: "Ravi M.", total: 7, done: 3, active: 2, queued: 1, over: 1 },
          { n: "Pooja S.", total: 5, done: 4, active: 1, queued: 0, over: 0 },
          { n: "Omar K.", total: 3, done: 0, active: 2, queued: 0, over: 1 },
          { n: "Fatima A.", total: 2, done: 0, active: 2, queued: 0, over: 0 },
        ].map((p, i) => (
          <div key={i} className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                {p.n.split(" ").map(x => x[0]).join("")}
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-semibold">{p.n}</div>
                <div className="text-[9px] text-muted-foreground">{p.total} tasks</div>
              </div>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              <div className="bg-emerald-500 rounded-l" style={{ width: `${(p.done / p.total) * 100}%` }} />
              <div className="bg-violet-500" style={{ width: `${(p.active / p.total) * 100}%` }} />
              {p.queued > 0 && <div className="bg-muted-foreground/25" style={{ width: `${(p.queued / p.total) * 100}%` }} />}
              {p.over > 0 && <div className="bg-red-500 rounded-r" style={{ width: `${(p.over / p.total) * 100}%` }} />}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    caption: "Expand any team member to see all their tasks with due dates and overdue highlights",
    content: () => (
      <div className="space-y-3">
        <div className="text-sm font-semibold">Team Workload</div>
        <div className="rounded-lg border bg-card p-3 ring-2 ring-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">RM</div>
            <div className="flex-1">
              <div className="text-[10px] font-semibold">Ravi M.</div>
              <div className="text-[9px] text-muted-foreground">7 tasks</div>
            </div>
            <div className="text-[10px] text-primary font-medium">Hide tasks ▲</div>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
            <div className="bg-emerald-500 rounded-l w-[43%]" />
            <div className="bg-violet-500 w-[29%]" />
            <div className="bg-muted-foreground/25 w-[14%]" />
            <div className="bg-red-500 rounded-r w-[14%]" />
          </div>
          <div className="space-y-1.5 border-t pt-2">
            {[
              { t: "Design loyalty app mockups", p: "Loyalty Program", s: "In Progress", d: "Mar 15", ov: false },
              { t: "Update Q1 KPI actuals", p: "KPIs", s: "Completed", d: "Mar 10", ov: false },
              { t: "Review vendor proposals", p: "F&B Overhaul", s: "Overdue", d: "Mar 8", ov: true },
              { t: "Staff interview schedule", p: "Retention", s: "Not Started", d: "Mar 20", ov: false },
            ].map((task, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md bg-background border px-2 py-1.5">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.s === "Completed" ? "bg-emerald-500" : task.s === "In Progress" ? "bg-violet-500" : task.ov ? "bg-red-500" : "bg-muted-foreground/40"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-medium truncate">{task.t}</div>
                  <div className="text-[8px] text-muted-foreground">{task.p}</div>
                </div>
                <div className={`text-[9px] font-medium shrink-0 ${task.ov ? "text-red-500" : "text-muted-foreground"}`}>{task.ov ? "⚠ " : ""}{task.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

// Action slides
const ActionSlides = [
  {
    caption: "Action Tracker — every action from every meeting, with owner, due date, and status",
    content: () => (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Action Tracker</div>
          <div className="flex gap-2">
            <div className="h-7 px-3 rounded-md border text-[10px] flex items-center gap-1">All Meeting Types ▾</div>
            <div className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[10px] flex items-center font-medium">+ Add Action</div>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { t: "Implement new guest feedback system", o: "Sarah Johnson", m: "CEO Meeting", d: "Mar 15", s: "In Progress", p: "High" },
            { t: "Launch loyalty program campaign", o: "Omar Khalil", m: "PMO Committee", d: "Feb 20", s: "Delayed", p: "Medium" },
            { t: "Optimize housekeeping schedule", o: "David Park", m: "Dept Review", d: "Mar 5", s: "Completed", p: "High" },
            { t: "Conduct staff retention interviews", o: "Fatima Al Rashid", m: "Dept Review", d: "Mar 10", s: "In Progress", p: "High" },
            { t: "Review F&B menu pricing", o: "Michael Chen", m: "Finance Cmte", d: "Mar 20", s: "Not Started", p: "Medium" },
            { t: "Update budget forecast for Q2", o: "Lisa Wong", m: "CEO Meeting", d: "Mar 25", s: "Not Started", p: "Medium" },
          ].map((a, i) => (
            <div key={i} className="rounded-lg border bg-card p-2.5">
              <div className="flex items-start gap-2 mb-1">
                <div className="text-[10px] font-semibold flex-1 leading-snug">{a.t}</div>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                  a.s === "Completed" ? "bg-emerald-100 text-emerald-700" :
                  a.s === "In Progress" ? "bg-violet-100 text-violet-700" :
                  a.s === "Delayed" ? "bg-red-100 text-red-700" :
                  "bg-muted text-muted-foreground"}`}>{a.s}</span>
              </div>
              <div className="flex gap-3 text-[9px] text-muted-foreground">
                <span>{a.o}</span>
                <span className="text-primary/70">{a.m}</span>
                <span>Due {a.d}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    caption: "Filter by meeting type — instantly see all actions from your CEO or Finance meetings",
    content: () => (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Action Tracker</div>
          <div className="flex gap-2">
            <div className="h-7 px-3 rounded-md border border-primary text-[10px] flex items-center gap-1 font-medium text-primary bg-primary/5">CEO Meeting ✓ ▾</div>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground">2 actions (filtered from 6)</div>
        <div className="space-y-2">
          {[
            { t: "Implement new guest feedback system", o: "Sarah Johnson", d: "Mar 15", s: "In Progress" },
            { t: "Update budget forecast for Q2", o: "Lisa Wong", d: "Mar 25", s: "Not Started" },
          ].map((a, i) => (
            <div key={i} className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-start gap-2">
                <div className="text-[10px] font-semibold flex-1">{a.t}</div>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${a.s === "In Progress" ? "bg-violet-100 text-violet-700" : "bg-muted text-muted-foreground"}`}>{a.s}</span>
              </div>
              <div className="flex gap-3 mt-1 text-[9px] text-muted-foreground">
                <span>{a.o}</span><span>CEO Meeting</span><span>Due {a.d}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

// Review slides
const ReviewSlides = [
  {
    caption: "AI reviews your KPI actuals and action data to generate a monthly performance report",
    content: () => (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Monthly Reviews</div>
          <div className="h-7 px-3 rounded-md bg-violet-600 text-white text-[10px] flex items-center gap-1 font-medium">
            <Sparkles className="h-3 w-3 animate-pulse" /> Generate Review
          </div>
        </div>
        <div className="rounded-lg border bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-violet-600 animate-pulse" />
            <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">GPT-4o analysing February 2026 data...</span>
          </div>
          <div className="space-y-1.5 text-[10px] text-violet-600 dark:text-violet-400">
            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" /> Reading 10 KPI actuals...</div>
            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" style={{animationDelay:"0.3s"}} /> Reviewing 6 meeting actions...</div>
            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" style={{animationDelay:"0.6s"}} /> Identifying strengths and gaps...</div>
            <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" style={{animationDelay:"0.9s"}} /> Generating recommendations...</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    caption: "AI-generated review with real insights — strengths, gaps, and specific recommendations",
    content: () => (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">February 2026 — Performance Review</div>
          <div className="text-[9px] text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3 text-violet-500" /> AI Generated</div>
        </div>
        <div className="rounded-lg border bg-card p-3 space-y-3">
          <p className="text-[10px] text-muted-foreground leading-relaxed border-b pb-3">
            February showed mixed results. Revenue metrics exceeded targets with strong ADR ($192 vs $180) and RevPAR performance driven by corporate bookings. However, operational challenges in guest satisfaction and employee retention require immediate attention.
          </p>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold text-emerald-700">Key Strengths</span>
            </div>
            <div className="text-[10px] text-muted-foreground space-y-1 pl-3.5">
              <div>• ADR at $192 vs $180 target — +6.7% above goal</div>
              <div>• RevPAR at $157 vs $153 target — strong corporate demand</div>
              <div>• Housekeeping optimization completed ahead of schedule</div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] font-semibold text-red-700">Key Gaps</span>
            </div>
            <div className="text-[10px] text-muted-foreground space-y-1 pl-3.5">
              <div>• Guest complaint rate 3.2 vs 2.0 target — F&B related</div>
              <div>• Employee turnover 22% vs 18% target</div>
              <div>• Occupancy 78% vs 85% target — off-peak weekdays</div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[10px] font-semibold text-amber-700">Recommendations</span>
            </div>
            <div className="text-[10px] text-muted-foreground space-y-1 pl-3.5">
              <div>• Implement dynamic weekend pricing to boost off-peak occupancy</div>
              <div>• Launch retention bonuses approved by Finance (due Mar 20)</div>
              <div>• Prioritise F&B quality training — link to complaint reduction</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

/* ──────────── Feature Definitions ──────────── */
type FeatureDef = {
  icon: React.ElementType; title: string; description: string;
  color: string; bg: string; activeKey: string;
  slides: Array<{ caption: string; content: () => JSX.Element }>;
};

const FEATURES: FeatureDef[] = [
  { icon: LineChart, title: "Live Dashboard", color: "text-primary", bg: "bg-primary/10", activeKey: "dashboard", description: "Welcome banner, KPI health donut, action progress, execution stats — all live.", slides: DashboardSlides },
  { icon: Sparkles, title: "AI KPI Generator", color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/30", activeKey: "kpis", description: "Generate industry KPIs instantly with GPT-4o. Targets, thresholds, and formulas included.", slides: KpiSlides },
  { icon: Target, title: "KPI Management", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", activeKey: "kpis", description: "Track actuals against targets with live RAG status. Never miss a performance gap.", slides: KpiSlides },
  { icon: ListChecks, title: "Action Tracker", color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30", activeKey: "actions", description: "Meeting actions with owners, due dates, and status. Full accountability from board to team.", slides: ActionSlides },
  { icon: FileText, title: "AI Monthly Reviews", color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/30", activeKey: "reviews", description: "AI-generated reviews with real KPI data — strengths, gaps, and recommendations.", slides: ReviewSlides },
  { icon: LayoutTemplate, title: "Dashboard Planner", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", activeKey: "planner", description: "AI designs your ideal Power BI dashboard layout — charts, KPIs, and page structure.", slides: DashboardSlides },
  { icon: FolderOpen, title: "Project Portfolio", color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30", activeKey: "portfolio", description: "All projects with live health scores (Green/Amber/Red), filters, and progress bars.", slides: PortfolioSlides },
  { icon: LayoutGrid, title: "Project Management", color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-900/30", activeKey: "portfolio", description: "Task list and Kanban board, priority colour borders, milestone calendar.", slides: PortfolioSlides },
  { icon: Users, title: "Team Workload", color: "text-cyan-600", bg: "bg-cyan-100 dark:bg-cyan-900/30", activeKey: "workload", description: "Stacked bar per person — Done, Active, Queued, Overdue — identify overload instantly.", slides: WorkloadSlides },
  { icon: Search, title: "Global Search", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", activeKey: "dashboard", description: "Search all projects, tasks, KPIs, meetings, and actions from one bar.", slides: DashboardSlides },
  { icon: Building2, title: "Meeting Management", color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30", activeKey: "meetings", description: "Card-based meetings linked to action items. Every meeting drives accountable outcomes.", slides: ActionSlides },
  { icon: Shield, title: "Role-Based Access", color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800/50", activeKey: "settings", description: "Admin and Executive roles. Full control vs clean read-only — right access, right person.", slides: DashboardSlides },
];

/* ──────────── Auto-Play Demo Player ──────────── */
function DemoPlayer({ feature, onClose }: { feature: FeatureDef; onClose: () => void }) {
  const [slide, setSlide] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const SLIDE_DURATION = 4000;
  const TICK = 60;
  const totalSlides = feature.slides.length;

  const goToSlide = useCallback((idx: number) => {
    setVisible(false);
    setTimeout(() => { setSlide(idx); setProgress(0); setVisible(true); }, 250);
  }, []);

  const advance = useCallback(() => {
    goToSlide((slide + 1) % totalSlides);
  }, [slide, totalSlides, goToSlide]);

  useEffect(() => {
    if (!playing) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    const step = (TICK / SLIDE_DURATION) * 100;
    intervalRef.current = setInterval(() => {
      setProgress(p => { if (p + step >= 100) { advance(); return 0; } return p + step; });
    }, TICK);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, advance]);

  const totalProgressPct = ((slide / totalSlides) + (progress / 100 / totalSlides)) * 100;
  const currentSlide = feature.slides[slide];
  const Slide = currentSlide.content;

  return (
    <div className="flex flex-col h-full bg-muted/10">
      {/* Modal header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b bg-background shrink-0">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${feature.bg} shrink-0`}>
          <feature.icon className={`h-4 w-4 ${feature.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{feature.title} — Feature Demo</div>
          <div className="text-xs text-muted-foreground">OYO Hospitality · demo data</div>
        </div>
        <button onClick={() => setPlaying(!playing)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted">
          {playing ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Play</>}
        </button>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* App frame — full-size simulation */}
      <div className="flex-1 overflow-hidden p-4 bg-muted/20" style={{ minHeight: 0 }}>
        <div className="h-full transition-opacity duration-250" style={{ opacity: visible ? 1 : 0 }}>
          <AppChrome activeKey={feature.activeKey}>
            <Slide />
          </AppChrome>
        </div>
      </div>

      {/* Caption */}
      <div className="px-5 py-3 bg-background border-t min-h-[56px] flex items-center" style={{ opacity: visible ? 1 : 0, transition: "opacity 0.25s" }}>
        <p className="text-sm text-muted-foreground leading-snug">{currentSlide.caption}</p>
      </div>

      {/* Progress bar + controls */}
      <div className="px-5 pb-4 pt-2 bg-background border-t shrink-0">
        {/* Overall progress bar */}
        <div className="relative h-1.5 rounded-full bg-muted overflow-hidden mb-3 cursor-pointer" onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          const targetSlide = Math.floor(pct * totalSlides);
          setPlaying(false);
          goToSlide(Math.min(totalSlides - 1, Math.max(0, targetSlide)));
        }}>
          <div className="h-full rounded-full bg-primary transition-none" style={{ width: `${totalProgressPct}%` }} />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Slide dots */}
          <div className="flex gap-1.5 flex-1">
            {feature.slides.map((_, i) => (
              <button key={i} onClick={() => { setPlaying(false); goToSlide(i); }}
                className={`rounded-full transition-all h-2 ${i === slide ? "w-6 bg-primary" : "w-2 bg-muted-foreground/25 hover:bg-muted-foreground/60"}`}
              />
            ))}
          </div>

          {/* Nav */}
          <div className="flex items-center gap-2">
            <button onClick={() => { setPlaying(false); goToSlide(Math.max(0, slide - 1)); }}
              disabled={slide === 0} className="w-8 h-8 rounded-full border flex items-center justify-center text-sm disabled:opacity-30 hover:bg-muted transition-colors">
              ←
            </button>
            <button onClick={() => setPlaying(!playing)}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors">
              {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
            </button>
            <button onClick={() => { setPlaying(false); goToSlide(Math.min(totalSlides - 1, slide + 1)); }}
              disabled={slide === totalSlides - 1} className="w-8 h-8 rounded-full border flex items-center justify-center text-sm disabled:opacity-30 hover:bg-muted transition-colors">
              →
            </button>
          </div>

          <div className="text-xs text-muted-foreground text-right w-14">{slide + 1} / {totalSlides}</div>
        </div>
      </div>
    </div>
  );
}

/* ──────────── Feature Card ──────────── */
function FeatureVideoCard({ feature, index }: { feature: FeatureDef; index: number }) {
  const [open, setOpen] = useState(false);
  const [previewSlide, setPreviewSlide] = useState(0);
  const previewRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onHover = () => {
    previewRef.current = setInterval(() => setPreviewSlide(s => (s + 1) % feature.slides.length), 1800);
  };
  const onLeave = () => {
    if (previewRef.current) clearInterval(previewRef.current);
    setPreviewSlide(0);
  };

  const PreviewSlide = feature.slides[previewSlide].content;

  return (
    <>
      <Card className="group cursor-pointer hover:shadow-lg transition-all hover:border-primary/30 overflow-hidden flex flex-col" data-testid={`card-feature-video-${index}`}>
        {/* Thumbnail — live scaled preview of actual demo content */}
        <div className="relative overflow-hidden flex-shrink-0 border-b bg-muted/10" style={{ aspectRatio: "16/9" }}
          onMouseEnter={onHover} onMouseLeave={onLeave} onClick={() => setOpen(true)}>
          {/* Scaled app chrome preview */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ transform: "scale(0.38)", transformOrigin: "top left", width: "263%", height: "263%" }}>
            <div className="w-full h-full flex">
              {/* Mini sidebar */}
              <div className="w-36 bg-sidebar border-r border-sidebar-border flex flex-col py-2 shrink-0">
                <div className="flex items-center gap-1.5 px-2 pb-2 border-b border-sidebar-border mb-1.5">
                  <div className="w-5 h-5 rounded bg-primary flex items-center justify-center"><BarChart3 className="h-2.5 w-2.5 text-primary-foreground" /></div>
                  <span className="text-[9px] font-bold">Performo AI</span>
                </div>
                <div className="px-1.5 space-y-0.5">
                  {NAV_ITEMS.map(item => (
                    <div key={item.key} className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-[7px] font-medium ${feature.activeKey === item.key ? "bg-primary text-primary-foreground" : "text-sidebar-foreground/50"}`}>
                      <item.icon className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Mini content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b bg-background/95">
                  <span className="text-[8px] text-muted-foreground">OYO Hospitality</span>
                  <div className="flex items-center gap-1.5">
                    <div className="bg-muted/50 rounded px-2 py-0.5 text-[7px] text-muted-foreground flex items-center gap-1"><Search className="h-2 w-2" />Search</div>
                    <div className="w-4 h-4 rounded-full bg-primary/20 text-[6px] font-bold text-primary flex items-center justify-center">DS</div>
                  </div>
                </div>
                <div className="flex-1 p-3 overflow-hidden">
                  <PreviewSlide />
                </div>
              </div>
            </div>
          </div>

          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/95 shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="h-5 w-5 text-primary ml-0.5" fill="currentColor" />
            </div>
          </div>
          <div className="absolute bottom-2 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] bg-black/70 text-white px-2 py-0.5 rounded-full">Click to play demo</span>
          </div>
        </div>

        <CardContent className="p-4 flex-1" onClick={() => setOpen(true)}>
          <div className="flex items-start gap-3">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${feature.bg} shrink-0 mt-0.5`}>
              <feature.icon className={`h-3.5 w-3.5 ${feature.color}`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-primary font-medium group-hover:gap-2 transition-all">
            <Play className="h-3 w-3" fill="currentColor" /> Watch demo <ChevronRight className="h-3 w-3" />
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden" style={{ height: "90vh" }}>
          <DialogTitle className="sr-only">{feature.title} Demo</DialogTitle>
          <DemoPlayer feature={feature} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ──────────── Auth Dialog ──────────── */
function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false);
  const { login, register } = useAuth(); const { toast } = useToast();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { if (isLogin) await login(email, password); else await register(name, email, password); }
    catch (err: any) { toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" }); }
    finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">{isLogin ? "Sign In" : "Create Account"}</DialogTitle>
        <div className="flex justify-center mb-2 pt-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-sm"><BarChart3 className="h-5 w-5 text-primary-foreground" /></div></div>
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold" data-testid="text-auth-title">{isLogin ? "Welcome back" : "Create your account"}</h2>
          <p className="text-sm text-muted-foreground mt-1">{isLogin ? "Sign in to your Performo AI account" : "Get started with Performo AI"}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-1">
          {!isLogin && <div className="space-y-2"><Label htmlFor="name">Full Name</Label><Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required={!isLogin} data-testid="input-name" /></div>}
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required data-testid="input-email" /></div>
          <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required data-testid="input-password" /></div>
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">{loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
        </form>
        <div className="text-center mt-2"><Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setIsLogin(!isLogin)} data-testid="button-toggle-auth">{isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}</Button></div>
        {isLogin && <div className="text-center space-y-1 pb-2"><p className="text-xs text-muted-foreground">Admin: demo@performo.ai / demo123</p><p className="text-xs text-muted-foreground">Executive: exec@performo.ai / exec123</p></div>}
      </DialogContent>
    </Dialog>
  );
}

/* ──────────── Landing Page ──────────── */
export default function AuthPage() {
  const [authOpen, setAuthOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm"><BarChart3 className="h-[18px] w-[18px] text-primary-foreground" /></div>
            <span className="text-lg font-bold tracking-tight" data-testid="text-landing-logo">Performo AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#demos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Demo Videos</a>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#why" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Why Performo</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setAuthOpen(true)} data-testid="button-nav-login">Sign In</Button>
            <Button size="sm" onClick={() => setAuthOpen(true)} data-testid="button-nav-get-started">Get Started <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-xs font-medium" data-testid="badge-hero-tag"><Sparkles className="h-3 w-3 mr-1.5" /> Powered by GPT-4o</Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6" data-testid="text-hero-title">Performance &amp; Execution<span className="block text-primary">Management for SMEs</span></h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed" data-testid="text-hero-subtitle">AI-powered KPIs, project tracking, workload visibility, and monthly reviews — all in one platform built for growing businesses.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 h-12 shadow-md" onClick={() => setAuthOpen(true)} data-testid="button-hero-get-started">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12" onClick={() => document.getElementById("demos")?.scrollIntoView({ behavior: "smooth" })} data-testid="button-hero-watch-demos"><Play className="h-4 w-4 mr-2" fill="currentColor" /> Watch Demos</Button>
            </div>
          </div>
          {/* Hero mockup */}
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="rounded-2xl border bg-card/80 backdrop-blur shadow-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400/70"/><div className="w-3 h-3 rounded-full bg-yellow-400/70"/><div className="w-3 h-3 rounded-full bg-green-400/70"/></div>
                <span className="text-xs text-muted-foreground ml-2">Performo AI — OYO Hospitality</span>
              </div>
              <div className="p-6 md:p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[{label:"Total KPIs",value:"10",change:"+2 need attention",color:"text-primary"},{label:"On Track",value:"8",change:"80% of total",color:"text-emerald-600"},{label:"Active Projects",value:"3",change:"4 projects total",color:"text-violet-600"},{label:"Actions Due",value:"6",change:"1 overdue",color:"text-amber-600"}].map((stat,i)=>(
                    <div key={i} className="rounded-xl border bg-background p-4"><p className="text-xs text-muted-foreground mb-1">{stat.label}</p><p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p><p className="text-[11px] text-muted-foreground mt-1">{stat.change}</p></div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 rounded-xl border bg-background p-4">
                    <p className="text-xs font-medium mb-3">KPI Performance Trend</p>
                    <div className="flex items-end gap-1 h-24">{[40,55,45,65,60,75,70,85,80,90,85,92].map((h,i)=>(<div key={i} className="flex-1 rounded-t" style={{height:`${h}%`,background:h>=70?'hsl(var(--primary))':'hsl(var(--muted))'}}/>))}</div>
                    <div className="flex justify-between mt-2"><span className="text-[10px] text-muted-foreground">Jan</span><span className="text-[10px] text-muted-foreground">Dec</span></div>
                  </div>
                  <div className="rounded-xl border bg-background p-4">
                    <p className="text-xs font-medium mb-3">Project Health</p>
                    <div className="space-y-2.5">
                      {[{label:"Loyalty Launch",dot:"bg-emerald-500",pct:55},{label:"Menu Overhaul",dot:"bg-amber-500",pct:40},{label:"Staff Retention",dot:"bg-emerald-500",pct:30}].map((item,i)=>(
                        <div key={i}><div className="flex items-center gap-2 text-[11px] mb-1"><div className={`w-2 h-2 rounded-full ${item.dot}`}/><span className="text-muted-foreground flex-1 truncate">{item.label}</span><span className="font-medium">{item.pct}%</span></div><div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary/60" style={{width:`${item.pct}%`}}/></div></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[{value:"12",label:"Core Features",sub:"Performance + Execution"},{value:"GPT-4o",label:"AI Engine",sub:"Latest OpenAI model"},{value:"2",label:"User Roles",sub:"Admin & Executive"},{value:"100%",label:"Data Privacy",sub:"Your data, your platform"}].map((stat,i)=>(
              <div key={i} className="text-center"><p className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</p><p className="text-sm font-medium">{stat.label}</p><p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo videos */}
      <section id="demos" className="py-20 md:py-28 bg-muted/20 border-y">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs"><Play className="h-3 w-3 mr-1.5" fill="currentColor" /> Auto-Playing Demos</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-demos-title">See every feature <span className="text-primary">in action</span></h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Click any card to watch a full demo — the real app UI, real OYO Hospitality data, auto-playing with pause and step controls.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {FEATURES.map((feature, i) => <FeatureVideoCard key={i} feature={feature} index={i} />)}
          </div>
        </div>
      </section>

      {/* Features list */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-features-title">Everything you need to <span className="text-primary">manage performance &amp; execution</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[{heading:"Performance Management",items:FEATURES.slice(0,6)},{heading:"Execution Management",items:FEATURES.slice(6,12)}].map(({heading,items})=>(
              <div key={heading}>
                <div className="flex items-center gap-2 mb-6"><div className="h-px flex-1 bg-border"/><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{heading}</span><div className="h-px flex-1 bg-border"/></div>
                <div className="space-y-3">
                  {items.map((f,i)=>(<div key={i} className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:border-primary/20 transition-colors"><div className={`flex h-9 w-9 items-center justify-center rounded-lg ${f.bg} shrink-0`}><f.icon className={`h-4 w-4 ${f.color}`}/></div><div><h3 className="text-sm font-semibold mb-1">{f.title}</h3><p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p></div></div>))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 md:py-28 bg-muted/20 border-y">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-how-title">Up and running in <span className="text-primary">minutes</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
            {[{step:"01",title:"Set Up Profile",desc:"Enter company, industry, and departments. Invite your team instantly."},{step:"02",title:"Generate KPIs",desc:"GPT-4o creates industry-specific KPIs with targets, thresholds, and formulas."},{step:"03",title:"Run Meetings",desc:"Log meeting actions with owners and due dates — all linked for accountability."},{step:"04",title:"Track Projects",desc:"Create projects, assign tasks, set milestones, and monitor health scores."},{step:"05",title:"Get AI Reviews",desc:"Monthly AI reviews surface strengths, gaps, and recommendations from real data."}].map((step,i)=>(
              <div key={i} className="relative text-center" data-testid={`step-${i}`}>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold mx-auto mb-4 shadow-md">{step.step}</div>
                {i < 4 && <div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-border"/>}
                <h3 className="text-sm font-semibold mb-2">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section id="why" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">Why Performo</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-why-title">Built for growing businesses</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[{icon:Zap,title:"No BI Tool Required",desc:"Get executive-level insights without Power BI, Tableau, or data analysts.",color:"text-amber-600",bg:"bg-amber-100 dark:bg-amber-900/30"},{icon:Shield,title:"Industry-Specific AI",desc:"AI tuned for hospitality, retail, healthcare, F&B, and more.",color:"text-indigo-600",bg:"bg-indigo-100 dark:bg-indigo-900/30"},{icon:TrendingUp,title:"Performance + Execution",desc:"The only platform connecting KPI tracking with project execution.",color:"text-emerald-600",bg:"bg-emerald-100 dark:bg-emerald-900/30"},{icon:Activity,title:"Live Health Scoring",desc:"Automated RAG scoring for KPIs and projects. Always know what needs attention.",color:"text-red-600",bg:"bg-red-100 dark:bg-red-900/30"},{icon:Users,title:"Team Accountability",desc:"Every action has an owner. Every project has milestones.",color:"text-violet-600",bg:"bg-violet-100 dark:bg-violet-900/30"},{icon:CheckCircle2,title:"Meeting-to-Action Bridge",desc:"Turn every meeting into accountable actions. Track from boardroom to completion.",color:"text-teal-600",bg:"bg-teal-100 dark:bg-teal-900/30"}].map((item,i)=>(
              <div key={i} className="flex flex-col items-start p-6 rounded-2xl border bg-card hover:border-primary/20 transition-colors" data-testid={`card-benefit-${i}`}>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.bg} mb-4`}><item.icon className={`h-5 w-5 ${item.color}`}/></div>
                <h3 className="text-sm font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-cta-title">Ready to transform your performance management?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">Join SMEs using Performo AI to track KPIs, manage projects, and get AI-powered insights.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" className="text-base px-8 h-12 shadow-md" onClick={() => setAuthOpen(true)} data-testid="button-cta-start">Get Started Free <ArrowRight className="ml-2 h-4 w-4"/></Button>
            <p className="text-sm opacity-70">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary"><BarChart3 className="h-4 w-4 text-primary-foreground"/></div><span className="text-sm font-semibold">Performo AI</span></div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">{["Demo Videos","Features","How It Works","Why Performo"].map(l=>(<a key={l} href={`#${l.toLowerCase().replace(/ /g,"-")}`} className="hover:text-foreground transition-colors">{l}</a>))}</div>
          <p className="text-xs text-muted-foreground">AI-powered performance management for SMEs</p>
        </div>
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
