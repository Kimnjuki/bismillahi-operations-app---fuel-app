import { supabase } from '../config/supabase';

export type NotificationType = 
  | 'stock_alert' 
  | 'low_stock' 
  | 'payment_received' 
  | 'payment_due' 
  | 'fuel_delivery'
  | 'fuel_delivery_update'
  | 'expense_alert'
  | 'expense_approval'
  | 'user_action'
  | 'system_alert'
  | 'daily_report'
  | 'transfer_alert'
  | 'account_alert'
  | 'creditor_alert'
  | 'supplier_alert'
  | 'pump_alert'
  | 'tank_alert'
  | 'dipping_alert'
  | 'sales_milestone'
  | 'stock_reorder'
  | 'security_alert';

export type UserTargetRole = 'admin' | 'manager' | 'cashier' | 'viewer';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type ActionType = 'view_stock' | 'view_payment' | 'view_delivery' | 'navigate' 
  | 'view_expense' | 'view_report' | 'view_account' | 'view_transfer' 
  | 'view_pump' | 'view_tank' | 'approve' | 'review' | 'acknowledge';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  actionType?: ActionType;
  actionScreen?: string;
  actionData?: any;
  priority: NotificationPriority;
  stationId?: string;
  targetRoles?: UserTargetRole[];  // If empty/null, visible to all
  sourceUserName?: string;
  sourceUserRole?: UserTargetRole;
  category?: string;
  expiryDate?: string;
  requiresAcknowledgment?: boolean;
  isAcknowledged?: boolean;
  groupId?: string;
  metadata?: {
    amount?: number;
    volume?: number;
    fuelType?: string;
    percentage?: number;
    entityId?: string;
    entityName?: string;
  };
}

export interface NotificationCounts {
  total: number;
  unread: number;
  stockAlerts: number;
  payments: number;
  deliveries: number;
  expenses: number;
  critical: number;
  high: number;
}

export interface NotificationGroup {
  id: string;
  title: string;
  notifications: Notification[];
  count: number;
  latestTimestamp: string;
}

export type NotificationCategory = 
  | 'all' 
  | 'stock' 
  | 'sales_payments' 
  | 'fuel_delivery' 
  | 'expenses' 
  | 'system' 
  | 'accounts' 
  | 'pump_tank';

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
        console.warn('Notifications load skipped:', error.message || error);
        return [];
      }

      this.notifications = (data || []).map(this.mapDatabaseNotification);
      this.notifyListeners();
      return this.notifications;
    } catch (error) {
      console.warn('Notifications load skipped:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  // Map database notification to app notification
  private mapDatabaseNotification = (dbNotification: any): Notification => {
    return {
      id: dbNotification.id,
      type: dbNotification.type as Notification['type'],
      title: dbNotification.title,
      description: dbNotification.description || dbNotification.message || '',
      timestamp: dbNotification.created_at,
      isRead: dbNotification.is_read,
      actionType: this.getActionType(dbNotification.type),
      actionScreen: this.getActionScreen(dbNotification.type),
      actionData: dbNotification.data || null,
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

  // Get notification counts by category
  getNotificationCounts(): NotificationCounts {
    const total = this.notifications.length;
    const unread = this.notifications.filter(n => !n.isRead).length;
    const stockAlerts = this.notifications.filter(n => 
      n.type === 'stock_alert' || n.type === 'low_stock' || n.type === 'stock_reorder'
    ).length;
    const payments = this.notifications.filter(n => 
      n.type === 'payment_received' || n.type === 'payment_due'
    ).length;
    const deliveries = this.notifications.filter(n => 
      n.type === 'fuel_delivery' || n.type === 'fuel_delivery_update'
    ).length;
    const expenses = this.notifications.filter(n => 
      n.type === 'expense_alert' || n.type === 'expense_approval'
    ).length;
    const critical = this.notifications.filter(n => n.priority === 'critical' && !n.isRead).length;
    const high = this.notifications.filter(n => n.priority === 'high' && !n.isRead).length;

    return {
      total,
      unread,
      stockAlerts,
      payments,
      deliveries,
      expenses,
      critical,
      high,
    };
  }

  // Get notifications filtered by target role
  getNotificationsForRole(role: UserTargetRole, stationId?: string): Notification[] {
    return this.notifications.filter(notification => {
      // If no targetRoles specified, visible to all
      if (!notification.targetRoles || notification.targetRoles.length === 0) {
        return true;
      }
      // Check if user's role is in target roles
      if (!notification.targetRoles.includes(role)) {
        return false;
      }
      // Station-specific filtering
      if (notification.stationId && stationId && notification.stationId !== stationId) {
        return false;
      }
      return true;
    });
  }

  // Filter notifications by category
  filterByCategory(notifications: Notification[], category: NotificationCategory): Notification[] {
    if (category === 'all') return notifications;
    
    const categoryMap: Record<NotificationCategory, NotificationType[]> = {
      all: [],
      stock: ['stock_alert', 'low_stock', 'stock_reorder'],
      sales_payments: ['payment_received', 'payment_due', 'sales_milestone'],
      fuel_delivery: ['fuel_delivery', 'fuel_delivery_update'],
      expenses: ['expense_alert', 'expense_approval'],
      system: ['system_alert', 'user_action', 'security_alert', 'daily_report'],
      accounts: ['account_alert', 'creditor_alert', 'supplier_alert', 'transfer_alert'],
      pump_tank: ['pump_alert', 'tank_alert', 'dipping_alert'],
    };

    const allowedTypes = categoryMap[category];
    return notifications.filter(n => allowedTypes.includes(n.type));
  }

  // Group notifications by type category
  groupByCategory(notifications: Notification[]): NotificationGroup[] {
    const categoryMap: Record<string, { title: string; types: NotificationType[] }> = {
      stock: { title: 'Stock Alerts', types: ['stock_alert', 'low_stock', 'stock_reorder'] },
      payments: { title: 'Sales & Payments', types: ['payment_received', 'payment_due', 'sales_milestone'] },
      deliveries: { title: 'Fuel Deliveries', types: ['fuel_delivery', 'fuel_delivery_update'] },
      expenses: { title: 'Expenses', types: ['expense_alert', 'expense_approval'] },
      system: { title: 'System Updates', types: ['system_alert', 'user_action', 'security_alert', 'daily_report'] },
      accounts: { title: 'Accounts', types: ['account_alert', 'creditor_alert', 'supplier_alert', 'transfer_alert'] },
      pumps: { title: 'Pumps & Tanks', types: ['pump_alert', 'tank_alert', 'dipping_alert'] },
    };

    return Object.entries(categoryMap).map(([key, config]) => {
      const grouped = notifications.filter(n => config.types.includes(n.type));
      return {
        id: key,
        title: config.title,
        notifications: grouped,
        count: grouped.length,
        latestTimestamp: grouped.length > 0 
          ? grouped.reduce((latest, n) => n.timestamp > latest ? n.timestamp : latest, grouped[0].timestamp)
          : '',
      };
    }).filter(g => g.count > 0);
  }

  // Get notification priority color
  getPriorityColor(priority: NotificationPriority): string {
    switch (priority) {
      case 'critical': return '#FF1744';
      case 'high': return '#FF6B6B';
      case 'medium': return '#F0C38E';
      case 'low': return '#9E9E9E';
    }
  }

  // Acknowledge a notification (for those that require acknowledgment)
  async acknowledgeNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_acknowledged: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error acknowledging notification:', error);
      }

      this.notifications = this.notifications.map(n =>
        n.id === notificationId ? { ...n, isAcknowledged: true } : n
      );
      this.notifyListeners();
    } catch (error) {
      console.error('Error acknowledging notification:', error);
    }
  }

  // Get notifications that require acknowledgment
  getPendingAcknowledgments(): Notification[] {
    return this.notifications.filter(n => n.requiresAcknowledgment && !n.isAcknowledged);
  }

  // Get expired notifications
  getExpiredNotifications(): Notification[] {
    const now = new Date().toISOString();
    return this.notifications.filter(n => n.expiryDate && n.expiryDate < now);
  }

  // Mark expired notifications as read automatically
  async autoCleanExpired(): Promise<void> {
    const expired = this.getExpiredNotifications();
    for (const notification of expired) {
      await this.markAsRead(notification.id);
    }
  }

  // Get notification icon name by type
  getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case 'stock_alert':
      case 'low_stock':
      case 'stock_reorder':
        return 'cube-outline';
      case 'payment_received':
        return 'card-outline';
      case 'payment_due':
        return 'time-outline';
      case 'fuel_delivery':
      case 'fuel_delivery_update':
        return 'car-outline';
      case 'expense_alert':
      case 'expense_approval':
        return 'cash-outline';
      case 'user_action':
        return 'person-outline';
      case 'system_alert':
        return 'settings-outline';
      case 'daily_report':
        return 'document-text-outline';
      case 'transfer_alert':
        return 'swap-horizontal-outline';
      case 'account_alert':
        return 'wallet-outline';
      case 'creditor_alert':
        return 'trending-down-outline';
      case 'supplier_alert':
        return 'trending-up-outline';
      case 'pump_alert':
        return 'water-outline';
      case 'tank_alert':
      case 'dipping_alert':
        return 'server-outline';
      case 'sales_milestone':
        return 'trophy-outline';
      case 'security_alert':
        return 'shield-outline';
      default:
        return 'notifications-outline';
    }
  }

  // Get notification color by type
  getNotificationColor(type: NotificationType): string {
    switch (type) {
      case 'stock_alert':
      case 'low_stock':
      case 'stock_reorder':
        return '#F0C38E';
      case 'payment_received':
      case 'sales_milestone':
        return '#4CAF50';
      case 'payment_due':
        return '#FF6B6B';
      case 'fuel_delivery':
      case 'fuel_delivery_update':
        return '#2196F3';
      case 'expense_alert':
        return '#FF9800';
      case 'expense_approval':
        return '#9C27B0';
      case 'system_alert':
      case 'security_alert':
        return '#F44336';
      case 'daily_report':
        return '#00BCD4';
      case 'transfer_alert':
        return '#3F51B5';
      case 'account_alert':
        return '#8BC34A';
      case 'creditor_alert':
        return '#795548';
      case 'supplier_alert':
        return '#607D8B';
      case 'pump_alert':
        return '#03A9F4';
      case 'tank_alert':
      case 'dipping_alert':
        return '#E91E63';
      case 'user_action':
        return '#FF5722';
      default:
        return '#9E9E9E';
    }
  }

  // Get action button text by action type
  getActionButtonText(actionType?: ActionType): string {
    switch (actionType) {
      case 'view_stock': return 'View Stock';
      case 'view_payment': return 'View Payment';
      case 'view_delivery': return 'View Delivery';
      case 'view_expense': return 'View Expense';
      case 'view_report': return 'View Report';
      case 'view_account': return 'View Account';
      case 'view_transfer': return 'View Transfer';
      case 'view_pump': return 'View Pump';
      case 'view_tank': return 'View Tank';
      case 'approve': return 'Approve';
      case 'review': return 'Review';
      case 'acknowledge': return 'Acknowledge';
      default: return 'View';
    }
  }

  // Get action button icon by action type
  getActionButtonIcon(actionType?: ActionType): string {
    switch (actionType) {
      case 'view_stock': return 'list-outline';
      case 'view_payment': return 'card-outline';
      case 'view_delivery': return 'car-outline';
      case 'view_expense': return 'cash-outline';
      case 'view_report': return 'document-text-outline';
      case 'view_account': return 'wallet-outline';
      case 'view_transfer': return 'swap-horizontal-outline';
      case 'view_pump': return 'water-outline';
      case 'view_tank': return 'server-outline';
      case 'approve': return 'checkmark-circle-outline';
      case 'review': return 'eye-outline';
      case 'acknowledge': return 'hand-left-outline';
      default: return 'chevron-forward-outline';
    }
  }

  // Format notification timestamp
  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      if (diffInMinutes < 1) return 'Just now';
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks}w ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
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
          description: notification.description,
          data: notification.actionData,
          station_id: notification.stationId,
          priority: notification.priority || 'medium',
          user_id: null,
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

  async saveConfiguration(config: any): Promise<void> {
    console.log('Saving notification configuration:', config);
  }

  async sendPushNotification(title: string, body: string, data?: any): Promise<void> {
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
    return { status: 'granted', canAskAgain: false };
  }

  async getPushToken(): Promise<string | null> {
    return 'mock-push-token';
  }

  async getBadgeCount(): Promise<number> {
    return this.notifications.filter(n => !n.isRead).length;
  }

  async setBadgeCount(count: number): Promise<void> {
    console.log('Setting badge count:', count);
  }

  async clearBadge(): Promise<void> {
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