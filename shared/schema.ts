import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  companyId: integer("company_id"),
  role: text("role").notNull().default("admin"),
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
  meetingType: text("meeting_type"),
  title: text("title").notNull(),
  description: text("description"),
  ownerName: text("owner_name"),
  dueDate: text("due_date"),
  revisedDueDate: text("revised_due_date"),
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

export const meetingTypes = pgTable("meeting_types", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
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

// ─── Execution Management ────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  description: text("description"),
  owner: text("owner"),
  departmentId: integer("department_id").references(() => departments.id),
  businessUnit: text("business_unit"),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  status: text("status").notNull().default("Not Started"),
  priority: text("priority").notNull().default("Medium"),
  progress: integer("progress").default(0),
  tags: text("tags"),
  linkedKpiId: integer("linked_kpi_id").references(() => kpis.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  projectId: integer("project_id").references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  assignee: text("assignee"),
  status: text("status").notNull().default("Not Started"),
  priority: text("priority").notNull().default("Medium"),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  progress: integer("progress").default(0),
  tags: text("tags"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const subtasks = pgTable("subtasks", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  title: text("title").notNull(),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  title: text("title").notNull(),
  dueDate: text("due_date"),
  status: text("status").notNull().default("Upcoming"),
  progress: integer("progress").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const assistantLogs = pgTable("assistant_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  userId: integer("user_id").notNull(),
  userName: text("user_name").notNull(),
  actionType: text("action_type").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const projectComments = pgTable("project_comments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Insert Schemas ──────────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true });
export const insertBusinessGoalSchema = createInsertSchema(businessGoals).omit({ id: true, createdAt: true });
export const insertKpiSchema = createInsertSchema(kpis).omit({ id: true, createdAt: true });
export const insertKpiActualSchema = createInsertSchema(kpiActuals).omit({ id: true, createdAt: true });
export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true, createdAt: true });
export const insertActionItemSchema = createInsertSchema(actionItems).omit({ id: true, createdAt: true });
export const insertMonthlyReviewSchema = createInsertSchema(monthlyReviews).omit({ id: true, createdAt: true });
export const insertMeetingTypeSchema = createInsertSchema(meetingTypes).omit({ id: true, createdAt: true });
export const insertDashboardPlanSchema = createInsertSchema(dashboardPlans).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true });
export const insertSubtaskSchema = createInsertSchema(subtasks).omit({ id: true, createdAt: true });
export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true, createdAt: true });
export const insertProjectCommentSchema = createInsertSchema(projectComments).omit({ id: true, createdAt: true });
export const insertAssistantLogSchema = createInsertSchema(assistantLogs).omit({ id: true, createdAt: true });

// ─── Types ───────────────────────────────────────────────────────────────────

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
export type MeetingType = typeof meetingTypes.$inferSelect;
export type InsertMeetingType = z.infer<typeof insertMeetingTypeSchema>;
export type DashboardPlan = typeof dashboardPlans.$inferSelect;
export type InsertDashboardPlan = z.infer<typeof insertDashboardPlanSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Subtask = typeof subtasks.$inferSelect;
export type InsertSubtask = z.infer<typeof insertSubtaskSchema>;
export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type ProjectComment = typeof projectComments.$inferSelect;
export type InsertProjectComment = z.infer<typeof insertProjectCommentSchema>;
export type AssistantLog = typeof assistantLogs.$inferSelect;
export type InsertAssistantLog = z.infer<typeof insertAssistantLogSchema>;
