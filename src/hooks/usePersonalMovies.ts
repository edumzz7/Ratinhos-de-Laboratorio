import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addPersonalMovie,
  deletePersonalMovie,
  listPersonalMovies,
  updatePersonalMovie,
} from '../lib/appData';
import type { PersonalMovie, MovieStatus } from '../types/app';

export function usePersonalMovieMutations(userId: string | null) {
  const queryClient = useQueryClient();

  const addMovieMutation = useMutation({
    mutationFn: (movie: Omit<PersonalMovie, 'id' | 'user_id' | 'created_at'>) =>
      addPersonalMovie(userId as string, movie),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.setQueryData(['personal-movies', userId], (old: PersonalMovie[] = []) => [data, ...old]);
      } else {
        void queryClient.invalidateQueries({ queryKey: ['personal-movies', userId] });
      }
      if (variables.status === 'watched' && !variables.is_retroactive) {
        void queryClient.invalidateQueries({ queryKey: ['users'] });
        void queryClient.invalidateQueries({ queryKey: ['group-scores'] });
        void queryClient.invalidateQueries({ queryKey: ['group-goal-progress'] });
      }
    },
  });

  const updatePlatformMutation = useMutation({
    mutationFn: ({ id, platform }: { id: string; platform: string }) =>
      updatePersonalMovie(id, { plataforma_slug: platform }),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.setQueryData(['personal-movies', userId], (old: PersonalMovie[] = []) =>
          old.map((m) => (m.id === variables.id ? { ...m, ...data } : m))
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: ['personal-movies', userId] });
      }
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MovieStatus }) =>
      updatePersonalMovie(id, { status }),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.setQueryData(['personal-movies', userId], (old: PersonalMovie[] = []) =>
          old.map((m) => (m.id === variables.id ? { ...m, ...data } : m))
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: ['personal-movies', userId] });
      }
      if (variables.status === 'watched') {
        void queryClient.invalidateQueries({ queryKey: ['users'] });
        void queryClient.invalidateQueries({ queryKey: ['group-scores'] });
        void queryClient.invalidateQueries({ queryKey: ['group-goal-progress'] });
      }
    },
  });

  const deleteMovieMutation = useMutation({
    mutationFn: deletePersonalMovie,
    onSuccess: (_data, deletedId) => {
      queryClient.setQueryData(['personal-movies', userId], (old: PersonalMovie[] = []) =>
        old.filter((m) => m.id !== deletedId)
      );
    },
  });

  return {
    addMovieMutation,
    updatePlatformMutation,
    updateStatusMutation,
    deleteMovieMutation,
  };
}

export function usePersonalMoviesQuery(userId: string | null) {
  return useQuery({
    queryKey: ['personal-movies', userId],
    queryFn: () => listPersonalMovies(userId as string),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  });
}

export function usePersonalMovies(userId: string | null) {
  const moviesQuery = usePersonalMoviesQuery(userId);
  const mutations = usePersonalMovieMutations(userId);

  return {
    moviesQuery,
    ...mutations,
  };
}
