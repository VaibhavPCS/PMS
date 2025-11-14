import { useEffect, useState } from 'react';
import api from '@/lib/axios';

export interface TimelineEvent {
  eventType: string;
  actor: { _id: string; name?: string; email?: string };
  timestamp: string;
  changes?: { field?: string; oldValue?: any; newValue?: any };
  metadata?: Record<string, any>;
}

export interface LifecycleResponse {
  taskId: string;
  taskTitle: string;
  timeline: TimelineEvent[];
  metrics: {
    totalDuration: number;
    workingDuration: number;
    rejectionCount: number;
    approvalAttempts: number;
    reassignments: number;
  };
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
}

export const useTaskLifecycle = (taskId: string) => {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [metrics, setMetrics] = useState<LifecycleResponse['metrics'] | null>(null);
  const [pagination, setPagination] = useState<LifecycleResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = async (page = 1, limit = 50) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/analytics/task/${taskId}/lifecycle`, { params: { page, limit } });
      setMetrics(data.metrics);
      setPagination(data.pagination);
      if (page === 1) setTimeline(data.timeline || []);
      else setTimeline(prev => [...prev, ...(data.timeline || [])]);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load lifecycle');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!taskId) return;
    fetchPage(1, 50);
  }, [taskId]);

  const loadMore = async () => {
    if (!pagination?.hasMore) return;
    const nextPage = (pagination?.page || 1) + 1;
    await fetchPage(nextPage, pagination?.limit || 50);
  };

  return { timeline, metrics, pagination, loading, error, loadMore };
};

