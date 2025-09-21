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
  getAuth,
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
  deleteDoc,
  setDoc,
  getFirestore
} from 'firebase/firestore';
import { launchImageLibraryAsync, MediaTypeOptions } from 'expo-image-picker';
// Remove Google Auth imports - causing crashes on some devices
// import * as Google from 'expo-auth-session/providers/google';
// import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeNavigationFallback } from './components/SafeNavigationFallback';

// Gesture handler error boundary for better crash handling
class GestureHandlerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Check if this is a gesture handler related error
    if (error?.message?.includes('RNGestureHandlerModule') || 
        error?.message?.includes('TurboModuleRegistry') ||
        error?.message?.includes('main has not been registered') ||
        error?.stack?.includes('gesturehandler')) {
      return { hasError: true, error };
    }
    return null;
  }

  componentDidCatch(error, errorInfo) {
    console.error('Navigation/Gesture Handler Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeNavigationFallback 
          onRetry={() => {
            this.setState({ hasError: false, error: null });
            // Try to recover by reloading
            if (typeof this.props.onRestart === 'function') {
              this.props.onRestart();
            }
          }}
        />
      );
    }

    return this.props.children;
  }
}
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './HomeScreen';
import ReportScreen from './ReportScreen';
import DashboardScreen from './DashboardScreen';
import ChatScreen from './ChatScreen';
import PostDetailScreen from './PostDetailScreen';
import EditProfile from './EditProfile';
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
  const appearAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          'Outfit-Bold': require('./assets/fonts/Outfit-Bold.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Error loading fonts, using system fonts:', error);
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
          toValue: -1000,
          duration: 1000,
          delay: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 40, color: '#2677ff', fontWeight: 'bold' }}>Safire</Text>
        <ActivityIndicator size="large" color="black" style={{ marginTop: 40 }} />
        <Text style={{ color: 'black', fontSize: 18, marginTop: 10, fontWeight: 'bold' }}>Please wait...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
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
      <Text style={{ 
        color: 'black', 
        fontFamily: 'Outfit-Bold', 
        fontSize: 18, 
        marginTop: 10 
      }}>
        Please wait...
      </Text>
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
      await setDoc(doc(db, 'users', user.uid), {
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
  // Remove Google Auth - causing crashes
  // const [authError, setAuthError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showOk, setShowOk] = useState(false);

  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          'Outfit-Regular': require('./assets/fonts/Outfit-Regular.ttf'),
          'Outfit-Bold': require('./assets/fonts/Outfit-Bold.ttf'),
          'Outfit-Light': require('./assets/fonts/Outfit-Light.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.warn('Font loading failed, using system fonts:', error);
        // Always set to true so app doesn't get stuck
        setFontsLoaded(true);
      }
    };
    loadFonts();
  }, []);

  // Remove Google Auth response handler - causing crashes
  // useEffect(() => { ... }, [response]);

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2667ff" />
          <Text style={{ marginTop: 10, fontSize: 16 }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
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
      
      // Check if user has completed profile setup
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists() || !userDocSnap.data().name) {
        // User hasn't completed profile setup
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
      
      // Redirect to account setup
      setLoading(false);
      navigation.replace('AccountSetup', { email: userCredential.user.email });
      
    } catch (error) {
      setLoading(false);
      alert(error.message);
    }
  };
  const handleOk = () => {
    setLoading(false);
    setShowOk(false);
    // Don't switch to login form here since we're redirecting to AccountSetup
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
      
      {/* Email/Password Form - No Google Auth */}
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

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App crashed:', error, errorInfo);
    // Log device info for debugging
    console.error('Device crash - possibly Realme 6i compatibility issue');
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Something went wrong</Text>
          <Text style={{ textAlign: 'center', marginBottom: 20 }}>
            The app encountered an error. Please restart the application.
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: '#2667ff', padding: 10, borderRadius: 5 }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={{ color: 'white' }}>Try Again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

// Proper UserProvider with auth state management
const UserContext = React.createContext();

const AuthUserProvider = ({ children }) => {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch additional user data from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          let userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          };

          if (userDocSnap.exists()) {
            // Merge Firestore data with Auth data
            userData = { ...userData, ...userDocSnap.data() };
          }

          setUser(userData);
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Fall back to basic auth data
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription
  }, []);

  const contextValue = {
    user: user,
    loading,
    clearUserData: () => {
      setUser(null);
    },
    signOut: async () => {
      try {
        await signOut(auth);
        setUser(null);
      } catch (error) {
        console.error('Sign out error:', error);
      }
    }
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

// Export the useUser hook
export const useUser = () => {
  const context = React.useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);
  const [appError, setAppError] = React.useState(null);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setShowSplash(false);
      } catch (error) {
        console.error('Error during splash transition:', error);
        setAppError(error);
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, []);
  
  if (appError) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>App Error</Text>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>
          {appError.message || 'Something went wrong during startup'}
        </Text>
        <TouchableOpacity 
          style={{ backgroundColor: '#2667ff', padding: 10, borderRadius: 5 }}
          onPress={() => setAppError(null)}
        >
          <Text style={{ color: 'white' }}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  if (showSplash) {
    return <SplashScreen />;
  }
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerErrorBoundary onRestart={() => setAppError(null)}>
          <NavigationContainer>
            <AuthUserProvider>
              <Stack.Navigator
                initialRouteName="Login"
                screenOptions={{
                  headerShown: false,
                  gestureEnabled: true,
                  cardOverlayEnabled: true,
                }}
              >
                <Stack.Screen 
                  name="Login" 
                  component={LoginScreen}
                  options={{
                    gestureEnabled: false, // Prevent swipe back on login
                  }}
                />
                <Stack.Screen name="AccountSetup" component={AccountSetupScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Report" component={ReportScreen} />
                <Stack.Screen name="Dashboard" component={DashboardScreen} />
                <Stack.Screen name="Chat" component={ChatScreen} />
                <Stack.Screen name="PostDetail" component={PostDetailScreen} />
                <Stack.Screen name="EditProfile" component={EditProfile} />
              </Stack.Navigator>
            </AuthUserProvider>
          </NavigationContainer>
        </GestureHandlerErrorBoundary>
      </SafeAreaProvider>
    </ErrorBoundary>
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
