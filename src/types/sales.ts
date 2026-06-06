import { BaseEntity, FuelType, DrumType, PaymentMethod, User } from './index';

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
}

// Drum sale types
export interface DrumSale extends SaleBase {
  drum_type: DrumType;
  quantity: number;
  price_per_drum: number;
}

// Sales form types
export interface PumpSaleForm {
  pumpNumber: string;
  fuelType: FuelType;
  volumeLiters: string;
  pricePerLiter: string;
  paymentMethod: PaymentMethod;
}

export interface DrumSaleForm {
  drumType: DrumType;
  quantity: string;
  pricePerDrum: string;
  paymentMethod: PaymentMethod;
}

// Sales validation types
export interface SalesValidation {
  pumpNumber: boolean;
  fuelType: boolean;
  volumeLiters: boolean;
  pricePerLiter: boolean;
  paymentMethod: boolean;
  quantity: boolean;
  pricePerDrum: boolean;
  drumType: boolean;
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
  salesByDrum: Record<DrumType, number>;
}

export interface DailySales {
  date: string;
  pumpSales: number;
  drumSales: number;
  totalSales: number;
  transactions: number;
}

export interface MonthlySales {
  month: string;
  pumpSales: number;
  drumSales: number;
  totalSales: number;
  transactions: number;
  growth: number; // percentage
}

// Sales filters
export interface SalesFilters {
  startDate: string;
  endDate: string;
  fuelTypes?: FuelType[];
  drumTypes?: DrumType[];
  paymentMethods?: PaymentMethod[];
  pumpNumbers?: number[];
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
  topDrums: Array<{ drumType: DrumType; sales: number }>;
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
    topDrum: DrumType;
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
    options: ['Petrol', 'Diesel', 'Kerosene', 'Gas'],
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

export const DRUM_SALE_VALIDATION = {
  drumType: {
    required: true,
    options: ['200L Drum', '100L Drum', '50L Drum', '25L Jerrycan'],
    message: 'Please select a valid drum type',
  },
  quantity: {
    required: true,
    min: 1,
    max: 1000,
    message: 'Quantity must be between 1 and 1,000',
  },
  pricePerDrum: {
    required: true,
    min: 0.01,
    max: 100000,
    message: 'Price per drum must be between 0.01 and 100,000',
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

export const calculateDrumTotal = (quantity: number, pricePerDrum: number): number => {
  return Math.round(quantity * pricePerDrum * 100) / 100;
};

export const formatCurrency = (amount: number, currency: string = 'NGN'): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatVolume = (volume: number): string => {
  return `${volume.toFixed(2)}L`;
};

// Sales type guards
export const isPumpSale = (sale: any): sale is PumpSale => {
  return sale && typeof sale.pump_number === 'number' && typeof sale.fuel_type === 'string';
};

export const isDrumSale = (sale: any): sale is DrumSale => {
  return sale && typeof sale.drum_type === 'string' && typeof sale.quantity === 'number';
};

export const isPumpSaleForm = (form: any): form is PumpSaleForm => {
  return form && typeof form.pumpNumber === 'string' && typeof form.fuelType === 'string';
};

export const isDrumSaleForm = (form: any): form is DrumSaleForm => {
  return form && typeof form.drumType === 'string' && typeof form.quantity === 'string';
};

// Sales constants
export const FUEL_TYPES: FuelType[] = ['Petrol', 'Diesel', 'Kerosene', 'Gas'];
export const DRUM_TYPES: DrumType[] = ['200L Drum', '100L Drum', '50L Drum', '25L Jerrycan'];
export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'credit'];

export const PUMP_NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

export const DEFAULT_PUMP_SALE_FORM: PumpSaleForm = {
  pumpNumber: '',
  fuelType: 'Petrol',
  volumeLiters: '',
  pricePerLiter: '',
  paymentMethod: 'cash',
};

export const DEFAULT_DRUM_SALE_FORM: DrumSaleForm = {
  drumType: '200L Drum',
  quantity: '',
  pricePerDrum: '',
  paymentMethod: 'cash',
};

