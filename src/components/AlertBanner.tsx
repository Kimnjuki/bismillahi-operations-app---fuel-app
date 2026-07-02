import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Elevation } from '../constants/theme';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message?: string;
}

interface AlertBannerProps {
  alerts: Alert[];
  onPress: (alert: Alert) => void;
}

const ALERT_STYLES: Record<string, { color: string; surface: string; icon: string }> = {
  critical: { color: Colors.semantic.danger, surface: Colors.semantic.dangerSurface, icon: 'alert-circle' },
  warning: { color: Colors.semantic.warning, surface: Colors.semantic.warningSurface, icon: 'alert' },
  info: { color: Colors.semantic.info, surface: Colors.semantic.infoSurface, icon: 'information' },
};

function AlertBannerComponent({ alerts, onPress }: AlertBannerProps) {
  if (!alerts?.length) return null;

  // Single alert → full width banner
  if (alerts.length === 1) {
    const alert = alerts[0];
    const style = ALERT_STYLES[alert.type];
    return (
      <TouchableOpacity
        style={[styles.singleBanner, { backgroundColor: style.surface, borderLeftColor: style.color }]}
        onPress={() => onPress(alert)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name={style.icon as any} size={20} color={style.color} />
        <View style={styles.bannerContent}>
          <Text style={[styles.bannerTitle, { color: style.color }]}>{alert.title}</Text>
          {alert.message && <Text style={styles.bannerMessage}>{alert.message}</Text>}
        </View>
      </TouchableOpacity>
    );
  }

  // Multiple alerts → horizontal scrollable chips
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipContainer}
    >
      {alerts.map((alert) => {
        const style = ALERT_STYLES[alert.type];
        return (
          <TouchableOpacity
            key={alert.id}
            style={[styles.chip, { backgroundColor: style.surface, borderColor: style.color }]}
            onPress={() => onPress(alert)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name={style.icon as any} size={14} color={style.color} />
            <Text style={[styles.chipText, { color: style.color }]} numberOfLines={1}>
              {alert.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export const AlertBanner = memo(AlertBannerComponent);

const styles = StyleSheet.create({
  singleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    gap: Spacing.md,
    ...Elevation.sm,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: Typography.scale.sm,
    fontFamily: Typography.fontFamily.semibold,
  },
  bannerMessage: {
    fontSize: Typography.scale.xs,
    fontFamily: Typography.fontFamily.body,
    color: Colors.neutral['300'],
    marginTop: 2,
  },
  chipContainer: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    gap: 4,
  },
  chipText: {
    fontSize: Typography.scale.sm,
    fontFamily: Typography.fontFamily.medium,
  },
});