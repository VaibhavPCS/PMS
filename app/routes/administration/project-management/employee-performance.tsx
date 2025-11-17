import React, { useEffect, useState } from 'react'
import axios from '../../../lib/axios'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover'
import { Calendar } from '../../../components/ui/calendar'
import { format } from 'date-fns'
import MetricsCards from '@/features/analytics/components/MetricsCards'
import TaskDistributionChart from '@/features/analytics/components/TaskDistributionChart'
import ApprovalMetricsChart from '@/features/analytics/components/ApprovalMetricsChart'
import TimeMetricsChart from '@/features/analytics/components/TimeMetricsChart'
import ProjectInvolvementTable from '@/features/analytics/components/ProjectInvolvementTable'
import { Card } from '@/components/ui/card'

type Employee = { userId: string; userName: string }

const EmployeePerformancePage = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [userId, setUserId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await axios.get('/analytics/users')
        const list: Employee[] = (res.data?.users || [])
        setEmployees(list)
        if (list.length > 0) setUserId(list[0].userId)
      } catch (e) {}
    }
    loadUsers()
  }, [])

  useEffect(() => {
    const fetchPerf = async () => {
      if (!userId) return
      try {
        setLoading(true); setError('')
        const params: any = { period: 'daily' }
        if (startDate) params.startDate = startDate
        if (endDate) params.endDate = endDate
        const { data } = await axios.get(`/analytics/employee/${userId}/performance`, { params })
        setSnapshots(data.snapshots || [])
      } catch (e: any) {
        setError('Failed to load performance')
      } finally { setLoading(false) }
    }
    fetchPerf()
  }, [userId, startDate, endDate])

  const latest = snapshots?.[0] || { metrics: {}, projects: [], trends: {} }
  const canAnalyze = !!userId && !!startDate && !!endDate

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[20px] font-semibold text-[#1f2937]">Employee Performance</h1>
          <p className="text-[#717182] text-[13px]">Select a user and date range; latest snapshot in range powers KPIs.</p>
        </div>

        <div className="bg-white rounded-[8px] border border-[#e6e8ec] p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[12px] text-[#717182] mb-1">User</label>
              <select className="w-full border rounded px-3 py-2 text-[14px]" value={userId} onChange={e=>setUserId(e.target.value)} disabled={loading}>
                {employees.map(e => (<option key={e.userId} value={e.userId}>{e.userName}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-[#717182] mb-1">Start Date</label>
              <Popover>
                <PopoverTrigger className="w-full border rounded px-3 py-2 text-left text-[14px]">
                  {startDate ? format(new Date(startDate), 'dd-MM-yyyy') : 'Pick start date'}
                </PopoverTrigger>
                <PopoverContent className="p-2">
                  <Calendar mode="single" selected={startDate ? new Date(startDate) : undefined} onSelect={(d)=>setStartDate(d ? format(new Date(d), 'yyyy-MM-dd') : '')} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="block text-[12px] text-[#717182] mb-1">End Date</label>
              <Popover>
                <PopoverTrigger className="w-full border rounded px-3 py-2 text-left text-[14px]">
                  {endDate ? format(new Date(endDate), 'dd-MM-yyyy') : 'Pick end date'}
                </PopoverTrigger>
                <PopoverContent className="p-2">
                  <Calendar mode="single" selected={endDate ? new Date(endDate) : undefined} onSelect={(d)=>setEndDate(d ? format(new Date(d), 'yyyy-MM-dd') : '')} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <button disabled={!canAnalyze || loading} className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 has-[>svg]:px-3 bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[15px] py-[10px] h-auto rounded-[8px] text-[14px] font-medium font-['Inter']">Analyze</button>
            <button type="button" onClick={()=>{ setStartDate(''); setEndDate(''); }} className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border border-[#F2761B] text-[#F2761B] hover:bg-[#fff7ed] px-[15px] py-[10px] h-auto rounded-[8px] text-[14px] font-medium font-['Inter']">Clear Dates</button>
          </div>
        </div>

        {canAnalyze && (
          <div className="mt-6 space-y-6">
            <MetricsCards metrics={latest.metrics} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4"><TaskDistributionChart metrics={latest.metrics} /></Card>
              <Card className="p-4"><ApprovalMetricsChart metrics={latest.metrics} /></Card>
            </div>
            <Card className="p-4"><TimeMetricsChart snapshots={snapshots} /></Card>
            <Card className="p-4"><ProjectInvolvementTable projects={latest.projects} /></Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default EmployeePerformancePage