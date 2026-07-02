import { supabase } from '../config/supabase';
import { ApiResponse, FundTransfer, Expense, PumpSale } from '../types';

export interface StationReport {
  station_id: string;
  station_name: string;
  station_code: string;
  sales: {
    total_cdf: number;
    total_usd: number;
    pms_sales_cdf: number;
    ago_sales_cdf: number;
    pms_volume_liters: number;
    ago_volume_liters: number;
    pump_sales_count: number;
    payment_breakdown: {
      cash: number;
      card: number;
      credit: number;
    };
  };
  expenses: {
    total_cdf: number;
    total_usd: number;
    by_category: Record<string, number>;
    count: number;
  };
  cash_flow: {
    opening_cash_cdf: number;
    opening_cash_usd: number;
    cash_sales_cdf: number;
    cash_sales_usd: number;
    total_expenses_cdf: number;
    total_expenses_usd: number;
    short_extra_cdf: number;
    short_extra_usd: number;
    closing_cash_cdf: number;
    closing_cash_usd: number;
    cash_transferred_cdf: number;
    cash_transferred_usd: number;
    exchange_to_usd_cdf: number;
    exchange_to_usd_amount: number;
  };
  stock: {
    pms_current_stock: number;
    ago_current_stock: number;
    pms_minimum_stock: number;
    ago_minimum_stock: number;
    pms_capacity: number;
    ago_capacity: number;
    pms_received: number;
    ago_received: number;
    pms_sold: number;
    ago_sold: number;
    pms_variance: number;
    ago_variance: number;
  };
  tank_dipping: {
    pms_tanks: TankDippingInfo[];
    ago_tanks: TankDippingInfo[];
  };
}

export interface TankDippingInfo {
  tank_name: string;
  tank_number: number;
  fuel_type: string;
  capacity: number;
  previous_dip: number;
  current_dip: number;
  offload_quantity: number;
  pump_sales: number;
  expected_dip: number;
  variance: number;
}

export interface ReportsSummary {
  total_sales_cdf: number;
  total_sales_usd: number;
  total_expenses_cdf: number;
  total_expenses_usd: number;
  total_cash_flow_cdf: number;
  total_cash_flow_usd: number;
  total_stations: number;
}

class ReportsService {
  // Get all stations
  async getStations(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return { data: data || [], error: null, success: true };
    } catch (error) {
      console.error('Error fetching stations:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get sales data for a station on a specific date
  async getSalesByStation(stationName: string, date: string): Promise<ApiResponse<StationReport['sales']>> {
    try {
      // Fetch sales from the unified daily_sales table (has station_name column)
      // pump_sales and drum_sales do NOT have station_name, so only daily_sales can be filtered by station
      const { data: dailySales, error: dailyError } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('sale_date', date)
        .eq('station_name', stationName);

      if (dailyError && dailyError.code !== 'PGRST116') throw dailyError;

      let totalCDF = 0;
      let totalUSD = 0;
      let pmsSalesCDF = 0;
      let agoSalesCDF = 0;
      let pmsVolume = 0;
      let agoVolume = 0;
      let pumpCount = 0;
      const paymentBreakdown = { cash: 0, card: 0, credit: 0 };

      // Process daily_sales (the only table with station_name support)
      if (dailySales) {
        (dailySales as any[]).forEach(sale => {
          const amount = sale.total_amount || 0;
          totalCDF += amount;
          if (sale.fuel_type === 'PMS') {
            pmsSalesCDF += amount;
            pmsVolume += sale.volume_liters || 0;
          } else if (sale.fuel_type === 'AGO') {
            agoSalesCDF += amount;
            agoVolume += sale.volume_liters || 0;
          }
          if (sale.sale_type === 'pump') pumpCount++;
          if (sale.payment_method && paymentBreakdown.hasOwnProperty(sale.payment_method)) {
            paymentBreakdown[sale.payment_method as keyof typeof paymentBreakdown] += amount;
          }
        });
      }

      const exchangeRate = 2850.50;
      totalUSD = totalCDF / exchangeRate;

      return {
        data: {
          total_cdf: totalCDF,
          total_usd: totalUSD,
          pms_sales_cdf: pmsSalesCDF,
          ago_sales_cdf: agoSalesCDF,
          pms_volume_liters: pmsVolume,
          ago_volume_liters: agoVolume,
          pump_sales_count: pumpCount,
          payment_breakdown: paymentBreakdown,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching sales by station:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get expenses for a station on a specific date
  async getExpensesByStation(stationName: string, date: string): Promise<ApiResponse<StationReport['expenses']>> {
    try {
      // The expenses table has no station_name column, so fetch all expenses for the date
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('expense_date', date);

      if (error && error.code !== 'PGRST116') throw error;

      let totalCDF = 0;
      const byCategory: Record<string, number> = {};
      let count = 0;

      if (expenses) {
        (expenses as any[]).forEach(exp => {
          const amount = exp.amount || 0;
          totalCDF += amount;
          byCategory[exp.category] = (byCategory[exp.category] || 0) + amount;
          count++;
        });
      }

      const exchangeRate = 2850.50;

      return {
        data: {
          total_cdf: totalCDF,
          total_usd: totalCDF / exchangeRate,
          by_category: byCategory,
          count,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching expenses by station:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get cash flow for a station on a specific date
  async getCashFlowByStation(stationName: string, date: string): Promise<ApiResponse<StationReport['cash_flow']>> {
    try {
      // Note: daily_cash_flows table does not exist. Use daily_sales for sales data.
      // Fetch cash flow data from daily_sales (the actual table that exists)
      const { data: dailySales, error: salesError } = await supabase
        .from('daily_sales')
        .select('total_amount, payment_method')
        .eq('sale_date', date)
        .eq('station_name', stationName);

      if (salesError && salesError.code !== 'PGRST116') throw salesError;

      // Get fund transfers for the date that involve this station
      const { data: transfers, error: transferError } = await supabase
        .from('fund_transfers')
        .select('*')
        .eq('transfer_date', date);

      if (transferError && transferError.code !== 'PGRST116') throw transferError;

      // Calculate cash sales and totals
      let cashSalesCDF = 0;
      let totalSalesCDF = 0;
      let cashTransferredCDF = 0;
      let cashTransferredUSD = 0;
      let exchangeToUSD_CDF = 0;
      let exchangeToUSD_Amount = 0;

      if (dailySales) {
        (dailySales as any[]).forEach(sale => {
          const amount = sale.total_amount || 0;
          totalSalesCDF += amount;
          if (sale.payment_method === 'cash') {
            cashSalesCDF += amount;
          }
        });
      }

      if (transfers) {
        (transfers as any[]).forEach(t => {
          if (t.from_account?.toLowerCase().includes('cash') || t.from_account?.toLowerCase().includes(stationName.toLowerCase())) {
            if (t.currency === 'USD' || t.to_account?.toLowerCase().includes('usd')) {
              exchangeToUSD_CDF += t.amount || 0;
              exchangeToUSD_Amount += t.converted_amount || (t.amount || 0) / 2850.50;
            } else {
              cashTransferredCDF += t.amount || 0;
            }
          }
        });
      }

      // Get total expenses (no station filter - expenses table has no station column)
      const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('expense_date', date);

      if (expenseError && expenseError.code !== 'PGRST116') throw expenseError;

      const totalExpensesCDF = (expenses as any[] || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

      // Compute cash flow from available data
      return {
        data: {
          opening_cash_cdf: 0,
          opening_cash_usd: 0,
          cash_sales_cdf: cashSalesCDF,
          cash_sales_usd: cashSalesCDF / 2850.50,
          total_expenses_cdf: totalExpensesCDF,
          total_expenses_usd: totalExpensesCDF / 2850.50,
          short_extra_cdf: 0,
          short_extra_usd: 0,
          closing_cash_cdf: cashSalesCDF + totalSalesCDF - totalExpensesCDF - cashTransferredCDF,
          closing_cash_usd: (cashSalesCDF + totalSalesCDF - totalExpensesCDF) / 2850.50,
          cash_transferred_cdf: cashTransferredCDF,
          cash_transferred_usd: cashTransferredUSD,
          exchange_to_usd_cdf: exchangeToUSD_CDF,
          exchange_to_usd_amount: exchangeToUSD_Amount,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching cash flow:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get stock levels for a station
  async getStockByStation(stationName: string): Promise<ApiResponse<StationReport['stock']>> {
    try {
      // Get station by name
      const { data: stations, error: stationError } = await supabase
        .from('stations')
        .select('id')
        .eq('name', stationName)
        .limit(1);

      if (stationError) throw stationError;
      if (!stations || stations.length === 0) {
        return {
          data: null,
          error: 'Station not found',
          success: false,
        };
      }

      const stationId = stations[0].id;

      // Get stock levels from stock_levels table
      const { data: stockLevels, error: stockError } = await supabase
        .from('stock_levels')
        .select('*')
        .eq('station_id', stationId);

      if (stockError && stockError.code !== 'PGRST116') throw stockError;

      // Get daily stock transactions for the current date
      const today = new Date().toISOString().split('T')[0];
      const { data: dailyStock, error: dailyError } = await supabase
        .from('daily_stock_transactions')
        .select('*')
        .eq('station_id', stationId)
        .eq('transaction_date', today)
        .maybeSingle();

      if (dailyError && dailyError.code !== 'PGRST116') throw dailyError;

      let pmsStock = 0, agoStock = 0;
      let pmsMin = 0, agoMin = 0;
      let pmsCapacity = 0, agoCapacity = 0;

      if (stockLevels) {
        (stockLevels as any[]).forEach(level => {
          if (level.product_type === 'PMS') {
            pmsStock = level.current_stock || 0;
            pmsMin = level.minimum_stock || 0;
            pmsCapacity = level.maximum_stock || 0;
          } else if (level.product_type === 'AGO') {
            agoStock = level.current_stock || 0;
            agoMin = level.minimum_stock || 0;
            agoCapacity = level.maximum_stock || 0;
          }
        });
      }

      return {
        data: {
          pms_current_stock: pmsStock,
          ago_current_stock: agoStock,
          pms_minimum_stock: pmsMin,
          ago_minimum_stock: agoMin,
          pms_capacity: pmsCapacity,
          ago_capacity: agoCapacity,
          pms_received: (dailyStock as any)?.pms_received || 0,
          ago_received: (dailyStock as any)?.ago_received || 0,
          pms_sold: (dailyStock as any)?.pms_sold || 0,
          ago_sold: (dailyStock as any)?.ago_sold || 0,
          pms_variance: (dailyStock as any)?.pms_variance || 0,
          ago_variance: (dailyStock as any)?.ago_variance || 0,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching stock by station:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get tank dipping data for a station
  async getTankDippingByStation(stationName: string, date: string): Promise<ApiResponse<StationReport['tank_dipping']>> {
    try {
      // Get station by name
      const { data: stations, error: stationError } = await supabase
        .from('stations')
        .select('id')
        .eq('name', stationName)
        .limit(1);

      if (stationError) throw stationError;
      if (!stations || stations.length === 0) {
        return {
          data: { pms_tanks: [], ago_tanks: [] },
          error: null,
          success: true,
        };
      }

      const stationId = stations[0].id;

      // Get tanks for station
      const { data: tanks, error: tankError } = await supabase
        .from('tanks')
        .select('*')
        .eq('station_id', stationId)
        .eq('is_active', true);

      if (tankError && tankError.code !== 'PGRST116') throw tankError;

      const pmsTanks: TankDippingInfo[] = [];
      const agoTanks: TankDippingInfo[] = [];

      if (tanks) {
        for (const tank of tanks as any[]) {
          // Get latest dipping reading for this tank
          const { data: dipping } = await supabase
            .from('dipping_readings')
            .select('*')
            .eq('tank_id', tank.id)
            .eq('reading_date', date)
            .maybeSingle();

          const previousDate = new Date(date);
          previousDate.setDate(previousDate.getDate() - 1);
          const prevDateStr = previousDate.toISOString().split('T')[0];

          const { data: prevDipping } = await supabase
            .from('dipping_readings')
            .select('*')
            .eq('tank_id', tank.id)
            .eq('reading_date', prevDateStr)
            .maybeSingle();

          const currentDip = (dipping as any)?.dipping_reading || tank.current_dipping || 0;
          const previousDip = (prevDipping as any)?.dipping_reading || (dipping as any)?.book_stock || currentDip;
          const offloadQty = 0;

          const tankInfo: TankDippingInfo = {
            tank_name: tank.name || `Tank ${tank.tank_number}`,
            tank_number: tank.tank_number || 0,
            fuel_type: tank.fuel_type || 'PMS',
            capacity: tank.capacity || 0,
            previous_dip: previousDip,
            current_dip: currentDip,
            offload_quantity: offloadQty,
            pump_sales: 0,
            expected_dip: previousDip + offloadQty - 0,
            variance: currentDip - (previousDip + offloadQty - 0),
          };

          if (tank.fuel_type === 'PMS') {
            pmsTanks.push(tankInfo);
          } else {
            agoTanks.push(tankInfo);
          }
        }
      }

      return {
        data: { pms_tanks: pmsTanks, ago_tanks: agoTanks },
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching tank dipping:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get full report for a station
  async getFullStationReport(stationName: string, date: string): Promise<ApiResponse<StationReport>> {
    try {
      const [stations, salesResult, expensesResult, cashFlowResult, stockResult, dippingResult] = await Promise.all([
        this.getStations(),
        this.getSalesByStation(stationName, date),
        this.getExpensesByStation(stationName, date),
        this.getCashFlowByStation(stationName, date),
        this.getStockByStation(stationName),
        this.getTankDippingByStation(stationName, date),
      ]);

      const station = (stations.data || []).find(
        (s: any) => s.name?.toLowerCase() === stationName.toLowerCase()
      );

      return {
        data: {
          station_id: station?.id || '',
          station_name: stationName,
          station_code: station?.code || '',
          sales: salesResult.data || {
            total_cdf: 0, total_usd: 0, pms_sales_cdf: 0, ago_sales_cdf: 0,
            pms_volume_liters: 0, ago_volume_liters: 0, pump_sales_count: 0,
            payment_breakdown: { cash: 0, card: 0, credit: 0 },
          },
          expenses: expensesResult.data || {
            total_cdf: 0, total_usd: 0, by_category: {}, count: 0,
          },
          cash_flow: cashFlowResult.data || {
            opening_cash_cdf: 0, opening_cash_usd: 0, cash_sales_cdf: 0, cash_sales_usd: 0,
            total_expenses_cdf: 0, total_expenses_usd: 0, short_extra_cdf: 0, short_extra_usd: 0,
            closing_cash_cdf: 0, closing_cash_usd: 0, cash_transferred_cdf: 0, cash_transferred_usd: 0,
            exchange_to_usd_cdf: 0, exchange_to_usd_amount: 0,
          },
          stock: stockResult.data || {
            pms_current_stock: 0, ago_current_stock: 0, pms_minimum_stock: 0, ago_minimum_stock: 0,
            pms_capacity: 0, ago_capacity: 0, pms_received: 0, ago_received: 0,
            pms_sold: 0, ago_sold: 0, pms_variance: 0, ago_variance: 0,
          },
          tank_dipping: dippingResult.data || { pms_tanks: [], ago_tanks: [] },
        },
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching full station report:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get summary for all stations
  async getAllStationsSummary(date: string): Promise<ApiResponse<{ stations: StationReport[]; summary: ReportsSummary }>> {
    try {
      const stationsResult = await this.getStations();
      if (!stationsResult.success || !stationsResult.data) {
        return { data: null, error: 'Failed to fetch stations', success: false };
      }

      const stationNames = stationsResult.data.map((s: any) => s.name).filter(Boolean);
      const reports = await Promise.all(
        stationNames.map((name: string) => this.getFullStationReport(name, date))
      );

      const validReports = reports
        .filter(r => r.success && r.data)
        .map(r => r.data!);

      const summary: ReportsSummary = {
        total_sales_cdf: validReports.reduce((sum, r) => sum + r.sales.total_cdf, 0),
        total_sales_usd: validReports.reduce((sum, r) => sum + r.sales.total_usd, 0),
        total_expenses_cdf: validReports.reduce((sum, r) => sum + r.expenses.total_cdf, 0),
        total_expenses_usd: validReports.reduce((sum, r) => sum + r.expenses.total_usd, 0),
        total_cash_flow_cdf: validReports.reduce((sum, r) => sum + r.cash_flow.closing_cash_cdf, 0),
        total_cash_flow_usd: validReports.reduce((sum, r) => sum + r.cash_flow.closing_cash_usd, 0),
        total_stations: validReports.length,
      };

      return {
        data: { stations: validReports, summary },
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching all stations summary:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }
}

export const reportsService = new ReportsService();
export default reportsService;