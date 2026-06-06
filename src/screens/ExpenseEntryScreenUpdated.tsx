import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { generateUUID } from '../utils/uuid';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../constants/colors';
import { EXPENSE_CATEGORIES } from '../constants/expenseCategories';

interface ExpenseItem {
  id: string;
  category: string;
  description: string;
  amountCDF: number;
  amountUSD: number;
  memo: string;
  receiptUri?: string;
}

interface Station {
  id: string;
  name: string;
  code: string;
}

const STATIONS: Station[] = [
  { id: '1', name: 'ISSIRO STATION', code: 'ISS001' },
  { id: '2', name: 'DEPOT ISSIRO', code: 'DIP002' },
  { id: '3', name: 'RUNGU STATION', code: 'RUN003' },
  { id: '4', name: 'DUNGU STATION', code: 'DUN004' },
  { id: '5', name: 'DURBA STATION', code: 'DUR005' },
  { id: '6', name: 'NIANGARA STATION', code: 'NIA006' },
];

const EXCHANGE_RATE = 2850.50; // 1 USD = 2850.50 CDF

export default function ExpenseEntryScreenUpdated() {
  const navigation = useNavigation();
  const route = useRoute();
  const [currentDate] = useState(new Date().toLocaleDateString('en-GB'));
  
  // Get station from route params or default to first station
  const routeStation = (route.params as any)?.station;
  const [selectedStation, setSelectedStation] = useState<Station>(
    routeStation || STATIONS[0]
  );

  // Expense items
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([
    {
      id: '1',
      category: '',
      description: '',
      amountCDF: 0,
      amountUSD: 0,
      memo: '',
    },
  ]);

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);

  // Calculate totals
  const totalCDF = expenseItems.reduce((sum, item) => sum + item.amountCDF, 0);
  const totalUSD = expenseItems.reduce((sum, item) => sum + item.amountUSD, 0);

  const addNewExpense = () => {
    const newExpense: ExpenseItem = {
      id: generateUUID(),
      category: '',
      description: '',
      amountCDF: 0,
      amountUSD: 0,
      memo: '',
    };
    setExpenseItems(prev => [...prev, newExpense]);
  };

  const updateExpenseItem = (itemId: string, field: keyof ExpenseItem, value: any) => {
    setExpenseItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate USD when CDF changes
        if (field === 'amountCDF') {
          updatedItem.amountUSD = value / EXCHANGE_RATE;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const removeExpenseItem = (itemId: string) => {
    if (expenseItems.length > 1) {
      setExpenseItems(prev => prev.filter(item => item.id !== itemId));
    } else {
      Alert.alert('Cannot Remove', 'At least one expense item is required');
    }
  };

  const selectCategory = (category: string) => {
    if (editingItem) {
      updateExpenseItem(editingItem.id, 'category', category);
      setEditingItem(null);
    }
    setShowCategoryModal(false);
  };

  const pickReceipt = async (itemId: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        updateExpenseItem(itemId, 'receiptUri', result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSubmit = () => {
    // Validate all expense items
    const hasEmptyFields = expenseItems.some(item => 
      !item.category || !item.description || item.amountCDF <= 0
    );

    if (hasEmptyFields) {
      Alert.alert('Validation Error', 'Please fill in all required fields for all expense items');
      return;
    }

    Alert.alert(
      'Submit Expenses',
      `Submit ${expenseItems.length} expense items totaling ${totalCDF.toLocaleString()} CDF?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: () => {
            Alert.alert('Success', 'Expenses submitted successfully');
            navigation.goBack();
          },
        },
      ]
    );
  };

  const renderExpenseItem = (item: ExpenseItem, index: number) => (
    <View key={item.id} style={styles.expenseCard}>
      <View style={styles.expenseHeader}>
        <Text style={styles.expenseTitle}>Expense {index + 1}</Text>
        {expenseItems.length > 1 && (
          <TouchableOpacity onPress={() => removeExpenseItem(item.id)}>
            <Ionicons name="trash" size={20} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Expense Category */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Expense Category</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => {
            setEditingItem(item);
            setShowCategoryModal(true);
          }}
        >
          <Text style={[styles.dropdownText, !item.category && styles.placeholderText]}>
            {item.category || 'Select a category'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={styles.textInput}
          value={item.description}
          onChangeText={(text) => updateExpenseItem(item.id, 'description', text)}
          placeholder="Enter a description"
          placeholderTextColor={Colors.textLight}
        />
      </View>

      {/* Amount Fields */}
      <View style={styles.amountRow}>
        <View style={styles.amountGroup}>
          <Text style={styles.inputLabel}>Amount (CDF)</Text>
          <TextInput
            style={styles.textInput}
            value={item.amountCDF > 0 ? item.amountCDF.toString() : ''}
            onChangeText={(text) => updateExpenseItem(item.id, 'amountCDF', parseFloat(text) || 0)}
            placeholder="Enter amount"
            placeholderTextColor={Colors.textLight}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.amountGroup}>
          <Text style={styles.inputLabel}>Amount (USD)</Text>
          <TextInput
            style={[styles.textInput, styles.autoInput]}
            value={item.amountUSD > 0 ? item.amountUSD.toFixed(2) : ''}
            placeholder="Auto"
            placeholderTextColor={Colors.textLight}
            editable={false}
          />
        </View>
      </View>

      {/* Memo */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Memo / Notes</Text>
        <TextInput
          style={[styles.textInput, styles.memoInput]}
          value={item.memo}
          onChangeText={(text) => updateExpenseItem(item.id, 'memo', text)}
          placeholder="Add a note or context..."
          placeholderTextColor={Colors.textLight}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Attach Receipt */}
      <TouchableOpacity
        style={styles.attachButton}
        onPress={() => pickReceipt(item.id)}
      >
        <Ionicons name="attach" size={20} color={Colors.primary} />
        <Text style={styles.attachButtonText}>
          {item.receiptUri ? 'Receipt Attached' : 'Attach Receipt'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={Colors.textWhite} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Add Expenses (Updated)</Text>
          <Text style={styles.headerDate}>Date: {currentDate}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Station Info */}
        <View style={styles.stationInfo}>
          <Ionicons name="location" size={16} color={Colors.textSecondary} />
          <Text style={styles.stationText}>{selectedStation.name} ({selectedStation.code})</Text>
        </View>

        {/* Expense Items */}
        {expenseItems.map((item, index) => renderExpenseItem(item, index))}

        {/* Add New Item Button */}
        <TouchableOpacity style={styles.addItemButton} onPress={addNewExpense}>
          <Ionicons name="add-circle" size={20} color={Colors.accent} />
          <Text style={styles.addItemText}>Add New Item</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Expenses:</Text>
          <View style={styles.totalAmounts}>
            <Text style={styles.totalCDF}>CDF {totalCDF.toLocaleString()}</Text>
            <Text style={styles.totalUSD}>${totalUSD.toFixed(2)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit All</Text>
        </TouchableOpacity>
      </View>

      {/* Category Selection Modal */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={EXPENSE_CATEGORIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => selectCategory(item)}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textWhite,
  },
  headerDate: {
    fontSize: 14,
    color: Colors.textWhite,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 8,
  },
  stationText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  expenseCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  expenseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
  },
  placeholderText: {
    color: Colors.textLight,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  autoInput: {
    backgroundColor: Colors.backgroundSecondary,
    color: Colors.textSecondary,
  },
  memoInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountGroup: {
    flex: 1,
    marginHorizontal: 5,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 15,
    marginTop: 10,
  },
  attachButtonText: {
    fontSize: 16,
    color: Colors.primary,
    marginLeft: 8,
    fontWeight: '600',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 15,
    marginBottom: 20,
  },
  addItemText: {
    fontSize: 16,
    color: Colors.accent,
    marginLeft: 8,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 20,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  totalAmounts: {
    alignItems: 'flex-end',
  },
  totalCDF: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  totalUSD: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  submitButton: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    color: Colors.textWhite,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  modalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
});