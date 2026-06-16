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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { stationService } from '../services/stationService';
import { tankService } from '../services/tankService';
import { pumpReadingService } from '../services/pumpReadingService';
import { Station, Tank, PumpFuelType } from '../types';

interface TankDippingInput {
  tankId: string;
  tankName: string;
  fuelType: PumpFuelType;
  capacity: number;
  previousDip: string;
  currentDip: string;
  offload: string;
  variance: number;
  pumps: string[];
}

export default function PumpDippingManagementScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [tankDippings, setTankDippings] = useState<{ [tankId: string]: TankDippingInput }>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showStationPicker, setShowStationPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [readingDate, setReadingDate] = useState(new Date().toISOString().split('T')[0]);

  // Derived: is this a drum station? (DEPOT ISSIRO)
  const isDrumStation = selectedStation?.system_type === 'drum' || selectedStation?.name?.toLowerCase().includes('issiro');

  const getFuelTypeColor = (fuelType: string) => {
    switch (fuelType) {
      case 'PMS': return '#FF6B35';
      case 'AGO': return '#4CAF50';
      default: return '#F0C38E';
    }
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) < 0.5) return '#4CAF50';
    if (variance > 0) return '#4CAF50';
    if (variance < 0) return '#F44336';
    return '#F0C38E';
  };

  // Calculate dip consumption for a fuel type: sum of (previousDip + offload - currentDip) for all tanks
  const getDipConsumptionByFuelType = (fuelType: PumpFuelType): number => {
    const fuelTanks = tanks.filter(t => t.fuel_type === fuelType);
    let totalConsumption = 0;
    for (const tank of fuelTanks) {
      const dip = tankDippings[tank.id];
      if (dip) {
        const prev = parseFloat(dip.previousDip) || 0;
        const curr = parseFloat(dip.currentDip) || 0;
        const offload = parseFloat(dip.offload) || 0;
        totalConsumption += prev + offload - curr;
      }
    }
    return totalConsumption;
  };

  // Validate dip vs expected (for pump stations, dip should match sales)
  const validateDipVsSales = (fuelType: PumpFuelType): { valid: boolean; dipConsumption: number; message: string } => {
    const dipConsumption = getDipConsumptionByFuelType(fuelType);
    const valid = dipConsumption >= 0;
    return {
      valid,
      dipConsumption,
      message: valid
        ? `✓ ${fuelType}: Dip consumption ${dipConsumption.toFixed(2)}L — OK`
        : `✗ ${fuelType}: Negative dip consumption (${dipConsumption.toFixed(2)}L). Current dip cannot exceed previous dip + offload.`,
    };
  };

  const loadStations = useCallback(async () => {
    try {
      const response = await stationService.getStations();
      if (response.success && response.data) {
        setStations(response.data);
        if (response.data.length > 0 && !selectedStation) {
          setSelectedStation(response.data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading stations:', error);
    }
  }, [selectedStation]);

  const loadTanks = useCallback(async () => {
    if (!selectedStation) return;

    try {
      setLoading(true);
      const response = await tankService.getTanksByStation(selectedStation.id);
      const loadedTanks: Tank[] = (response.success && response.data)
        ? response.data
        : [];

      // Build tank dipping inputs with previous/current dip
      const dippingMap: { [tankId: string]: TankDippingInput } = {};
      for (const tank of loadedTanks) {
        dippingMap[tank.id] = {
          tankId: tank.id,
          tankName: tank.name,
          fuelType: tank.fuel_type,
          capacity: tank.capacity,
          previousDip: tank.closing_book_stock.toString(),
          currentDip: tank.current_dipping.toString(),
          offload: '0',
          variance: tank.variance,
          pumps: tank.pumps,
        };
      }

      // Batch all state updates at once to prevent flickering
      setTanks(loadedTanks);
      setTankDippings(dippingMap);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading tanks:', error);
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStation]);

  const handleTankDippingChange = (tankId: string, field: keyof TankDippingInput, value: string) => {
    const updated = { ...tankDippings };
    if (updated[tankId]) {
      updated[tankId] = { ...updated[tankId], [field]: value };
      const currentDip = parseFloat(field === 'currentDip' ? value : updated[tankId].currentDip) || 0;
      const previousDip = parseFloat(field === 'previousDip' ? value : updated[tankId].previousDip) || 0;
      updated[tankId].variance = currentDip - previousDip;
    }
    setTankDippings(updated);
  };

  const handleSaveDippingReadings = async () => {
    if (!appUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Validate all readings
    for (const dip of Object.values(tankDippings)) {
      const current = parseFloat(dip.currentDip);
      const previous = parseFloat(dip.previousDip);
      const offload = parseFloat(dip.offload);
      if (isNaN(current) || current < 0) {
        Alert.alert('Input Error', `Please enter a valid current dip for ${dip.tankName}`);
        return;
      }
      if (isNaN(previous) || previous < 0) {
        Alert.alert('Input Error', `Please enter a valid previous dip for ${dip.tankName}`);
        return;
      }
      if (isNaN(offload) || offload < 0) {
        Alert.alert('Input Error', `Please enter a valid offload amount for ${dip.tankName}`);
        return;
      }
    }

    // Validate dip consumption is not negative for each fuel type
    const fuelTypes: PumpFuelType[] = ['PMS', 'AGO'];
    const negativeConsumptions: string[] = [];
    for (const fuelType of fuelTypes) {
      const result = validateDipVsSales(fuelType);
      if (!result.valid) {
        negativeConsumptions.push(result.message);
      }
    }

    if (negativeConsumptions.length > 0) {
      Alert.alert(
        'Invalid Dip Readings',
        'The following issues were found:\n\n' + negativeConsumptions.join('\n\n') +
        '\n\nPlease correct the readings before saving.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setSaving(true);
      const readings = Object.values(tankDippings).map(d => ({
        tankId: d.tankId,
        dippingReading: parseFloat(d.currentDip) || 0,
      }));

      const response = await tankService.updateDippingReadings(readings, appUser.id);
      if (response.success) {
        // Show validation summary after save
        const summary = fuelTypes
          .map(ft => validateDipVsSales(ft))
          .map(r => r.message)
          .join('\n');

        Alert.alert('Success', 'Dipping readings saved successfully!\n\n' + summary);
      } else {
        Alert.alert('Error', response.error || 'Failed to save dipping readings');
      }
    } catch (error) {
      console.error('Error saving dipping readings:', error);
      Alert.alert('Error', 'Failed to save dipping readings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTank = () => {
    if (!selectedStation) {
      Alert.alert('Error', 'Please select a station first');
      return;
    }
    (navigation as any).navigate('AddTank', { stationId: selectedStation.id });
  };

  const handleEditTank = (tank: Tank) => {
    (navigation as any).navigate('AddTank', {
      stationId: selectedStation?.id || '',
      tank: tank,
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
          },
        },
      ]
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTanks();
  }, [loadTanks]);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  useEffect(() => {
    if (selectedStation) {
      loadTanks();
    }
  }, [selectedStation, loadTanks]);

  return (
    <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isDrumStation ? 'Dip Reading (Drum Sales)' : 'Tank Dipping'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Station Type Badge */}
        <View style={styles.stationTypeBadge}>
          <View style={[styles.badgeDot, {
            backgroundColor: isDrumStation ? '#FF9800' : '#4CAF50'
          }]} />
          <Text style={styles.stationTypeText}>
            {selectedStation?.name || 'Select Station'}
            {' — '}
            {isDrumStation ? 'Drum Sales (Dip Only)' : 'Pump System'}
          </Text>
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
            <Text style={styles.stationDateText}>Date: {readingDate}</Text>
            <Ionicons name="swap-vertical" size={20} color="#F0C38E" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F0C38E" />
            <Text style={styles.loadingText}>Loading tank data...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Date and Offload Info */}
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.fieldLabel}>Reading Date</Text>
                <TextInput
                  style={styles.readingInput}
                  value={readingDate}
                  onChangeText={setReadingDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={18} color="#F0C38E" />
              <Text style={styles.infoBannerText}>
                Enter the previous day's closing dip and today's current dip.
                {'\n'}Consumption = Previous Dip + Offload - Current Dip
                {'\n'}This should match the fuel type sold for the day.
              </Text>
            </View>

            {/* Tanks List */}
            <View style={styles.tanksList}>
              {(['PMS', 'AGO'] as PumpFuelType[]).map(fuelType => {
                const fuelTanks = tanks.filter(t => t.fuel_type === fuelType);
                if (fuelTanks.length === 0) return null;

                const dipConsumption = getDipConsumptionByFuelType(fuelType);
                const dipValid = dipConsumption >= 0;

                return (
                  <View key={fuelType} style={styles.fuelTypeSection}>
                    {/* Fuel Type Header */}
                    <View style={[styles.fuelTypeHeader, { backgroundColor: getFuelTypeColor(fuelType) + '33' }]}>
                      <Ionicons name="flame" size={18} color={getFuelTypeColor(fuelType)} />
                      <Text style={[styles.fuelTypeTitle, { color: getFuelTypeColor(fuelType) }]}>
                        {fuelType === 'PMS' ? 'PMS Tanks' : 'AGO Tanks'}
                      </Text>
                    </View>

                    {/* Dip Consumption Validation Banner */}
                    <View style={[styles.validationBanner, {
                      backgroundColor: dipValid ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)',
                      marginBottom: 12,
                    }]}>
                      <Ionicons
                        name={dipValid ? 'checkmark-circle' : 'warning'}
                        size={18}
                        color={dipValid ? '#4CAF50' : '#F44336'}
                      />
                      <Text style={[styles.validationBannerText, { color: dipValid ? '#4CAF50' : '#F44336' }]}>
                        {dipValid
                          ? `Dip Consumption: ${dipConsumption.toFixed(2)}L — Valid`
                          : `ERROR: Negative consumption (${dipConsumption.toFixed(2)}L). Current dip exceeds previous + offload.`
                        }
                        {'\n'}(This should equal fuel type sold for the day)
                      </Text>
                    </View>

                    {/* Tank Cards */}
                    {fuelTanks.map(tank => {
                      const dip = tankDippings[tank.id];
                      if (!dip) return null;

                      const prev = parseFloat(dip.previousDip) || 0;
                      const curr = parseFloat(dip.currentDip) || 0;
                      const offload = parseFloat(dip.offload) || 0;
                      const consumption = prev + offload - curr;

                      return (
                        <View key={tank.id} style={styles.tankCard}>
                          <View style={styles.tankCardHeader}>
                            <View style={styles.tankHeaderRow}>
                              <Text style={styles.tankName}>{tank.name}</Text>
                              <View style={styles.tankActions}>
                                <TouchableOpacity onPress={() => handleEditTank(tank)}>
                                  <Ionicons name="pencil" size={18} color="#F0C38E" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteTank(tank)}>
                                  <Ionicons name="trash" size={18} color="#F0C38E" />
                                </TouchableOpacity>
                              </View>
                            </View>
                            <Text style={[styles.tankCapacity, { color: getFuelTypeColor(tank.fuel_type) }]}>
                              Capacity: {tank.capacity.toLocaleString()} L | Pumps: {tank.pumps.length}
                            </Text>
                          </View>

                          <View style={styles.dippingRow}>
                            <View style={styles.dippingField}>
                              <Text style={styles.fieldLabel}>Previous Dip (L)</Text>
                              <TextInput
                                style={styles.readingInput}
                                value={dip.previousDip}
                                onChangeText={(val) => handleTankDippingChange(tank.id, 'previousDip', val)}
                                keyboardType="numeric"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                placeholder="0"
                              />
                            </View>
                            <View style={styles.dippingField}>
                              <Text style={styles.fieldLabel}>Current Dip (L)</Text>
                              <TextInput
                                style={styles.readingInput}
                                value={dip.currentDip}
                                onChangeText={(val) => handleTankDippingChange(tank.id, 'currentDip', val)}
                                keyboardType="numeric"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                placeholder="0"
                              />
                            </View>
                          </View>

                          <View style={styles.offloadRow}>
                            <Text style={styles.fieldLabel}>Fuel Offloaded Today (Liters)</Text>
                            <TextInput
                              style={[styles.readingInput, styles.offloadInput]}
                              value={dip.offload}
                              onChangeText={(val) => handleTankDippingChange(tank.id, 'offload', val)}
                              keyboardType="numeric"
                              placeholderTextColor="rgba(255,255,255,0.3)"
                              placeholder="0"
                            />
                          </View>

                          {/* RESULT: Consumption Calculation */}
                          <View style={[styles.dippingResult, {
                            borderColor: consumption >= 0 ? 'rgba(76,175,80,0.5)' : 'rgba(244,67,54,0.5)',
                            borderWidth: 1,
                          }]}>
                            <View style={styles.resultRow}>
                              <Text style={styles.fieldLabel}>Consumption (Prev+Offload-Current):</Text>
                              <Text style={[styles.resultValue, { 
                                color: consumption >= 0 ? '#4CAF50' : '#F44336',
                                fontWeight: 'bold',
                              }]}>
                                {consumption.toFixed(2)} L
                              </Text>
                            </View>
                            <View style={styles.resultRow}>
                              <Text style={styles.fieldLabel}>Dip Variance:</Text>
                              <Text style={[styles.resultValue, { color: getVarianceColor(dip.variance) }]}>
                                {dip.variance >= 0 ? '+' : ''}{dip.variance.toFixed(2)} L
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>

            {tanks.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="alert-circle" size={40} color="#F0C38E" />
                <Text style={styles.emptyText}>No tanks found for this station</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveDippingReadings}
                disabled={saving}
              >
                <Ionicons name={saving ? 'hourglass' : 'save'} size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save Dip Readings'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddTank}
              >
                <Ionicons name="add" size={20} color="#F0C38E" />
                <Text style={styles.addButtonText}>Add Tank</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

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
                    selectedStation?.id === station.id && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedStation(station);
                    setShowStationPicker(false);
                  }}
                >
                  <View style={styles.modalOptionRow}>
                    <Text
                      style={[
                        styles.modalOptionText,
                        selectedStation?.id === station.id && styles.modalOptionTextSelected,
                      ]}
                    >
                      {station.name}
                    </Text>
                    <View
                      style={[
                        styles.badgeSmall,
                        {
                          backgroundColor:
                            station.system_type === 'drum' ? '#FF9800' : '#4CAF50',
                        },
                      ]}
                    >
                      <Text style={styles.badgeSmallText}>
                        {station.system_type === 'drum' ? 'DRUM' : 'PUMP'}
                      </Text>
                    </View>
                  </View>
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
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: { width: 24 },
  stationTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  stationTypeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  stationSelector: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  stationButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  stationButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    flex: 1,
  },
  stationDateText: {
    fontSize: 11,
    color: '#F0C38E',
    marginRight: 8,
  },
  dateRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  dateField: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#F0C38E',
    marginTop: 12,
    fontSize: 14,
  },
  content: { flex: 1 },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(240, 195, 142, 0.1)',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(240, 195, 142, 0.3)',
  },
  infoBannerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
    lineHeight: 18,
  },
  tanksList: { paddingHorizontal: 16, paddingBottom: 16 },
  fuelTypeSection: { marginBottom: 20 },
  fuelTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  fuelTypeTitle: { fontSize: 14, fontWeight: 'bold' },
  validationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  validationBannerText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  tankCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  tankCardHeader: { marginBottom: 12 },
  tankHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tankName: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  tankCapacity: { fontSize: 12, marginTop: 2 },
  tankActions: { flexDirection: 'row', gap: 12 },
  dippingRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dippingField: { flex: 1 },
  fieldLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 6,
  },
  readingInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  offloadRow: { marginBottom: 12 },
  offloadInput: { marginTop: 6 },
  dippingResult: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultValue: { fontSize: 14, color: '#ffffff', fontWeight: '600' },
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
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(240, 195, 142, 0.3)',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F0C38E',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
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
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  modalOptionTextSelected: { color: '#F0C38E' },
  modalOptionSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeSmallText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
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