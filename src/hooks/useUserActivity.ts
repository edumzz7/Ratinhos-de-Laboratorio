import { useQuery } from '@tanstack/react-query';
import { listUserActivity } from '../lib/appData';

export function useUserActivity(userIds: string[] | null) {
  return useQuery({
    queryKey: ['user-activity', userIds?.join(',')],
    queryFn: () => listUserActivity(userIds as string[], 20),
    enabled: Boolean(userIds && userIds.length > 0),
    staleTime: 30_000,
  });
}
