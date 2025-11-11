import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface FilterContextType {
  selectedWorkspaceId: string | null;
  selectedProjectId: string | null;
  selectedWorkspaceName: string | null; // ✅ Add name
  selectedProjectName: string | null; // ✅ Add name
  setSelectedWorkspace: (id: string | null, name: string | null) => void; // ✅ Updated
  setSelectedProject: (id: string | null, name: string | null) => void; // ✅ Updated
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedWorkspaceId, setSelectedWorkspaceIdState] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
  const [selectedWorkspaceName, setSelectedWorkspaceNameState] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectNameState] = useState<string | null>(null);

  // Persist selections to sessionStorage
  useEffect(() => {
    const storedWorkspaceId = sessionStorage.getItem('selectedAnalyticsWorkspace');
    const storedWorkspaceName = sessionStorage.getItem('selectedAnalyticsWorkspaceName');
    const storedProjectId = sessionStorage.getItem('selectedAnalyticsProject');
    const storedProjectName = sessionStorage.getItem('selectedAnalyticsProjectName');
    
    if (storedWorkspaceId) setSelectedWorkspaceIdState(storedWorkspaceId);
    if (storedWorkspaceName) setSelectedWorkspaceNameState(storedWorkspaceName);
    if (storedProjectId) setSelectedProjectIdState(storedProjectId);
    if (storedProjectName) setSelectedProjectNameState(storedProjectName);
  }, []);

  const setSelectedWorkspace = (id: string | null, name: string | null) => {
    setSelectedWorkspaceIdState(id);
    setSelectedWorkspaceNameState(name);
    
    if (id) {
      sessionStorage.setItem('selectedAnalyticsWorkspace', id);
      if (name) sessionStorage.setItem('selectedAnalyticsWorkspaceName', name);
    } else {
      sessionStorage.removeItem('selectedAnalyticsWorkspace');
      sessionStorage.removeItem('selectedAnalyticsWorkspaceName');
    }
    
    // ✅ Clear project when workspace changes
    setSelectedProject(null, null);
  };

  const setSelectedProject = (id: string | null, name: string | null) => {
    setSelectedProjectIdState(id);
    setSelectedProjectNameState(name);
    
    if (id) {
      sessionStorage.setItem('selectedAnalyticsProject', id);
      if (name) sessionStorage.setItem('selectedAnalyticsProjectName', name);
    } else {
      sessionStorage.removeItem('selectedAnalyticsProject');
      sessionStorage.removeItem('selectedAnalyticsProjectName');
    }
  };

  return (
    <FilterContext.Provider
      value={{
        selectedWorkspaceId,
        selectedProjectId,
        selectedWorkspaceName,
        selectedProjectName,
        setSelectedWorkspace,
        setSelectedProject,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}
