import React, { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronDown } from 'lucide-react';
import { useBadges } from '../../provider/badge-context';
import { useAuth } from '../../provider/auth-context';

// Navigation item type
interface NavItem {
  name: string;
  href: string;
  icon: string; // SVG path
  badgeKey?: 'notifications' | 'messages'; // Key to identify which badge to show
  hasDropdown?: boolean; // For Administration item
  subItems?: { name: string; href: string }[]; // Submenu items for dropdown
}

// Define the navigation items matching Figma design
const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: '/assets/4001ba5860d2858f2469e275a4ce7fe2c2c2a952.svg', // Dashboard icon
  },
  {
    name: 'Workspace',
    href: '/workspace',
    icon: '/assets/84789fe1294f4eedc3013b31bb79e7394bd87fab.svg', // Building icon
  },
  // {
  //   name: 'Meetings',
  //   href: '/meetings',
  //   icon: '/assets/f9c7d9cff49e119c3ec5f445cfc83669d39c4316.svg', // Meeting icon
  // },
  // {
  //   name: 'Messages',
  //   href: '/chat',
  //   icon: '/assets/8fa45b78e2676154445cac574d31fb27521e2ea2.svg', // Message icon
  //   badgeKey: 'messages',
  // }, 
  // {
  //   name: 'Notifications',
  //   href: '/notifications',
  //   icon: '/assets/2d994bf0fad32811c48b4a9c7fec2f06e9e67362.svg', // Bell icon
  //   badgeKey: 'notifications',
  // },
  {
    name: 'Administration',
    href: '/administration',
    icon: '/assets/b7b1ff15d3dbedec030add1434e807ef753068e4.svg', // Security icon
    hasDropdown: true,
    subItems: [
      { name: 'Role Management', href: '/administration/role-management' },
      { name: 'User Management', href: '/administration/user-management' },
    ],
  },
];

const VerticalSidebar = () => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { badgeCounts } = useBadges();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const visibleNavItems = navItems.filter((item) => item.name !== 'Administration' || isAdmin);

  const isActive = (href: string, hasDropdown?: boolean, subItems?: { name: string; href: string }[]) => {
    // For dropdown items, only consider them active if we're exactly on that route
    // and not on any of their sub-routes
    if (hasDropdown && subItems) {
      const isOnSubRoute = subItems.some(subItem => location.pathname === subItem.href);
      if (isOnSubRoute) {
        return false; // Don't highlight parent if we're on a sub-route
      }
      return location.pathname === href;
    }
    
    // For regular items, use the original logic
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const toggleDropdown = (itemName: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  return (
    <div
      className="flex flex-col bg-white h-screen border-r border-gray-200"
      style={{ width: '224px' }} // Sidebar width from Figma
    >
      {/* Logo Section */}
      <div className="flex items-center px-[16px] py-[20px] border-b border-gray-200">
        <div className="flex items-center gap-[12px]">
          <img
            src="/pcs_logo.jpg"
            alt="PCS Logo"
            className="w-[40px] h-[40px] rounded-[8px] object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="flex flex-col">
            <span 
              className="font-['Inter',sans-serif] text-[12px] font-medium leading-normal"
              style={{ 
                color: '#0A0A0A',
                fontWeight: 500,
                whiteSpace: 'pre-line'
              }}
            >
              PCS Managament{'\n'}System Tracker
            </span>
          </div>
        </div>
      </div>

      {/* MENU Label */}
      <div className="px-[16px] pt-[20px] pb-[12px]">
        <span className="font-['Inter:Regular',sans-serif] text-[12px] tracking-[0.5px] text-[#717182] uppercase">
          Menu
        </span>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-[12px] space-y-[4px]">
        {visibleNavItems.map((item) => {
          const active = isActive(item.href, item.hasDropdown, item.subItems);
          const isExpanded = expandedItems.has(item.name);

          return (
            <div key={item.name}>
              {item.hasDropdown ? (
                <>
                  {/* Administration with dropdown */}
                  <button
                    onClick={() => toggleDropdown(item.name)}
                    className={`
                      w-[200px] flex items-center justify-between
                      rounded-[5px] pl-[12px] pr-0 py-[10px]
                      transition-colors
                      ${
                        active
                          ? 'bg-[#f2761b] text-white'
                          : isExpanded
                          ? 'bg-[#e6e8ec] text-[#717182]'
                          : 'text-[#717182] hover:bg-[#e6e8ec]'
                      }
                    `}
                  >
                    <div className="flex items-center gap-[12px]">
                      <img
                        src={item.icon}
                        alt={item.name}
                        className="w-[20px] h-[20px]"
                      />
                      <span className="font-['Inter:Medium',sans-serif] text-[14px] tracking-[0.5px] leading-[normal]">
                        {item.name}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-[24px] h-[24px] transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Submenu items */}
                  {isExpanded && item.subItems && (
                    <div className="mt-[4px] space-y-[4px]">
                      {item.subItems.map((subItem) => {
                        const subActive = isActive(subItem.href, false);
                        return (
                          <Link
                            key={subItem.href}
                            to={subItem.href}
                            className={`
                              w-[200px] flex items-center
                              rounded-[5px] pl-[44px] pr-[12px] py-[10px]
                              transition-colors
                              ${
                                subActive
                                  ? 'bg-[#f2761b] text-white'
                                  : 'text-[#717182] hover:bg-[#e6e8ec]'
                              }
                            `}
                          >
                            <span className="font-['Inter:Regular',sans-serif] text-[14px] tracking-[0.5px] leading-[normal]">
                              {subItem.name}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                // Regular navigation item
                <Link
                  to={item.href}
                  className={`
                    w-[200px] flex items-center gap-[12px]
                    rounded-[5px] pl-[12px] pr-0 py-[12px]
                    transition-colors
                    ${
                      active
                        ? 'bg-[#f2761b] text-white'
                        : 'text-[#717182] hover:bg-[#e6e8ec]'
                    }
                  `}
                >
                  <img
                    src={item.icon}
                    alt={item.name}
                    className="w-[20px] h-[20px] shrink-0"
                  />
                  <span className="font-['Inter:Medium',sans-serif] text-[14px] tracking-[0.5px] leading-[normal] grow">
                    {item.name}
                  </span>
                  {item.badgeKey && badgeCounts[item.badgeKey] > 0 && (
                    <div className="relative w-[20px] h-[20px] shrink-0">
                      {/* Notification badge */}
                      <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{ transform: 'translate(-50%, -50%) rotate(90deg)' }}
                      >
                        <div className="bg-[#f2761b] rounded-[10px] p-[3px] flex items-center justify-center">
                          <span
                            className="font-['Inter:Regular',sans-serif] text-[10px] text-white leading-[7px]"
                            style={{ transform: 'rotate(-90deg)' }}
                          >
                            {badgeCounts[item.badgeKey]}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

export default VerticalSidebar;
