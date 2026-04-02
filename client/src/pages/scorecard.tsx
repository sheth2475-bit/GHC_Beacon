import { useState, useMemo, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis,
  Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight,
  Activity, Save, Check, AlertTriangle, AlertCircle,
  CheckCircle2, Clock, BarChart2, Edit3, Building2, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

// ── Perspective colours (used for card accents & badges) ────────────────────
const P_COLOR: Record<string, { accent: string; bg: string; text: string; border: string }> = {
  Financial: { accent: "#3B82F6", bg: "bg-blue-50 dark:bg-blue-950/30",    text: "text-blue-700 dark:text-blue-300",    border: "border-blue-200 dark:border-blue-800" },
  Customer:  { accent: "#8B5CF6", bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-800" },
  Internal:  { accent: "#F59E0B", bg: "bg-amber-50 dark:bg-amber-950/30",   text: "text-amber-700 dark:text-amber-300",   border: "border-amber-200 dark:border-amber-800" },
  Learning:  { accent: "#10B981", bg: "bg-emerald-50 dark:bg-emerald-950/30",text: "text-emerald-700 dark:text-emerald-300",border: "border-emerald-200 dark:border-emerald-800" },
};
const PERSP_LABEL: Record<string, string> = {
  Financial: "Financial",
  Customer:  "Customer / Stakeholder",
  Internal:  "Internal Process",
  Learning:  "Learning & Growth",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── KPI definitions ──────────────────────────────────────────────────────────
type Perspective = "Financial" | "Customer" | "Internal" | "Learning";
interface KpiDef {
  id: string; name: string; perspective: Perspective;
  unit: string; target: number; lowerIsBetter?: boolean; dept: string;
}

const CORPORATE_KPIS: KpiDef[] = [
  { id:"corp_fin1", name:"Revenue Growth",           perspective:"Financial", unit:"%",     target:8,    dept:"Corporate" },
  { id:"corp_fin2", name:"EBITDA Margin",             perspective:"Financial", unit:"%",     target:22,   dept:"Corporate" },
  { id:"corp_fin3", name:"Cost per Turn",             perspective:"Financial", unit:"USD",   target:850,  dept:"Corporate", lowerIsBetter:true },
  { id:"corp_fin4", name:"Overhead Ratio",            perspective:"Financial", unit:"%",     target:18,   dept:"Corporate", lowerIsBetter:true },
  { id:"corp_cst1", name:"On-Time Performance",       perspective:"Customer",  unit:"%",     target:95,   dept:"Corporate" },
  { id:"corp_cst2", name:"Customer Satisfaction",     perspective:"Customer",  unit:"/5",    target:4.2,  dept:"Corporate" },
  { id:"corp_cst3", name:"SLA Compliance",            perspective:"Customer",  unit:"%",     target:98,   dept:"Corporate" },
  { id:"corp_cst4", name:"Airline Retention Rate",    perspective:"Customer",  unit:"%",     target:92,   dept:"Corporate" },
  { id:"corp_int1", name:"Ground Damage Rate",        perspective:"Internal",  unit:"/1000", target:0.5,  dept:"Corporate", lowerIsBetter:true },
  { id:"corp_int2", name:"FOD Incidents",             perspective:"Internal",  unit:"#",     target:0,    dept:"Corporate", lowerIsBetter:true },
  { id:"corp_int3", name:"Turnaround Compliance",     perspective:"Internal",  unit:"%",     target:94,   dept:"Corporate" },
  { id:"corp_int4", name:"Equipment Availability",    perspective:"Internal",  unit:"%",     target:96,   dept:"Corporate" },
  { id:"corp_lrn1", name:"Training Hours/Employee",   perspective:"Learning",  unit:"hrs",   target:40,   dept:"Corporate" },
  { id:"corp_lrn2", name:"Staff Turnover Rate",       perspective:"Learning",  unit:"%",     target:12,   dept:"Corporate", lowerIsBetter:true },
  { id:"corp_lrn3", name:"Safety Training Completion",perspective:"Learning",  unit:"%",     target:100,  dept:"Corporate" },
  { id:"corp_lrn4", name:"Digital Tool Adoption",     perspective:"Learning",  unit:"%",     target:80,   dept:"Corporate" },
];

const DEPARTMENTS: { id: string; name: string; icon: string; color: string }[] = [
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

const DEPT_KPIS: Record<string, KpiDef[]> = {
  ops: [
    { id:"ops_f1", name:"Revenue/Aircraft",      perspective:"Financial", unit:"USD",  target:12000, dept:"Operations" },
    { id:"ops_f2", name:"Cost Efficiency Ratio", perspective:"Financial", unit:"%",    target:72,    dept:"Operations", lowerIsBetter:true },
    { id:"ops_c1", name:"On-Time Performance",   perspective:"Customer",  unit:"%",    target:95,    dept:"Operations" },
    { id:"ops_c2", name:"Customer Score",        perspective:"Customer",  unit:"/5",   target:4.3,   dept:"Operations" },
    { id:"ops_i1", name:"Turnaround Compliance", perspective:"Internal",  unit:"%",    target:94,    dept:"Operations" },
    { id:"ops_i2", name:"Ground Damage Rate",    perspective:"Internal",  unit:"/1000",target:0.5,   dept:"Operations", lowerIsBetter:true },
    { id:"ops_l1", name:"Training Completion",   perspective:"Learning",  unit:"%",    target:95,    dept:"Operations" },
    { id:"ops_l2", name:"Turnover Rate",         perspective:"Learning",  unit:"%",    target:10,    dept:"Operations", lowerIsBetter:true },
  ],
  eng: [
    { id:"eng_f1", name:"Maintenance Cost/AC",   perspective:"Financial", unit:"USD",  target:8500,  dept:"Engineering", lowerIsBetter:true },
    { id:"eng_f2", name:"Budget Utilization",    perspective:"Financial", unit:"%",    target:95,    dept:"Engineering" },
    { id:"eng_c1", name:"SLA Compliance",        perspective:"Customer",  unit:"%",    target:98,    dept:"Engineering" },
    { id:"eng_c2", name:"Client Satisfaction",   perspective:"Customer",  unit:"/5",   target:4.2,   dept:"Engineering" },
    { id:"eng_i1", name:"Equipment Availability",perspective:"Internal",  unit:"%",    target:96,    dept:"Engineering" },
    { id:"eng_i2", name:"Defect Rate",           perspective:"Internal",  unit:"%",    target:1.5,   dept:"Engineering", lowerIsBetter:true },
    { id:"eng_l1", name:"Certifications",        perspective:"Learning",  unit:"#",    target:24,    dept:"Engineering" },
    { id:"eng_l2", name:"Tooling Compliance",    perspective:"Learning",  unit:"%",    target:100,   dept:"Engineering" },
  ],
  fin: [
    { id:"fin_f1", name:"Operating Margin",      perspective:"Financial", unit:"%",    target:22,    dept:"Finance" },
    { id:"fin_f2", name:"Cash Conversion Days",  perspective:"Financial", unit:"days", target:45,    dept:"Finance", lowerIsBetter:true },
    { id:"fin_c1", name:"Internal Satisfaction", perspective:"Customer",  unit:"/5",   target:4.0,   dept:"Finance" },
    { id:"fin_c2", name:"Report Accuracy",       perspective:"Customer",  unit:"%",    target:99,    dept:"Finance" },
    { id:"fin_i1", name:"Month-End Close Days",  perspective:"Internal",  unit:"days", target:5,     dept:"Finance", lowerIsBetter:true },
    { id:"fin_i2", name:"Budget Variance",       perspective:"Internal",  unit:"%",    target:5,     dept:"Finance", lowerIsBetter:true },
    { id:"fin_l1", name:"Staff Training Hours",  perspective:"Learning",  unit:"hrs",  target:40,    dept:"Finance" },
    { id:"fin_l2", name:"Digital Adoption",      perspective:"Learning",  unit:"%",    target:80,    dept:"Finance" },
  ],
  hr: [
    { id:"hr_f1",  name:"Cost per Hire",         perspective:"Financial", unit:"USD",  target:2500,  dept:"HR", lowerIsBetter:true },
    { id:"hr_f2",  name:"Training Cost/Employee",perspective:"Financial", unit:"USD",  target:1200,  dept:"HR" },
    { id:"hr_c1",  name:"Employee Satisfaction", perspective:"Customer",  unit:"/5",   target:4.2,   dept:"HR" },
    { id:"hr_c2",  name:"Offer Acceptance Rate", perspective:"Customer",  unit:"%",    target:85,    dept:"HR" },
    { id:"hr_i1",  name:"Time to Hire",          perspective:"Internal",  unit:"days", target:30,    dept:"HR", lowerIsBetter:true },
    { id:"hr_i2",  name:"Absenteeism Rate",      perspective:"Internal",  unit:"%",    target:3,     dept:"HR", lowerIsBetter:true },
    { id:"hr_l1",  name:"Training Completion",   perspective:"Learning",  unit:"%",    target:95,    dept:"HR" },
    { id:"hr_l2",  name:"Turnover Rate",         perspective:"Learning",  unit:"%",    target:12,    dept:"HR", lowerIsBetter:true },
  ],
  qhse: [
    { id:"q_f1",  name:"Safety Budget Util",      perspective:"Financial", unit:"%",   target:95,    dept:"QHSE" },
    { id:"q_c1",  name:"Audit Compliance Score",  perspective:"Customer",  unit:"%",   target:97,    dept:"QHSE" },
    { id:"q_c2",  name:"Incident Resolution Days",perspective:"Customer",  unit:"days",target:5,     dept:"QHSE", lowerIsBetter:true },
    { id:"q_i1",  name:"FOD Incidents",           perspective:"Internal",  unit:"#",   target:0,     dept:"QHSE", lowerIsBetter:true },
    { id:"q_i2",  name:"Near Miss Reports",       perspective:"Internal",  unit:"#",   target:12,    dept:"QHSE" },
    { id:"q_l1",  name:"Safety Training Completion",perspective:"Learning",unit:"%",   target:100,   dept:"QHSE" },
    { id:"q_l2",  name:"Safety Culture Score",    perspective:"Learning",  unit:"/5",  target:4.5,   dept:"QHSE" },
  ],
  it: [
    { id:"it_f1", name:"IT Budget Utilization",  perspective:"Financial", unit:"%",    target:95,    dept:"IT" },
    { id:"it_f2", name:"Cost per Ticket",        perspective:"Financial", unit:"USD",  target:120,   dept:"IT", lowerIsBetter:true },
    { id:"it_c1", name:"System Uptime",          perspective:"Customer",  unit:"%",    target:99.5,  dept:"IT" },
    { id:"it_c2", name:"User Satisfaction",      perspective:"Customer",  unit:"/5",   target:4.2,   dept:"IT" },
    { id:"it_i1", name:"Ticket Resolution Time", perspective:"Internal",  unit:"hrs",  target:4,     dept:"IT", lowerIsBetter:true },
    { id:"it_i2", name:"First Call Resolution",  perspective:"Internal",  unit:"%",    target:75,    dept:"IT" },
    { id:"it_l1", name:"Digital Tool Adoption",  perspective:"Learning",  unit:"%",    target:80,    dept:"IT" },
    { id:"it_l2", name:"Training Completion",    perspective:"Learning",  unit:"%",    target:90,    dept:"IT" },
  ],
  comm: [
    { id:"co_f1", name:"Revenue Growth",         perspective:"Financial", unit:"%",    target:10,    dept:"Commercial" },
    { id:"co_f2", name:"Contract Value",         perspective:"Financial", unit:"MUSD", target:25,    dept:"Commercial" },
    { id:"co_c1", name:"Customer Retention",     perspective:"Customer",  unit:"%",    target:92,    dept:"Commercial" },
    { id:"co_c2", name:"Customer Satisfaction",  perspective:"Customer",  unit:"/5",   target:4.3,   dept:"Commercial" },
    { id:"co_i1", name:"Proposal Win Rate",      perspective:"Internal",  unit:"%",    target:40,    dept:"Commercial" },
    { id:"co_i2", name:"Contract Renewal Rate",  perspective:"Internal",  unit:"%",    target:85,    dept:"Commercial" },
    { id:"co_l1", name:"Sales Training Hours",   perspective:"Learning",  unit:"hrs",  target:40,    dept:"Commercial" },
    { id:"co_l2", name:"Product Knowledge Score",perspective:"Learning",  unit:"%",    target:85,    dept:"Commercial" },
  ],
  camo: [
    { id:"ca_f1", name:"Maintenance Budget Util", perspective:"Financial", unit:"%",   target:92,    dept:"CAMO" },
    { id:"ca_c1", name:"Airworthiness Compliance",perspective:"Customer",  unit:"%",   target:100,   dept:"CAMO" },
    { id:"ca_c2", name:"Customer Satisfaction",   perspective:"Customer",  unit:"/5",  target:4.4,   dept:"CAMO" },
    { id:"ca_i1", name:"Aircraft Availability",   perspective:"Internal",  unit:"%",   target:96,    dept:"CAMO" },
    { id:"ca_i2", name:"On-Time Maintenance",     perspective:"Internal",  unit:"%",   target:95,    dept:"CAMO" },
    { id:"ca_l1", name:"Tech Training Hours",     perspective:"Learning",  unit:"hrs", target:60,    dept:"CAMO" },
    { id:"ca_l2", name:"Regulatory Compliance",   perspective:"Learning",  unit:"%",   target:100,   dept:"CAMO" },
  ],
  mro: [
    { id:"mr_f1", name:"MRO Revenue",            perspective:"Financial", unit:"MUSD", target:8,     dept:"MRO" },
    { id:"mr_f2", name:"Cost per Man-Hour",       perspective:"Financial", unit:"USD",  target:85,    dept:"MRO", lowerIsBetter:true },
    { id:"mr_c1", name:"TAT Compliance",         perspective:"Customer",  unit:"%",    target:93,    dept:"MRO" },
    { id:"mr_c2", name:"Customer Score",         perspective:"Customer",  unit:"/5",   target:4.2,   dept:"MRO" },
    { id:"mr_i1", name:"Rework Rate",            perspective:"Internal",  unit:"%",    target:2,     dept:"MRO", lowerIsBetter:true },
    { id:"mr_i2", name:"First-Time Fix Rate",    perspective:"Internal",  unit:"%",    target:88,    dept:"MRO" },
    { id:"mr_l1", name:"Certification Rate",     perspective:"Learning",  unit:"%",    target:95,    dept:"MRO" },
    { id:"mr_l2", name:"Tech Training Hrs",      perspective:"Learning",  unit:"hrs",  target:50,    dept:"MRO" },
  ],
  corp: CORPORATE_KPIS,
};

// ── Persistence helpers ──────────────────────────────────────────────────────
const STORE_KEY = "ghc_beacon_v2";
function loadStore(): Record<string, Record<string, number>> {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch { return {}; }
}
function saveStore(d: Record<string, Record<string, number>>) {
  localStorage.setItem(STORE_KEY, JSON.stringify(d));
}
function periodKey(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

// ── KPI logic ────────────────────────────────────────────────────────────────
function getStatus(k: KpiDef, actual: number | null): "green" | "amber" | "red" | "nodata" {
  if (actual === null || actual === undefined || isNaN(actual)) return "nodata";
  const pct = k.lowerIsBetter
    ? k.target === 0 ? (actual === 0 ? 100 : 0) : Math.max(0, (1 - (actual - k.target) / Math.abs(k.target)) * 100)
    : k.target === 0 ? 100 : (actual / k.target) * 100;
  if (pct >= 95) return "green";
  if (pct >= 80) return "amber";
  return "red";
}
function getTrend(cur: number | null, prev: number | null): "up" | "down" | "flat" {
  if (cur === null || prev === null) return "flat";
  if (cur > prev + 0.001) return "up";
  if (cur < prev - 0.001) return "down";
  return "flat";
}
function healthPct(kpis: KpiDef[], actuals: Record<string, number | null>): number {
  const with_data = kpis.filter(k => actuals[k.id] !== null && actuals[k.id] !== undefined);
  if (!with_data.length) return 0;
  return Math.round(with_data.filter(k => getStatus(k, actuals[k.id]!) === "green").length / with_data.length * 100);
}

// ── Small reusable pieces ────────────────────────────────────────────────────
function RagBadge({ status }: { status: "green" | "amber" | "red" | "nodata" }) {
  const map = {
    green:  { label: "On Track",  cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800", icon: CheckCircle2 },
    amber:  { label: "At Risk",   cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",           icon: AlertTriangle },
    red:    { label: "Off Track", cls: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",                     icon: AlertCircle },
    nodata: { label: "No Data",   cls: "bg-muted text-muted-foreground border-border",                                                         icon: Clock },
  };
  const { label, cls, icon: Icon } = map[status];
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium border text-xs", cls)}>
      <Icon className="h-3 w-3" />{label}
    </Badge>
  );
}

function TrendArrow({ trend, lowerIsBetter }: { trend: "up" | "down" | "flat"; lowerIsBetter?: boolean }) {
  const good = lowerIsBetter ? trend === "down" : trend === "up";
  const bad  = lowerIsBetter ? trend === "up"   : trend === "down";
  return trend === "up"   ? <TrendingUp  className={cn("h-4 w-4", good ? "text-emerald-500" : bad ? "text-red-500" : "text-amber-500")} />
       : trend === "down" ? <TrendingDown className={cn("h-4 w-4", good ? "text-emerald-500" : bad ? "text-red-500" : "text-amber-500")} />
       : <Minus className="h-4 w-4 text-muted-foreground" />;
}

function HealthRing({ pct, size = 52 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const color = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round" style={{ transition: "stroke-dasharray .5s ease" }} />
      <text x={size/2} y={size/2} dominantBaseline="middle" textAnchor="middle"
        fill={color} fontSize="10" fontWeight="700"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}>
        {pct}%
      </text>
    </svg>
  );
}

function PeriodSelector({ year, month, onChange }: { year: number; month: number; onChange: (y: number, m: number) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 border rounded-lg px-2 py-1.5 bg-background">
        <button onClick={() => onChange(year - 1, month)} className="p-0.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-sm font-semibold px-1 min-w-[38px] text-center">{year}</span>
        <button onClick={() => onChange(year + 1, month)} className="p-0.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex gap-1 flex-wrap">
        {MONTHS.map((m, i) => (
          <button key={m} onClick={() => onChange(year, i)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
              i === month
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}>
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── KPI Card (light theme) ────────────────────────────────────────────────────
function KpiCard({ kpi, actual, prevActual, onClick }: { kpi: KpiDef; actual: number | null; prevActual: number | null; onClick?: () => void }) {
  const status = getStatus(kpi, actual);
  const trend  = getTrend(actual, prevActual);
  const pc     = P_COLOR[kpi.perspective] || P_COLOR.Financial;
  return (
    <Card className={cn("cursor-pointer hover:shadow-md transition-all border-l-[3px] group", onClick ? "cursor-pointer" : "")}
      style={{ borderLeftColor: pc.accent }} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-sm font-medium text-foreground leading-tight">{kpi.name}</p>
          <RagBadge status={status} />
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {actual !== null ? actual : <span className="text-muted-foreground text-base">—</span>}
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

// ── Summary stat card ────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="border-t-[3px]" style={{ borderTopColor: color }}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-3xl font-bold tabular-nums" style={{ color }}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN: Corporate Scorecard
// ═══════════════════════════════════════════════════════════════════════════════
function CorporateScorecard() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [store, setStore] = useState(loadStore);
  const [entryValues, setEntryValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState("overview");
  const { toast } = useToast();
  const [, nav] = useLocation();

  const pk  = periodKey(year, month);
  const ppk = month === 0 ? periodKey(year - 1, 11) : periodKey(year, month - 1);

  const getActual = (id: string, p = pk): number | null => {
    const v = store?.[p]?.[id];
    return v !== undefined ? Number(v) : null;
  };

  // Pre-fill entry form from store when period changes
  useEffect(() => {
    const prefill: Record<string, string> = {};
    [...CORPORATE_KPIS, ...Object.values(DEPT_KPIS).flat()].forEach(k => {
      const v = store?.[pk]?.[k.id];
      if (v !== undefined) prefill[k.id] = String(v);
    });
    setEntryValues(prefill);
  }, [pk]);

  // All KPIs across all departments
  const allKpis = useMemo(() => Object.values(DEPT_KPIS).flat(), []);
  const allActuals: Record<string, number | null> = {};
  allKpis.forEach(k => { allActuals[k.id] = getActual(k.id); });

  const onTrack  = allKpis.filter(k => getStatus(k, allActuals[k.id]) === "green").length;
  const atRisk   = allKpis.filter(k => getStatus(k, allActuals[k.id]) === "amber").length;
  const offTrack = allKpis.filter(k => getStatus(k, allActuals[k.id]) === "red").length;

  const saveKpi = (kpiId: string) => {
    const val = entryValues[kpiId];
    if (!val && val !== "0") return;
    const updated = { ...store, [pk]: { ...(store[pk] || {}), [kpiId]: Number(val) } };
    setStore(updated); saveStore(updated);
    setSaved(s => ({ ...s, [kpiId]: true }));
    setTimeout(() => setSaved(s => ({ ...s, [kpiId]: false })), 1500);
    toast({ title: "Saved", description: `Value updated for ${MONTHS[month]} ${year}.` });
  };

  const saveAll = (kpis: KpiDef[]) => {
    const updates: Record<string, number> = {};
    kpis.forEach(k => { if (entryValues[k.id] !== undefined && entryValues[k.id] !== "") updates[k.id] = Number(entryValues[k.id]); });
    if (!Object.keys(updates).length) { toast({ title: "Nothing to save", description: "Enter at least one value." }); return; }
    const updated = { ...store, [pk]: { ...(store[pk] || {}), ...updates } };
    setStore(updated); saveStore(updated);
    toast({ title: "Saved", description: `${Object.keys(updates).length} values saved for ${MONTHS[month]} ${year}.` });
  };

  const perspectives: Perspective[] = ["Financial", "Customer", "Internal", "Learning"];

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <PageHeader
          title="Balanced Scorecard"
          description="Corporate performance across all departments and BSC perspectives"
          icon={Activity}
        />
        <PeriodSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total KPIs" value={allKpis.length} color="#64748b" />
        <StatCard label="On Track"   value={onTrack}        color="#10b981" />
        <StatCard label="At Risk"    value={atRisk}         color="#f59e0b" />
        <StatCard label="Off Track"  value={offTrack}       color="#ef4444" />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview"  data-testid="tab-overview">Department Overview</TabsTrigger>
          <TabsTrigger value="entry"     data-testid="tab-entry">Data Entry</TabsTrigger>
        </TabsList>

        {/* ── Overview: Department cards ── */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {DEPARTMENTS.map(dept => {
              const kpis = DEPT_KPIS[dept.id] || [];
              const acts: Record<string, number | null> = {};
              kpis.forEach(k => { acts[k.id] = getActual(k.id); });
              const hp  = healthPct(kpis, acts);
              const gt  = kpis.filter(k => getStatus(k, acts[k.id]) === "green").length;
              const ar  = kpis.filter(k => getStatus(k, acts[k.id]) === "amber").length;
              const ot  = kpis.filter(k => getStatus(k, acts[k.id]) === "red").length;
              return (
                <Card key={dept.id}
                  className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30 group"
                  onClick={() => nav(`/scorecard/department/${dept.id}`)}
                  data-testid={`card-dept-${dept.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{dept.icon}</span>
                        <CardTitle className="text-base">{dept.name}</CardTitle>
                      </div>
                      <HealthRing pct={hp} />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground mb-3">{kpis.length} KPIs tracked</p>
                    <div className="flex gap-3 text-xs">
                      <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3 w-3" />{gt}</span>
                      <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="h-3 w-3" />{ar}</span>
                      <span className="flex items-center gap-1 text-red-600"><AlertCircle className="h-3 w-3" />{ot}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      View KPIs <ChevronRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* BSC Overview Chart */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Health by Perspective — All Departments</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {perspectives.map(p => {
                const kpis = allKpis.filter(k => k.perspective === p);
                const acts: Record<string, number | null> = {};
                kpis.forEach(k => { acts[k.id] = getActual(k.id); });
                const hp = healthPct(kpis, acts);
                const pc = P_COLOR[p];
                return (
                  <Card key={p} className="border-t-[3px]" style={{ borderTopColor: pc.accent }}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <HealthRing pct={hp} size={56} />
                      <div>
                        <p className="text-xs text-muted-foreground">{PERSP_LABEL[p]}</p>
                        <p className="text-lg font-bold">{kpis.length} KPIs</p>
                        <p className="text-xs" style={{ color: pc.accent }}>{kpis.filter(k=>getStatus(k,acts[k.id])==="green").length} on track</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── Data Entry ── */}
        <TabsContent value="entry" className="mt-4 space-y-6">
          {DEPARTMENTS.map(dept => {
            const kpis = DEPT_KPIS[dept.id] || [];
            return (
              <Card key={dept.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span>{dept.icon}</span>{dept.name}
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={() => saveAll(kpis)} data-testid={`button-save-dept-${dept.id}`}>
                      <Save className="h-3.5 w-3.5 mr-1.5" /> Save {dept.name}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {kpis.map(k => {
                      const current = getActual(k.id);
                      const status  = getStatus(k, current);
                      const pc      = P_COLOR[k.perspective];
                      return (
                        <div key={k.id} className={cn("flex items-center gap-3 p-3 rounded-lg border border-l-[3px]", pc.bg)}
                          style={{ borderLeftColor: pc.accent }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{k.name}</p>
                            <p className="text-xs text-muted-foreground">Target: {k.target} {k.unit} · Current: {current ?? "—"}</p>
                          </div>
                          <RagBadge status={status} />
                          <Input type="number" value={entryValues[k.id] ?? ""}
                            onChange={e => setEntryValues(v => ({ ...v, [k.id]: e.target.value }))}
                            placeholder={k.unit}
                            className="w-24 h-8 text-sm text-right"
                            data-testid={`input-kpi-${k.id}`} />
                          <Button size="icon" variant="outline" className="h-8 w-8 shrink-0"
                            onClick={() => saveKpi(k.id)} data-testid={`button-save-${k.id}`}>
                            {saved[k.id] ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Save className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Department Detail
// ═══════════════════════════════════════════════════════════════════════════════
function DepartmentDetail({ deptId }: { deptId: string }) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [store, setStore] = useState(loadStore);
  const [entryValues, setEntryValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();
  const [, nav] = useLocation();

  const dept = DEPARTMENTS.find(d => d.id === deptId);
  const kpis = DEPT_KPIS[deptId] || [];
  const pk   = periodKey(year, month);
  const ppk  = month === 0 ? periodKey(year - 1, 11) : periodKey(year, month - 1);

  const getActual = (id: string, p = pk): number | null => {
    const v = store?.[p]?.[id];
    return v !== undefined ? Number(v) : null;
  };

  useEffect(() => {
    const prefill: Record<string, string> = {};
    kpis.forEach(k => { const v = store?.[pk]?.[k.id]; if (v !== undefined) prefill[k.id] = String(v); });
    setEntryValues(prefill);
  }, [pk]);

  const allActuals: Record<string, number | null> = {};
  kpis.forEach(k => { allActuals[k.id] = getActual(k.id); });

  const onTrack  = kpis.filter(k => getStatus(k, allActuals[k.id]) === "green").length;
  const atRisk   = kpis.filter(k => getStatus(k, allActuals[k.id]) === "amber").length;
  const offTrack = kpis.filter(k => getStatus(k, allActuals[k.id]) === "red").length;
  const hp       = healthPct(kpis, allActuals);

  const saveKpi = (kpiId: string) => {
    const val = entryValues[kpiId];
    if (!val && val !== "0") return;
    const updated = { ...store, [pk]: { ...(store[pk] || {}), [kpiId]: Number(val) } };
    setStore(updated); saveStore(updated);
    setSaved(s => ({ ...s, [kpiId]: true }));
    setTimeout(() => setSaved(s => ({ ...s, [kpiId]: false })), 1500);
    toast({ title: "Saved" });
  };

  const saveAll = () => {
    const updates: Record<string, number> = {};
    kpis.forEach(k => { if (entryValues[k.id] !== undefined && entryValues[k.id] !== "") updates[k.id] = Number(entryValues[k.id]); });
    if (!Object.keys(updates).length) { toast({ title: "Nothing to save" }); return; }
    const updated = { ...store, [pk]: { ...(store[pk] || {}), ...updates } };
    setStore(updated); saveStore(updated);
    toast({ title: "Saved", description: `${Object.keys(updates).length} values saved for ${MONTHS[month]} ${year}.` });
  };

  const perspectives: Perspective[] = ["Financial", "Customer", "Internal", "Learning"];

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => nav("/scorecard")} className="gap-1.5 text-muted-foreground" data-testid="button-back">
            <ChevronLeft className="h-4 w-4" /> All Departments
          </Button>
        </div>
        <PeriodSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-2xl">{dept?.icon}</span>
        <div>
          <h1 className="text-2xl font-bold">{dept?.name} Department</h1>
          <p className="text-sm text-muted-foreground">Balanced Scorecard — {MONTHS[month]} {year}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <HealthRing pct={hp} size={56} />
          <div>
            <p className="text-xs text-muted-foreground">Health Score</p>
            <p className="text-lg font-bold">{hp}%</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total KPIs" value={kpis.length} color="#64748b" />
        <StatCard label="On Track"   value={onTrack}     color="#10b981" />
        <StatCard label="At Risk"    value={atRisk}      color="#f59e0b" />
        <StatCard label="Off Track"  value={offTrack}    color="#ef4444" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="entry">Data Entry</TabsTrigger>
        </TabsList>

        {/* Dashboard: KPIs by perspective */}
        <TabsContent value="dashboard" className="mt-4 space-y-8">
          {perspectives.map(p => {
            const pkpis = kpis.filter(k => k.perspective === p);
            if (!pkpis.length) return null;
            const pc = P_COLOR[p];
            return (
              <div key={p}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-5 rounded-full" style={{ background: pc.accent }} />
                  <h2 className="text-base font-semibold">{PERSP_LABEL[p]}</h2>
                  <Badge variant="outline" className={cn(pc.bg, pc.text, pc.border, "border text-xs")}>
                    {pkpis.length} KPIs
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {pkpis.map(k => (
                    <KpiCard key={k.id} kpi={k} actual={getActual(k.id)} prevActual={getActual(k.id, ppk)}
                      onClick={() => nav(`/scorecard/kpi/${k.id}`)} />
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* Data Entry */}
        <TabsContent value="entry" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Enter Actuals — {MONTHS[month]} {year}</CardTitle>
                <Button size="sm" onClick={saveAll} data-testid="button-save-all">
                  <Save className="h-3.5 w-3.5 mr-1.5" /> Save All
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
                    <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: pc.accent }}>{PERSP_LABEL[p]}</p>
                    <div className="space-y-2">
                      {pkpis.map(k => {
                        const current = getActual(k.id);
                        const status  = getStatus(k, current);
                        return (
                          <div key={k.id} className="flex items-center gap-3 flex-wrap sm:flex-nowrap p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <span className="text-sm text-foreground flex-1 min-w-[160px]">{k.name}</span>
                            <span className="text-xs text-muted-foreground w-28">Target: {k.target} {k.unit}</span>
                            <span className="text-xs text-muted-foreground w-20">Now: {current ?? "—"}</span>
                            <RagBadge status={status} />
                            <Input type="number" value={entryValues[k.id] ?? ""}
                              onChange={e => setEntryValues(v => ({ ...v, [k.id]: e.target.value }))}
                              placeholder="Enter actual"
                              className="w-28 h-8 text-sm text-right"
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

// ═══════════════════════════════════════════════════════════════════════════════
// KPI Detail
// ═══════════════════════════════════════════════════════════════════════════════
function KpiDetail({ kpiId }: { kpiId: string }) {
  const [store] = useState(loadStore);
  const [, nav] = useLocation();
  const today   = new Date();

  const allKpis = [...CORPORATE_KPIS, ...Object.values(DEPT_KPIS).flat()];
  const kpi = allKpis.find(k => k.id === kpiId);
  if (!kpi) return <div className="p-8 text-center text-muted-foreground">KPI not found.</div>;

  const pc = P_COLOR[kpi.perspective];

  // Build 12-month history
  const history = useMemo(() => {
    const rows = [];
    for (let i = 11; i >= 0; i--) {
      let y = today.getFullYear(), m = today.getMonth() - i;
      while (m < 0) { m += 12; y--; }
      const pk2  = periodKey(y, m);
      const v    = store?.[pk2]?.[kpiId];
      const actual = v !== undefined ? Number(v) : null;
      rows.push({ period: `${MONTHS[m]} ${y}`, label: MONTHS[m].slice(0, 3), actual, target: kpi.target, status: getStatus(kpi, actual) });
    }
    return rows;
  }, [store, kpiId]);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => nav(-1 as any)} className="gap-1.5 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={cn(pc.bg, pc.text, pc.border, "border text-xs")}>{kpi.perspective}</Badge>
          <Badge variant="outline" className="text-xs">{kpi.dept}</Badge>
        </div>
        <h1 className="text-2xl font-bold">{kpi.name}</h1>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Target",      value: `${kpi.target} ${kpi.unit}`, color: pc.accent },
          { label: "Unit",        value: kpi.unit,         color: "#64748b" },
          { label: "Perspective", value: kpi.perspective,  color: pc.accent },
          { label: "Department",  value: kpi.dept,         color: "#64748b" },
        ].map(c => (
          <Card key={c.label} className="border-t-[3px]" style={{ borderTopColor: c.color }}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
              <p className="font-semibold text-foreground">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">12-Month Trend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
              />
              <Legend formatter={v => <span className="text-xs text-muted-foreground">{v}</span>} />
              <Line type="monotone" dataKey="actual" stroke={pc.accent} strokeWidth={2.5} dot={{ fill: pc.accent, r: 4 }} connectNulls name="Actual" />
              <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Target" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* History table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Performance History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left p-4 text-muted-foreground font-medium">Period</th>
                  <th className="text-right p-4 text-muted-foreground font-medium">Actual</th>
                  <th className="text-right p-4 text-muted-foreground font-medium">Target</th>
                  <th className="text-center p-4 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...history].reverse().map(h => (
                  <tr key={h.period} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{h.period}</td>
                    <td className="p-4 text-right font-bold tabular-nums">
                      {h.actual ?? <span className="text-muted-foreground">—</span>}
                      <span className="text-xs text-muted-foreground ml-1">{kpi.unit}</span>
                    </td>
                    <td className="p-4 text-right text-muted-foreground">{h.target} {kpi.unit}</td>
                    <td className="p-4 text-center"><RagBadge status={h.status as any} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function ScorecardPage() {
  const [matchRoot]  = useRoute("/scorecard");
  const [matchDept, paramsDept] = useRoute("/scorecard/department/:id");
  const [matchKpi,  paramsKpi]  = useRoute("/scorecard/kpi/:id");

  if (matchDept && paramsDept) return <DepartmentDetail deptId={paramsDept.id} />;
  if (matchKpi  && paramsKpi)  return <KpiDetail kpiId={paramsKpi.id} />;
  return <CorporateScorecard />;
}
