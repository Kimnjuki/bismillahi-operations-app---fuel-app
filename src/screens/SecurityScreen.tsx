import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Button, List } from 'react-native-paper';
import { useSecurity } from '../context/SecurityContext';
import SecurityDashboard from '../components/SecurityDashboard';
import SecuritySettings from '../components/SecuritySettings';
import SecurityAuditLog from '../components/SecurityAuditLog';
import SecurityTest from '../components/SecurityTest';
import SecurityMonitoring from '../components/SecurityMonitoring';
import SecurityReport from '../components/SecurityReport';
import SecurityHelp from '../components/SecurityHelp';

// Security screen component
const SecurityScreen: React.FC = () => {
  const { securityLevel, isSecure } = useSecurity();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings' | 'audit' | 'test' | 'monitoring' | 'report' | 'help'>('dashboard');

  const securityTabs = [
    { id: 'dashboard', title: 'Dashboard', icon: 'view-dashboard' },
    { id: 'settings', title: 'Settings', icon: 'cog' },
    { id: 'audit', title: 'Audit Log', icon: 'file-document' },
    { id: 'test', title: 'Security Test', icon: 'shield-check' },
    { id: 'monitoring', title: 'Monitoring', icon: 'monitor' },
    { id: 'report', title: 'Report', icon: 'chart-line' },
    { id: 'help', title: 'Help', icon: 'help-circle' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <SecurityDashboard />;
      case 'settings':
        return <SecuritySettings />;
      case 'audit':
        return <SecurityAuditLog />;
      case 'test':
        return <SecurityTest />;
      case 'monitoring':
        return <SecurityMonitoring />;
      case 'report':
        return <SecurityReport />;
      case 'help':
        return <SecurityHelp />;
      default:
        return <SecurityDashboard />;
    }
  };

  const getSecurityStatusColor = () => {
    switch (securityLevel) {
      case 'LOW': return '#4CAF50';
      case 'MEDIUM': return '#FF9800';
      case 'HIGH': return '#F44336';
      case 'CRITICAL': return '#9C27B0';
      default: return '#757575';
    }
  };

  const renderSecurityHeader = () => (
    <Card style={styles.headerCard}>
      <Card.Content>
        <Title>Security Center</Title>
        <View style={styles.securityStatus}>
          <View style={styles.statusIndicator}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getSecurityStatusColor() }
              ]}
            />
            <Title style={[styles.statusText, { color: getSecurityStatusColor() }]}>
              {isSecure ? 'Secure' : 'At Risk'}
            </Title>
          </View>
          <Title style={styles.securityLevel}>{securityLevel}</Title>
        </View>
      </Card.Content>
    </Card>
  );

  const renderTabNavigation = () => (
    <Card style={styles.tabCard}>
      <Card.Content>
        <Title>Security Tools</Title>
        <List.Section>
          {securityTabs.map((tab) => (
            <List.Item
              key={tab.id}
              title={tab.title}
              left={() => (
                <List.Icon
                  icon={tab.icon}
                  color={activeTab === tab.id ? '#2196F3' : '#666'}
                />
              )}
              onPress={() => setActiveTab(tab.id as any)}
              style={[
                styles.tabItem,
                activeTab === tab.id && styles.activeTabItem
              ]}
              titleStyle={[
                styles.tabTitle,
                activeTab === tab.id && styles.activeTabTitle
              ]}
            />
          ))}
        </List.Section>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {renderSecurityHeader()}
      {renderTabNavigation()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  securityStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  securityLevel: {
    fontSize: 16,
    color: '#666',
  },
  tabCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  tabItem: {
    borderRadius: 8,
    marginVertical: 2,
  },
  activeTabItem: {
    backgroundColor: '#E3F2FD',
  },
  tabTitle: {
    fontSize: 16,
  },
  activeTabTitle: {
    color: '#2196F3',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});

export default SecurityScreen;

