import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Upload, Image, Search, Phone, Mail, AtSign,
  Building2, MapPin, ChevronLeft, ChevronRight, MessageSquare,
  Trash2, X, Check, AlertCircle, FileText, Loader2,
  UserX, Tag, ChevronDown, Users
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';

const PAGE_SIZE = 50;

const ETAPAS = [
  { value: 'frio',      label: 'Frio',      cor: '#64748b' },
  { value: 'morno',     label: 'Morno',     cor: '#f59e0b' },
  { value: 'quente',    label: 'Quente',    cor: '#ef4444' },
  { value: 'assinante', label: 'Assinante', cor: '#10b981' },
  { value: 'churn',     label: 'Churn',     cor: '#6b7280' },
];

const ORIGENS = [
  { value: 'manual',      label: 'Manual' },
  { value: 'planilha',    label: 'Planilha' },
  { value: 'ocr',         label: 'Print IA' },
  { value: 'botconversa', label: 'BotConversa' },
  { value: 'dataprospect',label: 'DataProspect' },
  { value: 'meta_ads',    label: 'Meta Ads' },
];

function etapaCor(v) {
  return ETAPAS.find(e => e.value === v)?.cor ?? '#64748b';
}
function etapaLabel(v) {
  return ETAPAS.find(e => e.value === v)?.label ?? v;
}
function origemLabel(v) {
  return ORIGENS.find(o => o.value === v)?.label ?? v;
}
function fmtTel(t) {
  if (!t) return '';
  const d = t.replace(/\D/g, '');
  if (d.length >= 12) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`;
  if (d.length >= 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  return t;
}
function initials(nome) {
  if (!nome) return '?';
  return nome.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

/* ─── EtapaSelect inline ─── */
function EtapaSelect({ lead, onChanged }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const change = async (v) => {
    setSaving(true);
    setOpen(false);
    await supabase.from('leads').update({ etapa_funil: v }).eq('id', lead.id);
    setSaving(false);
    onChanged();
  };

  const cor = etapaCor(lead.etapa_funil);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer hover:opacity-80"
        style={{ backgroundColor: cor + '22', color: cor, border: `1px solid ${cor}44` }}
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {etapaLabel(lead.etapa_funil)}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl py-1 min-w-[140px]">
          {ETAPAS.map(e => (
            <button
              key={e.value}
              onClick={() => change(e.value)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-dark-700 transition-colors flex items-center gap-2 cursor-pointer"
              style={{ color: e.cor }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.cor }} />
              {e.label}
              {lead.etapa_funil === e.value && <Check className="w-3 h-3 ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── TagBadge ─── */
function TagBadge({ tag }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
      style={{ backgroundColor: tag.cor + '22', color: tag.cor, border: `1px solid ${tag.cor}33` }}
    >
      {tag.nome}
    </span>
  );
}

/* ─── LeadCard ─── */
function LeadCard({ lead, tags, onEtapaChanged, onDelete }) {
  const wa = (lead.whatsapp || lead.telefone || '').replace(/\D/g, '');

  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700/50 p-4 hover:border-dark-600 transition-all group animate-fade-in-up">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-dark-900 shrink-0"
          style={{ backgroundColor: etapaCor(lead.etapa_funil) }}>
          {initials(lead.nome)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{lead.nome}</p>
              {lead.razao_social && lead.razao_social !== lead.nome && (
                <p className="text-xs text-zinc-500 truncate">{lead.razao_social}</p>
              )}
            </div>
            <EtapaSelect lead={lead} onChanged={onEtapaChanged} />
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tags.map(t => <TagBadge key={t.id} tag={t} />)}
            </div>
          )}

          {/* Contatos */}
          <div className="mt-2 space-y-0.5">
            {(lead.whatsapp || lead.telefone) && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Phone className="w-3 h-3 shrink-0" />
                <span className="truncate">{fmtTel(lead.whatsapp || lead.telefone)}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {lead.instagram && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <AtSign className="w-3 h-3 shrink-0" />
                <span className="truncate">{lead.instagram}</span>
              </div>
            )}
            {lead.atividade && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{lead.atividade}</span>
              </div>
            )}
            {(lead.cidade || lead.estado) && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <MapPin className="w-3 h-3 shrink-0" />
                <span>{[lead.cidade, lead.estado].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-dark-700 text-zinc-500">
              {origemLabel(lead.origem)}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {wa && (
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </a>
              )}
              {lead.optout && <UserX className="w-3.5 h-3.5 text-red-400" title="Optout" />}
              <button
                onClick={() => onDelete(lead.id)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal: Adicionar Manual ─── */
function ModalManual({ tags, onClose, onSaved }) {
  const emptyForm = { nome: '', telefone: '', whatsapp: '', email: '', instagram: '',
    cnpj: '', razao_social: '', atividade: '', decisor: '', cidade: '', estado: '', notas: '',
    etapa_funil: 'frio', origem: 'manual' };
  const [form, setForm] = useState(emptyForm);
  const [selectedTags, setSelectedTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleTag = (id) => setSelectedTags(t => t.includes(id) ? t.filter(x => x !== id) : [...t, id]);

  const handleSave = async () => {
    if (!form.nome.trim()) return setErro('Nome obrigatório.');
    const tel = (form.whatsapp || form.telefone).replace(/\D/g, '');
    if (tel && tel.length < 10) return setErro('Telefone inválido (mínimo 10 dígitos).');
    setSaving(true);
    setErro('');

    const { data, error } = await supabase.from('leads').insert({
      ...form,
      nome: form.nome.trim(),
      updated_at: new Date().toISOString(),
    }).select('id').single();

    if (error) {
      setSaving(false);
      return setErro(error.message);
    }

    if (selectedTags.length > 0) {
      await supabase.from('lead_tags').insert(selectedTags.map(tag_id => ({ lead_id: data.id, tag_id })));
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  const Field = ({ label, k, placeholder, half }) => (
    <div className={half ? 'flex-1 min-w-[120px]' : 'w-full'}>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <input
        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon/50 transition-colors"
        placeholder={placeholder}
        value={form[k]}
        onChange={e => set(k, e.target.value)}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="font-semibold text-white">Novo Lead Manual</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Nome *" k="nome" placeholder="Nome do contato ou empresa" />
          <div className="flex gap-3 flex-wrap">
            <Field label="WhatsApp" k="whatsapp" placeholder="5511999999999" half />
            <Field label="Telefone" k="telefone" placeholder="(11) 9 9999-9999" half />
          </div>
          <div className="flex gap-3 flex-wrap">
            <Field label="Email" k="email" placeholder="email@exemplo.com" half />
            <Field label="Instagram" k="instagram" placeholder="@perfil" half />
          </div>
          <div className="flex gap-3 flex-wrap">
            <Field label="Cidade" k="cidade" placeholder="São Paulo" half />
            <Field label="Estado" k="estado" placeholder="SP" half />
          </div>
          <Field label="Atividade / Segmento" k="atividade" placeholder="Confeitaria, Transportadora..." />
          <div className="flex gap-3 flex-wrap">
            <Field label="CNPJ" k="cnpj" placeholder="00.000.000/0001-00" half />
            <Field label="Decisor" k="decisor" placeholder="Nome do responsável" half />
          </div>
          <Field label="Razão Social" k="razao_social" placeholder="Razão social (se diferente do nome)" />
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notas</label>
            <textarea
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon/50 resize-none transition-colors"
              rows={2}
              placeholder="Observações..."
              value={form.notas}
              onChange={e => set('notas', e.target.value)}
            />
          </div>

          {/* Etapa */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Etapa do Funil</label>
            <div className="flex flex-wrap gap-2">
              {ETAPAS.map(e => (
                <button
                  key={e.value}
                  onClick={() => set('etapa_funil', e.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  style={form.etapa_funil === e.value
                    ? { backgroundColor: e.cor, color: '#050507' }
                    : { backgroundColor: e.cor + '22', color: e.cor, border: `1px solid ${e.cor}44` }}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Tags de Produto</label>
              <div className="flex flex-wrap gap-2">
                {tags.map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleTag(t.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                    style={selectedTags.includes(t.id)
                      ? { backgroundColor: t.cor, color: '#050507' }
                      : { backgroundColor: t.cor + '22', color: t.cor, border: `1px solid ${t.cor}44` }}
                  >
                    {selectedTags.includes(t.id) && <Check className="w-3 h-3" />}
                    {t.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {erro && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{erro}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-dark-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-neon text-dark-950 font-semibold hover:bg-neon-dim transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Salvar Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal: Importar CSV ─── */
function ModalCSV({ tags, onClose, onSaved }) {
  const [step, setStep] = useState('upload'); // upload | preview | importing | done
  const [rows, setRows] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [etapa, setEtapa] = useState('frio');
  const [result, setResult] = useState({ inseridos: 0, pulados: 0 });
  const [erro, setErro] = useState('');
  const fileRef = useRef();

  const toggleTag = (id) => setSelectedTags(t => t.includes(id) ? t.filter(x => x !== id) : [...t, id]);

  /* Mapeia cabeçalhos do DataProspect e qualquer CSV genérico */
  const mapRow = (headers, values) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h.toLowerCase().trim()] = (values[i] || '').trim(); });

    const get = (...keys) => {
      for (const k of keys) {
        for (const h of Object.keys(obj)) {
          if (h.includes(k)) return obj[h];
        }
      }
      return '';
    };

    return {
      nome:        get('nome', 'name', 'razão', 'empresa'),
      razao_social:get('razão', 'razao', 'company'),
      cnpj:        get('cnpj'),
      telefone:    get('telefone', 'fone', 'phone', 'tel'),
      whatsapp:    get('whatsapp', 'wapp', 'wa'),
      email:       get('email', 'e-mail'),
      instagram:   get('instagram', 'insta'),
      atividade:   get('atividade', 'segmento', 'activity', 'category'),
      decisor:     get('decisor', 'contato', 'responsável'),
      cidade:      get('cidade', 'city', 'município'),
      estado:      get('estado', 'uf', 'state'),
    };
  };

  const handleFile = (file) => {
    setErro('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return setErro('Arquivo vazio ou sem dados.');

      /* Detecta separador */
      const sep = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim());
      const parsed = lines.slice(1).map(l => {
        const vals = l.split(sep).map(v => v.replace(/^"|"$/g, '').trim());
        return mapRow(headers, vals);
      }).filter(r => r.nome);

      if (parsed.length === 0) return setErro('Nenhuma linha com nome encontrada.');
      setRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleImport = async () => {
    setStep('importing');
    let inseridos = 0, pulados = 0;

    /* Busca whatsapps/telefones já existentes para dedup */
    const waNums = rows.map(r => (r.whatsapp || r.telefone).replace(/\D/g, '')).filter(Boolean);
    const { data: existentes } = await supabase.from('leads')
      .select('whatsapp, telefone')
      .in('whatsapp', waNums.length ? waNums : ['__none__']);

    const existSet = new Set([
      ...(existentes || []).map(e => (e.whatsapp || '').replace(/\D/g, '')),
      ...(existentes || []).map(e => (e.telefone || '').replace(/\D/g, '')),
    ]);

    for (const row of rows) {
      const waClean = (row.whatsapp || row.telefone).replace(/\D/g, '');
      if (waClean && existSet.has(waClean)) { pulados++; continue; }

      const { data: inserted } = await supabase.from('leads')
        .insert({ ...row, etapa_funil: etapa, origem: 'planilha', updated_at: new Date().toISOString() })
        .select('id').single();

      if (inserted && selectedTags.length > 0) {
        await supabase.from('lead_tags').insert(selectedTags.map(tag_id => ({ lead_id: inserted.id, tag_id })));
      }
      if (inserted) { inseridos++; if (waClean) existSet.add(waClean); }
      else pulados++;
    }

    setResult({ inseridos, pulados });
    setStep('done');
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={step !== 'importing' ? onClose : undefined} />
      <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="font-semibold text-white">Importar CSV / DataProspect</h3>
          {step !== 'importing' && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* STEP: upload */}
          {step === 'upload' && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-dark-600 rounded-2xl p-8 text-center hover:border-neon/40 transition-colors cursor-pointer"
              >
                <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400 font-medium">Arraste o arquivo ou clique para selecionar</p>
                <p className="text-xs text-zinc-600 mt-1">CSV exportado do DataProspect ou qualquer planilha</p>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
              </div>
              {erro && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{erro}
                </div>
              )}
            </>
          )}

          {/* STEP: preview */}
          {step === 'preview' && (
            <>
              <div className="flex items-center gap-2 text-sm text-neon bg-neon/5 rounded-xl px-4 py-3 border border-neon/20">
                <Check className="w-4 h-4 shrink-0" />
                <span>{rows.length} contatos lidos do arquivo.</span>
              </div>

              {/* Preview */}
              <div className="space-y-2 max-h-44 overflow-y-auto">
                <p className="text-xs text-zinc-500">Prévia dos primeiros 5:</p>
                {rows.slice(0, 5).map((r, i) => (
                  <div key={i} className="px-3 py-2 bg-dark-800 rounded-lg border border-dark-700 text-xs text-zinc-300">
                    <span className="font-medium text-white">{r.nome}</span>
                    {r.whatsapp && <span className="ml-2 text-zinc-500">{r.whatsapp}</span>}
                    {r.atividade && <span className="ml-2 text-zinc-600">· {r.atividade}</span>}
                  </div>
                ))}
                {rows.length > 5 && <p className="text-xs text-zinc-600 px-1">...e mais {rows.length - 5}.</p>}
              </div>

              {/* Etapa */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Etapa inicial</label>
                <div className="flex flex-wrap gap-2">
                  {ETAPAS.map(e => (
                    <button key={e.value} onClick={() => setEtapa(e.value)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                      style={etapa === e.value
                        ? { backgroundColor: e.cor, color: '#050507' }
                        : { backgroundColor: e.cor + '22', color: e.cor, border: `1px solid ${e.cor}44` }}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Tags para todos os contatos</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(t => (
                      <button key={t.id} onClick={() => toggleTag(t.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                        style={selectedTags.includes(t.id)
                          ? { backgroundColor: t.cor, color: '#050507' }
                          : { backgroundColor: t.cor + '22', color: t.cor, border: `1px solid ${t.cor}44` }}
                      >
                        {selectedTags.includes(t.id) && <Check className="w-3 h-3" />}
                        {t.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP: importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <Loader2 className="w-8 h-8 text-neon animate-spin" />
              <p className="text-sm text-zinc-400">Importando {rows.length} contatos...</p>
              <p className="text-xs text-zinc-600">Não feche esta janela.</p>
            </div>
          )}

          {/* STEP: done */}
          {step === 'done' && (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-neon/10 border border-neon/30 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-neon" />
              </div>
              <div>
                <p className="text-white font-semibold">{result.inseridos} leads importados</p>
                {result.pulados > 0 && (
                  <p className="text-xs text-zinc-500 mt-1">{result.pulados} pulados (duplicatas ou erro)</p>
                )}
              </div>
            </div>
          )}
        </div>

        {(step === 'preview' || step === 'done') && (
          <div className="px-5 py-4 border-t border-dark-700 flex justify-end gap-3">
            {step === 'preview' && (
              <>
                <button onClick={() => setStep('upload')} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer">
                  Voltar
                </button>
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-neon text-dark-950 font-semibold hover:bg-neon-dim transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" /> Importar {rows.length} leads
                </button>
              </>
            )}
            {step === 'done' && (
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm bg-neon text-dark-950 font-semibold hover:bg-neon-dim transition-colors cursor-pointer">
                Fechar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Modal: Importar Print (OCR) ─── */
function ModalOCR({ tags, onClose, onSaved }) {
  const [step, setStep] = useState('paste'); // paste | extracting | review | saving | done
  const [imgSrc, setImgSrc] = useState(null);
  const [leadsExtraidos, setLeadsExtraidos] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [etapa, setEtapa] = useState('frio');
  const [erro, setErro] = useState('');
  const [result, setResult] = useState(0);
  const dropRef = useRef();
  const fileRef = useRef();

  const toggleTag = (id) => setSelectedTags(t => t.includes(id) ? t.filter(x => x !== id) : [...t, id]);

  useEffect(() => {
    const handlePaste = (e) => {
      const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/'));
      if (item) {
        const blob = item.getAsFile();
        const url = URL.createObjectURL(blob);
        setImgSrc(url);
        extractFromBlob(blob);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const extractFromBlob = async (blob) => {
    setStep('extracting');
    setErro('');
    try {
      const base64 = await new Promise((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const { data, error } = await supabase.functions.invoke('extrair-lead-linkrun', {
        body: { imageBase64: base64 }
      });

      if (error || !data?.leads?.length) {
        setErro('Não foi possível detectar contatos nesta imagem. Tente uma imagem mais nítida.');
        setStep('paste');
        return;
      }

      setLeadsExtraidos(data.leads.map((l, i) => ({ ...l, _key: i, _selected: true })));
      setStep('review');
    } catch (e) {
      setErro('Erro ao processar imagem: ' + e.message);
      setStep('paste');
    }
  };

  const handleFile = (file) => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    extractFromBlob(file);
  };

  const toggleLead = (key) => {
    setLeadsExtraidos(l => l.map(x => x._key === key ? { ...x, _selected: !x._selected } : x));
  };
  const updateLead = (key, field, value) => {
    setLeadsExtraidos(l => l.map(x => x._key === key ? { ...x, [field]: value } : x));
  };

  const handleSave = async () => {
    const toSave = leadsExtraidos.filter(l => l._selected);
    if (!toSave.length) return;
    setStep('saving');

    let saved = 0;
    for (const lead of toSave) {
      const { _key, _selected, ...payload } = lead;
      const { data } = await supabase.from('leads')
        .insert({ ...payload, etapa_funil: etapa, origem: 'ocr', updated_at: new Date().toISOString() })
        .select('id').single();
      if (data && selectedTags.length > 0) {
        await supabase.from('lead_tags').insert(selectedTags.map(tag_id => ({ lead_id: data.id, tag_id })));
      }
      if (data) saved++;
    }

    setResult(saved);
    setStep('done');
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={step !== 'extracting' && step !== 'saving' ? onClose : undefined} />
      <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="font-semibold text-white">Importar via Print (IA)</h3>
          {step !== 'extracting' && step !== 'saving' && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* STEP: paste */}
          {step === 'paste' && (
            <>
              <div
                ref={dropRef}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-dark-600 rounded-2xl p-8 text-center hover:border-neon/40 transition-colors cursor-pointer"
              >
                <Image className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400 font-medium">Cole uma imagem (Ctrl+V) ou clique para selecionar</p>
                <p className="text-xs text-zinc-600 mt-1">Print de lista do WhatsApp, grupos, planilha, Instagram...</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
              </div>
              {erro && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{erro}
                </div>
              )}
            </>
          )}

          {/* STEP: extracting */}
          {step === 'extracting' && (
            <div className="flex flex-col items-center py-8 gap-4">
              {imgSrc && <img src={imgSrc} className="max-h-40 rounded-xl object-contain border border-dark-700" />}
              <Loader2 className="w-7 h-7 text-neon animate-spin" />
              <p className="text-sm text-zinc-400">Analisando imagem com IA...</p>
            </div>
          )}

          {/* STEP: review */}
          {step === 'review' && (
            <>
              <div className="flex items-center gap-2 text-sm text-neon bg-neon/5 rounded-xl px-4 py-3 border border-neon/20">
                <Check className="w-4 h-4 shrink-0" />
                <span>{leadsExtraidos.length} contatos detectados. Revise e edite antes de salvar.</span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto">
                {leadsExtraidos.map(lead => (
                  <div key={lead._key}
                    className={`px-3 py-2.5 rounded-xl border transition-all ${lead._selected ? 'bg-dark-800 border-dark-600' : 'bg-dark-900/50 border-dark-800 opacity-50'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <button onClick={() => toggleLead(lead._key)} className="w-4 h-4 rounded border border-dark-500 flex items-center justify-center cursor-pointer hover:border-neon/50"
                        style={lead._selected ? { backgroundColor: '#39ff14', borderColor: '#39ff14' } : {}}>
                        {lead._selected && <Check className="w-2.5 h-2.5 text-dark-950" />}
                      </button>
                      <span className="text-xs font-medium text-white">{lead.nome || '(sem nome)'}</span>
                    </div>
                    {lead._selected && (
                      <div className="grid grid-cols-2 gap-1.5">
                        {[['nome','Nome'],['whatsapp','WhatsApp'],['email','Email'],['instagram','Instagram']].map(([k,l]) => (
                          <input key={k}
                            className="bg-dark-700 border border-dark-600 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-neon/40"
                            placeholder={l}
                            value={lead[k] || ''}
                            onChange={e => updateLead(lead._key, k, e.target.value)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Etapa */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Etapa inicial</label>
                <div className="flex flex-wrap gap-2">
                  {ETAPAS.map(e => (
                    <button key={e.value} onClick={() => setEtapa(e.value)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                      style={etapa === e.value
                        ? { backgroundColor: e.cor, color: '#050507' }
                        : { backgroundColor: e.cor + '22', color: e.cor, border: `1px solid ${e.cor}44` }}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(t => (
                      <button key={t.id} onClick={() => toggleTag(t.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                        style={selectedTags.includes(t.id)
                          ? { backgroundColor: t.cor, color: '#050507' }
                          : { backgroundColor: t.cor + '22', color: t.cor, border: `1px solid ${t.cor}44` }}
                      >
                        {selectedTags.includes(t.id) && <Check className="w-3 h-3" />}
                        {t.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP: saving */}
          {step === 'saving' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <Loader2 className="w-8 h-8 text-neon animate-spin" />
              <p className="text-sm text-zinc-400">Salvando leads...</p>
            </div>
          )}

          {/* STEP: done */}
          {step === 'done' && (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-neon/10 border border-neon/30 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-neon" />
              </div>
              <div>
                <p className="text-white font-semibold">{result} leads salvos</p>
              </div>
            </div>
          )}
        </div>

        {(step === 'review' || step === 'done') && (
          <div className="px-5 py-4 border-t border-dark-700 flex justify-end gap-3">
            {step === 'review' && (
              <>
                <button onClick={() => setStep('paste')} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer">
                  Voltar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!leadsExtraidos.some(l => l._selected)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-neon text-dark-950 font-semibold hover:bg-neon-dim transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> Salvar {leadsExtraidos.filter(l => l._selected).length} leads
                </button>
              </>
            )}
            {step === 'done' && (
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm bg-neon text-dark-950 font-semibold hover:bg-neon-dim transition-colors cursor-pointer">
                Fechar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── LeadsTab principal ─── */
export default function LeadsTab() {
  const [leads, setLeads] = useState([]);
  const [tagsMap, setTagsMap] = useState({});    // leadId → tag[]
  const [allTags, setAllTags] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState('');
  const [filtroTag, setFiltroTag] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('');

  const [modal, setModal] = useState(null); // null | 'manual' | 'csv' | 'ocr'

  /* Stats por etapa */
  const [stats, setStats] = useState({});

  const fetchTags = useCallback(async () => {
    const { data } = await supabase.from('tags').select('*').order('nome');
    setAllTags(data || []);
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);

    let q = supabase.from('leads').select('*', { count: 'exact' });

    if (search)       q = q.or(`nome.ilike.%${search}%,telefone.ilike.%${search}%,whatsapp.ilike.%${search}%,email.ilike.%${search}%,razao_social.ilike.%${search}%`);
    if (filtroEtapa)  q = q.eq('etapa_funil', filtroEtapa);
    if (filtroOrigem) q = q.eq('origem', filtroOrigem);

    /* Filtro por tag requer subquery */
    if (filtroTag) {
      const { data: tagLeads } = await supabase
        .from('lead_tags').select('lead_id').eq('tag_id', filtroTag);
      const ids = (tagLeads || []).map(r => r.lead_id);
      if (!ids.length) { setLeads([]); setTotal(0); setLoading(false); return; }
      q = q.in('id', ids);
    }

    q = q.order('created_at', { ascending: false })
         .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count } = await q;
    setLeads(data || []);
    setTotal(count || 0);

    /* Busca tags dos leads carregados */
    if (data?.length) {
      const { data: lt } = await supabase
        .from('lead_tags')
        .select('lead_id, tags(*)')
        .in('lead_id', data.map(l => l.id));

      const map = {};
      (lt || []).forEach(({ lead_id, tags }) => {
        if (!map[lead_id]) map[lead_id] = [];
        if (tags) map[lead_id].push(tags);
      });
      setTagsMap(map);
    } else {
      setTagsMap({});
    }

    setLoading(false);
  }, [search, filtroEtapa, filtroTag, filtroOrigem, page]);

  const fetchStats = useCallback(async () => {
    const { data } = await supabase.from('leads').select('etapa_funil');
    const counts = {};
    (data || []).forEach(l => { counts[l.etapa_funil] = (counts[l.etapa_funil] || 0) + 1; });
    setStats(counts);
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);
  useEffect(() => { setPage(0); }, [search, filtroEtapa, filtroTag, filtroOrigem]);
  useEffect(() => { fetchLeads(); fetchStats(); }, [fetchLeads, fetchStats]);

  const handleDelete = async (id) => {
    if (!confirm('Deletar este lead?')) return;
    await supabase.from('leads').delete().eq('id', id);
    fetchLeads();
    fetchStats();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Leads</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{total.toLocaleString()} contatos cadastrados</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setModal('ocr')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-dark-700 text-zinc-400 hover:text-white hover:border-dark-600 transition-colors cursor-pointer"
          >
            <Image className="w-4 h-4" /> Print IA
          </button>
          <button
            onClick={() => setModal('csv')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-dark-700 text-zinc-400 hover:text-white hover:border-dark-600 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Planilha
          </button>
          <button
            onClick={() => setModal('manual')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-neon text-dark-950 font-semibold hover:bg-neon-dim transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Novo Lead
          </button>
        </div>
      </div>

      {/* Stats por etapa */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ETAPAS.map(e => (
          <button
            key={e.value}
            onClick={() => setFiltroEtapa(filtroEtapa === e.value ? '' : e.value)}
            className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${filtroEtapa === e.value ? 'border-current' : 'border-dark-700 hover:border-dark-600'}`}
            style={{ backgroundColor: e.cor + '11', color: e.cor, ...(filtroEtapa === e.value ? { borderColor: e.cor + '66' } : {}) }}
          >
            <div className="text-lg font-bold">{(stats[e.value] || 0).toLocaleString()}</div>
            <div className="text-[11px] font-medium opacity-80">{e.label}</div>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
            placeholder="Buscar nome, telefone, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-zinc-600 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={filtroTag}
          onChange={e => setFiltroTag(e.target.value)}
          className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-sm text-zinc-400 outline-none cursor-pointer hover:border-dark-600 transition-colors"
        >
          <option value="">Todas as tags</option>
          {allTags.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>

        <select
          value={filtroOrigem}
          onChange={e => setFiltroOrigem(e.target.value)}
          className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-sm text-zinc-400 outline-none cursor-pointer hover:border-dark-600 transition-colors"
        >
          <option value="">Todas as origens</option>
          {ORIGENS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {(filtroEtapa || filtroTag || filtroOrigem || search) && (
          <button
            onClick={() => { setFiltroEtapa(''); setFiltroTag(''); setFiltroOrigem(''); setSearch(''); }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm border border-dark-700 text-zinc-500 hover:text-white hover:border-dark-600 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Limpar filtros
          </button>
        )}
      </div>

      {/* Grid de leads */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-neon animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-center">
          <Users className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-500 text-sm">Nenhum lead encontrado.</p>
          <button
            onClick={() => setModal('manual')}
            className="text-xs text-neon hover:underline cursor-pointer"
          >
            Adicionar o primeiro lead
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              tags={tagsMap[lead.id] || []}
              onEtapaChanged={() => { fetchLeads(); fetchStats(); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-xl border border-dark-700 text-zinc-400 hover:text-white hover:border-dark-600 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-zinc-500">
            {page + 1} / {totalPages}
            <span className="text-zinc-600 ml-2">({total} total)</span>
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-xl border border-dark-700 text-zinc-400 hover:text-white hover:border-dark-600 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-default"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modals */}
      {modal === 'manual' && (
        <ModalManual tags={allTags} onClose={() => setModal(null)} onSaved={() => { fetchLeads(); fetchStats(); }} />
      )}
      {modal === 'csv' && (
        <ModalCSV tags={allTags} onClose={() => setModal(null)} onSaved={() => { fetchLeads(); fetchStats(); }} />
      )}
      {modal === 'ocr' && (
        <ModalOCR tags={allTags} onClose={() => setModal(null)} onSaved={() => { fetchLeads(); fetchStats(); }} />
      )}
    </div>
  );
}
