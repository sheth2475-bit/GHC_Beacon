# Performo AI

## Overview
Performo AI is an AI-powered platform designed for Small and Medium Enterprises (SMEs) to enhance performance and execution management. It aims to streamline operations, improve decision-making, and drive strategic outcomes through comprehensive KPI tracking, project management, and AI-driven insights. The platform supports multi-user environments with Role-Based Access Control (RBAC) to cater to different organizational roles like Admins and Executives. Key capabilities include an AI Assistant for natural language interaction, robust performance and execution management modules, and an advanced Analytics Studio for data-driven insights.

## User Preferences
I want to ensure all write actions proposed by the AI Assistant have a confirmation step before execution. For new projects or tasks, if I miss any fields, the AI should guide me by asking follow-up questions for the missing information (e.g., owner, due date, priority). I expect all write operations to be logged for auditing purposes.

## System Architecture
The Performo AI platform is built with a modern web stack. The frontend utilizes React, TypeScript, Tailwind CSS, shadcn/ui, and Recharts for a responsive and intuitive user interface. The backend is powered by Express.js with TypeScript, ensuring a robust API layer. Data persistence is handled by PostgreSQL, accessed via Drizzle ORM. AI capabilities are integrated using OpenAI's GPT-4o model through Replit AI Integrations. Authentication is session-based, implemented with `passport-local` for email/password logins.

### UI/UX Decisions
- Consistent `PageHeader` for titles and actions.
- `EmptyState`, `LoadingState` (Cards, Table, Page), and `ErrorState` components provide clear user feedback.
- `StatusBadge` and `PriorityBadge` use color-coding for quick visual cues.
- Role-based navigation in `app-sidebar` tailors the user experience.
- The AI Assistant features a slide-in drawer and a confirmation flow for all write actions.
- KPI management includes sparkline trend charts and quick-entry popovers for efficient data input.
- Initiatives are presented in a grid with health scores (Green/Amber/Red) for at-a-glance project status.
- The Analytics Studio V2 employs a 3-column layout for dataset exploration, offering 8 chart types and a follow-up context mode for AI interactions.
- Monthly Reviews feature an "Export PDF" button with a print-only layout.

### Technical Implementations
- **Multi-User RBAC**: Implemented with `users.role` and `users.companyId`, protected by `requireAdmin` middleware for write/mutate routes.
- **Performo Assistant**: `server/assistant.ts` handles context building, GPT-4o calls, and structured JSON responses. Includes an `assistant_logs` table for audit trails.
- **Performance Management**: Features include AI-generated KPI suggestions, quick-entry popovers for KPI actuals, and comprehensive action tracking.
- **Execution Management**: Supports Initiative Portfolio with health scores, detailed Initiative views with tasks, subtasks, milestones, and comments. Workload distribution is visualized by assignee.
- **Analytics Studio V2**: Supports drag-and-drop Excel/CSV uploads with auto-detection of column types, configurable dataset columns (type, aggregation, format), and AI-powered insight generation with follow-up context. It also includes an AI narrative generation for dashboards.
- **Platform Owner System**: A separate authenticated area (`/owner/*`) for platform administrators to manage companies, activation keys, user activity, and AI usage across the entire platform. This system enforces AI usage limits based on subscription plans.
- **Excel Upload**: Uses the `xlsx` package for client-side parsing and template generation for KPI and Action imports.
- **Search**: A global search feature covers projects, tasks, KPIs, meetings, and actions.
- **Health Scoring**: `computeProjectHealth` function determines project health (Green/Amber/Red/Completed).

### Feature Specifications
- **AI Chat (Performo Assistant)**: Read queries (KPI status, overdue actions), write operations (create/update projects/tasks/KPIs), confirmation flow for writes, guided flow for missing fields, audit logging, suggested prompts, and role-based permissions.
- **KPI Management**: Builder (manual/AI), table with filters, sparkline charts, quick-entry popover, full edit dialog, Excel import.
- **Action Tracker**: Meeting-type badges, due/revised dates, priority/status, filtering.
- **Monthly Reviews**: AI-generated summaries (strengths/gaps/recommendations) with PDF export.
- **Initiative Portfolio**: Grid view with health scores, strategic goals, risk notes, Excel template download, bulk import.
- **Initiative Detail**: Breadcrumb navigation, progress stats, tabs for Overview, Tasks (list/Kanban, subtasks), Milestones, and Comments.
- **Workload**: Team task distribution by assignee.
- **Analytics Studio V2**: Dataset upload/configuration, explore/insight builder with various chart types, AI-suggested questions, dashboard composer with AI narrative generation, and visibility controls.
- **Platform Owner**: Login, dashboard with key metrics, company management (activate/suspend), activation key generation, user activity tracking, AI usage monitoring, and audit logging.
- **Workflow Center** (`/workflow`): Unified hub for 4 workflow types — Recurring Tasks, Service Desk (tickets), Licenses, and Certificates. Features: hierarchical sidebar nav with `?s=` URL deep-linking, per-type overview/config/records/analytics tabs, global analytics, My Work, and Automations sections. Detail dialog has 4 tabs: Details, Comments, Files (attachments), Activity. 18 seeded OYO-branded demo records. Automation email routing rules per type. DB tables: `workflow_submissions`, `workflow_comments`, `workflow_activity_log`, `document_attachments`.

## External Dependencies
- **OpenAI**: Integrated via Replit AI Integrations for GPT-4o model capabilities (Performo Assistant, AI-generated KPIs, Analytics Studio insights and narratives).
- **PostgreSQL**: Primary database for all application data.
- **Drizzle ORM**: Used for interacting with the PostgreSQL database.
- **passport-local**: Authentication strategy for email/password-based user login.
- **xlsx package**: For server-side Excel template generation and client-side parsing of uploaded Excel/CSV files.