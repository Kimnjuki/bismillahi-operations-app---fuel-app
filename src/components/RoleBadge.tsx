import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Typography } from '../constants/theme';

interface RoleBadgeProps {
  role: 'admin' | 'manager' | 'cashier' | 'viewer';
}

const ROLE_COLORS: Record<string, string> = {
  admin: Colors.roles.admin,
  manager: Colors.roles.manager,
  cashier: Colors.roles.cashier,
  viewer: Colors.roles.viewer,
};

function RoleBadgeComponent({ role }: RoleBadgeProps) {
  const color = ROLE_COLORS[role] || Colors.neutral['400'];

  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{role.toUpperCase()}</Text>
    </View>
  );
}

export const RoleBadge = memo(RoleBadgeComponent);

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.semibold,
    letterSpacing: 0.5,
  },
});