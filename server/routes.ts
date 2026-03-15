import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireAdmin } from "./auth";
import { generateKpis, generateMonthlyReview, generateDashboardPlan } from "./ai";
import * as XLSX from "xlsx";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

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

  app.get("/api/meeting-types", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.json([]);
    res.json(await storage.getMeetingTypes(company.id));
  });

  app.post("/api/meeting-types", requireAdmin, async (req: Request, res: Response) => {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Name is required" });
    const company = await getCompanyForUser(req);
    if (!company) return res.status(400).json({ message: "No company profile" });
    const mt = await storage.createMeetingType({ companyId: company.id, name });
    res.status(201).json(mt);
  });

  app.delete("/api/meeting-types/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Not found" });
    const allTypes = await storage.getMeetingTypes(company.id);
    const mt = allTypes.find(t => t.id === id);
    if (!mt) return res.status(404).json({ message: "Not found" });
    await storage.deleteMeetingType(mt.id);
    res.json({ ok: true });
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
        return res.status(409).json({ message: "Cannot delete department — it is currently in use by KPIs, actions, or meetings. Remove those references first." });
      }
      throw err;
    }
  });

  app.get("/api/kpis", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.json([]);
    res.json(await storage.getKpis(company.id));
  });

  app.post("/api/kpis", requireAdmin, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(400).json({ message: "No company profile" });
    const kpi = await storage.createKpi({ ...req.body, companyId: company.id });
    res.status(201).json(kpi);
  });

  app.patch("/api/kpis/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    if (!(await verifyKpiOwnership(req, id))) return res.status(404).json({ message: "Not found" });
    const kpi = await storage.updateKpi(id, req.body);
    res.json(kpi);
  });

  app.delete("/api/kpis/:id", requireAdmin, async (req: Request, res: Response) => {
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

  app.post("/api/kpi-actuals", requireAdmin, async (req: Request, res: Response) => {
    if (!(await verifyKpiOwnership(req, req.body.kpiId))) return res.status(404).json({ message: "Not found" });
    const actual = await storage.createKpiActual(req.body);
    res.status(201).json(actual);
  });

  app.post("/api/ai/generate-kpis", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { industry, department, goals } = req.body;
      const kpis = await generateKpis(industry, department, goals || []);
      res.json(kpis);
    } catch (err: any) {
      console.error("AI KPI generation error:", err);
      res.status(500).json({ message: "Failed to generate KPIs" });
    }
  });

  app.get("/api/meetings", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.json([]);
    res.json(await storage.getMeetings(company.id));
  });

  app.post("/api/meetings", requireAdmin, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(400).json({ message: "No company profile" });
    const meeting = await storage.createMeeting({ ...req.body, companyId: company.id });
    res.status(201).json(meeting);
  });

  app.patch("/api/meetings/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Not found" });
    const meeting = await storage.getMeeting(id);
    if (!meeting || meeting.companyId !== company.id) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateMeeting(id, req.body);
    res.json(updated);
  });

  app.delete("/api/meetings/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Not found" });
    const meeting = await storage.getMeeting(id);
    if (!meeting || meeting.companyId !== company.id) return res.status(404).json({ message: "Not found" });
    await storage.deleteMeeting(id);
    res.json({ ok: true });
  });

  app.get("/api/action-items", requireAuth, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.json([]);
    res.json(await storage.getActionItems(company.id));
  });

  app.post("/api/action-items", requireAdmin, async (req: Request, res: Response) => {
    const company = await getCompanyForUser(req);
    if (!company) return res.status(400).json({ message: "No company profile" });
    const item = await storage.createActionItem({ ...req.body, companyId: company.id });
    res.status(201).json(item);
  });

  app.patch("/api/action-items/:id", requireAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id as string);
    const company = await getCompanyForUser(req);
    if (!company) return res.status(404).json({ message: "Not found" });
    const item = await storage.getActionItem(id);
    if (!item || item.companyId !== company.id) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateActionItem(id, req.body);
    res.json(updated);
  });

  app.delete("/api/action-items/:id", requireAdmin, async (req: Request, res: Response) => {
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

  app.post("/api/ai/monthly-review", requireAdmin, async (req: Request, res: Response) => {
    try {
      const company = await getCompanyForUser(req);
      if (!company) return res.status(400).json({ message: "No company profile" });
      const fullCompany = await storage.getCompany(company.id);
      const { month, kpiData } = req.body;
      const review = await generateMonthlyReview(kpiData, fullCompany!.companyName, month);
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

  app.post("/api/ai/dashboard-plan", requireAdmin, async (req: Request, res: Response) => {
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
      ["Meeting Type", "Title", "Description", "Owner", "Due Date (YYYY-MM-DD)", "Revised Due Date (YYYY-MM-DD)", "Priority (Low/Medium/High/Critical)", "Status (Not Started/In Progress/Completed/Delayed)", "Department"],
      ["PMO Steering Committee", "Implement feedback system", "Deploy guest feedback kiosks", "Sarah Johnson", "2026-03-15", "", "High", "In Progress", "Operations"],
      ["CEO Meeting", "Review pricing", "Analyze competitor pricing", "Michael Chen", "2026-03-20", "2026-03-25", "Medium", "Not Started", "Sales"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = data[0].map(() => ({ wch: 28 }));
    XLSX.utils.book_append_sheet(wb, ws, "Action Items");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=action_items_template.xlsx");
    res.send(buf);
  });

  app.post("/api/upload/kpis", requireAdmin, async (req: Request, res: Response) => {
    try {
      const company = await getCompanyForUser(req);
      if (!company) return res.status(400).json({ message: "No company profile" });
      const departments = await storage.getDepartments(company.id);
      const { data } = req.body;
      if (!Array.isArray(data) || data.length === 0) return res.status(400).json({ message: "No data provided" });

      const created = [];
      for (const row of data) {
        const dept = departments.find(d => d.name.toLowerCase() === (row.department || "").toLowerCase());
        const kpi = await storage.createKpi({
          companyId: company.id,
          departmentId: dept?.id || null,
          kpiName: row.kpiName || row["KPI Name"] || "",
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
      }
      res.json({ imported: created.length, kpis: created });
    } catch (err: any) {
      console.error("KPI upload error:", err);
      res.status(500).json({ message: "Failed to import KPIs" });
    }
  });

  app.post("/api/upload/actions", requireAdmin, async (req: Request, res: Response) => {
    try {
      const company = await getCompanyForUser(req);
      if (!company) return res.status(400).json({ message: "No company profile" });
      const departments = await storage.getDepartments(company.id);
      const { data } = req.body;
      if (!Array.isArray(data) || data.length === 0) return res.status(400).json({ message: "No data provided" });

      const created = [];
      for (const row of data) {
        const dept = departments.find(d => d.name.toLowerCase() === (row.department || row["Department"] || "").toLowerCase());
        const item = await storage.createActionItem({
          companyId: company.id,
          departmentId: dept?.id || null,
          meetingType: row.meetingType || row["Meeting Type"] || null,
          title: row.title || row["Title"] || "",
          description: row.description || row["Description"] || null,
          ownerName: row.ownerName || row["Owner"] || null,
          dueDate: row.dueDate || row["Due Date (YYYY-MM-DD)"] || null,
          revisedDueDate: row.revisedDueDate || row["Revised Due Date (YYYY-MM-DD)"] || null,
          priority: row.priority || row["Priority (Low/Medium/High/Critical)"] || "Medium",
          status: row.status || row["Status (Not Started/In Progress/Completed/Delayed)"] || "Not Started",
        });
        created.push(item);
      }
      res.json({ imported: created.length, items: created });
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

  return httpServer;
}
