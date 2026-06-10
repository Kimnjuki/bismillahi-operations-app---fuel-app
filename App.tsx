import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, ActivityIndicator, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Suppress warnings for faster startup
LogBox.ignoreLogs(['Warning:', 'Each child in a list']);

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (was cacheTime in v4)
      retry: 2,
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
    },
  },
});

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Auth screens (always loaded)
import PinLoginScreen from './src/screens/PinLoginScreen';
import PinSetupScreen from './src/screens/PinSetupScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';

// Dashboard (loaded on auth)
import DashboardScreen from './src/screens/DashboardScreen';

// Sales Records
import SalesRecordsScreen from './src/screens/SalesRecordsScreen';

// All remaining screens imported for navigation
import SalesEntryScreen from './src/screens/SalesEntryScreen';
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
import AddTankScreen from './src/screens/AddTankScreen';

const Stack = createNativeStackNavigator();

// Loading screen shown during app initialization
function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#312C51', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#F0C38E" />
      <Text style={{ color: '#F0C38E', marginTop: 16, fontSize: 16 }}>Loading Bismillahi Operations...</Text>
    </View>
  );
}

// Navigation component - simplified for fast startup
function AppNavigation() {
  const { appUser, isAuthenticated, loading } = useAuth();

  // Show minimal loading while auth is loading - instant response
  if (loading) {
    return <LoadingScreen />;
  }

  // Determine initial route based on auth state
  const isLoggedIn = isAuthenticated && !!appUser;

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isLoggedIn ? 'Dashboard' : 'PinLogin'}
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          animation: 'slide_from_right',
        }}
      >
        {/* Auth screens */}
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
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ gestureEnabled: false }}
        />

        {/* Authenticated app screens */}
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
          name="SalesRecords"
          component={SalesRecordsScreen}
          options={{
            title: 'Sales Records',
            headerShown: false,
          }}
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
        <Stack.Screen
          name="AddTank"
          component={AddTankScreen}
          options={{ title: 'Add Tank', headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AppNavigation />
              <StatusBar style="light" />
            </AuthProvider>
          </QueryClientProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
