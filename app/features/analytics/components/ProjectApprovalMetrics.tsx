import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useProjectApprovalMetrics } from '@/features/analytics/hooks/useProjectApprovalMetrics';
import { DateRangeFilter } from '@/features/analytics/components/DateRangeFilter';

export default function ProjectApprovalMetrics({ projectId }: { projectId: string }) {
  const [dateRange, setDateRange] = useState<any>({});
  const { approvalRate, tasksByRejection, topRejectedTasks, highRejectionMembers, loading, error } = useProjectApprovalMetrics(projectId, dateRange);

  return (
    // <Card className="p-4 space-y-4">
    //   <h3 className="text-lg font-semibold">Task Approval Metrics</h3>
    //   {/* <DateRangeFilter onChange={(range: any) => setDateRange({ startDate: range?.startDate, endDate: range?.endDate })} /> */}
    //   {loading && (<div>Loading...</div>)}
    //   {error && (<div className="text-red-600">{error}</div>)}
    //   {!loading && !error && (
    //     <>
    //       <div>
    //         <Label>Approval Rate</Label>
    //         <Progress value={approvalRate} />
    //         <span>{approvalRate}%</span>
    //       </div>
    //       <div className="h-64">
    //         <ResponsiveContainer width="100%" height="100%">
    //           <BarChart data={tasksByRejection}>
    //             <XAxis dataKey="name" />
    //             <YAxis />
    //             <Tooltip />
    //             <Bar dataKey="value" fill="#3b82f6" />
    //           </BarChart>
    //         </ResponsiveContainer>
    //       </div>
    //       <div className="overflow-x-auto">
    //         <table className="w-full text-sm">
    //           <thead>
    //             <tr>
    //               <th className="text-left p-2">Task</th>
    //               <th className="text-left p-2">Rejections</th>
    //               <th className="text-left p-2">Assignee</th>
    //             </tr>
    //           </thead>
    //           <tbody>
    //             {topRejectedTasks.map((t, i) => (
    //               <tr key={i} className={t.count >= 2 ? 'bg-red-50' : ''}>
    //                 <td className="p-2">{t.title}</td>
    //                 <td className="p-2">{t.count}</td>
    //                 <td className="p-2">{t.assignee}</td>
    //               </tr>
    //             ))}
    //           </tbody>
    //         </table>
    //       </div>
    //       {highRejectionMembers.length > 0 && (
    //         <div className="p-3 bg-yellow-50 text-yellow-700 rounded">Quality concerns: {highRejectionMembers.join(', ')} have high rejection rates.</div>
    //       )}
    //     </>
    //   )}
    // </Card>
    <div>
      
    </div>
  );
}

