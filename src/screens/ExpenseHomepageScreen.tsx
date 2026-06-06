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
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { formatCurrency } from '../constants/currency';
import { EXPENSE_CATEGORIES } from '../constants/expenseCategories';

const { width } = Dimensions.get('window');

interface ExpenseStats {
  todayTotal: number;
  weeklyTotal: number;
  monthlyTotal: number;
}

interface CategoryExpense {
  category: string;
  amount: number;
  percentage: number;
}

const STATIONS = ['ISSIRO STATION', 'DEPOT ISSIRO', 'RUNGU STATION', 'DUNGU STATION', 'DURBA STATION', 'NIANGARA STATION'];

export default function ExpenseHomepageScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [selectedStation, setSelectedStation] = useState('ISSIRO STATION');
  const [expenseStats, setExpenseStats] = useState<ExpenseStats>({
    todayTotal: 0,
    weeklyTotal: 0,
    monthlyTotal: 0,
  });
  const [topCategories, setTopCategories] = useState<CategoryExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadExpenseData = useCallback(async () => {
    try {
      setLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Load today's expenses
      const { data: todayExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('expense_date', today);

      const todayTotal = todayExpenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;

      // Load weekly expenses
      const { data: weeklyExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', weekAgo);

      const weeklyTotal = weeklyExpenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;

      // Load monthly expenses
      const { data: monthlyExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .gte('expense_date', monthAgo);

      const monthlyTotal = monthlyExpenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;

      setExpenseStats({
        todayTotal,
        weeklyTotal,
        monthlyTotal,
      });

      // Load top categories for this week
      const { data: categoryExpenses } = await supabase
        .from('expenses')
        .select('category, amount')
        .gte('expense_date', weekAgo);

      if (categoryExpenses) {
        const categoryTotals = categoryExpenses.reduce((acc, expense) => {
          acc[expense.category] = (acc[expense.category] || 0) + (expense.amount || 0);
          return acc;
        }, {} as Record<string, number>);

        const sortedCategories = Object.entries(categoryTotals)
          .map(([category, amount]) => ({
            category,
            amount,
            percentage: weeklyTotal > 0 ? (amount / weeklyTotal) * 100 : 0,
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3);

        setTopCategories(sortedCategories);
      }

    } catch (error) {
      console.error('Error loading expense data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadExpenseData();
  }, [loadExpenseData]);

  const handleStationChange = () => {
    const currentIndex = STATIONS.indexOf(selectedStation);
    const nextIndex = (currentIndex + 1) % STATIONS.length;
    setSelectedStation(STATIONS[nextIndex]);
  };

  const handleAddNewExpense = () => {
    navigation.navigate('ExpenseEntry' as never);
  };

  const handleViewExpenseHistory = () => {
    navigation.navigate('ExpenseHistory' as never);
  };

  const handleManageCategories = () => {
    Alert.alert('Manage Categories', 'Category management feature will be implemented');
  };

  const handleViewAllCategories = () => {
    navigation.navigate('ExpenseHistory' as never);
  };

  const renderProgressBar = (percentage: number) => (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBar, { width: `${Math.min(percentage, 100)}%` }]} />
    </View>
  );

  const renderCategoryItem = (category: CategoryExpense, index: number) => (
    <View key={index} style={styles.categoryItem}>
      <Text style={styles.categoryName}>{category.category}</Text>
      <View style={styles.categoryProgress}>
        {renderProgressBar(category.percentage)}
      </View>
      <Text style={styles.categoryAmount}>{formatCurrency.CDF(category.amount)}</Text>
    </View>
  );

  useEffect(() => {
    loadExpenseData();
  }, [loadExpenseData]);

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
            <Text style={styles.headerTitle}>Expenses</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Station Selector */}
          <View style={styles.stationContainer}>
            <TouchableOpacity style={styles.stationButton} onPress={handleStationChange}>
              <Text style={styles.stationText}>{selectedStation}</Text>
              <Ionicons name="chevron-down" size={16} color="#F0C38E" />
            </TouchableOpacity>
          </View>

          {/* Total Expenses Today */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Expenses (Today)</Text>
            <Text style={styles.totalAmount}>{formatCurrency.CDF(expenseStats.todayTotal)}</Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <TouchableOpacity style={styles.primaryActionButton} onPress={handleAddNewExpense}>
              <Ionicons name="add" size={24} color="#312C51" />
              <Text style={styles.primaryActionText}>Add New Expense</Text>
            </TouchableOpacity>

            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity style={styles.secondaryActionButton} onPress={handleViewExpenseHistory}>
                <Ionicons name="time" size={20} color="#ffffff" />
                <Text style={styles.secondaryActionText}>View Expense History</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryActionButton} onPress={handleManageCategories}>
                <Ionicons name="business" size={20} color="#ffffff" />
                <Text style={styles.secondaryActionText}>Manage Categories</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Trends */}
          <View style={styles.trendsContainer}>
            <View style={styles.trendsHeader}>
              <Text style={styles.sectionTitle}>Recent Trends</Text>
              <TouchableOpacity onPress={handleViewAllCategories}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.categoriesContainer}>
              <Text style={styles.categoriesSubtitle}>Top Categories (This Week)</Text>
              
              {topCategories.length > 0 ? (
                topCategories.map((category, index) => renderCategoryItem(category, index))
              ) : (
                <View style={styles.emptyCategories}>
                  <Text style={styles.emptyText}>No expense data available</Text>
                </View>
              )}
            </View>
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
  stationContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  stationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stationText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  totalContainer: {
    paddingHorizontal: 16,
    marginBottom: 30,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F0C38E',
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0C38E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#312C51',
    marginLeft: 8,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
  },
  secondaryActionText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 6,
    textAlign: 'center',
  },
  trendsContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  trendsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#F0C38E',
    fontWeight: '600',
  },
  categoriesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  categoriesSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 16,
    fontWeight: '600',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    color: '#ffffff',
    width: 80,
  },
  categoryProgress: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 4,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  categoryAmount: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    width: 80,
    textAlign: 'right',
  },
  emptyCategories: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});