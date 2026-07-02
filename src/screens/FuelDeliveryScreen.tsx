import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { fuelDeliveryService } from '../services/fuelDeliveryService';
import { formatCurrency } from '../constants/currency';
import { 
  FuelDelivery, 
  Transporter, 
  Station, 
  FuelStock, 
  DeliverySummary,
  DeliveryStatus,
  FuelType 
} from '../types';

export default function FuelDeliveryScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  
  // State management
  const [deliveries, setDeliveries] = useState<FuelDelivery[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [fuelStock, setFuelStock] = useState<FuelStock[]>([]);
  const [summary, setSummary] = useState<DeliverySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    deliveryDate: new Date().toISOString().split('T')[0],
    product: '',
    quantity: '',
    transporterId: '',
    truckId: '',
    stationId: '',
    isseVurraCdf: '',
    isseVurraUsd: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [
        deliveriesResponse,
        transportersResponse,
        stationsResponse,
        fuelStockResponse,
        summaryResponse
      ] = await Promise.all([
        fuelDeliveryService.getFuelDeliveries(),
        fuelDeliveryService.getTransporters(),
        fuelDeliveryService.getStations(),
        fuelDeliveryService.getFuelStock(),
        fuelDeliveryService.getDeliverySummary()
      ]);

      if (deliveriesResponse.success) setDeliveries(deliveriesResponse.data || []);
      if (transportersResponse.success) setTransporters(transportersResponse.data || []);
      if (stationsResponse.success) setStations(stationsResponse.data || []);
      if (fuelStockResponse.success) setFuelStock(fuelStockResponse.data || []);
      if (summaryResponse.success) setSummary(summaryResponse.data);

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

  useEffect(() => {
    if (transporters.length > 0 && !formData.transporterId) {
      const gasnet = transporters.find(t => t.transporter_name === 'Gasnet Energy');
      if (gasnet) {
        setFormData(prev => ({ ...prev, transporterId: gasnet.id }));
      }
    }
  }, [transporters, formData.transporterId]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.deliveryDate) {
      newErrors.deliveryDate = 'Delivery date is required';
    }

    if (!formData.product) {
      newErrors.product = 'Product is required';
    }

    if (!formData.quantity) {
      newErrors.quantity = 'Quantity is required';
    } else {
      const quantity = parseFloat(formData.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        newErrors.quantity = 'Please enter a valid quantity';
      }
    }

    if (!formData.transporterId) {
      newErrors.transporterId = 'Transporter is required';
    }

    if (!formData.truckId) {
      newErrors.truckId = 'Truck ID is required';
    }

    if (!formData.stationId) {
      newErrors.stationId = 'Station is required';
    }

    if (!formData.isseVurraCdf && !formData.isseVurraUsd) {
      newErrors.isseVurraCdf = 'At least one payment amount is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSaveDelivery = async () => {
    if (!validateForm()) {
      return;
    }

    if (!appUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      const deliveryData = {
        delivery_date: formData.deliveryDate,
        product: formData.product as FuelType,
        quantity_liters: parseFloat(formData.quantity),
        transporter_id: formData.transporterId,
        truck_id: formData.truckId,
        station_id: formData.stationId,
        isse_vurra_cdf: parseFloat(formData.isseVurraCdf) || 0,
        isse_vurra_usd: parseFloat(formData.isseVurraUsd) || 0,
        status: 'delivered' as DeliveryStatus,
        notes: formData.notes || undefined,
        created_by: appUser.id,
      };

      const response = await fuelDeliveryService.createFuelDelivery(deliveryData);

      if (response.success) {
        const selectedStation = stations.find(s => s.id === formData.stationId);
        const selectedProduct = formData.product;
        const newQuantity = parseFloat(formData.quantity);
        
        setSuccessMessage(
          `The stock for ${selectedProduct} at ${selectedStation?.station_name} has been successfully updated to ${newQuantity.toLocaleString()} Liters.`
        );
        setShowSuccessModal(true);
        
        // Reset form
        setFormData({
          deliveryDate: new Date().toISOString().split('T')[0],
          product: '',
          quantity: '',
          transporterId: '',
          truckId: '',
          stationId: '',
          isseVurraCdf: '',
          isseVurraUsd: '',
          notes: '',
        });
        
        // Reload data
        loadData();
      } else {
        Alert.alert('Error', response.error || 'Failed to save delivery');
      }
    } catch (error) {
      console.error('Error saving delivery:', error);
      Alert.alert('Error', 'Failed to save delivery');
    }
  };

  const handleAddTransporter = () => {
    navigation.navigate('AddTransporter' as never);
  };

  const handleRecordTaxPayment = () => {
    navigation.navigate('TaxPayment' as never);
  };

  const handleViewTruckHistory = () => {
    navigation.navigate('TruckTransactionHistory' as never);
  };

  const handleViewDeliveredTrucks = () => {
    navigation.navigate('TrucksDelivered' as never);
  };

  const getSelectedTransporter = () => {
    return transporters.find(t => t.id === formData.transporterId);
  };

  const getSelectedStation = () => {
    return stations.find(s => s.id === formData.stationId);
  };

  const getCurrentStock = (stationId: string, product: string) => {
    const stock = fuelStock.find(s => s.station_id === stationId && s.product === product);
    return stock?.current_stock || 0;
  };

  const renderInput = (
    label: string,
    field: string,
    placeholder: string,
    keyboardType: any = 'default',
    multiline: boolean = false
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          errors[field] && styles.inputError,
        ]}
        value={formData[field as keyof typeof formData]}
        onChangeText={(value) => handleInputChange(field, value)}
        placeholder={placeholder}
        placeholderTextColor="rgba(255, 255, 255, 0.5)"
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  const renderPicker = (
    label: string,
    field: string,
    options: { id: string; name: string }[],
    placeholder: string
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.picker, errors[field] && styles.inputError]}
        onPress={() => {
          // Simple picker implementation - you can enhance this with a proper picker modal
          Alert.alert(
            `Select ${label}`,
            '',
            options.map(option => ({
              text: option.name,
              onPress: () => handleInputChange(field, option.id)
            })).concat([{ text: 'Cancel', onPress: () => {} }])
          );
        }}
      >
        <Text style={[
          styles.pickerText,
          !formData[field as keyof typeof formData] && styles.placeholderText
        ]}>
          {formData[field as keyof typeof formData] 
            ? options.find(o => o.id === formData[field as keyof typeof formData])?.name || placeholder
            : placeholder
          }
        </Text>
        <Ionicons name="chevron-down" size={20} color="#ffffff" />
      </TouchableOpacity>
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  const renderOverviewCard = (title: string, value: string, subtitle?: string) => (
    <View style={styles.overviewCard}>
      <Text style={styles.overviewTitle}>{title}</Text>
      <Text style={styles.overviewValue}>{value}</Text>
      {subtitle && <Text style={styles.overviewSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderDeliveryHistoryItem = (delivery: FuelDelivery) => (
    <View key={delivery.id} style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>
          Fuel Delivery - {delivery.product}
        </Text>
        <Text style={styles.historyDate}>
          {new Date(delivery.delivery_date).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.historyDetails}>
        {delivery.quantity_liters.toLocaleString()} Liters to {delivery.station?.station_name}
      </Text>
      <Text style={styles.historyTransporter}>
        Transporter: {delivery.transporter?.transporter_name}
      </Text>
    </View>
  );

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
            <Text style={styles.headerTitle}>Fuel Delivery & Stock</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Log New Fuel Delivery Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Log New Fuel Delivery</Text>
            
            {renderInput('Date', 'deliveryDate', 'Select Date')}
            
   {renderPicker('Product', 'product', [
     { id: 'PMS', name: 'PMS' },
     { id: 'AGO', name: 'AGO' }
   ], 'Select Product')}
            
            {renderInput('Quantity Delivered (Liters)', 'quantity', 'Enter Quantity', 'numeric')}
            
            <View style={styles.transporterContainer}>
              {renderPicker('Delivering Truck', 'transporterId', transporters.map(t => ({
                id: t.id,
                name: `${t.transporter_name} (${t.transporter_code})`
              })), 'Select Transporter')}
              
              <TouchableOpacity style={styles.addButton} onPress={handleAddTransporter}>
                <Ionicons name="add" size={20} color="#312C51" />
              </TouchableOpacity>
            </View>

            {renderInput('Truck ID', 'truckId', 'Enter Truck ID')}
            
            {renderPicker('Station', 'stationId', stations.map(s => ({
              id: s.id,
              name: s.station_name
            })), 'Select Station')}
          </View>

          {/* ISSE VURRA Payments Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ISSE VURRA Payments</Text>
            
            {renderInput('ISSE VURRA CDF', 'isseVurraCdf', 'Enter Amount in CDF', 'numeric')}
            {renderInput('ISSE VURRA USD', 'isseVurraUsd', 'Enter Amount in USD', 'numeric')}
          </View>

          {/* Tax & History Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tax & History</Text>
            
            <TouchableOpacity style={styles.actionCard} onPress={handleRecordTaxPayment}>
              <View style={styles.actionCardContent}>
                <Text style={styles.actionCardTitle}>Record Tax Payment</Text>
                <Text style={styles.actionCardSubtitle}>Link to OTHER TAX ACC</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleViewTruckHistory}>
              <View style={styles.actionCardContent}>
                <Text style={styles.actionCardTitle}>Truck Transaction History</Text>
                <Text style={styles.actionCardSubtitle}>View all transactions by truck</Text>
              </View>
              <Ionicons name="time" size={20} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleViewDeliveredTrucks}>
              <View style={styles.actionCardContent}>
                <Text style={styles.actionCardTitle}>Delivered Trucks</Text>
                <Text style={styles.actionCardSubtitle}>Fuel deliveries per truck and station</Text>
              </View>
              <Ionicons name="bus" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Overview Section */}
          {fuelStock.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <View style={styles.overviewContainer}>
                {fuelStock.map((stock, index) => (
                  <View key={index} style={styles.overviewCard}>
                    <Text style={styles.overviewTitle}>{stock.product}</Text>
                    <Text style={styles.overviewValue}>
                      {stock.current_stock.toLocaleString()}/L
                    </Text>
                    <Text style={styles.overviewSubtitle}>
                      {stock.station?.station_name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Delivery History Section */}
          {deliveries.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery History</Text>
              {deliveries.slice(0, 5).map(renderDeliveryHistoryItem)}
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveDelivery}>
            <Text style={styles.saveButtonText}>Save Delivery</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalIcon}>
                <Ionicons name="checkmark-circle" size={60} color="#F0C38E" />
              </View>
              <Text style={styles.modalTitle}>Stock Updated!</Text>
              <Text style={styles.modalMessage}>{successMessage}</Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowSuccessModal(false)}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
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
  headerSpacer: {
    width: 24,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#FF6B35',
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B35',
    marginTop: 4,
  },
  picker: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pickerText: {
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  transporterContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  addButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  actionCardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  overviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '45%',
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F0C38E',
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  historyItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  historyDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  historyDetails: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 4,
  },
  historyTransporter: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#312C51',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
    alignItems: 'center',
    maxWidth: '90%',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: '#F0C38E',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#312C51',
  },
});
