import React, { useState } from "react";
import { Reply } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Socket } from "socket.io-client";
import FilePreview from "@/components/ui/file-preview";
import { cn } from "@/lib/utils";

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
    originalName?: string;
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

  const senderId = typeof (message as any).sender === 'string'
    ? (message as any).sender
    : (message as any).sender?._id;
  const isOwnMessage = String(senderId || '') === String(currentUser?._id || '');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimeStamp = (date: string) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatDistanceToNow(messageDate, { addSuffix: true });
    } else {
      const formatter = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      return formatter.format(messageDate);
    }
  };

  const shouldHideMessageBubble = (message.attachments && message.attachments.length > 0) && (
    (message.content || '').trim().toLowerCase() === 'file attachment' || (message.content || '').trim() === ''
  );

  return (
    <div
      className="w-full"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header Row - Name and Time */}
      <div className={cn(
        "flex items-center mb-[8px] sm:mb-[10px]",
        isOwnMessage ? "justify-end" : "justify-between"
      )}>
        {/* Left Side - Sender Info */}
        {!isOwnMessage && (
          <div className="flex items-center gap-[10px] sm:gap-[15px]">
            <div className="flex items-center gap-[6px] sm:gap-[8px]">
              {showAvatar && (
                <Avatar className="w-[24px] h-[24px] sm:w-[28px] sm:h-[28px] rounded-[20px] shrink-0">
                  {message.sender.profilePicture ? (
                    <img
                      src={message.sender.profilePicture}
                      alt={message.sender.name}
                      className="rounded-[20px] object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-b from-[#344bfd] to-[#4a8cd7] text-white text-[11px] sm:text-[13px] font-medium rounded-[20px]">
                    {getInitials(message.sender.name)}
                  </AvatarFallback>
                </Avatar>
              )}
              {!showAvatar && <div className="w-[24px] sm:w-[28px]" />}
              <p className="font-['Inter'] font-normal text-[13px] sm:text-[14px] text-black leading-normal">
                {message.sender.name}
              </p>
            </div>
            <div className="flex items-center gap-[5px]">
              <div className="w-[4px] sm:w-[5px] h-[4px] sm:h-[5px] rounded-full bg-gray-400"></div>
              <p className="font-['Inter'] font-normal text-[11px] sm:text-[12px] text-[#717182] leading-normal whitespace-nowrap">
                {formatTimeStamp(message.createdAt)}
              </p>
            </div>
          </div>
        )}

        {/* Right Side - Own Messages */}
        {isOwnMessage && (
          <div className="flex items-center gap-[10px] sm:gap-[15px]">
            <div className="flex items-center gap-[5px]">
              <p className="font-['Inter'] font-normal text-[11px] sm:text-[12px] text-[#717182] leading-normal whitespace-nowrap">
                {formatTimeStamp(message.createdAt)}
              </p>
              <div className="w-[4px] sm:w-[5px] h-[4px] sm:h-[5px] rounded-full bg-gray-400"></div>
            </div>
            <div className="flex items-center gap-[6px] sm:gap-[8px]">
              <p className="font-['Inter'] font-normal text-[13px] sm:text-[14px] text-black leading-normal">
                You
              </p>
              {showAvatar && (
                <Avatar className="w-[24px] h-[24px] sm:w-[28px] sm:h-[28px] rounded-[20px] shrink-0">
                  {message.sender.profilePicture ? (
                    <img
                      src={message.sender.profilePicture}
                      alt="You"
                      className="rounded-[20px] object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-b from-[#344bfd] to-[#4a8cd7] text-white text-[11px] sm:text-[13px] font-medium rounded-[20px]">
                    {getInitials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
              )}
              {!showAvatar && <div className="w-[24px] sm:w-[28px]" />}
            </div>
          </div>
        )}

        {/* Reply Button */}
        {showActions && !isOwnMessage && (
          <button
            onClick={() => onReply(message)}
            className="bg-[#d4c5ff] flex items-center gap-[5px] px-[8px] py-[4px] rounded-[8px] shrink-0 hover:bg-[#c5b3f0] transition-colors"
          >
            <Reply className="w-[14px] sm:w-[16px] h-[14px] sm:h-[16px] text-neutral-700" />
            <span className="font-['Inter'] font-normal text-[11px] sm:text-[12px] text-neutral-700 leading-normal hidden sm:inline">
              Reply
            </span>
          </button>
        )}
      </div>

      {/* Message Content Row */}
      <div className={cn(
       "flex items-center w-full",
        isOwnMessage ? "justify-end pr-[0px] sm:pr-[35px]" : "justify-start pl-[0px] sm:pl-[35px]"
      )}>
        <div className={cn(
          "max-w-[350px] w-auto",
          !shouldHideMessageBubble && (
            isOwnMessage
              ? "bg-[#DCF8C6] rounded-bl-[8px] rounded-br-[8px] rounded-tl-[8px] px-[10px] py-[8px] sm:px-[12px] sm:py-[10px]"
              : "bg-[#f1f2f7] rounded-bl-[8px] rounded-br-[8px] rounded-tr-[8px] px-[10px] py-[8px] sm:px-[12px] sm:py-[10px]"
          )
        )}>
          {/* Reply To */}
          {message.replyTo && (
            <div className="mb-[8px] p-[8px] rounded-[6px] border-l-[3px] bg-white/50 border-[#4a8cd7]">
              <p className="text-[10px] sm:text-[11px] text-[#717182] font-['Inter'] font-medium">
                {message.replyTo.sender.name}
              </p>
              <p className="text-[11px] sm:text-[12px] text-neutral-700 font-['Inter'] mt-[2px] line-clamp-2">
                {message.replyTo.content}
              </p>
            </div>
          )}

          {/* Message Content */}
          {!shouldHideMessageBubble && (
            <div
              className="font-['Inter'] font-normal text-[13px] sm:text-[14px] text-neutral-700 leading-[1.5] break-words message-content"
              dangerouslySetInnerHTML={{ __html: message.content }}
            />
          )}

          {/* Attachments */}
          {message.attachments.length > 0 && (
            <div className={!shouldHideMessageBubble ? "mt-[10px]" : ""}>
              <FilePreview attachments={message.attachments} />
            </div>
          )}

          {/* Edited Indicator */}
          {message.isEdited && !shouldHideMessageBubble && (
            <p className="text-[10px] sm:text-[11px] text-gray-400 font-['Inter'] mt-[4px] italic">
              (edited)
            </p>
          )}
        </div>
      </div>

      {/* Read Status */}
      {isOwnMessage && message.readBy.length > 0 && (
        <div className="flex justify-end mt-[4px] pr-[0px] sm:pr-[35px]">
          <p className="text-[10px] sm:text-[11px] text-gray-400 font-['Inter']">
            Read by {message.readBy.length}
          </p>
        </div>
      )}
    </div>
  );
};

export default MessageItem;
