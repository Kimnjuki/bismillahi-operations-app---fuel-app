import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

type RootStackParamList = {
  Auth: { accessCode?: string };
  PinEntry: { accessCode: string; userName: string };
  PinSetup: { accessCode: string; userName: string };
  WelcomeOnboarding: undefined;
};

const COLORS = {
  background: '#121212',
  surfaceContainerLowest: '#0e0e0e',
  surfaceContainerLow: '#1c1b1b',
  surfaceContainer: '#201f1f',
  surfaceContainerHigh: '#2a2a2a',
  surfaceVariant: '#353534',
  outlineVariant: '#514532',
  primaryContainer: '#ffb300',
  onPrimary: '#432c00',
  onPrimaryContainer: '#6b4900',
  onBackground: '#e5e2e1',
  onSurface: '#e5e2e1',
  onSurfaceVariant: '#d6c4ac',
  primary: '#ffd79b',
};

export default function AuthScreen() {
  const [loginMode, setLoginMode] = useState<'staff' | 'management'>('staff');
  const [accessCode, setAccessCode] = useState('');
  const [userName, setUserName] = useState('');
  const [checkingUser, setCheckingUser] = useState(false);
  const navigation = useNavigation();
  const { findUserByCode } = useAuth();
  const route = useRoute<RouteProp<RootStackParamList, 'Auth'>>();

  useEffect(() => {
    if (route.params?.accessCode) {
      setAccessCode(route.params.accessCode);
    }
  }, [route.params]);

  const handleContinue = async () => {
    if (accessCode.trim().length === 0) {
      return;
    }
    setCheckingUser(true);
    try {
      const { data, error } = await findUserByCode(accessCode.trim());
      if (error || !data) {
        Alert.alert('Invalid Access Code', 'The code you entered was not found. Please try again.');
        setCheckingUser(false);
        return;
      }
      const name = data.full_name || accessCode.trim();
      const hasPin = !!data.pin_hash;
      setUserName(name);
      if (hasPin) {
        (navigation as any).navigate('PinEntry', { accessCode: accessCode.trim(), userName: name });
      } else {
        (navigation as any).navigate('PinSetup', { accessCode: accessCode.trim(), userName: name });
      }
    } catch {
      Alert.alert('Error', 'Failed to verify access code. Please try again.');
    } finally {
      setCheckingUser(false);
    }
  };

  return (
    <View style={styles.container}>
        {/* Header Navigation */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="shield" size={24} color={COLORS.primaryContainer} />
            <Text style={styles.logoText}>Fuelr</Text>
          </View>
          <View style={styles.headerRight}>
            <Ionicons name="help-outline" size={24} color={COLORS.onSurfaceVariant} />
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Branding */}
          <View style={styles.branding}>
            <Text style={styles.welcomeText}>Welcome to Fuelr</Text>
            <Text style={styles.subtitleText}>Precision energy logistics and station management.</Text>
          </View>

          {/* Login Container */}
          <View style={styles.loginContainer}>
            <View style={styles.gradientOverlay} />

            {/* Toggle Selector */}
            <View style={styles.toggleContainer}>
              <View style={[
                styles.toggleIndicator,
                loginMode === 'staff' ? styles.toggleIndicatorStaff : styles.toggleIndicatorMgmt,
              ]} />
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setLoginMode('staff')}
              >
                <Text style={[
                  styles.toggleText,
                  loginMode === 'staff' ? styles.toggleTextActive : styles.toggleTextInactive,
                ]}>
                  Station Staff
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setLoginMode('management')}
              >
                <Text style={[
                  styles.toggleText,
                  loginMode === 'management' ? styles.toggleTextActive : styles.toggleTextInactive,
                ]}>
                  Management
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInputWithLabel
                  label={loginMode === 'staff' ? 'Enter Staff ID' : 'Enter Admin Email'}
                  value={accessCode}
                  onChangeText={setAccessCode}
                  placeholder="Access Code"
                />
                <View style={styles.inputIcon}>
                  <Ionicons name="key" size={20} color="rgba(255, 255, 255, 0.6)" />
                </View>
              </View>
              <View style={styles.inputHelperRow}>
                <Text style={styles.inputHelper}>6-digit alphanumeric code</Text>
                <TouchableOpacity>
                  <Text style={styles.forgotLink}>Forgot ID?</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Action */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                (accessCode.trim().length === 0 || checkingUser) && styles.continueButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={accessCode.trim().length === 0 || checkingUser}
            >
              {checkingUser ? (
                <ActivityIndicator size="small" color={COLORS.onPrimaryContainer} />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={24} color={COLORS.onPrimaryContainer} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Meta */}
          <View style={styles.footerMeta}>
            <View style={styles.systemStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>System Online</Text>
            </View>
            <Text style={styles.versionText}>
              Version 4.2.0-Prime • Secure Auth
            </Text>
          </View>
        </View>
      </View>
  );
}

function TextInputWithLabel({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const isEmpty = value.length === 0;

  return (
    <View>
      <Text style={[
        styles.floatingLabel,
        (!isEmpty || isFocused) && styles.floatingLabelActive,
      ]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.textInput,
          isFocused && styles.textInputFocused,
        ]}
        placeholder={placeholder}
        placeholderTextColor={isEmpty ? COLORS.onSurfaceVariant : 'transparent'}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    backgroundColor: COLORS.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.primaryContainer,
    letterSpacing: -0.02,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 48,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.onSurface,
    letterSpacing: -0.02,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
    marginTop: 8,
  },
  loginContainer: {
    width: '100%',
    maxWidth: 448,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 12,
    padding: 24,
    gap: 24,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.primaryContainer,
    opacity: 0.5,
  },
  toggleContainer: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 8,
    flexDirection: 'row',
    position: 'relative',
    padding: 4,
  },
  toggleIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '48%',
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleIndicatorStaff: {
    left: 4,
  },
  toggleIndicatorMgmt: {
    left: '52%',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    zIndex: 1,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.05,
  },
  toggleTextActive: {
    color: COLORS.onPrimaryContainer,
  },
  toggleTextInactive: {
    color: COLORS.onSurfaceVariant,
  },
  inputContainer: {
    gap: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  floatingLabel: {
    position: 'absolute',
    left: 16,
    top: 16,
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.onSurfaceVariant,
    zIndex: 1,
    pointerEvents: 'none',
  },
  floatingLabelActive: {
    top: 4,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primaryContainer,
    letterSpacing: 0.05,
  },
  textInput: {
    height: 56,
    backgroundColor: COLORS.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(158, 142, 120, 0.5)',
    borderRadius: 8,
    paddingHorizontal: 48,
    fontSize: 16,
    color: COLORS.onSurface,
  },
  textInputFocused: {
    borderColor: COLORS.primaryContainer,
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  inputHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  inputHelper: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(214, 196, 172, 0.6)',
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primaryContainer,
    textDecorationLine: 'underline',
  },
  continueButton: {
    height: 48,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(255, 179, 0, 0.5)',
    shadowOpacity: 0.1,
  },
  continueButtonText: {
    color: COLORS.onPrimaryContainer,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  footerMeta: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    marginTop: 48,
  },
  systemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(121, 255, 91, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(121, 255, 91, 0.2)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryContainer,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primaryContainer,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(214, 196, 172, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
});