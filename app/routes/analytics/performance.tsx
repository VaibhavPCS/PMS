// frontend/app/routes/analytics/performance.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useProjectAnalytics } from "@/features/analytics/hooks";
import { useSearchParams } from "react-router";
import { DateRangeFilter } from "@/features/analytics/components/DateRangeFilter";
import { VelocityChart } from "@/features/analytics/components/VelocityChart";
import { useEffect } from "react";
import { useFilter } from '@/features/analytics/context/FilterContext';
import { fetchData } from '@/lib/fetch-util';
import { WorkspaceProjectSelector } from '@/features/analytics/components/WorkspaceProjectSelector';
import axios from "@/lib/axios";
import { useAuth } from "../../provider/auth-context";
import { useRole } from "@/features/analytics/context/RoleContext";

const Performance = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { selectedRole } = useRole();
  const roleStr = String(selectedRole || '');

  // ✅ Get selected workspace and project (IDs and names) from FilterContext
  const {
    selectedWorkspaceId,
    selectedProjectId,
    selectedWorkspaceName,
    selectedProjectName,
    setSelectedWorkspace,
    setSelectedProject
  } = useFilter();
  const projectsCount = Number(sessionStorage.getItem('analyticsProjectsCount') || '0');

  // Get date range from URL params or use defaults
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  // ✅ Use selectedProjectId from FilterContext (falls back to hardcoded if not selected)
  const projectId = selectedProjectId || "";

  // ✅ Sync selection from URL (?projectId=...) when navigating from workspace list
  useEffect(() => {
    const urlProjectId = searchParams.get('projectId');
    if (!urlProjectId) return;
    if (selectedProjectId === urlProjectId) return;

    (async () => {
      try {
        const detail = await fetchData<{ project: { _id: string; title: string; workspace: { _id: string; name: string } } }>(`/projects/${urlProjectId}`);
        const wsId = detail.project.workspace?._id as string;
        const wsName = detail.project.workspace?.name as string;
        setSelectedWorkspace(wsId, wsName || null);
        setSelectedProject(urlProjectId, detail.project.title || null);
      } catch {
        setSelectedProject(urlProjectId, null);
      }
    })();
  }, [searchParams, selectedProjectId, setSelectedWorkspace, setSelectedProject]);

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useProjectAnalytics({
    projectId,
    startDate,
    endDate,
  });

  const downloadProjectExcel = async () => {
    try {
      const pid = selectedProjectId || (data?.project?._id as string) || '';
      if (!pid) { alert('Please select a project first'); return; }
      const url = `/analytics/export/project/${pid}/excel${startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : ''}`;
      const resp = await axios.get(url, { responseType: 'blob' });
      const blob = new Blob([resp.data], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const name = data?.project?.title ? data.project.title.replace(/[^a-z0-9\- ]/gi, '') : pid;
      link.download = `project-${name}-analytics.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      console.error(e);
      alert('Failed to download Excel. Please try again.');
    }
  };

  // Restrict project selection for project leads to only their projects
  useEffect(() => {
    const restrictProjectsForLead = async () => {
      const leaderId = (user as any)?._id || (user as any)?.id || (user as any)?.userId;
      if (roleStr !== 'project_lead' || !leaderId) return;
      try {
        const resp = await axios.get(`/analytics/leaders/${leaderId}/projects`);
        const allowed = (resp.data?.projects || []).map((p: any) => ({ id: p.projectId, name: p.name }));
        if (allowed.length === 0) return;
        const current = selectedProjectId;
        const exists = allowed.some((p: any) => p.id === current);
        if (!exists) {
          // pick first allowed project
          const first = allowed[0];
          setSelectedProject(first.id, first.name);
        }
      } catch (e) {
        // ignore – backend will enforce anyway
      }
    };
    restrictProjectsForLead();
  }, [roleStr, user, selectedProjectId, setSelectedProject]);

  const downloadProjectCsv = async () => {
    try {
      const pid = selectedProjectId || (data?.project?._id as string) || '';
      if (!pid) { alert('Please select a project first'); return; }
      const url = `/analytics/export/project/${pid}${startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : ''}`;
      const resp = await axios.get(url, { responseType: 'blob' });
      const blob = new Blob([resp.data], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const name = data?.project?.title ? data.project.title.replace(/[^a-z0-9\- ]/gi, '') : pid;
      link.download = `project-${name}-analytics.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      console.error(e);
      alert('Failed to download CSV. Please try again.');
    }
  };

  // Handle date range change
  const handleDateRangeChange = (newStartDate: string, newEndDate: string) => {
    // console.log("Date range changed:", { newStartDate, newEndDate });
  };

  // ✅ ALWAYS SHOW HEADER WITH DATE FILTER (even during loading/error/no-data)
  const renderHeader = () => (
    <div className="flex flex-col gap-4 mb-6">
      {/* Title Section */}
      <div className="flex flex-col gap-2">
        <h2 className="text-[18px] md:text-xl font-semibold text-gray-900 font-['Inter']">Performance Metrics</h2>
        <p className="text-[13px] md:text-sm text-gray-600 font-['Inter']">
          Project: <span className="font-medium">{data?.project?.title || selectedProjectName || '...'}</span>
          {data?.totalTasks !== undefined && (
            <span className="ml-2 text-gray-500">({data.totalTasks} tasks)</span>
          )}
        </p>
        {/* ✅ Show selected workspace/project names instead of IDs */}
        {selectedWorkspaceName && (
          <p className="text-[12px] md:text-xs text-gray-500 font-['Inter']">
            Workspace: <span className="font-medium">{selectedWorkspaceName || '...'}</span>
            {selectedProjectName && selectedProjectName !== 'All Projects' && (
              <> | Project: <span className="font-medium">{selectedProjectName}</span></>
            )}
          </p>
        )}
      </div>

      {/* Filters and Actions Section */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-2">
        {/* Workspace/Project Selectors - Full width on mobile, auto width on desktop */}
        {(roleStr === 'admin' || roleStr === 'super_admin') && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-3 w-full md:w-auto">
            <WorkspaceProjectSelector />
          </div>
        )}
        {roleStr === 'project_lead' && (
          <div className="text-[12px] md:text-xs text-gray-500 font-['Inter']">Restricted: showing your projects only</div>
        )}

        {/* Date Range Filter and Download Button */}
        <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full md:w-auto md:ml-auto">
          <DateRangeFilter onChange={handleDateRangeChange} />
          <Button
            onClick={downloadProjectExcel}
            className="w-full sm:w-auto bg-[#F2761B] hover:bg-[#F2761B]/90 text-white font-['Inter'] whitespace-nowrap"
          >
            Download Excel
          </Button>
        </div>
      </div>
    </div>
  );

  // ✅ Show message if no workspace/project selected
  if (!selectedWorkspaceId && !selectedProjectId) {
    return (
      <div className="space-y-4">
        {renderHeader()}
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">No Workspace Selected</p>
            <p className="text-gray-500 text-sm mb-4">
              Please select a workspace and project from the filters above to view performance metrics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedProjectId && selectedWorkspaceId && projectsCount === 0) {
    return (
      <div className="space-y-4">
        {renderHeader()}
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">No Project Found</p>
            <p className="text-gray-500 text-sm">
              This workspace has no projects accessible to you.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {renderHeader()}
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading performance metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {renderHeader()}
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium mb-2">Failed to load performance data</p>
            <p className="text-gray-600 text-sm mb-4">{error.message}</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.analytics) {
    return (
      <div className="space-y-4">
        {renderHeader()}
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">No Analytics Data Available</p>
            <p className="text-gray-500 text-sm mb-4">
              This project has no tasks in the selected date range.
            </p>
            <p className="text-gray-500 text-sm">
              Try selecting a different date range or project above.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ✅ Header with Date Filter - Always visible */}
      {renderHeader()}

      <VelocityChart
        data={data.analytics.overall.velocity.timeSeries || []}
        isLoading={isFetching}
      />
      {/* <Card>
        <CardHeader>
          <CardTitle>Velocity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-[#e6e8ec] rounded">
              <thead>
                <tr className="bg-[#F2761B] text-white">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Tasks Created</th>
                  <th className="text-left p-2">Tasks Completed</th>
                </tr>
              </thead>
              <tbody>
                {(data.analytics.overall.velocity.timeSeries || []).map((v:any, idx:number) => (
                  <tr key={idx} className={idx % 2 ? 'bg-[#fafafa]' : ''}>
                    <td className="p-2">{new Date(v.date).toLocaleDateString()}</td>
                    <td className="p-2">{v.tasksCreated}</td>
                    <td className="p-2">{v.tasksCompleted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card> */}

      {/* Existing Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Overall Metrics Card */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Tasks:</span>
                <span className="font-semibold text-lg">{data?.analytics.overall.totalTasks || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Completed Tasks:</span>
                <span className="font-semibold text-lg text-green-600">
                  {data?.analytics.overall.completedTasks || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Completion Rate:</span>
                <span className="font-semibold text-lg text-blue-600">
                  {data?.analytics.overall.completionRate.toFixed(1) || 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Duration:</span>
                <span className="font-semibold text-lg">
                  {data?.analytics.overall.averageDuration.toFixed(1) || 0} days
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Velocity Card */}
        <Card>
          <CardHeader>
            <CardTitle>Task Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Last 7 Days:</span>
                <span className="font-semibold text-lg text-blue-600">
                  {data?.analytics.overall.velocity.weekly || 0} tasks
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Last 30 Days:</span>
                <span className="font-semibold text-lg text-blue-600">
                  {data?.analytics.overall.velocity.monthly || 0} tasks
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Analysis Card */}
        <Card>
          <CardHeader>
            <CardTitle>Overdue Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Overdue Tasks:</span>
                <span className="font-semibold text-lg text-red-600">
                  {data?.analytics.overall.overdueTasks || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Overdue Percentage:</span>
                <span className="font-semibold text-lg text-red-600">
                  {data?.analytics.overall.overduePercentage.toFixed(1) || 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Card */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.analytics.overall.statusDistribution &&
                Object.entries(data.analytics.overall.statusDistribution).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${status === 'done' ? 'bg-green-500' :
                          status === 'in-progress' ? 'bg-blue-500' :
                            'bg-gray-400'
                        }`} />
                      <span className="text-gray-600 capitalize">{status.replace('-', ' ')}:</span>
                    </div>
                    <span className="font-semibold">{count as number}</span>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution Card */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.analytics.overall.priorityDistribution &&
                Object.entries(data.analytics.overall.priorityDistribution).map(([priority, count]) => (
                  <div key={priority} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${priority === 'high' ? 'bg-red-500' :
                          priority === 'medium' ? 'bg-amber-500' :
                            'bg-blue-500'
                        }`} />
                      <span className="text-gray-600 capitalize">{priority}:</span>
                    </div>
                    <span className="font-semibold">{count as number}</span>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>

        {/* Completion Time by Priority Card */}
        <Card>
          <CardHeader>
            <CardTitle>Avg. Completion Time by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.analytics.overall.completionTimeByPriority &&
                Object.entries(data.analytics.overall.completionTimeByPriority).map(([priority, time]) => (
                  <div key={priority} className="flex justify-between items-center">
                    <span className="text-gray-600 capitalize">{priority}:</span>
                    <span className="font-semibold">
                      {time === 0 ? 'N/A' : `${(time as number).toFixed(1)} days`}
                    </span>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Analytics */}
      {data?.analytics.categories && Object.keys(data.analytics.categories).length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Analytics</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(data.analytics.categories).map(([categoryName, categoryData]: [string, any]) => (
              <Card key={categoryName}>
                <CardHeader>
                  <CardTitle className="text-base">{categoryName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tasks:</span>
                      <span className="font-semibold">{categoryData.totalTasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-semibold text-green-600">{categoryData.completedTasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completion Rate:</span>
                      <span className="font-semibold text-blue-600">
                        {categoryData.completionRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Performance;
