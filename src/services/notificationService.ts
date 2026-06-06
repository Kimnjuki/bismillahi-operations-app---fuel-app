import { supabase } from '../config/supabase';

export interface Notification {
  id: string;
  type: 'stock_alert' | 'payment_received' | 'fuel_delivery' | 'payment_due' | 'low_stock';
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  actionType?: 'view_stock' | 'view_payment' | 'view_delivery' | 'navigate';
  actionScreen?: string;
  actionData?: any;
  priority: 'low' | 'medium' | 'high';
  stationId?: string;
}

export interface NotificationCounts {
  total: number;
  unread: number;
  stockAlerts: number;
  payments: number;
  deliveries: number;
}

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];

  // Subscribe to notification updates
  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  // Load notifications from database
  async loadNotifications(): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
        return this.getMockNotifications();
      }

      this.notifications = (data || []).map(this.mapDatabaseNotification);
      this.notifyListeners();
      return this.notifications;
    } catch (error) {
      console.error('Error loading notifications:', error);
      return this.getMockNotifications();
    }
  }

  // Map database notification to app notification
  private mapDatabaseNotification = (dbNotification: any): Notification => {
    return {
      id: dbNotification.id,
      type: dbNotification.type as Notification['type'],
      title: dbNotification.title,
      description: dbNotification.message,
      timestamp: dbNotification.created_at,
      isRead: dbNotification.is_read,
      actionType: this.getActionType(dbNotification.type),
      actionScreen: this.getActionScreen(dbNotification.type),
      actionData: dbNotification.data || null, // Handle missing data column
      priority: this.getPriority(dbNotification.type, dbNotification.priority),
      stationId: dbNotification.station_id || null,
    };
  };

  // Get action type based on notification type
  private getActionType(type: string): Notification['actionType'] {
    switch (type) {
      case 'stock_alert':
      case 'low_stock':
        return 'view_stock';
      case 'payment_received':
      case 'payment_due':
        return 'view_payment';
      case 'fuel_delivery':
        return 'view_delivery';
      default:
        return 'navigate';
    }
  }

  // Get action screen based on notification type
  private getActionScreen(type: string): string {
    switch (type) {
      case 'stock_alert':
      case 'low_stock':
        return 'StockManagement';
      case 'payment_received':
      case 'payment_due':
        return 'Reports';
      case 'fuel_delivery':
        return 'SalesEntry';
      default:
        return 'Dashboard';
    }
  }

  // Get priority based on notification type and database priority
  private getPriority(type: string, dbPriority?: string): Notification['priority'] {
    if (dbPriority && ['low', 'medium', 'high'].includes(dbPriority)) {
      return dbPriority as Notification['priority'];
    }
    
    // Fallback to type-based priority
    switch (type) {
      case 'low_stock':
      case 'payment_due':
        return 'high';
      case 'stock_alert':
      case 'payment_received':
      case 'fuel_delivery':
        return 'medium';
      default:
        return 'low';
    }
  }

  // Get mock notifications for development
  private getMockNotifications(): Notification[] {
    const now = new Date();
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'low_stock',
        title: 'Low Stock Alert',
        description: 'Petrol is running low at ISSIRO STATION.',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        isRead: false,
        actionType: 'view_stock',
        actionScreen: 'StockManagement',
        priority: 'high',
        stationId: 'issiro_station',
      },
      {
        id: '2',
        type: 'payment_due',
        title: 'Payment Due Soon',
        description: 'Invoice #1234 is due tomorrow.',
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        isRead: false,
        actionType: 'view_payment',
        actionScreen: 'Reports',
        priority: 'high',
      },
      {
        id: '3',
        type: 'fuel_delivery',
        title: 'Fuel Delivery Completed',
        description: '5000L of Diesel delivered to DEPOT ISSIRO.',
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        isRead: true,
        actionType: 'view_delivery',
        actionScreen: 'SalesEntry',
        priority: 'low',
        stationId: 'depot_issiro',
      },
      {
        id: '4',
        type: 'payment_received',
        title: 'Payment Received',
        description: 'Received $500 from Corporate Client X.',
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        isRead: true,
        actionType: 'view_payment',
        actionScreen: 'Reports',
        priority: 'low',
      },
      {
        id: '5',
        type: 'low_stock',
        title: 'Low Stock Alert',
        description: 'Diesel is running low at RUNGU STATION.',
        timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
        isRead: true,
        actionType: 'view_stock',
        actionScreen: 'StockManagement',
        priority: 'high',
        stationId: 'rungu_station',
      },
    ];

    this.notifications = mockNotifications;
    this.notifyListeners();
    return mockNotifications;
  }

  // Get notification counts
  getNotificationCounts(): NotificationCounts {
    const unread = this.notifications.filter(n => !n.isRead).length;
    const stockAlerts = this.notifications.filter(n => 
      n.type === 'stock_alert' || n.type === 'low_stock'
    ).length;
    const payments = this.notifications.filter(n => 
      n.type === 'payment_received' || n.type === 'payment_due'
    ).length;
    const deliveries = this.notifications.filter(n => 
      n.type === 'fuel_delivery'
    ).length;

    return {
      total: this.notifications.length,
      unread,
      stockAlerts,
      payments,
      deliveries,
    };
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
      }

      // Update local state
      this.notifications = this.notifications.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      this.notifyListeners();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
      }

      // Update local state
      this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
      this.notifyListeners();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  // Create a new notification
  async createNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          type: notification.type,
          title: notification.title,
          message: notification.description,
          data: notification.actionData,
          station_id: notification.stationId,
        });

      if (error) {
        console.error('Error creating notification:', error);
      }

      // Reload notifications
      await this.loadNotifications();
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // Get notifications by type
  getNotificationsByType(type: Notification['type']): Notification[] {
    return this.notifications.filter(n => n.type === type);
  }

  // Get unread notifications
  getUnreadNotifications(): Notification[] {
    return this.notifications.filter(n => !n.isRead);
  }

  // Get high priority notifications
  getHighPriorityNotifications(): Notification[] {
    return this.notifications.filter(n => n.priority === 'high' && !n.isRead);
  }

  // Additional methods for notification hook
  getConfiguration(): any {
    return {
      enablePush: true,
      enableEmail: false,
      enableSms: false,
      quietHours: { start: '22:00', end: '08:00' }
    };
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return this.loadNotifications();
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notifications.filter(n => !n.isRead).length;
  }

  // markAllAsRead method already exists above

  async saveConfiguration(config: any): Promise<void> {
    // Save configuration (implement as needed)
    console.log('Saving notification configuration:', config);
  }

  async sendPushNotification(title: string, body: string, data?: any): Promise<void> {
    // Send push notification (implement as needed)
    console.log('Sending push notification:', { title, body, data });
  }

  addNotificationListener(callback: (notifications: Notification[]) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  async requestPermissions(): Promise<{ status: string; canAskAgain: boolean }> {
    // Request notification permissions (implement as needed)
    return { status: 'granted', canAskAgain: false };
  }

  async getPushToken(): Promise<string | null> {
    // Get push token (implement as needed)
    return 'mock-push-token';
  }

  async getBadgeCount(): Promise<number> {
    return this.notifications.filter(n => !n.isRead).length;
  }

  async setBadgeCount(count: number): Promise<void> {
    // Set badge count (implement as needed)
    console.log('Setting badge count:', count);
  }

  async clearBadge(): Promise<void> {
    // Clear badge (implement as needed)
    console.log('Clearing badge');
  }
}

export const notificationService = new NotificationService();

// Export additional types for the hook
export type NotificationData = Notification;
export type NotificationConfig = {
  enablePush: boolean;
  enableEmail: boolean;
  enableSms: boolean;
  quietHours: { start: string; end: string };
};