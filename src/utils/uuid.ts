import * as Crypto from 'expo-crypto';

/**
 * Generate a UUID v4 using expo-crypto (cryptographically secure)
 */
export const generateUUID = (): string => {
  return Crypto.randomUUID();
};

/**
 * Generate a prefixed UUID for specific use cases
 */
export const generatePrefixedUUID = (prefix: string): string => {
  return `${prefix}_${generateUUID()}`;
};

/**
 * Generate a short UUID for asset IDs
 */
export const generateAssetId = (): string => {
  return `asset_${generateUUID()}`;
};

/**
 * Generate a short UUID for security events
 */
export const generateSecurityId = (): string => {
  return generateUUID();
};


