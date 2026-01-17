import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/provider/auth-context';

type UserRole = 'user' | 'admin' | 'super_admin';

interface RoleContextType {
  selectedRole: UserRole | null;
  setSelectedRole: (role: UserRole) => void;
  availableRoles: UserRole[];
  hasMultipleRoles: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedRole, setSelectedRoleState] = useState<UserRole | null>(null);

  // Determine available roles from user
  const availableRoles = useMemo<UserRole[]>(() => 
    user?.role ? [user.role] : [], 
  [user?.role]);
  
  const hasMultipleRoles = availableRoles.length > 1;

  // Initialize selected role from session storage or default to user's role
  useEffect(() => {
    if (!user?.role) return;

    const storedRole = sessionStorage.getItem('selectedAnalyticsRole') as UserRole;
    
    if (storedRole && availableRoles.includes(storedRole)) {
      setSelectedRoleState(storedRole);
    } else {
      setSelectedRoleState(user.role);
    }
  }, [user?.role, availableRoles]);

  // Persist role selection to session storage
  const setSelectedRole = useCallback((role: UserRole) => {
    setSelectedRoleState(role);
    sessionStorage.setItem('selectedAnalyticsRole', role);
  }, []);

  const value = useMemo(() => ({
    selectedRole,
    setSelectedRole,
    availableRoles,
    hasMultipleRoles,
  }), [selectedRole, setSelectedRole, availableRoles, hasMultipleRoles]);

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
