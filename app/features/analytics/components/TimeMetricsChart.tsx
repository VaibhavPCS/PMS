import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function TimeMetricsChart({ snapshots }: { snapshots: any[] }) {
  const data = (snapshots || []).map(s => ({ date: new Date(s.snapshotDate).toLocaleDateString(), value: s.metrics?.avgTimeToComplete || 0 }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

