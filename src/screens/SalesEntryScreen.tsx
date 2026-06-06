import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { formatCurrency } from '../constants/currency';
import * as ImagePicker from 'expo-image-picker';
import { generateUUID } from '../utils/uuid';

const { width } = Dimensions.get('window');

interface SalesItem {
  id: string;
  itemType: 'pump' | 'drum';
  itemName: string;
  quantity: number;
  rate: number;
  total: number;
}

interface SalesReceipt {
  station: string;
  customer: string;
  payment: string;
  refNo: string;
  items: SalesItem[];
  subtotal: number;
  tax: number;
  total: number;
}

const FUEL_TYPES = ['PMS', 'AGO'];
const PAYMENT_METHODS = ['Cash', 'Card', 'Credit'];
const CUSTOMERS = ['Walk-in Custom', 'Regular Customer', 'Corporate Client'];
const STATIONS = ['ISSIRO STATION', 'DEPOT ISSIRO', 'RUNGU STATION', 'DUNGU STATION', 'DURBA STATION', 'NIANGARA STATION'];
const DRUM_STATIONS = ['DEPOT ISSIRO', 'DUNGU STATION'];

export default function SalesEntryScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  
  // Get user's assigned station
  const userStation = appUser?.station_id;
  const [receipt, setReceipt] = useState<SalesReceipt>({
    station: 'ISSIRO STATION',
    customer: 'Walk-in Custom',
    payment: 'Cash',
    refNo: '',
    items: [
      {
        id: '1',
        itemType: 'pump',
        itemName: 'PMS',
        quantity: 145.67,
        rate: 3200,
        total: 466144,
      },
      {
        id: '2',
        itemType: 'drum',
        itemName: 'AGO',
        quantity: 2,
        rate: 656000,
        total: 1312000,
      },
    ],
    subtotal: 1778144,
    tax: 0,
    total: 1778144,
  });
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [receiptImages, setReceiptImages] = useState<string[]>([]);

  const calculateItemTotal = (quantity: number, rate: number): number => {
    return quantity * rate;
  };

  const getItemTypeForStation = (station: string): 'pump' | 'drum' => {
    return DRUM_STATIONS.includes(station) ? 'drum' : 'pump';
  };

  const getAvailableStations = (): string[] => {
    // If user is admin, they can access all stations
    if (appUser?.role === 'admin') {
      return STATIONS;
    }
    
    // If user has a specific station assigned, only show that station
    if (userStation) {
      const stationName = STATIONS.find(station => 
        station.toLowerCase().replace(/\s+/g, '_') === userStation.toLowerCase()
      );
      return stationName ? [stationName] : STATIONS;
    }
    
    // Default fallback
    return STATIONS;
  };

  const handleStationChange = (newStation: string) => {
    const newItemType = getItemTypeForStation(newStation);
    
    setReceipt(prev => ({
      ...prev,
      station: newStation,
      items: prev.items.map(item => ({
        ...item,
        itemType: newItemType,
      })),
    }));
  };

  const calculateTotals = (items: SalesItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0; // 0% tax for now
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const updateItem = (id: string, field: keyof SalesItem, value: any) => {
    setReceipt(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'rate') {
            updatedItem.total = calculateItemTotal(updatedItem.quantity, updatedItem.rate);
          }
          return updatedItem;
        }
        return item;
      });
      
      const { subtotal, tax, total } = calculateTotals(updatedItems);
      
      return {
        ...prev,
        items: updatedItems,
        subtotal,
        tax,
        total,
      };
    });
  };

  const addItem = () => {
    const itemType = getItemTypeForStation(receipt.station);
    const newItem: SalesItem = {
      id: generateUUID(),
      itemType: itemType,
      itemName: 'PMS',
      quantity: 0,
      rate: 0,
      total: 0,
    };
    
    setReceipt(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setEditingItem(newItem.id);
  };

  const removeItem = (id: string) => {
    setReceipt(prev => {
      const updatedItems = prev.items.filter(item => item.id !== id);
      const { subtotal, tax, total } = calculateTotals(updatedItems);
      
      return {
        ...prev,
        items: updatedItems,
        subtotal,
        tax,
        total,
      };
    });
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      // Save as draft logic here
      Alert.alert('Success', 'Receipt saved as draft');
    } catch (error) {
      Alert.alert('Error', 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReceipt = async () => {
    try {
      setLoading(true);
      
      // Insert into daily_sales table
      for (const item of receipt.items) {
      const { error } = await supabase
          .from('daily_sales')
          .insert({
            sale_type: item.itemType,
            fuel_type: item.itemName === 'PMS' ? 'Petrol' : 'Diesel',
            pump_number: item.itemType === 'pump' ? 1 : null,
            volume_liters: item.itemType === 'pump' ? item.quantity : null,
            quantity: item.itemType === 'drum' ? item.quantity : null,
            price_per_liter: item.itemType === 'pump' ? item.rate : null,
            price_per_drum: item.itemType === 'drum' ? item.rate : null,
            total_amount: item.total,
            payment_method: receipt.payment.toLowerCase(),
            sale_date: new Date().toISOString().split('T')[0],
            created_by: appUser?.id,
          });

      if (error) {
          console.error('Error inserting sale:', error);
        }
      }

      Alert.alert('Success', 'Receipt submitted successfully');
      // Reset form
      setReceipt({
        station: 'ISSIRO STATION',
        customer: 'Walk-in Custom',
        payment: 'Cash',
        refNo: '',
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
      });
    } catch (error) {
      console.error('Error submitting receipt:', error);
      Alert.alert('Error', 'Failed to submit receipt');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    Alert.alert('Print', 'Print functionality will be implemented');
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to capture receipt images.');
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Media library permission is needed to select receipt images.');
      return false;
    }
    return true;
  };

  const captureImage = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setReceiptImages(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  const selectImageFromGallery = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setReceiptImages(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Gallery selection error:', error);
      Alert.alert('Error', 'Failed to select image from gallery');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Add Receipt Image',
      'Choose how you want to add the image',
      [
        { text: 'Camera', onPress: captureImage },
        { text: 'Gallery', onPress: selectImageFromGallery },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const removeImage = (index: number) => {
    setReceiptImages(prev => prev.filter((_, i) => i !== index));
  };

  const renderItemCard = (item: SalesItem) => (
    <View key={item.id} style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemDropdown}>
          <Text style={styles.itemLabel}>ITEM</Text>
          <TouchableOpacity 
            style={styles.dropdownContainer}
            onPress={() => {
              const currentIndex = FUEL_TYPES.indexOf(item.itemName);
              const nextIndex = (currentIndex + 1) % FUEL_TYPES.length;
              updateItem(item.id, 'itemName', FUEL_TYPES[nextIndex]);
            }}
          >
            <Text style={styles.dropdownText}>{item.itemName}</Text>
            <Ionicons name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => removeItem(item.id)}
      >
          <Ionicons name="trash" size={20} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
      
      <View style={styles.itemInputs}>
        {item.itemType === 'pump' ? (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>QTY (LITERS)</Text>
              <TextInput
                style={styles.inputContainer}
                value={item.quantity.toString()}
                onChangeText={(text) => updateItem(item.id, 'quantity', parseFloat(text) || 0)}
                keyboardType="numeric"
                placeholder="0.00"
              />
            </View>
        <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RATE (CDF)</Text>
              <TextInput
                style={styles.inputContainer}
                value={item.rate.toString()}
                onChangeText={(text) => updateItem(item.id, 'rate', parseFloat(text) || 0)}
                keyboardType="numeric"
            placeholder="0"
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NUMBER OF DRUMS</Text>
              <TextInput
                style={styles.inputContainer}
                value={item.quantity.toString()}
                onChangeText={(text) => updateItem(item.id, 'quantity', parseInt(text) || 0)}
            keyboardType="numeric"
                placeholder="0"
          />
        </View>
        <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RATE (CDF)</Text>
              <TextInput
                style={styles.inputContainer}
                value={item.rate.toString()}
                onChangeText={(text) => updateItem(item.id, 'rate', parseFloat(text) || 0)}
            keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </>
        )}
        <View style={styles.totalContainer}>
          <Text style={styles.itemTotal}>{formatCurrency.CDF(item.total)}</Text>
          <Text style={styles.itemTotalUSD}>
            {formatCurrency.USD(item.total / 2850.50)}
          </Text>
        </View>
      </View>

      {item.itemType === 'drum' && (
        <Text style={styles.drumInfo}>
          {item.quantity} Drums x 205L = {item.quantity * 205}L total. Rate auto-calculated.
        </Text>
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
          <Text style={styles.headerTitle}>Create Sales Receipt</Text>
          <Text style={styles.headerDate}>Date: {new Date().toLocaleDateString('en-GB')}</Text>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Sales Information */}
          <View style={styles.salesInfoContainer}>
            <View style={styles.infoRow}>
              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>Station</Text>
                <TouchableOpacity 
                  style={styles.infoDropdown}
                  onPress={() => {
                    const availableStations = getAvailableStations();
                    const currentIndex = availableStations.indexOf(receipt.station);
                    const nextIndex = (currentIndex + 1) % availableStations.length;
                    handleStationChange(availableStations[nextIndex]);
                  }}
                >
                  <Text style={styles.infoText}>{receipt.station}</Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>Customer</Text>
                <TouchableOpacity style={styles.infoDropdown}>
                  <Text style={styles.infoText}>{receipt.customer}</Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>Payment</Text>
                <TouchableOpacity style={styles.infoDropdown}>
                  <Text style={styles.infoText}>{receipt.payment}</Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={styles.infoGroup}>
                <Text style={styles.infoLabel}>Ref No</Text>
                <TextInput
                  style={styles.infoInput}
                  value={receipt.refNo}
                  onChangeText={(text) => setReceipt(prev => ({ ...prev, refNo: text }))}
                  placeholder="e.g., 1001"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          {/* Items */}
          <View style={styles.itemsContainer}>
            {receipt.items.map(renderItemCard)}
            
            <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
              <Ionicons name="add" size={24} color="#312C51" />
              <Text style={styles.addItemText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {/* Receipt Images */}
          <View style={styles.imagesContainer}>
            <View style={styles.imagesHeader}>
              <Text style={styles.imagesTitle}>Receipt Images</Text>
              <TouchableOpacity style={styles.captureButton} onPress={showImageOptions}>
                <Ionicons name="add" size={20} color="#312C51" />
                <Text style={styles.captureButtonText}>Add Image</Text>
              </TouchableOpacity>
        </View>

            {receiptImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
                {receiptImages.map((imageUri, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: imageUri }} style={styles.receiptImage} />
          <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            
            {receiptImages.length === 0 && (
              <View style={styles.noImagesContainer}>
                <Ionicons name="camera-outline" size={48} color="#ccc" />
                <Text style={styles.noImagesText}>No receipt images added</Text>
                <Text style={styles.noImagesSubtext}>Tap "Add Image" to capture or select receipt images</Text>
              </View>
            )}
          </View>

          {/* Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <View style={styles.summaryValue}>
                <Text style={styles.summaryAmount}>{formatCurrency.CDF(receipt.subtotal)}</Text>
                <Text style={styles.summaryAmountUSD}>
                  {formatCurrency.USD(receipt.subtotal / 2850.50)}
                </Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (0%)</Text>
              <View style={styles.summaryValue}>
                <Text style={styles.summaryAmount}>{formatCurrency.CDF(receipt.tax)}</Text>
                <Text style={styles.summaryAmountUSD}>
                  {formatCurrency.USD(receipt.tax / 2850.50)}
                </Text>
              </View>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <View style={styles.summaryValue}>
                <Text style={styles.totalAmount}>{formatCurrency.CDF(receipt.total)}</Text>
                <Text style={styles.totalAmountUSD}>
                  {formatCurrency.USD(receipt.total / 2850.50)}
                </Text>
              </View>
            </View>
            <Text style={styles.exchangeRateText}>
              Exchange Rate: 1 USD = {formatCurrency.CDF(2850.50)} (Rate: 0.00035078)
            </Text>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.saveDraftButton}
            onPress={handleSaveDraft}
            disabled={loading}
          >
            <Text style={styles.saveDraftText}>Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmitReceipt}
            disabled={loading}
          >
            <Text style={styles.submitText}>Submit Receipt</Text>
          </TouchableOpacity>
              <TouchableOpacity
            style={styles.printButton}
            onPress={handlePrint}
            disabled={loading}
              >
            <Text style={styles.printText}>Print</Text>
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
    flex: 1,
    textAlign: 'center',
  },
  headerDate: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  salesInfoContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  infoDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 14,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
  },
  itemsContainer: {
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemDropdown: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
  },
  deleteButton: {
    padding: 8,
  },
  itemInputs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  inputContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 14,
    color: '#333',
  },
  totalContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemTotalUSD: {
    fontSize: 12,
    color: '#666',
  },
  drumInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
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
  },
  addItemText: {
    fontSize: 16,
    color: '#312C51',
    fontWeight: '600',
    marginLeft: 8,
  },
  summaryContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    alignItems: 'flex-end',
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryAmountUSD: {
    fontSize: 12,
    color: '#666',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmountUSD: {
    fontSize: 14,
    color: '#666',
  },
  exchangeRateText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveDraftButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#312C51',
    alignItems: 'center',
  },
  saveDraftText: {
    fontSize: 14,
    color: '#312C51',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#312C51',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  printButton: {
    flex: 1,
    backgroundColor: '#312C51',
    borderRadius: 8,
    padding: 16,
    marginLeft: 8,
    alignItems: 'center',
  },
  printText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  imagesContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  imagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  imagesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#312C51',
  },
  captureButtonText: {
    fontSize: 14,
    color: '#312C51',
    fontWeight: '600',
    marginLeft: 6,
  },
  imagesScroll: {
    marginTop: 8,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  receiptImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  noImagesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noImagesText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  noImagesSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
});