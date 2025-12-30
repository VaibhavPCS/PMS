import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Target, Users, Clock, CheckCircle, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { fetchData } from '@/lib/fetch-util';

interface Task {
  _id: string;
  title: string;
  status: 'to-do' | 'in-progress' | 'on-hold' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  dueDate: string;
  approvalStatus?: 'not-required' | 'pending-approval' | 'approved' | 'rejected';
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
}

interface Sprint {
  _id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: 'Planning' | 'Active' | 'Completed' | 'Cancelled';
  durationDays: number;
  calendarDays: number;
  sundaysCount: number;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  creator: {
    _id: string;
    name: string;
    email: string;
  };
  project: {
    _id: string;
    title: string;
    status: string;
  };
}

interface SprintDetailsProps {
  sprintId: string;
  onBack: () => void;
  onEditSprint: (sprint: Sprint) => void;
  onDeleteSprint: (sprintId: string) => void;
  onCompleteSprint: (sprintId: string) => void;
  onViewTask: (taskId: string) => void;
}

export const SprintDetails: React.FC<SprintDetailsProps> = ({
  sprintId,
  onBack,
  onEditSprint,
  onDeleteSprint,
  onCompleteSprint,
  onViewTask
}) => {
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSprintDetails();
  }, [sprintId]);

  const fetchSprintDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchData<{ data: { sprint: Sprint; tasks: Task[] } }>(
        `/sprint/${sprintId}`
      );
      setSprint(data.data.sprint);
      setTasks(data.data.tasks || []);
    } catch (err) {
      console.error('Error fetching sprint details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sprint');
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
      case 'Planning':
        return 'bg-blue-100 text-blue-800';
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Completed':
        return 'bg-gray-100 text-gray-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
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

  const groupTasksByStatus = () => {
    return {
      'to-do': tasks.filter(t => t.status === 'to-do'),
      'in-progress': tasks.filter(t => t.status === 'in-progress'),
      'on-hold': tasks.filter(t => t.status === 'on-hold'),
      'done': tasks.filter(t => t.status === 'done')
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !sprint) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error || 'Sprint not found'}</p>
        <button
          onClick={onBack}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Go Back
        </button>
      </div>
    );
  }

  const taskGroups = groupTasksByStatus();

  const calculatePointsMetrics = () => {
    const maxPointsPerTask = 12;
    let currentPoints = 0;
    let completedTasksCount = 0;

    tasks.forEach((task) => {
      let points = 0;

      if (task.status === 'on-hold') {
        points = 3;
      } else if (task.approvalStatus === 'approved') {
        points = 12;
        completedTasksCount += 1;
      } else if (task.status === 'done') {
        points = 10;
        completedTasksCount += 1;
      } else if (task.status === 'in-progress') {
        points = 7;
      } else if (task.status === 'to-do') {
        points = 5;
      }

      currentPoints += points;
    });

    const totalTasks = tasks.length;
    const totalMaxPoints = totalTasks * maxPointsPerTask;
    const progress = totalMaxPoints > 0 ? Math.round((currentPoints / totalMaxPoints) * 100) : 0;

    return {
      totalTasks,
      completedTasks: completedTasksCount,
      progress
    };
  };

  const metrics = calculatePointsMetrics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Sprints
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => onEditSprint(sprint)}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>

          {sprint.status === 'Active' && (
            <button
              onClick={() => onCompleteSprint(sprint._id)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Complete Sprint
            </button>
          )}

          {sprint.totalTasks === 0 && (
            <button
              onClick={() => onDeleteSprint(sprint._id)}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Sprint Info Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{sprint.name}</h1>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sprint.status)}`}>
              {sprint.status}
            </span>
          </div>
        </div>

        {/* Goal */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase">Sprint Goal</h3>
          </div>
          <p className="text-gray-900">{sprint.goal}</p>
        </div>

        {/* Dates & Duration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Start Date</span>
            </div>
            <p className="text-gray-900">{formatDate(sprint.startDate)}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">End Date</span>
            </div>
            <p className="text-gray-900">{formatDate(sprint.endDate)}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Duration</span>
            </div>
            <p className="text-gray-900">
              {sprint.durationDays} working days<br />
              <span className="text-sm text-gray-600">
                ({sprint.calendarDays} calendar days, {sprint.sundaysCount} Sundays excluded)
              </span>
            </p>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-medium text-gray-900">
              {metrics.completedTasks}/{metrics.totalTasks} tasks completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${metrics.progress}%` }}
            ></div>
          </div>
          <span className="text-sm text-gray-600 mt-1 block">{metrics.progress}%</span>
        </div>
      </div>

      {/* Tasks Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Tasks ({tasks.length})
        </h2>

        {tasks.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks in this sprint</h3>
            <p className="text-gray-600">
              Create tasks and assign them to this sprint to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(taskGroups).map(([status, statusTasks]) => (
              <div key={status} className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3 flex items-center justify-between">
                  <span>{status.replace('-', ' ')}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(status)}`}>
                    {statusTasks.length}
                  </span>
                </h3>

                <div className="space-y-2">
                  {statusTasks.map((task) => (
                    <div
                      key={task._id}
                      onClick={() => onViewTask(task._id)}
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 flex-1">{task.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(task.startDate)} - {formatDate(task.dueDate)}
                        </div>

                        {task.assignee && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {task.assignee.name}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {statusTasks.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No tasks</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SprintDetails;
