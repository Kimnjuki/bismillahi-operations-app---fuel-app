import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useOffline } from '../hooks/useOffline';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { useDashboardData } from '../hooks/useDashboardData';

const { width, height } = Dimensions.get('window');

interface DashboardStats {
  todaySales: number;
  todayExpenses: number;
  stockAlerts: number;
  pendingTransfers: number;
  monthlyGrowth: number;
  totalTransactions: number;
}

interface MenuItemType {
  title: string;
  subtitle: string;
  icon: string;
  screen: string;
  requiredRole: string;
  gradient: [string, string];
}

export default function DashboardScreen() {
  const { appUser, hasPermission, error: authError } = useAuth();
  const navigation = useNavigation();
  const { isOnline } = useOffline();

  const {
    stats,
    notifications,
    statsLoading,
    notificationsLoading,
    statsError,
    refetch,
    isOnline: hookIsOnline,
  } = useDashboardData();

  const [refreshing, setRefreshing] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const menuItems: MenuItemType[] = useMemo(() => [
    {
      title: 'Sales Entry',
      subtitle: 'Record sales',
      icon: '💰',
      screen: 'SalesEntry',
      requiredRole: 'cashier',
      gradient: ['#FF6B6B', '#FF8E8E'],
    },
    {
      title: 'Sales Records',
      subtitle: 'View all sales',
      icon: '📋',
      screen: 'SalesRecords',
      requiredRole: 'cashier',
      gradient: ['#4FC3F7', '#29B6F6'],
    },
    {
      title: 'Stock',
      subtitle: 'Inventory',
      icon: '📦',
      screen: 'StockManagement',
      requiredRole: 'manager',
      gradient: ['#4ECDC4', '#44A08D'],
    },
    {
      title: 'Expenses',
      subtitle: 'Track costs',
      icon: '💸',
      screen: 'ExpenseHomepage',
      requiredRole: 'cashier',
      gradient: ['#FFA726', '#FFB74D'],
    },
    {
      title: 'Accounts',
      subtitle: 'Receivables & Payables',
      icon: '🏛️',
      screen: 'Accounts',
      requiredRole: 'manager',
      gradient: ['#9C27B0', '#BA68C8'],
    },
    {
      title: 'Creditors & Suppliers',
      subtitle: 'Manage vendors',
      icon: '🏢',
      screen: 'CreditorsSuppliers',
      requiredRole: 'manager',
      gradient: ['#607D8B', '#78909C'],
    },
    {
      title: 'Station Settings',
      subtitle: 'Configure stations',
      icon: '⚙️',
      screen: 'StationSettings',
      requiredRole: 'admin',
      gradient: ['#795548', '#8D6E63'],
    },
    {
      title: 'Pump Management',
      subtitle: 'Manage pumps',
      icon: '⛽',
      screen: 'PumpManagement',
      requiredRole: 'admin',
      gradient: ['#E91E63', '#F06292'],
    },
    {
      title: 'Pump Dipping',
      subtitle: 'Tank readings & variance',
      icon: '📊',
      screen: 'PumpDippingManagement',
      requiredRole: 'admin',
      gradient: ['#3F51B5', '#5C6BC0'],
    },
    {
      title: 'Fuel Delivery',
      subtitle: 'Track deliveries & stock',
      icon: '🚛',
      screen: 'FuelDelivery',
      requiredRole: 'manager',
      gradient: ['#FF5722', '#FF7043'],
    },
    {
      title: 'Transfer',
      subtitle: 'Funds',
      icon: '🔄',
      screen: 'FundTransfer',
      requiredRole: 'manager',
      gradient: ['#AB47BC', '#BA68C8'],
    },
    {
      title: 'Exchange',
      subtitle: 'Rates',
      icon: '💱',
      screen: 'ExchangeRate',
      requiredRole: 'manager',
      gradient: ['#26A69A', '#4DB6AC'],
    },
    {
      title: 'Reports',
      subtitle: 'View All Reports',
      icon: '📊',
      screen: 'Reports',
      requiredRole: 'viewer',
      gradient: ['#42A5F5', '#64B5F6'],
    },
    {
      title: 'Analytics',
      subtitle: 'Charts & Trends',
      icon: '📈',
      screen: 'Analytics',
      requiredRole: 'viewer',
      gradient: ['#9B59B6', '#8E44AD'],
    },
    {
      title: 'Users',
      subtitle: 'Management',
      icon: '👥',
      screen: 'UserManagement',
      requiredRole: 'admin',
      gradient: ['#66BB6A', '#81C784'],
    },
    {
      title: 'Notifications',
      subtitle: 'Alerts',
      icon: '🔔',
      screen: 'Notifications',
      requiredRole: 'viewer',
      gradient: ['#EF5350', '#E57373'],
    },
    {
      title: 'Settings',
      subtitle: 'Config',
      icon: '⚙️',
      screen: 'Settings',
      requiredRole: 'admin',
      gradient: ['#78909C', '#90A4AE'],
    },
  ], []);

  useEffect(() => {
    setNotificationCount(notifications.filter(n => !n.isRead).length);
  }, [notifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleMenuPress = useCallback((item: MenuItemType) => {
    // Special handling: map 'Reports' screen to the ReportsScreen
    if (item.screen === 'Reports') {
      (navigation as any).navigate('Reports');
      return;
    }
    if (!hasPermission(item.requiredRole)) {
      Alert.alert('Access Denied', 'You do not have permission to access this feature.');
      return;
    }

    (navigation as any).navigate(item.screen);
  }, [hasPermission, navigation]);

  const renderStatCard = (title: string, value: string | number, subtitle: string, color: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );

  const renderMenuItem = (item: MenuItemType, index: number) => {
    const canAccess = hasPermission(item.requiredRole);
    
    return (
      <TouchableOpacity
        key={index}
        style={[styles.menuItem, !canAccess && styles.menuItemDisabled]}
        onPress={() => handleMenuPress(item)}
        disabled={!canAccess}
      >
        <LinearGradient
          colors={canAccess ? item.gradient : ['#E0E0E0', '#F5F5F5']}
          style={styles.menuItemGradient}
        >
          <Text style={styles.menuItemIcon}>{item.icon}</Text>
          <Text style={[styles.menuItemTitle, !canAccess && styles.menuItemTitleDisabled]}>
            {item.title}
          </Text>
          <Text style={[styles.menuItemSubtitle, !canAccess && styles.menuItemSubtitleDisabled]}>
            {item.subtitle}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (statsLoading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (statsError) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load dashboard data</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refetch}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Enhanced Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.userInfo}>
                <Text style={styles.welcomeText}>
                  Welcome, {appUser?.full_name || 'User'}!
                </Text>
                <Text style={styles.roleText}>
                  {appUser?.role?.toUpperCase() || 'USER'}
                </Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={styles.notificationButton}
                  onPress={() => navigation.navigate('Notifications' as never)}
                >
                  <Ionicons name="notifications" size={24} color="#ffffff" />
                  {notificationCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            {!isOnline && <OfflineIndicator />}
          </View>

          {/* Compact Stats Cards - 2x2 Grid */}
          <View style={styles.statsContainer}>
            {renderStatCard('Sales', `₣${stats.todaySales.toLocaleString()}`, 'Today', '#4CAF50')}
            {renderStatCard('Expenses', `₣${stats.todayExpenses.toLocaleString()}`, 'Today', '#FF9800')}
            {renderStatCard('Alerts', stats.stockAlerts, 'Stock', '#F44336')}
            {renderStatCard('Transfers', stats.pendingTransfers, 'Pending', '#2196F3')}
          </View>

          {/* Compact Menu Grid - 3 columns for better space usage */}
          <View style={styles.menuGrid}>
            {menuItems.map((item, index) => renderMenuItem(item, index))}
          </View>

          {/* Quick Actions Row */}
          <View style={styles.quickActionsContainer}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => handleMenuPress(menuItems[0])} // Sales Entry
            >
              <Text style={styles.quickActionIcon}>💰</Text>
              <Text style={styles.quickActionText}>Quick Sale</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => handleMenuPress(menuItems[2])} // Expenses
            >
              <Text style={styles.quickActionIcon}>💸</Text>
              <Text style={styles.quickActionText}>Add Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => handleMenuPress(menuItems.find(m => m.screen === 'Reports') || menuItems[11])} // Reports
            >
              <Text style={styles.quickActionIcon}>📊</Text>
              <Text style={styles.quickActionText}>View Reports</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Notifications */}
          {notifications.length > 0 && (
            <View style={styles.notificationsContainer}>
              <View style={styles.notificationsHeader}>
                <Text style={styles.notificationsTitle}>Recent Alerts</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Notifications' as never)}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {notifications.slice(0, 3).map((notification) => (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.notificationPreview,
                      !notification.isRead && styles.unreadNotificationPreview,
                    ]}
                    onPress={() => navigation.navigate('Notifications' as never)}
                  >
                    <View style={styles.notificationPreviewContent}>
                      <Ionicons
                        name={
                          notification.type === 'low_stock' ? 'warning' :
                          notification.type === 'payment_received' ? 'card' :
                          notification.type === 'fuel_delivery' ? 'car' :
                          'notifications'
                        }
                        size={16}
                        color={
                          notification.type === 'low_stock' ? '#FF6B6B' :
                          notification.type === 'payment_received' ? '#4CAF50' :
                          notification.type === 'fuel_delivery' ? '#2196F3' :
                          '#F0C38E'
                        }
                      />
                      <Text style={styles.notificationPreviewTitle} numberOfLines={1}>
                        {notification.title}
                      </Text>
                      <Text style={styles.notificationPreviewDescription} numberOfLines={2}>
                        {notification.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  roleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    margin: 2,
    flex: 1,
    minWidth: (width - 40) / 2,
    borderLeftWidth: 3,
  },
  statTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  menuItem: {
    width: (width - 48) / 2, // 2 columns with proper spacing
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
  },
  menuItemIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 2,
  },
  menuItemTitleDisabled: {
    color: '#999',
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  menuItemSubtitleDisabled: {
    color: '#666',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  quickActionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  notificationsContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  viewAllText: {
    fontSize: 14,
    color: '#F0C38E',
    fontWeight: '600',
  },
  notificationPreview: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  unreadNotificationPreview: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  notificationPreviewContent: {
    flex: 1,
  },
  notificationPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
  },
  notificationPreviewDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 16,
  },
});