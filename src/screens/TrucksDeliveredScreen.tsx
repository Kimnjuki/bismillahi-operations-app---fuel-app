import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fuelDeliveryService } from '../services/fuelDeliveryService';
import { formatCurrency } from '../constants/currency';
import { TruckDeliveredSummary, Station, Transporter } from '../types';

export default function TrucksDeliveredScreen() {
  const navigation = useNavigation();
  const [trucks, setTrucks] = useState<TruckDeliveredSummary[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [trucksResponse, stationsResponse] = await Promise.all([
        fuelDeliveryService.getTrucksDelivered(),
        fuelDeliveryService.getStations(),
      ]);

      if (trucksResponse.success) setTrucks(trucksResponse.data || []);
      if (stationsResponse.success) setStations(stationsResponse.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getProductBadgeColor = (product: string) => {
    switch (product) {
      case 'PMS':
        return '#4CAF50';
      case 'AGO':
        return '#2196F3';
      case 'Petrol':
        return '#4CAF50';
      case 'Diesel':
        return '#2196F3';
      default:
        return '#F0C38E';
    }
  };

  const renderTruckCard = (truck: TruckDeliveredSummary) => (
    <View key={truck.truck_id} style={styles.truckCard}>
      <View style={styles.truckHeader}>
        <View style={styles.truckIdContainer}>
          <Ionicons name="bus" size={20} color="#F0C38E" />
          <Text style={styles.truckId}>{truck.truck_id}</Text>
        </View>
        <View style={styles.truckStatsBadge}>
          <Text style={styles.truckStatValue}>{truck.total_liters.toLocaleString()}</Text>
          <Text style={styles.truckStatLabel}>Total Liters</Text>
        </View>
      </View>

      <View style={styles.truckDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Transporter:</Text>
          <Text style={styles.detailValue}>{truck.transporter_name}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Station:</Text>
          <Text style={styles.detailValue}>{truck.station_name}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Deliveries:</Text>
          <Text style={styles.detailValue}>{truck.deliveries_count} trip{truck.deliveries_count !== 1 ? 's' : ''}</Text>
        </View>

        <View style={styles.productContainer}>
          <Text style={styles.detailLabel}>Products:</Text>
          <View style={styles.productBadges}>
            {truck.products.map((product, idx) => (
              <View key={idx} style={[styles.productBadge, { backgroundColor: getProductBadgeColor(product) }]}>
                <Text style={styles.productBadgeText}>{product}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>First Delivery</Text>
            <Text style={styles.dateValue}>
              {new Date(truck.first_delivery_date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.dateDivider} />
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Last Delivery</Text>
            <Text style={styles.dateValue}>
              {new Date(truck.last_delivery_date).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const totalLitersAll = trucks.reduce((sum, t) => sum + t.total_liters, 0);
  const totalDeliveriesAll = trucks.reduce((sum, t) => sum + t.deliveries_count, 0);

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
            <Text style={styles.headerTitle}>Trucks Delivered</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Overview */}
          {trucks.length > 0 && (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Total Trucks</Text>
                  <Text style={styles.summaryValue}>{trucks.length}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Total Liters</Text>
                  <Text style={styles.summaryValue}>{totalLitersAll.toLocaleString()}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Total Deliveries</Text>
                  <Text style={styles.summaryValue}>{totalDeliveriesAll}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Trucks List */}
          <View style={styles.trucksSection}>
            <Text style={styles.sectionTitle}>
              {trucks.length} Truck{trucks.length !== 1 ? 's' : ''} Found
            </Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : trucks.length > 0 ? (
              trucks.map(renderTruckCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="bus-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.emptyText}>No trucks found</Text>
                <Text style={styles.emptySubtext}>Trucks will appear here after fuel deliveries are recorded</Text>
              </View>
            )}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  summarySection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F0C38E',
    textAlign: 'center',
  },
  trucksSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  truckCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  truckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  truckIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  truckId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  truckStatsBadge: {
    backgroundColor: '#F0C38E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  truckStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#312C51',
  },
  truckStatLabel: {
    fontSize: 10,
    color: '#312C51',
    fontWeight: '600',
  },
  truckDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  detailValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  productContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  productBadges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  productBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  productBadgeText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  dateRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  dateDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});
