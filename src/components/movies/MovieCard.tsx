import { useEffect, useMemo, useRef, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Film, Eye, EyeOff, Trash2, Loader2, Pencil, MessageSquare, MoreVertical, BookOpen, Plus } from 'lucide-react';
import clsx from 'clsx';
import { useLocation } from 'wouter';
import { generateImagePath } from '../../lib/imageUtils';
import {
  findMovieIdByTitle,
  getMovieWatchProviders,
  type TMDBWatchProvider,
} from '../../lib/tmdb';
import {
  updateOscarMovieStreaming,
  updatePersonalMovieStreaming,
} from '../../lib/appData';
import { usePersonalMovieMutations } from '../../hooks/usePersonalMovies';
import StarRatingInput from '../ui/StarRatingInput';
import ReviewModal from '../ui/ReviewModal';
import SynopsisModal from '../ui/SynopsisModal';
import type { MovieStatus, OscarMovieWithStatus, PersonalMovie } from '../../types/app';

type CardMovie = OscarMovieWithStatus | PersonalMovie;
type ReactionEmoji = string;
type ProviderItem = TMDBWatchProvider;

const REACTION_OPTIONS = [
  { value: '\u2764\uFE0F', label: 'Amei' },
  { value: '\u{1F525}', label: 'Fogo' },
  { value: '\u{1F602}', label: 'Riso' },
  { value: '\u{1F44E}', label: 'Nao curti' },
] as const;

interface MovieCardProps {
  movie: CardMovie;
  layout?: 'carousel' | 'grid';
  canEdit?: boolean;
  showPlatformSelector?: boolean;
  currentUserId?: string;
  isPending?: boolean;
  onToggleStatus?: (movie: CardMovie, nextStatus: MovieStatus) => void;
  onDelete?: (movie: PersonalMovie) => void;
  onPlatformChange?: (movie: CardMovie, platformId: string) => void;
  onRate?: (movie: PersonalMovie, stars: number, review?: string | null) => Promise<unknown> | unknown;
  onReact?: (movie: PersonalMovie, reaction: ReactionEmoji) => Promise<unknown> | unknown;
}

function isPersonalMovie(movie: CardMovie): movie is PersonalMovie {
  return 'user_id' in movie;
}

function parseProviders(streamingData: string | null | undefined): ProviderItem[] {
  if (!streamingData) return [];
  try {
    const parsed = JSON.parse(streamingData) as ProviderItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseTmdbFromSource(sourceMovieId: string | null | undefined) {
  if (!sourceMovieId) return null;
  const directNumeric = sourceMovieId.match(/^\d+$/);
  if (directNumeric) return parseInt(sourceMovieId, 10);
  const prefixed = sourceMovieId.match(/^tmdb:(\d+)/);
  if (prefixed) return parseInt(prefixed[1], 10);
  return null;
}

export default function MovieCard({
  movie,
  layout = 'carousel',
  canEdit = false,
  showPlatformSelector = true,
  currentUserId,
  isPending = false,
  onToggleStatus,
  onDelete,
  onRate,
  onReact,
}: MovieCardProps) {
  const [, setLocation] = useLocation();

  const handleCardClick = async () => {
    let id = isPersonalMovie(movie) ? parseTmdbFromSource(movie.source_movie_id) : null;
    if (!id) {
      id = await findMovieIdByTitle(
        movie.titulo,
        'ano_lancamento' in movie ? movie.ano_lancamento : movie.ano_oscar
      );
    }
    if (id) {
      setLocation(`/filme/${id}`);
    }
  };

  const imageSrc = generateImagePath(movie.titulo, movie.capa_url);
  const isWatched = movie.status === 'watched';
  const isOscarMovie = !isPersonalMovie(movie);
  const isFriendCard = isPersonalMovie(movie) && Boolean(currentUserId) && movie.user_id !== currentUserId;
  const canRate = isPersonalMovie(movie) && !isFriendCard && isWatched && Boolean(onRate);
  const suggestionBadge = useMemo(() => {
    if (!isPersonalMovie(movie)) return false;
    return (movie.source_movie_id ?? '').includes('|rec:');
  }, [movie]);

  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [showProviders, setShowProviders] = useState(false);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [reactionPending, setReactionPending] = useState<ReactionEmoji | null>(null);

  const { addMovieMutation } = usePersonalMovieMutations(currentUserId || '');
  const [addedToWatchlist, setAddedToWatchlist] = useState(false);

  const [ratingPending, setRatingPending] = useState<number | null>(null);
  const [synopsisModalOpen, setSynopsisModalOpen] = useState(false);
  const [resolvedTmdbId, setResolvedTmdbId] = useState<number | null>(null);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [localRating, setLocalRating] = useState<number>(isPersonalMovie(movie) ? (movie.rating ?? movie.avaliacao ?? 0) : 0);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [pendingRating, setPendingRating] = useState<number>(localRating);
  const showReadOnlyRating = isPersonalMovie(movie) && isWatched && (canRate || localRating > 0);
  const providersRef = useRef<HTMLDivElement | null>(null);

  const currentRatingValue = isPersonalMovie(movie) ? (movie.rating ?? movie.avaliacao ?? 0) : 0;
  useEffect(() => {
    setLocalRating(currentRatingValue);
  }, [currentRatingValue]);

  useEffect(() => {
    setProviders(parseProviders(movie.streaming_data));
  }, [movie.streaming_data]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (providersRef.current && !providersRef.current.contains(event.target as Node)) {
        setShowProviders(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleOpenSynopsis = async () => {
    let id = isPersonalMovie(movie) ? parseTmdbFromSource(movie.source_movie_id) : null;
    if (!id) {
      id = await findMovieIdByTitle(
        movie.titulo,
        'ano_lancamento' in movie ? movie.ano_lancamento : movie.ano_oscar
      );
    }
    setResolvedTmdbId(id);
    setSynopsisModalOpen(true);
  };

  const handleToggleStatus = () => {
    if (!canEdit || !onToggleStatus) return;
    onToggleStatus(movie, isWatched ? 'watchlist' : 'watched');
  };

  const handleDelete = () => {
    if (!canEdit || !isPersonalMovie(movie) || !onDelete) return;

    if (movie.source === 'oscar') {
      alert('Filmes sincronizados com o Oscar sao atualizados pela aba Oscar.');
      return;
    }

    if (confirm(`Deseja remover "${movie.titulo}" da lista?`)) {
      onDelete(movie);
    }
  };

  const handleReaction = async (reaction: ReactionEmoji) => {
    if (!isPersonalMovie(movie) || !onReact) return;
    setReactionPending(reaction);
    try {
      await onReact(movie, reaction);
    } finally {
      setReactionPending(null);
    }
  };

  const handleRate = async (stars: number, review?: string | null) => {
    if (!isPersonalMovie(movie) || !onRate) return;
    const previousRating = localRating;
    setRatingError(null);
    setLocalRating(stars);
    setRatingPending(stars);
    try {
      await onRate(movie, stars, review);
    } catch (error) {
      setLocalRating(previousRating);
      setRatingError(error instanceof Error ? error.message : 'Falha ao salvar avaliacao.');
    } finally {
      setRatingPending(null);
    }
  };

  const handleAddToWishlist = () => {
    if (!currentUserId || addedToWatchlist) return;
    addMovieMutation.mutate({
      titulo: movie.titulo,
      capa_url: isPersonalMovie(movie) ? movie.capa_url : null,
      source_movie_id: isPersonalMovie(movie) ? movie.source_movie_id : null,
      status: 'watchlist',
      plataforma_slug: isPersonalMovie(movie) ? movie.plataforma_slug : null,
      ano_lancamento: 'ano_lancamento' in movie ? movie.ano_lancamento : movie.ano_oscar,
      source: 'manual',
    });
    setAddedToWatchlist(true);
  };

  const resolveProviders = async () => {
    if (providers.length > 0 || providersLoading) return;
    setProvidersLoading(true);
    try {
      const tmdbId = isPersonalMovie(movie) ? parseTmdbFromSource(movie.source_movie_id) : null;
      const resolvedId =
        tmdbId ??
        (await findMovieIdByTitle(
          movie.titulo,
          'ano_lancamento' in movie ? movie.ano_lancamento : movie.ano_oscar,
        ));
      if (!resolvedId) {
        setProviders([]);
        return;
      }

      const nextProviders = await getMovieWatchProviders(resolvedId, 'BR');
      setProviders(nextProviders);
      const serialized = JSON.stringify(nextProviders);
      if (isPersonalMovie(movie)) {
        await updatePersonalMovieStreaming(movie.id, serialized);
      } else {
        await updateOscarMovieStreaming(movie.id, serialized);
      }
    } finally {
      setProvidersLoading(false);
    }
  };

  return (
    <div
      className={clsx(
        'flex flex-col gap-3 group/card',
        layout === 'carousel' ? 'min-w-[160px] md:min-w-[200px] snap-center' : 'w-full',
        isPending && 'opacity-90',
      )}
    >
      <div
        onClick={handleCardClick}
        className="relative aspect-[2/3] w-full rounded-md overflow-hidden bg-brand-card border border-[#222] transition-all hover:border-brand-gold-alt hover:shadow-[0_0_15px_rgba(212,175,55,0.15)] group cursor-pointer"
      >
        <img
          src={imageSrc}
          alt={movie.titulo}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(event) => {
            (event.target as HTMLImageElement).style.display = 'none';
            (event.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="hidden absolute inset-0 w-full h-full flex-col items-center justify-center p-4 text-center bg-brand-card">
          <Film size={24} className="text-[#333] mb-2" />
          <span className="text-xs text-brand-text-muted">{movie.titulo}</span>
        </div>

        <div className="absolute top-2 right-2 z-30">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="p-1.5 rounded-full bg-brand-bg/80 backdrop-blur-sm border border-[#333]/50 text-brand-text-muted hover:text-brand-text hover:bg-brand-bg hover:border-brand-gold/50 transition-all outline-none"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical size={14} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side="bottom"
                align="end"
                className="min-w-[180px] bg-[#0a0f1e]/95 backdrop-blur-md border border-[#222] rounded-xl p-1.5 shadow-xl shadow-black/50 z-50 animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
              >
                {isFriendCard && (
                  <>
                    <div className="px-2 py-1.5 text-xs text-brand-text-muted font-medium">Reagir</div>
                    <div className="flex items-center justify-around px-2 py-1 mb-1">
                      {REACTION_OPTIONS.map((reaction) => (
                        <DropdownMenu.Item
                          key={reaction.label}
                          onSelect={() => void handleReaction(reaction.value)}
                          className={clsx(
                            'w-8 h-8 rounded-full flex items-center justify-center text-sm outline-none cursor-pointer hover:bg-brand-gold/20 hover:scale-110 transition-all focus:bg-brand-gold/20 focus:scale-110',
                            reactionPending === reaction.value && 'opacity-50'
                          )}
                          title={reaction.label}
                        >
                          {reaction.value}
                        </DropdownMenu.Item>
                      ))}
                    </div>
                    <DropdownMenu.Separator className="h-[1px] bg-[#222] my-1" />
                  </>
                )}

                <DropdownMenu.Item
                  onSelect={(e) => {
                    e.preventDefault();
                    setTimeout(() => handleOpenSynopsis(), 50);
                  }}
                  className="flex items-center gap-2 px-2 py-2 text-xs text-brand-text rounded-md cursor-pointer outline-none hover:bg-brand-gold/10 hover:text-brand-gold transition-colors focus:bg-brand-gold/10 focus:text-brand-gold"
                >
                  <BookOpen size={14} />
                  Ver Sinopse
                </DropdownMenu.Item>

                {!canEdit && currentUserId && (
                  <DropdownMenu.Item
                    onSelect={(e) => {
                      e.preventDefault();
                      handleAddToWishlist();
                    }}
                    disabled={addedToWatchlist || addMovieMutation.isPending}
                    className={clsx(
                      "flex items-center gap-2 px-2 py-2 text-xs text-brand-text rounded-md outline-none transition-colors",
                      (addedToWatchlist || addMovieMutation.isPending)
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:bg-brand-gold/10 hover:text-brand-gold focus:bg-brand-gold/10 focus:text-brand-gold"
                    )}
                  >
                    <Plus size={14} />
                    {addedToWatchlist ? 'Adicionado à Wishlist' : 'Adicionar à Wishlist'}
                  </DropdownMenu.Item>
                )}

                {canEdit && (
                  <DropdownMenu.Item
                    onSelect={handleToggleStatus}
                    className="flex items-center gap-2 px-2 py-2 text-xs text-brand-text rounded-md cursor-pointer outline-none hover:bg-brand-gold/10 hover:text-brand-gold transition-colors focus:bg-brand-gold/10 focus:text-brand-gold"
                  >
                    {isWatched ? <Eye size={14} /> : <EyeOff size={14} />}
                    {isWatched ? 'Mudar para Wishlist' : 'Marcar como visto'}
                  </DropdownMenu.Item>
                )}
                
                {canEdit && isPersonalMovie(movie) && (
                  <>
                    <DropdownMenu.Separator className="h-[1px] bg-[#222] my-1" />
                    <DropdownMenu.Item
                      onSelect={handleDelete}
                      className="flex items-center gap-2 px-2 py-2 text-xs text-red-400 rounded-md cursor-pointer outline-none hover:bg-red-500/10 hover:text-red-500 transition-colors focus:bg-red-500/10 focus:text-red-500"
                    >
                      <Trash2 size={14} />
                      Remover da Lista
                    </DropdownMenu.Item>
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {isOscarMovie && movie.categoria_principal ? (
          <div className="absolute top-2 left-2 bg-brand-bg/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] uppercase text-brand-gold border border-brand-gold/30 line-clamp-1 max-w-[70%]">
            {movie.categoria_principal}
          </div>
        ) : null}

        {isPersonalMovie(movie) && movie.source === 'oscar' ? (
          <div className="absolute right-2 bottom-2 bg-brand-bg/85 border border-brand-gold/30 px-2 py-1 rounded text-[10px] uppercase tracking-[0.18em] text-brand-gold-alt">
            Via Oscar
          </div>
        ) : null}

        {suggestionBadge ? (
          <div className="absolute right-2 bottom-10 bg-brand-bg/85 border border-emerald-500/40 px-2 py-1 rounded text-[10px] uppercase tracking-[0.12em] text-emerald-300">
            Via Sugestao
          </div>
        ) : null}

        {isPending ? (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-brand-gold" />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <h3
          onClick={handleCardClick}
          className="text-sm font-medium text-brand-text line-clamp-1 hover:text-brand-gold cursor-pointer transition-colors"
          title={movie.titulo}
        >
          {movie.titulo}
        </h3>

        {showPlatformSelector ? (
          <div className="relative" ref={providersRef}>
            <button
              type="button"
              onClick={() => {
                const next = !showProviders;
                setShowProviders(next);
                if (next) void resolveProviders();
              }}
              className="text-[11px] uppercase tracking-[0.12em] text-brand-gold-alt hover:text-brand-gold"
            >
              Onde assistir?
            </button>
            {showProviders ? (
              <div className="absolute left-0 top-[110%] z-20 min-w-[180px] border border-[#222] rounded-md bg-[#0a0f1e] p-2">
                {providersLoading ? (
                  <div className="flex items-center gap-2 text-xs text-brand-text-muted">
                    <Loader2 size={12} className="animate-spin" /> Carregando...
                  </div>
                ) : providers.length > 0 ? (
                  <ul className="flex flex-col gap-1">
                    {providers.map((provider) => (
                      <li key={provider.provider_id ?? provider.provider_name} className="text-xs text-brand-text flex items-center gap-2">
                        {provider.logo_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                            alt={provider.provider_name ?? 'provider'}
                            className="w-5 h-5 rounded"
                          />
                        ) : null}
                        <span>{provider.provider_name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-[10px] text-brand-text-muted uppercase tracking-[0.12em]">
                    Sem stream BR
                  </span>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {showReadOnlyRating ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 group/stars">
              <StarRatingInput
                value={localRating}
                onChange={(stars) => {
                  if (canRate) {
                    setPendingRating(stars);
                    setIsReviewModalOpen(true);
                  }
                }}
                disabled={!canRate}
              />
              {canRate ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingRating(localRating);
                    setIsReviewModalOpen(true);
                  }}
                  className="p-1 text-brand-text-muted hover:text-brand-gold transition-colors"
                  title="Escrever Resenha"
                >
                  <Pencil size={12} className={clsx(isPersonalMovie(movie) && movie.review && "text-brand-gold-alt")} />
                </button>
              ) : (
                isPersonalMovie(movie) && movie.review && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingRating(localRating);
                      setIsReviewModalOpen(true);
                    }}
                    className="p-1 text-brand-gold-alt hover:text-brand-gold transition-colors animate-pulse"
                    title="Ver Resenha"
                  >
                    <MessageSquare size={12} />
                  </button>
                )
              )}
              {canRate && ratingPending ? <Loader2 size={12} className="animate-spin text-brand-gold ml-1" /> : null}
            </div>
            {ratingError ? <p className="text-[10px] leading-relaxed text-red-300">{ratingError}</p> : null}
          </div>
        ) : null}
      </div>

      {isReviewModalOpen && isPersonalMovie(movie) && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onOpenChange={setIsReviewModalOpen}
          title={movie.titulo}
          coverUrl={movie.capa_url}
          initialRating={pendingRating}
          initialReview={movie.review || ''}
          isReadOnly={!canRate}
          onSave={async (stars, text) => {
            await handleRate(stars, text);
          }}
          onSkip={async (stars) => {
            await handleRate(stars, movie.review);
          }}
        />
      )}

      <SynopsisModal
        isOpen={synopsisModalOpen}
        onOpenChange={setSynopsisModalOpen}
        title={movie.titulo}
        movieId={resolvedTmdbId}
      />
    </div>
  );
}
