# Performo AI

AI-powered SME performance and execution management platform.

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (gpt-4o)
- **Auth**: Session-based with passport-local (email/password)

## Multi-User RBAC

- **Company-level**: Multiple users share a single company workspace
- **Admin role**: Full access — manage KPIs, meetings, actions, settings, and users
- **Executive role**: Read-only access — view dashboards, KPIs, actions, and monthly reviews
- `users.role` (text: "admin" | "executive"), `users.companyId` (integer FK to companies)
- `requireAdmin` middleware protects all write/mutate routes
- Admin creates users directly from User Management page with email + password + role
- First registrant of a company is always an admin

## Key Features

### Performo Assistant (AI Chat)
- Slide-in drawer from the right, opened via "Assistant" button in the header
- **Read queries**: KPI status, overdue actions, at-risk projects, monthly review summaries, milestone status
- **Write operations**: Create projects/tasks/action items, update progress/status/owner/due dates, update KPI actuals, close tasks/actions
- **Confirmation flow**: All write actions show a confirmation card before executing — never updates without user approval
- **Guided flow**: Asks follow-up questions for missing fields (owner, due date, priority, etc.)
- **Audit log**: All write operations logged to `assistant_logs` table (user, timestamp, action, entity, summary)
- **Suggested prompts**: 6 pre-built prompts shown when conversation is empty
- **Permissions**: Admin users get full read/write; Executive users get read-only mode
- Conversation history maintained within a session; reset button starts new conversation
- API: POST /api/assistant/chat — takes messages array + optional confirmedAction
- Backend: `server/assistant.ts` — builds full company context, calls GPT-4o, returns structured JSON response

### Performance Management
1. **Dashboard** - Welcome banner, **"Today's Focus" panel** (overdue actions + at-risk KPIs + milestones this week), 6 KPI/action stat cards, KPI health donut, action bar chart, execution section (active projects, at-risk, overdue tasks, milestones), dept summary, latest review
2. **KPI Builder** (admin only) - Manual KPI form + AI-generated KPIs
3. **KPI Management** - Table with search, dept/frequency filters (Weekly/Monthly/Quarterly/One Time), **sparkline trend charts** (3-month AreaChart per KPI), **quick-entry popover** (⚡ icon per row for instant actual logging), **full edit dialog** (pencil icon — edits all KPI fields including owner from team members dropdown), add actuals dialog, Excel import
4. **Action Tracker** - Meeting-type badge, due/revised dates, priority/status; meeting type filter
5. **Meetings** (admin only) - Card-based meeting list with linked action items
6. **Monthly Reviews** - AI-generated reviews with strengths/gaps/recommendations; **Export PDF** button uses browser print with a formatted print-only layout
7. **Dashboard Planner** (admin only) - AI-recommended dashboard structure

### Execution Management
8. **Initiative Portfolio** (/initiatives, also /portfolio as alias) - Initiative grid with health scores (Green/Amber/Red), stat cards, search/filter by status/priority/health; create initiative dialog with **Strategic Goal** + **Risk Notes** fields; **Excel Template download** + **Bulk Import** (client-side XLSX parse → POST /api/initiatives/bulk-upload)
9. **Initiative Detail** (/initiatives/:id, also /projects/:id as alias) - **Breadcrumb navigation** (Initiatives → Initiative Name), header shows owner/business unit/strategic goal/risk notes, progress stats, 4 tabs:
   - Overview: task breakdown + upcoming milestones
   - Tasks: List view + Board (Kanban) view, add/delete tasks, inline status change; inline subtask creation with Owner/Due Date/Status fields
   - Milestones: list/calendar view with status change, add/delete
   - Comments: post/delete comments (both roles), timestamped with author
   - Task form uses **Owner** field (tasks.owner column); subtasks have owner/dueDate/status fields displayed
10. **Workload** (/workload) - Team task distribution by assignee with overdue/in-progress/completed counts and task list
11. **Global Search** - Header search button opens modal, searches across projects/tasks/KPIs/meetings/actions with category groupings

### Admin/Settings
12. **Settings** (admin only) - Business profile, strategic goals, departments, meeting types; **Subscription & Plan card** showing current plan, daily AI usage bar, and activation key input
13. **User Management** (admin only) - Three tabs: (1) **Login Users** — add/change role/delete company users, with per-user **Department Access** button (Building2 icon) to open the access control dialog; (2) **Team Members** — manage name/email/job title/department for people who appear in owner dropdowns; (3) **Dept Access** — overview of all users' access with access level legend and per-user manage dialog

### Platform Owner System (new)
- Separate auth area at `/owner/*` with its own session (platformOwnerId) independent of company auth
- **Platform Owner Login** (/owner/login) — credentials: owner@performo.ai / owner123
- **Owner Dashboard** (/owner/dashboard) — stat cards (total companies, active today, total users, AI requests today), recent companies + recent activity + AI usage by company
- **Company Management** (/owner/companies) — list all companies with plan/status badges, activate/suspend companies
- **Activation Keys** (/owner/keys) — generate plan-specific keys (Trial/Starter/Growth/Enterprise), view status (Pending/Active/Revoked), copy/revoke keys
- **User Activity** (/owner/activity) — filterable feed of logins, AI requests, key activations across all companies
- **AI Usage** (/owner/ai-usage) — per-company AI consumption with daily/weekly/total, 7-day trend bar chart, limit indicators
- **Audit Log** (/owner/audit) — all platform owner actions logged
- **Plan Enforcement**: AI requests are blocked with 429 when daily limit reached; assistant shows upgrade prompt with Settings link
- **Company-side**: Plan badge visible in app sidebar (badge-plan-name), Subscription & Plan card in Settings with key activation form
- **Activity Tracking**: AI requests and key activations logged to userActivityLogs

## Reusable Components

- `PageHeader` - Consistent page titles with icon and action buttons
- `EmptyState` - Empty state display with icon and optional CTA
- `LoadingState` (LoadingCards, LoadingTable, LoadingPage) - Skeleton loading states
- `ErrorState` - Error display with retry button
- `StatusBadge` / `PriorityBadge` - Color-coded status and priority badges
- `ExcelUpload` - Excel file upload dialog with template download

## Excel Upload

- KPI import: POST /api/upload/kpis, template: GET /api/templates/kpis
- Action import: POST /api/upload/actions (includes Meeting Type, Revised Due Date), template: GET /api/templates/actions
- Uses xlsx package for template generation and client-side parsing

## Database Schema

Performance: users (role + companyId), companies, departments, business_goals, kpis, kpi_actuals, meetings, action_items, monthly_reviews, meeting_types, dashboard_plans, user_department_access (department-level access control per user)

Execution: projects, tasks, subtasks, milestones, project_comments

Platform Owner: platform_owners, subscriptions, activation_keys, user_activity_logs, owner_audit_logs

## API Endpoints

Write endpoints require `requireAdmin` or `requireAuth` (comments). Reads require `requireAuth`.

- Projects: GET/POST /api/projects, GET/PATCH/DELETE /api/projects/:id
- Tasks: GET /api/tasks, GET/POST /api/projects/:id/tasks, PATCH/DELETE /api/tasks/:id
- Subtasks: GET/POST /api/tasks/:id/subtasks, PATCH/DELETE /api/subtasks/:id
- Milestones: GET/POST /api/milestones, GET /api/projects/:id/milestones, PATCH/DELETE /api/milestones/:id
- Comments: GET/POST /api/comments/:type/:id (requireAuth), DELETE /api/comments/:id
- Portfolio stats: GET /api/portfolio/stats
- Workload: GET /api/workload
- Search: GET /api/search?q=...
- Users: GET /api/users, POST /api/users, PATCH /api/users/:id, DELETE /api/users/:id
- Dept Access: GET /api/users/:id/department-access, POST /api/users/:id/department-access, DELETE /api/users/:id/department-access/:deptId, GET /api/users/me/department-access
- Company lookup: `getCompanyForUser` checks user.companyId first, falls back to getCompanyByUserId
- Health scoring: `computeProjectHealth(project, tasks, milestones)` → Green/Amber/Red/Completed

## File Structure

```
shared/schema.ts                        - All table definitions + types
server/storage.ts                       - IStorage + DatabaseStorage (all CRUD + search)
server/routes.ts                        - All API routes + computeProjectHealth helper
server/seed.ts                          - seedDatabase() + seedProjectData() — idempotent
client/src/App.tsx                      - Routing + GlobalSearch + NotificationBell in header
client/src/components/app-sidebar.tsx   - Role-based nav with Execution section
client/src/components/global-search.tsx - Search modal component
client/src/components/notification-bell.tsx - Bell with badge + popover (overdue actions, at-risk KPIs, urgent milestones)
client/src/pages/portfolio.tsx          - Project portfolio grid
client/src/pages/project-detail.tsx     - Project detail (Tasks/Milestones/Comments tabs)
client/src/pages/workload.tsx           - Workload by assignee
client/src/pages/dashboard.tsx          - Dashboard + execution stats section
client/src/pages/user-management.tsx    - Admin user management
```

## Demo Credentials

- **Admin**: demo@performo.ai / demo123 (Dharmesh Sheth, OYO Hospitality)
- **Executive**: exec@performo.ai / exec123 (Ravi Mehta, OYO Hospitality)
- **Platform Owner**: owner@performo.ai / owner123 → /owner/login

## Demo Execution Data

4 projects: Loyalty Program Launch (55% In Progress), F&B Menu Overhaul (40% In Progress), Staff Retention Initiative (30% Critical), Q2 Revenue Recovery Plan (0% Not Started)
17 tasks across projects, 7 milestones
