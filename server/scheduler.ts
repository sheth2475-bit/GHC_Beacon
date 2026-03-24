import { storage } from "./storage";
import { sendDueReminderEmail } from "./email";
import { log } from "./index";

function getDatePlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

async function runDueDateCheck() {
  const targetDate = getDatePlusDays(3);
  log(`[scheduler] Running 3-day due-date check for ${targetDate}`, "scheduler");

  let totalSent = 0;

  try {
    const companies = await storage.getAllCompanies();

    for (const company of companies) {
      const users = await storage.getUsersByCompany(company.id);
      const adminEmails = users
        .filter((u) => u.role === "admin" || u.role === "platform_owner")
        .map((u) => u.email)
        .filter(Boolean) as string[];

      if (adminEmails.length === 0) continue;

      const testEmail = process.env.RESEND_TEST_EMAIL;

      // Fetch team members to look up owner emails
      const teamMembers = await storage.getTeamMembers(company.id);
      const memberEmailByName: Record<string, string> = {};
      for (const m of teamMembers) {
        if (m.email) memberEmailByName[m.name] = m.email;
      }

      const buildRecipients = (ownerName?: string | null): string[] => {
        if (testEmail) return [testEmail];
        const extras: string[] = [];
        if (ownerName && memberEmailByName[ownerName]) {
          extras.push(memberEmailByName[ownerName]);
        }
        return [...new Set([...adminEmails, ...extras])];
      };

      // --- Check Initiatives (tasks table) ---
      const tasks = await storage.getTasks(company.id);
      for (const task of tasks) {
        const effectiveDue = task.dueDate;
        if (
          effectiveDue === targetDate &&
          task.status !== "Completed" &&
          task.status !== "Cancelled"
        ) {
          const ownerName = task.owner || task.assignee || "Unassigned";
          try {
            await sendDueReminderEmail({
              to: buildRecipients(ownerName),
              itemType: "Initiative",
              itemTitle: task.title,
              ownerName,
              dueDate: effectiveDue,
              daysUntilDue: 3,
              companyName: company.companyName,
            });
            totalSent++;
          } catch (err: any) {
            log(`[scheduler] Failed to send initiative reminder for "${task.title}": ${err.message}`, "scheduler");
          }
        }
      }

      // --- Check Projects ---
      const projects = await storage.getProjects(company.id);
      for (const project of projects) {
        if (
          project.dueDate === targetDate &&
          project.status !== "Completed" &&
          project.status !== "Cancelled"
        ) {
          try {
            await sendDueReminderEmail({
              to: buildRecipients(project.owner),
              itemType: "Project",
              itemTitle: project.name,
              ownerName: project.owner || "Unassigned",
              dueDate: project.dueDate,
              daysUntilDue: 3,
              companyName: company.companyName,
            });
            totalSent++;
          } catch (err: any) {
            log(`[scheduler] Failed to send project reminder for "${project.name}": ${err.message}`, "scheduler");
          }
        }
      }
    }

    log(`[scheduler] Due-date check complete — ${totalSent} reminder(s) sent.`, "scheduler");
  } catch (err: any) {
    log(`[scheduler] Error during due-date check: ${err.message}`, "scheduler");
  }
}

function msUntilNext8AM(): number {
  const now = new Date();
  const next8AM = new Date();
  next8AM.setUTCHours(8, 0, 0, 0);
  if (next8AM <= now) next8AM.setUTCDate(next8AM.getUTCDate() + 1);
  return next8AM.getTime() - now.getTime();
}

export function startScheduler() {
  const initialDelay = msUntilNext8AM();
  const hours = Math.round(initialDelay / 1000 / 60 / 60);
  log(`[scheduler] First due-date check in ~${hours}h (daily at 08:00 UTC)`, "scheduler");

  setTimeout(() => {
    runDueDateCheck();
    setInterval(runDueDateCheck, 24 * 60 * 60 * 1000);
  }, initialDelay);
}
