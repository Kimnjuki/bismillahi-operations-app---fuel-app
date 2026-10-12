import { OfflineService, OfflineOperation, SyncSettings, offlineService as offlineServiceSingleton } from '../../src/services/offlineService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('@supabase/supabase-js');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

describe('OfflineService', () => {
  let offlineService: OfflineService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockNetInfo.fetch.mockResolvedValue({ isConnected: true } as any);
    // Return an unsubscribe handle from addEventListener so instances can be
    // cleanly torn down in afterEach (mirrors the real NetInfo API).
    mockNetInfo.addEventListener.mockReturnValue(jest.fn());
    
    // Create fresh instance for each test
    offlineService = new OfflineService();
  });

  afterEach(() => {
    // Tear down timers and the NetInfo subscription so handles don't leak
    // between tests (prevents "worker process failed to exit gracefully").
    offlineService.destroy();
  });

  afterAll(() => {
    // The module also exports a singleton that starts an auto-sync timer in its
    // constructor. Destroy it so its interval/listener don't keep the Jest
    // worker alive after the suite finishes.
    offlineServiceSingleton.destroy();
  });

  describe('Network Status', () => {
    it('should initialize with online status', () => {
      expect(offlineService.getNetworkStatus()).toBe(true);
    });

    it('should notify listeners when network status changes', async () => {
          const listener = jest.fn();
          const unsubscribe = offlineService.addNetworkListener(listener);

          // Wait for async initialization to complete
          await new Promise(process.nextTick);
      
          // Simulate network change
          // Note: The addEventListener call is from initializeNetworkListener in the constructor
          const mockListener = mockNetInfo.addEventListener.mock.calls[0][0];
          mockListener({ isConnected: false } as any);

          expect(listener).toHaveBeenCalledWith(false);
          unsubscribe();
        });
  });

  describe('Offline Queue', () => {
    it('should add operation to offline queue', async () => {
      const operation = {
        type: 'INSERT' as const,
        table: 'test_table',
        data: { id: '1', name: 'test' },
        maxRetries: 3,
      };

      await offlineService.addToOfflineQueue(operation);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@bismillahi_offline_queue',
        expect.stringContaining('test_table')
      );
    });

    it('should get offline queue status', async () => {
      const mockQueue = [
        {
          id: '1',
          type: 'INSERT',
          table: 'test',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueue));

      const status = await offlineService.getOfflineQueueStatus();

      expect(status.count).toBe(1);
      expect(status.oldestOperation).toBe(mockQueue[0].timestamp);
    });
  });

  describe('Data Caching', () => {
    it('should cache data for offline access', async () => {
      const tableName = 'test_table';
      const data = [{ id: '1', name: 'test' }];

      await offlineService.cacheData(tableName, data);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@bismillahi_cached_data_test_table',
        expect.stringContaining('test_table')
      );
    });

    it('should get cached data', async () => {
      const tableName = 'test_table';
      const mockData = {
        table: tableName,
        data: [{ id: '1', name: 'test' }],
        lastUpdated: Date.now(),
        version: 1,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      const result = await offlineService.getCachedData(tableName);

      expect(result).toEqual(mockData.data);
    });

    it('should clear cached data', async () => {
      const tableName = 'test_table';

      await offlineService.clearCachedData(tableName);

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@bismillahi_cached_data_test_table'
      );
    });

    it('should clear all cached data when no table specified', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValue([
        '@bismillahi_cached_data_table1',
        '@bismillahi_cached_data_table2',
      ]);

      await offlineService.clearCachedData();

      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@bismillahi_cached_data_table1',
        '@bismillahi_cached_data_table2',
      ]);
    });
  });

  describe('Sync Settings', () => {
    it('should load default sync settings', async () => {
      const settings = await (offlineService as any).loadSyncSettings();

      expect(settings).toEqual({
        autoSync: true,
        syncInterval: 5,
        maxRetries: 3,
        syncOnWifiOnly: false,
      });
    });

    it('should save sync settings', async () => {
      const settings: SyncSettings = {
        autoSync: false,
        syncInterval: 10,
        maxRetries: 5,
        syncOnWifiOnly: true,
      };

      await offlineService.saveSyncSettings(settings);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@bismillahi_sync_settings',
        JSON.stringify(settings)
      );
    });
  });

  describe('Last Sync Time', () => {
    it('should get last sync time', async () => {
      const timestamp = Date.now().toString();
      mockAsyncStorage.getItem.mockResolvedValue(timestamp);

      const result = await offlineService.getLastSyncTime();

      expect(result).toBe(parseInt(timestamp));
    });

    it('should return null when no last sync time', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await offlineService.getLastSyncTime();

      expect(result).toBeNull();
    });
  });

  describe('Sync Operations', () => {
    it('should not sync when offline', async () => {
          // Mock offline status
          // Note: The addEventListener call is from initializeNetworkListener in the constructor
          await new Promise(process.nextTick);
          const mockListener = mockNetInfo.addEventListener.mock.calls[0][0];
          mockListener({ isConnected: false } as any);

          const result = await offlineService.syncOfflineData();

          expect(result).toEqual({ success: 0, failed: 0 });
        });

    it('should not sync when already syncing', async () => {
          // Start a sync operation
          const syncPromise = offlineService.syncOfflineData();
      
          // Wait for initialization
          await new Promise(process.nextTick);

          // Try to start another sync
          const result = await offlineService.syncOfflineData();

          expect(result).toEqual({ success: 0, failed: 0 });
      
          // Wait for the first sync to complete
          await syncPromise;
        });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await offlineService.getCachedData('test_table');

      expect(result).toBeNull();
    });

    it('should handle network info errors gracefully', async () => {
      mockNetInfo.fetch.mockRejectedValue(new Error('Network error'));

      // Should not throw
      expect(() => offlineService.getNetworkStatus()).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup listeners and intervals on destroy', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      offlineService.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should unsubscribe from NetInfo on destroy', () => {
      const unsubscribe = mockNetInfo.addEventListener.mock.results[0]?.value as jest.Mock;
      expect(unsubscribe).toBeDefined();

      offlineService.destroy();

      // The handle returned by NetInfo.addEventListener should be invoked
      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});

