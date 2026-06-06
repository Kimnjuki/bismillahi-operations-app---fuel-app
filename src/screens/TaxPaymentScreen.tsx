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
import { TaxPayment, Transporter, PaymentStatus } from '../types';

export default function TaxPaymentScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [taxPayments, setTaxPayments] = useState<TaxPayment[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amountCdf: '',
    amountUsd: '',
    borderPoint: '',
    truckId: '',
    transporterId: '',
    paymentReference: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [paymentsResponse, transportersResponse] = await Promise.all([
        fuelDeliveryService.getTaxPayments(),
        fuelDeliveryService.getTransporters()
      ]);

      if (paymentsResponse.success) setTaxPayments(paymentsResponse.data || []);
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }

    if (!formData.amountCdf && !formData.amountUsd) {
      newErrors.amountCdf = 'At least one amount is required';
    }

    if (!formData.borderPoint.trim()) {
      newErrors.borderPoint = 'Border point is required';
    }

    if (!formData.truckId.trim()) {
      newErrors.truckId = 'Truck ID is required';
    }

    if (!formData.transporterId) {
      newErrors.transporterId = 'Transporter is required';
    }

    if (!formData.paymentReference.trim()) {
      newErrors.paymentReference = 'Payment reference is required';
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

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!appUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      const paymentData = {
        payment_date: formData.paymentDate,
        amount_cdf: parseFloat(formData.amountCdf) || 0,
        amount_usd: parseFloat(formData.amountUsd) || 0,
        border_point: formData.borderPoint.trim(),
        truck_id: formData.truckId.trim(),
        transporter_id: formData.transporterId,
        payment_reference: formData.paymentReference.trim(),
        status: 'paid' as PaymentStatus,
        notes: formData.notes.trim() || undefined,
        created_by: appUser.id,
      };

      const response = await fuelDeliveryService.createTaxPayment(paymentData);

      if (response.success) {
        Alert.alert('Success', 'Tax payment recorded successfully');
        setShowForm(false);
        setFormData({
          paymentDate: new Date().toISOString().split('T')[0],
          amountCdf: '',
          amountUsd: '',
          borderPoint: '',
          truckId: '',
          transporterId: '',
          paymentReference: '',
          notes: '',
        });
        loadData();
      } else {
        Alert.alert('Error', response.error || 'Failed to record tax payment');
      }
    } catch (error) {
      console.error('Error recording tax payment:', error);
      Alert.alert('Error', 'Failed to record tax payment');
    }
  };

  const handleEditPayment = (payment: TaxPayment) => {
    Alert.alert('Edit Payment', `Edit payment for ${payment.truck_id}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Edit', onPress: () => console.log('Edit payment:', payment.id) },
    ]);
  };

  const handleDeletePayment = (payment: TaxPayment) => {
    Alert.alert(
      'Delete Payment',
      `Are you sure you want to delete this tax payment?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Implement delete functionality
            console.log('Delete payment:', payment.id);
          },
        },
      ]
    );
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return '#4CAF50';
      case 'pending':
        return '#FFA726';
      case 'failed':
        return '#FF6B35';
      case 'refunded':
        return '#9E9E9E';
      default:
        return '#ffffff';
    }
  };

  const getStatusText = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
    }
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
        onChangeText={(value: string) => handleInputChange(field, value)}
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

  const renderPaymentCard = (payment: TaxPayment) => (
    <View key={payment.id} style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentTitle}>Tax Payment</Text>
          <Text style={styles.paymentDate}>
            {new Date(payment.payment_date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.paymentActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditPayment(payment)}
          >
            <Ionicons name="create-outline" size={16} color="#F0C38E" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeletePayment(payment)}
          >
            <Ionicons name="trash-outline" size={16} color="#FF6B35" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Truck ID:</Text>
          <Text style={styles.detailValue}>{payment.truck_id}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Border Point:</Text>
          <Text style={styles.detailValue}>{payment.border_point}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Transporter:</Text>
          <Text style={styles.detailValue}>{payment.transporter?.transporter_name}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={styles.detailValue}>
            {payment.amount_cdf > 0 && formatCurrency.CDF(payment.amount_cdf)}
            {payment.amount_cdf > 0 && payment.amount_usd > 0 && ' / '}
            {payment.amount_usd > 0 && formatCurrency.USD(payment.amount_usd)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status:</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment.status) }]}>
            <Text style={styles.statusText}>
              {getStatusText(payment.status)}
            </Text>
          </View>
        </View>
      </View>

      {payment.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText}>{payment.notes}</Text>
        </View>
      )}
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
            <Text style={styles.headerTitle}>Tax Payment</Text>
            <TouchableOpacity onPress={() => setShowForm(!showForm)}>
              <Ionicons name={showForm ? "close" : "add"} size={24} color="#F0C38E" />
            </TouchableOpacity>
          </View>

          {/* Add New Payment Form */}
          {showForm && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Record Tax Payment</Text>
              
              {renderInput('Payment Date', 'paymentDate', 'Select Date')}
              {renderInput('Amount (CDF)', 'amountCdf', 'Enter amount in CDF', 'numeric')}
              {renderInput('Amount (USD)', 'amountUsd', 'Enter amount in USD', 'numeric')}
              {renderInput('Border Point', 'borderPoint', 'Enter border point')}
              {renderInput('Truck ID', 'truckId', 'Enter truck ID')}
              
              {renderPicker('Transporter', 'transporterId', transporters.map(t => ({
                id: t.id,
                name: `${t.transporter_name} (${t.transporter_code})`
              })), 'Select Transporter')}
              
              {renderInput('Payment Reference', 'paymentReference', 'Enter payment reference')}
              {renderInput('Notes', 'notes', 'Enter notes (optional)', 'default', true)}

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Record Payment</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tax Payments List */}
          <View style={styles.paymentsSection}>
            <Text style={styles.sectionTitle}>Tax Payment History</Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : taxPayments.length > 0 ? (
              taxPayments.map(renderPaymentCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.emptyText}>No tax payments found</Text>
                <Text style={styles.emptySubtext}>Record a new tax payment to get started</Text>
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
  formSection: {
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
  submitButton: {
    backgroundColor: '#F0C38E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#312C51',
  },
  paymentsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  paymentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  paymentDetails: {
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
  notesContainer: {
    marginTop: 8,
  },
  notesText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
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
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
