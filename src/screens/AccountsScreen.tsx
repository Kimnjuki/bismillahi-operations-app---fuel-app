import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  DatePickerAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { accountService } from '../services/accountService';
import { formatCurrency } from '../constants/currency';
import { AccountSummary, AccountType, AccountReceivable, AccountPayable, AccountTransaction } from '../types';

type AccountTabType = 'stations' | 'operational';

interface StationAccount {
  id: string;
  name: string;
  cdfBalance: number;
  usdBalance: number;
}

interface OperationalAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

export default function AccountsScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<AccountTabType>('stations');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // State for selected account and transactions
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [accountTransactions, setAccountTransactions] = useState<AccountTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // For date filtering
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [cashFlowBalance, setCashFlowBalance] = useState(0);

  // Mock station data based on the image
  const stationAccounts: StationAccount[] = [
    { id: '1', name: 'ISSIRO STATION', cdfBalance: 12345678, usdBalance: 9876 },
    { id: '2', name: 'DURBA STATION', cdfBalance: 5432109, usdBalance: 6543 },
    { id: '3', name: 'DEPOT ISSIRO', cdfBalance: 7890123, usdBalance: 0 }, // Only CDF account
    { id: '4', name: 'RUNGU STATION', cdfBalance: 3210987, usdBalance: 1500 }, // Added USD account
    { id: '5', name: 'DUNGU STATION', cdfBalance: 4567890, usdBalance: 2200 }, // Added USD account
    { id: '6', name: 'NIANGARA STATION', cdfBalance: 1098765, usdBalance: 800 }, // Added USD account
  ];

  // Mock operational accounts data
  const operationalAccounts: OperationalAccount[] = [
    { id: '1', name: 'Main Operations', type: 'Operations Account', balance: 5000000, currency: 'CDF' },
    { id: '2', name: 'Equipment Fund', type: 'Equipment Account', balance: 2500000, currency: 'CDF' },
    { id: '3', name: 'Maintenance Fund', type: 'Maintenance Account', balance: 1500000, currency: 'CDF' },
    { id: '4', name: 'Emergency Fund', type: 'Emergency Account', balance: 3000000, currency: 'CDF' },
    { id: '5', name: 'Marketing Fund', type: 'Marketing Account', balance: 800000, currency: 'CDF' },
    { id: '6', name: 'Staff Fund', type: 'Staff Account', balance: 1200000, currency: 'CDF' },
  ];

  const loadAccountData = useCallback(async () => {
    try {
      setLoading(true);
      // Simulate loading delay - in a real app, this would fetch from API
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error loading account data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleAccountPress = async (account: any) => {
    try {
      setSelectedAccount(account);
      setTransactionsLoading(true);
      
      // In a real app, we would fetch transactions based on account type
      // For now, we'll simulate with mock data
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Generate mock transactions for the selected account
      const mockTransactions: AccountTransaction[] = [];
      const baseAmount = account.cdfBalance > 0 ? account.cdfBalance : account.usdBalance;
      
      // Create some mock transactions
      for (let i = 0; i < 5; i++) {
        const transactionDate = new Date();
        transactionDate.setDate(transactionDate.getDate() - i);
        
        mockTransactions.push({
          id: `txn_${account.id}_${i}`,
          account_id: account.id,
          account_type: account.usdBalance > 0 ? 'receivable' : 'receivable', // Simplified
          transaction_type: i % 2 === 0 ? 'payment' : 'adjustment',
          amount: Math.floor(Math.random() * (baseAmount * 0.1)) + 100,
          currency: account.usdBalance > 0 ? 'USD' : 'CDF',
          transaction_date: transactionDate.toISOString(),
          description: `Transaction ${i + 1} for ${account.name}`,
          reference_number: `REF${Math.floor(Math.random() * 10000)}`,
          created_by: appUser?.user_code || 'system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      setAccountTransactions(mockTransactions);
      
      // Calculate cash flow balance (sum of all transactions)
      const balance = mockTransactions.reduce((sum, txn) => {
        if (txn.transaction_type === 'payment') {
          return sum + txn.amount;
        } else {
          return sum - txn.amount; // Adjustments reduce balance
        }
      }, 0);
      
      setCashFlowBalance(balance);
    } catch (error) {
      console.error('Error loading account transactions:', error);
      Alert.alert('Error', 'Failed to load account transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleDateSelect = async () => {
    try {
      const dateAction = await DatePickerAndroid.open({
        date: new Date(), // default date
      });
      if (dateAction.action !== DatePickerAndroid.dismissedAction) {
        const { year, month, day } = dateAction;
        const selectedDate = new Date(year, month, day).toISOString().split('T')[0];
        setSelectedDate(selectedDate);
        // In a real app, we would filter transactions by this date
      }
    } catch ({ code, message }) {
      console.warn('Cannot open date picker', message);
    }
  };

  const handleCloseModal = () => {
    setSelectedAccount(null);
    setAccountTransactions([]);
    setSelectedDate(null);
    setCashFlowBalance(0);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAccountData();
  }, [loadAccountData]);

  const handleAddNew = () => {
    if (activeTab === 'stations') {
      (navigation as any).navigate('AddAccount', { type: 'station' });
    } else {
      (navigation as any).navigate('AddAccount', { type: 'operational' });
    }
  };

  const handleTabPress = (tab: AccountTabType) => {
    setActiveTab(tab);
  };

  const renderTabButton = (tab: AccountTabType, label: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => handleTabPress(tab)}
    >
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderStationAccountCard = (account: StationAccount) => (
    <TouchableOpacity
      key={account.id}
      style={styles.accountCard}
      onPress={() => handleAccountPress(account)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.accountName}>{account.name}</Text>
        <Ionicons name="chevron-forward" size={20} color="#F0C38E" />
      </View>
      
      <View style={styles.balanceRow}>
        <Text style={styles.balanceLabel}>CDF Account</Text>
        <Text style={styles.balanceAmount}>
          CDF {account.cdfBalance.toLocaleString()}
        </Text>
      </View>
      
      {account.usdBalance > 0 && (
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>USD Account</Text>
          <Text style={styles.balanceAmount}>
            USD {account.usdBalance.toLocaleString()}
          </Text>
        </View>
      )}
      
      <View style={styles.viewTransactionsRow}>
        <Text style={styles.viewTransactionsText}>View Transactions</Text>
        <Ionicons name="list-outline" size={16} color="#F0C38E" />
      </View>
    </TouchableOpacity>
  );

  const renderOperationalAccountCard = (account: OperationalAccount) => (
    <TouchableOpacity
      key={account.id}
      style={styles.accountCard}
      onPress={() => handleAccountPress(account)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.accountName}>{account.name}</Text>
          <Text style={styles.accountType}>{account.type}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#F0C38E" />
      </View>
      <Text style={styles.balanceAmount}>
        {account.currency} {account.balance.toLocaleString()}
      </Text>
      <View style={styles.viewTransactionsRow}>
        <Text style={styles.viewTransactionsText}>View Transactions</Text>
        <Ionicons name="list-outline" size={16} color="#F0C38E" />
      </View>
    </TouchableOpacity>
  );


  const renderTransactionModal = () => {
    return (
      <Modal transparent visible={selectedAccount !== null} animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalCloseButton} onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                Transactions for {selectedAccount.name}
              </Text>
              <View style={styles.modalSpacer} />
            </View>
            
            {/* Date Filter */}
            <View style={styles.dateFilterContainer}>
              <Text style={styles.dateFilterLabel}>Filter by Date:</Text>
              <View style={styles.dateFilterInput}>
                <Text style={styles.dateFilterText}>
                  {selectedDate ? 
                    new Date(selectedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 
                    'All Dates'
                  }
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#F0C38E" />
              </View>
              <TouchableOpacity style={styles.dateFilterButton} onPress={handleDateSelect}>
                <Text style={styles.dateFilterButtonText}>Select Date</Text>
              </TouchableOpacity>
            </View>
            
            {/* Cash Flow Balance */}
            <View style={styles.cashFlowContainer}>
              <Text style={styles.cashFlowLabel}>Cash Flow Balance:</Text>
              <Text style={styles.cashFlowAmount}>
                {selectedAccount.usdBalance > 0 ? 'USD' : 'CDF'} 
                {Math.abs(cashFlowBalance).toLocaleString()}
                {cashFlowBalance >= 0 ? '(Positive)' : '(Negative)'}
              </Text>
            </View>
            
            {/* Transactions List */}
            <View style={styles.transactionsListContainer}>
              {transactionsLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading transactions...</Text>
                </View>
              ) : accountTransactions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
                  <Text style={styles.emptyText}>No transactions found</Text>
                </View>
              ) : (
                <FlashList
                  data={accountTransactions}
                  renderItem={renderTransactionItem}
                  estimatedItemSize={100}
                  contentContainerStyle={styles.flashListContent}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Memoized transaction item component for performance
  const TransactionItem = React.memo(({ 
    transaction, 
  }: { 
    transaction: AccountTransaction; 
  }) => {
    const getTransactionTypeColor = (type: 'payment' | 'adjustment' | 'refund') => {
      switch (type) {
        case 'payment':
          return '#4CAF50'; // Green
        case 'adjustment':
          return '#FF9800'; // Orange
        case 'refund':
          return '#2196F3'; // Blue
        default:
          return '#9E9E9E'; // Grey
      }
    };

    const getTransactionTypeText = (type: 'payment' | 'adjustment' | 'refund') => {
      switch (type) {
        case 'payment':
          return 'Payment';
        case 'adjustment':
          return 'Adjustment';
        case 'refund':
          return 'Refund';
        default:
          return type;
      }
    };

    const getTransactionIcon = (type: 'payment' | 'adjustment' | 'refund') => {
      switch (type) {
        case 'payment':
          return 'receipt';
        case 'adjustment':
          return 'create';
        case 'refund':
          return 'return-up';
        default:
          return 'document';
      }
    };

    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <View style={styles.transactionTypeContainer}>
              <View style={[
                styles.transactionTypeBadge,
                { backgroundColor: getTransactionTypeColor(transaction.transaction_type as any) }
              ]}>
                <Ionicons 
                  name={getTransactionIcon(transaction.transaction_type as any)} 
                  size={16} 
                  color="#ffffff" 
                />
                <Text style={styles.transactionTypeText}>
                  {getTransactionTypeText(transaction.transaction_type as any)}
                </Text>
              </View>
            </View>
            <Text style={styles.transactionDate}>
              {new Date(transaction.transaction_date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.transactionAmount}>
            <Text style={styles.amountText}>
              {transaction.currency} {transaction.amount.toLocaleString()}
            </Text>
          </View>
        </View>
        
        <View style={styles.transactionDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Description:</Text>
            <Text style={styles.detailValue}>{transaction.description}</Text>
          </View>
          
          {transaction.reference_number && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference:</Text>
              <Text style={styles.detailValue}>{transaction.reference_number}</Text>
            </View>
          )}
        </View>
      </View>
    );
  });

  const renderTransactionItem = useCallback(({ item }: { item: AccountTransaction }) => (
    <TransactionItem transaction={item} />
  ), []);

  const renderContent = () => {
    // If an account is selected, show the transaction modal
    if (selectedAccount) {
      return renderTransactionModal();
    }
    
    return (
      <ScrollView 
        style={styles.contentList} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F0C38E"
            colors={['#F0C38E']}
          />
        }
      >
        {activeTab === 'stations' 
          ? stationAccounts.map(renderStationAccountCard)
          : operationalAccounts.map(renderOperationalAccountCard)
        }
      </ScrollView>
    );
  };
  
  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  return (
    <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Accounts</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {renderTabButton('stations', 'Station Accounts')}
          {renderTabButton('operational', 'Operational Accounts')}
        </View>

        {/* Content */}
        {renderContent()}

        {/* Add New Account Button */}
        <View style={styles.addButtonContainer}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
            <Ionicons name="add" size={20} color="#312C51" />
            <Text style={styles.addButtonText}>Add New Account</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSpacer: {
    width: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: '#F0C38E',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  activeTabText: {
    color: '#312C51',
    fontWeight: 'bold',
  },
  contentList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  accountCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  accountName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  accountType: {
    fontSize: 14,
    color: '#F0C38E',
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#F0C38E',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0C38E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#312C51',
    marginLeft: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewTransactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewTransactionsText: {
    fontSize: 13,
    color: '#F0C38E',
    fontWeight: '600',
    marginRight: 6,
  },
  
  // Transaction Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#312C51',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalSpacer: {
    width: 24,
  },
  dateFilterContainer: {
    marginBottom: 16,
  },
  dateFilterLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  dateFilterInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateFilterText: {
    fontSize: 16,
    color: '#ffffff',
  },
  dateFilterButton: {
    backgroundColor: '#F0C38E',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dateFilterButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#312C51',
  },
  cashFlowContainer: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  cashFlowLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  cashFlowAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  transactionsListContainer: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  flashListContent: {
    flexGrow: 1,
  },
  // Transaction List Styles
  transactionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTypeContainer: {
    marginBottom: 8,
  },
  transactionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  transactionTypeText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F0C38E',
  },
  transactionDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  detailValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
});
