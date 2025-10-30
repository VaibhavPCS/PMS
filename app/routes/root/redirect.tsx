import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';

/**
 * Root redirect component that handles the redirection from / to /sign-in#/sign-in
 * This ensures proper URL structure with hash routing for static deployments
 */
const RootRedirect: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to sign-in with hash routing
    // This maintains compatibility with static deployments and ensures proper URL structure
    const targetPath = '/sign-in';
    const targetHash = '#/sign-in';
    
    // Navigate to the sign-in route
    navigate(targetPath, { replace: true });
    
    // Update the hash to maintain the desired URL structure
    setTimeout(() => {
      window.history.replaceState(null, '', `${targetPath}${targetHash}`);
    }, 0);
  }, [navigate]);

  // Show a loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-orange-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to sign in...</p>
      </div>
    </div>
  );
};

export default RootRedirect;