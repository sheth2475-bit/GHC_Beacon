import { useState } from "react";
import { Link } from "wouter";
import {
  LayoutDashboard, Target, ListChecks, Briefcase,
  Users, FileText, Bot, Settings2, Star, ArrowLeft, Menu, X,
  ChevronRight, Info, ArrowRight,
} from "lucide-react";

/* ─── Module definitions ─────────────────────────────────────── */
const MODULES = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "blue",
    screenshot: "/guide/dashboard.jpeg",
    screenshotAlt: "Performo AI Dashboard showing KPI summary cards, execution overview, and project progress bars",
    overview: "The Dashboard is your command centre. It surfaces the most important information across all modules in one place — KPI health, overdue actions, project status, and AI insights.",
    readingGuide: [
      { area: "Welcome banner", desc: "Shows today's date, your name, and a plain-English summary like \"20% of KPIs on track · 2 actions overdue · 1 action completed\" — your single-line business status." },
      { area: "KPI summary cards (top row)", desc: "Six stat cards: Total KPIs, On Track (green), Below Target (red), Total Actions, Overdue Actions, and Completed. Each shows a count and a % rate. Scan these first every morning." },
      { area: "Execution Overview panel", desc: "Shows Active Projects, At Risk projects, Overdue Tasks, and Upcoming Milestones from your Portfolio — great for a quick \"is execution healthy?\" check." },
      { area: "Project progress bars", desc: "Each active project appears with a coloured health bar (Green / Amber / Red). A red bar means the project is at risk. Click it to open the full project." },
    ],
    actions: [],
  },
  {
    id: "kpi-builder",
    label: "KPI Builder",
    icon: Target,
    color: "emerald",
    screenshot: "/guide/kpi-management.jpeg",
    screenshotAlt: "Performo AI KPI Management showing KPI table with targets, owners, thresholds and actual entry buttons",
    overview: "Use KPI Builder to generate a complete, industry-specific KPI library in seconds using AI. You only need to answer three questions.",
    readingGuide: [
      { area: "Industry dropdown", desc: "Select your sector (e.g. Hospitality, Retail, Manufacturing). The AI uses this to generate relevant KPIs with realistic targets." },
      { area: "Department dropdown", desc: "Choose which department to build KPIs for (Sales, Operations, HR, Finance). You can run the builder for each department separately." },
      { area: "Number of KPIs", desc: "Typically 5–15 per department. More KPIs give richer coverage but also require more data entry each month." },
      { area: "Generate KPIs button", desc: "Click this to call the AI. Within 10–15 seconds, it will return a full KPI list with names, descriptions, targets, thresholds, and suggested owners. Review each one before saving." },
      { area: "Review & save", desc: "Edit any KPI name, adjust the target, or change the suggested owner before confirming. Once saved, KPIs appear in KPI Management." },
    ],
    actions: [
      { step: "1", text: "Select Industry = your sector (e.g. Hospitality)" },
      { step: "2", text: "Select Department (start with your highest-priority team)" },
      { step: "3", text: "Enter number of KPIs (recommended: 8–12 per department)" },
      { step: "4", text: "Click Generate KPIs and wait ~10 seconds" },
      { step: "5", text: "Review each suggested KPI, edit targets if needed, and click Save" },
      { step: "6", text: "Repeat for each department" },
    ],
  },
  {
    id: "kpi-management",
    label: "KPI Management",
    icon: Target,
    color: "teal",
    screenshot: "/guide/kpi-management.jpeg",
    screenshotAlt: "KPI Management table with Occupancy Rate, ADR, RevPAR and other hospitality KPIs showing targets, owners and threshold indicators",
    overview: "KPI Management is your live KPI tracker. Every KPI lives here — you can view all KPIs, log actuals at month-end, check threshold status, and filter by department.",
    readingGuide: [
      { area: "Search & filter bar", desc: "Filter KPIs by department (Sales, Operations, HR, Finance) or tracking frequency (Monthly, Weekly, Quarterly). Use the search box to find a KPI by name or owner." },
      { area: "KPI Name column", desc: "The KPI name and its formula/description below it. Click the name to see the full KPI detail." },
      { area: "Target column", desc: "The target value set when the KPI was created (e.g. 85% for Occupancy Rate). This is what you are aiming to hit." },
      { area: "Trend (Latest) column", desc: "The most recently logged actual. Shows 'no data' until you enter an actual for the current period. Once entered, it shows the value and a ↑ or ↓ trend arrow." },
      { area: "Owner column", desc: "The person responsible for tracking and updating this KPI each period. They should log the actual figure monthly (or weekly, depending on frequency)." },
      { area: "Thresholds (colour dots)", desc: "Three coloured dots show the threshold bands — Green (on track), Amber (slightly off), Red (significantly off). Based on the actual vs target comparison." },
      { area: "+ Actual button", desc: "Click this at month-end to log the actual figure for this KPI. A dialog opens where you enter the value and a short note. This is your most important monthly action." },
    ],
    actions: [
      { step: "1", text: "At month-end, work through each KPI one by one" },
      { step: "2", text: "Click + Actual next to each KPI" },
      { step: "3", text: "Enter the actual value (e.g. 82 for Occupancy Rate)" },
      { step: "4", text: "Optionally add a note explaining any variance (e.g. 'Lower due to GITEX conference period')" },
      { step: "5", text: "Click Save — the Trend column updates immediately" },
      { step: "6", text: "Red/Amber thresholds will trigger notifications and appear in the Dashboard" },
    ],
  },
  {
    id: "action-tracker",
    label: "Action Tracker",
    icon: ListChecks,
    color: "violet",
    screenshot: "/guide/action-tracker.jpeg",
    screenshotAlt: "Action Tracker showing a table of action items with meeting types, owners, due dates, priorities and status dropdowns",
    overview: "The Action Tracker captures every commitment made in meetings and keeps them visible until completed. Nothing falls through the cracks.",
    readingGuide: [
      { area: "Meeting Type badge", desc: "Shows which meeting generated this action (CEO Meeting, Department Review, PMO Steering Committee). Lets you filter actions by meeting type." },
      { area: "Title & description", desc: "The action item title (e.g. 'Update budget forecast for Q2') and a brief description. Click the pencil icon to edit inline." },
      { area: "Owner column", desc: "The person responsible for completing this action. They appear in the Workload page too." },
      { area: "Due Date", desc: "The agreed deadline shown in DD-MM-YYYY format (e.g. 15-03-2026). Dates highlighted in red are overdue — they appear in the Dashboard's Overdue Actions count and trigger a notification." },
      { area: "Revised Due Date", desc: "If the due date changes, the revised date is logged here in DD-MM-YYYY format. Useful for tracking whether deadlines are slipping over time." },
      { area: "Priority badge", desc: "High (red), Medium (amber), or Low (grey). Filters let you show only High priority actions during standups." },
      { area: "Status dropdown", desc: "Set to Not Started, In Progress, Completed, or Delayed. Update this at every meeting or weekly review. Completed actions move off the active list." },
      { area: "Excel Upload", desc: "Bulk-import actions from a spreadsheet. Download the template (columns: Meeting Type, Title, Description, Owner, Due Date in DD-MM-YYYY, Priority, Status, Department), fill it in, then upload." },
    ],
    actions: [
      { step: "1", text: "After each meeting, click + New Action" },
      { step: "2", text: "Enter the Action Title (specific and outcome-focused)" },
      { step: "3", text: "Assign an Owner (the person who committed to this action)" },
      { step: "4", text: "Set a Due Date (DD-MM-YYYY) and Priority" },
      { step: "5", text: "Select the Meeting Type that generated this action" },
      { step: "6", text: "At your next meeting, update the Status dropdown to reflect progress" },
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    icon: Briefcase,
    color: "amber",
    screenshot: "/guide/portfolio.jpeg",
    screenshotAlt: "Project Portfolio grid showing 5 projects including Q2 Revenue Recovery Plan, Staff Retention Initiative, F&B Menu Overhaul and Loyalty Program Launch with health indicators",
    overview: "Portfolio gives you a bird's-eye view of all strategic projects. Projects are scored Green / Amber / Red based on task completion, overdue items, and milestone proximity.",
    readingGuide: [
      { area: "Summary stat bar (top row)", desc: "Total, Active, At Risk, Completed counts — plus Overdue Tasks and Upcoming Milestones. At Risk = project health is Red. Scan this to know where attention is needed." },
      { area: "Project card header colour", desc: "A thick coloured bar at the top of each card: Green = on track, Amber = needs attention, Red = at risk. This is calculated automatically from task status." },
      { area: "Project tags", desc: "Status badge (Not Started, In Progress, Completed), health indicator (Amber, Red), and Priority badge (High, Critical). These filter in the search bar above." },
      { area: "Progress bar", desc: "Shows % completion of tasks. Calculated from completed tasks / total tasks. 0% means not started, 100% means all tasks done." },
      { area: "Owner & deadline", desc: "Project owner and planned end date shown in DD-MM-YYYY format (e.g. 30-06-2026). If the end date has passed and progress is not 100%, the project turns Red." },
      { area: "Task count", desc: "e.g. '1/4 tasks' = 1 task completed out of 4 total. Click the card to see the full task list." },
    ],
    actions: [
      { step: "1", text: "Click + New Project and enter the project name, description, owner, and deadline (dates use DD-MM-YYYY format in Excel uploads; use the date picker for manual entry)" },
      { step: "2", text: "Open the project and add Tasks (with owners, due dates, priorities)" },
      { step: "3", text: "Add Milestones for key checkpoints (e.g. 'Phase 1 complete by April 30')" },
      { step: "4", text: "As work progresses, update task statuses (Not Started → In Progress → Completed)" },
      { step: "5", text: "The portfolio health score recalculates automatically — check it weekly" },
      { step: "6", text: "Use the Workload view to see if any team member is overloaded across projects" },
    ],
  },
  {
    id: "workload",
    label: "Workload",
    icon: Users,
    color: "indigo",
    screenshot: "/guide/workload.jpeg",
    screenshotAlt: "Team Workload view showing task distribution bars for team members Noura Bin Rashid, Khalid Mansoor and Priya Sharma with completion percentages",
    overview: "Workload shows every team member's task load across all projects. Use it to spot who is overloaded and who has capacity — before you assign more work.",
    readingGuide: [
      { area: "Summary row (top)", desc: "Team Members, Total Tasks, In Progress, and Overdue counts — a quick snapshot of whether the team is stretched." },
      { area: "Person row", desc: "Each team member appears as a row with their initials, task count, and completion %. A person with 0% complete and many tasks needs a check-in." },
      { area: "Colour bar", desc: "Each person's bar is split into Completed (green), In Progress (purple), Not Started (light grey), and Overdue (red). A long red segment = someone is behind." },
      { area: "Overdue badge", desc: "A red 'X overdue' badge appears on anyone with overdue tasks. These roll up to the Dashboard's Overdue count too." },
      { area: "Show tasks link", desc: "Click 'Show tasks (N)' to expand the task list for that person — see exactly which tasks they own and their current status." },
    ],
    actions: [
      { step: "1", text: "Review Workload every week before assigning new tasks" },
      { step: "2", text: "Anyone with a red Overdue badge needs an immediate follow-up" },
      { step: "3", text: "Expand task lists to understand what each person is working on" },
      { step: "4", text: "Rebalance by reassigning tasks in the project detail view" },
    ],
  },
  {
    id: "reviews",
    label: "Monthly Reviews",
    icon: FileText,
    color: "teal",
    screenshot: "/guide/monthly-reviews.jpeg",
    screenshotAlt: "Monthly Reviews page showing Generate Review form with Review Month selector and a generated February 2026 review with Executive Summary, Strengths section mentioning ADR exceeded target",
    overview: "Monthly Reviews uses AI to write a structured performance narrative each month — Executive Summary, Strengths, Gaps, and Recommendations. Ready for your board or leadership team.",
    readingGuide: [
      { area: "Generate Review form", desc: "Pick the review month and click Generate Monthly Review. The AI reads your KPI actuals and action data from that month to write the review. No manual writing needed." },
      { area: "Executive Summary section", desc: "A 3–4 sentence paragraph summarising overall business performance that month — revenue vs target, key wins, and headline risks. Use this as your board report opener." },
      { area: "Strengths section", desc: "A bullet list of what went well — KPIs that hit or exceeded target, projects that progressed as planned, notable team achievements." },
      { area: "Gaps & Risks section", desc: "KPIs that underperformed and projects at risk. The AI flags specific numbers (e.g. 'Occupancy Rate at 74% vs 82% target — 8pp below')." },
      { area: "Recommendations section", desc: "Actionable suggestions based on the gaps identified. These can be turned directly into actions in the Action Tracker." },
      { area: "Export PDF / Copy buttons", desc: "Export PDF generates a formatted PDF you can send to the board. Copy copies the full review text to your clipboard." },
    ],
    actions: [
      { step: "1", text: "First: log all KPI actuals for the month in KPI Management" },
      { step: "2", text: "Then navigate to Monthly Reviews" },
      { step: "3", text: "Select the Review Month from the date picker" },
      { step: "4", text: "Click Generate Monthly Review and wait ~10 seconds" },
      { step: "5", text: "Read through the generated review — edit any factual errors" },
      { step: "6", text: "Click Export PDF and share with your leadership team or board" },
    ],
  },
  {
    id: "planner",
    label: "Dashboard Planner",
    icon: LayoutDashboard,
    color: "orange",
    screenshot: "/guide/dashboard-planner.jpeg",
    screenshotAlt: "Dashboard Planner showing Generate Dashboard Plan form with Industry, Department and Management Level dropdowns, plus a generated Executive Operations Dashboard with visual preview",
    overview: "Dashboard Planner uses AI to design a custom, role-specific dashboard layout based on your industry, department, and management level. Great for setting up new users or board packs.",
    readingGuide: [
      { area: "Industry dropdown", desc: "Choose your sector. The AI uses industry-standard KPI groupings to organise the dashboard." },
      { area: "Department dropdown", desc: "All Departments for a CEO-level view, or a specific team for a departmental dashboard." },
      { area: "Management Level", desc: "Executive = high-level summary KPIs. Operational = granular, day-to-day metrics. Select based on the audience." },
      { area: "Generate Dashboard button", desc: "AI creates a full dashboard blueprint in seconds. It groups KPIs by category, assigns chart types, and adds context questions." },
      { area: "Visual Preview tab", desc: "See a rendered preview of the dashboard with your KPI data. Each KPI card shows the current value vs target and a trend indicator." },
      { area: "Structure View tab", desc: "The underlying JSON structure — copy this to configure a BI tool or share with a developer." },
    ],
    actions: [
      { step: "1", text: "Select Industry, Department, and Management Level" },
      { step: "2", text: "Click Generate Dashboard" },
      { step: "3", text: "Review the Visual Preview to confirm the layout suits your needs" },
      { step: "4", text: "Use the Copy JSON button to share or configure an external BI tool" },
    ],
  },
  {
    id: "assistant",
    label: "AI Assistant",
    icon: Bot,
    color: "blue",
    screenshot: "/guide/ai-assistant.jpeg",
    screenshotAlt: "AI Assistant drawer open on the right side of the screen showing the Performo Assistant with a sample question about GOP Margin and the response area",
    overview: "The AI Assistant reads all your live business data — KPIs, actions, projects, milestones, and reviews — and answers plain-English questions. It can also create and update records on your behalf.",
    readingGuide: [
      { area: "Open Assistant button", desc: "Click the ✦ Assistant button in the top-right header from any page. The drawer slides in without leaving your current view." },
      { area: "Context toggle", desc: "The toggle at the top controls whether the AI uses your company data as context. Keep it on (blue) so answers are grounded in your actual KPIs and actions." },
      { area: "Message input", desc: "Type any question in plain English. Be specific for better answers: 'Which KPIs are below target this month?' works better than 'How is the business doing?'" },
      { area: "AI response", desc: "The assistant responds with structured analysis — bullet points, tables, and specific numbers pulled from your data. Dates in responses are shown in DD-MM-YYYY format." },
      { area: "Quick prompts", desc: "Pre-built question shortcuts appear at the bottom — click one to instantly ask about overdue actions, at-risk projects, or generate a status summary." },
      { area: "Write actions", desc: "Admins can ask the assistant to create or update records: 'Add an action: Review supplier contracts, owner Omar, due 30-04-2026, High priority'. The assistant confirms before saving." },
      { area: "Daily AI limit", desc: "Each plan has a daily AI request limit. Check Settings > Subscription to see your limit and remaining requests. The count resets at midnight." },
    ],
    actions: [
      { step: "1", text: "Click the ✦ Assistant button (top-right, any page)" },
      { step: "2", text: "Confirm the context toggle is ON (blue)" },
      { step: "3", text: "Try: 'Which KPIs are below target this month?'" },
      { step: "4", text: "Try: 'Summarise our project portfolio status'" },
      { step: "5", text: "Try: 'What actions are overdue and who owns them?'" },
      { step: "6", text: "Try: 'Create an action item: [title], owner [name], due [date]'" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings2,
    color: "orange",
    screenshot: null,
    screenshotAlt: "",
    overview: "Settings is where you configure your company profile, manage departments, set up your team, and manage your subscription plan and activation key.",
    readingGuide: [
      { area: "Company Profile tab", desc: "Update your company name, industry, company size, and country. These details are used by the AI to generate relevant KPIs and performance insights." },
      { area: "Departments", desc: "Add departments as chip badges (e.g. Sales, Operations, HR, Finance). Click the × on any chip to remove it. Departments are used to filter KPIs and action items." },
      { area: "Strategic Goals", desc: "List your company's strategic goals for the year. The AI uses these when generating insights and recommendations." },
      { area: "Subscription card", desc: "Shows your current plan (Trial / Growth / Enterprise), your daily AI request limit and usage, and remaining trial days if you are on a free trial." },
      { area: "Trial countdown", desc: "If your account is on a 30-day free trial, a banner shows exactly how many days remain. When ≤ 7 days, it turns red. Enter your activation key below it to upgrade." },
      { area: "Activation Key field", desc: "Enter the key provided by your Performo account manager to upgrade from Trial to a paid plan. This removes the trial limit and unlocks higher AI usage." },
    ],
    actions: [
      { step: "1", text: "Go to Settings > Company Profile and fill in your company details" },
      { step: "2", text: "Add your Departments (at least one per team that uses KPIs)" },
      { step: "3", text: "Add 3–5 Strategic Goals — these guide the AI's recommendations" },
      { step: "4", text: "Check your Subscription card to see your AI limit and days remaining" },
      { step: "5", text: "Enter your Activation Key when ready to upgrade to a paid plan" },
    ],
  },
];

const COLOR_MAP: Record<string, { tab: string; badge: string; step: string; dot: string; border: string }> = {
  blue:   { tab: "bg-blue-600 text-white", badge: "bg-blue-50 text-blue-700 border-blue-200", step: "bg-blue-600", dot: "bg-blue-500", border: "border-blue-200" },
  emerald:{ tab: "bg-emerald-600 text-white", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", step: "bg-emerald-600", dot: "bg-emerald-500", border: "border-emerald-200" },
  teal:   { tab: "bg-teal-600 text-white", badge: "bg-teal-50 text-teal-700 border-teal-200", step: "bg-teal-600", dot: "bg-teal-500", border: "border-teal-200" },
  violet: { tab: "bg-violet-600 text-white", badge: "bg-violet-50 text-violet-700 border-violet-200", step: "bg-violet-600", dot: "bg-violet-500", border: "border-violet-200" },
  pink:   { tab: "bg-pink-600 text-white", badge: "bg-pink-50 text-pink-700 border-pink-200", step: "bg-pink-600", dot: "bg-pink-500", border: "border-pink-200" },
  amber:  { tab: "bg-amber-600 text-white", badge: "bg-amber-50 text-amber-700 border-amber-200", step: "bg-amber-600", dot: "bg-amber-500", border: "border-amber-200" },
  indigo: { tab: "bg-indigo-600 text-white", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", step: "bg-indigo-600", dot: "bg-indigo-500", border: "border-indigo-200" },
  orange: { tab: "bg-orange-600 text-white", badge: "bg-orange-50 text-orange-700 border-orange-200", step: "bg-orange-600", dot: "bg-orange-500", border: "border-orange-200" },
};

export default function Guide() {
  const [activeId, setActiveId] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const module = MODULES.find(m => m.id === activeId)!;
  const colors = COLOR_MAP[module.color] ?? COLOR_MAP.blue;

  function switchModule(id: string) {
    setActiveId(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <span className="text-gray-300">|</span>
            <span className="font-semibold text-gray-900 text-sm">Performo AI · User Guide</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              Try live: demo@performo.ai / demo123
            </div>
            <Link
              href="/login"
              className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open app
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto flex">
        {/* ── LEFT SIDEBAR (module list) ── */}
        <aside className="hidden lg:flex flex-col sticky top-14 h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Modules</p>
            <nav className="space-y-0.5">
              {MODULES.map(m => {
                const c = COLOR_MAP[m.color] ?? COLOR_MAP.blue;
                return (
                  <button
                    key={m.id}
                    onClick={() => switchModule(m.id)}
                    data-testid={`guide-tab-${m.id}`}
                    className={`w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      activeId === m.id
                        ? `${c.tab} shadow-sm`
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <m.icon className="h-4 w-4 shrink-0" />
                    <span className="font-medium">{m.label}</span>
                    {activeId === m.id && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {/* Mobile module picker */}
          <div className="lg:hidden mb-5">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium shadow-sm"
            >
              <span className="flex items-center gap-2">
                <module.icon className="h-4 w-4" />
                {module.label}
              </span>
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            {mobileMenuOpen && (
              <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {MODULES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => switchModule(m.id)}
                    className={`w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm ${activeId === m.id ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    <m.icon className="h-4 w-4 shrink-0" />
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Module header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.badge} border`}>
                <module.icon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{module.label}</h1>
                <p className="text-sm text-gray-500">Module guide · Performo AI</p>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed mt-3 max-w-3xl">{module.overview}</p>
          </div>

          {/* Screenshot */}
          {module.screenshot && (
            <div className="mb-8">
              <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2.5 ${colors.badge.split(" ")[1]}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                Screenshot — live demo data from OYO Hospitality Group
              </div>
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
                <img
                  src={module.screenshot}
                  alt={module.screenshotAlt}
                  className="w-full object-cover"
                  loading="lazy"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5 italic">Screenshot taken from the live demo account (demo@performo.ai). Your data will look similar.</p>
            </div>
          )}

          {/* Two column layout: reading guide + SOP steps */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Reading guide — 3 cols */}
            <div className="xl:col-span-3">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Info className="h-4 w-4 text-gray-400" />
                How to read this screen
              </h2>
              <div className="space-y-3">
                {module.readingGuide.map((item, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 transition-all">
                    <div className="flex items-start gap-3">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-bold shrink-0 mt-0.5 ${colors.step}`}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-0.5">{item.area}</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SOP steps — 2 cols */}
            {module.actions.length > 0 && (
              <div className="xl:col-span-2">
                <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-gray-400" />
                  Step-by-step — what to do
                </h2>
                <div className={`bg-white rounded-xl border-2 ${colors.border} p-5`}>
                  <div className="space-y-3">
                    {module.actions.map((action, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-bold shrink-0 mt-0.5 ${colors.step}`}>
                          {action.step}
                        </span>
                        <p className="text-sm text-gray-700 leading-relaxed">{action.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-4 pt-4 border-t ${colors.border}`}>
                    <p className="text-xs text-gray-400 italic">
                      Pro tip: The best-run companies on Performo complete these steps on the same day each month (e.g. 1st of the month for KPI actuals, 2nd for the review).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation between modules */}
          <div className="mt-10 flex items-center justify-between border-t border-gray-100 pt-6">
            {MODULES.indexOf(module) > 0 ? (
              <button
                onClick={() => switchModule(MODULES[MODULES.indexOf(module) - 1].id)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {MODULES[MODULES.indexOf(module) - 1].label}
              </button>
            ) : <div />}

            {MODULES.indexOf(module) < MODULES.length - 1 ? (
              <button
                onClick={() => switchModule(MODULES[MODULES.indexOf(module) + 1].id)}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                {MODULES[MODULES.indexOf(module) + 1].label}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                You're ready — open the app
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </main>

        {/* ── RIGHT — on-page TOC (optional for lg+ screens) ── */}
        <aside className="hidden 2xl:block sticky top-14 h-[calc(100vh-3.5rem)] w-52 shrink-0 border-l border-gray-100 bg-white overflow-y-auto p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">On this page</p>
          <div className="space-y-1 text-sm">
            <a href="#" className="block text-gray-600 hover:text-gray-900">Overview</a>
            {module.screenshot && <a href="#" className="block text-gray-600 hover:text-gray-900">Screenshot</a>}
            <a href="#" className="block text-gray-600 hover:text-gray-900">How to read the screen</a>
            {module.actions.length > 0 && <a href="#" className="block text-gray-600 hover:text-gray-900">Step-by-step</a>}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Jump to</p>
            <div className="space-y-0.5">
              {MODULES.map(m => (
                <button
                  key={m.id}
                  onClick={() => switchModule(m.id)}
                  className={`w-full text-left text-xs px-2 py-1 rounded-md transition-colors ${
                    activeId === m.id ? "text-blue-600 font-semibold bg-blue-50" : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
