import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../../provider/auth-context";
import { fetchData, postData, deleteData, putData, postMultipart } from "@/lib/fetch-util";
import { buildApiUrl } from "@/lib/config"; // ✅ NEW: Added buildApiUrl import
import {
  ArrowLeft,
  Plus,
  Settings,
  Calendar as CalendarIcon,
  KanbanSquare,
  CheckSquare,
  Clock,
  AlertCircle,
  Loader2,
  Target,
  CheckCircle2,
  PlayCircle,
  Pause,
  BarChart3,
  Filter,
  X,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  MapPin,
  Eye,
  EyeOff,
  Users,
  UserPlus,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator, // ✅ ADDED: Import separator
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// ✅ ADDED: Import AlertDialog components
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/status-badge";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { TeamAvatars } from "@/components/project/TeamAvatars";
import RemoveProjectMembersModal from "@/components/project/RemoveProjectMembersModal";
import ProjectApprovalMetrics from "@/features/analytics/components/ProjectApprovalMetrics";
import { InviteMembersButton } from "@/components/project/InviteMembersButton";
import { ProjectOverviewPanel } from "@/components/project/ProjectOverviewPanel";
import { AttachmentsSidebar } from "@/components/project/AttachmentsSidebar";
import { FilePreviewModal } from "@/components/project/FilePreviewModal";
import { AttachmentUpload } from "@/components/project/AttachmentUpload";
import { usePermissions } from "@/hooks/use-permissions";
import { TruncatedTextModal } from "@/components/ui/truncated-text-modal";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface Task {
  _id: string;
  title: string;
  description: string;
  status: "to-do" | "in-progress" | "on-hold" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assignee?: { _id: string; name: string; email: string } | null;
  creator: { _id: string; name: string; email: string };
  category: string;
  startDate: string;
  dueDate: string;
  durationDays?: number;
  createdAt: string;
}

type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'Completed';

interface Project {
  _id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  progress: number;
  projectHead?: { _id: string; name: string; email: string };
  // ✅ UPDATED: New project structure uses a flat members array
  members?: Array<{
    userId: { _id: string; name: string; email: string };
  }>;
  creator: { _id: string; name: string; email: string };
  attachments?: Array<{
    _id: string;
    filename: string;
    originalName: string;
    size?: number;
    mimeType?: string;
    path: string;
  }>;
}

interface AssignableMember {
  _id: string;
  name: string;
  email: string;
  category: string;
  role: string;
}

interface FilterType {
  search: string;
  status: "all" | "to-do" | "in-progress" | "on-hold" | "done";
  priority: "all" | "low" | "medium" | "high" | "urgent";
  assignee: string; // "all" or user ID
}

interface CurrentUser {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
}

interface CalendarViewProps {
  tasks: Task[];
  filters: FilterType;
  updateFilter: (key: keyof FilterType, value: string) => void;
  clearFilters: () => void;
  isMobile: boolean;
  navigate: (path: string) => void;
  userRole: string;
  currentUser: CurrentUser | null;
  project: Project | null; // Added for member list access
}

const getPriorityColor = (priority: string) => {
  const colors = {
    urgent: "bg-red-50 text-red-700 border-red-200",
    high: "bg-orange-50 text-orange-700 border-orange-200",
    medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
    low: "bg-green-50 text-green-700 border-green-200",
  };
  return (
    colors[priority as keyof typeof colors] ||
    "bg-gray-50 text-gray-700 border-gray-200"
  );
};

const getStatusColor = (status: string) => {
  const colors = {
    done: "bg-green-50 text-green-700 border-green-200",
    "in-progress": "bg-blue-50 text-blue-700 border-blue-200",
    "on-hold": "bg-red-50 text-red-700 border-red-200",
    "to-do": "bg-gray-50 text-gray-700 border-gray-200",
  };
  return (
    colors[status as keyof typeof colors] ||
    "bg-gray-50 text-gray-700 border-gray-200"
  );
};

// ✅ UPDATED: Calendar View Component with Task Spans (Start to End)
const CalendarViewComponent: React.FC<CalendarViewProps> = ({
  tasks,
  filters,
  updateFilter,
  clearFilters,
  isMobile,
  navigate,
  userRole,
  currentUser,
  project,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month");
  const [showTaskDetails, setShowTaskDetails] = useState(true);

  const navigateCalendar = useCallback(
    (direction: "prev" | "next") => {
      setCurrentDate((prevDate) => {
        const newDate = new Date(prevDate);
        if (calendarView === "month") {
          newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
        } else if (calendarView === "week") {
          newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
        } else {
          newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
        }
        return newDate;
      });
    },
    [calendarView]
  );

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const getCalendarTitle = useMemo(() => {
    const options: Intl.DateTimeFormatOptions =
      calendarView === "month"
        ? { year: "numeric", month: "long" }
        : calendarView === "week"
          ? { year: "numeric", month: "short", day: "numeric" }
          : { year: "numeric", month: "long", day: "numeric" };

    const date = new Date(currentDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, [currentDate, calendarView]);

  // ✅ UPDATED: Get tasks that span across or fall on a specific date
  const getTasksForDate = useCallback(
    (date: Date) => {
      return tasks.filter((task) => {
        if (!task.startDate || !task.dueDate) return false;

        const taskStart = new Date(task.startDate);
        const taskEnd = new Date(task.dueDate);
        const currentDay = new Date(date);

        // Normalize dates to midnight for comparison
        taskStart.setHours(0, 0, 0, 0);
        taskEnd.setHours(0, 0, 0, 0);
        currentDay.setHours(0, 0, 0, 0);

        // Task spans or falls on this date if current date is between start and end (inclusive)
        return currentDay >= taskStart && currentDay <= taskEnd;
      });
    },
    [tasks]
  );

  // ✅ UPDATED: Determine task's position type for the given date
  const getTaskPositionType = useCallback((task: Task, date: Date) => {
    if (!task.startDate || !task.dueDate) return "single";

    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.dueDate);
    const currentDay = new Date(date);

    // Normalize dates
    taskStart.setHours(0, 0, 0, 0);
    taskEnd.setHours(0, 0, 0, 0);
    currentDay.setHours(0, 0, 0, 0);

    const isSameDay = taskStart.getTime() === taskEnd.getTime();
    const isStartDay = currentDay.getTime() === taskStart.getTime();
    const isEndDay = currentDay.getTime() === taskEnd.getTime();

    if (isSameDay) return "single";
    if (isStartDay) return "start";
    if (isEndDay) return "end";
    return "middle";
  }, []);

  const getCalendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days = [];

    // Previous month days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = new Date(year, month - 1, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: false,
        tasks: getTasksForDate(date),
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === new Date().toDateString();
      days.push({
        date,
        day,
        isCurrentMonth: true,
        isToday,
        tasks: getTasksForDate(date),
      });
    }

    // Next month days to complete the grid (6 weeks * 7 days = 42 days)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: false,
        tasks: getTasksForDate(date),
      });
    }

    return days;
  }, [currentDate, getTasksForDate]);

  const getWeekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push({
        date,
        day: date.getDate(),
        dayName: date.toLocaleDateString("en-GB", { weekday: "short" }),
        isToday,
        tasks: getTasksForDate(date),
      });
    }

    return days;
  }, [currentDate, getTasksForDate]);

  const getPriorityDot = useCallback((priority: string) => {
    const colors: Record<string, string> = {
      urgent: "bg-red-500",
      high: "bg-orange-500",
      medium: "bg-yellow-500",
      low: "bg-green-500",
    };
    return colors[priority] || "bg-gray-400";
  }, []);

  // ✅ UPDATED: Enhanced task styling based on position
  const getTaskStatusColor = useCallback(
    (status: string, positionType: string) => {
      const baseColors: Record<string, string> = {
        "to-do": "bg-gray-100 text-gray-800",
        "in-progress": "bg-blue-100 text-blue-800",
        "on-hold": "bg-red-100 text-red-800",
        done: "bg-green-100 text-green-800",
      };

      const borderStyles: Record<string, string> = {
        single: "rounded-md border-l-4",
        start: "rounded-l-md border-l-4 rounded-r-none",
        middle: "rounded-none border-l-0 border-r-0",
        end: "rounded-r-md border-r-4 rounded-l-none",
      };

      const borderColors: Record<string, string> = {
        "to-do": "border-l-gray-500 border-r-gray-500",
        "in-progress": "border-l-blue-500 border-r-blue-500",
        "on-hold": "border-l-red-500 border-r-red-500",
        done: "border-l-green-500 border-r-green-500",
      };

      return `${baseColors[status] || baseColors["to-do"]} ${borderStyles[positionType]} ${borderColors[status] || borderColors["to-do"]}`;
    },
    []
  );

  // ✅ UPDATED: Enhanced TaskItem with position awareness
  const TaskItem: React.FC<{ task: Task; date: Date; compact?: boolean }> = ({
    task,
    date,
    compact = false,
  }) => {
    // Task is overdue if due date is before today (not today or later)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = new Date(task.dueDate) < today && task.status !== "done";
    const positionType = getTaskPositionType(task, date);
    const isStartDay = positionType === "start" || positionType === "single";

    return (
      <div
        className={cn(
          "p-1 text-xs cursor-pointer hover:shadow-sm transition-all mb-1 relative",
          getTaskStatusColor(task.status, positionType),
          isOverdue && "bg-red-100 text-red-800 border-l-red-500 border-r-red-500",
          compact && "py-0.5"
        )}
        onClick={() => navigate(`/task/${task._id}`)}
      >
        <div className="flex items-center justify-between gap-1">
          <span
            className={cn(
              "font-medium truncate flex-1",
              task.status === "done" && "line-through opacity-60",
              // Only show title on start day for multi-day tasks
              positionType === "middle" && "text-transparent select-none"
            )}
          >
            {positionType === "middle" ? "•••" : task.title}
          </span>

          {/* Priority dot only on start day */}
          {isStartDay && (
            <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", getPriorityDot(task.priority))} />
          )}
        </div>

        {!compact && showTaskDetails && isStartDay && (
          <div className="mt-0.5 flex items-center justify-between text-xs opacity-80">
            <div className="flex items-center gap-1 min-w-0">
              <Avatar className="w-2.5 h-2.5">
                <AvatarFallback className="bg-current bg-opacity-20 text-current text-[8px] font-bold">
                  {(task.assignee?.name?.charAt(0) || task.assignee?.email?.charAt(0) || "?")}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-[10px]">{(task.assignee?.name || task.assignee?.email || "?").split(" ")[0]}</span>
            </div>

            {task.durationDays && task.durationDays > 1 && (
              <span className="text-[9px] opacity-70">{task.durationDays}d</span>
            )}
          </div>
        )}

        {/* Span indicator for multi-day tasks */}
        {positionType !== "single" && (
          <div className="absolute top-0 right-0 text-[8px] opacity-60 leading-none">
            {positionType === "start" && "▶"}
            {positionType === "middle" && "─"}
            {positionType === "end" && "◀"}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Controls */}
      <Card>
        <CardContent className="p-4">
          {/* Calendar Navigation - Modern & Mobile-First */}
          <div className="space-y-3">
            {/* Navigation Row */}
            <div className="flex items-center justify-between">
              {/* Left: Navigation Controls with Date - Centered on Mobile */}
              <div className="flex items-center gap-2 flex-1 justify-center sm:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // On mobile, always navigate day-by-day regardless of view
                    if (isMobile) {
                      setCurrentDate((prevDate) => {
                        const newDate = new Date(prevDate);
                        newDate.setDate(newDate.getDate() - 1);
                        return newDate;
                      });
                    } else {
                      navigateCalendar("prev");
                    }
                  }}
                  className="h-9 w-9 p-0 rounded-lg flex-shrink-0 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {/* Dynamic Date Display - Mobile Only */}
                <div className="flex items-center gap-2">
                  <h2 className="sm:hidden text-base font-bold text-gray-900">
                    {getCalendarTitle}
                  </h2>
                  {/* Today button - Hidden on mobile */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                    className="hidden sm:inline-flex h-8 px-3 text-xs rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    Today
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // On mobile, always navigate day-by-day regardless of view
                    if (isMobile) {
                      setCurrentDate((prevDate) => {
                        const newDate = new Date(prevDate);
                        newDate.setDate(newDate.getDate() + 1);
                        return newDate;
                      });
                    } else {
                      navigateCalendar("next");
                    }
                  }}
                  className="h-9 w-9 p-0 rounded-lg flex-shrink-0 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Right: Eye toggle - Desktop only */}
              {!isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTaskDetails(!showTaskDetails)}
                  className="h-8 w-8 p-0 rounded-lg flex-shrink-0 hover:bg-blue-50"
                >
                  {showTaskDetails ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              )}
            </div>

            {/* View Mode Buttons - Desktop Only */}
            {!isMobile && (
              <div className="flex items-center justify-center sm:justify-start">
                <div className="inline-flex bg-gray-100 rounded-lg p-1 gap-1">
                  {(["month", "week", "day"] as const).map((view) => (
                    <Button
                      key={view}
                      variant={calendarView === view ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCalendarView(view)}
                      className={cn(
                        "h-8 px-4 text-xs font-medium capitalize rounded-md transition-all",
                        calendarView === view
                          ? "bg-white shadow-sm text-gray-900 hover:bg-white"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      )}
                    >
                      {view}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ✅ UPDATED: Calendar Content - Day View on Mobile, Full Views on Desktop */}
      <Card>
        <CardContent className="p-0">
          {/* Mobile: Always show Day View */}
          {isMobile ? (
            <div className="p-4">
              <div className="max-w-2xl mx-auto">
                <Card
                  className={cn(
                    "text-center p-4 mb-4",
                    new Date().toDateString() === currentDate.toDateString() &&
                    "bg-blue-50 border-blue-200"
                  )}
                >
                  <h3 className="text-xl font-bold text-gray-900">
                    {(() => {
                      const date = new Date(currentDate);
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    })()}
                  </h3>
                </Card>

                <div className="space-y-2">
                  {getTasksForDate(currentDate).length === 0 ? (
                    <Card className="border-dashed border-2 border-gray-200">
                      <CardContent className="text-center py-8">
                        <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-500">No tasks scheduled for this day</p>
                      </CardContent>
                    </Card>
                  ) : (
                    getTasksForDate(currentDate).map((task) => (
                      <TaskItem
                        key={`${task._id}-${currentDate.toDateString()}`}
                        task={task}
                        date={currentDate}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Desktop: Show selected view (month/week/day) */
            <>
              {calendarView === "month" && (
                <div className="p-4">
                  {/* Week headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {getCalendarDays.map((calendarDay, index) => (
                      <div
                        key={index}
                        className={cn(
                          "min-h-[100px] p-1 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors",
                          !calendarDay.isCurrentMonth && "bg-gray-50/50 text-gray-400",
                          calendarDay.isToday && "bg-blue-50 border-blue-200 ring-1 ring-blue-200"
                        )}
                      >
                        <div
                          className={cn(
                            "text-sm font-medium mb-1 px-1",
                            calendarDay.isToday && "text-blue-600 font-bold",
                            !calendarDay.isCurrentMonth && "text-gray-400"
                          )}
                        >
                          {calendarDay.day}
                        </div>
                        <div className="space-y-0.5 max-h-20 overflow-y-auto">
                          {calendarDay.tasks.slice(0, 4).map((task) => (
                            <TaskItem
                              key={`${task._id}-${calendarDay.date.toDateString()}`}
                              task={task}
                              date={calendarDay.date}
                              compact={true}
                            />
                          ))}
                          {calendarDay.tasks.length > 4 && (
                            <div className="text-xs text-gray-500 text-center bg-gray-100 rounded px-1 py-0.5">
                              +{calendarDay.tasks.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {calendarView === "week" && (
                <div className="p-4">
                  <div className="grid grid-cols-7 gap-4">
                    {getWeekDays.map((weekDay, index) => (
                      <div key={index} className="space-y-2">
                        <Card
                          className={cn(
                            "text-center p-3",
                            weekDay.isToday && "bg-blue-50 border-blue-200"
                          )}
                        >
                          <div className="text-xs font-medium text-gray-600">{weekDay.dayName}</div>
                          <div
                            className={cn(
                              "text-lg font-bold",
                              weekDay.isToday ? "text-blue-600" : "text-gray-900"
                            )}
                          >
                            {weekDay.day}
                          </div>
                        </Card>
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-1">
                            {weekDay.tasks.length === 0 ? (
                              <div className="text-center py-4 text-gray-400 text-xs">No tasks</div>
                            ) : (
                              weekDay.tasks.map((task) => (
                                <TaskItem
                                  key={`${task._id}-${weekDay.date.toDateString()}`}
                                  task={task}
                                  date={weekDay.date}
                                />
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {calendarView === "day" && (
                <div className="p-4">
                  <div className="max-w-2xl mx-auto">
                    <Card
                      className={cn(
                        "text-center p-4 mb-4",
                        new Date().toDateString() === currentDate.toDateString() &&
                        "bg-blue-50 border-blue-200"
                      )}
                    >
                      <h3 className="text-xl font-bold text-gray-900">
                        {(() => {
                          const date = new Date(currentDate);
                          const day = String(date.getDate()).padStart(2, '0');
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const year = date.getFullYear();
                          return `${day}/${month}/${year}`;
                        })()}
                      </h3>
                    </Card>

                    <div className="space-y-2">
                      {getTasksForDate(currentDate).length === 0 ? (
                        <Card className="border-dashed border-2 border-gray-200">
                          <CardContent className="text-center py-8">
                            <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-gray-500">No tasks scheduled for this day</p>
                          </CardContent>
                        </Card>
                      ) : (
                        getTasksForDate(currentDate).map((task) => (
                          <TaskItem
                            key={`${task._id}-${currentDate.toDateString()}`}
                            task={task}
                            date={currentDate}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ✅ UPDATED: Modern Legend with Cards */}
      <Card className="bg-gradient-to-br from-gray-50 to-white">
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Priority Legend */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-500 rounded-full" />
                <h3 className="text-sm font-semibold text-gray-900">Priority Levels</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2">
                {[
                  { color: 'bg-red-500', label: 'Urgent', ring: 'ring-red-100' },
                  { color: 'bg-orange-500', label: 'High', ring: 'ring-orange-100' },
                  { color: 'bg-yellow-500', label: 'Medium', ring: 'ring-yellow-100' },
                  { color: 'bg-green-500', label: 'Low', ring: 'ring-green-100' }
                ].map(({ color, label, ring }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                  >
                    <div className={`w-2.5 h-2.5 ${color} rounded-full ring-4 ${ring}`} />
                    <span className="text-xs font-medium text-gray-700">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Spans Legend */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-purple-500 rounded-full" />
                <h3 className="text-sm font-semibold text-gray-900">Multi-Day Tasks</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { symbol: '▶', label: 'Start', desc: 'Task begins', color: 'text-green-600', bg: 'bg-green-50' },
                  { symbol: '─', label: 'Ongoing', desc: 'In progress', color: 'text-blue-600', bg: 'bg-blue-50' },
                  { symbol: '◀', label: 'End', desc: 'Task ends', color: 'text-purple-600', bg: 'bg-purple-50' }
                ].map(({ symbol, label, desc, color, bg }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2 px-3 py-2 ${bg} rounded-lg border border-gray-200 hover:shadow-sm transition-shadow`}
                  >
                    <span className={`text-base font-bold ${color}`}>{symbol}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900">{label}</div>
                      <div className="text-[10px] text-gray-500 truncate">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ✅ ENHANCED: TaskCard with Settings Menu and Delete Functionality
const TaskCard = React.memo<{
  task: Task;
  onClick?: () => void;
  compact?: boolean;
  currentUser?: CurrentUser | null;
  userRole?: string;
  onTaskUpdate?: () => void;
  assignableMembers?: AssignableMember[];
  canAssignVisible?: boolean;
  project?: Project | null; // ✅ NEW: Add project prop for permission checks
}>(({ task, onClick, compact = false, currentUser, userRole, onTaskUpdate, assignableMembers = [], canAssignVisible = false, project }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>(task.assignee?._id || "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Task is overdue if due date is before today (not today or later)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = new Date(task.dueDate) < today && task.status !== "done";

  // ✅ ENHANCED: Permission checks aligned with backend
  const isAdmin = useMemo(() => {
    return ["admin", "super_admin"].includes(currentUser?.role || userRole || "");
  }, [currentUser, userRole]);

  const isProjectLead = useMemo(() => {
    const currentUserIdStr = (currentUser?.id || currentUser?._id || "").toString();
    return project?.projectHead?._id?.toString() === currentUserIdStr;
  }, [currentUser, project]);

  const isAssigneeOrCreator = useMemo(() => {
    const currentUserIdStr = (currentUser?.id || currentUser?._id || "").toString();
    const assigneeIdStr = task.assignee?._id?.toString() || "";
    const creatorIdStr = task.creator?._id?.toString() || "";
    return assigneeIdStr === currentUserIdStr || creatorIdStr === currentUserIdStr;
  }, [currentUser, task]);

  const isApproved = (task as any).approvalStatus === "approved";

  // Show dropdown menu if any actionable permission exists (matches backend capabilities)
  const canManageTask = useMemo(() => {
    return isAdmin || isProjectLead;
  }, [isAdmin, isProjectLead]);

  // Edit allowed for assignee, creator, admin, or project lead (backend: updateTask)
  const canEditTask = useMemo(() => {
    return isAssigneeOrCreator || isAdmin || isProjectLead;
  }, [isAssigneeOrCreator, isAdmin, isProjectLead]);

  // Delete allowed ONLY for admin or project lead (owner)
  const canDeleteTask = useMemo(() => {
    return isAdmin || isProjectLead;
  }, [isAdmin, isProjectLead]);

  const [hasBlockingSubtasks, setHasBlockingSubtasks] = useState(false);
  const handleMenuOpenChange = async (open: boolean) => {
    if (!open) return;
    try {
      const resp = await fetchData(`/task/${task._id}/subtasks`);
      const list = Array.isArray((resp as any)?.subtasks) ? (resp as any).subtasks : (Array.isArray(resp) ? resp as any : []);
      const hasBlocking = list.some((s: any) => (s.status !== 'done') || (s.approvalStatus !== 'approved'));
      setHasBlockingSubtasks(hasBlocking);
    } catch {
      setHasBlockingSubtasks(false);
    }
  };

  // ✅ NEW: Handle task deletion using proper DELETE API
  const handleDeleteTask = async () => {
    try {
      // console.log('Deleting task:', task._id);
      setIsDeleting(true);
      const response = await deleteData(`/task/${task._id}`);
      // console.log('Delete response:', response);
      toast.success("Task deleted successfully");
      setShowDeleteDialog(false);
      if (onTaskUpdate) {
        await onTaskUpdate();
      }
    } catch (error: any) {
      console.error('Delete task error:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete task";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  // ✅ NEW: Handle status change directly from menu
  const handleStatusChange = async (newStatus: string) => {
    try {
      if (newStatus === 'done') {
        const resp = await fetchData(`/task/${task._id}/subtasks`);
        const list = Array.isArray((resp as any)?.subtasks) ? (resp as any).subtasks : (Array.isArray(resp) ? resp as any : []);
        const hasBlocking = list.some((s: any) => (s.status !== 'done') || (s.approvalStatus !== 'approved'));
        if (hasBlocking) {
          toast.error('Complete and approve all subtasks before marking Done');
          return;
        }
      }
      await postData(`/task/${task._id}/status`, { status: newStatus });
      toast.success("Task status updated");
      onTaskUpdate?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update task");
    }
  };

  const handleAssignTask = async () => {
    try {
      await putData(`/task/${task._id}`, { assigneeId: selectedAssigneeId || null });
      toast.success("Assignee updated");
      setShowAssignModal(false);
      onTaskUpdate?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to assign task");
    }
  };

  const handleCardClick = () => {
    if (!task.assignee?._id) {
      toast.warning("Assign an employee to open this task");
      if (canManageTask) setShowAssignModal(true);
      return;
    }
    onClick?.();
  };

  const handleSelectView = () => {
    setShowEditModal(false);
    setShowAssignModal(false);
    setShowDeleteDialog(false);
    handleCardClick();
  };

  const handleSelectEdit = () => {
    setShowAssignModal(false);
    setShowDeleteDialog(false);
    setShowEditModal(true);
  };

  const handleSelectAssign = () => {
    setSelectedAssigneeId(task.assignee?._id || "");
    setShowEditModal(false);
    setShowDeleteDialog(false);
    setShowAssignModal(true);
  };

  const handleSelectDelete = () => {
    setShowEditModal(false);
    setShowAssignModal(false);
    setShowDeleteDialog(true);
  };

  return (
    <>
      <div
        data-slot="card"
        className={cn(
          "text-card-foreground flex flex-col gap-6 py-6 shadow-sm hover:shadow-md transition-all duration-200 relative group bg-white rounded-lg border border-gray-200",
          onClick && "cursor-pointer"
        )}
        onClick={handleCardClick}
      >
        <div data-slot="card-header" className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 p-4 pb-3">
          <div className="flex items-start justify-between gap-2 mb-3">
            <span
              data-slot="badge"
              className={cn(
                "inline-flex items-center justify-center border w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden border-transparent [a&]:hover:bg-primary/90 text-xs font-medium px-2 py-0.5 rounded",
                task.priority === "high" && "bg-red-100 text-red-700",
                task.priority === "medium" && "bg-yellow-100 text-yellow-700",
                task.priority === "low" && "bg-blue-100 text-blue-700",
                task.priority === "urgent" && "bg-purple-100 text-purple-700"
              )}
            >
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>

            {canManageTask && (
              <DropdownMenu onOpenChange={handleMenuOpenChange}>
                <DropdownMenuTrigger asChild>
                  <button
                    data-slot="dropdown-menu-trigger"
                    className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-gray-100 rounded-md gap-1.5 has-[>svg]:px-2.5 h-6 w-6 p-0 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4 text-black" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSelectView(); }}>
                    <Eye className="w-4 h-4 mr-2" /> View Details
                  </DropdownMenuItem>
                  {canEditTask && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSelectEdit(); }}>
                      <Edit className="w-4 h-4 mr-2" /> Edit Task
                    </DropdownMenuItem>
                  )}
                  {canManageTask && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSelectAssign(); }}>
                      <UserPlus className="w-4 h-4 mr-2" /> Assign Member
                    </DropdownMenuItem>
                  )}
                  {(!isApproved && task.status !== "done") && (
                    <DropdownMenuItem disabled={hasBlockingSubtasks} onSelect={() => handleStatusChange("done")}>
                      <CheckCircle2 className="w-3 h-3 mr-2" /> Mark as Done
                    </DropdownMenuItem>
                  )}
                  {canDeleteTask && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSelectDelete(); }} className="text-red-600 focus:text-red-600">
                        <Trash2 className="w-3 h-3 mr-2" /> Delete Task
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div data-slot="card-title" className="text-base font-semibold text-gray-900 mb-2 line-clamp-2">
            {task.title}
          </div>
          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-3 mb-4">{task.description}</p>
          )}
        </div>

        <div data-slot="card-content" className="px-4 pb-4 pt-0 space-y-2">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span className={cn("font-medium", isOverdue ? "text-red-600" : "")}>
              {(() => {
                const date = new Date(task.dueDate);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
              })()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <span data-slot="avatar" className="relative flex size-8 shrink-0 overflow-hidden rounded-full w-4 h-4">
              <span data-slot="avatar-fallback" className="flex size-full items-center justify-center rounded-full bg-blue-100 text-blue-700 font-medium text-xs">
                {(task.assignee?.name?.charAt(0) || task.assignee?.email?.charAt(0) || "?")}
              </span>
            </span>
            <span>Assigned to {task.assignee?.name || task.assignee?.email || "Unassigned"}</span>
          </div>
        </div>
      </div>

      {/* ✅ NEW: Quick Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-base">Edit Task</DialogTitle>
            <p className="text-sm text-gray-600">Update task details</p>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <QuickEditTaskForm
              task={task}
              onClose={() => setShowEditModal(false)}
              onUpdate={onTaskUpdate}
              assignableMembers={assignableMembers}
              project={project}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Assign Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
            <DialogDescription>Select an employee to assign this task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm">Assignee</Label>
            <Select
              value={selectedAssigneeId}
              onValueChange={(value: string) => setSelectedAssigneeId(value === "__UNASSIGNED__" ? "" : value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {/* <SelectItem value="__UNASSIGNED__">Unassigned</SelectItem> */}
                {assignableMembers.filter(m => m).map((m) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.name || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-3">
            <Button variant="outline" onClick={() => setShowAssignModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleAssignTask} className="flex-1">
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ NEW: Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone and will remove the task from all views.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3 mr-1" />
              )}
              {isDeleting ? "Deleting..." : "Delete Task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

// ✅ NEW: Quick Edit Task Form Component
const QuickEditTaskForm: React.FC<{
  task: Task;
  onClose: () => void;
  onUpdate?: () => void;
  assignableMembers?: AssignableMember[];
  project?: Project | null;
}> = ({ task, onClose, onUpdate, assignableMembers = [], project = null }) => {
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description,
    priority: task.priority,
    startDate: new Date(task.startDate).toISOString().split("T")[0],
    dueDate: new Date(task.dueDate).toISOString().split("T")[0],
    assigneeId: task.assignee?._id || "",
  });

  // Date objects for calendar popovers
  const [startDateObj, setStartDateObj] = useState<Date | undefined>(
    task.startDate ? new Date(task.startDate) : undefined
  );
  const [dueDateObj, setDueDateObj] = useState<Date | undefined>(
    task.dueDate ? new Date(task.dueDate) : undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const start = new Date(formData.startDate);
    const end = new Date(formData.dueDate);
    if (start > end) {
      return toast.error("Start date cannot be after due date");
    }

    try {
      setIsSubmitting(true);
      await putData(`/task/${task._id}`, formData);
      toast.success("Task updated successfully");
      onUpdate?.();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pr-1">
      <div className="space-y-1">
        <Label className="text-sm">Title *</Label>
        <Input
          value={formData.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
          className="h-8"
          placeholder="Task title"
          required
        />
      </div>

      <div className="space-y-1">
        <Label className="text-sm">Assignee (optional)</Label>
        <Select
          value={formData.assigneeId}
          onValueChange={(value: string) => setFormData({ ...formData, assigneeId: value === "__UNASSIGNED__" ? "" : value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {assignableMembers.filter(member => member).map((member) => (
              <SelectItem key={member._id} value={member._id}>
                <div className="flex items-center gap-2">
                  <Avatar className="w-4 h-4">
                    <AvatarFallback className="text-xs">{(member.name?.charAt(0) || member.email?.charAt(0) || "?")}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{member.name || member.email || "Unknown"}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-sm">Status</Label>
          <Select
            value={task.status}
            disabled
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="to-do">To Do</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(value: string) => setFormData({ ...formData, priority: value as 'low' | 'medium' | 'high' | 'urgent' })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-sm">Start Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] justify-start text-left font-normal",
                  !startDateObj && "text-[#717680]"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDateObj ? format(startDateObj, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDateObj}
                onSelect={(date) => {
                  if (!date) return;
                  setStartDateObj(date);
                  setFormData({ ...formData, startDate: format(date, "yyyy-MM-dd") });
                  // Ensure due date baseline respects start date
                  if (dueDateObj && dueDateObj < date) {
                    setDueDateObj(date);
                    setFormData({ ...formData, startDate: format(date, "yyyy-MM-dd"), dueDate: format(date, "yyyy-MM-dd") });
                  }
                }}
                disabled={(date) => {
                  const projStart = project ? new Date(project.startDate) : new Date();
                  projStart.setHours(0, 0, 0, 0);
                  const projEnd = project ? new Date(project.endDate) : undefined;
                  if (projEnd) projEnd.setHours(0, 0, 0, 0);
                  return Boolean(date < projStart || (projEnd && date > projEnd));
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Due Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] justify-start text-left font-normal",
                  !dueDateObj && "text-[#717680]"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDateObj ? format(dueDateObj, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dueDateObj}
                onSelect={(date) => {
                  if (!date) return;
                  const projEnd = project ? new Date(project.endDate) : undefined;
                  if (projEnd) {
                    projEnd.setHours(0, 0, 0, 0);
                  }
                  if (projEnd && date > projEnd) {
                    toast.error("Due date cannot be after project end date");
                    setDueDateObj(projEnd);
                    setFormData({ ...formData, dueDate: format(projEnd, "yyyy-MM-dd") });
                    return;
                  }
                  setDueDateObj(date);
                  setFormData({ ...formData, dueDate: format(date, "yyyy-MM-dd") });
                }}
                disabled={(date) => {
                  const projStart = project ? new Date(project.startDate) : new Date();
                  projStart.setHours(0, 0, 0, 0);
                  const startBaseline = startDateObj || projStart;
                  const projEnd = project ? new Date(project.endDate) : undefined;
                  if (projEnd) projEnd.setHours(0, 0, 0, 0);
                  return Boolean(date < startBaseline || (projEnd && date > projEnd));
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-sm">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Task details..."
          rows={3}
          className="resize-none text-sm"
        />
      </div>

      <div className="flex gap-2 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Edit className="w-3 h-3 mr-1" />
          )}
          {isSubmitting ? "Updating..." : "Update Task"}
        </Button>
      </div>
    </form>
  );
};

// ✅ UPDATED: SortableTaskCard with props passing
const SortableTaskCard: React.FC<{
  task: Task;
  currentUser?: CurrentUser | null;
  userRole?: string;
  onTaskUpdate?: () => void;
  assignableMembers?: AssignableMember[];
  canAssignVisible?: boolean;
  project?: Project | null; // ✅ NEW: Add project prop
}> = ({ task, currentUser, userRole, onTaskUpdate, assignableMembers = [], canAssignVisible = false, project }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task._id, disabled: (task as any).approvalStatus === "approved" });
  const navigate = useNavigate();

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <TaskCard
        task={task}
        compact={true}
        onClick={() => navigate(`/task/${task._id}`)}
        currentUser={currentUser}
        userRole={userRole}
        project={project}
        onTaskUpdate={onTaskUpdate}
        assignableMembers={assignableMembers}
        canAssignVisible={canAssignVisible}
      />
    </div>
  );
};

const DroppableColumn = ({
  children,
  id,
  title,
  count,
  total,
  color,
}: {
  children: React.ReactNode;
  id: string;
  title: string;
  count: number;
  total: number;
  color: string;
}) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      className={cn(
        "bg-gray-50 rounded-lg p-3 h-full",
        isOver && "bg-blue-50 ring-2 ring-blue-200"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", color)} />
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        </div>
        <span data-slot="badge" className="inline-flex items-center justify-center rounded-md border py-0.5 font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 text-xs h-5 px-2">
          {count}
        </span>
      </div>
      {/* Per-column progress: show fraction and visual bar */}
      <div className="mb-3">
        <div className="flex items-center justify-end text-xs text-gray-600 mb-1">
          <span>{count}/{total}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn("h-1.5 rounded-full", color)}
            style={{ width: `${total > 0 ? Math.round((count / total) * 100) : 0}%` }}
          />
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "space-y-2 min-h-[20rem]",
          count > 4 && "max-h-[600px] overflow-y-auto pr-2"
        )}
      >
        {children}
      </div>
    </div>
  );
};

const ProjectDetail = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const permissions = usePermissions();

  // All existing state variables (unchanged)
  const [project, setProject] = useState<Project | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<Task[]>([]);
  const [assignableMembers, setAssignableMembers] = useState<AssignableMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [projectRole, setProjectRole] = useState<string>("member");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileKanbanStatus, setMobileKanbanStatus] = useState<"to-do" | "in-progress" | "on-hold" | "done">("to-do");
  const [showMembersModal, setShowMembersModal] = useState(false);

  // Attachment state
  const [previewAttachment, setPreviewAttachment] = useState<NonNullable<Project['attachments']>[0] | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const [filters, setFilters] = useState<FilterType>({
    search: "",
    status: "all",
    priority: "all",
    assignee: "all",
  });

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    status: "to-do",
    priority: "medium",
    assigneeId: "",
    startDate: "",
    dueDate: "",
    rejectionAttachmentType: "either", // ✅ NEW: Default to 'either'
  });
  const [startDateObj, setStartDateObj] = useState<Date | undefined>(undefined);
  const [dueDateObj, setDueDateObj] = useState<Date | undefined>(undefined);
  const [taskAttachments, setTaskAttachments] = useState<File[]>([]);
  const [taskReferenceLink, setTaskReferenceLink] = useState("");
  const taskFileInputRef = useRef<HTMLInputElement>(null);

  // Recurring task state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<"daily" | "weekly" | "monthly">("daily");

  // Function to remove a specific attachment
  const removeTaskAttachment = (index: number) => {
    setTaskAttachments(prev => prev.filter((_, i) => i !== index));
    // Clear the file input to allow reselecting the same file if needed
    if (taskFileInputRef.current) {
      taskFileInputRef.current.value = '';
    }
  };

  // Derived role flags
  const isAdmin = useMemo(() => ["admin", "super_admin", "super-admin"].includes(userRole), [userRole]);
  const isProjectLead = useMemo(() => {
    const currentId = (currentUser?.id || currentUser?._id || "").toString();
    const leadId = (project?.projectHead?._id || "").toString();
    return !!currentId && !!leadId && currentId === leadId;
  }, [project?.projectHead?._id, currentUser?.id, currentUser?._id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  // All existing useEffect, useMemo, and useCallback hooks (unchanged)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const matchesSearch =
        filters.search === "" ||
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.description.toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus = filters.status === "all" || task.status === filters.status;
      const matchesPriority = filters.priority === "all" || task.priority === filters.priority;
      const matchesAssignee = filters.assignee === "all" || task.assignee?._id === filters.assignee;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && (task as any).approvalStatus !== "approved";
    });
  }, [allTasks, filters]);

  const filteredUserTasks = useMemo(() => {
    return userTasks.filter((task) => {
      const matchesSearch =
        filters.search === "" ||
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.description.toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus = filters.status === "all" || task.status === filters.status;
      const matchesPriority = filters.priority === "all" || task.priority === filters.priority;
      const matchesAssignee = filters.assignee === "all" || task.assignee?._id === filters.assignee;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && (task as any).approvalStatus !== "approved";
    });
  }, [userTasks, filters]);

  // Enhanced role-based task filtering for Kanban (unchanged)
  const kanbanFilteredTasks = useMemo(() => {
    if (!currentUser) return [];

    const currentUserIdStr = (currentUser?.id || currentUser?._id || "").toString();
    const isProjectMember = !!(
      project?.members?.some((m) => (m.userId?._id || "").toString() === currentUserIdStr) ||
      (project?.projectHead?._id || "").toString() === currentUserIdStr
    );

    let tasksToShow = allTasks;

    if (["admin", "super_admin", "super-admin"].includes(currentUser.role || userRole)) {
      tasksToShow = allTasks;
    } else if ((currentUser.role || userRole) === "lead" && isProjectMember) {
      tasksToShow = allTasks;
    } else if ((project?.projectHead?._id || "").toString() === currentUserIdStr) {
      tasksToShow = allTasks;
    } else if (projectRole === 'tl') {
      tasksToShow = allTasks;
    } else {
      // Regular members should only see tasks assigned to them (NOT unassigned tasks)
      // Unassigned tasks are only visible to admin/project lead
      tasksToShow = allTasks.filter(
        (task) => task.assignee?._id && (task.assignee._id.toString() === currentUserIdStr)
      );
    }

    return tasksToShow.filter((task) => {
      const matchesSearch =
        filters.search === "" ||
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.description.toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus = filters.status === "all" || task.status === filters.status;
      const matchesPriority = filters.priority === "all" || task.priority === filters.priority;
      const matchesAssignee = filters.assignee === "all" || task.assignee?._id === filters.assignee;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [allTasks, filters, userRole, currentUser, project]);

  const taskStats = useMemo(() => {
    const currentUserIdStr = (currentUser?.id || currentUser?._id || "").toString();
    const isProjectMember = !!(
      project?.members?.some((m) => (m.userId?._id || "").toString() === currentUserIdStr) ||
      (project?.projectHead?._id || "").toString() === currentUserIdStr
    );

    const relevantTasks = ["admin", "super_admin", "super-admin"].includes(userRole)
      ? allTasks
      : ((userRole === "lead" && isProjectMember) || (project?.projectHead?._id || "").toString() === currentUserIdStr)
        ? kanbanFilteredTasks
        : userTasks;

    // Get today's date at midnight for overdue calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      total: relevantTasks.length,
      completed: relevantTasks.filter((t) => t.status === "done").length,
      inProgress: relevantTasks.filter((t) => t.status === "in-progress").length,
      overdue: relevantTasks.filter(
        (t) => new Date(t.dueDate) < today && t.status !== "done"
      ).length,
    };
  }, [allTasks, userTasks, kanbanFilteredTasks, userRole, currentUser, project]);

  const canViewKanban = useMemo(() => {
    if (!currentUser || !project) return false;

    if (["admin", "super_admin", "super-admin"].includes(currentUser.role || userRole)) return true;
    if (project?.creator?._id === (currentUser.id || currentUser._id)) return true;

    const currentUserIdStr = (currentUser?.id || currentUser?._id || "").toString();
    return !!(
      project?.members?.some((m) => (m.userId?._id || "").toString() === currentUserIdStr) ||
      (project?.projectHead?._id || "").toString() === currentUserIdStr
    );
  }, [userRole, project, currentUser]);

  const canCreateTask = useMemo(() => {
    const currentUserIdStr = (currentUser?.id || currentUser?._id || "").toString();
    const isProjectMember = !!(
      project?.members?.some((m) => (m.userId?._id || "").toString() === currentUserIdStr) ||
      (project?.projectHead?._id || "").toString() === currentUserIdStr
    );

    return (
      ["admin", "super_admin", "super-admin"].includes(userRole) ||
      isProjectMember ||
      project?.creator._id === currentUser?._id
    );
  }, [userRole, project, currentUser]);

  // Filter assignable members to those who belong to this project
  const projectMemberIds = useMemo(() => {
    const ids = new Set<string>();
    // ✅ UPDATED: Use project.members instead of categories
    project?.members?.forEach((member) => {
      const id = member.userId?._id?.toString() || "";
      if (id) ids.add(id);
    });
    if (project?.projectHead?._id) ids.add(project.projectHead._id.toString());
    return ids;
  }, [project]);

  const filteredAssignableMembers = useMemo(() => {
    return assignableMembers.filter((m) => m && projectMemberIds.has(m._id?.toString() || ""));
  }, [assignableMembers, projectMemberIds]);

  const updateFilter = useCallback((key: keyof FilterType, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ search: "", status: "all", priority: "all", assignee: "all" });
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = allTasks.find((t) => t._id === event.active.id);
      setActiveTask(task || null);
    },
    [allTasks]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return setActiveTask(null);

      const taskId = active.id as string;
      const newStatus = over.id as string;
      const task = allTasks.find((t) => t._id === taskId);

      if (!task || (task as any).approvalStatus === "approved" || task.status === newStatus || !["to-do", "in-progress", "done"].includes(newStatus)) {
        return setActiveTask(null);
      }

      try {
        if (newStatus === 'done') {
          const resp = await fetch(
            buildApiUrl(`/task/${taskId}/subtasks`),
            {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'workspace-id': localStorage.getItem('currentWorkspaceId') || ''
              }
            }
          );
          if (resp.ok) {
            const data = await resp.json();
            const list = Array.isArray(data?.subtasks) ? data.subtasks : [];
            const hasBlocking = list.some((s: any) => (s.status !== 'done') || (s.approvalStatus !== 'approved'));
            if (hasBlocking) {
              toast.error('Complete and approve all subtasks before marking Done');
              setActiveTask(null);
              return;
            }
          }
        }
        setAllTasks((tasks) =>
          tasks.map((t) => (t._id === taskId ? { ...t, status: newStatus as any } : t))
        );
        await postData(`/task/${taskId}/status`, { status: newStatus });
        toast.success("Task updated");
        await Promise.all([fetchAllTasks(), fetchUserTasks()]);
      } catch {
        toast.error("Update failed");
        fetchAllTasks();
      }
      setActiveTask(null);
    }, [allTasks]
  );

  // All existing API functions (unchanged)  
  // ✅ NEW: Check if project and related resources exist before allowing access
  const checkResourceExistence = async (projectId: string) => {
    try {
      // First check if project exists
      const projectResponse = await fetch(
        buildApiUrl(`/project/${projectId}/exists`),
        {
          credentials: 'include',
          headers: {
            "Content-Type": "application/json",
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
        }
      );

      if (!projectResponse.ok) {
        if (projectResponse.status === 404) {
          toast.error("This project has been deleted or no longer exists");
          return false;
        } else if (projectResponse.status === 403) {
          toast.error("You don't have permission to access this project");
          return false;
        }
      }

      // If project exists, check if it's archived by fetching full project details
      try {
        const projectDetailsResponse = await fetch(
          buildApiUrl(`/project/${projectId}`),
          {
            credentials: 'include',
            headers: {
              "Content-Type": "application/json",
              "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
            },
          }
        );

        if (projectDetailsResponse.ok) {
          const projectData = await projectDetailsResponse.json();
          if (projectData.project?.isArchived) {
            toast.error("This project has been archived");
            return false;
          }
          if (projectData.project?.deletedAt) {
            toast.error("This project has been deleted");
            return false;
          }
        }
      } catch (detailError) {
        console.error("Error fetching project details:", detailError);
        // Continue even if detail fetch fails, as existence check passed
      }

      // If project exists, check if workspace still exists
      const workspaceId = localStorage.getItem("currentWorkspaceId");
      if (workspaceId) {
        const workspaceResponse = await fetch(
          buildApiUrl(`/workspace/${workspaceId}/exists`),
          {
            credentials: 'include',
            headers: {
              "Content-Type": "application/json",
              "workspace-id": workspaceId,
            },
          }
        );

        if (!workspaceResponse.ok && workspaceResponse.status === 404) {
          toast.error("This workspace has been deleted or no longer exists");
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error checking resource existence:", error);
      toast.error("Unable to verify project access");
      return false;
    }
  };

  const fetchUserRole = useCallback(async () => {
    try {
      const response = await fetchData("/auth/me");
      setUserRole(response.user.role);
      setCurrentUser({
        id: response.user.id,
        _id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role,
      });
    } catch {
      toast.error("Failed to load user data");
    }
  }, []);

  const fetchProjectDetails = useCallback(async () => {
    try {
      if (!projectId) {
        setLoading(false);
        return;
      }

      const response = await fetchData(`/project/${projectId}`);
      setProject(response.project);
    } catch (error) {
      // Check if project exists when we get an error
      if (projectId) {
        await checkResourceExistence(projectId);
      }
      toast.error("Project not found");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchAllTasks = useCallback(async () => {
    try {
      const response = await fetchData(`/task/project/${projectId}`);
      setAllTasks(response.tasks || []);
    } catch (error) {
      console.error("Failed to load all tasks:", error);
      toast.error("Failed to load tasks");
    }
  }, [projectId]);

  const fetchUserTasks = useCallback(async () => {
    try {
      const response = await fetchData(`/task/project/${projectId}/user`);
      setUserTasks(response.tasks || []);
    } catch (error) {
      console.error("Failed to load user tasks:", error);
      toast.error("Failed to load your tasks");
    }
  }, [projectId]);

  const fetchAssignableMembers = useCallback(async () => {
    try {
      const response = await fetchData(`/task/project/${projectId}/members`);
      setAssignableMembers((response.members || []).filter((m: any) => m));
    } catch {
      toast.error("Failed to load employees");
    }
  }, [projectId]);

  // Utility function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCreateTask = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTask.title.trim() || !newTask.startDate || !newTask.dueDate) {
        return toast.error("Please fill all required fields (title, start date, due date)");
      }

      const start = new Date(newTask.startDate);
      const end = new Date(newTask.dueDate);
      const projectStart = project ? new Date(project.startDate) : new Date();
      projectStart.setHours(0, 0, 0, 0);
      if (start < projectStart || end < projectStart) {
        return toast.error("Task dates must be on or after the project start date");
      }
      if (start > end) {
        return toast.error("Start date cannot be after due date");
      }
      const projectEnd = project ? new Date(project.endDate) : undefined;
      if (projectEnd) projectEnd.setHours(0, 0, 0, 0);
      if (projectEnd && end > projectEnd) {
        return toast.error("Due date cannot be after project end date");
      }

      // Validate reference link if provided (must be Figma or GitHub)
      if (taskReferenceLink.trim()) {
        const figmaPattern = /^https?:\/\/(www\.)?figma\.com\//i;
        const githubPattern = /^https?:\/\/(www\.)?github\.com\//i;
        if (!figmaPattern.test(taskReferenceLink) && !githubPattern.test(taskReferenceLink)) {
          return toast.error("Only Figma and GitHub links are allowed");
        }
      }

      try {
        setSubmittingTask(true);

        // Use FormData if there are attachments or reference link, otherwise use JSON
        if (taskAttachments.length > 0 || taskReferenceLink.trim()) {
          const formData = new FormData();
          formData.append("title", newTask.title);
          formData.append("description", newTask.description);
          formData.append("status", newTask.status);
          formData.append("priority", newTask.priority);
          if (newTask.assigneeId) {
            formData.append("assigneeId", newTask.assigneeId);
          }
          formData.append("startDate", newTask.startDate);
          formData.append("dueDate", newTask.dueDate);
          formData.append("projectId", projectId || "");
          formData.append("rejectionAttachmentType", newTask.rejectionAttachmentType); // ✅ NEW

          // Add reference link as array if provided
          if (taskReferenceLink.trim()) {
            formData.append("referenceLinks", JSON.stringify([taskReferenceLink.trim()]));
          }

          // Add recurring task data
          formData.append("isRecurring", isRecurring.toString());
          if (isRecurring) {
            formData.append("recurringFrequency", recurringFrequency);
            formData.append("recurringEndDate", project?.endDate || "");
          }

          taskAttachments.forEach((file) => {
            formData.append("attachments", file);
          });

          await postMultipart("/task", formData);
        } else {
          const payload: any = { ...newTask, projectId };
          if (!newTask.assigneeId) {
            delete payload.assigneeId;
          }
          // Add reference link as array if provided
          if (taskReferenceLink.trim()) {
            payload.referenceLinks = [taskReferenceLink.trim()];
          }
          // Add recurring task data
          payload.isRecurring = isRecurring;
          if (isRecurring) {
            payload.recurringFrequency = recurringFrequency;
            payload.recurringEndDate = project?.endDate || "";
          }
          await postData("/task", payload);
        }

        setShowTaskModal(false);
        setNewTask({
          title: "",
          description: "",
          status: "to-do",
          priority: "medium",
          assigneeId: "",
          startDate: "",
          dueDate: "",
          rejectionAttachmentType: "either", // ✅ NEW
        });
        setStartDateObj(undefined);
        setDueDateObj(undefined);
        setTaskAttachments([]);
        setTaskReferenceLink("");
        setIsRecurring(false);
        setRecurringFrequency("daily");
        // Clear the file input
        if (taskFileInputRef.current) {
          taskFileInputRef.current.value = '';
        }
        await Promise.all([fetchAllTasks(), fetchUserTasks()]);
        toast.success("Task created!");
      } catch (error: any) {
        // Extract the error message properly
        let errorMessage = "Failed to create task";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error && typeof error === 'object' && 'message' in error) {
          errorMessage = String(error.message);
        } else if (error && typeof error === 'object' && 'response' in error && error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        toast.error(errorMessage);
      } finally {
        setSubmittingTask(false);
      }
    },
    [newTask, projectId, fetchAllTasks, fetchUserTasks, project, taskAttachments, taskReferenceLink, isRecurring, recurringFrequency]
  );

  useEffect(() => {
    if (isAuthenticated && projectId) {
      Promise.all([
        fetchUserRole(),
        fetchProjectDetails(),
        fetchAllTasks(),
        fetchUserTasks(),
        fetchAssignableMembers(),
        (async () => { try { const res = await fetchData(`/project/${projectId}/role`); setProjectRole(res.projectRole || 'member'); } catch { } })(),
      ]);
    }
  }, [isAuthenticated, projectId]);

  // Auto-set due date to project end date when recurring is checked
  useEffect(() => {
    if (isRecurring && project?.endDate) {
      const projectEndDate = new Date(project.endDate);
      setDueDateObj(projectEndDate);
      setNewTask(prev => ({ ...prev, dueDate: projectEndDate.toISOString() }));
    }
  }, [isRecurring, project?.endDate]);

  // Loading and error states (unchanged)
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <CardTitle className="text-base mb-2">Project Not Found</CardTitle>
            <p className="text-sm text-gray-600 mb-4">No access to this project.</p>
            <Button onClick={() => navigate("/workspace")} size="sm" className="h-8">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* MOBILE HEADER (unchanged) */}
      <div className="block md:hidden bg-white border-b p-3 sticky top-0 z-20">
        {/* Breadcrumb */}
        <div className="mb-3">
          <Breadcrumb />
        </div>

        <div className="flex items-center justify-between mb-3">
          {/* Filter Button - Left Side */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Filter className="w-3.5 h-3.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 sm:w-72">
              <SheetHeader>
                <SheetTitle className="text-base">Filters</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-sm">Search</Label>
                  <Input
                    placeholder="Search tasks..."
                    value={filters.search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter("search", e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value: string) => updateFilter("status", value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="to-do">To Do</SelectItem>
                      <SelectItem value="in-progress">Active</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Priority</Label>
                  <Select
                    value={filters.priority}
                    onValueChange={(value: string) => updateFilter("priority", value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={clearFilters} variant="outline" className="w-full h-8 text-sm">
                  Clear All
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Team Avatars - Right Side (For Project Lead or Admin) */}
          {(isProjectLead || isAdmin) && (
            <TeamAvatars
              members={project.members || []}
              maxVisible={3}
              onClick={() => setShowMembersModal(true)}
            />
          )}
        </div>

        {/* MOBILE PROJECT DETAILS - Custom Layout */}
        <div className="bg-[#E5EFFF] rounded-[10px] p-[15px] space-y-3 mt-3">
          {/* Project Title */}
          <div>
            <h1 className="text-base font-bold text-[#040110] mb-1">
              {project.title}
            </h1>
          </div>

          {/* Progress Bar - Full Width */}
          <div>
            <div className="text-[12px] font-normal font-['Inter'] text-[#6B7280] mb-[5px]">
              Progress
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[#040110]">{project.progress}%</span>
              <Progress value={project.progress} className="flex-1 h-2" />
            </div>
          </div>

          {/* Project Lead */}
          <div>
            <div className="text-[12px] font-normal font-['Inter'] text-[#6B7280] mb-[5px]">
              Project Lead
            </div>
            <div className="text-[14px] font-normal font-['Inter'] text-[#040110]">
              {project.projectHead?.name || '—'}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="text-[12px] font-normal font-['Inter'] text-[#6B7280] mb-[5px]">
              Description
            </div>
            <div className="text-[14px] font-normal font-['Inter'] text-[#040110]">
              <TruncatedTextModal
                text={project.description}
                lines={3}
                ellipsisClassName="text-[#040110] bg-[#E5EFFF]"
                modalBgClassName="bg-[#E5EFFF]"
                modalTitle="Description"
              />
            </div>
          </div>

          {/* Project Start Date */}
          <div>
            <div className="text-[12px] font-normal font-['Inter'] text-[#6B7280] mb-[5px]">
              Project Start Date
            </div>
            <div className="text-[14px] font-normal font-['Inter'] text-[#040110]">
              {(() => {
                const date = new Date(project.startDate);
                const day = String(date.getUTCDate()).padStart(2, '0');
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const year = date.getUTCFullYear();
                return `${day}/${month}/${year}`;
              })()}
            </div>
          </div>

          {/* Project End Date */}
          <div>
            <div className="text-[12px] font-normal font-['Inter'] text-[#6B7280] mb-[5px]">
              Project End Date
            </div>
            <div className="text-[14px] font-normal font-['Inter'] text-[#040110]">
              {(() => {
                const date = new Date(project.endDate);
                const day = String(date.getUTCDate()).padStart(2, '0');
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const year = date.getUTCFullYear();
                return `${day}/${month}/${year}`;
              })()}
            </div>
          </div>

          {/* Duration & Status - 1x2 Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[12px] font-normal font-['Inter'] text-[#6B7280] mb-[5px]">
                Duration
              </div>
              <div className="text-[14px] font-normal font-['Inter'] text-[#040110]">
                {(() => {
                  const start = new Date(project.startDate);
                  const end = new Date(project.endDate);
                  start.setHours(0, 0, 0, 0);
                  end.setHours(0, 0, 0, 0);
                  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  return `${Math.max(1, diffDays)} Days`;
                })()}
              </div>
            </div>
            <div>
              <div className="text-[12px] font-normal font-['Inter'] text-[#6B7280] mb-[5px]">
                Status
              </div>
              <StatusBadge status={project.status} />
            </div>
          </div>

          {/* Task Stats - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#D1E3FF]">
            {[
              {
                label: "Total",
                value: taskStats.total,
                bg: "#E0E7FF",
                stripe: "#6366F1",
              },
              {
                label: "Done",
                value: taskStats.completed,
                bg: "#D1FAE5",
                stripe: "#10B981",
              },
              {
                label: "Active",
                value: taskStats.inProgress,
                bg: "#FEF3C7",
                stripe: "#F59E0B",
              },
              {
                label: "Overdue",
                value: taskStats.overdue,
                bg: "#FED7AA",
                stripe: "#F97316",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="relative rounded-[6px] py-2 px-1 text-center"
                style={{ backgroundColor: stat.bg }}
              >
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-[2px]"
                  style={{ backgroundColor: stat.stripe }}
                />
                <div className="text-sm font-bold text-[#040110]">{stat.value}</div>
                <div className="text-xs text-[#040110] opacity-70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DESKTOP HEADER */}
      <div className="hidden md:block bg-white border-b px-4 py-3">
        {/* Breadcrumb */}
        <div className="mb-3">
          <Breadcrumb />
        </div>

        {/* Header: Title, Progress, Team Avatars, Invite Button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col gap-[5px]">
            <h1 className="text-[24px] font-bold font-['Inter'] text-[#040110] leading-normal">{project.title}</h1>
            <p className="text-[14px] font-normal font-['Work_Sans'] text-[#040110] opacity-60 leading-normal truncate max-w-md">{project.description}</p>
          </div>

          <div className="flex items-center gap-[11px]">
            {/* Progress Bar - Figma Style */}
            <div className="flex flex-col gap-[5px] items-end">
              <div className="flex items-center justify-between w-[150px] text-[14px] font-normal font-['Inter'] text-neutral-700">
                <span>Progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="bg-[#e9edf0] h-[10px] w-[150px] rounded-[8px] relative">
                <div
                  className="absolute bg-[#3a5afe] h-[10px] left-0 top-0 rounded-[8px]"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>

            {/* Team Avatars */}
            <TeamAvatars
              members={project.members || []}
              maxVisible={3}
              onClick={(isAdmin || isProjectLead) ? () => setShowMembersModal(true) : undefined}
            />

            {/* Invite/Add Members (visible only to Project Lead) */}
            {isProjectLead && (
              <InviteMembersButton
                projectId={project._id}
                workspaceId={localStorage.getItem("currentWorkspaceId") || undefined}
                onInviteSuccess={async () => {
                  await Promise.all([fetchProjectDetails(), fetchAssignableMembers()]);
                }}
              />
            )}
            {/* Existing Add employee button is provided by InviteMembersButton */}
          </div>
        </div>

        {/* Remove Members Modal */}
        <RemoveProjectMembersModal
          open={showMembersModal}
          onOpenChange={setShowMembersModal}
          projectId={project._id}
          projectHead={project.projectHead || null}
          members={project.members || []}
          userRole={userRole}
          currentUserId={(currentUser?.id || currentUser?._id || '').toString()}
          onRemoveSuccess={async () => {
            await Promise.all([fetchProjectDetails(), fetchAssignableMembers()]);
          }}
        />

        {/* AddProjectMemberModal removed; using InviteMembersButton dialog */}

        {/* Project Overview Heading */}
        <div className="mb-3">
          <h2 className="text-[18px] font-semibold font-['Inter'] text-[#040110]">
            Project Overview
          </h2>
        </div>

        {/* Three Column Layout: Metrics + Overview Panel + Attachments */}
        {/* Three Column Layout: Metrics + Overview Panel + Attachments */}
        <div className="flex flex-wrap xl:flex-nowrap gap-4">
          {/* Left: Metric Cards */}
          <div className="w-full md:w-auto xl:w-[238px] flex-shrink-0">
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-2 gap-3">
              {[
                {
                  label: "Total Task",
                  value: taskStats.total,
                  bg: "#E0E7FF",
                  stripe: "#6366F1",
                  textColor: "#040110"
                },
                {
                  label: "Completed",
                  value: taskStats.completed,
                  bg: "#D1FAE5",
                  stripe: "#10B981",
                  textColor: "#040110"
                },
                {
                  label: "Active",
                  value: taskStats.inProgress,
                  bg: "#FEF3C7",
                  stripe: "#F59E0B",
                  textColor: "#040110"
                },
                {
                  label: "Overdue",
                  value: taskStats.overdue,
                  bg: "#FED7AA",
                  stripe: "#F97316",
                  textColor: "#040110"
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="relative rounded-[8px] h-[114px] flex flex-col justify-center pl-[19px] pr-[14px]"
                  style={{ backgroundColor: stat.bg }}
                >
                  {/* 5px Vertical Stripe */}
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[5px] h-[28px] rounded-r-[4px]"
                    style={{ backgroundColor: stat.stripe }}
                  />

                  {/* Label */}
                  <div className="text-[14px] font-normal font-['Inter'] mb-[4px]" style={{ color: stat.textColor }}>
                    {stat.label}
                  </div>

                  {/* Number */}
                  <div className="text-[34px] font-bold font-['Inter'] leading-none" style={{ color: stat.textColor }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center: Project Overview Panel */}
          <div className="w-full md:flex-1 xl:w-[560px] xl:flex-none min-w-[300px]">
            <ProjectOverviewPanel
              projectManager={project.creator.name}
              projectHead={project.projectHead?.name}
              description={project.description}
              startDate={project.startDate}
              endDate={project.endDate}
              status={project.status}
            />
          </div>

          {/* Right: Attachments Sidebar */}
          <div className="w-full xl:flex-1 min-w-[300px]">
            <AttachmentsSidebar
              attachments={project.attachments || []}
              canDelete={permissions.isAdmin}
              canPreview={permissions.isAdmin || isProjectLead}
              canUpload={permissions.isAdmin || isProjectLead}
              onDelete={async (id) => {
                try {
                  await deleteData(`/projects/${project._id}/attachments/${id}`);
                  toast.success('Attachment deleted successfully');
                  fetchProjectDetails();
                } catch (error: any) {
                  toast.error(error.message || 'Failed to delete attachment');
                }
              }}
              onPreview={(file) => {
                setPreviewAttachment(file);
              }}
              onUploadClick={() => setShowUploadDialog(true)}
            />
          </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1">
        <div className={cn("p-3", !isMobile && "p-4")}>
          <Tabs defaultValue="your-tasks" className="space-y-4">
            <div className="sticky top-0 bg-gray-50 pb-3 z-5">
              <div className="flex items-center justify-between">
                <TabsList className="grid w-full max-w-xs grid-cols-3 h-8">
                  <TabsTrigger
                    value="your-tasks"
                    className="text-xs px-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    <CheckSquare className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Your</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="kanban"
                    className="text-xs px-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                  >
                    <KanbanSquare className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Board</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="calendar"
                    className="text-xs px-2 data-[state=active]:bg-green-600 data-[state=active]:text-white"
                  >
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Calendar</span>
                  </TabsTrigger>
                </TabsList>
                {(isAdmin || isProjectLead) && (
                  <Button onClick={() => setShowTaskModal(true)} size="sm" className="h-8 bg-[#f2761b] hover:bg-[#f2761b]/90 text-white">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Create Task
                  </Button>
                )}
              </div>
            </div>

            {/* YOUR TASKS TAB */}
            <TabsContent value="your-tasks" className="space-y-3 mt-0">
              {/* DESKTOP QUICK FILTERS - Updated to match Figma design */}
              <div className="hidden md:block">
                <div className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search..."
                      className="pl-9 h-10 text-sm border-gray-200 focus:border-gray-300"
                      value={filters.search}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter("search", e.target.value)}
                    />
                  </div>
                  <Select
                    value={filters.status}
                    onValueChange={(value: string) => updateFilter("status", value)}
                  >
                    <SelectTrigger className="w-[140px] h-10 text-sm border-gray-200">
                      <SelectValue placeholder="Task Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="to-do">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.priority}
                    onValueChange={(value: string) => updateFilter("priority", value)}
                  >
                    <SelectTrigger className="w-[120px] h-10 text-sm border-gray-200">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  {(filters.search || filters.status !== "all" || filters.priority !== "all") && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="h-10 px-3 text-sm border-gray-200">
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {filteredUserTasks.length === 0 ? (
                <Card className="border-dashed border-2 border-gray-200 bg-white">
                  <CardContent className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <CheckSquare className="w-8 h-8 text-gray-400" />
                    </div>
                    <CardTitle className="text-lg font-semibold mb-2 text-gray-900">No Task Found</CardTitle>
                    <p className="text-sm text-gray-500 mb-4">
                      {filters.search || filters.status !== "all" || filters.priority !== "all"
                        ? "Try adjusting your filters"
                        : "No task assigned yet"}
                    </p>
                    {(isAdmin || isProjectLead) && (
                      <Button
                        onClick={() => setShowTaskModal(true)}
                        className="bg-[#f2761b] hover:bg-[#f2761b]/90 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Task
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div
                  className={cn(
                    "grid gap-3 pb-16 md:pb-4",
                    "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  )}
                >
                  {filteredUserTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      compact={true}
                      onClick={() => navigate(`/task/${task._id}`)}
                      currentUser={currentUser}
                      project={project}
                      userRole={userRole}
                      onTaskUpdate={() => Promise.all([fetchAllTasks(), fetchUserTasks()])}
                      assignableMembers={filteredAssignableMembers}
                      canAssignVisible={isAdmin || isProjectLead}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* KANBAN TAB */}
            <TabsContent value="kanban" className="mt-0">
              {!canViewKanban ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <CardTitle className="text-base mb-2">Access Restricted</CardTitle>
                    <p className="text-sm text-gray-600">
                      {currentUser ? "You are not an employee of this project." : "Loading user data..."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {/* DESKTOP KANBAN FILTERS */}
                  {/* Responsive Kanban Filters */}
                  <div className="mb-4">
                    {/* Search Bar - Full Width */}
                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-700 mb-1.5 block">Search Tasks</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by title or description..."
                          className="pl-9 h-9 text-sm"
                          value={filters.search}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter("search", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Status & Priority - Side by Side */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {/* Status Filter */}
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1.5 block">Status</label>
                        <Select
                          value={filters.status}
                          onValueChange={(value: string) => updateFilter("status", value)}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="to-do">To Do</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Priority Filter */}
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1.5 block">Priority</label>
                        <Select
                          value={filters.priority}
                          onValueChange={(value: string) => updateFilter("priority", value)}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Priority</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Assignee Filter & Clear Button */}
                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-700 mb-1.5 block">Assigned To</label>
                      <div className="flex gap-2">
                        <Select
                          value={filters.assignee}
                          onValueChange={(value: string) => updateFilter("assignee", value)}
                        >
                          <SelectTrigger className="h-9 text-sm flex-1">
                            <SelectValue placeholder="All Members" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Members</SelectItem>
                            {project?.members?.map((member: { userId: { _id: string; name: string; email: string } }) => (
                              <SelectItem key={member.userId._id} value={member.userId._id}>
                                {member.userId.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {(filters.search || filters.status !== "all" || filters.priority !== "all" || filters.assignee !== "all") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearFilters}
                            className="h-9 px-3 text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-300 whitespace-nowrap"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Clear All Filters
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Mobile Status Filter */}
                    {isMobile && (
                      <div className="mb-3">
                        <label className="text-xs font-medium text-gray-700 mb-1.5 block">View Status</label>
                        <Select value={mobileKanbanStatus} onValueChange={(value: "to-do" | "in-progress" | "on-hold" | "done") => setMobileKanbanStatus(value)}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="to-do">To Do</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            {(isAdmin || isProjectLead || projectRole === "owner") && (
                              <SelectItem value="on-hold">On Hold</SelectItem>
                            )}
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className={cn("grid gap-4 pb-4", isMobile ? "grid-cols-1" : (isAdmin || isProjectLead || projectRole === "owner") ? "md:grid-cols-4" : "md:grid-cols-3")}>
                      {/* Show all columns on desktop, only selected status on mobile */}
                      {(!isMobile || mobileKanbanStatus === "to-do") && (
                        <DroppableColumn
                          id="to-do"
                          title="To Do"
                          count={kanbanFilteredTasks.filter((t) => t.status === "to-do").length}
                          total={kanbanFilteredTasks.length}
                          color="bg-blue-500"
                        >
                          <SortableContext
                            items={kanbanFilteredTasks.filter((t) => t.status === "to-do").map((t) => t._id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {kanbanFilteredTasks
                              .filter((t) => t.status === "to-do")
                              .map((task) => (
                                <SortableTaskCard
                                  key={task._id}
                                  task={task}
                                  currentUser={currentUser}
                                  userRole={userRole}
                                  onTaskUpdate={() => Promise.all([fetchAllTasks(), fetchUserTasks()])}
                                  assignableMembers={filteredAssignableMembers}
                                  canAssignVisible={isAdmin || isProjectLead}
                                  project={project}
                                />
                              ))}
                          </SortableContext>
                        </DroppableColumn>
                      )}

                      {(!isMobile || mobileKanbanStatus === "in-progress") && (
                        <DroppableColumn
                          id="in-progress"
                          title="In Progress"
                          count={kanbanFilteredTasks.filter((t) => t.status === "in-progress").length}
                          total={kanbanFilteredTasks.length}
                          color="bg-orange-400"
                        >
                          <SortableContext
                            items={kanbanFilteredTasks.filter((t) => t.status === "in-progress").map((t) => t._id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {kanbanFilteredTasks
                              .filter((t) => t.status === "in-progress")
                              .map((task) => (
                                <SortableTaskCard
                                  key={task._id}
                                  task={task}
                                  currentUser={currentUser}
                                  userRole={userRole}
                                  onTaskUpdate={() => Promise.all([fetchAllTasks(), fetchUserTasks()])}
                                  assignableMembers={filteredAssignableMembers}
                                  canAssignVisible={isAdmin || isProjectLead}
                                  project={project}
                                />
                              ))}
                          </SortableContext>
                        </DroppableColumn>
                      )}

                      {/* ✅ NEW: On Hold Column - Only visible to admins, project leads, and owners */}
                      {(isAdmin || isProjectLead || projectRole === "owner") && (!isMobile || mobileKanbanStatus === "on-hold") && (
                        <DroppableColumn
                          id="on-hold"
                          title="On Hold"
                          count={kanbanFilteredTasks.filter((t) => t.status === "on-hold").length}
                          total={kanbanFilteredTasks.length}
                          color="bg-yellow-500"
                        >
                          <SortableContext
                            items={kanbanFilteredTasks.filter((t) => t.status === "on-hold").map((t) => t._id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {kanbanFilteredTasks
                              .filter((t) => t.status === "on-hold")
                              .map((task) => (
                                <SortableTaskCard
                                  key={task._id}
                                  task={task}
                                  currentUser={currentUser}
                                  userRole={userRole}
                                  onTaskUpdate={() => Promise.all([fetchAllTasks(), fetchUserTasks()])}
                                  assignableMembers={filteredAssignableMembers}
                                  canAssignVisible={isAdmin || isProjectLead}
                                  project={project}
                                />
                              ))}
                          </SortableContext>
                        </DroppableColumn>
                      )}

                      {(!isMobile || mobileKanbanStatus === "done") && (
                        <DroppableColumn
                          id="done"
                          title="Done"
                          count={kanbanFilteredTasks.filter((t) => t.status === "done").length}
                          total={kanbanFilteredTasks.length}
                          color="bg-green-500"
                        >
                          <SortableContext
                            items={kanbanFilteredTasks.filter((t) => t.status === "done").map((t) => t._id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {kanbanFilteredTasks
                              .filter((t) => t.status === "done")
                              .map((task) => (
                                <SortableTaskCard
                                  key={task._id}
                                  task={task}
                                  currentUser={currentUser}
                                  userRole={userRole}
                                  onTaskUpdate={() => Promise.all([fetchAllTasks(), fetchUserTasks()])}
                                  assignableMembers={filteredAssignableMembers}
                                  canAssignVisible={isAdmin || isProjectLead}
                                  project={project}
                                />
                              ))}
                          </SortableContext>
                        </DroppableColumn>
                      )}
                    </div>

                    <DragOverlay>
                      {activeTask && (
                        <TaskCard task={activeTask} compact={true} canAssignVisible={false} />
                      )}
                    </DragOverlay>
                  </DndContext>
                </div>
              )}
            </TabsContent>

            {/* CALENDAR TAB */}
            <TabsContent value="calendar" className="mt-0">
              {!canViewKanban ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <CardTitle className="text-base mb-2">Access Restricted</CardTitle>
                    <p className="text-sm text-gray-600">
                      {currentUser ? "You are not an employee of this project." : "Loading user data..."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <CalendarViewComponent
                  tasks={kanbanFilteredTasks.filter((t) => (t as any).approvalStatus !== "approved")}
                  filters={filters}
                  updateFilter={updateFilter}
                  clearFilters={clearFilters}
                  isMobile={isMobile}
                  navigate={navigate}
                  userRole={userRole}
                  currentUser={currentUser}
                  project={project}
                />
              )}
            </TabsContent>
            <div className="mt-4">
              {project && <ProjectApprovalMetrics projectId={project._id} />}
            </div>
          </Tabs>
        </div>
      </div>

      {/* MOBILE FAB */}
      {
        isMobile && canCreateTask && (
          <Button
            onClick={() => setShowTaskModal(true)}
            className="fixed bottom-4 right-4 w-11 h-11 rounded-full shadow-lg z-30 p-0 bg-[#f2761b] hover:bg-[#f2761b]/90"
          >
            <Plus className="w-5 h-5" />
          </Button>
        )
      }

      {/* CREATE TASK MODAL */}
      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent
          className={cn(
            "max-h-[90vh]",
            isMobile ? "mx-2 w-[calc(100vw-16px)] max-w-none" : "sm:max-w-md"
          )}
        >
          <DialogHeader className="pb-3">
            <DialogTitle className="text-base">Create Task</DialogTitle>
            <p className="text-sm text-gray-600">Add to "{project?.title}"</p>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <form onSubmit={handleCreateTask} className="space-y-3 pr-1">
              <div className="space-y-1">
                <Label className="text-sm">Title *</Label>
                <Input
                  required
                  value={newTask.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title"
                  className="h-8"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-sm">Status</Label>
                  <Select
                    value={newTask.status}
                    onValueChange={(value: string) => setNewTask({ ...newTask, status: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to-do">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: string) => setNewTask({ ...newTask, priority: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Assignee (optional)</Label>
                <Select
                  value={newTask.assigneeId}
                  onValueChange={(value: string) => setNewTask({ ...newTask, assigneeId: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAssignableMembers.map((member) => (
                      <SelectItem key={member._id} value={member._id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-4 h-4">
                            <AvatarFallback className="text-xs">{(member.name?.charAt(0) || member.email?.charAt(0) || "?")}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{member.name || member.email || "Unknown"}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-sm">Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] justify-start text-left font-normal",
                          !startDateObj && "text-[#717680]"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDateObj ? format(startDateObj, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDateObj}
                        onSelect={(date) => {
                          if (!date) return;
                          setStartDateObj(date);
                          setNewTask({ ...newTask, startDate: format(date, "yyyy-MM-dd") });
                          // Ensure due date baseline respects start date
                          if (dueDateObj && dueDateObj < date) {
                            setDueDateObj(date);
                            setNewTask({ ...newTask, startDate: format(date, "yyyy-MM-dd"), dueDate: format(date, "yyyy-MM-dd") });
                          }
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const projStart = project ? new Date(project.startDate) : new Date();
                          projStart.setHours(0, 0, 0, 0);
                          const projEnd = project ? new Date(project.endDate) : undefined;
                          if (projEnd) projEnd.setHours(0, 0, 0, 0);
                          const d = new Date(date);
                          d.setHours(0, 0, 0, 0);
                          return Boolean(d < today || d < projStart || (projEnd && d > projEnd));
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Due Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] justify-start text-left font-normal",
                          !dueDateObj && "text-[#717680]"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDateObj ? format(dueDateObj, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dueDateObj}
                        onSelect={(date) => {
                          if (!date) return;
                          const projEnd = project ? new Date(project.endDate) : undefined;
                          if (projEnd) {
                            projEnd.setHours(0, 0, 0, 0);
                          }
                          const selected = new Date(date);
                          selected.setHours(0, 0, 0, 0);
                          const projEndPlusOne = projEnd ? new Date(projEnd) : undefined;
                          if (projEndPlusOne) {
                            projEndPlusOne.setDate(projEndPlusOne.getDate() + 1);
                          }
                          if (projEndPlusOne && selected.getTime() >= projEndPlusOne.getTime()) {
                            toast.error("Due date cannot be after project end date");
                            setDueDateObj(projEnd);
                            setNewTask({ ...newTask, dueDate: projEnd ? format(projEnd, "yyyy-MM-dd") : "" });
                            return;
                          }
                          setDueDateObj(selected);
                          setNewTask({ ...newTask, dueDate: format(selected, "yyyy-MM-dd") });
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const projStart = project ? new Date(project.startDate) : new Date();
                          projStart.setHours(0, 0, 0, 0);
                          const startBaseline = startDateObj ? new Date(startDateObj) : projStart;
                          startBaseline.setHours(0, 0, 0, 0);
                          const projEnd = project ? new Date(project.endDate) : undefined;
                          if (projEnd) projEnd.setHours(0, 0, 0, 0);
                          const d = new Date(date);
                          d.setHours(0, 0, 0, 0);
                          return Boolean(d < startBaseline || d < today || (projEnd && d > projEnd));
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isRecurring}
                    data-state={isRecurring ? "checked" : "unchecked"}
                    onClick={() => setIsRecurring(!isRecurring)}
                    className="peer h-4 w-4 shrink-0 rounded-sm border border-input shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  >
                    {isRecurring && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check size-4">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                  <label
                    htmlFor="isRecurring"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 cursor-pointer"
                    onClick={() => setIsRecurring(!isRecurring)}
                  >
                    Recurring Task
                  </label>
                </div>

                {isRecurring && (
                  <div className="space-y-1 ml-6">
                    <Label className="text-sm">Frequency</Label>
                    <Select
                      value={recurringFrequency}
                      onValueChange={(value: "daily" | "weekly" | "monthly") => setRecurringFrequency(value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-600">
                      Task will recur {recurringFrequency} until project ends
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Description</Label>
                <Textarea
                  value={newTask.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task details..."
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>

              {/* ✅ NEW: Rejection Attachment Type Selector */}
              {/* <div className="space-y-1">
                <Label className="text-sm">Rejection Attachment Requirement</Label>
                <Select
                  value={newTask.rejectionAttachmentType}
                  onValueChange={(value: string) => setNewTask({ ...newTask, rejectionAttachmentType: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="either">File or Link (Either)</SelectItem>
                    <SelectItem value="file">File Required</SelectItem>
                    <SelectItem value="link">Link Required (Figma/GitHub)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Specify what type of attachment is required when rejecting this task
                </p>
              </div> */}



              <div className="space-y-1">
                <Label className="text-sm">Attachments (optional)</Label>

                {/* File Upload Section */}
                <div className="space-y-2">
                  <div className="border border-[#d5d7da] rounded-[8px]">
                    <label htmlFor="attachments" className="flex items-center gap-[8px] px-[14px] py-[10px] cursor-pointer hover:bg-gray-50">
                      <Upload className="w-4 h-4 text-[#717680]" />
                      <span className="flex-1 text-[14px] font-normal font-['Inter'] text-[#717680]">
                        {taskAttachments.length > 0 ? `${taskAttachments.length} file(s) selected` : 'Upload file(s)'}
                      </span>
                    </label>
                    <input
                      ref={taskFileInputRef}
                      id="attachments"
                      type="file"
                      multiple
                      className="hidden"
                      accept="image/*,.pdf,.docx"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          const newFiles = Array.from(files) as File[];

                          // Check total files limit (3 files max)
                          const totalFiles = taskAttachments.length + newFiles.length;
                          if (totalFiles > 3) {
                            toast.error(`Maximum 3 files allowed. You currently have ${taskAttachments.length} file(s) and tried to add ${newFiles.length} more.`);
                            return;
                          }

                          // Check file sizes (5MB limit)
                          const maxFileSize = 5 * 1024 * 1024; // 5MB in bytes
                          const oversizedFiles = newFiles.filter(file => file.size > maxFileSize);
                          if (oversizedFiles.length > 0) {
                            const fileNames = oversizedFiles.map(file => `"${file.name}"`).join(', ');
                            toast.error(`${fileNames}: File too large (max 5MB per file)`);
                            return;
                          }

                          // Append new files to existing ones
                          setTaskAttachments(prev => [...prev, ...newFiles]);
                        }
                      }}
                    />
                  </div>
                  {taskAttachments.length > 0 && (
                    <div className="space-y-[6px] mt-[8px]">
                      <div className="flex justify-between items-center mb-[4px]">
                        <span className="text-[10px] text-gray-500">{taskAttachments.length} of 3 files</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTaskAttachments([]);
                            if (taskFileInputRef.current) {
                              taskFileInputRef.current.value = '';
                            }
                          }}
                          className="text-[10px] text-[#cd2818] hover:text-[#a01f10] font-medium"
                        >
                          Clear All
                        </button>
                      </div>
                      {taskAttachments.map((file, index) => (
                        <div key={index} className="flex items-center gap-[8px] text-[12px] font-['Inter'] text-[#414651]">
                          <span className="flex-1 truncate">{file.name}</span>
                          <span className="text-[10px] text-gray-500">{formatFileSize(file.size)}</span>
                          <button
                            type="button"
                            onClick={() => removeTaskAttachment(index)}
                            className="text-[#cd2818] hover:text-[#a01f10]"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x" aria-hidden="true">
                              <path d="M18 6 6 18"></path>
                              <path d="m6 6 12 12"></path>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Link Input Section */}
                  <div className="space-y-2">
                    {taskAttachments.length > 0 && (
                      <p className="text-[12px] font-normal font-['Inter'] text-[#717680]">
                        And/or provide a reference link:
                      </p>
                    )}
                    <Input
                      type="url"
                      value={taskReferenceLink}
                      onChange={(e) => setTaskReferenceLink(e.target.value)}
                      placeholder="Figma or GitHub link (e.g., https://figma.com/...)"
                      className="border-[#d5d7da] rounded-[8px] px-[14px] py-[10px] text-[14px] font-['Inter'] placeholder:text-[#717680]"
                    />
                    <p className="text-[12px] font-normal font-['Inter'] text-[#717680]">
                      Reference links help provide context for the task. Only Figma and GitHub links are allowed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 h-9 text-sm"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingTask} className="flex-1 h-9 text-sm bg-[#f2761b] hover:bg-[#f2761b]/90">
                  {submittingTask ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 mr-1" />
                  )}
                  {submittingTask ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* File Preview Modal */}
      <FilePreviewModal
        attachment={previewAttachment}
        open={!!previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />

      {/* Attachment Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-semibold font-['Inter']">
              Upload Attachments
            </DialogTitle>
            <DialogDescription className="text-[14px] text-gray-500 font-['Inter'] mt-1">
              Upload files to this project (max 10 total)
            </DialogDescription>
          </DialogHeader>

          <AttachmentUpload
            projectId={project?._id || ''}
            currentAttachmentCount={project?.attachments?.length || 0}
            onUploadSuccess={() => {
              fetchProjectDetails();
              setShowUploadDialog(false);
              toast.success('Attachments uploaded successfully');
            }}
          />
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default ProjectDetail;
