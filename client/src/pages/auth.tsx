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
  Users, LayoutGrid, Play, Pause, Search, Activity, Flag, X, Target, ListChecks,
  AlertTriangle, Calendar, Clock, RefreshCw,
} from "lucide-react";

type DemoSlide = { content: () => JSX.Element; caption: string; duration: number };
type FeatureDef = {
  icon: React.ElementType; title: string; description: string;
  color: string; bg: string; slides: DemoSlide[];
};

/* ───────────── Reusable mini-UI atoms ───────────── */
const Pill = ({ children, c = "bg-muted text-muted-foreground" }: { children: React.ReactNode; c?: string }) => (
  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c}`}>{children}</span>
);
const Bar = ({ w, c = "bg-primary" }: { w: string; c?: string }) => (
  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${c} transition-all duration-700`} style={{ width: w }} /></div>
);
const FakeInput = ({ value, active = false }: { value: string; active?: boolean }) => (
  <div className={`text-[10px] border rounded px-2 py-1 bg-background/80 ${active ? "border-primary ring-1 ring-primary/30" : "border-border"}`}>{value}</div>
);
const FakeBtn = ({ children, primary = false }: { children: React.ReactNode; primary?: boolean }) => (
  <div className={`text-[9px] px-2.5 py-1 rounded font-semibold inline-block ${primary ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border"}`}>{children}</div>
);
const Avatar = ({ name, c = "bg-primary/20 text-primary" }: { name: string; c?: string }) => (
  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${c}`}>
    {name.split(" ").map(n => n[0]).join("").slice(0, 2)}
  </div>
);

/* ───────────── DEMO SLIDES per feature ───────────── */
const FEATURES: FeatureDef[] = [
  {
    icon: LineChart, title: "Live Dashboard",
    description: "Welcome banner, KPI health stats, action charts, execution overview and department summaries — all in one live view.",
    color: "text-primary", bg: "bg-primary/10",
    slides: [
      {
        caption: "Welcome banner shows your company, date & performance summary",
        duration: 2800,
        content: () => (
          <div className="space-y-2">
            <div className="rounded-lg border bg-background/80 p-3">
              <div className="text-[11px] font-semibold">Welcome back, Dharmesh 👋</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">Sunday, March 15, 2026 · OYO Hospitality</div>
              <div className="text-[9px] text-muted-foreground mt-1">67% of KPIs on track · 2 actions overdue · 5 actions completed</div>
            </div>
          </div>
        ),
      },
      {
        caption: "6 live stat cards show KPI and action health at a glance",
        duration: 2800,
        content: () => (
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { t: "Total KPIs", v: "12", c: "text-primary" },
              { t: "On Track", v: "8", c: "text-emerald-600" },
              { t: "Below Target", v: "2", c: "text-red-500" },
              { t: "Total Actions", v: "10", c: "text-blue-600" },
              { t: "Overdue", v: "2", c: "text-orange-500" },
              { t: "Completed", v: "5", c: "text-emerald-600" },
            ].map((s, i) => (
              <div key={i} className="rounded bg-background/80 border p-1.5 text-center">
                <div className={`text-[13px] font-bold ${s.c}`}>{s.v}</div>
                <div className="text-[7px] text-muted-foreground leading-tight">{s.t}</div>
              </div>
            ))}
          </div>
        ),
      },
      {
        caption: "KPI health donut chart shows On Track, At Risk and Below Target",
        duration: 2800,
        content: () => (
          <div className="flex items-center gap-3">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="63 94" strokeLinecap="round" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="18 94" strokeDashoffset="-63" strokeLinecap="round" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="13 94" strokeDashoffset="-81" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-[10px] font-bold text-center">12<br/><span className="text-[7px] text-muted-foreground">KPIs</span></div>
              </div>
            </div>
            <div className="space-y-1.5 flex-1">
              {[{l:"On Track",v:"8",c:"bg-emerald-500"},{l:"At Risk",v:"2",c:"bg-amber-500"},{l:"Below",v:"2",c:"bg-red-500"}].map((r,i)=>(
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${r.c}`} />
                  <span className="text-[9px] flex-1">{r.l}</span>
                  <span className="text-[9px] font-semibold">{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        caption: "Execution section shows active projects with live health scores",
        duration: 2800,
        content: () => (
          <div className="space-y-1.5">
            <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide mb-2">Execution Overview</div>
            {[
              {n:"Loyalty Program Launch",h:"bg-emerald-500",p:55,s:"In Progress"},
              {n:"Staff Retention Initiative",h:"bg-red-500",p:30,s:"At Risk"},
              {n:"F&B Menu Overhaul",h:"bg-amber-500",p:40,s:"In Progress"},
            ].map((p,i)=>(
              <div key={i} className="rounded bg-background/80 border p-1.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${p.h}`} />
                  <span className="text-[9px] font-medium flex-1 truncate">{p.n}</span>
                  <span className="text-[9px] text-muted-foreground">{p.p}%</span>
                </div>
                <Bar w={`${p.p}%`} c={p.h} />
              </div>
            ))}
          </div>
        ),
      },
    ],
  },

  {
    icon: Sparkles, title: "AI KPI Generator",
    description: "Generate industry-specific KPIs instantly with GPT-4o. Get tailored metrics with RAG thresholds, formulas, and data sources.",
    color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/30",
    slides: [
      {
        caption: "Select 'AI Generate' tab and describe your business context",
        duration: 2500,
        content: () => (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <div className="flex-1 text-[9px] px-2 py-1 rounded bg-muted/40 text-muted-foreground text-center">Manual KPI</div>
              <div className="flex-1 text-[9px] px-2 py-1 rounded bg-violet-500 text-white text-center font-medium flex items-center justify-center gap-1">
                <Sparkles className="h-2.5 w-2.5" /> AI Generate
              </div>
            </div>
            <FakeInput value="Hospitality — 5-star hotels, revenue focus" active />
            <div className="text-[9px] text-muted-foreground text-center pt-1">Describe your industry and focus areas</div>
          </div>
        ),
      },
      {
        caption: "GPT-4o generates industry-specific KPIs in seconds",
        duration: 3000,
        content: () => (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 p-2">
              <Sparkles className="h-3 w-3 text-violet-500 shrink-0 animate-pulse" />
              <div className="text-[9px] text-violet-700 dark:text-violet-300">GPT-4o generating KPIs for hospitality...</div>
            </div>
            <div className="space-y-1">
              {["Revenue Per Available Room (RevPAR)","Occupancy Rate","Average Daily Rate (ADR)"].map((k,i)=>(
                <div key={i} className="text-[9px] flex items-center gap-2 rounded bg-background/80 border p-1.5" style={{animationDelay:`${i*0.3}s`}}>
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                  <span>{k}</span>
                </div>
              ))}
              <div className="text-[9px] text-muted-foreground italic pl-2">+ 5 more KPIs generating...</div>
            </div>
          </div>
        ),
      },
      {
        caption: "Review AI-generated KPIs with targets, thresholds, and formulas",
        duration: 3000,
        content: () => (
          <div className="space-y-1.5">
            <div className="rounded bg-background/80 border p-2 space-y-1">
              <div className="text-[9px] font-semibold">RevPAR — Revenue</div>
              <div className="grid grid-cols-3 gap-1 text-center">
                <div><div className="text-[8px] text-muted-foreground">Target</div><div className="text-[9px] font-bold text-primary">$85</div></div>
                <div><div className="text-[8px] text-muted-foreground">Green ≥</div><div className="text-[9px] font-bold text-emerald-600">$80</div></div>
                <div><div className="text-[8px] text-muted-foreground">Red &lt;</div><div className="text-[9px] font-bold text-red-500">$70</div></div>
              </div>
              <div className="text-[7px] text-muted-foreground border-t pt-1">Formula: Total Revenue ÷ Available Room Nights</div>
            </div>
            <div className="flex gap-1.5 justify-end">
              <FakeBtn>Skip</FakeBtn>
              <FakeBtn primary>Save All KPIs</FakeBtn>
            </div>
          </div>
        ),
      },
      {
        caption: "KPIs saved instantly — ready to track actuals from day one",
        duration: 2500,
        content: () => (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-2">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
              <div className="text-[9px] text-emerald-700 dark:text-emerald-300 font-medium">8 KPIs created for your company!</div>
            </div>
            {["RevPAR","Occupancy Rate","NPS Score","ADR"].map((k,i)=>(
              <div key={i} className="flex items-center gap-2 text-[9px] rounded bg-background/80 border px-2 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="flex-1">{k}</span>
                <Pill c="bg-muted text-muted-foreground">No actuals yet</Pill>
              </div>
            ))}
          </div>
        ),
      },
    ],
  },

  {
    icon: Target, title: "KPI Management",
    description: "Track actuals against targets with visual RAG status. Import via Excel, filter by department, and monitor trends over time.",
    color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30",
    slides: [
      {
        caption: "All KPIs in a table with department and frequency filters",
        duration: 2800,
        content: () => (
          <div className="space-y-1.5">
            <div className="flex gap-1.5 mb-2">
              <FakeInput value="🔍 Search KPIs..." />
              <div className="text-[9px] px-2 py-1 rounded bg-muted text-muted-foreground border">Revenue ▾</div>
            </div>
            {[
              {n:"RevPAR",t:"$85",a:"$91",s:"bg-emerald-500"},
              {n:"Occupancy",t:"80%",a:"76%",s:"bg-amber-500"},
              {n:"NPS Score",t:"70",a:"65",s:"bg-red-500"},
              {n:"ADR",t:"$120",a:"$124",s:"bg-emerald-500"},
            ].map((r,i)=>(
              <div key={i} className="flex items-center gap-2 bg-background/80 border rounded px-2 py-1">
                <div className={`w-2 h-2 rounded-full ${r.s}`} />
                <span className="text-[9px] flex-1 font-medium">{r.n}</span>
                <span className="text-[8px] text-muted-foreground">T: {r.t}</span>
                <span className="text-[9px] font-bold">{r.a}</span>
              </div>
            ))}
          </div>
        ),
      },
      {
        caption: "Click 'Add Actual' to log this month's performance",
        duration: 2800,
        content: () => (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <div>
                <div className="text-[9px] font-semibold">Occupancy Rate</div>
                <div className="text-[8px] text-muted-foreground">Target: 80% · Last actual: 76%</div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-[9px] text-muted-foreground">Enter March 2026 actual:</div>
              <FakeInput value="79%" active />
              <div className="flex gap-1.5 justify-end">
                <FakeBtn>Cancel</FakeBtn>
                <FakeBtn primary>Save Actual</FakeBtn>
              </div>
            </div>
          </div>
        ),
      },
      {
        caption: "RAG status updates immediately — 79% moves Occupancy to Amber",
        duration: 2800,
        content: () => (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span className="text-[9px] text-emerald-700 dark:text-emerald-300">Occupancy updated — status improved!</span>
            </div>
            {[
              {n:"RevPAR",t:"$85",a:"$91",s:"bg-emerald-500",st:"On Track"},
              {n:"Occupancy",t:"80%",a:"79%",s:"bg-amber-500",st:"Near Miss"},
              {n:"NPS Score",t:"70",a:"65",s:"bg-red-500",st:"Below Target"},
            ].map((r,i)=>(
              <div key={i} className="flex items-center gap-2 bg-background/80 border rounded px-2 py-1">
                <div className={`w-2 h-2 rounded-full ${r.s}`} />
                <span className="text-[9px] flex-1 font-medium">{r.n}</span>
                <span className="text-[8px] text-muted-foreground">{r.a}</span>
                <Pill c={r.s === "bg-emerald-500" ? "bg-emerald-100 text-emerald-700" : r.s === "bg-amber-500" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>{r.st}</Pill>
              </div>
            ))}
          </div>
        ),
      },
    ],
  },

  {
    icon: ListChecks, title: "Action Tracker",
    description: "Link actions to meetings with owners, due dates, priorities, and revised dates. Never lose sight of what needs to get done.",
    color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30",
    slides: [
      {
        caption: "All actions with meeting type, owner, due date and priority",
        duration: 2800,
        content: () => (
          <div className="space-y-1.5">
            <div className="flex gap-1.5 mb-2">
              <div className="flex-1 text-[9px] px-2 py-1 rounded bg-muted text-muted-foreground border">All Meeting Types ▾</div>
            </div>
            {[
              {t:"Update pricing strategy",o:"Ravi M.",d:"Mar 10",m:"Monthly",s:"Overdue",sc:"bg-red-100 text-red-700"},
              {t:"Submit supplier quotes",o:"Pooja S.",d:"Mar 15",m:"Weekly",s:"In Progress",sc:"bg-violet-100 text-violet-700"},
              {t:"Staff training plan",o:"Arjun K.",d:"Mar 20",m:"Monthly",s:"Not Started",sc:"bg-muted text-muted-foreground"},
            ].map((a,i)=>(
              <div key={i} className="bg-background/80 border rounded px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <Pill c="bg-primary/10 text-primary">{a.m}</Pill>
                  <span className="text-[9px] font-medium flex-1 truncate">{a.t}</span>
                  <Pill c={a.sc}>{a.s}</Pill>
                </div>
                <div className="flex gap-3 mt-0.5 text-[8px] text-muted-foreground">
                  <span>{a.o}</span><span>{a.d}</span>
                </div>
              </div>
            ))}
          </div>
        ),
      },
      {
        caption: "Mark an action complete — tracked against the meeting it came from",
        duration: 2800,
        content: () => (
          <div className="space-y-2">
            <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded p-2">
              <div className="text-[9px] font-semibold">Submit supplier quotes</div>
              <div className="text-[8px] text-muted-foreground">Pooja S. · Due Mar 15 · Weekly Ops Meeting</div>
            </div>
            <div className="space-y-1.5">
              <div className="text-[9px] text-muted-foreground">Update status:</div>
              <div className="flex gap-1.5">
                <FakeBtn>In Progress</FakeBtn>
                <FakeBtn primary>✓ Completed</FakeBtn>
              </div>
            </div>
          </div>
        ),
      },
      {
        caption: "Action marked complete — meeting accountability fully tracked",
        duration: 2800,
        content: () => (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span className="text-[9px] text-emerald-700 dark:text-emerald-300">Action completed — 50% of this week's actions done</span>
            </div>
            {[
              {t:"Update pricing strategy",s:"Overdue",sc:"bg-red-100 text-red-700"},
              {t:"Submit supplier quotes",s:"Completed",sc:"bg-emerald-100 text-emerald-700"},
              {t:"Staff training plan",s:"Not Started",sc:"bg-muted text-muted-foreground"},
            ].map((a,i)=>(
              <div key={i} className="flex items-center gap-2 bg-background/80 border rounded px-2 py-1">
                <span className="text-[9px] flex-1 truncate">{a.t}</span>
                <Pill c={a.sc}>{a.s}</Pill>
              </div>
            ))}
          </div>
        ),
      },
    ],
  },

  {
    icon: FileText, title: "AI Monthly Reviews",
    description: "AI-generated performance reviews with strengths, gaps, and actionable recommendations based on your real KPI and action data.",
    color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/30",
    slides: [
      {
        caption: "Click 'Generate Review' and AI analyses all your KPI data",
        duration: 2800,
        content: () => (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[9px] font-semibold">Monthly Reviews</div>
              <FakeBtn primary>✦ Generate Review</FakeBtn>
            </div>
            <div className="flex items-center gap-2 rounded bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 p-2">
              <Sparkles className="h-3 w-3 text-violet-500 animate-pulse shrink-0" />
              <div className="text-[9px] text-violet-700 dark:text-violet-300">Analysing 12 KPIs and 10 actions for February 2026...</div>
            </div>
          </div>
        ),
      },
      {
        caption: "Review generated with strengths, gaps, and recommendations",
        duration: 3200,
        content: () => (
          <div className="space-y-1.5">
            <div className="text-[9px] font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-violet-500" /> February 2026 Performance Review
            </div>
            <div className="text-[8px] text-muted-foreground border-b pb-1.5">Overall performance remains strong. RevPAR exceeded target by 7%, driven by improved weekend demand.</div>
            <div>
              <div className="text-[8px] font-semibold text-emerald-600 mb-0.5">✓ Key Strengths</div>
              <div className="text-[8px] text-muted-foreground">RevPAR $91 vs $85 target · NPS up to 74 from 70</div>
            </div>
            <div>
              <div className="text-[8px] font-semibold text-red-500 mb-0.5">✗ Key Gaps</div>
              <div className="text-[8px] text-muted-foreground">Occupancy 76% — 4% below target · F&B costs elevated</div>
            </div>
            <div>
              <div className="text-[8px] font-semibold text-amber-600 mb-0.5">→ Recommendations</div>
              <div className="text-[8px] text-muted-foreground">Implement dynamic pricing for off-peak occupancy boost</div>
            </div>
          </div>
        ),
      },
    ],
  },

  {
    icon: LayoutTemplate, title: "Dashboard Planner",
    description: "AI designs your ideal Power BI or web dashboard with the right charts, KPIs, and layout — visualised before you build it.",
    color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30",
    slides: [
      {
        caption: "Describe your reporting goals and AI designs the dashboard",
        duration: 2800,
        content: () => (
          <div className="space-y-2">
            <FakeInput value="Executive revenue & operations dashboard" active />
            <div className="flex items-center gap-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2">
              <Sparkles className="h-3 w-3 text-blue-500 animate-pulse shrink-0" />
              <div className="text-[9px] text-blue-700 dark:text-blue-300">Designing optimal layout for your business...</div>
            </div>
          </div>
        ),
      },
      {
        caption: "AI recommends charts, KPIs, and layout for your dashboard",
        duration: 3200,
        content: () => (
          <div className="space-y-1.5">
            <div className="text-[9px] font-semibold flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5 text-blue-500" /> Recommended Dashboard Layout
            </div>
            <div className="grid grid-cols-2 gap-1">
              {[
                {t:"RevPAR Trend",ic:"📈",d:"Line chart, monthly"},
                {t:"KPI Health",ic:"🍩",d:"Donut, RAG status"},
                {t:"Action Progress",ic:"📊",d:"Bar chart by dept"},
                {t:"Dept Summary",ic:"🏢",d:"Table, overdue count"},
              ].map((c,i)=>(
                <div key={i} className="bg-background/80 border rounded p-1.5">
                  <div className="text-[10px] mb-0.5">{c.ic} {c.t}</div>
                  <div className="text-[7px] text-muted-foreground">{c.d}</div>
                </div>
              ))}
            </div>
            <div className="text-[8px] text-muted-foreground">Compatible with Power BI, Tableau, and web dashboards</div>
          </div>
        ),
      },
    ],
  },

  {
    icon: FolderOpen, title: "Project Portfolio",
    description: "All projects in one view with live health scores (Green/Amber/Red), progress bars, priority filters, and quick access.",
    color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30",
    slides: [
      {
        caption: "Portfolio overview: 6 stat cards + project grid with health scores",
        duration: 2800,
        content: () => (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1">
              {[{l:"Total",v:"4"},{l:"Active",v:"2"},{l:"At Risk",v:"1"}].map((s,i)=>(
                <div key={i} className="rounded bg-background/80 border p-1.5 text-center">
                  <div className="text-[12px] font-bold">{s.v}</div>
                  <div className="text-[7px] text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {[
                {n:"Loyalty Program Launch",h:"bg-emerald-500",p:55},
                {n:"Staff Retention Initiative",h:"bg-red-500",p:30},
              ].map((p,i)=>(
                <div key={i} className={`rounded border overflow-hidden`}>
                  <div className={`h-0.5 w-full ${p.h}`} />
                  <div className="p-1.5">
                    <div className="text-[9px] font-medium mb-1">{p.n}</div>
                    <Bar w={`${p.p}%`} c={p.h} />
                    <div className="text-[8px] text-muted-foreground mt-0.5">{p.p}% complete</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        caption: "Filter by health — quickly find At Risk projects that need attention",
        duration: 2800,
        content: () => (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              <div className="text-[9px] px-2 py-1 rounded bg-muted text-muted-foreground border">Status ▾</div>
              <div className="text-[9px] px-2 py-1 rounded bg-red-500 text-white font-medium border">Health: Red ✓</div>
              <div className="text-[9px] px-2 py-1 rounded bg-muted text-muted-foreground border">Priority ▾</div>
            </div>
            <div className="text-[8px] text-muted-foreground">1 project (filtered from 4)</div>
            <div className="rounded border overflow-hidden">
              <div className="h-0.5 w-full bg-red-500" />
              <div className="p-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-semibold">Staff Retention Initiative</span>
                  <Pill c="bg-red-100 text-red-700">At Risk</Pill>
                </div>
                <Bar w="30%" c="bg-red-500" />
                <div className="flex gap-3 mt-1 text-[8px] text-muted-foreground">
                  <span>Owner: Dharmesh</span><span>Due: Mar 31</span><span>3/10 tasks</span>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        caption: "Switch to list view for a compact, scannable project table",
        duration: 2500,
        content: () => (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-[9px] text-muted-foreground flex-1">4 projects</div>
              <div className="flex gap-1 border rounded p-0.5">
                <div className="text-[8px] px-1.5 py-0.5 rounded bg-muted">⊞ Grid</div>
                <div className="text-[8px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground">☰ List</div>
              </div>
            </div>
            {[
              {n:"Loyalty Program Launch",s:"In Progress",p:55,h:"bg-emerald-500"},
              {n:"F&B Menu Overhaul",s:"In Progress",p:40,h:"bg-amber-500"},
              {n:"Staff Retention",s:"At Risk",p:30,h:"bg-red-500"},
              {n:"Q2 Revenue Recovery",s:"Not Started",p:0,h:"bg-muted"},
            ].map((p,i)=>(
              <div key={i} className="flex items-center gap-2 rounded border bg-background/80 px-2 py-1">
                <div className={`w-1 h-5 rounded-full ${p.h}`} />
                <span className="text-[9px] font-medium flex-1 truncate">{p.n}</span>
                <Pill c={p.s==="At Risk"?"bg-red-100 text-red-700":p.s==="In Progress"?"bg-violet-100 text-violet-700":"bg-muted text-muted-foreground"}>{p.s}</Pill>
                <span className="text-[9px] text-muted-foreground w-8 text-right">{p.p}%</span>
              </div>
            ))}
          </div>
        ),
      },
    ],
  },

  {
    icon: LayoutGrid, title: "Project Management",
    description: "List and Kanban board views, task management with subtask checkboxes, milestone calendar, and team comments.",
    color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-900/30",
    slides: [
      {
        caption: "Task list with priority-colored borders and inline status change",
        duration: 2800,
        content: () => (
          <div className="space-y-1.5">
            <div className="flex gap-1.5 mb-1">
              {["Overview","Tasks","Milestones","Comments"].map((t,i)=>(
                <div key={i} className={`text-[8px] px-2 py-0.5 rounded ${i===1?"bg-primary text-primary-foreground":"bg-muted/50 text-muted-foreground"}`}>{t}</div>
              ))}
            </div>
            {[
              {t:"Design loyalty app mockups",p:"border-l-red-500",s:"In Progress",a:"Ravi M."},
              {t:"Backend API integration",p:"border-l-orange-500",s:"Not Started",a:"Pooja S."},
              {t:"User acceptance testing",p:"border-l-blue-500",s:"Not Started",a:"Arjun K."},
            ].map((t,i)=>(
              <div key={i} className={`rounded border-l-4 ${t.p} bg-background/80 border p-2`}>
                <div className="text-[9px] font-semibold mb-0.5">{t.t}</div>
                <div className="flex gap-2 text-[8px] text-muted-foreground">
                  <Pill c={t.s==="In Progress"?"bg-violet-100 text-violet-700":"bg-muted text-muted-foreground"}>{t.s}</Pill>
                  <span className="flex items-center gap-0.5"><Users className="h-2 w-2" />{t.a}</span>
                </div>
              </div>
            ))}
          </div>
        ),
      },
      {
        caption: "Switch to Kanban board view — drag tasks across status columns",
        duration: 2800,
        content: () => (
          <div className="grid grid-cols-3 gap-1.5">
            {[
              {col:"Not Started",c:"bg-muted",tasks:["Backend API","User testing"]},
              {col:"In Progress",c:"bg-violet-100 dark:bg-violet-900/30",tasks:["Design mockups"]},
              {col:"Completed",c:"bg-emerald-100 dark:bg-emerald-900/30",tasks:["Requirements"]},
            ].map((col,i)=>(
              <div key={i} className="space-y-1">
                <div className={`text-[8px] font-semibold px-1.5 py-1 rounded text-center ${col.c}`}>{col.col}</div>
                {col.tasks.map((t,j)=>(
                  <div key={j} className="bg-background/80 border rounded p-1.5">
                    <div className="text-[8px] font-medium">{t}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ),
      },
      {
        caption: "Milestone calendar view — see upcoming checkpoints by month",
        duration: 2800,
        content: () => (
          <div className="space-y-2">
            <div className="flex gap-1.5 mb-1">
              <div className="text-[9px] px-2 py-0.5 rounded bg-muted/50 text-muted-foreground">☰ List</div>
              <div className="text-[9px] px-2 py-0.5 rounded bg-primary text-primary-foreground">📅 Calendar</div>
            </div>
            {[
              {m:"Mar 2026",ms:[{t:"App wireframes approved",s:"Completed",c:"border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"}]},
              {m:"Apr 2026",ms:[{t:"Beta launch to 100 users",s:"Upcoming",c:"border-primary/40 bg-primary/5"},{t:"Payment integration live",s:"In Progress",c:"border-violet-400 bg-violet-50 dark:bg-violet-900/20"}]},
            ].map((mo,i)=>(
              <div key={i}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-semibold text-muted-foreground uppercase w-16 shrink-0">{mo.m}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {mo.ms.map((ms,j)=>(
                  <div key={j} className={`border-l-2 pl-2 py-1 rounded-r ${ms.c} mb-1`}>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[8px] font-medium flex-1">{ms.t}</span>
                      <Pill c={ms.s==="Completed"?"bg-emerald-100 text-emerald-700":ms.s==="In Progress"?"bg-violet-100 text-violet-700":"bg-muted text-muted-foreground"}>{ms.s}</Pill>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ),
      },
    ],
  },

  {
    icon: Users, title: "Team Workload",
    description: "See task distribution across your team. Identify overloaded members and balance workload before deadlines slip.",
    color: "text-cyan-600", bg: "bg-cyan-100 dark:bg-cyan-900/30",
    slides: [
      {
        caption: "Team workload overview — stacked bars show task status per person",
        duration: 2800,
        content: () => (
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-[8px] text-muted-foreground mb-1">
              {[{c:"bg-emerald-500",l:"Done"},{c:"bg-violet-500",l:"Active"},{c:"bg-muted-foreground/30",l:"Queued"},{c:"bg-red-500",l:"Overdue"}].map(l=>(
                <span key={l.l} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-sm ${l.c}`} />{l.l}</span>
              ))}
            </div>
            {[
              {n:"Ravi M.",total:7,done:3,active:2,queued:1,over:1},
              {n:"Pooja S.",total:5,done:4,active:1,queued:0,over:0},
              {n:"Arjun K.",total:4,done:1,active:2,queued:0,over:1},
            ].map((p,i)=>(
              <div key={i} className="rounded border bg-background/80 p-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <Avatar name={p.n} />
                  <span className="text-[9px] font-semibold flex-1">{p.n}</span>
                  <span className="text-[8px] text-muted-foreground">{p.total} tasks</span>
                </div>
                <div className="flex h-2.5 rounded overflow-hidden gap-0.5">
                  <div className="bg-emerald-500 rounded-l" style={{width:`${(p.done/p.total)*100}%`}} />
                  <div className="bg-violet-500" style={{width:`${(p.active/p.total)*100}%`}} />
                  <div className="bg-muted-foreground/25" style={{width:`${(p.queued/p.total)*100}%`}} />
                  {p.over > 0 && <div className="bg-red-500 rounded-r" style={{width:`${(p.over/p.total)*100}%`}} />}
                </div>
              </div>
            ))}
          </div>
        ),
      },
      {
        caption: "Expand any team member to see their individual tasks",
        duration: 2800,
        content: () => (
          <div className="rounded border bg-background/80 p-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <Avatar name="Ravi M." />
              <span className="text-[9px] font-semibold flex-1">Ravi M.</span>
              <span className="text-[8px] text-muted-foreground">7 tasks</span>
            </div>
            <div className="flex h-2 rounded overflow-hidden gap-0.5">
              <div className="bg-emerald-500 rounded-l w-[43%]" />
              <div className="bg-violet-500 w-[29%]" />
              <div className="bg-red-500 rounded-r w-[14%]" />
            </div>
            <div className="border-t pt-2 space-y-1">
              {[
                {t:"Design loyalty mockups",s:"In Progress",d:"Mar 12"},
                {t:"Review vendor proposals",s:"Overdue",d:"Mar 8"},
                {t:"Update Q1 projections",s:"Completed",d:"Mar 5"},
              ].map((t,i)=>(
                <div key={i} className="flex items-center gap-2 text-[8px]">
                  <div className={`w-1.5 h-1.5 rounded-full ${t.s==="Completed"?"bg-emerald-500":t.s==="In Progress"?"bg-violet-500":"bg-red-500"}`} />
                  <span className="flex-1 truncate">{t.t}</span>
                  <span className={t.s==="Overdue"?"text-red-500 font-semibold":"text-muted-foreground"}>{t.d}</span>
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ],
  },

  {
    icon: Search, title: "Global Search",
    description: "Search across all projects, tasks, KPIs, meetings, and actions from a single search bar. Find anything instantly.",
    color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30",
    slides: [
      {
        caption: "Click the search icon in the header — modal opens instantly",
        duration: 2200,
        content: () => (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border bg-background/80 p-2">
              <div className="text-[9px] text-muted-foreground">Performo AI — OYO Hospitality</div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-muted flex items-center justify-center cursor-pointer">
                  <Search className="h-2.5 w-2.5 text-primary" />
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-background/80 p-2">
              <div className="flex items-center gap-2 border-b pb-2">
                <Search className="h-3 w-3 text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground animate-pulse">Search anything — projects, tasks, KPIs...</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        caption: "Type to search — results grouped by category in real time",
        duration: 3000,
        content: () => (
          <div className="rounded-lg border bg-background/80 p-2 space-y-1.5">
            <div className="flex items-center gap-2 border-b pb-1.5">
              <Search className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-medium">loyalty</span>
              <span className="text-[9px] text-primary animate-pulse">|</span>
            </div>
            {[
              {g:"Projects",items:["Loyalty Program Launch → /projects/1"]},
              {g:"Tasks",items:["Design loyalty app mockups","Loyalty card print run"]},
              {g:"KPIs",items:["Loyalty member retention rate"]},
            ].map((g,i)=>(
              <div key={i}>
                <div className="text-[7px] text-muted-foreground font-semibold uppercase mb-0.5 px-1">{g.g}</div>
                {g.items.map((item,j)=>(
                  <div key={j} className="text-[9px] px-2 py-1 rounded hover:bg-muted/50 flex items-center gap-2">
                    <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />{item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ),
      },
      {
        caption: "Click any result to navigate directly to that item",
        duration: 2500,
        content: () => (
          <div className="space-y-1.5">
            <div className="rounded-lg border bg-primary/5 p-2">
              <div className="flex items-center gap-2 mb-1">
                <FolderOpen className="h-3 w-3 text-primary" />
                <span className="text-[9px] font-semibold text-primary">Loyalty Program Launch</span>
              </div>
              <div className="text-[8px] text-muted-foreground">Project · In Progress · 55% complete · Health: Green</div>
            </div>
            <div className="flex items-center gap-2 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-1.5">
              <ArrowRight className="h-2.5 w-2.5 text-emerald-600" />
              <span className="text-[9px] text-emerald-700 dark:text-emerald-300">Navigating to project detail page...</span>
            </div>
          </div>
        ),
      },
    ],
  },

  {
    icon: Building2, title: "Meeting Management",
    description: "Card-based meeting list with linked action items. Every meeting creates accountable actions with owners and due dates.",
    color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30",
    slides: [
      {
        caption: "All meetings in cards — each linked to the actions it created",
        duration: 2800,
        content: () => (
          <div className="space-y-2">
            {[
              {t:"Monthly GM Review",d:"Feb 28",actions:4,done:3,type:"Monthly"},
              {t:"Ops Weekly Standup",d:"Mar 5",actions:6,done:2,type:"Weekly"},
            ].map((m,i)=>(
              <div key={i} className="rounded border bg-background/80 p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[9px] font-semibold">{m.t}</div>
                  <Pill c="bg-primary/10 text-primary">{m.type}</Pill>
                </div>
                <div className="text-[8px] text-muted-foreground mb-1.5">{m.d} · {m.actions} actions</div>
                <div className="flex gap-0.5">
                  {Array.from({length:m.actions}).map((_,j)=>(
                    <div key={j} className={`flex-1 h-1.5 rounded ${j<m.done?"bg-emerald-500":"bg-muted"}`} />
                  ))}
                </div>
                <div className="text-[7px] text-muted-foreground mt-0.5">{m.done}/{m.actions} actions completed</div>
              </div>
            ))}
          </div>
        ),
      },
      {
        caption: "Every action links back to its meeting for full accountability",
        duration: 2800,
        content: () => (
          <div className="space-y-1.5">
            <div className="text-[9px] font-semibold flex items-center gap-1.5">
              Monthly GM Review — Actions
            </div>
            {[
              {t:"Update pricing strategy",o:"Ravi",s:"Overdue",sc:"bg-red-100 text-red-700"},
              {t:"Prepare board presentation",o:"Dharmesh",s:"Completed",sc:"bg-emerald-100 text-emerald-700"},
              {t:"Review F&B P&L",o:"Pooja",s:"In Progress",sc:"bg-violet-100 text-violet-700"},
              {t:"Vendor contract renewal",o:"Arjun",s:"Not Started",sc:"bg-muted text-muted-foreground"},
            ].map((a,i)=>(
              <div key={i} className="flex items-center gap-2 rounded bg-background/80 border px-2 py-1">
                <span className="text-[9px] flex-1 truncate">{a.t}</span>
                <span className="text-[8px] text-muted-foreground">{a.o}</span>
                <Pill c={a.sc}>{a.s}</Pill>
              </div>
            ))}
          </div>
        ),
      },
    ],
  },

  {
    icon: Shield, title: "Role-Based Access",
    description: "Admin and Executive roles. Admins manage everything; Executives get clean read-only views — right information, right person.",
    color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800/50",
    slides: [
      {
        caption: "Admins see everything — create, edit, delete with full control",
        duration: 2800,
        content: () => (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded bg-primary/5 border border-primary/20 px-2 py-1.5">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">DS</div>
              <div className="flex-1">
                <div className="text-[9px] font-semibold">Dharmesh Sheth</div>
                <div className="text-[8px] text-muted-foreground">Admin · OYO Hospitality</div>
              </div>
              <Pill c="bg-primary/10 text-primary">Admin</Pill>
            </div>
            <div className="text-[8px] text-muted-foreground font-semibold">Admin capabilities:</div>
            <div className="grid grid-cols-2 gap-1">
              {["Create KPIs","Log actuals","Manage actions","Create projects","Add tasks","User management","Edit settings","Generate reviews"].map((f,i)=>(
                <div key={i} className="flex items-center gap-1 text-[8px]">
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />{f}
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        caption: "Executives see clean read-only dashboards — no clutter, just insights",
        duration: 2800,
        content: () => (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded bg-muted/50 border px-2 py-1.5">
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold">RM</div>
              <div className="flex-1">
                <div className="text-[9px] font-semibold">Ravi Mehta</div>
                <div className="text-[8px] text-muted-foreground">Executive · OYO Hospitality</div>
              </div>
              <Pill>Executive</Pill>
            </div>
            <div className="text-[8px] text-muted-foreground font-semibold">Executive view:</div>
            <div className="space-y-1">
              {[
                {f:"View KPI dashboard",y:true},
                {f:"View project portfolio",y:true},
                {f:"Read monthly reviews",y:true},
                {f:"Post comments",y:true},
                {f:"Edit KPIs or projects",y:false},
                {f:"Manage users",y:false},
              ].map((f,i)=>(
                <div key={i} className="flex items-center gap-1.5 text-[8px]">
                  {f.y
                    ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                    : <X className="h-2.5 w-2.5 text-red-400 shrink-0" />}
                  <span className={f.y?"":"text-muted-foreground line-through"}>{f.f}</span>
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ],
  },
];

/* ───────────── Animated Demo Player ───────────── */
function DemoPlayer({ feature, onClose }: { feature: FeatureDef; onClose: () => void }) {
  const [slide, setSlide] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tick = 50;

  const currentSlide = feature.slides[slide];
  const totalSlides = feature.slides.length;

  const goToSlide = useCallback((idx: number) => {
    setVisible(false);
    setTimeout(() => {
      setSlide(idx);
      setProgress(0);
      setVisible(true);
    }, 200);
  }, []);

  const advance = useCallback(() => {
    const next = slide + 1;
    if (next < totalSlides) goToSlide(next);
    else goToSlide(0);
  }, [slide, totalSlides, goToSlide]);

  useEffect(() => {
    if (!playing) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    const step = (tick / currentSlide.duration) * 100;
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p + step >= 100) { advance(); return 0; }
        return p + step;
      });
    }, tick);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, currentSlide.duration, advance, tick]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${feature.bg} shrink-0`}>
          <feature.icon className={`h-4 w-4 ${feature.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{feature.title}</div>
          <div className="text-xs text-muted-foreground">Interactive demo</div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Demo area */}
      <div className="flex-1 overflow-hidden bg-muted/20 relative flex items-center justify-center p-4">
        {/* Phone/App frame */}
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border-2 border-border bg-card shadow-xl overflow-hidden">
            {/* Fake browser chrome */}
            <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/30">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
              <div className="flex-1 mx-2 h-4 rounded bg-muted/60 flex items-center px-2">
                <div className="text-[8px] text-muted-foreground">performo.ai</div>
              </div>
            </div>
            {/* Slide content */}
            <div
              className="p-4 min-h-[260px] transition-opacity duration-200"
              style={{ opacity: visible ? 1 : 0 }}
            >
              <currentSlide.content />
            </div>
          </div>
        </div>
      </div>

      {/* Caption */}
      <div
        className="px-4 py-3 border-t border-b bg-muted/10 text-center min-h-[52px] flex items-center justify-center transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <p className="text-sm text-muted-foreground leading-snug">{currentSlide.caption}</p>
      </div>

      {/* Controls + progress */}
      <div className="px-4 py-3 shrink-0">
        {/* Slide dots */}
        <div className="flex items-center gap-2 justify-center mb-3">
          {feature.slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setPlaying(false); goToSlide(i); }}
              className={`rounded-full transition-all ${i === slide ? "w-6 h-2 bg-primary" : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"}`}
              data-testid={`button-demo-slide-${i}`}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-muted mb-3 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-none"
            style={{ width: `${((slide / totalSlides) + (progress / 100 / totalSlides)) * 100}%` }}
          />
        </div>

        {/* Play/Pause + nav */}
        <div className="flex items-center gap-2 justify-center">
          <button
            onClick={() => { if (slide > 0) { setPlaying(false); goToSlide(slide - 1); } }}
            disabled={slide === 0}
            className="p-1.5 rounded-full hover:bg-muted disabled:opacity-30 transition-colors text-sm"
          >
            ←
          </button>
          <button
            onClick={() => setPlaying(!playing)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
            data-testid="button-demo-play-pause"
          >
            {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
          </button>
          <button
            onClick={() => { setPlaying(false); advance(); }}
            disabled={slide === totalSlides - 1}
            className="p-1.5 rounded-full hover:bg-muted disabled:opacity-30 transition-colors text-sm"
          >
            →
          </button>
        </div>

        <div className="text-center text-xs text-muted-foreground mt-2">
          {slide + 1} / {totalSlides} · {playing ? "Playing" : "Paused"}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Feature card with click-to-demo ───────────── */
function FeatureVideoCard({ feature, index }: { feature: FeatureDef; index: number }) {
  const [open, setOpen] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewSlide, setPreviewSlide] = useState(0);
  const previewRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (previewPlaying) {
      previewRef.current = setInterval(() => {
        setPreviewSlide(s => (s + 1) % feature.slides.length);
      }, 2000);
    } else {
      if (previewRef.current) clearInterval(previewRef.current);
    }
    return () => { if (previewRef.current) clearInterval(previewRef.current); };
  }, [previewPlaying, feature.slides.length]);

  const PreviewSlide = feature.slides[previewSlide].content;

  return (
    <>
      <Card
        className="group cursor-pointer hover:shadow-lg transition-all hover:border-primary/30 overflow-hidden flex flex-col"
        data-testid={`card-feature-video-${index}`}
      >
        {/* Thumbnail */}
        <div
          className="relative bg-muted/30 border-b overflow-hidden flex-shrink-0"
          style={{ aspectRatio: "16/9" }}
          onMouseEnter={() => setPreviewPlaying(true)}
          onMouseLeave={() => { setPreviewPlaying(false); setPreviewSlide(0); }}
          onClick={() => setOpen(true)}
        >
          {/* Live preview */}
          <div className="absolute inset-0 scale-[0.52] origin-top-left w-[192%] h-[192%] pointer-events-none overflow-hidden bg-card">
            <div className="p-4 min-h-full">
              <div className="transition-opacity duration-300" style={{ opacity: previewPlaying ? 1 : 0.85 }}>
                <PreviewSlide />
              </div>
            </div>
          </div>

          {/* Overlay with play button */}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/95 shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="h-5 w-5 text-primary ml-0.5" fill="currentColor" />
            </div>
          </div>

          {/* Hover hint */}
          <div className="absolute bottom-2 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] bg-black/70 text-white px-2 py-0.5 rounded-full">Click to play demo</span>
          </div>
        </div>

        {/* Card body */}
        <CardContent className="p-4 flex-1" onClick={() => setOpen(true)}>
          <div className="flex items-start gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${feature.bg} shrink-0`}>
              <feature.icon className={`h-4 w-4 ${feature.color}`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-primary font-medium group-hover:gap-2 transition-all">
            <Play className="h-3 w-3" fill="currentColor" /> Watch demo
            <ChevronRight className="h-3 w-3" />
          </div>
        </CardContent>
      </Card>

      {/* Full demo modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden h-[90vh] flex flex-col">
          <DialogTitle className="sr-only">{feature.title} Demo</DialogTitle>
          <DemoPlayer feature={feature} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ───────────── Auth Dialog ───────────── */
function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) await login(email, password);
      else await register(name, email, password);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">{isLogin ? "Sign In" : "Create Account"}</DialogTitle>
        <div className="flex justify-center mb-2 pt-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-sm">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold" data-testid="text-auth-title">
            {isLogin ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? "Sign in to your Performo AI account" : "Get started with Performo AI"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-1">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required={!isLogin} data-testid="input-name" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required data-testid="input-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required data-testid="input-password" />
          </div>
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
        <div className="text-center mt-2">
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setIsLogin(!isLogin)} data-testid="button-toggle-auth">
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </Button>
        </div>
        {isLogin && (
          <div className="text-center space-y-1 pb-2">
            <p className="text-xs text-muted-foreground">Admin: demo@performo.ai / demo123</p>
            <p className="text-xs text-muted-foreground">Executive: exec@performo.ai / exec123</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────────── Landing Page ───────────── */
export default function AuthPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
              <BarChart3 className="h-[18px] w-[18px] text-primary-foreground" />
            </div>
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
            <Button size="sm" onClick={() => setAuthOpen(true)} data-testid="button-nav-get-started">
              Get Started <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
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
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-xs font-medium" data-testid="badge-hero-tag">
              <Sparkles className="h-3 w-3 mr-1.5" /> Powered by GPT-4o
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6" data-testid="text-hero-title">
              Performance &amp; Execution
              <span className="block text-primary">Management for SMEs</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed" data-testid="text-hero-subtitle">
              AI-powered KPIs, project tracking, workload visibility, and monthly reviews — all in one platform built for growing businesses.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 h-12 shadow-md" onClick={() => setAuthOpen(true)} data-testid="button-hero-get-started">
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12" onClick={() => document.getElementById("demos")?.scrollIntoView({ behavior: "smooth" })} data-testid="button-hero-watch-demos">
                <Play className="h-4 w-4 mr-2" fill="currentColor" /> Watch Demos
              </Button>
            </div>
          </div>

          {/* Hero mockup */}
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="rounded-2xl border bg-card/80 backdrop-blur shadow-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                  <div className="w-3 h-3 rounded-full bg-green-400/70" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">Performo AI — OYO Hospitality</span>
              </div>
              <div className="p-6 md:p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Total KPIs", value: "12", change: "+3 this month", color: "text-primary" },
                    { label: "On Track", value: "8", change: "67% of total", color: "text-emerald-600" },
                    { label: "Active Projects", value: "3", change: "1 at risk", color: "text-violet-600" },
                    { label: "Actions Due", value: "5", change: "2 overdue", color: "text-amber-600" },
                  ].map((stat, i) => (
                    <div key={i} className="rounded-xl border bg-background p-4">
                      <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{stat.change}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 rounded-xl border bg-background p-4">
                    <p className="text-xs font-medium mb-3">KPI Performance Trend</p>
                    <div className="flex items-end gap-1 h-24">
                      {[40,55,45,65,60,75,70,85,80,90,85,92].map((h,i) => (
                        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: h >= 70 ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }} />
                      ))}
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">Jan</span>
                      <span className="text-[10px] text-muted-foreground">Dec</span>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-background p-4">
                    <p className="text-xs font-medium mb-3">Project Health</p>
                    <div className="space-y-2.5">
                      {[
                        { label: "Loyalty Launch", dot: "bg-emerald-500", pct: 55 },
                        { label: "Menu Overhaul", dot: "bg-amber-500", pct: 40 },
                        { label: "Staff Retention", dot: "bg-red-500", pct: 30 },
                      ].map((item, i) => (
                        <div key={i}>
                          <div className="flex items-center gap-2 text-[11px] mb-1">
                            <div className={`w-2 h-2 rounded-full ${item.dot}`} />
                            <span className="text-muted-foreground flex-1 truncate">{item.label}</span>
                            <span className="font-medium">{item.pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary/60" style={{ width: `${item.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
            {[
              { value: "12", label: "Core Features", sub: "Performance + Execution" },
              { value: "GPT-4o", label: "AI Engine", sub: "Latest OpenAI model" },
              { value: "2", label: "User Roles", sub: "Admin & Executive" },
              { value: "100%", label: "Data Privacy", sub: "Your data, your platform" },
            ].map((stat, i) => (
              <div key={i} className="text-center" data-testid={`stat-${i}`}>
                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</p>
                <p className="text-sm font-medium">{stat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Videos Section */}
      <section id="demos" className="py-20 md:py-28 bg-muted/20 border-y">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
              <Play className="h-3 w-3 mr-1.5" fill="currentColor" /> Interactive Demos
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-demos-title">
              See every feature
              <span className="text-primary"> in action</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Click any card to watch an animated walkthrough of that feature. Hover to preview.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {FEATURES.map((feature, i) => (
              <FeatureVideoCard key={i} feature={feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Features list */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-features-title">
              Everything you need to
              <span className="text-primary"> manage performance &amp; execution</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { heading: "Performance Management", items: FEATURES.slice(0, 6) },
              { heading: "Execution Management", items: FEATURES.slice(6, 12) },
            ].map(({ heading, items }) => (
              <div key={heading}>
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{heading}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-3">
                  {items.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:border-primary/20 transition-colors">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${f.bg} shrink-0`}>
                        <f.icon className={`h-4 w-4 ${f.color}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold mb-1">{f.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-28 bg-muted/20 border-y">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-how-title">
              Up and running in <span className="text-primary">minutes</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">No complex setup. Just smart AI that understands your business from day one.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
            {[
              { step: "01", title: "Set Up Profile", desc: "Enter company, industry, and departments. Invite your team instantly." },
              { step: "02", title: "Generate KPIs", desc: "GPT-4o creates industry-specific KPIs with targets, thresholds, and formulas." },
              { step: "03", title: "Run Meetings", desc: "Log meeting actions with owners and due dates — all linked for accountability." },
              { step: "04", title: "Track Projects", desc: "Create projects, assign tasks, set milestones, and monitor health scores." },
              { step: "05", title: "Get AI Reviews", desc: "Monthly AI reviews surface strengths, gaps, and recommendations from real data." },
            ].map((step, i) => (
              <div key={i} className="relative text-center" data-testid={`step-${i}`}>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold mx-auto mb-4 shadow-md">
                  {step.step}
                </div>
                {i < 4 && <div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-border" />}
                <h3 className="text-sm font-semibold mb-2">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Performo */}
      <section id="why" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">Why Performo</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-why-title">Built for growing businesses</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Zap, title: "No BI Tool Required", desc: "Get executive-level insights without Power BI, Tableau, or data analysts.", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
              { icon: Shield, title: "Industry-Specific AI", desc: "AI tuned for hospitality, retail, healthcare, F&B, and more. KPIs that make sense from day one.", color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
              { icon: TrendingUp, title: "Performance + Execution", desc: "The only platform connecting KPI tracking with project execution — goal to result, all in one place.", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
              { icon: Activity, title: "Live Health Scoring", desc: "Automated RAG scoring for KPIs and projects. Always know what needs attention.", color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
              { icon: Users, title: "Team Accountability", desc: "Every action has an owner. Every project has milestones. Nothing falls through the cracks.", color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/30" },
              { icon: CheckCircle2, title: "Meeting-to-Action Bridge", desc: "Turn every meeting into accountable actions. Track from boardroom to completion.", color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-900/30" },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-start p-6 rounded-2xl border bg-card hover:border-primary/20 transition-colors" data-testid={`card-benefit-${i}`}>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.bg} mb-4`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
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
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-cta-title">
            Ready to transform your performance management?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Join SMEs using Performo AI to track KPIs, manage projects, and get AI-powered insights.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" className="text-base px-8 h-12 shadow-md" onClick={() => setAuthOpen(true)} data-testid="button-cta-start">
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-sm opacity-70">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BarChart3 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">Performo AI</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            {["Demo Videos","Features","How It Works","Why Performo"].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`} className="hover:text-foreground transition-colors">{l}</a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">AI-powered performance management for SMEs</p>
        </div>
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
