-- =========================================================
-- OMNICHANNEL CHAT HUB — Supabase Schema
-- ครอบคลุม: Multi-Provider (LINE / Telegram / Facebook Messenger),
-- Unified Inbox, Auto-Responder, Global Template, Broadcast, CDP/Tags, Analytics
-- =========================================================

-- ---------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- 1. PROVIDERS (บัญชีแชทแต่ละ Brand ไม่ว่าจะเป็นช่องทางใด)
-- ---------------------------------------------------------
create table providers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                  -- เช่น 'Brand A · คาเฟ่กรีนลีฟ'
  channel_type  text not null check (channel_type in ('line','telegram','facebook')),
  external_account_id text not null,             -- LINE Channel ID / Telegram Bot Username / Facebook Page ID
  -- เก็บ credential เฉพาะของแต่ละแพลตฟอร์มไว้ใน JSONB เพราะ field ไม่เหมือนกัน:
  --   line:      { "channel_secret": "...", "access_token": "..." }
  --   telegram:  { "bot_token": "..." }
  --   facebook:  { "page_access_token": "...", "app_secret": "...", "verify_token": "..." }
  credentials   jsonb not null default '{}'::jsonb,
  color_hex     text default '#06C755',          -- สีแท็กสำหรับ UI
  api_status    text not null default 'connected'
                check (api_status in ('connected','token_expired','error')),
  created_at    timestamptz not null default now(),
  unique (channel_type, external_account_id)
);

comment on table providers is 'บัญชีแชทแต่ละ Brand/Provider ครอบคลุมได้หลายช่องทาง (LINE OA / Telegram Bot / Facebook Page)';

-- ---------------------------------------------------------
-- 2. AGENTS (แอดมิน/เจ้าหน้าที่)
-- ---------------------------------------------------------
create table agents (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid references auth.users(id) on delete cascade,
  display_name  text not null,
  email         text unique,
  role          text not null default 'agent' check (role in ('admin','agent')),
  created_at    timestamptz not null default now()
);

-- แอดมินคนหนึ่งดูแลได้หลาย Provider (ข้ามช่องทางได้)
create table agent_providers (
  agent_id      uuid references agents(id) on delete cascade,
  provider_id   uuid references providers(id) on delete cascade,
  primary key (agent_id, provider_id)
);

-- ---------------------------------------------------------
-- 3. CUSTOMERS (ผู้ติดตามต่อ Provider ไม่ว่าจะช่องทางใด)
-- ---------------------------------------------------------
create table customers (
  id            uuid primary key default gen_random_uuid(),
  provider_id   uuid not null references providers(id) on delete cascade,
  -- external_user_id ตามช่องทาง:
  --   line:      userId (Uxxxxxxxx...)
  --   telegram:  chat_id (ตัวเลข)
  --   facebook:  PSID (Page-Scoped User ID)
  external_user_id text not null,
  username      text,                            -- Telegram @username (ถ้ามี)
  display_name  text,
  picture_url   text,
  phone         text,
  joined_at     timestamptz default now(),
  unique (provider_id, external_user_id)
);

create index idx_customers_provider on customers(provider_id);

-- ---------------------------------------------------------
-- 4. TAGS & CUSTOMER_TAGS (CDP: Audience Segmentation)
-- ---------------------------------------------------------
create table tags (
  id            uuid primary key default gen_random_uuid(),
  label         text not null unique,             -- เช่น '#VIP', '#รอเสนอราคา'
  color_bg      text default '#E6F8ED',
  color_text    text default '#049146'
);

create table customer_tags (
  customer_id   uuid references customers(id) on delete cascade,
  tag_id        uuid references tags(id) on delete cascade,
  tagged_at     timestamptz default now(),
  primary key (customer_id, tag_id)
);

-- ---------------------------------------------------------
-- 5. CONVERSATIONS (สถานะการสนทนาต่อ 1 ลูกค้า)
-- ---------------------------------------------------------
create table conversations (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references customers(id) on delete cascade,
  provider_id   uuid not null references providers(id) on delete cascade,
  status        text not null default 'unassigned'
                check (status in ('unassigned','in_progress','follow_up','done')),
  mode          text not null default 'bot' check (mode in ('bot','manual')),
  assignee_id   uuid references agents(id),
  unread_count  int not null default 0,
  last_message_at timestamptz default now(),
  notes         text,
  created_at    timestamptz not null default now()
);

create index idx_conversations_provider on conversations(provider_id);
create index idx_conversations_assignee on conversations(assignee_id);
create index idx_conversations_status on conversations(status);

-- ---------------------------------------------------------
-- 6. MESSAGES (ข้อความในแชท)
-- ---------------------------------------------------------
create table messages (
  id            uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_type   text not null check (sender_type in ('customer','agent','bot','system')),
  sender_id     uuid references agents(id),        -- null ถ้าเป็นลูกค้า/บอท/ระบบ
  message_type  text not null default 'text'
                check (message_type in ('text','image','sticker','flex','video','file','coupon')),
  content       text,                                -- ข้อความ หรือ JSON ของ Flex Message
  media_url     text,
  external_message_id text,                          -- อ้างอิงกลับไปยัง message id ของแพลตฟอร์มต้นทาง (LINE/Telegram/Facebook)
  created_at    timestamptz not null default now()
);

create index idx_messages_conversation on messages(conversation_id, created_at);

-- trigger: อัปเดต last_message_at + unread_count อัตโนมัติ
create or replace function fn_touch_conversation() returns trigger as $$
begin
  update conversations
    set last_message_at = new.created_at,
        unread_count = case when new.sender_type = 'customer'
                             then unread_count + 1 else unread_count end
    where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_touch_conversation
after insert on messages
for each row execute function fn_touch_conversation();

-- ---------------------------------------------------------
-- 7. GLOBAL TEMPLATES (Template กลาง: Rich Menu, Welcome,
--    Auto-Responder, Canned Response, Coupon)
-- ---------------------------------------------------------
create table templates (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in
                ('rich_menu','welcome_message','auto_response','canned_response','coupon','flex_broadcast')),
  name          text not null,
  payload       jsonb not null,        -- เนื้อหา/โครงสร้างของ template (Flex JSON, ข้อความ, เงื่อนไข ฯลฯ)
  keyword       text,                  -- ใช้กับ type = auto_response (Exact/Partial match เก็บใน payload)
  shortcode     text,                  -- ใช้กับ type = canned_response เช่น '/bank' '/ship'
  created_by    uuid references agents(id),
  updated_at    timestamptz not null default now()
);

-- Apply Template ไปยัง Provider ไหนบ้าง (many-to-many)
create table template_providers (
  template_id   uuid references templates(id) on delete cascade,
  provider_id   uuid references providers(id) on delete cascade,
  applied_at    timestamptz default now(),
  primary key (template_id, provider_id)
);

-- ---------------------------------------------------------
-- 8. BROADCASTS (แคมเปญส่งข้อความจำนวนมาก)
-- ---------------------------------------------------------
create table broadcasts (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid references templates(id),
  name          text not null,
  status        text not null default 'draft'
                check (status in ('draft','scheduled','sending','sent','failed')),
  scheduled_at  timestamptz,
  sent_at       timestamptz,
  target_reach  int default 0,
  created_by    uuid references agents(id),
  created_at    timestamptz not null default now()
);

-- Broadcast ยิงไปยัง Provider ไหนบ้าง + สถิติต่อ Provider
create table broadcast_providers (
  broadcast_id  uuid references broadcasts(id) on delete cascade,
  provider_id   uuid references providers(id) on delete cascade,
  reach_count   int default 0,
  open_count    int default 0,
  click_count   int default 0,
  primary key (broadcast_id, provider_id)
);

-- ---------------------------------------------------------
-- 9. ANALYTICS VIEW (สรุปสถิติต่อ Provider แบบ real-time)
-- ---------------------------------------------------------
create or replace view v_provider_dashboard as
select
  p.id as provider_id,
  p.name,
  count(distinct c.id) as total_customers,
  count(distinct case when co.unread_count > 0 then co.id end) as unread_conversations,
  count(distinct case when co.status = 'unassigned' then co.id end) as unassigned_conversations
from providers p
left join customers c on c.provider_id = p.id
left join conversations co on co.provider_id = p.id
group by p.id, p.name;

-- สรุปภาพรวมแยกตามประเภทช่องทาง (LINE / Telegram / Facebook)
create or replace view v_channel_summary as
select
  p.channel_type,
  count(distinct p.id) as provider_count,
  count(distinct c.id) as total_customers,
  count(distinct case when co.unread_count > 0 then co.id end) as unread_conversations
from providers p
left join customers c on c.provider_id = p.id
left join conversations co on co.provider_id = p.id
group by p.channel_type;

-- ---------------------------------------------------------
-- 10. ROW LEVEL SECURITY (จำกัดสิทธิ์ตาม Provider ที่ดูแล)
-- ---------------------------------------------------------
alter table conversations enable row level security;
alter table messages enable row level security;
alter table customers enable row level security;

create policy "agents see only their assigned providers"
on conversations for select
using (
  provider_id in (
    select provider_id from agent_providers ap
    join agents a on a.id = ap.agent_id
    where a.auth_user_id = auth.uid()
  )
  or exists (select 1 from agents a where a.auth_user_id = auth.uid() and a.role = 'admin')
);

create policy "agents see messages of accessible conversations"
on messages for select
using (
  conversation_id in (select id from conversations)  -- ผ่าน RLS ของ conversations ต่ออีกที
);

create policy "agents see customers of accessible providers"
on customers for select
using (
  provider_id in (
    select provider_id from agent_providers ap
    join agents a on a.id = ap.agent_id
    where a.auth_user_id = auth.uid()
  )
  or exists (select 1 from agents a where a.auth_user_id = auth.uid() and a.role = 'admin')
);

-- ---------------------------------------------------------
-- 11. REALTIME (เปิดให้หน้าจอ Live Chat subscribe ได้ทันที)
-- ---------------------------------------------------------
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;
