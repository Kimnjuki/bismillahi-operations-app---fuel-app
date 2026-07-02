import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { formatCurrency, convertCurrency } from '../constants/currency';
import { EXPENSE_CATEGORIES, getCategoryIcon, getCategoryColor } from '../constants/expenseCategories';
import { Colors } from '../constants/theme';
import { useExpenses, useExpenseMutations, useExpenseSummary, ExpensesFilter } from '../hooks/useExpenses';

const { width } = Dimensions.get('window');

interface Station {
  id: string;
  name: string;
  station_name?: string;
  station_code?: string;
  location?: string;
  is_active: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Define theme colors that match the app's dark theme as specified in theme.ts
const THEME = {
  background: '#1A1A2E',
  card: '#16213E',
  primary: '#F5A623',
  primaryDark: '#C47D0E',
  primaryLight: '#FFD580',
  surface: 'rgba(245,166,35,0.10)',
  white: '#FFFFFF',
  danger: '#F44336',
  success: '#4CAF50',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#808080',
  border: '#2A2A4A',
  inputBg: '#1A1A2E',
  overlay: 'rgba(0,0,0,0.6)',
};

// Memoized expense item component for FlashList
const ExpenseItem = memo(({ 
  expense, 
  onEdit, 
  onDelete 
}: { 
  expense: any; 
  onEdit: (expense: any) => void; 
  onDelete: (id: string) => void;
}) => {
  const catColor = getCategoryColor(expense.category);
  const amountUSD = convertCurrency.CDF_TO_USD(expense.amount);
  
  return (
    <View style={styles.expenseCard}>
      <View style={styles.expenseHeader}>
        <View style={styles.expenseInfo}>
          <View style={[styles.categoryIcon, { backgroundColor: catColor + '20' }]}>
            <Ionicons name={getCategoryIcon(expense.category) as any} size={20} color={catColor} />
          </View>
          <View style={styles.expenseDetails}>
            <Text style={styles.categoryText}>{expense.category}</Text>
            <Text style={styles.dateText}>{new Date(expense.expense_date).toLocaleDateString('en-GB')}</Text>
          </View>
        </View>
        <View style={styles.expenseActions}>
          <View style={styles.amountColumn}>
            <Text style={[styles.amountText, { color: catColor }]}>
              {formatCurrency.CDF(expense.amount)}
            </Text>
            <Text style={styles.amountUSDText}>
              {formatCurrency.USD(amountUSD)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEdit(expense)}
          >
            <Ionicons name="pencil" size={16} color="#F5A623" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButtonIcon}
            onPress={() => onDelete(expense.id)}
          >
            <Ionicons name="trash-outline" size={16} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>

      {expense.description ? (
        <Text style={styles.descriptionText}>{expense.description}</Text>
      ) : null}

      {expense.memo ? (
        <Text style={styles.memoText}>{expense.memo}</Text>
      ) : null}

      {expense.receipt_image ? (
        <View style={styles.receiptContainer}>
          <Image source={{ uri: expense.receipt_image }} style={styles.receiptThumbnail} />
        </View>
      ) : null}
    </View>
  );
});

export default function ExpenseHistoryScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  
  // Use paginated React Query hook
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ExpensesFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedStationName, setSelectedStationName] = useState<string>('All Stations');
  const [stations, setStations] = useState<Station[]>([]);
  const [showStationPicker, setShowStationPicker] = useState(false);

  // Date filter state
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Month picker state
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(-1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([...EXPENSE_CATEGORIES]);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Edit expense modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    category: '',
    amount: '',
    currency: 'CDF',
    description: '',
    memo: '',
    expense_date: '',
    station_id: '',
  });
  const [saving, setSaving] = useState(false);

  // Add category modal
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Use the paginated hook
  const {
    expenses,
    totalCount,
    hasMore,
    isLoading,
    isFetching,
    refetch,
    prefetchNext,
  } = useExpenses(filter, page);

  // Mutations with optimistic updates
  const { updateExpense, deleteExpense } = useExpenseMutations();

  // Expense summary
  const { data: categoryTotals = [] } = useExpenseSummary(filter);

  // Apply filters when they change
  useEffect(() => {
    setPage(1);
    setFilter({
      stationId: selectedStation || undefined,
      category: selectedCategory || undefined,
      dateFrom: dateRangeStart || undefined,
      dateTo: dateRangeEnd || undefined,
      searchQuery: searchQuery || undefined,
    });
  }, [selectedStation, selectedCategory, dateRangeStart, dateRangeEnd, searchQuery]);

  const loadStations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        const { data: data2, error: error2 } = await supabase
          .from('stations')
          .select('*')
          .order('station_name', { ascending: true });

        if (!error2 && data2) {
          const { data: settingsData } = await supabase
            .from('station_settings')
            .select('*');
          
          const mergedStations = [...data2];
          if (settingsData) {
            settingsData.forEach((s: any) => {
              if (!mergedStations.find((ms: any) => ms.id === s.selected_station_id)) {
                mergedStations.push({
                  id: s.selected_station_id,
                  name: s.selected_station_id,
                  station_name: s.selected_station_id,
                  is_active: true,
                } as any);
              }
            });
          }
          setStations(mergedStations);
          return;
        }
        console.error('Error loading stations:', error);
        return;
      }

      const { data: settingsData } = await supabase
        .from('station_settings')
        .select('*');
      
      const mergedStations = [...(data || [])];
      if (settingsData) {
        settingsData.forEach((s: any) => {
          if (!mergedStations.find((ms: any) => ms.id === s.selected_station_id)) {
            mergedStations.push({
              id: s.selected_station_id,
              name: s.selected_station_id,
              station_name: s.selected_station_id,
              is_active: true,
            } as any);
          }
        });
      }

      setStations(mergedStations);
    } catch (error) {
      console.error('Error loading stations:', error);
    }
  }, []);

  const loadExpenseCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('name')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        setExpenseCategories(data.map((c: any) => c.name));
      }
    } catch (error) {
      console.error('Error loading expense categories:', error);
    }
  }, []);

  const applyDateFilter = (filterType: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    setSelectedDateFilter(filterType);
    setSelectedMonth(-1);

    switch (filterType) {
      case 'today': {
        setDateRangeStart(todayStr);
        setDateRangeEnd(todayStr);
        break;
      }
      case 'week': {
        const startOfWeek = new Date(today);
        const day = today.getDay();
        const diff = day === 0 ? 6 : day - 1;
        startOfWeek.setDate(today.getDate() - diff);
        setDateRangeStart(startOfWeek.toISOString().split('T')[0]);
        setDateRangeEnd(todayStr);
        break;
      }
      case 'month': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setDateRangeStart(startOfMonth.toISOString().split('T')[0]);
        setDateRangeEnd(todayStr);
        break;
      }
      case 'custom': {
        setCustomStartDate('');
        setCustomEndDate('');
        setDatePickerMode('start');
        setShowDatePicker(true);
        return;
      }
      case 'all':
      default: {
        setDateRangeStart('');
        setDateRangeEnd('');
        break;
      }
    }
  };

  const applyMonthFilter = (monthIndex: number, year: number) => {
    const startOfMonth = new Date(year, monthIndex, 1);
    const endOfMonth = new Date(year, monthIndex + 1, 0);
    
    setSelectedMonth(monthIndex);
    setSelectedYear(year);
    setSelectedDateFilter('month');
    setDateRangeStart(startOfMonth.toISOString().split('T')[0]);
    setDateRangeEnd(endOfMonth.toISOString().split('T')[0]);
    setShowMonthPicker(false);
  };

  const showDateFilterOptions = () => {
    Alert.alert(
      'Filter by Date',
      'Select a date range',
      [
        { text: 'All Dates', onPress: () => applyDateFilter('all') },
        { text: 'Today', onPress: () => applyDateFilter('today') },
        { text: 'This Week', onPress: () => applyDateFilter('week') },
        { text: 'This Month', onPress: () => applyDateFilter('month') },
        { text: 'Pick a Month...', onPress: () => {
          setCalendarMonth(new Date().getMonth() + 1);
          setCalendarYear(new Date().getFullYear());
          setShowMonthPicker(true);
        }},
        { text: 'Custom Range', onPress: () => applyDateFilter('custom') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month - 1, 1).getDay();

  const changeCalendarMonth = (delta: number) => {
    let m = calendarMonth + delta;
    let y = calendarYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setCalendarMonth(m);
    setCalendarYear(y);
  };

  const handleDateSelect = (day: number) => {
    const month = calendarMonth;
    const year = calendarYear;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (datePickerMode === 'start') {
      setCustomStartDate(dateStr);
      setDatePickerMode('end');
    } else {
      setCustomEndDate(dateStr);
      if (customStartDate) {
        setDateRangeStart(customStartDate);
        setDateRangeEnd(dateStr);
        setShowDatePicker(false);
        setSelectedDateFilter('custom');
      }
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
    const daysToRender: Array<{ day: number; empty: boolean }> = [];
    for (let i = 0; i < firstDay; i++) daysToRender.push({ day: 0, empty: true });
    for (let day = 1; day <= daysInMonth; day++) daysToRender.push({ day, empty: false });
    return daysToRender;
  };

  const onRefresh = useCallback(() => {
    refetch();
    loadStations();
  }, [refetch, loadStations]);

  // Load more expenses (pagination)
  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) {
      const nextPage = page + 1;
      setPage(nextPage);
      prefetchNext();
    }
  }, [hasMore, isFetching, page, prefetchNext]);

  // Edit expense functions
  const openEditModal = useCallback((expense: any) => {
    setEditingExpense(expense);
    setEditForm({
      category: expense.category,
      amount: expense.amount.toString(),
      currency: expense.currency || 'CDF',
      description: expense.description || '',
      memo: expense.memo || '',
      expense_date: expense.expense_date,
      station_id: expense.station_id || '',
    });
    setShowEditModal(true);
  }, []);

  const handleUpdateExpense = async () => {
    if (!editingExpense) return;
    if (!editForm.category || !editForm.amount) {
      Alert.alert('Validation Error', 'Category and amount are required');
      return;
    }

    const amountValue = parseFloat(editForm.amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      await updateExpense.mutateAsync({
        id: editingExpense.id,
        category: editForm.category,
        amount: amountValue,
        currency: editForm.currency,
        description: editForm.description,
        memo: editForm.memo,
        expense_date: editForm.expense_date,
      });

      Alert.alert('Success', 'Expense updated successfully');
      setShowEditModal(false);
      setEditingExpense(null);
    } catch (error: any) {
      console.error('Error updating expense:', error);
      Alert.alert('Error', `Failed to update expense: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = useCallback((expenseId: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense.mutateAsync(expenseId);
              Alert.alert('Success', 'Expense deleted');
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense');
            }
          }
        }
      ]
    );
  }, [deleteExpense]);

  // Add Category functions
  const handleAddCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    if (expenseCategories.includes(trimmedName)) {
      Alert.alert('Error', 'This category already exists');
      return;
    }

    try {
      const { error } = await supabase
        .from('expense_categories')
        .insert([{
          name: trimmedName,
          is_active: true,
          created_by: appUser?.id,
        }])
        .select();

      if (error) {
        console.error('Error adding category to DB:', error);
      }

      setExpenseCategories(prev => [...prev, trimmedName]);
      setNewCategoryName('');
      setShowAddCategoryModal(false);
      Alert.alert('Success', `Category "${trimmedName}" added`);
    } catch (error) {
      console.error('Error adding category:', error);
      setExpenseCategories(prev => [...prev, trimmedName]);
      setNewCategoryName('');
      setShowAddCategoryModal(false);
      Alert.alert('Success', `Category "${trimmedName}" added locally`);
    }
  };

  const showCategoryFilter = () => {
    const options = [
      { text: 'All Categories', onPress: () => setSelectedCategory('') },
      ...expenseCategories.map(category => ({
        text: category,
        onPress: () => setSelectedCategory(category)
      })),
      { text: '---', onPress: () => {} },
      { text: '+ Add Category', onPress: () => {
        setNewCategoryName('');
        setShowAddCategoryModal(true);
      }},
      { text: 'Cancel', style: 'cancel' as const }
    ];

    Alert.alert(
      'Filter by Category',
      'Select a category or add a new one',
      options
    );
  };

  const getDateFilterLabel = () => {
    if (selectedMonth >= 0) {
      return `${MONTHS[selectedMonth]} ${selectedYear}`;
    }
    switch (selectedDateFilter) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'custom': {
        if (dateRangeStart && dateRangeEnd) {
          if (dateRangeStart === dateRangeEnd) {
            return new Date(dateRangeStart).toLocaleDateString('en-GB');
          }
          return `${new Date(dateRangeStart).toLocaleDateString('en-GB')} - ${new Date(dateRangeEnd).toLocaleDateString('en-GB')}`;
        }
        return 'Date';
      }
      default: return 'Date';
    }
  };

  useEffect(() => {
    loadStations();
    loadExpenseCategories();
  }, [loadStations, loadExpenseCategories]);

  // Show category picker in edit modal
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery) return expenseCategories;
    return expenseCategories.filter(cat =>
      cat.toLowerCase().includes(categorySearchQuery.toLowerCase())
    );
  }, [expenseCategories, categorySearchQuery]);

  const renderCategoryPicker = () => (
    <Modal visible={showCategoryPicker} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.categoryPickerModal}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
              <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.categorySearchContainer}>
            <MaterialCommunityIcons name="magnify" size={18} color="#999" style={styles.categorySearchIcon} />
            <TextInput
              style={styles.categorySearchInput}
              value={categorySearchQuery}
              onChangeText={setCategorySearchQuery}
              placeholder="Search categories..."
              placeholderTextColor="#999"
            />
            {categorySearchQuery ? (
              <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>

          <FlatList
            data={filteredCategories}
            keyExtractor={(item: string) => item}
            numColumns={2}
            columnWrapperStyle={styles.categoryGridRow}
            renderItem={({ item }) => {
              const catColor = getCategoryColor(item);
              const isActive = editForm.category === item;
              return (
                <TouchableOpacity
                  style={[styles.categoryPickerChip, isActive && styles.categoryPickerChipActive]}
                  onPress={() => {
                    setEditForm({ ...editForm, category: item });
                    setShowCategoryPicker(false);
                    setCategorySearchQuery('');
                  }}
                >
                  <View style={[styles.categoryPickerIcon, { backgroundColor: catColor + '20' }]}>
                    <MaterialCommunityIcons name={getCategoryIcon(item) as any} size={16} color={catColor} />
                  </View>
                  <Text style={[styles.categoryPickerText, isActive && styles.categoryPickerTextActive]} numberOfLines={1}>
                    {item}
                  </Text>
                  {isActive && <MaterialCommunityIcons name="check" size={16} color="#F5A623" style={styles.categoryCheckIcon} />}
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyListContainer}>
                <Text style={styles.emptyListText}>No categories found</Text>
              </View>
            }
          />

          <TouchableOpacity
            style={styles.addCategoryButton}
            onPress={() => {
              setShowCategoryPicker(false);
              setNewCategoryName('');
              setShowAddCategoryModal(true);
            }}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#F5A623" />
            <Text style={styles.addCategoryButtonText}>Add New Category</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderStationPicker = () => (
    <Modal visible={showStationPicker} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Station</Text>
            <TouchableOpacity onPress={() => setShowStationPicker(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.stationOption, !selectedStation && styles.stationOptionActive]}
            onPress={() => {
              setSelectedStation('');
              setSelectedStationName('All Stations');
              setShowStationPicker(false);
            }}
          >
            <Ionicons
              name="business-outline"
              size={20}
              color={!selectedStation ? '#F5A623' : '#B0B0B0'}
            />
            <Text style={[styles.stationOptionText, !selectedStation && styles.stationOptionTextActive]}>
              All Stations
            </Text>
            {!selectedStation && <Ionicons name="checkmark" size={20} color="#F5A623" />}
          </TouchableOpacity>

          <FlatList
            data={stations}
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }) => {
              const stationName = item.name || item.station_name || item.station_code || 'Unknown Station';
              const isActive = selectedStation === item.id;
              return (
                <TouchableOpacity
                  style={[styles.stationOption, isActive && styles.stationOptionActive]}
                  onPress={() => {
                    setSelectedStation(item.id);
                    setSelectedStationName(stationName);
                    setShowStationPicker(false);
                  }}
                >
                  <Ionicons
                    name="business"
                    size={20}
                    color={isActive ? '#F5A623' : '#B0B0B0'}
                  />
                  <Text style={[styles.stationOptionText, isActive && styles.stationOptionTextActive]}>
                    {stationName}
                  </Text>
                  {isActive && <Ionicons name="checkmark" size={20} color="#F5A623" />}
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyListContainer}>
                <Text style={styles.emptyListText}>No stations found</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );

  const renderMonthPickerModal = () => (
    <Modal visible={showMonthPicker} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.datePickerContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Month</Text>
            <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarNav}>
            <TouchableOpacity onPress={() => setCalendarYear(calendarYear - 1)}>
              <Ionicons name="chevron-back" size={22} color="#F5A623" />
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>{calendarYear}</Text>
            <TouchableOpacity onPress={() => setCalendarYear(calendarYear + 1)}>
              <Ionicons name="chevron-forward" size={22} color="#F5A623" />
            </TouchableOpacity>
          </View>

          <View style={styles.monthGrid}>
            {MONTHS.map((month, index) => (
              <TouchableOpacity
                key={month}
                style={[
                  styles.monthCell,
                  calendarMonth === index + 1 && calendarYear === new Date().getFullYear() && styles.monthCellCurrent,
                ]}
                onPress={() => applyMonthFilter(index, calendarYear)}
              >
                <Text style={styles.monthCellText}>{month.substring(0, 3)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal visible={showEditModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.editModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Expense</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category *</Text>
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setShowCategoryPicker(true)}
              >
                {editForm.category ? (
                  <View style={styles.categorySelectorContent}>
                    <View style={[styles.categorySelectorBadge, { backgroundColor: getCategoryColor(editForm.category) + '20' }]}>
                      <MaterialCommunityIcons name={getCategoryIcon(editForm.category) as any} size={16} color={getCategoryColor(editForm.category)} />
                      <Text style={[styles.categorySelectorText, { color: getCategoryColor(editForm.category), marginLeft: 6 }]}>
                        {editForm.category}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.categorySelectorPlaceholder}>Select Category</Text>
                )}
                <MaterialCommunityIcons name="chevron-down" size={18} color="#999" />
              </TouchableOpacity>
            </View>

            <Text style={styles.editLabel}>Amount (CDF) *</Text>
            <TextInput
              style={styles.editInput}
              value={editForm.amount}
              onChangeText={(text) => setEditForm({ ...editForm, amount: text })}
              placeholder="Enter amount"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />

            {editForm.amount ? (
              <Text style={styles.usdHintText}>
                ≈ {formatCurrency.USD(convertCurrency.CDF_TO_USD(parseFloat(editForm.amount) || 0))}
              </Text>
            ) : null}

            <Text style={styles.editLabel}>Currency</Text>
            <View style={styles.currencySelectorRow}>
              <TouchableOpacity
                style={[styles.currencyOption, editForm.currency === 'CDF' && styles.currencyOptionActive]}
                onPress={() => setEditForm({ ...editForm, currency: 'CDF' })}
              >
                <Text style={[styles.currencyOptionText, editForm.currency === 'CDF' && styles.currencyOptionTextActive]}>
                  CDF (₣)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.currencyOption, editForm.currency === 'USD' && styles.currencyOptionActive]}
                onPress={() => setEditForm({ ...editForm, currency: 'USD' })}
              >
                <Text style={[styles.currencyOptionText, editForm.currency === 'USD' && styles.currencyOptionTextActive]}>
                  USD ($)
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.editLabel}>Description</Text>
            <TextInput
              style={styles.editInput}
              value={editForm.description}
              onChangeText={(text) => setEditForm({ ...editForm, description: text })}
              placeholder="Enter description"
              placeholderTextColor="#666"
            />

            <Text style={styles.editLabel}>Memo / Notes</Text>
            <TextInput
              style={[styles.editInput, styles.editTextArea]}
              value={editForm.memo}
              onChangeText={(text) => setEditForm({ ...editForm, memo: text })}
              placeholder="Additional notes..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.editLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.editInput}
              value={editForm.expense_date}
              onChangeText={(text) => setEditForm({ ...editForm, expense_date: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#666"
            />

            {editingExpense?.station_id ? (
              <>
                <Text style={styles.editLabel}>Station</Text>
                <Text style={styles.editStationLabel}>
                  {stations.find(s => s.id === editingExpense.station_id)?.name || 
                   stations.find(s => s.id === editingExpense.station_id)?.station_name || 
                   editingExpense.station_id}
                </Text>
              </>
            ) : null}
          </ScrollView>

          <View style={styles.editModalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleUpdateExpense}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderAddCategoryModal = () => (
    <Modal visible={showAddCategoryModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.addCategoryModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Expense Category</Text>
            <TouchableOpacity onPress={() => setShowAddCategoryModal(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.editLabel}>Category Name</Text>
          <TextInput
            style={styles.editInput}
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            placeholder="Enter new category name"
            placeholderTextColor="#666"
            autoFocus
          />

          <Text style={styles.helperText}>
            This will be available globally for all expense entries.
          </Text>

          <View style={styles.editModalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAddCategoryModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, !newCategoryName.trim() && { opacity: 0.5 }]}
              onPress={handleAddCategory}
              disabled={!newCategoryName.trim()}
            >
              <Text style={styles.saveButtonText}>Add Category</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDatePickerModal = () => (
    <Modal visible={showDatePicker} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.datePickerContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {datePickerMode === 'start' ? 'Select Start Date' : 'Select End Date'}
            </Text>
            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarNav}>
            <TouchableOpacity onPress={() => changeCalendarMonth(-1)}>
              <Ionicons name="chevron-back" size={24} color="#F5A623" />
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>
              {MONTHS[calendarMonth - 1]} {calendarYear}
            </Text>
            <TouchableOpacity onPress={() => changeCalendarMonth(1)}>
              <Ionicons name="chevron-forward" size={24} color="#F5A623" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekDays}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <View key={i} style={styles.weekDayCell}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          <FlatList
            data={renderCalendar()}
            numColumns={7}
            keyExtractor={(_: any, index: number) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.calendarDayCell,
                  !item.empty && styles.calendarDayCellActive,
                ]}
                onPress={() => !item.empty && handleDateSelect(item.day)}
                disabled={item.empty}
              >
                <Text style={[
                  styles.calendarDayText,
                  !item.empty && styles.calendarDayTextActive,
                ]}>
                  {item.day || ''}
                </Text>
              </TouchableOpacity>
            )}
          />

          {customStartDate ? (
            <Text style={styles.selectedDatesText}>
              Start: {new Date(customStartDate).toLocaleDateString('en-GB')}
              {datePickerMode === 'end' ? ' — Select end date' : ''}
            </Text>
          ) : null}

          {datePickerMode === 'end' && customStartDate && customEndDate ? (
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                setDateRangeStart(customStartDate);
                setDateRangeEnd(customEndDate);
                setSelectedDateFilter('custom');
                setShowDatePicker(false);
              }}
            >
              <Text style={styles.applyButtonText}>Apply Range</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );

  const renderCategorySummary = () => {
    if (categoryTotals.length === 0) return null;
    
    const grandTotalCDF = categoryTotals.reduce((sum: number, cat: any) => sum + cat.totalCDF, 0);
    const grandTotalUSD = convertCurrency.CDF_TO_USD(grandTotalCDF);
    
    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Expense Summary</Text>
          <View style={styles.summaryTotals}>
            <Text style={styles.summaryTotalCDF}>{formatCurrency.CDF(grandTotalCDF)}</Text>
            <Text style={styles.summaryTotalUSD}>{formatCurrency.USD(grandTotalUSD)}</Text>
          </View>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.summaryScroll}
          contentContainerStyle={styles.summaryScrollContent}
        >
          {categoryTotals.slice(0, 8).map((cat: any) => {
            const catColor = getCategoryColor(cat.category);
            const percentage = grandTotalCDF > 0 ? (cat.totalCDF / grandTotalCDF * 100) : 0;
            return (
              <TouchableOpacity
                key={cat.category}
                style={[styles.summaryCard, { borderLeftColor: catColor }]}
                onPress={() => {
                  if (selectedCategory === cat.category) {
                    setSelectedCategory('');
                  } else {
                    setSelectedCategory(cat.category);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.summaryCardHeader}>
                  <Ionicons name={getCategoryIcon(cat.category) as any} size={14} color={catColor} />
                  <Text style={styles.summaryCardCategory} numberOfLines={1}>{cat.category}</Text>
                </View>
                <Text style={styles.summaryCardAmount}>{formatCurrency.CDF(cat.totalCDF)}</Text>
                <Text style={styles.summaryCardUSD}>{formatCurrency.USD(cat.totalUSD)}</Text>
                <View style={styles.summaryCardFooter}>
                  <Text style={styles.summaryCardCount}>{cat.count} entries</Text>
                  <Text style={[styles.summaryCardPercent, { color: catColor }]}>
                    {percentage.toFixed(0)}%
                  </Text>
                </View>
                {selectedCategory === cat.category && (
                  <View style={[styles.summaryCardSelected, { backgroundColor: catColor }]}>
                    <Ionicons name="checkmark-circle" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {categoryTotals.length > 8 && (
            <TouchableOpacity
              style={styles.summaryMoreCard}
              onPress={showCategoryFilter}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color="#B0B0B0" />
              <Text style={styles.summaryMoreText}>More</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  const grandTotalCDF = categoryTotals.reduce((sum: number, cat: any) => sum + cat.totalCDF, 0);
  const hasActiveFilters = selectedStation || selectedDateFilter || selectedMonth >= 0 || selectedCategory || searchQuery;

  // Memoized render function for FlashList
  const renderExpenseItem = useCallback(({ item }: { item: any }) => (
    <ExpenseItem
      expense={item}
      onEdit={openEditModal}
      onDelete={handleDeleteExpense}
    />
  ), [openEditModal, handleDeleteExpense]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.header}>
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
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Buttons Row */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                styles.filterButtonSmall,
                selectedStation && styles.activeFilterButton,
              ]}
              onPress={() => setShowStationPicker(true)}
            >
              <Ionicons
                name={selectedStation ? "business" : "business-outline"}
                size={14}
                color={selectedStation ? "#ffffff" : "#B0B0B0"}
              />
              <Text
                style={[styles.filterButtonTextSmall, selectedStation && styles.activeFilterButtonText]}
                numberOfLines={1}
              >
                {selectedStationName.length > 10
                  ? selectedStationName.substring(0, 10) + '...'
                  : selectedStationName}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                styles.filterButtonSmall,
                (selectedDateFilter || selectedMonth >= 0) && styles.activeFilterButton,
              ]}
              onPress={showDateFilterOptions}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={(selectedDateFilter || selectedMonth >= 0) ? "#ffffff" : "#B0B0B0"}
              />
              <Text
                style={[styles.filterButtonTextSmall, (selectedDateFilter || selectedMonth >= 0) && styles.activeFilterButtonText]}
                numberOfLines={1}
              >
                {getDateFilterLabel()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                styles.filterButtonSmall,
                selectedCategory && styles.activeFilterButton,
              ]}
              onPress={showCategoryFilter}
            >
              <Ionicons
                name="pricetag-outline"
                size={14}
                color={selectedCategory ? "#ffffff" : "#B0B0B0"}
              />
              <Text
                style={[styles.filterButtonTextSmall, selectedCategory && styles.activeFilterButtonText]}
                numberOfLines={1}
              >
                {selectedCategory || 'Category'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Summary & Clear Filters */}
          {hasActiveFilters || expenses.length > 0 ? (
            <View style={styles.filterSummary}>
              <Text style={styles.filterSummaryText}>
                {totalCount} expense{totalCount !== 1 ? 's' : ''} found
                {grandTotalCDF > 0 ? ` · ${formatCurrency.CDF(grandTotalCDF)}` : ''}
              </Text>
              {hasActiveFilters ? (
                <TouchableOpacity
                  style={styles.clearFilterButton}
                  onPress={() => {
                    setSelectedStation('');
                    setSelectedStationName('All Stations');
                    setSelectedDateFilter('');
                    setSelectedMonth(-1);
                    setDateRangeStart('');
                    setDateRangeEnd('');
                    setSelectedCategory('');
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.clearFilterText}>Clear Filters</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Category Summary Cards */}
          {!isLoading && expenses.length > 0 && renderCategorySummary()}

          {/* Expenses List - Using FlashList for performance */}
          {isLoading && expenses.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F5A623" />
              <Text style={styles.loadingText}>Loading expenses...</Text>
            </View>
          ) : expenses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#444" />
              <Text style={styles.emptyText}>No expenses found</Text>
              <Text style={styles.emptySubtext}>
                {hasActiveFilters
                  ? 'Try adjusting your filters or add a new expense'
                  : 'Add your first expense to get started'}
              </Text>
            </View>
          ) : (
            <FlashList
              data={expenses}
              renderItem={renderExpenseItem}
              keyExtractor={keyExtractor}
              estimatedItemSize={120}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              refreshing={isFetching}
              onRefresh={onRefresh}
              refreshControl={
                <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor="#F5A623" />
              }
              ListFooterComponent={
                isFetching && expenses.length > 0 ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#F5A623" />
                  </View>
                ) : null
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </SafeAreaView>

      {/* Modals */}
      {renderStationPicker()}
      {renderMonthPickerModal()}
      {renderEditModal()}
      {renderAddCategoryModal()}
      {renderDatePickerModal()}
      {renderCategoryPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
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
    backgroundColor: '#16213E',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213E',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2A2A4A',
    flex: 1,
    justifyContent: 'center',
  },
  filterButtonSmall: {
    paddingHorizontal: 8,
    gap: 4,
  },
  activeFilterButton: {
    backgroundColor: '#312C51',
    borderColor: '#F5A623',
  },
  filterButtonTextSmall: {
    fontSize: 12,
    color: '#B0B0B0',
  },
  activeFilterButtonText: {
    color: '#ffffff',
  },
  filterSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterSummaryText: {
    fontSize: 13,
    color: '#B0B0B0',
    flex: 1,
  },
  clearFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(245,166,35,0.15)',
  },
  clearFilterText: {
    fontSize: 12,
    color: '#F5A623',
    fontWeight: '600',
  },
  expensesList: {
    flex: 1,
  },
  expenseCard: {
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A4A',
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
    color: '#FFFFFF',
  },
  dateText: {
    fontSize: 12,
    color: '#808080',
    marginTop: 2,
  },
  expenseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amountColumn: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  amountUSDText: {
    fontSize: 11,
    color: '#808080',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  editButton: {
    padding: 6,
    backgroundColor: 'rgba(245,166,35,0.1)',
    borderRadius: 6,
  },
  deleteButtonIcon: {
    padding: 6,
    backgroundColor: 'rgba(244,67,54,0.1)',
    borderRadius: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 4,
  },
  memoText: {
    fontSize: 12,
    color: '#808080',
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
    backgroundColor: '#2A2A4A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#808080',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#808080',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyListContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 14,
    color: '#666',
  },

  // Summary styles
  summaryContainer: {
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F5A623',
  },
  summaryTotals: {
    alignItems: 'flex-end',
  },
  summaryTotalCDF: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  summaryTotalUSD: {
    fontSize: 11,
    color: '#808080',
    fontVariant: ['tabular-nums'],
  },
  summaryScroll: {
    marginHorizontal: -4,
  },
  summaryScrollContent: {
    paddingHorizontal: 4,
    gap: 8,
    flexDirection: 'row',
  },
  summaryCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    padding: 10,
    minWidth: 130,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  summaryCardCategory: {
    fontSize: 11,
    color: '#B0B0B0',
    flex: 1,
    fontWeight: '600',
  },
  summaryCardAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  summaryCardUSD: {
    fontSize: 10,
    color: '#808080',
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  summaryCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  summaryCardCount: {
    fontSize: 10,
    color: '#666',
  },
  summaryCardPercent: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  summaryCardSelected: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryMoreCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    padding: 10,
    minWidth: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A4A',
    borderStyle: 'dashed',
  },
  summaryMoreText: {
    fontSize: 10,
    color: '#B0B0B0',
    marginTop: 4,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#16213E',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Station picker
  stationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  stationOptionActive: {
    backgroundColor: 'rgba(245,166,35,0.1)',
    borderColor: 'rgba(245,166,35,0.3)',
  },
  stationOptionText: {
    fontSize: 15,
    color: '#B0B0B0',
    marginLeft: 12,
    flex: 1,
  },
  stationOptionTextActive: {
    color: '#F5A623',
    fontWeight: '600',
  },

  // Month picker
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  monthCell: {
    width: '30%',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2A2A4A',
    alignItems: 'center',
    marginBottom: 10,
  },
  monthCellCurrent: {
    borderColor: '#F5A623',
  },
  monthCellText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Edit modal
  editModalContent: {
    backgroundColor: '#16213E',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  editLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 8,
    marginTop: 12,
    fontWeight: '600',
  },
  editInput: {
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  editTextArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currencySelectorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2A2A4A',
    alignItems: 'center',
  },
  currencyOptionActive: {
    backgroundColor: 'rgba(245,166,35,0.2)',
    borderColor: '#F5A623',
  },
  currencyOptionText: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '600',
  },
  currencyOptionTextActive: {
    color: '#F5A623',
  },
  usdHintText: {
    fontSize: 12,
    color: '#808080',
    marginTop: 4,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  editStationLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    padding: 12,
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  editModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2A2A4A',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#B0B0B0',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#F5A623',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#1A1A2E',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // Add category modal
  addCategoryModalContent: {
    backgroundColor: '#16213E',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  helperText: {
    fontSize: 12,
    color: '#808080',
    marginTop: 12,
    fontStyle: 'italic',
  },

  // Date picker
  datePickerContainer: {
    backgroundColor: '#16213E',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5A623',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayCell: {
    width: 40,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#808080',
  },
  calendarDayCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayCellActive: {
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#666',
  },
  calendarDayTextActive: {
    color: '#FFFFFF',
  },
  selectedDatesText: {
    fontSize: 13,
    color: '#F5A623',
    textAlign: 'center',
    marginTop: 12,
  },
  applyButton: {
    backgroundColor: '#F5A623',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  applyButtonText: {
    color: '#1A1A2E',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Category Edit Modal
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B0B0B0',
    marginBottom: 6,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  categorySelectorContent: {
    flex: 1,
  },
  categorySelectorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categorySelectorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categorySelectorPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#808080',
  },

  // Category Picker Modal
  categoryPickerModal: {
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '75%',
  },
  categoryPickerList: {
    maxHeight: 350,
  },
  categoryGridRow: {
    justifyContent: 'space-between',
  },
  categoryPickerChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  categoryPickerChipActive: {
    backgroundColor: 'rgba(245,166,35,0.2)',
    borderColor: '#F5A623',
  },
  categoryPickerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  categoryPickerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#CCCCCC',
    flex: 1,
  },
  categoryPickerTextActive: {
    color: '#F5A623',
  },
  categoryCheckIcon: {
    marginLeft: 2,
  },
  categorySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  categorySearchIcon: {
    marginRight: 6,
  },
  categorySearchInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2A2A4A',
    gap: 8,
  },
  addCategoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5A623',
  },
});