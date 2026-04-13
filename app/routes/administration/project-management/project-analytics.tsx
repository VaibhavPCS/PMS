import React, { useEffect, useState } from 'react'
import axios from '../../../lib/axios'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar } from 'recharts'

type Project = { _id: string; title: string }
type Workspace = { _id: string; name: string }

interface AnalyticsData {
  projectId: string
  projectName: string
  projectDescription: string
  projectHead: { userId: string; name: string; email: string } | null
  projectHeads?: Array<{ userId: string; name: string; email: string }>
  dateRange: { start: string; end: string; days: number; daysPassed: number; daysRemaining: number }
  health: {
    overallScore: number
    grade: string
    status: string
    components: { completion: number; quality: number; schedule: number; team: number }
  }
  completion: {
    rate: number
    velocity: number
    distribution: any
    pace: string
    totalTasks: number
    completedTasks: number
    pendingTasks: number
    inProgressTasks: number
    overdueTasks: number
  }
  timeline: {
    planned: string
    estimated: string
    delayDays: number
    delayPercentage: number
    spi: number
    extensions: number
    status: string
    expectedProgress: number
    actualProgress: number
  }
  quality: {
    score: number
    grade: string
    rejectionRate: number
    reworkRate: number
    approvalRate: number
    issues: string[]
  }
  team: {
    totalMembers: number
    activeMembers: number
    removedMembers: number
    productivityIndex: number
    contributions: Array<{
      userId: string
      name: string
      email: string
      role: string
      tasksAssigned: number
      tasksCompleted: number
      tasksPending: number
      contributionPercentage: number
      productivityScore: number
      qualityScore: number
    }>
    capacityUtilization: number
    turnoverRate: number
  }
  risk: {
    overallScore: number
    level: string
    scheduleRisk: { score: number; level: string; factors: any }
    qualityRisk: { score: number; level: string; factors: any }
    resourceRisk: { score: number; level: string; factors: any }
    predictedDelay: number
    indicators: string[]
    recommendations: string[]
  }
  trends: {
    completion: Array<{ date: string; value: number }>
    quality: Array<{ date: string; value: number }>
    riskScore: Array<{ date: string; value: number }>
    teamSize: Array<{ date: string; value: number }>
  }
  milestones: Array<{ name: string; planned: string; status: string; progress: number }>
  issues: Array<{ type: string; severity: string; description: string; impact: string; action: string }>
  comparison: {
    thisProject: any
    teamAverage: any
    variance: any
    betterWorse: { better: number; worse: number }
  }
}

const ProjectAnalyticsPage = () => {
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      // Set default date range (last 30 days) regardless of network status
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      setEndDate(end.toISOString().split('T')[0])
      setStartDate(start.toISOString().split('T')[0])

      try {
        const wsLocal = localStorage.getItem('currentWorkspaceId') || ''
        const me = await axios.get('/auth/me')
        const wps: Workspace[] = (me.data?.user?.workspaces || me.data?.workspaces || []).map((w: any) => ({ _id: w.workspaceId?._id || w._id || w.id, name: w.workspaceId?.name || w.name }))
        setWorkspaces(wps)
        if (wsLocal && wps.find(w => w._id === wsLocal)) {
          setWorkspaceId(wsLocal)
        } else if (wps.length > 0) {
          setWorkspaceId(wps[0]._id)
          localStorage.setItem('currentWorkspaceId', wps[0]._id)
        }
      } catch (e) {
        setError('Unable to load workspace info. You can still select dates and generate when backend is available.')
      }
    }
    init()
  }, [])

  useEffect(() => {
    const loadProjects = async () => {
      if (!workspaceId) return
      try {
        const res = await axios.get(`/analytics/workspace/${workspaceId}?refresh=true`)
        const raw = (res.data?.projects || res.data?.activeProjects || [])
        const ps: Project[] = raw
          .map((p: any) => ({ _id: p._id || p.projectId || p.id, title: p.title || p.projectName || p.name }))
          .filter((p: Project) => /^[a-f\d]{24}$/i.test(p._id))
        setProjects(ps)
        if (ps.length > 0) {
          setProjectId(ps[0]._id)
        }
      } catch { }
    }
    loadProjects()
  }, [workspaceId])

  const generateAnalytics = async () => {
    if (!projectId || !startDate || !endDate) return
    try {
      setLoading(true)
      setError('')
      const res = await axios.get(`/analytics/project/${projectId}/comprehensive?startDate=${startDate}&endDate=${endDate}`)
      setAnalytics(res.data)
    } catch (e: any) {
      setError('Failed to generate analytics: ' + (e.response?.data?.message || e.message))
      setAnalytics(null)
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-700 border-green-300'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'critical': return 'bg-red-100 text-red-700 border-red-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getStatusColor = (status: string) => {
    if (status.includes('On Track') || status.includes('Ahead')) return 'bg-green-100 text-green-700'
    if (status.includes('At Risk') || status.includes('Behind')) return 'bg-orange-100 text-orange-700'
    return 'bg-red-100 text-red-700'
  }

  const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#9333ea']

  const downloadCSV = async () => {
    if (!projectId || !startDate || !endDate) return
    try {
      const response = await axios.get(`/analytics/export/project/${projectId}/comprehensive?startDate=${startDate}&endDate=${endDate}`, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `project-analytics-${projectId}-${Date.now()}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(link.href)
    } catch (e: any) {
      console.error('Failed to download CSV:', e)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-[22px] md:text-[24px] font-bold text-[#111827] mb-1">Project Analytics Dashboard</h1>
            <p className="text-[#717182] text-[13px]">Comprehensive project insights with 20+ metrics and risk analysis</p>
          </div>

          {/* Filter Section */}
          <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
            <h2 className="text-[16px] font-semibold text-[#111827] mb-4">Select Project & Date Range</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-2">Workspace</label>
                <select
                  className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-[14px] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none"
                  value={workspaceId}
                  onChange={e => {
                    setWorkspaceId(e.target.value)
                    localStorage.setItem('currentWorkspaceId', e.target.value)
                  }}
                >
                  {workspaces.map(w => (<option key={w._id} value={w._id}>{w.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-2">Project</label>
                <select
                  className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-[14px] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none"
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  disabled={!workspaceId}
                >
                  {projects.map(p => (<option key={p._id} value={p._id}>{p.title}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-2">Start Date</label>
                <input
                  type="date"
                  className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-[14px] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#111827] mb-2">End Date</label>
                <input
                  type="date"
                  className="w-full border border-[#e6e8ec] rounded-[6px] px-3 py-2.5 text-[14px] focus:border-[#F2761B] focus:ring-1 focus:ring-[#F2761B] outline-none"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-4 mt-4 border-t border-[#e6e8ec]">
              <button
                onClick={generateAnalytics}
                disabled={!projectId || !startDate || !endDate || loading}
                className="bg-[#F2761B] hover:bg-[#F2761B]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-[18px] py-[11px] rounded-[8px] text-[14px] font-medium flex items-center gap-2"
              >
                {loading ? 'Generating...' : 'Generate Analytics'}
              </button>
              {analytics && (
                <button
                  onClick={downloadCSV}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-[18px] py-[11px] rounded-[8px] text-[14px] font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download CSV
                </button>
              )}
              {error && <span className="text-[13px] text-red-600 flex items-center">{error}</span>}
            </div>
          </div>

          {analytics && (
            <>
              {/* Section 1: Project Header & Health Score */}
              <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-[20px] font-bold text-[#111827]">{analytics.projectName}</h2>
                    <p className="text-[13px] text-[#717182] mt-1">{analytics.projectDescription || 'No description'}</p>
                    {(analytics.projectHeads?.length || analytics.projectHead) && (
                      <p className="text-[13px] text-[#717182] mt-2">
                        Project Lead: <span className="font-medium text-[#111827]">
                          {(analytics.projectHeads?.length
                            ? analytics.projectHeads.map(h => h.name).filter(Boolean).join(', ')
                            : analytics.projectHead?.name) || 'Unknown'}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[14px] text-[#717182]">Health Score:</span>
                      <span className="text-[28px] font-bold text-[#111827]">{analytics.health.overallScore}</span>
                      <span className="text-[14px] text-[#717182]">/100</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[13px] font-semibold ${getStatusColor(analytics.health.status)}`}>
                      {analytics.health.grade} - {analytics.health.status}
                    </span>
                  </div>
                </div>

                {/* Date Range Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-[8px]">
                  <div>
                    <p className="text-[12px] text-[#717182]">Date Range</p>
                    <p className="text-[14px] font-semibold text-[#111827]">
                      {new Date(analytics.dateRange.start).toLocaleDateString()} - {new Date(analytics.dateRange.end).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#717182]">Days Passed / Total</p>
                    <p className="text-[14px] font-semibold text-[#111827]">
                      {analytics.dateRange.daysPassed} / {analytics.dateRange.days} days
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#717182]">Days Remaining</p>
                    <p className="text-[14px] font-semibold text-[#111827]">{analytics.dateRange.daysRemaining} days</p>
                  </div>
                </div>
              </div>

              {/* Section 2: KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Completion Card */}
                <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-semibold text-[#111827]">Completion</h3>
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[24px] font-bold text-[#111827] mb-1">{analytics.completion.rate}%</p>
                  <p className="text-[12px] text-[#717182] mb-2">{analytics.completion.completedTasks}/{analytics.completion.totalTasks} tasks</p>
                  <p className="text-[12px] text-[#717182]">Velocity: <span className="font-medium">{analytics.completion.velocity} tasks/day</span></p>
                  <p className={`text-[11px] mt-2 px-2 py-1 rounded inline-block ${getStatusColor(analytics.completion.pace)}`}>
                    {analytics.completion.pace}
                  </p>
                </div>

                {/* Quality Card */}
                <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-semibold text-[#111827]">Quality</h3>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[24px] font-bold text-[#111827] mb-1">{analytics.quality.score}/100</p>
                  <p className="text-[12px] text-[#717182] mb-2">Grade {analytics.quality.grade}</p>
                  <p className="text-[12px] text-[#717182]">Rejection: <span className="font-medium">{analytics.quality.rejectionRate}%</span></p>
                  <p className="text-[12px] text-[#717182]">Approval: <span className="font-medium">{analytics.quality.approvalRate}%</span></p>
                </div>

                {/* Timeline Card */}
                <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-semibold text-[#111827]">Timeline</h3>
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[24px] font-bold text-[#111827] mb-1">SPI {analytics.timeline.spi}%</p>
                  <p className="text-[12px] text-[#717182] mb-2">{analytics.timeline.status}</p>
                  <p className="text-[12px] text-[#717182]">Delay: <span className="font-medium">{Math.abs(analytics.timeline.delayDays)} days</span></p>
                  <p className="text-[12px] text-[#717182]">Extensions: <span className="font-medium">{analytics.timeline.extensions} times</span></p>
                </div>

                {/* Team Card */}
                <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-semibold text-[#111827]">Team</h3>
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[24px] font-bold text-[#111827] mb-1">{analytics.team.activeMembers}/{analytics.team.totalMembers}</p>
                  <p className="text-[12px] text-[#717182] mb-2">Active Members</p>
                  <p className="text-[12px] text-[#717182]">Productivity: <span className="font-medium">{analytics.team.productivityIndex}%</span></p>
                  <p className="text-[12px] text-[#717182]">Capacity: <span className="font-medium">{analytics.team.capacityUtilization}%</span></p>
                </div>
              </div>

              {/* Section 3: Task Breakdown Pie Chart */}
              <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
                <h2 className="text-[18px] font-semibold text-[#111827] mb-4">Task Distribution</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: analytics.completion.distribution.completed },
                          { name: 'Pending', value: analytics.completion.distribution.pending },
                          { name: 'Overdue', value: analytics.completion.distribution.overdue },
                          { name: 'Blocked', value: analytics.completion.distribution.blocked }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Section 4: Risk Assessment Panel */}
              <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
                <h2 className="text-[18px] font-semibold text-[#111827] mb-4">Risk Assessment</h2>
                <div className="mb-6 p-4 bg-gray-50 rounded-[8px]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[16px] font-semibold text-[#111827]">Overall Risk Score</h3>
                    <span className={`px-3 py-1 rounded-full text-[13px] font-semibold border ${getRiskColor(analytics.risk.level)}`}>
                      {analytics.risk.level}
                    </span>
                  </div>
                  <p className="text-[32px] font-bold text-[#111827]">{analytics.risk.overallScore}/100</p>
                  {analytics.risk.predictedDelay > 0 && (
                    <p className="text-[13px] text-red-600 mt-2">⚠️ Predicted Delay: {analytics.risk.predictedDelay} days</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Schedule Risk */}
                  <div className={`p-4 rounded-[8px] border-2 ${getRiskColor(analytics.risk.scheduleRisk.level)}`}>
                    <h4 className="text-[14px] font-semibold mb-2">Schedule Risk</h4>
                    <p className="text-[24px] font-bold mb-1">{analytics.risk.scheduleRisk.score}/100</p>
                    <span className={`px-2 py-1 rounded text-[11px] font-semibold ${getRiskColor(analytics.risk.scheduleRisk.level)}`}>
                      {analytics.risk.scheduleRisk.level}
                    </span>
                  </div>

                  {/* Quality Risk */}
                  <div className={`p-4 rounded-[8px] border-2 ${getRiskColor(analytics.risk.qualityRisk.level)}`}>
                    <h4 className="text-[14px] font-semibold mb-2">Quality Risk</h4>
                    <p className="text-[24px] font-bold mb-1">{analytics.risk.qualityRisk.score}/100</p>
                    <span className={`px-2 py-1 rounded text-[11px] font-semibold ${getRiskColor(analytics.risk.qualityRisk.level)}`}>
                      {analytics.risk.qualityRisk.level}
                    </span>
                  </div>

                  {/* Resource Risk */}
                  <div className={`p-4 rounded-[8px] border-2 ${getRiskColor(analytics.risk.resourceRisk.level)}`}>
                    <h4 className="text-[14px] font-semibold mb-2">Resource Risk</h4>
                    <p className="text-[24px] font-bold mb-1">{analytics.risk.resourceRisk.score}/100</p>
                    <span className={`px-2 py-1 rounded text-[11px] font-semibold ${getRiskColor(analytics.risk.resourceRisk.level)}`}>
                      {analytics.risk.resourceRisk.level}
                    </span>
                  </div>
                </div>

                {/* Risk Indicators */}
                {analytics.risk.indicators.length > 0 && (
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-[8px]">
                    <h4 className="text-[14px] font-semibold text-[#111827] mb-2">⚠️ Risk Indicators</h4>
                    <ul className="space-y-1">
                      {analytics.risk.indicators.map((indicator, idx) => (
                        <li key={idx} className="text-[13px] text-[#717182]">• {indicator}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {analytics.risk.recommendations.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-[8px]">
                    <h4 className="text-[14px] font-semibold text-[#111827] mb-2">💡 Recommendations</h4>
                    <ul className="space-y-1">
                      {analytics.risk.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-[13px] text-[#717182]">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Section 5: Team Contributions */}
              <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
                <h2 className="text-[18px] font-semibold text-[#111827] mb-4">Team Contributions</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.team.contributions} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="contributionPercentage" fill="#F2761B" name="Contribution %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Section 6: Team Performance Table */}
              <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
                <h2 className="text-[18px] font-semibold text-[#111827] mb-4">Team Performance Details</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-[#F2761B] text-white">
                        <th className="text-left p-3 text-[13px] font-semibold">Member</th>
                        <th className="text-left p-3 text-[13px] font-semibold">Role</th>
                        <th className="text-left p-3 text-[13px] font-semibold">Assigned</th>
                        <th className="text-left p-3 text-[13px] font-semibold">Completed</th>
                        <th className="text-left p-3 text-[13px] font-semibold">Pending</th>
                        <th className="text-left p-3 text-[13px] font-semibold">Contribution</th>
                        <th className="text-left p-3 text-[13px] font-semibold">Productivity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.team.contributions.map((member, idx) => (
                        <tr key={member.userId} className={`border-b border-[#e6e8ec] ${idx % 2 ? 'bg-[#fafafa]' : 'bg-white'}`}>
                          <td className="p-3 text-[13px] text-[#111827]">{member.name}</td>
                          <td className="p-3 text-[13px] text-[#717182]">{member.role}</td>
                          <td className="p-3 text-[13px] text-[#111827]">{member.tasksAssigned}</td>
                          <td className="p-3 text-[13px] text-[#111827]">{member.tasksCompleted}</td>
                          <td className="p-3 text-[13px] text-[#111827]">{member.tasksPending}</td>
                          <td className="p-3 text-[13px] font-semibold text-[#F2761B]">{member.contributionPercentage}%</td>
                          <td className="p-3 text-[13px] font-semibold text-[#111827]">{member.productivityScore}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 7: Trends Analysis */}
              <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
                <h2 className="text-[18px] font-semibold text-[#111827] mb-4">Trends Over Time</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.trends.completion.map((c, i) => ({
                      date: c.date,
                      Completion: c.value,
                      Quality: analytics.trends.quality[i]?.value || 0,
                      Risk: analytics.trends.riskScore[i]?.value || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Completion" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="Quality" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="Risk" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Section 8: Milestones */}
              <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
                <h2 className="text-[18px] font-semibold text-[#111827] mb-4">Project Milestones</h2>
                <div className="space-y-4">
                  {analytics.milestones.map((milestone, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        milestone.status === 'completed' ? 'bg-green-100 text-green-600' :
                        milestone.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {milestone.status === 'completed' ? '✓' : milestone.status === 'in-progress' ? '⋯' : '○'}
                      </div>
                      <div className="flex-1">
                        <p className="text-[14px] font-semibold text-[#111827]">{milestone.name}</p>
                        <p className="text-[12px] text-[#717182]">
                          {milestone.planned && `Planned: ${new Date(milestone.planned).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-semibold text-[#111827]">{milestone.progress}%</p>
                        <p className={`text-[11px] px-2 py-1 rounded ${
                          milestone.status === 'completed' ? 'bg-green-100 text-green-700' :
                          milestone.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {milestone.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 9: Issues & Blockers */}
              {analytics.issues.length > 0 && (
                <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
                  <h2 className="text-[18px] font-semibold text-[#111827] mb-4">Issues & Blockers</h2>
                  <div className="space-y-3">
                    {analytics.issues.map((issue, idx) => (
                      <div key={idx} className={`p-4 rounded-[8px] border-2 ${
                        issue.severity === 'HIGH' ? 'bg-red-50 border-red-200' :
                        issue.severity === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-[11px] font-semibold ${
                              issue.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                              issue.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {issue.severity}
                            </span>
                            <span className="text-[13px] font-semibold text-[#111827]">{issue.type}</span>
                          </div>
                        </div>
                        <p className="text-[13px] text-[#111827] mb-2">{issue.description}</p>
                        <p className="text-[12px] text-[#717182] mb-1">Impact: {issue.impact}</p>
                        <p className="text-[12px] text-[#717182]">Action: {issue.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 10: Comparison */}
              <div className="bg-white rounded-[12px] border border-[#e6e8ec] p-4 md:p-6 shadow-sm mb-6">
                <h2 className="text-[18px] font-semibold text-[#111827] mb-4">Comparative Analytics</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left p-3 text-[13px] font-semibold">Metric</th>
                        <th className="text-left p-3 text-[13px] font-semibold">This Project</th>
                        <th className="text-left p-3 text-[13px] font-semibold">Team Average</th>
                        <th className="text-left p-3 text-[13px] font-semibold">Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[#e6e8ec]">
                        <td className="p-3 text-[13px] font-medium">Completion</td>
                        <td className="p-3 text-[13px]">{analytics.comparison.thisProject.completion.toFixed(1)}%</td>
                        <td className="p-3 text-[13px]">{analytics.comparison.teamAverage.completion}%</td>
                        <td className={`p-3 text-[13px] font-semibold ${analytics.comparison.variance.completion >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {analytics.comparison.variance.completion >= 0 ? '+' : ''}{analytics.comparison.variance.completion.toFixed(1)}%
                        </td>
                      </tr>
                      <tr className="border-b border-[#e6e8ec] bg-[#fafafa]">
                        <td className="p-3 text-[13px] font-medium">Quality Score</td>
                        <td className="p-3 text-[13px]">{analytics.comparison.thisProject.quality}/100</td>
                        <td className="p-3 text-[13px]">{analytics.comparison.teamAverage.quality}/100</td>
                        <td className={`p-3 text-[13px] font-semibold ${analytics.comparison.variance.quality >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {analytics.comparison.variance.quality >= 0 ? '+' : ''}{analytics.comparison.variance.quality}
                        </td>
                      </tr>
                      <tr className="border-b border-[#e6e8ec]">
                        <td className="p-3 text-[13px] font-medium">SPI</td>
                        <td className="p-3 text-[13px]">{analytics.comparison.thisProject.spi.toFixed(1)}%</td>
                        <td className="p-3 text-[13px]">{analytics.comparison.teamAverage.spi}%</td>
                        <td className={`p-3 text-[13px] font-semibold ${analytics.comparison.variance.spi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {analytics.comparison.variance.spi >= 0 ? '+' : ''}{analytics.comparison.variance.spi.toFixed(1)}%
                        </td>
                      </tr>
                      <tr className="bg-[#fafafa]">
                        <td className="p-3 text-[13px] font-medium">Velocity</td>
                        <td className="p-3 text-[13px]">{analytics.comparison.thisProject.velocity.toFixed(2)}</td>
                        <td className="p-3 text-[13px]">{analytics.comparison.teamAverage.velocity}</td>
                        <td className={`p-3 text-[13px] font-semibold ${analytics.comparison.variance.velocity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {analytics.comparison.variance.velocity >= 0 ? '+' : ''}{analytics.comparison.variance.velocity.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-[8px]">
                  <p className="text-[13px] text-[#717182]">
                    Performance Summary: <span className="font-semibold text-[#111827]">
                      {analytics.comparison.betterWorse.better} metrics better, {analytics.comparison.betterWorse.worse} metrics worse than team average
                    </span>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectAnalyticsPage
