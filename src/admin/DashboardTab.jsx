import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Zap, TrendingUp, Megaphone, RefreshCw } from 'lucide-react';

const ETAPAS = [
  { value: 'frio',      label: 'Frio',      cor: '#64748b' },
  { value: 'morno',     label: 'Morno',     cor: '#f59e0b' },
  { value: 'quente',    label: 'Quente',    cor: '#ef4444' },
  { value: 'assinante', label: 'Assinante', cor: '#10b981' },
  { value: 'churn',     label: 'Churn',     cor: '#6b7280' },
];

const ORIGENS = [
  { value: 'manual',       label: 'Manual',       cor: '#8b5cf6' },
  { value: 'planilha',     label: 'Planilha',     cor: '#3b82f6' },
  { value: 'ocr',          label: 'Print IA',     cor: '#06b6d4' },
  { value: 'botconversa',  label: 'BotConversa',  cor: '#10b981' },
  { value: 'dataprospect', label: 'DataProspect', cor: '#f59e0b' },
  { value: 'meta_ads',     label: 'Meta Ads',     cor: '#ec4899' },
];

const TIPO_CONFIG = {
  entrada_botconversa: { emoji: '📲', label: 'Entrada BotConversa' },
  mensagem_enviada:    { emoji: '✉️',  label: 'Mensagem enviada' },
  resposta_recebida:   { emoji: '✅',  label: 'Respondeu' },
  optout:              { emoji: '🚫',  label: 'Optout' },
  etapa_mudou:         { emoji: '🔄',  label: 'Etapa mudou' },
  nota:                { emoji: '📝',  label: 'Nota' },
  bloqueio:            { emoji: '⚠️',  label: 'Bloqueio' },
  sem_resposta:        { emoji: '🔕',  label: 'Sem resposta' },
};

const STATUS_CAMP_COLOR = {
  ativa:     'text-emerald-400',
  pausada:   'text-orange-400',
  rascunho:  'text-zinc-500',
  finalizada:'text-zinc-600',
  concluida: 'text-zinc-600',
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000)    return 'agora';
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}min atrás`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
  return `${Math.floor(diff / 86400000)}d atrás`;
}

function pct(num, total) {
  if (!total) return 0;
  return Math.round((num / total) * 100);
}

function BarRow({ label, value, total, cor }) {
  const p = pct(value, total);
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-zinc-300">{label}</span>
        <span className="text-sm font-semibold text-white">
          {value.toLocaleString()} <span className="text-zinc-600 font-normal text-xs">{p}%</span>
        </span>
      </div>
      <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(p, 1)}%`, backgroundColor: cor }} />
      </div>
    </div>
  );
}

function KPICard({ label, value, sub, icon: Icon, color, loading }) {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-500 text-xs mb-1.5">{label}</p>
          {loading
            ? <div className="h-8 w-20 bg-dark-700 rounded-lg animate-pulse" />
            : <p className={`text-3xl font-bold ${color || 'text-neon'}`}>{value}</p>
          }
          {sub && !loading && <p className="text-zinc-600 text-xs mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl bg-dark-800 ${color || 'text-neon'}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}

function Skeleton({ rows = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 bg-dark-800 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

export default function DashboardTab() {
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const ago30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        leadsRes,
        tagsRes,
        campanhasRes,
        lcRes,
        logsRes,
        activityRes,
        totalRes,
      ] = await Promise.all([
        supabase.from('leads').select('etapa_funil, origem').limit(10000),
        supabase.from('tags').select('id, nome, cor').order('nome'),
        supabase.from('campanhas').select('id, nome, status').order('created_at', { ascending: false }),
        supabase.from('lead_campanhas').select('campanha_id, status').limit(20000),
        supabase.from('log_disparo').select('campanha_id, status').gte('enviado_em', ago30).limit(10000),
        supabase.from('interacoes_lead')
          .select('id, tipo, descricao, created_at, leads(nome)')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
      ]);

      const leads     = leadsRes.data     || [];
      const tags      = tagsRes.data      || [];
      const campanhas = campanhasRes.data  || [];
      const lc        = lcRes.data        || [];
      const logs      = logsRes.data      || [];
      const activity  = activityRes.data  || [];
      const total     = totalRes.count    || 0;

      // Etapa counts (computed from leads array)
      const etapaCounts = {};
      leads.forEach(l => { etapaCounts[l.etapa_funil] = (etapaCounts[l.etapa_funil] || 0) + 1; });

      // Origin counts
      const origemCounts = {};
      leads.forEach(l => { origemCounts[l.origem] = (origemCounts[l.origem] || 0) + 1; });

      // Tag lead counts (parallel count queries)
      const tagCountResults = await Promise.all(
        tags.map(t => supabase.from('lead_tags').select('*', { count: 'exact', head: true }).eq('tag_id', t.id))
      );
      const tagCounts = tags.map((t, i) => ({ ...t, count: tagCountResults[i].count || 0 }));

      // Dispatch stats (last 30d)
      const logsByStatus = {};
      logs.forEach(l => { logsByStatus[l.status] = (logsByStatus[l.status] || 0) + 1; });

      // Campaign stats from lead_campanhas + logs
      const lcByCamp = {};
      lc.forEach(r => {
        if (!lcByCamp[r.campanha_id]) lcByCamp[r.campanha_id] = {};
        lcByCamp[r.campanha_id][r.status] = (lcByCamp[r.campanha_id][r.status] || 0) + 1;
      });
      const logsByCamp = {};
      logs.forEach(l => {
        if (!logsByCamp[l.campanha_id]) logsByCamp[l.campanha_id] = {};
        logsByCamp[l.campanha_id][l.status] = (logsByCamp[l.campanha_id][l.status] || 0) + 1;
      });

      const campanhasStats = campanhas.map(c => {
        const lcs = lcByCamp[c.id] || {};
        const ls  = logsByCamp[c.id] || {};
        const totalMatric = Object.values(lcs).reduce((a, b) => a + b, 0);
        const sent30 = (ls['enviado'] || 0) + (ls['aceitou'] || 0) + (ls['optout'] || 0) + (ls['bloqueou'] || 0);
        return {
          ...c,
          total_matriculados: totalMatric,
          ativos:    lcs['ativo']    || 0,
          concluidos:lcs['concluido']|| 0,
          optouts:   lcs['optout']   || 0,
          sent_30d:  sent30,
          aceitou_pct: sent30 > 0 ? pct(ls['aceitou'] || 0, sent30) : null,
        };
      });

      setD({
        total,
        etapaCounts,
        origemCounts,
        tagCounts,
        dispTotal:    logs.length,
        dispAceitou:  logsByStatus['aceitou']  || 0,
        dispOptout:   logsByStatus['optout']   || 0,
        dispBloqueou: logsByStatus['bloqueou'] || 0,
        campanhasStats,
        campanhasAtivas: campanhas.filter(c => c.status === 'ativa').length,
        activity,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const aceitacaoPct = d ? pct(d.dispAceitou, d.dispTotal) : 0;

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Dashboard</h2>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-dark-700 text-zinc-400 hover:text-white hover:border-dark-600 disabled:opacity-50 transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Total de Leads"
          value={d ? d.total.toLocaleString() : '—'}
          sub="todos os contatos"
          icon={Users} color="text-neon" loading={loading} />
        <KPICard label="Campanhas Ativas"
          value={d ? d.campanhasAtivas : '—'}
          sub="rodando agora"
          icon={Megaphone} color="text-emerald-400" loading={loading} />
        <KPICard label="Disparos (30d)"
          value={d ? d.dispTotal.toLocaleString() : '—'}
          sub="últimos 30 dias"
          icon={Zap} color="text-blue-400" loading={loading} />
        <KPICard label="Taxa de Aceitação"
          value={d ? `${aceitacaoPct}%` : '—'}
          sub={d ? `${d.dispAceitou.toLocaleString()} aceitaram` : ''}
          icon={TrendingUp}
          color={aceitacaoPct >= 15 ? 'text-neon' : aceitacaoPct >= 8 ? 'text-yellow-400' : 'text-red-400'}
          loading={loading} />
      </div>

      {/* Funil + Atividade Recente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-5">Funil de Leads</h3>
          {loading ? <Skeleton rows={5} /> : (
            ETAPAS.map(e => (
              <BarRow key={e.value}
                label={e.label}
                value={d?.etapaCounts?.[e.value] || 0}
                total={d?.total || 1}
                cor={e.cor} />
            ))
          )}
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-5">Atividade Recente</h3>
          {loading ? <Skeleton rows={4} /> : !d?.activity?.length ? (
            <p className="text-zinc-600 text-sm">Nenhuma atividade registrada ainda.</p>
          ) : (
            <div className="space-y-0">
              {d.activity.map((a, i) => {
                const info = TIPO_CONFIG[a.tipo] || { emoji: '•', label: a.tipo };
                return (
                  <div key={a.id} className={`flex items-start gap-3 py-2.5 ${i < d.activity.length - 1 ? 'border-b border-dark-800' : ''}`}>
                    <span className="text-base mt-0.5 shrink-0">{info.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200">
                        <span className="font-medium">{a.leads?.nome || 'Lead'}</span>
                        <span className="text-zinc-500"> · {info.label}</span>
                      </p>
                      {a.descricao && (
                        <p className="text-xs text-zinc-600 truncate mt-0.5">{a.descricao}</p>
                      )}
                    </div>
                    <span className="text-xs text-zinc-600 shrink-0 mt-0.5">{timeAgo(a.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Produtos + Origens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-5">Leads por Produto</h3>
          {loading ? <Skeleton rows={4} /> : (
            (() => {
              const sorted = (d?.tagCounts || []).filter(t => t.count > 0).sort((a, b) => b.count - a.count);
              return sorted.length === 0
                ? <p className="text-zinc-600 text-sm">Nenhum lead com tags de produto.</p>
                : sorted.map(t => <BarRow key={t.id} label={t.nome} value={t.count} total={d?.total || 1} cor={t.cor} />);
            })()
          )}
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-5">Leads por Origem</h3>
          {loading ? <Skeleton rows={4} /> : (
            (() => {
              const rows = ORIGENS.map(o => ({ ...o, count: d?.origemCounts?.[o.value] || 0 }))
                .filter(o => o.count > 0).sort((a, b) => b.count - a.count);
              return rows.length === 0
                ? <p className="text-zinc-600 text-sm">Nenhum lead cadastrado ainda.</p>
                : rows.map(o => <BarRow key={o.value} label={o.label} value={o.count} total={d?.total || 1} cor={o.cor} />);
            })()
          )}
        </div>
      </div>

      {/* Disparos breakdown (30d) */}
      {d && d.dispTotal > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Disparados',  value: d.dispTotal,    cor: '#3b82f6', sub: '30 dias' },
            { label: 'Aceitaram',   value: d.dispAceitou,  cor: '#39ff14', sub: `${pct(d.dispAceitou, d.dispTotal)}%` },
            { label: 'Optout',      value: d.dispOptout,   cor: '#f97316', sub: `${pct(d.dispOptout, d.dispTotal)}%` },
            { label: 'Bloqueios',   value: d.dispBloqueou, cor: '#ef4444', sub: `${pct(d.dispBloqueou, d.dispTotal)}%` },
          ].map(s => (
            <div key={s.label} className="bg-dark-900 border border-dark-700 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: s.cor }}>{s.value.toLocaleString()}</p>
              <p className="text-zinc-400 text-sm mt-0.5">{s.label}</p>
              <p className="text-zinc-600 text-xs">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Campanhas Performance */}
      {(loading || (d?.campanhasStats?.length > 0)) && (
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Performance das Campanhas</h3>
          {loading ? <Skeleton rows={3} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-700">
                    {['Campanha', 'Status', 'Matriculados', 'Ativos', 'Disparos 30d', 'Aceitação'].map((h, i) => (
                      <th key={h} className={`text-zinc-500 font-medium py-2.5 ${i === 0 ? 'text-left pr-4' : i === 1 ? 'text-center px-3' : 'text-right px-3'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.campanhasStats.map(c => (
                    <tr key={c.id} className="border-b border-dark-800/60 hover:bg-dark-800/40 transition-colors">
                      <td className="py-3 pr-4 text-white font-medium">{c.nome}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-xs font-medium ${STATUS_CAMP_COLOR[c.status] || 'text-zinc-500'}`}>{c.status}</span>
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-300">{c.total_matriculados}</td>
                      <td className="py-3 px-3 text-right text-zinc-300">{c.ativos}</td>
                      <td className="py-3 px-3 text-right text-zinc-300">{c.sent_30d}</td>
                      <td className="py-3 pl-3 text-right font-medium">
                        {c.aceitou_pct !== null
                          ? <span className={c.aceitou_pct >= 15 ? 'text-neon' : c.aceitou_pct >= 8 ? 'text-yellow-400' : 'text-zinc-400'}>{c.aceitou_pct}%</span>
                          : <span className="text-zinc-700">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
