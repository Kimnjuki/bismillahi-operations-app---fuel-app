export interface BiometricResult {
  success: boolean;
  error?: string;
}

// Safe require for expo-local-authentication
// This allows the app to run in Expo Go where this module is not available
// Using require() instead of dynamic import() to avoid Metro async-require issues
let LocalAuthentication: typeof import('expo-local-authentication') | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  LocalAuthentication = require('expo-local-authentication');
} catch (error) {
  console.warn('expo-local-authentication is not available in this environment (Expo Go)');
  LocalAuthentication = null;
}

class BiometricService {
  /**
   * Check if biometric authentication is available on the device
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!LocalAuthentication) {
        return false;
      }
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Check if biometric authentication is enabled in app settings
   */
  async isEnabled(): Promise<boolean> {
    try {
      // For now, we'll assume it's enabled if available
      // In a real app, you'd store this preference in AsyncStorage
      return await this.isAvailable();
    } catch (error) {
      console.error('Error checking biometric enabled status:', error);
      return false;
    }
  }

  /**
   * Authenticate using biometrics
   */
  async authenticate(reason: string = 'Authenticate to continue'): Promise<BiometricResult> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device'
        };
      }

      if (!LocalAuthentication) {
        return {
          success: false,
          error: 'Biometric authentication is not supported in this environment'
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Authentication failed'
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during authentication'
      };
    }
  }

  /**
   * Get available biometric types
   */
  async getSupportedTypes(): Promise<any[]> {
    try {
      if (!LocalAuthentication) {
        return [];
      }
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.error('Error getting supported biometric types:', error);
      return [];
    }
  }

  /**
   * Check if specific biometric type is available
   */
  async isBiometricTypeAvailable(type: any): Promise<boolean> {
    try {
      const types = await this.getSupportedTypes();
      return types.includes(type);
    } catch (error) {
      console.error('Error checking biometric type availability:', error);
      return false;
    }
  }
}

export const biometricService = new BiometricService();
