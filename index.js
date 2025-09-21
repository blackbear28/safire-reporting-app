import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

// Ensure gesture handler is initialized before app registration
// This prevents the "RNGestureHandlerModule could not be found" error
try {
  // Test if gesture handler module is available
  require('react-native-gesture-handler');
  console.log('Gesture handler module loaded successfully');
} catch (error) {
  console.error('Gesture handler module failed to load:', error);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
