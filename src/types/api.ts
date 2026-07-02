// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
  statusCode?: number;
}

// API request types
export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: any;
}

// Supabase specific types
export interface SupabaseResponse<T> {
  data: T | null;
  error: any | null;
  count?: number;
  status: number;
  statusText: string;
}

export interface SupabaseQuery {
  select?: string;
  eq?: Record<string, any>;
  neq?: Record<string, any>;
  gt?: Record<string, any>;
  gte?: Record<string, any>;
  lt?: Record<string, any>;
  lte?: Record<string, any>;
  like?: Record<string, any>;
  ilike?: Record<string, any>;
  in?: Record<string, any[]>;
  is?: Record<string, any>;
  order?: Record<string, 'asc' | 'desc'>;
  limit?: number;
  offset?: number;
}

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    SIGNUP: '/auth/signup',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // Users
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    GET: (id: string) => `/users/${id}`,
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
    PROFILE: '/users/profile',
  },
  
  // Sales
  SALES: {
    PUMP_SALES: '/pump_sales',
    PUMP_SALE: (id: string) => `/pump_sales/${id}`,
    STATS: '/sales/stats',
    REPORT: '/sales/report',
  },
  
  // Stock
  STOCK: {
    ITEMS: '/stock_items',
    ITEM: (id: string) => `/stock_items/${id}`,
    VARIANCES: '/stock_variances',
    VARIANCE: (id: string) => `/stock_variances/${id}`,
    ALERTS: '/stock/alerts',
  },
  
  // Expenses
  EXPENSES: {
    LIST: '/expenses',
    CREATE: '/expenses',
    GET: (id: string) => `/expenses/${id}`,
    UPDATE: (id: string) => `/expenses/${id}`,
    DELETE: (id: string) => `/expenses/${id}`,
    CATEGORIES: '/expense_categories',
    REPORT: '/expenses/report',
  },
  
  // Fund Transfers
  TRANSFERS: {
    LIST: '/fund_transfers',
    CREATE: '/fund_transfers',
    GET: (id: string) => `/fund_transfers/${id}`,
    UPDATE: (id: string) => `/fund_transfers/${id}`,
    DELETE: (id: string) => `/fund_transfers/${id}`,
  },
  
  // Exchange Rates
  EXCHANGE_RATES: {
    LIST: '/exchange_rates',
    CREATE: '/exchange_rates',
    GET: (id: string) => `/exchange_rates/${id}`,
    UPDATE: (id: string) => `/exchange_rates/${id}`,
    DELETE: (id: string) => `/exchange_rates/${id}`,
    CURRENT: '/exchange_rates/current',
  },
  
  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    GET: (id: string) => `/notifications/${id}`,
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/mark-all-read',
    UNREAD_COUNT: '/notifications/unread-count',
  },
  
  // Reports
  REPORTS: {
    SALES: '/reports/sales',
    EXPENSES: '/reports/expenses',
    STOCK: '/reports/stock',
    DASHBOARD: '/reports/dashboard',
    EXPORT: '/reports/export',
  },
  
  // Settings
  SETTINGS: {
    GET: '/settings',
    UPDATE: '/settings',
    BACKUP: '/settings/backup',
    RESTORE: '/settings/restore',
  },
} as const;

// API configuration
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: 'https://cdexwhsaycfmugseorpq.supabase.co',
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// API error codes
export const API_ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// API status codes
export const API_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// API utility types
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type ApiStatus = keyof typeof API_STATUS_CODES;
export type ApiErrorCode = keyof typeof API_ERROR_CODES;

// API hook types
export interface UseApiOptions {
  immediate?: boolean;
  retries?: number;
  retryDelay?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
  onFinally?: () => void;
}

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

// API middleware types
export interface ApiMiddleware {
  onRequest?: (request: ApiRequest) => ApiRequest | Promise<ApiRequest>;
  onResponse?: (response: any) => any | Promise<any>;
  onError?: (error: ApiError) => ApiError | Promise<ApiError>;
}

// API cache types
export interface ApiCache {
  get: (key: string) => any | null;
  set: (key: string, value: any, ttl?: number) => void;
  delete: (key: string) => void;
  clear: () => void;
}

// API rate limiting types
export interface RateLimit {
  requests: number;
  window: number; // in milliseconds
  remaining: number;
  reset: number; // timestamp
}

// API monitoring types
export interface ApiMetrics {
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastRequestTime: number;
}

// API type guards
export const isApiResponse = <T>(obj: any): obj is ApiResponse<T> => {
  return obj && typeof obj.success === 'boolean' && 'data' in obj && 'error' in obj;
};

export const isPaginatedResponse = <T>(obj: any): obj is PaginatedResponse<T> => {
  return obj && Array.isArray(obj.data) && typeof obj.count === 'number';
};

export const isApiError = (obj: any): obj is ApiError => {
  return obj && typeof obj.message === 'string';
};

// API utility functions
export const createApiError = (
  message: string,
  code?: string,
  details?: any,
  statusCode?: number
): ApiError => ({
  message,
  code,
  details,
  statusCode,
});

export const createApiResponse = <T>(
  data: T | null,
  error: string | null = null,
  message?: string
): ApiResponse<T> => ({
  data,
  error,
  success: !error,
  message,
});

export const isSuccessResponse = <T>(response: ApiResponse<T>): boolean => {
  return response.success && !response.error;
};

export const isErrorResponse = <T>(response: ApiResponse<T>): boolean => {
  return !response.success || !!response.error;
};

