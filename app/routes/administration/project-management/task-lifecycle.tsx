import React, { useEffect, useState } from 'react'
import axios from '../../../lib/axios'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

type Project = { _id: string; title: string }
type Task = { _id: string; title: string }
type Workspace = { _id: string; name: string }

const TaskLifecyclePage = () => {
  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string>('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskId, setTaskId] = useState<string>('')
  const [timeline, setTimeline] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>({})
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    const init = async () => {
      try {
        const wsLocal = localStorage.getItem('currentWorkspaceId') || ''
        // Load user workspaces
        const me = await axios.get('/auth/me')
        const wps: Workspace[] = (me.data?.user?.workspaces || me.data?.workspaces || []).map((w: any) => ({ _id: w.workspaceId?._id || w._id || w.id, name: w.workspaceId?.name || w.name }))
        setWorkspaces(wps)
        if (wsLocal && wps.find(w => w._id === wsLocal)) {
          setWorkspaceId(wsLocal)
        } else if (wps.length > 0) {
          setWorkspaceId(wps[0]._id)
          localStorage.setItem('currentWorkspaceId', wps[0]._id)
        }
      } catch {}
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
          // If current project is not in new list, reset to first
          const exists = ps.some(p => p._id === projectId)
          setProjectId(exists ? projectId : ps[0]._id)
        } else {
          setProjectId('')
        }
      } catch {}
    }
    loadProjects()
  }, [workspaceId])

  useEffect(() => {
    const loadTasks = async () => {
      if (!projectId) return
      const valid = projects.some(p => p._id === projectId)
      const isObjectId = /^[a-f\d]{24}$/i.test(projectId)
      if (!valid || !isObjectId) {
        setTasks([])
        setTaskId('')
        return
      }
      try {
        const res = await axios.get(`/task/project/${projectId}`)
        const ts: Task[] = (res.data?.tasks || []).map((t: any) => ({ _id: t._id, title: t.title }))
        setTasks(ts)
        if (ts.length > 0) setTaskId(ts[0]._id)
      } catch (err:any) {
        console.warn('Failed to load tasks for project', projectId, err?.response?.status)
        setTasks([])
        setTaskId('')
      }
    }
    loadTasks()
  }, [projectId, projects])

  useEffect(() => {
    const loadLifecycle = async () => {
      if (!taskId) return
      try {
        setLoading(true)
        const res = await axios.get(`/analytics/task/${taskId}/lifecycle`)
        setTimeline(res.data?.timeline || [])
        setMetrics(res.data?.metrics || {})
      } catch {}
      finally { setLoading(false) }
    }
    loadLifecycle()
  }, [taskId])

  const canDownload = !!workspaceId && !!projectId && !!taskId

  const downloadCsv = async () => {
    if (!canDownload) return
    const resp = await axios.get(`/analytics/export/task/${taskId}/lifecycle`, { responseType: 'blob' })
    const blob = new Blob([resp.data], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `task-${taskId}-lifecycle.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
  }

  const chartData = timeline.map((e: any) => ({
    date: new Date(e.timestamp).toLocaleString(),
    Approved: e.eventType === 'approved' ? 1 : 0,
    Completed: e.eventType === 'completed' ? 1 : 0,
    Assigned: e.eventType === 'assigned' ? 1 : 0,
    Created: e.eventType === 'created' ? 1 : 0,
    Reassigned: e.eventType === 'reassigned' ? 1 : 0,
  }))

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[20px] font-semibold text-[#1f2937]">Task Lifecycle</h1>
          <p className="text-[#717182] text-[13px]">Administration ▸ Project Management ▸ Task Lifecycle</p>
        </div>

        <div className="bg-white rounded-[8px] border border-[#e6e8ec] p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[12px] text-[#717182] mb-1">Workspace</label>
              <select className="w-full border rounded px-3 py-2 text-[14px]" value={workspaceId} onChange={e=>{ const v = e.target.value; setWorkspaceId(v); localStorage.setItem('currentWorkspaceId', v); setProjectId(''); setTasks([]); setTaskId(''); }}>
                {workspaces.map(w => (<option key={w._id} value={w._id}>{w.name || w._id}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-[#717182] mb-1">Project</label>
              <select className="w-full border rounded px-3 py-2 text-[14px]" value={projectId} onChange={e=>setProjectId(e.target.value)} disabled={!workspaceId}>
                {projects.map(p => (<option key={p._id} value={p._id}>{p.title}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-[#717182] mb-1">Task</label>
              <select className="w-full border rounded px-3 py-2 text-[14px]" value={taskId} onChange={e=>setTaskId(e.target.value)} disabled={!projectId || tasks.length === 0}>
                {tasks.map(t => (<option key={t._id} value={t._id}>{t.title}</option>))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={downloadCsv} disabled={!canDownload || loading} className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 has-[>svg]:px-3 bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[15px] py-[10px] h-auto rounded-[8px] text-[14px] font-medium font-['Inter']">Download CSV</button>
          </div>
        </div>

        <div className="bg-white rounded-[8px] border border-[#e6e8ec] p-4 mt-6">
          <div className="mb-2">
            <div className="leading-none font-semibold">Task Timeline Chart</div>
            <p className="text-sm text-gray-600">Events over time (Created, Assigned, Completed, Approved, Reassigned)</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" label={{ value: 'Timestamp', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Event Occurrence', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Created" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Assigned" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="Approved" stroke="#6366f1" strokeWidth={2} />
                <Line type="monotone" dataKey="Reassigned" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[8px] border border-[#e6e8ec] p-4 mt-6">
          <div className="mb-2">
            <div className="leading-none font-semibold">Task Timeline Table</div>
            <p className="text-sm text-gray-600">Event details with actors, changes and metadata</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-[#e6e8ec] rounded">
              <thead>
                <tr className="bg-[#F2761B] text-white">
                  <th className="text-left p-2">Timestamp</th>
                  <th className="text-left p-2">Event</th>
                  <th className="text-left p-2">Actor</th>
                  <th className="text-left p-2">Task Status</th>
                  <th className="text-left p-2">Field</th>
                  <th className="text-left p-2">Old → New</th>
                  <th className="text-left p-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const sorted = [...timeline].sort((a:any,b:any)=> new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                  const isId = (v:any) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v)
                  const fmt = (v:any) => {
                    if (v === null || v === undefined || v === '') return '—'
                    return isId(v) ? '—' : String(v)
                  }
                  let currStatus = 'to-do'
                  return sorted.map((e:any, idx:number) => {
                    if (e.changes?.field === 'status') {
                      currStatus = String(e.changes?.newValue || currStatus)
                    } else if (e.eventType === 'completed') {
                      currStatus = 'done'
                    } else if (e.eventType === 'assigned' && !currStatus) {
                      currStatus = 'to-do'
                    }
                    return (
                      <tr key={idx} className={idx % 2 ? 'bg-[#fafafa]' : ''}>
                        <td className="p-2">{new Date(e.timestamp).toLocaleString()}</td>
                        <td className="p-2">{e.eventType}</td>
                        <td className="p-2">{e.actor?.name || '—'}</td>
                        <td className="p-2">{currStatus}</td>
                        <td className="p-2">{e.changes?.field || '—'}</td>
                        <td className="p-2">{fmt(e.changes?.oldValue)} → {fmt(e.changes?.newValue)}</td>
                        <td className="p-2">{e.metadata?.ipAddress || '—'}</td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

export default TaskLifecyclePage