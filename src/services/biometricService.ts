import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricResult {
  success: boolean;
  error?: string;
}

class BiometricService {
  /**
   * Check if biometric authentication is available on the device
   */
  async isAvailable(): Promise<boolean> {
    try {
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
  async getSupportedTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.error('Error getting supported biometric types:', error);
      return [];
    }
  }

  /**
   * Check if specific biometric type is available
   */
  async isBiometricTypeAvailable(type: LocalAuthentication.AuthenticationType): Promise<boolean> {
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
