import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown } from 'lucide-react';

export interface Employee {
  userId: string;
  userName?: string;
  latestMetrics?: {
    projects?: unknown[];
    completed?: number;
    approvalRate?: number;
    productivityScore?: number;
  };
}

export type SortDirection = 'asc' | 'desc';
export type SortKey =
  | 'userName'
  | 'latestMetrics.completed'
  | 'latestMetrics.approvalRate'
  | 'latestMetrics.productivityScore';

export interface SortConfig {
  field: SortKey;
  direction: SortDirection;
}

const perfBadge = (score: number) => {
  if (score >= 80) return <Badge className="bg-green-100 text-green-700">Excellent</Badge>;
  if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-700">Good</Badge>;
  return <Badge className="bg-red-100 text-red-700">Needs Improvement</Badge>;
};

export default function EmployeeListTable({ employees, sortConfig, onSort, onRowClick }: { employees: Employee[]; sortConfig: SortConfig; onSort: (f: SortKey) => void; onRowClick: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <thead>
          <tr>
            <th
              className="p-2 text-left cursor-pointer"
              onClick={() => onSort('userName')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSort('userName'); }}
              aria-sort={sortConfig.field === 'userName' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <span className="inline-flex items-center gap-1">
                Name
                {sortConfig.field === 'userName' && (sortConfig.direction === 'asc' ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                ))}
              </span>
            </th>
            <th className="p-2 text-left">Active Projects</th>
            <th
              className="p-2 text-left cursor-pointer"
              onClick={() => onSort('latestMetrics.completed')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSort('latestMetrics.completed'); }}
              aria-sort={sortConfig.field === 'latestMetrics.completed' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <span className="inline-flex items-center gap-1">
                Tasks Completed
                {sortConfig.field === 'latestMetrics.completed' && (sortConfig.direction === 'asc' ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                ))}
              </span>
            </th>
            <th
              className="p-2 text-left cursor-pointer"
              onClick={() => onSort('latestMetrics.approvalRate')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSort('latestMetrics.approvalRate'); }}
              aria-sort={sortConfig.field === 'latestMetrics.approvalRate' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <span className="inline-flex items-center gap-1">
                Approval Rate
                {sortConfig.field === 'latestMetrics.approvalRate' && (sortConfig.direction === 'asc' ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                ))}
              </span>
            </th>
            <th
              className="p-2 text-left cursor-pointer"
              onClick={() => onSort('latestMetrics.productivityScore')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSort('latestMetrics.productivityScore'); }}
              aria-sort={sortConfig.field === 'latestMetrics.productivityScore' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <span className="inline-flex items-center gap-1">
                Productivity
                {sortConfig.field === 'latestMetrics.productivityScore' && (sortConfig.direction === 'asc' ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                ))}
              </span>
            </th>
            <th className="p-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr key={String(e.userId)} className="cursor-pointer" onClick={() => onRowClick(e.userId)}>
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

