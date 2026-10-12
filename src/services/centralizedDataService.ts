/**
 * Comprehensive Data Service Layer
 * 
 * Centralizes all Supabase queries with:
 * - Strong typing for all database operations
 * - Automatic field mapping and transformation
 * - Consistent error handling
 * - Query logging and debugging
 * - Null/undefined safety
 */

import { supabase } from '../config/supabase';
import { withTimeout } from '../utils/timeoutHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Query logging for debugging
const DEBUG_MODE = __DEV__;

interface QueryLog {
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: number;
  duration: number;
  rowsAffected: number;
  error?: string;
}

const queryLogs: QueryLog[] = [];

function logQuery(log: QueryLog) {
  if (DEBUG_MODE) {
    queryLogs.push(log);
    console.log(`[DB] ${log.table} ${log.operation} ${log.duration}ms (${log.rowsAffected} rows)`);
    if (log.error) {
      console.error(`[DB] Error: ${log.error}`);
    }
  }
}

export function getQueryLogs(): QueryLog[] {
  return queryLogs;
}

// Type-safe field selector builder
interface FieldSelector {
  table: string;
  fields: string[];
}

function createFieldSelector(table: string, fields?: string[]): string {
  if (!fields || fields.length === 0) {
    return '*';
  }
  return fields.join(', ');
}

/**
 * Sales Data Service
 */
export const SalesDataService = {
  async getDailySales(filters?: { 
    stationId?: string; 
    dateFrom?: string; 
    dateTo?: string;
    limit?: number;
  }) {
    const startTime = Date.now();
    try {
      let query = supabase
        .from('daily_sales')
        .select(`
          id,
          pump_number,
          fuel_type,
          volume_liters,
          price_per_liter,
          total_amount,
          payment_method,
          sale_date,
          created_by,
          created_at,
          updated_at,
          station_id
        `)
        .order('sale_date', { ascending: false });

      if (filters?.stationId) {
        query = query.eq('station_id', filters.stationId);
      }
      if (filters?.dateFrom) {
        query = query.gte('sale_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('sale_date', filters.dateTo);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await withTimeout(query, 10000, 'Sales query timeout');

      logQuery({
        table: 'daily_sales',
        operation: 'SELECT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: data?.length || 0,
        error: error?.message,
      });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logQuery({
        table: 'daily_sales',
        operation: 'SELECT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: 0,
        error: errorMsg,
      });
      console.error('Error fetching daily sales:', error);
      return { data: [], error: errorMsg };
    }
  },

  async createSale(sale: any) {
    const startTime = Date.now();
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('daily_sales')
          .insert([sale])
          .select(),
        10000,
        'Create sale timeout'
      );

      logQuery({
        table: 'daily_sales',
        operation: 'INSERT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: data?.length || 0,
        error: error?.message,
      });

      if (error) throw error;
      return { data: data?.[0] || null, error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logQuery({
        table: 'daily_sales',
        operation: 'INSERT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: 0,
        error: errorMsg,
      });
      console.error('Error creating sale:', error);
      return { data: null, error: errorMsg };
    }
  },
};

/**
 * Stock Data Service
 */
export const StockDataService = {
  async getStockItems(filters?: {
    stationId?: string;
    category?: string;
    lowStockOnly?: boolean;
  }) {
    const startTime = Date.now();
    try {
      let query = supabase
        .from('stock_items')
        .select(`
          id,
          item_name,
          category,
          unit,
          current_stock,
          minimum_stock,
          cost_price,
          selling_price,
          last_updated,
          updated_by,
          created_at,
          updated_at
        `)
        .order('item_name', { ascending: true });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await withTimeout(query, 10000, 'Stock query timeout');

      // Filter low stock in memory if needed
      let result = data || [];
      if (filters?.lowStockOnly) {
        result = result.filter(
          (item: any) => (item.current_stock || 0) < (item.minimum_stock || 0)
        );
      }

      logQuery({
        table: 'stock_items',
        operation: 'SELECT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: result.length,
        error: error?.message,
      });

      if (error) throw error;
      return { data: result, error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logQuery({
        table: 'stock_items',
        operation: 'SELECT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: 0,
        error: errorMsg,
      });
      console.error('Error fetching stock items:', error);
      return { data: [], error: errorMsg };
    }
  },

  async updateStockItem(id: string, updates: any) {
    const startTime = Date.now();
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('stock_items')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select(),
        10000,
        'Update stock timeout'
      );

      logQuery({
        table: 'stock_items',
        operation: 'UPDATE',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: data?.length || 0,
        error: error?.message,
      });

      if (error) throw error;
      return { data: data?.[0] || null, error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logQuery({
        table: 'stock_items',
        operation: 'UPDATE',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: 0,
        error: errorMsg,
      });
      console.error('Error updating stock item:', error);
      return { data: null, error: errorMsg };
    }
  },
};

/**
 * Expense Data Service
 */
export const ExpenseDataService = {
  async getExpenses(filters?: {
    stationId?: string;
    dateFrom?: string;
    dateTo?: string;
    category?: string;
    limit?: number;
  }) {
    const startTime = Date.now();
    try {
      let query = supabase
        .from('expenses')
        .select(`
          id,
          category,
          subcategory,
          amount,
          description,
          receipt_number,
          payment_method,
          expense_date,
          created_by,
          account_id,
          created_at,
          updated_at,
          station_id
        `)
        .order('expense_date', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.dateFrom) {
        query = query.gte('expense_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('expense_date', filters.dateTo);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await withTimeout(query, 10000, 'Expenses query timeout');

      logQuery({
        table: 'expenses',
        operation: 'SELECT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: data?.length || 0,
        error: error?.message,
      });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logQuery({
        table: 'expenses',
        operation: 'SELECT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: 0,
        error: errorMsg,
      });
      console.error('Error fetching expenses:', error);
      return { data: [], error: errorMsg };
    }
  },

  async createExpense(expense: any) {
    const startTime = Date.now();
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('expenses')
          .insert([expense])
          .select(),
        10000,
        'Create expense timeout'
      );

      logQuery({
        table: 'expenses',
        operation: 'INSERT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: data?.length || 0,
        error: error?.message,
      });

      if (error) throw error;
      return { data: data?.[0] || null, error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logQuery({
        table: 'expenses',
        operation: 'INSERT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: 0,
        error: errorMsg,
      });
      console.error('Error creating expense:', error);
      return { data: null, error: errorMsg };
    }
  },
};

/**
 * Account Data Service
 */
export const AccountDataService = {
  async getAccountReceivables(filters?: { stationId?: string; limit?: number }) {
    const startTime = Date.now();
    try {
      let query = supabase
        .from('account_receivables')
        .select(`
          id,
          creditor_name,
          creditor_code,
          contact_person,
          phone,
          email,
          address,
          total_amount,
          currency,
          due_date,
          status,
          description,
          created_by,
          last_payment_date,
          last_payment_amount,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await withTimeout(query, 10000, 'Receivables query timeout');

      logQuery({
        table: 'account_receivables',
        operation: 'SELECT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: data?.length || 0,
        error: error?.message,
      });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logQuery({
        table: 'account_receivables',
        operation: 'SELECT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: 0,
        error: errorMsg,
      });
      console.error('Error fetching receivables:', error);
      return { data: [], error: errorMsg };
    }
  },

  async getAccountPayables(filters?: { stationId?: string; limit?: number }) {
    const startTime = Date.now();
    try {
      let query = supabase
        .from('account_payables')
        .select(`
          id,
          debtor_name,
          debtor_code,
          contact_person,
          phone,
          email,
          address,
          total_amount,
          currency,
          due_date,
          status,
          description,
          created_by,
          last_payment_date,
          last_payment_amount,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await withTimeout(query, 10000, 'Payables query timeout');

      logQuery({
        table: 'account_payables',
        operation: 'SELECT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: data?.length || 0,
        error: error?.message,
      });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logQuery({
        table: 'account_payables',
        operation: 'SELECT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: 0,
        error: errorMsg,
      });
      console.error('Error fetching payables:', error);
      return { data: [], error: errorMsg };
    }
  },
};

/**
 * User Data Service
 */
export const UserDataService = {
  async getUserByCode(userCode: string) {
    const startTime = Date.now();
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .select(`
            id,
            user_code,
            full_name,
            role,
            station_id,
            is_active,
            pin_hash,
            last_login,
            push_token,
            created_at,
            updated_at
          `)
          .eq('user_code', userCode.toUpperCase())
          .single(),
        10000,
        'User query timeout'
      );

      logQuery({
        table: 'users',
        operation: 'SELECT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: data ? 1 : 0,
        error: error?.message,
      });

      if (error && error.code !== 'PGRST116') throw error;
      return { data: data || null, error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logQuery({
        table: 'users',
        operation: 'SELECT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: 0,
        error: errorMsg,
      });
      console.error('Error fetching user:', error);
      return { data: null, error: errorMsg };
    }
  },

  async getAllUsers(filters?: { stationId?: string; role?: string }) {
    const startTime = Date.now();
    try {
      let query = supabase
        .from('users')
        .select(`
          id,
          user_code,
          full_name,
          role,
          station_id,
          is_active,
          last_login,
          created_at,
          updated_at
        `)
        .order('full_name', { ascending: true });

      if (filters?.role) {
        query = query.eq('role', filters.role);
      }

      const { data, error } = await withTimeout(query, 10000, 'Users query timeout');

      logQuery({
        table: 'users',
        operation: 'SELECT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: data?.length || 0,
        error: error?.message,
      });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logQuery({
        table: 'users',
        operation: 'SELECT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: 0,
        error: errorMsg,
      });
      console.error('Error fetching users:', error);
      return { data: [], error: errorMsg };
    }
  },
};

/**
 * Notification Data Service
 */
export const NotificationDataService = {
  async getNotifications(filters?: {
    userId?: string;
    unreadOnly?: boolean;
    limit?: number;
  }) {
    const startTime = Date.now();
    try {
      let query = supabase
        .from('notifications')
        .select(`
          id,
          type,
          title,
          description,
          is_read,
          data,
          station_id,
          priority,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (filters?.unreadOnly) {
        query = query.eq('is_read', false);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await withTimeout(
        query,
        10000,
        'Notifications query timeout'
      );

      logQuery({
        table: 'notifications',
        operation: 'SELECT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: data?.length || 0,
        error: error?.message,
      });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logQuery({
        table: 'notifications',
        operation: 'SELECT',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: 0,
        error: errorMsg,
      });
      console.error('Error fetching notifications:', error);
      return { data: [], error: errorMsg };
    }
  },

  async markAsRead(notificationId: string) {
    const startTime = Date.now();
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('notifications')
          .update({ is_read: true, updated_at: new Date().toISOString() })
          .eq('id', notificationId)
          .select(),
        10000,
        'Mark read timeout'
      );

      logQuery({
        table: 'notifications',
        operation: 'UPDATE',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: data?.length || 0,
        error: error?.message,
      });

      if (error) throw error;
      return { data: data?.[0] || null, error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logQuery({
        table: 'notifications',
        operation: 'UPDATE',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        rowsAffected: 0,
        error: errorMsg,
      });
      console.error('Error marking notification as read:', error);
      return { data: null, error: errorMsg };
    }
  },
};

/**
 * Cache and sync manager
 */
export const CacheManager = {
  async cacheData(key: string, data: any, ttlSeconds: number = 3600) {
    try {
      const cached = {
        data,
        timestamp: Date.now(),
        ttl: ttlSeconds * 1000,
      };
      await AsyncStorage.setItem(key, JSON.stringify(cached));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  },

  async getCachedData(key: string) {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (now - parsed.timestamp > parsed.ttl) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('Error retrieving cached data:', error);
      return null;
    }
  },

  async clearCache(key?: string) {
    try {
      if (key) {
        await AsyncStorage.removeItem(key);
      } else {
        // Clear all app cache
        const keys = await AsyncStorage.getAllKeys();
        const appKeys = keys.filter(k => k.startsWith('@app_cache_'));
        await AsyncStorage.multiRemove(appKeys);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  },
};

export default {
  SalesDataService,
  StockDataService,
  ExpenseDataService,
  AccountDataService,
  UserDataService,
  NotificationDataService,
  CacheManager,
  getQueryLogs,
};
