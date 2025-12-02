import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../../provider/auth-context";
import { fetchData, postData, putData } from "@/lib/fetch-util";
import { buildApiUrl, buildBackendUrl } from "@/lib/config";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MessageSquare,
  Send,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle,
  Circle,
  PlayCircle,
  Reply,
  ChevronDown,
  ChevronRight,
  X,
  Upload,
  File,
  Image,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
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
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { RichTextToolbar } from "@/components/ui/rich-text-toolbar";
import { AttachmentsPanel } from "@/components/task/AttachmentsPanel";
import Breadcrumb from "@/components/layout/Breadcrumb";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { ImagePreviewModal } from "@/components/ui/image-preview-modal";
import { cn } from "@/lib/utils";

interface Task {
  _id: string;
  title: string;
  description: string;
  status: "to-do" | "in-progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assignee: {
    _id: string;
    name: string;
    email: string;
  };
  creator: {
    _id: string;
    name: string;
    email: string;
  };
  project: {
    _id: string;
    title: string;
  };
  category: string;
  startDate: string;
  dueDate: string;
  durationDays?: number;
  createdAt: string;
  completedAt?: string;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: "image" | "document";
    fileSize: number;
    mimeType: string;
  }>;
  handoverNotes?: string;
  handoverAttachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: "image" | "document";
    fileSize: number;
    mimeType: string;
  }>;
  workspace?: string;
  approvalStatus?: "not-required" | "pending-approval" | "approved" | "rejected";
  completedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  approvedAt?: string;
  rejectionReason?: string;
}

interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  task: string;
  parentComment?: {
    _id: string;
    content: string;
    author: {
      _id: string;
      name: string;
      email: string;
    };
  };
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileType: "image" | "document";
    fileSize: number;
    mimeType: string;
  }>;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
  replyCount?: number;
  hasReplies?: boolean;
}

interface CommentsResponse {
  comments: Comment[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
}

// File Upload Component
const FileUpload: React.FC<{
  onFilesSelect: (files: File[]) => void;
  selectedFiles: File[];
  maxFiles?: number;
  maxFileSize?: number;
}> = ({ onFilesSelect, selectedFiles, maxFiles = 3, maxFileSize = 5 }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ];

  const handleFileSelect = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(newFiles).forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type`);
        return;
      }

      if (file.size > maxFileSize * 1024 * 1024) {
        errors.push(`${file.name}: File too large (max ${maxFileSize}MB)`);
        return;
      }

      if (selectedFiles.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      toast.error(errors.join("\n"));
    }

    if (validFiles.length > 0) {
      onFilesSelect([...selectedFiles, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    onFilesSelect(newFiles);
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isImage = (file: File) => file.type.startsWith("image/");

  return (
    <div className="w-full">
      {selectedFiles.length > 0 && (
        <div className="mb-3 space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                {isImage(file) ? (
                  <Image className="w-4 h-4 text-blue-500" />
                ) : (
                  <File className="w-4 h-4 text-gray-500" />
                )}
                <div>
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="p-1 h-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={allowedTypes.join(",")}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {selectedFiles.length < maxFiles && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-8 text-xs"
        >
          <Upload className="w-3 h-3 mr-1" />
          Attach Files ({selectedFiles.length}/{maxFiles})
        </Button>
      )}
    </div>
  );
};

// File Preview Component
const FilePreview: React.FC<{
  attachments: Comment["attachments"];
  canDelete?: boolean;
  onDelete?: (index: number) => void;
}> = ({ attachments, canDelete = false, onDelete }) => {
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.includes("word")) return "📝";
    if (mimeType.includes("sheet")) return "📊";
    return "📁";
  };

  const downloadFile = (attachment: any) => {
    window.open(buildBackendUrl(attachment.fileUrl), '_blank');
  };

  const openImagePreview = (index: number) => {
    // Only open modal if index is valid
    if (index >= 0) {
      setPreviewImageIndex(index);
      setPreviewModalOpen(true);
    }
  };

  if (!attachments || attachments.length === 0) return null;

  // Separate images and documents
  const imageAttachments = attachments.filter(a => a.fileType === "image");

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment, index) => (
        <div key={index} className="relative">
          {attachment.fileType === "image" ? (
            <div className="relative group">
              <img
                src={buildBackendUrl(attachment.fileUrl)}
                alt={attachment.fileName}
                className="rounded max-h-32 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => {
                  const imageIndex = imageAttachments.findIndex(
                    img => img.fileUrl === attachment.fileUrl
                  );
                  openImagePreview(imageIndex);
                }}
              />
              <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1.5 rounded flex items-center justify-between">
                <span className="truncate">{attachment.fileName}</span>
                <div className="flex gap-1 ml-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      const imageIndex = imageAttachments.findIndex(
                        img => img.fileUrl === attachment.fileUrl
                      );
                      openImagePreview(imageIndex);
                    }}
                    className="h-5 w-5 p-0 hover:bg-white/20"
                  >
                    <span className="w-3 h-3 text-white">👁</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFile(attachment);
                    }}
                    className="h-5 w-5 p-0 hover:bg-white/20"
                  >
                    <Download className="w-3 h-3 text-white" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded border text-xs hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <span className="text-lg flex-shrink-0">
                  {getFileIcon(attachment.mimeType)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{attachment.fileName}</div>
                  <div className="text-gray-500">
                    {formatFileSize(attachment.fileSize)}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadFile(attachment)}
                className="h-7 px-2 ml-2 flex-shrink-0"
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* Enhanced Image Preview Modal */}
      {imageAttachments.length > 0 && (
        <ImagePreviewModal
          images={imageAttachments}
          initialIndex={previewImageIndex}
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
        />
      )}
    </div>
  );
};

// Chat Message Component
const ChatMessage: React.FC<{
  comment: Comment;
  currentUser: any;
  canReply: boolean;
  canEdit: boolean;
  canDelete: boolean;
  replies?: Comment[];
  isExpanded?: boolean;
  onReply: (comment: Comment) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onToggleExpand: (commentId: string) => void;
  onLoadReplies?: (commentId: string) => void;
}> = ({
  comment,
  currentUser,
  canReply,
  canEdit,
  canDelete,
  replies = [],
  isExpanded = false,
  onReply,
  onEdit,
  onDelete,
  onToggleExpand,
  onLoadReplies,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isOwnMessage = comment.author._id === currentUser._id;
  const hasReplies = (comment.replyCount ?? 0) > 0;

  const handleEdit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit(comment._id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleToggleExpand = () => {
    if (hasReplies && !isExpanded && replies.length === 0 && onLoadReplies) {
      onLoadReplies(comment._id);
    }
    onToggleExpand(comment._id);
  };

  return (
    <div className="group">
      <div
        className={`flex space-x-2 p-2 rounded hover:bg-gray-50 ${
          isOwnMessage ? "bg-blue-50" : "bg-white"
        }`}
      >
        <Avatar className="w-6 h-6 flex-shrink-0 mt-1">
          <AvatarFallback className="text-xs">
            {comment.author.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-xs">{comment.author.name}</span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
              })}
              {comment.isEdited && <span className="ml-1">(edited)</span>}
            </span>
          </div>

          {comment.parentComment && (
            <div className="mb-2 p-2 bg-gray-100 rounded border-l-2 border-gray-300">
              <div className="text-xs text-gray-600">
                Replying to{" "}
                <span className="font-medium">
                  {comment.parentComment.author.name}
                </span>
              </div>
              <div className="text-xs text-gray-700 truncate">
                {comment.parentComment.content.length > 30
                  ? `${comment.parentComment.content.substring(0, 30)}...`
                  : comment.parentComment.content}
              </div>
            </div>
          )}

          {isEditing ? (
            <div className="mb-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="text-xs p-2 border rounded resize-none"
                rows={2}
              />
              <div className="flex space-x-2 mt-1">
                <Button
                  size="sm"
                  onClick={handleEdit}
                  className="h-6 px-2 text-xs"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="h-6 px-2 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-900 mb-1 whitespace-pre-wrap">
              {comment.content}
            </div>
          )}

          {comment.attachments && comment.attachments.length > 0 && (
            <FilePreview attachments={comment.attachments} />
          )}

          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {canReply && (
              <button
                onClick={() => onReply(comment)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
              >
                <Reply className="w-3 h-3" />
                Reply
              </button>
            )}
            {canEdit && isOwnMessage && !isEditing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="text-xs h-5 px-1"
              >
                <Edit3 className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
            {canDelete && isOwnMessage && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(comment._id)}
                className="text-xs h-5 px-1 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            )}
          </div>

          {hasReplies && (
  <div className="mt-2">
    <button
      onClick={handleToggleExpand}
      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
    >
      {isExpanded ? (
        <ChevronDown className="w-3 h-3" />
      ) : (
        <ChevronRight className="w-3 h-3" />
      )}
      <AvatarGroup
        users={replies.length > 0 ? replies.slice(0, 3).map(r => r.author) : [
          { _id: '1', name: 'User 1' },
          { _id: '2', name: 'User 2' }
        ]}
        count={comment.replyCount || 0}
        countLabel="replies"
        size="sm"
      />
    </button>
  </div>
)}

        </div>
      </div>

      {hasReplies && isExpanded && (
        <div className="ml-8 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
          {replies.map((reply) => (
            <ChatMessage
              key={reply._id}
              comment={reply}
              currentUser={currentUser}
              canReply={canReply}
              canEdit={canEdit}
              canDelete={canDelete}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleExpand={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TaskDetail = () => {
  const { id: taskId } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");
  const handoverTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [handoverFiles, setHandoverFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingHandover, setSavingHandover] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // New chat-related states
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(
    new Set()
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replies, setReplies] = useState<Record<string, Comment[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Approval workflow states
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // ✅ NEW: Enhanced rejection states with date selection
  const [rejectStartDate, setRejectStartDate] = useState("");
  const [rejectDueDate, setRejectDueDate] = useState("");
  const [rejectReassigneeId, setRejectReassigneeId] = useState("");
  const [rejectProjectStart, setRejectProjectStart] = useState<Date | null>(null);
  const [rejectProjectEnd, setRejectProjectEnd] = useState<Date | null>(null);

  // ✅ NEW: Reassignment modal states
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [reassignAssigneeId, setReassignAssigneeId] = useState("");
  const [reassignStartDate, setReassignStartDate] = useState("");
  const [reassignDueDate, setReassignDueDate] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignProjectStart, setReassignProjectStart] = useState<Date | null>(null);
  const [reassignProjectEnd, setReassignProjectEnd] = useState<Date | null>(null);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [showCreateSubtask, setShowCreateSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskDescription, setSubtaskDescription] = useState("");
  const [subtaskAssigneeId, setSubtaskAssigneeId] = useState("");
  const [subtaskPriority, setSubtaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [subtaskStartDate, setSubtaskStartDate] = useState<string>("");
  const [subtaskEndDate, setSubtaskEndDate] = useState<string>("");
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false); // ✅ NEW: Loading state for subtask creation
  const [isChangingStatus, setIsChangingStatus] = useState(false); // ✅ NEW: Loading state for status changes

  // ✅ NEW: Fetch assignable members for reassignment
  const [assignableMembers, setAssignableMembers] = useState<any[]>([]);

  // ✅ NEW: Assign task modal for unassigned tasks
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);
  const [assignTaskAssigneeId, setAssignTaskAssigneeId] = useState("");
  const [isAssigningTask, setIsAssigningTask] = useState(false);

  // ✅ NEW: Check if task and related resources exist before allowing access
  const checkResourceExistence = async (taskId: string) => {
    try {
      // First check if task exists
      const taskResponse = await fetch(
        buildApiUrl(`/task/${taskId}/exists`),
        {
          credentials: 'include',
          headers: {
            "Content-Type": "application/json",
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
        }
      );

      if (!taskResponse.ok) {
        if (taskResponse.status === 404) {
          toast.error("This task has been deleted or no longer exists");
          return false;
        } else if (taskResponse.status === 403) {
          toast.error("You don't have permission to access this task");
          return false;
        }
      }

      // If task exists, check if it's archived by fetching full task details
      try {
        const taskDetailsResponse = await fetch(
          buildApiUrl(`/task/${taskId}`),
          {
            credentials: 'include',
            headers: {
              "Content-Type": "application/json",
              "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
            },
          }
        );
        
        if (taskDetailsResponse.ok) {
          const taskData = await taskDetailsResponse.json();
          if (taskData.task?.isArchived) {
            toast.error("This task has been archived");
            return false;
          }
          if (taskData.task?.deletedAt) {
            toast.error("This task has been deleted");
            return false;
          }
        }
      } catch (detailError) {
        console.error("Error fetching task details:", detailError);
        // Continue even if detail fetch fails, as existence check passed
      }

      // If task exists, check if workspace still exists
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
      toast.error("Unable to verify task access");
      return false;
    }
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetchData("/auth/me");
        setCurrentUser(response.user);
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    };

    if (!user && !authLoading) {
      fetchCurrentUser();
    }
  }, [user, authLoading]);

  const activeUser = user || currentUser;

  useEffect(() => {
    if (taskId && !authLoading) {
      fetchTaskDetails();
      fetchComments();
      fetchSubtasks();
    }
  }, [taskId, authLoading]);

  // ✅ NEW: Fetch assignable members when task is loaded
  useEffect(() => {
    const fetchAssignableMembers = async () => {
      if (!task?.project?._id) return;
      try {
        const response = await fetchData(`/task/project/${task.project._id}/members`);
        setAssignableMembers(response.members || []);
      } catch (error) {
        console.error("Failed to fetch assignable members:", error);
      }
    };

    if (task?.project?._id) {
      fetchAssignableMembers();
    }
  }, [task?.project?._id]);

  useEffect(() => {
    if (task) {
      setHandoverNotes(task.handoverNotes || "");
    }
  }, [task]);

  // Real-time polling
  useEffect(() => {
    const interval = setInterval(() => {
      if (task?._id) {
        fetchComments();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [task?._id]);

  const fetchTaskDetails = async () => {
    if (!taskId) {
      setLoading(false);
      return;
    }

    try {
      // console.log("Fetching task details for ID:", taskId);
      // Use direct fetch with cookie-based authentication
      const response = await fetch(
        buildApiUrl(`/task/${taskId}`),
        {
          credentials: 'include', // Send HTTP-only cookies
          headers: {
            "Content-Type": "application/json",
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data || !data.task) {
        throw new Error("Task not found in response");
      }

      setTask(data.task);
      
      // ✅ NEW: Show assign task modal if task is unassigned
      if (!data.task.assignee) {
        setShowAssignTaskModal(true);
      }
    } catch (error) {
      console.error("Failed to fetch task details:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("403")) {
        toast.error("You don't have permission to view this task");
      } else if (errorMessage.includes("404")) {
        // Check if task exists when we get a 404
        await checkResourceExistence(taskId);
      } else {
        toast.error("Failed to load task details");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      // console.log("Fetching comments for task:", taskId);
      const response = await fetch(
        buildApiUrl(`/comments/task/${taskId}`),
        {
          credentials: 'include', // Send HTTP-only cookies
          headers: {
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // console.log("Comments fetched:", data);
        setComments(data.comments || []);
      } else {
        console.error(
          "Failed to fetch comments:",
          response.status,
          response.statusText
        );
        const errorData = await response.json().catch(() => ({}));
        console.error("Error details:", errorData);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    }
  };

  // Subtasks helpers
  const fetchSubtasks = async () => {
    if (!taskId) return;
    try {
      const res = await fetch(
        buildApiUrl(`/task/${taskId}/subtasks`),
        { credentials: "include", headers: { "workspace-id": localStorage.getItem("currentWorkspaceId") || "" } }
      );
      if (res.ok) {
        const data = await res.json();
        setSubtasks(data.subtasks || []);
      }
    } catch (e) {}
  };

  const handleCreateSubtask = async () => {
    if (!subtaskTitle) {
      toast.error("Subtask title is required");
      return;
    }

    // Date validation
    if (subtaskStartDate && subtaskEndDate) {
      const startDate = new Date(subtaskStartDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(subtaskEndDate);
      endDate.setHours(0, 0, 0, 0);

      if (startDate > endDate) {
        toast.error("End date must be after or equal to start date");
        return;
      }

      // Check if dates are within parent task date range (inclusive of task start and end dates)
      if (task) {
        const taskStartDate = new Date(task.startDate);
        taskStartDate.setHours(0, 0, 0, 0);
        const taskDueDate = new Date(task.dueDate);
        taskDueDate.setHours(0, 0, 0, 0);

        if (startDate < taskStartDate || endDate > taskDueDate) {
          toast.error("Subtask dates must be within the parent task date range (including task start and end dates)");
          return;
        }
      }
    }

    // ✅ NEW: Set loading state to prevent multiple submissions
    setIsCreatingSubtask(true);

    try {
      const res = await fetch(buildApiUrl(`/task/${taskId}/subtasks`), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
        },
        body: JSON.stringify({
          title: subtaskTitle,
          description: subtaskDescription,
          assigneeId: subtaskAssigneeId || undefined,
          priority: subtaskPriority,
          startDate: subtaskStartDate || undefined,
          dueDate: subtaskEndDate || undefined,
          approvalStatus: "pending-approval", // Subtasks require TL approval
        }),
      });
      if (res.ok) {
        toast.success("Subtask created");
        setShowCreateSubtask(false);
        setSubtaskTitle("");
        setSubtaskDescription("");
        setSubtaskAssigneeId("");
        setSubtaskStartDate("");
        setSubtaskEndDate("");
        setSubtaskPriority("medium");
        fetchSubtasks();
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Subtask creation error:', errorData);
        toast.error(errorData.message || 'Failed to create subtask');
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to create subtask");
    } finally {
      // ✅ NEW: Always reset loading state
      setIsCreatingSubtask(false);
    }
  };

  // In the TaskDetail component, add after fetchComments:
  useEffect(() => {
    // console.log("Comments state updated:", comments);
    // console.log("Comments length:", comments?.length);
  }, [comments]);

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;

    // Prevent multiple concurrent status changes
    if (isChangingStatus) {
      toast.error("Status change already in progress");
      return;
    }

    if (task.approvalStatus === "approved") {
      toast.error("Approved tasks are locked and cannot change status");
      return;
    }

    // Check if this is a subtask that requires approval before being marked as done
    if (newStatus === "done" && task.approvalStatus === "pending-approval") {
      toast.error("This subtask must be approved by a TL before it can be marked as done");
      return;
    }

    // Check if all subtasks are done before allowing parent task to be marked as done
    if (newStatus === "done" && subtasks.length > 0) {
      const allSubtasksDone = subtasks.every(subtask => subtask.status === "done");
      if (!allSubtasksDone) {
        toast.error("All subtasks must be completed before marking this task as done");
        return;
      }
    }

    try {
      setIsChangingStatus(true);
      await postData(`/task/${taskId}/status`, { status: newStatus });
      setTask({ ...task, status: newStatus as any });
      toast.success("Task status updated");
    } catch (error) {
      console.error("Failed to update task status:", error);
      toast.error("Failed to update task status");
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleSaveHandoverNotes = async () => {
    if (!task) return;
    if (!handoverNotes.trim() && handoverFiles.length === 0) {
      toast.error("Please add notes or attach files");
      return;
    }

    try {
      setSavingHandover(true);

      // Use FormData to support file uploads
      const formData = new FormData();
      formData.append("handoverNotes", handoverNotes);

      // Append files
      handoverFiles.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await fetch(buildApiUrl(`/task/${task._id}/handover`), {
        method: "PATCH",
        credentials: "include",
        headers: {
          "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
        },
        body: formData,
      });

      if (!response.ok) {
        // Try to get the backend error message
        let errorMessage = "Failed to save handover notes";
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // Fallback to response status text if JSON parsing fails
          errorMessage = response.statusText || "Failed to save handover notes";
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      toast.success("Handover notes saved successfully");

      // Update task with new data
      setTask({
        ...task,
        handoverNotes,
        handoverAttachments: data.task?.handoverAttachments || task.handoverAttachments
      });

      // Clear files after successful upload
      setHandoverFiles([]);

      // Refresh task details to get updated attachments
      await fetchTaskDetails();
    } catch (error) {
      console.error("Failed to save handover notes:", error);
      // Try to extract the backend error message
      let errorMessage = "Failed to save handover notes";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      toast.error(errorMessage);
    } finally {
      setSavingHandover(false);
    }
  };

  const handleDeleteAttachment = async (index: number) => {
    if (!task || !task.handoverAttachments) return;

    const attachment = task.handoverAttachments[index];

    // Validate index
    if (!attachment) {
      toast.error("Attachment not found");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${attachment.fileName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Send request to backend to delete the attachment
      const response = await fetch(
        buildApiUrl(`/task/${task._id}/handover/attachment/${index}`),
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
        }
      );

      if (!response.ok) {
        // If endpoint doesn't exist, handle client-side deletion
        const updatedAttachments = task.handoverAttachments.filter((_, i) => i !== index);
        setTask({
          ...task,
          handoverAttachments: updatedAttachments,
        });
        toast.success("Attachment removed");
      } else {
        toast.success("Attachment deleted successfully");
        // Refresh task details
        await fetchTaskDetails();
      }
    } catch (error) {
      console.error("Failed to delete attachment:", error);
      // Fallback to client-side deletion
      const updatedAttachments = task.handoverAttachments.filter((_, i) => i !== index);
      setTask({
        ...task,
        handoverAttachments: updatedAttachments,
      });
      toast.success("Attachment removed");
    }
  };

  const handleApproveTask = async () => {
    if (!task) return;

    try {
      setIsApproving(true);
      await postData(`/task/${task._id}/approve`, {});
      toast.success("Task approved successfully");
      // Refresh task details
      await fetchTaskDetails();
    } catch (error: any) {
      console.error("Failed to approve task:", error);
      toast.error(error.message || "Failed to approve task");
    } finally {
      setIsApproving(false);
    }
  };

  // ✅ ENHANCED: Reject task with new due date and optional reassignment (start date unchanged)
  const handleRejectTask = async () => {
    if (!task) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    if (!rejectDueDate) {
      toast.error("Please provide a new due date");
      return;
    }

    const d = new Date(rejectDueDate);
    d.setHours(0,0,0,0);

    // Validate due date is not before current start date (which remains unchanged)
    if (rejectStartDate) {
      const s = new Date(rejectStartDate);
      s.setHours(0,0,0,0);
      if (d < s) {
        toast.error("Due date cannot be before the task start date");
        return;
      }
    }

    if (rejectProjectEnd) {
      const pePlusOne = new Date(rejectProjectEnd);
      pePlusOne.setDate(pePlusOne.getDate() + 1);
      if (d.getTime() >= pePlusOne.getTime()) {
        toast.error("Due date cannot be after project end date");
        return;
      }
    }

    try {
      setIsRejecting(true);
      await postData(`/task/${task._id}/reject`, {
        reason: rejectionReason,
        newDueDate: rejectDueDate,
        reassigneeId: rejectReassigneeId || undefined
      });
      toast.success("Task rejected with new due date");
      setShowRejectDialog(false);
      setRejectionReason("");
      setRejectStartDate("");
      setRejectDueDate("");
      setRejectReassigneeId("");
      // Refresh task details
      await fetchTaskDetails();
    } catch (error: any) {
      console.error("Failed to reject task:", error);
      toast.error(error.message || "Failed to reject task");
    } finally {
      setIsRejecting(false);
    }
  };

  // ✅ NEW: Reassign approved task (start date unchanged)
  const handleReassignTask = async () => {
    if (!task) return;
    if (!reassignAssigneeId) {
      toast.error("Please select an assignee");
      return;
    }
    if (!reassignDueDate) {
      toast.error("Please provide a due date");
      return;
    }

    const d = new Date(reassignDueDate);
    d.setHours(0,0,0,0);

    // Validate due date is not before current start date (which remains unchanged)
    if (reassignStartDate) {
      const s = new Date(reassignStartDate);
      s.setHours(0,0,0,0);
      if (d < s) {
        toast.error("Due date cannot be before the task start date");
        return;
      }
    }

    if (reassignProjectEnd) {
      const pePlusOne = new Date(reassignProjectEnd);
      pePlusOne.setDate(pePlusOne.getDate() + 1);
      if (d.getTime() >= pePlusOne.getTime()) {
        toast.error("Due date cannot be after project end date");
        return;
      }
    }

    try {
      setIsReassigning(true);
      const me = activeUser;
      const meIdStr = (me?.id || me?._id || "").toString();
      const isAdminOrHead = !!me && (["super_admin", "admin"].includes(me.role) || ((task.project as any)?.projectHead?._id?.toString() === meIdStr));
      const isApproved = task.approvalStatus === "approved";
      if (isAdminOrHead && isApproved) {
        await postData(`/task/${task._id}/reassign`, {
          assigneeId: reassignAssigneeId,
          dueDate: reassignDueDate
        });
      } else {
        await putData(`/task/${task._id}`, {
          assigneeId: reassignAssigneeId,
          dueDate: reassignDueDate
        });
      }
      toast.success("Task reassigned successfully");
      setShowReassignDialog(false);
      setReassignAssigneeId("");
      setReassignStartDate("");
      setReassignDueDate("");
      // Refresh task details
      await fetchTaskDetails();
    } catch (error: any) {
      console.error("Failed to reassign task:", error);
      toast.error(error.message || "Failed to reassign task");
    } finally {
      setIsReassigning(false);
    }
  };

  // ✅ NEW: Assign unassigned task
  const handleAssignTask = async () => {
    if (!task) return;
    if (!assignTaskAssigneeId) {
      toast.error("Please select an assignee");
      return;
    }

    try {
      setIsAssigningTask(true);
      await putData(`/task/${task._id}`, {
        assigneeId: assignTaskAssigneeId
      });
      toast.success("Task assigned successfully");
      setShowAssignTaskModal(false);
      setAssignTaskAssigneeId("");
      // Refresh task details
      await fetchTaskDetails();
    } catch (error: any) {
      console.error("Failed to assign task:", error);
      toast.error(error.message || "Failed to assign task");
    } finally {
      setIsAssigningTask(false);
    }
  };

  const canApproveTask = () => {
    const me = activeUser;
    if (!me || !task) return false;

    // Check if user is admin or super admin (aligned with backend)
    if (["super_admin", "admin"].includes(me.role)) return true;

    // Check if user is project head
    const meIdStr = (me.id || me._id || "").toString();
    const projectHeadId = (task.project as any)?.projectHead?._id?.toString();

    if (projectHeadId && meIdStr === projectHeadId) return true;

    // TL can approve trainee's task: if assignee is in assignableMembers as trainee
    const isAssigneeTraineeOfMe = (assignableMembers || []).some(
      (m) => (m._id || "").toString() === (task.assignee?._id || "").toString() && (m.role || "") === "trainee"
    );
    if (isAssigneeTraineeOfMe && task.approvalStatus === "pending-approval") return true;

    return false;
  };

  // ✅ NEW: Check if user can reassign tasks (only admin and project lead)
  const canReassignTask = () => {
    const me = activeUser;
    if (!me || !task) return false;

    // Check if user is admin or super admin
    if (["super_admin", "admin"].includes(me.role)) return true;

    // Check if user is project head
    const meIdStr = (me.id || me._id || "").toString();
    const projectHeadId = (task.project as any)?.projectHead?._id?.toString();

    if (projectHeadId && meIdStr === projectHeadId) return true;

    return false;
  };

  // ✅ NEW: Pre-fill rejection modal with current task dates
  const openRejectDialog = () => {
    if (task) {
      setRejectStartDate(new Date(task.startDate).toISOString().split('T')[0]);
      setRejectDueDate(new Date(task.dueDate).toISOString().split('T')[0]);
      setRejectReassigneeId(task.assignee?._id || "");
    }
    setShowRejectDialog(true);
  };

  useEffect(() => {
    const fetchProjectBounds = async () => {
      if (!showRejectDialog || !task?.project?._id) return;
      try {
        const res = await fetchData(`/projects/${(task.project as any)._id}`);
        const ps = new Date(res.project.startDate);
        const pe = new Date(res.project.endDate);
        ps.setHours(0, 0, 0, 0);
        pe.setHours(0, 0, 0, 0);
        setRejectProjectStart(ps);
        setRejectProjectEnd(pe);
      } catch {}
    };
    fetchProjectBounds();
  }, [showRejectDialog, task?.project?._id]);

  // ✅ NEW: Pre-fill reassignment modal with current task dates
  const openReassignDialog = () => {
    if (task) {
      setReassignStartDate(new Date(task.startDate).toISOString().split('T')[0]);
      setReassignDueDate(new Date(task.dueDate).toISOString().split('T')[0]);
      setReassignAssigneeId(task.assignee?._id || "");
    }
    setShowReassignDialog(true);
  };

  useEffect(() => {
    const fetchReassignBounds = async () => {
      if (!showReassignDialog || !task?.project?._id) return;
      try {
        const res = await fetchData(`/projects/${(task.project as any)._id}`);
        const ps = new Date(res.project.startDate);
        const pe = new Date(res.project.endDate);
        ps.setHours(0, 0, 0, 0);
        pe.setHours(0, 0, 0, 0);
        setReassignProjectStart(ps);
        setReassignProjectEnd(pe);
      } catch {}
    };
    fetchReassignBounds();
  }, [showReassignDialog, task?.project?._id]);

  const canDeleteAttachments = () => {
    const me = activeUser;
    if (!me || !task) return false;
    if (task.approvalStatus === "approved") return false;
    // Allow deletion if user is the assignee, admin, or super_admin
    if (["super_admin", "admin"].includes(me.role)) return true;
    // Check if assignee exists before accessing _id
    if (!task.assignee) return false;
    return task.assignee._id === me._id;
  };

  // Permission functions for task attachments (creation attachments)
  const canUploadAttachments = () => {
    const me = activeUser;
    if (!me || !task) return false;
    if (task.approvalStatus === "approved") return false;
    // Only admin, super_admin, or project head can upload task attachments
    if (["super_admin", "admin"].includes(me.role)) return true;
    const meIdStr = (me.id || me._id || "").toString();
    const projectHeadId = (task.project as any)?.projectHead?._id?.toString();
    return Boolean(projectHeadId && meIdStr === projectHeadId);
  };

  const canDeleteTaskAttachments = () => {
    const me = activeUser;
    if (!me || !task) return false;
    if (task.approvalStatus === "approved") return false;
    // Only admin, super_admin, or project head can delete task attachments
    if (["super_admin", "admin"].includes(me.role)) return true;
    const meIdStr = (me.id || me._id || "").toString();
    const projectHeadId = (task.project as any)?.projectHead?._id?.toString();
    return Boolean(projectHeadId && meIdStr === projectHeadId);
  };

  const handleUploadTaskAttachments = async (files: File[]) => {
    if (!task) return;

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await fetch(
        buildApiUrl(`/task/${task._id}/attachments`),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload attachments");
      }

      toast.success("Attachments uploaded successfully");
      await fetchTaskDetails();
    } catch (error: any) {
      console.error("Failed to upload attachments:", error);
      toast.error(error.message || "Failed to upload attachments");
    }
  };

  const handleDeleteTaskAttachment = async (index: number) => {
    if (!task || !task.attachments) return;

    const attachment = task.attachments[index];
    if (!attachment) {
      toast.error("Attachment not found");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${attachment.fileName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(
        buildApiUrl(`/task/${task._id}/attachments/${index}`),
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete attachment");
      }

      toast.success("Attachment deleted successfully");
      await fetchTaskDetails();
    } catch (error) {
      console.error("Failed to delete attachment:", error);
      toast.error("Failed to delete attachment");
    }
  };

  // Chat functions - Simplified: Anyone who can view the task can comment
  const canComment = () => {
    // If user can see the task, they can comment
    // Task visibility is already controlled by backend permissions
    if (!activeUser || !task) return false;
    if (task.approvalStatus === "approved") return false;
    return true;
  };

  const canReply = () => {
    // Same logic as canComment - anyone who can see the task can reply
    if (!currentUser || !task) return false;
    if (task.approvalStatus === "approved") return false;
    return true;
  };

  const handleReply = (comment: Comment) => {
    if (!canReply()) return;
    setReplyingTo(comment);
    setTimeout(() => {
      document.getElementById("comment-input")?.focus();
    }, 100);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setSelectedFiles([]);
  };

  const toggleThread = (commentId: string) => {
    const newExpanded = new Set(expandedThreads);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedThreads(newExpanded);
  };

  const loadReplies = async (commentId: string) => {
    try {
      const response = await fetch(
        buildApiUrl(`/comments/${commentId}/replies`),
        {
          credentials: 'include',
          headers: {
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReplies((prev) => ({
          ...prev,
          [commentId]: data.replies,
        }));
      }
    } catch (error) {
      console.error("Error loading replies:", error);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() && selectedFiles.length === 0) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("content", newComment.trim() || "File attachment");
      formData.append("taskId", task!._id);

      if (replyingTo) {
        formData.append("parentCommentId", replyingTo._id);
      }

      selectedFiles.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await fetch(buildApiUrl(`/comments`), {
        method: "POST",
        credentials: 'include',
        headers: {
          "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
        },
        body: formData,
      });

      if (response.ok) {
        setNewComment("");
        setSelectedFiles([]);
        setReplyingTo(null);
        fetchComments();
        toast.success(
          replyingTo
            ? "Reply posted successfully"
            : "Comment posted successfully"
        );
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to post comment");
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string, content: string) => {
    try {
      const response = await fetch(
        buildApiUrl(`/comments/${commentId}`),
        {
          method: "PUT",
          credentials: 'include',
          headers: {
            "Content-Type": "application/json",
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
          body: JSON.stringify({ content }),
        }
      );

      if (response.ok) {
        fetchComments();
        toast.success("Comment updated successfully");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update comment");
      }
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error("Failed to update comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const response = await fetch(
        buildApiUrl(`/comments/${commentId}`),
        {
          method: "DELETE",
          credentials: 'include',
          headers: {
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
        }
      );

      if (response.ok) {
        fetchComments();
        toast.success("Comment deleted successfully");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete comment");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  // Keep existing comment functions for backward compatibility
  const handleSubmitCommentOld = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      await postData(`/comments/task/${taskId}`, { content: newComment });
      setNewComment("");
      await fetchComments();
      toast.success("Comment added");
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditCommentOld = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await postData(`/comments/${commentId}`, {
        content: editContent,
        method: "PUT",
      });
      setEditingComment(null);
      setEditContent("");
      await fetchComments();
      toast.success("Comment updated");
    } catch (error) {
      console.error("Failed to update comment:", error);
      toast.error("Failed to update comment");
    }
  };

  const handleDeleteCommentOld = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      const response = await fetch(
        buildApiUrl(`/comments/${commentId}`),
        {
          method: "DELETE",
          credentials: 'include',
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        await fetchComments();
        toast.success("Comment deleted");
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCommentTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "in-progress":
        return <PlayCircle className="w-4 h-4 text-blue-600" />;
      case "to-do":
        return <Circle className="w-4 h-4 text-gray-600" />;
      default:
        return <Circle className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading || authLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Task Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The task you're looking for doesn't exist or you don't have access.
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  // ✅ NEW: Block access to unassigned tasks - show only modal
  if (!task.assignee && showAssignTaskModal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Task Not Assigned
          </h2>
          <p className="text-gray-600 mb-6">
            This task needs to be assigned before you can access it.
          </p>
          <p className="text-sm text-gray-500">
            Please complete the assignment modal to proceed.
          </p>
        </div>
        {/* Assign Task Modal */}
        <Dialog open={showAssignTaskModal} onOpenChange={setShowAssignTaskModal}>
          <DialogContent className="sm:max-w-lg" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-blue-600" />
                <span>Assign Task</span>
              </DialogTitle>
              <DialogDescription>
                This task is currently unassigned. Please assign it to a team member before proceeding.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  Assign To <span className="text-red-500">*</span>
                </label>
                <Select value={assignTaskAssigneeId} onValueChange={setAssignTaskAssigneeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableMembers.map((member) => (
                      <SelectItem key={member._id} value={member._id}>
                        {member.name} {member.role === 'project-head' && '(Project Head)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignTaskModal(false);
                  navigate(-1);
                }}
                disabled={isAssigningTask}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignTask}
                disabled={isAssigningTask || !assignTaskAssigneeId}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isAssigningTask ? "Assigning..." : "Assign Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Breadcrumb
            items={[
              {
                label: "Workspace",
                icon: (
                  <img
                    src="/assets/84789fe1294f4eedc3013b31bb79e7394bd87fab.svg"
                    alt="Workspace"
                    className="w-[20px] h-[20px]"
                  />
                ),
                href: "/workspace",
                isActive: false,
              },
              {
                label: "Project Detail",
                icon: (
                  <img
                    src="/assets/folder-project-icon.svg"
                    alt="Project"
                    className="w-[20px] h-[20px]"
                  />
                ),
                href: task ? `/project/${task.project._id}` : undefined,
                isActive: false,
              },
              {
                label: "Task Details",
                icon: (
                  <svg
                    className="w-[20px] h-[20px]"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6 10L9 13L14 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <rect
                      x="3"
                      y="3"
                      width="14"
                      height="14"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                    />
                  </svg>
                ),
                isActive: true,
              },
            ]}
          />
        </div>

        {/* Header */}
        <div className="mb-8">

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-[29px] font-bold text-[#040110] mb-2 leading-tight">
                {task.title}
              </h1>
              <p className="text-[16px] text-[#717182]">
                Complete project profile including milestones and task details
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* <Badge
                variant="outline"
                className={getPriorityColor(task.priority)}
              >
                {task.priority} priority
              </Badge> */}

              {task.approvalStatus && task.approvalStatus !== "not-required" && (
                <Badge
                  variant="outline"
                  className={
                    task.approvalStatus === "pending-approval"
                      ? "bg-orange-100 text-orange-800 border-orange-200"
                      : task.approvalStatus === "approved"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-red-100 text-red-800 border-red-200"
                  }
                >
                  {task.approvalStatus === "pending-approval" && "Pending Approval"}
                  {task.approvalStatus === "approved" && "Approved"}
                  {task.approvalStatus === "rejected" && "Rejected"}
                </Badge>
              )}

              {task.status === "done" && task.approvalStatus === "pending-approval" && canApproveTask() && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="h-auto rounded-[6px] bg-[#f5f4f9] text-[#717182] hover:bg-[#e5e4e9] px-[10px] py-[6px] flex items-center gap-[6px]"
                    >
                      Review
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuItem
                      onClick={handleApproveTask}
                      disabled={isApproving}
                      className="cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                      {isApproving ? "Approving..." : "Approve Task"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={openRejectDialog}
                      disabled={isRejecting}
                      variant="destructive"
                      className="cursor-pointer"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject Task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* ✅ NEW: Reassign button for approved tasks */}
              {canReassignTask() && (
                <Button
                  size="sm"
                  onClick={openReassignDialog}
                  disabled={isReassigning}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Reassign Task
                </Button>
              )}

              {(() => {
                const member = assignableMembers.find((m:any) => m._id === task?.assignee?._id);
                const isTLAssignee = member && (member.role || 'member') === 'tl' && task?.assignee?._id === (activeUser?._id || activeUser?.id);
                return isTLAssignee;
              })() && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowCreateSubtask(true)}
                  className="ml-2"
                >
                  Create Subtask
                </Button>
              )}

              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger className={cn("w-40", (task.approvalStatus === "approved" || isChangingStatus) ? "opacity-50 cursor-not-allowed" : "")} disabled={task.approvalStatus === "approved" || isChangingStatus}>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(task.status)}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to-do">
                    <div className="flex items-center space-x-2">
                      {/* <Circle className="w-4 h-4 text-gray-600" /> */}
                      <span>To Do</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="in-progress">
                    <div className="flex items-center space-x-2">
                      {/* <PlayCircle className="w-4 h-4 text-blue-600" /> */}
                      <span>In Progress</span>
                    </div>
                  </SelectItem>
                  <SelectItem 
                    value="done" 
                    disabled={
                      (subtasks.length > 0 && !subtasks.every(subtask => subtask.status === "done")) ||
                      (task.approvalStatus === "pending-approval")
                    }
                    className={
                      (subtasks.length > 0 && !subtasks.every(subtask => subtask.status === "done")) ||
                      (task.approvalStatus === "pending-approval") ? "opacity-50 cursor-not-allowed" : ""
                    }
                  >
                    <div className="flex items-center space-x-2">
                      {/* <CheckCircle className="w-4 h-4 text-green-600" /> */}
                      <span>Done</span>
                      {subtasks.length > 0 && !subtasks.every(subtask => subtask.status === "done") && (
                        <span className="text-xs text-gray-500 ml-1">(Complete all subtasks first)</span>
                      )}
                      {/* {task.approvalStatus === "pending-approval" && (
                        <span className="text-xs text-gray-500 ml-1">(Pending TL approval)</span>
                      )} */}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Overview - Figma Layout */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold">Task Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-0">
                {/* Row 1: Title ID, Task Title, Assigned to, Priority */}
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <p className="text-[14px] text-[#717182] mb-1.5 font-medium">Title ID</p>
                    <p className="text-[17px] font-normal text-[#040110]">{task._id.slice(-6).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-[14px] text-[#717182] mb-1.5 font-medium">Task Title</p>
                    <p className="text-[17px] font-normal text-[#040110]">{task.title}</p>
                  </div>
                  <div>
                    <p className="text-[14px] text-[#717182] mb-1.5 font-medium">Assigned to</p>
                    <p className="text-[17px] font-normal text-[#040110]">{task.assignee?.name || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-[14px] text-[#717182] mb-1.5 font-medium">Priority</p>
                    <p className={`text-[17px] font-normal ${
                      task.priority === 'high' || task.priority === 'urgent' ? 'text-[#DC2626]' :
                      task.priority === 'medium' ? 'text-[#F59E0B]' : 'text-[#10B981]'
                    }`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </p>
                  </div>
                </div>

                {/* Row 2: Description */}
                {task.description && (
                  <div>
                    <p className="text-[14px] text-[#717182] mb-1.5 font-medium">Description</p>
                    <p className="text-[17px] text-[#040110] whitespace-pre-wrap leading-relaxed">
                      {task.description}
                    </p>
                  </div>
                )}

                {/* Row 3: Start Date, Due Date, Duration, Status */}
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <p className="text-[14px] text-[#717182] mb-1.5 font-medium">Start Date</p>
                    <p className="text-[17px] font-normal text-[#040110]">
                      {task.startDate ? formatDueDate(task.startDate) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[14px] text-[#717182] mb-1.5 font-medium">Due Date</p>
                    <p className="text-[17px] font-normal text-[#040110]">
                      {formatDueDate(task.dueDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[14px] text-[#717182] mb-1.5 font-medium">Duration</p>
                    <p className="text-[17px] font-normal text-[#040110]">
                      {task.durationDays ? `${task.durationDays} Day${task.durationDays > 1 ? 's' : ''}` : '-'}
                    </p>
                  </div>
                  {/* <div>
                    <p className="text-[14px] text-[#717182] mb-1.5 font-medium">Status</p>
                    <div className="flex gap-1">
                      <Badge
                        className={cn(
                          "cursor-pointer transition-colors text-xs",
                          task.status === 'to-do'
                            ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
                            : "text-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        variant={task.status === 'to-do' ? "default" : "outline"}
                        onClick={() => handleStatusChange('to-do')}
                      >
                        To Do
                      </Badge>
                      <Badge
                        className={cn(
                          "cursor-pointer transition-colors text-xs",
                          task.status === 'in-progress'
                            ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
                            : "text-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        variant={task.status === 'in-progress' ? "default" : "outline"}
                        onClick={() => handleStatusChange('in-progress')}
                      >
                        Active
                      </Badge>
                      <Badge
                        className={cn(
                          "cursor-pointer transition-colors text-xs",
                          task.status === 'done'
                            ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
                            : "text-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        variant={task.status === 'done' ? "default" : "outline"}
                        onClick={() => handleStatusChange('done')}
                      >
                        Done
                      </Badge>
                    </div>
                  </div> */}
                </div>

                {task.rejectionReason && task.approvalStatus !== "approved" && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-900">Rejection Feedback</p>
                        <p className="text-sm text-red-700 mt-1">{task.rejectionReason}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Handover Notes with Rich Text Toolbar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="w-[370px]">
                <CardHeader>
                  <CardTitle>Handover Notes</CardTitle>
                  <CardDescription>
                    Add your progress updates and handover information here
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Textarea
                    ref={handoverTextareaRef}
                    placeholder="Share your progress, blockers, or handover notes..."
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    className="min-h-32 border border-gray-300 rounded-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 p-2 m-2 disabled:cursor-not-allowed disabled:opacity-50 w-[355px]"
                    disabled={savingHandover}
                  />
                  {/* Display selected files */}
                  {handoverFiles.length > 0 && (
                    <div className="p-3 border-t bg-gray-50">
                      <FileUpload
                        selectedFiles={handoverFiles}
                        onFilesSelect={setHandoverFiles}
                        maxFiles={3}
                        maxFileSize={5}
                      />
                    </div>
                  )}
                  {<RichTextToolbar
                    textareaRef={handoverTextareaRef}
                    onAttachClick={() => {
                      // Trigger file input
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt';
                      input.onchange = (e: any) => {
                        const files = Array.from(e.target.files || []) as File[];
                        if (files.length > 0) {
                          // Validate files before adding
                          const allowedTypes = [
                            "image/jpeg", "image/png", "image/gif",
                            "application/pdf",
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            "text/plain",
                          ];
                          const maxFileSize = 5; // MB
                          const maxFiles = 3;
                          const validFiles: File[] = [];
                          const errors: string[] = [];

                          files.forEach((file) => {
                            if (!allowedTypes.includes(file.type)) {
                              errors.push(`${file.name}: Invalid file type`);
                              return;
                            }
                            if (file.size > maxFileSize * 1024 * 1024) {
                              errors.push(`${file.name}: File too large (max ${maxFileSize}MB)`);
                              return;
                            }
                            if (handoverFiles.length + validFiles.length >= maxFiles) {
                              errors.push(`Maximum ${maxFiles} files allowed`);
                              return;
                            }
                            validFiles.push(file);
                          });

                          if (errors.length > 0) {
                            toast.error(errors.join("\n"));
                          }
                          if (validFiles.length > 0) {
                            setHandoverFiles([...handoverFiles, ...validFiles]);
                          }
                        }
                      };
                      input.click();
                    }}
                    actionLabel="Share"
                    onActionClick={handleSaveHandoverNotes}
                    actionDisabled={savingHandover || (!handoverNotes.trim() && handoverFiles.length === 0)}
                    actionLoading={savingHandover}
                    showFormattingButtons={true}
                  />
                  }
                </CardContent>
              </Card>

              {/* Attachments Panel */}
              <Card>
                <CardHeader className="grid grid-cols-[1fr_auto] items-center px-6">
                  <CardTitle className="leading-none font-semibold">Attachments</CardTitle>
                  {/* {canUploadAttachments() && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt';
                        input.onchange = async (e: any) => {
                          const files = Array.from(e.target.files || []) as File[];
                          if (files.length > 0) {
                            await handleUploadTaskAttachments(files);
                          }
                        };
                        input.click();
                      }}
                      className="p-1.5 hover:bg-white/50 rounded transition-colors h-auto"
                      title="Upload files"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  )} */}
                </CardHeader>
              <CardContent className="p-0">
                  <AttachmentsPanel
                    attachments={task.handoverAttachments || []}
                    canDelete={canDeleteAttachments()}
                    onDelete={handleDeleteAttachment}
                    className="border-0"
                  />
              </CardContent>
              </Card>

              {/* Subtasks Section */}
              {subtasks && subtasks.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Subtasks</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-3 space-y-2">
                      {subtasks.map(st => (
                        <div key={st._id} className="p-2 border rounded flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{st.title}</div>
                            <div className="text-xs text-gray-500">
                              {st.status} • {st.priority} {st.assignee?.name ? `• ${st.assignee.name}` : ''}
                              {st.approvalStatus && st.approvalStatus !== "not-required" && (
                                <span className={`ml-1 px-1 py-0.5 rounded text-xs ${
                                  st.approvalStatus === "pending-approval" ? "bg-yellow-100 text-yellow-800" :
                                  st.approvalStatus === "approved" ? "bg-green-100 text-green-800" :
                                  "bg-red-100 text-red-800"
                                }`}>
                                  {st.approvalStatus === "pending-approval" ? "Pending Approval" :
                                   st.approvalStatus === "approved" ? "Approved" : "Rejected"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {st.approvalStatus === "pending-approval" && canApproveTask() && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={async () => {
                                  try {
                                    await postData(`/task/${st._id}/approve`, {});
                                    toast.success("Subtask approved successfully");
                                    fetchSubtasks();
                                  } catch (error) {
                                    console.error("Failed to approve subtask:", error);
                                    toast.error("Failed to approve subtask");
                                  }
                                }}
                              >
                                Approve
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={()=>navigate(`/task/${st._id}`)}>Open</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

      {/* Task Attachments Section */}
          <div className="lg:col-span-1">
            <Card className="h-fit mb-6 bg-[#E5EFFF]">
              <CardHeader className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6">
                <CardTitle className="leading-none font-semibold">Attachments</CardTitle>
              {canUploadAttachments() && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt';
                      input.onchange = async (e: any) => {
                        const files = Array.from(e.target.files || []) as File[];
                        if (files.length > 0) {
                          await handleUploadTaskAttachments(files);
                        }
                      };
                      input.click();
                    }}
                    className="p-1.5 hover:bg-white/50 rounded transition-colors h-auto"
                    title="Upload files"
                  >
                    <Upload className="w-4 h-4" />
              </Button>
              )}
              
              </CardHeader>
              <CardContent className="p-0">
                {!task.attachments || task.attachments.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm border-0">
                    <File className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No attachments</p>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="h-48 px-3 overflow-x-auto">
                      <div className="space-y-0 py-2">
                        {task.attachments.map((attachment, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between h-11 hover:bg-white/50 transition-colors rounded-md px-2.5 py-1.5 group overflow-x-auto"
                          >
                            <div
                              className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                window.open(buildBackendUrl(attachment.fileUrl), '_blank');
                              }}
                            >
                              <File className="w-6 h-6 text-gray-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-normal text-gray-900 truncate">
                                  {attachment.fileName}
                                </div>
                                <div className="text-xs font-normal text-gray-500">
                                  {((attachment.fileSize || 0) / (1024 * 1024)).toFixed(1)} MB
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  window.open(buildBackendUrl(attachment.fileUrl), '_blank');
                                }}
                                className="p-1 hover:bg-blue-100 rounded transition-colors h-auto"
                                title="Open in new tab"
                              >
                                <Download className="w-4 h-4 text-blue-600" />
                              </Button>
                              {canDeleteTaskAttachments() && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteTaskAttachment(index)}
                                  className="p-1 hover:bg-red-100 rounded transition-colors h-auto"
                                  title="Delete (Admin only)"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="px-2.5 py-2 border-t border-gray-200">
                      <div className="text-xs text-gray-500 text-center">
                        {task.attachments.length} / 10 attachments
                      </div>
                    </div>
                  </>
                )}
      </CardContent>
      </Card>

      {/* Create Subtask Modal */}
      <Dialog open={showCreateSubtask} onOpenChange={setShowCreateSubtask}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subtask</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={subtaskTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setSubtaskTitle(e.target.value)} placeholder="Title" />
            <Textarea value={subtaskDescription} onChange={e=>setSubtaskDescription(e.target.value)} placeholder="Description" />
            <Select value={subtaskAssigneeId} onValueChange={(v:any)=>setSubtaskAssigneeId(v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Assign to (optional)" /></SelectTrigger>
              <SelectContent>
                {assignableMembers.map((m:any)=> (
                  <SelectItem key={m._id} value={m._id}>{m.name || m.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={subtaskPriority} onValueChange={(v:any)=>setSubtaskPriority(v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="inline-flex items-center gap-2 whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 has-[&gt;svg]:px-3 w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] justify-start text-left font-normal text-[#717680]"
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded="false"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-calendar mr-2 h-4 w-4" aria-hidden="true">
                        <path d="M8 2v4"></path>
                        <path d="M16 2v4"></path>
                        <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                        <path d="M3 10h18"></path>
                      </svg>
                      {subtaskStartDate ? format(new Date(subtaskStartDate), 'PPP') : 'Pick a date'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={subtaskStartDate ? new Date(subtaskStartDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const formattedDate = format(date, 'yyyy-MM-dd');
                          setSubtaskStartDate(formattedDate);
                        }
                      }}
                      disabled={(date) => {
                        if (!task?.startDate || !task?.dueDate) return false;
                        const d = new Date(date);
                        d.setHours(0, 0, 0, 0);
                        const taskStart = new Date(task.startDate);
                        taskStart.setHours(0, 0, 0, 0);
                        const taskDue = new Date(task.dueDate);
                        taskDue.setHours(0, 0, 0, 0);
                        // Allow dates from task start to task end (inclusive)
                        return d < taskStart || d > taskDue;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="inline-flex items-center gap-2 whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 has-[&gt;svg]:px-3 w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] justify-start text-left font-normal text-[#717680]"
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded="false"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-calendar mr-2 h-4 w-4" aria-hidden="true">
                        <path d="M8 2v4"></path>
                        <path d="M16 2v4"></path>
                        <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                        <path d="M3 10h18"></path>
                      </svg>
                      {subtaskEndDate ? format(new Date(subtaskEndDate), 'PPP') : 'Pick a date'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={subtaskEndDate ? new Date(subtaskEndDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const formattedDate = format(date, 'yyyy-MM-dd');
                          setSubtaskEndDate(formattedDate);
                        }
                      }}
                      disabled={(date) => {
                        if (!task?.startDate || !task?.dueDate) return false;
                        const d = new Date(date);
                        d.setHours(0, 0, 0, 0);
                        const taskStart = new Date(task.startDate);
                        taskStart.setHours(0, 0, 0, 0);
                        const taskDue = new Date(task.dueDate);
                        taskDue.setHours(0, 0, 0, 0);

                        // Must be within task date range
                        if (d < taskStart || d > taskDue) return true;

                        // Must be >= subtask start date if selected
                        if (subtaskStartDate) {
                          const subStart = new Date(subtaskStartDate);
                          subStart.setHours(0, 0, 0, 0);
                          if (d < subStart) return true;
                        }

                        return false;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=>setShowCreateSubtask(false)} disabled={isCreatingSubtask}>Cancel</Button>
              <Button onClick={handleCreateSubtask} disabled={isCreatingSubtask}>
                {isCreatingSubtask ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
            {/* Enhanced Chat Section */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Task Chat</span>
                  {comments.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {comments.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  {comments.length === 0
                    ? "Start the conversation"
                    : `${comments.length} message${comments.length === 1 ? "" : "s"}`}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                <ScrollArea className="h-80 px-4">
                  {comments.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <div className="text-4xl mb-4">💬</div>
                      <p className="text-xs">
                        Start the conversation by posting the first message
                      </p>
                    </div>
                  ) : (
                    <div className="py-4 space-y-1">
                      {comments && comments.length > 0 ? (
                        comments.map((comment) => (
                          <ChatMessage
                            key={comment._id}
                            comment={comment}
                            currentUser={activeUser}
                            canReply={canReply()}
                            canEdit={canReply()}
                            canDelete={canReply()}
                            replies={replies[comment._id] || []}
                            isExpanded={expandedThreads.has(comment._id)}
                            onReply={handleReply}
                            onEdit={handleEditComment}
                            onDelete={handleDeleteComment}
                            onToggleExpand={toggleThread}
                            onLoadReplies={loadReplies}
                          />
                        ))
                      ) : (
                        <div className="py-4 text-center text-gray-500">
                          <p className="text-xs">No comments available</p>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>

                <Separator />

                {/* Message Input */}
                {canComment() && (
                  <div className="p-3 bg-gray-50">
                    {/* Reply Indicator */}
                    {replyingTo && (
                      <div className="mb-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-medium text-blue-900">
                              Replying to {replyingTo.author.name}
                            </div>
                            <div className="text-xs text-blue-700 mt-1 line-clamp-2">
                              {replyingTo.content}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelReply}
                            className="p-1 h-auto text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* File Upload */}
                    {selectedFiles.length > 0 || replyingTo ? (
                      <div className="mb-2">
                        <FileUpload
                          selectedFiles={selectedFiles}
                          onFilesSelect={setSelectedFiles}
                          maxFiles={3}
                          maxFileSize={5}
                        />
                      </div>
                    ) : null}

                    {/* Message Input with Rich Text Toolbar */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <Textarea
                        id="comment-input"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={
                          replyingTo
                            ? "Type your reply..."
                            : "Write your comment here..."
                        }
                        className="text-sm p-3 border-0 rounded-b-none focus-visible:ring-0 resize-none"
                        rows={3}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmitComment();
                          }
                        }}
                      />
                      <RichTextToolbar
                        actionLabel="Send"
                        onActionClick={handleSubmitComment}
                        actionDisabled={isSubmitting || (!newComment.trim() && selectedFiles.length === 0)}
                        actionLoading={isSubmitting}
                        showFormattingButtons={true}
                        className="border-t-0"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ✅ ENHANCED: Rejection Dialog with Date Pickers */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span>Reject Task</span>
            </DialogTitle>
            <DialogDescription>
              Provide feedback and set new dates for the task.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-900 mb-2 block">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain what needs to be improved or corrected..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  Start Date (Unchanged)
                </label>
                <div className="inline-flex items-center gap-2 w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] font-['Inter'] bg-gray-50 text-gray-500 border cursor-not-allowed opacity-60">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar mr-2 h-4 w-4" aria-hidden="true">
                    <path d="M8 2v4"></path>
                    <path d="M16 2v4"></path>
                    <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                    <path d="M3 10h18"></path>
                  </svg>
                  {rejectStartDate ? format(new Date(rejectStartDate), 'PPP') : 'No date'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  New Due Date <span className="text-red-500">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      data-slot="popover-trigger"
                      className="inline-flex items-center gap-2 whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 has-[&gt;svg]:px-3 w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] font-['Inter'] justify-start text-left font-normal text-[#717680]"
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded="false"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-calendar mr-2 h-4 w-4" aria-hidden="true">
                        <path d="M8 2v4"></path>
                        <path d="M16 2v4"></path>
                        <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                        <path d="M3 10h18"></path>
                      </svg>
                      {rejectDueDate ? format(new Date(rejectDueDate), 'PPP') : 'Pick a date'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={rejectDueDate ? new Date(rejectDueDate) : undefined}
                      onSelect={(date) => {
                        if (!date) return;
                        const d = new Date(date);
                        d.setHours(0,0,0,0);
                        const ps = rejectProjectStart || (task ? new Date(task.startDate) : undefined);
                        const pe = rejectProjectEnd || (task ? new Date(task.dueDate) : undefined);
                        if (ps) ps.setHours(0,0,0,0);
                        if (pe) {
                          pe.setHours(0,0,0,0);
                          const pePlusOne = new Date(pe);
                          pePlusOne.setDate(pePlusOne.getDate() + 1);
                          if (d.getTime() >= pePlusOne.getTime()) {
                            setRejectDueDate(format(pe, 'yyyy-MM-dd'));
                            return;
                          }
                        }
                        if (ps && d < ps) {
                          setRejectDueDate(format(ps, 'yyyy-MM-dd'));
                          return;
                        }
                        if (rejectStartDate) {
                          const s = new Date(rejectStartDate);
                          s.setHours(0,0,0,0);
                          if (d < s) {
                            setRejectDueDate(format(s, 'yyyy-MM-dd'));
                            return;
                          }
                        }
                        setRejectDueDate(format(d, 'yyyy-MM-dd'));
                      }}
                      disabled={(date) => {
                        const d = new Date(date as Date);
                        d.setHours(0,0,0,0);
                        const ps = rejectProjectStart || (task ? new Date(task.startDate) : undefined);
                        const pe = rejectProjectEnd || (task ? new Date(task.dueDate) : undefined);
                        if (ps) ps.setHours(0,0,0,0);
                        let pePlusOne: Date | null = null;
                        if (pe) {
                          pe.setHours(0,0,0,0);
                          pePlusOne = new Date(pe);
                          pePlusOne.setDate(pePlusOne.getDate() + 1);
                        }
                        const startBaseline = rejectStartDate ? new Date(rejectStartDate) : ps || undefined;
                        if (startBaseline) startBaseline.setHours(0,0,0,0);
                        return Boolean((startBaseline && d < startBaseline) || (pePlusOne && d.getTime() >= pePlusOne.getTime()));
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-900 mb-2 block">
                Reassign To (Optional)
              </label>
              <Select
                value={rejectReassigneeId}
                onValueChange={(v) => setRejectReassigneeId(v === "__keep__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Keep current assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__keep__">Keep current assignee</SelectItem>
                  {assignableMembers.map((member) => (
                    <SelectItem key={member._id} value={member._id}>
                      {member.name} {member.role === 'project-head' && '(Project Head)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-gray-500">
              The task will be moved back to in-progress with the new dates and the assignee will be notified.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
                setRejectStartDate("");
                setRejectDueDate("");
                setRejectReassigneeId("");
              }}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectTask}
              disabled={isRejecting || !rejectionReason.trim() || !rejectDueDate}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isRejecting ? "Rejecting..." : "Reject Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ NEW: Reassignment Dialog for Approved Tasks */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-600" />
              <span>Reassign Approved Task</span>
            </DialogTitle>
            <DialogDescription>
              Assign this completed task to someone else with new dates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-900 mb-2 block">
                Assign To <span className="text-red-500">*</span>
              </label>
              <Select value={reassignAssigneeId} onValueChange={setReassignAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {assignableMembers.map((member) => (
                    <SelectItem key={member._id} value={member._id}>
                      {member.name} {member.role === 'project-head' && '(Project Head)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  Start Date (Unchanged)
                </label>
                <div className="inline-flex items-center gap-2 w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] font-['Inter'] bg-gray-50 text-gray-500 border cursor-not-allowed opacity-60">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar mr-2 h-4 w-4" aria-hidden="true">
                    <path d="M8 2v4"></path>
                    <path d="M16 2v4"></path>
                    <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                    <path d="M3 10h18"></path>
                  </svg>
                  {reassignStartDate ? format(new Date(reassignStartDate), 'PPP') : 'No date'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      data-slot="popover-trigger"
                      className="inline-flex items-center gap-2 whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 has-[&gt;svg]:px-3 w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] font-['Inter'] justify-start text-left font-normal text-[#717680]"
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded="false"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-calendar mr-2 h-4 w-4" aria-hidden="true">
                        <path d="M8 2v4"></path>
                        <path d="M16 2v4"></path>
                        <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                        <path d="M3 10h18"></path>
                      </svg>
                      {reassignDueDate ? format(new Date(reassignDueDate), 'PPP') : 'Pick a date'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={reassignDueDate ? new Date(reassignDueDate) : undefined}
                      onSelect={(date) => {
                        if (!date) return;
                        const d = new Date(date);
                        d.setHours(0,0,0,0);
                        const ps = reassignProjectStart || (task ? new Date(task.startDate) : undefined);
                        const pe = reassignProjectEnd || (task ? new Date(task.dueDate) : undefined);
                        if (ps) ps.setHours(0,0,0,0);
                        if (pe) {
                          pe.setHours(0,0,0,0);
                          const pePlusOne = new Date(pe);
                          pePlusOne.setDate(pePlusOne.getDate() + 1);
                          if (d.getTime() >= pePlusOne.getTime()) {
                            setReassignDueDate(format(pe, 'yyyy-MM-dd'));
                            return;
                          }
                        }
                        const startBaseline = reassignStartDate ? new Date(reassignStartDate) : (ps || undefined);
                        if (startBaseline) {
                          startBaseline.setHours(0,0,0,0);
                          if (d < startBaseline) {
                            setReassignDueDate(format(startBaseline, 'yyyy-MM-dd'));
                            return;
                          }
                        }
                        setReassignDueDate(format(d, 'yyyy-MM-dd'));
                      }}
                      disabled={(date) => {
                        const d = new Date(date as Date);
                        d.setHours(0,0,0,0);
                        const ps = reassignProjectStart || (task ? new Date(task.startDate) : undefined);
                        const pe = reassignProjectEnd || (task ? new Date(task.dueDate) : undefined);
                        if (ps) ps.setHours(0,0,0,0);
                        let pePlusOne: Date | null = null;
                        if (pe) {
                          pe.setHours(0,0,0,0);
                          pePlusOne = new Date(pe);
                          pePlusOne.setDate(pePlusOne.getDate() + 1);
                        }
                        const startBaseline = reassignStartDate ? new Date(reassignStartDate) : ps || undefined;
                        if (startBaseline) startBaseline.setHours(0,0,0,0);
                        return Boolean((startBaseline && d < startBaseline) || (pePlusOne && d.getTime() >= pePlusOne.getTime()));
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800">
                ⚠️ This will reset the task to "To Do" status and clear the approval. The new assignee will be notified.
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowReassignDialog(false);
                setReassignAssigneeId("");
                setReassignStartDate("");
                setReassignDueDate("");
              }}
              disabled={isReassigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassignTask}
              disabled={isReassigning || !reassignAssigneeId || !reassignDueDate}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isReassigning ? "Reassigning..." : "Reassign Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
};

export default TaskDetail;
