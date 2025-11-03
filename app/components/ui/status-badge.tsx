import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  'Planning': {
    label: 'Proposed',
    className: 'bg-[#2965DD] text-white hover:bg-[#2965DD]/90'
  },
  'In Progress': {
    label: 'Ongoing',
    className: 'bg-[#F59E0B] text-white hover:bg-[#F59E0B]/90'
  },
  'On Hold': {
    label: 'On hold',
    className: 'bg-[#CD2812] text-white hover:bg-[#CD2812]/90'
  },
  'Completed': {
    label: 'Completed',
    className: 'bg-[#479C39] text-white hover:bg-[#479C39]/90'
  },
  'Cancelled': {
    label: 'Cancelled',
    className: 'bg-gray-500 text-white hover:bg-gray-500/90'
  }
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig['Planning'];

  return (
    <Badge
      className={cn(
        "rounded-[16px] px-[10px] py-[5px] text-[14px] font-normal font-['Inter']",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
