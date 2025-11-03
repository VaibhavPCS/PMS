import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../provider/auth-context';
import { Navigate } from 'react-router';
import { fetchData, postData, deleteData } from '@/lib/fetch-util';
import { toast } from 'sonner';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import Breadcrumb from '../../components/layout/Breadcrumb';
import { ProjectTabs } from '../../components/project/ProjectTabs';
import { ProjectCard } from '../../components/project/ProjectCard';
import { WorkspaceSelector } from '../../components/workspace/WorkspaceSelector';
import { AddProjectModal } from '../../components/project/AddProjectModal';
import { CreateWorkspaceModal } from '../../components/layout/CreateWorkspaceModal';
import { ProjectCardSkeleton } from '../../components/project/project-card-skeleton';

type ProjectStatus = 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';

interface Project {
  _id: string;
  propertyId?: string;
  title: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  startDate: string;
  endDate: string;
  categories: {
    members: any[];
  }[];
  budget?: {
    allocated: number;
    spent: number;
  };
}

interface Workspace {
  _id: string;
  name: string;
  description?: string;
}

const WorkspacePage = () => {
  const { isAuthenticated, isLoading } = useAuth();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [sortOption, setSortOption] = useState('title-asc');
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);

const fetchWorkspaces = useCallback(async () => {
  try {
    const response = await fetchData('/workspace'); // ✅ Keep singular (already correct)
    const workspaceList = response.workspaces?.map((w: any) => w.workspaceId).filter(Boolean) || [];
    setWorkspaces(workspaceList);
    setCurrentWorkspace(response.currentWorkspace);
  } catch (error) {
    console.error('Failed to load workspaces', error);
  }
}, []);


  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetchData('/project');
      setProjects(response.projects);
    } catch (error) {
      console.error('Failed to load projects', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkspaces();
      fetchProjects();
      setLoading(false);
    }
  }, [isAuthenticated, fetchWorkspaces, fetchProjects]);

const switchWorkspace = async (workspaceId: string) => {
  try {
    await postData('/workspace/switch', { workspaceId }); // ✅ Change from '/workspaces/switch' to '/workspace/switch'
    fetchWorkspaces();
    fetchProjects();
  } catch (error) {
    console.error('Failed to switch workspace', error);
  }
};


  const handleCreateWorkspace = () => {
    setShowCreateWorkspaceModal(true);
  };

  const handleWorkspaceChange = (workspaceId: string) => {
    if (workspaceId === 'create-new-workspace') {
      handleCreateWorkspace();
      return;
    }
    switchWorkspace(workspaceId);
  };

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    setProjects(prevProjects =>
      prevProjects.map(p =>
        p._id === projectId ? { ...p, status: newStatus } : p
      )
    );
  };

  const handleDelete = async (projectId: string) => {
    try {
      await deleteData(`/project/${projectId}`);
      toast.success('Project deleted successfully');
      fetchProjects();
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const filteredProjects = projects
    .filter((project) => activeTab === 'All' || project.status === activeTab)
    .filter((project) =>
      project.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const [sortBy, order] = sortOption.split('-');

    // Handle date comparisons
    if (sortBy === 'startDate' || sortBy === 'endDate') {
      const dateA = new Date(a[sortBy]);
      const dateB = new Date(b[sortBy]);
      if (order === 'asc') {
        return dateA.getTime() - dateB.getTime();
      } else {
        return dateB.getTime() - dateA.getTime();
      }
    }

    // Handle string comparisons (for title)
    const aValue = a[sortBy as keyof Project];
    const bValue = b[sortBy as keyof Project];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      if (order === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    }
    return 0;
  });

  if (isLoading || loading) {
    return (
      <div className="p-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(274px,1fr))] gap-[15px]">
          {Array.from({ length: 6 }).map((_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" />;
  }

  return (
    <>
      {/* Main Content Container - matches Figma white card */}
      <div className="bg-white rounded-[8px] min-h-[940px] mx-[20px] mt-[30px] p-[10px]">
        {/* Breadcrumb */}
        <div className="mb-[25px]">
          <Breadcrumb />
        </div>

        {/* Header Section */}
        <div className="flex flex-col gap-[15px] mb-[25px]">
          {/* Title and Project Selector Row */}
          <div className="flex items-center justify-between">
            {/* Left: Title */}
            <div className="flex flex-col gap-[5px]">
              <h1 className="text-[24px] font-bold text-[#040110] font-['Inter']">
                {sortedProjects.length} Projects
              </h1>
              <p className="text-[14px] text-[#040110] opacity-60 font-normal font-['Work_Sans']">
                Ensure timely completion with organized task tracking.
              </p>
            </div>

            {/* Right: Workspace Selector */}
            <WorkspaceSelector
              workspaces={workspaces}
              currentWorkspace={currentWorkspace}
              onSwitchWorkspace={handleWorkspaceChange}
              onCreateWorkspaceClick={handleCreateWorkspace}
            />
          </div>

          {/* Tabs */}
          <ProjectTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Search and Action Buttons Row */}
          <div className="flex items-center gap-[10px] mt-[10px]">
            {/* Search Input */}
            <div className="flex-1 flex items-center gap-[10px] px-[10px] py-[10px] bg-[rgba(4,1,16,0.05)] rounded-[8px]">
              <Search size={15} className="text-[#717182]" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-[14px] text-[#040110] font-['Inter'] placeholder:text-[rgba(4,1,16,0.6)] p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {/* Sort by Select */}
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-[180px] bg-[rgba(4,1,16,0.05)] border-none font-['Inter'] text-[14px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="font-['Inter'] text-[14px]">
                <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                <SelectItem value="startDate-desc">Start Date (Newest)</SelectItem>
                <SelectItem value="startDate-asc">Start Date (Oldest)</SelectItem>
                <SelectItem value="endDate-desc">End Date (Newest)</SelectItem>
                <SelectItem value="endDate-asc">End Date (Oldest)</SelectItem>
              </SelectContent>
            </Select>

            {/* Add Project Button */}
            <Button
              onClick={() => setShowAddProjectModal(true)}
              className="bg-[#F2761B] hover:bg-[#F2761B]/90 text-white px-[15px] py-[10px] h-auto rounded-[8px] text-[14px] font-medium font-['Inter'] flex items-center gap-[10px]"
            >
              <Plus size={15} />
              Add Project
            </Button>

            {/* Calendar Filter */}
            {/* <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal bg-[rgba(4,1,16,0.05)] border-none",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover> */}
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(274px,1fr))] gap-[15px] mt-[25px]">
          {sortedProjects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {/* Empty State */}
        {sortedProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-[100px]">
            <p className="text-[16px] text-[#717182] font-['Inter']">No projects found</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddProjectModal
        open={showAddProjectModal}
        onClose={() => setShowAddProjectModal(false)}
        onProjectAdded={() => {
          fetchProjects();
          setShowAddProjectModal(false);
        }}
      />
      <CreateWorkspaceModal
        open={showCreateWorkspaceModal}
        onClose={() => setShowCreateWorkspaceModal(false)}
        onWorkspaceCreated={() => {
          fetchWorkspaces();
          setShowCreateWorkspaceModal(false);
        }}
      />
    </>
  );
};

export default WorkspacePage;
