import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  BarChart3, Activity, ArrowRight, CheckCircle2,
  Upload, Sparkles, TrendingUp, Shield, Globe,
  Menu, X, BarChart2, Pin, RefreshCw, Building2,
  ChevronDown, ChevronUp, Users, Lock, Eye,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Analytics", href: "#analytics" },
  { label: "Scorecard", href: "#scorecard" },
  { label: "Access Control", href: "#access" },
];

const ANALYTICS_FEATURES = [
  {
    icon: Upload,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    title: "Upload any spreadsheet",
    desc: "Drag-drop an Excel or CSV file. GHC Beacon auto-detects every column as a measure, dimension, or date — no manual configuration needed.",
  },
  {
    icon: Sparkles,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    title: "Ask in plain English",
    desc: "Type any question — \"Which month had the highest revenue?\" or \"Compare performance by department\" — and get the right chart instantly.",
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
    desc: "Every insight automatically checks for upward/downward trends and statistical anomalies — with badges and plain-English explanations.",
  },
  {
    icon: RefreshCw,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    title: "Context-aware follow-ups",
    desc: "Turn on Context Mode and your follow-up questions build on the previous result. Ask \"Now break that down by month\" — the AI remembers.",
  },
  {
    icon: Pin,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    title: "Save & share dashboards",
    desc: "Pin any insight to a shared dashboard. Publish to your whole team or keep it private. Add an AI executive narrative in one click.",
  },
];

const SCORECARD_FEATURES = [
  {
    icon: Activity,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    title: "Four-perspective framework",
    desc: "Financial, Customer, Internal Processes, and Learning & Growth — the full Balanced Scorecard methodology built in and ready to use.",
  },
  {
    icon: TrendingUp,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "RAG traffic-light status",
    desc: "Every KPI automatically shows Green, Amber, or Red based on actual vs. target performance — so you know exactly where to focus.",
  },
  {
    icon: Building2,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    title: "Department-level drill-down",
    desc: "View company-wide performance at a glance, then drill into individual departments to understand what's driving each score.",
  },
  {
    icon: BarChart3,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    title: "Trend history & targets",
    desc: "Track performance month-over-month with sparkline trends, target lines, and variance calculations — all in a single, clean view.",
  },
];

const ACCESS_FEATURES = [
  {
    icon: Shield,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    title: "Role-based access",
    desc: "Assign Admin, Executive, or Member roles. Admins manage everything; Executives view their departments; Members have targeted access.",
  },
  {
    icon: Building2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "Department-level restrictions",
    desc: "Restrict any user to specific departments so they only see data relevant to their area — without complex permission configurations.",
  },
  {
    icon: Lock,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    title: "View, Edit, or Full access",
    desc: "Choose exactly what each user can do per department — View Only, Edit, or Full Access — with one-click changes from the People page.",
  },
  {
    icon: Eye,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    title: "Instant account setup",
    desc: "Create a login for any team member in seconds. Temporary passwords, role selection, and department access — all from one dialog.",
  },
];

const FAQ_ITEMS = [
  {
    q: "What is GHC Beacon?",
    a: "GHC Beacon is an analytics and performance intelligence platform. It gives your team two powerful tools: Analytics Studio for exploring any data file with AI, and Balanced Scorecard for tracking strategic KPIs across departments.",
  },
  {
    q: "What file types does Analytics Studio support?",
    a: "Excel (.xlsx, .xls) and CSV files. GHC Beacon auto-detects column types, computes statistics, and feeds the data to AI for chart generation and natural-language analysis.",
  },
  {
    q: "How does the Balanced Scorecard work?",
    a: "The Balanced Scorecard tracks KPIs across four perspectives: Financial, Customer, Internal Processes, and Learning & Growth. Each KPI shows Green, Amber, or Red status based on actual vs. target, with drill-down by department.",
  },
  {
    q: "How do I control who sees what data?",
    a: "From the People page, you can assign each user a role (Admin, Executive, or Member) and restrict them to specific departments. You can grant view-only, edit, or full access per department.",
  },
  {
    q: "Do I need IT help to get started?",
    a: "No. GHC Beacon is a web-based platform — nothing to install. Invite your team, upload your first dataset, and your analytics dashboard is live in minutes.",
  },
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileMenuOpen(false); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goToLogin = () => navigate("/login");

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">

      {/* ══ NAV ══════════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <img src="/ghc-beacon-logo.jpg" alt="GHC Beacon" className="h-9 w-9 rounded-xl object-cover shadow-sm" />
              <span className="text-lg font-bold tracking-tight text-gray-900">GHC <span className="text-blue-600">Beacon</span></span>
            </div>

            <div className="hidden lg:flex items-center gap-6">
              {scrolled && (
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                  data-testid="button-nav-home"
                >
                  ↑ Home
                </button>
              )}
              {NAV_LINKS.map(link => (
                <a key={link.label} href={link.href} className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <button onClick={goToLogin} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors" data-testid="button-nav-login">
                Log in
              </button>
              <button
                onClick={goToLogin}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                data-testid="button-nav-get-started"
              >
                Get started <ArrowRight className="h-3.5 w-3.5" />
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
              <button onClick={goToLogin} className="w-full text-center py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold">Get started</button>
            </div>
          </div>
        )}
      </nav>

      {/* ══ HERO ═════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0a1628] via-[#0d2040] to-[#0a1628] pt-20 pb-24">
        {/* Background glow effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-cyan-500/8 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <img src="/ghc-beacon-logo.jpg" alt="GHC Beacon" className="h-20 w-20 rounded-2xl object-cover shadow-xl ring-4 ring-white/10" />
          </div>

          <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-400/30 rounded-full px-4 py-1.5 text-sm font-medium text-blue-300 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered Analytics & Performance Intelligence
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            Illuminate your data.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Drive performance.
            </span>
          </h1>

          <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            GHC Beacon gives your team instant analytics from any spreadsheet and a live Balanced Scorecard to track what matters — with full control over who sees what.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={goToLogin}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
              data-testid="button-hero-get-started"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </button>
            <a href="#features" className="flex items-center gap-2 border border-white/20 text-white/80 hover:text-white hover:border-white/40 font-medium px-8 py-3.5 rounded-xl transition-all">
              See features
            </a>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-12">
            {[
              { icon: BarChart3, label: "Analytics Studio" },
              { icon: Activity, label: "Balanced Scorecard" },
              { icon: Shield, label: "Department Access Control" },
              { icon: Users, label: "People Management" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-full px-4 py-1.5 text-sm text-white/70">
                <Icon className="h-3.5 w-3.5 text-cyan-400" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TWO MODULES OVERVIEW ══════════════════════════════════════════ */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Two powerful modules. One platform.</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Everything your team needs to explore data and track strategic performance — without the complexity.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Analytics Studio card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-md">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Analytics Studio</h3>
                  <p className="text-sm text-blue-600 font-medium">Upload · Ask · Explore</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Upload any Excel or CSV file, ask questions in plain English, and get instant AI-selected charts with trend detection, anomaly flags, and executive summaries.
              </p>
              <ul className="space-y-2.5">
                {["Natural language to chart in seconds", "Trend and anomaly detection", "8 AI-selected chart types", "Pin insights to shared dashboards"].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Balanced Scorecard card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 shadow-md">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Balanced Scorecard</h3>
                  <p className="text-sm text-emerald-600 font-medium">Track · Compare · Improve</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Track strategic KPIs across Financial, Customer, Processes, and Learning perspectives. Live RAG status, department drill-down, and monthly trend history.
              </p>
              <ul className="space-y-2.5">
                {["Four-perspective BSC framework", "Green / Amber / Red traffic-light status", "Department-level drill-down", "Month-over-month trend tracking"].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══ ANALYTICS STUDIO ══════════════════════════════════════════════ */}
      <section id="analytics" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 text-sm font-medium text-blue-700 mb-4">
              <BarChart3 className="h-3.5 w-3.5" />
              Analytics Studio
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">From spreadsheet to insight in seconds</h2>
            <p className="text-gray-500 max-w-xl mx-auto">No SQL. No BI tool. Just upload your data and ask what you want to know.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ANALYTICS_FEATURES.map((f) => (
              <div key={f.title} className="group p-6 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${f.bg} mb-4`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BALANCED SCORECARD ════════════════════════════════════════════ */}
      <section id="scorecard" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 text-sm font-medium text-emerald-700 mb-4">
              <Activity className="h-3.5 w-3.5" />
              Balanced Scorecard
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Strategic performance — always visible</h2>
            <p className="text-gray-500 max-w-xl mx-auto">A live scorecard built on the four-perspective Balanced Scorecard methodology, tailored to your departments.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {SCORECARD_FEATURES.map((f) => (
              <div key={f.title} className="group p-6 rounded-xl border border-gray-100 bg-white hover:border-emerald-200 hover:shadow-sm transition-all flex gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${f.bg} shrink-0`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1.5">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* RAG status example */}
          <div className="mt-12 bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-6">Example: Department performance at a glance</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { perspective: "Financial", score: "87%", status: "Green", color: "bg-emerald-500", light: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                { perspective: "Customer", score: "73%", status: "Amber", color: "bg-amber-500", light: "bg-amber-50 border-amber-200 text-amber-700" },
                { perspective: "Processes", score: "91%", status: "Green", color: "bg-emerald-500", light: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                { perspective: "Learning", score: "61%", status: "Red", color: "bg-red-500", light: "bg-red-50 border-red-200 text-red-700" },
              ].map((item) => (
                <div key={item.perspective} className={`rounded-xl border p-4 ${item.light}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-xs font-semibold uppercase tracking-wide">{item.status}</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">{item.score}</div>
                  <div className="text-xs font-medium opacity-80">{item.perspective}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ ACCESS CONTROL ════════════════════════════════════════════════ */}
      <section id="access" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-full px-4 py-1.5 text-sm font-medium text-violet-700 mb-4">
              <Shield className="h-3.5 w-3.5" />
              Access Control
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">The right data, to the right people</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Control exactly who sees what — down to the department level — without complex configuration.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {ACCESS_FEATURES.map((f) => (
              <div key={f.title} className="group p-6 rounded-xl border border-gray-100 hover:border-violet-200 hover:shadow-sm transition-all flex gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${f.bg} shrink-0`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1.5">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Roles table */}
          <div className="mt-12 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">Role Comparison</h3>
            </div>
            <div className="divide-y">
              {[
                { role: "Admin", color: "bg-blue-100 text-blue-700", capabilities: ["Full platform access", "Manage all users", "Configure departments", "All scorecard data"] },
                { role: "Executive", color: "bg-amber-100 text-amber-700", capabilities: ["View analytics dashboards", "View assigned departments", "View scorecard", "No edit permissions"] },
                { role: "Member", color: "bg-emerald-100 text-emerald-700", capabilities: ["Access assigned modules", "Department-restricted view", "Edit within permissions", "Scorecard access"] },
              ].map((r) => (
                <div key={r.role} className="px-6 py-4 flex items-start gap-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 mt-0.5 ${r.color}`}>{r.role}</span>
                  <div className="flex flex-wrap gap-2">
                    {r.capabilities.map(c => (
                      <span key={c} className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
                        <CheckCircle2 className="h-3 w-3 text-gray-400" />{c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ FAQ ══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Frequently asked questions</h2>
            <p className="text-gray-500">Everything you need to know about GHC Beacon</p>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  data-testid={`button-faq-${i}`}
                >
                  <span className="font-semibold text-gray-900 text-sm">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-[#0a1628]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <img src="/ghc-beacon-logo.jpg" alt="GHC Beacon" className="h-16 w-16 rounded-2xl object-cover mx-auto mb-6 shadow-xl ring-4 ring-white/10" />
          <h2 className="text-3xl font-bold text-white mb-4">Ready to illuminate your data?</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            GHC Beacon gives your team instant analytics and live strategic performance tracking — up and running in minutes.
          </p>
          <button
            onClick={goToLogin}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20"
            data-testid="button-cta-get-started"
          >
            Get started today <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
      <footer className="bg-gray-900 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img src="/ghc-beacon-logo.jpg" alt="GHC Beacon" className="h-8 w-8 rounded-lg object-cover" />
              <span className="text-sm font-bold text-white">GHC Beacon</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Analytics Platform</span>
              <span>·</span>
              <span>© {new Date().getFullYear()} GHC Beacon</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
