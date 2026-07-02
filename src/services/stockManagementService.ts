import { supabase } from '../config/supabase';
import {
  ApiResponse,
  Tank,
  Pump,
  Station,
  PumpReadingWithPump,
  FuelTypeSalesSummary,
} from '../types';

// --- Interfaces for the redesigned stock dashboard ---

export interface StationStockOverview {
  station_id: string;
  station_name: string;
  station_code: string;
  location: string;
  pms: FuelStockDetail;
  ago: FuelStockDetail;
  last_updated: string;
  overall_status: 'normal' | 'low' | 'critical';
  tank_dipping: TankDippingSummary;
}

export interface FuelStockDetail {
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  tank_capacity: number;
  received_today: number;
  sold_today: number;
  variance: number;
  status: 'normal' | 'low' | 'critical' | 'excess';
  status_label: string;
  excess_short: number; // positive = excess, negative = short
  tank_dip: number; // current dipping reading
  book_stock: number; // closing book stock from dipping
  dip_variance: number; // tank_dip - book_stock
  expected_stock: number; // opening + received - sold
}

export interface TankDippingSummary {
  pms_tanks: TankDipInfo[];
  ago_tanks: TankDipInfo[];
  total_pms_dip: number;
  total_ago_dip: number;
}

export interface TankDipInfo {
  tank_id: string;
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
  fill_percentage: number;
  has_excess: boolean;
  has_shortage: boolean;
  excess_short_amount: number;
}

export interface DailyStockTransaction {
  id: string;
  station_id: string;
  station_name: string;
  transaction_date: string;
  pms_received: number;
  ago_received: number;
  pms_sold: number;
  ago_sold: number;
  pms_variance: number;
  ago_variance: number;
  pms_opening: number;
  ago_opening: number;
  pms_closing: number;
  ago_closing: number;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface StationDailyReportView {
  date: string;
  station_name: string;
  stock: StationStockOverview;
  transactions: DailyStockTransaction[];
  fuel_summaries: FuelTypeSalesSummary[];
  has_validation_errors: boolean;
  validation_messages: string[];
}

class StockManagementService {
  // Get all stations with current stock levels
  async getAllStationsStock(date?: string): Promise<ApiResponse<StationStockOverview[]>> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];

      // Get all active stations
      const { data: stations, error: stationError } = await supabase
        .from('stations')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (stationError) throw stationError;
      if (!stations || stations.length === 0) {
        return { data: [], error: 'No active stations found', success: false };
      }

      // Get all stock levels
      const stationIds = stations.map(s => s.id);
      const { data: stockLevels, error: stockError } = await supabase
        .from('stock_levels')
        .select('*')
        .in('station_id', stationIds);

      if (stockError && stockError.code !== 'PGRST116') throw stockError;

      // Get today's daily stock transactions
      const { data: dailyTransactions, error: txError } = await supabase
        .from('daily_stock_transactions')
        .select('*')
        .in('station_id', stationIds)
        .eq('transaction_date', targetDate);

      if (txError && txError.code !== 'PGRST116') throw txError;

      // Get all tanks with their current dipping
      const { data: tanks, error: tanksError } = await supabase
        .from('tanks')
        .select('*')
        .in('station_id', stationIds)
        .eq('is_active', true);

      if (tanksError && tanksError.code !== 'PGRST116') throw tanksError;

      // Get dipping readings for today
      const { data: dippingReadings, error: dipError } = await supabase
        .from('dipping_readings')
        .select('*')
        .eq('reading_date', targetDate);

      if (dipError && dipError.code !== 'PGRST116') throw dipError;

      // Build stock overview for each station
      const overviews: StationStockOverview[] = [];

      for (const station of stations) {
        const stationStockLevels = (stockLevels || []).filter(
          (sl: any) => sl.station_id === station.id
        );
        const stationTransactions = (dailyTransactions || []).filter(
          (tx: any) => tx.station_id === station.id
        );
        const stationTanks = (tanks || []).filter(
          (t: any) => t.station_id === station.id
        );

        // Process PMS stock
        const pmsStockLevel = stationStockLevels.find((sl: any) => sl.product_type === 'PMS');
        const pmsTransaction = stationTransactions.length > 0 ? stationTransactions[0] : null;
        const pmsTanks = stationTanks.filter((t: any) => t.fuel_type === 'PMS');
        const pmsDipReadings = (dippingReadings || []).filter(
          (dr: any) => pmsTanks.some((t: any) => t.id === dr.tank_id)
        );

        const pmsDetail = this.buildFuelStockDetail(
          'PMS',
          pmsStockLevel,
          pmsTransaction,
          pmsTanks,
          pmsDipReadings
        );

        // Process AGO stock
        const agoStockLevel = stationStockLevels.find((sl: any) => sl.product_type === 'AGO');
        const agoTransaction = stationTransactions.length > 0 ? stationTransactions[0] : null;
        const agoTanks = stationTanks.filter((t: any) => t.fuel_type === 'AGO');
        const agoDipReadings = (dippingReadings || []).filter(
          (dr: any) => agoTanks.some((t: any) => t.id === dr.tank_id)
        );

        const agoDetail = this.buildFuelStockDetail(
          'AGO',
          agoStockLevel,
          agoTransaction,
          agoTanks,
          agoDipReadings
        );

        // Determine overall status
        const overallStatus = this.getOverallStatus(pmsDetail.status, agoDetail.status);

        // Build tank dipping summary
        const pmsTankInfo = this.buildTankDipInfo(pmsTanks, dippingReadings || [], 'PMS');
        const agoTankInfo = this.buildTankDipInfo(agoTanks, dippingReadings || [], 'AGO');

        overviews.push({
          station_id: station.id,
          station_name: station.name,
          station_code: station.code || station.name.substring(0, 3).toUpperCase(),
          location: station.location || 'Unknown',
          pms: pmsDetail,
          ago: agoDetail,
          last_updated: new Date().toISOString(),
          overall_status: overallStatus,
          tank_dipping: {
            pms_tanks: pmsTankInfo,
            ago_tanks: agoTankInfo,
            total_pms_dip: pmsTankInfo.reduce((sum, t) => sum + t.current_dip, 0),
            total_ago_dip: agoTankInfo.reduce((sum, t) => sum + t.current_dip, 0),
          },
        });
      }

      return { data: overviews, error: null, success: true };
    } catch (error) {
      console.error('Error fetching all stations stock:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Build fuel stock detail for a specific product type
  private buildFuelStockDetail(
    fuelType: string,
    stockLevel: any,
    transaction: any,
    tanks: any[],
    dipReadings: any[]
  ): FuelStockDetail {
    const currentStock = stockLevel?.current_stock || 0;
    const minimumStock = stockLevel?.minimum_stock || 0;
    const maximumStock = stockLevel?.maximum_stock || 10000;
    const tankCapacity = tanks.reduce((sum, t) => sum + (t.capacity || 0), 0);

    const receivedToday = transaction
      ? parseFloat(fuelType === 'PMS' ? transaction.pms_received || 0 : transaction.ago_received || 0)
      : 0;
    const soldToday = transaction
      ? parseFloat(fuelType === 'PMS' ? transaction.pms_sold || 0 : transaction.ago_sold || 0)
      : 0;
    const variance = transaction
      ? parseFloat(fuelType === 'PMS' ? transaction.pms_variance || 0 : transaction.ago_variance || 0)
      : 0;

    // Calculate tank dip info
    const totalDip = tanks.reduce((sum, t) => sum + (t.current_dipping || 0), 0);
    const totalBookStock = tanks.reduce((sum, t) => sum + (t.closing_book_stock || 0), 0);
    const dipVariance = totalDip - totalBookStock;

    // Get expected stock: opening + received - sold
    const openingStock = currentStock - receivedToday + soldToday;
    const expectedStock = openingStock + receivedToday - soldToday;

    // Determine status
    const excessShort = currentStock - expectedStock;
    let status: 'normal' | 'low' | 'critical' | 'excess';
    let statusLabel: string;

    if (currentStock > maximumStock * 0.9) {
      status = 'excess';
      statusLabel = 'Excess Stock';
    } else if (currentStock <= minimumStock * 0.5 || currentStock <= 0) {
      status = 'critical';
      statusLabel = 'Critical Low';
    } else if (currentStock <= minimumStock) {
      status = 'low';
      statusLabel = 'Low Stock';
    } else {
      status = 'normal';
      statusLabel = 'Normal';
    }

    return {
      current_stock: currentStock,
      minimum_stock: minimumStock,
      maximum_stock: maximumStock,
      tank_capacity: tankCapacity,
      received_today: receivedToday,
      sold_today: soldToday,
      variance,
      status,
      status_label: statusLabel,
      excess_short: excessShort,
      tank_dip: totalDip,
      book_stock: totalBookStock,
      dip_variance: dipVariance,
      expected_stock: expectedStock,
    };
  }

  // Build tank dip info for display
  private buildTankDipInfo(tanks: any[], allDipReadings: any[], fuelType: string): TankDipInfo[] {
    return tanks.map(tank => {
      const todayDip = allDipReadings.find(
        (dr: any) => dr.tank_id === tank.id
      );
      const currentDip = todayDip?.dipping_reading || tank.current_dipping || 0;
      const previousDip = todayDip?.book_stock || tank.closing_book_stock || 0;
      const variance = currentDip - previousDip;
      const fillPercentage = tank.capacity > 0 ? (currentDip / tank.capacity) * 100 : 0;
      const excessShortAmount = currentDip - previousDip;

      return {
        tank_id: tank.id,
        tank_name: tank.name || `Tank ${tank.tank_number}`,
        tank_number: tank.tank_number || 0,
        fuel_type: tank.fuel_type || fuelType,
        capacity: tank.capacity || 0,
        previous_dip: previousDip,
        current_dip: currentDip,
        offload_quantity: 0,
        pump_sales: 0,
        expected_dip: previousDip, // simplified
        variance,
        fill_percentage: fillPercentage,
        has_excess: variance > 50, // more than 50L excess
        has_shortage: variance < -50, // more than 50L shortage
        excess_short_amount: variance,
      };
    });
  }

  // Determine overall station stock status
  private getOverallStatus(...statuses: string[]): 'normal' | 'low' | 'critical' {
    if (statuses.some(s => s === 'critical')) return 'critical';
    if (statuses.some(s => s === 'low')) return 'low';
    return 'normal';
  }

  // Get tank dipping details for a specific station
  async getStationTankDipping(
    stationId: string,
    date: string
  ): Promise<ApiResponse<TankDippingSummary>> {
    try {
      const { data: tanks, error: tankError } = await supabase
        .from('tanks')
        .select('*')
        .eq('station_id', stationId)
        .eq('is_active', true);

      if (tankError) throw tankError;

      // Get today's dipping readings
      const tankIds = (tanks || []).map(t => t.id);
      const { data: dipReadings, error: dipError } = await supabase
        .from('dipping_readings')
        .select('*')
        .in('tank_id', tankIds)
        .eq('reading_date', date);

      if (dipError && dipError.code !== 'PGRST116') throw dipError;

      const allDipReadings = dipReadings || [];
      const pmsTanks = this.buildTankDipInfo(
        (tanks || []).filter(t => t.fuel_type === 'PMS'),
        allDipReadings,
        'PMS'
      );
      const agoTanks = this.buildTankDipInfo(
        (tanks || []).filter(t => t.fuel_type === 'AGO'),
        allDipReadings,
        'AGO'
      );

      return {
        data: {
          pms_tanks: pmsTanks,
          ago_tanks: agoTanks,
          total_pms_dip: pmsTanks.reduce((s, t) => s + t.current_dip, 0),
          total_ago_dip: agoTanks.reduce((s, t) => s + t.current_dip, 0),
        },
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching station tank dipping:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get daily stock transactions for a station on a specific date
  async getDailyStockTransactions(
    stationId: string,
    date: string
  ): Promise<ApiResponse<DailyStockTransaction[]>> {
    try {
      const { data, error } = await supabase
        .from('daily_stock_transactions')
        .select('*')
        .eq('station_id', stationId)
        .eq('transaction_date', date)
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') throw error;

      return { data: data || [], error: null, success: true };
    } catch (error) {
      console.error('Error fetching daily stock transactions:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get daily stock transactions for all stations
  async getAllDailyStockTransactions(date: string): Promise<ApiResponse<DailyStockTransaction[]>> {
    try {
      const { data, error } = await supabase
        .from('daily_stock_transactions')
        .select(`
          *,
          stations:station_id (name, code)
        `)
        .eq('transaction_date', date)
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') throw error;

      const transactions = (data || []).map((tx: any) => ({
        ...tx,
        station_name: tx.stations?.name || 'Unknown',
      }));

      return { data: transactions, error: null, success: true };
    } catch (error) {
      console.error('Error fetching all daily stock transactions:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Save daily stock entry
  async saveDailyStockEntry(
    entry: {
      station_id: string;
      pms_received: number;
      ago_received: number;
      pms_sold: number;
      ago_sold: number;
      pms_variance: number;
      ago_variance: number;
      notes?: string;
    },
    userId: string
  ): Promise<ApiResponse<DailyStockTransaction>> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_stock_transactions')
        .insert([
          {
            station_id: entry.station_id,
            transaction_date: today,
            pms_received: entry.pms_received,
            ago_received: entry.ago_received,
            pms_sold: entry.pms_sold,
            ago_sold: entry.ago_sold,
            pms_variance: entry.pms_variance,
            ago_variance: entry.ago_variance,
            notes: entry.notes || '',
            created_by: userId,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return { data, error: null, success: true };
    } catch (error) {
      console.error('Error saving daily stock entry:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Auto-deduct stock based on pump sales for a given date
  async autoDeductFromSales(stationId: string, date: string): Promise<ApiResponse<{ pms_sold: number; ago_sold: number }>> {
    try {
      // Get pump readings for this station on this date
      const { data: pumps, error: pumpError } = await supabase
        .from('pumps')
        .select('id, fuel_type')
        .eq('station_id', stationId)
        .eq('is_active', true);

      if (pumpError) throw pumpError;
      if (!pumps || pumps.length === 0) {
        return { data: { pms_sold: 0, ago_sold: 0 }, error: null, success: true };
      }

      const pumpIds = pumps.map(p => p.id);
      const { data: readings, error: readError } = await supabase
        .from('pump_readings')
        .select('pump_id, daily_sales')
        .in('pump_id', pumpIds)
        .eq('reading_date', date);

      if (readError && readError.code !== 'PGRST116') throw readError;

      let pmsSold = 0;
      let agoSold = 0;

      if (readings) {
        for (const reading of readings) {
          const pump = pumps.find(p => p.id === reading.pump_id);
          if (pump?.fuel_type === 'PMS') {
            pmsSold += reading.daily_sales || 0;
          } else if (pump?.fuel_type === 'AGO') {
            agoSold += reading.daily_sales || 0;
          }
        }
      }

      return { data: { pms_sold: pmsSold, ago_sold: agoSold }, error: null, success: true };
    } catch (error) {
      console.error('Error auto-deducting from sales:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get full daily report for a station
  async getStationDailyReport(
    stationId: string,
    stationName: string,
    date: string
  ): Promise<ApiResponse<StationDailyReportView>> {
    try {
      const [stockResult, transactionsResult, tankDippingResult] = await Promise.all([
        this.getAllStationsStock(date),
        this.getDailyStockTransactions(stationId, date),
        this.getStationTankDipping(stationId, date),
      ]);

      const stationStock = (stockResult.data || []).find(s => s.station_id === stationId);
      const transactions = transactionsResult.data || [];
      const tankDipping = tankDippingResult.data;

      const validationMessages: string[] = [];

      // Generate validation messages
      if (stationStock) {
        if (stationStock.pms.status === 'critical') {
          validationMessages.push(`PMS stock is critically low (${stationStock.pms.current_stock.toFixed(2)}L). Minimum required: ${stationStock.pms.minimum_stock.toFixed(2)}L`);
        }
        if (stationStock.ago.status === 'critical') {
          validationMessages.push(`AGO stock is critically low (${stationStock.ago.current_stock.toFixed(2)}L). Minimum required: ${stationStock.ago.minimum_stock.toFixed(2)}L`);
        }
        if (stationStock.pms.status === 'excess') {
          validationMessages.push(`PMS stock is in excess (${stationStock.pms.current_stock.toFixed(2)}L). Consider reviewing delivery schedules.`);
        }
        if (stationStock.ago.status === 'excess') {
          validationMessages.push(`AGO stock is in excess (${stationStock.ago.current_stock.toFixed(2)}L). Consider reviewing delivery schedules.`);
        }

        // Check dip vs book stock variance
        if (Math.abs(stationStock.pms.dip_variance) > 50) {
          validationMessages.push(`PMS tank dip variance is significant: ${stationStock.pms.dip_variance >= 0 ? '+' : ''}${stationStock.pms.dip_variance.toFixed(2)}L. Please verify dipping readings.`);
        }
        if (Math.abs(stationStock.ago.dip_variance) > 50) {
          validationMessages.push(`AGO tank dip variance is significant: ${stationStock.ago.dip_variance >= 0 ? '+' : ''}${stationStock.ago.dip_variance.toFixed(2)}L. Please verify dipping readings.`);
        }
      }

      // Build fuel summaries
      const fuelSummaries: FuelTypeSalesSummary[] = [
        {
          fuel_type: 'PMS',
          total_pump_sales: stationStock?.pms.sold_today || 0,
          total_tank_consumption: 0,
          offload_quantity: stationStock?.pms.received_today || 0,
          discrepancy: (stationStock?.pms.sold_today || 0) - 0,
          has_error: (stationStock?.pms.excess_short || 0) !== 0,
          previous_closing_dip: stationStock?.pms.book_stock || 0,
          current_dip: stationStock?.pms.tank_dip || 0,
          expected_closing_dip: stationStock?.pms.expected_stock || 0,
        },
        {
          fuel_type: 'AGO',
          total_pump_sales: stationStock?.ago.sold_today || 0,
          total_tank_consumption: 0,
          offload_quantity: stationStock?.ago.received_today || 0,
          discrepancy: (stationStock?.ago.sold_today || 0) - 0,
          has_error: (stationStock?.ago.excess_short || 0) !== 0,
          previous_closing_dip: stationStock?.ago.book_stock || 0,
          current_dip: stationStock?.ago.tank_dip || 0,
          expected_closing_dip: stationStock?.ago.expected_stock || 0,
        },
      ];

      return {
        data: {
          date,
          station_name: stationName,
          stock: stationStock || {
            station_id: stationId,
            station_name: stationName,
            station_code: '',
            location: '',
            pms: this.getDefaultFuelDetail(),
            ago: this.getDefaultFuelDetail(),
            last_updated: new Date().toISOString(),
            overall_status: 'normal',
            tank_dipping: { pms_tanks: [], ago_tanks: [], total_pms_dip: 0, total_ago_dip: 0 },
          },
          transactions,
          fuel_summaries: fuelSummaries,
          has_validation_errors: validationMessages.length > 0,
          validation_messages: validationMessages,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error generating station daily report:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  private getDefaultFuelDetail(): FuelStockDetail {
    return {
      current_stock: 0,
      minimum_stock: 0,
      maximum_stock: 0,
      tank_capacity: 0,
      received_today: 0,
      sold_today: 0,
      variance: 0,
      status: 'normal',
      status_label: 'No Data',
      excess_short: 0,
      tank_dip: 0,
      book_stock: 0,
      dip_variance: 0,
      expected_stock: 0,
    };
  }
}

export const stockManagementService = new StockManagementService();
export default stockManagementService;