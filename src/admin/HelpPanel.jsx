import { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function HelpPanel({ tabKey, items }) {
  const key = `help_open_${tabKey}`;
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(key) === 'true'; } catch { return false; }
  });

  function toggle() {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(key, String(next)); } catch {}
  }

  return (
    <div className="border border-blue-500/20 rounded-2xl mb-6 overflow-hidden bg-blue-500/5">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-blue-500/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <HelpCircle size={14} className="text-blue-400 shrink-0" />
          <span className="text-sm font-medium text-blue-300">Como usar esta seção?</span>
        </div>
        {open
          ? <ChevronUp size={14} className="text-blue-400" />
          : <ChevronDown size={14} className="text-blue-400" />
        }
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-blue-500/15">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-dark-950/60 border border-dark-700/50 rounded-xl px-3 py-2.5">
                <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white leading-tight">{item.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
