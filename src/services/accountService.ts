import { supabase } from '../config/supabase';
import { 
  AccountReceivable, 
  AccountPayable, 
  AccountTransaction, 
  AccountSummary, 
  AccountStatus, 
  AccountType,
  ApiResponse 
} from '../types';

class AccountService {
  // Account Receivables
  async getAccountReceivables(): Promise<ApiResponse<AccountReceivable[]>> {
    try {
      const { data, error } = await supabase
        .from('account_receivables')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching account receivables:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async createAccountReceivable(account: Omit<AccountReceivable, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<AccountReceivable>> {
    try {
      const { data, error } = await supabase
        .from('account_receivables')
        .insert([account])
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error creating account receivable:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async updateAccountReceivable(id: string, updates: Partial<AccountReceivable>): Promise<ApiResponse<AccountReceivable>> {
    try {
      const { data, error } = await supabase
        .from('account_receivables')
        .update({ ...updates, updated_at: new Date().toISOString() })
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
      console.error('Error updating account receivable:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async deleteAccountReceivable(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('account_receivables')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error deleting account receivable:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Account Payables
  async getAccountPayables(): Promise<ApiResponse<AccountPayable[]>> {
    try {
      const { data, error } = await supabase
        .from('account_payables')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching account payables:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async createAccountPayable(account: Omit<AccountPayable, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<AccountPayable>> {
    try {
      const { data, error } = await supabase
        .from('account_payables')
        .insert([account])
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error creating account payable:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async updateAccountPayable(id: string, updates: Partial<AccountPayable>): Promise<ApiResponse<AccountPayable>> {
    try {
      const { data, error } = await supabase
        .from('account_payables')
        .update({ ...updates, updated_at: new Date().toISOString() })
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
      console.error('Error updating account payable:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async deleteAccountPayable(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('account_payables')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error deleting account payable:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Account Summary
  async getAccountSummary(): Promise<ApiResponse<AccountSummary>> {
    try {
      // Get receivables summary
      const { data: receivables } = await supabase
        .from('account_receivables')
        .select('total_amount, status, currency');

      // Get payables summary
      const { data: payables } = await supabase
        .from('account_payables')
        .select('total_amount, status, currency');

      const totalReceivables = receivables?.reduce((sum, acc) => sum + (acc.total_amount || 0), 0) || 0;
      const totalPayables = payables?.reduce((sum, acc) => sum + (acc.total_amount || 0), 0) || 0;
      
      const overdueReceivables = receivables?.filter(acc => acc.status === 'overdue')
        .reduce((sum, acc) => sum + (acc.total_amount || 0), 0) || 0;
      
      const overduePayables = payables?.filter(acc => acc.status === 'overdue')
        .reduce((sum, acc) => sum + (acc.total_amount || 0), 0) || 0;
      
      const pendingReceivables = receivables?.filter(acc => acc.status === 'pending')
        .reduce((sum, acc) => sum + (acc.total_amount || 0), 0) || 0;
      
      const pendingPayables = payables?.filter(acc => acc.status === 'pending')
        .reduce((sum, acc) => sum + (acc.total_amount || 0), 0) || 0;

      const summary: AccountSummary = {
        total_receivables: totalReceivables,
        total_payables: totalPayables,
        overdue_receivables: overdueReceivables,
        overdue_payables: overduePayables,
        pending_receivables: pendingReceivables,
        pending_payables: pendingPayables,
        currency: 'CDF' as any, // Default currency
      };

      return {
        data: summary,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching account summary:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Account Transactions
  async getAccountTransactions(accountId: string, accountType: AccountType): Promise<ApiResponse<AccountTransaction[]>> {
    try {
      const { data, error } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('account_id', accountId)
        .eq('account_type', accountType)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching account transactions:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async createAccountTransaction(transaction: Omit<AccountTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<AccountTransaction>> {
    try {
      const { data, error } = await supabase
        .from('account_transactions')
        .insert([transaction])
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error creating account transaction:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Utility functions
  async updateAccountStatus(id: string, accountType: AccountType, status: AccountStatus): Promise<ApiResponse<boolean>> {
    try {
      const table = accountType === 'receivable' ? 'account_receivables' : 'account_payables';
      
      const { error } = await supabase
        .from(table)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error updating account status:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Check for overdue accounts
  async checkOverdueAccounts(): Promise<ApiResponse<{ receivables: number; payables: number }>> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check overdue receivables
      const { data: overdueReceivables } = await supabase
        .from('account_receivables')
        .select('id')
        .lt('due_date', today)
        .neq('status', 'paid')
        .neq('status', 'cancelled');

      // Check overdue payables
      const { data: overduePayables } = await supabase
        .from('account_payables')
        .select('id')
        .lt('due_date', today)
        .neq('status', 'paid')
        .neq('status', 'cancelled');

      // Update status to overdue
      if (overdueReceivables && overdueReceivables.length > 0) {
        await supabase
          .from('account_receivables')
          .update({ status: 'overdue' })
          .in('id', overdueReceivables.map(acc => acc.id));
      }

      if (overduePayables && overduePayables.length > 0) {
        await supabase
          .from('account_payables')
          .update({ status: 'overdue' })
          .in('id', overduePayables.map(acc => acc.id));
      }

      return {
        data: {
          receivables: overdueReceivables?.length || 0,
          payables: overduePayables?.length || 0,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error checking overdue accounts:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }
}

export const accountService = new AccountService();
