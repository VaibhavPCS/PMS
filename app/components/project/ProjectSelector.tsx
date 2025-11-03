import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown } from 'lucide-react';

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
      <SelectTrigger className="w-[250px] h-[51px] border border-gray-200 rounded-[10px] px-[10px] py-[5px] bg-white hover:bg-gray-50">
        <div className="flex items-center gap-[10px] w-full">
          <div className="w-[35px] h-[35px] rounded-[20px] bg-gradient-to-b from-[#344BFD] to-[#4A8CD7] flex items-center justify-center shrink-0">
            <span className="text-white text-[16px] font-medium font-['Inter']">
              {selectedProject?.title?.[0] || 'P'}
            </span>
          </div>
          <div className="flex flex-col items-start flex-1 min-w-0">
            <span className="text-[14px] font-medium text-[#1D2939] font-['Inter'] truncate w-full">
              {selectedProject?.title || 'Project Title'}
            </span>
            <span className="text-[12px] font-medium text-[#717182] font-['Inter'] truncate w-full">
              {selectedProject?.department || 'Department'}
            </span>
          </div>
          <ChevronDown className="h-[24px] w-[24px] text-gray-500 shrink-0" />
        </div>
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
