import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { KeyRound, Loader2, X, CheckCircle2 } from 'lucide-react';

interface ChangePasswordModalProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangePassword: (userId: string, current: string, next: string) => Promise<void>;
}

export default function ChangePasswordModal({
  userId,
  open,
  onOpenChange,
  onChangePassword,
}: ChangePasswordModalProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError(null);
    setSuccess(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (next.length < 4) {
      setError('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }
    if (next !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsPending(true);
    try {
      await onChangePassword(userId, current, next);
      setSuccess(true);
      setTimeout(() => handleOpenChange(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao alterar senha.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[92vw] max-w-md translate-x-[-50%] translate-y-[-50%] border border-[#222] bg-brand-bg p-6 shadow-lg rounded-xl">
          <Dialog.Title className="text-lg text-brand-gold tracking-widest uppercase flex items-center gap-2">
            <KeyRound size={18} /> Alterar Senha
          </Dialog.Title>
          <Dialog.Description className="text-sm text-brand-text-muted mt-1">
            Confirme sua senha atual e defina a nova.
          </Dialog.Description>

          {success ? (
            <div className="mt-6 flex flex-col items-center gap-3 py-4 text-brand-gold">
              <CheckCircle2 size={48} strokeWidth={2} />
              <p className="text-brand-gold text-sm uppercase tracking-widest">Senha alterada!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-[0.14em] text-brand-text-muted">
                  Senha atual
                </label>
                <input
                  id="cp-current"
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="bg-[#151515] border border-[#222] rounded-lg px-3 py-2 text-sm text-brand-text focus:border-brand-gold/40 focus:outline-none transition"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-[0.14em] text-brand-text-muted">
                  Nova senha
                </label>
                <input
                  id="cp-new"
                  type="password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="bg-[#151515] border border-[#222] rounded-lg px-3 py-2 text-sm text-brand-text focus:border-brand-gold/40 focus:outline-none transition"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-[0.14em] text-brand-text-muted">
                  Confirmar nova senha
                </label>
                <input
                  id="cp-confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="bg-[#151515] border border-[#222] rounded-lg px-3 py-2 text-sm text-brand-text focus:border-brand-gold/40 focus:outline-none transition"
                />
              </div>

              {error && (
                <p className="text-xs text-red-300 border border-red-500/20 bg-red-500/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className="px-4 py-2 text-xs uppercase tracking-[0.14em] text-brand-text-muted hover:text-brand-text transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs uppercase tracking-[0.14em] bg-brand-gold text-brand-bg rounded disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isPending ? <><Loader2 size={13} className="animate-spin" /> Salvando…</> : 'Salvar'}
                </button>
              </div>
            </form>
          )}

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
