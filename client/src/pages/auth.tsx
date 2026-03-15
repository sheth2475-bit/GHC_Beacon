import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Building2, LineChart, FolderOpen, Users, LayoutGrid, Play, Video,
  Search, Milestone, Activity, Flag, X,
} from "lucide-react";

const DEMO_YOUTUBE_IDS: Record<string, string> = {
  dashboard: "",
  kpi_builder: "",
  kpi_management: "",
  action_tracker: "",
  meetings: "",
  reviews: "",
  portfolio: "",
  project_detail: "",
  workload: "",
  search: "",
  planner: "",
  settings: "",
};

const features = [
  {
    icon: LineChart,
    title: "Live Dashboard",
    description: "Welcome banner, KPI health donut, action progress chart, execution stats and department summaries — all in one live view.",
    videoKey: "dashboard",
    color: "text-primary",
    bg: "bg-primary/10",
    thumb: "dashboard",
  },
  {
    icon: Sparkles,
    title: "AI KPI Generator",
    description: "Generate industry-specific KPIs instantly with GPT-4o. Get tailored metrics with RAG thresholds, formulas, and data sources.",
    videoKey: "kpi_builder",
    color: "text-violet-600",
    bg: "bg-violet-100 dark:bg-violet-900/30",
    thumb: "kpi_builder",
  },
  {
    icon: Target,
    title: "KPI Management",
    description: "Track actuals against targets with RAG status. Import data via Excel, filter by department, and monitor trends.",
    videoKey: "kpi_management",
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    thumb: "kpi_management",
  },
  {
    icon: ListChecks,
    title: "Action Tracker",
    description: "Link actions to meetings with owners, due dates, priorities, and revised dates. Never lose sight of what needs to get done.",
    videoKey: "action_tracker",
    color: "text-orange-600",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    thumb: "action_tracker",
  },
  {
    icon: FileText,
    title: "AI Monthly Reviews",
    description: "AI-generated performance reviews with strengths, gaps, and actionable recommendations based on your real data.",
    videoKey: "reviews",
    color: "text-rose-600",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    thumb: "reviews",
  },
  {
    icon: LayoutTemplate,
    title: "Dashboard Planner",
    description: "AI designs your ideal Power BI or web dashboard with the right charts, KPIs, and layout — visualized before you build it.",
    videoKey: "planner",
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    thumb: "planner",
  },
  {
    icon: FolderOpen,
    title: "Project Portfolio",
    description: "All projects in one view with live health scores (Green/Amber/Red), progress bars, priority filters, and quick access.",
    videoKey: "portfolio",
    color: "text-indigo-600",
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    thumb: "portfolio",
  },
  {
    icon: LayoutGrid,
    title: "Project Management",
    description: "List and Kanban board views, task management with subtask checkboxes, milestones timeline, and team comments.",
    videoKey: "project_detail",
    color: "text-teal-600",
    bg: "bg-teal-100 dark:bg-teal-900/30",
    thumb: "project_detail",
  },
  {
    icon: Users,
    title: "Workload View",
    description: "See task distribution across your team at a glance. Identify bottlenecks and balance workload before deadlines slip.",
    videoKey: "workload",
    color: "text-cyan-600",
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    thumb: "workload",
  },
  {
    icon: Search,
    title: "Global Search",
    description: "Search across projects, tasks, KPIs, meetings, and actions from a single search bar. Find anything instantly.",
    videoKey: "search",
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    thumb: "search",
  },
  {
    icon: Building2,
    title: "Meeting Management",
    description: "Card-based meeting list with linked action items. Every meeting creates accountable actions with owners and due dates.",
    videoKey: "meetings",
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    thumb: "meetings",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description: "Admin and Executive roles. Admins manage everything; Executives get clean read-only views of what matters.",
    videoKey: "settings",
    color: "text-slate-600",
    bg: "bg-slate-100 dark:bg-slate-800/50",
    thumb: "settings",
  },
];

const stats = [
  { value: "12", label: "Core Features", sub: "Performance + Execution" },
  { value: "GPT-4o", label: "AI Engine", sub: "Latest OpenAI model" },
  { value: "2", label: "User Roles", sub: "Admin & Executive" },
  { value: "100%", label: "Data Privacy", sub: "Your data, your platform" },
];

const steps = [
  { step: "01", title: "Set Up Your Profile", description: "Enter company details, industry, and departments. Invite your executive team instantly." },
  { step: "02", title: "Generate KPIs with AI", description: "Let GPT-4o create industry-specific KPIs with targets, RAG thresholds, and formulas." },
  { step: "03", title: "Run Your Meetings", description: "Log meeting actions with owners and due dates. Every action links back to accountability." },
  { step: "04", title: "Track Projects & Tasks", description: "Create projects, assign tasks, set milestones, and track health scores automatically." },
  { step: "05", title: "Get AI Reviews", description: "Monthly AI reviews surface strengths, gaps, and recommendations based on your real data." },
];

function Thumbnail({ type }: { type: string }) {
  if (type === "dashboard") return (
    <div className="p-3 space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {["12 KPIs", "8 On Track", "5 Actions", "3 Reviews"].map((l, i) => (
          <div key={i} className="rounded bg-background/80 p-1.5 text-center">
            <div className="text-[10px] font-bold text-primary">{l.split(" ")[0]}</div>
            <div className="text-[8px] text-muted-foreground">{l.split(" ").slice(1).join(" ")}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div className="col-span-2 rounded bg-background/80 p-2 h-14">
          <div className="text-[8px] text-muted-foreground mb-1">KPI Trend</div>
          <div className="flex items-end gap-0.5 h-7">
            {[40,55,45,65,60,75,85].map((h,i) => (
              <div key={i} className="flex-1 rounded-t" style={{height:`${h}%`, background: h>=70?"hsl(var(--primary))":"hsl(var(--muted))"}} />
            ))}
          </div>
        </div>
        <div className="rounded bg-background/80 p-2 h-14 space-y-1">
          {[{l:"Done",w:"45%",c:"bg-emerald-500"},{l:"Active",w:"30%",c:"bg-primary"},{l:"Late",w:"15%",c:"bg-red-500"}].map((b,i) => (
            <div key={i}>
              <div className="text-[8px] text-muted-foreground">{b.l}</div>
              <div className="h-1 rounded bg-muted overflow-hidden"><div className={`h-full ${b.c}`} style={{width:b.w}} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  if (type === "kpi_builder") return (
    <div className="p-3 space-y-2">
      <div className="flex gap-2 mb-2">
        <div className="flex-1 text-[9px] px-2 py-1 rounded bg-primary text-primary-foreground text-center font-medium">Manual KPI</div>
        <div className="flex-1 text-[9px] px-2 py-1 rounded bg-background/80 text-muted-foreground text-center flex items-center justify-center gap-1"><Sparkles className="h-2 w-2" /> AI Generate</div>
      </div>
      <div className="rounded bg-background/80 p-2 space-y-1.5">
        {["KPI Name", "Department", "Target Value", "Green Threshold"].map((f,i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="text-[8px] text-muted-foreground w-20 shrink-0">{f}</div>
            <div className="flex-1 h-3 rounded bg-muted/60" />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        <div className="flex-1 h-6 rounded bg-muted/40" />
        <div className="w-16 h-6 rounded bg-primary/80" />
      </div>
    </div>
  );
  if (type === "kpi_management") return (
    <div className="p-3 space-y-1.5">
      <div className="flex gap-1.5 mb-2">
        <div className="flex-1 h-5 rounded bg-background/80 flex items-center px-2"><div className="w-8 h-1.5 rounded bg-muted" /></div>
        <div className="w-14 h-5 rounded bg-background/80" />
        <div className="w-14 h-5 rounded bg-background/80" />
      </div>
      {[{n:"RevPAR",t:"$85",a:"$91",s:"bg-emerald-500"},{n:"Occupancy",t:"80%",a:"76%",s:"bg-amber-500"},{n:"NPS Score",t:"70",a:"65",s:"bg-red-500"}].map((r,i) => (
        <div key={i} className="flex items-center gap-2 bg-background/80 rounded px-2 py-1">
          <div className={`w-1.5 h-1.5 rounded-full ${r.s}`} />
          <div className="text-[8px] flex-1 font-medium">{r.n}</div>
          <div className="text-[8px] text-muted-foreground">T: {r.t}</div>
          <div className="text-[8px] font-semibold">{r.a}</div>
        </div>
      ))}
    </div>
  );
  if (type === "portfolio") return (
    <div className="p-3 space-y-1.5">
      <div className="grid grid-cols-4 gap-1 mb-2">
        {[{l:"Total",v:"4"},{l:"Active",v:"2"},{l:"At Risk",v:"1"},{l:"Done",v:"1"}].map((s,i) => (
          <div key={i} className="rounded bg-background/80 p-1 text-center">
            <div className="text-[10px] font-bold">{s.v}</div>
            <div className="text-[7px] text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
      {[{n:"Loyalty Launch",h:"bg-emerald-500",p:55},{n:"Menu Overhaul",h:"bg-amber-500",p:40},{n:"Staff Retention",h:"bg-red-500",p:30}].map((p,i) => (
        <div key={i} className="bg-background/80 rounded p-1.5 flex items-center gap-2">
          <div className={`w-1.5 rounded-full shrink-0 ${p.h}`} style={{height:"20px"}} />
          <div className="flex-1 min-w-0">
            <div className="text-[8px] font-medium truncate">{p.n}</div>
            <div className="h-1 rounded bg-muted mt-1 overflow-hidden"><div className="h-full bg-primary/70" style={{width:`${p.p}%`}} /></div>
          </div>
          <div className="text-[8px] text-muted-foreground shrink-0">{p.p}%</div>
        </div>
      ))}
    </div>
  );
  if (type === "project_detail") return (
    <div className="p-3 space-y-2">
      <div className="flex gap-1 mb-2">
        {["Overview","Tasks","Milestones","Comments"].map((t,i) => (
          <div key={i} className={`text-[7px] px-1.5 py-0.5 rounded ${i===1?"bg-primary text-primary-foreground":"bg-background/80 text-muted-foreground"}`}>{t}</div>
        ))}
      </div>
      <div className="flex gap-1 mb-1">
        <div className="text-[7px] px-2 py-0.5 rounded bg-primary/10 text-primary">List</div>
        <div className="text-[7px] px-2 py-0.5 rounded bg-muted/40 text-muted-foreground">Board</div>
      </div>
      {[{t:"Design mockups",s:"bg-emerald-100",p:"High"},{t:"Backend API",s:"bg-violet-100",p:"Medium"},{t:"User testing",s:"bg-muted",p:"Low"}].map((t,i) => (
        <div key={i} className={`rounded ${t.s} px-2 py-1 flex items-center gap-2`}>
          <div className="w-1 h-1 rounded-full bg-current opacity-50" />
          <div className="text-[8px] flex-1">{t.t}</div>
          <div className="text-[7px] text-muted-foreground">{t.p}</div>
        </div>
      ))}
    </div>
  );
  if (type === "workload") return (
    <div className="p-3 space-y-2">
      {[{n:"Ravi M.",total:7,done:3,active:2,over:2},{n:"Pooja S.",total:5,done:4,active:1,over:0},{n:"Arjun K.",total:4,done:1,active:2,over:1}].map((p,i) => (
        <div key={i} className="bg-background/80 rounded p-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[7px] font-bold text-primary">{p.n[0]}</div>
            <div className="text-[8px] font-medium flex-1">{p.n}</div>
            <div className="text-[7px] text-muted-foreground">{p.total} tasks</div>
          </div>
          <div className="flex h-2 rounded overflow-hidden gap-0.5">
            <div className="bg-emerald-500 rounded-l" style={{width:`${(p.done/p.total)*100}%`}} />
            <div className="bg-violet-500" style={{width:`${(p.active/p.total)*100}%`}} />
            <div className="bg-red-500 rounded-r" style={{width:`${(p.over/p.total)*100}%`}} />
          </div>
        </div>
      ))}
    </div>
  );
  if (type === "action_tracker") return (
    <div className="p-3 space-y-1.5">
      {[
        {t:"Update pricing deck",o:"Ravi",d:"Mar 10",s:"bg-red-100 text-red-700"},
        {t:"Send supplier quotes",o:"Pooja",d:"Mar 15",s:"bg-amber-100 text-amber-700"},
        {t:"Staff training plan",o:"Arjun",d:"Mar 20",s:"bg-violet-100 text-violet-800"},
      ].map((a,i) => (
        <div key={i} className="bg-background/80 rounded p-1.5 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[8px] font-medium truncate">{a.t}</div>
            <div className="text-[7px] text-muted-foreground">{a.o} · {a.d}</div>
          </div>
          <div className={`text-[7px] px-1.5 py-0.5 rounded-full font-medium ${a.s}`}>
            {i===0?"Overdue":i===1?"In Progress":"Not Started"}
          </div>
        </div>
      ))}
    </div>
  );
  if (type === "reviews") return (
    <div className="p-3 space-y-2">
      <div className="bg-background/80 rounded p-2 space-y-1.5">
        <div className="flex items-center gap-1.5"><Sparkles className="h-2.5 w-2.5 text-primary" /><div className="text-[8px] font-semibold">February 2026 Review</div></div>
        <div>
          <div className="text-[7px] text-emerald-600 font-semibold mb-0.5">Strengths</div>
          <div className="text-[7px] text-muted-foreground">RevPAR exceeded target by 7%. Guest NPS improved to 74.</div>
        </div>
        <div>
          <div className="text-[7px] text-red-500 font-semibold mb-0.5">Gaps</div>
          <div className="text-[7px] text-muted-foreground">Occupancy remains 4% below target. F&B costs elevated.</div>
        </div>
        <div>
          <div className="text-[7px] text-amber-600 font-semibold mb-0.5">Recommendations</div>
          <div className="text-[7px] text-muted-foreground">Implement dynamic pricing to drive occupancy in off-peak periods.</div>
        </div>
      </div>
    </div>
  );
  if (type === "search") return (
    <div className="p-3 space-y-2">
      <div className="bg-background/80 rounded flex items-center gap-2 px-2 py-1.5">
        <Search className="h-2.5 w-2.5 text-muted-foreground" />
        <div className="text-[8px] text-muted-foreground">Search anything...</div>
      </div>
      {[{g:"Projects",items:["Loyalty Program Launch","Staff Retention Initiative"]},{g:"Tasks",items:["Design loyalty mockups","Review vendor quotes"]}].map((g,i) => (
        <div key={i}>
          <div className="text-[7px] text-muted-foreground font-semibold uppercase mb-1 px-1">{g.g}</div>
          {g.items.map((item,j) => (
            <div key={j} className="bg-background/80 rounded px-2 py-1 mb-0.5 text-[8px]">{item}</div>
          ))}
        </div>
      ))}
    </div>
  );
  if (type === "meetings") return (
    <div className="p-3 space-y-1.5">
      {[
        {t:"Monthly GM Review",d:"Feb 28",ac:4,type:"Monthly"},
        {t:"Ops Weekly Standup",d:"Mar 5",ac:6,type:"Weekly"},
      ].map((m,i) => (
        <div key={i} className="bg-background/80 rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[8px] font-medium">{m.t}</div>
            <div className="text-[7px] bg-primary/10 text-primary px-1 rounded">{m.type}</div>
          </div>
          <div className="text-[7px] text-muted-foreground">{m.d} · {m.ac} actions</div>
          <div className="flex gap-0.5 mt-1">
            {Array.from({length:m.ac}).map((_,j) => (
              <div key={j} className={`flex-1 h-1 rounded ${j<m.ac-2?"bg-emerald-400":"bg-muted"}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
  if (type === "planner") return (
    <div className="p-3 space-y-2">
      <div className="bg-background/80 rounded p-2">
        <div className="text-[7px] text-muted-foreground mb-1 flex items-center gap-1"><Sparkles className="h-2 w-2 text-primary" /> AI Recommended Layout</div>
        <div className="grid grid-cols-2 gap-1">
          {["KPI Health Donut","Revenue Trend","Action Status","Dept Summary"].map((c,i) => (
            <div key={i} className="bg-muted/50 rounded p-1 text-[7px] text-center text-muted-foreground">{c}</div>
          ))}
        </div>
      </div>
      <div className="text-[7px] text-muted-foreground px-1">Ready to export to Power BI or web</div>
    </div>
  );
  if (type === "settings") return (
    <div className="p-3 space-y-1.5">
      <div className="flex gap-2">
        <div className="w-16 space-y-1">
          {["Profile","Business","Goals","Departments","Users"].map((s,i) => (
            <div key={i} className={`text-[7px] px-1.5 py-0.5 rounded ${i===4?"bg-primary/10 text-primary":"text-muted-foreground"}`}>{s}</div>
          ))}
        </div>
        <div className="flex-1 bg-background/80 rounded p-2 space-y-1.5">
          <div className="text-[8px] font-semibold">User Management</div>
          {[{n:"Dharmesh S.",r:"Admin"},{n:"Ravi M.",r:"Executive"}].map((u,i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-primary/20 text-[6px] font-bold text-primary flex items-center justify-center">{u.n[0]}</div>
              <div className="text-[7px] flex-1">{u.n}</div>
              <div className={`text-[6px] px-1 rounded ${i===0?"bg-primary/10 text-primary":"bg-muted text-muted-foreground"}`}>{u.r}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  return <div className="p-4 text-xs text-muted-foreground text-center flex-1 flex items-center justify-center">Feature Preview</div>;
}

interface FeatureVideoCard {
  icon: React.ElementType;
  title: string;
  description: string;
  videoKey: string;
  color: string;
  bg: string;
  thumb: string;
}

function VideoCard({ feature, index }: { feature: FeatureVideoCard; index: number }) {
  const [open, setOpen] = useState(false);
  const youtubeId = DEMO_YOUTUBE_IDS[feature.videoKey];

  return (
    <>
      <Card
        className="group cursor-pointer hover:shadow-lg transition-all hover:border-primary/30 overflow-hidden"
        onClick={() => setOpen(true)}
        data-testid={`card-feature-video-${index}`}
      >
        <div className="relative bg-muted/40 border-b overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <div className="absolute inset-0 flex flex-col justify-center">
            <Thumbnail type={feature.thumb} />
          </div>
          <div className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white/90 shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Play className="h-5 w-5 text-primary ml-0.5" fill="currentColor" />
            </div>
          </div>
          <div className="absolute top-2 right-2">
            <span className="text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
              <Video className="h-2.5 w-2.5" /> Demo
            </span>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${feature.bg} shrink-0`}>
              <feature.icon className={`h-4 w-4 ${feature.color}`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">{feature.title} Demo Video</DialogTitle>
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-md ${feature.bg}`}>
                <feature.icon className={`h-3.5 w-3.5 ${feature.color}`} />
              </div>
              <span className="font-semibold text-sm">{feature.title} — Demo</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="bg-black" style={{ aspectRatio: "16/9" }}>
            {youtubeId ? (
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white/60">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                  <Video className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-white/80 mb-1">{feature.title}</p>
                  <p className="text-sm">Demo video coming soon</p>
                  <p className="text-xs mt-2 opacity-60">Add your YouTube video ID to DEMO_YOUTUBE_IDS at the top of this file</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
        <div className="text-center">
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setIsLogin(!isLogin)} data-testid="button-toggle-auth">
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </Button>
        </div>
        {isLogin && (
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground">Admin demo: demo@performo.ai / demo123</p>
            <p className="text-xs text-muted-foreground">Executive demo: exec@performo.ai / exec123</p>
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
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#demos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Demo Videos</a>
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
              Stop guessing, start measuring. Performo AI gives you AI-powered KPIs, project tracking, workload visibility, and monthly reviews — all in one platform built for growing businesses.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 h-12 shadow-md" onClick={() => setAuthOpen(true)} data-testid="button-hero-get-started">
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12" onClick={() => document.getElementById("demos")?.scrollIntoView({ behavior: "smooth" })} data-testid="button-hero-watch-demos">
                <Play className="ml-1 h-4 w-4 mr-2" fill="currentColor" /> Watch Demos
              </Button>
            </div>
          </div>

          {/* Hero dashboard mockup */}
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
      <section id="stats" className="border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center" data-testid={`stat-${i}`}>
                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</p>
                <p className="text-sm font-medium text-foreground">{stat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Demo Videos */}
      <section id="demos" className="py-20 md:py-28 bg-muted/20 border-y">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">
              <Play className="h-3 w-3 mr-1.5" fill="currentColor" /> Feature Demos
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-demos-title">
              See every feature
              <span className="text-primary"> in action</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Click any card to watch a demo of that feature. No sales calls, no PDFs — just the product.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {features.map((feature, i) => (
              <VideoCard key={i} feature={feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-features-title">
              Everything you need to
              <span className="text-primary"> manage performance &amp; execution</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              From AI-generated KPIs to project portfolio management — Performo AI covers the full performance and execution cycle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Performance Management</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                {features.slice(0, 6).map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:border-primary/20 transition-colors" data-testid={`card-feature-${i}`}>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${feature.bg} shrink-0`}>
                      <feature.icon className={`h-4 w-4 ${feature.color}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-1">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Execution Management</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                {features.slice(6, 12).map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:border-primary/20 transition-colors" data-testid={`card-feature-exec-${i}`}>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${feature.bg} shrink-0`}>
                      <feature.icon className={`h-4 w-4 ${feature.color}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-1">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              No complex setup. No consultants. Just smart AI that understands your business from day one.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <div key={i} className="relative text-center" data-testid={`step-${i}`}>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-bold mx-auto mb-4 shadow-md">
                  {step.step}
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-border" />
                )}
                <h3 className="text-sm font-semibold mb-2">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
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
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" data-testid="text-why-title">
              Built for growing businesses
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Most performance tools are built for enterprise teams with dedicated analysts. Performo AI is built for SME leaders who want results without complexity.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Zap,
                title: "No BI Tool Required",
                description: "Get executive-level insights without Power BI, Tableau, or data analysts. AI does the heavy lifting — you focus on decisions.",
                color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30",
              },
              {
                icon: Shield,
                title: "Industry-Specific AI",
                description: "AI trained to understand hospitality, retail, healthcare, F&B, and more. Your KPIs make sense from day one — no generic templates.",
                color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30",
              },
              {
                icon: TrendingUp,
                title: "Performance + Execution",
                description: "The only platform that connects KPI tracking with project execution. From goal to action to result — all in one place.",
                color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30",
              },
              {
                icon: Activity,
                title: "Real-Time Health Scoring",
                description: "Automated RAG health scoring for KPIs and projects. Red, Amber, Green — always know what needs attention without manual analysis.",
                color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30",
              },
              {
                icon: Users,
                title: "Team Accountability",
                description: "Every action has an owner. Every project has milestones. Full workload visibility so nothing falls through the cracks.",
                color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/30",
              },
              {
                icon: CheckCircle2,
                title: "Meeting-to-Action Bridge",
                description: "Turn every meeting into accountable actions with one click. Track progress from the boardroom to completion.",
                color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-900/30",
              },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-start p-6 rounded-2xl border bg-card hover:border-primary/20 transition-colors" data-testid={`card-benefit-${i}`}>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.bg} mb-4`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <h3 className="text-sm font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
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
            Join SMEs who use Performo AI to track KPIs, manage projects, and get AI-powered insights. Get started in minutes.
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
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <BarChart3 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">Performo AI</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#demos" className="hover:text-foreground transition-colors">Demos</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
              <a href="#why" className="hover:text-foreground transition-colors">Why Performo</a>
            </div>
            <p className="text-xs text-muted-foreground">AI-powered performance management for SMEs</p>
          </div>
        </div>
      </footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
