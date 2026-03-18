import { db } from "./db";
import { eq, desc, and, ilike, or, inArray } from "drizzle-orm";
import {
  users, companies, departments, businessGoals, kpis, kpiActuals,
  meetings, actionItems, monthlyReviews, meetingTypes, dashboardPlans,
  projects, tasks, subtasks, milestones, projectComments, assistantLogs,
  type InsertUser, type User, type InsertCompany, type Company,
  type InsertDepartment, type Department, type InsertBusinessGoal, type BusinessGoal,
  type InsertKpi, type Kpi, type InsertKpiActual, type KpiActual,
  type InsertMeeting, type Meeting, type InsertActionItem, type ActionItem,
  type InsertMonthlyReview, type MonthlyReview, type InsertMeetingType, type MeetingType,
  type InsertDashboardPlan, type DashboardPlan,
  type InsertProject, type Project, type InsertTask, type Task,
  type InsertSubtask, type Subtask, type InsertMilestone, type Milestone,
  type InsertProjectComment, type ProjectComment,
  type InsertAssistantLog, type AssistantLog,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByCompany(companyId: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

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

  getMeetings(companyId: number): Promise<Meeting[]>;
  getMeeting(id: number): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, data: Partial<InsertMeeting>): Promise<Meeting>;
  deleteMeeting(id: number): Promise<void>;

  getActionItems(companyId: number): Promise<ActionItem[]>;
  getActionItem(id: number): Promise<ActionItem | undefined>;
  createActionItem(item: InsertActionItem): Promise<ActionItem>;
  updateActionItem(id: number, data: Partial<InsertActionItem>): Promise<ActionItem>;
  deleteActionItem(id: number): Promise<void>;

  getMonthlyReviews(companyId: number): Promise<MonthlyReview[]>;
  getMonthlyReview(id: number): Promise<MonthlyReview | undefined>;
  createMonthlyReview(review: InsertMonthlyReview): Promise<MonthlyReview>;

  getMeetingTypes(companyId: number): Promise<MeetingType[]>;
  createMeetingType(mt: InsertMeetingType): Promise<MeetingType>;
  deleteMeetingType(id: number): Promise<void>;

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
    meetings: Meeting[];
    actionItems: ActionItem[];
  }>;

  // Assistant logs
  createAssistantLog(log: InsertAssistantLog): Promise<AssistantLog>;
  getAssistantLogs(companyId: number, limit?: number): Promise<AssistantLog[]>;
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

  async getMeetings(companyId: number) {
    return db.select().from(meetings).where(eq(meetings.companyId, companyId)).orderBy(desc(meetings.createdAt));
  }
  async getMeeting(id: number) {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting;
  }
  async createMeeting(meeting: InsertMeeting) {
    const [created] = await db.insert(meetings).values(meeting).returning();
    return created;
  }
  async updateMeeting(id: number, data: Partial<InsertMeeting>) {
    const [updated] = await db.update(meetings).set(data).where(eq(meetings.id, id)).returning();
    return updated;
  }
  async deleteMeeting(id: number) {
    await db.delete(actionItems).where(eq(actionItems.meetingId, id));
    await db.delete(meetings).where(eq(meetings.id, id));
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

  async getMeetingTypes(companyId: number) {
    return db.select().from(meetingTypes).where(eq(meetingTypes.companyId, companyId));
  }
  async createMeetingType(mt: InsertMeetingType) {
    const [created] = await db.insert(meetingTypes).values(mt).returning();
    return created;
  }
  async deleteMeetingType(id: number) {
    await db.delete(meetingTypes).where(eq(meetingTypes.id, id));
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
    const [searchProjects, searchTasks, searchKpis, searchMeetings, searchActions] = await Promise.all([
      db.select().from(projects).where(and(eq(projects.companyId, companyId), or(ilike(projects.name, term), ilike(projects.description, term)))).limit(10),
      db.select().from(tasks).where(and(eq(tasks.companyId, companyId), or(ilike(tasks.title, term), ilike(tasks.description, term)))).limit(10),
      db.select().from(kpis).where(and(eq(kpis.companyId, companyId), or(ilike(kpis.kpiName, term), ilike(kpis.description, term)))).limit(10),
      db.select().from(meetings).where(and(eq(meetings.companyId, companyId), or(ilike(meetings.title, term), ilike(meetings.summary, term)))).limit(10),
      db.select().from(actionItems).where(and(eq(actionItems.companyId, companyId), or(ilike(actionItems.title, term), ilike(actionItems.description, term)))).limit(10),
    ]);
    return { projects: searchProjects, tasks: searchTasks, kpis: searchKpis, meetings: searchMeetings, actionItems: searchActions };
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
}

export const storage = new DatabaseStorage();
