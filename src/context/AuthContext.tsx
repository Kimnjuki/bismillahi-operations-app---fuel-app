import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { User as AppUser, PinAuthCredentials, PinSetupData, UserCreationData } from '../types';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  PIN_ATTEMPTS: '@bismillahi_pin_attempts',
} as const;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const MAX_PIN_ATTEMPTS = 5;
  const LOCKOUT_MINUTES = 15;
  const pinAttemptsRef = React.useRef<Map<string, { attempts: number; lockedUntil: number }>>(new Map());

  // FIX #5: Load PIN attempts from AsyncStorage on init
  useEffect(() => {
    loadPinAttempts();
  }, []);

  const loadPinAttempts = async () => {
    try {
      const stored = await AsyncStorage.getItem(CACHE_KEYS.PIN_ATTEMPTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        pinAttemptsRef.current = new Map(Object.entries(parsed));
      }
    } catch (err) {
      console.warn('Failed to load PIN attempts:', err);
    }
  };

  const persistPinAttempts = async () => {
    try {
      const obj = Object.fromEntries(pinAttemptsRef.current);
      await AsyncStorage.setItem(CACHE_KEYS.PIN_ATTEMPTS, JSON.stringify(obj));
    } catch (err) {
      console.warn('Failed to persist PIN attempts:', err);
    }
  };

  const isPinLocked = useCallback((userCode: string): boolean => {
    const record = pinAttemptsRef.current.get(userCode.toUpperCase());
    if (!record) return false;
    const now = Date.now();
    if (record.lockedUntil && now < record.lockedUntil) {
      const remaining = Math.ceil((record.lockedUntil - now) / 60000);
      setError(`Account locked due to too many failed attempts. Try again in ${remaining} minutes.`);
      return true;
    }
    if (record.lockedUntil && now >= record.lockedUntil) {
      pinAttemptsRef.current.delete(userCode.toUpperCase());
      persistPinAttempts();
      return false;
    }
    return false;
  }, []);

  const recordPinFailure = useCallback((userCode: string) => {
    const key = userCode.toUpperCase();
    const record = pinAttemptsRef.current.get(key) || { attempts: 0, lockedUntil: 0 };
    record.attempts += 1;
    if (record.attempts >= MAX_PIN_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
    }
    pinAttemptsRef.current.set(key, record);
    persistPinAttempts();
  }, []);

  const clearPinFailures = useCallback((userCode: string) => {
    pinAttemptsRef.current.delete(userCode.toUpperCase());
    persistPinAttempts();
  }, []);

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
        const { pin_hash: _pin, ...safeUser } = userData as any;
        await AsyncStorage.setItem(CACHE_KEYS.USER_DATA, JSON.stringify(safeUser));
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

  // FIX #1: Properly memoized fetchAppUser with correct dependency array
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
  }, [loadCachedUserData]);

  // PIN-based sign in function
  const signIn = useCallback(async (credentials: PinAuthCredentials) => {
    setError(null);
    setLoading(true);

    try {
      const { user_code, pin } = credentials;
      const upperCode = user_code.toUpperCase();

      if (isPinLocked(user_code)) {
        return { error: new Error('Account temporarily locked') };
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_code', upperCode)
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
        recordPinFailure(user_code);
        const attempts = pinAttemptsRef.current.get(upperCode)?.attempts || 0;
        const remaining = MAX_PIN_ATTEMPTS - attempts;
        throw new Error(`Invalid PIN. ${remaining} attempts remaining before lockout.`);
      }

      if (!data.is_active) {
        throw new Error('Account is inactive. Contact administrator.');
      }

      clearPinFailures(user_code);

      setAppUser(data);
      setIsAuthenticated(true);
      await cacheUserData(data);

      console.log(`Login successful: ${data.full_name} (${data.role})`);
      return { error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message || 'Failed to sign in');
      return { error };
    } finally {
      setLoading(false);
    }
  }, [hashPin, cacheUserData, isPinLocked, recordPinFailure, clearPinFailures]);

  const roleHierarchy = {
    viewer: 0,
    cashier: 1,
    manager: 2,
    admin: 3,
  } as const;

  const hasPermission = useCallback((requiredRole: string) => {
    if (!appUser) return false;
    const userLevel = roleHierarchy[appUser.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
    return userLevel >= requiredLevel;
  }, [appUser]);

  // Create user function (admin only)
  const createUser = useCallback(async (userData: UserCreationData) => {
    setError(null);
    setLoading(true);

    try {
      if (!appUser || (roleHierarchy[appUser.role as keyof typeof roleHierarchy] || 0) < (roleHierarchy['admin'] as number)) {
        throw new Error('Only administrators can create users');
      }

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
  }, [appUser]);

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
      setAppUser(null);
      setIsAuthenticated(false);
      await cacheUserData(null);
      await SecureStore.deleteItemAsync('fuelr_encryption_key').catch(() => {});
      
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
        .select('id, full_name, role, is_active, station_id')
        .eq('user_code', userCode.toUpperCase())
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }, []);

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
      <View style={{ flex: 1 }} testID="auth-provider">
        {children}
      </View>
    </AuthContext.Provider>
  );
};
