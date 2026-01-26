import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthState, User, UserRole } from '@/types';
import { toast } from "@/components/ui/sonner";

// Sample user data for demonstration
const SAMPLE_USERS = [
  {
    id: '1',
    email: 'admin@vitacare.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin' as UserRole,
    avatar: '',
  },
  {
    id: '2',
    email: 'doctor@vitacare.com',
    password: 'doctor123',
    name: 'Dr. Anshumaan Saraf',
    role: 'doctor' as UserRole,
    avatar: '',
  },
  {
    id: '3',
    email: 'staff@vitacare.com',
    password: 'staff123',
    name: 'Prinkesh Jha',
    role: 'staff' as UserRole,
    avatar: '',
  },
  {
    id: '4',
    email: 'lab@vitacare.com',
    password: 'lab123',
    name: 'Karthik ',
    role: 'lab' as UserRole,
    avatar: '',
  },
  {
    id: '5',
    email: 'pharmacist@vitacare.com',
    password: 'pharma123',
    name: 'Gautham Bhaskare',
    role: 'pharmacist' as UserRole,
    avatar: '',
  },
];

interface AuthContextProps {
  authState: AuthState;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  resetPassword: (email: string) => Promise<boolean>;
}

const defaultAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
};

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const storedUser = localStorage.getItem('vitacare_user');

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as User;
        setAuthState({
          isAuthenticated: true,
          user,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('vitacare_user');
        setAuthState({
          ...defaultAuthState,
          loading: false,
        });
      }
    } else {
      setAuthState({
        ...defaultAuthState,
        loading: false,
      });
    }
  }, []);

  const login = async (email: string, password: string, role: UserRole): Promise<boolean> => {
    // Reset any previous errors
    setAuthState(prev => ({ ...prev, error: null, loading: true }));

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Find user with matching email and password from sample data
      const user = SAMPLE_USERS.find(u =>
        u.email === email &&
        u.password === password &&
        u.role === role
      );

      if (user) {
        // Remove password for security
        const { password, ...secureUser } = user;

        // Save user to localStorage
        localStorage.setItem('vitacare_user', JSON.stringify(secureUser));

        // Update auth state
        setAuthState({
          isAuthenticated: true,
          user: secureUser,
          loading: false,
          error: null,
        });

        // Show success toast
        toast.success("Login successful", {
          description: `Welcome back, ${secureUser.name}!`,
          duration: 3000, // Auto-dismiss after 3 seconds
        });

        // Redirect based on role
        const dashboardPath = `/${role}-dashboard`;
        navigate(dashboardPath);

        return true;
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: 'Invalid email, password, or role combination.',
        }));

        toast.error("Login failed", {
          description: "Invalid email, password, or role. Please try again.",
        });

        return false;
      }
    } catch (error) {
      console.error('Login error:', error);

      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: 'An unexpected error occurred. Please try again.',
      }));

      toast.error("Login error", {
        description: "An unexpected error occurred. Please try again.",
      });

      return false;
    }
  };

  const logout = () => {
    // Clear user from localStorage
    localStorage.removeItem('vitacare_user');

    // Reset auth state
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
    });

    // Show logout toast
    toast.success("Logged out", {
      description: "You have been successfully logged out.",
    });

    // Redirect to login page
    navigate('/login');
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, loading: true }));

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if email exists in our sample data
      const userExists = SAMPLE_USERS.some(user => user.email === email);

      if (userExists) {
        toast.success("Password reset email sent", {
          description: "Please check your email for instructions to reset your password.",
        });
        setAuthState(prev => ({ ...prev, loading: false }));
        return true;
      } else {
        toast.error("Email not found", {
          description: "We couldn't find an account with that email address.",
        });
        setAuthState(prev => ({ ...prev, loading: false, error: 'Email not found.' }));
        return false;
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error("Password reset failed", {
        description: "An unexpected error occurred. Please try again.",
      });
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to process password reset request.'
      }));
      return false;
    }
  };

  const contextValue: AuthContextProps = {
    authState,
    login,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const withAuth = (Component: React.ComponentType, allowedRoles?: UserRole[]) => {
  return (props: any) => {
    const { authState } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
      if (!authState.loading) {
        // If not authenticated, redirect to login
        if (!authState.isAuthenticated) {
          navigate('/login');
          return;
        }

        // If roles are specified and user's role is not allowed, redirect to appropriate dashboard
        if (allowedRoles && authState.user && !allowedRoles.includes(authState.user.role)) {
          toast.error("Access denied", {
            description: "You don't have permission to access this page.",
          });
          navigate(`/${authState.user.role}-dashboard`);
        }
      }
    }, [authState.loading, authState.isAuthenticated, authState.user, navigate]);

    // Show loading state if auth is still loading
    if (authState.loading) {
      return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    // If not authenticated, don't render the component
    if (!authState.isAuthenticated) {
      return null;
    }

    // If roles are specified and user's role is not allowed, don't render
    if (allowedRoles && authState.user && !allowedRoles.includes(authState.user.role)) {
      return null;
    }

    // Otherwise, render the component
    return <Component {...props} />;
  };
};
