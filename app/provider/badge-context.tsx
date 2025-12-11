import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchData } from '@/lib/fetch-util';
import { io } from 'socket.io-client';

interface BadgeCounts {
  notifications: number;
  messages: number;
}

interface BadgeContextType {
  badgeCounts: BadgeCounts;
  refreshBadgeCounts: () => Promise<void>;
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

export const BadgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [badgeCounts, setBadgeCounts] = useState<BadgeCounts>({
    notifications: 0,
    messages: 0,
  });

  const refreshBadgeCounts = useCallback(async () => {
    try {
      // Fetch notifications count
      const notificationResponse = await fetchData('/notification');
      const unreadNotifications = notificationResponse.notifications?.filter((n: any) => !n.isRead).length || 0;

      // Fetch messages unread count
      let unreadMessages = 0;
      try {
        const messagesResponse = await fetchData('/chats/unread/count');
        unreadMessages = messagesResponse.count || 0;
        console.log('BadgeContext: unreadMessages fetched:', unreadMessages);
      } catch (e) {
        console.error('Failed to fetch chat unread count in BadgeContext', e);
      }

      setBadgeCounts({
        notifications: unreadNotifications,
        messages: unreadMessages,
      });
    } catch (error) {
      console.error('Failed to fetch badge counts:', error);
    }
  }, []);

  const activeChatIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    refreshBadgeCounts();

    const handleChatRead = (e: CustomEvent) => {
      setBadgeCounts(prev => ({ ...prev, messages: Math.max(0, prev.messages - (e.detail?.count || 0)) }));
    };

    const handleActiveChange = (e: CustomEvent) => {
      activeChatIdRef.current = e.detail.chatId;
    };

    const handleRefresh = () => refreshBadgeCounts();

    window.addEventListener('chat:read', handleChatRead as EventListener);
    window.addEventListener('chat:active-change', handleActiveChange as EventListener);
    window.addEventListener('chat:refresh-unread', handleRefresh);

    // Socket connection for real-time updates
    const newSocket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    newSocket.on('new-message', (data: { message: any; chatId: string }) => {
      const isChatOpen = activeChatIdRef.current === data.chatId;
      const isWindowFocused = document.hasFocus();

      if (!isChatOpen || !isWindowFocused) {
        setBadgeCounts(prev => ({ ...prev, messages: prev.messages + 1 }));
      }
    });

    // Refresh badge counts every 30 seconds
    const interval = setInterval(refreshBadgeCounts, 30000);

    return () => {
      window.removeEventListener('chat:read', handleChatRead as EventListener);
      window.removeEventListener('chat:active-change', handleActiveChange as EventListener);
      window.removeEventListener('chat:refresh-unread', handleRefresh);
      clearInterval(interval);
      newSocket.disconnect();
    };
  }, [refreshBadgeCounts]);

  return (
    <BadgeContext.Provider value={{ badgeCounts, refreshBadgeCounts }}>
      {children}
    </BadgeContext.Provider>
  );
};

export const useBadges = () => {
  const context = useContext(BadgeContext);
  if (context === undefined) {
    throw new Error('useBadges must be used within a BadgeProvider');
  }
  return context;
};
