import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions,
  TextInput,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { generateUUID } from '../utils/uuid';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { formatCurrency } from '../constants/currency';
import { EXPENSE_CATEGORIES } from '../constants/expenseCategories';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

interface ExpenseItem {
  id: string;
  category: string;
  description: string;
  amountCDF: number;
  amountUSD: number;
  memo: string;
  receiptImage?: string;
}

interface ExpenseForm {
  items: ExpenseItem[];
  totalCDF: number;
  totalUSD: number;
}

// Categories are now imported from constants/expenseCategories.ts

const EXCHANGE_RATE = 2850.50; // 1 USD = 2850.50 CDF

export default function ExpenseEntryScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>({
    items: [
      {
        id: '1',
        category: '',
        description: '',
        amountCDF: 0,
        amountUSD: 0,
        memo: '',
      },
      {
        id: '2',
        category: '',
        description: '',
        amountCDF: 0,
        amountUSD: 0,
        memo: '',
      },
    ],
    totalCDF: 0,
    totalUSD: 0,
  });
  const [loading, setLoading] = useState(false);

  const calculateUSD = (cdfAmount: number): number => {
    return cdfAmount / EXCHANGE_RATE;
  };

  const calculateTotals = (items: ExpenseItem[]) => {
    const totalCDF = items.reduce((sum, item) => sum + item.amountCDF, 0);
    const totalUSD = items.reduce((sum, item) => sum + item.amountUSD, 0);
    return { totalCDF, totalUSD };
  };

  const updateExpenseItem = (id: string, field: keyof ExpenseItem, value: any) => {
    setExpenseForm(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // Auto-calculate USD when CDF changes
          if (field === 'amountCDF') {
            updatedItem.amountUSD = calculateUSD(updatedItem.amountCDF);
          }
          
          return updatedItem;
        }
        return item;
      });
      
      const { totalCDF, totalUSD } = calculateTotals(updatedItems);
      
      return {
        ...prev,
        items: updatedItems,
        totalCDF,
        totalUSD,
      };
    });
  };

  const addNewExpenseItem = () => {
    const newItem: ExpenseItem = {
      id: generateUUID(),
      category: '',
      description: '',
      amountCDF: 0,
      amountUSD: 0,
      memo: '',
    };
    
    setExpenseForm(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
  };

  const removeExpenseItem = (id: string) => {
    setExpenseForm(prev => {
      const updatedItems = prev.items.filter(item => item.id !== id);
      const { totalCDF, totalUSD } = calculateTotals(updatedItems);
      
      return {
        ...prev,
        items: updatedItems,
        totalCDF,
        totalUSD,
      };
    });
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Media library permission is needed to attach receipt images.');
      return false;
    }
    return true;
  };

  const attachReceipt = async (itemId: string) => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        updateExpenseItem(itemId, 'receiptImage', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Receipt attachment error:', error);
      Alert.alert('Error', 'Failed to attach receipt image');
    }
  };

  const removeReceipt = (itemId: string) => {
    updateExpenseItem(itemId, 'receiptImage', undefined);
  };

  const handleSubmitAll = async () => {
    try {
      setLoading(true);
      
      // Validate that all items have required fields
      const validItems = expenseForm.items.filter(item => 
        item.category && item.description && item.amountCDF > 0
      );
      
      if (validItems.length === 0) {
        Alert.alert('Validation Error', 'Please fill in at least one complete expense item.');
        return;
      }

      // Insert expenses into database
      for (const item of validItems) {
        const { error } = await supabase
          .from('expenses')
          .insert({
            category: item.category,
            description: item.description,
            amount: item.amountCDF,
            memo: item.memo,
            receipt_image: item.receiptImage,
            expense_date: new Date().toISOString().split('T')[0],
            payment_method: 'cash', // Default payment method
            created_by: appUser?.id,
          });

        if (error) {
          console.error('Error inserting expense:', error);
        }
      }
      
      Alert.alert('Success', 'All expenses submitted successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting expenses:', error);
      Alert.alert('Error', 'Failed to submit expenses');
    } finally {
      setLoading(false);
    }
  };

  const renderExpenseItem = (item: ExpenseItem, index: number) => (
    <View key={item.id} style={styles.expenseItem}>
      <View style={styles.expenseHeader}>
        <Text style={styles.expenseTitle}>Expense {index + 1}</Text>
        {expenseForm.items.length > 1 && (
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={() => removeExpenseItem(item.id)}
          >
            <Ionicons name="close-circle" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Dropdown */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Expense Category</Text>
        <TouchableOpacity 
          style={styles.dropdownContainer}
          onPress={() => {
            const currentIndex = EXPENSE_CATEGORIES.indexOf(item.category as any);
            const nextIndex = (currentIndex + 1) % EXPENSE_CATEGORIES.length;
            updateExpenseItem(item.id, 'category', EXPENSE_CATEGORIES[nextIndex]);
          }}
        >
          <Text style={[styles.dropdownText, !item.category && styles.placeholderText]}>
            {item.category || 'Select a category'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#666" />
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
          placeholderTextColor="#999"
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
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.amountGroup}>
          <Text style={styles.inputLabel}>Amount (USD)</Text>
          <TextInput
            style={[styles.textInput, styles.autoInput]}
            value={item.amountUSD > 0 ? item.amountUSD.toFixed(2) : ''}
            placeholder="Auto"
            placeholderTextColor="#999"
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
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Receipt Attachment */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Attach Receipt</Text>
        <TouchableOpacity 
          style={styles.receiptContainer}
          onPress={() => attachReceipt(item.id)}
        >
          {item.receiptImage ? (
            <View style={styles.receiptImageContainer}>
              <Image source={{ uri: item.receiptImage }} style={styles.receiptImage} />
              <TouchableOpacity 
                style={styles.removeReceiptButton}
                onPress={() => removeReceipt(item.id)}
              >
                <Ionicons name="close-circle" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.receiptPlaceholder}>
              <Ionicons name="attach" size={24} color="#666" />
              <Text style={styles.receiptPlaceholderText}>Attach a file</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient colors={['#312C51', '#48426D']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Expenses</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Expense Items */}
          {expenseForm.items.map((item, index) => renderExpenseItem(item, index))}
          
          {/* Add New Item Button */}
          <TouchableOpacity style={styles.addItemButton} onPress={addNewExpenseItem}>
            <Ionicons name="add" size={24} color="#312C51" />
            <Text style={styles.addItemText}>Add New Item</Text>
          </TouchableOpacity>

          {/* Total Summary */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Expenses:</Text>
            <View style={styles.totalAmounts}>
              <Text style={styles.totalCDF}>{formatCurrency.CDF(expenseForm.totalCDF)}</Text>
              <Text style={styles.totalUSD}>{formatCurrency.USD(expenseForm.totalUSD)}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmitAll}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>Submit All</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  content: {
    flex: 1,
    padding: 16,
  },
  expenseItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  removeButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '600',
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  textInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 14,
    color: '#333',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  autoInput: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  memoInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  receiptContainer: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  receiptImageContainer: {
    position: 'relative',
  },
  receiptImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeReceiptButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  receiptPlaceholder: {
    alignItems: 'center',
  },
  receiptPlaceholderText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#312C51',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addItemText: {
    fontSize: 16,
    color: '#312C51',
    fontWeight: '600',
    marginLeft: 8,
  },
  totalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  totalAmounts: {
    alignItems: 'center',
  },
  totalCDF: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  totalUSD: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});