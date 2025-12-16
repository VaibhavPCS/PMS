import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "../../provider/auth-context";
import { Navigate, useNavigate } from "react-router";
import { fetchData, postData } from "@/lib/fetch-util";
import { buildApiUrl } from "@/lib/config";
import { formatDateDDMMYYYY, calculateDaysBetween } from "@/lib/date-utils";
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
  MoreVertical,
  Pencil,
  Trash2,
  ArrowUpDown,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";

// Helper to limit visible words and append ellipsis
const limitWords = (text: string, maxWords: number) => {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "...";
};

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

type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'Completed';

interface Project {
  _id: string;
  propertyId?: string;
  title: string;
  description?: string;
  status: ProjectStatus;
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
  description?: string;
  status: "to-do" | "in-progress" | "done" | "on-hold";
  priority: "low" | "medium" | "high" | "urgent";
  startDate?: string;
  dueDate: string;
  assignedTo?: { _id: string; name: string; email: string };
  project?: { _id: string; title: string };
  creator?: { _id: string; name: string; email: string };
  createdAt: string;
  serialNumber?: number;
}

// ==================== MAIN COMPONENT ====================

const Dashboard = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
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
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [projectTypeFilter, setProjectTypeFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<{ start: string; end: string }>({ start: "", end: "" });
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>("");
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>("");
  // Calendar state for pie chart filtering
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [monthlyProjectStats, setMonthlyProjectStats] = useState({
    planning: 0,
    inProgress: 0,
    onHold: 0,
    completed: 0,
    total: 0,
  });
  const [accessibleProjects, setAccessibleProjects] = useState<Project[]>([]);
  const [accessibleProjectIds, setAccessibleProjectIds] = useState<Set<string>>(new Set());
  const [approvalStats, setApprovalStats] = useState({
    pendingApproval: 0,
    approved: 0
  });

  // Approval tasks for TL/Lead
  const [approvalTasks, setApprovalTasks] = useState<Task[]>([]);
  const [approvalTasksLoading, setApprovalTasksLoading] = useState(false);
  const [approvalSearchQuery, setApprovalSearchQuery] = useState("");
  const [approvalProjectFilter, setApprovalProjectFilter] = useState("all");

  // Height synchronization refs
  const projectsTableRef = useRef<HTMLDivElement>(null);
  const taskOverviewRef = useRef<HTMLDivElement>(null);
  const [syncedHeight, setSyncedHeight] = useState<number | null>(null);

  // Task update/delete modals
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [updateForm, setUpdateForm] = useState({
    title: "",
    description: "",
    priority: "",
    status: "",
    startDate: "",
    dueDate: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery) return recentProjects;
    return recentProjects.filter(project =>
      project.title.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(projectSearchQuery.toLowerCase()))
    );
  }, [recentProjects, projectSearchQuery]);


  const currentUserId = (user as any)?.id || (user as any)?._id || "";
  const userRole = (user as any)?.role || "";
  const isAdmin = ["admin", "super_admin", "super-admin"].includes(userRole);
  const isLead = userRole === "lead";

  // Get user's role in current workspace
  const getUserWorkspaceRole = useCallback(() => {
    if (!user || !currentWorkspace) return null;
    const workspaceData = (user as any)?.workspaces?.find(
      (w: any) => w.workspaceId?._id === currentWorkspace._id || w.workspaceId === currentWorkspace._id
    );
    return workspaceData?.role || null;
  }, [user, currentWorkspace]);

  const workspaceRole = getUserWorkspaceRole();
  const canSeeApprovalTable = ["lead", "head", "admin", "owner"].includes(workspaceRole || "");

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
        localStorage.setItem("workspace-id", response.currentWorkspace._id);
      }
    } catch (error) {
      console.error("Error fetching workspaces:", error);
      toast.error("Failed to load workspaces");
    }
  }, []);

  const handleSwitchWorkspace = async (workspaceId: string) => {
    try {
      setLoading(true);
      await postData("/workspace/switch", { workspaceId });
      // Update localStorage
      localStorage.setItem("currentWorkspaceId", workspaceId);
      localStorage.setItem("workspace-id", workspaceId);
      // Dispatch custom event for workspace change - COMMENTED OUT
      // window.dispatchEvent(new CustomEvent('workspaceChanged'));
      // Update current workspace state
      const selectedWorkspace = workspaces.find(w => w._id === workspaceId);
      setCurrentWorkspace(selectedWorkspace || null);

      // Refetch all data that depends on workspace
      const [_, projects] = await Promise.all([
        fetchRecentProjects(),
        fetchAccessibleProjects(),
        fetchTasks(),
        fetchApprovalStats()
      ]);

      // Update stats immediately with the new projects
      if (projects) {
        fetchProjectStatistics(projects);
        fetchMonthlyProjectStats(selectedMonth, selectedYear, projects);
      }
    } catch (error) {
      console.error("Error switching workspace:", error);
      toast.error("Failed to switch workspace");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectStatistics = useCallback(async (projects?: Project[]) => {
    try {
      const source = projects || accessibleProjects || [];
      const totals = {
        totalProjects: source.length,
        ongoingProjects: source.filter(
          (p: any) => (p?.status || "").toLowerCase() === "in progress" || (p?.status || "").toLowerCase() === "ongoing"
        ).length,
        completedProjects: source.filter((p: any) => (p?.status || "").toLowerCase() === "completed").length,
        proposedProjects: source.filter((p: any) => (p?.status || "").toLowerCase() === "planning").length,
      };
      setProjectStats(totals);
    } catch (error) {
      setProjectStats({
        totalProjects: 0,
        ongoingProjects: 0,
        completedProjects: 0,
        proposedProjects: 0,
      });
    }
  }, [accessibleProjects]);

  const fetchAccessibleProjects = useCallback(async () => {
    try {
      const response = await fetchData("/project/recent?limit=1000&sortBy=startDate");
      const allProjects = response.projects || [];
      let filtered = [];
      // Remove role-based filtering - show all projects to all users
      filtered = allProjects;
      // if (isAdmin) {
      //   filtered = allProjects;
      // } else {
      //   filtered = allProjects.filter((p: any) => {
      //     const inMembers = Array.isArray(p.members)
      //       ? p.members.some((m: any) => (m?.userId?._id || m?._id) === currentUserId)
      //       : Array.isArray(p.categories)
      //         ? p.categories.some(
      //           (c: any) => Array.isArray(c.members) && c.members.some((m: any) => m?.userId?._id === currentUserId)
      //         )
      //         : false;
      //     const isHead = p?.projectHead?._id === currentUserId;
      //     const isCreator = p?.creator?._id === currentUserId;
      //     const shouldInclude = inMembers || isHead || isCreator;
      //     console.log('Accessible project filter:', p.title, 'inMembers:', inMembers, 'isHead:', isHead, 'isCreator:', isCreator, 'shouldInclude:', shouldInclude);
      //     return shouldInclude;
      //   });
      // }

      setAccessibleProjects(filtered);
      setAccessibleProjectIds(new Set(filtered.map((p: any) => p._id)));
      return filtered;
    } catch (error) {
      console.error("Error fetching accessible projects:", error);
      setAccessibleProjects([]);
      setAccessibleProjectIds(new Set());
      return [];
    }
  }, [isAdmin, currentUserId]);

  const fetchApprovalStats = useCallback(async () => {
    try {
      const workspaceId = currentWorkspace?._id || localStorage.getItem("currentWorkspaceId");
      const query = workspaceId ? `?workspaceId=${workspaceId}` : "";
      const response = await fetchData(`/analytics/approval-stats${query}`);
      setApprovalStats(response);
    } catch (error) {
      console.error("Error fetching approval stats:", error);
    }
  }, [currentWorkspace]);

  // Fetch approval tasks for TL/Lead
  const fetchApprovalTasks = useCallback(async () => {
    if (!canSeeApprovalTable) return;

    try {
      setApprovalTasksLoading(true);
      const workspaceId = currentWorkspace?._id || localStorage.getItem("currentWorkspaceId");
      const query = workspaceId ? `?workspaceId=${workspaceId}` : "";
      const response = await fetchData(`/analytics/approval-tasks${query}`);
      setApprovalTasks(response.tasks || []);
    } catch (error) {
      console.error("Error fetching approval tasks:", error);
      toast.error("Failed to load approval tasks");
    } finally {
      setApprovalTasksLoading(false);
    }
  }, [currentWorkspace, canSeeApprovalTable]);

  // Fetch monthly project statistics for pie chart
  const fetchMonthlyProjectStats = useCallback(async (month: number, year: number, projects?: Project[]) => {
    try {
      const dataset = projects || accessibleProjects || [];
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      const projectsInMonth = dataset.filter((project: Project) => {
        const projectStart = new Date(project.startDate);
        const projectEnd = new Date(project.endDate);
        return projectStart <= monthEnd && projectEnd >= monthStart;
      });
      const stats = {
        planning: 0,
        inProgress: 0,
        onHold: 0,
        completed: 0,
        total: projectsInMonth.length,
      };
      projectsInMonth.forEach((project: Project) => {
        const status = project.status.toLowerCase();
        if (status === "planning") {
          stats.planning++;
        } else if (status === "in progress" || status === "ongoing") {
          stats.inProgress++;
        } else if (status === "on hold") {
          stats.onHold++;
        } else if (status === "completed") {
          stats.completed++;
        }
      });
      setMonthlyProjectStats(stats);
    } catch (error) {
      setMonthlyProjectStats({
        planning: 0,
        inProgress: 0,
        onHold: 0,
        completed: 0,
        total: 0,
      });
    }
  }, [accessibleProjects]);

  const fetchRecentProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: "25",
        sortBy: "startDate",
        ...(projectTypeFilter !== "all" && { projectType: projectTypeFilter }),
      });

      const response = await fetchData(`/project/recent?${params}`);
      let projects = response.projects || [];

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

      // Remove role-based filtering - show all projects to all users
      // if (!isAdmin) {
      //   projects = projects.filter((p: any) => {
      //     const inMembers = Array.isArray(p.members)
      //       ? p.members.some((m: any) => (m?.userId?._id || m?._id) === currentUserId)
      //       : Array.isArray(p.categories)
      //         ? p.categories.some(
      //           (c: any) => Array.isArray(c.members) && c.members.some((m: any) => m?.userId?._id === currentUserId)
      //         )
      //         : false;
      //     const isHead = p?.projectHead?._id === currentUserId;
      //     const isCreator = p?.creator?._id === currentUserId;
      //     const shouldInclude = inMembers || isHead || isCreator;
      //     console.log('Project filter check:', p.title, 'inMembers:', inMembers, 'isHead:', isHead, 'isCreator:', isCreator, 'shouldInclude:', shouldInclude);
      //     return shouldInclude;
      //   });
      // }


      setRecentProjects(projects);
    } catch (error) {
      console.error("Error fetching recent projects:", error);
      toast.error("Failed to load recent projects");
      setRecentProjects([]);
    }
  }, [projectTypeFilter, dateRangeFilter, isAdmin, currentUserId]);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetchData("/workspace/all-tasks");
      let tasksData = response.tasks || [];

      // Remove role-based filtering - show all tasks to all users
      // if (!isAdmin) {
      //   if (isLead && accessibleProjectIds && accessibleProjectIds.size > 0) {
      //     tasksData = tasksData.filter((t: any) => t?.project?._id && accessibleProjectIds.has(t.project._id));
      //   } else {
      //     tasksData = tasksData.filter((t: any) => t?.assignedTo?._id === currentUserId);
      //   }
      // }

      setTasks(tasksData);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
      setTasks([]);
    }
  }, [isAdmin, isLead, accessibleProjectIds, currentUserId]);

  // Filter tasks based on status and search query
  useEffect(() => {
    let filtered = tasks;

    // Filter by status
    if (taskStatusFilter !== "all") {
      filtered = filtered.filter(task => task.status === taskStatusFilter);
    }

    // Filter by search query
    if (taskSearchQuery.trim()) {
      const query = taskSearchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query)) ||
        (task.assignedTo && task.assignedTo.name.toLowerCase().includes(query)) ||
        (task.project && task.project.title.toLowerCase().includes(query))
      );
    }

    filtered = filtered.filter((t: any) => t.approvalStatus !== "approved");

    setFilteredTasks(filtered);
  }, [tasks, taskStatusFilter, taskSearchQuery]);

  useEffect(() => {
    if (isAuthenticated) {
      const loadData = async () => {
        setLoading(true);
        await fetchWorkspaces();
        const projects = await fetchAccessibleProjects();
        await fetchProjectStatistics(projects);
        await fetchRecentProjects();
        await fetchMonthlyProjectStats(selectedMonth, selectedYear, projects);
        await fetchTasks();
        await fetchApprovalStats();
        setLoading(false);
      };
      loadData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchProjectStatistics();
    fetchMonthlyProjectStats(selectedMonth, selectedYear);
  }, [accessibleProjects, selectedMonth, selectedYear]);

  // Load approval tasks for TL/Lead
  useEffect(() => {
    if (isAuthenticated && canSeeApprovalTable) {
      fetchApprovalTasks();
    }
  }, [isAuthenticated, canSeeApprovalTable, currentWorkspace, fetchApprovalTasks]);

  // Height synchronization between Projects Table and Task Overview
  useEffect(() => {
    const calculateSyncedHeight = () => {
      if (!projectsTableRef.current || !taskOverviewRef.current) return;

      // Get natural heights
      const projectsHeight = projectsTableRef.current.scrollHeight;
      const taskOverviewHeight = taskOverviewRef.current.scrollHeight;

      // Calculate 5 rows table height (approximate)
      // Header ~52px + (5 rows * ~50px) + padding ~30px = ~332px
      const maxTableHeight = 332;

      // Use the smaller of: projects table (max 5 rows), task overview height
      const finalHeight = Math.min(
        Math.min(projectsHeight, maxTableHeight),
        taskOverviewHeight
      );

      setSyncedHeight(finalHeight);
    };

    // Calculate on mount and when data changes
    calculateSyncedHeight();

    // Recalculate on window resize
    window.addEventListener('resize', calculateSyncedHeight);
    return () => window.removeEventListener('resize', calculateSyncedHeight);
  }, [recentProjects, filteredTasks]);

  // ==================== HELPER FUNCTIONS ====================

  // Using utility functions from date-utils.ts for consistent date handling

  const handleViewProject = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  // Format month and year for display
  const formatMonthYear = (month: number, year: number): string => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${monthNames[month]} ${year}`;
  };

  // Handle month change
  const handleMonthChange = async (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setShowMonthPicker(false);
    await fetchMonthlyProjectStats(month, year);
  };

  // ==================== TASK UPDATE/DELETE HANDLERS ====================

  const handleOpenUpdateModal = (task: Task) => {
    setSelectedTask(task);
    setUpdateForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
    });
    setShowUpdateModal(true);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;
    if (!updateForm.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    try {
      setIsUpdating(true);

      // Check for status transitions related to on-hold
      const isPuttingOnHold = updateForm.status === 'on-hold' && selectedTask.status !== 'on-hold';
      const isResuming = selectedTask.status === 'on-hold' && updateForm.status !== 'on-hold';

      // 1. Update task details (excluding status if hold/resume involved)
      const payload: any = {
        title: updateForm.title,
        description: updateForm.description,
        priority: updateForm.priority,
        startDate: updateForm.startDate,
        dueDate: updateForm.dueDate,
      };

      // Only include status if we are NOT doing a hold/resume transition
      if (!isPuttingOnHold && !isResuming) {
        payload.status = updateForm.status;
      }

      const response = await fetch(buildApiUrl(`/task/${selectedTask._id}`), {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update task");
      }

      // 2. Handle Hold/Resume transitions
      if (isPuttingOnHold) {
        const holdResponse = await fetch(buildApiUrl(`/task/${selectedTask._id}/hold`), {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
          body: JSON.stringify({ reason: "Updated via dashboard" }),
        });

        if (!holdResponse.ok) {
          const error = await holdResponse.json();
          throw new Error(error.message || "Failed to put task on hold");
        }
      } else if (isResuming) {
        const resumeResponse = await fetch(buildApiUrl(`/task/${selectedTask._id}/resume`), {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
          body: JSON.stringify({}),
        });

        if (!resumeResponse.ok) {
          const error = await resumeResponse.json();
          throw new Error(error.message || "Failed to resume task");
        }
        
        // Note: resumeTask sets status to 'in-progress'. 
        // If user wanted 'done', they might need to update again, but we'll leave it as in-progress for safety.
      }

      toast.success("Task updated successfully");
      setShowUpdateModal(false);
      setSelectedTask(null);
      
      // Refetch tasks to ensure all state (hold history, status flags) is synced
      fetchTasks();
      // Also update project stats as status might have changed
      fetchProjectStatistics();
      
    } catch (error: any) {
      console.error("Failed to update task:", error);
      toast.error(error.message || "Failed to update task");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenDeleteDialog = (task: Task) => {
    setSelectedTask(task);
    setShowDeleteDialog(true);
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      setIsDeleting(true);
      const response = await fetch(buildApiUrl(`/task/${selectedTask._id}`), {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete task");
      }

      toast.success("Task deleted successfully");
      setShowDeleteDialog(false);
      setSelectedTask(null);
      setTasks(prev => prev.filter(t => t._id !== (selectedTask as Task)._id));
    } catch (error: any) {
      console.error("Failed to delete task:", error);
      toast.error(error.message || "Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle task approval
  const handleApproveTask = async (taskId: string) => {
    try {
      const response = await fetch(buildApiUrl(`/task/${taskId}/approve`), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve task");
      }

      toast.success("Task approved successfully");
      fetchApprovalTasks(); // Refresh approval tasks
      fetchApprovalStats(); // Refresh approval stats
    } catch (error: any) {
      console.error("Failed to approve task:", error);
      toast.error(error.message || "Failed to approve task");
    }
  };

  // Handle task rejection
  const handleRejectTask = async (taskId: string, reason?: string) => {
    try {
      const response = await fetch(buildApiUrl(`/task/${taskId}/reject`), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reject task");
      }

      toast.success("Task rejected successfully");
      fetchApprovalTasks(); // Refresh approval tasks
      fetchApprovalStats(); // Refresh approval stats
    } catch (error: any) {
      console.error("Failed to reject task:", error);
      toast.error(error.message || "Failed to reject task");
    }
  };

  // ==================== RENDER GUARDS ====================

  if (isLoading || loading) {
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
      value: monthlyProjectStats.completed,
      fill: "#8a55d2",
    },
    {
      name: "Planning",
      value: monthlyProjectStats.planning,
      fill: "#f2761b",
    },
    {
      name: "In Progress",
      value: monthlyProjectStats.inProgress,
      fill: "#59c3c3",
    },
    {
      name: "On Hold",
      value: monthlyProjectStats.onHold,
      fill: "#CD2812",
    },
  ];

  // ==================== RENDER ====================

  return (
    <>
      {/* CSS Keyframe Animations */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      <div className="min-h-screen bg-[#F9F9F9] p-3 sm:p-4 md:p-6">
        <div className="max-w-full mx-auto space-y-4 md:space-y-6">
          {/* Page Title */}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
          </div>

          {/* TOP ROW: Statistics Cards + Project Chart Side by Side */}
          {(isAdmin || (accessibleProjectIds && accessibleProjectIds.size > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Project Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-[15px] order-1 md:order-none">
                {/* Total Projects Card */}
                <div className="bg-[#4a8cd7] h-[100px] sm:h-[120px] rounded-[10px] overflow-hidden relative">
                  {/* Decorative Circle - Creates light blue gradient effect on top */}
                  <div className="absolute left-[-85px] top-[-135px] w-[256px] h-[256px] rotate-[5.438deg]">
                    <div className="w-full h-full rounded-full bg-[#6ba9e3] opacity-40"></div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 p-3 sm:p-[15px]">
                    <p className="font-medium text-[14px] sm:text-[18px] text-white leading-normal mb-1 sm:mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Total Projects
                    </p>
                    <p className="font-medium text-[22px] sm:text-[28px] text-white leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {projectStats.totalProjects}
                    </p>
                  </div>
                </div>

                {/* Ongoing Projects Card */}
                <div className="bg-[#479c39] h-[100px] sm:h-[120px] rounded-[10px] overflow-hidden relative">
                  {/* Decorative Pattern - White wavy lines */}
                  <div className="absolute left-[50px] top-[8px] w-[200.5px] h-[126.5px]">
                    <img
                      src="/assets/2b063dca51b5ca11609fc603566283ea564647cb.svg"
                      alt=""
                      className="block max-w-none w-full h-full"
                    />
                  </div>

                  {/* Content */}
                  <div className="relative z-10 p-3 sm:p-[15px]">
                    <p className="font-medium text-[14px] sm:text-[18px] text-white leading-normal mb-1 sm:mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Ongoing Projects
                    </p>
                    <p className="font-medium text-[22px] sm:text-[28px] text-white leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {projectStats.ongoingProjects}
                    </p>
                  </div>
                </div>

                {/* Completed Projects Card */}
                <div className="bg-[#6647bf] h-[100px] sm:h-[120px] rounded-[10px] overflow-hidden relative">
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
                  <div className="relative z-10 p-3 sm:p-[15px]">
                    <p className="font-medium text-[14px] sm:text-[18px] text-white leading-normal mb-1 sm:mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Completed Projects
                    </p>
                    <p className="font-medium text-[22px] sm:text-[28px] text-white leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {projectStats.completedProjects}
                    </p>
                  </div>
                </div>

                {/* Proposed Projects Card */}
                <div className="bg-[#f27944] h-[100px] sm:h-[120px] rounded-[10px] overflow-hidden relative">
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
                  <div className="relative z-10 p-3 sm:p-[15px]">
                    <p className="font-medium text-[14px] sm:text-[18px] text-white leading-normal mb-1 sm:mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Proposed Projects
                    </p>
                    <p className="font-medium text-[22px] sm:text-[28px] text-white leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {projectStats.proposedProjects}
                    </p>
                  </div>
                </div>

                {/* Pending Approval Card */}
                <div className="bg-[#f59e0b] h-[100px] sm:h-[120px] rounded-[10px] overflow-hidden relative">
                  {/* Decorative Circle - Top Right */}
                  <div className="absolute right-[-20px] top-[-20px] w-[100px] h-[100px] rounded-full bg-[#fbbf24] opacity-40"></div>
                  {/* Decorative Circle - Bottom Left */}
                  <div className="absolute left-[-10px] bottom-[-10px] w-[60px] h-[60px] rounded-full bg-[#fbbf24] opacity-30"></div>

                  {/* Content */}
                  <div className="relative z-10 p-3 sm:p-[15px]">
                    <p className="font-medium text-[14px] sm:text-[18px] text-white leading-normal mb-1 sm:mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Pending Approval
                    </p>
                    <p className="font-medium text-[22px] sm:text-[28px] text-white leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {approvalStats.pendingApproval}
                    </p>
                  </div>
                </div>

                {/* Approved Tasks Card */}
                <div className="bg-[#10b981] h-[100px] sm:h-[120px] rounded-[10px] overflow-hidden relative">
                   {/* Decorative Square - Top Left */}
                  <div className="absolute left-[10px] top-[10px] w-[40px] h-[40px] rotate-45 bg-[#34d399] opacity-30"></div>
                   {/* Decorative Circle - Right */}
                  <div className="absolute right-[-30px] top-[20px] w-[120px] h-[120px] rounded-full bg-[#34d399] opacity-30"></div>

                  {/* Content */}
                  <div className="relative z-10 p-3 sm:p-[15px]">
                    <p className="font-medium text-[14px] sm:text-[18px] text-white leading-normal mb-1 sm:mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      Approved Tasks
                    </p>
                    <p className="font-medium text-[22px] sm:text-[28px] text-white leading-normal" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {approvalStats.approved}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Project Statistics Pie Chart */}
              <Card className="border border-[#e9ecf1] order-2 md:order-none">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-['Inter'] font-medium text-[16px] text-[#2e2e30]">
                      Project Statistics
                    </CardTitle>
                    {/* Month/Year Picker */}
                    <DropdownMenu open={showMonthPicker} onOpenChange={setShowMonthPicker}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-[25px] rounded-[6px] bg-[#f5f4f9] text-[#777777] text-[12px] font-['Inter'] hover:bg-[#e5e4e9] px-[8px] flex items-center gap-2"
                        >
                          <Calendar className="w-4 h-4" />
                          {formatMonthYear(selectedMonth, selectedYear)}
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[280px] p-4">
                        <div className="space-y-4">
                          {/* Year Selector */}
                          <div className="flex items-center justify-between gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newYear = selectedYear - 1;
                                setSelectedYear(newYear);
                                handleMonthChange(selectedMonth, newYear);
                              }}
                              className="h-8 px-2"
                            >
                              ←
                            </Button>
                            <span className="text-sm font-semibold">{selectedYear}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newYear = selectedYear + 1;
                                setSelectedYear(newYear);
                                handleMonthChange(selectedMonth, newYear);
                              }}
                              className="h-8 px-2"
                            >
                              →
                            </Button>
                          </div>
                          {/* Month Grid */}
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                            ].map((monthName, index) => (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-8 text-xs",
                                  selectedMonth === index && "bg-blue-100 border-blue-500"
                                )}
                                onClick={() => handleMonthChange(index, selectedYear)}
                              >
                                {monthName}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4">
                    {/* Pie Chart - Always on top */}
                    <div className="h-[200px] w-[200px] relative shrink-0">
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
                            animationBegin={0}
                            animationDuration={800}
                            animationEasing="ease-in-out"
                            isAnimationActive={true}
                          >
                            {chartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.fill}
                                style={{
                                  filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))',
                                  transition: 'all 0.3s ease-in-out'
                                }}
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #e0e0e0',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            }}
                            itemStyle={{
                              color: '#333',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center Text - Shows monthly total with smooth animation */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-500 ease-in-out">
                        <p className="font-['Inter'] font-semibold text-[20px] text-black leading-[23px] transition-all duration-300">
                          {monthlyProjectStats.total}
                        </p>
                        <p className="font-['Inter'] font-normal text-[12px] text-black leading-[12px] mt-1">
                          Total Projects
                        </p>
                      </div>
                    </div>

                    {/* Legend with animations - 2x2 grid for all screen sizes */}
                    <div className="grid grid-cols-2 gap-[15px] w-full max-w-[300px]">
                      {chartData.map((item, index) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between gap-2 transition-all duration-300 hover:scale-105 min-w-0"
                          style={{
                            animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                          }}
                        >
                          <div className="flex items-center gap-[5px] min-w-0">
                            <div
                              className="w-[10px] h-[10px] rounded-full transition-all duration-300 hover:scale-125 shrink-0"
                              style={{
                                backgroundColor: item.fill,
                                boxShadow: `0 2px 6px ${item.fill}40`
                              }}
                            />
                            <span className="font-['Inter'] font-semibold text-[12px] text-[#767676] truncate">
                              {item.name}
                            </span>
                          </div>
                          <span className="font-['Inter'] font-bold text-[12px] text-neutral-700 transition-all duration-300 shrink-0">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* BOTTOM ROW: Recent Projects Table + Task Overview Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Recent Ongoing Projects Table (2/3 width) */}
            <div className="lg:col-span-2 order-3 md:order-none">
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
                        {/* Workspace Dropdown (visible only when workspace exists) */}
                        {currentWorkspace && workspaces.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto rounded-[6px] bg-[#f5f4f9] text-[#777777] text-[12px] font-['Inter'] hover:bg-[#e5e4e9] px-[5px] py-[5px] flex items-center gap-[5px]"
                              >
                                <Building2 className="w-4 h-4" />
                                {currentWorkspace.name}
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
                        )}

                        {/* Project Type Filter - HIDDEN */}
                        {/* <DropdownMenu>
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
                      </DropdownMenu> */}

                        {/* Date Filter - HIDDEN */}
                        {/* <DropdownMenu>
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
                      </DropdownMenu> */}
                      </div>
                    </div>
                    <p className="font-['Inter'] font-normal text-[12px] text-[#717182] leading-[12px] tracking-[0.5px]">
                      Complete project profile including milestones and task details
                    </p>
                    <div className="mt-4 mb-2">
                      <div className="relative bg-[#f5f4f9] rounded-[8px] h-[37px] px-[10px] flex items-center w-full sm:w-[300px]">
                        <Search className="w-[15px] h-[15px] text-[#040110] opacity-60 mr-2" />
                        <input
                          type="text"
                          placeholder="Search projects..."
                          value={projectSearchQuery}
                          onChange={(e) => setProjectSearchQuery(e.target.value)}
                          className="bg-transparent border-none outline-none text-[14px] font-['Inter'] text-[#040110] opacity-60 placeholder:text-[#040110] placeholder:opacity-60 w-full"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-2 sm:px-[20px] pb-[15px]">
                  <div
                    ref={projectsTableRef}
                    className="border border-[#cccccc] rounded-[10px] overflow-auto"
                    style={{
                      height: syncedHeight ? `${syncedHeight}px` : 'auto',
                      overflowY: syncedHeight ? 'auto' : 'visible'
                    }}
                  >
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="bg-[#d5e5ff]">
                          <th className="text-left px-[8px] sm:px-[16px] py-[12px] text-[11px] sm:text-[12px] font-['Inter'] font-normal text-[rgba(0,0,0,0.6)] min-h-[40px] w-[40px] sm:w-[60px]">
                            <div className="flex items-center gap-2">
                              S.No
                            </div>
                          </th>
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
                              Duration
                              <Filter className="w-3 h-3" />
                            </div>
                          </th>
                          <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-normal text-[rgba(0,0,0,0.6)]">
                            <div className="flex items-center gap-2">
                              Days
                              <Filter className="w-3 h-3" />
                            </div>
                          </th>
                          {/* <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-normal text-[rgba(0,0,0,0.6)]">
                            Action
                          </th> */}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProjects.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-[16px] py-[14px] text-center text-[12px] font-['Inter'] text-black">
                              No projects found
                            </td>
                          </tr>
                        ) : (
                          filteredProjects.map((project, index) => (
                            <tr
                              key={project._id}
                              onClick={() => handleViewProject(project._id)}
                              className={cn(
                                "cursor-pointer transition-colors hover:bg-[#e6f2ff]",
                                index % 2 === 1 ? "bg-[#f2f7ff]" : ""
                              )}
                            >
                              <td className="px-[8px] sm:px-[16px] py-[10px] sm:py-[14px] text-[11px] sm:text-[12px] font-['Inter'] font-normal text-black tracking-[0.5px]">
                                {index + 1}
                              </td>
                              <td className="px-[8px] sm:px-[16px] py-[10px] sm:py-[14px] text-[11px] sm:text-[12px] font-['Inter'] font-normal text-black tracking-[0.5px] max-w-[150px] sm:max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap" title={project.title}>
                                {limitWords(project.title, 2)}
                              </td>
                              <td className="px-[8px] sm:px-[16px] py-[10px] sm:py-[14px] text-[11px] sm:text-[12px] font-['Inter'] font-normal text-black tracking-[0.5px] max-w-[180px] sm:max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap" title={project.description || "No description"}>
                                {limitWords(project.description || "No description", 3)}
                              </td>
                              <td className="px-[8px] sm:px-[16px] py-[10px] sm:py-[14px]">
                                <StatusBadge status={project.status} />
                              </td>
                              <td className="px-[8px] sm:px-[16px] py-[10px] sm:py-[14px]">
                                <div className="flex flex-col gap-1">
                                  <div className="text-[11px] sm:text-[12px] font-['Inter'] font-normal text-[#1a932e] tracking-[0.5px] whitespace-nowrap">
                                    {formatDateDDMMYYYY(project.startDate)}
                                  </div>
                                  <div className="text-[11px] sm:text-[12px] font-['Inter'] font-normal text-[#cd2812] tracking-[0.5px] whitespace-nowrap">
                                    {formatDateDDMMYYYY(project.endDate)}
                                  </div>
                                </div>
                              </td>
                              <td className="px-[8px] sm:px-[16px] py-[10px] sm:py-[14px] text-[11px] sm:text-[12px] font-['Inter'] font-semibold text-black tracking-[0.5px] whitespace-nowrap">
                                {calculateDaysBetween(project.startDate, project.endDate)} days
                              </td>
                              {/* <td className="px-[16px] py-[14px]">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto px-[10px] py-[5px] text-[12px] font-['Inter'] font-normal text-[#344bfd] hover:text-[#344bfd] hover:underline hover:bg-transparent"
                                  onClick={() => handleViewProject(project._id)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                              </td> */}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Task Overview Panel (1/3 width) - Shows last on mobile */}
            <div className="lg:col-span-1 order-4 md:order-none">
              <Card className="overflow-hidden px-2 sm:px-[10px] py-[15px]">
                <div className="px-[10px]">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-[10px] mb-[15px]">
                    <h3 className="font-['Inter'] font-medium text-[16px] text-[#2e2e30] leading-normal flex-1">
                      Task Overview
                    </h3>
                    {/* <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto rounded-[6px] bg-[#f5f4f9] text-[#777777] text-[12px] font-['Inter'] hover:bg-[#e5e4e9] px-[5px] py-[5px] flex items-center gap-[5px]"
                    >
                      See All
                      <ArrowRight className="w-4 h-4" />
                    </Button> */}
                  </div>

                  {/* Search and Filter */}
                  <div className="space-y-[10px] mb-[15px]">
                    <div className="relative bg-[#f5f4f9] rounded-[8px] h-[37px] px-[10px] flex items-center justify-between">
                      <div className="flex items-center gap-[10px]">
                        <Search className="w-[15px] h-[15px] text-[#040110] opacity-60" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={taskSearchQuery}
                          onChange={(e) => setTaskSearchQuery(e.target.value)}
                          className="bg-transparent border-none outline-none text-[14px] font-['Inter'] text-[#040110] opacity-60 placeholder:text-[#040110] placeholder:opacity-60"
                        />
                      </div>
                      {/* <Filter className="w-4 h-4 text-[#040110]" /> */}
                    </div>

                    <div className="flex items-center gap-[10px] overflow-x-auto scrollbar-visible">
                      <button
                        onClick={() => setTaskStatusFilter("all")}
                        className={cn(
                          "px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap",
                          taskStatusFilter === "all"
                            ? "border-b-[1px] border-[#f2761b] opacity-100"
                            : "opacity-60"
                        )}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setTaskStatusFilter("to-do")}
                        className={cn(
                          "px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap",
                          taskStatusFilter === "to-do"
                            ? "border-b-[1px] border-[#f2761b] opacity-100"
                            : "opacity-60"
                        )}
                      >
                        To Do
                      </button>
                      <button
                        onClick={() => setTaskStatusFilter("in-progress")}
                        className={cn(
                          "px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap",
                          taskStatusFilter === "in-progress"
                            ? "border-b-[1px] border-[#f2761b] opacity-100"
                            : "opacity-60"
                        )}
                      >
                        In Progress
                      </button>
                      <button
                        onClick={() => setTaskStatusFilter("on-hold")}
                        className={cn(
                          "px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap",
                          taskStatusFilter === "on-hold"
                            ? "border-b-[1px] border-[#f2761b] opacity-100"
                            : "opacity-60"
                        )}
                      >
                        On Hold
                      </button>
                      <button
                        onClick={() => setTaskStatusFilter("done")}
                        className={cn(
                          "px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap",
                          taskStatusFilter === "done"
                            ? "border-b-[1px] border-[#f2761b] opacity-100"
                            : "opacity-60"
                        )}
                      >
                        Done
                      </button>
                      {/* <button className="p-[10px] text-[#000d2a] opacity-60 hover:opacity-100 transition-all shrink-0">
                        <ArrowUpDown className="w-4 h-4" />
                      </button> */}
                    </div>
                  </div>

                  {/* Task List */}
                  <div ref={taskOverviewRef}>
                    <ScrollArea
                      className="scrollbar-visible"
                      style={{
                        height: syncedHeight ? `${syncedHeight}px` : '600px'
                      }}
                    >
                      <div className="space-y-[10px]">
                      {filteredTasks.length === 0 ? (
                        <div className="text-center py-8 text-[#717182] text-[14px] font-['Inter']">
                          {taskSearchQuery ? "No tasks match your search" : "No tasks found"}
                        </div>
                      ) : (
                        filteredTasks.map((task) => {
                          return (
                            <div
                              key={task._id}
                              onClick={() => navigate(`/task/${task._id}`)}
                              className={cn(
                                "rounded-lg border border-gray-200 bg-white px-[10px] py-4 transition-all duration-200 hover:shadow-md hover:border-gray-300 cursor-pointer w-full",
                                "flex gap-3 items-start min-h-fit"
                              )}
                            >
                              {/* Status indicator */}
                              <div
                                className={cn(
                                  "w-1 min-h-[40px] rounded-full shrink-0 mt-1 self-stretch",
                                  task.status === "to-do" && "bg-blue-500",
                                  task.status === "in-progress" && "bg-amber-500",
                                  task.status === "done" && "bg-green-500",
                                  task.status === "on-hold" && "bg-[#CD2812]"
                                )}
                              />

                              {/* Task content */}
                              <div className="flex-1 min-w-0">
                                {/* Task title */}
                                <h4 className="font-medium text-gray-900 text-sm leading-5 mb-2 break-words">
                                  {task.title.length > 50 ? `${task.title.substring(0, 50)}...` : task.title}
                                </h4>

                                {/* Task description */}
                                {task.description && (
                                  <p className="text-gray-600 text-xs leading-4 mb-3 break-words whitespace-pre-wrap">
                                    {task.description}
                                  </p>
                                )}

                                {/* Task metadata */}
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  {/* Assignee */}
                                  {task.assignedTo && (
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
                                        {task.assignedTo.name.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="text-gray-700 text-xs font-medium truncate">
                                        {task.assignedTo.name.split(' ')[0].charAt(0).toUpperCase() + task.assignedTo.name.split(' ')[0].slice(1).toLowerCase()}
                                      </span>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2 shrink-0">
                                    {/* Status badge */}
                                    <div className={cn(
                                      "px-2 py-1 rounded-full text-xs font-medium",
                                      task.status === "to-do" && "bg-blue-100 text-blue-700",
                                      task.status === "in-progress" && "bg-amber-100 text-amber-700",
                                      task.status === "done" && "bg-green-100 text-green-700",
                                      task.status === "on-hold" && "bg-red-100 text-red-700"
                                    )}>
                                      {task.status === "to-do" ? "To Do" :
                                        task.status === "in-progress" ? "In Progress" :
                                        task.status === "on-hold" ? "On Hold" : "Done"}
                                    </div>

                                    {/* 3-dot menu - Admin only */}
                                    {(user?.role === 'admin' || user?.role === 'super_admin') && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 hover:bg-gray-100"
                                          >
                                            <MoreVertical className="h-4 w-4 text-gray-600" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenUpdateModal(task);
                                            }}
                                            className="cursor-pointer"
                                          >
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Update
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenDeleteDialog(task);
                                            }}
                                            className="cursor-pointer text-red-600 focus:text-red-600"
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
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
                </div>
              </Card>
            </div>
          </div>

          {/* Approval Tasks Table - Only for TL/Lead/Admin/Owner */}
          {canSeeApprovalTable && (
            <div className="mt-6">
              <Card className="shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
                <CardHeader className="px-[20px] py-[15px]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-['Inter'] font-medium text-[18px] text-black leading-[22px]">
                        Task Approval Management
                      </h3>
                      <p className="font-['Inter'] font-normal text-[12px] text-[#717182] leading-[12px] tracking-[0.5px] mt-2">
                        Review and approve or reject task submissions
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-600">
                        Pending: <span className="font-semibold text-orange-600">{approvalTasks.length}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-2 sm:px-[20px] pb-[15px]">
                  {approvalTasksLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                      <span className="text-gray-600">Loading approval tasks...</span>
                    </div>
                  ) : approvalTasks.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p className="text-lg font-medium mb-2">No tasks pending approval</p>
                      <p className="text-sm">All submitted tasks have been reviewed</p>
                    </div>
                  ) : (
                    <div className="border border-[#cccccc] rounded-[10px] overflow-x-auto">
                      <table className="w-full min-w-[1000px]">
                        <thead>
                          <tr className="bg-[#d5e5ff]">
                            <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-medium text-[rgba(0,0,0,0.8)]">
                              Task Title
                            </th>
                            <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-medium text-[rgba(0,0,0,0.8)]">
                              Project
                            </th>
                            <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-medium text-[rgba(0,0,0,0.8)]">
                              Assignee
                            </th>
                            <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-medium text-[rgba(0,0,0,0.8)]">
                              Submitted
                            </th>
                            <th className="text-left px-[16px] py-[12px] text-[12px] font-['Inter'] font-medium text-[rgba(0,0,0,0.8)]">
                              Priority
                            </th>
                            <th className="text-center px-[16px] py-[12px] text-[12px] font-['Inter'] font-medium text-[rgba(0,0,0,0.8)]">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {approvalTasks.map((task, index) => (
                            <tr
                              key={task._id}
                              onClick={() => navigate(`/task/${task._id}`)}
                              className={cn(
                                "transition-colors hover:bg-[#e6f2ff] cursor-pointer",
                                index % 2 === 1 ? "bg-[#f2f7ff]" : "bg-white"
                              )}
                            >
                              <td className="px-[16px] py-[14px] text-[12px] font-['Inter'] text-black">
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium">{task.title}</span>
                                  {task.description && (
                                    <span className="text-[11px] text-gray-600 line-clamp-1">
                                      {task.description}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-[16px] py-[14px] text-[12px] font-['Inter'] text-black">
                                {task.project?.title || "N/A"}
                              </td>
                              <td className="px-[16px] py-[14px] text-[12px] font-['Inter'] text-black">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                                    {task.assignedTo?.name?.charAt(0).toUpperCase() || "?"}
                                  </div>
                                  <span>{task.assignedTo?.name || "Unassigned"}</span>
                                </div>
                              </td>
                              <td className="px-[16px] py-[14px] text-[12px] font-['Inter'] text-gray-600">
                                {(task as any).submittedForApprovalAt
                                  ? formatDateDDMMYYYY((task as any).submittedForApprovalAt)
                                  : "N/A"}
                              </td>
                              <td className="px-[16px] py-[14px]">
                                <Badge
                                  className={cn(
                                    "text-xs",
                                    task.priority === "high" && "bg-red-100 text-red-700",
                                    task.priority === "medium" && "bg-yellow-100 text-yellow-700",
                                    task.priority === "low" && "bg-green-100 text-green-700"
                                  )}
                                >
                                  {task.priority || "N/A"}
                                </Badge>
                              </td>
                              <td className="px-[16px] py-[14px]">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApproveTask(task._id);
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs h-auto"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRejectTask(task._id);
                                    }}
                                    className="px-3 py-1 text-xs h-auto"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Update Task Modal */}
      <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[450px] overflow-y-auto sm:max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Update Task</DialogTitle>
            <DialogDescription>
              Make changes to the task details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="grid gap-1">
                  <Label>Project</Label>
                  <div className="text-sm text-gray-700">{selectedTask?.project?.title || "—"}</div>
                </div>
                <div className="grid gap-1">
                  <Label>Workspace</Label>
                  <div className="text-sm text-gray-700">{currentWorkspace?.name || "—"}</div>
                </div>
                <div className="grid gap-1">
                  <Label>Assigned To</Label>
                  <div className="text-sm text-gray-700">{selectedTask?.assignedTo?.name || "—"}</div>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={updateForm.title}
                onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })}
                placeholder="Enter task title"
                disabled={(selectedTask as any)?.approvalStatus === "approved"}
                className={cn("w-full", (selectedTask as any)?.approvalStatus === "approved" ? "opacity-50 cursor-not-allowed" : "")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={updateForm.description}
                onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                placeholder="Enter task description"
                rows={3}
                disabled={(selectedTask as any)?.approvalStatus === "approved"}
                className={cn("w-full", (selectedTask as any)?.approvalStatus === "approved" ? "opacity-50 cursor-not-allowed" : "")}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={updateForm.priority} onValueChange={(value) => setUpdateForm({ ...updateForm, priority: value })}>
                  <SelectTrigger className={cn("w-full", (selectedTask as any)?.approvalStatus === "approved" ? "opacity-50 cursor-not-allowed" : "")} disabled={(selectedTask as any)?.approvalStatus === "approved"}>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={updateForm.status} onValueChange={(value) => setUpdateForm({ ...updateForm, status: value })}>
                  <SelectTrigger className={cn("w-full", (selectedTask as any)?.approvalStatus === "approved" ? "opacity-50 cursor-not-allowed" : "")} disabled={(selectedTask as any)?.approvalStatus === "approved"}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="to-do">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date fields commented out
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={updateForm.startDate}
                  onChange={(e) => setUpdateForm({ ...updateForm, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={updateForm.dueDate}
                  onChange={(e) => setUpdateForm({ ...updateForm, dueDate: e.target.value })}
                />
              </div>
              */}
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowUpdateModal(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTask} disabled={(selectedTask as any)?.approvalStatus === "approved" || isUpdating || !updateForm.title.trim()} className={(selectedTask as any)?.approvalStatus === "approved" ? "opacity-50 cursor-not-allowed" : ""}>
              {isUpdating ? "Updating..." : "Update Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTask?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Dashboard;
