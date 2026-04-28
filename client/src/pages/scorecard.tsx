import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import {
  LineChart, Line, AreaChart, Area,
  BarChart, Bar, Cell, RadarChart, Radar,
  PieChart, Pie,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  ReferenceLine, LabelList,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight,
  Save, Check, AlertTriangle, AlertCircle, CheckCircle2, Clock,
  Activity, Plus, Trash2, Download, Upload, FileSpreadsheet,
  RefreshCw, Building2, Edit2, BarChart2, Trophy,
  GripVertical, ArrowUpRight, ArrowDownRight, ArrowRight,
  Target, Zap, Eye, Maximize2, X, Lightbulb, Sparkles, Globe, Copy, Link2,
  FileImage, FileText, Loader2, ChevronDown, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type Perspective = "Financial" | "Customer" | "Internal" | "Learning";
interface KpiDef {
  id: string; name: string; perspective: Perspective;
  unit: string; target: number; lowerIsBetter?: boolean;
  targetType?: "numeric" | "milestone_numeric" | "milestone_date";
  targetDate?: string;
  targetFrequency?: "monthly" | "annual";
  milestoneStartDate?: string;
}
type StatusCtx = { periodStore?: Record<string, number>; year?: number; month?: number };
interface BscDepartment {
  id: string; name: string; icon: string; color: string;
}

// ── Perspective colours ────────────────────────────────────────────────────────
const P_COLOR: Record<Perspective, { accent: string; bg: string; text: string; border: string }> = {
  Financial: { accent:"#3B82F6", bg:"bg-blue-50 dark:bg-blue-950/30",    text:"text-blue-700 dark:text-blue-300",    border:"border-blue-200 dark:border-blue-800" },
  Customer:  { accent:"#8B5CF6", bg:"bg-violet-50 dark:bg-violet-950/30", text:"text-violet-700 dark:text-violet-300", border:"border-violet-200 dark:border-violet-800" },
  Internal:  { accent:"#F59E0B", bg:"bg-amber-50 dark:bg-amber-950/30",   text:"text-amber-700 dark:text-amber-300",   border:"border-amber-200 dark:border-amber-800" },
  Learning:  { accent:"#10B981", bg:"bg-emerald-50 dark:bg-emerald-950/30",text:"text-emerald-700 dark:text-emerald-300",border:"border-emerald-200 dark:border-emerald-800" },
};
const PERSP_LABEL: Record<Perspective, string> = {
  Financial: "Financial", Customer: "Customer / Stakeholder",
  Internal: "Internal Process", Learning: "Learning & Growth",
};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DEPT_ICONS = ["✈️","🔧","💰","👥","🛡️","💻","📊","📋","⚙️","🏢","🚀","📦","🏗️","🌐","🔑"];
const DEPT_COLORS = ["#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444","#06B6D4","#EC4899","#F97316"];

// ── Default departments ─────────────────────────────────────────────────────────
const DEFAULT_DEPARTMENTS: BscDepartment[] = [
  { id:"ops",  name:"Operations",  icon:"✈️", color:"#3B82F6" },
  { id:"eng",  name:"Engineering", icon:"🔧", color:"#8B5CF6" },
  { id:"fin",  name:"Finance",     icon:"💰", color:"#10B981" },
  { id:"hr",   name:"HR",          icon:"👥", color:"#F59E0B" },
  { id:"qhse", name:"QHSE",        icon:"🛡️", color:"#EF4444" },
  { id:"it",   name:"IT",          icon:"💻", color:"#06B6D4" },
  { id:"comm", name:"Commercial",  icon:"📊", color:"#8B5CF6" },
  { id:"camo", name:"CAMO",        icon:"📋", color:"#F59E0B" },
  { id:"mro",  name:"MRO",         icon:"⚙️", color:"#10B981" },
  { id:"corp", name:"Corporate",   icon:"🏢", color:"#3B82F6" },
];

// ── KPI templates per department ─────────────────────────────────────────────
const DEPT_KPIS: Record<string, KpiDef[]> = {
  ops: [
    { id:"ops_f1", name:"Revenue per Aircraft",    perspective:"Financial", unit:"USD",   target:12000 },
    { id:"ops_f2", name:"Cost Efficiency Ratio",   perspective:"Financial", unit:"%",     target:72,   lowerIsBetter:true },
    { id:"ops_c1", name:"On-Time Performance",     perspective:"Customer",  unit:"%",     target:95 },
    { id:"ops_c2", name:"Customer Score",          perspective:"Customer",  unit:"/5",    target:4.3 },
    { id:"ops_i1", name:"Turnaround Compliance",   perspective:"Internal",  unit:"%",     target:94 },
    { id:"ops_i2", name:"Ground Damage Rate",      perspective:"Internal",  unit:"/1000", target:0.5, lowerIsBetter:true },
    { id:"ops_l1", name:"Training Completion",     perspective:"Learning",  unit:"%",     target:95 },
    { id:"ops_l2", name:"Turnover Rate",           perspective:"Learning",  unit:"%",     target:10,  lowerIsBetter:true },
  ],
  eng: [
    { id:"eng_f1", name:"Maintenance Cost/AC",    perspective:"Financial", unit:"USD",  target:8500, lowerIsBetter:true },
    { id:"eng_f2", name:"Budget Utilization",     perspective:"Financial", unit:"%",    target:95 },
    { id:"eng_c1", name:"SLA Compliance",         perspective:"Customer",  unit:"%",    target:98 },
    { id:"eng_c2", name:"Client Satisfaction",    perspective:"Customer",  unit:"/5",   target:4.2 },
    { id:"eng_i1", name:"Equipment Availability", perspective:"Internal",  unit:"%",    target:96 },
    { id:"eng_i2", name:"Defect Rate",            perspective:"Internal",  unit:"%",    target:1.5, lowerIsBetter:true },
    { id:"eng_l1", name:"Certifications Issued",  perspective:"Learning",  unit:"#",    target:24 },
    { id:"eng_l2", name:"Tooling Compliance",     perspective:"Learning",  unit:"%",    target:100 },
  ],
  fin: [
    { id:"fin_f1", name:"Operating Margin",       perspective:"Financial", unit:"%",    target:22 },
    { id:"fin_f2", name:"Cash Conversion Days",   perspective:"Financial", unit:"days", target:45,  lowerIsBetter:true },
    { id:"fin_c1", name:"Internal Satisfaction",  perspective:"Customer",  unit:"/5",   target:4.0 },
    { id:"fin_c2", name:"Report Accuracy",        perspective:"Customer",  unit:"%",    target:99 },
    { id:"fin_i1", name:"Month-End Close Days",   perspective:"Internal",  unit:"days", target:5,   lowerIsBetter:true },
    { id:"fin_i2", name:"Budget Variance",        perspective:"Internal",  unit:"%",    target:5,   lowerIsBetter:true },
    { id:"fin_l1", name:"Staff Training Hours",   perspective:"Learning",  unit:"hrs",  target:40 },
    { id:"fin_l2", name:"Digital Adoption",       perspective:"Learning",  unit:"%",    target:80 },
  ],
  hr: [
    { id:"hr_f1", name:"Cost per Hire",           perspective:"Financial", unit:"USD",  target:2500, lowerIsBetter:true },
    { id:"hr_f2", name:"Training Cost/Employee",  perspective:"Financial", unit:"USD",  target:1200 },
    { id:"hr_c1", name:"Employee Satisfaction",   perspective:"Customer",  unit:"/5",   target:4.2 },
    { id:"hr_c2", name:"Offer Acceptance Rate",   perspective:"Customer",  unit:"%",    target:85 },
    { id:"hr_i1", name:"Time to Hire",            perspective:"Internal",  unit:"days", target:30,  lowerIsBetter:true },
    { id:"hr_i2", name:"Absenteeism Rate",        perspective:"Internal",  unit:"%",    target:3,   lowerIsBetter:true },
    { id:"hr_l1", name:"Training Completion",     perspective:"Learning",  unit:"%",    target:95 },
    { id:"hr_l2", name:"Turnover Rate",           perspective:"Learning",  unit:"%",    target:12,  lowerIsBetter:true },
  ],
  qhse: [
    { id:"q_f1",  name:"Safety Budget Util",      perspective:"Financial", unit:"%",    target:95 },
    { id:"q_c1",  name:"Audit Compliance Score",  perspective:"Customer",  unit:"%",    target:97 },
    { id:"q_c2",  name:"Incident Resolution Days",perspective:"Customer",  unit:"days", target:5,   lowerIsBetter:true },
    { id:"q_i1",  name:"FOD Incidents",           perspective:"Internal",  unit:"#",    target:0,   lowerIsBetter:true },
    { id:"q_i2",  name:"Near Miss Reports Filed", perspective:"Internal",  unit:"#",    target:12 },
    { id:"q_l1",  name:"Safety Training Compl.",  perspective:"Learning",  unit:"%",    target:100 },
    { id:"q_l2",  name:"Safety Culture Score",    perspective:"Learning",  unit:"/5",   target:4.5 },
  ],
  it: [
    { id:"it_i1", name:"Key Deliverables Completion (%)",                           perspective:"Internal", unit:"%",  target:100, targetType:"milestone_numeric" },
    { id:"it_c1", name:"IT System Uptime %",                                        perspective:"Customer", unit:"%",  target:85 },
    { id:"it_i2", name:"IT Helpdesk SLA Compliance %",                              perspective:"Internal", unit:"%",  target:90 },
    { id:"it_c2", name:"System Uptime % (Infra)",                                   perspective:"Customer", unit:"%",  target:95 },
    { id:"it_i3", name:"Incident Resolution Time (hrs)",                            perspective:"Internal", unit:"hrs",target:48 },
    { id:"it_c3", name:"IT Satisfaction Score (Survey)",                            perspective:"Customer", unit:"/5", target:3,   targetFrequency:"annual" },
    { id:"it_l1", name:"IT Training Participation Rate %",                          perspective:"Learning", unit:"%",  target:90 },
    { id:"it_l2", name:"IT Cybersecurity & System Awareness Activities (Count)",    perspective:"Learning", unit:"#",  target:4 },
    { id:"it_i4", name:"Monthly Security Incident Reporting & Improvement Actions", perspective:"Internal", unit:"#",  target:12 },
    { id:"it_f1", name:"IT Budget Adherence %",                                     perspective:"Financial",unit:"%",  target:100, lowerIsBetter:true },
    { id:"it_i5", name:"Review Process & Procedure Update Rate %",                  perspective:"Internal", unit:"%",  target:0 },
    { id:"it_i6", name:"Review Process and Procedures",                             perspective:"Internal", unit:"%",  target:90 },
    { id:"it_c4", name:"# Level-1 audit findings",                                  perspective:"Customer", unit:"#",  target:0,   lowerIsBetter:true },
  ],
  comm: [
    { id:"co_f1", name:"Revenue Growth",          perspective:"Financial", unit:"%",    target:10 },
    { id:"co_f2", name:"Contract Value",          perspective:"Financial", unit:"MUSD", target:25 },
    { id:"co_c1", name:"Customer Retention",      perspective:"Customer",  unit:"%",    target:92 },
    { id:"co_c2", name:"Customer Satisfaction",   perspective:"Customer",  unit:"/5",   target:4.3 },
    { id:"co_i1", name:"Proposal Win Rate",       perspective:"Internal",  unit:"%",    target:40 },
    { id:"co_i2", name:"Contract Renewal Rate",   perspective:"Internal",  unit:"%",    target:85 },
    { id:"co_l1", name:"Sales Training Hours",    perspective:"Learning",  unit:"hrs",  target:40 },
    { id:"co_l2", name:"Product Knowledge Score", perspective:"Learning",  unit:"%",    target:85 },
  ],
  camo: [
    { id:"ca_f1", name:"Maintenance Budget Util", perspective:"Financial", unit:"%",    target:92 },
    { id:"ca_c1", name:"Airworthiness Compliance",perspective:"Customer",  unit:"%",    target:100 },
    { id:"ca_c2", name:"Customer Satisfaction",   perspective:"Customer",  unit:"/5",   target:4.4 },
    { id:"ca_i1", name:"Aircraft Availability",   perspective:"Internal",  unit:"%",    target:96 },
    { id:"ca_i2", name:"On-Time Maintenance",     perspective:"Internal",  unit:"%",    target:95 },
    { id:"ca_l1", name:"Tech Training Hours",     perspective:"Learning",  unit:"hrs",  target:60 },
    { id:"ca_l2", name:"Regulatory Compliance",   perspective:"Learning",  unit:"%",    target:100 },
  ],
  mro: [
    { id:"mr_f1", name:"MRO Revenue",             perspective:"Financial", unit:"MUSD", target:8 },
    { id:"mr_f2", name:"Cost per Man-Hour",        perspective:"Financial", unit:"USD",  target:85, lowerIsBetter:true },
    { id:"mr_c1", name:"TAT Compliance",           perspective:"Customer",  unit:"%",    target:93 },
    { id:"mr_c2", name:"Customer Score",           perspective:"Customer",  unit:"/5",   target:4.2 },
    { id:"mr_i1", name:"Rework Rate",              perspective:"Internal",  unit:"%",    target:2,  lowerIsBetter:true },
    { id:"mr_i2", name:"First-Time Fix Rate",      perspective:"Internal",  unit:"%",    target:88 },
    { id:"mr_l1", name:"Certification Rate",       perspective:"Learning",  unit:"%",    target:95 },
    { id:"mr_l2", name:"Tech Training Hours",      perspective:"Learning",  unit:"hrs",  target:50 },
  ],
  corp: [
    { id:"cr_f1", name:"Revenue Growth",          perspective:"Financial", unit:"%",     target:8 },
    { id:"cr_f2", name:"EBITDA Margin",            perspective:"Financial", unit:"%",     target:22 },
    { id:"cr_f3", name:"Overhead Ratio",           perspective:"Financial", unit:"%",     target:18, lowerIsBetter:true },
    { id:"cr_f4", name:"Cost per Turn",            perspective:"Financial", unit:"USD",   target:850, lowerIsBetter:true },
    { id:"cr_c1", name:"On-Time Performance",      perspective:"Customer",  unit:"%",     target:95 },
    { id:"cr_c2", name:"Customer Satisfaction",    perspective:"Customer",  unit:"/5",    target:4.2 },
    { id:"cr_c3", name:"SLA Compliance",           perspective:"Customer",  unit:"%",     target:98 },
    { id:"cr_c4", name:"Client Retention Rate",    perspective:"Customer",  unit:"%",     target:92 },
    { id:"cr_i1", name:"Ground Damage Rate",       perspective:"Internal",  unit:"/1000", target:0.5, lowerIsBetter:true },
    { id:"cr_i2", name:"Turnaround Compliance",    perspective:"Internal",  unit:"%",     target:94 },
    { id:"cr_i3", name:"Equipment Availability",   perspective:"Internal",  unit:"%",     target:96 },
    { id:"cr_l1", name:"Training Hrs/Employee",    perspective:"Learning",  unit:"hrs",   target:40 },
    { id:"cr_l2", name:"Staff Turnover Rate",      perspective:"Learning",  unit:"%",     target:12, lowerIsBetter:true, targetFrequency:"annual" },
    { id:"cr_l3", name:"Safety Training Compl.",   perspective:"Learning",  unit:"%",     target:100 },
    { id:"cr_l4", name:"Digital Tool Adoption",    perspective:"Learning",  unit:"%",     target:80 },
    { id:"cr_l5", name:"ARMS System Replacement",  perspective:"Learning",  unit:"%",     target:100, targetType:"milestone_numeric", milestoneStartDate:"2026-01" },
    { id:"cr_l6", name:"Leadership Dev. Program",  perspective:"Learning",  unit:"%",     target:100, targetType:"milestone_date", targetDate:"2026-06", milestoneStartDate:"2026-01" },
  ],
};

// Generic KPI template for user-added departments
function genericKpis(deptId: string): KpiDef[] {
  return [
    { id:`${deptId}_f1`, name:"Revenue / Budget Utilization", perspective:"Financial", unit:"%",  target:95 },
    { id:`${deptId}_f2`, name:"Cost Efficiency",              perspective:"Financial", unit:"%",  target:80 },
    { id:`${deptId}_c1`, name:"Customer Satisfaction",        perspective:"Customer",  unit:"/5", target:4.0 },
    { id:`${deptId}_c2`, name:"Service Level Achievement",    perspective:"Customer",  unit:"%",  target:95 },
    { id:`${deptId}_i1`, name:"Process Compliance",           perspective:"Internal",  unit:"%",  target:98 },
    { id:`${deptId}_i2`, name:"Incident Rate",                perspective:"Internal",  unit:"#",  target:0, lowerIsBetter:true },
    { id:`${deptId}_l1`, name:"Training Completion",          perspective:"Learning",  unit:"%",  target:90 },
    { id:`${deptId}_l2`, name:"Employee Satisfaction",        perspective:"Learning",  unit:"/5", target:4.0 },
  ];
}

// ── Persistence (localStorage cache + DB sync) ────────────────────────────────
const STORE_KEY        = "ghc_beacon_v2";
const DEPT_KEY         = "bsc_departments";
const WEIGHTS_KEY      = "ghc_beacon_weights_v1";
const CORP_SEED_VER    = "ghc_corp_seed_v4"; // bump when seed data changes
const BSC_COMPANY_KEY  = "bsc_company_id";   // tracks which company owns the cached data

// Wipe all BSC-related localStorage so stale data never bleeds between accounts
function clearBscLocalStorage() {
  [STORE_KEY, DEPT_KEY, WEIGHTS_KEY, CORP_SEED_VER, "ghc_beacon_kpi_override_v1"].forEach(k => localStorage.removeItem(k));
}

function loadWeights(deptId: string): Record<string, number> {
  try {
    const all = JSON.parse(localStorage.getItem(WEIGHTS_KEY) || "{}");
    return all[deptId] || {};
  } catch { return {}; }
}
function saveWeights(deptId: string, w: Record<string, number>) {
  try {
    const all = JSON.parse(localStorage.getItem(WEIGHTS_KEY) || "{}");
    all[deptId] = w;
    localStorage.setItem(WEIGHTS_KEY, JSON.stringify(all));
  } catch {}
}

function loadStore(): Record<string, Record<string, number>> {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch { return {}; }
}
function saveStoreLocal(d: Record<string, Record<string, number>>) {
  localStorage.setItem(STORE_KEY, JSON.stringify(d));
}
async function saveStoreToDB(d: Record<string, Record<string, number>>): Promise<boolean> {
  try {
    const res = await fetch("/api/scorecard/actuals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store: d }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
async function saveStore(d: Record<string, Record<string, number>>): Promise<boolean> {
  saveStoreLocal(d);
  return saveStoreToDB(d);
}

// KPI Override — stores the FULL KPI set for a department as defined by the last Excel upload.
// When present, this completely replaces the predefined KPIs for that department.
const KPI_OVERRIDE_KEY = "ghc_beacon_kpi_override_v1";

function loadKpiOverride(deptId: string): KpiDef[] | null {
  try {
    const all = JSON.parse(localStorage.getItem(KPI_OVERRIDE_KEY) || "{}");
    return all[deptId] ?? null;
  } catch { return null; }
}
function saveKpiOverride(deptId: string, kpis: KpiDef[]) {
  try {
    const all = JSON.parse(localStorage.getItem(KPI_OVERRIDE_KEY) || "{}");
    all[deptId] = kpis;
    localStorage.setItem(KPI_OVERRIDE_KEY, JSON.stringify(all));
  } catch {}
}
// Returns ALL KPI definitions: predefined + any user-uploaded overrides across all departments.
// Override KPIs win over predefined ones when IDs collide (user may have updated targets etc).
function loadAllEffectiveKpis(): KpiDef[] {
  const map = new Map<string, KpiDef>();
  Object.values(DEPT_KPIS).flat().forEach(k => map.set(k.id, k));
  try {
    const all = JSON.parse(localStorage.getItem(KPI_OVERRIDE_KEY) || "{}");
    Object.values(all).flat().forEach((k: any) => map.set(k.id, k));
  } catch {}
  return [...map.values()];
}

// Parse a perspective value from an uploaded file into the canonical Perspective type
function parsePerspective(val: string): Perspective | null {
  const v = val.toLowerCase().replace(/[^a-z]/g, "");
  if (v.startsWith("fin")) return "Financial";
  if (v.startsWith("cust") || v.startsWith("stake")) return "Customer";
  if (v.startsWith("int") || v.startsWith("proc")) return "Internal";
  if (v.startsWith("learn") || v.startsWith("grow") || v.startsWith("innov")) return "Learning";
  return null;
}

function loadDepartments(): BscDepartment[] {
  try { const d = localStorage.getItem(DEPT_KEY); return d ? JSON.parse(d) : []; }
  catch { return []; }
}
async function saveDepartments(d: BscDepartment[]): Promise<boolean> {
  localStorage.setItem(DEPT_KEY, JSON.stringify(d));
  try {
    const res = await fetch("/api/scorecard/departments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d.map((dep, i) => ({ deptId: dep.id, name: dep.name, icon: dep.icon, color: dep.color, sortOrder: i }))),
    });
    return res.ok;
  } catch { return false; }
}

// Guard: if the logged-in company differs from what's cached, wipe all BSC localStorage
// so stale data from another account never bleeds through.
async function ensureCompanyCache() {
  try {
    const res = await fetch("/api/auth/me");
    if (!res.ok) return;
    const user = await res.json() as { companyId: number };
    const stored = localStorage.getItem(BSC_COMPANY_KEY);
    if (stored !== String(user.companyId)) {
      clearBscLocalStorage();
      localStorage.setItem(BSC_COMPANY_KEY, String(user.companyId));
    }
  } catch {}
}

async function syncActualsFromDb() {
  try {
    const [actualsRes] = await Promise.all([
      fetch("/api/scorecard/actuals"),
      ensureCompanyCache(),
    ]);
    if (!actualsRes.ok) return undefined;
    const dbStore = await actualsRes.json() as Record<string, Record<string, number>>;
    // DB is the single source of truth — replace local cache entirely.
    // When DB returns empty, remove stale localStorage so old data can't linger.
    if (Object.keys(dbStore).length === 0) {
      localStorage.removeItem(STORE_KEY);
      return {};
    }
    localStorage.setItem(STORE_KEY, JSON.stringify(dbStore));
    return dbStore;
  } catch { return undefined; }
}

async function syncDepartmentsFromDb(): Promise<BscDepartment[] | undefined> {
  try {
    const res = await fetch("/api/scorecard/departments");
    if (!res.ok) return undefined;
    const rows = await res.json() as { deptId: string; name: string; icon: string; color: string }[];
    if (rows.length === 0) {
      // No departments on server — clear stale cache so user sees the empty state
      localStorage.removeItem(DEPT_KEY);
      return [];
    }
    const depts: BscDepartment[] = rows.map(r => ({ id: r.deptId, name: r.name, icon: r.icon, color: r.color }));
    localStorage.setItem(DEPT_KEY, JSON.stringify(depts));
    return depts;
  } catch { return undefined; }
}

function isSeedStale(): boolean {
  return localStorage.getItem(CORP_SEED_VER) !== "ok";
}

function seedCorpSampleData() {
  const existing = loadStore();
  // Remove any old Corporate KPI actuals first so stale values don't linger
  const corpKpiIds = new Set((DEPT_KPIS.corp || []).map(k => k.id));
  const merged: Record<string, Record<string, number>> = {};
  for (const [pk, vals] of Object.entries(existing)) {
    const without: Record<string, number> = {};
    for (const [kid, v] of Object.entries(vals)) {
      if (!corpKpiIds.has(kid)) without[kid] = v;
    }
    if (Object.keys(without).length > 0) merged[pk] = without;
  }
  // Targets: cr_f1=8%(hi) cr_f2=22%(hi) cr_f3=18%(lo) cr_f4=850USD(lo)
  //          cr_c1=95%(hi) cr_c2=4.2/5(hi) cr_c3=98%(hi) cr_c4=92%(hi)
  //          cr_i1=0.5/1k(lo) cr_i2=94%(hi) cr_i3=96%(hi)
  //          cr_l1=40hrs(hi) cr_l2=12%(lo) cr_l3=100%(hi) cr_l4=80%(hi)
  // Apr-2026 status → 4 green | 9 amber | 2 red → perf score ≈ 84%
  const CORP_SAMPLE_DATA: Record<string, Record<string, number>> = {
    // Oct-25: cr_l2 now monthly rate (annualized × 12 vs 12% annual target)
    "2025-10": { cr_f1:2.8, cr_f2:15.5, cr_f3:23.8, cr_f4:1012, cr_c1:83.4, cr_c2:3.4, cr_c3:95.8, cr_c4:84.2, cr_i1:0.89, cr_i2:90.1, cr_i3:90.8, cr_l1:26, cr_l2:1.84, cr_l3:82, cr_l4:65 },
    "2025-11": { cr_f1:3.2, cr_f2:17.8, cr_f3:21.2, cr_f4:991,  cr_c1:84.8, cr_c2:3.5, cr_c3:96.4, cr_c4:85.5, cr_i1:0.78, cr_i2:90.8, cr_i3:91.2, cr_l1:28, cr_l2:1.73, cr_l3:84, cr_l4:67 },
    "2025-12": { cr_f1:3.8, cr_f2:17.8, cr_f3:20.6, cr_f4:974,  cr_c1:86.4, cr_c2:3.6, cr_c3:97.1, cr_c4:86.8, cr_i1:0.68, cr_i2:91.5, cr_i3:92.1, cr_l1:30, cr_l2:1.60, cr_l3:86, cr_l4:70 },
    // Jan-26: ARMS 5% actual vs 5% milestone=Green; Leadership 10% actual vs expected 17%=Red (1/6 elapsed)
    "2026-01": { cr_f1:3.4, cr_f2:17.6, cr_f3:21.4, cr_f4:1002, cr_c1:85.8, cr_c2:3.5, cr_c3:96.8, cr_c4:85.1, cr_i1:0.74, cr_i2:91.2, cr_i3:91.6, cr_l1:27, cr_l2:1.70, cr_l3:83, cr_l4:68, cr_l5:5,  "m_cr_l5":5,  cr_l6:10 },
    // Feb-26: ARMS 15% actual vs 15% milestone=Green; Leadership 35% vs expected 33%=Green (2/6)
    "2026-02": { cr_f1:3.9, cr_f2:17.8, cr_f3:20.9, cr_f4:982,  cr_c1:87.1, cr_c2:3.6, cr_c3:96.9, cr_c4:86.8, cr_i1:0.72, cr_i2:91.8, cr_i3:91.9, cr_l1:29, cr_l2:1.57, cr_l3:84, cr_l4:69, cr_l5:15, "m_cr_l5":15, cr_l6:35 },
    // Mar-26: ARMS 12% vs 20% milestone=Red; Leadership 45% vs expected 50%=Amber (3/6)
    "2026-03": { cr_f1:4.0, cr_f2:17.9, cr_f3:20.8, cr_f4:971,  cr_c1:88.5, cr_c2:3.7, cr_c3:97.2, cr_c4:87.8, cr_i1:0.71, cr_i2:91.9, cr_i3:92.0, cr_l1:31, cr_l2:1.52, cr_l3:85, cr_l4:70, cr_l5:12, "m_cr_l5":20, cr_l6:45 },
    // Apr-26: ARMS 25% vs 30% milestone=Amber; Leadership 60% vs expected 67%=Amber (4/6)
    "2026-04": { cr_f1:4.2, cr_f2:17.8, cr_f3:21.3, cr_f4:968,  cr_c1:89.2, cr_c2:3.8, cr_c3:97.4, cr_c4:88.6, cr_i1:0.58, cr_i2:92.1, cr_i3:91.4, cr_l1:32, cr_l2:1.44, cr_l3:85, cr_l4:68, cr_l5:25, "m_cr_l5":30, cr_l6:60 },
  };
  for (const [pk, vals] of Object.entries(CORP_SAMPLE_DATA)) {
    merged[pk] = { ...(merged[pk] || {}), ...vals };
  }
  saveStoreLocal(merged);
  localStorage.setItem(CORP_SEED_VER, "ok");
}
function getKpisForDept(id: string): KpiDef[] {
  return DEPT_KPIS[id] || genericKpis(id);
}
function periodKey(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

// ── Number formatting ─────────────────────────────────────────────────────────
const CURRENCY_UNITS = new Set(["QAR","USD","EUR","GBP","AED","SAR","OMR","KWD","BHD","JOD","EGP","INR","ZAR","NGN","PKR","LKR","MYR","SGD","HKD","CHF","CAD","AUD","NZD","SEK","NOK","DKK","JPY","CNY","KRW","THB","IDR","PHP","BRL","MXN","RUB","TRY"]);
// Format a KPI value for display.
// Currency units → 2 decimal places + thousands separators (e.g. 1,123,256.87)
// Large non-currency numbers ≥1000 → thousands separators, 0-2dp
// Small numbers → strip floating-point noise (max 4dp, trailing zeros removed)
function fmtVal(v: number | null | undefined, unit: string): string {
  if (v === null || v === undefined || isNaN(Number(v))) return "—";
  const n = Number(v);
  const u = (unit || "").trim().toUpperCase();
  const isCurrency = CURRENCY_UNITS.has(u);
  if (isCurrency || Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: isCurrency ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(n);
  }
  // Strip floating-point noise (e.g. 1.8699999 → 1.87), remove trailing zeros
  return String(+n.toFixed(4));
}

// ── KPI logic ────────────────────────────────────────────────────────────────
function effectiveTargetAndActual(
  k: KpiDef, actual: number, ctx?: StatusCtx
): { effectiveTarget: number; effectiveActual: number; expectedPct?: number } {
  const periodStore = ctx?.periodStore ?? {};
  const year = ctx?.year ?? new Date().getFullYear();
  const month = ctx?.month ?? new Date().getMonth();

  if (k.targetType === "milestone_numeric") {
    const ms = periodStore[`m_${k.id}`];
    const effectiveTarget = (ms !== undefined && ms !== null) ? ms : k.target;
    return { effectiveTarget, effectiveActual: actual };
  }
  if (k.targetType === "milestone_date" && k.targetDate) {
    const [startY, startM] = (k.milestoneStartDate || "2026-01").split("-").map(Number);
    const [endY, endM] = k.targetDate.split("-").map(Number);
    const totalMonths = (endY - startY) * 12 + (endM - startM);
    const elapsedMonths = (year - startY) * 12 + ((month + 1) - startM);
    const expectedPct = totalMonths > 0
      ? Math.min(100, Math.max(0, (elapsedMonths / totalMonths) * 100))
      : 100;
    return { effectiveTarget: Math.max(1, expectedPct), effectiveActual: actual, expectedPct };
  }
  if (k.targetFrequency === "annual") {
    return { effectiveTarget: k.target, effectiveActual: actual * 12 };
  }
  return { effectiveTarget: k.target, effectiveActual: actual };
}

function getStatus(k: KpiDef, actual: number | null, ctx?: StatusCtx): "green" | "amber" | "red" | "nodata" {
  if (actual === null || actual === undefined || isNaN(Number(actual))) return "nodata";
  const { effectiveTarget, effectiveActual } = effectiveTargetAndActual(k, Number(actual), ctx);
  const pct = k.lowerIsBetter
    ? effectiveTarget === 0 ? (effectiveActual === 0 ? 100 : 0) : Math.max(0, (1 - (effectiveActual - effectiveTarget) / Math.abs(effectiveTarget)) * 100)
    : effectiveTarget === 0 ? 100 : (effectiveActual / effectiveTarget) * 100;
  if (pct >= 95) return "green";
  if (pct >= 80) return "amber";
  return "red";
}
function getTrend(cur: number | null, prev: number | null): "up" | "down" | "flat" {
  if (cur === null || prev === null) return "flat";
  if (Number(cur) > Number(prev) + 0.001) return "up";
  if (Number(cur) < Number(prev) - 0.001) return "down";
  return "flat";
}
function healthPct(kpis: KpiDef[], actuals: Record<string, number | null>, ctx?: StatusCtx): number {
  const withData = kpis.filter(k => actuals[k.id] !== null && actuals[k.id] !== undefined);
  if (!withData.length) return 0;
  return Math.round(withData.filter(k => getStatus(k, actuals[k.id]!, ctx) === "green").length / withData.length * 100);
}

function performanceScore(kpis: KpiDef[], actuals: Record<string, number | null>, weights: Record<string, number>, ctx?: StatusCtx): number {
  const withData = kpis.filter(k => actuals[k.id] !== null && actuals[k.id] !== undefined);
  if (!withData.length) return 0;

  const hasUserWeights = withData.some(k => (weights[k.id] ?? 0) > 0);
  const equalWeight    = 100 / withData.length;

  let totalScore  = 0;
  let totalWeight = 0;

  for (const k of withData) {
    const actual = Number(actuals[k.id]!);
    const w = hasUserWeights ? (weights[k.id] ?? 0) : equalWeight;
    const { effectiveTarget, effectiveActual } = effectiveTargetAndActual(k, actual, ctx);

    let achievement: number;
    if (k.lowerIsBetter) {
      achievement = effectiveActual === 0 ? 100 : Math.min((effectiveTarget / effectiveActual) * 100, 100);
    } else {
      achievement = effectiveTarget === 0 ? 100 : Math.min((effectiveActual / effectiveTarget) * 100, 100);
    }

    totalScore  += achievement * w;
    totalWeight += w;
  }

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

// ── Small UI components ───────────────────────────────────────────────────────
function RagBadge({ status }: { status: "green" | "amber" | "red" | "nodata" }) {
  const map = {
    green:  { label:"On Track",  cls:"bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", Icon:CheckCircle2 },
    amber:  { label:"At Risk",   cls:"bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",           Icon:AlertTriangle },
    red:    { label:"Off Track", cls:"bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",                     Icon:AlertCircle },
    nodata: { label:"No Data",   cls:"bg-muted text-muted-foreground border-border",                                                         Icon:Clock },
  };
  const { label, cls, Icon } = map[status];
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium border text-xs", cls)}>
      <Icon className="h-3 w-3" />{label}
    </Badge>
  );
}

function TrendArrow({ trend, lowerIsBetter }: { trend:"up"|"down"|"flat"; lowerIsBetter?:boolean }) {
  const good = lowerIsBetter ? trend==="down" : trend==="up";
  const bad  = lowerIsBetter ? trend==="up"   : trend==="down";
  if (trend==="up")   return <TrendingUp  className={cn("h-4 w-4", good?"text-emerald-500":bad?"text-red-500":"text-amber-500")} />;
  if (trend==="down") return <TrendingDown className={cn("h-4 w-4", good?"text-emerald-500":bad?"text-red-500":"text-amber-500")} />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function HealthRing({ pct, size=52 }: { pct:number; size?:number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const color = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${(pct/100)*c} ${c}`} strokeLinecap="round"
        style={{ transition:"stroke-dasharray .5s ease" }} />
      <text x={size/2} y={size/2} dominantBaseline="middle" textAnchor="middle"
        fill={color} fontSize={size >= 56 ? 11 : 9} fontWeight="700"
        style={{ transform:`rotate(90deg)`, transformOrigin:`${size/2}px ${size/2}px` }}>
        {pct}%
      </text>
    </svg>
  );
}

function PeriodSelector({ year, month, onChange }: { year:number; month:number; onChange:(y:number,m:number)=>void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 border rounded-lg px-2 py-1.5 bg-background">
        <button onClick={()=>onChange(year-1,month)} className="p-0.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-sm font-semibold px-1 min-w-[38px] text-center">{year}</span>
        <button onClick={()=>onChange(year+1,month)} className="p-0.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex gap-1 flex-wrap">
        {MONTHS.map((m,i) => (
          <button key={m} onClick={()=>onChange(year,i)}
            className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-all",
              i===month ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ kpi, actual, prevActual, onClick }: { kpi:KpiDef; actual:number|null; prevActual:number|null; onClick?:()=>void }) {
  const status = getStatus(kpi, actual);
  const trend  = getTrend(actual, prevActual);
  const pc     = P_COLOR[kpi.perspective];
  return (
    <Card className="hover:shadow-md transition-all border-l-[3px] cursor-pointer"
      style={{ borderLeftColor:pc.accent }} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-sm font-medium text-foreground leading-tight">{kpi.name}</p>
          <RagBadge status={status} />
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {actual !== null ? fmtVal(actual, kpi.unit) : <span className="text-muted-foreground text-base font-normal">—</span>}
              <span className="text-xs text-muted-foreground ml-1 font-normal">{kpi.unit}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Target: {fmtVal(kpi.target, kpi.unit)} {kpi.unit}</p>
          </div>
          <TrendArrow trend={trend} lowerIsBetter={kpi.lowerIsBetter} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Add Department Dialog ─────────────────────────────────────────────────────
function AddDeptDialog({ open, onClose, onAdd }: { open:boolean; onClose:()=>void; onAdd:(d:BscDepartment)=>void }) {
  const [name, setName]   = useState("");
  const [icon, setIcon]   = useState("🏢");
  const [color, setColor] = useState(DEPT_COLORS[0]);

  const handleAdd = () => {
    if (!name.trim()) return;
    // Try to match against known departments first (by name) so KPIs resolve correctly
    const nameSlug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const knownDept = DEFAULT_DEPARTMENTS.find(d =>
      d.name.toLowerCase().replace(/[^a-z0-9]/g, "") === nameSlug
    );
    // Also match against DEPT_KPIS keys directly
    const knownKey = knownDept?.id ?? Object.keys(DEPT_KPIS).find(k => k === nameSlug);
    const id = knownKey ?? (name.trim().toLowerCase().replace(/[^a-z0-9]/g,"_") + "_" + Date.now());
    onAdd({ id, name:name.trim(), icon, color });
    setName(""); setIcon("🏢"); setColor(DEPT_COLORS[0]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Department</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Department Name</Label>
            <Input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Ground Handling"
              data-testid="input-dept-name" onKeyDown={e=>{ if(e.key==="Enter") handleAdd(); }} />
          </div>
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {DEPT_ICONS.map(ic=>(
                <button key={ic} onClick={()=>setIcon(ic)}
                  className={cn("text-xl p-1.5 rounded-lg border-2 transition-all", ic===icon?"border-primary bg-primary/5":"border-transparent hover:border-border")}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Colour</Label>
            <div className="flex gap-2 flex-wrap">
              {DEPT_COLORS.map(c=>(
                <button key={c} onClick={()=>setColor(c)}
                  className={cn("w-7 h-7 rounded-full border-2 transition-all", c===color?"border-foreground scale-110":"border-transparent")}
                  style={{ background:c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleAdd} data-testid="button-add-dept-confirm">
              <Plus className="h-4 w-4 mr-1.5" />Add Department
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Persistent period helpers ─────────────────────────────────────────────────
const PERIOD_STORE_KEY = "ghc_beacon_period_v1";
const PERIOD_STORE_VERSION = 2;

function previousMonthPeriod(date = new Date()) {
  const previous = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return { year: previous.getFullYear(), month: previous.getMonth() };
}

function persistPeriod(year: number, month: number) {
  try {
    localStorage.setItem(PERIOD_STORE_KEY, JSON.stringify({ year, month, version: PERIOD_STORE_VERSION }));
  } catch {}
}

function readPersistedPeriod() {
  const today = new Date();
  const defaultPeriod = previousMonthPeriod(today);
  try {
    const s = JSON.parse(localStorage.getItem(PERIOD_STORE_KEY) || "{}");
    const y = Number(s.year), m = Number(s.month);
    const isValid = y >= 2000 && m >= 0 && m <= 11;
    if (isValid && s.version === PERIOD_STORE_VERSION) return { year: y, month: m };
    if (isValid && !(y === today.getFullYear() && m === today.getMonth())) return { year: y, month: m };
  } catch {}
  return defaultPeriod;
}

// ═════════════════════════════════════════════════════════════════════════════
// LANDING PAGE — Department cards grid
// ═════════════════════════════════════════════════════════════════════════════
const PERSPECTIVES: Perspective[] = ["Financial", "Customer", "Internal", "Learning"];
const PERSP_INITIALS: Record<Perspective, string> = { Financial:"F", Customer:"C", Internal:"I", Learning:"L" };
const PERSP_FULL: Record<Perspective, string> = { Financial:"Financial", Customer:"Customer", Internal:"Internal Process", Learning:"Learning" };
const PERSP_WEIGHTS: Record<Perspective, number> = { Financial:30, Customer:25, Internal:25, Learning:20 };
const PERSP_COLORS: Record<Perspective, string>  = { Financial:"#3B82F6", Customer:"#8B5CF6", Internal:"#F59E0B", Learning:"#10B981" };
const PERSP_ICONS: Record<Perspective, string>   = { Financial:"💲", Customer:"🎯", Internal:"⚙️", Learning:"💡" };

function healthColor(hp: number) {
  return hp >= 95 ? "#10b981" : hp >= 85 ? "#3b82f6" : hp >= 70 ? "#f59e0b" : "#ef4444";
}
function healthStatus(hp: number): "green"|"amber"|"red" {
  return hp >= 85 ? "green" : hp >= 70 ? "amber" : "red";
}

function latestPeriodWithData(store: Record<string, Record<string, number>>, deptId?: string) {
  const keys = Object.entries(store || {})
    .filter(([, vals]) => Object.keys(vals || {}).some(kpiId => !deptId || kpiId.startsWith(`${deptId}_`) || (deptId === "corp" && kpiId.startsWith("cr_"))))
    .map(([key]) => {
      const match = key.match(/^.+_([0-9]{4}-[0-9]{2})$/);
      return match ? match[1] : key;
    })
    .filter(key => /^[0-9]{4}-[0-9]{2}$/.test(key))
    .sort();
  return keys.at(-1) || null;
}

function ScorecardLanding() {
  const [departments, setDepartments] = useState<BscDepartment[]>(loadDepartments);
  const [store, setStore] = useState(loadStore);
  const [showAdd, setShowAdd] = useState(false);
  const [deptSynced, setDeptSynced] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const today = new Date();
  const [year,  setYear]  = useState(() => readPersistedPeriod().year);
  const [month, setMonth] = useState(() => readPersistedPeriod().month);
  const pk  = periodKey(year, month);
  const ppk = month === 0 ? periodKey(year-1, 11) : periodKey(year, month-1);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const [, nav] = useLocation();

  // ── Sync from DB on mount ─────────────────────────────────────────────────
  useEffect(() => {
    syncDepartmentsFromDb().then(depts => {
      if (depts) setDepartments(depts);
      setDeptSynced(true);
    });
    syncActualsFromDb().then(merged => { if (merged) setStore(merged); });
  }, []);

  const shiftMonth = (delta: number) => {
    setMonth(m => {
      let nm = m + delta, ny = year;
      if (nm < 0)  { nm += 12; ny--; }
      if (nm > 11) { nm -= 12; ny++; }
      if (ny > today.getFullYear() || (ny === today.getFullYear() && nm > today.getMonth())) return m;
      setYear(ny);
      persistPeriod(ny, nm);
      return nm;
    });
  };

  const handleAdd = async (d: BscDepartment) => {
    const updated = [...departments, d];
    setDepartments(updated);
    const ok = await saveDepartments(updated);
    if (!ok) {
      setDepartments(departments);
      toast({ title: "Failed to save department", description: "Could not connect to the server. Please try again.", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["/api/scorecard/departments"] });
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = departments.filter(d => d.id !== id);
    setDepartments(updated);
    const ok = await saveDepartments(updated);
    if (!ok) {
      setDepartments(departments);
      toast({ title: "Failed to delete department", description: "Could not connect to the server. Please try again.", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["/api/scorecard/departments"] });
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIndex(index);
  };
  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) { setDragIndex(null); setOverIndex(null); return; }
    const reordered = [...departments];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setDepartments(reordered);
    saveDepartments(reordered);
    setDragIndex(null);
    setOverIndex(null);
  };
  const handleDragEnd = () => { setDragIndex(null); setOverIndex(null); };

  // ── Company-wide health computation ─────────────────────────────────────
  const companyStats = useMemo(() => {
    const periodCtx: StatusCtx = { periodStore: store?.[pk] || {}, year, month };
    const deptHps = departments.map(d => {
      const dk = loadKpiOverride(d.id) ?? getKpisForDept(d.id);
      const dw = loadWeights(d.id);
      const da: Record<string, number|null> = {};
      dk.forEach(k => { const v = store?.[pk]?.[k.id]; da[k.id] = v !== undefined ? Number(v) : null; });
      return performanceScore(dk, da, dw, periodCtx);
    });
    const withData = deptHps.filter(h => h > 0);
    const hp = withData.length ? Math.round(withData.reduce((s,h) => s+h, 0) / withData.length) : 0;
    return {
      hp,
      green: deptHps.filter(h => h >= 85).length,
      amber: deptHps.filter(h => h >= 70 && h < 85).length,
      red:   deptHps.filter(h => h < 70).length,
      total: departments.length,
    };
  }, [departments, store, pk]);

  const scorecardFreshness = useMemo(() => {
    const totalKpis = departments.reduce((sum, d) => sum + (loadKpiOverride(d.id) ?? getKpisForDept(d.id)).length, 0);
    const populated = departments.reduce((sum, d) => {
      const kpis = loadKpiOverride(d.id) ?? getKpisForDept(d.id);
      return sum + kpis.filter(k => store?.[pk]?.[k.id] !== undefined).length;
    }, 0);
    return {
      latestPeriod: latestPeriodWithData(store),
      completeness: totalKpis ? Math.round((populated / totalKpis) * 100) : 0,
      populated,
      totalKpis,
    };
  }, [departments, store, pk]);

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Balanced Scorecard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {companyStats.total} departments ·{" "}
            <span style={{ color: healthColor(companyStats.hp) }} className="font-medium">{companyStats.hp}% avg performance score</span>
            {" "}— based on KPIs with data entered for this period
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Month navigator */}
          <div className="flex items-center gap-1 border rounded-lg px-1 py-1 bg-background">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => shiftMonth(-1)}
              data-testid="button-prev-month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2 tabular-nums min-w-[90px] text-center">
              {MONTHS[month]} {year}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => shiftMonth(1)}
              disabled={isCurrentMonth} data-testid="button-next-month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setShowAdd(true)} data-testid="button-add-department">
            <Plus className="h-4 w-4 mr-1.5" />Add Department
          </Button>
        </div>
      </div>

      {/* ── hint ── */}
      <p className="text-xs text-muted-foreground flex items-center gap-1.5 -mt-2">
        <GripVertical className="h-3.5 w-3.5" />Drag to reorder · Click a card to open its scorecard
      </p>

      <Card className="border-violet-500/10 bg-gradient-to-r from-violet-500/5 via-background to-background" data-testid="section-bsc-freshness">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-violet-500" />
                Balanced Scorecard data freshness
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Use this to validate whether the current reporting period has enough KPI actuals for executive review.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:min-w-[540px]">
              <div className="rounded-xl border bg-background/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Latest KPI data</p>
                <p className="text-sm font-bold" data-testid="text-bsc-latest-period">{scorecardFreshness.latestPeriod || "No KPI data"}</p>
              </div>
              <div className="rounded-xl border bg-background/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Current completeness</p>
                <p className="text-sm font-bold" data-testid="text-bsc-completeness">{scorecardFreshness.completeness}%</p>
              </div>
              <div className="rounded-xl border bg-background/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">KPI actuals entered</p>
                <p className="text-sm font-bold" data-testid="text-bsc-actual-count">{scorecardFreshness.populated}/{scorecardFreshness.totalKpis}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4" data-testid="section-department-grid">
        {departments.map((dept, idx) => {
          const kpis  = loadKpiOverride(dept.id) ?? getKpisForDept(dept.id);
          const deptWeights = loadWeights(dept.id);
          const acts: Record<string, number | null> = {};
          kpis.forEach(k => { const v = store?.[pk]?.[k.id]; acts[k.id] = v !== undefined ? Number(v) : null; });
          const cardCtx: StatusCtx = { periodStore: store?.[pk] || {}, year, month };
          const hp       = performanceScore(kpis, acts, deptWeights, cardCtx);
          const hc       = healthColor(hp);
          const hs       = healthStatus(hp);
          const populated = kpis.filter(k => acts[k.id] !== null).length;
          const completeness = kpis.length ? Math.round((populated / kpis.length) * 100) : 0;
          const latestDeptPeriod = latestPeriodWithData(store, dept.id);

          // prev-month score for trend
          const prevYear  = month === 0 ? year - 1 : year;
          const prevMonth = month === 0 ? 11 : month - 1;
          const prevActs: Record<string, number | null> = {};
          kpis.forEach(k => { const v = store?.[ppk]?.[k.id]; prevActs[k.id] = v !== undefined ? Number(v) : null; });
          const prevCtx: StatusCtx = { periodStore: store?.[ppk] || {}, year: prevYear, month: prevMonth };
          const prevHp = performanceScore(kpis, prevActs, deptWeights, prevCtx);
          const hpDelta = hp - prevHp;

          // per-perspective dots
          const perspDots = PERSPECTIVES.map(p => {
            const pk2 = kpis.filter(k => k.perspective === p);
            const pa: Record<string,number|null> = {};
            pk2.forEach(k => { pa[k.id] = acts[k.id]; });
            const php = performanceScore(pk2, pa, deptWeights, cardCtx);
            return { p, color: healthColor(php), initial: PERSP_INITIALS[p] };
          });

          const isDragging = dragIndex === idx;
          const isOver     = overIndex === idx && dragIndex !== idx;
          const borderColor = hc;

          return (
            <Card key={dept.id}
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              style={{ borderLeftColor: borderColor, borderLeftWidth: 4 }}
              className={cn(
                "cursor-pointer hover:shadow-lg transition-all group relative select-none pl-0",
                isDragging && "opacity-40 scale-95",
                isOver && "ring-2 ring-primary",
              )}
              onClick={() => !isDragging && nav(`/scorecard/department/${dept.id}`)}
              data-testid={`card-dept-${dept.id}`}>

              <CardContent className="p-4">
                {/* Top row: drag grip + icon + name + health % */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0 mt-0.5" />
                    <span className="text-xl leading-none">{dept.icon}</span>
                    <div>
                      <p className="font-semibold text-sm leading-tight">{dept.name}</p>
                      <p className="text-xs text-muted-foreground">{kpis.length} KPIs</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: hc }}>{hp}%</p>
                    {hpDelta !== 0 && prevHp > 0 && (
                      <p className="text-xs flex items-center justify-end gap-0.5 mt-0.5"
                        style={{ color: hpDelta > 0 ? "#10b981" : "#ef4444" }}>
                        {hpDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(Math.round(hpDelta))}%
                      </p>
                    )}
                  </div>
                </div>

                {/* Perspective dots */}
                <div className="flex gap-3 mb-3">
                  {perspDots.map(({ p, color, initial }) => (
                    <div key={p} title={PERSP_FULL[p as Perspective]} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-xs text-muted-foreground font-medium">{initial}</span>
                    </div>
                  ))}
                </div>

                {/* Health bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${hp}%`, background: hc }} />
                </div>

                <div className="mt-3 rounded-lg bg-muted/40 px-2 py-1.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">Freshness</span>
                  <span className="text-[10px] font-semibold" data-testid={`text-dept-freshness-${dept.id}`}>
                    {latestDeptPeriod || "No data"} · {completeness}%
                  </span>
                </div>

                {/* Footer: CTA */}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {kpis.filter(k => getStatus(k, acts[k.id]) === "green").length} green ·{" "}
                    {kpis.filter(k => getStatus(k, acts[k.id]) === "red").length} red
                  </span>
                  <span className="text-xs text-primary font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </CardContent>

              {/* Delete button */}
              <button onClick={e => { e.stopPropagation(); handleDelete(dept.id, e); }}
                className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded"
                data-testid={`button-delete-dept-${dept.id}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Card>
          );
        })}

        {/* Add Department card */}
        <Card className={`transition-all border-dashed ${deptSynced ? "cursor-pointer hover:shadow-md hover:border-primary/50 group" : "opacity-60 cursor-default"}`}
          onClick={() => { if (deptSynced) setShowAdd(true); }} data-testid="card-add-department">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-3 min-h-[148px] text-muted-foreground group-hover:text-primary transition-colors">
            <div className="h-10 w-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center">
              {deptSynced ? <Plus className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
            </div>
            <p className="text-sm font-medium">{deptSynced ? "Add Department" : "Loading..."}</p>
          </CardContent>
        </Card>
      </div>

      <AddDeptDialog open={showAdd} onClose={()=>setShowAdd(false)} onAdd={handleAdd} />

    </div>
  );
}

// ── KPI Sparkline (last 6 months mini chart) ─────────────────────────────────
function KpiSparkline({ kpi, store, year, month }: { kpi: KpiDef; store: Record<string,Record<string,number>>; year: number; month: number }) {
  const pts = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      let m = month - i; let y = year;
      while (m < 0) { m += 12; y--; }
      const p  = periodKey(y, m);
      const v  = store?.[p]?.[kpi.id];
      arr.push({ label: MONTHS[m], actual: v !== undefined ? Number(v) : null, target: kpi.target });
    }
    return arr;
  }, [kpi.id, store, year, month]);

  const hasData = pts.some(p => p.actual !== null);
  if (!hasData) {
    return <div className="flex items-center justify-center h-[52px] text-xs text-muted-foreground/60 italic">No trend data</div>;
  }

  const last = pts[pts.length - 1];
  const status = getStatus(kpi, last?.actual ?? null);
  const color = status === "green" ? "#10b981" : status === "amber" ? "#f59e0b" : "#ef4444";

  return (
    <ResponsiveContainer width="100%" height={64}>
      <LineChart data={pts} margin={{ top:16, right:4, bottom:4, left:4 }}>
        <Line type="monotone" dataKey="actual" stroke={color} strokeWidth={2} dot={{ r:3, fill:color }} connectNulls>
          <LabelList dataKey="actual" position="top" content={(props: any) => {
            const { x, y, value } = props;
            if (value === null || value === undefined || x === undefined || y === undefined) return null;
            return <text x={x} y={y - 5} fill={color} fontSize={9} textAnchor="middle" fontWeight={600}>{value}</text>;
          }} />
        </Line>
        <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeWidth={1}
          strokeDasharray="3 2" dot={false}>
          <LabelList dataKey="target" position="bottom" content={(props: any) => {
            const { x, y, value } = props;
            if (value === null || value === undefined || x === undefined || y === undefined) return null;
            return <text x={x} y={y + 10} fill="hsl(var(--muted-foreground))" fontSize={8} textAnchor="middle" fontWeight={600}>{value}</text>;
          }} />
        </Line>
        <Tooltip
          contentStyle={{ background:"hsl(var(--card))", border:"1px solid hsl(var(--border))", borderRadius:"6px", fontSize:10, padding:"2px 6px" }}
          formatter={(v:any, name:string) => [v !== null ? `${fmtVal(v, kpi.unit)} ${kpi.unit}` : "—", name === "actual" ? "Actual" : "Target"]}
          labelStyle={{ fontSize:10, color:"hsl(var(--muted-foreground))" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Enriched KPI card with sparkline & progress bar ───────────────────────────
function KpiEnrichedCard({ kpi, actual, prevActual, store, year, month, onClick }:
  { kpi: KpiDef; actual: number|null; prevActual: number|null; store: Record<string,Record<string,number>>; year: number; month: number; onClick?: ()=>void }) {
  const status = getStatus(kpi, actual);
  const trend  = getTrend(actual, prevActual);
  const pc     = P_COLOR[kpi.perspective];

  const pctToTarget = actual !== null && kpi.target !== 0
    ? kpi.lowerIsBetter
      ? Math.min(100, Math.max(0, Math.round((1 - Math.max(0, actual - kpi.target) / kpi.target) * 100)))
      : Math.min(150, Math.round((actual / kpi.target) * 100))
    : null;

  const barColor = status === "green" ? "#10b981" : status === "amber" ? "#f59e0b" : "#ef4444";

  return (
    <Card className="hover:shadow-md transition-all border-l-[3px] cursor-pointer flex flex-col"
      style={{ borderLeftColor: pc.accent }} onClick={onClick}>
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground leading-tight">{kpi.name}</p>
          <RagBadge status={status} />
        </div>

        {/* Value */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {actual !== null ? fmtVal(actual, kpi.unit) : <span className="text-muted-foreground text-base font-normal">—</span>}
              <span className="text-xs text-muted-foreground ml-1 font-normal">{kpi.unit}</span>
            </p>
            <p className="text-xs text-muted-foreground">Target: {fmtVal(kpi.target, kpi.unit)} {kpi.unit}</p>
          </div>
          <TrendArrow trend={trend} lowerIsBetter={kpi.lowerIsBetter} />
        </div>

        {/* Progress bar */}
        {pctToTarget !== null && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>% to target</span>
              <span className="font-semibold" style={{ color: barColor }}>{pctToTarget}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width:`${Math.min(100, pctToTarget)}%`, background: barColor }} />
            </div>
          </div>
        )}

        {/* Sparkline */}
        <KpiSparkline kpi={kpi} store={store} year={year} month={month} />
      </CardContent>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// BSC WIDGET — AI Narration + Focus Mode
// ═════════════════════════════════════════════════════════════════════════════

type BscWidgetId =
  | "overall-score" | "perspective-cards" | "score-trend"
  | "weighted-donut" | "status-donut" | "top-kpis" | "lowest-kpis" | "kpi-scorecard";

interface BscNarrativeData {
  hp?: number; prevHp?: number; statusLabel?: string;
  onTrack?: number; atRisk?: number; offTrack?: number; totalKpis?: number;
  perspScores?: { p: string; score: number; trend: number; label: string }[];
  scoreTrend?: { label: string; score: number }[];
  topKpis?: { kpi: { name: string; perspective: string }; ach: number | null; status: string }[];
  lowestKpis?: { kpi: { name: string; perspective: string }; ach: number | null; status: string }[];
  month?: number; year?: number;
}

function generateBscNarrative(widgetId: BscWidgetId, d: BscNarrativeData): string {
  const pct = (n: number, t: number) => t > 0 ? Math.round(n / t * 100) : 0;

  if (widgetId === "overall-score") {
    const { hp = 0, prevHp, statusLabel = "", onTrack = 0, atRisk = 0, offTrack = 0, totalKpis = 0 } = d;
    const trendStr = prevHp !== undefined
      ? ` Overall score ${hp >= prevHp ? "improved" : "declined"} by ${Math.abs(hp - prevHp).toFixed(1)}% vs last month.`
      : "";
    const criticalNote = offTrack > 0
      ? ` ${offTrack} KPI${offTrack > 1 ? "s" : ""} are off-track and require immediate attention.`
      : " No KPIs are off-track — maintain momentum.";
    return `Current performance is ${statusLabel} at ${hp}%.${trendStr} ${onTrack} of ${totalKpis} KPIs are on track (${pct(onTrack, totalKpis)}%), ${atRisk} at risk.${criticalNote}`;
  }

  if (widgetId === "perspective-cards") {
    const ps = d.perspScores ?? [];
    const sorted = [...ps].sort((a, b) => b.score - a.score);
    const best = sorted[0]; const worst = sorted[sorted.length - 1];
    const improving = ps.filter(p => p.trend > 0).length;
    return `${best?.p ?? ""} leads at ${best?.score ?? 0}% while ${worst?.p ?? ""} needs focus at ${worst?.score ?? 0}%. ${improving} of ${ps.length} perspectives are improving month-over-month. Prioritise ${worst?.p ?? ""} initiatives to lift the overall score.`;
  }

  if (widgetId === "score-trend") {
    const trend = d.scoreTrend ?? [];
    if (trend.length < 2) return "Insufficient trend data yet. Add data for more months to see movement.";
    const first = trend.find(t => t.score > 0); const last = trend[trend.length - 1];
    const swing = first ? last.score - first.score : 0;
    const dir = swing > 0 ? "improved" : swing < 0 ? "declined" : "held steady";
    const peak = trend.reduce((a, b) => b.score > a.score ? b : a);
    const trough = trend.filter(t => t.score > 0).reduce((a, b) => b.score < a.score ? b : a, { label:"", score:999 });
    return `Over the tracked period, performance ${dir} by ${Math.abs(swing).toFixed(1)} points. Peak was ${peak.label} at ${peak.score}%; lowest was ${trough.label} at ${trough.score}%. ${swing > 3 ? "Positive trajectory — sustain the initiatives driving improvement." : swing < -3 ? "Declining trend — investigate root causes before the next review cycle." : "Performance is broadly stable — look for opportunities to accelerate."}`;
  }

  if (widgetId === "weighted-donut") {
    const ps = d.perspScores ?? [];
    const sorted = [...ps].sort((a, b) => b.score - a.score);
    const best = sorted[0]; const worst = sorted[sorted.length - 1];
    const weightedAvg = d.hp ?? 0;
    return `Weighted average score: ${weightedAvg}%. ${best?.p ?? ""} (${best?.score ?? 0}%) is the strongest perspective. ${worst?.p ?? ""} (${worst?.score ?? 0}%) has the most room for improvement. Review KPI weights if perspective priorities have shifted since the last strategy cycle.`;
  }

  if (widgetId === "status-donut") {
    const { onTrack = 0, atRisk = 0, offTrack = 0, totalKpis = 0 } = d;
    const onPct = pct(onTrack, totalKpis); const atPct = pct(atRisk, totalKpis); const offPct = pct(offTrack, totalKpis);
    return `${onPct}% of KPIs are on track. ${atPct}% are at risk and could flip to critical if not addressed. ${offPct}% are off-track${offTrack > 0 ? ` — escalate these to leadership immediately` : ""}. ${offTrack === 0 && atRisk < 3 ? "Scorecard health is strong. Focus on sustaining performance." : "Concentrate remediation efforts on the red and amber KPIs."}`;
  }

  if (widgetId === "top-kpis") {
    const tops = d.topKpis ?? [];
    const names = tops.slice(0, 3).map(t => t.kpi.name).join(", ");
    const avgAch = tops.length ? Math.round(tops.reduce((s, t) => s + (t.ach ?? 0), 0) / tops.length) : 0;
    return `Top performers average ${avgAch}% achievement. Leading KPIs: ${names}. These are delivering above target — consider whether stretch targets or resource reallocation could drive even greater impact in these areas.`;
  }

  if (widgetId === "lowest-kpis") {
    const lows = d.lowestKpis ?? [];
    const names = lows.slice(0, 3).map(t => t.kpi.name).join(", ");
    const avgAch = lows.length ? Math.round(lows.reduce((s, t) => s + (t.ach ?? 0), 0) / lows.length) : 0;
    const criticals = lows.filter(t => t.status === "red").length;
    return `Lowest-performing KPIs average only ${avgAch}% achievement. At-risk areas: ${names}. ${criticals > 0 ? `${criticals} KPI${criticals > 1 ? "s" : ""} are in critical (red) status requiring urgent intervention.` : "None are critical yet, but all need focused improvement plans."} Review root causes and assign owners with clear timelines.`;
  }

  if (widgetId === "kpi-scorecard") {
    const { onTrack = 0, atRisk = 0, offTrack = 0, totalKpis = 0, hp = 0 } = d;
    const completeness = totalKpis > 0 ? pct(onTrack + atRisk + offTrack, totalKpis) : 0;
    return `Scorecard covers ${totalKpis} KPIs with ${completeness}% data completeness. Overall weighted score: ${hp}%. ${onTrack} on track · ${atRisk} at risk · ${offTrack} off-track. Use this table to drill into individual KPI trends and identify early warning signals before they become critical issues.`;
  }

  return "";
}

/* ── Full-screen BSC focus overlay ── */
function BscFocusOverlay({ title, widgetLabel, narrative, onClose, children }: {
  title: string; widgetLabel: string; narrative: string;
  onClose: () => void; children: React.ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background" data-testid="bsc-focus-overlay">
      <div className="flex items-center justify-between px-6 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Maximize2 className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm">{title}</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {widgetLabel} · Focus Mode
          </span>
        </div>
        <button onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-3 py-1.5 hover:bg-muted/50 transition-colors"
          data-testid="button-bsc-exit-focus">
          <X className="h-3.5 w-3.5" />Back to dashboard
        </button>
      </div>
      <div className="flex-1 overflow-auto p-8 min-h-0">{children}</div>
      {narrative && (
        <div className="shrink-0 border-t bg-amber-50/60 dark:bg-amber-950/20 px-6 py-3">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5">
                AI Insight
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">{narrative}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Widget shell: adds focus button + AI narration to any Card ── */
function BscWidgetShell({ title, widgetLabel, narrative, className, contentClassName, headerExtra, children, focusContent }: {
  title: string; widgetLabel: string; narrative: string;
  className?: string; contentClassName?: string; headerExtra?: React.ReactNode;
  children: React.ReactNode; focusContent?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <>
      {focused && (
        <BscFocusOverlay title={title} widgetLabel={widgetLabel} narrative={narrative} onClose={() => setFocused(false)}>
          {focusContent ?? children}
        </BscFocusOverlay>
      )}
      <Card className={className}>
        <div className="flex items-center justify-between px-5 pt-4 gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
          <div className="flex items-center gap-2 shrink-0">
            {headerExtra}
            <button
              onClick={() => setFocused(true)}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/60 transition-colors group/focus"
              title="Focus mode"
              data-testid={`button-focus-${widgetLabel.replace(/\s+/g, "-").toLowerCase()}`}
            >
              <Maximize2 className="h-3.5 w-3.5 text-muted-foreground group-hover/focus:text-primary" />
            </button>
          </div>
        </div>
        <CardContent className={cn("pt-3 px-5 pb-5", contentClassName)}>
          {children}
          {narrative && (
            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-start gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{narrative}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DEPARTMENT DETAIL — Dashboard + Data Entry tabs
// ═════════════════════════════════════════════════════════════════════════════
function DepartmentDetail({ deptId }: { deptId: string }) {
  const today = new Date();
  const [year, setYear]     = useState(() => readPersistedPeriod().year);
  const [month, setMonth]   = useState(() => readPersistedPeriod().month);
  const [store, setStore]   = useState(loadStore);
  const [depts, setDepts]   = useState(loadDepartments);
  const [deptsSynced, setDeptsSynced] = useState(false);
  const [entryVals, setEntryVals] = useState<Record<string, string>>({});
  const [milestoneVals, setMilestoneVals] = useState<Record<string, string>>({});
  const [saved, setSaved]   = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [weights, setWeights]     = useState<Record<string,number>>(() => loadWeights(deptId));
  const [sortCol, setSortCol]   = useState<string>("status");
  const [sortDir, setSortDir]   = useState<"asc"|"desc">("asc");
  const [dashFilter, setDashFilter] = useState<{ status: "green"|"amber"|"red"|null; perspective: string|null }>({ status: null, perspective: null });
  const [shareDialog, setShareDialog] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();
  const [, nav] = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const dashboardExportRef = useRef<HTMLDivElement>(null);
  const scorecardRef = useRef<HTMLDivElement>(null);

  // kpiOverride = the full KPI list from the last Excel upload (null = use predefined)
  const [kpiOverride, setKpiOverride] = useState<KpiDef[] | null>(() => loadKpiOverride(deptId));

  // Reload when navigating between departments
  useEffect(() => { setKpiOverride(loadKpiOverride(deptId)); }, [deptId]);

  const deptFound = depts.find(d => d.id === deptId);
  const dept = deptFound || { id: deptId, name: deptId, icon: "🏢", color: "#3B82F6" };

  const accessDenied = deptsSynced && !deptFound;
  // If the user has uploaded a custom Excel, that is the authoritative KPI list.
  // Otherwise fall back to the built-in predefined KPIs for this department.
  const kpis = useMemo<KpiDef[]>(() => {
    if (kpiOverride && kpiOverride.length > 0) return kpiOverride;
    return getKpisForDept(deptId);
  }, [deptId, kpiOverride]);
  const pk   = periodKey(year, month);
  const ppk  = month === 0 ? periodKey(year-1, 11) : periodKey(year, month-1);

  const getActual = useCallback((id:string, p=pk): number|null => {
    const v = store?.[p]?.[id]; return v !== undefined ? Number(v) : null;
  }, [store, pk]);

  const deptFreshness = {
    latestPeriod: latestPeriodWithData(store, deptId),
    populated: kpis.filter(k => store?.[pk]?.[k.id] !== undefined).length,
    total: kpis.length,
  };
  const deptCompleteness = deptFreshness.total ? Math.round((deptFreshness.populated / deptFreshness.total) * 100) : 0;

  // ── Share link ────────────────────────────────────────────────────────────
  const { data: shareData } = useQuery<{ shareToken: string | null; shareEnabled: boolean }>({
    queryKey: ["/api/scorecard/share", deptId],
    queryFn: () => fetch(`/api/scorecard/share?deptId=${deptId}`).then(r => r.json()),
  });
  useEffect(() => {
    if (shareData) {
      setShareEnabled(shareData.shareEnabled);
      setShareToken(shareData.shareToken ?? null);
    }
  }, [shareData]);

  const shareMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest("POST", "/api/scorecard/share", {
        deptId, enabled,
        // Only persist custom KPI definitions (from Excel upload).
        // Built-in KPIs are always available via getKpisForDept on the public page.
        kpiDefinitions: (kpiOverride && kpiOverride.length > 0) ? kpiOverride : null,
      }).then(r => r.json()),
    onSuccess: (data: { shareToken: string; shareEnabled: boolean }) => {
      setShareEnabled(data.shareEnabled);
      setShareToken(data.shareToken);
      toast({ title: data.shareEnabled ? "Public link enabled!" : "Public link disabled" });
    },
    onError: () => toast({ title: "Failed to update share link", variant: "destructive" }),
  });

  // ── Sync departments + actuals from DB on mount ───────────────────────────
  useEffect(() => {
    syncDepartmentsFromDb().then(synced => {
      if (synced) setDepts(synced);
      setDeptsSynced(true);
    }).catch(() => setDeptsSynced(true));
  }, []);

  useEffect(() => {
    syncActualsFromDb().then(merged => {
      if (merged) {
        setStore(merged);
        localStorage.setItem(CORP_SEED_VER, "ok");
      }
    });
  }, [deptId]);

  // Pre-fill form when period changes
  useEffect(() => {
    const pre: Record<string,string> = {};
    kpis.forEach(k => { const v = store?.[pk]?.[k.id]; if (v !== undefined) pre[k.id] = String(v); });
    setEntryVals(pre);
  }, [pk]);

  const allActuals: Record<string, number|null> = {};
  kpis.forEach(k => { allActuals[k.id] = getActual(k.id); });
  const mainCtx: StatusCtx = { periodStore: store[pk] || {}, year, month };
  const hp       = performanceScore(kpis, allActuals, weights, mainCtx);
  const onTrack  = kpis.filter(k => getStatus(k, allActuals[k.id], mainCtx) === "green").length;
  const atRisk   = kpis.filter(k => getStatus(k, allActuals[k.id], mainCtx) === "amber").length;
  const offTrack = kpis.filter(k => getStatus(k, allActuals[k.id], mainCtx) === "red").length;

  // Movers vs last month
  const movers = useMemo(() => {
    type Mover = { kpi: KpiDef; curr: number; prev: number; delta: number; pct: number };
    const items: Mover[] = kpis.flatMap(k => {
      const curr = getActual(k.id); const prev = getActual(k.id, ppk);
      if (curr === null || prev === null || prev === 0) return [];
      const rawDelta = curr - prev;
      const delta = k.lowerIsBetter ? -rawDelta : rawDelta;
      const pct = Math.round((Math.abs(rawDelta) / Math.abs(prev)) * 100);
      return [{ kpi: k, curr, prev, delta, pct }];
    });
    return {
      improved: items.filter(i => i.delta > 0).sort((a,b) => b.delta - a.delta).slice(0,3),
      declined: items.filter(i => i.delta < 0).sort((a,b) => a.delta - b.delta).slice(0,3),
    };
  }, [kpis, store, pk, ppk]);

  // Sorted KPI table rows
  const statusOrder: Record<string,number> = { red:0, amber:1, green:2, none:3 };
  const sortedKpis = useMemo(() => {
    const toggle = (col: string) => {
      if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
      else { setSortCol(col); setSortDir("asc"); }
    };
    void toggle; // used via handleSort in JSX
    const ctx: StatusCtx = { periodStore: store[pk] || {}, year, month };
    return [...kpis].sort((a, b) => {
      const aAct = getActual(a.id), bAct = getActual(b.id);
      const aS = getStatus(a, aAct, ctx) || "none", bS = getStatus(b, bAct, ctx) || "none";
      if (sortCol === "status") {
        const d = (statusOrder[aS]??3) - (statusOrder[bS]??3);
        return sortDir === "asc" ? d : -d;
      }
      if (sortCol === "name") return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      if (sortCol === "perspective") return sortDir === "asc" ? a.perspective.localeCompare(b.perspective) : b.perspective.localeCompare(a.perspective);
      if (sortCol === "actual") {
        if (aAct === null && bAct === null) return 0;
        if (aAct === null) return 1; if (bAct === null) return -1;
        return sortDir === "asc" ? aAct - bAct : bAct - aAct;
      }
      return 0;
    });
  }, [kpis, sortCol, sortDir, store, pk, year, month]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const applyFilter = (update: { status?: "green"|"amber"|"red"|null; perspective?: string|null }) => {
    setDashFilter(prev => {
      const next = { ...prev };
      if ("status" in update) next.status = prev.status === update.status ? null : (update.status ?? null);
      if ("perspective" in update) next.perspective = prev.perspective === update.perspective ? null : (update.perspective ?? null);
      return next;
    });
    setTimeout(() => scorecardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const clearFilter = () => setDashFilter({ status: null, perspective: null });

  const filteredKpis = useMemo(() => {
    const ctx: StatusCtx = { periodStore: store[pk] || {}, year, month };
    return sortedKpis.filter(k => {
      const actual = getActual(k.id);
      // Always hide KPIs that have no actual data for the current period
      if (actual === null) return false;
      const st = getStatus(k, actual, ctx);
      if (dashFilter.status && st !== dashFilter.status) return false;
      if (dashFilter.perspective && k.perspective !== dashFilter.perspective) return false;
      return true;
    });
  }, [sortedKpis, dashFilter, store, pk, year, month]);

  // ── Dashboard computed data ──────────────────────────────────────────────

  const statusLabel = hp >= 95 ? "Excellent" : hp >= 85 ? "On Track" : hp >= 70 ? "Needs Attention" : "Critical";
  const statusColor = hp >= 95 ? "#10b981" : hp >= 85 ? "#3b82f6" : hp >= 70 ? "#f59e0b" : "#ef4444";

  // Per-perspective score + trend
  const perspScores = useMemo(() => PERSPECTIVES.map(p => {
    const pkpis   = kpis.filter(k => k.perspective === p);
    const pActs: Record<string,number|null> = {};
    const pPrev: Record<string,number|null> = {};
    pkpis.forEach(k => { pActs[k.id] = getActual(k.id); pPrev[k.id] = getActual(k.id, ppk); });
    const score     = performanceScore(pkpis, pActs, weights);
    const prevScore = performanceScore(pkpis, pPrev, weights);
    const trend     = score - prevScore;
    const label     = score >= 95 ? "Excellent" : score >= 85 ? "On Track" : score >= 70 ? "Needs Attention" : "Critical";
    const color     = score >= 95 ? "#10b981"  : score >= 85 ? "#3b82f6"  : score >= 70 ? "#f59e0b"  : "#ef4444";
    return { p, score, prevScore, trend, label, color };
  }), [kpis, store, pk, ppk, weights]);

  // Score trend (last 7 months — only months with at least one actual value are included)
  const scoreTrend = useMemo(() => {
    const points = Array.from({ length: 7 }, (_, i) => {
      let m = month - 6 + i; let y = year;
      while (m < 0) { m += 12; y--; }
      const p = periodKey(y, m);
      const acts: Record<string,number|null> = {};
      let hasAny = false;
      kpis.forEach(k => {
        const v = store?.[p]?.[k.id];
        acts[k.id] = v !== undefined ? Number(v) : null;
        if (v !== undefined) hasAny = true;
      });
      if (!hasAny) return null;
      const periodCtx: StatusCtx = { periodStore: store[p] || {}, year: y, month: m };
      return { label: `${MONTHS[m]} ${String(y).slice(2)}`, score: performanceScore(kpis, acts, weights, periodCtx) };
    });
    return points.filter((p): p is { label: string; score: number } => p !== null);
  }, [kpis, store, year, month, weights]);

  // Achievement % per KPI
  const kpiData = useMemo(() => {
    const ctx: StatusCtx = { periodStore: store[pk] || {}, year, month };
    return kpis.map(k => {
      const actual = getActual(k.id);
      const ach = actual === null ? null
        : k.lowerIsBetter ? (actual === 0 ? 100 : Math.min((k.target / actual) * 100, 100))
        : (k.target === 0 ? 100 : Math.min((actual / k.target) * 100, 100));
      const w = (Object.keys(weights).length > 0 ? (weights[k.id] ?? 0) : (100 / kpis.length));
      const weightedScore = ach !== null ? +(ach * w / 100).toFixed(2) : null;
      return { kpi: k, actual, ach, status: getStatus(k, actual, ctx), w, weightedScore };
    });
  }, [kpis, store, pk, weights, year, month]);

  const topKpis    = useMemo(() => [...kpiData].filter(d => d.ach !== null).sort((a,b) => b.ach! - a.ach!).slice(0,5), [kpiData]);
  const lowestKpis = useMemo(() => [...kpiData].filter(d => d.ach !== null).sort((a,b) => a.ach! - b.ach!).slice(0,5), [kpiData]);
  const prevHp     = scoreTrend.length >= 2 ? scoreTrend[scoreTrend.length - 2].score : undefined;
  const SortIcon = ({ col }: { col: string }) => (
    <span className="ml-1 text-muted-foreground/60">
      {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const saveKpi = async (id:string) => {
    const val = entryVals[id]; if (!val && val !== "0") return;
    const updates: Record<string, number> = { [id]: Number(val) };
    const kpi = kpis.find(k => k.id === id);
    if (kpi?.targetType === "milestone_numeric" && milestoneVals[id] !== undefined && milestoneVals[id] !== "") {
      updates[`m_${id}`] = Number(milestoneVals[id]);
    }
    const updated = { ...store, [pk]: { ...(store[pk]||{}), ...updates } };
    setStore(updated);
    saveStoreLocal(updated);
    setSaved(s => ({ ...s, [id]: true }));
    setHasUnsaved(false);
    const ok = await saveStoreToDB(updated);
    if (!ok) {
      toast({ title: "Save failed", description: "Could not save to server. Please try again.", variant: "destructive" });
      setSaved(s => ({ ...s, [id]: false }));
    } else {
      setTimeout(() => setSaved(s => ({ ...s, [id]: false })), 2000);
    }
  };

  const saveAll = async () => {
    const updates: Record<string,number> = {};
    kpis.forEach(k => {
      if (entryVals[k.id] !== undefined && entryVals[k.id] !== "") updates[k.id] = Number(entryVals[k.id]);
      if (k.targetType === "milestone_numeric" && milestoneVals[k.id] !== undefined && milestoneVals[k.id] !== "") {
        updates[`m_${k.id}`] = Number(milestoneVals[k.id]);
      }
    });
    if (!Object.keys(updates).length) { toast({ title:"Nothing to save", description:"Enter at least one value first." }); return; }
    const updated = { ...store, [pk]: { ...(store[pk]||{}), ...updates } };
    setStore(updated);
    saveStoreLocal(updated);
    setHasUnsaved(false);
    setSaving(true);
    const ok = await saveStoreToDB(updated);
    setSaving(false);
    if (ok) {
      toast({ title: "Saved successfully", description: `${Object.keys(updates).length} values saved for ${MONTHS[month]} ${year}.` });
    } else {
      setHasUnsaved(true);
      toast({ title: "Save failed", description: "Could not reach the server. Your data is stored locally — please try saving again.", variant: "destructive" });
    }
  };

  // ── Excel template download ──────────────────────────────────────────────
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Columns: KPI Name | Perspective | Target | Unit | Lower is Better | Target Type | Target Date | Weight % | Jan…Dec
    const META_COLS = ["KPI Name", "Perspective", "Target", "Unit", "Lower is Better", "Target Type", "Target Date", "Weight %"];
    const header1 = [...META_COLS, ...MONTHS.map(m => `${m} ${year}`)];

    // For brand-new custom departments (no predefined KPI set, no uploaded override),
    // use the corporate KPIs as a rich starter template so the user has a complete
    // example to rename and customise. Actual columns are left blank.
    const isCustomNewDept = !DEPT_KPIS[deptId] && !kpiOverride;
    const templateKpis: KpiDef[] = isCustomNewDept
      ? DEPT_KPIS["corp"].map(k => ({ ...k, id: k.id.replace(/^cr_/, `${deptId}_`) }))
      : kpis;
    const totalKpis = templateKpis.length;

    const dataRows1: (string | number)[][] = [];
    templateKpis.forEach(k => {
      const storedW = weights[k.id];
      const displayW = storedW !== undefined ? storedW : +(100 / totalKpis).toFixed(4);
      const targetType = k.targetType === "milestone_numeric" ? "milestone_numeric"
                       : k.targetType === "milestone_date"    ? "milestone_date"
                       : k.targetFrequency === "annual"       ? "annual"
                       : "regular";
      const targetDate = k.targetDate ?? "";
      const row: (string | number)[] = [
        k.name, k.perspective, k.target, k.unit,
        k.lowerIsBetter ? "Yes" : "No",
        targetType, targetDate, displayW,
      ];
      MONTHS.forEach((_, mi) => {
        // Starter template for new depts: leave actuals blank so user fills them in
        const v = isCustomNewDept ? undefined : store?.[periodKey(year, mi)]?.[k.id];
        row.push(v !== undefined ? Number(v) : ("" as any));
      });
      dataRows1.push(row);

      // For milestone_numeric KPIs: add a companion row for the per-period milestone target
      if (k.targetType === "milestone_numeric") {
        const mRow: (string | number)[] = [
          `${k.name} — Milestone Target`, k.perspective, k.target, k.unit, "No",
          "milestone_target", "", "",
        ];
        MONTHS.forEach((_, mi) => {
          const v = isCustomNewDept ? undefined : store?.[periodKey(year, mi)]?.[`m_${k.id}`];
          mRow.push(v !== undefined ? Number(v) : ("" as any));
        });
        dataRows1.push(mRow);
      }
    });

    const ws1 = XLSX.utils.aoa_to_sheet([header1, ...dataRows1]);
    ws1["!cols"] = [
      { wch:36 }, { wch:16 }, { wch:10 }, { wch:8 }, { wch:16 },
      { wch:18 }, { wch:12 }, { wch:10 },
      ...MONTHS.map(() => ({ wch:10 })),
    ];
    XLSX.utils.book_append_sheet(wb, ws1, `Actuals ${year}`);

    // Sheet 2: Historical — all stored periods
    const storeNow = loadStore();
    const storedYears = [...new Set(Object.keys(storeNow).map(p => Number(p.slice(0,4))))].sort();
    const histCols: { label: string; year: number; mi: number }[] = [];
    storedYears.forEach(y => {
      MONTHS.forEach((m, mi) => histCols.push({ label: `${m} ${y}`, year: y, mi }));
    });
    const header2 = [...META_COLS, ...histCols.map(c => c.label)];
    const dataRows2: (string | number)[][] = [];
    templateKpis.forEach(k => {
      const targetType = k.targetType === "milestone_numeric" ? "milestone_numeric"
                       : k.targetType === "milestone_date"    ? "milestone_date"
                       : k.targetFrequency === "annual"       ? "annual"
                       : "regular";
      const row: (string | number)[] = [
        k.name, k.perspective, k.target, k.unit,
        k.lowerIsBetter ? "Yes" : "No",
        targetType, k.targetDate ?? "", "",
      ];
      histCols.forEach(({ year: y, mi }) => {
        const v = isCustomNewDept ? undefined : storeNow?.[periodKey(y, mi)]?.[k.id];
        row.push(v !== undefined ? Number(v) : ("" as any));
      });
      dataRows2.push(row);

      if (k.targetType === "milestone_numeric") {
        const mRow: (string | number)[] = [
          `${k.name} — Milestone Target`, k.perspective, k.target, k.unit, "No",
          "milestone_target", "", "",
        ];
        histCols.forEach(({ year: y, mi }) => {
          const v = isCustomNewDept ? undefined : storeNow?.[periodKey(y, mi)]?.[`m_${k.id}`];
          mRow.push(v !== undefined ? Number(v) : ("" as any));
        });
        dataRows2.push(mRow);
      }
    });
    const ws2 = XLSX.utils.aoa_to_sheet([header2, ...dataRows2]);
    ws2["!cols"] = [
      { wch:36 }, { wch:16 }, { wch:10 }, { wch:8 }, { wch:16 },
      { wch:18 }, { wch:12 }, { wch:10 },
      ...histCols.map(() => ({ wch:10 })),
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "Historical");

    XLSX.writeFile(wb, `BSC_${dept.name.replace(/\s+/g,"_")}_${year}.xlsx`);
    toast({ title:"Template downloaded", description:`Fill in the '${year}' month columns, then upload to refresh the dashboard.` });
  };

  // ── Excel upload & parse ─────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type:"array" });
      // Use first sheet (the Actuals sheet)
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval:"" }) as Record<string,any>[];

      // Auto-detect all "Mon YYYY" columns from the header row
      const firstRow = rows[0] || {};
      const detectedCols: { key: string; year: number; mi: number }[] = [];
      Object.keys(firstRow).forEach(col => {
        const match = col.match(/^([A-Za-z]{3})\s+(\d{4})$/);
        if (!match) return;
        const mi = MONTHS.findIndex(m => m.toLowerCase() === match[1].toLowerCase());
        if (mi === -1) return;
        detectedCols.push({ key: col, year: Number(match[2]), mi });
      });
      // Fallback: also accept bare "Jan", "Feb"... using selected year
      MONTHS.forEach((m, mi) => {
        if (firstRow[m] !== undefined && !detectedCols.find(c => c.mi === mi && c.year === year)) {
          detectedCols.push({ key: m, year, mi });
        }
      });

      // Build updated store across all detected columns
      const updatedStore = { ...loadStore() };
      const updatedWeights: Record<string, number> = { ...loadWeights(deptId) };
      let totalUpdates = 0;

      // Normalise: lowercase alphanumeric only — used for fuzzy KPI name matching
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

      // The predefined KPIs are the fallback reference for stable ID resolution
      const predefinedKpis = getKpisForDept(deptId);

      // uploadedKpiDefs = the COMPLETE KPI list defined by this file (replaces predefined)
      const uploadedKpiDefs: KpiDef[] = [];
      // seenIds tracks ids already added in this upload pass
      const seenIds = new Set<string>();

      // Track last seen milestone_numeric KPI id so companion rows can reference it
      let lastMilestoneNumericId: string | null = null;

      for (const row of rows) {
        const kpiName = String(row["KPI Name"] || row["KPI"] || "").trim();
        if (!kpiName) continue;

        const targetTypeRaw = String(row["Target Type"] ?? "").trim().toLowerCase();

        // ── Milestone Target companion row ────────────────────────────────────
        // Rows with Target Type = "milestone_target" (or name ending "— Milestone Target")
        // carry the per-period milestone values that pair with the previous milestone_numeric KPI
        const isMilestoneTargetRow =
          targetTypeRaw === "milestone_target" ||
          kpiName.endsWith("— Milestone Target");

        if (isMilestoneTargetRow && lastMilestoneNumericId) {
          const milestoneKey = `m_${lastMilestoneNumericId}`;
          detectedCols.forEach(({ key, year: colYear, mi }) => {
            const val = row[key];
            const strVal = String(val ?? "").trim();
            if (strVal === "" || isNaN(Number(strVal))) return;
            const p = periodKey(colYear, mi);
            if (!updatedStore[p]) updatedStore[p] = {};
            updatedStore[p][milestoneKey] = Number(strVal);
            totalUpdates++;
          });
          continue;
        }
        lastMilestoneNumericId = null;

        // ── Resolve KPI identity ──────────────────────────────────────────────
        // Try to match against predefined KPIs to preserve stable IDs.
        const matched = predefinedKpis.find(k => k.name.toLowerCase() === kpiName.toLowerCase())
                     ?? predefinedKpis.find(k => norm(k.name) === norm(kpiName));

        let kpiId: string;
        let perspective: Perspective;
        let target: number;
        let unit: string;
        let lowerIsBetter: boolean;

        if (matched) {
          kpiId   = matched.id;
          const fileTarget = parseFloat(String(row["Target"] ?? ""));
          target  = !isNaN(fileTarget) ? fileTarget : matched.target;
          unit    = String(row["Unit"] ?? "").trim() || matched.unit;
          const perspRaw = String(row["Perspective"] || "").trim();
          perspective = parsePerspective(perspRaw) ?? matched.perspective;
          const lowerRaw = String(row["Lower is Better"] ?? row["Lower Is Better"] ?? "").trim().toLowerCase();
          lowerIsBetter = lowerRaw === "yes" || lowerRaw === "true" ? true
                        : lowerRaw === "no"  || lowerRaw === "false" ? false
                        : matched.lowerIsBetter ?? false;
        } else {
          kpiId   = `${deptId}_cx_${norm(kpiName).slice(0, 24)}`;
          const perspRaw = String(row["Perspective"] || "").trim();
          perspective = parsePerspective(perspRaw) ?? "Financial";
          target  = parseFloat(String(row["Target"] ?? "0")) || 0;
          unit    = String(row["Unit"] ?? "").trim() || "";
          const lowerRaw = String(row["Lower is Better"] ?? row["Lower Is Better"] ?? "").trim().toLowerCase();
          lowerIsBetter = lowerRaw === "yes" || lowerRaw === "true" || lowerRaw === "1";
        }

        // Build KpiDef, carrying over target type / date / frequency from file or predefined
        const kpi: KpiDef = {
          id: kpiId, name: kpiName, perspective, unit, target, lowerIsBetter,
          ...(matched?.targetType        && { targetType:        matched.targetType }),
          ...(matched?.targetDate        && { targetDate:        matched.targetDate }),
          ...(matched?.targetFrequency   && { targetFrequency:   matched.targetFrequency }),
          ...(matched?.milestoneStartDate && { milestoneStartDate: matched.milestoneStartDate }),
        };

        // Allow file to override targetType / targetDate
        if (targetTypeRaw === "milestone_numeric") { kpi.targetType = "milestone_numeric"; lastMilestoneNumericId = kpiId; }
        else if (targetTypeRaw === "milestone_date") { kpi.targetType = "milestone_date"; }
        else if (targetTypeRaw === "annual") { kpi.targetFrequency = "annual"; }

        if (kpi.targetType === "milestone_numeric") lastMilestoneNumericId = kpiId;

        const targetDateRaw = String(row["Target Date"] ?? "").trim();
        if (targetDateRaw) kpi.targetDate = targetDateRaw;

        if (!seenIds.has(kpiId)) {
          uploadedKpiDefs.push(kpi);
          seenIds.add(kpiId);
        }

        // Parse KPI weight if provided
        const weightVal = row["Weight %"] ?? row["Weight"] ?? row["KPI Weight %"] ?? row["KPI Weight"];
        if (weightVal !== undefined && weightVal !== "") {
          const w = parseFloat(String(weightVal));
          if (!isNaN(w) && w > 0) updatedWeights[kpiId] = w;
        }

        detectedCols.forEach(({ key, year: colYear, mi }) => {
          const val = row[key];
          const strVal = String(val ?? "").trim();
          if (strVal === "" || isNaN(Number(strVal))) return;
          const p = periodKey(colYear, mi);
          if (!updatedStore[p]) updatedStore[p] = {};
          updatedStore[p][kpiId] = Number(strVal);
          totalUpdates++;
        });
      }

      // The uploaded KPI list is now the authoritative set for this department.
      // Save it as the override — dashboard, data entry, and all charts will use this list.
      if (uploadedKpiDefs.length > 0) {
        saveKpiOverride(deptId, uploadedKpiDefs);
        setKpiOverride(uploadedKpiDefs);
      }

      // Save weights if any were found in the upload
      if (Object.keys(updatedWeights).length > 0) {
        saveWeights(deptId, updatedWeights);
        setWeights(updatedWeights);
      }

      if (!totalUpdates) {
        toast({
          title: "KPIs updated — no actuals found",
          description: `${uploadedKpiDefs.length} KPI definitions loaded from your file. Fill in the monthly actual columns (e.g. 'Apr 2026') and re-upload to populate the dashboard.`,
        });
        setActiveTab("data-entry");
        return;
      }

      setStore({ ...updatedStore });
      saveStoreLocal(updatedStore);

      // Refresh form values for current period
      const pre: Record<string,string> = {};
      kpis.forEach(k => { const v = updatedStore[pk]?.[k.id]; if (v !== undefined) pre[k.id] = String(v); });
      setEntryVals(pre);

      toast({ title: "Upload successful — saving to server…", description: `${totalUpdates} data points loaded across ${uploadedKpiDefs.length} KPIs.` });
      setActiveTab("dashboard");

      // Save to DB and confirm
      const ok = await saveStoreToDB(updatedStore);
      if (ok) {
        setHasUnsaved(false);
        toast({ title: "Saved successfully", description: `${dept.name} scorecard data is now live and visible on shared links.` });
      } else {
        setHasUnsaved(true);
        toast({ title: "Server save failed", description: "Data is stored locally. Click 'Save to Server' in Data Entry to retry.", variant: "destructive" });
      }
    } catch (err:any) {
      toast({ title:"Upload failed", description:err.message, variant:"destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Close export menu on outside click
  useEffect(() => {
    if (!exportMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportMenuOpen]);

  async function captureExportArea(): Promise<HTMLCanvasElement> {
    const html2canvas = (await import("html2canvas")).default;
    const el = dashboardExportRef.current;
    if (!el) throw new Error("Dashboard content not found");
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: document.documentElement.classList.contains("dark") ? "#0f172a" : "#f8fafc",
      logging: false,
      allowTaint: false,
    });
    return canvas;
  }

  async function handleExportImage() {
    setExporting(true);
    setExportMenuOpen(false);
    try {
      const canvas = await captureExportArea();
      const link = document.createElement("a");
      link.download = `${dept.name.replace(/\s+/g, "_")}_Scorecard_${MONTHS[month]}_${year}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Image exported", description: `${dept.name} scorecard saved as PNG` });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    setExportMenuOpen(false);
    try {
      const canvas = await captureExportArea();
      const { jsPDF } = await import("jspdf");
      const imgW = canvas.width;
      const imgH = canvas.height;
      const pdfW = 297; // A4 landscape mm
      const pdfH = Math.round((imgH / imgW) * pdfW);
      const pdf = new jsPDF({ orientation: pdfW > pdfH ? "landscape" : "portrait", unit: "mm", format: [pdfW, Math.max(pdfH, 210)] });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`${dept.name.replace(/\s+/g, "_")}_Scorecard_${MONTHS[month]}_${year}.pdf`);
      toast({ title: "PDF exported", description: `${dept.name} scorecard saved as PDF` });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  const perspectives: Perspective[] = ["Financial", "Customer", "Internal", "Learning"];

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
          <Lock className="h-9 w-9 text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Access Restricted</h2>
          <p className="text-muted-foreground max-w-sm">
            You don't have permission to view this Balanced Scorecard department.
            Contact your administrator to request access.
          </p>
        </div>
        <Button variant="outline" onClick={() => nav("/scorecard")}>
          ← Back to Scorecard
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto" ref={dashboardExportRef}>
      {/* Back + period */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={()=>nav("/scorecard")}
          className="gap-1.5 text-muted-foreground w-fit" data-testid="button-back">
          <ChevronLeft className="h-4 w-4" />All Departments
        </Button>
        <PeriodSelector year={year} month={month} onChange={(y,m)=>{ setYear(y); setMonth(m); persistPeriod(y, m); }} />
      </div>

      {/* Dept header + health */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ background:`${dept.color}18` }}>
            {dept.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{dept.name}</h1>
            <p className="text-sm text-muted-foreground">Balanced Scorecard · {MONTHS[month]} {year}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {deptId === "corp" && (
            <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5"
              onClick={async () => {
                seedCorpSampleData();
                const seeded = loadStore();
                setStore(seeded);
                toast({ title: "Sample data loaded — saving…", description: "7 months of Corporate data applied." });
                const ok = await saveStoreToDB(seeded);
                if (ok) toast({ title: "Saved to server", description: "Sample data is now live on shared links." });
                else toast({ title: "Local only", description: "Could not reach server. Go to Data Entry and click Save to Server.", variant: "destructive" });
              }}>
              <Activity className="h-3.5 w-3.5" />Load Sample Data
            </Button>
          )}
          {/* Export dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8"
              onClick={() => setExportMenuOpen(o => !o)}
              disabled={exporting}
              data-testid="button-export-scorecard"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-9 z-50 bg-card border rounded-xl shadow-lg p-1.5 w-44" data-testid="export-menu">
                <button
                  onClick={handleExportImage}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-muted/60 transition-colors text-left"
                  data-testid="button-export-png"
                >
                  <FileImage className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    <span className="font-medium block">Save as Image</span>
                    <span className="text-[10px] text-muted-foreground">PNG, full dashboard</span>
                  </span>
                </button>
                <button
                  onClick={handleExportPdf}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm hover:bg-muted/60 transition-colors text-left"
                  data-testid="button-export-pdf"
                >
                  <FileText className="h-4 w-4 text-red-500 shrink-0" />
                  <span>
                    <span className="font-medium block">Save as PDF</span>
                    <span className="text-[10px] text-muted-foreground">A4, dashboard view</span>
                  </span>
                </button>
              </div>
            )}
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setShareDialog(true)} data-testid="button-share-scorecard">
            <Globe className="h-3.5 w-3.5" />Share
            {shareEnabled && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-0.5" />}
          </Button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Performance Score</p>
            <HealthRing pct={hp} size={56} />
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />{onTrack} on track</span>
            <span className="flex items-center gap-1.5 text-amber-600"><AlertTriangle className="h-3.5 w-3.5" />{atRisk} at risk</span>
            <span className="flex items-center gap-1.5 text-red-600"><AlertCircle className="h-3.5 w-3.5" />{offTrack} off track</span>
          </div>
        </div>
      </div>

      <Card className="border-violet-500/10 bg-gradient-to-r from-violet-500/5 via-background to-background">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-violet-500" />
                {dept.name} KPI freshness
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Latest period with KPI data and current-period completeness before this department score is reviewed.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:min-w-[540px]">
              <div className="rounded-xl border bg-background/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Latest KPI data</p>
                <p className="text-sm font-bold" data-testid="text-dept-latest-period">{deptFreshness.latestPeriod || "No KPI data"}</p>
              </div>
              <div className="rounded-xl border bg-background/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Completeness</p>
                <p className="text-sm font-bold" data-testid="text-dept-completeness">{deptCompleteness}%</p>
              </div>
              <div className="rounded-xl border bg-background/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Actuals entered</p>
                <p className="text-sm font-bold" data-testid="text-dept-actual-count">{deptFreshness.populated}/{deptFreshness.total}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            <BarChart2 className="h-3.5 w-3.5 mr-1.5" />Dashboard
          </TabsTrigger>
          <TabsTrigger value="entry" data-testid="tab-entry">
            <Edit2 className="h-3.5 w-3.5 mr-1.5" />Data Entry
          </TabsTrigger>
        </TabsList>

        {/* ── Dashboard ── */}
        <TabsContent value="dashboard" className="mt-5 space-y-5">

          {/* ── Row 1: Overall Score + Perspective Performance ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* Overall Performance Score */}
            <BscWidgetShell
              title="Overall Performance Score"
              widgetLabel="performance-score"
              className="lg:col-span-2"
              narrative={generateBscNarrative("overall-score", { hp, prevHp, statusLabel, onTrack, atRisk, offTrack, totalKpis: kpis.length })}
              focusContent={
                <div className="flex flex-col items-center justify-center h-full gap-8">
                  <div className="relative">
                    <PieChart width={220} height={220}>
                      <Pie data={[{ value: hp }, { value: 100 - hp }]} cx="50%" cy="50%"
                        innerRadius={76} outerRadius={104} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0} label={({ value, index }) => index === 0 ? value : ""} labelLine={false}>
                        <Cell fill={statusColor} />
                        <Cell fill="hsl(var(--muted))" />
                      </Pie>
                    </PieChart>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Trophy className="h-8 w-8 mb-1" style={{ color: statusColor }} />
                      <p className="text-4xl font-extrabold tabular-nums" style={{ color: statusColor }}>{hp}%</p>
                      <p className="text-sm font-semibold" style={{ color: statusColor }}>{statusLabel}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-8 text-center">
                    <div><p className="text-4xl font-bold text-emerald-600">{onTrack}</p><p className="text-sm text-muted-foreground">On Track</p></div>
                    <div><p className="text-4xl font-bold text-amber-500">{atRisk}</p><p className="text-sm text-muted-foreground">At Risk</p></div>
                    <div><p className="text-4xl font-bold text-red-600">{offTrack}</p><p className="text-sm text-muted-foreground">Off Track</p></div>
                  </div>
                </div>
              }
            >
              <div className="flex items-center gap-5">
                <div className="relative flex-shrink-0">
                  <PieChart width={110} height={110}>
                    <Pie data={[{ value: hp }, { value: 100 - hp }]} cx="50%" cy="50%"
                      innerRadius={38} outerRadius={52} startAngle={90} endAngle={-270} dataKey="value" strokeWidth={0} label={({ value, index }) => index === 0 ? value : ""} labelLine={false}>
                      <Cell fill={statusColor} />
                      <Cell fill="hsl(var(--muted))" />
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Trophy className="h-5 w-5" style={{ color: statusColor }} />
                  </div>
                </div>
                <div>
                  <p className="text-4xl font-extrabold tabular-nums leading-none" style={{ color: statusColor }}>{hp}%</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <CheckCircle2 className="h-4 w-4" style={{ color: statusColor }} />
                    <span className="text-sm font-semibold" style={{ color: statusColor }}>{statusLabel}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Target: ≥ 85%</p>
                  <p className="text-xs text-muted-foreground">{MONTHS[month]} {year}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 border-t pt-3 text-center">
                {[
                  { label:"On Track",  count:onTrack,  st:"green" as const, cls:"text-emerald-600", ring:"ring-emerald-400" },
                  { label:"At Risk",   count:atRisk,   st:"amber" as const, cls:"text-amber-500",  ring:"ring-amber-400" },
                  { label:"Off Track", count:offTrack, st:"red"   as const, cls:"text-red-600",    ring:"ring-red-400" },
                ].map(({ label, count, st, cls, ring }) => (
                  <button key={st}
                    onClick={() => applyFilter({ status: st })}
                    className={cn("rounded-lg py-1.5 transition-all cursor-pointer hover:bg-muted/50",
                      dashFilter.status === st && `ring-2 ${ring} bg-muted/30`)}
                    data-testid={`filter-status-${st}`}
                    title={`Filter KPI table by ${label}`}>
                    <p className={cn("text-xl font-bold", cls)}>{count}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </button>
                ))}
              </div>
            </BscWidgetShell>

            {/* Balanced Scorecard Perspective Performance */}
            <BscWidgetShell
              title="Balanced Scorecard Perspective Performance"
              widgetLabel="perspective-performance"
              className="lg:col-span-3"
              narrative={generateBscNarrative("perspective-cards", { perspScores })}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {perspScores.map(({ p, score, trend, label, color }) => (
                  <button key={p}
                    onClick={() => applyFilter({ perspective: p })}
                    data-testid={`filter-perspective-${p.toLowerCase()}`}
                    title={`Filter KPI table by ${PERSP_FULL[p]}`}
                    className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border bg-muted/30 transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer text-left",
                      dashFilter.perspective === p && "ring-2 ring-offset-1")}
                    style={dashFilter.perspective === p ? { ringColor: color, outlineColor: color, outline: `2px solid ${color}` } : undefined}>
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-lg"
                      style={{ background: PERSP_COLORS[p] + "20" }}>
                      {PERSP_ICONS[p]}
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center leading-tight">
                      {PERSP_FULL[p]}
                    </p>
                    <p className="text-2xl font-extrabold tabular-nums" style={{ color }}>{score}%</p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: color + "20", color }}>
                      {label}
                    </span>
                    <div className="flex items-center gap-0.5 text-xs" style={{ color: trend >= 0 ? "#10b981" : "#ef4444" }}>
                      {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
                    </div>
                  </button>
                ))}
              </div>
            </BscWidgetShell>
          </div>

          {/* ── Row 2: Score Trend + Score by Perspective + Status Summary ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Score Trend (Overall) */}
            <BscWidgetShell
              title="Score Trend (Overall)"
              widgetLabel="score-trend"
              contentClassName="px-3 pb-3"
              narrative={generateBscNarrative("score-trend", { scoreTrend })}
              focusContent={
                <div className="h-full min-h-[400px] flex flex-col">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scoreTrend} margin={{ top:20, right:20, bottom:10, left:-10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize:13 }} />
                      <YAxis domain={[0,100]} tick={{ fontSize:13 }} />
                      <Tooltip contentStyle={{ fontSize:13, borderRadius:6 }} formatter={(v:any) => [`${v}%`, "Score"]} />
                      <Line type="monotone" dataKey="score" stroke={statusColor} strokeWidth={3}
                        dot={{ r:5, fill:statusColor }} activeDot={{ r:7 }}>
                        <LabelList dataKey="score" position="top" content={(p:any) => {
                          const { x, y, value } = p;
                          if (!value || x == null || y == null) return null;
                          return <text x={x} y={y-10} fill={statusColor} fontSize={12} textAnchor="middle" fontWeight={700}>{value}%</text>;
                        }} />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              }
            >
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={scoreTrend} margin={{ top:10, right:8, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize:10 }} />
                  <YAxis domain={[0,100]} tick={{ fontSize:10 }} />
                  <Tooltip contentStyle={{ fontSize:11, borderRadius:6, border:"1px solid hsl(var(--border))" }}
                    formatter={(v:any) => [`${v}%`, "Score"]} />
                  <Line type="monotone" dataKey="score" stroke={statusColor} strokeWidth={2.5}
                    dot={{ r:3, fill:statusColor }} activeDot={{ r:5 }}>
                    <LabelList dataKey="score" position="top" content={(p:any) => {
                      const { x, y, value } = p;
                      if (value === 0 || x === undefined || y === undefined) return null;
                      return <text x={x} y={y-6} fill={statusColor} fontSize={9} textAnchor="middle" fontWeight={700}>{value}%</text>;
                    }} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </BscWidgetShell>

            {/* Score by Perspective (Weighted) */}
            <BscWidgetShell
              title="Score by Perspective (Weighted)"
              widgetLabel="weighted-donut"
              narrative={generateBscNarrative("weighted-donut", { perspScores, hp })}
              focusContent={
                <div className="flex flex-col items-center justify-center h-full gap-8">
                  <div className="relative">
                    <PieChart width={260} height={260}>
                      <Pie data={perspScores.map(ps => ({ name: ps.p, value: PERSP_WEIGHTS[ps.p] }))}
                        cx="50%" cy="50%" innerRadius={70} outerRadius={120} dataKey="value"
                        strokeWidth={2} stroke="hsl(var(--background))" label={({ value }) => `${value}%`} labelLine={false}>
                        {perspScores.map(ps => <Cell key={ps.p} fill={PERSP_COLORS[ps.p]} />)}
                      </Pie>
                      <Tooltip formatter={(v:any, name:string) => [`${v}%`, name]} contentStyle={{ fontSize:12 }} />
                      <Legend />
                    </PieChart>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-2xl font-bold" style={{ color: statusColor }}>{hp}%</p>
                      <p className="text-xs text-muted-foreground">Overall</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                    {perspScores.map(({ p, score }) => (
                      <div key={p} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: PERSP_COLORS[p] }} />
                          <span className="text-sm">{PERSP_FULL[p]}</span>
                        </div>
                        <span className="font-bold">{score}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              }
            >
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <PieChart width={110} height={110}>
                    <Pie data={perspScores.map(ps => ({ name: ps.p, value: PERSP_WEIGHTS[ps.p] }))}
                      cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="value" strokeWidth={1} stroke="hsl(var(--background))" label={({ value }) => `${value}%`} labelLine={false}>
                      {perspScores.map(ps => <Cell key={ps.p} fill={PERSP_COLORS[ps.p]} />)}
                    </Pie>
                    <Tooltip formatter={(v:any, name:string) => [`${v}%`, name]} contentStyle={{ fontSize:10, borderRadius:6 }} />
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-sm font-bold tabular-nums" style={{ color: statusColor }}>{hp}%</p>
                    <p className="text-[8px] text-muted-foreground">Overall</p>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {perspScores.map(({ p, score }) => (
                    <button key={p}
                      onClick={() => applyFilter({ perspective: p })}
                      title={`Filter by ${PERSP_FULL[p]}`}
                      className={cn("w-full flex items-center justify-between gap-2 text-xs rounded px-1 py-0.5 transition-colors hover:bg-muted/60 cursor-pointer",
                        dashFilter.perspective === p && "bg-muted/50 font-semibold")}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PERSP_COLORS[p] }} />
                        <span className="text-muted-foreground">{PERSP_FULL[p]}</span>
                      </div>
                      <div className="flex gap-3 tabular-nums">
                        <span className="font-semibold">{score}%</span>
                        <span className="text-muted-foreground w-6 text-right">{PERSP_WEIGHTS[p]}%</span>
                      </div>
                    </button>
                  ))}
                  <div className="flex justify-end gap-3 text-[10px] text-muted-foreground border-t pt-1 mt-1">
                    <span>Score</span><span className="w-6 text-right">Wt.</span>
                  </div>
                </div>
              </div>
            </BscWidgetShell>

            {/* Performance Status Summary */}
            {(() => {
              const total = kpis.length;
              const pieData = [
                { name: "On Track",  value: onTrack,  color:"#10b981" },
                { name: "At Risk",   value: atRisk,   color:"#f59e0b" },
                { name: "Off Track", value: offTrack, color:"#ef4444" },
              ].filter(d => d.value > 0);
              return (
                <BscWidgetShell
                  title="Performance Status Summary"
                  widgetLabel="status-donut"
                  narrative={generateBscNarrative("status-donut", { onTrack, atRisk, offTrack, totalKpis: total })}
                  focusContent={
                    <div className="flex flex-col items-center justify-center h-full gap-8">
                      <div className="relative">
                        <PieChart width={260} height={260}>
                          <Pie data={pieData.length ? pieData : [{ name:"No data", value:1, color:"#e5e7eb" }]}
                            cx="50%" cy="50%" innerRadius={70} outerRadius={120} dataKey="value"
                            strokeWidth={2} stroke="hsl(var(--background))" label={({ value }) => value} labelLine={false}>
                            {(pieData.length ? pieData : [{ color:"#e5e7eb" }]).map((d,i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize:12 }} />
                          <Legend />
                        </PieChart>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-2xl font-bold">{total}</p>
                          <p className="text-xs text-muted-foreground">Total KPIs</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div><p className="text-4xl font-bold text-emerald-600">{onTrack}</p><p className="text-sm text-muted-foreground">On Track ≥95%</p></div>
                        <div><p className="text-4xl font-bold text-amber-500">{atRisk}</p><p className="text-sm text-muted-foreground">At Risk 80–94%</p></div>
                        <div><p className="text-4xl font-bold text-red-600">{offTrack}</p><p className="text-sm text-muted-foreground">Off Track &lt;80%</p></div>
                      </div>
                    </div>
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <PieChart width={110} height={110}>
                        <Pie data={pieData.length ? pieData : [{ name:"No data", value:1, color:"#e5e7eb" }]}
                          cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="value" strokeWidth={1} stroke="hsl(var(--background))" label={({ value }) => value} labelLine={false}>
                          {(pieData.length ? pieData : [{ color:"#e5e7eb" }]).map((d,i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                      </PieChart>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-sm font-bold">{total}</p>
                        <p className="text-[8px] text-muted-foreground">Total KPIs</p>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {[
                        { label:"On Track",  count:onTrack,  color:"#10b981", note:"(≥ 95%)",  st:"green" as const },
                        { label:"At Risk",   count:atRisk,   color:"#f59e0b", note:"(80–94%)", st:"amber" as const },
                        { label:"Off Track", count:offTrack, color:"#ef4444", note:"(< 80%)",  st:"red"   as const },
                      ].map(({ label, count, color, note, st }) => (
                        <button key={label}
                          onClick={() => applyFilter({ status: st })}
                          title={`Filter by ${label}`}
                          className={cn("w-full flex items-center justify-between text-xs rounded px-1 py-0.5 transition-colors hover:bg-muted/60 cursor-pointer",
                            dashFilter.status === st && "bg-muted/50 font-semibold")}>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                            <span className="text-muted-foreground">{label} <span className="text-[10px]">{note}</span></span>
                          </div>
                          <div className="flex gap-2 tabular-nums">
                            <span className="font-semibold">{count}</span>
                            <span className="text-muted-foreground">{total ? Math.round(count/total*100) : 0}%</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </BscWidgetShell>
              );
            })()}
          </div>

          {/* ── Row 3: Top KPIs + Lowest Performing ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Top KPIs Performance Overview */}
            <BscWidgetShell
              title="Top KPIs Performance Overview"
              widgetLabel="top-kpis"
              contentClassName="p-0 pb-0"
              narrative={generateBscNarrative("top-kpis", { topKpis })}
            >
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-y bg-muted/30">
                    <th className="text-left px-4 py-2 font-semibold text-muted-foreground">KPI</th>
                    <th className="text-left px-2 py-2 font-semibold text-muted-foreground">Persp.</th>
                    <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Target</th>
                    <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Actual</th>
                    <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Ach %</th>
                    <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topKpis.map(({ kpi:k, actual, ach, status }) => {
                    const pc = P_COLOR[k.perspective];
                    const achColor = ach! >= 95 ? "#10b981" : ach! >= 80 ? "#f59e0b" : "#ef4444";
                    return (
                      <tr key={k.id} onClick={() => nav(`/scorecard/kpi/${k.id}`)}
                        className="cursor-pointer hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-2.5 font-medium max-w-[140px]">
                          <span className="line-clamp-1">{k.name}</span>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", pc.bg, pc.text)}>
                            {PERSP_INITIALS[k.perspective]}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right text-muted-foreground tabular-nums">{fmtVal(k.target, k.unit)}{k.unit}</td>
                        <td className="px-2 py-2.5 text-right font-semibold tabular-nums">
                          {actual !== null ? `${fmtVal(actual, k.unit)}${k.unit}` : "—"}
                        </td>
                        <td className="px-2 py-2.5 text-right font-bold tabular-nums" style={{ color: achColor }}>
                          {ach !== null ? `${ach.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                            status === "green" ? "bg-emerald-100 text-emerald-700" : status === "amber" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                            {status === "green" ? "On Track" : status === "amber" ? "At Risk" : "Critical"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </BscWidgetShell>

            {/* Lowest Performing KPIs */}
            <BscWidgetShell
              title="Lowest Performing KPIs"
              widgetLabel="lowest-kpis"
              contentClassName="p-0 pb-0"
              narrative={generateBscNarrative("lowest-kpis", { lowestKpis })}
            >
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-y bg-muted/30">
                    <th className="text-left px-4 py-2 font-semibold text-muted-foreground">KPI</th>
                    <th className="text-left px-2 py-2 font-semibold text-muted-foreground">Persp.</th>
                    <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Ach %</th>
                    <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lowestKpis.map(({ kpi:k, ach, status }) => {
                    const pc = P_COLOR[k.perspective];
                    const achColor = ach! >= 95 ? "#10b981" : ach! >= 80 ? "#f59e0b" : "#ef4444";
                    return (
                      <tr key={k.id} onClick={() => nav(`/scorecard/kpi/${k.id}`)}
                        className="cursor-pointer hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-2.5 font-medium max-w-[180px]">
                          <span className="line-clamp-1">{k.name}</span>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", pc.bg, pc.text)}>
                            {PERSP_INITIALS[k.perspective]}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right font-bold tabular-nums" style={{ color: achColor }}>
                          {ach !== null ? `${ach.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                            status === "green" ? "bg-emerald-100 text-emerald-700" : status === "amber" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                            {status === "green" ? "On Track" : status === "amber" ? "At Risk" : "Critical"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </BscWidgetShell>
          </div>

          {/* ── KPI Scorecard Table (full, clickable to detail) ── */}
          <div ref={scorecardRef}>
          <BscWidgetShell
            title={`KPI Scorecard — ${MONTHS[month]} ${year}`}
            widgetLabel="kpi-scorecard"
            contentClassName="p-0 pb-0 mt-3"
            headerExtra={
              <div className="flex items-center gap-2">
                {(dashFilter.status || dashFilter.perspective) && (
                  <div className="flex items-center gap-1.5">
                    {dashFilter.status && (
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                        dashFilter.status === "green" ? "bg-emerald-100 text-emerald-700" :
                        dashFilter.status === "amber" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>
                        {dashFilter.status === "green" ? "On Track" : dashFilter.status === "amber" ? "At Risk" : "Off Track"}
                      </span>
                    )}
                    {dashFilter.perspective && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ background: PERSP_COLORS[dashFilter.perspective] + "20", color: PERSP_COLORS[dashFilter.perspective] }}>
                        {PERSP_FULL[dashFilter.perspective]}
                      </span>
                    )}
                    <button onClick={clearFilter}
                      className="h-4 w-4 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/40 flex items-center justify-center transition-colors"
                      title="Clear filter" data-testid="button-clear-filter">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {(dashFilter.status || dashFilter.perspective) ? `${filteredKpis.length} of ${kpis.length} KPIs` : "Click any row to view trend"}
                </span>
              </div>
            }
            narrative={generateBscNarrative("kpi-scorecard", { hp, onTrack, atRisk, offTrack, totalKpis: kpis.length })}
          >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("status")}>Status <SortIcon col="status" /></th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("name")}>KPI Name <SortIcon col="name" /></th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("perspective")}>Perspective <SortIcon col="perspective" /></th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Target</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("actual")}>Actual <SortIcon col="actual" /></th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Ach %</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Weight %</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Trend</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredKpis.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          No KPIs match the current filter. <button onClick={clearFilter} className="underline text-primary hover:text-primary/80">Clear filter</button>
                        </td>
                      </tr>
                    )}
                    {filteredKpis.map(k => {
                      const d = kpiData.find(x => x.kpi.id === k.id)!;
                      const actual = d?.actual ?? null;
                      const ach    = d?.ach ?? null;
                      const st     = d?.status ?? "nodata";
                      const pc     = P_COLOR[k.perspective];
                      const prev   = getActual(k.id, ppk);
                      const rawDelta  = actual !== null && prev !== null ? actual - prev : null;
                      const goodDelta = rawDelta !== null ? (k.lowerIsBetter ? -rawDelta : rawDelta) : null;
                      const achColor  = ach === null ? undefined : ach >= 95 ? "#10b981" : ach >= 80 ? "#f59e0b" : "#ef4444";
                      const rowBg = st === "red" ? "bg-red-50/40 dark:bg-red-950/10" : st === "amber" ? "bg-amber-50/40 dark:bg-amber-950/10" : "";
                      return (
                        <tr key={k.id} onClick={() => nav(`/scorecard/kpi/${k.id}`)}
                          className={cn("cursor-pointer hover:bg-muted/50 transition-colors group", rowBg)}>
                          <td className="px-4 py-3">
                            <div className={cn("w-2.5 h-2.5 rounded-full mx-auto",
                              st === "green" ? "bg-emerald-500" : st === "amber" ? "bg-amber-500" : st === "red" ? "bg-red-500" : "bg-muted-foreground/30")} />
                          </td>
                          <td className="px-4 py-3 font-medium max-w-[200px]"><span className="line-clamp-1">{k.name}</span></td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", pc.bg, pc.text)}>
                              {PERSP_FULL[k.perspective]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                            {fmtVal(k.target, k.unit)}<span className="text-xs ml-0.5">{k.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums">
                            {actual !== null ? <>{fmtVal(actual, k.unit)}<span className="text-xs text-muted-foreground ml-1 font-normal">{k.unit}</span></> : <span className="text-muted-foreground font-normal">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: achColor }}>
                            {ach !== null ? `${ach.toFixed(1)}%` : <span className="text-muted-foreground font-normal">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                            {d ? `${d.w.toFixed(1)}%` : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {goodDelta !== null
                              ? <span className="inline-flex items-center gap-0.5 text-xs font-semibold"
                                  style={{ color: goodDelta > 0 ? "#10b981" : goodDelta < 0 ? "#ef4444" : "#94a3b8" }}>
                                  {goodDelta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : goodDelta < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                                  {Math.abs(rawDelta!).toFixed(1)}
                                </span>
                              : <span className="text-muted-foreground/50 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <Eye className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </BscWidgetShell>
          </div>
        </TabsContent>


        {/* ── Data Entry ── */}
        <TabsContent value="entry" className="mt-5 space-y-4">
          {/* Excel upload card */}
          <Card className="border-dashed border-2">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Upload Excel File</p>
                    <p className="text-xs text-muted-foreground">Download the template, fill in the Actual column, then upload to update the dashboard</p>
                  </div>
                </div>
                <div className="flex gap-2 sm:ml-auto flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={downloadTemplate} data-testid="button-download-template">
                    <Download className="h-3.5 w-3.5 mr-1.5" />Download Template
                  </Button>
                  <label>
                    <Button size="sm" asChild disabled={uploading} data-testid="button-upload-excel">
                      <span className="cursor-pointer">
                        {uploading ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                        {uploading ? "Uploading..." : "Upload & Refresh"}
                      </span>
                    </Button>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                      onChange={handleFileUpload} data-testid="input-excel-file" />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual entry */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Manual Entry — {MONTHS[month]} {year}</CardTitle>
                  {hasUnsaved && (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                      Unsaved changes
                    </span>
                  )}
                </div>
                <Button size="sm" onClick={saveAll} disabled={saving} data-testid="button-save-all">
                  {saving ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  {saving ? "Saving…" : "Save to Server"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {perspectives.map(p => {
                const pkpis = kpis.filter(k => k.perspective === p);
                if (!pkpis.length) return null;
                const pc = P_COLOR[p];
                return (
                  <div key={p}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:pc.accent }}>
                      {PERSP_LABEL[p]}
                    </p>
                    <div className="space-y-1.5">
                      {pkpis.map(k => {
                        const actual = getActual(k.id);
                        const periodStore = store[pk] || {};
                        const ctx: StatusCtx = { periodStore, year, month };
                        const status = getStatus(k, actual, ctx);
                        const { effectiveTarget, effectiveActual, expectedPct } = actual !== null
                          ? effectiveTargetAndActual(k, Number(actual), ctx)
                          : { effectiveTarget: k.target, effectiveActual: 0, expectedPct: undefined };
                        const storedMilestone = periodStore[`m_${k.id}`];
                        return (
                          <div key={k.id}
                            className="flex flex-col gap-1.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                              <span className="text-sm text-foreground flex-1 min-w-[160px]">
                                {k.name}
                                {k.targetType === "milestone_numeric" && <span className="ml-1.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">MILESTONE</span>}
                                {k.targetType === "milestone_date" && <span className="ml-1.5 text-[10px] font-medium bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded">DATE TARGET</span>}
                                {k.targetFrequency === "annual" && <span className="ml-1.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">ANNUAL</span>}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {k.targetType === "milestone_numeric"
                                  ? <>Milestone: <span className="font-medium">{storedMilestone ?? (milestoneVals[k.id] || "—")} {k.unit}</span></>
                                  : k.targetType === "milestone_date"
                                  ? <>Expected: <span className="font-medium">{expectedPct !== undefined ? `${Math.round(expectedPct)}%` : "—"}</span></>
                                  : k.targetFrequency === "annual"
                                  ? <>Annual target: <span className="font-medium">{k.target} {k.unit}</span></>
                                  : <>Target: <span className="font-medium">{k.target} {k.unit}</span></>
                                }
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {k.targetFrequency === "annual" && actual !== null
                                  ? <>Now: <span className="font-medium">{fmtVal(actual, k.unit)}/mo</span> · Ann: <span className="font-medium">{fmtVal(effectiveActual, k.unit)}</span></>
                                  : <>Now: <span className="font-medium">{actual !== null ? `${actual} ${k.unit}` : "—"}</span></>
                                }
                              </span>
                              <RagBadge status={status} />
                              <Input type="number" value={entryVals[k.id] ?? ""}
                                onChange={e => { setEntryVals(v => ({ ...v, [k.id]: e.target.value })); setHasUnsaved(true); }}
                                placeholder={k.targetType === "milestone_date" ? "% Complete" : "Actual"} className="w-24 h-8 text-sm text-right shrink-0"
                                data-testid={`input-${k.id}`} />
                              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0"
                                onClick={() => saveKpi(k.id)} data-testid={`btn-save-${k.id}`}>
                                {saved[k.id] ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Save className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                            {k.targetType === "milestone_numeric" && (
                              <div className="flex items-center gap-2 pl-2">
                                <span className="text-xs text-muted-foreground">Period milestone target ({k.unit}):</span>
                                <Input type="number" value={milestoneVals[k.id] ?? (storedMilestone !== undefined ? String(storedMilestone) : "")}
                                  onChange={e => { setMilestoneVals(v => ({ ...v, [k.id]: e.target.value })); setHasUnsaved(true); }}
                                  placeholder="Milestone %" className="w-28 h-7 text-xs text-right"
                                  data-testid={`input-milestone-${k.id}`} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Share Dialog ── */}
      <Dialog open={shareDialog} onOpenChange={setShareDialog}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />Share Scorecard — {dept.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/40 border">
              <div>
                <p className="text-sm font-medium">Public link</p>
                <p className="text-xs text-muted-foreground mt-0.5">{shareEnabled ? "Anyone with the link can view" : "Link is currently disabled"}</p>
              </div>
              <button
                onClick={() => shareMutation.mutate(!shareEnabled)}
                disabled={shareMutation.isPending}
                data-testid="toggle-share-scorecard"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${shareEnabled ? "bg-emerald-500" : "bg-muted border"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${shareEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            {shareEnabled && shareToken && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/public/scorecard/${shareToken}`}
                    className="text-xs h-8 font-mono"
                    data-testid="input-scorecard-share-link"
                  />
                  <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1.5"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/public/scorecard/${shareToken}`);
                      toast({ title: "Link copied!", description: "Share link copied to clipboard." });
                    }}
                    data-testid="button-copy-scorecard-link">
                    <Copy className="h-3.5 w-3.5" />Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  The public page shows the full dashboard — same look and feel as the internal view.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// KPI Detail — 12-month trend
// ═════════════════════════════════════════════════════════════════════════════
// Custom dot component coloured by RAG status
const RagDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload.actual === null || cx === undefined || cy === undefined) return null;
  const c = payload.status === "green" ? "#10b981" : payload.status === "amber" ? "#f59e0b" : payload.status === "red" ? "#ef4444" : "#94a3b8";
  return <circle cx={cx} cy={cy} r={5} fill={c} stroke="white" strokeWidth={2} />;
};

function KpiDetail({ kpiId }: { kpiId: string }) {
  const [store, setStore] = useState(loadStore);
  const [, nav]           = useLocation();
  const today             = new Date();

  useEffect(() => {
    syncActualsFromDb().then(merged => { if (merged) setStore(merged); });
  }, []);

  // Search predefined KPIs AND any user-uploaded overrides (custom KPIs live here)
  const allKpis = loadAllEffectiveKpis();
  const kpi = allKpis.find(k => k.id === kpiId);

  // All hooks must be called before any early return
  const history = useMemo(() => {
    if (!kpi) return [];
    const rows = [];
    for (let i = 11; i >= 0; i--) {
      let y = today.getFullYear(), m = today.getMonth() - i;
      while (m < 0) { m += 12; y--; }
      const p2 = periodKey(y, m);
      const v  = store?.[p2]?.[kpiId];
      const actual = v !== undefined ? Number(v) : null;
      const status = getStatus(kpi, actual);
      rows.push({ period:`${MONTHS[m]} ${y}`, label:MONTHS[m].slice(0,3), actual, target:kpi.target, status });
    }
    return rows;
  }, [store, kpiId, !!kpi]);

  if (!kpi) return <div className="p-8 text-center text-muted-foreground">KPI not found.</div>;

  const pc = P_COLOR[kpi.perspective];

  // Computed stats
  const dataPoints = history.filter(h => h.actual !== null);
  const latestRow  = [...history].reverse().find(h => h.actual !== null);
  const prevRow    = [...history].reverse().find((h, i) => h.actual !== null && i > 0);
  const latestVal  = latestRow?.actual ?? null;
  const prevVal    = prevRow?.actual ?? null;
  const variance   = latestVal !== null ? latestVal - kpi.target : null;
  const goodVar    = variance !== null ? (kpi.lowerIsBetter ? -variance : variance) : null;
  const monthDelta = latestVal !== null && prevVal !== null ? latestVal - prevVal : null;
  const goodDelta  = monthDelta !== null ? (kpi.lowerIsBetter ? -monthDelta : monthDelta) : null;
  const st         = getStatus(kpi, latestVal);

  const actuals    = dataPoints.map(h => h.actual as number);
  const bestVal    = actuals.length ? (kpi.lowerIsBetter ? Math.min(...actuals) : Math.max(...actuals)) : null;
  const worstVal   = actuals.length ? (kpi.lowerIsBetter ? Math.max(...actuals) : Math.min(...actuals)) : null;
  const avgVal     = actuals.length ? Math.round((actuals.reduce((s,v) => s+v, 0) / actuals.length) * 10) / 10 : null;
  const onTargetCount = dataPoints.filter(h => h.status === "green").length;
  const onTargetPct   = dataPoints.length ? Math.round((onTargetCount / dataPoints.length) * 100) : null;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">

      {/* Back nav */}
      <Button variant="ghost" size="sm" onClick={() => window.history.back()}
        className="gap-1.5 text-muted-foreground -ml-2" data-testid="button-back">
        <ChevronLeft className="h-4 w-4" />Back to Scorecard
      </Button>

      {/* ── Hero header ── */}
      <Card className="overflow-hidden">
        <div className="h-1.5 w-full" style={{ background: pc.accent }} />
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">

            {/* Left: title + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className={cn(pc.bg, pc.text, pc.border, "border text-xs")}>{kpi.perspective}</Badge>
                <Badge variant="outline" className="text-xs text-muted-foreground border-border">
                  {kpi.lowerIsBetter ? "↓ Lower is better" : "↑ Higher is better"}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold leading-tight">{kpi.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">Target: <strong>{fmtVal(kpi.target, kpi.unit)} {kpi.unit}</strong></p>
            </div>

            {/* Right: current value + delta */}
            <div className="flex gap-6 lg:gap-8 flex-shrink-0">
              {/* Current value */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Current</p>
                <p className="text-5xl font-bold tabular-nums leading-none"
                  style={{ color: st === "green" ? "#10b981" : st === "amber" ? "#f59e0b" : st === "red" ? "#ef4444" : "hsl(var(--foreground))" }}>
                  {latestVal !== null ? fmtVal(latestVal, kpi.unit) : "—"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{kpi.unit}</p>
              </div>
              {/* Variance */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">vs Target</p>
                <p className="text-3xl font-bold tabular-nums leading-none"
                  style={{ color: goodVar !== null ? (goodVar >= 0 ? "#10b981" : "#ef4444") : "hsl(var(--muted-foreground))" }}>
                  {goodVar !== null ? (variance! > 0 ? "+" : "") + fmtVal(variance!, kpi.unit) : "—"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{kpi.unit}</p>
              </div>
              {/* vs Last Month */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">vs Last Mo.</p>
                <p className="text-3xl font-bold tabular-nums leading-none flex items-center justify-center gap-1"
                  style={{ color: goodDelta !== null ? (goodDelta > 0 ? "#10b981" : goodDelta < 0 ? "#ef4444" : "#94a3b8") : "hsl(var(--muted-foreground))" }}>
                  {goodDelta !== null
                    ? <>{goodDelta > 0 ? <ArrowUpRight className="h-6 w-6" /> : goodDelta < 0 ? <ArrowDownRight className="h-6 w-6" /> : <Minus className="h-5 w-5" />}{fmtVal(Math.abs(monthDelta!), kpi.unit)}</>
                    : "—"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{kpi.unit}</p>
              </div>
              {/* RAG status */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Status</p>
                <div className="mt-1"><RagBadge status={st as any} /></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Summary stats bar ── */}
      {dataPoints.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Best Month",      value: bestVal,         icon: <Zap className="h-4 w-4 text-emerald-500" />, color: "#10b981" },
            { label: "Worst Month",     value: worstVal,        icon: <AlertTriangle className="h-4 w-4 text-red-500" />,   color: "#ef4444" },
            { label: "12-Mo Average",   value: avgVal,          icon: <Activity className="h-4 w-4 text-blue-500" />,       color: "#3b82f6" },
            { label: "% Months on Target", value: onTargetPct !== null ? `${onTargetPct}%` : "—", icon: <Target className="h-4 w-4 text-violet-500" />, color: "#8b5cf6" },
          ].map(({ label, value, icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}18` }}>
                  {icon}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold tabular-nums">{typeof value === "number" ? fmtVal(value, kpi.unit) : (value ?? "—")} <span className="text-xs font-normal text-muted-foreground">{typeof value === "number" ? kpi.unit : ""}</span></p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── 12-Month Trend Chart ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">12-Month Performance Trend</CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="inline-block w-8 h-0.5" style={{ background: pc.accent }} /> Actual</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-8 h-0.5 border-t-2 border-dashed border-muted-foreground" /> Target</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> On Track</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> At Risk</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-red-500" /> Off Track</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={history} margin={{ top:28, right:20, left:0, bottom:0 }}>
              <defs>
                <linearGradient id={`kpi-grad-${kpiId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={pc.accent} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={pc.accent} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fill:"hsl(var(--muted-foreground))", fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:"hsl(var(--muted-foreground))", fontSize:11 }} axisLine={false} tickLine={false} width={45} />
              <Tooltip
                contentStyle={{ background:"hsl(var(--card))", border:"1px solid hsl(var(--border))", borderRadius:"10px", fontSize:12, padding:"10px 14px" }}
                formatter={(v:any, name:string) => [v !== null ? `${fmtVal(v, kpi.unit)} ${kpi.unit}` : "No data", name]}
                labelFormatter={l => `${l}`}
              />
              <ReferenceLine y={kpi.target} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value:`Target: ${fmtVal(kpi.target, kpi.unit)} ${kpi.unit}`, position:"insideTopRight", fontSize:10, fill:"hsl(var(--muted-foreground))" }} />
              <Area type="monotone" dataKey="actual" stroke={pc.accent} strokeWidth={2.5}
                fill={`url(#kpi-grad-${kpiId})`} connectNulls name="Actual"
                dot={<RagDot />} activeDot={{ r:6, stroke:"white", strokeWidth:2 }}>
                <LabelList dataKey="actual" position="top" content={(props: any) => {
                  const { x, y, value, index } = props;
                  if (value === null || value === undefined || x === undefined || y === undefined) return null;
                  const entry = history[index];
                  const c = entry?.status === "green" ? "#10b981" : entry?.status === "amber" ? "#f59e0b" : entry?.status === "red" ? "#ef4444" : "#94a3b8";
                  return <text x={x} y={y - 8} fill={c} fontSize={10} textAnchor="middle" fontWeight={600}>{value}</text>;
                }} />
              </Area>
              <Line type="monotone" dataKey="target" stroke="transparent" dot={false} name="Target">
                <LabelList dataKey="target" position="bottom" content={(props: any) => {
                  const { x, y, value } = props;
                  if (value === null || value === undefined || x === undefined || y === undefined) return null;
                  return <text x={x} y={y + 10} fill="hsl(var(--muted-foreground))" fontSize={8} textAnchor="middle" fontWeight={600}>{value}</text>;
                }} />
              </Line>
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Performance History Table ── */}
      <Card>
        <CardHeader className="pb-0 pt-4">
          <CardTitle className="text-base">Monthly Performance Detail</CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Period</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Actual</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Target</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Variance</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">% to Target</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...history].reverse().map((h, i) => {
                  const variance2 = h.actual !== null ? h.actual - kpi.target : null;
                  const goodVar2  = variance2 !== null ? (kpi.lowerIsBetter ? -variance2 : variance2) : null;
                  const pctToTgt  = h.actual !== null && kpi.target !== 0
                    ? kpi.lowerIsBetter
                      ? Math.round((1 - Math.max(0, h.actual - kpi.target) / kpi.target) * 100)
                      : Math.round((h.actual / kpi.target) * 100)
                    : null;
                  const rowBg = h.status === "red" ? "bg-red-50/40 dark:bg-red-950/10" : h.status === "amber" ? "bg-amber-50/40 dark:bg-amber-950/10" : h.status === "green" ? "bg-emerald-50/20 dark:bg-emerald-950/5" : "";
                  return (
                    <tr key={h.period} className={cn("hover:bg-muted/40 transition-colors", rowBg, i === 0 && "font-medium")}>
                      <td className="px-4 py-3 font-medium">{h.period}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">
                        {h.actual !== null
                          ? <>{fmtVal(h.actual, kpi.unit)}<span className="text-xs text-muted-foreground ml-1 font-normal">{kpi.unit}</span></>
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{fmtVal(kpi.target, kpi.unit)} {kpi.unit}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">
                        {goodVar2 !== null
                          ? <span style={{ color: goodVar2 >= 0 ? "#10b981" : "#ef4444" }}>
                              {variance2! > 0 ? "+" : ""}{fmtVal(variance2!, kpi.unit)} {kpi.unit}
                            </span>
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {pctToTgt !== null
                          ? <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full"
                                  style={{ width:`${Math.min(100, pctToTgt)}%`, background: h.status === "green" ? "#10b981" : h.status === "amber" ? "#f59e0b" : "#ef4444" }} />
                              </div>
                              <span className="text-xs font-medium w-9 text-right">{pctToTgt}%</span>
                            </div>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center"><RagBadge status={h.status as any} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

// ── Router ─────────────────────────────────────────────────────────────────────
export default function ScorecardPage() {
  const [matchDept, pDept] = useRoute("/scorecard/department/:id");
  const [matchKpi,  pKpi]  = useRoute("/scorecard/kpi/:id");

  if (matchDept && pDept) return <DepartmentDetail deptId={pDept.id} />;
  if (matchKpi  && pKpi)  return <KpiDetail kpiId={pKpi.id} />;
  return <ScorecardLanding />;
}
