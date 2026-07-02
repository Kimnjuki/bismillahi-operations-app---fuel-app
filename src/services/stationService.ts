import { supabase } from '../config/supabase';
import { 
  Station, 
  StationSettings, 
  SystemType,
  StationCapabilities,
  StationConfiguration,
  DEFAULT_CAPABILITIES,
  DEFAULT_CONFIGURATION,
  ApiResponse 
} from '../types';

class StationService {
  // Map DB rows to include name/code aliases for UI consumers
  private normalizeStation(row: any): any {
    return {
      ...row,
      name: row.station_name,
      code: row.station_code,
    };
  }

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
        data: (data || []).map(row => this.normalizeStation(row)),
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

  // Get all stations including inactive
  async getAllStations(): Promise<ApiResponse<Station[]>> {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .order('station_name', { ascending: true });

      if (error) throw error;

      return {
        data: (data || []).map(row => this.normalizeStation(row)),
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching all stations:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get station settings with enhanced features
  async getStationSettings(stationId?: string): Promise<ApiResponse<StationSettings | null>> {
    try {
      let query = supabase
        .from('station_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (stationId) {
        query = query.eq('selected_station_id', stationId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') throw error;

      // If no settings found in DB, return defaults
      if (!data) {
        return {
          data: {
            selected_station_id: stationId || '',
            system_type: 'pump',
            usd_support: true,
            updated_by: '',
            updated_at: new Date().toISOString(),
            capabilities: DEFAULT_CAPABILITIES,
            configuration: DEFAULT_CONFIGURATION,
            is_active: true,
            maintenance_mode: false,
          },
          error: null,
          success: true,
        };
      }

      // Parse JSON fields if stored as strings
      const settings: StationSettings = {
        selected_station_id: data.selected_station_id,
        system_type: data.system_type || 'pump',
        usd_support: data.usd_support ?? true,
        updated_by: data.updated_by || '',
        updated_at: data.updated_at,
        capabilities: this.parseCapabilities(data.capabilities),
        configuration: this.parseConfiguration(data.configuration),
        is_active: data.is_active ?? true,
        maintenance_mode: data.maintenance_mode ?? false,
        notes: data.notes || '',
      };

      return {
        data: settings,
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

  // Update station settings with enhanced features
  async updateStationSettings(settings: StationSettings): Promise<ApiResponse<StationSettings>> {
    try {
      const dbRecord = {
        selected_station_id: settings.selected_station_id,
        system_type: settings.system_type,
        usd_support: settings.usd_support,
        updated_by: settings.updated_by,
        updated_at: new Date().toISOString(),
        capabilities: settings.capabilities,
        configuration: settings.configuration,
        is_active: settings.is_active,
        maintenance_mode: settings.maintenance_mode,
        notes: settings.notes || '',
      };

      const { data, error } = await supabase
        .from('station_settings')
        .upsert([dbRecord])
        .select()
        .single();

      if (error) throw error;

      return {
        data: {
          ...settings,
          updated_at: data.updated_at,
        },
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

  // Parse capabilities from DB (handles both JSON and string formats)
  private parseCapabilities(capabilities: any): StationCapabilities {
    if (!capabilities) return { ...DEFAULT_CAPABILITIES };
    
    if (typeof capabilities === 'string') {
      try {
        capabilities = JSON.parse(capabilities);
      } catch {
        return { ...DEFAULT_CAPABILITIES };
      }
    }

    return {
      ...DEFAULT_CAPABILITIES,
      ...capabilities,
    };
  }

  // Parse configuration from DB (handles both JSON and string formats)
  private parseConfiguration(configuration: any): StationConfiguration {
    if (!configuration) return { ...DEFAULT_CONFIGURATION };
    
    if (typeof configuration === 'string') {
      try {
        configuration = JSON.parse(configuration);
      } catch {
        return { ...DEFAULT_CONFIGURATION };
      }
    }

    return {
      ...DEFAULT_CONFIGURATION,
      ...configuration,
    };
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

export const SAMPLE_STATIONS: Station[] = [
  {
    id: '1',
    name: 'ISSIRO STATION',
    code: 'ISS001',
    station_name: 'ISSIRO STATION',
    station_code: 'ISS001',
    location: 'Issiro, DRC',
    system_type: 'pump',
    usd_support: true,
    is_active: true,
    created_by: '',
    created_at: '',
    capacity_liters: 10000,
    current_stock: 7500,
  },
  {
    id: '2',
    name: 'DEPOT ISSIRO',
    code: 'DEP001',
    station_name: 'DEPOT ISSIRO',
    station_code: 'DEP001',
    location: 'Issiro Depot, DRC',
    system_type: 'pump',
    usd_support: true,
    is_active: true,
    created_by: '',
    created_at: '',
    capacity_liters: 15000,
    current_stock: 10000,
  },
  {
    id: '3',
    name: 'RUNGU STATION',
    code: 'RUN001',
    station_name: 'RUNGU STATION',
    station_code: 'RUN001',
    location: 'Rungu, DRC',
    system_type: 'pump',
    usd_support: true,
    is_active: true,
    created_by: '',
    created_at: '',
    capacity_liters: 8000,
    current_stock: 5000,
  },
  {
    id: '4',
    name: 'DURBA STATION',
    code: 'DUR001',
    station_name: 'DURBA STATION',
    station_code: 'DUR001',
    location: 'Durba, DRC',
    system_type: 'pump',
    usd_support: true,
    is_active: true,
    created_by: '',
    created_at: '',
    capacity_liters: 12000,
    current_stock: 8000,
  },
  {
    id: '5',
    name: 'DUNGU STATION',
    code: 'DUN001',
    station_name: 'DUNGU STATION',
    station_code: 'DUN001',
    location: 'Dungu, DRC',
    system_type: 'pump',
    usd_support: true,
    is_active: true,
    created_by: '',
    created_at: '',
    capacity_liters: 10000,
    current_stock: 6000,
  },
  {
    id: '6',
    name: 'NIANGARA STATION',
    code: 'NIA001',
    station_name: 'NIANGARA STATION',
    station_code: 'NIA001',
    location: 'Niangara, DRC',
    system_type: 'pump',
    usd_support: true,
    is_active: true,
    created_by: '',
    created_at: '',
    capacity_liters: 8000,
    current_stock: 4500,
  },
];

export const stationService = new StationService();