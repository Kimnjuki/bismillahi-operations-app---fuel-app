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
import { useNavigation } from '@react-navigation/native';
import { accountService } from '../services/accountService';
import { formatCurrency } from '../constants/currency';
import { AccountSummary, AccountType, AccountReceivable, AccountPayable } from '../types';

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

  // Mock station data based on the image
  const stationAccounts: StationAccount[] = [
    { id: '1', name: 'ISSIRO STATION', cdfBalance: 12345678, usdBalance: 9876 },
    { id: '2', name: 'DURBA STATION', cdfBalance: 5432109, usdBalance: 6543 },
    { id: '3', name: 'DEPOT ISSIRO', cdfBalance: 7890123, usdBalance: 0 },
    { id: '4', name: 'RUNGU STATION', cdfBalance: 3210987, usdBalance: 0 },
    { id: '5', name: 'DUNGU STATION', cdfBalance: 4567890, usdBalance: 0 },
    { id: '6', name: 'NIANGARA STATION', cdfBalance: 1098765, usdBalance: 0 },
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
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error loading account data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
    <View key={account.id} style={styles.accountCard}>
      <Text style={styles.accountName}>{account.name}</Text>
      
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
    </View>
  );

  const renderOperationalAccountCard = (account: OperationalAccount) => (
    <View key={account.id} style={styles.accountCard}>
      <Text style={styles.accountName}>{account.name}</Text>
      <Text style={styles.accountType}>{account.type}</Text>
      <Text style={styles.balanceAmount}>
        {account.currency} {account.balance.toLocaleString()}
      </Text>
    </View>
  );


  const renderContent = () => {
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
});
