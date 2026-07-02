import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

type RootStackParamList = {
  PinEntry: { accessCode: string; userName?: string };
};

const COLORS = {
  background: '#121212',
  surfaceContainerLowest: '#0e0e0e',
  surfaceContainerLow: '#1c1b1b',
  surfaceContainer: '#201f1f',
  surfaceContainerHigh: '#2a2a2a',
  surfaceVariant: '#353534',
  outlineVariant: '#514532',
  outline: '#9e8e78',
  primaryContainer: '#ffb300',
  primary: '#ffba38',
  onPrimaryContainer: '#6b4900',
  onBackground: '#e5e2e1',
  onSurface: '#e5e2e1',
  onSurfaceVariant: '#d6c4ac',
  error: '#ffb4ab',
  onError: '#690005',
};

const MAX_PIN_LENGTH = 6;

export default function PinEntryScreen() {
  const [pin, setPin] = useState('');
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PinEntry'>>();
  const { signIn, appUser } = useAuth();
  const accessCode = route.params?.accessCode ?? '';
  const userNameFromRoute = route.params?.userName ?? '';

  const handlePinPress = (num: string) => {
    if (pin.length < MAX_PIN_LENGTH) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === MAX_PIN_LENGTH) {
        handleVerifyPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleVerifyPin = async (pinValue: string) => {
    try {
      const result = await signIn({ user_code: accessCode, pin: pinValue });
      if (result.error) {
        Alert.alert('Incorrect PIN', 'Please try again');
        setPin('');
      }
      // Navigation handled by auth state
    } catch {
      Alert.alert('Error', 'An unexpected error occurred');
      setPin('');
    }
  };

  const handleForgotPin = () => {
    Alert.alert(
      'Forgot PIN',
      'Please contact your station manager or system administrator to reset your PIN.',
      [{ text: 'OK' }]
    );
  };

  const renderPinDots = () => {
    const dots = [];
    for (let i = 0; i < MAX_PIN_LENGTH; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.pinDot,
            i < pin.length && styles.pinDotActive,
          ]}
        />
      );
    }
    return dots;
  };

  const renderKeypadButton = (label: string, onPress: () => void, style?: any, textStyle?: any) => (
    <TouchableOpacity
      style={[styles.keypadBtn, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.keypadBtnText, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
        {/* Top Navigation Anchor */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Ionicons name="shield" size={24} color={COLORS.primaryContainer} />
              <Text style={styles.logoText}>Fuelr</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerIconBtn}>
                <Ionicons name="help-outline" size={24} color={COLORS.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Profile Snapshot */}
          <View style={styles.profileSnapshot}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarOuterRing}>
                <View style={styles.avatarInnerRing}>
                  <View style={styles.avatarGlass}>
                    <Ionicons name="person" size={48} color={COLORS.primaryContainer} />
                  </View>
                </View>
              </View>
            </View>
            <Text style={styles.welcomeText}>
              Welcome back, <Text style={styles.welcomeName}>{appUser?.full_name || userNameFromRoute || 'User'}</Text>
            </Text>
            <Text style={styles.stationText}>
              {accessCode || 'Station'} | Zone
            </Text>
          </View>

          {/* PIN Display Section */}
          <View style={styles.pinSection}>
            <View style={styles.pinDisplay}>{renderPinDots()}</View>

            {/* Custom Numeric Keypad */}
            <View style={styles.keypad}>
              {renderKeypadButton('1', () => handlePinPress('1'))}
              {renderKeypadButton('2', () => handlePinPress('2'))}
              {renderKeypadButton('3', () => handlePinPress('3'))}
              {renderKeypadButton('4', () => handlePinPress('4'))}
              {renderKeypadButton('5', () => handlePinPress('5'))}
              {renderKeypadButton('6', () => handlePinPress('6'))}
              {renderKeypadButton('7', () => handlePinPress('7'))}
              {renderKeypadButton('8', () => handlePinPress('8'))}
              {renderKeypadButton('9', () => handlePinPress('9'))}
              {renderKeypadButton(
                'Clear',
                handleClear,
                styles.keypadBtnClear,
                styles.keypadBtnClearText
              )}
              {renderKeypadButton('0', () => handlePinPress('0'))}
              {renderKeypadButton(
                '',
                handleBackspace,
                styles.keypadBtnIcon,
                null
              )}
            </View>

            {/* Footer Actions */}
            <View style={styles.footerActions}>
              <TouchableOpacity onPress={handleForgotPin}>
                <Text style={styles.forgotText}>Forgot PIN / Request Admin Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bottom Navigation Shell */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navButtonActive}>
            <View style={styles.navButtonCircle}>
              <Ionicons name="log-in" size={24} color={COLORS.onPrimaryContainer} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton}>
            <Ionicons name="help-outline" size={24} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton}>
            <Ionicons name="information-outline" size={24} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.outlineVariant,
    zIndex: 50,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 64,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
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
  headerIconBtn: {
    padding: 8,
    borderRadius: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 96,
    paddingBottom: 128,
    paddingHorizontal: 20,
  },
  profileSnapshot: {
    alignItems: 'center',
    marginBottom: 48,
  },
  avatarContainer: {
    marginBottom: 24,
  },
  avatarOuterRing: {
    width: 192,
    height: 192,
    borderRadius: 96,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInnerRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    opacity: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlass: {
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
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  welcomeName: {
    color: COLORS.primaryContainer,
  },
  stationText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    marginTop: 4,
    textAlign: 'center',
  },
  pinSection: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  pinDisplay: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 48,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.outline,
    backgroundColor: 'transparent',
  },
  pinDotActive: {
    backgroundColor: COLORS.primaryContainer,
    borderColor: COLORS.primaryContainer,
    shadowColor: COLORS.primaryContainer,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    transform: [{ scale: 1.1 }],
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  keypadBtn: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadBtnText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  keypadBtnClear: {
    backgroundColor: COLORS.surfaceContainerLow,
  },
  keypadBtnClearText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
  },
  keypadBtnIcon: {
    backgroundColor: COLORS.surfaceContainerLow,
  },
  footerActions: {
    marginTop: 48,
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.05,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 50,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navButtonActive: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navButtonCircle: {
    backgroundColor: COLORS.primaryContainer,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});