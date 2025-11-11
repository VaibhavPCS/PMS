import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle, FolderOpen, Users, TrendingUp } from "lucide-react";
import { useWorkspaceAnalytics } from "@/features/analytics/hooks";
import { WorkloadChart } from "@/features/analytics/components/WorkloadChart";
import { useEffect, useState } from "react";
import { Link } from "react-router";

const Workspace = () => {
  const [workspaceId, setWorkspaceId] = useState<string>("");

  useEffect(() => {
    const currentWorkspaceId = localStorage.getItem("currentWorkspaceId");
    if (currentWorkspaceId) {
      setWorkspaceId(currentWorkspaceId);
    }
  }, []);

  const { 
    data, 
    isLoading, 
    error, 
    refetch,
    isFetching 
  } = useWorkspaceAnalytics(workspaceId);

  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600">No workspace selected</p>
          <p className="text-sm text-gray-500 mt-2">Please select a workspace to view analytics</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Workspace Intelligence</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading workspace analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Workspace Intelligence</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium mb-2">Failed to load workspace data</p>
            <p className="text-gray-600 text-sm mb-4">{error.message}</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Workspace Intelligence</h2>
          <p className="text-sm text-gray-600">
            Overview of workspace activity and team workload
          </p>
        </div>
        <Button 
          onClick={() => refetch()} 
          disabled={isFetching}
          variant="outline"
          size="default"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Completion Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {data?.overallCompletionRate?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all active projects
            </p>
          </CardContent>
        </Card>

        {/* Active Projects Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {data?.activeProjects?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently in progress
            </p>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {data?.workloadDistribution?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              With assigned tasks
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data?.activeProjects && data.activeProjects.length > 0 ? (
                data.activeProjects.map((project) => (
                  <Link
                    key={project.projectId}
                    to={`/analytics?projectId=${project.projectId}`}
                    className="block p-3 bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{project.projectName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Click to view detailed analytics
                        </p>
                      </div>
                      <svg 
                        className="w-5 h-5 text-gray-400" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M9 5l7 7-7 7" 
                        />
                      </svg>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No active projects</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Workload Distribution Chart */}
        <WorkloadChart 
          data={data?.workloadDistribution || []} 
          isLoading={isFetching}
        />
      </div>

      {/* Last Updated */}
      {data?.lastUpdatedAt && (
        <div className="text-xs text-gray-500 text-right">
          Last updated: {new Date(data.lastUpdatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default Workspace;
