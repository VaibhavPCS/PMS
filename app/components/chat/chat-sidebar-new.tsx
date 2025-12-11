import React, { useState } from 'react';
import { MessageCircle, Plus, MoreVertical, Search, Filter, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import CreateChatModal from './create-chat-modal';
import { useAuth } from '@/provider/auth-context';
import { cn } from '@/lib/utils';

interface Chat {
  _id: string;
  name?: string;
  type: 'direct' | 'group';
  participants: Array<{
    user: {
      _id: string;
      name: string;
      email: string;
      profilePicture?: string;
    };
    role: 'admin' | 'member';
    joinedAt: string;
  }>;
  lastMessage?: {
    _id: string;
    content: string;
    sender: {
      _id: string;
      name: string;
    };
    createdAt: string;
  };
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatSidebarNewProps {
  chats: Chat[];
  activeChat: Chat | null;
  onChatSelect: (chat: Chat) => void;
  onRefresh: () => void;
  onChatCreated?: (chat?: any) => void;
}

const ChatSidebarNew: React.FC<ChatSidebarNewProps> = ({
  chats,
  activeChat,
  onChatSelect,
  onRefresh,
  onChatCreated
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'groups'>('all');
  const { user } = useAuth();
  const currentUserId = (user as any)?._id || (user as any)?.id;

  const getChatName = (chat: Chat) => {
    if (chat.name) return chat.name;
    if (chat.type === 'direct') {
      const other = chat.participants.find(p => {
        const pId = (p.user as any)?._id || (p.user as any)?.id || p.user;
        return pId !== currentUserId;
      });
      return other?.user?.name || 'Direct message';
    }
    return chat.participants.map(p => p.user.name).filter(Boolean).join(', ');
  };

  // Filter chats based on search and tab
  const filteredChats = chats.filter(chat => {
    // Search filter
    const chatName = getChatName(chat);

    const matchesSearch = chatName.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // Tab filter
    if (activeTab === 'unread') {
      return chat.unreadCount && chat.unreadCount > 0;
    }
    if (activeTab === 'groups') {
      return chat.type === 'group';
    }
    return true; // 'all' tab
  });

  const totalUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);

  const getChatNameOriginal = (chat: Chat) => getChatName(chat);

  const formatUnread = (count?: number) => {
    if (!count || count <= 0) return null;
    return count > 4 ? '4+' : String(count);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d`;

    // Format as date
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'group') {
      return (
        <div className="relative w-10 h-10 rounded-full bg-gradient-to-b from-[#344bfd] to-[#4a8cd7] flex items-center justify-center">
          <span className="text-white text-base font-medium">
            {getInitials(chat.name || 'G')}
          </span>
        </div>
      );
    }

    const otherParticipant = chat.participants.find(p => {
      const pId = (p.user as any)?._id || (p.user as any)?.id || p.user;
      return pId !== currentUserId;
    });
    if (!otherParticipant) return null;

    return (
      <Avatar className="w-10 h-10">
        {otherParticipant.user.profilePicture && (
          <AvatarImage src={otherParticipant.user.profilePicture} alt={otherParticipant.user.name} />
        )}
        <AvatarFallback className="bg-gradient-to-b from-[#344bfd] to-[#4a8cd7] text-white text-base font-medium">
          {getInitials(otherParticipant.user.name)}
        </AvatarFallback>
      </Avatar>
    );
  };

  const truncateMessage = (content: string, maxLength: number = 45) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // Check if content looks like base64 or encoded data
  const isEncodedContent = (content: string): boolean => {
    if (!content || content.length < 20) return false;
    // Check for base64-like patterns (mostly alphanumeric with +/= characters)
    const base64Pattern = /^[A-Za-z0-9+/=]{20,}$/;
    // Check for very long strings without spaces (likely encoded)
    const hasNoSpaces = !content.includes(' ') && content.length > 30;
    return base64Pattern.test(content) || hasNoSpaces;
  };

  const getLastMessagePreview = (chat: Chat) => {
    if (!chat.lastMessage) return '';

    const isCurrentUser = chat.lastMessage.sender._id === user?._id;

    // Don't show preview if the current user is the sender
    if (isCurrentUser) {
      return null;
    }

    const senderName = (chat.lastMessage.sender.name || 'Unknown').split(' ')[0];
    let content = chat.lastMessage.content || '';

    // Skip encoded content or placeholder text - only show real text
    if (isEncodedContent(content) || content === 'File attachment') {
      return null;
    }

    content = truncateMessage(content);

    return (
      <>
        <span className="font-normal text-[#949291]">
          {senderName}:
        </span>{' '}
        <span className="font-normal text-[#717182]">
          {content}
        </span>
      </>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4 px-[5px] py-[10px] bg-white">
      {/* Header */}
      <div className="flex flex-col gap-[10px]">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-[2px]">
          <div className="flex items-center gap-[10px]">
            <MessageCircle className="w-6 h-6 text-neutral-700" />
            <h2 className="text-[18px] font-medium text-neutral-700">Chats</h2>
          </div>
          <div className="flex items-center gap-[5px]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="h-6 w-6 p-0 rounded hover:bg-gray-100"
            >
              <Plus className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded hover:bg-gray-100"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-[#f5f4f9] rounded-lg h-[37px] px-[10px] flex items-center justify-between">
          <div className="flex items-center gap-[10px] flex-1">
            <Search className="w-[15px] h-[15px] text-black opacity-60" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-[14px] text-[#040110] opacity-60 flex-1 placeholder:text-[#040110] placeholder:opacity-60"
            />
          </div>
          <div className="flex items-center gap-[10px]">
            <div className="w-0 h-[37px] border-l border-gray-300" />
            <Filter className="w-4 h-4 text-black" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-[10px]">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "flex items-center gap-[10px] px-[10px] py-[7px] rounded-tl-[10px] rounded-tr-[10px] transition-all",
              activeTab === 'all' && "border-b-2 border-[#f2761b]"
            )}
          >
            <span className={cn(
              "text-[14px] font-normal text-[#000d2a]",
              activeTab !== 'all' && "opacity-60"
            )}>
              All
            </span>

          </button>

          <button
            onClick={() => setActiveTab('unread')}
            className={cn(
              "flex items-center px-[10px] py-[7px] rounded-tl-[10px] rounded-tr-[10px] transition-all",
              activeTab === 'unread' && "border-b-2 border-[#f2761b]"
            )}
          >
            <span className={cn(
              "text-[14px] font-normal text-[#000d2a]",
              activeTab !== 'unread' && "opacity-60"
            )}>
              Unread
            </span>
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={cn(
              "flex items-center px-[10px] py-[7px] rounded-tl-[10px] rounded-tr-[10px] transition-all",
              activeTab === 'groups' && "border-b-2 border-[#f2761b]"
            )}
          >
            <span className={cn(
              "text-[14px] font-normal text-[#000d2a]",
              activeTab !== 'groups' && "opacity-60"
            )}>
              Groups
            </span>
          </button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto chat-sidebar-scroll">
        <div className="flex flex-col gap-[8px]">
          {filteredChats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? 'No chats found' : 'No chats yet'}
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isActive = activeChat?._id === chat._id;
              const hasUnread = chat.unreadCount && chat.unreadCount > 0;

              return (
                <div
                  key={chat._id}
                  onClick={() => onChatSelect(chat)}
                  className={cn(
                    "flex items-start gap-[6px] px-[8px] py-[5px] rounded-lg cursor-pointer transition-all",
                    isActive && "bg-[#f2f7ff] border-l-2 border-[#4a8cd7]",
                    !isActive && "pl-[10px]"
                  )}
                >
                  {/* Avatar */}
                  {getChatAvatar(chat)}

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0 px-[5px]">
                    <div className="flex items-start justify-between mb-[6px]">
                      <h3 className={cn(
                        "text-[14px] font-medium text-neutral-700 truncate pr-2",
                        hasUnread && "font-semibold"
                      )}>
                        {getChatName(chat)}
                      </h3>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[12px] font-normal text-[#717182] whitespace-nowrap">
                          {chat.lastMessage ? formatTime(chat.lastMessage.createdAt) : formatTime(chat.createdAt)}
                        </span>
                        {chat.unreadCount !== undefined && chat.unreadCount > 0 && (
                          <div className="bg-[#F2761B] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                            {chat.unreadCount > 4 ? '4+' : chat.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Last message preview - commented out as per user request */}
                    {/* <div className="flex items-end justify-between">
                      <p className="flex-1 text-[12px] font-medium text-[#717178] truncate">
                        {getLastMessagePreview(chat)}
                      </p>
                    </div> */}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Chat Modal */}
      <CreateChatModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onChatCreated={onChatCreated || onRefresh}
        onSelectChat={onChatSelect}
      />
    </div>
  );
};

export default ChatSidebarNew;
