import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Navigate } from "react-router";
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
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle,
  Circle,
  PlayCircle,
  PauseCircle,
  Reply,
  ChevronDown,
  ChevronRight,
  X,
  Upload,
  File,
  Image,
  Download,
  ExternalLink,
} from "lucide-react";
import RichTextEditor from "@/components/ui/rich-text-editor";
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
import { io, Socket } from "socket.io-client";

interface Task {
  _id: string;
  title: string;
  description: string;
  status: "to-do" | "in-progress" | "done" | "on-hold";
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
    projectHead?: {
      _id: string;
      name?: string;
      email?: string;
    };
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
  rejectionAttachments?: Array<{
    type: "file" | "link";
    fileName?: string;
    fileUrl?: string;
    fileType?: "image" | "document";
    fileSize?: number;
    mimeType?: string;
    linkUrl?: string;
    linkType?: "figma" | "github";
    uploadedBy: string;
    uploadedAt: string;
  }>;
  rejectionAttachmentType?: "file" | "link" | "either";
  holdHistory?: Array<{
    putOnHoldBy: string;
    putOnHoldAt: string;
    reason?: string;
    resumedBy?: string;
    resumedAt?: string;
    endDateAtHold?: string;
    endDateCrossedDuringHold?: boolean;
    newEndDateSetBy?: string;
    newEndDate?: string;
  }>;
  currentlyOnHold?: boolean;
  referenceLinks?: string[];
  isRecurring?: boolean;
  recurringFrequency?: "daily" | "weekly" | "monthly";
  recurringEndDate?: string;
  lastCompletedDate?: string;
  nextDueDate?: string;
  recurringCompletionHistory?: Array<{
    completedAt: string;
    completedBy: {
      _id: string;
      name: string;
      email: string;
    };
    status: "completed" | "skipped";
  }>;
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
          className={`flex gap-2 ${isOwnMessage ? "flex-row-reverse" : "flex-row"
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
            className={`flex-1 max-w-[95%] sm:max-w-[85%] md:max-w-[75%] ${isOwnMessage ? "flex flex-col items-end" : ""
              }`}
          >
            <div
              className={`p-2 sm:p-3 rounded-lg ${isOwnMessage
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

            {/* <div
              className={`flex items-center gap-2 mt-1 text-xs ${isOwnMessage ? "justify-end" : "justify-start"
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
            </div> */}

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
                onToggleExpand={() => { }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

const RichTextDisplay = ({ content }: { content: string }) => {
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const renderContent = (text: string) => {
    // If text seems to be HTML (starts with <p, <div, etc or contains tags), render as is
    // Otherwise, try to render basic markdown for backward compatibility
    if (/<[a-z][\s\S]*>/i.test(text)) {
      return text;
    }

    let html = escapeHtml(text);
    // Underline (__)
    html = html.replace(/__([\s\S]+?)__/g, '<u>$1</u>');
    // Bold (**)
    html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
    // Italic (*)
    html = html.replace(/\*([\s\S]+?)\*/g, '<em>$1</em>');
    // Newlines
    html = html.replace(/\n/g, '<br>');
    return html;
  };

  return (
    <div
      className="text-sm text-gray-700 prose prose-sm max-w-none [&_p]:m-0"
      dangerouslySetInnerHTML={{ __html: renderContent(content) }}
    />
  );
};

const TaskDetail = () => {
  // Helper to format date in error messages from (mm/dd/yyyy) to (dd/mm/yyyy)
  const formatErrorMessageDate = (message: string) => {
    const dateRegex = /\((\d{1,2})\/(\d{1,2})\/(\d{4})\)/;
    const match = message.match(dateRegex);
    if (match) {
      const [_, month, day, year] = match;
      const formattedDate = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      return message.replace(dateRegex, `(${formattedDate})`);
    }
    return message;
  };
  const { id: taskId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

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

  const [isUploadingTaskAttachments, setIsUploadingTaskAttachments] = useState(false);
  const taskAttachmentsInputRef = useRef<HTMLInputElement>(null);

  // New chat-related states
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(
    new Set()
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replies, setReplies] = useState<Record<string, Comment[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

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

  // ✅ NEW: Rejection attachment states
  const [rejectionFiles, setRejectionFiles] = useState<File[]>([]);
  const [rejectionLink, setRejectionLink] = useState("");
  const rejectionFileInputRef = useRef<HTMLInputElement>(null);

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
  const [showEditSubtask, setShowEditSubtask] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<any | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskDescription, setSubtaskDescription] = useState("");
  const [subtaskAssigneeId, setSubtaskAssigneeId] = useState("");
  const [subtaskPriority, setSubtaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [subtaskStartDate, setSubtaskStartDate] = useState<string>("");
  const [subtaskEndDate, setSubtaskEndDate] = useState<string>("");
  const [subtaskProjectStart, setSubtaskProjectStart] = useState<Date | null>(null);
  const [subtaskProjectEnd, setSubtaskProjectEnd] = useState<Date | null>(null);
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false); // ✅ NEW: Loading state for subtask creation
  const [isUpdatingSubtask, setIsUpdatingSubtask] = useState(false);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState("");
  const [editSubtaskDescription, setEditSubtaskDescription] = useState("");
  const [editSubtaskAssigneeId, setEditSubtaskAssigneeId] = useState("");
  const [editSubtaskPriority, setEditSubtaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [editSubtaskStartDate, setEditSubtaskStartDate] = useState("");
  const [editSubtaskEndDate, setEditSubtaskEndDate] = useState("");
  const [editSubtaskProjectStart, setEditSubtaskProjectStart] = useState<Date | null>(null);
  const [editSubtaskProjectEnd, setEditSubtaskProjectEnd] = useState<Date | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false); // ✅ NEW: Loading state for status changes
  const [handoverEditor, setHandoverEditor] = useState<any | null>(null);
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [isUnderlineActive, setIsUnderlineActive] = useState(false);

  // ✅ NEW: Fetch assignable members for reassignment
  const [assignableMembers, setAssignableMembers] = useState<any[]>([]);

  // ✅ NEW: Hold/Resume functionality
  const [showHoldDialog, setShowHoldDialog] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [isHolding, setIsHolding] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeNewEndDate, setResumeNewEndDate] = useState("");
  const [isResuming, setIsResuming] = useState(false);
  const [endDateCrossed, setEndDateCrossed] = useState(false);

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

  // Initialize Socket connection
  useEffect(() => {
    if (!isAuthenticated) return;

    const newSocket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      path: '/socket.io/'
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated]);

  // Join task room and listen for updates
  useEffect(() => {
    if (!socket || !taskId) return;

    // Join the task room
    socket.emit('join-task', taskId);

    // Listen for new comments
    const handleNewComment = (data: { comment: Comment, taskId: string }) => {
      if (data.taskId === taskId) {
        setComments(prev => {
          // Check for duplicates
          if (prev.some(c => c._id === data.comment._id)) return prev;
          return [...prev, data.comment];
        });
      }
    };

    // Listen for comment updates
    const handleUpdateComment = (data: { comment: Comment, taskId: string }) => {
      if (data.taskId === taskId) {
        setComments(prev => prev.map(c => 
          c._id === data.comment._id ? data.comment : c
        ));
      }
    };

    // Listen for deleted comments
    const handleDeleteComment = (data: { commentId: string, taskId: string }) => {
      if (data.taskId === taskId) {
        setComments(prev => prev.filter(c => c._id !== data.commentId));
      }
    };

    socket.on('comment:new', handleNewComment);
    socket.on('comment:update', handleUpdateComment);
    socket.on('comment:delete', handleDeleteComment);

    return () => {
      socket.emit('leave-task', taskId);
      socket.off('comment:new', handleNewComment);
      socket.off('comment:update', handleUpdateComment);
      socket.off('comment:delete', handleDeleteComment);
    };
  }, [socket, taskId]);

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


  // Real-time polling - REMOVED in favor of Socket.IO
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (task?._id) {
  //       fetchComments();
  //     }
  //   }, 10000);
  //
  //   return () => clearInterval(interval);
  // }, [task?._id]);


  const chatScrollRef = useRef<HTMLDivElement | null>(null);


  useEffect(() => {
    const root = chatScrollRef.current;
    if (!root) return;
    const viewport = root.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement | null;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [comments.length]);

  useEffect(() => {
    if (!handoverEditor) return;
    const updateActive = () => {
      setIsBoldActive(handoverEditor.isActive('bold'));
      setIsItalicActive(handoverEditor.isActive('italic'));
      setIsUnderlineActive(handoverEditor.isActive('underline'));
    };
    updateActive();
    handoverEditor.on('transaction', updateActive);
    handoverEditor.on('selectionUpdate', updateActive);
    handoverEditor.on('update', updateActive);
    return () => {
      try { handoverEditor.off('transaction', updateActive); } catch { }
      try { handoverEditor.off('selectionUpdate', updateActive); } catch { }
      try { handoverEditor.off('update', updateActive); } catch { }
    };
  }, [handoverEditor]);

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
    } catch (e) { }
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
      toast.error("This task has been approved and is locked. It must be reassigned to make changes.");
      return;
    }

    // Prevent status changes when task is done and awaiting approval
    if (task.status === "done" && task.approvalStatus === "pending-approval") {
      toast.error("This task is awaiting approval. It must be approved, rejected, or reassigned before status can be changed.");
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
      // Refresh task details to get latest state (including approval status side-effects)
      await fetchTaskDetails();
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

    // Backend requires content to be non-empty
    if (!newHandoverContent.trim()) {
      toast.error("Please add a message");
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
        const errorData = await response.json().catch(() => ({ message: 'Failed to add handover entry' }));
        throw new Error(errorData.message || 'Failed to add handover entry');
      }

      toast.success("Handover entry added successfully");

      // Clear inputs
      setNewHandoverContent("");
      setHandoverSelectedFiles([]);

      // Refresh handover entries
      await fetchHandoverEntries();
    } catch (error: any) {
      console.error("Failed to add handover entry:", error);
      toast.error(error?.message || "Failed to add handover entry");
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

  const handleTaskAttachmentsSelect = async (filesList: FileList | null) => {
    if (!filesList || !task?._id) return;
    const remainingSlots = Math.max(0, 10 - (task.attachments?.length || 0));
    if (remainingSlots <= 0) {
      toast.error("Maximum attachments reached", { description: "You can attach up to 10 files" });
      return;
    }
    if (filesList.length > remainingSlots) {
      toast.error("Too many files", { description: `You can add ${remainingSlots} more attachment(s)` });
    }
    const files = Array.from(filesList).slice(0, Math.min(3, remainingSlots));
    const oversized = files.filter((f) => f.size > 5 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error("File too large", {
        description: `${oversized.map(f => f.name).join(', ')} exceeds 5MB limit`,
      });
      return;
    }
    setIsUploadingTaskAttachments(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('attachments', f));
      const response = await fetch(
        buildApiUrl(`/task/${task._id}/attachments`),
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'workspace-id': localStorage.getItem('currentWorkspaceId') || '',
          },
          body: formData,
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to upload attachments' }));
        throw new Error(errorData.message || 'Failed to upload attachments');
      }
      toast.success('Attachments uploaded successfully');
      if (taskAttachmentsInputRef.current) {
        taskAttachmentsInputRef.current.value = '';
      }
      await fetchTaskDetails();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to upload attachments');
    } finally {
      setIsUploadingTaskAttachments(false);
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

    // ✅ MODIFIED: Make rejection attachments optional (default to 'either')
    const attachmentType = task?.rejectionAttachmentType || 'either';
    const hasFile = rejectionFiles.length > 0;
    const hasLink = rejectionLink.trim();

    // Only validate if task explicitly requires attachments
    if (attachmentType === 'file' && !hasFile) {
      toast.error("File attachment is required for rejection");
      return;
    }
    if (attachmentType === 'link' && !hasLink) {
      toast.error("Link is required for rejection (Figma/GitHub)");
      return;
    }
    // For 'either' type, attachments are now optional - users can add both/none
    // Both file and link can be provided together

    // ✅ NEW: Validate link format if provided
    if (hasLink) {
      const figmaPattern = /^https?:\/\/(www\.)?figma\.com\//i;
      const githubPattern = /^https?:\/\/(www\.)?github\.com\//i;
      if (!figmaPattern.test(rejectionLink) && !githubPattern.test(rejectionLink)) {
        toast.error("Only Figma and GitHub links are allowed");
        return;
      }
    }

    try {
      setIsRejecting(true);

      // ✅ NEW: Use FormData if there are files, otherwise use JSON
      let response;
      if (hasFile) {
        const formData = new FormData();
        formData.append("reason", rejectionReason.trim());
        if (rejectReassigneeId) formData.append("reassigneeId", rejectReassigneeId);
        if (rejectDueDate) formData.append("newDueDate", rejectDueDate);
        if (hasLink) formData.append("rejectionLink", rejectionLink.trim());

        rejectionFiles.forEach((file) => {
          formData.append("rejectionFiles", file);
        });

        response = await fetch(
          buildApiUrl(`/task/${task?._id}/reject`),
          {
            method: "POST",
            credentials: "include",
            headers: {
              "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
            },
            body: formData,
          }
        );
      } else {
        // No files, use JSON
        response = await fetch(
          buildApiUrl(`/task/${task?._id}/reject`),
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
            },
            body: JSON.stringify({
              reason: rejectionReason.trim(),
              reassigneeId: rejectReassigneeId || undefined,
              newDueDate: rejectDueDate || undefined,
              rejectionLink: hasLink ? rejectionLink.trim() : undefined,
            }),
          }
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to reject task' }));
        throw new Error(errorData.message || 'Failed to reject task');
      }

      toast.success("Task rejected successfully");
      setShowRejectDialog(false);
      setRejectionReason("");
      setRejectReassigneeId("");
      setRejectStartDate("");
      setRejectDueDate("");
      setRejectProjectEnd(null);
      setRejectionFiles([]);
      setRejectionLink("");
      if (rejectionFileInputRef.current) {
        rejectionFileInputRef.current.value = '';
      }
      await fetchTaskDetails();
    } catch (error: any) {
      console.error("Failed to reject task:", error);
      const errorMessage = error?.message || "Failed to reject task";
      toast.error(formatErrorMessageDate(errorMessage));
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
      setReassignDueDate("");
      await fetchTaskDetails();
    } catch (error: any) {
      console.error("Failed to reassign task:", error);
      const errorMessage = error?.message || "Failed to reassign task";
      toast.error(formatErrorMessageDate(errorMessage));
    } finally {
      setIsReassigning(false);
    }
  };

  // ✅ NEW: Put task on hold handler
  const handlePutOnHold = async () => {
    if (!task) return;

    try {
      setIsHolding(true);
      const response = await fetch(
        buildApiUrl(`/task/${task._id}/hold`),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
          body: JSON.stringify({
            reason: holdReason.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to put task on hold' }));
        throw new Error(errorData.message || 'Failed to put task on hold');
      }

      const data = await response.json();
      toast.success("Task put on hold successfully");
      setShowHoldDialog(false);
      setHoldReason("");

      // If end date was crossed, inform the user
      if (data.endDateCrossed) {
        toast.info("Note: Task end date has already passed. Reporting manager will need to set a new end date when resuming.");
      }

      await fetchTaskDetails();
    } catch (error: any) {
      console.error("Failed to put task on hold:", error);
      toast.error(error?.message || "Failed to put task on hold");
    } finally {
      setIsHolding(false);
    }
  };

  // ✅ NEW: Resume task handler
  const handleResume = async () => {
    if (!task) return;

    // If end date was crossed during hold, new end date is required
    if (endDateCrossed && !resumeNewEndDate) {
      toast.error("Please set a new end date to resume this task");
      return;
    }

    try {
      setIsResuming(true);
      const response = await fetch(
        buildApiUrl(`/task/${task._id}/resume`),
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
          },
          body: JSON.stringify({
            newEndDate: endDateCrossed ? resumeNewEndDate : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to resume task' }));
        throw new Error(errorData.message || 'Failed to resume task');
      }

      toast.success("Task resumed successfully");
      setShowResumeDialog(false);
      setResumeNewEndDate("");
      setEndDateCrossed(false);
      await fetchTaskDetails();
    } catch (error: any) {
      console.error("Failed to resume task:", error);
      const errorMessage = error?.message || "Failed to resume task";
      toast.error(formatErrorMessageDate(errorMessage));
    } finally {
      setIsResuming(false);
    }
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case "to-do":
        return <Circle className="w-4 h-4" />;
      case "in-progress":
        return <PlayCircle className="w-4 h-4" />;
      case "on-hold":
        return <PauseCircle className="w-4 h-4" />;
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
      case "on-hold":
        return "bg-red-100 text-red-800 border-red-300";
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
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const topLevelComments = comments.filter((c) => !c.parentComment);

  const isCreator = activeUser?._id === task?.creator?._id || activeUser?.id === task?.creator?._id;
  const isAssignee = activeUser?._id === task?.assignee?._id || activeUser?.id === task?.assignee?._id;
  const isAdmin = ['admin', 'super_admin'].includes(activeUser?.role || '');
  const isProjectHead = String(task?.project?.projectHead?._id || task?.project?.projectHead || '') === String(activeUser?._id || activeUser?.id || '');
  const meMemberEntry = assignableMembers.find((m) => String(m._id) === String(activeUser?._id || activeUser?.id || ''));
  const isTLAssignedToParent = Boolean(meMemberEntry && (meMemberEntry.role === 'tl') && isAssignee);
  const canApprove = task?.status === "done" && task?.approvalStatus === "pending-approval" && isCreator;

  // ✅ NEW: Hold/Resume permissions
  const isTL = Boolean(meMemberEntry && (meMemberEntry.role === 'tl'));
  const canPutOnHold = (isAssignee || isProjectHead || isTL || isAdmin) && ['to-do', 'in-progress'].includes(task?.status || '');
  const canResume = (isAssignee || isProjectHead || isTL || isAdmin) && task?.currentlyOnHold;

  // ✅ NEW: Task locking logic - lock when done and awaiting approval or approved
  // Only unlock when rejected or reassigned
  const isTaskLocked = task?.status === 'done' &&
    (task?.approvalStatus === 'pending-approval' || task?.approvalStatus === 'approved');

  // Show warning banner when task is locked
  const showLockWarning = isTaskLocked && isAssignee;

  // Subtask creation permission - only TL assigned to parent, task not locked
  const canCreateSubtask = isTLAssignedToParent && !isTaskLocked;

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

  // ✅ Authentication Guard - Redirect to sign-in if not authenticated
  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
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
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-4 sm:mb-6">
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
                  // xmlns="http://www.w3.org/2000/svg"
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

        {/* Warning Banner for Locked Tasks */}
        {showLockWarning && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-r-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Task Locked
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    This task is currently locked because it's {task?.approvalStatus === 'approved' ? 'been approved' : 'awaiting approval'}.
                    {isCreator
                      ? ' You can reassign this task to unlock it and make changes.'
                      : ' The task creator must reassign it to unlock and make changes.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modern Responsive Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          {/* Left Column - Task Details and Handover Progress */}
          <div className="space-y-4 md:space-y-6">
            {/* Task Details Card */}
            <Card className="shadow-sm border-gray-200 overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4">
                  {/* Title and Actions Row */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <CardTitle className="text-xl sm:text-2xl font-bold leading-tight">Task Overview</CardTitle>

                    {/* Approval Buttons - Responsive: stack on mobile */}
                    <div className="flex flex-col xs:flex-row flex-wrap gap-2 xs:gap-3 items-stretch xs:items-center w-full xs:w-auto">
                      {/* Approval Actions - Only for creator */}
                      {canApprove && (
                        <>
                          <Button
                            onClick={handleApprove}
                            disabled={isApproving}
                            size="sm"
                            className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium font-['Inter'] text-[13px] h-9 px-4 rounded-lg shadow-sm transition-all w-full xs:w-auto justify-center"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {isApproving ? "Approving..." : "Approve"}
                          </Button>
                          <Button
                            onClick={() => setShowRejectDialog(true)}
                            disabled={isRejecting}
                            size="sm"
                            className="bg-white border border-[#ef4444] text-[#ef4444] hover:bg-red-50 font-medium font-['Inter'] text-[13px] h-9 px-4 rounded-lg shadow-sm transition-all w-full xs:w-auto justify-center"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}

                      {/* Reassign Button */}
                      {isCreator && task.assignee && (
                        <Button
                          size="sm"
                          onClick={() => setShowReassignDialog(true)}
                          className="bg-white border border-[#d5d7da] text-[#414651] hover:bg-gray-50 font-medium font-['Inter'] text-[13px] h-9 px-4 rounded-lg shadow-sm transition-all w-full xs:w-auto justify-center"
                        >
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13.3333 15.8333H16.6667M16.6667 15.8333V12.5M16.6667 15.8333L12.5 11.6667M6.66667 4.16667H3.33333M3.33333 4.16667V7.5M3.33333 4.16667L7.5 8.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Reassign Task
                        </Button>
                      )}

                      {/* Status Dropdown - Unified Control */}
                      {(isAssignee || isProjectHead || isAdmin || isTL) && !isTaskLocked && (
                        <Select
                          value={task.currentlyOnHold ? "on-hold" : task.status}
                          onValueChange={(value) => {
                            if (value === "on-hold") {
                              setShowHoldDialog(true);
                            } else if (task.currentlyOnHold && value !== "on-hold") {
                              // Trigger Resume Flow
                              const lastHold = task.holdHistory?.[task.holdHistory.length - 1];
                              if (lastHold?.endDateCrossedDuringHold) {
                                setEndDateCrossed(true);
                              }
                              setShowResumeDialog(true);
                            } else {
                              handleStatusChange(value);
                            }
                          }}
                          disabled={isChangingStatus || isHolding || isResuming}
                        >
                          <SelectTrigger className="bg-white border border-[#d5d7da] text-[#414651] hover:bg-gray-50 font-medium font-['Inter'] text-[13px] h-9 px-4 rounded-lg shadow-sm transition-all w-[150px] justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(task.status)}
                              <span className="capitalize truncate">{task.currentlyOnHold ? 'On Hold' : task.status.replace('-', ' ')}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="to-do">To Do</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                            <SelectItem value="on-hold">Put on Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Project Details Card - Figma Design */}
                  <div className="mt-4 bg-[#e5efff] rounded-lg px-5 py-[18px] flex flex-col gap-5 w-full overflow-x-hidden break-words">
                    {/* Task Title - Full width */}
                    <div className="flex flex-col gap-[5px]">
                      <p className="text-sm text-[#040110] opacity-60 font-normal">Task Title</p>
                      <p className="text-sm text-neutral-700 font-normal break-words">{task.title}</p>
                    </div>

                    {/* Assigned to - Full width */}
                    <div className="flex flex-col gap-[5px]">
                      <p className="text-sm text-[#040110] opacity-60 font-normal">Assigned to</p>
                      <p className="text-sm text-neutral-700 font-normal">{task.assignee?.name || "Unassigned"}</p>
                    </div>

                    {/* Priority - Full width */}
                    <div className="flex flex-col gap-[5px]">
                      <p className="text-sm text-[#040110] opacity-60 font-normal">Priority</p>
                      <p className={`text-sm font-normal capitalize ${task.priority === 'urgent' ? 'text-[#cd2812]' :
                        task.priority === 'high' ? 'text-[#cd2812]' :
                          task.priority === 'medium' ? 'text-[#f2761b]' :
                            'text-neutral-700'
                        }`}>
                        {task.priority}
                      </p>
                    </div>

                    {/* Description - Full width */}
                    <div className="flex flex-col gap-[5px]">
                      <p className="text-sm text-[#040110] opacity-60 font-normal">Description</p>
                      <p className="text-sm text-neutral-700 font-normal whitespace-pre-wrap break-all">{task.description || '-'}</p>
                    </div>

                    {/* Start Date & Due Date - Side by side */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-[5px]">
                        <p className="text-sm text-[#040110] opacity-60 font-normal">Start Date</p>
                        <p className="text-sm text-neutral-700 font-normal">{formatDate(task.startDate || "")}</p>
                      </div>
                      <div className="flex flex-col gap-[5px]">
                        <p className="text-sm text-[#040110] opacity-60 font-normal">Due Date</p>
                        <p className="text-sm text-neutral-700 font-normal">{formatDate(task.dueDate || "")}</p>
                      </div>
                    </div>

                    {/* Duration - Full width */}
                    <div className="flex flex-col gap-[5px]">
                      <p className="text-sm text-[#040110] opacity-60 font-normal">Duration</p>
                      <p className="text-sm text-neutral-700 font-normal">{task.durationDays ? `${task.durationDays} Day${task.durationDays > 1 ? 's' : ''}` : 'N/A'}</p>
                    </div>

                    {/* ✅ NEW: Recurring Task Information */}
                    {task.isRecurring && (
                      <div className="border border-blue-200 rounded-[8px] p-3 bg-blue-50/50 space-y-2">
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                            <path d="M21 3v5h-5" />
                          </svg>
                          <p className="text-sm font-semibold text-blue-900">Recurring Task</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-blue-700 font-medium">Frequency</p>
                            <p className="text-blue-900 capitalize">{task.recurringFrequency}</p>
                          </div>
                          <div>
                            <p className="text-blue-700 font-medium">Next Due</p>
                            <p className="text-blue-900">
                              {task.nextDueDate ? formatDate(task.nextDueDate) : 'No more occurrences'}
                            </p>
                          </div>
                          <div>
                            <p className="text-blue-700 font-medium">Last Completed</p>
                            <p className="text-blue-900">
                              {task.lastCompletedDate ? formatDate(task.lastCompletedDate) : 'Not yet completed'}
                            </p>
                          </div>
                          <div>
                            <p className="text-blue-700 font-medium">Recurs Until</p>
                            <p className="text-blue-900">{task.recurringEndDate ? formatDate(task.recurringEndDate) : 'N/A'}</p>
                          </div>
                        </div>

                        {task.recurringCompletionHistory && task.recurringCompletionHistory.length > 0 && (
                          <div className="pt-2 border-t border-blue-200">
                            <p className="text-xs text-blue-700 font-medium mb-1">
                              Completion History ({task.recurringCompletionHistory.length} times)
                            </p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {task.recurringCompletionHistory.slice(0, 5).map((history, index) => (
                                <div key={index} className="text-xs text-blue-800 flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                  <span>{formatDate(history.completedAt)}</span>
                                  <span className="text-blue-600">by {history.completedBy.name}</span>
                                </div>
                              ))}
                              {task.recurringCompletionHistory.length > 5 && (
                                <p className="text-xs text-blue-600 italic">
                                  +{task.recurringCompletionHistory.length - 5} more...
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status - Full width */}
                    <div className="flex flex-col gap-[5px]">
                      <p className="text-sm text-[#040110] opacity-60 font-normal">Status</p>
                      {/* Read-only status display */}
                      <p className={`text-sm font-medium capitalize ${task.status === 'done' ? 'text-[#22c55e]' :
                        task.status === 'in-progress' ? 'text-[#f2761b]' :
                        task.status === 'on-hold' ? 'text-[#CD2812]' :
                          'text-neutral-700'
                        }`}>
                        {task.status.replace("-", " ")}
                      </p>
                    </div>

                    {/* Approval Status - Inline Display with Rejection Reason */}
                    {task.approvalStatus && task.approvalStatus !== "not-required" && (
                      <div className="pt-2 border-t border-[#e0e0e0]/50">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm text-[#040110] opacity-60">Approval:</span>
                          <span className={`text-sm font-medium capitalize ${task.approvalStatus === 'approved' ? 'text-[#22c55e]' :
                            task.approvalStatus === 'rejected' ? 'text-[#ef4444]' :
                              task.approvalStatus === 'pending-approval' ? 'text-[#f59e0b]' :
                                'text-neutral-700'
                            }`}>
                            {task.approvalStatus.replace("-", " ")}
                          </span>
                        </div>
                        {/* Show rejection reason inline */}
                        {task.approvalStatus === "rejected" && task.rejectionReason && (
                          <div className="mt-2 text-sm">
                            <span className="text-[#040110] opacity-60">Reason: </span>
                            <span className="text-[#ef4444]">{task.rejectionReason}</span>
                          </div>
                        )}
                        {/* ✅ NEW: Show rejection attachments */}
                        {task.approvalStatus === "rejected" && task.rejectionAttachments && task.rejectionAttachments.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <span className="text-sm text-[#040110] opacity-60 font-medium">Rejection Attachments:</span>
                            <div className="space-y-2">
                              {task.rejectionAttachments.map((attachment, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                  {attachment.type === 'file' ? (
                                    <a
                                      href={buildBackendUrl(attachment.fileUrl || '')}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      <File className="w-4 h-4" />
                                      <span className="truncate">{attachment.fileName}</span>
                                      <Download className="w-3 h-3" />
                                    </a>
                                  ) : (
                                    <a
                                      href={attachment.linkUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                      </svg>
                                      <span className="truncate capitalize">{attachment.linkType} Link</span>
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 pt-4">
                {/* Reference Links Section */}

                {task.referenceLinks && task.referenceLinks.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-3">Reference Links</h3>
                    <ul className="space-y-2">
                      {task.referenceLinks.map((linkStr, idx) => {
                        // Handle potentially double-stringified arrays
                        let links = [linkStr];
                        try {
                          if (linkStr.startsWith('[') && linkStr.endsWith(']')) {
                            links = JSON.parse(linkStr);
                          }
                        } catch (e) {
                          // keep as is
                        }

                        return links.map((link, i) => (
                          <li key={`${idx}-${i}`} className="flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                              {link}
                            </a>
                          </li>
                        ));
                      })}
                    </ul>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900">Attachments</h3>
                    {(isAdmin || isProjectHead) && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{(task.attachments?.length || 0)}/10</span>
                        <label htmlFor="task-attach" className={`cursor-pointer ${((task.attachments?.length || 0) >= 10) ? 'opacity-50 cursor-not-allowed' : ''}`} title={isUploadingTaskAttachments ? 'Uploading...' : 'Upload files'}>
                          <Upload className="w-5 h-5 text-gray-600 hover:text-gray-800" />
                        </label>
                      </div>
                    )}
                    <input
                      id="task-attach"
                      ref={taskAttachmentsInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                      className="hidden"
                      disabled={(task.attachments?.length || 0) >= 10}
                      onChange={(e) => handleTaskAttachmentsSelect(e.target.files)}
                    />
                  </div>
                  <AttachmentsPanel attachments={task.attachments || []} />
                </div>
              </CardContent>
            </Card>

            {/* Handover Progress - Figma Design */}
            <div className="bg-[#e5efff] border border-[#cccccc] rounded-lg px-5 py-[18px] flex flex-col gap-5">
              {/* Header */}
              <div className="flex flex-col gap-[5px]">
                <h3 className="text-lg font-medium text-neutral-700">Handover Notes</h3>
                <p className="text-sm text-[#040110] opacity-60 font-normal">
                  Add your progress updates and handover information here
                </p>
              </div>

              {/* Handover Entries Display */}
              {handoverEntries && handoverEntries.length > 0 && (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {handoverEntries.map((entry) => (
                    <div key={entry._id} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm text-gray-900">{entry.author.name}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <RichTextDisplay content={entry.content} />
                      {entry.attachments && entry.attachments.length > 0 && (
                        <div className="mt-2">
                          <FilePreview attachments={entry.attachments} isOwnAttachment={false} canDelete={false} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Message Composer - Figma Design */}
              {isAssignee && !isTaskLocked && (
                <div className="bg-white rounded-lg border border-[#cccccc]">
                  {/* Rich Text Editor */}
                  <div className="p-2 pb-0">
                    <RichTextEditor
                      content={newHandoverContent}
                      onChange={setNewHandoverContent}
                      placeholder="Type your message here..."
                      className="min-h-[80px] w-full border-none shadow-none rounded-none"
                      toolbarPosition="none"
                      onEditorReady={setHandoverEditor}
                    />
                  </div>

                  {/* Selected Files Display */}
                  {handoverSelectedFiles.length > 0 && (
                    <div className="px-4 pb-2 space-y-2">
                      {handoverSelectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                          <span className="text-sm truncate flex-1">{file.name}</span>
                          <button
                            onClick={() => setHandoverSelectedFiles(handoverSelectedFiles.filter((_, i) => i !== index))}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Separator */}
                  <div className="w-full h-px bg-[#cccccc]" />

                  {/* Bottom Row - Attach Icon and Share Button */}
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handoverEditor && handoverEditor.chain().focus().toggleBold().run()}
                          disabled={!handoverEditor}
                          aria-pressed={isBoldActive}
                          className={`p-1.5 rounded-md hover:bg-gray-100 ${isBoldActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`}
                          title="Bold"
                        >
                          <Bold className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handoverEditor && handoverEditor.chain().focus().toggleItalic().run()}
                          disabled={!handoverEditor}
                          aria-pressed={isItalicActive}
                          className={`p-1.5 rounded-md hover:bg-gray-100 ${isItalicActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`}
                          title="Italic"
                        >
                          <Italic className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handoverEditor && handoverEditor.chain().focus().toggleUnderline().run()}
                          disabled={!handoverEditor}
                          aria-pressed={isUnderlineActive}
                          className={`p-1.5 rounded-md hover:bg-gray-100 ${isUnderlineActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600'}`}
                          title="Underline"
                        >
                          <UnderlineIcon className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Attach Icon */}
                      <label htmlFor="handover-attach" className="cursor-pointer">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <path
                            d="M17.8668 9.29175L10.2001 16.9584C8.78346 18.3751 6.46679 18.3751 5.05012 16.9584C3.63346 15.5417 3.63346 13.2251 5.05012 11.8084L12.7168 4.14175C13.6418 3.21675 15.1418 3.21675 16.0668 4.14175C16.9918 5.06675 16.9918 6.56675 16.0668 7.49175L8.40846 15.1501C7.94596 15.6126 7.19596 15.6126 6.73346 15.1501C6.27096 14.6876 6.27096 13.9376 6.73346 13.4751L13.5585 6.66675"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
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
                              const fileArray = Array.from(files);
                              // Validate file sizes
                              const oversizedFiles = fileArray.filter(file => file.size > 5 * 1024 * 1024);
                              if (oversizedFiles.length > 0) {
                                toast.error("File too large", {
                                  description: `${oversizedFiles.map(f => f.name).join(', ')} exceeds 5MB limit`,
                                });
                                return;
                              }
                              setHandoverSelectedFiles([...handoverSelectedFiles, ...fileArray]);
                            }
                          }}
                        />
                      </label>



                    </div>

                    {/* Share Button */}
                    <Button
                      onClick={handleSubmitHandoverEntry}
                      disabled={submittingHandover || !newHandoverContent.trim()}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive py-2 has-[>svg]:px-3 flex-1 bg-[#FF6B2C] hover:bg-[#FF5A1A] text-white h-9 px-6 text-sm font-medium"
                    >
                      <Send className="w-4 h-4" />
                      {submittingHandover ? "Sharing..." : "Share"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Show locked message when task is locked */}
              {isAssignee && isTaskLocked && (
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">
                    Handover notes are disabled because this task is {task?.approvalStatus === 'approved' ? 'approved' : 'awaiting approval'}.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    The task must be reassigned to add new handover notes.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Right Column - Discussion and Subtasks */}
          <div className="space-y-4 md:space-y-6">
            {/* Discussion Section - First on right */}
            <Card className="min-h-[300px] shadow-sm border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                  Discussion
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Communicate with your team about this task
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea ref={chatScrollRef} className="h-[350px] sm:h-[450px] md:h-[500px] pr-2 sm:pr-4" viewportClassName="scrollbar-visible">
                  <div className="space-y-3 sm:space-y-4">
                    {topLevelComments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-xs sm:text-sm">No comments yet. Start the discussion!</p>
                      </div>
                    ) : (
                      topLevelComments.map((comment) => (
                        <ChatMessage
                          key={comment._id}
                          comment={comment}
                          currentUser={activeUser}
                          canReply={!isTaskLocked}
                          canEdit={!isTaskLocked}
                          canDelete={!isTaskLocked}
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
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                  {isTaskLocked ? (
                    <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600">
                        Discussion is disabled because this task is {task?.approvalStatus === 'approved' ? 'approved' : 'awaiting approval'}.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        The task must be reassigned to continue the discussion.
                      </p>
                    </div>
                  ) : (
                    <>
                      {replyingTo && (
                        <div className="mb-2 sm:mb-3 p-2 bg-blue-50 rounded-lg flex items-start justify-between">
                          <div className="flex-1">
                            <span className="text-[10px] sm:text-xs text-blue-600 font-medium">
                              Replying to {replyingTo.author.name}
                            </span>
                            <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                              {replyingTo.content.substring(0, 50)}...
                            </p>
                          </div>
                          <button
                            onClick={() => setReplyingTo(null)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      )}

                      <div className="flex gap-2 sm:gap-3">
                        <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
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
                            className="min-h-[70px] sm:min-h-[80px] resize-none text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment();
                              }
                            }}
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <FileUpload
                              onFilesSelect={setSelectedFiles}
                              selectedFiles={selectedFiles}
                              maxFiles={3}
                              maxFileSize={5}
                            />
                            <Button
                              onClick={handleAddComment}
                              disabled={isSubmitting || (!newComment.trim() && selectedFiles.length === 0)}
                              size="sm"
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs sm:text-sm"
                            >
                              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                              {isSubmitting ? "Sending..." : "Send"}
                            </Button>
                          </div>
                          <div className="mt-1 text-[10px] sm:text-xs text-gray-500">
                            <span className="hidden sm:inline">Press Enter to send, Shift + Enter for new line</span>
                            <span className="sm:hidden">Enter to send</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
            {isTLAssignedToParent && (
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">Subtasks</CardTitle>
                    {canCreateSubtask && (
                      <Button
                        size="sm"
                        onClick={() => setShowCreateSubtask(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs sm:text-sm"
                      >
                        Create Subtask
                      </Button>
                    )}
                  </div>
                  <CardDescription className="text-xs sm:text-sm">Manage subtasks for this task</CardDescription>
                </CardHeader>
                <CardContent>
                  {subtasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-xs sm:text-sm">No subtasks yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {subtasks.map((st) => (
                        <div 
                          key={st._id} 
                          className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => navigate(`/task/${st._id}`)}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{st.title}</p>
                            <p className="text-xs text-gray-500 capitalize">{st.status?.replace('-', ' ')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 capitalize">{st.priority}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSubtask(st);
                                setEditSubtaskTitle(st.title || "");
                                setEditSubtaskDescription(st.description || "");
                                const assigneeId = st.assignee?._id || st.assignee || "";
                                setEditSubtaskAssigneeId(assigneeId);
                                setEditSubtaskPriority((st.priority as "low" | "medium" | "high" | "urgent") || "medium");
                                const start = st.startDate ? new Date(st.startDate) : null;
                                const end = st.dueDate ? new Date(st.dueDate) : null;
                                setEditSubtaskProjectStart(start);
                                setEditSubtaskProjectEnd(end);
                                setEditSubtaskStartDate(start ? start.toISOString() : "");
                                setEditSubtaskEndDate(end ? end.toISOString() : "");
                                setShowEditSubtask(true);
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Reject Dialog - Redesigned to match AddProjectModal */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 rounded-[16px] max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-white px-[24px] pt-[24px] pb-0 shrink-0">
            <div className="flex items-start gap-[10px] mb-[10px]">
              <div className="w-[48px] h-[48px] rounded-[10px] bg-[rgba(239,68,68,0.1)] flex items-center justify-center shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <DialogHeader className="p-0 space-y-[4px]">
              <DialogTitle className="text-[16px] font-semibold font-['Inter'] text-[#181d27] leading-[24px]">
                Reject Task
              </DialogTitle>
              <DialogDescription className="text-[14px] font-normal font-['Inter'] text-[#535862] leading-[20px]">
                Provide a reason and set a new due date for this task
              </DialogDescription>
            </DialogHeader>
            <div className="h-[20px]" />
          </div>

          {/* Form Content - Scrollable */}
          <div className="px-[24px] pr-[14px] overflow-y-auto flex-1">
            <div className="pr-[10px] space-y-[16px] pb-[16px]">
              {/* Rejection Reason */}
              <div className="space-y-[6px]">
                <label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                  Rejection Reason <span className="text-[#cd2818] font-['Work_Sans']">*</span>
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this task is being rejected..."
                  rows={4}
                  className="border-[#d5d7da] rounded-[8px] px-[14px] py-[10px] text-[14px] font-['Inter'] placeholder:text-[#717680] resize-none"
                />
              </div>

              {/* New Due Date - Required */}
              <div className="space-y-[6px]">
                <label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                  New Due Date <span className="text-[#cd2818] font-['Work_Sans']">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] text-[14px] font-['Inter'] justify-start text-left font-normal ${!rejectProjectEnd && "text-[#717680]"
                        }`}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {rejectProjectEnd ? formatDate(rejectProjectEnd.toISOString()) : "Pick a date"}
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
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Reassign To (Optional) */}
              <div className="space-y-[6px]">
                <label className="text-[14px] font-medium font-['Inter'] text-[#414651] leading-[20px]">
                  Reassign To (Optional)
                </label>
                <Select value={rejectReassigneeId} onValueChange={setRejectReassigneeId}>
                  <SelectTrigger className="h-[44px] border-[#d5d7da] rounded-[8px] px-[14px] py-[8px] font-['Inter'] text-[14px]">
                    <SelectValue placeholder="Keep current assignee" />
                  </SelectTrigger>
                  <SelectContent className="font-['Inter']">
                    {assignableMembers.map((member) => (
                      <SelectItem key={member._id} value={member._id} className="text-[14px]">
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[12px] font-normal font-['Inter'] text-[#717680]">
                  Leave empty to keep the task with the current assignee
                </p>
              </div>

              {/* ✅ NEW: Rejection Attachment Section - REMOVED */}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-[12px] px-[24px] py-[20px] border-t border-gray-100 shrink-0">
            <Button
              type="button"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
                setRejectReassigneeId("");
                setRejectStartDate("");
                setRejectDueDate("");
                setRejectProjectEnd(null);
                setRejectionFiles([]);
                setRejectionLink("");
                if (rejectionFileInputRef.current) {
                  rejectionFileInputRef.current.value = '';
                }
              }}
              disabled={isRejecting}
              className="flex-1 bg-[rgba(4,1,16,0.05)] hover:bg-[rgba(4,1,16,0.1)] text-[#040110] font-medium font-['Inter'] text-[14px] h-auto px-[15px] py-[10px] rounded-[8px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={isRejecting || !rejectionReason.trim() || !rejectDueDate}
              className="flex-1 bg-[#ef4444] hover:bg-[#dc2626] text-white font-medium font-['Inter'] text-[14px] h-auto px-[15px] py-[10px] rounded-[8px]"
            >
              {isRejecting ? "Rejecting..." : "Reject Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Subtask Dialog */}
      <Dialog open={showCreateSubtask} onOpenChange={setShowCreateSubtask}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold">Create Subtask</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Create a subtask under "<span className="font-medium">{task.title}</span>"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Title */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                placeholder="Enter subtask title"
                className="h-10"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Description</label>
              <Textarea
                value={subtaskDescription}
                onChange={(e) => setSubtaskDescription(e.target.value)}
                placeholder="Enter subtask description"
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Two Column Layout for Assignee and Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Assignee */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Assignee <span className="text-red-500">*</span>
                </label>
                <Select value={subtaskAssigneeId} onValueChange={setSubtaskAssigneeId}>
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableMembers
                      .filter((m) => m.role === 'member' || m.role === 'trainee')
                      .map((m) => (
                        <SelectItem key={m._id} value={m._id}>
                          {m.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Priority <span className="text-red-500">*</span>
                </label>
                <Select
                  value={subtaskPriority}
                  onValueChange={(val) =>
                    setSubtaskPriority(val as "low" | "medium" | "high" | "urgent")
                  }
                >
                  <SelectTrigger className="h-10 bg-white">
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

            {/* Date Pickers Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-10 justify-start text-left font-normal bg-white hover:bg-gray-50"
                    >
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      {subtaskProjectStart
                        ? format(subtaskProjectStart, "PPP")
                        : "Pick start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={subtaskProjectStart || undefined}
                      onSelect={(date) => {
                        setSubtaskProjectStart(date || null);
                        if (date) {
                          setSubtaskStartDate(date.toISOString());
                        }
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dateToCheck = new Date(date);
                        dateToCheck.setHours(0, 0, 0, 0);
                        const taskStart = task.startDate ? new Date(task.startDate) : null;
                        if (taskStart) taskStart.setHours(0, 0, 0, 0);
                        const taskDue = task.dueDate ? new Date(task.dueDate) : null;
                        if (taskDue) taskDue.setHours(0, 0, 0, 0);

                        // Disable past dates (but allow today)
                        if (dateToCheck < today) return true;

                        // Disable dates outside parent task range
                        if (taskStart && dateToCheck < taskStart) return true;
                        if (taskDue && dateToCheck > taskDue) return true;

                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-10 justify-start text-left font-normal bg-white hover:bg-gray-50"
                    >
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      {subtaskProjectEnd
                        ? format(subtaskProjectEnd, "PPP")
                        : "Pick due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={subtaskProjectEnd || undefined}
                      onSelect={(date) => {
                        setSubtaskProjectEnd(date || null);
                        if (date) {
                          setSubtaskEndDate(date.toISOString());
                        }
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dateToCheck = new Date(date);
                        dateToCheck.setHours(0, 0, 0, 0);
                        const taskStart = task.startDate ? new Date(task.startDate) : null;
                        if (taskStart) taskStart.setHours(0, 0, 0, 0);
                        const taskDue = task.dueDate ? new Date(task.dueDate) : null;
                        if (taskDue) taskDue.setHours(0, 0, 0, 0);
                        const selectedStart = subtaskProjectStart ? new Date(subtaskProjectStart) : null;
                        if (selectedStart) selectedStart.setHours(0, 0, 0, 0);

                        // Disable past dates (but allow today)
                        if (dateToCheck < today) return true;

                        // Disable dates before selected start date
                        if (selectedStart && dateToCheck < selectedStart) return true;

                        // Disable dates outside parent task range
                        if (taskStart && dateToCheck < taskStart) return true;
                        if (taskDue && dateToCheck > taskDue) return true;

                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateSubtask(false);
                setSubtaskTitle("");
                setSubtaskDescription("");
                setSubtaskAssigneeId("");
                setSubtaskStartDate("");
                setSubtaskEndDate("");
                setSubtaskProjectStart(null);
                setSubtaskProjectEnd(null);
                setSubtaskPriority("medium");
              }}
              disabled={isCreatingSubtask}
              className="w-full sm:w-auto h-10 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubtask}
              disabled={isCreatingSubtask || !subtaskTitle || !subtaskAssigneeId || !subtaskStartDate || !subtaskEndDate}
              className="w-full sm:w-auto bg-[#007aff] hover:bg-[#0066cc] text-white h-10 font-semibold"
            >
              {isCreatingSubtask ? "Creating..." : "Create Subtask"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditSubtask}
        onOpenChange={(open) => {
          setShowEditSubtask(open);
          if (!open) {
            setEditingSubtask(null);
            setEditSubtaskTitle("");
            setEditSubtaskDescription("");
            setEditSubtaskAssigneeId("");
            setEditSubtaskPriority("medium");
            setEditSubtaskStartDate("");
            setEditSubtaskEndDate("");
            setEditSubtaskProjectStart(null);
            setEditSubtaskProjectEnd(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold">Edit Subtask</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Update the subtask under "<span className="font-medium">{task.title}</span>"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                value={editSubtaskTitle}
                onChange={(e) => setEditSubtaskTitle(e.target.value)}
                placeholder="Enter subtask title"
                className="h-10"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Description</label>
              <Textarea
                value={editSubtaskDescription}
                onChange={(e) => setEditSubtaskDescription(e.target.value)}
                placeholder="Enter subtask description"
                className="min-h-[100px] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Assignee <span className="text-red-500">*</span>
                </label>
                <Select value={editSubtaskAssigneeId} onValueChange={setEditSubtaskAssigneeId}>
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableMembers
                      .filter((m) => m.role === "member" || m.role === "trainee")
                      .map((m) => (
                        <SelectItem key={m._id} value={m._id}>
                          {m.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Priority <span className="text-red-500">*</span>
                </label>
                <Select
                  value={editSubtaskPriority}
                  onValueChange={(val) =>
                    setEditSubtaskPriority(val as "low" | "medium" | "high" | "urgent")
                  }
                >
                  <SelectTrigger className="h-10 bg-white">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-10 justify-start text-left font-normal bg-white hover:bg-gray-50"
                    >
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      {editSubtaskProjectStart ? format(editSubtaskProjectStart, "PPP") : "Pick start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={editSubtaskProjectStart || undefined}
                      onSelect={(date) => {
                        setEditSubtaskProjectStart(date || null);
                        if (date) {
                          setEditSubtaskStartDate(date.toISOString());
                        }
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dateToCheck = new Date(date);
                        dateToCheck.setHours(0, 0, 0, 0);
                        const taskStart = task.startDate ? new Date(task.startDate) : null;
                        if (taskStart) taskStart.setHours(0, 0, 0, 0);
                        const taskDue = task.dueDate ? new Date(task.dueDate) : null;
                        if (taskDue) taskDue.setHours(0, 0, 0, 0);

                        if (dateToCheck < today) return true;
                        if (taskStart && dateToCheck < taskStart) return true;
                        if (taskDue && dateToCheck > taskDue) return true;

                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-10 justify-start text-left font-normal bg-white hover:bg-gray-50"
                    >
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      {editSubtaskProjectEnd ? format(editSubtaskProjectEnd, "PPP") : "Pick due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={editSubtaskProjectEnd || undefined}
                      onSelect={(date) => {
                        setEditSubtaskProjectEnd(date || null);
                        if (date) {
                          setEditSubtaskEndDate(date.toISOString());
                        }
                      }}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dateToCheck = new Date(date);
                        dateToCheck.setHours(0, 0, 0, 0);
                        const taskStart = task.startDate ? new Date(task.startDate) : null;
                        if (taskStart) taskStart.setHours(0, 0, 0, 0);
                        const taskDue = task.dueDate ? new Date(task.dueDate) : null;
                        if (taskDue) taskDue.setHours(0, 0, 0, 0);
                        const selectedStart = editSubtaskProjectStart ? new Date(editSubtaskProjectStart) : null;
                        if (selectedStart) selectedStart.setHours(0, 0, 0, 0);

                        if (dateToCheck < today) return true;
                        if (selectedStart && dateToCheck < selectedStart) return true;
                        if (taskStart && dateToCheck < taskStart) return true;
                        if (taskDue && dateToCheck > taskDue) return true;

                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditSubtask(false);
                setEditingSubtask(null);
                setEditSubtaskTitle("");
                setEditSubtaskDescription("");
                setEditSubtaskAssigneeId("");
                setEditSubtaskPriority("medium");
                setEditSubtaskStartDate("");
                setEditSubtaskEndDate("");
                setEditSubtaskProjectStart(null);
                setEditSubtaskProjectEnd(null);
              }}
              disabled={isUpdatingSubtask}
              className="w-full sm:w-auto h-10 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editingSubtask) return;
                if (!editSubtaskTitle) {
                  toast.error("Subtask title is required");
                  return;
                }

                if (editSubtaskStartDate && editSubtaskEndDate) {
                  const startDate = new Date(editSubtaskStartDate);
                  startDate.setHours(0, 0, 0, 0);
                  const endDate = new Date(editSubtaskEndDate);
                  endDate.setHours(0, 0, 0, 0);

                  if (startDate > endDate) {
                    toast.error("End date must be after or equal to start date");
                    return;
                  }

                  if (task) {
                    const taskStartDate = new Date(task.startDate);
                    taskStartDate.setHours(0, 0, 0, 0);
                    const taskDueDate = new Date(task.dueDate);
                    taskDueDate.setHours(0, 0, 0, 0);

                    if (startDate < taskStartDate || endDate > taskDueDate) {
                      toast.error(
                        "Subtask dates must be within the parent task date range (including task start and end dates)"
                      );
                      return;
                    }
                  }
                }

                setIsUpdatingSubtask(true);
                try {
                  const res = await fetch(buildApiUrl(`/task/subtask/${editingSubtask._id}`), {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                      "Content-Type": "application/json",
                      "workspace-id": localStorage.getItem("currentWorkspaceId") || "",
                    },
                    body: JSON.stringify({
                      title: editSubtaskTitle,
                      description: editSubtaskDescription,
                      assigneeId: editSubtaskAssigneeId || undefined,
                      priority: editSubtaskPriority,
                      startDate: editSubtaskStartDate || undefined,
                      dueDate: editSubtaskEndDate || undefined,
                    }),
                  });

                  if (res.ok) {
                    toast.success("Subtask updated");
                    setShowEditSubtask(false);
                    setEditingSubtask(null);
                    setEditSubtaskTitle("");
                    setEditSubtaskDescription("");
                    setEditSubtaskAssigneeId("");
                    setEditSubtaskPriority("medium");
                    setEditSubtaskStartDate("");
                    setEditSubtaskEndDate("");
                    setEditSubtaskProjectStart(null);
                    setEditSubtaskProjectEnd(null);
                    await fetchSubtasks();
                  } else {
                    const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
                    toast.error(errorData.message || "Failed to update subtask");
                  }
                } catch (e: any) {
                  toast.error(e?.message || "Failed to update subtask");
                } finally {
                  setIsUpdatingSubtask(false);
                }
              }}
              disabled={
                isUpdatingSubtask ||
                !editSubtaskTitle ||
                !editSubtaskAssigneeId ||
                !editSubtaskStartDate ||
                !editSubtaskEndDate
              }
              className="w-full sm:w-auto bg-[#007aff] hover:bg-[#0066cc] text-white h-10 font-semibold"
            >
              {isUpdatingSubtask ? "Updating..." : "Update Subtask"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Task Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Reassign Task</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Assign this task to a different team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
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
                Due Date (Required)
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
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowReassignDialog(false);
                setReassignAssigneeId("");
                setReassignDueDate("");
              }}
              disabled={isReassigning}
              className="w-full sm:w-auto h-9 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReassignTask}
              disabled={isReassigning || !reassignAssigneeId || !reassignDueDate}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
            >
              {isReassigning ? "Reassigning..." : "Reassign Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Put Task on Hold Dialog */}
      <Dialog open={showHoldDialog} onOpenChange={setShowHoldDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Put Task on Hold</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Temporarily pause this task and provide a reason (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Reason (Optional)
              </label>
              <Textarea
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="Why is this task being put on hold?"
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowHoldDialog(false);
                setHoldReason("");
              }}
              disabled={isHolding}
              className="w-full sm:w-auto h-9 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePutOnHold}
              disabled={isHolding}
              className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-white h-9 text-sm"
            >
              {isHolding ? "Putting on hold..." : "Put on Hold"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resume Task Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Resume Task</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {endDateCrossed
                ? "The end date has passed during hold. Please set a new end date."
                : "Resume work on this task"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            {endDateCrossed && (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> The task end date was crossed while on hold. As a reporting manager, you must set a new end date.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    New End Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={resumeNewEndDate}
                    onChange={(e) => setResumeNewEndDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full h-9 border-input rounded-md px-3 py-1"
                  />
                </div>
              </>
            )}
            {!endDateCrossed && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  This task will be resumed and set back to "in-progress" status.
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowResumeDialog(false);
                setResumeNewEndDate("");
                setEndDateCrossed(false);
              }}
              disabled={isResuming}
              className="w-full sm:w-auto h-9 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResume}
              disabled={isResuming || (endDateCrossed && !resumeNewEndDate)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
            >
              {isResuming ? "Resuming..." : "Resume Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskDetail;
