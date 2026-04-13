import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
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
  Shield, Zap, CheckCircle2, Building2, LineChart, FolderOpen,
  Users, LayoutGrid, Play, Pause, Search, Activity, X, Target, ListChecks,
  Settings, Home, Star, Volume2, Maximize2, SkipBack, Plus, Filter,
  ChevronRight, AlertTriangle, Clock, RefreshCw,
} from "lucide-react";

/* ─────────── SIDEBAR NAV ─────────── */
const NAV_ITEMS = [
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

/* ─────────── SHARED MINI CHROME WRAPPER ─────────── */
function AppChrome({ activeKey, children, searchText }: {
  activeKey: string;
  children: React.ReactNode;
  searchText?: string;
}) {
  return (
    <div className="w-full h-full flex bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-52 bg-sidebar border-r border-sidebar-border flex flex-col py-4 shrink-0">
        <div className="flex items-center gap-2.5 px-4 pb-4 border-b border-sidebar-border mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <BarChart3 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">GHC Beacon</div>
            <div className="text-[10px] text-muted-foreground">Analytics Platform</div>
          </div>
        </div>
        <div className="px-3 space-y-0.5 flex-1">
          {NAV_ITEMS.map(item => (
            <div key={item.key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeKey === item.key ? "bg-primary text-primary-foreground shadow-sm" : "text-sidebar-foreground/60"}`}>
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
      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur shrink-0">
          <span className="text-sm font-semibold text-muted-foreground">OYO Hospitality</span>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm border cursor-pointer transition-colors ${searchText ? "bg-primary/10 border-primary text-primary font-medium" : "bg-muted/50 text-muted-foreground"}`}>
              <Search className="h-3.5 w-3.5" /> {searchText || "Search… "}<span className="text-xs bg-border rounded px-1.5 py-0.5 ml-1">⌘K</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">DS</div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─────────── CALLOUT ANNOTATION ─────────── */
function Callout({ text, sub, x, y, arrow = "down", color = "primary" }: {
  text: string; sub?: string; x: string; y: string;
  arrow?: "up" | "down" | "left" | "right"; color?: "primary" | "violet" | "emerald" | "red" | "amber";
}) {
  const palette: Record<string, string> = {
    primary: "bg-primary text-primary-foreground border-primary/20",
    violet: "bg-violet-600 text-white border-violet-500/20",
    emerald: "bg-emerald-600 text-white border-emerald-500/20",
    red: "bg-red-600 text-white border-red-500/20",
    amber: "bg-amber-500 text-white border-amber-400/20",
  };
  const arrowCls: Record<string, string> = {
    down: "bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-[8px] border-l-[7px] border-r-[7px] border-l-transparent border-r-transparent",
    up: "top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-[8px] border-l-[7px] border-r-[7px] border-l-transparent border-r-transparent",
    left: "left-0 top-1/2 -translate-y-1/2 -translate-x-full border-r-[8px] border-t-[7px] border-b-[7px] border-t-transparent border-b-transparent",
    right: "right-0 top-1/2 -translate-y-1/2 translate-x-full border-l-[8px] border-t-[7px] border-b-[7px] border-t-transparent border-b-transparent",
  };
  const arrowColor: Record<string, string> = {
    primary: "border-t-primary border-b-primary border-r-primary border-l-primary",
    violet: "border-t-violet-600 border-b-violet-600 border-r-violet-600 border-l-violet-600",
    emerald: "border-t-emerald-600 border-b-emerald-600 border-r-emerald-600 border-l-emerald-600",
    red: "border-t-red-600 border-b-red-600 border-r-red-600 border-l-red-600",
    amber: "border-t-amber-500 border-b-amber-500 border-r-amber-500 border-l-amber-500",
  };
  return (
    <div className="absolute z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-300" style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}>
      <div className={`relative px-3.5 py-2.5 rounded-xl shadow-xl border max-w-[220px] ${palette[color]}`}>
        <div className={`absolute w-0 h-0 ${arrowCls[arrow]} ${arrowColor[color]}`} />
        <p className="text-xs font-bold leading-tight">{text}</p>
        {sub && <p className="text-[10px] mt-0.5 opacity-80 leading-snug">{sub}</p>}
      </div>
    </div>
  );
}

/* ─────────── HIGHLIGHT RING ─────────── */
function Ring({ x, y, w, h, color = "primary" }: { x: string; y: string; w: string; h: string; color?: string }) {
  const c = color === "violet" ? "border-violet-500" : color === "emerald" ? "border-emerald-500" : color === "red" ? "border-red-500" : color === "amber" ? "border-amber-400" : "border-primary";
  return (
    <div className={`absolute z-20 pointer-events-none rounded-xl border-2 ${c} animate-pulse shadow-lg`}
      style={{ left: x, top: y, width: w, height: h, boxShadow: `0 0 0 4px ${color === "violet" ? "rgba(124,58,237,0.15)" : color === "emerald" ? "rgba(16,185,129,0.15)" : color === "red" ? "rgba(239,68,68,0.15)" : "rgba(var(--primary),0.15)"}` }} />
  );
}

/* ───────────────────────────────────────────────────────────────
   SCENE DEFINITIONS
   Each scene = { node, callout?, ring? }
──────────────────────────────────────────────────────────────── */

/* — DASHBOARD SCENES — */
const dashboardScenes = [
  // Scene 0: Welcome + stat overview
  {
    node: (
      <AppChrome activeKey="dashboard">
        <div className="space-y-4">
          <div className="rounded-2xl border bg-gradient-to-br from-primary/8 to-primary/12 p-5">
            <h1 className="text-xl font-bold mb-1">Welcome back, Dharmesh Sheth</h1>
            <div className="flex gap-3 text-sm mt-2 flex-wrap">
              <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 px-3 py-1 rounded-full font-medium">● 2 KPIs on track</span>
              <span className="bg-red-50 dark:bg-red-900/20 text-red-500 px-3 py-1 rounded-full font-medium">● 1 action overdue</span>
              <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full">● 4 projects active</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[{ l:"Total KPIs", v:"10", c:"text-primary", ic:"🎯" }, { l:"On Track", v:"2", c:"text-emerald-600", ic:"✅" }, { l:"Below Target", v:"0", c:"text-muted-foreground", ic:"📉" }].map((s,i)=>(
              <div key={i} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{s.l}</span><span>{s.ic}</span></div>
                <div className={`text-3xl font-bold ${s.c}`}>{s.v}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[{ l:"Total Actions", v:"6", c:"text-foreground", ic:"📋" }, { l:"Overdue", v:"1", c:"text-red-500", ic:"⚠️" }, { l:"Completed", v:"1", c:"text-emerald-600", ic:"🏆" }].map((s,i)=>(
              <div key={i} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{s.l}</span><span>{s.ic}</span></div>
                <div className={`text-3xl font-bold ${s.c}`}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "Live Executive Dashboard", sub: "KPIs, actions & projects — one screen", x: "72%", y: "18%", arrow: "down" as const, color: "primary" as const },
    ring: { x: "56%", y: "28%", w: "38%", h: "42%" },
  },
  // Scene 1: KPI health donut
  {
    node: (
      <AppChrome activeKey="dashboard">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">KPI Health Overview</h2>
          <div className="rounded-xl border bg-card p-6 flex items-center gap-8">
            <div className="relative w-44 h-44 shrink-0">
              <svg viewBox="0 0 36 36" className="w-44 h-44 -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--muted))" strokeWidth="4"/>
                <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="17 88" strokeLinecap="round"/>
                <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="35 88" strokeDashoffset="-17" strokeLinecap="round"/>
                <circle cx="18" cy="18" r="14" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="36 88" strokeDashoffset="-52" strokeLinecap="round"/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold">10</div><div className="text-xs text-muted-foreground">Total KPIs</div>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              {[{ l:"On Track (Green)", v:2, c:"bg-emerald-500", tc:"text-emerald-700 dark:text-emerald-400", pct:"20%" }, { l:"At Risk (Amber)", v:4, c:"bg-amber-500", tc:"text-amber-700 dark:text-amber-400", pct:"40%" }, { l:"Below Target (Red)", v:4, c:"bg-red-500", tc:"text-red-700 dark:text-red-400", pct:"40%" }].map((r,i)=>(
                <div key={i} className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${r.c} shrink-0`} />
                  <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden"><div className={`h-full rounded-full ${r.c}`} style={{ width: r.pct }} /></div>
                  <span className="text-base font-bold w-4">{r.v}</span>
                  <span className={`text-sm ${r.tc} w-44`}>{r.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "Instant KPI Health Score", sub: "Green / Amber / Red — always know your status", x: "68%", y: "22%", arrow: "left" as const, color: "emerald" as const },
    ring: { x: "56%", y: "32%", w: "38%", h: "36%" },
  },
  // Scene 2: Project execution tiles
  {
    node: (
      <AppChrome activeKey="dashboard">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Execution Overview</h2>
            <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full">4 active projects</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { n:"Loyalty Program Launch", hb:"border-l-emerald-500", h:"bg-emerald-500", p:55, s:"In Progress", owner:"Noura Bin Rashid", due:"Apr 30" },
              { n:"F&B Menu Overhaul", hb:"border-l-amber-500", h:"bg-amber-500", p:40, s:"In Progress", owner:"Khalid Mansoor", due:"Mar 31" },
              { n:"Staff Retention Initiative", hb:"border-l-emerald-500", h:"bg-emerald-500", p:30, s:"In Progress", owner:"Fatima Al Rashid", due:"Jun 30" },
              { n:"Q2 Revenue Recovery Plan", hb:"border-l-amber-500", h:"bg-amber-500", p:0, s:"Not Started", owner:"Priya Sharma", due:"Jun 30" },
            ].map((p,i)=>(
              <div key={i} className={`rounded-xl border border-l-4 ${p.hb} bg-card p-4`}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm flex-1 pr-2">{p.n}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${p.s === "In Progress" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" : "bg-muted text-muted-foreground"}`}>{p.s}</span>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Progress</span><span className="font-semibold">{p.p}%</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${p.h}`} style={{ width: `${p.p}%` }} /></div>
                </div>
                <div className="text-xs text-muted-foreground flex gap-3"><span>👤 {p.owner}</span><span>📅 {p.due}</span></div>
              </div>
            ))}
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "All Projects in One View", sub: "Live progress bars with RAG health borders", x: "26%", y: "16%", arrow: "down" as const, color: "primary" as const },
    ring: { x: "2%", y: "28%", w: "94%", h: "62%" },
  },
];

/* — AI KPI GENERATOR SCENES — */
const kpiAiScenes = [
  // Scene 0: KPI table overview
  {
    node: (
      <AppChrome activeKey="kpis">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">KPI Management</h1>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground">All Departments ▾</div>
              <div className="flex items-center gap-2 rounded-lg bg-violet-600 text-white px-4 py-2 text-sm font-semibold cursor-pointer ring-4 ring-violet-300/50">
                <Sparkles className="h-4 w-4 animate-pulse" /> AI Generate KPIs
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium">+ Add KPI</div>
            </div>
          </div>
          <div className="rounded-xl border overflow-hidden">
            <div className="grid grid-cols-5 bg-muted/50 px-4 py-3 text-xs font-semibold text-muted-foreground border-b">
              <span className="col-span-2">KPI Name</span><span>Target</span><span>Actual</span><span>Status</span>
            </div>
            {[
              { n:"Occupancy Rate", t:"85%", a:"78%", s:"Amber", c:"bg-amber-500" },
              { n:"Average Daily Rate (ADR)", t:"$180", a:"$192", s:"Green", c:"bg-emerald-500" },
              { n:"RevPAR", t:"$153", a:"$157", s:"Green", c:"bg-emerald-500" },
              { n:"Guest Complaint Rate", t:"≤2/100", a:"3.2/100", s:"Red", c:"bg-red-500" },
              { n:"Employee Turnover Rate", t:"18%", a:"22%", s:"Red", c:"bg-red-500" },
            ].map((r,i)=>(
              <div key={i} className="grid grid-cols-5 px-4 py-3 border-b last:border-0 items-center text-sm">
                <div className="col-span-2 flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded-full ${r.c} shrink-0`} /><span className="font-medium">{r.n}</span></div>
                <span>{r.t}</span><span className="font-semibold">{r.a}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${r.s === "Green" ? "bg-emerald-100 text-emerald-700" : r.s === "Amber" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{r.s}</span>
              </div>
            ))}
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "AI Generate KPIs button", sub: "Click to let GPT-4o create your KPI library", x: "73%", y: "14%", arrow: "down" as const, color: "violet" as const },
    ring: { x: "56%", y: "7%", w: "28%", h: "12%" },
  },
  // Scene 1: AI generating (spinner state)
  {
    node: (
      <AppChrome activeKey="kpis">
        <div className="space-y-4">
          <h1 className="text-xl font-bold">KPI Management</h1>
          <div className="rounded-xl border bg-violet-50 dark:bg-violet-900/15 border-violet-200 dark:border-violet-700 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center shrink-0 shadow-lg">
                <Sparkles className="h-6 w-6 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-violet-800 dark:text-violet-200 text-lg">GPT-4o is generating your KPIs…</h3>
                <p className="text-sm text-violet-600 dark:text-violet-400">Analysing Hospitality industry · UAE · OYO</p>
              </div>
            </div>
            <div className="space-y-2">
              {["Analysing industry benchmarks for Hospitality…", "Applying UAE market context…", "Creating targets and green/amber/red thresholds…", "Generating 6 KPIs with formulas and data sources…"].map((step, i) => (
                <div key={i} className="flex items-center gap-3 bg-white dark:bg-violet-900/30 rounded-lg p-3 border border-violet-100 dark:border-violet-700">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${i < 3 ? "bg-emerald-500" : "bg-violet-200 dark:bg-violet-700"}`}>
                    {i < 3 ? <CheckCircle2 className="h-3 w-3 text-white" /> : <RefreshCw className="h-3 w-3 text-violet-500 animate-spin" />}
                  </div>
                  <span className={`text-sm ${i < 3 ? "text-muted-foreground line-through" : "text-violet-700 dark:text-violet-300 font-medium"}`}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "GPT-4o is working", sub: "Industry + country context used for precision", x: "72%", y: "35%", arrow: "left" as const, color: "violet" as const },
    ring: { x: "4%", y: "22%", w: "88%", h: "60%" },
  },
  // Scene 2: AI results
  {
    node: (
      <AppChrome activeKey="kpis">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">KPI Management</h1>
            <span className="text-sm text-emerald-600 font-semibold flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> 6 KPIs generated</span>
          </div>
          <div className="rounded-xl border bg-violet-50 dark:bg-violet-900/15 border-violet-200 p-5">
            <div className="text-sm font-semibold text-violet-700 dark:text-violet-300 mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI-Generated KPIs — ready to add</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { n:"RevPAR", t:"≥ $153", d:"Revenue per available room" },
                { n:"Occupancy Rate", t:"≥ 85%", d:"Rooms sold vs available" },
                { n:"ADR", t:"≥ $180", d:"Avg daily rate per room" },
                { n:"Guest NPS", t:"≥ 70", d:"Net promoter score" },
                { n:"Employee Turnover", t:"≤ 18%", d:"Staff retention rate" },
                { n:"F&B Revenue / Cover", t:"≥ $145", d:"Food & beverage revenue" },
              ].map((k, i) => (
                <div key={i} className="bg-white dark:bg-violet-900/30 rounded-lg border border-violet-100 dark:border-violet-700 p-3 flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold">{k.n}</div>
                    <div className="text-xs text-violet-600 dark:text-violet-300 font-medium">Target: {k.t}</div>
                    <div className="text-xs text-muted-foreground">{k.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "6 industry KPIs created", sub: "Targets, thresholds & formulas included", x: "72%", y: "20%", arrow: "left" as const, color: "emerald" as const },
    ring: { x: "4%", y: "26%", w: "88%", h: "62%" },
  },
];

/* — KPI MANAGEMENT SCENES — */
const kpiMgmtScenes = [
  // Scene 0: Full KPI table with RAG
  {
    node: (
      <AppChrome activeKey="kpis">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">KPI Management</h1>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-muted-foreground bg-background ring-2 ring-primary/30"><Filter className="h-3.5 w-3.5" /> All Departments ▾</div>
            </div>
          </div>
          <div className="rounded-xl border overflow-hidden">
            <div className="grid grid-cols-6 bg-muted/50 px-4 py-2.5 text-xs font-semibold text-muted-foreground border-b">
              <span className="col-span-2">KPI Name</span><span>Dept</span><span>Target</span><span>Actual</span><span>Status</span>
            </div>
            {[
              { n:"Occupancy Rate", d:"Sales", t:"85%", a:"78%", s:"Amber", c:"bg-amber-500" },
              { n:"Average Daily Rate (ADR)", d:"Sales", t:"$180", a:"$192", s:"Green", c:"bg-emerald-500" },
              { n:"RevPAR", d:"Sales", t:"$153", a:"$157", s:"Green", c:"bg-emerald-500" },
              { n:"Guest Complaint Rate", d:"Ops", t:"≤2/100", a:"3.2/100", s:"Red", c:"bg-red-500" },
              { n:"Room Turnaround Time", d:"Ops", t:"≤30m", a:"38m", s:"Amber", c:"bg-amber-500" },
              { n:"Employee Turnover", d:"HR", t:"18%", a:"22%", s:"Red", c:"bg-red-500" },
              { n:"Training Completion", d:"HR", t:"90%", a:"88%", s:"Amber", c:"bg-amber-500" },
              { n:"GOP Margin", d:"Finance", t:"35%", a:"32%", s:"Amber", c:"bg-amber-500" },
            ].map((r,i)=>(
              <div key={i} className={`grid grid-cols-6 px-4 py-2.5 border-b last:border-0 items-center text-sm ${i === 3 ? "bg-red-50 dark:bg-red-900/10" : ""}`}>
                <div className="col-span-2 flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded-full ${r.c} shrink-0`} /><span className="font-medium truncate">{r.n}</span></div>
                <span className="text-xs text-muted-foreground">{r.d}</span>
                <span>{r.t}</span><span className="font-semibold">{r.a}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${r.s === "Green" ? "bg-emerald-100 text-emerald-700" : r.s === "Amber" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{r.s}</span>
              </div>
            ))}
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "RAG Status — auto-calculated", sub: "Red rows need immediate attention", x: "72%", y: "46%", arrow: "left" as const, color: "red" as const },
    ring: { x: "68%", y: "38%", w: "28%", h: "38%" },
  },
  // Scene 1: Log actual modal
  {
    node: (
      <AppChrome activeKey="kpis">
        <div className="relative">
          {/* Background KPI table (dimmed) */}
          <div className="opacity-30 space-y-3">
            <h1 className="text-xl font-bold">KPI Management</h1>
            <div className="rounded-xl border overflow-hidden">
              <div className="grid grid-cols-5 bg-muted/50 px-4 py-2.5 text-xs font-semibold text-muted-foreground border-b">
                <span className="col-span-2">KPI Name</span><span>Target</span><span>Actual</span><span>Status</span>
              </div>
              {["Occupancy Rate","ADR","RevPAR","Guest Complaint Rate","Turnover"].map((n,i)=>(
                <div key={i} className="grid grid-cols-5 px-4 py-3 border-b last:border-0 items-center text-sm">
                  <span className="col-span-2 font-medium">{n}</span>
                  <span>-</span><span>-</span><span>-</span>
                </div>
              ))}
            </div>
          </div>
          {/* Modal overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-card border rounded-2xl shadow-2xl p-6 w-80 ring-2 ring-primary/20">
              <h3 className="font-bold text-base mb-1">Log Actual — Occupancy Rate</h3>
              <p className="text-xs text-muted-foreground mb-4">Target: 85% · Previous: 74%</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Actual Value</label>
                  <div className="mt-1 rounded-lg border bg-background px-3 py-2.5 text-sm font-bold text-primary ring-2 ring-primary/30">78%</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Period</label>
                  <div className="mt-1 rounded-lg border bg-background px-3 py-2.5 text-sm text-muted-foreground">February 2026</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Notes</label>
                  <div className="mt-1 rounded-lg border bg-background px-3 py-2.5 text-xs text-muted-foreground">Below target — corporate occupancy weak in Feb.</div>
                </div>
                <div className="flex gap-2 pt-1">
                  <div className="flex-1 rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2.5 text-center cursor-pointer">Save Actual</div>
                  <div className="rounded-lg border text-sm py-2.5 px-4 text-muted-foreground cursor-pointer">Cancel</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "Log Actual in one click", sub: "Status updates instantly after saving", x: "75%", y: "22%", arrow: "down" as const, color: "primary" as const },
    ring: { x: "30%", y: "12%", w: "44%", h: "76%" },
  },
];

/* — ACTION TRACKER SCENES — */
const actionScenes = [
  // Scene 0: All 6 actions
  {
    node: (
      <AppChrome activeKey="actions">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Action Tracker</h1>
            <div className="flex gap-2">
              <div className="text-xs rounded-lg border px-3 py-1.5 text-muted-foreground bg-background">All Meeting Types ▾</div>
              <div className="text-xs rounded-lg border px-3 py-1.5 text-muted-foreground bg-background">All Departments ▾</div>
              <div className="text-xs rounded-lg bg-primary text-primary-foreground px-3 py-1.5 font-medium">+ Add Action</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[{ l:"Total", v:"6", c:"text-foreground" }, { l:"In Progress", v:"2", c:"text-violet-600" }, { l:"Overdue", v:"1", c:"text-red-500" }, { l:"Completed", v:"1", c:"text-emerald-600" }].map((s,i)=>(
              <div key={i} className="rounded-xl border bg-card py-3 px-2">
                <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
                <div className="text-[11px] text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[
              { t:"Implement guest feedback system", o:"Sarah Johnson", m:"CEO Meeting", d:"Mar 15", s:"In Progress", border:"border-l-violet-500" },
              { t:"Launch loyalty program campaign", o:"Omar Khalil", m:"PMO Committee", d:"Feb 20", s:"Delayed", border:"border-l-red-500" },
              { t:"Optimize housekeeping schedule", o:"David Park", m:"Dept Review", d:"Mar 5", s:"Completed", border:"border-l-emerald-500" },
              { t:"Conduct retention interviews", o:"Fatima Al Rashid", m:"Dept Review", d:"Mar 10", s:"In Progress", border:"border-l-violet-500" },
              { t:"Review F&B menu pricing", o:"Michael Chen", m:"Finance Committee", d:"Mar 20", s:"Not Started", border:"border-l-muted" },
              { t:"Update Q2 budget forecast", o:"Lisa Wong", m:"CEO Meeting", d:"Mar 25", s:"Not Started", border:"border-l-muted" },
            ].map((a,i)=>(
              <div key={i} className={`rounded-xl border border-l-4 ${a.border} bg-card px-4 py-3 flex items-center justify-between`}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{a.t}</div>
                  <div className="text-xs text-muted-foreground flex gap-3 mt-0.5"><span>👤 {a.o}</span><span>🏢 {a.m}</span><span>📅 {a.d}</span></div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ml-3 ${a.s === "Completed" ? "bg-emerald-100 text-emerald-700" : a.s === "In Progress" ? "bg-violet-100 text-violet-700" : a.s === "Delayed" ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`}>{a.s}</span>
              </div>
            ))}
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "All actions across all meetings", sub: "Colour-coded by status — spot delays instantly", x: "72%", y: "46%", arrow: "left" as const, color: "primary" as const },
    ring: { x: "2%", y: "40%", w: "96%", h: "54%" },
  },
  // Scene 1: Delayed action highlighted
  {
    node: (
      <AppChrome activeKey="actions">
        <div className="space-y-3">
          <h1 className="text-xl font-bold">Action Tracker</h1>
          <div className="space-y-2">
            <div className="rounded-xl border border-l-4 border-l-violet-500 bg-card px-4 py-3 opacity-40">
              <div className="text-sm font-medium text-muted-foreground">Implement guest feedback system · Sarah Johnson · Mar 15</div>
            </div>
            <div className="rounded-xl border-2 border-red-400 border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/10 px-4 py-4 shadow-lg ring-2 ring-red-300/40">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-sm font-bold text-red-700 dark:text-red-400">OVERDUE — 23 days late</span></div>
                  <div className="text-sm font-semibold">Launch loyalty program campaign</div>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-3"><span>👤 Omar Khalil</span><span>🏢 PMO Committee</span></div>
                </div>
                <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-full font-semibold">Delayed</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-red-500 font-semibold flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Due: Feb 20, 2026</span>
                <span className="text-muted-foreground">Priority: Medium</span>
                <div className="ml-auto bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-medium cursor-pointer">Update Status</div>
              </div>
            </div>
            <div className="rounded-xl border border-l-4 border-l-emerald-500 bg-card px-4 py-3 opacity-40">
              <div className="text-sm font-medium text-muted-foreground">Optimize housekeeping schedule · David Park · Completed</div>
            </div>
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "Overdue actions flagged", sub: "Red border + days-late counter — never miss a deadline", x: "72%", y: "32%", arrow: "left" as const, color: "red" as const },
    ring: { x: "2%", y: "22%", w: "66%", h: "42%" },
  },
];

/* — AI MONTHLY REVIEWS SCENES — */
const reviewScenes = [
  // Scene 0: Generate button prominent
  {
    node: (
      <AppChrome activeKey="reviews">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Monthly Reviews</h1>
            <div className="flex items-center gap-2 rounded-lg bg-violet-600 text-white px-5 py-2.5 text-sm font-semibold cursor-pointer shadow-lg ring-4 ring-violet-300/50">
              <Sparkles className="h-4 w-4 animate-pulse" /> Generate Review
            </div>
          </div>
          <div className="rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/10 p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-violet-500 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold mb-2">AI-Powered Monthly Review</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">GPT-4o reads your KPI actuals, meeting actions, and project data — then writes a structured performance review in seconds.</p>
            <div className="flex flex-wrap gap-2 justify-center text-xs">
              {["✅ Analyses all 10 KPIs", "📋 Reviews 6 actions", "📊 Covers 4 projects", "🎯 Identifies gaps", "💡 Gives recommendations"].map((t,i)=>(
                <span key={i} className="bg-white dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 rounded-full px-3 py-1">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "One click — full review", sub: "GPT-4o reads all your live data automatically", x: "73%", y: "12%", arrow: "down" as const, color: "violet" as const },
    ring: { x: "58%", y: "5%", w: "36%", h: "14%" },
  },
  // Scene 1: Full review output
  {
    node: (
      <AppChrome activeKey="reviews">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Monthly Reviews</h1>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> February 2026 review generated</span>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b bg-violet-50 dark:bg-violet-900/20 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center"><Sparkles className="h-4 w-4 text-white" /></div>
              <div>
                <div className="font-semibold">February 2026 — Performance Review</div>
                <div className="text-xs text-muted-foreground">AI Generated · March 10, 2026</div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <h3 className="font-semibold mb-2 text-sm">Executive Summary</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">February showed mixed results. Revenue metrics exceeded targets with strong ADR (+6.7%) and RevPAR performance driven by corporate bookings. Operational challenges in guest satisfaction and employee retention require immediate attention.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { title:"Strengths", c:"border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/10", tc:"text-emerald-700 dark:text-emerald-400", dot:"bg-emerald-500",
                    items:["ADR $192 vs $180 — +6.7%","RevPAR $157 vs $153 target","Housekeeping on schedule"] },
                  { title:"Gaps", c:"border-l-red-500 bg-red-50 dark:bg-red-900/10", tc:"text-red-700 dark:text-red-400", dot:"bg-red-500",
                    items:["Guest complaints 3.2 vs 2.0","Turnover 22% vs 18%","Budget variance 7% vs 5%"] },
                  { title:"Recommendations", c:"border-l-amber-500 bg-amber-50 dark:bg-amber-900/10", tc:"text-amber-700 dark:text-amber-400", dot:"bg-amber-500",
                    items:["F&B quality training plan","Retention bonuses approved","Review marketing spend"] },
                ].map((sec,i)=>(
                  <div key={i} className={`rounded-xl border-l-4 ${sec.c} p-3`}>
                    <h4 className={`font-semibold text-xs mb-2 ${sec.tc}`}>{sec.title}</h4>
                    <ul className="space-y-1.5">
                      {sec.items.map((item,j)=>(<li key={j} className="flex items-start gap-1.5 text-[11px] text-muted-foreground"><div className={`w-1.5 h-1.5 rounded-full ${sec.dot} shrink-0 mt-1`} />{item}</li>))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "Strengths, Gaps, Recommendations", sub: "Structured 3-column AI output every month", x: "72%", y: "62%", arrow: "up" as const, color: "emerald" as const },
    ring: { x: "4%", y: "54%", w: "90%", h: "38%" },
  },
];

/* — PROJECT PORTFOLIO SCENES — */
const portfolioScenes = [
  // Scene 0: All project cards with health
  {
    node: (
      <AppChrome activeKey="portfolio">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Project Portfolio</h1>
            <div className="text-sm rounded-lg bg-primary text-primary-foreground px-4 py-2 font-medium">+ New Project</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[{ l:"Total", v:"4", c:"text-primary" }, { l:"Active", v:"3", c:"text-violet-600" }, { l:"At Risk", v:"0", c:"text-red-500" }, { l:"Completed", v:"0", c:"text-emerald-600" }, { l:"Overdue Tasks", v:"2", c:"text-red-500" }, { l:"Milestones", v:"6", c:"text-amber-600" }].map((s,i)=>(
              <div key={i} className="rounded-xl border bg-card py-3"><div className={`text-2xl font-bold ${s.c}`}>{s.v}</div><div className="text-[11px] text-muted-foreground">{s.l}</div></div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { n:"Loyalty Program Launch", hb:"border-t-emerald-500", h:"bg-emerald-500", p:55, s:"In Progress", pri:"High", health:"🟢 Green", owner:"Noura Bin Rashid" },
              { n:"F&B Menu Overhaul", hb:"border-t-amber-500", h:"bg-amber-500", p:40, s:"In Progress", pri:"High", health:"🟡 Amber", owner:"Khalid Mansoor" },
              { n:"Staff Retention Initiative", hb:"border-t-emerald-500", h:"bg-emerald-500", p:30, s:"In Progress", pri:"Critical", health:"🟢 Green", owner:"Fatima Al Rashid" },
              { n:"Q2 Revenue Recovery Plan", hb:"border-t-amber-500", h:"bg-amber-500", p:0, s:"Not Started", pri:"Critical", health:"🟡 Amber", owner:"Priya Sharma" },
            ].map((p,i)=>(
              <div key={i} className={`rounded-xl border border-t-4 ${p.hb} bg-card p-4 cursor-pointer hover:shadow-md transition-shadow`}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm flex-1 pr-2 leading-tight">{p.n}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${p.s === "In Progress" ? "bg-violet-100 text-violet-700" : "bg-muted text-muted-foreground"}`}>{p.s}</span>
                </div>
                <div className="flex gap-1.5 mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.pri === "Critical" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>{p.pri}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{p.health}</span>
                </div>
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Progress</span><span className="font-semibold">{p.p}%</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${p.h}`} style={{ width: `${p.p}%` }} /></div>
                </div>
                <div className="text-xs text-muted-foreground">👤 {p.owner}</div>
              </div>
            ))}
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "Auto-calculated health scores", sub: "Green / Amber / Red on every project", x: "72%", y: "42%", arrow: "left" as const, color: "emerald" as const },
    ring: { x: "54%", y: "34%", w: "24%", h: "22%" },
  },
  // Scene 1: Project detail / task board
  {
    node: (
      <AppChrome activeKey="portfolio">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><FolderOpen className="h-4 w-4" /> Portfolio <ChevronRight className="h-3 w-3" /> <span className="font-semibold text-foreground">Loyalty Program Launch</span></div>
          <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b bg-emerald-50 dark:bg-emerald-900/15">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <div className="flex-1">
                <div className="font-bold">Loyalty Program Launch</div>
                <div className="text-xs text-muted-foreground flex gap-3 mt-0.5"><span>Owner: Noura Bin Rashid</span><span>Due: Apr 30, 2026</span><span className="text-emerald-600 font-medium">🟢 Green — On Track</span></div>
              </div>
              <div className="text-right"><div className="text-xl font-bold text-emerald-600">55%</div><div className="text-xs text-muted-foreground">Progress</div></div>
            </div>
            <div className="p-5">
              <div className="text-sm font-semibold mb-3">Tasks (5)</div>
              {[
                { t:"Finalize loyalty platform vendor", s:"Completed", p:"High", d:"Feb 28", c:"text-emerald-600", bg:"bg-emerald-50 dark:bg-emerald-900/10" },
                { t:"Design loyalty app mockups", s:"In Progress", p:"High", d:"Mar 15", c:"text-violet-600", bg:"bg-violet-50 dark:bg-violet-900/10" },
                { t:"PMS integration testing", s:"In Progress", p:"High", d:"Apr 1", c:"text-violet-600", bg:"bg-violet-50 dark:bg-violet-900/10" },
                { t:"Email campaign content", s:"In Progress", p:"Medium", d:"Mar 20", c:"text-violet-600", bg:"" },
                { t:"Loyalty Program Public Launch", s:"Not Started", p:"High", d:"Apr 30", c:"text-muted-foreground", bg:"" },
              ].map((task,i)=>(
                <div key={i} className={`flex items-center gap-3 py-2.5 border-b last:border-0 rounded-lg px-2 mb-0.5 ${task.bg}`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${task.s === "Completed" ? "bg-emerald-500" : task.s === "In Progress" ? "bg-violet-500" : "bg-muted-foreground/30"}`} />
                  <div className="flex-1 text-sm font-medium">{task.t}</div>
                  <span className={`text-xs ${task.c} font-medium`}>{task.s}</span>
                  <span className="text-xs text-muted-foreground">{task.d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "Full task board per project", sub: "Status, priority, owner, due date — all tracked", x: "72%", y: "30%", arrow: "left" as const, color: "primary" as const },
    ring: { x: "4%", y: "20%", w: "88%", h: "72%" },
  },
];

/* — WORKLOAD SCENES — */
const workloadScenes = [
  // Scene 0: Stacked bars overview
  {
    node: (
      <AppChrome activeKey="workload">
        <div className="space-y-3">
          <h1 className="text-xl font-bold">Team Workload</h1>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[{ l:"Members", v:"5", c:"text-primary" }, { l:"Total Tasks", v:"17", c:"text-foreground" }, { l:"Overdue", v:"2", c:"text-red-500" }, { l:"Completion", v:"41%", c:"text-emerald-600" }].map((s,i)=>(
              <div key={i} className="rounded-xl border bg-card py-3"><div className={`text-2xl font-bold ${s.c}`}>{s.v}</div><div className="text-[11px] text-muted-foreground">{s.l}</div></div>
            ))}
          </div>
          <div className="space-y-2">
            {[
              { n:"Ravi Mehta", role:"Operations Lead", total:7, done:3, active:2, over:1 },
              { n:"Pooja Sharma", role:"HR Manager", total:5, done:4, active:1, over:0 },
              { n:"Omar Khalil", role:"Sales Lead", total:3, done:0, active:2, over:1 },
              { n:"Fatima Al Rashid", role:"People & Culture", total:2, done:0, active:2, over:0 },
              { n:"Lisa Wong", role:"Financial Controller", total:2, done:0, active:1, over:0 },
            ].map((m,i)=>(
              <div key={i} className={`rounded-xl border bg-card p-4 ${m.over > 0 ? "border-red-200 dark:border-red-800" : ""}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{m.n.split(" ").map(x=>x[0]).join("")}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{m.n}</div>
                    <div className="text-xs text-muted-foreground">{m.role}</div>
                  </div>
                  {m.over > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{m.over} overdue</span>}
                  <div className="text-xs text-muted-foreground">{m.total} tasks</div>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                  <div className="bg-emerald-500 rounded-l" style={{ width: `${(m.done/m.total)*100}%` }} />
                  <div className="bg-violet-500" style={{ width: `${(m.active/m.total)*100}%` }} />
                  {m.over>0 && <div className="bg-red-500 rounded-r" style={{ width: `${(m.over/m.total)*100}%` }} />}
                  {m.done===0&&m.over===0&&<div className="bg-muted-foreground/30 rounded-r flex-1" />}
                </div>
                <div className="flex gap-3 mt-1.5 text-[11px]">
                  <span className="text-emerald-600 font-medium">{m.done} done</span>
                  <span className="text-violet-600 font-medium">{m.active} active</span>
                  {m.over>0 && <span className="text-red-500 font-medium">{m.over} overdue</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "Workload stacked bars", sub: "Green=Done · Violet=Active · Red=Overdue", x: "71%", y: "25%", arrow: "left" as const, color: "primary" as const },
    ring: { x: "2%", y: "32%", w: "92%", h: "20%" },
  },
  // Scene 1: Expanded member tasks
  {
    node: (
      <AppChrome activeKey="workload">
        <div className="space-y-3">
          <h1 className="text-xl font-bold">Team Workload</h1>
          <div className={`rounded-xl border-2 border-red-300 dark:border-red-700 bg-card overflow-hidden shadow-lg`}>
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-sm font-bold text-red-600">RM</div>
              <div className="flex-1">
                <div className="font-semibold">Ravi Mehta</div>
                <div className="text-xs text-muted-foreground">Operations Lead</div>
              </div>
              <span className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> 1 overdue</span>
            </div>
            <div className="flex h-2 overflow-hidden">
              <div className="bg-emerald-500" style={{ width:"43%" }} />
              <div className="bg-violet-500" style={{ width:"28%" }} />
              <div className="bg-red-500" style={{ width:"14%" }} />
              <div className="bg-muted-foreground/20 flex-1" />
            </div>
            <div>
              {[
                { t:"Design loyalty app mockups", p:"Loyalty Program", s:"In Progress", d:"Mar 15", ov:false },
                { t:"Review vendor proposals", p:"F&B Overhaul", s:"OVERDUE", d:"Mar 8", ov:true },
                { t:"Staff interview schedule", p:"Retention", s:"Not Started", d:"Mar 20", ov:false },
                { t:"PMS API review", p:"Loyalty Program", s:"Completed", d:"Mar 5", ov:false },
              ].map((task,i)=>(
                <div key={i} className={`flex items-center gap-3 px-4 py-3 border-b last:border-0 ${task.ov ? "bg-red-50 dark:bg-red-900/10" : ""}`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${task.s === "Completed" ? "bg-emerald-500" : task.s === "In Progress" ? "bg-violet-500" : task.ov ? "bg-red-500 animate-pulse" : "bg-muted-foreground/30"}`} />
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${task.ov ? "text-red-700 dark:text-red-400" : ""}`}>{task.t}</div>
                    <div className="text-xs text-muted-foreground">{task.p}</div>
                  </div>
                  <div className={`text-xs font-semibold shrink-0 ${task.ov ? "text-red-500 flex items-center gap-1" : "text-muted-foreground"}`}>{task.ov && <AlertTriangle className="h-3 w-3" />}{task.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "Overdue tasks highlighted", sub: "Click any member to see their full task list", x: "72%", y: "30%", arrow: "left" as const, color: "red" as const },
    ring: { x: "2%", y: "16%", w: "88%", h: "76%" },
  },
];

/* — SEARCH SCENES — */
const searchScenes = [
  {
    node: (
      <AppChrome activeKey="dashboard" searchText="loyalty program">
        <div className="relative">
          <div className="opacity-30 space-y-3">
            <div className="rounded-xl border bg-card p-4 h-48" />
            <div className="rounded-xl border bg-card p-4 h-32" />
          </div>
          {/* Search results dropdown */}
          <div className="absolute top-0 right-0 w-96 bg-card border-2 border-primary/30 rounded-2xl shadow-2xl overflow-hidden z-20 ring-2 ring-primary/10">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">loyalty program</span>
              <span className="ml-auto text-xs text-muted-foreground bg-border rounded px-1.5 py-0.5">Esc</span>
            </div>
            <div className="p-2">
              {[
                { type:"Project", label:"Loyalty Program Launch", sub:"55% progress · Due Apr 30 · 🟢 On Track", icon:"📁", c:"text-indigo-600", bg:"bg-indigo-50 dark:bg-indigo-900/20" },
                { type:"Task", label:"Design loyalty app mockups", sub:"Ravi Mehta · In Progress · Mar 15", icon:"✅", c:"text-violet-600", bg:"bg-violet-50 dark:bg-violet-900/20" },
                { type:"Task", label:"Email campaign content", sub:"Omar Khalil · In Progress · Mar 20", icon:"✅", c:"text-violet-600", bg:"" },
                { type:"Action", label:"Launch loyalty program campaign", sub:"PMO Committee · Omar Khalil · Delayed", icon:"📋", c:"text-red-600", bg:"bg-red-50 dark:bg-red-900/10" },
                { type:"Milestone", label:"Loyalty Program Public Launch", sub:"Apr 30, 2026 · Upcoming", icon:"🏁", c:"text-amber-600", bg:"" },
              ].map((r,i)=>(
                <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-muted transition-colors mb-0.5 ${r.bg}`}>
                  <span className="text-lg w-7 text-center">{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.sub}</div>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-card border font-medium ${r.c} shrink-0`}>{r.type}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t text-xs text-muted-foreground bg-muted/20">5 results across projects, tasks, actions & milestones</div>
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "Global search — ⌘K", sub: "Find anything across all features instantly", x: "38%", y: "8%", arrow: "up" as const, color: "primary" as const },
    ring: { x: "48%", y: "0%", w: "48%", h: "100%" },
  },
];

/* — ROLE ACCESS SCENES — */
const roleScenes = [
  {
    node: (
      <AppChrome activeKey="settings">
        <div className="space-y-4">
          <h1 className="text-xl font-bold">User Management</h1>
          <div className="grid grid-cols-2 gap-4">
            {/* Admin */}
            <div className="rounded-xl border-2 border-primary bg-card overflow-hidden">
              <div className="bg-primary/10 px-4 py-3 border-b flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm text-primary">Admin Role</span>
                <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Full Access</span>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { icon:"✅", label:"Create & edit KPIs" },
                  { icon:"✅", label:"Log actuals & update status" },
                  { icon:"✅", label:"Create projects & tasks" },
                  { icon:"✅", label:"Run AI Monthly Reviews" },
                  { icon:"✅", label:"Manage users & roles" },
                  { icon:"✅", label:"Log meetings & actions" },
                ].map((item,i)=>(
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-emerald-500">{item.icon}</span> {item.label}
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Demo credentials</div>
                  <div className="text-xs font-mono bg-muted rounded px-2 py-1.5">demo@performo.ai / demo123</div>
                </div>
              </div>
            </div>
            {/* Executive */}
            <div className="rounded-xl border-2 border-muted bg-card overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-sm">Executive Role</span>
                <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Read Only</span>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { icon:"✅", label:"View all dashboards" },
                  { icon:"✅", label:"View KPIs & health scores" },
                  { icon:"✅", label:"View projects & milestones" },
                  { icon:"✅", label:"Read monthly reviews" },
                  { icon:"🚫", label:"No edit controls shown" },
                  { icon:"🚫", label:"No create buttons shown" },
                ].map((item,i)=>(
                  <div key={i} className={`flex items-center gap-2 text-sm ${item.icon === "🚫" ? "text-muted-foreground" : ""}`}>
                    <span>{item.icon}</span> {item.label}
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Demo credentials</div>
                  <div className="text-xs font-mono bg-muted rounded px-2 py-1.5">exec@performo.ai / exec123</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "Admin vs Executive roles", sub: "Same data — full control vs clean read-only", x: "50%", y: "10%", arrow: "down" as const, color: "primary" as const },
    ring: { x: "2%", y: "20%", w: "96%", h: "72%" },
  },
];

/* — DASHBOARD PLANNER SCENES — */
const plannerScenes = [
  {
    node: (
      <AppChrome activeKey="planner">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Dashboard Planner</h1>
            <div className="flex items-center gap-2 rounded-lg bg-violet-600 text-white px-4 py-2 text-sm font-semibold cursor-pointer ring-4 ring-violet-300/40">
              <Sparkles className="h-4 w-4 animate-pulse" /> Generate Layout
            </div>
          </div>
          <div className="rounded-xl border bg-violet-50 dark:bg-violet-900/15 border-violet-200 p-5">
            <div className="text-sm font-semibold text-violet-700 dark:text-violet-300 mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI-Recommended Power BI Layout</div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { t:"Occupancy Rate", type:"KPI Card", c:"border-emerald-300 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700" },
                { t:"ADR vs Target", type:"Gauge Chart", c:"border-violet-300 bg-violet-50 dark:bg-violet-900/10 text-violet-700" },
                { t:"RevPAR Trend", type:"Line Chart", c:"border-blue-300 bg-blue-50 dark:bg-blue-900/10 text-blue-700" },
              ].map((w,i)=>(
                <div key={i} className={`rounded-xl border-2 ${w.c} p-3 text-center`}>
                  <div className="text-xs font-bold">{w.t}</div>
                  <div className="text-[10px] mt-1 opacity-70">{w.type}</div>
                  <div className="mt-2 bg-current/10 rounded h-12 flex items-center justify-center text-xl">📊</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { t:"Project Health Scorecard", type:"Table with RAG", c:"border-primary/30 bg-primary/5" },
                { t:"Action Items by Owner", type:"Bar Chart", c:"border-amber-300 bg-amber-50 dark:bg-amber-900/10" },
              ].map((w,i)=>(
                <div key={i} className={`rounded-xl border-2 ${w.c} p-3`}>
                  <div className="text-xs font-bold">{w.t}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{w.type}</div>
                  <div className="mt-2 bg-muted/50 rounded h-10 flex items-center justify-center text-lg">📈</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted-foreground bg-white dark:bg-black/20 rounded-lg p-3 border border-violet-100 dark:border-violet-700">
              💡 <strong>AI Recommendation:</strong> Place RevPAR and Occupancy Rate at top-left for CEO focus. Use conditional formatting (Red/Amber/Green) on the KPI table for instant scanning.
            </div>
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "AI designs your Power BI layout", sub: "Charts, KPI cards & page structure — all planned", x: "72%", y: "22%", arrow: "left" as const, color: "violet" as const },
    ring: { x: "4%", y: "26%", w: "90%", h: "68%" },
  },
];

/* — MEETING MANAGEMENT SCENES — */
const meetingScenes = [
  {
    node: (
      <AppChrome activeKey="meetings">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Meeting Management</h1>
            <div className="text-sm rounded-lg bg-primary text-primary-foreground px-4 py-2 font-medium cursor-pointer">+ Log Meeting</div>
          </div>
          <div className="space-y-3">
            {[
              { type:"CEO Meeting", icon:"👔", date:"Mar 10, 2026", attendees:"5", actions:2, color:"border-l-primary bg-primary/5" },
              { type:"Finance Committee", icon:"💰", date:"Mar 12, 2026", attendees:"4", actions:1, color:"border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10" },
              { type:"PMO Steering Committee", icon:"📊", date:"Mar 5, 2026", attendees:"6", actions:1, color:"border-l-violet-500 bg-violet-50/50 dark:bg-violet-900/10" },
              { type:"Department Review — Operations", icon:"⚙️", date:"Mar 3, 2026", attendees:"8", actions:2, color:"border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10" },
            ].map((m,i)=>(
              <div key={i} className={`rounded-xl border border-l-4 ${m.color} p-4 flex items-center gap-4 cursor-pointer hover:shadow-sm transition-shadow`}>
                <span className="text-2xl">{m.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{m.type}</div>
                  <div className="text-xs text-muted-foreground flex gap-4 mt-1">
                    <span>📅 {m.date}</span>
                    <span>👥 {m.attendees} attendees</span>
                    <span className="text-primary font-medium">📋 {m.actions} actions raised</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
            <div className="font-semibold mb-1">How it works</div>
            <p className="text-xs leading-relaxed max-w-sm mx-auto">Log a meeting → Add action items with owners → Track completion in Action Tracker → Accountability is built in from the start.</p>
          </div>
        </div>
      </AppChrome>
    ),
    callout: { text: "Meetings → Actions → Accountability", sub: "Every meeting generates trackable action items", x: "72%", y: "22%", arrow: "left" as const, color: "primary" as const },
    ring: { x: "2%", y: "14%", w: "90%", h: "70%" },
  },
];

/* ─────────── FEATURE DEFINITIONS ─────────── */
type FeatureDef = {
  icon: React.ElementType; title: string; description: string;
  color: string; bg: string; activeKey: string;
  scenes: Array<{ node: React.ReactNode; callout?: { text: string; sub?: string; x: string; y: string; arrow?: "up"|"down"|"left"|"right"; color?: "primary"|"violet"|"emerald"|"red"|"amber" }; ring?: { x: string; y: string; w: string; h: string } }>;
};

const FEATURES: FeatureDef[] = [
  { icon: LineChart, title: "Live Dashboard", color: "text-primary", bg: "bg-primary/10", activeKey: "dashboard", description: "Welcome banner, KPI health donut, action progress, live execution stats — everything on one screen.", scenes: dashboardScenes },
  { icon: Sparkles, title: "AI KPI Generator", color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/30", activeKey: "kpis", description: "GPT-4o generates industry-specific KPIs with targets, thresholds, and formulas in seconds.", scenes: kpiAiScenes },
  { icon: Target, title: "KPI Management", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", activeKey: "kpis", description: "Track 10 KPIs with RAG status. Log actuals, filter by department, and see status update instantly.", scenes: kpiMgmtScenes },
  { icon: ListChecks, title: "Action Tracker", color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30", activeKey: "actions", description: "All meeting actions with owners, due dates, and real-time status — delays flagged automatically.", scenes: actionScenes },
  { icon: FileText, title: "AI Monthly Reviews", color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/30", activeKey: "reviews", description: "GPT-4o reads your KPI data and writes a structured monthly review with strengths, gaps & recommendations.", scenes: reviewScenes },
  { icon: LayoutTemplate, title: "Dashboard Planner", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", activeKey: "planner", description: "AI designs your ideal Power BI dashboard — chart types, KPI placement, and page structure.", scenes: plannerScenes },
  { icon: FolderOpen, title: "Project Portfolio", color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30", activeKey: "portfolio", description: "All projects with auto-calculated Green/Amber/Red health scores, progress bars, and milestone tracking.", scenes: portfolioScenes },
  { icon: LayoutGrid, title: "Project Management", color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-900/30", activeKey: "portfolio", description: "Task boards, milestone calendars, overdue alerts, and health scoring inside each project.", scenes: portfolioScenes },
  { icon: Users, title: "Team Workload", color: "text-cyan-600", bg: "bg-cyan-100 dark:bg-cyan-900/30", activeKey: "workload", description: "Stacked bars per person — Done, Active, Overdue — spot team bottlenecks at a glance.", scenes: workloadScenes },
  { icon: Search, title: "Global Search", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", activeKey: "dashboard", description: "⌘K to search all projects, tasks, KPIs, meetings, and actions from anywhere in the app.", scenes: searchScenes },
  { icon: Building2, title: "Meeting Management", color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30", activeKey: "meetings", description: "Log meetings, link actions with owners, and track accountability from meeting to completion.", scenes: meetingScenes },
  { icon: Shield, title: "Role-Based Access", color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800/50", activeKey: "settings", description: "Admin (full control) and Executive (read-only) roles — same data, different permissions.", scenes: roleScenes },
];

/* ─────────── VIDEO-STYLE DEMO PLAYER ─────────── */
const SCENE_DURATION = 5000; // ms per scene

function DemoPlayer({ feature, onClose }: { feature: FeatureDef; onClose: () => void }) {
  const { scenes } = feature;
  const [playing, setPlaying] = useState(true);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0); // 0–100 within scene
  const [globalProgress, setGlobalProgress] = useState(0); // 0–100 overall
  const [fadeIn, setFadeIn] = useState(true);
  const rafRef = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);
  const progressRef = useRef(0); // accumulated ms

  const totalDuration = scenes.length * SCENE_DURATION;
  const currentScene = scenes[Math.min(sceneIdx, scenes.length - 1)];

  const tick = useCallback((ts: number) => {
    if (lastTs.current === null) lastTs.current = ts;
    const delta = ts - lastTs.current;
    lastTs.current = ts;
    progressRef.current = Math.min(progressRef.current + delta, totalDuration);

    const pct = (progressRef.current / totalDuration) * 100;
    setGlobalProgress(pct);

    const newSceneIdx = Math.min(Math.floor(progressRef.current / SCENE_DURATION), scenes.length - 1);
    const withinScene = ((progressRef.current % SCENE_DURATION) / SCENE_DURATION) * 100;
    setSceneProgress(withinScene);

    setSceneIdx(prev => {
      if (prev !== newSceneIdx) { setFadeIn(false); setTimeout(() => setFadeIn(true), 80); }
      return newSceneIdx;
    });

    if (progressRef.current < totalDuration) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [scenes.length, totalDuration]);

  useEffect(() => {
    if (playing) {
      lastTs.current = null;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, tick]);

  const restart = () => {
    progressRef.current = 0;
    setGlobalProgress(0);
    setSceneIdx(0);
    setSceneProgress(0);
    lastTs.current = null;
    setPlaying(true);
  };

  const seekTo = (pct: number) => {
    const ms = (pct / 100) * totalDuration;
    progressRef.current = Math.min(ms, totalDuration);
    const idx = Math.min(Math.floor(progressRef.current / SCENE_DURATION), scenes.length - 1);
    setSceneIdx(idx);
    setGlobalProgress(pct);
  };

  const finished = globalProgress >= 99.9;

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      {/* Video frame */}
      <div className="relative flex-1 min-h-0 bg-[#0a0a0a] overflow-hidden">
        {/* Scene content with fade transition */}
        <div className={`absolute inset-2 rounded-xl overflow-hidden border border-white/8 shadow-2xl transition-opacity duration-150 ${fadeIn ? "opacity-100" : "opacity-0"}`}>
          {currentScene.node}
        </div>

        {/* Highlight ring */}
        {currentScene.ring && fadeIn && (
          <Ring
            x={`calc(${currentScene.ring.x} + 8px)`}
            y={`calc(${currentScene.ring.y} + 8px)`}
            w={currentScene.ring.w}
            h={currentScene.ring.h}
            color={currentScene.callout?.color || "primary"}
          />
        )}

        {/* Callout annotation */}
        {currentScene.callout && fadeIn && (
          <Callout
            text={currentScene.callout.text}
            sub={currentScene.callout.sub}
            x={`calc(${currentScene.callout.x} + 8px)`}
            y={`calc(${currentScene.callout.y} + 8px)`}
            arrow={currentScene.callout.arrow}
            color={currentScene.callout.color}
          />
        )}

        {/* Top bar overlay */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2.5 bg-gradient-to-b from-black/70 to-transparent z-40">
          <div className="flex items-center gap-3">
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${feature.bg} shrink-0`}>
              <feature.icon className={`h-3.5 w-3.5 ${feature.color}`} />
            </div>
            <div>
              <div className="text-white text-sm font-semibold leading-tight">{feature.title}</div>
              <div className="text-white/50 text-[10px]">Scene {sceneIdx + 1} of {scenes.length}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white transition-colors z-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scene progress bar (inside video frame, under annotation) */}
        <div className="absolute bottom-2 left-2 right-2 h-1 bg-white/10 rounded-full z-30 overflow-hidden">
          <div className="h-full bg-white/40 rounded-full transition-none" style={{ width: `${sceneProgress}%` }} />
        </div>
      </div>

      {/* YouTube-style controls */}
      <div className="bg-[#181818] px-4 pt-2 pb-3 shrink-0">
        {/* Global scrubber */}
        <div
          className="relative h-1 bg-white/20 rounded-full cursor-pointer group mb-3 hover:h-2 transition-all"
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekTo(((e.clientX - rect.left) / rect.width) * 100);
          }}
        >
          <div className="h-full rounded-full bg-red-500 relative" style={{ width: `${globalProgress}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 translate-x-1/2 transition-opacity" />
          </div>
        </div>
        {/* Controls row */}
        <div className="flex items-center gap-3">
          <button onClick={restart} className="text-white/70 hover:text-white transition-colors"><SkipBack className="h-5 w-5" /></button>
          <button
            onClick={() => { if (finished) restart(); else setPlaying(!playing); }}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform shrink-0"
          >
            {!playing || finished
              ? <Play className="h-4 w-4 text-black ml-0.5" fill="black" />
              : <Pause className="h-4 w-4 text-black" fill="black" />}
          </button>
          <Volume2 className="h-5 w-5 text-white/30" />
          <span className="text-white/70 text-xs tabular-nums">
            {Math.floor(globalProgress / 100 * totalDuration / 1000)}s / {Math.floor(totalDuration / 1000)}s
          </span>
          {/* Scene dots */}
          <div className="flex gap-1.5 flex-1 justify-center">
            {scenes.map((_, i) => (
              <button
                key={i}
                onClick={() => { seekTo((i / scenes.length) * 100); }}
                className={`rounded-full transition-all h-1.5 ${i === sceneIdx ? "w-6 bg-white" : "w-1.5 bg-white/30 hover:bg-white/60"}`}
                title={`Scene ${i + 1}`}
              />
            ))}
          </div>
          <Maximize2 className="h-4 w-4 text-white/40 ml-auto" />
        </div>
      </div>
    </div>
  );
}

/* ─────────── FEATURE CARD (thumbnail) ─────────── */
function FeatureCard({ feature, index }: { feature: FeatureDef; index: number }) {
  const [open, setOpen] = useState(false);
  const firstScene = feature.scenes[0];

  return (
    <>
      <Card className="group cursor-pointer hover:shadow-lg transition-all hover:border-primary/30 overflow-hidden flex flex-col" data-testid={`card-feature-video-${index}`} onClick={() => setOpen(true)}>
        {/* Thumbnail — first scene scaled down */}
        <div className="relative overflow-hidden flex-shrink-0 bg-[#0f0f0f]" style={{ aspectRatio: "16/9" }}>
          <div className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ transform: "scale(0.38)", transformOrigin: "top left", width: "263%", height: "263%" }}>
            <div className="w-full h-full">{firstScene.node}</div>
          </div>
          {/* Dark tint + play button */}
          <div className="absolute inset-0 bg-black/35 group-hover:bg-black/15 transition-colors flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-black/60 border-2 border-white/80 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              <Play className="h-6 w-6 text-white ml-1" fill="white" />
            </div>
          </div>
          {/* Scene count badge */}
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
            {feature.scenes.length} scenes
          </div>
        </div>
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
          <p className="text-sm text-muted-foreground mt-1">{isLogin ? "Sign in to your GHC Beacon account" : "Get started with GHC Beacon"}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-1">
          {!isLogin && <div className="space-y-2"><Label htmlFor="name">Full Name</Label><Input id="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" required={!isLogin} data-testid="input-name" /></div>}
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required data-testid="input-email" /></div>
          <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" required data-testid="input-password" /></div>
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">{loading ? "Please wait…" : isLogin ? "Sign In" : "Create Account"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
        </form>
        <div className="text-center mt-2"><Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setIsLogin(!isLogin)} data-testid="button-toggle-auth">{isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}</Button></div>
        {isLogin && <div className="text-center space-y-1 pb-2"><p className="text-xs text-muted-foreground">Admin: demo@performo.ai / demo123</p><p className="text-xs text-muted-foreground">Executive: exec@performo.ai / exec123</p></div>}
        <div className="text-center pb-3"><a href="/owner/login" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="link-dialog-owner-login"><Shield className="h-3 w-3" />Platform Owner login</a></div>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────── LOGIN PAGE ─────────── */
export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false);
  const { login, register } = useAuth(); const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { if (isLogin) await login(email, password); else await register(name, email, password); }
    catch (err: any) { toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/60 via-white to-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 h-16 border-b bg-white/80 backdrop-blur">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/ghc-beacon-logo.jpg" alt="GHC Beacon" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-base font-bold tracking-tight">GHC <span className="text-blue-600">Beacon</span></span>
        </button>
        <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
          ← Back to home
        </button>
      </nav>

      {/* Login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/ghc-beacon-logo.jpg" alt="GHC Beacon" className="h-14 w-14 rounded-2xl object-cover shadow-lg mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900" data-testid="text-auth-title">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLogin ? "Sign in to your GHC Beacon workspace" : "Get started with GHC Beacon"}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required={!isLogin} data-testid="input-name" className="h-10" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required data-testid="input-email" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required data-testid="input-password" className="h-10" />
              </div>
              <Button type="submit" className="w-full h-10 font-semibold bg-blue-600 hover:bg-blue-700" disabled={loading} data-testid="button-login">
                {loading ? "Please wait…" : isLogin ? "Sign In" : "Create Account"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsLogin(!isLogin)}
                data-testid="button-toggle-auth"
              >
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <span className="text-blue-600 font-medium">{isLogin ? "Sign up" : "Sign in"}</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a
              href="/owner/login"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="link-owner-login"
            >
              <Shield className="h-3 w-3" />
              Platform Owner login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
