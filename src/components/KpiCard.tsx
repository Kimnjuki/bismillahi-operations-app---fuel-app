import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Elevation, Typography } from '../constants/theme';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  changePct?: number;
  changeDirection?: 'up' | 'down' | 'neutral';
  color?: string;
  icon?: string;
  loading?: boolean;
  onPress?: () => void;
}

function KpiCardComponent({
  label,
  value,
  unit,
  changePct,
  changeDirection,
  color = Colors.brand.primary,
  icon,
  loading = false,
  onPress,
}: KpiCardProps) {
  const resolvedColor = color || Colors.brand.primary;

  if (loading) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <View style={styles.skeletonLabel} />
        <View style={styles.skeletonValue} />
        <View style={styles.skeletonChange} />
      </View>
    );
  }

  const getChangeColor = () => {
    if (!changeDirection || changeDirection === 'neutral') return Colors.neutral['400'];
    return changeDirection === 'up' ? Colors.semantic.success : Colors.semantic.danger;
  };

  const getArrowIcon = () => {
    if (!changeDirection || changeDirection === 'neutral') return 'minus';
    return changeDirection === 'up' ? 'arrow-up' : 'arrow-down';
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${label}: ${value}${unit || ''}`}
      accessibilityHint={onPress ? 'Tap to view details' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {icon && (
          <MaterialCommunityIcons
            name={icon as any}
            size={16}
            color={resolvedColor}
          />
        )}
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: resolvedColor }]}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {changePct !== undefined && (
        <View style={styles.changeRow}>
          <MaterialCommunityIcons
            name={getArrowIcon() as any}
            size={12}
            color={getChangeColor()}
          />
          <Text style={[styles.changeText, { color: getChangeColor() }]}>
            {changePct.toFixed(1)}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export const KpiCard = memo(KpiCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    width: 160,
    height: 90,
    justifyContent: 'space-between',
    ...Elevation.sm,
  },
  loadingCard: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 8,
  },
  skeletonLabel: {
    width: '60%',
    height: 10,
    backgroundColor: Colors.neutral['600'],
    borderRadius: 4,
  },
  skeletonValue: {
    width: '80%',
    height: 18,
    backgroundColor: Colors.neutral['600'],
    borderRadius: 4,
  },
  skeletonChange: {
    width: '40%',
    height: 8,
    backgroundColor: Colors.neutral['600'],
    borderRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.neutral['400'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 24,
    fontFamily: Typography.fontFamily.display,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.neutral['400'],
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.medium,
  },
});