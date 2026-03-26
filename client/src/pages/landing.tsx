import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Target, ListChecks, CalendarDays, BarChart3, Briefcase, Sparkles,
  CheckCircle2, ArrowRight, Play, TrendingUp,
  Zap, Shield, Globe, Menu, X, Activity, Building2,
  Brain, LayoutDashboard, FileText, Check, BookOpen,
  Users, Bot, ChevronRight, Database, Upload,
  PieChart, LineChart, Table, Search, Pin, Lightbulb,
  BarChart2, TrendingDown, AlertTriangle, RefreshCw,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Analytics Studio", href: "#analytics" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Guide", href: "/guide" },
  { label: "Demo", href: "#demo" },
];

const PLANS = [
  {
    name: "Trial",
    price: "Free",
    period: "",
    desc: "Explore every feature with your team",
    color: "border-gray-200",
    badge: null,
    highlight: false,
    features: [
      "All features included",
      "Up to 5 users",
      "15 AI requests per day",
      "30-day trial period",
      "Email support",
      "1 company workspace",
    ],
    cta: "Start free trial",
  },
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    desc: "For small teams tracking performance",
    color: "border-blue-200",
    badge: null,
    highlight: false,
    features: [
      "All features included",
      "Up to 20 users",
      "20 AI requests per day",
      "Unlimited KPIs & actions",
      "Monthly review exports (PDF)",
      "Priority email support",
    ],
    cta: "Get started",
  },
  {
    name: "Growth",
    price: "$149",
    period: "/month",
    desc: "For scaling businesses running hard",
    color: "border-blue-600",
    badge: "Most Popular",
    highlight: true,
    features: [
      "All features included",
      "Up to 50 users",
      "75 AI requests per day",
      "Analytics Studio + dashboards",
      "Onboarding session included",
      "Priority support + SLA",
    ],
    cta: "Start with Growth",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For larger organisations with complex needs",
    color: "border-violet-200",
    badge: null,
    highlight: false,
    features: [
      "All features included",
      "Up to 500 users",
      "Unlimited AI requests",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Contact us",
  },
];

const GUIDE_STEPS = [
  {
    step: "01",
    icon: Building2,
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    borderColor: "border-blue-500/30",
    stat: "< 3 min",
    statLabel: "to set up",
    title: "Set up your company profile",
    desc: "Enter your company name, industry, and departments. Performo pre-populates common department structures for your sector.",
    example: "OYO Hospitality: 4 departments — Sales & Revenue, Operations, HR & Admin, Finance.",
  },
  {
    step: "02",
    icon: Target,
    color: "text-emerald-400",
    bg: "bg-emerald-500/20",
    borderColor: "border-emerald-500/30",
    stat: "12 KPIs",
    statLabel: "AI-generated",
    title: "Build your KPI library",
    desc: "AI generates a full KPI library for your industry in seconds. Set targets, tracking frequency, and owners for each metric.",
    example: "OYO: Revenue (AED 4.8M target), Occupancy Rate (82%), NPS (72), Cost Per Room (AED 185).",
  },
  {
    step: "03",
    icon: CalendarDays,
    color: "text-violet-400",
    bg: "bg-violet-500/20",
    borderColor: "border-violet-500/30",
    stat: "4 actions",
    statLabel: "logged & owned",
    title: "Run meetings and log actions",
    desc: "After each meeting, assign action items with owners, due dates, and priorities. Everything becomes trackable — nothing slips.",
    example: "After the Monthly CEO Review: finalise loyalty vendor, submit F&B redesign, update occupancy forecast.",
  },
  {
    step: "04",
    icon: Briefcase,
    color: "text-pink-400",
    bg: "bg-pink-500/20",
    borderColor: "border-pink-500/30",
    stat: "3 projects",
    statLabel: "with live health scores",
    title: "Track strategic projects",
    desc: "Create projects, break them into tasks and milestones, and monitor health scores (Green / Amber / Red) across your portfolio.",
    example: "OYO: Loyalty Program (55%, Green), F&B Overhaul (40%, Amber), Staff Retention (30%, Red).",
  },
  {
    step: "05",
    icon: Upload,
    color: "text-indigo-400",
    bg: "bg-indigo-500/20",
    borderColor: "border-indigo-500/30",
    stat: "3 seconds",
    statLabel: "to get a chart",
    title: "Upload data & ask questions",
    desc: "Drop any Excel or CSV into Analytics Studio and ask questions in plain English. AI picks the best chart, detects trends, flags anomalies.",
    example: "\"Which property has the highest revenue?\" → bar chart with trend badges and top performer callout.",
    isNew: true,
  },
  {
    step: "06",
    icon: FileText,
    color: "text-teal-400",
    bg: "bg-teal-500/20",
    borderColor: "border-teal-500/30",
    stat: "8 seconds",
    statLabel: "full review written",
    title: "Generate monthly performance reviews",
    desc: "At month-end, hit Generate Review. Performo AI writes a structured narrative — strengths, gaps, and recommendations — board-ready.",
    example: "OYO March review: +12% revenue highlighted, Occupancy Rate at 74% flagged, F&B cost reduction recommended.",
  },
  {
    step: "07",
    icon: Bot,
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    borderColor: "border-amber-500/30",
    stat: "3 KPIs",
    statLabel: "flagged instantly",
    title: "Ask the AI assistant anything",
    desc: "Open the AI assistant and ask anything about your data. It reads your KPIs, actions, projects, and reviews to give grounded answers.",
    example: "\"Which KPIs are below target?\" → Occupancy (74% vs 82%), NPS (64 vs 72), Cost Per Room (AED 210 vs 185).",
  },
];

const FEATURES = [
  {
    icon: LayoutDashboard,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    title: "Smart Dashboard",
    desc: "A live command centre that adapts to your data — shows KPI health, project portfolio stats, and overdue action alerts. Always relevant, never empty.",
    badge: null,
  },
  {
    icon: Target,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "KPI Management",
    desc: "Define targets, track actuals, and get Amber/Green/Red status automatically. AI can generate a full KPI library for your industry in seconds.",
    badge: null,
  },
  {
    icon: ListChecks,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    title: "Action Tracker",
    desc: "Capture decisions and assign action items with owner, due date, and priority. Live overdue alerts mean nothing slips through the cracks.",
    badge: null,
  },
  {
    icon: Briefcase,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    title: "Project Management",
    desc: "Portfolio → Initiatives → Tasks, three levels deep. Manage strategic projects, break them into initiatives, and track individual tasks — all in one place.",
    badge: null,
  },
  {
    icon: Database,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    title: "Analytics Studio",
    desc: "Upload any Excel or CSV, ask questions in plain English, and get instant AI-selected charts — bar, line, pie, KPI, trend, and more. Pin results to shared dashboards.",
    badge: "New",
  },
  {
    icon: Sparkles,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    title: "AI Assistant",
    desc: "Ask anything — 'Which KPIs are at risk?', 'Summarise last month's performance' — and get instant, data-grounded answers powered by GPT-4o.",
    badge: null,
  },
  {
    icon: FileText,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    title: "Monthly Reviews",
    desc: "Auto-generate board-ready performance reviews with strengths, gaps, and recommendations — covering KPIs, actions, and projects in one narrative.",
    badge: null,
  },
  {
    icon: Activity,
    color: "text-red-500",
    bg: "bg-red-500/10",
    title: "Workload & Planner",
    desc: "See who's overloaded before it becomes a problem. Plan the quarter, assign workload fairly, and keep execution on track.",
    badge: null,
  },
];

const ANALYTICS_FEATURES = [
  {
    icon: Upload,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    title: "Upload any spreadsheet",
    desc: "Drag-drop an Excel or CSV file. Performo auto-detects every column as a measure, dimension, or date — no manual configuration needed.",
  },
  {
    icon: Sparkles,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    title: "Ask in plain English",
    desc: "Type any question — \"Which month had the highest revenue?\" or \"Compare occupancy rates by property\" — and get the right chart instantly.",
  },
  {
    icon: BarChart2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "8 chart types, AI-selected",
    desc: "KPI scorecards, bar, column, line, area, pie, donut, and table. The AI picks the best fit for your question — or switch with one click.",
  },
  {
    icon: TrendingUp,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    title: "Trend & anomaly detection",
    desc: "Every insight automatically checks for upward/downward trends and statistical anomalies. Get ↑ Trending Up or ⚡ Anomaly badges with explanations.",
  },
  {
    icon: RefreshCw,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    title: "Context-aware follow-ups",
    desc: "Turn on Context Mode and your follow-up questions build on the previous result. Ask \"Now break that down by month\" — the AI remembers your last insight.",
  },
  {
    icon: Pin,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    title: "Save & share dashboards",
    desc: "Save any insight and pin it to a shared dashboard. Publish to your whole team or keep it private. Add an AI executive narrative in one click.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Set up your company in minutes",
    desc: "Add your departments, invite your team, and let our AI generate a tailored KPI library for your industry. Create your first project and break it into initiatives and tasks — all before lunch.",
    color: "text-blue-500",
    border: "border-blue-500/30",
  },
  {
    step: "02",
    title: "Run your operations inside Performo",
    desc: "Assign action items, update KPI actuals, and manage projects across three levels — Portfolio, Initiatives, and Tasks. Upload your data files and start asking questions in Analytics Studio.",
    color: "text-emerald-500",
    border: "border-emerald-500/30",
  },
  {
    step: "03",
    title: "Get clarity, take better decisions",
    desc: "Your dashboard adapts to what you have — project portfolio stats, action summaries, and live KPI health. The AI tells you exactly where to focus, and Analytics Studio shows you the story in your data.",
    color: "text-violet-500",
    border: "border-violet-500/30",
  },
];

const WHY_ITEMS = [
  {
    icon: Brain,
    title: "AI built in, not bolted on",
    desc: "Performo AI understands your actual data — your KPIs, actions, projects, reviews, and uploaded spreadsheets. Ask anything and get grounded answers, not generic summaries.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Database,
    title: "Turn any spreadsheet into insights",
    desc: "Upload an Excel file, ask a question in plain English, and get a chart with trend direction, anomaly detection, and top/bottom performer callouts — in seconds.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    badge: "New",
  },
  {
    icon: Zap,
    title: "Operational from day one",
    desc: "No 6-month implementation. Invite your team, create your first project, assign actions, and get your dashboard showing real insights — this week.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Shield,
    title: "One source of truth",
    desc: "Spreadsheets fragment accountability. Performo connects your KPIs, action items, project tasks, monthly reviews, and data analytics in a single platform — nothing falls through the cracks.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
];

const DEMO_QUESTIONS = [
  "Which property had the highest revenue this quarter?",
  "Show monthly occupancy trend across all hotels",
  "Compare guest satisfaction scores by property",
  "What is the GOP margin trend over time?",
  "Which month had the lowest ADR?",
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(0);

  const closeVideoModal = () => { setVideoModalOpen(false); setVideoError(false); };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") closeVideoModal(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveQuestion(q => (q + 1) % DEMO_QUESTIONS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const goToLogin = () => navigate("/login");

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">

      {/* ══ NAV ═══════════════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <TrendingUp className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-900">Performo <span className="text-blue-600">AI</span></span>
            </div>

            <div className="hidden md:flex items-center gap-7">
              {NAV_LINKS.map(link => (
                <a key={link.label} href={link.href} className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <button onClick={goToLogin} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Log in
              </button>
              <button
                onClick={goToLogin}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                data-testid="button-nav-get-started"
              >
                Get started free <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <button className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 space-y-1">
            {NAV_LINKS.map(link => (
              <a key={link.label} href={link.href} className="block py-2 text-sm text-gray-700 font-medium" onClick={() => setMobileMenuOpen(false)}>
                {link.label}
              </a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <button onClick={goToLogin} className="w-full text-center py-2 border rounded-lg text-sm font-medium text-gray-700">Log in</button>
              <button onClick={goToLogin} className="w-full text-center py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">Get started free</button>
            </div>
          </div>
        )}
      </nav>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 via-white to-white pt-16 pb-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:48px_48px] opacity-30 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Performance Management + Analytics Studio
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight max-w-4xl mx-auto">
            Run your business with<br />
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">clarity and accountability</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Performo AI brings your KPIs, actions, projects, and people into one connected platform — plus an Analytics Studio that turns any spreadsheet into instant AI-powered insights.
          </p>

          {/* Animated question demo */}
          <div className="mt-6 max-w-xl mx-auto">
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <Sparkles className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="text-sm text-gray-500 text-left transition-all duration-500">
                {DEMO_QUESTIONS[activeQuestion]}
              </span>
              <span className="ml-auto shrink-0 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Ask AI</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={goToLogin}
              className="flex items-center gap-2 bg-blue-600 text-white text-base font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
              data-testid="button-hero-start"
            >
              Start for free — no credit card <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setVideoModalOpen(true)}
              className="flex items-center gap-2 text-gray-700 text-base font-semibold px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
              data-testid="button-hero-demo"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100">
                <Play className="h-3.5 w-3.5 text-blue-600 fill-blue-600 ml-0.5" />
              </div>
              Watch 3-min demo
            </button>
          </div>
        </div>
      </section>

      {/* ══ STATS BAR ═════════════════════════════════════════════════════════ */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-center">
            {[
              { value: "12+", label: "Integrated modules", icon: LayoutDashboard },
              { value: "8", label: "AI chart types", icon: BarChart3 },
              { value: "2 min", label: "Average setup time", icon: Zap },
              { value: "GPT-4o", label: "AI engine", icon: Brain },
              { value: "< 1 day", label: "Time to first insight", icon: TrendingUp },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <s.icon className="h-5 w-5 text-blue-500 mb-1" />
                <span className="text-2xl font-extrabold text-gray-900">{s.value}</span>
                <span className="text-sm text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════════════════════ */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-blue-600 text-sm font-semibold uppercase tracking-wider mb-3">
              <span className="h-px w-8 bg-blue-300" /> Everything in one platform <span className="h-px w-8 bg-blue-300" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Replace five tools with one
            </h2>
            <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
              Spreadsheets for KPIs. Another tool for projects. Email threads for action items. Separate BI tools for data. Performo replaces all of it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="relative bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
                {f.badge && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">{f.badge}</span>
                )}
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${f.bg} mb-4`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1.5 group-hover:text-blue-600 transition-colors">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ANALYTICS STUDIO SPOTLIGHT ════════════════════════════════════════ */}
      <section id="analytics" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-indigo-600 text-sm font-semibold uppercase tracking-wider mb-3">
              <span className="h-px w-8 bg-indigo-300" /> New Feature <span className="h-px w-8 bg-indigo-300" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Analytics Studio — ask questions,<br className="hidden sm:block" /> get charts instantly
            </h2>
            <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
              No BI tool needed. Upload any Excel or CSV file and ask questions in plain English. The AI selects the best chart, detects trends, spots anomalies, and suggests follow-ups.
            </p>
          </div>

          {/* Mock Insight Builder UI */}
          <div className="max-w-5xl mx-auto rounded-2xl border border-gray-200 overflow-hidden shadow-xl bg-white mb-12">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 border-b border-gray-200">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <div className="flex-1 mx-3 bg-white border border-gray-200 rounded px-2.5 py-0.5 text-[11px] text-gray-400">app.performo.ai/analytics/datasets/1/explore</div>
            </div>

            {/* Insight Builder 3-column mock */}
            <div className="flex h-[380px] overflow-hidden">
              {/* Left: Field Explorer */}
              <div className="w-[180px] shrink-0 border-r border-gray-100 bg-gray-50/60 p-3 space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Measures</p>
                {["Revenue (AED)", "Occupancy Rate", "ADR (AED)", "RevPAR (AED)", "Guest Satisfaction", "GOP Margin (%)"].map(m => (
                  <div key={m} className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer hover:text-blue-600 py-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    {m}
                  </div>
                ))}
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-2">Dimensions</p>
                {["Property", "Month"].map(d => (
                  <div key={d} className="flex items-center gap-1.5 text-[11px] text-gray-600 cursor-pointer hover:text-violet-600 py-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                    {d}
                  </div>
                ))}
              </div>

              {/* Center: Chart area */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Search bar */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/30 px-3 py-2">
                    <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className="text-xs text-blue-700 font-medium">What is the total revenue by property?</span>
                    <span className="ml-auto text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-md font-semibold shrink-0">Ask</span>
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-hidden">
                  {/* Result header */}
                  <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-gray-900">Total Revenue by Property</p>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">↑ Trending Up</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">60 records · Bar chart</p>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="text-[10px] px-2 py-1 border rounded-md font-medium text-gray-500 cursor-pointer hover:border-blue-300">Save</span>
                      <span className="text-[10px] px-2 py-1 bg-blue-600 text-white rounded-md font-medium cursor-pointer">Pin to Dashboard</span>
                    </div>
                  </div>

                  {/* Fake bar chart */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 h-[180px] flex items-end gap-3 justify-center overflow-hidden">
                    {[
                      { label: "Dubai Marina", value: 90, color: "bg-blue-500" },
                      { label: "Abu Dhabi", value: 70, color: "bg-violet-500" },
                      { label: "Sharjah", value: 47, color: "bg-emerald-500" },
                      { label: "Ajman", value: 36, color: "bg-amber-500" },
                      { label: "RAK", value: 30, color: "bg-pink-500" },
                    ].map(b => (
                      <div key={b.label} className="flex flex-col items-center gap-1 flex-1">
                        <div className={`w-full ${b.color} rounded-t-sm opacity-80`} style={{ height: `${b.value * 1.4}px` }} />
                        <span className="text-[9px] text-gray-500 text-center leading-tight">{b.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Follow-up chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[10px] text-gray-400 mr-0.5">Follow-up:</span>
                    {["Show monthly trend", "Break down by month", "Compare occupancy rates"].map(q => (
                      <span key={q} className="text-[10px] px-2 py-0.5 border border-gray-200 rounded-full text-gray-500 cursor-pointer hover:border-blue-300 hover:text-blue-600">{q}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Details panel */}
              <div className="w-[200px] shrink-0 border-l border-gray-100 bg-gray-50/40 p-3 space-y-3 overflow-hidden">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Question</p>
                <p className="text-[10px] italic text-gray-600">"What is the total revenue by property?"</p>

                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-2">Key Values</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between rounded-md bg-emerald-50 border border-emerald-100 px-2 py-1.5">
                    <span className="text-[9px] text-emerald-700 font-bold">▲ Highest</span>
                    <div className="text-right">
                      <p className="text-[10px] font-bold">31.8M</p>
                      <p className="text-[9px] text-gray-400">Dubai Marina</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-red-50 border border-red-100 px-2 py-1.5">
                    <span className="text-[9px] text-red-600 font-bold">▼ Lowest</span>
                    <div className="text-right">
                      <p className="text-[10px] font-bold">10.5M</p>
                      <p className="text-[9px] text-gray-400">RAK Resort</p>
                    </div>
                  </div>
                </div>

                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-2">AI Analysis</p>
                <p className="text-[10px] text-gray-500 leading-relaxed">Dubai Marina leads with 3× the revenue of RAK Resort, driven by stronger corporate bookings and a higher ADR.</p>
              </div>
            </div>
          </div>

          {/* Analytics Studio sub-features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ANALYTICS_FEATURES.map(f => (
              <div key={f.title} className="bg-gray-50 rounded-xl border border-gray-100 p-5 hover:bg-white hover:shadow-md transition-all duration-200">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${f.bg} mb-3`}>
                  <f.icon className={`h-4.5 w-4.5 ${f.color}`} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRODUCT DEMO ══════════════════════════════════════════════════════ */}
      <section id="demo" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">See it in action</h2>
            <p className="mt-3 text-lg text-gray-600 max-w-xl mx-auto">
              A 3-minute walkthrough covering KPI setup, project tracking, Analytics Studio, AI-generated charts, and one-click performance reviews — with live OYO hotel data.
            </p>
          </div>

          {/* What the demo covers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 max-w-4xl mx-auto mb-10">
            {[
              { icon: Target, label: "KPI tracking" },
              { icon: Briefcase, label: "Project portfolio" },
              { icon: Database, label: "Analytics Studio" },
              { icon: BarChart2, label: "AI chart builder" },
              { icon: Bot, label: "AI assistant" },
              { icon: FileText, label: "Monthly reviews" },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center gap-2 bg-white rounded-xl border border-gray-100 p-3 text-center">
                <item.icon className="h-5 w-5 text-blue-500" />
                <span className="text-xs font-semibold text-gray-700">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-gray-900">
            <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-800 border-b border-gray-700">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-amber-500/70" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
              <div className="flex-1 mx-4 bg-gray-700 rounded px-3 py-0.5 text-[11px] text-gray-400">app.performo.ai/analytics</div>
            </div>

            <div className="relative bg-[#0f172a] min-h-[400px] flex items-center justify-center overflow-hidden">
              <img
                src="/guide/dashboard.jpeg"
                alt="Performo AI dashboard preview"
                className="absolute inset-0 w-full h-full object-cover object-top opacity-40"
              />
              <button
                onClick={() => setVideoModalOpen(true)}
                className="relative z-10 flex flex-col items-center gap-3 group"
                data-testid="button-play-demo"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-2xl group-hover:scale-110 transition-transform">
                  <Play className="h-8 w-8 text-blue-600 fill-blue-600 ml-1" />
                </div>
                <span className="text-white font-semibold text-sm">Watch product demo</span>
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            Or <button onClick={goToLogin} className="text-blue-600 font-semibold hover:underline">try the live demo →</button> with real OYO hotel data, no signup required
          </p>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-emerald-600 text-sm font-semibold uppercase tracking-wider mb-3">
              <span className="h-px w-8 bg-emerald-300" /> Simple by design <span className="h-px w-8 bg-emerald-300" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Up and running in 3 steps</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(s => (
              <div key={s.step} className={`relative rounded-2xl border-2 ${s.border} p-6`}>
                <span className={`text-4xl font-black ${s.color} opacity-30`}>{s.step}</span>
                <h3 className="mt-2 text-lg font-bold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ GUIDE — INFOGRAPHIC ════════════════════════════════════════════════ */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-violet-600/10 rounded-full blur-3xl translate-y-1/3" />
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-emerald-600/8 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-blue-400 text-sm font-semibold uppercase tracking-wider mb-3">
              <span className="h-px w-8 bg-blue-400/40" />
              Step-by-step playbook
              <span className="h-px w-8 bg-blue-400/40" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">How teams use Performo</h2>
            <p className="mt-3 text-lg text-slate-400 max-w-2xl mx-auto">
              Seven steps from first login to board-ready analytics — with real results from the OYO Hospitality demo.
            </p>
          </div>

          {/* ── Row 1: Steps 01–04 ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            {GUIDE_STEPS.slice(0, 4).map((step, i) => (
              <div key={step.step} className="relative group">
                <div className={`h-full bg-white/5 border ${step.borderColor} rounded-2xl p-5 flex flex-col gap-3 hover:bg-white/8 hover:border-white/25 transition-all duration-200 overflow-hidden`}>
                  {/* Watermark number */}
                  <span className="absolute -top-2 -right-1 text-8xl font-black text-white/[0.04] leading-none select-none pointer-events-none">{step.step}</span>
                  {/* Step pill */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-white/25 uppercase tracking-widest">Step {step.step}</span>
                  </div>
                  {/* Icon */}
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${step.bg} shrink-0`}>
                    <step.icon className={`h-5 w-5 ${step.color}`} />
                  </div>
                  {/* Title + desc */}
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">{step.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>
                  {/* Divider */}
                  <div className={`h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent`} />
                  {/* Stat */}
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-xl font-black ${step.color}`}>{step.stat}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold leading-tight">{step.statLabel}</span>
                  </div>
                  {/* Example */}
                  <p className="text-[10px] text-slate-500 leading-relaxed italic border-l-2 border-white/10 pl-2">{step.example}</p>
                </div>
                {/* Arrow connector — desktop only, not last card */}
                {i < 3 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-[1.375rem] -translate-y-1/2 z-10 h-7 w-7 items-center justify-center rounded-full bg-slate-800 border border-slate-600 shadow-lg">
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Row connector ── */}
          <div className="hidden lg:flex items-center gap-3 my-1 px-1">
            <div className="flex-[3] h-px bg-transparent" />
            <div className="flex-1 flex flex-col items-end gap-0 pr-[12.5%]">
              <div className="h-3 w-full border-r-2 border-b-2 border-slate-700 rounded-br-lg" />
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-3 mb-1 px-1">
            <div className="flex-1 flex flex-col items-start gap-0 pl-[0%]">
              <div className="h-3 w-[calc(100%/3+0.5rem)] border-l-2 border-t-2 border-slate-700 rounded-tl-lg" />
            </div>
            <div className="flex-[3] h-px bg-transparent" />
          </div>

          {/* ── Row 2: Steps 05–07 ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {GUIDE_STEPS.slice(4).map((step, i) => (
              <div key={step.step} className="relative group">
                <div className={`h-full bg-white/5 border ${step.borderColor} rounded-2xl p-5 flex flex-col gap-3 hover:bg-white/8 hover:border-white/25 transition-all duration-200 overflow-hidden`}>
                  {/* Watermark number */}
                  <span className="absolute -top-2 -right-1 text-8xl font-black text-white/[0.04] leading-none select-none pointer-events-none">{step.step}</span>
                  {/* Step pill + New badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-white/25 uppercase tracking-widest">Step {step.step}</span>
                    {(step as any).isNew && (
                      <span className="text-[9px] font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full leading-none">New</span>
                    )}
                  </div>
                  {/* Icon */}
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${step.bg} shrink-0`}>
                    <step.icon className={`h-5 w-5 ${step.color}`} />
                  </div>
                  {/* Title + desc */}
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">{step.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                  </div>
                  {/* Divider */}
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  {/* Stat */}
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-xl font-black ${step.color}`}>{step.stat}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold leading-tight">{step.statLabel}</span>
                  </div>
                  {/* Example */}
                  <p className="text-[10px] text-slate-500 leading-relaxed italic border-l-2 border-white/10 pl-2">{step.example}</p>
                </div>
                {/* Arrow connector — desktop only, not last card */}
                {i < 2 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-[1.375rem] -translate-y-1/2 z-10 h-7 w-7 items-center justify-center rounded-full bg-slate-800 border border-slate-600 shadow-lg">
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <a href="/guide" className="inline-flex items-center gap-2 text-blue-400 font-semibold text-sm hover:text-blue-300 transition-colors">
              Open the full interactive guide <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ══ WHY PERFORMO ══════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Why teams choose Performo</h2>
            <p className="mt-3 text-lg text-gray-600 max-w-xl mx-auto">
              There are a hundred project tools. There's one Performo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {WHY_ITEMS.map(w => (
              <div key={w.title} className="relative flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-6 hover:bg-white hover:shadow-md transition-all duration-200">
                {w.badge && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">{w.badge}</span>
                )}
                <div className={`flex-none flex h-12 w-12 items-center justify-center rounded-xl ${w.bg}`}>
                  <w.icon className={`h-6 w-6 ${w.color}`} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1.5">{w.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ═══════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Simple, transparent pricing</h2>
            <p className="mt-3 text-lg text-gray-600">All plans include every feature. Analytics Studio is included on all paid plans.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border-2 ${plan.color} p-6 flex flex-col ${plan.highlight ? "shadow-xl" : ""}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">{plan.badge}</span>
                  </div>
                )}
                <div className="mb-5">
                  <p className="text-sm font-bold text-gray-900 mb-1">{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                    {plan.period && <span className="text-gray-500 text-sm">{plan.period}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">{plan.desc}</p>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={goToLogin}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${plan.highlight ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                  data-testid={`button-plan-${plan.name.toLowerCase()}`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-violet-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to see your data differently?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            Get started in under 2 minutes. Upload your first spreadsheet and ask your first question — no credit card, no setup call.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={goToLogin}
              className="flex items-center gap-2 bg-white text-blue-600 font-bold text-base px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-all shadow-lg"
              data-testid="button-cta-start"
            >
              Start for free <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={goToLogin} className="text-blue-100 font-semibold text-sm hover:text-white transition-colors">
              Or log in to existing account →
            </button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white">Performo AI</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              {["Features", "Analytics Studio", "How It Works", "Pricing", "Guide"].map(item => (
                <a key={item} href={item === "Guide" ? "/guide" : `#${item.toLowerCase().replace(/ /g, "-")}`} className="hover:text-white transition-colors">{item}</a>
              ))}
            </div>
            <p className="text-xs">© 2025 Performo AI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ══ VIDEO MODAL ════════════════════════════════════════════════════════ */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={closeVideoModal}>
          <div className="relative w-full max-w-3xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 bg-gray-800 border-b border-gray-700">
              <span className="text-sm font-semibold text-white">Performo AI — Product Demo</span>
              <button onClick={closeVideoModal} className="text-gray-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="aspect-video bg-gray-950 flex items-center justify-center">
              {!videoError ? (
                <video
                  key="demo-video"
                  controls
                  autoPlay
                  className="w-full h-full"
                  onError={() => setVideoError(true)}
                >
                  <source src="/guide/demo.mp4" type="video/mp4" />
                </video>
              ) : (
                <div className="text-center p-8">
                  <div className="h-16 w-16 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                    <Play className="h-7 w-7 text-blue-400" />
                  </div>
                  <p className="text-gray-400 text-sm mb-4">Demo video coming soon.</p>
                  <button
                    onClick={() => { closeVideoModal(); goToLogin(); }}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Try the live demo instead <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
