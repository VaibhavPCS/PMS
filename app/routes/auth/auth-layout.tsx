import React, { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

// @ts-ignore
import { useAuth } from '../../provider/auth-context';

const AuthLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Handle hash routing for auth pages
  useEffect(() => {
    const currentPath = location.pathname;
    const desiredHash = `#${currentPath}`;
    
    // Update hash to maintain proper URL structure
    if (window.location.hash !== desiredHash) {
      window.history.replaceState(null, '', `${currentPath}${desiredHash}`);
    }
  }, [location.pathname]);

  // Show loading state with proper styling
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Redirect authenticated users to dashboard with hash
  if (isAuthenticated) {
    // Navigate to dashboard and update hash
    setTimeout(() => {
      window.history.replaceState(null, '', '/dashboard#/dashboard');
    }, 0);
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div>
      <Outlet />
    </div>
  )
}

export default AuthLayout