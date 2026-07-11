import { useMemo } from 'react';
import { Star, Tv, Clapperboard, Heart, Film } from 'lucide-react';
import { usePersonalMoviesQuery } from '../../hooks/usePersonalMovies';
import { useSeriesQuery } from '../../hooks/useSeries';
import type { RankedUser } from '../../types/app';

interface DashboardTabProps {
  user: RankedUser;
  isOwnDashboard?: boolean;
}

function getEmojiForRating(rating: number) {
  const rounded = Math.round(rating);
  if (rounded <= 1) return '😡';
  if (rounded === 2) return '😢';
  if (rounded === 3) return '😐';
  if (rounded === 4) return '😊';
  return '🥳';
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
}

export default function DashboardTab({ user, isOwnDashboard }: DashboardTabProps) {
  const moviesQuery = usePersonalMoviesQuery(user.id);
  const seriesQuery = useSeriesQuery(user.id);

  const averageRating = useMemo(() => {
    const movies = moviesQuery.data || [];
    const series = seriesQuery.data || [];

    let totalScore = 0;
    let count = 0;

    for (const m of movies) {
      if (typeof m.avaliacao === 'number' && m.avaliacao > 0) {
        totalScore += m.avaliacao;
        count++;
      }
    }

    for (const s of series) {
      if (typeof s.avaliacao === 'number' && s.avaliacao > 0) {
        totalScore += s.avaliacao;
        count++;
      }
    }

    if (count === 0) return null;
    return (totalScore / count).toFixed(1);
  }, [moviesQuery.data, seriesQuery.data]);

  const latestReviews = useMemo(() => {
    const movies = moviesQuery.data || [];
    const series = seriesQuery.data || [];

    const movieReviews = movies
      .filter((m) => m.review && m.review.trim().length > 0)
      .map((m) => ({
        id: m.id,
        title: m.titulo,
        type: 'movie' as const,
        rating: m.rating ?? m.avaliacao ?? 0,
        review: m.review!,
        date: m.created_at,
      }));

    const seriesReviews = series
      .filter((s) => s.review && s.review.trim().length > 0)
      .map((s) => ({
        id: s.id,
        title: s.titulo,
        type: 'series' as const,
        rating: s.rating ?? s.avaliacao ?? 0,
        review: s.review!,
        date: s.created_at,
      }));

    return [...movieReviews, ...seriesReviews]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [moviesQuery.data, seriesQuery.data]);

  const EmptyStateShortcut = () => (
    isOwnDashboard ? (
      <button
        onClick={() => window.dispatchEvent(new Event('open-edit-profile'))}
        className="text-brand-gold hover:underline text-sm font-medium mt-1 text-left w-fit"
      >
        + Adicionar
      </button>
    ) : (
      <span className="text-brand-text-muted text-sm mt-1">Não definido</span>
    )
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-brand-gold-alt mb-2">
          <Heart size={18} />
          <h3 className="text-xs tracking-widest uppercase">Filme Favorito</h3>
        </div>
        {user.favorite_movie ? (
          <p className="text-lg font-light text-brand-text">{user.favorite_movie}</p>
        ) : <EmptyStateShortcut />}
      </div>

      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-brand-gold-alt mb-2">
          <Heart size={18} />
          <h3 className="text-xs tracking-widest uppercase">Melhor Filme Que Viu</h3>
        </div>
        {user.favorite_movie_2 ? (
          <p className="text-lg font-light text-brand-text">{user.favorite_movie_2}</p>
        ) : <EmptyStateShortcut />}
      </div>

      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-brand-gold-alt mb-2">
          <Film size={18} />
          <h3 className="text-xs tracking-widest uppercase">Série Favorita</h3>
        </div>
        {user.favorite_series ? (
          <p className="text-lg font-light text-brand-text">{user.favorite_series}</p>
        ) : <EmptyStateShortcut />}
      </div>

      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-brand-gold-alt mb-2">
          <Clapperboard size={18} />
          <h3 className="text-xs tracking-widest uppercase">Gênero Favorito</h3>
        </div>
        {user.favorite_genre ? (
          <p className="text-lg font-light text-brand-text">{user.favorite_genre}</p>
        ) : <EmptyStateShortcut />}
      </div>

      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-brand-gold-alt mb-2">
          <Tv size={18} />
          <h3 className="text-xs tracking-widest uppercase">Onde prefere Assistir</h3>
        </div>
        {user.watch_preference ? (
          <p className="text-lg font-light text-brand-text capitalize">
            {user.watch_preference === 'cinema' ? 'No Cinema' : 'Em Casa'}
          </p>
        ) : <EmptyStateShortcut />}
      </div>

      <div className="bg-[#111] border border-[#222] rounded-2xl p-6 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-brand-gold-alt mb-2">
          <Star size={18} />
          <h3 className="text-xs tracking-widest uppercase">Média de Avaliação</h3>
        </div>
        <p className="text-lg font-light text-brand-text">
          {averageRating ? `${averageRating} / 5.0` : <span className="text-brand-text-muted text-sm mt-1">Sem avaliações</span>}
        </p>
      </div>

      {/* Seção de Resenhas */}
      <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-6 flex flex-col gap-6">
        <h2 className="text-sm font-semibold tracking-[0.25em] uppercase text-brand-gold">
          Últimas Resenhas
        </h2>

        {latestReviews.length === 0 ? (
          <div className="bg-[#111] border border-[#222] rounded-2xl p-8 text-center text-brand-text-muted text-sm font-light">
            Nenhuma resenha escrita ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {latestReviews.map((item) => {
              const emoji = getEmojiForRating(item.rating);
              return (
                <div key={item.id} className="flex items-start gap-4">
                  {/* Emoji expressivo baseado na nota */}
                  <span className="text-4xl sm:text-5xl select-none leading-none pt-2 shrink-0 hover:scale-110 transition-transform duration-200">
                    {emoji}
                  </span>

                  {/* Balão de fala */}
                  <div className="flex-1 bg-[#111] border border-[#222] rounded-2xl p-5 relative min-w-0 before:content-[''] before:absolute before:top-6 before:-left-[9px] before:w-4 before:h-4 before:rotate-45 before:bg-[#111] before:border-l before:border-b before:border-[#222] transition-colors hover:border-brand-gold/20 duration-300">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h4 className="font-semibold text-brand-text truncate pr-2 text-sm sm:text-base" title={item.title}>
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-brand-text-muted tracking-wide shrink-0">
                        {formatDate(item.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-brand-gold-alt mb-3">
                      <Star size={10} className="fill-brand-gold-alt text-brand-gold-alt" />
                      <span>{item.rating.toFixed(1)} / 5.0</span>
                      <span className="text-brand-text-muted/40 mx-1">•</span>
                      <span className="text-brand-text-muted uppercase text-[9px] tracking-wider font-semibold">
                        {item.type === 'movie' ? 'Filme' : 'Série'}
                      </span>
                    </div>

                    {/* Texto da resenha */}
                    <p className="text-sm font-light text-brand-text/90 italic leading-relaxed pl-3 border-l-2 border-brand-gold/30 break-words">
                      "{item.review}"
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
