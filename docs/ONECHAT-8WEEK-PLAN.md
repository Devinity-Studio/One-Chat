# OneChat — 8-Week Development Plan

## 1. Goal

Build the first production-ready version of OneChat as a customer service and operations platform with:
- multi-channel inbox
- agent assignment and queue control
- automated response
- broadcast messaging
- team scheduling and attendance foundation
- payroll-ready architecture

This plan is designed to turn the current prototype into a deployable system in 8 weeks.

---

## 2. Project Principles

- Ship the core messaging system first
- Build modular domains to avoid coupling
- Validate with real provider payloads
- Keep WFM and payroll separate from channel layer
- Use measurable weekly milestones

---

## 3. Week-by-Week Plan

## Week 1 — Foundation and Sprint Setup

### Objective
Set up the technical base and align the team on architecture.

### Deliverables
- repository structure finalized
- frontend/backend stack selected
- env config and secrets strategy documented
- Supabase project initialized
- DB schema migration baseline created
- backlog and task board established

### Tasks
- finalize architecture decision
- create monorepo or app structure
- define roles and permissions
- set up GitHub workflows
- configure Supabase project and auth
- bootstrap database schema
- define coding standards and branch strategy

### Exit Criteria
- project can run locally
- DB schema loads without errors
- auth roles are defined
- team can start building in parallel

---

## Week 2 — Messaging Core and Provider Integration

### Objective
Rebuild the message ingestion and provider connection layer.

### Deliverables
- webhook endpoints for LINE, Telegram, Facebook
- provider onboarding flow
- secure credential storage
- inbound message normalization service

### Tasks
- create provider CRUD APIs
- implement webhook handlers
- map incoming payloads to unified schema
- upsert customers and conversations
- write message ingestion tests
- validate delivery logs and provider status

### Exit Criteria
- sample messages can be ingested from each channel
- a conversation record is created correctly
- customer and message history are persisted

---

## Week 3 — Inbox, Agent Assignment, and Conversation Workflow

### Objective
Create the live inbox and agent workflow experience.

### Deliverables
- conversation list and thread UI
- agent assignment queue
- manual claim and re-assignment
- conversation state tracking

### Tasks
- build chat UI shell
- implement conversation filtering and sorting
- create assignment logic
- implement lock/unlock behavior
- add notes and status updates
- add agent status availability toggle

### Exit Criteria
- one agent can claim a conversation
- assignment does not allow duplicate work
- conversation status updates are stored correctly

---

## Week 4 — Auto Response and Broadcast Engine

### Objective
Make the communication platform operational and automated.

### Deliverables
- keyword-based auto responder
- template management UI
- broadcast creation and dispatch flow
- response and campaign tracking

### Tasks
- implement template storage and validation
- create matching engine for keywords
- add bot response sending logic
- build broadcast form and scheduling UI
- send to provider audiences
- track reach and send result summary

### Exit Criteria
- matching text can trigger automatic reply
- templates can be selected and sent
- broadcast results can be traced by provider

---

## Week 5 — Team Scheduling Foundation

### Objective
Start the workforce layer, beginning with staff and scheduling basics.

### Deliverables
- employee directory
- schedule model and calendar view
- shift creation
- assignment to employees

### Tasks
- create employee records and roles
- add schedule templates and date ranges
- implement shift creation APIs
- show weekly schedule calendar UI
- support manual assignment to shifts

### Exit Criteria
- staff can be assigned to shifts
- a schedule can be viewed per week/month
- shift assignment is stored with date and time range

---

## Week 6 — Attendance and Leave Workflow

### Objective
Add time tracking and leave support.

### Deliverables
- clock in / clock out functionality
- attendance logs
- leave request management
- approval and rejection flow

### Tasks
- implement attendance tables and APIs
- add clock-in and clock-out actions
- create leave request schema and UI
- add approval workflow and status flags
- calculate lateness and overtime exceptions

### Exit Criteria
- an employee can check in and out
- leave request can be submitted and approved
- attendance records are auditable

---

## Week 7 — Payroll Foundation and Validation

### Objective
Prepare the payroll engine for calculation and reporting.

### Deliverables
- salary and pay rule setup
- payroll run generation
- pay summary calculations
- reports and export

### Tasks
- define payroll rule structure
- build pay period generation
- combine attendance + leave + overtime
- compute employee totals
- generate payslip skeleton
- validate sample payroll cases

### Exit Criteria
- payroll run can be generated for a period
- calculations can be reviewed before approval
- basic export works for CSV or PDF

---

## Week 8 — QA, Hardening, and Go-Live Preparation

### Objective
Stabilize the product and prepare release.

### Deliverables
- test coverage for core flows
- edge case handling
- deployment checklist
- production runbook

### Tasks
- run E2E validation across inbox, webhook, broadcast, schedule, payroll
- fix bugs and edge cases
- review permission and data access rules
- verify deployment to staging
- create user onboarding documentation
- generate final operational checklist

### Exit Criteria
- all critical user flows pass test scenarios
- staging deployment is stable
- release checklist is ready
- team can support the system in production

---

## 4. Workstreams

### Workstream A — Messaging Platform
- provider integration
- message ingestion
- inbox UI
- auto responder
- broadcast

### Workstream B — Agent Operations
- queue assignment
- locks and duplicate protection
- conversation notes
- SLA and productivity metrics

### Workstream C — Workforce Management
- schedules
- attendance
- leave
- shift swap

### Workstream D — Payroll
- rules and pay calculations
- payroll runs
- payslips
- exports and reports

---

## 5. Milestones

### Milestone 1: Messaging MVP (End of Week 4)
- inbound messages work
- agent replies work
- auto response works
- broadcast works

### Milestone 2: Operations MVP (End of Week 6)
- schedule and attendance basics work
- leave workflow works
- team calendar and logs available

### Milestone 3: Payroll Ready (End of Week 8)
- payroll calculations are workable
- payslips can be generated
- product can be demoed or released to pilot users

---

## 6. Risk Management

### Risks
- provider API limits and message retries
- duplicate message ingestion
- missing business rules for scheduling
- payroll mistakes due to logic drift

### Mitigations
- use idempotency keys and dedupe checks
- confirm all message events with provider metadata
- validate time calculations with sample scenarios
- keep payroll logic review-driven and test-heavy

---

## 7. Recommended Team Split

### Backend
- webhook integrations
- message processing
- database and auth
- APIs

### Frontend
- inbox UI
- schedule UI
- attendance UI
- payroll views

### QA / Product
- acceptance tests
- workflow validation
- bug triage
- release checklist

---

## 8. Success Criteria

The project is considered successful when:
- live inbox works for all supported channels
- agents can assign and reply without duplication
- auto response works reliably
- broadcast campaigns can be executed
- staff schedules and attendance are visible
- payroll summaries can be generated with confidence

---

## 9. Closing Recommendation

The first 4 weeks should focus on messaging platform readiness; the next 4 weeks should build the operational core around scheduling, attendance, and payroll. This keeps the project realistic and ensures the foundation is strong before adding workforce complexity.
