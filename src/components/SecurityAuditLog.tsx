import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, List, IconButton, Searchbar } from 'react-native-paper';
import { useSecurity, SecurityEvent } from '../context/SecurityContext';
import { secureApiService } from '../services/secureApiService';

// Security audit log component
const SecurityAuditLog: React.FC = () => {
  const { securityEvents, getSecurityEvents } = useSecurity();
  
  // Local state
  const [filteredEvents, setFilteredEvents] = useState<SecurityEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  // Severity options
  const severityOptions = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  
  // Event type options
  const eventTypeOptions = [
    'ALL',
    'SECURITY_CHECK',
    'SECURITY_VIOLATION',
    'PERMISSION_DENIED',
    'DATA_ACCESS',
    'AUTHENTICATION',
    'SECURITY_ISSUE_REPORTED',
  ];

  // Load security events on mount
  useEffect(() => {
    loadSecurityEvents();
  }, []);

  // Filter events when search query or filters change
  useEffect(() => {
    filterEvents();
  }, [securityEvents, searchQuery, selectedSeverity, selectedEventType]);

  const loadSecurityEvents = async () => {
    setIsLoading(true);
    try {
      await getSecurityEvents();
    } catch (error) {
      console.error('Failed to load security events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...securityEvents];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.eventType.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.severity.toLowerCase().includes(query)
      );
    }

    // Filter by severity
    if (selectedSeverity !== 'ALL') {
      filtered = filtered.filter(event => event.severity === selectedSeverity);
    }

    // Filter by event type
    if (selectedEventType !== 'ALL') {
      filtered = filtered.filter(event => event.eventType === selectedEventType);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setFilteredEvents(filtered);
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

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'SECURITY_CHECK': return 'shield-check';
      case 'SECURITY_VIOLATION': return 'shield-alert';
      case 'PERMISSION_DENIED': return 'lock-alert';
      case 'DATA_ACCESS': return 'database';
      case 'AUTHENTICATION': return 'account-key';
      case 'SECURITY_ISSUE_REPORTED': return 'alert-circle';
      default: return 'information';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderFilters = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Filters</Title>
        
        {/* Search bar */}
        <Searchbar
          placeholder="Search events..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        {/* Severity filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Severity:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
            {severityOptions.map((severity) => (
              <Chip
                key={severity}
                selected={selectedSeverity === severity}
                onPress={() => setSelectedSeverity(severity)}
                style={[
                  styles.filterChip,
                  selectedSeverity === severity && { backgroundColor: '#2196F3' }
                ]}
                textStyle={selectedSeverity === severity ? { color: 'white' } : {}}
              >
                {severity}
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* Event type filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Event Type:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
            {eventTypeOptions.map((eventType) => (
              <Chip
                key={eventType}
                selected={selectedEventType === eventType}
                onPress={() => setSelectedEventType(eventType)}
                style={[
                  styles.filterChip,
                  selectedEventType === eventType && { backgroundColor: '#2196F3' }
                ]}
                textStyle={selectedEventType === eventType ? { color: 'white' } : {}}
              >
                {eventType}
              </Chip>
            ))}
          </ScrollView>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEventList = () => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.eventsHeader}>
          <Title>Security Events ({filteredEvents.length})</Title>
          <IconButton
            icon="refresh"
            size={20}
            onPress={loadSecurityEvents}
            disabled={isLoading}
          />
        </View>
        
        {filteredEvents.length === 0 ? (
          <Paragraph>No security events found matching your criteria</Paragraph>
        ) : (
          <ScrollView 
            style={styles.eventsList} 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={loadSecurityEvents}
              />
            }
          >
            {filteredEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventItem}
                onPress={() => setSelectedEvent(event)}
              >
                <View style={styles.eventHeader}>
                  <View style={styles.eventTypeContainer}>
                    <IconButton
                      icon={getEventTypeIcon(event.eventType)}
                      size={20}
                      iconColor={getSeverityColor(event.severity)}
                    />
                    <Text style={styles.eventType}>{event.eventType}</Text>
                  </View>
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
            <Text style={styles.eventDetailLabel}>Event ID:</Text>
            <Text style={styles.eventDetailValue}>{selectedEvent.id}</Text>
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

  const renderSummary = () => {
    const totalEvents = securityEvents.length;
    const criticalEvents = securityEvents.filter(e => e.severity === 'CRITICAL').length;
    const highEvents = securityEvents.filter(e => e.severity === 'HIGH').length;
    const mediumEvents = securityEvents.filter(e => e.severity === 'MEDIUM').length;
    const lowEvents = securityEvents.filter(e => e.severity === 'LOW').length;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title>Event Summary</Title>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalEvents}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: getSeverityColor('CRITICAL') }]}>
                {criticalEvents}
              </Text>
              <Text style={styles.summaryLabel}>Critical</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: getSeverityColor('HIGH') }]}>
                {highEvents}
              </Text>
              <Text style={styles.summaryLabel}>High</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: getSeverityColor('MEDIUM') }]}>
                {mediumEvents}
              </Text>
              <Text style={styles.summaryLabel}>Medium</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: getSeverityColor('LOW') }]}>
                {lowEvents}
              </Text>
              <Text style={styles.summaryLabel}>Low</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderSummary()}
      {renderFilters()}
      {renderEventList()}
      {renderEventDetails()}
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
  searchBar: {
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: 'row',
  },
  filterChip: {
    marginRight: 8,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventsList: {
    maxHeight: 400,
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
  eventTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    width: '18%',
    marginBottom: 16,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default SecurityAuditLog;

