import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, List, IconButton } from 'react-native-paper';
import { useSecurity, SecurityEvent, SecurityMetrics } from '../context/SecurityContext';
import { securityService } from '../services/securityService';

// Security dashboard component
const SecurityDashboard: React.FC = () => {
  const {
    isSecure,
    securityLevel,
    lastSecurityCheck,
    securityEvents,
    securityMetrics,
    performSecurityCheck,
    getSecurityEvents,
    getSecurityMetrics,
    reportSecurityIssue,
  } = useSecurity();

  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  // Load security data on mount
  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        getSecurityEvents(),
        getSecurityMetrics(),
      ]);
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecurityCheck = async () => {
    setIsLoading(true);
    try {
      await performSecurityCheck();
      await loadSecurityData();
    } catch (error) {
      console.error('Security check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportIssue = () => {
    Alert.prompt(
      'Report Security Issue',
      'Please describe the security issue you want to report:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: async (issue: any) => {
            if (issue && issue.trim()) {
              await reportSecurityIssue(issue.trim(), 'MEDIUM');
              await loadSecurityData();
            }
          },
        },
      ]
    );
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return '#4CAF50';
      case 'MEDIUM': return '#FF9800';
      case 'HIGH': return '#F44336';
      case 'CRITICAL': return '#9C27B0';
      default: return '#757575';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return '#4CAF50';
      case 'MEDIUM': return '#FF9800';
      case 'HIGH': return '#F44336';
      case 'CRITICAL': return '#9C27B0';
      default: return '#757575';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderSecurityOverview = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Security Overview</Title>
        <View style={styles.overviewRow}>
          <Text style={styles.overviewLabel}>Status:</Text>
          <Chip
            mode="outlined"
            textStyle={{ color: getSecurityLevelColor(securityLevel) }}
            style={{ borderColor: getSecurityLevelColor(securityLevel) }}
          >
            {isSecure ? 'Secure' : 'At Risk'}
          </Chip>
        </View>
        <View style={styles.overviewRow}>
          <Text style={styles.overviewLabel}>Level:</Text>
          <Chip
            mode="outlined"
            textStyle={{ color: getSecurityLevelColor(securityLevel) }}
            style={{ borderColor: getSecurityLevelColor(securityLevel) }}
          >
            {securityLevel}
          </Chip>
        </View>
        <View style={styles.overviewRow}>
          <Text style={styles.overviewLabel}>Last Check:</Text>
          <Text style={styles.overviewValue}>
            {lastSecurityCheck ? formatTimestamp(lastSecurityCheck.toISOString()) : 'Never'}
          </Text>
        </View>
        <Button
          mode="contained"
          onPress={handleSecurityCheck}
          loading={isLoading}
          style={styles.checkButton}
        >
          Run Security Check
        </Button>
      </Card.Content>
    </Card>
  );

  const renderSecurityMetrics = () => {
    if (!securityMetrics) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title>Security Metrics</Title>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{securityMetrics.totalEvents}</Text>
              <Text style={styles.metricLabel}>Total Events</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: getSeverityColor('CRITICAL') }]}>
                {securityMetrics.eventsBySeverity.CRITICAL}
              </Text>
              <Text style={styles.metricLabel}>Critical</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: getSeverityColor('HIGH') }]}>
                {securityMetrics.eventsBySeverity.HIGH}
              </Text>
              <Text style={styles.metricLabel}>High</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: getSeverityColor('MEDIUM') }]}>
                {securityMetrics.eventsBySeverity.MEDIUM}
              </Text>
              <Text style={styles.metricLabel}>Medium</Text>
            </View>
          </View>
          <Text style={styles.lastUpdated}>
            Last updated: {formatTimestamp(securityMetrics.lastUpdated)}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  const renderSecurityEvents = () => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.eventsHeader}>
          <Title>Recent Security Events</Title>
          <IconButton
            icon="refresh"
            size={20}
            onPress={loadSecurityData}
            disabled={isLoading}
          />
        </View>
        {securityEvents.length === 0 ? (
          <Paragraph>No security events found</Paragraph>
        ) : (
          <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
            {securityEvents.slice(0, 10).map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventItem}
                onPress={() => setSelectedEvent(event)}
              >
                <View style={styles.eventHeader}>
                  <Text style={styles.eventType}>{event.eventType}</Text>
                  <Chip
                    mode="outlined"
                    textStyle={{ color: getSeverityColor(event.severity) }}
                    style={{ borderColor: getSeverityColor(event.severity) }}
                  >
                    {event.severity}
                  </Chip>
                </View>
                <Text style={styles.eventDescription}>{event.description}</Text>
                <Text style={styles.eventTimestamp}>
                  {formatTimestamp(event.timestamp)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </Card.Content>
    </Card>
  );

  const renderEventDetails = () => {
    if (!selectedEvent) return null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.eventDetailsHeader}>
            <Title>Event Details</Title>
            <IconButton
              icon="close"
              size={20}
              onPress={() => setSelectedEvent(null)}
            />
          </View>
          <View style={styles.eventDetailRow}>
            <Text style={styles.eventDetailLabel}>Type:</Text>
            <Text style={styles.eventDetailValue}>{selectedEvent.eventType}</Text>
          </View>
          <View style={styles.eventDetailRow}>
            <Text style={styles.eventDetailLabel}>Severity:</Text>
            <Chip
              mode="outlined"
              textStyle={{ color: getSeverityColor(selectedEvent.severity) }}
              style={{ borderColor: getSeverityColor(selectedEvent.severity) }}
            >
              {selectedEvent.severity}
            </Chip>
          </View>
          <View style={styles.eventDetailRow}>
            <Text style={styles.eventDetailLabel}>Description:</Text>
            <Text style={styles.eventDetailValue}>{selectedEvent.description}</Text>
          </View>
          <View style={styles.eventDetailRow}>
            <Text style={styles.eventDetailLabel}>Timestamp:</Text>
            <Text style={styles.eventDetailValue}>
              {formatTimestamp(selectedEvent.timestamp)}
            </Text>
          </View>
          {selectedEvent.metadata && (
            <View style={styles.eventDetailRow}>
              <Text style={styles.eventDetailLabel}>Metadata:</Text>
              <Text style={styles.eventDetailValue}>
                {JSON.stringify(selectedEvent.metadata, null, 2)}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderSecurityOverview()}
      {renderSecurityMetrics()}
      {renderSecurityEvents()}
      {renderEventDetails()}
      
      <Card style={styles.card}>
        <Card.Content>
          <Title>Security Actions</Title>
          <Button
            mode="outlined"
            onPress={handleReportIssue}
            style={styles.actionButton}
          >
            Report Security Issue
          </Button>
        </Card.Content>
      </Card>
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
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  overviewLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  overviewValue: {
    fontSize: 16,
    color: '#666',
  },
  checkButton: {
    marginTop: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 16,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventsList: {
    maxHeight: 300,
  },
  eventItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 16,
    fontWeight: '500',
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  eventDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventDetailRow: {
    marginBottom: 12,
  },
  eventDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  eventDetailValue: {
    fontSize: 14,
    color: '#666',
  },
  actionButton: {
    marginTop: 8,
  },
});

export default SecurityDashboard;

