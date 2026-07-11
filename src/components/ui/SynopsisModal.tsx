import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2 } from 'lucide-react';
import { getMovieDetails, getTvDetailsRaw } from '../../lib/tmdb';

interface SynopsisModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  movieId: number | null;
  mediaType?: 'movie' | 'tv';
}

export default function SynopsisModal({
  isOpen,
  onOpenChange,
  title,
  movieId,
  mediaType = 'movie',
}: SynopsisModalProps) {
  const [synopsis, setSynopsis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && movieId) {
      setIsLoading(true);
      setError(null);
      
      const fetchPromise = mediaType === 'tv' 
        ? getTvDetailsRaw(movieId) 
        : getMovieDetails(movieId);

      fetchPromise
        .then((data) => {
          if (data && data.overview) {
            setSynopsis(data.overview);
          } else {
            setSynopsis('Sinopse não disponível para este título.');
          }
        })
        .catch(() => {
          setError('Falha ao carregar a sinopse.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (isOpen && !movieId) {
      setSynopsis('Sinopse não disponível para este título.');
    }
  }, [isOpen, movieId, mediaType]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[92vw] max-w-md translate-x-[-50%] translate-y-[-50%] border border-brand-gold/10 bg-[#050811] p-6 shadow-2xl rounded-2xl focus:outline-none flex flex-col max-h-[80vh]">
          
          <div className="flex justify-between items-start mb-4">
            <Dialog.Title className="text-lg font-light text-brand-gold tracking-wide pr-6">
              Sinopse: {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="absolute right-4 top-4 rounded-full p-1 text-brand-text-muted hover:text-brand-gold hover:bg-[#111] transition-all">
                <X size={16} />
                <span className="sr-only">Fechar</span>
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="animate-spin text-brand-gold" size={24} />
              </div>
            ) : error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : (
              <p className="text-sm text-brand-text font-light leading-relaxed whitespace-pre-wrap">
                {synopsis}
              </p>
            )}
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
