import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useDashboardData } from '../hooks/useDashboardData';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyState } from '../components/EmptyState';
import { FuelTypeChip } from '../components/FuelTypeChip';
import { StatusBadge } from '../components/StatusBadge';
import { Colors, Spacing, BorderRadius, Elevation, Typography } from '../constants/theme';

const { width } = Dimensions.get('window');

type StockTab = 'tanks' | 'pumps' | 'deliveries';

export default function StockHomeScreen() {
  const { hasPermission } = useAuth();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<StockTab>('tanks');
  const { stats } = useDashboardData();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshing(false);
  }, []);

  const handleNavigate = (screen: string) => {
    (navigation as any).navigate(screen);
  };

  // ===== TABS =====
  const TabsRow = () => (
    <View style={styles.tabsRow}>
      {([
        { key: 'tanks' as StockTab, label: 'Tanks', icon: 'propane-tank' },
        { key: 'pumps' as StockTab, label: 'Pumps', icon: 'gas-station' },
        { key: 'deliveries' as StockTab, label: 'Deliveries', icon: 'tanker-truck' },
      ]).map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => setActiveTab(tab.key)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={tab.icon as any}
            size={16}
            color={activeTab === tab.key ? Colors.brand.primary : Colors.neutral['400']}
          />
          <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ===== TANKS TAB =====
  const TanksTab = () => (
    <View>
      {hasPermission('cashier') && (
        <TouchableOpacity
          style={[styles.primaryAction, { backgroundColor: Colors.semantic.info }]}
          onPress={() => handleNavigate('PumpDippingManagement')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="ruler" size={32} color={Colors.white} />
          <View style={styles.primaryActionText}>
            <Text style={styles.primaryActionLabel}>Enter dip reading</Text>
            <Text style={styles.primaryActionSub}>Record tank levels and check variance</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.white} />
        </TouchableOpacity>
      )}

      {/* Tank Cards - Placeholder */}
      <View style={styles.tankCard}>
        <View style={styles.tankHeader}>
          <View style={styles.tankHeaderLeft}>
            <FuelTypeChip type="PMS" size="md" />
            <Text style={styles.tankName}>Tank 1 - PMS</Text>
          </View>
          <StatusBadge status="normal" variant="outlined" />
        </View>
        <View style={styles.tankDetails}>
          <View style={styles.tankDetail}>
            <Text style={styles.tankDetailLabel}>Current</Text>
            <Text style={styles.tankDetailValue}>0 L</Text>
          </View>
          <View style={styles.tankDetail}>
            <Text style={styles.tankDetailLabel}>Capacity</Text>
            <Text style={styles.tankDetailValue}>0 L</Text>
          </View>
          <View style={styles.tankDetail}>
            <Text style={styles.tankDetailLabel}>Last Dip</Text>
            <Text style={styles.tankDetailValue}>--</Text>
          </View>
        </View>
        <View style={styles.tankBar}>
          <View style={[styles.tankBarFill, { width: '0%' }]} />
        </View>
      </View>

      <View style={styles.tankCard}>
        <View style={styles.tankHeader}>
          <View style={styles.tankHeaderLeft}>
            <FuelTypeChip type="AGO" size="md" />
            <Text style={styles.tankName}>Tank 2 - AGO</Text>
          </View>
          <StatusBadge status="low" variant="outlined" />
        </View>
        <View style={styles.tankDetails}>
          <View style={styles.tankDetail}>
            <Text style={styles.tankDetailLabel}>Current</Text>
            <Text style={styles.tankDetailValue}>0 L</Text>
          </View>
          <View style={styles.tankDetail}>
            <Text style={styles.tankDetailLabel}>Capacity</Text>
            <Text style={styles.tankDetailValue}>0 L</Text>
          </View>
          <View style={styles.tankDetail}>
            <Text style={styles.tankDetailLabel}>Last Dip</Text>
            <Text style={styles.tankDetailValue}>--</Text>
          </View>
        </View>
        <View style={styles.tankBar}>
          <View style={[styles.tankBarFill, { width: '0%', backgroundColor: Colors.semantic.danger }]} />
        </View>
      </View>
    </View>
  );

  // ===== PUMPS TAB =====
  const PumpsTab = () => (
    <View>
      {hasPermission('manager') && (
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={() => handleNavigate('PumpManagement')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="engine" size={32} color={Colors.white} />
          <View style={styles.primaryActionText}>
            <Text style={styles.primaryActionLabel}>Manage pumps</Text>
            <Text style={styles.primaryActionSub}>View readings, record sales, detect anomalies</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.white} />
        </TouchableOpacity>
      )}
      <EmptyState icon="engine" title="Pump data loads here" body="Today's readings and fuel sales will appear once configured" />
    </View>
  );

  // ===== DELIVERIES TAB =====
  const DeliveriesTab = () => (
    <View>
      {hasPermission('manager') && (
        <TouchableOpacity
          style={[styles.primaryAction, { backgroundColor: Colors.semantic.warning }]}
          onPress={() => handleNavigate('FuelDelivery')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="tanker-truck" size={32} color={Colors.white} />
          <View style={styles.primaryActionText}>
            <Text style={styles.primaryActionLabel}>Track deliveries</Text>
            <Text style={styles.primaryActionSub}>Schedule, receive, and verify fuel deliveries</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.white} />
        </TouchableOpacity>
      )}

      <View style={styles.deliveryCard}>
        <View style={styles.deliveryHeader}>
          <Text style={styles.deliveryTitle}>Delivery #001</Text>
          <StatusBadge status="in_transit" />
        </View>
        <View style={styles.deliveryBody}>
          <Text style={styles.deliveryDetail}>PMS · 20,000L · Supplier ABC</Text>
          <Text style={styles.deliveryTime}>Expected: Today</Text>
        </View>
      </View>

      <View style={styles.deliveryCard}>
        <View style={styles.deliveryHeader}>
          <Text style={styles.deliveryTitle}>Delivery #002</Text>
          <StatusBadge status="scheduled" />
        </View>
        <View style={styles.deliveryBody}>
          <Text style={styles.deliveryDetail}>AGO · 15,000L · Supplier XYZ</Text>
          <Text style={styles.deliveryTime}>Expected: Tomorrow</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Stock</Text>
            <TouchableOpacity style={styles.deliveriesButton} onPress={() => setActiveTab('deliveries')} activeOpacity={0.7}>
              <MaterialCommunityIcons name="tanker-truck" size={20} color={Colors.brand.primary} />
              <Text style={styles.deliveriesButtonText}>Deliveries</Text>
            </TouchableOpacity>
          </View>

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="gas-station" size={22} color={Colors.fuel.PMS} />
                <Text style={styles.summaryLabel}>PMS Stock</Text>
                <Text style={styles.summaryValue}>0 L</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="gas-station" size={22} color={Colors.fuel.AGO} />
                <Text style={styles.summaryLabel}>AGO Stock</Text>
                <Text style={styles.summaryValue}>0 L</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <MaterialCommunityIcons name="alert-circle" size={22} color={Colors.semantic.warning} />
                <Text style={styles.summaryLabel}>Alerts</Text>
                <Text style={styles.summaryValue}>{stats.stockAlerts || 0}</Text>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <TabsRow />

          {/* Tab Content */}
          {activeTab === 'tanks' && <TanksTab />}
          {activeTab === 'pumps' && <PumpsTab />}
          {activeTab === 'deliveries' && <DeliveriesTab />}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.app },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  headerTitle: { fontSize: Typography.scale['2xl'], fontFamily: Typography.fontFamily.display, color: Colors.white },
  deliveriesButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.brand.primarySurface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.round, borderWidth: 1, borderColor: Colors.brand.primary + '30' },
  deliveriesButtonText: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, color: Colors.brand.primary },

  summaryCard: { backgroundColor: Colors.background.card, marginHorizontal: Spacing.screenPadding, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.base, ...Elevation.sm },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', flex: 1, gap: 4 },
  summaryLabel: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'] },
  summaryValue: { fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.display, color: Colors.white, fontVariant: ['tabular-nums'] },
  summaryDivider: { width: 1, backgroundColor: Colors.neutral['600'] },

  tabsRow: { flexDirection: 'row', paddingHorizontal: Spacing.screenPadding, marginBottom: Spacing.base, gap: Spacing.sm },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.round, backgroundColor: Colors.background.card, borderWidth: 1, borderColor: Colors.neutral['600'] },
  tabActive: { backgroundColor: Colors.brand.primarySurface, borderColor: Colors.brand.primary },
  tabLabel: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'] },
  tabLabelActive: { color: Colors.brand.primary },

  primaryAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.brand.primary, marginHorizontal: Spacing.screenPadding, marginBottom: Spacing.base, padding: Spacing.base, borderRadius: BorderRadius.lg, gap: Spacing.md, ...Elevation.md },
  primaryActionText: { flex: 1 },
  primaryActionLabel: { fontSize: Typography.scale.md, fontFamily: Typography.fontFamily.display, color: Colors.white },
  primaryActionSub: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.body, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Tank Cards
  tankCard: { backgroundColor: Colors.background.card, marginHorizontal: Spacing.screenPadding, marginBottom: Spacing.md, borderRadius: BorderRadius.md, padding: Spacing.base, ...Elevation.sm },
  tankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  tankHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tankName: { fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.semibold, color: Colors.white },
  tankDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  tankDetail: { alignItems: 'center' },
  tankDetailLabel: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.body, color: Colors.neutral['400'] },
  tankDetailValue: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.display, color: Colors.white, marginTop: 2 },
  tankBar: { height: 8, backgroundColor: Colors.neutral['700'], borderRadius: BorderRadius.sm, overflow: 'hidden' },
  tankBarFill: { height: '100%', backgroundColor: Colors.semantic.success, borderRadius: BorderRadius.sm },

  // Delivery Cards
  deliveryCard: { backgroundColor: Colors.background.card, marginHorizontal: Spacing.screenPadding, marginBottom: Spacing.md, borderRadius: BorderRadius.md, padding: Spacing.base, ...Elevation.sm },
  deliveryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  deliveryTitle: { fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.semibold, color: Colors.white },
  deliveryBody: { gap: 4 },
  deliveryDetail: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['300'] },
  deliveryTime: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.body, color: Colors.neutral['500'] },
});