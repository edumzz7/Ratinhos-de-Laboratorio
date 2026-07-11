import { useState } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import { useSeries } from '../../hooks/useSeries';
import type { SeriesStatus } from '../../types/app';
import AddSeriesDialog from './AddSeriesDialog';
import SeriesCard from './SeriesCard';

interface SeriesSectionProps {
  userId: string;
  canEdit: boolean;
  currentUserId: string;
}

export default function SeriesSection({ userId, canEdit, currentUserId }: SeriesSectionProps) {
  const { seriesQuery, updateProgressMutation, addSeriesMutation, deleteSeriesMutation, rateSeriesMutation } =
    useSeries(userId);
  const [filter, setFilter] = useState<SeriesStatus>('watched');
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredSeries = (seriesQuery.data || []).filter((series) => series.status === filter);

  const maxInitialItems = canEdit ? 11 : 12;
  const hasMore = filteredSeries.length > maxInitialItems;
  const displayedSeries = isExpanded ? filteredSeries : filteredSeries.slice(0, maxInitialItems);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 border-b border-[#111] pb-4">
        <h2 className="text-xl md:text-2xl font-light tracking-widest text-brand-gold">SERIES</h2>

        <div className="flex items-center gap-4 text-xs md:text-sm tracking-widest font-light uppercase mt-1 md:mt-0">
          <button
            onClick={() => setFilter('watched')}
            className={clsx(
              'transition-colors pb-1',
              filter === 'watched'
                ? 'text-brand-gold border-b border-brand-gold'
                : 'text-brand-text-muted hover:text-brand-text',
            )}
          >
            Vistas
          </button>
          <span className="text-[#333]">|</span>
          <button
            onClick={() => setFilter('watching')}
            className={clsx(
              'transition-colors pb-1',
              filter === 'watching'
                ? 'text-brand-gold border-b border-brand-gold'
                : 'text-brand-text-muted hover:text-brand-text',
            )}
          >
            Em andamento
          </button>
          <span className="text-[#333]">|</span>
          <button
            onClick={() => setFilter('watchlist')}
            className={clsx(
              'transition-colors pb-1',
              filter === 'watchlist'
                ? 'text-brand-gold border-b border-brand-gold'
                : 'text-brand-text-muted hover:text-brand-text',
            )}
          >
            Watchlist
          </button>
          <span className="text-[#333]">|</span>
          <button onClick={() => setFilter('paused')} className={clsx('transition-colors pb-1', filter === 'paused' ? 'text-brand-gold border-b border-brand-gold' : 'text-brand-text-muted hover:text-brand-text')}>Pausadas</button>
          <span className="text-[#333]">|</span>
          <button onClick={() => setFilter('dropped')} className={clsx('transition-colors pb-1', filter === 'dropped' ? 'text-brand-gold border-b border-brand-gold' : 'text-brand-text-muted hover:text-brand-text')}>Desistencias</button>
        </div>

        <p className="md:ml-auto text-xs uppercase tracking-[0.18em] text-brand-text-muted">
          {filteredSeries.length} {filteredSeries.length === 1 ? 'série' : 'séries'}
        </p>
      </div>

      {seriesQuery.isLoading ? (
        <div className="flex justify-center items-center py-20 text-brand-gold-alt opacity-50">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-y-8 md:gap-x-6">
            {canEdit ? (
              <div className="flex">
                <AddSeriesDialog
                  defaultStatus={filter}
                  onSubmit={(series) => addSeriesMutation.mutateAsync(series)}
                  isPending={addSeriesMutation.isPending}
                />
              </div>
            ) : null}

            {displayedSeries.map((series) => (
              <SeriesCard
                key={series.id}
                series={series}
                canEdit={canEdit}
                currentUserId={currentUserId}
                onSaveProgress={(payload) => updateProgressMutation.mutateAsync(payload)}
                onDelete={(seriesId) => deleteSeriesMutation.mutate(seriesId)}
                onRate={(seriesId, stars, review) =>
                  rateSeriesMutation.mutateAsync({
                    actorUserId: currentUserId,
                    seriesId,
                    stars,
                    review,
                  })
                }
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs uppercase tracking-widest text-brand-text-muted hover:text-brand-gold transition-colors py-2 px-4 bg-transparent border-none cursor-pointer focus:outline-none"
              >
                {isExpanded ? 'recolher' : 'mostrar todos'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
