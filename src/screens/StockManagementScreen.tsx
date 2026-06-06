import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';

interface Station {
  id: string;
  name: string;
  code: string;
  location: string;
  status: string;
}

interface StockData {
  id: string;
  station_id: string;
  station_name: string;
  pms_stock: number;
  ago_stock: number;
  pms_minimum: number;
  ago_minimum: number;
  last_updated: string;
  status: 'normal' | 'low' | 'critical';
}

interface DailyStockEntry {
  id?: string;
  station_id: string;
  station_name: string;
  pms_received: number;
  ago_received: number;
  pms_sold: number;
  ago_sold: number;
  pms_variance: number;
  ago_variance: number;
  entry_date: string;
  created_by: string;
  notes?: string;
}

export default function StockManagementScreen() {
  const { appUser } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [dailyEntries, setDailyEntries] = useState<DailyStockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [dailyFormData, setDailyFormData] = useState({
    pms_received: '',
    ago_received: '',
    pms_sold: '',
    ago_sold: '',
    pms_variance: '',
    ago_variance: '',
    notes: '',
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadStations(),
      loadStockData(),
      loadDailyEntries(),
    ]);
  };

  const loadStations = async () => {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Error loading stations:', error);
        return;
      }

      setStations(data || []);
    } catch (error) {
      console.error('Error loading stations:', error);
    }
  };

  const loadStockData = async () => {
    try {
      // Generate mock stock data for each station since stock_levels table doesn't exist
      const mockStockData: StockData[] = stations.map(station => {
        const isDepot = station.name.includes('DEPOT');
        const pmsStock = isDepot ? 15000 + Math.floor(Math.random() * 5000) : 8000 + Math.floor(Math.random() * 7000);
        const agoStock = isDepot ? 12000 + Math.floor(Math.random() * 3000) : 6000 + Math.floor(Math.random() * 4000);
        
        return {
          id: station.id,
          station_id: station.id,
          station_name: station.name,
          pms_stock: pmsStock,
          ago_stock: agoStock,
          pms_minimum: isDepot ? 2000 : 1000,
          ago_minimum: isDepot ? 1000 : 500,
          last_updated: new Date().toISOString(),
          status: getStockStatus(pmsStock, agoStock, isDepot ? 2000 : 1000, isDepot ? 1000 : 500),
        };
      });

      setStockData(mockStockData);
    } catch (error) {
      console.error('Error loading stock data:', error);
    }
  };

  const loadDailyEntries = async () => {
    try {
      // Generate mock daily entries for demonstration
      const mockEntries: DailyStockEntry[] = stations.slice(0, 3).map(station => {
        const isDepot = station.name.includes('DEPOT');
        return {
          id: Math.random().toString(),
          station_id: station.id,
          station_name: station.name,
          pms_received: isDepot ? 8000 : 3000 + Math.floor(Math.random() * 2000),
          ago_received: isDepot ? 5000 : 2000 + Math.floor(Math.random() * 1000),
          pms_sold: isDepot ? 7500 : 2800 + Math.floor(Math.random() * 1500),
          ago_sold: isDepot ? 4800 : 1900 + Math.floor(Math.random() * 800),
          pms_variance: 200,
          ago_variance: 100,
          entry_date: new Date().toISOString().split('T')[0],
          created_by: appUser?.id || '',
          notes: `Daily transaction for ${station.name}`,
        };
      });

      setDailyEntries(mockEntries);
    } catch (error) {
      console.error('Error loading daily entries:', error);
    }
  };

  const getStockStatus = (pmsStock: number, agoStock: number, pmsMin: number, agoMin: number): 'normal' | 'low' | 'critical' => {
    if (pmsStock < pmsMin * 0.5 || agoStock < agoMin * 0.5) return 'critical';
    if (pmsStock < pmsMin || agoStock < agoMin) return 'low';
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#FF6B6B';
      case 'low': return '#FFA726';
      default: return '#4CAF50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'critical': return 'Critical';
      case 'low': return 'Low Stock';
      default: return 'Normal';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return 'warning';
      case 'low': return 'alert-circle';
      default: return 'checkmark-circle';
    }
  };

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
    setShowDailyModal(true);
    // Reset form data
    setDailyFormData({
      pms_received: '',
      ago_received: '',
      pms_sold: '',
      ago_sold: '',
      pms_variance: '',
      ago_variance: '',
      notes: '',
    });
  };

  const handleDailySubmit = async () => {
    if (!selectedStation) return;

    // Validate form data
    if (!dailyFormData.pms_received || !dailyFormData.ago_received || 
        !dailyFormData.pms_sold || !dailyFormData.ago_sold) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      // For now, we'll store the data locally since the daily_stock_transactions table doesn't exist
      const newEntry: DailyStockEntry = {
        id: Math.random().toString(),
        station_id: selectedStation.id,
        station_name: selectedStation.name,
        pms_received: parseFloat(dailyFormData.pms_received) || 0,
        ago_received: parseFloat(dailyFormData.ago_received) || 0,
        pms_sold: parseFloat(dailyFormData.pms_sold) || 0,
        ago_sold: parseFloat(dailyFormData.ago_sold) || 0,
        pms_variance: parseFloat(dailyFormData.pms_variance) || 0,
        ago_variance: parseFloat(dailyFormData.ago_variance) || 0,
        entry_date: new Date().toISOString().split('T')[0],
        created_by: appUser?.id || '',
        notes: dailyFormData.notes,
      };

      // Add to local state
      setDailyEntries(prev => [newEntry, ...prev]);

      // Update stock levels
      const updatedStockData = stockData.map(stock => {
        if (stock.station_id === selectedStation.id) {
          const newPmsStock = stock.pms_stock + newEntry.pms_received - newEntry.pms_sold;
          const newAgoStock = stock.ago_stock + newEntry.ago_received - newEntry.ago_sold;
          return {
            ...stock,
            pms_stock: newPmsStock,
            ago_stock: newAgoStock,
            status: getStockStatus(newPmsStock, newAgoStock, stock.pms_minimum, stock.ago_minimum),
            last_updated: new Date().toISOString(),
          };
        }
        return stock;
      });

      setStockData(updatedStockData);

      Alert.alert('Success', 'Daily stock entry saved successfully');
      setShowDailyModal(false);
      setSelectedStation(null);
    } catch (error) {
      console.error('Error saving daily entry:', error);
      Alert.alert('Error', 'Failed to save daily stock entry');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const renderStationCard = ({ item }: { item: StockData }) => (
    <View style={styles.stationCard}>
      <View style={styles.stationHeader}>
        <View style={styles.stationInfo}>
          <Text style={styles.stationName}>{item.station_name}</Text>
          <Text style={styles.stationLocation}>
            {stations.find(s => s.id === item.station_id)?.location || 'Unknown Location'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons name={getStatusIcon(item.status)} size={16} color="#fff" />
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <View style={styles.stockInfo}>
        <View style={styles.stockItem}>
          <View style={styles.stockItemHeader}>
            <Ionicons name="car" size={20} color="#FF6B35" />
            <Text style={styles.stockLabel}>PMS</Text>
          </View>
          <Text style={styles.stockValue}>{item.pms_stock.toLocaleString()}L</Text>
          <Text style={styles.stockMinimum}>Min: {item.pms_minimum.toLocaleString()}L</Text>
        </View>
        <View style={styles.stockDivider} />
        <View style={styles.stockItem}>
          <View style={styles.stockItemHeader}>
            <Ionicons name="car" size={20} color="#4CAF50" />
            <Text style={styles.stockLabel}>AGO</Text>
          </View>
          <Text style={styles.stockValue}>{item.ago_stock.toLocaleString()}L</Text>
          <Text style={styles.stockMinimum}>Min: {item.ago_minimum.toLocaleString()}L</Text>
        </View>
      </View>

      <View style={styles.stationActions}>
        <TouchableOpacity 
          style={styles.updateButton}
          onPress={() => handleStationSelect(stations.find(s => s.id === item.station_id)!)}
        >
          <Ionicons name="pencil" size={16} color="#fff" />
          <Text style={styles.updateButtonText}>Add Daily Entry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.viewButton}>
          <Ionicons name="eye" size={16} color="#FF6B35" />
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDailyEntry = ({ item }: { item: DailyStockEntry }) => (
    <View style={styles.dailyEntryCard}>
      <View style={styles.dailyEntryHeader}>
        <Text style={styles.dailyEntryStation}>{item.station_name}</Text>
        <Text style={styles.dailyEntryDate}>{new Date(item.entry_date).toLocaleDateString()}</Text>
      </View>
      <View style={styles.dailyEntryData}>
        <View style={styles.dailyEntryRow}>
          <Text style={styles.dailyEntryLabel}>PMS:</Text>
          <Text style={styles.dailyEntryText}>+{item.pms_received.toLocaleString()}L / -{item.pms_sold.toLocaleString()}L</Text>
        </View>
        <View style={styles.dailyEntryRow}>
          <Text style={styles.dailyEntryLabel}>AGO:</Text>
          <Text style={styles.dailyEntryText}>+{item.ago_received.toLocaleString()}L / -{item.ago_sold.toLocaleString()}L</Text>
        </View>
        {item.notes && (
          <Text style={styles.dailyEntryNotes}>{item.notes}</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Text style={styles.headerTitle}>Stock Management</Text>
        <Text style={styles.headerSubtitle}>Multi-Station Inventory Control</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Current Stock Levels Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Current Stock Levels</Text>
            <Text style={styles.sectionSubtitle}>{stations.length} Active Stations</Text>
          </View>
          <FlatList
            data={stockData}
            renderItem={renderStationCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Daily Stock Book Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Stock Book</Text>
            <Text style={styles.sectionSubtitle}>Track daily transactions</Text>
          </View>
          
          {/* Station Selection */}
          <View style={styles.stationSelection}>
            <Text style={styles.stationSelectionTitle}>Select Station for Daily Entry:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stationScroll}>
              {stations.map((station) => (
                <TouchableOpacity
                  key={station.id}
                  style={[
                    styles.stationButton,
                    selectedStation?.id === station.id && styles.selectedStationButton
                  ]}
                  onPress={() => setSelectedStation(station)}
                >
                  <Text style={[
                    styles.stationButtonText,
                    selectedStation?.id === station.id && styles.selectedStationButtonText
                  ]}>
                    {station.code}
                  </Text>
                  <Text style={[
                    styles.stationButtonSubtext,
                    selectedStation?.id === station.id && styles.selectedStationButtonSubtext
                  ]}>
                    {station.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Daily Entry Form */}
          {selectedStation && (
            <View style={styles.dailyForm}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Daily Entry for {selectedStation.name}</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setSelectedStation(null)}
                >
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>PMS Received (L) *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={dailyFormData.pms_received}
                    onChangeText={(text) => setDailyFormData(prev => ({ ...prev, pms_received: text }))}
                    placeholder="e.g., 5000"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>AGO Received (L) *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={dailyFormData.ago_received}
                    onChangeText={(text) => setDailyFormData(prev => ({ ...prev, ago_received: text }))}
                    placeholder="e.g., 3000"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>PMS Sold (L) *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={dailyFormData.pms_sold}
                    onChangeText={(text) => setDailyFormData(prev => ({ ...prev, pms_sold: text }))}
                    placeholder="e.g., 4800"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>AGO Sold (L) *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={dailyFormData.ago_sold}
                    onChangeText={(text) => setDailyFormData(prev => ({ ...prev, ago_sold: text }))}
                    placeholder="e.g., 2900"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>PMS Variance (L)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={dailyFormData.pms_variance}
                    onChangeText={(text) => setDailyFormData(prev => ({ ...prev, pms_variance: text }))}
                    placeholder="e.g., +200"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>AGO Variance (L)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={dailyFormData.ago_variance}
                    onChangeText={(text) => setDailyFormData(prev => ({ ...prev, ago_variance: text }))}
                    placeholder="e.g., -100"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.formInput, styles.notesInput]}
                  value={dailyFormData.notes}
                  onChangeText={(text) => setDailyFormData(prev => ({ ...prev, notes: text }))}
                  placeholder="Add any additional notes..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formButtons}>
                <TouchableOpacity style={styles.saveButton} onPress={handleDailySubmit}>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Entry</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => setSelectedStation(null)}
                >
                  <Ionicons name="close" size={20} color="#666" />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Recent Entries */}
          <View style={styles.recentEntries}>
            <Text style={styles.recentEntriesTitle}>Recent Daily Entries</Text>
            <FlatList
              data={dailyEntries}
              renderItem={renderDailyEntry}
              keyExtractor={(item) => item.id || Math.random().toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  stationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  stationLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 4,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stockItem: {
    flex: 1,
    alignItems: 'center',
  },
  stockItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 6,
  },
  stockValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  stockMinimum: {
    fontSize: 12,
    color: '#666',
  },
  stockDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#ddd',
    marginHorizontal: 16,
  },
  stationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  updateButton: {
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    marginRight: 8,
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  viewButton: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
    flex: 1,
  },
  viewButtonText: {
    color: '#FF6B35',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  stationSelection: {
    marginBottom: 20,
  },
  stationSelectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  stationScroll: {
    flexDirection: 'row',
  },
  stationButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    minWidth: 80,
  },
  selectedStationButton: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  stationButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  selectedStationButtonText: {
    color: '#fff',
  },
  stationButtonSubtext: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  selectedStationButtonSubtext: {
    color: '#fff',
    opacity: 0.8,
  },
  dailyForm: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  formGroup: {
    flex: 1,
    marginRight: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginRight: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  recentEntries: {
    marginTop: 20,
  },
  recentEntriesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  dailyEntryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dailyEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailyEntryStation: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dailyEntryDate: {
    fontSize: 12,
    color: '#666',
  },
  dailyEntryData: {
    gap: 8,
  },
  dailyEntryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyEntryLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  dailyEntryText: {
    fontSize: 14,
    color: '#666',
  },
  dailyEntryNotes: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
});