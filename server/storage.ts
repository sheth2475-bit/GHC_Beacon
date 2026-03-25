import { db } from "./db";
import { eq, desc, and, ilike, or, inArray, gte, sql as sqlExpr } from "drizzle-orm";
import {
  users, companies, departments, businessGoals, kpis, kpiActuals,
  actionItems, monthlyReviews, dashboardPlans,
  projects, tasks, subtasks, milestones, projectComments, assistantLogs,
  platformOwners, subscriptions, activationKeys, userActivityLogs, ownerAuditLogs, teamMembers,
  userDepartmentAccess,
  analyticsDashboards, analyticsDashboardUploads, analyticsDashboardWidgets,
  analyticsDashboardNarratives, analyticsDashboardChat,
  type InsertUser, type User, type InsertCompany, type Company,
  type InsertDepartment, type Department, type InsertBusinessGoal, type BusinessGoal,
  type InsertKpi, type Kpi, type InsertKpiActual, type KpiActual,
  type InsertActionItem, type ActionItem,
  type InsertMonthlyReview, type MonthlyReview,
  type InsertDashboardPlan, type DashboardPlan,
  type InsertProject, type Project, type InsertTask, type Task,
  type InsertSubtask, type Subtask, type InsertMilestone, type Milestone,
  type InsertProjectComment, type ProjectComment,
  type InsertAssistantLog, type AssistantLog,
  type PlatformOwner, type InsertPlatformOwner,
  type Subscription, type InsertSubscription,
  type ActivationKey, type InsertActivationKey,
  type UserActivityLog, type InsertUserActivityLog,
  type OwnerAuditLog, type InsertOwnerAuditLog,
  type TeamMember, type InsertTeamMember,
  type UserDepartmentAccess,
  type AnalyticsDashboard, type InsertAnalyticsDashboard,
  type AnalyticsDashboardUpload, type InsertAnalyticsDashboardUpload,
  type AnalyticsDashboardWidget, type InsertAnalyticsDashboardWidget,
  type AnalyticsDashboardNarrative, type InsertAnalyticsDashboardNarrative,
  type AnalyticsDashboardChat, type InsertAnalyticsDashboardChat,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByCompany(companyId: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  getTeamMembers(companyId: number): Promise<TeamMember[]>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, data: Partial<InsertTeamMember>): Promise<TeamMember>;
  deleteTeamMember(id: number): Promise<void>;

  getCompany(id: number): Promise<Company | undefined>;
  getCompanyByUserId(userId: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company>;

  getDepartments(companyId: number): Promise<Department[]>;
  createDepartment(dept: InsertDepartment): Promise<Department>;
  deleteDepartment(id: number): Promise<void>;

  getBusinessGoals(companyId: number): Promise<BusinessGoal[]>;
  createBusinessGoal(goal: InsertBusinessGoal): Promise<BusinessGoal>;
  deleteBusinessGoal(id: number): Promise<void>;

  getKpis(companyId: number): Promise<Kpi[]>;
  getKpi(id: number): Promise<Kpi | undefined>;
  createKpi(kpi: InsertKpi): Promise<Kpi>;
  updateKpi(id: number, data: Partial<InsertKpi>): Promise<Kpi>;
  deleteKpi(id: number): Promise<void>;

  getKpiActuals(kpiId: number): Promise<KpiActual[]>;
  getKpiActualsByMonth(companyId: number, month: string): Promise<(KpiActual & { kpi: Kpi })[]>;
  getAllKpiActuals(companyId: number): Promise<(KpiActual & { kpiName: string })[]>;
  createKpiActual(actual: InsertKpiActual): Promise<KpiActual>;

  getActionItems(companyId: number): Promise<ActionItem[]>;
  getActionItem(id: number): Promise<ActionItem | undefined>;
  createActionItem(item: InsertActionItem): Promise<ActionItem>;
  updateActionItem(id: number, data: Partial<InsertActionItem>): Promise<ActionItem>;
  deleteActionItem(id: number): Promise<void>;

  getMonthlyReviews(companyId: number): Promise<MonthlyReview[]>;
  getMonthlyReview(id: number): Promise<MonthlyReview | undefined>;
  createMonthlyReview(review: InsertMonthlyReview): Promise<MonthlyReview>;

  getDashboardPlans(companyId: number): Promise<DashboardPlan[]>;
  createDashboardPlan(plan: InsertDashboardPlan): Promise<DashboardPlan>;

  // Projects
  getProjects(companyId: number): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, data: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;

  // Tasks
  getTasks(companyId: number): Promise<Task[]>;
  getTasksByProject(projectId: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, data: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

  // Subtasks
  getSubtasks(taskId: number): Promise<Subtask[]>;
  getSubtask(id: number): Promise<Subtask | undefined>;
  createSubtask(subtask: InsertSubtask): Promise<Subtask>;
  updateSubtask(id: number, data: Partial<InsertSubtask>): Promise<Subtask>;
  deleteSubtask(id: number): Promise<void>;

  // Milestones
  getMilestones(companyId: number): Promise<Milestone[]>;
  getMilestonesByProject(projectId: number): Promise<Milestone[]>;
  getMilestone(id: number): Promise<Milestone | undefined>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: number, data: Partial<InsertMilestone>): Promise<Milestone>;
  deleteMilestone(id: number): Promise<void>;

  // Comments
  getComments(companyId: number, entityType: string, entityId: number): Promise<ProjectComment[]>;
  createComment(comment: InsertProjectComment): Promise<ProjectComment>;
  deleteComment(id: number): Promise<void>;

  // Search
  searchAll(companyId: number, q: string): Promise<{
    projects: Project[];
    tasks: Task[];
    kpis: Kpi[];
    actionItems: ActionItem[];
  }>;

  // Assistant logs
  createAssistantLog(log: InsertAssistantLog): Promise<AssistantLog>;
  getAssistantLogs(companyId: number, limit?: number): Promise<AssistantLog[]>;

  // Platform Owners
  getPlatformOwner(id: number): Promise<PlatformOwner | undefined>;
  getPlatformOwnerByEmail(email: string): Promise<PlatformOwner | undefined>;
  createPlatformOwner(owner: InsertPlatformOwner): Promise<PlatformOwner>;

  // Subscriptions
  getSubscription(companyId: number): Promise<Subscription | undefined>;
  upsertSubscription(companyId: number, data: Partial<InsertSubscription>): Promise<Subscription>;
  getAllSubscriptions(): Promise<(Subscription & { company: Company })[]>;

  // Activation Keys
  getActivationKey(id: number): Promise<ActivationKey | undefined>;
  getActivationKeyByValue(keyValue: string): Promise<ActivationKey | undefined>;
  getActivationKeysByCompany(companyId: number): Promise<ActivationKey[]>;
  getAllActivationKeys(): Promise<(ActivationKey & { company: Company | null })[]>;
  createActivationKey(key: InsertActivationKey): Promise<ActivationKey>;
  updateActivationKey(id: number, data: Partial<InsertActivationKey>): Promise<ActivationKey>;

  // Activity Logs
  createActivityLog(log: InsertUserActivityLog): Promise<UserActivityLog>;
  getActivityLogs(companyId: number, limit?: number): Promise<UserActivityLog[]>;
  getAllActivityLogs(limit?: number): Promise<UserActivityLog[]>;
  getDailyAiCount(companyId: number): Promise<number>;

  // Owner Audit Logs
  createOwnerAuditLog(log: InsertOwnerAuditLog): Promise<OwnerAuditLog>;
  getOwnerAuditLogs(limit?: number): Promise<OwnerAuditLog[]>;

  // Department Access Control
  getDeptAccessForUser(userId: number): Promise<UserDepartmentAccess[]>;
  getDeptAccessForUserWithDepts(userId: number): Promise<(UserDepartmentAccess & { departmentName: string })[]>;
  setDeptAccess(userId: number, departmentId: number, accessLevel: string): Promise<UserDepartmentAccess>;
  removeDeptAccess(id: number): Promise<void>;

  removeDeptAccessForUser(userId: number): Promise<void>;

  // Documents
  getDocuments(entityType: string, entityId: number): Promise<import("@shared/schema").Document[]>;
  createDocument(doc: import("@shared/schema").InsertDocument): Promise<import("@shared/schema").Document>;
  deleteDocument(id: number): Promise<void>;
  getDocument(id: number): Promise<import("@shared/schema").Document | undefined>;

  // Platform analytics
  getAllCompanies(): Promise<Company[]>;
  getAllUsers(): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async getUsersByCompany(companyId: number) {
    return db.select().from(users).where(eq(users.companyId, companyId));
  }
  async createUser(user: InsertUser) {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }
  async updateUser(id: number, data: Partial<InsertUser>) {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }
  async deleteUser(id: number) {
    await db.delete(users).where(eq(users.id, id));
  }

  async getCompany(id: number) {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }
  async getCompanyByUserId(userId: number) {
    const [company] = await db.select().from(companies).where(eq(companies.userId, userId));
    return company;
  }
  async createCompany(company: InsertCompany) {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }
  async updateCompany(id: number, data: Partial<InsertCompany>) {
    const [updated] = await db.update(companies).set(data).where(eq(companies.id, id)).returning();
    return updated;
  }

  async getDepartments(companyId: number) {
    return db.select().from(departments).where(eq(departments.companyId, companyId));
  }
  async createDepartment(dept: InsertDepartment) {
    const [created] = await db.insert(departments).values(dept).returning();
    return created;
  }
  async deleteDepartment(id: number) {
    await db.delete(departments).where(eq(departments.id, id));
  }

  async getBusinessGoals(companyId: number) {
    return db.select().from(businessGoals).where(eq(businessGoals.companyId, companyId));
  }
  async createBusinessGoal(goal: InsertBusinessGoal) {
    const [created] = await db.insert(businessGoals).values(goal).returning();
    return created;
  }
  async deleteBusinessGoal(id: number) {
    await db.delete(businessGoals).where(eq(businessGoals.id, id));
  }

  async getKpis(companyId: number) {
    return db.select().from(kpis).where(eq(kpis.companyId, companyId));
  }
  async getKpi(id: number) {
    const [kpi] = await db.select().from(kpis).where(eq(kpis.id, id));
    return kpi;
  }
  async createKpi(kpi: InsertKpi) {
    const [created] = await db.insert(kpis).values(kpi).returning();
    return created;
  }
  async updateKpi(id: number, data: Partial<InsertKpi>) {
    const [updated] = await db.update(kpis).set(data).where(eq(kpis.id, id)).returning();
    return updated;
  }
  async deleteKpi(id: number) {
    await db.delete(kpiActuals).where(eq(kpiActuals.kpiId, id));
    await db.delete(kpis).where(eq(kpis.id, id));
  }

  async getKpiActuals(kpiId: number) {
    return db.select().from(kpiActuals).where(eq(kpiActuals.kpiId, kpiId)).orderBy(desc(kpiActuals.createdAt));
  }
  async getAllKpiActuals(companyId: number) {
    const companyKpis = await db.select().from(kpis).where(eq(kpis.companyId, companyId));
    const kpiIds = companyKpis.map(k => k.id);
    if (kpiIds.length === 0) return [];
    const actuals = await db.select().from(kpiActuals)
      .where(inArray(kpiActuals.kpiId, kpiIds))
      .orderBy(kpiActuals.reviewMonth);
    const kpiNameMap: Record<number, string> = {};
    for (const k of companyKpis) kpiNameMap[k.id] = k.kpiName;
    return actuals.map(a => ({ ...a, kpiName: kpiNameMap[a.kpiId] || "" }));
  }
  async getKpiActualsByMonth(companyId: number, month: string) {
    const companyKpis = await this.getKpis(companyId);
    const results: (KpiActual & { kpi: Kpi })[] = [];
    for (const kpi of companyKpis) {
      const [actual] = await db.select().from(kpiActuals)
        .where(and(eq(kpiActuals.kpiId, kpi.id), eq(kpiActuals.reviewMonth, month)));
      if (actual) results.push({ ...actual, kpi });
    }
    return results;
  }
  async createKpiActual(actual: InsertKpiActual) {
    const [created] = await db.insert(kpiActuals).values(actual).returning();
    return created;
  }

  async getActionItems(companyId: number) {
    return db.select().from(actionItems).where(eq(actionItems.companyId, companyId)).orderBy(desc(actionItems.createdAt));
  }
  async getActionItem(id: number) {
    const [item] = await db.select().from(actionItems).where(eq(actionItems.id, id));
    return item;
  }
  async createActionItem(item: InsertActionItem) {
    const [created] = await db.insert(actionItems).values(item).returning();
    return created;
  }
  async updateActionItem(id: number, data: Partial<InsertActionItem>) {
    const [updated] = await db.update(actionItems).set(data).where(eq(actionItems.id, id)).returning();
    return updated;
  }
  async deleteActionItem(id: number) {
    await db.delete(actionItems).where(eq(actionItems.id, id));
  }

  async getMonthlyReviews(companyId: number) {
    return db.select().from(monthlyReviews).where(eq(monthlyReviews.companyId, companyId)).orderBy(desc(monthlyReviews.createdAt));
  }
  async getMonthlyReview(id: number) {
    const [review] = await db.select().from(monthlyReviews).where(eq(monthlyReviews.id, id));
    return review;
  }
  async createMonthlyReview(review: InsertMonthlyReview) {
    const [created] = await db.insert(monthlyReviews).values(review).returning();
    return created;
  }

  async getDashboardPlans(companyId: number) {
    return db.select().from(dashboardPlans).where(eq(dashboardPlans.companyId, companyId)).orderBy(desc(dashboardPlans.createdAt));
  }
  async createDashboardPlan(plan: InsertDashboardPlan) {
    const [created] = await db.insert(dashboardPlans).values(plan).returning();
    return created;
  }

  // ─── Projects ─────────────────────────────────────────────────────────────
  async getProjects(companyId: number) {
    return db.select().from(projects).where(eq(projects.companyId, companyId)).orderBy(desc(projects.createdAt));
  }
  async getProject(id: number) {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }
  async createProject(project: InsertProject) {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }
  async updateProject(id: number, data: Partial<InsertProject>) {
    const [updated] = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return updated;
  }
  async deleteProject(id: number) {
    const projectTasks = await this.getTasksByProject(id);
    for (const task of projectTasks) {
      await db.delete(subtasks).where(eq(subtasks.taskId, task.id));
    }
    await db.delete(tasks).where(eq(tasks.projectId, id));
    await db.delete(milestones).where(eq(milestones.projectId, id));
    await db.delete(projectComments).where(and(eq(projectComments.entityType, "project"), eq(projectComments.entityId, id)));
    await db.delete(projects).where(eq(projects.id, id));
  }

  // ─── Tasks ────────────────────────────────────────────────────────────────
  async getTasks(companyId: number) {
    return db.select().from(tasks).where(eq(tasks.companyId, companyId)).orderBy(desc(tasks.createdAt));
  }
  async getTasksByProject(projectId: number) {
    return db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(desc(tasks.createdAt));
  }
  async getTask(id: number) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }
  async createTask(task: InsertTask) {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }
  async updateTask(id: number, data: Partial<InsertTask>) {
    const [updated] = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
    return updated;
  }
  async deleteTask(id: number) {
    await db.delete(subtasks).where(eq(subtasks.taskId, id));
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // ─── Subtasks ─────────────────────────────────────────────────────────────
  async getSubtasks(taskId: number) {
    return db.select().from(subtasks).where(eq(subtasks.taskId, taskId)).orderBy(subtasks.createdAt);
  }
  async getSubtask(id: number) {
    const [sub] = await db.select().from(subtasks).where(eq(subtasks.id, id));
    return sub;
  }
  async createSubtask(subtask: InsertSubtask) {
    const [created] = await db.insert(subtasks).values(subtask).returning();
    return created;
  }
  async updateSubtask(id: number, data: Partial<InsertSubtask>) {
    const [updated] = await db.update(subtasks).set(data).where(eq(subtasks.id, id)).returning();
    return updated;
  }
  async deleteSubtask(id: number) {
    await db.delete(subtasks).where(eq(subtasks.id, id));
  }

  // ─── Milestones ───────────────────────────────────────────────────────────
  async getMilestones(companyId: number) {
    return db.select().from(milestones).where(eq(milestones.companyId, companyId)).orderBy(milestones.dueDate);
  }
  async getMilestonesByProject(projectId: number) {
    return db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(milestones.dueDate);
  }
  async getMilestone(id: number) {
    const [milestone] = await db.select().from(milestones).where(eq(milestones.id, id));
    return milestone;
  }
  async createMilestone(milestone: InsertMilestone) {
    const [created] = await db.insert(milestones).values(milestone).returning();
    return created;
  }
  async updateMilestone(id: number, data: Partial<InsertMilestone>) {
    const [updated] = await db.update(milestones).set(data).where(eq(milestones.id, id)).returning();
    return updated;
  }
  async deleteMilestone(id: number) {
    await db.delete(milestones).where(eq(milestones.id, id));
  }

  // ─── Comments ─────────────────────────────────────────────────────────────
  async getComments(companyId: number, entityType: string, entityId: number) {
    return db.select().from(projectComments)
      .where(and(
        eq(projectComments.companyId, companyId),
        eq(projectComments.entityType, entityType),
        eq(projectComments.entityId, entityId),
      ))
      .orderBy(projectComments.createdAt);
  }
  async createComment(comment: InsertProjectComment) {
    const [created] = await db.insert(projectComments).values(comment).returning();
    return created;
  }
  async deleteComment(id: number) {
    await db.delete(projectComments).where(eq(projectComments.id, id));
  }

  // ─── Search ───────────────────────────────────────────────────────────────
  async searchAll(companyId: number, q: string) {
    const term = `%${q}%`;
    const [searchProjects, searchTasks, searchKpis, searchActions] = await Promise.all([
      db.select().from(projects).where(and(eq(projects.companyId, companyId), or(ilike(projects.name, term), ilike(projects.description, term)))).limit(10),
      db.select().from(tasks).where(and(eq(tasks.companyId, companyId), or(ilike(tasks.title, term), ilike(tasks.description, term)))).limit(10),
      db.select().from(kpis).where(and(eq(kpis.companyId, companyId), or(ilike(kpis.kpiName, term), ilike(kpis.description, term)))).limit(10),
      db.select().from(actionItems).where(and(eq(actionItems.companyId, companyId), or(ilike(actionItems.title, term), ilike(actionItems.description, term)))).limit(10),
    ]);
    return { projects: searchProjects, tasks: searchTasks, kpis: searchKpis, actionItems: searchActions };
  }

  // ─── Assistant Logs ───────────────────────────────────────────────────────
  async createAssistantLog(log: InsertAssistantLog) {
    const [created] = await db.insert(assistantLogs).values(log).returning();
    return created;
  }
  async getAssistantLogs(companyId: number, limit = 50) {
    return db.select().from(assistantLogs)
      .where(eq(assistantLogs.companyId, companyId))
      .orderBy(desc(assistantLogs.createdAt))
      .limit(limit);
  }

  // ─── Platform Owners ──────────────────────────────────────────────────────
  async getPlatformOwner(id: number) {
    const [owner] = await db.select().from(platformOwners).where(eq(platformOwners.id, id));
    return owner;
  }
  async getPlatformOwnerByEmail(email: string) {
    const [owner] = await db.select().from(platformOwners).where(eq(platformOwners.email, email));
    return owner;
  }
  async createPlatformOwner(owner: InsertPlatformOwner) {
    const [created] = await db.insert(platformOwners).values(owner).returning();
    return created;
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────
  async getSubscription(companyId: number) {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.companyId, companyId));
    return sub;
  }
  async upsertSubscription(companyId: number, data: Partial<InsertSubscription>) {
    const existing = await this.getSubscription(companyId);
    if (existing) {
      const [updated] = await db.update(subscriptions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(subscriptions.companyId, companyId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(subscriptions)
        .values({ companyId, planName: "Trial", status: "Trial Active", maxUsers: 5, dailyAiLimit: 15, ...data })
        .returning();
      return created;
    }
  }
  async getAllSubscriptions() {
    const subs = await db.select().from(subscriptions);
    const result: (Subscription & { company: Company })[] = [];
    for (const sub of subs) {
      const company = await this.getCompany(sub.companyId);
      if (company) result.push({ ...sub, company });
    }
    return result;
  }

  // ─── Activation Keys ──────────────────────────────────────────────────────
  async getActivationKey(id: number) {
    const [key] = await db.select().from(activationKeys).where(eq(activationKeys.id, id));
    return key;
  }
  async getActivationKeyByValue(keyValue: string) {
    const [key] = await db.select().from(activationKeys).where(eq(activationKeys.keyValue, keyValue));
    return key;
  }
  async getActivationKeysByCompany(companyId: number) {
    return db.select().from(activationKeys).where(eq(activationKeys.companyId, companyId)).orderBy(desc(activationKeys.issuedAt));
  }
  async getAllActivationKeys() {
    const keys = await db.select().from(activationKeys).orderBy(desc(activationKeys.issuedAt));
    const result: (ActivationKey & { company: Company | null })[] = [];
    for (const key of keys) {
      const company = key.companyId ? await this.getCompany(key.companyId) : null;
      result.push({ ...key, company: company || null });
    }
    return result;
  }
  async createActivationKey(key: InsertActivationKey) {
    const [created] = await db.insert(activationKeys).values(key).returning();
    return created;
  }
  async updateActivationKey(id: number, data: Partial<InsertActivationKey>) {
    const [updated] = await db.update(activationKeys).set(data).where(eq(activationKeys.id, id)).returning();
    return updated;
  }

  // ─── Activity Logs ────────────────────────────────────────────────────────
  async createActivityLog(log: InsertUserActivityLog) {
    const [created] = await db.insert(userActivityLogs).values(log).returning();
    return created;
  }
  async getActivityLogs(companyId: number, limit = 100) {
    return db.select().from(userActivityLogs)
      .where(eq(userActivityLogs.companyId, companyId))
      .orderBy(desc(userActivityLogs.createdAt))
      .limit(limit);
  }
  async getAllActivityLogs(limit = 200) {
    return db.select().from(userActivityLogs)
      .orderBy(desc(userActivityLogs.createdAt))
      .limit(limit);
  }
  async getDailyAiCount(companyId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows = await db.select().from(userActivityLogs)
      .where(and(
        eq(userActivityLogs.companyId, companyId),
        eq(userActivityLogs.activityType, "ai_request"),
        gte(userActivityLogs.createdAt, today),
      ));
    return rows.length;
  }

  // ─── Owner Audit Logs ─────────────────────────────────────────────────────
  async createOwnerAuditLog(log: InsertOwnerAuditLog) {
    const [created] = await db.insert(ownerAuditLogs).values(log).returning();
    return created;
  }
  async getOwnerAuditLogs(limit = 100) {
    return db.select().from(ownerAuditLogs).orderBy(desc(ownerAuditLogs.createdAt)).limit(limit);
  }

  // ─── Team Members ─────────────────────────────────────────────────────────
  async getTeamMembers(companyId: number) {
    return db.select().from(teamMembers).where(eq(teamMembers.companyId, companyId)).orderBy(teamMembers.name);
  }
  async createTeamMember(member: InsertTeamMember) {
    const [created] = await db.insert(teamMembers).values(member).returning();
    return created;
  }
  async updateTeamMember(id: number, data: Partial<InsertTeamMember>) {
    const [updated] = await db.update(teamMembers).set(data).where(eq(teamMembers.id, id)).returning();
    return updated;
  }
  async deleteTeamMember(id: number) {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  // ─── Department Access Control ────────────────────────────────────────────
  async getDeptAccessForUser(userId: number) {
    return db.select().from(userDepartmentAccess).where(eq(userDepartmentAccess.userId, userId));
  }
  async getDeptAccessForUserWithDepts(userId: number) {
    const rows = await db
      .select({ access: userDepartmentAccess, deptName: departments.name })
      .from(userDepartmentAccess)
      .innerJoin(departments, eq(userDepartmentAccess.departmentId, departments.id))
      .where(eq(userDepartmentAccess.userId, userId));
    return rows.map(r => ({ ...r.access, departmentName: r.deptName }));
  }
  async setDeptAccess(userId: number, departmentId: number, accessLevel: string) {
    const existing = await db.select().from(userDepartmentAccess)
      .where(and(eq(userDepartmentAccess.userId, userId), eq(userDepartmentAccess.departmentId, departmentId)));
    if (existing.length > 0) {
      const [updated] = await db.update(userDepartmentAccess)
        .set({ accessLevel })
        .where(and(eq(userDepartmentAccess.userId, userId), eq(userDepartmentAccess.departmentId, departmentId)))
        .returning();
      return updated;
    }
    const [created] = await db.insert(userDepartmentAccess).values({ userId, departmentId, accessLevel }).returning();
    return created;
  }
  async removeDeptAccess(id: number) {
    await db.delete(userDepartmentAccess).where(eq(userDepartmentAccess.id, id));
  }
  async removeDeptAccessForUser(userId: number) {
    await db.delete(userDepartmentAccess).where(eq(userDepartmentAccess.userId, userId));
  }

  // ─── Documents ────────────────────────────────────────────────────────────
  async getDocuments(entityType: string, entityId: number) {
    const { documents } = await import("@shared/schema");
    return db.select().from(documents)
      .where(and(eq(documents.entityType, entityType), eq(documents.entityId, entityId)))
      .orderBy(desc(documents.createdAt));
  }
  async createDocument(doc: import("@shared/schema").InsertDocument) {
    const { documents } = await import("@shared/schema");
    const [created] = await db.insert(documents).values(doc).returning();
    return created;
  }
  async deleteDocument(id: number) {
    const { documents } = await import("@shared/schema");
    await db.delete(documents).where(eq(documents.id, id));
  }
  async getDocument(id: number) {
    const { documents } = await import("@shared/schema");
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  // ─── Platform Analytics ───────────────────────────────────────────────────
  async getAllCompanies() {
    return db.select().from(companies).orderBy(desc(companies.createdAt));
  }
  async getAllUsers() {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  // ─── Analytics Studio ─────────────────────────────────────────────────────
  async getAnalyticsDashboards(companyId: number): Promise<AnalyticsDashboard[]> {
    return db.select().from(analyticsDashboards)
      .where(eq(analyticsDashboards.companyId, companyId))
      .orderBy(desc(analyticsDashboards.updatedAt));
  }
  async getAnalyticsDashboard(id: number): Promise<AnalyticsDashboard | undefined> {
    const [row] = await db.select().from(analyticsDashboards).where(eq(analyticsDashboards.id, id));
    return row;
  }
  async createAnalyticsDashboard(data: InsertAnalyticsDashboard): Promise<AnalyticsDashboard> {
    const [row] = await db.insert(analyticsDashboards).values(data).returning();
    return row;
  }
  async updateAnalyticsDashboard(id: number, data: Partial<InsertAnalyticsDashboard>): Promise<AnalyticsDashboard> {
    const [row] = await db.update(analyticsDashboards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(analyticsDashboards.id, id))
      .returning();
    return row;
  }
  async deleteAnalyticsDashboard(id: number): Promise<void> {
    await db.delete(analyticsDashboardChat).where(eq(analyticsDashboardChat.dashboardId, id));
    await db.delete(analyticsDashboardNarratives).where(eq(analyticsDashboardNarratives.dashboardId, id));
    await db.delete(analyticsDashboardWidgets).where(eq(analyticsDashboardWidgets.dashboardId, id));
    await db.delete(analyticsDashboardUploads).where(eq(analyticsDashboardUploads.dashboardId, id));
    await db.delete(analyticsDashboards).where(eq(analyticsDashboards.id, id));
  }

  async getAnalyticsDashboardUploads(dashboardId: number): Promise<AnalyticsDashboardUpload[]> {
    return db.select().from(analyticsDashboardUploads)
      .where(eq(analyticsDashboardUploads.dashboardId, dashboardId))
      .orderBy(desc(analyticsDashboardUploads.uploadedAt));
  }
  async createAnalyticsDashboardUpload(data: InsertAnalyticsDashboardUpload): Promise<AnalyticsDashboardUpload> {
    const [row] = await db.insert(analyticsDashboardUploads).values(data).returning();
    return row;
  }

  async getAnalyticsDashboardWidgets(dashboardId: number): Promise<AnalyticsDashboardWidget[]> {
    return db.select().from(analyticsDashboardWidgets)
      .where(eq(analyticsDashboardWidgets.dashboardId, dashboardId))
      .orderBy(analyticsDashboardWidgets.position);
  }
  async upsertAnalyticsDashboardWidgets(dashboardId: number, widgets: Omit<InsertAnalyticsDashboardWidget, 'dashboardId'>[]): Promise<AnalyticsDashboardWidget[]> {
    await db.delete(analyticsDashboardWidgets).where(eq(analyticsDashboardWidgets.dashboardId, dashboardId));
    if (!widgets.length) return [];
    const rows = await db.insert(analyticsDashboardWidgets)
      .values(widgets.map(w => ({ ...w, dashboardId })))
      .returning();
    return rows;
  }

  async getAnalyticsDashboardNarrative(dashboardId: number): Promise<AnalyticsDashboardNarrative | undefined> {
    const [row] = await db.select().from(analyticsDashboardNarratives)
      .where(eq(analyticsDashboardNarratives.dashboardId, dashboardId))
      .orderBy(desc(analyticsDashboardNarratives.generatedAt))
      .limit(1);
    return row;
  }
  async upsertAnalyticsDashboardNarrative(data: InsertAnalyticsDashboardNarrative): Promise<AnalyticsDashboardNarrative> {
    await db.delete(analyticsDashboardNarratives).where(eq(analyticsDashboardNarratives.dashboardId, data.dashboardId));
    const [row] = await db.insert(analyticsDashboardNarratives).values(data).returning();
    return row;
  }

  async getAnalyticsDashboardChat(dashboardId: number): Promise<AnalyticsDashboardChat[]> {
    return db.select().from(analyticsDashboardChat)
      .where(eq(analyticsDashboardChat.dashboardId, dashboardId))
      .orderBy(analyticsDashboardChat.createdAt);
  }
  async addAnalyticsDashboardChat(data: InsertAnalyticsDashboardChat): Promise<AnalyticsDashboardChat> {
    const [row] = await db.insert(analyticsDashboardChat).values(data).returning();
    return row;
  }
}

export const storage = new DatabaseStorage();
