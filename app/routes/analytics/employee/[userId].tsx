import { useParams, useNavigate } from 'react-router';
import { useAuth } from '@/provider/auth-context';
import { Card } from '@/components/ui/card';
import EmployeePerformanceDashboard from '@/features/analytics/components/EmployeePerformanceDashboard';
import { useEmployeePerformance } from '@/features/analytics/hooks/useEmployeePerformance';
import {DateRangeFilter} from '@/features/analytics/components/DateRangeFilter';

export default function EmployeePerformanceRoute() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { snapshots, loading, error, dateRange, setDateRange } = useEmployeePerformance(userId || '');

  const isAdmin = ['admin', 'super_admin'].includes(user?.role || '');
  if (!isAdmin) {
    return (
      <div className="p-4">
        <Card className="p-6">Forbidden</Card>
      </div>
    );
  }

  const userName = user?.name || user?.email || '';
  const userRole = user?.role || '';

  return (
    <div className="p-4 space-y-6">
      <DateRangeFilter onChange={(range: any) => setDateRange({ startDate: range?.startDate, endDate: range?.endDate })} />
      {loading && (<Card className="p-4">Loading...</Card>)}
      {error && (<Card className="p-4 text-red-600">{error}</Card>)}
      {!loading && !error && (
        <EmployeePerformanceDashboard userId={userId || ''} userName={userName} userRole={userRole} snapshots={snapshots} />
      )}
    </div>
  );
}

