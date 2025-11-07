import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Member {
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  role?: string;
}

interface TeamAvatarsProps {
  categories?: Array<{
    name: string;
    members: Member[];
  }>;
  members?: Member[];
  maxVisible?: number;
  onClick?: () => void;
  className?: string;
}

export function TeamAvatars({ categories, members, maxVisible = 3, onClick, className }: TeamAvatarsProps) {
  // Extract and deduplicate all members from all categories
  const allMembers = React.useMemo(() => {
    const memberMap = new Map();

    const safeMembersFromProps = Array.isArray(members) ? members : [];
    const safeCategories = Array.isArray(categories) ? categories : [];

    // Prefer direct members if provided, else flatten from categories
    const sourceMembers = safeMembersFromProps.length > 0
      ? safeMembersFromProps
      : safeCategories.flatMap((category) => Array.isArray(category?.members) ? category.members : []);

    sourceMembers.forEach((member) => {
      const userId = (member && member.userId && (member.userId as any)._id) || undefined;
      if (!userId) {
        // Skip if we cannot determine a stable id
        return;
      }
      if (!memberMap.has(userId)) {
        const name = (member?.userId as any)?.name || "";
        const email = (member?.userId as any)?.email || "";
        memberMap.set(userId, {
          _id: userId,
          name,
          email,
          role: member?.role || "",
        });
      }
    });

    return Array.from(memberMap.values());
  }, [categories, members]);

  const visibleMembers = allMembers.slice(0, maxVisible);
  const overflowCount = Math.max(0, allMembers.length - maxVisible);

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
    <div
      className={cn(
        "flex items-center h-[50px]",
        onClick ? "cursor-pointer" : "",
        className
      )}
      onClick={onClick}
    >
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
                {(
                  (member.name && member.name.trim().charAt(0)) ||
                  (member.email && member.email.trim().charAt(0)) ||
                  "?"
                ).toUpperCase()}
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
