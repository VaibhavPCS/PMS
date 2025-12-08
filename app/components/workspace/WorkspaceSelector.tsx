import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectSeparator
} from '@/components/ui/select';
import { ChevronDown, Building2 } from 'lucide-react';

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
      <SelectTrigger className="h-auto rounded-[6px] bg-[#f5f4f9] text-[#777777] text-[12px] font-['Inter'] hover:bg-[#e5e4e9] px-[5px] py-[5px] flex items-center gap-[5px] border-none focus:ring-0 w-auto min-w-[120px]">
        <Building2 className="w-4 h-4 shrink-0" />
        <span className="truncate max-w-[150px]">
          {currentWorkspace?.name || 'Select Workspace'}
        </span>
        <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
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
