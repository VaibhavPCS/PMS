import React from 'react';
import { useNavigate } from 'react-router';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../provider/auth-context';
import { Pencil, LogOut } from 'lucide-react';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
  userInfo: {
    name: string;
    email: string;
  } | null;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({
  isOpen,
  onClose,
  anchorEl,
  userInfo,
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
      navigate('/sign-in');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const handleProfileClick = () => {
    navigate('/profile');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
      />

      {/* Profile Panel */}
      <div
        className="fixed z-50 bg-white border border-gray-200 rounded-[5px] shadow-lg overflow-hidden"
        style={{
          width: '274px',
          top: anchorEl ? `${anchorEl.getBoundingClientRect().bottom + 8}px` : '88px',
          right: '20px',
        }}
      >
        {/* Content */}
        <div className="p-[8px]">
          {/* User Info Section */}
          <div className="flex items-center justify-between mb-[10px] p-[6px]">
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

              {/* User Details */}
              <div className="flex flex-col">
                <p className="font-['Work_Sans:Medium',sans-serif] font-medium text-[16px] leading-[19px] text-[#141414]">
                  {userInfo?.name || 'User'}
                </p>
                <p className="font-['Work_Sans:Regular',sans-serif] font-normal text-[12px] leading-[15px] text-[#6b7280] mt-[1px]">
                  {userInfo?.email || 'user@example.com'}
                </p>
              </div>
            </div>

            {/* Edit Icon */}
            {/* <button
              onClick={handleProfileClick}
              className="w-[20px] h-[20px] flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
              aria-label="Edit profile"
            >
              <Pencil className="w-[16px] h-[16px] text-gray-600" />
            </button> */}
          </div>

          {/* Profile Link */}
          {/* <button
            onClick={handleProfileClick}
            className="w-full text-left px-[6px] py-[8px] mb-[7px] hover:bg-gray-50 rounded transition-colors"
          >
            <span className="font-['Work_Sans:Regular',sans-serif] text-[14px] leading-[17px] text-[#141414]">
              Profile
            </span>
          </button> */}

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            className="w-full bg-[#f2761b] hover:bg-[#e06512] text-white font-['Work_Sans:Medium',sans-serif] text-[14px] h-[31px] rounded-[5px] flex items-center justify-center gap-[8px]"
          >
            <LogOut className="w-[16px] h-[16px]" />
            Logout
          </Button>
        </div>
      </div>
    </>
  );
};

export default ProfilePanel;
