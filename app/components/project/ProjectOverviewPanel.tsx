import React from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { TruncatedTextModal } from "@/components/ui/truncated-text-modal";

type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'Completed';

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
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  };

  const duration = calculateDuration();

  // Format date to match Figma (DD/MM/YYYY)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
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
            <TruncatedTextModal
              text={description}
              lines={3}
              ellipsisClassName="text-[#040110] bg-[#E5EFFF]"
              modalBgClassName="bg-[#E5EFFF]"
              modalTitle="Description"
            />
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
