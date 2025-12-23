// frontend/app/routes/analytics/analytics.tsx

import { useState, useEffect } from "react";
import { Navigate, Outlet, useNavigate, useLocation } from "react-router";
import { useAuth } from "../../provider/auth-context";
import { RoleProvider, useRole } from "@/features/analytics/context/RoleContext";
import { ManualRefreshButton } from "@/features/analytics/components/ManualRefreshButton";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { FilterProvider } from "@/features/analytics/context/FilterContext";

// Inner component that uses RoleProvider
function AnalyticsContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { selectedRole } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = selectedRole === 'admin' || selectedRole === 'super_admin';

  // Determine workspace role for restricted access
  const currentWorkspaceId = typeof user?.currentWorkspace === 'string'
    ? user.currentWorkspace
    : user?.currentWorkspace?._id;

  const workspaceRole = user?.workspaces?.find((w: any) =>
    w?.workspaceId?._id === currentWorkspaceId || w?.workspaceId === currentWorkspaceId
  )?.role || 'member';

  const isWorkspaceLead = workspaceRole === 'lead';
  const isWorkspaceOwner = workspaceRole === 'owner';
  const hasRestrictedAccess = isAdmin || isWorkspaceLead || isWorkspaceOwner;

  // Determine active tab based on current route
  const getActiveTab = () => {
    const path = location.pathname;
    if (!isAdmin && !hasRestrictedAccess) return "personal";
    if (path.includes("/analytics/workspace")) return "workspace";
    if (path.includes("/analytics/leaderboard")) return "leaderboard";
    if (path.includes("/analytics/restricted")) return "restricted";
    if (path.includes("/analytics/personal")) return "personal";
    return "performance";
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Update active tab when location changes
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  useEffect(() => {
    if (!isAdmin) {
      const path = location.pathname;
      if (!path.includes('/analytics/personal')) {
        navigate('/analytics/personal', { replace: true });
      }
    }
  }, [isAdmin, location.pathname, navigate]);

  // Handle tab navigation
  const handleTabChange = (tab: string) => {
    // Check if user has access to restricted tab
    if (tab === 'restricted' && !hasRestrictedAccess) {
      setActiveTab('personal');
      navigate('/analytics/personal', { replace: true });
      return;
    }

    if (!isAdmin && tab !== 'personal' && tab !== 'restricted') {
      setActiveTab('personal');
      navigate('/analytics/personal', { replace: true });
      return;
    }
    setActiveTab(tab);
    if (tab === "performance") {
      navigate("/analytics");
    } else if (tab === "workspace") {
      navigate("/analytics/workspace");
    } else if (tab === "leaderboard") {
      navigate("/analytics/leaderboard");
    } else if (tab === "restricted") {
      navigate("/analytics/restricted");
    } else if (tab === "personal") {
      navigate("/analytics/personal");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Authentication guard
  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  // Determine which tabs to show based on selected role
  const showPerformanceTab = isAdmin;
  const showWorkspaceTab = isAdmin;
  const showLeaderboardTab = isAdmin;
  const showRestrictedTab = hasRestrictedAccess; // Leads and admins can see restricted
  const showPersonalTab = true; // All roles can see personal

  return (
    <div className="min-h-screen bg-[#F9F9F9] p-[10px] md:p-6">
      <div className="max-w-full mx-auto space-y-4 md:space-y-6">
        {/* Page Header with Manual Refresh Button and Role Switcher */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-[20px] md:text-2xl font-bold text-gray-900 font-['Inter']">
              Analytics Dashboard
            </h1>
            <p className="text-[13px] md:text-sm text-gray-600 mt-1 font-['Inter']">
              Monitor performance, workspace metrics, and leaderboard standings
            </p>
          </div>

          <div className="flex items-center gap-4">
            <ManualRefreshButton userRole={user?.role} />
          </div>
        </div>

        {/* Navigation Tabs */}
        <Card className="border border-[#e9ecf1] rounded-[8px] bg-white">
          <div className="p-[10px] md:p-4">
            <div className="flex items-center gap-[10px] border-b-[0.5px] border-[#949291] overflow-x-auto scrollbar-visible">
              {/* Performance Tab */}
              {/* {showPerformanceTab && (
                <button
                  onClick={() => handleTabChange("performance")}
                  className={`px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap ${activeTab === "performance"
                    ? "border-b-[1px] border-[#f2761b] opacity-100"
                    : "opacity-60 hover:opacity-100"
                    }`}
                >
                  Performance
                </button>
              )} */}

              {/* Workspace Tab */}
              {/* {showWorkspaceTab && (
                <button
                  onClick={() => handleTabChange("workspace")}
                  className={`px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap ${activeTab === "workspace"
                    ? "border-b-[1px] border-[#f2761b] opacity-100"
                    : "opacity-60 hover:opacity-100"
                    }`}
                >
                  Workspace
                </button>
              )} */}

              {/* Leaderboard Tab */}
              {/* {showLeaderboardTab && (
                <button
                  onClick={() => handleTabChange("leaderboard")}
                  className={`px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap ${activeTab === "leaderboard"
                    ? "border-b-[1px] border-[#f2761b] opacity-100"
                    : "opacity-60 hover:opacity-100"
                    }`}
                >
                  Leaderboard
                </button>
              )} */}

              {/* Personal Tab */}
              {showPersonalTab && (
                <button
                  onClick={() => handleTabChange("personal")}
                  className={`px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap ${activeTab === "personal"
                    ? "border-b-[1px] border-[#f2761b] opacity-100"
                    : "opacity-60 hover:opacity-100"
                    }`}
                >
                  Personal
                </button>
              )}

              {/* Restricted Tab - Only for Leads & Admins */}
              {showRestrictedTab && (
                <button
                  onClick={() => handleTabChange("restricted")}
                  className={`px-[10px] py-[10px] rounded-tl-[10px] rounded-tr-[10px] text-[14px] font-['Inter'] font-normal text-[#000d2a] leading-normal transition-all whitespace-nowrap flex items-center gap-1 ${activeTab === "restricted"
                    ? "border-b-[1px] border-[#f2761b] opacity-100"
                    : "opacity-60 hover:opacity-100"
                    }`}
                >
                  Restricted
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Content Area - Renders child routes */}
        <div className="w-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

const Analytics = () => {
  return (
    <RoleProvider>
      <FilterProvider>
        <AnalyticsContent />
      </FilterProvider>
    </RoleProvider>
  );
};

export default Analytics;
