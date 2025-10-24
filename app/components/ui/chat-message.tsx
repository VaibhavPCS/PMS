import React, { useState } from 'react';
import { Reply, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { Avatar } from './avatar';
import FilePreview from './file-preview';
import { formatDistanceToNow } from 'date-fns';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Comment {
  _id: string;
  content: string;
  author: User;
  task: string;
  parentComment?: {
    _id: string;
    content: string;
    author: User;
  };
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileType: 'image' | 'document';
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

interface ChatMessageProps {
  comment: Comment;
  currentUser: User;
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
}

const ChatMessage: React.FC<ChatMessageProps> = ({
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
  onLoadReplies
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const isOwnMessage = comment.author._id === currentUser._id;
  const hasReplies = comment.replyCount && comment.replyCount > 0;

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
      {/* Main Message */}
      <div className={`flex space-x-3 p-3 rounded-lg hover:bg-gray-50 ${
        isOwnMessage ? 'bg-blue-50' : 'bg-white'
      }`}>
        {/* Avatar */}
        <Avatar className="w-8 h-8 flex-shrink-0">
          <img 
            src={comment.author.avatar || `https://ui-avatars.io/api/?name=${encodeURIComponent(comment.author.name)}&background=0284c7&color=fff`}
            alt={comment.author.name}
            className="w-full h-full object-cover"
          />
        </Avatar>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-sm">{comment.author.name}</span>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              {comment.isEdited && (
                <span className="ml-1 text-xs text-gray-400">(edited)</span>
              )}
            </span>
          </div>

          {/* Reply Indicator */}
          {comment.parentComment && (
            <div className="mb-2 p-2 bg-gray-100 rounded border-l-4 border-gray-300">
              <div className="text-xs text-gray-600">
                Replying to <span className="font-medium">{comment.parentComment.author.name}</span>
              </div>
              <div className="text-sm text-gray-700 truncate">
                {comment.parentComment.content.length > 50 
                  ? `${comment.parentComment.content.substring(0, 50)}...` 
                  : comment.parentComment.content
                }
              </div>
            </div>
          )}

          {/* Message Content */}
          {isEditing ? (
            <div className="mb-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Edit your message..."
              />
              <div className="flex space-x-2 mt-2">
                <Button size="sm" onClick={handleEdit}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-900 mb-2 whitespace-pre-wrap">
              {comment.content}
            </div>
          )}

          {/* File Attachments */}
          {comment.attachments && comment.attachments.length > 0 && (
            <FilePreview attachments={comment.attachments} />
          )}

          {/* Actions */}
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {canReply && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onReply(comment)}
                className="text-xs h-6 px-2"
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
                className="text-xs h-6 px-2"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
            {canDelete && isOwnMessage && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(comment._id)}
                className="text-xs h-6 px-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            )}
          </div>

          {/* Reply Toggle */}
          {hasReplies && (
            <div className="mt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleExpand}
                className="text-xs h-6 px-2 text-blue-600 hover:text-blue-700"
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

      {/* Nested Replies */}
      {hasReplies && isExpanded && (
        <div className="ml-11 mt-2 space-y-2 border-l-2 border-gray-200 pl-4">
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
              onToggleExpand={() => {}} // Replies don't have nested replies
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
