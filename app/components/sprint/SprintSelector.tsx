import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, Info } from 'lucide-react';
import { fetchData } from '@/lib/fetch-util';

interface Sprint {
  _id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: 'Planning' | 'Active' | 'Completed' | 'Cancelled';
  totalTasks: number;
  completedTasks: number;
}

interface SprintSelectorProps {
  projectId: string;
  selectedSprintId: string | null;
  onSelectSprint: (sprintId: string | null) => void;
  taskStartDate?: string;
  taskDueDate?: string;
  isRecurring?: boolean;
  disabled?: boolean;
  error?: string;
}

export const SprintSelector: React.FC<SprintSelectorProps> = ({
  projectId,
  selectedSprintId,
  onSelectSprint,
  taskStartDate,
  taskDueDate,
  isRecurring = false,
  disabled = false,
  error
}) => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchSprints();
    }
  }, [projectId]);

  useEffect(() => {
    // Validate selected sprint against task dates
    if (selectedSprintId && taskStartDate && taskDueDate) {
      validateSprintDates();
    } else {
      setValidationError(null);
    }
  }, [selectedSprintId, taskStartDate, taskDueDate]);

  const fetchSprints = async () => {
    try {
      setLoading(true);
      const data = await fetchData<{ data?: Sprint[] }>(
        `/sprint/project/${projectId}?status=Active,Planning`
      );
      setSprints(data.data || []);
    } catch (err) {
      console.error('Error fetching sprints:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateSprintDates = () => {
    if (!selectedSprintId || !taskStartDate || !taskDueDate) {
      setValidationError(null);
      return;
    }

    const selectedSprint = sprints.find(s => s._id === selectedSprintId);
    if (!selectedSprint) {
      setValidationError(null);
      return;
    }

    const taskStart = new Date(taskStartDate);
    const taskEnd = new Date(taskDueDate);
    const sprintStart = new Date(selectedSprint.startDate);
    const sprintEnd = new Date(selectedSprint.endDate);

    taskStart.setHours(0, 0, 0, 0);
    taskEnd.setHours(0, 0, 0, 0);
    sprintStart.setHours(0, 0, 0, 0);
    sprintEnd.setHours(0, 0, 0, 0);

    if (taskStart < sprintStart) {
      setValidationError(`Task start date is before sprint start date (${formatDate(selectedSprint.startDate)})`);
      return;
    }

    if (taskEnd > sprintEnd) {
      setValidationError(`Task due date exceeds sprint end date (${formatDate(selectedSprint.endDate)})`);
      return;
    }

    setValidationError(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getSprintStatusColor = (status: Sprint['status']) => {
    switch (status) {
      case 'Planning':
        return 'text-blue-600';
      case 'Active':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="w-full space-y-1">
      <label htmlFor="sprint" className="block text-sm font-medium text-gray-700 mb-2">
        {isRecurring ? (
          <>Sprint (Optional for recurring tasks)</>
        ) : (
          <>Sprint * <span className="text-xs text-gray-500">(Required)</span></>
        )}
      </label>

      {loading ? (
        <div className="w-full flex items-center justify-center py-4 border border-gray-300 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : sprints.length === 0 ? (
        <div className="w-full border border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 font-medium">No active sprints available</p>
              <p className="text-xs text-gray-600 mt-1">
                Create a sprint for this project before creating tasks.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <select
            id="sprint"
            value={selectedSprintId || ''}
            onChange={(e) => {
              onSelectSprint(e.target.value || null);
              setValidationError(null);
            }}
            disabled={disabled}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error || validationError ? 'border-red-500' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          >
            <option value="">
              {isRecurring ? 'No sprint (backlog)' : 'Select a sprint'}
            </option>
            {sprints.map((sprint) => (
              <option key={sprint._id} value={sprint._id}>
                {sprint.name} ({sprint.status}) - {formatDate(sprint.startDate)} to {formatDate(sprint.endDate)} - {sprint.completedTasks}/{sprint.totalTasks} tasks
              </option>
            ))}
          </select>

          {/* Show selected sprint info */}
          {selectedSprintId && !validationError && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              {(() => {
                const sprint = sprints.find(s => s._id === selectedSprintId);
                if (!sprint) return null;

                return (
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900">
                        {sprint.name}
                        <span className={`ml-2 text-xs ${getSprintStatusColor(sprint.status)}`}>
                          ({sprint.status})
                        </span>
                      </p>
                      <p className="text-blue-700 text-xs mt-1">{sprint.goal}</p>
                      <p className="text-blue-600 text-xs mt-1">
                        {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* Recurring task info */}
      {isRecurring && (
        <p className="mt-2 text-xs text-gray-600 flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          Recurring tasks are project-level and don't require sprint assignment.
        </p>
      )}

      {/* Validation error */}
      {validationError && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {validationError}
        </p>
      )}

      {/* General error */}
      {error && !validationError && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}

      {/* Sprint status warning for Planning sprints */}
      {selectedSprintId && !validationError && (
        (() => {
          const sprint = sprints.find(s => s._id === selectedSprintId);
          if (sprint && sprint.status === 'Planning') {
            return (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Sprint Not Started</p>
                    <p className="text-xs mt-1">
                      This sprint is in Planning status. Tasks in planning sprints cannot be marked as in-progress or done until the sprint becomes active.
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()
      )}
    </div>
  );
};

export default SprintSelector;
