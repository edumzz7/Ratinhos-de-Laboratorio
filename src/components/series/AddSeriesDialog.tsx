import React, { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, Plus, X } from 'lucide-react';
import clsx from 'clsx';
import { getTvDetails, getTvWatchProviders, searchSeries, type TMDBSeries, type TMDBTvSeasonMeta } from '../../lib/tmdb';
import type { SeriesEntry, SeriesStatus } from '../../types/app';

interface AddSeriesDialogProps {
  onSubmit: (series: Omit<SeriesEntry, 'id' | 'user_id' | 'created_at'>) => Promise<unknown>;
  isPending: boolean;
  defaultStatus?: SeriesStatus;
}

export default function AddSeriesDialog({
  onSubmit,
  isPending,
  defaultStatus = 'watching',
}: AddSeriesDialogProps) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [sourceSeriesId, setSourceSeriesId] = useState<string | null>(null);
  const [capaUrl, setCapaUrl] = useState('');
  const [temporada, setTemporada] = useState('1');
  const [totalEps, setTotalEps] = useState('10');
  const [searchResults, setSearchResults] = useState<TMDBSeries[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [seasonMeta, setSeasonMeta] = useState<TMDBTvSeasonMeta[]>([]);
  const [totalSeasons, setTotalSeasons] = useState(0);
  const [streamingData, setStreamingData] = useState<string | null>(null);
  const [isRetroactive, setIsRetroactive] = useState(false);
  const searchTimeout = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetForm = () => {
    setOpen(false);
    setTitulo('');
    setSourceSeriesId(null);
    setCapaUrl('');
    setTemporada('1');
    setTotalEps('10');
    setSearchResults([]);
    setShowDropdown(false);
    setSubmitError(null);
    setSeasonMeta([]);
    setTotalSeasons(0);
    setStreamingData(null);
    setIsRetroactive(false);
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTitulo(value);
    setSourceSeriesId(null);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!value.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    searchTimeout.current = window.setTimeout(async () => {
      const results = await searchSeries(value);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
  };

  const handleSelectSeries = (series: TMDBSeries) => {
    setTitulo(series.name);
    setSourceSeriesId(String(series.id));
    if (series.poster_path) {
      setCapaUrl(`https://image.tmdb.org/t/p/w500${series.poster_path}`);
    }
    setShowDropdown(false);
    void (async () => {
      const [providers, details] = await Promise.all([
        getTvWatchProviders(series.id, 'BR'),
        getTvDetails(series.id),
      ]);
      setStreamingData(JSON.stringify(providers));
      if (details) {
        setSeasonMeta(details.seasons);
        setTotalSeasons(details.number_of_seasons || details.seasons.length);
        setTemporada('1');
        const seasonOneCount = details.seasons.find((item) => item.season_number === 1)?.episode_count;
        if (seasonOneCount && seasonOneCount > 0) {
          setTotalEps(String(seasonOneCount));
        } else if (details.number_of_episodes > 0) {
          setTotalEps(String(details.number_of_episodes));
        }
      }
    })();
  };

  const handleSeasonChange = (value: string) => {
    setTemporada(value);
    const seasonNumber = parseInt(value, 10);
    if (Number.isNaN(seasonNumber)) return;
    const currentSeason = seasonMeta.find((item) => item.season_number === seasonNumber);
    if (currentSeason?.episode_count && currentSeason.episode_count > 0) {
      setTotalEps(String(currentSeason.episode_count));
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!titulo.trim()) return;

    const total = parseInt(totalEps, 10) || 0;
    const episodiosVistos =
      defaultStatus === 'watched' ? total : defaultStatus === 'watching' ? Math.min(1, total) : 0;
    setSubmitError(null);

    try {
        await onSubmit({
          titulo,
          source_series_id: sourceSeriesId,
          capa_url: capaUrl.trim() || null,
        temporada: parseInt(temporada, 10) || 1,
        total_episodios: total,
        episodios_vistos: episodiosVistos,
        status: defaultStatus,
        plataforma_slug: 'stremio',
        rating: null,
        streaming_data: streamingData,
        is_retroactive: isRetroactive,
      });

      resetForm();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Falha ao adicionar serie.');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex min-w-0 w-full flex-col items-center justify-center gap-2 border border-[#222] text-brand-gold-alt text-xs tracking-widest uppercase rounded-md hover:border-brand-gold hover:text-brand-gold transition-all bg-brand-bg group min-h-[140px] snap-center border-dashed aspect-[2/3]">
          <Plus size={24} className="group-hover:scale-110 transition-transform" />
          <span>Add Serie</span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-[92vw] max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-[#222] bg-brand-bg p-6 shadow-lg rounded-xl">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <Dialog.Title className="text-lg font-light text-brand-gold tracking-wider">
              NOVA SERIE
            </Dialog.Title>
            <Dialog.Description className="text-sm text-brand-text-muted font-light">
              Adicione uma serie para comecar a rastrear seu progresso.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
              <label htmlFor="titulo" className="text-xs text-brand-text uppercase tracking-widest">
                Titulo da Serie *
              </label>
              <div className="relative">
                <input
                  id="titulo"
                  required
                  value={titulo}
                  onChange={handleTitleChange}
                  onFocus={() => {
                    if (titulo.trim() && searchResults.length > 0) setShowDropdown(true);
                  }}
                  className="w-full bg-[#0a0f1e] border border-[#222] text-brand-text p-2.5 rounded focus:outline-none focus:border-brand-gold font-light pr-10"
                  placeholder="Ex: Succession"
                />
                {isSearching ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gold">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                ) : null}
              </div>

              {showDropdown ? (
                <div className="absolute top-[100%] left-0 w-full mt-1 bg-[#0a0f1e] border border-[#222] rounded-md shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 max-h-60 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <ul className="flex flex-col">
                      {searchResults.map((series) => (
                        <li
                          key={series.id}
                          onClick={() => handleSelectSeries(series)}
                          className="flex items-center gap-3 p-2 hover:bg-[#1a2235] cursor-pointer transition-colors border-b border-[#222] last:border-none"
                        >
                          {series.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${series.poster_path}`}
                              alt={series.name}
                              className="w-8 h-12 object-cover rounded shadow-sm"
                            />
                          ) : (
                            <div className="w-8 h-12 bg-black flex items-center justify-center rounded border border-[#222]">
                              <span className="text-[10px] text-brand-text-muted">N/A</span>
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-brand-text line-clamp-1">
                              {series.name}
                            </span>
                            <span className="text-xs text-brand-gold-alt">
                              {series.first_air_date ? series.first_air_date.split('-')[0] : 'N/D'}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : titulo.trim() !== '' && !isSearching ? (
                    <div className="p-4 text-center text-sm text-brand-text-muted font-light leading-relaxed">
                      Nenhuma serie encontrada no TMDB.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="capa" className="text-xs text-brand-text uppercase tracking-widest">
                URL da Capa
              </label>
              <input
                id="capa"
                value={capaUrl}
                onChange={(event) => setCapaUrl(event.target.value)}
                className="w-full bg-[#0a0f1e] border border-[#222] text-brand-text p-2.5 rounded focus:outline-none focus:border-brand-gold font-light text-sm"
                placeholder="https://..."
              />
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-2 w-full">
                <label htmlFor="temp" className="text-xs text-brand-text uppercase tracking-widest">
                  Temporada
                </label>
                <input
                  id="temp"
                  type="number"
                  min="1"
                  required
                  value={temporada}
                  onChange={(event) => handleSeasonChange(event.target.value)}
                  className="w-full bg-[#0a0f1e] border border-[#222] text-brand-text p-2.5 rounded focus:outline-none focus:border-brand-gold font-light text-center"
                />
                {totalSeasons > 0 ? (
                  <span className="text-[10px] text-brand-text-muted uppercase tracking-[0.12em]">
                    {totalSeasons} temporadas
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 w-full">
                <label htmlFor="total" className="text-xs text-brand-text uppercase tracking-widest">
                  Episodios Totais
                </label>
                <input
                  id="total"
                  type="number"
                  min="1"
                  required
                  value={totalEps}
                  onChange={(event) => setTotalEps(event.target.value)}
                  readOnly
                  className="w-full bg-[#0a0f1e] border border-[#222] text-brand-text p-2.5 rounded font-light text-center cursor-not-allowed opacity-80"
                />
              </div>
            </div>

            {defaultStatus !== 'watchlist' ? (
              <div className="flex flex-col gap-2">
                <label className="text-xs text-brand-text uppercase tracking-widest">
                  Quando voce assistiu?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-light text-brand-text hover:text-brand-gold transition-colors">
                    <input 
                      type="radio" 
                      name="retroactive_series"
                      checked={!isRetroactive} 
                      onChange={() => setIsRetroactive(false)} 
                      className="accent-brand-gold" 
                    />
                    Recentemente (Ganha pontos)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-light text-brand-text hover:text-brand-gold transition-colors">
                    <input 
                      type="radio" 
                      name="retroactive_series"
                      checked={isRetroactive} 
                      onChange={() => setIsRetroactive(true)} 
                      className="accent-brand-gold" 
                    />
                    Há mais tempo (Sem pontos)
                  </label>
                </div>
              </div>
            ) : null}

            {submitError ? (
              <div className="text-xs text-red-300 border border-red-500/40 rounded p-2 bg-red-500/10">
                {submitError}
              </div>
            ) : null}

            <div className="flex gap-3 justify-end mt-4">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 text-xs uppercase tracking-wider text-brand-text-muted hover:text-brand-text transition-colors"
                >
                  Cancelar
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isPending || !titulo.trim()}
                className={clsx(
                  'px-6 py-2 text-xs uppercase tracking-widest bg-brand-gold text-brand-bg font-medium rounded transition-all',
                  'hover:bg-opacity-90 active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
                )}
              >
                Adicionar
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 hover:text-brand-gold">
              <X size={16} />
              <span className="sr-only">Close</span>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
