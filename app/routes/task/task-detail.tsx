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
  handoverEntries?: Array<{
    _id: string;
    content: string;
    author: {
      _id: string;
      name: string;
      email: string;
    };
    attachments: Array<{
      fileName: string;
      fileUrl: string;
      fileType: "image" | "document";
      fileSize: number;
      mimeType: string;
    }>;
    createdAt: string;
    updatedAt: string;
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

      {selectedFiles.length < maxFiles && (
        <div className="border border-[#d5d7da] rounded-[8px]">
          <label
            htmlFor="file-upload"
            className="flex items-center gap-[8px] px-[14px] py-[10px] cursor-pointer hover:bg-gray-50"
          >
            <span className="flex-1 text-[14px] font-normal font-['Inter'] text-[#717680]">
              Upload ({selectedFiles.length}/{maxFiles})
            </span>
            <Upload className="w-5 h-5 text-[#717680]" />
          </label>
          <input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedTypes.join(",")}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};

// File Preview Component with Context Menu
const FilePreview: React.FC<{
  attachments: Comment["attachments"];
  canDelete?: boolean;
  onDelete?: (index: number) => void;
  isOwnAttachment?: boolean;
}> = ({ attachments, canDelete = false, onDelete, isOwnAttachment = false }) => {
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(null);

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

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    if (isOwnAttachment && canDelete) {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, index });
    }
  };

  const handleDeleteFromContext = () => {
    if (contextMenu && onDelete) {
      onDelete(contextMenu.index);
      setContextMenu(null);
    }
  };

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  if (!attachments || attachments.length === 0) return null;

  // Separate images and documents
  const imageAttachments = attachments.filter(a => a.fileType === "image");

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment, index) => (
        <div key={index} className="relative">
          {attachment.fileType === "image" ? (
            <div
              className="relative group cursor-pointer"
              onClick={() => downloadFile(attachment)}
              onContextMenu={(e) => handleContextMenu(e, index)}
            >
              <img
                src={buildBackendUrl(attachment.fileUrl)}
                alt={attachment.fileName}
                className="rounded max-h-32 hover:opacity-90 transition-opacity w-full object-cover"
              />
              <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1.5 rounded">
                <span className="truncate block">
                  {attachment.fileName.length > 20
                    ? `${attachment.fileName.substring(0, 20)}...`
                    : attachment.fileName}
                </span>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-between p-2 bg-gray-50 rounded border text-xs hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => downloadFile(attachment)}
              onContextMenu={(e) => handleContextMenu(e, index)}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <span className="text-lg flex-shrink-0">
                  {getFileIcon(attachment.mimeType)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    {attachment.fileName.length > 20
                      ? `${attachment.fileName.substring(0, 20)}...`
                      : attachment.fileName}
                  </div>
                  <div className="text-gray-500">
                    {formatFileSize(attachment.fileSize)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-300 rounded shadow-lg py-1 z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={handleDeleteFromContext}
            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Attachment
          </button>
        </div>
      )}

      {/* Enhanced Image Preview Modal */}
      {imageAttachments.length > 0 && (
        <ImagePreviewModal
          images={imageAttachments}
          initialIndex={0}
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

  const isOwnMessage = comment.author._id === (currentUser?._id || currentUser?.id);
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
    <div className="group mb-3">
      <div
        className={`flex gap-2 ${
          isOwnMessage ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {!isOwnMessage && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="text-xs bg-blue-500 text-white">
              {comment.author.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        <div
          className={`flex-1 max-w-[95%] sm:max-w-[85%] md:max-w-[75%] ${
            isOwnMessage ? "flex flex-col items-end" : ""
          }`}
        >
          <div
            className={`p-2 sm:p-3 rounded-lg ${
              isOwnMessage
                ? "bg-[#DCF8C6] text-black rounded-tr-none"
                : "bg-white border border-gray-200 text-black rounded-tl-none"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">
                {isOwnMessage ? "You" : comment.author.name}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(comment.createdAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
              {comment.isEdited && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
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
                  className="text-sm p-2 border rounded resize-none"
                  rows={2}
                />
                <div className="flex space-x-2 mt-2">
                  <Button
                    size="sm"
                    onClick={handleEdit}
                    className="h-7 px-3 text-xs"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="h-7 px-3 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-900 whitespace-pre-wrap">
                {comment.content}
              </div>
            )}

            {comment.attachments && comment.attachments.length > 0 && (
              <FilePreview
                attachments={comment.attachments}
                isOwnAttachment={isOwnMessage}
                canDelete={isOwnMessage}
              />
            )}
          </div>

          <div
            className={`flex items-center gap-2 mt-1 text-xs ${
              isOwnMessage ? "justify-end" : "justify-start"
            }`}
          >
            {canReply && (
              <button
                onClick={() => onReply(comment)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Reply className="w-3 h-3" />
                Reply
              </button>
            )}
            {canEdit && isOwnMessage && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                Edit
              </button>
            )}
            {canDelete && isOwnMessage && (
              <button
                onClick={() => onDelete(comment._id)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>

          {hasReplies && (
            <div className="mt-2">
              <button
                onClick={handleToggleExpand}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors text-xs"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span>
                  {comment.replyCount || 0} {comment.replyCount === 1 ? "reply" : "replies"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {hasReplies && isExpanded && (
        <div className={`mt-2 space-y-2 pl-10 ${isOwnMessage ? "pr-0" : "pr-10"}`}>
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
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // New handover entries states
  const [handoverEntries, setHandoverEntries] = useState<Task["handoverEntries"]>([]);
  const [newHandoverContent, setNewHandoverContent] = useState("");
  const [handoverSelectedFiles, setHandoverSelectedFiles] = useState<File[]>([]);
  const [submittingHandover, setSubmittingHandover] = useState(false);

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
      fetchHandoverEntries();
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


  // ✅ NEW: Fetch handover entries
  const fetchHandoverEntries = async () => {
    if (!taskId) return;
    try {
      const response = await fetch(
        buildApiUrl(`/task/${taskId}/handover-entries`),
        {
          credentials: 'include',
          headers: {
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setHandoverEntries(data.entries || []);
      }
    } catch (error) {
      console.error("Failed to fetch handover entries:", error);
    }
  };

  // ✅ NEW: Submit handover entry
  const handleSubmitHandoverEntry = async () => {
    if (!task) return;
    if (!newHandoverContent.trim() && handoverSelectedFiles.length === 0) {
      toast.error("Please add content or attach files");
      return;
    }

    try {
      setSubmittingHandover(true);

      const formData = new FormData();
      formData.append("content", newHandoverContent.trim());

      handoverSelectedFiles.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await fetch(
        buildApiUrl(`/task/${task._id}/handover-entries`),
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
        throw new Error("Failed to add handover entry");
      }

      toast.success("Handover entry added successfully");

      // Clear inputs
      setNewHandoverContent("");
      setHandoverSelectedFiles([]);

      // Refresh handover entries
      await fetchHandoverEntries();
    } catch (error) {
      console.error("Failed to add handover entry:", error);
      toast.error("Failed to add handover entry");
    } finally {
      setSubmittingHandover(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() && selectedFiles.length === 0) {
      toast.error("Please enter a message or attach files");
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("content", newComment.trim());
      formData.append("taskId", taskId!);

      if (replyingTo) {
        formData.append("parentCommentId", replyingTo._id);
      }

      selectedFiles.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await fetch(buildApiUrl("/comments"), {
        method: "POST",
        credentials: "include",
        headers: {
          "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to add comment");
      }

      setNewComment("");
      setSelectedFiles([]);
      setReplyingTo(null);
      await fetchComments();
      toast.success("Comment added successfully");
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string, content: string) => {
    try {
      const response = await fetch(buildApiUrl(`/comments/${commentId}`), {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to edit comment");
      }

      await fetchComments();
      toast.success("Comment updated");
    } catch (error) {
      console.error("Failed to edit comment:", error);
      toast.error("Failed to edit comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const response = await fetch(buildApiUrl(`/comments/${commentId}`), {
        method: "DELETE",
        credentials: "include",
        headers: {
          "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }

      await fetchComments();
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const handleToggleExpand = (commentId: string) => {
    setExpandedThreads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const handleLoadReplies = async (parentCommentId: string) => {
    try {
      const response = await fetch(
        buildApiUrl(`/comments/${parentCommentId}/replies`),
        {
          credentials: "include",
          headers: {
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReplies((prev) => ({
          ...prev,
          [parentCommentId]: data.comments || [],
        }));
      }
    } catch (error) {
      console.error("Failed to load replies:", error);
    }
  };

  // Approval handlers
  const handleApprove = async () => {
    if (!task) return;
    try {
      setIsApproving(true);
      const response = await fetch(
        buildApiUrl(`/task/${task._id}/approve`),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to approve task");
      }

      toast.success("Task approved successfully");
      await fetchTaskDetails();
    } catch (error) {
      console.error("Failed to approve task:", error);
      toast.error("Failed to approve task");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      setIsRejecting(true);
      const response = await fetch(
        buildApiUrl(`/task/${task?._id}/reject`),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
          body: JSON.stringify({
            rejectionReason: rejectionReason.trim(),
            reassigneeId: rejectReassigneeId || undefined,
            startDate: rejectStartDate || undefined,
            dueDate: rejectDueDate || undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reject task");
      }

      toast.success("Task rejected and reassigned");
      setShowRejectDialog(false);
      setRejectionReason("");
      setRejectReassigneeId("");
      setRejectStartDate("");
      setRejectDueDate("");
      await fetchTaskDetails();
    } catch (error) {
      console.error("Failed to reject task:", error);
      toast.error("Failed to reject task");
    } finally {
      setIsRejecting(false);
    }
  };

  // ✅ NEW: Reassign task handler
  const handleReassignTask = async () => {
    if (!reassignAssigneeId || !reassignDueDate) {
      toast.error("Please select an assignee and due date");
      return;
    }

    try {
      setIsReassigning(true);
      const response = await fetch(
        buildApiUrl(`/task/${task?._id}/reassign`),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
          body: JSON.stringify({
            assigneeId: reassignAssigneeId,
            startDate: reassignStartDate || undefined,
            dueDate: reassignDueDate,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to reassign task' }));
        throw new Error(errorData.message || 'Failed to reassign task');
      }

      toast.success("Task reassigned successfully");
      setShowReassignDialog(false);
      setReassignAssigneeId("");
      setReassignStartDate("");
      setReassignDueDate("");
      await fetchTaskDetails();
    } catch (error: any) {
      console.error("Failed to reassign task:", error);
      toast.error(error?.message || "Failed to reassign task");
    } finally {
      setIsReassigning(false);
    }
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case "to-do":
        return <Circle className="w-4 h-4" />;
      case "in-progress":
        return <PlayCircle className="w-4 h-4" />;
      case "done":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "to-do":
        return "bg-gray-100 text-gray-800 border-gray-300";
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "done":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-green-100 text-green-800 border-green-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "urgent":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getApprovalStatusColor = (status?: string) => {
    switch (status) {
      case "pending-approval":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "approved":
        return "bg-green-100 text-green-800 border-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const topLevelComments = comments.filter((c) => !c.parentComment);

  const isCreator = activeUser?._id === task?.creator?._id || activeUser?.id === task?.creator?._id;
  const isAssignee = activeUser?._id === task?.assignee?._id || activeUser?.id === task?.assignee?._id;
  const canApprove = task?.approvalStatus === "pending-approval" && isCreator;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Task Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              The task you're looking for doesn't exist or you don't have
              permission to view it.
            </p>
            <Button
              onClick={() => navigate("/tasks")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tasks
            </Button>
          </CardContent>
        </Card>
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
                label: "Dashboard", 
                href: "/dashboard",
                icon: (
                  <img
                    src="/assets/4001ba5860d2858f2469e275a4ce7fe2c2c2a952.svg"
                    alt="Dashboard"
                    className="w-[20px] h-[20px]"
                  />
                )
              },
              { 
                label: "Workspace", 
                href: "/workspace",
                icon: (
                  <img
                    src="/assets/84789fe1294f4eedc3013b31bb79e7394bd87fab.svg"
                    alt="Workspace"
                    className="w-[20px] h-[20px]"
                  />
                )
              },
              { 
                label: task.project?.title || "Project", 
                href: `/project/${task.project?._id}`,
                icon: (
                  <img
                    src="/assets/folder-project-icon.svg"
                    alt="Project"
                    className="w-[20px] h-[20px]"
                  />
                )
              },
              { 
                label: task.title, 
                href: "#",
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
                )
              },
            ]}
          />
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Main Content - Left side on desktop */}
          <div className="space-y-6 order-2 lg:order-1">
            {/* Task Details Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{task.title}</CardTitle>
                    <div className="flex flex-col gap-2">
                      {/* Status and Priority on same line */}
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(task.status)} border`}
                        >
                          {getStatusIcon(task.status)}
                          <span className="ml-1 capitalize">
                            {task.status.replace("-", " ")}
                          </span>
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`${getPriorityColor(task.priority)} border`}
                        >
                          <span className="capitalize">{task.priority}</span>
                        </Badge>
                      </div>
                      {/* Approval status on next line */}
                      {task.approvalStatus && task.approvalStatus !== "not-required" && (
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={`${getApprovalStatusColor(task.approvalStatus)} border`}
                          >
                            <span className="capitalize">
                              {task.approvalStatus.replace("-", " ")}
                            </span>
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {/* Task Details - 2x2 Grid Layout */}
                    <div className="mt-6 grid grid-cols-2 gap-4 h-64 w-full">
                      {/* Top Row - Assignee and Creator */}
                      <div className="bg-gray-50 rounded-lg p-4 flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <User className="w-4 h-4" />
                          <span className="font-medium">Assignee</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-sm bg-blue-500 text-white">
                              {task.assignee?.name?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {task.assignee?.name || "Unassigned"}
                          </span>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <User className="w-4 h-4" />
                          <span className="font-medium">Creator</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-sm bg-green-500 text-white">
                              {task.creator?.name?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{task.creator?.name}</span>
                        </div>
                      </div>

                      {/* Bottom Row - Dates */}
                      <div className="bg-gray-50 rounded-lg p-4 flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">Timeline</span>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500">
                            <span className="font-medium">Start:</span> {formatDate(task.startDate)}
                          </div>
                          <div className="text-xs text-gray-500">
                            <span className="font-medium">Due:</span> {formatDate(task.dueDate)}
                          </div>
                          {task.durationDays && (
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">Duration:</span> {task.durationDays} days
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">Created</span>
                        </div>
                        <div className="text-sm font-medium">{formatDate(task.createdAt)}</div>
                        {task.completedAt && (
                          <div className="mt-1">
                            <div className="flex items-center gap-2 text-xs text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              <span>Completed {formatDate(task.completedAt)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Change Dropdown - Only for assignee */}
                  {isAssignee && task.approvalStatus !== "approved" && (
                    <Select
                      value={task.status}
                      onValueChange={handleStatusChange}
                      disabled={isChangingStatus}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="to-do">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  
                  {/* Reassign Button - Only for creator */}
                  {isCreator && task.assignee && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowReassignDialog(true)}
                      className="text-xs"
                    >
                      Reassign Task
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>

                {task.category && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Category</h3>
                    <Badge variant="outline">{task.category}</Badge>
                  </div>
                )}

                {task.attachments && task.attachments.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Attachments</h3>
                    <AttachmentsPanel attachments={task.attachments} />
                  </div>
                )}

                {/* Approval Actions - Only for creator */}
                {canApprove && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {isApproving ? "Approving..." : "Approve Task"}
                    </Button>
                    <Button
                      onClick={() => setShowRejectDialog(true)}
                      disabled={isRejecting}
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject & Reassign
                    </Button>
                  </div>
                )}

                {/* Rejection Info - Show if task was rejected */}
                {task.approvalStatus === "rejected" && task.rejectionReason && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-semibold text-red-900 mb-2">Rejection Reason</h4>
                    <p className="text-red-700">{task.rejectionReason}</p>
                  </div>
                )}

                {/* Approval Info - Show if task was approved */}
                {task.approvalStatus === "approved" && task.approvedBy && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Approved By</h4>
                    <p className="text-green-700">
                      {task.approvedBy.name} on {formatDate(task.approvedAt || "")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Handover Progress - WhatsApp Style */}
            <Card className="w-full bg-[#E5EFFF]">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Handover Progress</span>
                  {handoverEntries && handoverEntries.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {handoverEntries.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-0">
                <ScrollArea className="h-64 sm:h-72 md:h-80 px-2 sm:px-3 md:px-4 bg-[#E5DDD5]">
                  {handoverEntries && handoverEntries.length > 0 ? (
                    <div className="space-y-3 py-3">
                      {(() => {
                        const groupedEntries: Record<string, typeof handoverEntries> = {};
                        handoverEntries.forEach((entry) => {
                          const date = new Date(entry.createdAt).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "long",
                          });
                          if (!groupedEntries[date]) {
                            groupedEntries[date] = [];
                          }
                          groupedEntries[date].push(entry);
                        });

                        return Object.entries(groupedEntries).map(([date, entries]) => (
                          <div key={date} className="space-y-3">
                            <div className="flex justify-center">
                              <span className="bg-white px-3 py-1 rounded-full text-xs text-gray-600 shadow-sm">
                                {date}
                              </span>
                            </div>
                            {entries.map((entry) => {
                              const isOwnEntry = entry.author._id === (activeUser?._id || activeUser?.id);
                              return (
                                <div
                                  key={entry._id}
                                  className={`flex gap-2 ${isOwnEntry ? "flex-row-reverse" : "flex-row"}`}
                                >
                                  {!isOwnEntry && (
                                    <Avatar className="w-8 h-8 flex-shrink-0">
                                      <AvatarFallback className="text-xs bg-blue-500 text-white">
                                        {entry.author.name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                  <div
                                    className={`flex-1 max-w-[95%] sm:max-w-[85%] md:max-w-[75%] ${
                                      isOwnEntry ? "flex flex-col items-end" : ""
                                    }`}
                                  >
                                    <div
                                      className={`p-2 sm:p-3 rounded-lg ${
                                        isOwnEntry
                                          ? "bg-[#DCF8C6] text-black rounded-tr-none"
                                          : "bg-white border border-gray-200 text-black rounded-tl-none"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm">
                                          {isOwnEntry ? "You" : entry.author.name}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {new Date(entry.createdAt).toLocaleTimeString("en-US", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: true,
                                          })}
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-900 whitespace-pre-wrap">
                                        {entry.content}
                                      </div>
                                      {entry.attachments && entry.attachments.length > 0 && (
                                        <FilePreview
                                          attachments={entry.attachments}
                                          isOwnAttachment={isOwnEntry}
                                          canDelete={isOwnEntry}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ));
                      })()}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                      No handover entries yet
                    </div>
                  )}
                </ScrollArea>

                {isAssignee && (
                  <div className="p-3 bg-gray-50">
                    <Textarea
                      value={newHandoverContent}
                      onChange={(e) => setNewHandoverContent(e.target.value)}
                      placeholder="Share your progress, blockers, or handover notes..."
                      className="mb-3 resize-none"
                      rows={3}
                    />
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 border-t">
                      <label htmlFor="handover-attach" className="cursor-pointer">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                        <input
                          id="handover-attach"
                          type="file"
                          multiple
                          accept="image/*,.pdf,.docx"
                          className="hidden"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files) {
                              setHandoverSelectedFiles(Array.from(files));
                            }
                          }}
                        />
                      </label>
                      <Button
                        onClick={handleSubmitHandoverEntry}
                        disabled={submittingHandover || (!newHandoverContent.trim() && handoverSelectedFiles.length === 0)}
                        className="bg-[#FF6B2C] hover:bg-[#FF5A1A] text-white flex items-center gap-2"
                        size="sm"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m22 2-7 20-4-9-9-4Z" />
                          <path d="M22 2 11 13" />
                        </svg>
                        Share
                      </Button>
                    </div>
                    {handoverSelectedFiles.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {handoverSelectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                            <span className="text-sm truncate">{file.name}</span>
                            <button
                              onClick={() => setHandoverSelectedFiles(handoverSelectedFiles.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Comments and Subtasks on desktop */}
          <div className="space-y-6 order-1 lg:order-2">
            {/* Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Discussion ({comments.length})
                </CardTitle>
                <CardDescription>
                  Communicate with your team about this task
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {topLevelComments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No comments yet. Start the discussion!</p>
                      </div>
                    ) : (
                      topLevelComments.map((comment) => (
                        <ChatMessage
                          key={comment._id}
                          comment={comment}
                          currentUser={activeUser}
                          canReply={true}
                          canEdit={true}
                          canDelete={true}
                          replies={replies[comment._id] || []}
                          isExpanded={expandedThreads.has(comment._id)}
                          onReply={(c) => setReplyingTo(c)}
                          onEdit={handleEditComment}
                          onDelete={handleDeleteComment}
                          onToggleExpand={handleToggleExpand}
                          onLoadReplies={handleLoadReplies}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Comment Input */}
                <div className="mt-4 pt-4 border-t">
                  {replyingTo && (
                    <div className="mb-3 p-2 bg-blue-50 rounded-lg flex items-start justify-between">
                      <div className="flex-1">
                        <span className="text-xs text-blue-600 font-medium">
                          Replying to {replyingTo.author.name}
                        </span>
                        <p className="text-xs text-gray-600 truncate">
                          {replyingTo.content.substring(0, 50)}...
                        </p>
                      </div>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-blue-500 text-white">
                        {activeUser?.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={
                          replyingTo
                            ? `Reply to ${replyingTo.author.name}...`
                            : "Write a comment..."
                        }
                        className="min-h-[80px] resize-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                      />
                      <FileUpload
                        onFilesSelect={setSelectedFiles}
                        selectedFiles={selectedFiles}
                        maxFiles={3}
                        maxFileSize={5}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          Press Enter to send, Shift + Enter for new line
                        </span>
                        <Button
                          onClick={handleAddComment}
                          disabled={isSubmitting || (!newComment.trim() && selectedFiles.length === 0)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {isSubmitting ? "Sending..." : "Send"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subtasks Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Subtasks ({subtasks.length})</CardTitle>
                  {isCreator && (
                    <Button
                      size="sm"
                      onClick={() => setShowCreateSubtask(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Create Subtask
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {subtasks.length === 0 ? (
                  <p className="text-gray-500 text-sm">No subtasks created yet.</p>
                ) : (
                  <div className="space-y-3">
                    {subtasks.map((subtask) => (
                      <div
                        key={subtask._id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/tasks/${subtask._id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{subtask.title}</h4>
                            <div className="flex gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className={`text-xs ${getStatusColor(subtask.status)}`}
                              >
                                {subtask.status}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getPriorityColor(subtask.priority)}`}
                              >
                                {subtask.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>



          </div>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Task</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection and optionally reassign the task
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Rejection Reason
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this task is being rejected..."
                className="min-h-[100px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Reassign To (Optional)
              </label>
              <Select
                value={rejectReassigneeId}
                onValueChange={setRejectReassigneeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {assignableMembers.map((member) => (
                    <SelectItem key={member._id} value={member._id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {rejectReassigneeId && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    New Start Date (Optional)
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="w-4 h-4 mr-2" />
                        {rejectProjectStart
                          ? format(rejectProjectStart, "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={rejectProjectStart || undefined}
                        onSelect={(date) => {
                          setRejectProjectStart(date || null);
                          if (date) {
                            setRejectStartDate(date.toISOString());
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    New Due Date (Required)
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="w-4 h-4 mr-2" />
                        {rejectProjectEnd
                          ? format(rejectProjectEnd, "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={rejectProjectEnd || undefined}
                        onSelect={(date) => {
                          setRejectProjectEnd(date || null);
                          if (date) {
                            setRejectDueDate(date.toISOString());
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
                setRejectReassigneeId("");
                setRejectStartDate("");
                setRejectDueDate("");
              }}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={isRejecting || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isRejecting ? "Rejecting..." : "Reject Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Subtask Dialog */}
      <Dialog open={showCreateSubtask} onOpenChange={setShowCreateSubtask}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Subtask</DialogTitle>
            <DialogDescription>
              Create a subtask under "{task.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                placeholder="Subtask title"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={subtaskDescription}
                onChange={(e) => setSubtaskDescription(e.target.value)}
                placeholder="Subtask description"
                className="min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Assignee</label>
              <Select value={subtaskAssigneeId} onValueChange={setSubtaskAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {assignableMembers.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select
                value={subtaskPriority}
                onValueChange={(val) =>
                  setSubtaskPriority(val as "low" | "medium" | "high" | "urgent")
                }
              >
                <SelectTrigger>
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
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={subtaskStartDate}
                onChange={(e) => setSubtaskStartDate(e.target.value)}
                min={task.startDate?.split('T')[0]}
                max={task.dueDate?.split('T')[0]}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Due Date</label>
              <Input
                type="date"
                value={subtaskEndDate}
                onChange={(e) => setSubtaskEndDate(e.target.value)}
                min={subtaskStartDate || task.startDate?.split('T')[0]}
                max={task.dueDate?.split('T')[0]}
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateSubtask(false);
                setSubtaskTitle("");
                setSubtaskDescription("");
                setSubtaskAssigneeId("");
                setSubtaskStartDate("");
                setSubtaskEndDate("");
                setSubtaskPriority("medium");
              }}
              disabled={isCreatingSubtask}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubtask}
              disabled={isCreatingSubtask || !subtaskTitle}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreatingSubtask ? "Creating..." : "Create Subtask"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Task Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Task</DialogTitle>
            <DialogDescription>
              Assign this task to a different team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                New Assignee
              </label>
              <Select
                value={reassignAssigneeId}
                onValueChange={setReassignAssigneeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {assignableMembers
                    .filter((m) => m._id !== task.assignee?._id)
                    .map((member) => (
                      <SelectItem key={member._id} value={member._id}>
                        {member.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                New Start Date (Optional)
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    {reassignProjectStart
                      ? format(reassignProjectStart, "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={reassignProjectStart || undefined}
                    onSelect={(date) => {
                      setReassignProjectStart(date || null);
                      if (date) {
                        setReassignStartDate(date.toISOString());
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                New Due Date (Required)
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    {reassignProjectEnd
                      ? format(reassignProjectEnd, "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={reassignProjectEnd || undefined}
                    onSelect={(date) => {
                      setReassignProjectEnd(date || null);
                      if (date) {
                        setReassignDueDate(date.toISOString());
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
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
