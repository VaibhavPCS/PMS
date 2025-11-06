import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { BellIcon } from '@heroicons/react/24/outline';
import { fetchData, postData, patchData } from '@/lib/fetch-util';

// ✅ SOLUTION: Define proper notification interface
interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  sender?: {
    _id: string;
    name: string;
    email: string;
  };
  data: {
    workspaceId?: string;
    projectId?: string;
    taskId?: string;
    meetingId?: string;
    inviteId?: string;
  };
  createdAt: string;
  readAt?: string;
}

interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    unreadCount: number;
  };
}

const NotificationCenter = () => {
  const navigate = useNavigate();
  
  // ✅ SOLUTION: Properly type the state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // ✅ SOLUTION: Add proper typing for the response
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetchData<NotificationResponse>('/notification');
      setNotifications(response.notifications || []);
      setUnreadCount(response.pagination?.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Set empty array as fallback
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // ✅ SOLUTION: Add mark as read functionality
  const markAsRead = async (notificationId: string) => {
    try {
      await patchData(`/notification/${notificationId}/read`, {});
      
      // Update local state
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // ✅ SOLUTION: Add mark all as read functionality
  const markAllAsRead = async () => {
    try {
      await patchData('/notification/read-all', {});
      
      // Update local state
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Enhanced navigation function for notifications
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    // Close notification panel
    setIsOpen(false);

    // Navigate based on notification data
    const { data } = notification;
    // Persist and switch workspace on backend if provided
    if (data.workspaceId) {
      try {
        localStorage.setItem('currentWorkspaceId', data.workspaceId);
      } catch {}
      try {
        await postData('/workspace/switch', { workspaceId: data.workspaceId });
      } catch (err) {
        console.error('Failed to switch workspace from notification:', err);
      }
    }

    // Route selection: task > project > workspace > meetings > invite > dashboard
    let targetPath = '/dashboard';
    if (data.taskId) {
      targetPath = `/task/${data.taskId}`;
    } else if (data.projectId) {
      targetPath = `/project/${data.projectId}`;
    } else if (data.workspaceId) {
      targetPath = `/workspace`;
    } else if (data.meetingId) {
      targetPath = `/meetings`;
    } else if (data.inviteId) {
      targetPath = `/workspace`;
    }

    // Navigate to the target path
    navigate(targetPath);
  };

  // ✅ SOLUTION: Add click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-notification-center]')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  // ✅ SOLUTION: Helper function for time formatting
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // ✅ SOLUTION: Helper function for notification icons
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'workspace_invite': return '🏢';
      case 'task_assigned': return '📋';
      case 'task_updated': return '✏️';
      case 'task_comment': return '💬';
      default: return '📢';
    }
  };

  return (
    <div className="relative" data-notification-center>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-1.5 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <span className="sr-only">View notifications</span>
        <BellIcon className="h-6 w-6" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-xs font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>
          
          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs text-gray-500">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification._id}
                  className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition-all duration-200 ${
                    !notification.isRead 
                      ? 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100 shadow-sm' 
                      : 'bg-gray-50 border-l-4 border-l-gray-300 hover:bg-gray-100 opacity-75'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 text-lg">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          {/* Sender info */}
                          {notification.sender && (
                            <p className="text-xs text-gray-500 mt-1">
                              from {notification.sender.name}
                            </p>
                          )}
                        </div>
                        
                        {/* Time and unread indicator */}
                        <div className="flex items-center space-x-1 ml-2">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
              <button 
                className="text-xs text-blue-600 hover:text-blue-800 w-full text-center"
                onClick={() => {
                  // TODO: Navigate to full notifications page
                  console.log('Navigate to full notifications');
                }}
              >
                View all notifications ({notifications.length > 10 ? `${notifications.length - 10} more` : 'all'})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
