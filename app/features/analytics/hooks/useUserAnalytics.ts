import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/fetch-util'; // ✅ Use this, not a new axios import
import type { UserProductivityStats } from '../types';

interface UseUserAnalyticsOptions {
  enabled?: boolean;
}

export function useUserAnalytics(userId: string, options?: UseUserAnalyticsOptions) {
  return useQuery<UserProductivityStats>({
    queryKey: ['analytics', 'user', userId],
    queryFn: async () => {
      // ✅ FIX: Don't include /api-v1 because it's already in apiClient's baseURL
      const response = await apiClient.get<UserProductivityStats>(
        `/analytics/user/${userId}` // No /api-v1 prefix!
      );
      return response.data;
    },
    enabled: !!userId && (options?.enabled ?? true),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });
}
