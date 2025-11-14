import { useEffect, useState } from 'react';
import api from '@/lib/axios';

export const useEmployeeList = (initialFilters: any = {}) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>({ page: 1, limit: 50, total: 0, hasMore: false });
  const [sortConfig, setSortConfig] = useState<{ sortBy: string; order: 'asc' | 'desc' }>({ sortBy: 'metrics.productivityScore', order: 'desc' });
  const [filters, setFilters] = useState<any>({ workspaceId: '', search: '', ...initialFilters });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.page, limit: pagination.limit, sortBy: sortConfig.sortBy, order: sortConfig.order };
      if (filters.workspaceId) params.workspaceId = filters.workspaceId;
      const { data } = await api.get('/analytics/employees', { params });
      let list = data.employees || [];
      if (filters.search) list = list.filter((e: any) => (e.userName || '').toLowerCase().includes(filters.search.toLowerCase()));
      setEmployees(list);
      setPagination(data.pagination || pagination);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [pagination.page, pagination.limit, sortConfig.sortBy, sortConfig.order, filters.workspaceId, filters.search]);

  const handleSort = (field: string) => {
    setSortConfig(prev => ({ sortBy: field, order: prev.order === 'asc' ? 'desc' : 'asc' }));
  };
  const handlePageChange = (page: number) => setPagination((p: any) => ({ ...p, page }));
  const handleSearch = (query: string) => setFilters((f: any) => ({ ...f, search: query }));

  return { employees, loading, error, pagination, sortConfig, handleSort, handlePageChange, handleSearch };
};

