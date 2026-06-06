import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function WelcomeScreen() {
  const { appUser, signOut } = useAuth();
  const navigation = useNavigation();

  const handleSignOut = async () => {
    await signOut();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#FF6B6B';
      case 'manager': return '#4ECDC4';
      case 'cashier': return '#45B7D1';
      case 'viewer': return '#96CEB4';
      default: return '#96CEB4';
    }
  };

  const getRolePermissions = (role: string) => {
    switch (role) {
      case 'admin':
        return ['Full System Access', 'User Management', 'All Reports', 'System Settings'];
      case 'manager':
        return ['Sales Management', 'Stock Management', 'Expense Management', 'Reports'];
      case 'cashier':
        return ['Sales Entry', 'Basic Stock View', 'Expense Entry'];
      case 'viewer':
        return ['View Reports', 'View Sales', 'View Stock'];
      default:
        return ['Limited Access'];
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome,</Text>
            <Text style={styles.userName}>{appUser?.full_name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(appUser?.role || 'viewer') }]}>
              <Text style={styles.roleText}>{appUser?.role?.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.permissionsContainer}>
            <Text style={styles.permissionsTitle}>Your Permissions:</Text>
            {getRolePermissions(appUser?.role || 'viewer').map((permission, index) => (
              <View key={index} style={styles.permissionItem}>
                <Text style={styles.permissionText}>• {permission}</Text>
              </View>
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Dashboard' as never)}
            >
              <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSignOut}
            >
              <Text style={styles.secondaryButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.systemInfo}>
            <Text style={styles.systemInfoText}>
              Bismillahi Operations Management System v1.0
            </Text>
            <Text style={styles.systemInfoText}>
              Last updated: {new Date().toLocaleDateString()}
            </Text>
          </View>
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
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 5,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  roleBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  roleText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  permissionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  permissionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  permissionItem: {
    marginBottom: 8,
  },
  permissionText: {
    color: '#ffffff',
    fontSize: 16,
    opacity: 0.9,
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  systemInfo: {
    alignItems: 'center',
    opacity: 0.7,
  },
  systemInfoText: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 5,
  },
});

