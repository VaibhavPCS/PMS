import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { cn } from '@/lib/utils';

interface User {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
  avatar?: string;
}

interface AvatarGroupProps {
  users: User[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  count?: number;
  countLabel?: string;
  className?: string;
}

export function AvatarGroup({
  users,
  max = 3,
  size = 'sm',
  showCount = true,
  count,
  countLabel = 'replies',
  className,
}: AvatarGroupProps) {
  const sizeClasses = {
    sm: 'w-[18px] h-[18px] text-[8px]',
    md: 'w-6 h-6 text-[10px]',
    lg: 'w-8 h-8 text-xs',
  };

  const displayUsers = users.slice(0, max);
  const remainingCount = users.length - max;
  const displayCount = count !== undefined ? count : users.length;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {/* Avatar Stack */}
      <div className="flex -space-x-1.5">
        {displayUsers.map((user, index) => (
          <Avatar
            key={user._id || user.id || index}
            className={cn(
              sizeClasses[size],
              'border-2 border-white ring-1 ring-gray-200'
            )}
          >
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="text-[8px] font-semibold bg-blue-100 text-blue-700">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
        {remainingCount > 0 && (
          <div
            className={cn(
              sizeClasses[size],
              'flex items-center justify-center rounded-full border-2 border-white bg-gray-200 text-gray-700 font-semibold ring-1 ring-gray-200'
            )}
          >
            +{remainingCount}
          </div>
        )}
      </div>

      {/* Count Label */}
      {showCount && (
        <span className="text-xs text-gray-600">
          {displayCount} {displayCount === 1 ? countLabel.replace(/ies$/, 'y').replace(/s$/, '') : countLabel}
        </span>
      )}
    </div>
  );
}
