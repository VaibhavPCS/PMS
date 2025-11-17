import { Card } from '@/components/ui/card';

export default function MetricsCards({ metrics }: { metrics: any }) {
  const total = Number(metrics?.total || 0);
  const completed = Number(metrics?.completed || 0);
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const approvalPct = Math.round(Number(metrics?.approvalRate || 0));
  const productivityPts = Math.round(Number(metrics?.productivityScore || 0));

  const items = [
    { label: 'Total Tasks', value: total.toLocaleString(), suffix: '' },
    { label: 'Completion %', value: completionPct.toLocaleString(), suffix: '%' },
    { label: 'Approval Rate', value: approvalPct.toLocaleString(), suffix: '%' },
    { label: 'Productivity', value: productivityPts.toLocaleString(), suffix: ' pts' }
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it, idx) => (
        <Card key={idx} className="p-4">
          <div className="text-sm text-muted-foreground">{it.label}</div>
          <div className="text-2xl font-bold">{it.value}{it.suffix}</div>
        </Card>
      ))}
    </div>
  );
}

