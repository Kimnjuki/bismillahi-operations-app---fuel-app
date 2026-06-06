import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SecurityProvider } from './src/context/SecurityContext';
import { syncService } from './src/services/syncService';
import { notificationService } from './src/services/notificationService';
import { loggingService } from './src/services/loggingService';

// Screens
import SplashScreenComponent from './src/screens/SplashScreen';
import WelcomeOnboardingScreen from './src/screens/WelcomeOnboardingScreen';
import PinLoginScreen from './src/screens/PinLoginScreen';
import PinSetupScreen from './src/screens/PinSetupScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SalesEntryScreen from './src/screens/SalesEntryScreen';
import SalesReceiptScreen from './src/screens/SalesReceiptScreen';
import UnifiedSalesReceiptScreen from './src/screens/UnifiedSalesReceiptScreen';
import StockManagementScreen from './src/screens/StockManagementScreen';
import ExpenseScreen from './src/screens/ExpenseScreen';
import ExpenseHomepageScreen from './src/screens/ExpenseHomepageScreen';
import ExpenseHistoryScreen from './src/screens/ExpenseHistoryScreen';
import ExpenseOnboardingScreen from './src/screens/ExpenseOnboardingScreen';
import ExpenseEntryScreen from './src/screens/ExpenseEntryScreen';
import DailyConsolidatedReportScreen from './src/screens/DailyConsolidatedReportScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import FundTransferScreen from './src/screens/FundTransferScreen';
import NewTransferScreen from './src/screens/NewTransferScreen';
import ExchangeRateScreen from './src/screens/ExchangeRateScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';
import AdminUserManagementScreen from './src/screens/AdminUserManagementScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SecurityScreen from './src/screens/SecurityScreen';
import AssetManagementScreen from './src/screens/AssetManagementScreen';
import HelpScreen from './src/screens/HelpScreen';
import HelpTopicDetailScreen from './src/screens/HelpTopicDetailScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoggingDashboardScreen from './src/screens/LoggingDashboardScreen';
import AccountsScreen from './src/screens/AccountsScreen';
import AccountsManagementScreen from './src/screens/AccountsManagementScreen';
import OperationalAccountsScreen from './src/screens/OperationalAccountsScreen';
import AccountReceivablesScreen from './src/screens/AccountReceivablesScreen';
import AccountPayablesScreen from './src/screens/AccountPayablesScreen';
import AccountReceivablesHistoryScreen from './src/screens/AccountReceivablesHistoryScreen';
import AccountPayablesHistoryScreen from './src/screens/AccountPayablesHistoryScreen';
import AddAccountScreen from './src/screens/AddAccountScreen';
import CreditorsSuppliersScreen from './src/screens/CreditorsSuppliersScreen';
import AddCreditorSupplierScreen from './src/screens/AddCreditorSupplierScreen';
import StationSettingsScreen from './src/screens/StationSettingsScreen';
import PumpManagementScreen from './src/screens/PumpManagementScreen';
import AddPumpScreen from './src/screens/AddPumpScreen';
import PumpDippingManagementScreen from './src/screens/PumpDippingManagementScreen';
import FuelDeliveryScreen from './src/screens/FuelDeliveryScreen';
import TransporterManagementScreen from './src/screens/TransporterManagementScreen';
import TaxPaymentScreen from './src/screens/TaxPaymentScreen';
import TruckTransactionHistoryScreen from './src/screens/TruckTransactionHistoryScreen';
import AddTransporterScreen from './src/screens/AddTransporterScreen';

// Keep splash screen visible while we fetch resources
ExpoSplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

// Loading component with logo matching SplashScreen
const LoadingScreen = () => (
  <LinearGradient colors={['#312C51', '#48426D']} style={styles.gradient}>
    <View style={styles.centerContent}>
      <View style={styles.logoCircle}>
        <View style={styles.logoIcon}>
          <View style={styles.iconVerticalLine} />
          <View style={styles.iconCenterCircle} />
          <View style={styles.iconTopLine} />
          <View style={styles.iconBottomLine} />
        </View>
      </View>
      <Text style={styles.appName}>BISMILLAHI OPERATIONS</Text>
      <Text style={styles.tagline}>Your Fuel Station Management Solution</Text>
    </View>
  </LinearGradient>
);

// Navigation component that handles auth state
function AppNavigation() {
  const { appUser, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="PinLogin"
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          animation: 'slide_from_right',
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen
              name="PinLogin"
              component={PinLoginScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen
              name="PinSetup"
              component={PinSetupScreen}
              options={{
                title: 'Setup PIN',
                headerShown: true,
                headerStyle: { backgroundColor: '#667eea' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
          </>
        ) : !appUser ? (
          <Stack.Screen name="Loading" component={LoadingScreen} />
        ) : (
          <>
            <Stack.Screen
              name="WelcomeOnboarding"
              component={WelcomeOnboardingScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen 
              name="Welcome" 
              component={WelcomeScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen}
              options={{ 
                gestureEnabled: false,
                title: 'Dashboard',
                headerShown: true,
                headerStyle: { backgroundColor: '#667eea' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen
              name="Expense"
              component={ExpenseScreen}
              options={{
                title: 'Expense Management',
                headerShown: true,
                headerStyle: { backgroundColor: '#312C51' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen
              name="ExpenseHomepage"
              component={ExpenseHomepageScreen}
              options={{ title: 'Expenses', headerShown: false }}
            />
            <Stack.Screen
              name="ExpenseHistory"
              component={ExpenseHistoryScreen}
              options={{ title: 'Expense History', headerShown: false }}
            />
            <Stack.Screen
              name="ExpenseEntry"
              component={ExpenseEntryScreen}
              options={{ title: 'Add Expenses', headerShown: false }}
            />
            <Stack.Screen
              name="ExpenseOnboarding"
              component={ExpenseOnboardingScreen}
              options={{ title: 'Expense Onboarding', headerShown: false }}
            />
            <Stack.Screen
              name="DailyConsolidatedReport"
              component={DailyConsolidatedReportScreen}
              options={{ title: 'Daily Consolidated Report', headerShown: false }}
            />
            <Stack.Screen
              name="Analytics"
              component={AnalyticsScreen}
              options={{ title: 'Analytics', headerShown: false }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ title: 'Notifications', headerShown: false }}
            />
            <Stack.Screen 
              name="UserManagement" 
              component={UserManagementScreen}
              options={{ 
                title: 'User Management',
                headerShown: true,
                headerStyle: { backgroundColor: '#667eea' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen 
              name="AdminUserManagement" 
              component={AdminUserManagementScreen}
              options={{ 
                title: 'Admin User Management',
                headerShown: true,
                headerStyle: { backgroundColor: '#667eea' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen
              name="SalesEntry"
              component={SalesEntryScreen}
              options={{
                title: 'Sales Management',
                headerShown: true,
                headerStyle: { backgroundColor: '#312C51' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen
              name="SalesReceipt"
              component={UnifiedSalesReceiptScreen}
              options={{ title: 'Unified Sales Receipt', headerShown: false }}
            />
            <Stack.Screen 
              name="StockManagement" 
              component={StockManagementScreen}
              options={{ 
                title: 'Stock Management',
                headerShown: true,
                headerStyle: { backgroundColor: '#667eea' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen 
              name="FundTransfer" 
              component={FundTransferScreen}
              options={{ 
                title: 'Fund Transfer',
                headerShown: true,
                headerStyle: { backgroundColor: '#667eea' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen 
              name="NewTransfer" 
              component={NewTransferScreen}
              options={{ title: 'Transfer Funds', headerShown: false }}
            />
            <Stack.Screen 
              name="ExchangeRate" 
              component={ExchangeRateScreen}
              options={{ 
                title: 'Exchange Rate',
                headerShown: true,
                headerStyle: { backgroundColor: '#667eea' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen 
              name="Reports" 
              component={ReportsScreen}
              options={{ 
                title: 'Reports',
                headerShown: true,
                headerStyle: { backgroundColor: '#667eea' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ 
                title: 'Settings',
                headerShown: true,
                headerStyle: { backgroundColor: '#667eea' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen 
              name="Security" 
              component={SecurityScreen}
              options={{ 
                title: 'Security Center',
                headerShown: true,
                headerStyle: { backgroundColor: '#667eea' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen 
              name="AssetManagement" 
              component={AssetManagementScreen}
              options={{ 
                title: 'Asset Management',
                headerShown: true,
                headerStyle: { backgroundColor: '#667eea' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen 
              name="Help" 
              component={HelpScreen}
              options={{ 
                title: 'Help Center',
                headerShown: true,
                headerStyle: { backgroundColor: '#667eea' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen 
              name="HelpTopicDetail" 
              component={HelpTopicDetailScreen}
              options={{ 
                title: 'Help Topic',
                headerShown: true,
                headerStyle: { backgroundColor: '#667eea' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen 
              name="Onboarding" 
              component={OnboardingScreen}
              options={{ 
                title: 'Getting Started',
                headerShown: true,
                headerStyle: { backgroundColor: '#667eea' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen 
              name="LoggingDashboard" 
              component={LoggingDashboardScreen}
              options={{ 
                title: 'Logging Dashboard',
                headerShown: true,
                headerStyle: { backgroundColor: '#667eea' },
                headerTintColor: '#ffffff',
                headerTitleStyle: { fontWeight: 'bold' },
              }}
            />
            <Stack.Screen 
              name="Accounts" 
              component={AccountsScreen}
              options={{ title: 'Accounts', headerShown: false }}
            />
            <Stack.Screen 
              name="AccountsManagement" 
              component={AccountsManagementScreen}
              options={{ title: 'Accounts Management', headerShown: false }}
            />
            <Stack.Screen 
              name="OperationalAccounts" 
              component={OperationalAccountsScreen}
              options={{ title: 'Operational Accounts', headerShown: false }}
            />
            <Stack.Screen 
              name="AccountReceivables" 
              component={AccountReceivablesScreen}
              options={{ title: 'Account Receivables', headerShown: false }}
            />
            <Stack.Screen 
              name="AccountPayables" 
              component={AccountPayablesScreen}
              options={{ title: 'Account Payables', headerShown: false }}
            />
            <Stack.Screen 
              name="AddAccount" 
              component={AddAccountScreen}
              options={{ title: 'Add Account', headerShown: false }}
            />
            <Stack.Screen 
              name="AccountReceivablesHistory" 
              component={AccountReceivablesHistoryScreen}
              options={{ title: 'Receivables History', headerShown: false }}
            />
            <Stack.Screen 
              name="AccountPayablesHistory" 
              component={AccountPayablesHistoryScreen}
              options={{ title: 'Payables History', headerShown: false }}
            />
            <Stack.Screen 
              name="CreditorsSuppliers" 
              component={CreditorsSuppliersScreen}
              options={{ title: 'Creditors & Suppliers', headerShown: false }}
            />
            <Stack.Screen
              name="AddCreditorSupplier"
              component={AddCreditorSupplierScreen}
              options={{ title: 'Add Creditor/Supplier', headerShown: false }}
            />
            <Stack.Screen
              name="StationSettings"
              component={StationSettingsScreen}
              options={{ title: 'Station Settings', headerShown: false }}
            />
            <Stack.Screen
              name="PumpManagement"
              component={PumpManagementScreen}
              options={{ title: 'Pump Management', headerShown: false }}
            />
            <Stack.Screen
              name="AddPump"
              component={AddPumpScreen}
              options={{ title: 'Add Pump', headerShown: false }}
            />
            <Stack.Screen
              name="PumpDippingManagement"
              component={PumpDippingManagementScreen}
              options={{ title: 'Pump Dipping Management', headerShown: false }}
            />
            <Stack.Screen 
              name="FuelDelivery" 
              component={FuelDeliveryScreen}
              options={{ title: 'Fuel Delivery', headerShown: false }}
            />
            <Stack.Screen 
              name="TransporterManagement" 
              component={TransporterManagementScreen}
              options={{ title: 'Transporter Management', headerShown: false }}
            />
            <Stack.Screen 
              name="TaxPayment" 
              component={TaxPaymentScreen}
              options={{ title: 'Tax Payment', headerShown: false }}
            />
            <Stack.Screen 
              name="TruckTransactionHistory" 
              component={TruckTransactionHistoryScreen}
              options={{ title: 'Truck Transaction History', headerShown: false }}
            />
            <Stack.Screen 
              name="AddTransporter" 
              component={AddTransporterScreen}
              options={{ title: 'Add Transporter', headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function prepare() {
      try {
        // Fire and forget the async services - don't block on them
        syncService.initialize().catch(e => console.warn('Sync init error:', e));
        notificationService.loadNotifications().catch(e => console.warn('Notif load error:', e));
        loggingService.initialize().catch(e => console.warn('Logging init error:', e));
        await Font.loadAsync({});
      } catch (e) {
        console.warn('Error during app preparation:', e);
      }
    }

    // Safety timeout - force ready after 3 seconds max
    timeoutId = setTimeout(() => {
      if (isMounted) {
        setAppIsReady(true);
      }
    }, 3000);

    prepare().then(() => {
      if (isMounted) {
        setAppIsReady(true);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (appIsReady) {
      ExpoSplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <SecurityProvider>
            <AppNavigation />
            <StatusBar style="light" />
          </SecurityProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#48426D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoIcon: {
    width: 40,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconVerticalLine: {
    position: 'absolute',
    width: 4,
    height: 50,
    backgroundColor: '#F0C38E',
    borderRadius: 2,
  },
  iconCenterCircle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F0C38E',
    top: 24,
  },
  iconTopLine: {
    position: 'absolute',
    width: 16,
    height: 3,
    backgroundColor: '#F0C38E',
    borderRadius: 1.5,
    top: 8,
  },
  iconBottomLine: {
    position: 'absolute',
    width: 16,
    height: 3,
    backgroundColor: '#F0C38E',
    borderRadius: 1.5,
    bottom: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F0C38E',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#F1AA9B',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});