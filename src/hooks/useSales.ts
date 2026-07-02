import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { useOffline } from './useOffline';
import { useCallback, useMemo } from 'react';

export interface Sale {
  id: string;
  station_id?: string;
  fuel_type_id?: string;
  quantity?: number;
  unit_price?: number;
  amount: number;
  currency?: string;
  tax_amount?: number;
  sale_date: string;
  status?: string;
  created_by?: string;
  customer_id?: string;
  created_at?: string;
  updated_at?: string;
  payment_method?: string;
}

export interface SalesFilter {
  stationId?: string;
  fuelTypeId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
}

const SALES_PAGE_SIZE = 20;

/**
 * Hook for fetching paginated sales records
 */
export function useSales(
  filter: SalesFilter = {},
  page: number = 1,
  options?: Omit<UseQueryOptions<PaginatedResult<Sale>>, 'queryKey'>
) {
  const { appUser } = useAuth();
  const { isOnline } = useOffline();

  const queryKey = useMemo(() => [
    'sales',
    filter.stationId || 'all',
    filter.fuelTypeId || 'all',
    filter.dateFrom || 'all',
    filter.dateTo || 'all',
    filter.status || 'all',
    page,
  ], [filter, page]);

  const fetchSales = useCallback(async (): Promise<PaginatedResult<Sale>> => {
    let query = supabase
      .from('sales')
      .select('*', { count: 'exact', head: false })
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range((page - 1) * SALES_PAGE_SIZE, page * SALES_PAGE_SIZE - 1);

    if (filter.stationId) {
      query = query.eq('station_id', filter.stationId);
    }
    if (filter.fuelTypeId) {
      query = query.eq('fuel_type_id', filter.fuelTypeId);
    }
    if (filter.dateFrom) {
      query = query.gte('sale_date', filter.dateFrom);
    }
    if (filter.dateTo) {
      query = query.lte('sale_date', filter.dateTo);
    }
    if (filter.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching sales:', error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
      hasMore: ((page) * SALES_PAGE_SIZE) < (count || 0),
      page,
      pageSize: SALES_PAGE_SIZE,
    };
  }, [filter, page]);

  const query = useQuery({
    queryKey,
    queryFn: fetchSales,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!appUser?.id,
    ...options,
  });

  return {
    ...query,
    sales: query.data?.data || [],
    totalCount: query.data?.count || 0,
    hasMore: query.data?.hasMore || false,
    pageSize: SALES_PAGE_SIZE,
  };
}

/**
 * Hook for sales mutations with optimistic updates
 */
export function useSalesMutations(stationId?: string) {
  const queryClient = useQueryClient();
  const { appUser } = useAuth();

  const createSale = useMutation({
    mutationFn: async (saleData: Omit<Sale, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('sales')
        .insert({
          ...saleData,
          created_by: appUser?.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onMutate: async (newSale) => {
      await queryClient.cancelQueries({ queryKey: ['sales'] });
      const previousQueries = queryClient.getQueriesData({ queryKey: ['sales'] });

      queryClient.setQueriesData({ queryKey: ['sales'] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: [{
            ...newSale,
            id: 'temp-' + Date.now(),
            created_by: appUser?.id,
            created_at: new Date().toISOString(),
          }, ...old.data],
          count: (old.count || 0) + 1,
        };
      });

      return { previousQueries };
    },

    onError: (err, newSale, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return { createSale };
}

/**
 * Hook for dashboard sales summary using materialized views
 */
export function useSalesSummary(stationId?: string, date?: string) {
  const { appUser } = useAuth();

  return useQuery({
    queryKey: ['sales', 'summary', stationId || 'all', date || 'today'],
    queryFn: async () => {
      // Try materialized view first, fall back to direct query
      const { data, error } = await supabase
        .from('mv_daily_sales_summary')
        .select('*')
        .eq('sale_date', date || new Date().toISOString().split('T')[0]);

      if (!error && data && data.length > 0) {
        return data;
      }

      // Fallback to direct query if MV not available
      const today = date || new Date().toISOString().split('T')[0];
      let query = supabase
        .from('sales')
        .select('*')
        .eq('sale_date', today)
        .eq('status', 'completed');

      if (stationId) {
        query = query.eq('station_id', stationId);
      }

      const { data: directData, error: directError } = await query;
      if (directError) throw directError;

      return directData || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!appUser?.id,
  });
}