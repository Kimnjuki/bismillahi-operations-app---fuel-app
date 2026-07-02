import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { formatCurrency } from '../constants/currency';

const { width } = Dimensions.get('window');

interface ReportData {
  closingStock: {
    pms: number;
    ago: number;
  };
  closingSales: {
    total: number;
    pms: number;
    ago: number;
  };
  expenses: {
    total: number;
    byCategory: Record<string, number>;
  };
  stockVariances: {
    pms: number;
    ago: number;
  };
}

interface DateInfo {
  year: number;
  month: number;
  day: number;
  dateString: string;
}

const STATIONS = ['ISSIRO STATION', 'DEPOT ISSIRO', 'RUNGU STATION', 'DUNGU STATION', 'DURBA STATION', 'NIANGARA STATION'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS = [2024, 2023, 2022, 2021, 2020];

export default function DailyConsolidatedReportScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [selectedStation, setSelectedStation] = useState('ISSIRO STATION');
  const [selectedDate, setSelectedDate] = useState<DateInfo>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    dateString: new Date().toISOString().split('T')[0],
  });
  const [reportData, setReportData] = useState<ReportData>({
    closingStock: { pms: 0, ago: 0 },
    closingSales: { total: 0, pms: 0, ago: 0 },
    expenses: { total: 0, byCategory: {} },
    stockVariances: { pms: 0, ago: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      
      const dateString = selectedDate.dateString;
      
      // Load sales data for the selected station and date
      const { data: salesData } = await supabase
        .from('daily_sales')
        .select('fuel_type, total_amount, sale_type, station_name')
        .eq('sale_date', dateString)
        .eq('station_name', selectedStation);

      // Load expenses data for the selected station and date
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('category, amount')
        .eq('expense_date', dateString);

      // Load stock data (this would need to be implemented based on your stock management system)
      const { data: stockData } = await supabase
        .from('stock_items')
        .select('item_name, current_stock')
        .in('item_name', ['PMS', 'AGO']);

      // Process sales data
      let totalSales = 0;
      let pmsSales = 0;
      let agoSales = 0;

      if (salesData) {
        salesData.forEach(sale => {
          totalSales += sale.total_amount || 0;
          if (sale.fuel_type === 'PMS') {
            pmsSales += sale.total_amount || 0;
          } else if (sale.fuel_type === 'AGO') {
            agoSales += sale.total_amount || 0;
          }
        });
      }

      // Process expenses data
      let totalExpenses = 0;
      const expensesByCategory: Record<string, number> = {};

      if (expensesData) {
        expensesData.forEach(expense => {
          totalExpenses += expense.amount || 0;
          expensesByCategory[expense.category] = (expensesByCategory[expense.category] || 0) + (expense.amount || 0);
        });
      }

      // Process stock data
      let pmsStock = 0;
      let agoStock = 0;

      if (stockData) {
        stockData.forEach(stock => {
          if (stock.item_name === 'PMS') {
            pmsStock = stock.current_stock || 0;
          } else if (stock.item_name === 'AGO') {
            agoStock = stock.current_stock || 0;
          }
        });
      }

      setReportData({
        closingStock: { pms: pmsStock, ago: agoStock },
        closingSales: { total: totalSales, pms: pmsSales, ago: agoSales },
        expenses: { total: totalExpenses, byCategory: expensesByCategory },
        stockVariances: { pms: 0, ago: 0 }, // This would need actual variance calculation
      });

    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, selectedStation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReportData();
  }, [loadReportData]);

  const handleStationChange = () => {
    const currentIndex = STATIONS.indexOf(selectedStation);
    const nextIndex = (currentIndex + 1) % STATIONS.length;
    setSelectedStation(STATIONS[nextIndex]);
  };

  const handleDateChange = (day: number) => {
    const newDate = new Date(selectedDate.year, selectedDate.month - 1, day);
    setSelectedDate({
      year: newDate.getFullYear(),
      month: newDate.getMonth() + 1,
      day: newDate.getDate(),
      dateString: newDate.toISOString().split('T')[0],
    });
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate.year, selectedDate.month - 1, selectedDate.day);
    const newDate = new Date(currentDate);
    
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    
    setSelectedDate({
      year: newDate.getFullYear(),
      month: newDate.getMonth() + 1,
      day: newDate.getDate(),
      dateString: newDate.toISOString().split('T')[0],
    });
  };

  const handleYearChange = () => {
    const currentYearIndex = YEARS.indexOf(selectedDate.year);
    const nextYearIndex = (currentYearIndex + 1) % YEARS.length;
    const newYear = YEARS[nextYearIndex];
    
    const newDate = new Date(newYear, selectedDate.month - 1, selectedDate.day);
    setSelectedDate({
      year: newDate.getFullYear(),
      month: newDate.getMonth() + 1,
      day: newDate.getDate(),
      dateString: newDate.toISOString().split('T')[0],
    });
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedDate.year, selectedDate.month);
    const firstDay = getFirstDayOfMonth(selectedDate.year, selectedDate.month);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = day === selectedDate.day;
      days.push(
        <TouchableOpacity
          key={day}
          style={[styles.calendarDay, isSelected && styles.selectedDay]}
          onPress={() => handleDateChange(day)}
        >
          <Text style={[styles.calendarDayText, isSelected && styles.selectedDayText]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  const renderExpenseCategory = (category: string, amount: number) => (
    <View key={category} style={styles.expenseCategoryItem}>
      <Text style={styles.expenseCategoryName}>{category}</Text>
      <Text style={styles.expenseCategoryAmount}>{formatCurrency.CDF(amount)}</Text>
    </View>
  );

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

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
            <Text style={styles.headerTitle}>Daily Consolidated Report</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Select Date Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => handleMonthChange('prev')}>
                  <Ionicons name="chevron-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleYearChange}>
                  <Text style={styles.calendarMonthYear}>
                    {MONTHS[selectedDate.month - 1]} {selectedDate.year}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleMonthChange('next')}>
                  <Ionicons name="chevron-forward" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.calendarWeekDays}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <Text key={index} style={styles.weekDayText}>{day}</Text>
                ))}
              </View>
              
              <View style={styles.calendarGrid}>
                {renderCalendar()}
              </View>
            </View>
          </View>

          {/* Select Station Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Station</Text>
            <TouchableOpacity style={styles.stationButton} onPress={handleStationChange}>
              <Text style={styles.stationText}>{selectedStation}</Text>
              <Ionicons name="chevron-down" size={16} color="#F0C38E" />
            </TouchableOpacity>
          </View>

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Closing Stock</Text>
              <Text style={styles.summaryValue}>
                {(reportData.closingStock.pms + reportData.closingStock.ago).toLocaleString()} L
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Closing Sales</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency.CDF(reportData.closingSales.total)}
              </Text>
            </View>
          </View>

          {/* Sales Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{selectedStation} - Sales Summary</Text>
            <View style={styles.dataRow}>
              <View style={styles.dataCard}>
                <Text style={styles.dataLabel}>Total Sales (USD)</Text>
                <Text style={styles.dataValue}>
                  {formatCurrency.USD(reportData.closingSales.total / 2850.50)}
                </Text>
              </View>
              <View style={styles.dataCard}>
                <Text style={styles.dataLabel}>PMS Sales (CDF)</Text>
                <Text style={styles.dataValue}>
                  {formatCurrency.CDF(reportData.closingSales.pms)}
                </Text>
              </View>
              <View style={styles.dataCard}>
                <Text style={styles.dataLabel}>AGO Sales (CDF)</Text>
                <Text style={styles.dataValue}>
                  {formatCurrency.CDF(reportData.closingSales.ago)}
                </Text>
              </View>
            </View>
          </View>

          {/* Expenses */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{selectedStation} - Expenses</Text>
            <View style={styles.expensesContainer}>
              {Object.entries(reportData.expenses.byCategory).map(([category, amount]) =>
                renderExpenseCategory(category, amount)
              )}
              {Object.keys(reportData.expenses.byCategory).length === 0 && (
                <Text style={styles.noDataText}>No expenses recorded for this date</Text>
              )}
            </View>
          </View>

          {/* Stock Variances */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{selectedStation} - Stock Variances</Text>
            <View style={styles.dataRow}>
              <View style={styles.dataCard}>
                <Text style={styles.dataLabel}>PMS Variance</Text>
                <Text style={[
                  styles.dataValue,
                  { color: reportData.stockVariances.pms >= 0 ? '#4CAF50' : '#F44336' }
                ]}>
                  {reportData.stockVariances.pms >= 0 ? '+' : ''}{reportData.stockVariances.pms}L
                </Text>
              </View>
              <View style={styles.dataCard}>
                <Text style={styles.dataLabel}>AGO Variance</Text>
                <Text style={[
                  styles.dataValue,
                  { color: reportData.stockVariances.ago >= 0 ? '#4CAF50' : '#F44336' }
                ]}>
                  {reportData.stockVariances.ago >= 0 ? '+' : ''}{reportData.stockVariances.ago}L
                </Text>
              </View>
            </View>
          </View>
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  calendarContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calendarMonthYear: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  calendarDay: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedDay: {
    backgroundColor: '#F0C38E',
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 16,
    color: '#ffffff',
  },
  selectedDayText: {
    color: '#312C51',
    fontWeight: 'bold',
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F0C38E',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dataCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: 12,
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  dataValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  expensesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  expenseCategoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  expenseCategoryName: {
    fontSize: 14,
    color: '#ffffff',
    flex: 1,
  },
  expenseCategoryAmount: {
    fontSize: 14,
    color: '#F0C38E',
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    paddingVertical: 20,
  },
});











