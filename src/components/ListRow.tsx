import React, { memo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';

interface SwipeAction {
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
}

interface ListRowProps {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  swipeActions?: SwipeAction[];
  showChevron?: boolean;
}

function ListRowComponent({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
  swipeActions,
  showChevron = false,
}: ListRowProps) {
  const renderRightActions = () => {
    if (!swipeActions?.length) return null;
    
    return (
      <View style={styles.swipeContainer}>
        {swipeActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.swipeAction, { backgroundColor: action.color }]}
            onPress={action.onPress}
          >
            <MaterialCommunityIcons name={action.icon as any} size={20} color={Colors.white} />
            <Text style={styles.swipeActionText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const content = (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.6}
    >
      {leading && <View style={styles.leading}>{leading}</View>}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {trailing && <View style={styles.trailing}>{trailing}</View>}
      {showChevron && (
        <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.neutral['500']} />
      )}
    </TouchableOpacity>
  );

  if (swipeActions?.length) {
    return (
      <Swipeable renderRightActions={renderRightActions}>
        {content}
      </Swipeable>
    );
  }

  return content;
}

export const ListRow = memo(ListRowComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.card,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral['600'],
  },
  leading: {
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: Typography.scale.base,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.white,
  },
  subtitle: {
    fontSize: Typography.scale.sm,
    fontFamily: Typography.fontFamily.body,
    color: Colors.neutral['400'],
    marginTop: 2,
  },
  trailing: {
    marginLeft: Spacing.md,
  },
  swipeContainer: {
    flexDirection: 'row',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    gap: 2,
  },
  swipeActionText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.white,
  },
});