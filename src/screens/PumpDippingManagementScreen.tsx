import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { stationService } from '../services/stationService';
import { tankService } from '../services/tankService';
import { Station, Tank } from '../types';

export default function PumpDippingManagementScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [dippingReadings, setDippingReadings] = useState<{ [tankId: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showStationPicker, setShowStationPicker] = useState(false);

  // Sample data
  const sampleStations: Station[] = [
    {
      id: '1',
      name: 'ISSIRO STATION',
      code: 'ISS001',
      station_name: 'ISSIRO STATION',
      station_code: 'ISS001',
      location: 'Issiro, DRC',
      system_type: 'pump',
      usd_support: true,
      is_active: true,
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
      capacity_liters: 10000,
      current_stock: 7500,
    },
  ];

  const sampleTanks: Tank[] = [
    {
      id: '1',
      name: 'Tank 1',
      tank_number: 1,
      fuel_type: 'PMS',
      station_id: '1',
      capacity: 10000,
      current_dipping: 5020,
      closing_book_stock: 5000,
      variance: 20,
      pumps: ['1', '3'],
      is_active: true,
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Tank 2',
      tank_number: 2,
      fuel_type: 'AGO',
      station_id: '1',
      capacity: 10000,
      current_dipping: 4985,
      closing_book_stock: 5000,
      variance: -15,
      pumps: ['2', '4'],
      is_active: true,
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
    },
  ];

  const loadStations = useCallback(async () => {
    try {
      const response = await stationService.getStations();
      if (response.success && response.data) {
        setStations(response.data);
        if (response.data.length > 0 && !selectedStation) {
          setSelectedStation(response.data[0]);
        }
      } else {
        setStations(sampleStations);
        if (!selectedStation) {
          setSelectedStation(sampleStations[0]);
        }
      }
    } catch (error) {
      console.error('Error loading stations:', error);
      setStations(sampleStations);
      if (!selectedStation) {
        setSelectedStation(sampleStations[0]);
      }
    }
  }, [sampleStations, selectedStation]);

  const loadTanks = useCallback(async () => {
    if (!selectedStation) return;

    try {
      setLoading(true);
      const response = await tankService.getTanksByStation(selectedStation.id);
      if (response.success && response.data) {
        setTanks(response.data);
        // Initialize dipping readings with current values
        const readings: { [tankId: string]: string } = {};
        response.data.forEach(tank => {
          readings[tank.id] = tank.current_dipping.toString();
        });
        setDippingReadings(readings);
      } else {
        setTanks(sampleTanks);
        const readings: { [tankId: string]: string } = {};
        sampleTanks.forEach(tank => {
          readings[tank.id] = tank.current_dipping.toString();
        });
        setDippingReadings(readings);
      }
    } catch (error) {
      console.error('Error loading tanks:', error);
      setTanks(sampleTanks);
      const readings: { [tankId: string]: string } = {};
      sampleTanks.forEach(tank => {
        readings[tank.id] = tank.current_dipping.toString();
      });
      setDippingReadings(readings);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStation, sampleTanks]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTanks();
  }, [loadTanks]);

  const handleSaveDippingReadings = async () => {
    if (!appUser || appUser.role !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can save dipping readings');
      return;
    }

    // Validate all readings
    const readings: { tankId: string; dippingReading: number }[] = [];
    for (const tank of tanks) {
      const reading = dippingReadings[tank.id];
      if (!reading || reading.trim() === '') {
        Alert.alert('Error', `Please enter dipping reading for ${tank.name}`);
        return;
      }
      const value = parseFloat(reading);
      if (isNaN(value) || value < 0) {
        Alert.alert('Error', `Please enter a valid dipping reading for ${tank.name}`);
        return;
      }
      readings.push({ tankId: tank.id, dippingReading: value });
    }

    try {
      setLoading(true);
      const response = await tankService.updateDippingReadings(readings, appUser.id);
      
      if (response.success) {
        // Update local tank data with new readings
        const updatedTanks = tanks.map(tank => {
          const reading = readings.find(r => r.tankId === tank.id);
          if (reading) {
            const variance = reading.dippingReading - tank.closing_book_stock;
            return {
              ...tank,
              current_dipping: reading.dippingReading,
              variance: variance,
            };
          }
          return tank;
        });
        setTanks(updatedTanks);
        
        Alert.alert('Success', 'Dipping readings saved successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to save dipping readings');
      }
    } catch (error) {
      console.error('Error saving dipping readings:', error);
      Alert.alert('Error', 'Failed to save dipping readings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTank = () => {
    if (!selectedStation) {
      Alert.alert('Error', 'Please select a station first');
      return;
    }

    if (!appUser || appUser.role !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can add tanks');
      return;
    }

    (navigation as any).navigate('AddTank', { stationId: selectedStation.id });
  };

  const handleEditTank = (tank: Tank) => {
    if (!appUser || appUser.role !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can edit tanks');
      return;
    }

    (navigation as any).navigate('AddTank', { 
      stationId: selectedStation?.id || '', 
      tank: tank 
    });
  };

  const handleDeleteTank = async (tank: Tank) => {
    if (!appUser || appUser.role !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can delete tanks');
      return;
    }

    Alert.alert(
      'Delete Tank',
      `Are you sure you want to delete ${tank.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await tankService.deleteTank(tank.id);
              if (response.success) {
                setTanks(prev => prev.filter(t => t.id !== tank.id));
                Alert.alert('Success', 'Tank deleted successfully');
              } else {
                Alert.alert('Error', response.error || 'Failed to delete tank');
              }
            } catch (error) {
              console.error('Error deleting tank:', error);
              Alert.alert('Error', 'Failed to delete tank');
            }
          }
        }
      ]
    );
  };

  const getFuelTypeColor = (fuelType: string) => {
    switch (fuelType) {
      case 'PMS':
        return '#FF6B35';
      case 'AGO':
        return '#4CAF50';
      case 'DPK':
        return '#2196F3';
      case 'LPG':
        return '#FF9800';
      default:
        return '#F0C38E';
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return '#4CAF50'; // Green for positive
    if (variance < 0) return '#F44336'; // Red for negative
    return '#F0C38E'; // Neutral for zero
  };

  const formatVariance = (variance: number) => {
    const sign = variance >= 0 ? '+' : '';
    return `${sign}${variance} Liters`;
  };

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  useEffect(() => {
    loadTanks();
  }, [loadTanks]);

  return (
    <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>BISMILLAHI Pump Management</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Station Selector */}
          <View style={styles.stationSelector}>
            <TouchableOpacity 
              style={styles.stationButton}
              onPress={() => setShowStationPicker(true)}
            >
              <Text style={styles.stationButtonText}>
                {selectedStation ? selectedStation.name : 'Select Station'}
              </Text>
              <Ionicons name="swap-vertical" size={20} color="#F0C38E" />
            </TouchableOpacity>
          </View>

          {/* Tanks List */}
          <View style={styles.tanksList}>
            {tanks.map((tank) => (
              <View key={tank.id} style={styles.tankCard}>
                {/* Tank Header */}
                <View style={styles.tankHeader}>
                  <View style={styles.tankInfo}>
                    <Text style={styles.tankName}>{tank.name} ({tank.fuel_type})</Text>
                    <Text style={[styles.pumpsInfo, { color: getFuelTypeColor(tank.fuel_type) }]}>
                      Pumps: {tank.pumps.join(', ')}
                    </Text>
                  </View>
                  <View style={styles.tankActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleEditTank(tank)}
                    >
                      <Ionicons name="pencil" size={20} color="#F0C38E" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleDeleteTank(tank)}
                    >
                      <Ionicons name="trash" size={20} color="#F0C38E" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Current Dipping Reading */}
                <View style={styles.dippingSection}>
                  <Text style={styles.dippingLabel}>Current Dipping Reading (Liters)</Text>
                  <TextInput
                    style={styles.dippingInput}
                    value={dippingReadings[tank.id] || ''}
                    onChangeText={(text) => setDippingReadings(prev => ({
                      ...prev,
                      [tank.id]: text
                    }))}
                    placeholder="e.g., 5020"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    keyboardType="numeric"
                  />
                </View>

                {/* Stock Information */}
                <View style={styles.stockInfo}>
                  <View style={styles.stockRow}>
                    <Text style={styles.stockLabel}>Closing Book Stock:</Text>
                    <Text style={styles.stockValue}>{tank.closing_book_stock} Liters</Text>
                  </View>
                  <View style={styles.stockRow}>
                    <Text style={styles.stockLabel}>Variance:</Text>
                    <Text style={[styles.varianceValue, { color: getVarianceColor(tank.variance) }]}>
                      {formatVariance(tank.variance)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
              onPress={handleSaveDippingReadings}
              disabled={loading}
            >
              <Ionicons name="save" size={20} color="#ffffff" />
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Save Dipping Readings'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddTank}
            >
              <Ionicons name="add" size={20} color="#ffffff" />
              <Text style={styles.addButtonText}>Add New Pump/Tank</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Station Picker Modal */}
        <Modal
          visible={showStationPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowStationPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Station</Text>
              {stations.map((station) => (
                <TouchableOpacity
                  key={station.id}
                  style={[
                    styles.modalOption,
                    selectedStation?.id === station.id && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedStation(station);
                    setShowStationPicker(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedStation?.id === station.id && styles.modalOptionTextSelected
                  ]}>
                    {station.name}
                  </Text>
                  <Text style={styles.modalOptionSubtext}>
                    {station.code} - {station.location}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowStationPicker(false)}
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
  stationSelector: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  stationButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stationButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  tanksList: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  tankCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tankInfo: {
    flex: 1,
  },
  tankName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  pumpsInfo: {
    fontSize: 14,
    fontWeight: '500',
  },
  tankActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  dippingSection: {
    marginBottom: 16,
  },
  dippingLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 8,
  },
  dippingInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stockInfo: {
    gap: 8,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 14,
    color: '#ffffff',
  },
  stockValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  varianceValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionButtons: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#F0C38E',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(240, 195, 142, 0.5)',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
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
  modalOptionText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: '#F0C38E',
  },
  modalOptionSubtext: {
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



