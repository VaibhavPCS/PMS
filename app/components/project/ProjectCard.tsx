import React, { useState } from 'react';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Users, Edit, Trash2, CheckCircle2, PlayCircle, Pause, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router';
import { TruncatedTextModal } from '@/components/ui/truncated-text-modal';
import { useAuth } from '@/provider/auth-context';
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
import { EditProjectModal } from '@/components/project/EditProjectModal';


type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';


interface Project {
  _id: string;
  propertyId?: string;
  title: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  projectHead: {
    _id: string;
    name: string;
    email: string;
  };
  creator?: {
    _id: string;
    name: string;
    email: string;
  };
  members: Array<{
    userId: {
      _id: string;
      name: string;
      email: string;
    };
    addedAt: string;
  }>;
  budget?: {
    allocated: number;
    spent: number;
  };
  startDate: string;
  endDate: string;
}


interface ProjectCardProps {
  project: Project;
  onStatusChange?: (projectId: string, newStatus: ProjectStatus, newProgress: number) => Promise<void>;
  onDelete?: (projectId: string) => Promise<void>;
  onUpdated?: () => void;
}


const statusBorderColors: Record<ProjectStatus, string> = {
  'Planning': 'border-[#2965DD]',
  'In Progress': 'border-[#F59E0B]',
  'On Hold': 'border-[#CD2812]',
  'Completed': 'border-[#479C39]',
  'Cancelled': 'border-gray-500'
};


const statusProgressColors: Record<ProjectStatus, string> = {
  'Planning': 'bg-[#2965DD]',
  'In Progress': 'bg-[#F59E0B]',
  'On Hold': 'bg-[#CD2812]',
  'Completed': 'bg-[#479C39]',
  'Cancelled': 'bg-gray-500'
};


export function ProjectCard({ project, onStatusChange, onDelete, onUpdated }: ProjectCardProps) {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const { user } = useAuth();


  const currentUserId = (user as any)?.id || (user as any)?._id || '';
  const userRole = (user as any)?.role || '';
  const isAdmin = ['admin', 'super_admin', 'super-admin'].includes(userRole);
  const isProjectLead = !!project?.projectHead?._id && project.projectHead._id === currentUserId;
  const isProjectMember = isProjectLead || (project?.members || []).some(m => m?.userId?._id === currentUserId);


  // Count project head + all members
  const totalMembers = 1 + (project.members?.length || 0);


  const projectId = project.propertyId || `PID${project._id.slice(-5)}`;


  // Check if project is overbudget
  const isOverbudget = project.budget && project.budget.spent > project.budget.allocated;


  const handleCardClick = () => {
    navigate(`/project/${project._id}`);
  };


  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (isUpdating) return;
    // Defensive checks
    const allowedStatuses: ProjectStatus[] = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];
    if (!project || !project._id) {
      toast.error('Invalid project reference.');
      return;
    }
    if (!allowedStatuses.includes(newStatus)) {
      toast.error('Invalid status selection.');
      return;
    }
    if (newStatus === project.status) {
      toast.info('Status is already set to this value.');
      return;
    }


    setIsUpdating(true);
    try {
      const response = await putData(`/project/${project._id}`, { status: newStatus });
      const updated = (response as any)?.project ?? {};
      const statusProgressMap: Record<ProjectStatus, number> = {
        'Planning': 10,
        'In Progress': 50,
        'On Hold': 30,
        'Completed': 100,
        'Cancelled': 0
      };
      const newProgress = typeof updated.progress === 'number' ? updated.progress : statusProgressMap[newStatus];
      toast.success(`Project status updated to ${newStatus}`);
      if (onStatusChange) {
        await onStatusChange(project._id, newStatus, newProgress);
      }
    } catch (error: any) {
      let errMsg = 'Failed to update project status';
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const serverMsg = (error.response?.data as any)?.message;
        if (status === 403) {
          errMsg = serverMsg || "You don't have permission to update this project";
        } else if (status === 404) {
          errMsg = serverMsg || 'Project not found';
        } else if (status) {
          errMsg = serverMsg || `Server error (${status})`;
        } else {
          errMsg = error.message;
        }
      }
      toast.error(errMsg);
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
    } catch (error: any) {
      let errMsg = 'Failed to delete project';
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const serverMsg = (error.response?.data as any)?.message;
        if (status === 403) {
          errMsg = serverMsg || "You don't have permission to delete this project";
        } else if (status === 404) {
          errMsg = serverMsg || 'Project not found';
        } else if (status) {
          errMsg = serverMsg || `Server error (${status})`;
        } else {
          errMsg = error.message;
        }
      }
      toast.error(errMsg);
    } finally {
      setIsUpdating(false);
    }
  };


  // Restrict rendering: show only to project members or admins
  if (!isAdmin && !isProjectMember) {
    return null;
  }

  return (
    <>
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
          {(isAdmin || isProjectLead) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-1 h-7 w-7 hover:bg-gray-100 rounded transition-colors"
                    onClick={(e) => e.stopPropagation()}
                    disabled={isUpdating}
                  >
                    <MoreVertical size={18} className="text-[#717182]" />
                  </Button>
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
                  onSelect={(e) => {
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
                  onSelect={(e) => {
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
                  onSelect={(e) => {
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
                  onSelect={(e) => {
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
                  onSelect={(e) => {
                    e.stopPropagation();
                    setShowEdit(true);
                  }}
                  className="font-['Inter']"
                >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Project
                  </DropdownMenuItem>

                <DropdownMenuItem
                  onSelect={(e) => {
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
            )}
          </div>

          {/* Project Info */}
          <div className="flex flex-col gap-[10px]">
            <p className="text-[16px] text-black font-normal font-['Inter']">
              {project.title}
            </p>
            <TruncatedTextModal
              text={project.description}
              lines={3}
              textClassName="text-[14px] text-[#717182] font-normal font-['Inter'] leading-[normal]"
              modalTitle="Description"
            />
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
                {totalMembers} employees
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

      {/* Edit Modal */}
    {(isAdmin || isProjectLead) && (
        <EditProjectModal
          open={showEdit}
          onClose={() => setShowEdit(false)}
          project={{
            _id: project._id,
            title: project.title,
            description: project.description,
            status: project.status,
            progress: project.progress,
            startDate: project.startDate,
            endDate: project.endDate,
          } as any}
          onProjectUpdated={() => {
            setShowEdit(false);
            onUpdated?.();
          }}
        />
      )}
    </>
  );
}


export default ProjectCard;
