import React from "react";
import { StatusBadge } from "@/components/ui/status-badge";

type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';

interface ProjectOverviewPanelProps {
  projectManager: string;
  projectHead?: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
}

export function ProjectOverviewPanel({
  projectManager,
  projectHead,
  description,
  startDate,
  endDate,
  status,
}: ProjectOverviewPanelProps) {
  // Calculate duration in days
  const calculateDuration = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const duration = calculateDuration();

  // Format date to match Figma (DD/MM/YYYY)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const FieldGroup = ({ label, value, fullWidth = false }: { label: string; value: string | React.ReactNode; fullWidth?: boolean }) => (
    <div className={fullWidth ? "col-span-3" : ""}>
      <div className="text-[12px] font-normal font-['Inter'] text-[#6B7280] mb-[5px]">
        {label}
      </div>
      <div className="text-[14px] font-normal font-['Inter'] text-[#040110]">
        {value}
      </div>
    </div>
  );

  return (
    <div className="bg-[#E5EFFF] rounded-[10px] p-[20px] w-full">
      {/* Row 1: Project Manager & Project Lead */}
      <div className="grid grid-cols-3 gap-x-[16px] gap-y-[12px] mb-[12px]">
        {/* <FieldGroup label="Project Manager" value={projectManager} /> */}
        <FieldGroup label="Project Lead" value={projectHead || '—'} />
      </div>

      {/* Row 2: Description */}
      <div className="mb-[12px]">
        <FieldGroup
          label="Description"
          value={
            <div className="leading-[1.5] max-h-[73px] overflow-hidden">
              {description}
            </div>
          }
          fullWidth
        />
      </div>

      {/* Row 3: Dates, Duration, Status */}
      <div className="grid grid-cols-4 gap-x-[16px] gap-y-[12px]">
        <FieldGroup label="Project Start Date" value={formatDate(startDate)} />
        <FieldGroup label="Project End Date" value={formatDate(endDate)} />
        <FieldGroup label="Duration" value={`${duration} Days`} />
        <div>
          <div className="text-[12px] font-normal font-['Inter'] text-[#6B7280] mb-[5px]">
            Status
          </div>
          <StatusBadge status={status} />
        </div>
      </div>
    </div>
  );
}
