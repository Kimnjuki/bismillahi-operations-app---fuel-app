import { supabase } from '../config/supabase';
import { ApiResponse, InternalAccount, Station, InternalAccountType } from '../types';

class InternalAccountService {
  // Get all internal accounts
  async getInternalAccounts(): Promise<ApiResponse<InternalAccount[]>> {
    try {
      const { data, error } = await supabase
        .from('internal_accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_name', { ascending: true });

      if (error) {
        console.log('Supabase error fetching accounts:', error.message);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching internal accounts:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Get accounts by station
  async getAccountsByStation(stationId: string): Promise<ApiResponse<InternalAccount[]>> {
    try {
      const { data, error } = await supabase
        .from('internal_accounts')
        .select('*')
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
        console.log('Supabase stations error:', error.message);
        return {
          data: null,
          error: error.message,
          success: false,
        };
      }

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
      { id: 'iss-cdf-ops', account_name: 'ISSIRO STATION',   account_code: 'ISS001_OPS_CDF', account_type: 'operating', station_id: '1', station_name: 'ISSIRO STATION',    balance: 12500000, currency: 'CDF', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'iss-usd-ops', account_name: 'ISSIRO STATION',   account_code: 'ISS001_OPS_USD', account_type: 'operating', station_id: '1', station_name: 'ISSIRO STATION',    balance: 45000,    currency: 'USD', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'dep-cdf-ops', account_name: 'DEPOT ISSIRO',     account_code: 'DEP001_OPS_CDF', account_type: 'operating', station_id: '2', station_name: 'DEPOT ISSIRO',      balance: 8250000,  currency: 'CDF', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'dep-usd-ops', account_name: 'DEPOT ISSIRO',     account_code: 'DEP001_OPS_USD', account_type: 'operating', station_id: '2', station_name: 'DEPOT ISSIRO',      balance: 38000,    currency: 'USD', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'run-cdf-ops', account_name: 'RUNGU STATION',    account_code: 'RUN001_OPS_CDF', account_type: 'operating', station_id: '3', station_name: 'RUNGU STATION',     balance: 5640000,  currency: 'CDF', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'run-usd-ops', account_name: 'RUNGU STATION',    account_code: 'RUN001_OPS_USD', account_type: 'operating', station_id: '3', station_name: 'RUNGU STATION',     balance: 22000,    currency: 'USD', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'dur-cdf-ops', account_name: 'DURBA STATION',    account_code: 'DUR001_OPS_CDF', account_type: 'operating', station_id: '4', station_name: 'DURBA STATION',     balance: 7380000,  currency: 'CDF', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'dur-usd-ops', account_name: 'DURBA STATION',    account_code: 'DUR001_OPS_USD', account_type: 'operating', station_id: '4', station_name: 'DURBA STATION',     balance: 31000,    currency: 'USD', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'dun-cdf-ops', account_name: 'DUNGU STATION',    account_code: 'DUN001_OPS_CDF', account_type: 'operating', station_id: '5', station_name: 'DUNGU STATION',     balance: 4100000,  currency: 'CDF', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'dun-usd-ops', account_name: 'DUNGU STATION',    account_code: 'DUN001_OPS_USD', account_type: 'operating', station_id: '5', station_name: 'DUNGU STATION',     balance: 18000,    currency: 'USD', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'nia-cdf-ops', account_name: 'NIANGARA STATION', account_code: 'NIA001_OPS_CDF', account_type: 'operating', station_id: '6', station_name: 'NIANGARA STATION',  balance: 2900000,  currency: 'CDF', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'nia-usd-ops', account_name: 'NIANGARA STATION', account_code: 'NIA001_OPS_USD', account_type: 'operating', station_id: '6', station_name: 'NIANGARA STATION',  balance: 12000,    currency: 'USD', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'trn-cdf-01', account_name: 'ON TRANSIT',       account_code: 'TRANSIT_CDF',    account_type: 'transit',   station_id: undefined, station_name: undefined,        balance: 3400000,  currency: 'CDF', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'trn-usd-01', account_name: 'ON TRANSIT',       account_code: 'TRANSIT_USD',    account_type: 'transit',   station_id: undefined, station_name: undefined,        balance: 15000,    currency: 'USD', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
  }

  getSampleStations(): Station[] {
    return [
      { id: '1', station_name: 'ISSIRO STATION',    station_code: 'ISS001', location: 'Issiro, DRC',      is_active: true, created_at: new Date().toISOString() },
      { id: '2', station_name: 'DEPOT ISSIRO',      station_code: 'DEP001', location: 'Issiro Depot, DRC', is_active: true, created_at: new Date().toISOString() },
      { id: '3', station_name: 'RUNGU STATION',     station_code: 'RUN001', location: 'Rungu, DRC',        is_active: true, created_at: new Date().toISOString() },
      { id: '4', station_name: 'DURBA STATION',     station_code: 'DUR001', location: 'Durba, DRC',        is_active: true, created_at: new Date().toISOString() },
      { id: '5', station_name: 'DUNGU STATION',     station_code: 'DUN001', location: 'Dungu, DRC',        is_active: true, created_at: new Date().toISOString() },
      { id: '6', station_name: 'NIANGARA STATION',  station_code: 'NIA001', location: 'Niangara, DRC',     is_active: true, created_at: new Date().toISOString() },
    ];
  }

  async createAccount(account: Omit<InternalAccount, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<ApiResponse<InternalAccount>> {
    try {
      const { data, error } = await supabase
        .from('internal_accounts')
        .insert([{
          account_name: account.account_name,
          account_code: account.account_code,
          account_type: account.account_type,
          station_id: account.station_id,
          balance: account.balance,
          currency: account.currency,
          is_active: account.is_active,
          created_by: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      return { data, error: null, success: true };
    } catch (error) {
      console.error('Error creating account:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error', success: false };
    }
  }

  async updateAccount(id: string, updates: Partial<InternalAccount>): Promise<ApiResponse<InternalAccount>> {
    try {
      const { data, error } = await supabase
        .from('internal_accounts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null, success: true };
    } catch (error) {
      console.error('Error updating account:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error', success: false };
    }
  }

  async deactivateAccount(id: string): Promise<ApiResponse<boolean>> {
    return this.updateAccount(id, { is_active: false }).then(r => ({ ...r, data: r.success }));
  }
}

export const internalAccountService = new InternalAccountService();
