import React, { useState, useEffect, useCallback, memo, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { notificationService, Notification, NotificationCategory, NotificationGroup, NotificationCounts, UserTargetRole } from '../services/notificationService';
import { FlashList } from '@shopify/flash-list';
import { NotificationCard } from '../components/NotificationCard';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, BorderRadius, Elevation, Typography } from '../constants/theme';

const CATEGORY_TABS: { key: NotificationCategory; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'bell-outline' },
  { key: 'stock', label: 'Stock', icon: 'cube-outline' },
  { key: 'sales_payments', label: 'Sales', icon: 'cash' },
  { key: 'fuel_delivery', label: 'Delivery', icon: 'tanker-truck' },
  { key: 'expenses', label: 'Expenses', icon: 'receipt' },
  { key: 'accounts', label: 'Accounts', icon: 'bank' },
  { key: 'pump_tank', label: 'Pumps', icon: 'gas-station' },
  { key: 'system', label: 'System', icon: 'cog-outline' },
];

const MemoizedNotificationCard = memo(({
  notification, onPress, onActionPress, onAcknowledge,
}: {
  notification: Notification;
  onPress: (n: Notification) => void;
  onActionPress: (n: Notification) => void;
  onAcknowledge: (n: Notification) => void;
}) => (
  <NotificationCard notification={notification} onPress={onPress} onActionPress={onActionPress} onAcknowledge={onAcknowledge} />
));

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { appUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  const [showPriorityFilter, setShowPriorityFilter] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const tabScrollRef = useRef<ScrollView>(null);

  const userRole: UserTargetRole = (appUser?.role as UserTargetRole) || 'viewer';
  const userStationId = appUser?.station_id;

  const roleFilteredNotifications = useMemo(() => notificationService.getNotificationsForRole(userRole, userStationId), [notifications, userRole, userStationId]);
  const categoryFilteredNotifications = useMemo(() => notificationService.filterByCategory(roleFilteredNotifications, activeCategory), [roleFilteredNotifications, activeCategory]);
  const filteredNotifications = useMemo(() => {
    let result = categoryFilteredNotifications;
    if (showUnreadOnly) result = result.filter(n => !n.isRead);
    if (showPriorityFilter) result = result.filter(n => n.priority === showPriorityFilter);
    return result;
  }, [categoryFilteredNotifications, showUnreadOnly, showPriorityFilter]);
  const counts = useMemo(() => notificationService.getNotificationCounts(), [notifications]);
  const groupedNotifications = useMemo(() => notificationService.groupByCategory(filteredNotifications), [filteredNotifications]);

  const loadNotifications = useCallback(async () => {
    try { setLoading(true); const loaded = await notificationService.loadNotifications(); setNotifications(loaded); }
    catch { console.error('Error loading notifications:'); } finally { setLoading(false); setRefreshing(false); }
  }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); loadNotifications(); }, [loadNotifications]);

  const handleNotificationPress = useCallback(async (notification: Notification) => {
    if (!notification.isRead) { await notificationService.markAsRead(notification.id); setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)); }
    if (notification.actionScreen) navigation.navigate(notification.actionScreen as never);
  }, [navigation]);

  const handleActionPress = useCallback(async (notification: Notification) => {
    if (!notification.isRead) { await notificationService.markAsRead(notification.id); setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)); }
    navigation.navigate((notification.actionScreen || 'Dashboard') as never);
  }, [navigation]);

  const handleAcknowledge = useCallback(async (notification: Notification) => {
    try { await notificationService.acknowledgeNotification(notification.id); setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isAcknowledged: true } : n)); } catch {}
  }, []);

  const handleMarkAllAsRead = async () => { await notificationService.markAllAsRead(); setNotifications(prev => prev.map(n => ({ ...n, isRead: true }))); };
  const handleClearAll = () => {
    Alert.alert('Clear All', 'Clear all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setNotifications([]) },
    ]);
  };

  const handleCategoryChange = useCallback((category: NotificationCategory) => {
    setActiveCategory(category);
    const tabIndex = CATEGORY_TABS.findIndex(t => t.key === category);
    tabScrollRef.current?.scrollTo({ x: Math.max(0, (tabIndex - 2) * 80), animated: true });
  }, []);

  const getCategoryNotificationCount = useCallback((category: NotificationCategory) => {
    if (category === 'all') return roleFilteredNotifications.length;
    return notificationService.filterByCategory(roleFilteredNotifications, category).length;
  }, [roleFilteredNotifications]);

  const renderNotificationItem = useCallback(({ item }: { item: Notification }) => (
    <MemoizedNotificationCard notification={item} onPress={handleNotificationPress} onActionPress={handleActionPress} onAcknowledge={handleAcknowledge} />
  ), [handleNotificationPress, handleActionPress, handleAcknowledge]);

  const renderGroupedSection = useCallback((group: NotificationGroup) => (
    <View key={group.id} style={styles.groupSection}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{group.title}</Text>
        <View style={styles.groupCountBadge}><Text style={styles.groupCountText}>{group.count}</Text></View>
      </View>
      {group.notifications.map(n => (
        <MemoizedNotificationCard key={n.id} notification={n} onPress={handleNotificationPress} onActionPress={handleActionPress} onAcknowledge={handleAcknowledge} />
      ))}
    </View>
  ), [handleNotificationPress, handleActionPress, handleAcknowledge]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <MaterialCommunityIcons name="bell-outline" size={48} color={Colors.neutral['500']} />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setShowUnreadOnly(!showUnreadOnly)} style={[styles.headerActionBtn, showUnreadOnly && styles.headerActionBtnActive]}>
              <MaterialCommunityIcons name="email-open-outline" size={20} color={showUnreadOnly ? Colors.brand.primary : Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMode(viewMode === 'list' ? 'grouped' : 'list')} style={styles.headerActionBtn}>
              <MaterialCommunityIcons name={viewMode === 'list' ? 'view-agenda-outline' : 'format-list-bulleted'} size={20} color={Colors.white} />
            </TouchableOpacity>
            {filteredNotifications.some(n => !n.isRead) && (
              <TouchableOpacity onPress={handleMarkAllAsRead}>
                <MaterialCommunityIcons name="check-all" size={22} color={Colors.semantic.success} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleClearAll}>
              <MaterialCommunityIcons name="delete-outline" size={22} color={Colors.semantic.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statItem, styles.statCritical]}>
            <Text style={styles.statValueCritical}>{counts.critical}</Text>
            <Text style={styles.statLabel}>Critical</Text>
          </View>
          <View style={[styles.statItem, styles.statHigh]}>
            <Text style={styles.statValueHigh}>{counts.high}</Text>
            <Text style={styles.statLabel}>High</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{counts.stockAlerts}</Text>
            <Text style={styles.statLabel}>Stock</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{counts.payments}</Text>
            <Text style={styles.statLabel}>Sales</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{counts.deliveries}</Text>
            <Text style={styles.statLabel}>Delivery</Text>
          </View>
        </View>
        <Text style={styles.statsFooter}>{filteredNotifications.length} of {roleFilteredNotifications.length} notifications</Text>

        {/* Category Tabs */}
        <ScrollView ref={tabScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {CATEGORY_TABS.map((tab) => {
            const count = getCategoryNotificationCount(tab.key);
            const isActive = activeCategory === tab.key;
            return (
              <TouchableOpacity key={tab.key} style={[styles.tab, isActive && styles.tabActive]} onPress={() => handleCategoryChange(tab.key)}>
                <MaterialCommunityIcons name={tab.icon as any} size={14} color={isActive ? Colors.white : Colors.neutral['300']} />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
                {count > 0 && <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}><Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{count > 99 ? '99+' : count}</Text></View>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Content */}
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="bell-off-outline" size={64} color={Colors.neutral['500']} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>You're all caught up!</Text>
            {(showUnreadOnly || activeCategory !== 'all') && (
              <TouchableOpacity style={styles.resetBtn} onPress={() => { setShowUnreadOnly(false); setActiveCategory('all'); }}>
                <MaterialCommunityIcons name="refresh" size={16} color={Colors.brand.primary} />
                <Text style={styles.resetBtnText}>Reset Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : viewMode === 'list' ? (
          <FlashList data={filteredNotifications as any} renderItem={renderNotificationItem as any} estimatedItemSize={140} refreshing={refreshing} onRefresh={onRefresh} contentContainerStyle={styles.listContent} keyExtractor={(item: any) => item.id} />
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand.primary} />}>
            {groupedNotifications.map(renderGroupedSection)}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.app },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screenPadding, paddingVertical: Spacing.md, justifyContent: 'space-between' },
  headerTitle: { fontSize: Typography.scale.md, fontFamily: Typography.fontFamily.display, color: Colors.white },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerActionBtn: { padding: Spacing.xs },
  headerActionBtnActive: { backgroundColor: Colors.brand.primarySurface, borderRadius: BorderRadius.sm, padding: Spacing.xs },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.screenPadding, paddingVertical: Spacing.sm },
  statItem: { flex: 1, backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', ...Elevation.sm },
  statCritical: { backgroundColor: Colors.semantic.dangerSurface, borderWidth: 1, borderColor: Colors.semantic.danger + '40' },
  statHigh: { backgroundColor: Colors.semantic.warningSurface, borderWidth: 1, borderColor: Colors.semantic.warning + '40' },
  statValue: { fontSize: Typography.scale.lg, fontFamily: Typography.fontFamily.display, color: Colors.brand.primary, fontVariant: ['tabular-nums'] },
  statValueCritical: { fontSize: Typography.scale.lg, fontFamily: Typography.fontFamily.display, color: Colors.semantic.danger, fontVariant: ['tabular-nums'] },
  statValueHigh: { fontSize: Typography.scale.lg, fontFamily: Typography.fontFamily.display, color: Colors.semantic.warning, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 9, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'], textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  statsFooter: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.body, color: Colors.neutral['500'], paddingHorizontal: Spacing.screenPadding + 4, marginBottom: Spacing.sm },

  tabsContent: { paddingHorizontal: Spacing.screenPadding, paddingVertical: Spacing.sm, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.neutral['600'] },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.round, backgroundColor: Colors.background.card, gap: Spacing.xs + 2, ...Elevation.sm },
  tabActive: { backgroundColor: Colors.brand.primary },
  tabLabel: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['300'] },
  tabLabelActive: { color: Colors.white, fontFamily: Typography.fontFamily.semibold },
  tabBadge: { backgroundColor: Colors.neutral['600'], borderRadius: BorderRadius.full, paddingHorizontal: Spacing.xs + 2, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeText: { fontSize: 10, fontFamily: Typography.fontFamily.display, color: Colors.neutral['300'] },
  tabBadgeTextActive: { color: Colors.white },

  listContent: { flexGrow: 1, paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.sm, paddingBottom: Spacing.lg },
  groupSection: { marginBottom: Spacing.base },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm, paddingHorizontal: Spacing.xs },
  groupTitle: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.display, color: Colors.brand.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  groupCountBadge: { backgroundColor: Colors.brand.primarySurface, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  groupCountText: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.display, color: Colors.brand.primary },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.base },
  loadingText: { fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.medium, color: Colors.neutral['400'] },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing['3xl'], paddingHorizontal: Spacing.screenPadding },
  emptyTitle: { fontSize: Typography.scale.xl, fontFamily: Typography.fontFamily.display, color: Colors.white, marginTop: Spacing.base, marginBottom: Spacing.sm },
  emptySubtitle: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.body, color: Colors.neutral['400'], textAlign: 'center', paddingHorizontal: Spacing['3xl'] },
  resetBtn: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xl, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: BorderRadius.round, backgroundColor: Colors.brand.primarySurface, gap: Spacing.sm },
  resetBtnText: { fontSize: Typography.scale.sm, fontFamily: Typography.fontFamily.semibold, color: Colors.brand.primary },
});