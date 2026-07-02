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
import { useNavigation, useRoute } from '@react-navigation/native';
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

interface FuelTypeValidation {
  fuelType: PumpFuelType;
  totalSales: number;
  totalConsumption: number;
  discrepancy: number;
  hasError: boolean;
}

export default function PumpAndDippingManagementScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = route.params as { stationId?: string };

  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [pumpReadings, setPumpReadings] = useState<{ [pumpId: string]: PumpReadingInput }>({});
  const [tankDippings, setTankDippings] = useState<{ [tankId: string]: TankDippingInput }>({});
  const [fuelValidations, setFuelValidations] = useState<FuelTypeValidation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showStationPicker, setShowStationPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'readings' | 'dipping' | 'validation'>('readings');
  const [readingDate, setReadingDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());

  // Derived: is this a drum station? (DEPOT ISSIRO)
  const isDrumStation = selectedStation?.system_type === 'drum' || selectedStation?.name?.toLowerCase().includes('issiro');

  // Get fuel type color
  const getFuelTypeColor = (fuelType: string) => {
    switch (fuelType) {
      case 'PMS':
        return '#FF6B35';
      case 'AGO':
        return '#4CAF50';
      default:
        return '#F0C38E';
    }
  };

  // Get variance display color
  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) < 0.5) return '#4CAF50';
    if (variance > 0) return '#4CAF50';
    if (variance < 0) return '#F44336';
    return '#F0C38E';
  };

  // Format number display
  const formatNumber = (num: number): string => {
    return num.toFixed(2);
  };

  // Calculate daily sales for a pump reading
  const calculateDailySales = (today: number, yesterday: number): number => {
    return today - yesterday;
  };

  // Run validation across all fuel types
  const runValidation = useCallback((
    pumpsList: Pump[],
    tanksList: Tank[],
    readingsMap: { [pumpId: string]: PumpReadingInput },
    dippingsMap: { [tankId: string]: TankDippingInput }
  ): FuelTypeValidation[] => {
    const fuelTypes: PumpFuelType[] = ['PMS', 'AGO'];
    const validations: FuelTypeValidation[] = [];

    for (const fuelType of fuelTypes) {
      // Total pump sales for this fuel type
      const fuelPumps = pumpsList.filter(p => p.fuel_type === fuelType);
      const totalSales = fuelPumps.reduce((sum, pump) => {
        const reading = readingsMap[pump.id];
        if (reading) {
          const today = parseFloat(reading.todayReading) || 0;
          const yesterday = parseFloat(reading.yesterdayReading) || 0;
          return sum + (today - yesterday);
        }
        return sum;
      }, 0);

      // Total tank consumption = previous dip + offload - current dip
      const fuelTanks = tanksList.filter(t => t.fuel_type === fuelType);
      let totalConsumption = 0;
      for (const tank of fuelTanks) {
        const dip = dippingsMap[tank.id];
        if (dip) {
          const prev = parseFloat(dip.previousDip) || 0;
          const curr = parseFloat(dip.currentDip) || 0;
          const offload = parseFloat(dip.offload) || 0;
          totalConsumption += prev + offload - curr;
        }
      }

      const discrepancy = Math.round((totalSales - totalConsumption) * 100) / 100;
      const hasError = Math.abs(discrepancy) > 0.5;

      validations.push({
        fuelType,
        totalSales,
        totalConsumption,
        discrepancy,
        hasError,
      });
    }

    return validations;
  }, []);

  // BATCHED state update: collects all data then sets state once
  const applyStationData = useCallback((
    newPumps: Pump[],
    newTanks: Tank[],
    newPumpReadings: { [pumpId: string]: PumpReadingInput },
    newTankDippings: { [tankId: string]: TankDippingInput }
  ) => {
    const validations = runValidation(newPumps, newTanks, newPumpReadings, newTankDippings);
    
    // Batch all state updates into a single tick
    setPumps(newPumps);
    setTanks(newTanks);
    setPumpReadings(newPumpReadings);
    setTankDippings(newTankDippings);
    setFuelValidations(validations);
    setLoading(false);
    setRefreshing(false);
  }, [runValidation]);

  // Load stations
  const loadStations = useCallback(async () => {
    try {
      const response = await stationService.getStations();
      if (response.success && response.data && response.data.length > 0) {
        setStations(response.data);
        if (response.data.length > 0) {
          const targetStation = routeParams?.stationId 
            ? response.data.find(s => s.id === routeParams.stationId) 
            : response.data[0];
          if (targetStation) {
            setSelectedStation(targetStation);
          } else {
            setSelectedStation(response.data[0]);
          }
        }
      } else {
        setStations(SAMPLE_STATIONS);
        if (SAMPLE_STATIONS.length > 0) {
          const targetStation = routeParams?.stationId 
            ? SAMPLE_STATIONS.find(s => s.id === routeParams.stationId) 
            : SAMPLE_STATIONS[0];
          if (targetStation) {
            setSelectedStation(targetStation);
          } else {
            setSelectedStation(SAMPLE_STATIONS[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading stations:', error);
      setStations(SAMPLE_STATIONS);
      if (SAMPLE_STATIONS.length > 0) {
        setSelectedStation(SAMPLE_STATIONS[0]);
      }
    }
  }, [routeParams?.stationId]);

  // Load data for selected station - BATCHED to prevent flickering
  const loadStationData = useCallback(async () => {
    if (!selectedStation) return;

    setLoading(true);
    
    try {
      const stationId = selectedStation.id;
      const isDrum = selectedStation.system_type === 'drum' || selectedStation.name?.toLowerCase().includes('issiro');

      if (isDrum) {
        // DRUM STATION (DEPOT ISSIRO): Only load tanks for dip readings
        const tanksResponse = await tankService.getTanksByStation(stationId);
        const loadedTanks: Tank[] = (tanksResponse.success && tanksResponse.data) 
          ? tanksResponse.data 
          : [];

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

        applyStationData([], loadedTanks, {}, tankDippingMap);
      } else {
        // PUMP STATION: Load both pumps and tanks
        const [pumpsResponse, tanksResponse] = await Promise.all([
          pumpService.getPumpsByStation(stationId),
          tankService.getTanksByStation(stationId),
        ]);

        const loadedPumps: Pump[] = (pumpsResponse.success && pumpsResponse.data) 
          ? pumpsResponse.data 
          : [];
        const loadedTanks: Tank[] = (tanksResponse.success && tanksResponse.data) 
          ? tanksResponse.data 
          : [];

        // Fetch pump readings in parallel
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

        // Initialize tank dipping inputs
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
      }
    } catch (error) {
      console.error('Error loading station data:', error);
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStation, readingDate, applyStationData]);

  // Handle pump reading change
  const handlePumpReadingChange = (pumpId: string, field: 'todayReading' | 'yesterdayReading', value: string) => {
    const updated = { ...pumpReadings };
    if (updated[pumpId]) {
      updated[pumpId] = { ...updated[pumpId], [field]: value };
      const today = parseFloat(field === 'todayReading' ? value : updated[pumpId].todayReading) || 0;
      const yesterday = parseFloat(field === 'yesterdayReading' ? value : updated[pumpId].yesterdayReading) || 0;
      updated[pumpId].dailySales = calculateDailySales(today, yesterday);
    }
    setPumpReadings(updated);
    setFuelValidations(runValidation(pumps, tanks, updated, tankDippings));
  };

  // Handle tank dipping change
  const handleTankDippingChange = (tankId: string, field: keyof TankDippingInput, value: string) => {
    const updated = { ...tankDippings };
    if (updated[tankId]) {
      updated[tankId] = { ...updated[tankId], [field]: value };
      const currentDip = parseFloat(field === 'currentDip' ? value : updated[tankId].currentDip) || 0;
      const previousDip = parseFloat(field === 'previousDip' ? value : updated[tankId].previousDip) || 0;
      updated[tankId].variance = currentDip - previousDip;
    }
    setTankDippings(updated);
    setFuelValidations(runValidation(pumps, tanks, pumpReadings, updated));
  };

  // Validate that dip difference matches sales for a given fuel type
  const validateDipVsSales = (fuelType: PumpFuelType): { match: boolean; diff: number; sales: number; message: string } => {
    const fuelTanks = tanks.filter(t => t.fuel_type === fuelType);
    const fuelPumps = pumps.filter(p => p.fuel_type === fuelType);

    // Total dip consumption: sum of (previousDip - currentDip + offload) for all tanks of this fuel type
    let totalDipConsumption = 0;
    for (const tank of fuelTanks) {
      const dip = tankDippings[tank.id];
      if (dip) {
        const prev = parseFloat(dip.previousDip) || 0;
        const curr = parseFloat(dip.currentDip) || 0;
        const offload = parseFloat(dip.offload) || 0;
        totalDipConsumption += prev + offload - curr;
      }
    }

    // Total pump sales for this fuel type
    let totalSales = 0;
    for (const pump of fuelPumps) {
      const reading = pumpReadings[pump.id];
      if (reading) {
        const today = parseFloat(reading.todayReading) || 0;
        const yesterday = parseFloat(reading.yesterdayReading) || 0;
        totalSales += today - yesterday;
      }
    }

    const diff = Math.round((totalDipConsumption - totalSales) * 100) / 100;
    const match = Math.abs(diff) <= 0.5;

    return {
      match,
      diff,
      sales: totalSales,
      message: match 
        ? `✓ ${fuelType}: Dip difference (${totalDipConsumption.toFixed(2)}L) matches sales (${totalSales.toFixed(2)}L)`
        : `✗ ${fuelType} MISMATCH: Dip difference (${totalDipConsumption.toFixed(2)}L) does NOT equal sales (${totalSales.toFixed(2)}L). Difference: ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}L. Please correct the readings.`,
    };
  };

  // Save all readings
  const handleSaveAll = async () => {
    if (!appUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (isDrumStation) {
      // DRUM STATION validation: dip readings only
      for (const dip of Object.values(tankDippings)) {
        const current = parseFloat(dip.currentDip);
        const previous = parseFloat(dip.previousDip);
        const offload = parseFloat(dip.offload);
        if (isNaN(current) || current < 0) {
          Alert.alert('Input Error', `Please enter a valid current dip for ${dip.tankName}`);
          return;
        }
        if (isNaN(previous) || previous < 0) {
          Alert.alert('Input Error', `Please enter a valid previous dip for ${dip.tankName}`);
          return;
        }
        if (isNaN(offload) || offload < 0) {
          Alert.alert('Input Error', `Please enter a valid offload amount for ${dip.tankName}`);
          return;
        }
      }

      // For drum stations, validate that dip difference makes sense (no pump references)
      saveReadings();
      return;
    }

    // PUMP STATION validation
    for (const reading of Object.values(pumpReadings)) {
      const today = parseFloat(reading.todayReading);
      const yesterday = parseFloat(reading.yesterdayReading);
      if (isNaN(today) || today < 0) {
        Alert.alert('Input Error', `Please enter a valid today reading for ${reading.pumpName}`);
        return;
      }
      if (isNaN(yesterday) || yesterday < 0) {
        Alert.alert('Input Error', `Please enter a valid yesterday reading for ${reading.pumpName}`);
        return;
      }
      if (today < yesterday) {
        Alert.alert(
          'Input Error',
          `Today's reading (${today}) cannot be less than yesterday's reading (${yesterday}) for ${reading.pumpName}. The pump cannot dispense negative fuel.`
        );
        return;
      }
    }

    // Validate tank dippings
    for (const dip of Object.values(tankDippings)) {
      const current = parseFloat(dip.currentDip);
      const previous = parseFloat(dip.previousDip);
      const offload = parseFloat(dip.offload);
      if (isNaN(current) || current < 0) {
        Alert.alert('Input Error', `Please enter a valid current dip for ${dip.tankName}`);
        return;
      }
      if (isNaN(previous) || previous < 0) {
        Alert.alert('Input Error', `Please enter a valid previous dip for ${dip.tankName}`);
        return;
      }
      if (isNaN(offload) || offload < 0) {
        Alert.alert('Input Error', `Please enter a valid offload amount for ${dip.tankName}`);
        return;
      }
    }

    // ENFORCE: Check each fuel type's dip consumption vs sales
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
        'The tank dip readings do not match the pump sales. Please correct:\n\n' +
        mismatches.join('\n\n') +
        '\n\nEnsure: Previous Dip - Current Dip + Offload = Pump Sales',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check for validation errors from runValidation
    const hasErrors = fuelValidations.some(v => v.hasError);
    if (hasErrors) {
      Alert.alert(
        'Validation Warning',
        'The following discrepancies were detected:\n\n' +
        fuelValidations
          .filter(v => v.hasError)
          .map(v => 
            `${v.fuelType}: Sales (${v.totalSales.toFixed(2)}L) vs Tank Consumption (${v.totalConsumption.toFixed(2)}L)\n` +
            `Discrepancy: ${v.discrepancy.toFixed(2)}L`
          )
          .join('\n\n') +
        '\n\nDo you still want to save the readings?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save Anyway', onPress: () => saveReadings() },
        ]
      );
    } else {
      saveReadings();
    }
  };

  // Save all readings to database
  const saveReadings = async () => {
    if (!appUser) return;
    
    try {
      setSaving(true);

      if (!isDrumStation && Object.keys(pumpReadings).length > 0) {
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
      }

      // Save tank dippings (for both drum and pump stations)
      if (Object.keys(tankDippings).length > 0) {
        const tankResult = await tankService.updateDippingReadings(
          Object.values(tankDippings).map(d => ({ 
            tankId: d.tankId, 
            dippingReading: parseFloat(d.currentDip) || 0 
          })),
          appUser.id,
          readingDate
        );

        if (!tankResult.success) {
          throw new Error(tankResult.error || 'Failed to save tank dippings');
        }
      }

      // Show dip vs sales validation summary
      const fuelTypes: PumpFuelType[] = ['PMS', 'AGO'];
      const dipValidationSummary = fuelTypes
        .map(ft => validateDipVsSales(ft))
        .map(r => r.message)
        .join('\n');

      Alert.alert(
        'Success',
        'All readings saved successfully!\n\n' + dipValidationSummary
      );

    } catch (error) {
      console.error('Error saving readings:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save readings');
    } finally {
      setSaving(false);
    }
  };

  // Get pump readings by fuel type for display
  const getPumpsByFuelType = (fuelType: PumpFuelType) => {
    return pumps.filter(p => p.fuel_type === fuelType);
  };

  // Get tanks by fuel type for display
  const getTanksByFuelType = (fuelType: PumpFuelType) => {
    return tanks.filter(t => t.fuel_type === fuelType);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStationData();
  }, [loadStationData]);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  useEffect(() => {
    if (selectedStation) {
      loadStationData();
    }
  }, [selectedStation, loadStationData]);

  // Date field
  const DateSelector = () => (
    <View style={styles.dateRow}>
      <View style={styles.dateField}>
        <Text style={styles.fieldLabel}>Reading Date</Text>
        <TouchableOpacity style={styles.readingInput} onPress={() => { const d = new Date(`${readingDate}T00:00:00`); setCalendarMonth(d.getMonth() + 1); setCalendarYear(d.getFullYear()); setShowCalendar(true); }}>
          <Text style={{ color: '#fff' }}>{readingDate}</Text>
          <Ionicons name="calendar" size={18} color="#F0C38E" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ===== RENDER: Calendar Modal =====
  const renderCalendarModal = () => (
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
  );

  // ===== RENDER: Drum Station Dip Reading (DEPOT ISSIRO) =====
  const renderDrumStationView = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Ionicons name="water" size={20} color="#F0C38E" />
        <Text style={styles.sectionTitle}>Tank Dip Readings — Drum Sales</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        DEPOT ISSIRO uses drum sales. Enter the previous day's dip reading and today's dip reading.
        The difference (Previous Dip - Current Dip + Offload) will be validated against fuel sold today.
      </Text>

      <DateSelector />

      {(['PMS', 'AGO'] as PumpFuelType[]).map(fuelType => {
        const fuelTanks = getTanksByFuelType(fuelType);
        if (fuelTanks.length === 0) return null;

        return (
          <View key={fuelType} style={styles.fuelTypeSection}>
            <View style={[styles.fuelTypeHeader, { backgroundColor: getFuelTypeColor(fuelType) + '33' }]}>
              <Ionicons name="flame" size={18} color={getFuelTypeColor(fuelType)} />
              <Text style={[styles.fuelTypeTitle, { color: getFuelTypeColor(fuelType) }]}>
                {fuelType === 'PMS' ? 'PMS Tanks' : 'AGO Tanks'}
              </Text>
            </View>

            {fuelTanks.map(tank => {
              const dip = tankDippings[tank.id];
              if (!dip) return null;

              const prev = parseFloat(dip.previousDip) || 0;
              const curr = parseFloat(dip.currentDip) || 0;
              const offload = parseFloat(dip.offload) || 0;
              const dipDifference = prev + offload - curr;

              return (
                <View key={tank.id} style={styles.tankCard}>
                  <View style={styles.tankCardHeader}>
                    <Text style={styles.tankName}>{tank.name}</Text>
                    <Text style={[styles.tankCapacity, { color: getFuelTypeColor(tank.fuel_type) }]}>
                      Capacity: {tank.capacity.toLocaleString()} L
                    </Text>
                  </View>

                  <View style={styles.dippingRow}>
                    <View style={styles.dippingField}>
                      <Text style={styles.fieldLabel}>Previous Day Dip (L)</Text>
                      <TextInput
                        style={styles.readingInput}
                        value={dip.previousDip}
                        onChangeText={(val) => handleTankDippingChange(tank.id, 'previousDip', val)}
                        keyboardType="numeric"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.dippingField}>
                      <Text style={styles.fieldLabel}>Current Day Dip (L)</Text>
                      <TextInput
                        style={styles.readingInput}
                        value={dip.currentDip}
                        onChangeText={(val) => handleTankDippingChange(tank.id, 'currentDip', val)}
                        keyboardType="numeric"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        placeholder="0"
                      />
                    </View>
                  </View>

                  <View style={styles.offloadRow}>
                    <Text style={styles.fieldLabel}>Fuel Offloaded Today (Liters)</Text>
                    <TextInput
                      style={[styles.readingInput, styles.offloadInput]}
                      value={dip.offload}
                      onChangeText={(val) => handleTankDippingChange(tank.id, 'offload', val)}
                      keyboardType="numeric"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      placeholder="0"
                    />
                  </View>

                  {/* REAL-TIME VALIDATION: Dip Difference vs Sales */}
                  <View style={[styles.dippingResult, {
                    borderColor: dipDifference >= 0 ? 'rgba(76,175,80,0.5)' : 'rgba(244,67,54,0.5)',
                    borderWidth: 1,
                  }]}>
                    <View style={styles.resultRow}>
                      <Text style={styles.fieldLabel}>Dip Difference (Prev+Offload-Current):</Text>
                      <Text style={[styles.resultValue, { 
                        color: dipDifference >= 0 ? '#4CAF50' : '#F44336',
                        fontWeight: 'bold',
                      }]}>
                        {dipDifference.toFixed(2)} L
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.fieldLabel}>Dip Variance:</Text>
                      <Text style={[styles.resultValue, { 
                        color: getVarianceColor(dip.variance),
                      }]}>
                        {dip.variance >= 0 ? '+' : ''}{dip.variance.toFixed(2)} L
                      </Text>
                    </View>
                    <View style={[styles.validationBanner, {
                      backgroundColor: dipDifference >= 0 ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)',
                    }]}>
                      <Ionicons 
                        name={dipDifference >= 0 ? 'checkmark-circle' : 'warning'} 
                        size={18} 
                        color={dipDifference >= 0 ? '#4CAF50' : '#F44336'} 
                      />
                      <Text style={[styles.validationBannerText, {
                        color: dipDifference >= 0 ? '#4CAF50' : '#F44336',
                      }]}>
                        {dipDifference >= 0 
                          ? `Dip difference: ${dipDifference.toFixed(2)}L consumed from tank`
                          : `ERROR: Dip shows negative consumption (${dipDifference.toFixed(2)}L). Current dip cannot be higher than previous dip + offload.`
                        }
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}

      {tanks.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle" size={40} color="#F0C38E" />
          <Text style={styles.emptyText}>No tanks found for this station</Text>
        </View>
      )}
    </View>
  );

  // ===== RENDER: Pump Station Pump Readings Tab =====
  const renderPumpReadingsTab = () => (
    <View style={styles.tabContent}>
      <DateSelector />

      <View style={styles.sectionHeader}>
        <Ionicons name="speedometer" size={20} color="#F0C38E" />
        <Text style={styles.sectionTitle}>Pump Meter Readings</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Enter today's pump meter reading. Litres sold = Today - Yesterday.
        The tank dip difference must match the total litres sold per fuel type.
      </Text>

      {(['PMS', 'AGO'] as PumpFuelType[]).map(fuelType => {
        const fuelPumps = getPumpsByFuelType(fuelType);
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
              if (!reading) return null;
              
              return (
                <View key={pump.id} style={styles.pumpCard}>
                  <View style={styles.pumpCardHeader}>
                    <View>
                      <Text style={styles.pumpName}>{pump.name}</Text>
                      <Text style={[styles.pumpFuelType, { color: getFuelTypeColor(pump.fuel_type) }]}>
                        Pump #{pump.pump_number} - {pump.fuel_type}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.readingRow}>
                    <View style={styles.readingField}>
                      <Text style={styles.fieldLabel}>Yesterday's Reading (L)</Text>
                      <TextInput
                        style={styles.readingInput}
                        value={reading.yesterdayReading}
                        onChangeText={(val) => handlePumpReadingChange(pump.id, 'yesterdayReading', val)}
                        keyboardType="numeric"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.readingField}>
                      <Text style={styles.fieldLabel}>Today's Reading (L)</Text>
                      <TextInput
                        style={styles.readingInput}
                        value={reading.todayReading}
                        onChangeText={(val) => handlePumpReadingChange(pump.id, 'todayReading', val)}
                        keyboardType="numeric"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        placeholder="0"
                      />
                    </View>
                  </View>

                  <View style={[styles.salesResult, { 
                    backgroundColor: reading.dailySales >= 0 ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)' 
                  }]}>
                    <Text style={styles.salesLabel}>Litres Sold Today:</Text>
                    <Text style={[styles.salesValue, { 
                      color: reading.dailySales >= 0 ? '#4CAF50' : '#F44336' 
                    }]}>
                      {reading.dailySales.toFixed(2)} L
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}

      {pumps.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle" size={40} color="#F0C38E" />
          <Text style={styles.emptyText}>No pumps found for this station</Text>
        </View>
      )}
    </View>
  );

  // ===== RENDER: Tank Dipping Tab =====
  const renderTankDippingTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Ionicons name="water" size={20} color="#F0C38E" />
        <Text style={styles.sectionTitle}>Tank Dip Readings</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Enter the previous day's closing dip and today's current dip.
        The difference (Previous - Current + Offload) MUST equal the total pump sales for that fuel type.
        If they don't match, you will be prompted to correct the entries.
      </Text>

      {(['PMS', 'AGO'] as PumpFuelType[]).map(fuelType => {
        const fuelTanks = getTanksByFuelType(fuelType);
        if (fuelTanks.length === 0) return null;

        // Calculate totals for this fuel type
        const totalPumpSales = Object.values(pumpReadings)
          .filter(r => r.fuelType === fuelType)
          .reduce((sum, r) => sum + r.dailySales, 0);

        let totalDipConsumption = 0;
        for (const tank of fuelTanks) {
          const dip = tankDippings[tank.id];
          if (dip) {
            totalDipConsumption += (parseFloat(dip.previousDip) || 0) + (parseFloat(dip.offload) || 0) - (parseFloat(dip.currentDip) || 0);
          }
        }
        const dipVsSalesValid = Math.abs(totalDipConsumption - totalPumpSales) <= 0.5;

        return (
          <View key={fuelType} style={styles.fuelTypeSection}>
            <View style={[styles.fuelTypeHeader, { backgroundColor: getFuelTypeColor(fuelType) + '33' }]}>
              <Ionicons name="flame" size={18} color={getFuelTypeColor(fuelType)} />
              <Text style={[styles.fuelTypeTitle, { color: getFuelTypeColor(fuelType) }]}>
                {fuelType === 'PMS' ? 'PMS Tanks' : 'AGO Tanks'}
              </Text>
            </View>

            {/* DIP vs SALES validation banner for this fuel type */}
            <View style={[styles.validationBanner, {
              backgroundColor: dipVsSalesValid ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)',
              marginBottom: 12,
            }]}>
              <Ionicons 
                name={dipVsSalesValid ? 'checkmark-circle' : 'warning'} 
                size={20} 
                color={dipVsSalesValid ? '#4CAF50' : '#F44336'} 
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.validationBannerTitle, {
                  color: dipVsSalesValid ? '#4CAF50' : '#F44336',
                }]}>
                  {dipVsSalesValid ? '✓ Matched' : '✗ MISMATCH'}
                </Text>
                <Text style={[styles.validationBannerText, {
                  color: dipVsSalesValid ? '#4CAF50' : '#F44336',
                }]}>
                  Dip Consumption: {totalDipConsumption.toFixed(2)}L | Pump Sales: {totalPumpSales.toFixed(2)}L
                  {!dipVsSalesValid && '\nDifference: ' + (totalDipConsumption - totalPumpSales >= 0 ? '+' : '') + (totalDipConsumption - totalPumpSales).toFixed(2) + 'L'}
                </Text>
              </View>
            </View>

            {fuelTanks.map(tank => {
              const dip = tankDippings[tank.id];
              if (!dip) return null;

              return (
                <View key={tank.id} style={styles.tankCard}>
                  <View style={styles.tankCardHeader}>
                    <View>
                      <Text style={styles.tankName}>{tank.name}</Text>
                      <Text style={[styles.tankCapacity, { color: getFuelTypeColor(tank.fuel_type) }]}>
                        Capacity: {tank.capacity.toLocaleString()} L | Pumps: {tank.pumps.length}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dippingRow}>
                    <View style={styles.dippingField}>
                      <Text style={styles.fieldLabel}>Previous Dip (Closing) (L)</Text>
                      <TextInput
                        style={styles.readingInput}
                        value={dip.previousDip}
                        onChangeText={(val) => handleTankDippingChange(tank.id, 'previousDip', val)}
                        keyboardType="numeric"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.dippingField}>
                      <Text style={styles.fieldLabel}>Current Dip (Opening) (L)</Text>
                      <TextInput
                        style={styles.readingInput}
                        value={dip.currentDip}
                        onChangeText={(val) => handleTankDippingChange(tank.id, 'currentDip', val)}
                        keyboardType="numeric"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        placeholder="0"
                      />
                    </View>
                  </View>

                  <View style={styles.offloadRow}>
                    <Text style={styles.fieldLabel}>Fuel Offloaded Today (Liters)</Text>
                    <TextInput
                      style={[styles.readingInput, styles.offloadInput]}
                      value={dip.offload}
                      onChangeText={(val) => handleTankDippingChange(tank.id, 'offload', val)}
                      keyboardType="numeric"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      placeholder="0"
                    />
                  </View>

                  <View style={styles.dippingResult}>
                    <View style={styles.resultRow}>
                      <Text style={styles.fieldLabel}>Consumption (Prev+Offload-Current):</Text>
                      <Text style={styles.resultValue}>
                        {(() => {
                          const prev = parseFloat(dip.previousDip) || 0;
                          const offload = parseFloat(dip.offload) || 0;
                          const curr = parseFloat(dip.currentDip) || 0;
                          return (prev + offload - curr).toFixed(2);
                        })()} L
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.fieldLabel}>Dip Variance:</Text>
                      <Text style={[styles.resultValue, { 
                        color: getVarianceColor(dip.variance) 
                      }]}>
                        {dip.variance >= 0 ? '+' : ''}{dip.variance.toFixed(2)} L
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}

      {tanks.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle" size={40} color="#F0C38E" />
          <Text style={styles.emptyText}>No tanks found for this station</Text>
        </View>
      )}
    </View>
  );

  // ===== RENDER: Validation Tab =====
  const renderValidationTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Ionicons name="checkmark-circle" size={20} color="#F0C38E" />
        <Text style={styles.sectionTitle}>Validation Summary</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Cross-checking pump sales vs tank dip consumption per fuel type.
        Previous Dip - Current Dip + Offload MUST equal Total Pump Sales.
      </Text>

      {/* Dip vs Sales Real-Time Validation Cards */}
      {(['PMS', 'AGO'] as PumpFuelType[]).map(fuelType => {
        const result = validateDipVsSales(fuelType);
        
        return (
          <View key={fuelType} style={[
            styles.validationCard,
            !result.match && styles.validationCardError
          ]}>
            <View style={styles.validationHeader}>
              <Ionicons 
                name={result.match ? 'checkmark-circle' : 'warning'} 
                size={24} 
                color={result.match ? '#4CAF50' : '#F44336'} 
              />
              <Text style={[styles.validationTitle, { 
                color: getFuelTypeColor(fuelType) 
              }]}>
                {fuelType}
              </Text>
              <View style={[
                styles.validationBadge,
                { backgroundColor: result.match ? '#4CAF50' : '#F44336' }
              ]}>
                <Text style={styles.validationBadgeText}>
                  {result.match ? 'MATCHED' : 'MISMATCH'}
                </Text>
              </View>
            </View>

            <View style={styles.validationDetails}>
              <View style={styles.validationRow}>
                <Text style={styles.validationLabel}>Total Pump Sales:</Text>
                <Text style={styles.validationValue}>
                  {formatNumber(result.sales)} Liters
                </Text>
              </View>
              <View style={styles.validationRow}>
                <Text style={styles.validationLabel}>Tank Dip Consumption (Prev+Offload-Current):</Text>
                <Text style={styles.validationValue}>
                  {formatNumber(result.sales + result.diff)} Liters
                </Text>
              </View>
              <View style={[styles.validationRow, styles.discrepancyRow]}>
                <Text style={styles.validationLabel}>Difference (Dip - Sales):</Text>
                <Text style={[styles.validationValue, { 
                  color: getVarianceColor(result.diff),
                  fontWeight: 'bold',
                }]}>
                  {result.diff >= 0 ? '+' : ''}{formatNumber(result.diff)} Liters
                </Text>
              </View>

              {!result.match && result.sales > 0 && (
                <View style={styles.errorMessageBox}>
                  <Ionicons name="close-circle" size={18} color="#F44336" />
                  <Text style={styles.errorMessageText}>
                    {/* Show specific guidance on how to fix */}
                    The dip consumption does not match pump sales.
                    {'\n\n'}To fix, ensure:
                    {'\n'}• Previous Day Dip - Current Day Dip + Offload
                    {'\n'}• = Total Pump Sales for {fuelType}
                    {'\n\n'}Current values:
                    {'\n'}• Dip Consumption: {(result.sales + result.diff).toFixed(2)}L
                    {'\n'}• Pump Sales: {result.sales.toFixed(2)}L
                    {'\n'}• Difference: {result.diff >= 0 ? '+' : ''}{result.diff.toFixed(2)}L
                  </Text>
                </View>
              )}

              {!result.match && result.sales === 0 && (
                <View style={styles.warningMessageBox}>
                  <Ionicons name="information-circle" size={18} color="#F0C38E" />
                  <Text style={styles.warningMessageText}>
                    No pump sales recorded for {fuelType}. Enter pump readings in the Pump Readings tab first, 
                    or verify that the dip readings are correct.
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}

      {/* Summary Section */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Daily Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Litres Sold (All Pumps):</Text>
          <Text style={styles.summaryValue}>
            {formatNumber(fuelValidations.reduce((sum, v) => sum + v.totalSales, 0))} L
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Status:</Text>
          <Text style={[styles.summaryStatus, {
            color: fuelValidations.some(v => v.hasError) ? '#F44336' : '#4CAF50'
          }]}>
            {fuelValidations.some(v => v.hasError) 
              ? '⚠️ Validation Errors - Manager Review Required' 
              : '✓ All Readings Balanced'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isDrumStation ? 'Dip Reading (Drum Sales)' : 'Pump & Dipping'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Station Type Badge */}
        <View style={styles.stationTypeBadge}>
          <View style={[styles.badgeDot, { 
            backgroundColor: isDrumStation ? '#FF9800' : '#4CAF50' 
          }]} />
          <Text style={styles.stationTypeText}>
            {selectedStation?.name || 'Select Station'} 
            {' — '}
            {isDrumStation ? 'Drum Sales (Dip Only)' : 'Pump System'}
          </Text>
        </View>

        {/* Station Selector */}
        <View style={styles.stationSelector}>
          <TouchableOpacity 
            style={styles.stationButton}
            onPress={() => setShowStationPicker(true)}
          >
            <View style={styles.stationInfo}>
              <Text style={styles.stationButtonText}>
                {selectedStation ? selectedStation.name : 'Select Station'}
              </Text>
              <Text style={styles.stationDateText}>
                Date: {readingDate}
              </Text>
            </View>
            <Ionicons name="swap-vertical" size={20} color="#F0C38E" />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation - Only show pump tabs for non-drum stations */}
        {!isDrumStation && (
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'readings' && styles.tabActive]}
              onPress={() => setActiveTab('readings')}
            >
              <Ionicons name="speedometer" size={18} color={activeTab === 'readings' ? '#F0C38E' : '#ffffff'} />
              <Text style={[styles.tabText, activeTab === 'readings' && styles.tabTextActive]}>Pump Readings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'dipping' && styles.tabActive]}
              onPress={() => setActiveTab('dipping')}
            >
              <Ionicons name="water" size={18} color={activeTab === 'dipping' ? '#F0C38E' : '#ffffff'} />
              <Text style={[styles.tabText, activeTab === 'dipping' && styles.tabTextActive]}>Tank Dipping</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'validation' && styles.tabActive]}
              onPress={() => setActiveTab('validation')}
            >
              <Ionicons name="checkmark-circle" size={18} color={activeTab === 'validation' ? '#F0C38E' : '#ffffff'} />
              <Text style={[styles.tabText, activeTab === 'validation' && styles.tabTextActive]}>Validation</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F0C38E" />
            <Text style={styles.loadingText}>Loading station data...</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Tab Content */}
            {isDrumStation ? (
              // DRUM STATION: Show only dip readings
              renderDrumStationView()
            ) : (
              // PUMP STATION: Show based on active tab
              <>
                {activeTab === 'readings' && renderPumpReadingsTab()}
                {activeTab === 'dipping' && renderTankDippingTab()}
                {activeTab === 'validation' && renderValidationTab()}
              </>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
                onPress={handleSaveAll}
                disabled={saving}
              >
                <Ionicons name={saving ? 'hourglass' : 'save'} size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save All Readings'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

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
                  style={[
                    styles.modalOption,
                    selectedStation?.id === station.id && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedStation(station);
                    setShowStationPicker(false);
                  }}
                >
                  <View style={styles.modalOptionRow}>
                    <Text style={[
                      styles.modalOptionText,
                      selectedStation?.id === station.id && styles.modalOptionTextSelected
                    ]}>
                      {station.name}
                    </Text>
                    <View style={[styles.badgeSmall, { 
                      backgroundColor: station.system_type === 'drum' ? '#FF9800' : '#4CAF50' 
                    }]}>
                      <Text style={styles.badgeSmallText}>
                        {station.system_type === 'drum' ? 'DRUM' : 'PUMP'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.modalOptionSubtext}>
                    {station.code} - {station.location}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowStationPicker(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Calendar Modal */}
        {renderCalendarModal()}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 24,
  },
  stationTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stationTypeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  stationSelector: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  stationButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stationInfo: {
    flex: 1,
  },
  stationButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  stationDateText: {
    fontSize: 12,
    color: '#F0C38E',
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateField: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  tabActive: {
    backgroundColor: 'rgba(240, 195, 142, 0.2)',
  },
  tabText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#F0C38E',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#F0C38E',
    marginTop: 12,
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F0C38E',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
    lineHeight: 18,
  },
  fuelTypeSection: {
    marginBottom: 20,
  },
  fuelTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  fuelTypeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  pumpCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  pumpCardHeader: {
    marginBottom: 12,
  },
  pumpName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  pumpFuelType: {
    fontSize: 12,
    marginTop: 2,
  },
  readingRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  readingField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 6,
  },
  readingInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  salesResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  salesLabel: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  salesValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tankCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  tankCardHeader: {
    marginBottom: 12,
  },
  tankName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tankCapacity: {
    fontSize: 12,
    marginTop: 2,
  },
  dippingRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dippingField: {
    flex: 1,
  },
  offloadRow: {
    marginBottom: 12,
  },
  offloadInput: {
    marginTop: 6,
  },
  dippingResult: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  validationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  validationBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  validationBannerText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  validationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  validationCardError: {
    borderColor: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  validationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  validationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  validationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  validationBadgeText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  validationDetails: {
    gap: 8,
  },
  validationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  validationLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  validationValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  discrepancyRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  errorMessageBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  errorMessageText: {
    fontSize: 12,
    color: '#F44336',
    flex: 1,
    lineHeight: 18,
  },
  warningMessageBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(240, 195, 142, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  warningMessageText: {
    fontSize: 12,
    color: '#F0C38E',
    flex: 1,
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: 'rgba(240, 195, 142, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(240, 195, 142, 0.3)',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F0C38E',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  summaryValue: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  summaryStatus: {
    fontSize: 13,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#F0C38E',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(240, 195, 142, 0.5)',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#312C51',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(240, 195, 142, 0.2)',
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: '#F0C38E',
  },
  modalOptionSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeSmallText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  modalCancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
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