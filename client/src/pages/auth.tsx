import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, ArrowRight, Target, ListChecks, Sparkles, FileText,
  LayoutTemplate, TrendingUp, Shield, Zap, CheckCircle2, ChevronRight,
  Star, Building2, Users, LineChart
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered KPI Generation",
    description: "Generate industry-specific KPIs instantly with GPT-4o. Get tailored metrics with RAG thresholds, formulas, and data sources.",
  },
  {
    icon: Target,
    title: "KPI Tracking & Management",
    description: "Track actuals against targets with visual RAG status. Import data via Excel, filter by department, and monitor trends over time.",
  },
  {
    icon: ListChecks,
    title: "Action Tracker",
    description: "Link actions to meetings with owners, due dates, priorities, and smart status tracking. Never lose sight of what needs to get done.",
  },
  {
    icon: FileText,
    title: "AI Monthly Reviews",
    description: "Get AI-generated monthly performance reviews with strengths, gaps, and actionable recommendations based on your actual data.",
  },
  {
    icon: LayoutTemplate,
    title: "Dashboard Planner",
    description: "AI designs your ideal Power BI or web dashboard with the right charts, KPIs, and layout — visualized before you build it.",
  },
  {
    icon: LineChart,
    title: "Real-Time Dashboard",
    description: "See your business at a glance with live charts, stat cards, department summaries, and recent activity — all in one view.",
  },
];

const stats = [
  { value: "10x", label: "Faster KPI Setup" },
  { value: "85%", label: "Less Manual Reporting" },
  { value: "GPT-4o", label: "AI Engine" },
  { value: "100%", label: "Data Privacy" },
];

const steps = [
  { step: "01", title: "Set Up Your Profile", description: "Enter your company details, industry, and departments to personalize the AI." },
  { step: "02", title: "Generate KPIs with AI", description: "Let AI create industry-specific KPIs with targets, thresholds, and formulas." },
  { step: "03", title: "Track & Review", description: "Log actuals, track actions from meetings, and get AI-powered monthly reviews." },
];

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
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-sm">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl" data-testid="text-auth-title">
            {isLogin ? "Welcome back" : "Create your account"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isLogin ? "Sign in to your Performo AI account" : "Get started with Performo AI"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required={!isLogin} data-testid="input-name" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required data-testid="input-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required data-testid="input-password" />
          </div>
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
        <div className="text-center">
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setIsLogin(!isLogin)} data-testid="button-toggle-auth">
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </Button>
        </div>
        {isLogin && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Demo: demo@performo.ai / demo123</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AuthPage() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
              <BarChart3 className="h-[18px] w-[18px] text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight" data-testid="text-landing-logo">Performo AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#stats" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Why Performo</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setAuthOpen(true)} data-testid="button-nav-login">
              Sign In
            </Button>
            <Button size="sm" onClick={() => setAuthOpen(true)} data-testid="button-nav-get-started">
              Get Started
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-xs font-medium" data-testid="badge-hero-tag">
              <Sparkles className="h-3 w-3 mr-1.5" />
              Powered by GPT-4o
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6" data-testid="text-hero-title">
              AI-Powered Performance
              <span className="block text-primary">Management for SMEs</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed" data-testid="text-hero-subtitle">
              Stop guessing, start measuring. Performo AI helps you define the right KPIs, track actions from meetings, and get AI-powered reviews — all in one platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 h-12 shadow-md" onClick={() => setAuthOpen(true)} data-testid="button-hero-get-started">
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} data-testid="button-hero-learn-more">
                See Features
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-20 max-w-5xl mx-auto">
            <div className="rounded-2xl border bg-card/80 backdrop-blur shadow-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                  <div className="w-3 h-3 rounded-full bg-green-400/70" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">Performo AI Dashboard</span>
              </div>
              <div className="p-6 md:p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Total KPIs", value: "12", change: "+3 this month", color: "text-primary" },
                    { label: "On Track", value: "8", change: "67% of total", color: "text-emerald-600" },
                    { label: "Actions Due", value: "5", change: "2 overdue", color: "text-amber-600" },
                    { label: "Reviews", value: "3", change: "Latest: Feb", color: "text-violet-600" },
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
                      {[40, 55, 45, 65, 60, 75, 70, 85, 80, 90, 85, 92].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: h >= 70 ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }} />
                      ))}
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">Jan</span>
                      <span className="text-[10px] text-muted-foreground">Dec</span>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-background p-4">
                    <p className="text-xs font-medium mb-3">Actions Status</p>
                    <div className="space-y-2.5">
                      {[
                        { label: "Completed", pct: 45, color: "bg-emerald-500" },
                        { label: "In Progress", pct: 30, color: "bg-primary" },
                        { label: "Overdue", pct: 15, color: "bg-red-500" },
                        { label: "Not Started", pct: 10, color: "bg-muted-foreground/30" },
                      ].map((item, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-medium">{item.pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
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

      <section id="stats" className="border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center" data-testid={`stat-${i}`}>
                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-features-title">
              Everything you need to
              <span className="text-primary"> manage performance</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              From KPI generation to monthly reviews, Performo AI covers the full performance management cycle.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="group hover:border-primary/30 transition-colors" data-testid={`card-feature-${i}`}>
                <CardContent className="pt-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/15 transition-colors">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 md:py-28 bg-muted/20 border-y">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-how-title">
              Up and running in <span className="text-primary">minutes</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              No complex setup. No consultants. Just smart AI that understands your business.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <div key={i} className="relative text-center" data-testid={`step-${i}`}>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold mx-auto mb-5 shadow-md">
                  {step.step}
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-border" />
                )}
                <h3 className="text-base font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">Why SMEs Choose Us</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-why-title">
              Built for growing businesses
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: Zap,
                title: "No BI Tool Required",
                description: "Get executive-level insights without Power BI, Tableau, or data analysts. Everything runs inside the app.",
              },
              {
                icon: Shield,
                title: "Industry-Specific AI",
                description: "AI trained to understand hospitality, retail, healthcare, trading, and more. Your KPIs make sense from day one.",
              },
              {
                icon: TrendingUp,
                title: "Execution-Focused",
                description: "Track actions from meetings to completion. Link every action to a meeting, owner, and department for full accountability.",
              },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center p-6 rounded-2xl border bg-card" data-testid={`card-benefit-${i}`}>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-base font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-cta-title">
            Ready to transform your performance management?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Join SMEs who use AI to set better KPIs, track execution, and drive results. Get started in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" className="text-base px-8 h-12 shadow-md" onClick={() => setAuthOpen(true)} data-testid="button-cta-start">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-sm opacity-70">No credit card required</p>
          </div>
        </div>
      </section>

      <footer className="border-t bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <BarChart3 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">Performo AI</span>
            </div>
            <p className="text-xs text-muted-foreground">
              AI-powered performance management for SMEs
            </p>
          </div>
        </div>
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
