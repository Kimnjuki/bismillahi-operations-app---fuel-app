import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen() {
  const { appUser, signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    autoSync: true,
    biometricAuth: false,
    soundEffects: true,
    dataBackup: true,
    locationServices: false,
    analytics: true,
  });

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
      console.error('Logout error:', error);
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: handleLogout,
        },
      ]
    );
  };

  const toggleSetting = (key: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle: string,
    settingKey: string,
    hasSwitch = false
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingItemLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.settingItemRight}>
        {hasSwitch ? (
          <Switch
            value={settings[settingKey as keyof typeof settings] as boolean}
            onValueChange={() => toggleSetting(settingKey)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={settings[settingKey as keyof typeof settings] ? '#f5dd4b' : '#f4f3f4'}
          />
        ) : (
          <Text style={styles.settingArrow}>›</Text>
        )}
      </View>
    </View>
  );

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Manage your preferences</Text>
          </View>

          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileCard}>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{appUser?.full_name || 'User'}</Text>
                <Text style={styles.profileRole}>{appUser?.role?.toUpperCase() || 'USER'}</Text>
              </View>
            </View>
          </View>

          {/* General Settings */}
          <View style={styles.settingsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>General</Text>
            </View>
            <View style={styles.settingsGroup}>
              {renderSettingItem('🔔', 'Notifications', 'Push and in-app notifications', 'notifications', true)}
              {renderSettingItem('🌙', 'Dark Mode', 'Switch to dark theme', 'darkMode', true)}
              {renderSettingItem('🔄', 'Auto Sync', 'Automatically sync data', 'autoSync', true)}
              {renderSettingItem('🔊', 'Sound Effects', 'Play sound effects', 'soundEffects', true)}
            </View>
          </View>

          {/* Security Settings */}
          <View style={styles.settingsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Security</Text>
            </View>
            <View style={styles.settingsGroup}>
              {renderSettingItem('🔐', 'Biometric Auth', 'Use fingerprint or face ID', 'biometricAuth', true)}
              {renderSettingItem('💾', 'Data Backup', 'Backup data to cloud', 'dataBackup', true)}
            </View>
          </View>

          {/* Privacy Settings */}
          <View style={styles.settingsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Privacy</Text>
            </View>
            <View style={styles.settingsGroup}>
              {renderSettingItem('📍', 'Location Services', 'Allow location access', 'locationServices', true)}
              {renderSettingItem('📊', 'Analytics', 'Help improve the app', 'analytics', true)}
            </View>
          </View>

          {/* Sign Out Section */}
          <View style={styles.signOutSection}>
            <TouchableOpacity style={styles.signOutButton} onPress={confirmLogout}>
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Bismillahi Operations v1.0.0</Text>
            <Text style={styles.footerText}>© 2024 All rights reserved</Text>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  profileSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    letterSpacing: 1,
  },
  settingsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  settingsGroup: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  settingItemRight: {
    marginLeft: 12,
  },
  settingArrow: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  signOutSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  signOutButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  signOutButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginBottom: 5,
  },
  bottomSpacing: {
    height: 20,
  },
});