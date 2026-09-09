# OneChat — Development Roadmap

## Vision

OneChat should evolve from a multi-channel chat inbox into a full customer operations platform for service teams, including agent work management, schedule control, attendance, leave, and payroll.

---

## Phase 0 — Stabilize Current MVP

Goals:
- Production-safe deployment
- Clear provider credential management
- Error logging and retry handling
- Automated tests for webhook ingestion

Deliverables:
- Production-grade webhook service
- Better env configuration
- Monitoring and health endpoints
- Message dedupe validation

---

## Phase 1 — Core Inbox Optimization

Goals:
- Improve agent productivity
- Add better queue handling and SLA rules
- Enhance customer and conversation indexing

Features:
- assign conversation by skill or queue
- status filters and search by customer name/pattern
- note taking and tagging details
- dashboard overview for agents and supervisors

---

## Phase 2 — Automation & Content Platform

Goals:
- Bring content and bot logic under one management layer

Features:
- template approval workflow
- response testing environment
- keyword management UI
- broadcast audience segmentation
- content versioning

---

## Phase 3 — Workforce Management

Goals:
- Add employee scheduling and shift management

Planned modules:
- employees
- schedules
- shifts
- shift swaps
- leave booking
- attendance logs

Functional rules:
- employee can have one active schedule for a period
- shift assignment must not overlap without validation
- leave requests require approval
- shift swap requires supervisor approval if same team/responsibility

---

## Phase 4 — Attendance & Time Tracking

Goals:
- Record actual working time accurately

Planned features:
- clock in / clock out
- break timers
- overtime rules
- late/early leave detection
- daily summary + attendance exceptions

---

## Phase 5 — Payroll & Compensation

Goals:
- Turn recorded hours into payroll calculations

Planned features:
- base salary / hourly wage setup
- attendance-based deductions
- overtime multiplier
- payroll run generation
- payslip export and approval

---

## Phase 6 — Analytics & Supervisory Intelligence

Goals:
- Support team and business decisions

Planned features:
- response time by agent
- conversation resolved rate
- backlog by channel
- agent utilization
- customer sentiment / satisfaction metrics
- productivity comparison across teams

---

## Phase 7 — AI Enhancement

Goals:
- Reduce repetitive work

Possible features:
- auto-categorize incoming messages
- smart triage and routing
- recommended response generation
- risk or fraud detection
- next-best-action assistance for agents

---

## Milestone Summary

### Milestone 1: MVP Ready
- Multi-channel inbox
- Auto reply
- Broadcast
- Assignment
- Realtime updates

### Milestone 2: Operations Ready
- Supervisor dashboard
- SLA management
- Search & filtering
- Template approval flow

### Milestone 3: WFM Ready
- Shift schedule management
- Attendance tracking
- Leave handling
- Team calendar view

### Milestone 4: Payroll Ready
- Wage rules
- Payroll run
- Payslips
- Export & audit

---

## Recommended Delivery Strategy

Use 3 parallel tracks:
1. Messaging platform stabilization
2. Business operations features
3. Workforce/payroll expansion

This keeps the project modular while preserving the same core data model.

---

## Critical Design Decision

Do not build WFM and payroll directly into the initial channel layer. Instead, create a separate domain layer for workforce data, linked by agent_id and provider_id. This prevents the customer communication system from becoming tightly coupled to scheduling logic.

---

## Final Recommendation

Begin with a clean production-grade backend and UI modernization, then add workforce features as a second domain. This keeps the project maintainable and makes it easier to grow into a complete service operations platform.
