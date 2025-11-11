import { createContext, useContext, useState, useEffect } from 'react';
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
  const availableRoles: UserRole[] = user?.role ? [user.role] : [];
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
  }, [user?.role]);

  // Persist role selection to session storage
  const setSelectedRole = (role: UserRole) => {
    setSelectedRoleState(role);
    sessionStorage.setItem('selectedAnalyticsRole', role);
  };

  return (
    <RoleContext.Provider
      value={{
        selectedRole,
        setSelectedRole,
        availableRoles,
        hasMultipleRoles,
      }}
    >
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
