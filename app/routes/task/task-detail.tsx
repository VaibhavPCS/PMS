import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../../provider/auth-context";
import { fetchData, postData } from "@/lib/fetch-util";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Task {
  _id: string;
  title: string;
  description: string;
  status: "to-do" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
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
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  handoverNotes?: string;
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
    const link = document.createElement("a");
    link.href = buildBackendUrl(attachment.fileUrl);
    link.download = attachment.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!attachments || attachments.length === 0) return null;

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
                onClick={() =>
                  setPreviewImage(buildBackendUrl(attachment.fileUrl))
                }
              />
              <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1.5 rounded flex items-center justify-between">
                <span className="truncate">{attachment.fileName}</span>
                <div className="flex gap-1 ml-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage(buildBackendUrl(attachment.fileUrl));
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

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
            <DialogDescription>Preview of the attached image</DialogDescription>
          </DialogHeader>
          {previewImage && (
            <div className="flex justify-center">
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
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
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onReply(comment)}
                className="text-xs h-5 px-1"
              >
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Button>
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
  <div className="mt-1">
    <Button
      size="sm"
      variant="ghost"
      onClick={handleToggleExpand}
      className="text-xs h-5 px-1 text-blue-600 hover:text-blue-700"
    >
      {isExpanded ? (
        <ChevronDown className="w-3 h-3 mr-1" />
      ) : (
        <ChevronRight className="w-3 h-3 mr-1" />
      )}
      {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
    </Button>
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
    }
  }, [taskId, authLoading]);

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
      console.log("Fetching task details for ID:", taskId);
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
        toast.error("Task not found");
      } else {
        toast.error("Failed to load task details");
      }
      setTimeout(() => navigate("/dashboard"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      console.log("Fetching comments for task:", taskId);
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
        console.log("Comments fetched:", data);
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

  // In the TaskDetail component, add after fetchComments:
  useEffect(() => {
    console.log("Comments state updated:", comments);
    console.log("Comments length:", comments?.length);
  }, [comments]);

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;

    try {
      await postData(`/task/${taskId}/status`, { status: newStatus });
      setTask({ ...task, status: newStatus as any });
      toast.success("Task status updated");
    } catch (error) {
      console.error("Failed to update task status:", error);
      toast.error("Failed to update task status");
    }
  };

  const handleSaveHandoverNotes = async () => {
    if (!task) return;

    try {
      setSavingHandover(true);
      await postData(`/task/${task._id}/handover`, { handoverNotes });
      toast.success("Handover notes saved successfully");
      setTask({ ...task, handoverNotes });
    } catch (error) {
      console.error("Failed to save handover notes:", error);
      toast.error("Failed to save handover notes");
    } finally {
      setSavingHandover(false);
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

  const handleRejectTask = async () => {
    if (!task) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      setIsRejecting(true);
      await postData(`/task/${task._id}/reject`, { reason: rejectionReason });
      toast.success("Task rejected with feedback");
      setShowRejectDialog(false);
      setRejectionReason("");
      // Refresh task details
      await fetchTaskDetails();
    } catch (error: any) {
      console.error("Failed to reject task:", error);
      toast.error(error.message || "Failed to reject task");
    } finally {
      setIsRejecting(false);
    }
  };

  const canApproveTask = () => {
    if (!currentUser || !task) return false;
    // Check if user is admin or super admin
    if (["super_admin", "admin"].includes(currentUser.role)) return true;
    // Check if user is project head (would need to fetch project details or add to task response)
    // For now, we'll rely on backend permission check
    return task.status === "done" && task.approvalStatus === "pending-approval";
  };

  // Chat functions
  const canComment = () => {
    if (!currentUser || !task) return false;
    return task.assignee._id === currentUser._id;
  };

  const canReply = () => {
    if (!currentUser) return false;
    if (["super_admin", "admin"].includes(currentUser.role)) return true;
    if (task?.assignee._id === currentUser._id) return true;

    if (currentUser.workspaces?.length > 0) {
      const workspace = currentUser.workspaces.find(
        (ws: any) => ws.workspace.toString() === task?.workspace?.toString()
      );
      if (workspace?.role === "lead") return true;
    }

    return false;
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

      const response = await fetch(buildApiUrl(`/comment`), {
        method: "POST",
        credentials: 'include',
        headers: {
          "workspace-id": localStorage.getItem("currentWorkspace") || "",
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {task.title}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>in {task.project.title}</span>
                <span>•</span>
                <span>{task.category}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Badge
                variant="outline"
                className={getPriorityColor(task.priority)}
              >
                {task.priority} priority
              </Badge>

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
                <>
                  <Button
                    size="sm"
                    onClick={handleApproveTask}
                    disabled={isApproving}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isApproving ? "Approving..." : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={isRejecting}
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    Reject
                  </Button>
                </>
              )}

              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-40">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(task.status)}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to-do">
                    <div className="flex items-center space-x-2">
                      <Circle className="w-4 h-4 text-gray-600" />
                      <span>To Do</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="in-progress">
                    <div className="flex items-center space-x-2">
                      <PlayCircle className="w-4 h-4 text-blue-600" />
                      <span>In Progress</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="done">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Done</span>
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
            {/* Task Details */}
            <Card>
              <CardHeader>
                <CardTitle>Task Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {task.description && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Description
                    </h4>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {task.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Assigned to</p>
                      <p className="text-sm text-gray-600">
                        {task.assignee.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Due Date</p>
                      <p className="text-sm text-gray-600">
                        {formatDueDate(task.dueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(task.createdAt)}
                      </p>
                    </div>
                  </div>

                  {task.completedAt && (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Completed</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(task.completedAt)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {task.rejectionReason && task.approvalStatus === "rejected" && (
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

            {/* Handover Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Handover Notes</CardTitle>
                <CardDescription>
                  Add your progress updates and handover information here
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Share your progress, blockers, or handover notes..."
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  className="min-h-32"
                  disabled={savingHandover}
                />
                <div className="flex justify-end mt-3">
                  <Button
                    size="sm"
                    onClick={handleSaveHandoverNotes}
                    disabled={savingHandover}
                  >
                    {savingHandover ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Save Notes"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Chat Section */}
          <div className="lg:col-span-1">
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
                  {comments.length === 0 &&
                    canComment() &&
                    "Start the conversation"}
                  {comments.length === 0 &&
                    !canComment() &&
                    "Only the task assignee can start the conversation"}
                  {comments.length > 0 &&
                    `${comments.length} message${comments.length === 1 ? "" : "s"}`}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                <ScrollArea className="h-80 px-4">
                  {comments.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <div className="text-4xl mb-4">💬</div>
                      <p className="text-xs">
                        {canComment()
                          ? "Start the conversation by posting the first message"
                          : "Waiting for the task assignee to start the conversation"}
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
                {(comments.length === 0 ? canComment() : canReply()) && (
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

                    {/* Message Input */}
                    <div className="flex space-x-2">
                      <Avatar className="w-6 h-6 flex-shrink-0">
                        <AvatarFallback className="text-xs">
                          {activeUser?.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <Textarea
                          id="comment-input"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder={
                            replyingTo
                              ? "Type your reply..."
                              : "Type a message..."
                          }
                          className="text-xs p-2 border border-gray-300 rounded resize-none"
                          rows={2}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmitComment();
                            }
                          }}
                        />

                        <div className="flex items-center justify-between mt-1">
                          <FileUpload
                            selectedFiles={selectedFiles}
                            onFilesSelect={setSelectedFiles}
                            maxFiles={3}
                            maxFileSize={5}
                          />

                          <Button
                            onClick={handleSubmitComment}
                            disabled={
                              isSubmitting ||
                              (!newComment.trim() && selectedFiles.length === 0)
                            }
                            size="sm"
                            className="ml-2 h-6 px-3"
                          >
                            {isSubmitting ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                          </Button>
                        </div>

                        <div className="text-xs text-gray-500 mt-1">
                          Press Enter to send, Shift+Enter for new line
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span>Reject Task</span>
            </DialogTitle>
            <DialogDescription>
              Please provide feedback explaining why this task needs more work.
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
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                The assignee will receive this feedback and the task will be moved back to in-progress.
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
              }}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectTask}
              disabled={isRejecting || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isRejecting ? "Rejecting..." : "Reject Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskDetail;
