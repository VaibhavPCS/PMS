// frontend/app/routes/administration/calendar.tsx

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/provider/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, ChevronDown, EyeOff, Calendar as CalendarIcon, X, ExternalLink } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays, differenceInDays } from 'date-fns';
import axios from '@/lib/axios';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Task {
  _id: string;
  title: string;
  description?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'to-do' | 'in-progress' | 'done' | 'on-hold';
  dueDate: string;
  startDate?: string;
  project: {
    _id: string;
    title: string;
  };
  assignee?: {
    _id: string;
    name: string;
    email: string;
  };
  creator?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
  completedAt?: string;
  startedAt?: string;
  isActive?: boolean;
}

interface Workspace {
  _id: string;
  workspaceId: {
    _id: string;
    name: string;
    description: string;
  };
  role: string;
  joinedAt: string;
}

type ViewMode = 'month' | 'week' | 'day';

const statusColors = {
  'to-do': {
    bg: 'bg-blue-500',
    border: 'border-blue-500',
    ring: 'ring-blue-100',
    text: 'text-blue-700'
  },
  'in-progress': {
    bg: 'bg-yellow-500',
    border: 'border-yellow-500',
    ring: 'ring-yellow-100',
    text: 'text-yellow-700'
  },
  'done': {
    bg: 'bg-green-500',
    border: 'border-green-500',
    ring: 'ring-green-100',
    text: 'text-green-700'
  },
  'on-hold': {
    bg: 'bg-gray-500',
    border: 'border-gray-500',
    ring: 'ring-gray-100',
    text: 'text-gray-700'
  },
  'overdue': {
    bg: 'bg-red-500',
    border: 'border-red-500',
    ring: 'ring-red-100',
    text: 'text-red-700'
  }
};

export default function Calendar() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // State
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showWeekends, setShowWeekends] = useState(true);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Access control - redirect if not admin
  // Removed admin check to allow all users to access calendar
  /* 
  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="w-16 h-16 text-red-500 mb-4" />
                <h3 className="text-xl font-semibold text-red-900 mb-2">Access Restricted</h3>
                <p className="text-red-700 max-w-md">
                  The Calendar feature is only accessible to system administrators.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  */

  // Fetch workspaces on mount
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        console.log('Fetching workspaces...');
        const response = await axios.get('/workspace');
        console.log('Workspaces response:', response.data);
        setWorkspaces(response.data.workspaces || []);
        if (response.data.workspaces?.length > 0) {
          const workspaceId = response.data.workspaces[0].workspaceId._id;
          setSelectedWorkspace(workspaceId);
          console.log('Selected first workspace ID:', workspaceId);
        }
      } catch (error) {
        console.error('Failed to fetch workspaces:', error);
      }
    };

    fetchWorkspaces();
  }, []);

  // Fetch tasks when workspace or date changes
  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedWorkspace || !isAuthenticated) {
        console.log('Skipping task fetch - missing requirements:', {
          selectedWorkspace,
          isAuthenticated
        });
        return;
      }

      try {
        setLoading(true);
        console.log('Fetching tasks for workspace:', selectedWorkspace);
        console.log('Request params:', {
          startDate: format(currentDate, 'yyyy-MM-dd'),
          viewMode
        });
        
        // Unified endpoint for all users (backend handles hierarchy)
        const endpoint = `/task/calendar/${selectedWorkspace}`;
          
        const response = await axios.get(endpoint, {
          params: {
            startDate: format(currentDate, 'yyyy-MM-dd'),
            viewMode
          }
        });
        
        console.log('Tasks response:', response.data);
        console.log('Tasks received:', response.data.tasks?.length || 0, 'tasks');
        console.log('Sample task dates:', response.data.tasks?.slice(0, 3).map((t: Task) => t.dueDate) || []);
        setTasks(response.data.tasks || []);
      } catch (error: any) {
        console.error('Failed to fetch tasks:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url
        });
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [selectedWorkspace, currentDate, viewMode, isAuthenticated, isAdmin]);

  // Navigation handlers
  const handlePrevious = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Get calendar days
  const calendarDays = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return eachDayOfInterval({ start, end });
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return eachDayOfInterval({ start, end });
    } else {
      return [currentDate];
    }
  }, [currentDate, viewMode]);

  // Filter tasks for a specific day
  const getTasksForDay = (date: Date) => {
    // Normalize the check date to start of day
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // Is today?
    const isTodayDate = isToday(checkDate);

    const dayTasks = tasks.filter(task => {
      // Normalize start date
      const taskStartDate = task.startDate ? new Date(task.startDate) : new Date(task.dueDate);
      taskStartDate.setHours(0, 0, 0, 0);

      // Normalize end date to end of day
      const taskEndDate = new Date(task.dueDate);
      taskEndDate.setHours(23, 59, 59, 999);
      
      // Check if the check date falls within the task duration
      const isInRange = checkDate >= taskStartDate && checkDate <= taskEndDate;
      
      // Check if task is overdue and active (should appear on today if not already shown)
      const isOverdue = taskEndDate < new Date() && 
                        task.status !== 'done';

      // Check if task is overdue but on-hold (should also appear)
      const isOverdueOnHold = isOverdue && task.status === 'on-hold';
                        
      // If today is the current view date, show overdue tasks (both regular overdue and overdue on-hold)
      if (isTodayDate && (isOverdue || isOverdueOnHold)) {
        return true;
      }

      return isInRange;
    });
    return dayTasks;
  };

  // Check if task spans multiple days
  const isMultiDayTask = (task: Task) => {
    if (!task.startDate) return false;
    const start = new Date(task.startDate);
    const end = new Date(task.dueDate);
    return end.getTime() - start.getTime() > 24 * 60 * 60 * 1000;
  };

  // Get multi-day task indicator
  const getMultiDayIndicator = (task: Task, date: Date) => {
    if (!task.startDate) return null;
    const start = new Date(task.startDate);
    const end = new Date(task.dueDate);
    const isStart = isSameDay(start, date);
    const isEnd = isSameDay(end, date);
    const isMiddle = date > start && date < end;

    if (isStart) return { symbol: '▶', color: 'text-green-600' };
    if (isEnd) return { symbol: '◀', color: 'text-purple-600' };
    if (isMiddle) return { symbol: '─', color: 'text-blue-600' };
    return null;
  };

  const selectedWorkspaceName = workspaces.find(w => w.workspaceId._id === selectedWorkspace)?.workspaceId.name || 'Select Workspace';

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Task Calendar</h1>
            <p className="text-gray-600 text-sm mt-1">
              View and manage tasks across all workspaces
            </p>
          </div>

          {/* Workspace Selector */}
          <div className="relative">
            <button
              onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
              className="w-[200px] flex items-center justify-between rounded-[5px] pl-[12px] pr-0 py-[10px] transition-colors text-[#717182] hover:bg-[#e6e8ec] border border-gray-200"
            >
              <div className="flex items-center gap-[12px]">
                <CalendarIcon className="w-[20px] h-[20px]" />
                <span className="font-['Inter:Medium',sans-serif] text-[14px] tracking-[0.5px] leading-[normal] truncate">
                  {selectedWorkspaceName}
                </span>
              </div>
              <ChevronDown className="w-[24px] h-[24px] transition-transform" />
            </button>

            {workspaceDropdownOpen && (
              <div className="absolute right-0 mt-2 w-[250px] bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-[300px] overflow-y-auto">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.workspaceId._id}
                    onClick={() => {
                      setSelectedWorkspace(workspace.workspaceId._id);
                      setWorkspaceDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                      selectedWorkspace === workspace.workspaceId._id ? 'bg-blue-50 text-blue-600 font-medium' : ''
                    }`}
                  >
                    {workspace.workspaceId.name}
                  </button>
                ))}
                {workspaces.length === 0 && (
                  <div className="px-4 py-6 text-center text-gray-500">
                    No workspaces available
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Calendar Controls */}
        <Card className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Navigation Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 justify-center sm:justify-start">
                  <button
                    onClick={handlePrevious}
                    className="inline-flex items-center justify-center h-9 w-9 p-0 rounded-lg border bg-background shadow-xs hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900 min-w-[150px] text-center">
                      {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
                      {viewMode === 'week' && `Week ${format(currentDate, 'w')}, ${format(currentDate, 'yyyy')}`}
                      {viewMode === 'day' && format(currentDate, 'EEEE, dd MMMM yyyy')}
                    </h2>
                    {/* <button
                      onClick={handleToday}
                      className="hidden sm:inline-flex h-8 px-3 text-xs items-center justify-center font-medium border bg-background shadow-xs rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      Today
                    </button> */}
                  </div>

                  <button
                    onClick={handleNext}
                    className="inline-flex items-center justify-center h-9 w-9 p-0 rounded-lg border bg-background shadow-xs hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* <button
                  onClick={() => setShowWeekends(!showWeekends)}
                  className="inline-flex items-center justify-center h-8 w-8 p-0 rounded-lg border bg-background shadow-xs hover:bg-blue-50 transition-colors"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button> */}
              </div>

              {/* View Mode Selector */}
              <div className="flex items-center justify-center sm:justify-start">
                <div className="inline-flex bg-gray-100 rounded-lg p-1 gap-1">
                  <button
                    onClick={() => setViewMode('month')}
                    className={`h-8 px-4 text-xs font-medium capitalize rounded-md transition-all ${
                      viewMode === 'month'
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    month
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`h-8 px-4 text-xs font-medium capitalize rounded-md transition-all ${
                      viewMode === 'week'
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    week
                  </button>
                  <button
                    onClick={() => setViewMode('day')}
                    className={`h-8 px-4 text-xs font-medium capitalize rounded-md transition-all ${
                      viewMode === 'day'
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    day
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
          <CardContent className="p-0">
            <div className="p-4">
              {viewMode === 'day' ? (
                <div className="flex flex-col gap-3">
                  {getTasksForDay(currentDate).length > 0 ? (
                    getTasksForDay(currentDate).map((task) => {
                      // Check if task is overdue
                      const taskEndDate = new Date(task.dueDate);
                      taskEndDate.setHours(23, 59, 59, 999);
                      const isOverdue = taskEndDate < new Date() && 
                                        task.status !== 'done';
                                        
                      // Check if overdue but on-hold
                      const isOverdueOnHold = isOverdue && task.status === 'on-hold';
                                        
                      // Determine color key: if on-hold (even if overdue), use 'on-hold' color; else if overdue, use 'overdue'
                      const colorKey = isOverdueOnHold ? 'on-hold' : (isOverdue ? 'overdue' : task.status);

                      return (
                        <div 
                          key={task._id}
                          onClick={() => setSelectedTask(task)}
                          className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-1 h-12 rounded-full ${statusColors[colorKey as keyof typeof statusColors]?.bg || 'bg-gray-500'}`} />
                            
                            <div>
                              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-lg">
                                {task.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                <span className="font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs">{task.project?.title || 'No Project'}</span>
                                <span>•</span>
                                <span className={`capitalize ${isOverdueOnHold ? 'text-gray-600 font-medium' : (isOverdue ? 'text-red-600 font-medium' : '')}`}>
                                  {isOverdueOnHold ? (
                                    <span className="flex items-center gap-1">
                                      On Hold <span className="text-red-500 text-[10px] bg-red-50 px-1 rounded border border-red-100 ml-1">Overdue</span>
                                    </span>
                                  ) : (isOverdue ? 'Overdue' : task.status.replace('-', ' '))}
                                </span>
                              </div>
                            </div>
                          </div>
  
                          <div className="flex items-center gap-8">
                            {/* Assignee */}
                            {task.assignee && (
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                  {task.assignee.name ? task.assignee.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
                                </div>
                                <div className="hidden md:block text-gray-700">
                                  <div className="font-medium text-xs text-gray-500">Assigned to</div>
                                  <div className="text-sm font-medium">{task.assignee.name}</div>
                                </div>
                              </div>
                            )}
  
                            {/* Priority & Due Date */}
                            <div className="text-right min-w-[100px]">
                              <Badge variant="outline" className={`mb-1 ${
                                task.priority === 'urgent' ? 'text-red-600 border-red-200 bg-red-50' :
                                task.priority === 'high' ? 'text-orange-600 border-orange-200 bg-orange-50' :
                                'text-gray-600'
                              }`}>
                                {task.priority.toUpperCase()}
                              </Badge>
                              <div className={`text-xs font-medium mt-1 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                                Due: {format(new Date(task.dueDate), 'MMM dd')}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                      <div className="bg-gray-100 p-4 rounded-full mb-4">
                        <CalendarIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">No tasks scheduled</h3>
                      <p className="text-gray-500 mt-1">There are no tasks for this day.</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Week Day Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                      const dayTasks = getTasksForDay(day);
                      const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                      const isTodayDate = isToday(day);

                      return (
                        <div
                          key={index}
                          className={`min-h-[100px] p-1 border rounded-lg hover:bg-gray-50 transition-colors ${
                            isTodayDate
                              ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                              : isCurrentMonth
                              ? 'border-gray-100'
                              : 'bg-gray-50/50 text-gray-400 border-gray-100'
                          }`}
                        >
                          <div
                            className={`text-sm mb-1 px-1 ${
                              isTodayDate
                                ? 'text-blue-600 font-bold'
                                : isCurrentMonth
                                ? 'font-medium'
                                : 'text-gray-400'
                            }`}
                          >
                            {format(day, 'd')}
                          </div>

                          <div className="space-y-0.5 max-h-20 overflow-y-auto">
                            {dayTasks.map((task) => {
                              const multiDayIndicator = isMultiDayTask(task)
                                ? getMultiDayIndicator(task, day)
                                : null;
                                
                              // Check if task is overdue
                              const taskEndDate = new Date(task.dueDate);
                              taskEndDate.setHours(23, 59, 59, 999);
                              const isOverdue = taskEndDate < new Date() && 
                                                task.status !== 'done';
                              
                              // Check if overdue but on-hold
                              const isOverdueOnHold = isOverdue && task.status === 'on-hold';
                                                
                              // Determine color key: if on-hold (even if overdue), use 'on-hold' color; else if overdue, use 'overdue'
                              const colorKey = isOverdueOnHold ? 'on-hold' : (isOverdue ? 'overdue' : task.status);

                              return (
                                <div
                                  key={task._id}
                                  className={`text-[10px] px-1.5 py-0.5 rounded truncate ${
                                    statusColors[colorKey as keyof typeof statusColors]?.bg || 'bg-gray-500'
                                  } text-white font-medium cursor-pointer hover:opacity-80`}
                                  title={`${task.title} - ${task.project?.title || 'No Project'}${isOverdue ? ' (Overdue)' : ''}`}
                                  onClick={() => setSelectedTask(task)}
                                >
                                  {multiDayIndicator && (
                                    <span className="mr-0.5">{multiDayIndicator.symbol}</span>
                                  )}
                                  {task.title}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm bg-gradient-to-br from-gray-50 to-white">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Levels */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                  <h3 className="text-sm font-semibold text-gray-900">Task Status</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2">
                  {Object.entries(statusColors).map(([status, colors]) => (
                    <div
                      key={status}
                      className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                    >
                      <div className={`w-2.5 h-2.5 ${colors.bg} rounded-full ring-4 ${colors.ring}`}></div>
                      <span className="text-xs font-medium text-gray-700 capitalize">{status.replace('-', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Multi-Day Tasks */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                  <h3 className="text-sm font-semibold text-gray-900">Multi-Day Tasks</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                    <span className="text-base font-bold text-green-600">▶</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900">Start</div>
                      <div className="text-[10px] text-gray-500 truncate">Task begins</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                    <span className="text-base font-bold text-blue-600">─</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900">Ongoing</div>
                      <div className="text-[10px] text-gray-500 truncate">In progress</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                    <span className="text-base font-bold text-purple-600">◀</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900">End</div>
                      <div className="text-[10px] text-gray-500 truncate">Task ends</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-700">Loading tasks...</span>
              </div>
            </div>
          </div>
        )}

        {/* Task Detail Modal */}
        <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <DialogTitle className="text-xl font-bold text-gray-900">
                    {selectedTask?.title}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {selectedTask?.project?.title || 'No Project'}
                  </DialogDescription>
                </div>
                {/* <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x w-5 h-5 text-gray-500" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                  <X className="w-5 h-5 text-gray-500" />
                </button> */}
              </div>
            </DialogHeader>

            {selectedTask && (
              <div className="mt-6 space-y-6">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <Badge 
                    className={`${statusColors[selectedTask.status]?.bg || 'bg-gray-500'} text-white border-0`}
                  >
                    {selectedTask.status.replace('-', ' ').toUpperCase()}
                  </Badge>
                  
                  {/* Open in New Tab Link */}
                  <a 
                    href={`/task/${selectedTask._id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                    title="Open task in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* Description */}
                {selectedTask.description && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedTask.description}</p>
                  </div>
                )}

                {/* Task Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900">Timeline</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Start Date:</span>
                        <span className="font-medium">
                          {selectedTask.startDate ? format(new Date(selectedTask.startDate), 'MMM dd, yyyy') : 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Due Date:</span>
                        <span className="font-medium">
                          {format(new Date(selectedTask.dueDate), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      {selectedTask.createdAt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Created:</span>
                          <span className="font-medium">
                            {format(new Date(selectedTask.createdAt), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assignment Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900">Assignment</h4>
                    <div className="space-y-2">
                      {selectedTask.assignee && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Assigned to:</span>
                          <span className="font-medium">{selectedTask.assignee.name}</span>
                        </div>
                      )}
                      {selectedTask.creator && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Created by:</span>
                          <span className="font-medium">{selectedTask.creator.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Time Tracking */}
                {selectedTask.startDate && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Time Tracking</h4>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Time Spent:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedTask.startDate && selectedTask.dueDate
                            ? `${differenceInDays(new Date(selectedTask.dueDate), new Date(selectedTask.startDate))} days`
                            : 'Calculating...'}
                        </span>
                      </div>
                      {selectedTask.completedAt && (
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-gray-600">Completed:</span>
                          <span className="text-sm font-medium text-green-600">
                            {format(new Date(selectedTask.completedAt), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Priority */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Priority</h4>
                  <Badge variant="outline" className="text-xs">
                    {selectedTask.priority.toUpperCase()}
                  </Badge>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}