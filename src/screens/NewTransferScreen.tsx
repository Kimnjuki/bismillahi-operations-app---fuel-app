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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { generateUUID } from '../utils/uuid';
import { FundTransfer, Currency } from '../types';
import { supabase } from '../config/supabase';
import { fundTransferService } from '../services/fundTransferService';
import { internalAccountService, InternalAccount, Station } from '../services/internalAccountService';

const { width } = Dimensions.get('window');

interface TransferFormData {
  fromAccount: string;
  toAccount: string;
  amount: string;
  exchangeRate: string;
  date: string;
  formattedDate: string;
  class: string;
  memo: string;
  fromCurrency: Currency;
  toCurrency: Currency;
}

interface ExchangeRateRecord {
  id: string;
  from_currency: Currency;
  to_currency: Currency;
  rate: number;
  effective_date: string;
}

// Generate date list (last 30 days)
const generateDateOptions = () => {
  const options: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    options.push(d.toISOString().split('T')[0]);
  }
  return options;
};

const formatDisplayDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatCurrencyDisplay = (amount: number, currency: Currency): string => {
  if (currency === 'USD') {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `CDF ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function NewTransferScreen({ navigation }: any) {
  const { appUser } = useAuth();
  const [accounts, setAccounts] = useState<InternalAccount[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateRecord[]>([]);
  const [dateOptions] = useState<string[]>(generateDateOptions());
  
  // Modal states
  const [showFromAccountModal, setShowFromAccountModal] = useState(false);
  const [showToAccountModal, setShowToAccountModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

  // Form data
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState<TransferFormData>({
    fromAccount: '',
    toAccount: '',
    amount: '',
    exchangeRate: '',
    date: todayStr,
    formattedDate: formatDisplayDate(todayStr),
    class: '',
    memo: '',
    fromCurrency: 'USD',
    toCurrency: 'CDF',
  });

  // Transfer classes
  const transferClasses = [
    'Business Operations',
    'Fuel Purchase',
    'Equipment Maintenance',
    'Staff Payments',
    'Utilities',
    'Emergency Funds',
    'Investment',
    'Other',
  ];

  useEffect(() => {
    fetchAccounts();
    fetchStations();
    fetchExchangeRates();
  }, []);

  // When date changes, fetch exchange rate for that date
  useEffect(() => {
    const rate = getExchangeRateForDate(formData.date);
    if (rate) {
      setFormData(prev => ({ ...prev, exchangeRate: rate.toString() }));
    }
  }, [formData.date]);

  const fetchAccounts = async () => {
    try {
      const response = await internalAccountService.getInternalAccounts();
      if (response.success && response.data) {
        setAccounts(response.data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchStations = async () => {
    try {
      const response = await internalAccountService.getStations();
      if (response.success && response.data) {
        setStations(response.data);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('effective_date', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setExchangeRates(data as ExchangeRateRecord[]);
        
        // Set today's rate
        const todayRate = data.find(r => 
          r.effective_date === todayStr && 
          ((r.from_currency === 'USD' && r.to_currency === 'CDF') ||
           (r.from_currency === 'CDF' && r.to_currency === 'USD'))
        );
        if (todayRate) {
          const rate = todayRate.from_currency === 'USD' 
            ? todayRate.rate.toString() 
            : (1 / todayRate.rate).toString();
          setFormData(prev => ({ ...prev, exchangeRate: rate }));
        } else if (data.length > 0) {
          // Use most recent rate
          const latestUsdRate = data.find(r => r.from_currency === 'USD' && r.to_currency === 'CDF');
          if (latestUsdRate) {
            setFormData(prev => ({ ...prev, exchangeRate: latestUsdRate.rate.toString() }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      // Fallback to a default rate
      setFormData(prev => ({ ...prev, exchangeRate: '2800.50' }));
    }
  };

  const getExchangeRateForDate = (dateStr: string): number | null => {
    // First try to find an exact rate for that date
    const dateRates = exchangeRates.filter(r => r.effective_date === dateStr);
    
    // Find USD -> CDF rate
    const usdToCdf = dateRates.find(r => r.from_currency === 'USD' && r.to_currency === 'CDF');
    if (usdToCdf) return usdToCdf.rate;
    
    // Find CDF -> USD rate
    const cdfToUsd = dateRates.find(r => r.from_currency === 'CDF' && r.to_currency === 'USD');
    if (cdfToUsd) return 1 / cdfToUsd.rate;

    // Fallback: find the closest rate before this date
    const sortedRates = [...exchangeRates]
      .filter(r => r.from_currency === 'USD' && r.to_currency === 'CDF')
      .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());
    
    for (const rate of sortedRates) {
      if (rate.effective_date <= dateStr) {
        return rate.rate;
      }
    }

    return null;
  };

  const calculateConvertedAmount = () => {
    const amount = parseFloat(formData.amount) || 0;
    const rate = parseFloat(formData.exchangeRate) || 1;
    
    // If from USD to CDF: multiply
    if (formData.fromCurrency === 'USD' && formData.toCurrency === 'CDF') {
      return (amount * rate).toFixed(2);
    } 
    // If from CDF to USD: divide
    else if (formData.fromCurrency === 'CDF' && formData.toCurrency === 'USD') {
      return (amount / rate).toFixed(2);
    }
    return amount.toFixed(2);
  };

  const getSelectedFromAccount = () => {
    return accounts.find(acc => acc.account_name === formData.fromAccount);
  };

  const getSelectedToAccount = () => {
    return accounts.find(acc => acc.account_name === formData.toAccount);
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

    const fromAccount = getSelectedFromAccount();
    const toAccount = getSelectedToAccount();

    if (!fromAccount || !toAccount) {
      Alert.alert('Error', 'Please select valid accounts');
      return;
    }

    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amountNum > fromAccount.balance) {
      Alert.alert('Error', 'Insufficient balance in the selected account');
      return;
    }

    setLoading(true);

    try {
      const transferData: Omit<FundTransfer, 'id' | 'created_at' | 'updated_at'> = {
        from_account: formData.fromAccount,
        to_account: formData.toAccount,
        amount: amountNum,
        currency: formData.fromCurrency,
        exchange_rate: parseFloat(formData.exchangeRate),
        converted_amount: parseFloat(calculateConvertedAmount()),
        purpose: formData.memo || formData.class || 'Fund transfer',
        transfer_date: formData.date,
        created_by: appUser?.id || '',
        station: fromAccount.station_name,
      };

      const response = await fundTransferService.createFundTransfer(transferData);

      if (response.success) {
        const converted = calculateConvertedAmount();
        Alert.alert(
          'Success',
          `Transfer of ${formatCurrencyDisplay(amountNum, formData.fromCurrency)} → ${formatCurrencyDisplay(parseFloat(converted), formData.toCurrency)}\nExchange Rate: ${formData.exchangeRate}\nDate: ${formData.formattedDate}`,
          [
            {
              text: 'OK',
              onPress: () => {
                resetForm();
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to create transfer');
      }
    } catch (error) {
      console.error('Error creating transfer:', error);
      Alert.alert('Error', 'An error occurred while creating the transfer');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setFormData({
      fromAccount: '',
      toAccount: '',
      amount: '',
      exchangeRate: '2800.50',
      date: todayStr,
      formattedDate: formatDisplayDate(todayStr),
      class: '',
      memo: '',
      fromCurrency: 'USD',
      toCurrency: 'CDF',
    });
  };

  const renderAccountItem = (account: InternalAccount, isFrom: boolean) => (
    <TouchableOpacity
      style={styles.accountItem}
      onPress={() => {
        if (isFrom) {
          setFormData({ ...formData, fromAccount: account.account_name, fromCurrency: account.currency });
          setShowFromAccountModal(false);
        } else {
          setFormData({ ...formData, toAccount: account.account_name, toCurrency: account.currency });
          setShowToAccountModal(false);
        }
      }}
    >
      <View style={styles.accountInfo}>
        <Text style={styles.accountName}>{account.account_name}</Text>
        <Text style={styles.accountDetails}>
          {account.station_name} • {formatCurrencyDisplay(account.balance, account.currency)}
        </Text>
      </View>
      <Text style={styles.accountType}>{account.account_type}</Text>
    </TouchableOpacity>
  );

  const renderClassItem = (transferClass: string) => (
    <TouchableOpacity
      style={styles.classItem}
      onPress={() => {
        setFormData({ ...formData, class: transferClass });
        setShowClassModal(false);
      }}
    >
      <Text style={styles.classText}>{transferClass}</Text>
    </TouchableOpacity>
  );

  const renderDateItem = (dateStr: string) => (
    <TouchableOpacity
      key={dateStr}
      style={[styles.dateItem, formData.date === dateStr && styles.dateItemSelected]}
      onPress={() => {
        const rate = getExchangeRateForDate(dateStr);
        setFormData({
          ...formData,
          date: dateStr,
          formattedDate: formatDisplayDate(dateStr),
          exchangeRate: rate ? rate.toString() : formData.exchangeRate,
        });
        setShowDateModal(false);
      }}
    >
      <View style={styles.dateItemContent}>
        <Text style={[styles.dateItemText, formData.date === dateStr && styles.dateItemTextSelected]}>
          {formatDisplayDate(dateStr)}
        </Text>
        {formData.date === dateStr && (
          <Ionicons name="checkmark-circle" size={20} color="#F0C38E" />
        )}
      </View>
      {(() => {
        const rate = getExchangeRateForDate(dateStr);
        return rate ? (
          <Text style={styles.dateRateText}>
            1 USD = {rate.toFixed(2)} CDF
          </Text>
        ) : (
          <Text style={styles.dateRateText}>No rate set</Text>
        );
      })()}
    </TouchableOpacity>
  );

  const convertedAmount = calculateConvertedAmount();
  const amountNum = parseFloat(formData.amount) || 0;

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transfer Funds</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Exchange Rate Banner */}
          <View style={styles.rateBanner}>
            <Ionicons name="information-circle" size={18} color="#F0C38E" />
            <Text style={styles.rateBannerText}>
              Exchange rate: 1 USD = {parseFloat(formData.exchangeRate || '0').toFixed(2)} CDF
            </Text>
          </View>

          {/* From Account */}
          <View style={styles.section}>
            <Text style={styles.label}>From Account *</Text>
            <TouchableOpacity
              style={[styles.inputField, formData.fromAccount ? styles.inputFieldSelected : null]}
              onPress={() => setShowFromAccountModal(true)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputText, !formData.fromAccount && styles.inputPlaceholder]}>
                  {formData.fromAccount || 'Select account to transfer FROM'}
                </Text>
                {formData.fromAccount && (
                  <Text style={styles.fieldHint}>
                    Balance: {getSelectedFromAccount() ? formatCurrencyDisplay(getSelectedFromAccount()!.balance, getSelectedFromAccount()!.currency) : 'N/A'}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* To Account */}
          <View style={styles.section}>
            <Text style={styles.label}>To Account *</Text>
            <TouchableOpacity
              style={[styles.inputField, formData.toAccount ? styles.inputFieldSelected : null]}
              onPress={() => setShowToAccountModal(true)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputText, !formData.toAccount && styles.inputPlaceholder]}>
                  {formData.toAccount || 'Select account to transfer TO'}
                </Text>
                {formData.toAccount && (
                  <Text style={styles.fieldHint}>
                    Balance: {getSelectedToAccount() ? formatCurrencyDisplay(getSelectedToAccount()!.balance, getSelectedToAccount()!.currency) : 'N/A'}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Amount (in USD/CDF) */}
          <View style={styles.section}>
            <Text style={styles.label}>Amount ({formData.fromCurrency}) *</Text>
            <TextInput
              style={[styles.inputField, styles.textInputStyle]}
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text })}
              placeholder={`Enter amount in ${formData.fromCurrency}`}
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
          </View>

          {/* Converted Amount Display */}
          {amountNum > 0 && (
            <View style={styles.convertedDisplay}>
              <View style={styles.convertedRow}>
                <Text style={styles.convertedLabel}>Amount to transfer:</Text>
                <Text style={styles.convertedValue}>
                  {formatCurrencyDisplay(amountNum, formData.fromCurrency)}
                </Text>
              </View>
              <View style={styles.convertedDivider} />
              <View style={styles.convertedRow}>
                <Text style={styles.convertedLabel}>Equivalent ({formData.toCurrency}):</Text>
                <Text style={styles.convertedValuePrimary}>
                  {formatCurrencyDisplay(parseFloat(convertedAmount), formData.toCurrency)}
                </Text>
              </View>
              <View style={styles.convertedDivider} />
              <View style={styles.convertedRow}>
                <Text style={styles.convertedLabel}>Exchange Rate:</Text>
                <Text style={styles.convertedRate}>
                  1 {formData.fromCurrency} = {parseFloat(formData.exchangeRate || '0').toFixed(2)} {formData.toCurrency}
                </Text>
              </View>
            </View>
          )}

          {/* Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Transfer Date *</Text>
            <TouchableOpacity
              style={styles.inputField}
              onPress={() => setShowDateModal(true)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.inputText}>{formData.formattedDate}</Text>
                {formData.exchangeRate && (
                  <Text style={styles.fieldHint}>
                    Rate: 1 USD = {parseFloat(formData.exchangeRate).toFixed(2)} CDF
                  </Text>
                )}
              </View>
              <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Currency Switcher */}
          <View style={styles.section}>
            <Text style={styles.label}>Currency Pair</Text>
            <View style={styles.currencyPairRow}>
              <TouchableOpacity
                style={[styles.currencyButton, formData.fromCurrency === 'USD' && styles.currencyButtonActive]}
                onPress={() => {
                  const newFrom: Currency = 'USD';
                  const newTo: Currency = 'CDF';
                  setFormData({ ...formData, fromCurrency: newFrom, toCurrency: newTo });
                }}
              >
                <Text style={[styles.currencyButtonText, formData.fromCurrency === 'USD' && styles.currencyButtonTextActive]}>USD</Text>
              </TouchableOpacity>
              <Ionicons name="arrow-forward" size={20} color="#F0C38E" style={{ marginHorizontal: 10 }} />
              <TouchableOpacity
                style={[styles.currencyButton, formData.toCurrency === 'CDF' && styles.currencyButtonActive]}
              >
                <Text style={[styles.currencyButtonText, formData.toCurrency === 'CDF' && styles.currencyButtonTextActive]}>CDF</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Class (Optional) */}
          <View style={styles.section}>
            <Text style={styles.label}>Class (Optional)</Text>
            <TouchableOpacity
              style={styles.inputField}
              onPress={() => setShowClassModal(true)}
            >
              <Text style={[styles.inputText, !formData.class && styles.inputPlaceholder]}>
                {formData.class || 'Select transfer class'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Memo (Optional) */}
          <View style={styles.section}>
            <Text style={styles.label}>Memo (Optional)</Text>
            <View style={[styles.inputField, styles.memoField]}>
              <TextInput
                style={[styles.textInput, styles.memoInput]}
                value={formData.memo}
                onChangeText={(text) => setFormData({ ...formData, memo: text })}
                placeholder="Add a note or description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Spacer for buttons */}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.transferButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.transferButtonText}>
              {loading ? 'Processing...' : 'Transfer'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* From Account Modal */}
        <Modal
          visible={showFromAccountModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select From Account</Text>
                <TouchableOpacity onPress={() => setShowFromAccountModal(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={accounts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderAccountItem(item, true)}
                style={styles.modalList}
              />
            </View>
          </View>
        </Modal>

        {/* To Account Modal */}
        <Modal
          visible={showToAccountModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select To Account</Text>
                <TouchableOpacity onPress={() => setShowToAccountModal(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={accounts.filter(acc => acc.account_name !== formData.fromAccount)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderAccountItem(item, false)}
                style={styles.modalList}
              />
            </View>
          </View>
        </Modal>

        {/* Date Selection Modal */}
        <Modal
          visible={showDateModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Transfer Date</Text>
                <TouchableOpacity onPress={() => setShowDateModal(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.dateModalHint}>
                The exchange rate for the selected date will be used automatically
              </Text>
              <FlatList
                data={dateOptions}
                keyExtractor={(item) => item}
                renderItem={({ item }) => renderDateItem(item)}
                style={styles.modalList}
              />
            </View>
          </View>
        </Modal>

        {/* Class Modal */}
        <Modal
          visible={showClassModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Class</Text>
                <TouchableOpacity onPress={() => setShowClassModal(false)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={transferClasses}
                keyExtractor={(item) => item}
                renderItem={({ item }) => renderClassItem(item)}
                style={styles.modalList}
              />
            </View>
          </View>
        </Modal>
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
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: '#2D2D54',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputFieldSelected: {
    borderColor: '#F0C38E',
    borderWidth: 1,
  },
  textInputStyle: {
    // Override for TextInput
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    padding: 0,
  },
  memoField: {
    minHeight: 80,
    alignItems: 'flex-start',
  },
  memoInput: {
    textAlignVertical: 'top',
    minHeight: 60,
  },
  inputText: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  inputPlaceholder: {
    color: '#666',
  },
  fieldHint: {
    fontSize: 12,
    color: '#F0C38E',
    marginTop: 4,
  },
  convertedDisplay: {
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#F0C38E',
  },
  convertedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  convertedDivider: {
    height: 1,
    backgroundColor: 'rgba(240, 195, 142, 0.3)',
    marginVertical: 2,
  },
  convertedLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  convertedValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  convertedValuePrimary: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F0C38E',
  },
  convertedRate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4FC3F7',
  },
  rateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 195, 142, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
  },
  rateBannerText: {
    fontSize: 13,
    color: '#F0C38E',
    marginLeft: 8,
    flex: 1,
  },
  currencyPairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D2D54',
    borderRadius: 12,
    padding: 12,
  },
  currencyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  currencyButtonActive: {
    backgroundColor: '#F0C38E',
  },
  currencyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  currencyButtonTextActive: {
    color: '#1a1a2e',
  },
  summaryContainer: {
    backgroundColor: '#2D2D54',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  summaryText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
  },
  boldText: {
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2D2D54',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  transferButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  transferButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D54',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalList: {
    maxHeight: 400,
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D54',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  accountDetails: {
    fontSize: 14,
    color: '#999',
  },
  accountType: {
    fontSize: 12,
    color: '#FF6B35',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    textTransform: 'capitalize',
  },
  classItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D54',
  },
  classText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  dateItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D54',
  },
  dateItemSelected: {
    backgroundColor: 'rgba(240, 195, 142, 0.1)',
  },
  dateItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateItemText: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  dateItemTextSelected: {
    fontWeight: 'bold',
    color: '#F0C38E',
  },
  dateRateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  dateModalHint: {
    fontSize: 13,
    color: '#F0C38E',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D54',
  },
});