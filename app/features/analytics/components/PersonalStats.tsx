import { memo, useMemo, useState } from 'react';
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
  Calendar as CalendarIcon,
  AlertCircle
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import axios from '@/lib/axios';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// --- Types from UserExportPage ---
interface ReportData {
  user: {
    id: string
    name: string
    email: string
    role: string
    profilePicture: string | null
  }
  dateRange: {
    start: string
    end: string
    days: number
    displayText: string
  }
  summary: {
    totalTasks: number
    completedTasks: number
    openTasks: number
    overdueTasks: number
    completionRate: number
  }
  timing: {
    avgTimeToComplete: number
    fastestCompletion: string | null
    slowestCompletion: string | null
    onTimeRate: number
    tasksPerDay: number
  }
  weekly: Array<{
    week: number
    startDate: string
    endDate: string
    completed: number
    percentage: number
    onTime: number
  }>
  performanceScore: {
    overallScore: number
    grade: string
    status: string
    components: {
      completion: number
      onTime: number
      diversity: number
      consistency: number
    }
  }
  completedTasks: Array<{
    id: string
    title: string
    project: string
    completedAt: string
    priority: string
    daysToComplete: number
  }>
  openTasks: Array<{
    id: string
    title: string
    project: string
    dueDate: string
    priority: string
    status: string
    daysUntilDue: number
    isOverdue: boolean
  }>
  projects: Array<{
    projectName: string
    assigned: number
    completed: number
    completionRate: number
    onTimeRate: number
    contribution: number
  }>
  comparison: Array<{
    metric: string
    yourScore: string | number
    teamAverage: string | number
    better: boolean
    gap: string
  }>
  peakDay: string
  peakDayCount: number
  consistency: number
  productivityTrend: string
  efficiencyMetrics: {
    avgDaysToComplete: string
    fastestCompletion: string
    slowestCompletion: string
    peakDay: string
    peakDayCount: number
    tasksPerDay: string
    productivityTrend: string
  }
}

interface PersonalStatsProps {
  userIdOverride?: string | null;
  headerTitle?: string;
  headerSubtitle?: string;
}

const TaskItem = memo(({ task, isLast, getPriorityColor }: any) => {
  const formattedDate = useMemo(() => {
      try {
          const date = new Date(task.dueDate);
          if (!isValid(date)) return { date: 'N/A', day: '' };
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return {
              date: `${day}/${month}/${year}`,
              day: format(date, 'EEEE')
          };
      } catch {
          return { date: 'N/A', day: '' };
      }
  }, [task.dueDate]);

  return (
    <div>
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
            {formattedDate.date}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formattedDate.day}
          </div>
        </div>
      </div>
      {!isLast && (
        <Separator className="my-2" />
      )}
    </div>
  );
});

export const PersonalStats = memo(function PersonalStats(props: PersonalStatsProps) {
  const { userIdOverride, headerTitle, headerSubtitle } = props || {};
  const { user, isLoading: authLoading } = useAuth();
  
  const userId = userIdOverride || user?._id || (user as any)?.id;
  
  // State for Date Range Report
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string>('');
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Existing Simple Stats Data (fetched only if no report is active to save resources)
  const { data, isLoading: queryLoading, isError, error } = useUserAnalytics(
    userId || '', 
    { enabled: !!userId && !reportData }
  );

  const stats = useMemo(() => {
    if (!data) return null;
    return {
       openTaskCount: data.openTaskCount ?? 0,
       tasksDueNext7Days: data.tasksDueNext7Days ?? [],
       tasksCompletedLast7Days: data.tasksCompletedLast7Days ?? 0
    };
  }, [data]);

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

  const canGenerateReport = !!userId && !!startDate && !!endDate;
  const canDownload = !!userId && !!startDate && !!endDate;

  const generateReport = async () => {
    if (!canGenerateReport) return;
    try {
      setReportLoading(true);
      setReportError('');

      // Try snapshot-based endpoint first (40x faster!)
      const res = await axios.get(`/analytics/snapshot/user/${userId}/range?startDate=${startDate}&endDate=${endDate}`);
      
      console.log('📊 Personal Report Data Received:', res.data);

      // Transform snapshot data to match expected format
      const snapshotData = res.data;

      if (snapshotData.source === 'snapshot_range') {
        console.log('✅ Using cached snapshot data (fast!)', {
          snapshotCount: snapshotData.snapshotCount,
          dateRange: snapshotData.dateRange
        });
      } else {
        console.warn('⚠️ No snapshot available, using real-time calculation (slower)');
      }

      setReportData(snapshotData);
    } catch (e: any) {
      setReportError('Failed to generate report: ' + (e.response?.data?.message || e.message));
      setReportData(null);
    } finally {
      setReportLoading(false);
    }
  };

  const download = async (format: 'excel' | 'pdf') => {
    if (!canDownload) return;
    const url = format === 'excel'
      ? `/analytics/export/user/${userId}?startDate=${startDate}&endDate=${endDate}`
      : `/analytics/export/user/${userId}/pdf?startDate=${startDate}&endDate=${endDate}`;

    const headers = format === 'excel' ? { 'Accept': 'text/csv' } : {};
    try {
      const resp = await axios.get(url, { responseType: 'blob', headers });
      const blob = new Blob([resp.data], { type: format === 'excel' ? 'text/csv' : 'application/pdf' });
      const link = document.createElement('a');
      const fname = format === 'excel' ? `user-${userId}-productivity.csv` : `user-${userId}-productivity.pdf`;
      link.href = URL.createObjectURL(blob);
      link.download = fname;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      console.error('Download failed', e);
      setReportError('Failed to download report');
    }
  };

  // Combined loading state for initial load
  if (authLoading || (queryLoading && !reportData)) {
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
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

      <div>
        <h2 className="text-2xl font-bold text-gray-900">{headerTitle || 'Personal Productivity'}</h2>
        <p className="text-sm text-gray-600 mt-1">
          {headerSubtitle || 'Track your task progress, analyze performance, and download reports'}
        </p>
      </div>

      {/* Date Range Selection Controls */}
      <div className="bg-white rounded-[8px] border border-[#e6e8ec] p-4 space-y-4 no-print shadow-sm">
        {reportError && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{reportError}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  onSelect={(d) => { setStartDate(d ? format(new Date(d), 'yyyy-MM-dd') : ''); setReportData(null); }}
                />
              </PopoverContent>
            </Popover>
          </div>
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
                  onSelect={(d) => { setEndDate(d ? format(new Date(d), 'yyyy-MM-dd') : ''); setReportData(null); }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-end">
            <div className="flex gap-3 w-full">
                <button
                onClick={generateReport}
                disabled={!canGenerateReport || reportLoading}
                className="flex-1 justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[18px] py-[11px] h-auto rounded-[8px] text-[14px] font-medium flex items-center gap-[10px]"
                >
                {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {reportLoading ? 'Generating...' : 'Generate Report'}
                </button>
                <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); setReportData(null); }}
                className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 outline-none border border-[#F2761B] text-[#F2761B] hover:bg-[#fff7ed] px-[18px] py-[11px] h-auto rounded-[8px] text-[14px] font-medium"
                >
                Clear
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Rendering: Either Detailed Report or Simple Stats */}
      {reportData ? (
        <div id="printable-area" className="space-y-6">
            {/* Section 1: User Info Card */}
            <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#F2761B] text-white flex items-center justify-center text-2xl font-semibold flex-shrink-0">
                  {reportData.user?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[18px] md:text-[20px] font-semibold text-[#111827] truncate">{reportData.user?.name || 'Unknown User'}</h2>
                  <p className="text-[13px] text-[#717182] truncate">{reportData.user?.email || 'No email'}</p>
                  <p className="text-[13px] text-[#717182] capitalize">{reportData.user?.role || 'No role'}</p>
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
                    <p className="text-[28px] font-bold text-[#111827]">{reportData.summary?.totalTasks ?? 0}</p>
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
                    <p className="text-[28px] font-bold text-[#10b981]">{reportData.summary?.completedTasks ?? 0}</p>
                    <p className="text-[12px] text-[#10b981] mt-1">{reportData.summary?.completionRate ?? 0}%</p>
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
                    <p className="text-[28px] font-bold text-[#f59e0b]">{reportData.summary?.openTasks ?? 0}</p>
                    <p className="text-[12px] text-[#f59e0b] mt-1">{(reportData.summary?.totalTasks ?? 0) > 0 ? Math.round(((reportData.summary?.openTasks ?? 0) / (reportData.summary?.totalTasks ?? 1)) * 100) : 0}%</p>
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
                    <p className="text-[28px] font-bold text-[#ef4444]">{reportData.summary?.overdueTasks ?? 0}</p>
                    <p className="text-[12px] text-[#ef4444] mt-1">{(reportData.summary?.totalTasks ?? 0) > 0 ? Math.round(((reportData.summary?.overdueTasks ?? 0) / (reportData.summary?.totalTasks ?? 1)) * 100) : 0}%</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl">
                    ⚠️
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3 & 4: Tables side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Section 3: Completed Tasks Table */}
              <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-5 shadow-sm">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-4">
                  ✅ Completed Tasks ({(reportData.completedTasks?.length ?? 0)})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-[#e6e8ec]">
                        <th className="text-left py-2 px-2 font-semibold text-[#111827]">Task</th>
                        <th className="text-left py-2 px-2 font-semibold text-[#111827]">Project</th>
                        <th className="text-left py-2 px-2 font-semibold text-[#111827]">Completed</th>
                        <th className="text-left py-2 px-2 font-semibold text-[#111827]">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData.completedTasks?.length ?? 0) === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-4 text-[#717182]">No completed tasks</td>
                        </tr>
                      ) : (
                        (reportData.completedTasks || []).slice(0, 10).map((task, idx) => (
                          <tr key={task.id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                            <td className="py-2 px-2 text-[#111827]">{task.title}</td>
                            <td className="py-2 px-2 text-[#717182]">{task.project}</td>
                            <td className="py-2 px-2 text-[#717182]">{task.completedAt}</td>
                            <td className="py-2 px-2">
                              <span className={`px-2 py-1 rounded text-[11px] font-medium ${task.priority === 'urgent' ? 'bg-red-100 text-red-700' : task.priority === 'high' ? 'bg-orange-100 text-orange-700' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
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

              {/* Section 4: Due Tasks Table */}
              <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-5 shadow-sm">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-4">
                  ⏰ Due in Range ({(reportData.openTasks?.length ?? 0)})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-[#e6e8ec]">
                        <th className="text-left py-2 px-2 font-semibold text-[#111827]">Task</th>
                        <th className="text-left py-2 px-2 font-semibold text-[#111827]">Project</th>
                        <th className="text-left py-2 px-2 font-semibold text-[#111827]">Due Date</th>
                        <th className="text-left py-2 px-2 font-semibold text-[#111827]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData.openTasks?.length ?? 0) === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-4 text-[#717182]">No open tasks</td>
                        </tr>
                      ) : (
                        (reportData.openTasks || []).slice(0, 10).map((task, idx) => (
                          <tr key={task.id} className={`${idx % 2 === 0 ? 'bg-gray-50' : ''} ${task.isOverdue ? 'bg-red-50' : ''}`}>
                            <td className="py-2 px-2 text-[#111827]">{task.title}</td>
                            <td className="py-2 px-2 text-[#717182]">{task.project}</td>
                            <td className="py-2 px-2 text-[#717182]">{task.dueDate}</td>
                            <td className="py-2 px-2">
                              <span className={`px-2 py-1 rounded text-[11px] font-medium ${task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                {task.status}
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

            {/* Section 5: Weekly Breakdown */}
            <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-6 shadow-sm">
              <h3 className="text-[18px] font-semibold text-[#111827] mb-4">📊 Weekly Breakdown</h3>
              <div className="space-y-3">
                {(reportData.weekly || []).map((week) => (
                  <div key={week.week}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium text-[#111827]">
                        Week {week.week} ({week.startDate} - {week.endDate})
                      </span>
                      <span className="text-[13px] font-semibold text-[#F2761B]">{week.completed} tasks</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div
                        className="bg-[#F2761B] h-6 rounded-full flex items-center justify-end pr-2 text-white text-[11px] font-medium"
                        style={{ width: `${week.percentage}%` }}
                      >
                        {week.percentage > 10 && `${week.percentage}%`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 6: Performance Score Card */}
            <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-[12px] p-6 text-white shadow-lg">
              <h3 className="text-[20px] font-bold mb-4">⭐ Productivity Score</h3>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[48px] font-bold">{reportData.performanceScore?.overallScore ?? 0}</p>
                  <p className="text-[16px] opacity-90">/ 100</p>
                </div>
                <div className="text-right">
                  <p className="text-[32px] font-bold">{reportData.performanceScore?.grade ?? '-'}</p>
                  <p className="text-[14px] opacity-90">{reportData.performanceScore?.status ?? 'Not Available'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[13px]">Completion</span>
                    <span className="text-[13px] font-semibold">{reportData.performanceScore?.components?.completion ?? 0}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: `${reportData.performanceScore?.components?.completion ?? 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[13px]">On-Time</span>
                    <span className="text-[13px] font-semibold">{reportData.performanceScore?.components?.onTime ?? 0}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: `${reportData.performanceScore?.components?.onTime ?? 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[13px]">Diversity</span>
                    <span className="text-[13px] font-semibold">{reportData.performanceScore?.components?.diversity ?? 0}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: `${reportData.performanceScore?.components?.diversity ?? 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[13px]">Consistency</span>
                    <span className="text-[13px] font-semibold">{reportData.performanceScore?.components?.consistency ?? 0}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: `${reportData.performanceScore?.components?.consistency ?? 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 7: Efficiency Metrics */}
            <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-6 shadow-sm">
              <h3 className="text-[18px] font-semibold text-[#111827] mb-4">⚡ Efficiency Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-[8px] p-4">
                  <p className="text-[13px] text-[#717182] mb-1">Avg Time to Complete</p>
                  <p className="text-[24px] font-bold text-[#111827]">{reportData.timing?.avgTimeToComplete ?? 0}</p>
                  <p className="text-[12px] text-[#717182]">days</p>
                </div>
                <div className="bg-gray-50 rounded-[8px] p-4">
                  <p className="text-[13px] text-[#717182] mb-1">Fastest Completion</p>
                  <p className="text-[16px] font-bold text-[#10b981]">{reportData.timing?.fastestCompletion || 'N/A'}</p>
                  <p className="text-[12px] text-[#717182]">days</p>
                </div>
                <div className="bg-gray-50 rounded-[8px] p-4">
                  <p className="text-[13px] text-[#717182] mb-1">Slowest Completion</p>
                  <p className="text-[16px] font-bold text-[#ef4444]">{reportData.timing?.slowestCompletion || 'N/A'}</p>
                  <p className="text-[12px] text-[#717182]">days</p>
                </div>
                <div className="bg-gray-50 rounded-[8px] p-4">
                  <p className="text-[13px] text-[#717182] mb-1">Peak Productivity Day</p>
                  <p className="text-[16px] font-bold text-[#F2761B]">{reportData.peakDay || 'N/A'}</p>
                  <p className="text-[12px] text-[#717182]">{reportData.peakDayCount ?? 0} completions</p>
                </div>
                <div className="bg-gray-50 rounded-[8px] p-4">
                  <p className="text-[13px] text-[#717182] mb-1">Avg Tasks/Day</p>
                  <p className="text-[24px] font-bold text-[#111827]">{reportData.timing?.tasksPerDay ?? 0}</p>
                  <p className="text-[12px] text-[#717182]">tasks</p>
                </div>
                <div className="bg-gray-50 rounded-[8px] p-4">
                  <p className="text-[13px] text-[#717182] mb-1">Productivity Trend</p>
                  <p className="text-[14px] font-bold text-[#111827]">{reportData.productivityTrend || 'Stable'}</p>
                </div>
              </div>
            </div>

            {/* Section 8: Project Breakdown */}
            <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-6 shadow-sm">
              <h3 className="text-[18px] font-semibold text-[#111827] mb-4">📁 Project Breakdown</h3>
              <div className="space-y-3">
                {(reportData.projects?.length ?? 0) === 0 ? (
                  <p className="text-center text-[#717182] py-4">No projects</p>
                ) : (
                  (reportData.projects || []).map((proj, idx) => (
                    <div key={idx} className="border border-[#e6e8ec] rounded-[8px] p-4">
                      <p className="text-[15px] font-semibold text-[#111827] mb-2">{proj.projectName}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[13px]">
                        <div>
                          <p className="text-[#717182]">Tasks</p>
                          <p className="font-semibold text-[#111827]">{proj.assigned} assigned, {proj.completed} done</p>
                        </div>
                        <div>
                          <p className="text-[#717182]">Completion Rate</p>
                          <p className="font-semibold text-[#F2761B]">{proj.completionRate}%</p>
                        </div>
                        <div>
                          <p className="text-[#717182]">On-Time Rate</p>
                          <p className="font-semibold text-[#10b981]">{proj.onTimeRate}%</p>
                        </div>
                        <div>
                          <p className="text-[#717182]">Your Contribution</p>
                          <p className="font-semibold text-[#111827]">{proj.contribution}%</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section 9: Team Comparison */}
            <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-6 shadow-sm">
              <h3 className="text-[18px] font-semibold text-[#111827] mb-4">👥 Team Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#e6e8ec]">
                      <th className="text-left py-2 px-2 font-semibold text-[#111827]">Metric</th>
                      <th className="text-left py-2 px-2 font-semibold text-[#111827]">You</th>
                      <th className="text-left py-2 px-2 font-semibold text-[#111827]">Team Avg</th>
                      <th className="text-left py-2 px-2 font-semibold text-[#111827]">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.comparison || []).map((comp, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="py-2 px-2 text-[#111827]">{comp.metric}</td>
                        <td className="py-2 px-2 font-semibold text-[#111827]">{comp.yourScore}</td>
                        <td className="py-2 px-2 text-[#717182]">{comp.teamAverage}</td>
                        <td className="py-2 px-2">
                          <span className={`font-semibold ${comp.better ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                            {comp.better ? '✅' : '❌'} {comp.gap}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 10: Export Options Panel (Sticky) */}
            <div className="sticky bottom-6 bg-white rounded-[10px] border-2 border-[#F2761B] p-4 shadow-lg no-print z-10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-[15px] font-semibold text-[#111827]">📊 Export Options</p>
                  <p className="text-[12px] text-[#717182]">Download complete report data</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => download('excel')}
                    disabled={!canDownload}
                    className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[16px] py-[10px] rounded-[8px] text-[13px] font-medium flex items-center gap-2"
                  >
                    📥 Excel
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="justify-center whitespace-nowrap transition-all bg-gray-200 hover:bg-gray-300 text-gray-800 px-[16px] py-[10px] rounded-[8px] text-[13px] font-medium flex items-center gap-2"
                  >
                    🖨️ Print
                  </button>
                </div>
              </div>
            </div>
        </div>
      ) : (
        /* Fallback to simple stats if no report generated */
        <>
            {/* Stats Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Open Tasks Card */}
                {/* <Card className="border border-gray-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                    <ListTodo className="w-4 h-4 mr-2" />
                    Open Tasks
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-gray-900">
                    {stats?.openTaskCount ?? 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                    Active tasks assigned to you
                    </p>
                </CardContent>
                </Card> */}

                {/* Tasks Due Soon Card */}
                {/* <Card className="border border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Due in Next 7 Days
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-blue-900">
                    {stats?.tasksDueNext7Days?.length ?? 0}
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                    Tasks requiring attention soon
                    </p>
                </CardContent>
                </Card> */}

                {/* Completed Tasks Card */}
                {/* <Card className="border border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-green-700 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Completed (Last 7 Days)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-green-900">
                    {stats?.tasksCompletedLast7Days ?? 0}
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                    Tasks finished recently
                    </p>
                </CardContent>
                </Card> */}
            </div>

            {/* Upcoming Tasks List */}
            {/* <Card className="border border-gray-200">
                <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                    <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Tasks Due in Next 7 Days
                </CardTitle>
                </CardHeader>
                <CardContent>
                {!stats?.tasksDueNext7Days || stats.tasksDueNext7Days.length === 0 ? (
                    <div className="py-8 text-center">
                    <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No tasks due in the next 7 days</p>
                    <p className="text-sm text-gray-400 mt-1">
                        You're all caught up! Great job 🎉
                    </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                    {stats.tasksDueNext7Days.map((task, index) => (
                        <TaskItem 
                            key={task._id} 
                            task={task} 
                            isLast={index === stats.tasksDueNext7Days.length - 1} 
                            getPriorityColor={getPriorityColor}
                        />
                    ))}
                    </div>
                )}
                </CardContent>
            </Card> */}
        </>
      )}
    </div>
  );
});
