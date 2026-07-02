import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  TextInput,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { stationService } from '../services/stationService';
import {
  Station,
  StationSettings,
  StationCapabilities,
  StationConfiguration,
  SystemType,
  CAPABILITY_CATEGORIES,
  DEFAULT_CAPABILITIES,
  DEFAULT_CONFIGURATION,
  CapabilityCategory,
  Currency,
  FuelType,
  PaymentMethod,
} from '../types';

const { width, height } = Dimensions.get('window');

// Sample stations for demo/offline
const sampleStations: Station[] = [
  {
    id: '1', name: 'ISSIRO STATION', code: 'ISS001', station_name: 'ISSIRO STATION',
    station_code: 'ISS001', location: 'Issiro, DRC', system_type: 'pump',
    usd_support: true, is_active: true, created_by: '', created_at: '',
    capacity_liters: 10000, current_stock: 7500,
  },
  {
    id: '2', name: 'DEPOT ISSIRO', code: 'DEP001', station_name: 'DEPOT ISSIRO',
    station_code: 'DEP001', location: 'Issiro Depot, DRC', system_type: 'pump',
    usd_support: true, is_active: true, created_by: '', created_at: '',
    capacity_liters: 15000, current_stock: 10000,
  },
  {
    id: '3', name: 'RUNGU STATION', code: 'RUN001', station_name: 'RUNGU STATION',
    station_code: 'RUN001', location: 'Rungu, DRC', system_type: 'pump',
    usd_support: true, is_active: true, created_by: '', created_at: '',
    capacity_liters: 8000, current_stock: 5000,
  },
  {
    id: '4', name: 'DURBA STATION', code: 'DUR001', station_name: 'DURBA STATION',
    station_code: 'DUR001', location: 'Durba, DRC', system_type: 'pump',
    usd_support: true, is_active: true, created_by: '', created_at: '',
    capacity_liters: 12000, current_stock: 8000,
  },
  {
    id: '5', name: 'DUNGU STATION', code: 'DUN001', station_name: 'DUNGU STATION',
    station_code: 'DUN001', location: 'Dungu, DRC', system_type: 'pump',
    usd_support: true, is_active: true, created_by: '', created_at: '',
    capacity_liters: 10000, current_stock: 6000,
  },
  {
    id: '6', name: 'NIANGARA STATION', code: 'NIA001', station_name: 'NIANGARA STATION',
    station_code: 'NIA001', location: 'Niangara, DRC', system_type: 'pump',
    usd_support: true, is_active: true, created_by: '', created_at: '',
    capacity_liters: 8000, current_stock: 4500,
  },
];

type TabType = 'capabilities' | 'configuration' | 'system';

export default function StationSettingsScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [settings, setSettings] = useState<StationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStationPicker, setShowStationPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('capabilities');
  const [showConfigurationModal, setShowConfigurationModal] = useState(false);
  const [configurationValues, setConfigurationValues] = useState<StationConfiguration>(DEFAULT_CONFIGURATION);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [enableAllFeatures, setEnableAllFeatures] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Toggle animation
  const animateToggle = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.7, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // Load stations on mount
  const loadStations = useCallback(async () => {
    try {
      const stationsResponse = await stationService.getStations();
      if (stationsResponse.success && stationsResponse.data && stationsResponse.data.length > 0) {
        setStations(stationsResponse.data);
        return stationsResponse.data;
      } else {
        setStations(sampleStations);
        return sampleStations;
      }
    } catch (error) {
      console.error('Error loading stations:', error);
      setStations(sampleStations);
      return sampleStations;
    }
  }, []);

  // Load settings for a specific station
  const loadSettingsForStation = useCallback(async (station: Station) => {
    try {
      setLoading(true);
      setHasChanges(false);

      const settingsResponse = await stationService.getStationSettings(station.id);
      if (settingsResponse.success && settingsResponse.data) {
        setSettings(settingsResponse.data);
        setConfigurationValues(settingsResponse.data.configuration);
        // Check if all features are enabled
        const caps = settingsResponse.data.capabilities;
        const allEnabled = Object.values(caps).every(v => v === true);
        setEnableAllFeatures(allEnabled);
      } else {
        // Use defaults
        const defaultSettings: StationSettings = {
          selected_station_id: station.id,
          system_type: station.system_type || 'pump',
          usd_support: station.usd_support ?? true,
          updated_by: appUser?.id || '',
          updated_at: new Date().toISOString(),
          capabilities: { ...DEFAULT_CAPABILITIES },
          configuration: { ...DEFAULT_CONFIGURATION },
          is_active: true,
          maintenance_mode: false,
        };
        setSettings(defaultSettings);
        setConfigurationValues(DEFAULT_CONFIGURATION);
        setEnableAllFeatures(true);
      }
    } catch (error) {
      console.error('Error loading station settings:', error);
      // Set defaults on error
      const defaultSettings: StationSettings = {
        selected_station_id: station.id,
        system_type: station.system_type || 'pump',
        usd_support: station.usd_support ?? true,
        updated_by: appUser?.id || '',
        updated_at: new Date().toISOString(),
        capabilities: { ...DEFAULT_CAPABILITIES },
        configuration: { ...DEFAULT_CONFIGURATION },
        is_active: true,
        maintenance_mode: false,
      };
      setSettings(defaultSettings);
      setConfigurationValues(DEFAULT_CONFIGURATION);
      setEnableAllFeatures(true);
    } finally {
      setLoading(false);
    }
  }, [appUser?.id]);

  // Initialize: load stations and auto-select first
  useEffect(() => {
    const initialize = async () => {
      setInitialLoading(true);
      const loadedStations = await loadStations();
      
      if (loadedStations && loadedStations.length > 0) {
        // Don't auto-select - show the picker if none selected
        // But if we already have a selected station, keep it
        setSelectedStation(loadedStations[0]);
      }
      setInitialLoading(false);
    };
    initialize();
  }, []); // Only run on mount

  // When selectedStation changes (after initial mount), load its settings
  useEffect(() => {
    if (selectedStation) {
      loadSettingsForStation(selectedStation);
    }
  }, [selectedStation?.id]);

  const handleStationSelect = (station: Station) => {
    // This correctly updates state - the useEffect above will trigger loadSettingsForStation
    setSelectedStation(station);
    setShowStationPicker(false);
    setExpandedCategory(null);
    setHasChanges(false);
  };

  // Toggle a single capability
  const toggleCapability = (key: keyof StationCapabilities) => {
    if (!settings) return;
    animateToggle();
    
    const newCapabilities = {
      ...settings.capabilities,
      [key]: !settings.capabilities[key],
    };
    
    setSettings({
      ...settings,
      capabilities: newCapabilities,
    });
    
    // Update enableAllFeatures based on new state
    const allEnabled = Object.values(newCapabilities).every(v => v === true);
    setEnableAllFeatures(allEnabled);
    setHasChanges(true);
  };

  // Toggle all capabilities
  const toggleAllCapabilities = () => {
    if (!settings) return;
    animateToggle();

    const newValue = !enableAllFeatures;
    const newCapabilities = { ...DEFAULT_CAPABILITIES };
    
    // Set all to the new value
    Object.keys(newCapabilities).forEach(key => {
      (newCapabilities as any)[key] = newValue;
    });

    setSettings({
      ...settings,
      capabilities: newCapabilities,
    });
    setEnableAllFeatures(newValue);
    setHasChanges(true);
  };

  // Toggle all capabilities in a category
  const toggleCategory = (categoryId: string) => {
    if (!settings) return;
    animateToggle();

    const category = CAPABILITY_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;

    const allEnabledInCategory = category.features.every(
      f => settings.capabilities[f.key]
    );
    const newValue = !allEnabledInCategory;

    const newCapabilities = { ...settings.capabilities };
    category.features.forEach(f => {
      (newCapabilities as any)[f.key] = newValue;
    });

    setSettings({
      ...settings,
      capabilities: newCapabilities,
    });

    const allEnabled = Object.values(newCapabilities).every(v => v === true);
    setEnableAllFeatures(allEnabled);
    setHasChanges(true);
  };

  // Toggle expanded category
  const toggleExpandedCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  // Configuration change handlers
  const updateConfiguration = (key: keyof StationConfiguration, value: any) => {
    setConfigurationValues(prev => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

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
      setSaving(true);

      if (!settings) return;

      const updatedSettings: StationSettings = {
        ...settings,
        selected_station_id: selectedStation.id,
        system_type: selectedStation.system_type || 'pump',
        usd_support: selectedStation.usd_support ?? true,
        updated_by: appUser.id,
        updated_at: new Date().toISOString(),
        configuration: configurationValues,
      };

      const response = await stationService.updateStationSettings(updatedSettings);
      
      if (response.success) {
        if (response.data) {
          setSettings(response.data);
        }
        setHasChanges(false);
        Alert.alert('Success', 'Station settings saved successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving station settings:', error);
      Alert.alert('Error', 'Failed to save station settings');
    } finally {
      setSaving(false);
    }
  };

  // Get station info
  const getStationInfo = () => {
    if (!selectedStation) return null;
    const totalFeatures = Object.keys(DEFAULT_CAPABILITIES).length;
    const enabledFeatures = settings ? Object.values(settings.capabilities).filter(v => v).length : 0;
    const progress = totalFeatures > 0 ? (enabledFeatures / totalFeatures) * 100 : 0;
    
    return {
      totalFeatures,
      enabledFeatures,
      progress,
    };
  };

  const stationInfo = getStationInfo();

  // Get icon for category
  const getCategoryIcon = (iconName: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      'cash': 'cash',
      'cube': 'cube',
      'cash-outline': 'cash-outline',
      'wallet': 'wallet',
      'flame': 'flame',
      'bar-chart': 'bar-chart',
      'settings': 'settings',
    };
    return iconMap[iconName] || 'settings';
  };

  // Get icon for feature
  const getFeatureIcon = (iconName: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      'car-sport': 'car-sport',
      'cube': 'cube',
      'document-text': 'document-text',
      'receipt': 'receipt',
      'analytics': 'analytics',
      'trending-down': 'trending-down',
      'alert-circle': 'alert-circle',
      'add-circle': 'add-circle',
      'time': 'time',
      'folder': 'folder',
      'swap-horizontal': 'swap-horizontal',
      'trending-up': 'trending-up',
      'arrow-back-circle': 'arrow-back-circle',
      'arrow-forward-circle': 'arrow-forward-circle',
      'people': 'people',
      'speedometer': 'speedometer',
      'water': 'water',
      'car': 'car',
      'document': 'document',
      'bus': 'bus',
      'calendar': 'calendar',
      'stats-chart': 'stats-chart',
      'notifications': 'notifications',
      'sync': 'sync',
      'cloud-done': 'cloud-done',
      'finger-print': 'finger-print',
      'location': 'location',
      'volume-high': 'volume-high',
    };
    return iconMap[iconName] || 'ellipse';
  };

  // Render progress bar
  const renderProgressBar = (progress: number) => (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>{Math.round(progress)}%</Text>
    </View>
  );

  // Render a category card
  const renderCategoryCard = (category: CapabilityCategory) => {
    if (!settings) return null;
    
    const isExpanded = expandedCategory === category.id;
    const featuresInCategory = category.features;
    const enabledInCategory = featuresInCategory.filter(f => settings.capabilities[f.key]).length;
    const totalInCategory = featuresInCategory.length;
    const allEnabledInCategory = enabledInCategory === totalInCategory;

    return (
      <Animated.View key={category.id} style={styles.categoryCard}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => toggleExpandedCategory(category.id)}
          activeOpacity={0.7}
        >
          <View style={styles.categoryHeaderLeft}>
            <View style={[styles.categoryIconContainer, { backgroundColor: category.color + '20' }]}>
              <Ionicons name={getCategoryIcon(category.icon)} size={22} color={category.color} />
            </View>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
              <Text style={styles.categoryFeatureCount}>
                {enabledInCategory}/{totalInCategory} features enabled
              </Text>
            </View>
          </View>
          <View style={styles.categoryHeaderRight}>
            <TouchableOpacity
              style={[styles.categoryToggleButton, allEnabledInCategory && styles.categoryToggleButtonActive]}
              onPress={() => toggleCategory(category.id)}
            >
              <Ionicons
                name={allEnabledInCategory ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={allEnabledInCategory ? category.color : 'rgba(255,255,255,0.4)'}
              />
            </TouchableOpacity>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="rgba(255,255,255,0.6)"
              style={{ marginLeft: 8 }}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.categoryFeaturesContainer}>
            {featuresInCategory.map((feature) => (
              <TouchableOpacity
                key={feature.key}
                style={[
                  styles.featureItem,
                  settings.capabilities[feature.key] && styles.featureItemActive,
                ]}
                onPress={() => toggleCapability(feature.key)}
                activeOpacity={0.7}
              >
                <View style={styles.featureLeft}>
                  <Ionicons
                    name={getFeatureIcon(feature.icon)}
                    size={18}
                    color={settings.capabilities[feature.key] ? category.color : 'rgba(255,255,255,0.4)'}
                  />
                  <View style={styles.featureInfo}>
                    <Text style={[
                      styles.featureLabel,
                      settings.capabilities[feature.key] && styles.featureLabelActive,
                    ]}>
                      {feature.label}
                    </Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                </View>
                <Switch
                  value={settings.capabilities[feature.key]}
                  onValueChange={() => toggleCapability(feature.key)}
                  trackColor={{ false: '#3a3568', true: category.color + '80' }}
                  thumbColor={settings.capabilities[feature.key] ? category.color : '#666'}
                  ios_backgroundColor="#3a3568"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>
    );
  };

  // Render configuration tab
  const renderConfigurationTab = () => (
    <View style={styles.configTabContainer}>
      {/* Basic Configuration */}
      <View style={styles.configSection}>
        <Text style={styles.configSectionTitle}>Station Info</Text>
        <View style={styles.configCard}>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Station Name</Text>
            <Text style={styles.configValue}>{selectedStation?.name || 'N/A'}</Text>
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Station Code</Text>
            <Text style={styles.configValue}>{selectedStation?.code || 'N/A'}</Text>
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Location</Text>
            <Text style={styles.configValue}>{selectedStation?.location || 'N/A'}</Text>
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>System Type</Text>
            <View style={styles.systemTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.systemTypeButton,
                  configurationValues.system_type === 'pump' && styles.systemTypeButtonActive,
                ]}
                onPress={() => updateConfiguration('system_type', 'pump')}
              >
                <Text style={[
                  styles.systemTypeText,
                  configurationValues.system_type === 'pump' && styles.systemTypeTextActive,
                ]}>Pump</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Currency Configuration */}
      <View style={styles.configSection}>
        <Text style={styles.configSectionTitle}>Currency Settings</Text>
        <View style={styles.configCard}>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>USD Support</Text>
            <Switch
              value={configurationValues.usd_support}
              onValueChange={(v) => updateConfiguration('usd_support', v)}
              trackColor={{ false: '#3a3568', true: '#F0C38E80' }}
              thumbColor={configurationValues.usd_support ? '#F0C38E' : '#666'}
            />
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Multi-Currency</Text>
            <Switch
              value={configurationValues.multi_currency}
              onValueChange={(v) => updateConfiguration('multi_currency', v)}
              trackColor={{ false: '#3a3568', true: '#F0C38E80' }}
              thumbColor={configurationValues.multi_currency ? '#F0C38E' : '#666'}
            />
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Local Currency (CDF)</Text>
            <Switch
              value={configurationValues.cdf_support}
              onValueChange={(v) => updateConfiguration('cdf_support', v)}
              trackColor={{ false: '#3a3568', true: '#F0C38E80' }}
              thumbColor={configurationValues.cdf_support ? '#F0C38E' : '#666'}
            />
          </View>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.configSection}>
        <Text style={styles.configSectionTitle}>Notification Preferences</Text>
        <View style={styles.configCard}>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Push Notifications</Text>
            <Switch
              value={configurationValues.enable_push_notifications}
              onValueChange={(v) => updateConfiguration('enable_push_notifications', v)}
              trackColor={{ false: '#3a3568', true: '#F0C38E80' }}
              thumbColor={configurationValues.enable_push_notifications ? '#F0C38E' : '#666'}
            />
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Email Notifications</Text>
            <Switch
              value={configurationValues.enable_email_notifications}
              onValueChange={(v) => updateConfiguration('enable_email_notifications', v)}
              trackColor={{ false: '#3a3568', true: '#F0C38E80' }}
              thumbColor={configurationValues.enable_email_notifications ? '#F0C38E' : '#666'}
            />
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>SMS Notifications</Text>
            <Switch
              value={configurationValues.enable_sms_notifications}
              onValueChange={(v) => updateConfiguration('enable_sms_notifications', v)}
              trackColor={{ false: '#3a3568', true: '#F0C38E80' }}
              thumbColor={configurationValues.enable_sms_notifications ? '#F0C38E' : '#666'}
            />
          </View>
        </View>
      </View>

      {/* Operational Settings */}
      <View style={styles.configSection}>
        <Text style={styles.configSectionTitle}>Operational Settings</Text>
        <View style={styles.configCard}>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Low Stock Threshold (L)</Text>
            <TextInput
              style={styles.configInput}
              value={String(configurationValues.low_stock_threshold)}
              onChangeText={(v) => updateConfiguration('low_stock_threshold', parseInt(v) || 0)}
              keyboardType="numeric"
              placeholderTextColor="rgba(255,255,255,0.4)"
            />
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Auto Sync Interval (min)</Text>
            <TextInput
              style={styles.configInput}
              value={String(configurationValues.auto_sync_interval)}
              onChangeText={(v) => updateConfiguration('auto_sync_interval', parseInt(v) || 5)}
              keyboardType="numeric"
              placeholderTextColor="rgba(255,255,255,0.4)"
            />
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Max Credit Limit</Text>
            <TextInput
              style={styles.configInput}
              value={String(configurationValues.max_credit_limit)}
              onChangeText={(v) => updateConfiguration('max_credit_limit', parseInt(v) || 0)}
              keyboardType="numeric"
              placeholderTextColor="rgba(255,255,255,0.4)"
            />
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Tax Rate (%)</Text>
            <TextInput
              style={styles.configInput}
              value={String(configurationValues.tax_rate)}
              onChangeText={(v) => updateConfiguration('tax_rate', parseFloat(v) || 0)}
              keyboardType="decimal-pad"
              placeholderTextColor="rgba(255,255,255,0.4)"
            />
          </View>
        </View>
      </View>

      {/* Operating Hours */}
      <View style={styles.configSection}>
        <Text style={styles.configSectionTitle}>Operating Hours</Text>
        <View style={styles.configCard}>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Opening Time</Text>
            <TextInput
              style={styles.configInput}
              value={configurationValues.operating_hours_start}
              onChangeText={(v) => updateConfiguration('operating_hours_start', v)}
              placeholderTextColor="rgba(255,255,255,0.4)"
            />
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Closing Time</Text>
            <TextInput
              style={styles.configInput}
              value={configurationValues.operating_hours_end}
              onChangeText={(v) => updateConfiguration('operating_hours_end', v)}
              placeholderTextColor="rgba(255,255,255,0.4)"
            />
          </View>
        </View>
      </View>
    </View>
  );

  // Render system / maintenance tab
  const renderSystemTab = () => (
    <View style={styles.configTabContainer}>
      <View style={styles.configSection}>
        <Text style={styles.configSectionTitle}>Station Status</Text>
        <View style={styles.configCard}>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Active Station</Text>
            <Switch
              value={settings?.is_active ?? true}
              onValueChange={(v) => {
                if (settings) {
                  setSettings({ ...settings, is_active: v });
                  setHasChanges(true);
                }
              }}
              trackColor={{ false: '#3a3568', true: '#4CAF5080' }}
              thumbColor={settings?.is_active ? '#4CAF50' : '#666'}
            />
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Maintenance Mode</Text>
            <Switch
              value={settings?.maintenance_mode ?? false}
              onValueChange={(v) => {
                if (settings) {
                  setSettings({ ...settings, maintenance_mode: v });
                  setHasChanges(true);
                }
              }}
              trackColor={{ false: '#3a3568', true: '#FF980080' }}
              thumbColor={settings?.maintenance_mode ? '#FF9800' : '#666'}
            />
          </View>
        </View>
      </View>

      {/* App Settings Integration - from SettingsScreen */}
      <View style={styles.configSection}>
        <Text style={styles.configSectionTitle}>App-Wide Features</Text>
        <Text style={styles.configSectionSubtitle}>
          These settings control app-wide behavior for this station
        </Text>
        <View style={styles.configCard}>
          <View style={styles.configRow}>
            <View style={styles.configLabelContainer}>
              <Ionicons name="notifications" size={20} color="#F0C38E" />
              <Text style={styles.configLabel}>Notifications</Text>
            </View>
            <Switch
              value={settings?.capabilities.notifications ?? true}
              onValueChange={() => toggleCapability('notifications')}
              trackColor={{ false: '#3a3568', true: '#F0C38E80' }}
              thumbColor={settings?.capabilities.notifications ? '#F0C38E' : '#666'}
            />
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <View style={styles.configLabelContainer}>
              <Ionicons name="sync" size={20} color="#F0C38E" />
              <Text style={styles.configLabel}>Auto Sync</Text>
            </View>
            <Switch
              value={settings?.capabilities.data_sync ?? true}
              onValueChange={() => toggleCapability('data_sync')}
              trackColor={{ false: '#3a3568', true: '#F0C38E80' }}
              thumbColor={settings?.capabilities.data_sync ? '#F0C38E' : '#666'}
            />
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <View style={styles.configLabelContainer}>
              <Ionicons name="cloud-done" size={20} color="#F0C38E" />
              <Text style={styles.configLabel}>Auto Backup</Text>
            </View>
            <Switch
              value={settings?.capabilities.auto_backup ?? true}
              onValueChange={() => toggleCapability('auto_backup')}
              trackColor={{ false: '#3a3568', true: '#F0C38E80' }}
              thumbColor={settings?.capabilities.auto_backup ? '#F0C38E' : '#666'}
            />
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <View style={styles.configLabelContainer}>
              <Ionicons name="finger-print" size={20} color="#F0C38E" />
              <Text style={styles.configLabel}>Biometric Auth</Text>
            </View>
            <Switch
              value={settings?.capabilities.biometric_auth ?? false}
              onValueChange={() => toggleCapability('biometric_auth')}
              trackColor={{ false: '#3a3568', true: '#F0C38E80' }}
              thumbColor={settings?.capabilities.biometric_auth ? '#F0C38E' : '#666'}
            />
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <View style={styles.configLabelContainer}>
              <Ionicons name="location" size={20} color="#F0C38E" />
              <Text style={styles.configLabel}>Location Services</Text>
            </View>
            <Switch
              value={settings?.capabilities.location_services ?? false}
              onValueChange={() => toggleCapability('location_services')}
              trackColor={{ false: '#3a3568', true: '#F0C38E80' }}
              thumbColor={settings?.capabilities.location_services ? '#F0C38E' : '#666'}
            />
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <View style={styles.configLabelContainer}>
              <Ionicons name="volume-high" size={20} color="#F0C38E" />
              <Text style={styles.configLabel}>Sound Effects</Text>
            </View>
            <Switch
              value={settings?.capabilities.sound_effects ?? true}
              onValueChange={() => toggleCapability('sound_effects')}
              trackColor={{ false: '#3a3568', true: '#F0C38E80' }}
              thumbColor={settings?.capabilities.sound_effects ? '#F0C38E' : '#666'}
            />
          </View>
        </View>
      </View>

      {/* Language & Format */}
      <View style={styles.configSection}>
        <Text style={styles.configSectionTitle}>Language & Format</Text>
        <View style={styles.configCard}>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Language</Text>
            <View style={styles.pickerRow}>
              <TouchableOpacity
                style={[styles.pickerOption, configurationValues.language === 'en' && styles.pickerOptionActive]}
                onPress={() => updateConfiguration('language', 'en')}
              >
                <Text style={[styles.pickerOptionText, configurationValues.language === 'en' && styles.pickerOptionTextActive]}>English</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pickerOption, configurationValues.language === 'fr' && styles.pickerOptionActive]}
                onPress={() => updateConfiguration('language', 'fr')}
              >
                <Text style={[styles.pickerOptionText, configurationValues.language === 'fr' && styles.pickerOptionTextActive]}>Français</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Date Format</Text>
            <View style={styles.pickerRow}>
              {(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const).map(fmt => (
                <TouchableOpacity
                  key={fmt}
                  style={[styles.pickerOption, configurationValues.date_format === fmt && styles.pickerOptionActive]}
                  onPress={() => updateConfiguration('date_format', fmt)}
                >
                  <Text style={[styles.pickerOptionText, configurationValues.date_format === fmt && styles.pickerOptionTextActive]}>{fmt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.configDivider} />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Time Format</Text>
            <View style={styles.pickerRow}>
              {(['12h', '24h'] as const).map(fmt => (
                <TouchableOpacity
                  key={fmt}
                  style={[styles.pickerOption, configurationValues.time_format === fmt && styles.pickerOptionActive]}
                  onPress={() => updateConfiguration('time_format', fmt)}
                >
                  <Text style={[styles.pickerOptionText, configurationValues.time_format === fmt && styles.pickerOptionTextActive]}>{fmt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Notes */}
      <View style={styles.configSection}>
        <Text style={styles.configSectionTitle}>Notes</Text>
        <View style={styles.configCard}>
          <TextInput
            style={styles.notesInput}
            value={settings?.notes || ''}
            onChangeText={(v) => {
              if (settings) {
                setSettings({ ...settings, notes: v });
                setHasChanges(true);
              }
            }}
            placeholder="Add notes about this station's settings..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
            numberOfLines={4}
          />
        </View>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Station Settings</Text>
            <Text style={styles.headerSubtitle}>
              {selectedStation ? selectedStation.name : 'No station selected'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.stationSelectorBtn}
            onPress={() => setShowStationPicker(true)}
          >
            <Ionicons name="swap-horizontal" size={22} color="#F0C38E" />
            <Text style={styles.stationSelectorBtnText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Show loading spinner during initial load */}
        {initialLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F0C38E" />
            <Text style={styles.loadingText}>Loading stations...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={[1]}
          >
            {/* Station Info Banner */}
            {selectedStation && stationInfo && (
              <View style={styles.stationBanner}>
                <View style={styles.stationBannerTop}>
                  <View style={styles.stationBannerInfo}>
                    <Text style={styles.stationBannerName}>{selectedStation.name}</Text>
                    <Text style={styles.stationBannerCode}>{selectedStation.code} • {selectedStation.location}</Text>
                  </View>
                  <View style={styles.stationBannerStats}>
                    <Text style={styles.stationBannerStatText}>
                      {stationInfo.enabledFeatures}/{stationInfo.totalFeatures}
                    </Text>
                    <Text style={styles.stationBannerStatLabel}>Features</Text>
                  </View>
                </View>
                {renderProgressBar(stationInfo.progress)}
              </View>
            )}

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'capabilities' && styles.tabActive]}
                onPress={() => setActiveTab('capabilities')}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={activeTab === 'capabilities' ? '#F0C38E' : 'rgba(255,255,255,0.5)'}
                />
                <Text style={[styles.tabText, activeTab === 'capabilities' && styles.tabTextActive]}>
                  Capabilities
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'configuration' && styles.tabActive]}
                onPress={() => setActiveTab('configuration')}
              >
                <Ionicons
                  name="settings"
                  size={16}
                  color={activeTab === 'configuration' ? '#F0C38E' : 'rgba(255,255,255,0.5)'}
                />
                <Text style={[styles.tabText, activeTab === 'configuration' && styles.tabTextActive]}>
                  Configuration
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'system' && styles.tabActive]}
                onPress={() => setActiveTab('system')}
              >
                <Ionicons
                  name="construct"
                  size={16}
                  color={activeTab === 'system' ? '#F0C38E' : 'rgba(255,255,255,0.5)'}
                />
                <Text style={[styles.tabText, activeTab === 'system' && styles.tabTextActive]}>
                  System
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#F0C38E" />
                  <Text style={styles.loadingText}>Loading settings...</Text>
                </View>
              ) : !selectedStation ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="business-outline" size={64} color="rgba(240, 195, 142, 0.3)" />
                  <Text style={styles.emptyTitle}>No Station Selected</Text>
                  <Text style={styles.emptyText}>Select a station to configure its settings</Text>
                  <TouchableOpacity
                    style={styles.selectStationButton}
                    onPress={() => setShowStationPicker(true)}
                  >
                    <Ionicons name="business" size={20} color="#312C51" style={{ marginRight: 8 }} />
                    <Text style={styles.selectStationButtonText}>Select a Station</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Animated.View style={{ opacity: fadeAnim }}>
                  {activeTab === 'capabilities' && (
                    <View>
                      {/* Master Toggle */}
                      <TouchableOpacity
                        style={styles.masterToggleCard}
                        onPress={toggleAllCapabilities}
                        activeOpacity={0.7}
                      >
                        <View style={styles.masterToggleLeft}>
                          <Ionicons
                            name={enableAllFeatures ? 'checkmark-circle' : 'ellipse-outline'}
                            size={28}
                            color={enableAllFeatures ? '#4CAF50' : 'rgba(255,255,255,0.4)'}
                          />
                          <View style={styles.masterToggleInfo}>
                            <Text style={styles.masterToggleTitle}>Enable All Features</Text>
                            <Text style={styles.masterToggleSubtitle}>
                              {enableAllFeatures ? 'All features are currently enabled' : 'Some features are disabled'}
                            </Text>
                          </View>
                        </View>
                        <Switch
                          value={enableAllFeatures}
                          onValueChange={toggleAllCapabilities}
                          trackColor={{ false: '#3a3568', true: '#4CAF5080' }}
                          thumbColor={enableAllFeatures ? '#4CAF50' : '#666'}
                        />
                      </TouchableOpacity>

                      {/* Capability Categories */}
                      {CAPABILITY_CATEGORIES.map(category => renderCategoryCard(category))}
                    </View>
                  )}

                  {activeTab === 'configuration' && renderConfigurationTab()}
                  {activeTab === 'system' && renderSystemTab()}
                </Animated.View>
              )}
            </View>

            {/* Save Button */}
            {hasChanges && selectedStation && (
              <View style={styles.saveButtonContainer}>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSaveSettings}
                  disabled={saving}
                >
                  <Ionicons name="save" size={20} color="#312C51" style={{ marginRight: 8 }} />
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Station</Text>
                <TouchableOpacity onPress={() => setShowStationPicker(false)}>
                  <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalList}>
                {stations.map((station) => {
                  const isSelected = selectedStation?.id === station.id;
                  return (
                    <TouchableOpacity
                      key={station.id}
                      style={[
                        styles.modalOption,
                        isSelected && styles.modalOptionSelected,
                      ]}
                      onPress={() => handleStationSelect(station)}
                    >
                      <View style={styles.modalOptionLeft}>
                        <View style={[styles.modalOptionDot, isSelected && styles.modalOptionDotSelected]} />
                        <View style={styles.modalOptionInfo}>
                          <Text style={[
                            styles.modalOptionText,
                            isSelected && styles.modalOptionTextSelected,
                          ]}>
                            {station.name}
                          </Text>
                          <Text style={styles.modalOptionSubtext}>
                            {station.code} • {station.location}
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color="#F0C38E" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(49, 44, 81, 0.95)',
  },
  headerBackBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#F0C38E',
    marginTop: 2,
  },
  stationSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(240, 195, 142, 0.15)',
    borderRadius: 8,
    gap: 4,
  },
  stationSelectorBtnText: {
    fontSize: 12,
    color: '#F0C38E',
    fontWeight: '600',
  },
  // Station Banner
  stationBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(240, 195, 142, 0.2)',
  },
  stationBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stationBannerInfo: {
    flex: 1,
  },
  stationBannerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stationBannerCode: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  stationBannerStats: {
    alignItems: 'center',
    backgroundColor: 'rgba(240, 195, 142, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stationBannerStatText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F0C38E',
  },
  stationBannerStatLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  // Progress Bar
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    width: 36,
    textAlign: 'right',
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: 'rgba(240, 195, 142, 0.2)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    marginLeft: 4,
  },
  tabTextActive: {
    color: '#F0C38E',
  },
  // Tab Content
  tabContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 12,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24,
  },
  selectStationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0C38E',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  selectStationButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#312C51',
  },
  // Master Toggle
  masterToggleCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  masterToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  masterToggleInfo: {
    marginLeft: 12,
    flex: 1,
  },
  masterToggleTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  masterToggleSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  // Category Card
  categoryCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    marginLeft: 12,
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  categorySubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  categoryFeatureCount: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryToggleButton: {
    padding: 4,
  },
  categoryToggleButtonActive: {},
  // Features inside category
  categoryFeaturesContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 4,
  },
  featureItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  featureItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  featureLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  featureInfo: {
    marginLeft: 10,
    flex: 1,
  },
  featureLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  featureLabelActive: {
    color: '#ffffff',
  },
  featureDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 1,
  },
  // Configuration Tab
  configTabContainer: {
    paddingBottom: 20,
  },
  configSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  configSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F0C38E',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  configSectionSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
    marginTop: -4,
  },
  configCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  configLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  configValue: {
    fontSize: 14,
    color: '#F0C38E',
    fontWeight: '500',
    textAlign: 'right',
  },
  configLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  configInput: {
    fontSize: 14,
    color: '#F0C38E',
    fontWeight: '500',
    textAlign: 'right',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  configDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 14,
  },
  systemTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  systemTypeButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  systemTypeButtonActive: {
    backgroundColor: 'rgba(240, 195, 142, 0.2)',
    borderColor: '#F0C38E',
  },
  systemTypeText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  systemTypeTextActive: {
    color: '#F0C38E',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flex: 1,
  },
  pickerOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerOptionActive: {
    backgroundColor: 'rgba(240, 195, 142, 0.2)',
    borderColor: '#F0C38E',
  },
  pickerOptionText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  pickerOptionTextActive: {
    color: '#F0C38E',
  },
  notesInput: {
    fontSize: 14,
    color: '#ffffff',
    padding: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  // Save Button
  saveButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(49, 44, 81, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    backgroundColor: '#F0C38E',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(240, 195, 142, 0.5)',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#312C51',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#312C51',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalList: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(240, 195, 142, 0.15)',
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 12,
  },
  modalOptionDotSelected: {
    backgroundColor: '#F0C38E',
  },
  modalOptionInfo: {
    flex: 1,
  },
  modalOptionText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: '#F0C38E',
  },
  modalOptionSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
});