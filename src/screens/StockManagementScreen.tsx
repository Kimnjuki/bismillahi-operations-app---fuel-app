import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import stockManagementService, {
  StationStockOverview,
  FuelStockDetail,
  TankDipInfo,
  DailyStockTransaction,
  TankDippingSummary,
} from '../services/stockManagementService';

// --- Helper Functions ---

const getTodayString = () => new Date().toISOString().split('T')[0];

const formatDateDisplay = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getFuelColor = (fuelType: string) => {
  switch (fuelType) {
    case 'PMS': return '#FF6B35';
    case 'AGO': return '#4CAF50';
    default: return '#F0C38E';
  }
};

const getFuelLabel = (fuelType: string) => {
  return fuelType === 'PMS' ? 'Premium Motor Spirit' : 'Automotive Gas Oil';
};

const getFuelIcon = (fuelType: string) => {
  return fuelType === 'PMS' ? 'flame' : 'car';
};

const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'critical': return '#FF4444';
    case 'low': return '#FFA726';
    case 'excess': return '#42A5F5';
    default: return '#4CAF50';
  }
};

const getStatusBgColor = (status: string): string => {
  switch (status) {
    case 'critical': return '#FFEBEE';
    case 'low': return '#FFF3E0';
    case 'excess': return '#E3F2FD';
    default: return '#E8F5E9';
  }
};

const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
  switch (status) {
    case 'critical': return 'warning';
    case 'low': return 'alert-circle';
    case 'excess': return 'arrow-up-circle';
    default: return 'checkmark-circle';
  }
};

// --- Tab Types ---
type TabType = 'overview' | 'dipping' | 'transactions' | 'report';

// --- Main Component ---
export default function StockManagementScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();

  // Data State
  const [stationsStock, setStationsStock] = useState<StationStockOverview[]>([]);
  const [transactions, setTransactions] = useState<DailyStockTransaction[]>([]);
  const [selectedStation, setSelectedStation] = useState<StationStockOverview | null>(null);
  const [expandedStation, setExpandedStation] = useState<string | null>(null);

  // UI State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showStationModal, setShowStationModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date'>('date');

  // Date State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateString, setDateString] = useState(getTodayString());

  // Daily Entry Form State
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryForm, setEntryForm] = useState({
    pms_received: '',
    ago_received: '',
    pms_sold: '',
    ago_sold: '',
    pms_variance: '0',
    ago_variance: '0',
    notes: '',
  });

  // Auto-deducted sales from pump readings
  const [autoDeductedSales, setAutoDeductedSales] = useState<{ pms: number; ago: number }>({ pms: 0, ago: 0 });

  // --- Data Loading ---

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const stockResult = await stockManagementService.getAllStationsStock(dateString);
      if (stockResult.success && stockResult.data) {
        setStationsStock(stockResult.data);
        // Auto-select first station
        if (!selectedStation && stockResult.data.length > 0) {
          setSelectedStation(stockResult.data[0]);
        }
      }

      // Load all daily transactions for the date
      const txResult = await stockManagementService.getAllDailyStockTransactions(dateString);
      if (txResult.success && txResult.data) {
        setTransactions(txResult.data);
      }

      // Auto-deduct sales from pump readings for each station
      if (stockResult.success && stockResult.data) {
        let totalPmsSold = 0;
        let totalAgoSold = 0;
        for (const station of stockResult.data) {
          const salesResult = await stockManagementService.autoDeductFromSales(station.station_id, dateString);
          if (salesResult.success && salesResult.data) {
            totalPmsSold += salesResult.data.pms_sold;
            totalAgoSold += salesResult.data.ago_sold;
          }
        }
        setAutoDeductedSales({ pms: totalPmsSold, ago: totalAgoSold });
      }
    } catch (error) {
      console.error('Error loading stock data:', error);
      Alert.alert('Error', 'Failed to load stock data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateString]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData();
  }, [loadAllData]);

  // --- Date Picker Handlers ---

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      setDateString(date.toISOString().split('T')[0]);
    }
  };

  const handleDatePreset = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    setSelectedDate(d);
    setDateString(d.toISOString().split('T')[0]);
  };

  // --- Station Selection ---

  const handleStationSelect = (station: StationStockOverview) => {
    setSelectedStation(station);
    setShowStationModal(false);
    setExpandedStation(station.station_id);
  };

  // --- Daily Entry Form ---

  const handleOpenEntryForm = () => {
    setEntryForm({
      pms_received: '',
      ago_received: '',
      pms_sold: '',
      ago_sold: '',
      pms_variance: '0',
      ago_variance: '0',
      notes: '',
    });
    setShowEntryForm(true);
  };

  const handleSaveEntry = async () => {
    if (!selectedStation) {
      Alert.alert('Error', 'Please select a station first');
      return;
    }

    // Validate
    if (!entryForm.pms_received && !entryForm.ago_received && !entryForm.pms_sold && !entryForm.ago_sold) {
      Alert.alert('Validation Error', 'Please fill in at least one field');
      return;
    }

    try {
      const result = await stockManagementService.saveDailyStockEntry(
        {
          station_id: selectedStation.station_id,
          pms_received: parseFloat(entryForm.pms_received) || 0,
          ago_received: parseFloat(entryForm.ago_received) || 0,
          pms_sold: parseFloat(entryForm.pms_sold) || 0,
          ago_sold: parseFloat(entryForm.ago_sold) || 0,
          pms_variance: parseFloat(entryForm.pms_variance) || 0,
          ago_variance: parseFloat(entryForm.ago_variance) || 0,
          notes: entryForm.notes,
        },
        appUser?.id || ''
      );

      if (result.success) {
        Alert.alert('Success', 'Daily stock entry saved successfully');
        setShowEntryForm(false);
        loadAllData();
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save daily stock entry');
    }
  };

  // --- Summary Calculation ---

  const getSummaryTotals = () => {
    let totalPms = 0, totalAgo = 0;
    let totalPmsMin = 0, totalAgoMin = 0;
    let criticalCount = 0, lowCount = 0, excessCount = 0;

    stationsStock.forEach(s => {
      totalPms += s.pms.current_stock;
      totalAgo += s.ago.current_stock;
      totalPmsMin += s.pms.minimum_stock;
      totalAgoMin += s.ago.minimum_stock;
      if (s.overall_status === 'critical') criticalCount++;
      if (s.overall_status === 'low') lowCount++;
      if (s.pms.status === 'excess' || s.ago.status === 'excess') excessCount++;
    });

    return { totalPms, totalAgo, totalPmsMin, totalAgoMin, criticalCount, lowCount, excessCount };
  };

  // --- Render Helpers ---

  const renderFuelProgressBar = (current: number, min: number, max: number, status: string) => {
    const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
    const barColor = getStatusColor(status);
    const bgColor = getStatusBgColor(status);

    return (
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarBg, { backgroundColor: '#E0E0E0' }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${percentage}%`,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: barColor }]}>
          {percentage.toFixed(0)}% Full
        </Text>
      </View>
    );
  };

  const renderExcessShortIndicator = (detail: FuelStockDetail) => {
    const isExcess = detail.status === 'excess';
    const isShort = detail.status === 'low' || detail.status === 'critical';
    const isNormal = !isExcess && !isShort;

    if (isNormal) return null;

    const color = isExcess ? '#42A5F5' : '#FF4444';
    const icon = isExcess ? 'arrow-up-circle' : 'arrow-down-circle';
    const label = isExcess ? 'EXCESS' : 'SHORT';
    const amount = isExcess ? detail.current_stock - detail.maximum_stock * 0.9 : detail.minimum_stock - detail.current_stock;

    return (
      <View style={[styles.excessShortBadge, { backgroundColor: isExcess ? '#E3F2FD' : '#FFEBEE' }]}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={[styles.excessShortText, { color }]}>
          {label}: {formatNumber(Math.abs(amount > 0 ? amount : 0))}L
        </Text>
      </View>
    );
  };

  const renderTankFillBar = (tank: TankDipInfo) => {
    const pct = tank.fill_percentage;
    let barColor = '#4CAF50';
    if (pct > 90) barColor = '#42A5F5';
    else if (pct < 20) barColor = '#FF4444';
    else if (pct < 40) barColor = '#FFA726';

    return (
      <View style={styles.tankFillContainer}>
        <View style={styles.tankFillBg}>
          <View
            style={[
              styles.tankFillBar,
              { width: `${pct}%`, backgroundColor: barColor },
            ]}
          />
        </View>
        <Text style={[styles.tankFillText, { color: barColor }]}>
          {pct.toFixed(0)}%
        </Text>
      </View>
    );
  };

  // --- MAIN RENDER ---

  const summary = getSummaryTotals();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Stock Management</Text>
              <Text style={styles.headerSubtitle}>Multi-Station Inventory Control</Text>
            </View>
            <TouchableOpacity onPress={handleOpenEntryForm} style={styles.headerAddBtn}>
              <Ionicons name="add-circle" size={24} color="#F0C38E" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Date Selector */}
      <View style={styles.dateSelectorContainer}>
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar" size={18} color="#F0C38E" />
          <Text style={styles.dateText}>{formatDateDisplay(dateString)}</Text>
          <Ionicons name="chevron-down" size={16} color="#F0C38E" />
        </TouchableOpacity>
        <View style={styles.datePresets}>
          <TouchableOpacity style={styles.datePresetBtn} onPress={() => handleDatePreset(0)}>
            <Text style={styles.datePresetText}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.datePresetBtn} onPress={() => handleDatePreset(-1)}>
            <Text style={styles.datePresetText}>Yesterday</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Station Selector */}
      {selectedStation && (
        <TouchableOpacity
          style={styles.stationSelectorBar}
          onPress={() => setShowStationModal(true)}
        >
          <View style={styles.stationSelectorInfo}>
            <Text style={styles.stationSelectorName}>{selectedStation.station_name}</Text>
            <Text style={styles.stationSelectorCode}>
              {selectedStation.station_code} - {selectedStation.location}
            </Text>
          </View>
          <Ionicons name="swap-vertical" size={20} color="#F0C38E" />
        </TouchableOpacity>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        {(['overview', 'dipping', 'transactions', 'report'] as TabType[]).map(tab => {
          const tabIcons: Record<TabType, keyof typeof Ionicons.glyphMap> = {
            overview: 'grid',
            dipping: 'water',
            transactions: 'receipt',
            report: 'document-text',
          };
          const tabLabels: Record<TabType, string> = {
            overview: 'Overview',
            dipping: 'Tank Dip',
            transactions: 'Daily Book',
            report: 'Report',
          };
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons
                name={tabIcons[tab]}
                size={16}
                color={activeTab === tab ? '#F0C38E' : '#999'}
              />
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tabLabels[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F0C38E" />
          <Text style={styles.loadingText}>Loading stock data...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F0C38E" />
          }
        >
          {/* === TAB: OVERVIEW === */}
          {activeTab === 'overview' && (
            <View style={styles.tabContent}>
              {/* Summary Cards */}
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { backgroundColor: '#FFF3E0' }]}>
                  <Text style={styles.summaryLabel}>PMS Stock</Text>
                  <Text style={[styles.summaryValue, { color: '#FF6B35' }]}>
                    {formatNumber(summary.totalPms, 0)} L
                  </Text>
                  <Text style={styles.summarySub}>Min: {formatNumber(summary.totalPmsMin, 0)}L</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={styles.summaryLabel}>AGO Stock</Text>
                  <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                    {formatNumber(summary.totalAgo, 0)} L
                  </Text>
                  <Text style={styles.summarySub}>Min: {formatNumber(summary.totalAgoMin, 0)}L</Text>
                </View>
              </View>

              {/* Alert Summary */}
              {(summary.criticalCount > 0 || summary.lowCount > 0 || summary.excessCount > 0) && (
                <View style={styles.alertSummaryCard}>
                  <Ionicons name="alert-circle" size={20} color="#FFA726" />
                  <Text style={styles.alertSummaryText}>
                    {summary.criticalCount > 0 && `${summary.criticalCount} critical · `}
                    {summary.lowCount > 0 && `${summary.lowCount} low stock · `}
                    {summary.excessCount > 0 && `${summary.excessCount} excess`}
                  </Text>
                </View>
              )}

              {/* Auto-Deducted Sales Info */}
              {autoDeductedSales.pms > 0 || autoDeductedSales.ago > 0 ? (
                <View style={styles.autoDeductCard}>
                  <Ionicons name="flash" size={18} color="#4CAF50" />
                  <Text style={styles.autoDeductText}>
                    Auto-deducted from pump readings: PMS {formatNumber(autoDeductedSales.pms)}L | AGO {formatNumber(autoDeductedSales.ago)}L
                  </Text>
                </View>
              ) : null}

              {/* Station Cards */}
              {stationsStock.map(station => (
                <TouchableOpacity
                  key={station.station_id}
                  style={[
                    styles.stationCard,
                    expandedStation === station.station_id && styles.stationCardExpanded,
                  ]}
                  onPress={() => {
                    setSelectedStation(station);
                    setExpandedStation(
                      expandedStation === station.station_id ? null : station.station_id
                    );
                  }}
                  activeOpacity={0.7}
                >
                  {/* Station Header */}
                  <View style={styles.stationCardHeader}>
                    <View style={styles.stationCardTitleRow}>
                      <Text style={styles.stationCardName}>{station.station_name}</Text>
                      <View
                        style={[
                          styles.statusBadgeSmall,
                          { backgroundColor: getStatusColor(station.overall_status) + '20' },
                        ]}
                      >
                        <Ionicons
                          name={getStatusIcon(station.overall_status)}
                          size={14}
                          color={getStatusColor(station.overall_status)}
                        />
                        <Text
                          style={[
                            styles.statusBadgeSmallText,
                            { color: getStatusColor(station.overall_status) },
                          ]}
                        >
                          {station.overall_status.charAt(0).toUpperCase() + station.overall_status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.stationCardLocation}>
                      {station.station_code} · {station.location}
                    </Text>
                  </View>

                  {/* PMS Stock */}
                  <View style={styles.fuelStockRow}>
                    <View style={styles.fuelStockIcon}>
                      <Ionicons name="flame" size={18} color={getFuelColor('PMS')} />
                    </View>
                    <View style={styles.fuelStockDetails}>
                      <View style={styles.fuelStockHeader}>
                        <Text style={styles.fuelStockLabel}>PMS</Text>
                        <View
                          style={[
                            styles.fuelStatusDot,
                            { backgroundColor: getStatusColor(station.pms.status) },
                          ]}
                        />
                        <Text
                          style={[
                            styles.fuelStatusText,
                            { color: getStatusColor(station.pms.status) },
                          ]}
                        >
                          {station.pms.status_label}
                        </Text>
                      </View>
                      <Text style={styles.fuelStockValue}>
                        {formatNumber(station.pms.current_stock, 0)} L
                      </Text>
                      {renderFuelProgressBar(
                        station.pms.current_stock,
                        station.pms.minimum_stock,
                        station.pms.maximum_stock,
                        station.pms.status
                      )}
                      <View style={styles.fuelStockMeta}>
                        <Text style={styles.fuelStockMetaText}>
                          Min: {formatNumber(station.pms.minimum_stock, 0)}L
                        </Text>
                        <Text style={styles.fuelStockMetaText}>
                          Dip: {formatNumber(station.pms.tank_dip, 0)}L
                        </Text>
                        {renderExcessShortIndicator(station.pms)}
                      </View>
                    </View>
                  </View>

                  {/* AGO Stock */}
                  <View style={[styles.fuelStockRow, { marginTop: 12 }]}>
                    <View style={styles.fuelStockIcon}>
                      <Ionicons name="car" size={18} color={getFuelColor('AGO')} />
                    </View>
                    <View style={styles.fuelStockDetails}>
                      <View style={styles.fuelStockHeader}>
                        <Text style={styles.fuelStockLabel}>AGO</Text>
                        <View
                          style={[
                            styles.fuelStatusDot,
                            { backgroundColor: getStatusColor(station.ago.status) },
                          ]}
                        />
                        <Text
                          style={[
                            styles.fuelStatusText,
                            { color: getStatusColor(station.ago.status) },
                          ]}
                        >
                          {station.ago.status_label}
                        </Text>
                      </View>
                      <Text style={styles.fuelStockValue}>
                        {formatNumber(station.ago.current_stock, 0)} L
                      </Text>
                      {renderFuelProgressBar(
                        station.ago.current_stock,
                        station.ago.minimum_stock,
                        station.ago.maximum_stock,
                        station.ago.status
                      )}
                      <View style={styles.fuelStockMeta}>
                        <Text style={styles.fuelStockMetaText}>
                          Min: {formatNumber(station.ago.minimum_stock, 0)}L
                        </Text>
                        <Text style={styles.fuelStockMetaText}>
                          Dip: {formatNumber(station.ago.tank_dip, 0)}L
                        </Text>
                        {renderExcessShortIndicator(station.ago)}
                      </View>
                    </View>
                  </View>

                  {/* Variance Display */}
                  <View style={styles.varianceRow}>
                    <View style={styles.varianceItem}>
                      <Text style={styles.varianceLabel}>Dip Variance</Text>
                      <Text
                        style={[
                          styles.varianceValue,
                          {
                            color:
                              station.pms.dip_variance > 50 || station.pms.dip_variance < -50
                                ? '#FF4444'
                                : '#4CAF50',
                          },
                        ]}
                      >
                        PMS: {station.pms.dip_variance >= 0 ? '+' : ''}
                        {formatNumber(station.pms.dip_variance)}L
                      </Text>
                      <Text
                        style={[
                          styles.varianceValue,
                          {
                            color:
                              station.ago.dip_variance > 50 || station.ago.dip_variance < -50
                                ? '#FF4444'
                                : '#4CAF50',
                          },
                        ]}
                      >
                        AGO: {station.ago.dip_variance >= 0 ? '+' : ''}
                        {formatNumber(station.ago.dip_variance)}L
                      </Text>
                    </View>
                    <View style={styles.varianceItem}>
                      <Text style={styles.varianceLabel}>Excess / Short</Text>
                      <Text
                        style={[
                          styles.varianceValue,
                          {
                            color:
                              station.pms.excess_short > 0
                                ? '#42A5F5'
                                : station.pms.excess_short < 0
                                ? '#FF4444'
                                : '#666',
                          },
                        ]}
                      >
                        PMS: {station.pms.excess_short >= 0 ? '+' : ''}
                        {formatNumber(station.pms.excess_short)}L
                      </Text>
                      <Text
                        style={[
                          styles.varianceValue,
                          {
                            color:
                              station.ago.excess_short > 0
                                ? '#42A5F5'
                                : station.ago.excess_short < 0
                                ? '#FF4444'
                                : '#666',
                          },
                        ]}
                      >
                        AGO: {station.ago.excess_short >= 0 ? '+' : ''}
                        {formatNumber(station.ago.excess_short)}L
                      </Text>
                    </View>
                  </View>

                  {/* Today's Sales Deduction */}
                  <View style={styles.salesDeductionRow}>
                    <Ionicons name="trending-down" size={16} color="#FF6B35" />
                    <Text style={styles.salesDeductionText}>
                      Today Sold: PMS {formatNumber(station.pms.sold_today)}L · AGO {formatNumber(station.ago.sold_today)}L
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {stationsStock.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="alert-circle" size={48} color="#F0C38E" />
                  <Text style={styles.emptyStateText}>No stock data available for {formatDateDisplay(dateString)}</Text>
                </View>
              )}
            </View>
          )}

          {/* === TAB: TANK DIPPING === */}
          {activeTab === 'dipping' && (
            <View style={styles.tabContent}>
              <View style={styles.tabSectionHeader}>
                <Ionicons name="water" size={20} color="#F0C38E" />
                <Text style={styles.tabSectionTitle}>Tank Dipping Readings</Text>
              </View>
              <Text style={styles.tabSectionSubtitle}>
                Current tank dip readings linked to stock. Variance = Current Dip - Book Stock.
                Positive variance = excess, Negative variance = shortage.
              </Text>

              {selectedStation ? (
                <>
                  {/* PMS Tanks */}
                  {selectedStation.tank_dipping.pms_tanks.length > 0 && (
                    <View style={styles.tankFuelSection}>
                      <View style={styles.tankFuelSectionHeader}>
                        <Ionicons name="flame" size={18} color="#FF6B35" />
                        <Text style={styles.tankFuelSectionTitle}>PMS Tanks</Text>
                        <Text style={styles.tankFuelSectionTotal}>
                          Total Dip: {formatNumber(selectedStation.tank_dipping.total_pms_dip)}L
                        </Text>
                      </View>

                      {selectedStation.tank_dipping.pms_tanks.map(tank => (
                        <View key={tank.tank_id} style={styles.tankCard}>
                          <View style={styles.tankCardHeader}>
                            <Text style={styles.tankName}>{tank.tank_name}</Text>
                            <Text style={styles.tankCapacity}>
                              Capacity: {formatNumber(tank.capacity, 0)}L
                            </Text>
                          </View>

                          {renderTankFillBar(tank)}

                          <View style={styles.tankDipRow}>
                            <View style={styles.tankDipField}>
                              <Text style={styles.tankDipLabel}>Previous Dip</Text>
                              <Text style={styles.tankDipValue}>{formatNumber(tank.previous_dip)}L</Text>
                            </View>
                            <View style={styles.tankDipField}>
                              <Text style={styles.tankDipLabel}>Current Dip</Text>
                              <Text style={styles.tankDipValue}>{formatNumber(tank.current_dip)}L</Text>
                            </View>
                            <View style={styles.tankDipField}>
                              <Text style={styles.tankDipLabel}>Variance</Text>
                              <Text
                                style={[
                                  styles.tankDipValue,
                                  {
                                    color:
                                      tank.variance > 0
                                        ? '#42A5F5'
                                        : tank.variance < 0
                                        ? '#FF4444'
                                        : '#666',
                                  },
                                ]}
                              >
                                {tank.variance >= 0 ? '+' : ''}
                                {formatNumber(tank.variance)}L
                              </Text>
                            </View>
                          </View>

                          {/* Excess/Short Indicator */}
                          {(tank.has_excess || tank.has_shortage) && (
                            <View
                              style={[
                                styles.tankAlertBar,
                                {
                                  backgroundColor: tank.has_excess ? '#E3F2FD' : '#FFEBEE',
                                },
                              ]}
                            >
                              <Ionicons
                                name={tank.has_excess ? 'arrow-up-circle' : 'arrow-down-circle'}
                                size={16}
                                color={tank.has_excess ? '#42A5F5' : '#FF4444'}
                              />
                              <Text
                                style={[
                                  styles.tankAlertText,
                                  { color: tank.has_excess ? '#42A5F5' : '#FF4444' },
                                ]}
                              >
                                {tank.has_excess
                                  ? `EXCESS: ${formatNumber(tank.excess_short_amount)}L above book stock`
                                  : `SHORTAGE: ${formatNumber(Math.abs(tank.excess_short_amount))}L below book stock`}
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* AGO Tanks */}
                  {selectedStation.tank_dipping.ago_tanks.length > 0 && (
                    <View style={[styles.tankFuelSection, { marginTop: 20 }]}>
                      <View style={styles.tankFuelSectionHeader}>
                        <Ionicons name="car" size={18} color="#4CAF50" />
                        <Text style={styles.tankFuelSectionTitle}>AGO Tanks</Text>
                        <Text style={styles.tankFuelSectionTotal}>
                          Total Dip: {formatNumber(selectedStation.tank_dipping.total_ago_dip)}L
                        </Text>
                      </View>

                      {selectedStation.tank_dipping.ago_tanks.map(tank => (
                        <View key={tank.tank_id} style={styles.tankCard}>
                          <View style={styles.tankCardHeader}>
                            <Text style={styles.tankName}>{tank.tank_name}</Text>
                            <Text style={styles.tankCapacity}>
                              Capacity: {formatNumber(tank.capacity, 0)}L
                            </Text>
                          </View>

                          {renderTankFillBar(tank)}

                          <View style={styles.tankDipRow}>
                            <View style={styles.tankDipField}>
                              <Text style={styles.tankDipLabel}>Previous Dip</Text>
                              <Text style={styles.tankDipValue}>{formatNumber(tank.previous_dip)}L</Text>
                            </View>
                            <View style={styles.tankDipField}>
                              <Text style={styles.tankDipLabel}>Current Dip</Text>
                              <Text style={styles.tankDipValue}>{formatNumber(tank.current_dip)}L</Text>
                            </View>
                            <View style={styles.tankDipField}>
                              <Text style={styles.tankDipLabel}>Variance</Text>
                              <Text
                                style={[
                                  styles.tankDipValue,
                                  {
                                    color:
                                      tank.variance > 0
                                        ? '#42A5F5'
                                        : tank.variance < 0
                                        ? '#FF4444'
                                        : '#666',
                                  },
                                ]}
                              >
                                {tank.variance >= 0 ? '+' : ''}
                                {formatNumber(tank.variance)}L
                              </Text>
                            </View>
                          </View>

                          {(tank.has_excess || tank.has_shortage) && (
                            <View
                              style={[
                                styles.tankAlertBar,
                                {
                                  backgroundColor: tank.has_excess ? '#E3F2FD' : '#FFEBEE',
                                },
                              ]}
                            >
                              <Ionicons
                                name={tank.has_excess ? 'arrow-up-circle' : 'arrow-down-circle'}
                                size={16}
                                color={tank.has_excess ? '#42A5F5' : '#FF4444'}
                              />
                              <Text
                                style={[
                                  styles.tankAlertText,
                                  { color: tank.has_excess ? '#42A5F5' : '#FF4444' },
                                ]}
                              >
                                {tank.has_excess
                                  ? `EXCESS: ${formatNumber(tank.excess_short_amount)}L above book stock`
                                  : `SHORTAGE: ${formatNumber(Math.abs(tank.excess_short_amount))}L below book stock`}
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedStation.tank_dipping.pms_tanks.length === 0 &&
                    selectedStation.tank_dipping.ago_tanks.length === 0 && (
                      <View style={styles.emptyState}>
                        <Ionicons name="water" size={48} color="#F0C38E" />
                        <Text style={styles.emptyStateText}>No tanks found for this station</Text>
                      </View>
                    )}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="hand-left" size={48} color="#F0C38E" />
                  <Text style={styles.emptyStateText}>Select a station to view tank dipping</Text>
                </View>
              )}
            </View>
          )}

          {/* === TAB: TRANSACTIONS === */}
          {activeTab === 'transactions' && (
            <View style={styles.tabContent}>
              <View style={styles.tabSectionHeader}>
                <Ionicons name="receipt" size={20} color="#F0C38E" />
                <Text style={styles.tabSectionTitle}>Daily Stock Book</Text>
              </View>
              <Text style={styles.tabSectionSubtitle}>
                Daily stock transactions for {formatDateDisplay(dateString)}.
                Received stock adds to inventory, sold stock auto-deducts.
              </Text>

              {/* Auto-Deduct Banner */}
              {autoDeductedSales.pms > 0 || autoDeductedSales.ago > 0 ? (
                <View style={styles.autoDeductBanner}>
                  <Ionicons name="flash" size={18} color="#fff" />
                  <View style={styles.autoDeductBannerText}>
                    <Text style={styles.autoDeductBannerTitle}>Auto-Deducted from Pump Sales</Text>
                    <Text style={styles.autoDeductBannerSub}>
                      PMS: {formatNumber(autoDeductedSales.pms)}L | AGO: {formatNumber(autoDeductedSales.ago)}L
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Entry Form Button */}
              <TouchableOpacity style={styles.addEntryButton} onPress={handleOpenEntryForm}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addEntryButtonText}>Add Daily Stock Entry</Text>
              </TouchableOpacity>

              {/* Transactions List */}
              {transactions.length > 0 ? (
                transactions.map(tx => (
                  <View key={tx.id} style={styles.transactionCard}>
                    <View style={styles.transactionHeader}>
                      <Text style={styles.transactionStation}>{tx.station_name}</Text>
                      <Text style={styles.transactionDate}>
                        {formatDateDisplay(tx.transaction_date)}
                      </Text>
                    </View>

                    <View style={styles.transactionGrid}>
                      <View style={styles.transactionItem}>
                        <Text style={styles.transactionLabel}>PMS Received</Text>
                        <Text style={styles.transactionValueGreen}>
                          +{formatNumber(tx.pms_received)}L
                        </Text>
                      </View>
                      <View style={styles.transactionItem}>
                        <Text style={styles.transactionLabel}>AGO Received</Text>
                        <Text style={styles.transactionValueGreen}>
                          +{formatNumber(tx.ago_received)}L
                        </Text>
                      </View>
                      <View style={styles.transactionItem}>
                        <Text style={styles.transactionLabel}>PMS Sold</Text>
                        <Text style={styles.transactionValueRed}>
                          -{formatNumber(tx.pms_sold)}L
                        </Text>
                      </View>
                      <View style={styles.transactionItem}>
                        <Text style={styles.transactionLabel}>AGO Sold</Text>
                        <Text style={styles.transactionValueRed}>
                          -{formatNumber(tx.ago_sold)}L
                        </Text>
                      </View>
                    </View>

                    {(tx.pms_variance > 0 || tx.ago_variance > 0) && (
                      <View style={styles.transactionVarianceRow}>
                        <Ionicons name="analytics" size={14} color="#FFA726" />
                        <Text style={styles.transactionVarianceText}>
                          Variance: PMS {tx.pms_variance >= 0 ? '+' : ''}
                          {formatNumber(tx.pms_variance)}L · AGO {tx.ago_variance >= 0 ? '+' : ''}
                          {formatNumber(tx.ago_variance)}L
                        </Text>
                      </View>
                    )}

                    {tx.notes ? (
                      <Text style={styles.transactionNotes}>{tx.notes}</Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="receipt" size={48} color="#F0C38E" />
                  <Text style={styles.emptyStateText}>
                    No daily stock entries for {formatDateDisplay(dateString)}
                  </Text>
                  <Text style={styles.emptyStateSub}>
                    Tap "Add Daily Stock Entry" to record stock movements
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* === TAB: REPORT === */}
          {activeTab === 'report' && selectedStation && (
            <View style={styles.tabContent}>
              <View style={styles.tabSectionHeader}>
                <Ionicons name="document-text" size={20} color="#F0C38E" />
                <Text style={styles.tabSectionTitle}>Station Report</Text>
              </View>
              <Text style={styles.tabSectionSubtitle}>
                Comprehensive stock report for {selectedStation.station_name} on {formatDateDisplay(dateString)}
              </Text>

              {/* Stock Summary Card */}
              <View style={styles.reportCard}>
                <Text style={styles.reportCardTitle}>Stock Summary</Text>

                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Opening Stock (PMS)</Text>
                  <Text style={styles.reportValue}>
                    {formatNumber(
                      selectedStation.pms.current_stock -
                        selectedStation.pms.received_today +
                        selectedStation.pms.sold_today,
                      0
                    )}{' '}
                    L
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Received (PMS)</Text>
                  <Text style={[styles.reportValue, { color: '#4CAF50' }]}>
                    +{formatNumber(selectedStation.pms.received_today, 0)} L
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Sold (PMS)</Text>
                  <Text style={[styles.reportValue, { color: '#FF4444' }]}>
                    -{formatNumber(selectedStation.pms.sold_today, 0)} L
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Current Stock (PMS)</Text>
                  <Text style={[styles.reportValue, { fontWeight: 'bold' }]}>
                    {formatNumber(selectedStation.pms.current_stock, 0)} L
                  </Text>
                </View>
                <View style={styles.reportDivider} />
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Opening Stock (AGO)</Text>
                  <Text style={styles.reportValue}>
                    {formatNumber(
                      selectedStation.ago.current_stock -
                        selectedStation.ago.received_today +
                        selectedStation.ago.sold_today,
                      0
                    )}{' '}
                    L
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Received (AGO)</Text>
                  <Text style={[styles.reportValue, { color: '#4CAF50' }]}>
                    +{formatNumber(selectedStation.ago.received_today, 0)} L
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Sold (AGO)</Text>
                  <Text style={[styles.reportValue, { color: '#FF4444' }]}>
                    -{formatNumber(selectedStation.ago.sold_today, 0)} L
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Current Stock (AGO)</Text>
                  <Text style={[styles.reportValue, { fontWeight: 'bold' }]}>
                    {formatNumber(selectedStation.ago.current_stock, 0)} L
                  </Text>
                </View>
              </View>

              {/* Variance Card */}
              <View style={styles.reportCard}>
                <Text style={styles.reportCardTitle}>Variance Analysis</Text>

                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>PMS Dip Variance</Text>
                  <Text
                    style={[
                      styles.reportValue,
                      {
                        color:
                          selectedStation.pms.dip_variance > 0 ? '#42A5F5' : '#FF4444',
                      },
                    ]}
                  >
                    {selectedStation.pms.dip_variance >= 0 ? '+' : ''}
                    {formatNumber(selectedStation.pms.dip_variance)} L
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>AGO Dip Variance</Text>
                  <Text
                    style={[
                      styles.reportValue,
                      {
                        color:
                          selectedStation.ago.dip_variance > 0 ? '#42A5F5' : '#FF4444',
                      },
                    ]}
                  >
                    {selectedStation.ago.dip_variance >= 0 ? '+' : ''}
                    {formatNumber(selectedStation.ago.dip_variance)} L
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>PMS Excess/Short</Text>
                  <Text
                    style={[
                      styles.reportValue,
                      {
                        color:
                          selectedStation.pms.excess_short > 0
                            ? '#42A5F5'
                            : selectedStation.pms.excess_short < 0
                            ? '#FF4444'
                            : '#666',
                      },
                    ]}
                  >
                    {selectedStation.pms.excess_short >= 0 ? '+' : ''}
                    {formatNumber(selectedStation.pms.excess_short)} L
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>AGO Excess/Short</Text>
                  <Text
                    style={[
                      styles.reportValue,
                      {
                        color:
                          selectedStation.ago.excess_short > 0
                            ? '#42A5F5'
                            : selectedStation.ago.excess_short < 0
                            ? '#FF4444'
                            : '#666',
                      },
                    ]}
                  >
                    {selectedStation.ago.excess_short >= 0 ? '+' : ''}
                    {formatNumber(selectedStation.ago.excess_short)} L
                  </Text>
                </View>
              </View>

              {/* Tank Dipping Summary Card */}
              <View style={styles.reportCard}>
                <Text style={styles.reportCardTitle}>Tank Dipping Summary</Text>

                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>PMS Tanks Dip Total</Text>
                  <Text style={styles.reportValue}>
                    {formatNumber(selectedStation.tank_dipping.total_pms_dip, 0)} L
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>AGO Tanks Dip Total</Text>
                  <Text style={styles.reportValue}>
                    {formatNumber(selectedStation.tank_dipping.total_ago_dip, 0)} L
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>PMS Capacity</Text>
                  <Text style={styles.reportValue}>
                    {formatNumber(selectedStation.pms.tank_capacity, 0)} L
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>AGO Capacity</Text>
                  <Text style={styles.reportValue}>
                    {formatNumber(selectedStation.ago.tank_capacity, 0)} L
                  </Text>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'report' && !selectedStation && (
            <View style={styles.emptyState}>
              <Ionicons name="hand-left" size={48} color="#F0C38E" />
              <Text style={styles.emptyStateText}>Select a station to view the report</Text>
            </View>
          )}

          {/* Spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Station Selection Modal */}
      <Modal
        visible={showStationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Station</Text>
              <TouchableOpacity onPress={() => setShowStationModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {stationsStock.map(station => (
                <TouchableOpacity
                  key={station.station_id}
                  style={[
                    styles.modalOption,
                    selectedStation?.station_id === station.station_id &&
                      styles.modalOptionSelected,
                  ]}
                  onPress={() => handleStationSelect(station)}
                >
                  <View style={styles.modalOptionInfo}>
                    <Text
                      style={[
                        styles.modalOptionText,
                        selectedStation?.station_id === station.station_id &&
                          styles.modalOptionTextSelected,
                      ]}
                    >
                      {station.station_name}
                    </Text>
                    <Text style={styles.modalOptionSub}>
                      {station.station_code} · {station.location}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.modalOptionBadge,
                      { backgroundColor: getStatusColor(station.overall_status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalOptionBadgeText,
                        { color: getStatusColor(station.overall_status) },
                      ]}
                    >
                      {station.overall_status}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Daily Entry Form Modal */}
      <Modal
        visible={showEntryForm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEntryForm(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.formModalScroll}>
            <View style={styles.formModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Daily Stock Entry - {selectedStation?.station_name || 'N/A'}
                </Text>
                <TouchableOpacity onPress={() => setShowEntryForm(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Fuel Received (Liters)</Text>
                <View style={styles.formRow}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>PMS</Text>
                    <TextInput
                      style={styles.formInput}
                      value={entryForm.pms_received}
                      onChangeText={text =>
                        setEntryForm(prev => ({ ...prev, pms_received: text }))
                      }
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>AGO</Text>
                    <TextInput
                      style={styles.formInput}
                      value={entryForm.ago_received}
                      onChangeText={text =>
                        setEntryForm(prev => ({ ...prev, ago_received: text }))
                      }
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Fuel Sold (Liters)</Text>
                <View style={styles.formRow}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>PMS</Text>
                    <TextInput
                      style={styles.formInput}
                      value={entryForm.pms_sold}
                      onChangeText={text =>
                        setEntryForm(prev => ({ ...prev, pms_sold: text }))
                      }
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>AGO</Text>
                    <TextInput
                      style={styles.formInput}
                      value={entryForm.ago_sold}
                      onChangeText={text =>
                        setEntryForm(prev => ({ ...prev, ago_sold: text }))
                      }
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Variance (Liters)</Text>
                <View style={styles.formRow}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>PMS</Text>
                    <TextInput
                      style={styles.formInput}
                      value={entryForm.pms_variance}
                      onChangeText={text =>
                        setEntryForm(prev => ({ ...prev, pms_variance: text }))
                      }
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>AGO</Text>
                    <TextInput
                      style={styles.formInput}
                      value={entryForm.ago_variance}
                      onChangeText={text =>
                        setEntryForm(prev => ({ ...prev, ago_variance: text }))
                      }
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Notes</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={entryForm.notes}
                  onChangeText={text =>
                    setEntryForm(prev => ({ ...prev, notes: text }))
                  }
                  placeholder="Optional notes..."
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.formSaveButton}
                  onPress={handleSaveEntry}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.formSaveText}>Save Entry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.formCancelButton}
                  onPress={() => setShowEntryForm(false)}
                >
                  <Text style={styles.formCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBackBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  headerAddBtn: {
    padding: 4,
  },

  // Date Selector
  dateSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  },
  dateText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  datePresets: {
    flexDirection: 'row',
    marginLeft: 8,
    gap: 4,
  },
  datePresetBtn: {
    backgroundColor: 'rgba(240,195,142,0.15)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  datePresetText: {
    color: '#F0C38E',
    fontSize: 12,
    fontWeight: '500',
  },

  // Station Selector Bar
  stationSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  stationSelectorInfo: {
    flex: 1,
  },
  stationSelectorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  stationSelectorCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 4,
  },
  tabActive: {
    borderBottomColor: '#F0C38E',
  },
  tabText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#F0C38E',
    fontWeight: 'bold',
  },

  // Content
  content: {
    flex: 1,
    padding: 12,
  },
  tabContent: {
    gap: 12,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#F0C38E',
    marginTop: 12,
    fontSize: 14,
  },

  // Summary Cards
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  summarySub: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },

  // Alert Summary
  alertSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  alertSummaryText: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '500',
    flex: 1,
  },

  // Auto-Deduct Card
  autoDeductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  autoDeductText: {
    fontSize: 12,
    color: '#2E7D32',
    flex: 1,
  },

  // Station Cards
  stationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  stationCardExpanded: {
    borderWidth: 1,
    borderColor: '#F0C38E',
  },
  stationCardHeader: {
    marginBottom: 12,
  },
  stationCardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stationCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  stationCardLocation: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  // Status Badge
  statusBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeSmallText: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Fuel Stock Row
  fuelStockRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fuelStockIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fuelStockDetails: {
    flex: 1,
  },
  fuelStockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fuelStockLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  fuelStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fuelStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fuelStockValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  fuelStockMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  fuelStockMetaText: {
    fontSize: 11,
    color: '#999',
  },

  // Progress Bar
  progressBarContainer: {
    marginTop: 6,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },

  // Excess/Short Badge
  excessShortBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  excessShortText: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Variance Row
  varianceRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 16,
  },
  varianceItem: {
    flex: 1,
  },
  varianceLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  varianceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },

  // Sales Deduction
  salesDeductionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 6,
  },
  salesDeductionText: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  emptyStateSub: {
    fontSize: 13,
    color: '#bbb',
    textAlign: 'center',
  },

  // Tab Section Header
  tabSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tabSectionSubtitle: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
  },

  // Tank Fuel Section
  tankFuelSection: {
    gap: 12,
  },
  tankFuelSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tankFuelSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  tankFuelSectionTotal: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },

  // Tank Card
  tankCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tankCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tankName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  tankCapacity: {
    fontSize: 12,
    color: '#999',
  },

  // Tank Fill Bar
  tankFillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tankFillBg: {
    flex: 1,
    height: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  tankFillBar: {
    height: '100%',
    borderRadius: 5,
  },
  tankFillText: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'right',
  },

  // Tank Dip Row
  tankDipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tankDipField: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 10,
  },
  tankDipLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  tankDipValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },

  // Tank Alert Bar
  tankAlertBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  tankAlertText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  // Auto-Deduct Banner
  autoDeductBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  autoDeductBannerText: {
    flex: 1,
  },
  autoDeductBannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  autoDeductBannerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Add Entry Button
  addEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  addEntryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },

  // Transaction Card
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionStation: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  transactionItem: {
    width: '48%',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 10,
  },
  transactionLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  transactionValueGreen: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  transactionValueRed: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF4444',
  },
  transactionVarianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  transactionVarianceText: {
    fontSize: 12,
    color: '#FFA726',
    fontWeight: '500',
  },
  transactionNotes: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },

  // Report Card
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reportCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  reportLabel: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  reportValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  reportDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionSelected: {
    backgroundColor: '#FFF8E1',
  },
  modalOptionInfo: {
    flex: 1,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  modalOptionTextSelected: {
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  modalOptionSub: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  modalOptionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalOptionBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Form Modal
  formModalScroll: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  formModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    marginTop: 'auto',
    paddingBottom: 40,
  },
  formSection: {
    marginBottom: 16,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formGroup: {
    flex: 1,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    color: '#333',
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  formSaveButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  formSaveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  formCancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  formCancelText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 16,
  },
});