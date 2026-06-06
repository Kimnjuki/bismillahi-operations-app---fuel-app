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
import { fundTransferService } from '../services/fundTransferService';
import { internalAccountService, InternalAccount, Station } from '../services/internalAccountService';

const { width } = Dimensions.get('window');

interface TransferFormData {
  fromAccount: string;
  toAccount: string;
  amount: string;
  exchangeRate: string;
  date: string;
  class: string;
  memo: string;
  fromCurrency: Currency;
  toCurrency: Currency;
}

export default function NewTransferScreen({ navigation }: any) {
  const { appUser } = useAuth();
  const [accounts, setAccounts] = useState<InternalAccount[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showFromAccountModal, setShowFromAccountModal] = useState(false);
  const [showToAccountModal, setShowToAccountModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

  // Form data
  const [formData, setFormData] = useState<TransferFormData>({
    fromAccount: '',
    toAccount: '',
    amount: '1000',
    exchangeRate: '2800.50',
    date: new Date().toLocaleDateString('en-US'),
    class: '',
    memo: '',
    fromCurrency: 'CDF',
    toCurrency: 'USD',
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
  }, []);

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

  const calculateConvertedAmount = () => {
    const amount = parseFloat(formData.amount) || 0;
    const rate = parseFloat(formData.exchangeRate) || 1;
    
    if (formData.fromCurrency === 'CDF' && formData.toCurrency === 'USD') {
      return (amount / rate).toFixed(2);
    } else if (formData.fromCurrency === 'USD' && formData.toCurrency === 'CDF') {
      return (amount * rate).toFixed(2);
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

    if (parseFloat(formData.amount) > fromAccount.balance) {
      Alert.alert('Error', 'Insufficient balance in the selected account');
      return;
    }

    setLoading(true);

    try {
      const transferData: Omit<FundTransfer, 'id' | 'created_at' | 'updated_at'> = {
        from_account: formData.fromAccount,
        to_account: formData.toAccount,
        amount: parseFloat(formData.amount),
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
        Alert.alert(
          'Success',
          `Transfer of ${formatCurrency(parseFloat(formData.amount), formData.fromCurrency)} to ${formData.toAccount} completed successfully`,
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
    setFormData({
      fromAccount: '',
      toAccount: '',
      amount: '1000',
      exchangeRate: '2800.50',
      date: new Date().toLocaleDateString('en-US'),
      class: '',
      memo: '',
      fromCurrency: 'CDF',
      toCurrency: 'USD',
    });
  };

  const formatCurrency = (amount: number, currency: Currency): string => {
    const symbol = currency === 'USD' ? '$' : 'CDF';
    return `${symbol}${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US');
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
          {account.station_name} • {formatCurrency(account.balance, account.currency)}
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
          {/* From Account */}
          <View style={styles.section}>
            <Text style={styles.label}>From Account</Text>
            <TouchableOpacity
              style={styles.inputField}
              onPress={() => setShowFromAccountModal(true)}
            >
              <Text style={styles.inputText}>
                {formData.fromAccount || 'Select From Account'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* To Account */}
          <View style={styles.section}>
            <Text style={styles.label}>To Account</Text>
            <TouchableOpacity
              style={styles.inputField}
              onPress={() => setShowToAccountModal(true)}
            >
              <Text style={styles.inputText}>
                {formData.toAccount || 'Select To Account'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.section}>
            <Text style={styles.label}>Amount</Text>
            <View style={styles.inputField}>
              <TextInput
                style={styles.textInput}
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="0"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Exchange Rate */}
          <View style={styles.section}>
            <Text style={[styles.label, styles.orangeLabel]}>Exchange Rate</Text>
            <View style={styles.inputField}>
              <TextInput
                style={styles.textInput}
                value={formData.exchangeRate}
                onChangeText={(text) => setFormData({ ...formData, exchangeRate: text })}
                placeholder="0.00"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Date */}
          <View style={styles.section}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.inputField}
              onPress={() => setShowDateModal(true)}
            >
              <Text style={styles.inputText}>{formData.date}</Text>
              <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Class (Optional) */}
          <View style={styles.section}>
            <Text style={styles.label}>Class (Optional)</Text>
            <TouchableOpacity
              style={styles.inputField}
              onPress={() => setShowClassModal(true)}
            >
              <Text style={styles.inputText}>
                {formData.class || 'Select Class'}
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
                placeholder="Add a note"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Transaction Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              You are transferring{' '}
              <Text style={styles.boldText}>
                {formatCurrency(parseFloat(formData.amount) || 0, formData.fromCurrency)}
              </Text>
              {' → '}
              <Text style={styles.boldText}>
                {formatCurrency(parseFloat(calculateConvertedAmount()), formData.toCurrency)}
              </Text>
              {' at rate '}
              <Text style={styles.boldText}>{formData.exchangeRate}</Text>
            </Text>
          </View>
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
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  orangeLabel: {
    color: '#FF6B35',
  },
  inputField: {
    backgroundColor: '#2D2D54',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memoField: {
    minHeight: 80,
    alignItems: 'flex-start',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    padding: 0,
  },
  memoInput: {
    textAlignVertical: 'top',
    minHeight: 60,
  },
  inputText: {
    fontSize: 16,
    color: '#FFFFFF',
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
});
