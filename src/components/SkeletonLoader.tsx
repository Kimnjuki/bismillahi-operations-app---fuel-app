import React, { memo, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, BorderRadius } from '../constants/theme';

interface SkeletonLoaderProps {
  variant?: 'card' | 'row' | 'kpi' | 'chart';
  count?: number;
}

function SkeletonLoaderComponent({ variant = 'card', count = 1 }: SkeletonLoaderProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  const renderItem = (index: number) => {
    switch (variant) {
      case 'kpi':
        return (
          <Animated.View key={index} style={[styles.kpiCard, { opacity }]}>
            <View style={styles.kpiLabel} />
            <View style={styles.kpiValue} />
          </Animated.View>
        );
      case 'row':
        return (
          <Animated.View key={index} style={[styles.row, { opacity }]}>
            <View style={styles.rowIcon} />
            <View style={styles.rowContent}>
              <View style={styles.rowTitle} />
              <View style={styles.rowSubtitle} />
            </View>
          </Animated.View>
        );
      case 'chart':
        return (
          <Animated.View key={index} style={[styles.chart, { opacity }]}>
            <View style={styles.chartBar} />
            <View style={[styles.chartBar, { height: 60 }]} />
            <View style={styles.chartBar} />
            <View style={[styles.chartBar, { height: 80 }]} />
            <View style={styles.chartBar} />
          </Animated.View>
        );
      case 'card':
      default:
        return (
          <Animated.View key={index} style={[styles.card, { opacity }]}>
            <View style={styles.cardHeader} />
            <View style={styles.cardBody} />
            <View style={styles.cardFooter} />
          </Animated.View>
        );
    }
  };

  return <View style={styles.container}>{Array.from({ length: count }, (_, i) => renderItem(i))}</View>;
}

export const SkeletonLoader = memo(SkeletonLoaderComponent);

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 16,
  },
  card: {
    backgroundColor: Colors.neutral['700'],
    borderRadius: BorderRadius.md,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    width: '40%',
    height: 14,
    backgroundColor: Colors.neutral['600'],
    borderRadius: 4,
  },
  cardBody: {
    width: '100%',
    height: 40,
    backgroundColor: Colors.neutral['600'],
    borderRadius: 4,
  },
  cardFooter: {
    width: '60%',
    height: 12,
    backgroundColor: Colors.neutral['600'],
    borderRadius: 4,
  },
  kpiCard: {
    backgroundColor: Colors.neutral['700'],
    borderRadius: BorderRadius.md,
    padding: 12,
    width: 160,
    height: 90,
    gap: 8,
  },
  kpiLabel: {
    width: '60%',
    height: 10,
    backgroundColor: Colors.neutral['600'],
    borderRadius: 4,
  },
  kpiValue: {
    width: '80%',
    height: 20,
    backgroundColor: Colors.neutral['600'],
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral['700'],
    borderRadius: BorderRadius.sm,
    padding: 12,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutral['600'],
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    width: '50%',
    height: 12,
    backgroundColor: Colors.neutral['600'],
    borderRadius: 4,
  },
  rowSubtitle: {
    width: '30%',
    height: 10,
    backgroundColor: Colors.neutral['600'],
    borderRadius: 4,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.neutral['700'],
    borderRadius: BorderRadius.md,
    padding: 16,
    height: 150,
    gap: 8,
  },
  chartBar: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.neutral['600'],
    borderRadius: 4,
  },
});