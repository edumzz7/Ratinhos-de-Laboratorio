import { useState } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import { usePersonalMovies } from '../../hooks/usePersonalMovies';
import { useSocialActions } from '../../hooks/useSocialActions';
import type { PersonalMovie } from '../../types/app';
import ImportTvTimeDialog from '../library/ImportTvTimeDialog';
import AddMovieDialog from './AddMovieDialog';
import MovieCard from './MovieCard';

interface PersonalMoviesSectionProps {
  userId: string;
  canEdit: boolean;
  currentUserId: string;
}

export default function PersonalMoviesSection({
  userId,
  canEdit,
  currentUserId,
}: PersonalMoviesSectionProps) {
  const { moviesQuery, addMovieMutation, updatePlatformMutation, updateStatusMutation, deleteMovieMutation } =
    usePersonalMovies(userId);
  const { rateMutation, reactMutation } = useSocialActions();
  const [filter, setFilter] = useState<'watchlist' | 'watched'>('watchlist');
  const [optimisticMovies, setOptimisticMovies] = useState<PersonalMovie[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const mergedMovies = [...optimisticMovies, ...(moviesQuery.data || [])];
  const filteredMovies = mergedMovies.filter((movie) => movie.status === filter);

  const maxInitialItems = canEdit ? 11 : 12;
  const hasMore = filteredMovies.length > maxInitialItems;
  const displayedMovies = isExpanded ? filteredMovies : filteredMovies.slice(0, maxInitialItems);

  const handleToggleStatus = (movie: PersonalMovie, nextStatus: 'watchlist' | 'watched') => {
    updateStatusMutation.mutate({ id: movie.id, status: nextStatus });
  };

  const handleAddMovie = async (movie: Omit<PersonalMovie, 'id' | 'user_id' | 'created_at'>) => {
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMovie: PersonalMovie = {
      id: optimisticId,
      user_id: userId,
      created_at: new Date().toISOString(),
      ...movie,
    };

    setOptimisticMovies((prev) => [optimisticMovie, ...prev]);
    try {
      await addMovieMutation.mutateAsync(movie);
    } finally {
      setOptimisticMovies((prev) => prev.filter((item) => item.id !== optimisticId));
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 border-b border-[#111] pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-light tracking-widest text-brand-gold">FILMES</h2>
          {canEdit ? <ImportTvTimeDialog userId={userId} /> : null}
        </div>

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
            Vistos
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
        </div>

        <p className="md:ml-auto text-xs uppercase tracking-[0.18em] text-brand-text-muted">
          {filteredMovies.length} {filteredMovies.length === 1 ? 'filme' : 'filmes'}
        </p>
      </div>

      {moviesQuery.isLoading ? (
        <div className="flex justify-center items-center py-20 text-brand-gold-alt opacity-50">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-x-6 md:gap-y-8">
            {canEdit ? (
              <div className="flex">
                <AddMovieDialog
                  mode="personal"
                  layout="grid"
                  isPending={addMovieMutation.isPending}
                  defaultStatus={filter}
                  onSubmit={handleAddMovie}
                />
              </div>
            ) : null}

            {displayedMovies.map((movie) => (
              <div key={movie.id} className="min-w-0 w-full">
                <MovieCard
                  movie={movie}
                  layout="grid"
                  canEdit={canEdit}
                  showPlatformSelector
                  currentUserId={currentUserId}
                  onToggleStatus={(selectedMovie, nextStatus) => {
                    if ('user_id' in selectedMovie) {
                      handleToggleStatus(selectedMovie, nextStatus);
                    }
                  }}
                  onDelete={(selectedMovie) => deleteMovieMutation.mutate(selectedMovie.id)}
                  onPlatformChange={(selectedMovie, platformId) =>
                    updatePlatformMutation.mutate({ id: selectedMovie.id, platform: platformId })
                  }
                  onRate={async (selectedMovie, stars, review) => {
                    await rateMutation.mutateAsync({
                      actorUserId: currentUserId,
                      movieId: selectedMovie.id,
                      movieTitle: selectedMovie.titulo,
                      stars,
                      review,
                    });
                  }}
                  onReact={async (selectedMovie, reaction) => {
                    await reactMutation.mutateAsync({
                      actorUserId: currentUserId,
                      targetUserId: selectedMovie.user_id,
                      movieTitle: selectedMovie.titulo,
                      reaction,
                    });
                  }}
                  isPending={movie.id.startsWith('optimistic-')}
                />
              </div>
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
