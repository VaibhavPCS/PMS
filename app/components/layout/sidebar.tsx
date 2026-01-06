import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../provider/auth-context';
import { fetchData, patchData, postData } from '@/lib/fetch-util';
import {
  Home,
  Building2,
  CheckSquare,
  Users,
  Archive,
  Settings,
  Bell,
  LogOut,
  X,
  ChevronRight,
  ChevronLeft,
  MessageCircle,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

interface UserInfo {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalChatUnread, setTotalChatUnread] = useState(0); // Chat unread count
  const [showNotifications, setShowNotifications] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showMobileUserMenu, setShowMobileUserMenu] = useState(false); // ✅ New state

  const activeChatIdRef = useRef<string | null>(null);

  // Track active chat ID from Chat component
  useEffect(() => {
    const handleActiveChange = (e: CustomEvent) => {
      activeChatIdRef.current = e.detail.chatId;
    };
    window.addEventListener('chat:active-change', handleActiveChange as EventListener);
    return () => window.removeEventListener('chat:active-change', handleActiveChange as EventListener);
  }, []);

  // Socket for global updates (chat notifications)
  useEffect(() => {
    fetchUserInfo();
    fetchNotifications();
    fetchChatUnreadCount();

    // Setup global socket for notifications
    const newSocket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
      withCredentials: true, // Important for cookies
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      // console.log('Sidebar socket connected:', newSocket.id);
      // Re-fetch count on connect to ensure sync
      fetchChatUnreadCount();
    });

    newSocket.on('connect_error', (err) => {
      console.error('Sidebar socket connection error:', err);
    });

    // Listen for new chat messages globally
    newSocket.on('new-message', async (data: { message: any; chatId: string }) => {
      // console.log('Sidebar received new-message:', data);
      const isChatOpen = activeChatIdRef.current === data.chatId;
      const isWindowFocused = document.hasFocus();

      // If the chat window is NOT open for this specific chat, OR the window is not focused
      if (!isChatOpen || !isWindowFocused) {
        // Increment global count
        setTotalChatUnread(prev => prev + 1);

        // Show browser notification
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            try {
              const senderName = data.message.sender?.name || 'Someone';
              new Notification(`New message from ${senderName}`, {
                body: data.message.content || 'Sent an attachment',
                icon: '/favicon.ico', // Ensure this file exists
                tag: data.chatId // Group by chat
              });
            } catch (e) {
              console.error('Notification error:', e);
            }
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
          }
        }
      }
    });

    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(err => console.error('Permission request failed', err));
    }

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Listen for events to refreshing counts
    window.addEventListener('focus', fetchChatUnreadCount);
    window.addEventListener('chat:refresh-unread', fetchChatUnreadCount);

    const handleChatRead = (e: CustomEvent) => {
      setTotalChatUnread((prev) => Math.max(0, prev - (e.detail?.count || 0)));
    };
    window.addEventListener('chat:read', handleChatRead as EventListener);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focus', fetchChatUnreadCount);
      window.removeEventListener('chat:refresh-unread', fetchChatUnreadCount);
      window.removeEventListener('chat:read', handleChatRead as EventListener);
      newSocket.disconnect();
    };
  }, []);

  const fetchChatUnreadCount = async () => {
    try {
      const response = await fetchData('/chats/unread/count');
      setTotalChatUnread(response.count || 0);
    } catch (error) {
      console.error('Failed to fetch chat unread count:', error);
    }
  };

  // ✅ Lock/unlock body scroll when notifications are open
  useEffect(() => {
    if (showNotifications) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showNotifications]);

  const fetchUserInfo = async () => {
    try {
      const response = await fetchData('/auth/me');
      setUserInfo(response.user);
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const response = await fetchData('/notification');
      setNotifications(response.notifications || []);

      const unreadNotifications = response.notifications?.filter((n: Notification) => !n.isRead) || [];
      setUnreadCount(unreadNotifications.length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await patchData(`/notification/${notificationId}/read`, {});

      setNotifications(prev => prev.map(n =>
        n._id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      ));

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await patchData('/notification/read-all', {});

      setNotifications(prev => prev.map(n => ({
        ...n,
        isRead: true,
        readAt: new Date().toISOString()
      })));
      setUnreadCount(0);
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
      case 'workspace_invite': return '🏢';
      case 'task_assigned': return '📋';
      case 'task_updated': return '✏️';
      case 'task_reassigned': return '🔄';
      case 'task_overdue': return '⚠️';
      case 'task_overdue_reminder': return '🔔';
      case 'task_comment': return '💬';
      default: return '📢';
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
      // Close any open notification panel
      setShowNotifications(false);

      const { data } = notification;

      // Handle comment notifications that don't have data field but have relatedTask
      if (notification.type === 'task_comment' && notification.relatedTask) {
        // Don't navigate to dashboard yet, let the navigation logic handle it
      } else if (!data) {
        // If no data and not a comment notification, navigate to dashboard
        navigate('/dashboard');
        return;
      }

      // Check resource existence before navigation
      try {
        const taskId = data.taskId || (notification.type === 'task_comment' && notification.relatedTask);
        if (taskId) {
          const existsResponse = await fetch(buildApiUrl(`/task/${taskId}/exists`), { credentials: 'include' });
          if (!existsResponse.ok) {
            toast.error("This task no longer exists.");
            return;
          }
          // Check if task is deleted/archived
          const taskResponse = await fetch(buildApiUrl(`/task/${taskId}`), { credentials: 'include' });
          if (taskResponse.ok) {
            const taskData = await taskResponse.json();
            // If isActive is false, task is deleted/archived - don't redirect
            if (taskData.task?.isActive === false) {
              toast.error("This task has been deleted or archived");
              return;
            }
          }
        } else if (data.projectId) {
          const existsResponse = await fetch(buildApiUrl(`/project/${data.projectId}/exists`), { credentials: 'include' });
          if (!existsResponse.ok) {
            toast.error("This project no longer exists or you don't have access to it");
            return;
          }
          // Check if project is deleted/archived
          const projectResponse = await fetch(buildApiUrl(`/project/${data.projectId}`), { credentials: 'include' });
          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            // If isActive is false, project is deleted/archived - don't redirect
            if (projectData.project?.isActive === false) {
              toast.error("This project has been deleted or archived");
              return;
            }
          }
        }

        // Check workspace existence if provided
        if (data?.workspaceId) {
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
          } catch { }
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

      // Choose the most specific route first
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
        targetPath = `/workspace`;
      }

      navigate(targetPath);
    } catch (err) {
      console.error('Notification navigation error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/sign-in');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    // ✅ Close mobile menus when toggling
    setShowMobileUserMenu(false);
    setShowNotifications(false);
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Workspace', href: '/workspace', icon: Building2 },
    { name: 'My Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Employees', href: '/members', icon: Users },
    { name: 'Archived', href: '/archived', icon: Archive },
    { name: 'Chat', href: '/chat', icon: MessageCircle },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  // ✅ Mobile Notification Panel Component
  const MobileNotificationPanel = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Fixed Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-8 px-3"
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="max-h-96 overflow-y-auto">
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
            <div className="p-4 space-y-3">
              {notifications.map((notification) => (
                <a
                  key={notification._id}
                  href={getNotificationHref(notification)}
                  className={`block p-3 rounded-lg cursor-pointer transition-colors no-underline ${!notification.isRead
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
                          <p className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
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
    </div>
  );

  // ✅ Desktop Notification Panel Component
  const DesktopNotificationPanel = ({ className }: { className?: string }) => (
    <div className={`w-80 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden ${className}`}>
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
              onClick={() => setShowNotifications(false)}
              className="h-7 w-7 p-0 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="h-48 overflow-y-auto overscroll-contain">
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
                className={`block p-3 mb-2 rounded-md cursor-pointer transition-colors no-underline ${!notification.isRead
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
  );

  return (
    <>
      {/* ✅ Sidebar - NO Z-INDEX, same axis */}
      <div className={`flex h-screen flex-col bg-white border-r border-gray-200 transition-all duration-300 ${isCollapsed ? 'w-[74px]' : 'w-64'
        }`}>

        {/* ✅ Logo with Toggle Arrow */}
        <div className="flex items-center h-16 border-b border-gray-200 relative mt-5">
          {isCollapsed ? (
            /* ✅ Collapsed State */
            <div className="w-full flex flex-col items-center justify-center space-y-2 px-4">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100">
                <img
                  src="/pcs_logo.jpg"
                  alt="PCS Logo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling!.classList.remove('hidden');
                  }}
                />
                <span className="text-blue-600 font-bold text-sm hidden">P</span>
              </div>

              {/* ✅ Mobile: 5px white space around toggle */}
              <div className={isMobile ? 'bg-white rounded-md p-1' : ''}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-6 w-6"
                  onClick={toggleSidebar}
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : (
            /* ✅ Expanded State */
            <>
              <div className="flex items-center space-x-3 flex-1 px-6">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100">
                  <img
                    src="/assets/a8ebdf5975d6d9ab7f5064a60b7a388fe436a8bb.png"
                    alt="PCS Logo"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling!.classList.remove('hidden');
                    }}
                  />
                  <span className="text-blue-600 font-bold text-sm hidden">P</span>
                </div>
                <span className="text-xl font-semibold text-gray-900">PMS</span>
              </div>

              <div className="px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1.5 h-8 w-8"
                  onClick={toggleSidebar}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* ✅ EXPANDED Navigation */}
        {!isCollapsed && (
          <nav className="flex-1 p-6">
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors group ${isActive(item.href)
                      ? 'bg-[#FF6B2C] text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="ml-3 flex-1 flex items-center justify-between">
                      {item.name}
                      {item.name === 'Chat' && totalChatUnread > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center ml-2 border ${isActive(item.href)
                          ? 'bg-white text-[#F2761B] border-white'
                          : 'bg-[#F2761B] text-white border-[#F2761B]'
                          }`}>
                          {totalChatUnread > 9 ? '9+' : totalChatUnread}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}

              <Separator className="my-6" />

              {/* NOTIFICATIONS - Expanded */}
              <div className="relative">
                <Button
                  variant="ghost"
                  className={`w-full justify-start px-3 py-3 h-auto group ${showNotifications ? 'bg-gray-100' : ''
                    }`}
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium ml-3">Notifications</span>
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="text-xs px-1.5 py-0.5 min-w-[20px] h-5 ml-auto"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>

                {/* ✅ Desktop Expanded Notifications Panel */}
                {showNotifications && !isMobile && (
                  <DesktopNotificationPanel className="absolute left-full ml-4 -top-6 z-50" />
                )}
              </div>
            </div>
          </nav>
        )}

        {/* ✅ COLLAPSED Navigation */}
        {isCollapsed && (
          <nav className="flex-1 py-4">
            <div className="flex flex-col items-center space-y-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`p-3 rounded-md transition-colors group relative ${isActive(item.href)
                      ? 'bg-[#FF6B2C] text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    title={item.name}
                  >
                    <Icon className="w-5 h-5" />
                    {isActive(item.href) && (
                      <div className="absolute -right-[1px] top-0 bottom-0 w-[2px] bg-[#FF6B2C] rounded-l"></div>
                    )}
                    {item.name === 'Chat' && totalChatUnread > 0 && (
                      <div className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center border ${isActive(item.href)
                        ? 'bg-white text-[#F2761B] border-white'
                        : 'bg-[#F2761B] text-white border-white'
                        }`}>
                        <span className="text-[9px] font-bold">
                          {totalChatUnread > 9 ? '9' : totalChatUnread}
                        </span>
                      </div>
                    )}
                  </Link>
                );
              })}

              <div className="w-8 h-px bg-gray-200 my-2"></div>

              {/* ✅ NOTIFICATIONS - Collapsed */}
              <div className="relative">
                <Button
                  variant="ghost"
                  className={`p-3 rounded-md transition-colors relative ${showNotifications ? 'bg-gray-100' : 'hover:bg-gray-50'
                    }`}
                  onClick={() => setShowNotifications(!showNotifications)}
                  title="Notifications"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-[8px] text-white font-medium">
                        {unreadCount > 9 ? '9' : unreadCount}
                      </span>
                    </div>
                  )}
                </Button>

                {/* ✅ Desktop Collapsed Notifications Panel */}
                {showNotifications && !isMobile && (
                  <DesktopNotificationPanel className="absolute left-full ml-2 -top-6 z-50" />
                )}
              </div>
            </div>
          </nav>
        )}

        {/* ✅ EXPANDED User Profile */}
        {!isCollapsed && (
          <div className="p-6 border-t border-gray-200">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="text-base">
                    {userInfo?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {userInfo?.name || 'Loading...'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {userInfo?.email || 'Loading...'}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-9"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
            </div>
          </div>
        )}

        {/* ✅ COLLAPSED User Profile */}
        {isCollapsed && (
          <div className="p-4 border-t border-gray-200 flex justify-center">
            <div className="relative">
              <Avatar
                className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                onClick={() => setShowMobileUserMenu(!showMobileUserMenu)}
              >
                <AvatarFallback className="text-sm">
                  {userInfo?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              {/* ✅ Mobile User Menu Popup */}
              {showMobileUserMenu && (
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2">
                  <div className="bg-white border border-gray-200 rounded-md shadow-lg p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ✅ Mobile Notification Modal */}
      {isMobile && showNotifications && <MobileNotificationPanel />}

      {/* ✅ Click outside handlers */}
      {showNotifications && !isMobile && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setShowNotifications(false)}
          onTouchMove={(e) => e.preventDefault()}
        />
      )}

      {showMobileUserMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowMobileUserMenu(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
