import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../provider/auth-context';
import { BadgeProvider, useBadges } from '../../provider/badge-context';
import { Menu, X, Bell, LogOut } from 'lucide-react';
import VerticalSidebar from './vertical-sidebar';
import HorizontalNavbar from './horizontal-navbar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { fetchData, patchData } from '@/lib/fetch-util';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { buildApiUrl } from '@/lib/config';
import { postData } from '@/lib/fetch-util';

interface UserInfo {
  _id: string;
  name: string;
  email: string;
  role: string;
}

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
  createdAt: string;
  readAt?: string;
  data: {
    workspaceId?: string;
    projectId?: string;
    taskId?: string;
    meetingId?: string;
    inviteId?: string;
  };
}

const ResponsiveDashboardContent = () => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const { badgeCounts, refreshBadgeCounts } = useBadges();

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserInfo();
      fetchNotifications();
    }
  }, [isAuthenticated]);

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
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
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
      refreshBadgeCounts();
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

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await markAsRead(notification._id);
      }
      setIsNotificationOpen(false);
      setIsProfileOpen(false);

      const { data } = notification;

      // Check resource existence before navigation
      try {
        if (data.taskId) {
          const existsResponse = await fetch(buildApiUrl(`/task/${data.taskId}/exists`), { credentials: 'include' });
          if (!existsResponse.ok) {
            toast.error("This task no longer exists.");
            return;
          }
          const taskResponse = await fetch(buildApiUrl(`/task/${data.taskId}`), { credentials: 'include' });
          if (taskResponse.ok) {
            const taskData = await taskResponse.json();
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
          const projectResponse = await fetch(buildApiUrl(`/project/${data.projectId}`), { credentials: 'include' });
          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            if (projectData.project?.isActive === false) {
              toast.error("This project has been deleted or archived");
              return;
            }
          }
        }

        if (data.workspaceId) {
          const existsResponse = await fetch(buildApiUrl(`/workspace/${data.workspaceId}/exists`), { credentials: 'include' });
          if (!existsResponse.ok) {
            toast.error("This workspace no longer exists or you don't have access to it");
            return;
          }
          const workspaceResponse = await fetch(buildApiUrl(`/workspace/${data.workspaceId}`), { credentials: 'include' });
          if (workspaceResponse.ok) {
            const workspaceData = await workspaceResponse.json();
            if (workspaceData.workspace?.isArchived === true) {
              toast.error("This workspace has been archived");
              return;
            }
          }

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

  const getInitials = (name: string) => {
    return name?.charAt(0).toUpperCase() || 'U';
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <div className="h-screen flex bg-[#F9F9F9] relative">
      {/* Desktop Sidebar - Always visible on lg+ */}
      <div className="hidden lg:block">
        <VerticalSidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sliding Sidebar */}
          <div className="fixed inset-y-0 left-0 w-64 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden">
            {/* Commented out as per user request */}
            {/* <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <img
                  src="/pcs_logo.jpg"
                  alt="PCS Logo"
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <span className="text-xl font-semibold text-gray-900">PMS</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div> */}

            <div className="h-full">
              <VerticalSidebar />
            </div>
          </div>
        </>
      )}

      {/* Profile Dropdown Overlay */}
      {isProfileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsProfileOpen(false)}
          />

          {/* Profile Card - Center positioned */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl z-50 w-80 max-w-[90vw]">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-200">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xl">
                    {getInitials(userInfo?.name || 'User')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{userInfo?.name}</p>
                  <p className="text-sm text-gray-500 hidden sm:block">{userInfo?.email}</p>
                  <p className="text-xs text-gray-400 uppercase mt-1">{userInfo?.role}</p>
                </div>
              </div>

              {/* Notifications Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {/* Open notification modal instead of navigate */}
                <button
                  onClick={() => {
                    setIsNotificationOpen(true);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg flex items-center justify-between"
                >
                  <span>View all notifications</span>
                  <Bell className="w-4 h-4" />
                </button>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {/* Commented out as per user request */}
                {/* <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg text-left"
                >
                  Settings
                </button> */}
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg text-left font-medium flex items-center justify-between"
                >
                  <span>Sign Out</span>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Notification Modal - Appears on top of profile */}
      {isNotificationOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-[60]"
            onClick={() => setIsNotificationOpen(false)}
          />

          {/* Notification Panel - Center positioned on top */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl z-[70] w-[90vw] max-w-md max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
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
                    onClick={() => setIsNotificationOpen(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
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
                <div className="p-3 space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                        !notification.isRead
                          ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <p className="font-semibold text-gray-900">PMS</p>
              <p className="text-xs text-gray-500">Project Management</p>
            </div>
          </div>

          {/* Mobile Profile Button with Notification Indicator */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="relative"
          >
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                {getInitials(userInfo?.name || 'User')}
              </AvatarFallback>
            </Avatar>

            {/* Orange Notification Indicator on Name */}
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </button>
        </div>

        {/* Desktop Horizontal Navbar */}
        <div className="hidden lg:block">
          <HorizontalNavbar />
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

const ResponsiveDashboardLayout = () => {
  return (
    <BadgeProvider>
      <ResponsiveDashboardContent />
    </BadgeProvider>
  );
};

export default ResponsiveDashboardLayout;
