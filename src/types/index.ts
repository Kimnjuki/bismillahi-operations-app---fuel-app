import React from 'react';

// Base types
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

// User types
export interface User extends BaseEntity {
  user_code: string;
  full_name: string;
  role: UserRole;
  station_id?: string;
  is_active: boolean;
  pin_hash?: string;
  last_login?: string;
  push_token?: string;
}

export type UserRole = 'admin' | 'manager' | 'cashier' | 'viewer';

// PIN Authentication types
export interface PinAuthCredentials {
  user_code: string;
  pin: string;
}

export interface PinSetupData {
  user_code: string;
  pin: string;
  confirm_pin: string;
}

export interface UserCreationData {
  user_code: string;
  full_name: string;
  role: UserRole;
  station_id?: string;
  is_active: boolean;
}

export interface UserPermissions {
  canViewSales: boolean;
  canCreateSales: boolean;
  canEditSales: boolean;
  canDeleteSales: boolean;
  canViewStock: boolean;
  canManageStock: boolean;
  canViewExpenses: boolean;
  canCreateExpenses: boolean;
  canEditExpenses: boolean;
  canDeleteExpenses: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewNotifications: boolean;
  canManageNotifications: boolean;
}

// Sales types
export interface PumpSale extends BaseEntity {
  pump_number: number;
  fuel_type: FuelType;
  volume_liters: number;
  price_per_liter: number;
  total_amount: number;
  payment_method: PaymentMethod;
  sale_date: string;
  created_by: string;
}

export type FuelType = 'PMS' | 'AGO';
export type PaymentMethod = 'cash' | 'card' | 'credit';

// Stock types
export interface StockItem extends BaseEntity {
  item_name: string;
  category: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  cost_price: number;
  selling_price: number;
  last_updated: string;
  updated_by: string;
}

export interface StockVariance extends BaseEntity {
  stock_item_id: string;
  expected_quantity: number;
  actual_quantity: number;
  variance: number;
  reason?: string;
  created_by: string;
  stock_items?: StockItem;
}

// Internal Account types
export type InternalAccountType = 'operating' | 'transit' | 'cash' | 'bank' | 'petty_cash' | 'fuel_account' | 'operations';

export interface InternalAccount extends BaseEntity {
  account_name: string;
  account_code: string;
  account_type: InternalAccountType;
  station_id?: string;
  station_name?: string;
  balance: number;
  currency: 'USD' | 'CDF';
  is_active: boolean;
}

// Expense types
export interface Expense extends BaseEntity {
  category: string;
  subcategory?: string;
  amount: number;
  description?: string;
  receipt_number?: string;
  payment_method: PaymentMethod;
  expense_date: string;
  created_by: string;
  account_id?: string;
  account?: InternalAccount;
}

export interface ExpenseCategory extends BaseEntity {
  name: string;
  description?: string;
  is_active: boolean;
}

// Fund transfer types
export interface FundTransfer extends BaseEntity {
  from_account: string;
  to_account: string;
  amount: number;
  currency: Currency;
  exchange_rate?: number;
  converted_amount?: number;
  purpose?: string;
  transfer_date: string;
  created_by: string;
  station?: string;
}

export type Currency = 'NGN' | 'USD' | 'EUR' | 'GBP' | 'CDF';

// Exchange rate types
export interface ExchangeRate extends BaseEntity {
  from_currency: Currency;
  to_currency: Currency;
  rate: number;
  effective_date: string;
  created_by: string;
}

// Notification types
export interface Notification extends BaseEntity {
  title: string;
  message: string;
  type: NotificationType;
  user_id: string;
  is_read: boolean;
  data?: any;
}

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

// Dashboard types
export interface DashboardStats {
  todaySales: number;
  todayExpenses: number;
  stockAlerts: number;
  pendingTransfers: number;
  monthlyGrowth: number;
  totalTransactions: number;
}

export interface MenuItem {
  title: string;
  subtitle: string;
  icon: string;
  screen: string;
  requiredRole: UserRole;
  gradient: [string, string];
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: SelectOption[];
  validation?: ValidationRule[];
}

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

// API types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Welcome: undefined;
  Dashboard: undefined;
  SalesEntry: undefined;
  SalesRecords: undefined;
  StockManagement: undefined;
  Expense: undefined;
  FundTransfer: undefined;
  ExchangeRate: undefined;
  Reports: undefined;
  UserManagement: undefined;
  Notifications: undefined;
  Settings: undefined;
  Accounts: undefined;
  AccountsManagement: undefined;
  OperationalAccounts: undefined;
  AccountReceivables: undefined;
  AccountPayables: undefined;
  AccountReceivablesHistory: undefined;
  AccountPayablesHistory: undefined;
  AddAccount: { type: AccountType };
  CreditorsSuppliers: undefined;
  AddCreditorSupplier: { type: 'creditor' | 'supplier' };
  StationSettings: undefined;
  PumpManagement: undefined;
  AddPump: { stationId: string; pump?: Pump };
  PumpDippingManagement: undefined;
  AddTank: { stationId: string; tank?: Tank };
  FuelDelivery: undefined;
  TransporterManagement: undefined;
  TaxPayment: undefined;
  TruckTransactionHistory: undefined;
  TrucksDelivered: undefined;
  AddTransporter: undefined;
  PumpAndDippingManagement: { stationId?: string };
};

// Auth types
export interface AuthContextType {
  appUser: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  signIn: (credentials: PinAuthCredentials) => Promise<{ error: any }>;
  createUser: (userData: UserCreationData) => Promise<{ data?: any; error: any }>;
  setupPin: (setupData: PinSetupData) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  hasPermission: (requiredRole: string) => boolean;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

export interface AuthState {
  user: any | null;
  appUser: User | null;
  session: any | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

// Offline types
export interface OfflineOperation {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingOperations: number;
  syncError: string | null;
}

export interface SyncResult {
  success: boolean;
  syncedTables: string[];
  failedTables: string[];
  error?: string;
}

// Settings types
export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  currency: Currency;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  notifications: NotificationSettings;
  sync: SyncSettings;
}

export interface NotificationSettings {
  enablePush: boolean;
  enableInApp: boolean;
  enableEmail: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  categories: string[];
}

export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number;
  maxRetries: number;
  syncOnWifiOnly: boolean;
}

// Report types
export interface ReportFilters {
  startDate: string;
  endDate: string;
  period: 'today' | 'week' | 'month' | 'year' | 'custom';
  categories?: string[];
  users?: string[];
}

export interface SalesReport {
  totalSales: number;
  totalVolume: number;
  totalTransactions: number;
  averageTransaction: number;
  salesByFuel: Record<FuelType, number>;
  salesByPayment: Record<PaymentMethod, number>;
  dailySales: DailySales[];
}

export interface DailySales {
  date: string;
  sales: number;
  volume: number;
  transactions: number;
}

export interface ExpenseReport {
  totalExpenses: number;
  totalTransactions: number;
  averageExpense: number;
  expensesByCategory: Record<string, number>;
  expensesByPayment: Record<PaymentMethod, number>;
  dailyExpenses: DailyExpenses[];
}

export interface DailyExpenses {
  date: string;
  expenses: number;
  transactions: number;
}

// Component props types
export interface BaseComponentProps {
  style?: any;
  children?: React.ReactNode;
}

export interface ScreenProps {
  navigation: any;
  route: any;
}

export interface ModalProps extends BaseComponentProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
}

export interface ButtonProps extends BaseComponentProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
}

export interface InputProps extends BaseComponentProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  keyboardType?: any;
  secureTextEntry?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Nullable<T> = T | null;

export type Maybe<T> = T | null | undefined;

// Event types
export interface AppEvent {
  type: string;
  payload: any;
  timestamp: number;
}

export interface NavigationEvent {
  screen: string;
  params?: any;
  timestamp: number;
}

export interface ErrorEvent {
  error: Error;
  context: string;
  timestamp: number;
}

// Constants
export const USER_ROLES: Record<UserRole, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  cashier: 'Cashier',
  viewer: 'Viewer',
};

export const FUEL_TYPES: FuelType[] = ['PMS', 'AGO'];

export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'credit'];

export const CURRENCIES: Currency[] = ['NGN', 'USD', 'EUR', 'GBP', 'CDF'];

export const NOTIFICATION_TYPES: NotificationType[] = ['info', 'warning', 'error', 'success'];

// Type guards
export const isUser = (obj: any): obj is User => {
  return obj && typeof obj.id === 'string' && typeof obj.user_code === 'string';
};

export const isPumpSale = (obj: any): obj is PumpSale => {
  return obj && typeof obj.pump_number === 'number' && typeof obj.fuel_type === 'string';
};

export const isStockItem = (obj: any): obj is StockItem => {
  return obj && typeof obj.item_name === 'string' && typeof obj.current_stock === 'number';
};

export const isExpense = (obj: any): obj is Expense => {
  return obj && typeof obj.category === 'string' && typeof obj.amount === 'number';
};

export const isNotification = (obj: any): obj is Notification => {
  return obj && typeof obj.title === 'string' && typeof obj.message === 'string';
};

// Account types
export interface AccountReceivable extends BaseEntity {
  creditor_name: string;
  creditor_code: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  total_amount: number;
  currency: Currency;
  due_date: string;
  status: AccountStatus;
  description?: string;
  created_by: string;
  last_payment_date?: string;
  last_payment_amount?: number;
}

export interface AccountPayable extends BaseEntity {
  debtor_name: string;
  debtor_code: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  total_amount: number;
  currency: Currency;
  due_date: string;
  status: AccountStatus;
  description?: string;
  created_by: string;
  last_payment_date?: string;
  last_payment_amount?: number;
}

export type AccountStatus = 'pending' | 'overdue' | 'paid' | 'partial' | 'cancelled';
export type AccountType = 'receivable' | 'payable';

export interface AccountTransaction extends BaseEntity {
  account_id: string;
  account_type: AccountType;
  transaction_type: 'payment' | 'adjustment' | 'refund';
  amount: number;
  currency: Currency;
  transaction_date: string;
  description?: string;
  reference_number?: string;
  created_by: string;
}

export interface AccountSummary {
  total_receivables: number;
  total_payables: number;
  overdue_receivables: number;
  overdue_payables: number;
  pending_receivables: number;
  pending_payables: number;
  currency: Currency;
}

// Fuel Delivery types
export interface FuelDelivery extends BaseEntity {
  delivery_date: string;
  product: FuelType;
  quantity_liters: number;
  transporter_id: string;
  truck_id: string;
  station_id: string;
  isse_vurra_cdf: number;
  isse_vurra_usd: number;
  tax_payment_id?: string;
  status: DeliveryStatus;
  notes?: string;
  created_by: string;
  transporter?: Transporter;
  station?: Station;
}

export interface Transporter extends BaseEntity {
  transporter_name: string;
  transporter_code: string;
  contact_person: string;
  phone: string;
  email?: string;
  address?: string;
  license_number: string;
  is_active: boolean;
  created_by: string;
}

export interface Station extends BaseEntity {
  station_name: string;
  station_code: string;
  location: string;
  capacity_liters?: number;
  current_stock?: number;
  is_active: boolean;
  created_by?: string;
  name?: string;
  code?: string;
  system_type?: SystemType;
  usd_support?: boolean;
}

export interface TaxPayment extends BaseEntity {
  payment_date: string;
  amount_cdf: number;
  amount_usd: number;
  border_point: string;
  truck_id: string;
  transporter_id: string;
  station_id?: string;
  deducted_account_type?: string;
  payment_reference: string;
  status: PaymentStatus;
  notes?: string;
  created_by: string;
  transporter?: Transporter;
  station?: Station;
}

export interface TruckTransaction extends BaseEntity {
  transaction_date: string;
  truck_id: string;
  transporter_id: string;
  transaction_type: TransactionType;
  amount: number;
  currency: Currency;
  description: string;
  reference_number?: string;
  created_by: string;
  transporter?: Transporter;
}

export type DeliveryStatus = 'pending' | 'delivered' | 'in_transit' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type TransactionType = 'delivery' | 'payment' | 'tax' | 'fuel_purchase' | 'maintenance';

export interface FuelStock extends BaseEntity {
  station_id: string;
  product: FuelType;
  current_stock: number;
  capacity: number;
  last_updated: string;
  updated_by: string;
  station?: Station;
}

export interface DeliverySummary {
  total_deliveries: number;
  total_volume: number;
  total_payments_cdf: number;
  total_payments_usd: number;
  pending_deliveries: number;
  in_transit_deliveries: number;
}

export interface TruckDeliveredSummary {
  truck_id: string;
  transporter_name: string;
  station_name: string;
  total_liters: number;
  deliveries_count: number;
  first_delivery_date: string;
  last_delivery_date: string;
  products: string[];
}

// Creditors and Suppliers types
export interface Creditor extends BaseEntity {
  name: string;
  type: 'creditor';
  currency: Currency;
  memo?: string;
  created_by: string;
}

export interface Supplier extends BaseEntity {
  name: string;
  type: 'supplier';
  currency: Currency;
  memo?: string;
  created_by: string;
}

export type CreditorSupplierType = 'creditor' | 'supplier';

export interface CreditorSupplierSummary {
  total_creditors: number;
  total_suppliers: number;
}

// Station capabilities - feature flags for what each station can do
export interface StationCapabilities {
  // Sales Module
  pump_sales: boolean;
  sales_records: boolean;
  unified_receipt: boolean;

  // Stock Management
  stock_tracking: boolean;
  stock_variance: boolean;
  stock_alerts: boolean;

  // Expense Management
  expense_entry: boolean;
  expense_history: boolean;
  expense_categories: boolean;

  // Financial Module
  fund_transfer: boolean;
  exchange_rate: boolean;
  account_receivables: boolean;
  account_payables: boolean;
  creditors_suppliers: boolean;

  // Fuel Operations
  pump_management: boolean;
  dipping_management: boolean;
  fuel_delivery_tracking: boolean;
  tax_payment_tracking: boolean;
  transporter_management: boolean;

  // Reporting & Analytics
  reports_generation: boolean;
  daily_consolidated_report: boolean;
  analytics_dashboard: boolean;

  // System Features
  notifications: boolean;
  data_sync: boolean;
  auto_backup: boolean;
  biometric_auth: boolean;
  location_services: boolean;
  sound_effects: boolean;
}

export type SystemType = 'pump' | 'drum';

// Station configuration (settings beyond capabilities)
export interface StationConfiguration {
  system_type: SystemType;
  usd_support: boolean;
  multi_currency: boolean;
  cdf_support: boolean;
  pricing_unit: 'per_liter' | 'both';
  default_currency: Currency;
  local_currency: Currency;
  exchange_rate_update: 'manual' | 'automatic';
  low_stock_threshold: number;
  auto_sync_interval: number; // minutes
  enable_push_notifications: boolean;
  enable_email_notifications: boolean;
  enable_sms_notifications: boolean;
  language: 'en' | 'fr';
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  time_format: '12h' | '24h';
  fuel_types_enabled: FuelType[];
  payment_methods_enabled: PaymentMethod[];
  pump_count: number;
  tank_count: number;
  max_credit_limit: number;
  tax_rate: number;
  operating_hours_start: string;
  operating_hours_end: string;
}

// Station Settings with all enhanced features
export interface StationSettings {
  selected_station_id: string;
  system_type: SystemType;
  usd_support: boolean;
  updated_by: string;
  updated_at?: string;
  // New enhanced settings
  capabilities: StationCapabilities;
  configuration: StationConfiguration;
  is_active: boolean;
  maintenance_mode: boolean;
  notes?: string;
}

// Helper type for capability categories
export interface CapabilityCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  description: string;
  features: CapabilityFeature[];
}

export interface CapabilityFeature {
  key: keyof StationCapabilities;
  label: string;
  description: string;
  icon: string;
}

// Default capabilities (all enabled)
export const DEFAULT_CAPABILITIES: StationCapabilities = {
  pump_sales: true,
  sales_records: true,
  unified_receipt: true,
  stock_tracking: true,
  stock_variance: true,
  stock_alerts: true,
  expense_entry: true,
  expense_history: true,
  expense_categories: true,
  fund_transfer: true,
  exchange_rate: true,
  account_receivables: true,
  account_payables: true,
  creditors_suppliers: true,
  pump_management: true,
  dipping_management: true,
  fuel_delivery_tracking: true,
  tax_payment_tracking: true,
  transporter_management: true,
  reports_generation: true,
  daily_consolidated_report: true,
  analytics_dashboard: true,
  notifications: true,
  data_sync: true,
  auto_backup: true,
  biometric_auth: false,
  location_services: false,
  sound_effects: true,
};

// Capability categories with features
export const CAPABILITY_CATEGORIES: CapabilityCategory[] = [
  {
    id: 'sales',
    title: 'Sales Module',
    subtitle: 'Sales & receipt management',
    icon: 'cash',
    color: '#4CAF50',
    description: 'Configure sales-related features for this station',
    features: [
      { key: 'pump_sales', label: 'Pump Sales', description: 'Record pump fuel sales', icon: 'car-sport' },
      { key: 'sales_records', label: 'Sales Records', description: 'View sales history & records', icon: 'document-text' },
      { key: 'unified_receipt', label: 'Unified Receipt', description: 'Generate unified sales receipts', icon: 'receipt' },
    ],
  },
  {
    id: 'stock',
    title: 'Stock Management',
    subtitle: 'Inventory & stock control',
    icon: 'cube',
    color: '#FF9800',
    description: 'Configure stock management features for this station',
    features: [
      { key: 'stock_tracking', label: 'Stock Tracking', description: 'Track inventory levels in real-time', icon: 'analytics' },
      { key: 'stock_variance', label: 'Stock Variance', description: 'Track stock discrepancies & variances', icon: 'trending-down' },
      { key: 'stock_alerts', label: 'Stock Alerts', description: 'Get low stock & restock alerts', icon: 'alert-circle' },
    ],
  },
  {
    id: 'expenses',
    title: 'Expense Management',
    subtitle: 'Expense tracking & categories',
    icon: 'cash-outline',
    color: '#F44336',
    description: 'Configure expense-related features for this station',
    features: [
      { key: 'expense_entry', label: 'Expense Entry', description: 'Record and submit expenses', icon: 'add-circle' },
      { key: 'expense_history', label: 'Expense History', description: 'View expense records history', icon: 'time' },
      { key: 'expense_categories', label: 'Expense Categories', description: 'Manage expense categories', icon: 'folder' },
    ],
  },
  {
    id: 'financial',
    title: 'Financial Module',
    subtitle: 'Accounts, transfers & exchange',
    icon: 'wallet',
    color: '#9C27B0',
    description: 'Configure financial features for this station',
    features: [
      { key: 'fund_transfer', label: 'Fund Transfer', description: 'Transfer funds between accounts', icon: 'swap-horizontal' },
      { key: 'exchange_rate', label: 'Exchange Rate', description: 'Manage exchange rates', icon: 'trending-up' },
      { key: 'account_receivables', label: 'Account Receivables', description: 'Manage money owed to you', icon: 'arrow-back-circle' },
      { key: 'account_payables', label: 'Account Payables', description: 'Manage money you owe', icon: 'arrow-forward-circle' },
      { key: 'creditors_suppliers', label: 'Creditors & Suppliers', description: 'Manage vendor relationships', icon: 'people' },
    ],
  },
  {
    id: 'fuel_ops',
    title: 'Fuel Operations',
    subtitle: 'Pumps, tanks & deliveries',
    icon: 'flame',
    color: '#E91E63',
    description: 'Configure fuel operations features for this station',
    features: [
      { key: 'pump_management', label: 'Pump Management', description: 'Manage fuel pumps & readings', icon: 'speedometer' },
      { key: 'dipping_management', label: 'Dipping Management', description: 'Tank dipping & calibration', icon: 'water' },
      { key: 'fuel_delivery_tracking', label: 'Fuel Delivery', description: 'Track fuel deliveries', icon: 'car' },
      { key: 'tax_payment_tracking', label: 'Tax Payment', description: 'Track tax payments', icon: 'document' },
      { key: 'transporter_management', label: 'Transporters', description: 'Manage transporters & trucks', icon: 'bus' },
    ],
  },
  {
    id: 'reports',
    title: 'Reporting & Analytics',
    subtitle: 'Reports & data insights',
    icon: 'bar-chart',
    color: '#2196F3',
    description: 'Configure reporting & analytics features for this station',
    features: [
      { key: 'reports_generation', label: 'Reports Generation', description: 'Generate custom reports', icon: 'document-text' },
      { key: 'daily_consolidated_report', label: 'Daily Consolidated', description: 'Daily consolidated reports', icon: 'calendar' },
      { key: 'analytics_dashboard', label: 'Analytics Dashboard', description: 'View charts & analytics', icon: 'stats-chart' },
    ],
  },
  {
    id: 'system',
    title: 'System Features',
    subtitle: 'App-wide capabilities',
    icon: 'settings',
    color: '#607D8B',
    description: 'Configure system-wide features for this station',
    features: [
      { key: 'notifications', label: 'Notifications', description: 'Push and in-app notifications', icon: 'notifications' },
      { key: 'data_sync', label: 'Data Sync', description: 'Automatically sync data', icon: 'sync' },
      { key: 'auto_backup', label: 'Auto Backup', description: 'Backup data automatically', icon: 'cloud-done' },
      { key: 'biometric_auth', label: 'Biometric Auth', description: 'Fingerprint or face ID login', icon: 'finger-print' },
      { key: 'location_services', label: 'Location Services', description: 'Allow location tracking', icon: 'location' },
      { key: 'sound_effects', label: 'Sound Effects', description: 'Play sound effects', icon: 'volume-high' },
    ],
  },
];

// Default configuration
export const DEFAULT_CONFIGURATION: StationConfiguration = {
  system_type: 'pump',
  usd_support: true,
  multi_currency: true,
  cdf_support: true,
  pricing_unit: 'per_liter',
  default_currency: 'CDF',
  local_currency: 'CDF',
  exchange_rate_update: 'manual',
  low_stock_threshold: 1000,
  auto_sync_interval: 5,
  enable_push_notifications: true,
  enable_email_notifications: false,
  enable_sms_notifications: false,
  language: 'en',
  date_format: 'DD/MM/YYYY',
  time_format: '24h',
  fuel_types_enabled: ['PMS', 'AGO'],
  payment_methods_enabled: ['cash', 'card', 'credit'],
  pump_count: 0,
  tank_count: 0,
  max_credit_limit: 0,
  tax_rate: 0,
  operating_hours_start: '06:00',
  operating_hours_end: '22:00',
};

// Pump Management types
export interface Pump extends BaseEntity {
  name: string;
  pump_number: number;
  fuel_type: PumpFuelType;
  station_id: string;
  is_active: boolean;
  created_by: string;
}

export type PumpFuelType = 'PMS' | 'AGO';

// Tank and Dipping Management types
export interface Tank extends BaseEntity {
  name: string;
  tank_number: number;
  fuel_type: PumpFuelType;
  station_id: string;
  capacity: number; // in liters
  current_dipping: number; // in liters
  closing_book_stock: number; // in liters
  variance: number; // calculated as current_dipping - closing_book_stock
  pumps: string[]; // array of pump IDs connected to this tank
  is_active: boolean;
  created_by: string;
}

export interface DippingReading extends BaseEntity {
  tank_id: string;
  reading_date: string;
  dipping_reading: number; // in liters
  book_stock: number; // in liters
  variance: number; // calculated variance
  recorded_by: string;
  notes?: string;
}

export interface PumpReading extends BaseEntity {
  pump_id: string;
  reading_date: string;
  today_reading: number; // in liters
  yesterday_reading: number; // in liters
  daily_sales: number; // calculated as today_reading - yesterday_reading
  recorded_by: string;
  notes?: string;
}

// Combined Pump & Dipping Management types for unified screen
export interface PumpReadingWithPump extends PumpReading {
  pump_name?: string;
  pump_number?: number;
  fuel_type?: PumpFuelType;
}

export interface DippingReadingWithTank extends DippingReading {
  tank_name?: string;
  tank_number?: number;
  fuel_type?: PumpFuelType;
  capacity?: number;
  pumps?: string[];
}

export interface FuelTypeSalesSummary {
  fuel_type: PumpFuelType;
  total_pump_sales: number; // Sum of daily_sales from pumps of this fuel type
  total_tank_consumption: number; // Expected consumption based on tank dipping changes + offloads
  offload_quantity: number; // Fuel offloaded/added to tanks
  discrepancy: number; // total_pump_sales - total_tank_consumption
  has_error: boolean; // true if discrepancy is non-zero
  previous_closing_dip: number; // yesterday's closing dip
  current_dip: number; // today's dip reading
  expected_closing_dip: number; // previous_closing_dip + offloads - total_pump_sales
}

export interface StationDailyReport {
  station_id: string;
  station_name: string;
  reading_date: string;
  pump_readings: PumpReadingWithPump[];
  tank_dippings: DippingReadingWithTank[];
  fuel_summaries: FuelTypeSalesSummary[];
  total_litres_sold: number;
  has_validation_errors: boolean;
  validation_messages: string[];
}