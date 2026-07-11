import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listFavorites, addFavorite, removeFavorite } from '../lib/appData';
import type { UserFavorite } from '../types/app';

export const FAVORITES_QUERY_KEY = 'user_favorites';

export function useFavorites(currentUserId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: [FAVORITES_QUERY_KEY, currentUserId],
    queryFn: () => (currentUserId ? listFavorites(currentUserId) : Promise.resolve([])),
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ favoriteUserId, isFavorite }: { favoriteUserId: string; isFavorite: boolean }) => {
      if (!currentUserId) throw new Error('Not logged in');
      if (currentUserId === favoriteUserId) return null; // Prevent self-favorite
      
      console.log("Saving favorite:", { owner_user_id: currentUserId, favorite_user_id: favoriteUserId });

      if (isFavorite) {
        // Find the document ID to remove
        const doc = favorites.find(f => f.favorite_user_id === favoriteUserId);
        if (doc) {
          await removeFavorite(doc.id);
          return { action: 'removed', id: doc.id, favoriteUserId };
        }
      } else {
        // Add new favorite
        const newFav = await addFavorite(currentUserId, favoriteUserId);
        return { action: 'added', newFav };
      }
      return null;
    },
    onMutate: async ({ favoriteUserId, isFavorite }) => {
      if (!currentUserId) return;
      
      await queryClient.cancelQueries({ queryKey: [FAVORITES_QUERY_KEY, currentUserId] });
      const previousFavorites = queryClient.getQueryData<UserFavorite[]>([FAVORITES_QUERY_KEY, currentUserId]) || [];

      console.log("Favorites fetched:", previousFavorites);

      // Optimistic update
      queryClient.setQueryData<UserFavorite[]>([FAVORITES_QUERY_KEY, currentUserId], (old = []) => {
        if (isFavorite) {
          return old.filter(f => f.favorite_user_id !== favoriteUserId);
        } else {
          const optimisticFav: UserFavorite = {
            id: `temp-${Date.now()}`,
            owner_user_id: currentUserId,
            favorite_user_id: favoriteUserId,
            created_at: new Date().toISOString(),
          };
          return [...old, optimisticFav];
        }
      });

      return { previousFavorites };
    },
    onError: (err, _variables, context) => {
      if (context?.previousFavorites && currentUserId) {
        queryClient.setQueryData([FAVORITES_QUERY_KEY, currentUserId], context.previousFavorites);
      }
      console.error('Failed to toggle favorite', err);
    },
    onSettled: () => {
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: [FAVORITES_QUERY_KEY, currentUserId] });
      }
    },
  });

  const isUserFavorited = (userId: string) => {
    return favorites.some(f => f.favorite_user_id === userId);
  };

  const toggleFavorite = (favoriteUserId: string) => {
    if (currentUserId === favoriteUserId) return;
    
    // Prevent duplicate inserts if not synced yet
    const isFav = isUserFavorited(favoriteUserId);
    toggleFavoriteMutation.mutate({ favoriteUserId, isFavorite: isFav });
  };

  return {
    favorites,
    isLoading,
    isUserFavorited,
    toggleFavorite,
    isToggling: toggleFavoriteMutation.isPending,
  };
}
