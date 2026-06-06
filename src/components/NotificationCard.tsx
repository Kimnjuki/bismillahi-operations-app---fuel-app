import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Notification } from '../services/notificationService';

interface NotificationCardProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onActionPress?: (notification: Notification) => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onActionPress,
}) => {
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'stock_alert':
      case 'low_stock':
        return 'cube-outline';
      case 'payment_received':
        return 'card-outline';
      case 'payment_due':
        return 'time-outline';
      case 'fuel_delivery':
        return 'car-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'stock_alert':
      case 'low_stock':
        return '#F0C38E';
      case 'payment_received':
        return '#4CAF50';
      case 'payment_due':
        return '#FF6B6B';
      case 'fuel_delivery':
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  const getActionButtonText = (actionType?: Notification['actionType']) => {
    switch (actionType) {
      case 'view_stock':
        return 'View Stock';
      case 'view_payment':
        return 'View Payment';
      case 'view_delivery':
        return 'View Delivery';
      default:
        return 'View';
    }
  };

  const getActionButtonIcon = (actionType?: Notification['actionType']) => {
    switch (actionType) {
      case 'view_stock':
        return 'list-outline';
      case 'view_payment':
        return 'card-outline';
      case 'view_delivery':
        return 'car-outline';
      default:
        return 'chevron-forward-outline';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const iconColor = getNotificationColor(notification.type);
  const isHighPriority = notification.priority === 'high';

  return (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !notification.isRead && styles.unreadCard,
        isHighPriority && styles.highPriorityCard,
      ]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
            <Ionicons
              name={getNotificationIcon(notification.type) as any}
              size={20}
              color="#ffffff"
            />
          </View>
          <View style={styles.notificationInfo}>
            <Text style={[
              styles.notificationTitle,
              !notification.isRead && styles.unreadTitle,
              isHighPriority && styles.highPriorityTitle,
            ]}>
              {notification.title}
            </Text>
            <Text style={styles.notificationDescription}>
              {notification.description}
            </Text>
            <Text style={styles.notificationTimestamp}>
              {formatTimestamp(notification.timestamp)}
            </Text>
          </View>
        </View>

        {notification.actionType && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: iconColor },
            ]}
            onPress={() => onActionPress?.(notification)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={getActionButtonIcon(notification.actionType) as any}
              size={16}
              color="#ffffff"
            />
            <Text style={styles.actionButtonText}>
              {getActionButtonText(notification.actionType)}
            </Text>
          </TouchableOpacity>
        )}

        {!notification.isRead && (
          <View style={styles.unreadIndicator} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  notificationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  unreadCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  highPriorityCard: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  highPriorityTitle: {
    color: '#FF6B6B',
  },
  notificationDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 6,
    lineHeight: 20,
  },
  notificationTimestamp: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 6,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
});











