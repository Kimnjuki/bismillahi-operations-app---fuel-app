import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase, ExchangeRate } from '../config/supabase';
import { FundTransfer, Currency } from '../types';
import { fundTransferService } from '../services/fundTransferService';
import { internalAccountService } from '../services/internalAccountService';
import { InternalAccount, Station } from '../types';

export default function FundTransferScreen({ navigation }: any) {
  const { appUser } = useAuth();
  const [transfers, setTransfers] = useState<FundTransfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<FundTransfer[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [accounts, setAccounts] = useState<InternalAccount[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<FundTransfer | null>(null);

  // Filter states
  const [selectedStation, setSelectedStation] = useState<string>('All Stations');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('All Time');
  const [selectedMonth, setSelectedMonth] = useState<string>('All Months');
  const [showStationFilter, setShowStationFilter] = useState(false);
  const [showDateRangeFilter, setShowDateRangeFilter] = useState(false);
  const [showMonthFilter, setShowMonthFilter] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fromAccount: '',
    toAccount: '',
    amount: '',
    currency: 'USD' as Currency,
    exchangeRate: '',
    convertedAmount: '',
    purpose: '',
    station: '',
  });

  const currencies: Currency[] = ['USD', 'CDF'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December', 'All Months'
  ];

  const dateRanges = [
    'All Time',
    'Last 7 days',
    'Last 30 days',
    'Last 3 months',
    'This year'
  ];

  useEffect(() => {
    fetchTransfers();
    fetchExchangeRates();
    fetchAccounts();
    fetchStations();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transfers, selectedStation, selectedDateRange, selectedMonth]);

  const fetchTransfers = async () => {
    try {
      const response = await fundTransferService.getFundTransfers();
      
      if (response.success && response.data) {
        setTransfers(response.data);
        setFilteredTransfers(response.data);
      } else {
        // Fallback to sample data for demo purposes
        const sampleTransfers: FundTransfer[] = [
          {
            id: '1',
            from_account: 'ISSIRO STATION - Cash Account',
            to_account: 'ISSIRO STATION - Bank Account',
            amount: 15000,
            currency: 'USD',
            exchange_rate: 1000,
            converted_amount: 15000000,
            purpose: 'Daily deposit',
            transfer_date: '2024-07-26',
            created_by: appUser?.id || '',
            created_at: new Date().toISOString(),
            station: 'ISSIRO STATION'
          },
          {
            id: '2',
            from_account: 'DEPOT ISSIRO - Operations',
            to_account: 'RUNGU STATION - Fuel Account',
            amount: 25000,
            currency: 'USD',
            exchange_rate: 1000,
            converted_amount: 25000000,
            purpose: 'Fuel supply transfer',
            transfer_date: '2024-07-25',
            created_by: appUser?.id || '',
            created_at: new Date().toISOString(),
            station: 'DEPOT ISSIRO'
          },
          {
            id: '3',
            from_account: 'Main Petty Cash',
            to_account: 'DUNGU STATION - Cash Account',
            amount: 5000,
            currency: 'USD',
            exchange_rate: 1000,
            converted_amount: 5000000,
            purpose: 'Emergency funds',
            transfer_date: '2024-07-24',
            created_by: appUser?.id || '',
            created_at: new Date().toISOString(),
            station: 'DUNGU STATION'
          },
          {
            id: '4',
            from_account: 'DURBA STATION - Bank Account',
            to_account: 'NIANGARA STATION - Operations',
            amount: 12000,
            currency: 'USD',
            exchange_rate: 1000,
            converted_amount: 12000000,
            purpose: 'Operations funding',
            transfer_date: '2024-07-23',
            created_by: appUser?.id || '',
            created_at: new Date().toISOString(),
            station: 'DURBA STATION'
          }
        ];

        setTransfers(sampleTransfers);
        setFilteredTransfers(sampleTransfers);
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('effective_date', { ascending: false });

      if (error) throw error;
      setExchangeRates(data || []);
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      // Fallback to default exchange rate
      setExchangeRates([{
        id: '1',
        from_currency: 'USD',
        to_currency: 'CDF',
        rate: 1000,
        effective_date: new Date().toISOString().split('T')[0],
        created_by: appUser?.id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await internalAccountService.getInternalAccounts();
      
      if (response.success && response.data) {
        setAccounts(response.data);
      } else {
        // Fallback to sample data
        setAccounts(internalAccountService.getSampleAccounts());
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts(internalAccountService.getSampleAccounts());
    }
  };

  const fetchStations = async () => {
    try {
      const response = await internalAccountService.getStations();
      
      if (response.success && response.data) {
        setStations(response.data);
      } else {
        // Fallback to sample data
        setStations(internalAccountService.getSampleStations());
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
      setStations(internalAccountService.getSampleStations());
    }
  };

  const applyFilters = () => {
    let filtered = [...transfers];

    // Filter by station
    if (selectedStation !== 'All Stations') {
      filtered = filtered.filter(transfer => transfer.station === selectedStation);
    }

    // Filter by month
    if (selectedMonth !== 'All Months') {
      const monthIndex = months.indexOf(selectedMonth);
      filtered = filtered.filter(transfer => {
        const transferDate = new Date(transfer.transfer_date);
        return transferDate.getMonth() === monthIndex;
      });
    }

    // Filter by date range
    if (selectedDateRange !== 'All Time') {
      const today = new Date();
      let cutoffDate: Date;

      switch (selectedDateRange) {
        case 'Last 7 days':
          cutoffDate = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
          break;
        case 'Last 30 days':
          cutoffDate = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
          break;
        case 'Last 3 months':
          cutoffDate = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));
          break;
        case 'This year':
          cutoffDate = new Date(today.getFullYear(), 0, 1);
          break;
        default:
          cutoffDate = new Date(0);
      }
      
      filtered = filtered.filter(transfer => 
        new Date(transfer.transfer_date) >= cutoffDate
      );
    }

    setFilteredTransfers(filtered);
  };

  const getSummaryData = () => {
    const today = new Date().toISOString().split('T')[0];
    const todaysTransfers = filteredTransfers.filter(transfer => 
      transfer.transfer_date === today
    );
    const totalAmount = filteredTransfers.reduce((sum, transfer) => sum + transfer.amount, 0);

    return {
      todaysCount: todaysTransfers.length,
      totalAmount: totalAmount
    };
  };

  const calculateConvertedAmount = (amount: string, currency: Currency) => {
    if (!amount || !currency) return '';

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '';

    const currentRate = exchangeRates.find(rate => 
      rate.from_currency === currency && rate.to_currency === (currency === 'USD' ? 'CDF' : 'USD')
    );

    if (currentRate) {
      const converted = currency === 'USD' 
        ? numAmount * currentRate.rate 
        : numAmount / currentRate.rate;
      return converted.toFixed(2);
    }

    return '';
  };

  const handleSubmit = async () => {
    if (!formData.fromAccount || !formData.toAccount || !formData.amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.fromAccount === formData.toAccount) {
      Alert.alert('Error', 'From and To accounts cannot be the same');
      return;
    }

    setLoading(true);
    try {
      const transferData = {
        from_account: formData.fromAccount,
        to_account: formData.toAccount,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        exchange_rate: formData.exchangeRate ? parseFloat(formData.exchangeRate) : undefined,
        converted_amount: formData.convertedAmount ? parseFloat(formData.convertedAmount) : undefined,
        purpose: formData.purpose || undefined,
        transfer_date: new Date().toISOString().split('T')[0],
        created_by: appUser?.id || '',
        station: formData.station || 'Station 1'
      };

      if (selectedTransfer) {
        // Update existing transfer
        const response = await fundTransferService.updateFundTransfer(selectedTransfer.id, transferData);
        
        if (response.success) {
          Alert.alert('Success', 'Transfer updated successfully');
          setShowEditModal(false);
          setSelectedTransfer(null);
          fetchTransfers();
        } else {
          Alert.alert('Error', response.error || 'Failed to update transfer');
        }
      } else {
        // Create new transfer
        const response = await fundTransferService.createFundTransfer(transferData);
        
        if (response.success) {
          Alert.alert('Success', 'Transfer created successfully');
          setShowAddModal(false);
          fetchTransfers();
        } else {
          Alert.alert('Error', response.error || 'Failed to create transfer');
        }
      }

      resetForm();
    } catch (error) {
      console.error('Error submitting transfer:', error);
      Alert.alert('Error', 'An error occurred while processing the transfer');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (transfer: FundTransfer) => {
    Alert.alert(
      'Delete Transfer',
      'Are you sure you want to delete this transfer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fundTransferService.deleteFundTransfer(transfer.id);
              
              if (response.success) {
                Alert.alert('Success', 'Transfer deleted successfully');
                fetchTransfers();
              } else {
                Alert.alert('Error', response.error || 'Failed to delete transfer');
              }
            } catch (error) {
              console.error('Error deleting transfer:', error);
              Alert.alert('Error', 'An error occurred while deleting the transfer');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      fromAccount: '',
      toAccount: '',
      amount: '',
      currency: 'USD',
      exchangeRate: '',
      convertedAmount: '',
      purpose: '',
      station: '',
    });
  };

  const openEditModal = (transfer: FundTransfer) => {
    setSelectedTransfer(transfer);
    setFormData({
      fromAccount: transfer.from_account,
      toAccount: transfer.to_account,
      amount: transfer.amount.toString(),
      currency: transfer.currency,
      exchangeRate: transfer.exchange_rate?.toString() || '',
      convertedAmount: transfer.converted_amount?.toString() || '',
      purpose: transfer.purpose || '',
      station: transfer.station || '',
    });
    setShowEditModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderTransferItem = ({ item }: { item: FundTransfer }) => (
    <View style={styles.transferItem}>
      <View style={styles.transferHeader}>
        <Text style={styles.transferDate}>{formatDate(item.transfer_date)}</Text>
        <Text style={styles.transferStation}>{item.station}</Text>
      </View>
      
      <View style={styles.transferDetails}>
        <Text style={styles.transferAccount}>
          {item.from_account} → {item.to_account}
        </Text>
        <Text style={styles.transferAmount}>${item.amount.toLocaleString()}</Text>
      </View>
      
      {item.converted_amount && (
        <Text style={styles.convertedAmount}>
          CDF {item.converted_amount.toLocaleString()}
        </Text>
      )}
      
      {item.purpose && (
        <Text style={styles.transferPurpose}>{item.purpose}</Text>
      )}
      
      <View style={styles.transferActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="pencil" size={16} color="#FFFFFF" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash" size={16} color="#FFFFFF" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderModal = () => (
    <Modal
      visible={showAddModal || showEditModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedTransfer ? 'Edit Transfer' : 'New Transfer'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setSelectedTransfer(null);
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Station Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Station *</Text>
              <View style={styles.stationButtons}>
                {stations.map((station) => (
                  <TouchableOpacity
                    key={station.id}
                    style={[
                      styles.stationButton,
                      formData.station === station.station_name && styles.stationButtonSelected
                    ]}
                    onPress={() => setFormData({ ...formData, station: station.station_name })}
                  >
                    <Text style={[
                      styles.stationButtonText,
                      formData.station === station.station_name && styles.stationButtonTextSelected
                    ]}>
                      {station.station_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* From Account */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>From Account *</Text>
              <View style={styles.accountButtons}>
                {accounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.accountButton,
                      formData.fromAccount === account.account_name && styles.accountButtonSelected
                    ]}
                    onPress={() => setFormData({ ...formData, fromAccount: account.account_name })}
                  >
                    <Text style={[
                      styles.accountButtonText,
                      formData.fromAccount === account.account_name && styles.accountButtonTextSelected
                    ]}>
                      {account.account_name}
                    </Text>
                    <Text style={styles.accountBalance}>
                      ${account.balance.toLocaleString()} {account.currency}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* To Account */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>To Account *</Text>
              <View style={styles.accountButtons}>
                {accounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.accountButton,
                      formData.toAccount === account.account_name && styles.accountButtonSelected
                    ]}
                    onPress={() => setFormData({ ...formData, toAccount: account.account_name })}
                  >
                    <Text style={[
                      styles.accountButtonText,
                      formData.toAccount === account.account_name && styles.accountButtonTextSelected
                    ]}>
                      {account.account_name}
                    </Text>
                    <Text style={styles.accountBalance}>
                      ${account.balance.toLocaleString()} {account.currency}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Amount and Currency */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount *</Text>
              <View style={styles.amountRow}>
                <TextInput
                  style={styles.amountInput}
                  value={formData.amount}
                  onChangeText={(text) => {
                    setFormData({ ...formData, amount: text });
                    const converted = calculateConvertedAmount(text, formData.currency);
                    setFormData(prev => ({ ...prev, convertedAmount: converted }));
                  }}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
                <View style={styles.currencyButtons}>
                  {currencies.map((currency) => (
                    <TouchableOpacity
                      key={currency}
                      style={[
                        styles.currencyButton,
                        formData.currency === currency && styles.currencyButtonSelected
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, currency });
                        const converted = calculateConvertedAmount(formData.amount, currency);
                        setFormData(prev => ({ ...prev, convertedAmount: converted }));
                      }}
                    >
                      <Text style={[
                        styles.currencyButtonText,
                        formData.currency === currency && styles.currencyButtonTextSelected
                      ]}>
                        {currency}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Converted Amount Display */}
            {formData.convertedAmount && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Converted Amount</Text>
                <Text style={styles.convertedAmountDisplay}>
                  {formData.currency === 'USD' ? 'CDF' : 'USD'} {formData.convertedAmount}
                </Text>
              </View>
            )}

            {/* Purpose */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Purpose</Text>
              <TextInput
                style={styles.purposeInput}
                value={formData.purpose}
                onChangeText={(text) => setFormData({ ...formData, purpose: text })}
                placeholder="Enter transfer purpose..."
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                setSelectedTransfer(null);
                resetForm();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Processing...' : (selectedTransfer ? 'Update Transfer' : 'Create Transfer')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const summaryData = getSummaryData();

  return (
    <LinearGradient
      colors={['#4A148C', '#7B1FA2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Funds Transfer</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Summary Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>Today's Transfers</Text>
                <Text style={styles.summaryCardValue}>{summaryData.todaysCount}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>Total Amount</Text>
                <Text style={styles.summaryCardValue}>${summaryData.totalAmount.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* Filters Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Filters</Text>
            <View style={styles.filtersContainer}>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowStationFilter(!showStationFilter)}
              >
                <Ionicons name="business" size={16} color="#FFFFFF" />
                <Text style={styles.filterButtonText}>{selectedStation}</Text>
                <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowDateRangeFilter(!showDateRangeFilter)}
              >
                <Ionicons name="calendar" size={16} color="#FFFFFF" />
                <Text style={styles.filterButtonText}>{selectedDateRange}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowMonthFilter(!showMonthFilter)}
              >
                <Ionicons name="calendar" size={16} color="#FFFFFF" />
                <Text style={styles.filterButtonText}>{selectedMonth}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Transfer History Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transfer History</Text>
            <FlatList
              data={filteredTransfers}
              renderItem={renderTransferItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          </View>
        </ScrollView>

        {/* New Transfer Button */}
        <TouchableOpacity
          style={styles.initiateButton}
          onPress={() => navigation.navigate('NewTransfer')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.initiateButtonText}>New Transfer</Text>
        </TouchableOpacity>

        {/* Filter Modals */}
        {showStationFilter && (
          <Modal transparent visible={showStationFilter}>
            <TouchableOpacity
              style={styles.modalOverlay}
              onPress={() => setShowStationFilter(false)}
            >
              <View style={styles.filterModal}>
                {['All Stations', ...stations.map(s => s.station_name)].map((station) => (
                  <TouchableOpacity
                    key={station}
                    style={styles.filterOption}
                    onPress={() => {
                      setSelectedStation(station);
                      setShowStationFilter(false);
                    }}
                  >
                    <Text style={styles.filterOptionText}>{station}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {showDateRangeFilter && (
          <Modal transparent visible={showDateRangeFilter}>
            <TouchableOpacity
              style={styles.modalOverlay}
              onPress={() => setShowDateRangeFilter(false)}
            >
              <View style={styles.filterModal}>
                {dateRanges.map((range) => (
                  <TouchableOpacity
                    key={range}
                    style={styles.filterOption}
                    onPress={() => {
                      setSelectedDateRange(range);
                      setShowDateRangeFilter(false);
                    }}
                  >
                    <Text style={styles.filterOptionText}>{range}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {showMonthFilter && (
          <Modal transparent visible={showMonthFilter}>
            <TouchableOpacity
              style={styles.modalOverlay}
              onPress={() => setShowMonthFilter(false)}
            >
              <View style={styles.filterModal}>
                {months.map((month) => (
                  <TouchableOpacity
                    key={month}
                    style={styles.filterOption}
                    onPress={() => {
                      setSelectedMonth(month);
                      setShowMonthFilter(false);
                    }}
                  >
                    <Text style={styles.filterOptionText}>{month}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {renderModal()}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    flex: 1,
    marginHorizontal: 5,
  },
  summaryCardTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 5,
  },
  summaryCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginHorizontal: 5,
    flex: 1,
  },
  transferItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transferDate: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  transferStation: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  transferDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  transferAccount: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  transferAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  convertedAmount: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
    marginBottom: 5,
  },
  transferPurpose: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 10,
  },
  transferActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
  },
  initiateButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  initiateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  stationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  stationButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  stationButtonSelected: {
    backgroundColor: '#FF6B35',
  },
  stationButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  stationButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  accountButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  accountButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 120,
  },
  accountButtonSelected: {
    backgroundColor: '#4CAF50',
  },
  accountButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  accountButtonTextSelected: {
    color: '#FFFFFF',
  },
  accountBalance: {
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.7,
    marginTop: 2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  currencyButtons: {
    flexDirection: 'row',
  },
  currencyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 4,
  },
  currencyButtonSelected: {
    backgroundColor: '#FF6B35',
  },
  currencyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  currencyButtonTextSelected: {
    color: '#FFFFFF',
  },
  convertedAmountDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  purposeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flex: 1,
    marginLeft: 10,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  filterModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 10,
    minWidth: 200,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});