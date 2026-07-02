import { supabase } from '../config/supabase';
import { 
  PumpReading,
  PumpReadingWithPump,
  FuelTypeSalesSummary,
  StationDailyReport,
  ApiResponse 
} from '../types';

class PumpReadingService {
  // Get pump readings for a specific date
  async getPumpReadingsByDate(pumpId: string, date: string): Promise<ApiResponse<PumpReading[]>> {
    try {
      const { data, error } = await supabase
        .from('pump_readings')
        .select('*')
        .eq('pump_id', pumpId)
        .eq('reading_date', date)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching pump readings:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get latest pump reading for a pump
  async getLatestPumpReading(pumpId: string): Promise<ApiResponse<PumpReading | null>> {
    try {
      const { data, error } = await supabase
        .from('pump_readings')
        .select('*')
        .eq('pump_id', pumpId)
        .order('reading_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
        throw error;
      }

      return {
        data: data || null,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching latest pump reading:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get yesterday's pump reading for a pump (closing reading from previous day)
  async getYesterdayPumpReading(pumpId: string, todayDate: string): Promise<ApiResponse<PumpReading | null>> {
    try {
      // Calculate yesterday's date
      const today = new Date(todayDate);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('pump_readings')
        .select('*')
        .eq('pump_id', pumpId)
        .eq('reading_date', yesterdayDate)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        data: data || null,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching yesterday pump reading:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Create new pump reading
  async createPumpReading(reading: Omit<PumpReading, 'id' | 'created_at' | 'updated_at' | 'daily_sales'>): Promise<ApiResponse<PumpReading>> {
    try {
      // Calculate daily sales
      const dailySales = reading.today_reading - reading.yesterday_reading;
      
      const readingData = {
        ...reading,
        daily_sales: dailySales,
      };

      const { data, error } = await supabase
        .from('pump_readings')
        .insert([readingData])
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error creating pump reading:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Update pump reading
  async updatePumpReading(id: string, updates: Partial<PumpReading>): Promise<ApiResponse<PumpReading>> {
    try {
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // If today_reading or yesterday_reading is being updated, recalculate daily_sales
      if (updates.today_reading !== undefined || updates.yesterday_reading !== undefined) {
        const { data: currentReading } = await supabase
          .from('pump_readings')
          .select('today_reading, yesterday_reading')
          .eq('id', id)
          .single();

        if (currentReading) {
          const newToday = updates.today_reading ?? currentReading.today_reading;
          const newYesterday = updates.yesterday_reading ?? currentReading.yesterday_reading;
          updateData.daily_sales = newToday - newYesterday;
        }
      }

      const { data, error } = await supabase
        .from('pump_readings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error updating pump reading:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Delete pump reading
  async deletePumpReading(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('pump_readings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error deleting pump reading:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get pump readings for a date range
  async getPumpReadingsByDateRange(pumpId: string, startDate: string, endDate: string): Promise<ApiResponse<PumpReading[]>> {
    try {
      const { data, error } = await supabase
        .from('pump_readings')
        .select('*')
        .eq('pump_id', pumpId)
        .gte('reading_date', startDate)
        .lte('reading_date', endDate)
        .order('reading_date', { ascending: true });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching pump readings by date range:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get all pump readings for a station on a specific date (with pump info)
  async getStationPumpReadings(stationId: string, date: string): Promise<ApiResponse<PumpReadingWithPump[]>> {
    try {
      // Get all pumps for the station
      const { data: pumps, error: pumpsError } = await supabase
        .from('pumps')
        .select('*')
        .eq('station_id', stationId)
        .eq('is_active', true)
        .order('pump_number', { ascending: true });

      if (pumpsError) throw pumpsError;

      if (!pumps || pumps.length === 0) {
        return {
          data: [],
          error: null,
          success: true,
        };
      }

      // Get readings for all pumps on this date
      const pumpIds = pumps.map(p => p.id);
      const { data: readings, error: readingsError } = await supabase
        .from('pump_readings')
        .select('*')
        .in('pump_id', pumpIds)
        .eq('reading_date', date)
        .order('reading_date', { ascending: true });

      if (readingsError) throw readingsError;

      // Merge pump info into readings
      const readingsWithPump: PumpReadingWithPump[] = (pumps || []).map(pump => {
        const reading = (readings || []).find(r => r.pump_id === pump.id);
        return {
          id: reading?.id || '',
          pump_id: pump.id,
          reading_date: date,
          today_reading: reading?.today_reading || 0,
          yesterday_reading: reading?.yesterday_reading || 0,
          daily_sales: reading?.daily_sales || 
            ((reading?.today_reading || 0) - (reading?.yesterday_reading || 0)),
          recorded_by: reading?.recorded_by || '',
          notes: reading?.notes || '',
          created_at: reading?.created_at || new Date().toISOString(),
          pump_name: pump.name,
          pump_number: pump.pump_number,
          fuel_type: pump.fuel_type,
        };
      });

      return {
        data: readingsWithPump,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching station pump readings:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Save batch pump readings for a station
  async saveStationPumpReadings(
    readings: { pump_id: string; today_reading: number; yesterday_reading: number; recorded_by: string }[],
    date?: string
  ): Promise<ApiResponse<PumpReading[]>> {
    try {
      const results: PumpReading[] = [];
      const readingDate = date || new Date().toISOString().split('T')[0];

      for (const reading of readings) {
        const dailySales = reading.today_reading - reading.yesterday_reading;
        
        // Check if a reading already exists for this pump and date
        const todayDate = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase
          .from('pump_readings')
          .select('*')
          .eq('pump_id', reading.pump_id)
          .eq('reading_date', readingDate)
          .single();

        if (existing) {
          // Update existing reading
          const { data, error } = await supabase
            .from('pump_readings')
            .update({
              today_reading: reading.today_reading,
              yesterday_reading: reading.yesterday_reading,
              daily_sales: dailySales,
              recorded_by: reading.recorded_by,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          if (data) results.push(data);
        } else {
          // Create new reading
          const { data, error } = await supabase
            .from('pump_readings')
            .insert([{
              pump_id: reading.pump_id,
              reading_date: readingDate,
              today_reading: reading.today_reading,
              yesterday_reading: reading.yesterday_reading,
              daily_sales: dailySales,
              recorded_by: reading.recorded_by,
            }])
            .select()
            .single();

          if (error) throw error;
          if (data) results.push(data);
        }
      }

      return {
        data: results,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error saving station pump readings:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get station daily report with validation
  async getStationDailyReport(
    stationId: string,
    stationName: string,
    date: string,
    tanks: { id: string; name: string; fuel_type: string; current_dipping: number; capacity: number; pumps: string[] }[],
    tankDippingReadings: { [tankId: string]: { previous_dip: number; current_dip: number; offload: number } }
  ): Promise<ApiResponse<StationDailyReport>> {
    try {
      // Get pump readings
      const pumpReadingsResult = await this.getStationPumpReadings(stationId, date);
      if (!pumpReadingsResult.success || !pumpReadingsResult.data) {
        throw new Error(pumpReadingsResult.error || 'Failed to fetch pump readings');
      }

      const pumpReadings = pumpReadingsResult.data;

      // Calculate fuel type summaries
      const fuelSummaries: FuelTypeSalesSummary[] = [];
      const fuelTypes = ['PMS', 'AGO'] as const;
      const validationMessages: string[] = [];

      for (const fuelType of fuelTypes) {
        // Get pumps of this fuel type
        const fuelPumps = pumpReadings.filter(p => p.fuel_type === fuelType);
        const totalPumpSales = fuelPumps.reduce((sum, p) => sum + p.daily_sales, 0);

        // Get tanks of this fuel type
        const fuelTanks = tanks.filter(t => t.fuel_type === fuelType);
        
        let previousClosingDip = 0;
        let currentDip = 0;
        let offloadQuantity = 0;
        let totalTankConsumption = 0;

        if (fuelTanks.length > 0) {
          for (const tank of fuelTanks) {
            const dippingData = tankDippingReadings[tank.id];
            if (dippingData) {
              previousClosingDip += dippingData.previous_dip;
              currentDip += dippingData.current_dip;
              offloadQuantity += dippingData.offload;
            } else {
              // No dipping data - use tank's current_dipping as initial
              previousClosingDip += tank.current_dipping;
              currentDip += tank.current_dipping;
            }
          }

          // Tank consumption = previous_dip + offloads - current_dip
          totalTankConsumption = previousClosingDip + offloadQuantity - currentDip;
        }

        const discrepancy = totalPumpSales - totalTankConsumption;
        const hasError = Math.abs(discrepancy) > 0.5; // Allow 0.5L rounding tolerance
        const expectedClosingDip = previousClosingDip + offloadQuantity - totalPumpSales;

        if (hasError && (fuelPumps.length > 0 || fuelTanks.length > 0)) {
          validationMessages.push(
            `${fuelType}: Total pump sales (${totalPumpSales.toFixed(2)}L) ` +
            `does not match tank consumption (${totalTankConsumption.toFixed(2)}L). ` +
            `Discrepancy: ${discrepancy.toFixed(2)}L. ` +
            `Please verify pump and dipping readings.`
          );
        }

        fuelSummaries.push({
          fuel_type: fuelType,
          total_pump_sales: totalPumpSales,
          total_tank_consumption: totalTankConsumption,
          offload_quantity: offloadQuantity,
          discrepancy,
          has_error: hasError,
          previous_closing_dip: previousClosingDip,
          current_dip: currentDip,
          expected_closing_dip: expectedClosingDip,
        });
      }

      // Build tank dipping readings with tank info
      const tankDippingsWithInfo = tanks.map(tank => {
        const dippingData = tankDippingReadings[tank.id];
        return {
          id: '',
          tank_id: tank.id,
          reading_date: date,
          dipping_reading: dippingData?.current_dip || tank.current_dipping,
          book_stock: dippingData?.previous_dip || 0,
          variance: (dippingData?.current_dip || tank.current_dipping) - (dippingData?.previous_dip || 0),
          recorded_by: '',
          notes: '',
          created_at: new Date().toISOString(),
          tank_name: tank.name,
          tank_number: tanks.indexOf(tank) + 1,
          fuel_type: tank.fuel_type as any,
          capacity: tank.capacity,
          pumps: tank.pumps,
        };
      });

      const totalLitresSold = pumpReadings.reduce((sum, p) => sum + p.daily_sales, 0);

      return {
        data: {
          station_id: stationId,
          station_name: stationName,
          reading_date: date,
          pump_readings: pumpReadings,
          tank_dippings: tankDippingsWithInfo,
          fuel_summaries: fuelSummaries,
          total_litres_sold: totalLitresSold,
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
}

export const pumpReadingService = new PumpReadingService();