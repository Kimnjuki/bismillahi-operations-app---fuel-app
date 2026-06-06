import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function WelcomeOnboardingScreen() {
  const navigation = useNavigation();
  const [currentPage, setCurrentPage] = useState(0);

  const onboardingPages = [
    {
      title: 'Welcome to',
      subtitle: 'BISMILLAHI OPERATIONS',
      description: 'Your comprehensive petroleum station management solution',
      icon: '🏭',
      features: [
        'Real-time sales tracking',
        'Inventory management',
        'Financial reporting',
        'Multi-user access control'
      ],
      color: ['#667eea', '#764ba2']
    },
    {
      title: 'Sales',
      subtitle: 'Management',
      description: 'Efficiently record and track all fuel sales transactions',
      icon: '⛽',
      features: [
        'Pump sales recording',
        'Drum sales tracking',
        'Payment method support',
        'Receipt generation'
      ],
      color: ['#FF6B6B', '#FF8E8E']
    },
    {
      title: 'Inventory',
      subtitle: 'Control',
      description: 'Monitor stock levels and manage fuel inventory',
      icon: '📦',
      features: [
        'Stock level monitoring',
        'Low stock alerts',
        'Variance tracking',
        'Automatic reorder points'
      ],
      color: ['#4ECDC4', '#44A08D']
    },
    {
      title: 'Financial',
      subtitle: 'Reporting',
      description: 'Comprehensive financial insights and reporting',
      icon: '📊',
      features: [
        'Daily sales reports',
        'Expense tracking',
        'Profit analysis',
        'Export capabilities'
      ],
      color: ['#42A5F5', '#64B5F6']
    }
  ];

  const handleNext = () => {
    if (currentPage < onboardingPages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      (navigation as any).navigate('Welcome');
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSkip = () => {
    (navigation as any).navigate('Welcome');
  };

  const renderPageIndicator = () => (
    <View style={styles.pageIndicator}>
      {onboardingPages.map((_, index) => (
        <View
          key={index}
          style={[
            styles.indicatorDot,
            index === currentPage && styles.activeDot
          ]}
        />
      ))}
    </View>
  );

  const renderFeatureList = (features: string[]) => (
    <View style={styles.featuresContainer}>
      {features.map((feature, index) => (
        <View key={index} style={styles.featureItem}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}
    </View>
  );

  const currentPageData = onboardingPages[currentPage];

  return (
    <LinearGradient colors={currentPageData.color as any} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>{currentPageData.icon}</Text>
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{currentPageData.title}</Text>
            <Text style={styles.subtitle}>{currentPageData.subtitle}</Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>{currentPageData.description}</Text>

          {/* Features */}
          {renderFeatureList(currentPageData.features)}

          {/* Page Indicator */}
          {renderPageIndicator()}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.buttonContainer}>
            {currentPage > 0 && (
              <TouchableOpacity 
                style={styles.previousButton}
                onPress={handlePrevious}
              >
                <Ionicons name="chevron-back" size={24} color="#ffffff" />
                <Text style={styles.previousButtonText}>Previous</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>
                {currentPage === onboardingPages.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              <Ionicons name="chevron-forward" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconText: {
    fontSize: 80,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  featuresContainer: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  featureText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 12,
    flex: 1,
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#ffffff',
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  previousButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 5,
  },
});