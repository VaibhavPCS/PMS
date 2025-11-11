import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postData } from '@/lib/fetch-util';  // ✅ Change from fetchData to postData
import { toast } from 'sonner';

export const useManualRefresh = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // ✅ Use postData for POST request
      const response = await postData<{ message: string }>('/analytics/refresh', {});
      return response;
    },
    onSuccess: (data) => {
      toast.success('Analytics Refresh Initiated', {
        description: data.message || 'Data will be updated within a few minutes.',
      });

      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (error: any) => {
      toast.error('Refresh Failed', {
        description: error.message || 'Failed to trigger analytics refresh. Please try again.',
      });
    },
  });
};
