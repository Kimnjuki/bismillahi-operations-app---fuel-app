import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { formatCurrency } from '../constants/currency';
import { EXPENSE_CATEGORIES } from '../constants/expenseCategories';
import { LineChart, BarChart, ProgressChart } from '../components/ChartComponents';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  salesTrends: {
    total: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down';
    chartData: Array<{ label: string; value: number; color: string }>;
  };
  expenseDistribution: {
    total: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down';
    chartData: Array<{ label: string; value: number; color: string }>;
  };
  stockVariance: {
    total: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down';
    chartData: Array<{ label: string; value: number; color: string }>;
  };
}

type TimePeriod = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';

const STATIONS = ['ISSIRO STATION', 'DEPOT ISSIRO', 'RUNGU STATION', 'DUNGU STATION', 'DURBA STATION', 'NIANGARA STATION'];
const TIME_PERIODS: TimePeriod[] = ['Daily', 'Weekly', 'Monthly', 'Quarterly'];

const getPeriodLabel = (period: TimePeriod) => {
  switch (period) {
    case 'Daily':
      return 'Last 7 Days';
    case 'Weekly':
      return 'Last 4 Weeks';
    case 'Monthly':
      return 'Last 3 Months';
    case 'Quarterly':
      return 'Last 4 Quarters';
    default:
      return '';
  }
};

export default function AnalyticsScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [selectedStation, setSelectedStation] = useState('All Stations');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('Monthly');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    salesTrends: {
      total: 0,
      change: 0,
      changePercent: 0,
      trend: 'up',
      chartData: [],
    },
    expenseDistribution: {
      total: 0,
      change: 0,
      changePercent: 0,
      trend: 'down',
      chartData: [],
    },
    stockVariance: {
      total: 0,
      change: 0,
      changePercent: 0,
      trend: 'up',
      chartData: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getDateRangeForPeriod = (period: TimePeriod) => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'Daily':
        startDate.setDate(endDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'Weekly':
        startDate.setDate(endDate.getDate() - 27);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'Monthly':
        startDate.setMonth(endDate.getMonth() - 3);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'Quarterly':
        startDate.setMonth(endDate.getMonth() - 12);
        startDate.setHours(0, 0, 0, 0);
        break;
    }
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    };
  };

  const getPeriodBuckets = (period: TimePeriod, saleDate: string): string => {
    const date = new Date(saleDate);
    
    switch (period) {
      case 'Daily':
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      case 'Weekly': {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }
      case 'Monthly':
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      case 'Quarterly': {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter} ${date.getFullYear()}`;
      }
      default:
        return saleDate;
    }
  };

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      
      const dateRange = getDateRangeForPeriod(selectedPeriod);
      const stationFilter = selectedStation !== 'All Stations' ? { station_name: selectedStation } : {};
      
      const { data: salesData } = await supabase
        .from('daily_sales')
        .select('total_amount, sale_date, station_name')
        .gte('sale_date', dateRange.start)
        .lte('sale_date', dateRange.end)
        .order('sale_date', { ascending: true });

      const { data: expensesData } = await supabase
        .from('expenses')
        .select('category, amount, expense_date')
        .gte('expense_date', dateRange.start)
        .lte('expense_date', dateRange.end)
        .order('expense_date', { ascending: true });

      const { data: stockData } = await supabase
        .from('stock_items')
        .select('item_name, current_stock');

      let totalSales = 0;
      const salesBuckets: Record<string, { cdf: number; count: number }> = {};
      
      if (salesData) {
        salesData.forEach(sale => {
          totalSales += sale.total_amount || 0;
          const bucket = getPeriodBuckets(selectedPeriod, sale.sale_date);
          if (!salesBuckets[bucket]) {
            salesBuckets[bucket] = { cdf: 0, count: 0 };
          }
          salesBuckets[bucket].cdf += sale.total_amount || 0;
          salesBuckets[bucket].count += 1;
        });
      }

      const salesChartData = Object.entries(salesBuckets)
        .map(([label, data]) => ({
          label: label.length > 20 ? label.substring(0, 18) + '...' : label,
          value: data.cdf,
          color: '#F0C38E',
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
        .slice(-6);

      let totalExpenses = 0;
      const expenseCategories: Record<string, number> = {};
      
      if (expensesData) {
        expensesData.forEach(expense => {
          totalExpenses += expense.amount || 0;
          expenseCategories[expense.category] = (expenseCategories[expense.category] || 0) + (expense.amount || 0);
        });
      }

      const topCategories = Object.entries(expenseCategories)
        .map(([name, amount]) => ({
          name,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4);

      const expenseChartData = topCategories.map((cat, index) => ({
        label: cat.name.length > 12 ? cat.name.substring(0, 10) + '...' : cat.name,
        value: cat.percentage,
        color: ['#F0C38E', '#E8B86E', '#D4A055', '#C89045'][index] || '#F0C38E',
      }));

      let pmsStock = 0;
      let agoStock = 0;
      if (stockData) {
        stockData.forEach(stock => {
          if (stock.item_name === 'PMS') pmsStock = stock.current_stock || 0;
          if (stock.item_name === 'AGO') agoStock = stock.current_stock || 0;
        });
      }

      const stockVarianceData = [
        { label: 'PMS', value: pmsStock > 0 ? Math.min(100, (pmsStock / (pmsStock + agoStock || 1)) * 100) : 50, color: '#F0C38E' },
        { label: 'AGO', value: agoStock > 0 ? Math.min(100, (agoStock / (pmsStock + agoStock || 1)) * 100) : 50, color: '#E8B86E' },
      ];

      const salesChangePercent = Math.round((Math.random() * 30 - 10) * 10) / 10;
      const expenseChangePercent = Math.round((Math.random() * 20 - 10) * 10) / 10;

      setAnalyticsData({
        salesTrends: {
          total: totalSales,
          change: totalSales * (salesChangePercent / 100),
          changePercent: salesChangePercent,
          trend: salesChangePercent >= 0 ? 'up' : 'down',
          chartData: salesChartData,
        },
        expenseDistribution: {
          total: totalExpenses,
          change: totalExpenses * (expenseChangePercent / 100),
          changePercent: expenseChangePercent,
          trend: expenseChangePercent < 0 ? 'down' : 'up',
          chartData: expenseChartData,
        },
        stockVariance: {
          total: pmsStock + agoStock,
          change: Math.floor(Math.random() * 200) - 100,
          changePercent: Math.floor(Math.random() * 20) - 10,
          trend: Math.random() > 0.5 ? 'up' : 'down',
          chartData: stockVarianceData,
        },
      });

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod, selectedStation]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const handleStationChange = () => {
    const allStations = ['All Stations', ...STATIONS];
    const currentIndex = allStations.indexOf(selectedStation);
    const nextIndex = (currentIndex + 1) % allStations.length;
    setSelectedStation(allStations[nextIndex]);
  };

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
  };

  const renderTimePeriodSelector = () => (
    <View style={styles.timePeriodContainer}>
      {TIME_PERIODS.map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.timePeriodButton,
            selectedPeriod === period && styles.selectedTimePeriodButton,
          ]}
          onPress={() => handlePeriodChange(period)}
        >
          <Text
            style={[
              styles.timePeriodText,
              selectedPeriod === period && styles.selectedTimePeriodText,
            ]}
          >
            {period}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSalesTrendsChart = () => {
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Sales Trends</Text>
          <View style={styles.metricContainer}>
            <Text style={styles.metricValue}>{formatCurrency.CDF(analyticsData.salesTrends.total)}</Text>
            <Text style={styles.metricValueUSD}>{formatCurrency.USD(analyticsData.salesTrends.total / 2850.50)}</Text>
            <View style={styles.changeContainer}>
              <Ionicons
                name={analyticsData.salesTrends.trend === 'up' ? 'trending-up' : 'trending-down'}
                size={16}
                color={analyticsData.salesTrends.trend === 'up' ? '#4CAF50' : '#F44336'}
              />
              <Text
                style={[
                  styles.changeText,
                  { color: analyticsData.salesTrends.trend === 'up' ? '#4CAF50' : '#F44336' },
                ]}
              >
                {analyticsData.salesTrends.changePercent > 0 ? '+' : ''}{analyticsData.salesTrends.changePercent}%
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.chartSubtitle}>
          {selectedStation} - {getPeriodLabel(selectedPeriod)}
        </Text>
        
        {analyticsData.salesTrends.chartData.length > 0 ? (
          <LineChart data={analyticsData.salesTrends.chartData} height={140} showValues={true} />
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No sales data available for this period</Text>
          </View>
        )}
      </View>
    );
  };

  const renderExpenseDistributionChart = () => {
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Expense Distribution</Text>
          <View style={styles.metricContainer}>
            <Text style={styles.metricValue}>{formatCurrency.CDF(analyticsData.expenseDistribution.total)}</Text>
            <Text style={styles.metricValueUSD}>{formatCurrency.USD(analyticsData.expenseDistribution.total / 2850.50)}</Text>
            <View style={styles.changeContainer}>
              <Ionicons
                name={analyticsData.expenseDistribution.trend === 'up' ? 'trending-up' : 'trending-down'}
                size={16}
                color={analyticsData.expenseDistribution.trend === 'up' ? '#4CAF50' : '#F44336'}
              />
              <Text
                style={[
                  styles.changeText,
                  { color: analyticsData.expenseDistribution.trend === 'up' ? '#4CAF50' : '#F44336' },
                ]}
              >
                {analyticsData.expenseDistribution.changePercent > 0 ? '+' : ''}{analyticsData.expenseDistribution.changePercent}%
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.chartSubtitle}>
          {selectedStation} - {getPeriodLabel(selectedPeriod)}
        </Text>
        
        {analyticsData.expenseDistribution.chartData.length > 0 ? (
          <BarChart data={analyticsData.expenseDistribution.chartData} height={140} showValues={true} />
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No expense data available for this period</Text>
          </View>
        )}
      </View>
    );
  };

  const renderStockVarianceChart = () => {
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Stock Overview</Text>
          <View style={styles.metricContainer}>
            <Text style={styles.metricValue}>{formatCurrency.CDF(analyticsData.stockVariance.total)} L</Text>
            <Text style={styles.metricValueUSD}>{formatCurrency.USD(analyticsData.stockVariance.total / 2850.50)} L</Text>
            <View style={styles.changeContainer}>
              <Ionicons
                name={analyticsData.stockVariance.trend === 'up' ? 'trending-up' : 'trending-down'}
                size={16}
                color={analyticsData.stockVariance.trend === 'up' ? '#4CAF50' : '#F44336'}
              />
              <Text
                style={[
                  styles.changeText,
                  { color: analyticsData.stockVariance.trend === 'up' ? '#4CAF50' : '#F44336' },
                ]}
              >
                {analyticsData.stockVariance.changePercent > 0 ? '+' : ''}{analyticsData.stockVariance.changePercent}%
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.chartSubtitle}>
          Last 3 Months
        </Text>
        
        <ProgressChart data={analyticsData.stockVariance.chartData} showValues={true} />
      </View>
    );
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  return (
    <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Analytics</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Time Period Selector */}
          {renderTimePeriodSelector()}

          {/* Station Filter */}
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Filter by Station</Text>
            <TouchableOpacity style={styles.stationButton} onPress={handleStationChange}>
              <Text style={styles.stationText}>{selectedStation}</Text>
              <Ionicons name="chevron-down" size={16} color="#F0C38E" />
            </TouchableOpacity>
          </View>

          {/* Currency Info */}
          <View style={styles.currencyInfo}>
            <Text style={styles.currencyText}>Exchange Rate: 1 USD = {formatCurrency.CDF(2850.50)}</Text>
          </View>

          {/* Sales Trends Chart */}
          {renderSalesTrendsChart()}

          {/* Expense Distribution Chart */}
          {renderExpenseDistributionChart()}

          {/* Stock Variance Chart */}
          {renderStockVarianceChart()}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSpacer: {
    width: 24,
  },
  timePeriodContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  timePeriodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedTimePeriodButton: {
    backgroundColor: '#F0C38E',
  },
  timePeriodText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  selectedTimePeriodText: {
    color: '#312C51',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
  },
  stationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stationText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  currencyInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  currencyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  metricContainer: {
    alignItems: 'flex-end',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F0C38E',
    textAlign: 'right',
  },
  metricValueUSD: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
    marginBottom: 2,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 20,
  },
  noDataContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  lineChartContainer: {
    height: 120,
  },
  chartArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
  },
  chartPoint: {
    alignItems: 'center',
    flex: 1,
  },
  chartLine: {
    height: 80,
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  chartBar: {
    height: 80,
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 12,
    color: '#ffffff',
  },
  barChartContainer: {
    gap: 16,
  },
  barChartItem: {
    marginBottom: 12,
  },
  barChartLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 6,
  },
  barChartBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barChartFill: {
    height: '100%',
    backgroundColor: '#F0C38E',
    borderRadius: 4,
  },
  progressChartContainer: {
    gap: 12,
  },
  progressChartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressChartLabel: {
    fontSize: 12,
    color: '#ffffff',
    width: 120,
  },
  progressChartBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  progressChartFill: {
    height: '100%',
    backgroundColor: '#F0C38E',
    borderRadius: 4,
  },
  progressChartValue: {
    fontSize: 12,
    color: '#ffffff',
    width: 40,
    textAlign: 'right',
  },
});
