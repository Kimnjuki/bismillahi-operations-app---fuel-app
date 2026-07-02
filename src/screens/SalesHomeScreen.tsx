import React, { useState, useCallback, useMemo } from 'react';
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
import { KpiCard } from '../components/KpiCard';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyState } from '../components/EmptyState';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { Colors, Spacing, BorderRadius, Elevation, Typography } from '../constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.screenPadding * 2 - Spacing.md) / 2;

type SalesTab = 'pump' | 'history';

export default function SalesHomeScreen() {
  const { appUser, hasPermission } = useAuth();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<SalesTab>('pump');
  const { stats } = useDashboardData();

  const role = appUser?.role || 'viewer';
  const canManageSales = hasPermission('cashier');
  const canViewSales = hasPermission('viewer');

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
        { key: 'pump' as SalesTab, label: 'Pump Sales', icon: 'gas-station' },
        { key: 'history' as SalesTab, label: 'History', icon: 'receipt' },
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

  // ===== TODAY'S SUMMARY =====
  const SummaryCard = () => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Today's Summary</Text>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <MaterialCommunityIcons name="gas-station" size={20} color={Colors.fuel.PMS} />
          <Text style={styles.summaryLabel}>PMS</Text>
          <Text style={styles.summaryValue}>0 L</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <MaterialCommunityIcons name="gas-station" size={20} color={Colors.fuel.AGO} />
          <Text style={styles.summaryLabel}>AGO</Text>
          <Text style={styles.summaryValue}>0 L</Text>
        </View>
      </View>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Revenue</Text>
        <Text style={styles.totalValue}>₣{(stats.todaySales || 0).toLocaleString()}</Text>
      </View>
    </View>
  );

  // ===== PUMP TAB =====
  const PumpTab = () => (
    <View>
      {canManageSales && (
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={() => handleNavigate('SalesEntry')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="gas-station" size={32} color={Colors.white} />
          <View style={styles.primaryActionText}>
            <Text style={styles.primaryActionLabel}>Record pump sale</Text>
            <Text style={styles.primaryActionSub}>Select pump, enter volume, complete sale</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.white} />
        </TouchableOpacity>
      )}

      {/* Payment Method Breakdown */}
      <View style={styles.paymentBreakdown}>
        <Text style={styles.paymentTitle}>Payment Breakdown</Text>
        <View style={styles.paymentGrid}>
          <View style={[styles.paymentChip, { borderColor: Colors.semantic.success + '40' }]}>
            <MaterialCommunityIcons name="cash" size={18} color={Colors.semantic.success} />
            <Text style={styles.paymentChipLabel}>Cash</Text>
            <Text style={styles.paymentChipValue}>₣0</Text>
          </View>
          <View style={[styles.paymentChip, { borderColor: Colors.semantic.info + '40' }]}>
            <MaterialCommunityIcons name="credit-card-outline" size={18} color={Colors.semantic.info} />
            <Text style={styles.paymentChipLabel}>Card</Text>
            <Text style={styles.paymentChipValue}>₣0</Text>
          </View>
          <View style={[styles.paymentChip, { borderColor: Colors.semantic.info + '40' }]}>
            <MaterialCommunityIcons name="account-credit-card" size={18} color={Colors.semantic.info} />
            <Text style={styles.paymentChipLabel}>Credit</Text>
            <Text style={styles.paymentChipValue}>₣0</Text>
          </View>
          <View style={[styles.paymentChip, { borderColor: Colors.brand.primary + '40' }]}>
            <MaterialCommunityIcons name="cellphone" size={18} color={Colors.brand.primary} />
            <Text style={styles.paymentChipLabel}>Mobile</Text>
            <Text style={styles.paymentChipValue}>₣0</Text>
          </View>
        </View>
      </View>

      {/* Recent Pump Sales */}
      <View style={styles.recentSection}>
        <SectionHeader title="Recent Sales" />
        <EmptyState icon="gas-station-outline" title="No sales yet today" body="Record your first pump sale to get started" />
      </View>
    </View>
  );

  // ===== HISTORY TAB =====
  const HistoryTab = () => (
    <View>
      {canViewSales && (
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={() => handleNavigate('SalesRecords')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="receipt" size={32} color={Colors.white} />
          <View style={styles.primaryActionText}>
            <Text style={styles.primaryActionLabel}>View full sales history</Text>
            <Text style={styles.primaryActionSub}>Browse, filter, and search all records</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.white} />
        </TouchableOpacity>
      )}
      <EmptyState icon="clipboard-text-outline" title="No history to display" />
    </View>
  );

  // ===== RENDER =====
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
            <Text style={styles.headerTitle}>Sales</Text>
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => handleNavigate('SalesRecords')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="receipt" size={20} color={Colors.brand.primary} />
              <Text style={styles.historyButtonText}>History</Text>
            </TouchableOpacity>
          </View>

          {/* Summary Card */}
          <SummaryCard />

          {/* Tabs */}
          <TabsRow />

          {/* Tab Content */}
          {activeTab === 'pump' && <PumpTab />}
          {activeTab === 'history' && <HistoryTab />}

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

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  headerTitle: { fontSize: Typography.scale['2xl'], fontFamily: Typography.fontFamily.display, color: Colors.white },
  historyButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.brand.primarySurface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.round, borderWidth: 1, borderColor: Colors.brand.primary + '30' },
  historyButtonText: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, color: Colors.brand.primary },

  // Summary Card
  summaryCard: { backgroundColor: Colors.background.card, marginHorizontal: Spacing.screenPadding, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.base, ...Elevation.sm },
  summaryTitle: { fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.semibold, color: Colors.white, marginBottom: Spacing.md },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.base },
  summaryItem: { alignItems: 'center', flex: 1, gap: 4 },
  summaryLabel: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'] },
  summaryValue: { fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.display, color: Colors.white },
  summaryDivider: { width: 1, backgroundColor: Colors.neutral['600'] },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.neutral['600'], paddingTop: Spacing.md },
  totalLabel: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'] },
  totalValue: { fontSize: Typography.scale.md, fontFamily: Typography.fontFamily.display, color: Colors.brand.primary },

  // Tabs
  tabsRow: { flexDirection: 'row', paddingHorizontal: Spacing.screenPadding, marginBottom: Spacing.base, gap: Spacing.sm },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.round, backgroundColor: Colors.background.card, borderWidth: 1, borderColor: Colors.neutral['600'] },
  tabActive: { backgroundColor: Colors.brand.primarySurface, borderColor: Colors.brand.primary },
  tabLabel: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'] },
  tabLabelActive: { color: Colors.brand.primary },

  // Primary Action
  primaryAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.brand.primary, marginHorizontal: Spacing.screenPadding, marginBottom: Spacing.base, padding: Spacing.base, borderRadius: BorderRadius.lg, gap: Spacing.md, ...Elevation.md },
  primaryActionText: { flex: 1 },
  primaryActionLabel: { fontSize: Typography.scale.md, fontFamily: Typography.fontFamily.display, color: Colors.white },
  primaryActionSub: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.body, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Payment Breakdown
  paymentBreakdown: { marginHorizontal: Spacing.screenPadding, marginBottom: Spacing.base },
  paymentTitle: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.semibold, color: Colors.neutral['400'], marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  paymentChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, backgroundColor: Colors.background.card },
  paymentChipLabel: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'] },
  paymentChipValue: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.display, color: Colors.white, fontVariant: ['tabular-nums'] },

  // Recent Section
  recentSection: { marginHorizontal: Spacing.screenPadding },
});