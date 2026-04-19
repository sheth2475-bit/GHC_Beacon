import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean, real, jsonb } from "drizzle-orm/pg-core";
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
  departmentText: text("department_text"),
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

// ─── Login Logs ──────────────────────────────────────────────────────────────

export const loginLogs = pgTable("login_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  companyId: integer("company_id").references(() => companies.id),
  email: text("email").notNull(),
  userName: text("user_name"),
  userRole: text("user_role"),
  planName: text("plan_name"),
  status: text("status").notNull().default("success"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  browser: text("browser"),
  os: text("os"),
  deviceType: text("device_type"),
  loginAt: timestamp("login_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
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

// ─── Documents ───────────────────────────────────────────────────────────────

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  originalName: text("original_name").notNull(),
  storageName: text("storage_name").notNull(),
  mimeType: text("mime_type"),
  size: integer("size"),
  uploadedBy: text("uploaded_by"),
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
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export const insertLoginLogSchema = createInsertSchema(loginLogs).omit({ id: true, loginAt: true });

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
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type LoginLog = typeof loginLogs.$inferSelect;
export type InsertLoginLog = z.infer<typeof insertLoginLogSchema>;

// ─── Workflow Center ──────────────────────────────────────────────────────────

export const workflowTemplates = pgTable("workflow_templates", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  workflowType: text("workflow_type").notNull(), // recurring_task | service_ticket | license | certificate | custom
  category: text("category"),
  fields: jsonb("fields").default(sql`'[]'::jsonb`), // custom field definitions
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const workflowSubmissions = pgTable("workflow_submissions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  templateId: integer("template_id").references(() => workflowTemplates.id),
  workflowType: text("workflow_type").notNull(), // recurring_task | service_ticket | license | certificate
  referenceNumber: text("reference_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  departmentId: integer("department_id").references(() => departments.id),
  departmentName: text("department_name"),
  ownerName: text("owner_name"),
  ownerEmail: text("owner_email"),
  assignedTo: text("assigned_to"),
  assignedToEmail: text("assigned_to_email"),
  requesterName: text("requester_name"),
  requesterEmail: text("requester_email"),
  priority: text("priority").default("Medium"), // Low | Medium | High | Critical
  status: text("status").notNull().default("New"),
  category: text("category"),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  expiryDate: text("expiry_date"),
  renewalDate: text("renewal_date"),
  nextOccurrence: text("next_occurrence"),
  recurrenceType: text("recurrence_type"), // daily | weekly | monthly | quarterly | yearly
  reminderDays: integer("reminder_days").default(7),
  vendorName: text("vendor_name"),
  issueAuthority: text("issue_authority"),
  licenseType: text("license_type"),
  holderName: text("holder_name"),
  holderEmail: text("holder_email"),
  slaTarget: text("sla_target"),
  serviceDeskId: integer("service_desk_id"),
  groupId: integer("group_id"),
  customFields: jsonb("custom_fields").default(sql`'{}'::jsonb`),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const workflowComments = pgTable("workflow_comments", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => workflowSubmissions.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  userId: integer("user_id").notNull().references(() => users.id),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const workflowActivity = pgTable("workflow_activity", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => workflowSubmissions.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  userId: integer("user_id").references(() => users.id),
  actorName: text("actor_name").notNull(),
  action: text("action").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  field: text("field"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Workflow Groups (unified grouping for all 4 workflow types) ──────────────
export const workflowGroups = pgTable("workflow_groups", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  workflowType: text("workflow_type").notNull(), // recurring_task | service_ticket | license | certificate
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Service Desks (kept for backward compatibility, superseded by workflowGroups) ──
export const serviceDesks = pgTable("service_desks", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").default("ticket"),
  color: text("color").default("violet"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertWorkflowTemplateSchema = createInsertSchema(workflowTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkflowSubmissionSchema = createInsertSchema(workflowSubmissions).omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });
export const insertWorkflowCommentSchema = createInsertSchema(workflowComments).omit({ id: true, createdAt: true });
export const insertWorkflowActivitySchema = createInsertSchema(workflowActivity).omit({ id: true, createdAt: true });
export const insertServiceDeskSchema = createInsertSchema(serviceDesks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWorkflowGroupSchema = createInsertSchema(workflowGroups).omit({ id: true, createdAt: true, updatedAt: true });

export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type InsertWorkflowTemplate = z.infer<typeof insertWorkflowTemplateSchema>;
export type WorkflowSubmission = typeof workflowSubmissions.$inferSelect;
export type InsertWorkflowSubmission = z.infer<typeof insertWorkflowSubmissionSchema>;
export type WorkflowComment = typeof workflowComments.$inferSelect;
export type InsertWorkflowComment = z.infer<typeof insertWorkflowCommentSchema>;
export type WorkflowActivity = typeof workflowActivity.$inferSelect;
export type InsertWorkflowActivity = z.infer<typeof insertWorkflowActivitySchema>;
export type ServiceDesk = typeof serviceDesks.$inferSelect;
export type InsertServiceDesk = z.infer<typeof insertServiceDeskSchema>;
export type WorkflowGroup = typeof workflowGroups.$inferSelect;
export type InsertWorkflowGroup = z.infer<typeof insertWorkflowGroupSchema>;

// ─── Analytics Studio ─────────────────────────────────────────────────────────

export const analyticsDashboards = pgTable("analytics_dashboards", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  audience: text("audience"),
  businessArea: text("business_area"),
  naturalLanguagePrompt: text("natural_language_prompt"),
  config: jsonb("config"),
  templateConfig: jsonb("template_config"),
  status: text("status").notNull().default("draft"),
  visibility: text("visibility").notNull().default("private"),
  departmentId: integer("department_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const analyticsDashboardUploads = pgTable("analytics_dashboard_uploads", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboard_id").notNull().references(() => analyticsDashboards.id),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  rowCount: integer("row_count").notNull().default(0),
  data: jsonb("data"),
  validationStatus: text("validation_status").default("pending"),
  validationErrors: jsonb("validation_errors"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const analyticsDashboardWidgets = pgTable("analytics_dashboard_widgets", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboard_id").notNull().references(() => analyticsDashboards.id),
  widgetType: text("widget_type").notNull(),
  title: text("title").notNull(),
  config: jsonb("config"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const analyticsDashboardNarratives = pgTable("analytics_dashboard_narratives", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboard_id").notNull().references(() => analyticsDashboards.id),
  uploadId: integer("upload_id"),
  executiveSummary: text("executive_summary"),
  insights: text("insights"),
  highlights: text("highlights"),
  risks: text("risks"),
  trends: text("trends"),
  suggestedActions: text("suggested_actions"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

export const analyticsDashboardChat = pgTable("analytics_dashboard_chat", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboard_id").notNull().references(() => analyticsDashboards.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAnalyticsDashboardSchema = createInsertSchema(analyticsDashboards).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAnalyticsDashboardUploadSchema = createInsertSchema(analyticsDashboardUploads).omit({ id: true, uploadedAt: true });
export const insertAnalyticsDashboardWidgetSchema = createInsertSchema(analyticsDashboardWidgets).omit({ id: true, createdAt: true });
export const insertAnalyticsDashboardNarrativeSchema = createInsertSchema(analyticsDashboardNarratives).omit({ id: true, generatedAt: true });
export const insertAnalyticsDashboardChatSchema = createInsertSchema(analyticsDashboardChat).omit({ id: true, createdAt: true });

export type AnalyticsDashboard = typeof analyticsDashboards.$inferSelect;
export type InsertAnalyticsDashboard = z.infer<typeof insertAnalyticsDashboardSchema>;
export type AnalyticsDashboardUpload = typeof analyticsDashboardUploads.$inferSelect;
export type InsertAnalyticsDashboardUpload = z.infer<typeof insertAnalyticsDashboardUploadSchema>;
export type AnalyticsDashboardWidget = typeof analyticsDashboardWidgets.$inferSelect;
export type InsertAnalyticsDashboardWidget = z.infer<typeof insertAnalyticsDashboardWidgetSchema>;
export type AnalyticsDashboardNarrative = typeof analyticsDashboardNarratives.$inferSelect;
export type InsertAnalyticsDashboardNarrative = z.infer<typeof insertAnalyticsDashboardNarrativeSchema>;
export type AnalyticsDashboardChat = typeof analyticsDashboardChat.$inferSelect;
export type InsertAnalyticsDashboardChat = z.infer<typeof insertAnalyticsDashboardChatSchema>;

// ─── Analytics Studio V2 — Data-first workflow ───────────────────────────────

export const analyticsDatasets = pgTable("analytics_datasets_v2", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  fileName: text("file_name"),
  sheetNames: text("sheet_names").array().default(sql`ARRAY[]::text[]`),
  rowCount: integer("row_count").default(0),
  rawData: jsonb("raw_data"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const analyticsDatasetColumns = pgTable("analytics_dataset_columns_v2", {
  id: serial("id").primaryKey(),
  datasetId: integer("dataset_id").notNull().references(() => analyticsDatasets.id),
  columnName: text("column_name").notNull(),
  label: text("label").notNull(),
  columnType: text("column_type").notNull().default("dimension"),
  aggregation: text("aggregation").default("sum"),
  format: text("format").default("number"),
  dateFormat: text("date_format"),
  dateGrains: text("date_grains").array().default(sql`ARRAY[]::text[]`),
  isFormula: boolean("is_formula").default(false),
  formulaExpression: text("formula_expression"),
  position: integer("position").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const analyticsInsights = pgTable("analytics_insights", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  datasetId: integer("dataset_id").notNull().references(() => analyticsDatasets.id),
  title: text("title").notNull(),
  question: text("question").notNull(),
  interpretation: text("interpretation"),
  chartType: text("chart_type").notNull().default("bar"),
  chartConfig: jsonb("chart_config"),
  narrative: text("narrative"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const analyticsAutoInsights = pgTable("analytics_auto_insights", {
  id: serial("id").primaryKey(),
  datasetId: integer("dataset_id").notNull().references(() => analyticsDatasets.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  insightType: text("insight_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  chartType: text("chart_type"),
  chartConfig: jsonb("chart_config"),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const analyticsDashboardDefinitions = pgTable("analytics_dashboard_definitions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  visibility: text("visibility").notNull().default("private"),
  narrativeSummary: text("narrative_summary"),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  shareToken: text("share_token"),
  shareEnabled: boolean("share_enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const analyticsDashboardItems = pgTable("analytics_dashboard_items", {
  id: serial("id").primaryKey(),
  dashboardId: integer("dashboard_id").notNull().references(() => analyticsDashboardDefinitions.id),
  insightId: integer("insight_id").notNull().references(() => analyticsInsights.id),
  position: integer("position").notNull().default(0),
  titleOverride: text("title_override"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAnalyticsDatasetSchema = createInsertSchema(analyticsDatasets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAnalyticsDatasetColumnSchema = createInsertSchema(analyticsDatasetColumns).omit({ id: true, createdAt: true });
export const insertAnalyticsInsightSchema = createInsertSchema(analyticsInsights).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAnalyticsAutoInsightSchema = createInsertSchema(analyticsAutoInsights).omit({ id: true, createdAt: true });
export const insertAnalyticsDashboardDefinitionSchema = createInsertSchema(analyticsDashboardDefinitions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAnalyticsDashboardItemSchema = createInsertSchema(analyticsDashboardItems).omit({ id: true, createdAt: true });

export type AnalyticsDataset = typeof analyticsDatasets.$inferSelect;
export type InsertAnalyticsDataset = z.infer<typeof insertAnalyticsDatasetSchema>;
export type AnalyticsDatasetColumn = typeof analyticsDatasetColumns.$inferSelect;
export type InsertAnalyticsDatasetColumn = z.infer<typeof insertAnalyticsDatasetColumnSchema>;
export type AnalyticsInsight = typeof analyticsInsights.$inferSelect;
export type InsertAnalyticsInsight = z.infer<typeof insertAnalyticsInsightSchema>;
export type AnalyticsAutoInsight = typeof analyticsAutoInsights.$inferSelect;
export type InsertAnalyticsAutoInsight = z.infer<typeof insertAnalyticsAutoInsightSchema>;
export type AnalyticsDashboardDefinition = typeof analyticsDashboardDefinitions.$inferSelect;
export type InsertAnalyticsDashboardDefinition = z.infer<typeof insertAnalyticsDashboardDefinitionSchema>;
export type AnalyticsDashboardItem = typeof analyticsDashboardItems.$inferSelect;
export type InsertAnalyticsDashboardItem = z.infer<typeof insertAnalyticsDashboardItemSchema>;

// ── Presentation Studio ───────────────────────────────────────────────────────
export const presentations = pgTable("presentations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdBy: integer("created_by").notNull().references(() => users.id),
  title: text("title").notNull().default("Untitled Presentation"),
  status: text("status").notNull().default("draft"), // draft | published | archived
  sourceTypes: jsonb("source_types").default([]),     // ["prompt","upload","kpis","projects",...]
  brief: jsonb("brief").default({}),                  // {audience,objective,tone,deckType,targetSlides,designStyle,instructions}
  outline: jsonb("outline").default([]),              // [{id,type,title,description}]
  slides: jsonb("slides").default([]),                // [{id,type,title,subtitle,bullets,notes,theme,...}]
  theme: text("theme").default("executive-dark"),
  version: integer("version").default(1),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const presentationVersions = pgTable("presentation_versions", {
  id: serial("id").primaryKey(),
  presentationId: integer("presentation_id").notNull().references(() => presentations.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  outline: jsonb("outline").default([]),
  slides: jsonb("slides").default([]),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertPresentationSchema = createInsertSchema(presentations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPresentationVersionSchema = createInsertSchema(presentationVersions).omit({ id: true, createdAt: true });

export type Presentation = typeof presentations.$inferSelect;
export type InsertPresentation = z.infer<typeof insertPresentationSchema>;
export type PresentationVersion = typeof presentationVersions.$inferSelect;
export type InsertPresentationVersion = z.infer<typeof insertPresentationVersionSchema>;

// ── Balanced Scorecard ────────────────────────────────────────────────────────
export const scorecardShares = pgTable("scorecard_shares", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  deptId: text("dept_id").notNull(),
  shareToken: text("share_token").unique().notNull(),
  shareEnabled: boolean("share_enabled").default(false).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  kpiDefinitions: jsonb("kpi_definitions"),
});
export type ScorecardShare = typeof scorecardShares.$inferSelect;

export const bscDepartments = pgTable("bsc_departments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  deptId: text("dept_id").notNull(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const bscActuals = pgTable("bsc_actuals", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  deptId: text("dept_id").notNull(),
  periodKey: text("period_key").notNull(),
  kpiId: text("kpi_id").notNull(),
  actualValue: real("actual_value").notNull(),
});

export type BscDepartment = typeof bscDepartments.$inferSelect;
export type BscActual = typeof bscActuals.$inferSelect;

