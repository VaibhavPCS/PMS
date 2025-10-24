import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../provider/auth-context";
import { Navigate } from "react-router";
import { postData, fetchData } from "@/lib/fetch-util";
import {
  Calendar,
  Clock,
  User,
  Filter,
  SortDesc,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  Eye,
  BarChart3,
  List,
  TrendingUp,
  Target,
  Activity,
  Clock4,
  TableIcon,
  BarChart2,
  Users,
  Search,
  RefreshCw,
  Download,
  Settings2,
  Loader2,
  Plus,
  ChevronDown,
  ArrowUpDown,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from 'react-router';

const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

interface Task {
  _id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string;
  createdAt: string;
  assignees: Array<{ _id: string; name: string; email: string }>;
  creator: { _id: string; name: string; email: string };
  workspace: { _id: string; name: string };
}

interface AllWorkspaceTask {
  serialNumber: number;
  _id: string;
  title: string;
  dueDate: string;
  assignedTo: { _id: string; name: string; email: string };
  project: { _id: string; title: string };
  status: string;
  priority: string;
  creator: { _id: string; name: string; email: string };
  createdAt: string;
  completedAt?: string;
  handoverNotes?: string;
}

interface Analytics {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  averageDuration: number;
  velocity: {
    weekly: number;
    monthly: number;
  };
  overdueTasks: number;
  overduePercentage: number;
  statusDistribution: {
    "to-do": number;
    "in-progress": number;
    done: number;
  };
  priorityDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  completionTimeByPriority: {
    low: number;
    medium: number;
    high: number;
  };
}

interface ProjectAnalytics {
  overall: Analytics;
  categories: { [categoryName: string]: Analytics };
}

interface Workspace {
  _id: string;
  name: string;
  description: string;
}

interface UserWorkspace {
  workspaceId: Workspace;
  role: string;
  joinedAt: string;
}

interface Project {
  _id: string;
  title: string;
  description: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

const Dashboard = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [statusFilter, setStatusFilter] = useState("all_status");
  const [priorityFilter, setPriorityFilter] = useState("all_priority");
  const [searchQuery, setSearchQuery] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const fetchUserInfo = useCallback(async () => {
    try {
      const response = await fetchData("/auth/me");
      setUserInfo(response.user || response);
    } catch (error) {
      toast.error("Failed to load user data");
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        sortBy,
        sortOrder,
        ...(statusFilter !== "all_status" && { status: statusFilter }),
        ...(priorityFilter !== "all_priority" && { priority: priorityFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetchData(`/workspace/tasks?${params}`);
      setTasks(response.tasks || []);
    } catch (error) {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, statusFilter, priorityFilter, searchQuery]);

  const fetchAllWorkspaceTasks = useCallback(async () => {
    try {
      const response = await fetchData("/workspace/all-tasks");
      return response || { tasks: [], totalTasks: 0 };
    } catch (error) {
      toast.error("Failed to load workspace tasks");
      return { tasks: [], totalTasks: 0 };
    }
  }, []);

  const hasAnalyticsAccess = useMemo(() => {
    return (
      userInfo && (userInfo.role === "admin" || userInfo.role === "super-admin")
    );
  }, [userInfo]);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case "todo":
      case "to-do":
        return <Clock className="w-4 h-4 text-gray-500" />;
      case "in_progress":
      case "in-progress":
        return <PlayCircle className="w-4 h-4 text-blue-500" />;
      case "review":
        return <Eye className="w-4 h-4 text-orange-500" />;
      case "done":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "done":
        return "bg-green-100 text-green-800 border-green-200";
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "to-do":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "review":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setSearchQuery(query);
    }, 300),
    []
  );

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserInfo();
      fetchTasks();
    }
  }, [isAuthenticated, fetchUserInfo, fetchTasks]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" />;
  }

  const TasksContent = () => {
    const [allTasks, setAllTasks] = useState<AllWorkspaceTask[]>([]);
    const [userRole, setUserRole] = useState("");
    const [galleryLoading, setGalleryLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

    useEffect(() => {
      const loadAllTasks = async () => {
        setGalleryLoading(true);
        try {
          const data = await fetchAllWorkspaceTasks();
          setAllTasks(data.tasks || []);
          setUserRole(data.userRole || "");
        } catch (error) {
        } finally {
          setGalleryLoading(false);
        }
      };

      loadAllTasks();
    }, []);

    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Task Management
            </h2>
            <p className="text-gray-600 mt-1">
              Manage and track all your workspace tasks
            </p>
          </div>

          <div className="flex items-center gap-2">
            {userRole && (
              <Badge variant="secondary" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {userRole}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchTasks();
                const loadAllTasks = async () => {
                  setGalleryLoading(true);
                  const data = await fetchAllWorkspaceTasks();
                  setAllTasks(data.tasks || []);
                  setGalleryLoading(false);
                };
                loadAllTasks();
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tasks..."
                    className="pl-10"
                    onChange={(e) => debouncedSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_status">All Status</SelectItem>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_priority">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                  className="flex items-center gap-1"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  {sortOrder === "asc" ? "Asc" : "Desc"}
                </Button>
              </div>

              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8 p-0"
                  title="Grid View"
                >
                  <BarChart2 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="h-8 w-8 p-0"
                  title="Table View"
                >
                  <TableIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-100">
                  <List className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Tasks
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {allTasks.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-100">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {allTasks.filter((task) => task.status === "done").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-orange-100">
                  <PlayCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    In Progress
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {
                      allTasks.filter((task) => task.status === "in-progress")
                        .length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-red-100">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {
                      allTasks.filter(
                        (task) =>
                          new Date(task.dueDate) < new Date() &&
                          task.status !== "done"
                      ).length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {(userInfo?.role === "admin" || userInfo?.role === "super-admin") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TableIcon className="w-5 h-5" />
                All Workspace Tasks
              </CardTitle>
              <CardDescription>
                Complete overview of all tasks in the workspace (
                {allTasks.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {galleryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600">Loading workspace tasks...</p>
                  </div>
                </div>
              ) : allTasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Tasks Found
                  </h3>
                  <p className="text-gray-500">
                    No tasks are available in this workspace yet.
                  </p>
                  <Button className="mt-4" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Task
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-96 w-full">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50/50">
                          <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">
                            S.No
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">
                            Task
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">
                            Assignee
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">
                            Project
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">
                            Priority
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900 text-sm">
                            Due Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {allTasks.map((task) => (
                          <tr
                            key={task._id}
                            className="border-b hover:bg-gray-50/50 transition-colors cursor-pointer"
                            onClick={() =>
                              (window.location.href = `/task/${task._id}`)
                            }
                          >
                            <td className="py-3 px-4 text-sm font-medium text-gray-600">
                              {task.serialNumber}
                            </td>
                            <td className="py-3 px-4 max-w-xs">
                              <div
                                className="font-medium text-gray-900 truncate"
                                title={task.title}
                              >
                                {task.title}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                                    {task.assignedTo?.name?.charAt(0) || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm truncate">
                                  {task.assignedTo?.name || "Unassigned"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 truncate">
                              {task.project?.title || "No Project"}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs flex items-center gap-1",
                                  getStatusColor(task.status)
                                )}
                              >
                                {getStatusIcon(task.status)}
                                <span className="capitalize">
                                  {task.status.replace("-", " ")}
                                </span>
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs capitalize",
                                  getPriorityColor(task.priority)
                                )}
                              >
                                {task.priority}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {task.dueDate
                                ? new Date(task.dueDate).toLocaleDateString()
                                : "No due date"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              My Tasks ({tasks.length})
            </CardTitle>
            <CardDescription>
              Tasks assigned specifically to you
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  All Caught Up! 🎉
                </h3>
                <p className="text-gray-500 mb-4">
                  You don't have any tasks assigned right now.
                </p>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
                  Great job staying organized!
                </Badge>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasks.map((task) => (
                  <Card
                    key={task._id}
                    className="hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              getStatusColor(task.status)
                            )}
                          >
                            {task.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            getPriorityColor(task.priority)
                          )}
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="space-y-2 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Created:{" "}
                            {new Date(task.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>By: {task.creator.name}</span>
                        </div>
                      </div>
                      {task.assignees && task.assignees.length > 1 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Team:</span>
                            <div className="flex -space-x-1">
                              {task.assignees.slice(0, 3).map((assignee) => (
                                <Avatar
                                  key={assignee._id}
                                  className="w-6 h-6 border-2 border-white"
                                >
                                  <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                                    {assignee.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {task.assignees.length > 3 && (
                                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center border-2 border-white">
                                  <span className="text-xs font-medium text-gray-600">
                                    +{task.assignees.length - 3}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const AnalyticsContent = () => {
    const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedWorkspace, setSelectedWorkspace] =
      useState("select_workspace");
    const [selectedProject, setSelectedProject] = useState("select_project");
    const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [projectCategories, setProjectCategories] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

    const fetchWorkspaces = useCallback(async () => {
      try {
        const response = await fetchData("/workspace");

        if (response.workspaces) {
          setWorkspaces(response.workspaces);
        }
      } catch (error) {
        toast.error("Failed to load workspaces");
      }
    }, []);

    const fetchProjects = useCallback(async (workspaceId: string) => {
      if (workspaceId === "select_workspace") {
        setProjects([]);
        return;
      }

      try {
        await postData("/workspace/switch", { workspaceId });

        const response = await fetchData("/project");

        if (response.projects) {
          setProjects(response.projects);
        } else {
          setProjects([]);
        }
      } catch (error) {
        toast.error("Failed to load projects");
        setProjects([]);
      }
    }, []);

    const fetchProjectAnalytics = useCallback(
      async (projectId: string) => {
        if (projectId === "select_project") {
          setAnalytics(null);
          return;
        }

        setAnalyticsLoading(true);
        try {
          const params = new URLSearchParams();
          if (startDate)
            params.append("startDate", startDate.toISOString().split("T")[0]);
          if (endDate)
            params.append("endDate", endDate.toISOString().split("T")[0]);

          const response = await fetchData(
            `/analytics/project/${projectId}?${params}`
          );

          if (response.analytics) {
            setAnalytics(response.analytics);
            setProjectCategories(
              Object.keys(response.analytics.categories || {})
            );
          } else {
            setAnalytics(null);
            setProjectCategories([]);
          }
        } catch (error) {
          toast.error("Failed to load analytics data");
          setAnalytics(null);
        } finally {
          setAnalyticsLoading(false);
        }
      },
      [startDate, endDate]
    );

    useEffect(() => {
      if (hasAnalyticsAccess) {
        fetchWorkspaces();
      }
    }, [hasAnalyticsAccess, fetchWorkspaces]);

    useEffect(() => {
      if (selectedWorkspace !== "select_workspace") {
        fetchProjects(selectedWorkspace);
        setSelectedProject("select_project");
        setAnalytics(null);
      }
    }, [selectedWorkspace, fetchProjects]);

    useEffect(() => {
      if (selectedProject !== "select_project") {
        fetchProjectAnalytics(selectedProject);
      }
    }, [selectedProject, fetchProjectAnalytics]);

    if (!hasAnalyticsAccess) {
      return (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-xl text-red-900 mb-2">
              Access Restricted
            </CardTitle>
            <CardDescription className="text-center max-w-md">
              Analytics dashboard is only available for Admin and Super Admin
              users. Please contact your workspace administrator for access.
            </CardDescription>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">Your current role:</span>
              <Badge variant="outline" className="bg-white">
                {userInfo?.role || "Unknown"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Analytics Dashboard
            </h2>
            <p className="text-gray-600 mt-1">
              Project performance metrics and insights
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                {userInfo?.name}
              </Badge>
              <Badge variant="outline">{userInfo?.role}</Badge>
            </div>
          </div>

          {analytics && (
            <div className="flex items-center gap-2 bg-white border rounded-lg p-1">
              <Button
                variant={viewMode === "chart" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("chart")}
                className="flex items-center gap-2"
              >
                <BarChart2 className="w-4 h-4" />
                Charts
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="flex items-center gap-2"
              >
                <TableIcon className="w-4 h-4" />
                Tables
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Analytics Configuration
            </CardTitle>
            <CardDescription>
              Configure the scope and timeframe for your analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Workspace</Label>
                <Select
                  value={selectedWorkspace}
                  onValueChange={setSelectedWorkspace}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select_workspace">
                      Choose workspace...
                    </SelectItem>
                    {workspaces.map((userWorkspace) => (
                      <SelectItem
                        key={userWorkspace.workspaceId._id}
                        value={userWorkspace.workspaceId._id}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-4 h-4">
                            <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                              {userWorkspace.workspaceId.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {userWorkspace.workspaceId.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Project</Label>
                <Select
                  value={selectedProject}
                  onValueChange={setSelectedProject}
                  disabled={selectedWorkspace === "select_workspace"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="select_project">
                      Choose project...
                    </SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project._id} value={project._id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate ? (
                        format(startDate, "MMM dd")
                      ) : (
                        <span>Start date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {endDate ? (
                        format(endDate, "MMM dd")
                      ) : (
                        <span>End date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedWorkspace === "select_workspace" ||
        selectedProject === "select_project" ? (
          <Card className="border-dashed border-gray-300">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl text-gray-900 mb-2">
                Select Project for Analytics
              </CardTitle>
              <CardDescription className="text-center max-w-md">
                Choose both workspace and project from the configuration panel
                above to view detailed performance analytics and insights.
              </CardDescription>
            </CardContent>
          </Card>
        ) : analyticsLoading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
              <p className="text-gray-600 text-lg">Generating Analytics...</p>
              <p className="text-gray-500 text-sm mt-2">
                This may take a moment
              </p>
            </CardContent>
          </Card>
        ) : !analytics ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <CardTitle className="text-xl text-red-900 mb-2">
                No Analytics Data
              </CardTitle>
              <CardDescription className="text-center max-w-md">
                No analytics data available for the selected project. This could
                be because:
              </CardDescription>
              <ul className="list-disc list-inside mt-3 text-sm text-gray-600 space-y-1">
                <li>The project has no tasks yet</li>
                <li>No tasks match the selected date range</li>
                <li>Analytics data is still being processed</li>
              </ul>
              <Button
                variant="outline"
                onClick={() => fetchProjectAnalytics(selectedProject)}
                className="mt-4"
                disabled={analyticsLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Loading Analytics
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Overall Project Analytics
              </h3>

              {analytics.overall.totalTasks === 0 ? (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="text-center py-8">
                    <p className="text-yellow-800">
                      No tasks found in this project
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card className="border-indigo-200 bg-indigo-50">
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-3 rounded-lg bg-indigo-100">
                            <List className="w-6 h-6 text-indigo-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">
                              Total Tasks
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                              {analytics.overall.totalTasks}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-3 rounded-lg bg-green-100">
                            <Target className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">
                              Completion Rate
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                              {analytics.overall.completionRate.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-3 rounded-lg bg-blue-100">
                            <TrendingUp className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">
                              Weekly Velocity
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                              {analytics.overall.velocity.weekly}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="p-6">
                        <div className="flex items-center">
                          <div className="p-3 rounded-lg bg-red-100">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">
                              Overdue Tasks
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                              {analytics.overall.overdueTasks}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Eye className="w-5 h-5" />
                          Status Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  {
                                    name: "To Do",
                                    value:
                                      analytics.overall.statusDistribution[
                                        "to-do"
                                      ],
                                    fill: "#6B7280",
                                  },
                                  {
                                    name: "In Progress",
                                    value:
                                      analytics.overall.statusDistribution[
                                        "in-progress"
                                      ],
                                    fill: "#3B82F6",
                                  },
                                  {
                                    name: "Done",
                                    value:
                                      analytics.overall.statusDistribution.done,
                                    fill: "#10B981",
                                  },
                                ]}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) =>
                                  `${name}: ${(percent * 100).toFixed(0)}%`
                                }
                              >
                                {[
                                  { fill: "#6B7280" },
                                  { fill: "#3B82F6" },
                                  { fill: "#10B981" },
                                ].map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.fill}
                                  />
                                ))}
                              </Pie>
                              <ChartTooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          Priority Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={[
                                {
                                  name: "Low",
                                  value:
                                    analytics.overall.priorityDistribution.low,
                                  fill: "#10B981",
                                },
                                {
                                  name: "Medium",
                                  value:
                                    analytics.overall.priorityDistribution
                                      .medium,
                                  fill: "#F59E0B",
                                },
                                {
                                  name: "High",
                                  value:
                                    analytics.overall.priorityDistribution.high,
                                  fill: "#EF4444",
                                },
                              ]}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <ChartTooltip />
                              <Bar dataKey="value" fill="#3B82F6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>

            {projectCategories.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  Category Analytics
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {projectCategories.map((categoryName, index) => {
                    const categoryData = analytics.categories[categoryName];
                    const colors = [
                      "border-purple-200 bg-purple-50",
                      "border-green-200 bg-green-50",
                      "border-orange-200 bg-orange-50",
                      "border-pink-200 bg-pink-50",
                      "border-teal-200 bg-teal-50",
                    ];
                    const cardColor = colors[index % colors.length];

                    return (
                      <Card key={categoryName} className={cardColor}>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            {categoryName}
                          </CardTitle>
                          <CardDescription>
                            Category performance metrics
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Total Tasks</p>
                                <p className="text-xl font-bold">
                                  {categoryData.totalTasks}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Completed</p>
                                <p className="text-xl font-bold">
                                  {categoryData.completedTasks}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Rate</p>
                                <p className="text-lg font-semibold">
                                  {categoryData.completionRate.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Overdue</p>
                                <p className="text-lg font-semibold">
                                  {categoryData.overdueTasks}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="container mx-auto py-6 px-4 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            {userInfo && (
              <div className="flex items-center gap-2 mt-2">
                <p className="text-gray-600">
                  Welcome back,{" "}
                  <span className="font-semibold">{userInfo.name}</span>
                </p>
                <Badge
                  variant="secondary"
                  className={cn(
                    userInfo.role === "admin" || userInfo.role === "super-admin"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-blue-100 text-blue-800 border-blue-200"
                  )}
                >
                  {userInfo.role}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Task
            </Button>
          </div>
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-11">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Tasks
            </TabsTrigger>
            {hasAnalyticsAccess && (
              <TabsTrigger
                value="analytics"
                className="flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="tasks" className="space-y-6 mt-6">
            <TasksContent />
          </TabsContent>

          {hasAnalyticsAccess && (
            <TabsContent value="analytics" className="space-y-6 mt-6">
              <AnalyticsContent />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
