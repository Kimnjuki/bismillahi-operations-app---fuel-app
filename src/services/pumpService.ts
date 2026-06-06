import { supabase } from '../config/supabase';
import { 
  Pump, 
  PumpFuelType,
  ApiResponse 
} from '../types';

class PumpService {
  // Get all pumps for a station
  async getPumpsByStation(stationId: string): Promise<ApiResponse<Pump[]>> {
    try {
      const { data, error } = await supabase
        .from('pumps')
        .select('*')
        .eq('station_id', stationId)
        .eq('is_active', true)
        .order('pump_number', { ascending: true });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching pumps:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get all pumps
  async getAllPumps(): Promise<ApiResponse<Pump[]>> {
    try {
      const { data, error } = await supabase
        .from('pumps')
        .select('*')
        .eq('is_active', true)
        .order('station_id', { ascending: true })
        .order('pump_number', { ascending: true });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching all pumps:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Create new pump
  async createPump(pump: Omit<Pump, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Pump>> {
    try {
      const { data, error } = await supabase
        .from('pumps')
        .insert([pump])
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error creating pump:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Update pump
  async updatePump(id: string, updates: Partial<Pump>): Promise<ApiResponse<Pump>> {
    try {
      const { data, error } = await supabase
        .from('pumps')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
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
      console.error('Error updating pump:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Delete pump (soft delete)
  async deletePump(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('pumps')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error deleting pump:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get fuel type options
  getFuelTypeOptions(): { value: PumpFuelType; label: string; description: string }[] {
    return [
      { value: 'PMS', label: 'PMS', description: 'Premium Motor Spirit (Petrol)' },
      { value: 'AGO', label: 'AGO', description: 'Automotive Gas Oil (Diesel)' },
      { value: 'DPK', label: 'DPK', description: 'Dual Purpose Kerosene' },
      { value: 'LPG', label: 'LPG', description: 'Liquefied Petroleum Gas' },
    ];
  }

  // Get next pump number for a station
  async getNextPumpNumber(stationId: string): Promise<ApiResponse<number>> {
    try {
      const { data, error } = await supabase
        .from('pumps')
        .select('pump_number')
        .eq('station_id', stationId)
        .eq('is_active', true)
        .order('pump_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      const nextNumber = data && data.length > 0 ? data[0].pump_number + 1 : 1;

      return {
        data: nextNumber,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error getting next pump number:', error);
      return {
        data: 1,
        error: null,
        success: true,
      };
    }
  }
}

export const pumpService = new PumpService();
