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
import { tankService } from '../services/tankService';
import { PumpFuelType, Tank } from '../types';

export default function AddTankScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const stationId = (route.params as any)?.stationId as string;
  const existingTank = (route.params as any)?.tank as Tank | undefined;

  const [loading, setLoading] = useState(false);
  const [selectedPumps, setSelectedPumps] = useState<string[]>(existingTank?.pumps || []);
  const [formData, setFormData] = useState({
    name: '',
    tankNumber: '',
    fuelType: 'PMS' as PumpFuelType,
    capacity: '',
    currentDipping: '',
    closingBookStock: '',
  });

  const fuelTypeOptions = tankService.getFuelTypeOptions();

  useEffect(() => {
    if (existingTank) {
      setFormData({
        name: existingTank.name,
        tankNumber: existingTank.tank_number.toString(),
        fuelType: existingTank.fuel_type,
        capacity: existingTank.capacity.toString(),
        currentDipping: existingTank.current_dipping.toString(),
        closingBookStock: existingTank.closing_book_stock.toString(),
      });
      setSelectedPumps(existingTank.pumps || []);
    } else {
      loadNextTankNumber();
    }
  }, [existingTank, stationId]);

  const loadNextTankNumber = async () => {
    try {
      const response = await tankService.getNextTankNumber(stationId);
      const tankNumber = response.data;
      if (response.success && tankNumber != null) {
        setFormData(prev => ({
          ...prev,
          tankNumber: tankNumber.toString(),
        }));
      }
    } catch (error) {
      console.error('Error loading next tank number:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a tank name');
      return;
    }

    if (!formData.tankNumber.trim()) {
      Alert.alert('Error', 'Please enter a tank number');
      return;
    }

    const tankNumber = parseInt(formData.tankNumber);
    if (isNaN(tankNumber) || tankNumber <= 0) {
      Alert.alert('Error', 'Please enter a valid tank number');
      return;
    }

    const capacity = parseInt(formData.capacity);
    if (isNaN(capacity) || capacity <= 0) {
      Alert.alert('Error', 'Please enter a valid capacity');
      return;
    }

    const currentDipping = parseFloat(formData.currentDipping);
    if (isNaN(currentDipping) || currentDipping < 0) {
      Alert.alert('Error', 'Please enter a valid current dipping reading');
      return;
    }

    const closingBookStock = parseFloat(formData.closingBookStock);
    if (isNaN(closingBookStock) || closingBookStock < 0) {
      Alert.alert('Error', 'Please enter a valid closing book stock');
      return;
    }

    if (!appUser || appUser.role !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can manage tanks');
      return;
    }

    try {
      setLoading(true);

      const tankData = {
        name: formData.name.trim(),
        tank_number: tankNumber,
        fuel_type: formData.fuelType,
        station_id: stationId,
        capacity: capacity,
        current_dipping: currentDipping,
        closing_book_stock: closingBookStock,
        pumps: selectedPumps,
        is_active: true,
        created_by: appUser.id,
      };

      let response;
      if (existingTank) {
        response = await tankService.updateTank(existingTank.id, tankData);
      } else {
        response = await tankService.createTank(tankData);
      }

      if (response.success) {
        Alert.alert(
          'Success',
          `Tank ${existingTank ? 'updated' : 'created'} successfully`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', response.error || `Failed to ${existingTank ? 'update' : 'create'} tank`);
      }
    } catch (error) {
      console.error(`Error ${existingTank ? 'updating' : 'creating'} tank:`, error);
      Alert.alert('Error', `Failed to ${existingTank ? 'update' : 'create'} tank`);
    } finally {
      setLoading(false);
    }
  };

  const renderInputField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    keyboardType: any = 'default'
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255, 255, 255, 0.5)"
        keyboardType={keyboardType}
      />
    </View>
  );

  const [showFuelTypePicker, setShowFuelTypePicker] = useState(false);

   const getFuelTypeColor = (fuelType: PumpFuelType) => {
     switch (fuelType) {
       case 'PMS':
         return '#FF6B35';
       case 'AGO':
         return '#4CAF50';
       default:
         return '#F0C38E';
     }
   };

  return (
    <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {existingTank ? 'Edit Tank' : 'Add New Tank'}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.formCard}>
            {renderInputField(
              'Tank Name',
              formData.name,
              (text) => setFormData(prev => ({ ...prev, name: text })),
              'e.g., Tank 1'
            )}

            {renderInputField(
              'Tank Number',
              formData.tankNumber,
              (text) => setFormData(prev => ({ ...prev, tankNumber: text })),
              'e.g., 1',
              'numeric'
            )}

            {renderInputField(
              'Capacity (Liters)',
              formData.capacity,
              (text) => setFormData(prev => ({ ...prev, capacity: text })),
              'e.g., 10000',
              'numeric'
            )}

            {renderInputField(
              'Current Dipping (Liters)',
              formData.currentDipping,
              (text) => setFormData(prev => ({ ...prev, currentDipping: text })),
              'e.g., 5020',
              'numeric'
            )}

            {renderInputField(
              'Closing Book Stock (Liters)',
              formData.closingBookStock,
              (text) => setFormData(prev => ({ ...prev, closingBookStock: text })),
              'e.g., 5000',
              'numeric'
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Fuel Type</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowFuelTypePicker(true)}
              >
                <Text style={styles.pickerText}>{formData.fuelType}</Text>
                <Ionicons name="chevron-down" size={20} color="#F0C38E" />
              </TouchableOpacity>
            </View>

            <View style={styles.fuelTypeInfo}>
              <Text style={styles.fuelTypeInfoTitle}>Fuel Type Information:</Text>
              {fuelTypeOptions.map((option) => (
                <View key={option.value} style={styles.fuelTypeOption}>
                  <View style={[styles.fuelTypeColor, { backgroundColor: getFuelTypeColor(option.value) }]} />
                  <Text style={styles.fuelTypeLabel}>{option.label}:</Text>
                  <Text style={styles.fuelTypeDescription}>{option.description}</Text>
                </View>
              ))}
            </View>
          </View>

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
                {loading ? 'Saving...' : (existingTank ? 'Update Tank' : 'Add Tank')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal
          visible={showFuelTypePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowFuelTypePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Fuel Type</Text>
              {fuelTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalOption,
                    formData.fuelType === option.value && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, fuelType: option.value }));
                    setShowFuelTypePicker(false);
                  }}
                >
                  <View style={styles.modalOptionContent}>
                    <View style={[styles.modalFuelTypeColor, { backgroundColor: getFuelTypeColor(option.value) }]} />
                    <View style={styles.modalOptionText}>
                      <Text style={[
                        styles.modalOptionTextMain,
                        formData.fuelType === option.value && styles.modalOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                      <Text style={styles.modalOptionTextSub}>
                        {option.description}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowFuelTypePicker(false)}
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
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 24,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 24,
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
  fuelTypeInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  fuelTypeInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  fuelTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fuelTypeColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  fuelTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    width: 40,
  },
  fuelTypeDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    flex: 1,
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
    fontWeight: 'bold',
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
    backgroundColor: 'rgba(240, 195, 142, 0.5)',
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
    backgroundColor: '#312C51',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(240, 195, 142, 0.2)',
  },
  modalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalFuelTypeColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  modalOptionText: {
    flex: 1,
  },
  modalOptionTextMain: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: '#F0C38E',
  },
  modalOptionTextSub: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  modalCancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
});