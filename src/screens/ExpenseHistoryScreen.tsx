import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { formatCurrency } from '../constants/currency';
import { EXPENSE_CATEGORIES, getCategoryIcon } from '../constants/expenseCategories';

const { width } = Dimensions.get('window');

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  memo?: string;
  receipt_image?: string;
  expense_date: string;
  created_by: string;
}

// Categories and icons are now imported from constants/expenseCategories.ts

export default function ExpenseHistoryScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (error) {
        console.error('Error loading expenses:', error);
        return;
      }

      setExpenses(data || []);
      setFilteredExpenses(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const filterExpenses = useCallback(() => {
    let filtered = expenses;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(expense =>
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.memo?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter(expense =>
        expense.expense_date === selectedDate
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(expense =>
        expense.category === selectedCategory
      );
    }

    setFilteredExpenses(filtered);
  }, [expenses, searchQuery, selectedDate, selectedCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadExpenses();
  }, [loadExpenses]);

  const handleEditExpense = (expense: Expense) => {
    Alert.alert('Edit Expense', 'Edit functionality will be implemented');
  };

  const handleDeleteExpense = (expenseId: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expenseId);

              if (error) {
                console.error('Error deleting expense:', error);
                Alert.alert('Error', 'Failed to delete expense');
                return;
              }

              // Reload expenses
              loadExpenses();
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense');
            }
          }
        }
      ]
    );
  };

  const showDateFilter = () => {
    Alert.alert(
      'Filter by Date',
      'Select date filter',
      [
        { text: 'All Dates', onPress: () => setSelectedDate('') },
        { text: 'Today', onPress: () => setSelectedDate(new Date().toISOString().split('T')[0]) },
        { text: 'This Week', onPress: () => setSelectedDate('week') },
        { text: 'This Month', onPress: () => setSelectedDate('month') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const showCategoryFilter = () => {
    Alert.alert(
      'Filter by Category',
      'Select category filter',
      [
        { text: 'All Categories', onPress: () => setSelectedCategory('') },
        ...EXPENSE_CATEGORIES.map(category => ({
          text: category,
          onPress: () => setSelectedCategory(category)
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    filterExpenses();
  }, [filterExpenses]);

  const renderExpenseItem = (expense: Expense) => (
    <View key={expense.id} style={styles.expenseCard}>
      <View style={styles.expenseHeader}>
        <View style={styles.expenseInfo}>
          <View style={styles.categoryIcon}>
            <Ionicons name={getCategoryIcon(expense.category) as any} size={20} color="#312C51" />
          </View>
          <View style={styles.expenseDetails}>
            <Text style={styles.categoryText}>{expense.category}</Text>
            <Text style={styles.dateText}>{new Date(expense.expense_date).toLocaleDateString('en-GB')}</Text>
          </View>
        </View>
        <View style={styles.expenseActions}>
          <Text style={styles.amountText}>{formatCurrency.USD(expense.amount / 2850.50)}</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleEditExpense(expense)}
          >
            <Ionicons name="pencil" size={16} color="#312C51" />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.descriptionText}>{expense.description}</Text>
      
      {expense.memo && (
        <Text style={styles.memoText}>{expense.memo}</Text>
      )}
      
      {expense.receipt_image && (
        <View style={styles.receiptContainer}>
          <Image source={{ uri: expense.receipt_image }} style={styles.receiptThumbnail} />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient colors={['#312C51', '#48426D']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expense History</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <View style={styles.content}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search expenses"
              placeholderTextColor="#999"
            />
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <TouchableOpacity 
              style={[styles.filterButton, selectedDate && styles.activeFilterButton]}
              onPress={showDateFilter}
            >
              <Text style={[styles.filterButtonText, selectedDate && styles.activeFilterButtonText]}>
                Date
              </Text>
              <Ionicons name="chevron-down" size={16} color={selectedDate ? "#ffffff" : "#666"} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterButton, selectedCategory && styles.activeFilterButton]}
              onPress={showCategoryFilter}
            >
              <Text style={[styles.filterButtonText, selectedCategory && styles.activeFilterButtonText]}>
                Category
              </Text>
              <Ionicons name="chevron-down" size={16} color={selectedCategory ? "#ffffff" : "#666"} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => navigation.navigate('ExpenseEntry' as never)}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
              <Text style={styles.addButtonText}>Add New</Text>
            </TouchableOpacity>
          </View>

          {/* Expenses List */}
          <ScrollView 
            style={styles.expensesList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading expenses...</Text>
              </View>
            ) : filteredExpenses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No expenses found</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery || selectedDate || selectedCategory 
                    ? 'Try adjusting your filters' 
                    : 'Add your first expense to get started'
                  }
                </Text>
              </View>
            ) : (
              filteredExpenses.map(renderExpenseItem)
            )}
          </ScrollView>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#312C51',
    borderColor: '#312C51',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  activeFilterButtonText: {
    color: '#ffffff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 4,
  },
  expensesList: {
    flex: 1,
  },
  expenseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseDetails: {
    flex: 1,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  expenseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  editButton: {
    padding: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  memoText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  receiptContainer: {
    marginTop: 8,
  },
  receiptThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});