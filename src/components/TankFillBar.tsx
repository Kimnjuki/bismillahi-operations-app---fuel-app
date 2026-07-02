import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, BorderRadius, Typography } from '../constants/theme';

interface TankFillBarProps {
  current: number;
  capacity: number;
  animate?: boolean;
}

function TankFillBarComponent({ current, capacity, animate = true }: TankFillBarProps) {
  const pct = capacity > 0 ? Math.min((current / capacity) * 100, 100) : 0;
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animate) {
      Animated.timing(animatedWidth, {
        toValue: pct,
        duration: 600,
        useNativeDriver: false,
      }).start();
    } else {
      animatedWidth.setValue(pct);
    }
  }, [pct, animate]);

  const getColor = () => {
    if (pct < 15) return Colors.semantic.danger;
    if (pct < 30) return Colors.semantic.warning;
    return Colors.semantic.success;
  };

  const color = getColor();

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: animate ? animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }) : `${pct}%`,
            },
          ]}
        />
      </View>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color }]}>{current.toLocaleString()} L</Text>
        <Text style={styles.capacity}>{pct.toFixed(0)}%</Text>
      </View>
    </View>
  );
}

export const TankFillBar = memo(TankFillBarComponent);

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  track: {
    height: 8,
    backgroundColor: Colors.neutral['700'],
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: Typography.scale.sm,
    fontFamily: Typography.fontFamily.semibold,
    fontVariant: ['tabular-nums'],
  },
  capacity: {
    fontSize: Typography.scale.xs,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.neutral['400'],
  },
});