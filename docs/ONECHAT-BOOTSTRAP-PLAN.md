# OneChat — Project Bootstrap & Product Blueprint

## 1. วัตถุประสงค์ของโปรเจกต์

OneChat คือระบบศูนย์จัดการข้อความแบบ Omnichannel สำหรับธุรกิจที่ต้องรับและตอบลูกค้าในหลายช่องทางพร้อมกัน เช่น LINE Official Account, Telegram Bot, Facebook Messenger ภายใต้ Inbox เดียว และมีความสามารถต่อยอดเป็นระบบจัดการทีมและการทำงาน เช่น auto assignment, broadcast, template management, workforce management, และ payroll บนโครงสร้างเดียวกัน

เป้าหมายหลัก:
- จัดการข้อความลูกค้าแบบรวมศูนย์
- ลดเวลาในการตอบกลับผ่าน auto bot
- เพิ่มประสิทธิภาพการทำงานของทีม Call Center / Customer Care
- รองรับการขยายเป็น Workforce Management และ HR Ops ในอนาคต

---

## 2. สถานะปัจจุบันของโครงการ

โครงการนี้อยู่ในช่วง MVP / Core Platform:
- มีระบบ Inbox หลัก
- มี webhook gateway รับข้อมูลจากหลายช่องทาง
- มี database schema สำหรับ providers, customers, conversations, messages, templates, broadcasts
- มี auto responder และ broadcast
- มี auto assignment แบบ mock / prototype

สิ่งที่ยังไม่ได้พัฒนาเป็น production-grade:
- เวลาเข้า-ออกงาน / shift planner
- จองวันหยุด
- สลับตาราง / rota
- คำนวณเงินเดือน / payroll
- Workflow lock / approval / audit log แบบ enterprise

สรุป: โครงการนี้พร้อมสำหรับพัฒนาต่อยอดเป็นระบบ Omnichannel + Agent Ops ได้ดี แต่ยังไม่ใช่ระบบ WFM/HR ที่สมบูรณ์แบบ

---

## 3. ขอบเขตระบบ (Scope)

### 3.1 Core Modules ที่มีอยู่แล้ว
- Multi-channel messaging
- Unified inbox
- Auto responder by keyword
- Broadcast message
- Template/content management
- Customer tagging
- Providers and agent access control
- Realtime message updates

### 3.2 Modules ที่กำลังจะพัฒนาต่อ
- Agent scheduling
- Shift rotation
- Work block / task assignment
- Leave & holiday booking
- Time log / attendance
- Payroll and wage computation
- Team performance analytics

### 3.3 Out of Scope ใน MVP
- AI chatbot แบบ multimodal ปรับมุมมองจริง ๆ
- Voice call center
- Social media inbox อื่น ๆ ที่ยังไม่ระบุ
- E-invoice / accounting system integration

---

## 4. โครงสร้างระบบโดยรวม

### 4.1 Architecture Overview

Client / Agent UI
  -> Supabase Frontend App / Web Console
  -> Realtime subscriptions
  -> REST API endpoints
  -> Postgres Database

External channel events
  -> LINE / Telegram / Facebook webhook
  -> Google Apps Script / Webhook Gateway
  -> Normalize data
  -> Upsert customer / conversation / message
  -> Trigger bot / template / broadcast logic

Core services:
- Event ingestion
- Provider auth and credentials
- Message normalization
- Auto response
- Broadcast sender
- Conversation assignment
- Agent role & policy enforcement

---

## 5. Recommended Stack

### Frontend
- HTML / JavaScript prototype (current state)
- พัฒนาเป็น React / Next.js หรือ Vite ในรุ่นต่อไป
- UI library เช่น Tailwind CSS, Chakra UI, MUI

### Backend
- Google Apps Script (current gateway)
- พัฒนาต่อเป็น Node.js / Supabase Edge Functions / Cloud Functions

### Database
- Supabase Postgres
- Realtime enabled
- Row Level Security enabled

### Integration
- LINE Messaging API
- Telegram Bot API
- Meta Messenger Graph API

### Monitoring / Ops
- Supabase logs
- Apps Script execution logs
- Sentry / LogRocket (recommended)

---

## 6. Architecture Details

### 6.1 System Layers
1. Input Layer
   - Webhooks from each channel
2. Integration Layer
   - Normalize event
   - Validate provider and credentials
3. Business Layer
   - Auto-responder, broadcast, routing, assignment
4. Persistence Layer
   - Supabase Postgres
5. Presentation Layer
   - Agent inbox UI
6. Analytics Layer
   - Dashboard, KPI, summary views

### 6.2 Data Flow
1. Message arrives from LINE/Telegram/Facebook
2. Apps Script receives event
3. Event is normalized into unified message format
4. Customer and conversation are upserted
5. Auto responder checks template keywords
6. If needed, send response
7. Agent UI receives update in realtime
8. Admin can assign, tag, or broadcast

---

## 7. Functional Requirements

### 7.1 User Roles
- Admin
  - Manage providers
  - View all data
  - Manage access and permissions
  - Create templates and broadcasts
- Agent
  - Handle assigned conversations
  - Reply to customer
  - Change conversation status
  - View assigned metrics
- Supervisor
  - Monitor queue and SLA
  - Review team performance
  - Adjust assignments

### 7.2 Conversation Workflow
- Incoming message creates or resumes conversation
- Conversation is assigned automatically or manually
- Message is stored with sender_type and external_message_id
- Agent replies through selected channel
- Conversation status updated to done / follow_up / in_progress

### 7.3 Bot Workflow
- Trigger when message matches template keyword
- Response uses configured payload
- Bot can operate in manual or automatic mode

### 7.4 Broadcast Workflow
- Select template
- Select audience segment
- Schedule or send immediately
- Track provider-level reach and status

### 7.5 Future WFM Workflow (Planned)
- Employee assigned to shift schedule
- Work hours recorded by clock-in and clock-out
- Leave requests approved/denied
- Shift swap requests submitted
- Payroll runs using time logs + salary rules

---

## 8. Data Model Requirements

### 8.1 Existing Core Tables
- providers
- agents
- agent_providers
- customers
- tags
- customer_tags
- conversations
- messages
- templates
- template_providers
- broadcasts
- broadcast_providers

### 8.2 Planned Tables for Expansion
- employees
- schedules
- shifts
- shift_assignments
- attendance_logs
- leave_requests
- time_blocks
- payroll_runs
- payroll_items
- overtime_rules
- work_status

### 8.3 Example Future WFM Model
- employees: personal data, role, salary, work pattern
- schedules: date, week, team, status
- shifts: start time, end time, break, type
- shift_assignments: employee_id + shift_id
- attendance_logs: check_in, check_out, late, absent
- leave_requests: date range, reason, status, approved_by
- payroll_runs: pay period, total amount, status

---

## 9. Security Requirements

- Store credentials in encrypted secret storage, never directly on frontend
- Use Supabase service role only in server-side code
- Restrict RLS by provider ownership
- Mask customer phone or sensitive info in agent views if needed
- Log all message sends and bot responses for auditing

---

## 10. Deployment Checklist

### Environment Setup
- Supabase project created
- Postgres schema imported
- Authentication enabled
- Realtime enabled
- Storage configured if media attachments are needed

### Integration Setup
- LINE OA credential configured
- Telegram bot token configured
- Facebook app token configured
- Webhook URL deployed

### Web / App Setup
- Frontend deployed on hosting or local environment
- Webhook server deployed
- Environment variables stored securely

### QA Checklist
- Inbound message test
- Outbound reply test
- Auto responder test
- Broadcast test
- Assign and claim conversation test
- Realtime update test

---

## 11. Implementation Roadmap

### Phase 1 — MVP Messaging Platform
- Unified inbox
- Multi-channel webhook ingestion
- Agent assignment
- Auto response
- Broadcast
- Tag system

### Phase 2 — Agent Ops & Workflow
- Work queues and priority rules
- Team performance dashboard
- SLA timers
- Team dashboard and notes

### Phase 3 — Workforce Management
- Shift creation
- Schedule rotation
- Attendance logs
- Leave request management
- Shift swap request system

### Phase 4 — Payroll & Finance
- Salary input and payroll rules
- Overtime calculation
- Payslip generation
- Export to CSV / PDF / Excel

### Phase 5 — AI & Automation
- Intelligent routing
- Smart auto response
- Lead scoring
- Customer sentiment classification

---

## 12. Risks & Constraints

- Apps Script is convenient but not ideal for scale; use serverless backend later
- Real-time data and broadcast can trigger quota limits at scale
- Multi-provider credential management must be strict
- Data privacy and consent must be designed from the beginning
- Shift and payroll logic require strong validation to avoid disputes

---

## 13. Acceptance Criteria

### Core OmniChannel
- User can receive messages from LINE/Telegram/Facebook in one inbox
- Conversation is linked to correct provider and customer
- Agent can claim and reply to a conversation
- Auto response works by keyword
- Broadcast is scheduleable and tracked

### WFM Expansion
- Employees can be assigned to schedules
- Shift swaps are managed with validation
- Attendance records can be logged correctly
- Leaves can be requested and approved
- Payroll can be generated by pay period

---

## 14. Recommended Next Step

เริ่มพัฒนาต่อจากโครงการปัจจุบันโดยแบ่งเป็นสองเส้น:
1. Stabilize current messaging platform as production-ready MVP
2. Build WFM module on top of same identity and provider model

เป็นแนวทางที่ลดความเสี่ยงและคงโครงสร้างระบบให้ต่อยอดได้ง่าย

---

## 15. Deliverables ที่ควรสร้างต่อจากนี้

- Frontend app with production-grade UI
- API service layer for message routing
- Scheduled service for broadcast and bot logic
- WFM schema for employees, shifts, leave, and payroll
- Admin dashboard for operations and KPI

---

## 16. Summary

OneChat เป็นโครงการที่มีฐานถูกต้องสำหรับการพัฒนาเป็นระบบ Omnichannel Customer Support ที่แข็งแกร่ง และสามารถขยายต่อไปสู่ Workforce Management และ Payroll ได้ด้วยโครงสร้างข้อมูลและไลฟ์ไซเคิลที่กำหนดไว้แล้ว

The real opportunity is to evolve from a communication hub into a full operations platform for customer service teams.
