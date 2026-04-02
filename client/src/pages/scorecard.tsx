import { useState, useEffect, useMemo } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight,
  Home, BarChart2, Users, Building2, Activity, Edit3, Save, Check,
  AlertTriangle, AlertCircle, CheckCircle, Clock, Target, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ── Palette ──────────────────────────────────────────────────────────────────
const DARK_BG    = "#0A1628";
const CARD_BG    = "#0D1F3C";
const CARD_BG2   = "#162040";
const TEAL       = "#00C9A7";
const P_COLORS   = { Financial: "#3B82F6", Customer: "#8B5CF6", Internal: "#F59E0B", Learning: "#10B981" };
const STATUS_MAP = {
  green:  { label: "On Track",  bg: "bg-emerald-900/40", text: "text-emerald-400", border: "border-emerald-700/50", hex: "#10B981" },
  amber:  { label: "At Risk",   bg: "bg-amber-900/40",   text: "text-amber-400",   border: "border-amber-700/50",   hex: "#F59E0B" },
  red:    { label: "Off Track", bg: "bg-red-900/40",      text: "text-red-400",     border: "border-red-700/50",     hex: "#EF4444" },
  nodata: { label: "No Data",   bg: "bg-gray-800/40",    text: "text-gray-500",    border: "border-gray-700/50",    hex: "#6B7280" },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── KPI Definitions ──────────────────────────────────────────────────────────
type Perspective = "Financial" | "Customer" | "Internal" | "Learning";
interface KpiDef { id: string; name: string; perspective: Perspective; unit: string; target: number; lowerIsBetter?: boolean; dept: string; description?: string; }

const CORPORATE_KPIS: KpiDef[] = [
  { id:"fin1",  name:"Revenue Growth",          perspective:"Financial", unit:"%",    target:8,    dept:"Corporate" },
  { id:"fin2",  name:"EBITDA Margin",            perspective:"Financial", unit:"%",    target:22,   dept:"Corporate" },
  { id:"fin3",  name:"Cost per Turn",            perspective:"Financial", unit:"USD",  target:850,  dept:"Corporate", lowerIsBetter:true },
  { id:"fin4",  name:"Overhead Ratio",           perspective:"Financial", unit:"%",    target:18,   dept:"Corporate", lowerIsBetter:true },
  { id:"cst1",  name:"On-Time Performance",      perspective:"Customer",  unit:"%",    target:95,   dept:"Corporate" },
  { id:"cst2",  name:"Customer Satisfaction",    perspective:"Customer",  unit:"/5",   target:4.2,  dept:"Corporate" },
  { id:"cst3",  name:"SLA Compliance",           perspective:"Customer",  unit:"%",    target:98,   dept:"Corporate" },
  { id:"cst4",  name:"Airline Retention Rate",   perspective:"Customer",  unit:"%",    target:92,   dept:"Corporate" },
  { id:"int1",  name:"Ground Damage Rate",       perspective:"Internal",  unit:"/1000",target:0.5,  dept:"Corporate", lowerIsBetter:true },
  { id:"int2",  name:"FOD Incidents",            perspective:"Internal",  unit:"#",    target:0,    dept:"Corporate", lowerIsBetter:true },
  { id:"int3",  name:"Turnaround Compliance",    perspective:"Internal",  unit:"%",    target:94,   dept:"Corporate" },
  { id:"int4",  name:"Equipment Availability",   perspective:"Internal",  unit:"%",    target:96,   dept:"Corporate" },
  { id:"lrn1",  name:"Training Hours/Employee",  perspective:"Learning",  unit:"hrs",  target:40,   dept:"Corporate" },
  { id:"lrn2",  name:"Staff Turnover Rate",      perspective:"Learning",  unit:"%",    target:12,   dept:"Corporate", lowerIsBetter:true },
  { id:"lrn3",  name:"Safety Training Completion",perspective:"Learning", unit:"%",    target:100,  dept:"Corporate" },
  { id:"lrn4",  name:"Digital Tool Adoption",    perspective:"Learning",  unit:"%",    target:80,   dept:"Corporate" },
];

const DEPARTMENTS = [
  { id:"ops",     name:"Operations",  icon:"✈️",  color:"#3B82F6" },
  { id:"eng",     name:"Engineering", icon:"🔧",  color:"#8B5CF6" },
  { id:"fin",     name:"Finance",     icon:"💰",  color:"#10B981" },
  { id:"hr",      name:"HR",          icon:"👥",  color:"#F59E0B" },
  { id:"qhse",    name:"QHSE",        icon:"🛡️",  color:"#EF4444" },
  { id:"it",      name:"IT",          icon:"💻",  color:"#06B6D4" },
  { id:"comm",    name:"Commercial",  icon:"📊",  color:"#8B5CF6" },
  { id:"camo",    name:"CAMO",        icon:"📋",  color:"#F59E0B" },
  { id:"mro",     name:"MRO",         icon:"⚙️",  color:"#10B981" },
  { id:"corp",    name:"Corporate",   icon:"🏢",  color:"#3B82F6" },
];

const DEPT_KPIS: Record<string, KpiDef[]> = {
  ops: [
    { id:"ops_f1", name:"Revenue/Aircraft",       perspective:"Financial", unit:"USD",  target:12000, dept:"Operations" },
    { id:"ops_f2", name:"Cost Efficiency Ratio",  perspective:"Financial", unit:"%",    target:72, dept:"Operations", lowerIsBetter:true },
    { id:"ops_c1", name:"On-Time Performance",    perspective:"Customer",  unit:"%",    target:95, dept:"Operations" },
    { id:"ops_c2", name:"Customer Score",         perspective:"Customer",  unit:"/5",   target:4.3, dept:"Operations" },
    { id:"ops_i1", name:"Turnaround Compliance",  perspective:"Internal",  unit:"%",    target:94, dept:"Operations" },
    { id:"ops_i2", name:"Ground Damage Rate",     perspective:"Internal",  unit:"/1000",target:0.5, dept:"Operations", lowerIsBetter:true },
    { id:"ops_l1", name:"Training Completion",    perspective:"Learning",  unit:"%",    target:95, dept:"Operations" },
    { id:"ops_l2", name:"Turnover Rate",          perspective:"Learning",  unit:"%",    target:10, dept:"Operations", lowerIsBetter:true },
  ],
  eng: [
    { id:"eng_f1", name:"Maintenance Cost/AC",    perspective:"Financial", unit:"USD",  target:8500, dept:"Engineering", lowerIsBetter:true },
    { id:"eng_f2", name:"Budget Utilization",     perspective:"Financial", unit:"%",    target:95, dept:"Engineering" },
    { id:"eng_c1", name:"SLA Compliance",         perspective:"Customer",  unit:"%",    target:98, dept:"Engineering" },
    { id:"eng_c2", name:"Client Satisfaction",    perspective:"Customer",  unit:"/5",   target:4.2, dept:"Engineering" },
    { id:"eng_i1", name:"Equipment Availability", perspective:"Internal",  unit:"%",    target:96, dept:"Engineering" },
    { id:"eng_i2", name:"Defect Rate",            perspective:"Internal",  unit:"%",    target:1.5, dept:"Engineering", lowerIsBetter:true },
    { id:"eng_l1", name:"Certifications",         perspective:"Learning",  unit:"#",    target:24, dept:"Engineering" },
    { id:"eng_l2", name:"Tooling Compliance",     perspective:"Learning",  unit:"%",    target:100, dept:"Engineering" },
  ],
  fin: [
    { id:"fin_f1", name:"Operating Margin",       perspective:"Financial", unit:"%",    target:22, dept:"Finance" },
    { id:"fin_f2", name:"Cash Conversion Days",   perspective:"Financial", unit:"days", target:45, dept:"Finance", lowerIsBetter:true },
    { id:"fin_c1", name:"Internal Satisfaction",  perspective:"Customer",  unit:"/5",   target:4.0, dept:"Finance" },
    { id:"fin_c2", name:"Report Accuracy",        perspective:"Customer",  unit:"%",    target:99, dept:"Finance" },
    { id:"fin_i1", name:"Month-End Close Days",   perspective:"Internal",  unit:"days", target:5, dept:"Finance", lowerIsBetter:true },
    { id:"fin_i2", name:"Budget Variance",        perspective:"Internal",  unit:"%",    target:5, dept:"Finance", lowerIsBetter:true },
    { id:"fin_l1", name:"Staff Training Hours",   perspective:"Learning",  unit:"hrs",  target:40, dept:"Finance" },
    { id:"fin_l2", name:"Digital Adoption",       perspective:"Learning",  unit:"%",    target:80, dept:"Finance" },
  ],
  hr: [
    { id:"hr_f1",  name:"Cost per Hire",          perspective:"Financial", unit:"USD",  target:2500, dept:"HR", lowerIsBetter:true },
    { id:"hr_f2",  name:"Training Cost/Employee", perspective:"Financial", unit:"USD",  target:1200, dept:"HR" },
    { id:"hr_c1",  name:"Employee Satisfaction",  perspective:"Customer",  unit:"/5",   target:4.2, dept:"HR" },
    { id:"hr_c2",  name:"Offer Acceptance Rate",  perspective:"Customer",  unit:"%",    target:85, dept:"HR" },
    { id:"hr_i1",  name:"Time to Hire",           perspective:"Internal",  unit:"days", target:30, dept:"HR", lowerIsBetter:true },
    { id:"hr_i2",  name:"Absenteeism Rate",       perspective:"Internal",  unit:"%",    target:3, dept:"HR", lowerIsBetter:true },
    { id:"hr_l1",  name:"Training Completion",    perspective:"Learning",  unit:"%",    target:95, dept:"HR" },
    { id:"hr_l2",  name:"Turnover Rate",          perspective:"Learning",  unit:"%",    target:12, dept:"HR", lowerIsBetter:true },
  ],
  qhse: [
    { id:"q_f1",   name:"Safety Budget Util",     perspective:"Financial", unit:"%",    target:95, dept:"QHSE" },
    { id:"q_c1",   name:"Audit Compliance Score", perspective:"Customer",  unit:"%",    target:97, dept:"QHSE" },
    { id:"q_c2",   name:"Incident Resolution Days",perspective:"Customer", unit:"days", target:5, dept:"QHSE", lowerIsBetter:true },
    { id:"q_i1",   name:"FOD Incidents",          perspective:"Internal",  unit:"#",    target:0, dept:"QHSE", lowerIsBetter:true },
    { id:"q_i2",   name:"Near Miss Reports",      perspective:"Internal",  unit:"#",    target:12, dept:"QHSE" },
    { id:"q_l1",   name:"Safety Training Completion",perspective:"Learning",unit:"%",   target:100, dept:"QHSE" },
    { id:"q_l2",   name:"Safety Culture Score",   perspective:"Learning",  unit:"/5",   target:4.5, dept:"QHSE" },
  ],
  it: [
    { id:"it_f1",  name:"IT Budget Utilization",  perspective:"Financial", unit:"%",    target:95, dept:"IT" },
    { id:"it_f2",  name:"Cost per Ticket",        perspective:"Financial", unit:"USD",  target:120, dept:"IT", lowerIsBetter:true },
    { id:"it_c1",  name:"System Uptime",          perspective:"Customer",  unit:"%",    target:99.5, dept:"IT" },
    { id:"it_c2",  name:"User Satisfaction",      perspective:"Customer",  unit:"/5",   target:4.2, dept:"IT" },
    { id:"it_i1",  name:"Ticket Resolution Time", perspective:"Internal",  unit:"hrs",  target:4, dept:"IT", lowerIsBetter:true },
    { id:"it_i2",  name:"First Call Resolution",  perspective:"Internal",  unit:"%",    target:75, dept:"IT" },
    { id:"it_l1",  name:"Digital Tool Adoption",  perspective:"Learning",  unit:"%",    target:80, dept:"IT" },
    { id:"it_l2",  name:"Training Completion",    perspective:"Learning",  unit:"%",    target:90, dept:"IT" },
  ],
  comm: [
    { id:"co_f1",  name:"Revenue Growth",         perspective:"Financial", unit:"%",    target:10, dept:"Commercial" },
    { id:"co_f2",  name:"Contract Value",         perspective:"Financial", unit:"MUSD", target:25, dept:"Commercial" },
    { id:"co_c1",  name:"Customer Retention",     perspective:"Customer",  unit:"%",    target:92, dept:"Commercial" },
    { id:"co_c2",  name:"Customer Satisfaction",  perspective:"Customer",  unit:"/5",   target:4.3, dept:"Commercial" },
    { id:"co_i1",  name:"Proposal Win Rate",      perspective:"Internal",  unit:"%",    target:40, dept:"Commercial" },
    { id:"co_i2",  name:"Contract Renewal Rate",  perspective:"Internal",  unit:"%",    target:85, dept:"Commercial" },
    { id:"co_l1",  name:"Sales Training Hours",   perspective:"Learning",  unit:"hrs",  target:40, dept:"Commercial" },
    { id:"co_l2",  name:"Product Knowledge Score",perspective:"Learning",  unit:"%",    target:85, dept:"Commercial" },
  ],
  camo: [
    { id:"ca_f1",  name:"Maintenance Budget Util",perspective:"Financial", unit:"%",    target:92, dept:"CAMO" },
    { id:"ca_c1",  name:"Airworthiness Compliance",perspective:"Customer", unit:"%",    target:100, dept:"CAMO" },
    { id:"ca_c2",  name:"Customer Satisfaction",  perspective:"Customer",  unit:"/5",   target:4.4, dept:"CAMO" },
    { id:"ca_i1",  name:"Aircraft Availability",  perspective:"Internal",  unit:"%",    target:96, dept:"CAMO" },
    { id:"ca_i2",  name:"On-Time Maintenance",    perspective:"Internal",  unit:"%",    target:95, dept:"CAMO" },
    { id:"ca_l1",  name:"Tech Training Hours",    perspective:"Learning",  unit:"hrs",  target:60, dept:"CAMO" },
    { id:"ca_l2",  name:"Regulatory Compliance",  perspective:"Learning",  unit:"%",    target:100, dept:"CAMO" },
  ],
  mro: [
    { id:"mr_f1",  name:"MRO Revenue",            perspective:"Financial", unit:"MUSD", target:8, dept:"MRO" },
    { id:"mr_f2",  name:"Cost per Man-Hour",       perspective:"Financial", unit:"USD",  target:85, dept:"MRO", lowerIsBetter:true },
    { id:"mr_c1",  name:"TAT Compliance",         perspective:"Customer",  unit:"%",    target:93, dept:"MRO" },
    { id:"mr_c2",  name:"Customer Score",         perspective:"Customer",  unit:"/5",   target:4.2, dept:"MRO" },
    { id:"mr_i1",  name:"Rework Rate",            perspective:"Internal",  unit:"%",    target:2, dept:"MRO", lowerIsBetter:true },
    { id:"mr_i2",  name:"First-Time Fix Rate",    perspective:"Internal",  unit:"%",    target:88, dept:"MRO" },
    { id:"mr_l1",  name:"Certification Rate",     perspective:"Learning",  unit:"%",    target:95, dept:"MRO" },
    { id:"mr_l2",  name:"Tech Training Hrs",      perspective:"Learning",  unit:"hrs",  target:50, dept:"MRO" },
  ],
  corp: [
    ...CORPORATE_KPIS.map(k => ({ ...k, id:"corp_"+k.id })),
  ],
};

const HR_METRICS_DEF = [
  { id:"headcount",    label:"Active Headcount",         unit:"#",    target:850 },
  { id:"turnover",     label:"Voluntary Turnover Rate",  unit:"%",    target:12,  lowerIsBetter:true },
  { id:"absenteeism",  label:"Absenteeism Rate",         unit:"%",    target:3,   lowerIsBetter:true },
  { id:"nationals",    label:"% Local Nationals (Qatari)",unit:"%",   target:20 },
  { id:"recruitment",  label:"Recruitment % (Filled)",   unit:"%",    target:90 },
  { id:"offer_accept", label:"Offer Acceptance Rate",    unit:"%",    target:85 },
  { id:"time_hire",    label:"Time to Hire",             unit:"days", target:30,  lowerIsBetter:true },
  { id:"time_fill",    label:"Time to Fill",             unit:"days", target:45,  lowerIsBetter:true },
];

const HR_DEPARTMENTS = ["Operations","Engineering","MRO","CAMO","QHSE","HR","Finance","IT","Commercial","Corporate"];
const NATIONALITIES  = ["Qatari","Indian","Filipino","Pakistani","Egyptian","Jordanian","British","South African","Other"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const STORE_KEY = "ghc_beacon_data";
function loadStore(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch { return {}; }
}
function saveStore(data: Record<string, any>) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

function periodKey(year: number, month: number) { return `${year}-${String(month+1).padStart(2,"0")}`; }

function getStatus(kpi: KpiDef, actual: number | null): "green"|"amber"|"red"|"nodata" {
  if (actual === null || actual === undefined || isNaN(actual)) return "nodata";
  const pct = kpi.lowerIsBetter
    ? kpi.target === 0 ? (actual === 0 ? 100 : 0) : (1 - (actual - kpi.target) / kpi.target) * 100
    : kpi.target === 0 ? 100 : (actual / kpi.target) * 100;
  if (pct >= 95) return "green";
  if (pct >= 80) return "amber";
  return "red";
}

function getTrend(current: number | null, prev: number | null): "up"|"down"|"flat" {
  if (current === null || prev === null) return "flat";
  if (current > prev + 0.001) return "up";
  if (current < prev - 0.001) return "down";
  return "flat";
}

function healthScore(kpis: KpiDef[], actuals: Record<string, number|null>): number {
  const with_data = kpis.filter(k => actuals[k.id] !== null && actuals[k.id] !== undefined);
  if (!with_data.length) return 0;
  return Math.round(with_data.filter(k => getStatus(k, actuals[k.id]!) === "green").length / with_data.length * 100);
}

// ── Progress Ring ─────────────────────────────────────────────────────────────
function ProgressRing({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e3a5f" strokeWidth="4"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition:"stroke-dasharray 0.6s ease" }}/>
      <text x={size/2} y={size/2} dominantBaseline="middle" textAnchor="middle"
        fill={color} fontSize="11" fontWeight="700" style={{ transform:"rotate(90deg)", transformOrigin:`${size/2}px ${size/2}px` }}>
        {pct}%
      </text>
    </svg>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: "green"|"amber"|"red"|"nodata" }) {
  const s = STATUS_MAP[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${s.bg} ${s.text} ${s.border}`}>
      {status === "green"  && <CheckCircle className="h-3 w-3"/>}
      {status === "amber"  && <AlertTriangle className="h-3 w-3"/>}
      {status === "red"    && <AlertCircle className="h-3 w-3"/>}
      {status === "nodata" && <Clock className="h-3 w-3"/>}
      {s.label}
    </span>
  );
}

// ── Trend Icon ────────────────────────────────────────────────────────────────
function TrendIcon({ trend, lowerIsBetter }: { trend: "up"|"down"|"flat"; lowerIsBetter?: boolean }) {
  const good = lowerIsBetter ? trend === "down" : trend === "up";
  const neutral = trend === "flat";
  return trend === "up"   ? <TrendingUp  className={`h-4 w-4 ${neutral ? "text-amber-400" : good ? "text-emerald-400" : "text-red-400"}`}/>
       : trend === "down" ? <TrendingDown className={`h-4 w-4 ${neutral ? "text-amber-400" : good ? "text-emerald-400" : "text-red-400"}`}/>
       : <Minus className="h-4 w-4 text-amber-400"/>;
}

// ── Period Selector ───────────────────────────────────────────────────────────
function PeriodSelector({ year, month, onChange }: { year: number; month: number; onChange: (y: number, m: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onChange(year-1, month)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
        <ChevronLeft className="h-4 w-4"/>
      </button>
      <span className="text-white font-bold text-sm min-w-[40px] text-center">{year}</span>
      <button onClick={() => onChange(year+1, month)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
        <ChevronRight className="h-4 w-4"/>
      </button>
      <div className="flex gap-1 flex-wrap">
        {MONTHS.map((m, i) => (
          <button key={m} onClick={() => onChange(year, i)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              i === month ? "text-[#0A1628] font-bold shadow-lg" : "text-slate-400 hover:text-white hover:bg-white/10"
            }`}
            style={i === month ? { background: TEAL } : {}}>
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ kpi, actual, prevActual }: { kpi: KpiDef; actual: number|null; prevActual: number|null }) {
  const status = getStatus(kpi, actual);
  const trend  = getTrend(actual, prevActual);
  const pColor = P_COLORS[kpi.perspective === "Customer" ? "Customer" : kpi.perspective === "Internal" ? "Internal" : kpi.perspective === "Financial" ? "Financial" : "Learning"];
  return (
    <div style={{ background: CARD_BG2, borderLeft:`3px solid ${pColor}` }} className="rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-slate-300 text-sm font-medium leading-tight">{kpi.name}</p>
        <StatusBadge status={status}/>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-white">{actual !== null ? actual : "—"}<span className="text-xs text-slate-500 ml-1">{kpi.unit}</span></p>
          <p className="text-xs text-slate-500 mt-0.5">Target: {kpi.target} {kpi.unit}</p>
        </div>
        <TrendIcon trend={trend} lowerIsBetter={kpi.lowerIsBetter}/>
      </div>
    </div>
  );
}

// ── Scorecard home ────────────────────────────────────────────────────────────
function ScorecardHome() {
  const [, nav] = useLocation();
  return (
    <div style={{ background: DARK_BG }} className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5 text-sm font-semibold" style={{ background:"rgba(0,201,167,0.15)", color: TEAL, border:`1px solid rgba(0,201,167,0.3)` }}>
            <Activity className="h-4 w-4"/> Balanced Scorecard
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">GHC Beacon</h1>
          <p className="text-slate-400 text-lg">Guiding Executive Decisions</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Corporate */}
          <button onClick={() => nav("/scorecard/corporate")}
            style={{ background:`linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.05))`, border:`1px solid rgba(59,130,246,0.35)` }}
            className="p-8 rounded-2xl text-left hover:scale-[1.02] transition-transform group">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">Corporate Scorecard</h3>
            <p className="text-slate-400 text-sm">All KPIs across 4 Balanced Scorecard perspectives with department breakdown.</p>
            <div className="mt-4 inline-flex items-center gap-1 text-blue-400 text-sm font-medium">Open Dashboard <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform"/></div>
          </button>
          {/* HR */}
          <button onClick={() => nav("/scorecard/hr")}
            style={{ background:`linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))`, border:`1px solid rgba(245,158,11,0.35)` }}
            className="p-8 rounded-2xl text-left hover:scale-[1.02] transition-transform group">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-xl font-bold text-white mb-2">HR Dashboard</h3>
            <p className="text-slate-400 text-sm">People analytics — headcount, turnover, recruitment, and nationality breakdown.</p>
            <div className="mt-4 inline-flex items-center gap-1 text-amber-400 text-sm font-medium">Open Dashboard <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform"/></div>
          </button>
          {/* Coming Soon */}
          {[
            { name:"Operations", icon:"✈️" }, { name:"Finance", icon:"💰" },
            { name:"Safety & Quality", icon:"🛡️" }, { name:"IT", icon:"💻" },
          ].map(d => (
            <div key={d.name} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }}
              className="p-8 rounded-2xl opacity-50 cursor-not-allowed">
              <div className="text-3xl mb-4">{d.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{d.name}</h3>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-500">Coming Soon</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Corporate Scorecard ───────────────────────────────────────────────────────
function CorporateScorecard() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tab, setTab] = useState("dashboard");
  const [store, setStore] = useState(loadStore);
  const [entryValues, setEntryValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string,boolean>>({});
  const { toast } = useToast();
  const [, nav] = useLocation();

  const pk  = periodKey(year, month);
  const ppk = month === 0 ? periodKey(year-1, 11) : periodKey(year, month-1);

  const getActual = (id: string, pk2 = pk): number|null => {
    const v = store?.[pk2]?.[id];
    return v !== undefined && v !== "" ? Number(v) : null;
  };

  const saveEntry = (kpiId: string) => {
    const val = entryValues[kpiId];
    if (val === undefined || val === "") return;
    const updated = { ...store, [pk]: { ...(store[pk] || {}), [kpiId]: Number(val) } };
    setStore(updated); saveStore(updated);
    setSaved(s => ({ ...s, [kpiId]: true }));
    setTimeout(() => setSaved(s => ({ ...s, [kpiId]: false })), 1500);
    toast({ title:"Saved", description:`${CORPORATE_KPIS.find(k=>k.id===kpiId)?.name} updated for ${MONTHS[month]} ${year}.` });
  };

  const saveAll = () => {
    const updates: Record<string, number> = {};
    Object.entries(entryValues).forEach(([id, v]) => { if (v !== "") updates[id] = Number(v); });
    const updated = { ...store, [pk]: { ...(store[pk] || {}), ...updates } };
    setStore(updated); saveStore(updated);
    toast({ title:"All Saved", description:`${Object.keys(updates).length} values saved for ${MONTHS[month]} ${year}.` });
  };

  const perspectives: Perspective[] = ["Financial","Customer","Internal","Learning"];
  const perspLabels: Record<Perspective, string> = { Financial:"Financial", Customer:"Customer / Stakeholder", Internal:"Internal Process", Learning:"Learning & Growth" };

  const allActuals: Record<string,number|null> = {};
  CORPORATE_KPIS.forEach(k => { allActuals[k.id] = getActual(k.id); });

  const onTrack = CORPORATE_KPIS.filter(k => getStatus(k, allActuals[k.id]) === "green").length;
  const atRisk  = CORPORATE_KPIS.filter(k => getStatus(k, allActuals[k.id]) === "amber").length;
  const offTrack = CORPORATE_KPIS.filter(k => getStatus(k, allActuals[k.id]) === "red").length;

  return (
    <div style={{ background: DARK_BG }} className="min-h-screen">
      {/* Header */}
      <div style={{ background: CARD_BG, borderBottom:"1px solid rgba(255,255,255,0.07)" }} className="px-8 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => nav("/scorecard")} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
              <ChevronLeft className="h-5 w-5"/>
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Corporate Scorecard</h1>
              <p className="text-slate-500 text-xs">Balanced Scorecard — All Perspectives</p>
            </div>
          </div>
          <PeriodSelector year={year} month={month} onChange={(y,m) => { setYear(y); setMonth(m); }}/>
        </div>
      </div>

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label:"Total KPIs", value:CORPORATE_KPIS.length, color:"#64748B" },
            { label:"On Track",   value:onTrack,  color:"#10B981" },
            { label:"At Risk",    value:atRisk,   color:"#F59E0B" },
            { label:"Off Track",  value:offTrack, color:"#EF4444" },
          ].map(s => (
            <div key={s.label} style={{ background:CARD_BG, borderTop:`3px solid ${s.color}` }} className="rounded-xl p-4 border border-white/5">
              <p className="text-slate-400 text-xs mb-1">{s.label}</p>
              <p className="text-3xl font-bold" style={{ color:s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList style={{ background: CARD_BG }} className="mb-6 border border-white/10">
            <TabsTrigger value="dashboard"
              {...(tab==="dashboard" ? {style:{background:TEAL,color:"#0A1628"}} : {})}>
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="departments" {...(tab==="departments" ? {style:{background:TEAL,color:"#0A1628"}} : {})}>
              Departments
            </TabsTrigger>
            <TabsTrigger value="entry" {...(tab==="entry" ? {style:{background:TEAL,color:"#0A1628"}} : {})}>
              Data Entry
            </TabsTrigger>
          </TabsList>

          {/* ── Dashboard Tab ── */}
          <TabsContent value="dashboard" className="space-y-8">
            {perspectives.map(p => {
              const kpis = CORPORATE_KPIS.filter(k => k.perspective === p);
              const hs = healthScore(kpis, allActuals);
              const pColor = P_COLORS[p === "Customer" ? "Customer" : p === "Internal" ? "Internal" : p === "Financial" ? "Financial" : "Learning"];
              return (
                <div key={p}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-6 rounded-full" style={{ background: pColor }}/>
                      <h2 className="text-lg font-bold text-white">{perspLabels[p]}</h2>
                      <Badge style={{ background:`${pColor}22`, color:pColor, border:`1px solid ${pColor}44` }}>{kpis.length} KPIs</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <ProgressRing pct={hs} color={pColor} size={48}/>
                      <div>
                        <p className="text-xs text-slate-500">Health</p>
                        <p className="text-sm font-bold text-white">{hs}%</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {kpis.map(k => (
                      <button key={k.id} onClick={() => nav(`/scorecard/kpi/${k.id}`)} className="text-left">
                        <KpiCard kpi={k} actual={getActual(k.id)} prevActual={getActual(k.id, ppk)}/>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* ── Departments Tab ── */}
          <TabsContent value="departments">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEPARTMENTS.map(dept => {
                const kpis = DEPT_KPIS[dept.id] || [];
                const dActuals: Record<string, number|null> = {};
                kpis.forEach(k => { dActuals[k.id] = getActual(k.id); });
                const hs = healthScore(kpis, dActuals);
                return (
                  <button key={dept.id} onClick={() => nav(`/scorecard/department/${dept.id}`)}
                    style={{ background: CARD_BG2, borderTop:`3px solid ${dept.color}` }}
                    className="p-5 rounded-xl border border-white/5 hover:border-white/15 transition-all text-left group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{dept.icon}</span>
                        <span className="font-bold text-white">{dept.name}</span>
                      </div>
                      <ProgressRing pct={hs} color={dept.color} size={44}/>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-400">
                      <span>{kpis.length} KPIs</span>
                      <span className="text-emerald-400">{kpis.filter(k=>getStatus(k,dActuals[k.id])==="green").length} on track</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-xs font-medium group-hover:translate-x-1 transition-transform" style={{ color: dept.color }}>
                      View Detail <ChevronRight className="h-3 w-3"/>
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Data Entry Tab ── */}
          <TabsContent value="entry">
            <div style={{ background: CARD_BG }} className="rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">Enter Actuals — {MONTHS[month]} {year}</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Record actual KPI values for the selected period.</p>
                </div>
                <Button onClick={saveAll} style={{ background: TEAL, color: DARK_BG }} className="font-bold gap-2">
                  <Save className="h-4 w-4"/> Save All
                </Button>
              </div>
              <div className="divide-y divide-white/5">
                {perspectives.map(p => {
                  const kpis = CORPORATE_KPIS.filter(k => k.perspective === p);
                  const pColor = P_COLORS[p === "Customer" ? "Customer" : p === "Internal" ? "Internal" : p === "Financial" ? "Financial" : "Learning"];
                  return (
                    <div key={p} className="p-5">
                      <h4 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: pColor }}>{perspLabels[p]}</h4>
                      <div className="space-y-2">
                        {kpis.map(k => {
                          const current = getActual(k.id);
                          const status  = getStatus(k, current);
                          return (
                            <div key={k.id} className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                              <span className="text-slate-300 text-sm flex-1 min-w-[180px]">{k.name}</span>
                              <span className="text-slate-500 text-xs w-20">Target: {k.target} {k.unit}</span>
                              <span className="text-slate-400 text-xs w-20">Current: {current ?? "—"}</span>
                              <StatusBadge status={status}/>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  placeholder="Enter actual"
                                  value={entryValues[k.id] ?? ""}
                                  onChange={e => setEntryValues(v => ({ ...v, [k.id]: e.target.value }))}
                                  className="w-32 h-8 text-sm border-white/10 bg-white/5 text-white placeholder:text-slate-600"
                                  data-testid={`input-kpi-${k.id}`}
                                />
                                <Button size="sm" onClick={() => saveEntry(k.id)}
                                  style={{ background: saved[k.id] ? "#10B981" : TEAL, color: DARK_BG }}
                                  className="h-8 w-8 p-0" data-testid={`button-save-${k.id}`}>
                                  {saved[k.id] ? <Check className="h-3.5 w-3.5"/> : <Save className="h-3.5 w-3.5"/>}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Department Detail ─────────────────────────────────────────────────────────
function DepartmentDetail({ deptId }: { deptId: string }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [store] = useState(loadStore);
  const [, nav] = useLocation();

  const dept = DEPARTMENTS.find(d => d.id === deptId) || DEPARTMENTS[0];
  const kpis = DEPT_KPIS[deptId] || [];

  const pk  = periodKey(year, month);
  const ppk = month === 0 ? periodKey(year-1, 11) : periodKey(year, month-1);
  const getActual = (id: string, p = pk): number|null => {
    const v = store?.[p]?.[id];
    return v !== undefined && v !== "" ? Number(v) : null;
  };

  const allActuals: Record<string,number|null> = {};
  kpis.forEach(k => { allActuals[k.id] = getActual(k.id); });

  const perspectives: Perspective[] = ["Financial","Customer","Internal","Learning"];
  const perspLabels: Record<Perspective,string> = { Financial:"Financial", Customer:"Customer / Stakeholder", Internal:"Internal Process", Learning:"Learning & Growth" };

  return (
    <div style={{ background: DARK_BG }} className="min-h-screen">
      <div style={{ background: CARD_BG, borderBottom:"1px solid rgba(255,255,255,0.07)" }} className="px-8 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => nav("/scorecard/corporate")} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
              <ChevronLeft className="h-5 w-5"/>
            </button>
            <span className="text-2xl">{dept.icon}</span>
            <div>
              <h1 className="text-xl font-bold text-white">{dept.name} Department</h1>
              <p className="text-slate-500 text-xs">Balanced Scorecard — Department View</p>
            </div>
          </div>
          <PeriodSelector year={year} month={month} onChange={(y,m) => { setYear(y); setMonth(m); }}/>
        </div>
      </div>

      <div className="p-8">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label:"Total KPIs", value:kpis.length, color:"#64748B" },
            { label:"On Track",   value:kpis.filter(k=>getStatus(k,allActuals[k.id])==="green").length,  color:"#10B981" },
            { label:"At Risk",    value:kpis.filter(k=>getStatus(k,allActuals[k.id])==="amber").length,  color:"#F59E0B" },
            { label:"Off Track",  value:kpis.filter(k=>getStatus(k,allActuals[k.id])==="red").length,    color:"#EF4444" },
          ].map(s => (
            <div key={s.label} style={{ background:CARD_BG, borderTop:`3px solid ${s.color}` }} className="rounded-xl p-4 border border-white/5">
              <p className="text-slate-400 text-xs mb-1">{s.label}</p>
              <p className="text-3xl font-bold" style={{ color:s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          {perspectives.map(p => {
            const pkpis = kpis.filter(k => k.perspective === p);
            if (!pkpis.length) return null;
            const pColor = P_COLORS[p === "Customer" ? "Customer" : p === "Internal" ? "Internal" : p === "Financial" ? "Financial" : "Learning"];
            return (
              <div key={p}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-5 rounded-full" style={{ background:pColor }}/>
                  <h2 className="text-base font-bold text-white">{perspLabels[p]}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {pkpis.map(k => (
                    <button key={k.id} onClick={() => nav(`/scorecard/kpi/${k.id}`)} className="text-left">
                      <KpiCard kpi={k} actual={getActual(k.id)} prevActual={getActual(k.id, ppk)}/>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── KPI Detail ────────────────────────────────────────────────────────────────
function KpiDetail({ kpiId }: { kpiId: string }) {
  const [store] = useState(loadStore);
  const [, nav] = useLocation();
  const today = new Date();

  const allKpis = [...CORPORATE_KPIS, ...Object.values(DEPT_KPIS).flat()];
  const kpi = allKpis.find(k => k.id === kpiId);

  if (!kpi) return <div style={{ background:DARK_BG }} className="min-h-screen flex items-center justify-center text-slate-400">KPI not found.</div>;

  const pColor = P_COLORS[kpi.perspective === "Customer" ? "Customer" : kpi.perspective === "Internal" ? "Internal" : kpi.perspective === "Financial" ? "Financial" : "Learning"];

  // Build 12-month history
  const history: { period: string; actual: number|null; target: number; status: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    let y = today.getFullYear(), m = today.getMonth() - i;
    while (m < 0) { m += 12; y--; }
    const pk2 = periodKey(y, m);
    const v = store?.[pk2]?.[kpiId];
    const actual = v !== undefined && v !== "" ? Number(v) : null;
    history.push({ period: `${MONTHS[m]} ${y}`, actual, target: kpi.target, status: getStatus(kpi, actual) });
  }

  const chartData = history.map(h => ({ name: h.period.slice(0,3), actual: h.actual, target: h.target }));

  return (
    <div style={{ background: DARK_BG }} className="min-h-screen">
      <div style={{ background: CARD_BG, borderBottom:"1px solid rgba(255,255,255,0.07)" }} className="px-8 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => nav(-1 as any)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
            <ChevronLeft className="h-5 w-5"/>
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{kpi.name}</h1>
            <p className="text-slate-500 text-xs">{kpi.dept} · {kpi.perspective}</p>
          </div>
        </div>
      </div>

      <div className="p-8 max-w-5xl mx-auto">
        {/* Info cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label:"Target",      value:`${kpi.target} ${kpi.unit}`, color: pColor },
            { label:"Unit",        value:kpi.unit, color:"#64748B" },
            { label:"Perspective", value:kpi.perspective, color: pColor },
            { label:"Department",  value:kpi.dept, color:"#64748B" },
          ].map(c => (
            <div key={c.label} style={{ background:CARD_BG2, borderTop:`3px solid ${c.color}` }} className="rounded-xl p-4 border border-white/5">
              <p className="text-slate-500 text-xs mb-1">{c.label}</p>
              <p className="text-white font-bold">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: CARD_BG }} className="rounded-2xl p-6 border border-white/5 mb-6">
          <h3 className="text-white font-semibold mb-4">12-Month Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="name" tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:CARD_BG2, border:"1px solid rgba(255,255,255,0.1)", borderRadius:"8px", color:"#f1f5f9" }}/>
              <Legend formatter={(v) => <span style={{ color:"#94a3b8", fontSize:12 }}>{v}</span>}/>
              <Line type="monotone" dataKey="actual" stroke={TEAL} strokeWidth={2} dot={{ fill:TEAL, r:4 }} connectNulls/>
              <Line type="monotone" dataKey="target" stroke={pColor} strokeWidth={1.5} strokeDasharray="4 3" dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* History table */}
        <div style={{ background: CARD_BG }} className="rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <h3 className="text-white font-semibold">Performance History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr style={{ background:"rgba(255,255,255,0.03)" }}>
                <th className="text-left p-4 text-slate-400 font-medium">Period</th>
                <th className="text-right p-4 text-slate-400 font-medium">Actual</th>
                <th className="text-right p-4 text-slate-400 font-medium">Target</th>
                <th className="text-center p-4 text-slate-400 font-medium">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-white/5">
                {[...history].reverse().map(h => (
                  <tr key={h.period} className="hover:bg-white/2">
                    <td className="p-4 text-slate-300">{h.period}</td>
                    <td className="p-4 text-right font-bold text-white">{h.actual ?? "—"} <span className="text-slate-500 text-xs">{kpi.unit}</span></td>
                    <td className="p-4 text-right text-slate-400">{h.target} {kpi.unit}</td>
                    <td className="p-4 text-center"><StatusBadge status={h.status as any}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── HR Dashboard ──────────────────────────────────────────────────────────────
function HRDashboard() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [store] = useState(loadStore);
  const [, nav] = useLocation();

  const pk  = periodKey(year, month);
  const ppk = month === 0 ? periodKey(year-1, 11) : periodKey(year, month-1);

  const getMet = (id: string, p = pk): number|null => {
    const v = store?.["hr"]?.[p]?.[id];
    return v !== undefined && v !== "" ? Number(v) : null;
  };
  const getDeptHC = (dept: string, p = pk): number|null => {
    const v = store?.["hr_dept"]?.[p]?.[dept];
    return v !== undefined && v !== "" ? Number(v) : null;
  };
  const getNatHC = (nat: string, p = pk): number|null => {
    const v = store?.["hr_nat"]?.[p]?.[nat];
    return v !== undefined && v !== "" ? Number(v) : null;
  };

  // Headcount 12-month trend
  const hcTrend = useMemo(() => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      let y = today.getFullYear(), m = today.getMonth() - i;
      while (m < 0) { m += 12; y--; }
      data.push({ name: MONTHS[m].slice(0,3), headcount: getMet("headcount", periodKey(y,m)) });
    }
    return data;
  }, [store, year, month]);

  const deptHCData = HR_DEPARTMENTS.map(d => ({ name: d.slice(0,8), value: getDeptHC(d) ?? 0 })).filter(d => d.value > 0);
  const natData = NATIONALITIES.map(n => ({ name: n, value: getNatHC(n) ?? 0 })).filter(d => d.value > 0);
  const PIE_COLORS = ["#00C9A7","#3B82F6","#8B5CF6","#F59E0B","#EF4444","#10B981","#06B6D4","#F97316","#EC4899"];

  return (
    <div style={{ background: DARK_BG }} className="min-h-screen">
      <div style={{ background: CARD_BG, borderBottom:"1px solid rgba(255,255,255,0.07)" }} className="px-8 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => nav("/scorecard")} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
              <ChevronLeft className="h-5 w-5"/>
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">HR Dashboard</h1>
              <p className="text-slate-500 text-xs">People Analytics — {MONTHS[month]} {year}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PeriodSelector year={year} month={month} onChange={(y,m) => { setYear(y); setMonth(m); }}/>
            <Button onClick={() => nav("/scorecard/hr/entry")} style={{ background:TEAL, color:DARK_BG }} className="font-bold gap-2 text-sm">
              <Edit3 className="h-4 w-4"/> Enter Data
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {HR_METRICS_DEF.map(m => {
            const current = getMet(m.id);
            const prev    = getMet(m.id, ppk);
            const trend   = getTrend(current, prev);
            const change  = current !== null && prev !== null ? (current - prev).toFixed(1) : null;
            return (
              <div key={m.id} style={{ background:CARD_BG2, borderTop:`3px solid ${TEAL}` }} className="rounded-xl p-4 border border-white/5">
                <p className="text-slate-400 text-xs mb-2">{m.label}</p>
                <p className="text-2xl font-bold text-white">{current ?? "—"}<span className="text-xs text-slate-500 ml-1">{m.unit}</span></p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon trend={trend} lowerIsBetter={m.lowerIsBetter}/>
                  {change !== null && <span className="text-xs text-slate-400">{change > "0" ? "+":""}{change}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Headcount Trend */}
          <div style={{ background:CARD_BG }} className="rounded-2xl p-6 border border-white/5">
            <h3 className="text-white font-semibold mb-4">Headcount Trend — 12 Months</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={hcTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="name" tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:CARD_BG2, border:"1px solid rgba(255,255,255,0.1)", borderRadius:"8px", color:"#f1f5f9" }}/>
                <Line type="monotone" dataKey="headcount" stroke={TEAL} strokeWidth={2.5} dot={{ fill:TEAL, r:4 }} connectNulls/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Headcount by Department */}
          <div style={{ background:CARD_BG }} className="rounded-2xl p-6 border border-white/5">
            <h3 className="text-white font-semibold mb-4">Headcount by Department</h3>
            {deptHCData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptHCData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false}/>
                  <XAxis type="number" tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false} width={70}/>
                  <Tooltip contentStyle={{ background:CARD_BG2, border:"1px solid rgba(255,255,255,0.1)", borderRadius:"8px", color:"#f1f5f9" }}/>
                  <Bar dataKey="value" fill={TEAL} radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-slate-500 text-sm text-center py-16">No department data entered yet. <button onClick={() => nav("/scorecard/hr/entry")} className="text-teal-400 underline">Enter data →</button></p>}
          </div>

          {/* Nationality Donut */}
          <div style={{ background:CARD_BG }} className="rounded-2xl p-6 border border-white/5 lg:col-span-2">
            <h3 className="text-white font-semibold mb-4">Nationality Breakdown</h3>
            {natData.length > 0 ? (
              <div className="flex items-center gap-8">
                <PieChart width={220} height={220}>
                  <Pie data={natData} cx={105} cy={105} innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={2}>
                    {natData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{ background:CARD_BG2, border:"1px solid rgba(255,255,255,0.1)", borderRadius:"8px", color:"#f1f5f9" }}/>
                </PieChart>
                <div className="flex flex-wrap gap-2">
                  {natData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                      <span className="text-slate-300">{d.name}:</span>
                      <span className="text-white font-bold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-slate-500 text-sm text-center py-8">No nationality data entered yet. <button onClick={() => nav("/scorecard/hr/entry")} className="text-teal-400 underline">Enter data →</button></p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── HR Data Entry ─────────────────────────────────────────────────────────────
function HRDataEntry() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [store, setStore] = useState(loadStore);
  const [metVals, setMetVals] = useState<Record<string,string>>({});
  const [deptVals, setDeptVals] = useState<Record<string,string>>({});
  const [natVals, setNatVals] = useState<Record<string,string>>({});
  const [tab, setTab] = useState("metrics");
  const { toast } = useToast();
  const [, nav] = useLocation();

  const pk = periodKey(year, month);

  useEffect(() => {
    const s = loadStore();
    const mv: Record<string,string> = {};
    HR_METRICS_DEF.forEach(m => { const v = s?.["hr"]?.[pk]?.[m.id]; if (v !== undefined) mv[m.id] = String(v); });
    setMetVals(mv);
    const dv: Record<string,string> = {};
    HR_DEPARTMENTS.forEach(d => { const v = s?.["hr_dept"]?.[pk]?.[d]; if (v !== undefined) dv[d] = String(v); });
    setDeptVals(dv);
    const nv: Record<string,string> = {};
    NATIONALITIES.forEach(n => { const v = s?.["hr_nat"]?.[pk]?.[n]; if (v !== undefined) nv[n] = String(v); });
    setNatVals(nv);
  }, [pk]);

  const saveMetrics = () => {
    const updates: Record<string, number> = {};
    Object.entries(metVals).forEach(([k, v]) => { if (v !== "") updates[k] = Number(v); });
    const s = { ...store, hr: { ...(store.hr || {}), [pk]: { ...(store?.hr?.[pk] || {}), ...updates } } };
    setStore(s); saveStore(s);
    toast({ title:"Saved", description:`HR metrics saved for ${MONTHS[month]} ${year}.` });
  };
  const saveDepts = () => {
    const updates: Record<string, number> = {};
    Object.entries(deptVals).forEach(([k, v]) => { if (v !== "") updates[k] = Number(v); });
    const s = { ...store, hr_dept: { ...(store.hr_dept || {}), [pk]: { ...(store?.hr_dept?.[pk] || {}), ...updates } } };
    setStore(s); saveStore(s);
    toast({ title:"Saved", description:`Department headcount saved for ${MONTHS[month]} ${year}.` });
  };
  const saveNats = () => {
    const updates: Record<string, number> = {};
    Object.entries(natVals).forEach(([k, v]) => { if (v !== "") updates[k] = Number(v); });
    const s = { ...store, hr_nat: { ...(store.hr_nat || {}), [pk]: { ...(store?.hr_nat?.[pk] || {}), ...updates } } };
    setStore(s); saveStore(s);
    toast({ title:"Saved", description:`Nationality breakdown saved for ${MONTHS[month]} ${year}.` });
  };

  return (
    <div style={{ background: DARK_BG }} className="min-h-screen">
      <div style={{ background: CARD_BG, borderBottom:"1px solid rgba(255,255,255,0.07)" }} className="px-8 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => nav("/scorecard/hr")} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
              <ChevronLeft className="h-5 w-5"/>
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">HR Data Entry</h1>
              <p className="text-slate-500 text-xs">Enter HR actuals for the selected period</p>
            </div>
          </div>
          <PeriodSelector year={year} month={month} onChange={(y,m) => { setYear(y); setMonth(m); }}/>
        </div>
      </div>

      <div className="p-8 max-w-3xl">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList style={{ background:CARD_BG }} className="mb-6 border border-white/10">
            {[["metrics","KPI Metrics"],["departments","By Department"],["nationalities","Nationality"]].map(([v,l]) => (
              <TabsTrigger key={v} value={v} {...(tab===v ? {style:{background:TEAL,color:DARK_BG}} : {})}>{l}</TabsTrigger>
            ))}
          </TabsList>

          {/* Metrics */}
          <TabsContent value="metrics">
            <div style={{ background:CARD_BG }} className="rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-5 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-white font-semibold">HR Metrics — {MONTHS[month]} {year}</h3>
                <Button onClick={saveMetrics} style={{ background:TEAL, color:DARK_BG }} className="font-bold gap-2"><Save className="h-4 w-4"/>Save</Button>
              </div>
              <div className="p-5 space-y-4">
                {HR_METRICS_DEF.map(m => (
                  <div key={m.id} className="flex items-center gap-4">
                    <label className="text-slate-300 text-sm flex-1">{m.label}</label>
                    <span className="text-slate-500 text-xs w-16">Target: {m.target}</span>
                    <Input type="number" placeholder={m.unit} value={metVals[m.id] ?? ""}
                      onChange={e => setMetVals(v => ({ ...v, [m.id]: e.target.value }))}
                      className="w-36 h-9 border-white/10 bg-white/5 text-white placeholder:text-slate-600"
                      data-testid={`input-hr-${m.id}`}/>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Departments */}
          <TabsContent value="departments">
            <div style={{ background:CARD_BG }} className="rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-5 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-white font-semibold">Headcount by Department — {MONTHS[month]} {year}</h3>
                <Button onClick={saveDepts} style={{ background:TEAL, color:DARK_BG }} className="font-bold gap-2"><Save className="h-4 w-4"/>Save</Button>
              </div>
              <div className="p-5 space-y-3">
                {HR_DEPARTMENTS.map(dept => (
                  <div key={dept} className="flex items-center gap-4">
                    <label className="text-slate-300 text-sm flex-1">{dept}</label>
                    <Input type="number" placeholder="Headcount" value={deptVals[dept] ?? ""}
                      onChange={e => setDeptVals(v => ({ ...v, [dept]: e.target.value }))}
                      className="w-36 h-9 border-white/10 bg-white/5 text-white placeholder:text-slate-600"
                      data-testid={`input-dept-${dept.toLowerCase().replace(/\s/g,"-")}`}/>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Nationalities */}
          <TabsContent value="nationalities">
            <div style={{ background:CARD_BG }} className="rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-5 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-white font-semibold">Nationality Breakdown — {MONTHS[month]} {year}</h3>
                <Button onClick={saveNats} style={{ background:TEAL, color:DARK_BG }} className="font-bold gap-2"><Save className="h-4 w-4"/>Save</Button>
              </div>
              <div className="p-5 space-y-3">
                {NATIONALITIES.map(nat => (
                  <div key={nat} className="flex items-center gap-4">
                    <label className="text-slate-300 text-sm flex-1">{nat}</label>
                    <Input type="number" placeholder="Headcount" value={natVals[nat] ?? ""}
                      onChange={e => setNatVals(v => ({ ...v, [nat]: e.target.value }))}
                      className="w-36 h-9 border-white/10 bg-white/5 text-white placeholder:text-slate-600"
                      data-testid={`input-nat-${nat.toLowerCase().replace(/\s/g,"-")}`}/>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function ScorecardPage() {
  const [match1] = useRoute("/scorecard");
  const [match2, params2] = useRoute("/scorecard/corporate");
  const [match3, params3] = useRoute("/scorecard/department/:id");
  const [match4, params4] = useRoute("/scorecard/kpi/:id");
  const [match5] = useRoute("/scorecard/hr");
  const [match6] = useRoute("/scorecard/hr/entry");

  if (match1) return <ScorecardHome/>;
  if (match2) return <CorporateScorecard/>;
  if (match3 && params3) return <DepartmentDetail deptId={params3.id}/>;
  if (match4 && params4) return <KpiDetail kpiId={params4.id}/>;
  if (match5) return <HRDashboard/>;
  if (match6) return <HRDataEntry/>;
  return <ScorecardHome/>;
}
