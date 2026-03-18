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

export interface AssistantResponse {
  type: "answer" | "question" | "confirmation" | "success" | "error";
  message: string;
  pendingAction?: PendingAction | null;
}

function cleanJson(s: string) {
  return s.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

async function buildContext(companyId: number): Promise<string> {
  const today = new Date().toISOString().split("T")[0];

  const [
    kpiList, projects, actionItems, meetings, reviews, tasks, milestones, departments
  ] = await Promise.all([
    storage.getKpis(companyId),
    storage.getProjects(companyId),
    storage.getActionItems(companyId),
    storage.getMeetings(companyId),
    storage.getMonthlyReviews(companyId),
    storage.getTasks(companyId),
    storage.getMilestones(companyId),
    storage.getDepartments(companyId),
  ]);

  const deptMap: Record<number, string> = {};
  for (const d of departments) deptMap[d.id] = d.name;

  const kpiActualsMap: Record<number, { actual: string; status: string; month: string }> = {};
  for (const kpi of kpiList) {
    const actuals = await storage.getKpiActuals(kpi.id);
    if (actuals.length > 0) {
      const latest = actuals.sort((a, b) => b.reviewMonth.localeCompare(a.reviewMonth))[0];
      kpiActualsMap[kpi.id] = { actual: latest.actualValue || "", status: latest.status || "", month: latest.reviewMonth };
    }
  }

  const kpiSummary = kpiList.map(k => {
    const latest = kpiActualsMap[k.id];
    return `  - [ID:${k.id}] ${k.kpiName} | Target: ${k.targetValue}${k.unit} | ${latest ? `Latest (${latest.month}): ${latest.actual}${k.unit} [${latest.status}]` : "No actuals"} | Owner: ${k.ownerName} | Dept: ${deptMap[k.departmentId!] || "N/A"}`;
  }).join("\n");

  const projectSummary = projects.map(p => {
    return `  - [ID:${p.id}] "${p.name}" | Status: ${p.status} | Progress: ${p.progress}% | Owner: ${p.owner} | Due: ${p.dueDate || "N/A"} | Dept: ${deptMap[p.departmentId!] || "N/A"} | Priority: ${p.priority}`;
  }).join("\n");

  const overdueActions = actionItems.filter(a =>
    a.status !== "Completed" && a.dueDate && (a.revisedDueDate || a.dueDate) < today
  );
  const activeActions = actionItems.filter(a => a.status !== "Completed");
  const actionSummary = activeActions.slice(0, 15).map(a => {
    const isOverdue = a.dueDate && (a.revisedDueDate || a.dueDate) < today;
    return `  - [ID:${a.id}] "${a.title}" | Owner: ${a.ownerName} | Due: ${a.revisedDueDate || a.dueDate || "N/A"} | Status: ${a.status} | Priority: ${a.priority}${isOverdue ? " ⚠️ OVERDUE" : ""}`;
  }).join("\n");

  const taskSummary = tasks.filter(t => t.status !== "Completed").slice(0, 20).map(t => {
    const isOverdue = t.dueDate && t.dueDate < today;
    return `  - [ID:${t.id}] "${t.title}" | Project ID:${t.projectId} | Assignee: ${t.assignee} | Status: ${t.status} | Due: ${t.dueDate || "N/A"}${isOverdue ? " ⚠️ OVERDUE" : ""}`;
  }).join("\n");

  const milestoneSummary = milestones.filter(m => m.status !== "Completed").slice(0, 10).map(m => {
    const isOverdue = m.dueDate && m.dueDate < today;
    return `  - [ID:${m.id}] "${m.title}" | Project ID:${m.projectId} | Status: ${m.status} | Due: ${m.dueDate || "N/A"}${isOverdue ? " ⚠️ OVERDUE" : ""}`;
  }).join("\n");

  const meetingSummary = meetings.slice(0, 5).map(m =>
    `  - [ID:${m.id}] "${m.title}" | Date: ${m.meetingDate} | Dept: ${deptMap[m.departmentId!] || "N/A"}`
  ).join("\n");

  const latestReview = reviews.sort((a, b) => b.reviewMonth.localeCompare(a.reviewMonth))[0];
  const reviewSummary = latestReview
    ? `Month: ${latestReview.reviewMonth}\nSummary: ${latestReview.overallSummary?.slice(0, 500)}`
    : "No reviews available";

  return `TODAY: ${today}
DEPARTMENTS: ${departments.map(d => `${d.name} [ID:${d.id}]`).join(", ")}
OVERDUE ACTIONS COUNT: ${overdueActions.length}

KPIs (${kpiList.length} total):
${kpiSummary || "  None"}

PROJECTS (${projects.length} total):
${projectSummary || "  None"}

OPEN ACTION ITEMS (${activeActions.length} total, showing up to 15):
${actionSummary || "  None"}

OPEN TASKS (showing up to 20):
${taskSummary || "  None"}

MILESTONES (open, showing up to 10):
${milestoneSummary || "  None"}

RECENT MEETINGS (last 5):
${meetingSummary || "  None"}

LATEST MONTHLY REVIEW:
${reviewSummary}`;
}

const SYSTEM_PROMPT = (context: string, userName: string, userRole: string, canWrite: boolean) => `You are Performo Assistant — a smart, concise AI business performance assistant embedded inside Performo AI. You help ${userName} (role: ${userRole}) understand business performance, manage KPIs, projects, actions, tasks, and reviews.

CURRENT COMPANY DATA:
${context}

YOUR CAPABILITIES:
READ: Answer questions about KPIs, projects, tasks, milestones, action items, meetings, reviews, performance trends, overdue items, at-risk projects.
${canWrite ? `WRITE: Create or update projects, tasks, action items. Update KPI actuals, progress %, status, due dates, owners. Close tasks or actions.` : `WRITE: You are in read-only mode for this user (executive role). Politely decline write requests.`}

RULES:
1. Always respond with valid JSON matching the schema below.
2. For READ queries: fetch from the context and give a clear, structured answer. Use bullet points, bold for numbers.
3. For WRITE requests:
   a. If all required info is provided, set type="confirmation" with a clear pendingAction.
   b. If info is missing (no owner, no due date, no project name etc.), set type="question" and ask for the specific missing fields.
   c. NEVER set type="success" directly — always require confirmation first.
4. When referencing records, always include their ID in the pendingAction.data.
5. For ambiguous requests (multiple matching records), list them and ask which one.
6. Keep responses concise. Use markdown formatting (bold **text**, bullet lists) in the message field.
7. Dates must be in YYYY-MM-DD format.

RESPONSE JSON SCHEMA:
{
  "type": "answer" | "question" | "confirmation" | "error",
  "message": "Your markdown-formatted response here",
  "pendingAction": null | {
    "type": "create_project" | "create_task" | "create_action_item" | "update_project" | "update_task" | "update_action_item" | "update_kpi_actual" | "close_task" | "close_action",
    "label": "Human-readable description of what will happen (e.g. 'Create project: Loyalty Program Relaunch')",
    "data": { ... all required fields for the operation ... }
  }
}

For create_project data: { name, description?, owner?, status, priority, dueDate?, departmentId? }
For create_task data: { title, projectId, assignee?, status, priority, dueDate?, description? }
For create_action_item data: { title, ownerName, dueDate, priority, status, departmentId?, description? }
For update_project data: { id, ...fields to update }
For update_task data: { id, ...fields to update }
For update_action_item data: { id, ...fields to update }
For update_kpi_actual data: { kpiId, reviewMonth, actualValue, status, commentary? }
For close_task data: { id }
For close_action data: { id }`;

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
    max_completion_tokens: 1500,
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
      pendingAction: parsed.pendingAction || null,
    };
  } catch {
    return { type: "error", message: "Sorry, I encountered an issue processing your request. Please try again." };
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
    return { type: "error", message: "You don't have permission to make changes." };
  }

  try {
    let resultMessage = "";
    let entityType = "";
    let entityId: number | undefined;

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
        resultMessage = `**Action item created:** "${item.title}" has been added to the tracker.`;
        break;
      }
      case "update_project": {
        const { id, ...updates } = action.data;
        await storage.updateProject(id, updates);
        entityType = "project";
        entityId = id;
        resultMessage = `**Project updated:** Changes have been saved.`;
        break;
      }
      case "update_task": {
        const { id, ...updates } = action.data;
        await storage.updateTask(id, updates);
        entityType = "task";
        entityId = id;
        resultMessage = `**Task updated:** Changes have been saved.`;
        break;
      }
      case "update_action_item": {
        const { id, ...updates } = action.data;
        await storage.updateActionItem(id, updates);
        entityType = "action_item";
        entityId = id;
        resultMessage = `**Action item updated:** Changes have been saved.`;
        break;
      }
      case "close_task": {
        await storage.updateTask(action.data.id, { status: "Completed", progress: 100 });
        entityType = "task";
        entityId = action.data.id;
        resultMessage = `**Task closed:** Marked as Completed.`;
        break;
      }
      case "close_action": {
        await storage.updateActionItem(action.data.id, { status: "Completed" });
        entityType = "action_item";
        entityId = action.data.id;
        resultMessage = `**Action item closed:** Marked as Completed.`;
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
        resultMessage = `**KPI actual recorded:** ${action.data.reviewMonth} value saved successfully.`;
        break;
      }
      default:
        return { type: "error", message: "Unknown action type. No changes were made." };
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

    return { type: "success", message: resultMessage };
  } catch (err: any) {
    console.error("Assistant action error:", err);
    return { type: "error", message: `Failed to complete the action: ${err.message}` };
  }
}
