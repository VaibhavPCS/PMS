import { useQuery } from '@tanstack/react-query';
import { fetchData } from '@/lib/fetch-util';
import type { WorkspaceSummary, ApiError } from '../types';

export const useWorkspaceAnalytics = (workspaceId: string) => {
  return useQuery<WorkspaceSummary, ApiError>({
    queryKey: ['analytics', 'workspace', workspaceId],
    queryFn: async () => {
      const response = await fetchData<WorkspaceSummary>(`/analytics/workspace/${workspaceId}`);
      return response;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // ✅ 5 minutes as per acceptance criteria
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
