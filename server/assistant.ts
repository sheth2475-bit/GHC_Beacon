import OpenAI from "openai";
import { storage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PendingAction {
  type: string;
  label: string;
  data: Record<string, any>;
}

export interface ResponseLink {
  label: string;
  url: string;
}

export interface QuickAction {
  label: string;
  pendingAction: PendingAction;
}

export interface AssistantResponse {
  type: "answer" | "question" | "confirmation" | "success" | "error";
  message: string;
  links?: ResponseLink[];
  quickActions?: QuickAction[];
  pendingAction?: PendingAction | null;
}

function cleanJson(s: string) {
  return s.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

function daysDiff(dateStr: string, today: string): number {
  return Math.floor(
    (new Date(today).getTime() - new Date(dateStr).getTime()) / 86400000
  );
}

function daysUntil(dateStr: string, today: string): number {
  return Math.floor(
    (new Date(dateStr).getTime() - new Date(today).getTime()) / 86400000
  );
}

function variance(actual: number, target: number): string {
  const abs = actual - target;
  const pct = target !== 0 ? ((abs / target) * 100).toFixed(1) : "N/A";
  const sign = abs >= 0 ? "+" : "";
  return `${sign}${abs.toFixed(abs % 1 === 0 ? 0 : 1)} (${sign}${pct}%)`;
}

async function buildContext(companyId: number): Promise<string> {
  const today = new Date().toISOString().split("T")[0];

  const [
    kpiList, projects, actionItems, meetings, reviews, tasks, milestones,
    departments, company, users,
  ] = await Promise.all([
    storage.getKpis(companyId),
    storage.getProjects(companyId),
    storage.getActionItems(companyId),
    storage.getMeetings(companyId),
    storage.getMonthlyReviews(companyId),
    storage.getTasks(companyId),
    storage.getMilestones(companyId),
    storage.getDepartments(companyId),
    storage.getCompany(companyId),
    storage.getUsersByCompany(companyId),
  ]);

  const goals = await storage.getBusinessGoals(companyId);

  const deptMap: Record<number, string> = {};
  for (const d of departments) deptMap[d.id] = d.name;

  const projectMap: Record<number, string> = {};
  for (const p of projects) projectMap[p.id] = p.name;

  // KPI actuals — last 3 months with pre-computed variance
  const kpiActualsMap: Record<number, { actual: string; status: string; month: string; commentary: string | null }[]> = {};
  for (const kpi of kpiList) {
    const actuals = await storage.getKpiActuals(kpi.id);
    kpiActualsMap[kpi.id] = actuals
      .sort((a, b) => b.reviewMonth.localeCompare(a.reviewMonth))
      .slice(0, 3)
      .map(a => ({ actual: a.actualValue || "", status: a.status || "", month: a.reviewMonth, commentary: a.commentary }));
  }

  // KPI block with pre-computed variance
  const kpiSummary = kpiList.map(k => {
    const recents = kpiActualsMap[k.id] || [];
    const latest = recents[0];
    let varStr = "";
    if (latest && latest.actual) {
      const a = parseFloat(latest.actual);
      const t = parseFloat(k.targetValue || "0");
      if (!isNaN(a) && !isNaN(t) && t !== 0) varStr = ` | Variance:${variance(a, t)}`;
    }
    const trend = recents.length >= 2
      ? recents.map(r => `${r.month}:${r.actual}${k.unit}[${r.status}]`).join("→")
      : latest ? `Only one data point: ${latest.actual}${k.unit}[${latest.status}]` : "No actuals";
    return `  KPI[${k.id}] "${k.kpiName}" | Dept:${deptMap[k.departmentId!] || "N/A"} | Target:${k.targetValue}${k.unit} | Owner:${k.ownerName}${latest ? ` | Latest(${latest.month}):${latest.actual}${k.unit} Status:${latest.status}${varStr}` : " | NO ACTUALS"} | 3mo-Trend:${trend}`;
  }).join("\n");

  // Projects block with derived health and days calc
  const projectSummary = projects.map(p => {
    const projectTasks = tasks.filter(t => t.projectId === p.id);
    const overdueTasks = projectTasks.filter(t => t.dueDate && t.dueDate < today && t.status !== "Completed");
    const completedTasks = projectTasks.filter(t => t.status === "Completed").length;
    const totalTasks = projectTasks.length;
    const projectMilestones = milestones.filter(m => m.projectId === p.id);
    const upcomingMs = projectMilestones.filter(m => m.status !== "Completed");
    const nextMilestone = upcomingMs.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))[0];
    const daysLeft = p.dueDate ? daysUntil(p.dueDate, today) : null;
    const dueSummary = daysLeft !== null ? (daysLeft < 0 ? `OVERDUE by ${Math.abs(daysLeft)}d` : `${daysLeft}d remaining`) : "No due date";
    return `  Project[${p.id}] "${p.name}" | Owner:${p.owner || "Unassigned"} | Status:${p.status} | Priority:${p.priority} | Progress:${p.progress}% | Due:${p.dueDate || "N/A"}(${dueSummary}) | Dept:${deptMap[p.departmentId!] || "N/A"} | Tasks:${completedTasks}/${totalTasks} done | OverdueTasks:${overdueTasks.length}${overdueTasks.length > 0 ? `(${overdueTasks.map(t => `"${t.title}"`).join(",")})` : ""} | NextMilestone:${nextMilestone ? `"${nextMilestone.title}"(Due:${nextMilestone.dueDate},${nextMilestone.progress}%progress)` : "None"}`;
  }).join("\n");

  // Action items with overdue days
  const actionSummary = actionItems.map(a => {
    const effectiveDue = a.revisedDueDate || a.dueDate || "";
    const isOverdue = effectiveDue && effectiveDue < today && a.status !== "Completed";
    const overdueStr = isOverdue ? ` | OVERDUE by ${daysDiff(effectiveDue, today)}d` : "";
    return `  Action[${a.id}] "${a.title}" | Owner:${a.ownerName} | Due:${effectiveDue || "N/A"}${a.revisedDueDate ? "(revised)" : ""} | Status:${a.status} | Priority:${a.priority} | Type:${a.meetingType || "N/A"}${overdueStr}`;
  }).join("\n");

  // Tasks with project names and overdue days
  const taskSummary = tasks.slice(0, 40).map(t => {
    const isOverdue = t.dueDate && t.dueDate < today && t.status !== "Completed";
    const overdueStr = isOverdue ? ` | OVERDUE by ${daysDiff(t.dueDate!, today)}d` : "";
    const daysLeft = t.dueDate && t.status !== "Completed" ? daysUntil(t.dueDate, today) : null;
    const dueStr = daysLeft !== null && daysLeft >= 0 ? `${daysLeft}d remaining` : "";
    return `  Task[${t.id}] "${t.title}" | Project:"${projectMap[t.projectId!] || "N/A"}"[ID:${t.projectId}] | Assignee:${t.assignee || "Unassigned"} | Status:${t.status} | Priority:${t.priority || "N/A"} | Due:${t.dueDate || "N/A"}${dueStr}${overdueStr}`;
  }).join("\n");

  // Milestones with days calc
  const milestoneSummary = milestones.map(m => {
    const isOverdue = m.dueDate && m.dueDate < today && m.status !== "Completed";
    const daysLeft = m.dueDate ? daysUntil(m.dueDate, today) : null;
    const dueStr = daysLeft !== null ? (daysLeft < 0 ? `OVERDUE by ${Math.abs(daysLeft)}d` : `${daysLeft}d remaining`) : "";
    return `  Milestone[${m.id}] "${m.title}" | Project:"${projectMap[m.projectId!] || "N/A"}"[ID:${m.projectId}] | Status:${m.status} | Progress:${m.progress}% | Due:${m.dueDate || "N/A"}(${dueStr})`;
  }).join("\n");

  const meetingSummary = meetings.slice(0, 8).map(m =>
    `  Meeting[${m.id}] "${m.title}" | Date:${m.meetingDate} | Dept:${deptMap[m.departmentId!] || "N/A"} | Type:${m.meetingType || "N/A"}`
  ).join("\n");

  const reviewsSummary = reviews
    .sort((a, b) => b.reviewMonth.localeCompare(a.reviewMonth))
    .slice(0, 2)
    .map(r => `  Review[${r.id}] Month:${r.reviewMonth}
    Summary:${r.overallSummary?.slice(0, 500)}
    Strengths:${r.strengths?.slice(0, 300)}
    Gaps:${r.gaps?.slice(0, 300)}
    Recommendations:${r.recommendations?.slice(0, 300)}`)
    .join("\n");

  const userSummary = users.map(u => `${u.name}(${u.role},email:${u.email})`).join(", ");
  const goalsSummary = goals.map(g => `"${g.goalText}"`).join("; ");

  // Pre-compute headline stats
  const overdueActions = actionItems.filter(a => a.status !== "Completed" && a.dueDate && (a.revisedDueDate || a.dueDate) < today);
  const openActions = actionItems.filter(a => a.status !== "Completed");
  const overdueTasks = tasks.filter(t => t.status !== "Completed" && t.dueDate && t.dueDate < today);
  const belowTargetKpis = kpiList.filter(k => {
    const s = (kpiActualsMap[k.id] || [])[0]?.status || "";
    return s === "Below Target" || s === "At Risk" || s === "Red";
  });
  const onTrackKpis = kpiList.filter(k => (kpiActualsMap[k.id] || [])[0]?.status === "On Track");
  const redProjects = projects.filter(p => p.status === "At Risk" || p.status === "Delayed");

  return `TODAY: ${today}
COMPANY: ${company?.companyName || "N/A"} | Industry: ${company?.industry || "N/A"} | Size: ${company?.companySize || "N/A"}
STRATEGIC GOALS: ${goalsSummary || "None set"}
TEAM MEMBERS: ${userSummary}
DEPARTMENTS: ${departments.map(d => `${d.name}[ID:${d.id}]`).join(", ")}

HEADLINE STATS (pre-computed):
- KPIs: ${belowTargetKpis.length} below target | ${onTrackKpis.length} on track | ${kpiList.filter(k => !(kpiActualsMap[k.id] || [])[0]).length} no data
- Actions: ${overdueActions.length} overdue | ${openActions.length} open total
- Tasks: ${overdueTasks.length} overdue
- Projects: ${redProjects.length} at risk/delayed | ${projects.filter(p => p.status === "In Progress").length} in progress

KPIs (${kpiList.length} total | with variance and 3-month trend):
${kpiSummary || "  None"}

PROJECTS (${projects.length} total | with task breakdown, milestones, days remaining):
${projectSummary || "  None"}

ALL ACTION ITEMS (${actionItems.length} total | with overdue days):
${actionSummary || "  None"}

TASKS (${tasks.length} total | showing up to 40 | with project name and overdue days):
${taskSummary || "  None"}

MILESTONES (${milestones.length} total | with days remaining):
${milestoneSummary || "  None"}

RECENT MEETINGS (last 8):
${meetingSummary || "  None"}

MONTHLY REVIEWS (last 2):
${reviewsSummary || "  None"}`;
}

const SYSTEM_PROMPT = (context: string, userName: string, userRole: string, canWrite: boolean) => `You are Performo Assistant — a premium AI copilot for business performance management. You operate like a senior PMO, strategy analyst, and operations director embedded inside Performo AI.

You serve ${userName} (role: ${userRole}). You have real-time access to all company data below.

COMPANY DATA:
${context}

IN-APP ROUTES (use in "links"):
/ = Dashboard | /kpis = KPI Management | /kpi-builder = KPI Builder | /actions = Action Tracker | /reviews = Monthly Reviews | /planner = Dashboard Planner | /portfolio = Project Portfolio | /projects/{id} = Project Detail | /workload = Team Workload | /settings = Settings | /users = User Management

NOTE: There is NO /meetings route — the Meetings module has been removed. Action items are managed entirely in the Action Tracker (/actions).

${canWrite ? `WRITE PERMISSIONS: Full (Admin) — can create/update/close any record` : `WRITE PERMISSIONS: None (Executive) — read-only. Politely decline all modification requests.`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VOICE & TONE — STRICTLY FOLLOW THESE RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Lead with the key finding. Never open with "Sure," "Of course," "Great question," or "I'd be happy to."
2. Use direct business language. "3 KPIs are below target" not "There appear to be some KPIs that may be below target."
3. Every number must show context: value + variance from target + direction. e.g. "33% vs 35% target (−2pp)" not just "33%."
4. Always use status symbols for scan-ability: 🟢 On Track  🟡 Amber/At Risk  🔴 Below Target/Critical  ⚠️ Overdue
5. Overdue = state DAYS overdue, not just "overdue." e.g. "⚠️ Overdue by 26 days"
6. Name specific entities — people, project names, KPI names. Never say "a project" when you have the name.
7. Cross-connect modules. If a KPI is below target, name the project addressing it and its status. If an action item is overdue, name the owner.
8. End every analytical answer with a "**Recommended Actions**" section listing 2-4 specific, data-driven next steps.
9. Be concise. If the answer is 1 sentence, write 1 sentence. No padding.
10. Never fabricate data. Use only what is in the context above.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE PATTERNS BY QUERY TYPE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**KPI queries (below target / status / trend):**
- Open with: "X of Y KPIs tracked | Z below target" summary line
- List each KPI with: 🔴/🟢/🟡 Name — actual vs target (variance) | Owner | Dept
- Show 3-month trend direction: ↑ Improving / ↓ Declining / → Stable
- Cross-reference: mention the project/initiative addressing each gap KPI, and its current progress
- Recommended Actions: specific owner + action

**Project queries (at risk / status / progress):**
- For each project: status icon + name + progress % + days remaining/overdue + owner
- Show: X/Y tasks done | N overdue tasks | Next milestone + due date
- Highlight: what specifically makes it at risk (overdue tasks, no progress, past due)
- Recommended Actions: who should act, on what, by when

**Action item queries (overdue / by owner / priority):**
- Group by owner if "by owner" query; sort by overdue days descending
- For each: ⚠️ Title | Owner | Days overdue | Status | Priority
- Cross-reference: which project or meeting this action belongs to

**Team/workload queries:**
- Group open tasks + actions by person
- Show: Name — X open tasks (Y overdue), X open actions (Y overdue)
- Identify who is most overloaded

**Performance summary / review queries:**
- Pull from latest monthly review
- Structure: Wins | Gaps | Risks | Recommendations
- Link to /reviews

**Strategic goal alignment queries:**
- Map each goal to the KPIs and projects tracking it
- Show current gap vs target for each

**Disambiguation rules:**
- If user mentions a name that fuzzy-matches multiple records, list all matches and ask which one
- If user says "the loyalty program" → match Project[1] "Loyalty Program Launch"
- If user asks about "turnover" → match both KPI[6] "Employee Turnover Rate" and Project[3] if relevant

**Write operation rules:**
${canWrite ? `
- If all required fields are present → type="confirmation" with complete pendingAction
- If missing fields → type="question", ask for ONLY the missing specific fields (not a generic "give me more details")
- Include quickActions for related operations (e.g., after showing overdue actions, offer "Mark [X] Complete" buttons)
- NEVER execute writes without confirmation
` : `- type="error" for all write requests with a clear explanation`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE JSON SCHEMA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "type": "answer" | "question" | "confirmation" | "error",
  "message": "Direct, markdown-formatted business response following the voice rules above",
  "links": [
    { "label": "Short action label", "url": "/route" }
  ],
  "quickActions": [
    {
      "label": "Button text (e.g. Mark Complete, Reschedule, Update Status)",
      "pendingAction": {
        "type": "action_type",
        "label": "Human-readable description",
        "data": { ...exact fields... }
      }
    }
  ],
  "pendingAction": null | { "type": "...", "label": "...", "data": { ... } }
}

OPERATION TYPES AND REQUIRED FIELDS:
- create_project: { name, description?, owner?, status, priority, dueDate?, departmentId?, businessUnit? }
- create_task: { title, projectId, assignee?, status, priority, dueDate?, description? }
- create_action_item: { title, ownerName, dueDate(YYYY-MM-DD), priority, status, departmentId?, meetingType?, description? }
- create_milestone: { title, projectId, dueDate(YYYY-MM-DD), status, progress }
NOTE: Dates are stored internally as YYYY-MM-DD but displayed to users as DD-MM-YYYY. Always use YYYY-MM-DD format when creating/updating records.
- update_project: { id, ...fields to change }
- update_task: { id, ...fields to change }
- update_action_item: { id, ...fields to change }
- update_milestone: { id, ...fields to change }
- update_kpi_actual: { kpiId, reviewMonth(YYYY-MM), actualValue(string), status("On Track"|"Below Target"|"At Risk"), commentary? }
- close_task: { id }
- close_action: { id }

Important: All IDs must be integers. Dates in YYYY-MM-DD. KPI actualValue as string (e.g., "33" not 33).`;

export async function processAssistantMessage(
  messages: ChatMessage[],
  companyId: number,
  userId: number,
  userName: string,
  userRole: string,
  confirmedAction?: PendingAction
): Promise<AssistantResponse> {

  if (confirmedAction) {
    return executeAction(confirmedAction, companyId, userId, userName, userRole);
  }

  const canWrite = userRole === "admin";
  const context = await buildContext(companyId);

  const cleanMessages = messages
    .filter(m => m.content != null && m.content.trim() !== "")
    .map(m => ({ role: m.role, content: String(m.content) }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_completion_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT(context, userName, userRole, canWrite) },
      ...cleanMessages,
    ],
  });

  const raw = response.choices[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(cleanJson(raw));
    return {
      type: parsed.type || "answer",
      message: parsed.message || "I couldn't process that request.",
      links: Array.isArray(parsed.links) ? parsed.links : [],
      quickActions: Array.isArray(parsed.quickActions) ? parsed.quickActions : [],
      pendingAction: parsed.pendingAction || null,
    };
  } catch {
    return { type: "error", message: "Sorry, I encountered an issue parsing the response. Please try again.", links: [], quickActions: [] };
  }
}

async function executeAction(
  action: PendingAction,
  companyId: number,
  userId: number,
  userName: string,
  userRole: string
): Promise<AssistantResponse> {
  if (userRole !== "admin") {
    return { type: "error", message: "You don't have permission to make changes.", links: [], quickActions: [] };
  }

  try {
    let resultMessage = "";
    let entityType = "";
    let entityId: number | undefined;
    const resultLinks: ResponseLink[] = [];

    switch (action.type) {
      case "create_project": {
        const proj = await storage.createProject({
          companyId,
          name: action.data.name,
          description: action.data.description || null,
          owner: action.data.owner || null,
          departmentId: action.data.departmentId || null,
          businessUnit: action.data.businessUnit || null,
          startDate: action.data.startDate || null,
          dueDate: action.data.dueDate || null,
          status: action.data.status || "Not Started",
          priority: action.data.priority || "Medium",
          progress: 0,
          tags: null,
          linkedKpiId: null,
        });
        entityType = "project";
        entityId = proj.id;
        resultMessage = `🟢 **Project created:** "${proj.name}" added to portfolio.\n\nPriority: **${proj.priority}** | Owner: **${proj.owner || "Unassigned"}** | Due: **${proj.dueDate || "Not set"}**`;
        resultLinks.push({ label: "Open Project", url: `/projects/${proj.id}` });
        resultLinks.push({ label: "View Portfolio", url: "/portfolio" });
        break;
      }
      case "create_task": {
        const task = await storage.createTask({
          companyId,
          projectId: action.data.projectId || null,
          title: action.data.title,
          description: action.data.description || null,
          assignee: action.data.assignee || null,
          status: action.data.status || "Not Started",
          priority: action.data.priority || "Medium",
          startDate: null,
          dueDate: action.data.dueDate || null,
          progress: 0,
          tags: null,
        });
        entityType = "task";
        entityId = task.id;
        resultMessage = `🟢 **Task created:** "${task.title}"\n\nAssignee: **${task.assignee || "Unassigned"}** | Due: **${task.dueDate || "Not set"}** | Priority: **${task.priority}**`;
        if (task.projectId) resultLinks.push({ label: "Open Project", url: `/projects/${task.projectId}` });
        break;
      }
      case "create_action_item": {
        const item = await storage.createActionItem({
          companyId,
          meetingId: action.data.meetingId || null,
          departmentId: action.data.departmentId || null,
          meetingType: action.data.meetingType || null,
          title: action.data.title,
          description: action.data.description || null,
          ownerName: action.data.ownerName || null,
          dueDate: action.data.dueDate || null,
          revisedDueDate: null,
          priority: action.data.priority || "Medium",
          status: action.data.status || "Not Started",
        });
        entityType = "action_item";
        entityId = item.id;
        resultMessage = `🟢 **Action item created:** "${item.title}"\n\nOwner: **${item.ownerName || "Unassigned"}** | Due: **${item.dueDate || "Not set"}** | Priority: **${item.priority}**`;
        resultLinks.push({ label: "View Action Tracker", url: "/actions" });
        break;
      }
      case "create_milestone": {
        const ms = await storage.createMilestone({
          companyId,
          projectId: action.data.projectId,
          title: action.data.title,
          dueDate: action.data.dueDate || null,
          status: action.data.status || "Upcoming",
          progress: action.data.progress || 0,
        });
        entityType = "milestone";
        entityId = ms.id;
        resultMessage = `🟢 **Milestone created:** "${ms.title}"\n\nDue: **${ms.dueDate || "Not set"}** | Status: **${ms.status}**`;
        if (ms.projectId) resultLinks.push({ label: "Open Project", url: `/projects/${ms.projectId}` });
        break;
      }
      case "update_project": {
        const { id, ...updates } = action.data;
        await storage.updateProject(id, updates);
        entityType = "project";
        entityId = id;
        const changes = Object.entries(updates).map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").trim()}: **${v}**`).join(" | ");
        resultMessage = `🟢 **Project updated:** ${changes}`;
        resultLinks.push({ label: "Open Project", url: `/projects/${id}` });
        break;
      }
      case "update_task": {
        const { id, ...updates } = action.data;
        await storage.updateTask(id, updates);
        entityType = "task";
        entityId = id;
        const changes = Object.entries(updates).map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").trim()}: **${v}**`).join(" | ");
        resultMessage = `🟢 **Task updated:** ${changes}`;
        break;
      }
      case "update_action_item": {
        const { id, ...updates } = action.data;
        await storage.updateActionItem(id, updates);
        entityType = "action_item";
        entityId = id;
        const changes = Object.entries(updates).map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").trim()}: **${v}**`).join(" | ");
        resultMessage = `🟢 **Action item updated:** ${changes}`;
        resultLinks.push({ label: "View Action Tracker", url: "/actions" });
        break;
      }
      case "update_milestone": {
        const { id, ...updates } = action.data;
        await storage.updateMilestone(id, updates);
        entityType = "milestone";
        entityId = id;
        const changes = Object.entries(updates).map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").trim()}: **${v}**`).join(" | ");
        resultMessage = `🟢 **Milestone updated:** ${changes}`;
        break;
      }
      case "close_task": {
        await storage.updateTask(action.data.id, { status: "Completed", progress: 100 });
        entityType = "task";
        entityId = action.data.id;
        resultMessage = `✅ **Task closed** — marked Completed at 100% progress.`;
        break;
      }
      case "close_action": {
        await storage.updateActionItem(action.data.id, { status: "Completed" });
        entityType = "action_item";
        entityId = action.data.id;
        resultMessage = `✅ **Action item closed** — marked Completed.`;
        resultLinks.push({ label: "View Action Tracker", url: "/actions" });
        break;
      }
      case "update_kpi_actual": {
        await storage.createKpiActual({
          kpiId: action.data.kpiId,
          reviewMonth: action.data.reviewMonth,
          actualValue: action.data.actualValue,
          commentary: action.data.commentary || null,
          status: action.data.status || "On Track",
        });
        entityType = "kpi";
        entityId = action.data.kpiId;
        resultMessage = `🟢 **KPI actual recorded:**\nMonth: **${action.data.reviewMonth}** | Value: **${action.data.actualValue}** | Status: **${action.data.status}**`;
        resultLinks.push({ label: "View KPIs", url: "/kpis" });
        break;
      }
      default:
        return { type: "error", message: "Unknown action type. No changes were made.", links: [], quickActions: [] };
    }

    await storage.createAssistantLog({
      companyId,
      userId,
      userName,
      actionType: action.type,
      entityType: entityType || null,
      entityId: entityId || null,
      summary: action.label,
    });

    return { type: "success", message: resultMessage, links: resultLinks, quickActions: [] };
  } catch (err: any) {
    console.error("Assistant action error:", err);
    return { type: "error", message: `Action failed: ${err.message}`, links: [], quickActions: [] };
  }
}
