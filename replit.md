# GHC Beacon

## Overview
GHC Beacon is an analytics and performance intelligence platform with two core modules: **Analytics Studio** (upload spreadsheets, ask AI questions, get charts and dashboards) and **Balanced Scorecard** (track strategic KPIs with RAG traffic-light status). Includes admin-controlled user/department access management and public link sharing for Analytics dashboards.

## User Preferences
All write actions by the AI Assistant require a confirmation step. For new projects or tasks, if fields are missing, the AI guides with follow-up questions. All write operations are logged for auditing.

## Branding
- App name: **GHC Beacon**
- Logo: `/ghc-beacon-logo.jpg` (stored at `client/public/ghc-beacon-logo.jpg`)
- Sidebar nav: Analytics Studio, Balanced Scorecard; Admin section shows People + Settings for admin users

## System Architecture
Built with React + TypeScript + Tailwind CSS + shadcn/ui + Recharts on the frontend. Backend is Express.js + TypeScript. Data persistence via PostgreSQL accessed through Drizzle ORM. AI via OpenAI GPT-4o (Replit AI Integrations). Auth is session-based with `passport-local`.

### Key Modules

**Analytics Studio**
- Upload Excel/CSV datasets, configure column types, explore with AI
- AI insight generation (bar, line, area, pie, donut, KPI, horizontal-bar chart types)
- AI insight questions support budget/target/plan and previous-year comparisons when matching comparison measures or date columns are available
- Bar, column, line, and area charts automatically render a dual series when previous-year or budget comparison data is returned
- KPI cards can save compact or full-number display formatting; saved dashboards and public links honor the selected format
- OYO demo analytics dataset includes Jan 2025–Dec 2026 rows, Revenue Budget, Occupancy Target, and GOP Margin Target columns for testing budget and previous-year comparisons
- Dashboard composer: add insights to a dashboard, AI narrative, publish (private/department/company), public share link
- Public share link: `POST /api/v2/analytics/definitions/:id/share`, viewed at `/public/dashboard/:token`

**Balanced Scorecard**
- Department cards with 4-perspective BSC (Financial, Customer, Internal, Learning)
- RAG status (Green/Amber/Red) per KPI, health percentages, trend arrows
- KPI data entry per department/period via Department Detail page
- DB-synced departments (`bsc_departments`) and actuals (`bsc_actuals`)
- Public share link per department: `POST /api/scorecard/share`, `GET /api/scorecard/share?deptId=...`, viewed at `/public/scorecard/:token`
- Scorecard overview and department dashboards default to one month behind the current calendar month

**Executive Command Center**
- Logged-in default landing page at `/`
- Executive-level view across Scorecard performance, Analytics activity, decision alerts, and data freshness
- Data freshness is shown for Analytics uploads/dashboard updates and latest Scorecard KPI reporting period
- Reporting period defaults to one month behind the current calendar month, with manual user selections persisted afterward

**Guided Tour**
- Per-user first-login guided tour provides a detailed step-by-step walkthrough across Command Center controls, alert tabs, dashboard/focus panels, Analytics Studio search/freshness/libraries/upload, Scorecard month navigation/department cards/detail tabs/data entry/sharing, notifications, Beacon Assistant controls, and admin links when available
- Users can relaunch the tour from the sidebar footer

**Public Pages** (no auth required)
- `/public/dashboard/:token` — read-only Analytics dashboard with GHC Beacon header
- `/public/scorecard/:token` — read-only BSC department scorecard (same look and feel as internal view)

**Admin**
- `/users` — User Management (admin only)
- `/settings` — Settings (admin only)

**Platform Owner** (`/owner/*`)
- Separate auth area for platform administrators: companies, activation keys, activity, AI usage, audit

### Schema Tables (key additions)
- `analytics_dashboard_definitions`: added `share_token TEXT`, `share_enabled BOOLEAN DEFAULT FALSE`
- `scorecard_shares`: `id`, `company_id`, `dept_id`, `share_token TEXT UNIQUE`, `share_enabled BOOLEAN`, `created_by`, `created_at`

## External Dependencies
- **OpenAI**: GPT-4o via Replit AI Integrations (Analytics Studio AI, Beacon Assistant)
- **PostgreSQL**: Primary database
- **Drizzle ORM**: Database access
- **passport-local**: Email/password authentication
- **xlsx**: Excel template generation and upload parsing
- **Resend**: Email delivery
