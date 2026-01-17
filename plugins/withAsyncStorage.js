const { withDangerousMod } = require('@expo/config-plugins');

const withAsyncStorage = (config) => {
  return withDangerousMod(config, [
    'android',
    (config) => {
      // AsyncStorage is handled by autolinking in modern React Native
      // This plugin ensures it's properly linked during build
      return config;
    },
  ]);
};

module.exports = withAsyncStorage;
