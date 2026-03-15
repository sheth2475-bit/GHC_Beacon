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

1. **Dashboard** - Welcome banner with company name/date/summary, 6 stat cards with percentage indicators, KPI health donut chart, action progress bar chart, recent actions with meeting type badges, department summary (KPI/action/overdue counts per dept), latest review
2. **KPI Builder** (admin only) - Two tabs: "Manual KPI" (full form with RAG thresholds) and "AI Generate" (AI-generated KPIs)
4. **KPI Management** - Table view with search, department/frequency filters, add actuals dialog, Excel import
5. **Action Tracker** - Table with Meeting Type (first column, badge), Title, Owner, Due Date, Revised Due Date (amber/red coloring), Priority, Status; meeting type filter dropdown; uses dynamic meeting types from API
6. **Meetings** (admin only) - Card-based meeting list with linked action items, create dialog
7. **Monthly Reviews** - AI-generated business performance reviews with strengths/gaps/recommendations
8. **Dashboard Planner** (admin only) - AI-recommended dashboard structure for Power BI/web dashboards
9. **Settings** (admin only) - Account info, Business Profile (company name/industry/size/country + save), Strategic Goals, Departments CRUD (add/delete), Meeting Types CRUD (add/delete)
10. **User Management** (admin only) - List users, add new users with role, change roles, delete users

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

Tables: users (with role + companyId), companies, departments, business_goals, kpis, kpi_actuals, meetings, action_items, monthly_reviews, meeting_types, dashboard_plans

## API Endpoints

All write endpoints (POST/PATCH/DELETE) require `requireAdmin` middleware.
Read endpoints require `requireAuth` middleware (both roles).

- Users: GET /api/users, POST /api/users, PATCH /api/users/:id, DELETE /api/users/:id (admin only)
- Departments: GET /api/departments, POST /api/departments, DELETE /api/departments/:id
- Meeting Types: GET /api/meeting-types, POST /api/meeting-types, DELETE /api/meeting-types/:id
- Company lookup: `getCompanyForUser` checks user.companyId first, falls back to getCompanyByUserId

## File Structure

```
shared/schema.ts          - All Drizzle table definitions and types (users has role + companyId)
server/db.ts              - Database connection
server/storage.ts         - Storage layer (IStorage interface + DatabaseStorage)
server/auth.ts            - Authentication setup (passport + sessions + requireAdmin middleware)
server/ai.ts              - AI service (gpt-4o, KPI generation, reviews, dashboard plans)
server/routes.ts          - All API routes including user management + Excel upload/template endpoints
server/seed.ts            - Seed data (OYO Hospitality, 12 KPIs, 10 actions, 4 meetings, 9 meeting types, admin + exec users)
client/src/App.tsx         - Main app with role-based routing and sidebar layout
client/src/lib/auth.tsx    - Auth context provider (includes role, isAdmin, isExecutive)
client/src/components/     - Reusable components (app-sidebar with role-based nav, page-header, etc.)
client/src/pages/          - All page components
client/src/pages/user-management.tsx - User management page (admin only)
```

## Demo Credentials

- **Admin**: demo@performo.ai / demo123 (Dharmesh Sheth, OYO Hospitality)
- **Executive**: exec@performo.ai / exec123 (Ravi Mehta, OYO Hospitality)
