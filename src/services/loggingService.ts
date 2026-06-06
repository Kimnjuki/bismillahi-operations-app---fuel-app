import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { generateUUID } from '../utils/uuid';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  category: 'auth' | 'sales' | 'stock' | 'expense' | 'user' | 'system' | 'security' | 'performance';
  message: string;
  data?: any;
  userId?: string;
  sessionId: string;
  deviceInfo?: {
    platform: string;
    version: string;
    model?: string;
  };
  stackTrace?: string;
}

export interface AnalyticsEvent {
  id: string;
  timestamp: string;
  event: string;
  properties: Record<string, any>;
  userId?: string;
  sessionId: string;
  screen?: string;
  action?: string;
}

export interface PerformanceMetric {
  id: string;
  timestamp: string;
  metric: string;
  value: number;
  unit: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId: string;
}

export interface UserSession {
  id: string;
  startTime: string;
  endTime?: string;
  userId?: string;
  deviceInfo: {
    platform: string;
    version: string;
    model?: string;
  };
  events: AnalyticsEvent[];
  performanceMetrics: PerformanceMetric[];
  isActive: boolean;
}

class LoggingService {
  private readonly LOGS_KEY = 'app_logs';
  private readonly ANALYTICS_KEY = 'app_analytics';
  private readonly PERFORMANCE_KEY = 'app_performance';
  private readonly SESSION_KEY = 'current_session';
  private readonly MAX_LOCAL_LOGS = 1000;
  private readonly MAX_LOCAL_ANALYTICS = 500;
  private readonly MAX_LOCAL_PERFORMANCE = 200;

  private currentSession: UserSession | null = null;
  private logQueue: LogEntry[] = [];
  private analyticsQueue: AnalyticsEvent[] = [];
  private performanceQueue: PerformanceMetric[] = [];
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) return;

      // Load existing session or create new one
      await this.loadOrCreateSession();
      
      // Load queued data
      await this.loadQueuedData();
      
      // Start periodic sync
      this.startPeriodicSync();
      
      this.isInitialized = true;
      
      this.log('info', 'system', 'Logging service initialized successfully');
    } catch (error) {
      console.error('Logging service initialization error:', error);
    }
  }

  // Logging Methods
  async log(
    level: LogEntry['level'],
    category: LogEntry['category'],
    message: string,
    data?: any,
    userId?: string
  ): Promise<void> {
    try {
      const logEntry: LogEntry = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        level,
        category,
        message,
        data,
        userId,
        sessionId: this.currentSession?.id || 'unknown',
        deviceInfo: this.getDeviceInfo(),
        stackTrace: level === 'error' || level === 'fatal' ? this.getStackTrace() : undefined,
      };

      // Add to queue
      this.logQueue.push(logEntry);

      // Console logging for development
      if (__DEV__) {
        const consoleMethod = this.getConsoleMethod(level);
        consoleMethod(`[${category.toUpperCase()}] ${message}`, data || '');
      }

      // Save to local storage
      await this.saveLogsToStorage();

      // Auto-sync for critical logs
      if (level === 'error' || level === 'fatal') {
        await this.syncLogs();
      }
    } catch (error) {
      console.error('Log error:', error);
    }
  }

  async debug(category: LogEntry['category'], message: string, data?: any, userId?: string): Promise<void> {
    return this.log('debug', category, message, data, userId);
  }

  async info(category: LogEntry['category'], message: string, data?: any, userId?: string): Promise<void> {
    return this.log('info', category, message, data, userId);
  }

  async warn(category: LogEntry['category'], message: string, data?: any, userId?: string): Promise<void> {
    return this.log('warn', category, message, data, userId);
  }

  async error(category: LogEntry['category'], message: string, data?: any, userId?: string): Promise<void> {
    return this.log('error', category, message, data, userId);
  }

  async fatal(category: LogEntry['category'], message: string, data?: any, userId?: string): Promise<void> {
    return this.log('fatal', category, message, data, userId);
  }

  // Analytics Methods
  async trackEvent(
    event: string,
    properties: Record<string, any> = {},
    screen?: string,
    action?: string,
    userId?: string
  ): Promise<void> {
    try {
      const analyticsEvent: AnalyticsEvent = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        event,
        properties,
        userId,
        sessionId: this.currentSession?.id || 'unknown',
        screen,
        action,
      };

      // Add to queue
      this.analyticsQueue.push(analyticsEvent);

      // Add to current session
      if (this.currentSession) {
        this.currentSession.events.push(analyticsEvent);
      }

      // Save to local storage
      await this.saveAnalyticsToStorage();

      // Log the event
      await this.info('system', `Analytics event: ${event}`, { properties, screen, action }, userId);
    } catch (error) {
      console.error('Track event error:', error);
    }
  }

  async trackScreenView(screenName: string, userId?: string): Promise<void> {
    await this.trackEvent('screen_view', { screen_name: screenName }, screenName, 'view', userId);
  }

  async trackUserAction(action: string, screen: string, properties: Record<string, any> = {}, userId?: string): Promise<void> {
    await this.trackEvent('user_action', { action, ...properties }, screen, action, userId);
  }

  async trackBusinessEvent(
    event: 'sale_recorded' | 'expense_added' | 'stock_updated' | 'user_created' | 'report_generated',
    properties: Record<string, any> = {},
    userId?: string
  ): Promise<void> {
    await this.trackEvent(event, properties, undefined, event, userId);
  }

  // Performance Methods
  async trackPerformance(
    metric: string,
    value: number,
    unit: string = 'ms',
    context?: Record<string, any>,
    userId?: string
  ): Promise<void> {
    try {
      const performanceMetric: PerformanceMetric = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        metric,
        value,
        unit,
        context,
        userId,
        sessionId: this.currentSession?.id || 'unknown',
      };

      // Add to queue
      this.performanceQueue.push(performanceMetric);

      // Add to current session
      if (this.currentSession) {
        this.currentSession.performanceMetrics.push(performanceMetric);
      }

      // Save to local storage
      await this.savePerformanceToStorage();

      // Log performance issues
      if (value > this.getPerformanceThreshold(metric)) {
        await this.warn('performance', `Slow ${metric}: ${value}${unit}`, { metric, value, unit, context }, userId);
      }
    } catch (error) {
      console.error('Track performance error:', error);
    }
  }

  async trackApiCall(endpoint: string, method: string, duration: number, statusCode: number, userId?: string): Promise<void> {
    await this.trackPerformance('api_call', duration, 'ms', {
      endpoint,
      method,
      status_code: statusCode,
    }, userId);
  }

  async trackScreenLoad(screenName: string, loadTime: number, userId?: string): Promise<void> {
    await this.trackPerformance('screen_load', loadTime, 'ms', { screen_name: screenName }, userId);
  }

  async trackDatabaseQuery(query: string, duration: number, rowsAffected?: number, userId?: string): Promise<void> {
    await this.trackPerformance('database_query', duration, 'ms', {
      query: query.substring(0, 100), // Truncate long queries
      rows_affected: rowsAffected,
    }, userId);
  }

  // Session Management
  async startSession(userId?: string): Promise<void> {
    try {
      const sessionId = this.generateId();
      this.currentSession = {
        id: sessionId,
        startTime: new Date().toISOString(),
        userId,
        deviceInfo: this.getDeviceInfo(),
        events: [],
        performanceMetrics: [],
        isActive: true,
      };

      await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(this.currentSession));
      await this.info('system', 'User session started', { sessionId, userId });
    } catch (error) {
      console.error('Start session error:', error);
    }
  }

  async endSession(): Promise<void> {
    try {
      if (this.currentSession) {
        this.currentSession.endTime = new Date().toISOString();
        this.currentSession.isActive = false;

        await this.info('system', 'User session ended', {
          sessionId: this.currentSession.id,
          duration: this.getSessionDuration(),
          eventsCount: this.currentSession.events.length,
          performanceMetricsCount: this.currentSession.performanceMetrics.length,
        });

        // Sync session data
        await this.syncSessionData();

        // Clear current session
        await AsyncStorage.removeItem(this.SESSION_KEY);
        this.currentSession = null;
      }
    } catch (error) {
      console.error('End session error:', error);
    }
  }

  // Data Synchronization
  async syncAllData(): Promise<void> {
    try {
      await Promise.all([
        this.syncLogs(),
        this.syncAnalytics(),
        this.syncPerformance(),
      ]);
    } catch (error) {
      console.error('Sync all data error:', error);
    }
  }

  async syncLogs(): Promise<void> {
    try {
      if (this.logQueue.length === 0) return;

      // In a real implementation, you would send logs to your backend
      // For now, we'll just clear the queue after a successful sync
      this.logQueue = [];
      await this.saveLogsToStorage();
    } catch (error) {
      console.error('Sync logs error:', error);
    }
  }

  async syncAnalytics(): Promise<void> {
    try {
      if (this.analyticsQueue.length === 0) return;

      // In a real implementation, you would send analytics to your backend
      // For now, we'll just clear the queue after a successful sync
      this.analyticsQueue = [];
      await this.saveAnalyticsToStorage();
    } catch (error) {
      console.error('Sync analytics error:', error);
    }
  }

  async syncPerformance(): Promise<void> {
    try {
      if (this.performanceQueue.length === 0) return;

      // In a real implementation, you would send performance data to your backend
      // For now, we'll just clear the queue after a successful sync
      this.performanceQueue = [];
      await this.savePerformanceToStorage();
    } catch (error) {
      console.error('Sync performance error:', error);
    }
  }

  async syncSessionData(): Promise<void> {
    try {
      if (!this.currentSession) return;

      // In a real implementation, you would send session data to your backend
      console.log('Session data synced:', {
        sessionId: this.currentSession.id,
        duration: this.getSessionDuration(),
        eventsCount: this.currentSession.events.length,
        performanceMetricsCount: this.currentSession.performanceMetrics.length,
      });
    } catch (error) {
      console.error('Sync session data error:', error);
    }
  }

  // Data Retrieval
  async getLogs(limit: number = 100, category?: string): Promise<LogEntry[]> {
    try {
      const logs = await this.loadLogsFromStorage();
      let filteredLogs = logs;

      if (category) {
        filteredLogs = logs.filter(log => log.category === category);
      }

      return filteredLogs.slice(-limit).reverse();
    } catch (error) {
      console.error('Get logs error:', error);
      return [];
    }
  }

  async getAnalytics(limit: number = 100): Promise<AnalyticsEvent[]> {
    try {
      const analytics = await this.loadAnalyticsFromStorage();
      return analytics.slice(-limit).reverse();
    } catch (error) {
      console.error('Get analytics error:', error);
      return [];
    }
  }

  async getPerformanceMetrics(limit: number = 100): Promise<PerformanceMetric[]> {
    try {
      const metrics = await this.loadPerformanceFromStorage();
      return metrics.slice(-limit).reverse();
    } catch (error) {
      console.error('Get performance metrics error:', error);
      return [];
    }
  }

  async getSessionData(): Promise<UserSession | null> {
    return this.currentSession;
  }

  // Utility Methods
  private async loadOrCreateSession(): Promise<void> {
    try {
      const sessionData = await AsyncStorage.getItem(this.SESSION_KEY);
      if (sessionData) {
        this.currentSession = JSON.parse(sessionData);
      } else {
        await this.startSession();
      }
    } catch (error) {
      console.error('Load or create session error:', error);
      await this.startSession();
    }
  }

  private async loadQueuedData(): Promise<void> {
    try {
      const [logs, analytics, performance] = await Promise.all([
        this.loadLogsFromStorage(),
        this.loadAnalyticsFromStorage(),
        this.loadPerformanceFromStorage(),
      ]);

      this.logQueue = logs;
      this.analyticsQueue = analytics;
      this.performanceQueue = performance;
    } catch (error) {
      console.error('Load queued data error:', error);
    }
  }

  private async loadLogsFromStorage(): Promise<LogEntry[]> {
    try {
      const logsData = await AsyncStorage.getItem(this.LOGS_KEY);
      return logsData ? JSON.parse(logsData) : [];
    } catch (error) {
      console.error('Load logs from storage error:', error);
      return [];
    }
  }

  private async loadAnalyticsFromStorage(): Promise<AnalyticsEvent[]> {
    try {
      const analyticsData = await AsyncStorage.getItem(this.ANALYTICS_KEY);
      return analyticsData ? JSON.parse(analyticsData) : [];
    } catch (error) {
      console.error('Load analytics from storage error:', error);
      return [];
    }
  }

  private async loadPerformanceFromStorage(): Promise<PerformanceMetric[]> {
    try {
      const performanceData = await AsyncStorage.getItem(this.PERFORMANCE_KEY);
      return performanceData ? JSON.parse(performanceData) : [];
    } catch (error) {
      console.error('Load performance from storage error:', error);
      return [];
    }
  }

  private async saveLogsToStorage(): Promise<void> {
    try {
      const logsToSave = this.logQueue.slice(-this.MAX_LOCAL_LOGS);
      await AsyncStorage.setItem(this.LOGS_KEY, JSON.stringify(logsToSave));
    } catch (error) {
      console.error('Save logs to storage error:', error);
    }
  }

  private async saveAnalyticsToStorage(): Promise<void> {
    try {
      const analyticsToSave = this.analyticsQueue.slice(-this.MAX_LOCAL_ANALYTICS);
      await AsyncStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(analyticsToSave));
    } catch (error) {
      console.error('Save analytics to storage error:', error);
    }
  }

  private async savePerformanceToStorage(): Promise<void> {
    try {
      const performanceToSave = this.performanceQueue.slice(-this.MAX_LOCAL_PERFORMANCE);
      await AsyncStorage.setItem(this.PERFORMANCE_KEY, JSON.stringify(performanceToSave));
    } catch (error) {
      console.error('Save performance to storage error:', error);
    }
  }

  private startPeriodicSync(): void {
    // Sync every 5 minutes
    setInterval(() => {
      this.syncAllData();
    }, 5 * 60 * 1000);
  }

  private generateId(): string {
    return generateUUID();
  }

  private getDeviceInfo() {
    return {
      platform: 'React Native',
      version: '1.0.0', // You can get this from package.json or device info
      model: 'Unknown', // You can get this from device info
    };
  }

  private getStackTrace(): string {
    const stack = new Error().stack;
    return stack ? stack.split('\n').slice(2).join('\n') : '';
  }

  private getConsoleMethod(level: LogEntry['level']) {
    const methods = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
      fatal: console.error,
    };
    return methods[level] || console.log;
  }

  private getPerformanceThreshold(metric: string): number {
    const thresholds: Record<string, number> = {
      api_call: 5000, // 5 seconds
      screen_load: 3000, // 3 seconds
      database_query: 2000, // 2 seconds
    };
    return thresholds[metric] || 1000; // Default 1 second
  }

  private getSessionDuration(): number {
    if (!this.currentSession) return 0;
    const start = new Date(this.currentSession.startTime).getTime();
    const end = this.currentSession.endTime 
      ? new Date(this.currentSession.endTime).getTime()
      : Date.now();
    return end - start;
  }

  // Cleanup Methods
  async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.LOGS_KEY),
        AsyncStorage.removeItem(this.ANALYTICS_KEY),
        AsyncStorage.removeItem(this.PERFORMANCE_KEY),
        AsyncStorage.removeItem(this.SESSION_KEY),
      ]);

      this.logQueue = [];
      this.analyticsQueue = [];
      this.performanceQueue = [];
      this.currentSession = null;

      await this.info('system', 'All logging data cleared');
    } catch (error) {
      console.error('Clear all data error:', error);
    }
  }

  async exportData(): Promise<{
    logs: LogEntry[];
    analytics: AnalyticsEvent[];
    performance: PerformanceMetric[];
    session: UserSession | null;
  }> {
    try {
      return {
        logs: await this.getLogs(1000),
        analytics: await this.getAnalytics(1000),
        performance: await this.getPerformanceMetrics(1000),
        session: await this.getSessionData(),
      };
    } catch (error) {
      console.error('Export data error:', error);
      return {
        logs: [],
        analytics: [],
        performance: [],
        session: null,
      };
    }
  }
}

export const loggingService = new LoggingService();
