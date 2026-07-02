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
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../constants/currency';
import reportsService, { StationReport, ReportsSummary } from '../services/reportsService';
import { Colors, Spacing, BorderRadius, Elevation, Typography } from '../constants/theme';

const { width } = Dimensions.get('window');

const getTodayString = () => new Date().toISOString().split('T')[0];
const getDateDisplay = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
};

interface ReportItem {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

const REPORT_ITEMS: ReportItem[] = [
  { key: 'sales', title: 'Sales', subtitle: 'Revenue & volume', icon: 'cash', color: Colors.semantic.success },
  { key: 'expenses', title: 'Expenses', subtitle: 'Category breakdown', icon: 'receipt', color: Colors.brand.primary },
  { key: 'cashflow', title: 'Cash Flow', subtitle: 'Cash & transfers', icon: 'bank-transfer', color: Colors.semantic.info },
  { key: 'stock', title: 'Stock', subtitle: 'Levels & tank dipping', icon: 'warehouse', color: Colors.semantic.warning },
];

interface StationOption { id: string; name: string; code: string; }

export default function ReportsScreen() {
  const { appUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [stations, setStations] = useState<StationOption[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [reportData, setReportData] = useState<StationReport | null>(null);
  const [summaryData, setSummaryData] = useState<ReportsSummary | null>(null);
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => { loadStations(); }, []);

  const loadStations = async () => {
    try {
      const result = await reportsService.getStations();
      if (result.success && result.data) {
        const stationList = result.data.filter((s: any) => s.name).map((s: any) => ({ id: s.id, name: s.name, code: s.code || s.name.substring(0, 3).toUpperCase() }));
        setStations(stationList);
        if (stationList.length > 0 && !selectedStation) setSelectedStation(stationList[0].name);
      }
    } catch (error) { console.error('Error loading stations:', error); }
  };

  const loadReportData = useCallback(async (reportKey: string) => {
    if (!selectedStation) { Alert.alert('Select Station', 'Please select a station first.'); return; }
    setDataLoading(true);
    setActiveReport(reportKey);
    try {
      const result = await reportsService.getFullStationReport(selectedStation, selectedDate);
      if (result.success && result.data) setReportData(result.data);
      else Alert.alert('Error', result.error || 'Failed to load report data');
    } catch { Alert.alert('Error', 'Failed to load report data'); } finally { setDataLoading(false); }
  }, [selectedStation, selectedDate]);

  const loadAllSummary = useCallback(async () => {
    setDataLoading(true); setActiveReport(null);
    try {
      const result = await reportsService.getAllStationsSummary(selectedDate);
      if (result.success && result.data) { setSummaryData(result.data.summary); setReportData(null); }
    } catch (error) { console.error('Error loading summary:', error); } finally { setDataLoading(false); }
  }, [selectedDate]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await loadStations();
    if (activeReport) await loadReportData(activeReport);
    setRefreshing(false);
  }, [activeReport, loadReportData]);

  const cycleStation = () => {
    if (stations.length === 0) return;
    const currentIndex = stations.findIndex(s => s.name === selectedStation);
    setSelectedStation(stations[(currentIndex + 1) % stations.length].name);
    setActiveReport(null); setReportData(null);
  };

  const changeDateByDays = (days: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
    setActiveReport(null); setReportData(null);
  };

  const renderSectionHeader = (title: string, color: string = Colors.brand.primary) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionHeaderBar, { backgroundColor: color }]} />
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderDataRow = (label: string, value: string, valueColor?: string) => (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={[styles.dataValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );

  const renderDivider = () => <View style={styles.divider} />;

  const renderSalesReport = () => {
    if (!reportData) return null;
    const { sales } = reportData;
    return (
      <View style={styles.reportContent}>
        {renderSectionHeader('Sales Summary', Colors.semantic.success)}
        <View style={styles.summaryCard}>
          {renderDataRow('Total Sales (CDF)', formatCurrency.CDF(sales.total_cdf))}
          {renderDataRow('Total Sales (USD)', formatCurrency.USD(sales.total_usd))}
          {renderDivider()}
          {renderDataRow('PMS Sales (CDF)', formatCurrency.CDF(sales.pms_sales_cdf), Colors.semantic.success)}
          {renderDataRow('PMS Volume', `${sales.pms_volume_liters.toLocaleString()} L`)}
          {renderDivider()}
          {renderDataRow('AGO Sales (CDF)', formatCurrency.CDF(sales.ago_sales_cdf), Colors.brand.primary)}
          {renderDataRow('AGO Volume', `${sales.ago_volume_liters.toLocaleString()} L`)}
          {renderDivider()}
          {renderDataRow('Pump Transactions', `${sales.pump_sales_count}`)}
          {renderDivider()}
          {renderSectionHeader('Payment Breakdown', Colors.semantic.info)}
          {renderDataRow('Cash', formatCurrency.CDF(sales.payment_breakdown.cash), Colors.semantic.success)}
          {renderDataRow('Card', formatCurrency.CDF(sales.payment_breakdown.card), Colors.semantic.info)}
          {renderDataRow('Credit', formatCurrency.CDF(sales.payment_breakdown.credit), Colors.brand.primary)}
        </View>
      </View>
    );
  };

  const renderExpensesReport = () => {
    if (!reportData) return null;
    const { expenses } = reportData;
    return (
      <View style={styles.reportContent}>
        {renderSectionHeader('Expenses Summary', Colors.brand.primary)}
        <View style={styles.summaryCard}>
          {renderDataRow('Total Expenses (CDF)', formatCurrency.CDF(expenses.total_cdf))}
          {renderDataRow('Total Expenses (USD)', formatCurrency.USD(expenses.total_usd))}
          {renderDataRow('Transactions', `${expenses.count}`)}
        </View>
        {Object.keys(expenses.by_category).length > 0 && (
          <>
            {renderSectionHeader('By Category', Colors.brand.primary)}
            <View style={styles.summaryCard}>
              {Object.entries(expenses.by_category).sort(([, a], [, b]) => b - a).map(([category, amount]) => (
                <View key={category}>{renderDataRow(category, formatCurrency.CDF(amount))}</View>
              ))}
            </View>
          </>
        )}
        {Object.keys(expenses.by_category).length === 0 && <Text style={styles.noDataText}>No expenses recorded</Text>}
      </View>
    );
  };

  const renderCashFlowReport = () => {
    if (!reportData) return null;
    const { cash_flow: cf } = reportData;
    return (
      <View style={styles.reportContent}>
        {renderSectionHeader('Cash Flow', Colors.semantic.info)}
        <View style={styles.summaryCard}>
          {renderDataRow('Opening Cash (CDF)', formatCurrency.CDF(cf.opening_cash_cdf))}
          {renderDataRow('Opening Cash (USD)', formatCurrency.USD(cf.opening_cash_usd))}
        </View>
        <View style={styles.summaryCard}>
          {renderSectionHeader('Inflows', Colors.semantic.success)}
          {renderDataRow('Cash Sales (CDF)', formatCurrency.CDF(cf.cash_sales_cdf), Colors.semantic.success)}
          {renderDataRow('Cash Sales (USD)', formatCurrency.USD(cf.cash_sales_usd), Colors.semantic.success)}
        </View>
        <View style={styles.summaryCard}>
          {renderSectionHeader('Outflows', Colors.semantic.danger)}
          {renderDataRow('Expenses (CDF)', formatCurrency.CDF(cf.total_expenses_cdf), Colors.semantic.danger)}
          {renderDataRow('Expenses (USD)', formatCurrency.USD(cf.total_expenses_usd), Colors.semantic.danger)}
          {renderDataRow('Transferred (CDF)', formatCurrency.CDF(cf.cash_transferred_cdf), Colors.brand.primary)}
          {renderDataRow('Exchange (CDF)', formatCurrency.CDF(cf.exchange_to_usd_cdf), Colors.semantic.info)}
        </View>
        <View style={styles.summaryCard}>
          {renderDataRow('Short/Extra (CDF)', formatCurrency.CDF(cf.short_extra_cdf), cf.short_extra_cdf >= 0 ? Colors.semantic.success : Colors.semantic.danger)}
          {renderDataRow('Closing Cash (CDF)', formatCurrency.CDF(cf.closing_cash_cdf), Colors.semantic.info)}
        </View>
      </View>
    );
  };

  const renderStockReport = () => {
    if (!reportData) return null;
    const { stock } = reportData;
    const getStockColor = (current: number, min: number) => { if (current <= 0) return Colors.semantic.danger; if (current <= min) return Colors.semantic.warning; return Colors.semantic.success; };
    return (
      <View style={styles.reportContent}>
        {renderSectionHeader('PMS Stock', Colors.fuel.PMS)}
        <View style={styles.summaryCard}>
          {renderDataRow('Current', `${stock.pms_current_stock.toLocaleString()} L`, getStockColor(stock.pms_current_stock, stock.pms_minimum_stock))}
          {renderDataRow('Minimum', `${stock.pms_minimum_stock.toLocaleString()} L`)}
          {renderDataRow('Capacity', `${stock.pms_capacity.toLocaleString()} L`)}
          {stock.pms_capacity > 0 && (
            <View style={styles.stockBarContainer}>
              <View style={styles.stockBarBg}>
                <View style={[styles.stockBarFill, { width: `${Math.min((stock.pms_current_stock / stock.pms_capacity) * 100, 100)}%`, backgroundColor: getStockColor(stock.pms_current_stock, stock.pms_minimum_stock) }]} />
              </View>
              <Text style={styles.stockBarLabel}>{Math.round((stock.pms_current_stock / stock.pms_capacity) * 100)}%</Text>
            </View>
          )}
          {renderDivider()}
          {renderDataRow('Received', `${stock.pms_received.toLocaleString()} L`, Colors.semantic.success)}
          {renderDataRow('Sold', `${stock.pms_sold.toLocaleString()} L`)}
          {renderDataRow('Variance', `${stock.pms_variance.toLocaleString()} L`, stock.pms_variance >= 0 ? Colors.semantic.success : Colors.semantic.danger)}
        </View>

        {renderSectionHeader('AGO Stock', Colors.fuel.AGO)}
        <View style={styles.summaryCard}>
          {renderDataRow('Current', `${stock.ago_current_stock.toLocaleString()} L`, getStockColor(stock.ago_current_stock, stock.ago_minimum_stock))}
          {renderDataRow('Minimum', `${stock.ago_minimum_stock.toLocaleString()} L`)}
          {renderDataRow('Capacity', `${stock.ago_capacity.toLocaleString()} L`)}
          {stock.ago_capacity > 0 && (
            <View style={styles.stockBarContainer}>
              <View style={styles.stockBarBg}>
                <View style={[styles.stockBarFill, { width: `${Math.min((stock.ago_current_stock / stock.ago_capacity) * 100, 100)}%`, backgroundColor: getStockColor(stock.ago_current_stock, stock.ago_minimum_stock) }]} />
              </View>
              <Text style={styles.stockBarLabel}>{Math.round((stock.ago_current_stock / stock.ago_capacity) * 100)}%</Text>
            </View>
          )}
          {renderDivider()}
          {renderDataRow('Received', `${stock.ago_received.toLocaleString()} L`, Colors.semantic.success)}
          {renderDataRow('Sold', `${stock.ago_sold.toLocaleString()} L`)}
          {renderDataRow('Variance', `${stock.ago_variance.toLocaleString()} L`, stock.ago_variance >= 0 ? Colors.semantic.success : Colors.semantic.danger)}
        </View>
      </View>
    );
  };

  if (loading && stations.length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.brand.primary} />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Reports</Text>
            <Text style={styles.headerSubtitle}>Comprehensive station reports</Text>
          </View>

          {/* Date Selector */}
          <View style={styles.filterRow}>
            <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDateByDays(-1)}>
              <MaterialCommunityIcons name="chevron-left" size={20} color={Colors.brand.primary} />
            </TouchableOpacity>
            <View style={styles.dateDisplay}>
              <MaterialCommunityIcons name="calendar-range" size={16} color={Colors.brand.primary} />
              <Text style={styles.dateText}>{getDateDisplay(selectedDate)}</Text>
              <TouchableOpacity onPress={() => setSelectedDate(getTodayString())} style={styles.todayBtn}>
                <Text style={styles.todayBtnText}>Today</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDateByDays(1)}>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.brand.primary} />
            </TouchableOpacity>
          </View>

          {/* Station Selector */}
          <TouchableOpacity style={styles.stationSelector} onPress={cycleStation}>
            <MaterialCommunityIcons name="domain" size={18} color={Colors.brand.primary} />
            <Text style={styles.stationText}>{selectedStation || 'Select a station'}</Text>
            <MaterialCommunityIcons name="swap-horizontal" size={18} color={Colors.brand.primary} />
          </TouchableOpacity>

          {/* Summary Button */}
          <TouchableOpacity style={[styles.summaryBtn, !activeReport && styles.summaryBtnActive]} onPress={loadAllSummary}>
            <MaterialCommunityIcons name="chart-bar" size={20} color={Colors.white} />
            <Text style={styles.summaryBtnText}>All Stations Summary</Text>
          </TouchableOpacity>

          {/* Quick Summary */}
          {!activeReport && summaryData && (
            <View style={styles.quickSummary}>
              <Text style={styles.quickSummaryTitle}>Overall Summary</Text>
              <View style={styles.quickSummaryGrid}>
                <View style={styles.quickSummaryCard}>
                  <Text style={styles.quickSummaryLabel}>Total Sales</Text>
                  <Text style={styles.quickSummaryValue}>{formatCurrency.CDF(summaryData.total_sales_cdf)}</Text>
                </View>
                <View style={styles.quickSummaryCard}>
                  <Text style={styles.quickSummaryLabel}>Total Expenses</Text>
                  <Text style={styles.quickSummaryValue}>{formatCurrency.CDF(summaryData.total_expenses_cdf)}</Text>
                </View>
                <View style={styles.quickSummaryCard}>
                  <Text style={styles.quickSummaryLabel}>Cash Flow</Text>
                  <Text style={styles.quickSummaryValue}>{formatCurrency.CDF(summaryData.total_cash_flow_cdf)}</Text>
                </View>
                <View style={styles.quickSummaryCard}>
                  <Text style={styles.quickSummaryLabel}>Stations</Text>
                  <Text style={styles.quickSummaryValue}>{summaryData.total_stations}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Report Cards */}
          <Text style={styles.checklistTitle}>Reports</Text>
          <View style={styles.reportGrid}>
            {REPORT_ITEMS.map((item) => {
              const isActive = activeReport === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.reportCard, isActive && styles.reportCardActive]}
                  onPress={() => loadReportData(item.key)}
                  disabled={!selectedStation || dataLoading}
                  activeOpacity={0.7}
                >
                  <View style={[styles.reportIconContainer, { backgroundColor: item.color + '20' }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
                  </View>
                  <Text style={[styles.reportCardTitle, isActive && { color: Colors.brand.primary }]}>{item.title}</Text>
                  <Text style={styles.reportCardSubtitle}>{item.subtitle}</Text>
                  {isActive && <MaterialCommunityIcons name="check-circle" size={16} color={Colors.brand.primary} style={{ position: 'absolute', top: 8, right: 8 }} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Loading */}
          {dataLoading && (
            <View style={styles.dataLoading}>
              <ActivityIndicator size="large" color={Colors.brand.primary} />
              <Text style={styles.dataLoadingText}>Loading...</Text>
            </View>
          )}

          {/* Report Content */}
          {!dataLoading && activeReport === 'sales' && renderSalesReport()}
          {!dataLoading && activeReport === 'expenses' && renderExpensesReport()}
          {!dataLoading && activeReport === 'cashflow' && renderCashFlowReport()}
          {!dataLoading && activeReport === 'stock' && renderStockReport()}

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.app },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 30 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.neutral['400'], fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.medium, marginTop: 12 },

  header: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  headerTitle: { fontSize: Typography.scale['2xl'], fontFamily: Typography.fontFamily.display, color: Colors.white },
  headerSubtitle: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.body, color: Colors.neutral['400'], marginTop: 4 },

  filterRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.screenPadding, marginBottom: Spacing.sm, backgroundColor: Colors.background.card, borderRadius: BorderRadius.lg, padding: Spacing.sm, ...Elevation.sm },
  dateNavBtn: { padding: Spacing.sm },
  dateDisplay: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  dateText: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.semibold, color: Colors.white },
  todayBtn: { backgroundColor: Colors.brand.primarySurface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  todayBtnText: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.semibold, color: Colors.brand.primary },

  stationSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.card, borderRadius: BorderRadius.lg, padding: Spacing.md, marginHorizontal: Spacing.screenPadding, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.brand.primary + '30', gap: Spacing.sm, ...Elevation.sm },
  stationText: { fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.semibold, color: Colors.white, flex: 1 },

  summaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background.card, borderRadius: BorderRadius.lg, padding: Spacing.md, marginHorizontal: Spacing.screenPadding, marginBottom: Spacing.base, borderWidth: 1, borderColor: Colors.neutral['600'], gap: Spacing.sm, ...Elevation.sm },
  summaryBtnActive: { backgroundColor: Colors.brand.primarySurface, borderColor: Colors.brand.primary },
  summaryBtnText: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.semibold, color: Colors.white },

  quickSummary: { marginHorizontal: Spacing.screenPadding, marginBottom: Spacing.base, padding: Spacing.base, backgroundColor: Colors.background.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.neutral['600'] },
  quickSummaryTitle: { fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.display, color: Colors.brand.primary, marginBottom: Spacing.md },
  quickSummaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quickSummaryCard: { width: (width - 64) / 2, backgroundColor: Colors.background.cardElevated, borderRadius: BorderRadius.md, padding: Spacing.md },
  quickSummaryLabel: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'] },
  quickSummaryValue: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.display, color: Colors.white, marginTop: 4 },

  checklistTitle: { fontSize: Typography.scale.lg, fontFamily: Typography.fontFamily.display, color: Colors.white, paddingHorizontal: Spacing.screenPadding, marginBottom: Spacing.md },
  reportGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.screenPadding, gap: Spacing.sm, marginBottom: Spacing.base },
  reportCard: { width: (width - 52) / 2, backgroundColor: Colors.background.card, borderRadius: BorderRadius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.neutral['600'], ...Elevation.sm },
  reportCardActive: { borderColor: Colors.brand.primary, backgroundColor: Colors.brand.primarySurface },
  reportIconContainer: { width: 44, height: 44, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  reportCardTitle: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.display, color: Colors.white },
  reportCardSubtitle: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.body, color: Colors.neutral['400'], marginTop: 4 },

  dataLoading: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
  dataLoadingText: { color: Colors.brand.primary, fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, marginTop: Spacing.sm },

  reportContent: { paddingHorizontal: Spacing.screenPadding, marginBottom: Spacing.base },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, marginTop: Spacing.sm },
  sectionHeaderBar: { width: 4, height: 18, borderRadius: 2, marginRight: Spacing.sm },
  sectionHeaderText: { fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.display, color: Colors.white },

  summaryCard: { backgroundColor: Colors.background.card, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.neutral['600'] },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs + 2 },
  dataLabel: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.body, color: Colors.neutral['300'], flex: 1 },
  dataValue: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.semibold, color: Colors.white, fontVariant: ['tabular-nums'] },
  divider: { height: 1, backgroundColor: Colors.neutral['600'], marginVertical: Spacing.xs },
  noDataText: { fontSize: Typography.scale.sm, color: Colors.neutral['400'], textAlign: 'center', paddingVertical: Spacing['3xl'], fontFamily: Typography.fontFamily.body },

  stockBarContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.sm },
  stockBarBg: { flex: 1, height: 8, backgroundColor: Colors.neutral['700'], borderRadius: BorderRadius.sm, overflow: 'hidden' },
  stockBarFill: { height: '100%', borderRadius: BorderRadius.sm },
  stockBarLabel: { fontSize: Typography.scale.xs, color: Colors.neutral['400'], width: 36, textAlign: 'right' },
});