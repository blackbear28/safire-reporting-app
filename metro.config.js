const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure proper platform resolution for EAS builds
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

module.exports = config;
