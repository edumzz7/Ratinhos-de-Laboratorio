import { useEffect, useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Tv, Eye, Plus, Trash2, Edit3, Star, ArrowLeft, Play } from 'lucide-react';
import { useLocation } from 'wouter';
import { useSeries } from '../../hooks/useSeries';
import { useUsers } from '../../hooks/useUsers';
import { getTvDetailsRaw, getTvCredits, getTvWatchProviders, getTvSeasonEpisodes } from '../../lib/tmdb';
import { getSeriesCineratsStats, listSeriesEpisodeFeedback, rateSeriesEpisode, setSeriesEpisodeReaction } from '../../lib/appData';
import StarRatingInput from '../ui/StarRatingInput';
import ReviewModal from '../ui/ReviewModal';
import AvatarDisplay from '../layout/AvatarDisplay';
import { generateImagePath } from '../../lib/imageUtils';
import clsx from 'clsx';

interface SeriesDetailScreenProps {
  id: string;
  currentUserId: string;
}

export default function SeriesDetailScreen({ id, currentUserId }: SeriesDetailScreenProps) {
  const [, setLocation] = useLocation();
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [episodeFeedbackMessage, setEpisodeFeedbackMessage] = useState<string | null>(null);

  // 1. Fetch TMDB TV Details (Raw)
  const seriesQuery = useQuery({
    queryKey: ['tmdb-tv-details', id],
    queryFn: () => getTvDetailsRaw(Number(id)),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // 2. Fetch TMDB TV Credits
  const creditsQuery = useQuery({
    queryKey: ['tmdb-tv-credits', id],
    queryFn: () => getTvCredits(id),
    staleTime: 1000 * 60 * 10,
    enabled: !!seriesQuery.data,
  });

  // 3. Fetch TMDB TV Watch Providers
  const providersQuery = useQuery({
    queryKey: ['tmdb-tv-providers', id],
    queryFn: () => getTvWatchProviders(Number(id)),
    staleTime: 1000 * 60 * 10,
    enabled: !!seriesQuery.data,
  });

  // 4. Fetch CineRats Stats for this series
  const cineratsQuery = useQuery({
    queryKey: ['cinerats-series-stats', id],
    queryFn: () => getSeriesCineratsStats(seriesQuery.data?.name || ''),
    enabled: !!seriesQuery.data,
  });

  // 5. Fetch episodes of selected season
  const episodesQuery = useQuery({
    queryKey: ['tmdb-tv-episodes', id, selectedSeason],
    queryFn: () => getTvSeasonEpisodes(Number(id), selectedSeason),
    enabled: !!seriesQuery.data && selectedSeason > 0,
    staleTime: 1000 * 60 * 10,
  });

  // 6. Hook into series mutations and users
  const { seriesQuery: userSeriesQuery, addSeriesMutation, updateProgressMutation, deleteSeriesMutation, rateSeriesMutation } = useSeries(currentUserId);
  const usersQuery = useUsers();

  const series = seriesQuery.data;
  const credits = creditsQuery.data;
  const providers = providersQuery.data || [];
  const cineratsStats = cineratsQuery.data;
  const userSeriesList = userSeriesQuery.data || [];
  const users = usersQuery.data || [];

  // Match current user's local series document
  const userSeriesDoc = useMemo(() => {
    if (!series) return null;
    return userSeriesList.find(
      (s) => s.titulo.toLowerCase().trim() === series.name.toLowerCase().trim()
    );
  }, [userSeriesList, series]);
  const episodeFeedbackQuery = useQuery({ queryKey: ['series-episode-feedback', userSeriesDoc?.id], queryFn: () => listSeriesEpisodeFeedback(userSeriesDoc!.id), enabled: Boolean(userSeriesDoc?.id) });
  const episodeReactionMutation = useMutation({ mutationFn: ({ episode, reaction }: { episode: number; reaction: 'plot_twist' | 'absurd' | 'love' | 'laugh' | 'dislike' | null }) => setSeriesEpisodeReaction(currentUserId, userSeriesDoc!.id, selectedSeason, episode, reaction), onSuccess: () => { setEpisodeFeedbackMessage('Reacao salva.'); void episodeFeedbackQuery.refetch(); }, onError: (error) => setEpisodeFeedbackMessage(error instanceof Error ? error.message : 'Nao foi possivel salvar a reacao.') });
  const episodeRatingMutation = useMutation({ mutationFn: ({ episode, rating }: { episode: number; rating: number | null }) => rateSeriesEpisode(currentUserId, userSeriesDoc!.id, selectedSeason, episode, rating), onSuccess: () => { setEpisodeFeedbackMessage('Nota salva.'); void episodeFeedbackQuery.refetch(); }, onError: (error) => setEpisodeFeedbackMessage(error instanceof Error ? error.message : 'Nao foi possivel salvar a nota.') });

  // Sync selected season with user's progress
  useEffect(() => {
    if (userSeriesDoc && userSeriesDoc.temporada) {
      setSelectedSeason(userSeriesDoc.temporada);
    }
  }, [userSeriesDoc]);

  const startYear = series?.first_air_date ? series.first_air_date.split('-')[0] : null;
  const creator = series?.created_by?.map((c: any) => c.name).join(', ') || 'Não especificado';
  const cast = credits?.cast?.slice(0, 6) || [];
  const genres = series?.genres?.map((g: any) => g.name).join(', ') || '';
  const seasonsList = series?.seasons || [];

  const activeSeasonMeta = useMemo(() => {
    return seasonsList.find((s: any) => s.season_number === selectedSeason);
  }, [seasonsList, selectedSeason]);

  const isPending =
    addSeriesMutation.isPending ||
    updateProgressMutation.isPending ||
    deleteSeriesMutation.isPending ||
    rateSeriesMutation.isPending;

  const handleAddSeries = async (status: 'watchlist' | 'watching' | 'watched') => {
    if (!series) return;
    const totalEpsOfSeason = activeSeasonMeta?.episode_count || 1;
    const totalEpsOfAllSeries = series.number_of_episodes || 1;

    await addSeriesMutation.mutateAsync({
      titulo: series.name,
      capa_url: series.poster_path ? `https://image.tmdb.org/t/p/w500${series.poster_path}` : null,
      status,
      temporada: status === 'watched' ? (seasonsList[seasonsList.length - 1]?.season_number || 1) : selectedSeason,
      total_episodios: status === 'watched' ? totalEpsOfAllSeries : totalEpsOfSeason,
      episodios_vistos: status === 'watched' ? totalEpsOfAllSeries : 0,
      plataforma_slug: 'stremio',
      rating: null,
      streaming_data: JSON.stringify(providers),
    });
    cineratsQuery.refetch();
  };

  const handleUpdateEpisodeProgress = async (episodeNumber: number) => {
    if (!userSeriesDoc) return;
    const totalEpsOfSeason = activeSeasonMeta?.episode_count || 1;

    setIsUpdatingProgress(true);
    try {
      await updateProgressMutation.mutateAsync({
        id: userSeriesDoc.id,
        temporada: selectedSeason,
        total_episodios: totalEpsOfSeason,
        episodios_vistos: episodeNumber,
      });
      cineratsQuery.refetch();
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const handleToggleWatchlistOnly = async () => {
    if (!series) return;
    if (userSeriesDoc) {
      await deleteSeriesMutation.mutateAsync(userSeriesDoc.id);
      cineratsQuery.refetch();
    } else {
      await handleAddSeries('watchlist');
    }
  };

  const handleSaveRatingAndReview = async (stars: number, review: string) => {
    if (!userSeriesDoc) return;
    await rateSeriesMutation.mutateAsync({
      actorUserId: currentUserId,
      seriesId: userSeriesDoc.id,
      stars,
      review,
    });
    cineratsQuery.refetch();
  };

  if (seriesQuery.isLoading || creditsQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-brand-gold gap-4">
        <Loader2 className="animate-spin" size={32} />
        <span className="text-xs uppercase tracking-widest text-brand-text-muted">Carregando série...</span>
      </div>
    );
  }

  if (seriesQuery.isError || !series) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <span className="text-4xl">📺</span>
        <h2 className="text-lg uppercase tracking-widest text-red-400">Série não encontrada</h2>
        <button
          onClick={() => setLocation('/')}
          className="text-xs uppercase tracking-widest text-brand-gold hover:underline flex items-center gap-2 mt-2"
        >
          <ArrowLeft size={14} /> Voltar para o painel
        </button>
      </div>
    );
  }

  const imageSrc = generateImagePath(series.name, series.poster_path ? `https://image.tmdb.org/t/p/w500${series.poster_path}` : null);
  const backdropUrl = series.backdrop_path ? `https://image.tmdb.org/t/p/original${series.backdrop_path}` : '';
  const progressPercent = userSeriesDoc && userSeriesDoc.total_episodios > 0
    ? Math.min(100, Math.round((userSeriesDoc.episodios_vistos / userSeriesDoc.total_episodios) * 100))
    : 0;
  const reactionCount = episodeFeedbackQuery.data?.filter((item) => item.reaction).length || 0;
  const plotTwistBadge = reactionCount > 0 && (episodeFeedbackQuery.data?.filter((item) => item.reaction === 'plot_twist').length || 0) / reactionCount > 0.5;

  return (
    <div className="flex-1 min-w-0 animate-in fade-in duration-500">
      {/* 1. Backdrop Hero Banner */}
      <div className="relative -mx-5 sm:-mx-8 lg:-mx-10 -mt-8 h-[25vh] sm:h-[35vh] md:h-[40vh] overflow-hidden rounded-t-[32px] border-b border-[#151515]">
        {backdropUrl && (
          <>
            <img
              src={backdropUrl}
              alt={series.name}
              className="w-full h-full object-cover object-top opacity-30 blur-[2px] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </>
        )}
        <button
          onClick={() => setLocation('/')}
          className="absolute top-6 left-6 px-4 py-2 border border-white/10 rounded-xl text-xs uppercase tracking-widest bg-black/60 backdrop-blur-md text-brand-text hover:text-brand-gold hover:border-brand-gold/30 transition-all flex items-center gap-2 z-10"
        >
          <ArrowLeft size={14} /> Painel
        </button>
      </div>

      {/* 2. Main Content Grid */}
      <div className="relative z-10 px-0 sm:px-4 -mt-24 sm:-mt-32 md:-mt-40 flex flex-col md:flex-row gap-8 items-start">
        {/* Left Side: Poster */}
        <div className="w-48 sm:w-56 md:w-64 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden border border-[#222] bg-[#050811] shadow-2xl shadow-black/80 mx-auto md:mx-0">
          <img src={imageSrc} alt={series.name} className="w-full h-full object-cover" />
        </div>

        {/* Right Side: Information */}
        <div className="flex-1 min-w-0 flex flex-col gap-6 text-center md:text-left">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extralight tracking-wide text-brand-text break-words uppercase">
              {series.name} {startYear && <span className="text-brand-gold-alt font-light text-2xl">({startYear})</span>}
            </h1>
            {plotTwistBadge ? <span className="inline-flex rounded-full border border-orange-400/40 bg-orange-400/10 px-3 py-1 text-[10px] uppercase tracking-widest text-orange-300">🤯 Plot twist</span> : null}
            <p className="text-xs uppercase tracking-widest text-brand-text-muted font-light">
              {genres} {series.number_of_seasons ? `• ${series.number_of_seasons} temp.` : ''} {series.number_of_episodes ? `• ${series.number_of_episodes} eps.` : ''}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <button
              onClick={handleToggleWatchlistOnly}
              disabled={isPending}
              className={clsx(
                'flex items-center gap-2 py-3 px-6 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 border disabled:opacity-50',
                userSeriesDoc?.status === 'watchlist'
                  ? 'bg-brand-gold text-brand-bg border-brand-gold font-bold'
                  : 'bg-black/45 border-[#222] text-brand-text hover:border-brand-gold/35 hover:text-brand-gold'
              )}
            >
              {userSeriesDoc?.status === 'watchlist' ? <Trash2 size={14} /> : <Plus size={14} />}
              {userSeriesDoc?.status === 'watchlist' ? 'Na Watchlist' : 'Watchlist'}
            </button>

            {!userSeriesDoc && (
              <>
                <button
                  onClick={() => handleAddSeries('watching')}
                  disabled={isPending}
                  className="flex items-center gap-2 py-3 px-6 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 border bg-black/45 border-[#222] text-brand-text hover:border-brand-gold/35 hover:text-brand-gold disabled:opacity-50"
                >
                  <Play size={12} className="fill-brand-text text-brand-text" />
                  Acompanhar
                </button>
                <button
                  onClick={() => handleAddSeries('watched')}
                  disabled={isPending}
                  className="flex items-center gap-2 py-3 px-6 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 border bg-black/45 border-[#222] text-brand-text hover:border-brand-gold/35 hover:text-brand-gold disabled:opacity-50"
                >
                  <Eye size={14} />
                  Marcar Vista
                </button>
              </>
            )}

            {userSeriesDoc && (
              <button
                onClick={() => setIsReviewOpen(true)}
                className="flex items-center gap-2 py-3 px-6 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 border bg-black/45 border-[#222] text-brand-gold-alt hover:border-brand-gold hover:text-brand-gold"
              >
                <Edit3 size={14} />
                {userSeriesDoc.review ? 'Editar Resenha' : 'Escrever Resenha'}
              </button>
            )}
          </div>

          {/* Interactive Rating Input if watched */}
          {userSeriesDoc?.status === 'watched' && (
            <div className="flex items-center justify-center md:justify-start gap-4 p-4 rounded-2xl bg-black/20 border border-[#151515] w-fit">
              <span className="text-xs uppercase tracking-wider text-brand-text-muted font-light">Sua avaliação:</span>
              <StarRatingInput
                value={userSeriesDoc?.rating ?? userSeriesDoc?.avaliacao ?? 0}
                onChange={(val) => handleSaveRatingAndReview(val, userSeriesDoc?.review || '')}
                disabled={isPending}
              />
              <span className="text-xs font-bold text-brand-gold">
                {(userSeriesDoc?.rating || userSeriesDoc?.avaliacao) ? `${(userSeriesDoc.rating ?? userSeriesDoc.avaliacao ?? 0).toFixed(1)} / 5.0` : 'Sem nota'}
              </span>
            </div>
          )}

          {/* Progress Tracker (If watching or watched) */}
          {userSeriesDoc && userSeriesDoc.status !== 'watchlist' && (
            <div className="bg-black/20 border border-[#151515] rounded-2xl p-4 w-full sm:max-w-md space-y-2 text-left">
              <div className="flex items-center justify-between text-xs tracking-wider uppercase font-light">
                <span className="text-brand-text-muted">
                  Progresso: Temp. {userSeriesDoc.temporada || 1} • {userSeriesDoc.episodios_vistos} / {userSeriesDoc.total_episodios} eps
                </span>
                <span className="text-brand-gold font-semibold">{progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#0a0f1e] overflow-hidden rounded-full border border-[#222]">
                <div
                  className="h-full bg-gradient-to-r from-brand-gold-alt to-brand-gold rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* CineRats Stats Block */}
          {cineratsStats && (
            <div className="grid grid-cols-2 gap-4 bg-black/20 border border-[#151515] rounded-2xl p-4 w-full sm:max-w-sm mt-2">
              <div className="text-center border-r border-[#151515] pr-4">
                <span className="text-[10px] uppercase tracking-widest text-brand-text-muted block">Média CineRats</span>
                <span className="text-2xl font-bold text-brand-gold flex items-center justify-center gap-1.5 mt-1">
                  <Star size={18} className="fill-brand-gold text-brand-gold shrink-0" />
                  {cineratsStats.averageRating > 0 ? cineratsStats.averageRating.toFixed(1) : '-'}
                </span>
              </div>
              <div className="text-center pl-4 flex flex-col justify-center">
                <span className="text-[10px] uppercase tracking-widest text-brand-text-muted block">Acompanham/Viram</span>
                <span className="text-xl font-light text-brand-text mt-1">
                  {cineratsStats.watchersCount} {cineratsStats.watchersCount === 1 ? 'membro' : 'membros'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Details & Seasons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
        {/* Main Details (Sinopse, Temporadas e Episódios) */}
        <div className="lg:col-span-2 space-y-10">
          {/* Synopsis */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-[0.25em] uppercase text-brand-gold">Sinopse</h3>
            <p className="text-brand-text/90 font-light leading-relaxed text-sm">
              {series.overview || <span className="italic text-brand-text-muted">Sinopse não disponível no momento.</span>}
            </p>
          </div>

          {/* Technical Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-[0.25em] uppercase text-brand-gold">Ficha Técnica & Elenco</h3>
            <div className="bg-black/10 border border-[#151515] rounded-2xl p-5 space-y-4">
              <div className="text-sm">
                <span className="font-semibold text-brand-text-muted uppercase text-xs tracking-wider">Criador:</span>{' '}
                <span className="font-light text-brand-text">{creator}</span>
              </div>

              {cast.length > 0 && (
                <div>
                  <span className="font-semibold text-brand-text-muted uppercase text-xs tracking-wider block mb-3">Elenco principal:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {cast.map((actor: any) => (
                      <div key={actor.id} className="flex items-center gap-2 min-w-0">
                        {actor.profile_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                            alt={actor.name}
                            className="w-10 h-10 object-cover rounded-full border border-[#222] shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full border border-[#222] bg-brand-card flex items-center justify-center shrink-0">
                            <Tv size={14} className="text-[#333]" />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs truncate font-medium text-brand-text">{actor.name}</span>
                          <span className="text-[10px] text-brand-text-muted truncate font-light">{actor.character}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Seasons and Episodes Selector */}
          {seasonsList.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#151515] pb-3">
                <h3 className="text-sm font-semibold tracking-[0.25em] uppercase text-brand-gold">Episódios por Temporada</h3>

                {/* Season select */}
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  className="bg-[#0a0f1e] border border-[#222] text-xs font-semibold uppercase tracking-wider text-brand-text px-3 py-1.5 rounded-xl focus:outline-none focus:border-brand-gold cursor-pointer"
                >
                  {seasonsList
                    .filter((s: any) => s.season_number > 0)
                    .map((s: any) => (
                      <option key={s.season_number} value={s.season_number}>
                        Temporada {s.season_number} ({s.episode_count} eps)
                      </option>
                    ))}
                </select>
              </div>

              {/* Episodes List */}
              <div className="bg-black/15 border border-[#151515] rounded-2xl p-4">
                {episodesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-12 text-brand-text-muted text-xs uppercase tracking-widest gap-2">
                    <Loader2 size={16} className="animate-spin text-brand-gold" /> Carregando episódios...
                  </div>
                ) : episodesQuery.data && episodesQuery.data.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-2">
                    {episodesQuery.data.map((ep) => {
                      const isSeen = userSeriesDoc &&
                        userSeriesDoc.temporada === selectedSeason &&
                        userSeriesDoc.episodios_vistos >= ep.episode_number;


                      const feedback = episodeFeedbackQuery.data?.find((item) => item.season_number === selectedSeason && item.episode_number === ep.episode_number);
                      return (
                        <div
                          key={ep.episode_number}
                          onClick={() => {
                            if (userSeriesDoc && !isUpdatingProgress) {
                              handleUpdateEpisodeProgress(
                                isSeen ? ep.episode_number - 1 : ep.episode_number
                              );
                            }
                          }}
                          className={clsx(
                            'flex items-center justify-between p-3 rounded-xl border transition-all select-none',
                            userSeriesDoc ? 'cursor-pointer hover:border-brand-gold/30 hover:bg-black/40' : '',
                            isSeen
                              ? 'bg-brand-gold/5 border-brand-gold/20 text-brand-gold'
                              : 'bg-black/20 border-[#151515] text-brand-text-muted'
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[10px] font-semibold tracking-wider bg-black/40 px-2 py-0.5 rounded border border-[#222] shrink-0">
                              EP {ep.episode_number}
                            </span>
                            <span className="text-xs font-light truncate">{ep.name}</span>
                          </div>

                          {userSeriesDoc && (
                            <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                            <select aria-label="Nota do episodio" value={feedback?.rating ?? ''} onChange={(event) => episodeRatingMutation.mutate({ episode: ep.episode_number, rating: event.target.value ? Number(event.target.value) : null })} className="w-12 rounded border border-[#222] bg-black px-1 py-1 text-[10px] text-brand-text">
                              <option value="">-</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
                            </select>
                            <button type="button" title="Plot twist" onClick={() => episodeReactionMutation.mutate({ episode: ep.episode_number, reaction: feedback?.reaction === 'plot_twist' ? null : 'plot_twist' })} className={clsx('rounded px-1 py-1 text-xs', feedback?.reaction === 'plot_twist' ? 'bg-brand-gold/20' : 'opacity-60 hover:opacity-100')}>🤯</button>
                            <button type="button" title="Absurdo" onClick={() => episodeReactionMutation.mutate({ episode: ep.episode_number, reaction: feedback?.reaction === 'absurd' ? null : 'absurd' })} className={clsx('rounded px-1 py-1 text-xs', feedback?.reaction === 'absurd' ? 'bg-brand-gold/20' : 'opacity-60 hover:opacity-100')}>🔥</button>
                            <button
                              type="button"
                              disabled={isUpdatingProgress}
                              className={clsx(
                                'p-1 rounded-full border transition-colors shrink-0',
                                isSeen
                                  ? 'border-brand-gold bg-brand-gold/25 text-brand-gold'
                                  : 'border-[#222] text-[#333] hover:text-brand-text hover:border-brand-text'
                              )}
                            ><Eye size={12} /></button></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-brand-text-muted italic">
                    Nenhum episódio listado para esta temporada.
                  </div>
                )}
              </div>
              {episodeFeedbackMessage ? <p className="mt-2 text-xs text-brand-gold">{episodeFeedbackMessage}</p> : null}
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold tracking-[0.25em] uppercase text-brand-gold">Resenhas CineRats</h3>

          {cineratsStats?.reviews && cineratsStats.reviews.length > 0 ? (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {cineratsStats.reviews.map((rev, idx) => {
                const author = users.find((u) => u.id === rev.userId);
                if (!author) return null;
                const formattedDate = new Date(rev.createdAt).toLocaleDateString('pt-BR');

                return (
                  <div key={idx} className="bg-black/35 border border-[#151515] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <a href={`/${author.username}`} className="flex items-center gap-2 group min-w-0">
                        <AvatarDisplay avatarId={author.avatar_id} className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-[#222]" />
                        <span className="text-xs font-semibold text-brand-text group-hover:text-brand-gold transition-colors truncate">
                          {author.display_name || author.username}
                        </span>
                      </a>
                      <span className="text-[9px] text-brand-text-muted tracking-wide shrink-0">{formattedDate}</span>
                    </div>

                    {rev.rating !== null && rev.rating > 0 && (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={10}
                            className={clsx(
                              rev.rating! >= star
                                ? 'text-yellow-400 fill-yellow-400'
                                : rev.rating! >= star - 0.5
                                ? 'text-yellow-400 fill-yellow-400 overflow-hidden'
                                : 'text-[#333]'
                            )}
                          />
                        ))}
                        <span className="text-[10px] text-brand-gold ml-1 font-light">{rev.rating.toFixed(1)}</span>
                      </div>
                    )}

                    <p className="text-xs text-brand-text/90 font-light leading-relaxed whitespace-pre-wrap">
                      {rev.review}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#111] border border-[#222] rounded-2xl p-8 text-center text-brand-text-muted text-xs font-light">
              Nenhuma resenha escrita ainda.
            </div>
          )}
        </div>
      </div>

      {/* Review Modal for editing review */}
      {userSeriesDoc && (
        <ReviewModal
          isOpen={isReviewOpen}
          onOpenChange={setIsReviewOpen}
          title={series.name}
          coverUrl={series.poster_path ? `https://image.tmdb.org/t/p/w500${series.poster_path}` : null}
          initialRating={userSeriesDoc.rating ?? userSeriesDoc.avaliacao ?? 0}
          initialReview={userSeriesDoc.review || ''}
          isReadOnly={false}
          onSave={async (stars, text) => {
            await handleSaveRatingAndReview(stars, text);
          }}
          onSkip={async (stars) => {
            await handleSaveRatingAndReview(stars, userSeriesDoc.review || '');
          }}
        />
      )}
    </div>
  );
}
