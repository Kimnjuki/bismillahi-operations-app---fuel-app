import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { RoleBadge } from '../components/RoleBadge';
import { Colors, Spacing, BorderRadius, Elevation, Typography } from '../constants/theme';

interface MoreMenuItem {
  title: string;
  subtitle: string;
  icon: string;
  screen?: string;
  onPress?: () => void;
  color: string;
  requiredRole: string;
}

export default function MoreScreen() {
  const { appUser, hasPermission, signOut } = useAuth();
  const navigation = useNavigation();
  const role = appUser?.role || 'viewer';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const menuSections: Array<{ title: string; items: MoreMenuItem[] }> = [
    {
      title: 'Reports & Analytics',
      items: [
        { title: 'Reports', subtitle: 'Generate and view reports', icon: 'chart-bar', screen: 'Reports', color: Colors.semantic.info, requiredRole: 'viewer' },
        { title: 'Analytics', subtitle: 'Charts & data insights', icon: 'chart-line', screen: 'Analytics', color: Colors.semantic.warning, requiredRole: 'viewer' },
        { title: 'Daily Report', subtitle: 'Consolidated daily report', icon: 'clipboard-text', screen: 'DailyConsolidatedReport', color: Colors.brand.primary, requiredRole: 'viewer' },
      ],
    },
    {
      title: 'Administration',
      items: [
        { title: 'User Management', subtitle: 'Manage users & roles', icon: 'account-group', screen: 'UserManagement', color: Colors.semantic.success, requiredRole: 'manager' },
        { title: 'Station Settings', subtitle: 'Configure stations', icon: 'cog-outline', screen: 'StationSettings', color: Colors.brand.primary, requiredRole: 'admin' },
        { title: 'Security', subtitle: 'Security center & audit', icon: 'shield-lock', screen: 'Security', color: Colors.semantic.danger, requiredRole: 'admin' },
        { title: 'Activity Log', subtitle: 'System activity logs', icon: 'format-list-bulleted', screen: 'LoggingDashboard', color: Colors.neutral['400'], requiredRole: 'admin' },
      ],
    },
    {
      title: 'System',
      items: [
        { title: 'Notifications', subtitle: 'View all notifications', icon: 'bell-outline', screen: 'Notifications', color: Colors.semantic.danger, requiredRole: 'viewer' },
        { title: 'Settings', subtitle: 'App preferences', icon: 'cog-outline', screen: 'Settings', color: Colors.neutral['400'], requiredRole: 'admin' },
        { title: 'Help & Support', subtitle: 'Guides & FAQ', icon: 'help-circle-outline', screen: 'Help', color: Colors.semantic.info, requiredRole: 'viewer' },
        { title: 'About', subtitle: 'App version & info', icon: 'information-outline', screen: 'Onboarding', color: Colors.semantic.warning, requiredRole: 'viewer' },
      ],
    },
  ];

  const handlePress = (item: MoreMenuItem) => {
    if (!hasPermission(item.requiredRole)) return;
    if (item.screen) {
      (navigation as any).navigate(item.screen);
    } else if (item.onPress) {
      item.onPress();
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>More</Text>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <MaterialCommunityIcons name="account" size={32} color={Colors.brand.primary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{appUser?.full_name || 'User'}</Text>
              <RoleBadge role={role as 'admin' | 'manager' | 'cashier' | 'viewer'} />
            </View>
            <TouchableOpacity style={styles.signOutSmall} onPress={handleSignOut}>
              <MaterialCommunityIcons name="logout" size={20} color={Colors.semantic.danger} />
            </TouchableOpacity>
          </View>

          {/* Menu Sections */}
          {menuSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.items.map((item, itemIndex) => {
                const canAccess = hasPermission(item.requiredRole);
                if (!canAccess) return null;
                return (
                  <TouchableOpacity key={itemIndex} style={styles.menuItem} onPress={() => handlePress(item)} activeOpacity={0.7}>
                    <View style={[styles.menuIconContainer, { backgroundColor: item.color + '20' }]}>
                      <MaterialCommunityIcons name={item.icon as any} size={22} color={item.color} />
                    </View>
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemTitle}>{item.title}</Text>
                      <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.neutral['500']} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Sign Out */}
          <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut} activeOpacity={0.7}>
            <MaterialCommunityIcons name="logout" size={22} color={Colors.semantic.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          {/* Version */}
          <Text style={styles.versionText}>Fuelr v1.0</Text>
          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.app },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  header: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  headerTitle: { fontSize: Typography.scale['2xl'], fontFamily: Typography.fontFamily.display, color: Colors.white },

  // Profile
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.card, borderRadius: BorderRadius.lg, marginHorizontal: Spacing.screenPadding, marginBottom: Spacing.xl, padding: Spacing.base, ...Elevation.sm },
  avatarContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.brand.primarySurface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.brand.primary + '30' },
  profileInfo: { flex: 1, marginLeft: Spacing.md, gap: 4 },
  profileName: { fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.display, color: Colors.white },
  signOutSmall: { padding: Spacing.sm },

  // Section
  section: { marginBottom: Spacing.xl, paddingHorizontal: Spacing.screenPadding },
  sectionTitle: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.semibold, color: Colors.neutral['500'], textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: Spacing.sm },

  // Menu Items
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.card, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, ...Elevation.sm },
  menuIconContainer: { width: 42, height: 42, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
  menuItemContent: { flex: 1, marginLeft: Spacing.md },
  menuItemTitle: { fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.medium, color: Colors.white },
  menuItemSubtitle: { fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.body, color: Colors.neutral['500'], marginTop: 2 },

  // Sign Out
  signOutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.base, marginHorizontal: Spacing.screenPadding, backgroundColor: Colors.semantic.dangerSurface, borderRadius: BorderRadius.md, marginBottom: Spacing.base },
  signOutText: { fontSize: Typography.scale.base, fontFamily: Typography.fontFamily.semibold, color: Colors.semantic.danger, marginLeft: Spacing.sm },

  // Version
  versionText: { textAlign: 'center', fontSize: Typography.scale.xs, fontFamily: Typography.fontFamily.body, color: Colors.neutral['600'], marginTop: Spacing.sm },
});