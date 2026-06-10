import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { useOffline } from './useOffline';

interface DashboardStats {
  todaySales: number;
  todayExpenses: number;
  stockAlerts: number;
  pendingTransfers: number;
  monthlyGrowth: number;
  totalTransactions: number;
}

// Fetch dashboard stats with caching via TanStack Query
const fetchDashboardStats = async (userId: string | undefined): Promise<DashboardStats> => {
  if (!userId) {
    return {
      todaySales: 0,
      todayExpenses: 0,
      stockAlerts: 0,
      pendingTransfers: 0,
      monthlyGrowth: 0,
      totalTransactions: 0,
    };
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Fetch today's sales
  const { data: salesData } = await supabase
    .from('daily_sales')
    .select('total_amount')
    .gte('sale_date', today);

  const todaySales = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;

  // Fetch today's expenses
  const { data: expensesData } = await supabase
    .from('expenses')
    .select('amount')
    .gte('expense_date', today);

  const todayExpenses = expensesData?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;

  // Fetch stock alerts
  const { data: stockData } = await supabase
    .from('stock_items')
    .select('current_stock, minimum_stock');

  const stockAlerts = stockData?.filter(item => 
    (item.current_stock || 0) < (item.minimum_stock || 0)
  ).length || 0;

  // Fetch pending transfers
  const { data: transfersData } = await supabase
    .from('fund_transfers')
    .select('id')
    .in('status', ['pending', 'completed']);

  const pendingTransfers = transfersData?.length || 0;

  return {
    todaySales,
    todayExpenses,
    stockAlerts,
    pendingTransfers,
    monthlyGrowth: 12.5,
    totalTransactions: (salesData?.length || 0) + (expensesData?.length || 0),
  };
};

const fetchNotifications = async (userId: string) => {
  return notificationService.loadNotifications();
};

// Hook for dashboard data
export const useDashboardData = (
  options?: Omit<UseQueryOptions<DashboardStats>, 'queryKey'>
) => {
  const { appUser } = useAuth();
  const { isOnline } = useOffline();

  const statsQuery = useQuery({
    queryKey: ['dashboard-stats', appUser?.id],
    queryFn: () => fetchDashboardStats(appUser?.id),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
    enabled: !!appUser?.id,
    ...options,
  });

  const notificationsQuery = useQuery({
    queryKey: ['notifications', appUser?.id],
    queryFn: () => fetchNotifications(appUser?.id as string),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!appUser?.id,
  });

  return {
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    statsError: statsQuery.error,
    notifications: notificationsQuery.data || [],
    notificationsLoading: notificationsQuery.isLoading,
    refetch: () => {
      statsQuery.refetch();
      notificationsQuery.refetch();
    },
    isOnline,
  };
};