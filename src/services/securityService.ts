import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { User } from '../types';
import { generateSecurityId } from '../utils/uuid';

// Security configuration
interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
  sessionTimeout: number; // in minutes
  passwordMinLength: number;
  requireStrongPassword: boolean;
  enableBiometric: boolean;
  enablePin: boolean;
  enableTwoFactor: boolean;
  maxFileSize: number; // in bytes
  allowedFileTypes: string[];
  enableAuditLog: boolean;
}

// Default security configuration
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  sessionTimeout: 480, // 8 hours
  passwordMinLength: 8,
  requireStrongPassword: true,
  enableBiometric: false,
  enablePin: false,
  enableTwoFactor: false,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
  enableAuditLog: true,
};

// Security events
export interface SecurityEvent {
  id: string;
  userId?: string;
  eventType: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE' | 'PERMISSION_DENIED' | 'DATA_ACCESS' | 'DATA_MODIFY' | 'SECURITY_VIOLATION' | 'SECURITY_TEST' | 'SECURITY_CHECK' | 'SECURITY_ISSUE_REPORTED';
  description: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: any;
}

// Login attempt tracking
interface LoginAttempt {
  email: string;
  attempts: number;
  lastAttempt: number;
  lockedUntil?: number;
}

class SecurityService {
  private config: SecurityConfig = DEFAULT_SECURITY_CONFIG;
  private loginAttempts: Map<string, LoginAttempt> = new Map();
  private activeSessions: Map<string, number> = new Map();

  constructor() {
    this.loadSecurityConfig();
    this.cleanupExpiredSessions();
  }

  // Load security configuration
  private async loadSecurityConfig(): Promise<void> {
    try {
      const config = await AsyncStorage.getItem('@bismillahi_security_config');
      if (config) {
        this.config = { ...DEFAULT_SECURITY_CONFIG, ...JSON.parse(config) };
      }
    } catch (error) {
      console.error('Error loading security config:', error);
    }
  }

  // Save security configuration
  async saveSecurityConfig(config: Partial<SecurityConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await AsyncStorage.setItem('@bismillahi_security_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving security config:', error);
    }
  }

  // Get current security configuration
  getSecurityConfig(): SecurityConfig {
    return { ...this.config };
  }

  // Validate password strength
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.config.passwordMinLength) {
      errors.push(`Password must be at least ${this.config.passwordMinLength} characters long`);
    }

    if (this.config.requireStrongPassword) {
      if (!/(?=.*[a-z])/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      if (!/(?=.*[A-Z])/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      if (!/(?=.*\d)/.test(password)) {
        errors.push('Password must contain at least one number');
      }
      if (!/(?=.*[@$!%*?&])/.test(password)) {
        errors.push('Password must contain at least one special character (@$!%*?&)');
      }
    }

    // Check for common passwords
    const commonPasswords = ['password', '123456', 'admin', 'qwerty', 'letmein'];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common, please choose a stronger password');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Check login attempts and lockout
  async checkLoginAttempts(email: string): Promise<{ allowed: boolean; remainingAttempts: number; lockoutTime?: number }> {
    const attempt = this.loginAttempts.get(email);
    const now = Date.now();

    if (!attempt) {
      return { allowed: true, remainingAttempts: this.config.maxLoginAttempts };
    }

    // Check if account is locked
    if (attempt.lockedUntil && now < attempt.lockedUntil) {
      const lockoutTime = Math.ceil((attempt.lockedUntil - now) / 60000); // Convert to minutes
      return { allowed: false, remainingAttempts: 0, lockoutTime };
    }

    // Reset attempts if lockout period has passed
    if (attempt.lockedUntil && now >= attempt.lockedUntil) {
      this.loginAttempts.delete(email);
      return { allowed: true, remainingAttempts: this.config.maxLoginAttempts };
    }

    const remainingAttempts = this.config.maxLoginAttempts - attempt.attempts;
    return { allowed: attempt.attempts < this.config.maxLoginAttempts, remainingAttempts };
  }

  // Record failed login attempt
  async recordFailedLogin(email: string): Promise<void> {
    const attempt = this.loginAttempts.get(email) || {
      email,
      attempts: 0,
      lastAttempt: Date.now(),
    };

    attempt.attempts += 1;
    attempt.lastAttempt = Date.now();

    // Lock account if max attempts reached
    if (attempt.attempts >= this.config.maxLoginAttempts) {
      attempt.lockedUntil = Date.now() + (this.config.lockoutDuration * 60 * 1000);
      await this.logSecurityEvent({
        eventType: 'SECURITY_VIOLATION',
        description: `Account locked due to ${this.config.maxLoginAttempts} failed login attempts`,
        severity: 'HIGH',
        metadata: { email, attempts: attempt.attempts },
      });
    }

    this.loginAttempts.set(email, attempt);
  }

  // Record successful login
  async recordSuccessfulLogin(email: string): Promise<void> {
    this.loginAttempts.delete(email);
    await this.logSecurityEvent({
      eventType: 'LOGIN',
      description: 'Successful login',
      severity: 'LOW',
      metadata: { email },
    });
  }

  // Validate session
  async validateSession(userId: string): Promise<boolean> {
    const sessionTime = this.activeSessions.get(userId);
    if (!sessionTime) {
      return false;
    }

    const now = Date.now();
    const sessionAge = (now - sessionTime) / (1000 * 60); // Convert to minutes

    if (sessionAge > this.config.sessionTimeout) {
      this.activeSessions.delete(userId);
      await this.logSecurityEvent({
        eventType: 'LOGOUT',
        description: 'Session expired',
        severity: 'LOW',
        metadata: { userId, sessionAge },
      });
      return false;
    }

    return true;
  }

  // Create session
  async createSession(userId: string): Promise<void> {
    this.activeSessions.set(userId, Date.now());
  }

  // Destroy session
  async destroySession(userId: string): Promise<void> {
    this.activeSessions.delete(userId);
    await this.logSecurityEvent({
      eventType: 'LOGOUT',
      description: 'User logged out',
      severity: 'LOW',
      metadata: { userId },
    });
  }

  // Cleanup expired sessions
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const timeoutMs = this.config.sessionTimeout * 60 * 1000;

    for (const [userId, sessionTime] of this.activeSessions.entries()) {
      if (now - sessionTime > timeoutMs) {
        this.activeSessions.delete(userId);
      }
    }
  }

  // Log security event
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    if (!this.config.enableAuditLog) {
      return;
    }

    try {
      const securityEvent: SecurityEvent = {
        ...event,
        id: generateSecurityId(),
        timestamp: new Date().toISOString(),
      };

      // Store in local storage for offline access
      const events = await this.getSecurityEvents();
      events.push(securityEvent);
      await AsyncStorage.setItem('@bismillahi_security_events', JSON.stringify(events.slice(-1000))); // Keep last 1000 events

      // Send to server if online
      if (await this.isOnline()) {
        await this.sendSecurityEventToServer(securityEvent);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  // Get security events
  async getSecurityEvents(limit: number = 100): Promise<SecurityEvent[]> {
    try {
      const events = await AsyncStorage.getItem('@bismillahi_security_events');
      if (events) {
        const parsedEvents = JSON.parse(events);
        return parsedEvents.slice(-limit);
      }
    } catch (error) {
      console.error('Error getting security events:', error);
    }
    return [];
  }

  // Send security event to server
  private async sendSecurityEventToServer(event: SecurityEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_events')
        .insert([{
          id: event.id,
          user_id: event.userId,
          event_type: event.eventType,
          description: event.description,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          timestamp: event.timestamp,
          severity: event.severity,
          event_data: event.metadata, // DB uses event_data not metadata
        }]);

      if (error) {
        console.error('Error sending security event to server:', error);
      }
    } catch (error) {
      console.error('Error sending security event to server:', error);
    }
  }

  // Check if online
  private async isOnline(): Promise<boolean> {
    try {
      const NetInfo = require('@react-native-community/netinfo');
      const netInfo = await NetInfo.fetch();
      return netInfo.isConnected ?? false;
    } catch (error) {
      return false;
    }
  }

  // Validate file upload
  validateFileUpload(file: { name: string; size: number; type: string }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check file size
    if (file.size > this.config.maxFileSize) {
      errors.push(`File size must be less than ${this.config.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !this.config.allowedFileTypes.includes(fileExtension)) {
      errors.push(`File type not allowed. Allowed types: ${this.config.allowedFileTypes.join(', ')}`);
    }

    // Check for malicious file names
    const maliciousPatterns = ['../', '..\\', '<script', 'javascript:', 'data:'];
    if (maliciousPatterns.some(pattern => file.name.toLowerCase().includes(pattern))) {
      errors.push('File name contains potentially malicious content');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Sanitize input
  sanitizeInput(input: string, type: 'text' | 'html' | 'sql' | 'url'): string {
    switch (type) {
      case 'text':
        return input
          .replace(/[<>]/g, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '')
          .trim();

      case 'html':
        return input
          .replace(/<[^>]*>/g, '')
          .replace(/[<>]/g, '')
          .trim();

      case 'sql':
        return input
          .replace(/['"]/g, '')
          .replace(/[;]/g, '')
          .replace(/--/g, '')
          .replace(/\/\*/g, '')
          .replace(/\*\//g, '')
          .trim();

      case 'url':
        return input
          .replace(/javascript:/gi, '')
          .replace(/data:/gi, '')
          .replace(/vbscript:/gi, '')
          .trim();

      default:
        return input.trim();
    }
  }

  // Generate secure random string
  generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Hash sensitive data (simple hash for demo - use proper crypto in production)
  hashSensitiveData(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Check for suspicious activity
  async checkSuspiciousActivity(userId: string, action: string): Promise<{ suspicious: boolean; reason?: string }> {
    try {
      const events = await this.getSecurityEvents(100);
      const userEvents = events.filter(event => event.userId === userId);
      const recentEvents = userEvents.filter(event => {
        const eventTime = new Date(event.timestamp).getTime();
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        return eventTime > oneHourAgo;
      });

      // Check for rapid successive actions
      if (recentEvents.length > 50) {
        return {
          suspicious: true,
          reason: 'Too many actions in a short time period',
        };
      }

      // Check for repeated failed attempts
      const failedAttempts = recentEvents.filter(event => event.eventType === 'LOGIN_FAILED');
      if (failedAttempts.length > 10) {
        return {
          suspicious: true,
          reason: 'Multiple failed login attempts',
        };
      }

      // Check for permission violations
      const permissionViolations = recentEvents.filter(event => event.eventType === 'PERMISSION_DENIED');
      if (permissionViolations.length > 5) {
        return {
          suspicious: true,
          reason: 'Multiple permission violations',
        };
      }

      return { suspicious: false };
    } catch (error) {
      console.error('Error checking suspicious activity:', error);
      return { suspicious: false };
    }
  }

  // Get security statistics
  async getSecurityStatistics(): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentViolations: number;
    activeSessions: number;
  }> {
    try {
      const events = await this.getSecurityEvents(1000);
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

      const eventsByType = events.reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const eventsBySeverity = events.reduce((acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const recentViolations = events.filter(event => {
        const eventTime = new Date(event.timestamp).getTime();
        return eventTime > oneDayAgo && event.severity === 'HIGH';
      }).length;

      return {
        totalEvents: events.length,
        eventsByType,
        eventsBySeverity,
        recentViolations,
        activeSessions: this.activeSessions.size,
      };
    } catch (error) {
      console.error('Error getting security statistics:', error);
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        recentViolations: 0,
        activeSessions: 0,
      };
    }
  }

  // Perform security check
  async performSecurityCheck(data: any): Promise<{ isSecure: boolean; issues: string[] }> {
    try {
      const issues: string[] = [];

      // Check for common security issues
      if (data && typeof data === 'object') {
        // Check for SQL injection patterns
        const sqlPatterns = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'SELECT', 'UNION', '--', '/*', '*/'];
        const dataString = JSON.stringify(data).toUpperCase();
        
        for (const pattern of sqlPatterns) {
          if (dataString.includes(pattern)) {
            issues.push(`Potential SQL injection pattern detected: ${pattern}`);
          }
        }

        // Check for XSS patterns
        const xssPatterns = ['<script', 'javascript:', 'onload=', 'onerror='];
        for (const pattern of xssPatterns) {
          if (dataString.includes(pattern)) {
            issues.push(`Potential XSS pattern detected: ${pattern}`);
          }
        }
      }

      return {
        isSecure: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Security check error:', error);
      return {
        isSecure: false,
        issues: ['Security check failed']
      };
    }
  }

  // Additional methods for security components
  async getSecuritySettings(): Promise<any> {
    try {
      // Return default security settings
      return {
        sessionTimeout: 30, // minutes
        maxLoginAttempts: 5,
        enableAuditLog: true,
        requireStrongPasswords: true
      };
    } catch (error) {
      console.error('Error getting security settings:', error);
      return {};
    }
  }

  async saveSecuritySettings(settings: any): Promise<void> {
    try {
      // Save security settings (implement as needed)
      console.log('Saving security settings:', settings);
    } catch (error) {
      console.error('Error saving security settings:', error);
    }
  }

  async validatePermissions(role: string, resource: string, action: string): Promise<boolean> {
    try {
      // Simple permission validation
      const permissions: { [key: string]: { [key: string]: string[] } } = {
        admin: {
          users: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
          sales: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
          reports: ['CREATE', 'READ', 'UPDATE', 'DELETE']
        },
        manager: {
          users: ['READ', 'UPDATE'],
          sales: ['CREATE', 'READ', 'UPDATE'],
          reports: ['READ']
        },
        cashier: {
          sales: ['CREATE', 'READ'],
          reports: ['READ']
        },
        viewer: {
          sales: ['READ'],
          reports: ['READ']
        }
      };

      return permissions[role]?.[resource]?.includes(action) || false;
    } catch (error) {
      console.error('Error validating permissions:', error);
      return false;
    }
  }

  async getSessionTimeout(): Promise<number> {
    return 30; // 30 minutes
  }

  async encryptData(data: string): Promise<string> {
    try {
      // Simple base64 encoding (in production, use proper encryption)
      return btoa(data);
    } catch (error) {
      console.error('Error encrypting data:', error);
      return data;
    }
  }

  async decryptData(encryptedData: string): Promise<string> {
    try {
      // Simple base64 decoding (in production, use proper decryption)
      return atob(encryptedData);
    } catch (error) {
      console.error('Error decrypting data:', error);
      return encryptedData;
    }
  }

  async checkRateLimit(userId: string, endpoint: string): Promise<boolean> {
    try {
      // Simple rate limiting (implement proper rate limiting as needed)
      return true;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return false;
    }
  }
}

// Export singleton instance
export const securityService = new SecurityService();

// Export types
// Types already exported above

