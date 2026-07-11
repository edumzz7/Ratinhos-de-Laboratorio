import { useMutation } from '@tanstack/react-query';
import { getCineMatchSuggestion } from '../lib/appData';
import type { CineMatchMode } from '../types/app';

export function useCineMatch() {
  return useMutation({
    mutationFn: ({
      currentUserId,
      friendUserId,
      mode,
    }: {
      currentUserId: string;
      friendUserId: string;
      mode: CineMatchMode;
    }) => getCineMatchSuggestion(currentUserId, friendUserId, mode),
  });
}
