import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import type { User } from '../types/index';
import { fetchData, postData } from '@/lib/fetch-util';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuthenticated: (value: boolean) => void;
  fetchUserInfo: () => Promise<void>;
  forceAuthCheck: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    // Duplicate declaration removed
    const [error, setError] = useState<Error | null>(null);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // Fetch user information from API
    const fetchUserInfo = async () => {
        try {
            const response = await fetchData('/auth/me');
            setUser(response.user);
            setIsAuthenticated(true);
            setError(null);
        } catch (err: any) {
            // If token is invalid or expired, clear auth state
            if (err.response?.status === 401 || err.response?.status === 403) {
                setUser(null);
                setIsAuthenticated(false);
                // No need to remove token - HTTP-only cookies are handled by server
            } else {
                setError(err);
            }
        }
    };

    // Check for existing authentication on app startup
    useEffect(() => {
        const checkAuthStatus = async () => {
            setIsInitialized(false);
            
            // Define public routes where we don't need to check auth
            const publicRoutes = ['/sign-in', '/sign-up', '/verify-otp', '/forgot-password', '/reset-password'];
            const currentPath = window.location.pathname;
            
            // Skip auth check on public routes
            if (publicRoutes.includes(currentPath)) {
                setIsLoading(false);
                setIsInitialized(true);
                return;
            }
            
            // Try to fetch user info - server will validate HTTP-only cookie
            try {
                await fetchUserInfo();
            } catch (err) {
                // If no valid cookie, user is not authenticated
                setIsAuthenticated(false);
                setUser(null);
            }
            setIsLoading(false);
            setIsInitialized(true);
        };

        checkAuthStatus();

        // Listen for storage changes (when token is added/removed)
        const handleStorageChange = () => {
            // Define public routes where we don't need to check auth
            const publicRoutes = ['/sign-in', '/sign-up', '/verify-otp', '/forgot-password', '/reset-password'];
            const currentPath = window.location.pathname;
            
            // Skip auth check on public routes
            if (!publicRoutes.includes(currentPath)) {
                checkAuthStatus();
            }
        };

        // Handle force logout from 401 responses
        const handleForceLogout = () => {
            // No need to remove token - HTTP-only cookies are handled by server
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            // Navigate to login page
            window.location.href = '/sign-in';
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('authStateChange', handleStorageChange);
        window.addEventListener('force-logout', handleForceLogout);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('authStateChange', handleStorageChange);
            window.removeEventListener('force-logout', handleForceLogout);
        };
    }, []);

    const setAuthenticated = (value: boolean) => {
        setIsAuthenticated(value);
        if (!value) {
            // No need to remove token - HTTP-only cookies are handled by server
            setUser(null);
        }
        // Dispatch custom event to trigger re-check
        window.dispatchEvent(new Event('authStateChange'));
    };

    const login = async (email: string, password: string) => {
        // This is handled by the sign-in form using mutations
        // Keeping this for backward compatibility
    }

    const logout = async () => {
        try {
            // Call backend logout endpoint to clear HTTP-only cookie
            await postData('/auth/logout', {});
        } catch (err) {
            // Even if logout fails, clear local state
            console.warn('Logout request failed:', err);
        }
        
        // Clear local storage (except token which is now in HTTP-only cookie)
        localStorage.removeItem('currentWorkspaceId');
        setUser(null);
        setIsAuthenticated(false);
        setError(null);
        window.dispatchEvent(new Event('authStateChange'));
    }

    // Force auth check regardless of route (used after login/logout)
    const forceAuthCheck = async () => {
        try {
            await fetchUserInfo();
        } catch (err) {
            setIsAuthenticated(false);
            setUser(null);
        }
    };

    const values={
        user,
        isAuthenticated,
        isLoading,
        isInitialized,
        error,
        login,
        logout,
        setAuthenticated,
        fetchUserInfo,
        forceAuthCheck
    }

    // Show loading state until context is properly initialized
    if (!isInitialized) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Initializing authentication...</p>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={values}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
