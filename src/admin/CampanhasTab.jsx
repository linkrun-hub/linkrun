import { useState, useEffect, useCallback } from 'react';
import {
  Plus, ChevronLeft, Megaphone, Play, Pause, Trash2, Settings,
  Clock, CalendarDays, Tag, Users, Check, X, ChevronDown, ChevronUp,
  Loader2, AlertCircle, GripVertical, Copy, Zap, MessageSquare,
  ToggleLeft, ToggleRight, Info, Download
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import HelpPanel from './HelpPanel.jsx';

/* ─── Constants ─── */
const STATUS_META = {
  rascunho:   { label: 'Rascunho',   cor: '#64748b' },
  ativa:      { label: 'Ativa',      cor: '#10b981' },
  pausada:    { label: 'Pausada',    cor: '#f59e0b' },
  finalizada: { label: 'Finalizada', cor: '#6b7280' },
};

const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

/* ─── Helpers ─── */
function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.rascunho;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold"
      style={{ backgroundColor: m.cor + '22', color: m.cor, border: `1px solid ${m.cor}44` }}>
      {m.label}
    </span>
  );
}

/* ─── Modal: Nova Campanha ─── */
function NovaCampanhaModal({ onClose, onCreated }) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const handleCreate = async () => {
    if (!nome.trim()) return setErro('Nome obrigatório.');
    setSaving(true);
    const { data, error } = await supabase.from('campanhas')
      .insert({ nome: nome.trim(), descricao: descricao.trim() })
      .select('id').single();
    setSaving(false);
    if (error) return setErro(error.message);
    onCreated(data.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in-up p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Nova Campanha</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Nome *</label>
            <input
              autoFocus
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon/50"
              placeholder="Ex: Nutrição Delicite — Confeitarias SP"
              value={nome} onChange={e => setNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Descrição</label>
            <textarea
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon/50 resize-none"
              rows={2} placeholder="Objetivo da campanha..."
              value={descricao} onChange={e => setDescricao(e.target.value)}
            />
          </div>
          {erro && <p className="text-xs text-red-400">{erro}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer">Cancelar</button>
          <button onClick={handleCreate} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-neon text-dark-950 font-semibold hover:bg-neon-dim transition-colors cursor-pointer disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Template Editor ─── */
function TemplateEditor({ etapaId, onChanged }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase.from('templates_mensagem')
      .select('*').eq('etapa_id', etapaId).eq('ativo', true).order('variacao');
    setTemplates(data || []);
    setLoading(false);
  }, [etapaId]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const addVariacao = async () => {
    const nextVar = (templates[templates.length - 1]?.variacao || 0) + 1;
    const { data } = await supabase.from('templates_mensagem')
      .insert({ etapa_id: etapaId, variacao: nextVar, conteudo: '', tipo: 'texto' })
      .select('*').single();
    if (data) { setTemplates(t => [...t, data]); onChanged(); }
  };

  const updateConteudo = async (id, conteudo) => {
    setTemplates(t => t.map(x => x.id === id ? { ...x, conteudo } : x));
    await supabase.from('templates_mensagem').update({ conteudo }).eq('id', id);
  };

  const removeVariacao = async (id) => {
    if (templates.length <= 1) return;
    await supabase.from('templates_mensagem').update({ ativo: false }).eq('id', id);
    setTemplates(t => t.filter(x => x.id !== id));
    onChanged();
  };

  if (loading) return <div className="py-2 text-xs text-zinc-600">Carregando templates...</div>;

  return (
    <div className="space-y-2 mt-2">
      {templates.map((tmpl, i) => (
        <div key={tmpl.id} className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-dark-700 text-zinc-400">
              Variação {String.fromCharCode(65 + i)}
            </span>
            {templates.length > 1 && (
              <button onClick={() => removeVariacao(tmpl.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <textarea
            className="w-full bg-dark-900 border border-dark-600 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-neon/40 resize-none transition-colors min-h-[80px]"
            placeholder={`Mensagem variação ${String.fromCharCode(65 + i)}...\n\nUse {{nome}} para personalizar.`}
            value={tmpl.conteudo}
            onChange={e => updateConteudo(tmpl.id, e.target.value)}
          />
        </div>
      ))}
      {templates.length < 5 && (
        <button onClick={addVariacao}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-neon transition-colors cursor-pointer px-1">
          <Plus className="w-3 h-3" /> Adicionar variação {String.fromCharCode(65 + templates.length)} (A/B)
        </button>
      )}
    </div>
  );
}

/* ─── Etapa Row ─── */
function EtapaRow({ etapa, index, isFirst, onDelete, onChanged }) {
  const [expanded, setExpanded] = useState(index === 0);
  const [nome, setNome] = useState(etapa.nome || '');
  const [delayDias, setDelayDias] = useState(etapa.delay_dias ?? 0);

  const saveEtapa = async () => {
    await supabase.from('campanha_etapas').update({ nome, delay_dias: delayDias }).eq('id', etapa.id);
    onChanged();
  };

  return (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden">
      {/* Etapa header */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-dark-900 bg-neon shrink-0">
          {etapa.numero}
        </div>
        <div className="flex-1 min-w-0">
          <input
            className="bg-transparent text-sm font-medium text-white outline-none w-full"
            placeholder={`Etapa ${etapa.numero}`}
            value={nome}
            onChange={e => setNome(e.target.value)}
            onBlur={saveEtapa}
            onClick={e => e.stopPropagation()}
          />
          <p className="text-[11px] text-zinc-500">
            {isFirst ? 'Imediatamente ao matricular' : `${delayDias} dia${delayDias !== 1 ? 's' : ''} após a etapa anterior`}
          </p>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {!isFirst && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-zinc-500">Após</span>
              <input
                type="number" min="0" max="365"
                className="w-14 bg-dark-700 border border-dark-600 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-neon/50 text-center"
                value={delayDias}
                onChange={e => setDelayDias(Number(e.target.value))}
                onBlur={saveEtapa}
              />
              <span className="text-xs text-zinc-500">dias</span>
            </div>
          )}
          <button onClick={() => onDelete(etapa.id)}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </div>
      </div>

      {/* Templates */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-dark-700/50 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400 font-medium">Mensagens</span>
            <span className="text-[10px] text-zinc-600">(rotação aleatória entre variações)</span>
          </div>
          <TemplateEditor etapaId={etapa.id} onChanged={onChanged} />
        </div>
      )}
    </div>
  );
}

async function exportarCSV(campanhaId, campanhaNome) {
  const [{ data: lcs }, { data: logs }] = await Promise.all([
    supabase.from('lead_campanhas')
      .select('*, leads(nome, whatsapp, email, etapa_funil)')
      .eq('campanha_id', campanhaId),
    supabase.from('log_disparo')
      .select('lead_id, status')
      .eq('campanha_id', campanhaId),
  ]);

  const logsByLead = {};
  (logs || []).forEach(l => {
    if (!logsByLead[l.lead_id]) logsByLead[l.lead_id] = [];
    logsByLead[l.lead_id].push(l.status);
  });

  const headers = ['Nome','WhatsApp','Email','Etapa Funil','Status Campanha','Etapa Atual','Matriculado Em','Ultima Mensagem','Disparos','Aceitou','Optout','Bloqueou'];
  const rows = (lcs || []).map(lc => {
    const ls = logsByLead[lc.lead_id] || [];
    return [
      lc.leads?.nome         || '',
      lc.leads?.whatsapp     || '',
      lc.leads?.email        || '',
      lc.leads?.etapa_funil  || '',
      lc.status,
      lc.etapa_atual,
      lc.matriculado_em      ? new Date(lc.matriculado_em).toLocaleString('pt-BR')      : '',
      lc.ultima_mensagem_em  ? new Date(lc.ultima_mensagem_em).toLocaleString('pt-BR')  : '',
      ls.length,
      ls.filter(s => s === 'aceitou').length,
      ls.filter(s => s === 'optout').length,
      ls.filter(s => s === 'bloqueou').length,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';');
  });

  const csv = '﻿' + [headers.map(h => `"${h}"`).join(';'), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `campanha_${campanhaNome.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Campanha Detail ─── */
function CampanhaDetail({ id, onBack, onChanged: notifyParent }) {
  const [campanha, setCampanha] = useState(null);
  const [etapas, setEtapas] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [campanhaTagIds, setCampanhaTagIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [secOpen, setSecOpen] = useState({ config: false, etapas: true, matricular: false });
  const [enrollResult, setEnrollResult] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [eligibleCount, setEligibleCount] = useState(null);
  const [enrolledCount, setEnrolledCount] = useState(null);

  const toggleSec = (k) => setSecOpen(s => ({ ...s, [k]: !s[k] }));

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: e }, { data: tAll }, { data: ct }] = await Promise.all([
      supabase.from('campanhas').select('*').eq('id', id).single(),
      supabase.from('campanha_etapas').select('*').eq('campanha_id', id).order('numero'),
      supabase.from('tags').select('*').order('nome'),
      supabase.from('campanha_tags').select('tag_id').eq('campanha_id', id),
    ]);
    setCampanha(c);
    setEtapas(e || []);
    setAllTags(tAll || []);
    setCampanhaTagIds((ct || []).map(r => r.tag_id));
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* Count eligible leads for enrollment */
  useEffect(() => {
    if (!id || loading) return;
    const countLeads = async () => {
      let totalQ = supabase.from('leads').select('id', { count: 'exact', head: true }).eq('optout', false);
      if (campanhaTagIds.length > 0) {
        const { data: tagLeads } = await supabase.from('lead_tags').select('lead_id').in('tag_id', campanhaTagIds);
        const ids = [...new Set((tagLeads || []).map(r => r.lead_id))];
        if (!ids.length) { setEligibleCount(0); setEnrolledCount(0); return; }
        totalQ = totalQ.in('id', ids);
      }
      const { count: total } = await totalQ;
      const { count: enrolled } = await supabase.from('lead_campanhas')
        .select('id', { count: 'exact', head: true }).eq('campanha_id', id);
      setEligibleCount(total || 0);
      setEnrolledCount(enrolled || 0);
    };
    countLeads();
  }, [id, campanhaTagIds, loading]);

  const saveCampanha = async (patch) => {
    setSaving(true);
    await supabase.from('campanhas').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    setCampanha(c => ({ ...c, ...patch }));
    setSaving(false);
    notifyParent();
  };

  const toggleStatus = async () => {
    const next = campanha.status === 'ativa' ? 'pausada' : 'ativa';
    await saveCampanha({ status: next });
  };

  const addEtapa = async () => {
    const nextNum = (etapas[etapas.length - 1]?.numero || 0) + 1;
    const defaultDelay = nextNum === 1 ? 0 : 3;
    const { data } = await supabase.from('campanha_etapas')
      .insert({ campanha_id: id, numero: nextNum, delay_dias: defaultDelay })
      .select('*').single();
    if (data) {
      /* Create default template for this step */
      await supabase.from('templates_mensagem').insert({ etapa_id: data.id, variacao: 1, conteudo: '', tipo: 'texto' });
      setEtapas(e => [...e, data]);
    }
  };

  const deleteEtapa = async (etapaId) => {
    if (!confirm('Deletar esta etapa e seus templates?')) return;
    await supabase.from('campanha_etapas').delete().eq('id', etapaId);
    setEtapas(e => e.filter(x => x.id !== etapaId));
  };

  const toggleTag = async (tagId) => {
    if (campanhaTagIds.includes(tagId)) {
      await supabase.from('campanha_tags').delete().eq('campanha_id', id).eq('tag_id', tagId);
      setCampanhaTagIds(t => t.filter(x => x !== tagId));
    } else {
      await supabase.from('campanha_tags').insert({ campanha_id: id, tag_id: tagId });
      setCampanhaTagIds(t => [...t, tagId]);
    }
  };

  const handleEnroll = async () => {
    if (!etapas.length) return alert('Adicione pelo menos uma etapa antes de matricular leads.');
    setEnrolling(true);
    setEnrollResult(null);

    /* Get leads to enroll */
    let leadIds = [];
    if (campanhaTagIds.length > 0) {
      const { data: tagLeads } = await supabase.from('lead_tags').select('lead_id').in('tag_id', campanhaTagIds);
      leadIds = [...new Set((tagLeads || []).map(r => r.lead_id))];
    } else {
      const { data: allLeads } = await supabase.from('leads').select('id').eq('optout', false);
      leadIds = (allLeads || []).map(r => r.id);
    }

    if (!leadIds.length) { setEnrolling(false); setEnrollResult({ matriculados: 0, pulados: 0 }); return; }

    /* Get already enrolled */
    const { data: jaMatriculados } = await supabase.from('lead_campanhas')
      .select('lead_id').eq('campanha_id', id).in('lead_id', leadIds);
    const jaSet = new Set((jaMatriculados || []).map(r => r.lead_id));

    const novos = leadIds.filter(lid => !jaSet.has(lid));

    /* Calculate proxima_mensagem_em from step 1 delay */
    const step1 = etapas[0];
    const agora = new Date();
    const proxima = new Date(agora.getTime() + (step1.delay_dias || 0) * 24 * 60 * 60 * 1000);

    let matriculados = 0;
    const BATCH = 50;
    for (let i = 0; i < novos.length; i += BATCH) {
      const batch = novos.slice(i, i + BATCH);
      const inserts = batch.map(lead_id => ({
        lead_id, campanha_id: id,
        etapa_atual: 1,
        status: 'ativo',
        proxima_mensagem_em: proxima.toISOString(),
        matriculado_em: agora.toISOString(),
      }));
      const { data } = await supabase.from('lead_campanhas').insert(inserts).select('id');
      matriculados += (data || []).length;
    }

    setEnrollResult({ matriculados, pulados: novos.length - matriculados });
    setEnrolledCount(c => (c || 0) + matriculados);
    setEnrolling(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-neon animate-spin" />
      </div>
    );
  }

  if (!campanha) return null;

  const isAtiva = campanha.status === 'ativa';

  return (
    <div className="animate-fade-in-up space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={onBack}
          className="p-2 rounded-xl bg-dark-800 border border-dark-700 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0 mt-0.5">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <input
            className="bg-transparent text-xl font-bold text-white outline-none w-full"
            value={campanha.nome}
            onChange={e => setCampanha(c => ({ ...c, nome: e.target.value }))}
            onBlur={() => saveCampanha({ nome: campanha.nome })}
          />
          <p className="text-sm text-zinc-500 mt-0.5">{campanha.descricao || 'Sem descrição'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={campanha.status} />
          {saving && <Loader2 className="w-3.5 h-3.5 text-zinc-600 animate-spin" />}
          <button
            onClick={async () => {
              setExporting(true);
              await exportarCSV(id, campanha.nome);
              setExporting(false);
            }}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-dark-700 border border-dark-600 text-zinc-400 hover:text-white hover:border-dark-500 transition-colors cursor-pointer disabled:opacity-50"
            title="Exportar leads como CSV"
          >
            {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            CSV
          </button>
          <button onClick={toggleStatus}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              isAtiva ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-neon/10 text-neon hover:bg-neon/20'
            }`}>
            {isAtiva ? <><Pause className="w-3 h-3" /> Pausar</> : <><Play className="w-3 h-3" /> Ativar</>}
          </button>
        </div>
      </div>

      {/* ── Seção: Configurações ── */}
      <section className="bg-dark-800 rounded-2xl border border-dark-700/50 overflow-hidden">
        <button onClick={() => toggleSec('config')}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-dark-700/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-semibold text-white">Configurações de Disparo</span>
          </div>
          {secOpen.config ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </button>

        {secOpen.config && (
          <div className="px-5 pb-5 space-y-4 border-t border-dark-700/50 pt-4">
            {/* Janela de horário */}
            <div>
              <label className="block text-xs text-zinc-400 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Janela de envio
              </label>
              <div className="flex items-center gap-3">
                <input type="time"
                  className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon/50"
                  value={campanha.janela_inicio || '08:00'}
                  onChange={e => setCampanha(c => ({ ...c, janela_inicio: e.target.value }))}
                  onBlur={() => saveCampanha({ janela_inicio: campanha.janela_inicio })}
                />
                <span className="text-zinc-500 text-sm">até</span>
                <input type="time"
                  className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon/50"
                  value={campanha.janela_fim || '19:00'}
                  onChange={e => setCampanha(c => ({ ...c, janela_fim: e.target.value }))}
                  onBlur={() => saveCampanha({ janela_fim: campanha.janela_fim })}
                />
              </div>
            </div>

            {/* Dias da semana */}
            <div>
              <label className="block text-xs text-zinc-400 mb-2 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" /> Dias ativos
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {DIAS_SEMANA.map((d, i) => {
                  const active = (campanha.dias_semana || [1,2,3,4,5]).includes(i);
                  return (
                    <button key={i}
                      onClick={() => {
                        const dias = campanha.dias_semana || [1,2,3,4,5];
                        const next = active ? dias.filter(x => x !== i) : [...dias, i].sort();
                        setCampanha(c => ({ ...c, dias_semana: next }));
                        saveCampanha({ dias_semana: next });
                      }}
                      className={`w-9 h-9 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        active ? 'bg-neon text-dark-950' : 'bg-dark-700 text-zinc-500 hover:bg-dark-600'
                      }`}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cooldown + Delays */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Cooldown entre mensagens (horas)</label>
                <input type="number" min="1" max="168"
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon/50"
                  value={campanha.cooldown_horas || 48}
                  onChange={e => setCampanha(c => ({ ...c, cooldown_horas: Number(e.target.value) }))}
                  onBlur={() => saveCampanha({ cooldown_horas: campanha.cooldown_horas })}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Pausa se bloqueio {'>'} (%)</label>
                <input type="number" min="1" max="100" step="0.5"
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon/50"
                  value={campanha.pause_se_bloqueio_pct || 5}
                  onChange={e => setCampanha(c => ({ ...c, pause_se_bloqueio_pct: Number(e.target.value) }))}
                  onBlur={() => saveCampanha({ pause_se_bloqueio_pct: campanha.pause_se_bloqueio_pct })}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Delay mínimo entre envios (seg)</label>
                <input type="number" min="30" max="3600"
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon/50"
                  value={campanha.delay_min_segundos || 120}
                  onChange={e => setCampanha(c => ({ ...c, delay_min_segundos: Number(e.target.value) }))}
                  onBlur={() => saveCampanha({ delay_min_segundos: campanha.delay_min_segundos })}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Delay máximo entre envios (seg)</label>
                <input type="number" min="30" max="3600"
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon/50"
                  value={campanha.delay_max_segundos || 480}
                  onChange={e => setCampanha(c => ({ ...c, delay_max_segundos: Number(e.target.value) }))}
                  onBlur={() => saveCampanha({ delay_max_segundos: campanha.delay_max_segundos })}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Seção: Tags Alvo ── */}
      <section className="bg-dark-800 rounded-2xl border border-dark-700/50 px-5 py-4">
        <div className="flex items-center gap-2.5 mb-3">
          <Tag className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-semibold text-white">Tags Alvo</span>
          <span className="text-xs text-zinc-600">— quais leads serão matriculados</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {allTags.map(t => {
            const active = campanhaTagIds.includes(t.id);
            return (
              <button key={t.id} onClick={() => toggleTag(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                style={active
                  ? { backgroundColor: t.cor, color: '#050507' }
                  : { backgroundColor: t.cor + '22', color: t.cor, border: `1px solid ${t.cor}44` }}>
                {active && <Check className="w-3 h-3" />}
                {t.nome}
              </button>
            );
          })}
        </div>
        {campanhaTagIds.length === 0 && (
          <p className="text-xs text-zinc-600 mt-2 flex items-center gap-1.5">
            <Info className="w-3 h-3" /> Nenhuma tag selecionada — todos os leads serão elegíveis.
          </p>
        )}
      </section>

      {/* ── Seção: Etapas & Templates ── */}
      <section className="bg-dark-800 rounded-2xl border border-dark-700/50 overflow-hidden">
        <button onClick={() => toggleSec('etapas')}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-dark-700/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-semibold text-white">Etapas & Mensagens</span>
            <span className="text-xs text-zinc-500">{etapas.length} etapa{etapas.length !== 1 ? 's' : ''}</span>
          </div>
          {secOpen.etapas ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </button>

        {secOpen.etapas && (
          <div className="px-5 pb-5 border-t border-dark-700/50 pt-4 space-y-3">
            {etapas.length === 0 && (
              <div className="text-center py-6 text-zinc-600 text-sm">
                Nenhuma etapa ainda. Adicione a primeira abaixo.
              </div>
            )}
            {etapas.map((etapa, i) => (
              <EtapaRow
                key={etapa.id}
                etapa={etapa}
                index={i}
                isFirst={i === 0}
                onDelete={deleteEtapa}
                onChanged={fetchAll}
              />
            ))}
            <button onClick={addEtapa}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-dark-600 text-sm text-zinc-500 hover:text-neon hover:border-neon/40 transition-colors cursor-pointer">
              <Plus className="w-4 h-4" /> Adicionar etapa {etapas.length + 1}
            </button>
          </div>
        )}
      </section>

      {/* ── Seção: Matricular Leads ── */}
      <section className="bg-dark-800 rounded-2xl border border-dark-700/50 overflow-hidden">
        <button onClick={() => toggleSec('matricular')}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-dark-700/30 transition-colors cursor-pointer">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-semibold text-white">Matricular Leads</span>
            {enrolledCount !== null && (
              <span className="text-xs text-zinc-500">{enrolledCount} já matriculados</span>
            )}
          </div>
          {secOpen.matricular ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </button>

        {secOpen.matricular && (
          <div className="px-5 pb-5 border-t border-dark-700/50 pt-4 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-dark-900 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{eligibleCount ?? '...'}</div>
                <div className="text-[11px] text-zinc-500">Elegíveis</div>
              </div>
              <div className="bg-dark-900 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{enrolledCount ?? '...'}</div>
                <div className="text-[11px] text-zinc-500">Já matriculados</div>
              </div>
              <div className="bg-dark-900 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-neon">
                  {eligibleCount !== null && enrolledCount !== null ? Math.max(0, eligibleCount - enrolledCount) : '...'}
                </div>
                <div className="text-[11px] text-zinc-500">Novos</div>
              </div>
            </div>

            {/* Tags info */}
            {campanhaTagIds.length > 0 ? (
              <p className="text-xs text-zinc-500">
                Serão matriculados leads com as tags:{' '}
                {allTags.filter(t => campanhaTagIds.includes(t.id)).map(t => (
                  <span key={t.id} className="font-medium" style={{ color: t.cor }}>{t.nome} </span>
                ))}
              </p>
            ) : (
              <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                <Info className="w-3 h-3 shrink-0" /> Nenhuma tag definida — todos os leads não optout serão matriculados.
              </p>
            )}

            {/* Result */}
            {enrollResult && (
              <div className="flex items-center gap-2 text-sm text-neon bg-neon/5 rounded-xl px-4 py-3 border border-neon/20">
                <Check className="w-4 h-4 shrink-0" />
                <span>{enrollResult.matriculados} leads matriculados.{enrollResult.pulados > 0 ? ` ${enrollResult.pulados} já estavam.` : ''}</span>
              </div>
            )}

            {/* Enroll button */}
            <button
              onClick={handleEnroll}
              disabled={enrolling || etapas.length === 0 || (eligibleCount !== null && enrolledCount !== null && eligibleCount - enrolledCount <= 0)}
              className="flex items-center gap-2 w-full justify-center px-4 py-3 rounded-xl text-sm bg-neon text-dark-950 font-semibold hover:bg-neon-dim transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {enrolling ? <><Loader2 className="w-4 h-4 animate-spin" /> Matriculando...</> : <><Users className="w-4 h-4" /> Matricular {eligibleCount !== null && enrolledCount !== null ? Math.max(0, eligibleCount - enrolledCount) : ''} leads</>}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Campanha Card ─── */
function CampanhaCard({ campanha, tagCount, enrolledCount, onSelect, onDelete }) {
  const m = STATUS_META[campanha.status] || STATUS_META.rascunho;
  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700/50 p-4 hover:border-dark-600 transition-all group animate-fade-in-up cursor-pointer"
      onClick={() => onSelect(campanha.id)}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: m.cor + '22', border: `1px solid ${m.cor}44` }}>
          <Megaphone className="w-4 h-4" style={{ color: m.cor }} />
        </div>
        <StatusBadge status={campanha.status} />
      </div>
      <p className="text-sm font-semibold text-white mb-1 line-clamp-2">{campanha.nome}</p>
      {campanha.descricao && <p className="text-xs text-zinc-500 mb-3 line-clamp-1">{campanha.descricao}</p>}
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {tagCount} tag{tagCount !== 1 ? 's' : ''}</span>
        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {enrolledCount} lead{enrolledCount !== 1 ? 's' : ''}</span>
      </div>
      <div className="flex justify-end mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onDelete(campanha.id); }}
          className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─── CampanhasTab principal ─── */
export default function CampanhasTab() {
  const [campanhas, setCampanhas] = useState([]);
  const [tagCounts, setTagCounts] = useState({});
  const [enrollCounts, setEnrollCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchCampanhas = useCallback(async () => {
    setLoading(true);
    const { data: camps } = await supabase.from('campanhas').select('*').order('created_at', { ascending: false });
    setCampanhas(camps || []);

    if (camps?.length) {
      const ids = camps.map(c => c.id);
      const [{ data: ct }, { data: lc }] = await Promise.all([
        supabase.from('campanha_tags').select('campanha_id').in('campanha_id', ids),
        supabase.from('lead_campanhas').select('campanha_id').in('campanha_id', ids),
      ]);
      const tc = {}, ec = {};
      ids.forEach(id => { tc[id] = 0; ec[id] = 0; });
      (ct || []).forEach(r => { tc[r.campanha_id] = (tc[r.campanha_id] || 0) + 1; });
      (lc || []).forEach(r => { ec[r.campanha_id] = (ec[r.campanha_id] || 0) + 1; });
      setTagCounts(tc);
      setEnrollCounts(ec);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCampanhas(); }, [fetchCampanhas]);

  const handleDelete = async (id) => {
    if (!confirm('Deletar esta campanha? Todos os leads matriculados serão removidos.')) return;
    await supabase.from('campanhas').delete().eq('id', id);
    setCampanhas(c => c.filter(x => x.id !== id));
  };

  const handleCreated = (id) => {
    fetchCampanhas();
    setSelected(id);
  };

  /* ── Detail view ── */
  if (selected) {
    return (
      <CampanhaDetail
        id={selected}
        onBack={() => { setSelected(null); fetchCampanhas(); }}
        onChanged={fetchCampanhas}
      />
    );
  }

  /* ── List view ── */
  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Campanhas</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{campanhas.length} campanha{campanhas.length !== 1 ? 's' : ''} criada{campanhas.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-neon text-dark-950 font-semibold hover:bg-neon-dim transition-colors cursor-pointer">
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </div>

      <HelpPanel tabKey="campanhas" items={[
        { icon: '📣', title: 'Criar Campanha', desc: 'Defina nome, janela de horário (ex: 08:00–19:00), dias da semana e delays entre mensagens. A campanha começa como Rascunho.' },
        { icon: '📝', title: 'Etapas & Mensagens', desc: 'Cada campanha tem etapas numeradas. Em cada etapa, adicione variações de mensagem — o sistema sorteia uma aleatoriamente no envio.' },
        { icon: '🏷️', title: 'Tags Alvo', desc: 'Vincule tags de produto à campanha para filtrar quais leads podem ser matriculados. Uma campanha pode ter múltiplas tags.' },
        { icon: '⏰', title: 'Janela de Horário', desc: 'Mensagens só são enviadas dentro da janela configurada (horário de Brasília). Fora do horário, o envio é adiado automaticamente.' },
        { icon: '👥', title: 'Matricular Leads', desc: 'Na aba Leads, clique no ícone de campanha de um lead para matriculá-lo. Ele entrará na fila da etapa 1 imediatamente.' },
        { icon: '⬇️', title: 'Exportar CSV', desc: 'No detalhe da campanha, clique em CSV para baixar todos os leads matriculados com status, disparos, aceitações e optouts.' },
        { icon: '🛡️', title: 'Anti-Bloqueio', desc: 'Se a taxa de bloqueio superar o limite (padrão 5%), a campanha é pausada automaticamente. Você recebe um alerta na aba Disparo.' },
        { icon: '⏱️', title: 'Delays', desc: 'Configure delay mínimo e máximo em segundos entre cada envio. Um valor aleatório dentro do intervalo é sorteado para cada mensagem.' },
      ]} />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-neon animate-spin" />
        </div>
      ) : campanhas.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-center">
          <Megaphone className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-500 text-sm">Nenhuma campanha ainda.</p>
          <button onClick={() => setShowModal(true)} className="text-xs text-neon hover:underline cursor-pointer">
            Criar primeira campanha
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {campanhas.map(c => (
            <CampanhaCard
              key={c.id}
              campanha={c}
              tagCount={tagCounts[c.id] || 0}
              enrolledCount={enrollCounts[c.id] || 0}
              onSelect={setSelected}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NovaCampanhaModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
