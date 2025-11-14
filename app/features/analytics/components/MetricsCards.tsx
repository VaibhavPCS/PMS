import { Card } from '@/components/ui/card';

export default function MetricsCards({ metrics }: { metrics: any }) {
  const items = [
    { label: 'Total Tasks', value: metrics?.total || 0 },
    { label: 'Completion %', value: metrics?.total ? Math.round((metrics.completed || 0) / metrics.total * 100) : 0 },
    { label: 'Approval Rate', value: Math.round((metrics?.approvalRate || 0)) },
    { label: 'Productivity', value: Math.round((metrics?.productivityScore || 0)) }
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it, idx) => (
        <Card key={idx} className="p-4">
          <div className="text-sm text-muted-foreground">{it.label}</div>
          <div className="text-2xl font-bold">{it.value}</div>
        </Card>
      ))}
    </div>
  );
}

