import { supabase } from '../config/supabase';
import { 
  FuelDelivery, 
  Transporter, 
  Station, 
  TaxPayment, 
  TruckTransaction, 
  FuelStock,
  DeliverySummary,
  DeliveryStatus,
  PaymentStatus,
  TransactionType,
  ApiResponse 
} from '../types';

interface TruckDeliveredSummary {
  truck_id: string;
  transporter_name: string;
  station_name: string;
  total_liters: number;
  deliveries_count: number;
  first_delivery_date: string;
  last_delivery_date: string;
  products: string[];
}

class FuelDeliveryService {
  // Fuel Deliveries
  async getFuelDeliveries(): Promise<ApiResponse<FuelDelivery[]>> {
    try {
      const { data, error } = await supabase
        .from('fuel_deliveries')
        .select('*')
        .order('delivery_date', { ascending: false });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching fuel deliveries:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async createFuelDelivery(delivery: Omit<FuelDelivery, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<FuelDelivery>> {
    try {
      const { data, error } = await supabase
        .from('fuel_deliveries')
        .insert([delivery])
        .select()
        .single();

      if (error) throw error;

      await this.updateFuelStock(delivery.station_id, delivery.product, delivery.quantity_liters);

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error creating fuel delivery:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async updateFuelDelivery(id: string, updates: Partial<FuelDelivery>): Promise<ApiResponse<FuelDelivery>> {
    try {
      const { data, error } = await supabase
        .from('fuel_deliveries')
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
      console.error('Error updating fuel delivery:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async deleteFuelDelivery(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('fuel_deliveries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error deleting fuel delivery:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Transporters
  async getTransporters(): Promise<ApiResponse<Transporter[]>> {
    try {
      const { data, error } = await supabase
        .from('transporters')
        .select('*')
        .eq('is_active', true)
        .order('transporter_name', { ascending: true });

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching transporters:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async createTransporter(transporter: Omit<Transporter, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Transporter>> {
    try {
      const { data, error } = await supabase
        .from('transporters')
        .insert([transporter])
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error creating transporter:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async updateTransporter(id: string, updates: Partial<Transporter>): Promise<ApiResponse<Transporter>> {
    try {
      const { data, error } = await supabase
        .from('transporters')
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
      console.error('Error updating transporter:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async deleteTransporter(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('transporters')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error deleting transporter:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Stations
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

  // Tax Payments
  async getTaxPayments(stationId?: string, truckId?: string): Promise<ApiResponse<TaxPayment[]>> {
    try {
      let query = supabase
        .from('tax_payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (stationId) {
        query = query.eq('station_id', stationId);
      }

      if (truckId) {
        query = query.eq('truck_id', truckId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching tax payments:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async getTaxPaymentsByStation(stationId: string): Promise<ApiResponse<TaxPayment[]>> {
    return this.getTaxPayments(stationId);
  }

  async getTaxPaymentsByTruck(truckId: string): Promise<ApiResponse<TaxPayment[]>> {
    return this.getTaxPayments(undefined, truckId);
  }

  async createTaxPayment(payment: Omit<TaxPayment, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<TaxPayment>> {
    try {
      const { data, error } = await supabase
        .from('tax_payments')
        .insert([payment])
        .select()
        .single();

      if (error) throw error;

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error creating tax payment:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Truck Transactions
  async getTruckTransactions(truckId?: string): Promise<ApiResponse<TruckTransaction[]>> {
    try {
      let query = supabase
        .from('truck_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (truckId) {
        query = query.eq('truck_id', truckId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching truck transactions:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async createTruckTransaction(transaction: Omit<TruckTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<TruckTransaction>> {
    try {
      const { data, error } = await supabase
        .from('truck_transactions')
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
      console.error('Error creating truck transaction:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Fuel Stock
  async getFuelStock(stationId?: string): Promise<ApiResponse<FuelStock[]>> {
    try {
      let query = supabase
        .from('fuel_stock')
        .select('*')
        .order('last_updated', { ascending: false });

      if (stationId) {
        query = query.eq('station_id', stationId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        data: data || [],
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching fuel stock:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async updateFuelStock(stationId: string, product: string, quantity: number): Promise<ApiResponse<FuelStock>> {
    try {
      const { data: currentStock } = await supabase
        .from('fuel_stock')
        .select('*')
        .eq('station_id', stationId)
        .eq('product', product)
        .single();

      if (currentStock) {
        const newStock = currentStock.current_stock + quantity;
        const { data, error } = await supabase
          .from('fuel_stock')
          .update({
            current_stock: newStock,
            last_updated: new Date().toISOString(),
          })
          .eq('id', currentStock.id)
          .select()
          .single();

        if (error) throw error;

        return {
          data,
          error: null,
          success: true,
        };
      } else {
        const { data, error } = await supabase
          .from('fuel_stock')
          .insert([{
            station_id: stationId,
            product,
            current_stock: quantity,
            capacity: 100000,
            last_updated: new Date().toISOString(),
            updated_by: 'system'
          }])
          .select()
          .single();

        if (error) throw error;

        return {
          data,
          error: null,
          success: true,
        };
      }
    } catch (error) {
      console.error('Error updating fuel stock:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Delivery Summary
  async getDeliverySummary(): Promise<ApiResponse<DeliverySummary>> {
    try {
      const { data: deliveries } = await supabase
        .from('fuel_deliveries')
        .select('*');

      if (!deliveries) {
        return {
          data: {
            total_deliveries: 0,
            total_volume: 0,
            total_payments_cdf: 0,
            total_payments_usd: 0,
            pending_deliveries: 0,
            in_transit_deliveries: 0,
          },
          error: null,
          success: true,
        };
      }

      const summary: DeliverySummary = {
        total_deliveries: deliveries.length,
        total_volume: deliveries.reduce((sum, delivery) => sum + delivery.quantity_liters, 0),
        total_payments_cdf: deliveries.reduce((sum, delivery) => sum + (delivery.isse_vurra_cdf || 0), 0),
        total_payments_usd: deliveries.reduce((sum, delivery) => sum + (delivery.isse_vurra_usd || 0), 0),
        pending_deliveries: deliveries.filter(d => d.status === 'pending').length,
        in_transit_deliveries: deliveries.filter(d => d.status === 'in_transit').length,
      };

      return {
        data: summary,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching delivery summary:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async getTrucksDelivered(transporterId?: string): Promise<ApiResponse<TruckDeliveredSummary[]>> {
    try {
      let query = supabase
        .from('fuel_deliveries')
        .select('truck_id, quantity_liters, delivery_date, station_id, transporter_id, product');

      if (transporterId) {
        query = query.eq('transporter_id', transporterId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        return { data: [], error: null, success: true };
      }

      const grouped: Record<string, TruckDeliveredSummary> = {};

      data.forEach((delivery: any) => {
        const truckId = delivery.truck_id;
        const stationName = delivery.station?.station_name || 'Unknown Station';
        const transporterName = delivery.transporter?.transporter_name || 'Unknown Transporter';

        if (!grouped[truckId]) {
          grouped[truckId] = {
            truck_id: truckId,
            transporter_name: transporterName,
            station_name: stationName,
            total_liters: 0,
            deliveries_count: 0,
            first_delivery_date: delivery.delivery_date,
            last_delivery_date: delivery.delivery_date,
            products: [],
          };
        }

        grouped[truckId].total_liters += Number(delivery.quantity_liters) || 0;
        grouped[truckId].deliveries_count += 1;
        grouped[truckId].first_delivery_date = delivery.delivery_date < grouped[truckId].first_delivery_date
          ? delivery.delivery_date
          : grouped[truckId].first_delivery_date;
        grouped[truckId].last_delivery_date = delivery.delivery_date > grouped[truckId].last_delivery_date
          ? delivery.delivery_date
          : grouped[truckId].last_delivery_date;

        if (delivery.product && !grouped[truckId].products.includes(delivery.product)) {
          grouped[truckId].products.push(delivery.product);
        }
      });

      return {
        data: Object.values(grouped),
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error fetching trucks delivered:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Utility functions
  async updateDeliveryStatus(id: string, status: DeliveryStatus): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('fuel_deliveries')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error updating delivery status:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  async updatePaymentStatus(id: string, status: PaymentStatus): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('tax_payments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      return {
        data: true,
        error: null,
        success: true,
      };
    } catch (error) {
      console.error('Error updating payment status:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }
}

export const fuelDeliveryService = new FuelDeliveryService();










