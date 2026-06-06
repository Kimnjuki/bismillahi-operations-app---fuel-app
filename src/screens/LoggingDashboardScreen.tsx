import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  FlatList,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { loggingService, LogEntry, AnalyticsEvent, PerformanceMetric } from '../services/loggingService';

export default function LoggingDashboardScreen() {
  const { appUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'logs' | 'analytics' | 'performance'>('logs');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsEvent[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const logLevels = [
    { key: 'all', label: 'All Levels', color: '#607D8B' },
    { key: 'debug', label: 'Debug', color: '#9E9E9E' },
    { key: 'info', label: 'Info', color: '#2196F3' },
    { key: 'warn', label: 'Warning', color: '#FF9800' },
    { key: 'error', label: 'Error', color: '#F44336' },
    { key: 'fatal', label: 'Fatal', color: '#E91E63' },
  ];

  const logCategories = [
    { key: 'all', label: 'All Categories' },
    { key: 'auth', label: 'Authentication' },
    { key: 'sales', label: 'Sales' },
    { key: 'stock', label: 'Stock' },
    { key: 'expense', label: 'Expense' },
    { key: 'user', label: 'User' },
    { key: 'system', label: 'System' },
    { key: 'security', label: 'Security' },
    { key: 'performance', label: 'Performance' },
  ];

  useEffect(() => {
    loadData();
  }, [activeTab, filterLevel, filterCategory]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'logs':
          const logsData = await loggingService.getLogs(200);
          let filteredLogs = logsData;
          
          if (filterLevel !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.level === filterLevel);
          }
          if (filterCategory !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.category === filterCategory);
          }
          
          setLogs(filteredLogs);
          break;
        case 'analytics':
          const analyticsData = await loggingService.getAnalytics(200);
          setAnalytics(analyticsData);
          break;
        case 'performance':
          const performanceData = await loggingService.getPerformanceMetrics(200);
          setPerformance(performanceData);
          break;
      }
    } catch (error) {
      console.error('Load data error:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all logging data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await loggingService.clearAllData();
              await loadData();
              Alert.alert('Success', 'All logging data has been cleared');
            } catch (error) {
              console.error('Clear data error:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const data = await loggingService.exportData();
      // In a real app, you would implement actual export functionality
      Alert.alert('Export Data', `Exported ${data.logs.length} logs, ${data.analytics.length} analytics events, and ${data.performance.length} performance metrics`);
    } catch (error) {
      console.error('Export data error:', error);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleSyncData = async () => {
    try {
      await loggingService.syncAllData();
      await loadData();
      Alert.alert('Success', 'Data synchronized successfully');
    } catch (error) {
      console.error('Sync data error:', error);
      Alert.alert('Error', 'Failed to sync data');
    }
  };

  const renderLogItem = ({ item }: { item: LogEntry }) => (
    <TouchableOpacity
      style={[styles.logItem, { borderLeftColor: getLogLevelColor(item.level) }]}
      onPress={() => {
        setSelectedLog(item);
        setShowLogModal(true);
      }}
    >
      <View style={styles.logHeader}>
        <Text style={styles.logLevel}>{item.level.toUpperCase()}</Text>
        <Text style={styles.logCategory}>{item.category}</Text>
        <Text style={styles.logTime}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
      <Text style={styles.logMessage} numberOfLines={2}>
        {item.message}
      </Text>
      {item.data && (
        <Text style={styles.logData} numberOfLines={1}>
          Data: {JSON.stringify(item.data).substring(0, 50)}...
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderAnalyticsItem = ({ item }: { item: AnalyticsEvent }) => (
    <View style={styles.analyticsItem}>
      <View style={styles.analyticsHeader}>
        <Text style={styles.analyticsEvent}>{item.event}</Text>
        <Text style={styles.analyticsTime}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
      {item.screen && (
        <Text style={styles.analyticsScreen}>Screen: {item.screen}</Text>
      )}
      {item.action && (
        <Text style={styles.analyticsAction}>Action: {item.action}</Text>
      )}
      {Object.keys(item.properties).length > 0 && (
        <Text style={styles.analyticsProperties} numberOfLines={2}>
          Properties: {JSON.stringify(item.properties).substring(0, 100)}...
        </Text>
      )}
    </View>
  );

  const renderPerformanceItem = ({ item }: { item: PerformanceMetric }) => (
    <View style={styles.performanceItem}>
      <View style={styles.performanceHeader}>
        <Text style={styles.performanceMetric}>{item.metric}</Text>
        <Text style={styles.performanceValue}>
          {item.value} {item.unit}
        </Text>
        <Text style={styles.performanceTime}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
      {item.context && Object.keys(item.context).length > 0 && (
        <Text style={styles.performanceContext} numberOfLines={2}>
          Context: {JSON.stringify(item.context).substring(0, 100)}...
        </Text>
      )}
    </View>
  );

  const renderLogModal = () => (
    <Modal
      visible={showLogModal}
      transparent
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Log Details</Text>
          
          {selectedLog && (
            <ScrollView style={styles.logDetails}>
              <View style={styles.logDetailSection}>
                <Text style={styles.logDetailLabel}>Level:</Text>
                <Text style={[styles.logDetailValue, { color: getLogLevelColor(selectedLog.level) }]}>
                  {selectedLog.level.toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.logDetailSection}>
                <Text style={styles.logDetailLabel}>Category:</Text>
                <Text style={styles.logDetailValue}>{selectedLog.category}</Text>
              </View>
              
              <View style={styles.logDetailSection}>
                <Text style={styles.logDetailLabel}>Timestamp:</Text>
                <Text style={styles.logDetailValue}>
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </Text>
              </View>
              
              <View style={styles.logDetailSection}>
                <Text style={styles.logDetailLabel}>Message:</Text>
                <Text style={styles.logDetailValue}>{selectedLog.message}</Text>
              </View>
              
              {selectedLog.data && (
                <View style={styles.logDetailSection}>
                  <Text style={styles.logDetailLabel}>Data:</Text>
                  <Text style={styles.logDetailValue}>
                    {JSON.stringify(selectedLog.data, null, 2)}
                  </Text>
                </View>
              )}
              
              {selectedLog.stackTrace && (
                <View style={styles.logDetailSection}>
                  <Text style={styles.logDetailLabel}>Stack Trace:</Text>
                  <Text style={styles.logDetailValue}>{selectedLog.stackTrace}</Text>
                </View>
              )}
            </ScrollView>
          )}
          
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowLogModal(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const getLogLevelColor = (level: string): string => {
    const levelObj = logLevels.find(l => l.key === level);
    return levelObj?.color || '#607D8B';
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'logs':
        return (
          <>
            <View style={styles.filtersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterButtons}>
                  {logLevels.map((level) => (
                    <TouchableOpacity
                      key={level.key}
                      style={[
                        styles.filterButton,
                        { backgroundColor: level.color },
                        filterLevel === level.key && styles.activeFilterButton,
                      ]}
                      onPress={() => setFilterLevel(level.key)}
                    >
                      <Text style={[
                        styles.filterButtonText,
                        filterLevel === level.key && styles.activeFilterButtonText,
                      ]}>
                        {level.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterButtons}>
                  {logCategories.map((category) => (
                    <TouchableOpacity
                      key={category.key}
                      style={[
                        styles.filterButton,
                        filterCategory === category.key && styles.activeFilterButton,
                      ]}
                      onPress={() => setFilterCategory(category.key)}
                    >
                      <Text style={[
                        styles.filterButtonText,
                        filterCategory === category.key && styles.activeFilterButtonText,
                      ]}>
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            
            <FlatList
              data={logs}
              renderItem={renderLogItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          </>
        );
      
      case 'analytics':
        return (
          <FlatList
            data={analytics}
            renderItem={renderAnalyticsItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        );
      
      case 'performance':
        return (
          <FlatList
            data={performance}
            renderItem={renderPerformanceItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Logging Dashboard</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSyncData}
            >
              <Text style={styles.actionButtonText}>Sync</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleExportData}
            >
              <Text style={styles.actionButtonText}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={handleClearData}
            >
              <Text style={styles.actionButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabContainer}>
          {(['logs', 'analytics', 'performance'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>
          {renderTabContent()}
        </View>

        {renderLogModal()}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 10,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#ffffff',
  },
  tabText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  filtersContainer: {
    marginBottom: 15,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeFilterButton: {
    backgroundColor: '#ffffff',
  },
  filterButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 20,
  },
  logItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logLevel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logCategory: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
  },
  logTime: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.6,
  },
  logMessage: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 5,
  },
  logData: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.7,
  },
  analyticsItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  analyticsEvent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  analyticsTime: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.6,
  },
  analyticsScreen: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    marginBottom: 2,
  },
  analyticsAction: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    marginBottom: 5,
  },
  analyticsProperties: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.7,
  },
  performanceItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceMetric: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  performanceValue: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  performanceTime: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.6,
  },
  performanceContext: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  logDetails: {
    maxHeight: 400,
  },
  logDetailSection: {
    marginBottom: 15,
  },
  logDetailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  logDetailValue: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: '#667eea',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
