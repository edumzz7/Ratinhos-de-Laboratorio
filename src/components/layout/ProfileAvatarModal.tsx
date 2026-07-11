import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { ImageUp, UserRound, X } from 'lucide-react';
import { AVATAR_OPTIONS, createCustomAvatarId, isCustomAvatar } from '../../lib/avatars';
import AvatarDisplay from './AvatarDisplay';

interface ProfileAvatarModalProps {
  currentAvatarId: string;
  currentDisplayName?: string;
  isSaving: boolean;
  onSave: (avatarId: string, displayName: string) => Promise<unknown>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ProfileAvatarModal({
  currentAvatarId,
  currentDisplayName,
  isSaving,
  onSave,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ProfileAvatarModalProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const [selected, setSelected] = useState(currentAvatarId);
  const [displayName, setDisplayName] = useState(currentDisplayName || '');
  const [error, setError] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(nextOpen);
    controlledOnOpenChange?.(nextOpen);
    if (nextOpen) {
      setSelected(currentAvatarId);
      setDisplayName(currentDisplayName || '');
      setError(null);
    } else {
      setTimeout(() => {
        document.body.style.pointerEvents = '';
      }, 500);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await onSave(selected, displayName.trim());
      handleOpenChange(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar avatar.');
    }
  };

  const readImageFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
      reader.readAsDataURL(file);
    });

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Imagem invalida.'));
      image.src = src;
    });

  const buildAvatarDataUrl = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      throw new Error('Envie um arquivo de imagem.');
    }

    const source = await readImageFile(file);
    const image = await loadImage(source);
    let size = 96;
    let quality = 0.76;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Nao foi possivel processar a imagem.');

      const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
      const cropX = (image.naturalWidth - cropSize) / 2;
      const cropY = (image.naturalHeight - cropSize) / 2;
      context.drawImage(image, cropX, cropY, cropSize, cropSize, 0, 0, size, size);

      const dataUrl = canvas.toDataURL('image/webp', quality);
      if (dataUrl.length <= 12000 || size <= 56) return dataUrl;

      size -= 8;
      quality = Math.max(0.48, quality - 0.06);
    }

    throw new Error('A imagem ficou grande demais. Tente uma imagem mais simples.');
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);
    setIsProcessingUpload(true);
    try {
      const dataUrl = await buildAvatarDataUrl(file);
      setSelected(createCustomAvatarId(dataUrl));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Falha ao carregar imagem.');
    } finally {
      setIsProcessingUpload(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <Dialog.Trigger asChild>
          <button className="inline-flex items-center gap-2 px-3 py-2 border border-brand-gold/40 rounded-lg text-xs uppercase tracking-[0.14em] text-brand-gold hover:bg-brand-gold/10 transition">
            <UserRound size={14} /> Editar Perfil <AvatarDisplay avatarId={currentAvatarId} className="w-4 h-4" emojiClassName="text-sm" />
          </button>
        </Dialog.Trigger>
      )}

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[92vw] max-w-lg translate-x-[-50%] translate-y-[-50%] border border-[#222] bg-brand-bg p-6 shadow-lg rounded-xl">
          <Dialog.Title className="text-lg text-brand-gold tracking-widest uppercase">Editar Perfil</Dialog.Title>
          <Dialog.Description className="text-sm text-brand-text-muted mt-2">
            Atualize seu nome de exibicao e selecione seu icone.
          </Dialog.Description>

          <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-brand-text-muted mb-1">
                Nome de Exibicao
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como quer ser chamado?"
                className="w-full bg-[#151515] border border-[#222] rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-text-muted/50 focus:border-brand-gold/40 focus:outline-none transition"
              />
            </div>
            
            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-brand-text-muted mb-2">
                Avatar
              </label>
              <div className="grid grid-cols-5 gap-2">
              {AVATAR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelected(option.id)}
                  title={option.label}
                  className={clsx(
                    'h-12 rounded-lg border text-2xl flex items-center justify-center transition',
                    selected === option.id
                      ? 'border-brand-gold bg-brand-gold/10'
                      : 'border-[#222] hover:border-brand-gold/40',
                  )}
                >
                  {option.emoji}
                </button>
              ))}
            </div>

            <label
              className={clsx(
                'mt-3 flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-3 text-xs uppercase tracking-[0.14em] transition',
                isCustomAvatar(selected)
                  ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                  : 'border-[#222] text-brand-text-muted hover:border-brand-gold/40 hover:text-brand-gold',
              )}
            >
              <span className="inline-flex items-center gap-2">
                <ImageUp size={15} />
                {isProcessingUpload ? 'Processando...' : 'Enviar imagem'}
              </span>
              {isCustomAvatar(selected) ? (
                <AvatarDisplay avatarId={selected} className="w-8 h-8" emojiClassName="text-lg" />
              ) : null}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => void handleUpload(event)}
                disabled={isProcessingUpload}
              />
            </label>
            </div>

            {error ? <p className="text-xs text-red-300 mt-3">{error}</p> : null}

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSaving || isProcessingUpload}
                className="px-4 py-2 text-xs uppercase tracking-[0.14em] bg-brand-gold text-brand-bg rounded disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : 'Salvar perfil'}
              </button>
            </div>
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
