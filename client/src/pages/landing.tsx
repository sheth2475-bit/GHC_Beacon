import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Target, ListChecks, CalendarDays, BarChart3, Briefcase, Sparkles,
  CheckCircle2, ArrowRight, Play, TrendingUp,
  Zap, Shield, Globe, Menu, X, Activity, Building2,
  Brain, LayoutDashboard, FileText,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Why Performo", href: "#why-performo" },
  { label: "Demo", href: "#demo" },
];

const FEATURES = [
  {
    icon: LayoutDashboard,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    title: "Executive Dashboard",
    desc: "A live command centre — KPI health, overdue actions, project pulse, and team workload at a single glance. Updated in real time.",
  },
  {
    icon: Target,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    title: "KPI Management",
    desc: "Define targets, track actuals, and get Amber/Green/Red status automatically. AI can generate a full KPI library for your industry in seconds.",
  },
  {
    icon: ListChecks,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    title: "Action Tracker",
    desc: "Every decision from every meeting becomes a tracked action — with owner, due date, priority, and live overdue alerts.",
  },
  {
    icon: CalendarDays,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    title: "Meeting Intelligence",
    desc: "Log meeting minutes, auto-generate action items, and keep every commitment accountable — from CEO reviews to department stand-ups.",
  },
  {
    icon: Briefcase,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    title: "Project Portfolio",
    desc: "Manage all strategic initiatives, milestones, and tasks across departments in one place. Red/Amber/Green health scoring keeps risks visible.",
  },
  {
    icon: Sparkles,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    title: "Performo AI Assistant",
    desc: "Ask anything — 'Which KPIs are at risk?', 'Summarise last month's performance' — and get instant, data-grounded answers powered by GPT-4o.",
  },
  {
    icon: FileText,
    color: "text-teal-500",
    bg: "bg-teal-500/10",
    title: "Monthly Reviews",
    desc: "Auto-generate board-ready performance reviews with strengths, gaps, and recommendations. Export to PDF in one click.",
  },
  {
    icon: Activity,
    color: "text-red-500",
    bg: "bg-red-500/10",
    title: "Workload & Planner",
    desc: "See who's overloaded before it becomes a problem. Plan the quarter, assign workload fairly, and keep execution on track.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Set up your company in minutes",
    desc: "Add your departments, invite your team, and let our AI generate a tailored KPI library for your industry — no consultants needed.",
    color: "text-blue-500",
    border: "border-blue-500/30",
  },
  {
    step: "02",
    title: "Run your operations inside Performo",
    desc: "Log meetings, assign actions, update KPI actuals, and track projects — everything connected in one platform instead of scattered across spreadsheets.",
    color: "text-emerald-500",
    border: "border-emerald-500/30",
  },
  {
    step: "03",
    title: "Get clarity, take better decisions",
    desc: "Your dashboard surfaces what matters: what's at risk, who's falling behind, and what the AI recommends — so you spend time fixing, not finding.",
    color: "text-violet-500",
    border: "border-violet-500/30",
  },
];

const WHY_ITEMS = [
  {
    icon: Brain,
    title: "AI built in, not bolted on",
    desc: "Performo AI understands your actual data — your KPIs, your actions, your reviews. It answers questions like a chief of staff who has read everything.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Zap,
    title: "Operational from day one",
    desc: "No 6-month implementation. No training programs. Invite your team, run your first meeting, and start tracking performance this week.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Globe,
    title: "Built for lean, ambitious teams",
    desc: "Scaled-down enterprise performance management tools leave growing businesses behind. Performo is purpose-built for 20–500 person organisations that run fast.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Shield,
    title: "One source of truth",
    desc: "Spreadsheets fragment accountability. Performo connects your strategy, operations, and people in a single platform — so nothing falls through the cracks.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
];

const TESTIMONIALS = [
  {
    quote: "We used to spend 3 hours before every board meeting pulling data from 6 spreadsheets. Now it takes 10 minutes and the AI writes the summary.",
    name: "Priya S.",
    title: "CEO, Hospitality Group",
    stars: 5,
  },
  {
    quote: "The action tracker alone paid for itself. Nothing gets lost after a meeting anymore — everyone knows what they committed to.",
    name: "David K.",
    title: "COO, Retail Chain",
    stars: 5,
  },
  {
    quote: "Our investors were impressed to see a real-time performance dashboard in our deck. Performo made us look like a much bigger company.",
    name: "Lena M.",
    title: "MD, Professional Services",
    stars: 5,
  },
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const closeVideoModal = () => { setVideoModalOpen(false); setVideoError(false); };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") closeVideoModal(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const goToLogin = () => navigate("/login");

  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">

      {/* ══ NAV ═══════════════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <TrendingUp className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-900">Performo <span className="text-blue-600">AI</span></span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map(link => (
                <a key={link.label} href={link.href} className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  {link.label}
                </a>
              ))}
            </div>

            {/* CTAs */}
            <div className="hidden md:flex items-center gap-3">
              <button onClick={goToLogin} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Log in
              </button>
              <button
                onClick={goToLogin}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                data-testid="button-nav-get-started"
              >
                Get started free
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Mobile menu toggle */}
            <button className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
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
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:48px_48px] opacity-30 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Performance Management
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight max-w-4xl mx-auto">
            Run your business with<br />
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">clarity and accountability</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Performo AI brings your KPIs, actions, meetings, projects, and people into one connected platform — with an AI copilot that tells you exactly where to focus.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={goToLogin}
              className="flex items-center gap-2 bg-blue-600 text-white text-base font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
              data-testid="button-hero-start"
            >
              Start for free — no credit card
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setVideoModalOpen(true)}
              className="flex items-center gap-2 text-gray-700 text-base font-semibold px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all"
              data-testid="button-hero-demo"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100">
                <Play className="h-3.5 w-3.5 text-blue-600 fill-blue-600 ml-0.5" />
              </div>
              Watch 2-min demo
            </button>
          </div>

          {/* Trust line */}
          <p className="mt-5 text-sm text-gray-400 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Used by 200+ growing businesses in hospitality, retail, and professional services
          </p>
        </div>
      </section>

      {/* ══ STATS BAR ═════════════════════════════════════════════════════════ */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "10+", label: "Integrated modules", icon: LayoutDashboard },
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

      {/* ══ PRODUCT DEMO ══════════════════════════════════════════════════════ */}
      <section id="demo" className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">See it in action</h2>
            <p className="mt-3 text-lg text-gray-600 max-w-xl mx-auto">
              One 2-minute walkthrough. Everything from KPI setup to AI-generated performance review.
            </p>
          </div>

          {/* Video placeholder / mock screen */}
          <div className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-gray-900">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-800 border-b border-gray-700">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-amber-500/70" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
              <div className="flex-1 mx-4 bg-gray-700 rounded px-3 py-0.5 text-[11px] text-gray-400">app.performo.ai/dashboard</div>
            </div>

            {/* Dashboard preview */}
            <div className="relative bg-[#0f172a] p-4 min-h-[400px] flex items-center justify-center">
              {/* Mock dashboard grid */}
              <div className="absolute inset-4 opacity-60 grid grid-cols-4 grid-rows-3 gap-2 pointer-events-none">
                <div className="col-span-4 bg-white/5 rounded-lg border border-white/10 flex items-center px-4 gap-4">
                  <div className="h-4 w-32 bg-white/20 rounded" />
                  <div className="flex gap-2 ml-auto">
                    <div className="h-6 w-20 bg-emerald-500/30 rounded-full" />
                    <div className="h-6 w-20 bg-red-500/30 rounded-full" />
                    <div className="h-6 w-24 bg-blue-500/30 rounded-full" />
                  </div>
                </div>
                {["bg-blue-500/20", "bg-emerald-500/20", "bg-red-500/20", "bg-orange-500/20", "bg-violet-500/20", "bg-teal-500/20"].map((c, i) => (
                  <div key={i} className={`${c} rounded-lg border border-white/10 flex flex-col justify-center px-3`}>
                    <div className="h-2.5 w-12 bg-white/20 rounded mb-1.5" />
                    <div className="h-6 w-8 bg-white/30 rounded" />
                  </div>
                ))}
                <div className="col-span-2 row-span-2 bg-white/5 rounded-lg border border-white/10 p-3">
                  <div className="h-2 w-20 bg-white/20 rounded mb-3" />
                  <div className="space-y-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <div className="h-2 flex-1 bg-white/10 rounded" />
                        <div className="h-2 w-10 bg-red-400/40 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-span-2 row-span-2 bg-white/5 rounded-lg border border-white/10 p-3">
                  <div className="h-2 w-16 bg-white/20 rounded mb-2" />
                  <div className="flex items-end gap-2 h-16">
                    {[40,70,50,90,60,80].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 1 || i === 3 || i === 5 ? "rgba(59,130,246,0.5)" : i === 4 ? "rgba(239,68,68,0.5)" : "rgba(16,185,129,0.5)" }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Play button overlay */}
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
            Or <button onClick={goToLogin} className="text-blue-600 font-semibold hover:underline">try the live demo →</button> with real data, no signup required
          </p>
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
              Spreadsheets for KPIs. Another tool for projects. Email threads for action items. Performo replaces all of it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
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

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-emerald-600 text-sm font-semibold uppercase tracking-wider mb-3">
              <span className="h-px w-8 bg-emerald-300" /> Simple by design <span className="h-px w-8 bg-emerald-300" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Up and running in a day</h2>
            <p className="mt-3 text-lg text-gray-600 max-w-xl mx-auto">No implementation project. No external consultants. Just three steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-blue-200 via-emerald-200 to-violet-200" />

            {STEPS.map(s => (
              <div key={s.step} className={`relative bg-white rounded-2xl border-2 ${s.border} p-7 text-center hover:shadow-lg transition-all`}>
                <div className={`text-5xl font-black ${s.color} opacity-20 leading-none mb-2`}>{s.step}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHY PERFORMO ══════════════════════════════════════════════════════ */}
      <section id="why-performo" className="py-20 bg-gradient-to-b from-gray-900 to-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-blue-400 text-sm font-semibold uppercase tracking-wider mb-3">
              <span className="h-px w-8 bg-blue-500/50" /> Why teams choose Performo <span className="h-px w-8 bg-blue-500/50" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold">Not another dashboard. A decisions engine.</h2>
            <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
              Enterprise performance management was built for 10,000-person companies. Performo is built for businesses that move fast and need answers now.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16">
            {WHY_ITEMS.map(item => (
              <div key={item.title} className="flex gap-4 bg-white/5 rounded-xl border border-white/10 p-6 hover:bg-white/8 transition-colors">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${item.bg} shrink-0`}>
                  <item.icon className={`h-5.5 w-5.5 ${item.color}`} />
                </div>
                <div>
                  <h3 className="text-base font-bold mb-1.5">{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="max-w-3xl mx-auto">
            <h3 className="text-center text-lg font-semibold text-gray-300 mb-6">How Performo compares</h3>
            <div className="rounded-xl overflow-hidden border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-white/5">
                    <th className="text-left px-5 py-3 text-gray-400 font-medium">Capability</th>
                    <th className="px-4 py-3 text-gray-400 font-medium text-center">Spreadsheets</th>
                    <th className="px-4 py-3 text-gray-400 font-medium text-center">Enterprise ERP</th>
                    <th className="px-4 py-3 text-blue-400 font-bold text-center">Performo AI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    ["KPI tracking", "✓", "✓", "✓"],
                    ["Action accountability", "—", "✓", "✓"],
                    ["AI-generated insights", "—", "—", "✓"],
                    ["Meeting → action sync", "—", "—", "✓"],
                    ["Project portfolio view", "—", "✓", "✓"],
                    ["Setup in < 1 day", "✓", "—", "✓"],
                    ["Price for growing teams", "Free", "$$$$", "$$"],
                  ].map(([cap, ss, erp, perf]) => (
                    <tr key={cap} className="hover:bg-white/3 transition-colors">
                      <td className="px-5 py-3 text-gray-300">{cap}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{ss}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{erp}</td>
                      <td className="px-4 py-3 text-center text-blue-400 font-semibold">{perf}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA FOOTER ════════════════════════════════════════════════════════ */}
      <section className="bg-gradient-to-r from-blue-600 to-violet-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Ready to bring clarity to your operations?
          </h2>
          <p className="text-blue-100 text-lg max-w-xl mx-auto mb-8">
            Join growing businesses that use Performo to track what matters, fix what's broken, and hit their targets.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={goToLogin}
              className="flex items-center gap-2 bg-white text-blue-600 font-bold text-base px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
              data-testid="button-cta-start"
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={goToLogin}
              className="flex items-center gap-2 bg-white/10 text-white font-semibold text-base px-8 py-3.5 rounded-xl border border-white/30 hover:bg-white/20 transition-colors"
              data-testid="button-cta-demo"
            >
              <CalendarDays className="h-4 w-4" />
              Book a live demo
            </button>
          </div>
          <p className="mt-5 text-sm text-blue-200">No credit card required · Free plan available · Cancel anytime</p>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <footer className="bg-gray-950 text-gray-500 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-400">Performo AI</span>
          </div>
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} Performo AI. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs">
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Terms</a>
            <button onClick={goToLogin} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Log in →</button>
          </div>
        </div>
      </footer>

      {/* ══ VIDEO MODAL — native HTML5 player ════════════════════════════════ */}
      {videoModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeVideoModal}
        >
          <div
            className="relative bg-gray-950 rounded-2xl overflow-hidden w-full shadow-2xl"
            style={{ maxWidth: "900px" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600">
                  <TrendingUp className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-white font-semibold text-sm">Performo AI — Product Demo</span>
              </div>
              <button
                onClick={closeVideoModal}
                aria-label="Close demo video"
                className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Native video player */}
            <div className="bg-black">
              {!videoError ? (
                <video
                  key={videoModalOpen ? "open" : "closed"}
                  className="w-full"
                  style={{ maxHeight: "70vh" }}
                  controls
                  playsInline
                  preload="metadata"
                  onError={() => setVideoError(true)}
                >
                  <source src="/demos/performo-demo.webm" type="video/webm" />
                  <source src="/demos/performo-demo.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="aspect-video bg-gray-900 flex flex-col items-center justify-center gap-5 p-10">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600/15 border-2 border-blue-500/30">
                    <Play className="h-9 w-9 text-blue-400 fill-blue-400 ml-1" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold text-lg mb-2">Your browser can't play this video</p>
                    <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
                      Try the live demo instead — explore every feature hands-on with our sample data.
                    </p>
                  </div>
                  <button
                    onClick={() => { closeVideoModal(); goToLogin(); }}
                    className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try the live demo instead
                    <ArrowRight className="h-4 w-4" />
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
