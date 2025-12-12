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

  // Keep activeChatRef in sync with activeChat state and notify listeners
  useEffect(() => {
    activeChatRef.current = activeChat;
    window.dispatchEvent(new CustomEvent('chat:active-change', {
      detail: { chatId: activeChat?._id || null }
    }));
  }, [activeChat]);

  // Cleanup active chat status on unmount
  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('chat:active-change', {
        detail: { chatId: null }
      }));
    };
  }, []);

  // Listen for custom new-message events from chat window
  useEffect(() => {
    const handleNewMessageEvent = (event: CustomEvent) => {
      const { message, chatId } = event.detail;
      if (activeChat && chatId === activeChat._id) {
        // Check for duplicates before adding
        setMessages(prev => {
          const messageExists = prev.some(m => m._id === message._id);
          if (messageExists) {
            return prev;
          }
          return [...prev, message];
        });
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
      // console.log('🔄 No user yet, waiting for authentication...');
      return;
    }

    // console.log('🔌 Initializing socket connection for user:', user.name);
    isConnectingRef.current = true;

    // Track if this effect instance is still mounted
    let isMounted = true;

    const newSocket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
      withCredentials: true, // Send HTTP-only cookies
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 500,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      if (!isMounted) {
        // Component unmounted during connection (React Strict Mode), close silently
        newSocket.disconnect();
        return;
      }
      // console.log('✅ Socket connected successfully!', newSocket.id);
      isConnectingRef.current = false;

      // Join pending chat room if any
      if (pendingChatJoinRef.current) {
        // console.log('📤 Joining pending chat:', pendingChatJoinRef.current);
        newSocket.emit('join-chat', pendingChatJoinRef.current);
        pendingChatJoinRef.current = null;
      }
    });

    // Debug: Log all incoming events
    newSocket.onAny((eventName, ...args) => {
      // console.log('🔔 Socket event received:', eventName, args);
    });

    newSocket.on('connect_error', (error) => {
      // console.error('❌ Socket connection error:', error.message);
      isConnectingRef.current = false;
      // If auth error, don't keep retrying
      if (error.message.includes('Authentication')) {
        console.error('Authentication failed - disconnecting socket');
        newSocket.disconnect();
      }
    });

    // Helper to fetch chat if it doesn't exist locally (for new direct chats initiated by others)
    const fetchMissingChat = async (chatId: string) => {
      try {
        const response = await fetchData(`/chats/${chatId}`);
        if (response.chat) {
          setChats(current => {
            // Check again to avoid duplicates
            if (current.some(c => c._id === chatId)) return current;
            return [response.chat, ...current];
          });
        }
      } catch (err) {
        console.error('Failed to fetch missing chat:', err);
      }
    };

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    newSocket.on('new-message', (data: { message: Message; chatId: string; senderId: string }) => {
      const { message } = data;
      // Use ref to get the latest activeChat value
      const currentActiveChat = activeChatRef.current;
      const isChatActive = currentActiveChat && message.chat === currentActiveChat._id;
      const isWindowHidden = document.hidden;

      // Update active chat messages if matched
      if (isChatActive) {
        setMessages(prev => {
          const messageExists = prev.some(m => m._id === message._id);
          if (messageExists) {
            return prev;
          }
          return [...prev, message];
        });
      }

      // Browser Notification Logic
      if (!isChatActive || isWindowHidden) {
        if ('Notification' in window && Notification.permission === 'granted') {
          const senderName = message.sender.name || 'Someone';
          const notificationTitle = `New message from ${senderName}`;
          const notificationOptions = {
            body: message.content || 'Sent an attachment',
            icon: '/favicon.ico', // Adjust provided icon path if needed
            tag: message.chat // Group notifications by chat
          };

          const notification = new Notification(notificationTitle, notificationOptions);

          notification.onclick = () => {
            window.focus();
            // Optional: You could allow navigating to the chat here
          };
        }
      }

      // Update chat list with new last message OR add if missing
      setChats(prev => {
        const chatIndex = prev.findIndex(c => c._id === message.chat);

        // Determine if we should increment unread count
        // Increment if chat is NOT active OR window is hidden
        const shouldIncrementUnread = !isChatActive || isWindowHidden;

        if (chatIndex === -1) {
          // Chat doesn't exist in sidebar - fetch full details in background
          fetchMissingChat(message.chat);

          // Immediately create a temporary chat object to show in sidebar
          const tempChat: Chat = {
            _id: message.chat,
            type: 'direct', // Will be updated when full chat is fetched
            participants: [
              {
                user: message.sender,
                role: 'member',
                joinedAt: new Date().toISOString()
              }
            ],
            lastMessage: {
              _id: message._id,
              content: message.content,
              sender: message.sender,
              createdAt: message.createdAt
            },
            unreadCount: shouldIncrementUnread ? 1 : 0,
            createdAt: message.createdAt,
            updatedAt: message.createdAt
          };

          return [tempChat, ...prev];
        }

        // Chat exists - just update last message and move to top
        const existingChat = prev[chatIndex];
        const currentUnread = existingChat.unreadCount || 0;

        const updatedChat = {
          ...existingChat,
          lastMessage: {
            _id: message._id,
            content: message.content,
            sender: message.sender,
            createdAt: message.createdAt
          },
          // Increment unread count if needed
          unreadCount: shouldIncrementUnread ? currentUnread + 1 : currentUnread,
          updatedAt: message.createdAt
        };

        // Remove from current position and add to top
        const newChats = [...prev];
        newChats.splice(chatIndex, 1);
        return [updatedChat, ...newChats];
      });
    });

    newSocket.on('joined-chat', (data: { chatId: string }) => {
      // console.log('✅ Successfully joined chat room:', data.chatId);
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
      // console.log('🔌 Socket disconnected:', reason);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      isMounted = false;
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
      // console.log('Chat API response:', response);
      // console.log('Chats data:', response.chats || response.data || []);
      setChats(response.chats || response.data || []);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
      toast.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const handleChatCreated = (chat?: any) => {
    if (chat) {
      // If a chat object is provided, add it to the sidebar immediately
      setChats(prev => {
        const exists = prev.some(c => c._id === chat._id);
        if (!exists) {
          return [chat, ...prev];
        }
        return prev;
      });
    } else {
      // If no chat provided, do a full refresh
      fetchChats();
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const response = await fetchData(`/messages/chat/${chatId}`);
      setMessages(response.messages || response.data || []);
      // Refresh global unread count
      window.dispatchEvent(new Event('chat:refresh-unread'));
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setActiveChat(chat);
    fetchMessages(chat._id);

    // Add chat to local state if not already there (for newly created chats)
    // Also clear unread count since we remain opening it
    setChats(prev => {
      const index = prev.findIndex(c => c._id === chat._id);

      if (index === -1) {
        return [{ ...chat, unreadCount: 0 }, ...prev];
      }

      // Optimistic update for global sidebar: dispatch even how many were read
      const currentUnread = prev[index].unreadCount || 0;
      if (currentUnread > 0) {
        window.dispatchEvent(new CustomEvent('chat:read', { detail: { count: currentUnread } }));
      }

      // Update existing chat to clear unread count
      const newChats = [...prev];
      newChats[index] = { ...newChats[index], unreadCount: 0 };
      return newChats;
    });

    // Join chat room for real-time updates
    const currentSocket = socketRef.current;
    if (currentSocket && currentSocket.connected) {
      currentSocket.emit('join-chat', chat._id);
    } else {
      // Socket not ready yet, store pending join
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
        // Check for duplicates in case socket already delivered it
        if (sentMessage) {
          setMessages(prev => {
            const messageExists = prev.some(m => m._id === sentMessage._id);
            if (messageExists) {
              // console.log('Sent message already exists via socket, skipping:', sentMessage._id);
              return prev;
            }
            return [...prev, sentMessage];
          });

          // Update chat list to ensure the chat appears in sidebar with the new message
          setChats(prev => {
            const chatExists = prev.some(c => c._id === activeChat._id);

            if (!chatExists) {
              // Chat doesn't exist in sidebar - add it
              return [activeChat, ...prev];
            }

            // Chat exists - update last message
            return prev.map(chat =>
              chat._id === activeChat._id
                ? {
                  ...chat,
                  lastMessage: {
                    _id: sentMessage._id,
                    content: sentMessage.content,
                    sender: sentMessage.sender,
                    createdAt: sentMessage.createdAt
                  }
                }
                : chat
            );
          });
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
          onChatCreated={handleChatCreated}
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