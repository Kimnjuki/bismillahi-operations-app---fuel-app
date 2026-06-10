import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { notificationService, Notification } from '../services/notificationService';
import { FlashList } from '@shopify/flash-list';
import { NotificationCard } from '../components/NotificationCard';

// Memoized notification card wrapper
const MemoizedNotificationCard = memo(({ 
  notification, 
  onPress, 
  onActionPress 
}: { 
  notification: Notification; 
  onPress: (notification: Notification) => void;
  onActionPress: (notification: Notification) => void;
}) => (
  <NotificationCard
    notification={notification}
    onPress={onPress}
    onActionPress={onActionPress}
  />
));

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const loadedNotifications = await notificationService.loadNotifications();
      setNotifications(loadedNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const handleNotificationPress = useCallback(async (notification: Notification) => {
    if (!notification.isRead) {
      await notificationService.markAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );
    }

    if (notification.actionScreen) {
      navigation.navigate(notification.actionScreen as never);
    }
  }, [navigation]);

  const handleActionPress = useCallback(async (notification: Notification) => {
    if (!notification.isRead) {
      await notificationService.markAsRead(notification.id);
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      );
    }

    switch (notification.actionType) {
      case 'view_stock':
        navigation.navigate('StockManagement' as never);
        break;
      case 'view_payment':
        navigation.navigate('Reports' as never);
        break;
      case 'view_delivery':
        navigation.navigate('SalesEntry' as never);
        break;
      default:
        if (notification.actionScreen) {
          navigation.navigate(notification.actionScreen as never);
        }
        break;
    }
  }, [navigation]);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setNotifications([]);
          },
        },
      ]
    );
  };

  const getNotificationCounts = () => {
    const unread = notifications.filter(n => !n.isRead).length;
    const stockAlerts = notifications.filter(n => 
      n.type === 'stock_alert' || n.type === 'low_stock'
    ).length;
    const payments = notifications.filter(n => 
      n.type === 'payment_received' || n.type === 'payment_due'
    ).length;
    const deliveries = notifications.filter(n => 
      n.type === 'fuel_delivery'
    ).length;

    return { unread, stockAlerts, payments, deliveries };
  };

  const renderNotificationStats = () => {
    const { unread, stockAlerts, payments, deliveries } = getNotificationCounts();

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{unread}</Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stockAlerts}</Text>
          <Text style={styles.statLabel}>Stock Alerts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{payments}</Text>
          <Text style={styles.statLabel}>Payments</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{deliveries}</Text>
          <Text style={styles.statLabel}>Deliveries</Text>
        </View>
      </View>
    );
  };

  const renderNotificationItem = useCallback(({ item }: { item: Notification }) => (
    <MemoizedNotificationCard
      notification={item}
      onPress={handleNotificationPress}
      onActionPress={handleActionPress}
    />
  ), [handleNotificationPress, handleActionPress]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  if (loading) {
    return (
      <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#312C51', '#48426D']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerActions}>
            {notifications.some(n => !n.isRead) && (
              <TouchableOpacity onPress={handleMarkAllAsRead}>
                <Ionicons name="checkmark-done" size={24} color="#4CAF50" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleClearAll}>
              <Ionicons name="trash" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        {renderNotificationStats()}

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>
              You're all caught up! New notifications will appear here.
            </Text>
          </View>
        ) : (
          <FlashList
            data={notifications as any}
            renderItem={renderNotificationItem as any}
            estimatedItemSize={100}
            refreshing={refreshing}
            onRefresh={onRefresh}
            contentContainerStyle={styles.flashListContent}
          />
        )}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F0C38E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  flashListContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});