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

### Performance Management
1. **Dashboard** - Welcome banner, 6 KPI/action stat cards, KPI health donut, action bar chart, execution section (active projects, at-risk, overdue tasks, milestones), dept summary, latest review
2. **KPI Builder** (admin only) - Manual KPI form + AI-generated KPIs
3. **KPI Management** - Table with search, dept/frequency filters, add actuals dialog, Excel import
4. **Action Tracker** - Meeting-type badge, due/revised dates, priority/status; meeting type filter
5. **Meetings** (admin only) - Card-based meeting list with linked action items
6. **Monthly Reviews** - AI-generated reviews with strengths/gaps/recommendations
7. **Dashboard Planner** (admin only) - AI-recommended dashboard structure

### Execution Management (New)
8. **Portfolio** (/portfolio) - Project grid with health scores (Green/Amber/Red), stat cards, search/filter by status/priority/health, create project dialog (admin only)
9. **Project Detail** (/projects/:id) - Header with health/status/priority, progress stats, 4 tabs:
   - Overview: task breakdown + upcoming milestones
   - Tasks: List view + Board (Kanban) view, add/delete tasks, inline status change, subtask checkboxes
   - Milestones: list with status change, add/delete
   - Comments: post/delete comments (both roles), timestamped with author
10. **Workload** (/workload) - Team task distribution by assignee with overdue/in-progress/completed counts and task list
11. **Global Search** - Header search button opens modal, searches across projects/tasks/KPIs/meetings/actions with category groupings

### Admin/Settings
12. **Settings** (admin only) - Business profile, strategic goals, departments, meeting types
13. **User Management** (admin only) - Add/change role/delete company users

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

Performance: users (role + companyId), companies, departments, business_goals, kpis, kpi_actuals, meetings, action_items, monthly_reviews, meeting_types, dashboard_plans

Execution: projects, tasks, subtasks, milestones, project_comments

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
- Company lookup: `getCompanyForUser` checks user.companyId first, falls back to getCompanyByUserId
- Health scoring: `computeProjectHealth(project, tasks, milestones)` → Green/Amber/Red/Completed

## File Structure

```
shared/schema.ts                        - All table definitions + types
server/storage.ts                       - IStorage + DatabaseStorage (all CRUD + search)
server/routes.ts                        - All API routes + computeProjectHealth helper
server/seed.ts                          - seedDatabase() + seedProjectData() — idempotent
client/src/App.tsx                      - Routing + GlobalSearch in header
client/src/components/app-sidebar.tsx   - Role-based nav with Execution section
client/src/components/global-search.tsx - Search modal component
client/src/pages/portfolio.tsx          - Project portfolio grid
client/src/pages/project-detail.tsx     - Project detail (Tasks/Milestones/Comments tabs)
client/src/pages/workload.tsx           - Workload by assignee
client/src/pages/dashboard.tsx          - Dashboard + execution stats section
client/src/pages/user-management.tsx    - Admin user management
```

## Demo Credentials

- **Admin**: demo@performo.ai / demo123 (Dharmesh Sheth, OYO Hospitality)
- **Executive**: exec@performo.ai / exec123 (Ravi Mehta, OYO Hospitality)

## Demo Execution Data

4 projects: Loyalty Program Launch (55% In Progress), F&B Menu Overhaul (40% In Progress), Staff Retention Initiative (30% Critical), Q2 Revenue Recovery Plan (0% Not Started)
17 tasks across projects, 7 milestones
