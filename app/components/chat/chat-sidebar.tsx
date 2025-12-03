import React, { useState } from 'react';
import { Search, Plus, Users, MessageCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import CreateChatModal from './create-chat-modal';
import { useAuth } from '@/provider/auth-context';

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
  workspace: {
    _id: string;
    name: string;
  };
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

interface ChatSidebarProps {
  chats: Chat[];
  activeChat: Chat | null;
  onChatSelect: (chat: Chat) => void;
  onRefresh: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  activeChat,
  onChatSelect,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user } = useAuth();

  const filteredChats = chats.filter(chat => {
    let chatName = chat.name || '';
    if (!chatName) {
      if (chat.type === 'direct') {
        const other = Array.isArray(chat.participants)
          ? chat.participants.find(p => p.user && String(p.user._id) !== String(user?._id))
          : undefined;
        chatName = other?.user?.name || '';
      } else {
        const names = Array.isArray(chat.participants)
          ? chat.participants.map(p => (p.user && p.user.name) ? p.user.name : '').filter(Boolean)
          : [];
        chatName = names.join(', ');
      }
    }
    return chatName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getChatName = (chat: Chat) => {
    if (chat.name) return chat.name;
    if (chat.type === 'direct') {
      const other = Array.isArray(chat.participants)
        ? chat.participants.find(p => p.user && String(p.user._id) !== String(user?._id))
        : undefined;
      return other?.user?.name || 'Direct message';
    }
    const participantNames = Array.isArray(chat.participants)
      ? chat.participants.map(p => (p.user && p.user.name) ? p.user.name : '').filter(Boolean)
      : [];
    return participantNames.join(', ');
  };

  const formatUnread = (count?: number) => {
    if (!count || count <= 0) return '';
    return count > 4 ? '4+' : String(count);
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.type === 'group') {
      return (
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
      );
    }
    
    const otherParticipant = Array.isArray(chat.participants)
      ? chat.participants.find(p => p.user && p.user._id !== user?._id)
      : undefined;
    if (otherParticipant?.user.profilePicture) {
      return (
        <Avatar className="w-10 h-10">
          <img src={otherParticipant.user.profilePicture} alt={otherParticipant.user.name} />
          <AvatarFallback>{otherParticipant.user.name.charAt(0)}</AvatarFallback>
        </Avatar>
      );
    }
    
    return (
      <Avatar className="w-10 h-10">
        <AvatarFallback>
          {otherParticipant?.user.name.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>
    );
  };

  const truncateMessage = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="h-8 w-8 p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? 'No chats found' : 'No chats yet'}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredChats.map((chat) => (
              <div
                key={chat._id}
                onClick={() => onChatSelect(chat)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  activeChat?._id === chat._id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Avatar */}
                  {getChatAvatar(chat)}

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {getChatName(chat)}
                      </h3>
                      {chat.unreadCount && chat.unreadCount > 0 && (
                        <Badge className="ml-2 text-[10px] px-2 py-0.5">
                          {formatUnread(chat.unreadCount)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Chat Modal */}
      <CreateChatModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onChatCreated={onRefresh}
      />
    </div>
  );
};

export default ChatSidebar;
