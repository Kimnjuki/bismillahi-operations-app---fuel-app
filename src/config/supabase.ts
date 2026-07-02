import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Environment variables - loaded from .env or app config
const getSupabaseUrl = (): string => {
  return (
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    Constants.expoConfig?.extra?.supabaseUrl ||
    ''
  );
};

const getSupabaseAnonKey = (): string => {
  return (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    Constants.expoConfig?.extra?.supabaseAnonKey ||
    ''
  );
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

let warned = false;
if (!supabaseUrl || !supabaseAnonKey) {
  if (!warned) {
    console.warn('Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file or app.json extras.');
    warned = true;
  }
}

const createDummySupabase = (): SupabaseClient => {
  const noopResult = Promise.resolve({ data: null, error: null });
  const builder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    upsert: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    like: () => builder,
    ilike: () => builder,
    is: () => builder,
    in: () => builder,
    contains: () => builder,
    containedBy: () => builder,
    overlaps: () => builder,
    match: () => builder,
    textSearch: () => builder,
    or: () => builder,
    not: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    single: () => noopResult,
    maybeSingle: () => noopResult,
    then(resolve: (value: { data: any; error: any }) => void) {
      return resolve({ data: null, error: null });
    },
  };
  return {
    from: () => builder,
    auth: {
      signInWithPassword: () => noopResult,
      signOut: () => noopResult,
      getUser: () => noopResult,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
    },
    channel: () => ({
      on: () => ({
        subscribe: () => ({}),
      }),
    }),
    removeChannel: () => {},
    rpc: () => noopResult,
  } as unknown as SupabaseClient;
};

const isConfigured = (url: string, key: string) => {
  return (
    url.startsWith('http://') || url.startsWith('https://')
  ) && !url.includes('YOUR_') && key.length > 20 && !key.includes('YOUR_');
};

export const supabase = (() => {
  try {
    if (isConfigured(supabaseUrl, supabaseAnonKey)) {
      return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          storage: undefined,
        },
      });
    }
    return createDummySupabase();
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return createDummySupabase();
  }
})();

// Import types from the main types file
import type {
  User,
  UserRole,
  PumpSale,
  StockItem,
  StockVariance,
  Expense,
  FundTransfer,
  ExchangeRate,
  Notification,
  ExpenseCategory,
  FuelType,
  PaymentMethod,
  Currency,
  NotificationType,
  InternalAccount,
  Station,
  InternalAccountType,
} from '../types';

// Re-export types for external use
export type {
  User,
  UserRole,
  PumpSale,
  StockItem,
  StockVariance,
  Expense,
  FundTransfer,
  ExchangeRate,
  Notification,
  ExpenseCategory,
  FuelType,
  PaymentMethod,
  Currency,
  NotificationType,
  InternalAccount,
  Station,
  InternalAccountType,
};

// Database response types (for Supabase queries)
export type DatabaseUser = User;
export type DatabasePumpSale = PumpSale;
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
