import { useState } from 'react';
import { Film, Loader2, Lock, UserRound } from 'lucide-react';

type Mode = 'login' | 'register';

interface AuthScreenProps {
  onLogin: (identifier: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  onQuickAccess?: () => void;
  onQuickAccessTwo?: () => void;
  error: string | null;
  isPending: boolean;
}

export default function AuthScreen({
  onLogin,
  onRegister,
  onQuickAccess,
  onQuickAccessTwo,
  error,
  isPending,
}: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) return;

    if (mode === 'login') {
      await onLogin(username, password);
      return;
    }

    await onRegister(username, password);
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.15fr_0.85fr] border border-[#171717] rounded-[28px] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(212,175,55,0.08),_transparent_35%),linear-gradient(135deg,_rgba(10,15,30,0.92),_rgba(0,0,0,0.98))] shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
        <section className="p-8 md:p-12 lg:p-14 border-b lg:border-b-0 lg:border-r border-[#171717] flex flex-col justify-between gap-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 text-brand-gold uppercase tracking-[0.35em] text-xs">
              <Film size={16} />
              CineRats
            </div>

            <div className="space-y-4 max-w-xl">
              <h1 className="text-4xl md:text-5xl font-light leading-tight tracking-[0.08em] uppercase">
                SEU CLUBE DE CINEMA PARTICULAR.
              </h1>
              <p className="text-brand-text-muted leading-relaxed max-w-lg">
                Monte sua biblioteca particular, compartilhe seu gosto com os amigos e ganhe pontos a cada filme ou série assistido. Seu hobby favorito ainda mais interessante!
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs uppercase tracking-[0.22em]">
            <div className="border border-[#1c1c1c] rounded-2xl p-4 bg-black/30">
              Suba no ranking a cada play ou apenas monte sua coleção.
            </div>
            <div className="border border-[#1c1c1c] rounded-2xl p-4 bg-black/30">
              Palpite, indique e interaja
            </div>
            <div className="border border-[#1c1c1c] rounded-2xl p-4 bg-black/30">
              Seu feed, do seu jeito!
            </div>
          </div>
        </section>

        <section className="p-8 md:p-12 flex flex-col justify-center">
          <div className="flex justify-center mb-10">
            <img src="/logo-cn.png" alt="CineRats Logo" className="w-32 sm:w-40 drop-shadow-2xl opacity-90 hover:opacity-100 hover:scale-105 transition-all duration-300" />
          </div>

          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-brand-text-muted mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={mode === 'login' ? 'text-brand-gold' : 'hover:text-brand-text'}
            >
              Login
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={mode === 'register' ? 'text-brand-gold' : 'hover:text-brand-text'}
            >
              Cadastro
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="username" className="text-xs uppercase tracking-[0.25em] text-brand-text-muted">
                Username
              </label>
              <div className="flex items-center gap-3 border border-[#222] rounded-2xl px-4 py-3 bg-[#090d18]">
                <UserRound size={16} className="text-brand-gold-alt shrink-0" />
                <input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full bg-transparent outline-none"
                  placeholder="seu_usuario"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs uppercase tracking-[0.25em] text-brand-text-muted">
                Senha
              </label>
              <div className="flex items-center gap-3 border border-[#222] rounded-2xl px-4 py-3 bg-[#090d18]">
                <Lock size={16} className="text-brand-gold-alt shrink-0" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-transparent outline-none"
                  placeholder="Sua senha"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            {error ? (
              <div className="border border-red-500/30 bg-red-500/10 rounded-2xl px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-2xl px-5 py-3 uppercase tracking-[0.25em] text-sm bg-brand-gold text-black font-medium hover:opacity-90 disabled:opacity-60 disabled:pointer-events-none transition"
            >
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Processando
                </span>
              ) : mode === 'login' ? (
                'Entrar'
              ) : (
                'Criar conta'
              )}
            </button>

            {onQuickAccess ? (
              <button
                type="button"
                disabled={isPending}
                onClick={onQuickAccess}
                className="w-full rounded-2xl px-5 py-3 uppercase tracking-[0.25em] text-sm bg-transparent border border-brand-gold/40 text-brand-gold font-medium hover:bg-brand-gold/10 disabled:opacity-60 disabled:pointer-events-none transition flex items-center justify-center gap-3"
              >
                Acesso r&aacute;pido local
              </button>
            ) : null}
            {onQuickAccessTwo ? (
              <button
                type="button"
                disabled={isPending}
                onClick={onQuickAccessTwo}
                className="w-full rounded-2xl px-5 py-3 uppercase tracking-[0.25em] text-sm bg-transparent border border-white/15 text-brand-text-muted font-medium hover:border-brand-gold/40 hover:text-brand-gold disabled:opacity-60 disabled:pointer-events-none transition flex items-center justify-center gap-3"
              >
                Acesso rapido 2
              </button>
            ) : null}
          </form>
        </section>
      </div>
    </div>
  );
}
