import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const perfBadge = (score: number) => {
  if (score >= 80) return <Badge className="bg-green-100 text-green-700">Excellent</Badge>;
  if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-700">Good</Badge>;
  return <Badge className="bg-red-100 text-red-700">Needs Improvement</Badge>;
};

export default function EmployeeListTable({ employees, sortConfig, onSort, onRowClick }: { employees: any[]; sortConfig: any; onSort: (f: string) => void; onRowClick: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <thead>
          <tr>
            <th className="p-2 text-left cursor-pointer" onClick={() => onSort('userName')}>Name</th>
            <th className="p-2 text-left">Active Projects</th>
            <th className="p-2 text-left cursor-pointer" onClick={() => onSort('metrics.completed')}>Tasks Completed</th>
            <th className="p-2 text-left cursor-pointer" onClick={() => onSort('metrics.approvalRate')}>Approval Rate</th>
            <th className="p-2 text-left cursor-pointer" onClick={() => onSort('metrics.productivityScore')}>Productivity</th>
            <th className="p-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e, i) => (
            <tr key={i} className="cursor-pointer" onClick={() => onRowClick(e.userId)}>
              <td className="p-2">{e.userName || e.userId}</td>
              <td className="p-2">{(e.latestMetrics?.projects || []).length}</td>
              <td className="p-2">{e.latestMetrics?.completed || 0}</td>
              <td className="p-2">{Math.round(e.latestMetrics?.approvalRate || 0)}% {perfBadge(Math.round(e.latestMetrics?.approvalRate || 0))}</td>
              <td className="p-2">{Math.round(e.latestMetrics?.productivityScore || 0)} {perfBadge(Math.round(e.latestMetrics?.productivityScore || 0))}</td>
              <td className="p-2">Active</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

