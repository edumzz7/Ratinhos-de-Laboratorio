import { useQuery } from '@tanstack/react-query';
import { listNotifications } from '../lib/appData';

export function useNotifications(userId: string | null) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => listNotifications(userId as string, 20),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}
