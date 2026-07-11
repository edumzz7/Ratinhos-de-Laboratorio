import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { KeyRound, Loader2, Shield, X } from 'lucide-react';
import type { RankedUser } from '../../types/app';

interface AdminPanelProps {
  users: RankedUser[];
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdminReset: (targetUsername: string, newPassword: string) => Promise<void>;
}

export default function AdminPanel({
  users,
  currentUserId,
  open,
  onOpenChange,
  onAdminReset,
}: AdminPanelProps) {
  const [resetting, setResetting] = useState<string | null>(null); // username being reset
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const otherUsers = users.filter((u) => u.id !== currentUserId);

  const openReset = (username: string) => {
    setResetting(username);
    setNewPassword('');
    setConfirm('');
    setError(null);
    setSuccessMsg(null);
  };

  const cancelReset = () => {
    setResetting(null);
    setError(null);
    setSuccessMsg(null);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetting) return;
    setError(null);
    setSuccessMsg(null);

    if (newPassword.length < 4) {
      setError('A senha deve ter pelo menos 4 caracteres.');
      return;
    }
    if (newPassword !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsPending(true);
    try {
      await onAdminReset(resetting, newPassword);
      setSuccessMsg(`Senha de "${resetting}" redefinida com sucesso.`);
      setResetting(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao redefinir senha.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[92vw] max-w-lg translate-x-[-50%] translate-y-[-50%] border border-brand-gold/20 bg-brand-bg shadow-lg rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-[#1a1a1a]">
            <Dialog.Title className="text-lg text-brand-gold tracking-widest uppercase flex items-center gap-2">
              <Shield size={18} /> Painel Admin
            </Dialog.Title>
            <Dialog.Description className="text-xs text-brand-text-muted mt-1">
              Gerencie senhas dos usuários. Apenas você vê este painel.
            </Dialog.Description>
          </div>

          <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">

            {/* Success feedback */}
            {successMsg && (
              <div className="text-xs text-emerald-300 border border-emerald-500/20 bg-emerald-500/10 rounded-lg px-3 py-2">
                ✅ {successMsg}
              </div>
            )}

            {/* Reset form inline */}
            {resetting ? (
              <form onSubmit={handleReset} className="border border-brand-gold/20 rounded-xl p-4 flex flex-col gap-3 bg-brand-gold/5">
                <p className="text-sm text-brand-gold uppercase tracking-widest">
                  Redefinir senha de <span className="font-semibold">@{resetting}</span>
                </p>

                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-[0.14em] text-brand-text-muted">
                    Nova senha
                  </label>
                  <input
                    id="admin-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    autoFocus
                    className="bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2 text-sm text-brand-text focus:border-brand-gold/40 focus:outline-none transition"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-[0.14em] text-brand-text-muted">
                    Confirmar senha
                  </label>
                  <input
                    id="admin-confirm-password"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                    className="bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2 text-sm text-brand-text focus:border-brand-gold/40 focus:outline-none transition"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-300 border border-red-500/20 bg-red-500/10 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex gap-2 justify-end mt-1">
                  <button
                    type="button"
                    onClick={cancelReset}
                    className="px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-brand-text-muted hover:text-brand-text transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs uppercase tracking-[0.14em] bg-brand-gold text-brand-bg rounded disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {isPending ? <><Loader2 size={12} className="animate-spin" /> Salvando…</> : 'Confirmar reset'}
                  </button>
                </div>
              </form>
            ) : (
              /* Users list */
              <div className="flex flex-col gap-2">
                {otherUsers.length === 0 ? (
                  <p className="text-sm text-brand-text-muted text-center py-4">
                    Nenhum outro usuário cadastrado.
                  </p>
                ) : (
                  otherUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] hover:border-[#2a2a2a] transition"
                    >
                      <div>
                        <p className="text-sm text-brand-text font-medium">
                          {user.display_name || user.username}
                        </p>
                        <p className="text-xs text-brand-text-muted">@{user.username}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openReset(user.username)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-[0.14em] border border-brand-gold/30 text-brand-gold rounded-lg hover:bg-brand-gold/10 transition"
                      >
                        <KeyRound size={12} /> Resetar senha
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

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
