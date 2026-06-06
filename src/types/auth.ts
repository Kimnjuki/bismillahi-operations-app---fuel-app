import { User, UserRole } from './index';

// Auth context types
export interface AuthContextType {
  user: any | null;
  appUser: User | null;
  session: any | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  hasPermission: (requiredRole: string) => boolean;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

// Auth state types
export interface AuthState {
  user: any | null;
  appUser: User | null;
  session: any | null;
  loading: boolean;
  error: string | null;
}

// Login/Signup types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

export interface AuthResponse {
  user: any | null;
  session: any | null;
  error: any | null;
}

// Permission types
export interface Permission {
  resource: string;
  action: string;
  condition?: (user: User) => boolean;
}

export interface RolePermissions {
  [key: string]: Permission[];
}

// Cache types
export interface AuthCache {
  userData: User | null;
  sessionData: any | null;
  lastUpdated: number;
}

// Auth events
export interface AuthEvent {
  type: 'LOGIN' | 'LOGOUT' | 'SIGNUP' | 'ERROR' | 'REFRESH';
  payload?: any;
  timestamp: number;
}

// Auth configuration
export interface AuthConfig {
  autoRefresh: boolean;
  persistSession: boolean;
  detectSessionInUrl: boolean;
  storageKey: string;
  refreshThreshold: number; // in seconds
}

// Default auth configuration
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  autoRefresh: true,
  persistSession: true,
  detectSessionInUrl: false,
  storageKey: '@bismillahi_auth',
  refreshThreshold: 300, // 5 minutes
};

// Role hierarchy for permission checking
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 0,
  cashier: 1,
  manager: 2,
  admin: 3,
};

// Permission checking utilities
export const hasRole = (user: User | null, requiredRole: UserRole): boolean => {
  if (!user) return false;
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole];
};

export const hasAnyRole = (user: User | null, roles: UserRole[]): boolean => {
  if (!user) return false;
  return roles.some(role => hasRole(user, role));
};

export const hasAllRoles = (user: User | null, roles: UserRole[]): boolean => {
  if (!user) return false;
  return roles.every(role => hasRole(user, role));
};

// Auth validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateFullName = (fullName: string): boolean => {
  return fullName.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(fullName);
};

