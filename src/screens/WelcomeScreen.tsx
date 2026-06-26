import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  background: '#131313',
  surface: '#1E1E1E',
  surfaceContainer: '#201f1f',
  surfaceContainerHigh: '#2a2a2a',
  surfaceContainerLow: '#1c1b1b',
  surfaceVariant: '#353534',
  primary: '#ffd79b',
  primaryContainer: '#ffb300',
  onPrimaryContainer: '#6b4900',
  onBackground: '#e5e2e1',
  onSurface: '#e5e2e1',
  onSurfaceVariant: '#d6c4ac',
  outline: '#9e8e78',
  outlineVariant: '#514532',
  secondary: '#d7ffc5',
  secondaryContainer: '#2ff801',
  onSecondary: '#022100',
};

export default function WelcomeScreen() {
  const { appUser, signOut } = useAuth();
  const navigation = useNavigation();

  React.useEffect(() => {
    if (!appUser) {
      (navigation as any).navigate('Auth');
    }
  }, [appUser]);

  const handleSignOut = async () => {
    await signOut();
  };

  // Logged in user - show welcome info
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return COLORS.primaryContainer;
      case 'manager': return COLORS.secondaryContainer;
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
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.iconOuterRing}>
            <View style={styles.iconInnerRing}>
              <View style={styles.iconGlassContainer}>
                <Ionicons
                  name="person-outline"
                  size={64}
                  color={COLORS.primaryContainer}
                />
              </View>
            </View>
          </View>

          <Text style={styles.title}>Welcome,</Text>
          <Text style={styles.userName}>{appUser?.full_name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(appUser?.role || 'viewer') }]}>
            <Text style={styles.roleText}>{appUser?.role?.toUpperCase()}</Text>
          </View>

          {/* Permissions */}
          <View style={styles.permissionsContainer}>
            <Text style={styles.permissionsTitle}>Your Permissions:</Text>
            {getRolePermissions(appUser?.role || 'viewer').map((permission, index) => (
              <View key={index} style={styles.permissionItem}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.secondary} />
                <Text style={styles.permissionText}>{permission}</Text>
              </View>
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Main' as never)}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.onPrimaryContainer} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSignOut}
            >
              <Text style={styles.secondaryButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.systemInfoText}>
            Fuelr v1.0
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconOuterRing: {
    width: 192,
    height: 192,
    borderRadius: 96,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconInnerRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    opacity: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlassContainer: {
    width: 128,
    height: 128,
    borderRadius: 24,
    backgroundColor: 'rgba(30, 30, 30, 0.6)',
    borderWidth: 1,
    borderColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.onBackground,
    letterSpacing: -0.56,
    textAlign: 'center',
    lineHeight: 34,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  roleBadge: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  roleText: {
    color: COLORS.onSecondary,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
    marginBottom: 32,
  },
  permissionsContainer: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainerHigh,
    padding: 16,
    marginBottom: 24,
  },
  permissionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  permissionText: {
    color: COLORS.onSurface,
    fontSize: 14,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    height: 56,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: COLORS.onPrimaryContainer,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  systemInfoText: {
    color: COLORS.outline,
    fontSize: 12,
    textAlign: 'center',
  },
});