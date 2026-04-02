import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import {
  LineChart, Line, AreaChart, Area,
  BarChart, Bar, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight,
  Save, Check, AlertTriangle, AlertCircle, CheckCircle2, Clock,
  Activity, Plus, Trash2, Download, Upload, FileSpreadsheet,
  RefreshCw, Building2, Edit2, BarChart2,
  GripVertical, ArrowUpRight, ArrowDownRight, ArrowRight,
  Target, Zap, Eye,
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
}
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
    { id:"it_f1", name:"IT Budget Utilization",   perspective:"Financial", unit:"%",    target:95 },
    { id:"it_f2", name:"Cost per Ticket",         perspective:"Financial", unit:"USD",  target:120, lowerIsBetter:true },
    { id:"it_c1", name:"System Uptime",           perspective:"Customer",  unit:"%",    target:99.5 },
    { id:"it_c2", name:"User Satisfaction",       perspective:"Customer",  unit:"/5",   target:4.2 },
    { id:"it_i1", name:"Ticket Resolution (hrs)", perspective:"Internal",  unit:"hrs",  target:4,   lowerIsBetter:true },
    { id:"it_i2", name:"First Call Resolution",   perspective:"Internal",  unit:"%",    target:75 },
    { id:"it_l1", name:"Digital Tool Adoption",   perspective:"Learning",  unit:"%",    target:80 },
    { id:"it_l2", name:"Training Completion",     perspective:"Learning",  unit:"%",    target:90 },
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
    { id:"cr_l2", name:"Staff Turnover Rate",      perspective:"Learning",  unit:"%",     target:12, lowerIsBetter:true },
    { id:"cr_l3", name:"Safety Training Compl.",   perspective:"Learning",  unit:"%",     target:100 },
    { id:"cr_l4", name:"Digital Tool Adoption",    perspective:"Learning",  unit:"%",     target:80 },
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

// ── Persistence ───────────────────────────────────────────────────────────────
const STORE_KEY = "ghc_beacon_v2";
const DEPT_KEY  = "bsc_departments";

function loadStore(): Record<string, Record<string, number>> {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch { return {}; }
}
function saveStore(d: Record<string, Record<string, number>>) {
  localStorage.setItem(STORE_KEY, JSON.stringify(d));
}

// ── Corporate sample data (Oct 2025 – Mar 2026) ───────────────────────────────
const CORP_SAMPLE_DATA: Record<string, Record<string, number>> = {
  "2025-10": { cr_f1:5.2, cr_f2:19.8, cr_f3:20.1, cr_f4:912, cr_c1:92.1, cr_c2:4.0, cr_c3:97.2, cr_c4:90.5, cr_i1:0.72, cr_i2:91.2, cr_i3:93.8, cr_l1:28, cr_l2:15.2, cr_l3:98,  cr_l4:68 },
  "2025-11": { cr_f1:6.1, cr_f2:20.5, cr_f3:19.8, cr_f4:887, cr_c1:93.5, cr_c2:4.1, cr_c3:98.1, cr_c4:91.2, cr_i1:0.58, cr_i2:93.4, cr_i3:95.2, cr_l1:31, cr_l2:14.8, cr_l3:100, cr_l4:72 },
  "2025-12": { cr_f1:7.8, cr_f2:21.2, cr_f3:19.2, cr_f4:865, cr_c1:95.8, cr_c2:4.3, cr_c3:98.7, cr_c4:93.1, cr_i1:0.41, cr_i2:95.1, cr_i3:96.9, cr_l1:38, cr_l2:13.1, cr_l3:100, cr_l4:76 },
  "2026-01": { cr_f1:6.4, cr_f2:19.4, cr_f3:20.4, cr_f4:878, cr_c1:91.2, cr_c2:3.9, cr_c3:96.8, cr_c4:89.8, cr_i1:0.63, cr_i2:90.8, cr_i3:94.1, cr_l1:26, cr_l2:15.5, cr_l3:97,  cr_l4:70 },
  "2026-02": { cr_f1:7.1, cr_f2:20.8, cr_f3:19.9, cr_f4:843, cr_c1:94.3, cr_c2:4.2, cr_c3:97.9, cr_c4:91.7, cr_i1:0.48, cr_i2:92.5, cr_i3:95.8, cr_l1:34, cr_l2:13.8, cr_l3:100, cr_l4:75 },
  "2026-03": { cr_f1:8.5, cr_f2:21.9, cr_f3:18.7, cr_f4:828, cr_c1:96.1, cr_c2:4.4, cr_c3:98.3, cr_c4:92.8, cr_i1:0.35, cr_i2:94.7, cr_i3:97.2, cr_l1:41, cr_l2:11.4, cr_l3:100, cr_l4:81 },
  "2026-04": { cr_f1:9.1, cr_f2:22.4, cr_f3:18.2, cr_f4:815, cr_c1:97.3, cr_c2:4.5, cr_c3:98.8, cr_c4:93.5, cr_i1:0.28, cr_i2:95.3, cr_i3:97.8, cr_l1:44, cr_l2:10.8, cr_l3:100, cr_l4:83 },
};

function seedCorpSampleData() {
  const existing = loadStore();
  const merged   = { ...existing };
  for (const [pk, vals] of Object.entries(CORP_SAMPLE_DATA)) {
    merged[pk] = { ...(merged[pk] || {}), ...vals };
  }
  saveStore(merged);
}
function loadDepartments(): BscDepartment[] {
  try { const d = localStorage.getItem(DEPT_KEY); return d ? JSON.parse(d) : DEFAULT_DEPARTMENTS; }
  catch { return DEFAULT_DEPARTMENTS; }
}
function saveDepartments(d: BscDepartment[]) {
  localStorage.setItem(DEPT_KEY, JSON.stringify(d));
}
function getKpisForDept(id: string): KpiDef[] {
  return DEPT_KPIS[id] || genericKpis(id);
}
function periodKey(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

// ── KPI logic ────────────────────────────────────────────────────────────────
function getStatus(k: KpiDef, actual: number | null): "green" | "amber" | "red" | "nodata" {
  if (actual === null || actual === undefined || isNaN(Number(actual))) return "nodata";
  const pct = k.lowerIsBetter
    ? k.target === 0 ? (actual === 0 ? 100 : 0) : Math.max(0, (1 - (actual - k.target) / Math.abs(k.target)) * 100)
    : k.target === 0 ? 100 : (Number(actual) / k.target) * 100;
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
function healthPct(kpis: KpiDef[], actuals: Record<string, number | null>): number {
  const withData = kpis.filter(k => actuals[k.id] !== null && actuals[k.id] !== undefined);
  if (!withData.length) return 0;
  return Math.round(withData.filter(k => getStatus(k, actuals[k.id]!) === "green").length / withData.length * 100);
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
              {actual !== null ? actual : <span className="text-muted-foreground text-base font-normal">—</span>}
              <span className="text-xs text-muted-foreground ml-1 font-normal">{kpi.unit}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Target: {kpi.target} {kpi.unit}</p>
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
    const id = name.toLowerCase().replace(/[^a-z0-9]/g,"_") + "_" + Date.now();
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

// ═════════════════════════════════════════════════════════════════════════════
// LANDING PAGE — Department cards grid
// ═════════════════════════════════════════════════════════════════════════════
const PERSPECTIVES: Perspective[] = ["Financial", "Customer", "Internal", "Learning"];
const PERSP_INITIALS: Record<Perspective, string> = { Financial:"F", Customer:"C", Internal:"I", Learning:"L" };
const PERSP_FULL: Record<Perspective, string> = { Financial:"Financial", Customer:"Customer", Internal:"Internal Process", Learning:"Learning" };

function healthColor(hp: number) {
  return hp >= 70 ? "#10b981" : hp >= 40 ? "#f59e0b" : "#ef4444";
}
function healthStatus(hp: number): "green"|"amber"|"red" {
  return hp >= 70 ? "green" : hp >= 40 ? "amber" : "red";
}

function ScorecardLanding() {
  const [departments, setDepartments] = useState<BscDepartment[]>(loadDepartments);
  const [store] = useState(loadStore);
  const [showAdd, setShowAdd] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const today = new Date();
  const pk  = periodKey(today.getFullYear(), today.getMonth());
  const ppk = today.getMonth() === 0
    ? periodKey(today.getFullYear()-1, 11)
    : periodKey(today.getFullYear(), today.getMonth()-1);
  const [, nav] = useLocation();

  const handleAdd = (d: BscDepartment) => {
    const updated = [...departments, d];
    setDepartments(updated);
    saveDepartments(updated);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = departments.filter(d => d.id !== id);
    setDepartments(updated);
    saveDepartments(updated);
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
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
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
    const allKpis = departments.flatMap(d => getKpisForDept(d.id));
    const allActs: Record<string, number|null> = {};
    allKpis.forEach(k => { const v = store?.[pk]?.[k.id]; allActs[k.id] = v !== undefined ? Number(v) : null; });
    const hp = healthPct(allKpis, allActs);
    const deptHps = departments.map(d => {
      const dk = getKpisForDept(d.id);
      const da: Record<string, number|null> = {};
      dk.forEach(k => { const v = store?.[pk]?.[k.id]; da[k.id] = v !== undefined ? Number(v) : null; });
      return healthPct(dk, da);
    });
    return {
      hp,
      green: deptHps.filter(h => h >= 70).length,
      amber: deptHps.filter(h => h >= 40 && h < 70).length,
      red:   deptHps.filter(h => h < 40).length,
      total: departments.length,
    };
  }, [departments, store, pk]);

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

      {/* ── Page title row ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" />Balanced Scorecard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Company performance at a glance · {MONTHS[today.getMonth()]} {today.getFullYear()}</p>
        </div>
        <Button onClick={()=>setShowAdd(true)} data-testid="button-add-department">
          <Plus className="h-4 w-4 mr-1.5" />Add Department
        </Button>
      </div>

      {/* ── Company health banner ── */}
      <Card className="overflow-hidden">
        <div className="h-1.5 w-full" style={{ background:`linear-gradient(90deg, #10b981 ${companyStats.green/companyStats.total*100}%, #f59e0b ${companyStats.green/companyStats.total*100}% ${(companyStats.green+companyStats.amber)/companyStats.total*100}%, #ef4444 ${(companyStats.green+companyStats.amber)/companyStats.total*100}%)` }} />
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Big health number */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <HealthRing pct={companyStats.hp} size={72} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Company Health Score</p>
                <p className="text-4xl font-bold tabular-nums" style={{ color: healthColor(companyStats.hp) }}>{companyStats.hp}%</p>
                <p className="text-xs text-muted-foreground">{companyStats.total} departments · {MONTHS[today.getMonth()]} {today.getFullYear()}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-16 bg-border" />

            {/* RAG dept counts */}
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-600">{companyStats.green}</p>
                <p className="text-xs text-muted-foreground mt-0.5">On Track</p>
                <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto mt-1.5" />
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-600">{companyStats.amber}</p>
                <p className="text-xs text-muted-foreground mt-0.5">At Risk</p>
                <div className="w-2 h-2 rounded-full bg-amber-500 mx-auto mt-1.5" />
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{companyStats.red}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Off Track</p>
                <div className="w-2 h-2 rounded-full bg-red-500 mx-auto mt-1.5" />
              </div>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-16 bg-border" />

            {/* Perspective legend */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {PERSPECTIVES.map(p => (
                <div key={p} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: P_COLOR[p].accent }} />
                  <span>{PERSP_FULL[p]}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Department cards grid ── */}
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <GripVertical className="h-3.5 w-3.5" />Drag cards to reorder · Click to open scorecard
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {departments.map((dept, idx) => {
          const kpis  = getKpisForDept(dept.id);
          const acts: Record<string, number | null> = {};
          kpis.forEach(k => { const v = store?.[pk]?.[k.id]; acts[k.id] = v !== undefined ? Number(v) : null; });
          const hp       = healthPct(kpis, acts);
          const hc       = healthColor(hp);
          const hs       = healthStatus(hp);

          // prev-month health for trend
          const prevActs: Record<string, number | null> = {};
          kpis.forEach(k => { const v = store?.[ppk]?.[k.id]; prevActs[k.id] = v !== undefined ? Number(v) : null; });
          const prevHp = healthPct(kpis, prevActs);
          const hpDelta = hp - prevHp;

          // per-perspective dots
          const perspDots = PERSPECTIVES.map(p => {
            const pk2 = kpis.filter(k => k.perspective === p);
            const pa: Record<string,number|null> = {};
            pk2.forEach(k => { pa[k.id] = acts[k.id]; });
            const php = healthPct(pk2, pa);
            return { p, color: healthColor(php), initial: PERSP_INITIALS[p] };
          });

          const isDragging = dragIndex === idx;
          const isOver     = overIndex === idx && dragIndex !== idx;
          const borderColor = hs === "green" ? "#10b981" : hs === "amber" ? "#f59e0b" : "#ef4444";

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
        <Card className="cursor-pointer hover:shadow-md transition-all border-dashed hover:border-primary/50 group"
          onClick={() => setShowAdd(true)} data-testid="card-add-department">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-3 min-h-[148px] text-muted-foreground group-hover:text-primary transition-colors">
            <div className="h-10 w-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center">
              <Plus className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Add Department</p>
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
    <ResponsiveContainer width="100%" height={52}>
      <LineChart data={pts} margin={{ top:4, right:4, bottom:4, left:4 }}>
        <Line type="monotone" dataKey="actual" stroke={color} strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeWidth={1}
          strokeDasharray="3 2" dot={false} />
        <Tooltip
          contentStyle={{ background:"hsl(var(--card))", border:"1px solid hsl(var(--border))", borderRadius:"6px", fontSize:10, padding:"2px 6px" }}
          formatter={(v:any, name:string) => [v !== null ? `${v} ${kpi.unit}` : "—", name === "actual" ? "Actual" : "Target"]}
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
              {actual !== null ? actual : <span className="text-muted-foreground text-base font-normal">—</span>}
              <span className="text-xs text-muted-foreground ml-1 font-normal">{kpi.unit}</span>
            </p>
            <p className="text-xs text-muted-foreground">Target: {kpi.target} {kpi.unit}</p>
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
// DEPARTMENT DETAIL — Dashboard + Data Entry tabs
// ═════════════════════════════════════════════════════════════════════════════
function DepartmentDetail({ deptId }: { deptId: string }) {
  const today = new Date();
  const [year, setYear]     = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [store, setStore]   = useState(loadStore);
  const [depts]             = useState(loadDepartments);
  const [entryVals, setEntryVals] = useState<Record<string, string>>({});
  const [saved, setSaved]   = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sortCol, setSortCol]   = useState<string>("status");
  const [sortDir, setSortDir]   = useState<"asc"|"desc">("asc");
  const { toast } = useToast();
  const [, nav] = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);

  const dept = depts.find(d => d.id === deptId) || { id: deptId, name: deptId, icon: "🏢", color: "#3B82F6" };
  const kpis = getKpisForDept(deptId);
  const pk   = periodKey(year, month);
  const ppk  = month === 0 ? periodKey(year-1, 11) : periodKey(year, month-1);

  const getActual = useCallback((id:string, p=pk): number|null => {
    const v = store?.[p]?.[id]; return v !== undefined ? Number(v) : null;
  }, [store, pk]);

  // Auto-seed sample data for corporate department on first visit
  useEffect(() => {
    if (deptId !== "corp") return;
    const s = loadStore();
    const hasAnyCorpData = Object.values(s).some(v => Object.keys(v).some(k => k.startsWith("cr_")));
    if (!hasAnyCorpData) {
      seedCorpSampleData();
      setStore(loadStore());
    }
  }, [deptId]);

  // Pre-fill form when period changes
  useEffect(() => {
    const pre: Record<string,string> = {};
    kpis.forEach(k => { const v = store?.[pk]?.[k.id]; if (v !== undefined) pre[k.id] = String(v); });
    setEntryVals(pre);
  }, [pk]);

  const allActuals: Record<string, number|null> = {};
  kpis.forEach(k => { allActuals[k.id] = getActual(k.id); });
  const hp       = healthPct(kpis, allActuals);
  const onTrack  = kpis.filter(k => getStatus(k, allActuals[k.id]) === "green").length;
  const atRisk   = kpis.filter(k => getStatus(k, allActuals[k.id]) === "amber").length;
  const offTrack = kpis.filter(k => getStatus(k, allActuals[k.id]) === "red").length;

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
    return [...kpis].sort((a, b) => {
      const aAct = getActual(a.id), bAct = getActual(b.id);
      const aS = getStatus(a, aAct) || "none", bS = getStatus(b, bAct) || "none";
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
  }, [kpis, sortCol, sortDir, store, pk]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };
  const SortIcon = ({ col }: { col: string }) => (
    <span className="ml-1 text-muted-foreground/60">
      {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );

  const saveKpi = (id:string) => {
    const val = entryVals[id]; if (!val && val !== "0") return;
    const updated = { ...store, [pk]: { ...(store[pk]||{}), [id]: Number(val) } };
    setStore(updated); saveStore(updated);
    setSaved(s => ({ ...s, [id]: true }));
    setTimeout(() => setSaved(s => ({ ...s, [id]: false })), 1500);
  };

  const saveAll = () => {
    const updates: Record<string,number> = {};
    kpis.forEach(k => { if (entryVals[k.id] !== undefined && entryVals[k.id] !== "") updates[k.id] = Number(entryVals[k.id]); });
    if (!Object.keys(updates).length) { toast({ title:"Nothing to save", description:"Enter at least one value first." }); return; }
    const updated = { ...store, [pk]: { ...(store[pk]||{}), ...updates } };
    setStore(updated); saveStore(updated);
    toast({ title:"Saved", description:`${Object.keys(updates).length} values saved for ${MONTHS[month]} ${year}.` });
  };

  // ── Excel template download ──────────────────────────────────────────────
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Actuals for selected year — columns Jan..Dec
    const header1 = ["KPI Name", "Perspective", "Target", "Unit", "Lower is Better",
      ...MONTHS.map(m => `${m} ${year}`)];
    const dataRows1 = kpis.map(k => {
      const row: (string | number)[] = [k.name, k.perspective, k.target, k.unit, k.lowerIsBetter ? "Yes" : "No"];
      MONTHS.forEach((_, mi) => {
        const p = periodKey(year, mi);
        const v = store?.[p]?.[k.id];
        row.push(v !== undefined ? Number(v) : ("" as any));
      });
      return row;
    });
    const ws1 = XLSX.utils.aoa_to_sheet([header1, ...dataRows1]);
    ws1["!cols"] = [{ wch:32 }, { wch:16 }, { wch:10 }, { wch:8 }, { wch:16 },
      ...MONTHS.map(() => ({ wch:10 }))];
    XLSX.utils.book_append_sheet(wb, ws1, `Actuals ${year}`);

    // Sheet 2: Historical — all stored periods in "Mon YYYY" column format
    const storeNow = loadStore();
    // Collect all unique years stored
    const storedYears = [...new Set(Object.keys(storeNow).map(p => Number(p.slice(0,4))))].sort();
    // Build ordered column list: Jan YYYY, Feb YYYY, ... for each stored year
    const histCols: { label: string; year: number; mi: number }[] = [];
    storedYears.forEach(y => {
      MONTHS.forEach((m, mi) => histCols.push({ label: `${m} ${y}`, year: y, mi }));
    });
    const header2 = ["KPI Name", "Perspective", "Target", "Unit", "Lower is Better",
      ...histCols.map(c => c.label)];
    const dataRows2 = kpis.map(k => {
      const row: (string | number)[] = [k.name, k.perspective, k.target, k.unit, k.lowerIsBetter ? "Yes" : "No"];
      histCols.forEach(({ year: y, mi }) => {
        const p = periodKey(y, mi);
        const v = storeNow?.[p]?.[k.id];
        row.push(v !== undefined ? Number(v) : ("" as any));
      });
      return row;
    });
    const ws2 = XLSX.utils.aoa_to_sheet([header2, ...dataRows2]);
    ws2["!cols"] = [{ wch:32 }, { wch:16 }, { wch:10 }, { wch:8 }, { wch:16 },
      ...histCols.map(() => ({ wch:10 }))];
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
      let totalUpdates = 0;

      for (const row of rows) {
        const kpiName = String(row["KPI Name"] || row["KPI"] || "").trim();
        if (!kpiName) continue;
        const kpi = kpis.find(k => k.name.toLowerCase() === kpiName.toLowerCase());
        if (!kpi) continue;

        detectedCols.forEach(({ key, year: colYear, mi }) => {
          const val = row[key];
          const strVal = String(val ?? "").trim();
          if (strVal === "" || isNaN(Number(strVal))) return;
          const p = periodKey(colYear, mi);
          if (!updatedStore[p]) updatedStore[p] = {};
          updatedStore[p][kpi.id] = Number(strVal);
          totalUpdates++;
        });
      }

      if (!totalUpdates) {
        toast({ title:"No data found", description:"Fill in the monthly actual columns in the template, then upload again.", variant:"destructive" });
        return;
      }

      setStore({ ...updatedStore });
      saveStore(updatedStore);

      // Refresh form values for current period
      const pre: Record<string,string> = {};
      kpis.forEach(k => { const v = updatedStore[pk]?.[k.id]; if (v !== undefined) pre[k.id] = String(v); });
      setEntryVals(pre);

      toast({ title:"Upload successful", description:`${totalUpdates} data points updated for ${dept.name}. Dashboard refreshed.` });
      setActiveTab("dashboard");
    } catch (err:any) {
      toast({ title:"Upload failed", description:err.message, variant:"destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const perspectives: Perspective[] = ["Financial", "Customer", "Internal", "Learning"];

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Back + period */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={()=>nav("/scorecard")}
          className="gap-1.5 text-muted-foreground w-fit" data-testid="button-back">
          <ChevronLeft className="h-4 w-4" />All Departments
        </Button>
        <PeriodSelector year={year} month={month} onChange={(y,m)=>{ setYear(y); setMonth(m); }} />
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
              onClick={() => { seedCorpSampleData(); setStore(loadStore()); toast({ title:"Sample data loaded", description:"7 months of Corporate data applied." }); }}>
              <Activity className="h-3.5 w-3.5" />Load Sample Data
            </Button>
          )}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Health Score</p>
            <HealthRing pct={hp} size={56} />
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />{onTrack} on track</span>
            <span className="flex items-center gap-1.5 text-amber-600"><AlertTriangle className="h-3.5 w-3.5" />{atRisk} at risk</span>
            <span className="flex items-center gap-1.5 text-red-600"><AlertCircle className="h-3.5 w-3.5" />{offTrack} off track</span>
          </div>
        </div>
      </div>

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

          {/* ── 1. Health Summary + Movement Strip ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Overall health panel */}
            <Card>
              <CardContent className="p-5 flex flex-col items-center gap-4">
                <HealthRing pct={hp} size={88} />
                <div className="text-center">
                  <p className="font-bold text-2xl tabular-nums" style={{ color: healthColor(hp) }}>{hp}%</p>
                  <p className="text-sm font-medium">Overall Health Score</p>
                  <p className="text-xs text-muted-foreground">{MONTHS[month]} {year}</p>
                </div>
                <div className="w-full grid grid-cols-3 gap-2 text-center border-t pt-3">
                  <div><p className="text-xl font-bold text-emerald-600">{onTrack}</p><p className="text-xs text-muted-foreground">On Track</p></div>
                  <div><p className="text-xl font-bold text-amber-600">{atRisk}</p><p className="text-xs text-muted-foreground">At Risk</p></div>
                  <div><p className="text-xl font-bold text-red-600">{offTrack}</p><p className="text-xs text-muted-foreground">Off Track</p></div>
                </div>
              </CardContent>
            </Card>

            {/* Most Improved */}
            <Card className="border-emerald-200 dark:border-emerald-900/60">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />Most Improved vs Last Month
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-2.5">
                {movers.improved.length === 0
                  ? <p className="text-xs text-muted-foreground italic">No data comparison available yet.</p>
                  : movers.improved.map(({ kpi, curr, pct }) => {
                    const pc = P_COLOR[kpi.perspective];
                    return (
                      <button key={kpi.id} onClick={() => nav(`/scorecard/kpi/${kpi.id}`)}
                        className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-left group">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: pc.accent }} />
                          <span className="text-sm font-medium truncate">{kpi.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{curr} {kpi.unit}</span>
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-0 text-xs">+{pct}%</Badge>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    );
                  })
                }
              </CardContent>
            </Card>

            {/* Needs Attention */}
            <Card className="border-red-200 dark:border-red-900/60">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />Needs Attention vs Last Month
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-2.5">
                {movers.declined.length === 0
                  ? <p className="text-xs text-muted-foreground italic">No declining KPIs detected.</p>
                  : movers.declined.map(({ kpi, curr, pct }) => {
                    const pc = P_COLOR[kpi.perspective];
                    return (
                      <button key={kpi.id} onClick={() => nav(`/scorecard/kpi/${kpi.id}`)}
                        className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-left group">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: pc.accent }} />
                          <span className="text-sm font-medium truncate">{kpi.name}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-bold text-red-700 dark:text-red-400">{curr} {kpi.unit}</span>
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-0 text-xs">-{pct}%</Badge>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    );
                  })
                }
              </CardContent>
            </Card>
          </div>

          {/* ── 2. Perspective Summary (2×2 grid) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {PERSPECTIVES.map(p => {
              const pkpis = kpis.filter(k => k.perspective === p);
              const pActs: Record<string,number|null> = {};
              pkpis.forEach(k => { pActs[k.id] = getActual(k.id); });
              const php    = healthPct(pkpis, pActs);
              const pc     = P_COLOR[p];
              const pGreen = pkpis.filter(k => getStatus(k, pActs[k.id]) === "green").length;
              const pAmber = pkpis.filter(k => getStatus(k, pActs[k.id]) === "amber").length;
              const pRed   = pkpis.filter(k => getStatus(k, pActs[k.id]) === "red").length;
              const hc     = healthColor(php);
              return (
                <Card key={p} className="overflow-hidden">
                  <div className="h-1 w-full" style={{ background: pc.accent }} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{PERSP_LABEL[p].split(" /")[0]}</p>
                        <p className="text-2xl font-bold tabular-nums mt-0.5" style={{ color: hc }}>{php}%</p>
                      </div>
                      <span className="text-lg">{p === "Financial" ? "💰" : p === "Customer" ? "🎯" : p === "Internal" ? "⚙️" : "📈"}</span>
                    </div>
                    {/* Stacked RAG bar */}
                    <div className="h-2 rounded-full overflow-hidden flex mb-2.5">
                      <div style={{ width:`${(pGreen/pkpis.length)*100}%`, background:"#10b981" }} className="transition-all" />
                      <div style={{ width:`${(pAmber/pkpis.length)*100}%`, background:"#f59e0b" }} className="transition-all" />
                      <div style={{ width:`${(pRed/pkpis.length)*100}%`,   background:"#ef4444" }} className="transition-all" />
                      {pGreen+pAmber+pRed === 0 && <div className="flex-1 bg-muted" />}
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span className="text-emerald-600 font-semibold">{pGreen}</span>
                      <span className="text-amber-600 font-semibold">{pAmber}</span>
                      <span className="text-red-600 font-semibold">{pRed}</span>
                      <span className="ml-auto">{pkpis.length} KPIs</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── 3. Interactive KPI Scorecard Table ── */}
          <Card>
            <CardHeader className="pb-0 pt-4 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-muted-foreground" />KPI Scorecard — {MONTHS[month]} {year}
                </CardTitle>
                <p className="text-xs text-muted-foreground">Click any row to view trend · Click column headers to sort</p>
              </div>
            </CardHeader>
            <CardContent className="p-0 mt-3">
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
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none"
                        onClick={() => handleSort("actual")}>Actual <SortIcon col="actual" /></th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Target</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Variance</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">vs Last Mo.</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">6-Month Trend</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedKpis.map(k => {
                      const actual  = getActual(k.id);
                      const prev    = getActual(k.id, ppk);
                      const st      = getStatus(k, actual);
                      const pc      = P_COLOR[k.perspective];
                      const rawDelta  = actual !== null && prev !== null ? actual - prev : null;
                      const goodDelta = rawDelta !== null ? (k.lowerIsBetter ? -rawDelta : rawDelta) : null;
                      const variance  = actual !== null ? actual - k.target : null;
                      const goodVar   = variance !== null ? (k.lowerIsBetter ? -variance : variance) : null;
                      const rowBg = st === "red" ? "bg-red-50/40 dark:bg-red-950/10" : st === "amber" ? "bg-amber-50/40 dark:bg-amber-950/10" : "";
                      return (
                        <tr key={k.id} onClick={() => nav(`/scorecard/kpi/${k.id}`)}
                          className={cn("cursor-pointer hover:bg-muted/50 transition-colors group", rowBg)}>
                          {/* Status dot */}
                          <td className="px-4 py-3">
                            <div className={cn("w-2.5 h-2.5 rounded-full mx-auto",
                              st === "green" ? "bg-emerald-500" : st === "amber" ? "bg-amber-500" : st === "red" ? "bg-red-500" : "bg-muted-foreground/30")} />
                          </td>
                          {/* KPI Name */}
                          <td className="px-4 py-3 font-medium max-w-[200px]">
                            <span className="line-clamp-1">{k.name}</span>
                          </td>
                          {/* Perspective badge */}
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", pc.bg, pc.text)}>
                              {PERSP_INITIALS[k.perspective]}
                            </span>
                          </td>
                          {/* Actual */}
                          <td className="px-4 py-3 text-right font-bold tabular-nums">
                            {actual !== null
                              ? <>{actual}<span className="text-xs text-muted-foreground ml-1 font-normal">{k.unit}</span></>
                              : <span className="text-muted-foreground font-normal">—</span>}
                          </td>
                          {/* Target */}
                          <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                            {k.target}<span className="text-xs ml-1">{k.unit}</span>
                          </td>
                          {/* Variance */}
                          <td className="px-4 py-3 text-right tabular-nums font-medium">
                            {goodVar !== null
                              ? <span style={{ color: goodVar >= 0 ? "#10b981" : "#ef4444" }}>
                                  {goodVar > 0 ? "+" : ""}{variance?.toFixed(1)}<span className="text-xs ml-0.5 font-normal">{k.unit}</span>
                                </span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                          {/* vs Last Month */}
                          <td className="px-4 py-3 text-center">
                            {goodDelta !== null
                              ? <span className="inline-flex items-center gap-0.5 text-xs font-semibold"
                                  style={{ color: goodDelta > 0 ? "#10b981" : goodDelta < 0 ? "#ef4444" : "#94a3b8" }}>
                                  {goodDelta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : goodDelta < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                                  {Math.abs(rawDelta!).toFixed(1)}
                                </span>
                              : <span className="text-muted-foreground/50 text-xs">—</span>}
                          </td>
                          {/* Sparkline */}
                          <td className="px-4 py-3 w-32">
                            <KpiSparkline kpi={k} store={store} year={year} month={month} />
                          </td>
                          {/* Drill-down arrow */}
                          <td className="px-4 py-3">
                            <Eye className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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
                <CardTitle className="text-base">Manual Entry — {MONTHS[month]} {year}</CardTitle>
                <Button size="sm" onClick={saveAll} data-testid="button-save-all">
                  <Save className="h-3.5 w-3.5 mr-1.5" />Save All
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
                        const status = getStatus(k, actual);
                        return (
                          <div key={k.id}
                            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors flex-wrap sm:flex-nowrap">
                            <span className="text-sm text-foreground flex-1 min-w-[160px]">{k.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              Target: <span className="font-medium">{k.target} {k.unit}</span>
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              Now: <span className="font-medium">{actual ?? "—"}</span>
                            </span>
                            <RagBadge status={status} />
                            <Input type="number" value={entryVals[k.id] ?? ""}
                              onChange={e => setEntryVals(v => ({ ...v, [k.id]: e.target.value }))}
                              placeholder="Actual" className="w-24 h-8 text-sm text-right shrink-0"
                              data-testid={`input-${k.id}`} />
                            <Button size="icon" variant="outline" className="h-8 w-8 shrink-0"
                              onClick={() => saveKpi(k.id)} data-testid={`btn-save-${k.id}`}>
                              {saved[k.id] ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Save className="h-3.5 w-3.5" />}
                            </Button>
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
  const [store]   = useState(loadStore);
  const [, nav]   = useLocation();
  const today     = new Date();

  const allKpis = Object.values(DEPT_KPIS).flat();
  const kpi = allKpis.find(k => k.id === kpiId);
  if (!kpi) return <div className="p-8 text-center text-muted-foreground">KPI not found.</div>;

  const pc = P_COLOR[kpi.perspective];

  const history = useMemo(() => {
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
  }, [store, kpiId]);

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
      <Button variant="ghost" size="sm" onClick={() => nav(-1 as any)}
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
              <p className="text-sm text-muted-foreground mt-1">Target: <strong>{kpi.target} {kpi.unit}</strong></p>
            </div>

            {/* Right: current value + delta */}
            <div className="flex gap-6 lg:gap-8 flex-shrink-0">
              {/* Current value */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Current</p>
                <p className="text-5xl font-bold tabular-nums leading-none"
                  style={{ color: st === "green" ? "#10b981" : st === "amber" ? "#f59e0b" : st === "red" ? "#ef4444" : "hsl(var(--foreground))" }}>
                  {latestVal !== null ? latestVal : "—"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{kpi.unit}</p>
              </div>
              {/* Variance */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">vs Target</p>
                <p className="text-3xl font-bold tabular-nums leading-none"
                  style={{ color: goodVar !== null ? (goodVar >= 0 ? "#10b981" : "#ef4444") : "hsl(var(--muted-foreground))" }}>
                  {goodVar !== null ? (variance! > 0 ? "+" : "") + variance!.toFixed(1) : "—"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{kpi.unit}</p>
              </div>
              {/* vs Last Month */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">vs Last Mo.</p>
                <p className="text-3xl font-bold tabular-nums leading-none flex items-center justify-center gap-1"
                  style={{ color: goodDelta !== null ? (goodDelta > 0 ? "#10b981" : goodDelta < 0 ? "#ef4444" : "#94a3b8") : "hsl(var(--muted-foreground))" }}>
                  {goodDelta !== null
                    ? <>{goodDelta > 0 ? <ArrowUpRight className="h-6 w-6" /> : goodDelta < 0 ? <ArrowDownRight className="h-6 w-6" /> : <Minus className="h-5 w-5" />}{Math.abs(monthDelta!).toFixed(1)}</>
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
                  <p className="text-lg font-bold tabular-nums">{value !== null ? value : "—"} <span className="text-xs font-normal text-muted-foreground">{typeof value === "number" ? kpi.unit : ""}</span></p>
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
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={history} margin={{ top:10, right:20, left:0, bottom:0 }}>
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
                formatter={(v:any, name:string) => [v !== null ? `${v} ${kpi.unit}` : "No data", name]}
                labelFormatter={l => `${l}`}
              />
              <ReferenceLine y={kpi.target} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 3" strokeWidth={1.5}
                label={{ value:`Target: ${kpi.target}`, position:"insideTopRight", fontSize:10, fill:"hsl(var(--muted-foreground))" }} />
              <Area type="monotone" dataKey="actual" stroke={pc.accent} strokeWidth={2.5}
                fill={`url(#kpi-grad-${kpiId})`} connectNulls name="Actual"
                dot={<RagDot />} activeDot={{ r:6, stroke:"white", strokeWidth:2 }} />
              <Line type="monotone" dataKey="target" stroke="transparent" dot={false} name="Target" />
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
                          ? <>{h.actual}<span className="text-xs text-muted-foreground ml-1 font-normal">{kpi.unit}</span></>
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{kpi.target} {kpi.unit}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">
                        {goodVar2 !== null
                          ? <span style={{ color: goodVar2 >= 0 ? "#10b981" : "#ef4444" }}>
                              {variance2! > 0 ? "+" : ""}{variance2!.toFixed(1)} {kpi.unit}
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
