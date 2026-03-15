import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, ArrowRight, Sparkles, FileText, LayoutTemplate, TrendingUp,
  Shield, Zap, CheckCircle2, ChevronRight, Building2, LineChart, FolderOpen,
  Users, LayoutGrid, Play, Pause, Search, Activity, X, Target, ListChecks,
  Settings, Home, Star, Volume2, Maximize2, SkipBack,
} from "lucide-react";

/* ─────────── NAV (sidebar preview) ─────────── */
const NAV = [
  { icon: Home,           label: "Dashboard",         key: "dashboard" },
  { icon: Star,           label: "KPI Management",    key: "kpis" },
  { icon: ListChecks,     label: "Action Tracker",    key: "actions" },
  { icon: Building2,      label: "Meetings",          key: "meetings" },
  { icon: FileText,       label: "Monthly Reviews",   key: "reviews" },
  { icon: LayoutTemplate, label: "Dashboard Planner", key: "planner" },
  { icon: FolderOpen,     label: "Portfolio",         key: "portfolio" },
  { icon: LayoutGrid,     label: "Workload",          key: "workload" },
  { icon: Settings,       label: "Settings",          key: "settings" },
];

/* ─────────── FULL-PAGE SCENE CONTENT ─────────── */

function FullDashboard() {
  return (
    <div className="space-y-5 pb-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl border bg-gradient-to-br from-primary/8 to-primary/12 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Welcome back, Dharmesh Sheth</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <span>📅</span><span>Sunday, March 15, 2026</span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">● 2 KPIs on track</span>
              <span className="flex items-center gap-1.5 text-red-500 font-medium bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full">● 1 action overdue</span>
              <span className="flex items-center gap-1.5 text-muted-foreground bg-muted px-3 py-1 rounded-full">● 4 projects active</span>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs text-muted-foreground mb-1">Company</div>
            <div className="font-semibold">OYO Hospitality</div>
            <div className="text-xs text-muted-foreground">Hospitality · UAE</div>
          </div>
        </div>
      </div>
      {/* KPI Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { l: "Total KPIs", v: "10", sub: "Across all departments", c: "text-primary", ic: "🎯" },
          { l: "On Track", v: "2", sub: "20% of total KPIs", c: "text-emerald-600", ic: "✅" },
          { l: "Below Target", v: "0", sub: "0% of total KPIs", c: "text-muted-foreground", ic: "📉" },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{s.l}</span>
              <span className="text-lg">{s.ic}</span>
            </div>
            <div className={`text-3xl font-bold mb-1 ${s.c}`}>{s.v}</div>
            <div className="text-xs text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { l: "Total Actions", v: "6", sub: "Across all meetings", c: "text-foreground", ic: "📋" },
          { l: "Overdue", v: "1", sub: "17% of total actions", c: "text-red-500", ic: "⚠️" },
          { l: "Completed", v: "1", sub: "17% completion rate", c: "text-emerald-600", ic: "🏆" },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{s.l}</span>
              <span className="text-lg">{s.ic}</span>
            </div>
            <div className={`text-3xl font-bold mb-1 ${s.c}`}>{s.v}</div>
            <div className="text-xs text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </div>
      {/* Execution Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Execution Overview</h2>
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">4 active projects</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { n: "Loyalty Program Launch", h: "bg-emerald-500", hb: "border-l-emerald-500", p: 55, s: "In Progress", pri: "High", owner: "Noura Bin Rashid", t: 5, done: 2, due: "Apr 30" },
            { n: "F&B Menu Overhaul", h: "bg-amber-500", hb: "border-l-amber-500", p: 40, s: "In Progress", pri: "High", owner: "Khalid Mansoor", t: 4, done: 1, due: "Mar 31" },
            { n: "Staff Retention Initiative", h: "bg-emerald-500", hb: "border-l-emerald-500", p: 30, s: "In Progress", pri: "Critical", owner: "Fatima Al Rashid", t: 4, done: 1, due: "Jun 30" },
            { n: "Q2 Revenue Recovery Plan", h: "bg-amber-500", hb: "border-l-amber-500", p: 0, s: "Not Started", pri: "Critical", owner: "Priya Sharma", t: 4, done: 0, due: "Jun 30" },
          ].map((p, i) => (
            <div key={i} className={`rounded-xl border border-l-4 ${p.hb} bg-card p-5`}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-sm leading-snug flex-1 pr-2">{p.n}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${p.s === "In Progress" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" : "bg-muted text-muted-foreground"}`}>{p.s}</span>
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{p.p}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${p.h} transition-all duration-1000`} style={{ width: `${p.p}%` }} />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>👤 {p.owner}</span>
                <span>📌 {p.pri}</span>
                <span>✅ {p.done}/{p.t} tasks</span>
                <span>📅 Due {p.due}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* KPI Health Donut */}
      <div>
        <h2 className="text-lg font-semibold mb-4">KPI Health Overview</h2>
        <div className="rounded-xl border bg-card p-5 flex items-center gap-8">
          <div className="relative w-40 h-40 shrink-0">
            <svg viewBox="0 0 36 36" className="w-40 h-40 -rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--muted))" strokeWidth="4"/>
              <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="17 88" strokeLinecap="round"/>
              <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="35 88" strokeDashoffset="-17" strokeLinecap="round"/>
              <circle cx="18" cy="18" r="14" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="36 88" strokeDashoffset="-52" strokeLinecap="round"/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold">10</div>
              <div className="text-xs text-muted-foreground">Total KPIs</div>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            {[
              { l: "On Track (Green)", v: 2, c: "bg-emerald-500", tc: "text-emerald-700 dark:text-emerald-400", pct: "20%" },
              { l: "At Risk (Amber)", v: 4, c: "bg-amber-500", tc: "text-amber-700 dark:text-amber-400", pct: "40%" },
              { l: "Below Target (Red)", v: 4, c: "bg-red-500", tc: "text-red-700 dark:text-red-400", pct: "40%" },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${r.c} shrink-0`} />
                <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full rounded-full ${r.c}`} style={{ width: r.pct }} />
                </div>
                <span className="text-sm font-bold w-4">{r.v}</span>
                <span className={`text-sm ${r.tc} w-44`}>{r.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FullKpis() {
  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">KPI Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage your key performance indicators</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground bg-background">All Departments ▾</div>
          <div className="flex items-center gap-2 rounded-lg bg-violet-600 text-white px-4 py-2 text-sm font-medium cursor-pointer">
            <Sparkles className="h-4 w-4" /> AI Generate KPIs
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium cursor-pointer">+ Add KPI</div>
        </div>
      </div>
      {/* KPI Table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="grid grid-cols-6 bg-muted/50 px-4 py-3 text-xs font-semibold text-muted-foreground border-b">
          <span className="col-span-2">KPI Name</span><span>Department</span><span>Target</span><span>Latest Actual</span><span>Status</span>
        </div>
        {[
          { n: "Occupancy Rate", d: "Sales", t: "85%", a: "78%", s: "Amber", c: "bg-amber-500", f: "Monthly" },
          { n: "Average Daily Rate (ADR)", d: "Sales", t: "$180", a: "$192", s: "Green", c: "bg-emerald-500", f: "Monthly" },
          { n: "RevPAR", d: "Sales", t: "$153", a: "$157", s: "Green", c: "bg-emerald-500", f: "Monthly" },
          { n: "Guest Complaint Rate", d: "Operations", t: "≤2/100", a: "3.2/100", s: "Red", c: "bg-red-500", f: "Monthly" },
          { n: "Room Turnaround Time", d: "Operations", t: "≤30 min", a: "38 min", s: "Amber", c: "bg-amber-500", f: "Weekly" },
          { n: "Employee Turnover Rate", d: "HR", t: "18%", a: "22%", s: "Red", c: "bg-red-500", f: "Monthly" },
          { n: "Training Completion Rate", d: "HR", t: "90%", a: "88%", s: "Amber", c: "bg-amber-500", f: "Monthly" },
          { n: "GOP Margin", d: "Finance", t: "35%", a: "32%", s: "Amber", c: "bg-amber-500", f: "Monthly" },
          { n: "Budget Variance", d: "Finance", t: "≤5%", a: "7%", s: "Amber", c: "bg-amber-500", f: "Monthly" },
          { n: "F&B Revenue per Cover", d: "Sales", t: "$145", a: "$128", s: "Red", c: "bg-red-500", f: "Monthly" },
        ].map((r, i) => (
          <div key={i} className="grid grid-cols-6 px-4 py-3.5 border-b last:border-0 hover:bg-muted/20 transition-colors items-center text-sm">
            <div className="col-span-2 flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${r.c} shrink-0`} />
              <div>
                <div className="font-medium">{r.n}</div>
                <div className="text-xs text-muted-foreground">{r.f}</div>
              </div>
            </div>
            <span className="text-muted-foreground text-xs">{r.d}</span>
            <span className="font-medium">{r.t}</span>
            <span className="font-semibold">{r.a}</span>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full w-fit ${r.s === "Green" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : r.s === "Amber" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>{r.s}</span>
          </div>
        ))}
      </div>
      {/* AI Generation Panel */}
      <div className="rounded-xl border bg-violet-50 dark:bg-violet-900/15 border-violet-200 dark:border-violet-800 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-violet-800 dark:text-violet-200 mb-1">AI KPI Generator — GPT-4o</h3>
            <p className="text-sm text-violet-700 dark:text-violet-300 mb-4">Generates industry-specific KPIs with targets, thresholds, and formulas based on your company profile.</p>
            <div className="grid grid-cols-2 gap-2">
              {["Revenue Per Available Room (RevPAR)","Average Daily Rate (ADR)","Occupancy Rate","Net Promoter Score (NPS)","F&B Revenue per Cover","Employee Turnover Rate"].map((k, i) => (
                <div key={i} className="flex items-center gap-2 bg-white dark:bg-violet-900/30 rounded-lg border border-violet-200 dark:border-violet-700 p-2.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{k}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FullPortfolio() {
  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor and manage all company projects</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium cursor-pointer">+ New Project</div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { l: "Total Projects", v: "4", c: "border-l-primary", sub: "All time" },
          { l: "Active Projects", v: "3", c: "border-l-violet-500", sub: "Currently running" },
          { l: "At Risk", v: "0", c: "border-l-red-500", sub: "Need attention" },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl border border-l-4 ${s.c} bg-card p-4`}>
            <div className="text-xs text-muted-foreground mb-1 font-medium">{s.l}</div>
            <div className="text-3xl font-bold">{s.v}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { l: "Completed", v: "0", c: "border-l-emerald-500", sub: "Finished projects" },
          { l: "Overdue Tasks", v: "2", c: "border-l-red-500", sub: "Across all projects" },
          { l: "Upcoming Milestones", v: "6", c: "border-l-amber-500", sub: "Next 30 days" },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl border border-l-4 ${s.c} bg-card p-4`}>
            <div className="text-xs text-muted-foreground mb-1 font-medium">{s.l}</div>
            <div className="text-3xl font-bold">{s.v}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
          </div>
        ))}
      </div>
      {/* Project cards */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { n: "Loyalty Program Launch", h: "bg-emerald-500", hb: "border-t-emerald-500", p: 55, s: "In Progress", pri: "High", owner: "Noura Bin Rashid", bu: "Marketing", t: 5, done: 2, due: "Apr 30, 2026" },
          { n: "F&B Menu Overhaul", h: "bg-amber-500", hb: "border-t-amber-500", p: 40, s: "In Progress", pri: "High", owner: "Khalid Mansoor", bu: "F&B", t: 4, done: 1, due: "Mar 31, 2026" },
          { n: "Staff Retention Initiative", h: "bg-emerald-500", hb: "border-t-emerald-500", p: 30, s: "In Progress", pri: "Critical", owner: "Fatima Al Rashid", bu: "People & Culture", t: 4, done: 1, due: "Jun 30, 2026" },
          { n: "Q2 Revenue Recovery Plan", h: "bg-amber-500", hb: "border-t-amber-500", p: 0, s: "Not Started", pri: "Critical", owner: "Priya Sharma", bu: "Revenue", t: 4, done: 0, due: "Jun 30, 2026" },
        ].map((p, i) => (
          <div key={i} className={`rounded-xl border border-t-4 ${p.hb} bg-card p-5 cursor-pointer hover:shadow-md transition-shadow`}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-base leading-snug flex-1 pr-3">{p.n}</h3>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${p.s === "In Progress" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" : "bg-muted text-muted-foreground"}`}>{p.s}</span>
            </div>
            <div className="flex gap-2 mb-4">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.pri === "Critical" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}`}>{p.pri}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{p.bu}</span>
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-semibold">{p.p}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${p.h}`} style={{ width: `${p.p}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span>👤</span>{p.owner}</span>
              <span className="flex items-center gap-1.5"><span>✅</span>{p.done}/{p.t} tasks</span>
              <span className="flex items-center gap-1.5"><span>📅</span>Due {p.due}</span>
              <span className={`flex items-center gap-1.5 font-medium ${p.h === "bg-emerald-500" ? "text-emerald-600" : "text-amber-600"}`}><span>●</span>{p.h === "bg-emerald-500" ? "Green — On Track" : "Amber — At Risk"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FullWorkload() {
  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Workload</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor task distribution across your team</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[
          { l: "Team Members", v: "5", c: "text-primary" },
          { l: "Total Tasks", v: "17", c: "text-foreground" },
          { l: "Overdue Tasks", v: "2", c: "text-red-500" },
          { l: "Completion Rate", v: "41%", c: "text-emerald-600" },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 text-center">
            <div className={`text-2xl font-bold mb-1 ${s.c}`}>{s.v}</div>
            <div className="text-xs text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        {[{ c: "bg-emerald-500", l: "Done" }, { c: "bg-violet-500", l: "Active" }, { c: "bg-muted-foreground/25", l: "Queued" }, { c: "bg-red-500", l: "Overdue" }].map(lg => (
          <span key={lg.l} className="flex items-center gap-2"><span className={`w-3 h-3 rounded-sm inline-block ${lg.c}`} />{lg.l}</span>
        ))}
      </div>
      {/* Members */}
      {[
        { n: "Ravi Mehta", role: "Operations Lead", total: 7, done: 3, active: 2, queued: 1, over: 1,
          tasks: [
            { t: "Design loyalty app mockups", p: "Loyalty Program", s: "In Progress", d: "Mar 15", ov: false },
            { t: "Review vendor proposals", p: "F&B Overhaul", s: "Overdue", d: "Mar 8", ov: true },
            { t: "Staff interview schedule", p: "Retention", s: "Not Started", d: "Mar 20", ov: false },
          ]},
        { n: "Pooja Sharma", role: "HR Manager", total: 5, done: 4, active: 1, queued: 0, over: 0,
          tasks: [
            { t: "PMS integration testing", p: "Loyalty Program", s: "In Progress", d: "Apr 1", ov: false },
            { t: "Training documentation", p: "HR", s: "Completed", d: "Mar 12", ov: false },
          ]},
        { n: "Omar Khalil", role: "Sales Lead", total: 3, done: 0, active: 2, queued: 0, over: 1,
          tasks: [
            { t: "Email campaign content", p: "Loyalty Program", s: "In Progress", d: "Mar 20", ov: false },
            { t: "Launch loyalty campaign", p: "Marketing", s: "Overdue", d: "Feb 20", ov: true },
          ]},
        { n: "Fatima Al Rashid", role: "People & Culture", total: 2, done: 0, active: 2, queued: 0, over: 0,
          tasks: [
            { t: "Conduct staff retention interviews", p: "Retention", s: "In Progress", d: "Mar 18", ov: false },
            { t: "Retention bonus plan", p: "Retention", s: "In Progress", d: "Mar 20", ov: false },
          ]},
        { n: "Lisa Wong", role: "Financial Controller", total: 2, done: 0, active: 1, queued: 1, over: 0,
          tasks: [
            { t: "Update budget forecast for Q2", p: "Finance", s: "Not Started", d: "Mar 25", ov: false },
            { t: "GOP margin analysis", p: "Finance", s: "In Progress", d: "Mar 30", ov: false },
          ]},
      ].map((m, i) => (
        <div key={i} className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {m.n.split(" ").map(x => x[0]).join("")}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{m.n}</div>
                <div className="text-xs text-muted-foreground">{m.role}</div>
              </div>
              <div className="text-sm text-muted-foreground">{m.total} tasks</div>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              <div className="bg-emerald-500 rounded-l" style={{ width: `${(m.done / m.total) * 100}%` }} />
              <div className="bg-violet-500" style={{ width: `${(m.active / m.total) * 100}%` }} />
              {m.queued > 0 && <div className="bg-muted-foreground/25" style={{ width: `${(m.queued / m.total) * 100}%` }} />}
              {m.over > 0 && <div className="bg-red-500 rounded-r" style={{ width: `${(m.over / m.total) * 100}%` }} />}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="text-emerald-600 font-medium">{m.done} done</span>
              <span className="text-violet-600 font-medium">{m.active} active</span>
              {m.over > 0 && <span className="text-red-500 font-medium">{m.over} overdue</span>}
            </div>
          </div>
          <div className="border-t">
            {m.tasks.map((task, j) => (
              <div key={j} className={`flex items-center gap-3 px-4 py-2.5 border-b last:border-0 ${task.ov ? "bg-red-50 dark:bg-red-900/10" : ""}`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${task.s === "Completed" ? "bg-emerald-500" : task.s === "In Progress" ? "bg-violet-500" : task.ov ? "bg-red-500" : "bg-muted-foreground/40"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{task.t}</div>
                  <div className="text-xs text-muted-foreground">{task.p}</div>
                </div>
                <div className={`text-xs font-medium shrink-0 ${task.ov ? "text-red-500" : "text-muted-foreground"}`}>{task.ov ? "⚠ " : ""}{task.d}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FullActions() {
  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Action Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Track all meeting actions and accountability</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground bg-background">All Meeting Types ▾</div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground bg-background">All Departments ▾</div>
          <div className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium cursor-pointer">+ Add Action</div>
        </div>
      </div>
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { l: "Total Actions", v: "6", c: "text-foreground" },
          { l: "In Progress", v: "2", c: "text-violet-600" },
          { l: "Overdue", v: "1", c: "text-red-500" },
          { l: "Completed", v: "1", c: "text-emerald-600" },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 text-center">
            <div className={`text-2xl font-bold mb-1 ${s.c}`}>{s.v}</div>
            <div className="text-xs text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
      {/* Actions */}
      <div className="space-y-3">
        {[
          { t: "Implement new guest feedback system", desc: "Research and deploy digital guest feedback kiosks in lobby", o: "Sarah Johnson", m: "CEO Meeting", dept: "Operations", d: "Mar 15, 2026", rd: null, p: "High", s: "In Progress" },
          { t: "Launch loyalty program campaign", desc: "Design and launch email campaign for loyalty program members", o: "Omar Khalil", m: "PMO Steering Committee", dept: "Sales", d: "Feb 20, 2026", rd: null, p: "Medium", s: "Delayed" },
          { t: "Optimize housekeeping schedule", desc: "Redesign room cleaning schedules to reduce turnaround time", o: "David Park", m: "Department Review", dept: "Operations", d: "Mar 5, 2026", rd: null, p: "High", s: "Completed" },
          { t: "Conduct staff retention interviews", desc: "Interview departing employees to identify retention issues", o: "Fatima Al Rashid", m: "Department Review", dept: "HR", d: "Mar 10, 2026", rd: "Mar 18, 2026", p: "High", s: "In Progress" },
          { t: "Review F&B menu pricing", desc: "Analyze competitor pricing and adjust menu prices for Q2", o: "Michael Chen", m: "Finance Committee", dept: "Sales", d: "Mar 20, 2026", rd: "Mar 28, 2026", p: "Medium", s: "Not Started" },
          { t: "Update budget forecast for Q2", desc: "Revise financial projections based on February actuals", o: "Lisa Wong", m: "CEO Meeting", dept: "Finance", d: "Mar 25, 2026", rd: null, p: "Medium", s: "Not Started" },
        ].map((a, i) => (
          <div key={i} className={`rounded-xl border bg-card p-5 hover:border-primary/20 transition-colors ${a.s === "Delayed" ? "border-l-4 border-l-red-500" : a.s === "Completed" ? "border-l-4 border-l-emerald-500" : a.s === "In Progress" ? "border-l-4 border-l-violet-500" : ""}`}>
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="font-semibold text-base">{a.t}</h3>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap shrink-0 ${a.s === "Completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : a.s === "In Progress" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" : a.s === "Delayed" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-muted text-muted-foreground"}`}>{a.s}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{a.desc}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">👤 <span className="font-medium text-foreground">{a.o}</span></span>
                  <span className="flex items-center gap-1.5">🏢 {a.m}</span>
                  <span className="flex items-center gap-1.5">📁 {a.dept}</span>
                  <span className="flex items-center gap-1.5">📅 Due: <span className={a.s === "Delayed" ? "text-red-500 font-semibold" : ""}>{a.d}</span></span>
                  {a.rd && <span className="flex items-center gap-1.5">🔄 Revised: {a.rd}</span>}
                  <span className={`flex items-center gap-1.5 font-medium ${a.p === "High" ? "text-orange-600" : "text-muted-foreground"}`}>🔺 {a.p} Priority</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FullReviews() {
  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monthly Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered performance reviews based on your data</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-violet-600 text-white px-4 py-2 text-sm font-medium cursor-pointer">
          <Sparkles className="h-4 w-4 animate-pulse" /> Generate Review
        </div>
      </div>
      {/* Existing review */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h2 className="font-semibold text-base">February 2026 — Performance Review</h2>
              <div className="text-xs text-muted-foreground flex items-center gap-2"><span>AI Generated</span><span>·</span><span>March 10, 2026</span></div>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Executive Summary</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">February showed mixed results across departments. Revenue metrics exceeded targets with strong ADR and RevPAR performance, driven by corporate bookings. However, operational challenges in guest satisfaction and employee retention require immediate attention. The GOP margin fell slightly below target due to higher utility costs and marketing overspend.</p>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[
              { title: "Key Strengths", c: "border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/10", tc: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500",
                items: ["ADR at $192 vs $180 target — +6.7% above goal","RevPAR strong at $157 vs $153 target","Housekeeping optimisation completed ahead of schedule","Corporate bookings pipeline robust for Q2"] },
              { title: "Key Gaps", c: "border-l-red-500 bg-red-50 dark:bg-red-900/10", tc: "text-red-700 dark:text-red-400", dot: "bg-red-500",
                items: ["Guest complaint rate 3.2 vs 2.0 target — F&B related","Employee turnover 22% vs 18% target","Training completion 88% vs 90% target","Budget variance 7% vs 5% — marketing overspend"] },
              { title: "Recommendations", c: "border-l-amber-500 bg-amber-50 dark:bg-amber-900/10", tc: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500",
                items: ["Prioritise F&B quality training and complaint resolution","Implement retention bonuses approved by Finance","Review marketing spend allocation for Q2","Accelerate digital guest feedback system deployment"] },
            ].map((sec, i) => (
              <div key={i} className={`rounded-xl border-l-4 ${sec.c} p-4`}>
                <h4 className={`font-semibold text-sm mb-3 ${sec.tc}`}>{sec.title}</h4>
                <ul className="space-y-2">
                  {sec.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <div className={`w-1.5 h-1.5 rounded-full ${sec.dot} shrink-0 mt-1.5`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── FEATURE DEFS ─────────── */
type FeatureDef = {
  icon: React.ElementType; title: string; description: string;
  color: string; bg: string; activeKey: string;
  FullPage: () => JSX.Element;
  captions: string[];
};

const FEATURES: FeatureDef[] = [
  { icon: LineChart, title: "Live Dashboard", color: "text-primary", bg: "bg-primary/10", activeKey: "dashboard", description: "Welcome banner, KPI health donut, action progress, execution stats — all live.",
    FullPage: FullDashboard, captions: ["Welcome banner with live KPI summary and company overview","Six stat cards: Total KPIs, On Track, Total Actions, Overdue, Completed","KPI Health donut chart — Green, Amber, and Red breakdown","Execution overview — all active projects with live progress bars"] },
  { icon: Sparkles, title: "AI KPI Generator", color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/30", activeKey: "kpis", description: "Generate industry KPIs instantly with GPT-4o. Targets, thresholds, and formulas included.",
    FullPage: FullKpis, captions: ["Full KPI table with all 10 KPIs and live RAG status","Filter by department — Sales, Operations, HR, Finance","AI Generate: GPT-4o creates industry KPIs with targets and thresholds"] },
  { icon: Target, title: "KPI Management", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", activeKey: "kpis", description: "Track actuals vs targets with RAG status. Log actuals and status updates instantly.",
    FullPage: FullKpis, captions: ["Full KPI table — name, department, target, latest actual, status","Green = on target, Amber = at risk, Red = below target","Click any row to log an actual — status updates instantly","AI Generate panel creates new KPIs based on your industry"] },
  { icon: ListChecks, title: "Action Tracker", color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30", activeKey: "actions", description: "All meeting actions with owners, due dates, and status in one place.",
    FullPage: FullActions, captions: ["All 6 actions from every meeting in one scrollable view","Each action shows owner, meeting type, department, due date","Status colour bands: violet = In Progress, red = Delayed, green = Completed","Filter by meeting type — CEO, Finance, PMO, Department Review"] },
  { icon: FileText, title: "AI Monthly Reviews", color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/30", activeKey: "reviews", description: "GPT-4o reads your KPI data and writes a structured monthly performance report.",
    FullPage: FullReviews, captions: ["February 2026 AI-generated performance review","Executive summary based on real KPI actuals and meeting actions","Three-column layout: Strengths, Gaps, and Recommendations","Click Generate Review to create a new report for any month"] },
  { icon: LayoutTemplate, title: "Dashboard Planner", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", activeKey: "planner", description: "AI designs your ideal Power BI dashboard layout — charts, KPIs, and page structure.",
    FullPage: FullDashboard, captions: ["Describe your reporting goals and audience","GPT-4o recommends chart types and KPI placement","Output includes field names and Power BI-ready config","Layouts optimised for executives and operational teams"] },
  { icon: FolderOpen, title: "Project Portfolio", color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30", activeKey: "portfolio", description: "All projects with live health scores (Green/Amber/Red), filters, and progress bars.",
    FullPage: FullPortfolio, captions: ["Six stat tiles: Total, Active, Completed, At Risk, Overdue Tasks, Milestones","All 4 projects shown as cards with health colour and priority badges","Progress bars update in real time as tasks are completed","Health scoring: Green = on track, Amber = at risk, Red = blocked"] },
  { icon: LayoutGrid, title: "Project Management", color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-900/30", activeKey: "portfolio", description: "Task boards, priority colour borders, milestone calendar inside each project.",
    FullPage: FullPortfolio, captions: ["Click into any project for full task and milestone details","Task board with colour-coded priority borders (red=Critical, orange=High)","Milestone calendar shows all upcoming checkpoints by month","Progress and health scores update automatically as tasks change"] },
  { icon: Users, title: "Team Workload", color: "text-cyan-600", bg: "bg-cyan-100 dark:bg-cyan-900/30", activeKey: "workload", description: "Stacked bar per person — Done, Active, Queued, Overdue — identify overload instantly.",
    FullPage: FullWorkload, captions: ["Team summary: 5 members, 17 tasks, 2 overdue, 41% completion","Stacked bar per person — Green=Done, Violet=Active, Red=Overdue","Expand any row to see all individual tasks with due dates","Overdue tasks highlighted in red — spot bottlenecks instantly"] },
  { icon: Search, title: "Global Search", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", activeKey: "dashboard", description: "Search all projects, tasks, KPIs, meetings, and actions from one bar.",
    FullPage: FullDashboard, captions: ["Click the Search bar or press Ctrl+K from anywhere","Search projects, tasks, KPIs, meetings, and actions simultaneously","Results grouped by type — easy to scan and navigate","Click any result to jump directly to that item in the app"] },
  { icon: Building2, title: "Meeting Management", color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30", activeKey: "meetings", description: "Log meetings and link action items with owners for full accountability.",
    FullPage: FullActions, captions: ["Card-based meeting log: CEO, Finance, PMO, Department Reviews","Each meeting shows date, attendees, and number of actions raised","All action items are linked back to their source meeting","Log a meeting → add actions → track owners and due dates"] },
  { icon: Shield, title: "Role-Based Access", color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800/50", activeKey: "settings", description: "Admin and Executive roles — full control vs clean read-only.",
    FullPage: FullDashboard, captions: ["Admin role: full access — create KPIs, manage projects, run meetings","Executive role: clean read-only views — same data, no edit controls","Settings → Users: invite team and assign roles instantly","Try exec@performo.ai / exec123 to see the executive view"] },
];

/* ─────────── VIDEO-STYLE DEMO PLAYER ─────────── */
const CAPTION_INTERVAL = 4500;

function DemoPlayer({ feature, onClose }: { feature: FeatureDef; onClose: () => void }) {
  const { FullPage, captions, activeKey } = feature;
  const [playing, setPlaying] = useState(true);
  const [captionIdx, setCaptionIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);

  const totalDuration = captions.length * CAPTION_INTERVAL;

  /* Smooth progress ticker */
  const tick = useCallback((ts: number) => {
    if (lastTs.current === null) lastTs.current = ts;
    const delta = ts - lastTs.current;
    lastTs.current = ts;
    progressRef.current = Math.min(progressRef.current + (delta / totalDuration) * 100, 100);
    setProgress(progressRef.current);
    const newCaption = Math.min(Math.floor((progressRef.current / 100) * captions.length), captions.length - 1);
    setCaptionIdx(newCaption);

    /* Auto-scroll content area */
    if (contentRef.current) {
      const el = contentRef.current;
      const maxScroll = el.scrollHeight - el.clientHeight;
      el.scrollTop = (progressRef.current / 100) * maxScroll;
    }

    if (progressRef.current < 100) rafRef.current = requestAnimationFrame(tick);
  }, [captions.length, totalDuration]);

  useEffect(() => {
    if (playing) {
      lastTs.current = null;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, tick]);

  const restart = () => { progressRef.current = 0; setProgress(0); setCaptionIdx(0); lastTs.current = null; setPlaying(true); };

  const seekTo = (pct: number) => {
    progressRef.current = pct;
    setProgress(pct);
    const newCaption = Math.min(Math.floor((pct / 100) * captions.length), captions.length - 1);
    setCaptionIdx(newCaption);
    if (contentRef.current) {
      const el = contentRef.current;
      const maxScroll = el.scrollHeight - el.clientHeight;
      el.scrollTop = (pct / 100) * maxScroll;
    }
  };

  const finished = progress >= 99.9;

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      {/* Video frame */}
      <div className="relative flex-1 min-h-0 bg-[#0f0f0f] overflow-hidden">
        {/* App chrome inside video */}
        <div className="absolute inset-3 rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-background flex">
          {/* Sidebar */}
          <div className="w-52 bg-sidebar border-r border-sidebar-border flex flex-col py-4 shrink-0">
            <div className="flex items-center gap-2.5 px-4 pb-4 border-b border-sidebar-border mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <BarChart3 className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <div className="text-sm font-bold leading-tight">Performo AI</div>
                <div className="text-[10px] text-muted-foreground">Performance Management</div>
              </div>
            </div>
            <div className="px-3 space-y-0.5 flex-1">
              {NAV.map(item => (
                <div key={item.key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeKey === item.key ? "bg-primary text-primary-foreground shadow-sm" : "text-sidebar-foreground/60 hover:bg-sidebar-accent"}`}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="px-4 pt-3 border-t border-sidebar-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">DS</div>
                <div>
                  <div className="text-xs font-semibold">Dharmesh Sheth</div>
                  <div className="text-[10px] text-muted-foreground">Admin</div>
                </div>
              </div>
            </div>
          </div>
          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur shrink-0">
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold text-muted-foreground">OYO Hospitality</div>
                <span className="text-muted-foreground/40">·</span>
                <div className="text-xs text-muted-foreground">Hospitality</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 text-sm text-muted-foreground border cursor-pointer">
                  <Search className="h-3.5 w-3.5" /> Search... <span className="text-xs bg-border rounded px-1.5 py-0.5">⌘K</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary cursor-pointer">DS</div>
              </div>
            </div>
            {/* Page content */}
            <div ref={contentRef} className="flex-1 overflow-hidden p-6" style={{ scrollBehavior: "auto" }}>
              <FullPage />
            </div>
          </div>
        </div>

        {/* Modal header controls (top overlay) */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2.5 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${feature.bg} shrink-0`}>
              <feature.icon className={`h-4 w-4 ${feature.color}`} />
            </div>
            <div>
              <div className="text-white text-sm font-semibold leading-tight">{feature.title}</div>
              <div className="text-white/60 text-xs">OYO Hospitality · live demo</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Caption overlay at bottom of video */}
        <div className="absolute bottom-0 left-3 right-3 pb-3">
          <div className="bg-black/75 backdrop-blur-sm text-white text-sm px-4 py-2.5 rounded-lg leading-snug">
            {captions[captionIdx]}
          </div>
        </div>
      </div>

      {/* ── YouTube-style controls bar ── */}
      <div className="bg-[#181818] px-4 pt-2 pb-3 shrink-0">
        {/* Progress / scrubber */}
        <div
          className="relative h-1 bg-white/20 rounded-full cursor-pointer group mb-3 hover:h-2 transition-all"
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekTo(((e.clientX - rect.left) / rect.width) * 100);
          }}
        >
          <div className="h-full rounded-full bg-red-500 relative" style={{ width: `${progress}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2" />
          </div>
        </div>

        {/* Buttons row */}
        <div className="flex items-center gap-3">
          {/* Skip back */}
          <button onClick={restart} className="text-white/70 hover:text-white transition-colors" title="Restart">
            <SkipBack className="h-5 w-5" />
          </button>
          {/* Play/Pause */}
          <button
            onClick={() => { if (finished) restart(); else setPlaying(!playing); }}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform shrink-0"
          >
            {!playing || finished
              ? <Play className="h-4 w-4 text-black ml-0.5" fill="black" />
              : <Pause className="h-4 w-4 text-black" fill="black" />}
          </button>
          {/* Muted icon (decorative) */}
          <Volume2 className="h-5 w-5 text-white/40" />
          {/* Time */}
          <span className="text-white/70 text-xs tabular-nums">
            {Math.floor((progress / 100) * totalDuration / 1000)}s / {Math.floor(totalDuration / 1000)}s
          </span>
          {/* Caption dots */}
          <div className="flex gap-1 flex-1 justify-center">
            {captions.map((_, i) => (
              <button
                key={i}
                onClick={() => seekTo((i / captions.length) * 100)}
                className={`rounded-full transition-all h-1.5 ${i === captionIdx ? "w-5 bg-white" : "w-1.5 bg-white/30 hover:bg-white/60"}`}
              />
            ))}
          </div>
          {/* Fullscreen icon (decorative) */}
          <Maximize2 className="h-4 w-4 text-white/50 ml-auto" />
        </div>
      </div>
    </div>
  );
}

/* ─────────── FEATURE CARD ─────────── */
function FeatureCard({ feature, index }: { feature: FeatureDef; index: number }) {
  const [open, setOpen] = useState(false);
  const { FullPage, activeKey } = feature;

  return (
    <>
      <Card className="group cursor-pointer hover:shadow-lg transition-all hover:border-primary/30 overflow-hidden flex flex-col" data-testid={`card-feature-video-${index}`} onClick={() => setOpen(true)}>
        {/* Thumbnail */}
        <div className="relative overflow-hidden flex-shrink-0 bg-[#0f0f0f]" style={{ aspectRatio: "16/9" }}>
          <div className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ transform: "scale(0.38)", transformOrigin: "top left", width: "263%", height: "263%" }}>
            <div className="w-full h-full flex bg-background">
              {/* Mini sidebar */}
              <div className="w-48 bg-sidebar border-r border-sidebar-border flex flex-col py-3 shrink-0">
                <div className="flex items-center gap-2 px-3 pb-3 border-b border-sidebar-border mb-2">
                  <div className="w-6 h-6 rounded bg-primary flex items-center justify-center"><BarChart3 className="h-3 w-3 text-primary-foreground" /></div>
                  <span className="text-[9px] font-bold">Performo AI</span>
                </div>
                <div className="px-2 space-y-0.5">
                  {NAV.map(item => (
                    <div key={item.key} className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[8px] font-medium ${activeKey === item.key ? "bg-primary text-primary-foreground" : "text-sidebar-foreground/40"}`}>
                      <item.icon className="h-3 w-3 shrink-0" /><span className="truncate">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Mini content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-background/95">
                  <span className="text-[9px] font-medium text-muted-foreground">OYO Hospitality</span>
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-[8px] font-bold text-primary flex items-center justify-center">DS</div>
                </div>
                <div className="flex-1 p-4 overflow-hidden"><FullPage /></div>
              </div>
            </div>
          </div>
          {/* Tinted overlay + play button */}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-black/60 border-2 border-white/80 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              <Play className="h-6 w-6 text-white ml-1" fill="white" />
            </div>
          </div>
          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
            {Math.floor((feature.captions.length * CAPTION_INTERVAL) / 1000)}s
          </div>
        </div>
        {/* Card body */}
        <CardContent className="p-4 flex-1">
          <div className="flex items-start gap-3">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${feature.bg} shrink-0 mt-0.5`}>
              <feature.icon className={`h-3.5 w-3.5 ${feature.color}`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden border-0 bg-black" style={{ height: "90vh" }}>
          <DialogTitle className="sr-only">{feature.title} Demo</DialogTitle>
          <DemoPlayer feature={feature} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─────────── AUTH DIALOG ─────────── */
function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
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
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">{loading ? "Please wait…" : isLogin ? "Sign In" : "Create Account"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
        </form>
        <div className="text-center mt-2"><Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setIsLogin(!isLogin)} data-testid="button-toggle-auth">{isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}</Button></div>
        {isLogin && <div className="text-center space-y-1 pb-2"><p className="text-xs text-muted-foreground">Admin: demo@performo.ai / demo123</p><p className="text-xs text-muted-foreground">Executive: exec@performo.ai / exec123</p></div>}
      </DialogContent>
    </Dialog>
  );
}

/* ─────────── LANDING PAGE ─────────── */
export default function AuthPage() {
  const [authOpen, setAuthOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm"><BarChart3 className="h-[18px] w-[18px] text-primary-foreground" /></div>
            <span className="text-lg font-bold tracking-tight" data-testid="text-landing-logo">Performo AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Live Demos","Features","How It Works","Why Performo"].map(l => <a key={l} href={`#${l.toLowerCase().replace(/ /g,"-")}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a>)}
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
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-xs font-medium"><Sparkles className="h-3 w-3 mr-1.5" /> Powered by GPT-4o</Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6" data-testid="text-hero-title">Performance &amp; Execution<span className="block text-primary">Management for SMEs</span></h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed" data-testid="text-hero-subtitle">AI-powered KPIs, project tracking, workload visibility, and monthly reviews — all in one platform.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 h-12 shadow-md" onClick={() => setAuthOpen(true)} data-testid="button-hero-get-started">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12" onClick={() => document.getElementById("live-demos")?.scrollIntoView({ behavior: "smooth" })} data-testid="button-hero-watch-demos"><Play className="h-4 w-4 mr-2" fill="currentColor" /> Watch Demos</Button>
            </div>
          </div>
          {/* Hero mockup */}
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="rounded-2xl border bg-card/80 shadow-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400/70"/><div className="w-3 h-3 rounded-full bg-yellow-400/70"/><div className="w-3 h-3 rounded-full bg-green-400/70"/></div>
                <span className="text-xs text-muted-foreground ml-2">Performo AI — OYO Hospitality</span>
              </div>
              <div className="p-6 md:p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[{label:"Total KPIs",value:"10",change:"+2 need attention",color:"text-primary"},{label:"On Track",value:"2",change:"20% of total",color:"text-emerald-600"},{label:"Active Projects",value:"3",change:"4 projects total",color:"text-violet-600"},{label:"Actions Due",value:"6",change:"1 overdue",color:"text-amber-600"}].map((stat,i)=>(<div key={i} className="rounded-xl border bg-background p-4"><p className="text-xs text-muted-foreground mb-1">{stat.label}</p><p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p><p className="text-[11px] text-muted-foreground mt-1">{stat.change}</p></div>))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 rounded-xl border bg-background p-4"><p className="text-xs font-medium mb-3">KPI Performance Trend</p><div className="flex items-end gap-1 h-24">{[40,55,45,65,60,75,70,85,80,90,85,92].map((h,i)=>(<div key={i} className="flex-1 rounded-t" style={{height:`${h}%`,background:h>=70?"hsl(var(--primary))":"hsl(var(--muted))"}}/>))}</div><div className="flex justify-between mt-2"><span className="text-[10px] text-muted-foreground">Jan</span><span className="text-[10px] text-muted-foreground">Dec</span></div></div>
                  <div className="rounded-xl border bg-background p-4"><p className="text-xs font-medium mb-3">Project Health</p><div className="space-y-2.5">{[{label:"Loyalty Launch",dot:"bg-emerald-500",pct:55},{label:"Menu Overhaul",dot:"bg-amber-500",pct:40},{label:"Staff Retention",dot:"bg-emerald-500",pct:30}].map((item,i)=>(<div key={i}><div className="flex items-center gap-2 text-[11px] mb-1"><div className={`w-2 h-2 rounded-full ${item.dot}`}/><span className="text-muted-foreground flex-1 truncate">{item.label}</span><span className="font-medium">{item.pct}%</span></div><div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary/60" style={{width:`${item.pct}%`}}/></div></div>))}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[{value:"12",label:"Core Features",sub:"Performance + Execution"},{value:"GPT-4o",label:"AI Engine",sub:"Latest OpenAI model"},{value:"2",label:"User Roles",sub:"Admin & Executive"},{value:"100%",label:"Data Privacy",sub:"Your data, your platform"}].map((s,i)=>(<div key={i} className="text-center"><p className="text-3xl md:text-4xl font-bold text-primary mb-1">{s.value}</p><p className="text-sm font-medium">{s.label}</p><p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p></div>))}
          </div>
        </div>
      </section>

      {/* DEMO VIDEOS */}
      <section id="live-demos" className="py-20 md:py-28 bg-muted/20 border-y">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs"><Play className="h-3 w-3 mr-1.5" fill="currentColor" /> Feature Demo Videos</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-demos-title">Watch every feature <span className="text-primary">in action</span></h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Click any card to watch a guided video demo — full app UI, real OYO Hospitality data, auto-plays with scrubber and captions.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => <FeatureCard key={i} feature={f} index={i} />)}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-features-title">Everything you need to <span className="text-primary">manage performance &amp; execution</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[{heading:"Performance Management",items:FEATURES.slice(0,6)},{heading:"Execution Management",items:FEATURES.slice(6,12)}].map(({heading,items})=>(<div key={heading}><div className="flex items-center gap-2 mb-6"><div className="h-px flex-1 bg-border"/><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{heading}</span><div className="h-px flex-1 bg-border"/></div><div className="space-y-3">{items.map((f,i)=>(<div key={i} className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:border-primary/20 transition-colors"><div className={`flex h-9 w-9 items-center justify-center rounded-lg ${f.bg} shrink-0`}><f.icon className={`h-4 w-4 ${f.color}`}/></div><div><h3 className="text-sm font-semibold mb-1">{f.title}</h3><p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p></div></div>))}</div></div>))}
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
            {[{step:"01",title:"Set Up Profile",desc:"Enter company, industry, and departments."},{step:"02",title:"Generate KPIs",desc:"GPT-4o creates industry KPIs with targets."},{step:"03",title:"Run Meetings",desc:"Log actions with owners and due dates."},{step:"04",title:"Track Projects",desc:"Create projects, tasks, and milestones."},{step:"05",title:"Get AI Reviews",desc:"Monthly AI reviews from real data."}].map((s,i)=>(<div key={i} className="relative text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold mx-auto mb-4 shadow-md">{s.step}</div>{i<4&&<div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-border"/>}<h3 className="text-sm font-semibold mb-2">{s.title}</h3><p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p></div>))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section id="why-performo" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">Why Performo</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-why-title">Built for growing businesses</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[{icon:Zap,title:"No BI Tool Required",desc:"Executive-level insights without Power BI or data analysts.",color:"text-amber-600",bg:"bg-amber-100 dark:bg-amber-900/30"},{icon:Shield,title:"Industry-Specific AI",desc:"AI tuned for hospitality, retail, healthcare, F&B, and more.",color:"text-indigo-600",bg:"bg-indigo-100 dark:bg-indigo-900/30"},{icon:TrendingUp,title:"Performance + Execution",desc:"The only platform connecting KPI tracking with project execution.",color:"text-emerald-600",bg:"bg-emerald-100 dark:bg-emerald-900/30"},{icon:Activity,title:"Live Health Scoring",desc:"Automated RAG scoring for KPIs and projects — always know what needs attention.",color:"text-red-600",bg:"bg-red-100 dark:bg-red-900/30"},{icon:Users,title:"Team Accountability",desc:"Every action has an owner. Every project has milestones.",color:"text-violet-600",bg:"bg-violet-100 dark:bg-violet-900/30"},{icon:CheckCircle2,title:"Meeting-to-Action Bridge",desc:"Turn every meeting into accountable actions tracked to completion.",color:"text-teal-600",bg:"bg-teal-100 dark:bg-teal-900/30"}].map((item,i)=>(<div key={i} className="flex flex-col items-start p-6 rounded-2xl border bg-card hover:border-primary/20 transition-colors"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.bg} mb-4`}><item.icon className={`h-5 w-5 ${item.color}`}/></div><h3 className="text-sm font-semibold mb-2">{item.title}</h3><p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p></div>))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-cta-title">Ready to transform your performance management?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">Join SMEs using Performo AI to track KPIs, manage projects, and get AI-powered insights.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" className="text-base px-8 h-12 shadow-md" onClick={() => setAuthOpen(true)} data-testid="button-cta-start">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Button>
            <p className="text-sm opacity-70">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary"><BarChart3 className="h-4 w-4 text-primary-foreground" /></div><span className="text-sm font-semibold">Performo AI</span></div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">{["Live Demos","Features","How It Works","Why Performo"].map(l=>(<a key={l} href="#" className="hover:text-foreground transition-colors">{l}</a>))}</div>
          <p className="text-xs text-muted-foreground">AI-powered performance management for SMEs</p>
        </div>
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
