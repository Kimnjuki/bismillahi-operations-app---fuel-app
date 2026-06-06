import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, List, Switch as PaperSwitch } from 'react-native-paper';
import { useSecurity } from '../context/SecurityContext';
import { securityService } from '../services/securityService';

// Security settings component
const SecuritySettings: React.FC = () => {
  const { performSecurityCheck, reportSecurityIssue } = useSecurity();
  
  // Security settings state
  const [settings, setSettings] = useState({
    autoSecurityCheck: true,
    securityNotifications: true,
    strictValidation: true,
    rateLimiting: true,
    sessionTimeout: 30, // minutes
    maxLoginAttempts: 5,
    passwordExpiry: 90, // days
    twoFactorAuth: false,
    auditLogging: true,
    dataEncryption: true,
  });

  const [isLoading, setIsLoading] = useState(false);

  // Load security settings
  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      // Load settings from secure storage
      const savedSettings = await securityService.getSecuritySettings();
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error('Failed to load security settings:', error);
    }
  };

  const saveSecuritySettings = async () => {
    setIsLoading(true);
    try {
      await securityService.saveSecuritySettings(settings);
      Alert.alert('Success', 'Security settings saved successfully');
    } catch (error) {
      console.error('Failed to save security settings:', error);
      Alert.alert('Error', 'Failed to save security settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Security Settings',
      'Are you sure you want to reset all security settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setSettings({
              autoSecurityCheck: true,
              securityNotifications: true,
              strictValidation: true,
              rateLimiting: true,
              sessionTimeout: 30,
              maxLoginAttempts: 5,
              passwordExpiry: 90,
              twoFactorAuth: false,
              auditLogging: true,
              dataEncryption: true,
            });
          },
        },
      ]
    );
  };

  const handleTestSecurity = async () => {
    setIsLoading(true);
    try {
      await performSecurityCheck();
      Alert.alert('Success', 'Security test completed successfully');
    } catch (error) {
      console.error('Security test failed:', error);
      Alert.alert('Error', 'Security test failed');
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
              Alert.alert('Success', 'Security issue reported successfully');
            }
          },
        },
      ]
    );
  };

  const renderGeneralSettings = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>General Security</Title>
        <List.Item
          title="Auto Security Check"
          description="Automatically perform security checks every 5 minutes"
          right={() => (
            <PaperSwitch
              value={settings.autoSecurityCheck}
              onValueChange={(value) => handleSettingChange('autoSecurityCheck', value)}
            />
          )}
        />
        <List.Item
          title="Security Notifications"
          description="Receive notifications for security events"
          right={() => (
            <PaperSwitch
              value={settings.securityNotifications}
              onValueChange={(value) => handleSettingChange('securityNotifications', value)}
            />
          )}
        />
        <List.Item
          title="Strict Validation"
          description="Enable strict input validation and sanitization"
          right={() => (
            <PaperSwitch
              value={settings.strictValidation}
              onValueChange={(value) => handleSettingChange('strictValidation', value)}
            />
          )}
        />
        <List.Item
          title="Rate Limiting"
          description="Enable API rate limiting to prevent abuse"
          right={() => (
            <PaperSwitch
              value={settings.rateLimiting}
              onValueChange={(value) => handleSettingChange('rateLimiting', value)}
            />
          )}
        />
      </Card.Content>
    </Card>
  );

  const renderAuthenticationSettings = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Authentication Security</Title>
        <List.Item
          title="Session Timeout"
          description={`${settings.sessionTimeout} minutes`}
          right={() => (
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{settings.sessionTimeout}</Text>
            </View>
          )}
        />
        <List.Item
          title="Max Login Attempts"
          description={`${settings.maxLoginAttempts} attempts`}
          right={() => (
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{settings.maxLoginAttempts}</Text>
            </View>
          )}
        />
        <List.Item
          title="Password Expiry"
          description={`${settings.passwordExpiry} days`}
          right={() => (
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{settings.passwordExpiry}</Text>
            </View>
          )}
        />
        <List.Item
          title="Two-Factor Authentication"
          description="Enable 2FA for enhanced security"
          right={() => (
            <PaperSwitch
              value={settings.twoFactorAuth}
              onValueChange={(value) => handleSettingChange('twoFactorAuth', value)}
            />
          )}
        />
      </Card.Content>
    </Card>
  );

  const renderDataSecuritySettings = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Data Security</Title>
        <List.Item
          title="Audit Logging"
          description="Log all security events and user actions"
          right={() => (
            <PaperSwitch
              value={settings.auditLogging}
              onValueChange={(value) => handleSettingChange('auditLogging', value)}
            />
          )}
        />
        <List.Item
          title="Data Encryption"
          description="Encrypt sensitive data at rest"
          right={() => (
            <PaperSwitch
              value={settings.dataEncryption}
              onValueChange={(value) => handleSettingChange('dataEncryption', value)}
            />
          )}
        />
      </Card.Content>
    </Card>
  );

  const renderSecurityActions = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Security Actions</Title>
        <Button
          mode="contained"
          onPress={handleTestSecurity}
          loading={isLoading}
          style={styles.actionButton}
        >
          Test Security
        </Button>
        <Button
          mode="outlined"
          onPress={handleReportIssue}
          style={styles.actionButton}
        >
          Report Security Issue
        </Button>
        <Button
          mode="outlined"
          onPress={handleResetSettings}
          style={styles.actionButton}
        >
          Reset to Defaults
        </Button>
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderGeneralSettings()}
      {renderAuthenticationSettings()}
      {renderDataSecuritySettings()}
      {renderSecurityActions()}
      
      <Card style={styles.card}>
        <Card.Content>
          <Title>Save Settings</Title>
          <Paragraph>
            Make sure to save your security settings to apply the changes.
          </Paragraph>
          <Button
            mode="contained"
            onPress={saveSecuritySettings}
            loading={isLoading}
            style={styles.saveButton}
          >
            Save Security Settings
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
  sliderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2196F3',
  },
  actionButton: {
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 16,
  },
});

export default SecuritySettings;

