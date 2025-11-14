import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value">
            {data.map((entry, index) => (
              <Bar key={index} dataKey="value" fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

