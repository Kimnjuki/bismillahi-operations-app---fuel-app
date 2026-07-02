import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography } from '../constants/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

function SectionHeaderComponent({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {action && (
        <TouchableOpacity onPress={action.onPress} activeOpacity={0.7}>
          <Text style={styles.action}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export const SectionHeader = memo(SectionHeaderComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.scale.md,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.white,
  },
  subtitle: {
    fontSize: Typography.scale.sm,
    fontFamily: Typography.fontFamily.body,
    color: Colors.neutral['400'],
    marginTop: 2,
  },
  action: {
    fontSize: Typography.scale.sm,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.brand.primary,
  },
});