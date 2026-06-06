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
    monthlyData: Array<{ month: string; value: number }>;
  };
  expenseDistribution: {
    total: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down';
    categories: Array<{ name: string; amount: number; percentage: number }>;
  };
  stockVariance: {
    total: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down';
    stations: Array<{ name: string; variance: number; percentage: number }>;
  };
}

type TimePeriod = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';

const STATIONS = ['ISSIRO STATION', 'DEPOT ISSIRO', 'RUNGU STATION', 'DUNGU STATION', 'DURBA STATION', 'NIANGARA STATION'];
const TIME_PERIODS: TimePeriod[] = ['Daily', 'Weekly', 'Monthly', 'Quarterly'];

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
      monthlyData: [],
    },
    expenseDistribution: {
      total: 0,
      change: 0,
      changePercent: 0,
      trend: 'down',
      categories: [],
    },
    stockVariance: {
      total: 0,
      change: 0,
      changePercent: 0,
      trend: 'up',
      stations: [],
    },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      
      const endDate = new Date();
      const startDate = new Date();
      
      // Calculate date range based on selected period
      switch (selectedPeriod) {
        case 'Daily':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'Weekly':
          startDate.setDate(endDate.getDate() - 28);
          break;
        case 'Monthly':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'Quarterly':
          startDate.setMonth(endDate.getMonth() - 12);
          break;
      }

      // Load sales data
      const { data: salesData } = await supabase
        .from('daily_sales')
        .select('total_amount, sale_date')
        .gte('sale_date', startDate.toISOString().split('T')[0])
        .lte('sale_date', endDate.toISOString().split('T')[0]);

      // Load expenses data
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('category, amount, expense_date')
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .lte('expense_date', endDate.toISOString().split('T')[0]);

      // Process sales trends
      let totalSales = 0;
      const monthlySales: Record<string, number> = {};
      
      if (salesData) {
        salesData.forEach(sale => {
          totalSales += sale.total_amount || 0;
          const month = new Date(sale.sale_date).toLocaleDateString('en-US', { month: 'short' });
          monthlySales[month] = (monthlySales[month] || 0) + (sale.total_amount || 0);
        });
      }

      const monthlyData = Object.entries(monthlySales)
        .map(([month, value]) => ({ month, value }))
        .sort((a, b) => {
          const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
        });

      // Process expense distribution
      let totalExpenses = 0;
      const expenseCategories: Record<string, number> = {};
      
      if (expensesData) {
        expensesData.forEach(expense => {
          totalExpenses += expense.amount || 0;
          expenseCategories[expense.category] = (expenseCategories[expense.category] || 0) + (expense.amount || 0);
        });
      }

      const expenseDistribution = Object.entries(expenseCategories)
        .map(([name, amount]) => ({
          name,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3); // Top 3 categories

      // Process stock variance (mock data for now)
      const stockVariance = STATIONS.map(station => ({
        name: station,
        variance: Math.floor(Math.random() * 200) - 100,
        percentage: Math.floor(Math.random() * 100),
      }));

      setAnalyticsData({
        salesTrends: {
          total: totalSales,
          change: totalSales * 0.15, // Mock 15% increase
          changePercent: 15,
          trend: 'up',
          monthlyData,
        },
        expenseDistribution: {
          total: totalExpenses,
          change: totalExpenses * -0.05, // Mock 5% decrease
          changePercent: -5,
          trend: 'down',
          categories: expenseDistribution,
        },
        stockVariance: {
          total: 200, // Mock total
          change: 20, // Mock change
          changePercent: 10,
          trend: 'up',
          stations: stockVariance,
        },
      });

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod, selectedStation]);

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
    const chartData = analyticsData.salesTrends.monthlyData.map(d => ({
      label: d.month,
      value: d.value,
      color: '#F0C38E',
    }));
    
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Sales Trends</Text>
          <View style={styles.metricContainer}>
            <Text style={styles.metricValue}>
              {formatCurrency.USD(analyticsData.salesTrends.total / 2850.50)}
            </Text>
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
          {selectedStation} - Last 3 Months
        </Text>
        
        <LineChart data={chartData} height={120} showValues={true} />
      </View>
    );
  };

  const renderExpenseDistributionChart = () => {
    const chartData = analyticsData.expenseDistribution.categories.map(category => ({
      label: category.name,
      value: category.percentage,
      color: '#F0C38E',
    }));
    
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Expense Distribution</Text>
          <View style={styles.metricContainer}>
            <Text style={styles.metricValue}>
              {formatCurrency.USD(analyticsData.expenseDistribution.total / 2850.50)}
            </Text>
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
          {selectedStation} - Last 3 Months
        </Text>
        
        <BarChart data={chartData} height={120} showValues={true} />
      </View>
    );
  };

  const renderStockVarianceChart = () => {
    const chartData = analyticsData.stockVariance.stations.map(station => ({
      label: station.name,
      value: station.percentage,
      color: '#F0C38E',
    }));
    
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Stock Variance</Text>
          <View style={styles.metricContainer}>
            <Text style={styles.metricValue}>
              +{analyticsData.stockVariance.total} Units
            </Text>
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
        
        <ProgressChart data={chartData} showValues={true} />
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
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  selectedTimePeriodText: {
    color: '#312C51',
  },
  filterContainer: {
    marginBottom: 20,
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
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  metricContainer: {
    alignItems: 'flex-end',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 20,
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
    backgroundColor: '#F0C38E',
    borderRadius: 2,
    minHeight: 4,
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
