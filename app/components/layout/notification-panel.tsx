import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { fetchData, patchData, postData } from '@/lib/fetch-util';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { useBadges } from '../../provider/badge-context';
import { buildApiUrl } from '@/lib/config';
import { toast } from 'sonner';

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
  relatedTask?: string;
  relatedComment?: string;
  createdAt: string;
  readAt?: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  anchorEl,
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const { refreshBadgeCounts } = useBadges();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await fetchData('/notification');
      setNotifications(response.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Generate href for notification navigation
  const getNotificationHref = (notification: Notification): string => {
    const { data, relatedTask, type } = notification;
    
    // Handle comment notifications that use relatedTask field
    if (type === 'task_comment') {
      if (relatedTask) {
        // Check if relatedTask is an object (populated) or string
        const relatedTaskId = typeof relatedTask === 'object' ? (relatedTask as any)._id : relatedTask;
        return `/task/${relatedTaskId}`;
      }
      // Fallback to data.taskId if relatedTask is missing but data exists
      if (data?.taskId) {
        return `/task/${data.taskId}`;
      }
    }
    
    // Handle cases where data might be undefined or null
    if (!data) {
      return '/dashboard';
    }
    
    // Decide the most specific target route first
    if (data.taskId) {
      return `/task/${data.taskId}`;
    } else if (data.projectId) {
      return `/project/${data.projectId}`;
    } else if (data.workspaceId) {
      return `/workspace`;
    } else if (data.meetingId) {
      return `/meetings`;
    } else if (data.inviteId) {
      return `/workspace`;
    }
    
    return '/dashboard';
  };

  // Navigate to relevant page for a notification and mark as read with existence checks
  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await markAsRead(notification._id);
      }

      // Close the panel
      onClose();

      const { data } = notification;

      // Handle comment notifications that don't have data field but have relatedTask
      if (notification.type === 'task_comment' && notification.relatedTask) {
        // Don't navigate to dashboard yet, let the navigation logic handle it
      } else if (!data) {
        // If no data and not a comment notification, navigate to dashboard
        navigate('/dashboard');
        return;
      }

      // COMMENTED OUT: Notification validation checks
      /*
      // Check resource existence before navigation
      try {
        // Check task existence and active status
        if (data.taskId) {
          const existsResponse = await fetch(buildApiUrl(`/task/${data.taskId}/exists`), { credentials: 'include' });
          if (!existsResponse.ok) {
            toast.error("This task no longer exists.");
            return;
          }
          // Check if task is deleted or inactive
          const taskResponse = await fetch(buildApiUrl(`/task/${data.taskId}`), { credentials: 'include' });
          if (taskResponse.ok) {
            const taskData = await taskResponse.json();
            // If isActive is false, task is deleted - don't redirect
            if (taskData.task?.isActive === false) {
              toast.error("This task has been deleted or archived");
              return;
            }
          }
        }
        // Check project existence and active status
        else if (data.projectId) {
          const existsResponse = await fetch(buildApiUrl(`/project/${data.projectId}/exists`), { credentials: 'include' });
          if (!existsResponse.ok) {
            toast.error("This project no longer exists or you don't have access to it");
            return;
          }
          // Check if project is deleted or inactive
          const projectResponse = await fetch(buildApiUrl(`/project/${data.projectId}`), { credentials: 'include' });
          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            // If isActive is false, project is deleted - don't redirect
            if (projectData.project?.isActive === false) {
              toast.error("This project has been deleted or archived");
              return;
            }
          }
        }

        // Check workspace existence and archived status if provided
        if (data.workspaceId) {
          const existsResponse = await fetch(buildApiUrl(`/workspace/${data.workspaceId}/exists`), { credentials: 'include' });
          if (!existsResponse.ok) {
            toast.error("This workspace no longer exists or you don't have access to it");
            return;
          }
          // Check if workspace is archived
          const workspaceResponse = await fetch(buildApiUrl(`/workspace/${data.workspaceId}`), { credentials: 'include' });
          if (workspaceResponse.ok) {
            const workspaceData = await workspaceResponse.json();
            // If isArchived is true, workspace is archived - don't redirect
            if (workspaceData.workspace?.isArchived === true) {
              toast.error("This workspace has been archived");
              return;
            }
          }

          // Persist and switch workspace on backend if provided
          try {
            localStorage.setItem('currentWorkspaceId', data.workspaceId);
          } catch {}
          try {
            await postData('/workspace/switch', { workspaceId: data.workspaceId });
          } catch (err) {
            console.error('Failed to switch workspace from notification:', err);
          }
        }
      } catch (error) {
        console.error('Error checking resource existence:', error);
        toast.error("Unable to verify resource access");
        return;
      }
      */

      // Check resource existence and status before navigation
      try {
        let headers: Record<string, string> = {};
        if (data?.workspaceId) {
          try { localStorage.setItem('currentWorkspaceId', data.workspaceId); } catch {}
          try { await postData('/workspace/switch', { workspaceId: data.workspaceId }); } catch (err) {
            console.error('Failed to switch workspace from notification:', err);
          }
          headers['workspace-id'] = data.workspaceId;
        } else {
          const wsId = localStorage.getItem('currentWorkspaceId') || '';
          if (wsId) headers['workspace-id'] = wsId;
        }

        // Check task existence and active status
        const taskId = data.taskId || (notification.type === 'task_comment' && notification.relatedTask);
        if (taskId) {
          const existsResponse = await fetch(buildApiUrl(`/task/${taskId}/exists`), { credentials: 'include', headers });
          if (!existsResponse.ok) {
            toast.error("This task no longer exists.");
            return;
          }
          const taskResponse = await fetch(buildApiUrl(`/task/${taskId}`), { credentials: 'include', headers });
          if (taskResponse.ok) {
            const taskData = await taskResponse.json();
            // If isActive is false, task is deleted/archived - don't redirect
            if (taskData.task?.isActive === false) {
              toast.error("This task has been deleted or archived");
              return;
            }
          }
        }
        // Check project existence and active status
        else if (data?.projectId) {
          const existsResponse = await fetch(buildApiUrl(`/project/${data.projectId}/exists`), { credentials: 'include', headers });
          if (!existsResponse.ok) {
            toast.error("This project no longer exists or you don't have access to it");
            return;
          }
          const projectResponse = await fetch(buildApiUrl(`/project/${data.projectId}`), { credentials: 'include', headers });
          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            // If isActive is false, project is deleted/archived - don't redirect
            if (projectData.project?.isActive === false) {
              toast.error("This project has been deleted or archived");
              return;
            }
          }
        }

        // Check workspace existence and archived status
        if (data?.workspaceId) {
          const existsResponse = await fetch(buildApiUrl(`/workspace/${data.workspaceId}/exists`), { credentials: 'include', headers });
          if (!existsResponse.ok) {
            toast.error("This workspace no longer exists or you don't have access to it");
            return;
          }
          const workspaceResponse = await fetch(buildApiUrl(`/workspace/${data.workspaceId}`), { credentials: 'include', headers });
          if (workspaceResponse.ok) {
            const workspaceData = await workspaceResponse.json();
            // If isArchived is true, workspace is archived - don't redirect
            if (workspaceData.workspace?.isArchived === true) {
              toast.error("This workspace has been archived");
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error checking resource existence:', error);
        toast.error("Unable to verify resource access");
        return;
      }

      // Decide the most specific target route first
      let targetPath = '/dashboard';
      
      // Handle comment notifications that use relatedTask field
      if (notification.type === 'task_comment' && notification.relatedTask) {
        targetPath = `/task/${notification.relatedTask}`;
      } else if (data?.taskId) {
        targetPath = `/task/${data.taskId}`;
      } else if (data?.projectId) {
        targetPath = `/project/${data.projectId}`;
      } else if (data?.workspaceId) {
        targetPath = `/workspace`;
      } else if (data?.meetingId) {
        targetPath = `/meetings`;
      } else if (data?.inviteId) {
        // Workspace invite or similar — bring user to workspace area
        targetPath = `/workspace`;
      }

      navigate(targetPath);
    } catch (err) {
      console.error('Notification navigation error:', err);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await patchData(`/notification/${notificationId}/read`, {});
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      // Refresh badge counts across the app
      refreshBadgeCounts();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await patchData('/notification/read-all', {});
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        }))
      );
      // Refresh badge counts across the app
      refreshBadgeCounts();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

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

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'workspace_invite':
        return '🏢';
      case 'task_assigned':
        return '📋';
      case 'task_updated':
        return '✏️';
      case 'task_reassigned':
        return '🔄';
      case 'task_overdue':
        return '⚠️';
      case 'task_overdue_reminder':
        return '🔔';
      case 'task_comment':
        return '💬';
      default:
        return '📢';
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <div
        className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden"
        style={{
          width: '320px',
          maxHeight: '400px',
          top: anchorEl ? `${anchorEl.getBoundingClientRect().bottom + 8}px` : '88px',
          right: '20px',
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-7 px-3 hover:bg-gray-100"
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-7 w-7 p-0 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
          {loadingNotifications ? (
            <div className="p-8 text-center text-sm text-gray-500">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p>Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => (
                <a
                  key={notification._id}
                  href={getNotificationHref(notification)}
                  className={`block p-3 mb-2 rounded-md cursor-pointer transition-colors no-underline ${
                    !notification.isRead
                      ? 'bg-blue-50 border-l-4 border-l-blue-500 hover:bg-blue-100'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNotificationClick(notification);
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-lg flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          {notification.sender && (
                            <p className="text-xs text-gray-500 mt-1">
                              from {notification.sender.name}
                            </p>
                          )}
                        </div>
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
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
