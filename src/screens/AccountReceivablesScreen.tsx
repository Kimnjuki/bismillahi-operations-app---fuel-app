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
import { AccountReceivable, AccountStatus, AccountType } from '../types';

type TabType = 'receivables' | 'payables';

export default function AccountReceivablesScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('receivables');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sample data based on the image
  const sampleReceivables: AccountReceivable[] = [
    {
      id: '1',
      creditor_name: 'Creditor A',
      creditor_code: 'CRD001',
      total_amount: 5000000,
      currency: 'CDF',
      due_date: '2024-07-15',
      status: 'overdue',
      description: 'Fuel supply payment',
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '2',
      creditor_name: 'Creditor B',
      creditor_code: 'CRD002',
      total_amount: 2500,
      currency: 'USD',
      due_date: '2024-07-20',
      status: 'pending',
      description: 'Equipment maintenance',
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '3',
      creditor_name: 'Creditor C',
      creditor_code: 'CRD003',
      total_amount: 3000000,
      currency: 'CDF',
      due_date: '2024-07-25',
      status: 'pending',
      description: 'Station supplies',
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const loadReceivables = useCallback(async () => {
    try {
      setLoading(true);
      const response = await accountService.getAccountReceivables();
      
      if (response.success && response.data && response.data.length > 0) {
        setReceivables(response.data);
      } else {
        // Use sample data if no real data
        setReceivables(sampleReceivables);
      }
    } catch (error) {
      console.error('Error loading receivables:', error);
      // Use sample data on error
      setReceivables(sampleReceivables);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sampleReceivables]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReceivables();
  }, [loadReceivables]);

  const handleAddNew = () => {
    (navigation as any).navigate('AddAccount', { type: 'receivable' as AccountType });
  };

  const handleViewAll = () => {
    (navigation as any).navigate('AccountReceivablesHistory');
  };

  const handleTabPress = (tab: TabType) => {
    if (tab === 'payables') {
      navigation.navigate('AccountPayables' as never);
    } else {
      setActiveTab(tab);
    }
  };

  const handleCreditorPress = (creditor: AccountReceivable) => {
    Alert.alert(
      creditor.creditor_name,
      `Amount: ${formatCurrency.CDF(creditor.total_amount)}\nDue: ${new Date(creditor.due_date).toLocaleDateString()}\nStatus: ${creditor.status}`,
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

  const renderCreditorCard = (creditor: AccountReceivable) => (
    <TouchableOpacity 
      key={creditor.id} 
      style={styles.creditorCard}
      onPress={() => handleCreditorPress(creditor)}
    >
      <Text style={styles.creditorName}>{creditor.creditor_name}</Text>
      <Text style={styles.dueDate}>
        Due: {new Date(creditor.due_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </Text>
      <Text style={[
        styles.amount,
        { color: creditor.currency === 'USD' ? '#ffffff' : '#F0C38E' }
      ]}>
        {creditor.currency} {creditor.total_amount?.toLocaleString() || '0'}
      </Text>
      {creditor.status === 'overdue' && (
        <Text style={styles.overdueStatus}>Overdue</Text>
      )}
    </TouchableOpacity>
  );

  useEffect(() => {
    loadReceivables();
  }, [loadReceivables]);

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

        {/* Outstanding Receivables Section */}
        <View style={styles.outstandingSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Outstanding Receivables</Text>
            <TouchableOpacity style={styles.addNewButton} onPress={handleAddNew}>
              <Text style={styles.addNewButtonText}>+ Add New</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.creditorsList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : receivables.length > 0 ? (
              receivables
                .filter(creditor => creditor.status !== 'paid' && creditor.status !== 'cancelled')
                .map(renderCreditorCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No outstanding receivables</Text>
                <Text style={styles.emptySubtext}>Add a new creditor to get started</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* View All Button */}
        <View style={styles.viewAllContainer}>
          <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAll}>
            <Text style={styles.viewAllButtonText}>View All Creditors</Text>
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
  creditorsList: {
    flex: 1,
  },
  creditorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  creditorName: {
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
