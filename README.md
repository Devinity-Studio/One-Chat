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
