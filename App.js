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
  ActivityIndicator,
} from 'react-native';
import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { launchImageLibraryAsync, MediaTypeOptions } from 'expo-image-picker';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCPyTC1B3bM14a7OcCaTSnKebKOh1Ntt-Y",
  authDomain: "campulse-8c50e.firebaseapp.com",
  projectId: "campulse-8c50e",
  storageBucket: "campulse-8c50e.appspot.com",
  messagingSenderId: "244725080770",
  appId: "1:244725080770:web:9ab35ae367ffecbf92515b",
  measurementId: "G-T4GWKP6WKQ"
};

// Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// const db = getFirestore(app);

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { UserProvider } from './contexts/UserContext';
import HomeScreen from './HomeScreen';
import { FontAwesome } from '@expo/vector-icons';

function LoadingModal({ visible, message, showOk, onOk }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => { }}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.loadingBox, { alignItems: 'center' }]}>
          <Text style={styles.loadingText}>{message}</Text>
          {showOk ? (
            <TouchableOpacity style={styles.okButton} onPress={onOk}>
              <Text style={styles.okButtonText}>OK</Text>
            </TouchableOpacity>
          ) : (
            <ActivityIndicator size="large" color="#2667ff" style={{ marginTop: 10 }} />
          )}
        </View>
      </View>
    </Modal>
  );
}

function SplashScreen() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);
  const appearAnim = React.useRef(new Animated.Value(0)).current; // opacity
  const slideAnim = React.useRef(new Animated.Value(0)).current; // translateX

  React.useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          'Outfit-Bold': require('./assets/fonts/Outfit-Bold.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Error loading fonts:', error);
        // Fallback to default font if loading fails
        setFontsLoaded(true);
      }
    };
    loadFonts();
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
          toValue: -1000, // slide left
          duration: 1000,
          delay: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  return (
    <View style={{ flex: 1, backgroundColor: '#ffff', justifyContent: 'center', alignItems: 'center' }}>
      <Animated.Text
        style={{
          fontFamily: 'Outfit-Bold',
          fontSize: 40,
          color: '#2677ff',
          opacity: appearAnim,
          transform: [{ translateX: slideAnim }],
        }}
      >
        Safire
      </Animated.Text>
      <ActivityIndicator size="large" color="black" style={{ marginTop: 40 }} />
      <Text style={{ color: 'black', fontFamily: 'Outfit-Bold', fontSize: 18, marginTop: 10 }}>Please wait...</Text>
    </View>
  );
}

function AccountSetupScreen({ navigation, route }) {
  const { email } = route.params || {};
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [studentId, setStudentId] = useState('');
  const [birthday, setBirthday] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async (setter) => {
    let result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setter(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const user = getAuth().currentUser;
      if (!user) throw new Error('No user logged in');
      await setDoc(doc(getFirestore(), 'users', user.uid), {
        name,
        username,
        mobile,
        address,
        studentId,
        birthday,
        email: user.email,
        profilePic,
        coverPhoto,
      });
      setLoading(false);
      navigation.replace('Home', { goToAccount: true });
    } catch (e) {
      setLoading(false);
      alert('Failed to save account info: ' + e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.title}>Account Setup</Text>
      <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} />
      <TextInput style={styles.input} placeholder="Birthday (YYYY-MM-DD)" value={birthday} onChangeText={setBirthday} />
      <TextInput style={styles.input} placeholder="Mobile Number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
      <TextInput style={styles.input} placeholder="Address" value={address} onChangeText={setAddress} />
      <TextInput style={styles.input} placeholder="Student ID" value={studentId} onChangeText={setStudentId} />
      <TouchableOpacity style={styles.nextButton} onPress={() => pickImage(setProfilePic)}>
        <Text style={styles.nextButtonText}>{profilePic ? 'Change Profile Picture' : 'Select Profile Picture'}</Text>
      </TouchableOpacity>
      {profilePic && <Text style={{ textAlign: 'center', marginBottom: 8 }}>Profile picture selected</Text>}
      <TouchableOpacity style={styles.nextButton} onPress={() => pickImage(setCoverPhoto)}>
        <Text style={styles.nextButtonText}>{coverPhoto ? 'Change Cover Photo' : 'Select Cover Photo'}</Text>
      </TouchableOpacity>
      {coverPhoto && <Text style={{ textAlign: 'center', marginBottom: 8 }}>Cover photo selected</Text>}
      <TouchableOpacity style={styles.nextButton} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.nextButtonText}>{loading ? 'Saving...' : 'Finish Setup'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
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
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showOk, setShowOk] = useState(false);

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
    setLoading(true);
    setLoadingMessage('Please wait');
    setShowOk(false);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // If this is a new user, go to AccountSetupScreen
      if (userCredential.user && userCredential.user.metadata.creationTime === userCredential.user.metadata.lastSignInTime) {
        setLoading(false);
        navigation.replace('AccountSetup', { email: userCredential.user.email });
      } else {
        setLoadingMessage('Login successful!');
        setTimeout(() => {
          setLoading(false);
          navigation.replace('Home');
        }, 1200);
      }
    } catch (error) {
      setLoading(false);
      alert(error.message);
    }
  };
  const handleSignUp = async () => {
    setLoading(true);
    setLoadingMessage('Creating your account...');
    setShowOk(false);
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Show success message
      setLoadingMessage('Account Created Successfully!');
      setShowOk(true);
      
    } catch (error) {
      setLoading(false);
      alert(error.message);
    }
  };
  const handleOk = () => {
    setLoading(false);
    setShowOk(false);
    setIsSignUp(false); // Switch to login form after account creation
    setEmail('');
    setPassword('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LoadingModal visible={loading} message={loadingMessage} showOk={showOk} onOk={handleOk} />
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
      {/* Brand */}
      <Text style={styles.brandGreen}>Safire</Text>
      {/* Title */}
      <Text style={styles.title}>{isSignUp ? 'Sign up to Safire' : 'Sign in to Safire'}</Text>
      {/* Google Sign In Button */}
      <TouchableOpacity
        style={styles.socialButton}
        onPress={() => promptAsync()}
      >
        <FontAwesome name="google" size={22} color="#EA4335" style={{ marginRight: 10 }} />
        <Text style={styles.socialButtonText}>Sign in with Google</Text>
      </TouchableOpacity>
      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.orDividerText}>or</Text>
        <View style={styles.divider} />
      </View>
      {/* Email/Password Form */}
      {/* Input Fields */}
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
      {/* Main Action Button */}
      <TouchableOpacity
        style={styles.nextButton}
        onPress={isSignUp ? handleSignUp : handleLogin}
      >
        <Text style={styles.nextButtonText}>{isSignUp ? 'Sign Up' : 'Next'}</Text>
      </TouchableOpacity>
      {/* Forgot Password Button */}
      <TouchableOpacity style={styles.forgotButton} onPress={() => { }}>
        <Text style={styles.forgotBoldText}>Forgot Password?</Text>
      </TouchableOpacity>
      {/* Switch between Log In and Sign Up */}
      <View style={styles.switchRow}>
        <Text style={styles.infoText}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
        </Text>
        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.switchText}>{isSignUp ? 'Log In' : 'Sign Up'}</Text>
        </TouchableOpacity>
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
  if (showSplash) {
    return <SplashScreen />;
  }
  return (
    <NavigationContainer>
      <UserProvider>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            cardOverlayEnabled: true,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="AccountSetup" component={AccountSetupScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
        </Stack.Navigator>
      </UserProvider>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f8fa', // Twitter's background
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    width: 300,
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
  },
  okButton: {
    marginTop: 10,
    backgroundColor: '#2677ff',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  okButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#ffffff',
  },
  brandGreen: {
    fontFamily: 'Outfit-Bold',
    fontSize: 28,
    color: '#2667ff',
    textAlign: 'center',
    marginTop: 150,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: '#222',
    textAlign: 'center',
    marginBottom: 18,
  },
  input: {
    height: 50,
    borderColor: '#e6ecf0',
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
    fontSize: 15,
    backgroundColor: '#fff',
    width: '80%',
    maxWidth: 340,
    alignSelf: 'center',
    fontFamily: 'Outfit-Regular',
  },
  nextButton: {
    backgroundColor: '#222',
    borderRadius: 15,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
    width: '80%',
    maxWidth: 340,
    alignSelf: 'center',
    shadowColor: '#222',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6ecf0',
    borderRadius: 22,
    paddingVertical: 12,
    marginBottom: 10,
    width: '80%',
    maxWidth: 340,
    alignSelf: 'center',
  },
  socialButtonText: {
    color: '#222',
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 8,
    justifyContent: 'center',
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e6ecf0',
    marginHorizontal: 8,
  },
  orDividerText: {
    color: '#8899a6',
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
  },
  forgotButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6ecf0',
    borderRadius: 15,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 2,
    width: '80%',
    maxWidth: 340,
    alignSelf: 'center',
    shadowColor: '#2667ff',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  forgotBoldText: {
    color: '#222',
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  infoText: {
    textAlign: 'center',
    color: '#657786',
    fontSize: 13,
    fontFamily: 'Outfit-Light',
    marginBottom: 0,
  },
  switchText: {
    textAlign: 'center',
    color: '#2667ff',
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    marginBottom: 0,
    marginLeft: 2,
  },
  modalBox: {
    width: 280,
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
  },
});
