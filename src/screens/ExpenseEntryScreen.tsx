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
  Modal,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { generateUUID } from '../utils/uuid';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { EXPENSE_CATEGORIES, getCategoryIcon, getCategoryColor } from '../constants/expenseCategories';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';

const { width } = Dimensions.get('window');

interface Station {
  id: string;
  name: string;
  station_name?: string;
  station_code?: string;
  location?: string;
  is_active: boolean;
}

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

const EXCHANGE_RATE = 2850.50;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ExpenseEntryScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();

  const [expenseForm, setExpenseForm] = useState<ExpenseForm>({
    items: [{ id: '1', category: '', description: '', amountCDF: 0, amountUSD: 0, memo: '' }],
    totalCDF: 0,
    totalUSD: 0,
  });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1, day: new Date().getDate() });
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  // Station selection state
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  const [selectedStationName, setSelectedStationName] = useState<string>('Select Station');
  const [stations, setStations] = useState<Station[]>([]);
  const [showStationPicker, setShowStationPicker] = useState(false);

  // Category picker state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([...EXPENSE_CATEGORIES]);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // Add category state
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);
  const [editForm, setEditForm] = useState({
    category: '',
    amountCDF: 0,
    description: '',
    memo: '',
  });

  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month - 1, 1).getDay();

  // Load stations on mount
  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        // Fallback: try ordering by station_name
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
        }]);

      if (error && error.code !== '42P01') {
        console.error('Error adding category to DB:', error);
      }

      setExpenseCategories(prev => [...prev, trimmedName]);
      setNewCategoryName('');
      setShowAddCategoryModal(false);
      setCategorySearchQuery('');
      Alert.alert('Success', `Category "${trimmedName}" added`);
    } catch (error) {
      console.error('Error adding category:', error);
      setExpenseCategories(prev => [...prev, trimmedName]);
      setNewCategoryName('');
      setShowAddCategoryModal(false);
      setCategorySearchQuery('');
      Alert.alert('Success', `Category "${trimmedName}" added locally`);
    }
  };

  useEffect(() => {
    loadStations();
    loadExpenseCategories();
  }, [loadStations, loadExpenseCategories]);

  const openDatePicker = () => {
    const selected = new Date(`${selectedDate}T00:00:00`);
    setCalendarMonth(selected.getMonth() + 1);
    setCalendarYear(selected.getFullYear());
    setTempDate({ year: selected.getFullYear(), month: selected.getMonth() + 1, day: selected.getDate() });
    setShowDatePicker(true);
  };

  const applyTempDate = () => {
    const month = tempDate.month || calendarMonth;
    const year = tempDate.year || calendarYear;
    const day = Math.min(tempDate.day || 1, getDaysInMonth(year, month));
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setShowDatePicker(false);
  };

  const changeCalendarMonth = (delta: number) => {
    let m = calendarMonth + delta;
    let y = calendarYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setCalendarMonth(m);
    setCalendarYear(y);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
    const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
    const daysToRender: Array<{ day: number; empty: boolean }> = [];
    for (let i = 0; i < firstDay; i++) daysToRender.push({ day: 0, empty: true });
    for (let day = 1; day <= daysInMonth; day++) daysToRender.push({ day, empty: false });
    return daysToRender;
  };

  const refreshExpenseForm = () => {
    setExpenseForm({
      items: [{ id: generateUUID(), category: '', description: '', amountCDF: 0, amountUSD: 0, memo: '' }],
      totalCDF: 0,
      totalUSD: 0,
    });
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedStationId('');
    setSelectedStationName('Select Station');
  };

  const calculateUSD = (cdfAmount: number): number => cdfAmount / EXCHANGE_RATE;

  const calculateTotals = (items: ExpenseItem[]) => ({
    totalCDF: items.reduce((sum, item) => sum + item.amountCDF, 0),
    totalUSD: items.reduce((sum, item) => sum + item.amountUSD, 0),
  });

  const updateExpenseItem = (id: string, field: keyof ExpenseItem, value: any) => {
    setExpenseForm(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'amountCDF') updatedItem.amountUSD = calculateUSD(updatedItem.amountCDF);
          return updatedItem;
        }
        return item;
      });
      return { ...prev, items: updatedItems, ...calculateTotals(updatedItems) };
    });
  };

  const addNewExpenseItem = () => {
    setExpenseForm(prev => ({
      ...prev,
      items: [...prev.items, { id: generateUUID(), category: '', description: '', amountCDF: 0, amountUSD: 0, memo: '' }],
    }));
  };

  const removeExpenseItem = (id: string) => {
    setExpenseForm(prev => {
      const updatedItems = prev.items.filter(item => item.id !== id);
      return { ...prev, items: updatedItems, ...calculateTotals(updatedItems) };
    });
  };

  const openEditModal = (item: ExpenseItem) => {
    setEditingItem(item);
    setEditForm({
      category: item.category,
      amountCDF: item.amountCDF,
      description: item.description,
      memo: item.memo,
    });
    setShowEditModal(true);
  };

  const saveEditModal = () => {
    if (!editingItem) return;
    if (!editForm.category) {
      Alert.alert('Validation Error', 'Please select a category');
      return;
    }
    if (editForm.amountCDF <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount');
      return;
    }

    updateExpenseItem(editingItem.id, 'category', editForm.category);
    updateExpenseItem(editingItem.id, 'amountCDF', editForm.amountCDF);
    updateExpenseItem(editingItem.id, 'description', editForm.description);
    updateExpenseItem(editingItem.id, 'memo', editForm.memo);

    setShowEditModal(false);
    setEditingItem(null);
  };

  const compressImage = async (uri: string): Promise<string> => {
    try {
      const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 800 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
      return result.uri;
    } catch { return uri; }
  };

  const attachReceipt = async (itemId: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Media library permission needed.'); return; }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [4, 3], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const compressedUri = await compressImage(result.assets[0].uri);
        updateExpenseItem(itemId, 'receiptImage', compressedUri);
      }
    } catch { Alert.alert('Error', 'Failed to attach receipt image'); }
  };

  const queryClient = useQueryClient();
  const submitExpensesMutation = useMutation({
    mutationFn: async (expenseRecords: any[]) => {
      const { error } = await supabase.from('expenses').insert(expenseRecords);
      if (error) throw error;
    },
    onMutate: async (newExpenses) => {
      await queryClient.cancelQueries({ queryKey: ['expenses', selectedDate] });
      const previousExpenses = queryClient.getQueryData(['expenses', selectedDate]);
      queryClient.setQueryData(['expenses', selectedDate], (old: any) => old ? [...old, ...newExpenses] : newExpenses);
      return { previousExpenses };
    },
    onError: (err, newExpenses, context) => { queryClient.setQueryData(['expenses', selectedDate], context?.previousExpenses); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }); },
  });

  const handleSubmitAll = async () => {
    try {
      setLoading(true);
      const validItems = expenseForm.items.filter(item => item.category && item.amountCDF > 0);
      if (validItems.length === 0) { Alert.alert('Validation Error', 'Please fill in at least one expense with a category and amount.'); return; }

      const expenseRecords = validItems.map(item => ({
        category: item.category,
        description: item.memo || item.description,
        amount: item.amountCDF,
        receipt_image: item.receiptImage,
        expense_date: selectedDate,
        payment_method: 'cash',
        station_id: selectedStationId || null,
        created_by: appUser?.id,
      }));
      submitExpensesMutation.mutate(expenseRecords, {
        onSuccess: () => { Alert.alert('Success', 'Expenses submitted successfully'); refreshExpenseForm(); },
        onError: () => { Alert.alert('Error', 'Failed to submit expenses'); },
      });
    } catch (error) { Alert.alert('Error', 'Failed to submit expenses'); } finally { setLoading(false); }
  };

  const filteredCategories = React.useMemo(() => {
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
              <MaterialCommunityIcons name="close" size={22} color={Colors.neutral['300']} />
            </TouchableOpacity>
          </View>

          <View style={styles.categorySearchContainer}>
            <MaterialCommunityIcons name="magnify" size={18} color={Colors.neutral['400']} style={styles.categorySearchIcon} />
            <TextInput
              style={styles.categorySearchInput}
              value={categorySearchQuery}
              onChangeText={setCategorySearchQuery}
              placeholder="Search categories..."
              placeholderTextColor={Colors.neutral['500']}
            />
            {categorySearchQuery ? (
              <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={Colors.neutral['400']} />
              </TouchableOpacity>
            ) : null}
          </View>

          <FlatList
            data={filteredCategories}
            keyExtractor={(item) => item}
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
                  {isActive && <MaterialCommunityIcons name="check" size={16} color={Colors.brand.primary} style={styles.categoryCheckIcon} />}
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.stationEmptyListContainer}>
                <Text style={styles.stationEmptyListText}>No categories found</Text>
              </View>
            }
            style={styles.categoryPickerList}
          />

          <TouchableOpacity
            style={styles.addCategoryButton}
            onPress={() => {
              setShowCategoryPicker(false);
              setNewCategoryName('');
              setShowAddCategoryModal(true);
            }}
          >
            <MaterialCommunityIcons name="plus" size={18} color={Colors.brand.primary} />
            <Text style={styles.addCategoryButtonText}>Add New Category</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderAddCategoryModal = () => (
    <Modal visible={showAddCategoryModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.addCategoryModalContainer}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Add Expense Category</Text>
            <TouchableOpacity onPress={() => setShowAddCategoryModal(false)}>
              <MaterialCommunityIcons name="close" size={22} color={Colors.neutral['300']} />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Category Name</Text>
          <TextInput
            style={styles.editInput}
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            placeholder="Enter new category name"
            placeholderTextColor={Colors.neutral['500']}
            autoFocus
          />

          <Text style={styles.helperText}>
            This will be available for all expense entries.
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

  const renderExpenseListItem = (item: ExpenseItem, index: number) => {
    const catColor = getCategoryColor(item.category);
    const hasDetails = item.category || item.amountCDF > 0;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.listItem}
        onPress={() => hasDetails && openEditModal(item)}
        activeOpacity={hasDetails ? 0.7 : 1}
      >
        <View style={styles.listItemLeft}>
          <View style={[styles.listItemIndex, { backgroundColor: item.category ? catColor + '30' : Colors.neutral['700'] }]}>
            <Text style={[styles.listItemIndexText, { color: item.category ? catColor : Colors.neutral['400'] }]}>
              {index + 1}
            </Text>
          </View>
          <View style={styles.listItemInfo}>
            {item.category ? (
              <View style={[styles.listItemCategoryBadge, { backgroundColor: catColor + '20', borderColor: catColor + '50' }]}>
                <Text style={[styles.listItemCategoryText, { color: catColor }]}>{item.category}</Text>
              </View>
            ) : (
              <Text style={styles.listItemEmptyText}>No category selected</Text>
            )}
            {item.memo ? (
              <Text style={styles.listItemMemo} numberOfLines={1}>{item.memo}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.listItemRight}>
          <View style={styles.listItemAmounts}>
            {item.amountCDF > 0 ? (
              <>
                <Text style={styles.listItemCDF}>₣{item.amountCDF.toLocaleString()}</Text>
                <Text style={styles.listItemUSD}>${item.amountUSD.toFixed(2)}</Text>
              </>
            ) : (
              <Text style={styles.listItemEmptyAmount}>-</Text>
            )}
          </View>
          {hasDetails && (
            <TouchableOpacity
              style={styles.listItemDelete}
              onPress={() => removeExpenseItem(item.id)}
            >
              <MaterialCommunityIcons name="close-circle" size={18} color={Colors.semantic.danger} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderStationPicker = () => (
    <Modal visible={showStationPicker} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.stationPickerModal}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Select Station</Text>
            <TouchableOpacity onPress={() => setShowStationPicker(false)}>
              <MaterialCommunityIcons name="close" size={22} color={Colors.neutral['300']} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.stationOption, !selectedStationId && styles.stationOptionActive]}
            onPress={() => {
              setSelectedStationId('');
              setSelectedStationName('Select Station');
              setShowStationPicker(false);
            }}
          >
              <MaterialCommunityIcons
                name="office-building-outline"
                size={20}
                color={!selectedStationId ? Colors.brand.primary : Colors.neutral['300']}
              />
              <Text style={[styles.stationOptionText, !selectedStationId && styles.stationOptionTextActive]}>
                All Stations
              </Text>
              {!selectedStationId && <MaterialCommunityIcons name="check" size={20} color={Colors.brand.primary} />}
          </TouchableOpacity>

          <FlatList
            data={stations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const stationName = item.name || item.station_name || item.station_code || 'Unknown Station';
              const isActive = selectedStationId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.stationOption, isActive && styles.stationOptionActive]}
                  onPress={() => {
                    setSelectedStationId(item.id);
                    setSelectedStationName(stationName);
                    setShowStationPicker(false);
                  }}
                >
                  <MaterialCommunityIcons
                    name="office-building"
                    size={20}
                    color={isActive ? Colors.brand.primary : Colors.neutral['300']}
                  />
                  <Text style={[styles.stationOptionText, isActive && styles.stationOptionTextActive]}>
                    {stationName}
                  </Text>
                  {isActive && <MaterialCommunityIcons name="check" size={20} color={Colors.brand.primary} />}
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.stationEmptyListContainer}>
                <Text style={styles.stationEmptyListText}>No stations found</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal visible={showEditModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.editModalContainer}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Edit Expense Item</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <MaterialCommunityIcons name="close" size={22} color={Colors.neutral['300']} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Category - Picker Button */}
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
                <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.neutral['400']} />
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount (CDF) *</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.amountCDF > 0 ? editForm.amountCDF.toString() : ''}
                onChangeText={(text) => setEditForm({ ...editForm, amountCDF: parseFloat(text) || 0 })}
                placeholder="0"
                placeholderTextColor={Colors.neutral['500']}
                keyboardType="numeric"
              />
              {editForm.amountCDF > 0 && (
                <Text style={styles.usdHint}>
                  ≈ ${(editForm.amountCDF / EXCHANGE_RATE).toFixed(2)} USD
                </Text>
              )}
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.description}
                onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                placeholder="Enter description"
                placeholderTextColor={Colors.neutral['500']}
              />
            </View>

            {/* Memo */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes / Memo</Text>
              <TextInput
                style={[styles.editInput, styles.editTextArea]}
                value={editForm.memo}
                onChangeText={(text) => setEditForm({ ...editForm, memo: text })}
                placeholder="Optional notes..."
                placeholderTextColor={Colors.neutral['500']}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.editModalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, (!editForm.category || editForm.amountCDF <= 0) && { opacity: 0.5 }]}
              onPress={saveEditModal}
              disabled={!editForm.category || editForm.amountCDF <= 0}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Add Expenses</Text>
            <TouchableOpacity onPress={openDatePicker}>
              <Text style={styles.headerDate}>{selectedDate}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Station Selector */}
          <View style={styles.stationSelectorContainer}>
            <Text style={styles.sectionLabel}>Station</Text>
            <TouchableOpacity
              style={styles.stationSelector}
              onPress={() => setShowStationPicker(true)}
            >
              <MaterialCommunityIcons
                name="office-building"
                size={18}
                color={selectedStationId ? Colors.brand.primary : Colors.neutral['400']}
              />
              <Text style={[
                styles.stationSelectorText,
                selectedStationId && styles.stationSelectorTextActive,
              ]}>
                {selectedStationName}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.neutral['400']} />
            </TouchableOpacity>
          </View>

          {/* Expense Items List */}
          <View style={styles.listSection}>
            <View style={styles.listSectionHeader}>
              <Text style={styles.sectionLabel}>Expense Items</Text>
              <Text style={styles.itemCount}>{expenseForm.items.length} item{expenseForm.items.length !== 1 ? 's' : ''}</Text>
            </View>

            {expenseForm.items.length === 0 ? (
              <View style={styles.emptyList}>
                <MaterialCommunityIcons name="receipt" size={40} color={Colors.neutral['500']} />
                <Text style={styles.emptyListText}>No expense items yet</Text>
                <Text style={styles.emptyListSubtext}>Tap "Add Item" below to add an expense</Text>
              </View>
            ) : (
              expenseForm.items.map((item, index) => renderExpenseListItem(item, index))
            )}
          </View>

          <TouchableOpacity style={styles.addItemButton} onPress={addNewExpenseItem}>
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color={Colors.brand.primary} />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>

          {/* Total */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalCDF}>₣{expenseForm.totalCDF.toLocaleString()}</Text>
            <Text style={styles.totalUSD}>${expenseForm.totalUSD.toFixed(2)}</Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, expenseForm.items.length === 0 && styles.submitButtonDisabled]}
            onPress={handleSubmitAll}
            disabled={loading}
          >
            <MaterialCommunityIcons name="check" size={20} color={Colors.white} />
            <Text style={styles.submitButtonText}>
              {loading
                ? 'Submitting...'
                : `Submit${selectedStationId ? ' to ' + selectedStationName.substring(0, 15) : ''} · ₣${expenseForm.totalCDF.toLocaleString()}`
              }
            </Text>
          </TouchableOpacity>
        </View>

        {/* Station Picker Modal */}
        {renderStationPicker()}

        {/* Category Picker Modal */}
        {renderCategoryPicker()}

        {/* Add Category Modal */}
        {renderAddCategoryModal()}

        {/* Edit Modal */}
        {renderEditModal()}

        {/* Date Picker Modal */}
        <Modal visible={showDatePicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModal}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <MaterialCommunityIcons name="close" size={22} color={Colors.neutral['300']} />
                </TouchableOpacity>
              </View>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => changeCalendarMonth(-1)}>
                  <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.brand.primary} />
                </TouchableOpacity>
                <Text style={styles.calendarMonthYear}>{MONTHS[calendarMonth - 1]} {calendarYear}</Text>
                <TouchableOpacity onPress={() => changeCalendarMonth(1)}>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.brand.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.calendarWeekDays}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <View key={i} style={styles.weekDayCell}><Text style={styles.weekDayText}>{day}</Text></View>
                ))}
              </View>
              <FlatList
                data={renderCalendar()}
                numColumns={7}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.calendarDayCell, !item.empty && tempDate.day === item.day && tempDate.month === calendarMonth && tempDate.year === calendarYear && styles.selectedDayCell]}
                    onPress={() => !item.empty && setTempDate({ ...tempDate, day: item.day })}
                  >
                    <Text style={[styles.calendarDayText, !item.empty && tempDate.day === item.day && tempDate.month === calendarMonth && tempDate.year === calendarYear && styles.selectedDayText]}>
                      {item.day || ''}
                    </Text>
                  </TouchableOpacity>
                )}
                scrollEnabled={false}
              />
              <TouchableOpacity style={styles.applyDateButton} onPress={applyTempDate}>
                <Text style={styles.applyDateText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.app },
  safeArea: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screenPadding, paddingVertical: Spacing.md, justifyContent: 'space-between' },
  headerTitle: { fontSize: Typography.scale.md, fontFamily: Typography.fontFamily.display, color: Colors.white },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerDate: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.medium, color: Colors.brand.primary, marginTop: 2 },

  content: { flex: 1, padding: Spacing.screenPadding },

  // Station Selector
  stationSelectorContainer: { marginBottom: Spacing.base },
  sectionLabel: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.semibold, color: Colors.neutral['400'], marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  stationSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.neutral['600'], gap: Spacing.sm },
  stationSelectorText: { flex: 1, fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'] },
  stationSelectorTextActive: { color: Colors.white },

  // List Section
  listSection: { marginBottom: Spacing.sm },
  listSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  itemCount: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'] },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.neutral['600'],
  },
  listItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.sm },
  listItemIndex: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  listItemIndexText: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.display },
  listItemInfo: { flex: 1 },
  listItemCategoryBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm, borderWidth: 1, marginBottom: 2 },
  listItemCategoryText: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.semibold },
  listItemMemo: { fontSize: Typography.scale.xs, color: Colors.neutral['400'], marginTop: 1 },
  listItemEmptyText: { fontSize: Typography.scale.xs, color: Colors.neutral['500'], fontStyle: 'italic' },
  listItemRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginLeft: Spacing.sm },
  listItemAmounts: { alignItems: 'flex-end' },
  listItemCDF: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.display, color: Colors.white, fontVariant: ['tabular-nums'] },
  listItemUSD: { fontSize: Typography.scale.xs, color: Colors.neutral['400'], fontVariant: ['tabular-nums'] },
  listItemEmptyAmount: { fontSize: Typography.scale.sm, color: Colors.neutral['500'] },
  listItemDelete: { padding: 4 },

  emptyList: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyListText: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'] },
  emptyListSubtext: { fontSize: Typography.scale.xs, color: Colors.neutral['500'] },

  addItemButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.brand.primary + '40', marginBottom: Spacing.base, gap: Spacing.sm },
  addItemText: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.semibold, color: Colors.brand.primary },

  totalContainer: { backgroundColor: Colors.background.card, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.base, alignItems: 'center', borderWidth: 1, borderColor: Colors.neutral['600'] },
  totalLabel: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'], marginBottom: Spacing.xs },
  totalCDF: { fontSize: Typography.scale['2xl'], fontFamily: Typography.fontFamily.display, color: Colors.white, fontVariant: ['tabular-nums'] },
  totalUSD: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.body, color: Colors.neutral['400'], marginTop: 4 },

  footer: { padding: Spacing.base, backgroundColor: Colors.background.card, borderTopWidth: 1, borderTopColor: Colors.neutral['600'] },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.md, padding: Spacing.base, gap: Spacing.sm },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.display, color: Colors.white },

  // Category Edit Modal
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.semibold, color: Colors.neutral['400'], marginBottom: Spacing.sm },
  categorySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.neutral['600'] },
  categorySelectorContent: { flex: 1 },
  categorySelectorPlaceholder: { flex: 1, fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'] },
  categorySelectorBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  categorySelectorText: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium },
  helperText: { fontSize: Typography.scale.xs, color: Colors.neutral['400'], marginTop: Spacing.sm, fontStyle: 'italic' },

  editInput: { backgroundColor: Colors.background.input, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral['600'], fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.body, color: Colors.white },
  editTextArea: { minHeight: 80, textAlignVertical: 'top' },
  usdHint: { fontSize: Typography.scale.xs, color: Colors.neutral['400'], marginTop: Spacing.xs, fontStyle: 'italic' },

  editModalContainer: { backgroundColor: Colors.background.cardElevated, borderRadius: BorderRadius.lg, padding: Spacing.xl, width: '90%', maxWidth: 400, maxHeight: '80%' },
  editModalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  cancelButton: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.neutral['700'], alignItems: 'center' },
  cancelButtonText: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.semibold, color: Colors.neutral['300'] },
  saveButton: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.brand.primary, alignItems: 'center' },
  saveButtonText: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.display, color: Colors.white },

  // Station Picker Modal
  stationPickerModal: { backgroundColor: Colors.background.cardElevated, borderRadius: BorderRadius.lg, padding: Spacing.xl, width: '90%', maxWidth: 400, maxHeight: '70%' },
  stationOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.base, borderRadius: BorderRadius.md, marginBottom: Spacing.sm, gap: Spacing.md },
  stationOptionActive: { backgroundColor: Colors.brand.primarySurface },
  stationOptionText: { flex: 1, fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['300'] },
  stationOptionTextActive: { color: Colors.brand.primary },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: Colors.background.overlay, justifyContent: 'center', alignItems: 'center' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.base },
  modalTitle: { fontSize: Typography.scale.md, fontFamily: Typography.fontFamily.display, color: Colors.white },

  // Date picker
  datePickerModal: { backgroundColor: Colors.background.cardElevated, borderRadius: BorderRadius.lg, padding: Spacing.xl, width: '90%', maxWidth: 360 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.base },
  calendarMonthYear: { fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.semibold, color: Colors.brand.primary },
  calendarWeekDays: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.sm },
  weekDayCell: { width: 40, alignItems: 'center' },
  weekDayText: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.semibold, color: Colors.neutral['400'] },
  calendarDayCell: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  calendarDayText: { fontSize: Typography.scale.sm, color: Colors.white },
  selectedDayCell: { backgroundColor: Colors.brand.primary, borderRadius: 20 },
  selectedDayText: { color: Colors.white, fontFamily: Typography.fontFamily.display },
  applyDateButton: { backgroundColor: Colors.brand.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  applyDateText: { fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.display, color: Colors.white },

  // Common empty list
  stationEmptyListContainer: { alignItems: 'center', paddingVertical: Spacing.xl },
  stationEmptyListText: { fontSize: Typography.scale.sm, color: Colors.neutral['400'] },

  // Category Picker Modal
  categoryPickerModal: { backgroundColor: Colors.background.cardElevated, borderRadius: BorderRadius.lg, padding: Spacing.xl, width: '90%', maxWidth: 400, maxHeight: '75%' },
  categoryPickerList: { maxHeight: 350 },
  categorySearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.input, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, marginBottom: Spacing.base, borderWidth: 1, borderColor: Colors.neutral['600'] },
  categorySearchIcon: { marginRight: 6 },
  categorySearchInput: { flex: 1, padding: Spacing.md, fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.body, color: Colors.white },
  categoryGridRow: { justifyContent: 'space-between' },
  categoryPickerChip: { width: '48%', flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs, borderRadius: BorderRadius.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.neutral['600'] },
  categoryPickerChipActive: { backgroundColor: Colors.brand.primarySurface, borderColor: Colors.brand.primary },
  categoryPickerIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  categoryPickerText: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['300'], flex: 1 },
  categoryPickerTextActive: { color: Colors.brand.primary },
  categoryCheckIcon: { marginLeft: 2 },
  addCategoryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, marginTop: Spacing.sm, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.neutral['600'] },
  addCategoryButtonText: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.semibold, color: Colors.brand.primary },

  // Add Category Modal
  addCategoryModalContainer: { backgroundColor: Colors.background.cardElevated, borderRadius: BorderRadius.lg, padding: Spacing.xl, width: '90%', maxWidth: 400 },
});