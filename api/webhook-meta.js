export const config = { runtime: 'edge' };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

function sbBase() { return process.env.SUPABASE_URL + '/rest/v1'; }
function sbKey()  { return process.env.SUPABASE_SERVICE_ROLE_KEY; }

function sbHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    apikey: sbKey(),
    Authorization: `Bearer ${sbKey()}`,
    ...extra,
  };
}

async function dbSelect(table, qs, cols = '*') {
  const r = await fetch(`${sbBase()}/${table}?${qs}&select=${cols}`, { headers: sbHeaders() });
  if (!r.ok) throw new Error(`GET ${table}: ${r.status}`);
  return r.json();
}

async function dbInsert(table, data) {
  const r = await fetch(`${sbBase()}/${table}`, {
    method: 'POST',
    headers: sbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(data),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`POST ${table}: ${r.status} ${text}`);
  return JSON.parse(text);
}

async function dbPatch(table, filter, data) {
  const r = await fetch(`${sbBase()}/${table}?${filter}`, {
    method: 'PATCH',
    headers: sbHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`PATCH ${table}: ${r.status}`);
}

async function fetchMetaLead(leadgenId) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error('META_PAGE_ACCESS_TOKEN não configurado');
  const r = await fetch(`https://graph.facebook.com/v19.0/${leadgenId}?access_token=${token}`);
  if (!r.ok) throw new Error(`Graph API ${leadgenId}: ${r.status}`);
  return r.json();
}

function field(fieldData, ...names) {
  for (const name of names) {
    const f = fieldData.find(f => f.name === name);
    if (f?.values?.[0]) return f.values[0];
  }
  return '';
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Webhook verification (GET from Meta)
  if (req.method === 'GET') {
    const url       = new URL(req.url);
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch { return new Response('Bad request', { status: 400 }); }

  // Meta sends a test ping with object !== 'page' — acknowledge silently
  if (body.object !== 'page') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const results = [];

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue;

      const { leadgen_id, form_id, ad_id, adgroup_id, page_id } = change.value;

      try {
        const leadData = await fetchMetaLead(leadgen_id);
        const f = leadData.field_data || [];

        const nome      = field(f, 'full_name', 'nome', 'name') ||
                          [field(f, 'first_name'), field(f, 'last_name')].filter(Boolean).join(' ') ||
                          'Lead Meta Ads';
        const rawTel    = field(f, 'phone_number', 'telefone', 'phone', 'whatsapp');
        const email     = field(f, 'email');
        const cidade    = field(f, 'city', 'cidade');
        const estado    = field(f, 'state', 'estado', 'uf');
        const empresa   = field(f, 'company_name', 'empresa', 'company');
        const telefone  = rawTel.replace(/\D/g, '');

        let leadId;

        // Dedup by whatsapp if phone provided
        if (telefone && telefone.length >= 10) {
          const existing = await dbSelect('leads', `whatsapp=eq.${telefone}&limit=1`, 'id');
          if (existing?.length) {
            leadId = existing[0].id;
            await dbPatch('leads', `id=eq.${leadId}`, {
              nome:       nome || undefined,
              email:      email || undefined,
              updated_at: new Date().toISOString(),
            });
          }
        }

        if (!leadId) {
          const rows = await dbInsert('leads', {
            nome,
            whatsapp:   telefone || null,
            telefone:   telefone || null,
            email:      email    || null,
            cidade:     cidade   || null,
            estado:     estado   || null,
            atividade:  empresa  || null,
            origem:     'meta_ads',
            etapa_funil:'frio',
            updated_at: new Date().toISOString(),
          });
          leadId = rows?.[0]?.id;
        }

        if (leadId) {
          await dbInsert('interacoes_lead', {
            lead_id:   leadId,
            tipo:      'entrada_meta_ads',
            descricao: 'Lead chegou via Meta Lead Ads',
            metadata:  { leadgen_id, form_id, ad_id, adgroup_id, page_id },
          });
        }

        results.push({ ok: true, leadgen_id, lead_id: leadId });
      } catch (err) {
        results.push({ ok: false, leadgen_id, error: err.message });
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
