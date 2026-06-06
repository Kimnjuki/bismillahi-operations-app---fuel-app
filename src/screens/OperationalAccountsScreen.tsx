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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { formatCurrency } from '../constants/currency';

interface OperationalAccount {
  id: string;
  name: string;
  balance: number;
  currency: string;
  type: string;
}

interface Transaction {
  id: string;
  accountId: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  description: string;
  date: string;
  reference?: string;
}

export default function OperationalAccountsScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [selectedAccount, setSelectedAccount] = useState<OperationalAccount | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Operational accounts data based on the image
  const operationalAccounts: OperationalAccount[] = [
    {
      id: '1',
      name: 'ISSE VURRA CDF',
      balance: 1250000,
      currency: 'CDF',
      type: 'Tax Account'
    },
    {
      id: '2',
      name: 'ISSE VURRA USD',
      balance: 5000,
      currency: 'USD',
      type: 'Tax Account'
    },
    {
      id: '3',
      name: 'OTHER TAX ACC',
      balance: 750000,
      currency: 'CDF',
      type: 'Tax Account'
    },
    {
      id: '4',
      name: 'MAINTENANCE FUND',
      balance: 2000000,
      currency: 'CDF',
      type: 'Operations Account'
    },
    {
      id: '5',
      name: 'EQUIPMENT FUND',
      balance: 3500000,
      currency: 'CDF',
      type: 'Operations Account'
    },
    {
      id: '6',
      name: 'EMERGENCY FUND',
      balance: 1000000,
      currency: 'CDF',
      type: 'Operations Account'
    }
  ];

  // Mock transaction data
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      accountId: '1',
      type: 'credit',
      amount: 500000,
      currency: 'CDF',
      description: 'Tax collection deposit',
      date: '2024-01-15',
      reference: 'TXN-001'
    },
    {
      id: '2',
      accountId: '1',
      type: 'debit',
      amount: 25000,
      currency: 'CDF',
      description: 'Bank charges',
      date: '2024-01-14',
      reference: 'TXN-002'
    },
    {
      id: '3',
      accountId: '2',
      type: 'credit',
      amount: 2000,
      currency: 'USD',
      description: 'USD tax collection',
      date: '2024-01-13',
      reference: 'TXN-003'
    },
    {
      id: '4',
      accountId: '3',
      type: 'credit',
      amount: 300000,
      currency: 'CDF',
      description: 'Other tax collection',
      date: '2024-01-12',
      reference: 'TXN-004'
    },
    {
      id: '5',
      accountId: '4',
      type: 'debit',
      amount: 150000,
      currency: 'CDF',
      description: 'Equipment maintenance',
      date: '2024-01-11',
      reference: 'TXN-005'
    }
  ];

  const handleAddNew = () => {
    (navigation as any).navigate('AddAccount', { type: 'operational' });
  };

  const handleAccountPress = (account: OperationalAccount) => {
    Alert.alert(
      account.name,
      `Balance: ${account.currency} ${account.balance.toLocaleString()}\nType: ${account.type}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Details', onPress: () => console.log('View account details') },
      ]
    );
  };

  const handleAccountOptions = (account: OperationalAccount) => {
    Alert.alert(
      'Account Options',
      `Options for ${account.name}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => console.log('Edit account') },
        { text: 'View Transactions', onPress: () => handleViewTransactions(account) },
        { text: 'Delete', style: 'destructive', onPress: () => console.log('Delete account') },
      ]
    );
  };

  const handleViewTransactions = (account: OperationalAccount) => {
    setSelectedAccount(account);
    const accountTransactions = mockTransactions.filter(t => t.accountId === account.id);
    setTransactions(accountTransactions);
    setShowTransactionModal(true);
  };

  const renderAccountCard = (account: OperationalAccount) => (
    <TouchableOpacity 
      key={account.id} 
      style={styles.accountCard}
      onPress={() => handleAccountPress(account)}
    >
      <View style={styles.accountCardContent}>
        <View style={styles.accountIconContainer}>
          <Ionicons name="business" size={24} color="#ffffff" />
        </View>
        
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>{account.name}</Text>
          <Text style={styles.accountBalance}>
            {account.currency} {account.balance.toLocaleString()}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.optionsButton}
          onPress={() => handleAccountOptions(account)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderTransactionItem = (transaction: Transaction) => (
    <View key={transaction.id} style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View style={[
          styles.transactionIcon,
          { backgroundColor: transaction.type === 'credit' ? '#4CAF50' : '#F44336' }
        ]}>
          <Ionicons 
            name={transaction.type === 'credit' ? 'arrow-up' : 'arrow-down'} 
            size={16} 
            color="#ffffff" 
          />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionDescription}>{transaction.description}</Text>
          <Text style={styles.transactionDate}>{transaction.date}</Text>
          {transaction.reference && (
            <Text style={styles.transactionReference}>Ref: {transaction.reference}</Text>
          )}
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount,
          { color: transaction.type === 'credit' ? '#4CAF50' : '#F44336' }
        ]}>
          {transaction.type === 'credit' ? '+' : '-'}{transaction.currency} {transaction.amount.toLocaleString()}
        </Text>
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
          <Text style={styles.headerTitle}>Operational Accounts</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Accounts Overview Section */}
        <View style={styles.overviewSection}>
          <Text style={styles.overviewTitle}>Accounts Overview</Text>
          
          <ScrollView 
            style={styles.accountsList}
            showsVerticalScrollIndicator={false}
          >
            {operationalAccounts.map(renderAccountCard)}
          </ScrollView>
        </View>

        {/* Add New Account Button */}
        <View style={styles.addButtonContainer}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddNew}>
            <View style={styles.addButtonIcon}>
              <Ionicons name="add" size={24} color="#ffffff" />
            </View>
            <Text style={styles.addButtonText}>Add New Account</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History Modal */}
        <Modal
          visible={showTransactionModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTransactionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedAccount?.name} - Transactions
                </Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setShowTransactionModal(false)}
                >
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.transactionsList}>
                {transactions.length > 0 ? (
                  transactions.map(renderTransactionItem)
                ) : (
                  <View style={styles.noTransactions}>
                    <Ionicons name="receipt-outline" size={48} color="rgba(255, 255, 255, 0.5)" />
                    <Text style={styles.noTransactionsText}>No transactions found</Text>
                  </View>
                )}
              </ScrollView>
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
  overviewSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  overviewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    marginTop: 10,
  },
  accountsList: {
    flex: 1,
  },
  accountCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  accountCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  accountIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0C38E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  optionsButton: {
    padding: 8,
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
  addButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(49, 44, 81, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#312C51',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#48426D',
    borderRadius: 16,
    width: '90%',
    height: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  transactionsList: {
    flex: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  transactionReference: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  noTransactions: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noTransactionsText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 16,
  },
});