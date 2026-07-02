import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { useOffline } from './useOffline';
import { useCallback, useMemo } from 'react';

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  currency?: string;
  memo?: string;
  receipt_image?: string;
  expense_date: string;
  created_by: string;
  station_id?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
}

export interface ExpensesFilter {
  stationId?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

/**
 * Hook for fetching paginated expenses with React Query caching
 */
export function useExpenses(
  filter: ExpensesFilter = {},
  page: number = 1,
  options?: Omit<UseQueryOptions<PaginatedResult<Expense>>, 'queryKey'>
) {
  const { appUser } = useAuth();
  const { isOnline } = useOffline();
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => [
    'expenses',
    filter.stationId || 'all',
    filter.category || 'all',
    filter.dateFrom || 'all',
    filter.dateTo || 'all',
    filter.searchQuery || 'all',
    page,
  ], [filter, page]);

  const fetchExpenses = useCallback(async (): Promise<PaginatedResult<Expense>> => {
    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact', head: false })
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    // Apply filters
    if (filter.stationId) {
      query = query.eq('station_id', filter.stationId);
    }
    if (filter.category) {
      query = query.eq('category', filter.category);
    }
    if (filter.dateFrom) {
      query = query.gte('expense_date', filter.dateFrom);
    }
    if (filter.dateTo) {
      query = query.lte('expense_date', filter.dateTo);
    }
    if (filter.searchQuery) {
      const search = `%${filter.searchQuery}%`;
      query = query.or(
        `description.ilike.${search},category.ilike.${search},memo.ilike.${search}`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }

    return {
      data: data || [],
      count: count || 0,
      hasMore: ((page) * PAGE_SIZE) < (count || 0),
      page,
      pageSize: PAGE_SIZE,
    };
  }, [filter, page]);

  const query = useQuery({
    queryKey,
    queryFn: fetchExpenses,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!appUser?.id,
    ...options,
  });

  // Prefetch next page for instant navigation
  const prefetchNext = useCallback(() => {
    if (query.data?.hasMore) {
      queryClient.prefetchQuery({
        queryKey: [...queryKey.slice(0, -1), page + 1],
        queryFn: fetchExpenses,
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [queryClient, queryKey, page, fetchExpenses, query.data?.hasMore]);

  return {
    ...query,
    expenses: query.data?.data || [],
    totalCount: query.data?.count || 0,
    hasMore: query.data?.hasMore || false,
    pageSize: PAGE_SIZE,
    prefetchNext,
    isOnline,
  };
}

/**
 * Hook for mutating (creating/updating) expenses with optimistic updates
 */
export function useExpenseMutations(stationId?: string) {
  const queryClient = useQueryClient();
  const { appUser } = useAuth();

  // Create expense with optimistic update
  const createExpense = useMutation({
    mutationFn: async (expenseData: Omit<Expense, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          ...expenseData,
          created_by: appUser?.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onMutate: async (newExpense) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['expenses'] });

      // Snapshot previous value
      const previousQueries = queryClient.getQueriesData({ queryKey: ['expenses'] });

      // Optimistically update all expense caches
      queryClient.setQueriesData({ queryKey: ['expenses'] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: [
            {
              ...newExpense,
              id: 'temp-' + Date.now(),
              created_by: appUser?.id,
              created_at: new Date().toISOString(),
            },
            ...old.data,
          ],
          count: (old.count || 0) + 1,
        };
      });

      return { previousQueries };
    },

    onError: (err, newExpense, context) => {
      // Rollback on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },

    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      if (stationId) {
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats', stationId] });
      }
    },
  });

  // Update expense
  const updateExpense = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Expense> & { id: string }) => {
      const { error } = await supabase
        .from('expenses')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  // Delete expense
  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['expenses'] });

      const previousQueries = queryClient.getQueriesData({ queryKey: ['expenses'] });

      queryClient.setQueriesData({ queryKey: ['expenses'] }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((e: Expense) => e.id !== id),
          count: (old.count || 0) - 1,
        };
      });

      return { previousQueries };
    },

    onError: (err, id, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  return {
    createExpense,
    updateExpense,
    deleteExpense,
  };
}

/**
 * Hook for fetching expense summary by category
 */
export function useExpenseSummary(filter: ExpensesFilter = {}) {
  const { appUser } = useAuth();

  return useQuery({
    queryKey: ['expenses', 'summary', filter],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('category, amount, currency')
        .not('category', 'is', null);

      if (filter.stationId) {
        query = query.eq('station_id', filter.stationId);
      }
      if (filter.dateFrom) {
        query = query.gte('expense_date', filter.dateFrom);
      }
      if (filter.dateTo) {
        query = query.lte('expense_date', filter.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by category
      const totals: Record<string, { totalCDF: number; count: number }> = {};
      (data || []).forEach((expense: any) => {
        const cat = expense.category || 'Uncategorized';
        if (!totals[cat]) {
          totals[cat] = { totalCDF: 0, count: 0 };
        }
        totals[cat].totalCDF += expense.amount || 0;
        totals[cat].count += 1;
      });

      return Object.entries(totals)
        .map(([category, stats]) => ({
          category,
          totalCDF: stats.totalCDF,
          count: stats.count,
        }))
        .sort((a, b) => b.totalCDF - a.totalCDF);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!appUser?.id,
  });
}