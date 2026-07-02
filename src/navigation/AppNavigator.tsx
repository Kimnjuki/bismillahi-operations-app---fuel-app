import React, { useMemo, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Colors, TAB_LABELS, Typography } from '../constants/theme';
import { TabNavigationProvider } from './TabNavigationContext';

// Eagerly loaded tab home screens (always needed)
import HomeScreen from '../screens/HomeScreen';
import SalesHomeScreen from '../screens/SalesHomeScreen';
import StockHomeScreen from '../screens/StockHomeScreen';
import FinanceScreen from '../screens/FinanceScreen';
import MoreScreen from '../screens/MoreScreen';

// Lazy-loaded detail screens for code splitting
const SalesEntryScreen = lazy(() => import('../screens/SalesEntryScreen'));
const SalesRecordsScreen = lazy(() => import('../screens/SalesRecordsScreen'));
const UnifiedSalesReceiptScreen = lazy(() => import('../screens/UnifiedSalesReceiptScreen'));
const ExpenseHomepageScreen = lazy(() => import('../screens/ExpenseHomepageScreen'));
const ExpenseHistoryScreen = lazy(() => import('../screens/ExpenseHistoryScreen'));
const ExpenseEntryScreen = lazy(() => import('../screens/ExpenseEntryScreen'));
const StockManagementScreen = lazy(() => import('../screens/StockManagementScreen'));
const FuelDeliveryScreen = lazy(() => import('../screens/FuelDeliveryScreen'));
const PumpAndDippingManagementScreen = lazy(() => import('../screens/PumpAndDippingManagementScreen'));
const PumpManagementScreen = lazy(() => import('../screens/PumpManagementScreen'));
const PumpDippingManagementScreen = lazy(() => import('../screens/PumpDippingManagementScreen'));
const AddPumpScreen = lazy(() => import('../screens/AddPumpScreen'));
const AddTankScreen = lazy(() => import('../screens/AddTankScreen'));
const AccountsScreen = lazy(() => import('../screens/AccountsScreen'));
const AccountReceivablesScreen = lazy(() => import('../screens/AccountReceivablesScreen'));
const AccountPayablesScreen = lazy(() => import('../screens/AccountPayablesScreen'));
const AccountReceivablesHistoryScreen = lazy(() => import('../screens/AccountReceivablesHistoryScreen'));
const AccountPayablesHistoryScreen = lazy(() => import('../screens/AccountPayablesHistoryScreen'));
const AddAccountScreen = lazy(() => import('../screens/AddAccountScreen'));
const CreditorsSuppliersScreen = lazy(() => import('../screens/CreditorsSuppliersScreen'));
const AddCreditorSupplierScreen = lazy(() => import('../screens/AddCreditorSupplierScreen'));
const FundTransferScreen = lazy(() => import('../screens/FundTransferScreen'));
const NewTransferScreen = lazy(() => import('../screens/NewTransferScreen'));
const ExchangeRateScreen = lazy(() => import('../screens/ExchangeRateScreen'));
const ReportsScreen = lazy(() => import('../screens/ReportsScreen'));
const AnalyticsScreen = lazy(() => import('../screens/AnalyticsScreen'));
const NotificationsScreen = lazy(() => import('../screens/NotificationsScreen'));
const UserManagementScreen = lazy(() => import('../screens/UserManagementScreen'));
const AdminUserManagementScreen = lazy(() => import('../screens/AdminUserManagementScreen'));
const SettingsScreen = lazy(() => import('../screens/SettingsScreen'));
const StationSettingsScreen = lazy(() => import('../screens/StationSettingsScreen'));
const DailyConsolidatedReportScreen = lazy(() => import('../screens/DailyConsolidatedReportScreen'));
const TransporterManagementScreen = lazy(() => import('../screens/TransporterManagementScreen'));
const AddTransporterScreen = lazy(() => import('../screens/AddTransporterScreen'));
const TaxPaymentScreen = lazy(() => import('../screens/TaxPaymentScreen'));
const TruckTransactionHistoryScreen = lazy(() => import('../screens/TruckTransactionHistoryScreen'));
const TrucksDeliveredScreen = lazy(() => import('../screens/TrucksDeliveredScreen'));
const SecurityScreen = lazy(() => import('../screens/SecurityScreen'));
const AssetManagementScreen = lazy(() => import('../screens/AssetManagementScreen'));
const HelpScreen = lazy(() => import('../screens/HelpScreen'));
const HelpTopicDetailScreen = lazy(() => import('../screens/HelpTopicDetailScreen'));
const OnboardingScreen = lazy(() => import('../screens/OnboardingScreen'));
const LoggingDashboardScreen = lazy(() => import('../screens/LoggingDashboardScreen'));
const AccountsManagementScreen = lazy(() => import('../screens/AccountsManagementScreen'));
const OperationalAccountsScreen = lazy(() => import('../screens/OperationalAccountsScreen'));
const ExpenseOnboardingScreen = lazy(() => import('../screens/ExpenseOnboardingScreen'));
const ExpenseScreen = lazy(() => import('../screens/ExpenseScreen'));

const HomeStack = createNativeStackNavigator();
const SalesStack = createNativeStackNavigator();
const StockStack = createNativeStackNavigator();
const FinanceStack = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();

// Shared stack screen options - dark theme
const stackScreenOptions = {
  headerShown: true,
  headerStyle: { backgroundColor: Colors.background.card },
  headerTintColor: Colors.white,
  headerTitleStyle: { fontWeight: '600' as const, fontSize: 16, fontFamily: Typography.fontFamily.semibold },
  contentStyle: { backgroundColor: Colors.background.app },
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============ HOME STACK ============
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
    </HomeStack.Navigator>
  );
}

// ============ SALES STACK ============
function SalesStackNavigator() {
  const { hasPermission } = useAuth();
  const canManageSales = hasPermission('cashier');
  const canViewSales = hasPermission('viewer');
  
  return (
    <SalesStack.Navigator screenOptions={{ headerShown: false }}>
      <SalesStack.Screen name="SalesHome" component={SalesHomeScreen} />
      {canManageSales && (
        <SalesStack.Screen 
          name="SalesEntry" 
          component={SalesEntryScreen} 
          options={{ ...stackScreenOptions, headerShown: true, title: 'Record Sale' }} 
        />
      )}
      {canViewSales && (
        <SalesStack.Screen 
          name="SalesRecords" 
          component={SalesRecordsScreen} 
          options={{ headerShown: false }} 
        />
      )}
      <SalesStack.Screen 
        name="SalesReceipt" 
        component={UnifiedSalesReceiptScreen} 
        options={{ headerShown: false }} 
      />
    </SalesStack.Navigator>
  );
}

// ============ STOCK STACK ============
function StockStackNavigator() {
  const { hasPermission } = useAuth();
  
  return (
    <StockStack.Navigator screenOptions={{ headerShown: false }}>
      <StockStack.Screen name="StockHome" component={StockHomeScreen} />
      <StockStack.Screen 
        name="StockManagement" 
        component={StockManagementScreen} 
        options={{ ...stackScreenOptions, title: 'Stock Management' }} 
      />
      <StockStack.Screen 
        name="PumpAndDippingManagement" 
        component={PumpAndDippingManagementScreen} 
        options={{ ...stackScreenOptions, title: 'Pump & Dipping' }} 
      />
      <StockStack.Screen 
        name="PumpManagement" 
        component={PumpManagementScreen} 
        options={{ ...stackScreenOptions, title: 'Pumps' }} 
      />
      <StockStack.Screen 
        name="PumpDippingManagement" 
        component={PumpDippingManagementScreen} 
        options={{ ...stackScreenOptions, title: 'Dipping' }} 
      />
      <StockStack.Screen 
        name="AddPump" 
        component={AddPumpScreen} 
        options={{ ...stackScreenOptions, title: 'Add Pump' }} 
      />
      <StockStack.Screen 
        name="AddTank" 
        component={AddTankScreen} 
        options={{ ...stackScreenOptions, title: 'Add Tank' }} 
      />
      <StockStack.Screen 
        name="FuelDelivery" 
        component={FuelDeliveryScreen} 
        options={{ ...stackScreenOptions, title: 'Fuel Delivery' }} 
      />
      <StockStack.Screen 
        name="TransporterManagement" 
        component={TransporterManagementScreen} 
        options={{ ...stackScreenOptions, title: 'Transporters' }} 
      />
      <StockStack.Screen 
        name="AddTransporter" 
        component={AddTransporterScreen} 
        options={{ ...stackScreenOptions, title: 'Add Transporter' }} 
      />
      <StockStack.Screen 
        name="TaxPayment" 
        component={TaxPaymentScreen} 
        options={{ ...stackScreenOptions, title: 'Tax Payment' }} 
      />
      <StockStack.Screen 
        name="TruckTransactionHistory" 
        component={TruckTransactionHistoryScreen} 
        options={{ ...stackScreenOptions, title: 'Truck History' }} 
      />
      <StockStack.Screen 
        name="TrucksDelivered" 
        component={TrucksDeliveredScreen} 
        options={{ ...stackScreenOptions, title: 'Delivered Trucks' }} 
      />
    </StockStack.Navigator>
  );
}

// ============ FINANCE STACK ============
function FinanceStackNavigator() {
  return (
    <FinanceStack.Navigator screenOptions={{ headerShown: false }}>
      <FinanceStack.Screen name="FinanceHome" component={FinanceScreen} />
      <FinanceStack.Screen 
        name="ExpenseHomepage" 
        component={ExpenseHomepageScreen} 
        options={{ headerShown: false }} 
      />
      <FinanceStack.Screen 
        name="ExpenseHistory" 
        component={ExpenseHistoryScreen} 
        options={{ headerShown: false }} 
      />
      <FinanceStack.Screen 
        name="ExpenseEntry" 
        component={ExpenseEntryScreen} 
        options={{ headerShown: false }} 
      />
      <FinanceStack.Screen 
        name="ExpenseOnboarding" 
        component={ExpenseOnboardingScreen} 
        options={{ headerShown: false }} 
      />
      <FinanceStack.Screen 
        name="Expense" 
        component={ExpenseScreen} 
        options={{ ...stackScreenOptions, headerShown: true, title: 'Expenses' }} 
      />
      <FinanceStack.Screen 
        name="FundTransfer" 
        component={FundTransferScreen} 
        options={{ ...stackScreenOptions, title: 'Fund Transfer' }} 
      />
      <FinanceStack.Screen 
        name="NewTransfer" 
        component={NewTransferScreen} 
        options={{ headerShown: false }} 
      />
      <FinanceStack.Screen 
        name="ExchangeRate" 
        component={ExchangeRateScreen} 
        options={{ ...stackScreenOptions, title: 'Exchange Rate' }} 
      />
      <FinanceStack.Screen 
        name="Accounts" 
        component={AccountsScreen} 
        options={{ headerShown: false }} 
      />
      <FinanceStack.Screen 
        name="AccountsManagement" 
        component={AccountsManagementScreen} 
        options={{ headerShown: false }} 
      />
      <FinanceStack.Screen 
        name="OperationalAccounts" 
        component={OperationalAccountsScreen} 
        options={{ headerShown: false }} 
      />
      <FinanceStack.Screen 
        name="AccountReceivables" 
        component={AccountReceivablesScreen} 
        options={{ headerShown: false }} 
      />
      <FinanceStack.Screen 
        name="AccountPayables" 
        component={AccountPayablesScreen} 
        options={{ headerShown: false }} 
      />
      <FinanceStack.Screen 
        name="AccountReceivablesHistory" 
        component={AccountReceivablesHistoryScreen} 
        options={{ headerShown: false }} 
      />
      <FinanceStack.Screen 
        name="AccountPayablesHistory" 
        component={AccountPayablesHistoryScreen} 
        options={{ headerShown: false }} 
      />
      <FinanceStack.Screen 
        name="AddAccount" 
        component={AddAccountScreen} 
        options={{ headerShown: false }} 
      />
      <FinanceStack.Screen 
        name="CreditorsSuppliers" 
        component={CreditorsSuppliersScreen} 
        options={{ headerShown: false }} 
      />
      <FinanceStack.Screen 
        name="AddCreditorSupplier" 
        component={AddCreditorSupplierScreen} 
        options={{ headerShown: false }} 
      />
    </FinanceStack.Navigator>
  );
}

// ============ MORE STACK ============
function MoreStackNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreHome" component={MoreScreen} />
      <MoreStack.Screen 
        name="Reports" 
        component={ReportsScreen} 
        options={{ ...stackScreenOptions, title: 'Reports' }} 
      />
      <MoreStack.Screen 
        name="Analytics" 
        component={AnalyticsScreen} 
        options={{ headerShown: false }} 
      />
      <MoreStack.Screen 
        name="DailyConsolidatedReport" 
        component={DailyConsolidatedReportScreen} 
        options={{ headerShown: false }} 
      />
      <MoreStack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ headerShown: false }} 
      />
      <MoreStack.Screen 
        name="UserManagement" 
        component={UserManagementScreen} 
        options={{ ...stackScreenOptions, title: 'User Management' }} 
      />
      <MoreStack.Screen 
        name="AdminUserManagement" 
        component={AdminUserManagementScreen} 
        options={{ ...stackScreenOptions, title: 'Admin Users' }} 
      />
      <MoreStack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ ...stackScreenOptions, title: 'Settings' }} 
      />
      <MoreStack.Screen 
        name="StationSettings" 
        component={StationSettingsScreen} 
        options={{ headerShown: false }} 
      />
      <MoreStack.Screen 
        name="Security" 
        component={SecurityScreen} 
        options={{ ...stackScreenOptions, title: 'Security' }} 
      />
      <MoreStack.Screen 
        name="AssetManagement" 
        component={AssetManagementScreen} 
        options={{ ...stackScreenOptions, title: 'Assets' }} 
      />
      <MoreStack.Screen 
        name="Help" 
        component={HelpScreen} 
        options={{ ...stackScreenOptions, title: 'Help' }} 
      />
      <MoreStack.Screen 
        name="HelpTopicDetail" 
        component={HelpTopicDetailScreen} 
        options={{ ...stackScreenOptions, title: 'Help Topic' }} 
      />
      <MoreStack.Screen 
        name="Onboarding" 
        component={OnboardingScreen} 
        options={{ ...stackScreenOptions, title: 'Getting Started' }} 
      />
      <MoreStack.Screen 
        name="LoggingDashboard" 
        component={LoggingDashboardScreen} 
        options={{ ...stackScreenOptions, title: 'Activity Log' }} 
      />
    </MoreStack.Navigator>
  );
}

// ============ TAB CONFIGURATION ============
interface TabConfig {
  key: string;
  label: string;
  iconFocused: keyof typeof MaterialCommunityIcons.glyphMap;
  iconUnfocused: keyof typeof MaterialCommunityIcons.glyphMap;
  component: React.ComponentType<any>;
}

// ============ CUSTOM TAB BAR ============
interface TabBarProps {
  tabs: TabConfig[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

function TabBar({ tabs, activeIndex, onTabPress }: TabBarProps) {
  return (
    <View style={tabBarStyles.container}>
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        const iconName = isActive ? tab.iconFocused : tab.iconUnfocused;
        return (
          <TouchableOpacity
            key={tab.key}
            style={tabBarStyles.tab}
            onPress={() => onTabPress(index)}
            activeOpacity={0.7}
          >
            <View style={tabBarStyles.iconContainer}>
              <MaterialCommunityIcons
                name={iconName}
                size={24}
                color={isActive ? Colors.brand.primary : Colors.neutral['400']}
              />
              {isActive && <View style={tabBarStyles.activeIndicator} />}
            </View>
            <Text
              style={[
                tabBarStyles.label,
                { color: isActive ? Colors.brand.primary : Colors.neutral['400'] },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.background.card,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral['600'],
    paddingBottom: 10,
    paddingTop: 6,
    height: 68,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.brand.primary,
  },
  label: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.medium,
    marginTop: 4,
    textAlign: 'center',
  },
});

// ============ MAIN TAB CONTAINER WITH SWIPE ============
export default function AppTabNavigator() {
  const { appUser, hasPermission } = useAuth();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isTransitioning = useRef(false);
  // Only mount the active tab to prevent multiple navigators under one NavigationContainer
  const [mountedTab, setMountedTab] = useState<number>(0);
  
  const role = appUser?.role || 'viewer';
  
  // Determine which tabs are visible based on role (ordered)
  const visibleTabs: TabConfig[] = useMemo(() => {
    const tabs: TabConfig[] = [];
    
    if (hasPermission('viewer') || role === 'viewer' || role === 'admin' || role === 'manager' || role === 'cashier') {
      tabs.push({
        key: 'home',
        label: TAB_LABELS.home,
        iconFocused: 'home-variant',
        iconUnfocused: 'home-variant-outline',
        component: HomeStackNavigator,
      });
    }
    if (hasPermission('viewer')) {
      tabs.push({
        key: 'sales',
        label: TAB_LABELS.sales,
        iconFocused: 'gas-station',
        iconUnfocused: 'gas-station-outline',
        component: SalesStackNavigator,
      });
    }
    if (hasPermission('viewer')) {
      tabs.push({
        key: 'stock',
        label: TAB_LABELS.stock,
        iconFocused: 'cube',
        iconUnfocused: 'cube-outline',
        component: StockStackNavigator,
      });
    }
    if (hasPermission('cashier')) {
      tabs.push({
        key: 'finance',
        label: TAB_LABELS.finance,
        iconFocused: 'wallet',
        iconUnfocused: 'wallet-outline',
        component: FinanceStackNavigator,
      });
    }
    // More is always visible
    tabs.push({
      key: 'more',
      label: TAB_LABELS.more,
      iconFocused: 'apps',
      iconUnfocused: 'apps',
      component: MoreStackNavigator,
    });
    
    return tabs;
  }, [hasPermission, role]);

  const handleTabPress = useCallback((index: number) => {
    if (isTransitioning.current) return;
    if (index === activeTabIndex) return;
    
    // Only mount the new active tab to prevent multiple navigator registration
    setMountedTab(index);
    
    isTransitioning.current = true;
    setActiveTabIndex(index);
    scrollRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
    setTimeout(() => {
      isTransitioning.current = false;
    }, 350);
  }, [activeTabIndex]);

  const handleScrollEnd = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
    if (isTransitioning.current) return;
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    
    if (newIndex >= 0 && newIndex < visibleTabs.length && newIndex !== activeTabIndex) {
      // Only mount the new active tab
      setMountedTab(newIndex);
      setActiveTabIndex(newIndex);
    }
  }, [activeTabIndex, visibleTabs.length]);

  const switchTab = useCallback((tabKey: string) => {
    const tabIndex = visibleTabs.findIndex(tab => tab.key === tabKey);
    if (tabIndex !== -1 && tabIndex !== activeTabIndex) {
      handleTabPress(tabIndex);
    }
  }, [visibleTabs, activeTabIndex, handleTabPress]);

  return (
    <TabNavigationProvider value={{ switchTab }}>
      <View style={{ flex: 1, backgroundColor: Colors.background.app }}>
        {/* Horizontal ScrollView for Swipeable Tabs */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          scrollEnabled={true}
          keyboardShouldPersistTaps="always"
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          contentContainerStyle={{ flexGrow: 1 }}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="start"
          style={{ flex: 1 }}
        >
          {visibleTabs.map((tab, index) => {
            if (index !== mountedTab) {
              // Render an empty placeholder for non-active tabs instead of mounting the navigator
              return (
                <View key={tab.key} style={{ width: SCREEN_WIDTH, flex: 1, backgroundColor: Colors.background.app }} />
              );
            }
            const NavigatorComponent = tab.component;
            return (
              <View key={tab.key} style={{ width: SCREEN_WIDTH, flex: 1 }}>
                <NavigatorComponent />
              </View>
            );
          })}
        </ScrollView>
        
        {/* Tab Bar */}
        <TabBar
          tabs={visibleTabs}
          activeIndex={activeTabIndex}
          onTabPress={handleTabPress}
        />
      </View>
    </TabNavigationProvider>
  );
}