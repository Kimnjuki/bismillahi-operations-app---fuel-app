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

export interface DrumSale extends BaseEntity {
  drum_type: DrumType;
  quantity: number;
  price_per_drum: number;
  total_amount: number;
  payment_method: PaymentMethod;
  sale_date: string;
  created_by: string;
}

export type FuelType = 'Petrol' | 'Diesel' | 'Kerosene' | 'Gas';
export type DrumType = '200L Drum' | '100L Drum' | '50L Drum' | '25L Jerrycan';
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
  AddTransporter: undefined;
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

export const FUEL_TYPES: FuelType[] = ['Petrol', 'Diesel', 'Kerosene', 'Gas'];

export const DRUM_TYPES: DrumType[] = ['200L Drum', '100L Drum', '50L Drum', '25L Jerrycan'];

export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'credit'];

export const CURRENCIES: Currency[] = ['NGN', 'USD', 'EUR', 'GBP'];

export const NOTIFICATION_TYPES: NotificationType[] = ['info', 'warning', 'error', 'success'];

// Type guards
export const isUser = (obj: any): obj is User => {
  return obj && typeof obj.id === 'string' && typeof obj.user_code === 'string';
};

export const isPumpSale = (obj: any): obj is PumpSale => {
  return obj && typeof obj.pump_number === 'number' && typeof obj.fuel_type === 'string';
};

export const isDrumSale = (obj: any): obj is DrumSale => {
  return obj && typeof obj.drum_type === 'string' && typeof obj.quantity === 'number';
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
  capacity_liters: number;
  current_stock: number;
  is_active: boolean;
  created_by: string;
  // Additional properties for station settings
  name: string;
  code: string;
  system_type: SystemType;
  usd_support: boolean;
}

export interface TaxPayment extends BaseEntity {
  payment_date: string;
  amount_cdf: number;
  amount_usd: number;
  border_point: string;
  truck_id: string;
  transporter_id: string;
  payment_reference: string;
  status: PaymentStatus;
  notes?: string;
  created_by: string;
  transporter?: Transporter;
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

// Station Settings types

export type SystemType = 'pump' | 'drum';

export interface StationSettings {
  selected_station_id: string;
  system_type: SystemType;
  usd_support: boolean;
  updated_by: string;
}

// Pump Management types
export interface Pump extends BaseEntity {
  name: string;
  pump_number: number;
  fuel_type: PumpFuelType;
  station_id: string;
  is_active: boolean;
  created_by: string;
}

export type PumpFuelType = 'PMS' | 'AGO' | 'DPK' | 'LPG';

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

