import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { accountService } from '../services/accountService';
import { formatCurrency } from '../constants/currency';
import { AccountPayable, AccountTransaction, AccountStatus } from '../types';

export default function AccountPayablesHistoryScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountPayable | null>(null);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Sample data for payables (debtors)
  const samplePayables: AccountPayable[] = [
    {
      id: '1',
      debtor_name: 'Debtor A',
      debtor_code: 'DBT001',
      total_amount: 2000000,
      currency: 'CDF',
      due_date: '2024-07-18',
      status: 'pending',
      description: 'Fuel delivery payment',
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      debtor_name: 'Debtor B',
      debtor_code: 'DBT002',
      total_amount: 1500,
      currency: 'USD',
      due_date: '2024-07-22',
      status: 'overdue',
      description: 'Service charges',
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      debtor_name: 'Debtor C',
      debtor_code: 'DBT003',
      total_amount: 4000000,
      currency: 'CDF',
      due_date: '2024-07-28',
      status: 'paid',
      description: 'Equipment purchase',
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '4',
      debtor_name: 'Debtor D',
      debtor_code: 'DBT004',
      total_amount: 800000,
      currency: 'CDF',
      due_date: '2024-06-25',
      status: 'partial',
      description: 'Previous service payment',
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const sampleTransactions: AccountTransaction[] = [
    {
      id: '1',
      account_id: '3',
      account_type: 'payable',
      transaction_type: 'payment',
      amount: 4000000,
      currency: 'CDF',
      transaction_date: '2024-07-25',
      description: 'Full payment made',
      reference_number: 'PAY-004',
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      account_id: '4',
      account_type: 'payable',
      transaction_type: 'payment',
      amount: 400000,
      currency: 'CDF',
      transaction_date: '2024-07-10',
      description: 'Partial payment made',
      reference_number: 'PAY-005',
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      account_id: '4',
      account_type: 'payable',
      transaction_type: 'payment',
      amount: 200000,
      currency: 'CDF',
      transaction_date: '2024-06-20',
      description: 'Initial payment made',
      reference_number: 'PAY-006',
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
    },
  ];

  const loadPayables = useCallback(async () => {
    try {
      setLoading(true);
      const response = await accountService.getAccountPayables();
      
      if (response.success && response.data && response.data.length > 0) {
        setPayables(response.data);
      } else {
        // Use sample data if no real data
        setPayables(samplePayables);
      }
    } catch (error) {
      console.error('Error loading payables:', error);
      // Use sample data on error
      setPayables(samplePayables);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [samplePayables]);

  const loadTransactions = useCallback(async (accountId: string) => {
    try {
      const response = await accountService.getAccountTransactions(accountId, 'payable');
      
      if (response.success && response.data) {
        setTransactions(response.data);
      } else {
        // Use sample data if no real data
        setTransactions(sampleTransactions.filter(t => t.account_id === accountId));
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      // Use sample data on error
      setTransactions(sampleTransactions.filter(t => t.account_id === accountId));
    }
  }, [sampleTransactions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPayables();
  }, [loadPayables]);

  const handleAccountPress = (account: AccountPayable) => {
    setSelectedAccount(account);
    loadTransactions(account.id);
  };

  const handleBackToAccounts = () => {
    setSelectedAccount(null);
    setTransactions([]);
  };

  const handleAddNew = () => {
    (navigation as any).navigate('AddAccount', { type: 'payable' });
  };

  const getStatusColor = (status: AccountStatus) => {
    switch (status) {
      case 'overdue':
        return '#FF6B35';
      case 'pending':
        return '#FFA726';
      case 'paid':
        return '#4CAF50';
      case 'partial':
        return '#2196F3';
      case 'cancelled':
        return '#9E9E9E';
      default:
        return '#ffffff';
    }
  };

  const getStatusText = (status: AccountStatus) => {
    switch (status) {
      case 'overdue':
        return 'Overdue';
      case 'pending':
        return 'Pending';
      case 'paid':
        return 'Paid';
      case 'partial':
        return 'Partial';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const renderAccountCard = (account: AccountPayable) => (
    <TouchableOpacity 
      key={account.id} 
      style={styles.accountCard}
      onPress={() => handleAccountPress(account)}
    >
      <View style={styles.accountHeader}>
        <Text style={styles.accountName}>{account.debtor_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(account.status) }]}>
          <Text style={styles.statusText}>{getStatusText(account.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.accountCode}>Code: {account.debtor_code}</Text>
      <Text style={styles.dueDate}>
        Due: {new Date(account.due_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </Text>
      
      <View style={styles.amountRow}>
        <Text style={[
          styles.amount,
          { color: account.currency === 'USD' ? '#ffffff' : '#F0C38E' }
        ]}>
          {account.currency} {account.total_amount?.toLocaleString() || '0'}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#F0C38E" />
      </View>
    </TouchableOpacity>
  );

  const renderTransactionCard = (transaction: AccountTransaction) => (
    <View key={transaction.id} style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionType}>
          {transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}
        </Text>
        <Text style={styles.transactionDate}>
          {new Date(transaction.transaction_date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })}
        </Text>
      </View>
      
      <Text style={styles.transactionDescription}>{transaction.description}</Text>
      
      {transaction.reference_number && (
        <Text style={styles.referenceNumber}>Ref: {transaction.reference_number}</Text>
      )}
      
      <Text style={[
        styles.transactionAmount,
        { color: transaction.transaction_type === 'payment' ? '#4CAF50' : '#FF6B35' }
      ]}>
        {transaction.transaction_type === 'payment' ? '-' : '+'} {transaction.currency} {transaction.amount.toLocaleString()}
      </Text>
    </View>
  );

  const renderAccountDetails = () => {
    if (!selectedAccount) return null;

    return (
      <View style={styles.detailsContainer}>
        <View style={styles.detailsHeader}>
          <TouchableOpacity onPress={handleBackToAccounts} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
            <Text style={styles.backButtonText}>Back to Accounts</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.accountSummary}>
          <Text style={styles.accountTitle}>{selectedAccount.debtor_name}</Text>
          <Text style={styles.accountCode}>Code: {selectedAccount.debtor_code}</Text>
          <Text style={styles.accountDescription}>{selectedAccount.description}</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount:</Text>
            <Text style={[
              styles.summaryValue,
              { color: selectedAccount.currency === 'USD' ? '#ffffff' : '#F0C38E' }
            ]}>
              {selectedAccount.currency} {selectedAccount.total_amount?.toLocaleString() || '0'}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedAccount.status) }]}>
              <Text style={styles.statusText}>{getStatusText(selectedAccount.status)}</Text>
            </View>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Due Date:</Text>
            <Text style={styles.summaryValue}>
              {new Date(selectedAccount.due_date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
        </View>

        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          
          <ScrollView style={styles.transactionsList} showsVerticalScrollIndicator={false}>
            {transactions.length > 0 ? (
              transactions.map(renderTransactionCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No transactions found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderAccountsList = () => {
    const displayAccounts = showAll ? payables : payables.filter(acc => acc.status !== 'paid' && acc.status !== 'cancelled');

    return (
      <View style={styles.accountsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {showAll ? 'All Payables' : 'Outstanding Payables'}
          </Text>
          <TouchableOpacity style={styles.addNewButton} onPress={handleAddNew}>
            <Text style={styles.addNewButtonText}>+ Add New</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.accountsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : displayAccounts.length > 0 ? (
            displayAccounts.map(renderAccountCard)
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No payables found</Text>
              <Text style={styles.emptySubtext}>Add a new debtor to get started</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.viewAllContainer}>
          <TouchableOpacity 
            style={styles.viewAllButton} 
            onPress={() => setShowAll(!showAll)}
          >
            <Text style={styles.viewAllButtonText}>
              {showAll ? 'Show Outstanding Only' : 'View All Payables'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#F0C38E" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  useEffect(() => {
    loadPayables();
  }, [loadPayables]);

  return (
    <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payables History</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        {selectedAccount ? renderAccountDetails() : renderAccountsList()}
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
  accountsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addNewButton: {
    backgroundColor: '#F0C38E',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addNewButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#312C51',
  },
  accountsList: {
    flex: 1,
  },
  accountCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  accountName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  accountCode: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
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
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  viewAllContainer: {
    paddingVertical: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  viewAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F0C38E',
    marginRight: 8,
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  detailsHeader: {
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 8,
  },
  accountSummary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  accountTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  accountDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  transactionsSection: {
    flex: 1,
  },
  transactionsList: {
    flex: 1,
  },
  transactionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  transactionDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  transactionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  referenceNumber: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});




