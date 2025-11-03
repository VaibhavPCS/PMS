import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../provider/auth-context';
import { BadgeProvider } from '../../provider/badge-context';
import VerticalSidebar from './vertical-sidebar';
import HorizontalNavbar from './horizontal-navbar';

const DashboardLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <BadgeProvider>
      <div className="h-screen flex bg-[#f1f2f7]">
        {/* Vertical Sidebar */}
        <VerticalSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Horizontal Navbar */}
          <HorizontalNavbar />

          {/* Page Content */}
          <main className="flex-1 overflow-hidden">
            <div className="h-full overflow-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </BadgeProvider>
  );
};

export default DashboardLayout;
