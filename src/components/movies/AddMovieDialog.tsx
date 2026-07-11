import React, { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Edit3, Loader2, Plus, X } from 'lucide-react';
import clsx from 'clsx';
import { getMovieDetails, getMovieWatchProviders, searchMovies, type TMDBMovie } from '../../lib/tmdb';
import type { OscarMovie, PersonalMovie } from '../../types/app';

type AddMovieDialogProps =
  | {
      mode: 'oscar';
      onSubmit: (movie: Omit<OscarMovie, 'id'>) => Promise<unknown>;
      isPending: boolean;
      layout?: 'carousel' | 'grid';
    }
  | {
      mode: 'personal';
      onSubmit: (movie: Omit<PersonalMovie, 'id' | 'user_id' | 'created_at'>) => Promise<unknown>;
      isPending: boolean;
      layout?: 'carousel' | 'grid';
      defaultStatus?: 'watchlist' | 'watched';
    };

export default function AddMovieDialog(props: AddMovieDialogProps) {
  const { mode, onSubmit, isPending, layout = 'carousel' } = props;
  const personalDefaultStatus =
    mode === 'personal' ? props.defaultStatus ?? 'watchlist' : 'watchlist';
  const isPersonal = mode === 'personal';
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [ano, setAno] = useState(new Date().getFullYear().toString());
  const [categoria, setCategoria] = useState('');
  const [capaUrl, setCapaUrl] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isPosterReadOnly, setIsPosterReadOnly] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<TMDBMovie | null>(null);
  const [streamingData, setStreamingData] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
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
    setAno(new Date().getFullYear().toString());
    setCategoria('');
    setCapaUrl('');
    setSearchResults([]);
    setShowDropdown(false);
    setIsPosterReadOnly(false);
    setSubmitError(null);
    setSelectedMovie(null);
    setStreamingData(null);
    setDurationMinutes(null);
    setIsRetroactive(false);
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTitulo(value);

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
      const results = await searchMovies(value);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
  };

  const handleSelectMovie = (movie: TMDBMovie) => {
    setSelectedMovie(movie);
    setTitulo(movie.title);
    if (movie.release_date) {
      setAno(movie.release_date.split('-')[0]);
    }
    if (movie.poster_path) {
      setCapaUrl(`https://image.tmdb.org/t/p/w500${movie.poster_path}`);
      setIsPosterReadOnly(true);
    }
    setShowDropdown(false);
    void (async () => {
      const details = await getMovieDetails(movie.id);
      setDurationMinutes(typeof details?.runtime === 'number' ? details.runtime : null);
      const providers = await getMovieWatchProviders(movie.id, 'BR');
      setStreamingData(JSON.stringify(providers));
    })();
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!titulo.trim()) return;
    setSubmitError(null);

    try {
      if (isPersonal) {
        await onSubmit({
          titulo,
          ano_lancamento: parseInt(ano, 10) || new Date().getFullYear(),
          capa_url: capaUrl.trim() || null,
          plataforma_slug: 'stremio',
          status: personalDefaultStatus,
          source: 'manual',
          source_movie_id: selectedMovie ? String(selectedMovie.id) : null,
          rating: null,
          streaming_data: streamingData,
          duration_minutes: durationMinutes,
          is_retroactive: isRetroactive,
        });
        resetForm();
        return;
      }

      await onSubmit({
        titulo,
        ano_oscar: parseInt(ano, 10) || new Date().getFullYear(),
        categoria_principal: categoria.trim() || 'Melhor Filme',
        capa_url: capaUrl.trim() || null,
        plataforma_slug: 'stremio',
        rating: selectedMovie?.vote_average ?? null,
        streaming_data: streamingData,
      });
      resetForm();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Falha ao adicionar filme.');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className={clsx(
            'flex items-center justify-center gap-2 border border-[#222] text-brand-gold-alt text-xs tracking-widest uppercase rounded-md hover:border-brand-gold hover:text-brand-gold transition-all bg-brand-bg group border-dashed',
            layout === 'grid'
              ? 'min-h-[140px] w-full min-w-0 aspect-[2/3]'
              : 'px-4 py-2 min-h-[143px] w-[160px] md:w-[200px] shrink-0 snap-center',
          )}
        >
          <Plus size={20} className="group-hover:scale-110 transition-transform" />
          <span>{isPersonal ? 'Add Filme' : 'Add Oscar'}</span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-[92vw] max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-[#222] bg-brand-bg p-6 shadow-lg rounded-xl">
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <Dialog.Title className="text-lg font-light text-brand-gold tracking-wider">
              {isPersonal ? 'NOVO FILME PESSOAL' : 'NOVO FILME DO OSCAR'}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-brand-text-muted font-light">
              {isPersonal
                ? 'Adicione um filme a sua lista pessoal.'
                : 'Adicione um novo filme ao catalogo compartilhado do Oscar.'}
            </Dialog.Description>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
              <label htmlFor="titulo" className="text-xs text-brand-text uppercase tracking-widest">
                Titulo do Filme *
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
                  placeholder="Ex: Oppenheimer"
                  autoComplete="off"
                />
                {isSearching ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gold">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                ) : null}
              </div>

              {showDropdown ? (
                <div className="absolute top-[100%] left-0 w-full mt-1 bg-[#0a0f1e] border border-[#222] rounded-md shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 max-h-60 overflow-y-auto">
                  {isSearching && searchResults.length === 0 ? (
                    <div className="p-4 text-center text-sm text-brand-text-muted font-light">
                      Buscando no TMDB...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <ul className="flex flex-col">
                      {searchResults.map((movie) => (
                        <li
                          key={movie.id}
                          onClick={() => handleSelectMovie(movie)}
                          className="flex items-center gap-3 p-2 hover:bg-[#1a2235] cursor-pointer transition-colors border-b border-[#222] last:border-none group"
                        >
                          {movie.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                              alt={movie.title}
                              className="w-8 h-12 object-cover rounded shadow-sm"
                            />
                          ) : (
                            <div className="w-8 h-12 bg-black flex items-center justify-center rounded border border-[#222]">
                              <span className="text-[10px] text-brand-text-muted">N/A</span>
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-brand-text line-clamp-1">
                              {movie.title}
                            </span>
                            <span className="text-xs text-brand-gold-alt">
                              {movie.release_date ? movie.release_date.split('-')[0] : 'N/D'}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : titulo.trim() !== '' && !isSearching ? (
                    <div className="p-4 text-center text-sm text-brand-text-muted font-light leading-relaxed">
                      Nenhum filme encontrado no TMDB.
                      <br />
                      <span className="opacity-60 text-xs">Voce pode preencher manualmente.</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-2 w-1/3">
                <label htmlFor="ano" className="text-xs text-brand-text uppercase tracking-widest">
                  Ano
                </label>
                <input
                  id="ano"
                  type="number"
                  value={ano}
                  onChange={(event) => setAno(event.target.value)}
                  className="w-full bg-[#0a0f1e] border border-[#222] text-brand-text p-2.5 rounded focus:outline-none focus:border-brand-gold font-light"
                  placeholder="2026"
                />
              </div>

              {!isPersonal ? (
                <div className="flex flex-col gap-2 w-2/3">
                  <label htmlFor="categoria" className="text-xs text-brand-text uppercase tracking-widest">
                    Categoria
                  </label>
                  <input
                    id="categoria"
                    value={categoria}
                    onChange={(event) => setCategoria(event.target.value)}
                    className="w-full bg-[#0a0f1e] border border-[#222] text-brand-text p-2.5 rounded focus:outline-none focus:border-brand-gold font-light"
                    placeholder="Melhor Filme"
                  />
                </div>
              ) : null}
            </div>

            {isPersonal && personalDefaultStatus === 'watched' ? (
              <div className="flex flex-col gap-2">
                <label className="text-xs text-brand-text uppercase tracking-widest">
                  Quando voce assistiu?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-light text-brand-text hover:text-brand-gold transition-colors">
                    <input 
                      type="radio" 
                      name="retroactive"
                      checked={!isRetroactive} 
                      onChange={() => setIsRetroactive(false)} 
                      className="accent-brand-gold" 
                    />
                    Recentemente (Ganha pontos)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-light text-brand-text hover:text-brand-gold transition-colors">
                    <input 
                      type="radio" 
                      name="retroactive"
                      checked={isRetroactive} 
                      onChange={() => setIsRetroactive(true)} 
                      className="accent-brand-gold" 
                    />
                    Há mais tempo (Sem pontos)
                  </label>
                </div>
              </div>
            ) : null}
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="capa" className="text-xs text-brand-text uppercase tracking-widest">
                  URL do poster
                </label>
                {isPosterReadOnly ? (
                  <button
                    type="button"
                    onClick={() => setIsPosterReadOnly(false)}
                    className="text-[10px] text-brand-gold-alt hover:text-brand-gold uppercase tracking-wider flex items-center gap-1 transition-colors"
                  >
                    <Edit3 size={10} />
                    Editar manualmente
                  </button>
                ) : null}
              </div>
              <input
                id="capa"
                value={capaUrl}
                onChange={(event) => setCapaUrl(event.target.value)}
                readOnly={isPosterReadOnly}
                className={clsx(
                  'w-full border p-2.5 rounded focus:outline-none font-light text-sm transition-colors',
                  isPosterReadOnly
                    ? 'bg-black/50 border-[#111] text-brand-text-muted cursor-not-allowed select-none'
                    : 'bg-[#0a0f1e] border-[#222] text-brand-text focus:border-brand-gold',
                )}
                placeholder="https://..."
              />
            </div>

            <div className="flex gap-3 justify-end mt-4">
              {submitError ? (
                <div className="text-xs text-red-300 border border-red-500/40 rounded p-2 bg-red-500/10 mr-auto">
                  {submitError}
                </div>
              ) : null}
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
                className="px-6 py-2 text-xs uppercase tracking-widest bg-brand-gold text-brand-bg font-medium rounded transition-all hover:bg-opacity-90 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
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
