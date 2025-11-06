import React, { useState, useEffect, useRef } from 'react';
import { fetchData } from '@/lib/fetch-util';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useBadges } from '../../provider/badge-context';
import NotificationPanel from './notification-panel';
import ProfilePanel from './profile-panel';

interface UserInfo {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface HorizontalNavbarProps {
  title?: string;
  subtitle?: string;
}

const HorizontalNavbar: React.FC<HorizontalNavbarProps> = ({
  title = 'PMS',
  subtitle = 'Centralized project tracking and monitoring',
}) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const { badgeCounts, refreshBadgeCounts } = useBadges();

  useEffect(() => {
    fetchUserInfo();
  }, []);

  // Refresh count when notification panel closes
  useEffect(() => {
    if (!showNotifications) {
      // Refresh count when panel closes (user may have read notifications)
      refreshBadgeCounts();
    }
  }, [showNotifications, refreshBadgeCounts]);

  const fetchUserInfo = async () => {
    try {
      const response = await fetchData('/auth/me');
      setUserInfo(response.user);
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

  const getRoleDisplay = (role: string) => {
    return role.toUpperCase().replace('_', ' ');
  };

  // Helper to limit visible words and append ellipsis (same as dashboard)
  const limitWords = (text: string, maxWords: number) => {
    if (!text) return '';
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  // Show only first name without ellipsis, leveraging the same limiter
  const getFirstName = (name: string) => {
    const limited = limitWords(name, 1);
    return limited.replace(/\.\.\.$/, '');
  };

  return (
    <div
      className="bg-[#f1f2f7] flex flex-col gap-[20px] items-start justify-end"
      style={{ height: '80px', width: '100%' }}
    >
      {/* Main Content */}
      <div className="flex items-center justify-between w-full px-[20px]">
        {/* Left: Navigation Header */}
        <div className="flex flex-col gap-[5px]">
          <p className="font-['Inter:Medium',sans-serif] font-medium text-[16px] leading-[normal] text-black whitespace-pre">
            {title}
          </p>
          <p
            className="font-['Inter:Regular',sans-serif] font-normal text-[12px] text-[#273240] tracking-[0.5px]"
            style={{ lineHeight: '12px' }}
          >
            {subtitle}
          </p>
        </div>

        {/* Right: Notification + User Card */}
        <div className="flex items-center gap-[18px]">
          {/* Notification Bell */}
          <button
            ref={notificationButtonRef}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-[20px] w-[35px] h-[35px] flex items-center justify-center hover:bg-white/50 transition-colors"
          >
            {/* Bell Icon */}
            <div className="relative w-[20px] h-[20px]">
              <img
                src="/assets/e9340f854154f362251265ef2e4e4de4bf91ef42.svg"
                alt="Notifications"
                className="w-full h-full"
              />
            </div>

            {/* Notification Badge */}
            {badgeCounts.notifications > 0 && (
              <div
                className="absolute"
                style={{
                  top: 'calc(50% - 8.5px)',
                  left: 'calc(50% + 6.503px)',
                  transform: 'translate(-50%, -50%) rotate(90deg)',
                }}
              >
                <div className="bg-[#f2761b] rounded-[10px] p-[3px] flex items-center justify-center">
                  <span
                    className="font-['Inter:Regular',sans-serif] text-[10px] text-white"
                    style={{
                      lineHeight: '7px',
                      transform: 'rotate(-90deg)',
                      display: 'block',
                      width: '7px',
                      height: '7px',
                    }}
                  >
                    {badgeCounts.notifications > 9 ? '9+' : badgeCounts.notifications}
                  </span>
                </div>
              </div>
            )}
          </button>

          {/* User Profile Card */}
          <button
            ref={profileButtonRef}
            onClick={() => setShowProfile(!showProfile)}
            className="bg-white flex items-center gap-[20px] pl-[8px] pr-[20px] py-[2px] rounded-[5px] hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-[20px]">
              {/* Avatar */}
              <Avatar
                className="rounded-[6px]"
                style={{ width: '35.003px', height: '35.003px' }}
              >
                <AvatarFallback className="rounded-[6px] bg-gradient-to-br from-blue-500 to-purple-500 text-white font-['Work_Sans:SemiBold',sans-serif] text-[14px]">
                  {userInfo?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div
                className="flex flex-col items-start justify-center text-center"
                style={{ width: '96px' }}
              >
                <p className="font-['Work_Sans:Regular',sans-serif] font-normal text-[16px] leading-[normal] text-[#141414] whitespace-nowrap">
                  {getFirstName(userInfo?.name || 'Loading...')}
                </p>
                {/*
                <p className="font-['Work_Sans:Regular',sans-serif] font-normal text-[12px] leading-[normal] text-gray-500 whitespace-nowrap">
                  {userInfo ? getRoleDisplay(userInfo.role) : 'USER'}
                </p>
                */}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Divider */}
      <div
        className="w-full"
        style={{
          height: '0.924px',
          background: 'rgba(0, 0, 0, 0.1)',
        }}
      />

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        anchorEl={notificationButtonRef.current}
      />

      {/* Profile Panel */}
      <ProfilePanel
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        anchorEl={profileButtonRef.current}
        userInfo={userInfo}
      />
    </div>
  );
};

export default HorizontalNavbar;
