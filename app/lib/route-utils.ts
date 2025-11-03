/**
 * Utility functions for handling routing
 */

/**
 * Gets the current route path from pathname
 */
export const getCurrentPath = (): string => {
  return window.location.pathname;
};

/**
 * Checks if the current path matches any of the provided routes
 */
export const isPublicRoute = (publicRoutes: string[]): boolean => {
  const currentPath = getCurrentPath();
  return publicRoutes.includes(currentPath);
};
