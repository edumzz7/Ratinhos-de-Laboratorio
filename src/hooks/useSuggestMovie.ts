import { useMutation, useQueryClient } from '@tanstack/react-query';
import { suggestMovieToUser } from '../lib/appData';
import type { PersonalMovie } from '../types/app';

export function useSuggestMovie() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fromUserId,
      toUserId,
      movie,
      mediaType,
    }: {
      fromUserId: string;
      toUserId: string;
      movie: Omit<PersonalMovie, 'id' | 'user_id' | 'created_at'>;
      mediaType: 'movie' | 'tv';
    }) => suggestMovieToUser(fromUserId, toUserId, movie, mediaType),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      if (variables.toUserId === variables.fromUserId) {
        void queryClient.invalidateQueries({ queryKey: ['notifications', variables.fromUserId] });
      }
    },
  });
}
