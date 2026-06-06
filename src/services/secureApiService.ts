import { supabase } from '../config/supabase';
import { securityMiddleware, ApiRequest, ApiResponse } from './securityMiddleware';
import { securityService } from './securityService';

// Secure API service class
class SecureApiService {
  // Make secure API request
  async makeRequest<T = any>(request: ApiRequest): Promise<{ data: T | null; error: string | null }> {
    try {
      // Check rate limiting
      if (request.userId) {
        const rateLimitCheck = await securityMiddleware.checkRateLimit(request.userId, request.url);
        if (!rateLimitCheck.allowed) {
          return {
            data: null,
            error: `Rate limit exceeded. Try again in ${Math.ceil((rateLimitCheck.resetTime! - Date.now()) / 1000)} seconds`,
          };
        }
      }

      // Validate permissions
      if (request.userId) {
        const permissionCheck = await securityMiddleware.validatePermissions(
          request.userId,
          request.url,
          request.method
        );
        if (!permissionCheck.allowed) {
          return {
            data: null,
            error: permissionCheck.reason || 'Access denied',
          };
        }
      }

      // Intercept and validate request
      const requestCheck = await securityMiddleware.interceptRequest(request);
      if (!requestCheck.allowed) {
        return {
          data: null,
          error: requestCheck.error || 'Request blocked by security',
        };
      }

      // Make the actual API call
      const response = await this.executeRequest(request, requestCheck.sanitizedData);

      // Intercept and validate response
      const validatedResponse = await securityMiddleware.interceptResponse(response, request);

      return {
        data: validatedResponse.data,
        error: validatedResponse.error,
      };
    } catch (error) {
      console.error('Secure API request error:', error);
      
      // Log security event for unexpected errors
      await securityService.logSecurityEvent({
        eventType: 'SECURITY_VIOLATION',
        description: 'Unexpected API error',
        severity: 'HIGH',
        metadata: { 
          userId: request.userId, 
          url: request.url, 
          method: request.method,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
      });

      return {
        data: null,
        error: 'An unexpected error occurred',
      };
    }
  }

  // Execute the actual request
  private async executeRequest(request: ApiRequest, sanitizedData?: any): Promise<ApiResponse> {
    const { method, url, data, headers = {} } = request;
    const requestData = sanitizedData || data;

    try {
      let response: any;

      switch (method.toUpperCase()) {
        case 'GET':
          response = await supabase.from(url).select('*');
          break;

        case 'POST':
          response = await supabase.from(url).insert(requestData);
          break;

        case 'PUT':
          response = await supabase.from(url).update(requestData);
          break;

        case 'DELETE':
          response = await supabase.from(url).delete();
          break;

        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      return {
        data: response.data,
        error: response.error,
        status: response.status || (response.error ? 400 : 200),
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Request failed',
        status: 500,
      };
    }
  }

  // Secure data fetching methods
  async getPumpSales(userId: string, filters?: any): Promise<{ data: any[] | null; error: string | null }> {
    return this.makeRequest({
      method: 'GET',
      url: 'pump_sales',
      userId,
      data: filters,
    });
  }

  async createPumpSale(userId: string, saleData: any): Promise<{ data: any | null; error: string | null }> {
    return this.makeRequest({
      method: 'POST',
      url: 'pump_sales',
      userId,
      data: saleData,
    });
  }

  async getDrumSales(userId: string, filters?: any): Promise<{ data: any[] | null; error: string | null }> {
    return this.makeRequest({
      method: 'GET',
      url: 'drum_sales',
      userId,
      data: filters,
    });
  }

  async createDrumSale(userId: string, saleData: any): Promise<{ data: any | null; error: string | null }> {
    return this.makeRequest({
      method: 'POST',
      url: 'drum_sales',
      userId,
      data: saleData,
    });
  }

  async getStockItems(userId: string): Promise<{ data: any[] | null; error: string | null }> {
    return this.makeRequest({
      method: 'GET',
      url: 'stock_items',
      userId,
    });
  }

  async updateStockItem(userId: string, itemId: string, updateData: any): Promise<{ data: any | null; error: string | null }> {
    return this.makeRequest({
      method: 'PUT',
      url: 'stock_items',
      userId,
      data: { id: itemId, ...updateData },
    });
  }

  async getExpenses(userId: string, filters?: any): Promise<{ data: any[] | null; error: string | null }> {
    return this.makeRequest({
      method: 'GET',
      url: 'expenses',
      userId,
      data: filters,
    });
  }

  async createExpense(userId: string, expenseData: any): Promise<{ data: any | null; error: string | null }> {
    return this.makeRequest({
      method: 'POST',
      url: 'expenses',
      userId,
      data: expenseData,
    });
  }

  async getUsers(userId: string): Promise<{ data: any[] | null; error: string | null }> {
    return this.makeRequest({
      method: 'GET',
      url: 'users',
      userId,
    });
  }

  async createUser(userId: string, userData: any): Promise<{ data: any | null; error: string | null }> {
    return this.makeRequest({
      method: 'POST',
      url: 'users/create',
      userId,
      data: userData,
    });
  }

  async updateUser(userId: string, targetUserId: string, updateData: any): Promise<{ data: any | null; error: string | null }> {
    return this.makeRequest({
      method: 'PUT',
      url: 'users/update',
      userId,
      data: { id: targetUserId, ...updateData },
    });
  }

  async deleteUser(userId: string, targetUserId: string): Promise<{ data: any | null; error: string | null }> {
    return this.makeRequest({
      method: 'DELETE',
      url: 'users/delete',
      userId,
      data: { id: targetUserId },
    });
  }

  async getReports(userId: string, reportType: string, filters?: any): Promise<{ data: any | null; error: string | null }> {
    return this.makeRequest({
      method: 'GET',
      url: 'reports',
      userId,
      data: { type: reportType, ...filters },
    });
  }

  async getNotifications(userId: string): Promise<{ data: any[] | null; error: string | null }> {
    return this.makeRequest({
      method: 'GET',
      url: 'notifications',
      userId,
    });
  }

  async markNotificationAsRead(userId: string, notificationId: string): Promise<{ data: any | null; error: string | null }> {
    return this.makeRequest({
      method: 'PUT',
      url: 'notifications',
      userId,
      data: { id: notificationId, is_read: true },
    });
  }

  // Security audit methods
  async getSecurityEvents(userId: string, filters?: any): Promise<{ data: any[] | null; error: string | null }> {
    // Only admins can access security events
    const permissionCheck = await securityMiddleware.validatePermissions(userId, 'security_events', 'GET');
    if (!permissionCheck.allowed) {
      return {
        data: null,
        error: 'Access denied: Security events require admin privileges',
      };
    }

    return this.makeRequest({
      method: 'GET',
      url: 'security_events',
      userId,
      data: filters,
    });
  }

  async getSecurityMetrics(userId: string): Promise<{ data: any | null; error: string | null }> {
    // Only admins can access security metrics
    const permissionCheck = await securityMiddleware.validatePermissions(userId, 'security_metrics', 'GET');
    if (!permissionCheck.allowed) {
      return {
        data: null,
        error: 'Access denied: Security metrics require admin privileges',
      };
    }

    return this.makeRequest({
      method: 'GET',
      url: 'security_metrics',
      userId,
    });
  }

  // Cleanup method for rate limiting
  cleanup(): void {
    securityMiddleware.cleanupRateLimit();
  }
}

// Export singleton instance
export const secureApiService = new SecureApiService();

// Export types
export type { ApiRequest, ApiResponse };

