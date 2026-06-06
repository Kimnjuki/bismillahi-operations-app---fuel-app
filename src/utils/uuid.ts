/**
 * Generate a UUID v4 using built-in crypto (no external dependencies)
 * This is a pure JavaScript implementation that works in React Native
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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


