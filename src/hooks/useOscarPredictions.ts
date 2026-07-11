import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOscarPredictionsForUser, saveOscarPrediction } from '../lib/appData';

export function useOscarPredictions(userId: string | null) {
  const queryClient = useQueryClient();

  const predictionsQuery = useQuery({
    queryKey: ['oscar-predictions', userId],
    queryFn: () => getOscarPredictionsForUser(userId as string),
    enabled: Boolean(userId),
  });

  const savePredictionMutation = useMutation({
    mutationFn: ({
      category,
      tmdbId,
      title,
      posterPath,
    }: {
      category: string;
      tmdbId: string;
      title: string;
      posterPath: string;
    }) => saveOscarPrediction(userId as string, category, tmdbId, title, posterPath),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['oscar-predictions', userId] });
    },
  });

  return {
    predictionsQuery,
    savePredictionMutation,
  };
}
