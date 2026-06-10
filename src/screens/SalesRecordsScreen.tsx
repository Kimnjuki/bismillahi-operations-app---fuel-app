import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { formatCurrency } from '../constants/currency';
import { FlashList } from '@shopify/flash-list';

const STATIONS = ['ISSIRO STATION', 'DEPOT ISSIRO', 'RUNGU STATION', 'DUNGU STATION', 'DURBA STATION', 'NIANGARA STATION'];

interface SalesRecord {
  id: string;
  fuel_type: 'PMS' | 'AGO';
  volume_liters: number;
  total_amount: number;
  payment_method: 'cash' | 'card' | 'credit';
  sale_date: string;
  created_at: string;
  station_name: string;
  sale_type: 'pump' | 'drum';
}

interface SalesSummary {
  totalAmount: number;
  totalPMSLitres: number;
  totalAGOLitres: number;
  cashSales: number;
  cardSales: number;
  creditSales: number;
}

interface CashFlowData {
  cashInHand: number;
  cashSales: number;
  shortExtra: number;
  totalExpenses: number;
  finalCashFlow: number;
}

export default function SalesRecordsScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary>({
    totalAmount: 0,
    totalPMSLitres: 0,
    totalAGOLitres: 0,
    cashSales: 0,
    cardSales: 0,
    creditSales: 0,
  });
  const [cashFlow, setCashFlow] = useState<CashFlowData>({
    cashInHand: 0,
    cashSales: 0,
    shortExtra: 0,
    totalExpenses: 0,
    finalCashFlow: 0,
  });
  const [selectedStation, setSelectedStation] = useState('ISSIRO STATION');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previousFinalCash, setPreviousFinalCash] = useState(0);

  const loadSalesData = useCallback(async () => {
    try {
      setLoading(true);
      
      const prevDate = new Date(selectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];
      
      const { data: prevCashData } = await supabase
        .from('daily_cash_flows')
        .select('closing_cash')
        .eq('sale_date', prevDateStr)
        .eq('station_name', selectedStation)
        .single();
      
      const prevFinal = prevCashData?.closing_cash || 0;
      setPreviousFinalCash(prevFinal);
      
      // Fetch sales records for selected date and station
      const { data: salesData, error: salesError } = await supabase
        .from('daily_sales')
        .select('*')
        .eq('sale_date', selectedDate)
        .eq('station_name', selectedStation)
        .order('created_at', { ascending: false });

      if (salesError) {
        console.error('Error fetching sales:', salesError);
        return;
      }

      const records: SalesRecord[] = (salesData || []).map(sale => ({
        id: sale.id,
        fuel_type: sale.fuel_type as 'PMS' | 'AGO',
        volume_liters: sale.volume_liters || 0,
        total_amount: sale.total_amount || 0,
        payment_method: sale.payment_method as 'cash' | 'card' | 'credit',
        sale_date: sale.sale_date,
        created_at: sale.created_at,
        station_name: sale.station_name,
        sale_type: sale.sale_type as 'pump' | 'drum',
      }));

      setSalesRecords(records);

      // Calculate sales summary
      const summary: SalesSummary = {
        totalAmount: 0,
        totalPMSLitres: 0,
        totalAGOLitres: 0,
        cashSales: 0,
        cardSales: 0,
        creditSales: 0,
      };

      records.forEach(record => {
        summary.totalAmount += record.total_amount;
        if (record.fuel_type === 'PMS') {
          summary.totalPMSLitres += record.volume_liters;
        } else if (record.fuel_type === 'AGO') {
          summary.totalAGOLitres += record.volume_liters;
        }

        if (record.payment_method === 'cash') {
          summary.cashSales += record.total_amount;
        } else if (record.payment_method === 'card') {
          summary.cardSales += record.total_amount;
        } else if (record.payment_method === 'credit') {
          summary.creditSales += record.total_amount;
        }
      });

      setSalesSummary(summary);

      // Fetch expenses for the selected date
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('expense_date', selectedDate);

      const totalExpenses = expensesData?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;

      // Update cash flow - include previous day's closing cash as opening balance
      setCashFlow(prev => {
        const openingCash = prevFinal;
        const cashInHand = openingCash + summary.cashSales;
        return {
          ...prev,
          cashInHand,
          cashSales: summary.cashSales,
          totalExpenses,
          shortExtra: cashInHand - summary.cashSales - totalExpenses,
          finalCashFlow: openingCash + summary.cashSales - totalExpenses,
        };
      });

    } catch (error) {
      console.error('Error loading sales data:', error);
      Alert.alert('Error', 'Failed to load sales data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, selectedStation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSalesData();
  }, [loadSalesData]);

  const handleCashInHandChange = (value: string) => {
    const cashInHand = parseFloat(value) || 0;
    setCashFlow(prev => ({
      ...prev,
      cashInHand,
      shortExtra: cashInHand - prev.cashSales,
      finalCashFlow: cashInHand - prev.cashSales - prev.totalExpenses,
    }));
  };

  const handleStationChange = () => {
    const currentIndex = STATIONS.indexOf(selectedStation);
    const nextIndex = (currentIndex + 1) % STATIONS.length;
    setSelectedStation(STATIONS[nextIndex]);
  };

  useEffect(() => {
    loadSalesData();
  }, [loadSalesData]);

  const getAvailableStations = (): string[] => {
    if (appUser?.role === 'admin') {
      return STATIONS;
    }
    if (appUser?.station_id) {
      const stationName = STATIONS.find(station =>
        station.toLowerCase().replace(/\s+/g, '_') === appUser.station_id?.toLowerCase()
      );
      return stationName ? [stationName] : STATIONS;
    }
    return STATIONS;
  };

  // Memoized sales record component
const SalesRecordItem = memo(({ record }: { record: SalesRecord }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.recordInfo}>
          <Text style={styles.fuelType}>{record.fuel_type}</Text>
          <Text style={styles.saleType}>({record.sale_type})</Text>
        </View>
        <View style={styles.recordBadge}>
          <Text style={[
            styles.paymentBadge,
            record.payment_method === 'cash' && styles.cashBadge,
            record.payment_method === 'card' && styles.cardBadge,
            record.payment_method === 'credit' && styles.creditBadge,
          ]}>
            {record.payment_method.toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.recordDetails}>
        <View style={styles.recordColumn}>
          <Text style={styles.recordLabel}>Litres</Text>
          <Text style={styles.recordValue}>{record.volume_liters.toLocaleString()} L</Text>
        </View>
        <View style={styles.recordColumn}>
          <Text style={styles.recordLabel}>Amount</Text>
          <Text style={styles.recordAmount}>{formatCurrency.CDF(record.total_amount)}</Text>
        </View>
        <View style={styles.recordColumn}>
          <Text style={styles.recordLabel}>Time</Text>
          <Text style={styles.recordValue}>
            {new Date(record.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    </View>
  ));

  if (loading) {
    return (
      <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F0C38E" />
            <Text style={styles.loadingText}>Loading sales records...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const renderSalesRecordItem = useCallback(({ item }: { item: SalesRecord }) => (
    <SalesRecordItem record={item} />
  ), []);

  return (
    <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Sales Records</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ExpenseEntry' as never)}>
              <Ionicons name="cash-outline" size={24} color="#F0C38E" />
            </TouchableOpacity>
          </View>

          {/* Date & Station Selection */}
          <View style={styles.selectionContainer}>
            <View style={styles.selectionRow}>
              <Text style={styles.selectionLabel}>Date: {selectedDate}</Text>
              <TouchableOpacity style={styles.changeButton} onPress={handleStationChange}>
                <Text style={styles.changeButtonText}>{selectedStation}</Text>
                <Ionicons name="chevron-down" size={16} color="#F0C38E" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sales Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.sectionTitle}>Sales Summary</Text>
            
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Sales</Text>
                <Text style={styles.summaryValue}>{formatCurrency.CDF(salesSummary.totalAmount)}</Text>
                <Text style={styles.summarySubtext}>
                  {formatCurrency.USD(salesSummary.totalAmount / 2850.50)}
                </Text>
              </View>
              
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>PMS (Litres)</Text>
                <Text style={styles.summaryValue}>{salesSummary.totalPMSLitres.toLocaleString()} L</Text>
              </View>
              
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>AGO (Litres)</Text>
                <Text style={styles.summaryValue}>{salesSummary.totalAGOLitres.toLocaleString()} L</Text>
              </View>
            </View>

            {/* Payment Method Breakdown */}
            <View style={styles.paymentBreakdown}>
              <Text style={styles.paymentTitle}>Payment Breakdown</Text>
              <View style={styles.paymentRow}>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Cash</Text>
                  <Text style={[styles.paymentAmount, styles.cashText]}>
                    {formatCurrency.CDF(salesSummary.cashSales)}
                  </Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Card</Text>
                  <Text style={[styles.paymentAmount, styles.cardText]}>
                    {formatCurrency.CDF(salesSummary.cardSales)}
                  </Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Credit</Text>
                  <Text style={[styles.paymentAmount, styles.creditText]}>
                    {formatCurrency.CDF(salesSummary.creditSales)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Cash Reconciliation */}
          <View style={styles.cashFlowContainer}>
            <Text style={styles.sectionTitle}>Cash Reconciliation</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cash in Hand (CDF)</Text>
              <TextInput
                style={styles.textInput}
                value={cashFlow.cashInHand > 0 ? cashFlow.cashInHand.toString() : ''}
                onChangeText={handleCashInHandChange}
                placeholder="Enter cash in hand"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.cashFlowRow}>
              <Text style={styles.cashFlowLabel}>Cash Sales (CDF)</Text>
              <Text style={styles.cashFlowValue}>{formatCurrency.CDF(salesSummary.cashSales)}</Text>
            </View>

            <View style={styles.cashFlowRow}>
              <Text style={styles.cashFlowLabel}>Expenses (CDF)</Text>
              <Text style={[styles.cashFlowValue, styles.expenseText]}>
                {formatCurrency.CDF(cashFlow.totalExpenses)}
              </Text>
            </View>

            <View style={[styles.cashFlowRow, styles.shortExtraRow]}>
              <Text style={styles.shortExtraLabel}>
                {cashFlow.shortExtra >= 0 ? 'Short' : 'Extra'}
              </Text>
              <Text style={[
                styles.shortExtraValue,
                cashFlow.shortExtra >= 0 ? styles.shortValue : styles.extraValue,
              ]}>
                {formatCurrency.CDF(Math.abs(cashFlow.shortExtra))}
              </Text>
            </View>

            <View style={[styles.cashFlowRow, styles.finalFlowRow]}>
              <Text style={styles.finalFlowLabel}>Final Cash Flow (CDF)</Text>
              <Text style={styles.finalFlowValue}>
                {formatCurrency.CDF(Math.abs(cashFlow.finalCashFlow))}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.expensesButton}
              onPress={() => navigation.navigate('ExpenseEntry' as never)}
            >
              <Ionicons name="add-circle" size={20} color="#ffffff" />
              <Text style={styles.expensesButtonText}>Add Daily Expenses</Text>
            </TouchableOpacity>
          </View>

          {/* Sales Records List */}
          <View style={styles.recordsContainer}>
            <Text style={styles.sectionTitle}>Sales Records ({salesRecords.length})</Text>
            {salesRecords.length === 0 ? (
              <View style={styles.noRecordsContainer}>
                <Ionicons name="document-text-outline" size={48} color="#666" />
                <Text style={styles.noRecordsText}>No sales records for this date</Text>
                <Text style={styles.noRecordsSubtext}>Records will appear here after sales are entered</Text>
              </View>
            ) : (
              <FlashList
                data={salesRecords as any}
                renderItem={renderSalesRecordItem as any}
                estimatedItemSize={100}
                refreshing={refreshing}
                onRefresh={onRefresh}
                contentContainerStyle={styles.flashListContent}
              />
            )}
          </View>
        </View>
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
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  flashListContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 16,
  },
  selectionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  selectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionLabel: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  changeButtonText: {
    fontSize: 14,
    color: '#F0C38E',
    fontWeight: '600',
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F0C38E',
    marginBottom: 12,
  },
  summaryContainer: {
    marginBottom: 20,
  },
  summaryCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flex: 1,
    minWidth: '30%',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
    textAlign: 'center',
  },
  summarySubtext: {
    fontSize: 12,
    color: '#F0C38E',
    opacity: 0.9,
  },
  paymentBreakdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  paymentItem: {
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  cashText: {
    color: '#4CAF50',
  },
  cardText: {
    color: '#2196F3',
  },
  creditText: {
    color: '#FF9800',
  },
  cashFlowContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 8,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    fontSize: 16,
    color: '#ffffff',
  },
  cashFlowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  cashFlowLabel: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  cashFlowValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  expenseText: {
    color: '#F44336',
  },
  shortExtraRow: {
    borderBottomWidth: 0,
    paddingVertical: 12,
  },
  shortExtraLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  shortExtraValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  shortValue: {
    color: '#F44336',
  },
  extraValue: {
    color: '#4CAF50',
  },
  finalFlowRow: {
    borderBottomWidth: 0,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  finalFlowLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F0C38E',
  },
  finalFlowValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F0C38E',
  },
  expensesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    padding: 14,
    marginTop: 16,
  },
  expensesButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  recordsContainer: {
    marginBottom: 20,
  },
  recordCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fuelType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F0C38E',
  },
  saleType: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.7,
    marginLeft: 6,
  },
  recordBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  paymentBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  cashBadge: {
    color: '#4CAF50',
  },
  cardBadge: {
    color: '#2196F3',
  },
  creditBadge: {
    color: '#FF9800',
  },
  recordDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recordColumn: {
    flex: 1,
    alignItems: 'center',
  },
  recordLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.7,
    marginBottom: 4,
  },
  recordValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  recordAmount: {
    fontSize: 14,
    color: '#F0C38E',
    fontWeight: 'bold',
  },
  noRecordsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noRecordsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '600',
  },
  noRecordsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});