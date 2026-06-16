import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { formatCurrency } from '../constants/currency';
import { BatchPumpSale, BatchDrumSale, BatchSale, DEFAULT_BATCH_PUMP_SALE, DEFAULT_BATCH_DRUM_SALE, PumpAttendantSummary } from '../types/sales';
import { DrumType, FuelType } from '../types';

const { width } = Dimensions.get('window');

const FUEL_TYPES = ['PMS', 'AGO'];
const PAYMENT_METHODS = ['cash', 'card', 'credit'];
const CUSTOMERS = ['Walk-in Custom', 'Regular Customer', 'Corporate Client'];
const STATIONS = ['ISSIRO STATION', 'DEPOT ISSIRO', 'RUNGU STATION', 'DUNGU STATION', 'DURBA STATION', 'NIANGARA STATION'];
const DRUM_STATIONS = ['DEPOT ISSIRO', 'DUNGU STATION'];

// Pre-defined pump attendants (can be extended)
const PUMP_ATTENDANTS = ['Attendant 1', 'Attendant 2', 'Attendant 3', 'Attendant 4', 'Attendant 5'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function SalesEntryScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
   
  const userStation = appUser?.station_id;
  const [transactions, setTransactions] = useState<BatchSale[]>([
    {...DEFAULT_BATCH_PUMP_SALE, date: new Date().toISOString().split('T')[0]},
  ]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1, day: new Date().getDate() });
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month - 1, 1).getDay();

  const openDatePicker = () => {
    const selected = new Date(`${batchDate}T00:00:00`);
    setCalendarMonth(selected.getMonth() + 1);
    setCalendarYear(selected.getFullYear());
    setTempDate({
      year: selected.getFullYear(),
      month: selected.getMonth() + 1,
      day: selected.getDate(),
    });
    setShowDatePicker(true);
  };

  const applyTempDate = () => {
    const month = tempDate.month || calendarMonth;
    const year = tempDate.year || calendarYear;
    const day = Math.min(tempDate.day || 1, getDaysInMonth(year, month));
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setBatchDate(dateStr);
    setShowDatePicker(false);
  };

  const changeCalendarMonth = (delta: number) => {
    let m = calendarMonth + delta;
    let y = calendarYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setCalendarMonth(m);
    setCalendarYear(y);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
    const daysToRender: Array<{ day: number; empty: boolean }> = [];
    for (let i = 0; i < firstDay; i++) daysToRender.push({ day: 0, empty: true });
    for (let day = 1; day <= daysInMonth; day++) daysToRender.push({ day, empty: false });
    return daysToRender;
  };

  const getItemTypeForStation = (station: string): 'pump' | 'drum' => {
    return DRUM_STATIONS.includes(station) ? 'drum' : 'pump';
  };

  const getAvailableStations = (): string[] => {
    if (appUser?.role === 'admin') return STATIONS;
    if (userStation) {
      const stationName = STATIONS.find(station => 
        station.toLowerCase().replace(/\s+/g, '_') === userStation.toLowerCase()
      );
      return stationName ? [stationName] : STATIONS;
    }
    return STATIONS;
  };

  const isDrumStation = (station: string): boolean => {
    return DRUM_STATIONS.includes(station) || station.toLowerCase().includes('issiro');
  };

  // ===== PER-ATTENDANT AGGREGATION =====
  const attendantSummaries = useMemo((): PumpAttendantSummary[] => {
    const map = new Map<string, PumpAttendantSummary>();
    
    transactions.forEach(t => {
      if ('pumpNumber' in t && t.pumpAttendant) {
        const key = `${t.pumpAttendant}-${t.pumpNumber}-${t.fuelType}`;
        const vol = parseFloat(t.volumeLiters) || 0;
        const price = parseFloat(t.pricePerLiter) || 0;
        
        if (map.has(key)) {
          const existing = map.get(key)!;
          existing.volumeLiters += vol;
          existing.totalAmount += vol * price;
        } else {
          map.set(key, {
            attendant: t.pumpAttendant,
            pumpNumber: t.pumpNumber,
            fuelType: t.fuelType,
            volumeLiters: vol,
            totalAmount: vol * price,
          });
        }
      }
    });
    
    return Array.from(map.values()).sort((a, b) => a.attendant.localeCompare(b.attendant));
  }, [transactions]);

  // ===== TOTAL SALES PER FUEL TYPE =====
  const fuelTypeTotals = useMemo((): { fuelType: FuelType; totalVolume: number; totalAmount: number }[] => {
    const map = new Map<FuelType, { volume: number; amount: number }>();
    
    transactions.forEach(t => {
      if ('pumpNumber' in t) {
        const ft = t.fuelType;
        const vol = parseFloat(t.volumeLiters) || 0;
        const price = parseFloat(t.pricePerLiter) || 0;
        const current = map.get(ft) || { volume: 0, amount: 0 };
        current.volume += vol;
        current.amount += vol * price;
        map.set(ft, current);
      } else {
        // Drum sales counted separately
        const ft: FuelType = 'PMS'; // drums default to PMS for aggregation
        const qty = parseInt(t.quantity) || 0;
        const price = parseFloat(t.pricePerDrum) || 0;
        const liters = qty * (t.drumType === '200L Drum' ? 200 : t.drumType === '100L Drum' ? 100 : t.drumType === '50L Drum' ? 50 : 25);
        const current = map.get(ft) || { volume: 0, amount: 0 };
        current.volume += liters;
        current.amount += qty * price;
        map.set(ft, current);
      }
    });
    
    return Array.from(map.entries()).map(([fuelType, data]) => ({
      fuelType,
      totalVolume: data.volume,
      totalAmount: data.amount,
    }));
  }, [transactions]);

  const handleStationChange = (transactionIndex: number, newStation: string) => {
    const newItemType = getItemTypeForStation(newStation);
    setTransactions(prev => {
      const updatedTransactions = [...prev];
      const transaction = updatedTransactions[transactionIndex];
      if ('pumpNumber' in transaction) {
        updatedTransactions[transactionIndex] = { ...transaction, station: newStation } as BatchPumpSale;
      } else {
        updatedTransactions[transactionIndex] = { ...transaction, station: newStation } as BatchDrumSale;
      }
      return updatedTransactions;
    });
  };

  const calculateTotals = (transactions: BatchSale[]) => {
    let subtotal = 0;
    transactions.forEach(t => {
      if ('pumpNumber' in t) {
        const volume = parseFloat(t.volumeLiters) || 0;
        const price = parseFloat(t.pricePerLiter) || 0;
        subtotal += volume * price;
      } else {
        const quantity = parseInt(t.quantity) || 0;
        const price = parseFloat(t.pricePerDrum) || 0;
        subtotal += quantity * price;
      }
    });
    const tax = subtotal * 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const updateTransactionField = (transactionIndex: number, field: string, value: any) => {
    setTransactions(prev => {
      const updatedTransactions = [...prev];
      const transaction = updatedTransactions[transactionIndex];
      if ('pumpNumber' in transaction) {
        updatedTransactions[transactionIndex] = { ...transaction, [field]: value } as BatchPumpSale;
      } else {
        updatedTransactions[transactionIndex] = { ...transaction, [field]: value } as BatchDrumSale;
      }
      return updatedTransactions;
    });
  };

  const addTransaction = (type: 'pump' | 'drum') => {
    const newTransaction = type === 'pump' 
      ? {...DEFAULT_BATCH_PUMP_SALE, date: batchDate} 
      : {...DEFAULT_BATCH_DRUM_SALE, date: batchDate};
    setTransactions(prev => [...prev, newTransaction]);
  };

  const removeTransaction = (index: number) => {
    setTransactions(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      if (updated.length === 0) return [{...DEFAULT_BATCH_PUMP_SALE, date: batchDate}];
      return updated;
    });
  };

  const copyTransaction = (index: number) => {
    const transactionToCopy = transactions[index];
    setTransactions(prev => [...prev, transactionToCopy]);
  };

  const batchSetField = (field: keyof BatchSale, value: any) => {
    setTransactions(prev => prev.map(t => {
      if ('pumpNumber' in t) return {...t, [field]: value} as BatchPumpSale;
      else return {...t, [field]: value} as BatchDrumSale;
    }));
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      Alert.alert('Success', 'Batch saved as draft');
    } catch (error) {
      Alert.alert('Error', 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBatch = async () => {
    try {
      setLoading(true);
      
      // Validate: pump sales must have attendant assigned
      for (const transaction of transactions) {
        if ('pumpNumber' in transaction && !transaction.pumpAttendant) {
          const idx = transactions.indexOf(transaction) + 1;
          const pumpNum = transaction.pumpNumber || '?';
          Alert.alert(
            'Missing Pump Attendant',
            `Transaction #${idx} (Pump ${pumpNum}): Please assign a pump attendant. Each pump must be assigned to an attendant to track sales per person.`,
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }
      }

      for (const transaction of transactions) {
        if ('pumpNumber' in transaction) {
          // Pump sale with attendant
          const { error } = await supabase
            .from('daily_sales')
            .insert({
              sale_type: 'pump',
              fuel_type: transaction.fuelType,
              station_name: transaction.station,
              pump_number: parseInt(transaction.pumpNumber) || 1,
              volume_liters: parseFloat(transaction.volumeLiters) || 0,
              price_per_liter: parseFloat(transaction.pricePerLiter) || 0,
              total_amount: (parseFloat(transaction.volumeLiters) || 0) * (parseFloat(transaction.pricePerLiter) || 0),
              payment_method: transaction.payment,
              sale_date: transaction.date,
              created_by: appUser?.id,
              pump_attendant: transaction.pumpAttendant,
            });
          if (error) {
            console.error('Error inserting pump sale:', error);
          }
        } else {
          // Drum sale
          const { error } = await supabase
            .from('daily_sales')
            .insert({
              sale_type: 'drum',
              drum_type: transaction.drumType,
              station_name: transaction.station,
              quantity: parseInt(transaction.quantity) || 0,
              price_per_drum: parseFloat(transaction.pricePerDrum) || 0,
              total_amount: (parseInt(transaction.quantity) || 0) * (parseFloat(transaction.pricePerDrum) || 0),
              payment_method: transaction.payment,
              sale_date: transaction.date,
              created_by: appUser?.id,
            });
          if (error) {
            console.error('Error inserting drum sale:', error);
          }
        }
      }

      // Build summary of per-attendant and per-fuel-type totals
      const attendantSummary = attendantSummaries
        .map(a => `  ${a.attendant} | Pump ${a.pumpNumber} | ${a.fuelType} | ${a.volumeLiters.toFixed(2)}L | ${formatCurrency.CDF(a.totalAmount)}`)
        .join('\n');

      const fuelSummary = fuelTypeTotals
        .map(ft => `  ${ft.fuelType}: ${ft.totalVolume.toFixed(2)}L total = ${formatCurrency.CDF(ft.totalAmount)}`)
        .join('\n');

      Alert.alert(
        'Batch Submitted Successfully',
        `Transactions: ${transactions.length}\n\n` +
        (attendantSummaries.length > 0 
          ? `═══ Per Attendant ═══\n${attendantSummary}\n\n` 
          : '') +
        `═══ Per Fuel Type ═══\n${fuelSummary}\n\n` +
        `Total: ${formatCurrency.CDF(calculateTotals(transactions).total)}`
      );

      // Reset
      setTransactions([{...DEFAULT_BATCH_PUMP_SALE, date: batchDate}]);
    } catch (error) {
      console.error('Error submitting batch:', error);
      Alert.alert('Error', 'Failed to submit batch');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    Alert.alert('Print', 'Print functionality will be implemented');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient colors={['#312C51', '#48426D']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Batch Sales Entry</Text>
            <TouchableOpacity style={styles.dateButton} onPress={openDatePicker}>
              <Text style={styles.headerDate}>📅 {batchDate}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Sales Information - Batch Header */}
          <View style={styles.salesInfoContainer}>
            <View style={styles.infoRow}>
              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>Station</Text>
                <TouchableOpacity
                  style={styles.infoDropdown}
                  onPress={() => {
                    const availableStations = getAvailableStations();
                    const currentIndex = availableStations.indexOf(transactions[0].station);
                    const nextIndex = (currentIndex + 1) % availableStations.length;
                    batchSetField('station', availableStations[nextIndex]);
                  }}
                >
                  <Text style={styles.infoText}>{transactions[0].station}</Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>Customer</Text>
                <TouchableOpacity style={styles.infoDropdown}>
                  <Text style={styles.infoText}>{transactions[0].customer}</Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>Payment</Text>
                <TouchableOpacity style={styles.infoDropdown}>
                  <Text style={styles.infoText}>{transactions[0].payment}</Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>Ref No</Text>
                <TextInput
                  style={styles.infoInput}
                  value={transactions[0].refNo}
                  onChangeText={(text) => batchSetField('refNo', text)}
                  placeholder="e.g., 1001"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          {/* Batch Actions */}
          <View style={styles.batchActionsContainer}>
            <TouchableOpacity style={styles.batchActionButton} onPress={() => batchSetField('date', batchDate)}>
              <Ionicons name="calendar" size={20} color="#312C51" />
              <Text style={styles.batchActionText}>Apply Date to All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.batchActionButton} onPress={() => batchSetField('payment', transactions[0].payment)}>
              <Ionicons name="cash" size={20} color="#312C51" />
              <Text style={styles.batchActionText}>Apply Payment to All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.batchActionButton} onPress={() => batchSetField('customer', transactions[0].customer)}>
              <Ionicons name="person" size={20} color="#312C51" />
              <Text style={styles.batchActionText}>Apply Customer to All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.batchActionButton} onPress={() => batchSetField('station', transactions[0].station)}>
              <Ionicons name="map" size={20} color="#312C51" />
              <Text style={styles.batchActionText}>Apply Station to All</Text>
            </TouchableOpacity>
          </View>

          {/* Per-Attendant Summary (visible when there are pump transactions) */}
          {attendantSummaries.length > 0 && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryCardHeader}>
                <Ionicons name="people" size={20} color="#312C51" />
                <Text style={styles.summaryCardTitle}>Pump Attendants Summary</Text>
              </View>
              <View style={styles.attendantTableHeader}>
                <Text style={[styles.attendantTableCell, styles.attendantTableHeaderText, { flex: 1.5 }]}>Attendant</Text>
                <Text style={[styles.attendantTableCell, styles.attendantTableHeaderText, { flex: 1 }]}>Pump</Text>
                <Text style={[styles.attendantTableCell, styles.attendantTableHeaderText, { flex: 1 }]}>Fuel</Text>
                <Text style={[styles.attendantTableCell, styles.attendantTableHeaderText, { flex: 1.2 }]}>Volume</Text>
                <Text style={[styles.attendantTableCell, styles.attendantTableHeaderText, { flex: 1.5 }]}>Amount</Text>
              </View>
              {attendantSummaries.map((summary, idx) => (
                <View key={idx} style={styles.attendantTableRow}>
                  <Text style={[styles.attendantTableCell, { flex: 1.5 }]}>{summary.attendant}</Text>
                  <Text style={[styles.attendantTableCell, { flex: 1 }]}>{summary.pumpNumber}</Text>
                  <Text style={[styles.attendantTableCell, { flex: 1 }]}>{summary.fuelType}</Text>
                  <Text style={[styles.attendantTableCell, { flex: 1.2 }]}>{summary.volumeLiters.toFixed(1)}L</Text>
                  <Text style={[styles.attendantTableCell, { flex: 1.5 }]}>{formatCurrency.CDF(summary.totalAmount)}</Text>
                </View>
              ))}
              
              {/* Combined per fuel type */}
              <View style={styles.attendantDivider} />
              <Text style={styles.attendantSubTitle}>Combined Per Fuel Type</Text>
              {fuelTypeTotals.map((ft, idx) => (
                <View key={idx} style={styles.attendantTableRow}>
                  <Text style={[styles.attendantTableCell, { flex: 1.5, fontWeight: 'bold' }]}>{ft.fuelType}</Text>
                  <Text style={[styles.attendantTableCell, { flex: 2 }]}></Text>
                  <Text style={[styles.attendantTableCell, { flex: 1.2, fontWeight: 'bold' }]}>{ft.totalVolume.toFixed(1)}L</Text>
                  <Text style={[styles.attendantTableCell, { flex: 1.5, fontWeight: 'bold' }]}>{formatCurrency.CDF(ft.totalAmount)}</Text>
                </View>
              ))}

              <View style={styles.attendantDivider} />
              <Text style={styles.attendantTip}>
                Each pump transaction records which attendant handled it. 
                The system tracks per-attendant sales and aggregates them per fuel type for dip vs sales reconciliation.
              </Text>
            </View>
          )}

          {/* Transactions List */}
          <View style={styles.transactionsContainer}>
            {transactions.map((transaction, index) => (
              <View key={index} style={styles.transactionCard}>
                <View style={styles.transactionHeader}>
                  <Text style={styles.transactionType}>
                    {('pumpNumber' in transaction) ? 'PUMP SALE' : 'DRUM SALE'}
                  </Text>
                  <View style={styles.transactionActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => copyTransaction(index)}>
                      <Ionicons name="copy" size={18} color="#312C51" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => removeTransaction(index)}>
                      <Ionicons name="trash" size={18} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {('pumpNumber' in transaction) ? (
                  // Pump Transaction Fields
                  <>
                    <View style={styles.fieldRow}>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Pump #</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={transaction.pumpNumber}
                          onChangeText={(text) => updateTransactionField(index, 'pumpNumber', text)}
                          keyboardType="numeric"
                          placeholder="1"
                        />
                      </View>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Fuel Type</Text>
                        <TouchableOpacity 
                          style={styles.fieldDropdown}
                          onPress={() => {
                            const currentIndex = FUEL_TYPES.indexOf(transaction.fuelType);
                            const nextIndex = (currentIndex + 1) % FUEL_TYPES.length;
                            updateTransactionField(index, 'fuelType', FUEL_TYPES[nextIndex]);
                          }}
                        >
                          <Text style={styles.fieldText}>{transaction.fuelType}</Text>
                          <Ionicons name="chevron-down" size={16} color="#666" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* PUMP ATTENDANT FIELD */}
                    <View style={styles.fieldRow}>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Pump Attendant</Text>
                        <TouchableOpacity 
                          style={[styles.fieldDropdown, styles.attendantField]}
                          onPress={() => {
                            const currentIndex = PUMP_ATTENDANTS.indexOf(transaction.pumpAttendant);
                            const nextIndex = (currentIndex + 1) % PUMP_ATTENDANTS.length;
                            updateTransactionField(index, 'pumpAttendant', PUMP_ATTENDANTS[nextIndex]);
                          }}
                        >
                          <View style={styles.attendantDropdownContent}>
                            <Ionicons name="person" size={16} color="#312C51" />
                            <Text style={[styles.fieldText, { marginLeft: 6 }]}>
                              {transaction.pumpAttendant || 'Select Attendant'}
                            </Text>
                          </View>
                          <Ionicons name="chevron-down" size={16} color="#666" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Station</Text>
                        <TouchableOpacity 
                          style={styles.fieldDropdown}
                          onPress={() => {
                            const availableStations = getAvailableStations();
                            const currentIndex = availableStations.indexOf(transaction.station);
                            const nextIndex = (currentIndex + 1) % availableStations.length;
                            updateTransactionField(index, 'station', availableStations[nextIndex]);
                          }}
                        >
                          <Text style={styles.fieldText}>{transaction.station}</Text>
                          <Ionicons name="chevron-down" size={16} color="#666" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.fieldRow}>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Volume (Liters)</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={transaction.volumeLiters}
                          onChangeText={(text) => updateTransactionField(index, 'volumeLiters', text)}
                          keyboardType="numeric"
                          placeholder="0.00"
                        />
                      </View>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Price/Liter (CDF)</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={transaction.pricePerLiter}
                          onChangeText={(text) => updateTransactionField(index, 'pricePerLiter', text)}
                          keyboardType="numeric"
                          placeholder="0"
                        />
                      </View>
                    </View>
                  </>
                ) : (
                  // Drum Transaction Fields
                  <>
                    <View style={styles.fieldRow}>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Drum Type</Text>
                        <TouchableOpacity 
                          style={styles.fieldDropdown}
                          onPress={() => {
                            const currentIndex = (['200L Drum', '100L Drum', '50L Drum', '25L Jerrycan'] as DrumType[]).indexOf(transaction.drumType as DrumType);
                            const nextIndex = (currentIndex + 1) % 4;
                            const drumTypes = ['200L Drum', '100L Drum', '50L Drum', '25L Jerrycan'];
                            updateTransactionField(index, 'drumType', drumTypes[nextIndex]);
                          }}
                        >
                          <Text style={styles.fieldText}>{transaction.drumType}</Text>
                          <Ionicons name="chevron-down" size={16} color="#666" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Customer</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={transaction.customer}
                          onChangeText={(text) => updateTransactionField(index, 'customer', text)}
                          placeholder="Walk-in Custom"
                        />
                      </View>
                    </View>
                    
                    <View style={styles.fieldRow}>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Quantity (Drums)</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={transaction.quantity}
                          onChangeText={(text) => updateTransactionField(index, 'quantity', text)}
                          keyboardType="numeric"
                          placeholder="0"
                        />
                      </View>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Price/Drum (CDF)</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={transaction.pricePerDrum}
                          onChangeText={(text) => updateTransactionField(index, 'pricePerDrum', text)}
                          keyboardType="numeric"
                          placeholder="0"
                        />
                      </View>
                    </View>
                  </>
                )}
                
                {/* Transaction Total */}
                <View style={styles.transactionTotal}>
                  <Text style={styles.transactionTotalLabel}>TOTAL:</Text>
                  <Text style={styles.transactionTotalAmount}>
                    {formatCurrency.CDF(
                      ('pumpNumber' in transaction)
                        ? (parseFloat(transaction.volumeLiters) || 0) * (parseFloat(transaction.pricePerLiter) || 0)
                        : (parseInt(transaction.quantity) || 0) * (parseFloat(transaction.pricePerDrum) || 0)
                    )}
                  </Text>
                </View>
              </View>
            ))}
            
            {/* Add Transaction Button */}
            <View style={styles.addTransactionSection}>
              <TouchableOpacity style={styles.addTransactionButton} onPress={() => addTransaction('pump')}>
                <Ionicons name="add" size={24} color="#312C51" />
                <Text style={styles.addTransactionText}>Add Pump Transaction</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addTransactionButton} onPress={() => addTransaction('drum')}>
                <Ionicons name="add" size={24} color="#312C51" />
                <Text style={styles.addTransactionText}>Add Drum Transaction</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <View style={styles.summaryValue}>
                <Text style={styles.summaryAmount}>{formatCurrency.CDF(calculateTotals(transactions).subtotal)}</Text>
                <Text style={styles.summaryAmountUSD}>
                  {formatCurrency.USD(calculateTotals(transactions).subtotal / 2850.50)}
                </Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (0%)</Text>
              <View style={styles.summaryValue}>
                <Text style={styles.summaryAmount}>{formatCurrency.CDF(calculateTotals(transactions).tax)}</Text>
                <Text style={styles.summaryAmountUSD}>
                  {formatCurrency.USD(calculateTotals(transactions).tax / 2850.50)}
                </Text>
              </View>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <View style={styles.summaryValue}>
                <Text style={styles.totalAmount}>{formatCurrency.CDF(calculateTotals(transactions).total)}</Text>
                <Text style={styles.totalAmountUSD}>
                  {formatCurrency.USD(calculateTotals(transactions).total / 2850.50)}
                </Text>
              </View>
            </View>
            <Text style={styles.exchangeRateText}>
              Exchange Rate: 1 USD = {formatCurrency.CDF(2850.50)} (Rate: 0.00035078)
            </Text>
          </View>

          {/* Dip & Sales Reconciliation Info */}
          <View style={styles.reconciliationCard}>
            <View style={styles.reconciliationHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.reconciliationTitle}>Dip vs Sales Reconciliation</Text>
            </View>
            <Text style={styles.reconciliationText}>
              Total PMS: {fuelTypeTotals.find(f => f.fuelType === 'PMS')?.totalVolume.toFixed(2) || '0.00'}L | 
              Total AGO: {fuelTypeTotals.find(f => f.fuelType === 'AGO')?.totalVolume.toFixed(2) || '0.00'}L
            </Text>
            <Text style={styles.reconciliationText}>
              These totals will be validated against tank dip readings in the Pump & Dipping Management screen.
              The dip difference (Previous Dip - Current Dip + Offload) must match these sales figures per fuel type.
            </Text>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.saveDraftButton}
            onPress={handleSaveDraft}
            disabled={loading}
          >
            <Text style={styles.saveDraftText}>Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmitBatch}
            disabled={loading}
          >
            <Text style={styles.submitText}>Submit Batch</Text>
          </TouchableOpacity>
            <TouchableOpacity
          style={styles.printButton}
          onPress={handlePrint}
          disabled={loading}
          >
            <Text style={styles.printText}>Print</Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
        <Modal visible={showDatePicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => changeCalendarMonth(-1)}>
                  <Ionicons name="chevron-back" size={24} color="#312C51" />
                </TouchableOpacity>
                <Text style={styles.calendarMonthYear}>
                  {MONTHS[calendarMonth - 1]} {calendarYear}
                </Text>
                <TouchableOpacity onPress={() => changeCalendarMonth(1)}>
                  <Ionicons name="chevron-forward" size={24} color="#312C51" />
                </TouchableOpacity>
              </View>
              <View style={styles.calendarWeekDays}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <React.Fragment key={index}>
                    <View style={styles.weekDayCell}>
                      <Text style={styles.weekDayText}>{day}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
              <FlatList
                data={renderCalendar()}
                numColumns={7}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.calendarDayCell,
                      !item.empty && tempDate.day === item.day && tempDate.month === calendarMonth && tempDate.year === calendarYear && styles.selectedDayCell,
                    ]}
                    onPress={() => !item.empty && setTempDate({ ...tempDate, day: item.day })}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      !item.empty && tempDate.day === item.day && tempDate.month === calendarMonth && tempDate.year === calendarYear && styles.selectedDayText,
                    ]}>
                      {item.day || ''}
                    </Text>
                  </TouchableOpacity>
                )}
                scrollEnabled={false}
              />
              <TouchableOpacity style={styles.applyDateButton} onPress={applyTempDate}>
                <Text style={styles.applyDateText}>Apply Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, justifyContent: 'space-between',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 24 },
  dateButton: { marginTop: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  headerDate: { fontSize: 12, color: '#ffffff', opacity: 0.8 },
  content: { flex: 1, padding: 16 },
  salesInfoContainer: { backgroundColor: '#ffffff', borderRadius: 8, padding: 16, marginBottom: 16 },
  infoRow: { flexDirection: 'row', marginBottom: 12 },
  infoGroup: { flex: 1, marginHorizontal: 4 },
  infoLabel: { fontSize: 12, color: '#666', marginBottom: 4, fontWeight: '600' },
  infoDropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f8f8f8', borderRadius: 6, padding: 12, borderWidth: 1, borderColor: '#e0e0e0',
  },
  infoInput: {
    backgroundColor: '#f8f8f8', borderRadius: 6, padding: 12,
    borderWidth: 1, borderColor: '#e0e0e0', fontSize: 14, color: '#333',
  },
  infoText: { fontSize: 14, color: '#333' },
  batchActionsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  batchActionButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderRadius: 6, padding: 12, margin: 4, borderWidth: 1, borderColor: '#e0e0e0',
  },
  batchActionText: { fontSize: 12, color: '#312C51', marginLeft: 6 },
  
  // Per-Attendant Summary Card
  summaryCard: {
    backgroundColor: '#ffffff', borderRadius: 8, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#312C51',
  },
  summaryCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  summaryCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#312C51' },
  attendantTableHeader: {
    flexDirection: 'row', backgroundColor: '#312C51', borderRadius: 6,
    padding: 10, marginBottom: 4,
  },
  attendantTableHeaderText: { color: '#ffffff', fontWeight: 'bold', fontSize: 11 },
  attendantTableRow: {
    flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  attendantTableCell: { fontSize: 12, color: '#333' },
  attendantDivider: { height: 1, backgroundColor: '#312C51', marginVertical: 8 },
  attendantSubTitle: { fontSize: 13, fontWeight: 'bold', color: '#312C51', marginBottom: 8 },
  attendantTip: {
    fontSize: 11, color: '#666', fontStyle: 'italic', marginTop: 8, lineHeight: 16,
  },
  
  // Attendant field
  attendantField: { borderColor: '#312C51', borderWidth: 2 },
  attendantDropdownContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  
  transactionsContainer: { marginBottom: 16 },
  transactionCard: {
    backgroundColor: '#ffffff', borderRadius: 8, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0',
  },
  transactionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  transactionType: { fontSize: 14, fontWeight: 'bold', color: '#312C51' },
  transactionActions: { flexDirection: 'row' },
  actionButton: { padding: 6, marginLeft: 4 },
  fieldRow: { flexDirection: 'row', marginBottom: 12 },
  fieldGroup: { flex: 1, marginHorizontal: 4 },
  fieldLabel: { fontSize: 12, color: '#666', marginBottom: 4, fontWeight: '600' },
  fieldInput: {
    backgroundColor: '#f8f8f8', borderRadius: 6, padding: 12,
    borderWidth: 1, borderColor: '#e0e0e0', fontSize: 14, color: '#333',
  },
  fieldDropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f8f8f8', borderRadius: 6, padding: 12, borderWidth: 1, borderColor: '#e0e0e0',
  },
  fieldText: { fontSize: 14, color: '#333' },
  transactionTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0',
  },
  transactionTotalLabel: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  transactionTotalAmount: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  addTransactionSection: { marginTop: 16 },
  addTransactionButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderRadius: 8, padding: 16, marginVertical: 4,
    borderWidth: 2, borderColor: '#312C51', borderStyle: 'dashed',
  },
  addTransactionText: { fontSize: 16, color: '#312C51', fontWeight: '600', marginLeft: 8 },
  summaryContainer: { backgroundColor: '#ffffff', borderRadius: 8, padding: 16, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { alignItems: 'flex-end' },
  summaryAmount: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  summaryAmountUSD: { fontSize: 12, color: '#666' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 8, marginTop: 8 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  totalAmount: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  totalAmountUSD: { fontSize: 14, color: '#666' },
  exchangeRateText: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 12 },
  
  // Reconciliation Card
  reconciliationCard: {
    backgroundColor: '#f0fff0', borderRadius: 8, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#4CAF50',
  },
  reconciliationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  reconciliationTitle: { fontSize: 14, fontWeight: 'bold', color: '#2E7D32' },
  reconciliationText: { fontSize: 12, color: '#555', lineHeight: 18 },
  
  footer: {
    flexDirection: 'row', padding: 16, backgroundColor: '#ffffff',
    borderTopWidth: 1, borderTopColor: '#e0e0e0',
  },
  saveDraftButton: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 8, padding: 16,
    marginRight: 8, borderWidth: 1, borderColor: '#312C51', alignItems: 'center',
  },
  saveDraftText: { fontSize: 14, color: '#312C51', fontWeight: '600' },
  submitButton: {
    flex: 1, backgroundColor: '#312C51', borderRadius: 8, padding: 16,
    marginHorizontal: 4, alignItems: 'center',
  },
  submitText: { fontSize: 14, color: '#ffffff', fontWeight: '600' },
  printButton: {
    flex: 1, backgroundColor: '#312C51', borderRadius: 8, padding: 16,
    marginLeft: 8, alignItems: 'center',
  },
  printText: { fontSize: 14, color: '#ffffff', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  datePickerModal: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, width: '90%', maxWidth: 360 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  calendarMonthYear: { fontSize: 16, fontWeight: 'bold', color: '#312C51' },
  calendarWeekDays: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  weekDayCell: { width: 40, alignItems: 'center' },
  weekDayText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  calendarDayCell: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  selectedDayCell: { backgroundColor: '#312C51', borderRadius: 20 },
  calendarDayText: { fontSize: 14, color: '#333' },
  selectedDayText: { color: '#ffffff', fontWeight: 'bold' },
  applyDateButton: {
    backgroundColor: '#312C51', borderRadius: 8, padding: 14,
    alignItems: 'center', marginTop: 16,
  },
  applyDateText: { fontSize: 16, color: '#ffffff', fontWeight: '600' },
});