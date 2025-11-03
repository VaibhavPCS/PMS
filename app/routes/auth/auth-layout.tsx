import React from 'react'
import { Navigate, Outlet } from 'react-router'

// @ts-ignore
import { useAuth } from '../../provider/auth-context';

const AuthLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();

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

  // Redirect authenticated users to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div>
      <Outlet />
    </div>
  )
}

export default AuthLayout