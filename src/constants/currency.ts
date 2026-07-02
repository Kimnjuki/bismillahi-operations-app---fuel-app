// Currency Constants for Fuelr
// Main currency: Congolese Franc (CDF)
// Secondary currency: US Dollar (USD)

export const CURRENCY = {
  PRIMARY: 'CDF',
  SECONDARY: 'USD',
  PRIMARY_SYMBOL: '₣',
  SECONDARY_SYMBOL: '$',
  PRIMARY_NAME: 'Congolese Franc',
  SECONDARY_NAME: 'US Dollar',
} as const;

// Exchange rate: 1 USD = 2850.50 CDF (approximate rate)
export const EXCHANGE_RATE = 2850.50;

// Currency formatting functions
export const formatCurrency = {
  // Format CDF (primary currency)
  CDF: (amount: number): string => {
    return `₣${amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  },

  // Format USD (secondary currency)
  USD: (amount: number): string => {
    return `$${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  },

  // Format with both currencies
  BOTH: (amountCDF: number, amountUSD?: number): string => {
    const usdAmount = amountUSD || amountCDF / EXCHANGE_RATE;
    return `${formatCurrency.CDF(amountCDF)} (${formatCurrency.USD(usdAmount)})`;
  },

  // Format primary currency with secondary in parentheses
  PRIMARY_WITH_SECONDARY: (amountCDF: number): string => {
    const amountUSD = amountCDF / EXCHANGE_RATE;
    return `${formatCurrency.CDF(amountCDF)} (${formatCurrency.USD(amountUSD)})`;
  },
};

// Currency conversion functions
export const convertCurrency = {
  // Convert CDF to USD
  CDF_TO_USD: (amountCDF: number): number => {
    return amountCDF / EXCHANGE_RATE;
  },

  // Convert USD to CDF
  USD_TO_CDF: (amountUSD: number): number => {
    return amountUSD * EXCHANGE_RATE;
  },

  // Round to appropriate decimal places
  ROUND_CDF: (amount: number): number => {
    return Math.round(amount);
  },

  ROUND_USD: (amount: number): number => {
    return Math.round(amount * 100) / 100;
  },
};

// Currency input validation
export const validateCurrency = {
  CDF: (amount: string): { valid: boolean; value?: number; error?: string } => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return { valid: false, error: 'Invalid amount' };
    }
    if (numAmount < 0) {
      return { valid: false, error: 'Amount cannot be negative' };
    }
    if (numAmount > 1000000000) { // 1 billion CDF limit
      return { valid: false, error: 'Amount too large' };
    }
    return { valid: true, value: numAmount };
  },

  USD: (amount: string): { valid: boolean; value?: number; error?: string } => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return { valid: false, error: 'Invalid amount' };
    }
    if (numAmount < 0) {
      return { valid: false, error: 'Amount cannot be negative' };
    }
    if (numAmount > 1000000) { // 1 million USD limit
      return { valid: false, error: 'Amount too large' };
    }
    return { valid: true, value: numAmount };
  },
};

// Currency display helpers
export const getCurrencyDisplay = {
  // Get primary currency symbol
  PRIMARY_SYMBOL: (): string => CURRENCY.PRIMARY_SYMBOL,

  // Get secondary currency symbol
  SECONDARY_SYMBOL: (): string => CURRENCY.SECONDARY_SYMBOL,

  // Get currency name
  PRIMARY_NAME: (): string => CURRENCY.PRIMARY_NAME,
  SECONDARY_NAME: (): string => CURRENCY.SECONDARY_NAME,

  // Get exchange rate info
  EXCHANGE_RATE_INFO: (): string => {
    return `1 ${CURRENCY.SECONDARY} = ${formatCurrency.CDF(EXCHANGE_RATE)}`;
  },
};

// Common currency amounts for quick selection
export const QUICK_AMOUNTS = {
  CDF: [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000],
  USD: [1, 5, 10, 25, 50, 100, 250, 500],
};

// Currency input masks
export const CURRENCY_MASKS = {
  CDF: {
    placeholder: '0',
    suffix: ' ₣',
    precision: 0,
  },
  USD: {
    placeholder: '0.00',
    suffix: ' $',
    precision: 2,
  },
};

// Export types
export type CurrencyType = typeof CURRENCY.PRIMARY | typeof CURRENCY.SECONDARY;
export type CurrencySymbol = typeof CURRENCY.PRIMARY_SYMBOL | typeof CURRENCY.SECONDARY_SYMBOL;