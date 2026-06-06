import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { fuelDeliveryService } from '../services/fuelDeliveryService';
import { formatCurrency } from '../constants/currency';
import { TruckTransaction, Transporter, TransactionType } from '../types';

export default function TruckTransactionHistoryScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [transactions, setTransactions] = useState<TruckTransaction[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTruckId, setSearchTruckId] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [transactionsResponse, transportersResponse] = await Promise.all([
        fuelDeliveryService.getTruckTransactions(),
        fuelDeliveryService.getTransporters()
      ]);

      if (transactionsResponse.success) setTransactions(transactionsResponse.data || []);
      if (transportersResponse.success) setTransporters(transportersResponse.data || []);

    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleSearch = async () => {
    if (!searchTruckId.trim()) {
      loadData();
      return;
    }

    try {
      setLoading(true);
      const response = await fuelDeliveryService.getTruckTransactions(searchTruckId.trim());
      
      if (response.success) {
        setTransactions(response.data || []);
      } else {
        Alert.alert('Error', response.error || 'Failed to search transactions');
      }
    } catch (error) {
      console.error('Error searching transactions:', error);
      Alert.alert('Error', 'Failed to search transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTruckId('');
    loadData();
  };

  const getTransactionTypeColor = (type: TransactionType) => {
    switch (type) {
      case 'delivery':
        return '#4CAF50';
      case 'payment':
        return '#2196F3';
      case 'tax':
        return '#FF9800';
      case 'fuel_purchase':
        return '#9C27B0';
      case 'maintenance':
        return '#FF5722';
      default:
        return '#9E9E9E';
    }
  };

  const getTransactionTypeText = (type: TransactionType) => {
    switch (type) {
      case 'delivery':
        return 'Delivery';
      case 'payment':
        return 'Payment';
      case 'tax':
        return 'Tax';
      case 'fuel_purchase':
        return 'Fuel Purchase';
      case 'maintenance':
        return 'Maintenance';
      default:
        return type;
    }
  };

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'delivery':
        return 'car';
      case 'payment':
        return 'card';
      case 'tax':
        return 'receipt';
      case 'fuel_purchase':
        return 'flame';
      case 'maintenance':
        return 'construct';
      default:
        return 'document';
    }
  };

  const renderTransactionCard = (transaction: TruckTransaction) => (
    <View key={transaction.id} style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <View style={styles.transactionTypeContainer}>
            <View style={[
              styles.transactionTypeBadge,
              { backgroundColor: getTransactionTypeColor(transaction.transaction_type) }
            ]}>
              <Ionicons 
                name={getTransactionIcon(transaction.transaction_type) as any} 
                size={16} 
                color="#ffffff" 
              />
              <Text style={styles.transactionTypeText}>
                {getTransactionTypeText(transaction.transaction_type)}
              </Text>
            </View>
          </View>
          <Text style={styles.transactionDate}>
            {new Date(transaction.transaction_date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.transactionAmount}>
          <Text style={styles.amountText}>
            {formatCurrency[transaction.currency as keyof typeof formatCurrency](transaction.amount)}
          </Text>
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Truck ID:</Text>
          <Text style={styles.detailValue}>{transaction.truck_id}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Transporter:</Text>
          <Text style={styles.detailValue}>{transaction.transporter?.transporter_name}</Text>
        </View>
        
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

  const renderSummaryCard = (title: string, value: string, color: string = '#F0C38E') => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    </View>
  );

  const getTotalTransactions = () => transactions.length;
  const getTotalAmount = () => transactions.reduce((sum, t) => sum + t.amount, 0);
  const getDeliveryCount = () => transactions.filter(t => t.transaction_type === 'delivery').length;
  const getPaymentCount = () => transactions.filter(t => t.transaction_type === 'payment').length;

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Truck Transaction History</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchTruckId}
                onChangeText={setSearchTruckId}
                placeholder="Search by Truck ID"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />
              <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                <Ionicons name="search" size={20} color="#312C51" />
              </TouchableOpacity>
              {searchTruckId && (
                <TouchableOpacity style={styles.clearButton} onPress={handleClearSearch}>
                  <Ionicons name="close" size={20} color="#FF6B35" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Summary Section */}
          {transactions.length > 0 && (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <View style={styles.summaryContainer}>
                {renderSummaryCard('Total Transactions', getTotalTransactions().toString())}
                {renderSummaryCard('Total Amount', formatCurrency.CDF(getTotalAmount()))}
                {renderSummaryCard('Deliveries', getDeliveryCount().toString(), '#4CAF50')}
                {renderSummaryCard('Payments', getPaymentCount().toString(), '#2196F3')}
              </View>
            </View>
          )}

          {/* Transactions List */}
          <View style={styles.transactionsSection}>
            <Text style={styles.sectionTitle}>
              {searchTruckId ? `Transactions for ${searchTruckId}` : 'All Transactions'}
            </Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : transactions.length > 0 ? (
              transactions.map(renderTransactionCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.emptyText}>
                  {searchTruckId ? 'No transactions found for this truck' : 'No transactions found'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchTruckId ? 'Try a different truck ID' : 'Transactions will appear here when recorded'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
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
  content: {
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
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
  },
  searchButton: {
    backgroundColor: '#F0C38E',
    borderRadius: 6,
    padding: 8,
    marginLeft: 8,
  },
  clearButton: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderRadius: 6,
    padding: 8,
    marginLeft: 8,
  },
  summarySection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
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
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});










