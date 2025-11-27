import React, { useEffect, useState } from 'react'
import axios from '../../../lib/axios'
import { Calendar } from '../../../components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover'
import { format } from 'date-fns'

type Employee = { userId: string; userName: string }

const UserExportPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [userId, setUserId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

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
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-[20px] font-semibold text-[#1f2937] mb-2">User Productivity Export</h1>
        <p className="text-[#717182] text-[13px] mb-6">Select a user and date range, then download as Excel (CSV) or PDF.</p>

        <div className="bg-white rounded-[8px] border border-[#e6e8ec] p-4 space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] text-[#717182] mb-1">User</label>
              <select className="w-full border rounded px-3 py-2 text-[14px]" value={userId} onChange={e => setUserId(e.target.value)} disabled={loading}>
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
                  <Calendar
                    mode="single"
                    selected={startDate ? new Date(startDate) : undefined}
                    onSelect={(d) => setStartDate(d ? format(new Date(d), 'yyyy-MM-dd') : '')}
                  />
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
                  <Calendar
                    mode="single"
                    selected={endDate ? new Date(endDate) : undefined}
                    onSelect={(d) => setEndDate(d ? format(new Date(d), 'yyyy-MM-dd') : '')}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <button
              onClick={() => download('excel')}
              disabled={!canDownload || loading}
              className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive has-[>svg]:px-3 bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[15px] py-[10px] h-auto rounded-[8px] text-[14px] font-medium font-['Inter'] flex items-center gap-[10px]"
            >
              Download Excel
            </button>
            {/* <button
              onClick={() => download('pdf')}
              disabled={!canDownload || loading}
              className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive has-[>svg]:px-3 bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[15px] py-[10px] h-auto rounded-[8px] text-[14px] font-medium font-['Inter'] flex items-center gap-[10px]"
            >
              Download PDF
            </button> */}
            <button
              type="button"
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border border-[#F2761B] text-[#F2761B] hover:bg-[#fff7ed] px-[15px] py-[10px] h-auto rounded-[8px] text-[14px] font-medium font-['Inter']"
            >
              Clear Dates
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserExportPage