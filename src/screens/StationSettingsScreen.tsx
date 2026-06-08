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
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { stationService } from '../services/stationService';
import { Station, StationSettings, SystemType } from '../types';

export default function StationSettingsScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [systemType, setSystemType] = useState<SystemType>('pump');
  const [usdSupport, setUsdSupport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showStationPicker, setShowStationPicker] = useState(false);

  // Sample data - Bismillahi stations
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
    {
      id: '2',
      name: 'DEPOT ISSIRO',
      code: 'DEP001',
      station_name: 'DEPOT ISSIRO',
      station_code: 'DEP001',
      location: 'Issiro Depot, DRC',
      system_type: 'pump',
      usd_support: true,
      is_active: true,
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
      capacity_liters: 15000,
      current_stock: 10000,
    },
    {
      id: '3',
      name: 'RUNGU STATION',
      code: 'RUN001',
      station_name: 'RUNGU STATION',
      station_code: 'RUN001',
      location: 'Rungu, DRC',
      system_type: 'pump',
      usd_support: true,
      is_active: true,
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
      capacity_liters: 8000,
      current_stock: 5000,
    },
    {
      id: '4',
      name: 'DURBA STATION',
      code: 'DUR001',
      station_name: 'DURBA STATION',
      station_code: 'DUR001',
      location: 'Durba, DRC',
      system_type: 'pump',
      usd_support: true,
      is_active: true,
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
      capacity_liters: 12000,
      current_stock: 8000,
    },
    {
      id: '5',
      name: 'DUNGU STATION',
      code: 'DUN001',
      station_name: 'DUNGU STATION',
      station_code: 'DUN001',
      location: 'Dungu, DRC',
      system_type: 'pump',
      usd_support: true,
      is_active: true,
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
      capacity_liters: 10000,
      current_stock: 6000,
    },
    {
      id: '6',
      name: 'NIANGARA STATION',
      code: 'NIA001',
      station_name: 'NIANGARA STATION',
      station_code: 'NIA001',
      location: 'Niangara, DRC',
      system_type: 'pump',
      usd_support: true,
      is_active: true,
      created_by: appUser?.id || '',
      created_at: new Date().toISOString(),
      capacity_liters: 8000,
      current_stock: 4500,
    },
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load stations
      const stationsResponse = await stationService.getStations();
      if (stationsResponse.success && stationsResponse.data) {
        setStations(stationsResponse.data);
        if (stationsResponse.data.length > 0) {
          setSelectedStation(stationsResponse.data[0]);
        }
      } else {
        // Use sample data
        setStations(sampleStations);
        setSelectedStation(sampleStations[0]);
      }

      // Load station settings
      const settingsResponse = await stationService.getStationSettings();
      if (settingsResponse.success && settingsResponse.data) {
        setSystemType(settingsResponse.data.system_type);
        setUsdSupport(settingsResponse.data.usd_support);
      } else {
        // Use default settings
        setSystemType('pump');
        setUsdSupport(false);
      }
    } catch (error) {
      console.error('Error loading station data:', error);
      // Use sample data on error
      setStations(sampleStations);
      setSelectedStation(sampleStations[0]);
      setSystemType('pump');
      setUsdSupport(false);
    } finally {
      setLoading(false);
    }
  }, [sampleStations]);

  const handleSaveSettings = async () => {
    if (!selectedStation) {
      Alert.alert('Error', 'Please select a station');
      return;
    }

    if (!appUser || appUser.role !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can save station settings');
      return;
    }

    try {
      setLoading(true);
      
      const settings: Omit<StationSettings, 'updated_by'> & { updated_by: string } = {
        selected_station_id: selectedStation.id,
        system_type: systemType,
        usd_support: usdSupport,
        updated_by: appUser.id,
      };

      const response = await stationService.updateStationSettings(settings);
      
      if (response.success) {
        Alert.alert('Success', 'Station settings saved successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving station settings:', error);
      Alert.alert('Error', 'Failed to save station settings');
    } finally {
      setLoading(false);
    }
  };

  const getSystemTypeLabel = (type: SystemType) => {
    switch (type) {
      case 'pump':
        return 'Pump System';
      case 'drum':
        return 'Drum System';
      default:
        return type;
    }
  };

  const getUsdSupportLabel = (enabled: boolean) => {
    return enabled ? 'Enabled' : 'Disabled';
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Station Settings</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Select Station Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SELECT STATION</Text>
            <TouchableOpacity 
              style={styles.stationPicker}
              onPress={() => setShowStationPicker(true)}
            >
              <Text style={styles.stationPickerText}>
                {selectedStation ? selectedStation.name : 'Select Station'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#F0C38E" />
            </TouchableOpacity>
          </View>

          {/* Configuration Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONFIGURATION</Text>
            
            {/* System Type */}
            <View style={styles.configCard}>
              <View style={styles.configContent}>
                <Text style={styles.configTitle}>System Type</Text>
                <Text style={styles.configSubtitle}>{getSystemTypeLabel(systemType)}</Text>
              </View>
              <Switch
                value={systemType === 'pump'}
                onValueChange={(value) => setSystemType(value ? 'pump' : 'drum')}
                trackColor={{ false: '#48426D', true: '#F0C38E' }}
                thumbColor="#ffffff"
                ios_backgroundColor="#48426D"
              />
            </View>

            {/* USD Support */}
            <View style={styles.configCard}>
              <View style={styles.configContent}>
                <Text style={styles.configTitle}>USD Support</Text>
                <Text style={styles.configSubtitle}>{getUsdSupportLabel(usdSupport)}</Text>
              </View>
              <Switch
                value={usdSupport}
                onValueChange={setUsdSupport}
                trackColor={{ false: '#48426D', true: '#F0C38E' }}
                thumbColor="#ffffff"
                ios_backgroundColor="#48426D"
              />
            </View>
          </View>

          {/* Save Button */}
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity 
              style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
              onPress={handleSaveSettings}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Save Settings'}
              </Text>
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
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F0C38E',
    marginBottom: 12,
    letterSpacing: 1,
  },
  stationPicker: {
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
  stationPickerText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  configCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  configContent: {
    flex: 1,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  configSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  saveButtonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  saveButton: {
    backgroundColor: '#F0C38E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(240, 195, 142, 0.5)',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#312C51',
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



