import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectSeparator
} from '@/components/ui/select';
import { ChevronDown } from 'lucide-react';

interface Workspace {
  _id: string;
  name: string;
  description?: string;
}

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onSwitchWorkspace: (workspaceId: string) => void;
  onCreateWorkspaceClick: () => void;
  canCreateWorkspace?: boolean;
}

export function WorkspaceSelector({
  workspaces,
  currentWorkspace,
  onSwitchWorkspace,
  onCreateWorkspaceClick,
  canCreateWorkspace = false
}: WorkspaceSelectorProps) {
  return (
    <Select value={currentWorkspace?._id || ''} onValueChange={onSwitchWorkspace}>
      <SelectTrigger className="w-[250px] h-[51px] border border-gray-200 rounded-[10px] px-[10px] py-[5px] bg-white hover:bg-gray-50">
        <div className="flex items-center gap-[10px] w-full">
          <div className="w-[35px] h-[35px] rounded-[20px] bg-gradient-to-b from-[#344BFD] to-[#4A8CD7] flex items-center justify-center shrink-0">
            <span className="text-white text-[16px] font-medium font-['Inter']">
              {currentWorkspace?.name?.[0] || 'W'}
            </span>
          </div>
          <div className="flex flex-col items-start flex-1 min-w-0">
            <span className="text-[14px] font-medium text-[#1D2939] font-['Inter'] truncate w-full">
              {currentWorkspace?.name || 'Select Workspace'}
            </span>
            <span className="text-[12px] font-medium text-[#717182] font-['Inter'] truncate w-full">
              {currentWorkspace?.description || 'Workspace'}
            </span>
          </div>
          <ChevronDown className="h-[24px] w-[24px] text-gray-500 shrink-0" />
        </div>
      </SelectTrigger>
      <SelectContent className="w-[250px]">
        {workspaces.map((workspace) => (
          <SelectItem key={workspace._id} value={workspace._id} className="font-['Inter']">
            <div className="flex items-center gap-[10px]">
              <div className="w-[35px] h-[35px] rounded-[20px] bg-gradient-to-b from-[#344BFD] to-[#4A8CD7] flex items-center justify-center">
                <span className="text-white text-[16px] font-medium">
                  {workspace.name?.[0] || 'W'}
                </span>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[14px] font-medium text-[#1D2939] truncate max-w-[150px]">
                  {workspace.name}
                </span>
                <span className="text-[12px] font-medium text-[#717182]">
                  {workspace.description || 'Workspace'}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
        {canCreateWorkspace && (
          <>
            <SelectSeparator />
            <SelectItem value="create-new-workspace" onSelect={onCreateWorkspaceClick} className="font-['Inter'] text-[#F2761B] font-medium">
              + Create New Workspace
            </SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
}

export default WorkspaceSelector;
