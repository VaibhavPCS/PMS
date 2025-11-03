import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Users, Edit, Trash2, CheckCircle2, PlayCircle, Pause, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { putData } from '@/lib/fetch-util';

type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';

interface Project {
  _id: string;
  propertyId?: string;
  title: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  categories: {
    members: any[];
  }[];
  budget?: {
    allocated: number;
    spent: number;
  };
}

interface ProjectCardProps {
  project: Project;
  onStatusChange?: (projectId: string, newStatus: ProjectStatus) => Promise<void>;
  onDelete?: (projectId: string) => Promise<void>;
}

const statusBorderColors: Record<ProjectStatus, string> = {
  'Planning': 'border-[#2965DD]',
  'In Progress': 'border-[#F59E0B]',
  'On Hold': 'border-[#CD2812]',
  'Completed': 'border-[#479C39]',
  'Cancelled': 'border-gray-500'
};

const statusProgressColors: Record<ProjectStatus, string> = {
  'Planning': 'bg-[#CD2812]',
  'In Progress': 'bg-[#344BFD]',
  'On Hold': 'bg-[#F59E0B]',
  'Completed': 'bg-[#1A932E]',
  'Cancelled': 'bg-gray-400'
};

export function ProjectCard({ project, onStatusChange, onDelete }: ProjectCardProps) {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);

  const totalMembers = project.categories.reduce(
    (acc, category) => acc + category.members.length,
    0
  );

  const projectId = project.propertyId || `PID${project._id.slice(-5)}`;

  // Check if project is overbudget
  const isOverbudget = project.budget && project.budget.spent > project.budget.allocated;

  const handleCardClick = () => {
    navigate(`/project/${project._id}`);
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await putData(`/project/${project._id}`, { status: newStatus });
      toast.success(`Project status updated to ${newStatus}`);
      if (onStatusChange) {
        await onStatusChange(project._id, newStatus);
      }
    } catch (error) {
      toast.error('Failed to update project status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (isUpdating) return;
    if (!confirm('Are you sure you want to delete this project?')) return;
    setIsUpdating(true);
    try {
      if (onDelete) {
        await onDelete(project._id);
      }
      toast.success('Project deleted successfully');
    } catch (error) {
      toast.error('Failed to delete project');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card
      className={cn(
        "w-[273.75px] h-[313px] rounded-[10px] border-[0.5px] p-0 overflow-hidden cursor-pointer hover:shadow-md transition-shadow bg-white",
        statusBorderColors[project.status]
      )}
      onClick={handleCardClick}
    >
      <div className="flex flex-col gap-[25px] p-[21px_17px]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <StatusBadge status={project.status} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical size={24} className="text-[#717182]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[200px]"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuLabel className="font-['Inter']">Project Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Status Change Options */}
              {project.status !== 'Planning' && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange('Planning');
                  }}
                  className="font-['Inter']"
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Mark as Proposed
                </DropdownMenuItem>
              )}
              {project.status !== 'In Progress' && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange('In Progress');
                  }}
                  className="font-['Inter']"
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Mark as Ongoing
                </DropdownMenuItem>
              )}
              {project.status !== 'On Hold' && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange('On Hold');
                  }}
                  className="font-['Inter']"
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Mark as On Hold
                </DropdownMenuItem>
              )}
              {project.status !== 'Completed' && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange('Completed');
                  }}
                  className="font-['Inter']"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as Completed
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/project/${project._id}`);
                }}
                className="font-['Inter']"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Project
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="font-['Inter'] text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Project Info */}
        <div className="flex flex-col gap-[10px]">
          <p className="text-[16px] text-black font-normal font-['Inter']">
            {project.title}
          </p>
          <p className="text-[14px] text-[#717182] font-normal font-['Inter'] line-clamp-4 leading-[normal]">
            {project.description}
          </p>
        </div>

        {/* Progress */}
        <div className="flex flex-col gap-[10px]">
          <div className="flex items-center justify-between text-[14px] text-[#717182] font-normal font-['Inter']">
            <span>Progress</span>
            <span>{project.progress}%</span>
          </div>
          <div className="w-full h-[5px] bg-[#E6E8EC] rounded-[16px] overflow-hidden">
            <div
              className={cn(
                "h-full rounded-[16px] transition-all",
                statusProgressColors[project.status]
              )}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[10px]">
            <div className="w-[28px] h-[28px] rounded-[6px] bg-[rgba(52,75,253,0.2)] flex items-center justify-center">
              <Users size={20} className="text-[#344BFD]" />
            </div>
            <p className="text-[14px] text-[#717182] font-normal font-['Inter']">
              {totalMembers} members
            </p>
          </div>

          {/* Overbudget badge (only for In Progress projects) */}
          {isOverbudget && project.status === 'In Progress' && (
            <Badge className="bg-[rgba(205,40,18,0.25)] text-[#CD2812] hover:bg-[rgba(205,40,18,0.25)] rounded-[16px] px-[10px] py-[5px] text-[12px] font-normal font-['Inter']">
              Overbudget
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

export default ProjectCard;
