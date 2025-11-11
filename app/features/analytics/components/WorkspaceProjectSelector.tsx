// frontend/app/features/analytics/components/WorkspaceProjectSelector.tsx

import { useEffect, useState } from 'react';
import { useFilter } from '../context/FilterContext';
import { useAuth } from '@/provider/auth-context';
import { fetchData } from '@/lib/fetch-util';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WorkspaceData {
  workspaceId: {
    _id: string;
    name: string;
    description: string;
  };
  role: string;
  joinedAt: string;
  _id: string;
}

interface Project {
  _id: string;
  title: string;
  workspace: string;
}

interface WorkspaceResponse {
  workspaces: WorkspaceData[];
  currentWorkspace: {
    _id: string;
    name: string;
  };
}

interface ProjectResponse {
  projects: Project[];
}

export function WorkspaceProjectSelector() {
  const { user } = useAuth();
  const { 
    selectedWorkspaceId, 
    selectedProjectId, 
    setSelectedWorkspace, 
    setSelectedProject 
  } = useFilter();
  
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Fetch workspaces on mount
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        setLoadingWorkspaces(true);
        const data = await fetchData<WorkspaceResponse>('/workspace');
        
        console.log('Fetched workspace response:', data);
        
        const workspaceList = data?.workspaces || [];
        setWorkspaces(workspaceList);
        
        // ✅ Auto-select current workspace with name
        if (data?.currentWorkspace?._id && !selectedWorkspaceId) {
          setSelectedWorkspace(data.currentWorkspace._id, data.currentWorkspace.name);
        }
      } catch (error) {
        console.error('Failed to fetch workspaces:', error);
        setWorkspaces([]);
      } finally {
        setLoadingWorkspaces(false);
      }
    };

    fetchWorkspaces();
  }, [user]);

  // ✅ Fetch projects when workspace changes
  useEffect(() => {
    if (!selectedWorkspaceId || selectedWorkspaceId === 'all') {
      setProjects([]);
      return;
    }

    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const data = await fetchData<ProjectResponse>(`/project?workspace=${selectedWorkspaceId}`);
        
        console.log('Fetched projects response:', data);
        
        const projectList = data?.projects || [];
        setProjects(projectList);
        
        // ✅ Auto-select first project with name
        if (projectList.length > 0 && !selectedProjectId) {
          setSelectedProject(projectList[0]._id, projectList[0].title);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [selectedWorkspaceId]); // ✅ Re-fetch when workspace changes

  // ✅ Handle workspace selection
  const handleWorkspaceChange = (workspaceId: string) => {
    if (workspaceId === 'all') {
      setSelectedWorkspace('all', 'All Workspaces');
    } else {
      const workspace = workspaces.find(w => w.workspaceId._id === workspaceId);
      if (workspace) {
        setSelectedWorkspace(workspaceId, workspace.workspaceId.name);
      }
    }
  };

  // ✅ Handle project selection
  const handleProjectChange = (projectId: string) => {
    if (projectId === 'all') {
      setSelectedProject('all', 'All Projects');
    } else {
      const project = projects.find(p => p._id === projectId);
      if (project) {
        setSelectedProject(projectId, project.title);
      }
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Workspace Selector */}
      <Select 
        value={selectedWorkspaceId || undefined} 
        onValueChange={handleWorkspaceChange}
        disabled={loadingWorkspaces}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select Workspace" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Workspaces</SelectItem>
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.workspaceId._id} value={workspace.workspaceId._id}>
              {workspace.workspaceId.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Project Selector */}
      <Select 
        value={selectedProjectId || undefined} 
        onValueChange={handleProjectChange}
        disabled={!selectedWorkspaceId || selectedWorkspaceId === 'all' || loadingProjects || projects.length === 0}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={
            loadingProjects ? "Loading..." : 
            projects.length === 0 ? "No projects" : 
            "Select Project"
          } />
        </SelectTrigger>
        <SelectContent>
          {projects.length > 0 && <SelectItem value="all">All Projects</SelectItem>}
          {projects.map((project) => (
            <SelectItem key={project._id} value={project._id}>
              {project.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
