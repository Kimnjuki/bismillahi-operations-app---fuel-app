const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for all platforms
config.resolver.platforms = ['ios', 'android', 'web'];

// Ensure proper asset resolution
config.resolver.assetExts.push(
  // Add any additional asset extensions your app uses
  'db', 'mp3', 'ttf', 'obj', 'png', 'jpg'
);

// Watch only source paths Metro needs, avoid scanning the whole workspace
config.watchFolders = [
  `${__dirname}/src`,
  `${__dirname}/assets`,
  `${__dirname}/App.tsx`,
  `${__dirname}/app.json`,
];

config.resolver.blockList = [
  /dist-test\/.*/,
  /coverage\/.*/,
  /\.git\/.*/,
  /assets\/screen.*\/.*/,
  /assets\/pin entry\/.*/,
  /assets\/authentication\/.*/,
  /database\/.*/,
  /scripts\/.*/,
  /temp_.*/,
  /.*\.backup/,
  /.*\.bak/,
  /.*_old\..*/,
  /USER_FLOW_DOCUMENTATION\.html/,
  /before\.txt/,
  /after\.txt/,
  /function_.*\.txt/,
  /return_.*\.txt/,
  /tsc_.*/,
];

module.exports = config;