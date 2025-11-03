import React, { useState } from 'react';
import styled from 'styled-components';
import { ChevronDown, Plus } from 'lucide-react';

const DropdownContainer = styled.div`
  position: relative;
  width: 250px;
`;

const DropdownButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 5px 10px;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  background-color: white;
  cursor: pointer;
`;

const WorkspaceInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const WorkspaceIcon = styled.div`
  width: 35px;
  height: 35px;
  border-radius: 20px;
  background: linear-gradient(to bottom, #344bfd, #4a8cd7);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 500;
`;

const WorkspaceName = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  p {
    margin: 0;
    font-family: 'Inter', sans-serif;
  }

  .title {
    font-size: 14px;
    color: #1d2939;
    font-weight: 500;
  }

  .department {
    font-size: 12px;
    color: #717182;
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background-color: white;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  margin-top: 5px;
  z-index: 10;
`;

const DropdownItem = styled.div`
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;

  &:hover {
    background-color: #F3F4F6;
  }
`;

const CreateWorkspaceButton = styled.div`
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  border-top: 1px solid #E5E7EB;
  color: #344bfd;

  &:hover {
    background-color: #F3F4F6;
  }
`;

interface WorkspaceSwitcherProps {
  workspaces: any[];
  currentWorkspace: any;
  onSwitchWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
}

const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  workspaces,
  currentWorkspace,
  onSwitchWorkspace,
  onCreateWorkspace,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSwitchWorkspace = (workspaceId: string) => {
    onSwitchWorkspace(workspaceId);
    setIsOpen(false);
  };

  return (
    <DropdownContainer>
      <DropdownButton onClick={() => setIsOpen(!isOpen)}>
        <WorkspaceInfo>
          <WorkspaceIcon>
            {currentWorkspace?.name.charAt(0).toUpperCase()}
          </WorkspaceIcon>
          <WorkspaceName>
            <p className="title">{currentWorkspace?.name}</p>
            <p className="department">Department</p>
          </WorkspaceName>
        </WorkspaceInfo>
        <ChevronDown size={24} color="#717182" />
      </DropdownButton>
      {isOpen && (
        <DropdownMenu>
          {workspaces.map((ws) => (
            <DropdownItem
              key={ws.workspaceId._id}
              onClick={() => handleSwitchWorkspace(ws.workspaceId._id)}
            >
              <WorkspaceIcon>
                {ws.workspaceId.name.charAt(0).toUpperCase()}
              </WorkspaceIcon>
              <WorkspaceName>
                <p className="title">{ws.workspaceId.name}</p>
                <p className="department">Department</p>
              </WorkspaceName>
            </DropdownItem>
          ))}
          <CreateWorkspaceButton onClick={onCreateWorkspace}>
            <Plus size={20} />
            <span>Create New Workspace</span>
          </CreateWorkspaceButton>
        </DropdownMenu>
      )}
    </DropdownContainer>
  );
};

export default WorkspaceSwitcher;
