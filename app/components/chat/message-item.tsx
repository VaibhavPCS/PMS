import React, { useState } from "react";
import {
  MoreHorizontal,
  Reply,
  Edit,
  Trash2,
  Heart,
  ThumbsUp,
  Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Socket } from "socket.io-client";
import FilePreview from "@/components/ui/file-preview";

interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
  chat: string;
  replyTo?: {
    _id: string;
    content: string;
    sender: {
      _id: string;
      name: string;
    };
  };
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileType: "image" | "document";
    fileSize: number;
    mimeType: string;
  }>;
  reactions: Array<{
    user: string;
    emoji: string;
  }>;
  isEdited: boolean;
  editedAt?: string;
  readBy: Array<{
    user: string;
    readAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
}

interface MessageItemProps {
  message: Message;
  currentUser: User;
  showAvatar: boolean;
  onReply: (message: Message) => void;
  socket: Socket | null;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUser,
  showAvatar,
  onReply,
  socket,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isOwnMessage = message.sender._id === currentUser._id;

  const handleReaction = (emoji: string) => {
    if (socket) {
      const existingReaction = message.reactions.find(
        (r) => r.user === currentUser._id && r.emoji === emoji
      );

      if (existingReaction) {
        socket.emit("removeReaction", {
          messageId: message._id,
          emoji,
        });
      } else {
        socket.emit("addReaction", {
          messageId: message._id,
          emoji,
        });
      }
    }
  };

  const handleEdit = () => {
    if (socket && editContent.trim() !== message.content) {
      socket.emit("editMessage", {
        messageId: message._id,
        content: editContent.trim(),
      });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (
      socket &&
      window.confirm("Are you sure you want to delete this message?")
    ) {
      socket.emit("deleteMessage", {
        messageId: message._id,
      });
    }
  };

  const getReactionCounts = () => {
    const counts: { [emoji: string]: { count: number; users: string[] } } = {};
    message.reactions.forEach((reaction) => {
      if (!counts[reaction.emoji]) {
        counts[reaction.emoji] = { count: 0, users: [] };
      }
      counts[reaction.emoji].count++;
      counts[reaction.emoji].users.push(reaction.user);
    });
    return counts;
  };

  const reactionCounts = getReactionCounts();

  return (
    <div
      className={`group flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={`flex max-w-[70%] ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
      >
        {/* Avatar */}
        {showAvatar && !isOwnMessage && (
          <Avatar className="w-8 h-8 mr-2 flex-shrink-0">
            {message.sender.profilePicture ? (
              <img
                src={message.sender.profilePicture}
                alt={message.sender.name}
              />
            ) : null}
            <AvatarFallback>{message.sender.name.charAt(0)}</AvatarFallback>
          </Avatar>
        )}

        {!showAvatar && !isOwnMessage && (
          <div className="w-8 mr-2 flex-shrink-0" />
        )}

        {/* Message Content */}
        <div
          className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
        >
          {/* Sender Name and Time */}
          {showAvatar && (
            <div
              className={`flex items-center space-x-2 mb-1 ${isOwnMessage ? "flex-row-reverse space-x-reverse" : ""}`}
            >
              <span className="text-sm font-medium text-gray-900">
                {isOwnMessage ? "You" : message.sender.name}
              </span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(message.createdAt), {
                  addSuffix: true,
                })}
              </span>
              {message.isEdited && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
            </div>
          )}

          {/* Reply To */}
          {message.replyTo && (
            <div
              className={`mb-2 p-2 bg-gray-100 rounded border-l-4 border-gray-300 text-sm ${
                isOwnMessage ? "bg-blue-100 border-blue-300" : ""
              }`}
            >
              <p className="text-xs text-gray-600 font-medium">
                {message.replyTo.sender.name}
              </p>
              <p className="text-gray-700">{message.replyTo.content}</p>
            </div>
          )}

          {/* Message Bubble */}
          <div className="relative">
            <div
              className={`px-3 py-2 rounded-lg ${
                isOwnMessage
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 border rounded resize-none text-gray-900"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={handleEdit}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
            </div>

            {/* Action Buttons */}
            {showActions && !isEditing && (
              <div
                className={`absolute top-0 ${isOwnMessage ? "left-0 -translate-x-full" : "right-0 translate-x-full"} flex items-center space-x-1 bg-white border rounded-lg shadow-lg p-1`}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReaction("👍")}
                  className="h-6 w-6 p-0"
                >
                  <ThumbsUp className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReaction("❤️")}
                  className="h-6 w-6 p-0"
                >
                  <Heart className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply(message)}
                  className="h-6 w-6 p-0"
                >
                  <Reply className="w-3 h-3" />
                </Button>
                {isOwnMessage && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {message.attachments.length > 0 && (
            <FilePreview attachments={message.attachments} />
          )}

          {/* Reactions */}
          {Object.keys(reactionCounts).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(reactionCounts).map(([emoji, data]) => {
                const hasReacted = data.users.includes(currentUser._id);
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs border ${
                      hasReacted
                        ? "bg-blue-100 border-blue-300 text-blue-700"
                        : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{data.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Read Status */}
          {isOwnMessage && message.readBy.length > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              Read by {message.readBy.length}{" "}
              {message.readBy.length === 1 ? "person" : "people"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
