import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import type { User } from '../types/index';
import { fetchData } from '@/lib/fetch-util';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuthenticated: (value: boolean) => void;
  fetchUserInfo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

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
                localStorage.removeItem('token');
            }
            setError(err);
        }
    };

    // Check for existing token on app startup AND when localStorage changes
    useEffect(() => {
        const checkAuthStatus = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                // Fetch user data to validate token
                await fetchUserInfo();
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
            setIsLoading(false);
        };

        checkAuthStatus();

        // Listen for storage changes (when token is added/removed)
        const handleStorageChange = () => {
            checkAuthStatus();
        };

        // Handle force logout from 401 responses
        const handleForceLogout = () => {
            localStorage.removeItem('token');
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
            localStorage.removeItem('token');
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
        localStorage.removeItem('token');
        localStorage.removeItem('currentWorkspaceId');
        setUser(null);
        setIsAuthenticated(false);
        setError(null);
        window.dispatchEvent(new Event('authStateChange'));
    }

    const values={
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        setAuthenticated,
        fetchUserInfo
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
