import { useState, useEffect, useCallback } from 'react';
import { notificationService, Notification, NotificationConfig } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';

// Hook for notifications
export const useNotifications = () => {
  const { appUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<NotificationConfig>(notificationService.getConfiguration());

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!appUser?.id) return;

    setLoading(true);
    try {
      const userNotifications = await notificationService.getNotifications(appUser?.id || '');
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [appUser?.id]);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    if (!appUser?.id) return;

    try {
      const count = await notificationService.getUnreadCount(appUser?.id || '');
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, [appUser?.id]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!appUser?.id) return;

    try {
      await notificationService.markAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [appUser?.id]);

  // Update configuration
  const updateConfig = useCallback(async (newConfig: NotificationConfig) => {
    try {
      await notificationService.saveConfiguration(newConfig);
      setConfig(newConfig);
    } catch (error) {
      console.error('Error updating notification config:', error);
    }
  }, []);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    if (!appUser?.id) return;

    try {
      await notificationService.sendPushNotification(
        'Test Notification',
        'This is a test notification from Bismillahi Operations'
      );
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }, [appUser?.id]);

  // Load data on mount and when user changes
  useEffect(() => {
    if (appUser?.id) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [appUser?.id, loadNotifications, loadUnreadCount]);

  // Set up notification listener
  useEffect(() => {
    const unsubscribe = notificationService.addNotificationListener((notification) => {
      // Add new notification to the list
      setNotifications(prev => [notification, ...prev] as Notification[]);
      
      // Update unread count
      setUnreadCount(prev => prev + 1);
    });

    return unsubscribe;
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    config,
    loadNotifications,
    loadUnreadCount,
    markAsRead,
    markAllAsRead,
    updateConfig,
    sendTestNotification,
  };
};

// Hook for notification permissions
export const useNotificationPermissions = () => {
  const [permissions, setPermissions] = useState<{
    granted: boolean;
    canAskAgain: boolean;
    status: string;
  } | null>(null);

  // Check permissions
  const checkPermissions = useCallback(async () => {
    try {
      const { status, canAskAgain } = await notificationService.requestPermissions();
      setPermissions({
        granted: status === 'granted',
        canAskAgain,
        status,
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  }, []);

  // Request permissions
  const requestPermissions = useCallback(async () => {
    try {
      const granted = await notificationService.requestPermissions();
      await checkPermissions();
      return granted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }, [checkPermissions]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    permissions,
    checkPermissions,
    requestPermissions,
  };
};

// Hook for push token
export const usePushToken = () => {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Get push token
  const getPushToken = useCallback(async () => {
    setLoading(true);
    try {
      const token = await notificationService.getPushToken();
      setPushToken(token);
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get token on mount
  useEffect(() => {
    getPushToken();
  }, [getPushToken]);

  return {
    pushToken,
    loading,
    getPushToken,
  };
};

// Hook for badge management
export const useBadge = () => {
  const [badgeCount, setBadgeCount] = useState(0);

  // Get badge count
  const getBadgeCount = useCallback(async () => {
    try {
      const count = await notificationService.getBadgeCount();
      setBadgeCount(count);
      return count;
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }, []);

  // Set badge count
  const updateBadgeCount = useCallback(async (count: number) => {
    try {
      await notificationService.setBadgeCount(count);
      setBadgeCount(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }, []);

  // Clear badge
  const clearBadge = useCallback(async () => {
    try {
      await notificationService.clearBadge();
      setBadgeCount(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }, []);

  // Get badge count on mount
  useEffect(() => {
    getBadgeCount();
  }, [getBadgeCount]);

  return {
    badgeCount,
    getBadgeCount,
    updateBadgeCount,
    clearBadge,
  };
};

