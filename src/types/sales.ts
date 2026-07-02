import { BaseEntity, FuelType, PaymentMethod, User } from './index';

// Sales base types
export interface SaleBase extends BaseEntity {
  total_amount: number;
  payment_method: PaymentMethod;
  sale_date: string;
  created_by: string;
}

// Pump sale types
export interface PumpSale extends SaleBase {
  pump_number: number;
  fuel_type: FuelType;
  volume_liters: number;
  price_per_liter: number;
  pump_attendant?: string; // Added: track which attendant handled this pump
}

// Sales form types
export interface PumpSaleForm {
  pumpNumber: string;
  fuelType: FuelType;
  volumeLiters: string;
  pricePerLiter: string;
  paymentMethod: PaymentMethod;
  pumpAttendant?: string; // Added
}

// Sales validation types
export interface SalesValidation {
  pumpNumber: boolean;
  fuelType: boolean;
  volumeLiters: boolean;
  pricePerLiter: boolean;
  paymentMethod: boolean;
}

// Sales statistics types
export interface SalesStats {
  totalSales: number;
  totalVolume: number;
  totalTransactions: number;
  averageTransaction: number;
  salesByFuel: Record<FuelType, number>;
  salesByPayment: Record<PaymentMethod, number>;
  salesByPump: Record<number, number>;
  salesByPumpAttendant: Record<string, number>; // Added: per-attendant totals
}

export interface DailySales {
  date: string;
  pumpSales: number;
  totalSales: number;
  transactions: number;
}

export interface MonthlySales {
  month: string;
  pumpSales: number;
  totalSales: number;
  transactions: number;
  growth: number; // percentage
}

// Sales filters
export interface SalesFilters {
  startDate: string;
  endDate: string;
  fuelTypes?: FuelType[];
  paymentMethods?: PaymentMethod[];
  pumpNumbers?: number[];
  pumpAttendants?: string[]; // Added
  createdBy?: string[];
}

// Sales report types
export interface SalesReport {
  period: string;
  totalSales: number;
  totalVolume: number;
  totalTransactions: number;
  averageTransaction: number;
  dailySales: DailySales[];
  salesByFuel: Record<FuelType, number>;
  salesByPayment: Record<PaymentMethod, number>;
  topPumps: Array<{ pumpNumber: number; sales: number }>;
  topPumpAttendants: Array<{ attendant: string; sales: number }>; // Added
}

// Sales analytics types
export interface SalesAnalytics {
  trends: {
    daily: DailySales[];
    weekly: Array<{ week: string; sales: number }>;
    monthly: MonthlySales[];
  };
  performance: {
    bestDay: string;
    worstDay: string;
    peakHour: number;
    averageDailySales: number;
  };
  insights: {
    topFuelType: FuelType;
    topPaymentMethod: PaymentMethod;
    topPump: number;
    growthRate: number;
  };
}

// Sales validation rules
export const PUMP_SALE_VALIDATION = {
  pumpNumber: {
    required: true,
    min: 1,
    max: 20,
    message: 'Pump number must be between 1 and 20',
  },
  fuelType: {
    required: true,
     options: ['PMS', 'AGO'],
    message: 'Please select a valid fuel type',
  },
  volumeLiters: {
    required: true,
    min: 0.01,
    max: 10000,
    message: 'Volume must be between 0.01 and 10,000 liters',
  },
  pricePerLiter: {
    required: true,
    min: 0.01,
    max: 10000,
    message: 'Price per liter must be between 0.01 and 10,000',
  },
  paymentMethod: {
    required: true,
    options: ['cash', 'card', 'credit'],
    message: 'Please select a payment method',
  },
};

// Sales utility functions
export const calculateTotal = (volume: number, pricePerLiter: number): number => {
  return Math.round(volume * pricePerLiter * 100) / 100;
};

// Batch types
export interface BatchPumpSale {
  station: string;
  date: string;
  pumpNumber: string;
  fuelType: FuelType;
  volumeLiters: string;
  pricePerLiter: string;
  payment: string;
  customer: string;
  refNo: string;
  pumpAttendant: string;
}

export type BatchSale = BatchPumpSale;

export const DEFAULT_BATCH_PUMP_SALE: BatchPumpSale = {
  station: 'ISSIRO STATION',
  date: '',
  pumpNumber: '',
  fuelType: 'PMS',
  volumeLiters: '',
  pricePerLiter: '',
  payment: 'cash',
  customer: 'Walk-in Custom',
  refNo: '',
  pumpAttendant: 'Attendant 1',
};

// Pump Attendant Summary
export interface PumpAttendantSummary {
  attendant: string;
  pumpNumber: string;
  fuelType: FuelType;
  volumeLiters: number;
  totalAmount: number;
}