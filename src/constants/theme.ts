/**
 * Design System & Theme Constants v2.0
 * Dark theme design tokens for Fuelr
 * Brand: Fuel orange (#F5A623) on dark backgrounds
 *
 * Usage:
 *   import { Colors, Typography, Spacing } from '../constants/theme';
 *   backgroundColor: Colors.background.card
 *   fontSize: Typography.scale.base
 */

// ======================== COLORS ========================

export const Colors = {
  brand: {
    primary: '#F5A623',
    primaryDark: '#C47D0E',
    primaryLight: '#FFD580',
    primarySurface: 'rgba(245,166,35,0.10)',
  },

  neutral: {
    '900': '#0D0D12',
    '800': '#16161F',
    '700': '#1E1E2C',
    '600': '#2A2A3D',
    '500': '#3D3D56',
    '400': '#6B6B8A',
    '300': '#9999B8',
    '200': '#CCCCDE',
    '100': '#EBEBF5',
    '50': '#F7F7FC',
    white: '#FFFFFF',
  },

  semantic: {
    success: '#22C55E',
    successSurface: 'rgba(34,197,94,0.10)',
    warning: '#F59E0B',
    warningSurface: 'rgba(245,158,11,0.10)',
    danger: '#EF4444',
    dangerSurface: 'rgba(239,68,68,0.10)',
    info: '#3B82F6',
    infoSurface: 'rgba(59,130,246,0.10)',
  },

  fuel: {
    PMS: '#F5A623',
    AGO: '#3B82F6',
    DPK: '#22C55E',
  },

  roles: {
    admin: '#EF4444',
    manager: '#3B82F6',
    cashier: '#22C55E',
    viewer: '#8B5CF6',
  },

  background: {
    app: '#0D0D12',
    card: '#16161F',
    cardElevated: '#1E1E2C',
    input: '#1E1E2C',
    overlay: 'rgba(0,0,0,0.70)',
  },

  // Legacy flat color aliases (keep for backward compatibility)
  primary: '#F5A623',
  primaryLight: '#FFD580',
  primaryDark: '#C47D0E',
  accent: '#F5A623',
  accentLight: '#FFD580',
  accentDark: '#C47D0E',
  success: '#22C55E',
  successLight: '#22C55E',
  warning: '#F59E0B',
  warningLight: '#F59E0B',
  danger: '#EF4444',
  dangerLight: '#EF4444',
  info: '#3B82F6',
  infoLight: '#3B82F6',
  white: '#FFFFFF',
  surface: '#16161F',
  border: '#2A2A3D',
  divider: '#2A2A3D',
  textPrimary: '#FFFFFF',
  textSecondary: '#CCCCDE',
  textTertiary: '#6B6B8A',
  textLight: 'rgba(255,255,255,0.8)',
  textWhite: '#FFFFFF',

  // Gradients (start, end) - legacy
  gradientPrimary: ['#F5A623', '#C47D0E'] as [string, string],
  gradientDark: ['#16161F', '#0D0D12'] as [string, string],
  gradientSuccess: ['#22C55E', '#16A34A'] as [string, string],
  gradientWarning: ['#F59E0B', '#D97706'] as [string, string],
  gradientDanger: ['#EF4444', '#DC2626'] as [string, string],
  gradientInfo: ['#3B82F6', '#2563EB'] as [string, string],
  gradientPurple: ['#8B5CF6', '#7C3AED'] as [string, string],
  gradientTeal: ['#14B8A6', '#0D9488'] as [string, string],

  // Fuel Product Colors (legacy)
  fuelPMS: '#F5A623',
  fuelAGO: '#3B82F6',

  // Payment Method Colors (legacy)
  paymentCash: '#22C55E',
  paymentCard: '#3B82F6',
  paymentCredit: '#8B5CF6',

  // Status Colors (legacy)
  statusPending: '#F59E0B',
  statusOverdue: '#EF4444',
  statusPaid: '#22C55E',
  statusPartial: '#3B82F6',
  statusCancelled: '#6B6B8A',
} as const;

// ======================== TYPOGRAPHY ========================

export const Typography = {
  fontFamily: {
    display: 'Inter_700Bold',
    body: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    mono: 'SpaceMono_400Regular',
  },
  scale: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1.5,
  },

  // Legacy style presets
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36, color: Colors.white },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, color: Colors.white },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28, color: Colors.white },
  h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24, color: Colors.neutral['100'] },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22, color: Colors.neutral['200'] },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, color: Colors.neutral['300'] },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16, color: Colors.neutral['400'] },
  label: { fontSize: 14, fontWeight: '600' as const, lineHeight: 18, color: Colors.neutral['200'] },
  smallLabel: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16, color: Colors.neutral['400'] },
  tabular: { fontSize: 16, fontWeight: '600' as const, fontVariant: ['tabular-nums' as any], color: Colors.white },
  largeTabular: { fontSize: 24, fontWeight: '700' as const, fontVariant: ['tabular-nums' as any], color: Colors.white },
};

// ======================== SPACING ========================

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  screenPadding: 20,

  // Legacy aliases
  xsV: 4,
  xsH: 4,
  smV: 8,
  smH: 8,
  mdV: 12,
  mdH: 12,
  lgV: 16,
  lgH: 16,
  xlV: 20,
  xlH: 20,
  xxl: 24,
  xxxl: 32,
};

// ======================== BORDER RADIUS ========================

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  round: 9999,
  full: 9999,
};

// ======================== ELEVATION / SHADOWS ========================

export const Elevation = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
};

export const Shadows = Elevation;

// ======================== ANIMATION ========================

export const Animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: {
    damping: 18,
    stiffness: 200,
    mass: 0.8,
  },
};

// ======================== ICON MAP ========================

// MaterialCommunityIcons icon map
export const ICONS = {
  fuelPump: 'gas-station',
  fuelPumpOutline: 'gas-station-outline',
  tank: 'propane-tank',
  tankOutline: 'propane-tank-outline',
  deliveryTruck: 'tanker-truck',
  dipReading: 'ruler',
  variance: 'swap-vertical',
  cash: 'cash',
  card: 'credit-card-outline',
  mobileMoney: 'cellphone',
  creditSale: 'account-credit-card',
  expense: 'receipt',
  transfer: 'bank-transfer',
  exchangeRate: 'currency-usd',
  accountsReceivable: 'account-arrow-left',
  accountsPayable: 'account-arrow-right',
  report: 'chart-bar',
  dailyReport: 'clipboard-text',
  stock: 'warehouse',
  user: 'account',
  users: 'account-group',
  admin: 'shield-account',
  security: 'shield-lock',
  securityEvent: 'shield-alert',
  notification: 'bell',
  notificationUnread: 'bell-badge',
  settings: 'cog-outline',
  station: 'domain',
  pumpMgmt: 'engine',
  lowStockAlert: 'alert-circle',
  overdue: 'clock-alert',
  shift: 'clock-time-eight',
  export: 'export-variant',
  filter: 'filter-variant',
  calendar: 'calendar-range',
  success: 'check-circle',
  error: 'close-circle',
  warning: 'alert',
  info: 'information',
  close: 'close',
  back: 'arrow-left',
  more: 'dots-horizontal',
  add: 'plus',
  edit: 'pencil',
  delete: 'trash-can-outline',
  search: 'magnify',
  sort: 'sort',
  refresh: 'refresh',
  biometric: 'fingerprint',
  faceId: 'face-recognition',
  lock: 'lock',
  unlock: 'lock-open',
  eye: 'eye-outline',
  eyeOff: 'eye-off-outline',
  attach: 'paperclip',
  camera: 'camera',
  pdf: 'file-pdf-box',
  excel: 'file-excel-box',
  share: 'share-variant',
  qr: 'qrcode',
  barcode: 'barcode-scan',
  mapPin: 'map-marker',
  phone: 'phone',
  email: 'email-outline',
  dashboard: 'view-dashboard',
  home: 'home-variant',
  homeOutline: 'home-variant-outline',
  sales: 'point-of-sale',
  finance: 'bank',
  moreApps: 'apps',
} as const;

// Tab navigation icons
export const TAB_ICONS = {
  home: { focused: 'home-variant' as const, unfocused: 'home-variant-outline' as const },
  sales: { focused: 'gas-station' as const, unfocused: 'gas-station-outline' as const },
  stock: { focused: 'cube' as const, unfocused: 'cube-outline' as const },
  finance: { focused: 'wallet' as const, unfocused: 'wallet-outline' as const },
  more: { focused: 'apps' as const, unfocused: 'apps' as const },
} as const;

export const TAB_LABELS = {
  home: 'Home' as const,
  sales: 'Sales' as const,
  stock: 'Stock' as const,
  finance: 'Finance' as const,
  more: 'More' as const,
};

// ======================== PRODUCT ICONS ========================

export const PRODUCT_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  PMS: { icon: 'gas-station', color: Colors.fuel.PMS, label: 'Petrol (PMS)' },
  AGO: { icon: 'gas-station', color: Colors.fuel.AGO, label: 'Diesel (AGO)' },
  DPK: { icon: 'fire', color: Colors.fuel.DPK, label: 'Kerosene (DPK)' },
  '25L Jerrycan': { icon: 'flask-outline', color: Colors.neutral['400'], label: '25L Jerrycan' },
};

// ======================== PAYMENT ICONS ========================

export const PAYMENT_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  cash: { icon: 'cash', color: Colors.semantic.success, label: 'Cash' },
  card: { icon: 'credit-card-outline', color: Colors.semantic.info, label: 'Card' },
  credit: { icon: 'account-credit-card', color: Colors.semantic.info, label: 'Credit' },
  mobile_money: { icon: 'cellphone', color: Colors.brand.primary, label: 'Mobile Money' },
};

// ======================== FEATURE ICONS ========================

export const FEATURE_ICONS: Record<string, string> = {
  sales: 'point-of-sale',
  expenses: 'receipt',
  stock: 'warehouse',
  pump: 'engine',
  tank: 'propane-tank',
  delivery: 'tanker-truck',
  transfer: 'bank-transfer',
  exchange: 'currency-usd',
  reports: 'chart-bar',
  analytics: 'chart-line',
  users: 'account-group',
  settings: 'cog-outline',
  notifications: 'bell',
  security: 'shield-lock',
  help: 'help-circle-outline',
  accounts: 'wallet',
  creditors: 'account-arrow-right',
  ar: 'account-arrow-left',
  ap: 'account-arrow-right',
};

// ======================== SKELETON COLORS ========================

export const SKELETON_COLORS = {
  base: '#1E1E2C',
  highlight: '#2A2A3D',
};