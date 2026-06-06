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
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { fuelDeliveryService } from '../services/fuelDeliveryService';
import { formatCurrency } from '../constants/currency';
import { Transporter, TruckTransaction, FuelDelivery, TaxPayment } from '../types';

export default function TransporterManagementScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [transactions, setTransactions] = useState<TruckTransaction[]>([]);
  const [deliveries, setDeliveries] = useState<FuelDelivery[]>([]);
  const [taxPayments, setTaxPayments] = useState<TaxPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransporter, setSelectedTransporter] = useState<Transporter | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [
        transportersResponse,
        transactionsResponse,
        deliveriesResponse,
        taxPaymentsResponse
      ] = await Promise.all([
        fuelDeliveryService.getTransporters(),
        fuelDeliveryService.getTruckTransactions(),
        fuelDeliveryService.getFuelDeliveries(),
        fuelDeliveryService.getTaxPayments()
      ]);
      
      if (transportersResponse.success) setTransporters(transportersResponse.data || []);
      if (transactionsResponse.success) setTransactions(transactionsResponse.data || []);
      if (deliveriesResponse.success) setDeliveries(deliveriesResponse.data || []);
      if (taxPaymentsResponse.success) setTaxPayments(taxPaymentsResponse.data || []);
      
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

  const handleAddNew = () => {
    setShowAddModal(true);
  };

  const handleViewTransactions = (transporter: Transporter) => {
    setSelectedTransporter(transporter);
    setShowTransactionModal(true);
  };

  const getTransporterStats = (transporterId: string) => {
    const transporterTransactions = transactions.filter(t => t.transporter_id === transporterId);
    const transporterDeliveries = deliveries.filter(d => d.transporter_id === transporterId);
    const transporterTaxPayments = taxPayments.filter(tp => tp.transporter_id === transporterId);
    
    const totalTransactions = transporterTransactions.length;
    const totalDeliveries = transporterDeliveries.length;
    const totalVolume = transporterDeliveries.reduce((sum, d) => sum + d.quantity_liters, 0);
    const totalPayments = transporterTaxPayments.reduce((sum, tp) => sum + tp.amount_cdf + tp.amount_usd, 0);
    
    return {
      totalTransactions,
      totalDeliveries,
      totalVolume,
      totalPayments
    };
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? '#4CAF50' : '#9E9E9E';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const filteredTransporters = transporters.filter(transporter =>
    transporter.transporter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transporter.transporter_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transporter.contact_person.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditTransporter = (transporter: Transporter) => {
    Alert.alert('Edit Transporter', `Edit ${transporter.transporter_name}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Edit', onPress: () => console.log('Edit transporter:', transporter.id) },
    ]);
  };

  const handleDeleteTransporter = (transporter: Transporter) => {
    Alert.alert(
      'Delete Transporter',
      `Are you sure you want to delete ${transporter.transporter_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fuelDeliveryService.deleteTransporter(transporter.id);
              if (response.success) {
                Alert.alert('Success', 'Transporter deleted successfully');
                loadData();
              } else {
                Alert.alert('Error', response.error || 'Failed to delete transporter');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete transporter');
            }
          },
        },
      ]
    );
  };

  const handleToggleStatus = async (transporter: Transporter) => {
    try {
      const response = await fuelDeliveryService.updateTransporter(transporter.id, {
        is_active: !transporter.is_active
      });
      
      if (response.success) {
        Alert.alert('Success', `Transporter ${transporter.is_active ? 'deactivated' : 'activated'} successfully`);
        loadData();
      } else {
        Alert.alert('Error', response.error || 'Failed to update transporter');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update transporter');
    }
  };

  const renderTransporterCard = (transporter: Transporter) => {
    const stats = getTransporterStats(transporter.id);
    
    return (
      <View key={transporter.id} style={styles.transporterCard}>
        <View style={styles.transporterHeader}>
          <View style={styles.transporterInfo}>
            <Text style={styles.transporterName}>{transporter.transporter_name}</Text>
            <Text style={styles.transporterCode}>{transporter.transporter_code}</Text>
            <Text style={styles.licenseNumber}>License: {transporter.license_number}</Text>
          </View>
          <View style={styles.transporterActions}>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(transporter.is_active) }
            ]}>
              <Text style={styles.statusText}>
                {getStatusText(transporter.is_active)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditTransporter(transporter)}
            >
              <Ionicons name="create-outline" size={16} color="#F0C38E" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.transporterDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Contact:</Text>
            <Text style={styles.detailValue}>{transporter.contact_person}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone:</Text>
            <Text style={styles.detailValue}>{transporter.phone}</Text>
          </View>
          
          {transporter.email && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{transporter.email}</Text>
            </View>
          )}
        </View>

        {/* Statistics Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Deliveries</Text>
            <Text style={styles.statValue}>{stats.totalDeliveries}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Volume (L)</Text>
            <Text style={styles.statValue}>{stats.totalVolume.toLocaleString()}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Transactions</Text>
            <Text style={styles.statValue}>{stats.totalTransactions}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Payments</Text>
            <Text style={styles.statValue}>{formatCurrency.CDF(stats.totalPayments)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.viewTransactionsButton}
            onPress={() => handleViewTransactions(transporter)}
          >
            <Ionicons name="list" size={16} color="#312C51" />
            <Text style={styles.viewTransactionsText}>View Transactions</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.toggleStatusButton,
              { backgroundColor: transporter.is_active ? 'rgba(255, 107, 53, 0.2)' : 'rgba(76, 175, 80, 0.2)' }
            ]}
            onPress={() => handleToggleStatus(transporter)}
          >
            <Ionicons 
              name={transporter.is_active ? "pause-circle" : "play-circle"} 
              size={16} 
              color={transporter.is_active ? "#FF6B35" : "#4CAF50"} 
            />
            <Text style={[
              styles.toggleStatusText,
              { color: transporter.is_active ? "#FF6B35" : "#4CAF50" }
            ]}>
              {transporter.is_active ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
            <Text style={styles.headerTitle}>Transporter Management</Text>
            <TouchableOpacity onPress={handleAddNew}>
              <Ionicons name="add" size={24} color="#F0C38E" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.5)" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search transporters..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.5)" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Summary Stats */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Total Transporters</Text>
              <Text style={styles.summaryAmount}>{transporters.length}</Text>
            </View>
            
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Active</Text>
              <Text style={[styles.summaryAmount, { color: '#4CAF50' }]}>
                {transporters.filter(t => t.is_active).length}
              </Text>
            </View>
            
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Total Deliveries</Text>
              <Text style={[styles.summaryAmount, { color: '#2196F3' }]}>
                {deliveries.length}
              </Text>
            </View>
            
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Total Volume</Text>
              <Text style={[styles.summaryAmount, { color: '#FF9800' }]}>
                {deliveries.reduce((sum, d) => sum + d.quantity_liters, 0).toLocaleString()}L
              </Text>
            </View>
          </View>

          {/* Add New Button */}
          <View style={styles.addNewContainer}>
            <TouchableOpacity style={styles.addNewButton} onPress={handleAddNew}>
              <Ionicons name="add" size={20} color="#312C51" />
              <Text style={styles.addNewText}>+ Add New Transporter</Text>
            </TouchableOpacity>
          </View>

          {/* Transporters List */}
          <View style={styles.transportersContainer}>
            <Text style={styles.sectionTitle}>
              Transporters {searchQuery && `(${filteredTransporters.length} found)`}
            </Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : filteredTransporters.length > 0 ? (
              filteredTransporters.map(renderTransporterCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="car-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No transporters found matching your search' : 'No transporters found'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? 'Try a different search term' : 'Add a new transporter to get started'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Transaction Modal */}
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
                  {selectedTransporter?.transporter_name} - Transactions
                </Text>
                <TouchableOpacity onPress={() => setShowTransactionModal(false)}>
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody}>
                {selectedTransporter && (
                  <>
                    {/* Transporter Info */}
                    <View style={styles.modalTransporterInfo}>
                      <Text style={styles.modalTransporterName}>{selectedTransporter.transporter_name}</Text>
                      <Text style={styles.modalTransporterCode}>{selectedTransporter.transporter_code}</Text>
                      <Text style={styles.modalTransporterContact}>{selectedTransporter.contact_person}</Text>
                    </View>

                    {/* Transactions List */}
                    <View style={styles.modalTransactionsList}>
                      {transactions
                        .filter(t => t.transporter_id === selectedTransporter.id)
                        .map(transaction => (
                          <View key={transaction.id} style={styles.modalTransactionItem}>
                            <View style={styles.modalTransactionHeader}>
                              <Text style={styles.modalTransactionType}>{transaction.transaction_type}</Text>
                              <Text style={styles.modalTransactionDate}>
                                {new Date(transaction.transaction_date).toLocaleDateString()}
                              </Text>
                            </View>
                            <Text style={styles.modalTransactionDescription}>{transaction.description}</Text>
                            <Text style={styles.modalTransactionAmount}>
                              {formatCurrency[transaction.currency as keyof typeof formatCurrency](transaction.amount)}
                            </Text>
                          </View>
                        ))}
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Add Transporter Modal */}
        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Transporter</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalBody}>
                <TouchableOpacity
                  style={styles.modalAddButton}
                  onPress={() => {
                    setShowAddModal(false);
                    navigation.navigate('AddTransporter' as never);
                  }}
                >
                  <Ionicons name="add" size={24} color="#312C51" />
                  <Text style={styles.modalAddButtonText}>Add New Transporter</Text>
                </TouchableOpacity>
              </View>
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
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchBar: {
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
    marginLeft: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F0C38E',
  },
  addNewContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0C38E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  addNewText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#312C51',
    marginLeft: 8,
  },
  transportersContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  transporterCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  transporterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transporterInfo: {
    flex: 1,
  },
  transporterName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  transporterCode: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  licenseNumber: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  transporterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  transporterDetails: {
    marginBottom: 12,
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
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F0C38E',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  viewTransactionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0C38E',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  viewTransactionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#312C51',
    marginLeft: 6,
  },
  toggleStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  toggleStatusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#312C51',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalBody: {
    padding: 20,
  },
  modalTransporterInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modalTransporterName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  modalTransporterCode: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  modalTransporterContact: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  modalTransactionsList: {
    gap: 12,
  },
  modalTransactionItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  modalTransactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTransactionType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F0C38E',
    textTransform: 'capitalize',
  },
  modalTransactionDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  modalTransactionDescription: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 8,
  },
  modalTransactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  modalAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0C38E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modalAddButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#312C51',
    marginLeft: 8,
  },
});
