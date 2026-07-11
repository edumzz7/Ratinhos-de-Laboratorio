import clsx from 'clsx';
import { Menu } from 'lucide-react';
import type { ReactNode } from 'react';

interface HeaderProps {
  activeTab: 'dashboard' | 'movies' | 'series' | 'oscars' | 'groups';
  onTabChange: (tab: 'dashboard' | 'movies' | 'series' | 'oscars' | 'groups') => void;
  title?: ReactNode;
  canAccessOscars: boolean;
  onToggleSidebar: () => void;
  rightSlot?: ReactNode;
  subSlot?: ReactNode;
  hideTabs?: boolean;
  onBack?: () => void;
  tabsOnly?: boolean;
}

const Header = ({
  activeTab,
  onTabChange,
  title,
  canAccessOscars,
  onToggleSidebar,
  rightSlot,
  subSlot,
  hideTabs,
  onBack,
  tabsOnly,
}: HeaderProps) => {
  const tabs = [
    { id: 'groups' as const, label: 'GRUPOS' },
    { id: 'movies' as const, label: 'FILMES' },
    { id: 'series' as const, label: 'SÉRIES' },
    ...(canAccessOscars ? [{ id: 'oscars' as const, label: 'OSCAR 2027' }] : []),
    { id: 'dashboard' as const, label: 'PAINEL PESSOAL' },
  ];

  const tabsNavigation = (
    <nav className="flex flex-wrap items-center justify-center w-full gap-x-8 gap-y-4 md:gap-x-16 text-sm md:text-base text-brand-text-muted font-light tracking-wider border-b border-[#111] pb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={clsx(
            'uppercase transition-colors pb-1',
            activeTab === tab.id
              ? 'text-brand-gold border-b-2 border-brand-gold'
              : 'hover:text-brand-text',
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );

  if (tabsOnly) {
    if (hideTabs) return null;
    return tabsNavigation;
  }

  return (
    <header className="flex flex-col gap-6">
      <div className="w-24 h-[1px] bg-brand-gold opacity-50" />

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl md:text-4xl font-light tracking-widest text-brand-text uppercase break-words flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-brand-gold shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
            )}
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {rightSlot}
            <button
              onClick={onToggleSidebar}
              className="xl:hidden inline-flex items-center shrink-0 gap-2 px-3 py-2 border border-[#222] rounded-lg text-xs uppercase tracking-[0.14em] text-brand-text-muted hover:text-brand-gold"
            >
              <Menu size={14} /> Ranking
            </button>
          </div>
        </div>
        {subSlot}
      </div>

      <div className="w-24 h-[1px] bg-brand-gold opacity-50" />

      {!hideTabs && tabsNavigation}
    </header>
  );
};

export default Header;
