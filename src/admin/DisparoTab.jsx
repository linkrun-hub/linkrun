import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Zap, Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight,
  Clock, Phone, Info, Send, History, RefreshCw, ChevronRight,
  AlertTriangle, Flame, TrendingUp, Users, FlaskConical,
} from 'lucide-react';
import HelpPanel from './HelpPanel.jsx';

const SECTIONS = [
  { id: 'contas',    label: 'Contas de Envio', icon: Phone },
  { id: 'fila',      label: 'Fila Ativa',      icon: Clock },
  { id: 'historico', label: 'Histórico',        icon: History },
  { id: 'setup',     label: 'Configuração',     icon: Info },
];

const STATUS_COLORS = {
  enviado:      'text-emerald-400',
  falhou:       'text-red-400',
  aceitou:      'text-neon',
  optout:       'text-orange-400',
  bloqueou:     'text-red-500',
  sem_resposta: 'text-zinc-400',
};

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtFuture(iso) {
  if (!iso) return '—';
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return 'Agora';
  const min = Math.round(diff / 60000);
  if (min < 60) return `em ${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return `em ${h}h${m > 0 ? `${m}m` : ''}`;
  return `em ${Math.floor(h / 24)}d`;
}

// ─── Sending Account Form ────────────────────────────────────────────────────

function ContaModal({ conta, onSave, onClose }) {
  const blank = { nome: '', numero: '', webhook_url: '', limite_diario: 150, ativo: true };
  const [form, setForm] = useState(conta ? { ...conta } : blank);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function save() {
    if (!form.nome.trim()) return setErr('Nome obrigatório');
    if (!form.numero.trim()) return setErr('Número obrigatório');
    setSaving(true);
    setErr('');
    try {
      const payload = {
        nome:          form.nome.trim(),
        numero:        form.numero.replace(/\D/g, ''),
        webhook_url:   form.webhook_url?.trim() || null,
        limite_diario: Number(form.limite_diario) || 150,
        ativo:         form.ativo,
      };
      if (conta) {
        const { error } = await supabase.from('sending_accounts').update(payload).eq('id', conta.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sending_accounts').insert({ ...payload, enviados_hoje: 0, ultimo_reset: new Date().toISOString().split('T')[0] });
        if (error) throw error;
      }
      onSave();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold">{conta ? 'Editar conta' : 'Nova conta de envio'}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Nome</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
              placeholder="Ex: Conta Principal"
              className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Número (só dígitos)</label>
            <input value={form.numero} onChange={e => set('numero', e.target.value)}
              placeholder="5511999998888"
              className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Webhook URL do BotConversa</label>
            <input value={form.webhook_url || ''} onChange={e => set('webhook_url', e.target.value)}
              placeholder="https://backend.botconversa.com.br/api/v1/webhooks/..."
              className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Limite diário de envios</label>
            <input type="number" min={1} max={1000} value={form.limite_diario} onChange={e => set('limite_diario', e.target.value)}
              className="w-full bg-dark-800 border border-dark-600 rounded-xl px-3 py-2 text-sm text-white" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => set('ativo', !form.ativo)}
              className={`transition-colors ${form.ativo ? 'text-neon' : 'text-zinc-600'}`}>
              {form.ativo ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            </button>
            <span className="text-sm text-zinc-300">{form.ativo ? 'Ativa' : 'Inativa'}</span>
          </div>
        </div>

        {err && <p className="text-red-400 text-xs mt-3">{err}</p>}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-dark-600 text-zinc-400 text-sm hover:border-zinc-500">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2 rounded-xl bg-neon/10 border border-neon/30 text-neon text-sm hover:bg-neon/20 disabled:opacity-50">
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Contas Section ──────────────────────────────────────────────────────────

function ContasSection() {
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // null | 'new' | conta_obj
  const [teste, setTeste] = useState(null); // { id, phone, sending, result }

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('sending_accounts').select('*').order('nome');
    setContas(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggle(conta) {
    await supabase.from('sending_accounts').update({ ativo: !conta.ativo }).eq('id', conta.id);
    load();
  }

  async function remove(id) {
    if (!confirm('Excluir esta conta de envio?')) return;
    await supabase.from('sending_accounts').delete().eq('id', id);
    load();
  }

  const saved = () => { setModal(null); load(); };

  async function enviarTeste(c) {
    if (!c.webhook_url) return;
    const t = teste?.id === c.id ? teste : { id: c.id, phone: '', sending: false, result: null };
    if (!t.phone?.trim()) return;
    setTeste({ ...t, sending: true, result: null });
    try {
      const res = await fetch('/api/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: c.webhook_url, phone: t.phone, message: 'Teste de conexão LinkRun HUB ✓' }),
      });
      const data = await res.json();
      setTeste(prev => ({ ...prev, sending: false, result: data.ok ? 'ok' : (data.error || `HTTP ${data.status}`) }));
    } catch (e) {
      setTeste(prev => ({ ...prev, sending: false, result: e.message }));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-zinc-400 text-sm">{contas.length} conta{contas.length !== 1 ? 's' : ''} cadastrada{contas.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neon/10 border border-neon/30 text-neon text-sm hover:bg-neon/20">
          <Plus size={14} /> Nova conta
        </button>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Carregando…</p>}

      <div className="space-y-3">
        {contas.map(c => (
          <div key={c.id} className="bg-dark-900 border border-dark-700 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${c.ativo ? 'bg-neon' : 'bg-zinc-600'}`} />
                  <span className="text-white font-medium text-sm">{c.nome}</span>
                </div>
                <p className="text-zinc-500 text-xs mb-1">{c.numero || 'Número não definido'}</p>
                {c.webhook_url
                  ? <p className="text-zinc-600 text-xs truncate">{c.webhook_url}</p>
                  : <p className="text-orange-400 text-xs flex items-center gap-1"><AlertTriangle size={11} /> Webhook URL não configurada</p>
                }
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="text-right mr-2">
                  <p className="text-zinc-300 text-xs font-medium">{c.enviados_hoje ?? 0} / {c.limite_diario}</p>
                  <p className="text-zinc-600 text-xs">hoje</p>
                </div>
                {c.webhook_url && (
                  <button
                    onClick={() => setTeste(t => t?.id === c.id ? null : { id: c.id, phone: '', sending: false, result: null })}
                    title="Testar webhook"
                    className="text-zinc-500 hover:text-blue-400 p-1 transition-colors">
                    <FlaskConical size={14} />
                  </button>
                )}
                <button onClick={() => toggle(c)} className={`transition-colors ${c.ativo ? 'text-neon' : 'text-zinc-600'} hover:opacity-80`}>
                  {c.ativo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
                <button onClick={() => setModal(c)} className="text-zinc-500 hover:text-white p-1"><Pencil size={14} /></button>
                <button onClick={() => remove(c.id)} className="text-zinc-500 hover:text-red-400 p-1"><Trash2 size={14} /></button>
              </div>
            </div>

            {/* Inline webhook test */}
            {teste?.id === c.id && (
              <div className="mt-3 pt-3 border-t border-dark-700/60">
                <p className="text-xs text-zinc-400 mb-2">Enviar mensagem de teste para:</p>
                <div className="flex gap-2">
                  <input
                    value={teste.phone}
                    onChange={e => setTeste(t => ({ ...t, phone: e.target.value, result: null }))}
                    placeholder="5511999998888"
                    className="flex-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-blue-500/50"
                  />
                  <button
                    onClick={() => enviarTeste(c)}
                    disabled={teste.sending || !teste.phone?.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-500/20 disabled:opacity-40 transition-colors">
                    {teste.sending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                    Testar
                  </button>
                </div>
                {teste.result && (
                  <p className={`text-xs mt-2 flex items-center gap-1 ${teste.result === 'ok' ? 'text-neon' : 'text-red-400'}`}>
                    {teste.result === 'ok'
                      ? <><Check size={11} /> Mensagem enviada com sucesso!</>
                      : <><AlertTriangle size={11} /> Erro: {teste.result}</>
                    }
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        {!loading && !contas.length && (
          <p className="text-zinc-600 text-sm text-center py-8">Nenhuma conta cadastrada.</p>
        )}
      </div>

      {modal && (
        <ContaModal
          conta={modal === 'new' ? null : modal}
          onSave={saved}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ─── Fila Section ────────────────────────────────────────────────────────────

function FilaSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('lead_campanhas')
      .select('id, etapa_atual, proxima_mensagem_em, ultima_mensagem_em, status, leads(nome, whatsapp), campanhas(nome, status)')
      .eq('status', 'ativo')
      .order('proxima_mensagem_em', { ascending: true })
      .limit(50);
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const prontos   = items.filter(i => new Date(i.proxima_mensagem_em) <= new Date());
  const agendados = items.filter(i => new Date(i.proxima_mensagem_em) > new Date());

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4">
          <span className="text-sm text-zinc-400"><span className="text-neon font-bold">{prontos.length}</span> prontos para envio</span>
          <span className="text-sm text-zinc-400"><span className="text-zinc-300 font-bold">{agendados.length}</span> agendados</span>
        </div>
        <button onClick={load} className="text-zinc-500 hover:text-white p-1"><RefreshCw size={14} /></button>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Carregando…</p>}

      <div className="space-y-2">
        {items.map(it => {
          const pronto = new Date(it.proxima_mensagem_em) <= new Date();
          return (
            <div key={it.id} className={`bg-dark-900 border rounded-xl px-4 py-3 flex items-center gap-3 ${pronto ? 'border-neon/20' : 'border-dark-700'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${pronto ? 'bg-neon' : 'bg-zinc-600'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{it.leads?.nome ?? '—'}</p>
                <p className="text-zinc-500 text-xs">{it.campanhas?.nome ?? '—'} · etapa {it.etapa_atual}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-xs font-medium ${pronto ? 'text-neon' : 'text-zinc-400'}`}>{fmtFuture(it.proxima_mensagem_em)}</p>
                <p className="text-zinc-600 text-xs">{it.leads?.whatsapp?.replace(/^55/, '') || ''}</p>
              </div>
            </div>
          );
        })}
        {!loading && !items.length && (
          <p className="text-zinc-600 text-sm text-center py-8">Fila vazia — matricule leads em campanhas ativas para começar.</p>
        )}
      </div>
    </div>
  );
}

// ─── Histórico Section ───────────────────────────────────────────────────────

function HistoricoSection() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('log_disparo')
      .select('id, status, enviado_em, respondeu_em, conteudo_enviado, numero_destinatario, leads(nome), campanhas(nome)')
      .order('enviado_em', { ascending: false })
      .limit(50);
    setLogs(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const stats = logs.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {});

  return (
    <div>
      {/* Stats */}
      {logs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { key: 'enviado',  label: 'Enviados',  color: 'text-emerald-400' },
            { key: 'aceitou',  label: 'Aceitaram', color: 'text-neon' },
            { key: 'optout',   label: 'Optout',    color: 'text-orange-400' },
            { key: 'bloqueou', label: 'Bloqueios', color: 'text-red-400' },
          ].map(s => (
            <div key={s.key} className="bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{stats[s.key] || 0}</p>
              <p className="text-zinc-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <p className="text-zinc-400 text-sm">Últimos {logs.length} disparos</p>
        <button onClick={load} className="text-zinc-500 hover:text-white p-1"><RefreshCw size={14} /></button>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Carregando…</p>}

      <div className="space-y-2">
        {logs.map(l => (
          <div key={l.id} className="bg-dark-900 border border-dark-700 rounded-xl px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white text-sm font-medium">{l.leads?.nome ?? '—'}</span>
                  <span className={`text-xs font-medium ${STATUS_COLORS[l.status] || 'text-zinc-400'}`}>{l.status}</span>
                </div>
                <p className="text-zinc-500 text-xs truncate">{l.campanhas?.nome ?? '—'} · {l.numero_destinatario}</p>
                {l.conteudo_enviado && (
                  <p className="text-zinc-600 text-xs mt-1 truncate italic">"{l.conteudo_enviado.slice(0, 80)}{l.conteudo_enviado.length > 80 ? '…' : ''}"</p>
                )}
              </div>
              <div className="text-right shrink-0 text-zinc-500 text-xs">
                <p>{fmt(l.enviado_em)}</p>
                {l.respondeu_em && <p className="text-neon">↩ {fmt(l.respondeu_em)}</p>}
              </div>
            </div>
          </div>
        ))}
        {!loading && !logs.length && (
          <p className="text-zinc-600 text-sm text-center py-8">Nenhum disparo registrado ainda.</p>
        )}
      </div>
    </div>
  );
}

// ─── Setup Section ───────────────────────────────────────────────────────────

function SetupSection() {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://seu-app.vercel.app';

  const Block = ({ label, value }) => (
    <div className="bg-dark-950 border border-dark-700 rounded-xl p-3 mb-3">
      <p className="text-zinc-500 text-xs mb-1">{label}</p>
      <p className="text-neon text-sm font-mono break-all">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="text-white font-semibold mb-3">1. Webhook de resposta (BotConversa → LinkRun)</h3>
        <p className="text-zinc-400 text-sm mb-3">
          Configure no BotConversa para chamar este endpoint quando o lead responder, optar por sair ou for marcado como bloqueio:
        </p>
        <Block label="URL do Webhook de Resposta" value={`${origin}/api/disparo-resposta`} />
        <p className="text-zinc-500 text-xs">Body esperado (POST JSON):</p>
        <pre className="bg-dark-950 border border-dark-700 rounded-xl p-3 text-xs text-zinc-300 mt-1 overflow-x-auto">{`{
  "telefone": "{{contact.phone}}",
  "resposta": "aceitou"  // aceitou | optout | sem_resposta | bloqueou
}`}</pre>
      </div>

      <div>
        <h3 className="text-white font-semibold mb-3">2. Webhook de envio (LinkRun → BotConversa)</h3>
        <p className="text-zinc-400 text-sm mb-3">
          No BotConversa, crie um fluxo de entrada por webhook que aceite <code className="text-neon">phone</code> e <code className="text-neon">message</code>.
          Cole a URL do webhook na aba <strong>Contas de Envio</strong>.
        </p>
        <pre className="bg-dark-950 border border-dark-700 rounded-xl p-3 text-xs text-zinc-300 overflow-x-auto">{`// Payload enviado pelo disparo-sender
{
  "phone":   "5511999998888",
  "message": "Olá João! Temos uma novidade para você..."
}`}</pre>
      </div>

      <div>
        <h3 className="text-white font-semibold mb-3">3. Cron (Vercel → disparo-sender)</h3>
        <p className="text-zinc-400 text-sm mb-2">
          O arquivo <code className="text-neon">vercel.json</code> já está configurado com cron a cada minuto.
          Opcionalmente, proteja o cron com um segredo:
        </p>
        <Block label="Variável de ambiente no Vercel" value="DISPARO_CRON_SECRET=qualquer_segredo_aqui" />
        <Block label="Endpoint do cron" value={`${origin}/api/disparo-sender`} />
      </div>

      <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-orange-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-orange-300 text-sm font-medium mb-1">Antes de ativar</p>
            <ul className="text-zinc-400 text-xs space-y-1 list-disc ml-3">
              <li>Rode o SQL de migração para adicionar <code className="text-neon">webhook_url</code> às contas de envio</li>
              <li>Configure <code className="text-neon">SUPABASE_URL</code> e <code className="text-neon">SUPABASE_SERVICE_ROLE_KEY</code> no Vercel</li>
              <li>Crie pelo menos uma conta de envio com webhook_url preenchida</li>
              <li>Ative uma campanha com etapas e templates</li>
              <li>Matricule leads na campanha (aba Campanhas → Matricular Leads)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Tab ────────────────────────────────────────────────────────────────

export default function DisparoTab() {
  const [section, setSection] = useState('contas');
  const [alertas, setAlertas] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    async function loadAlertas() {
      const { data: pausadas } = await supabase
        .from('campanhas')
        .select('id, nome, pause_se_bloqueio_pct')
        .eq('status', 'pausada');

      if (!pausadas?.length) return;

      const withStats = await Promise.all(
        pausadas.map(async (c) => {
          const { data: logs } = await supabase
            .from('log_disparo')
            .select('status')
            .eq('campanha_id', c.id)
            .order('enviado_em', { ascending: false })
            .limit(100);
          const total     = logs?.length || 0;
          const bloqueios = (logs || []).filter(l => l.status === 'bloqueou').length;
          const pct       = total > 0 ? Math.round((bloqueios / total) * 100) : 0;
          return { ...c, bloqueios, total_logs: total, pct };
        })
      );

      // Only show campaigns with actual block events
      setAlertas(withStats.filter(a => a.bloqueios > 0));
    }
    loadAlertas();
  }, []);

  async function reativar(campanha) {
    await supabase.from('campanhas').update({ status: 'ativa' }).eq('id', campanha.id);
    setDismissed(d => new Set([...d, campanha.id]));
  }

  const alertasVisiveis = alertas.filter(a => !dismissed.has(a.id));

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-neon/10 border border-neon/20">
          <Zap size={20} className="text-neon" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Disparo</h2>
          <p className="text-zinc-500 text-xs">Contas de envio, fila ativa e histórico de disparos</p>
        </div>
      </div>

      <HelpPanel tabKey="disparo" items={[
        { icon: '📱', title: 'Contas de Envio', desc: 'Cadastre os números de WhatsApp usados para enviar. Configure o webhook do BotConversa, limite diário e modo warmup.' },
        { icon: '🔥', title: 'Warmup', desc: 'Ative o modo warmup para aumentar gradualmente o volume diário (+20 por dia). Evita bloqueios em contas novas.' },
        { icon: '📋', title: 'Fila Ativa', desc: 'Leads aguardando o próximo disparo. Mostra campanha, etapa atual e horário agendado para o próximo envio.' },
        { icon: '📜', title: 'Histórico', desc: 'Log completo de todos os disparos realizados. Filtre por status: enviado, aceitou, bloqueou, optout ou falhou.' },
        { icon: '🚨', title: 'Alerta de Bloqueio', desc: 'Se uma campanha for pausada por alta taxa de bloqueio, um banner vermelho aparece aqui. Você pode reativar a campanha após revisar.' },
        { icon: '🔗', title: 'Webhook de Resposta', desc: 'Configure no BotConversa o webhook /api/disparo-resposta para registrar automaticamente respostas, optouts e bloqueios.' },
      ]} />

      {/* Block alerts */}
      {alertasVisiveis.map(a => (
        <div key={a.id} className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-3 mb-4">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-red-300 text-sm font-medium">
              Campanha pausada por bloqueio: <span className="text-white">{a.nome}</span>
            </p>
            <p className="text-zinc-500 text-xs mt-0.5">
              {a.bloqueios} bloqueio{a.bloqueios !== 1 ? 's' : ''} nos últimos {a.total_logs} disparos
              ({a.pct}% — limite configurado: {a.pause_se_bloqueio_pct || 5}%)
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => reativar(a)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-neon/10 border border-neon/30 text-neon hover:bg-neon/20 transition-colors"
            >
              Reativar
            </button>
            <button
              onClick={() => setDismissed(d => new Set([...d, a.id]))}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}

      {/* Section tabs */}
      <div className="flex gap-1 p-1 bg-dark-900 border border-dark-700 rounded-2xl mb-6 overflow-x-auto">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const active = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                active ? 'bg-neon/10 text-neon border border-neon/20' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon size={14} />
              {s.label}
            </button>
          );
        })}
      </div>

      {section === 'contas'    && <ContasSection />}
      {section === 'fila'      && <FilaSection />}
      {section === 'historico' && <HistoricoSection />}
      {section === 'setup'     && <SetupSection />}
    </div>
  );
}
