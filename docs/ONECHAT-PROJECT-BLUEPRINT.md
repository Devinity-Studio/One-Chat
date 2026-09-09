# OneChat — Project Blueprint for Rebuild from Scratch

## 1. Objective

This blueprint is intended for rebuilding OneChat as a production-ready system from the project’s current concept and working prototype. The goal is to preserve the current strengths of the repository while replacing the ad-hoc prototype code with a cleaner, scalable architecture.

The rebuild should be structured around 4 major domains:
1. Omnichannel messaging
2. Agent operations and inbox workflows
3. Workforce management (schedule, attendance, leave)
4. Payroll and compensation

---

## 2. Recommended Stack

### Frontend
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- Zustand or React Query for state
- Recharts for dashboard analytics

### Backend
- NestJS or Next.js API routes
- Supabase Postgres for persistence
- Supabase Realtime for live updates
- JWT-based auth or Supabase Auth

### External Integrations
- LINE Messaging API
- Telegram Bot API
- Meta Messenger API
- Optional queue/background workers via BullMQ or cron jobs

### DevOps / Infra
- Vercel for frontend
- Supabase for database/auth/realtime
- Railway / Render / Fly.io / Cloud Run for backend
- Sentry for error monitoring
- GitHub Actions for CI/CD

---

## 3. System Architecture

### 3.1 High-Level Flow

Client / Agent UI
  -> API layer
  -> Business services
  -> Supabase/Postgres

Inbound messages
  -> Provider webhook
  -> Message normalization service
  -> Conversation service
  -> Bot / auto-response service
  -> Agent UI realtime update

Outbound message
  -> Service layer
  -> Provider-specific adapter
  -> LINE / Telegram / Facebook

---

## 4. Suggested Folder Structure

```text
onechat/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   ├── api/
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   ├── inbox/
│   │   │   ├── dashboard/
│   │   │   ├── providers/
│   │   │   ├── staff/
│   │   │   └── ui/
│   │   ├── lib/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── types/
│   │   ├── package.json
│   │   └── next.config.js
│   └── api/
│       ├── src/
│       │   ├── app/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── channels/
│       │   │   ├── conversations/
│       │   │   ├── customers/
│       │   │   ├── templates/
│       │   │   ├── broadcasts/
│       │   │   ├── workforce/
│       │   │   ├── payroll/
│       │   │   └── analytics/
│       │   ├── common/
│       │   │   ├── decorators/
│       │   │   ├── filters/
│       │   │   ├── guards/
│       │   │   ├── interceptors/
│       │   │   └── utils/
│       │   ├── config/
│       │   ├── database/
│       │   └── main.ts
│       ├── test/
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── shared/
│   │   ├── types/
│   │   ├── enums/
│   │   ├── constants/
│   │   └── utils/
│   ├── adapters/
│   │   ├── line/
│   │   ├── telegram/
│   │   └── facebook/
│   └── workers/
│       ├── broadcast/
│       ├── reminder/
│       └── auto-response/
├── infra/
│   ├── supabase/
│   │   ├── migrations/
│   │   ├── seed/
│   │   └── policies/
│   ├── docker/
│   └── scripts/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── product/
│   └── runbooks/
├── .github/
│   ├── workflows/
│   └── templates/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── turbo.json
└── pnpm-lock.yaml
```

---

## 5. Domain Model

### 5.1 Core Messaging Domain
- Provider
- Agent
- Customer
- Conversation
- Message
- Template
- Broadcast
- Tag

### 5.2 Workforce Domain
- Employee
- WorkSchedule
- Shift
- ShiftAssignment
- AttendanceLog
- LeaveRequest
- TimeBlock

### 5.3 Payroll Domain
- SalaryRule
- PayPeriod
- PayrollRun
- PayrollItem
- OvertimeRule
- Payslip

---

## 6. Main Modules

### 6.1 Omnichannel Module
Responsibilities:
- receive message from providers
- normalize payloads
- persist conversation history
- create customer records
- manage agent assignment
- route response to correct channel

Key services:
- ChannelWebhookService
- MessageNormalizationService
- ConversationService
- AgentAssignmentService
- AutoResponderService
- BroadcastService

### 6.2 Agent Operations Module
Responsibilities:
- manage inbox queue
- lock conversations and avoid duplicate work
- route customer to available agents
- track conversation status and notes
- analyze agent productivity

Key services:
- ConversationLockService
- QueueAssignmentService
- AgentPerformanceService
- InboxFilterService

### 6.3 Workforce Module
Responsibilities:
- create schedules
- assign shifts
- track attendance
- approve leave
- support shift swaps

Key services:
- ScheduleService
- ShiftService
- AttendanceService
- LeaveService
- ShiftSwapService

### 6.4 Payroll Module
Responsibilities:
- compute salary/hours/payables
- apply overtime and deductions
- approve payroll runs
- generate payslips

Key services:
- PayrollRuleService
- PayrollCalculatorService
- PayrollRunService
- PayslipGeneratorService

---

## 7. Database Design Recommendation

### Core tables
- providers
- agents
- agent_providers
- customers
- conversations
- messages
- templates
- template_providers
- broadcasts
- broadcast_providers
- tags
- customer_tags

### New workforce tables
- employees
- schedules
- shifts
- shift_assignments
- attendance_logs
- leave_requests
- shift_swaps
- leave_approvals

### New payroll tables
- salary_rules
- payroll_runs
- payroll_items
- payslips
- overtime_rules

### Recommended indexes
- provider_id on conversation and customer tables
- assignee_id on conversations
- external_message_id on messages
- date range indexes on attendance and leave tables
- employee_id + pay_period on payroll table

---

## 8. Security Design

### Authentication
- Use Supabase Auth or JWT-based auth
- Roles:
  - admin
  - supervisor
  - agent
  - payroll_admin

### Authorization
- Role-based access control (RBAC)
- Provider-scoped access control for agents
- Leave and payroll views restricted by role

### Secrets
- Never store provider tokens in frontend
- Use server-side environment variables
- Use encrypted secret storage for production if required

---

## 9. API Design

### Messaging APIs
- POST /api/webhooks/line
- POST /api/webhooks/telegram
- POST /api/webhooks/facebook
- POST /api/conversations/:id/reply
- POST /api/conversations/:id/claim
- PATCH /api/conversations/:id/status

### Broadcast APIs
- POST /api/broadcasts
- GET /api/broadcasts/:id
- POST /api/broadcasts/:id/send

### Workforce APIs
- GET /api/schedules
- POST /api/schedules
- GET /api/attendance
- POST /api/attendance/check-in
- POST /api/attendance/check-out
- GET /api/leave-requests
- POST /api/leave-requests

### Payroll APIs
- GET /api/payroll/runs
- POST /api/payroll/runs
- GET /api/payslips/:id

---

## 10. UI Blueprint

### Dashboard Layout
- Sidebar navigation
  - Inbox
  - Customers
  - Broadcasts
  - Templates
  - Providers
  - Team Schedule
  - Attendance
  - Payroll
  - Reports

### Inbox UI
- Left panel: conversation list
- Center: message thread
- Right side: customer info, tags, notes, quick actions

### Schedule UI
- Weekly calendar
- Shift cards
- Swap request queue
- Team availability summary

### Attendance UI
- Daily attendance table
- Clock in/out logs
- Overtime and lateness exceptions

### Payroll UI
- Employee pay summary
- Run history
- Export to CSV/PDF

---

## 11. Production Requirements

### Reliability
- webhook idempotency check
- retry handling for outbound messages
- monitoring for failed provider sends

### Scalability
- move broadcast sending to queue workers
- use central event bus for async processing
- prefer server-side processing over direct frontend calls

### Test Strategy
- Unit tests for payload normalization
- Integration tests for webhook ingestion
- E2E tests for inbox workflow
- Payroll calculations with fixture datasets

---

## 12. Recommended Delivery Sequence

### Phase A — Foundation
- project bootstrap
- auth and role setup
- provider and customer CRUD
- conversation and message schema
- inbox UI

### Phase B — Automation
- auto-response engine
- broadcast engine
- template management
- agent assignment queue

### Phase C — Workforce
- schedule module
- attendance logs
- leave requests
- shift swap workflow

### Phase D — Payroll
- wage rules
- payroll run generation
- payslip export
- financial reporting

---

## 13. Important Design Decision

The project should be split into 3 technical layers:
1. Channel integration layer
2. Operations layer
3. Workforce/payroll layer

This keeps the messaging engine independent from shift scheduling and payroll logic, which reduces coupling and makes future changes safer.

---

## 14. Final Recommendation

For a clean rebuild, use:
- Next.js + TypeScript for the frontend
- NestJS or Next API for backend services
- Supabase for persistence and realtime
- modular domain-driven structure with separate modules for Messaging, Workforce, and Payroll

This is the most practical architecture for turning the existing OneChat concept into a real operational platform without overcomplicating the initial build.
