import { useState, useEffect, useRef } from "react";
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
  Calendar, Settings, Home, Star, ChevronLeft, Loader2, ExternalLink,
} from "lucide-react";

/* ──────────────────────────────────────────────────────
   NAV ITEMS (used in card thumbnail sidebar preview)
────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { icon: Home,          label: "Dashboard",        key: "dashboard" },
  { icon: Star,          label: "KPI Management",   key: "kpis" },
  { icon: ListChecks,    label: "Action Tracker",   key: "actions" },
  { icon: Building2,     label: "Meetings",         key: "meetings" },
  { icon: FileText,      label: "Monthly Reviews",  key: "reviews" },
  { icon: LayoutTemplate,label: "Dashboard Planner",key: "planner" },
  { icon: FolderOpen,    label: "Portfolio",        key: "portfolio" },
  { icon: LayoutGrid,    label: "Workload",         key: "workload" },
  { icon: Settings,      label: "Settings",         key: "settings" },
];

/* ──────────────────────────────────────────────────────
   THUMBNAIL PREVIEW CONTENT — static mini-screenshots
   for the card hover previews only (not the modal)
────────────────────────────────────────────────────── */

function DashboardPreview() {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-3">
        <div className="text-[8px] font-bold mb-1">Good morning, Dharmesh 👋</div>
        <div className="flex gap-2 text-[7px]">
          <span className="text-emerald-600 font-medium">● 8 KPIs on track</span>
          <span className="text-red-500 font-medium">● 1 overdue</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {[["10","KPIs","text-primary"],["6","Actions","text-orange-500"],["4","Projects","text-violet-600"]].map(([v,l,c])=>(
          <div key={l} className="rounded border bg-card p-1.5 text-center">
            <div className={`text-sm font-bold ${c}`}>{v}</div>
            <div className="text-[7px] text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {[["Loyalty Launch",55,"bg-emerald-500"],["Menu Overhaul",40,"bg-amber-500"]].map(([n,p,c])=>(
          <div key={String(n)} className="rounded border bg-card p-1.5">
            <div className="text-[7px] font-medium truncate mb-1">{n}</div>
            <div className="h-1 rounded-full bg-muted overflow-hidden"><div className={`h-full ${c}`} style={{width:`${p}%`}} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiPreview() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[8px] font-semibold">KPI Management</div>
        <div className="text-[6px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Sparkles className="h-2 w-2"/>AI Generate</div>
      </div>
      {[["Occupancy Rate","78%","85%","bg-amber-500"],["ADR","$192","$180","bg-emerald-500"],["RevPAR","$157","$153","bg-emerald-500"],["Guest Complaint","3.2","≤2","bg-red-500"],["Staff Turnover","22%","18%","bg-red-500"]].map(([n,a,t,c])=>(
        <div key={String(n)} className="flex items-center gap-1.5 rounded border bg-card px-2 py-1">
          <div className={`w-1.5 h-1.5 rounded-full ${c} shrink-0`}/>
          <div className="flex-1 text-[7px] font-medium truncate">{n}</div>
          <div className="text-[7px] font-semibold">{a}</div>
          <div className="text-[6px] text-muted-foreground">/&nbsp;{t}</div>
        </div>
      ))}
    </div>
  );
}

function PortfolioPreview() {
  return (
    <div className="space-y-1.5">
      <div className="text-[8px] font-semibold mb-1">Project Portfolio</div>
      {[["Loyalty Program Launch","bg-emerald-500",55,"In Progress"],["F&B Menu Overhaul","bg-amber-500",40,"In Progress"],["Staff Retention Initiative","bg-emerald-500",30,"In Progress"],["Q2 Revenue Recovery","bg-amber-500",0,"Not Started"]].map(([n,c,p,s])=>(
        <div key={String(n)} className="rounded border overflow-hidden bg-card">
          <div className={`h-0.5 w-full ${c}`}/>
          <div className="p-1.5">
            <div className="text-[7px] font-medium truncate mb-1">{n}</div>
            <div className="h-1 rounded-full bg-muted overflow-hidden"><div className={`h-full ${c}`} style={{width:`${p}%`}}/></div>
            <div className="text-[6px] text-muted-foreground mt-0.5">{p}% · {s}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkloadPreview() {
  return (
    <div className="space-y-1.5">
      <div className="text-[8px] font-semibold mb-1">Team Workload</div>
      {[["Ravi M.",7,3,2,1,1],["Pooja S.",5,4,1,0,0],["Omar K.",3,0,2,0,1],["Fatima A.",2,0,2,0,0]].map(([n,total,done,active,queued,over])=>(
        <div key={String(n)} className="rounded border bg-card p-1.5">
          <div className="flex items-center gap-1 mb-1">
            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[5px] font-bold text-primary">{String(n).split(" ").map((x:string)=>x[0]).join("")}</div>
            <div className="text-[7px] font-medium">{n}</div>
            <div className="ml-auto text-[6px] text-muted-foreground">{total} tasks</div>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            <div className="bg-emerald-500" style={{width:`${((done as number)/(total as number))*100}%`}}/>
            <div className="bg-violet-500" style={{width:`${((active as number)/(total as number))*100}%`}}/>
            {(queued as number) > 0 && <div className="bg-muted-foreground/25" style={{width:`${((queued as number)/(total as number))*100}%`}}/>}
            {(over as number) > 0 && <div className="bg-red-500" style={{width:`${((over as number)/(total as number))*100}%`}}/>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionsPreview() {
  return (
    <div className="space-y-1.5">
      <div className="text-[8px] font-semibold mb-1">Action Tracker</div>
      {[["Implement guest feedback system","Sarah Johnson","In Progress"],["Launch loyalty campaign","Omar Khalil","Delayed"],["Optimize housekeeping schedule","David Park","Completed"],["Staff retention interviews","Fatima Al Rashid","In Progress"],["Review F&B menu pricing","Michael Chen","Not Started"]].map(([t,o,s])=>(
        <div key={String(t)} className="rounded border bg-card px-2 py-1">
          <div className="text-[7px] font-medium truncate">{t}</div>
          <div className="flex justify-between mt-0.5">
            <div className="text-[6px] text-muted-foreground">{o}</div>
            <div className={`text-[6px] font-medium ${s==="Completed"?"text-emerald-600":s==="Delayed"?"text-red-500":s==="In Progress"?"text-violet-600":"text-muted-foreground"}`}>{s}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewsPreview() {
  return (
    <div className="space-y-2">
      <div className="text-[8px] font-semibold mb-1">Monthly Reviews</div>
      <div className="rounded border bg-violet-50 dark:bg-violet-900/20 border-violet-200 p-2">
        <div className="flex items-center gap-1 mb-1.5"><Sparkles className="h-2.5 w-2.5 text-violet-600"/><span className="text-[7px] font-medium text-violet-700">AI Review — February 2026</span></div>
        <div className="text-[6.5px] text-muted-foreground leading-relaxed">February showed mixed results. Revenue metrics exceeded targets with strong ADR performance...</div>
      </div>
      {[["Strengths","bg-emerald-500","ADR $192 vs $180 · RevPAR $157 vs $153"],["Gaps","bg-red-500","Complaints 3.2 vs 2.0 · Turnover 22% vs 18%"],["Actions","bg-amber-500","Retention bonuses approved · F&B training"]].map(([l,c,d])=>(
        <div key={String(l)} className="flex gap-1.5 items-start">
          <div className={`w-1.5 h-1.5 rounded-full ${c} shrink-0 mt-0.5`}/>
          <div>
            <div className="text-[7px] font-semibold">{l}</div>
            <div className="text-[6px] text-muted-foreground">{d}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MeetingsPreview() {
  return (
    <div className="space-y-1.5">
      <div className="text-[8px] font-semibold mb-1">Meetings</div>
      {[["CEO Monthly","Mar 15, 2026","3 actions","text-primary"],["Finance Committee","Mar 12, 2026","2 actions","text-emerald-600"],["PMO Steering","Mar 10, 2026","2 actions","text-violet-600"],["Department Review","Mar 5, 2026","3 actions","text-orange-600"]].map(([t,d,a,c])=>(
        <div key={String(t)} className="rounded border bg-card px-2 py-1.5">
          <div className="flex items-center justify-between">
            <div className="text-[7px] font-semibold">{t}</div>
            <div className={`text-[6px] font-medium ${c}`}>{a}</div>
          </div>
          <div className="text-[6px] text-muted-foreground mt-0.5">{d}</div>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   FEATURE DEFINITIONS
────────────────────────────────────────────────────── */
type TourStep = { title: string; description: string };

type FeatureDef = {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bg: string;
  path: string;
  activeKey: string;
  preview: () => JSX.Element;
  tourSteps: TourStep[];
};

const FEATURES: FeatureDef[] = [
  {
    icon: LineChart, title: "Live Dashboard", color: "text-primary", bg: "bg-primary/10", path: "/", activeKey: "dashboard",
    description: "Welcome banner, KPI health donut, action progress, execution stats — all live.",
    preview: DashboardPreview,
    tourSteps: [
      { title: "Welcome Banner", description: "Personalised greeting with today's date, company name, and a live summary of KPIs on track vs. at risk." },
      { title: "KPI Stat Cards", description: "Four headline cards: Total KPIs, On Track, Below Target, and Total Actions — updated in real time as data is entered." },
      { title: "KPI Health Donut", description: "Visual breakdown of your KPI portfolio: Green (on track), Amber (at risk), Red (below target) with counts." },
      { title: "Execution Overview", description: "Live project health tiles showing progress bars and RAG colour — scroll down to see all active projects." },
    ],
  },
  {
    icon: Sparkles, title: "AI KPI Generator", color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/30", path: "/kpis", activeKey: "kpis",
    description: "Generate industry KPIs instantly with GPT-4o. Targets, thresholds, and formulas included.",
    preview: KpiPreview,
    tourSteps: [
      { title: "Click 'AI Generate'", description: "Press the purple 'AI Generate' button at the top-right of the KPI Management page." },
      { title: "GPT-4o at Work", description: "The AI reads your company profile, industry, and goals, then generates 6–10 relevant KPIs with targets and thresholds." },
      { title: "Review & Save", description: "Each generated KPI shows its formula, owner suggestion, and RAG thresholds — edit any field before saving." },
    ],
  },
  {
    icon: Target, title: "KPI Management", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", path: "/kpis", activeKey: "kpis",
    description: "Track actuals against targets with live RAG status. Never miss a performance gap.",
    preview: KpiPreview,
    tourSteps: [
      { title: "KPI Table", description: "All KPIs in one table — name, target, latest actual, and live RAG status dot (Green/Amber/Red)." },
      { title: "Filter by Department", description: "Use the 'All Departments' dropdown to filter KPIs by Sales, Operations, HR, Finance, or any custom department." },
      { title: "Log an Actual", description: "Click any KPI row → Log Actual → enter the value → status updates to Green, Amber, or Red instantly." },
    ],
  },
  {
    icon: ListChecks, title: "Action Tracker", color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30", path: "/actions", activeKey: "actions",
    description: "Meeting actions with owners, due dates, and status. Full accountability from board to team.",
    preview: ActionsPreview,
    tourSteps: [
      { title: "All Actions Listed", description: "Every action from every meeting — owner, due date, priority, and status in one scrollable table." },
      { title: "Filter by Meeting Type", description: "Filter actions by CEO Meeting, Finance Committee, Department Review, or PMO Steering to focus on one meeting's items." },
      { title: "Update Status", description: "Click any action to update status: Not Started → In Progress → Completed. Delayed status auto-flags overdue items in red." },
    ],
  },
  {
    icon: FileText, title: "AI Monthly Reviews", color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/30", path: "/reviews", activeKey: "reviews",
    description: "AI-generated reviews with real KPI data — strengths, gaps, and recommendations.",
    preview: ReviewsPreview,
    tourSteps: [
      { title: "Generate Review", description: "Click 'Generate AI Review' — GPT-4o reads all KPI actuals and meeting actions for the selected month." },
      { title: "Strengths & Gaps", description: "The AI writes a structured report: overall summary, specific strengths (with numbers), key gaps, and recommendations." },
      { title: "Review History", description: "Past monthly reviews are saved and accessible — compare February vs March performance side by side." },
    ],
  },
  {
    icon: LayoutTemplate, title: "Dashboard Planner", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", path: "/planner", activeKey: "planner",
    description: "AI designs your ideal Power BI dashboard layout — charts, KPIs, and page structure.",
    preview: DashboardPreview,
    tourSteps: [
      { title: "Describe Your Goals", description: "Tell the AI your reporting goals — e.g. 'I need a CEO dashboard showing revenue KPIs and project status'." },
      { title: "AI Layout Design", description: "GPT-4o recommends which chart types to use (line, donut, bar, table) and where to place each KPI for your audience." },
      { title: "Power BI Ready", description: "The output maps directly to Power BI — with field names, chart config, and page layout details ready to implement." },
    ],
  },
  {
    icon: FolderOpen, title: "Project Portfolio", color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30", path: "/portfolio", activeKey: "portfolio",
    description: "All projects with live health scores (Green/Amber/Red), filters, and progress bars.",
    preview: PortfolioPreview,
    tourSteps: [
      { title: "Portfolio Summary Cards", description: "Six stat tiles at the top: Total, Active, Completed, At Risk, Overdue Tasks, and Upcoming Milestones." },
      { title: "Project Cards / Table", description: "Toggle between card and table view — each project shows health colour, owner, priority, progress bar, and task counts." },
      { title: "Health Scoring", description: "Red = overdue or blocked. Amber = behind or low progress. Green = on track. Scores update automatically as tasks change." },
    ],
  },
  {
    icon: LayoutGrid, title: "Project Management", color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-900/30", path: "/portfolio", activeKey: "portfolio",
    description: "Task list and Kanban board, priority colour borders, milestone calendar inside each project.",
    preview: PortfolioPreview,
    tourSteps: [
      { title: "Click Into a Project", description: "Click any project card → opens the project detail page with Overview, Tasks, Milestones, and Comments tabs." },
      { title: "Task Board", description: "Tasks shown with colour-coded priority borders (red=Critical, orange=High, blue=Medium). Toggle between List and Kanban view." },
      { title: "Milestone Calendar", description: "Milestones tab shows all checkpoints in a calendar view — see what's due this month across all your projects." },
    ],
  },
  {
    icon: Users, title: "Team Workload", color: "text-cyan-600", bg: "bg-cyan-100 dark:bg-cyan-900/30", path: "/workload", activeKey: "workload",
    description: "Stacked bar per person — Done, Active, Queued, Overdue — identify overload instantly.",
    preview: WorkloadPreview,
    tourSteps: [
      { title: "Team Overview Stats", description: "Top summary: total team members, total tasks, overdue tasks, and overall completion rate across all members." },
      { title: "Stacked Workload Bars", description: "Each team member has a colour-coded bar: Green=Done, Violet=Active, Grey=Queued, Red=Overdue. Spot overload at a glance." },
      { title: "Expand Any Member", description: "Click a member's row to expand and see all their individual tasks with due dates, project names, and overdue highlights." },
    ],
  },
  {
    icon: Search, title: "Global Search", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", path: "/", activeKey: "dashboard",
    description: "Search all projects, tasks, KPIs, meetings, and actions from one bar. Find anything instantly.",
    preview: DashboardPreview,
    tourSteps: [
      { title: "Open Search", description: "Click the Search bar in the top navigation or press Ctrl+K / Cmd+K from anywhere in the app." },
      { title: "Search Anything", description: "Type any keyword — project name, task title, KPI name, or action owner. All data is searched simultaneously." },
      { title: "Grouped Results", description: "Results are grouped by type: Projects, Tasks, KPIs, Meetings, Actions. Click any result to navigate directly to that item." },
    ],
  },
  {
    icon: Building2, title: "Meeting Management", color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30", path: "/meetings", activeKey: "meetings",
    description: "Card-based meeting log linked to action items. Every meeting drives accountable outcomes.",
    preview: MeetingsPreview,
    tourSteps: [
      { title: "Meeting Cards", description: "Each meeting logged as a card: type (CEO, Finance, PMO), date, attendees, and number of actions raised." },
      { title: "Action Items Linked", description: "Click a meeting to see all its action items — each with owner, due date, and status. Actions sync with the Action Tracker." },
      { title: "Log a Meeting", description: "Click 'Log Meeting' → choose type, enter date and notes, then add action items for each decision made." },
    ],
  },
  {
    icon: Shield, title: "Role-Based Access", color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800/50", path: "/settings", activeKey: "settings",
    description: "Admin and Executive roles. Full control vs clean read-only — right access, right person.",
    preview: DashboardPreview,
    tourSteps: [
      { title: "Admin Role", description: "Admins have full access: create KPIs, log actuals, manage projects, add tasks, run meetings, generate AI reviews." },
      { title: "Executive Role", description: "Executives see clean read-only views — same data, no edit buttons, no clutter. Log in as exec@performo.ai / exec123 to see this." },
      { title: "Manage Users", description: "Settings → Users: invite team members by email and assign them Admin or Executive role instantly." },
    ],
  },
];

/* ──────────────────────────────────────────────────────
   DEMO PLAYER — full-page live iframe + tour guide
────────────────────────────────────────────────────── */
type LoginState = "loading" | "ready" | "error";

function DemoPlayer({ feature, onClose }: { feature: FeatureDef; onClose: () => void }) {
  const [loginState, setLoginState] = useState<LoginState>("loading");
  const [step, setStep] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: "demo@performo.ai", password: "demo123" }),
    })
      .then(r => setLoginState(r.ok ? "ready" : "error"))
      .catch(() => setLoginState("error"));
  }, []);

  const totalSteps = feature.tourSteps.length;
  const currentStep = feature.tourSteps[step];

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ── Modal header ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b bg-background shrink-0">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${feature.bg} shrink-0`}>
          <feature.icon className={`h-4 w-4 ${feature.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{feature.title}</div>
          <div className="text-xs text-muted-foreground">Live demo · OYO Hospitality · real data</div>
        </div>
        <a
          href={feature.path}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open full screen
        </a>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Full-height iframe ── */}
      <div className="relative flex-1 min-h-0 bg-muted/10">
        {loginState === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading live demo…</p>
          </div>
        )}
        {loginState === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground">Could not connect. <button className="text-primary underline" onClick={() => { setLoginState("loading"); fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ email: "demo@performo.ai", password: "demo123" }) }).then(r => setLoginState(r.ok ? "ready" : "error")).catch(() => setLoginState("error")); }}>Retry</button></p>
          </div>
        )}
        {loginState === "ready" && (
          <iframe
            ref={iframeRef}
            src={feature.path}
            className="w-full h-full border-0"
            title={`${feature.title} live demo`}
            style={{ display: "block" }}
          />
        )}
      </div>

      {/* ── Tour guide strip ── */}
      <div className="shrink-0 border-t bg-muted/20 px-5 py-3">
        <div className="flex items-start gap-4">
          {/* Step content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Step {step + 1} of {totalSteps}
              </span>
              <span className="text-xs font-semibold text-foreground">{currentStep.title}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{currentStep.description}</p>
          </div>
          {/* Navigation */}
          <div className="flex items-center gap-2 shrink-0 mt-1">
            {/* Dot indicators */}
            <div className="flex gap-1 mr-2">
              {feature.tourSteps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`rounded-full transition-all h-2 ${i === step ? "w-5 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"}`}
                  data-testid={`button-tour-step-${i}`}
                />
              ))}
            </div>
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="h-8 w-8 rounded-full border flex items-center justify-center text-sm disabled:opacity-30 hover:bg-muted transition-colors"
              data-testid="button-tour-prev"
            >
              ←
            </button>
            <button
              onClick={() => setStep(s => Math.min(totalSteps - 1, s + 1))}
              disabled={step === totalSteps - 1}
              className="h-8 w-8 rounded-full border flex items-center justify-center text-sm disabled:opacity-30 hover:bg-muted transition-colors"
              data-testid="button-tour-next"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   FEATURE VIDEO CARD — thumbnail card that opens modal
────────────────────────────────────────────────────── */
function FeatureVideoCard({ feature, index }: { feature: FeatureDef; index: number }) {
  const [open, setOpen] = useState(false);
  const Preview = feature.preview;

  return (
    <>
      <Card
        className="group cursor-pointer hover:shadow-lg transition-all hover:border-primary/30 overflow-hidden flex flex-col"
        data-testid={`card-feature-video-${index}`}
      >
        {/* Thumbnail */}
        <div
          className="relative overflow-hidden flex-shrink-0 border-b bg-muted/10"
          style={{ aspectRatio: "16/9" }}
          onClick={() => setOpen(true)}
        >
          {/* Scaled full app chrome preview */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ transform: "scale(0.38)", transformOrigin: "top left", width: "263%", height: "263%" }}
          >
            <div className="w-full h-full flex bg-background">
              {/* Mini sidebar */}
              <div className="w-36 bg-sidebar border-r border-sidebar-border flex flex-col py-2 shrink-0">
                <div className="flex items-center gap-1.5 px-2 pb-2 border-b border-sidebar-border mb-1.5">
                  <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
                    <BarChart3 className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>
                  <span className="text-[9px] font-bold">Performo AI</span>
                </div>
                <div className="px-1.5 space-y-0.5">
                  {NAV_ITEMS.map(item => (
                    <div
                      key={item.key}
                      className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-[7px] font-medium ${
                        feature.activeKey === item.key
                          ? "bg-primary text-primary-foreground"
                          : "text-sidebar-foreground/40"
                      }`}
                    >
                      <item.icon className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Mini content area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b bg-background/95">
                  <span className="text-[8px] text-muted-foreground font-medium">OYO Hospitality</span>
                  <div className="flex items-center gap-1.5">
                    <div className="bg-muted/50 rounded px-2 py-0.5 text-[7px] text-muted-foreground flex items-center gap-1 border">
                      <Search className="h-2 w-2" /> Search...
                    </div>
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-[7px] font-bold text-primary flex items-center justify-center">DS</div>
                  </div>
                </div>
                <div className="flex-1 p-3 overflow-hidden">
                  <Preview />
                </div>
              </div>
            </div>
          </div>

          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/95 shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="h-5 w-5 text-primary ml-0.5" fill="currentColor" />
            </div>
          </div>
        </div>

        {/* Card body */}
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
            <Play className="h-3 w-3" fill="currentColor" /> Open live demo
            <ChevronRight className="h-3 w-3" />
          </div>
        </CardContent>
      </Card>

      {/* Full-screen demo modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-6xl p-0 overflow-hidden"
          style={{ height: "92vh", maxHeight: "92vh" }}
        >
          <DialogTitle className="sr-only">{feature.title} Live Demo</DialogTitle>
          <DemoPlayer feature={feature} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ──────────────────────────────────────────────────────
   AUTH DIALOG
────────────────────────────────────────────────────── */
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
            {loading ? "Please wait…" : isLogin ? "Sign In" : "Create Account"}
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

/* ──────────────────────────────────────────────────────
   LANDING PAGE
────────────────────────────────────────────────────── */
export default function AuthPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
              <BarChart3 className="h-[18px] w-[18px] text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight" data-testid="text-landing-logo">Performo AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#demos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Live Demos</a>
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

      {/* ── Hero ── */}
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
                <Play className="h-4 w-4 mr-2" fill="currentColor" /> See Live Demos
              </Button>
            </div>
          </div>
          {/* Hero app mockup */}
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
                    { label: "Total KPIs", value: "10", change: "+2 need attention", color: "text-primary" },
                    { label: "On Track", value: "8", change: "80% of total", color: "text-emerald-600" },
                    { label: "Active Projects", value: "3", change: "4 projects total", color: "text-violet-600" },
                    { label: "Actions Due", value: "6", change: "1 overdue", color: "text-amber-600" },
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
                        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: h >= 70 ? "hsl(var(--primary))" : "hsl(var(--muted))" }} />
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
                        { label: "Staff Retention", dot: "bg-emerald-500", pct: 30 },
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

      {/* ── Stats bar ── */}
      <section className="border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "12", label: "Core Features", sub: "Performance + Execution" },
              { value: "GPT-4o", label: "AI Engine", sub: "Latest OpenAI model" },
              { value: "2", label: "User Roles", sub: "Admin & Executive" },
              { value: "100%", label: "Data Privacy", sub: "Your data, your platform" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</p>
                <p className="text-sm font-medium">{stat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Demos ── */}
      <section id="demos" className="py-20 md:py-28 bg-muted/20 border-y">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
              <Play className="h-3 w-3 mr-1.5" fill="currentColor" /> Interactive Live Demos
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-demos-title">
              Try every feature in the <span className="text-primary">real app</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Click any card to open a full-screen live demo — the actual app running with real OYO Hospitality data. No login required.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {FEATURES.map((feature, i) => (
              <FeatureVideoCard key={i} feature={feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Features list ── */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-features-title">
              Everything you need to <span className="text-primary">manage performance &amp; execution</span>
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

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-20 md:py-28 bg-muted/20 border-y">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-how-title">
              Up and running in <span className="text-primary">minutes</span>
            </h2>
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
                {i < 4 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-border" />
                )}
                <h3 className="text-sm font-semibold mb-2">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Performo ── */}
      <section id="why" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">Why Performo</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-why-title">
              Built for growing businesses
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Zap, title: "No BI Tool Required", desc: "Get executive-level insights without Power BI, Tableau, or data analysts.", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
              { icon: Shield, title: "Industry-Specific AI", desc: "AI tuned for hospitality, retail, healthcare, F&B, and more.", color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
              { icon: TrendingUp, title: "Performance + Execution", desc: "The only platform connecting KPI tracking with project execution.", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
              { icon: Activity, title: "Live Health Scoring", desc: "Automated RAG scoring for KPIs and projects. Always know what needs attention.", color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30" },
              { icon: Users, title: "Team Accountability", desc: "Every action has an owner. Every project has milestones.", color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/30" },
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

      {/* ── CTA ── */}
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

      {/* ── Footer ── */}
      <footer className="border-t bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BarChart3 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">Performo AI</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            {["Live Demos", "Features", "How It Works", "Why Performo"].map(l => (
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
