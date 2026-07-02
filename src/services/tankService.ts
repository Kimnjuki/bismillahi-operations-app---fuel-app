import { supabase } from '../config/supabase';
import { 
  Tank, 
  DippingReading,
  PumpFuelType,
  ApiResponse 
} from '../types';

class TankService {
  // Get all tanks for a station
  async getTanksByStation(stationId: string): Promise<ApiResponse<Tank[]>> {
    try {
      const { data, error } = await supabase
        .from('tanks')
        .select('*')
        .eq('station_id', stationId)
        .order('tank_number', { ascending: true });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching tanks:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get all tanks
  async getAllTanks(): Promise<ApiResponse<Tank[]>> {
    try {
      const { data, error } = await supabase
        .from('tanks')
        .select('*')
        .order('station_id', { ascending: true })
        .order('tank_number', { ascending: true });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching all tanks:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Create new tank
  async createTank(tank: Omit<Tank, 'id' | 'created_at' | 'updated_at' | 'variance'>): Promise<ApiResponse<Tank>> {
    try {
      const tankData = {
        ...tank,
        variance: tank.current_dipping - tank.closing_book_stock,
      };

      const { data, error } = await supabase
        .from('tanks')
        .insert([tankData])
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error creating tank:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Update tank
  async updateTank(id: string, updates: Partial<Tank>): Promise<ApiResponse<Tank>> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Recalculate variance if dipping or book stock is updated
      if (updates.current_dipping !== undefined || updates.closing_book_stock !== undefined) {
        const { data: currentTank } = await supabase
          .from('tanks')
          .select('current_dipping, closing_book_stock')
          .eq('id', id)
          .single();

        if (currentTank) {
          const newDipping = updates.current_dipping ?? currentTank.current_dipping;
          const newBookStock = updates.closing_book_stock ?? currentTank.closing_book_stock;
          updateData.variance = newDipping - newBookStock;
        }
      }

      const { data, error } = await supabase
        .from('tanks')
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
      console.error('Error updating tank:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Delete tank (soft delete)
  async deleteTank(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('tanks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error deleting tank:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Update dipping readings for multiple tanks
  async updateDippingReadings(
    tankReadings: { tankId: string; dippingReading: number }[],
    recordedBy: string,
    readingDate?: string,
  ): Promise<ApiResponse<DippingReading[]>> {
    try {
      const readings: Omit<DippingReading, 'id' | 'created_at' | 'updated_at'>[] = [];
      const tankUpdates: { id: string; current_dipping: number; variance: number }[] = [];
      const totals = new Map<string, number>();
      const readingDateStr = readingDate || new Date().toISOString().split('T')[0];

      for (const reading of tankReadings) {
        const { data: tank } = await supabase
          .from('tanks')
          .select('closing_book_stock, station_id, fuel_type')
          .eq('id', reading.tankId)
          .single();

        if (tank) {
          const variance = reading.dippingReading - tank.closing_book_stock;
          
          readings.push({
            tank_id: reading.tankId,
            reading_date: readingDateStr,
            dipping_reading: reading.dippingReading,
            book_stock: tank.closing_book_stock,
            variance: variance,
            recorded_by: recordedBy,
          });

          tankUpdates.push({
            id: reading.tankId,
            current_dipping: reading.dippingReading,
            variance: variance,
          });

          const key = `${tank.station_id}-${tank.fuel_type}`;
          totals.set(key, (totals.get(key) || 0) + reading.dippingReading);
        }
      }

      const { data: insertedReadings, error: readingsError } = await supabase
        .from('dipping_readings')
        .insert(readings)
        .select();

      if (readingsError) throw readingsError;

      for (const update of tankUpdates) {
        await supabase
          .from('tanks')
          .update({
            current_dipping: update.current_dipping,
            variance: update.variance,
            updated_at: new Date().toISOString(),
          })
          .eq('id', update.id);
      }

      for (const [key, totalDip] of totals.entries()) {
        const [stationId, fuelType] = key.split('-');
        await supabase
          .from('stock_levels')
          .update({
            current_stock: totalDip,
            last_updated: new Date().toISOString(),
            updated_by: recordedBy,
          })
          .eq('station_id', stationId)
          .eq('product_type', fuelType);
      }

      return {
        data: insertedReadings || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error updating dipping readings:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get dipping readings for a tank
  async getDippingReadings(tankId: string, limit: number = 30): Promise<ApiResponse<DippingReading[]>> {
    try {
      const { data, error } = await supabase
        .from('dipping_readings')
        .select('*')
        .eq('tank_id', tankId)
        .order('reading_date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching dipping readings:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get next tank number for a station
  async getNextTankNumber(stationId: string): Promise<ApiResponse<number>> {
    try {
      const { data, error } = await supabase
        .from('tanks')
        .select('tank_number')
        .eq('station_id', stationId)
        .order('tank_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      const nextNumber = data && data.length > 0 ? data[0].tank_number + 1 : 1;

      return {
        data: nextNumber,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error getting next tank number:', error);
      return {
        data: 1,
        error: null,
        success: true,
      };
    }
  }

  // Get fuel type options
  getFuelTypeOptions(): { value: PumpFuelType; label: string; description: string }[] {
     return [
       { value: 'PMS', label: 'PMS', description: 'Premium Motor Spirit (PMS)' },
       { value: 'AGO', label: 'AGO', description: 'Automotive Gas Oil (AGO)' },
     ];
  }
}

export const tankService = new TankService();




