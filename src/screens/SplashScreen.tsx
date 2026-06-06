import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    // Auto-navigate to welcome screen after 3 seconds
    const timer = setTimeout(() => {
      (navigation as any).navigate('WelcomeOnboarding');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo Icon */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <View style={styles.logoIcon}>
                <View style={styles.iconVerticalLine} />
                <View style={styles.iconCenterCircle} />
                <View style={styles.iconTopLine} />
                <View style={styles.iconBottomLine} />
              </View>
            </View>
          </View>

          {/* App Name */}
          <Text style={styles.appName}>BISMILLAHI OPERATIONS</Text>
          <Text style={styles.tagline}>Your Fuel Station Management Solution</Text>

          {/* Pagination Dots */}
          <View style={styles.paginationContainer}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#312C51', // Primary dark purple background
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#48426D', // Primary light purple circle
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#F0C38E', // Accent light gold/beige
    borderRadius: 2,
  },
  iconCenterCircle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F0C38E', // Accent light gold/beige
    top: 24,
  },
  iconTopLine: {
    position: 'absolute',
    width: 16,
    height: 3,
    backgroundColor: '#F0C38E', // Accent light gold/beige
    borderRadius: 1.5,
    top: 8,
  },
  iconBottomLine: {
    position: 'absolute',
    width: 16,
    height: 3,
    backgroundColor: '#F0C38E', // Accent light gold/beige
    borderRadius: 1.5,
    bottom: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F0C38E', // Accent light gold/beige
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#F1AA9B', // Accent light peach/salmon
    textAlign: 'center',
    marginBottom: 60,
    lineHeight: 22,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F0C38E', // Accent light gold/beige
    marginHorizontal: 4,
    opacity: 0.3,
  },
  activeDot: {
    opacity: 1,
  },
});

