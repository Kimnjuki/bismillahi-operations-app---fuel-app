import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#131313',
  surface: '#1E1E1E',
  surfaceContainer: '#201f1f',
  surfaceContainerHigh: '#2a2a2a',
  surfaceContainerLow: '#1c1b1b',
  surfaceVariant: '#353534',
  primary: '#ffd79b',
  primaryContainer: '#ffb300',
  onPrimary: '#432c00',
  onPrimaryContainer: '#6b4900',
  onBackground: '#e5e2e1',
  onSurface: '#e5e2e1',
  onSurfaceVariant: '#d6c4ac',
  outline: '#9e8e78',
  outlineVariant: '#514532',
  secondary: '#d7ffc5',
  secondaryContainer: '#2ff801',
  error: '#ffb4ab',
};

interface OnboardingPage {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  features: { label: string; icon: keyof typeof Ionicons.glyphMap }[];
}

const onboardingPages: OnboardingPage[] = [
  {
    id: 'precision-pumping',
    title: 'Precision',
    subtitle: 'Pumping',
    description: 'Log opening and closing pump meter readings straight from the forecourt. Eliminate manual paper ledgers.',
    icon: 'speedometer-outline',
    badge: 'REAL-TIME',
    features: [
      { label: 'Log History', icon: 'time-outline' },
      { label: 'Instant Sync', icon: 'cloud-upload-outline' },
    ],
  },
  {
    id: 'network-control',
    title: 'Network',
    subtitle: 'Control',
    description: 'Switch between 5+ fuel stations instantly in one central dashboard. Manage your entire retail footprint from anywhere.',
    icon: 'git-network-outline',
    badge: 'CENTRALIZED',
    features: [
      { label: 'Multi-Station', icon: 'business-outline' },
      { label: 'Central Control', icon: 'easel-outline' },
    ],
  },
  {
    id: 'leakproof-inventory',
    title: 'Leakproof',
    subtitle: 'Inventory',
    description: 'Reconcile fuel deliveries with live physical tank dipping. Detect stock variances before they hurt your margins.',
    icon: 'water-outline',
    badge: 'LIVE SYNC',
    features: [
      { label: 'Live Sync', icon: 'checkmark-circle-outline' },
      { label: 'Variance Alerts', icon: 'warning-outline' },
    ],
  },
  {
    id: 'smart-financials',
    title: 'Smart',
    subtitle: 'Financials',
    description: 'Track localized shift expenses and sales across USD, CDF, and KES seamlessly with real-time conversion.',
    icon: 'cash-outline',
    badge: 'MULTI-CURRENCY',
    features: [
      { label: 'Multi-Currency', icon: 'globe-outline' },
      { label: 'Real-Time FX', icon: 'trending-up-outline' },
    ],
  },
];

export default function WelcomeOnboardingScreen() {
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);
   const [currentIndex, setCurrentIndex] = useState(0);
   const scrollX = useRef(new Animated.Value(0)).current;

  const iconScale = useRef(new Animated.Value(1)).current;
  const iconOpacity = useRef(new Animated.Value(1)).current;

  // Animate icon on page change
  useEffect(() => {
    iconScale.setValue(0.8);
    iconOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentIndex]);

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem('@onboarding_completed', 'true');
    } catch (e) {
      console.warn('Failed to save onboarding state:', e);
    }
    (navigation as any).navigate('Auth');
  }, [navigation]);

  const handleNext = useCallback(() => {
    if (currentIndex < onboardingPages.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      completeOnboarding();
    }
  }, [currentIndex, completeOnboarding]);

  const handleSkip = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const renderPaginationDots = () => (
    <View style={styles.paginationRow}>
      {onboardingPages.map((_, index) => {
        const dotWidth = scrollX.interpolate({
          inputRange: [
            width * (index - 1),
            width * index,
            width * (index + 1),
          ],
          outputRange: [8, 48, 8],
          extrapolate: 'clamp',
        });
        const dotOpacity = scrollX.interpolate({
          inputRange: [
            width * (index - 1),
            width * index,
            width * (index + 1),
          ],
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={index}
            style={[
              styles.paginationDot,
              {
                width: dotWidth,
                opacity: dotOpacity,
                backgroundColor:
                  index === currentIndex
                    ? COLORS.primaryContainer
                    : COLORS.surfaceVariant,
              },
            ]}
          />
        );
      })}
    </View>
  );

  const renderItem = ({ item, index }: { item: OnboardingPage; index: number }) => {
    const inputRange = [width * (index - 1), width * index, width * (index + 1)];
    
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 1, 0.6],
      extrapolate: 'clamp',
    });
    
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });
    
    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [40, 0, 40],
      extrapolate: 'clamp',
    });

    const badgeScale = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.pageContainer}>
        <Animated.View
          style={[
            styles.iconArea,
            { transform: [{ scale }], opacity },
          ]}
        >
          {/* Outer ring */}
          <View style={styles.iconOuterRing}>
            {/* Inner ring */}
            <View style={styles.iconInnerRing}>
              {/* Icon glass container */}
              <View style={styles.iconGlassContainer}>
                <Ionicons
                  name={item.icon}
                  size={64}
                  color={COLORS.primaryContainer}
                />
              </View>
              {/* Floating orbit nodes */}
              <Animated.View
                style={[
                  styles.orbitNodeTop,
                  { transform: [{ scale: badgeScale }] },
                ]}
              >
                <Ionicons
                  name={index === 0 ? 'time-outline' : index === 1 ? 'business-outline' : index === 2 ? 'checkmark-circle-outline' : 'globe-outline'}
                  size={18}
                  color={COLORS.primaryContainer}
                />
              </Animated.View>
              <Animated.View
                style={[
                  styles.orbitNodeBottom,
                  { transform: [{ scale: badgeScale }] },
                ]}
              >
                <Ionicons
                  name={index === 0 ? 'cloud-upload-outline' : index === 1 ? 'easel-outline' : index === 2 ? 'warning-outline' : 'trending-up-outline'}
                  size={18}
                  color={COLORS.secondary}
                />
              </Animated.View>
            </View>
          </View>
        </Animated.View>

        {/* Text Content */}
        <Animated.View
          style={[
            styles.textContent,
            { transform: [{ translateY }], opacity },
          ]}
        >
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </Animated.View>

        {/* Feature Cards */}
        <Animated.View
          style={[
            styles.featureCard,
            { transform: [{ translateY }], opacity },
          ]}
        >
          <View style={styles.featureCardRow}>
            {item.features.map((feature, idx) => (
              <View key={idx} style={styles.featureItem}>
                <Ionicons
                  name={feature.icon}
                  size={20}
                  color={COLORS.primaryContainer}
                />
                <Text style={styles.featureLabel}>{feature.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <View style={styles.safeArea}>
        {/* Header - Skip Button (animated opacity) */}
        <View style={styles.header}>
          <Animated.View
            style={{
              opacity: scrollX.interpolate({
                inputRange: [
                  width * (onboardingPages.length - 2),
                  width * (onboardingPages.length - 1),
                ],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
            }}
          >
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* FlatList for horizontal scroll */}
        <FlatList
          ref={flatListRef}
          data={onboardingPages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          onMomentumScrollEnd={onMomentumEnd}
          scrollEventThrottle={16}
          bounces={false}
          style={styles.flatList}
        />

        {/* Footer */}
        <View style={styles.footer}>
          {/* Ambient glow */}
          <View style={styles.footerGlow} />
          
          {/* Pagination */}
          {renderPaginationDots()}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={styles.previousButton}
                onPress={() =>
                  flatListRef.current?.scrollToIndex({
                    index: currentIndex - 1,
                    animated: true,
                  })
                }
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={COLORS.onSurfaceVariant}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.9}
            >
              <Text style={styles.nextButtonText}>
                {currentIndex === onboardingPages.length - 1
                  ? 'Get Started'
                  : 'Next'}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={COLORS.onPrimaryContainer}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 64,
    zIndex: 10,
  },
  skipButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skipText: {
    color: COLORS.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  flatList: {
    flex: 1,
  },
  pageContainer: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconArea: {
    width: 192,
    height: 192,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconOuterRing: {
    width: 192,
    height: 192,
    borderRadius: 96,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
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
    position: 'relative',
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
  orbitNodeTop: {
    position: 'absolute',
    top: -10,
    right: -8,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitNodeBottom: {
    position: 'absolute',
    bottom: -12,
    left: -16,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.onBackground,
    letterSpacing: -0.56,
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.onBackground,
    letterSpacing: -0.56,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  featureCard: {
    backgroundColor: 'rgba(30, 30, 30, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainerHigh,
    padding: 16,
    width: '100%',
    maxWidth: 320,
    marginBottom: 16,
  },
  featureCardRow: {
    flexDirection: 'row',
    gap: 8,
  },
  featureItem: {
    flex: 1,
    height: 64,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  featureLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 8,
    marginBottom: 16,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    position: 'relative',
  },
  footerGlow: {
    position: 'absolute',
    bottom: -96,
    left: -96,
    width: 256,
    height: 256,
    backgroundColor: COLORS.primaryContainer,
    opacity: 0.05,
    borderRadius: 128,
    pointerEvents: 'none',
    zIndex: -1,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previousButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    flex: 1,
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
  nextButtonText: {
    color: COLORS.onPrimaryContainer,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
});