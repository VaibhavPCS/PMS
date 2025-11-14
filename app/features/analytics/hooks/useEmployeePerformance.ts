import { useEffect, useState } from 'react';
import api from '@/lib/axios';

export const useEmployeePerformance = (userId: string) => {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { period: 'daily' };
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      const { data } = await api.get(`/analytics/employee/${userId}/performance`, { params });
      setSnapshots(data.snapshots || []);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load performance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchData();
  }, [userId, dateRange.startDate, dateRange.endDate]);

  return { snapshots, loading, error, dateRange, setDateRange };
};

