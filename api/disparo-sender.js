export const config = { runtime: 'edge' };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-cron-secret',
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
  if (!r.ok) throw new Error(`GET ${table}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function dbInsert(table, data) {
  const r = await fetch(`${sbBase()}/${table}`, {
    method: 'POST',
    headers: sbHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`POST ${table}: ${r.status} ${await r.text()}`);
}

async function dbPatch(table, filter, data) {
  const r = await fetch(`${sbBase()}/${table}?${filter}`, {
    method: 'PATCH',
    headers: sbHeaders({ Prefer: 'return=minimal' }),
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`PATCH ${table}: ${r.status} ${await r.text()}`);
}

function todayBRT() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// Shifts proposedMs to the next valid slot within campaign time window (BRT timezone)
function nextWindowSlot(cfg, proposedMs) {
  const [startH, startM] = (cfg.janela_inicio || '08:00').split(':').map(Number);
  const [endH,   endM  ] = (cfg.janela_fim    || '19:00').split(':').map(Number);
  const startMin = startH * 60 + startM;
  const endMin   = endH   * 60 + endM;
  const dias     = cfg.dias_semana || [1, 2, 3, 4, 5];

  let dt = new Date(proposedMs);

  for (let i = 0; i < 14; i++) {
    const brt    = new Date(dt.getTime() - 3 * 60 * 60 * 1000);
    const jsDow  = brt.getUTCDay();
    const ourDow = jsDow === 0 ? 7 : jsDow;
    const curMin = brt.getUTCHours() * 60 + brt.getUTCMinutes();

    if (dias.includes(ourDow)) {
      if (curMin >= startMin && curMin < endMin) return dt.toISOString();
      if (curMin < startMin) {
        brt.setUTCHours(startH, startM, 0, 0);
        return new Date(brt.getTime() + 3 * 60 * 60 * 1000).toISOString();
      }
    }
    brt.setUTCDate(brt.getUTCDate() + 1);
    brt.setUTCHours(startH, startM, 0, 0);
    dt = new Date(brt.getTime() + 3 * 60 * 60 * 1000);
  }
  return dt.toISOString();
}

function randomDelayMs(minSec, maxSec) {
  const minMs = (minSec || 120) * 1000;
  const maxMs = (maxSec || 480) * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// Warmup: cada dia ativo aumenta 20 envios, até o limite configurado
function warmupLimit(acc) {
  if (!acc.modo_warmup) return acc.limite_diario;
  const step = 20;
  return Math.min((acc.warmup_dia || 1) * step, acc.limite_diario);
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    return await run(req);
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, fatal: err.message }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

async function run(req) {
  const secret = process.env.DISPARO_CRON_SECRET;
  if (secret && req.headers.get('x-cron-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const respond = (data) => new Response(JSON.stringify(data), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

  const today  = todayBRT();
  const nowIso = new Date().toISOString();

  // Load and reset sending accounts
  const accounts = await dbSelect(
    'sending_accounts',
    'ativo=eq.true',
    'id,nome,numero,webhook_url,limite_diario,enviados_hoje,ultimo_reset,modo_warmup,warmup_dia'
  );
  if (!accounts?.length) return respond({ ok: true, skipped: 'nenhuma conta de envio ativa' });

  for (const acc of accounts) {
    if (acc.ultimo_reset !== today) {
      const patch = { enviados_hoje: 0, ultimo_reset: today };
      // Advance warmup_dia each new day while in warmup mode
      if (acc.modo_warmup) {
        patch.warmup_dia = (acc.warmup_dia || 1) + 1;
        acc.warmup_dia = patch.warmup_dia;
      }
      await dbPatch('sending_accounts', `id=eq.${acc.id}`, patch);
      acc.enviados_hoje = 0;
    }
  }

  // Pick sending account with most remaining capacity that has a webhook_url configured
  const available = accounts.filter(a => a.webhook_url && a.enviados_hoje < warmupLimit(a));
  if (!available.length) return respond({ ok: true, skipped: 'nenhuma conta com capacidade disponível hoje' });

  available.sort((a, b) => (warmupLimit(b) - b.enviados_hoje) - (warmupLimit(a) - a.enviados_hoje));
  const account = available[0];

  // Get all active campaigns
  const campanhas = await dbSelect('campanhas', 'status=eq.ativa');
  if (!campanhas?.length) return respond({ ok: true, skipped: 'nenhuma campanha ativa' });

  const results = [];

  for (const campanha of campanhas) {
    if (account.enviados_hoje >= warmupLimit(account)) break;

    // Auto-pause if block rate exceeds threshold (min 20 samples)
    const threshold = Number(campanha.pause_se_bloqueio_pct) || 5.0;
    const recentLogs = await dbSelect(
      'log_disparo',
      `campanha_id=eq.${campanha.id}&order=enviado_em.desc&limit=100`,
      'id,status'
    );
    if (recentLogs?.length >= 20) {
      const bloqueios = recentLogs.filter(r => r.status === 'bloqueou').length;
      const pct = (bloqueios / recentLogs.length) * 100;
      if (pct >= threshold) {
        await dbPatch('campanhas', `id=eq.${campanha.id}`, { status: 'pausada' });
        results.push({ campanha_id: campanha.id, paused: true, block_pct: +pct.toFixed(1) });
        continue;
      }
    }

    // Get the next ready lead for this campaign
    const ready = await dbSelect(
      'lead_campanhas',
      `campanha_id=eq.${campanha.id}&status=eq.ativo&proxima_mensagem_em=lte.${nowIso}&order=proxima_mensagem_em.asc&limit=1`,
      'id,lead_id,campanha_id,etapa_atual'
    );

    if (!ready?.length) {
      results.push({ campanha_id: campanha.id, skipped: 'nenhum lead pronto' });
      continue;
    }

    const lc = ready[0];

    // Get lead info
    const leads = await dbSelect('leads', `id=eq.${lc.lead_id}`, 'id,nome,whatsapp,telefone,optout');
    if (!leads?.length) {
      await dbPatch('lead_campanhas', `id=eq.${lc.id}`, { status: 'concluido' });
      continue;
    }
    const lead = leads[0];

    if (lead.optout) {
      await dbPatch('lead_campanhas', `id=eq.${lc.id}`, { status: 'optout' });
      results.push({ campanha_id: campanha.id, lead_id: lead.id, skipped: 'optout' });
      continue;
    }

    // Get current step
    const etapas = await dbSelect(
      'campanha_etapas',
      `campanha_id=eq.${campanha.id}&numero=eq.${lc.etapa_atual}`,
      'id,numero,nome,delay_dias'
    );
    if (!etapas?.length) {
      await dbPatch('lead_campanhas', `id=eq.${lc.id}`, { status: 'concluido' });
      results.push({ campanha_id: campanha.id, lead_id: lead.id, concluido: true, motivo: 'etapa não encontrada' });
      continue;
    }
    const etapa = etapas[0];

    // Pick a random active template variation for this step
    const templates = await dbSelect(
      'templates_mensagem',
      `etapa_id=eq.${etapa.id}&ativo=eq.true`,
      'id,conteudo,tipo,midia_url'
    );
    if (!templates?.length) {
      results.push({ campanha_id: campanha.id, lead_id: lead.id, skipped: `etapa ${etapa.numero}: sem template ativo` });
      continue;
    }
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Substitute {{nome}} with first name
    const nomeLead = (lead.nome || 'amigo').split(' ')[0];
    const conteudo = template.conteudo.replace(/\{\{nome\}\}/gi, nomeLead);

    // Normalize phone to DDI+number format
    let tel = (lead.whatsapp || lead.telefone || '').replace(/\D/g, '');
    if (tel.length === 10 || tel.length === 11) tel = '55' + tel;

    // Send via BotConversa webhook
    let sent = false;
    let erro = null;
    try {
      const res = await fetch(account.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: tel, message: conteudo }),
      });
      sent = res.ok;
      if (!sent) erro = `HTTP ${res.status}`;
    } catch (e) {
      erro = e.message;
    }

    // Log the attempt
    await dbInsert('log_disparo', {
      lead_id:             lead.id,
      campanha_id:         campanha.id,
      template_id:         template.id,
      numero_destinatario: tel,
      conteudo_enviado:    conteudo,
      status:              sent ? 'enviado' : 'falhou',
      enviado_em:          nowIso,
    });

    if (sent) {
      account.enviados_hoje++;
      await dbPatch('sending_accounts', `id=eq.${account.id}`, { enviados_hoje: account.enviados_hoje });

      // Check if next step exists
      const nextEtapas = await dbSelect(
        'campanha_etapas',
        `campanha_id=eq.${campanha.id}&numero=eq.${lc.etapa_atual + 1}`,
        'id,delay_dias'
      );

      if (nextEtapas?.length) {
        const delayMs    = randomDelayMs(campanha.delay_min_segundos, campanha.delay_max_segundos);
        const baseMs     = Date.now() + (nextEtapas[0].delay_dias || 0) * 24 * 60 * 60 * 1000 + delayMs;
        const proximaEm  = nextWindowSlot(campanha, baseMs);
        const minToNext  = Math.round((new Date(proximaEm).getTime() - Date.now()) / 60000);

        await dbPatch('lead_campanhas', `id=eq.${lc.id}`, {
          etapa_atual:         lc.etapa_atual + 1,
          ultima_mensagem_em:  nowIso,
          proxima_mensagem_em: proximaEm,
        });

        results.push({ campanha_id: campanha.id, lead_id: lead.id, sent: true, proxima_em_min: minToNext });
      } else {
        // No more steps — mark as completed
        await dbPatch('lead_campanhas', `id=eq.${lc.id}`, {
          status:            'concluido',
          ultima_mensagem_em: nowIso,
        });
        results.push({ campanha_id: campanha.id, lead_id: lead.id, sent: true, concluido: true });
      }
    } else {
      results.push({ campanha_id: campanha.id, lead_id: lead.id, sent: false, erro });
    }
  }

  return respond({ ok: true, processed: results.length, results });
}
