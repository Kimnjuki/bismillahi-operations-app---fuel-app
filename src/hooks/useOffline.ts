import { useState, useEffect, useCallback } from 'react';
import { offlineService, SyncSettings } from '../services/offlineService';
import { syncService, SyncStatus, SyncResult } from '../services/syncService';

// Hook for offline functionality
export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(offlineService.getNetworkStatus());
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncSettings, setSyncSettings] = useState<SyncSettings | null>(null);

  // Update network status
  useEffect(() => {
    const unsubscribe = offlineService.addNetworkListener((online) => {
      setIsOnline(online);
    });

    return unsubscribe;
  }, []);

  // Update sync status
  useEffect(() => {
    const updateSyncStatus = async () => {
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    };

    updateSyncStatus();

    const unsubscribe = syncService.addSyncStatusListener((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  // Load sync settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Access private method through type assertion (not ideal but necessary)
        const settings = await (offlineService as any).loadSyncSettings();
        setSyncSettings(settings);
      } catch (error) {
        console.error('Error loading sync settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Sync all data
  const syncAllData = useCallback(async (): Promise<SyncResult> => {
    return syncService.syncAllTables();
  }, []);

  // Sync specific tables
  const syncTables = useCallback(async (tableNames: string[]): Promise<SyncResult> => {
    return syncService.syncTables(tableNames);
  }, []);

  // Sync offline operations
  const syncOfflineOperations = useCallback(async () => {
    return syncService.syncOfflineOperations();
  }, []);

  // Get cached data
  const getCachedData = useCallback(async (tableName: string) => {
    return syncService.getCachedData(tableName);
  }, []);

  // Clear cached data
  const clearCachedData = useCallback(async (tableName?: string) => {
    return syncService.clearCachedData(tableName);
  }, []);

  // Update sync settings
  const updateSyncSettings = useCallback(async (settings: SyncSettings) => {
    await offlineService.saveSyncSettings(settings);
    setSyncSettings(settings);
  }, []);

  // Get sync statistics
  const getSyncStatistics = useCallback(async () => {
    return syncService.getSyncStatistics();
  }, []);

  return {
    // Network status
    isOnline,
    
    // Sync status
    syncStatus,
    syncSettings,
    
    // Actions
    syncAllData,
    syncTables,
    syncOfflineOperations,
    getCachedData,
    clearCachedData,
    updateSyncSettings,
    getSyncStatistics,
  };
};

// Hook for offline data operations
export const useOfflineData = <T>(tableName: string) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOnline, getCachedData, syncTables } = useOffline();

  // Load data (cached or fresh)
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isOnline) {
        // Try to sync the table first
        await syncTables([tableName]);
      }

      // Get cached data
      const cachedData = await getCachedData(tableName);
      if (cachedData) {
        setData(cachedData);
      } else {
        setData([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [tableName, isOnline, getCachedData, syncTables]);

  // Refresh data
  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    refreshData,
    isOnline,
  };
};

// Hook for offline operations
export const useOfflineOperations = () => {
  const [pendingOperations, setPendingOperations] = useState(0);
  const { syncOfflineOperations } = useOffline();

  // Update pending operations count
  const updatePendingCount = useCallback(async () => {
    const queueStatus = await offlineService.getOfflineQueueStatus();
    setPendingOperations(queueStatus.count);
  }, []);

  // Add operation to offline queue
  const addOfflineOperation = useCallback(async (operation: {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    table: string;
    data: any;
    maxRetries?: number;
  }) => {
    await offlineService.addToOfflineQueue({
      ...operation,
      maxRetries: operation.maxRetries || 3,
    });
    await updatePendingCount();
  }, [updatePendingCount]);

  // Sync offline operations
  const syncOperations = useCallback(async () => {
    const result = await syncOfflineOperations();
    await updatePendingCount();
    return result;
  }, [syncOfflineOperations, updatePendingCount]);

  // Update count on mount
  useEffect(() => {
    updatePendingCount();
  }, [updatePendingCount]);

  return {
    pendingOperations,
    addOfflineOperation,
    syncOperations,
    updatePendingCount,
  };
};

// Hook for sync status
export const useSyncStatus = () => {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [statistics, setStatistics] = useState<any>(null);

  // Update status
  const updateStatus = useCallback(async () => {
    const syncStatus = await syncService.getSyncStatus();
    const syncStats = await syncService.getSyncStatistics();
    setStatus(syncStatus);
    setStatistics(syncStats);
  }, []);

  // Set up status listener
  useEffect(() => {
    updateStatus();

    const unsubscribe = syncService.addSyncStatusListener((newStatus) => {
      setStatus(newStatus);
    });

    return unsubscribe;
  }, [updateStatus]);

  return {
    status,
    statistics,
    updateStatus,
  };
};

