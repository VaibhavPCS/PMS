// ==================== API Response Types ====================

export interface Workload {
  userId: string;
  userName: string;
  openTaskCount: number;
}

export interface ActiveProject {
  projectId: string;
  projectName: string;
}

// ✅ CORRECTED: Match backend response structure
export interface WorkspaceSummary {
  workspaceId: string; // Backend returns this directly (no _id at root)
  overallCompletionRate: number;
  activeProjects: ActiveProject[];
  workloadDistribution: Workload[];
  lastUpdatedAt: string; // ✅ Changed from Date to string (API returns ISO string)
}

export interface ProjectHead {
  userId: string;
  userName: string;
}

export interface ProjectLeaderboardEntry {
  _id: string;
  projectId: string;
  projectName: string;
  projectHead: ProjectHead;
  status: 'On Track' | 'At Risk' | 'Off Track' | 'Completed';
  completionPercentage: number;
  dueDate: string; // ✅ Changed from Date to string
  lastUpdatedAt: string; // ✅ Changed from Date to string
}

export interface VelocityDataPoint {
  date: string; // YYYY-MM-DD
  tasksCreated: number;
  tasksCompleted: number;
}

export interface ProjectAnalytics {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  averageDuration: number;
  velocity: {
    weekly: number;
    monthly: number;
    timeSeries: VelocityDataPoint[];
  };
  overdueTasks: number;
  overduePercentage: number;
  statusDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  completionTimeByPriority: Record<string, number>;
}

export interface ProjectAnalyticsResponse {
  analytics: {
    overall: ProjectAnalytics;
    categories: Record<string, any>;
  };
  project: Record<string, any>;
  totalTasks: number;
}

export interface UserProductivityStats {
  openTaskCount: number;
  tasksDueNext7Days: TaskDueNext7Days[];
  tasksCompletedLast7Days: number;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

// ==================== Hook Parameters ====================

export interface ProjectAnalyticsParams {
  projectId: string;
  startDate?: string;
  endDate?: string;
}
export interface LeaderboardResponse {
  leaderboard: ProjectLeaderboardEntry[];
  totalProjects: number;
  lastUpdated: string | null;
  workspaceRole: string;
  workspaceId: string;
}

// frontend/app/features/analytics/types/index.ts

export interface TaskDueNext7Days {
  _id: string;
  title: string;
  dueDate: Date | string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'to-do' | 'in-progress' | 'done';
  projectTitle?: string;
}