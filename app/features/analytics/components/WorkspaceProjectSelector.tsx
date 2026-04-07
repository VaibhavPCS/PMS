// frontend/app/features/analytics/components/WorkspaceProjectSelector.tsx

import { useEffect, useState } from 'react';
import { useFilter } from '../context/FilterContext';
import { useAuth } from '@/provider/auth-context';
import { fetchData, postData } from '@/lib/fetch-util';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, ChevronDown } from 'lucide-react';

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
  const userId = (user as any)?.id || (user as any)?._id;
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
  const [supportsAllProjects, setSupportsAllProjects] = useState<boolean>(() => {
    const stored = sessionStorage.getItem('supportsAllProjectsAnalytics');
    return stored ? stored === 'true' : true;
  });
  const [capabilityProbed, setCapabilityProbed] = useState<boolean>(() => {
    return sessionStorage.getItem('supportsAllProjectsAnalytics') !== null;
  });

  // Fetch workspaces on mount
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        setLoadingWorkspaces(true);
        const data = await fetchData<WorkspaceResponse>('/workspace');

        // console.log('Fetched workspace response:', data);

        const workspaceList = data?.workspaces || [];
        setWorkspaces(workspaceList);

        if (data?.currentWorkspace?._id && !selectedWorkspaceId) {
          setSelectedWorkspace(data.currentWorkspace._id, data.currentWorkspace.name);
          try { localStorage.setItem('currentWorkspaceId', data.currentWorkspace._id); } catch { }
        }
      } catch (error) {
        console.error('Failed to fetch workspaces:', error);
        setWorkspaces([]);
      } finally {
        setLoadingWorkspaces(false);
      }
    };

    fetchWorkspaces();
  }, [userId]);

  // Fetch projects when workspace changes
  useEffect(() => {
    if (!selectedWorkspaceId || selectedWorkspaceId === 'all') {
      setProjects([]);
      try { sessionStorage.setItem('analyticsProjectsCount', '0'); } catch { }
      return;
    }

    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const data = await fetchData<ProjectResponse>(`/project?workspace=${selectedWorkspaceId}`);

        // console.log('Fetched projects response:', data);

        const projectList = data?.projects || [];
        const filtered = projectList.filter(p => `${p.workspace}` === selectedWorkspaceId);
        setProjects(filtered);
        try { sessionStorage.setItem('analyticsProjectsCount', String(filtered.length)); } catch { }

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
  }, [selectedWorkspaceId]);

  useEffect(() => {
    const probe = async () => {
      if (!selectedWorkspaceId || capabilityProbed) return;
      try {
        await fetchData(`/analytics/project/all`);
        setSupportsAllProjects(true);
        sessionStorage.setItem('supportsAllProjectsAnalytics', 'true');
      } catch (err: any) {
        setSupportsAllProjects(false);
        sessionStorage.setItem('supportsAllProjectsAnalytics', 'false');
      } finally {
        setCapabilityProbed(true);
      }
    };
    probe();
  }, [selectedWorkspaceId, capabilityProbed]);

  // Handle workspace selection
  const handleWorkspaceChange = async (workspaceId: string) => {
    if (workspaceId === 'all') {
      setSelectedWorkspace('all', 'All Workspaces');
      try { localStorage.removeItem('currentWorkspaceId'); } catch { }
    } else {
      const workspace = workspaces.find(w => w.workspaceId._id === workspaceId);
      if (workspace) {
        try {
          await postData('/workspace/switch', { workspaceId });
        } catch { }
        setSelectedWorkspace(workspaceId, workspace.workspaceId.name);
        try { localStorage.setItem('currentWorkspaceId', workspaceId); } catch { }
        // Dispatch custom event for workspace change - COMMENTED OUT
        // window.dispatchEvent(new CustomEvent('workspaceChanged'));
        setProjects([]);
      }
    }
  };

  // Handle project selection
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
        value={selectedWorkspaceId || ''} // ✅ Fix: Use empty string instead of undefined
        onValueChange={handleWorkspaceChange}
        disabled={loadingWorkspaces}
      >
        <SelectTrigger className="h-auto rounded-[6px] bg-[#f5f4f9] text-[#777777] text-[12px] font-['Inter'] hover:bg-[#e5e4e9] px-[5px] py-[5px] flex items-center gap-[5px] border-none focus:ring-0 w-auto min-w-[120px]">
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-[150px]">
            <SelectValue placeholder="Select Workspace" />
          </span>
          <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
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
        value={selectedProjectId || ''} // ✅ Fix: Use empty string instead of undefined
        onValueChange={handleProjectChange}
        disabled={!selectedWorkspaceId || selectedWorkspaceId === 'all' || loadingProjects || projects.length === 0}
      >
        <SelectTrigger className="h-auto rounded-[6px] bg-[#f5f4f9] text-[#777777] text-[12px] font-['Inter'] hover:bg-[#e5e4e9] px-[5px] py-[5px] flex items-center gap-[5px] border-none focus:ring-0 w-auto min-w-[120px]">
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-[150px]">
            <SelectValue placeholder={
              loadingProjects ? "Loading..." :
                projects.length === 0 ? "--" :
                  supportsAllProjects ? "Select Project" : "Select the project"
            } />
          </span>
          <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
        </SelectTrigger>
        <SelectContent>
          {projects.length > 0 && supportsAllProjects && <SelectItem value="all">All Projects</SelectItem>}
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
