// Receives a lead from the site's forms and forwards it to Phong's Telegram.
// Secrets come from Vercel env vars (source of truth: OpenBao kv/studio-phongminhto-leads):
//   TELEGRAM_LEADS_BOT_TOKEN, TELEGRAM_LEADS_CHAT_ID
const ALLOWED_ORIGINS = [
  'https://phongminhto.com',
  'https://www.phongminhto.com',
  'https://phongminhto-site.vercel.app',
];
const NEEDS = {
  buying: 'Mua nhà / Buying',
  selling: 'Bán nhà / Selling',
  relocating: 'Chuyển đến Texas / Relocating',
  financing: 'Giới thiệu vay / Financing introduction',
  area: 'Tìm hiểu khu vực / Area research',
  other: 'Khác / Other',
};

function clean(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method' });
  }
  const origin = req.headers.origin || '';
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ ok: false, error: 'origin' });
  }
  const body = typeof req.body === 'object' && req.body ? req.body : {};
  if (clean(body.website, 200)) {
    return res.status(200).json({ ok: true }); // honeypot filled: a bot, drop silently
  }
  const lead = {
    name: clean(body.name, 120),
    email: clean(body.email, 160),
    phone: clean(body.phone, 40),
    need: NEEDS[clean(body.need, 20)] || '',
    state: clean(body.state, 40),
    source: clean(body.source, 80),
    page: clean(body.page, 200),
    lang: clean(body.lang, 5),
    consent: body.consent === true || body.consent === 'yes' || body.consent === 'on',
  };
  if (!lead.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) || !lead.consent) {
    return res.status(400).json({ ok: false, error: 'invalid' });
  }

  const token = process.env.TELEGRAM_LEADS_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_LEADS_CHAT_ID;
  if (!token || !chatId) {
    return res.status(500).json({ ok: false, error: 'config' });
  }
  const when = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
  const lines = [
    '🏠 Khách mới từ phongminhto.com',
    `Tên: ${lead.name}`,
    `Email: ${lead.email}`,
    lead.phone && `Điện thoại: ${lead.phone}`,
    lead.need && `Nhu cầu: ${lead.need}`,
    lead.state && `Đang ở: ${lead.state}`,
    `Nguồn: ${lead.source || 'form'}${lead.page ? ` (${lead.page})` : ''}`,
    lead.lang && `Ngôn ngữ trang: ${lead.lang}`,
    'Đồng ý được liên lạc: có',
    `Lúc: ${when} (Central)`,
  ].filter(Boolean);

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), disable_web_page_preview: true }),
    });
    const j = await r.json();
    if (!j.ok) return res.status(502).json({ ok: false, error: 'telegram' });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'telegram' });
  }
  return res.status(200).json({ ok: true });
};
