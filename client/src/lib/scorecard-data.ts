export type Perspective = "Financial" | "Customer" | "Internal" | "Learning";

export interface KpiDef {
  id: string; name: string; perspective: Perspective;
  unit: string; target: number; lowerIsBetter?: boolean;
  targetType?: "numeric" | "milestone_numeric" | "milestone_date";
  targetDate?: string;
  targetFrequency?: "monthly" | "annual";
  milestoneStartDate?: string;
}

export type StatusCtx = {
  periodStore?: Record<string, number>;
  year?: number;
  month?: number;
}

export interface BscDepartment {
  id: string; name: string; icon: string; color: string;
}

export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export const DEFAULT_DEPARTMENTS: BscDepartment[] = [
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

export const DEPT_KPIS: Record<string, KpiDef[]> = {
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
    // Financial
    { id:"hr_f1",  name:"Budget Adherence %",                                           perspective:"Financial", unit:"%",    target:100 },
    // Customer / Stakeholder
    { id:"hr_c1",  name:"# Level 1 Audit Findings",                                     perspective:"Customer",  unit:"#",    target:0,   lowerIsBetter:true },
    { id:"hr_c2",  name:"Offer Acceptance Rate",                                         perspective:"Customer",  unit:"%",    target:75 },
    { id:"hr_c3",  name:"Time to Resolve Employee Issues",                               perspective:"Customer",  unit:"days", target:10,  lowerIsBetter:true },
    { id:"hr_c4",  name:"Employee Grievance Resolution Rate %",                          perspective:"Customer",  unit:"days", target:10,  lowerIsBetter:true },
    // Internal Process
    { id:"hr_i1",  name:"Development and Sign-off of HR Policy",                        perspective:"Internal",  unit:"%",    target:100, targetType:"milestone_date", targetDate:"2026-06", milestoneStartDate:"2026-01" },
    { id:"hr_i2",  name:"HR Process Digitalization %",                                   perspective:"Internal",  unit:"%",    target:75,  targetType:"milestone_numeric" },
    { id:"hr_i3",  name:"% Employees with Assigned KPIs",                                perspective:"Internal",  unit:"%",    target:100 },
    { id:"hr_i4",  name:"Digital Onboarding Completion %",                               perspective:"Internal",  unit:"%",    target:100 },
    { id:"hr_i5",  name:"Time to Hire Positions (days) – Job Open to Offer Acceptance",  perspective:"Internal",  unit:"days", target:40,  lowerIsBetter:true },
    { id:"hr_i6",  name:"Time to Fill Positions (days) – Offer Acceptance to Onboarding",perspective:"Internal",  unit:"days", target:100, lowerIsBetter:true },
    { id:"hr_i7",  name:"Voluntary Turnover Rate %",                                     perspective:"Internal",  unit:"%",    target:8,   lowerIsBetter:true, targetFrequency:"annual" },
    { id:"hr_i8",  name:"Review Processes & Procedures Update Rate %",                   perspective:"Internal",  unit:"%",    target:90,  targetType:"milestone_numeric" },
    { id:"hr_i9",  name:"% Performance Appraisals Completed on Time",                    perspective:"Internal",  unit:"%",    target:100, targetFrequency:"annual" },
    // Learning & Growth
    { id:"hr_l1",  name:"% Leadership Roles with Successor Identified",                  perspective:"Learning",  unit:"%",    target:90,  targetFrequency:"annual" },
    { id:"hr_l2",  name:"Hiring of N-1 & N-2 as per approved org. chart",                perspective:"Learning",  unit:"%",    target:100 },
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
    { id:"it_i1", name:"Key Deliverables Completion (%)",                    perspective:"Internal", unit:"%",  target:100, targetType:"milestone_numeric" },
    { id:"it_c1", name:"IT System Uptime %",                                 perspective:"Customer", unit:"%",  target:85 },
    { id:"it_i2", name:"IT Helpdesk SLA Compliance %",                       perspective:"Internal", unit:"%",  target:90 },
    { id:"it_c2", name:"System Uptime % (Infra)",                            perspective:"Customer", unit:"%",  target:95 },
    { id:"it_i3", name:"Incident Resolution Time (hrs)",                     perspective:"Internal", unit:"hrs",target:48 },
    { id:"it_c3", name:"IT Satisfaction Score (Survey)",                     perspective:"Customer", unit:"/5", target:3,   targetFrequency:"annual" },
    { id:"it_l1", name:"IT Training Participation Rate %",                   perspective:"Learning", unit:"%",  target:90 },
    { id:"it_l2", name:"IT Cybersecurity & System Awareness Activities (Count)", perspective:"Learning", unit:"#",  target:4 },
    { id:"it_i4", name:"Monthly Security Incident Reporting & Improvement Actions", perspective:"Internal", unit:"#",  target:12 },
    { id:"it_f1", name:"IT Budget Adherence %",                                      perspective:"Financial",unit:"%",  target:100, lowerIsBetter:true },
    { id:"it_i5", name:"Review Process & Procedure Update Rate %",                   perspective:"Internal", unit:"%",  target:0 },
    { id:"it_i6", name:"Review Process and Procedures",                              perspective:"Internal", unit:"%",  target:90 },
    { id:"it_c4", name:"# Level-1 audit findings",                                   perspective:"Customer", unit:"#",  target:0,   lowerIsBetter:true },
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

export function genericKpis(deptId: string): KpiDef[] {
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

export function getKpisForDept(id: string): KpiDef[] {
  return DEPT_KPIS[id] || genericKpis(id);
}

export function effectiveTargetAndActual(
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

export function getStatus(k: KpiDef, actual: number | null, ctx?: StatusCtx): "green" | "amber" | "red" | "nodata" {
  if (actual === null || actual === undefined || isNaN(Number(actual))) return "nodata";
  const { effectiveTarget, effectiveActual } = effectiveTargetAndActual(k, Number(actual), ctx);
  const pct = k.lowerIsBetter
    ? effectiveTarget === 0 ? (effectiveActual === 0 ? 100 : 0) : Math.max(0, (1 - (effectiveActual - effectiveTarget) / Math.abs(effectiveTarget)) * 100)
    : effectiveTarget === 0 ? 100 : (effectiveActual / effectiveTarget) * 100;
  if (pct >= 95) return "green";
  if (pct >= 80) return "amber";
  return "red";
}

export function periodKey(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

export function loadStore(): Record<string, Record<string, number>> {
  try { return JSON.parse(localStorage.getItem("ghc_beacon_v2") || "{}"); } catch { return {}; }
}

export function loadDepartments(): BscDepartment[] {
  try {
    const d = localStorage.getItem("bsc_departments");
    return d ? JSON.parse(d) : DEFAULT_DEPARTMENTS;
  } catch { return DEFAULT_DEPARTMENTS; }
}
