export const config = { runtime: 'edge' };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

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

async function dbPatch(table, filter, data) {
  const r = await fetch(`${sbBase()}/${table}?${filter}`, {
    method: 'PATCH',
    headers: sbHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`PATCH ${table}: ${r.status}`);
}

async function dbInsert(table, data) {
  const r = await fetch(`${sbBase()}/${table}`, {
    method: 'POST',
    headers: sbHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`POST ${table}: ${r.status}`);
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Body inválido' }, 400); }

  const payload      = body.root || body;
  const telefoneRaw  = payload.telefone || payload.phone || payload.contact?.phone || '';
  const resposta     = payload.resposta || payload.tipo || payload.status || '';

  const VALIDAS = ['aceitou', 'optout', 'sem_resposta', 'bloqueou'];
  if (!VALIDAS.includes(resposta)) {
    return json({ error: `resposta deve ser: ${VALIDAS.join(', ')}` }, 400);
  }

  const tel = telefoneRaw.replace(/\D/g, '');
  if (tel.length < 10) {
    return json({ ok: false, msg: 'Telefone inválido ou não substituído pelo BotConversa' }, 200);
  }

  const telComDDI = tel.startsWith('55') ? tel : `55${tel}`;
  const telSemDDI = tel.startsWith('55') && tel.length > 11 ? tel.slice(2) : tel;

  try {
    const agora = new Date().toISOString();

    // Find most recent log entry for this phone
    const orNum  = `or=(numero_destinatario.eq.${tel},numero_destinatario.eq.${telComDDI},numero_destinatario.eq.${telSemDDI})`;
    const logs   = await dbSelect('log_disparo', `${orNum}&order=enviado_em.desc&limit=1`, 'id,campanha_id,lead_id,status');

    if (!logs?.length) {
      return json({ ok: false, msg: 'Nenhum disparo encontrado para este contato' });
    }

    const log = logs[0];

    // Don't overwrite a final state with sem_resposta
    const ESTADOS_FINAIS = ['aceitou', 'optout', 'bloqueou'];
    if (resposta === 'sem_resposta' && ESTADOS_FINAIS.includes(log.status)) {
      return json({ ok: true, skipped: true, msg: 'Estado final preservado', campanha_id: log.campanha_id });
    }

    // Update log_disparo
    const logPatch = { status: resposta };
    if (resposta === 'aceitou')  logPatch.respondeu_em = agora;
    if (resposta === 'bloqueou') logPatch.bloqueou_em  = agora;
    await dbPatch('log_disparo', `id=eq.${log.id}`, logPatch);

    // Find lead by phone (any variant)
    const orLead = `or=(whatsapp.eq.${tel},whatsapp.eq.${telComDDI},whatsapp.eq.${telSemDDI},telefone.eq.${tel},telefone.eq.${telComDDI},telefone.eq.${telSemDDI})`;
    const leads  = await dbSelect('leads', `${orLead}&limit=1`, 'id,optout,etapa_funil');

    if (leads?.length) {
      const lead = leads[0];

      if (resposta === 'optout') {
        await dbPatch('leads', `id=eq.${lead.id}`, { optout: true, optout_em: agora });
        // Cancel all active campaign enrollments for this lead
        await dbPatch('lead_campanhas', `lead_id=eq.${lead.id}&status=eq.ativo`, { status: 'optout' });
      }

      if (resposta === 'aceitou' && lead.etapa_funil !== 'assinante') {
        await dbPatch('leads', `id=eq.${lead.id}`, { etapa_funil: 'quente' });
      }

      // Record interaction
      const tipoInteracao =
        resposta === 'aceitou'      ? 'resposta_recebida' :
        resposta === 'optout'       ? 'optout'            :
        resposta === 'bloqueou'     ? 'bloqueio'          : 'sem_resposta';

      await dbInsert('interacoes_lead', {
        lead_id:   lead.id,
        tipo:      tipoInteracao,
        descricao: `Resposta ao disparo da campanha: ${resposta}`,
        metadata:  { campanha_id: log.campanha_id, log_id: log.id },
      });
    }

    return json({ ok: true, resposta, campanha_id: log.campanha_id, lead_id: log.lead_id });

  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
