import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import HelpPanel from './HelpPanel.jsx';

const CORES_PRESET = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#ec4899',
  '#84cc16', '#6366f1', '#14b8a6', '#a855f7',
];

function TagRow({ tag, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(tag.nome);
  const [cor, setCor] = useState(tag.cor);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    await onSave(tag.id, nome.trim(), cor);
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setNome(tag.nome);
    setCor(tag.cor);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-dark-800 rounded-xl border border-dark-700/50 group">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.cor }} />
          <span className="text-sm font-medium text-white">{tag.nome}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-700 text-zinc-500 uppercase tracking-wider">
            {tag.tipo}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(tag.id)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-dark-800 rounded-xl border border-neon/30 space-y-3">
      <input
        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon/50"
        value={nome}
        onChange={e => setNome(e.target.value)}
        placeholder="Nome da tag"
        onKeyDown={e => e.key === 'Enter' && handleSave()}
      />
      <div className="flex flex-wrap gap-2">
        {CORES_PRESET.map(c => (
          <button
            key={c}
            onClick={() => setCor(c)}
            className={`w-6 h-6 rounded-full transition-all cursor-pointer ${cor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-dark-800 scale-110' : ''}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={handleCancel}
          className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs bg-neon text-dark-950 font-semibold hover:bg-neon-dim transition-colors cursor-pointer disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

function NovaTagForm({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#3b82f6');
  const [tipo, setTipo] = useState('custom');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const handleCreate = async () => {
    if (!nome.trim()) return setErro('Nome obrigatório.');
    setSaving(true);
    setErro('');
    const { error } = await supabase.from('tags').insert({ nome: nome.trim(), cor, tipo });
    setSaving(false);
    if (error) return setErro(error.message.includes('unique') ? 'Já existe uma tag com esse nome.' : error.message);
    setNome('');
    setCor('#3b82f6');
    setOpen(false);
    onCreated();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dark-700 border-dashed text-zinc-500 hover:text-neon hover:border-neon/40 transition-colors text-sm cursor-pointer w-full"
      >
        <Plus className="w-4 h-4" /> Nova tag
      </button>
    );
  }

  return (
    <div className="px-4 py-3 bg-dark-800 rounded-xl border border-neon/30 space-y-3">
      <input
        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon/50"
        value={nome}
        onChange={e => setNome(e.target.value)}
        placeholder="Nome da tag (ex: Padarias SP)"
        onKeyDown={e => e.key === 'Enter' && handleCreate()}
        autoFocus
      />
      <div className="flex items-center gap-3">
        <select
          value={tipo}
          onChange={e => setTipo(e.target.value)}
          className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neon/50 cursor-pointer"
        >
          <option value="produto">Produto</option>
          <option value="custom">Customizada</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {CORES_PRESET.map(c => (
          <button
            key={c}
            onClick={() => setCor(c)}
            className={`w-6 h-6 rounded-full transition-all cursor-pointer ${cor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-dark-800 scale-110' : ''}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      {erro && <p className="text-xs text-red-400">{erro}</p>}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => { setOpen(false); setNome(''); setErro(''); }}
          className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-neon text-dark-950 font-semibold hover:bg-neon-dim transition-colors cursor-pointer disabled:opacity-50"
        >
          <Check className="w-3 h-3" /> {saving ? 'Criando...' : 'Criar tag'}
        </button>
      </div>
    </div>
  );
}

export default function ConfigTab() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = async () => {
    setLoading(true);
    const { data } = await supabase.from('tags').select('*').order('tipo').order('nome');
    setTags(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTags(); }, []);

  const handleSave = async (id, nome, cor) => {
    await supabase.from('tags').update({ nome, cor }).eq('id', id);
    fetchTags();
  };

  const handleDelete = async (id) => {
    if (!confirm('Deletar esta tag? Os leads perderão essa tag.')) return;
    await supabase.from('tags').delete().eq('id', id);
    fetchTags();
  };

  const tagsProduto = tags.filter(t => t.tipo === 'produto');
  const tagsCustom  = tags.filter(t => t.tipo === 'custom');

  return (
    <div className="animate-fade-in-up max-w-xl space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Configurações</h2>
        <p className="text-sm text-zinc-500 mt-1">Gerencie tags de produtos e segmentações personalizadas.</p>
      </div>

      <HelpPanel tabKey="config" items={[
        { icon: '🏷️', title: 'Tags de Produto', desc: 'Tags fixas para cada produto (Revenda Profit, LogProfit, Delicite, UAIROX). Usadas para segmentar leads e campanhas.' },
        { icon: '✏️', title: 'Tags Customizadas', desc: 'Crie tags livres para segmentações específicas: região, perfil, interesse, origem especial etc.' },
        { icon: '🎨', title: 'Cores', desc: 'Cada tag tem uma cor que aparece nos cards de leads e filtros. Escolha entre as cores predefinidas ou use um código hex.' },
        { icon: '➕', title: 'Nova Tag', desc: 'Clique em "+ Nova Tag" para criar. Defina o nome e escolha a cor. Tags customizadas podem ser deletadas; tags de produto não.' },
      ]} />

      {loading ? (
        <div className="text-zinc-500 text-sm">Carregando...</div>
      ) : (
        <>
          {/* Tags de produto */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-neon" />
              <h3 className="text-sm font-semibold text-white">Tags de Produto</h3>
            </div>
            {tagsProduto.length === 0 && (
              <p className="text-xs text-zinc-600 px-1">Nenhuma tag de produto.</p>
            )}
            {tagsProduto.map(tag => (
              <TagRow key={tag.id} tag={tag} onSave={handleSave} onDelete={handleDelete} />
            ))}
          </section>

          {/* Tags customizadas */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-white">Tags Customizadas</h3>
            </div>
            {tagsCustom.length === 0 && (
              <p className="text-xs text-zinc-600 px-1">Nenhuma tag customizada ainda.</p>
            )}
            {tagsCustom.map(tag => (
              <TagRow key={tag.id} tag={tag} onSave={handleSave} onDelete={handleDelete} />
            ))}
            <NovaTagForm onCreated={fetchTags} />
          </section>
        </>
      )}
    </div>
  );
}
