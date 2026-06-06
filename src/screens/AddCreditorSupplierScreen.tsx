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
import { creditorSupplierService } from '../services/creditorSupplierService';
import { CreditorSupplierType, Currency } from '../types';

export default function AddCreditorSupplierScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const type = (route.params as any)?.type as 'creditor' | 'supplier';

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    creationDate: '',
    name: '',
    type: 'creditor' as CreditorSupplierType,
    currency: 'CDF' as Currency,
    memo: '',
  });

  const typeOptions: CreditorSupplierType[] = ['creditor', 'supplier'];
  const currencies: Currency[] = ['CDF', 'USD'];

  useEffect(() => {
    // Set default creation date to today
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setFormData(prev => ({
      ...prev,
      creationDate: formattedDate,
      type: type || 'creditor',
    }));
  }, [type]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    setLoading(true);
    try {
      let response;
      if (formData.type === 'creditor') {
        response = await creditorSupplierService.createCreditor({
          name: formData.name,
          type: 'creditor',
          currency: formData.currency,
          memo: formData.memo || undefined,
          created_by: appUser?.id || '',
        });
      } else {
        response = await creditorSupplierService.createSupplier({
          name: formData.name,
          type: 'supplier',
          currency: formData.currency,
          memo: formData.memo || undefined,
          created_by: appUser?.id || '',
        });
      }

      if (response.success) {
        Alert.alert('Success', `${formData.type === 'creditor' ? 'Creditor' : 'Supplier'} created successfully`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', response.error || `Failed to create ${formData.type}`);
      }
    } catch (error) {
      console.error(`Error creating ${formData.type}:`, error);
      Alert.alert('Error', `Failed to create ${formData.type}`);
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

  const renderPickerField = (
    label: string,
    value: string,
    options: string[],
    onSelect: (value: string) => void,
    showPicker: boolean,
    setShowPicker: (show: boolean) => void
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity 
        style={styles.picker} 
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.pickerText}>{value}</Text>
        <Ionicons name="chevron-down" size={20} color="#F0C38E" />
      </TouchableOpacity>
    </View>
  );

  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const getTypeText = (type: CreditorSupplierType) => {
    switch (type) {
      case 'creditor':
        return 'Creditor';
      case 'supplier':
        return 'Supplier';
      default:
        return type;
    }
  };

  return (
    <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>New Customer / Supplier</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {renderInputField(
              'Creation Date',
              formData.creationDate,
              (text) => setFormData(prev => ({ ...prev, creationDate: text })),
              '2024-07-28',
              'default',
              false,
              'calendar-outline'
            )}

            {renderInputField(
              'Name',
              formData.name,
              (text) => setFormData(prev => ({ ...prev, name: text })),
              'ABC Supplies Ltd'
            )}

            {renderPickerField(
              'Type',
              getTypeText(formData.type),
              typeOptions.map(getTypeText),
              (value) => {
                const typeKey = typeOptions.find(t => getTypeText(t) === value);
                if (typeKey) {
                  setFormData(prev => ({ ...prev, type: typeKey }));
                }
              },
              showTypePicker,
              setShowTypePicker
            )}

            {renderPickerField(
              'Default Currency',
              formData.currency,
              currencies,
              (value) => setFormData(prev => ({ ...prev, currency: value as Currency })),
              showCurrencyPicker,
              setShowCurrencyPicker
            )}

            {renderInputField(
              'Memo / Description',
              formData.memo,
              (text) => setFormData(prev => ({ ...prev, memo: text })),
              'Optional memo or description',
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
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Type Picker Modal */}
        <Modal
          visible={showTypePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTypePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Type</Text>
              {typeOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.modalOption,
                    formData.type === option && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, type: option }));
                    setShowTypePicker(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    formData.type === option && styles.modalOptionTextSelected
                  ]}>
                    {getTypeText(option)}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowTypePicker(false)}
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
  rightIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
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
});
