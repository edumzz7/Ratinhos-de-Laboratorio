import { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { getUnlockedAchievements, type Achievement } from '../../lib/achievements';
import type { PersonalMovie, SeriesEntry, RankedUser } from '../../types/app';
import { useOscarPredictions } from '../../hooks/useOscarPredictions';
import { listFavorites, countFavoritedBy, listUserActivity } from '../../lib/appData';

interface AchievementBadgeProps {
  achievement: Achievement;
}

export function AchievementBadge({ achievement }: AchievementBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const IconComponent = typeof achievement.icon === 'string' 
    ? (Icons as any)[achievement.icon] || Icons.Award
    : achievement.icon || Icons.Award;
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (badgeRef.current && !badgeRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Determine styles and labels based on level/secrecy
  let badgeClasses = "bg-brand-gold/10 border-brand-gold/30 text-brand-gold hover:border-brand-gold hover:shadow-[0_0_12px_rgba(212,175,55,0.25)]";
  let tooltipHeaderClass = "text-brand-gold";
  let levelLabel = "Épica";

  if (achievement.secret) {
    badgeClasses = "bg-purple-950/20 border-purple-500/30 text-purple-400 hover:border-purple-400 hover:shadow-[0_0_12px_rgba(168,85,247,0.25)]";
    tooltipHeaderClass = "text-purple-400";
    levelLabel = "Secreta";
  } else if (achievement.level === 1) {
    badgeClasses = "bg-slate-800/20 border-slate-500/30 text-slate-100 hover:border-slate-300 hover:shadow-[0_0_12px_rgba(255,255,255,0.15)]";
    tooltipHeaderClass = "text-slate-100";
    levelLabel = "Simples";
  } else if (achievement.level === 2) {
    badgeClasses = "bg-sky-950/20 border-sky-500/30 text-sky-400 hover:border-sky-400 hover:shadow-[0_0_12px_rgba(56,189,248,0.25)]";
    tooltipHeaderClass = "text-sky-300";
    levelLabel = "Rara";
  }

  const handleMouseEnter = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      setShowTooltip(false);
    }
  };

  return (
    <div
      ref={badgeRef}
      className="relative flex items-center justify-center cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        setShowTooltip((prev) => !prev);
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={clsx(
          "w-8 h-8 rounded-full flex items-center justify-center transition-all border",
          badgeClasses
        )}
        title={achievement.name}
      >
        <IconComponent size={14} />
      </div>

      {/* Glassmorphic Tooltip */}
      {showTooltip && (
        <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 z-50 w-44 p-2.5 rounded-xl border border-brand-gold/10 bg-black/95 backdrop-blur-md text-center shadow-2xl animate-in fade-in zoom-in-95 duration-100 pointer-events-none">
          <p className={clsx("text-[11px] font-semibold uppercase tracking-wider", tooltipHeaderClass)}>{achievement.name}</p>
          <p className="text-[9px] text-brand-text mt-1 leading-normal font-light">{achievement.description}</p>
          <span className={clsx(
            "inline-block mt-1.5 text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded border",
            achievement.secret 
              ? "bg-purple-950/40 border-purple-500/25 text-purple-300"
              : achievement.level === 1
                ? "bg-slate-800/40 border-slate-500/25 text-slate-300"
                : achievement.level === 2
                  ? "bg-sky-950/40 border-sky-500/25 text-sky-300"
                  : "bg-brand-gold/20 border-brand-gold/25 text-brand-gold"
          )}>
            {levelLabel}
          </span>
          {/* Arrow */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-[1px] border-[5px] border-transparent border-b-black/95" />
        </div>
      )}
    </div>
  );
}

interface UserAchievementsProps {
  movies: PersonalMovie[];
  series: SeriesEntry[];
  users: RankedUser[];
  userId: string;
  isLoading?: boolean;
  previewCount?: number;
}

export default function UserAchievements({
  movies,
  series,
  users,
  userId,
  isLoading = false,
  previewCount,
}: UserAchievementsProps) {
  const [showAll, setShowAll] = useState(false);
  const { predictionsQuery } = useOscarPredictions(userId);
  const isPredictionsLoading = predictionsQuery.isLoading;
  const predictions = predictionsQuery.data || [];

  const { data: userFavorites = [], isLoading: favsLoading } = useQuery({
    queryKey: ['user_favorites_list', userId],
    queryFn: () => listFavorites(userId),
    enabled: !!userId,
  });

  const { data: favoritedByCount = 0, isLoading: favoritedByLoading } = useQuery({
    queryKey: ['favorited_by_count', userId],
    queryFn: () => countFavoritedBy(userId),
    enabled: !!userId,
  });

  const { data: userActivities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['user_activities_list', userId],
    queryFn: () => listUserActivity([userId], 100),
    enabled: !!userId,
  });

  if (isLoading || isPredictionsLoading || favsLoading || favoritedByLoading || activitiesLoading) {
    return (
      <div className="flex items-center gap-1.5 opacity-50 py-1">
        <Icons.Loader2 size={12} className="animate-spin text-brand-gold" />
        <span className="text-[9px] uppercase tracking-wider text-brand-text-muted">Calculando conquistas...</span>
      </div>
    );
  }

  const unlocked = getUnlockedAchievements(
    movies,
    series,
    users,
    userId,
    predictions,
    userFavorites.length,
    favoritedByCount,
    userActivities
  );

  if (unlocked.length === 0) return null;

  // Sort by rarity: level 3 (Épica/Secreta) first, then level 2 (Rara), then level 1 (Simples)
  const sorted = [...unlocked].sort((a, b) => b.level - a.level);
  const shouldLimit = typeof previewCount === 'number' && sorted.length > previewCount;
  const visibleAchievements = shouldLimit && !showAll ? sorted.slice(0, previewCount) : sorted;

  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      {visibleAchievements.map((ach) => (
        <AchievementBadge key={ach.id} achievement={ach} />
      ))}
      {shouldLimit ? (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="h-8 px-3 rounded-full border border-brand-gold/30 bg-brand-gold/10 text-[9px] uppercase tracking-[0.14em] text-brand-gold hover:border-brand-gold hover:bg-brand-gold/15 transition"
        >
          {showAll ? 'Ocultar' : `Mostrar todas +${sorted.length - previewCount}`}
        </button>
      ) : null}
    </div>
  );
}
