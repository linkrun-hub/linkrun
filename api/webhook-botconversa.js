import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};

    /* BotConversa envia em formatos variados — normaliza */
    const nome     = body.nome || body.name || body.contact?.name || '';
    const rawTel   = body.telefone || body.phone || body.whatsapp || body.contact?.phone || '';
    const email    = body.email || body.contact?.email || '';
    const tagNomes = body.tags || body.produtos || [];  /* array de nomes de tags */

    const telefone = rawTel.replace(/\D/g, '');
    if (!telefone || telefone.length < 10) {
      return res.status(400).json({ error: 'Telefone inválido' });
    }

    /* Upsert: se já existe pelo whatsapp, atualiza; senão cria */
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('whatsapp', telefone)
      .maybeSingle();

    let leadId;

    if (existing) {
      leadId = existing.id;
      await supabase.from('leads').update({
        nome: nome || undefined,
        email: email || undefined,
        updated_at: new Date().toISOString(),
      }).eq('id', leadId);
    } else {
      const { data } = await supabase.from('leads').insert({
        nome: nome || telefone,
        whatsapp: telefone,
        telefone,
        email,
        origem: 'botconversa',
        etapa_funil: 'frio',
        updated_at: new Date().toISOString(),
      }).select('id').single();

      leadId = data?.id;
    }

    /* Aplica tags se informadas */
    if (leadId && tagNomes.length > 0) {
      const { data: tags } = await supabase.from('tags').select('id, nome').in('nome', tagNomes);
      if (tags?.length) {
        const inserts = tags.map(t => ({ lead_id: leadId, tag_id: t.id }));
        await supabase.from('lead_tags').upsert(inserts, { onConflict: 'lead_id,tag_id', ignoreDuplicates: true });
      }
    }

    /* Registra interação */
    if (leadId) {
      await supabase.from('interacoes_lead').insert({
        lead_id: leadId,
        tipo: 'entrada_botconversa',
        descricao: 'Lead chegou via BotConversa',
        metadata: body,
      });
    }

    return res.status(200).json({ ok: true, lead_id: leadId });
  } catch (err) {
    console.error('webhook-botconversa error:', err);
    return res.status(500).json({ error: err.message });
  }
}
