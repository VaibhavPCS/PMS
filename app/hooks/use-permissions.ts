import { useMemo, useEffect, useState } from 'react';
import { fetchData } from '@/lib/fetch-util';

interface PermissionConfig {
  canCreateWorkspace: boolean;
  canInviteMembers: boolean;
  canManageSettings: boolean;
  canCreateProject: boolean;
  canCreateTask: boolean;
  canViewAllProjects: boolean;
  userRole: string;
  workspaceRole: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  effectiveRole: string;
}

export const usePermissions = (): PermissionConfig => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ✅ FETCH REAL USER DATA FROM /auth/me API
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // HTTP-only cookies are sent automatically with fetchData
        const response = await fetchData('/auth/me');
        setUserData(response.user);
      } catch (error) {
        console.error('Failed to fetch user data for permissions:', error);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  return useMemo(() => {
    if (loading || !userData) {
      return {
        canCreateWorkspace: false,
        canInviteMembers: false,
        canManageSettings: false,
        canCreateProject: false,
        canCreateTask: false,
        canViewAllProjects: false,
        userRole: 'user',
        workspaceRole: 'member',
        isAdmin: false,
        isSuperAdmin: false,
        effectiveRole: 'member'
      };
    }

    // ✅ GET REAL USER ROLE FROM API RESPONSE
    const userRole = userData.role || 'user';
    const currentWorkspaceId = userData.currentWorkspace;
    const workspaceRole = userData.workspaces?.find((w: any) => 
      w.workspaceId._id === currentWorkspaceId
    )?.role || 'member';

    const isAdmin = ['admin', 'super_admin'].includes(userRole);
    const isSuperAdmin = userRole === 'super_admin';
    const isWorkspaceOwner = workspaceRole === 'owner';
    
    let effectiveRole = 'member';
    if (isSuperAdmin) effectiveRole = 'super_admin';
    else if (userRole === 'admin') effectiveRole = 'admin';
    else if (workspaceRole === 'lead') effectiveRole = 'lead';
    else if (isWorkspaceOwner) effectiveRole = 'owner';

    return {
      // ✅ KEY PERMISSIONS - ONLY ADMIN/SUPER_ADMIN FOR INVITE & CREATE PROJECT
      canCreateWorkspace: isSuperAdmin || userRole === 'admin',
      canInviteMembers: isSuperAdmin || userRole === 'admin', // ✅ ONLY ADMIN+
      canManageSettings: isSuperAdmin || userRole === 'admin' || isWorkspaceOwner,
      canCreateProject: isSuperAdmin || userRole === 'admin', // ✅ ONLY ADMIN+
      canCreateTask: isSuperAdmin || userRole === 'admin' || isWorkspaceOwner || workspaceRole === 'lead',
      canViewAllProjects: isSuperAdmin || userRole === 'admin' || isWorkspaceOwner,
      userRole,
      workspaceRole,
      isAdmin,
      isSuperAdmin,
      effectiveRole
    };
  }, [userData, loading]);
};
