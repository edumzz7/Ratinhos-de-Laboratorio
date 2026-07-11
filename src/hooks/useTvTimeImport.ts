import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importTvTimeLibrary } from '../lib/tvTimeImport';
import type { TVTimeImportFileRead } from '../lib/tvTimeImport';
import type { PersonalMovie, SeriesEntry } from '../types/app';

export function useTvTimeImport(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      csvInputs,
      existingMovies,
      existingSeries,
    }: {
      csvInputs: TVTimeImportFileRead['csvInputs'];
      existingMovies: PersonalMovie[];
      existingSeries: SeriesEntry[];
    }) => importTvTimeLibrary(userId as string, csvInputs, existingMovies, existingSeries),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['personal-movies', userId] }),
        queryClient.invalidateQueries({ queryKey: ['series', userId] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
      ]);
    },
  });
}
