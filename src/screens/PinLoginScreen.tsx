import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useValidation, CommonRules, sanitizeInput } from '../utils/validation';
import { useNavigation } from '@react-navigation/native';
import { biometricService } from '../services/biometricService';

export default function PinLoginScreen() {
  const [userCode, setUserCode] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const { signIn } = useAuth();
  const navigation = useNavigation();

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
    // Only allow numbers
    const numericPin = text.replace(/[^0-9]/g, '');
    setPin(numericPin);
    if (getError('pin')) {
      validateField('pin', numericPin);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setFieldTouched('userCode');
      setFieldTouched('pin');

      const validationResult = validateForm({ userCode, pin });

      if (!validationResult.isValid) {
        Alert.alert('Validation Error', 'Please fix the errors and try again');
        return;
      }

      // Attempt to sign in with PIN
      const signInResult = await signIn({ user_code: userCode, pin });
      
      if (signInResult.error) {
        Alert.alert('Login Failed', signInResult.error.message || 'Invalid user code or PIN');
      } else {
        // Navigation will be handled by the auth state change
        console.log('Login successful');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAccess = () => {
    Alert.alert(
      'Admin Access',
      'Admin access is available through the user management system. Contact your system administrator.',
      [{ text: 'OK' }]
    );
  };

  const handleBiometricLogin = async () => {
    try {
      const biometricResult = await biometricService.authenticate('Use biometric to login');
      
      if (biometricResult.success) {
        // For demo purposes, use admin credentials
        const signInResult = await signIn({ user_code: 'A001', pin: '1234' });
        
        if (signInResult.error) {
          Alert.alert('Biometric Login Failed', signInResult.error.message || 'Authentication failed');
        }
      } else {
        Alert.alert('Biometric Authentication Failed', biometricResult.error || 'Please try again');
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      Alert.alert('Error', 'An unexpected error occurred during biometric authentication');
    }
  };

  // Check biometric availability on component mount
  React.useEffect(() => {
    const checkBiometric = async () => {
      const available = await biometricService.isAvailable();
      const enabled = await biometricService.isEnabled();
      setBiometricAvailable(available);
      setBiometricEnabled(enabled);
    };
    
    checkBiometric();
  }, []);

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.logo}
                />
              </View>
              <Text style={styles.welcomeText}>Welcome Back!</Text>
              <Text style={styles.subtitleText}>
                Enter your user code and PIN to access the system
              </Text>
            </View>

            {/* Login Form */}
            <View style={styles.formContainer}>
              {/* User Code Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>User Code</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person" size={20} color="rgba(255, 255, 255, 0.6)" style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.textInput,
                      hasError('userCode') && styles.inputError
                    ]}
                    placeholder="Enter your user code (e.g., A001)"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={userCode}
                    onChangeText={handleUserCodeChange}
                    onBlur={() => validateField('userCode', userCode)}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={10}
                  />
                </View>
                {hasError('userCode') && (
                  <Text style={styles.errorText}>{getError('userCode')}</Text>
                )}
              </View>

              {/* PIN Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>PIN</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed" size={20} color="rgba(255, 255, 255, 0.6)" style={styles.inputIcon} />
                  <TextInput
                    style={[
                      styles.textInput,
                      hasError('pin') && styles.inputError
                    ]}
                    placeholder="Enter your PIN"
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={pin}
                    onChangeText={handlePinChange}
                    onBlur={() => validateField('pin', pin)}
                    secureTextEntry={!showPin}
                    keyboardType="numeric"
                    maxLength={6}
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

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              {/* Biometric Login Button */}
              {biometricAvailable && (
                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={handleBiometricLogin}
                  disabled={loading}
                >
                  <Ionicons name="finger-print" size={24} color="#ffffff" />
                  <Text style={styles.biometricButtonText}>
                    Login with Biometric
                  </Text>
                </TouchableOpacity>
              )}

              {/* Help Section */}
              <View style={styles.helpContainer}>
                <Text style={styles.helpTitle}>Need Help?</Text>
                <Text style={styles.helpText}>
                  Contact your station manager if you need assistance with your user code or PIN.
                </Text>
                <TouchableOpacity 
                  style={styles.adminButton}
                  onPress={handleAdminAccess}
                >
                  <Text style={styles.adminButtonText}>Admin Access</Text>
                </TouchableOpacity>
              </View>

              {/* Demo Users Section */}
              <View style={styles.demoContainer}>
                <Text style={styles.demoTitle}>Demo Users</Text>
                <Text style={styles.demoText}>
                  For testing purposes, you can use these demo credentials:
                </Text>
                <View style={styles.demoCredentials}>
                  <Text style={styles.demoCredential}>Admin: A001 / 1234</Text>
                  <Text style={styles.demoCredential}>Manager: A002 / 1234</Text>
                  <Text style={styles.demoCredential}>Cashier: A003 / 1234</Text>
                  <Text style={styles.demoCredential}>Viewer: A004 / 1234</Text>
                </View>
              </View>
            </View>
          </ScrollView>
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
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
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
  loginButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: 'bold',
  },
  biometricButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  biometricButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  helpContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 16,
  },
  adminButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  adminButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  demoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 16,
  },
  demoCredentials: {
    gap: 8,
  },
  demoCredential: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 6,
  },
});


