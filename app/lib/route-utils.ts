/**
 * Utility functions for handling both hash-based and pathname-based routing
 * This ensures compatibility across different deployment environments
 */

/**
 * Gets the current route path, checking hash first then falling back to pathname
 * This supports both hash-based routing (/#/route) and regular routing (/route)
 */
export const getCurrentPath = (): string => {
  const hash = window.location.hash;

  // If we have a hash route like /#/dashboard, use that
  if (hash && hash.startsWith('#/')) {
    return hash.slice(1); // Remove the '#' to get '/dashboard'
  }

  // Otherwise use the pathname
  return window.location.pathname;
};

/**
 * Checks if the current path matches any of the provided routes
 */
export const isPublicRoute = (publicRoutes: string[]): boolean => {
  const currentPath = getCurrentPath();
  return publicRoutes.includes(currentPath);
};
