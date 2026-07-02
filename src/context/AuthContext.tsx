import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { User as AppUser, PinAuthCredentials, PinSetupData, UserCreationData } from '../types';
import * as Crypto from 'expo-crypto';
import { View } from 'react-native';

// Define AuthContextType locally to match the implementation
interface AuthContextType {
  appUser: AppUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  signIn: (credentials: PinAuthCredentials) => Promise<{ error: any }>;
  createUser: (userData: UserCreationData) => Promise<{ data?: any; error: any }>;
  setupPin: (setupData: PinSetupData) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  hasPermission: (requiredRole: string) => boolean;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  findUserByCode: (userCode: string) => Promise<{ data: any; error: any }>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Cache keys
const CACHE_KEYS = {
  USER_DATA: '@bismillahi_user_data',
  SESSION_DATA: '@bismillahi_session_data',
} as const;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true); // Start true to show LoadingScreen during initialization
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // PIN hashing utility
  const hashPin = useCallback(async (pin: string, userCode?: string): Promise<string> => {
    const salt = userCode ? `${userCode}_fuelr_salt_2024` : 'bismillahi_salt_2024';
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pin + salt
    );
  }, []);

  // Cache user data for offline access
  const cacheUserData = useCallback(async (userData: AppUser | null) => {
    try {
      if (userData) {
        await AsyncStorage.setItem(CACHE_KEYS.USER_DATA, JSON.stringify(userData));
      } else {
        await AsyncStorage.removeItem(CACHE_KEYS.USER_DATA);
      }
    } catch (error) {
      console.warn('Failed to cache user data:', error);
    }
  }, []);

  // Load cached user data
  const loadCachedUserData = useCallback(async (): Promise<AppUser | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.USER_DATA);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Failed to load cached user data:', error);
      return null;
    }
  }, []);

  // Fetch app user data from database
  const fetchAppUser = useCallback(async (userId: string, useCache = true) => {
    try {
      setError(null);
      
      // Try cache first if requested
      if (useCache) {
        const cachedUser = await loadCachedUserData();
        if (cachedUser && cachedUser.id === userId) {
          setAppUser(cachedUser);
        }
      }

      // Fetch fresh data from database
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If user doesn't exist in database, create one
        if (error.code === 'PGRST116') {
          console.log('User not found in database, this might be expected for new signups');
          setAppUser(null);
          return;
        }
        throw error;
      }

      setAppUser(data);
      await cacheUserData(data);
    } catch (error) {
      console.error('Error fetching app user:', error);
      setError('Failed to load user data');
      
      // Try to use cached data as fallback
      const cachedUser = await loadCachedUserData();
      if (cachedUser && cachedUser.id === userId) {
        setAppUser(cachedUser);
        setError('Using offline data - some features may be limited');
      }
    } finally {
      setLoading(false);
    }
  }, [loadCachedUserData, cacheUserData]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (appUser?.id) {
      await fetchAppUser(appUser.id, false);
    }
  }, [appUser?.id, fetchAppUser]);

   // Initialize auth state - SINGLE useEffect (duplicate removed)
   useEffect(() => {
     let isMounted = true;

     const initializeAuth = async () => {
       try {
         const cachedUser = await loadCachedUserData();
         if (!isMounted) return;
         if (cachedUser) {
           setAppUser(cachedUser);
           setIsAuthenticated(true);
         }
       } catch (error) {
         console.error('Error initializing auth:', error);
         setError('Failed to initialize authentication');
       } finally {
         if (isMounted) {
           setLoading(false);
         }
       }
     };

     initializeAuth();

     return () => {
       isMounted = false;
     };
   }, [loadCachedUserData, setError]);

  // PIN-based sign in function
  const signIn = useCallback(async (credentials: PinAuthCredentials) => {
    setError(null);
    setLoading(true);

    try {
      const { user_code, pin } = credentials;

      // Query the user from the database
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_code', user_code.toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Invalid user code');
        }
        throw error;
      }

      if (!data) {
        throw new Error('Invalid user code');
      }

      // Verify PIN (support migration from old hardcoded salt)
      const newPinHash = await hashPin(pin, data.user_code);
      const oldPinHash = await hashPin(pin);
      let pinValid = data.pin_hash === newPinHash;
      
      if (!pinValid && data.pin_hash === oldPinHash) {
        pinValid = true;
        const { error: updateError } = await supabase
          .from('users')
          .update({ pin_hash: newPinHash })
          .eq('id', data.id);
        if (updateError) {
          console.error('Failed to migrate PIN hash:', updateError);
        }
      }

      if (!pinValid) {
        throw new Error('Invalid PIN');
      }

      // Set user data
      setAppUser(data);
      setIsAuthenticated(true);
      await cacheUserData(data);

      console.log(`✅ Login successful: ${data.full_name} (${data.role})`);
      return { error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message || 'Failed to sign in');
      return { error };
    } finally {
      setLoading(false);
    }
  }, [hashPin, cacheUserData]);

  // Create user function (admin only)
  const createUser = useCallback(async (userData: UserCreationData) => {
    setError(null);
    setLoading(true);

    try {
      // Generate unique user code if not provided
      let user_code = userData.user_code;
      if (!user_code) {
        const { data: lastUser } = await supabase
          .from('users')
          .select('user_code')
          .order('created_at', { ascending: false })
          .limit(1);
        
        const lastCode = lastUser?.[0]?.user_code || 'A000';
        const nextNumber = parseInt(lastCode.substring(1)) + 1;
        user_code = `A${nextNumber.toString().padStart(3, '0')}`;
      }

      // Insert user record
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            user_code: user_code.toUpperCase(),
            full_name: userData.full_name,
            role: userData.role,
            station_id: userData.station_id,
            is_active: userData.is_active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error: any) {
      console.error('Create user error:', error);
      setError(error.message || 'Failed to create user');
      return { error };
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup PIN function (for new users)
  const setupPin = useCallback(async (setupData: PinSetupData) => {
    setError(null);
    setLoading(true);

    try {
      const { user_code, pin, confirm_pin } = setupData;

      if (pin !== confirm_pin) {
        throw new Error('PINs do not match');
      }

      if (pin.length < 4) {
        throw new Error('PIN must be at least 4 digits');
      }

      const pinHash = await hashPin(pin, user_code);

      // Update user with PIN
      const { error } = await supabase
        .from('users')
        .update({ 
          pin_hash: pinHash,
          updated_at: new Date().toISOString()
        })
        .eq('user_code', user_code.toUpperCase());

      if (error) throw error;

      return { error: null };
    } catch (error: any) {
      console.error('Setup PIN error:', error);
      setError(error.message || 'Failed to setup PIN');
      return { error };
    } finally {
      setLoading(false);
    }
  }, [hashPin]);

  // Sign out function
  const signOut = useCallback(async () => {
    setError(null);
    
    try {
      // Clear local state
      setAppUser(null);
      setIsAuthenticated(false);
      await cacheUserData(null);
      
      return { error: null };
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(error.message || 'Failed to sign out');
      return { error };
    }
  }, [cacheUserData]);

  // Permission check function
  const findUserByCode = useCallback(async (userCode: string): Promise<{ data: any; error: any }> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role, pin_hash')
        .eq('user_code', userCode.toUpperCase())
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }, []);

  const hasPermission = useCallback((requiredRole: string) => {
    if (!appUser) return false;
    
    const roleHierarchy = {
      'viewer': 0,
      'cashier': 1,
      'manager': 2,
      'admin': 3,
    } as const;

    const userLevel = roleHierarchy[appUser.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

    return userLevel >= requiredLevel;
  }, [appUser]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    appUser,
    isAuthenticated,
    loading,
    error,
    signIn,
    createUser,
    setupPin,
    signOut,
    hasPermission,
    clearError,
    refreshUser,
    findUserByCode,
  }), [
    appUser,
    isAuthenticated,
    loading,
    error,
    signIn,
    createUser,
    setupPin,
    signOut,
    hasPermission,
    clearError,
    refreshUser,
    findUserByCode,
  ]);

  return (
    <AuthContext.Provider value={value}>
      <View testID="auth-provider">
        {children}
      </View>
    </AuthContext.Provider>
  );
};
