import { useState } from 'react';
import {
  BarChart3, Users, Megaphone, Zap, Settings, Menu, X, Link2
} from 'lucide-react';
import DashboardTab from '../admin/DashboardTab.jsx';
import LeadsTab from '../admin/LeadsTab.jsx';
import CampanhasTab from '../admin/CampanhasTab.jsx';
import DisparoTab from '../admin/DisparoTab.jsx';
import ConfigTab from '../admin/ConfigTab.jsx';

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',  icon: BarChart3 },
  { id: 'leads',      label: 'Leads',       icon: Users },
  { id: 'campanhas',  label: 'Campanhas',   icon: Megaphone },
  { id: 'disparo',    label: 'Disparo',     icon: Zap },
  { id: 'config',     label: 'Config',      icon: Settings },
];

export default function AdminPage() {
  const [tab, setTab] = useState('leads');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentTab = TABS.find(t => t.id === tab);

  const handleTabChange = (id) => {
    setTab(id);
    setDrawerOpen(false);
  };

  const renderTab = () => {
    switch (tab) {
      case 'dashboard': return <DashboardTab />;
      case 'leads':     return <LeadsTab />;
      case 'campanhas': return <CampanhasTab />;
      case 'disparo':   return <DisparoTab />;
      case 'config':    return <ConfigTab />;
      default:          return null;
    }
  };

  const SidebarContent = () => (
    <>
      <div className="px-5 py-5 border-b border-dark-700/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-neon/10 border border-neon/30 flex items-center justify-center">
            <Link2 className="w-4 h-4 text-neon" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">LinkRun</div>
            <div className="text-[10px] text-neon font-semibold tracking-widest uppercase">HUB</div>
          </div>
        </div>
        <button
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-dark-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer
              ${tab === t.id
                ? 'bg-neon/10 text-neon'
                : 'text-zinc-400 hover:text-white hover:bg-dark-800'
              }`}
          >
            <t.icon className="w-4 h-4 shrink-0" />
            {t.label}
          </button>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-dark-700/40">
        <p className="text-[11px] text-dark-500">Nutrição de Leads</p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-dark-950 flex">

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-56 shrink-0 bg-dark-900/80 border-r border-dark-700/50 flex-col">
        <SidebarContent />
      </aside>

      {/* Drawer mobile */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-dark-900 border-r border-dark-700/50 flex flex-col h-full shadow-2xl animate-slide-in-right">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-dark-900/80 border-b border-dark-700/50 sticky top-0 z-30">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-xl bg-dark-800 border border-dark-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Link2 className="w-5 h-5 text-neon shrink-0" />
            <span className="text-sm font-bold text-white">LinkRun HUB</span>
            {currentTab && (
              <>
                <span className="text-dark-600 text-xs shrink-0">·</span>
                <span className="text-sm font-semibold text-white truncate">{currentTab.label}</span>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {renderTab()}
        </main>
      </div>
    </div>
  );
}
