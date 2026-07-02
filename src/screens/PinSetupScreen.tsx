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
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useValidation, CommonRules, sanitizeInput } from '../utils/validation';

type RootStackParamList = {
  PinSetup: { accessCode: string; userName: string };
};

export default function PinSetupScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PinSetup'>>();
  const { setupPin, signIn } = useAuth();
  const preFilledCode = route.params?.accessCode ?? '';
  const userName = route.params?.userName ?? '';
  const [userCode, setUserCode] = useState(preFilledCode);
  const [pin, setPinState] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const pinInputRef = useRef<TextInput>(null);
  const confirmPinInputRef = useRef<TextInput>(null);
  const userCodeInputRef = useRef<TextInput>(null);

  // Validation rules
  const validationRules = {
    userCode: [
      CommonRules.required('User code is required'),
      {
        minLength: 3,
        message: 'User code must be at least 3 characters',
      },
    ],
    pin: [
      CommonRules.required('PIN is required'),
      {
        minLength: 4,
        message: 'PIN must be at least 4 digits',
      },
    ],
    confirmPin: [
      CommonRules.required('Confirm PIN is required'),
      {
        minLength: 4,
        message: 'Confirm PIN must be at least 4 digits',
      },
    ],
  };

  const {
    errors,
    touched,
    validate: validateForm,
    validateField,
    setFieldTouched,
    hasError,
    getError,
  } = useValidation(validationRules);

  const handleUserCodeChange = (text: string) => {
    const sanitized = sanitizeInput.text(text).toUpperCase();
    setUserCode(sanitized);
    if (getError('userCode')) {
      validateField('userCode', sanitized);
    }
  };

  const handlePinChange = (text: string) => {
    // Only allow numeric input and limit to 4 digits
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 4) {
      setPinState(numericText);
    }
    if (getError('pin')) {
      validateField('pin', numericText);
    }
  };

  const handleConfirmPinChange = (text: string) => {
    // Only allow numeric input and limit to 4 digits
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 4) {
      setConfirmPin(numericText);
    }
    if (getError('confirmPin')) {
      validateField('confirmPin', numericText);
    }
  };

  const handleSetupPin = async () => {
    setFieldTouched('userCode');
    setFieldTouched('pin');
    setFieldTouched('confirmPin');

    const validationResult = validateForm({ userCode, pin, confirmPin });

    if (!validationResult.isValid) {
      Alert.alert('Validation Error', 'Please fix the errors and try again');
      return;
    }

    try {
      setLoading(true);
      await setupPin({ user_code: userCode, pin, confirm_pin: confirmPin });
      // Now sign in to cache the user and set isAuthenticated
      const signInResult = await signIn({ user_code: userCode, pin });
      if (signInResult.error) {
        throw new Error(signInResult.error.message || 'Failed to sign in');
      }
      Alert.alert(
        'PIN Setup Complete',
        'Your PIN has been set successfully. You can now use it to access the app.',
        [
          {
            text: 'Continue',
            onPress: () => (navigation as any).navigate('Main')
          }
        ]
      );
    } catch (error) {
      console.error('PIN setup error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to setup PIN. Please try again.');
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
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
              {userName ? (
                <Text style={styles.subtitle}>Setting up PIN for {userName}</Text>
              ) : (
                <Text style={styles.subtitle}>
                  Set a 4-digit PIN to secure your account
                </Text>
              )}

              {/* User Code Input Section */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>User Code</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person" size={20} color="rgba(255, 255, 255, 0.6)" style={styles.inputIcon} />
                  <TextInput
                    ref={userCodeInputRef}
                    style={[
                      styles.textInput,
                      hasError('userCode') && styles.inputError,
                    ]}
                    placeholder="Enter your user code (e.g., A001)"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={userCode}
                    onChangeText={handleUserCodeChange}
                    onBlur={() => validateField('userCode', userCode)}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={10}
                    editable={!preFilledCode}
                  />
                </View>
                {hasError('userCode') && (
                  <Text style={styles.errorText}>{getError('userCode')}</Text>
                )}
              </View>

              {/* PIN Input Section */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Enter PIN</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed" size={20} color="rgba(255, 255, 255, 0.6)" style={styles.inputIcon} />
                  <TextInput
                    ref={pinInputRef}
                    style={[
                      styles.textInput,
                      hasError('pin') && styles.inputError
                    ]}
                    placeholder="Enter your PIN"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={pin}
                    onChangeText={handlePinChange}
                    onBlur={() => validateField('pin', pin)}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry={!showPin}
                    autoFocus
                    onFocus={() => setShowPin(true)}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPin(!showPin)}
                  >
                    <Ionicons 
                      name={showPin ? "eye-off" : "eye"} 
                      size={20} 
                      color="rgba(255, 255, 255, 0.6)" 
                    />
                  </TouchableOpacity>
                </View>
                {hasError('pin') && (
                  <Text style={styles.errorText}>{getError('pin')}</Text>
                )}
              </View>

              {/* Confirm PIN Input Section */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Confirm PIN</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed" size={20} color="rgba(255, 255, 255, 0.6)" style={styles.inputIcon} />
                  <TextInput
                    ref={confirmPinInputRef}
                    style={[
                      styles.textInput,
                      hasError('confirmPin') && styles.inputError
                    ]}
                    placeholder="Confirm your PIN"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={confirmPin}
                    onChangeText={handleConfirmPinChange}
                    onBlur={() => validateField('confirmPin', confirmPin)}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry={!showConfirmPin}
                    onFocus={() => setShowConfirmPin(true)}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPin(!showConfirmPin)}
                  >
                    <Ionicons 
                      name={showConfirmPin ? "eye-off" : "eye"} 
                      size={20} 
                      color="rgba(255, 255, 255, 0.6)" 
                    />
                  </TouchableOpacity>
                </View>
                {hasError('confirmPin') && (
                  <Text style={styles.errorText}>{getError('confirmPin')}</Text>
                )}
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
                  (userCode.length === 0 || pin.length !== 4 || confirmPin.length !== 4) && styles.setupButtonDisabled
                ]}
                onPress={handleSetupPin}
                disabled={userCode.length === 0 || pin.length !== 4 || confirmPin.length !== 4 || loading}
              >
                <Text style={styles.setupButtonText}>
                  {loading ? 'Setting up...' : 'Setup PIN'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
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
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingLeft: 50,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flex: 1,
  },
  inputError: {
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 4,
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
  // We keep the pinSection, pinContainer, pinDot, pinDotFilled, hiddenInput for backward compatibility? 
  // But we are not using them anymore. We can remove them or leave them.
  // We'll leave them for now in case we need them, but note we are not using them.
  pinSection: {
    marginBottom: 30,
  },
  pinLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 15,
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
});