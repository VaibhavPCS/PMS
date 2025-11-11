import { useQuery } from '@tanstack/react-query';
import { fetchData } from '@/lib/fetch-util';
import type { LeaderboardResponse, ApiError } from '../types';

export const useLeaderboardAnalytics = () => {
  return useQuery<LeaderboardResponse, ApiError>({
    queryKey: ['analytics', 'leaderboard'],
    queryFn: async () => {
      const response = await fetchData<LeaderboardResponse>('/analytics/leaderboard');
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
