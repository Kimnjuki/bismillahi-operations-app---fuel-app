import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Typography } from '../constants/theme';

interface FuelTypeChipProps {
  type: 'PMS' | 'AGO' | 'DPK';
  size?: 'sm' | 'md';
}

const FUEL_COLORS: Record<string, { color: string; label: string }> = {
  PMS: { color: Colors.fuel.PMS, label: 'PMS' },
  AGO: { color: Colors.fuel.AGO, label: 'AGO' },
  DPK: { color: Colors.fuel.DPK, label: 'DPK' },
};

function FuelTypeChipComponent({ type, size = 'sm' }: FuelTypeChipProps) {
  const info = FUEL_COLORS[type] || { color: Colors.neutral['400'], label: type.toUpperCase() };

  return (
    <View
      style={[
        styles.chip,
        size === 'md' && styles.chipMd,
        { backgroundColor: info.color + '20', borderColor: info.color + '40' },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: info.color }]} />
      <Text style={[styles.label, size === 'md' && styles.labelMd, { color: info.color }]}>
        {info.label}
      </Text>
    </View>
  );
}

export const FuelTypeChip = memo(FuelTypeChipComponent);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    gap: 4,
  },
  chipMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.semibold,
  },
  labelMd: {
    fontSize: 12,
  },
});