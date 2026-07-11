import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { ACHIEVEMENTS } from '../../lib/achievements';
import { AchievementBadge } from './UserAchievements';

const LEVEL_ORDER: Record<number, number> = { 3: 0, 2: 1, 1: 2 };

export default function AllAchievements() {
  const publicAchievements = ACHIEVEMENTS.filter((ach) => !ach.secret);
  const [showSecretTooltip, setShowSecretTooltip] = useState(false);
  const secretBadgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (secretBadgeRef.current && !secretBadgeRef.current.contains(event.target as Node)) {
        setShowSecretTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Sort by difficulty: level 3 (Épica) → 2 (Rara) → 1 (Simples)
  const sorted = [...publicAchievements].sort(
    (a, b) => (LEVEL_ORDER[a.level] ?? 99) - (LEVEL_ORDER[b.level] ?? 99)
  );

  const handleMouseEnter = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      setShowSecretTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      setShowSecretTooltip(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      {sorted.map((ach) => (
        <AchievementBadge key={ach.id} achievement={ach} />
      ))}

      {/* Secret achievement indicator */}
      <div
        ref={secretBadgeRef}
        className="relative flex items-center justify-center cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setShowSecretTooltip((prev) => !prev);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all border bg-purple-950/20 border-purple-500/30 text-purple-400 hover:border-purple-400 hover:shadow-[0_0_12px_rgba(168,85,247,0.25)]"
          title="Conquistas Secretas"
        >
          <HelpCircle size={14} />
        </div>

        {showSecretTooltip && (
          <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 z-50 w-44 p-2.5 rounded-xl border border-purple-500/20 bg-black/95 backdrop-blur-md text-center shadow-2xl animate-in fade-in zoom-in-95 duration-100 pointer-events-none">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">???</p>
            <p className="text-[9px] text-brand-text mt-1 leading-normal font-light">Existem conquistas secretas</p>
            <span className="inline-block mt-1.5 text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded border bg-purple-950/40 border-purple-500/25 text-purple-300">
              Secreta
            </span>
            {/* Arrow */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-[1px] border-[5px] border-transparent border-b-black/95" />
          </div>
        )}
      </div>
    </div>
  );
}
