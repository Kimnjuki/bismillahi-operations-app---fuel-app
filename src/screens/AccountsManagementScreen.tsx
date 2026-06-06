import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { AccountType } from '../types';

type TabType = 'receivables' | 'payables';

interface AccountItem {
  id: string;
  name: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'pending' | 'overdue' | 'paid';
}

export default function AccountsManagementScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('receivables');

  // Sample data - clean and simple
  const receivablesData: AccountItem[] = [
    {
      id: '1',
      name: 'Creditor A',
      amount: 5000000,
      currency: 'CDF',
      dueDate: '2024-07-15',
      status: 'overdue',
    },
    {
      id: '2',
      name: 'Creditor B',
      amount: 2500,
      currency: 'USD',
      dueDate: '2024-07-20',
      status: 'pending',
    },
    {
      id: '3',
      name: 'Creditor C',
      amount: 3000000,
      currency: 'CDF',
      dueDate: '2024-07-25',
      status: 'pending',
    },
  ];

  const payablesData: AccountItem[] = [
    {
      id: '1',
      name: 'Debtor A',
      amount: 2000000,
      currency: 'CDF',
      dueDate: '2024-07-18',
      status: 'pending',
    },
    {
      id: '2',
      name: 'Debtor B',
      amount: 1500,
      currency: 'USD',
      dueDate: '2024-07-22',
      status: 'overdue',
    },
    {
      id: '3',
      name: 'Debtor C',
      amount: 4000000,
      currency: 'CDF',
      dueDate: '2024-07-28',
      status: 'pending',
    },
  ];

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleAddNew = () => {
    const type = activeTab === 'receivables' ? 'receivable' : 'payable';
    (navigation as any).navigate('AddAccount', { type: type as AccountType });
  };

  const handleItemPress = (item: AccountItem) => {
    Alert.alert(
      item.name,
      `Amount: ${item.currency} ${item.amount.toLocaleString()}\nDue: ${new Date(item.dueDate).toLocaleDateString()}\nStatus: ${item.status}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Details', onPress: () => console.log('View details') },
        { text: 'Mark as Paid', onPress: () => console.log('Mark as paid') },
      ]
    );
  };

  const handleViewAll = () => {
    const type = activeTab === 'receivables' ? 'creditors' : 'debtors';
    Alert.alert('View All', `This would show all ${type} in a detailed list view`);
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

  const renderAccountItem = (item: AccountItem) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.accountCard}
      onPress={() => handleItemPress(item)}
    >
      <Text style={styles.accountName}>{item.name}</Text>
      <Text style={styles.dueDate}>
        Due: {new Date(item.dueDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </Text>
      <Text style={[
        styles.amount,
        { color: item.currency === 'USD' ? '#ffffff' : '#F0C38E' }
      ]}>
        {item.currency} {item.amount.toLocaleString()}
      </Text>
      {item.status === 'overdue' && (
        <Text style={styles.overdueStatus}>Overdue</Text>
      )}
    </TouchableOpacity>
  );

  const currentData = activeTab === 'receivables' ? receivablesData : payablesData;
  const sectionTitle = activeTab === 'receivables' ? 'Outstanding Receivables' : 'Outstanding Payables';

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

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
          <TouchableOpacity style={styles.addNewButton} onPress={handleAddNew}>
            <Text style={styles.addNewButtonText}>+ Add New</Text>
          </TouchableOpacity>
        </View>

        {/* Accounts List */}
        <ScrollView 
          style={styles.accountsList}
          showsVerticalScrollIndicator={false}
        >
          {currentData.length > 0 ? (
            currentData
              .filter(item => item.status !== 'paid')
              .map(renderAccountItem)
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No outstanding {activeTab}</Text>
              <Text style={styles.emptySubtext}>Add a new {activeTab === 'receivables' ? 'creditor' : 'debtor'} to get started</Text>
            </View>
          )}
        </ScrollView>

        {/* View All Button */}
        <View style={styles.viewAllContainer}>
          <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAll}>
            <Text style={styles.viewAllButtonText}>
              View All {activeTab === 'receivables' ? 'Creditors' : 'Debtors'}
            </Text>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
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







