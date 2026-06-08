import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

export default function PinSetupScreen() {
  const navigation = useNavigation();
  const { setupPin } = useAuth();
  const [pin, setPinState] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const pinInputRef = useRef<TextInput>(null);
  const confirmPinInputRef = useRef<TextInput>(null);

  const handlePinChange = (text: string) => {
    // Only allow numeric input and limit to 4 digits
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 4) {
      setPinState(numericText);
    }
  };

  const handleConfirmPinChange = (text: string) => {
    // Only allow numeric input and limit to 4 digits
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 4) {
      setConfirmPin(numericText);
    }
  };

  const handleSetupPin = async () => {
    if (pin.length !== 4) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('PIN Mismatch', 'PIN and confirmation do not match');
      return;
    }

    // Check for weak PINs
    if (pin === '0000' || pin === '1111' || pin === '1234' || pin === '9999') {
      Alert.alert(
        'Weak PIN',
        'Please choose a stronger PIN for better security',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue Anyway', onPress: () => proceedWithPin() }
        ]
      );
      return;
    }

    proceedWithPin();
  };

  const proceedWithPin = async () => {
    try {
      setLoading(true);
      await setupPin({ user_code: '', pin, confirm_pin: confirmPin });
      Alert.alert(
        'PIN Setup Complete',
        'Your PIN has been set successfully. You can now use it to access the app.',
        [
          {
            text: 'Continue',
            onPress: () => navigation.navigate('Dashboard' as never)
          }
        ]
      );
    } catch (error) {
      console.error('PIN setup error:', error);
      Alert.alert('Error', 'Failed to setup PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPinDots = (pinValue: string, isConfirm: boolean = false) => {
    const dots = [];
    for (let i = 0; i < 4; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.pinDot,
            i < pinValue.length && styles.pinDotFilled
          ]}
        />
      );
    }
    return dots;
  };

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Setup PIN</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="lock-closed" size={40} color="#667eea" />
              </View>
            </View>

            <Text style={styles.title}>Create Your PIN</Text>
            <Text style={styles.subtitle}>
              Set a 4-digit PIN to secure your account
            </Text>

            {/* PIN Input Section */}
            <View style={styles.pinSection}>
              <Text style={styles.pinLabel}>Enter PIN</Text>
              <View style={styles.pinContainer}>
                {renderPinDots(pin)}
              </View>
              <TextInput
                ref={pinInputRef}
                style={styles.hiddenInput}
                value={pin}
                onChangeText={handlePinChange}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry={!showPin}
                autoFocus
                onFocus={() => setShowPin(true)}
                onBlur={() => setShowPin(false)}
              />
            </View>

            {/* Confirm PIN Input Section */}
            <View style={styles.pinSection}>
              <Text style={styles.pinLabel}>Confirm PIN</Text>
              <View style={styles.pinContainer}>
                {renderPinDots(confirmPin, true)}
              </View>
              <TextInput
                ref={confirmPinInputRef}
                style={styles.hiddenInput}
                value={confirmPin}
                onChangeText={handleConfirmPinChange}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry={!showConfirmPin}
                onFocus={() => setShowConfirmPin(true)}
                onBlur={() => setShowConfirmPin(false)}
              />
            </View>

            {/* Security Tips */}
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Security Tips:</Text>
              <Text style={styles.tipText}>• Use a unique 4-digit PIN</Text>
              <Text style={styles.tipText}>• Avoid common patterns like 1234</Text>
              <Text style={styles.tipText}>• Don't share your PIN with others</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.setupButton,
                (pin.length !== 4 || confirmPin.length !== 4) && styles.setupButtonDisabled
              ]}
              onPress={handleSetupPin}
              disabled={pin.length !== 4 || confirmPin.length !== 4 || loading}
            >
              <Text style={styles.setupButtonText}>
                {loading ? 'Setting up...' : 'Setup PIN'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  pinSection: {
    marginBottom: 30,
  },
  pinLabel: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '600',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 8,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  hiddenInput: {
    position: 'absolute',
    left: -9999,
    opacity: 0,
  },
  tipsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  setupButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  setupButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    shadowOpacity: 0.1,
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },
});