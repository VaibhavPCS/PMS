import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchData } from '@/lib/fetch-util';
import { io } from 'socket.io-client';
import { useAuth } from './auth-context';

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
  const { isAuthenticated } = useAuth();

  const refreshBadgeCounts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      // Fetch notifications count
      const notificationResponse = await fetchData('/notification');
      const unreadNotifications = notificationResponse.notifications?.filter((n: any) => !n.isRead).length || 0;

      // Fetch messages unread count
      let unreadMessages = 0;
      try {
        const messagesResponse = await fetchData('/chats/unread/count');
        unreadMessages = messagesResponse.count || 0;
      } catch (e) {
        // ignore network errors silently
      }

      setBadgeCounts({
        notifications: unreadNotifications,
        messages: unreadMessages,
      });
    } catch (error) {
      // ignore network errors silently
    }
  }, [isAuthenticated]);

  const activeChatIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      refreshBadgeCounts();
    }

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
    const newSocket = isAuthenticated
      ? io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
          withCredentials: true,
          transports: ['websocket', 'polling'],
        })
      : null;

    if (newSocket) {
      // Listen for new messages
      newSocket.on('new-message', (data: { message: any; chatId: string }) => {
        const isChatOpen = activeChatIdRef.current === data.chatId;
        const isWindowFocused = document.hasFocus();

        if (!isChatOpen || !isWindowFocused) {
          setBadgeCounts(prev => ({ ...prev, messages: prev.messages + 1 }));
        }
      });

      // Listen for new notifications via socket
      newSocket.on('notification', (notification: any) => {
        // Increment notification count
        setBadgeCounts(prev => ({ ...prev, notifications: prev.notifications + 1 }));

        // Dispatch custom event for notification center to update
        window.dispatchEvent(new CustomEvent('notification:new', { detail: notification }));
      });

      // Listen for notification marked as read
      newSocket.on('notification-read', (data: { notificationId: string }) => {
        // Decrement notification count
        setBadgeCounts(prev => ({ ...prev, notifications: Math.max(0, prev.notifications - 1) }));

        // Dispatch custom event for notification center to update
        window.dispatchEvent(new CustomEvent('notification:read', { detail: data }));
      });

      // Listen for all notifications marked as read
      newSocket.on('notifications-all-read', () => {
        // Reset notification count
        setBadgeCounts(prev => ({ ...prev, notifications: 0 }));

        // Dispatch custom event for notification center to update
        window.dispatchEvent(new CustomEvent('notifications:all-read'));
      });
    }

    // Refresh badge counts every 5 minutes (fallback only) - reduced from 30 seconds
    // Socket events handle real-time updates, polling is just a safety net
    const interval = isAuthenticated ? setInterval(refreshBadgeCounts, 300000) : undefined;

    return () => {
      window.removeEventListener('chat:read', handleChatRead as EventListener);
      window.removeEventListener('chat:active-change', handleActiveChange as EventListener);
      window.removeEventListener('chat:refresh-unread', handleRefresh);
      if (interval) clearInterval(interval as unknown as number);
      if (newSocket) newSocket.disconnect();
    };
  }, [refreshBadgeCounts, isAuthenticated]);

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
