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

export const actionItems = pgTable("action_items", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  departmentId: integer("department_id").references(() => departments.id),
  meetingType: text("meeting_type"),
  title: text("title").notNull(),
  description: text("description"),
  ownerName: text("owner_name"),
  dueDate: text("due_date"),
  revisedDueDate: text("revised_due_date"),
  priority: text("priority").default("Medium"),
  status: text("status").default("Not Started"),
  completion: integer("completion").default(0),
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

// ─── Execution Management ────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  description: text("description"),
  owner: text("owner"),
  departmentId: integer("department_id").references(() => departments.id),
  businessUnit: text("business_unit"),
  strategicGoal: text("strategic_goal"),
  linkedKpiId: integer("linked_kpi_id").references(() => kpis.id),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  status: text("status").notNull().default("Not Started"),
  priority: text("priority").notNull().default("Medium"),
  progress: integer("progress").default(0),
  healthScore: text("health_score"),
  riskNotes: text("risk_notes"),
  tags: text("tags"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  projectId: integer("project_id").references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  owner: text("owner"),
  assignee: text("assignee"),
  status: text("status").notNull().default("Not Started"),
  priority: text("priority").notNull().default("Medium"),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  progress: integer("progress").default(0),
  checklistItems: text("checklist_items"),
  tags: text("tags"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const subtasks = pgTable("subtasks", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasks.id),
  title: text("title").notNull(),
  owner: text("owner"),
  dueDate: text("due_date"),
  status: text("status").notNull().default("Not Started"),
  completed: boolean("completed").default(false),
  progress: integer("progress").default(0),
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

// ─── Platform Owner System ───────────────────────────────────────────────────

export const platformOwners = pgTable("platform_owners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id).unique(),
  planName: text("plan_name").notNull().default("Trial"),
  status: text("status").notNull().default("Trial Active"),
  maxUsers: integer("max_users").default(5).notNull(),
  dailyAiLimit: integer("daily_ai_limit").default(15).notNull(),
  trialStartDate: timestamp("trial_start_date").default(sql`CURRENT_TIMESTAMP`),
  trialEndDate: timestamp("trial_end_date"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  activatedBy: integer("activated_by").references(() => platformOwners.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const activationKeys = pgTable("activation_keys", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  keyValue: text("key_value").notNull().unique(),
  planName: text("plan_name").notNull().default("Starter"),
  status: text("status").notNull().default("Pending"),
  maxUsers: integer("max_users").default(20).notNull(),
  dailyAiLimit: integer("daily_ai_limit").default(20).notNull(),
  issuedBy: integer("issued_by").references(() => platformOwners.id),
  issuedAt: timestamp("issued_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: timestamp("expires_at"),
  activatedAt: timestamp("activated_at"),
  revokedAt: timestamp("revoked_at"),
});

export const userActivityLogs = pgTable("user_activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  companyId: integer("company_id").references(() => companies.id),
  activityType: text("activity_type").notNull(),
  moduleName: text("module_name"),
  details: text("details"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const ownerAuditLogs = pgTable("owner_audit_logs", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").references(() => platformOwners.id),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: integer("target_id"),
  details: text("details"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Department Access Control ───────────────────────────────────────────────

export const userDepartmentAccess = pgTable("user_department_access", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  departmentId: integer("department_id").notNull().references(() => departments.id),
  accessLevel: text("access_level").notNull().default("view"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Team Members ────────────────────────────────────────────────────────────

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  email: text("email"),
  department: text("department"),
  jobTitle: text("job_title"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Insert Schemas ──────────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true });
export const insertBusinessGoalSchema = createInsertSchema(businessGoals).omit({ id: true, createdAt: true });
export const insertKpiSchema = createInsertSchema(kpis).omit({ id: true, createdAt: true });
export const insertKpiActualSchema = createInsertSchema(kpiActuals).omit({ id: true, createdAt: true });
export const insertActionItemSchema = createInsertSchema(actionItems).omit({ id: true, createdAt: true });
export const insertMonthlyReviewSchema = createInsertSchema(monthlyReviews).omit({ id: true, createdAt: true });
export const insertDashboardPlanSchema = createInsertSchema(dashboardPlans).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true });
export const insertSubtaskSchema = createInsertSchema(subtasks).omit({ id: true, createdAt: true });
export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true, createdAt: true });
export const insertProjectCommentSchema = createInsertSchema(projectComments).omit({ id: true, createdAt: true });
export const insertAssistantLogSchema = createInsertSchema(assistantLogs).omit({ id: true, createdAt: true });
export const insertPlatformOwnerSchema = createInsertSchema(platformOwners).omit({ id: true, createdAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivationKeySchema = createInsertSchema(activationKeys).omit({ id: true, issuedAt: true });
export const insertUserActivityLogSchema = createInsertSchema(userActivityLogs).omit({ id: true, createdAt: true });
export const insertOwnerAuditLogSchema = createInsertSchema(ownerAuditLogs).omit({ id: true, createdAt: true });
export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({ id: true, createdAt: true });
export const insertUserDepartmentAccessSchema = createInsertSchema(userDepartmentAccess).omit({ id: true, createdAt: true });

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
export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = z.infer<typeof insertActionItemSchema>;
export type MonthlyReview = typeof monthlyReviews.$inferSelect;
export type InsertMonthlyReview = z.infer<typeof insertMonthlyReviewSchema>;
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
export type PlatformOwner = typeof platformOwners.$inferSelect;
export type InsertPlatformOwner = z.infer<typeof insertPlatformOwnerSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type ActivationKey = typeof activationKeys.$inferSelect;
export type InsertActivationKey = z.infer<typeof insertActivationKeySchema>;
export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
export type OwnerAuditLog = typeof ownerAuditLogs.$inferSelect;
export type InsertOwnerAuditLog = z.infer<typeof insertOwnerAuditLogSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type UserDepartmentAccess = typeof userDepartmentAccess.$inferSelect;
export type InsertUserDepartmentAccess = z.infer<typeof insertUserDepartmentAccessSchema>;
