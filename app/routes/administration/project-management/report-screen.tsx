import React, { useState, useEffect, useMemo } from 'react';
import { useLoaderData, useNavigate } from 'react-router';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import axios from '@/lib/axios';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { Loader2, Filter, FileBarChart, RefreshCw, Users, CheckCircle2, AlertCircle, FileText, Download, ChevronDown, ChevronUp, Clock, AlertTriangle, Zap, Timer, TrendingUp, Activity, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildBackendUrl } from '@/lib/config';

// Types
interface Workspace {
  _id: string;
  name: string;
}

interface Project {
  _id: string;
  title: string;
  status: string;
}

interface Member {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Attachment {
  originalName: string;
  filename: string;
  path: string;
  mimetype?: string;
  size?: number;
}

interface TaskData {
  _id: string;
  originalTaskId?: string;
  title: string;
  description: string;
  status: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  approvalStatus: string;
  startDate: string;
  dueDate: string;
  completedAt?: string;
  durationDays: number;
  assignee?: Member;
  handoverNotes?: string;
  handoverAttachments?: Attachment[];
  handoverEntries?: any[];
  isRecurring?: boolean;
  rejections?: any[];
}

interface ReportData {
  range: { start: string; end: string };
  totalTasks: number;
  statusBreakdown: {
    todo: number;
    inProgress: number;
    onHold: number;
    approved: number;
    notApproved: number;
    rejected: number;
  };
  memberPerformance: Record<string, {
    name: string;
    totalAssigned: number;
    completed: number;
    reworks: number;
    onTime: number;
  }>;
  tasks: TaskData[];
}

const COLORS = {
  todo: '#94a3b8',       // Slate 400
  inProgress: '#3b82f6', // Blue 500
  onHold: '#f59e0b',     // Amber 500
  approved: '#22c55e',   // Green 500
  notApproved: '#ef4444',// Red 500
  rejected: '#dc2626'    // Red 600
};

export default function ReportScreen() {
  const navigate = useNavigate();
  
  // Selection State
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("all"); // "all" or userId

  // Filter State
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));

  // Data State
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  
  // Handover Modal State
  const [selectedTaskForHandover, setSelectedTaskForHandover] = useState<TaskData | null>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  
  // Accordion State
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});

  const toggleMember = (memberId: string) => {
    setExpandedMembers(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  // Sync expanded state with selection
  useEffect(() => {
    if (selectedMember !== 'all') {
      setExpandedMembers({ [selectedMember]: true });
    } else {
      setExpandedMembers({});
    }
  }, [selectedMember]);

  // Derived Metrics
  const priorityCounts = useMemo(() => {
    if (!reportData?.tasks) return { high: 0, urgent: 0, medium: 0, low: 0 };
    const counts = { high: 0, urgent: 0, medium: 0, low: 0 };
    reportData.tasks.forEach(t => {
      if (t.priority === 'urgent') counts.urgent++;
      else if (t.priority === 'high') counts.high++;
      else if (t.priority === 'medium') counts.medium++;
      else if (t.priority === 'low') counts.low++;
    });
    return counts;
  }, [reportData]);

  const avgCompletionTime = useMemo(() => {
    if (!reportData?.tasks) return 0;
    const completedTasks = reportData.tasks.filter(t => t.status === 'done' && t.completedAt && t.startDate);
    if (completedTasks.length === 0) return 0;
    
    const totalDays = completedTasks.reduce((acc, t) => {
      const start = new Date(t.startDate);
      const end = new Date(t.completedAt!);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return acc + diffDays;
    }, 0);
    
    return (totalDays / completedTasks.length).toFixed(1);
  }, [reportData]);

  // Velocity Chart Data
  const velocityData = useMemo(() => {
    if (!reportData?.tasks) return [];
    
    const completedTasks = reportData.tasks
      .filter(t => t.status === 'done' && t.completedAt)
      .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());

    const dateMap = new Map<string, number>();
    
    completedTasks.forEach(task => {
      const date = format(new Date(task.completedAt!), 'MMM dd');
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    return Array.from(dateMap.entries()).map(([date, count]) => ({
      date,
      tasks: count
    }));
  }, [reportData]);

  // Team Performance Metrics (Radar)
  const teamPerformanceData = useMemo(() => {
    if (!reportData?.tasks || reportData.totalTasks === 0) return [];

    const completedTasks = reportData.tasks.filter(t => t.status === 'done');
    const totalCompleted = completedTasks.length;
    
    if (totalCompleted === 0) return [
      { subject: 'Reliability', A: 0, fullMark: 100 },
      { subject: 'Quality', A: 100, fullMark: 100 },
      { subject: 'Velocity', A: 0, fullMark: 100 },
      { subject: 'Efficiency', A: 0, fullMark: 100 },
    ];

    // Reliability: On-time completion
    const onTimeTasks = completedTasks.filter(t => 
      t.completedAt && t.dueDate && new Date(t.completedAt) <= new Date(t.dueDate)
    ).length;
    const reliability = Math.round((onTimeTasks / totalCompleted) * 100);

    // Quality: Tasks without rejections
    const perfectTasks = completedTasks.filter(t => !t.rejections || t.rejections.length === 0).length;
    const quality = Math.round((perfectTasks / totalCompleted) * 100);

    // Velocity: Completion Rate relative to total tasks in range
    const velocity = Math.round((totalCompleted / reportData.totalTasks) * 100);

    // Efficiency: Estimated Duration vs Actual Duration
    let totalEstimated = 0;
    let totalActual = 0;
    completedTasks.forEach(t => {
      if (t.durationDays && t.startDate && t.completedAt) {
        totalEstimated += t.durationDays;
        const start = new Date(t.startDate);
        const end = new Date(t.completedAt);
        const actualDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        totalActual += actualDays;
      }
    });
    
    const efficiency = totalActual > 0 ? Math.min(100, Math.round((totalEstimated / totalActual) * 100)) : 0;

    return [
      { subject: 'Reliability', A: reliability, fullMark: 100 },
      { subject: 'Quality', A: quality, fullMark: 100 },
      { subject: 'Velocity', A: velocity, fullMark: 100 },
      { subject: 'Efficiency', A: efficiency, fullMark: 100 },
    ];
  }, [reportData]);

  // Fetch Workspaces on Mount
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await axios.get('/workspace');
        const validWorkspaces = res.data.workspaces.map((w: any) => ({
          _id: w.workspaceId._id,
          name: w.workspaceId.name
        }));
        setWorkspaces(validWorkspaces);
        
        // Auto-select current workspace if available
        if (res.data.currentWorkspace) {
          setSelectedWorkspace(res.data.currentWorkspace._id || res.data.currentWorkspace);
        } else if (validWorkspaces.length > 0) {
          setSelectedWorkspace(validWorkspaces[0]._id);
        }
      } catch (error) {
        console.error("Failed to fetch workspaces", error);
      } finally {
        setInitializing(false);
      }
    };
    fetchWorkspaces();
  }, []);

  // Handle Workspace Change
  const handleWorkspaceChange = async (workspaceId: string) => {
    // 1. Update Selection State
    setSelectedWorkspace(workspaceId);
    setSelectedProject(""); 
    setReportData(null); 
    
    // 2. Clear Dependent Data Immediately
    setProjects([]); 
    setMembers([]); 
    
    try {
      setLoading(true);
      // 3. Switch Workspace Context
      await axios.post('/workspace/switch', { workspaceId });
      
      // 4. Fetch Projects for new workspace
      const projRes = await axios.get('/projects');
      setProjects(projRes.data.projects || []);
      
    } catch (error) {
      console.error("Failed to switch workspace or fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Project Change - Fetch Members
  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (!selectedProject) {
        setMembers([]);
        return;
      }

      try {
        // Fetch members for the specific project
        const res = await axios.get(`/projects/${selectedProject}/team`);
        
        // Combine project head and members
        const allMembers: any[] = [];
        const headPool = [
          ...(res.data.projectHeads || []),
          ...(res.data.projectHead ? [res.data.projectHead] : [])
        ];
        headPool.forEach((head: any) => {
          if (head?._id && !allMembers.some((m: any) => m._id === head._id)) {
            allMembers.push({ ...head, role: 'project-head' });
          }
        });
        if (res.data.members) {
          allMembers.push(...res.data.members);
        }
        
        // Deduplicate by ID
        const uniqueMembers = Array.from(new Map(allMembers.map(item => [item._id, item])).values());
        
        setMembers(uniqueMembers);
      } catch (error) {
        console.error("Failed to fetch project members", error);
      }
    };

    fetchProjectMembers();
  }, [selectedProject]);

  // Effect to load initial data if workspace is already selected (e.g. on load)
  useEffect(() => {
    // Only run on mount/init when we have a workspace but no data
    if (selectedWorkspace && !projects.length && !initializing) {
      handleWorkspaceChange(selectedWorkspace);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspace, initializing]);

  // Generate Report
  const generateReport = async () => {
    if (!selectedProject || !startDate || !endDate) return;

    setLoading(true);
    try {
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      
      const url = `/projects/${selectedProject}/report?startDate=${startStr}&endDate=${endStr}`;
      const res = await axios.get(url);
      setReportData(res.data);
    } catch (error) {
      console.error("Failed to generate report", error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger report generation when filters change (optional, or use a button)
  // For now, let's use a button to avoid too many requests or auto-fetch if project selected
  useEffect(() => {
    if (selectedProject && startDate && endDate) {
      generateReport();
    }
  }, [selectedProject, startDate, endDate]);

  // Process Data for Charts
  const statusChartData = useMemo(() => {
    if (!reportData) return [];
    const s = reportData.statusBreakdown;
    return [
      { name: 'To Do', value: s.todo, color: COLORS.todo },
      { name: 'In Progress', value: s.inProgress, color: COLORS.inProgress },
      { name: 'On Hold', value: s.onHold, color: COLORS.onHold },
      { name: 'Approved', value: s.approved, color: COLORS.approved },
      { name: 'Not Approved', value: s.notApproved, color: COLORS.notApproved },
    ].filter(item => item.value > 0);
  }, [reportData]);

  const memberChartData = useMemo(() => {
    if (!reportData) return [];
    
    // Filter by selected member if set
    let memberIds = Object.keys(reportData.memberPerformance);
    if (selectedMember && selectedMember !== 'all') {
      memberIds = memberIds.filter(id => id === selectedMember);
    }

    return memberIds.map(id => {
      const stats = reportData.memberPerformance[id];
      return {
        name: stats.name || 'Unknown',
        Assigned: stats.totalAssigned,
        Completed: stats.completed,
        Reworks: stats.reworks
      };
    }).sort((a, b) => b.Completed - a.Completed); // Sort by completed
  }, [reportData, members, selectedMember]);



  if (initializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-8 bg-slate-50/50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Project Analytics</h1>
        <p className="text-slate-500 text-sm md:text-base">
          Comprehensive report for admins and leads. Select a workspace and project to begin.
        </p>
      </div>

      {/* Filters Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            {/* <Filter className="h-5 w-5 text-primary" /> */}
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Workspace Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Workspace</label>
              <Select value={selectedWorkspace} onValueChange={handleWorkspaceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws._id} value={ws._id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Project</label>
              <Select 
                value={selectedProject} 
                onValueChange={setSelectedProject}
                disabled={!selectedWorkspace || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-slate-700">Date Range</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <DatePicker 
                  date={startDate} 
                  onSelect={setStartDate} 
                  placeholder="Start Date"
                  className="w-full"
                />
                <DatePicker 
                  date={endDate} 
                  onSelect={setEndDate} 
                  placeholder="End Date"
                  className="w-full"
                />
              </div>
            </div>

          </div>
          
          {/* Member Filter - Full Width Below */}
          {(selectedWorkspace && selectedProject) && (
            <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-sm font-medium text-slate-700 block mb-2">Assigned Member (Optional)</label>
              <Select 
                value={selectedMember} 
                onValueChange={setSelectedMember}
              >
                <SelectTrigger className="w-full md:w-1/2 lg:w-1/3">
                  <SelectValue placeholder="All Members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Report Content */}
      {!loading && reportData && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total Tasks</p>
                    <h3 className="text-2xl font-bold">{reportData.totalTasks}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                    <FileBarChart className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Completion Rate</p>
                    <h3 className="text-2xl font-bold text-green-600">
                      {reportData.totalTasks > 0 
                        ? Math.round((reportData.statusBreakdown.approved / reportData.totalTasks) * 100) 
                        : 0}%
                    </h3>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Avg. Completion Time</p>
                    <h3 className="text-2xl font-bold text-blue-600">
                      {avgCompletionTime} <span className="text-sm font-normal text-slate-500">days</span>
                    </h3>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Timer className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Urgent & High Priority</p>
                    <h3 className="text-2xl font-bold text-orange-600">
                      {priorityCounts.urgent + priorityCounts.high}
                    </h3>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <Zap className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Needs Approval</p>
                    <h3 className="text-2xl font-bold text-amber-600">
                      {reportData.statusBreakdown.notApproved}
                    </h3>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Overdue Tasks</p>
                    <h3 className="text-2xl font-bold text-red-600">
                      {reportData.tasks.filter(t => t.status !== 'done' && new Date(t.dueDate) < new Date(new Date().setHours(0,0,0,0))).length}
                    </h3>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Velocity & Team Health */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Velocity Chart
                </CardTitle>
                <CardDescription>Tasks completed over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={velocityData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="tasks" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Team Health
                    </CardTitle>
                    <CardDescription>Overall performance metrics</CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary">
                        <Info className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Metric Calculations</DialogTitle>
                        <DialogDescription>How we measure team health</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-slate-900">Reliability</h4>
                          <p className="text-xs text-slate-500">Percentage of tasks completed on or before the due date.</p>
                          <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            (On-time / Total Completed) × 100
                          </code>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-slate-900">Quality</h4>
                          <p className="text-xs text-slate-500">Percentage of tasks approved without any rejections or rework.</p>
                          <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            (No Reworks / Total Completed) × 100
                          </code>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-slate-900">Velocity</h4>
                          <p className="text-xs text-slate-500">Completion rate relative to the total number of tasks assigned in this period.</p>
                          <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            (Completed / Total Assigned) × 100
                          </code>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-slate-900">Efficiency</h4>
                          <p className="text-xs text-slate-500">Ratio of estimated duration versus actual time taken.</p>
                          <code className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            (Estimated / Actual) × 100
                          </code>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={teamPerformanceData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Score"
                      dataKey="A"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.5}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Status Breakdown Chart */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>Distribution of active tasks</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Member Performance Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Member Performance</CardTitle>
                <CardDescription>Tasks assigned vs. completed vs. reworks</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={memberChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="Assigned" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Reworks" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Member Details & Task Table (Grouped) */}
          <div className="space-y-4">
             {(selectedMember === 'all' 
                 ? [...members, { _id: 'unassigned', name: 'Unassigned', email: '', role: '' }] 
                 : members.filter(m => m._id === selectedMember)
              ).map(member => {
                 // Filter tasks for this member
                 const memberTasks = reportData.tasks.filter(t => {
                     if (member._id === 'unassigned') return !t.assignee;
                     return t.assignee?._id === member._id;
                 });

                 // Skip if no tasks and we are showing 'all'
                 if (memberTasks.length === 0 && selectedMember === 'all') return null;

                 const isExpanded = expandedMembers[member._id];

                 return (
                   <Card key={member._id} className={cn(
                     "border-slate-200 transition-all duration-300 overflow-hidden",
                     isExpanded 
                       ? "shadow-lg ring-1 ring-primary/20 border-primary/20" 
                       : "shadow-sm hover:shadow-md hover:border-slate-300"
                   )}>
                     <div 
                       className={cn(
                         "flex items-center justify-between p-4 cursor-pointer transition-colors duration-200",
                         isExpanded ? "bg-slate-50/80" : "hover:bg-slate-50/50"
                       )}
                       onClick={() => toggleMember(member._id)}
                     >
                        <div className="flex items-center gap-4">
                           <div className={cn(
                             "h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 shadow-sm", 
                             member._id === 'unassigned' 
                               ? "bg-slate-100 text-slate-500 ring-2 ring-white" 
                               : "bg-gradient-to-br from-primary/10 to-primary/20 text-primary ring-2 ring-primary/10"
                           )}>
                             {member._id === 'unassigned' ? '?' : member.name.charAt(0)}
                           </div>
                           <div>
                              <h3 className="text-base font-semibold text-slate-900 group-hover:text-primary transition-colors">
                                {member.name}
                              </h3>
                              {member.email && (
                                <p className="text-slate-500 text-sm">
                                  {member.email}
                                </p>
                              )}
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex items-center gap-2 mr-2">
                             <div className="text-xs font-medium text-slate-500">
                               {memberTasks.filter(t => t.status === 'done').length} / {memberTasks.length} Done
                             </div>
                             <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                               <div 
                                 className="h-full bg-primary/80 rounded-full transition-all duration-500"
                                 style={{ width: `${memberTasks.length > 0 ? (memberTasks.filter(t => t.status === 'done').length / memberTasks.length) * 100 : 0}%` }}
                               />
                             </div>
                          </div>
                          <Badge variant="secondary" className="bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
                            {memberTasks.length} Task{memberTasks.length !== 1 && 's'}
                          </Badge>
                          <div className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "rotate-0")}>
                             <ChevronDown className="h-5 w-5 text-slate-400" />
                          </div>
                        </div>
                     </div>
                     
                     <div 
                       className={cn(
                         "grid transition-all duration-300 ease-in-out",
                         isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                       )}
                     >
                       <div className="overflow-hidden min-h-0">
                         <div className="border-t border-slate-100">
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b-slate-200">
                                    <TableHead className="font-semibold text-slate-700">Task Name</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Description</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Start Date</TableHead>
                                    <TableHead className="font-semibold text-slate-700">End Date</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Completed Date</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Duration (Days)</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {memberTasks.length > 0 ? (
                                    memberTasks.map((task) => (
                                      <TableRow key={task._id} className={cn(
                                        "transition-colors hover:bg-slate-50/80",
                                        task.isRecurring && "bg-purple-50/30 hover:bg-purple-50/60"
                                      )}>
                                        <TableCell className="font-medium">
                                           <div className="flex items-center gap-2">
                                              <a 
                                                href={`/task/${task.originalTaskId || task._id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:text-primary/80 hover:underline font-semibold transition-colors"
                                              >
                                                {task.title}
                                              </a>
                                              {task.isRecurring && (
                                                <Badge variant="outline" className="text-[10px] h-5 border-purple-200 text-purple-700 bg-purple-50 px-1.5 shadow-sm">
                                                  Recurring
                                                </Badge>
                                              )}
                                           </div>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate text-slate-600" title={task.description}>
                                          {task.description || '-'}
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                          {task.startDate ? format(new Date(task.startDate), 'MMM d, yyyy') : '-'}
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                          {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '-'}
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                          {task.completedAt ? format(new Date(task.completedAt), 'MMM d, yyyy') : '-'}
                                        </TableCell>
                                        <TableCell className="text-slate-600">{task.durationDays || '-'}</TableCell>
                                        <TableCell>
                                          <Badge variant="outline" className={cn(
                                            "font-medium border shadow-sm",
                                            task.status === 'done' && task.approvalStatus === 'approved' 
                                              ? 'bg-green-50 text-green-700 border-green-200' 
                                              : task.status === 'done' && task.approvalStatus === 'pending-approval'
                                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                                              : task.status === 'done' && task.approvalStatus === 'rejected'
                                              ? 'bg-red-50 text-red-700 border-red-200'
                                              : task.status === 'in-progress'
                                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                                              : 'bg-slate-50 text-slate-600 border-slate-200'
                                          )}>
                                            {task.status === 'done' ? (
                                              task.approvalStatus === 'pending-approval' ? 'Pending Approval' : 
                                              task.approvalStatus === 'approved' ? 'Approved' :
                                              task.approvalStatus === 'rejected' ? 'Rejected' : 'Done'
                                            ) : (
                                              task.status === 'to-do' ? 'To Do' :
                                              task.status === 'in-progress' ? 'In Progress' :
                                              task.status === 'on-hold' ? 'On Hold' : task.status
                                            )}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          {(task.handoverNotes || (task.handoverAttachments && task.handoverAttachments.length > 0)) && (
                                            <Button 
                                              variant="ghost" 
                                              size="sm"
                                              className="text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors"
                                              onClick={(e) => {
                                                e.stopPropagation(); // Prevent accordion toggle
                                                setSelectedTaskForHandover(task);
                                                setIsHandoverModalOpen(true);
                                              }}
                                            >
                                              <FileText className="h-4 w-4 mr-1.5" />
                                              Handover
                                            </Button>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                          <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center">
                                            <CheckCircle2 className="h-5 w-5 text-slate-300" />
                                          </div>
                                          <p>No tasks found for this member</p>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                         </div>
                       </div>
                     </div>
                   </Card>
                 );
              })}
          </div>
        </div>
      )}

      {/* Handover Modal */}
      <Dialog open={isHandoverModalOpen} onOpenChange={setIsHandoverModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Handover Details</DialogTitle>
            <DialogDescription>
              Task: {selectedTaskForHandover?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-900">Handover Notes</h4>
              <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-700 min-h-[80px]">
                {selectedTaskForHandover?.handoverNotes || "No notes provided."}
              </div>
            </div>

            {selectedTaskForHandover?.handoverAttachments && selectedTaskForHandover.handoverAttachments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-900">Attachments</h4>
                <div className="space-y-2">
                  {selectedTaskForHandover.handoverAttachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-white">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                        <span className="text-sm truncate">{file.originalName || file.filename}</span>
                      </div>
                      <a 
                        href={buildBackendUrl(file.path.replace(/\\/g, '/'))} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs flex-shrink-0"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => setIsHandoverModalOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
