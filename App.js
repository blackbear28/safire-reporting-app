import React, { useState, useEffect } from 'react';
import * as Font from 'expo-font';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebase';
import * as Google from 'expo-auth-session/providers/google';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './HomeScreen';

function SplashScreen() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);
  const appearAnim = React.useRef(new Animated.Value(0)).current; // opacity
  const slideAnim = React.useRef(new Animated.Value(0)).current; // translateX

  React.useEffect(() => {
    Font.loadAsync({
      'Outfit-Bold': require('./assets/fonts/Outfit-Bold.ttf'),
    }).then(() => setFontsLoaded(true));
  }, []);

  React.useEffect(() => {
    if (fontsLoaded) {
      Animated.sequence([
        Animated.timing(appearAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -400, // slide left
          duration: 500,
          delay: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  return (
    <View style={{ flex: 1, backgroundColor: '#2667ff', justifyContent: 'center', alignItems: 'center' }}>
      <Animated.Text
        style={{
          fontFamily: 'Outfit-Bold',
          fontSize: 54,
          color: '#fff',
          letterSpacing: 2,
          opacity: appearAnim,
          transform: [{ translateX: slideAnim }],
        }}
      >
        CamPulse
      </Animated.Text>
    </View>
  );
}

function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '517763926129-q3udh8fbt5d31k35m8gsjfdh723ed05e.apps.googleusercontent.com',
    androidClientId: '517763926129-ckgq6gt2asd3n355tl1u5ia7joc8gd1h.apps.googleusercontent.com',
    // iosClientId: '', // You can add this later if needed
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    Font.loadAsync({
      'Outfit-Regular': require('./assets/fonts/Outfit-Regular.ttf'),
      'Outfit-Bold': require('./assets/fonts/Outfit-Bold.ttf'),
      'Outfit-Light': require('./assets/fonts/Outfit-Light.ttf'),
    }).then(() => setFontsLoaded(true));
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then((userCredential) => {
          // Google sign-in success
          console.log('Google user:', userCredential.user);
        })
        .catch((error) => alert(error.message));
    }
  }, [response]);

  if (!fontsLoaded) {
    return null;
  }

  const showModal = (message, callback) => {
    setModalMessage(message);
    setModalVisible(true);
    setTimeout(() => {
      setModalVisible(false);
      if (callback) callback();
    }, 2000);
  };

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Logged in:', userCredential.user);
      showModal('Login successful!', () => navigation.replace('Home'));
    } catch (error) {
      alert(error.message);
    }
  };
  const handleSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Signed up:', userCredential.user);
      showModal('Sign up successful!', () => navigation.replace('Home'));
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalText}>{modalMessage}</Text>
          </View>
        </Pressable>
      </Modal>
      <View style={styles.container}>
        <Text style={styles.brand}>CamPulse</Text>
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.loginButton}
            onPress={isSignUp ? handleSignUp : handleLogin}
          >
            <Text style={styles.loginButtonText}>{isSignUp ? 'Sign Up' : 'Log In'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2667ff', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }]}
            onPress={() => promptAsync()}
          >
            <Text style={[styles.loginButtonText, { color: '#2667ff' }]}>Sign in with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={styles.forgotText}>
              {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const Stack = createStackNavigator();

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);
  React.useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);
  if (showSplash) return <SplashScreen />;
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2667ff', // Facebook blue
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 150,
    paddingHorizontal: 20,
  },
  brand: {
    fontFamily: 'Outfit-Bold',
    fontSize: 48,
    marginBottom: 20,
    color: 'white',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    fontFamily: 'Outfit-Regular',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    fontFamily: 'Outfit-Bold',
  },
  loginButton: {
    backgroundColor: '#2667ff',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    fontFamily: 'Outfit-Bold',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 19,
    fontFamily: 'Outfit-Bold',
  },
  forgotText: {
    textAlign: 'center',
    color: '#black',
    fontSize: 14,
    marginTop: 5,
    fontFamily: 'Outfit-Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#2667ff',
    textAlign: 'center',
  },
});
