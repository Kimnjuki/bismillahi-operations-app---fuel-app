import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { internalAccountService } from '../services/internalAccountService';
import { formatCurrency } from '../constants/currency';
import { InternalAccount, Station, AccountTransaction } from '../types';
import DatePicker from '@react-native-community/datetimepicker';

type AccountTabType = 'stations' | 'operational';

interface StationAccountDisplay {
  id: string;
  stationId: string;
  name: string;
  operatingCdf: InternalAccount | null;
  operatingUsd: InternalAccount | null;
}

interface OperationalAccountDisplay {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

type TransactionType = AccountTransaction['transaction_type'];

const getTransactionTypeColor = (type: TransactionType) => {
  switch (type) {
    case 'payment':
      return '#4CAF50';
    case 'adjustment':
      return '#FF9800';
    case 'refund':
      return '#2196F3';
    default:
      return '#9E9E9E';
  }
};

const getTransactionTypeText = (type: TransactionType) => {
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

const getTransactionIcon = (type: TransactionType): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'payment':
      return 'cash';
    case 'adjustment':
      return 'settings';
    case 'refund':
      return 'refresh';
    default:
      return 'document';
  }
};

export default function AccountsScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<AccountTabType>('stations');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [accountTransactions, setAccountTransactions] = useState<AccountTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [cashFlowBalance, setCashFlowBalance] = useState(0);
  const [allAccounts, setAllAccounts] = useState<InternalAccount[]>([]);
  const [allStations, setAllStations] = useState<Station[]>([]);

  const handleAccountPress = async (account: any) => {
    try {
      setSelectedAccount(account);
      setTransactionsLoading(true);

      await new Promise(resolve => setTimeout(resolve, 600));

      const accountId = typeof account === 'object' ? account.id : undefined;
      const baseAmount =
        account.balance ||
        account.operatingCdf?.balance ||
        account.operatingUsd?.balance ||
        0;
      const currency = account.currency || account.operatingCdf?.currency || account.operatingUsd?.currency || 'CDF';

      const mockTransactions: AccountTransaction[] = [];
      for (let i = 0; i < 5; i++) {
        const transactionDate = new Date();
        transactionDate.setDate(transactionDate.getDate() - i);

        mockTransactions.push({
          id: `txn_${accountId || account.id}_${i}`,
          account_id: accountId || account.id,
          account_type: 'receivable',
          transaction_type: i % 2 === 0 ? 'payment' : 'adjustment',
          amount: Math.floor(Math.random() * (baseAmount * 0.1)) + 100,
          currency,
          transaction_date: transactionDate.toISOString(),
          description: `Transaction ${i + 1} for ${account.name}`,
          reference_number: `REF${Math.floor(Math.random() * 10000)}`,
          created_by: appUser?.user_code || 'system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      setAccountTransactions(mockTransactions);

      const balance = mockTransactions.reduce((sum, txn) => {
        if (txn.transaction_type === 'payment') return sum + txn.amount;
        return sum - txn.amount;
      }, 0);

      setCashFlowBalance(balance);
    } catch (error) {
      console.error('Error loading account transactions:', error);
      Alert.alert('Error', 'Failed to load account transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

   const handleDateSelect = () => {
     setDatePickerVisible(true);
   };

    const handleDateConfirm = (event: any, selectedDate: Date | undefined) => {
     if (selectedDate !== undefined) {
       const dateString = selectedDate.toISOString().split('T')[0];
       setSelectedDate(dateString);
     }
     setDatePickerVisible(false);
   };

    const handleDateCancel = () => {
      setDatePickerVisible(false);
    };

    const fetchData = useCallback(async () => {
      try {
        const results = await Promise.all([
          internalAccountService.getInternalAccounts(),
          internalAccountService.getStations(),
        ]) as [Awaited<ReturnType<typeof internalAccountService.getInternalAccounts>>, Awaited<ReturnType<typeof internalAccountService.getStations>>];
        const [accountsRes, stationsRes] = results;
        if (accountsRes.success && accountsRes.data) setAllAccounts(accountsRes.data);
        if (stationsRes.success && stationsRes.data) setAllStations(stationsRes.data);
      } catch (error) {
        console.error('Error loading account data:', error);
      } finally {
        setRefreshing(false);
      }
    }, []);

   useEffect(() => {
     fetchData();
   }, [fetchData]);

   const stationAccounts: StationAccountDisplay[] = useMemo(() => {
     const map = new Map<string, StationAccountDisplay>();
     allStations.forEach(station => {
       map.set(station.id, {
         id: station.id,
         stationId: station.id,
         name: station.station_name,
         operatingCdf: null,
         operatingUsd: null,
       });
     });
     allAccounts.forEach(acc => {
       if (!acc.station_id) return;
       const entry = map.get(acc.station_id);
       if (!entry) return;
       if (acc.currency === 'CDF' && acc.account_type === 'operating') entry.operatingCdf = acc;
       else if (acc.currency === 'USD' && acc.account_type === 'operating') entry.operatingUsd = acc;
     });
     return Array.from(map.values()).filter(s => s.operatingCdf || s.operatingUsd);
   }, [allAccounts, allStations]);

   const operationalAccounts: OperationalAccountDisplay[] = useMemo(() => {
     return allAccounts
       .filter(acc => !acc.station_id)
       .map(acc => ({
         id: acc.id,
         name: acc.account_name,
         type: acc.account_type === 'transit' ? 'Transit Account' : 'Operational',
         balance: acc.balance,
         currency: acc.currency,
       }));
   }, [allAccounts]);

  const handleCloseModal = () => {
    setSelectedAccount(null);
    setAccountTransactions([]);
    setSelectedDate(null);
    setCashFlowBalance(0);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleAddNew = () => {
    (navigation as any).navigate('AddAccount', { type: 'operational' });
  };

  const handleTabPress = (tab: AccountTabType) => setActiveTab(tab);

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

  const renderStationAccountCard = (account: StationAccountDisplay) => {
    const cdf = account.operatingCdf;
    const usd = account.operatingUsd;
    const hasCdf = !!cdf;
    const hasUsd = !!usd;

    return (
      <TouchableOpacity
        key={account.id}
        style={styles.accountCard}
        onPress={() => handleAccountPress({
          id: account.id + '_combined',
          name: account.name,
          operatingCdf: cdf,
          operatingUsd: usd,
        })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.accountName}>{account.name}</Text>
          <Ionicons name="chevron-forward" size={20} color="#F0C38E" />
        </View>

        {hasCdf && (
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>CDF · Operating</Text>
            <Text style={styles.balanceAmount}>
              CDF {(cdf!.balance).toLocaleString()}
            </Text>
          </View>
        )}

        {hasUsd && (
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>USD · Operating</Text>
            <Text style={styles.balanceAmount}>
              USD {(usd!.balance).toLocaleString()}
            </Text>
          </View>
        )}

        {!hasCdf && !hasUsd && (
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>No active accounts</Text>
            <Text style={styles.balanceAmount}>0</Text>
          </View>
        )}

        <View style={styles.viewTransactionsRow}>
          <Text style={styles.viewTransactionsText}>View Transactions</Text>
          <Ionicons name="list-outline" size={16} color="#F0C38E" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderOperationalAccountCard = (account: OperationalAccountDisplay) => (
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
             {datePickerVisible && (
               <DatePicker
                 value={selectedDate ? new Date(selectedDate) : new Date()}
                 mode="date"
                 display="default"
                 onChange={handleDateConfirm}
               />
             )}
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
                {selectedAccount.currency || 'CDF'} {Math.abs(cashFlowBalance).toLocaleString()}
                {cashFlowBalance >= 0 ? ' (Positive)' : ' (Negative)'}
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
  
  const renderTransactionItem = useCallback(({ item }: { item: AccountTransaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <View style={styles.transactionTypeContainer}>
            <View style={[
              styles.transactionTypeBadge,
              { backgroundColor: getTransactionTypeColor(item.transaction_type) }
            ]}>
              <Ionicons
                name={getTransactionIcon(item.transaction_type)}
                size={16}
                color="#ffffff"
              />
              <Text style={styles.transactionTypeText}>
                {getTransactionTypeText(item.transaction_type)}
              </Text>
            </View>
          </View>
          <Text style={styles.transactionDate}>
            {new Date(item.transaction_date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.transactionAmount}>
          <Text style={styles.amountText}>
            {item.currency} {item.amount.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Description:</Text>
          <Text style={styles.detailValue}>{item.description}</Text>
        </View>

        {item.reference_number && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reference:</Text>
            <Text style={styles.detailValue}>{item.reference_number}</Text>
          </View>
        )}
      </View>
    </View>
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
     fetchData();
   }, [fetchData]);

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
