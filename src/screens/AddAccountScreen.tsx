import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { accountService } from '../services/accountService';
import { internalAccountService } from '../services/internalAccountService';
import { AccountType, Currency, AccountStatus, InternalAccountType } from '../types';
import { formatCurrency } from '../constants/currency';

export default function AddAccountScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const accountType = (route.params as any)?.type as 'receivable' | 'payable' | 'operational' | 'station';

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Common fields
    name: '',
    code: '',
    accountType: 'operating' as InternalAccountType,
    description: '',
    currency: 'CDF' as Currency,
    totalAmount: '',
    dueDate: '',
    status: 'pending' as AccountStatus,
    // Contact fields
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
  });

  const currencies: Currency[] = ['CDF', 'USD'];
  const statusOptions: AccountStatus[] = ['pending', 'overdue', 'paid', 'partial', 'cancelled'];
  const accountTypes: InternalAccountType[] = ['operating', 'transit'];

  useEffect(() => {
    // Set default due date to 30 days from today
    const today = new Date();
    const dueDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const formattedDate = dueDate.toISOString().split('T')[0];
    setFormData(prev => ({
      ...prev,
      dueDate: formattedDate,
    }));
  }, []);

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    if (!formData.code.trim()) {
      Alert.alert('Error', 'Please enter a code');
      return;
    }

    const amount = parseFloat(formData.totalAmount) || 0;
    if (!formData.totalAmount || isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!formData.dueDate) {
      Alert.alert('Error', 'Please select a due date');
      return;
    }

    setLoading(true);
    try {
      const accountData = {
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
        currency: formData.currency,
        total_amount: amount,
        due_date: formData.dueDate,
        status: formData.status,
        contact_person: formData.contactPerson || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
        created_by: appUser?.id || '',
        created_at: new Date().toISOString(),
      };

      let response;
      if (accountType === 'receivable') {
        response = await accountService.createAccountReceivable({
          creditor_name: formData.name,
          creditor_code: formData.code,
          contact_person: formData.contactPerson,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          total_amount: amount,
          currency: formData.currency,
          due_date: formData.dueDate,
          status: formData.status,
          description: formData.description,
          created_by: appUser?.id || '',
        });
      } else if (accountType === 'payable') {
        response = await accountService.createAccountPayable({
          debtor_name: formData.name,
          debtor_code: formData.code,
          contact_person: formData.contactPerson,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          total_amount: amount,
          currency: formData.currency,
          due_date: formData.dueDate,
          status: formData.status,
          description: formData.description,
          created_by: appUser?.id || '',
        });
      } else {
        response = await internalAccountService.createAccount({
          account_name: formData.name,
          account_code: formData.code,
          account_type: formData.accountType,
          currency: formData.currency as 'USD' | 'CDF',
          balance: amount,
          is_active: true,
        });
      }

      if (response.success) {
        const label = accountType === 'receivable' ? 'Creditor' : accountType === 'payable' ? 'Debtor' : 'Internal Account';
        Alert.alert('Success', `${label} created successfully`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', response.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      Alert.alert('Error', 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const renderInputField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    keyboardType: any = 'default',
    multiline: boolean = false,
    rightIcon?: string,
    onRightIconPress?: () => void
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, multiline && styles.multilineInput]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#F0C38E"
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          editable={!rightIcon || rightIcon !== 'calendar'}
        />
        {rightIcon && (
          <TouchableOpacity style={styles.rightIcon} onPress={onRightIconPress}>
            <Ionicons name={rightIcon as any} size={20} color="#F0C38E" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderCurrencyField = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Currency</Text>
      <TouchableOpacity 
        style={styles.picker} 
        onPress={() => setShowCurrencyPicker(true)}
      >
        <Text style={styles.pickerText}>{formData.currency}</Text>
        <Ionicons name="chevron-down" size={20} color="#F0C38E" />
      </TouchableOpacity>
    </View>
  );

  const renderStatusField = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Status</Text>
      <TouchableOpacity 
        style={styles.picker} 
        onPress={() => setShowStatusPicker(true)}
      >
        <Text style={styles.pickerText}>{formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}</Text>
        <Ionicons name="chevron-down" size={20} color="#F0C38E" />
      </TouchableOpacity>
    </View>
  );

  const renderAmountField = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Total Amount</Text>
      <View style={styles.balanceInputWrapper}>
        <View style={styles.currencyLabel}>
          <Text style={styles.currencyText}>{formData.currency}</Text>
        </View>
        <TextInput
          style={styles.balanceInput}
          value={formData.totalAmount}
          onChangeText={(text) => setFormData(prev => ({ ...prev, totalAmount: text }))}
          placeholder="0.00"
          placeholderTextColor="#F0C38E"
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  const renderDateField = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Due Date</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={formData.dueDate}
          onChangeText={(text) => setFormData(prev => ({ ...prev, dueDate: text }))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#F0C38E"
        />
        <TouchableOpacity style={styles.rightIcon} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={20} color="#F0C38E" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAccountTypePicker, setShowAccountTypePicker] = useState(false);

  return (
    <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
             <Text style={styles.headerTitle}>
               {accountType === 'receivable' ? 'New Creditor' : 
                accountType === 'payable' ? 'New Debtor' : 'New Internal Account'}
             </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {renderInputField(
              'Name',
              formData.name,
              (text) => setFormData(prev => ({ ...prev, name: text })),
              accountType === 'receivable' ? 'e.g. ABC Fuel Suppliers' : 
              accountType === 'payable' ? 'e.g. XYZ Transport Company' : 'e.g. Petty Cash - CDF'
            )}

            {renderInputField(
              'Code',
              formData.code,
              (text) => setFormData(prev => ({ ...prev, code: text })),
              accountType === 'receivable' ? 'e.g. CRD001' : 
              accountType === 'payable' ? 'e.g. DBT001' : 'e.g. ACC001'
            )}

            {renderInputField(
              'Description (Optional)',
              formData.description,
              (text) => setFormData(prev => ({ ...prev, description: text })),
              'Add a description',
              'default',
              true
            )}

            {renderCurrencyField()}

            {(accountType === 'operational' || accountType === 'station') && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Account Type</Text>
                <TouchableOpacity
                  style={styles.picker}
                  onPress={() => setShowAccountTypePicker(true)}
                >
                  <Text style={styles.pickerText}>{formData.accountType === 'operating' ? 'Operating' : 'Transit'}</Text>
                  <Ionicons name="chevron-down" size={20} color="#F0C38E" />
                </TouchableOpacity>
              </View>
            )}

            {renderAmountField()}

            {renderDateField()}

            {renderStatusField()}

            {/* Contact Information */}
            <Text style={styles.sectionTitle}>Contact Information (Optional)</Text>
            
            {renderInputField(
              'Contact Person',
              formData.contactPerson,
              (text) => setFormData(prev => ({ ...prev, contactPerson: text })),
              'e.g. John Doe'
            )}

            {renderInputField(
              'Phone',
              formData.phone,
              (text) => setFormData(prev => ({ ...prev, phone: text })),
              'e.g. +243 123 456 789',
              'phone-pad'
            )}

            {renderInputField(
              'Email',
              formData.email,
              (text) => setFormData(prev => ({ ...prev, email: text })),
              'e.g. contact@company.com',
              'email-address'
            )}

            {renderInputField(
              'Address',
              formData.address,
              (text) => setFormData(prev => ({ ...prev, address: text })),
              'e.g. 123 Main Street, City',
              'default',
              true
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                 {loading ? 'Saving...' : 
                  accountType === 'receivable' ? 'Save Creditor' : 
                  accountType === 'payable' ? 'Save Debtor' : 'Save Account'}
               </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Account Type Picker Modal */}
        <Modal
          visible={showAccountTypePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAccountTypePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Account Type</Text>
              {accountTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.modalOption,
                    formData.accountType === type && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, accountType: type }));
                    setShowAccountTypePicker(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    formData.accountType === type && styles.modalOptionTextSelected
                  ]}>
                    {type === 'operating' ? 'Operating' : 'Transit'}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAccountTypePicker(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Currency Picker Modal */}
        <Modal
          visible={showCurrencyPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCurrencyPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              {currencies.map((currency) => (
                <TouchableOpacity
                  key={currency}
                  style={[
                    styles.modalOption,
                    formData.currency === currency && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, currency: currency }));
                    setShowCurrencyPicker(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    formData.currency === currency && styles.modalOptionTextSelected
                  ]}>
                    {currency}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCurrencyPicker(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Status Picker Modal */}
        <Modal
          visible={showStatusPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowStatusPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Status</Text>
              {statusOptions.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.modalOption,
                    formData.status === status && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, status: status }));
                    setShowStatusPicker(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    formData.status === status && styles.modalOptionTextSelected
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowStatusPicker(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
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
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  rightIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  picker: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pickerText: {
    fontSize: 16,
    color: '#ffffff',
  },
  balanceInputWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  currencyLabel: {
    backgroundColor: 'rgba(240, 195, 142, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  currencyText: {
    fontSize: 16,
    color: '#F0C38E',
    fontWeight: '600',
  },
  balanceInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#F0C38E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
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
    padding: 20,
    width: '80%',
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalOptionSelected: {
    backgroundColor: '#F0C38E',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#ffffff',
  },
  modalOptionTextSelected: {
    color: '#312C51',
    fontWeight: '600',
  },
  modalCancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: '#F0C38E',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 16,
  },
});