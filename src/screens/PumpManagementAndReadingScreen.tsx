import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { stationService, SAMPLE_STATIONS } from '../services/stationService';
import { pumpService } from '../services/pumpService';
import { pumpReadingService } from '../services/pumpReadingService';
import { tankService } from '../services/tankService';
import { Station, Pump, Tank, PumpFuelType } from '../types';

interface PumpReadingInput {
  pumpId: string;
  pumpName: string;
  pumpNumber: number;
  fuelType: PumpFuelType;
  todayReading: string;
  yesterdayReading: string;
  dailySales: number;
  hasExistingReading: boolean;
}

interface TankDippingInput {
  tankId: string;
  tankName: string;
  fuelType: PumpFuelType;
  capacity: number;
  previousDip: string;
  currentDip: string;
  offload: string;
  variance: number;
  pumps: string[];
}

export default function PumpManagementAndReadingScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [pumpReadings, setPumpReadings] = useState<{ [pumpId: string]: PumpReadingInput }>({});
  const [tankDippings, setTankDippings] = useState<{ [tankId: string]: TankDippingInput }>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showStationPicker, setShowStationPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'pumps' | 'tanks'>('pumps');
  const [readingDate, setReadingDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());

  // Derived: is this a drum station? (DEPOT ISSIRO)
  const isDrumStation = selectedStation?.system_type === 'drum' || selectedStation?.name?.toLowerCase().includes('issiro');

  const getFuelTypeColor = (fuelType: string | undefined) => {
    switch (fuelType) {
      case 'PMS': return '#FF6B35';
      case 'AGO': return '#4CAF50';
      default: return '#F0C38E';
    }
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) < 0.5) return '#4CAF50';
    if (variance > 0) return '#4CAF50';
    if (variance < 0) return '#F44336';
    return '#F0C38E';
  };

  const formatNumber = (n: number) => n.toFixed(2);

  // Calculate dip consumption for a fuel type: sum of (previousDip + offload - currentDip)
  const getDipConsumptionByFuelType = (fuelType: PumpFuelType): number => {
    const fuelTanks = tanks.filter(t => t.fuel_type === fuelType);
    let total = 0;
    for (const tank of fuelTanks) {
      const dip = tankDippings[tank.id];
      if (dip) {
        total += (parseFloat(dip.previousDip) || 0) + (parseFloat(dip.offload) || 0) - (parseFloat(dip.currentDip) || 0);
      }
    }
    return total;
  };

  // Get total pump sales for a fuel type
  const getTotalPumpSalesByFuelType = (fuelType: PumpFuelType): number => {
    return Object.values(pumpReadings)
      .filter(r => r.fuelType === fuelType)
      .reduce((sum, r) => sum + r.dailySales, 0);
  };

  // Validate dip consumption vs pump sales for a fuel type
  const validateDipVsSales = (fuelType: PumpFuelType): { match: boolean; dipConsumption: number; sales: number; diff: number; message: string } => {
    const dipConsumption = getDipConsumptionByFuelType(fuelType);
    const sales = getTotalPumpSalesByFuelType(fuelType);
    const diff = Math.round((dipConsumption - sales) * 100) / 100;
    const match = Math.abs(diff) <= 0.5;

    return {
      match,
      dipConsumption,
      sales,
      diff,
      message: match
        ? `✓ ${fuelType}: Dip (${dipConsumption.toFixed(2)}L) matches sales (${sales.toFixed(2)}L)`
        : `✗ ${fuelType} MISMATCH: Dip (${dipConsumption.toFixed(2)}L) ≠ Sales (${sales.toFixed(2)}L). Diff: ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}L`,
    };
  };

  const calculateDailySales = (today: number, yesterday: number) => today - yesterday;

  const loadStations = useCallback(async () => {
    try {
      const response = await stationService.getStations();
      if (response.success && response.data && response.data.length > 0) {
        setStations(response.data);
        if (response.data.length > 0 && !selectedStation) {
          setSelectedStation(response.data[0]);
        }
      } else {
        setStations(SAMPLE_STATIONS);
        if (SAMPLE_STATIONS.length > 0 && !selectedStation) {
          setSelectedStation(SAMPLE_STATIONS[0]);
        }
      }
    } catch (error) {
      console.error('Error loading stations:', error);
      setStations(SAMPLE_STATIONS);
      if (SAMPLE_STATIONS.length > 0 && !selectedStation) {
        setSelectedStation(SAMPLE_STATIONS[0]);
      }
    }
  }, [selectedStation]);

  // Batch state update to prevent flickering
  const applyStationData = useCallback((
    newPumps: Pump[],
    newTanks: Tank[],
    newPumpReadings: { [pumpId: string]: PumpReadingInput },
    newTankDippings: { [tankId: string]: TankDippingInput },
  ) => {
    setPumps(newPumps);
    setTanks(newTanks);
    setPumpReadings(newPumpReadings);
    setTankDippings(newTankDippings);
    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedStation) return;
    setLoading(true);

    try {
      const [pumpsResponse, tanksResponse] = await Promise.all([
        pumpService.getPumpsByStation(selectedStation.id),
        tankService.getTanksByStation(selectedStation.id),
      ]);

      const loadedPumps: Pump[] = (pumpsResponse.success && pumpsResponse.data) ? pumpsResponse.data : [];
      const loadedTanks: Tank[] = (tanksResponse.success && tanksResponse.data) ? tanksResponse.data : [];

      // Fetch pump readings
      const pumpReadingsPromises = loadedPumps.map(async (pump) => {
        const [existingReadingResult, yesterdayReadingResult] = await Promise.all([
          pumpReadingService.getPumpReadingsByDate(pump.id, readingDate),
          pumpReadingService.getYesterdayPumpReading(pump.id, readingDate),
        ]);
        const hasExisting = existingReadingResult.success && existingReadingResult.data && existingReadingResult.data.length > 0;
        const existing = hasExisting ? existingReadingResult.data![0] : null;
        return {
          pumpId: pump.id,
          pumpName: pump.name,
          pumpNumber: pump.pump_number,
          fuelType: pump.fuel_type,
          todayReading: existing ? existing.today_reading.toString() : '0',
          yesterdayReading: existing ? existing.yesterday_reading.toString() :
            (yesterdayReadingResult.success && yesterdayReadingResult.data ? yesterdayReadingResult.data.today_reading.toString() : '0'),
          dailySales: existing ? existing.daily_sales : 0,
          hasExistingReading: hasExisting,
        } as PumpReadingInput;
      });
      const pumpReadingsResults = await Promise.all(pumpReadingsPromises);
      const pumpReadingsMap: { [pumpId: string]: PumpReadingInput } = {};
      for (const reading of pumpReadingsResults) {
        pumpReadingsMap[reading.pumpId] = reading;
      }

      // Initialize tank dippings
      const tankDippingMap: { [tankId: string]: TankDippingInput } = {};
      for (const tank of loadedTanks) {
        tankDippingMap[tank.id] = {
          tankId: tank.id,
          tankName: tank.name,
          fuelType: tank.fuel_type,
          capacity: tank.capacity,
          previousDip: tank.closing_book_stock.toString(),
          currentDip: tank.current_dipping.toString(),
          offload: '0',
          variance: tank.variance,
          pumps: tank.pumps,
        };
      }

      applyStationData(loadedPumps, loadedTanks, pumpReadingsMap, tankDippingMap);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStation, readingDate, applyStationData]);

  const handlePumpReadingChange = (pumpId: string, field: 'todayReading' | 'yesterdayReading', value: string) => {
    const updated = { ...pumpReadings };
    if (updated[pumpId]) {
      updated[pumpId] = { ...updated[pumpId], [field]: value };
      const today = parseFloat(field === 'todayReading' ? value : updated[pumpId].todayReading) || 0;
      const yesterday = parseFloat(field === 'yesterdayReading' ? value : updated[pumpId].yesterdayReading) || 0;
      updated[pumpId].dailySales = calculateDailySales(today, yesterday);
    }
    setPumpReadings(updated);
  };

  const handleTankDippingChange = (tankId: string, field: keyof TankDippingInput, value: string) => {
    const updated = { ...tankDippings };
    if (updated[tankId]) {
      updated[tankId] = { ...updated[tankId], [field]: value };
      const currentDip = parseFloat(field === 'currentDip' ? value : updated[tankId].currentDip) || 0;
      const previousDip = parseFloat(field === 'previousDip' ? value : updated[tankId].previousDip) || 0;
      updated[tankId].variance = currentDip - previousDip;
    }
    setTankDippings(updated);
  };

  const handleSaveAll = async () => {
    if (!appUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Validate pump readings
    for (const reading of Object.values(pumpReadings)) {
      const today = parseFloat(reading.todayReading);
      const yesterday = parseFloat(reading.yesterdayReading);
      if (isNaN(today) || today < 0) {
        Alert.alert('Error', `Enter a valid today reading for ${reading.pumpName}`);
        return;
      }
      if (isNaN(yesterday) || yesterday < 0) {
        Alert.alert('Error', `Enter a valid yesterday reading for ${reading.pumpName}`);
        return;
      }
      if (today < yesterday) {
        Alert.alert('Error', `Today's reading cannot be less than yesterday's for ${reading.pumpName}`);
        return;
      }
    }

    // Validate tank dippings
    for (const dip of Object.values(tankDippings)) {
      const current = parseFloat(dip.currentDip);
      const previous = parseFloat(dip.previousDip);
      const offload = parseFloat(dip.offload);
      if (isNaN(current) || current < 0) {
        Alert.alert('Error', `Enter a valid current dip for ${dip.tankName}`);
        return;
      }
      if (isNaN(previous) || previous < 0) {
        Alert.alert('Error', `Enter a valid previous dip for ${dip.tankName}`);
        return;
      }
      if (isNaN(offload) || offload < 0) {
        Alert.alert('Error', `Enter a valid offload amount for ${dip.tankName}`);
        return;
      }
    }

    // ENFORCE dip vs sales match for each fuel type
    const fuelTypes: PumpFuelType[] = ['PMS', 'AGO'];
    const mismatches: string[] = [];
    for (const fuelType of fuelTypes) {
      const result = validateDipVsSales(fuelType);
      if (!result.match && result.sales > 0) {
        mismatches.push(result.message);
      }
    }

    if (mismatches.length > 0) {
      Alert.alert(
        'Dip vs Sales Mismatch',
        'The tank dip readings do not match pump sales:\n\n' +
        mismatches.join('\n\n') +
        '\n\nEnsure: Previous Dip - Current Dip + Offload = Pump Sales',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setSaving(true);

      // Save pump readings
      const pumpReadingData = Object.values(pumpReadings).map(reading => ({
        pump_id: reading.pumpId,
        today_reading: parseFloat(reading.todayReading) || 0,
        yesterday_reading: parseFloat(reading.yesterdayReading) || 0,
        recorded_by: appUser.id,
      }));
      const pumpResult = await pumpReadingService.saveStationPumpReadings(pumpReadingData, readingDate);
      if (!pumpResult.success) {
        throw new Error(pumpResult.error || 'Failed to save pump readings');
      }

      // Save tank dippings
      if (Object.keys(tankDippings).length > 0) {
        const tankResult = await tankService.updateDippingReadings(
          Object.values(tankDippings).map(d => ({ tankId: d.tankId, dippingReading: parseFloat(d.currentDip) || 0 })),
          appUser.id,
          readingDate
        );
        if (!tankResult.success) {
          throw new Error(tankResult.error || 'Failed to save tank dippings');
        }
      }

      // Show validation summary
      const summary = fuelTypes.map(ft => validateDipVsSales(ft)).map(r => r.message).join('\n');
      Alert.alert('Success', 'All readings saved successfully!\n\n' + summary);
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPump = () => {
    if (!selectedStation) {
      Alert.alert('Error', 'Please select a station first');
      return;
    }
    (navigation as any).navigate('AddPumpScreen', { stationId: selectedStation.id });
  };

  const handleEditPump = (pump: Pump) => {
    (navigation as any).navigate('EditPumpScreen', { pump });
  };

  const handleDeletePump = async (pump: Pump) => {
    if (!appUser || appUser.role !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can delete pumps');
      return;
    }

    Alert.alert('Delete Pump', `Delete ${pump.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await pumpService.deletePump(pump.id);
            if (response.success) {
              setPumps(prev => prev.filter(p => p.id !== pump.id));
              Alert.alert('Success', 'Pump deleted');
            } else {
              Alert.alert('Error', response.error || 'Failed to delete pump');
            }
          } catch (error) {
            console.error('Error deleting pump:', error);
            Alert.alert('Error', 'Failed to delete pump');
          }
        },
      },
    ]);
  };

  const handleAddTank = () => {
    if (!selectedStation) {
      Alert.alert('Error', 'Please select a station first');
      return;
    }
    (navigation as any).navigate('AddTank', { stationId: selectedStation.id });
  };

  const handleEditTank = (tank: Tank) => {
    (navigation as any).navigate('EditTankScreen', { tank });
  };

  const handleDeleteTank = async (tank: Tank) => {
    if (!appUser || appUser.role !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can delete tanks');
      return;
    }

    Alert.alert('Delete Tank', `Delete ${tank.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await tankService.deleteTank(tank.id);
            if (response.success) {
              setTanks(prev => prev.filter(t => t.id !== tank.id));
              setTankDippings(prev => { const next = { ...prev }; delete next[tank.id]; return next; });
              Alert.alert('Success', 'Tank deleted');
            } else {
              Alert.alert('Error', response.error || 'Failed to delete tank');
            }
          } catch (error) {
            console.error('Error deleting tank:', error);
            Alert.alert('Error', 'Failed to delete tank');
          }
        },
      },
    ]);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  useEffect(() => {
    if (selectedStation) {
      loadData();
    }
  }, [selectedStation, loadData]);

  // ===== VALIDATION BANNER for each fuel type =====
  const ValidationBanner = ({ fuelType }: { fuelType: PumpFuelType }) => {
    if (tab !== 'tanks') return null;
    const result = validateDipVsSales(fuelType);
    const hasPumps = pumps.some(p => p.fuel_type === fuelType);
    if (!hasPumps && result.sales === 0) return null;

    return (
      <View style={[styles.validationBanner, {
        backgroundColor: result.match ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)',
        marginBottom: 12,
      }]}>
        <Ionicons name={result.match ? 'checkmark-circle' : 'warning'} size={18} color={result.match ? '#4CAF50' : '#F44336'} />
        <Text style={[styles.validationBannerText, { color: result.match ? '#4CAF50' : '#F44336' }]}>
          {result.message}
        </Text>
      </View>
    );
  };

  return (
    <LinearGradient colors={["#312C51", "#48426D"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isDrumStation ? 'Dip Reading (Drum Sales)' : 'Pump & Tank Management'}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Station Type Badge */}
          <View style={styles.stationTypeBadge}>
            <View style={[styles.badgeDot, { backgroundColor: isDrumStation ? '#FF9800' : '#4CAF50' }]} />
            <Text style={styles.stationTypeText}>
              {selectedStation?.name || 'Select Station'} — {isDrumStation ? 'Drum Sales (Dip Only)' : 'Pump System'}
            </Text>
          </View>

          {/* Station Selector */}
          <View style={styles.stationSelector}>
            <TouchableOpacity style={styles.stationButton} onPress={() => setShowStationPicker(true)}>
              <Text style={styles.stationButtonText}>{selectedStation ? selectedStation.name : "Select Station"}</Text>
              <Text style={styles.stationDateText}>Date: {readingDate}</Text>
              <Ionicons name="swap-vertical" size={20} color="#F0C38E" />
            </TouchableOpacity>
          </View>

          {/* Date */}
          <View style={styles.dateSelector}>
            <Text style={styles.dateLabel}>Date:</Text>
            <TouchableOpacity style={styles.dateInput} onPress={() => { const d = new Date(`${readingDate}T00:00:00`); setCalendarMonth(d.getMonth() + 1); setCalendarYear(d.getFullYear()); setShowCalendar(true); }}>
              <Text style={{ color: '#ffffff' }}>{readingDate}</Text>
              <Ionicons name="calendar" size={18} color="#F0C38E" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F0C38E" />
              <Text style={styles.loadingText}>Loading data...</Text>
            </View>
          ) : (
            <>
              {/* Tabs */}
              <View style={styles.tabsContainer}>
                <TouchableOpacity
                  style={[styles.tabButton, tab === "pumps" && styles.tabActive]}
                  onPress={() => setTab("pumps")}
                >
                  <Text style={[styles.tabText, tab === "pumps" && styles.tabTextActive]}>Pump Readings</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabButton, tab === "tanks" && styles.tabActive]}
                  onPress={() => setTab("tanks")}
                >
                  <Text style={[styles.tabText, tab === "tanks" && styles.tabTextActive]}>Tank Dipping</Text>
                </TouchableOpacity>
              </View>

              {/* Pumps Tab */}
              {tab === "pumps" && (
                <View>
                  <View style={styles.pumpsList}>
                    {pumps.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No pumps found for this station</Text>
                      </View>
                    ) : (
                      <>
                        {(['PMS', 'AGO'] as PumpFuelType[]).map(fuelType => {
                          const fuelPumps = pumps.filter(p => p.fuel_type === fuelType);
                          if (fuelPumps.length === 0) return null;

                          return (
                            <View key={fuelType} style={styles.fuelTypeSection}>
                              <View style={[styles.fuelTypeHeader, { backgroundColor: getFuelTypeColor(fuelType) + '33' }]}>
                                <Ionicons name="flame" size={18} color={getFuelTypeColor(fuelType)} />
                                <Text style={[styles.fuelTypeTitle, { color: getFuelTypeColor(fuelType) }]}>
                                  {fuelType === 'PMS' ? 'Premium Motor Spirit (PMS)' : 'Automotive Gas Oil (AGO)'}
                                </Text>
                              </View>
                              {fuelPumps.map(pump => {
                                const reading = pumpReadings[pump.id];
                                const todayVal = reading ? (parseFloat(reading.todayReading) || 0) : 0;
                                const yesterdayVal = reading ? (parseFloat(reading.yesterdayReading) || 0) : 0;
                                const dailySales = todayVal - yesterdayVal;

                                return (
                                  <View key={pump.id} style={styles.pumpCard}>
                                    <View style={styles.pumpInfo}>
                                      <Text style={styles.pumpName}>{pump.name}</Text>
                                      <Text style={[styles.fuelTypeBadge, { color: getFuelTypeColor(pump.fuel_type) }]}>
                                        {pump.fuel_type} · Pump #{pump.pump_number}
                                      </Text>
                                    </View>
                                  <View style={styles.pumpReadingsSection}>
                                    <View style={styles.readingRow}>
                                      <Text style={styles.readingLabel}>Yesterday (L):</Text>
                                      <TextInput
                                        style={styles.readingInput}
                                        value={reading?.yesterdayReading || '0'}
                                        onChangeText={(text) => handlePumpReadingChange(pump.id, 'yesterdayReading', text)}
                                        placeholder="0"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        keyboardType="numeric"
                                      />
                                    </View>
                                    <View style={styles.readingRow}>
                                      <Text style={styles.readingLabel}>Today (L):</Text>
                                      <TextInput
                                        style={styles.readingInput}
                                        value={reading?.todayReading || '0'}
                                        onChangeText={(text) => handlePumpReadingChange(pump.id, 'todayReading', text)}
                                        placeholder="0"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        keyboardType="numeric"
                                      />
                                    </View>
                                      <View style={[styles.readingRow, styles.salesRow]}>
                                        <Text style={styles.readingLabel}>Daily Sales:</Text>
                                        <Text style={[styles.readingValue, { color: dailySales >= 0 ? '#4CAF50' : '#F44336' }]}>
                                          {dailySales.toFixed(2)} Liters
                                        </Text>
                                      </View>
                                    </View>
                                    <View style={styles.pumpActions}>
                                      <TouchableOpacity onPress={() => handleEditPump(pump)}>
                                        <Ionicons name="pencil" size={20} color="#F0C38E" />
                                      </TouchableOpacity>
                                      <TouchableOpacity onPress={() => handleDeletePump(pump)}>
                                        <Ionicons name="trash" size={20} color="#F44336" />
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          );
                        })}
                      </>
                    )}
                  </View>

                  <View style={styles.addButtonContainer}>
                    <TouchableOpacity style={styles.addButton} onPress={handleAddPump}>
                      <Ionicons name="add" size={24} color="#ffffff" />
                      <Text style={styles.addButtonText}>Add New Pump</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.saveButtonContainer}>
                    <TouchableOpacity
                      style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                      onPress={handleSaveAll}
                      disabled={saving}
                    >
                      <Ionicons name="save" size={20} color="#ffffff" />
                      <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save All Readings"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Tanks Tab */}
              {tab === "tanks" && (
                <View>
                  <Text style={styles.tabInfoText}>
                    Enter the previous day's closing dip and today's current dip.
                    {'\n'}Consumption (Prev+Offload-Current) should equal pump sales.
                  </Text>

                  <View style={styles.tanksList}>
                    {tanks.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No tanks found for this station</Text>
                      </View>
                    ) : (
                      <>
                        {(['PMS', 'AGO'] as PumpFuelType[]).map(fuelType => {
                          const fuelTanks = tanks.filter(t => t.fuel_type === fuelType);
                          if (fuelTanks.length === 0) return null;

                          return (
                            <View key={fuelType} style={styles.fuelTypeSection}>
                              <View style={[styles.fuelTypeHeader, { backgroundColor: getFuelTypeColor(fuelType) + '33' }]}>
                                <Ionicons name="flame" size={18} color={getFuelTypeColor(fuelType)} />
                                <Text style={[styles.fuelTypeTitle, { color: getFuelTypeColor(fuelType) }]}>
                                  {fuelType === 'PMS' ? 'PMS Tanks' : 'AGO Tanks'}
                                </Text>
                              </View>

                              {/* Dip vs Sales Validation */}
                              <ValidationBanner fuelType={fuelType} />

                              {fuelTanks.map(tank => {
                                const dip = tankDippings[tank.id];
                                if (!dip) return null;
                                const consumption = (parseFloat(dip.previousDip) || 0) + (parseFloat(dip.offload) || 0) - (parseFloat(dip.currentDip) || 0);

                                return (
                                  <View key={tank.id} style={styles.tankCard}>
                                    <View style={styles.tankInfo}>
                                      <View style={styles.tankHeaderRow}>
                                        <Text style={styles.tankName}>{tank.name}</Text>
                                        <View style={styles.tankActions}>
                                          <TouchableOpacity onPress={() => handleEditTank(tank)}>
                                            <Ionicons name="pencil" size={18} color="#F0C38E" />
                                          </TouchableOpacity>
                                          <TouchableOpacity onPress={() => handleDeleteTank(tank)}>
                                            <Ionicons name="trash" size={18} color="#F44336" />
                                          </TouchableOpacity>
                                        </View>
                                      </View>
                                      <Text style={[styles.tankCapacity, { color: getFuelTypeColor(tank.fuel_type) }]}>
                                        Capacity: {tank.capacity.toLocaleString()} L | Pumps: {tank.pumps.length}
                                      </Text>
                                    </View>
                                    <View style={styles.pumpReadingsSection}>
                                      <View style={styles.readingRow}>
                                        <Text style={styles.readingLabel}>Previous Dip (L):</Text>
                                        <TextInput
                                          style={styles.readingInput}
                                          value={dip.previousDip}
                                          onChangeText={(text) => handleTankDippingChange(tank.id, 'previousDip', text)}
                                          placeholder="0"
                                          placeholderTextColor="rgba(255,255,255,0.3)"
                                          keyboardType="numeric"
                                        />
                                      </View>
                                      <View style={styles.readingRow}>
                                        <Text style={styles.readingLabel}>Current Dip (L):</Text>
                                        <TextInput
                                          style={styles.readingInput}
                                          value={dip.currentDip}
                                          onChangeText={(text) => handleTankDippingChange(tank.id, 'currentDip', text)}
                                          placeholder="0"
                                          placeholderTextColor="rgba(255,255,255,0.3)"
                                          keyboardType="numeric"
                                        />
                                      </View>
                                      <View style={styles.readingRow}>
                                        <Text style={styles.readingLabel}>Offload (L):</Text>
                                        <TextInput
                                          style={styles.readingInput}
                                          value={dip.offload}
                                          onChangeText={(text) => handleTankDippingChange(tank.id, 'offload', text)}
                                          placeholder="0"
                                          placeholderTextColor="rgba(255,255,255,0.3)"
                                          keyboardType="numeric"
                                        />
                                      </View>
                                      <View style={[styles.readingRow, styles.salesRow, {
                                        borderColor: consumption >= 0 ? 'rgba(76,175,80,0.5)' : 'rgba(244,67,54,0.5)',
                                        borderWidth: 1,
                                      }]}>
                                        <Text style={styles.readingLabel}>Consumption (Prev+Offload-Current):</Text>
                                        <Text style={[styles.readingValue, { color: consumption >= 0 ? '#4CAF50' : '#F44336' }]}>
                                          {consumption.toFixed(2)} L
                                        </Text>
                                      </View>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          );
                        })}
                      </>
                    )}
                  </View>

                  <View style={styles.addButtonContainer}>
                    <TouchableOpacity style={styles.addButton} onPress={handleAddTank}>
                      <Ionicons name="add" size={20} color="#ffffff" />
                      <Text style={styles.addButtonText}>Add New Tank</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.saveButtonContainer}>
                    <TouchableOpacity
                      style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                      onPress={handleSaveAll}
                      disabled={saving}
                    >
                      <Ionicons name="save" size={20} color="#ffffff" />
                      <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save All Readings"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Station Picker Modal */}
        <Modal
          visible={showStationPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowStationPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Station</Text>
              {stations.map((station) => (
                <TouchableOpacity
                  key={station.id}
                  style={[styles.modalOption, selectedStation?.id === station.id && styles.modalOptionSelected]}
                  onPress={() => { setSelectedStation(station); setShowStationPicker(false); }}
                >
                  <View style={styles.modalOptionRow}>
                    <Text style={[styles.modalOptionText, selectedStation?.id === station.id && styles.modalOptionTextSelected]}>
                      {station.name}
                    </Text>
                    <View style={[styles.badgeSmall, { backgroundColor: station.system_type === 'drum' ? '#FF9800' : '#4CAF50' }]}>
                      <Text style={styles.badgeSmallText}>{station.system_type === 'drum' ? 'DRUM' : 'PUMP'}</Text>
                    </View>
                  </View>
                  <Text style={styles.modalOptionSubtext}>{station.code} - {station.location}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowStationPicker(false)}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Calendar Modal */}
        {showCalendar && (
          <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
            <TouchableOpacity activeOpacity={1} onPress={() => setShowCalendar(false)}>
              <View style={styles.calendarOverlay}>
                <TouchableOpacity activeOpacity={1}>
                  <View style={styles.calendarCard}>
                    <View style={styles.calendarHeader}>
                      <TouchableOpacity onPress={() => setCalendarMonth(m => m === 1 ? 12 : m - 1)} style={styles.calendarNavBtn}>
                        <Ionicons name="chevron-back" size={24} color="#F0C38E" />
                      </TouchableOpacity>
                      <Text style={styles.calendarTitle}>{calendarMonth} / {calendarYear}</Text>
                      <TouchableOpacity onPress={() => setCalendarMonth(m => m === 12 ? 1 : m + 1)} style={styles.calendarNavBtn}>
                        <Ionicons name="chevron-forward" size={24} color="#F0C38E" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.calendarWeekRow}>
                      {['S','M','T','W','T','F','S'].map((d, i) => (
                        <Text key={i} style={styles.calendarWeekText}>{d}</Text>
                      ))}
                    </View>
                    <View style={styles.calendarGrid}>
                      {(() => {
                        const firstDay = new Date(calendarYear, calendarMonth - 1, 1).getDay();
                        const days = new Date(calendarYear, calendarMonth, 0).getDate();
                        const today = new Date();
                        const cells = [];
                        for (let i = 0; i < firstDay; i++) cells.push(<View key={'e' + i} style={styles.calendarCellEmpty} />);
                        for (let d = 1; d <= days; d++) {
                          const selected = new Date(`${readingDate}T00:00:00`).getFullYear() === calendarYear && new Date(`${readingDate}T00:00:00`).getMonth() + 1 === calendarMonth && new Date(`${readingDate}T00:00:00`).getDate() === d;
                          const isToday = today.getFullYear() === calendarYear && today.getMonth() + 1 === calendarMonth && today.getDate() === d;
                          cells.push(
                            <TouchableOpacity key={'d' + d} style={[styles.calendarCell, selected && styles.calendarCellSelected, isToday && styles.calendarCellToday]} onPress={() => { setReadingDate(`${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`); setShowCalendar(false); }}>
                              <Text style={[styles.calendarCellText, selected && styles.calendarCellTextSelected, isToday && styles.calendarCellTextToday]}>{d}</Text>
                            </TouchableOpacity>
                          );
                        }
                        return cells;
                      })()}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#ffffff", flex: 1, textAlign: "center" },
  headerSpacer: { width: 24 },
  stationTypeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8, gap: 6 },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  stationTypeText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' },
  stationSelector: { paddingHorizontal: 16, marginBottom: 8 },
  stationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  stationButtonText: { fontSize: 16, color: "#ffffff", fontWeight: "600", flex: 1 },
  stationDateText: { fontSize: 11, color: "#F0C38E", marginRight: 8 },
  dateSelector: { paddingHorizontal: 16, marginBottom: 12, flexDirection: "row", alignItems: "center" },
  dateLabel: { fontSize: 14, color: "#ffffff", marginRight: 12 },
  dateInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 10,
    color: "#ffffff",
    fontSize: 14,
  },
  loadingContainer: { padding: 24, alignItems: "center" },
  loadingText: { fontSize: 16, color: "rgba(255, 255, 255, 0.7)" },
  tabsContainer: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 12 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: "#F0C38E" },
  tabText: { fontSize: 14, color: "rgba(255, 255, 255, 0.7)" },
  tabTextActive: { color: "#F0C38E", fontWeight: "600" },
  tabInfoText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', paddingHorizontal: 16, marginBottom: 12, lineHeight: 18 },
  fuelTypeSection: { marginBottom: 16 },
  fuelTypeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginHorizontal: 16, marginBottom: 12 },
  fuelTypeTitle: { fontSize: 14, fontWeight: 'bold' },
  validationBanner: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginHorizontal: 16, gap: 8 },
  validationBannerText: { fontSize: 12, flex: 1, lineHeight: 16 },
  pumpsList: { paddingHorizontal: 16 },
  tanksList: { paddingHorizontal: 16 },
  pumpCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tankCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pumpInfo: { marginBottom: 12 },
  tankInfo: { marginBottom: 12 },
  tankHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pumpName: { fontSize: 16, fontWeight: "bold", color: "#ffffff" },
  tankName: { fontSize: 16, fontWeight: "bold", color: "#ffffff" },
  fuelTypeBadge: { fontSize: 12, marginTop: 2 },
  tankCapacity: { fontSize: 12, marginTop: 2 },
  pumpReadingsSection: { marginBottom: 12 },
  readingRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  readingLabel: { fontSize: 13, color: "rgba(255, 255, 255, 0.7)", flex: 1 },
  readingInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 8,
    color: "#ffffff",
    fontSize: 14,
    textAlign: "right",
  },
  readingValue: { fontSize: 14, fontWeight: "600", flex: 1, textAlign: "right" },
  salesRow: { backgroundColor: "rgba(255, 255, 255, 0.05)", padding: 8, borderRadius: 6 },
  pumpActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  tankActions: { flexDirection: "row", gap: 12 },
  addButtonContainer: { paddingHorizontal: 16, marginBottom: 12 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0C38E",
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  addButtonText: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
  saveButtonContainer: { paddingHorizontal: 16, marginBottom: 24 },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
  emptyState: { padding: 24, alignItems: "center" },
  emptyText: { fontSize: 14, color: "rgba(255, 255, 255, 0.7)" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#48426D", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#ffffff", marginBottom: 16, textAlign: "center" },
  modalOption: { padding: 16, borderRadius: 12, marginBottom: 8, backgroundColor: "rgba(255, 255, 255, 0.1)" },
  modalOptionSelected: { backgroundColor: "rgba(240, 195, 142, 0.2)", borderWidth: 1, borderColor: "#F0C38E" },
  modalOptionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalOptionText: { fontSize: 16, color: "#ffffff", fontWeight: "600" },
  modalOptionTextSelected: { color: "#F0C38E" },
  modalOptionSubtext: { fontSize: 14, color: "rgba(255, 255, 255, 0.7)", marginTop: 4 },
  badgeSmall: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeSmallText: { fontSize: 10, color: "#ffffff", fontWeight: 'bold' },
  modalCancelButton: { padding: 16, alignItems: "center", marginTop: 8 },
  modalCancelButtonText: { fontSize: 16, color: "#F0C38E", fontWeight: "600" },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarCard: {
    backgroundColor: '#48426D',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 340,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarNavBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F0C38E',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarWeekText: {
    width: 32,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCellEmpty: {
    width: 32,
    height: 32,
  },
  calendarCell: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  calendarCellSelected: {
    backgroundColor: '#F0C38E',
  },
  calendarCellToday: {
    borderWidth: 1,
    borderColor: '#F0C38E',
  },
  calendarCellText: {
    fontSize: 13,
    color: '#ffffff',
  },
  calendarCellTextSelected: {
    color: '#312C51',
    fontWeight: '700',
  },
  calendarCellTextToday: {
    color: '#ffffff',
  },
});