# One-Chat — Omnichannel Chat Hub

แพลตฟอร์มรวมข้อความจากหลายช่องทาง (**LINE OA / Telegram Bot / Facebook Messenger**) ไว้ใน Unified Inbox เดียว พร้อม Auto-Responder, Broadcast, CDP/Tags และ Analytics

---

## 📁 Repository Structure

```
One-Chat/
├── src/                                      # Source code หลักของระบบ
│   ├── line-oa-hub-chat.html                 # Front-end UI (Single-file HTML)
│   ├── omnichannel-webhook.gs                # Google Apps Script Webhook Layer
│   └── supabase-schema.sql                   # Supabase Database Schema
└── docs/                                     # เอกสารประกอบโปรเจกต์
    ├── line-oa-hub-chat-design.pdf           # Design mockups (ภาพ UI ทั้งระบบ)
    ├── chat-center-source-snapshot.zip       # Snapshot ซอร์สโค้ดชุดปัจจุบัน (3 ไฟล์เดียวกับ src/)
    └── onechat-apps-script-legacy.zip        # เวอร์ชันเก่า (Apps Script แบบแย่ใน Sheet + AI Reply)
```

## 🏗️ Architecture

```
LINE OA ─┐                                    ┌──> Supabase (Postgres)
Telegram ─┼── Webhook ────> Google Apps Script ┤       │
Facebook ─┘   (?channel=&providerId=)        └──> Reply APIs ของแต่ละแพลตฟอร์ม
                                                    ↑
                              line-oa-hub-chat.html ┘ (Unified Inbox + Realtime)
```

### Components

| File | Role |
|------|------|
| `src/line-oa-hub-chat.html` | หน้าจอ Unified Inbox — rail nav (แชท / บอร์ดแคสต์ / ริชเมนู / ผู้ติดตาม / ตั้งค่า), provider filter, quick reply panel |
| `src/omnichannel-webhook.gs` | Webhook gateway รับ event จาก 3 ช่องทาง แปลงเป็นรูปแบบเดียว บันทึกลง Supabase + ส่งต่อ Auto-Responder / Broadcast |
| `src/supabase-schema.sql` | 11 sections: providers, agents, customers, tags, conversations, messages, templates, broadcasts, analytics views, RLS policies, realtime publication |

### Data Flow

1. **Inbound** — ผู้ใช้ส่งข้อความเข้าช่องทางใดก็ได้ → แพลตฟอร์มยิง webhook มาที่ Apps Script (`doPost`) โดยแยกช่องทางด้วย query param `?channel=line|telegram|facebook&providerId=...`
2. **Normalize** — Apps Script แปลง event ให้เป็นรูปแบบเดียวกัน (sender_type / message_type / content / media_url) แล้ว upsert `customers` + `conversations` + insert `messages` ผ่าน Supabase REST API (service_role)
3. **Auto-Responder** — ถ้า conversation อยู่โหมด `bot` จะเช็ค keyword กับตาราง `templates` แล้วตอบกลับผ่าน API ของช่องทางนั้น ๆ (LINE Reply / Telegram sendMessage / Graph API)
4. **Agent Reply** — แอดมินตอบจากหน้า UI ผ่าน `sendAgentMessage()` → dispatcher เลือก API ตาม `channel_type` ของ provider
5. **Realtime** — UI subscribe ตาราง `messages` / `conversations` ผ่าน Supabase Realtime ทำให้ inbox อัปเดตทันที

### Database Highlights

- **Multi-provider** — 1 แพลตฟอร์มมีได้หลายบัญชี (หลายเพจ/หลายบอท) credentials เก็บใน `providers.credentials` (jsonb) ไม่ฝังในโค้ด
- **RLS** — agent เห็นเฉพาะ provider ที่ตัวเองดูแล (`agent_providers`), admin เห็นหมด
- **Auto-touch trigger** — insert message แล้วอัปเดต `last_message_at` / `unread_count` อัตโนมัติ
- **Analytics views** — `v_provider_dashboard` (ต่อ provider) และ `v_channel_summary` (ต่อช่องทาง)

## 🗄️ Database Schema

อ้างอิงจาก `src/supabase-schema.sql` — ทุกตารางใช้ `uuid` primary key (`gen_random_uuid()`) และ timestamp เป็น `timestamptz`

### Core Identity

#### `providers` — บัญชีแชทแต่ละ Brand (หลายบัญชีต่อแพลตฟอร์ม)

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `name` | text | ชื่อ brand เช่น `'Brand A · คาเฟ่กรีนลีฟ'` |
| `channel_type` | text | `line` \| `telegram` \| `facebook` (check constraint) |
| `external_account_id` | text | LINE Channel ID / Telegram bot username / Facebook Page ID |
| `credentials` | jsonb | credential ของแพลตฟอร์ม: `{channel_secret, access_token}` / `{bot_token}` / `{page_access_token, app_secret, verify_token}` |
| `color_hex` | text | สีแท็กแสดงใน UI |
| `api_status` | text | `connected` \| `token_expired` \| `error` |
| `created_at` | timestamptz | |

> Unique: `(channel_type, external_account_id)` — ป้องกันการ connect บัญชีเดิมซ้ำ

#### `agents` — แอดมิน/เจ้าหน้าที่

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `auth_user_id` | uuid → `auth.users` | ผูกกับ Supabase Auth (cascade delete) |
| `display_name` | text | |
| `email` | text unique | |
| `role` | text | `admin` \| `agent` |

#### `agent_providers` — สิทธิ์การดูแล (M2M)

PK `(agent_id, provider_id)` — agent 1 คนดูแลได้หลาย provider ข้ามช่องทาง (ใช้เป็นเงื่อนไขของ RLS)

#### `customers` — ผู้ติดตามต่อ Provider

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `provider_id` | uuid FK cascade | |
| `external_user_id` | text | LINE `userId` (Uxxx…) / Telegram `chat_id` / Facebook PSID |
| `username` | text | Telegram `@username` (ถ้ามี) |
| `display_name` | text | |
| `picture_url` / `phone` | text | |
| `joined_at` | timestamptz | |

> Unique: `(provider_id, external_user_id)` — index เพิ่มบน `provider_id`

### Chat Domain

#### `conversations` — สถานะการสนทนาต่อ 1 ลูกค้า

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `customer_id` / `provider_id` | uuid FK cascade | |
| `status` | text | `unassigned` \| `in_progress` \| `follow_up` \| `done` |
| `mode` | text | `bot` (auto-responder ทำงาน) \| `manual` (แอดมินตอบเอง) |
| `assignee_id` | uuid → `agents` | |
| `unread_count` | int | นับข้อความจาก customer ที่ยังไม่อ่าน |
| `last_message_at` | timestamptz | ใช้ sort ใน inbox |
| `notes` | text | |

> Indexes: `provider_id`, `assignee_id`, `status`

#### `messages` — ข้อความในแชท

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `conversation_id` | uuid FK cascade | |
| `sender_type` | text | `customer` \| `agent` \| `bot` \| `system` |
| `sender_id` | uuid → `agents` | null ถ้าเป็น customer/bot/system |
| `message_type` | text | `text` \| `image` \| `sticker` \| `flex` \| `video` \| `file` \| `coupon` |
| `content` | text | ข้อความ หรือ JSON ของ Flex Message |
| `media_url` | text | |
| `external_message_id` | text | id จากแพลตฟอร์มต้นทาง (LINE message id / Telegram message_id / FB `mid`) ใช้ dedupe |

> Index: `(conversation_id, created_at)` · **Trigger** `trg_touch_conversation` — insert ข้อความแล้วอัปเดต `last_message_at` + `unread_count` อัตโนมัติ

### Content & Campaign

#### `templates` — Template กลาง

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `type` | text | `rich_menu` \| `welcome_message` \| `auto_response` \| `canned_response` \| `coupon` \| `flex_broadcast` |
| `name` | text | |
| `payload` | jsonb | เนื้อหาของ template (Flex JSON / ข้อความ / เงื่อนไข) |
| `keyword` | text | ใช้เมื่อ `type = auto_response` (Exact/Partial match เก็บใน payload) |
| `shortcode` | text | ใช้เมื่อ `type = canned_response` เช่น `/bank`, `/ship` |
| `created_by` | uuid → `agents` | |

#### `template_providers` — Apply template ไหนให้ provider ใดบ้าง (M2M)

PK `(template_id, provider_id)` — auto-responder ใช้ join ตารางนี้หา keyword ต่อ provider

#### `broadcasts` — แคมเปญส่งข้อความจำนวนมาก

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `template_id` | uuid → `templates` | |
| `name` | text | |
| `status` | text | `draft` \| `scheduled` \| `sending` \| `sent` \| `failed` |
| `scheduled_at` / `sent_at` | timestamptz | |
| `target_reach` | int | จำนวนผู้รับเป้าหมาย |

#### `broadcast_providers` — ผลลัพธ์ต่อ Provider

PK `(broadcast_id, provider_id)` + สถิติ `reach_count`, `open_count`, `click_count`

### CDP / Tags

#### `tags` & `customer_tags`

- `tags` — `label` (unique เช่น `#VIP`, `#รอเสนอราคา`), `color_bg`, `color_text`
- `customer_tags` — PK `(customer_id, tag_id)`, `tagged_at` — ใช้ segment audience สำหรับ broadcast

### Views & Security

**Views**

| View | คำอธิบาย |
|------|----------|
| `v_provider_dashboard` | สรุปต่อ provider: total_customers, unread_conversations, unassigned_conversations |
| `v_channel_summary` | สรุปรวมแยกตาม `channel_type` (LINE / Telegram / Facebook) |

**Row Level Security** — เปิดบน `conversations`, `messages`, `customers`

| Policy | ผลลัพธ์ |
|--------|----------|
| agents see only their assigned providers | agent (ผ่าน `agent_providers`) เห็นเฉพาะ provider ที่ตัวเองดูแล — `admin` เห็นทุก provider |
| agents see messages of accessible conversations | ข้อความถูกจำกัดต่อจาก RLS ของ `conversations` |
| agents see customers of accessible providers | ข้อมูลลูกค้าจำกัดตาม provider ที่ดูแล |

**Realtime** — `messages` และ `conversations` ถูกเพิ่มใน publication `supabase_realtime` เพื่อให้หน้าจอ Live Chat subscribe ได้ทันที

## 🚀 Setup

### 1. Database (Supabase)

1. สร้างโปรเจกต์ใหม่บน [Supabase](https://supabase.com)
2. เปิด **SQL Editor** แล้วรัน `src/supabase-schema.sql` ทั้งไฟล์ (idempotent — รันซ้ำได้)

### 2. Webhook (Google Apps Script)

1. สร้าง Apps Script ใหม่ แล้ววางโค้ดจาก `src/omnichannel-webhook.gs`
2. ตั้งค่า **Script Properties**:

   | Property | ค่า |
   |----------|-----|
   | `SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `SUPABASE_SERVICE_KEY` | service_role key (**เก็บเป็นความลับ ห้ามฝัง client-side**) |
   | `FB_VERIFY_TOKEN` | ค่าที่ตั้งเองสำหรับ verify Facebook webhook |

3. **Deploy → New deployment → Web app** แล้ว copy URL
4. ผูก webhook ต่อช่องทาง:
   - **LINE** — ตั้ง webhook URL ใน LINE Developers Console: `<webAppUrl>?channel=line&providerId=<id>`
   - **Telegram** — รัน `telegramSetWebhook(providerId, webAppUrl)` จาก Apps Script editor ครั้งเดียว
   - **Facebook** — ตั้งใน Meta App Dashboard → Messenger → Webhooks: `<webAppUrl>?channel=facebook&providerId=<id>`

   > `providerId` ได้จากแถวในตาราง `providers` หลังเพิ่มบัญชี (credentials ของแต่ละบัญชีเก็บในคอลัมน์ `credentials`)

### 3. Front-end

`src/line-oa-hub-chat.html` เป็น single-file HTML — เปิดในเบราเซอร์ได้ทันที หรือนำไปฝังใน Hosting ใดก็ได้ เชื่อมต่อ Supabase ผ่าน REST + Realtime subscription

## 📚 Docs

| ไฟล์ | คำอธิบาย |
|------|----------|
| `docs/line-oa-hub-chat-design.pdf` | Design mockups ของ UI ทุกหน้าจอ (ภาพประกอบ) |
| `docs/chat-center-source-snapshot.zip` | Snapshot ซอร์สโค้ดชุดปัจจุบัน — เนื้อหาซ้ำกับ `src/` เก็บไว้อ้างอิงเวอร์ชัน |
| `docs/onechat-apps-script-legacy.zip` | เวอร์ชันแรกของระบบ (Main/Config/SheetDB/LineChannel/... แบบทำงานบน Google Sheet + AI Reply) เก็บไว้เป็นประวัติ |
