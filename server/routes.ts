import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireAdmin, requireEditAccess } from "./auth";
import { generateKpis, generateMonthlyReview, generateDashboardPlan } from "./ai";
import { sendActionReminder, sendWorkflowAutomationEmail } from "./email";
import { processAssistantMessage } from "./assistant";
import { registerOwnerRoutes, logActivity } from "./owner-routes";
import * as XLSX from "xlsx";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import multer from "multer";

const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/** Normalises a date value to YYYY-MM-DD for DB storage.
 *  Handles: JS Date objects (from cellDates:true), DD-MM-YYYY, YYYY-MM-DD,
 *  MM/DD/YYYY, DD/MM/YYYY, Excel serial numbers, and most ISO variants. */
function parseDateStr(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;

  // JS Date object (produced by XLSX cellDates:true)
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, "0");
    const d = String(raw.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const s = String(raw).trim();
  if (!s) return null;

  // Excel serial number (e.g. 45000)
  if (/^\d{4,5}$/.test(s)) {
    const serial = Number(s);
    if (serial > 25568 && serial < 60000) { // ~1970-2064
      const epoch = (serial - 25569) * 86400000;
      const dt = new Date(epoch);
      if (!isNaN(dt.getTime())) {
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
        const d = String(dt.getUTCDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
    }
  }

  // DD-MM-YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2,"0")}-${ddmmyyyy[1].padStart(2,"0")}`;

  // YYYY-MM-DD (already correct, also catches ISO datetime prefix)
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // MM/DD/YYYY or DD/MM/YYYY — try parsing via Date; favour YYYY result
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  // Generic Date.parse fallback
  const ts = Date.parse(s);
  if (!isNaN(ts)) {
    const dt = new Date(ts);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return s; // return as-is if nothing matched
}

function computeProjectHealth(
  project: { status: string; progress: number; dueDate: string | null | undefined },
  projectTasks: { status: string; dueDate: string | null | undefined }[],
  projectMilestones: { status: string }[]
): "Green" | "Amber" | "Red" | "Completed" {
  if (project.status === "Completed") return "Completed";
  if (project.status === "At Risk" || project.status === "Delayed") return "Red";
  const today = new Date().toISOString().split("T")[0];
  const overdueTasks = projectTasks.filter(t =>
    t.dueDate && t.dueDate < today && t.status !== "Completed"
  ).length;
  const totalTasks = projectTasks.length;
  const overdueRatio = totalTasks > 0 ? overdueTasks / totalTasks : 0;
  const overdueMilestones = projectMilestones.filter(m => m.status === "Overdue").length;
  if (overdueRatio > 0.3 || overdueMilestones > 0 || (project.dueDate && project.dueDate < today)) return "Red";
  if (overdueRatio > 0.1 || project.progress < 30) return "Amber";
  return "Green";
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function getCompanyForUser(req: Request): Promise<{ id: number } | null> {
  const user = req.user!;
  if (user.companyId) {
    const company = await storage.getCompany(user.companyId);
    return company || null;
  }
  const company = await storage.getCompanyByUserId(user.id);
  return company || null;
}

async function verifyKpiOwnership(req: Request, kpiId: number): Promise<boolean> {
  const company = await getCompanyForUser(req);
  if (!company) return false;
  const kpi = await storage.getKpi(kpiId);
  return kpi?.companyId === company.id;
}

/**
 * Returns the set of department IDs the current user is allowed to access.
 * Returns null if the user has no restrictions (admin or no access entries configured).
 * Returns number[] (possibly empty) for restricted users.
 */
async function getAccessibleDeptIds(req: Request): Promise<number[] | null> {
  const user = req.user!;
  if (user.role === "admin") return null;
  const access = await storage.getDeptAccessForUser(user.id);
  if (access.length === 0) return null;
  return access.map(a => a.departmentId);
}

/**
 * Returns the access level for a specific department for the current user.
 * Returns "full" for admins. Returns null if no access.
 */
async function getDeptAccessLevel(req: Request, departmentId: number | null | undefined): Promise<"view" | "edit" | "full" | null> {
  const user = req.user!;
  if (user.role === "admin") return "full";
  if (!departmentId) return "full";
  const access = await storage.getDeptAccessForUser(user.id);
  if (access.length === 0) return "full";
  const entry = access.find(a => a.departmentId === departmentId);
  if (!entry) return null;
  return entry.accessLevel as "view" | "edit" | "full";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);
  registerOwnerRoutes(app);

  app.get("/api/company", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.json(null);
    const fullCompany = await storage.getCompany(company.id);
    const depts = await storage.getDepartments(company.id);
    const goals = await storage.getBusinessGoals(company.id);
    res.json({ ...fullCompany, departments: depts, goals });
  });

  app.post("/api/company", requireAdmin, async (req: Request, res: Response) => {
    const existing = await getCompanyForUser(req);
    if (existing) {
      const updated = await storage.updateCompany(existing.id, {
        companyName: req.body.companyName,
        industry: req.body.industry,
        companySize: req.body.companySize,
        country: req.body.country,
      });
      if (req.body.goals) {
        const existingGoals = await storage.getBusinessGoals(existing.id);
        for (const g of existingGoals) await storage.deleteBusinessGoal(g.id);
        for (const goalText of req.body.goals) {
          await storage.createBusinessGoal({ companyId: existing.id, goalText });
        }
      }
      const depts = await storage.getDepartments(existing.id);
      const goals = await storage.getBusinessGoals(existing.id);
      return res.json({ ...updated, departments: depts, goals });
    }

    const company = await storage.createCompany({
      userId: req.user!.id,
      companyName: req.body.companyName,
      industry: req.body.industry,
      companySize: req.body.companySize,
      country: req.body.country,
    });
    await storage.updateUser(req.user!.id, { companyId: company.id });
    if (req.body.departments) {
      for (const name of req.body.departments) {
        await storage.createDepartment({ companyId: company.id, name });
      }
    }
    if (req.body.goals) {
      for (const goalText of req.body.goals) {
        await storage.createBusinessGoal({ companyId: company.id, goalText });
      }
    }
    const depts = await storage.getDepartments(company.id);
    const goals = await storage.getBusinessGoals(company.id);
    res.status(201).json({ ...company, departments: depts, goals });
  });

  app.get("/api/departments", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.json([]);
    res.json(await storage.getDepartments(company.id));
  });

  app.post("/api/departments", requireAdmin, async (req: Request, res: Response) => {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Name is required" });
    const company = await getCompanyForUser(req);
    if (!company) return res.status(400).json({ message: "No company profile" });
    const dept = await storage.createDepartment({ companyId: company.id, name });
    res.status(201).json(dept);
  });

  app.delete("/api/departments/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Not found" });
    const allDepts = await storage.getDepartments(company.id);
    const dept = allDepts.find(d => d.id === id);
    if (!dept) return res.status(404).json({ message: "Not found" });
    try {
      await storage.deleteDepartment(dept.id);
      res.json({ ok: true });
    } catch (err: any) {
      if (err.message?.includes("violates foreign key")) {
        return res.status(409).json({ message: "Cannot delete department — it is currently in use by KPIs or actions. Remove those references first." });
      }
      throw err;
    }
  });

  app.get("/api/kpis", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.json([]);
    const deptIds = await getAccessibleDeptIds(req);
    const all = await storage.getKpis(company.id);
    const filtered = deptIds ? all.filter(k => !k.departmentId || deptIds.includes(k.departmentId)) : all;
    res.json(filtered);
  });

  app.post("/api/kpis", requireEditAccess, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(400).json({ message: "No company profile" });
    const kpi = await storage.createKpi({ ...req.body, companyId: company.id });
    logActivity(req.user!.id, company.id, "create_kpi", "kpis", `Created KPI: ${kpi.kpiName}`).catch(() => {});
    res.status(201).json(kpi);
  });

  app.patch("/api/kpis/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    if (!(await verifyKpiOwnership(req, id))) return res.status(404).json({ message: "Not found" });
    const kpi = await storage.updateKpi(id, req.body);
    logActivity(req.user!.id, req.user!.companyId, "update_kpi", "kpis", `Updated KPI #${id}: ${kpi.kpiName}`).catch(() => {});
    res.json(kpi);
  });

  app.delete("/api/kpis/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    if (!(await verifyKpiOwnership(req, id))) return res.status(404).json({ message: "Not found" });
    await storage.deleteKpi(id);
    logActivity(req.user!.id, req.user!.companyId, "delete_kpi", "kpis", `Deleted KPI #${id}`).catch(() => {});
    res.json({ ok: true });
  });

  app.get("/api/kpis/:id/actuals", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    if (!(await verifyKpiOwnership(req, id))) return res.status(404).json({ message: "Not found" });
    res.json(await storage.getKpiActuals(id));
  });

  app.get("/api/kpi-actuals/company", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const deptIds = await getAccessibleDeptIds(req);
    const all = await storage.getAllKpiActuals(company.id);
    const kpis = await storage.getKpis(company.id);
    const allowedKpiIds = deptIds ? kpis.filter(k => !k.departmentId || deptIds.includes(k.departmentId)).map(k => k.id) : null;
    const filtered = allowedKpiIds ? all.filter(a => allowedKpiIds.includes(a.kpiId)) : all;
    res.json(filtered);
  });

  app.post("/api/kpi-actuals", requireEditAccess, async (req: Request, res: Response) => {
    if (!(await verifyKpiOwnership(req, req.body.kpiId))) return res.status(404).json({ message: "Not found" });
    const actual = await storage.createKpiActual(req.body);
    res.status(201).json(actual);
  });

  app.post("/api/ai/generate-kpis", requireAuth, async (req: Request, res: Response) => {
    try {
      const { industry, department, goals } = req.body;
      const kpis = await generateKpis(industry, department, goals || []);
      res.json(kpis);
    } catch (err: any) {
      console.error("AI KPI generation error:", err);
      res.status(500).json({ message: "Failed to generate KPIs" });
    }
  });

  app.get("/api/action-items", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.json([]);
    const deptIds = await getAccessibleDeptIds(req);
    const all = await storage.getActionItems(company.id);
    const filtered = deptIds ? all.filter(a => !a.departmentId || deptIds.includes(a.departmentId)) : all;
    res.json(filtered);
  });

  app.post("/api/action-items", requireEditAccess, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(400).json({ message: "No company profile" });
    const item = await storage.createActionItem({ ...req.body, companyId: company.id });
    logActivity(req.user!.id, company.id, "create_action", "actions", `Created action: ${item.title}`).catch(() => {});
    res.status(201).json(item);
  });

  app.patch("/api/action-items/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Not found" });
    const item = await storage.getActionItem(id);
    if (!item || item.companyId !== company.id) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateActionItem(id, req.body);
    if (req.body.status) logActivity(req.user!.id, company.id, "update_action", "actions", `Updated action "${item.title}" status → ${req.body.status}`).catch(() => {});
    res.json(updated);
  });

  // ── Action item email reminders ──────────────────────────────────────────
  app.post("/api/action-items/:id/remind", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Not found" });
    const item = await storage.getActionItem(id);
    if (!item || item.companyId !== company.id) return res.status(404).json({ message: "Not found" });

    const sender = req.user!;
    const companyRecord = await storage.getCompany(company.id);

    // Collect recipients: admin users + any user whose name/email matches owner
    const companyUsers = await storage.getUsersByCompany(company.id);
    const adminEmails = companyUsers.filter(u => u.role === "admin").map(u => u.email);
    const ownerEmail = req.body.ownerEmail as string | undefined;

    const toAddresses: string[] = Array.from(new Set([
      ...adminEmails,
      ...(ownerEmail ? [ownerEmail] : []),
    ]));

    if (toAddresses.length === 0) {
      return res.status(400).json({ message: "No recipient email addresses found" });
    }

    try {
      await sendActionReminder({
        to: toAddresses,
        ownerName: item.ownerName || "Team Member",
        actionTitle: item.title,
        actionDescription: item.description,
        dueDate: item.dueDate,
        revisedDueDate: item.revisedDueDate,
        priority: item.priority,
        status: item.status,
        completion: item.completion ?? 0,
        companyName: companyRecord?.companyName || "Your Company",
        senderName: sender.name || sender.email,
      });
      res.json({ ok: true, sentTo: toAddresses });
    } catch (err: any) {
      console.error("Email reminder error:", err);
      res.status(500).json({ message: err.message || "Failed to send reminder" });
    }
  });

  // ── Bulk reminder for all overdue actions ────────────────────────────────
  app.post("/api/action-items/remind-overdue", requireEditAccess, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Not found" });

    const sender = req.user!;
    const companyRecord = await storage.getCompany(company.id);
    const companyUsers = await storage.getUsersByCompany(company.id);
    const adminEmails = companyUsers.filter(u => u.role === "admin").map(u => u.email);
    const ccEmails: string[] = Array.isArray(req.body.cc) ? req.body.cc.filter((e: string) => e.includes("@")) : [];
    const allRecipients = Array.from(new Set([...adminEmails, ...ccEmails]));

    const today = new Date().toISOString().split("T")[0];
    const allActions = await storage.getActionItems(company.id);
    const overdue = allActions.filter(a => {
      const due = a.revisedDueDate || a.dueDate;
      return due && due < today && a.status !== "Completed" && a.status !== "Cancelled";
    });

    if (overdue.length === 0) return res.json({ ok: true, sent: 0 });

    let sent = 0;
    const errors: string[] = [];
    for (const item of overdue) {
      try {
        await sendActionReminder({
          to: allRecipients,
          ownerName: item.ownerName || "Team Member",
          actionTitle: item.title,
          actionDescription: item.description,
          dueDate: item.dueDate,
          revisedDueDate: item.revisedDueDate,
          priority: item.priority,
          status: item.status,
          completion: item.completion ?? 0,
          companyName: companyRecord?.companyName || "Your Company",
          senderName: sender.name || sender.email,
        });
        sent++;
      } catch (err: any) {
        errors.push(item.title + ": " + err.message);
      }
    }
    res.json({ ok: true, sent, errors });
  });

  app.delete("/api/action-items/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Not found" });
    const item = await storage.getActionItem(id);
    if (!item || item.companyId !== company.id) return res.status(404).json({ message: "Not found" });
    await storage.deleteActionItem(id);
    res.json({ ok: true });
  });

  app.get("/api/monthly-reviews", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.json([]);
    res.json(await storage.getMonthlyReviews(company.id));
  });

  app.post("/api/ai/monthly-review", requireAuth, async (req: Request, res: Response) => {
    try {
      const company = await getCompanyForUser(req);
      if (!company) return res.status(400).json({ message: "No company profile" });
      const fullCompany = await storage.getCompany(company.id);
      const { month, kpiData } = req.body;

      const today = new Date().toISOString().split("T")[0];

      const [allProjects, allTasks, allActions] = await Promise.all([
        storage.getProjects(company.id),
        storage.getTasks(company.id),
        storage.getActionItems(company.id),
      ]);

      const activeProjects = allProjects.filter(p => p.status === "In Progress" || p.status === "Not Started");
      const completedProjects = allProjects.filter(p => p.status === "Completed");
      const atRiskProjects = allProjects.filter(p => {
        const health = (p as any).healthScore;
        return p.status !== "Completed" && (health === "Red" || health === "Amber");
      });

      const overdueActions = allActions.filter(a => {
        const eff = a.revisedDueDate || a.dueDate;
        return eff && eff < today && a.status !== "Completed" && a.status !== "Cancelled";
      });
      const completedActions = allActions.filter(a => a.status === "Completed");

      const overdueTasksCount = allTasks.filter(t => {
        const due = (t as any).dueDate;
        return due && due < today && (t as any).status !== "Completed" && (t as any).status !== "Cancelled";
      }).length;

      const projectData = {
        total: allProjects.length,
        active: activeProjects.length,
        completed: completedProjects.length,
        atRisk: atRiskProjects.length,
        overdueTasks: overdueTasksCount,
        projects: allProjects.map(p => ({
          name: p.name,
          status: p.status,
          health: (p as any).healthScore || "Amber",
          progress: p.progress ?? 0,
          owner: p.owner || "",
        })),
      };

      const actionData = {
        total: allActions.length,
        overdue: overdueActions.length,
        completed: completedActions.length,
        overdueItems: overdueActions.map(a => {
          const eff = a.revisedDueDate || a.dueDate || "";
          const daysOverdue = eff ? Math.floor((Date.now() - new Date(eff).getTime()) / 86400000) : 0;
          return { title: a.title, ownerName: a.ownerName || "Unassigned", daysOverdue };
        }),
      };

      const review = await generateMonthlyReview(kpiData, fullCompany!.companyName, month, projectData, actionData);
      const saved = await storage.createMonthlyReview({
        companyId: company.id,
        reviewMonth: month,
        overallSummary: review.overall_summary,
        strengths: review.strengths,
        gaps: review.gaps,
        recommendations: review.recommendations,
        aiGeneratedText: JSON.stringify(review),
      });
      res.json(saved);
    } catch (err: any) {
      console.error("AI review generation error:", err);
      res.status(500).json({ message: "Failed to generate review" });
    }
  });

  app.get("/api/dashboard-plans", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.json([]);
    res.json(await storage.getDashboardPlans(company.id));
  });

  app.post("/api/ai/dashboard-plan", requireAuth, async (req: Request, res: Response) => {
    try {
      const company = await getCompanyForUser(req);
      if (!company) return res.status(400).json({ message: "No company profile" });
      const { industry, department, managementLevel } = req.body;
      const plan = await generateDashboardPlan(industry, department, managementLevel);
      const saved = await storage.createDashboardPlan({
        companyId: company.id,
        departmentId: req.body.departmentId || null,
        title: plan.title || `${department} Dashboard Plan`,
        structureJson: JSON.stringify(plan),
        aiGeneratedText: JSON.stringify(plan),
      });
      res.json(saved);
    } catch (err: any) {
      console.error("AI dashboard plan error:", err);
      res.status(500).json({ message: "Failed to generate dashboard plan" });
    }
  });

  app.get("/api/dashboard-stats", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.json({ totalKpis: 0, onTrack: 0, belowTarget: 0, totalActions: 0, overdueActions: 0, completedActions: 0 });
    const allKpis = await storage.getKpis(company.id);
    const allActions = await storage.getActionItems(company.id);
    const today = new Date().toISOString().split("T")[0];

    let onTrack = 0, belowTarget = 0;
    for (const kpi of allKpis) {
      const actuals = await storage.getKpiActuals(kpi.id);
      if (actuals.length > 0) {
        const latest = actuals[0];
        if (latest.status === "On Track" || latest.status === "Green") onTrack++;
        else if (latest.status === "Below Target" || latest.status === "Red") belowTarget++;
      }
    }

    const overdueActions = allActions.filter(a => {
      const effectiveDue = a.revisedDueDate || a.dueDate;
      return effectiveDue && effectiveDue < today && a.status !== "Completed" && a.status !== "Cancelled";
    }).length;
    const completedActions = allActions.filter(a => a.status === "Completed").length;

    res.json({
      totalKpis: allKpis.length,
      onTrack,
      belowTarget,
      totalActions: allActions.length,
      overdueActions,
      completedActions,
    });
  });

  app.get("/api/templates/kpis", requireAuth, (_req: Request, res: Response) => {
    const wb = XLSX.utils.book_new();
    const data = [
      ["KPI Name", "Description", "Formula", "Unit", "Frequency", "Target Value", "Green Threshold", "Amber Threshold", "Red Threshold", "Owner", "Data Source", "Department"],
      ["Occupancy Rate", "Percentage of rooms occupied", "(Rooms Sold / Available Rooms) × 100", "%", "Monthly", "85", ">= 85%", "75% - 84%", "< 75%", "Revenue Manager", "PMS System", "Sales"],
      ["Employee Turnover", "Staff leaving per period", "(Separations / Avg Headcount) × 100", "%", "Monthly", "18", "<= 18%", "19% - 25%", "> 25%", "HR Manager", "HRMS", "HR"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = data[0].map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, "KPIs");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=kpi_template.xlsx");
    res.send(buf);
  });

  app.get("/api/templates/actions", requireAuth, (_req: Request, res: Response) => {
    const wb = XLSX.utils.book_new();
    const data = [
      ["Meeting Type", "Title", "Description", "Owner", "Due Date (DD-MM-YYYY)", "Revised Due Date (DD-MM-YYYY)", "Priority (Low/Medium/High/Critical)", "Status (Not Started/In Progress/Completed/Delayed)", "Department"],
      ["PMO Steering Committee", "Implement feedback system", "Deploy guest feedback kiosks", "Sarah Johnson", "15-03-2026", "", "High", "In Progress", "Operations"],
      ["CEO Meeting", "Review pricing", "Analyze competitor pricing", "Michael Chen", "20-03-2026", "25-03-2026", "Medium", "Not Started", "Sales"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = data[0].map(() => ({ wch: 28 }));
    XLSX.utils.book_append_sheet(wb, ws, "Action Items");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=action_items_template.xlsx");
    res.send(buf);
  });

  app.post("/api/upload/kpis", requireEditAccess, async (req: Request, res: Response) => {
    try {
      const company = await getCompanyForUser(req);
      if (!company) return res.status(400).json({ message: "No company profile" });
      const departments = await storage.getDepartments(company.id);
      const { data } = req.body;
      if (!Array.isArray(data) || data.length === 0) return res.status(400).json({ message: "No data provided" });

      const created: any[] = [];
      const errors: { row: number; reason: string }[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const kpiName = (row.kpiName || row["KPI Name"] || "").trim();
          if (!kpiName) throw new Error("KPI Name is required");
          const dept = departments.find(d => d.name.toLowerCase() === (row.department || row["Department"] || "").toLowerCase());
          const kpi = await storage.createKpi({
            companyId: company.id,
            departmentId: dept?.id || null,
            kpiName,
            description: row.description || row["Description"] || null,
            formula: row.formula || row["Formula"] || null,
            unit: row.unit || row["Unit"] || null,
            frequency: row.frequency || row["Frequency"] || null,
            targetValue: row.targetValue || row["Target Value"] || null,
            greenThreshold: row.greenThreshold || row["Green Threshold"] || null,
            amberThreshold: row.amberThreshold || row["Amber Threshold"] || null,
            redThreshold: row.redThreshold || row["Red Threshold"] || null,
            ownerName: row.ownerName || row["Owner"] || null,
            dataSource: row.dataSource || row["Data Source"] || null,
            createdByAi: false,
          });
          created.push(kpi);
        } catch (e: any) {
          errors.push({ row: i + 2, reason: e.message });
        }
      }
      res.json({ imported: created.length, errors, kpis: created });
    } catch (err: any) {
      console.error("KPI upload error:", err);
      res.status(500).json({ message: "Failed to import KPIs" });
    }
  });

  app.post("/api/upload/actions", requireEditAccess, async (req: Request, res: Response) => {
    try {
      const company = await getCompanyForUser(req);
      if (!company) return res.status(400).json({ message: "No company profile" });
      const departments = await storage.getDepartments(company.id);
      const { data } = req.body;
      if (!Array.isArray(data) || data.length === 0) return res.status(400).json({ message: "No data provided" });

      const created: any[] = [];
      const errors: { row: number; reason: string }[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const title = (row.title || row["Title"] || "").trim();
          if (!title) throw new Error("Title is required");
          const dept = departments.find(d => d.name.toLowerCase() === (row.department || row["Department"] || "").toLowerCase());
          const rawDept = (row.department || row["Department"] || "").trim();
          const item = await storage.createActionItem({
            companyId: company.id,
            departmentId: dept?.id || null,
            departmentText: !dept && rawDept ? rawDept : null,
            meetingType: row.meetingType || row["Meeting Type"] || null,
            title,
            description: row.description || row["Description"] || null,
            ownerName: row.ownerName || row["Owner"] || null,
            dueDate: parseDateStr(row.dueDate || row["Due Date (DD-MM-YYYY)"] || row["Due Date (YYYY-MM-DD)"] || null),
            revisedDueDate: parseDateStr(row.revisedDueDate || row["Revised Due Date (DD-MM-YYYY)"] || row["Revised Due Date (YYYY-MM-DD)"] || null),
            priority: row.priority || row["Priority (Low/Medium/High/Critical)"] || "Medium",
            status: row.status || row["Status (Not Started/In Progress/Completed/Delayed)"] || "Not Started",
          });
          created.push(item);
        } catch (e: any) {
          errors.push({ row: i + 2, reason: e.message });
        }
      }
      res.json({ imported: created.length, errors, items: created });
    } catch (err: any) {
      console.error("Action upload error:", err);
      res.status(500).json({ message: "Failed to import actions" });
    }
  });

  app.get("/api/users", requireAdmin, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.json([]);
    const companyUsers = await storage.getUsersByCompany(company.id);
    res.json(companyUsers.map(({ passwordHash: _, ...u }) => u));
  });

  app.post("/api/users", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required" });
      }
      if (role && !["admin", "executive"].includes(role)) {
        return res.status(400).json({ message: "Role must be admin or executive" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }
      const company = await getCompanyForUser(req);
      if (!company) return res.status(400).json({ message: "No company profile" });
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        name,
        email,
        passwordHash,
        companyId: company.id,
        role: role || "executive",
      });
      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (err: any) {
      next(err);
    }
  });

  app.patch("/api/users/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Not found" });
    const target = await storage.getUser(id);
    if (!target || target.companyId !== company.id) {
      return res.status(404).json({ message: "User not found in your company" });
    }
    const { role, name } = req.body;
    const updates: Record<string, any> = {};
    if (role && ["admin", "executive"].includes(role)) updates.role = role;
    if (name) updates.name = name;
    const updated = await storage.updateUser(id, updates);
    const { passwordHash: _, ...safeUser } = updated;
    res.json(safeUser);
  });

  app.delete("/api/users/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    if (id === req.user!.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Not found" });
    const target = await storage.getUser(id);
    if (!target || target.companyId !== company.id) {
      return res.status(404).json({ message: "User not found in your company" });
    }
    await storage.deleteUser(id);
    res.json({ ok: true });
  });

  // ─── Department Access Control ─────────────────────────────────────────────

  app.get("/api/users/me/department-access", requireAuth, async (req: Request, res: Response) => {
    const user = req.user!;
    const access = await storage.getDeptAccessForUserWithDepts(user.id);
    res.json({ role: user.role, access });
  });

  app.get("/api/users/:id/department-access", requireAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Not found" });
    const target = await storage.getUser(id);
    if (!target || target.companyId !== company.id) return res.status(404).json({ message: "User not found" });
    const access = await storage.getDeptAccessForUserWithDepts(id);
    res.json(access);
  });

  app.post("/api/users/:id/department-access", requireAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Not found" });
    const target = await storage.getUser(id);
    if (!target || target.companyId !== company.id) return res.status(404).json({ message: "User not found" });
    const { departmentId, accessLevel } = req.body;
    if (!departmentId || !accessLevel) return res.status(400).json({ message: "departmentId and accessLevel required" });
    const entry = await storage.setDeptAccess(id, departmentId, accessLevel);
    res.json(entry);
  });

  app.delete("/api/users/:id/department-access", requireAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Not found" });
    const target = await storage.getUser(id);
    if (!target || target.companyId !== company.id) return res.status(404).json({ message: "User not found" });
    await storage.removeDeptAccessForUser(id);
    res.json({ ok: true });
  });

  app.delete("/api/users/:id/department-access/:deptId", requireAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const deptId = parseInt(req.params.deptId as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Not found" });
    const target = await storage.getUser(id);
    if (!target || target.companyId !== company.id) return res.status(404).json({ message: "User not found" });
    const access = await storage.getDeptAccessForUser(id);
    const entry = access.find(a => a.departmentId === deptId);
    if (!entry) return res.status(404).json({ message: "Access entry not found" });
    await storage.removeDeptAccess(entry.id);
    res.json({ ok: true });
  });

  // ─── Team Members ──────────────────────────────────────────────────────────
  app.get("/api/team-members", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.json([]);
    res.json(await storage.getTeamMembers(company.id));
  });

  app.post("/api/team-members", requireEditAccess, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(400).json({ message: "No company profile" });
    const { name, email, department, jobTitle } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });
    const member = await storage.createTeamMember({ companyId: company.id, name, email: email || null, department: department || null, jobTitle: jobTitle || null });
    res.status(201).json(member);
  });

  app.patch("/api/team-members/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const { name, email, department, jobTitle } = req.body;
    const updated = await storage.updateTeamMember(id, { name, email, department, jobTitle });
    res.json(updated);
  });

  app.delete("/api/team-members/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    await storage.deleteTeamMember(id);
    res.json({ ok: true });
  });

  // ─── Projects ──────────────────────────────────────────────────────────────
  // NOTE: /template must be registered before /:id so Express doesn't treat "template" as an id
  app.get("/api/projects/template", requireAuth, (_req: Request, res: Response) => {
    const wb = XLSX.utils.book_new();
    const headers = [["Name *", "Description", "Owner", "Business Unit", "Strategic Goal", "Start Date (DD-MM-YYYY)", "Due Date (DD-MM-YYYY)", "Status", "Priority"]];
    const example = [["Loyalty Programme Launch", "Drive customer retention via loyalty scheme", "Jane Smith", "Marketing", "Increase Revenue", "01-01-2026", "30-06-2026", "Not Started", "High"]];
    const note = [["", "", "", "", "", "", "", "Not Started | In Progress | At Risk | Delayed | Completed", "Critical | High | Medium | Low"]];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...example, ...note]);
    ws["!cols"] = headers[0].map(h => ({ wch: Math.max(h.length + 4, 22) }));
    XLSX.utils.book_append_sheet(wb, ws, "Projects");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=projects_template.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });

  app.get("/api/projects", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const deptIds = await getAccessibleDeptIds(req);
    const allProjects = await storage.getProjects(company.id);
    const visibleProjects = deptIds ? allProjects.filter(p => !p.departmentId || deptIds.includes(p.departmentId)) : allProjects;
    const allTasks = await storage.getTasks(company.id);
    const allMilestones = await storage.getMilestones(company.id);
    const projectsWithHealth = visibleProjects.map(p => {
      const pt = allTasks.filter(t => t.projectId === p.id);
      const pm = allMilestones.filter(m => m.projectId === p.id);
      const completedCount = pt.filter(t => t.status === "Completed").length;
      const computedProgress = pt.length > 0 ? Math.round((completedCount / pt.length) * 100) : (p.progress ?? 0);
      const health = computeProjectHealth({ ...p, progress: computedProgress }, pt, pm);
      return { ...p, progress: computedProgress, health, taskCount: pt.length, completedTaskCount: completedCount };
    });
    res.json(projectsWithHealth);
  });

  app.get("/api/projects/:id", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const project = await storage.getProject(id);
    if (!project || project.companyId !== company.id) return res.status(404).json({ message: "Not found" });
    const [pt, pm] = await Promise.all([storage.getTasksByProject(id), storage.getMilestonesByProject(id)]);
    const completedCount = pt.filter(t => t.status === "Completed").length;
    const computedProgress = pt.length > 0 ? Math.round((completedCount / pt.length) * 100) : (project.progress ?? 0);
    const health = computeProjectHealth({ ...project, progress: computedProgress }, pt, pm);
    res.json({ ...project, progress: computedProgress, health, tasks: pt, milestones: pm });
  });

  app.post("/api/projects", requireEditAccess, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const project = await storage.createProject({ ...req.body, companyId: company.id });
    logActivity(req.user!.id, company.id, "create_project", "initiatives", `Created initiative: ${project.name}`).catch(() => {});
    res.json(project);
  });

  app.patch("/api/projects/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const existing = await storage.getProject(id);
    if (!existing || existing.companyId !== company.id) return res.status(404).json({ message: "Not found" });
    const { createdAt, health, taskCount, completedTaskCount, tasks, milestones, ...safeBody } = req.body;
    const updated = await storage.updateProject(id, safeBody);
    logActivity(req.user!.id, company.id, "update_project", "initiatives", `Updated initiative: ${existing.name}${req.body.status ? ` → ${req.body.status}` : ""}`).catch(() => {});
    res.json(updated);
  });

  app.delete("/api/projects/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const existing = await storage.getProject(id);
    if (!existing || existing.companyId !== company.id) return res.status(404).json({ message: "Not found" });
    await storage.deleteProject(id);
    logActivity(req.user!.id, company.id, "delete_project", "initiatives", `Deleted initiative: ${existing.name}`).catch(() => {});
    res.json({ ok: true });
  });

  // ─── Tasks ─────────────────────────────────────────────────────────────────
  app.get("/api/tasks", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const allTasks = await storage.getTasks(company.id);
    res.json(allTasks);
  });

  app.get("/api/projects/:id/tasks", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const project = await storage.getProject(id);
    if (!project || project.companyId !== company.id) return res.status(404).json({ message: "Not found" });
    const projectTasks = await storage.getTasksByProject(id);
    const tasksWithSubtasks = await Promise.all(projectTasks.map(async t => {
      const subs = await storage.getSubtasks(t.id);
      return { ...t, subtasks: subs };
    }));
    res.json(tasksWithSubtasks);
  });

  app.post("/api/tasks", requireEditAccess, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const task = await storage.createTask({ ...req.body, companyId: company.id });
    logActivity(req.user!.id, company.id, "create_task", "initiatives", `Created task: ${task.title}`).catch(() => {});
    res.json(task);
  });

  app.patch("/api/tasks/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const existing = await storage.getTask(id);
    if (!existing || existing.companyId !== company.id) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateTask(id, req.body);
    if (req.body.status) logActivity(req.user!.id, company.id, "update_task", "initiatives", `Task "${existing.title}" → ${req.body.status}`).catch(() => {});
    res.json(updated);
  });

  app.delete("/api/tasks/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const existing = await storage.getTask(id);
    if (!existing || existing.companyId !== company.id) return res.status(404).json({ message: "Not found" });
    await storage.deleteTask(id);
    res.json({ ok: true });
  });

  // ─── Subtasks ──────────────────────────────────────────────────────────────
  app.get("/api/tasks/:id/subtasks", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const subs = await storage.getSubtasks(id);
    res.json(subs);
  });

  // Helper: recalculate parent initiative progress from its subtasks
  async function recalcInitiativeProgress(taskId: number) {
    const subs = await storage.getSubtasks(taskId);
    if (subs.length === 0) return;
    const avg = Math.round(subs.reduce((sum, s) => sum + ((s as any).progress ?? (s.completed ? 100 : 0)), 0) / subs.length);
    const status = avg >= 100 ? "Completed" : avg > 0 ? "In Progress" : "Not Started";
    await storage.updateTask(taskId, { progress: avg, status } as any);
  }

  app.post("/api/tasks/:id/subtasks", requireEditAccess, async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.id as string);
    const progress = parseInt(req.body.progress ?? "0") || 0;
    const completed = progress >= 100;
    const sub = await storage.createSubtask({
      taskId,
      title: req.body.title,
      owner: req.body.owner || null,
      dueDate: req.body.dueDate || null,
      status: req.body.status || (completed ? "Completed" : "Not Started"),
      completed,
      progress,
    } as any);
    await recalcInitiativeProgress(taskId);
    res.json(sub);
  });

  app.patch("/api/subtasks/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const existing = await storage.getSubtask(id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateSubtask(id, req.body);
    await recalcInitiativeProgress(existing.taskId);
    res.json(updated);
  });

  app.delete("/api/subtasks/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const existing = await storage.getSubtask(id);
    await storage.deleteSubtask(id);
    if (existing) await recalcInitiativeProgress(existing.taskId);
    res.json({ ok: true });
  });

  // ─── Milestones ────────────────────────────────────────────────────────────
  app.get("/api/milestones", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const all = await storage.getMilestones(company.id);
    res.json(all);
  });

  app.get("/api/projects/:id/milestones", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const all = await storage.getMilestonesByProject(id);
    res.json(all);
  });

  app.post("/api/milestones", requireEditAccess, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const ms = await storage.createMilestone({ ...req.body, companyId: company.id });
    res.json(ms);
  });

  app.patch("/api/milestones/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const updated = await storage.updateMilestone(id, req.body);
    res.json(updated);
  });

  app.delete("/api/milestones/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    await storage.deleteMilestone(id);
    res.json({ ok: true });
  });

  // ─── Comments ──────────────────────────────────────────────────────────────
  app.get("/api/comments/:entityType/:entityId", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const { entityType, entityId } = req.params;
    const comments = await storage.getComments(company.id, entityType, parseInt(entityId as string));
    res.json(comments);
  });

  app.post("/api/comments/:entityType/:entityId", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const { entityType, entityId } = req.params;
    const user = req.user!;
    const comment = await storage.createComment({
      companyId: company.id,
      entityType,
      entityId: parseInt(entityId as string),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      content: req.body.content,
    });
    res.json(comment);
  });

  app.delete("/api/comments/:id", requireAuth, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    await storage.deleteComment(id);
    res.json({ ok: true });
  });

  // ─── Projects / Initiatives Excel Bulk Upload ──────────────────────────────
  const VALID_STATUSES = ["Not Started", "In Progress", "At Risk", "Delayed", "Completed"];
  const VALID_PRIORITIES = ["Critical", "High", "Medium", "Low"];

  const createProjectFromRow = async (companyId: number, row: Record<string, any>) => {
    const name = (row["name"] || row["Name *"] || row["Name"] || "").trim();
    if (!name) throw new Error("Name is required");
    const statusVal = (row["status"] || row["Status"] || "Not Started").trim();
    const priorityVal = (row["priority"] || row["Priority"] || "Medium").trim();
    return await storage.createProject({
      companyId,
      name,
      description: (row["description"] || row["Description"] || "").trim() || null,
      owner: (row["owner"] || row["Owner"] || "").trim() || null,
      businessUnit: (row["businessUnit"] || row["Business Unit"] || "").trim() || null,
      strategicGoal: (row["strategicGoal"] || row["Strategic Goal"] || "").trim() || null,
      riskNotes: null,
      startDate: parseDateStr(row["startDate"] || row["Start Date (DD-MM-YYYY)"] || row["Start Date (YYYY-MM-DD)"] || null),
      dueDate: parseDateStr(row["dueDate"] || row["Due Date (DD-MM-YYYY)"] || row["Due Date (YYYY-MM-DD)"] || null),
      status: VALID_STATUSES.includes(statusVal) ? statusVal : "Not Started",
      priority: VALID_PRIORITIES.includes(priorityVal) ? priorityVal : "Medium",
    });
  };

  app.post("/api/upload/projects", requireEditAccess, async (req: Request, res: Response) => {
    try {
      const company = await getCompanyForUser(req);
      if (!company) return res.status(404).json({ message: "Company not found" });
      const { data } = req.body as { data: Record<string, any>[] };
      if (!Array.isArray(data) || data.length === 0) return res.status(400).json({ message: "No data provided" });
      const imported: any[] = [];
      const errors: { row: number; reason: string }[] = [];
      for (let i = 0; i < data.length; i++) {
        try {
          const proj = await createProjectFromRow(company.id, data[i]);
          imported.push(proj);
        } catch (e: any) {
          errors.push({ row: i + 2, reason: e.message });
        }
      }
      res.json({ imported: imported.length, errors, projects: imported });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/initiatives/bulk-upload", requireEditAccess, async (req: Request, res: Response) => {
    try {
      const company = await getCompanyForUser(req);
      if (!company) return res.status(404).json({ message: "Company not found" });
      const rows = (req.body.rows || req.body.data) as Record<string, any>[];
      if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ message: "No rows provided" });
      const imported: any[] = [];
      const errors: { row: number; reason: string }[] = [];
      for (let i = 0; i < rows.length; i++) {
        try {
          const proj = await createProjectFromRow(company.id, rows[i]);
          imported.push(proj);
        } catch (e: any) {
          errors.push({ row: i + 2, reason: e.message });
        }
      }
      res.json({ imported: imported.length, created: imported.length, errors, initiatives: imported });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Portfolio Stats ───────────────────────────────────────────────────────
  app.get("/api/portfolio/stats", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const [allProjects, allTasks, allMilestones] = await Promise.all([
      storage.getProjects(company.id),
      storage.getTasks(company.id),
      storage.getMilestones(company.id),
    ]);
    const today = new Date().toISOString().split("T")[0];
    const projectsWithHealth = allProjects.map(p => {
      const pt = allTasks.filter(t => t.projectId === p.id);
      const pm = allMilestones.filter(m => m.projectId === p.id);
      return computeProjectHealth(p, pt, pm);
    });
    const stats = {
      total: allProjects.length,
      active: allProjects.filter(p => p.status === "In Progress" || p.status === "Not Started").length,
      completed: allProjects.filter(p => p.status === "Completed").length,
      atRisk: projectsWithHealth.filter(h => h === "Red").length,
      overdueTasks: allTasks.filter(t => t.dueDate && t.dueDate < today && t.status !== "Completed").length,
      upcomingMilestones: allMilestones.filter(m => m.status === "Upcoming" && m.dueDate && m.dueDate >= today).length,
    };
    res.json(stats);
  });

  // ─── Workload ──────────────────────────────────────────────────────────────
  app.get("/api/workload", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });

    const [allTasks, allActionItems] = await Promise.all([
      storage.getTasks(company.id),
      storage.getActionItems(company.id),
    ]);

    const today = new Date().toISOString().split("T")[0];

    type WorkloadEntry = {
      name: string; total: number; notStarted: number; inProgress: number;
      completed: number; overdue: number; tasks: typeof allTasks;
    };
    const byAssignee: Record<string, WorkloadEntry> = {};

    const ensure = (name: string) => {
      if (!byAssignee[name]) byAssignee[name] = { name, total: 0, notStarted: 0, inProgress: 0, completed: 0, overdue: 0, tasks: [] };
      return byAssignee[name];
    };

    // Aggregate project tasks
    for (const task of allTasks) {
      const name = task.assignee || "Unassigned";
      const a = ensure(name);
      a.total++;
      a.tasks.push(task);
      if (task.status === "Completed") a.completed++;
      else if (task.status === "In Progress") a.inProgress++;
      else a.notStarted++;
      if (task.dueDate && task.dueDate < today && task.status !== "Completed") a.overdue++;
    }

    // Aggregate action items — strip role/title suffixes from owner names like "Ghadir (PMO Secretary)"
    for (const action of allActionItems) {
      const rawName = action.ownerName || "Unassigned";
      // Remove parenthetical role suffixes: "Fatima Al Rashid (HR Manager)" → "Fatima Al Rashid"
      const name = rawName.replace(/\s*\(.*?\)\s*$/, "").trim() || "Unassigned";
      const a = ensure(name);
      a.total++;
      const status = action.status || "Not Started";
      if (status === "Completed") a.completed++;
      else if (status === "In Progress" || status === "Delayed") a.inProgress++;
      else a.notStarted++;
      const dueDate = action.revisedDueDate || action.dueDate;
      if (dueDate && dueDate < today && status !== "Completed") a.overdue++;
    }

    res.json(Object.values(byAssignee).sort((a, b) => b.total - a.total));
  });

  // ─── Global Search ─────────────────────────────────────────────────────────
  app.get("/api/search", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const q = (req.query.q as string || "").trim();
    if (!q || q.length < 2) return res.json({ projects: [], tasks: [], kpis: [], meetings: [], actionItems: [] });
    const results = await storage.searchAll(company.id, q);
    res.json(results);
  });

  // ─── Subscription / Plan ─────────────────────────────────────────────────
  app.get("/api/subscription", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.json(null);
    let sub = await storage.getSubscription(company.id);
    if (!sub) {
      // Auto-create a Trial subscription for new companies so the countdown is visible from day 1
      sub = await storage.upsertSubscription(company.id, {
        planName: "Trial",
        status: "Active",
        maxUsers: 5,
        dailyAiLimit: 15,
        trialStartDate: company.createdAt ? new Date(company.createdAt) : new Date(),
      });
    } else if (sub.planName === "Trial" && !sub.trialStartDate) {
      // Backfill trialStartDate for existing Trial subscriptions that are missing it
      sub = await storage.upsertSubscription(company.id, {
        trialStartDate: company.createdAt ? new Date(company.createdAt) : new Date(),
      });
    }
    const dailyUsed = await storage.getDailyAiCount(company.id);
    res.json({ ...sub, dailyUsed });
  });

  app.post("/api/activate-key", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { keyValue } = req.body as { keyValue: string };
      if (!keyValue) return res.status(400).json({ message: "Activation key required" });
      const company = await getCompanyForUser(req);
      if (!company) return res.status(404).json({ message: "Company not found" });
      const key = await storage.getActivationKeyByValue(keyValue.trim().toUpperCase());
      if (!key) return res.status(404).json({ message: "Invalid activation key" });
      if (key.status === "Revoked") return res.status(400).json({ message: "This key has been revoked" });
      if (key.status === "Active") return res.status(400).json({ message: "This key has already been used" });
      if (key.expiresAt && new Date(key.expiresAt) < new Date()) return res.status(400).json({ message: "This key has expired" });
      if (key.companyId && key.companyId !== company.id) return res.status(400).json({ message: "This key is not assigned to your company" });
      await storage.updateActivationKey(key.id, { status: "Active", activatedAt: new Date(), companyId: company.id });
      const sub = await storage.upsertSubscription(company.id, {
        planName: key.planName,
        status: "Active",
        maxUsers: key.maxUsers,
        dailyAiLimit: key.dailyAiLimit,
        startDate: new Date(),
      });
      await logActivity(req.user!.id, company.id, "key_activation", "settings", `Activated key ${keyValue} (${key.planName})`);
      res.json({ message: "Activation successful", subscription: sub });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ─── Performo Assistant ───────────────────────────────────────────────────
  app.post("/api/assistant/chat", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const user = req.user!;
    const { messages, confirmedAction } = req.body;
    if (!Array.isArray(messages)) return res.status(400).json({ message: "messages array required" });
    try {
      const sub = await storage.getSubscription(company.id);
      const dailyLimit = sub?.dailyAiLimit ?? 15;
      const dailyUsed = await storage.getDailyAiCount(company.id);
      if (dailyUsed >= dailyLimit) {
        return res.status(429).json({
          type: "limit_reached",
          message: `Daily AI limit of ${dailyLimit} requests reached for your plan. Please upgrade or contact your platform administrator.`,
          dailyUsed,
          dailyLimit,
        });
      }
      await logActivity(user.id, company.id, "ai_request", "assistant", messages[messages.length - 1]?.content?.slice(0, 100));
      const result = await processAssistantMessage(
        messages,
        company.id,
        user.id,
        user.name,
        user.role,
        confirmedAction || undefined
      );
      res.json(result);
    } catch (err: any) {
      console.error("Assistant error:", err);
      res.status(500).json({ type: "error", message: "Assistant is temporarily unavailable." });
    }
  });

  app.get("/api/assistant/logs", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const logs = await storage.getAssistantLogs(company.id, 50);
    res.json(logs);
  });

  // ─── Document upload / download / delete ─────────────────────────────────
  {
    const multer = (await import("multer")).default;
    const path = (await import("path")).default;
    const fsSync = (await import("fs")).default;
    const { randomBytes } = await import("crypto");

    const UPLOAD_DIR = path.join(process.cwd(), "uploads", "documents");
    if (!fsSync.existsSync(UPLOAD_DIR)) fsSync.mkdirSync(UPLOAD_DIR, { recursive: true });

    // Serve uploaded files as static
    app.use("/uploads", (await import("express")).static(path.join(process.cwd(), "uploads")));

    const upload = multer({
      storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${randomBytes(16).toString("hex")}${ext}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
    });

    app.get("/api/documents", requireAuth, async (req: Request, res: Response) => {
      const { entityType, entityId } = req.query;
      if (!entityType || !entityId) return res.status(400).json({ message: "entityType and entityId required" });
      const docs = await storage.getDocuments(String(entityType), Number(entityId));
      res.json(docs);
    });

    app.post("/api/documents", requireAuth, requireEditAccess, upload.single("file"), async (req: Request, res: Response) => {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const company = await getCompanyForUser(req);
      if (!company) return res.status(404).json({ message: "Company not found" });
      const { entityType, entityId } = req.body;
      if (!entityType || !entityId) return res.status(400).json({ message: "entityType and entityId required" });
      const doc = await storage.createDocument({
        companyId: company.id,
        entityType,
        entityId: Number(entityId),
        originalName: req.file.originalname,
        storageName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedBy: (req.user as any)?.name || null,
      });
      res.json(doc);
    });

    app.delete("/api/documents/:id", requireAuth, requireEditAccess, async (req: Request, res: Response) => {
      const doc = await storage.getDocument(Number(req.params.id));
      if (!doc) return res.status(404).json({ message: "Document not found" });
      // Delete file from disk
      const filePath = path.join(UPLOAD_DIR, doc.storageName);
      try { fsSync.unlinkSync(filePath); } catch {}
      await storage.deleteDocument(doc.id);
      res.json({ ok: true });
    });

    app.get("/api/documents/:id/download", requireAuth, async (req: Request, res: Response) => {
      const doc = await storage.getDocument(Number(req.params.id));
      if (!doc) return res.status(404).json({ message: "Document not found" });
      const filePath = path.join(UPLOAD_DIR, doc.storageName);
      res.download(filePath, doc.originalName);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // Analytics Studio Routes
  // ═══════════════════════════════════════════════════════════════════
  {
    const multer = (await import("multer")).default;
    const analyticsUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
    const getOai = async () => {
      const OpenAI = (await import("openai")).default;
      return new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
    };

    // Helper: build widgets from data rows
    function buildWidgetsFromData(rows: Record<string, unknown>[], config: Record<string, unknown> | null): { widgetType: string; title: string; config: unknown; position: number }[] {
      if (!rows || !rows.length) return [];
      const cols = Object.keys(rows[0]);
      const numericCols = cols.filter(c => rows.every(r => r[c] !== null && r[c] !== "" && !isNaN(Number(r[c]))));
      const textCols = cols.filter(c => !numericCols.includes(c));
      const timeCol = cols.find(c => /date|month|period|week|year|quarter/i.test(c));
      const categoryCol = textCols.find(c => c !== timeCol) || textCols[0];

      const widgets: { widgetType: string; title: string; config: unknown; position: number }[] = [];
      let pos = 0;

      // KPI cards for numeric columns (top 4)
      for (const col of numericCols.slice(0, 4)) {
        const vals = rows.map(r => Number(r[col])).filter(v => !isNaN(v));
        const total = vals.reduce((a, b) => a + b, 0);
        const avg = vals.length ? total / vals.length : 0;
        widgets.push({
          widgetType: "kpi_card",
          title: col.replace(/_/g, " "),
          config: { metric: col, value: avg, total, count: vals.length, label: col.replace(/_/g, " ") },
          position: pos++,
        });
      }

      // Line/bar chart: time series if time column present
      if (timeCol && numericCols.length > 0) {
        const metric = numericCols[0];
        const grouped: Record<string, number> = {};
        for (const r of rows) {
          const k = String(r[timeCol] || "");
          grouped[k] = (grouped[k] || 0) + Number(r[metric] || 0);
        }
        const chartData = Object.entries(grouped).map(([k, v]) => ({ [timeCol]: k, [metric]: Math.round(v * 100) / 100 }));
        widgets.push({
          widgetType: "line_chart",
          title: `${metric.replace(/_/g, " ")} over time`,
          config: { data: chartData, xKey: timeCol, yKey: metric, color: "#3b82f6" },
          position: pos++,
        });
      }

      // Bar chart: category breakdown
      if (categoryCol && numericCols.length > 0) {
        const metric = numericCols[0];
        const grouped: Record<string, number> = {};
        for (const r of rows) {
          const k = String(r[categoryCol] || "Other");
          grouped[k] = (grouped[k] || 0) + Number(r[metric] || 0);
        }
        const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const chartData = sorted.map(([k, v]) => ({ [categoryCol]: k, [metric]: Math.round(v * 100) / 100 }));
        widgets.push({
          widgetType: "bar_chart",
          title: `${metric.replace(/_/g, " ")} by ${categoryCol.replace(/_/g, " ")}`,
          config: { data: chartData, xKey: categoryCol, yKey: metric, color: "#8b5cf6" },
          position: pos++,
        });
      }

      // Pie chart if there's a second numeric column and a category
      if (categoryCol && numericCols.length >= 2) {
        const metric = numericCols[1];
        const grouped: Record<string, number> = {};
        for (const r of rows) {
          const k = String(r[categoryCol] || "Other");
          grouped[k] = (grouped[k] || 0) + Number(r[metric] || 0);
        }
        const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const pieData = sorted.map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
        widgets.push({
          widgetType: "pie_chart",
          title: `${metric.replace(/_/g, " ")} distribution`,
          config: { data: pieData },
          position: pos++,
        });
      }

      // Data table (all rows, first 100)
      widgets.push({
        widgetType: "table",
        title: "Data Table",
        config: { columns: cols, rows: rows.slice(0, 100) },
        position: pos++,
      });

      return widgets;
    }

    // GET all dashboards for company
    app.get("/api/analytics/dashboards", requireAuth, async (req: Request, res: Response) => {
      const user = (req as any).user;
      const dbs = await storage.getAnalyticsDashboards(user.companyId);
      res.json(dbs);
    });

    // POST create dashboard
    app.post("/api/analytics/dashboards", requireAuth, async (req: Request, res: Response) => {
      const user = (req as any).user;
      const { title, description, audience, businessArea, naturalLanguagePrompt, visibility, departmentId } = req.body;
      if (!title) return res.status(400).json({ message: "Title is required" });
      const dash = await storage.createAnalyticsDashboard({
        companyId: user.companyId,
        createdBy: user.id,
        title,
        description: description || null,
        audience: audience || null,
        businessArea: businessArea || null,
        naturalLanguagePrompt: naturalLanguagePrompt || null,
        config: req.body.config || null,
        templateConfig: null,
        status: "draft",
        visibility: visibility || "private",
        departmentId: departmentId || null,
      });
      res.json(dash);
    });

    // GET single dashboard with all related data
    app.get("/api/analytics/dashboards/:id", requireAuth, async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      const dash = await storage.getAnalyticsDashboard(id);
      if (!dash) return res.status(404).json({ message: "Dashboard not found" });
      const [widgets, narrative, uploads, chat] = await Promise.all([
        storage.getAnalyticsDashboardWidgets(id),
        storage.getAnalyticsDashboardNarrative(id),
        storage.getAnalyticsDashboardUploads(id),
        storage.getAnalyticsDashboardChat(id),
      ]);
      res.json({ ...dash, widgets, narrative: narrative || null, uploads, chat });
    });

    // PATCH update dashboard
    app.patch("/api/analytics/dashboards/:id", requireAuth, async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      const dash = await storage.updateAnalyticsDashboard(id, req.body);
      res.json(dash);
    });

    // DELETE dashboard
    app.delete("/api/analytics/dashboards/:id", requireAuth, async (req: Request, res: Response) => {
      await storage.deleteAnalyticsDashboard(Number(req.params.id));
      res.json({ ok: true });
    });

    // POST generate Excel template (AI designs columns, returns xlsx download)
    app.post("/api/analytics/dashboards/:id/generate-template", requireAuth, async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      const dash = await storage.getAnalyticsDashboard(id);
      if (!dash) return res.status(404).json({ message: "Not found" });

      try {
        const prompt = `You are a business data analyst. The user wants to create a dashboard with these details:
Title: ${dash.title}
Audience: ${dash.audience || "Business team"}
Business Area: ${dash.businessArea || "General"}
Requirements: ${dash.naturalLanguagePrompt || "General performance dashboard"}

Design the EXACT Excel template columns they need. Return ONLY a JSON array (no markdown, no explanation) like this:
[{"name":"Column Name","key":"column_key","type":"text|number|date|percent","required":true|false,"description":"Short description","example":"Example value"}]

Keep it practical: 5-12 columns. Include columns for dates, key metrics, dimensions, and targets where relevant.`;

        const oai = await getOai();
        const completion = await oai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 1500,
        });

        let cols: { name: string; key: string; type: string; required: boolean; description: string; example: string }[] = [];
        try {
          const raw = JSON.parse(completion.choices[0].message.content || "{}");
          cols = Array.isArray(raw) ? raw : raw.columns || raw.template || [];
        } catch { cols = []; }

        if (!cols.length) {
          cols = [
            { name: "Date", key: "date", type: "date", required: true, description: "Period or date", example: "2026-01-01" },
            { name: "Category", key: "category", type: "text", required: true, description: "Category or segment", example: "Sales" },
            { name: "Value", key: "value", type: "number", required: true, description: "Primary metric", example: "1500" },
            { name: "Target", key: "target", type: "number", required: false, description: "Target value", example: "2000" },
          ];
        }

        // Save template config
        await storage.updateAnalyticsDashboard(id, { templateConfig: cols });

        // Build xlsx workbook
        const wb = XLSX.utils.book_new();

        // Instructions sheet
        const instrData = [
          ["Performo AI — Analytics Studio Template"],
          ["Dashboard:", dash.title],
          ["Audience:", dash.audience || "Business team"],
          ["Business Area:", dash.businessArea || "General"],
          [""],
          ["INSTRUCTIONS"],
          ["1. Fill in the 'Data' sheet with your data"],
          ["2. Do not change column headers"],
          ["3. Required columns are marked with * in the Data sheet"],
          ["4. Date format: YYYY-MM-DD (e.g. 2026-03-01)"],
          ["5. Numbers should not include currency symbols or commas"],
          ["6. Upload the completed file back to Performo AI"],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instrData), "Instructions");

        // Data sheet with headers and 10 blank rows
        const headers = cols.map((c: { name: string; required: boolean }) => `${c.name}${c.required ? " *" : ""}`);
        const exampleRow = cols.map((c: { example: string }) => c.example);
        const blankRows = Array.from({ length: 10 }, () => cols.map(() => ""));
        const dataSheet = XLSX.utils.aoa_to_sheet([headers, exampleRow, ...blankRows]);
        XLSX.utils.book_append_sheet(wb, dataSheet, "Data");

        // Column guide sheet
        const guideHeaders = ["Column", "Key", "Type", "Required", "Description", "Example"];
        const guideRows = cols.map((c: { name: string; key: string; type: string; required: boolean; description: string; example: string }) => [c.name, c.key, c.type, c.required ? "Yes" : "No", c.description, c.example]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([guideHeaders, ...guideRows]), "Column Guide");

        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${dash.title.replace(/[^a-z0-9]/gi, "_")}_template.xlsx"`);
        res.send(buf);
      } catch (err: any) {
        console.error("Template generation error:", err);
        res.status(500).json({ message: err.message || "Failed to generate template" });
      }
    });

    // POST upload data Excel
    app.post("/api/analytics/dashboards/:id/upload", requireAuth, analyticsUpload.single("file"), async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      const dash = await storage.getAnalyticsDashboard(id);
      if (!dash) return res.status(404).json({ message: "Not found" });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      try {
        const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
        // Try 'Data' sheet first, else first sheet
        const sheetName = wb.SheetNames.includes("Data") ? "Data" : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", cellDates: true });
        // Normalize Date objects → YYYY-MM-DD strings so rows are JSON-serialisable
        const rows = rawRows.map(row => {
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(row)) {
            if (v instanceof Date && !isNaN(v.getTime())) {
              const y = v.getFullYear(), mo = String(v.getMonth() + 1).padStart(2, "0"), d = String(v.getDate()).padStart(2, "0");
              out[k] = `${y}-${mo}-${d}`;
            } else {
              out[k] = v;
            }
          }
          return out;
        });

        // Get template config for validation
        const templateCols = (dash.templateConfig || []) as { key: string; name: string; required: boolean; type: string }[];
        const errors: { row: number; column: string; message: string }[] = [];

        // Validate required columns exist
        const actualKeys = rows.length > 0 ? Object.keys(rows[0]) : [];
        const requiredCols = templateCols.filter(c => c.required);
        for (const col of requiredCols) {
          const match = actualKeys.find(k =>
            k.toLowerCase().replace(/[^a-z0-9]/g, "") === col.key.toLowerCase().replace(/[^a-z0-9]/g, "") ||
            k.toLowerCase().replace(/[^a-z0-9]/g, "") === col.name.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/\*/g, "")
          );
          if (!match) {
            errors.push({ row: 0, column: col.name, message: `Required column "${col.name}" not found` });
          }
        }

        // Validate numeric columns
        if (templateCols.length > 0) {
          for (let i = 0; i < Math.min(rows.length, 500); i++) {
            const row = rows[i];
            for (const col of templateCols) {
              if (col.type === "number" || col.type === "percent") {
                const key = Object.keys(row).find(k =>
                  k.toLowerCase().replace(/[^a-z0-9]/g, "") === col.key.toLowerCase().replace(/[^a-z0-9]/g, "")
                );
                if (key && row[key] !== "" && isNaN(Number(row[key]))) {
                  errors.push({ row: i + 2, column: col.name, message: `Invalid number: "${row[key]}"` });
                }
              }
            }
          }
        }

        const status = errors.length === 0 ? "valid" : errors.length > rows.length * 0.3 ? "invalid" : "valid";
        const upload = await storage.createAnalyticsDashboardUpload({
          dashboardId: id,
          uploadedBy: (req as any).user.id,
          fileName: req.file.originalname,
          rowCount: rows.length,
          data: rows as never,
          validationStatus: status,
          validationErrors: errors as never,
        });

        // Auto-build widgets if valid
        if (status === "valid") {
          const widgets = buildWidgetsFromData(rows as Record<string, unknown>[], dash.config as Record<string, unknown>);
          await storage.upsertAnalyticsDashboardWidgets(id, widgets);
          await storage.updateAnalyticsDashboard(id, { status: "draft" });
        }

        res.json({ upload, errors, rowCount: rows.length, status });
      } catch (err: any) {
        console.error("Upload error:", err);
        res.status(500).json({ message: err.message || "Failed to process file" });
      }
    });

    // POST regenerate widgets from latest upload data
    app.post("/api/analytics/dashboards/:id/regenerate", requireAuth, async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      const dash = await storage.getAnalyticsDashboard(id);
      if (!dash) return res.status(404).json({ message: "Not found" });
      const uploads = await storage.getAnalyticsDashboardUploads(id);
      const latest = uploads[0];
      if (!latest) return res.status(400).json({ message: "No data uploaded yet" });
      const rows = (latest.data || []) as Record<string, unknown>[];
      const widgets = buildWidgetsFromData(rows, dash.config as Record<string, unknown>);
      await storage.upsertAnalyticsDashboardWidgets(id, widgets);
      res.json({ ok: true, widgetCount: widgets.length });
    });

    // POST generate AI narrative
    app.post("/api/analytics/dashboards/:id/narrative", requireAuth, async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      const dash = await storage.getAnalyticsDashboard(id);
      if (!dash) return res.status(404).json({ message: "Not found" });
      const uploads = await storage.getAnalyticsDashboardUploads(id);
      const latestUpload = uploads[0];
      if (!latestUpload) return res.status(400).json({ message: "No data uploaded yet" });

      const rows = (latestUpload.data || []) as Record<string, unknown>[];
      const summary = rows.slice(0, 30).map(r => JSON.stringify(r)).join("\n");

      try {
        const prompt = `You are an expert business analyst generating an executive dashboard narrative.

Dashboard: ${dash.title}
Audience: ${dash.audience || "Senior management"}
Business Area: ${dash.businessArea || "General"}
Total data rows: ${rows.length}

Sample data (first 30 rows):
${summary}

Generate a comprehensive but concise dashboard narrative. Return ONLY a JSON object with these exact keys:
{
  "executiveSummary": "2-3 paragraph executive summary",
  "insights": "3-5 key data insights as bullet points",
  "highlights": "Top 3 positive highlights",
  "risks": "Top 3 risks or concerns from the data",
  "trends": "Key trends observed",
  "suggestedActions": "3-5 recommended actions"
}`;

        const oai = await getOai();
        const completion = await oai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 2000,
        });

        const result = JSON.parse(completion.choices[0].message.content || "{}");
        const narrative = await storage.upsertAnalyticsDashboardNarrative({
          dashboardId: id,
          uploadId: latestUpload.id,
          executiveSummary: result.executiveSummary || null,
          insights: result.insights || null,
          highlights: result.highlights || null,
          risks: result.risks || null,
          trends: result.trends || null,
          suggestedActions: result.suggestedActions || null,
        });
        res.json(narrative);
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
    });

    // POST chat message
    app.post("/api/analytics/dashboards/:id/chat", requireAuth, async (req: Request, res: Response) => {
      const id = Number(req.params.id);
      const user = (req as any).user;
      const { content } = req.body;
      if (!content) return res.status(400).json({ message: "Content required" });

      const dash = await storage.getAnalyticsDashboard(id);
      if (!dash) return res.status(404).json({ message: "Not found" });
      const uploads = await storage.getAnalyticsDashboardUploads(id);
      const latestUpload = uploads[0];
      const rows = latestUpload ? (latestUpload.data || []) as Record<string, unknown>[] : [];
      const colNames = rows.length > 0 ? Object.keys(rows[0]).join(", ") : "no data";

      await storage.addAnalyticsDashboardChat({ dashboardId: id, userId: user.id, role: "user", content });

      try {
        const chatHistory = await storage.getAnalyticsDashboardChat(id);
        const msgs = chatHistory.slice(-8).map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

        const systemMsg = `You are an AI analytics assistant helping refine a business dashboard.
Dashboard: "${dash.title}" | Audience: ${dash.audience || "business team"} | Business Area: ${dash.businessArea || "general"}
Available data columns: ${colNames}
Total rows: ${rows.length}
You can help the user understand their data, suggest chart types, explain insights, and refine the dashboard. Be concise and professional.`;

        const oai = await getOai();
        const completion = await oai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemMsg }, ...msgs],
          max_tokens: 600,
        });

        const reply = completion.choices[0].message.content || "I couldn't generate a response.";
        const assistantMsg = await storage.addAnalyticsDashboardChat({ dashboardId: id, userId: user.id, role: "assistant", content: reply });
        res.json({ message: assistantMsg });
      } catch (err: any) {
        const reply = "I'm having trouble responding right now. Please try again.";
        const assistantMsg = await storage.addAnalyticsDashboardChat({ dashboardId: id, userId: user.id, role: "assistant", content: reply });
        res.json({ message: assistantMsg });
      }
    });

    // GET chat history
    app.get("/api/analytics/dashboards/:id/chat", requireAuth, async (req: Request, res: Response) => {
      const msgs = await storage.getAnalyticsDashboardChat(Number(req.params.id));
      res.json(msgs);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // Analytics Studio V2 Routes
  // ═══════════════════════════════════════════════════════════════════
  {
    const multer = (await import("multer")).default;
    const xlsx = await import("xlsx");
    const v2Upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

    const getOaiV2 = async () => {
      const OpenAI = (await import("openai")).default;
      return new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL });
    };

    // Helper: auto-detect column types from sample data
    function autoDetectColumnType(values: unknown[], colName?: string): string {
      const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== "");
      if (nonEmpty.length === 0) return "dimension";

      // Column-name heuristics — fastest signal
      if (colName) {
        const nameLower = colName.toLowerCase();
        if (/\b(date|month|year|period|week|quarter|day|time|timestamp)\b/.test(nameLower)) return "date";
      }

      // Excel date cells parsed with cellDates:true arrive as JS Date objects
      const dateObjs = nonEmpty.filter(v => v instanceof Date && !isNaN((v as Date).getTime()));
      if (dateObjs.length / nonEmpty.length > 0.8) return "date";

      // Numeric check — do this BEFORE string-date check to avoid false positives
      const numeric = nonEmpty.filter(v => typeof v === "number" || (!isNaN(Number(v)) && String(v).trim() !== ""));
      if (numeric.length / nonEmpty.length > 0.8) return "measure";

      // String-date check (e.g. "Jan 2024", "2024-01-15")
      const dateStr = nonEmpty.filter(v => {
        const s = String(v).trim();
        if (s.length < 4) return false; // single/two-digit numbers are not dates
        return !isNaN(Date.parse(s));
      });
      if (dateStr.length / nonEmpty.length > 0.8) return "date";

      return "dimension";
    }

    // Helper: aggregate data for chart
    // Evaluates formula columns (isFormula=true) and augments each row with computed values
    function applyFormulaColumns(
      rows: Record<string, unknown>[],
      columns: { columnName: string; label: string; isFormula?: boolean | null; formulaExpression?: string | null }[]
    ): Record<string, unknown>[] {
      const formulaCols = columns.filter(c => c.isFormula && c.formulaExpression);
      if (!formulaCols.length) return rows;
      return rows.map(row => {
        const out = { ...row };
        for (const col of formulaCols) {
          try {
            let expr = col.formulaExpression!;
            for (const c of columns.filter(x => !x.isFormula)) {
              const labelRe = new RegExp(`\\[${c.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`, "g");
              const nameRe  = new RegExp(`\\[${c.columnName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`, "g");
              const val = String(Number(row[c.columnName]) || 0);
              expr = expr.replace(labelRe, val).replace(nameRe, val);
            }
            expr = expr.replace(/\[[^\]]+\]/g, "0"); // safety: replace any remaining [refs] with 0
            // eslint-disable-next-line no-new-func
            const result = new Function(`"use strict"; return (${expr})`)();
            out[col.columnName] = typeof result === "number" && isFinite(result) ? Math.round(result * 1000) / 1000 : 0;
          } catch { out[col.columnName] = 0; }
        }
        return out;
      });
    }

    function aggregateData(
      rows: Record<string, unknown>[],
      measure: string,
      dimension: string | null,
      aggregation: string = "sum",
      limit?: number,
      sortChronological?: boolean
    ): { name: string; value: number }[] {
      if (!dimension) {
        const vals = rows.map(r => Number(r[measure])).filter(v => !isNaN(v));
        const total = aggregation === "avg" ? vals.reduce((a, b) => a + b, 0) / (vals.length || 1)
          : aggregation === "count" ? vals.length
          : aggregation === "min" ? Math.min(...vals)
          : aggregation === "max" ? Math.max(...vals)
          : vals.reduce((a, b) => a + b, 0);
        return [{ name: measure, value: Math.round(total * 100) / 100 }];
      }
      const groups: Record<string, number[]> = {};
      for (const row of rows) {
        const rawKey = row[dimension];
        // Normalize date keys to short month labels if they look like dates
        let key: string;
        const parsed = rawKey ? new Date(String(rawKey)) : null;
        if (parsed && !isNaN(parsed.getTime()) && String(rawKey).length >= 6) {
          key = parsed.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        } else {
          key = String(rawKey ?? "Unknown").trim() || "Unknown";
        }
        if (!groups[key]) groups[key] = [];
        const val = Number(row[measure]);
        if (!isNaN(val)) groups[key].push(val);
      }
      let result = Object.entries(groups).map(([name, vals]) => {
        const value = aggregation === "avg" ? vals.reduce((a, b) => a + b, 0) / (vals.length || 1)
          : aggregation === "count" ? vals.length
          : aggregation === "min" ? Math.min(...vals)
          : aggregation === "max" ? Math.max(...vals)
          : vals.reduce((a, b) => a + b, 0);
        return { name, value: Math.round(value * 100) / 100 };
      });
      // For date-like keys, sort chronologically; otherwise sort by value desc
      if (sortChronological) {
        result.sort((a, b) => {
          const da = new Date(a.name); const db = new Date(b.name);
          if (!isNaN(da.getTime()) && !isNaN(db.getTime())) return da.getTime() - db.getTime();
          return 0;
        });
      } else {
        result.sort((a, b) => b.value - a.value);
      }
      if (limit) result = result.slice(0, limit);
      return result;
    }

    // Helper: compute rich data statistics for AI context
    function computeDataStats(rows: Record<string, unknown>[], columns: { columnName: string; label: string; columnType: string }[]) {
      const stats: Record<string, unknown> = {};
      for (const col of columns.filter(c => c.columnType !== "ignore")) {
        const vals = rows.map(r => r[col.columnName]).filter(v => v !== null && v !== undefined && v !== "");
        if (col.columnType === "measure") {
          const nums = vals.map(v => Number(v)).filter(v => !isNaN(v));
          if (nums.length > 0) {
            const sum = nums.reduce((a, b) => a + b, 0);
            const avg = sum / nums.length;
            const sorted = [...nums].sort((a, b) => a - b);
            // Detect outliers: values > mean + 2*stddev
            const variance = nums.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / nums.length;
            const stddev = Math.sqrt(variance);
            const outliers = nums.filter(v => Math.abs(v - avg) > 2 * stddev);
            stats[col.label] = {
              type: "measure", sum: Math.round(sum * 100) / 100,
              avg: Math.round(avg * 100) / 100,
              min: sorted[0], max: sorted[sorted.length - 1],
              count: nums.length,
              hasOutliers: outliers.length > 0,
              outlierCount: outliers.length,
            };
          }
        } else if (col.columnType === "dimension") {
          const strVals = vals.map(v => String(v));
          const freq: Record<string, number> = {};
          for (const v of strVals) freq[v] = (freq[v] || 0) + 1;
          const topVals = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([v]) => v);
          stats[col.label] = { type: "dimension", uniqueCount: Object.keys(freq).length, topValues: topVals };
        } else if (col.columnType === "date") {
          const dates = vals.map(v => new Date(String(v))).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
          if (dates.length > 0) {
            stats[col.label] = {
              type: "date", min: dates[0].toLocaleDateString("en-US", { month: "short", year: "numeric" }),
              max: dates[dates.length - 1].toLocaleDateString("en-US", { month: "short", year: "numeric" }),
              count: dates.length,
            };
          }
        }
      }
      return stats;
    }

    // ── Datasets ──────────────────────────────────────────────────────

    app.get("/api/v2/analytics/datasets", requireAuth, async (req: Request, res: Response) => {
      const user = req.user as Express.User;
      const company = await getCompanyForUser(req);
      if (!company) return res.status(400).json({ message: "No company" });
      const datasets = await storage.getAnalyticsDatasets(company.id);
      res.json(datasets);
    });

    app.post("/api/v2/analytics/datasets", requireAuth, v2Upload.single("file"), async (req: Request, res: Response) => {
      try {
        const user = req.user as Express.User;
        const company = await getCompanyForUser(req);
        if (!company) return res.status(400).json({ message: "No company" });
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const wb = xlsx.read(req.file.buffer, { type: "buffer", cellDates: true });
        const sheetNames = wb.SheetNames;
        const sheet = wb.Sheets[sheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, { defval: null, cellDates: true }) as Record<string, unknown>[];
        const columns = rows.length ? Object.keys(rows[0]) : [];

        // Normalize Date objects → ISO date strings for consistent JSON storage
        const normalizeVal = (v: unknown) =>
          v instanceof Date ? v.toISOString().split("T")[0] : v;
        const normalizedRows = rows.map(r =>
          Object.fromEntries(Object.entries(r).map(([k, v]) => [k, normalizeVal(v)]))
        );

        const dataset = await storage.createAnalyticsDataset({
          companyId: company.id,
          createdBy: user.id,
          name: req.body.name || req.file.originalname.replace(/\.(xlsx|xls|csv)$/i, ""),
          description: req.body.description || null,
          fileName: req.file.originalname,
          sheetNames,
          rowCount: rows.length,
          rawData: normalizedRows.slice(0, 5000) as unknown as typeof rows,
          status: "active",
        });

        // Auto-detect columns — pass raw rows (with Date objects) and column name for best detection
        const colDefs = columns.map((col, i) => {
          const vals = rows.map(r => r[col]);
          const type = autoDetectColumnType(vals, col);
          return { columnName: col, label: col, columnType: type, aggregation: type === "measure" ? "sum" : null, format: "number", position: i, isFormula: false };
        });
        await storage.upsertAnalyticsDatasetColumns(dataset.id, colDefs);

        res.json({ ...dataset, columns: colDefs });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed" });
      }
    });

    app.get("/api/v2/analytics/datasets/:id", requireAuth, async (req: Request, res: Response) => {
      const ds = await storage.getAnalyticsDataset(Number(req.params.id));
      if (!ds) return res.status(404).json({ message: "Not found" });
      const columns = await storage.getAnalyticsDatasetColumns(ds.id);
      const insights = await storage.getAnalyticsInsightsByDataset(ds.id);
      const autoInsights = await storage.getAnalyticsAutoInsights(ds.id);
      res.json({ ...ds, columns, insights, autoInsights });
    });

    app.patch("/api/v2/analytics/datasets/:id", requireAuth, async (req: Request, res: Response) => {
      const updated = await storage.updateAnalyticsDataset(Number(req.params.id), req.body);
      res.json(updated);
    });

    // Replace dataset file — re-parses the file, preserves column config for matching columns
    app.post("/api/v2/analytics/datasets/:id/replace", requireAuth, v2Upload.single("file"), async (req: Request, res: Response) => {
      try {
        const datasetId = Number(req.params.id);
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const ds = await storage.getAnalyticsDataset(datasetId);
        if (!ds) return res.status(404).json({ message: "Dataset not found" });

        // Parse new file
        const wb = xlsx.read(req.file.buffer, { type: "buffer", cellDates: true });
        const sheetNames = wb.SheetNames;
        const sheet = wb.Sheets[sheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, { defval: null, cellDates: true }) as Record<string, unknown>[];
        const newColumns = rows.length ? Object.keys(rows[0]) : [];

        const normalizeVal = (v: unknown) =>
          v instanceof Date ? v.toISOString().split("T")[0] : v;
        const normalizedRows = rows.map(r =>
          Object.fromEntries(Object.entries(r).map(([k, v]) => [k, normalizeVal(v)]))
        );

        // Update raw data on the dataset
        await storage.updateAnalyticsDataset(datasetId, {
          fileName: req.file.originalname,
          sheetNames,
          rowCount: rows.length,
          rawData: normalizedRows.slice(0, 5000) as unknown as Record<string, unknown>[],
        });

        // Get existing column config so we can preserve labels/types for matching columns
        const existingCols = await storage.getAnalyticsDatasetColumns(datasetId);
        const existingMap = new Map(existingCols.map(c => [c.columnName, c]));

        const colDefs = newColumns.map((col, i) => {
          const existing = existingMap.get(col);
          if (existing) {
            // Preserve existing configuration
            return {
              columnName: col,
              label: existing.label,
              columnType: existing.columnType,
              aggregation: existing.aggregation,
              format: existing.format || "number",
              dateFormat: existing.dateFormat || null,
              dateGrains: existing.dateGrains || [],
              isFormula: existing.isFormula || false,
              formulaExpression: existing.formulaExpression || null,
              position: i,
            };
          }
          // New column — auto-detect
          const vals = rows.map(r => r[col]);
          const type = autoDetectColumnType(vals, col);
          return { columnName: col, label: col, columnType: type, aggregation: type === "measure" ? "sum" : null, format: "number", position: i, isFormula: false };
        });

        const savedCols = await storage.upsertAnalyticsDatasetColumns(datasetId, colDefs);
        const updated = await storage.getAnalyticsDataset(datasetId);
        res.json({ ...updated, columns: savedCols, rowCount: rows.length });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Replace failed" });
      }
    });

    app.delete("/api/v2/analytics/datasets/:id", requireAuth, async (req: Request, res: Response) => {
      await storage.deleteAnalyticsDataset(Number(req.params.id));
      res.json({ ok: true });
    });

    // Save column configuration
    app.post("/api/v2/analytics/datasets/:id/columns", requireAuth, async (req: Request, res: Response) => {
      const { columns } = req.body as { columns: Parameters<typeof storage.upsertAnalyticsDatasetColumns>[1] };
      const cols = await storage.upsertAnalyticsDatasetColumns(Number(req.params.id), columns);
      res.json(cols);
    });

    // ── Ask question → generate Insight ──────────────────────────────

    app.post("/api/v2/analytics/datasets/:id/ask", requireAuth, async (req: Request, res: Response) => {
      try {
        const company = await getCompanyForUser(req);
        const ds = await storage.getAnalyticsDataset(Number(req.params.id));
        if (!ds || !company) return res.status(404).json({ message: "Not found" });

        const columns = await storage.getAnalyticsDatasetColumns(ds.id);
        const rawRows = (ds.rawData as Record<string, unknown>[]) || [];
        // Augment rows with computed formula column values
        const rows = applyFormulaColumns(rawRows, columns);
        const { question, chartTypeOverride, previousQuestion, previousResult } = req.body as {
          question: string;
          chartTypeOverride?: string;
          previousQuestion?: string;
          previousResult?: { title: string; chartType: string; measure?: string; dimension?: string; aggregation?: string };
        };

        const activeColumns = columns.filter(c => c.columnType !== "ignore");
        const measures = columns.filter(c => c.columnType === "measure");
        const dates = columns.filter(c => c.columnType === "date");

        const colSummary = activeColumns.map(c =>
          `${c.label} [columnName: ${c.columnName}, type: ${c.columnType}${c.columnType === "measure" ? ", agg: " + (c.aggregation || "sum") : ""}]`
        ).join("\n  ");

        const sampleRows = rows.slice(0, 8).map(r => {
          const s: Record<string, unknown> = {};
          activeColumns.forEach(c => { s[c.label] = r[c.columnName]; });
          return s;
        });

        const dataStats = computeDataStats(rows, activeColumns);

        const isFollowUp = !!previousQuestion && !!previousResult;
        const followUpContext = isFollowUp ? `
FOLLOW-UP CONTEXT (user is refining the previous result):
  Previous question: "${previousQuestion}"
  Previous chart: ${previousResult!.chartType} of ${previousResult!.measure || "?"} by ${previousResult!.dimension || "none"}
  Previous aggregation: ${previousResult!.aggregation || "sum"}
  Interpret the new question as a refinement of this — preserve the measure/dimension if not changed.
` : "";

        const oai = await getOaiV2();
        const prompt = `You are an expert analytics engine for a business intelligence platform used by hotel and hospitality companies.

Dataset: "${ds.name}" (${rows.length} rows)

Columns:
  ${colSummary}

Sample data (first 8 rows):
${JSON.stringify(sampleRows, null, 2)}

Data statistics:
${JSON.stringify(dataStats, null, 2)}
${followUpContext}
Current question: "${question}"

CHART TYPE SELECTION RULES (choose the BEST fit):
- "kpi": single headline number — total, average, count, rate (no dimension needed)
- "line": time series/trend when dimension is a date — use when question has "trend", "over time", "by month", "monthly", "weekly", "quarterly"
- "bar": comparing categories — use when comparing named groups (regions, departments, products)
- "pie": share/distribution of whole — use when question has "share", "breakdown", "distribution", "composition", "percentage of" AND unique categories ≤ 8
- "table": ranked list — use when question has "top N", "bottom N", "list", "rank", or needs multiple columns
- For follow-up "show only top N" → change to table; "compare" → keep bar; "as donut" → keep pie

Return a JSON object (no markdown, no code fences):
{
  "title": "Concise chart title (max 6 words)",
  "subtitle": "Optional context line (e.g. 'Jan 2024 – Mar 2025')",
  "interpretation": "Plain English: what I understood you're asking for",
  "chartType": "kpi|line|bar|pie|table",
  "measure": "exact columnName from the list above",
  "dimension": "exact columnName or null for KPI",
  "aggregation": "sum|avg|count|min|max",
  "topN": null or a number (for top/bottom N requests),
  "sortOrder": "desc|asc|chronological",
  "narrative": "3-4 sentences. State the key finding first with specific numbers. Then describe trend or distribution. Then flag anomaly or notable insight if present. Use concrete values from the data stats.",
  "trendDirection": "up|down|flat|null (for time series, based on data stats)",
  "anomalyDetected": true|false,
  "anomalyNote": "One sentence if anomaly detected, else null",
  "topValue": {"name": "...", "value": 0} or null,
  "bottomValue": {"name": "...", "value": 0} or null,
  "suggestedQuestions": [
    "Specific follow-up #1 that builds on this result",
    "Specific follow-up #2 that drills deeper",
    "Specific follow-up #3 that compares or contrasts",
    "Specific follow-up #4 that adds a filter or different view"
  ]
}

IMPORTANT: 
- Use exact columnName values (not labels) for measure and dimension fields.
- If the question is ambiguous, pick the most likely interpretation.
- The narrative MUST contain at least 2 specific numbers from the data.
- suggestedQuestions must be natural language questions a business user would actually ask.`;

        const completion = await oai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 1200,
        });

        let aiResult: {
          title: string; subtitle?: string; interpretation: string; chartType: string;
          measure: string; dimension: string | null; aggregation: string;
          topN: number | null; sortOrder?: string; narrative: string;
          trendDirection?: string | null; anomalyDetected?: boolean; anomalyNote?: string | null;
          topValue?: { name: string; value: number } | null;
          bottomValue?: { name: string; value: number } | null;
          suggestedQuestions: string[];
        };
        try {
          aiResult = JSON.parse(completion.choices[0].message.content || "{}");
        } catch {
          return res.status(500).json({ message: "AI parsing error" });
        }

        const finalChartType = chartTypeOverride || aiResult.chartType || "bar";
        const agg = aiResult.aggregation || "sum";
        const measureCol = columns.find(c => c.columnName === aiResult.measure || c.label === aiResult.measure);
        const dimCol = aiResult.dimension ? columns.find(c => c.columnName === aiResult.dimension || c.label === aiResult.dimension) : null;

        // Determine if dimension is date-like for chronological sorting
        const isDimDate = dimCol?.columnType === "date" || (dimCol && dates.some(d => d.columnName === dimCol.columnName));
        const shouldSortChron = isDimDate || finalChartType === "line" || aiResult.sortOrder === "chronological";

        // Compute chart data server-side
        let chartData: unknown;
        if (finalChartType === "kpi") {
          const vals = rows.map(r => Number(measureCol ? r[measureCol.columnName] : 0)).filter(v => !isNaN(v));
          const value = agg === "avg" ? vals.reduce((a, b) => a + b, 0) / (vals.length || 1)
            : agg === "count" ? vals.length
            : agg === "min" ? Math.min(...vals)
            : agg === "max" ? Math.max(...vals)
            : vals.reduce((a, b) => a + b, 0);
          chartData = { value: Math.round(value * 100) / 100, label: measureCol?.label || aiResult.measure, count: vals.length };
        } else if (finalChartType === "table") {
          if (measureCol && dimCol) {
            const aggRows = aggregateData(rows, measureCol.columnName, dimCol.columnName, agg, aiResult.topN || 25, false);
            if (aiResult.sortOrder === "asc") aggRows.sort((a, b) => a.value - b.value);
            chartData = { rows: aggRows.map(r => ({ [dimCol.label]: r.name, [measureCol.label]: r.value })), columns: [dimCol.label, measureCol.label] };
          } else {
            const displayCols = activeColumns.slice(0, 7);
            const tableRows = rows.slice(0, aiResult.topN || 25).map(r => {
              const row: Record<string, unknown> = {};
              displayCols.forEach(c => { row[c.label] = r[c.columnName]; });
              return row;
            });
            chartData = { rows: tableRows, columns: displayCols.map(c => c.label) };
          }
        } else {
          // line/bar/pie
          const aggData = measureCol
            ? aggregateData(rows, measureCol.columnName, dimCol?.columnName || null, agg, aiResult.topN || undefined, shouldSortChron)
            : [];
          // For pie, limit to 10 slices
          const finalData = (finalChartType === "pie") ? aggData.slice(0, 10) : aggData;
          chartData = { data: finalData, xKey: "name", yKey: "value", measureLabel: measureCol?.label, dimensionLabel: dimCol?.label };
        }

        // Compute top/bottom values from the data if AI didn't provide them
        let topValue = aiResult.topValue || null;
        let bottomValue = aiResult.bottomValue || null;
        if (!topValue && measureCol && dimCol) {
          const aggRows = aggregateData(rows, measureCol.columnName, dimCol.columnName, agg, undefined, false);
          if (aggRows.length > 0) {
            topValue = { name: aggRows[0].name, value: aggRows[0].value };
            bottomValue = aggRows.length > 1 ? { name: aggRows[aggRows.length - 1].name, value: aggRows[aggRows.length - 1].value } : null;
          }
        }

        const chartConfig = {
          chartType: finalChartType,
          data: chartData,
          measure: aiResult.measure,
          measureLabel: measureCol?.label,
          dimension: aiResult.dimension,
          dimensionLabel: dimCol?.label,
          aggregation: agg,
        };

        res.json({
          title: aiResult.title,
          subtitle: aiResult.subtitle || null,
          interpretation: aiResult.interpretation,
          chartType: finalChartType,
          chartConfig,
          narrative: aiResult.narrative,
          trendDirection: aiResult.trendDirection || null,
          anomalyDetected: aiResult.anomalyDetected || false,
          anomalyNote: aiResult.anomalyNote || null,
          topValue,
          bottomValue,
          isFollowUp,
          previousQuestion: isFollowUp ? previousQuestion : null,
          suggestedQuestions: aiResult.suggestedQuestions || [],
          question,
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Analysis failed" });
      }
    });

    // Save insight
    app.post("/api/v2/analytics/insights", requireAuth, async (req: Request, res: Response) => {
      const user = req.user as Express.User;
      const company = await getCompanyForUser(req);
      if (!company) return res.status(400).json({ message: "No company" });
      const insight = await storage.createAnalyticsInsight({ ...req.body, companyId: company.id, createdBy: user.id });
      res.json(insight);
    });

    app.get("/api/v2/analytics/insights", requireAuth, async (req: Request, res: Response) => {
      const user = req.user as Express.User;
      const company = await getCompanyForUser(req);
      if (!company) return res.status(400).json({ message: "No company" });
      const insights = await storage.getAnalyticsInsights(company.id);
      res.json(insights);
    });

    app.get("/api/v2/analytics/insights/:id", requireAuth, async (req: Request, res: Response) => {
      const insight = await storage.getAnalyticsInsight(Number(req.params.id));
      if (!insight) return res.status(404).json({ message: "Not found" });
      res.json(insight);
    });

    app.patch("/api/v2/analytics/insights/:id", requireAuth, async (req: Request, res: Response) => {
      const updated = await storage.updateAnalyticsInsight(Number(req.params.id), req.body);
      res.json(updated);
    });

    app.delete("/api/v2/analytics/insights/:id", requireAuth, async (req: Request, res: Response) => {
      await storage.deleteAnalyticsInsight(Number(req.params.id));
      res.json({ ok: true });
    });

    // Generate auto-insights
    app.post("/api/v2/analytics/datasets/:id/auto-insights", requireAuth, async (req: Request, res: Response) => {
      try {
        const user = req.user as Express.User;
        const company = await getCompanyForUser(req);
        const ds = await storage.getAnalyticsDataset(Number(req.params.id));
        if (!ds || !company) return res.status(404).json({ message: "Not found" });

        const columns = await storage.getAnalyticsDatasetColumns(ds.id);
        const rawRows = (ds.rawData as Record<string, unknown>[]) || [];
        const rows = applyFormulaColumns(rawRows, columns);
        const measures = columns.filter(c => c.columnType === "measure");
        const dimensions = columns.filter(c => c.columnType === "dimension");

        const oai = await getOaiV2();
        const colSummary = columns.filter(c => c.columnType !== "ignore").map(c =>
          `${c.label} (${c.columnType})`
        ).join(", ");

        const dataStats = computeDataStats(rows, columns.filter(c => c.columnType !== "ignore"));
        const prompt = `You are an expert analytics engine for a hospitality/hotel business intelligence platform.

Dataset: "${ds.name}" (${rows.length} rows)
Columns: ${colSummary}
Data statistics: ${JSON.stringify(dataStats)}
Sample data (first 10 rows): ${JSON.stringify(rows.slice(0, 10))}

Generate 6 diverse, actionable business insights that a hotel executive or operations manager would find immediately valuable.
Cover: total KPIs, time trends, category comparisons, top/bottom performers, anomalies, distributions.

Return a JSON object with key "insights" containing an array:
{
  "insights": [
    {
      "insightType": "summary|trend|top_performer|bottom_performer|comparison|anomaly|distribution",
      "title": "Short insight title (max 5 words)",
      "description": "2-3 sentences. Include specific numbers. Explain business implication.",
      "chartType": "kpi|bar|line|pie|table",
      "suggestedQuestion": "Natural language question a user would type to get this insight",
      "priority": 1-6
    }
  ]
}`;

        const completion = await oai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 1200,
        });

        let suggestions: { insightType: string; title: string; description: string; chartType: string; suggestedQuestion: string; priority: number }[] = [];
        try {
          const parsed = JSON.parse(completion.choices[0].message.content || "{}");
          suggestions = Array.isArray(parsed) ? parsed : (parsed.insights || parsed.results || []);
        } catch { suggestions = []; }

        await storage.deleteAnalyticsAutoInsights(ds.id);
        const saved = [];
        for (const s of suggestions.slice(0, 6)) {
          const row = await storage.createAnalyticsAutoInsight({
            datasetId: ds.id, companyId: company.id,
            insightType: s.insightType || "summary", title: s.title,
            description: s.description, chartType: s.chartType || "bar",
            chartConfig: { suggestedQuestion: s.suggestedQuestion } as unknown as null,
            priority: s.priority || 0,
          });
          saved.push(row);
        }
        res.json(saved);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Auto-insight generation failed" });
      }
    });

    // ── Dashboard Definitions ─────────────────────────────────────────

    app.get("/api/v2/analytics/definitions", requireAuth, async (req: Request, res: Response) => {
      const user = req.user as Express.User;
      const company = await getCompanyForUser(req);
      if (!company) return res.status(400).json({ message: "No company" });
      const defs = await storage.getAnalyticsDashboardDefinitions(company.id);
      res.json(defs);
    });

    app.post("/api/v2/analytics/definitions", requireAuth, async (req: Request, res: Response) => {
      const user = req.user as Express.User;
      const company = await getCompanyForUser(req);
      if (!company) return res.status(400).json({ message: "No company" });
      const def = await storage.createAnalyticsDashboardDefinition({ ...req.body, companyId: company.id, createdBy: user.id });
      res.json(def);
    });

    app.get("/api/v2/analytics/definitions/:id", requireAuth, async (req: Request, res: Response) => {
      const def = await storage.getAnalyticsDashboardDefinition(Number(req.params.id));
      if (!def) return res.status(404).json({ message: "Not found" });
      const items = await storage.getAnalyticsDashboardItems(def.id);
      res.json({ ...def, items });
    });

    app.patch("/api/v2/analytics/definitions/:id", requireAuth, async (req: Request, res: Response) => {
      const updated = await storage.updateAnalyticsDashboardDefinition(Number(req.params.id), req.body);
      res.json(updated);
    });

    app.delete("/api/v2/analytics/definitions/:id", requireAuth, async (req: Request, res: Response) => {
      await storage.deleteAnalyticsDashboardDefinition(Number(req.params.id));
      res.json({ ok: true });
    });

    app.post("/api/v2/analytics/definitions/:id/items", requireAuth, async (req: Request, res: Response) => {
      const { insightId, position, titleOverride } = req.body;
      const item = await storage.addAnalyticsDashboardItem({ dashboardId: Number(req.params.id), insightId, position: position ?? 0, titleOverride: titleOverride ?? null });
      res.json(item);
    });

    app.delete("/api/v2/analytics/definitions/:id/items/:itemId", requireAuth, async (req: Request, res: Response) => {
      await storage.removeAnalyticsDashboardItem(Number(req.params.itemId));
      res.json({ ok: true });
    });

    app.post("/api/v2/analytics/definitions/:id/reorder", requireAuth, async (req: Request, res: Response) => {
      await storage.reorderAnalyticsDashboardItems(Number(req.params.id), req.body.orderedIds);
      res.json({ ok: true });
    });

    app.post("/api/v2/analytics/definitions/:id/publish", requireAuth, async (req: Request, res: Response) => {
      const { visibility } = req.body;
      const updated = await storage.updateAnalyticsDashboardDefinition(Number(req.params.id), {
        status: "published", visibility: visibility || "company",
      });
      res.json(updated);
    });

    // POST refresh all insights in a dashboard from their latest dataset data
    app.post("/api/v2/analytics/definitions/:id/refresh", requireAuth, async (req: Request, res: Response) => {
      try {
        const def = await storage.getAnalyticsDashboardDefinition(Number(req.params.id));
        if (!def) return res.status(404).json({ message: "Not found" });
        const items = await storage.getAnalyticsDashboardItems(def.id);
        let refreshed = 0;
        for (const item of items) {
          const insight = item.insight;
          if (!insight?.chartConfig) continue;
          const cfg = insight.chartConfig as { measure?: string; dimension?: string | null; aggregation?: string; chartType?: string; measureLabel?: string; dimensionLabel?: string };
          if (!cfg.measure) continue;
          const ds = await storage.getAnalyticsDataset(insight.datasetId);
          if (!ds) continue;
          const dsColumns = await storage.getAnalyticsDatasetColumns(insight.datasetId);
          const rows = applyFormulaColumns((ds.rawData as Record<string, unknown>[]) || [], dsColumns);
          if (!rows.length) continue;
          const agg = cfg.aggregation || "sum";
          const measure = cfg.measure;
          const dimension = cfg.dimension || null;
          const chartType = insight.chartType;
          let chartData: unknown;
          if (chartType === "kpi") {
            const vals = rows.map(r => Number(r[measure])).filter(v => !isNaN(v));
            const value = agg === "avg" ? vals.reduce((a, b) => a + b, 0) / (vals.length || 1) : agg === "count" ? vals.length : agg === "min" ? Math.min(...vals) : agg === "max" ? Math.max(...vals) : vals.reduce((a, b) => a + b, 0);
            chartData = { value: Math.round(value * 100) / 100, label: cfg.measureLabel || measure, count: vals.length };
          } else {
            const isDimDate = dimension && /month|date|year|period|quarter|week/i.test(dimension);
            const aggData = aggregateData(rows, measure, dimension, agg, undefined, !!isDimDate);
            chartData = { data: aggData, xKey: "name", yKey: "value", measureLabel: cfg.measureLabel, dimensionLabel: cfg.dimensionLabel };
          }
          const newConfig = { ...cfg, data: chartData };
          await storage.updateAnalyticsInsight(insight.id, { chartConfig: newConfig });
          refreshed++;
        }
        res.json({ ok: true, refreshed });
      } catch (err: any) {
        console.error(err);
        res.status(500).json({ message: err.message || "Refresh failed" });
      }
    });

    // Generate dashboard narrative
    app.post("/api/v2/analytics/definitions/:id/narrative", requireAuth, async (req: Request, res: Response) => {
      try {
        const def = await storage.getAnalyticsDashboardDefinition(Number(req.params.id));
        if (!def) return res.status(404).json({ message: "Not found" });
        const items = await storage.getAnalyticsDashboardItems(def.id);
        const insightSummaries = items.map(i => `- ${i.titleOverride || i.insight.title}: ${i.insight.narrative || i.insight.interpretation || ""}`).join("\n");

        const oai = await getOaiV2();
        const prompt = `Write an executive-level AI narrative for this dashboard: "${def.title}"

Pinned insights:
${insightSummaries || "No insights yet."}

Return a JSON object:
{
  "summary": "2-3 sentence executive summary",
  "highlights": "Top 3 positive findings",
  "risks": "Top 2 risks or concerns",
  "recommendation": "1-2 key recommended actions"
}`;

        const completion = await oai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 600,
        });

        const result = JSON.parse(completion.choices[0].message.content || "{}");
        const narrative = `${result.summary || ""}\n\nHighlights: ${result.highlights || ""}\n\nRisks: ${result.risks || ""}\n\nRecommendations: ${result.recommendation || ""}`;
        const updated = await storage.updateAnalyticsDashboardDefinition(def.id, { narrativeSummary: narrative });
        res.json(updated);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Narrative generation failed" });
      }
    });
  }

  // ─── Workflow Center ───────────────────────────────────────────────────────

  function generateRefNumber(type: string): string {
    const prefix: Record<string, string> = {
      recurring_task: "RT",
      service_ticket: "TKT",
      license: "LIC",
      certificate: "CERT",
      custom: "WF",
    };
    const p = prefix[type] || "WF";
    return `${p}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  }

  // Templates
  app.get("/api/workflow/templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const templates = await storage.getWorkflowTemplates(user.companyId);
      res.json(templates);
    } catch { res.status(500).json({ message: "Failed to get templates" }); }
  });

  app.post("/api/workflow/templates", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const t = await storage.createWorkflowTemplate({ ...req.body, companyId: user.companyId, createdBy: user.id });
      res.json(t);
    } catch { res.status(500).json({ message: "Failed to create template" }); }
  });

  app.patch("/api/workflow/templates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const t = await storage.updateWorkflowTemplate(Number(req.params.id), req.body);
      res.json(t);
    } catch { res.status(500).json({ message: "Failed to update template" }); }
  });

  app.delete("/api/workflow/templates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteWorkflowTemplate(Number(req.params.id));
      res.json({ message: "Deleted" });
    } catch { res.status(500).json({ message: "Failed to delete template" }); }
  });

  // Submissions — list
  app.get("/api/workflow/submissions", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { workflowType, status, mine } = req.query as Record<string, string>;
      const filters: { workflowType?: string; status?: string; createdBy?: number } = {};
      if (workflowType) filters.workflowType = workflowType;
      if (status) filters.status = status;
      if (mine === "true") filters.createdBy = user.id;
      const submissions = await storage.getWorkflowSubmissions(user.companyId, filters);
      res.json(submissions);
    } catch { res.status(500).json({ message: "Failed to get submissions" }); }
  });

  // Submissions — create
  app.post("/api/workflow/submissions", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const referenceNumber = generateRefNumber(req.body.workflowType || "custom");
      const submission = await storage.createWorkflowSubmission({
        ...req.body,
        companyId: user.companyId,
        createdBy: user.id,
        referenceNumber,
        requesterName: req.body.requesterName || user.name,
      });
      await storage.createWorkflowActivity({
        submissionId: submission.id,
        companyId: user.companyId,
        userId: user.id,
        actorName: user.name,
        action: "created",
        newValue: submission.status,
        field: "status",
      });
      res.json(submission);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to create submission" });
    }
  });

  // Submissions — single
  app.get("/api/workflow/submissions/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const submission = await storage.getWorkflowSubmission(Number(req.params.id));
      if (!submission) return res.status(404).json({ message: "Not found" });
      const [comments, activity] = await Promise.all([
        storage.getWorkflowComments(submission.id),
        storage.getWorkflowActivity(submission.id),
      ]);
      res.json({ ...submission, comments, activity });
    } catch { res.status(500).json({ message: "Failed to get submission" }); }
  });

  // Submissions — update
  app.patch("/api/workflow/submissions/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const id = Number(req.params.id);
      const old = await storage.getWorkflowSubmission(id);
      const updated = await storage.updateWorkflowSubmission(id, req.body);
      if (old && req.body.status && old.status !== req.body.status) {
        await storage.createWorkflowActivity({
          submissionId: id, companyId: user.companyId, userId: user.id,
          actorName: user.name, action: "status_changed", field: "status",
          oldValue: old.status, newValue: req.body.status,
        });
      }
      res.json(updated);
    } catch { res.status(500).json({ message: "Failed to update submission" }); }
  });

  // Submissions — delete
  app.delete("/api/workflow/submissions/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteWorkflowSubmission(Number(req.params.id));
      res.json({ message: "Deleted" });
    } catch { res.status(500).json({ message: "Failed to delete" }); }
  });

  // Comments
  app.post("/api/workflow/submissions/:id/comments", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const submissionId = Number(req.params.id);
      const submission = await storage.getWorkflowSubmission(submissionId);
      if (!submission) return res.status(404).json({ message: "Submission not found" });
      const comment = await storage.createWorkflowComment({
        submissionId, companyId: user.companyId, userId: user.id,
        authorName: user.name, content: req.body.content,
        isInternal: req.body.isInternal ?? false,
      });
      await storage.createWorkflowActivity({
        submissionId, companyId: user.companyId, userId: user.id,
        actorName: user.name, action: "commented",
      });
      res.json(comment);
    } catch { res.status(500).json({ message: "Failed to add comment" }); }
  });

  // Analytics summary
  app.get("/api/workflow/analytics", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const all = await storage.getWorkflowSubmissions(user.companyId);
      const today = new Date().toISOString().slice(0, 10);
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

      const byType: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const byPriority: Record<string, number> = {};
      let overdue = 0, expiringSoon = 0, open = 0;

      for (const s of all) {
        byType[s.workflowType] = (byType[s.workflowType] || 0) + 1;
        byStatus[s.status] = (byStatus[s.status] || 0) + 1;
        byPriority[s.priority || "Medium"] = (byPriority[s.priority || "Medium"] || 0) + 1;
        if (s.dueDate && s.dueDate < today && !["Completed", "Resolved", "Closed", "Renewed"].includes(s.status)) overdue++;
        if (s.expiryDate && s.expiryDate >= today && s.expiryDate <= in30) expiringSoon++;
        if (!["Completed", "Resolved", "Closed", "Renewed", "Expired"].includes(s.status)) open++;
      }

      res.json({ total: all.length, open, overdue, expiringSoon, byType, byStatus, byPriority });
    } catch { res.status(500).json({ message: "Failed to get analytics" }); }
  });

  // ── Workflow Automations: Run email notifications ─────────────────────────
  app.post("/api/workflow/automations/run", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { workflowType, rules } = req.body as {
        workflowType?: string;
        rules: { id: string; trigger: string; action: string; enabled: boolean }[];
      };

      const all = await storage.getWorkflowSubmissions(user.companyId, workflowType ? { workflowType } : {});
      const company = await storage.getCompany(user.companyId);
      const companyName = company?.companyName || "Your Company";

      const today = new Date().toISOString().slice(0, 10);
      const TERMINAL = ["Completed", "Resolved", "Closed", "Renewed", "Expired"];
      const WF_LABELS: Record<string, string> = {
        recurring_task: "Recurring Task",
        service_ticket: "Service Ticket",
        license: "License",
        certificate: "Certificate",
      };

      let sent = 0;
      const errors: string[] = [];
      const sentRecordIds = new Set<string>(); // avoid duplicate emails per record per run

      const enabledRules = (rules || []).filter(r => r.enabled);

      for (const record of all) {
        const label = WF_LABELS[record.workflowType] || record.workflowType;
        const daysUntilDue = record.dueDate
          ? Math.ceil((new Date(record.dueDate).getTime() - Date.now()) / 86400000)
          : null;
        const daysUntilExpiry = record.expiryDate
          ? Math.ceil((new Date(record.expiryDate).getTime() - Date.now()) / 86400000)
          : null;
        const isOverdue = record.dueDate && record.dueDate < today && !TERMINAL.includes(record.status);
        const isExpired = record.expiryDate && record.expiryDate < today && !TERMINAL.includes(record.status);

        for (const rule of enabledRules) {
          const tl = rule.trigger.toLowerCase();
          let shouldSend = false;
          let emailSubject = "";

          if ((tl.includes("overdue") || tl.includes("passed") || tl.includes("due date passed")) && isOverdue) {
            shouldSend = true;
            emailSubject = `⚠ Overdue: ${record.title}`;
          } else if ((tl.includes("expired") || tl.includes("expiry") && (tl.includes("expired") || isExpired)) && isExpired) {
            shouldSend = true;
            emailSubject = `🔴 Expired: ${record.title}`;
          } else if (tl.includes("7 day") && daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 7) {
            shouldSend = true;
            emailSubject = `🚨 Critical — Expiring in ${daysUntilExpiry} days: ${record.title}`;
          } else if (tl.includes("30 day") && daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30) {
            shouldSend = true;
            emailSubject = `⏳ Expiring Soon (${daysUntilExpiry}d): ${record.title}`;
          } else if (tl.includes("60 day") && daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 60) {
            shouldSend = true;
            emailSubject = `📅 Renewal Reminder (${daysUntilExpiry}d): ${record.title}`;
          } else if ((tl.includes("due soon") || tl.includes("within 3 day") || tl.includes("3 days")) && daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 3) {
            shouldSend = true;
            emailSubject = `⏰ Due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}: ${record.title}`;
          } else if ((tl.includes("created") || tl.includes("new")) && record.status && ["New", "Scheduled"].includes(record.status)) {
            shouldSend = true;
            emailSubject = `📋 New Assignment: ${record.title}`;
          } else if (tl.includes("sla") || tl.includes("breach")) {
            const slaTarget = record.slaTarget || record.issueAuthority || "";
            if (isOverdue) {
              shouldSend = true;
              emailSubject = `🚨 SLA Breach: ${record.title}`;
            }
          }

          if (!shouldSend) continue;

          const ruleKey = `${record.id}-${rule.id}`;
          if (sentRecordIds.has(ruleKey)) continue;
          sentRecordIds.add(ruleKey);

          const recipients = [record.assignedToEmail, record.ownerEmail].filter((e): e is string => !!e && e.includes("@"));
          if (!recipients.length) continue;

          try {
            await sendWorkflowAutomationEmail({
              to: recipients,
              recipientName: record.assignedTo || record.ownerName || "Team",
              subject: emailSubject,
              triggerLabel: rule.trigger,
              actionLabel: rule.action,
              recordTitle: record.title,
              referenceNumber: record.referenceNumber || "",
              workflowTypeLabel: label,
              status: record.status,
              priority: record.priority || "Medium",
              dueDate: record.dueDate || undefined,
              expiryDate: record.expiryDate || undefined,
              assignedTo: record.assignedTo || undefined,
              ownerName: record.ownerName || undefined,
              companyName,
            });
            sent++;
          } catch (err: any) {
            errors.push(`${record.referenceNumber}: ${err.message}`);
          }
        }
      }

      res.json({ sent, skipped: all.length - sent, errors, total: all.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to run automations" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESENTATION STUDIO
  // ═══════════════════════════════════════════════════════════════════════════

  app.get("/api/presentations", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) return res.status(404).json({ message: "Company not found" });
      const list = await storage.listPresentations(company.id, user.id);
      res.json(list);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/presentations", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) return res.status(404).json({ message: "Company not found" });
      const pres = await storage.createPresentation({
        companyId: company.id,
        createdBy: user.id,
        title: req.body.title || "Untitled Presentation",
        status: "draft",
        sourceTypes: req.body.sourceTypes || [],
        brief: req.body.brief || {},
        outline: req.body.outline || [],
        slides: req.body.slides || [],
        theme: req.body.theme || "executive-dark",
        version: 1,
      });
      res.json(pres);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/presentations/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const pres = await storage.getPresentation(Number(req.params.id));
      if (!pres) return res.status(404).json({ message: "Not found" });
      res.json(pres);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/presentations/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const id = Number(req.params.id);
      const existing = await storage.getPresentation(id);
      if (!existing) return res.status(404).json({ message: "Not found" });
      // Save version snapshot on meaningful save
      if (req.body.slides && req.body.saveVersion) {
        await storage.createPresentationVersion({
          presentationId: id,
          versionNumber: (existing.version || 1),
          outline: existing.outline as any,
          slides: existing.slides as any,
          createdBy: user.id,
        });
      }
      const updated = await storage.updatePresentation(id, {
        title: req.body.title,
        status: req.body.status,
        sourceTypes: req.body.sourceTypes,
        brief: req.body.brief,
        outline: req.body.outline,
        slides: req.body.slides,
        theme: req.body.theme,
        version: req.body.saveVersion ? (existing.version || 1) + 1 : existing.version,
      });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/presentations/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deletePresentation(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/presentations/:id/versions", requireAuth, async (req: Request, res: Response) => {
    try {
      const versions = await storage.listPresentationVersions(Number(req.params.id));
      res.json(versions);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── File Upload for Presentation Source ────────────────────────────────────
  app.post("/api/presentations/upload-source", requireAuth, uploadMemory.single("file"), async (req: Request, res: Response) => {
    try {
      const file = (req as any).file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });
      const mime = file.mimetype || "";
      const name = (file.originalname || "").toLowerCase();

      // Helper: format numbers without unnecessary decimals
      const fmtNum = (n: number): string => {
        if (!isFinite(n)) return "0";
        return Number(parseFloat(n.toFixed(2))).toLocaleString();
      };

      // Build a rich sheet summary: column stats + sample rows
      const buildSheetSummary = (sheetName: string, rows: Record<string, unknown>[]): string => {
        if (!rows.length) return `SHEET: "${sheetName}" (empty)`;
        const cols = Object.keys(rows[0]);
        const lines: string[] = [`SHEET: "${sheetName}" — ${rows.length} rows, ${cols.length} columns`];
        lines.push("COLUMN ANALYSIS:");
        for (const col of cols) {
          const vals = rows.map(r => r[col]).filter(v => v !== null && v !== "" && v !== undefined);
          const nums = vals.map(v => parseFloat(String(v).replace(/,/g, ""))).filter(v => !isNaN(v));
          if (nums.length > 0 && nums.length >= vals.length * 0.6) {
            const sum = nums.reduce((a, b) => a + b, 0);
            const avg = sum / nums.length;
            const mn = Math.min(...nums);
            const mx = Math.max(...nums);
            lines.push(`  • "${col}" [numeric, ${nums.length} values]: total=${fmtNum(sum)}, average=${fmtNum(avg)}, min=${fmtNum(mn)}, max=${fmtNum(mx)}`);
          } else {
            const unique = [...new Set(vals.map(v => String(v)))];
            const preview = unique.slice(0, 10).join(", ") + (unique.length > 10 ? ` ... (${unique.length} unique)` : "");
            lines.push(`  • "${col}" [text, ${unique.length} unique values]: ${preview}`);
          }
        }
        lines.push(`\nSAMPLE ROWS (first 50):\n${JSON.stringify(rows.slice(0, 50))}`);
        return lines.join("\n");
      };

      let text = "";

      /** Normalise Date objects in parsed rows to YYYY-MM-DD strings. */
      function normalizeDates(rows: Record<string, unknown>[]): Record<string, unknown>[] {
        return rows.map(row => {
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(row)) {
            if (v instanceof Date && !isNaN(v.getTime())) {
              const y = v.getFullYear(), mo = String(v.getMonth() + 1).padStart(2, "0"), d = String(v.getDate()).padStart(2, "0");
              out[k] = `${y}-${mo}-${d}`;
            } else {
              out[k] = v;
            }
          }
          return out;
        });
      }

      if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const wb = XLSX.read(file.buffer, { type: "buffer", cellDates: true });
        const parts: string[] = [`FILE: ${file.originalname}`];
        wb.SheetNames.slice(0, 5).forEach(sn => {
          const ws = wb.Sheets[sn];
          const rawRows = XLSX.utils.sheet_to_json(ws, { defval: null, cellDates: true }) as Record<string, unknown>[];
          parts.push(buildSheetSummary(sn, normalizeDates(rawRows)));
        });
        text = parts.join("\n\n").slice(0, 18000);
      } else if (name.endsWith(".csv") || mime.includes("csv")) {
        const raw = file.buffer.toString("utf-8");
        // Parse CSV into rows using XLSX
        const wb = XLSX.read(raw, { type: "string" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: null }) as Record<string, unknown>[];
        text = [`FILE: ${file.originalname}`, buildSheetSummary(wb.SheetNames[0], rows)].join("\n\n").slice(0, 18000);
      } else if (mime.includes("text") || name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".json")) {
        text = `FILE: ${file.originalname}\n\n${file.buffer.toString("utf-8").slice(0, 15000)}`;
      } else {
        return res.status(400).json({ message: "Unsupported file type. Upload .txt, .md, .csv, .json, or .xlsx files." });
      }

      res.json({ text, fileName: file.originalname, chars: text.length });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── AI: Generate Clarifying Questions ───────────────────────────────────────
  app.post("/api/presentations/generate-questions", requireAuth, async (req: Request, res: Response) => {
    try {
      const { getOaiV2 } = await import("./ai");
      const oai = getOaiV2();
      const { prompt, sources } = req.body;

      const completion = await oai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert presentation consultant. Given a presentation request, ask 2-3 targeted, specific clarifying questions that will help you create a significantly better, more tailored presentation.

Return ONLY valid JSON — an array of 2-3 question objects. No markdown fences.

Each question object must have:
- id: string (e.g. "q1")
- question: string (the specific question, max 20 words)
- placeholder: string (a helpful example answer, max 15 words)
- why: string (one short sentence explaining why this matters for the presentation, max 12 words)

Focus on questions about: specific metrics/data to highlight, key decisions the audience needs to make, controversial or sensitive areas to avoid, desired outcomes or calls-to-action, and specific time periods or comparisons to include. Avoid generic questions.`
          },
          {
            role: "user",
            content: `Presentation request: "${prompt}"
Data sources selected: ${sources?.length ? sources.join(", ") : "none"}

Ask the most impactful 2-3 clarifying questions now:`
          }
        ],
        temperature: 0.6,
        max_tokens: 600,
      });

      const raw = completion.choices[0].message.content || "[]";
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const questions = JSON.parse(cleaned);
      res.json({ questions });
    } catch (err: any) { res.status(500).json({ message: err.message || "Question generation failed" }); }
  });

  // ── AI: Generate Outline (with deep research) ─────────────────────────────
  app.post("/api/presentations/generate-outline", requireAuth, async (req: Request, res: Response) => {
    try {
      const { getOaiV2 } = await import("./ai");
      const oai = getOaiV2();
      const { brief, sourceData, sources, answers } = req.body;
      const targetSlides = Number(brief?.targetSlides) || 10;
      const user = (req as any).user;
      const companyId = user?.companyId;

      // ── Deep research: fetch real Performo data ──────────────────────────
      const researchChunks: string[] = [];
      if (companyId && Array.isArray(sources) && sources.length > 0) {
        try {
          if (sources.includes("kpis")) {
            const kpis = await storage.getKpis(companyId);
            const allActuals: any[] = [];
            for (const k of kpis.slice(0, 10)) {
              const acts = await storage.getKpiActuals(k.id);
              allActuals.push(...acts);
            }
            if (kpis.length) {
              researchChunks.push(`KPI PERFORMANCE DATA:\n${kpis.slice(0, 8).map(k => {
                const latest = allActuals.filter((a: any) => a.kpiId === k.id).sort((a: any, b: any) => b.reviewMonth.localeCompare(a.reviewMonth))[0];
                return `• ${k.kpiName}: target=${k.targetValue}${k.unit}, latest=${latest?.actualValue ?? "N/A"}${k.unit} (${latest?.status ?? "N/A"}) — ${latest?.commentary || ""}`;
              }).join("\n")}`);
            }
          }
          if (sources.includes("projects")) {
            const projects = await storage.getProjects(companyId);
            if (projects.length) {
              researchChunks.push(`ACTIVE PROJECTS:\n${projects.slice(0, 6).map(p =>
                `• ${p.name} — ${p.status}, ${p.progress}% complete, owner: ${p.owner}, due: ${p.dueDate}`
              ).join("\n")}`);
            }
          }
          if (sources.includes("reviews")) {
            const reviews = await storage.getMonthlyReviews(companyId);
            if (reviews.length) {
              const latest = reviews[0];
              researchChunks.push(`LATEST MONTHLY REVIEW (${latest.reviewMonth}):\nSummary: ${latest.overallSummary?.slice(0, 500)}\nStrengths: ${latest.strengths?.slice(0, 300)}\nGaps: ${latest.gaps?.slice(0, 300)}\nRecommendations: ${latest.recommendations?.slice(0, 300)}`);
            }
          }
          if (sources.includes("workflow")) {
            const actions = await storage.getActionItems(companyId);
            if (actions.length) {
              researchChunks.push(`ACTION ITEMS:\n${actions.slice(0, 8).map(a =>
                `• [${a.status}] ${a.title} — owner: ${a.ownerName}, due: ${a.dueDate}`
              ).join("\n")}`);
            }
          }
        } catch (fetchErr) {
          // Non-fatal — continue with whatever data was collected
        }
      }

      const platformData = researchChunks.length > 0
        ? `\n\nPERFORMO PLATFORM DATA (use specific numbers and names from this):\n${researchChunks.join("\n\n")}`
        : "";

      const answersSection = Array.isArray(answers) && answers.length > 0
        ? `\n\nCLARIFYING ANSWERS FROM PRESENTER:\n${answers.map((a: any) => `Q: ${a.question}\nA: ${a.answer}`).join("\n")}`
        : "";

      const fileSection = sourceData?.fileContent
        ? `\n\nSOURCE FILE DATA (base the entire presentation on this):\n${String(sourceData.fileContent).slice(0, 6000)}`
        : "";

      const hasFile = !!sourceData?.fileContent;

      // targetSlides = number of CONTENT slides (title + agenda + closing are always added on top)
      const contentSlides = Math.max(3, targetSlides);
      const totalSlides = contentSlides + 3; // title + agenda + (content × N) + closing

      const systemPrompt = `You are an expert business presentation strategist. Generate a tailored, data-driven slide outline. Return ONLY valid JSON — an array of slide outline objects. No markdown fences.

Each object must have:
- id: string (e.g. "slide-1")
- type: one of ["title", "agenda", "content", "two-column", "data", "quote", "section", "closing"]
- title: string (concise slide title, max 8 words)
- description: string (one specific sentence — mention actual metrics, names, or decisions from the data)

STRICT STRUCTURE RULES (non-negotiable):
1. slide-1: MUST be type "title"
2. slide-2: MUST be type "agenda" — its bullets will list exactly the ${contentSlides} topics that follow
3. slides 3 to ${contentSlides + 2}: MUST be ${contentSlides} content slides (use types: "content", "two-column", "data", "quote", "section" as appropriate)
4. slide-${totalSlides}: MUST be type "closing"
5. Total slides MUST be exactly ${totalSlides} (1 title + 1 agenda + ${contentSlides} content + 1 closing)
6. EVERY agenda item must map to exactly one of the ${contentSlides} content slides that follow — one slide per topic, no exceptions

Content slide type guidance:
- Use "data" slides for numeric KPIs, metrics, totals, or percentages
- Use "two-column" for comparisons, breakdowns by category, or before/after contrasts
- Use "section" to divide major themes within the content slides
- Use "content" for narrative, context, strategy, risks, or recommendations
- Make each slide SPECIFIC to the actual data provided — avoid generic placeholder descriptions

${hasFile ? `SOURCE FILE RULES:
- Derive ALL slide topics directly from the file. Do not invent information not in the file.
- Do NOT include currency symbols ($, £, €, ₹, etc.) in any title or description unless the file data shows them.` : "Make slides SPECIFIC to the actual data provided — use real names, metrics, and decisions."}`;

      const userPrompt = `Presentation brief:
Title: ${brief?.title || "Business Presentation"}
Audience: ${brief?.audience || "Senior leadership"}
Objective: ${brief?.objective || "Inform and align"}
Tone: ${brief?.tone || "Executive"}
Deck Type: ${brief?.deckType || "Strategy"}
Content slides required: ${contentSlides} (plus title, agenda, and closing = ${totalSlides} total)${answersSection}${platformData}${fileSection}

Generate the outline now — exactly ${totalSlides} slides (slide-1=title, slide-2=agenda, slides 3-${contentSlides + 2}=content, slide-${totalSlides}=closing):`;

      const completion = await oai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.6,
        max_tokens: 2500,
      });

      const raw = completion.choices[0].message.content || "[]";
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const outline = JSON.parse(cleaned);
      res.json({ outline });
    } catch (err: any) { res.status(500).json({ message: err.message || "Outline generation failed" }); }
  });

  // ── AI: Generate Slides from Outline ─────────────────────────────────────
  app.post("/api/presentations/:id/generate-slides", requireAuth, async (req: Request, res: Response) => {
    try {
      const { getOaiV2 } = await import("./ai");
      const oai = getOaiV2();
      const { outline, brief, sourceData, sources } = req.body;
      const user = (req as any).user;
      const companyId = user?.companyId;

      // ── Deep research: pull real Performo data ───────────────────────────
      const researchChunks: string[] = [];
      if (companyId && Array.isArray(sources) && sources.length > 0) {
        try {
          if (sources.includes("kpis")) {
            const kpis = await storage.getKpis(companyId);
            const allActuals2: any[] = [];
            for (const k of kpis.slice(0, 10)) {
              const acts = await storage.getKpiActuals(k.id);
              allActuals2.push(...acts);
            }
            if (kpis.length) {
              researchChunks.push(`REAL KPI DATA (use these exact values in data slides):\n${kpis.slice(0, 10).map(k => {
                const latest = allActuals2.filter((a: any) => a.kpiId === k.id).sort((a: any, b: any) => b.reviewMonth.localeCompare(a.reviewMonth))[0];
                const pctOfTarget = latest?.actualValue && k.targetValue
                  ? Math.round((parseFloat(latest.actualValue) / parseFloat(k.targetValue)) * 100) : null;
                return `• ${k.kpiName}: target=${k.targetValue}${k.unit}, actual=${latest?.actualValue ?? "?"}${k.unit}, status=${latest?.status ?? "?"}, %target=${pctOfTarget ?? "?"}%${latest?.commentary ? `, note: ${latest.commentary}` : ""}`;
              }).join("\n")}`);
            }
          }
          if (sources.includes("projects")) {
            const projects = await storage.getProjects(companyId);
            const actions = await storage.getActionItems(companyId);
            if (projects.length) {
              researchChunks.push(`REAL PROJECT DATA:\n${projects.slice(0, 6).map(p =>
                `• ${p.name}: ${p.status}, ${p.progress}% complete, health=${(p as any).health ?? "?"}, owner=${p.owner}, due=${p.dueDate}`
              ).join("\n")}`);
            }
            const overdue = actions.filter(a => a.dueDate && a.dueDate < new Date().toISOString().slice(0, 10) && a.status !== "Completed");
            if (overdue.length) researchChunks.push(`OVERDUE ACTIONS (${overdue.length} total):\n${overdue.slice(0, 5).map(a => `• [OVERDUE] ${a.title} — ${a.ownerName}`).join("\n")}`);
          }
          if (sources.includes("reviews")) {
            const reviews = await storage.getMonthlyReviews(companyId);
            if (reviews.length) {
              const latest = reviews[0];
              researchChunks.push(`LATEST REVIEW (${latest.reviewMonth}):\n${latest.overallSummary?.slice(0, 600)}\n\nKey gaps:\n${latest.gaps?.slice(0, 300)}\n\nRecommendations:\n${latest.recommendations?.slice(0, 300)}`);
            }
          }
          if (sources.includes("workflow")) {
            const actions = await storage.getActionItems(companyId);
            if (actions.length) {
              researchChunks.push(`ACTION ITEMS:\n${actions.slice(0, 8).map(a =>
                `• [${a.status}] ${a.title} — ${a.ownerName}, due ${a.dueDate ?? "TBD"}`
              ).join("\n")}`);
            }
          }
        } catch { /* non-fatal */ }
      }

      const platformContext = researchChunks.length > 0
        ? `\n\nREAL PLATFORM DATA — incorporate these specific numbers and names directly into slide content:\n${researchChunks.join("\n\n")}`
        : "";

      const fileContext = sourceData?.fileContent
        ? `\n\nSOURCE FILE DATA (derive ALL slide content from this — do not invent any metric not in this file):\n${String(sourceData.fileContent).slice(0, 8000)}`
        : "";

      const hasSourceFile = !!sourceData?.fileContent;

      // Pre-build agenda map so AI can reference actual slide titles
      const nonFrameSlides = (outline as any[]).filter((s: any) => !["title","agenda","closing"].includes(s.type));
      const agendaMap = nonFrameSlides.map((s: any, i: number) => `${i + 1}. ${s.title}${s.description ? ` — ${s.description}` : ""}`).join("\n");

      const systemPrompt = `You are a world-class business presentation designer and strategist. Your job is to generate RICH, DETAILED, INFORMATION-DENSE slide content that a senior executive would be proud to present. Return ONLY valid JSON — an array of slide content objects matching the outline. No markdown fences, no extra text.

${hasSourceFile ? `CRITICAL FILE RULES (source file is attached):
- Base ALL numbers, metrics, and data ONLY on the file provided. Do NOT invent, estimate, or hallucinate values.
- Use exact totals, averages, min/max values as computed from the file columns.
- Do NOT add currency symbols ($, £, €, ₹, etc.) unless the file data explicitly shows them.
- For data slides: chartData entries must come from actual column values or breakdowns in the file.
- For stat entries: use the exact computed totals/averages from the COLUMN ANALYSIS section of the file.

` : ""}═══ MANDATORY CONTENT REQUIREMENTS ═══

Each slide object MUST include ALL applicable fields:

- id: string (match the outline id exactly)
- type: string (match the outline type exactly)
- title: string (punchy, informative slide title — under 8 words)
- subtitle: string — REQUIRED for title, closing, section, and quote slides. One rich sentence (20–30 words) that captures the key narrative of this slide.
- emphasis: string — REQUIRED for ALL slide types. A bold, specific callout — a key metric, insight, decision, or action phrase. Must be concrete and data-driven (e.g., "Occupancy at 87% — 5pp above target", "3 critical gaps require Q2 action", "RevPAR growth of 14% YoY"). Never leave blank.
- body: string — REQUIRED for content, two-column slides. A 2–3 sentence explanatory paragraph (40–60 words) that provides context, analysis, or background for the bullets. Written in flowing prose, not bullet form. This is the narrative spine of the slide.
- bullets: string[] — MANDATORY for content, agenda, two-column slides. Rules:
    • content/two-column slides: EXACTLY 5 bullets minimum. Each bullet: 18–28 words, a COMPLETE SENTENCE with a subject, action, and result/implication. Start with a strong verb or specific number. Must convey a distinct, substantive insight.
    • agenda slides: EXACTLY one bullet per non-title, non-closing, non-agenda slide in the deck (see AGENDA MAP below). Format each as: "[Section Topic]: [what the audience will learn or decide — 10–15 words]"
    • Empty array ONLY for data, quote, section slides
- stat: array — REQUIRED for "data" slides — include EXACTLY 3 stats:
    { value: string (e.g. "87%", "14.2K", "3.2×"), label: string (4–7 words describing what this measures), change: string (e.g. "+12% vs prior quarter", "-3pp vs target"), trend: "up"|"down"|"flat", pct: number (0–150, % of target achieved), color: "green"|"amber"|"red" }
- chartData: array — REQUIRED for "data" slides — include EXACTLY 5–6 entries for a bar chart:
    { label: string (2–4 words), value: number }
    Derive from real breakdowns (by region, property, product, department, quarter, etc.)
- tableData: for "table" slides — include headers and 4–6 data rows with a Status column using ✓ / ✗ / → indicators
- quote: string — for quote slides — an inspiring, specific, attributed insight 20–40 words. Attribute to a real business leader or the presenter's company.
- colorCode: "green"|"amber"|"red" (for data slides — overall RAG status)
- notes: string — REQUIRED for ALL slides. 4–5 sentences of speaker notes (60–90 words). Include: what to emphasise verbally, key talking points not on the slide, how this slide connects to the next, and a suggested transition phrase.

═══ AGENDA MAP (use these exact topics for the agenda slide bullets) ═══
${agendaMap || "Derive agenda topics from the slide outline provided."}

═══ DESIGN PRINCIPLES ═══
- Tone: ${brief?.tone || "Executive"} — decisive, data-driven, and clear
- Audience: ${brief?.audience || "Senior leadership"} — assume high business acumen
- VISUAL CARD LAYOUT: Each bullet will render as its own numbered card in the slide. Write bullets that stand alone as a clear, self-contained insight — not continuations of each other.
- Every slide must be information-dense: title + emphasis + body paragraph + 5–6 detailed bullets = a complete, standalone slide
- Use SPECIFIC numbers, names, percentages — never vague generalities like "improved significantly"
- CURRENCY: Do NOT add any currency symbol ($, £, €, ₹, etc.) to any number unless the source data explicitly shows that symbol
- Title slides: compelling subtitle capturing the narrative arc; emphasis = period label (e.g., "Q2 2026 BOARD REVIEW")
- Data slides: stat values must be real, bold headline numbers (e.g. "87%", "14.2K", "$2.4M"); the value field must be SHORT (under 6 chars); notes explain the story behind the numbers
- Closing slides: bullets[0] = specific, actionable CTA with owner and date; bullets[1] = next milestone or meeting date
- Section slides: subtitle previews the key insight to be revealed in this section
- Two-column slides: emphasis field = "Left Column Title — Right Column Title" (use em-dash separator); colA bullets = one perspective/side; colB bullets = contrasting/complementary perspective
- The body paragraph MUST add analysis or context that is NOT already stated in the bullets
- For content slides with 4+ bullets: prefer 6 bullets since the layout auto-switches to a 2-column card grid which looks premium

═══ QUALITY BAR ═══
A slide FAILS quality if:
- Any bullet is fewer than 15 words
- The body field is missing or fewer than 30 words
- The notes field is fewer than 50 words
- The emphasis field is vague (e.g., "Key insight", "Important metric") or missing
- The agenda slide bullets do not match the actual slides in the deck`;

      const userPrompt = `Presentation: "${brief?.title || "Business Presentation"}"
Objective: ${brief?.objective || ""}
Instructions: ${brief?.instructions || ""}${platformContext}${fileContext}

Outline to expand:
${JSON.stringify(outline, null, 2)}

Generate full slide content now.${hasSourceFile ? " SOURCE FILE IS PROVIDED — use only values and metrics found in that file. Do not invent numbers. No currency symbols unless present in the file." : " Use real data values from above wherever available."}`;

      const completion = await oai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        temperature: 0.65,
        max_tokens: 16000,
      });

      const raw = completion.choices[0].message.content || "[]";
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      let slides: any[];
      try {
        slides = JSON.parse(cleaned);
      } catch {
        // Try to salvage a partial JSON array (truncated response)
        const lastBrace = cleaned.lastIndexOf("}");
        const partial = lastBrace > 0 ? cleaned.slice(0, lastBrace + 1) + "]" : "[]";
        try {
          slides = JSON.parse(partial);
        } catch {
          throw new Error("AI returned malformed JSON — please try regenerating the outline");
        }
      }

      if (!Array.isArray(slides) || slides.length === 0) {
        throw new Error("AI returned no slide content — please try again");
      }

      // Save slides to presentation
      const id = Number(req.params.id);
      const existing = await storage.getPresentation(id);
      if (existing) {
        await storage.updatePresentation(id, { slides, outline, status: "draft" });
      }
      res.json({ slides });
    } catch (err: any) { res.status(500).json({ message: err.message || "Slide generation failed" }); }
  });

  // ── AI: Refine Single Slide ───────────────────────────────────────────────
  app.post("/api/presentations/:id/refine-slide", requireAuth, async (req: Request, res: Response) => {
    try {
      const { getOaiV2 } = await import("./ai");
      const oai = getOaiV2();
      const { slide, instruction, brief } = req.body;

      const completion = await oai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a business presentation expert. Refine the given slide based on the user instruction.

Return ONLY valid JSON of the complete updated slide object — no markdown fences, no extra text.

CANVAS VISIBILITY RULES — only these fields render visually on each slide type:
- "title" slides: title, subtitle, emphasis
- "agenda" slides: title, bullets (each bullet = one agenda item)
- "section" slides: title, subtitle, emphasis
- "content" slides: title, body (explanatory paragraph shown above bullets), bullets, emphasis
- "two-column" slides: title, body (explanatory paragraph), bullets (first half = left col, second half = right col), emphasis
- "data" slides: title, stat (KPI cards — update value/label/change/trend/color), chartData (bar chart — update label/value pairs), emphasis, colorCode
- "quote" slides: title, quote
- "closing" slides: title, bullets, emphasis
- "table" slides: title, tableData (headers + rows)

CRITICAL: When refining, you MUST update the fields that are VISIBLE for this slide's type.
- For "data" slides: ALWAYS update stat entries and chartData to reflect the instruction — never just change notes or bullets (bullets are not shown on data slides)
- For "content"/"agenda"/"closing": update bullets with substantive complete sentences
- notes field is speaker notes (NOT visible on canvas) — update it too but it must NOT be your only change
- Do NOT add currency symbols ($, £, €, ₹) unless they already exist in the data
- Keep all fields from input, only modify what's relevant`,
          },
          {
            role: "user",
            content: `Presentation: "${brief?.title || ""}" — Audience: ${brief?.audience || "executives"}

Slide type: "${slide?.type}" — MUST update the fields that render visually for this type.

Current slide:
${JSON.stringify(slide, null, 2)}

Instruction: ${instruction}

Return the complete refined slide JSON with VISIBLE fields updated:`,
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const raw = completion.choices[0].message.content || "{}";
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const refined = JSON.parse(cleaned);
      res.json({ slide: refined });
    } catch (err: any) { res.status(500).json({ message: err.message || "Slide refinement failed" }); }
  });

  app.all(/^\/api\//, (_req: Request, res: Response) => {
    res.status(404).json({ message: "API endpoint not found" });
  });

  return httpServer;
}
