import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireAdmin, requireEditAccess } from "./auth";
import { generateKpis, generateMonthlyReview, generateDashboardPlan } from "./ai";
import { sendActionReminder } from "./email";
import { processAssistantMessage } from "./assistant";
import { registerOwnerRoutes, logActivity } from "./owner-routes";
import * as XLSX from "xlsx";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

/** Normalises a date string to YYYY-MM-DD for DB storage.
 *  Accepts DD-MM-YYYY (from Excel uploads) or YYYY-MM-DD (legacy / browser date pickers). */
function parseDateStr(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // DD-MM-YYYY
  const ddmmyyyy = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  // YYYY-MM-DD (already correct)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
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
    res.status(201).json(kpi);
  });

  app.patch("/api/kpis/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    if (!(await verifyKpiOwnership(req, id))) return res.status(404).json({ message: "Not found" });
    const kpi = await storage.updateKpi(id, req.body);
    res.json(kpi);
  });

  app.delete("/api/kpis/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    if (!(await verifyKpiOwnership(req, id))) return res.status(404).json({ message: "Not found" });
    await storage.deleteKpi(id);
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
    res.status(201).json(item);
  });

  app.patch("/api/action-items/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Not found" });
    const item = await storage.getActionItem(id);
    if (!item || item.companyId !== company.id) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateActionItem(id, req.body);
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
          const item = await storage.createActionItem({
            companyId: company.id,
            departmentId: dept?.id || null,
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
    res.json(updated);
  });

  app.delete("/api/projects/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const existing = await storage.getProject(id);
    if (!existing || existing.companyId !== company.id) return res.status(404).json({ message: "Not found" });
    await storage.deleteProject(id);
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
    res.json(task);
  });

  app.patch("/api/tasks/:id", requireEditAccess, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const existing = await storage.getTask(id);
    if (!existing || existing.companyId !== company.id) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateTask(id, req.body);
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
    const allTasks = await storage.getTasks(company.id);
    const today = new Date().toISOString().split("T")[0];
    const byAssignee: Record<string, { name: string; total: number; notStarted: number; inProgress: number; completed: number; overdue: number; tasks: typeof allTasks }> = {};
    for (const task of allTasks) {
      const name = task.assignee || "Unassigned";
      if (!byAssignee[name]) byAssignee[name] = { name, total: 0, notStarted: 0, inProgress: 0, completed: 0, overdue: 0, tasks: [] };
      const a = byAssignee[name];
      a.total++;
      a.tasks.push(task);
      if (task.status === "Completed") a.completed++;
      else if (task.status === "In Progress") a.inProgress++;
      else a.notStarted++;
      if (task.dueDate && task.dueDate < today && task.status !== "Completed") a.overdue++;
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

  app.all(/^\/api\//, (_req: Request, res: Response) => {
    res.status(404).json({ message: "API endpoint not found" });
  });

  return httpServer;
}
