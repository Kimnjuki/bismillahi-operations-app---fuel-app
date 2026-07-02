import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';

interface EmptyStateProps {
  icon: string;
  title: string;
  body?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

function EmptyStateComponent({ icon, title, body, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={icon as any} size={48} color={Colors.neutral['500']} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {body && <Text style={styles.body}>{body}</Text>}
      {action && (
        <TouchableOpacity style={styles.button} onPress={action.onPress} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{action.label}</Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color={Colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export const EmptyState = memo(EmptyStateComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['3xl'],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.neutral['700'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.scale.lg,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: Typography.scale.base,
    fontFamily: Typography.fontFamily.body,
    color: Colors.neutral['400'],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brand.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  buttonText: {
    fontSize: Typography.scale.base,
    fontFamily: Typography.fontFamily.semibold,
    color: Colors.white,
  },
});