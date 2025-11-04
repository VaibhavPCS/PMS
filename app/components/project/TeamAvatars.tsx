import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Member {
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  role: string;
}

interface TeamAvatarsProps {
  categories: Array<{
    name: string;
    members: Member[];
  }>;
  maxVisible?: number;
}

export function TeamAvatars({ categories, maxVisible = 3 }: TeamAvatarsProps) {
  // Extract and deduplicate all members from all categories
  const allMembers = React.useMemo(() => {
    const memberMap = new Map();

    categories.forEach((category) => {
      category.members.forEach((member) => {
        const userId = member.userId._id;
        if (!memberMap.has(userId)) {
          memberMap.set(userId, {
            _id: userId,
            name: member.userId.name,
            email: member.userId.email,
            role: member.role,
          });
        }
      });
    });

    return Array.from(memberMap.values());
  }, [categories]);

  const visibleMembers = allMembers.slice(0, maxVisible);
  const overflowCount = allMembers.length - maxVisible;

  // Generate gradient background for avatars
  const getGradientColors = (index: number) => {
    const gradients = [
      "from-[#344bfd] to-[#4a8cd7]",
      "from-[#f2761b] to-[#ff9a56]",
      "from-[#10b981] to-[#34d399]",
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="flex items-center h-[50px]">
      {visibleMembers.map((member, index) => (
        <div
          key={member._id}
          className="relative rounded-[20px] w-[35px] h-[35px] -mr-[6px]"
          style={{ zIndex: maxVisible - index }}
        >
          <div className="absolute inset-0 rounded-[20px] overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-b ${getGradientColors(index)}`} />
            <Avatar className="w-full h-full border-2 border-white">
              <AvatarFallback className="bg-transparent text-white font-semibold text-sm">
                {member.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      ))}

      {overflowCount > 0 && (
        <div className="bg-[#cccccc] flex items-center justify-center rounded-[20px] w-[35px] h-[35px] -mr-[6px]">
          <span className="font-['Inter'] font-medium text-[16px] text-white">
            +{overflowCount}
          </span>
        </div>
      )}
    </div>
  );
}
