// frontend/app/features/analytics/components/RestrictedAnalytics.tsx

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/provider/auth-context';
import { Link } from "react-router";
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Shield } from 'lucide-react';
import { format } from 'date-fns';
import axios from '@/lib/axios';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

type Employee = { userId: string; userName: string; workspaceRole?: string };

interface ReportData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    profilePicture: string | null;
  };
  dateRange: {
    start: string;
    end: string;
    days: number;
    displayText: string;
  };
  summary: {
    totalTasks: number;
    completedTasks: number;
    openTasks: number;
    overdueTasks: number;
    completionRate: number;
  };
  timing: {
    avgTimeToComplete: number;
    fastestCompletion: string | null;
    slowestCompletion: string | null;
    onTimeRate: number;
    tasksPerDay: number;
  };
  weekly: Array<{
    week: number;
    startDate: string;
    endDate: string;
    completed: number;
    percentage: number;
    onTime: number;
  }>;
  performanceScore: {
    overallScore: number;
    grade: string;
    status: string;
    components: {
      completion: number;
      onTime: number;
      diversity: number;
      consistency: number;
    };
  };
  completedTasks: Array<{
    id: string;
    title: string;
    project: string;
    projectId?: string;
    startDate: string;
    completedAt: string;
    priority: string;
    daysToComplete: number;
  }>;
  openTasks: Array<{
    id: string;
    title: string;
    project: string;
    projectId?: string;
    startDate: string;
    dueDate: string;
    priority: string;
    status: string;
    daysUntilDue: number;
    isOverdue: boolean;
    age: number;
  }>;
  projects: Array<{
    projectName: string;
    assigned: number;
    completed: number;
    completionRate: number;
    onTimeRate: number;
    contribution: number;
  }>;
  comparison: Array<{
    metric: string;
    yourScore: string | number;
    teamAverage: string | number;
    better: boolean;
    gap: string;
  }>;
  peakDay: string;
  peakDayCount: number;
  consistency: number;
  productivityTrend: string;
  efficiencyMetrics: {
    avgDaysToComplete: string;
    fastestCompletion: string;
    slowestCompletion: string;
    peakDay: string;
    peakDayCount: number;
    tasksPerDay: string;
    productivityTrend: string;
  };
}

// Cache interface for storing employee lists
interface EmployeeCache {
  data: Employee[];
  timestamp: number;
  workspaceId: string;
}

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

export function RestrictedAnalytics() {
  const { user, isLoading: authLoading } = useAuth();

  // Extract user ID and workspace info
  const currentUserId = user?._id || (user as any)?.id;
  const currentWorkspaceId = typeof user?.currentWorkspace === 'string'
    ? user.currentWorkspace
    : user?.currentWorkspace?._id;

  // Determine user's workspace role and system role
  const userRole = String(user?.role || 'user');
  const isSystemAdmin = ['admin', 'super_admin'].includes(userRole);

  const workspaceRole = user?.workspaces?.find((w: any) =>
    w?.workspaceId?._id === currentWorkspaceId || w?.workspaceId === currentWorkspaceId
  )?.role || 'member';

  const isWorkspaceLead = workspaceRole === 'lead';
  const isWorkspaceOwner = workspaceRole === 'owner';

  // Check if user has access to this restricted tab
  const hasAccess = isSystemAdmin || isWorkspaceLead || isWorkspaceOwner;

  // State management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Cache state
  const [employeeCache, setEmployeeCache] = useState<EmployeeCache | null>(null);

  // Check if cache is valid
  const isCacheValid = useMemo(() => {
    if (!employeeCache) return false;
    if (employeeCache.workspaceId !== currentWorkspaceId) return false;
    const age = Date.now() - employeeCache.timestamp;
    return age < CACHE_TTL;
  }, [employeeCache, currentWorkspaceId]);

  // Fetch employees with caching
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!hasAccess || !currentWorkspaceId) {
        setEmployees([]);
        return;
      }

      // Use cache if valid
      if (isCacheValid && employeeCache) {
        console.log('✅ Using cached employee data');
        setEmployees(employeeCache.data);
        if (currentUserId && employeeCache.data.length > 0) {
          const userExists = employeeCache.data.find(e => e.userId === currentUserId);
          setUserId(userExists ? currentUserId : employeeCache.data[0].userId);
        }
        return;
      }

      try {
        setLoading(true);
        setError('');

        let employeeList: Employee[] = [];

        if (isSystemAdmin) {
          // Admins can see all users
          const res = await axios.get('/analytics/users');
          employeeList = (res.data?.users || []).map((e: any) => ({
            userId: e.userId,
            userName: e.userName,
            workspaceRole: e.workspaceRole
          }));
        } else if (isWorkspaceLead || isWorkspaceOwner) {
          // Workspace leads can only see members of their workspace
          const res = await axios.get(`/analytics/workspace/${currentWorkspaceId}/members`);
          employeeList = (res.data?.members || []).map((e: any) => ({
            userId: e.userId,
            userName: e.userName,
            workspaceRole: e.role
          }));
        }

        // Update cache
        const newCache: EmployeeCache = {
          data: employeeList,
          timestamp: Date.now(),
          workspaceId: currentWorkspaceId
        };
        setEmployeeCache(newCache);
        setEmployees(employeeList);

        // Pre-select current user if in list, otherwise first user
        if (currentUserId && employeeList.length > 0) {
          const userExists = employeeList.find(e => e.userId === currentUserId);
          setUserId(userExists ? currentUserId : employeeList[0].userId);
        } else if (employeeList.length > 0) {
          setUserId(employeeList[0].userId);
        }

        console.log(`✅ Fetched ${employeeList.length} employees for restricted analytics`);
      } catch (e: any) {
        setError('Failed to load employees: ' + (e.response?.data?.message || e.message));
        setEmployeeCache(null);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchEmployees();
    }
  }, [user, currentUserId, currentWorkspaceId, hasAccess, isSystemAdmin, isWorkspaceLead, isWorkspaceOwner, isCacheValid, employeeCache]);

  // Auto-refresh cache on new member join (listen to custom event)
  useEffect(() => {
    const handleMemberUpdate = () => {
      console.log('🔄 Member update detected, invalidating cache');
      setEmployeeCache(null);
    };

    window.addEventListener('workspace-member-updated', handleMemberUpdate);
    return () => window.removeEventListener('workspace-member-updated', handleMemberUpdate);
  }, []);

  const canGenerateReport = !!userId && !!startDate && !!endDate;

  const generateReport = async () => {
    if (!canGenerateReport) return;
    try {
      setReportLoading(true);
      setError('');

      // Try snapshot-based endpoint first (40x faster!)
      const res = await axios.get(`/analytics/snapshot/user/${userId}/range?startDate=${startDate}&endDate=${endDate}`);

      // Transform snapshot data to match expected format
      const snapshotData = res.data;

      if (snapshotData.source === 'snapshot_range') {
        // Using snapshot data - 10-50ms response time
        console.log('✅ Using cached snapshot data (fast!)', {
          snapshotCount: snapshotData.snapshotCount,
          dateRange: snapshotData.dateRange
        });
      } else {
        // Fallback to real-time calculation - 500-2000ms response time
        console.warn('⚠️ No snapshot available, using real-time calculation (slower)');
      }

      setReportData(snapshotData);
    } catch (e: any) {
      setError('Failed to generate report: ' + (e.response?.data?.message || e.message));
      setReportData(null);
    } finally {
      setReportLoading(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="w-full space-y-4">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600">Loading authentication...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access denied for non-authorized users
  if (!hasAccess) {
    return (
      <div className="w-full space-y-4">
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-16 h-16 text-red-500 mb-4" />
              <h3 className="text-xl font-semibold text-red-900 mb-2">Access Restricted</h3>
              <p className="text-red-700 max-w-md">
                This tab is only accessible to workspace leads and administrators.
              </p>
              <div className="mt-4 text-sm text-red-600">
                <p>Your current role: <Badge variant="outline">{workspaceRole}</Badge></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="bg-gray-50 min-h-screen rounded-lg">
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-area, #printable-area * {
              visibility: visible;
            }
            #printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
            .print-break {
              page-break-before: always;
            }
          }
        `}</style>
        <div className="max-w-7xl mx-auto p-6">
          {/* Header with role indicator */}
          <div className="flex items-center justify-between mb-2 no-print">
            <div>
              <h1 className="text-[24px] font-semibold text-[#1f2937]">
                Restricted Analytics Report
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {/* <Shield className="w-4 h-4 text-[#F2761B]" /> */}
                {/* <p className="text-[#717182] text-[14px]">
                  {isSystemAdmin ? 'Admin Access - All Users' : 'Workspace Lead Access - Workspace Members Only'}
                </p> */}
              </div>
            </div>
            {/* {isCacheValid && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Cache Active ({Math.floor((CACHE_TTL - (Date.now() - (employeeCache?.timestamp || 0))) / 1000 / 60)}m remaining)
              </Badge>
            )} */}
          </div>

          {/* <p className="text-[#717182] text-[14px] mb-6 no-print">
            Select a user and date range to generate productivity reports.
          </p> */}

          {/* Filter Controls - Replicated from PersonalStats */}
          <div className="bg-white rounded-[8px] border border-[#e6e8ec] p-6 mb-6 space-y-4 no-print">
            {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* User Selector */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-2">
                  User {loading && <span className="text-[11px] text-gray-500">(Loading...)</span>}
                </label>
                <select
                  className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-[14px] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none disabled:bg-gray-100"
                  value={userId}
                  onChange={e => { setUserId(e.target.value); setReportData(null); }}
                  disabled={loading || employees.length === 0}
                >
                  {employees.length === 0 ? (
                    <option value="">No users available</option>
                  ) : (
                    employees.map(e => (
                      <option key={e.userId} value={e.userId}>
                        {e.userName}
                        {e.workspaceRole && ` (${e.workspaceRole})`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-2">Start Date</label>
                <Popover>
                  <PopoverTrigger className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-left text-[14px] hover:border-[#F2761B] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none">
                    {startDate ? format(new Date(startDate), 'dd-MM-yyyy') : 'Pick start date'}
                  </PopoverTrigger>
                  <PopoverContent className="p-2">
                    <Calendar
                      mode="single"
                      selected={startDate ? new Date(startDate) : undefined}
                      onSelect={(d) => {
                        if (d) {
                          const newStart = format(d, 'yyyy-mm-dd');
                          if (endDate && new Date(newStart) > new Date(endDate)) {
                            setError('Start date cannot be after end date');
                            return;
                          }
                          setError('');
                          setStartDate(newStart);
                          setReportData(null);
                        } else {
                          setStartDate('');
                          setReportData(null);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-2">End Date</label>
                <Popover>
                  <PopoverTrigger className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-left text-[14px] hover:border-[#F2761B] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none">
                    {endDate ? format(new Date(endDate), 'dd-MM-yyyy') : 'Pick end date'}
                  </PopoverTrigger>
                  <PopoverContent className="p-2">
                    <Calendar
                      mode="single"
                      selected={endDate ? new Date(endDate) : undefined}
                      onSelect={(d) => {
                        if (d) {
                          const newEnd = format(d, 'yyyy-MM-dd');
                          if (startDate && new Date(startDate) > new Date(newEnd)) {
                            setError('End date cannot be before start date');
                            return;
                          }
                          setError('');
                          setEndDate(newEnd);
                          setReportData(null);
                        } else {
                          setEndDate('');
                          setReportData(null);
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={generateReport}
                disabled={!canGenerateReport || reportLoading}
                className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[18px] py-[11px] h-auto rounded-[8px] text-[14px] font-medium flex items-center gap-[10px]"
              >
                {reportLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Report'
                )}
              </button>
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); setReportData(null); }}
                className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 outline-none border border-[#F2761B] text-[#F2761B] hover:bg-[#fff7ed] px-[18px] py-[11px] h-auto rounded-[8px] text-[14px] font-medium"
              >
                Clear Dates
              </button>
            </div>
          </div>

          {/* Report Display - Same as PersonalStats */}
          {reportData && (
            <div id="printable-area" className="space-y-6">
              {/* Section 1: User Info Card */}
              <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#F2761B] text-white flex items-center justify-center text-2xl font-semibold flex-shrink-0">
                    {reportData.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[18px] md:text-[20px] font-semibold text-[#111827] truncate">{reportData.user.name}</h2>
                    <p className="text-[13px] text-[#717182] truncate">{reportData.user.email}</p>
                    <p className="text-[13px] text-[#717182] capitalize">{reportData.user.role}</p>
                  </div>
                  <div className="w-full sm:w-auto sm:text-right">
                    <p className="text-[13px] text-[#717182]">Selected Period</p>
                    <p className="text-[14px] font-medium text-[#111827]">{reportData.dateRange.displayText}</p>
                    <p className="text-[13px] text-[#717182]">{reportData.dateRange.days} days</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Summary Statistics (4 Cards) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] text-[#717182] mb-1">Total Tasks</p>
                      <p className="text-[28px] font-bold text-[#111827]">{reportData.summary.totalTasks}</p>
                      <p className="text-[12px] text-[#717182] mt-1">100%</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
                      📋
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] text-[#10b981] mb-1">Completed</p>
                      <p className="text-[28px] font-bold text-[#10b981]">{reportData.summary.completedTasks}</p>
                      <p className="text-[12px] text-[#10b981] mt-1">{reportData.summary.completionRate}%</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl">
                      ✅
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] text-[#f59e0b] mb-1">In Progress</p>
                      <p className="text-[28px] font-bold text-[#f59e0b]">{reportData.summary.openTasks}</p>
                      <p className="text-[12px] text-[#f59e0b] mt-1">{reportData.summary.totalTasks > 0 ? Math.round((reportData.summary.openTasks / reportData.summary.totalTasks) * 100) : 0}%</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-2xl">
                      ⏳
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] text-[#ef4444] mb-1">Overdue</p>
                      <p className="text-[28px] font-bold text-[#ef4444]">{reportData.summary.overdueTasks}</p>
                      <p className="text-[12px] text-[#ef4444] mt-1">{reportData.summary.totalTasks > 0 ? Math.round((reportData.summary.overdueTasks / reportData.summary.totalTasks) * 100) : 0}%</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl">
                      ⚠️
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Tables Stacked Vertically */}
              <div className="grid grid-cols-1 gap-6">
                {/* Completed Tasks Table */}
                <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-5 shadow-sm">
                  <h3 className="text-[16px] font-semibold text-[#111827] mb-4">
                    ✅ Completed Tasks ({reportData.completedTasks.length})
                  </h3>
                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto relative">
                    <table className="w-full text-[13px]">
                      <thead className="sticky top-0 bg-white z-10 shadow-sm">
                        <tr className="border-b border-[#e6e8ec]">
                          <th className="text-left py-2 px-2 font-semibold text-[#111827] w-[50px]">S.No</th>
                          <th className="text-left py-2 px-2 font-semibold text-[#111827]">Task</th>
                          <th className="text-left py-2 px-2 font-semibold text-[#111827]">Project</th>
                          <th className="text-left py-2 px-2 font-semibold text-[#111827]">Start Date</th>
                          <th className="text-left py-2 px-2 font-semibold text-[#111827]">Completed</th>
                          <th className="text-left py-2 px-2 font-semibold text-[#111827]">Duration</th>
                          <th className="text-left py-2 px-2 font-semibold text-[#111827]">Priority</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.completedTasks.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-4 text-[#717182]">No completed tasks</td>
                          </tr>
                        ) : (
                          reportData.completedTasks.map((task, idx) => (
                            <tr key={task.id} className={`border-b border-gray-50 ${idx % 2 === 0 ? 'bg-gray-50/50' : ''}`}>
                              <td className="py-2 px-2 text-[#717182]">{idx + 1}</td>
                              <td className="py-2 px-2 text-[#111827]">
                                <Link to={`/task/${task.id}`} className="hover:text-blue-600 hover:underline">
                                  {task.title}
                                </Link>
                              </td>
                              <td className="py-2 px-2 text-[#717182]">
                                {task.projectId ? (
                                  <Link to={`/project/${task.projectId}`} className="hover:text-blue-600 hover:underline">
                                    {task.project}
                                  </Link>
                                ) : (
                                  task.project
                                )}
                              </td>
                              <td className="py-2 px-2 text-[#717182]">{task.startDate}</td>
                              <td className="py-2 px-2 text-[#717182]">{task.completedAt}</td>
                              <td className="py-2 px-2 text-[#717182]">{task.daysToComplete} days</td>
                              <td className="py-2 px-2">
                                <span className={`px-2 py-1 rounded text-[11px] font-medium capitalize ${task.priority === 'urgent' ? 'bg-red-100 text-red-700' : task.priority === 'high' ? 'bg-orange-100 text-orange-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {task.priority}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Due Tasks Table */}
                <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-5 shadow-sm">
                  <h3 className="text-[16px] font-semibold text-[#111827] mb-4">
                    ⏰ Due in Range ({reportData.openTasks.length})
                  </h3>
                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto relative">
                    <table className="w-full text-[13px]">
                      <thead className="sticky top-0 bg-white z-10 shadow-sm">
                        <tr className="border-b border-[#e6e8ec]">
                          <th className="text-left py-2 px-2 font-semibold text-[#111827] w-[50px]">S.No</th>
                          <th className="text-left py-2 px-2 font-semibold text-[#111827]">Task</th>
                          <th className="text-left py-2 px-2 font-semibold text-[#111827]">Project</th>
                          <th className="text-left py-2 px-2 font-semibold text-[#111827]">Start Date</th>
                          <th className="text-left py-2 px-2 font-semibold text-[#111827]">Due Date</th>
                          <th className="text-left py-2 px-2 font-semibold text-[#111827]">Duration</th>
                          <th className="text-left py-2 px-2 font-semibold text-[#111827]">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.openTasks.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-4 text-[#717182]">No open tasks</td>
                          </tr>
                        ) : (
                          reportData.openTasks.map((task, idx) => (
                            <tr key={task.id} className={`border-b border-gray-50 ${idx % 2 === 0 ? 'bg-gray-50/50' : ''} ${task.isOverdue ? 'bg-red-50' : ''}`}>
                              <td className="py-2 px-2 text-[#717182]">{idx + 1}</td>
                              <td className="py-2 px-2 text-[#111827]">
                                <Link to={`/task/${task.id}`} className="hover:text-blue-600 hover:underline">
                                  {task.title}
                                </Link>
                              </td>
                              <td className="py-2 px-2 text-[#717182]">
                                {task.projectId ? (
                                  <Link to={`/project/${task.projectId}`} className="hover:text-blue-600 hover:underline">
                                    {task.project}
                                  </Link>
                                ) : (
                                  task.project
                                )}
                              </td>
                              <td className="py-2 px-2 text-[#717182]">{task.startDate}</td>
                              <td className="py-2 px-2 text-[#717182]">{task.dueDate}</td>
                              <td className="py-2 px-2 text-[#717182]">{task.age} days</td>
                              <td className="py-2 px-2">
                                <span className={`px-2 py-1 rounded text-[11px] font-medium capitalize ${task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                  {task.status.replace('-', ' ')}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Section 6: Performance Score Card */}
              <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-[12px] p-6 text-white shadow-lg">
                <h3 className="text-[20px] font-bold mb-4">⭐ Productivity Score</h3>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[48px] font-bold">{reportData.performanceScore.overallScore}</p>
                    <p className="text-[16px] opacity-90">/ 100</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[32px] font-bold">{reportData.performanceScore.grade}</p>
                    <p className="text-[14px] opacity-90">{reportData.performanceScore.status}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {Object.entries(reportData.performanceScore.components).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[13px] capitalize">{key}</span>
                        <span className="text-[13px] font-semibold">{value}%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div className="bg-white h-2 rounded-full" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add more sections as needed from PersonalStats */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
