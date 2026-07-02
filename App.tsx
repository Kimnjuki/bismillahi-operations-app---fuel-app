import React, { useState, useEffect, useRef, memo, lazy, Suspense } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';

// Suppress known warnings for faster startup
LogBox.ignoreLogs([
  'Warning:',
  'Each child in a list',
]);

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
    },
  },
});

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SecurityProvider } from './src/context/SecurityContext';

// Lazy-loaded screens for faster initial bundle
const AuthScreen = lazy(() => import('./src/screens/AuthScreen'));
const PinEntryScreen = lazy(() => import('./src/screens/PinEntryScreen'));
const PinSetupScreen = lazy(() => import('./src/screens/PinSetupScreen'));
const WelcomeOnboardingScreen = lazy(() => import('./src/screens/WelcomeOnboardingScreen'));
const AppTabNavigator = lazy(() => import('./src/navigation/AppNavigator'));
const NotificationsScreen = lazy(() => import('./src/screens/NotificationsScreen'));

// Theme
import { Colors, Typography } from './src/constants/theme';

const Stack = createNativeStackNavigator();

// Loading screen shown during app initialization
function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background.app, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.brand.primary} />
        <Text style={{ color: Colors.brand.primary, marginTop: 16, fontSize: 16, fontFamily: Typography.fontFamily.medium }}>
          Loading Fuelr...
        </Text>
    </View>
  );
}

  // Navigation component - reactive auth routing
  function AppNavigation() {
     const { appUser, isAuthenticated, loading } = useAuth();
     const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
     const navigationRef = useRef<NavigationContainerRef<any>>(null);

     useEffect(() => {
       checkOnboarding();
     }, []);

     const checkOnboarding = async () => {
       try {
         const done = await AsyncStorage.getItem('@onboarding_completed');
         setOnboardingDone(done === 'true');
       } catch {
         setOnboardingDone(false);
       }
     };

     const isLoggedIn = isAuthenticated && !!appUser;

     // Reactively reset navigation when auth state transitions
     useEffect(() => {
       if (loading || onboardingDone === null) return;

       const targetRoute = isLoggedIn
         ? 'Main'
         : !onboardingDone
           ? 'WelcomeOnboarding'
           : !appUser
             ? 'Auth'
             : 'PinEntry';

       const currentRoute = navigationRef.current?.getCurrentRoute();

       if (currentRoute?.name !== targetRoute) {
         navigationRef.current?.reset({
           index: 0,
           routes: [{ name: targetRoute }],
         });
       }
     }, [isLoggedIn, appUser, onboardingDone, loading]);

     if (loading || onboardingDone === null) {
       return <LoadingScreen />;
     }

     const initialRouteName = isLoggedIn
       ? 'Main'
       : !onboardingDone
         ? 'WelcomeOnboarding'
         : !appUser
           ? 'Auth'
           : 'PinEntry';

     return (
       <NavigationContainer
         ref={navigationRef}
         theme={{
           dark: true,
           colors: {
             primary: Colors.brand.primary,
             background: Colors.background.app,
             card: Colors.background.card,
             text: Colors.white,
             border: Colors.neutral['600'],
             notification: Colors.semantic.danger,
           },
         }}
       >
          <Stack.Navigator
            initialRouteName={initialRouteName}
            screenOptions={{
              headerShown: false,
              gestureEnabled: true,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: Colors.background.app },
            }}
          >
            {/* Auth screens */}
            <Stack.Screen
              name="Auth"
              options={{ gestureEnabled: false }}
            >
              {() => (
                <Suspense fallback={<LoadingScreen />}>
                  <AuthScreen />
                </Suspense>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="PinEntry"
              options={{ gestureEnabled: false }}
            >
              {() => (
                <Suspense fallback={<LoadingScreen />}>
                  <PinEntryScreen />
                </Suspense>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="PinSetup"
              options={{
                title: 'Setup PIN',
                headerShown: true,
                headerStyle: { backgroundColor: Colors.background.card },
                headerTintColor: Colors.white,
                headerTitleStyle: { fontWeight: '600', fontFamily: Typography.fontFamily.semibold },
              }}
            >
              {() => (
                <Suspense fallback={<LoadingScreen />}>
                  <PinSetupScreen />
                </Suspense>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="WelcomeOnboarding"
              options={{ gestureEnabled: false }}
            >
              {() => (
                <Suspense fallback={<LoadingScreen />}>
                  <WelcomeOnboardingScreen />
                </Suspense>
              )}
            </Stack.Screen>

            {/* Main app with bottom tabs */}
            <Stack.Screen
              name="Main"
              options={{ gestureEnabled: false, animation: 'fade' }}
            >
              {() => (
                <Suspense fallback={<LoadingScreen />}>
                  <AppTabNavigator />
                </Suspense>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Notifications"
              options={{ headerShown: false }}
            >
              {() => (
                <Suspense fallback={<LoadingScreen />}>
                  <NotificationsScreen />
                </Suspense>
              )}
            </Stack.Screen>
          </Stack.Navigator>
       </NavigationContainer>
     );
   }

  function AppContent() {
      const fontsLoadedFromHook = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
        SpaceMono_400Regular,
      });
      const [fontsLoaded, setFontsLoaded] = useState(false);
      const { loading: authLoading } = useAuth();

      useEffect(() => {
        if (fontsLoadedFromHook) {
          setFontsLoaded(true);
        }
      }, [fontsLoadedFromHook]);

      // Fallback timeout
      useEffect(() => {
        const timeout = setTimeout(() => {
          setFontsLoaded(true);
        }, 5000); // 5 seconds
        return () => clearTimeout(timeout);
      }, []);

      if (!fontsLoaded || authLoading) {
        return <LoadingScreen />;
      }

      return (
        <>
          <AppNavigation />
          <StatusBar style="light" />
        </>
      );
    }

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <SecurityProvider>
                <AppContent />
              </SecurityProvider>
            </AuthProvider>
          </QueryClientProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}