
import { Star } from 'lucide-react';
import clsx from 'clsx';
import type { RankedUser } from '../../types/app';
import AvatarDisplay from './AvatarDisplay';

interface RankingScreenProps {
  users: RankedUser[];
  onSelectUser: (id: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  currentUserId: string;
}

export default function RankingScreen({
  users,
  onSelectUser,
  favorites,
  onToggleFavorite,
  currentUserId,
  onBack,
}: RankingScreenProps & { onBack?: () => void }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-4 mb-8">
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-brand-gold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
        )}
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-brand-gold">Ranking Geral</h2>
        </div>
      </div>

      <div className="space-y-3">
        {users.map((user, index) => {
          const isCurrentUser = user.id === currentUserId;
          const isFavorited = favorites.includes(user.id);
          
          return (
            <div 
              key={user.id}
              className={clsx(
                "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group",
                isCurrentUser ? "bg-white/5 border-white/20" : "bg-black/40 border-[#151515] hover:border-[#333] hover:bg-[#111]"
              )}
              onClick={() => onSelectUser(user.id)}
            >
              <div className="flex items-center gap-4">
                <div className={clsx(
                  "w-8 text-center font-bold text-lg",
                  index === 0 ? "text-[#FFD700]" : 
                  index === 1 ? "text-[#C0C0C0]" : 
                  index === 2 ? "text-[#CD7F32]" : "text-brand-text-muted"
                )}>
                  {index + 1}º
                </div>
                
                <AvatarDisplay avatarId={user.avatar_id} className="w-12 h-12" />
                
                <div className="flex flex-col">
                  <span className="font-semibold text-base flex items-center gap-2">
                    {user.display_name || user.username}
                    {isCurrentUser && <span className="text-[10px] uppercase tracking-wider bg-white/10 text-white/70 px-2 py-0.5 rounded-full">Você</span>}
                  </span>
                  <span className="text-xs text-brand-text-muted">@{user.username}</span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right flex flex-col items-end">
                  <span className="text-lg font-bold text-brand-gold">{user.mcoins}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-brand-text-muted">MCoins</span>
                </div>
                
                {!isCurrentUser && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(user.id);
                    }}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors shrink-0"
                    title={isFavorited ? "Remover dos amigos" : "Adicionar aos amigos"}
                  >
                    <Star
                      size={24}
                      className={clsx(
                        isFavorited ? 'fill-brand-gold text-brand-gold' : 'text-[#444] group-hover:text-white transition-colors'
                      )}
                    />
                  </button>
                )}
                {isCurrentUser && <div className="w-10"></div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
