export const config = { runtime: 'edge' };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const respond = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const { webhook_url, phone, message } = await req.json();
    if (!webhook_url) return respond({ ok: false, error: 'webhook_url é obrigatório' }, 400);
    if (!phone)       return respond({ ok: false, error: 'phone é obrigatório' }, 400);

    let tel = String(phone).replace(/\D/g, '');
    if (tel.length === 10 || tel.length === 11) tel = '55' + tel;

    const res = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: tel, message: message || 'Teste de conexão LinkRun HUB ✓' }),
    });

    const body = await res.text().catch(() => '');
    return respond({ ok: res.ok, status: res.status, body });
  } catch (e) {
    return respond({ ok: false, error: e.message });
  }
}
