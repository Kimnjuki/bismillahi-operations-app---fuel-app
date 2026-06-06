import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Environment variables - For Expo Go compatibility, values are hardcoded
// since process.env is not available in the Expo Go client
const supabaseUrl = 'https://bdjoknphffficrepbxim.supabase.co';
const supabaseAnonKey = 'sb_publishable_XUvsC3aQUTpITX64S3yrNw_q4DnyqBf';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your setup.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: undefined, // Use default AsyncStorage
  },
});

// Import types from the main types file
import type {
  User,
  UserRole,
  PumpSale,
  DrumSale,
  StockItem,
  StockVariance,
  Expense,
  FundTransfer,
  ExchangeRate,
  Notification,
  ExpenseCategory,
  FuelType,
  DrumType,
  PaymentMethod,
  Currency,
  NotificationType,
} from '../types';

// Re-export types for external use
export type {
  User,
  UserRole,
  PumpSale,
  DrumSale,
  StockItem,
  StockVariance,
  Expense,
  FundTransfer,
  ExchangeRate,
  Notification,
  ExpenseCategory,
  FuelType,
  DrumType,
  PaymentMethod,
  Currency,
  NotificationType,
};

// Database response types (for Supabase queries)
export type DatabaseUser = User;
export type DatabasePumpSale = PumpSale;
export type DatabaseDrumSale = DrumSale;
export type DatabaseStockItem = StockItem;
export type DatabaseStockVariance = StockVariance;
export type DatabaseExpense = Expense;
export type DatabaseFundTransfer = FundTransfer;
export type DatabaseExchangeRate = ExchangeRate;
export type DatabaseNotification = Notification;
export type DatabaseExpenseCategory = ExpenseCategory;


// Helper functions
export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  } catch (error) {
    console.error('Get current user error:', error);
    return { user: null, error };
  }
};

// Real-time subscription helpers
export const subscribeToTable = (
  table: string,
  callback: (payload: any) => void,
  filter?: string
) => {
  const subscription = supabase
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
        filter: filter,
      },
      callback
    )
    .subscribe();

  return subscription;
};

export const unsubscribe = (subscription: any) => {
  if (subscription) {
    supabase.removeChannel(subscription);
  }
};