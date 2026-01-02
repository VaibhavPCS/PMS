import React, { useState, useEffect } from 'react';
import { Package, Calendar, Users, AlertCircle } from 'lucide-react';

interface Task {
  _id: string;
  title: string;
  status: 'to-do' | 'in-progress' | 'on-hold' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  dueDate: string;
  assignee?: {
    _id: string;
    name: string;
    email: string;
  };
  creator: {
    _id: string;
    name: string;
    email: string;
  };
  isRecurring: boolean;
}

interface BacklogViewProps {
  projectId: string;
  onViewTask: (taskId: string) => void;
  onAssignToSprint: (taskId: string) => void;
}

export const BacklogView: React.FC<BacklogViewProps> = ({
  projectId,
  onViewTask,
  onAssignToSprint
}) => {
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBacklogTasks();
  }, [projectId]);

  const fetchBacklogTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');

      // Fetch all tasks for the project
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api-v1/task/${projectId}/tasks`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();

      // Filter tasks without sprint assignment (backlog)
      const backlog = (data.data || []).filter((task: Task) => !task.sprint);
      setBacklogTasks(backlog);
    } catch (err) {
      console.error('Error fetching backlog tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load backlog');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'to-do':
        return 'bg-gray-100 text-gray-700';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-700';
      case 'done':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchBacklogTasks}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-gray-700" />
          <h2 className="text-2xl font-bold text-gray-900">Product Backlog</h2>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
            {backlogTasks.length} tasks
          </span>
        </div>
      </div>

      {/* Info Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">What is the Product Backlog?</p>
            <p className="mt-1">
              The product backlog contains tasks that haven't been assigned to any sprint yet.
              You can plan your sprints by moving tasks from the backlog into specific sprints.
              Recurring tasks typically stay in the backlog as they span the entire project.
            </p>
          </div>
        </div>
      </div>

      {/* Task List */}
      {backlogTasks.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Backlog is empty</h3>
          <p className="text-gray-600">
            All tasks have been assigned to sprints. Create new tasks to add them to the backlog.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {backlogTasks.map((task) => (
            <div
              key={task._id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Task Info */}
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => onViewTask(task._id)}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{task.title}</h3>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>

                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>

                        {task.isRecurring && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            Recurring
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(task.startDate)} - {formatDate(task.dueDate)}</span>
                    </div>

                    {task.assignee && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{task.assignee.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!task.isRecurring && (
                  <button
                    onClick={() => onAssignToSprint(task._id)}
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Assign to Sprint
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BacklogView;
