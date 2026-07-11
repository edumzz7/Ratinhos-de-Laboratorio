import { useState, useRef, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { X, Loader2 } from 'lucide-react';
import { searchMovies, searchSeries } from '../../lib/tmdb';
import type { RankedUser } from '../../types/app';

interface EditProfileModalProps {
  user: RankedUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaving: boolean;
  isDeleting?: boolean;
  onSave: (data: {
    display_name?: string;
    favorite_movie?: string;
    favorite_movie_2?: string;
    favorite_genre?: string;
    favorite_series?: string;
    watch_preference?: 'home' | 'cinema';
  }) => Promise<unknown>;
  onDeleteProfile: (currentPassword: string) => Promise<unknown>;
}

interface SearchItem {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
}

function SearchInput({
  label,
  placeholder,
  value,
  onChange,
  searchFn,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  searchFn: (query: string) => Promise<SearchItem[]>;
}) {
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
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

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value;
    onChange(val);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!val.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    searchTimeout.current = window.setTimeout(async () => {
      const results = await searchFn(val);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
  };

  const handleSelect = (item: SearchItem) => {
    onChange(item.title);
    setShowDropdown(false);
  };

  return (
    <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
      <label className="block text-xs uppercase tracking-[0.14em] text-brand-text-muted mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleTitleChange}
          onFocus={() => {
            if (value.trim() && searchResults.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full bg-[#151515] border border-[#222] rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-text-muted/50 focus:border-brand-gold/40 focus:outline-none transition pr-10"
        />
        {isSearching ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gold">
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : null}
      </div>

      {showDropdown ? (
        <div className="absolute top-[100%] left-0 w-full mt-1 bg-[#151515] border border-[#222] rounded-md shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 max-h-60 overflow-y-auto">
          {isSearching && searchResults.length === 0 ? (
            <div className="p-4 text-center text-sm text-brand-text-muted font-light">
              Buscando no TMDB...
            </div>
          ) : searchResults.length > 0 ? (
            <ul className="flex flex-col">
              {searchResults.map((item) => (
                <li
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="flex items-center gap-3 p-2 hover:bg-[#1a2235] cursor-pointer transition-colors border-b border-[#222] last:border-none group"
                >
                  {item.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                      alt={item.title}
                      className="w-8 h-12 object-cover rounded shadow-sm"
                    />
                  ) : (
                    <div className="w-8 h-12 bg-black flex items-center justify-center rounded border border-[#222]">
                      <span className="text-[10px] text-brand-text-muted">N/A</span>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-brand-text line-clamp-1">
                      {item.title}
                    </span>
                    <span className="text-xs text-brand-gold-alt">
                      {item.release_date ? item.release_date.split('-')[0] : 'N/D'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : value.trim() !== '' && !isSearching ? (
            <div className="p-4 text-center text-sm text-brand-text-muted font-light leading-relaxed">
              Nenhum resultado encontrado.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function EditProfileModal({
  user,
  open,
  onOpenChange,
  isSaving,
  isDeleting = false,
  onSave,
  onDeleteProfile,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(user.display_name || '');
  const [favoriteMovie, setFavoriteMovie] = useState(user.favorite_movie || '');
  const [favoriteMovie2, setFavoriteMovie2] = useState(user.favorite_movie_2 || '');
  const [favoriteSeries, setFavoriteSeries] = useState(user.favorite_series || '');
  const [favoriteGenre, setFavoriteGenre] = useState(user.favorite_genre || '');
  const [watchPref, setWatchPref] = useState<'home' | 'cinema' | ''>(
    user.watch_preference || ''
  );
  const [error, setError] = useState<string | null>(null);
  const [internalSaving, setInternalSaving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (nextOpen) {
      setDisplayName(user.display_name || '');
      setFavoriteMovie(user.favorite_movie || '');
      setFavoriteMovie2(user.favorite_movie_2 || '');
      setFavoriteSeries(user.favorite_series || '');
      setFavoriteGenre(user.favorite_genre || '');
      setWatchPref(user.watch_preference || '');
      setError(null);
      setConfirmDeleteOpen(false);
      setCurrentPassword('');
      setDeleteError(null);
    } else {
      setTimeout(() => {
        document.body.style.pointerEvents = '';
      }, 500);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setInternalSaving(true);
    try {
      await onSave({
        display_name: displayName.trim() || undefined,
        favorite_movie: favoriteMovie.trim() || undefined,
        favorite_movie_2: favoriteMovie2.trim() || undefined,
        favorite_genre: favoriteGenre.trim() || undefined,
        favorite_series: favoriteSeries.trim() || undefined,
        watch_preference: (watchPref as 'home' | 'cinema') || undefined,
      });
      onOpenChange(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar perfil.');
    } finally {
      setInternalSaving(false);
    }
  };

  const movieSearchFn = async (query: string) => {
    const results = await searchMovies(query);
    return results.map(r => ({ id: r.id, title: r.title, release_date: r.release_date, poster_path: r.poster_path }));
  };

  const seriesSearchFn = async (query: string) => {
    const results = await searchSeries(query);
    return results.map(r => ({ id: r.id, title: r.name, release_date: r.first_air_date, poster_path: r.poster_path }));
  };

  const handleDeleteProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setDeleteError(null);

    try {
      await onDeleteProfile(currentPassword);
      setConfirmDeleteOpen(false);
      setCurrentPassword('');
    } catch (deleteProfileError) {
      setDeleteError(
        deleteProfileError instanceof Error ? deleteProfileError.message : 'Falha ao excluir perfil.',
      );
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[92vw] max-w-lg translate-x-[-50%] translate-y-[-50%] border border-[#222] bg-brand-bg p-6 shadow-lg rounded-xl max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-lg text-brand-gold tracking-widest uppercase">
            Editar Perfil
          </Dialog.Title>
          <Dialog.Description className="text-sm text-brand-text-muted mt-2">
            Atualize suas preferências e informações do perfil.
          </Dialog.Description>

          <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-brand-text-muted mb-1">
                Nome de Exibição
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como quer ser chamado?"
                className="w-full bg-[#151515] border border-[#222] rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-text-muted/50 focus:border-brand-gold/40 focus:outline-none transition"
              />
            </div>

            <SearchInput
              label="Filme Favorito"
              placeholder="Ex: O Poderoso Chefão"
              value={favoriteMovie}
              onChange={setFavoriteMovie}
              searchFn={movieSearchFn}
            />

            <SearchInput
              label="Melhor Filme Que Viu"
              placeholder="Ex: Matrix"
              value={favoriteMovie2}
              onChange={setFavoriteMovie2}
              searchFn={movieSearchFn}
            />

            <SearchInput
              label="Série Favorita"
              placeholder="Ex: Breaking Bad"
              value={favoriteSeries}
              onChange={setFavoriteSeries}
              searchFn={seriesSearchFn}
            />

            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-brand-text-muted mb-1">
                Gênero Favorito
              </label>
              <input
                type="text"
                value={favoriteGenre}
                onChange={(e) => setFavoriteGenre(e.target.value)}
                placeholder="Ex: Ficção Científica"
                className="w-full bg-[#151515] border border-[#222] rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-text-muted/50 focus:border-brand-gold/40 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-brand-text-muted mb-2">
                Onde prefere Assistir?
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div
                    className={clsx(
                      'w-4 h-4 rounded-full border flex items-center justify-center transition',
                      watchPref === 'home'
                        ? 'border-brand-gold'
                        : 'border-[#444] group-hover:border-brand-gold/50'
                    )}
                  >
                    {watchPref === 'home' && <div className="w-2 h-2 rounded-full bg-brand-gold" />}
                  </div>
                  <span className="text-sm text-brand-text">Em casa</span>
                  <input
                    type="radio"
                    name="watch_preference"
                    value="home"
                    checked={watchPref === 'home'}
                    onChange={() => setWatchPref('home')}
                    className="sr-only"
                  />
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div
                    className={clsx(
                      'w-4 h-4 rounded-full border flex items-center justify-center transition',
                      watchPref === 'cinema'
                        ? 'border-brand-gold'
                        : 'border-[#444] group-hover:border-brand-gold/50'
                    )}
                  >
                    {watchPref === 'cinema' && <div className="w-2 h-2 rounded-full bg-brand-gold" />}
                  </div>
                  <span className="text-sm text-brand-text">No Cinema</span>
                  <input
                    type="radio"
                    name="watch_preference"
                    value="cinema"
                    checked={watchPref === 'cinema'}
                    onChange={() => setWatchPref('cinema')}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {error && <p className="text-xs text-red-300 mt-1">{error}</p>}

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setCurrentPassword('');
                  setConfirmDeleteOpen(true);
                }}
                className="px-4 py-2 text-xs uppercase tracking-[0.14em] rounded border border-red-500/40 text-red-300 hover:bg-red-500/10 transition"
              >
                Excluir perfil
              </button>
              <button
                type="submit"
                disabled={isSaving || internalSaving}
                className="px-4 py-2 text-xs uppercase tracking-[0.14em] bg-brand-gold text-brand-bg rounded disabled:opacity-50 transition hover:bg-brand-gold/90"
              >
                {isSaving || internalSaving ? 'Salvando...' : 'Salvar perfil'}
              </button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 hover:text-brand-gold">
              <X size={16} />
            </button>
          </Dialog.Close>

          {confirmDeleteOpen ? (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 px-4">
              <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-[#090b11] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
                <div className="space-y-2">
                  <h3 className="text-lg uppercase tracking-[0.14em] text-red-300">Confirmar exclusao</h3>
                  <p className="text-sm leading-relaxed text-brand-text-muted">
                    Essa acao remove seu perfil do app e bloqueia este cadastro atual. Digite sua senha atual para confirmar.
                  </p>
                </div>

                <form onSubmit={handleDeleteProfile} className="mt-5 flex flex-col gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.14em] text-brand-text-muted mb-1">
                      Senha atual
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      autoComplete="current-password"
                      className="w-full bg-[#151515] border border-[#222] rounded-lg px-3 py-2 text-sm text-brand-text focus:border-red-400/50 focus:outline-none transition"
                      required
                    />
                  </div>

                  {deleteError ? <p className="text-xs text-red-300">{deleteError}</p> : null}

                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDeleteOpen(false);
                        setCurrentPassword('');
                        setDeleteError(null);
                      }}
                      className="px-4 py-2 text-xs uppercase tracking-[0.14em] text-brand-text-muted hover:text-brand-text transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isDeleting}
                      className="px-4 py-2 text-xs uppercase tracking-[0.14em] rounded bg-red-600 text-white disabled:opacity-50"
                    >
                      {isDeleting ? 'Excluindo...' : 'Confirmar exclusao'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
