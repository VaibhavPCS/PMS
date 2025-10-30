import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchData } from '@/lib/fetch-util';

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

      // TODO: Fetch messages count when API is available
      // const messagesResponse = await fetchData('/messages');
      // const unreadMessages = messagesResponse.messages?.filter((m: any) => !m.isRead).length || 0;

      setBadgeCounts({
        notifications: unreadNotifications,
        messages: 0, // Will be updated when messages API is available
      });
    } catch (error) {
      console.error('Failed to fetch badge counts:', error);
    }
  }, []);

  useEffect(() => {
    refreshBadgeCounts();

    // Refresh badge counts every 30 seconds
    const interval = setInterval(refreshBadgeCounts, 30000);
    return () => clearInterval(interval);
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
