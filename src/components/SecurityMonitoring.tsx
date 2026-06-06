import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, List, IconButton, ProgressBar } from 'react-native-paper';
import { useSecurity } from '../context/SecurityContext';
import { securityService } from '../services/securityService';

// Security monitoring component
const SecurityMonitoring: React.FC = () => {
  const { securityLevel, lastSecurityCheck, performSecurityCheck } = useSecurity();
  
  // Monitoring state
  const [monitoringData, setMonitoringData] = useState({
    activeSessions: 0,
    failedLoginAttempts: 0,
    securityEvents: 0,
    systemHealth: 100,
    lastUpdate: new Date(),
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Start monitoring
  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, []);

  const startMonitoring = () => {
    setIsMonitoring(true);
    
    // Update monitoring data every 30 seconds
    const interval = setInterval(updateMonitoringData, 30000);
    
    // Store interval ID for cleanup
    (window as any).monitoringInterval = interval;
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    
    // Clear interval
    if ((window as any).monitoringInterval) {
      clearInterval((window as any).monitoringInterval);
      (window as any).monitoringInterval = null;
    }
  };

  const updateMonitoringData = async () => {
    try {
      // Simulate monitoring data updates
      const newData = {
        activeSessions: Math.floor(Math.random() * 50) + 10,
        failedLoginAttempts: Math.floor(Math.random() * 10),
        securityEvents: Math.floor(Math.random() * 20),
        systemHealth: Math.floor(Math.random() * 20) + 80,
        lastUpdate: new Date(),
      };

      setMonitoringData(newData);

      // Check for alerts
      checkForAlerts(newData);

      // Perform security check if needed
      if (newData.systemHealth < 90) {
        await performSecurityCheck();
      }
    } catch (error) {
      console.error('Failed to update monitoring data:', error);
    }
  };

  const checkForAlerts = (data: any) => {
    const newAlerts: any[] = [];

    // Check for high failed login attempts
    if (data.failedLoginAttempts > 5) {
      newAlerts.push({
        id: Date.now(),
        type: 'warning',
        title: 'High Failed Login Attempts',
        message: `${data.failedLoginAttempts} failed login attempts detected`,
        timestamp: new Date(),
      });
    }

    // Check for low system health
    if (data.systemHealth < 90) {
      newAlerts.push({
        id: Date.now() + 1,
        type: 'error',
        title: 'System Health Warning',
        message: `System health is at ${data.systemHealth}%`,
        timestamp: new Date(),
      });
    }

    // Check for high security events
    if (data.securityEvents > 15) {
      newAlerts.push({
        id: Date.now() + 2,
        type: 'warning',
        title: 'High Security Events',
        message: `${data.securityEvents} security events in the last period`,
        timestamp: new Date(),
      });
    }

    // Add new alerts
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 10)); // Keep only last 10 alerts
    }
  };

  const dismissAlert = (alertId: number) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const clearAllAlerts = () => {
    Alert.alert(
      'Clear All Alerts',
      'Are you sure you want to clear all alerts?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', onPress: () => setAlerts([]) },
      ]
    );
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return '#4CAF50';
    if (health >= 70) return '#FF9800';
    return '#F44336';
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error': return '#F44336';
      case 'warning': return '#FF9800';
      case 'info': return '#2196F3';
      default: return '#757575';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  const renderSystemOverview = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>System Overview</Title>
        <View style={styles.overviewGrid}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewValue}>{monitoringData.activeSessions}</Text>
            <Text style={styles.overviewLabel}>Active Sessions</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewValue, { color: monitoringData.failedLoginAttempts > 5 ? '#F44336' : '#4CAF50' }]}>
              {monitoringData.failedLoginAttempts}
            </Text>
            <Text style={styles.overviewLabel}>Failed Logins</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewValue, { color: monitoringData.securityEvents > 15 ? '#FF9800' : '#4CAF50' }]}>
              {monitoringData.securityEvents}
            </Text>
            <Text style={styles.overviewLabel}>Security Events</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewValue, { color: getHealthColor(monitoringData.systemHealth) }]}>
              {monitoringData.systemHealth}%
            </Text>
            <Text style={styles.overviewLabel}>System Health</Text>
          </View>
        </View>
        <Text style={styles.lastUpdate}>
          Last updated: {formatTimestamp(monitoringData.lastUpdate)}
        </Text>
      </Card.Content>
    </Card>
  );

  const renderSecurityStatus = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Security Status</Title>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Current Level:</Text>
          <Chip
            mode="outlined"
            textStyle={{ color: getHealthColor(monitoringData.systemHealth) }}
            style={{ borderColor: getHealthColor(monitoringData.systemHealth) }}
          >
            {securityLevel}
          </Chip>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Last Check:</Text>
          <Text style={styles.statusValue}>
            {lastSecurityCheck ? formatTimestamp(lastSecurityCheck) : 'Never'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Monitoring:</Text>
          <Chip
            mode="outlined"
            textStyle={{ color: isMonitoring ? '#4CAF50' : '#F44336' }}
            style={{ borderColor: isMonitoring ? '#4CAF50' : '#F44336' }}
          >
            {isMonitoring ? 'Active' : 'Inactive'}
          </Chip>
        </View>
        <View style={styles.statusActions}>
          <Button
            mode="outlined"
            onPress={isMonitoring ? stopMonitoring : startMonitoring}
            style={styles.statusButton}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
          <Button
            mode="contained"
            onPress={performSecurityCheck}
            style={styles.statusButton}
          >
            Run Security Check
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const renderSystemHealth = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>System Health</Title>
        <View style={styles.healthRow}>
          <Text style={styles.healthLabel}>Overall Health:</Text>
          <Text style={[styles.healthValue, { color: getHealthColor(monitoringData.systemHealth) }]}>
            {monitoringData.systemHealth}%
          </Text>
        </View>
        <ProgressBar
          progress={monitoringData.systemHealth / 100}
          color={getHealthColor(monitoringData.systemHealth)}
          style={styles.healthProgress}
        />
        <View style={styles.healthMetrics}>
          <View style={styles.healthMetric}>
            <Text style={styles.healthMetricLabel}>CPU Usage:</Text>
            <Text style={styles.healthMetricValue}>45%</Text>
          </View>
          <View style={styles.healthMetric}>
            <Text style={styles.healthMetricLabel}>Memory Usage:</Text>
            <Text style={styles.healthMetricValue}>62%</Text>
          </View>
          <View style={styles.healthMetric}>
            <Text style={styles.healthMetricLabel}>Disk Usage:</Text>
            <Text style={styles.healthMetricValue}>38%</Text>
          </View>
          <View style={styles.healthMetric}>
            <Text style={styles.healthMetricLabel}>Network:</Text>
            <Text style={styles.healthMetricValue}>Good</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderAlerts = () => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.alertsHeader}>
          <Title>Security Alerts ({alerts.length})</Title>
          {alerts.length > 0 && (
            <Button
              mode="outlined"
              onPress={clearAllAlerts}
              compact
            >
              Clear All
            </Button>
          )}
        </View>
        
        {alerts.length === 0 ? (
          <Paragraph>No security alerts</Paragraph>
        ) : (
          <ScrollView style={styles.alertsList} showsVerticalScrollIndicator={false}>
            {alerts.map((alert) => (
              <View key={alert.id} style={styles.alertItem}>
                <View style={styles.alertHeader}>
                  <View style={styles.alertTypeContainer}>
                    <View
                      style={[
                        styles.alertTypeIndicator,
                        { backgroundColor: getAlertColor(alert.type) }
                      ]}
                    />
                    <Text style={styles.alertTitle}>{alert.title}</Text>
                  </View>
                  <IconButton
                    icon="close"
                    size={16}
                    onPress={() => dismissAlert(alert.id)}
                  />
                </View>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertTimestamp}>
                  {formatTimestamp(alert.timestamp)}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </Card.Content>
    </Card>
  );

  const renderMonitoringActions = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Monitoring Actions</Title>
        <Button
          mode="contained"
          onPress={updateMonitoringData}
          style={styles.actionButton}
        >
          Refresh Data
        </Button>
        <Button
          mode="outlined"
          onPress={() => {
            Alert.alert(
              'Reset Monitoring',
              'Are you sure you want to reset all monitoring data?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  onPress: () => {
                    setMonitoringData({
                      activeSessions: 0,
                      failedLoginAttempts: 0,
                      securityEvents: 0,
                      systemHealth: 100,
                      lastUpdate: new Date(),
                    });
                    setAlerts([]);
                  },
                },
              ]
            );
          }}
          style={styles.actionButton}
        >
          Reset Monitoring
        </Button>
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderSystemOverview()}
      {renderSecurityStatus()}
      {renderSystemHealth()}
      {renderAlerts()}
      {renderMonitoringActions()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  overviewItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 16,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  overviewLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  lastUpdate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 16,
    color: '#666',
  },
  statusActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statusButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  healthValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  healthProgress: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  healthMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  healthMetric: {
    width: '48%',
    marginBottom: 8,
  },
  healthMetricLabel: {
    fontSize: 14,
    color: '#666',
  },
  healthMetricValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertsList: {
    maxHeight: 300,
  },
  alertItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertTypeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  alertTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  actionButton: {
    marginBottom: 8,
  },
});

export default SecurityMonitoring;

