import React, { useEffect, useState } from 'react'
import axios from '../../../lib/axios'
import { Calendar } from '../../../components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover'
import { format } from 'date-fns'
import { Link } from 'react-router'

type Employee = { userId: string; userName: string }

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
    startDate: string
    completedAt: string
    priority: string
    daysToComplete: number
  }>
  openTasks: Array<{
    id: string
    title: string
    project: string
    startDate: string
    dueDate: string
    priority: string
    status: string
    daysUntilDue: number
    isOverdue: boolean
    age: number
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

const UserExportPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [userId, setUserId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [reportLoading, setReportLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [reportData, setReportData] = useState<ReportData | null>(null)

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true)
        setError('')
        const res = await axios.get('/analytics/users')
        const list: Employee[] = (res.data?.users || []).map((e: any) => ({ userId: e.userId, userName: e.userName }))
        setEmployees(list)
        if (list.length > 0) setUserId(list[0].userId)
      } catch (e: any) {
        setError('Failed to load employees')
      } finally {
        setLoading(false)
      }
    }
    fetchEmployees()
  }, [])

  const canDownload = !!userId && !!startDate && !!endDate
  const canGenerateReport = !!userId && !!startDate && !!endDate

  const generateReport = async () => {
    if (!canGenerateReport) return
    try {
      setReportLoading(true)
      setError('')

      // Try snapshot-based endpoint first (40x faster!)
      const res = await axios.get(`/analytics/snapshot/user/${userId}/range?startDate=${startDate}&endDate=${endDate}`)

      // Transform snapshot data to match expected format
      const snapshotData = res.data

      if (snapshotData.source === 'snapshot_range') {
        // Using snapshot data - 10-50ms response time
        console.log('✅ Using cached snapshot data (fast!)', {
          snapshotCount: snapshotData.snapshotCount,
          dateRange: snapshotData.dateRange
        })
      } else {
        // Fallback to real-time calculation - 500-2000ms response time
        console.warn('⚠️ No snapshot available, using real-time calculation (slower)')
      }

      setReportData(snapshotData)
    } catch (e: any) {
      setError('Failed to generate report: ' + (e.response?.data?.message || e.message))
      setReportData(null)
    } finally {
      setReportLoading(false)
    }
  }

  const download = async (format: 'excel' | 'pdf') => {
    if (!canDownload) return
    const url = format === 'excel'
      ? `/analytics/export/user/${userId}?startDate=${startDate}&endDate=${endDate}`
      : `/analytics/export/user/${userId}/pdf?startDate=${startDate}&endDate=${endDate}`

    const headers = format === 'excel' ? { 'Accept': 'text/csv' } : {}
    const resp = await axios.get(url, { responseType: 'blob', headers })
    const blob = new Blob([resp.data], { type: format === 'excel' ? 'text/csv' : 'application/pdf' })
    const link = document.createElement('a')
    const fname = format === 'excel' ? `user-${userId}-productivity.csv` : `user-${userId}-productivity.pdf`
    link.href = URL.createObjectURL(blob)
    link.download = fname
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
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
      <div className="max-w-7xl mx-auto">
        <h1 className="text-[24px] font-semibold text-[#1f2937] mb-2 no-print">User Productivity Export</h1>
        <p className="text-[#717182] text-[14px] mb-6 no-print">Select a user and date range, then download as Excel (CSV) or PDF.</p>

        <div className="bg-white rounded-[8px] border border-[#e6e8ec] p-6 mb-6 space-y-4 no-print">
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#111827] mb-2">User</label>
              <select className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-[14px] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none" value={userId} onChange={e => { setUserId(e.target.value); setReportData(null); }} disabled={loading}>
                {employees.map(e => (<option key={e.userId} value={e.userId}>{e.userName}</option>))}
              </select>
            </div>
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
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={generateReport}
              disabled={!canGenerateReport || reportLoading}
              className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[18px] py-[11px] h-auto rounded-[8px] text-[14px] font-medium flex items-center gap-[10px]"
            >
              {reportLoading ? 'Generating...' : 'Generate Report'}
            </button>
            <button
              onClick={() => download('excel')}
              disabled={!canDownload || loading}
              className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[18px] py-[11px] h-auto rounded-[8px] text-[14px] font-medium flex items-center gap-[10px]"
            >
              Download Excel
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

        {reportData && (
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
                  <p className="text-[14px] font-medium text-[#111827]">{reportData.dateRange?.displayText}</p>
                  <p className="text-[13px] text-[#717182]">{reportData.dateRange?.days} days</p>
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

            {/* Section 3 & 4: Tables stacked */}
            <div className="grid grid-cols-1 gap-6">
              {/* Section 3: Completed Tasks Table */}
              <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-5 shadow-sm">
                <h3 className="text-[16px] font-semibold text-[#111827] mb-4">
                  ✅ Completed Tasks ({reportData.completedTasks.length})
                </h3>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 bg-white z-10 shadow-sm">
                      <tr className="border-b border-[#e6e8ec]">
                        <th className="text-left py-2 px-2 font-semibold text-[#111827]">S.No</th>
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
                          <tr key={task.id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                            <td className="py-2 px-2 text-[#717182]">{idx + 1}</td>
                            <td className="py-2 px-2 text-[#111827]">
                              <Link
                                to={`/task/${task.id}`}
                                className="hover:underline hover:text-blue-600 block min-w-[200px] max-w-[400px] whitespace-normal break-words"
                                title={task.title}
                              >
                                {task.title.length > 100 ? `${task.title.substring(0, 150)}...` : task.title}
                              </Link>
                            </td>
                            <td className="py-2 px-2 text-[#717182]">{task.project}</td>
                            <td className="py-2 px-2 text-[#717182]">{task.startDate}</td>
                            <td className="py-2 px-2 text-[#717182]">{task.completedAt}</td>
                            <td className="py-2 px-2 text-[#717182]">{task.daysToComplete} days</td>
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
                  ⏰ Due in Range ({reportData.openTasks.length})
                </h3>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 bg-white z-10 shadow-sm">
                      <tr className="border-b border-[#e6e8ec]">
                        <th className="text-left py-2 px-2 font-semibold text-[#111827]">S.No</th>
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
                          <tr key={task.id} className={`${idx % 2 === 0 ? 'bg-gray-50' : ''} ${task.isOverdue ? 'bg-red-50' : ''}`}>
                            <td className="py-2 px-2 text-[#717182]">{idx + 1}</td>
                            <td className="py-2 px-2 text-[#111827]">
                              <Link
                                to={`/task/${task.id}`}
                                className="hover:underline hover:text-blue-600 block min-w-[200px] max-w-[400px] whitespace-normal break-words"
                                title={task.title}
                              >
                                {task.title.length > 150 ? `${task.title.substring(0, 150)}...` : task.title}
                              </Link>
                            </td>
                            <td className="py-2 px-2 text-[#717182]">{task.project}</td>
                            <td className="py-2 px-2 text-[#717182]">{task.startDate}</td>
                            <td className="py-2 px-2 text-[#717182]">{task.dueDate}</td>
                            <td className="py-2 px-2 text-[#717182]">{task.age} days</td>
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
                {reportData.weekly.map((week) => (
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
              <div className="mt-4 pt-4 border-t border-[#e6e8ec] grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[13px] text-[#717182]">Total</p>
                  <p className="text-[16px] font-bold text-[#111827]">{reportData.summary.completedTasks} tasks</p>
                </div>
                <div>
                  <p className="text-[13px] text-[#717182]">Peak Week</p>
                  <p className="text-[16px] font-bold text-[#F2761B]">Week {reportData.weekly.reduce((max, w) => w.completed > max.completed ? w : max, reportData.weekly[0])?.week}</p>
                </div>
                <div>
                  <p className="text-[13px] text-[#717182]">Average</p>
                  <p className="text-[16px] font-bold text-[#111827]">{(reportData.summary.completedTasks / reportData.weekly.length).toFixed(1)} tasks/week</p>
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
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[13px]">Completion</span>
                    <span className="text-[13px] font-semibold">{reportData.performanceScore.components.completion}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: `${reportData.performanceScore.components.completion}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[13px]">On-Time</span>
                    <span className="text-[13px] font-semibold">{reportData.performanceScore.components.onTime}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: `${reportData.performanceScore.components.onTime}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[13px]">Diversity</span>
                    <span className="text-[13px] font-semibold">{reportData.performanceScore.components.diversity}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: `${reportData.performanceScore.components.diversity}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[13px]">Consistency</span>
                    <span className="text-[13px] font-semibold">{reportData.performanceScore.components.consistency}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: `${reportData.performanceScore.components.consistency}%` }} />
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
                  <p className="text-[24px] font-bold text-[#111827]">{reportData.timing.avgTimeToComplete}</p>
                  <p className="text-[12px] text-[#717182]">days</p>
                </div>
                <div className="bg-gray-50 rounded-[8px] p-4">
                  <p className="text-[13px] text-[#717182] mb-1">Fastest Completion</p>
                  <p className="text-[16px] font-bold text-[#10b981]">{reportData.timing.fastestCompletion || 'N/A'}</p>
                  <p className="text-[12px] text-[#717182]">days</p>
                </div>
                <div className="bg-gray-50 rounded-[8px] p-4">
                  <p className="text-[13px] text-[#717182] mb-1">Slowest Completion</p>
                  <p className="text-[16px] font-bold text-[#ef4444]">{reportData.timing.slowestCompletion || 'N/A'}</p>
                  <p className="text-[12px] text-[#717182]">days</p>
                </div>
                <div className="bg-gray-50 rounded-[8px] p-4">
                  <p className="text-[13px] text-[#717182] mb-1">Peak Productivity Day</p>
                  <p className="text-[16px] font-bold text-[#F2761B]">{reportData.peakDay}</p>
                  <p className="text-[12px] text-[#717182]">{reportData.peakDayCount} completions</p>
                </div>
                <div className="bg-gray-50 rounded-[8px] p-4">
                  <p className="text-[13px] text-[#717182] mb-1">Avg Tasks/Day</p>
                  <p className="text-[24px] font-bold text-[#111827]">{reportData.timing.tasksPerDay}</p>
                  <p className="text-[12px] text-[#717182]">tasks</p>
                </div>
                <div className="bg-gray-50 rounded-[8px] p-4">
                  <p className="text-[13px] text-[#717182] mb-1">Productivity Trend</p>
                  <p className="text-[14px] font-bold text-[#111827]">{reportData.productivityTrend}</p>
                </div>
              </div>
            </div>

            {/* Section 8: Project Breakdown */}
            <div className="bg-white rounded-[10px] border border-[#e6e8ec] p-6 shadow-sm">
              <h3 className="text-[18px] font-semibold text-[#111827] mb-4">📁 Project Breakdown</h3>
              <div className="space-y-3">
                {reportData.projects.length === 0 ? (
                  <p className="text-center text-[#717182] py-4">No projects</p>
                ) : (
                  reportData.projects.map((proj, idx) => (
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
                    {reportData.comparison.map((comp, idx) => (
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
              {/* <div className="mt-4 p-4 bg-green-50 rounded-[8px] border border-green-200">
                <p className="text-[14px] text-green-800 font-medium text-center">
                  {reportData.comparison.filter(c => c.better).length >= reportData.comparison.length / 2
                    ? '✨ You\'re performing ABOVE AVERAGE compared to your team!'
                    : '💪 Keep pushing! You have room for improvement.'}
                </p>
              </div> */}
            </div>

            {/* Section 10: Export Options Panel (Sticky) */}
            <div className="sticky bottom-6 bg-white rounded-[10px] border-2 border-[#F2761B] p-4 shadow-lg no-print">
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
        )}
      </div>
    </div>
  )
}

export default UserExportPage
