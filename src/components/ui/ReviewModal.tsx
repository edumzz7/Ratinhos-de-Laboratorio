import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import StarRatingInput from './StarRatingInput';
import { generateImagePath } from '../../lib/imageUtils';

interface ReviewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  coverUrl: string | null;
  initialRating: number;
  initialReview: string;
  isReadOnly: boolean;
  onSave: (rating: number, review: string) => Promise<void> | void;
  onSkip?: (rating: number) => Promise<void> | void;
}

export default function ReviewModal({
  isOpen,
  onOpenChange,
  title,
  coverUrl,
  initialRating,
  initialReview,
  isReadOnly,
  onSave,
  onSkip,
}: ReviewModalProps) {
  const [rating, setRating] = useState(initialRating);
  const [review, setReview] = useState(initialReview);
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRating(initialRating);
      setReview(initialReview);
      setError(null);
    }
  }, [isOpen, initialRating, initialReview]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await onSave(rating, review);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar resenha.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setError(null);
    setIsSkipping(true);
    try {
      if (onSkip) {
        await onSkip(rating);
      } else {
        await onSave(rating, initialReview); // Default fallback: save rating, keep old review
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar nota.');
    } finally {
      setIsSkipping(false);
    }
  };

  const imageSrc = generateImagePath(title, coverUrl);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[92vw] max-w-md translate-x-[-50%] translate-y-[-50%] border border-brand-gold/10 bg-[#050811] p-6 shadow-2xl rounded-2xl focus:outline-none">
          <div className="flex gap-4">
            {/* Media Cover */}
            <div className="w-24 aspect-[2/3] rounded-lg overflow-hidden border border-[#222] shrink-0 bg-brand-card">
              <img src={imageSrc} alt={title} className="w-full h-full object-cover" />
            </div>

            {/* Content info */}
            <div className="flex flex-col min-w-0 w-full justify-between py-1">
              <div>
                <Dialog.Title className="text-lg font-light text-brand-gold tracking-wide truncate" title={title}>
                  {title}
                </Dialog.Title>
                <Dialog.Description className="text-xs text-brand-text-muted mt-1 uppercase tracking-widest font-extralight">
                  {isReadOnly ? 'Visualizar Resenha' : 'Deixe sua opinião'}
                </Dialog.Description>
              </div>

              {/* Star Input */}
              <div className="mt-3 flex items-center gap-2">
                <StarRatingInput
                  value={rating}
                  onChange={(val) => {
                    if (!isReadOnly) setRating(val);
                  }}
                  disabled={isReadOnly}
                />
                <span className="text-xs text-brand-gold font-light">
                  {rating > 0 ? rating.toFixed(1) : 'Sem nota'}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="mt-5 flex flex-col gap-4">
            {isReadOnly ? (
              <div className="bg-[#0a0f1e]/60 border border-[#222] rounded-xl p-4 min-h-[100px] flex flex-col justify-between">
                <p className={clsx("text-sm leading-relaxed whitespace-pre-wrap", !initialReview && "text-brand-text-muted italic")}>
                  {initialReview || 'Sem resenha.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="w-full min-h-[120px] bg-[#0a0f1e] border border-[#222] text-brand-text p-3.5 rounded-xl focus:outline-none focus:border-brand-gold transition-colors text-sm placeholder-brand-text-muted resize-none"
                  placeholder="Escreva seus pensamentos sobre esta obra (opcional)..."
                  disabled={isSaving || isSkipping}
                  maxLength={1000}
                />
              </div>
            )}

            {error && <div className="text-xs text-red-400 font-light leading-relaxed">{error}</div>}

            <div className="flex gap-3 justify-end items-center mt-2">
              {isReadOnly ? (
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="px-6 py-2.5 text-xs uppercase tracking-widest bg-brand-gold text-brand-bg font-semibold rounded-lg transition-all hover:bg-opacity-90 active:scale-95 shadow-[0_0_10px_rgba(212,175,55,0.15)]"
                  >
                    Fechar
                  </button>
                </Dialog.Close>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={isSaving || isSkipping}
                    className="px-4 py-2.5 text-xs uppercase tracking-wider text-brand-text-muted hover:text-brand-text transition-colors disabled:opacity-50"
                  >
                    {isSkipping ? (
                      <Loader2 size={14} className="animate-spin text-brand-gold" />
                    ) : (
                      'Pular'
                    )}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isSkipping}
                    className="px-6 py-2.5 text-xs uppercase tracking-widest bg-brand-gold text-brand-bg font-semibold rounded-lg transition-all hover:bg-opacity-90 active:scale-95 shadow-[0_0_10px_rgba(212,175,55,0.15)] disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSaving && <Loader2 size={12} className="animate-spin" />}
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                </>
              )}
            </div>
          </form>

          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 rounded-full p-1 text-brand-text-muted hover:text-brand-gold hover:bg-[#111] transition-all">
              <X size={16} />
              <span className="sr-only">Fechar</span>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
