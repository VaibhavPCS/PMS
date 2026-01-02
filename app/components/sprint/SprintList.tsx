import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Target, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { fetchData } from '@/lib/fetch-util';

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
  createdAt: string;
  updatedAt: string;
}

interface SprintListProps {
  projectId: string;
  onCreateSprint: () => void;
  onEditSprint: (sprint: Sprint) => void;
  onDeleteSprint: (sprintId: string) => void;
  onCompleteSprint: (sprintId: string) => void;
  onViewSprintDetails: (sprintId: string) => void;
}

export const SprintList: React.FC<SprintListProps> = ({
  projectId,
  onCreateSprint,
  onEditSprint,
  onDeleteSprint,
  onCompleteSprint,
  onViewSprintDetails
}) => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchSprints();
  }, [projectId, statusFilter]);

  const fetchSprints = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = statusFilter !== 'all' ? `?status=${statusFilter}` : '';

      const data = await fetchData<{ data?: Sprint[] }>(`/sprint/project/${projectId}${queryParams}`);
      const sprintsList = data.data || [];

      console.log('Fetched sprints with calculated stats:', sprintsList);

      setSprints(sprintsList);
    } catch (err) {
      console.error('Error fetching sprints:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sprints');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Sprint['status']) => {
    switch (status) {
      case 'Planning':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Completed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: Sprint['status']) => {
    switch (status) {
      case 'Planning':
        return <Clock className="w-4 h-4" />;
      case 'Active':
        return <Users className="w-4 h-4" />;
      case 'Completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'Cancelled':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
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

  const calculateDaysRemaining = (endDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
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
          onClick={fetchSprints}
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Sprints</h2>
        {/* <button
          onClick={onCreateSprint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Sprint
        </button> */}
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'Planning', 'Active', 'Completed', 'Cancelled'].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 sm:flex-none ${
              statusFilter === filter
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter === 'all' ? 'All Sprints' : filter}
          </button>
        ))}
      </div>

      {/* Sprint List */}
      {sprints.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No sprints found</h3>
          <p className="text-gray-600 mb-4">
            {statusFilter === 'all'
              ? 'Create your first sprint to get started with sprint-based project management.'
              : `No sprints with status "${statusFilter}".`}
          </p>
          <button
            onClick={onCreateSprint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create First Sprint
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sprints.map((sprint) => {
            const daysRemaining = calculateDaysRemaining(sprint.endDate);

            return (
              <div
                key={sprint._id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onViewSprintDetails(sprint._id)}
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      sprint.status
                    )}`}
                  >
                    {getStatusIcon(sprint.status)}
                    {sprint.status}
                  </span>

                  {sprint.status === 'Active' && daysRemaining >= 0 && (
                    <span className="text-xs text-gray-600 font-medium">
                      {daysRemaining} days left
                    </span>
                  )}
                </div>

                {/* Sprint Name */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {sprint.name}
                </h3>

                {/* Sprint Goal */}
                <div className="flex items-start gap-2 mb-3">
                  <Target className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600 line-clamp-2">{sprint.goal}</p>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>
                    {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                  </span>
                </div>

                {/* Duration */}
                <div className="text-xs text-gray-500 mb-3">
                  {sprint.durationDays} working days 
                </div>

                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-700">
                      Progress
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      {sprint.completedTasks}/{sprint.totalTasks} tasks
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${sprint.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">{sprint.progress}%</span>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSprint(sprint);
                    }}
                    className="flex-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Edit
                  </button>

                  {sprint.status === 'Active' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCompleteSprint(sprint._id);
                      }}
                      className="flex-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      Complete
                    </button>
                  )}

                  {sprint.totalTasks === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSprint(sprint._id);
                      }}
                      className="flex-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SprintList;
