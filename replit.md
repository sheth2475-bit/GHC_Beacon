# Performo AI

AI-powered SME performance and execution management platform.

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (gpt-4o)
- **Auth**: Session-based with passport-local (email/password)

## Key Features

1. **Dashboard** - Executive stat cards, KPI health donut chart, action progress bar chart, recent actions list, latest review summary
2. **Business Profile** - Company setup with industry, departments, strategic goals
3. **KPI Builder** - AI-generated KPIs based on industry/department/goals with save all and individual save
4. **KPI Management** - Table view with search, department/frequency filters, add actuals dialog, Excel import
5. **Action Tracker** - Table with inline status updates, search/filter, priority badges, overdue highlighting, Excel import
6. **Meetings** - Card-based meeting list with linked action items, create dialog
7. **Monthly Reviews** - AI-generated business performance reviews with strengths/gaps/recommendations
8. **Dashboard Planner** - AI-recommended dashboard structure for Power BI/web dashboards
9. **Settings** - Account info, company summary, app version

## Reusable Components

- `PageHeader` - Consistent page titles with icon and action buttons
- `EmptyState` - Empty state display with icon and optional CTA
- `LoadingState` (LoadingCards, LoadingTable, LoadingPage) - Skeleton loading states
- `ErrorState` - Error display with retry button
- `StatusBadge` / `PriorityBadge` - Color-coded status and priority badges
- `ExcelUpload` - Excel file upload dialog with template download

## Excel Upload

- KPI import: POST /api/upload/kpis, template: GET /api/templates/kpis
- Action import: POST /api/upload/actions, template: GET /api/templates/actions
- Uses xlsx package for template generation and client-side parsing

## Database Schema

Tables: users, companies, departments, business_goals, kpis, kpi_actuals, meetings, action_items, monthly_reviews, dashboard_plans

## File Structure

```
shared/schema.ts          - All Drizzle table definitions and types
server/db.ts              - Database connection
server/storage.ts         - Storage layer (IStorage interface + DatabaseStorage)
server/auth.ts            - Authentication setup (passport + sessions)
server/ai.ts              - AI service (gpt-4o, KPI generation, reviews, dashboard plans)
server/routes.ts          - All API routes including Excel upload/template endpoints
server/seed.ts            - Seed data (Al Noor Hospitality Group, 9 KPIs, actions, meetings)
client/src/App.tsx         - Main app with routing and sidebar layout
client/src/lib/auth.tsx    - Auth context provider
client/src/components/     - Reusable components (app-sidebar, page-header, status-badge, etc.)
client/src/pages/          - All page components
```

## Demo Credentials

- Email: demo@performo.ai
- Password: demo123
