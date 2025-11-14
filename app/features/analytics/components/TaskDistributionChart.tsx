import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function TaskDistributionChart({ metrics }: { metrics: any }) {
  const data = [
    { name: 'To-Do', value: metrics?.todo || 0, fill: '#94a3b8' },
    { name: 'In Progress', value: metrics?.inProgress || 0, fill: '#3b82f6' },
    { name: 'Completed', value: metrics?.completed || 0, fill: '#10b981' },
  ];
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

