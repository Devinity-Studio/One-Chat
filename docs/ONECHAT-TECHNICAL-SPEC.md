# OneChat — Technical Specification

## 1. System Purpose

OneChat is a unified inbox and automation platform for customer-facing conversations across multiple channels. The system receives inbound messages, normalizes them into a common schema, stores them in Supabase, and allows agents to respond through the correct channel.

---

## 2. Functional Modules

### 2.1 Provider Management
- Each provider represents an account or brand
- Supported channel types:
  - line
  - telegram
  - facebook
- Credentials are stored as JSONB per provider

### 2.2 Customer Management
- One customer record per provider + external user id
- Stores display name, username, phone, picture, external id

### 2.3 Conversation Management
- One conversation per customer-provider pair
- Tracks status, mode, assignee, unread count, last message timestamp
- Used for queue assignment and agent lock logic

### 2.4 Message Logging
- Records all inbound and outbound messages
- Stores external message ids for dedupe and traceability
- Supports content, media URLs, message types

### 2.5 Template Engine
- `auto_response` templates match text keywords
- `canned_response` templates support quick replies
- `flex_broadcast` and other content types may be added later

### 2.6 Broadcast Engine
- Campaigns can target providers and audiences
- Broadcast status lifecycle: `draft` -> `scheduled` -> `sending` -> `sent` / `failed`
- Multi-channel dispatch logic separates channel-specific APIs

### 2.7 Access Control
- Agent access is granted via `agent_providers`
- Admin has global visibility
- RLS ensures only provider-scoped data is visible

### 2.8 Realtime UI
- `messages` and `conversations` are exposed through Realtime publication
- UI can subscribe and render live updates

---

## 3. Entity Definitions

### 3.1 providers
Fields:
- id
- name
- channel_type
- external_account_id
- credentials
- color_hex
- api_status
- created_at

Constraints:
- unique `(channel_type, external_account_id)`

### 3.2 agents
Fields:
- id
- auth_user_id
- display_name
- email
- role
- created_at

### 3.3 agent_providers
Composite PK:
- agent_id
- provider_id

### 3.4 customers
Fields:
- id
- provider_id
- external_user_id
- username
- display_name
- picture_url
- phone
- joined_at

Unique:
- `(provider_id, external_user_id)`

### 3.5 conversations
Fields:
- id
- customer_id
- provider_id
- status
- mode
- assignee_id
- unread_count
- last_message_at
- notes
- created_at

### 3.6 messages
Fields:
- id
- conversation_id
- sender_type
- sender_id
- message_type
- content
- media_url
- external_message_id
- created_at

### 3.7 templates
Fields:
- id
- type
- name
- payload
- keyword
- shortcode
- created_by
- updated_at

### 3.8 broadcasts
Fields:
- id
- template_id
- name
- status
- scheduled_at
- sent_at
- target_reach
- created_by
- created_at

---

## 4. Business Logic Requirements

### 4.1 Inbound Request Normalization
Incoming event payload from each provider must be translated into a consistent internal format:
- provider_id
- customer external id
- conversation id
- message text or media
- sender type
- channel metadata

### 4.2 Deduplication
Message delivery may be retried by the platform provider. To avoid duplicate inserts:
- use `external_message_id`
- check before insert or use DB unique constraint if extended later

### 4.3 Auto-responder Rules
When text is received:
1. resolve providerId
2. load all auto_response templates for that provider
3. match keyword or condition
4. send reply using channel-specific API
5. log response as `bot` message

### 4.4 Agent Reply Rules
An agent response must:
- resolve provider by conversation context
- determine channel type
- select proper send method (LINE / Telegram / Facebook)
- save outbound message in `messages`

### 4.5 Conversation Assignment Rules
When conversation is unassigned:
- assign to available agent based on round robin or least loaded rule
- if no agent available, keep queued
- if agent claims manually, it changes ownership explicitly

### 4.6 Conversation Locking Rules
- If a conversation is assigned to another agent, it is effectively locked for editing
- Current agent may only claim or respond to their own assigned cases
- `claimConversation()` is used to switch ownership

---

## 5. API & Integration Contracts

### 5.1 Webhook Endpoint
Path:
- `?channel=line&providerId=<id>`
- `?channel=telegram&providerId=<id>`
- `?channel=facebook&providerId=<id>`

Expected behavior:
- handle POST request
- parse payload
- normalize into internal event
- call helper to upsert customer and message

### 5.2 Provider Credentials
Each provider stores credentials in JSONB:

LINE:
```json
{
  "channel_secret": "...",
  "access_token": "..."
}
```

Telegram:
```json
{
  "bot_token": "..."
}
```

Facebook:
```json
{
  "page_access_token": "...",
  "app_secret": "...",
  "verify_token": "..."
}
```

### 5.3 Response Methods
- `lineReply()`
- `linePush()`
- `telegramSend()`
- `facebookSend()`
- `sendToChannel()` dispatcher

---

## 6. Non-Functional Requirements

### 6.1 Performance
- Read operations should be efficient via indexes on provider_id and assignee_id
- Message insertion should be lightweight and transaction-safe
- Use batch sends for broadcast if volume grows

### 6.2 Reliability
- Handle provider rate limits gracefully
- Avoid duplicate messages in retries
- Log failed sends and set provider `api_status`

### 6.3 Scalability
- Replacing Apps Script with backend service is recommended for scale
- Consider introducing queue workers for broadcast and bot dispatch

### 6.4 Observability
- Track send failures
- Record dead-letter payloads
- Capture inbound event counts by provider

---

## 7. Security Model

- Service-role access only in backend code
- UI and client must never expose secret tokens
- Use Supabase Auth and RLS for user identity
- Provider scopes must be enforced per agent
- Sensitive data should be masked per role

---

## 8. Recommended Future Implementation Pattern

For long-term production readiness, shift from:
- Apps Script as the main logic layer

to:
- Node.js / TypeScript API server
- Supabase/Postgres for persistence
- Edge Functions or workers for async sending
- Frontend in React/Next.js

This reduces the risk of quota exhaustion and improves testability.

---

## 9. Acceptance Checklist

The system is considered complete for MVP when:
- All three channel types can create conversation records
- Message history is stored and queryable
- Auto response matches configured keywords
- Agent can assigned/reply/close conversation
- Broadcast can send to target provider set
- RLS blocks unauthorized access
- Realtime updates are visible in the UI

---

## 10. Tech Debt Notes

Current version is functional for prototype and demo but still carries trade-offs:
- hardcoded UI logic for agents and assignment simulation
- Apps Script is not ideal for enterprise-scale orchestration
- schedule and payroll modules are not designed yet
- product and WFM logic should be separated from channel integration logic

---

## 11. Summary

OneChat is built around a unified messaging architecture with provider-scoped access, conversation automation, and template-based broadcast functions. Its architecture is strong enough to evolve into a broader customer operations system, especially when expanded with workforce management, attendance, and payroll modules.
