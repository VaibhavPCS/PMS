import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from 'recharts';

export default function ApprovalMetricsChart({ metrics }: { metrics: any }) {
  const data = [
    { name: 'Approved', value: metrics?.approved || 0, fill: '#10b981' },
    { name: 'Rejected', value: metrics?.rejected || 0, fill: '#ef4444' },
    { name: 'Pending', value: metrics?.pendingApproval || 0, fill: '#f59e0b' },
  ];
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" label={{ value: 'Status', position: 'insideBottom', offset: -5 }} />
          <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(val) => [val as number, 'Count']} />
          <Legend />
          <Bar dataKey="value">
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

