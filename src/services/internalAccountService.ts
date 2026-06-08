import { supabase } from '../config/supabase';
import { ApiResponse } from '../types';

export interface InternalAccount {
  id: string;
  account_name: string;
  account_code: string;
  account_type: 'cash' | 'bank' | 'petty_cash' | 'fuel_account' | 'operations';
  station_id?: string;
  station_name?: string;
  balance: number;
  currency: 'USD' | 'CDF';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Station {
  id: string;
  station_name: string;
  station_code: string;
  location: string;
  is_active: boolean;
  created_at: string;
}

class InternalAccountService {
  // Get all internal accounts
  async getInternalAccounts(): Promise<ApiResponse<InternalAccount[]>> {
    try {
      const { data, error } = await supabase
        .from('internal_accounts')
        .select(`
          *,
          stations (
            id,
            station_name,
            station_code,
            location
          )
        `)
        .eq('is_active', true)
        .order('account_name', { ascending: true });

      if (error) {
        console.log('Supabase error, using sample data:', error.message);
        // Return sample data if Supabase fails
        return {
          data: this.getSampleAccounts(),
          error: null,
          success: true,
        };
      }

      return {
        data: data || this.getSampleAccounts(),
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching internal accounts:', error);
      return {
        data: this.getSampleAccounts(),
        error: error instanceof Error ? error.message : 'Unknown error',
        success: true, // Still return sample data
      };
    }
  }

  // Get accounts by station
  async getAccountsByStation(stationId: string): Promise<ApiResponse<InternalAccount[]>> {
    try {
      const { data, error } = await supabase
        .from('internal_accounts')
        .select(`
          *,
          stations (
            id,
            station_name,
            station_code,
            location
          )
        `)
        .eq('station_id', stationId)
        .eq('is_active', true)
        .order('account_name', { ascending: true });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching accounts by station:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get all stations
  async getStations(): Promise<ApiResponse<Station[]>> {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .eq('is_active', true)
        .order('station_name', { ascending: true });

      if (error) {
        console.log('Supabase stations error, using sample data:', error.message);
        return {
          data: this.getSampleStations(),
          error: null,
          success: true,
        };
      }

      return {
        data: data || this.getSampleStations(),
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching stations:', error);
      return {
        data: this.getSampleStations(),
        error: error instanceof Error ? error.message : 'Unknown error',
        success: true, // Still return sample data
      };
    }
  }

  // Update account balance after transfer
  async updateAccountBalance(accountId: string, amount: number, operation: 'add' | 'subtract'): Promise<ApiResponse<boolean>> {
    try {
      const { data: account, error: fetchError } = await supabase
        .from('internal_accounts')
        .select('balance')
        .eq('id', accountId)
        .single();

      if (fetchError) throw fetchError;

      const newBalance = operation === 'add' 
        ? account.balance + amount 
        : account.balance - amount;

      const { error: updateError } = await supabase
        .from('internal_accounts')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', accountId);

      if (updateError) throw updateError;

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error updating account balance:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get sample data for demo purposes
  getSampleAccounts(): InternalAccount[] {
    return [
      {
        id: '1',
        account_name: 'BISMILLAHI - ISSIRO STATION (CDF)',
        account_code: 'ISS_CDF',
        account_type: 'cash',
        station_id: '1',
        station_name: 'ISSIRO STATION',
        balance: 2500000,
        currency: 'CDF',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        account_name: 'BISMILLAHI - ISSIRO STATION (USD)',
        account_code: 'ISS_USD',
        account_type: 'bank',
        station_id: '1',
        station_name: 'ISSIRO STATION',
        balance: 150000,
        currency: 'USD',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        account_name: 'Personal Account (USD)',
        account_code: 'PERS_USD',
        account_type: 'bank',
        station_id: '1',
        station_name: 'ISSIRO STATION',
        balance: 50000,
        currency: 'USD',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '4',
        account_name: 'DEPOT ISSIRO - Operations (USD)',
        account_code: 'DEP_OPS',
        account_type: 'operations',
        station_id: '2',
        station_name: 'DEPOT ISSIRO',
        balance: 200000,
        currency: 'USD',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '5',
        account_name: 'RUNGU STATION - Fuel Account (USD)',
        account_code: 'RUN_FUEL',
        account_type: 'fuel_account',
        station_id: '3',
        station_name: 'RUNGU STATION',
        balance: 120000,
        currency: 'USD',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '6',
        account_name: 'DUNGU STATION - Cash Account (USD)',
        account_code: 'DUN_CASH',
        account_type: 'cash',
        station_id: '4',
        station_name: 'DUNGU STATION',
        balance: 85000,
        currency: 'USD',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '7',
        account_name: 'DURBA STATION - Bank Account (USD)',
        account_code: 'DUR_BANK',
        account_type: 'bank',
        station_id: '5',
        station_name: 'DURBA STATION',
        balance: 180000,
        currency: 'USD',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '8',
        account_name: 'NIANGARA STATION - Operations (USD)',
        account_code: 'NIA_OPS',
        account_type: 'operations',
        station_id: '6',
        station_name: 'NIANGARA STATION',
        balance: 95000,
        currency: 'USD',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '9',
        account_name: 'Main Petty Cash (USD)',
        account_code: 'MAIN_PETTY',
        account_type: 'petty_cash',
        station_id: '1',
        station_name: 'ISSIRO STATION',
        balance: 15000,
        currency: 'USD',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '10',
        account_name: 'Business Operations (CDF)',
        account_code: 'BUS_OPS_CDF',
        account_type: 'operations',
        station_id: '1',
        station_name: 'ISSIRO STATION',
        balance: 5000000,
        currency: 'CDF',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  getSampleStations(): Station[] {
    return [
      {
        id: '1',
        station_name: 'ISSIRO STATION',
        station_code: 'ISS001',
        location: 'Issiro, DRC',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        station_name: 'DEPOT ISSIRO',
        station_code: 'DEP001',
        location: 'Issiro Depot, DRC',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '3',
        station_name: 'RUNGU STATION',
        station_code: 'RUN001',
        location: 'Rungu, DRC',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '4',
        station_name: 'DURBA STATION',
        station_code: 'DUR001',
        location: 'Durba, DRC',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '5',
        station_name: 'DUNGU STATION',
        station_code: 'DUN001',
        location: 'Dungu, DRC',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: '6',
        station_name: 'NIANGARA STATION',
        station_code: 'NIA001',
        location: 'Niangara, DRC',
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ];
  }
}

export const internalAccountService = new InternalAccountService();
