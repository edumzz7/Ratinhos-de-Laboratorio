import { useState, useEffect } from 'react';
import { useOscarPredictions } from '../../hooks/useOscarPredictions';
import { searchMovies, searchPeople } from '../../lib/tmdb';
import { Loader2, Search, RotateCcw, Film, User, Globe, FileText, Trophy } from 'lucide-react';
import type { UserOscarPrediction } from '../../types/app';

interface OscarPredictionsSectionProps {
  userId: string;
  canEdit: boolean;
}

interface CategoryConfig {
  id: string;
  name: string;
  type: 'movie' | 'person';
  placeholder: string;
  icon: any;
}

const CATEGORIES: CategoryConfig[] = [
  { id: 'melhor_filme', name: 'Melhor Filme', type: 'movie', placeholder: 'Pesquisar filme...', icon: Film },
  { id: 'melhor_ator', name: 'Melhor Ator', type: 'person', placeholder: 'Pesquisar ator...', icon: User },
  { id: 'melhor_atriz', name: 'Melhor Atriz', type: 'person', placeholder: 'Pesquisar atriz...', icon: User },
  { id: 'melhor_internacional', name: 'Melhor Filme Internacional', type: 'movie', placeholder: 'Pesquisar filme estrangeiro...', icon: Globe },
  { id: 'melhor_roteiro', name: 'Melhor Roteiro', type: 'movie', placeholder: 'Pesquisar roteiro...', icon: FileText },
];

function getTmdbImageUrl(path: string | null | undefined, size: 'w185' | 'w300' | 'w500' = 'w185'): string {
  if (!path) {
    return 'https://placehold.co/300x450/0b101d/ffffff/png?text=Sem+Foto';
  }
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export default function OscarPredictionsSection({ userId, canEdit }: OscarPredictionsSectionProps) {
  const { predictionsQuery, savePredictionMutation } = useOscarPredictions(userId);
  const predictions = predictionsQuery.data || [];

  const handleSelectPrediction = async (
    category: string,
    tmdbId: string,
    title: string,
    posterPath: string
  ) => {
    try {
      await savePredictionMutation.mutateAsync({
        category,
        tmdbId,
        title,
        posterPath,
      });
    } catch (err) {
      console.error('Erro ao salvar palpite:', err);
    }
  };

  return (
    <section className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Trophy className="text-brand-gold w-8 h-8 animate-pulse" />
        <div>
          <h2 className="text-2xl md:text-3xl font-light tracking-widest text-brand-gold uppercase">
            Palpites Oscar 2027
          </h2>
          <p className="text-sm text-brand-text-muted mt-1">
            {canEdit 
              ? 'Monte sua aposta para as principais categorias do Oscar 2027' 
              : 'Visualize os palpites salvos deste usuário'}
          </p>
        </div>
        <div className="ml-4 h-[1px] bg-[#222] flex-grow" />
      </div>

      {predictionsQuery.isLoading ? (
        <div className="flex justify-center items-center py-20 text-brand-gold opacity-50">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORIES.map((cat) => {
            const pred = predictions.find((p) => p.category === cat.id);
            return (
              <CategoryCard
                key={cat.id}
                config={cat}
                prediction={pred}
                canEdit={canEdit}
                onSelect={handleSelectPrediction}
                isGlobalPending={savePredictionMutation.isPending}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

interface CategoryCardProps {
  config: CategoryConfig;
  prediction: UserOscarPrediction | undefined;
  canEdit: boolean;
  onSelect: (category: string, tmdbId: string, title: string, posterPath: string) => Promise<void>;
  isGlobalPending: boolean;
}

function CategoryCard({ config, prediction, canEdit, onSelect, isGlobalPending }: CategoryCardProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const IconComponent = config.icon;

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        if (config.type === 'movie') {
          const res = await searchMovies(query);
          if (config.id === 'melhor_internacional') {
            // Filter non-English movies for international category
            setResults(res.filter((movie) => movie.original_language && movie.original_language !== 'en').slice(0, 10));
          } else {
            setResults(res.slice(0, 10));
          }
        } else {
          const res = await searchPeople(query);
          setResults(res.slice(0, 10));
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [query, config.type, config.id]);

  // Reset changing state if prediction changes from outside
  useEffect(() => {
    setIsChanging(false);
    setSelectingId(null);
  }, [prediction]);

  const handleSelect = async (item: any) => {
    if (isGlobalPending || selectingId) return;

    const idStr = String(item.id);
    setSelectingId(idStr);
    
    const title = item.title || item.name;
    const poster = item.poster_path || item.profile_path || '';
    
    await onSelect(config.id, idStr, title, poster);
    setIsChanging(false);
    setSelectingId(null);
    setQuery('');
    setResults([]);
  };

  const showSelection = prediction && !isChanging;

  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl border border-white/5 bg-brand-card/20 backdrop-blur-md hover:border-brand-gold/10 transition-all flex-grow">
      {/* Category header */}
      <div className="flex items-center gap-3 border-b border-white/5 pb-3">
        <IconComponent className="text-brand-gold w-5 h-5 shrink-0" />
        <h3 className="text-lg font-light tracking-wider text-brand-text">
          {config.name}
        </h3>
      </div>

      {showSelection ? (
        /* Selected prediction display */
        <div className="flex gap-4 items-center animate-in fade-in duration-300 relative group">
          <div className="w-24 h-36 rounded-xl overflow-hidden shrink-0 border border-white/5 relative bg-[#0b101d]">
            <img
              src={getTmdbImageUrl(prediction.poster_path, 'w185')}
              alt={prediction.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://placehold.co/300x450/0b101d/ffffff/png?text=Sem+Foto';
              }}
            />
          </div>
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <h4 className="text-base font-medium text-brand-text truncate pr-2" title={prediction.title}>
              {prediction.title}
            </h4>
            <span className="text-xs text-brand-gold tracking-widest uppercase font-light">
              Palpite Salvo
            </span>
            {canEdit && (
              <button
                onClick={() => setIsChanging(true)}
                className="mt-2 text-left self-start inline-flex items-center gap-2 px-3 py-1.5 border border-[#222] hover:border-brand-gold/50 rounded-lg text-xs uppercase tracking-[0.14em] text-brand-text-muted hover:text-brand-gold transition-colors"
              >
                <RotateCcw size={12} /> Trocar
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Search and select area */
        <div className="flex flex-col gap-3 min-h-[144px] justify-center">
          {canEdit ? (
            <>
              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={config.placeholder}
                  className="w-full bg-[#07090f] border border-white/5 hover:border-white/10 focus:border-brand-gold/40 focus:outline-none rounded-xl px-4 py-2.5 pl-10 text-sm text-brand-text placeholder-brand-text-muted transition-all"
                />
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-brand-text-muted" />
                {loading && (
                  <Loader2 className="absolute right-3.5 top-3 w-4 h-4 text-brand-gold animate-spin" />
                )}
              </div>

              {/* Results area */}
              {query.trim() !== '' && !loading && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-brand-text-muted tracking-wider uppercase font-light">
                    Resultados:
                  </span>
                  {results.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                      {results.map((item) => {
                        const idStr = String(item.id);
                        const isThisSelecting = selectingId === idStr;
                        const itemTitle = item.title || item.name;
                        const itemImage = item.poster_path || item.profile_path;

                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelect(item)}
                            disabled={isGlobalPending || selectingId !== null}
                            className="w-20 snap-start flex-shrink-0 flex flex-col gap-1.5 text-left group relative focus:outline-none"
                          >
                            <div className="w-20 h-28 rounded-lg overflow-hidden border border-white/5 group-hover:border-brand-gold/60 transition-all relative bg-[#0b101d]">
                              <img
                                src={getTmdbImageUrl(itemImage, 'w185')}
                                alt={itemTitle}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://placehold.co/300x450/0b101d/ffffff/png?text=Sem+Foto';
                                }}
                              />
                              {(isThisSelecting || (isGlobalPending && selectingId === idStr)) && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <Loader2 className="w-5 h-5 text-brand-gold animate-spin" />
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-brand-text-muted group-hover:text-brand-text truncate w-full transition-colors block">
                              {itemTitle}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-brand-text-muted italic py-2">
                      Nenhum resultado encontrado.
                    </span>
                  )}
                </div>
              )}


            </>
          ) : (
            /* Friend profile read-only placeholder */
            <div className="text-center py-8 text-brand-text-muted border border-dashed border-white/5 rounded-xl text-xs font-light flex flex-col items-center gap-2">
              <IconComponent className="opacity-20 w-8 h-8" />
              <span>Nenhum palpite selecionado</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
