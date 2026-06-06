import { NavigationProp, CommonActions } from '@react-navigation/native';

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Welcome: undefined;
  Dashboard: undefined;
  SalesEntry: undefined;
  StockManagement: undefined;
  Expense: undefined;
  FundTransfer: undefined;
  NewTransfer: undefined;
  ExchangeRate: undefined;
  Reports: undefined;
  UserManagement: undefined;
  Notifications: undefined;
  Settings: undefined;
  Accounts: undefined;
  AccountReceivables: undefined;
  AccountPayables: undefined;
  AddAccount: { type: 'receivable' | 'payable' };
  FuelDelivery: undefined;
  TransporterManagement: undefined;
  TaxPayment: undefined;
  TruckTransactionHistory: undefined;
  AddTransporter: undefined;
};

// Navigation helper functions
export const NavigationUtils = {
  // Navigate to a specific screen
  navigate: <T extends keyof RootStackParamList>(
    navigation: NavigationProp<RootStackParamList>,
    screen: T,
    params?: RootStackParamList[T]
  ) => {
    (navigation as any).navigate(screen, params);
  },

  // Go back to previous screen
  goBack: (navigation: NavigationProp<RootStackParamList>) => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  },

  // Reset navigation stack to a specific screen
  resetTo: <T extends keyof RootStackParamList>(
    navigation: NavigationProp<RootStackParamList>,
    screen: T,
    params?: RootStackParamList[T]
  ) => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: screen, params }],
      })
    );
  },

  // Replace current screen with a new one
  replace: <T extends keyof RootStackParamList>(
    navigation: NavigationProp<RootStackParamList>,
    screen: T,
    params?: RootStackParamList[T]
  ) => {
    navigation.dispatch(
      (CommonActions as any).replace(screen, params)
    );
  },

  // Pop to a specific screen in the stack
  popTo: <T extends keyof RootStackParamList>(
    navigation: NavigationProp<RootStackParamList>,
    screen: T
  ) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: screen,
        merge: true,
      })
    );
  },

  // Pop multiple screens from the stack
  pop: (navigation: NavigationProp<RootStackParamList>, count: number = 1) => {
    navigation.dispatch(
      (CommonActions as any).pop(count)
    );
  },

  // Push a new screen onto the stack
  push: <T extends keyof RootStackParamList>(
    navigation: NavigationProp<RootStackParamList>,
    screen: T,
    params?: RootStackParamList[T]
  ) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: screen,
        params,
      })
    );
  },
};

// Screen-specific navigation helpers
export const ScreenNavigation = {
  // Dashboard navigation
  toDashboard: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.resetTo(navigation, 'Dashboard');
  },

  // Sales navigation
  toSalesEntry: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'SalesEntry');
  },

  // Stock management navigation
  toStockManagement: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'StockManagement');
  },

  // Expense navigation
  toExpense: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'Expense');
  },

  // Fund transfer navigation
  toFundTransfer: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'FundTransfer');
  },

  toNewTransfer: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'NewTransfer');
  },

  // Exchange rate navigation
  toExchangeRate: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'ExchangeRate');
  },

  // Reports navigation
  toReports: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'Reports');
  },

  // User management navigation
  toUserManagement: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'UserManagement');
  },

  // Notifications navigation
  toNotifications: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'Notifications');
  },

  // Settings navigation
  toSettings: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'Settings');
  },

  // Accounts navigation
  toAccounts: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'Accounts');
  },

  toAccountReceivables: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'AccountReceivables');
  },

  toAccountPayables: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'AccountPayables');
  },

  toAddAccount: (navigation: NavigationProp<RootStackParamList>, type: 'receivable' | 'payable') => {
    NavigationUtils.navigate(navigation, 'AddAccount', { type });
  },

  // Fuel Delivery navigation
  toFuelDelivery: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'FuelDelivery');
  },

  toTransporterManagement: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'TransporterManagement');
  },

  toTaxPayment: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'TaxPayment');
  },

  toTruckTransactionHistory: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'TruckTransactionHistory');
  },

  toAddTransporter: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'AddTransporter');
  },

  // Auth navigation
  toLogin: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.resetTo(navigation, 'Login');
  },

  toWelcome: (navigation: NavigationProp<RootStackParamList>) => {
    NavigationUtils.navigate(navigation, 'Welcome');
  },
};

// Navigation state helpers
export const NavigationState = {
  // Check if user can go back
  canGoBack: (navigation: NavigationProp<RootStackParamList>): boolean => {
    return navigation.canGoBack();
  },

  // Get current route name
  getCurrentRoute: (navigation: NavigationProp<RootStackParamList>): string | undefined => {
    const state = navigation.getState();
    const route = state.routes[state.index];
    return route?.name;
  },

  // Check if current screen is a specific screen
  isCurrentScreen: (
    navigation: NavigationProp<RootStackParamList>,
    screenName: keyof RootStackParamList
  ): boolean => {
    return NavigationState.getCurrentRoute(navigation) === screenName;
  },

  // Get navigation history
  getNavigationHistory: (navigation: NavigationProp<RootStackParamList>): string[] => {
    const state = navigation.getState();
    return state.routes.map(route => route.name);
  },
};

// Navigation guards and permissions
export const NavigationGuards = {
  // Check if user has permission to access a screen
  canAccessScreen: (
    screenName: keyof RootStackParamList,
    userRole: string
  ): boolean => {
    const rolePermissions: Record<string, (keyof RootStackParamList)[]> = {
      admin: [
        'Dashboard', 'SalesEntry', 'StockManagement', 'Expense',
        'FundTransfer', 'NewTransfer', 'ExchangeRate', 'Reports', 'UserManagement',
        'Notifications', 'Settings', 'Accounts', 'AccountReceivables', 'AccountPayables', 'AddAccount',
        'FuelDelivery', 'TransporterManagement', 'TaxPayment', 'TruckTransactionHistory', 'AddTransporter'
      ],
      manager: [
        'Dashboard', 'SalesEntry', 'StockManagement', 'Expense',
        'FundTransfer', 'NewTransfer', 'ExchangeRate', 'Reports', 'Notifications', 'Settings',
        'Accounts', 'AccountReceivables', 'AccountPayables', 'AddAccount',
        'FuelDelivery', 'TransporterManagement', 'TaxPayment', 'TruckTransactionHistory', 'AddTransporter'
      ],
      cashier: [
        'Dashboard', 'SalesEntry', 'Expense', 'Notifications', 'Settings'
      ],
      viewer: [
        'Dashboard', 'ExchangeRate', 'Reports', 'Notifications', 'Settings'
      ],
    };

    const allowedScreens = rolePermissions[userRole] || [];
    return allowedScreens.includes(screenName);
  },

  // Navigate with permission check
  navigateWithPermission: <T extends keyof RootStackParamList>(
    navigation: NavigationProp<RootStackParamList>,
    screen: T,
    userRole: string,
    params?: RootStackParamList[T]
  ): boolean => {
    if (NavigationGuards.canAccessScreen(screen, userRole)) {
      NavigationUtils.navigate(navigation, screen, params);
      return true;
    }
    return false;
  },
};

// Navigation analytics and tracking
export const NavigationAnalytics = {
  // Track screen view
  trackScreenView: (screenName: string, params?: any) => {
    // Implement analytics tracking here
    console.log(`Screen viewed: ${screenName}`, params);
  },

  // Track navigation action
  trackNavigationAction: (action: string, from: string, to: string) => {
    // Implement analytics tracking here
    console.log(`Navigation: ${action} from ${from} to ${to}`);
  },
};

