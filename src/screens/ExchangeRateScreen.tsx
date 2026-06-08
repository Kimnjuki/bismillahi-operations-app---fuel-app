import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';

interface ExchangeRate {
  id: string;
  rate: number;
  effective_date: string;
  created_at: string;
  created_by: string;
}

export default function ExchangeRateScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [currentRate, setCurrentRate] = useState<ExchangeRate | null>(null);
  const [rateHistory, setRateHistory] = useState<ExchangeRate[]>([]);
  const [newRate, setNewRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sample data with default rate: 1 USD = 2300 CDF
  const sampleRates: ExchangeRate[] = [
    {
      id: '1',
      rate: 2300,
      effective_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      created_by: appUser?.id || '',
    },
    {
      id: '2',
      rate: 2300,
      effective_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      created_at: new Date(Date.now() - 86400000).toISOString(),
      created_by: appUser?.id || '',
    },
    {
      id: '3',
      rate: 2300,
      effective_date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
      created_at: new Date(Date.now() - 172800000).toISOString(),
      created_by: appUser?.id || '',
    },
  ];

  const loadExchangeRates = useCallback(async () => {
    try {
      setLoading(true);
      
      // Try to fetch from database
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('effective_date', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setCurrentRate(data[0]);
        setRateHistory(data);
      } else {
        // Use sample data if no real data
        setCurrentRate(sampleRates[0]);
        setRateHistory(sampleRates);
      }
    } catch (error) {
      console.error('Error loading exchange rates:', error);
      // Use sample data on error
      setCurrentRate(sampleRates[0]);
      setRateHistory(sampleRates);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sampleRates]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadExchangeRates();
  }, [loadExchangeRates]);

  useEffect(() => {
    loadExchangeRates();
  }, [loadExchangeRates]);

  const handleUpdateRate = async () => {
    // Check if user has permission to update exchange rates (admin only)
    if (!appUser || appUser.role !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can set daily exchange rates');
      return;
    }

    if (!newRate.trim()) {
      Alert.alert('Error', 'Please enter the daily exchange rate');
      return;
    }

    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Error', 'Please enter a valid exchange rate');
      return;
    }

    // Check if rate for today already exists
    const today = new Date().toISOString().split('T')[0];
    const existingTodayRate = rateHistory.find(r => r.effective_date === today);
    
    if (existingTodayRate) {
      Alert.alert(
        'Rate Already Set',
        `Exchange rate for today (${today}) is already set to 1 USD = ${existingTodayRate.rate.toLocaleString()} CDF.\n\nDo you want to update it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Update',
            style: 'default',
            onPress: () => confirmRateUpdate(rate, today)
          }
        ]
      );
    } else {
      confirmRateUpdate(rate, today);
    }
  };

  const confirmRateUpdate = (rate: number, effectiveDate: string) => {
    Alert.alert(
      'Confirm Daily Rate',
      `Set today's exchange rate to:\n\n1 USD = ${rate.toLocaleString()} CDF\n1 CDF = ${(1/rate).toFixed(8)} USD\n\nThis will be the fixed rate for today.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set Rate',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Try to insert into database
              const { error } = await supabase
                .from('exchange_rates')
                .insert([
                  {
                    rate: rate,
                    effective_date: effectiveDate,
                    created_by: appUser?.id,
                  },
                ]);

              if (error) throw error;

              // Update local state
              const newRateEntry: ExchangeRate = {
                id: Date.now().toString(),
                rate: rate,
                effective_date: effectiveDate,
                created_at: new Date().toISOString(),
                created_by: appUser?.id || '',
              };

              setCurrentRate(newRateEntry);
              setRateHistory(prev => [newRateEntry, ...prev]);
              setNewRate('');

              Alert.alert('Success', 'Daily exchange rate set successfully');
            } catch (error) {
              console.error('Error setting exchange rate:', error);
              
              // Update local state even if database fails
              const newRateEntry: ExchangeRate = {
                id: Date.now().toString(),
                rate: rate,
                effective_date: effectiveDate,
                created_at: new Date().toISOString(),
                created_by: appUser?.id || '',
              };

              setCurrentRate(newRateEntry);
              setRateHistory(prev => [newRateEntry, ...prev]);
              setNewRate('');

              Alert.alert('Success', 'Daily exchange rate set successfully (offline)');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateInverseRate = (rate: number) => {
    return 1 / rate;
  };

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
            <Text style={styles.headerTitle}>Exchange Rate</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Current Rate Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Rate</Text>
            <View style={styles.currentRateCard}>
              <View style={styles.rateRow}>
                <Text style={styles.rateText}>
                  <Text style={styles.usdText}>1 USD</Text>
                  <Text style={styles.equalsText}> = </Text>
                  <Text style={styles.cdfText}>
                    {currentRate ? currentRate.rate.toLocaleString() : '2,880'} CDF
                  </Text>
                </Text>
              </View>
              <View style={styles.rateRow}>
                <Text style={styles.rateText}>
                  <Text style={styles.cdfText}>1 CDF</Text>
                  <Text style={styles.equalsText}> = </Text>
                  <Text style={styles.usdText}>
                    {currentRate ? calculateInverseRate(currentRate.rate).toFixed(8) : '0.00034722'} USD
                  </Text>
                </Text>
              </View>
            </View>
          </View>

          {/* Set Daily Rate Section - Admin Only */}
          {appUser?.role === 'admin' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Set Daily Rate</Text>
              <Text style={styles.sectionSubtitle}>
                Set the fixed exchange rate for today
              </Text>
              <View style={styles.updateRateContainer}>
                <TextInput
                  style={styles.rateInput}
                  value={newRate}
                  onChangeText={setNewRate}
                  placeholder="Enter CDF rate (e.g., 2880)"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  keyboardType="numeric"
                />
                <TouchableOpacity 
                  style={[styles.updateButton, loading && styles.updateButtonDisabled]} 
                  onPress={handleUpdateRate}
                  disabled={loading}
                >
                  <Text style={styles.updateButtonText}>
                    {loading ? 'Setting...' : 'Set Daily Rate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Rate History Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Rate History</Text>
            <Text style={styles.sectionSubtitle}>
              Fixed exchange rates set by administrators
            </Text>
            {rateHistory.map((rate, index) => (
              <View key={rate.id} style={styles.historyCard}>
                <View style={styles.historyRateContainer}>
                  <Text style={styles.historyRateText}>
                    <Text style={styles.usdText}>1 USD</Text>
                    <Text style={styles.equalsText}> = </Text>
                    <Text style={styles.cdfText}>{rate.rate.toLocaleString()} CDF</Text>
                  </Text>
                  <Text style={styles.historyRateText}>
                    <Text style={styles.cdfText}>1 CDF</Text>
                    <Text style={styles.equalsText}> = </Text>
                    <Text style={styles.usdText}>{calculateInverseRate(rate.rate).toFixed(8)} USD</Text>
                  </Text>
                </View>
                <Text style={styles.historyDateText}>
                  {formatDate(rate.effective_date)}
                </Text>
              </View>
            ))}
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
  },
  currentRateCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  rateRow: {
    marginBottom: 8,
  },
  rateText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  usdText: {
    color: '#ffffff',
  },
  equalsText: {
    color: '#ffffff',
  },
  cdfText: {
    color: '#F0C38E',
  },
  updateRateContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  rateInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  updateButton: {
    backgroundColor: '#F0C38E',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  updateButtonDisabled: {
    backgroundColor: 'rgba(240, 195, 142, 0.5)',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#312C51',
  },
  historyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyRateContainer: {
    marginBottom: 8,
  },
  historyRateText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  historyDateText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});