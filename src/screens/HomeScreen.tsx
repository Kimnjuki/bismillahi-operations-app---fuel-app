import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useOffline } from '../hooks/useOffline';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { useDashboardData } from '../hooks/useDashboardData';
import { KpiCard } from '../components/KpiCard';
import { AlertBanner } from '../components/AlertBanner';
import { SectionHeader } from '../components/SectionHeader';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { Colors, Spacing, BorderRadius, Elevation, Typography } from '../constants/theme';
import { useTabNavigation } from '../navigation/TabNavigationContext';

const { width } = Dimensions.get('window');

type DateFilter = 'today' | 'week' | 'month';

/**
 * HomeScreen v2
 * Role-based command center with dark theme, KPI cards, alerts, and quick actions
 */
export default function HomeScreen() {
  const { appUser, hasPermission } = useAuth();
  const navigation = useNavigation();
  const { isOnline } = useOffline();
  const { switchTab } = useTabNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { stats, notifications, statsLoading, statsError, refetch } = useDashboardData();

  const role = appUser?.role || 'viewer';
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isCashier = role === 'cashier';
  const isViewer = role === 'viewer';

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleNavigate = useCallback((target: string, screen?: string) => {
    if (target === 'Notifications') {
      (navigation as any).navigate('Notifications');
    } else if (target === 'more') {
      switchTab('more');
      if (screen) {
        setTimeout(() => {
          (navigation as any).navigate(screen);
        }, 350);
      }
    } else {
      (navigation as any).navigate(target, { screen });
    }
  }, [navigation, switchTab]);

  // ===== DATE FILTER =====
  const DateFilterRow = () => (
    <View style={styles.dateFilterRow}>
      {(['today', 'week', 'month'] as DateFilter[]).map((f) => (
        <TouchableOpacity
          key={f}
          style={[styles.dateFilterChip, dateFilter === f && styles.dateFilterChipActive]}
          onPress={() => setDateFilter(f)}
          activeOpacity={0.7}
        >
          <Text style={[styles.dateFilterText, dateFilter === f && styles.dateFilterTextActive]}>
            {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ===== ROLE-BASED KPI CARDS =====
  const kpiCards = useMemo(() => {
    const items: Array<{ label: string; value: string | number; unit?: string; color: string; icon: string; changePct?: number; changeDirection?: 'up' | 'down' | 'neutral' }> = [];

    if (isAdmin) {
      items.push({ label: 'Total Sales', value: stats.todaySales || 0, unit: 'CDF', color: Colors.brand.primary, icon: 'cash', changePct: 12.5, changeDirection: 'up' });
      items.push({ label: 'Gross Margin', value: '32.5', unit: '%', color: Colors.semantic.success, icon: 'chart-line' });
      items.push({ label: 'Critical Stock', value: (stats.stockAlerts || 0).toString(), unit: 'items', color: stats.stockAlerts > 0 ? Colors.semantic.danger : Colors.semantic.success, icon: 'alert-circle' });
    } else if (isManager) {
      items.push({ label: 'Sales Today', value: `₣${(stats.todaySales || 0).toLocaleString()}`, color: Colors.brand.primary, icon: 'cash' });
      items.push({ label: 'Expenses', value: `₣${(stats.todayExpenses || 0).toLocaleString()}`, color: Colors.semantic.warning, icon: 'receipt' });
      items.push({ label: 'Stock Alerts', value: (stats.stockAlerts || 0).toString(), unit: 'items', color: stats.stockAlerts > 0 ? Colors.semantic.danger : Colors.semantic.success, icon: 'alert-circle' });
      items.push({ label: 'Pending Transfers', value: (stats.pendingTransfers || 0).toString(), unit: 'items', color: Colors.semantic.info, icon: 'bank-transfer' });
    } else if (isCashier) {
      items.push({ label: 'My Sales', value: `₣${(stats.todaySales || 0).toLocaleString()}`, color: Colors.brand.primary, icon: 'cash' });
      items.push({ label: 'Transactions', value: (stats.totalTransactions || 0).toString(), color: Colors.semantic.info, icon: 'receipt' });
      items.push({ label: 'Expenses', value: `₣${(stats.todayExpenses || 0).toLocaleString()}`, color: Colors.semantic.danger, icon: 'trending-down' });
    } else {
      items.push({ label: 'Sales Today', value: `₣${(stats.todaySales || 0).toLocaleString()}`, color: Colors.brand.primary, icon: 'cash' });
      items.push({ label: 'Expenses', value: `₣${(stats.todayExpenses || 0).toLocaleString()}`, color: Colors.semantic.warning, icon: 'receipt' });
      items.push({ label: 'Growth', value: `${(stats.monthlyGrowth || 0).toFixed(1)}%`, color: Colors.semantic.success, icon: 'trending-up' });
    }
    return items;
  }, [stats, isAdmin, isManager, isCashier, isViewer]);

  // ===== QUICK ACTIONS =====
  const quickActions = useMemo(() => {
    const actions: Array<{ label: string; icon: string; onPress: () => void; color: string }> = [];
    if (isCashier || isManager) actions.push({ label: 'Record Sale', icon: 'gas-station', onPress: () => handleNavigate('sales', 'SalesEntry'), color: Colors.brand.primary });
    if (isCashier) {
      actions.push({ label: 'Enter Dip', icon: 'ruler', onPress: () => handleNavigate('stock', 'PumpDippingManagement'), color: Colors.semantic.info });
      actions.push({ label: 'Log Expense', icon: 'receipt', onPress: () => handleNavigate('finance', 'ExpenseEntry'), color: Colors.semantic.danger });
    }
    if (isManager || isAdmin) actions.push({ label: 'View Reports', icon: 'chart-bar', onPress: () => handleNavigate('more', 'Reports'), color: Colors.semantic.info });
    return actions;
  }, [isAdmin, isManager, isCashier, navigation]);

  // ===== ALERTS =====
  const alerts = useMemo(() => {
    const items: Array<{ id: string; type: 'critical' | 'warning' | 'info'; title: string; message?: string }> = [];
    if (stats.stockAlerts > 0) items.push({ id: 'stock', type: 'critical', title: `${stats.stockAlerts} stock item(s) below minimum threshold`, message: 'Check stock management for details' });
    if (stats.pendingTransfers > 0) items.push({ id: 'transfers', type: 'warning', title: `${stats.pendingTransfers} pending transfer(s) awaiting approval` });
    return items;
  }, [stats]);

  // ===== RECENT ACTIVITY =====
  const recentItems = useMemo(() => {
    if (!notifications?.length) return [];
    return notifications.slice(0, 5).map((n: any) => ({
      id: n.id, title: n.title, time: n.created_at ? new Date(n.created_at).toLocaleTimeString() : '',
      color: n.type === 'low_stock' ? Colors.semantic.warning : Colors.semantic.info,
    }));
  }, [notifications]);

  // ===== LOADING =====
  if (statsLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <SkeletonLoader variant="kpi" count={4} />
          <SkeletonLoader variant="card" count={3} />
        </SafeAreaView>
      </View>
    );
  }

  // ===== ERROR =====
  if (statsError) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContent}>
            <MaterialCommunityIcons name="cloud-alert" size={48} color={Colors.neutral['500']} />
            <Text style={styles.errorText}>Failed to load data</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refetch}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ===== RENDER =====
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.primary} />}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.welcomeText}>Welcome, {appUser?.full_name?.split(' ')[0] || 'User'}!</Text>
                <Text style={styles.roleText}>{role.toUpperCase()}</Text>
              </View>
              <View style={styles.headerRight}>
                {!isOnline && <OfflineIndicator />}
                <TouchableOpacity style={styles.notifButton} onPress={() => (navigation as any).navigate('Notifications')} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="bell-outline" size={22} color={Colors.white} />
                  {unreadCount > 0 && (
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Filter */}
            <DateFilterRow />

            {/* Alerts Banner */}
            <AlertBanner alerts={alerts} onPress={(alert) => {
              if (alert.id === 'stock') handleNavigate('stock', 'StockManagement');
            }} />

            {/* Primary CTA for Cashier/Manager */}
            {(isCashier || isManager) && (
              <TouchableOpacity style={styles.primaryCta} onPress={() => handleNavigate('sales', 'SalesEntry')} activeOpacity={0.85}>
                <MaterialCommunityIcons name="gas-station" size={28} color={Colors.white} />
                <View style={styles.primaryCtaText}>
                  <Text style={styles.primaryCtaLabel}>Record Sale</Text>
                  <Text style={styles.primaryCtaSub}>Tap to start a new transaction</Text>
                </View>
                <MaterialCommunityIcons name="arrow-right" size={24} color={Colors.white} />
              </TouchableOpacity>
            )}

            {/* KPI Cards */}
            <View style={styles.kpiSection}>
              <SectionHeader title="Overview" subtitle="Key performance indicators" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiScrollContent}>
                {kpiCards.map((kpi, index) => (
                  <KpiCard key={index} label={kpi.label} value={kpi.value} unit={kpi.unit} color={kpi.color} icon={kpi.icon}
                    changePct={kpi.changePct} changeDirection={kpi.changeDirection} onPress={() => {}} />
                ))}
              </ScrollView>
            </View>

            {/* Quick Actions */}
            {quickActions.length > 0 && (
              <View style={styles.quickActionsSection}>
                <SectionHeader title="Quick Actions" />
                <View style={styles.quickActionsGrid}>
                  {quickActions.map((action, index) => (
                    <TouchableOpacity key={index} style={[styles.quickActionCard, { borderColor: action.color + '30' }]}
                      onPress={action.onPress} activeOpacity={0.7}>
                      <View style={[styles.quickActionIconContainer, { backgroundColor: action.color + '20' }]}>
                        <MaterialCommunityIcons name={action.icon as any} size={24} color={action.color} />
                      </View>
                      <Text style={styles.quickActionLabel}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Recent Activity */}
            {recentItems.length > 0 && (
              <View style={styles.recentSection}>
                <SectionHeader title="Recent Activity" action={{ label: 'View All', onPress: () => (navigation as any).navigate('Notifications') }} />
                {recentItems.map((item: any, index: number) => (
                  <TouchableOpacity key={item.id || index} style={styles.activityRow} activeOpacity={0.6}>
                    <View style={[styles.activityDot, { backgroundColor: item.color || Colors.neutral['500'] }]} />
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.activityTime}>{item.time || ''}</Text>
                    </View>
                    <Text style={styles.activityAmount}>{item.amount || ''}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>

          {/* FAB */}
          <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => {
            if (isCashier || isManager) handleNavigate('sales', 'SalesEntry');
          }}>
            <MaterialCommunityIcons name="plus" size={28} color={Colors.white} />
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.app },
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 80 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  errorText: { color: Colors.neutral['400'], fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.medium },
  retryButton: { backgroundColor: Colors.brand.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  retryButtonText: { color: Colors.white, fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.semibold },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  welcomeText: { fontSize: Typography.scale.xl, fontFamily: Typography.fontFamily.display, color: Colors.white },
  roleText: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.semibold, color: Colors.brand.primary, marginTop: 2, letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifButton: { position: 'relative', padding: 8 },
  notifBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: Colors.semantic.danger, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
  notifBadgeText: { color: Colors.white, fontSize: 10, fontFamily: Typography.fontFamily.semibold },

  dateFilterRow: { flexDirection: 'row', paddingHorizontal: Spacing.screenPadding, paddingVertical: Spacing.sm, gap: Spacing.sm },
  dateFilterChip: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.xs + 2, borderRadius: BorderRadius.round, backgroundColor: Colors.background.card, borderWidth: 1, borderColor: Colors.neutral['600'] },
  dateFilterChipActive: { backgroundColor: Colors.brand.primarySurface, borderColor: Colors.brand.primary },
  dateFilterText: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'] },
  dateFilterTextActive: { color: Colors.brand.primary },

  primaryCta: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.brand.primary, marginHorizontal: Spacing.screenPadding, marginVertical: Spacing.md, padding: Spacing.base, borderRadius: BorderRadius.lg, gap: Spacing.md, ...Elevation.md },
  primaryCtaText: { flex: 1 },
  primaryCtaLabel: { fontSize: Typography.scale.md, fontFamily: Typography.fontFamily.display, color: Colors.white },
  primaryCtaSub: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.body, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  kpiSection: { marginBottom: Spacing.md },
  kpiScrollContent: { paddingHorizontal: Spacing.screenPadding, gap: Spacing.md, paddingRight: Spacing.screenPadding * 2 },

  quickActionsSection: { marginBottom: Spacing.md },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.screenPadding, gap: Spacing.md },
  quickActionCard: { width: (width - Spacing.screenPadding * 2 - Spacing.md) / 2, backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.base, alignItems: 'center', gap: Spacing.sm, ...Elevation.sm },
  quickActionIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, color: Colors.white, textAlign: 'center' },

  recentSection: { marginBottom: Spacing.md },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.screenPadding, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.neutral['700'] },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.md },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.medium, color: Colors.white },
  activityTime: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.body, color: Colors.neutral['500'], marginTop: 2 },
  activityAmount: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.semibold, color: Colors.neutral['300'], fontVariant: ['tabular-nums'] },

  fab: { position: 'absolute', bottom: 24, right: Spacing.screenPadding, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.brand.primary, justifyContent: 'center', alignItems: 'center', ...Elevation.lg },
});