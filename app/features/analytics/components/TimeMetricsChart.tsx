import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function TimeMetricsChart({ snapshots }: { snapshots: any[] }) {
  const data = (snapshots || []).map(s => ({ date: new Date(s.snapshotDate).toLocaleDateString(), avgDays: s.metrics?.avgTimeToComplete || 0 }));
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" label={{ value: 'Date', position: 'insideBottom', offset: -5 }} />
          <YAxis label={{ value: 'Avg Time to Complete (days)', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(val) => [val as number, 'Avg Time to Complete (days)']} />
          <Legend />
          <Line type="monotone" dataKey="avgDays" name="Avg Time to Complete (days)" stroke="#3b82f6" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

