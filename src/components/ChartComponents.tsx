import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface LineChartProps {
  data: ChartData[];
  height?: number;
  showValues?: boolean;
}

interface BarChartProps {
  data: ChartData[];
  height?: number;
  showValues?: boolean;
}

interface ProgressChartProps {
  data: ChartData[];
  showValues?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({ 
  data, 
  height = 120, 
  showValues = true 
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue;

  return (
    <View style={[styles.chartContainer, { height }]}>
      <View style={styles.chartArea}>
        {data.map((item, index) => {
          const normalizedValue = range > 0 ? (item.value - minValue) / range : 0.5;
          const barHeight = normalizedValue * (height - 40);
          
          return (
            <View key={index} style={styles.chartPoint}>
              <View style={styles.chartLine}>
                <View
                  style={[
                    styles.chartBar,
                    { 
                      height: barHeight,
                      backgroundColor: item.color || '#F0C38E',
                    },
                  ]}
                />
              </View>
              {showValues && (
                <Text style={styles.chartValue}>
                  {item.value.toLocaleString()}
                </Text>
              )}
              <Text style={styles.chartLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export const BarChart: React.FC<BarChartProps> = ({ 
  data, 
  height = 120, 
  showValues = true 
}) => {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <View style={[styles.chartContainer, { height }]}>
      <View style={styles.barChartArea}>
        {data.map((item, index) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * (height - 40) : 0;
          
          return (
            <View key={index} style={styles.barChartItem}>
              <View style={styles.barChartContainer}>
                <View
                  style={[
                    styles.barChartBar,
                    { 
                      height: barHeight,
                      backgroundColor: item.color || '#F0C38E',
                    },
                  ]}
                />
              </View>
              {showValues && (
                <Text style={styles.barChartValue}>
                  {item.value.toLocaleString()}
                </Text>
              )}
              <Text style={styles.barChartLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export const ProgressChart: React.FC<ProgressChartProps> = ({ 
  data, 
  showValues = true 
}) => {
  return (
    <View style={styles.progressChartContainer}>
      {data.map((item, index) => (
        <View key={index} style={styles.progressChartItem}>
          <Text style={styles.progressChartLabel}>{item.label}</Text>
          <View style={styles.progressChartBar}>
            <LinearGradient
              colors={[item.color || '#F0C38E', item.color || '#F0C38E']}
              style={[
                styles.progressChartFill,
                { width: `${item.value}%` },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          {showValues && (
            <Text style={styles.progressChartValue}>{item.value}%</Text>
          )}
        </View>
      ))}
    </View>
  );
};

export const DonutChart: React.FC<{ data: ChartData[]; size?: number }> = ({ 
  data, 
  size = 120 
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;

  return (
    <View style={[styles.donutChartContainer, { width: size, height: size }]}>
      <View style={styles.donutChartInner}>
        <Text style={styles.donutChartTotal}>{total.toLocaleString()}</Text>
        <Text style={styles.donutChartLabel}>Total</Text>
      </View>
      {data.map((item, index) => {
        const percentage = (item.value / total) * 100;
        const angle = (item.value / total) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle += angle;

        return (
          <View
            key={index}
            style={[
              styles.donutChartSegment,
              {
                width: size,
                height: size,
                borderColor: item.color || '#F0C38E',
                borderWidth: 8,
                borderRadius: size / 2,
                transform: [{ rotate: `${startAngle}deg` }],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    paddingHorizontal: 10,
  },
  chartArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 20,
  },
  chartPoint: {
    alignItems: 'center',
    flex: 1,
  },
  chartLine: {
    height: 80,
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  chartBar: {
    borderRadius: 2,
    minHeight: 4,
  },
  chartValue: {
    fontSize: 10,
    color: '#ffffff',
    marginBottom: 4,
  },
  chartLabel: {
    fontSize: 12,
    color: '#ffffff',
  },
  barChartArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 20,
  },
  barChartItem: {
    alignItems: 'center',
    flex: 1,
  },
  barChartContainer: {
    height: 80,
    width: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    justifyContent: 'flex-end',
    marginBottom: 8,
    overflow: 'hidden',
  },
  barChartBar: {
    width: '100%',
    borderRadius: 10,
  },
  barChartValue: {
    fontSize: 10,
    color: '#ffffff',
    marginBottom: 4,
  },
  barChartLabel: {
    fontSize: 12,
    color: '#ffffff',
  },
  progressChartContainer: {
    gap: 12,
  },
  progressChartItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressChartLabel: {
    fontSize: 12,
    color: '#ffffff',
    width: 120,
  },
  progressChartBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  progressChartFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressChartValue: {
    fontSize: 12,
    color: '#ffffff',
    width: 40,
    textAlign: 'right',
  },
  donutChartContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  donutChartInner: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
    width: 80,
    height: 80,
  },
  donutChartTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  donutChartLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  donutChartSegment: {
    position: 'absolute',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
});











