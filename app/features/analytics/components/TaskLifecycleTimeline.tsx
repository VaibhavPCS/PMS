import { useTaskLifecycle } from '../hooks/useTaskLifecycle';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Separator } from '../../../components/ui/separator';
import { Button } from '../../../components/ui/button';
import { Activity, Calendar, Check, Play, RefreshCw, Send, ThumbsUp, UserPlus, X, Plus } from 'lucide-react';
import { useMemo } from 'react';

type Props = { taskId: string };

const eventIcons: Record<string, any> = {
  created: Plus,
  assigned: UserPlus,
  reassigned: RefreshCw,
  started: Play,
  completed: Check,
  submitted_for_approval: Send,
  approved: ThumbsUp,
  rejected: X,
  reopened: Activity,
  status_changed: Activity,
  due_date_changed: Calendar,
  priority_changed: Activity
};

const colorClass = (t: string) => {
  if (t === 'approved') return 'text-green-600 bg-green-50';
  if (t === 'rejected') return 'text-red-600 bg-red-50';
  return 'text-blue-600 bg-blue-50';
};

const formatTs = (ts: string) => new Date(ts).toLocaleString();
const titleMap: Record<string, string> = {
  created: 'Created',
  assigned: 'Assigned',
  reassigned: 'Reassigned',
  started: 'Started',
  completed: 'Completed',
  submitted_for_approval: 'Submitted for Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  reopened: 'Reopened',
  status_changed: 'Status Changed',
  due_date_changed: 'Due Date Changed',
  priority_changed: 'Priority Changed'
};

export default function TaskLifecycleTimeline({ taskId }: Props) {
  const { timeline, metrics, pagination, loading, error, loadMore } = useTaskLifecycle(taskId);
  const summary = useMemo(() => metrics, [metrics]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex gap-4">
          <Badge variant="outline">Total: {summary?.totalDuration ?? 0}h</Badge>
          <Badge variant="outline">Working: {summary?.workingDuration ?? 0}h</Badge>
          <Badge variant="outline">Rejections: {summary?.rejectionCount ?? 0}</Badge>
          <Badge variant="outline">Approvals: {summary?.approvalAttempts ?? 0}</Badge>
          <Badge variant="outline">Reassignments: {summary?.reassignments ?? 0}</Badge>
        </div>
      </Card>

      {loading && (
        <Card className="p-4">Loading...</Card>
      )}
      {error && (
        <Card className="p-4 text-red-600">{error}</Card>
      )}

      {!loading && !error && timeline.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">No lifecycle events found</Card>
      )}

      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 border-l-2 border-gray-200"></div>
        <div className="space-y-4">
          {timeline.map((ev, idx) => {
            const Icon = eventIcons[ev.eventType] || Activity;
            return (
              <div key={idx} className="flex gap-4 items-start">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass(ev.eventType)} relative z-10`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{titleMap[ev.eventType] || ev.eventType}</h4>
                    <span className="text-sm text-muted-foreground">{formatTs(ev.timestamp)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">by {ev.actor?.name || ev.actor?.email || ev.actor?._id}</p>
                  <Separator className="my-2" />
                  <div className="text-sm">
                    {ev.changes?.field && (
                      <div>Changed: {ev.changes.field}</div>
                    )}
                    {ev.metadata && (
                      <details className="mt-2">
                        <summary className="cursor-pointer">View details</summary>
                        <pre className="mt-2 bg-muted p-2 rounded text-xs overflow-auto">{JSON.stringify(ev.metadata, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {pagination?.hasMore && (
        <Button variant="outline" onClick={loadMore} disabled={loading}>Load More Events</Button>
      )}
    </div>
  );
}

