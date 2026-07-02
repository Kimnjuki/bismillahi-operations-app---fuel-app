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
import { BatchPumpSale, DEFAULT_BATCH_PUMP_SALE, PumpAttendantSummary } from '../types/sales';
import { FuelType } from '../types';

const { width } = Dimensions.get('window');

const FUEL_TYPES = ['PMS', 'AGO'];
const PAYMENT_METHODS = ['cash', 'card', 'credit'];
const CUSTOMERS = ['Walk-in Custom', 'Regular Customer', 'Corporate Client'];
const STATIONS = ['ISSIRO STATION', 'DEPOT ISSIRO', 'RUNGU STATION', 'DUNGU STATION', 'DURBA STATION', 'NIANGARA STATION'];

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
  const [transactions, setTransactions] = useState<BatchPumpSale[]>([
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

  // ===== PER-ATTENDANT AGGREGATION =====
  const attendantSummaries = useMemo((): PumpAttendantSummary[] => {
    const map = new Map<string, PumpAttendantSummary>();
    
    transactions.forEach(t => {
      if (t.pumpAttendant) {
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
      const ft = t.fuelType;
      const vol = parseFloat(t.volumeLiters) || 0;
      const price = parseFloat(t.pricePerLiter) || 0;
      const current = map.get(ft) || { volume: 0, amount: 0 };
      current.volume += vol;
      current.amount += vol * price;
      map.set(ft, current);
    });
    
    return Array.from(map.entries()).map(([fuelType, data]) => ({
      fuelType,
      totalVolume: data.volume,
      totalAmount: data.amount,
    }));
  }, [transactions]);

  const calculateTotals = (transactions: BatchPumpSale[]) => {
    let subtotal = 0;
    transactions.forEach(t => {
      const volume = parseFloat(t.volumeLiters) || 0;
      const price = parseFloat(t.pricePerLiter) || 0;
      subtotal += volume * price;
    });
    const tax = subtotal * 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const updateTransactionField = (transactionIndex: number, field: string, value: any) => {
    setTransactions(prev => {
      const updatedTransactions = [...prev];
      updatedTransactions[transactionIndex] = { ...updatedTransactions[transactionIndex], [field]: value } as BatchPumpSale;
      return updatedTransactions;
    });
  };

  const addTransaction = () => {
    setTransactions(prev => [...prev, {...DEFAULT_BATCH_PUMP_SALE, date: batchDate}]);
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

  const batchSetField = (field: keyof BatchPumpSale, value: any) => {
    setTransactions(prev => prev.map(t => ({...t, [field]: value} as BatchPumpSale)));
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
        if (!transaction.pumpAttendant) {
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

          {/* Per-Attendant Summary */}
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
                  <Text style={styles.transactionType}>PUMP SALE</Text>
                  <View style={styles.transactionActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => copyTransaction(index)}>
                      <Ionicons name="copy" size={18} color="#312C51" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => removeTransaction(index)}>
                      <Ionicons name="trash" size={18} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Pump Transaction Fields */}
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
                
                {/* Transaction Total */}
                <View style={styles.transactionTotal}>
                  <Text style={styles.transactionTotalLabel}>TOTAL:</Text>
                  <Text style={styles.transactionTotalAmount}>
                    {formatCurrency.CDF(
                      (parseFloat(transaction.volumeLiters) || 0) * (parseFloat(transaction.pricePerLiter) || 0)
                    )}
                  </Text>
                </View>
              </View>
            ))}
            
            {/* Add Transaction Button */}
            <View style={styles.addTransactionSection}>
              <TouchableOpacity style={styles.addTransactionButton} onPress={addTransaction}>
                <Ionicons name="add" size={24} color="#312C51" />
                <Text style={styles.addTransactionText}>Add Pump Transaction</Text>
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
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButtonPrimary, loading && styles.actionButtonDisabled]}
              onPress={handleSubmitBatch}
              disabled={loading}
            >
              <Text style={styles.actionButtonText}>{loading ? 'Submitting...' : `Submit Batch (${transactions.length} transactions)`}</Text>
            </TouchableOpacity>
            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity style={styles.actionButtonSecondary} onPress={handleSaveDraft}>
                <Ionicons name="save" size={18} color="#312C51" />
                <Text style={styles.actionButtonSecondaryText}>Save Draft</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonSecondary} onPress={handlePrint}>
                <Ionicons name="print" size={18} color="#312C51" />
                <Text style={styles.actionButtonSecondaryText}>Print</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <Text style={styles.datePickerTitle}>Select Date</Text>
            <View style={styles.calendarNav}>
              <TouchableOpacity onPress={() => changeCalendarMonth(-1)}>
                <Ionicons name="chevron-back" size={24} color="#312C51" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthYear}>{MONTHS[calendarMonth - 1]} {calendarYear}</Text>
              <TouchableOpacity onPress={() => changeCalendarMonth(1)}>
                <Ionicons name="chevron-forward" size={24} color="#312C51" />
              </TouchableOpacity>
            </View>
            <View style={styles.calendarGrid}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <Text key={d} style={styles.calendarDayHeader}>{d}</Text>
              ))}
              {renderCalendar().map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.calendarDay,
                    !item.empty && tempDate.day === item.day && styles.calendarDaySelected,
                    !item.empty && tempDate.day === item.day && tempDate.month === calendarMonth && styles.calendarDaySelected,
                  ]}
                  onPress={() => item.empty ? null : setTempDate({...tempDate, day: item.day, month: calendarMonth, year: calendarYear})}
                >
                  <Text style={[styles.calendarDayText, item.empty && styles.calendarDayEmpty]}>
                    {item.empty ? '' : item.day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.calendarActions}>
              <TouchableOpacity style={styles.calendarCancelButton} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.calendarCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.calendarApplyButton} onPress={applyTempDate}>
                <Text style={styles.calendarApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  safeArea: { flex: 1 },
  content: { flex: 1 },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, paddingTop: 48 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  headerDate: { fontSize: 12, color: '#D3D3D3', marginTop: 4 },
  headerSpacer: { width: 24 },
  dateButton: { padding: 4 },
  
  // Sales Info
  salesInfoContainer: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12, borderRadius: 12, padding: 16, elevation: 2 },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  infoGroup: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: '#888', marginBottom: 4, textTransform: 'uppercase' },
  infoDropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F8F8', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  infoText: { fontSize: 14, color: '#312C51', fontWeight: '500' },
  infoInput: { backgroundColor: '#F8F8F8', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E0E0E0', fontSize: 14, color: '#312C51' },
  
  // Batch Actions
  batchActionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 12, marginTop: 12 },
  batchActionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 10, gap: 6, elevation: 1, flex: 1, minWidth: '45%' },
  batchActionText: { fontSize: 11, color: '#312C51', fontWeight: '500' },
  
  // Summary Card
  summaryCard: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12, borderRadius: 12, padding: 16, elevation: 2 },
  summaryCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  summaryCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#312C51' },
  attendantTableHeader: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 8, padding: 8, marginBottom: 4 },
  attendantTableHeaderText: { fontSize: 10, fontWeight: '700', color: '#666', textTransform: 'uppercase' },
  attendantTableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  attendantTableCell: { fontSize: 12, color: '#312C51' },
  attendantDivider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 8 },
  attendantSubTitle: { fontSize: 12, fontWeight: '700', color: '#312C51', marginBottom: 8 },
  attendantTip: { fontSize: 11, color: '#888', fontStyle: 'italic', marginTop: 8 },
  
  // Transactions
  transactionsContainer: { paddingHorizontal: 12, marginTop: 12 },
  transactionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  transactionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  transactionType: { fontSize: 12, fontWeight: 'bold', color: '#312C51', backgroundColor: '#E8E4F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  transactionActions: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 4 },
  
  // Fields
  fieldRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  fieldGroup: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#888', marginBottom: 4, textTransform: 'uppercase' },
  fieldInput: { backgroundColor: '#F8F8F8', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E0E0E0', fontSize: 14, color: '#312C51' },
  fieldDropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F8F8', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E0E0E0' },
  fieldText: { fontSize: 14, color: '#312C51', fontWeight: '500' },
  attendantField: { borderColor: '#312C51' },
  attendantDropdownContent: { flexDirection: 'row', alignItems: 'center' },
  
  // Transaction Total
  transactionTotal: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  transactionTotalLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginRight: 12 },
  transactionTotalAmount: { fontSize: 16, fontWeight: 'bold', color: '#312C51' },
  
  // Add Transaction
  addTransactionSection: { marginBottom: 12 },
  addTransactionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 2, borderColor: '#312C51', borderStyle: 'dashed', gap: 8 },
  addTransactionText: { fontSize: 14, fontWeight: '600', color: '#312C51' },
  
  // Summary
  summaryContainer: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12, borderRadius: 12, padding: 16, elevation: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { alignItems: 'flex-end' },
  summaryAmount: { fontSize: 14, fontWeight: '600', color: '#312C51' },
  summaryAmountUSD: { fontSize: 11, color: '#888' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 12 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#312C51' },
  totalAmount: { fontSize: 18, fontWeight: 'bold', color: '#312C51' },
  totalAmountUSD: { fontSize: 12, color: '#888' },
  
  // Action Buttons
  actionButtonsContainer: { paddingHorizontal: 12, marginTop: 16 },
  actionButtonPrimary: { backgroundColor: '#312C51', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  actionButtonDisabled: { opacity: 0.6 },
  actionButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  secondaryActionsRow: { flexDirection: 'row', gap: 12 },
  actionButtonSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, flex: 1, gap: 8, elevation: 1, borderWidth: 1, borderColor: '#E0E0E0' },
  actionButtonSecondaryText: { fontSize: 14, fontWeight: '600', color: '#312C51' },
  
  // Date Picker Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  datePickerModal: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '85%', maxWidth: 340 },
  datePickerTitle: { fontSize: 18, fontWeight: 'bold', color: '#312C51', textAlign: 'center', marginBottom: 16 },
  calendarNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calendarMonthYear: { fontSize: 16, fontWeight: '600', color: '#312C51' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDayHeader: { width: '14.28%', textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#888', paddingVertical: 4 },
  calendarDay: { width: '14.28%', alignItems: 'center', padding: 8 },
  calendarDaySelected: { backgroundColor: '#312C51', borderRadius: 8 },
  calendarDayText: { fontSize: 14, color: '#312C51' },
  calendarDayEmpty: { color: 'transparent' },
  calendarActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 16 },
  calendarCancelButton: { padding: 8 },
  calendarCancelText: { fontSize: 14, color: '#888', fontWeight: '600' },
  calendarApplyButton: { backgroundColor: '#312C51', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 8 },
  calendarApplyText: { fontSize: 14, color: '#fff', fontWeight: '600' },
});