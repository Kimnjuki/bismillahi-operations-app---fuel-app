import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService, Notification } from '../services/notificationService';

interface NotificationCardProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onActionPress?: (notification: Notification) => void;
  onAcknowledge?: (notification: Notification) => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onActionPress,
  onAcknowledge,
}) => {
  const iconName = notificationService.getNotificationIcon(notification.type);
  const iconColor = notificationService.getNotificationColor(notification.type);
  const isHighPriority = notification.priority === 'high' || notification.priority === 'critical';
  const needsAcknowledgment = notification.requiresAcknowledgment && !notification.isAcknowledged;

  const formatTimestamp = (timestamp: string) => {
    return notificationService.formatTimestamp(timestamp);
  };

  const getActionButtonText = (actionType?: string) => {
    return notificationService.getActionButtonText(actionType as any);
  };

  const getActionButtonIcon = (actionType?: string) => {
    return notificationService.getActionButtonIcon(actionType as any);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return { label: 'CRITICAL', color: '#FF1744' };
      case 'high':
        return { label: 'HIGH', color: '#FF6B6B' };
      case 'medium':
        return { label: 'MEDIUM', color: '#F0C38E' };
      default:
        return null;
    }
  };

  const priorityBadge = getPriorityBadge(notification.priority);
  const showActionButton = notification.actionType && notification.actionType !== 'navigate';

  return (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !notification.isRead && styles.unreadCard,
        isHighPriority && styles.highPriorityCard,
        notification.priority === 'critical' && styles.criticalPriorityCard,
      ]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      {/* Priority Ribbon for critical/high */}
      {isHighPriority && <View style={[styles.priorityRibbon, { backgroundColor: iconColor }]} />}

      <View style={styles.notificationContent}>
        {/* Header Row */}
        <View style={styles.notificationHeader}>
          <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
            <Ionicons
              name={iconName as any}
              size={20}
              color="#ffffff"
            />
          </View>
          <View style={styles.notificationInfo}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.notificationTitle,
                  !notification.isRead && styles.unreadTitle,
                  isHighPriority && styles.highPriorityTitle,
                ]}
                numberOfLines={1}
              >
                {notification.title}
              </Text>
              {priorityBadge && (
                <View style={[styles.priorityBadge, { backgroundColor: priorityBadge.color }]}>
                  <Text style={styles.priorityBadgeText}>{priorityBadge.label}</Text>
                </View>
              )}
            </View>
            <Text style={styles.notificationDescription} numberOfLines={2}>
              {notification.description}
            </Text>
            <View style={styles.metaRow}>
              {notification.sourceUserName && (
                <Text style={styles.sourceText}>
                  by {notification.sourceUserName}
                </Text>
              )}
              <Text style={styles.notificationTimestamp}>
                {formatTimestamp(notification.timestamp)}
              </Text>
            </View>
          </View>
        </View>

        {/* Metadata chips */}
        {notification.metadata && (
          <View style={styles.metadataContainer}>
            {notification.metadata.amount !== undefined && (
              <View style={styles.metadataChip}>
                <Ionicons name="cash-outline" size={12} color="#F0C38E" />
                <Text style={styles.metadataText}>
                  ${notification.metadata.amount.toLocaleString()}
                </Text>
              </View>
            )}
            {notification.metadata.volume !== undefined && (
              <View style={styles.metadataChip}>
                <Ionicons name="water-outline" size={12} color="#2196F3" />
                <Text style={styles.metadataText}>
                  {notification.metadata.volume.toLocaleString()}L
                </Text>
              </View>
            )}
            {notification.metadata.percentage !== undefined && (
              <View style={styles.metadataChip}>
                <Text style={styles.metadataText}>
                  {notification.metadata.percentage}%
                </Text>
              </View>
            )}
            {notification.metadata.fuelType && (
              <View style={styles.metadataChip}>
                <Text style={styles.metadataText}>
                  {notification.metadata.fuelType}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          {showActionButton && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: iconColor }]}
              onPress={() => onActionPress?.(notification)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={getActionButtonIcon(notification.actionType) as any}
                size={14}
                color="#ffffff"
              />
              <Text style={styles.actionButtonText}>
                {getActionButtonText(notification.actionType)}
              </Text>
            </TouchableOpacity>
          )}
          {needsAcknowledgment && (
            <TouchableOpacity
              style={[styles.acknowledgeButton]}
              onPress={() => onAcknowledge?.(notification)}
              activeOpacity={0.8}
            >
              <Ionicons name="hand-left-outline" size={14} color="#4CAF50" />
              <Text style={styles.acknowledgeButtonText}>Acknowledge</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Unread/Read Indicator */}
        {!notification.isRead && <View style={styles.unreadIndicator} />}
        {notification.isAcknowledged && (
          <View style={styles.acknowledgedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  notificationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  unreadCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  highPriorityCard: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
  },
  criticalPriorityCard: {
    borderColor: '#FF1744',
    borderWidth: 2.5,
  },
  priorityRibbon: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 6,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  highPriorityTitle: {
    color: '#FF6B6B',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  notificationDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
  },
  notificationTimestamp: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  metadataChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  metadataText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600',
  },
  acknowledgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: 4,
  },
  acknowledgeButtonText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  acknowledgedBadge: {
    position: 'absolute',
    bottom: 14,
    right: 14,
  },
});