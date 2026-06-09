import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { accountService } from '../services/accountService';
import { formatCurrency } from '../constants/currency';
import { AccountPayable, AccountStatus, AccountType } from '../types';

type TabType = 'receivables' | 'payables';

export default function AccountPayablesScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('payables');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayables = useCallback(async () => {
    try {
      setLoading(true);
      const response = await accountService.getAccountPayables();
      
      if (response.success && response.data && response.data.length > 0) {
        setPayables(response.data);
      } else {
        // No real data - show empty state
        setPayables([]);
      }
    } catch (error) {
      console.error('Error loading payables:', error);
      // Show empty state on error instead of fake data
      setPayables([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPayables();
  }, [loadPayables]);

  const handleAddNew = () => {
    (navigation as any).navigate('AddAccount', { type: 'payable' as AccountType });
  };

  const handleViewAll = () => {
    (navigation as any).navigate('AccountPayablesHistory');
  };

  const handleTabPress = (tab: TabType) => {
    if (tab === 'receivables') {
      navigation.navigate('AccountReceivables' as never);
    } else {
      setActiveTab(tab);
    }
  };

  const handleDebtorPress = (debtor: AccountPayable) => {
    Alert.alert(
      debtor.debtor_name,
      `Amount: ${formatCurrency.CDF(debtor.total_amount)}\nDue: ${new Date(debtor.due_date).toLocaleDateString()}\nStatus: ${debtor.status}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Details', onPress: () => console.log('View details') },
        { text: 'Mark as Paid', onPress: () => console.log('Mark as paid') },
      ]
    );
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

  const renderTabButton = (tab: TabType, label: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => handleTabPress(tab)}
    >
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
      {activeTab === tab && <View style={styles.tabUnderline} />}
    </TouchableOpacity>
  );

  const renderDebtorCard = (debtor: AccountPayable) => (
    <TouchableOpacity 
      key={debtor.id} 
      style={styles.debtorCard}
      onPress={() => handleDebtorPress(debtor)}
    >
      <Text style={styles.debtorName}>{debtor.debtor_name}</Text>
      <Text style={styles.dueDate}>
        Due: {new Date(debtor.due_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </Text>
      <Text style={[
        styles.amount,
        { color: debtor.currency === 'USD' ? '#ffffff' : '#F0C38E' }
      ]}>
        {debtor.currency} {debtor.total_amount?.toLocaleString() || '0'}
      </Text>
      {debtor.status === 'overdue' && (
        <Text style={styles.overdueStatus}>Overdue</Text>
      )}
    </TouchableOpacity>
  );

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
          <Text style={styles.headerTitle}>Accounts</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {renderTabButton('receivables', 'Receivables')}
          {renderTabButton('payables', 'Payables')}
        </View>

        {/* Outstanding Payables Section */}
        <View style={styles.outstandingSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Outstanding Payables</Text>
            <TouchableOpacity style={styles.addNewButton} onPress={handleAddNew}>
              <Text style={styles.addNewButtonText}>+ Add New</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.debtorsList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : payables.length > 0 ? (
              payables
                .filter(debtor => debtor.status !== 'paid' && debtor.status !== 'cancelled')
                .map(renderDebtorCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No outstanding payables</Text>
                <Text style={styles.emptySubtext}>Add a new debtor to get started</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* View All Button */}
        <View style={styles.viewAllContainer}>
          <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAll}>
            <Text style={styles.viewAllButtonText}>View All Debtors</Text>
            <Ionicons name="chevron-forward" size={20} color="#F0C38E" />
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
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  activeTabButton: {
    // Active tab styling handled by text color
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  activeTabText: {
    color: '#F0C38E',
    fontWeight: 'bold',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#F0C38E',
    borderRadius: 1,
  },
  outstandingSection: {
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
  debtorsList: {
    flex: 1,
  },
  debtorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  debtorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  dueDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  overdueStatus: {
    fontSize: 14,
    color: '#FF6B35',
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
    paddingHorizontal: 16,
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
});