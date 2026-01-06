import React, { useEffect } from 'react'
import { useNavigate, Link } from 'react-router'
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
          <p className="text-[#717182] text-[13px]">Administration Project Management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/administration/project-management/user-export" className="block bg-white rounded-[8px] border border-[#e6e8ec] p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827] mb-1">User Productivity Export</h2>
                <p className="text-[#717182] text-[13px]">Download productivity for a user via CSV with date range.</p>
              </div>
              {/* <span className="text-[#717182] text-[12px]">/analytics/export/user/{'{userId}'}</span> */}
            </div>
          </Link>

          {/* <Link to="/administration/project-management/project-analytics" className="block bg-white rounded-[8px] border border-[#e6e8ec] p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827] mb-1">Project Analytics</h2>
                <p className="text-[#717182] text-[13px]">Analyze a project's health, velocity, risk, and export CSV.</p>
              </div>
            </div>
          </Link> */}

          {/* <a href="/administration/project-management/employee-performance" className="block bg-white rounded-[8px] border border-[#e6e8ec] p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827] mb-1">Employee Performance Analytics</h2>
                <p className="text-[#717182] text-[13px]">View performance snapshots with date filters; latest snapshot highlights KPIs.</p>
              </div>
            </div>
          </a> */}

          <Link to="/administration/project-management/task-lifecycle" className="block bg-white rounded-[8px] border border-[#e6e8ec] p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827] mb-1">Task Lifecycle Analytics</h2>
                <p className="text-[#717182] text-[13px]">Download the lifecycle of the Task in the CSV format.</p>
              </div>
            </div>
          </Link>

          <Link to="/administration/project-management/workspace-report" className="block bg-white rounded-[8px] border border-[#e6e8ec] p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827] mb-1">Workspace Comprehensive Report</h2>
                <p className="text-[#717182] text-[13px]">Analyze workspace-wide metrics with timeline, per-project breakdowns, and download styled Excel.</p>
              </div>
            </div>
          </Link>

          <Link to="/administration/project-management/report-screen" className="block bg-white rounded-[8px] border border-[#e6e8ec] p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111827] mb-1">Project Live Report</h2>
                <p className="text-[#717182] text-[13px]">Real-time project insights with status breakdown, member performance, and cascading filters.</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ProjectManagement
