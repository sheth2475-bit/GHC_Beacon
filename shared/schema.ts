import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  companyName: text("company_name").notNull(),
  industry: text("industry").notNull(),
  companySize: text("company_size").notNull(),
  country: text("country").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const businessGoals = pgTable("business_goals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  goalText: text("goal_text").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const kpis = pgTable("kpis", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  departmentId: integer("department_id").references(() => departments.id),
  kpiName: text("kpi_name").notNull(),
  description: text("description"),
  formula: text("formula"),
  unit: text("unit"),
  frequency: text("frequency"),
  targetValue: text("target_value"),
  greenThreshold: text("green_threshold"),
  amberThreshold: text("amber_threshold"),
  redThreshold: text("red_threshold"),
  ownerName: text("owner_name"),
  dataSource: text("data_source"),
  createdByAi: boolean("created_by_ai").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const kpiActuals = pgTable("kpi_actuals", {
  id: serial("id").primaryKey(),
  kpiId: integer("kpi_id").notNull().references(() => kpis.id),
  reviewMonth: text("review_month").notNull(),
  actualValue: text("actual_value"),
  commentary: text("commentary"),
  status: text("status"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  title: text("title").notNull(),
  meetingDate: text("meeting_date").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  summary: text("summary"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const actionItems = pgTable("action_items", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  meetingId: integer("meeting_id").references(() => meetings.id),
  departmentId: integer("department_id").references(() => departments.id),
  title: text("title").notNull(),
  description: text("description"),
  ownerName: text("owner_name"),
  dueDate: text("due_date"),
  priority: text("priority").default("Medium"),
  status: text("status").default("Not Started"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const monthlyReviews = pgTable("monthly_reviews", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  reviewMonth: text("review_month").notNull(),
  overallSummary: text("overall_summary"),
  strengths: text("strengths"),
  gaps: text("gaps"),
  recommendations: text("recommendations"),
  aiGeneratedText: text("ai_generated_text"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const dashboardPlans = pgTable("dashboard_plans", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  departmentId: integer("department_id").references(() => departments.id),
  title: text("title").notNull(),
  structureJson: text("structure_json"),
  aiGeneratedText: text("ai_generated_text"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true });
export const insertBusinessGoalSchema = createInsertSchema(businessGoals).omit({ id: true, createdAt: true });
export const insertKpiSchema = createInsertSchema(kpis).omit({ id: true, createdAt: true });
export const insertKpiActualSchema = createInsertSchema(kpiActuals).omit({ id: true, createdAt: true });
export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true, createdAt: true });
export const insertActionItemSchema = createInsertSchema(actionItems).omit({ id: true, createdAt: true });
export const insertMonthlyReviewSchema = createInsertSchema(monthlyReviews).omit({ id: true, createdAt: true });
export const insertDashboardPlanSchema = createInsertSchema(dashboardPlans).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type BusinessGoal = typeof businessGoals.$inferSelect;
export type InsertBusinessGoal = z.infer<typeof insertBusinessGoalSchema>;
export type Kpi = typeof kpis.$inferSelect;
export type InsertKpi = z.infer<typeof insertKpiSchema>;
export type KpiActual = typeof kpiActuals.$inferSelect;
export type InsertKpiActual = z.infer<typeof insertKpiActualSchema>;
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = z.infer<typeof insertActionItemSchema>;
export type MonthlyReview = typeof monthlyReviews.$inferSelect;
export type InsertMonthlyReview = z.infer<typeof insertMonthlyReviewSchema>;
export type DashboardPlan = typeof dashboardPlans.$inferSelect;
export type InsertDashboardPlan = z.infer<typeof insertDashboardPlanSchema>;
