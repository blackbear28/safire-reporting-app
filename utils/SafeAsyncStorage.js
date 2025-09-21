// AsyncStorage wrapper with error handling for production builds
import AsyncStorage from '@react-native-async-storage/async-storage';

const SafeAsyncStorage = {
  async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch (error) {
      console.warn('AsyncStorage getItem error:', error);
      return null;
    }
  },

  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('AsyncStorage setItem error:', error);
      return false;
    }
  },

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('AsyncStorage removeItem error:', error);
      return false;
    }
  },

  async clear() {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.warn('AsyncStorage clear error:', error);
      return false;
    }
  }
};

export default SafeAsyncStorage;
