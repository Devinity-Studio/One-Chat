/**
 * OMNICHANNEL CHAT HUB — Google Apps Script Webhook Layer
 * รองรับ 3 ช่องทาง: LINE OA / Telegram Bot / Facebook Messenger
 * รับ Event จากแต่ละแพลตฟอร์ม -> แปลงให้เป็นรูปแบบเดียวกัน -> เขียนเข้า Supabase
 *
 * ตั้งค่า Script Properties ก่อนใช้งาน:
 *   SUPABASE_URL          = https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY  = service_role key (เก็บเป็นความลับ ห้ามฝัง client-side)
 *   FB_VERIFY_TOKEN       = ค่าที่ตั้งเองสำหรับยืนยัน Facebook Webhook ตอน Subscribe
 *
 * Credential เฉพาะของแต่ละ Provider (access token ของ LINE/Telegram/Facebook)
 * ถูกเก็บไว้ใน Supabase ตาราง providers.credentials (jsonb) ไม่ใช่ Script Properties
 * เพราะต้องรองรับหลายบัญชีต่อ 1 แพลตฟอร์ม
 *
 * วิธีตั้ง Webhook URL ต่อ Provider:
 *   LINE       -> https://script.google.com/.../exec?channel=line&providerId=xxx
 *   Telegram   -> https://script.google.com/.../exec?channel=telegram&providerId=xxx
 *                 (ต้อง setWebhook ผ่าน Telegram Bot API ให้ชี้มาที่ URL นี้)
 *   Facebook   -> https://script.google.com/.../exec?channel=facebook&providerId=xxx
 *                 (ตั้งใน Meta App Dashboard > Messenger > Webhooks)
 */

const props = PropertiesService.getScriptProperties();
const SUPABASE_URL = props.getProperty('SUPABASE_URL');
const SUPABASE_KEY = props.getProperty('SUPABASE_SERVICE_KEY');
const FB_VERIFY_TOKEN = props.getProperty('FB_VERIFY_TOKEN');

/* =========================================================
 * ENTRY POINTS
 * =======================================================*/

/**
 * GET ใช้เฉพาะตอน Facebook ยืนยัน Webhook Subscription
 * (LINE/Telegram ไม่เรียก doGet)
 */
function doGet(e) {
  if (e.parameter['hub.mode'] === 'subscribe' &&
      e.parameter['hub.verify_token'] === FB_VERIFY_TOKEN) {
    return ContentService.createTextOutput(e.parameter['hub.challenge']);
  }
  return ContentService.createTextOutput('Omnichannel Hub Webhook Active');
}

/**
 * POST หลัก: ทุก Event จากทั้ง 3 แพลตฟอร์มเข้ามาที่นี่ แยกด้วย query param ?channel=
 */
function doPost(e) {
  const channel = e.parameter.channel;      // 'line' | 'telegram' | 'facebook'
  const providerId = e.parameter.providerId;
  const body = JSON.parse(e.postData.contents);

  try {
    switch (channel) {
      case 'line':
        body.events.forEach(ev => { if (ev.type === 'message') handleLineMessage(providerId, ev); });
        break;
      case 'telegram':
        handleTelegramUpdate(providerId, body);
        break;
      case 'facebook':
        body.entry.forEach(entry => {
          (entry.messaging || []).forEach(ev => { if (ev.message) handleFacebookMessage(providerId, ev); });
        });
        break;
      default:
        Logger.log('Unknown channel: ' + channel);
    }
  } catch (err) {
    Logger.log('Webhook error [' + channel + ']: ' + err);
  }

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

/* =========================================================
 * LINE HANDLERS
 * =======================================================*/

function handleLineMessage(providerId, event) {
  const token = getProviderCredential(providerId, 'access_token');
  const externalUserId = event.source.userId;
  const profile = JSON.parse(UrlFetchApp.fetch(
    `https://api.line.me/v2/bot/profile/${externalUserId}`,
    { headers: { Authorization: 'Bearer ' + token } }
  ).getContentText());

  const conversation = upsertCustomerAndConversation(providerId, externalUserId, {
    display_name: profile.displayName,
    picture_url: profile.pictureUrl
  });

  insertMessage(conversation.id, 'customer', mapLineType(event.message.type),
    event.message.text || null, null, event.message.id);

  if (conversation.mode === 'bot') {
    tryAutoResponder(providerId, conversation.id, event.message.text, {
      channel: 'line', replyToken: event.replyToken
    });
  }
}

function lineReply(providerId, replyToken, text) {
  const token = getProviderCredential(providerId, 'access_token');
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] })
  });
}

function linePush(providerId, externalUserId, text) {
  const token = getProviderCredential(providerId, 'access_token');
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify({ to: externalUserId, messages: [{ type: 'text', text }] })
  });
}

function mapLineType(t) {
  return { text: 'text', image: 'image', sticker: 'sticker', video: 'video', file: 'file' }[t] || 'text';
}

/* =========================================================
 * TELEGRAM HANDLERS
 * =======================================================*/

function handleTelegramUpdate(providerId, update) {
  const msg = update.message;
  if (!msg) return;

  const externalUserId = String(msg.chat.id);
  const conversation = upsertCustomerAndConversation(providerId, externalUserId, {
    display_name: [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' '),
    username: msg.from.username ? '@' + msg.from.username : null,
    picture_url: null // ต้องเรียก getUserProfilePhotos แยกถ้าต้องการรูป
  });

  const type = msg.text ? 'text' : msg.photo ? 'image' : msg.sticker ? 'sticker'
             : msg.video ? 'video' : msg.document ? 'file' : 'text';

  insertMessage(conversation.id, 'customer', type, msg.text || msg.caption || null,
    null, String(msg.message_id));

  if (conversation.mode === 'bot') {
    tryAutoResponder(providerId, conversation.id, msg.text, {
      channel: 'telegram', chatId: msg.chat.id
    });
  }
}

function telegramSend(providerId, chatId, text) {
  const token = getProviderCredential(providerId, 'bot_token');
  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text })
  });
}

/**
 * เรียกครั้งเดียวตอนตั้งค่า Provider ใหม่ เพื่อผูก Webhook URL เข้ากับ Telegram Bot
 */
function telegramSetWebhook(providerId, webAppUrl) {
  const token = getProviderCredential(providerId, 'bot_token');
  const url = `${webAppUrl}?channel=telegram&providerId=${providerId}`;
  UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ url })
  });
}

/* =========================================================
 * FACEBOOK MESSENGER HANDLERS
 * =======================================================*/

function handleFacebookMessage(providerId, event) {
  const token = getProviderCredential(providerId, 'page_access_token');
  const externalUserId = event.sender.id; // PSID

  const profile = JSON.parse(UrlFetchApp.fetch(
    `https://graph.facebook.com/${externalUserId}?fields=first_name,last_name,profile_pic&access_token=${token}`
  ).getContentText());

  const conversation = upsertCustomerAndConversation(providerId, externalUserId, {
    display_name: [profile.first_name, profile.last_name].filter(Boolean).join(' '),
    picture_url: profile.profile_pic
  });

  const msg = event.message;
  const type = msg.text ? 'text' : (msg.attachments && msg.attachments[0].type) || 'text';
  const mediaUrl = msg.attachments ? msg.attachments[0].payload.url : null;

  insertMessage(conversation.id, 'customer', type, msg.text || null, mediaUrl, msg.mid);

  if (conversation.mode === 'bot') {
    tryAutoResponder(providerId, conversation.id, msg.text, {
      channel: 'facebook', psid: externalUserId
    });
  }
}

function facebookSend(providerId, psid, text) {
  const token = getProviderCredential(providerId, 'page_access_token');
  UrlFetchApp.fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({ recipient: { id: psid }, message: { text } })
  });
}

/* =========================================================
 * SHARED LOGIC (channel-agnostic)
 * =======================================================*/

/**
 * หา/สร้าง customer + conversation ให้ ไม่ว่าจะมาจากช่องทางไหน
 */
function upsertCustomerAndConversation(providerId, externalUserId, profileFields) {
  const customer = supabaseUpsert('customers', Object.assign({
    provider_id: providerId,
    external_user_id: externalUserId
  }, profileFields), 'provider_id,external_user_id');

  let conversation = supabaseQuery(
    `conversations?customer_id=eq.${customer.id}&select=id,mode`
  )[0];

  if (!conversation) {
    conversation = supabaseInsert('conversations', {
      customer_id: customer.id,
      provider_id: providerId,
      status: 'unassigned',
      mode: 'bot'
    });
  }
  return conversation;
}

function insertMessage(conversationId, senderType, messageType, content, mediaUrl, externalMessageId) {
  return supabaseInsert('messages', {
    conversation_id: conversationId,
    sender_type: senderType,
    message_type: messageType,
    content: content,
    media_url: mediaUrl,
    external_message_id: externalMessageId
  });
}

/**
 * เช็ค Keyword Auto-Responder แล้วตอบกลับผ่านช่องทางที่ถูกต้อง
 */
function tryAutoResponder(providerId, conversationId, text, ctx) {
  if (!text) return;
  const templates = supabaseQuery(
    `templates?type=eq.auto_response&template_providers.provider_id=eq.${providerId}&select=*,template_providers!inner(provider_id)`
  );
  const matched = templates.find(t => text.includes(t.keyword));
  if (!matched) return;

  const replyText = matched.payload.reply_text;
  sendToChannel(providerId, ctx, replyText);
  insertMessage(conversationId, 'bot', 'text', replyText, null, null);
}

/**
 * ส่งข้อความจากแอดมิน (Manual Mode) — เรียกจาก Front-end ผ่าน Web App API
 * ต้องรู้ channel_type ของ provider เพื่อเลือกใช้ API ที่ถูกต้อง
 */
function sendAgentMessage(providerId, conversationId, externalUserId, text, agentId) {
  const provider = supabaseQuery(`providers?id=eq.${providerId}&select=channel_type`)[0];
  sendToChannel(providerId, { channel: provider.channel_type, chatId: externalUserId,
    psid: externalUserId, replyToken: null }, text);

  supabaseInsert('messages', {
    conversation_id: conversationId,
    sender_type: 'agent',
    sender_id: agentId,
    message_type: 'text',
    content: text
  });
}

/**
 * Dispatcher กลาง: ส่งข้อความออกไปช่องทางที่ถูกต้องตาม ctx.channel
 * ctx: { channel, replyToken? (line), chatId? (telegram), psid? (facebook) }
 */
function sendToChannel(providerId, ctx, text) {
  switch (ctx.channel) {
    case 'line':
      if (ctx.replyToken) lineReply(providerId, ctx.replyToken, text);
      else linePush(providerId, ctx.externalUserId, text);
      break;
    case 'telegram':
      telegramSend(providerId, ctx.chatId, text);
      break;
    case 'facebook':
      facebookSend(providerId, ctx.psid, text);
      break;
  }
}

/**
 * Broadcast: ยิงข้อความหาลูกค้าหลายคนตาม Segment ที่เลือกไว้ ข้ามได้ทุกช่องทาง
 * (ปริมาณมากจริง ๆ แนะนำย้ายไป Supabase Edge Function เพื่อเลี่ยง GAS quota)
 */
function sendBroadcast(broadcastId) {
  const broadcast = supabaseQuery(`broadcasts?id=eq.${broadcastId}&select=*,templates(*)`)[0];
  const targets = supabaseQuery(`broadcast_providers?broadcast_id=eq.${broadcastId}`);

  targets.forEach(bp => {
    const provider = supabaseQuery(`providers?id=eq.${bp.provider_id}&select=channel_type`)[0];
    const customers = supabaseQuery(`customers?provider_id=eq.${bp.provider_id}&select=external_user_id`);
    const text = broadcast.templates.payload.text || broadcast.templates.payload.reply_text;

    if (provider.channel_type === 'line') {
      const token = getProviderCredential(bp.provider_id, 'access_token');
      chunkArray(customers.map(c => c.external_user_id), 500).forEach(chunk => {
        UrlFetchApp.fetch('https://api.line.me/v2/bot/message/multicast', {
          method: 'post', contentType: 'application/json',
          headers: { Authorization: 'Bearer ' + token },
          payload: JSON.stringify({ to: chunk, messages: [{ type: 'text', text }] })
        });
      });
    } else {
      // Telegram / Facebook ไม่มี multicast API แบบ LINE ต้องวนส่งทีละคน
      customers.forEach(c => sendToChannel(bp.provider_id,
        { channel: provider.channel_type, chatId: c.external_user_id, psid: c.external_user_id }, text));
    }
  });

  supabaseUpdate('broadcasts', broadcastId, { status: 'sent', sent_at: new Date().toISOString() });
}

/* ---------------------- Helpers ---------------------- */

function getProviderCredential(providerId, key) {
  const provider = supabaseQuery(`providers?id=eq.${providerId}&select=credentials`)[0];
  return provider.credentials[key];
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* ---------------------- Supabase REST helpers ---------------------- */

function supabaseHeaders(extra) {
  return Object.assign({
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json'
  }, extra || {});
}

function supabaseQuery(pathWithQuery) {
  const res = UrlFetchApp.fetch(`${SUPABASE_URL}/rest/v1/${pathWithQuery}`, {
    headers: supabaseHeaders()
  });
  return JSON.parse(res.getContentText());
}

function supabaseInsert(table, row) {
  const res = UrlFetchApp.fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'post',
    headers: supabaseHeaders({ Prefer: 'return=representation' }),
    payload: JSON.stringify(row)
  });
  return JSON.parse(res.getContentText())[0];
}

function supabaseUpsert(table, row, onConflict) {
  const res = UrlFetchApp.fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'post',
    headers: supabaseHeaders({ Prefer: 'resolution=merge-duplicates,return=representation' }),
    payload: JSON.stringify(row)
  });
  return JSON.parse(res.getContentText())[0];
}

function supabaseUpdate(table, id, patch) {
  UrlFetchApp.fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'patch',
    headers: supabaseHeaders({ Prefer: 'return=minimal' }),
    payload: JSON.stringify(patch)
  });
}
