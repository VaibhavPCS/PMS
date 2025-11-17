import React, { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/provider/auth-context'

const ProjectManagement = () => {
  const navigate = useNavigate()
  const { user } = useAuth() as any

  useEffect(() => {
    const role = String((user?.role || user?.roleName || ''))
    const isAdmin = role === 'admin' || role === 'super_admin'
    if (!isAdmin) {
      navigate('/analytics/personal', { replace: true })
    }
  }, [user, navigate])
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[20px] font-semibold text-[#1f2937]">Analytics</h1>
          <p className="text-[#717182] text-[13px]">Administration ▸ Project Management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="/administration/project-management/user-export" className="block bg-white rounded-[8px] border border-[#e6e8ec] p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827] mb-1">User Productivity Export</h2>
                <p className="text-[#717182] text-[13px]">Download productivity for a user via CSV/PDF with date range.</p>
              </div>
              {/* <span className="text-[#717182] text-[12px]">/analytics/export/user/{'{userId}'}</span> */}
            </div>
          </a>

          <a href="/administration/project-management/employee-performance" className="block bg-white rounded-[8px] border border-[#e6e8ec] p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827] mb-1">Employee Performance Analytics</h2>
                <p className="text-[#717182] text-[13px]">View performance snapshots with date filters; latest snapshot highlights KPIs.</p>
              </div>
            </div>
          </a>

          <a href="/administration/project-management/task-lifecycle" className="block bg-white rounded-[8px] border border-[#e6e8ec] p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827] mb-1">Task Lifecycle Analytics</h2>
                <p className="text-[#717182] text-[13px]">Select workspace → project → task, then download lifecycle CSV with charts & tables.</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

export default ProjectManagement