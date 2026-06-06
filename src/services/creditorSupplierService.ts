import { supabase } from '../config/supabase';
import { 
  Creditor, 
  Supplier, 
  CreditorSupplierSummary, 
  CreditorSupplierType,
  ApiResponse 
} from '../types';

class CreditorSupplierService {
  // Creditors
  async getCreditors(): Promise<ApiResponse<Creditor[]>> {
    try {
      const { data, error } = await supabase
        .from('creditors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching creditors:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async createCreditor(creditor: Omit<Creditor, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Creditor>> {
    try {
      const { data, error } = await supabase
        .from('creditors')
        .insert([creditor])
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error creating creditor:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async updateCreditor(id: string, updates: Partial<Creditor>): Promise<ApiResponse<Creditor>> {
    try {
      const { data, error } = await supabase
        .from('creditors')
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
      console.error('Error updating creditor:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async deleteCreditor(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('creditors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error deleting creditor:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Suppliers
  async getSuppliers(): Promise<ApiResponse<Supplier[]>> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async createSupplier(supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Supplier>> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([supplier])
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error creating supplier:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
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
      console.error('Error updating supplier:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async deleteSupplier(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Summary
  async getCreditorSupplierSummary(): Promise<ApiResponse<CreditorSupplierSummary>> {
    try {
      // Get creditors summary
      const { data: creditors } = await supabase
        .from('creditors')
        .select('id');

      // Get suppliers summary
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id');

      const summary: CreditorSupplierSummary = {
        total_creditors: creditors?.length || 0,
        total_suppliers: suppliers?.length || 0,
      };

      return {
        data: summary,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching creditor supplier summary:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Search functionality
  async searchCreditors(query: string): Promise<ApiResponse<Creditor[]>> {
    try {
      const { data, error } = await supabase
        .from('creditors')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error searching creditors:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async searchSuppliers(query: string): Promise<ApiResponse<Supplier[]>> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error searching suppliers:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }
}

export const creditorSupplierService = new CreditorSupplierService();
