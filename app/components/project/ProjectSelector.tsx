import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, Building2 } from 'lucide-react';

interface Project {
  _id: string;
  title: string;
  department?: string;
}

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjectId?: string;
  onSelectProject: (projectId: string) => void;
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  onSelectProject
}: ProjectSelectorProps) {
  const selectedProject = projects.find(p => p._id === selectedProjectId);

  return (
    <Select value={selectedProjectId} onValueChange={onSelectProject}>
      <SelectTrigger className="h-auto rounded-[6px] bg-[#f5f4f9] text-[#777777] text-[12px] font-['Inter'] hover:bg-[#e5e4e9] px-[5px] py-[5px] flex items-center gap-[5px] border-none focus:ring-0 w-auto min-w-[120px]">
        <Building2 className="w-4 h-4 shrink-0" />
        <span className="truncate max-w-[150px]">
          {selectedProject?.title || 'Select Project'}
        </span>
        <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
      </SelectTrigger>
      <SelectContent className="w-[250px]">
        <SelectItem value="all" className="font-['Inter']">
          <div className="flex items-center gap-[10px]">
            <div className="w-[35px] h-[35px] rounded-[20px] bg-gradient-to-b from-[#344BFD] to-[#4A8CD7] flex items-center justify-center">
              <span className="text-white text-[16px] font-medium">A</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[14px] font-medium text-[#1D2939]">All Projects</span>
              <span className="text-[12px] font-medium text-[#717182]">All Departments</span>
            </div>
          </div>
        </SelectItem>
        {projects.map((project) => (
          <SelectItem key={project._id} value={project._id} className="font-['Inter']">
            <div className="flex items-center gap-[10px]">
              <div className="w-[35px] h-[35px] rounded-[20px] bg-gradient-to-b from-[#344BFD] to-[#4A8CD7] flex items-center justify-center">
                <span className="text-white text-[16px] font-medium">
                  {project.title[0]}
                </span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[14px] font-medium text-[#1D2939] truncate max-w-[150px]">
                  {project.title}
                </span>
                <span className="text-[12px] font-medium text-[#717182]">
                  {project.department || 'General'}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default ProjectSelector;
