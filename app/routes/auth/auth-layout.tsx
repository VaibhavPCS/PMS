import React from 'react'
import { Navigate, Outlet } from 'react-router'

// @ts-ignore
import { useAuth } from '../../provider/auth-context';

const AuthLayout = () => {
  const { isAuthenticated, isLoading, isInitialized } = useAuth();

  // Wait for both loading to finish AND initialization to complete
  if (isLoading || !isInitialized) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Only redirect after initialization is complete
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div>
      <Outlet />
    </div>
  )
}

export default AuthLayout