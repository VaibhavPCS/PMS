import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../provider/auth-context";
import { Navigate, useNavigate } from "react-router";
import { fetchData, postData } from "@/lib/fetch-util";
import {
  Calendar,
  Clock,
  User,
  Filter,
  Search,
  ChevronDown,
  Loader2,
  Building2,
  Folder,
  ArrowRight,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ==================== INTERFACES ====================

interface Workspace {
  _id: string;
  name: string;
  description?: string;
}

interface ProjectStatistics {
  totalProjects: number;
  ongoingProjects: number;
  completedProjects: number;
  proposedProjects: number;
}

interface Project {
  _id: string;
  propertyId?: string;
  title: string;
  description?: string;
  status: string;
  startDate: string;
  endDate: string;
  creator?: {
    _id: string;
    name: string;
    email: string;
  };
  projectType?: string;
  department?: {
    name: string;
  };
  categories?: Array<{
    name: string;
    members: Array<{
      userId: {
        _id: string;
        name: string;
        email: string;
      };
      role: string;
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string;
  assignees: Array<{ _id: string; name: string; email: string }>;
}

// ==================== MAIN COMPONENT ====================

const Dashboard = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projectStats, setProjectStats] = useState<ProjectStatistics>({
    totalProjects: 0,
    ongoingProjects: 0,
    completedProjects: 0,
    proposedProjects: 0,
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [projectTypeFilter, setProjectTypeFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");

  // ==================== DATA FETCHING ====================

  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = await fetchData("/workspace");
      // Extract workspace data from the nested structure
      const workspaceList = response.workspaces?.map((w: any) => w.workspaceId).filter(Boolean) || [];
      setWorkspaces(workspaceList);
      setCurrentWorkspace(response.currentWorkspace || null);
      // Store current workspace in localStorage for API calls
      if (response.currentWorkspace) {
        localStorage.setItem("currentWorkspaceId", response.currentWorkspace._id);
      }
    } catch (error) {
      console.error("Error fetching workspaces:", error);
      toast.error("Failed to load workspaces");
    }
  }, []);

  const handleSwitchWorkspace = async (workspaceId: string) => {
    try {
      await postData("/workspace/switch", { workspaceId });
      // Update localStorage
      localStorage.setItem("currentWorkspaceId", workspaceId);
      // Update current workspace state
      const selectedWorkspace = workspaces.find(w => w._id === workspaceId);
      setCurrentWorkspace(selectedWorkspace || null);
      toast.success("Workspace switched successfully");
      // Refresh data
      await Promise.all([
        fetchProjectStatistics(),
        fetchRecentProjects(),
        fetchTasks(),
      ]);
    } catch (error) {
      console.error("Error switching workspace:", error);
      toast.error("Failed to switch workspace");
    }
  };

  const fetchProjectStatistics = useCallback(async () => {
    try {
      const response = await fetchData("/project/statistics/overview");
      setProjectStats(response);
    } catch (error) {
      console.error("Error fetching project statistics:", error);
      toast.error("Failed to load project statistics");
      // Fallback to empty stats on error
      setProjectStats({
        totalProjects: 0,
        ongoingProjects: 0,
        completedProjects: 0,
        proposedProjects: 0,
      });
    }
  }, []);

  const fetchRecentProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: "25",
        sortBy: "startDate",
        ...(projectTypeFilter !== "all" && { projectType: projectTypeFilter }),
      });

      const response = await fetchData(`/project/recent?${params}`);
      let projects = response.projects || [];

      // Apply client-side date filtering based on startDate
      if (dateRangeFilter.start || dateRangeFilter.end) {
        projects = projects.filter((project: Project) => {
          const startDate = new Date(project.startDate);
          const filterStartDate = dateRangeFilter.start ? new Date(dateRangeFilter.start) : null;
          const filterEndDate = dateRangeFilter.end ? new Date(dateRangeFilter.end) : null;

          if (filterStartDate && filterEndDate) {
            return startDate >= filterStartDate && startDate <= filterEndDate;
          } else if (filterStartDate) {
            return startDate >= filterStartDate;
          } else if (filterEndDate) {
            return startDate <= filterEndDate;
          }
          return true;
        });
      }

      setRecentProjects(projects);
    } catch (error) {
      console.error("Error fetching recent projects:", error);
      toast.error("Failed to load recent projects");
      // Fallback to empty array on error
      setRecentProjects([]);
    }
  }, [projectTypeFilter, dateRangeFilter]);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        sortBy: "dueDate",
        sortOrder: "asc",
        ...(taskStatusFilter !== "all" && { status: taskStatusFilter }),
      });

      const response = await fetchData(`/workspace/tasks?${params}`);
      setTasks(response.tasks || []);
    } catch (error) {
      toast.error("Failed to load tasks");
    }
  }, [taskStatusFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      const loadData = async () => {
        setLoading(true);
        await Promise.all([
          fetchWorkspaces(),
          fetchProjectStatistics(),
          fetchRecentProjects(),
          fetchTasks(),
        ]);
        setLoading(false);
      };
      loadData();
    }
  }, [isAuthenticated, fetchWorkspaces, fetchProjectStatistics, fetchRecentProjects, fetchTasks]);

  // ==================== HELPER FUNCTIONS ====================

  const calculateDaysBetween = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleViewProject = (projectId: string) => {
    navigate(`/workspace/projects/${projectId}`);
  };

  // ==================== RENDER GUARDS ====================

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

  // ==================== PIE CHART DATA ====================

  const chartData = [
    {
      name: "Completed",
      value: projectStats.completedProjects,
      fill: "#8a55d2",
    },
    {
      name: "Proposed",
      value: projectStats.proposedProjects,
      fill: "#f2761b",
    },
    {
      name: "On Going",
      value: projectStats.ongoingProjects,
      fill: "#59c3c3",
    },
  ];

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-[#f1f2f7] p-6">
      <div className="max-w-full mx-auto space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>

        {/* TOP ROW: Statistics Cards + Project Chart Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Project Statistics Cards */}
          <div className="grid grid-cols-2 gap-[15px]">
            {/* Total Projects Card */}
            <div className="bg-[#4a8cd7] h-[120px] rounded-[10px] flex-1 min-w-[200px] overflow-hidden relative">
              {/* Decorative Circle - Creates light blue gradient effect on top */}
              <div className="absolute left-[-85px] top-[-135px] w-[256px] h-[256px] rotate-[5.438deg]">
                <div className="w-full h-full rounded-full bg-[#6ba9e3] opacity-40"></div>
              </div>

              {/* Content */}
              <div className="relative z-10 p-[15px]">
                <p className="font-medium text-[18px] text-white leading-normal mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Total Projects
                </p>
                <p className="font-medium text-[28px] text-white leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {projectStats.totalProjects}
                </p>
              </div>
            </div>

            {/* Ongoing Projects Card */}
            <div className="bg-[#479c39] h-[120px] rounded-[10px] flex-1 min-w-[200px] overflow-hidden relative">
              {/* Decorative Pattern - White wavy lines */}
              <div className="absolute left-[50px] top-[8px] w-[200.5px] h-[126.5px]">
                <img
                  src="/assets/2b063dca51b5ca11609fc603566283ea564647cb.svg"
                  alt=""
                  className="block max-w-none w-full h-full"
                />
              </div>

              {/* Content */}
              <div className="relative z-10 p-[15px]">
                <p className="font-medium text-[18px] text-white leading-normal mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Ongoing Projects
                </p>
                <p className="font-medium text-[28px] text-white leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {projectStats.ongoingProjects}
                </p>
              </div>
            </div>

            {/* Completed Projects Card */}
            <div className="bg-[#6647bf] h-[120px] rounded-[10px] flex-1 min-w-[200px] overflow-hidden relative">
              {/* Decorative Circle - Purple circle at top right */}
              <div className="absolute left-[111px] top-[-40px] w-[100px] h-[100px]">
                <img
                  src="/assets/1b64fa6c63104807e4e78a514d253af1cf83e472.svg"
                  alt=""
                  className="block max-w-none w-full h-full"
                />
              </div>

              {/* Decorative Pattern - Bottom left pattern */}
              <div className="absolute left-[0.5px] top-[37.5px] w-[138px] h-[82.5px]">
                <img
                  src="/assets/2cc8d5759ab199ac352266e7f212d8c7f1f25fcb.svg"
                  alt=""
                  className="block max-w-none w-full h-full"
                />
              </div>

              {/* Content */}
              <div className="relative z-10 p-[15px]">
                <p className="font-medium text-[18px] text-white leading-normal mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Completed Projects
                </p>
                <p className="font-medium text-[28px] text-white leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {projectStats.completedProjects}
                </p>
              </div>
            </div>

            {/* Proposed Projects Card */}
            <div className="bg-[#f27944] h-[120px] rounded-[10px] flex-1 min-w-[200px] overflow-hidden relative">
              {/* Decorative Shape - Left side light shape */}
              <div className="absolute left-[-80px] top-[-55px] w-[148.992px] h-[136px]">
                <img
                  src="/assets/c22bb55b4bce2667347f808cb73b615654287850.svg"
                  alt=""
                  className="block max-w-none w-full h-full"
                />
              </div>

              {/* Decorative Pattern - Right side pattern */}
              <div className="absolute left-[124px] top-[-33px] w-[100.186px] h-[111.296px]">
                <img
                  src="/assets/c8c774b0bd6d6628bb3416cb3eb48d96f38697cd.svg"
                  alt=""
                  className="block max-w-none w-full h-full"
                />
              </div>

              {/* Content */}
              <div className="relative z-10 p-[15px]">
                <p className="font-medium text-[18px] text-white leading-normal mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Proposed Projects
                </p>
                <p className="font-medium text-[28px] text-white leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {projectStats.proposedProjects}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Project Statistics Pie Chart */}
          <Card className="border border-[#e9ecf1]">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="font-['Inter'] font-medium text-[16px] text-[#2e2e30]">
                  Project Statistics
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-[25px] rounded-[6px] bg-[#f5f4f9] text-[#777777] text-[12px] font-['Inter'] hover:bg-[#e5e4e9] px-[8px] flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  April 2023
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {/* Pie Chart */}
                <div className="h-[200px] w-[200px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <p className="font-['Inter'] font-semibold text-[20px] text-black leading-[23px]">
                      {projectStats.totalProjects}
                    </p>
                    <p className="font-['Inter'] font-normal text-[12px] text-black leading-[12px] mt-1">
                      Total Projects
                    </p>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-col gap-[15px]">
                  {chartData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-8 min-w-[120px]">
                      <div className="flex items-center gap-[5px]">
                        <div
                          className="w-[10px] h-[10px] rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="font-['Inter'] font-semibold text-[12px] text-[#767676]">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-['Inter'] font-bold text-[12px] text-neutral-700">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BOTTOM ROW: Recent Projects Table + Task Overview Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Recent Ongoing Projects Table (2/3 width) */}
          <div className="lg:col-span-2">
            <Card className="shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
              <CardHeader className="px-[20px] py-[15px]">
                <div className="flex flex-col gap-[20px]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-[16px]">
                      <div>
                        <h3 className="font-['Inter'] font-normal text-[16px] text-black leading-[20px]">
                          All Projects
                        </h3>
                        <p className="font-['Inter'] font-medium text-[20px] text-black leading-[20px] inline ml-2">
                          {recentProjects.length}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-[15px]">
                      {/* Workspace Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto rounded-[6px] bg-[#f5f4f9] text-[#777777] text-[12px] font-['Inter'] hover:bg-[#e5e4e9] px-[5px] py-[5px] flex items-center gap-[5px]"
                          >
                            <Building2 className="w-4 h-4" />
                            {currentWorkspace?.name || "Workspace"}
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                          {workspaces.map((workspace) => (
                            <DropdownMenuItem
                              key={workspace._id}
                              onClick={() => handleSwitchWorkspace(workspace._id)}
                              className={cn(
                                "cursor-pointer",
                                currentWorkspace?._id === workspace._id && "bg-blue-50"
                              )}
                            >
                              {workspace.name}
                              {currentWorkspace?._id === workspace._id && (
                                <span className="ml-auto text-blue-600">✓</span>
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Project Type Filter */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto rounded-[6px] bg-[#f5f4f9] text-[#777777] text-[12px] font-['Inter'] hover:bg-[#e5e4e9] px-[5px] py-[5px] flex items-center gap-[5px]"
                          >
                            <Folder className="w-4 h-4" />
                            {projectTypeFilter === "all" ? "Project Type" : projectTypeFilter}
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px]">
                          <DropdownMenuItem
                            onClick={() => setProjectTypeFilter("all")}
                            className={cn(
                              "cursor-pointer",
                              projectTypeFilter === "all" && "bg-blue-50"
                            )}
                          >
                            All Types
                            {projectTypeFilter === "all" && (
                              <span className="ml-auto text-blue-600">✓</span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setProjectTypeFilter("Development")}
                            className={cn(
                              "cursor-pointer",
                              projectTypeFilter === "Development" && "bg-blue-50"
                            )}
                          >
                            Development
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setProjectTypeFilter("Research")}
                            className={cn(
                              "cursor-pointer",
                              projectTypeFilter === "Research" && "bg-blue-50"
                            )}
                          >
                            Research
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setProjectTypeFilter("Marketing")}
                            className={cn(
                              "cursor-pointer",
                              projectTypeFilter === "Marketing" && "bg-blue-50"
                            )}
                          >
                            Marketing
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Date Filter */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto rounded-[6px] bg-[#f5f4f9] text-[#777777] text-[12px] font-['Inter'] hover:bg-[#e5e4e9] px-[5px] py-[5px] flex items-center gap-[5px]"
                          >
                            <Calendar className="w-4 h-4" />
                            {dateRangeFilter.start || dateRangeFilter.end ? "Date Filtered" : "Start Date"}
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[250px] p-4">
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-medium text-gray-700 mb-1 block">
                                Start Date From:
                              </label>
                              <Input
                                type="date"
                                value={dateRangeFilter.start}
                                onChange={(e) =>
                                  setDateRangeFilter({ ...dateRangeFilter, start: e.target.value })
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 mb-1 block">
                                Start Date To:
                              </label>
                              <Input
                                type="date"
                                value={dateRangeFilter.end}
                                onChange={(e) =>
                                  setDateRangeFilter({ ...dateRangeFilter, end: e.target.value })
                                }
                                className="h-8 text-xs"
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-xs"
                              onClick={() => setDateRangeFilter({ start: "", end: "" })}
                            >
                              Clear Filter
                            </Button>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className="font-['Inter'] font-normal text-[12px] text-[#717182] leading-[12px] tracking-[0.5px]">
                    Latest Projects Under Development and Execution
                  </p>
                </div>
              </CardHeader>
              <CardContent className="px-[20px] pb-[15px]">
                <div className="border border-[#cccccc] rounded-[10px] overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#d5e5ff]">
                        <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-normal text-[rgba(0,0,0,0.6)] min-h-[40px]">
                          <div className="flex items-center gap-2">
                            Title
                            <Filter className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-normal text-[rgba(0,0,0,0.6)]">
                          <div className="flex items-center gap-2">
                            Description
                            <Filter className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-normal text-[rgba(0,0,0,0.6)]">
                          <div className="flex items-center gap-2">
                            Status
                            <Filter className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-normal text-[rgba(0,0,0,0.6)]">
                          <div className="flex items-center gap-2">
                            Start Date
                            <Filter className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-normal text-[rgba(0,0,0,0.6)]">
                          <div className="flex items-center gap-2">
                            End Date
                            <Filter className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-normal text-[rgba(0,0,0,0.6)]">
                          <div className="flex items-center gap-2">
                            Days
                            <Filter className="w-3 h-3" />
                          </div>
                        </th>
                        <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-normal text-[rgba(0,0,0,0.6)]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentProjects.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-[16px] py-[14px] text-center text-[14px] font-['Inter'] text-black">
                            No projects found
                          </td>
                        </tr>
                      ) : (
                        recentProjects.map((project, index) => (
                          <tr
                            key={project._id}
                            className={index % 2 === 1 ? "bg-[#f2f7ff]" : ""}
                          >
                            <td className="px-[16px] py-[14px] text-[14px] font-['Inter'] font-normal text-black tracking-[0.5px] max-w-[200px] truncate">
                              {project.title}
                            </td>
                            <td className="px-[16px] py-[14px] text-[14px] font-['Inter'] font-normal text-black tracking-[0.5px] max-w-[250px] truncate">
                              {project.description || "No description"}
                            </td>
                            <td className="px-[16px] py-[14px]">
                              <Badge
                                className={cn(
                                  "text-[12px] font-['Inter'] font-normal",
                                  project.status === "Completed" && "bg-[#479c39] hover:bg-[#479c39]",
                                  project.status === "In Progress" && "bg-[#4a8cd7] hover:bg-[#4a8cd7]",
                                  project.status === "Planning" && "bg-[#f2761b] hover:bg-[#f2761b]",
                                  project.status === "On Hold" && "bg-[#f27944] hover:bg-[#f27944]",
                                  project.status === "Cancelled" && "bg-[#cd2812] hover:bg-[#cd2812]"
                                )}
                              >
                                {project.status}
                              </Badge>
                            </td>
                            <td className="px-[16px] py-[14px] text-[14px] font-['Inter'] font-normal text-[#1a932e] tracking-[0.5px]">
                              {formatDate(project.startDate)}
                            </td>
                            <td className="px-[16px] py-[14px] text-[14px] font-['Inter'] font-normal text-[#cd2812] tracking-[0.5px]">
                              {formatDate(project.endDate)}
                            </td>
                            <td className="px-[16px] py-[14px] text-[14px] font-['Inter'] font-semibold text-black tracking-[0.5px]">
                              {calculateDaysBetween(project.startDate, project.endDate)} days
                            </td>
                            <td className="px-[16px] py-[14px]">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto px-[10px] py-[5px] text-[14px] font-['Inter'] font-normal text-[#344bfd] hover:text-[#344bfd] hover:underline hover:bg-transparent"
                                onClick={() => handleViewProject(project._id)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Task Overview Panel (1/3 width) */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden px-[10px] py-[15px]">
              <div className="px-[10px]">
                {/* Header */}
                <div className="flex items-center justify-between gap-[10px] mb-[15px]">
                  <h3 className="font-['Inter'] font-medium text-[16px] text-[#2e2e30] leading-normal flex-1">
                    Task Overview
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto rounded-[6px] bg-[#f5f4f9] text-[#777777] text-[12px] font-['Inter'] hover:bg-[#e5e4e9] px-[5px] py-[5px] flex items-center gap-[5px]"
                  >
                    See All
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Search and Filter */}
                <div className="space-y-[10px] mb-[15px]">
                  <div className="relative bg-[#f5f4f9] rounded-[8px] h-[37px] px-[10px] flex items-center justify-between">
                    <div className="flex items-center gap-[10px]">
                      <Search className="w-[15px] h-[15px] text-[#040110] opacity-60" />
                      <input
                        type="text"
                        placeholder="Search..."
                        className="bg-transparent border-none outline-none text-[14px] font-['Inter'] text-[#040110] opacity-60 placeholder:text-[#040110] placeholder:opacity-60"
                      />
                    </div>
                    <Filter className="w-4 h-4 text-[#040110]" />
                  </div>

                  <div className="flex items-center gap-[10px]">
                    <button
                      onClick={() => setTaskStatusFilter("all")}
                      className={cn(
                        "px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all",
                        taskStatusFilter === "all"
                          ? "border-b-[1px] border-[#f2761b] opacity-100"
                          : "opacity-60"
                      )}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setTaskStatusFilter("todo")}
                      className={cn(
                        "px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all",
                        taskStatusFilter === "todo"
                          ? "border-b-[1px] border-[#f2761b] opacity-100"
                          : "opacity-60"
                      )}
                    >
                      To Do
                    </button>
                    <button
                      onClick={() => setTaskStatusFilter("in_progress")}
                      className={cn(
                        "px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all",
                        taskStatusFilter === "in_progress"
                          ? "border-b-[1px] border-[#f2761b] opacity-100"
                          : "opacity-60"
                      )}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => setTaskStatusFilter("done")}
                      className={cn(
                        "px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all",
                        taskStatusFilter === "done"
                          ? "border-b-[1px] border-[#f2761b] opacity-100"
                          : "opacity-60"
                      )}
                    >
                      Done
                    </button>
                  </div>
                </div>

                {/* Task List */}
                <ScrollArea className="h-[600px]">
                  <div className="space-y-[10px]">
                    {tasks.length === 0 ? (
                      <div className="text-center py-8 text-[#717182] text-[14px] font-['Inter']">
                        No tasks found
                      </div>
                    ) : (
                      tasks.map((task) => {
                        const getTaskBgColor = (status: string) => {
                          switch (status) {
                            case "todo":
                              return "bg-[rgba(74,140,215,0.3)]";
                            case "in_progress":
                              return "bg-[rgba(245,158,11,0.3)]";
                            case "done":
                              return "bg-[rgba(71,156,57,0.3)]";
                            default:
                              return "bg-[rgba(74,140,215,0.3)]";
                          }
                        };

                        const getTaskBorderColor = (status: string) => {
                          switch (status) {
                            case "todo":
                              return "bg-[#4a8cd7]";
                            case "in_progress":
                              return "bg-amber-500";
                            case "done":
                              return "bg-[#479c39]";
                            default:
                              return "bg-[#4a8cd7]";
                          }
                        };

                        return (
                          <div
                            key={task._id}
                            className={cn(
                              "rounded-[5px] flex gap-[10px] items-start px-[10px] py-[5px]",
                              getTaskBgColor(task.status)
                            )}
                          >
                            <div className={cn("w-[5px] h-full rounded-[4px] shrink-0", getTaskBorderColor(task.status))} />
                            <div className="flex-1 flex flex-col gap-[8px]">
                              <h4 className="font-['Inter'] font-normal text-[14px] text-black leading-[20px]">
                                {task.title || "Task Title"}
                              </h4>
                              <p className="font-['Inter'] font-normal text-[12px] text-[#717182] leading-[12px]">
                                Description: {task.description || "Lorem ipsum dolor sit amet, consectetur adipiscing elit,"}
                              </p>
                              <div className="flex items-center gap-[10px]">
                                <div className="flex items-center gap-[5px]">
                                  <User className="w-4 h-4 text-[#717182]" />
                                  <span className="font-['Inter'] font-normal text-[12px] text-[#717182] leading-normal">
                                    {task.assignees[0]?.name || "Joe Smith"}
                                  </span>
                                </div>
                                <div className="w-[1px] h-[14px] bg-[#717182] opacity-30" />
                                <div className="flex items-center gap-[5px]">
                                  <Clock className="w-4 h-4 text-[#717182]" />
                                  <span className="font-['Inter'] font-normal text-[12px] text-[#717182] leading-normal">
                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "24/10/2025 at 19:00"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
