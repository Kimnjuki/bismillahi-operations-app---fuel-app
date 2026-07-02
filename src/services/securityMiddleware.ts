import { securityService } from './securityService';
import { inputValidationService } from './inputValidationService';
import { supabase } from '../config/supabase';

// API request interface
interface ApiRequest {
  method: string;
  url: string;
  data?: any;
  headers?: Record<string, string>;
  userId?: string;
}

// API response interface
interface ApiResponse {
  data: any;
  error: any;
  status: number;
}

// Security middleware class
class SecurityMiddleware {
  // Intercept and validate API requests
  async interceptRequest(request: ApiRequest): Promise<{ allowed: boolean; error?: string; sanitizedData?: any }> {
    try {
      // Check if user is authenticated
      if (request.userId) {
        const sessionValid = await securityService.validateSession(request.userId);
        if (!sessionValid) {
          await securityService.logSecurityEvent({
            eventType: 'SECURITY_VIOLATION',
            description: 'Invalid session attempt',
            severity: 'HIGH',
            metadata: { userId: request.userId, url: request.url },
          });
          return { allowed: false, error: 'Session expired' };
        }
      }

      // Validate request data for security threats
      if (request.data) {
        const sanitizedData = await this.sanitizeRequestData(request.data);
        const securityCheck = this.checkRequestSecurity(request, sanitizedData);
        
        if (!securityCheck.safe) {
          await securityService.logSecurityEvent({
            eventType: 'SECURITY_VIOLATION',
            description: `Security threat detected: ${securityCheck.threats.join(', ')}`,
            severity: 'CRITICAL',
            metadata: { 
              userId: request.userId, 
              url: request.url, 
              threats: securityCheck.threats 
            },
          });
          return { allowed: false, error: 'Security threat detected' };
        }

        return { allowed: true, sanitizedData };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Security middleware error:', error);
      return { allowed: false, error: 'Security validation failed' };
    }
  }

  // Intercept and validate API responses
  async interceptResponse(response: ApiResponse, request: ApiRequest): Promise<ApiResponse> {
    try {
      // Non-blocking logging - don't await these to avoid startup delays
      // Only log security violations (failed calls), skip routine success logging
      if (response.status >= 400) {
        securityService.logSecurityEvent({
          eventType: 'SECURITY_VIOLATION',
          description: `API call failed: ${request.method} ${request.url}`,
          severity: response.status >= 500 ? 'HIGH' : 'MEDIUM',
          metadata: { 
            userId: request.userId, 
            method: request.method, 
            url: request.url,
            status: response.status,
            error: response.error 
          },
        }).catch(() => {}); // Fire and forget - don't block UI
      }

      return response;
    } catch (error) {
      console.error('Response interception error:', error);
      return response;
    }
  }

  // Sanitize request data
  private async sanitizeRequestData(data: any): Promise<any> {
    if (typeof data === 'string') {
      return securityService.sanitizeInput(data, 'text');
    }

    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this.sanitizeRequestData(item)));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = await this.sanitizeRequestData(value);
      }
      return sanitized;
    }

    return data;
  }

  // Check request for security threats
  private checkRequestSecurity(request: ApiRequest, data: any): { safe: boolean; threats: string[] } {
    const threats: string[] = [];

    // Check URL for suspicious patterns
    if (this.isSuspiciousUrl(request.url)) {
      threats.push('Suspicious URL pattern');
    }

    // Check data for security threats
    if (data) {
      const dataString = JSON.stringify(data);
      const securityCheck = inputValidationService.validateSecurity(dataString);
      if (!securityCheck.safe) {
        threats.push(...securityCheck.threats);
      }
    }

    // Check for suspicious request patterns
    if (this.isSuspiciousRequest(request)) {
      threats.push('Suspicious request pattern');
    }

    return {
      safe: threats.length === 0,
      threats,
    };
  }

  // Check if URL is suspicious
  private isSuspiciousUrl(url: string): boolean {
    const suspiciousPatterns = [
      /\.\.\//, // Path traversal
      /<script/i, // XSS
      /javascript:/i, // JavaScript injection
      /data:/i, // Data URI
      /vbscript:/i, // VBScript injection
      /onload=/i, // Event handler injection
      /onerror=/i, // Event handler injection
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  // Check if request is suspicious
  private isSuspiciousRequest(request: ApiRequest): boolean {
    // Check for unusual request patterns
    if (request.method === 'DELETE' && !request.url.includes('/delete')) {
      return true;
    }

    if (request.method === 'PUT' && !request.url.includes('/update')) {
      return true;
    }

    // Check for excessive data size
    if (request.data && JSON.stringify(request.data).length > 1000000) { // 1MB
      return true;
    }

    return false;
  }

  // Validate user permissions for API endpoint
  async validatePermissions(userId: string, endpoint: string, method: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Get user data
      const { data: user, error } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return { allowed: false, reason: 'User not found' };
      }

      if (!user.is_active) {
        return { allowed: false, reason: 'User account is inactive' };
      }

      // Check role-based permissions
      const permissions = this.getEndpointPermissions(endpoint, method);
      if (!permissions.includes(user.role)) {
        await securityService.logSecurityEvent({
          eventType: 'PERMISSION_DENIED',
          description: `Access denied to ${method} ${endpoint}`,
          severity: 'MEDIUM',
          metadata: { userId, endpoint, method, userRole: user.role },
        });
        return { allowed: false, reason: 'Insufficient permissions' };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Permission validation error:', error);
      return { allowed: false, reason: 'Permission validation failed' };
    }
  }

  // Get required permissions for endpoint
  private getEndpointPermissions(endpoint: string, method: string): string[] {
    const permissions: Record<string, string[]> = {
      // User management endpoints
      'users': method === 'GET' ? ['admin', 'manager'] : ['admin'],
      'users/create': ['admin'],
      'users/update': ['admin'],
      'users/delete': ['admin'],

      // Sales endpoints
      'pump_sales': ['admin', 'manager', 'cashier'],

      // Stock endpoints
      'stock_items': method === 'GET' ? ['admin', 'manager', 'cashier', 'viewer'] : ['admin', 'manager'],
      'stock_variances': ['admin', 'manager', 'cashier'],

      // Expense endpoints
      'expenses': method === 'GET' ? ['admin', 'manager', 'cashier', 'viewer'] : ['admin', 'manager', 'cashier'],

      // Reports endpoints
      'reports': ['admin', 'manager', 'viewer'],

      // Settings endpoints
      'settings': ['admin'],

      // Notifications endpoints
      'notifications': ['admin', 'manager', 'cashier', 'viewer'],
    };

    return permissions[endpoint] || ['admin'];
  }

  // Rate limiting
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();

  async checkRateLimit(userId: string, endpoint: string): Promise<{ allowed: boolean; resetTime?: number }> {
    const key = `${userId}:${endpoint}`;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100; // Max requests per minute

    const current = this.rateLimitMap.get(key);

    if (!current || now > current.resetTime) {
      // Reset or create new entry
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { allowed: true };
    }

    if (current.count >= maxRequests) {
      await securityService.logSecurityEvent({
        eventType: 'SECURITY_VIOLATION',
        description: 'Rate limit exceeded',
        severity: 'MEDIUM',
        metadata: { userId, endpoint, count: current.count },
      });
      return { 
        allowed: false, 
        resetTime: current.resetTime 
      };
    }

    current.count++;
    return { allowed: true };
  }

  // Cleanup expired rate limit entries
  cleanupRateLimit(): void {
    const now = Date.now();
    for (const [key, value] of this.rateLimitMap.entries()) {
      if (now > value.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware();

// Export types
export type { ApiRequest, ApiResponse };

