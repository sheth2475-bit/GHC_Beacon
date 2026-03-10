import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import {
  users, companies, departments, businessGoals, kpis, kpiActuals,
  meetings, actionItems, monthlyReviews, meetingTypes, dashboardPlans,
  type InsertUser, type User, type InsertCompany, type Company,
  type InsertDepartment, type Department, type InsertBusinessGoal, type BusinessGoal,
  type InsertKpi, type Kpi, type InsertKpiActual, type KpiActual,
  type InsertMeeting, type Meeting, type InsertActionItem, type ActionItem,
  type InsertMonthlyReview, type MonthlyReview, type InsertMeetingType, type MeetingType,
  type InsertDashboardPlan, type DashboardPlan,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
  async createUser(user: InsertUser) {
    const [created] = await db.insert(users).values(user).returning();
    return created;
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
  async getKpiActualsByMonth(companyId: number, month: string) {
    const companyKpis = await this.getKpis(companyId);
    const results: (KpiActual & { kpi: Kpi })[] = [];
    for (const kpi of companyKpis) {
      const [actual] = await db.select().from(kpiActuals)
        .where(and(eq(kpiActuals.kpiId, kpi.id), eq(kpiActuals.reviewMonth, month)));
      if (actual) {
        results.push({ ...actual, kpi });
      }
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
}

export const storage = new DatabaseStorage();
