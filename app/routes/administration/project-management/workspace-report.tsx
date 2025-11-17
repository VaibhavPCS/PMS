import React, { useEffect, useMemo, useState } from 'react'
import axios from '../../../lib/axios'
import { format } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover'
import { Calendar } from '../../../components/ui/calendar'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar } from 'recharts'

type Workspace = { _id: string; name: string }

const WorkspaceReportPage = () => {
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    const init = async () => {
      try {
        const me = await axios.get('/auth/me')
        const wps: Workspace[] = (me.data?.user?.workspaces || me.data?.workspaces || []).map((w: any) => ({ _id: w.workspaceId?._id || w._id || w.id, name: w.workspaceId?.name || w.name }))
        setWorkspaces(wps)
        const current = localStorage.getItem('currentWorkspaceId')
        const pick = current && wps.find(w => w._id === current) ? current : (wps[0]?._id || '')
        if (pick) {
          setWorkspaceId(pick)
          localStorage.setItem('currentWorkspaceId', pick)
        }
      } catch {}
    }
    init()
  }, [])

  const fmt = (d: Date | null) => d ? format(d, 'yyyy-MM-dd') : ''
  const analyze = async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const url = `/analytics/workspace/${workspaceId}/report?format=json${startDate && endDate ? `&startDate=${fmt(startDate)}&endDate=${fmt(endDate)}` : ''}`
      const res = await axios.get(url)
      setReport(res.data)
    } catch {}
    finally { setLoading(false) }
  }

  const downloadExcel = async () => {
    if (!workspaceId) return
    const url = `/analytics/workspace/${workspaceId}/report?format=excel${startDate && endDate ? `&startDate=${fmt(startDate)}&endDate=${fmt(endDate)}` : ''}`
    const resp = await axios.get(url, { responseType: 'blob' })
    const blob = new Blob([resp.data], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `workspace-${workspaceId}-report.xls`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
  }

  const timelineData = useMemo(() => {
    const tl = report?.timeline || []
    return tl.map((r:any) => ({ date: r.date, Created: r.tasksCreated || 0, Completed: r.tasksCompleted || 0 }))
  }, [report])

  const statusData = useMemo(() => {
    const projects = report?.projects || []
    const agg:any = {}
    projects.forEach((p:any) => { Object.entries(p.statusDistribution || {}).forEach(([k,v]:any)=>{ agg[k] = (agg[k]||0) + Number(v) }) })
    return Object.keys(agg).map(k => ({ status: k, count: agg[k] }))
  }, [report])

  const priorityData = useMemo(() => {
    const projects = report?.projects || []
    const agg:any = {}
    projects.forEach((p:any) => { Object.entries(p.priorityDistribution || {}).forEach(([k,v]:any)=>{ agg[k] = (agg[k]||0) + Number(v) }) })
    return Object.keys(agg).map(k => ({ priority: k, count: agg[k] }))
  }, [report])

  const lifecycleSections = useMemo(() => {
    const projects = report?.projects || []
    return projects.map((p:any) => {
      const rows = (p.tasksDetail || []).map((td:any) => {
        const m = td.lifecycle?.metrics || {}
        const cnt = (td.lifecycle?.timeline || []).length
        return { task: td.title, totalHours: m.totalDuration || 0, workingHours: m.workingDuration || 0, rejections: m.rejectionCount || 0, approvals: m.approvalAttempts || 0, reassignments: m.reassignments || 0, events: cnt }
      })
      const agg:any = {}
      ;(p.tasksDetail || []).forEach((td:any) => {
        (td.lifecycle?.timeline || []).forEach((ev:any) => { const k = ev.eventType || 'unknown'; agg[k] = (agg[k]||0)+1 })
      })
      const chart = Object.keys(agg).map(k => ({ event: k, count: agg[k] }))
      return { projectName: p.project?.name || '', rows, chart }
    })
  }, [report])

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[20px] font-semibold text-[#1f2937]">Workspace Comprehensive Report</h1>
          <p className="text-[#717182] text-[13px]">Administration ▸ Project Management ▸ Workspace Report</p>
        </div>

        <div className="bg-white rounded-[8px] border border-[#e6e8ec] p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[12px] text-[#717182] mb-1">Workspace</label>
              <select className="w-full border rounded px-3 py-2 text-[14px]" value={workspaceId} onChange={e=>{ const v=e.target.value; setWorkspaceId(v); localStorage.setItem('currentWorkspaceId', v); setReport(null); }}>
                {workspaces.map(w => (<option key={w._id} value={w._id}>{w.name || w._id}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-[#717182] mb-1">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" data-slot="popover-trigger" className="w-full border rounded px-3 py-2 text-left text-[14px]">{startDate ? format(startDate, 'dd-MM-yyyy') : 'Select date'}</button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar mode="single" selected={startDate || undefined} onSelect={(d:any)=>setStartDate(d || null)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="block text-[12px] text-[#717182] mb-1">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" data-slot="popover-trigger" className="w-full border rounded px-3 py-2 text-left text-[14px]">{endDate ? format(endDate, 'dd-MM-yyyy') : 'Select date'}</button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar mode="single" selected={endDate || undefined} onSelect={(d:any)=>setEndDate(d || null)} initialFocus />
                </PopoverContent>
              </Popover>
              <div className="flex flex-wrap gap-3 pt-4">
                <button onClick={analyze} disabled={!workspaceId || loading} className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 has-[>svg]:px-3 bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[15px] py-[10px] h-auto rounded-[8px] text-[14px] font-medium font-['Inter']">Analyze</button>
                <button onClick={downloadExcel} disabled={!workspaceId || !report} className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 has-[>svg]:px-3 bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[15px] py-[10px] h-auto rounded-[8px] text-[14px] font-medium font-['Inter']">Download Excel</button>
                <button type="button" onClick={()=>{ setStartDate(null); setEndDate(null); setReport(null); }} className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border border-[#F2761B] text-[#F2761B] hover:bg-[#fff7ed] px-[15px] py-[10px] h-auto rounded-[8px] text-[14px] font-medium">Clear Dates</button>
              </div>
            </div>
          </div>
        </div>

        {report && (
          <div className="mt-6 space-y-6">
            <div className="bg-white rounded-[8px] border border-[#e6e8ec] p-4">
              <div className="mb-2">
                <div className="leading-none font-semibold">Summary</div>
                <p className="text-sm text-gray-600">Workspace totals and rates</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-[#e6e8ec] rounded">
                  <thead>
                    <tr className="bg-[#F2761B] text-white">
                      <th className="text-left p-2">Metric</th>
                      <th className="text-left p-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><th className="text-left p-2">Total Projects</th><td className="p-2">{report.summary?.totalProjects ?? 0}</td></tr>
                    <tr><th className="text-left p-2">Total Tasks</th><td className="p-2">{report.summary?.totalTasks ?? 0}</td></tr>
                    <tr><th className="text-left p-2">Completed Tasks</th><td className="p-2">{report.summary?.completedTasks ?? 0}</td></tr>
                    <tr><th className="text-left p-2">Completion Rate</th><td className="p-2">{(report.summary?.completionRate ?? 0)}%</td></tr>
                    <tr><th className="text-left p-2">Average Duration</th><td className="p-2">{(report.summary?.avgDurationDays ?? 0)} days</td></tr>
                    <tr><th className="text-left p-2">Overdue Tasks</th><td className="p-2">{(report.summary?.overdueTasks ?? 0)}</td></tr>
                    <tr><th className="text-left p-2">Overdue %</th><td className="p-2">{(report.summary?.overduePct ?? 0)}%</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-[8px] border border-[#e6e8ec] p-4">
              <div className="mb-2">
                <div className="leading-none font-semibold">Workspace Timeline</div>
                <p className="text-sm text-gray-600">Daily tasks created vs completed</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" label={{ value: 'Date', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Tasks', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Created" stroke="#f59e0b" strokeWidth={2} />
                    <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-[8px] border border-[#e6e8ec] p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-2">
                  <div className="leading-none font-semibold">Status Distribution</div>
                  <p className="text-sm text-gray-600">Counts by status across projects</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" label={{ value: 'Status', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <div className="mb-2">
                  <div className="leading-none font-semibold">Priority Distribution</div>
                  <p className="text-sm text-gray-600">Counts by priority across projects</p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priorityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="priority" label={{ value: 'Priority', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[8px] border border-[#e6e8ec] p-4">
              <div className="mb-2">
                <div className="leading-none font-semibold">Users Leaderboard</div>
                <p className="text-sm text-gray-600">Per-user metrics and productivity</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-[#e6e8ec] rounded">
                  <thead>
                    <tr className="bg-[#F2761B] text-white">
                      <th className="text-left p-2">User</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-left p-2">To-Do</th>
                      <th className="text-left p-2">In-Progress</th>
                      <th className="text-left p-2">Done</th>
                      <th className="text-left p-2">Completion %</th>
                      <th className="text-left p-2">Avg Duration</th>
                      <th className="text-left p-2">Overdue</th>
                      <th className="text-left p-2">Approval Pending</th>
                      <th className="text-left p-2">Approval Attempts</th>
                      <th className="text-left p-2">Reassign Times</th>
                      <th className="text-left p-2">Productivity Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.usersLeaderboard || []).map((u:any, idx:number) => (
                      <tr key={idx} className={idx % 2 ? 'bg-[#fafafa]' : ''}>
                        <td className="p-2">{u.name}</td>
                        <td className="p-2">{u.role}</td>
                        <td className="p-2">{u.tasks?.todo ?? 0}</td>
                        <td className="p-2">{u.tasks?.inProgress ?? 0}</td>
                        <td className="p-2">{u.tasks?.done ?? 0}</td>
                        <td className="p-2">{u.tasks?.completionRate ?? 0}%</td>
                        <td className="p-2">{u.avgCompletionTimeDays ?? 0} days</td>
                        <td className="p-2">{u.overdueCount ?? 0}</td>
                        <td className="p-2">{u.approvalPendingCount ?? 0}</td>
                        <td className="p-2">{u.approvalAttempts ?? 0}</td>
                        <td className="p-2">{u.reassignTimes ?? 0}</td>
                        <td className="p-2">{u.productivityScore ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {(lifecycleSections || []).map((sec:any, i:number) => (
              <div key={i} className="bg-white rounded-[8px] border border-[#e6e8ec] p-4 space-y-4">
                <div>
                  <div className="leading-none font-semibold">Task Lifecycles • {sec.projectName}</div>
                  <p className="text-sm text-gray-600">Per-task lifecycle summaries</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-[#e6e8ec] rounded">
                    <thead>
                      <tr className="bg-[#F2761B] text-white">
                        <th className="text-left p-2">Task</th>
                        <th className="text-left p-2">Total Duration</th>
                        <th className="text-left p-2">Working Duration</th>
                        <th className="text-left p-2">Rejections</th>
                        <th className="text-left p-2">Approval Attempts</th>
                        <th className="text-left p-2">Reassignments</th>
                        <th className="text-left p-2">Events</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sec.rows.map((r:any, idx:number) => (
                        <tr key={idx} className={idx % 2 ? 'bg-[#fafafa]' : ''}>
                          <td className="p-2">{r.task}</td>
                          <td className="p-2">{r.totalHours} hrs</td>
                          <td className="p-2">{r.workingHours} hrs</td>
                          <td className="p-2">{r.rejections}</td>
                          <td className="p-2">{r.approvals}</td>
                          <td className="p-2">{r.reassignments}</td>
                          <td className="p-2">{r.events}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="leading-none font-semibold mb-2">Lifecycle Event Distribution</div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sec.chart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="event" label={{ value: 'Event Type', position: 'insideBottom', offset: -5 }} />
                        <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkspaceReportPage