import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, MoreVertical, Users, Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { Socket, io } from 'socket.io-client';
import MessageItem from './message-item';

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
}

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
    fileType: 'image' | 'document';
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

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  currentUser: User;
  onSendMessage: (content: string, attachments?: File[], replyTo?: string) => void;
  socket: Socket | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  messages,
  currentUser,
  onSendMessage,
  socket
}) => {
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (socket) {
      socket.on('typing', (data: { userId: string; userName: string; chatId: string }) => {
        if (data.chatId === chat._id && data.userId !== currentUser._id) {
          setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userName]);
        }
      });

      socket.on('stopTyping', (data: { userId: string; chatId: string }) => {
        if (data.chatId === chat._id) {
          setTypingUsers(prev => prev.filter(name => name !== data.userId));
        }
      });

      return () => {
        socket.off('typing');
        socket.off('stopTyping');
      };
    }
  }, [socket, chat._id, currentUser._id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getChatName = () => {
    if (chat.name) return chat.name;
    return chat.participants
      .filter(p => p.user._id !== currentUser._id)
      .map(p => p.user.name)
      .join(', ');
  };

  const getChatAvatar = () => {
    if (chat.type === 'group') {
      return (
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <Users className="w-4 h-4 text-white" />
        </div>
      );
    }
    
    const otherParticipant = chat.participants.find(p => p.user._id !== currentUser._id);
    if (otherParticipant?.user.profilePicture) {
      return (
        <Avatar className="w-8 h-8">
          <img src={otherParticipant.user.profilePicture} alt={otherParticipant.user.name} />
          <AvatarFallback>{otherParticipant.user.name.charAt(0)}</AvatarFallback>
        </Avatar>
      );
    }
    
    return (
      <Avatar className="w-8 h-8">
        <AvatarFallback>
          {otherParticipant?.user.name.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>
    );
  };

  const handleSendMessage = () => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim(), undefined, replyTo?._id);
      setMessageText('');
      setReplyTo(null);
      
      // Stop typing indicator
      if (socket) {
        socket.emit('stopTyping', { chatId: chat._id });
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = (value: string) => {
    setMessageText(value);
    
    if (socket) {
      if (value.trim() && !isTyping) {
        setIsTyping(true);
        socket.emit('typing', { chatId: chat._id });
        
        // Stop typing after 3 seconds of inactivity
        setTimeout(() => {
          setIsTyping(false);
          socket.emit('stopTyping', { chatId: chat._id });
        }, 3000);
      } else if (!value.trim() && isTyping) {
        setIsTyping(false);
        socket.emit('stopTyping', { chatId: chat._id });
      }
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onSendMessage(messageText.trim() || 'File attachment', files, replyTo?._id);
      setMessageText('');
      setReplyTo(null);
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getChatAvatar()}
            <div>
              <h3 className="font-medium text-gray-900">{getChatName()}</h3>
              <p className="text-sm text-gray-500">
                {chat.type === 'group' 
                  ? `${chat.participants.length} employees`
                  : 'Direct message'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => {
            const showAvatar = index === 0 || 
              messages[index - 1].sender._id !== message.sender._id ||
              new Date(message.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 300000; // 5 minutes

            return (
              <MessageItem
                key={message._id}
                message={message}
                currentUser={currentUser}
                showAvatar={showAvatar}
                onReply={handleReply}
                socket={socket}
              />
            );
          })}
          
          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply Preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-500">Replying to {replyTo.sender.name}</p>
              <p className="text-sm text-gray-700 truncate">{replyTo.content}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={cancelReply} className="h-6 w-6 p-0">
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFileSelect}
            className="h-8 w-8 p-0 flex-shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <div className="flex-1">
            <Input
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyPress={handleKeyPress}
              className="resize-none"
            />
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0"
          >
            <Smile className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            size="sm"
            className="flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
    </div>
  );
};

export default ChatWindow;