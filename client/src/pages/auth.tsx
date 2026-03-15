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
  Users, LayoutGrid, Play, Search, Activity, X, Target, ListChecks,
  Calendar, Loader2, ExternalLink,
} from "lucide-react";

/* ──────────── Feature Definitions ──────────── */
type TourStep = { title: string; description: string };
type FeatureDef = {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bg: string;
  path: string;
  tourSteps: TourStep[];
};

const FEATURES: FeatureDef[] = [
  {
    icon: LineChart, title: "Live Dashboard", color: "text-primary", bg: "bg-primary/10",
    description: "Welcome banner, KPI health donut, action progress chart, execution stats and department summaries — all in one live view.",
    path: "/",
    tourSteps: [
      { title: "Welcome Banner", description: "The top section shows your company name, today's date, and a live summary of KPI and action status." },
      { title: "KPI Stat Cards", description: "6 cards showing Total KPIs, On Track, At Risk, Below Target, Total Actions, and Overdue — updated in real time." },
      { title: "KPI Health Donut", description: "The donut chart gives an instant visual of KPI health across the company — green, amber, and red segments." },
      { title: "Execution Overview", description: "Scroll down to see live project health — each card shows a colour-coded health bar, progress, status, and task count." },
    ],
  },
  {
    icon: Sparkles, title: "AI KPI Generator", color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/30",
    description: "Generate industry-specific KPIs instantly with GPT-4o. Get tailored metrics with RAG thresholds, formulas, and data sources.",
    path: "/kpis",
    tourSteps: [
      { title: "KPI List", description: "All your company KPIs are listed here with their current RAG status — Green, Amber, or Red based on actuals vs targets." },
      { title: "AI Generate Button", description: "Click '✦ AI Generate KPIs' to launch GPT-4o — describe your industry and focus, and it creates a full KPI set in seconds." },
      { title: "RAG Thresholds", description: "Each KPI has Green, Amber, Red thresholds automatically set. You can tweak them to match your business standards." },
      { title: "Add Actuals", description: "Click 'Add Actual' on any KPI to log real performance figures — status updates immediately based on your thresholds." },
    ],
  },
  {
    icon: Target, title: "KPI Management", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30",
    description: "Track actuals against targets with visual RAG status. Import via Excel, filter by department, and monitor trends over time.",
    path: "/kpis",
    tourSteps: [
      { title: "Filter & Search", description: "Filter KPIs by department, frequency (Monthly/Weekly), or search by name to quickly find what you need." },
      { title: "Status Dots", description: "Each KPI row shows a coloured dot: Green = on track, Amber = near miss, Red = below target. Instantly see what needs attention." },
      { title: "Target vs Actual", description: "Every KPI row shows target and latest actual side by side — no guessing whether you're on track." },
      { title: "Excel Import", description: "Import actuals from Excel in one click. The system maps your columns to the right KPIs automatically." },
    ],
  },
  {
    icon: ListChecks, title: "Action Tracker", color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30",
    description: "Link actions to meetings with owners, due dates, priorities, and revised dates. Never lose sight of what needs to get done.",
    path: "/actions",
    tourSteps: [
      { title: "All Actions View", description: "Every action across all meetings in one table — with owner, due date, meeting type, priority, and current status." },
      { title: "Filter by Meeting", description: "Filter actions by meeting type (Weekly, Monthly, Board) to focus on what came out of a specific meeting." },
      { title: "Status Management", description: "Change action status to Not Started, In Progress, or Completed — tracked against the meeting it was raised in." },
      { title: "Overdue Alerts", description: "Actions past their due date are highlighted in red with an 'Overdue' badge — nothing gets lost or forgotten." },
    ],
  },
  {
    icon: FileText, title: "AI Monthly Reviews", color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/30",
    description: "AI-generated performance reviews with strengths, gaps, and actionable recommendations based on your real KPI and action data.",
    path: "/reviews",
    tourSteps: [
      { title: "Review History", description: "All past monthly reviews listed with date, AI-generated summary, and key metrics from that period." },
      { title: "Generate Review", description: "Click '✦ Generate Review' — GPT-4o reads all your current KPI actuals and action completion rates to write the review." },
      { title: "Strengths & Gaps", description: "The review identifies what's working (Green KPIs, completed actions) and what needs attention (Red KPIs, overdue items)." },
      { title: "Recommendations", description: "Actionable next steps based on your specific data — not generic advice, but insights grounded in your actual numbers." },
    ],
  },
  {
    icon: LayoutTemplate, title: "Dashboard Planner", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30",
    description: "AI designs your ideal Power BI or web dashboard with the right charts, KPIs, and layout — visualised before you build it.",
    path: "/planner",
    tourSteps: [
      { title: "Dashboard Planner Link", description: "In the sidebar, click Dashboard Planner — describe your reporting goals and AI designs the optimal layout for you." },
      { title: "AI Layout Design", description: "GPT-4o recommends which chart types to use (line, donut, bar, table) and which KPIs belong where for your audience." },
      { title: "Power BI Compatible", description: "Output is designed to map directly to Power BI, Tableau, or web dashboards — with field names and chart config details." },
      { title: "Executive Ready", description: "Layouts are optimised for executive audiences — clean, focused, with the most critical numbers front and centre." },
    ],
  },
  {
    icon: FolderOpen, title: "Project Portfolio", color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30",
    description: "All projects in one view with live health scores (Green/Amber/Red), progress bars, priority filters, and quick access.",
    path: "/portfolio",
    tourSteps: [
      { title: "Portfolio Summary Cards", description: "6 stat cards at the top: Total Projects, Active, Completed, Overdue Tasks, Milestones, and At Risk — all live." },
      { title: "Health Colour Bar", description: "Each project card has a coloured bar along the top — Green = healthy, Amber = caution, Red = at risk. Scan instantly." },
      { title: "Grid / List Toggle", description: "Switch between Grid view (rich cards) and List view (compact rows) using the toggle in the top-right of the filter bar." },
      { title: "Filters & Search", description: "Filter by Status, Health, Priority, or Owner. Combine filters to find exactly the projects that need your attention." },
    ],
  },
  {
    icon: LayoutGrid, title: "Project Management", color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-900/30",
    description: "List and Kanban board views, task management with subtask checkboxes, milestone calendar, and team comments.",
    path: "/portfolio",
    tourSteps: [
      { title: "Open a Project", description: "Click any project card to enter the Project Detail view — header shows project name, health badge, status, and key stats." },
      { title: "Tasks: List & Board View", description: "Switch between List view (tasks with priority-coloured borders) and Kanban board view for drag-and-drop workflow management." },
      { title: "Priority Colour Coding", description: "Tasks are colour-coded by priority: Red border = Critical, Orange = High, Blue = Medium. Spot priorities at a glance." },
      { title: "Milestone Calendar", description: "Click Milestones → Calendar view to see upcoming checkpoints plotted on a month-by-month calendar." },
    ],
  },
  {
    icon: Users, title: "Team Workload", color: "text-cyan-600", bg: "bg-cyan-100 dark:bg-cyan-900/30",
    description: "See task distribution across your team. Identify overloaded members and balance workload before deadlines slip.",
    path: "/workload",
    tourSteps: [
      { title: "Summary Stats", description: "Top row shows Total Team Members, Total Tasks, Overdue Tasks, and Completion Rate — a snapshot of team health." },
      { title: "Stacked Bar Per Person", description: "Each person gets a stacked bar: Green = Done, Violet = Active, Grey = Queued, Red = Overdue. See balance instantly." },
      { title: "Expand to See Tasks", description: "Click 'Show tasks' under any person to expand and see all their individual tasks with status and due dates." },
      { title: "Overdue Highlighting", description: "Overdue task due dates appear in red with an Overdue badge — easy for managers to spot and reassign." },
    ],
  },
  {
    icon: Search, title: "Global Search", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30",
    description: "Search across all projects, tasks, KPIs, meetings, and actions from a single search bar. Find anything instantly.",
    path: "/",
    tourSteps: [
      { title: "Open Global Search", description: "Click the Search icon in the top navigation bar, or use the keyboard shortcut Ctrl+K to open the search modal." },
      { title: "Search Anything", description: "Type any keyword — project names, task titles, KPI names, meeting notes, or action owners. All data is searched at once." },
      { title: "Grouped Results", description: "Results are grouped by type: Projects, Tasks, KPIs, Meetings, Actions — easy to scan and navigate." },
      { title: "Instant Navigation", description: "Click any result to jump directly to that item — project detail, KPI card, action row, or meeting page." },
    ],
  },
  {
    icon: Building2, title: "Meeting Management", color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30",
    description: "Card-based meeting list with linked action items. Every meeting creates accountable actions with owners and due dates.",
    path: "/meetings",
    tourSteps: [
      { title: "Meeting Cards", description: "All meetings shown as cards with type (Weekly/Monthly/Board), date, and a progress bar showing action completion." },
      { title: "Action Completion Bar", description: "Each card shows a coloured progress bar — how many of the actions raised in that meeting are now complete." },
      { title: "Add Meeting", description: "Click 'Add Meeting' to log a new meeting — type in the agenda, assign a date, and create linked actions with owners." },
      { title: "Meeting → Actions Link", description: "Every action traces back to the meeting that created it — full accountability chain from discussion to completion." },
    ],
  },
  {
    icon: Shield, title: "Role-Based Access", color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800/50",
    description: "Admin and Executive roles. Admins manage everything; Executives get clean read-only views — right information, right person.",
    path: "/",
    tourSteps: [
      { title: "Admin Role", description: "Admins have full access: create KPIs, log actuals, manage projects, add tasks, run meetings, generate AI reviews." },
      { title: "Executive Role", description: "Executives see clean, read-only views of dashboards, KPIs, projects, and reviews — no clutter, just insights." },
      { title: "Settings → Users", description: "In Settings, Admins can invite team members and assign them Admin or Executive roles with one click." },
      { title: "Try Executive View", description: "Log in with exec@performo.ai / exec123 to see exactly what your executive team sees — identical data, no edit controls." },
    ],
  },
];

/* ──────────── Live App Demo Player ──────────── */
function LiveDemoPlayer({ feature, onClose }: { feature: FeatureDef; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [loginState, setLoginState] = useState<"loading" | "ready" | "error">("loading");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-login with demo credentials so the iframe shows the real app
  useEffect(() => {
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@performo.ai", password: "demo123" }),
      credentials: "include",
    })
      .then(r => { setLoginState(r.ok ? "ready" : "error"); })
      .catch(() => setLoginState("error"));
  }, []);

  const totalSteps = feature.tourSteps.length;
  const currentStep = feature.tourSteps[step];

  return (
    <div className="flex flex-col h-full bg-background" style={{ minHeight: 0 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0 bg-background">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${feature.bg} shrink-0`}>
          <feature.icon className={`h-4 w-4 ${feature.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{feature.title}</div>
          <div className="text-xs text-muted-foreground">Live interactive demo · real app, real data</div>
        </div>
        <a
          href={feature.path}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors mr-2"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open full screen
        </a>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
          data-testid="button-demo-close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* App iframe — the actual running app */}
      <div className="relative flex-1 overflow-hidden bg-muted/20" style={{ minHeight: 0 }}>
        {loginState === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading live demo...</p>
          </div>
        )}
        {loginState === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background">
            <div className="text-sm text-muted-foreground">Unable to load demo. <a href={feature.path} target="_blank" className="text-primary underline">Open in new tab</a></div>
          </div>
        )}
        {loginState === "ready" && (
          <iframe
            ref={iframeRef}
            src={feature.path}
            className="w-full h-full border-0"
            title={`${feature.title} demo`}
            data-testid="iframe-feature-demo"
          />
        )}
      </div>

      {/* Tour guide panel */}
      <div className="shrink-0 border-t bg-background">
        {/* Step dots */}
        <div className="flex items-center gap-1.5 justify-center pt-3 mb-2">
          {feature.tourSteps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all ${
                i === step ? "w-5 h-2 bg-primary" : "w-2 h-2 bg-muted-foreground/25 hover:bg-muted-foreground/50"
              }`}
              data-testid={`button-tour-step-${i}`}
            />
          ))}
        </div>

        {/* Current step content */}
        <div className="px-4 pb-3 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                {step + 1}
              </div>
              <span className="text-sm font-semibold">{currentStep.title}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-7">{currentStep.description}</p>
          </div>
          <div className="flex gap-2 shrink-0 pt-0.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="h-7 text-xs px-2.5"
              data-testid="button-tour-prev"
            >
              ← Prev
            </Button>
            <Button
              size="sm"
              onClick={() => setStep(s => Math.min(totalSteps - 1, s + 1))}
              disabled={step === totalSteps - 1}
              className="h-7 text-xs px-2.5"
              data-testid="button-tour-next"
            >
              Next →
            </Button>
          </div>
        </div>
        <div className="text-center text-[10px] text-muted-foreground pb-2 -mt-1">
          Step {step + 1} of {totalSteps} · Use the live app above to follow along
        </div>
      </div>
    </div>
  );
}

/* ──────────── Feature Card (thumbnail + modal) ──────────── */
function FeatureVideoCard({ feature, index }: { feature: FeatureDef; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card
        className="group cursor-pointer hover:shadow-lg transition-all hover:border-primary/30 overflow-hidden flex flex-col"
        onClick={() => setOpen(true)}
        data-testid={`card-feature-video-${index}`}
      >
        {/* Thumbnail */}
        <div
          className="relative overflow-hidden bg-gradient-to-br from-muted/60 to-muted/20 flex-shrink-0 flex items-center justify-center"
          style={{ aspectRatio: "16/9" }}
        >
          {/* Feature icon large background */}
          <div className={`absolute inset-0 flex items-center justify-center opacity-5`}>
            <feature.icon className="w-32 h-32" />
          </div>
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          {/* Centered icon + label */}
          <div className="relative flex flex-col items-center gap-2.5">
            <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center shadow-md`}>
              <feature.icon className={`w-7 h-7 ${feature.color}`} />
            </div>
            <div className="text-[11px] font-semibold text-foreground/70">{feature.title}</div>
          </div>
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2 bg-black/70 text-white text-[11px] px-3 py-1.5 rounded-full font-medium">
              <Play className="h-3 w-3" fill="currentColor" /> Launch live demo
            </div>
          </div>
          {/* Always-visible play icon */}
          <div className="absolute top-3 right-3">
            <div className="w-8 h-8 rounded-full bg-background/90 shadow flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="h-3.5 w-3.5 text-primary ml-0.5" fill="currentColor" />
            </div>
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
          <div className="flex items-center gap-1 mt-3 text-xs text-primary font-medium group-hover:gap-2 transition-all">
            <Play className="h-3 w-3" fill="currentColor" /> See live demo
            <ChevronRight className="h-3 w-3" />
          </div>
        </CardContent>
      </Card>

      {/* Full demo modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden" style={{ height: "88vh" }}>
          <DialogTitle className="sr-only">{feature.title} Live Demo</DialogTitle>
          <LiveDemoPlayer feature={feature} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ──────────── Auth Dialog ──────────── */
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

/* ──────────── Landing Page ──────────── */
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
                <Play className="h-4 w-4 mr-2" fill="currentColor" /> See Live Demos
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

      {/* Live Demos Section */}
      <section id="demos" className="py-20 md:py-28 bg-muted/20 border-y">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
              <Play className="h-3 w-3 mr-1.5" fill="currentColor" /> Live Demos
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-demos-title">
              Try every feature
              <span className="text-primary"> in the real app</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Click any card to launch a live demo — the actual app, real demo data, guided tour. No recording. No fake UI.
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
            {["Live Demos","Features","How It Works","Why Performo"].map(l => (
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
