import { supabase } from '../config/supabase';
import { 
  Station, 
  StationSettings, 
  SystemType,
  ApiResponse 
} from '../types';

class StationService {
  // Get all stations
  async getStations(): Promise<ApiResponse<Station[]>> {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .eq('is_active', true)
        .order('station_name', { ascending: true });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching stations:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get station settings
  async getStationSettings(): Promise<ApiResponse<StationSettings | null>> {
    try {
      const { data, error } = await supabase
        .from('station_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return {
        data: data || null,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching station settings:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Update station settings
  async updateStationSettings(settings: Omit<StationSettings, 'updated_by'> & { updated_by: string }): Promise<ApiResponse<StationSettings>> {
    try {
      const { data, error } = await supabase
        .from('station_settings')
        .upsert([
          {
            ...settings,
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error updating station settings:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Create new station
  async createStation(station: Omit<Station, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Station>> {
    try {
      const { data, error } = await supabase
        .from('stations')
        .insert([station])
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error creating station:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Update station
  async updateStation(id: string, updates: Partial<Station>): Promise<ApiResponse<Station>> {
    try {
      const { data, error } = await supabase
        .from('stations')
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
      console.error('Error updating station:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Delete station
  async deleteStation(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('stations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error deleting station:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get system type options
  getSystemTypeOptions(): { value: SystemType; label: string }[] {
    return [
      { value: 'pump', label: 'Pump System' },
      { value: 'drum', label: 'Drum System' },
    ];
  }
}

export const stationService = new StationService();




