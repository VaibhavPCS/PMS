import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../provider/auth-context';
import { fetchData, postData, postMultipart } from '@/lib/fetch-util';
import ChatSidebarNew from '../../components/chat/chat-sidebar-new';
import ChatWindow from '../../components/chat/chat-window';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

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
  workspace?: {
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

const Chat: React.FC = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isConnectingRef = useRef(false);
  const activeChatRef = useRef<Chat | null>(null);
  const pendingChatJoinRef = useRef<string | null>(null);

  // Keep activeChatRef in sync with activeChat state
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Listen for custom new-message events from chat window
  useEffect(() => {
    const handleNewMessageEvent = (event: CustomEvent) => {
      const { message, chatId } = event.detail;
      if (activeChat && chatId === activeChat._id) {
        setMessages(prev => [...prev, message]);
      }
    };

    window.addEventListener('chat:new-message', handleNewMessageEvent as EventListener);

    return () => {
      window.removeEventListener('chat:new-message', handleNewMessageEvent as EventListener);
    };
  }, [activeChat]);

  useEffect(() => {
    if (!user) {
      // Cleanup when no user
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      isConnectingRef.current = false;
      return;
    }

    // Already connected or connecting
    if (socketRef.current || isConnectingRef.current) {
      return;
    }

    fetchChats();

    // Initialize socket when user is available (authenticated via HTTP-only cookie)
    if (!user) {
      console.log('🔄 No user yet, waiting for authentication...');
      return;
    }

    console.log('🔌 Initializing socket connection for user:', user.name);
    isConnectingRef.current = true;

    const newSocket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
      withCredentials: true, // Send HTTP-only cookies
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 500,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected successfully!', newSocket.id);
      isConnectingRef.current = false;

      // Join pending chat room if any
      if (pendingChatJoinRef.current) {
        console.log('📤 Joining pending chat:', pendingChatJoinRef.current);
        newSocket.emit('join-chat', pendingChatJoinRef.current);
        pendingChatJoinRef.current = null;
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      isConnectingRef.current = false;
      // If auth error, don't keep retrying
      if (error.message.includes('Authentication')) {
        console.error('Authentication failed - disconnecting socket');
        newSocket.disconnect();
      }
    });

    newSocket.on('new-message', (data: { message: Message; chatId: string; senderId: string }) => {
      console.log('Socket: new-message received', data);
      const { message } = data;
      // Use ref to get the latest activeChat value
      const currentActiveChat = activeChatRef.current;
      console.log('Current active chat:', currentActiveChat?._id, 'Message chat:', message.chat);

      if (currentActiveChat && message.chat === currentActiveChat._id) {
        console.log('Adding message to current chat');
        setMessages(prev => [...prev, message]);
      }
      // Update chat list with new last message
      setChats(prev => prev.map(chat =>
        chat._id === message.chat
          ? {
            ...chat, lastMessage: {
              _id: message._id,
              content: message.content,
              sender: message.sender,
              createdAt: message.createdAt
            }
          }
          : chat
      ));
    });

    newSocket.on('joined-chat', (data: { chatId: string }) => {
      console.log('✅ Successfully joined chat room:', data.chatId);
    });

    newSocket.on('message-updated', (updatedMessage: Message) => {
      // Use ref to get the latest activeChat value
      const currentActiveChat = activeChatRef.current;
      if (currentActiveChat && updatedMessage.chat === currentActiveChat._id) {
        setMessages(prev => prev.map(msg =>
          msg._id === updatedMessage._id ? updatedMessage : msg
        ));
      }
    });

    newSocket.on('chat-updated', (payload: any) => {
      if (payload.updateType === 'created') {
        setChats(prev => [payload.data, ...prev]);
      } else if (payload.updateType === 'participant-added') {
        setChats(prev => prev.map(chat =>
          chat._id === payload.chatId ? payload.data : chat
        ));
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      isConnectingRef.current = false;
    };
  }, [user]);

  // Auto-refresh when workspace changes
  useEffect(() => {
    const handleWorkspaceChange = () => {
      fetchChats();
      // Clear active chat when workspace changes
      setActiveChat(null);
      setMessages([]);
    };

    // Listen for storage events (when workspace changes in other tabs/components)
    window.addEventListener('storage', handleWorkspaceChange);

    // Also listen for custom workspace change events
    window.addEventListener('workspaceChanged', handleWorkspaceChange);

    return () => {
      window.removeEventListener('storage', handleWorkspaceChange);
      window.removeEventListener('workspaceChanged', handleWorkspaceChange);
    };
  }, []);

  const fetchChats = async () => {
    try {
      setLoading(true);
      // Use organization-based endpoint instead of workspace
      const response = await fetchData('/chats/organization');
      console.log('Chat API response:', response);
      console.log('Chats data:', response.chats || response.data || []);
      setChats(response.chats || response.data || []);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
      toast.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const response = await fetchData(`/messages/chat/${chatId}`);
      setMessages(response.messages || response.data || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setActiveChat(chat);
    fetchMessages(chat._id);

    // Join chat room for real-time updates
    const currentSocket = socketRef.current;
    if (currentSocket && currentSocket.connected) {
      console.log('📤 Emitting join-chat event for chat:', chat._id);
      currentSocket.emit('join-chat', chat._id);
    } else {
      // Socket not ready yet, store pending join
      console.log('🔄 Socket not ready, queueing chat join for:', chat._id);
      pendingChatJoinRef.current = chat._id;
    }
  };

  const handleSendMessage = async (content: string, attachments?: File[], replyTo?: string) => {
    if (activeChat) {
      try {
        let messageData: any = {
          content: content || '',
          replyTo: replyTo || undefined
        };

        let sentMessage: any;

        // If there are attachments, create FormData
        if (attachments && attachments.length > 0) {
          const formData = new FormData();
          formData.append('content', content || '');
          if (replyTo) {
            formData.append('replyTo', replyTo);
          }
          attachments.forEach(file => {
            formData.append('attachments', file);
          });

          // Send message with attachments via REST API
          const response = await postMultipart(`/messages/chat/${activeChat._id}`, formData);
          sentMessage = response.data;
        } else {
          // Send text-only message via REST API
          const response = await postData(`/messages/chat/${activeChat._id}`, messageData);
          sentMessage = response.data;
        }

        // Immediately add the sent message to state for instant feedback
        if (sentMessage) {
          setMessages(prev => [...prev, sentMessage]);
        }

      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('Failed to send message. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex bg-white flex-col md:flex-row overflow-hidden">
      <div className={`w-full md:w-[280px] md:border-r border-gray-200 flex flex-col h-full ${activeChat ? 'hidden md:flex' : ''}`}>
        <ChatSidebarNew
          chats={chats}
          activeChat={activeChat}
          onChatSelect={handleChatSelect}
          onRefresh={fetchChats}
        />
      </div>

      <div className={`
        ${activeChat ? 'fixed top-0 left-0 z-50 w-full h-[100dvh] flex flex-col bg-white' : 'hidden'} 
        md:static md:z-auto md:flex md:flex-1 md:flex-col md:h-full
      `}>
        {activeChat ? (
          <ChatWindow
            chat={activeChat}
            messages={messages}
            currentUser={user!}
            onSendMessage={handleSendMessage}
            socket={socket}
            onBack={() => setActiveChat(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a chat to start messaging</h3>
              <p className="text-gray-500">Choose from your existing conversations or start a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;