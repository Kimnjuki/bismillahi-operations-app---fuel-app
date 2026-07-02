/**
 * FinancialMath Utility
 * 
 * Provides precise financial calculations using integer-based math
 * to avoid JavaScript floating-point rounding errors.
 * 
 * All monetary values are stored/operated as integers (cents/centimes)
 * and converted to decimal only for display.
 */

export class FinancialMath {
  /**
   * Convert decimal to cents (integer)
   * 12.50 -> 1250
   */
  static toCents(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert cents to decimal
   * 1250 -> 12.50
   */
  static toDecimal(cents: number): number {
    return cents / 100;
  }

  /**
   * Add amounts with precision
   */
  static add(a: number, b: number): number {
    return Math.round((a * 100 + b * 100)) / 100;
  }

  /**
   * Subtract amounts with precision
   */
  static subtract(a: number, b: number): number {
    return Math.round((a * 100 - b * 100)) / 100;
  }

  /**
   * Multiply with precision
   */
  static multiply(a: number, b: number): number {
    return Math.round(a * b * 100) / 100;
  }

  /**
   * Divide with precision
   */
  static divide(a: number, b: number): number {
    if (b === 0) return 0;
    return Math.round((a / b) * 100) / 100;
  }

  /**
   * Calculate percentage of total
   * e.g., percentageOf(1000, 16) = 160 (16% of 1000)
   */
  static percentageOf(total: number, percentage: number): number {
    return Math.round(total * percentage * 100) / 10000;
  }

  /**
   * Calculate percentage one number is of another
   * e.g., whatPercent(160, 1000) = 16 (160 is 16% of 1000)
   */
  static whatPercent(part: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((part / total) * 10000) / 100;
  }

  /**
   * Sum an array of numbers with precision
   */
  static sum(values: number[]): number {
    return values.reduce((acc, val) => FinancialMath.add(acc, val), 0);
  }

  /**
   * Average of an array of numbers
   */
  static average(values: number[]): number {
    if (values.length === 0) return 0;
    return FinancialMath.divide(FinancialMath.sum(values), values.length);
  }

  /**
   * Round to specified decimal places
   */
  static round(amount: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(amount * factor) / factor;
  }

  /**
   * Format for display with currency symbol
   */
  static format(amount: number, currency: 'CDF' | 'USD' = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'CDF' ? 0 : 2,
      maximumFractionDigits: currency === 'CDF' ? 0 : 2,
    }).format(amount);
  }

  /**
   * Format CDF (no decimal places)
   */
  static formatCDF(amount: number): string {
    return `₣${Math.round(amount).toLocaleString('fr-FR')}`;
  }

  /**
   * Format USD (2 decimal places)
   */
  static formatUSD(amount: number): string {
    return `$${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /**
   * Safe comparison of two monetary values
   * Returns true if values are equal within tolerance
   */
  static equals(a: number, b: number, tolerance: number = 0.01): boolean {
    return Math.abs(a - b) < tolerance;
  }

  /**
   * Check if value is zero or effectively zero
   */
  static isZero(amount: number, tolerance: number = 0.01): boolean {
    return Math.abs(amount) < tolerance;
  }

  /**
   * Convert CDF to USD using exchange rate
   */
  static CDFtoUSD(amountCDF: number, rate: number = 2850.50): number {
    return FinancialMath.round(amountCDF / rate);
  }

  /**
   * Convert USD to CDF using exchange rate
   */
  static USDtoCDF(amountUSD: number, rate: number = 2850.50): number {
    return FinancialMath.round(amountUSD * rate, 0);
  }

  /**
   * Calculate tax amount
   */
  static calculateTax(subtotal: number, taxRate: number): number {
    return FinancialMath.percentageOf(subtotal, taxRate * 100);
  }

  /**
   * Calculate grand total (subtotal + tax)
   */
  static grandTotal(subtotal: number, taxRate: number): number {
    return FinancialMath.add(subtotal, FinancialMath.calculateTax(subtotal, taxRate));
  }

  /**
   * Calculate profit margin percentage
   */
  static profitMargin(cost: number, sellingPrice: number): number {
    if (cost === 0) return 100;
    return FinancialMath.whatPercent(sellingPrice - cost, sellingPrice);
  }

  /**
   * Calculate markup percentage
   */
  static markup(cost: number, sellingPrice: number): number {
    if (cost === 0) return 0;
    return FinancialMath.whatPercent(sellingPrice - cost, cost);
  }
}