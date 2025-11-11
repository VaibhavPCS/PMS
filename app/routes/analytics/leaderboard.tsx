import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Trophy,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useLeaderboardAnalytics } from "@/features/analytics/hooks";
import { useState } from "react";
import { useNavigate } from "react-router";
import { format } from "date-fns";

type SortField = "projectName" | "completionPercentage" | "dueDate" | "status";
type SortDirection = "asc" | "desc";

const Leaderboard = () => {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>("completionPercentage");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const { data, isLoading, error, refetch, isFetching } =
    useLeaderboardAnalytics();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortedData = () => {
    if (!data?.leaderboard) return [];

    return [...data.leaderboard].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "projectName":
          comparison = a.projectName.localeCompare(b.projectName);
          break;
        case "completionPercentage":
          comparison = a.completionPercentage - b.completionPercentage;
          break;
        case "dueDate":
          comparison =
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "On Track":
        return "text-green-700 bg-green-50 border-green-200";
      case "At Risk":
        return "text-amber-700 bg-amber-50 border-amber-200";
      case "Off Track":
        return "text-red-700 bg-red-50 border-red-200";
      case "Completed":
        return "text-blue-700 bg-blue-50 border-blue-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return "bg-green-500";
    if (percentage >= 50) return "bg-blue-500";
    if (percentage >= 25) return "bg-amber-500";
    return "bg-red-500";
  };

  const handleRowClick = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Project Leaderboard
          </h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Project Leaderboard
          </h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium mb-2">
              Failed to load leaderboard
            </p>
            <p className="text-gray-600 text-sm mb-4">{error.message}</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const sortedData = getSortedData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Project Leaderboard
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {data?.totalProjects || 0} projects ranked by completion
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          variant="outline"
          size="default"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Rankings</CardTitle>
          <p className="text-sm text-gray-600">
            Click on any project to view details
          </p>
        </CardHeader>
        <CardContent>
          {sortedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Trophy className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium">No Projects Found</p>
              <p className="text-gray-500 text-sm mt-2">
                Projects will appear here once they are created and tracked
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("projectName")}
                    >
                      <div className="flex items-center gap-1">
                        Project Name
                        {sortField === "projectName" &&
                          (sortDirection === "asc" ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead>Project Head</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {sortField === "status" &&
                          (sortDirection === "asc" ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("completionPercentage")}
                    >
                      <div className="flex items-center gap-1">
                        Completion %
                        {sortField === "completionPercentage" &&
                          (sortDirection === "asc" ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("dueDate")}
                    >
                      <div className="flex items-center gap-1">
                        Due Date
                        {sortField === "dueDate" &&
                          (sortDirection === "asc" ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          ))}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((project, index) => (
                    <TableRow
                      key={project.projectId}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleRowClick(project.projectId)}
                    >
                      <TableCell className="font-medium text-gray-500">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {project.projectName}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {project.projectHead.userName}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}
                        >
                          {project.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[200px]">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                              {project.completionPercentage}%
                            </span>
                          </div>
                          <Progress
                            value={project.completionPercentage}
                            className="h-2"
                            indicatorClassName={getProgressColor(
                              project.completionPercentage
                            )}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {(() => {
                          // Parse UTC date and format without timezone conversion
                          const date = new Date(project.dueDate);
                          const year = date.getUTCFullYear();
                          const month = date.getUTCMonth();
                          const day = date.getUTCDate();
                          const localDate = new Date(year, month, day);
                          return format(localDate, "MMM dd, yyyy");
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      {data?.lastUpdated && (
        <div className="text-xs text-gray-500 text-right">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
