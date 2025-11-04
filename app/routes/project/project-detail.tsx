import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../../provider/auth-context";
import { fetchData, postData, deleteData } from "@/lib/fetch-util"; // ✅ UPDATED: Added deleteData import
import {
  ArrowLeft,
  Plus,
  Settings,
  Calendar,
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
import { StatusBadge } from "@/components/ui/status-badge";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { TeamAvatars } from "@/components/project/TeamAvatars";
import { InviteMembersButton } from "@/components/project/InviteMembersButton";
import { ProjectOverviewPanel } from "@/components/project/ProjectOverviewPanel";
import { AttachmentsSidebar } from "@/components/project/AttachmentsSidebar";
import { FilePreviewModal } from "@/components/project/FilePreviewModal";
import { AttachmentUpload } from "@/components/project/AttachmentUpload";
import { usePermissions } from "@/hooks/use-permissions";

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
  status: "to-do" | "in-progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assignee: { _id: string; name: string; email: string };
  creator: { _id: string; name: string; email: string };
  category: string;
  startDate: string;
  dueDate: string;
  durationDays?: number;
  createdAt: string;
}

type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';

interface Project {
  _id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  progress: number;
  categories: Array<{
    name: string;
    members: Array<{
      userId: { _id: string; name: string; email: string };
      role: string;
    }>;
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
  status: "all" | "to-do" | "in-progress" | "done";
  priority: "all" | "low" | "medium" | "high" | "urgent";
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

    return currentDate.toLocaleDateString("en-US", options);
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
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
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
    const isOverdue = new Date(task.dueDate) < new Date() && task.status !== "done";
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
                  {task.assignee.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-[10px]">{task.assignee.name.split(" ")[0]}</span>
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
          {/* Desktop Filters */}
          {!isMobile && (
            <div className="flex gap-2 items-center mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search tasks..."
                  className="pl-7 h-8 text-sm"
                  value={filters.search}
                  onChange={(e) => updateFilter("search", e.target.value)}
                />
              </div>
              <Select
                value={filters.status}
                onValueChange={(value) => updateFilter("status", value)}
              >
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="to-do">To Do</SelectItem>
                  <SelectItem value="in-progress">Active</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.priority}
                onValueChange={(value) => updateFilter("priority", value)}
              >
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Med</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              {(filters.search || filters.status !== "all" || filters.priority !== "all") && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
                  Clear
                </Button>
              )}
            </div>
          )}

          {/* Calendar Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateCalendar("prev")} className="h-8 w-8 p-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateCalendar("next")} className="h-8 w-8 p-0">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} className="h-8 px-3 text-sm">
                Today
              </Button>
              <h2 className="text-lg font-semibold ml-2 text-gray-900">{getCalendarTitle}</h2>
            </div>

            <div className="flex items-center gap-2">
              {!isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTaskDetails(!showTaskDetails)}
                  className="h-8 px-2 text-xs"
                >
                  {showTaskDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              )}

              <div className="flex border rounded-md">
                {(["month", "week", "day"] as const).map((view) => (
                  <Button
                    key={view}
                    variant={calendarView === view ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCalendarView(view)}
                    className="h-8 px-2 text-xs capitalize"
                  >
                    {view}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ UPDATED: Calendar Content with Task Spans */}
      <Card>
        <CardContent className="p-0">
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
                    {currentDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                </Card>

                <div className="space-y-2">
                  {getTasksForDate(currentDate).length === 0 ? (
                    <Card className="border-dashed border-2 border-gray-200">
                      <CardContent className="text-center py-8">
                        <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
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
        </CardContent>
      </Card>

      {/* ✅ UPDATED: Enhanced Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-600 font-medium">Priority:</span>
              <div className="flex items-center gap-3">
                {[
                  { color: 'bg-red-500', label: 'Urgent' },
                  { color: 'bg-orange-500', label: 'High' },
                  { color: 'bg-yellow-500', label: 'Medium' },
                  { color: 'bg-green-500', label: 'Low' }
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className={`w-3 h-3 ${color} rounded-full`}></div>
                    <span className="text-gray-700">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-gray-600 font-medium">Task Spans:</span>
              <div className="flex items-center gap-3">
                {[
                  { symbol: '▶', label: 'Start' },
                  { symbol: '─', label: 'Ongoing' },
                  { symbol: '◀', label: 'End' }
                ].map(({ symbol, label }) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="text-gray-700">{symbol} {label}</span>
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
}>(({ task, onClick, compact = false, currentUser, userRole, onTaskUpdate }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== "done";

  // ✅ NEW: Check if user can manage this task
  const canManageTask = useMemo(() => {
    if (!currentUser) return false;

    return (
      task.assignee._id === (currentUser.id || currentUser._id) ||
      task.creator._id === (currentUser.id || currentUser._id) ||
      ["admin", "super_admin"].includes(currentUser.role || userRole || "")
    );
  }, [currentUser, task, userRole]);

  // ✅ NEW: Handle task deletion using proper DELETE API
  const handleDeleteTask = async () => {
    try {
      setIsDeleting(true);
      await deleteData(`/task/${task._id}`);
      toast.success("Task deleted successfully");
      setShowDeleteDialog(false);
      onTaskUpdate?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };

  // ✅ NEW: Handle status change directly from menu
  const handleStatusChange = async (newStatus: string) => {
    try {
      await postData(`/task/${task._id}/status`, { status: newStatus });
      toast.success("Task status updated");
      onTaskUpdate?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update task");
    }
  };

  return (
    <>
      <Card
        className={cn(
          "cursor-pointer border-l-4 hover:shadow-sm transition-all duration-200 active:scale-95 relative group",
          task.status === "done"
            ? "border-l-green-500"
            : task.status === "in-progress"
              ? "border-l-blue-500"
              : "border-l-gray-400",
          isOverdue && "border-l-red-500"
        )}
      >
        <CardHeader className="p-3 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle
              className="text-sm font-medium line-clamp-2 text-gray-900 flex-1 cursor-pointer"
              onClick={onClick}
            >
              {task.title}
            </CardTitle>

            <div className="flex items-center gap-1 flex-shrink-0">
              <Badge
                variant="outline"
                className={cn("text-xs h-5 px-1.5", getPriorityColor(task.priority))}
              >
                {compact ? task.priority.charAt(0).toUpperCase() : task.priority}
              </Badge>

              {/* ✅ NEW: Settings Dropdown Menu */}
              {canManageTask && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={onClick}>
                      <Eye className="w-3 h-3 mr-2" />
                      View Details
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                      <Edit className="w-3 h-3 mr-2" />
                      Edit Task
                    </DropdownMenuItem>

                    {/* Status Change Options */}
                    {task.status !== "to-do" && (
                      <DropdownMenuItem onClick={() => handleStatusChange("to-do")}>
                        <Clock className="w-3 h-3 mr-2" />
                        Mark as To Do
                      </DropdownMenuItem>
                    )}

                    {task.status !== "in-progress" && (
                      <DropdownMenuItem onClick={() => handleStatusChange("in-progress")}>
                        <PlayCircle className="w-3 h-3 mr-2" />
                        Mark In Progress
                      </DropdownMenuItem>
                    )}

                    {task.status !== "done" && (
                      <DropdownMenuItem onClick={() => handleStatusChange("done")}>
                        <CheckCircle2 className="w-3 h-3 mr-2" />
                        Mark as Done
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete Task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 pt-0" onClick={onClick}>
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-1.5 min-w-0">
              <Avatar className="w-4 h-4">
                <AvatarFallback className="bg-blue-100 text-blue-700 font-medium text-xs">
                  {task.assignee.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{task.assignee.name.split(" ")[0]}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Clock className="w-3 h-3" />
              <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                {new Date(task.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                {" → "}
                {new Date(task.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ NEW: Quick Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Edit Task</DialogTitle>
          </DialogHeader>
          <QuickEditTaskForm
            task={task}
            onClose={() => setShowEditModal(false)}
            onUpdate={onTaskUpdate}
          />
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
}> = ({ task, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description,
    priority: task.priority,
    startDate: new Date(task.startDate).toISOString().split("T")[0],
    dueDate: new Date(task.dueDate).toISOString().split("T")[0],
  });
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
      await postData(`/task/${task._id}`, formData);
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm">Title</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="h-8"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm">Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
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

        <div className="space-y-2">
          <Label className="text-sm">Status</Label>
          <div className="flex gap-1">
            <Badge variant={task.status === "to-do" ? "default" : "outline"} className="text-xs">
              To Do
            </Badge>
            <Badge variant={task.status === "in-progress" ? "default" : "outline"} className="text-xs">
              Active
            </Badge>
            <Badge variant={task.status === "done" ? "default" : "outline"} className="text-xs">
              Done
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm">Start Date</Label>
          <Input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="h-8"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Due Date</Label>
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            className="h-8"
            min={formData.startDate}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
          {isSubmitting ? "Updating..." : "Update"}
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
}> = ({ task, currentUser, userRole, onTaskUpdate }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task._id });

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
        onClick={() => (window.location.href = `/task/${task._id}`)}
        currentUser={currentUser}
        userRole={userRole}
        onTaskUpdate={onTaskUpdate}
      />
    </div>
  );
};

const DroppableColumn = ({
  children,
  id,
  title,
  count,
  color,
}: {
  children: React.ReactNode;
  id: string;
  title: string;
  count: number;
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
        <Badge variant="secondary" className="text-xs h-5 px-2">
          {count}
        </Badge>
      </div>
      <div ref={setNodeRef} className="space-y-2 min-h-80">
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
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Attachment state
  const [previewAttachment, setPreviewAttachment] = useState<NonNullable<Project['attachments']>[0] | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const [filters, setFilters] = useState<FilterType>({
    search: "",
    status: "all",
    priority: "all",
  });

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    status: "to-do",
    priority: "medium",
    assigneeId: "",
    startDate: "",
    dueDate: "",
  });

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

      return matchesSearch && matchesStatus && matchesPriority;
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

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [userTasks, filters]);

  // Enhanced role-based task filtering for Kanban (unchanged)
  const kanbanFilteredTasks = useMemo(() => {
    if (!currentUser) return [];

    let tasksToShow = allTasks;

    if (["admin", "super-admin"].includes(currentUser.role || userRole)) {
      tasksToShow = allTasks;
    } else if (
      (currentUser.role || userRole) === "lead" ||
      project?.categories.some((cat) =>
        cat.members.some(
          (member) =>
            member.userId._id.toString() === (currentUser?.id || currentUser?._id)?.toString() &&
            member.role === "Lead"
        )
      )
    ) {
      const userCategory = project?.categories.find((cat) =>
        cat.members.some(
          (member) =>
            member.userId._id.toString() === (currentUser?.id || currentUser?._id || "").toString()
        )
      );

      if (userCategory) {
        const categoryMemberIds = userCategory.members.map((m) => m.userId._id.toString());
        tasksToShow = allTasks.filter(
          (task) =>
            categoryMemberIds.includes(task.assignee._id.toString()) ||
            categoryMemberIds.includes(task.creator._id.toString())
        );
      }
    } else {
      tasksToShow = allTasks.filter(
        (task) =>
          task.assignee._id.toString() === (currentUser?.id || currentUser?._id || "").toString() ||
          task.creator._id.toString() === (currentUser?.id || currentUser?._id || "").toString()
      );
    }

    return tasksToShow.filter((task) => {
      const matchesSearch =
        filters.search === "" ||
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.description.toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus = filters.status === "all" || task.status === filters.status;
      const matchesPriority = filters.priority === "all" || task.priority === filters.priority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [allTasks, filters, userRole, currentUser, project]);

  const taskStats = useMemo(() => {
    const relevantTasks = ["admin", "super-admin"].includes(userRole)
      ? allTasks
      : ["lead"].includes(userRole) ||
          project?.categories.some((cat) =>
            cat.members.some(
              (member) => member.userId._id === currentUser?._id && member.role === "Lead"
            )
          )
        ? kanbanFilteredTasks
        : userTasks;

    return {
      total: relevantTasks.length,
      completed: relevantTasks.filter((t) => t.status === "done").length,
      inProgress: relevantTasks.filter((t) => t.status === "in-progress").length,
      overdue: relevantTasks.filter(
        (t) => new Date(t.dueDate) < new Date() && t.status !== "done"
      ).length,
    };
  }, [allTasks, userTasks, kanbanFilteredTasks, userRole, currentUser, project]);

  const canViewKanban = useMemo(() => {
    if (!currentUser || !project) return false;

    if (["admin", "super-admin"].includes(currentUser.role || userRole)) return true;
    if (project?.creator?._id === (currentUser.id || currentUser._id)) return true;

    return project?.categories?.some((cat) =>
      cat.members?.some((member) => {
        const memberIdStr = member.userId?._id?.toString();
        const currentUserIdStr = (currentUser?.id || currentUser?._id || "").toString();
        return memberIdStr === currentUserIdStr;
      })
    );
  }, [userRole, project, currentUser]);

  const canCreateTask = useMemo(() => {
    return (
      ["admin", "super-admin"].includes(userRole) ||
      project?.categories.some((cat) =>
        cat.members.some(
          (member) =>
            member.userId._id === currentUser?._id && ["Lead", "Member"].includes(member.role)
        )
      ) ||
      project?.creator._id === currentUser?._id
    );
  }, [userRole, project, currentUser]);

  const updateFilter = useCallback((key: keyof FilterType, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ search: "", status: "all", priority: "all" });
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

      if (!task || task.status === newStatus || !["to-do", "in-progress", "done"].includes(newStatus)) {
        return setActiveTask(null);
      }

      try {
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
    },
    [allTasks]
  );

  // All existing API functions (unchanged)
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
      const response = await fetchData(`/project/${projectId}`);
      setProject(response.project);
    } catch {
      toast.error("Project not found");
      navigate("/workspace");
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

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
      setAssignableMembers(response.members || []);
    } catch {
      toast.error("Failed to load members");
    }
  }, [projectId]);

  const handleCreateTask = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTask.title.trim() || !newTask.assigneeId || !newTask.startDate || !newTask.dueDate) {
        return toast.error("Please fill all required fields (title, assignee, start date, due date)");
      }

      const start = new Date(newTask.startDate);
      const end = new Date(newTask.dueDate);
      if (start > end) {
        return toast.error("Start date cannot be after due date");
      }

      try {
        setSubmittingTask(true);
        await postData("/task", { ...newTask, projectId });
        setShowTaskModal(false);
        setNewTask({
          title: "",
          description: "",
          status: "to-do",
          priority: "medium",
          assigneeId: "",
          startDate: "",
          dueDate: "",
        });
        await Promise.all([fetchAllTasks(), fetchUserTasks()]);
        toast.success("Task created!");
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to create task");
      } finally {
        setSubmittingTask(false);
      }
    },
    [newTask, projectId, fetchAllTasks, fetchUserTasks]
  );

  useEffect(() => {
    if (isAuthenticated && projectId) {
      Promise.all([
        fetchUserRole(),
        fetchProjectDetails(),
        fetchAllTasks(),
        fetchUserTasks(),
        fetchAssignableMembers(),
      ]);
    }
  }, [isAuthenticated, projectId]);

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

        <div className="flex items-center justify-end mb-3">
          <div className="flex gap-2">
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
                      onChange={(e) => updateFilter("search", e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Status</Label>
                    <Select
                      value={filters.status}
                      onValueChange={(value) => updateFilter("status", value)}
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
                      onValueChange={(value) => updateFilter("priority", value)}
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

            {canCreateTask && (
              <Button onClick={() => setShowTaskModal(true)} size="sm" className="h-8 px-2 bg-[#f2761b] hover:bg-[#f2761b]/90">
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">Task</span>
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-gray-900 truncate flex-1 mr-2">
              {project.title}
            </h1>
            <StatusBadge status={project.status} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-900">{project.progress}%</span>
              <Progress value={project.progress} className="w-16 h-1" />
            </div>
            <span className="text-xs text-gray-600">
              Due:{" "}
              {new Date(project.endDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* MOBILE STATS - Figma Style */}
        <div className="grid grid-cols-4 gap-2 mt-3">
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
            <TeamAvatars categories={project.categories} maxVisible={3} />

            {/* Invite Members Button */}
            <InviteMembersButton
              projectId={project._id}
              categories={project.categories}
              onInviteSuccess={fetchProjectDetails}
            />
          </div>
        </div>

        {/* Project Overview Heading */}
        <div className="mb-3">
          <h2 className="text-[18px] font-semibold font-['Inter'] text-[#040110]">
            Project Overview
          </h2>
        </div>

        {/* Three Column Layout: Metrics + Overview Panel + Attachments */}
        <div className="flex gap-4">
          {/* Left: Metric Cards (2x2 grid, 238px width = 250px * 0.95) */}
          <div className="w-[238px] flex-shrink-0">
            <div className="grid grid-cols-2 gap-3">
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

          {/* Center: Project Overview Panel (589px width = 620px * 0.95) */}
          <div className="w-[589px] mx-auto flex-shrink-0">
            <ProjectOverviewPanel
              projectManager={project.creator.name}
              description={project.description}
              startDate={project.startDate}
              endDate={project.endDate}
              status={project.status}
            />
          </div>

          {/* Right: Attachments Sidebar (238px width = 250px * 0.95) */}
          <div className="w-[238px] flex-shrink-0">
            <AttachmentsSidebar
              attachments={project.attachments || []}
              canDelete={permissions.isAdmin}
              onDelete={async (id) => {
                try {
                  await deleteData(`/project/${project._id}/attachments/${id}`);
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
                <TabsList className="grid w-full max-w-xs grid-cols-3 h-8">
                  <TabsTrigger
                    value="your-tasks"
                    className="text-xs px-2 data-[state=active]:bg-blue-600"
                  >
                    <CheckSquare className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Your</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="kanban"
                    className="text-xs px-2 data-[state=active]:bg-purple-600"
                  >
                    <KanbanSquare className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Board</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="calendar"
                    className="text-xs px-2 data-[state=active]:bg-green-600"
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    <span className="hidden sm:inline">Calendar</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* YOUR TASKS TAB */}
              <TabsContent value="your-tasks" className="space-y-3 mt-0">
                {/* DESKTOP QUICK FILTERS */}
                <div className="hidden md:block">
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
                      <Input
                        placeholder="Search your tasks..."
                        className="pl-7 h-8 text-sm"
                        value={filters.search}
                        onChange={(e) => updateFilter("search", e.target.value)}
                      />
                    </div>
                    <Select
                      value={filters.status}
                      onValueChange={(value) => updateFilter("status", value)}
                    >
                      <SelectTrigger className="w-20 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="to-do">To Do</SelectItem>
                        <SelectItem value="in-progress">Active</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={filters.priority}
                      onValueChange={(value) => updateFilter("priority", value)}
                    >
                      <SelectTrigger className="w-20 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Med</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    {(filters.search || filters.status !== "all" || filters.priority !== "all") && (
                      <Button variant="outline" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {filteredUserTasks.length === 0 ? (
                  <Card className="border-dashed border-2 border-gray-200">
                    <CardContent className="text-center py-8">
                      <CheckSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <CardTitle className="text-base mb-2">No Tasks Found</CardTitle>
                      <p className="text-sm text-gray-600 mb-3">
                        {filters.search || filters.status !== "all" || filters.priority !== "all"
                          ? "Try adjusting filters."
                          : "No tasks assigned yet."}
                      </p>
                      {canCreateTask && (
                        <Button onClick={() => setShowTaskModal(true)} size="sm" className="h-8 bg-[#f2761b] hover:bg-[#f2761b]/90">
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Create Task
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div
                    className={cn(
                      "grid gap-3 pb-16 md:pb-4",
                      isMobile ? "grid-cols-1 xs:grid-cols-2" : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    )}
                  >
                    {filteredUserTasks.map((task) => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        compact={true}
                        onClick={() => navigate(`/task/${task._id}`)}
                        currentUser={currentUser}
                        userRole={userRole}
                        onTaskUpdate={() => Promise.all([fetchAllTasks(), fetchUserTasks()])}
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
                        {currentUser ? "You are not a member of this project." : "Loading user data..."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {/* DESKTOP KANBAN FILTERS */}
                    <div className="hidden md:block">
                      <div className="flex gap-2 items-center">
                        <div className="flex-1 relative">
                          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
                          <Input
                            placeholder="Search all tasks..."
                            className="pl-7 h-8 text-sm"
                            value={filters.search}
                            onChange={(e) => updateFilter("search", e.target.value)}
                          />
                        </div>
                        <Select
                          value={filters.status}
                          onValueChange={(value) => updateFilter("status", value)}
                        >
                          <SelectTrigger className="w-20 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="to-do">To Do</SelectItem>
                            <SelectItem value="in-progress">Active</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={filters.priority}
                          onValueChange={(value) => updateFilter("priority", value)}
                        >
                          <SelectTrigger className="w-20 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Med</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        {(filters.search || filters.status !== "all" || filters.priority !== "all") && (
                          <Button variant="outline" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>

                    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                      {isMobile ? (
                        <div className="space-y-3 pb-16">
                          {["to-do", "in-progress", "done"].map((status) => {
                            const statusTasks = kanbanFilteredTasks.filter((t) => t.status === status);
                            if (statusTasks.length === 0) return null;

                            return (
                              <Card key={status} className="border-l-4 border-l-blue-400">
                                <CardHeader className="p-3 pb-2">
                                  <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold">
                                      {status === "to-do"
                                        ? "To Do"
                                        : status === "in-progress"
                                          ? "In Progress"
                                          : "Done"}
                                    </h3>
                                    <Badge variant="secondary" className="text-xs h-4 px-2">
                                      {statusTasks.length}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="p-3 pt-0">
                                  <div className="space-y-2">
                                    {statusTasks.map((task) => (
                                      <TaskCard
                                        key={task._id}
                                        task={task}
                                        compact={true}
                                        onClick={() => navigate(`/task/${task._id}`)}
                                        currentUser={currentUser}
                                        userRole={userRole}
                                        onTaskUpdate={() => Promise.all([fetchAllTasks(), fetchUserTasks()])}
                                      />
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-4 pb-4">
                          {/* TO-DO COLUMN */}
                          <DroppableColumn
                            id="to-do"
                            title="To Do"
                            count={kanbanFilteredTasks.filter((t) => t.status === "to-do").length}
                            color="bg-gray-400"
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
                                  />
                                ))}
                            </SortableContext>
                          </DroppableColumn>

                          {/* IN-PROGRESS COLUMN */}
                          <DroppableColumn
                            id="in-progress"
                            title="In Progress"
                            count={kanbanFilteredTasks.filter((t) => t.status === "in-progress").length}
                            color="bg-blue-400"
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
                                  />
                                ))}
                            </SortableContext>
                          </DroppableColumn>

                          {/* DONE COLUMN */}
                          <DroppableColumn
                            id="done"
                            title="Done"
                            count={kanbanFilteredTasks.filter((t) => t.status === "done").length}
                            color="bg-green-400"
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
                                  />
                                ))}
                            </SortableContext>
                          </DroppableColumn>
                        </div>
                      )}

                      <DragOverlay>
                        {activeTask && <TaskCard task={activeTask} compact={true} />}
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
                        {currentUser ? "You are not a member of this project." : "Loading user data..."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <CalendarViewComponent
                    tasks={kanbanFilteredTasks}
                    filters={filters}
                    updateFilter={updateFilter}
                    clearFilters={clearFilters}
                    isMobile={isMobile}
                    navigate={navigate}
                    userRole={userRole}
                    currentUser={currentUser}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
      </div>

      {/* MOBILE FAB */}
      {isMobile && canCreateTask && (
        <Button
          onClick={() => setShowTaskModal(true)}
          className="fixed bottom-4 right-4 w-11 h-11 rounded-full shadow-lg z-30 p-0 bg-[#f2761b] hover:bg-[#f2761b]/90"
        >
          <Plus className="w-5 h-5" />
        </Button>
      )}

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
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title"
                  className="h-8"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-sm">Status</Label>
                  <Select
                    value={newTask.status}
                    onValueChange={(value) => setNewTask({ ...newTask, status: value })}
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
                    onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
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
                <Label className="text-sm">Assignee *</Label>
                <Select
                  value={newTask.assigneeId}
                  onValueChange={(value) => setNewTask({ ...newTask, assigneeId: value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableMembers.map((member) => (
                      <SelectItem key={member._id} value={member._id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-4 h-4">
                            <AvatarFallback className="text-xs">{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{member.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-sm">Start Date *</Label>
                  <Input
                    type="date"
                    required
                    value={newTask.startDate}
                    onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                    className="h-8"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-sm">Due Date *</Label>
                  <Input
                    type="date"
                    required
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="h-8"
                    min={newTask.startDate || new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Description</Label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task details..."
                  rows={3}
                  className="resize-none text-sm"
                />
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
    </div>
  );
};

export default ProjectDetail;
