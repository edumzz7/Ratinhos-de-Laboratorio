import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, Plus, X } from 'lucide-react';
import type { AppUser, PersonalMovie } from '../../types/app';
import { useSuggestMovie } from '../../hooks/useSuggestMovie';
import {
  getMovieWatchProviders,
  getTvWatchProviders,
  searchMulti,
  type TMDBMultiResult,
} from '../../lib/tmdb';

interface SuggestMovieModalProps {
  currentUserId: string;
  users: AppUser[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function SuggestMovieModal({ currentUserId, users, open: controlledOpen, onOpenChange: controlledOnOpenChange }: SuggestMovieModalProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(newOpen);
    controlledOnOpenChange?.(newOpen);
  };
  const [friendId, setFriendId] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<TMDBMultiResult | null>(null);
  const [searchResults, setSearchResults] = useState<TMDBMultiResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [capaUrl, setCapaUrl] = useState('');
  const [streamingData, setStreamingData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchTimeout = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestMutation = useSuggestMovie();

  const options = users.filter((user) => user.id !== currentUserId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const reset = () => {
    setFriendId('');
    setQuery('');
    setSelected(null);
    setSearchResults([]);
    setIsSearching(false);
    setShowDropdown(false);
    setCapaUrl('');
    setStreamingData(null);
    setError(null);
    handleOpenChange(false);
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    setSelected(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!value.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);
    searchTimeout.current = window.setTimeout(async () => {
      const results = await searchMulti(value);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
  };

  const pick = (item: TMDBMultiResult) => {
    setSelected(item);
    setQuery(item.title ?? item.name ?? '');
    if (item.poster_path) {
      setCapaUrl(`https://image.tmdb.org/t/p/w500${item.poster_path}`);
    } else {
      setCapaUrl('');
    }
    void (async () => {
      const providers =
        item.media_type === 'movie'
          ? await getMovieWatchProviders(item.id, 'BR')
          : await getTvWatchProviders(item.id, 'BR');
      setStreamingData(JSON.stringify(providers));
    })();
    setShowDropdown(false);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!friendId || !selected) {
      setError('Selecione uma midia da busca TMDB para indicar.');
      return;
    }
    setError(null);

    const title = selected.title ?? selected.name ?? '';
    const release = selected.release_date ?? selected.first_air_date ?? '';
    const year = release ? parseInt(release.split('-')[0], 10) || null : null;
    const payload: Omit<PersonalMovie, 'id' | 'user_id' | 'created_at'> = {
      titulo: title.trim(),
      ano_lancamento: year,
      capa_url: capaUrl.trim() || null,
      plataforma_slug: 'stremio',
      status: 'watchlist',
      source: 'manual',
      source_movie_id: String(selected.id),
      rating: selected.vote_average ?? null,
      streaming_data: streamingData,
    };

    try {
      await suggestMutation.mutateAsync({
        fromUserId: currentUserId,
        toUserId: friendId,
        movie: payload,
        mediaType: selected.media_type,
      });
      reset();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao indicar.');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <Dialog.Trigger asChild>
          <button className="inline-flex items-center gap-2 px-3 py-2 border border-brand-gold/40 rounded-lg text-xs uppercase tracking-[0.14em] text-brand-gold hover:bg-brand-gold/10 transition">
            <Plus size={14} /> Indicar
          </button>
        </Dialog.Trigger>
      )}

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[92vw] max-w-lg translate-x-[-50%] translate-y-[-50%] border border-[#222] bg-brand-bg p-6 shadow-lg rounded-xl">
          <Dialog.Title className="text-lg text-brand-gold tracking-widest uppercase">Indicar Midia</Dialog.Title>
          <Dialog.Description className="text-sm text-brand-text-muted mt-2">
            Indique filme ou serie para a watchlist de um amigo.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <select
              value={friendId}
              onChange={(event) => setFriendId(event.target.value)}
              className="w-full bg-[#0a0f1e] border border-[#222] text-brand-text p-2.5 rounded"
              required
            >
              <option value="">Selecione um amigo</option>
              {options.map((user) => (
                <option key={user.id} value={user.id}>{user.username}</option>
              ))}
            </select>

            <div className="relative" ref={dropdownRef}>
              <input
                value={query}
                onChange={(event) => handleSearch(event.target.value)}
                onFocus={() => {
                  if (query.trim() && searchResults.length > 0) setShowDropdown(true);
                }}
                placeholder="Buscar filme ou serie no TMDB"
                className="w-full bg-[#0a0f1e] border border-[#222] text-brand-text p-2.5 rounded pr-10"
                required
              />
              {isSearching ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gold">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              ) : null}

              {showDropdown ? (
                <div className="absolute top-[100%] left-0 w-full mt-1 bg-[#0a0f1e] border border-[#222] rounded-md shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 max-h-60 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <ul className="flex flex-col">
                      {searchResults.map((item) => (
                        <li
                          key={`${item.media_type}-${item.id}`}
                          onClick={() => pick(item)}
                          className="flex items-center gap-3 p-2 hover:bg-[#1a2235] cursor-pointer transition-colors border-b border-[#222] last:border-none"
                        >
                          {item.poster_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                              alt={item.title ?? item.name ?? 'item'}
                              className="w-8 h-12 object-cover rounded shadow-sm"
                            />
                          ) : (
                            <div className="w-8 h-12 bg-black flex items-center justify-center rounded border border-[#222]">
                              <span className="text-[10px] text-brand-text-muted">N/A</span>
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm text-brand-text line-clamp-1">
                              {item.title ?? item.name}
                            </span>
                            <span className="text-xs text-brand-gold-alt uppercase">
                              {item.media_type === 'movie' ? 'Filme' : 'Serie'}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : query.trim() !== '' && !isSearching ? (
                    <div className="p-4 text-center text-sm text-brand-text-muted font-light">
                      Nenhum resultado no TMDB.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <input
              value={capaUrl}
              onChange={(event) => setCapaUrl(event.target.value)}
              placeholder="URL da capa (opcional)"
              className="w-full bg-[#0a0f1e] border border-[#222] text-brand-text p-2.5 rounded"
            />

            {selected ? (
              <p className="text-[11px] text-brand-gold-alt">
                Selecionado: {selected.title ?? selected.name} ({selected.media_type === 'movie' ? 'Filme' : 'Serie'})
              </p>
            ) : null}
            {error ? <p className="text-xs text-red-300">{error}</p> : null}

            <button
              type="submit"
              disabled={suggestMutation.isPending}
              className="px-4 py-2 text-xs uppercase tracking-[0.14em] bg-brand-gold text-brand-bg rounded disabled:opacity-50"
            >
              {suggestMutation.isPending ? 'Enviando...' : 'Enviar indicacao'}
            </button>
          </form>

          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 hover:text-brand-gold">
              <X size={16} />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
