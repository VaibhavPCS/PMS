import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import type { User } from '../types/index';
import { fetchData, postData } from '@/lib/fetch-util';
import { toast } from 'sonner';
import { getCurrentPath, isPublicRoute } from '@/lib/route-utils';

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
    const navigate = useNavigate();
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
            setIsLoading(true);
            setIsInitialized(false);

            // Define public routes where we don't need to check auth
            const publicRoutes = ['/', '/sign-in', '/sign-up', '/verify-otp', '/forgot-password', '/reset-password'];

            // Use hash-aware path detection
            if (isPublicRoute(publicRoutes)) {
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
            } finally {
                // Ensure loading and initialization states are always updated
                setIsLoading(false);
                setIsInitialized(true);
            }
        };

        checkAuthStatus();

        // Listen for storage changes (when token is added/removed)
        const handleStorageChange = () => {
            // Define public routes where we don't need to check auth
            const publicRoutes = ['/', '/sign-in', '/sign-up', '/verify-otp', '/forgot-password', '/reset-password'];

            // Skip auth check on public routes using hash-aware detection
            if (!isPublicRoute(publicRoutes)) {
                checkAuthStatus();
            }
        };

        // Handle force logout from 401 responses
        const handleForceLogout = () => {
            // No need to remove token - HTTP-only cookies are handled by server
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            toast.error('Your session has expired. Redirecting to home.');

            // Avoid redirecting away from public routes (like '/')
            const publicRoutes = ['/', '/sign-in', '/sign-up', '/verify-otp', '/forgot-password', '/reset-password'];

            // Navigate to login page client-side to avoid server 404 on deep links
            if (!isPublicRoute(publicRoutes)) {
                navigate('/', { replace: true });
            }
        };

        // Show feedback on network-level errors
        const handleNetworkError = (e: any) => {
            const message = e?.detail?.message ?? 'A network error occurred';
            toast.error(`Network error: ${message}`);
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('authStateChange', handleStorageChange);
        window.addEventListener('force-logout', handleForceLogout);
        window.addEventListener('network-error', handleNetworkError as EventListener);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('authStateChange', handleStorageChange);
            window.removeEventListener('force-logout', handleForceLogout);
            window.removeEventListener('network-error', handleNetworkError as EventListener);
        };
    }, [navigate]);

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
        // Navigate to login after logout
        navigate('/sign-in', { replace: true });
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
