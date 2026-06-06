import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { helpService, OnboardingStep } from '../services/helpService';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const { appUser } = useAuth();
  const navigation = useNavigation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOnboardingSteps();
  }, []);

  const loadOnboardingSteps = async () => {
    setLoading(true);
    try {
      const onboardingSteps = await helpService.getOnboardingSteps();
      setSteps(onboardingSteps);
      
      const progressData = await helpService.getOnboardingProgress();
      setProgress(progressData);
    } catch (error) {
      console.error('Load onboarding steps error:', error);
      Alert.alert('Error', 'Failed to load onboarding steps');
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = async (stepId: string) => {
    try {
      const completed = await helpService.completeOnboardingStep(stepId);
      if (completed) {
        await loadOnboardingSteps(); // Refresh progress
        Alert.alert('Great!', 'Step completed successfully!');
      }
    } catch (error) {
      console.error('Complete step error:', error);
      Alert.alert('Error', 'Failed to complete step');
    }
  };

  const handleSkipOnboarding = async () => {
    Alert.alert(
      'Skip Onboarding',
      'Are you sure you want to skip the onboarding process? You can always complete it later from the help section.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            try {
              // Mark all required steps as completed to skip onboarding
              for (const step of steps.filter(s => s.required)) {
                await helpService.completeOnboardingStep(step.id);
              }
              navigation.goBack();
            } catch (error) {
              console.error('Skip onboarding error:', error);
            }
          },
        },
      ]
    );
  };

  const handleFinishOnboarding = async () => {
    try {
      // Complete any remaining required steps
      for (const step of steps.filter(s => s.required && !s.completed)) {
        await helpService.completeOnboardingStep(step.id);
      }
      
      Alert.alert(
        'Congratulations!',
        'You have completed the onboarding process. You\'re now ready to use the system effectively!',
        [
          {
            text: 'Continue',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Finish onboarding error:', error);
    }
  };

  const renderStepCard = (step: OnboardingStep, index: number) => (
    <View key={step.id} style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={[
          styles.stepNumber,
          step.completed ? styles.completedStepNumber : styles.pendingStepNumber,
        ]}>
          <Text style={[
            styles.stepNumberText,
            step.completed ? styles.completedStepNumberText : styles.pendingStepNumberText,
          ]}>
            {step.completed ? '✓' : index + 1}
          </Text>
        </View>
        <View style={styles.stepInfo}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepDescription}>{step.description}</Text>
          {step.required && (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredBadgeText}>Required</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.stepActions}>
        {step.completed ? (
          <View style={styles.completedIndicator}>
            <Text style={styles.completedText}>✓ Completed</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleStepComplete(step.id)}
          >
            <Text style={styles.completeButtonText}>Mark Complete</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.navigateButton}
          onPress={() => (navigation as any).navigate(step.screen as any)}
        >
          <Text style={styles.navigateButtonText}>
            {step.completed ? 'Review' : 'Start'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Onboarding Progress</Text>
        <Text style={styles.progressText}>
          {progress.completed} of {progress.total} steps completed
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[
          styles.progressFill,
          { width: `${progress.percentage}%` }
        ]} />
      </View>
      <Text style={styles.progressPercentage}>{progress.percentage}%</Text>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading onboarding...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const allRequiredStepsCompleted = steps
    .filter(step => step.required)
    .every(step => step.completed);

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Getting Started</Text>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipOnboarding}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {renderProgressBar()}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => renderStepCard(step, index))}
          </View>
        </ScrollView>

        {allRequiredStepsCompleted && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.finishButton}
              onPress={handleFinishOnboarding}
            >
              <Text style={styles.finishButtonText}>Finish Onboarding</Text>
            </TouchableOpacity>
          </View>
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  skipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  progressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  progressText: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  stepsContainer: {
    paddingHorizontal: 20,
  },
  stepCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  completedStepNumber: {
    backgroundColor: '#4CAF50',
  },
  pendingStepNumber: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  completedStepNumberText: {
    color: '#ffffff',
  },
  pendingStepNumberText: {
    color: '#ffffff',
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  stepDescription: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
    lineHeight: 20,
    marginBottom: 8,
  },
  requiredBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  requiredBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stepActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedIndicator: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  navigateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navigateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
  },
  finishButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
