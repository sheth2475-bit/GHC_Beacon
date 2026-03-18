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

export interface AssistantResponse {
  type: "answer" | "question" | "confirmation" | "success" | "error";
  message: string;
  links?: ResponseLink[];
  pendingAction?: PendingAction | null;
}

function cleanJson(s: string) {
  return s.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
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

  // KPI actuals — fetch last 3 months per KPI for trend analysis
  const kpiActualsMap: Record<number, { actual: string; status: string; month: string; commentary: string | null }[]> = {};
  for (const kpi of kpiList) {
    const actuals = await storage.getKpiActuals(kpi.id);
    kpiActualsMap[kpi.id] = actuals
      .sort((a, b) => b.reviewMonth.localeCompare(a.reviewMonth))
      .slice(0, 3)
      .map(a => ({ actual: a.actualValue || "", status: a.status || "", month: a.reviewMonth, commentary: a.commentary }));
  }

  // Determine KPI status (on track vs below)
  const kpiSummary = kpiList.map(k => {
    const recents = kpiActualsMap[k.id] || [];
    const latest = recents[0];
    const trend = recents.length >= 2
      ? recents.map(r => `${r.month}:${r.actual}[${r.status}]`).join(" → ")
      : latest ? `${latest.month}:${latest.actual}[${latest.status}]` : "No data";
    return `  KPI[${k.id}] "${k.kpiName}" | Target:${k.targetValue}${k.unit} | Owner:${k.ownerName} | Dept:${deptMap[k.departmentId!] || "N/A"} | ${latest ? `Status:${latest.status} | Latest:${latest.actual}${k.unit}(${latest.month})` : "No actuals"} | Trend:${trend}`;
  }).join("\n");

  // Projects with derived health
  const projectSummary = projects.map(p => {
    const projectTasks = tasks.filter(t => t.projectId === p.id);
    const overdueTasks = projectTasks.filter(t => t.dueDate && t.dueDate < today && t.status !== "Completed").length;
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(t => t.status === "Completed").length;
    const projectMilestones = milestones.filter(m => m.projectId === p.id);
    const upcomingMilestones = projectMilestones.filter(m => m.status !== "Completed").map(m => `"${m.title}"(Due:${m.dueDate},${m.status},${m.progress}%)`).join(", ");
    return `  Project[${p.id}] "${p.name}" | Status:${p.status} | Progress:${p.progress}% | Owner:${p.owner || "Unassigned"} | Due:${p.dueDate || "N/A"} | Priority:${p.priority} | Dept:${deptMap[p.departmentId!] || "N/A"} | Tasks:${completedTasks}/${totalTasks} done | OverdueTasks:${overdueTasks} | Milestones:${upcomingMilestones || "None"}`;
  }).join("\n");

  // All action items
  const actionSummary = actionItems.map(a => {
    const effectiveDue = a.revisedDueDate || a.dueDate || "";
    const isOverdue = effectiveDue && effectiveDue < today && a.status !== "Completed";
    return `  Action[${a.id}] "${a.title}" | Owner:${a.ownerName} | Due:${effectiveDue || "N/A"}${a.revisedDueDate ? "(revised)" : ""} | Status:${a.status} | Priority:${a.priority} | MeetingType:${a.meetingType || "N/A"}${isOverdue ? " ⚠️OVERDUE" : ""}`;
  }).join("\n");

  // Tasks with project names
  const taskSummary = tasks.slice(0, 40).map(t => {
    const isOverdue = t.dueDate && t.dueDate < today && t.status !== "Completed";
    return `  Task[${t.id}] "${t.title}" | Project:${projectMap[t.projectId!] || "N/A"}(ID:${t.projectId}) | Assignee:${t.assignee || "Unassigned"} | Status:${t.status} | Priority:${t.priority || "N/A"} | Due:${t.dueDate || "N/A"}${isOverdue ? " ⚠️OVERDUE" : ""}`;
  }).join("\n");

  // Milestones with project names
  const milestoneSummary = milestones.map(m => {
    const isOverdue = m.dueDate && m.dueDate < today && m.status !== "Completed";
    return `  Milestone[${m.id}] "${m.title}" | Project:${projectMap[m.projectId!] || "N/A"}(ID:${m.projectId}) | Status:${m.status} | Progress:${m.progress}% | Due:${m.dueDate || "N/A"}${isOverdue ? " ⚠️OVERDUE" : ""}`;
  }).join("\n");

  // Meetings
  const meetingSummary = meetings.slice(0, 8).map(m =>
    `  Meeting[${m.id}] "${m.title}" | Date:${m.meetingDate} | Dept:${deptMap[m.departmentId!] || "N/A"} | Type:${m.meetingType || "N/A"}`
  ).join("\n");

  // Reviews
  const reviewsSummary = reviews
    .sort((a, b) => b.reviewMonth.localeCompare(a.reviewMonth))
    .slice(0, 2)
    .map(r => `  Review[${r.id}] Month:${r.reviewMonth}\n    Summary:${r.overallSummary?.slice(0, 400)}\n    Strengths:${r.strengths?.slice(0, 200)}\n    Gaps:${r.gaps?.slice(0, 200)}\n    Recommendations:${r.recommendations?.slice(0, 200)}`)
    .join("\n");

  const userSummary = users.map(u => `${u.name}(${u.role})`).join(", ");

  const goalsSummary = goals.map(g => `"${g.goalText}"`).join("; ");

  // Derived stats
  const overdueActions = actionItems.filter(a => a.status !== "Completed" && a.dueDate && (a.revisedDueDate || a.dueDate) < today);
  const overdueTasks = tasks.filter(t => t.status !== "Completed" && t.dueDate && t.dueDate < today);
  const atRiskProjects = projects.filter(p => p.status === "At Risk" || p.status === "Delayed");
  const belowTargetKpis = kpiList.filter(k => {
    const latest = (kpiActualsMap[k.id] || [])[0];
    return latest && (latest.status === "Below Target" || latest.status === "At Risk" || latest.status === "Red");
  });

  return `TODAY: ${today}
COMPANY: ${company?.companyName || "N/A"} | Industry: ${company?.industry || "N/A"}
STRATEGIC GOALS: ${goalsSummary || "None set"}
TEAM: ${userSummary}
DEPARTMENTS: ${departments.map(d => `${d.name}[ID:${d.id}]`).join(", ")}

KEY STATS: ${overdueActions.length} overdue actions | ${overdueTasks.length} overdue tasks | ${atRiskProjects.length} at-risk/delayed projects | ${belowTargetKpis.length} KPIs below target

KPIs (${kpiList.length} total — includes 3-month trend):
${kpiSummary || "  None"}

PROJECTS (${projects.length} total):
${projectSummary || "  None"}

ALL ACTION ITEMS (${actionItems.length} total):
${actionSummary || "  None"}

TASKS (${tasks.length} total, showing up to 40):
${taskSummary || "  None"}

MILESTONES (${milestones.length} total):
${milestoneSummary || "  None"}

RECENT MEETINGS:
${meetingSummary || "  None"}

MONTHLY REVIEWS (last 2):
${reviewsSummary || "  None"}`;
}

const SYSTEM_PROMPT = (context: string, userName: string, userRole: string, canWrite: boolean) => `You are Performo Assistant — a highly intelligent AI business performance and operations copilot embedded inside Performo AI. You serve as a smart PMO, KPI analyst, and executive reporting assistant for ${userName} (role: ${userRole}).

CURRENT COMPANY DATA (real-time):
${context}

IN-APP NAVIGATION ROUTES (include relevant ones in the "links" field):
- Dashboard (overview, stats, health): /
- KPI Management (all KPIs, actuals, add actuals): /kpis
- KPI Builder (create new KPIs): /kpi-builder
- Action Tracker (all action items, filter by status): /actions
- Meetings (meeting list, schedule): /meetings
- Monthly Reviews (performance reviews): /reviews
- Dashboard Planner: /planner
- Project Portfolio (all projects): /portfolio
- Project Detail (specific project, tasks, milestones): /projects/{projectId}
- Workload (team workload view): /workload
- Settings: /settings
- User Management: /users

YOUR CAPABILITIES:
READ: KPI status, trends, comparisons to target; project health, progress, overdue items; action items by owner/status/priority; milestone tracking; team workload; monthly review summaries; strategic goal alignment; cross-module insights.
${canWrite ? `WRITE (confirm before executing): Create/update projects, tasks, action items, milestones. Update KPI actuals. Update progress/status/due dates/owners. Close/complete items.` : `WRITE: Read-only mode (executive role). Politely decline all modification requests.`}

RESPONSE BEHAVIOR RULES:

**For KPI queries:**
- State current value vs target, variance (absolute + %), and trend direction
- Call out Green/Amber/Red status explicitly
- For "below target" queries: list ALL below-target KPIs with owner and dept
- Include /kpis link always

**For project queries:**
- Include progress %, status, owner, due date, health signal
- List overdue tasks and upcoming milestones per project
- For "at risk" queries: explain why (overdue ratio, delayed status, etc.)
- Always link to /projects/{id} for specific projects; /portfolio for all projects

**For action item queries:**
- Include owner, due date, priority, and overdue flag
- For overdue items: calculate days overdue
- Link to /actions

**For review/performance summary queries:**
- Pull from the latest monthly review
- Include strengths, gaps, and recommendations
- Link to /reviews

**For workload/team queries:**
- Group tasks and actions by assignee/owner
- Show count and overdue count per person
- Link to /workload

**For trend analysis:**
- Use the 3-month trend data in the KPI context
- State direction: improving / declining / stable

**For write operations:**
a. If all required fields are known → set type="confirmation" with pendingAction
b. If fields are missing → set type="question", ask for ONLY the missing fields
c. NEVER skip confirmation — always show pendingAction first

**Formatting rules:**
- Use **bold** for numbers, statuses, and key names
- Use numbered lists (1. 2. 3.) for ordered items
- Use bullet lists (- item) for unordered items  
- Use ### for section headers if response has multiple sections
- Be concise but complete — include all relevant records
- Always reference record IDs (e.g., "Project[3]") in confirmation data

RESPONSE JSON SCHEMA (always return valid JSON):
{
  "type": "answer" | "question" | "confirmation" | "error",
  "message": "Your markdown-formatted response",
  "links": [
    { "label": "Button label (short, action-oriented)", "url": "/app-route" }
  ],
  "pendingAction": null | {
    "type": "create_project" | "create_task" | "create_action_item" | "create_milestone" | "update_project" | "update_task" | "update_action_item" | "update_milestone" | "update_kpi_actual" | "close_task" | "close_action",
    "label": "Human-readable description of what will be done",
    "data": { ...all fields needed for the operation... }
  }
}

FIELD REQUIREMENTS:
- create_project: { name, description?, owner?, status("Not Started"|"In Progress"|"Completed"|"At Risk"|"Delayed"), priority("Low"|"Medium"|"High"|"Critical"), dueDate?(YYYY-MM-DD), departmentId?, businessUnit? }
- create_task: { title, projectId, assignee?, status, priority, dueDate?(YYYY-MM-DD), description? }
- create_action_item: { title, ownerName, dueDate(YYYY-MM-DD), priority, status("Not Started"|"In Progress"|"Delayed"|"Completed"), departmentId?, meetingType?, description? }
- create_milestone: { title, projectId, dueDate(YYYY-MM-DD), status("Upcoming"|"Completed"), progress(0-100) }
- update_project: { id, ...fields }
- update_task: { id, ...fields }
- update_action_item: { id, ...fields }
- update_milestone: { id, ...fields }
- update_kpi_actual: { kpiId, reviewMonth(YYYY-MM), actualValue, status("On Track"|"Below Target"|"At Risk"), commentary? }
- close_task: { id }
- close_action: { id }

Always include IDs when referring to existing records. Dates in YYYY-MM-DD format. Numbers as strings for KPI values.`;

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
      pendingAction: parsed.pendingAction || null,
    };
  } catch {
    return { type: "error", message: "Sorry, I encountered an issue processing your request. Please try again.", links: [] };
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
    return { type: "error", message: "You don't have permission to make changes.", links: [] };
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
          progress: action.data.progress || 0,
          tags: null,
          linkedKpiId: null,
        });
        entityType = "project";
        entityId = proj.id;
        resultMessage = `**Project created:** "${proj.name}" has been added to your portfolio.`;
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
        resultMessage = `**Task created:** "${task.title}" has been added.`;
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
        resultMessage = `**Action item created:** "${item.title}" assigned to ${item.ownerName || "TBD"}, due ${item.dueDate || "TBD"}.`;
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
        resultMessage = `**Milestone created:** "${ms.title}" added to the project.`;
        if (ms.projectId) resultLinks.push({ label: "Open Project", url: `/projects/${ms.projectId}` });
        break;
      }
      case "update_project": {
        const { id, ...updates } = action.data;
        await storage.updateProject(id, updates);
        entityType = "project";
        entityId = id;
        const fieldList = Object.entries(updates).map(([k, v]) => `${k}: **${v}**`).join(", ");
        resultMessage = `**Project updated:** ${fieldList}.`;
        resultLinks.push({ label: "Open Project", url: `/projects/${id}` });
        break;
      }
      case "update_task": {
        const { id, ...updates } = action.data;
        await storage.updateTask(id, updates);
        entityType = "task";
        entityId = id;
        const fieldList = Object.entries(updates).map(([k, v]) => `${k}: **${v}**`).join(", ");
        resultMessage = `**Task updated:** ${fieldList}.`;
        break;
      }
      case "update_action_item": {
        const { id, ...updates } = action.data;
        await storage.updateActionItem(id, updates);
        entityType = "action_item";
        entityId = id;
        const fieldList = Object.entries(updates).map(([k, v]) => `${k}: **${v}**`).join(", ");
        resultMessage = `**Action item updated:** ${fieldList}.`;
        resultLinks.push({ label: "View Action Tracker", url: "/actions" });
        break;
      }
      case "update_milestone": {
        const { id, ...updates } = action.data;
        await storage.updateMilestone(id, updates);
        entityType = "milestone";
        entityId = id;
        const fieldList = Object.entries(updates).map(([k, v]) => `${k}: **${v}**`).join(", ");
        resultMessage = `**Milestone updated:** ${fieldList}.`;
        break;
      }
      case "close_task": {
        await storage.updateTask(action.data.id, { status: "Completed", progress: 100 });
        entityType = "task";
        entityId = action.data.id;
        resultMessage = `**Task closed:** Marked as Completed with 100% progress.`;
        break;
      }
      case "close_action": {
        await storage.updateActionItem(action.data.id, { status: "Completed" });
        entityType = "action_item";
        entityId = action.data.id;
        resultMessage = `**Action item closed:** Marked as Completed.`;
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
        resultMessage = `**KPI actual recorded:** ${action.data.reviewMonth} value **${action.data.actualValue}** saved with status **${action.data.status}**.`;
        resultLinks.push({ label: "View KPIs", url: "/kpis" });
        break;
      }
      default:
        return { type: "error", message: "Unknown action type. No changes were made.", links: [] };
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

    return { type: "success", message: resultMessage, links: resultLinks };
  } catch (err: any) {
    console.error("Assistant action error:", err);
    return { type: "error", message: `Failed to complete the action: ${err.message}`, links: [] };
  }
}
