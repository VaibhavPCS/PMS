import { useQuery } from '@tanstack/react-query';
import { fetchData } from '@/lib/fetch-util';
import type { ProjectAnalyticsResponse, ProjectAnalyticsParams, ApiError } from '../types';

export const useProjectAnalytics = ({ 
  projectId, 
  startDate, 
  endDate 
}: ProjectAnalyticsParams) => {
  return useQuery<ProjectAnalyticsResponse, ApiError>({
    queryKey: ['analytics', 'project', projectId, startDate, endDate],
    queryFn: async () => {
      let url = `/analytics/project/${projectId}`;
      const params = new URLSearchParams();
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      const response = await fetchData<ProjectAnalyticsResponse>(url);
      return response;
    },
    enabled: !!projectId, // Only fetch if projectId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
