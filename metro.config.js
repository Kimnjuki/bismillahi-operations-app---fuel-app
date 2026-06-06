const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for all platforms
config.resolver.platforms = ['ios', 'android', 'web'];

// Ensure proper asset resolution
config.resolver.assetExts.push(
  // Add any additional asset extensions your app uses
  'db', 'mp3', 'ttf', 'obj', 'png', 'jpg'
);

module.exports = config;
