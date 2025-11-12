// frontend/app/routes/analytics/analytics.tsx

import { useState, useEffect } from "react";
import { Navigate, Outlet, useNavigate, useLocation } from "react-router";
import { useAuth } from "../../provider/auth-context";
import { RoleProvider, useRole } from "@/features/analytics/context/RoleContext";
import { RoleSwitcher } from "@/features/analytics/components/RoleSwitcher";
import { ManualRefreshButton } from "@/features/analytics/components/ManualRefreshButton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, Users, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterProvider } from "@/features/analytics/context/FilterContext";
import { WorkspaceProjectSelector } from "@/features/analytics/components/WorkspaceProjectSelector";

// Inner component that uses RoleProvider
function AnalyticsContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { selectedRole } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on current route
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes("/analytics/workspace")) return "workspace";
    if (path.includes("/analytics/leaderboard")) return "leaderboard";
    if (path.includes("/analytics/personal")) return "personal";
    return "performance";
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Update active tab when location changes
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);

  // Handle tab navigation
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "performance") {
      navigate("/analytics");
    } else if (tab === "workspace") {
      navigate("/analytics/workspace");
    } else if (tab === "leaderboard") {
      navigate("/analytics/leaderboard");
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
  const showPerformanceTab = selectedRole === 'admin' || selectedRole === 'super_admin';
  const showWorkspaceTab = selectedRole === 'admin' || selectedRole === 'super_admin';
  const showLeaderboardTab = selectedRole === 'admin' || selectedRole === 'super_admin';
  const showPersonalTab = true; // All roles can see personal

  return (
    <div className="min-h-screen bg-[#f1f2f7] p-6">
      <div className="max-w-full mx-auto space-y-6">
        {/* Page Header with Manual Refresh Button and Role Switcher */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Analytics Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Monitor performance, workspace metrics, and leaderboard standings
            </p>
          </div>

          <div className="flex items-center gap-4">
            <ManualRefreshButton userRole={user?.role} />
          </div>
        </div>

        {/* Navigation Tabs */}
        <Card className="border border-[#e9ecf1]">
          <div className="p-4">
            <div className="flex items-center gap-2 border-b border-gray-200">
              {/* Performance Tab */}
              {showPerformanceTab && (
                <Button
                  variant="ghost"
                  onClick={() => handleTabChange("performance")}
                  className={cn(
                    "px-4 py-2 rounded-t-lg text-sm font-medium transition-all",
                    activeTab === "performance"
                      ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Performance
                </Button>
              )}

              {/* Workspace Tab */}
              {showWorkspaceTab && (
                <Button
                  variant="ghost"
                  onClick={() => handleTabChange("workspace")}
                  className={cn(
                    "px-4 py-2 rounded-t-lg text-sm font-medium transition-all",
                    activeTab === "workspace"
                      ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Workspace
                </Button>
              )}

              {/* Leaderboard Tab */}
              {showLeaderboardTab && (
                <Button
                  variant="ghost"
                  onClick={() => handleTabChange("leaderboard")}
                  className={cn(
                    "px-4 py-2 rounded-t-lg text-sm font-medium transition-all",
                    activeTab === "leaderboard"
                      ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Leaderboard
                </Button>
              )}

              {/* Personal Tab */}
              {showPersonalTab && (
                <Button
                  variant="ghost"
                  onClick={() => handleTabChange("personal")}
                  className={cn(
                    "px-4 py-2 rounded-t-lg text-sm font-medium transition-all",
                    activeTab === "personal"
                      ? "border-b-2 border-blue-500 text-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <User className="w-4 h-4 mr-2" />
                  Personal
                </Button>
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
