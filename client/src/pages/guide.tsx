import { useState } from "react";
import { Link } from "wouter";
import {
  LayoutDashboard, Target, ListChecks, Briefcase,
  Users, FileText, Bot, Settings2, ArrowLeft, Menu, X,
  ChevronRight, Info, ArrowRight, Database, Upload, BarChart2,
  Pin, Lightbulb, Search, RefreshCw,
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
    overview: "The Dashboard is your command centre. It surfaces the most important information across all modules in one place — KPI health, overdue actions, project status, execution overview, and quick links to Analytics Studio dashboards.",
    readingGuide: [
      { area: "Welcome banner", desc: "Shows today's date, your name, and a plain-English summary like \"20% of KPIs on track · 2 actions overdue · 1 action completed\" — your single-line business status every morning." },
      { area: "KPI summary cards (top row)", desc: "Six stat cards: Total KPIs, On Track (green), Below Target (red), Total Actions, Overdue Actions, and Completed. Each shows a count and rate. Scan these first each day." },
      { area: "Execution Overview panel", desc: "Shows Active Projects, At Risk projects, Overdue Tasks, and Upcoming Milestones from your Portfolio — a quick 'is execution healthy?' check." },
      { area: "Project progress bars", desc: "Each active project appears with a coloured health bar (Green / Amber / Red). A red bar means the project is at risk. Click any bar to open the full project." },
      { area: "AI Assistant shortcut", desc: "The ✦ Assistant button in the top-right header opens a slide-in drawer from any page without losing your place." },
      { area: "Analytics Studio link", desc: "Use the nav sidebar to go to Analytics Studio — your hub for uploaded data, insights, and published dashboards. All analytics live there." },
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
    overview: "KPI Builder uses AI to generate a complete, industry-specific KPI library in seconds. Answer three questions — industry, department, and how many KPIs you want — and the AI does the rest.",
    readingGuide: [
      { area: "Industry dropdown", desc: "Select your sector (e.g. Hospitality, Retail, Manufacturing, Finance). The AI uses this to generate relevant KPIs with realistic targets and thresholds." },
      { area: "Department dropdown", desc: "Choose the department to build KPIs for (Sales, Operations, HR, Finance). Run the builder once per department to get full coverage." },
      { area: "Number of KPIs slider", desc: "Typically 5–15 per department. More KPIs give richer coverage but require more monthly data entry. Start with 8 for most teams." },
      { area: "Generate KPIs button", desc: "Click to call the AI. Within 10–15 seconds it returns a full KPI list with names, descriptions, targets, Red/Amber/Green thresholds, and suggested owners. Review before saving." },
      { area: "Review & save cards", desc: "Each generated KPI shows as an editable card. Adjust the target value, rename it, or change the suggested owner before confirming. Saved KPIs appear in KPI Management immediately." },
    ],
    actions: [
      { step: "1", text: "Select Industry = your sector (e.g. Hospitality)" },
      { step: "2", text: "Select Department (start with your highest-priority team)" },
      { step: "3", text: "Enter number of KPIs (recommended: 8–12 per department)" },
      { step: "4", text: "Click Generate KPIs and wait ~10 seconds" },
      { step: "5", text: "Review each KPI card, edit targets or owners if needed" },
      { step: "6", text: "Click Save All — repeat for each department" },
    ],
  },
  {
    id: "kpi-management",
    label: "KPI Management",
    icon: Target,
    color: "teal",
    screenshot: "/guide/kpi-management.jpeg",
    screenshotAlt: "KPI Management table with Occupancy Rate, ADR, RevPAR and other hospitality KPIs showing targets, owners and threshold indicators",
    overview: "KPI Management is your live KPI tracker. Every KPI lives here — view all KPIs, log actuals at month-end, check Red/Amber/Green threshold status, and filter by department or frequency.",
    readingGuide: [
      { area: "Search & filter bar", desc: "Filter KPIs by department (Sales, Operations, HR, Finance) or frequency (Monthly, Weekly, Quarterly). Use the search box to find a KPI by name or owner name." },
      { area: "KPI Name column", desc: "The KPI name and its formula/description below it. Click the row to see the full KPI detail panel." },
      { area: "Target column", desc: "The target value set when the KPI was created (e.g. 85% for Occupancy Rate). This is the benchmark you measure actuals against." },
      { area: "Trend (Latest) column", desc: "The most recently logged actual. Shows 'no data' until you enter an actual. Once entered, it shows the value and a ↑ or ↓ trend arrow vs the previous period." },
      { area: "Owner column", desc: "The person responsible for tracking and updating this KPI. They should log the actual figure each period (monthly, weekly, etc.)." },
      { area: "Threshold colour dots", desc: "Three coloured dots show the threshold bands: Green (on track), Amber (slightly off), Red (significantly off). Calculated automatically from actual vs target." },
      { area: "+ Actual button", desc: "Click at month-end to log the actual figure. A dialog opens where you enter the value and an optional note explaining variance. This is the most important monthly action." },
    ],
    actions: [
      { step: "1", text: "At month-end, work through each KPI in order" },
      { step: "2", text: "Click + Actual next to each KPI" },
      { step: "3", text: "Enter the actual value (e.g. 82 for Occupancy Rate)" },
      { step: "4", text: "Optionally add a note explaining any variance (e.g. 'Lower due to GITEX conference period')" },
      { step: "5", text: "Click Save — the Trend column updates immediately" },
      { step: "6", text: "Red/Amber thresholds will appear in the Dashboard and feed into the Monthly Review" },
    ],
  },
  {
    id: "action-tracker",
    label: "Action Tracker",
    icon: ListChecks,
    color: "violet",
    screenshot: "/guide/action-tracker.jpeg",
    screenshotAlt: "Action Tracker showing a table of action items with meeting types, owners, due dates, priorities and status dropdowns",
    overview: "The Action Tracker captures every commitment made in meetings and keeps them visible until completed. Nothing falls through the cracks — every overdue item surfaces in the Dashboard automatically.",
    readingGuide: [
      { area: "Meeting Type badge", desc: "Shows which meeting generated this action (CEO Meeting, Department Review, PMO Steering Committee). Lets you filter actions by meeting type to review at the relevant meeting." },
      { area: "Title & description", desc: "The action item title (e.g. 'Update budget forecast for Q2') and a brief description. Click the pencil icon to edit inline." },
      { area: "Owner column", desc: "The person responsible for completing this action. Their workload also appears in the Workload page across all projects." },
      { area: "Due Date", desc: "The agreed deadline shown in DD-MM-YYYY format. Dates highlighted in red are overdue — they appear in the Dashboard's Overdue Actions count and trigger a notification." },
      { area: "Revised Due Date", desc: "If the due date changes, the revised date is logged here. Useful for tracking whether deadlines are slipping over time — a pattern of revised dates flags poor planning." },
      { area: "Priority badge", desc: "High (red), Medium (amber), or Low (grey). Filter to show only High priority actions during standups and steering committees." },
      { area: "Status dropdown", desc: "Set to Not Started, In Progress, Completed, or Delayed. Update this at every meeting or weekly review. Completed actions move off the active list." },
      { area: "Excel Upload button", desc: "Bulk-import actions from a spreadsheet. Download the template (columns: Meeting Type, Title, Description, Owner, Due Date in DD-MM-YYYY, Priority, Status, Department), fill it in, and upload." },
    ],
    actions: [
      { step: "1", text: "After each meeting, click + New Action for every commitment made" },
      { step: "2", text: "Enter the Action Title (specific and outcome-focused, not vague like 'review options')" },
      { step: "3", text: "Assign an Owner — the single person who committed to this action" },
      { step: "4", text: "Set a Due Date (DD-MM-YYYY format) and Priority level" },
      { step: "5", text: "Select the Meeting Type that generated this action" },
      { step: "6", text: "At the next meeting, open the tracker and update each Status dropdown to reflect progress" },
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    icon: Briefcase,
    color: "amber",
    screenshot: "/guide/portfolio.jpeg",
    screenshotAlt: "Project Portfolio grid showing active projects including Staff Retention Initiative, F&B Menu Overhaul and Loyalty Program Launch with health indicators and progress bars",
    overview: "Portfolio gives you a bird's-eye view of all strategic projects. Each project is automatically scored Green / Amber / Red based on task completion rate, overdue items, and milestone proximity.",
    readingGuide: [
      { area: "Summary stat bar (top row)", desc: "Total, Active, At Risk, Completed counts — plus Overdue Tasks and Upcoming Milestones across the full portfolio. At Risk = project health is Red. Scan this weekly." },
      { area: "Project card header colour", desc: "A thick coloured bar at the top of each card: Green = on track, Amber = needs attention, Red = at risk. Calculated automatically from task status and deadlines." },
      { area: "Project tags", desc: "Status badge (Not Started, In Progress, Completed), health indicator (Amber, Red), and Priority badge (High, Critical). Use these to filter in the search bar above." },
      { area: "Progress bar", desc: "Shows % completion as completed tasks / total tasks. 0% = not started, 100% = all tasks done. If progress is low but deadline is near, the project goes Red." },
      { area: "Owner & deadline", desc: "Project owner and planned end date. If the end date has passed and progress is not 100%, the project automatically turns Red." },
      { area: "Task count", desc: "e.g. '1/4 tasks' = 1 task completed out of 4 total. Click the card to open the full task list and milestone view." },
    ],
    actions: [
      { step: "1", text: "Click + New Project — enter project name, description, owner, and deadline" },
      { step: "2", text: "Open the project and add Tasks (with owners, due dates, and priorities)" },
      { step: "3", text: "Add Milestones for key checkpoints (e.g. 'Phase 1 complete by April 30')" },
      { step: "4", text: "As work progresses, update task statuses (Not Started → In Progress → Completed)" },
      { step: "5", text: "The portfolio health score recalculates automatically — review it every Monday" },
      { step: "6", text: "Use the Workload view to confirm no team member is overloaded across projects" },
    ],
  },
  {
    id: "workload",
    label: "Workload",
    icon: Users,
    color: "indigo",
    screenshot: "/guide/workload.jpeg",
    screenshotAlt: "Team Workload view showing task distribution bars for team members with completion percentages and overdue task indicators",
    overview: "Workload shows every team member's task load across all projects. Use it to spot who is overloaded and who has capacity — before you assign more work and create burnout.",
    readingGuide: [
      { area: "Summary row (top)", desc: "Team Members, Total Tasks, In Progress, and Overdue counts — a quick snapshot of whether the team as a whole is stretched or comfortable." },
      { area: "Person row", desc: "Each team member appears as a row with their initials, total task count, and completion %. A person with 0% complete and many tasks needs a check-in immediately." },
      { area: "Colour bar segments", desc: "Each bar is split into Completed (green), In Progress (purple), Not Started (light grey), and Overdue (red). A long red segment means someone is significantly behind." },
      { area: "Overdue badge", desc: "A red 'X overdue' badge appears on anyone with overdue tasks. These roll up to the Dashboard's Overdue count and should be reviewed at every team standup." },
      { area: "Show tasks link", desc: "Click 'Show tasks (N)' to expand the task list for that person — see exactly which tasks they own and their current status. Use this to rebalance assignments." },
    ],
    actions: [
      { step: "1", text: "Review Workload every Monday before assigning new tasks" },
      { step: "2", text: "Anyone with a red Overdue badge needs an immediate follow-up before adding new work" },
      { step: "3", text: "Expand task lists to understand what each person is actually working on" },
      { step: "4", text: "Rebalance by reassigning tasks in the project detail view — change the Owner field on any task" },
    ],
  },
  {
    id: "analytics-studio",
    label: "Analytics Studio",
    icon: Database,
    color: "sky",
    screenshot: "/guide/analytics-studio-hub.jpeg",
    screenshotAlt: "Analytics Studio hub showing Dashboards tab with OYO Performance Analytics dashboard card, Insights (7), and Datasets & Ask Question (1) tabs, with stats bar showing 1 dataset, 7 insights, 1 dashboard, 1 published",
    overview: "Analytics Studio is Performo's built-in data intelligence layer. Upload any Excel or CSV file and ask questions in plain English — the AI selects the right chart, detects trends, flags anomalies, and identifies top and bottom performers automatically. Save insights and pin them to shared dashboards that your whole team can see.",
    badge: "New",
    readingGuide: [
      { area: "Hub — Dashboards tab (default)", desc: "The first thing you see when you open Analytics Studio. Shows all published and draft dashboards in your company. Each card shows the dashboard title, AI narrative summary, and how many pinned insights it contains. Click any dashboard card to open it." },
      { area: "Hub — Insights tab", desc: "A library of all saved insights across your company — charts and KPI cards generated from your datasets. Click any insight card to re-open the Insight Builder with that question and result loaded." },
      { area: "Hub — Datasets & Ask Question tab", desc: "All uploaded data files. Each dataset shows its name, number of rows, upload date, and configured column count. Click 'Explore & Ask' on any dataset to open the Insight Builder. Use the Upload button at the top right to add a new file." },
      { area: "Upload flow", desc: "Drop an Excel (.xlsx) or CSV file. Performo reads the file, creates the dataset, and auto-configures every column as a Measure (numeric, for aggregation), Dimension (categorical, for grouping), or Date. You can rename columns or override types before confirming." },
      { area: "Column configuration screen", desc: "After upload, each column appears with its detected type. Measures are shown in blue (e.g. Revenue, Occupancy Rate), Dimensions in violet (e.g. Property, Month), Dates in teal. Adjust any column type here before exploring." },
    ],
    actions: [
      { step: "1", text: "Go to Analytics Studio in the sidebar" },
      { step: "2", text: "Click Upload Dataset (top right) and drop your Excel or CSV file" },
      { step: "3", text: "Review the auto-detected column types — adjust if any measure is labelled as a dimension or vice versa" },
      { step: "4", text: "Click Confirm & Explore to open the Insight Builder" },
      { step: "5", text: "Type your first question (e.g. 'Which property had the highest revenue?') and press Ask" },
      { step: "6", text: "Use the Datasets & Ask Question tab to return to any dataset and ask new questions anytime" },
    ],
  },
  {
    id: "insight-builder",
    label: "Insight Builder",
    icon: BarChart2,
    color: "sky",
    screenshot: "/guide/analytics-insight-chart.jpeg",
    screenshotAlt: "Insight Builder showing a 3-column layout: left panel with field explorer (Revenue, ADR, Occupancy Rate etc as measures, Property and Month as dimensions), center panel with question 'What is the total revenue by property?' and a table result showing Dubai Marina at AED 31.8M as the top property, right panel showing Key Values with Dubai Marina as highest and Ajman Beach as lowest with AI analysis text",
    overview: "The Insight Builder is the 3-column interface you use to ask questions about your data and explore the results. Left panel: field explorer. Centre: question bar and chart. Right panel: interpretation, top/bottom performers, and AI analysis. Everything works together in real time.",
    badge: "New",
    readingGuide: [
      { area: "Left panel — Field Explorer", desc: "Lists all columns from your dataset grouped into Measures (numeric values like Revenue, Occupancy Rate), Dimensions (categories like Property, Month), and Dates. Click any field name to see its values. Fields you've used appear highlighted." },
      { area: "Question bar (centre top)", desc: "Type any question in plain English here — e.g. 'Show monthly revenue trend' or 'Which property has the lowest ADR?'. Press Enter or click Ask. The AI determines the best chart type, measure, dimension, and aggregation automatically." },
      { area: "Chart display area", desc: "The rendered chart appears below the question bar. The AI picks from 8 chart types: KPI scorecard, bar, column, line, area, pie, donut, and table. You can override the chart type using the type selector below the chart." },
      { area: "Trend badge (↑ / ↓)", desc: "If the AI detects a clear upward or downward trend in the result, a green '↑ Trending Up' or red '↓ Trending Down' badge appears next to the chart title. Hover to see the trend description." },
      { area: "Anomaly badge (⚡)", desc: "If any data point is statistically unusual (significantly above or below the pattern), an amber '⚡ Anomaly Detected' badge appears with a plain-English explanation of which value is anomalous and why." },
      { area: "Follow-up suggestion chips", desc: "After each result, 3 follow-up question chips appear below the chart. Click any chip to instantly ask the follow-up. If Context Mode is ON, the follow-up builds on the current result — the AI remembers your previous question and result." },
      { area: "Context Mode toggle", desc: "A toggle in the question bar area. When ON (blue), every follow-up question sends your previous question and result to the AI as context — enabling multi-turn exploration like 'Now break that down by month' or 'Filter to just Dubai Marina'." },
      { area: "Right panel — Interpretation", desc: "Shows the plain-English interpretation of your question, confirming how the AI read it (e.g. 'You are asking for total revenue grouped by property, aggregated as a sum'). Useful to verify the AI understood correctly." },
      { area: "Right panel — Top & Bottom performers", desc: "Two cards showing the highest-value and lowest-value entries in the result. E.g. 'Highest: Dubai Marina — AED 31.8M' and 'Lowest: RAK Resort — AED 10.5M'. These are highlighted in the chart." },
      { area: "Right panel — AI Analysis", desc: "A short narrative paragraph written by the AI interpreting the result in context — spotting the key gap, explaining likely causes, and suggesting what to investigate next." },
      { area: "Save Insight button", desc: "Saves the current question and chart to your Insights library. Saved insights can be pinned to a dashboard and shared with the team." },
      { area: "Pin to Dashboard button", desc: "After saving, pin the insight to any existing dashboard. It will appear as a chart card on that dashboard, visible to all team members with dashboard access." },
      { area: "Auto-suggested questions", desc: "When you first open a dataset, the AI generates 5+ starter questions based on the available columns. Click any to explore immediately without having to think of questions." },
    ],
    actions: [
      { step: "1", text: "Open any dataset from the Datasets tab and click Explore & Ask" },
      { step: "2", text: "Type a question or click one of the AI-suggested starter questions" },
      { step: "3", text: "Read the result — check the chart, the trend badge, and the right panel for top/bottom performers" },
      { step: "4", text: "Turn on Context Mode to ask follow-up questions that build on the current result" },
      { step: "5", text: "When you find a meaningful insight, click Save Insight, then Pin to Dashboard" },
      { step: "6", text: "Repeat for different questions — each saved insight builds your dashboard automatically" },
    ],
  },
  {
    id: "analytics-dashboards",
    label: "Analytics Dashboards",
    icon: Pin,
    color: "sky",
    screenshot: "/guide/analytics-dashboard.jpeg",
    screenshotAlt: "OYO Performance Analytics dashboard showing Published status badge, AI Executive Summary narrative, 7 insights count, and a grid of pinned chart cards including Total Revenue KPI card (96M AED), Total Revenue by Property bar chart, Monthly Revenue Trend line chart, Highest Average Occupancy Rate KPI, and ADR vs RevPAR comparison bar chart",
    overview: "Analytics Dashboards are shared canvases of pinned insights. Each dashboard shows a collection of charts you've saved from the Insight Builder. Dashboards can be published to the whole company or kept as private drafts. You can also add an AI-generated executive narrative that summarises all the charts in one paragraph.",
    badge: "New",
    readingGuide: [
      { area: "Dashboard cards (hub view)", desc: "Each dashboard card shows the title, description, status (Published / Draft), number of pinned insights, and a preview of the AI narrative summary. Published dashboards are visible to all team members." },
      { area: "Dashboard status badge", desc: "Published = visible to everyone. Draft = only visible to you and admins. Use Draft to build and test a dashboard before sharing it with the team." },
      { area: "Pinned insight grid", desc: "Inside a dashboard, each pinned insight appears as a chart card. The card shows the question that generated it, the chart, and a mini narrative. Cards can be reordered by dragging." },
      { area: "AI Narrative button", desc: "Click Generate Narrative inside a dashboard to have the AI write an executive summary of everything the charts are showing — highlighting key wins, risks, and recommendations across all pinned insights." },
      { area: "AI Narrative text", desc: "The generated narrative appears below the dashboard header. It covers: what the overall data shows, highlights (standout performers), risks (underperformers), and recommendations for action." },
      { area: "Publish / Unpublish toggle", desc: "Change a dashboard's status between Draft and Published. When you publish, all team members with Analytics Studio access can see it. Unpublish to return to Draft mode for updates." },
      { area: "New Dashboard button", desc: "Create a new empty dashboard with a title and description. Then go to the Insight Builder, run questions, and pin results to this dashboard to populate it." },
    ],
    actions: [
      { step: "1", text: "Go to Analytics Studio → Dashboards tab" },
      { step: "2", text: "Click + New Dashboard and give it a title (e.g. 'Q1 Hotel Performance')" },
      { step: "3", text: "Go to Datasets tab, open a dataset, and explore questions in the Insight Builder" },
      { step: "4", text: "When you find a useful chart, click Save Insight then Pin to Dashboard → select your new dashboard" },
      { step: "5", text: "Return to the dashboard — pinned insights appear as chart cards. Add as many as needed." },
      { step: "6", text: "Click Generate Narrative for an AI-written executive summary of all your charts, then Publish to share with the team" },
    ],
  },
  {
    id: "reviews",
    label: "Monthly Reviews",
    icon: FileText,
    color: "teal",
    screenshot: "/guide/monthly-reviews.jpeg",
    screenshotAlt: "Monthly Reviews page showing Generate Review form with Review Month selector and a generated February 2026 review with Executive Summary, Strengths, Gaps and Recommendations sections",
    overview: "Monthly Reviews uses AI to write a structured performance narrative each month — Executive Summary, Strengths, Gaps, and Recommendations. It reads your KPI actuals and action items automatically. Ready for your board or leadership team in under 15 seconds.",
    readingGuide: [
      { area: "Generate Review form", desc: "Pick the review month and click Generate Monthly Review. The AI reads your KPI actuals and action data from that month to write the review. No manual writing needed." },
      { area: "Executive Summary section", desc: "A 3–4 sentence paragraph summarising overall business performance that month — revenue vs target, key wins, and headline risks. Use this as your board report opener." },
      { area: "Strengths section", desc: "A bullet list of what went well — KPIs that hit or exceeded target, projects that progressed as planned, and notable team achievements during the period." },
      { area: "Gaps & Risks section", desc: "KPIs that underperformed and projects at risk. The AI flags specific numbers (e.g. 'Occupancy Rate at 74% vs 82% target — 8pp below') and the consequences." },
      { area: "Recommendations section", desc: "Actionable suggestions based on the gaps identified. These can be turned directly into actions in the Action Tracker. Copy them verbatim to save time." },
      { area: "Export PDF / Copy buttons", desc: "Export PDF generates a formatted PDF you can send to the board. Copy copies the full review text to your clipboard for pasting into an email or presentation." },
    ],
    actions: [
      { step: "1", text: "First: log all KPI actuals for the month in KPI Management" },
      { step: "2", text: "Navigate to Monthly Reviews" },
      { step: "3", text: "Select the Review Month from the date picker" },
      { step: "4", text: "Click Generate Monthly Review and wait ~10 seconds" },
      { step: "5", text: "Read through the generated review — edit any factual errors directly in the text" },
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
    overview: "Dashboard Planner uses AI to design a custom, role-specific KPI dashboard layout based on your industry, department, and management level. Great for setting up new users, preparing board packs, or onboarding new departments.",
    readingGuide: [
      { area: "Industry dropdown", desc: "Choose your sector. The AI uses industry-standard KPI groupings relevant to that sector (e.g. RevPAR and Occupancy Rate for Hospitality; Gross Margin and Inventory Turns for Retail)." },
      { area: "Department dropdown", desc: "All Departments for a CEO-level view, or a specific team for a focused departmental dashboard. Each option changes which KPIs are surfaced." },
      { area: "Management Level", desc: "Executive = high-level summary KPIs for strategic oversight. Operational = granular, day-to-day metrics for team managers. Select based on who will use the dashboard." },
      { area: "Generate Dashboard button", desc: "AI creates a full dashboard blueprint in seconds. It groups KPIs by category, assigns chart types, and adds context questions for each metric." },
      { area: "Visual Preview tab", desc: "See a rendered preview of the dashboard with your KPI data. Each KPI card shows the current value vs target and a trend indicator." },
      { area: "Structure View tab", desc: "The underlying JSON structure — copy this to configure an external BI tool or share with a developer who is building a custom integration." },
    ],
    actions: [
      { step: "1", text: "Select Industry, Department, and Management Level" },
      { step: "2", text: "Click Generate Dashboard and wait ~10 seconds" },
      { step: "3", text: "Review the Visual Preview to confirm the layout suits your audience" },
      { step: "4", text: "Use the Copy JSON button to share or configure an external BI tool if needed" },
    ],
  },
  {
    id: "assistant",
    label: "AI Assistant",
    icon: Bot,
    color: "blue",
    screenshot: "/guide/ai-assistant.jpeg",
    screenshotAlt: "AI Assistant drawer open on the right side of the screen showing the Performo Assistant with a sample question and structured response",
    overview: "The AI Assistant reads all your live business data — KPIs, actions, projects, milestones, and reviews — and answers plain-English questions in seconds. Admins can also ask it to create and update records on their behalf.",
    readingGuide: [
      { area: "Open Assistant button", desc: "Click the ✦ Assistant button in the top-right header from any page. The drawer slides in without leaving your current page or losing your scroll position." },
      { area: "Context toggle", desc: "The toggle at the top controls whether the AI uses your company data as context. Keep it ON (blue) so all answers are grounded in your actual KPIs, actions, and projects — not generic advice." },
      { area: "Message input", desc: "Type any question in plain English. Be specific for better answers: 'Which KPIs are below target this month?' works better than 'How is the business doing?'" },
      { area: "AI response", desc: "The assistant responds with structured analysis — bullet points, specific numbers from your data, and clear recommendations. Dates in responses are shown in DD-MM-YYYY format." },
      { area: "Quick prompts", desc: "Pre-built question shortcuts appear at the bottom of the drawer — click one to instantly ask about overdue actions, at-risk projects, or generate a status summary." },
      { area: "Write actions capability", desc: "Admins can ask the assistant to create or update records: 'Add an action: Review supplier contracts, owner Omar, due 30-04-2026, High priority'. It confirms before saving." },
      { area: "Daily AI limit", desc: "Each plan has a daily AI request limit (the Analytics Studio, AI Assistant, KPI Builder, and Monthly Reviews all share this limit). Check Settings → Subscription to see your usage." },
    ],
    actions: [
      { step: "1", text: "Click the ✦ Assistant button (top-right, any page)" },
      { step: "2", text: "Confirm the context toggle is ON (blue)" },
      { step: "3", text: "Try: 'Which KPIs are below target this month?'" },
      { step: "4", text: "Try: 'Summarise our project portfolio status'" },
      { step: "5", text: "Try: 'What actions are overdue and who owns them?'" },
      { step: "6", text: "Try (admin): 'Create an action: [title], owner [name], due [date], High priority'" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings2,
    color: "orange",
    screenshot: null,
    screenshotAlt: "",
    overview: "Settings is where you configure your company profile, manage departments, set strategic goals, manage team members, and handle your subscription. These details are used by the AI across all modules to give you relevant, grounded insights.",
    readingGuide: [
      { area: "Company Profile tab", desc: "Update your company name, industry, company size, and country. The AI uses these to generate relevant KPIs, review language, and Analytics Studio chart labels." },
      { area: "Departments", desc: "Add departments as chip badges (e.g. Sales, Operations, HR, Finance). Click the × on any chip to remove one. Departments are used to filter KPIs and action items across the platform." },
      { area: "Strategic Goals", desc: "List your company's 3–5 strategic goals for the year. The AI uses these when writing Monthly Reviews and generating Recommendations — goals make the AI's advice more specific and relevant." },
      { area: "Team Members tab", desc: "Invite team members by email and assign roles. Admin = full access. Team Member = can view and update. Executive = read-only access to dashboards and reviews." },
      { area: "Subscription card", desc: "Shows your current plan (Trial / Starter / Growth / Enterprise), your daily AI request limit, usage today, and remaining trial days if you are on a free trial." },
      { area: "Trial countdown", desc: "If your account is on a 30-day free trial, a banner shows exactly how many days remain. When ≤ 7 days, it turns red. Enter your activation key below it to upgrade to a paid plan." },
      { area: "Activation Key field", desc: "Enter the key provided by your Performo account manager to upgrade from Trial to a paid plan. This removes the trial limit and unlocks higher daily AI usage across all modules." },
    ],
    actions: [
      { step: "1", text: "Go to Settings → Company Profile and fill in your company details" },
      { step: "2", text: "Add your Departments (at least one per team that uses KPIs)" },
      { step: "3", text: "Add 3–5 Strategic Goals — these make the AI's Monthly Review recommendations much more specific" },
      { step: "4", text: "Invite your team members and assign the right roles (Admin / Team Member / Executive)" },
      { step: "5", text: "Check your Subscription card to monitor daily AI usage across all modules" },
      { step: "6", text: "Enter your Activation Key when ready to upgrade to a paid plan" },
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
  sky:    { tab: "bg-sky-600 text-white", badge: "bg-sky-50 text-sky-700 border-sky-200", step: "bg-sky-600", dot: "bg-sky-500", border: "border-sky-200" },
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

  const analyticsGroup = ["analytics-studio", "insight-builder", "analytics-dashboards"];

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
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto flex">
        {/* ── LEFT SIDEBAR (module list) ── */}
        <aside className="hidden lg:flex flex-col sticky top-14 h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Core Modules</p>
            <nav className="space-y-0.5">
              {MODULES.filter(m => !analyticsGroup.includes(m.id)).map(m => {
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
                  </button>
                );
              })}
            </nav>

            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-5 mb-3 flex items-center gap-1.5">
              Analytics Studio
              <span className="text-[9px] bg-sky-600 text-white px-1.5 py-0.5 rounded-full font-bold">New</span>
            </p>
            <nav className="space-y-0.5">
              {MODULES.filter(m => analyticsGroup.includes(m.id)).map(m => {
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
                <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">Core Modules</div>
                {MODULES.filter(m => !analyticsGroup.includes(m.id)).map(m => (
                  <button
                    key={m.id}
                    onClick={() => switchModule(m.id)}
                    className={`w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm ${activeId === m.id ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    <m.icon className="h-4 w-4 shrink-0" />
                    {m.label}
                  </button>
                ))}
                <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 border-t">Analytics Studio — New</div>
                {MODULES.filter(m => analyticsGroup.includes(m.id)).map(m => (
                  <button
                    key={m.id}
                    onClick={() => switchModule(m.id)}
                    className={`w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-sm ${activeId === m.id ? "bg-sky-50 text-sky-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
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
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.badge} border`}>
                <module.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">{module.label}</h1>
                  {(module as any).badge && (
                    <span className="text-xs font-bold bg-sky-600 text-white px-2 py-0.5 rounded-full">{(module as any).badge}</span>
                  )}
                </div>
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

          {/* Analytics Studio — no screenshot placeholder */}
          {!module.screenshot && analyticsGroup.includes(module.id) && (
            <div className="mb-8 rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/40 p-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 shrink-0">
                <module.icon className="h-6 w-6 text-sky-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-sky-700">Try it live</p>
                <p className="text-sm text-sky-600 mt-0.5">
                  Log in with <span className="font-mono font-semibold">demo@performo.ai / demo123</span> and open Analytics Studio to explore the OYO Hotel Performance dataset with 60 rows of real hotel data across 5 UAE properties.
                </p>
              </div>
              <Link href="/login" className="ml-auto shrink-0 bg-sky-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-sky-700 transition-colors whitespace-nowrap">
                Open demo →
              </Link>
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
                      Pro tip: The best-run companies on Performo complete these steps on the same day each month (e.g. 1st for KPI actuals, 2nd for the review, 3rd for Analytics Studio dashboards).
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

        {/* ── RIGHT — on-page TOC ── */}
        <aside className="hidden 2xl:block sticky top-14 h-[calc(100vh-3.5rem)] w-52 shrink-0 border-l border-gray-100 bg-white overflow-y-auto p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">On this page</p>
          <div className="space-y-1 text-sm">
            <a href="#" className="block text-gray-600 hover:text-gray-900">Overview</a>
            {module.screenshot && <a href="#" className="block text-gray-600 hover:text-gray-900">Screenshot</a>}
            <a href="#" className="block text-gray-600 hover:text-gray-900">How to read the screen</a>
            {module.actions.length > 0 && <a href="#" className="block text-gray-600 hover:text-gray-900">Step-by-step</a>}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Core Modules</p>
            <div className="space-y-0.5">
              {MODULES.filter(m => !analyticsGroup.includes(m.id)).map(m => (
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-4 mb-2">Analytics Studio</p>
            <div className="space-y-0.5">
              {MODULES.filter(m => analyticsGroup.includes(m.id)).map(m => (
                <button
                  key={m.id}
                  onClick={() => switchModule(m.id)}
                  className={`w-full text-left text-xs px-2 py-1 rounded-md transition-colors ${
                    activeId === m.id ? "text-sky-600 font-semibold bg-sky-50" : "text-gray-500 hover:text-gray-800"
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
