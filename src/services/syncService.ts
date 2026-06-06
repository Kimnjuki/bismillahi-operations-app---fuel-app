import { supabase } from '../config/supabase';
import { offlineService } from './offlineService';

// Sync status
export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingOperations: number;
  syncError: string | null;
}

// Sync result
export interface SyncResult {
  success: boolean;
  syncedTables: string[];
  failedTables: string[];
  error?: string;
}

// Table sync configuration
interface TableSyncConfig {
  table: string;
  primaryKey: string;
  syncFields: string[];
  orderBy?: string;
  limit?: number;
}

// Default table configurations
const TABLE_CONFIGS: TableSyncConfig[] = [
  {
    table: 'users',
    primaryKey: 'id',
    syncFields: ['id', 'user_code', 'full_name', 'role', 'is_active', 'created_at', 'updated_at'],
  },
  {
    table: 'daily_sales',
    primaryKey: 'id',
    syncFields: ['id', 'sale_type', 'pump_number', 'fuel_type', 'volume_liters', 'quantity', 'price_per_liter', 'price_per_drum', 'total_amount', 'payment_method', 'sale_date', 'created_by', 'created_at'],
    orderBy: 'created_at',
    limit: 1000,
  },
  {
    table: 'stock_items',
    primaryKey: 'id',
    syncFields: ['id', 'item_name', 'category', 'unit', 'current_stock', 'minimum_stock', 'selling_price', 'last_updated', 'updated_by', 'created_at'],
  },
  {
    table: 'stock_variances',
    primaryKey: 'id',
    syncFields: ['id', 'stock_item_id', 'actual_quantity', 'variance', 'reason', 'created_by', 'created_at'],
    orderBy: 'created_at',
    limit: 500,
  },
  {
    table: 'expenses',
    primaryKey: 'id',
    syncFields: ['id', 'category', 'subcategory', 'amount', 'description', 'receipt_number', 'payment_method', 'expense_date', 'created_at'],
    orderBy: 'created_at',
    limit: 1000,
  },
  {
    table: 'fund_transfers',
    primaryKey: 'id',
    syncFields: ['id', 'from_account', 'to_account', 'amount', 'currency', 'exchange_rate', 'purpose', 'transfer_date', 'created_at'],
    orderBy: 'created_at',
    limit: 500,
  },
  {
    table: 'exchange_rates',
    primaryKey: 'id',
    syncFields: ['id', 'from_currency', 'to_currency', 'rate', 'effective_date', 'created_at'],
    orderBy: 'effective_date',
  },
  {
    table: 'notifications',
    primaryKey: 'id',
    syncFields: ['id', 'title', 'message', 'type', 'user_id', 'is_read', 'created_at'],
    orderBy: 'created_at',
    limit: 100,
  },
  {
    table: 'expense_categories',
    primaryKey: 'id',
    syncFields: ['id', 'name', 'description', 'is_active', 'created_at'],
  },
];

class SyncService {
  private syncInProgress: boolean = false;
  private listeners: ((status: SyncStatus) => void)[] = [];

  // Add sync status listener
  addSyncStatusListener(listener: (status: SyncStatus) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify listeners about sync status changes
  private notifyListeners(status: SyncStatus) {
    this.listeners.forEach(listener => listener(status));
  }

  // Get current sync status
  async getSyncStatus(): Promise<SyncStatus> {
    const isOnline = offlineService.getNetworkStatus();
    const lastSyncTime = await offlineService.getLastSyncTime();
    const queueStatus = await offlineService.getOfflineQueueStatus();

    return {
      isOnline,
      isSyncing: this.syncInProgress,
      lastSyncTime,
      pendingOperations: queueStatus.count,
      syncError: null,
    };
  }

  // Sync all tables
  async syncAllTables(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        syncedTables: [],
        failedTables: [],
        error: 'Sync already in progress',
      };
    }

    this.syncInProgress = true;
    const syncedTables: string[] = [];
    const failedTables: string[] = [];

    try {
      // First, sync offline operations
      const offlineResult = await offlineService.syncOfflineData();
      console.log(`Synced ${offlineResult.success} offline operations, ${offlineResult.failed} failed`);

      // Then sync table data
      for (const config of TABLE_CONFIGS) {
        try {
          await this.syncTable(config);
          syncedTables.push(config.table);
        } catch (error) {
          console.error(`Error syncing table ${config.table}:`, error);
          failedTables.push(config.table);
        }
      }

      const success = failedTables.length === 0;
      const result: SyncResult = {
        success,
        syncedTables,
        failedTables,
      };

      if (!success) {
        result.error = `Failed to sync ${failedTables.length} tables`;
      }

      return result;

    } catch (error) {
      console.error('Error during sync:', error);
      return {
        success: false,
        syncedTables,
        failedTables,
        error: error instanceof Error ? error.message : 'Unknown sync error',
      };
    } finally {
      this.syncInProgress = false;
      this.notifyListeners(await this.getSyncStatus());
    }
  }

  // Sync a specific table
  async syncTable(config: TableSyncConfig): Promise<void> {
    try {
      let query = supabase
        .from(config.table)
        .select(config.syncFields.join(', '));

      // Add ordering if specified
      if (config.orderBy) {
        query = query.order(config.orderBy, { ascending: false });
      }

      // Add limit if specified
      if (config.limit) {
        query = query.limit(config.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Cache the data for offline access
      if (data) {
        await offlineService.cacheData(config.table, data);
      }

    } catch (error) {
      console.error(`Error syncing table ${config.table}:`, error);
      // Don't throw error, just log it and continue
      return;
    }
  }

  // Sync specific tables
  async syncTables(tableNames: string[]): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        syncedTables: [],
        failedTables: [],
        error: 'Sync already in progress',
      };
    }

    this.syncInProgress = true;
    const syncedTables: string[] = [];
    const failedTables: string[] = [];

    try {
      for (const tableName of tableNames) {
        const config = TABLE_CONFIGS.find(c => c.table === tableName);
        if (config) {
          try {
            await this.syncTable(config);
            syncedTables.push(tableName);
          } catch (error) {
            console.error(`Error syncing table ${tableName}:`, error);
            failedTables.push(tableName);
          }
        } else {
          console.warn(`No sync configuration found for table: ${tableName}`);
          failedTables.push(tableName);
        }
      }

      const success = failedTables.length === 0;
      return {
        success,
        syncedTables,
        failedTables,
        error: success ? undefined : `Failed to sync ${failedTables.length} tables`,
      };

    } finally {
      this.syncInProgress = false;
      this.notifyListeners(await this.getSyncStatus());
    }
  }

  // Get cached data for a table
  async getCachedData(tableName: string): Promise<any[] | null> {
    return offlineService.getCachedData(tableName);
  }

  // Clear cached data
  async clearCachedData(tableName?: string): Promise<void> {
    return offlineService.clearCachedData(tableName);
  }

  // Force sync offline operations
  async syncOfflineOperations(): Promise<{ success: number; failed: number }> {
    return offlineService.forceSync();
  }

  // Get sync statistics
  async getSyncStatistics(): Promise<{
    lastSyncTime: number | null;
    pendingOperations: number;
    cachedTables: string[];
    isOnline: boolean;
  }> {
    const lastSyncTime = await offlineService.getLastSyncTime();
    const queueStatus = await offlineService.getOfflineQueueStatus();
    const isOnline = offlineService.getNetworkStatus();

    // Get list of cached tables
    const cachedTables: string[] = [];
    for (const config of TABLE_CONFIGS) {
      const cached = await offlineService.getCachedData(config.table);
      if (cached && cached.length > 0) {
        cachedTables.push(config.table);
      }
    }

    return {
      lastSyncTime,
      pendingOperations: queueStatus.count,
      cachedTables,
      isOnline,
    };
  }

  // Initialize sync service
  async initialize(): Promise<void> {
    // Set up network status listener
    offlineService.addNetworkListener(async (isOnline) => {
      if (isOnline && !this.syncInProgress) {
        // Auto-sync when coming back online
        setTimeout(() => {
          this.syncAllTables();
        }, 2000); // Wait 2 seconds after coming online
      }
    });

    // Initial sync if online
    if (offlineService.getNetworkStatus()) {
      setTimeout(() => {
        this.syncAllTables();
      }, 5000); // Wait 5 seconds after app start
    }
  }

  // Cleanup
  destroy() {
    this.listeners = [];
  }
}

// Export singleton instance
export const syncService = new SyncService();

// Export types
// Types already exported above

