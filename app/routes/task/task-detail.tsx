import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../../provider/auth-context";
import { fetchData, postData, postMultipart } from "@/lib/fetch-util";
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
  Paperclip,
  Smile,
  MoreVertical,
  ExternalLink,
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
import { format, isToday, isYesterday, isSameDay } from "date-fns";

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
  handoverAttachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: "image" | "document";
    fileSize: number;
    mimeType: string;
  }>;
  workspace?: string;
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
  replies?: Comment[];
}

interface CommentsResponse {
  comments: Comment[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
}

// Helper function to format date header
const getDateHeader = (date: Date): string => {
  if (isToday(date)) {
    return "Today";
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    return format(date, "MMMM d, yyyy");
  }
};

// Helper function to format message timestamp
const formatMessageTime = (dateString: string): string => {
  return format(new Date(dateString), "h:mm a");
};

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
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
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm"
            >
              <div className="flex items-center space-x-3">
                {isImage(file) ? (
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Image className="w-4 h-4 text-blue-600" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <File className="w-4 h-4 text-gray-600" />
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-gray-900">{file.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="p-1 h-auto text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
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
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded-full p-0 text-gray-500 hover:text-blue-600 hover:bg-gray-100 transition-colors duration-200"
          aria-label="Attach files"
        >
          <Paperclip className="w-5 h-5" />
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
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

  const openFile = (attachment: any) => {
    const fileUrl = buildBackendUrl(attachment.fileUrl);
    window.open(fileUrl, '_blank');
  };

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment, index) => (
        <div key={index} className="relative">
          {attachment.fileType === "image" ? (
            <div className="relative max-w-xs">
              <img
                src={buildBackendUrl(attachment.fileUrl)}
                alt={attachment.fileName}
                className="rounded max-h-32 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() =>
                  setPreviewImage(buildBackendUrl(attachment.fileUrl))
                }
              />
              <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {attachment.fileName}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded border text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-lg">
                  {getFileIcon(attachment.mimeType)}
                </span>
                <div>
                  <div className="font-medium">{attachment.fileName}</div>
                  <div className="text-gray-500">
                    {formatFileSize(attachment.fileSize)}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openFile(attachment)}
                  className="h-6 px-2"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadFile(attachment)}
                  className="h-6 px-2"
                  title="Download file"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>
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

// WhatsApp-style Chat Message Component (Group Style)
const ChatMessage = React.memo<{
  comment: Comment;
  currentUser: any;
  canReply: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onReply: (comment: Comment) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
}>(({
  comment,
  currentUser,
  canReply,
  canEdit,
  canDelete,
  onReply,
  onEdit,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const isOwnMessage = currentUser && comment.author._id === currentUser._id;

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

  return (
    <div className="mb-1">
      <div className="group px-3 py-1 hover:bg-gray-100/50 transition-colors">
        {/* WhatsApp Group Style: Always show left-aligned with avatar */}
        <div className="flex items-start space-x-2">
          {/* Avatar - Always on left in group style */}
          <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
            <AvatarImage src={comment.author.avatar} />
            <AvatarFallback className="text-xs bg-gray-500 text-white">
              {comment.author.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            {/* Message bubble */}
            <div
              className={`rounded-lg shadow-sm px-3 py-2 ${
                isOwnMessage
                  ? "bg-blue-100 border border-blue-200"
                  : "bg-white border border-gray-200"
              }`}
            >
              {/* Author name and time - WhatsApp group style */}
              <div className="flex items-baseline justify-between mb-1">
                <span className={`text-xs font-semibold ${
                  isOwnMessage ? "text-blue-700" : "text-gray-700"
                }`}>
                  {comment.author.name}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  {formatMessageTime(comment.createdAt)}
                </span>
              </div>

              {/* Reply indicator */}
              {comment.parentComment && (
                <div className={`mb-2 p-2 rounded border-l-4 text-xs ${
                  isOwnMessage
                    ? "bg-blue-50 border-blue-400"
                    : "bg-gray-50 border-gray-400"
                }`}>
                  <div className="text-gray-600 font-medium mb-1 flex items-center">
                    <Reply className="w-3 h-3 inline mr-1" />
                    {comment.parentComment.author.name}
                  </div>
                  <div className="text-gray-700 italic line-clamp-2">
                    {comment.parentComment.content}
                  </div>
                </div>
              )}

              {/* Message content */}
              {isEditing ? (
                <div>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="text-sm p-2 border border-gray-300 rounded resize-none mb-2"
                    rows={3}
                    placeholder="Edit your message..."
                  />
                  <div className="flex space-x-2">
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
                <>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-900">
                    {comment.content}
                  </div>

                  {/* Attachments */}
                  {comment.attachments && comment.attachments.length > 0 && (
                    <div className="mt-2">
                      <FilePreview attachments={comment.attachments} />
                    </div>
                  )}

                  {/* Status indicators */}
                  <div className="flex items-center justify-end mt-1">
                    {comment.isEdited && (
                      <span className="text-xs text-gray-400 italic mr-1">edited</span>
                    )}
                    {isOwnMessage && (
                      <CheckCircle className="w-3 h-3 text-blue-500" />
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Action buttons - WhatsApp style */}
            <div className="flex items-center space-x-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {canReply && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onReply(comment)}
                  className="h-6 px-2 text-xs text-gray-600"
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
                  className="h-6 px-2 text-xs text-gray-600"
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
                  className="h-6 px-2 text-xs text-red-600"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Display replies - indented WhatsApp style */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-12 mt-1 border-l-2 border-gray-200 pl-2">
          {comment.replies.map((reply) => (
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
            />
          ))}
        </div>
      )}
    </div>
  );
});

ChatMessage.displayName = "ChatMessage";

// Date Header Component
const DateHeader: React.FC<{ date: Date }> = ({ date }) => {
  return (
    <div className="flex justify-center my-3">
      <div className="bg-gray-200 text-gray-700 text-xs font-medium px-3 py-1 rounded-lg shadow-sm">
        {getDateHeader(date)}
      </div>
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
  const [savingHandover, setSavingHandover] = useState(false);
  const [handoverFiles, setHandoverFiles] = useState<File[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Comments loading and error states
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  // New chat-related states
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Organize comments with their replies
  const commentsWithReplies = useMemo(() => {
    const commentMap = new Map<string, Comment>();
    const topLevel: Comment[] = [];

    // First pass: create a map of all comments
    comments.forEach((comment) => {
      commentMap.set(comment._id, { ...comment, replies: [] });
    });

    // Second pass: organize into parent-child relationships
    comments.forEach((comment) => {
      const commentWithReplies = commentMap.get(comment._id)!;
      
      const parentId = comment.parentComment 
        ? (typeof comment.parentComment === 'string' 
            ? comment.parentComment 
            : comment.parentComment._id)
        : null;
      
      if (parentId) {
        const parent = commentMap.get(parentId);
        if (parent) {
          if (!parent.replies) parent.replies = [];
          parent.replies.push(commentWithReplies);
        }
      } else {
        topLevel.push(commentWithReplies);
      }
    });

    // Sort replies by creation date (oldest first)
    const sortReplies = (comment: Comment) => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        comment.replies.forEach(sortReplies);
      }
    };

    topLevel.forEach(sortReplies);

    return topLevel;
  }, [comments]);

  // Group top-level comments with replies by date
  const groupedCommentsWithReplies = useMemo(() => {
    const groups: { date: Date; comments: Comment[] }[] = [];
    
    commentsWithReplies.forEach((comment) => {
      const commentDate = new Date(comment.createdAt);
      const existingGroup = groups.find((group) =>
        isSameDay(group.date, commentDate)
      );

      if (existingGroup) {
        existingGroup.comments.push(comment);
      } else {
        groups.push({
          date: commentDate,
          comments: [comment],
        });
      }
    });

    return groups;
  }, [commentsWithReplies]);

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
      const response = await fetch(buildApiUrl(`/task/${taskId}`), {
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
        },
      });

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
    setLoadingComments(true);
    setCommentsError(null);

    try {
      const response = await fetch(buildApiUrl(`/comments/task/${taskId}`), {
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const topLevelComments = data.comments || [];
        
        const allComments = [...topLevelComments];
        
        for (const comment of topLevelComments) {
          if (comment.hasReplies && comment.replyCount > 0) {
            try {
              const repliesResponse = await fetch(buildApiUrl(`/comments/${comment._id}/replies`), {
                credentials: "include",
                headers: {
                  "Accept": "application/json",
                  "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
                },
              });
              
              if (repliesResponse.ok) {
                const repliesData = await repliesResponse.json();
                allComments.push(...(repliesData.replies || []));
              }
            } catch (replyError) {
              console.error(`Failed to fetch replies for comment ${comment._id}:`, replyError);
            }
          }
        }
        
        setComments(allComments);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || `Failed to load comments (${response.status})`;
        setCommentsError(errorMessage);
        console.error(
          "Failed to fetch comments:",
          response.status,
          response.statusText,
          errorData
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load comments";
      setCommentsError(errorMessage);
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

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
      const formData = new FormData();
      formData.append("handoverNotes", handoverNotes || "");
      handoverFiles.forEach((file) => formData.append("attachments", file));
      await postMultipart(`/task/${task._id}/handover`, formData);
      await fetchTaskDetails();
      setHandoverFiles([]);
      toast.success("Handover notes saved successfully");
    } catch (error) {
      console.error("Failed to save handover notes:", error);
      toast.error("Failed to save handover notes");
    } finally {
      setSavingHandover(false);
    }
  };

  // Chat functions
  const canComment = () => {
    if (!activeUser || !task) {
      return false;
    }

    const activeUserId = activeUser._id || activeUser.id;
    return task.assignee._id === activeUserId;
  };

  const canReply = () => {
    if (!activeUser) {
      return false;
    }

    if (["super_admin", "admin"].includes(activeUser.role)) {
      return true;
    }

    const activeUserId = activeUser._id || activeUser.id;
    if (task?.assignee._id === activeUserId) {
      return true;
    }

    if (activeUser.workspaces?.length > 0) {
      const workspace = activeUser.workspaces.find(
        (ws: any) => ws.workspace.toString() === task?.workspace?.toString()
      );
      if (workspace?.role === "lead") {
        return true;
      }
    }
    return false;
  };

  const handleReply = useCallback(
    (comment: Comment) => {
      if (!canReply()) return;
      setReplyingTo(comment);
      setTimeout(() => {
        document.getElementById("comment-input")?.focus();
      }, 100);
    },
    []
  );

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
    setSelectedFiles([]);
  }, []);

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
        credentials: "include",
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
      const response = await fetch(buildApiUrl(`/comments/${commentId}`), {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
        },
        body: JSON.stringify({ content }),
      });

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
      const response = await fetch(buildApiUrl(`/comments/${commentId}`), {
        method: "DELETE",
        credentials: "include",
        headers: {
          "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
        },
      });

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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <div className="mt-3">
                  <FileUpload
                    selectedFiles={handoverFiles}
                    onFilesSelect={setHandoverFiles}
                  />
                </div>
                {task?.handoverAttachments &&
                  (task.handoverAttachments as any).length > 0 && (
                    <div className="mt-4">
                      <FilePreview
                        attachments={task.handoverAttachments as any}
                      />
                    </div>
                  )}
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

          {/* WhatsApp Group Style Chat Section */}
          <div className="lg:col-span-1">
            <Card className="h-fit shadow-lg">
              <CardHeader className="pb-3 bg-gray-100 border-b">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="w-5 h-5" />
                    <span>Task Chat</span>
                  </div>
                  {comments.length > 0 && (
                    <Badge variant="secondary">
                      {comments.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-0 bg-white">
                <ScrollArea className="h-96">
                  {loadingComments ? (
                    <div className="py-12 text-center">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-sm text-gray-600">Loading messages...</p>
                    </div>
                  ) : commentsError ? (
                    <div className="py-12 text-center">
                      <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                      <p className="text-sm text-red-600 mb-2">
                        Failed to load messages
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchComments()}
                      >
                        Try Again
                      </Button>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="py-12 text-center px-4">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        {canComment()
                          ? "No messages yet. Start the conversation!"
                          : "No messages yet."}
                      </p>
                    </div>
                  ) : (
                    <div className="py-2">
                      {groupedCommentsWithReplies.map((group, groupIndex) => (
                        <div key={groupIndex}>
                          <DateHeader date={group.date} />
                          {group.comments.map((comment) => (
                            <ChatMessage
                              key={comment._id}
                              comment={comment}
                              currentUser={activeUser}
                              canReply={canReply()}
                              canEdit={canReply()}
                              canDelete={canReply()}
                              onReply={handleReply}
                              onEdit={handleEditComment}
                              onDelete={handleDeleteComment}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Message input */}
                {(comments.length === 0 ? canComment() : canReply()) && (
                  <div className="p-3 bg-gray-50 border-t">
                    {replyingTo && (
                      <div className="mb-3 p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Reply className="w-4 h-4 text-blue-600" />
                            <div className="text-sm text-gray-700">
                              Replying to{" "}
                              <span className="font-semibold">
                                {replyingTo.author.name}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelReply}
                            className="p-1 h-auto"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="mt-2 text-sm text-gray-600 italic">
                          "{replyingTo.content.length > 60
                            ? `${replyingTo.content.substring(0, 60)}...`
                            : replyingTo.content}"
                        </div>
                      </div>
                    )}

                    {selectedFiles.length > 0 && (
                      <div className="mb-3 p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          <Upload className="w-4 h-4 inline mr-1" />
                          Attachments ({selectedFiles.length})
                        </div>
                        <FileUpload
                          selectedFiles={selectedFiles}
                          onFilesSelect={setSelectedFiles}
                          maxFiles={3}
                          maxFileSize={5}
                        />
                      </div>
                    )}

                    <div className="flex items-end space-x-2">
                      <div className="flex-shrink-0">
                        <FileUpload
                          selectedFiles={selectedFiles}
                          onFilesSelect={setSelectedFiles}
                          maxFiles={3}
                          maxFileSize={5}
                        />
                      </div>

                      <div className="flex-1 bg-white rounded-lg border border-gray-300">
                        <Textarea
                          id="comment-input"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder={
                            replyingTo
                              ? "Type your reply..."
                              : "Type a message..."
                          }
                          className="border-0 resize-none focus:ring-0 min-h-[40px] max-h-[120px] text-sm"
                          rows={1}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmitComment();
                            }
                          }}
                        />
                      </div>

                      <div className="flex-shrink-0">
                        <Button
                          onClick={handleSubmitComment}
                          disabled={
                            isSubmitting ||
                            (!newComment.trim() && selectedFiles.length === 0)
                          }
                          size="sm"
                          className="w-12 h-12 rounded-full p-0"
                        >
                          {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
