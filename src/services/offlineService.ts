import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../config/supabase';
import { generateUUID } from '../utils/uuid';

// Storage keys
const STORAGE_KEYS = {
  OFFLINE_QUEUE: '@bismillahi_offline_queue',
  LAST_SYNC: '@bismillahi_last_sync',
  CACHED_DATA: '@bismillahi_cached_data',
  SYNC_SETTINGS: '@bismillahi_sync_settings',
} as const;

// Offline operation types
export interface OfflineOperation {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

// Sync settings
export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number; // in minutes
  maxRetries: number;
  syncOnWifiOnly: boolean;
}

// Cached data structure
export interface CachedData {
  table: string;
  data: any[];
  lastUpdated: number;
  version: number;
}

class OfflineService {
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: ((isOnline: boolean) => void)[] = [];

  constructor() {
    this.initializeNetworkListener();
    this.loadSyncSettings();
  }

  // Initialize network status listener
  private async initializeNetworkListener() {
    const netInfo = await NetInfo.fetch();
    this.isOnline = netInfo.isConnected ?? false;

    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (wasOnline !== this.isOnline) {
        this.notifyListeners();
        
        if (this.isOnline) {
          this.syncOfflineData();
        }
      }
    });
  }

  // Notify listeners about network status changes
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  // Add network status listener
  addNetworkListener(listener: (isOnline: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Get current network status
  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  // Load sync settings
  private async loadSyncSettings(): Promise<SyncSettings> {
    try {
      const settings = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_SETTINGS);
      if (settings) {
        return JSON.parse(settings);
      }
    } catch (error) {
      console.error('Error loading sync settings:', error);
    }

    // Default settings
    const defaultSettings: SyncSettings = {
      autoSync: true,
      syncInterval: 5, // 5 minutes
      maxRetries: 3,
      syncOnWifiOnly: false,
    };

    await this.saveSyncSettings(defaultSettings);
    return defaultSettings;
  }

  // Save sync settings
  async saveSyncSettings(settings: SyncSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_SETTINGS, JSON.stringify(settings));
      this.setupAutoSync(settings);
    } catch (error) {
      console.error('Error saving sync settings:', error);
    }
  }

  // Setup auto sync
  private setupAutoSync(settings: SyncSettings) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    if (settings.autoSync && settings.syncInterval > 0) {
      this.syncInterval = setInterval(() => {
        if (this.isOnline && !this.syncInProgress) {
          this.syncOfflineData();
        }
      }, settings.syncInterval * 60 * 1000);
    }
  }

  // Add operation to offline queue
  async addToOfflineQueue(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const offlineOp: OfflineOperation = {
        ...operation,
        id: generateUUID(),
        timestamp: Date.now(),
        retryCount: 0,
      };

      const queue = await this.getOfflineQueue();
      queue.push(offlineOp);
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Error adding to offline queue:', error);
    }
  }

  // Get offline queue
  private async getOfflineQueue(): Promise<OfflineOperation[]> {
    try {
      const queue = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  }

  // Save offline queue
  private async saveOfflineQueue(queue: OfflineOperation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

// Sync offline data with batch operations
   async syncOfflineData(): Promise<{ success: number; failed: number }> {
     if (!this.isOnline || this.syncInProgress) {
       return { success: 0, failed: 0 };
     }

     this.syncInProgress = true;
     const queue = await this.getOfflineQueue();
     let successCount = 0;
     let failedCount = 0;
     const successfulOps: string[] = [];

     try {
       // Group operations by table for batch processing
       const operationsByTable: Record<string, OfflineOperation[]> = {};
       queue.forEach(op => {
         if (!operationsByTable[op.table]) {
           operationsByTable[op.table] = [];
         }
         operationsByTable[op.table].push(op);
       });

       // Process each table's operations in batch
       for (const [table, ops] of Object.entries(operationsByTable)) {
         try {
           // Batch insert for INSERT operations
           const insertOps = ops.filter(op => op.type === 'INSERT');
           if (insertOps.length > 0) {
             const records = insertOps.map(op => op.data);
             const { error: insertError } = await supabase
               .from(table)
               .insert(records);
            
             if (insertError) throw insertError;
             successCount += insertOps.length;
             successfulOps.push(...insertOps.map(op => op.id));
           }

           // Batch update for UPDATE operations
           const updateOps = ops.filter(op => op.type === 'UPDATE');
           for (const op of updateOps) {
             const { error: updateError } = await supabase
               .from(table)
               .update(op.data)
               .eq('id', op.data.id);
            
             if (updateError) throw updateError;
             successCount++;
             successfulOps.push(op.id);
           }

           // Batch delete for DELETE operations
           const deleteOps = ops.filter(op => op.type === 'DELETE');
           const deleteIds = deleteOps.map(op => op.data.id);
           if (deleteIds.length > 0) {
             const { error: deleteError } = await supabase
               .from(table)
               .delete()
               .in('id', deleteIds);
            
             if (deleteError) throw deleteError;
             successCount += deleteOps.length;
             successfulOps.push(...deleteOps.map(op => op.id));
           }
         } catch (error) {
           console.error(`Error syncing table ${table}:`, error);
           failedCount += ops.length;
           // Mark failed operations for retry
           ops.forEach(op => {
             op.retryCount++;
           });
         }
       }

       // Remove successful operations from queue
       const remainingQueue = queue.filter(op => !successfulOps.includes(op.id));
       await this.saveOfflineQueue(remainingQueue);

       // Update last sync time
       await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());

     } finally {
       this.syncInProgress = false;
     }

     return { success: successCount, failed: failedCount };
   }

  // Execute a single operation
  private async executeOperation(operation: OfflineOperation): Promise<void> {
    const { type, table, data } = operation;

    switch (type) {
      case 'INSERT':
        const { error: insertError } = await supabase
          .from(table)
          .insert(data);
        if (insertError) throw insertError;
        break;

      case 'UPDATE':
        const { error: updateError } = await supabase
          .from(table)
          .update(data)
          .eq('id', data.id);
        if (updateError) throw updateError;
        break;

      case 'DELETE':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        break;

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  // Cache data for offline access
  async cacheData(table: string, data: any[]): Promise<void> {
    try {
      const cachedData: CachedData = {
        table,
        data,
        lastUpdated: Date.now(),
        version: 1,
      };

      const cacheKey = `${STORAGE_KEYS.CACHED_DATA}_${table}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedData));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  // Get cached data
  async getCachedData(table: string): Promise<any[] | null> {
    try {
      const cacheKey = `${STORAGE_KEYS.CACHED_DATA}_${table}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const cachedData: CachedData = JSON.parse(cached);
        return cachedData.data;
      }
    } catch (error) {
      console.error('Error getting cached data:', error);
    }
    
    return null;
  }

  // Clear cached data
  async clearCachedData(table?: string): Promise<void> {
    try {
      if (table) {
        const cacheKey = `${STORAGE_KEYS.CACHED_DATA}_${table}`;
        await AsyncStorage.removeItem(cacheKey);
      } else {
        // Clear all cached data
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.CACHED_DATA));
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Error clearing cached data:', error);
    }
  }

  // Get last sync time
  async getLastSyncTime(): Promise<number | null> {
    try {
      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return lastSync ? parseInt(lastSync) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  // Get offline queue status
  async getOfflineQueueStatus(): Promise<{ count: number; oldestOperation: number | null }> {
    try {
      const queue = await this.getOfflineQueue();
      const oldestOperation = queue.length > 0 ? Math.min(...queue.map(op => op.timestamp)) : null;
      
      return {
        count: queue.length,
        oldestOperation,
      };
    } catch (error) {
      console.error('Error getting offline queue status:', error);
      return { count: 0, oldestOperation: null };
    }
  }

  // Force sync
  async forceSync(): Promise<{ success: number; failed: number }> {
    return this.syncOfflineData();
  }

  // Cleanup
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.listeners = [];
  }
}

// Export singleton instance
export const offlineService = new OfflineService();

// Export types
// Types already exported above

