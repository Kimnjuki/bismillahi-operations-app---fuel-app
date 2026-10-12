const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
  ],
    transformIgnorePatterns: [
      'node_modules/(?!(react-native|@react-native|@react-navigation|expo|@expo|expo-modules-core|expo-image-picker|@supabase|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|@react-native-async-storage|@react-native-community|react-native-vector-icons|expo-crypto|expo-constants|expo-device|expo-secure-store)/)',
    ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/index.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/*.test.(ts|tsx|js)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Some services kick off async work (network listeners, auto-sync timers)
  // that can still be settling when a worker finishes. forceExit makes Jest
  // exit workers gracefully after the run instead of force-killing them and
  // printing the "worker process has failed to exit gracefully" warning.
  forceExit: true,
};