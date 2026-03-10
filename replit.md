# Performo AI

AI-powered SME performance and execution management platform.

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2)
- **Auth**: Session-based with passport-local (email/password)

## Key Features

1. **Dashboard** - Summary cards, KPI charts, action status charts
2. **Business Profile** - Company setup with industry, departments, goals
3. **KPI Builder** - AI-generated KPIs based on industry/department/goals
4. **KPI Management** - View, filter, add actuals, delete KPIs
5. **Action Tracker** - Create, assign, track action items with status/priority
6. **Meetings** - Meeting management with linked action items
7. **Monthly Reviews** - AI-generated business performance reviews
8. **Dashboard Planner** - AI-recommended dashboard structure

## Database Schema

Tables: users, companies, departments, business_goals, kpis, kpi_actuals, meetings, action_items, monthly_reviews, dashboard_plans

## File Structure

```
shared/schema.ts          - All Drizzle table definitions and types
server/db.ts              - Database connection
server/storage.ts         - Storage layer (IStorage interface + DatabaseStorage)
server/auth.ts            - Authentication setup (passport + sessions)
server/ai.ts              - AI service (KPI generation, reviews, dashboard plans)
server/routes.ts          - All API routes
server/seed.ts            - Seed data (demo company + KPIs + actions)
client/src/App.tsx         - Main app with routing and sidebar layout
client/src/lib/auth.tsx    - Auth context provider
client/src/components/app-sidebar.tsx - Navigation sidebar
client/src/pages/          - All page components
```

## Demo Credentials

- Email: demo@performo.ai
- Password: demo123
