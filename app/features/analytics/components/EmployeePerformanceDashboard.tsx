import EmployeePerformanceHeader from '@/features/analytics/components/EmployeePerformanceDashboard';
import MetricsCards from '@/features/analytics/components/MetricsCards';
import TaskDistributionChart from '@/features/analytics/components/TaskDistributionChart';
import ApprovalMetricsChart from '@/features/analytics/components/ApprovalMetricsChart';
import TimeMetricsChart from '@/features/analytics/components/TimeMetricsChart';
import ProjectInvolvementTable from '@/features/analytics/components/ProjectInvolvementTable';
import { Card } from '@/components/ui/card';

export default function EmployeePerformanceDashboard({ userId, userName, userRole, snapshots }: { userId: string; userName: string; userRole: string; snapshots: any[] }) {
  const latest = snapshots?.[0] || { metrics: {}, projects: [], trends: {} };
  return (
    <div className="space-y-6">
      <EmployeePerformanceHeader userId={userId} userName={userName} userRole={userRole} snapshots={snapshots} />
      <MetricsCards metrics={latest.metrics} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4"><TaskDistributionChart metrics={latest.metrics} /></Card>
        <Card className="p-4"><ApprovalMetricsChart metrics={latest.metrics} /></Card>
      </div>
      <Card className="p-4"><TimeMetricsChart snapshots={snapshots} /></Card>
      <Card className="p-4"><ProjectInvolvementTable projects={latest.projects} /></Card>
    </div>
  );
}

