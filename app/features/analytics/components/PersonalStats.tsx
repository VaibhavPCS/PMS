// frontend/app/features/analytics/components/PersonalStats.tsx

import { useUserAnalytics } from '../hooks/useUserAnalytics';
import { useAuth } from '@/provider/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  CheckCircle2, 
  Clock, 
  ListTodo,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

export function PersonalStats() {
  const { user, isLoading: authLoading } = useAuth();
  
  // Extract user ID - handle both _id and id fields
  const userId = user?._id || (user as any)?.id;
  
  console.log('PersonalStats - Full User Object:', JSON.stringify(user, null, 2));
  console.log('PersonalStats - Extracted userId:', userId);
  
  const { data, isLoading: queryLoading, isError, error } = useUserAnalytics(
    userId || '', 
    { enabled: !!userId }
  );

  // Combined loading state
  if (authLoading || queryLoading) {
    return (
      <div className="w-full space-y-4">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600">
                {authLoading ? 'Loading authentication...' : 'Loading your productivity stats...'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="w-full space-y-4">
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p className="font-medium">Unable to load user information</p>
            </div>
            <p className="text-sm text-red-500 mt-2">
              User ID not found. Please try logging out and logging back in.
            </p>
            <details className="mt-3">
              <summary className="text-xs cursor-pointer">Debug Info (click to expand)</summary>
              <pre className="mt-2 text-xs overflow-auto bg-white p-2 rounded">
                {JSON.stringify(user, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full space-y-4">
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p className="font-medium">Failed to load productivity stats</p>
            </div>
            <p className="text-sm text-red-500 mt-2">
              {error?.message || 'An unexpected error occurred'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  console.log('PersonalStats - API Data:', data);

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Personal Productivity</h2>
        <p className="text-sm text-gray-600 mt-1">
          Track your task progress and upcoming deadlines
        </p>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Open Tasks Card */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <ListTodo className="w-4 h-4 mr-2" />
              Open Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {data?.openTaskCount ?? 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Active tasks assigned to you
            </p>
          </CardContent>
        </Card>

        {/* Tasks Due Soon Card */}
        <Card className="border border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Due in Next 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {data?.tasksDueNext7Days?.length ?? 0}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Tasks requiring attention soon
            </p>
          </CardContent>
        </Card>

        {/* Completed Tasks Card */}
        <Card className="border border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Completed (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {data?.tasksCompletedLast7Days ?? 0}
            </div>
            <p className="text-xs text-green-600 mt-1">
              Tasks finished recently
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks List */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Tasks Due in Next 7 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.tasksDueNext7Days || data.tasksDueNext7Days.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No tasks due in the next 7 days</p>
              <p className="text-sm text-gray-400 mt-1">
                You're all caught up! Great job 🎉
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.tasksDueNext7Days.map((task, index) => (
                <div key={task._id}>
                  <div className="flex items-start justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {task.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="outline" className={getPriorityColor(task.priority)}>
                          {task.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                          {task.status}
                        </Badge>
                        {task.projectTitle && (
                          <span className="text-gray-500 text-xs">
                            📁 {task.projectTitle}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 text-right flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900">
                        {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {format(new Date(task.dueDate), 'EEEE')}
                      </div>
                    </div>
                  </div>
                  {index < data.tasksDueNext7Days.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
