import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Typography } from '../constants/theme';

interface StatusBadgeProps {
  status: string;
  variant?: 'outlined' | 'filled';
  size?: 'sm' | 'md';
}

const STATUS_COLORS: Record<string, string> = {
  pending: Colors.semantic.warning,
  approved: Colors.semantic.success,
  paid: Colors.semantic.success,
  overdue: Colors.semantic.danger,
  active: Colors.semantic.success,
  inactive: Colors.neutral['400'],
  scheduled: Colors.semantic.info,
  in_transit: Colors.semantic.info,
  received: Colors.semantic.success,
  verified: Colors.semantic.success,
  critical: Colors.semantic.danger,
  low: Colors.semantic.warning,
  normal: Colors.semantic.success,
  delivered: Colors.semantic.success,
  cancelled: Colors.neutral['500'],
  partial: Colors.semantic.info,
  failed: Colors.semantic.danger,
  refunded: Colors.neutral['400'],
};

function StatusBadgeComponent({
  status,
  variant = 'outlined',
  size = 'sm',
}: StatusBadgeProps) {
  const color = STATUS_COLORS[status.toLowerCase()] || Colors.neutral['400'];
  const isFilled = variant === 'filled';

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' ? styles.sm : styles.md,
        isFilled
          ? { backgroundColor: color + '20', borderColor: color }
          : { borderColor: color + '40', backgroundColor: 'transparent' },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        style={[
          styles.text,
          size === 'sm' ? styles.textSm : styles.textMd,
          { color },
        ]}
      >
        {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
      </Text>
    </View>
  );
}

export const StatusBadge = memo(StatusBadgeComponent);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.round,
    gap: 4,
  },
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: Typography.fontFamily.medium,
    textTransform: 'capitalize',
  },
  textSm: {
    fontSize: 11,
  },
  textMd: {
    fontSize: 13,
  },
});