import { useEffect, useState } from 'react';
import { fetchData } from '@/lib/fetch-util';

export const useProjectApprovalMetrics = (projectId: string, dateRange?: { startDate?: string; endDate?: string }) => {
  const [approvalRate, setApprovalRate] = useState(0);
  const [tasksByRejection, setTasksByRejection] = useState<any[]>([]);
  const [topRejectedTasks, setTopRejectedTasks] = useState<any[]>([]);
  const [highRejectionMembers, setHighRejectionMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await fetchData(`/task/project/${projectId}`);
      const tasks = resp.tasks || [];
      const approved = tasks.filter((t: any) => t.approvalStatus === 'approved').length;
      const rejected = tasks.filter((t: any) => t.approvalStatus === 'rejected').length;
      const pending = tasks.filter((t: any) => t.approvalStatus === 'pending-approval').length;
      const rate = (approved + rejected) > 0 ? Math.round((approved / (approved + rejected)) * 100) : 0;
      setApprovalRate(rate);
      const rejectionCounts = tasks.map((t: any) => ({ id: t._id, title: t.title, assignee: t.assignee?.name || t.assignee?.email || '', count: (t.rejections || []).length }));
      const dist = [
        { name: '0', value: rejectionCounts.filter((r: any) => r.count === 0).length },
        { name: '1', value: rejectionCounts.filter((r: any) => r.count === 1).length },
        { name: '2+', value: rejectionCounts.filter((r: any) => r.count >= 2).length },
      ];
      setTasksByRejection(dist);
      const top = rejectionCounts.sort((a: any, b: any) => b.count - a.count).slice(0, 5);
      setTopRejectedTasks(top);
      const memberCounts: Record<string, number> = {};
      rejectionCounts.forEach((r: any) => { if (r.assignee) memberCounts[r.assignee] = (memberCounts[r.assignee] || 0) + r.count; });
      setHighRejectionMembers(Object.entries(memberCounts).filter(([, c]) => c >= 2).map(([name]) => name));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load approval metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (projectId) load(); }, [projectId, dateRange?.startDate, dateRange?.endDate]);

  return { approvalRate, tasksByRejection, topRejectedTasks, highRejectionMembers, loading, error };
};
