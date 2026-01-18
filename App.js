import React, { useState, useEffect } from 'react';
import * as Font from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  ScrollView,
  Alert,
} from 'react-native';
import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  getAuth,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  fetchSignInMethodsForEmail,
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
import AdminMessagingScreen from './AdminMessagingScreen';
import PostDetailScreen from './PostDetailScreen';
import EditProfile from './EditProfile';
import { ReportService } from './services/reportService';
import TestFeedbackScreen from './TestFeedbackScreen';
import { FontAwesome } from '@expo/vector-icons';
import { ThemeProvider } from './contexts/ThemeContext';
import { usageLogger, FEATURES } from './services/usageLogger';

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
  const { refreshUser } = useUser();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [about, setAbout] = useState('');
  const [studentId, setStudentId] = useState('');
  const [birthday, setBirthday] = useState('');
  const [role, setRole] = useState('student'); // 'student' or 'faculty'
  const [profilePic, setProfilePic] = useState(null);
  const [coverPhoto, setCoverPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auto-populate name from email when component loads
  React.useEffect(() => {
    const user = getAuth().currentUser;
    if (user) {
      // Extract name from email (before @)
      const emailName = user.email.split('@')[0];
      // Capitalize first letter and replace dots/underscores with spaces
      const formattedName = emailName
        .replace(/[._]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      setName(formattedName);
    }
  }, []);

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
      
      // Validate required fields
      if (!name.trim()) {
        Alert.alert('Error', 'Name is required');
        setLoading(false);
        return;
      }
      
      console.log('Account Setup - Before Upload:', {
        name,
        role,
        profilePic: profilePic ? 'has image' : 'no image',
        coverPhoto: coverPhoto ? 'has image' : 'no image'
      });
      
      // Upload profile images to Supabase if provided
      let uploadedProfilePic = profilePic;
      let uploadedCoverPhoto = coverPhoto;
      
      if (profilePic && !profilePic.startsWith('http')) {
        console.log('Uploading profile pic...');
        const url = await ReportService.uploadProfileImage(profilePic, 'profile');
        console.log('Profile pic URL:', url);
        if (url) {
          uploadedProfilePic = url;
        }
      }
      
      if (coverPhoto && !coverPhoto.startsWith('http')) {
        console.log('Uploading cover photo...');
        const url = await ReportService.uploadProfileImage(coverPhoto, 'cover');
        console.log('Cover photo URL:', url);
        if (url) {
          uploadedCoverPhoto = url;
        }
      }
      
      const userData = {
        name,
        username: user.email, // Username is now the email address
        mobile,
        address,
        about,
        studentId,
        birthday,
        role, // Add role field
        email: user.email,
        profilePic: uploadedProfilePic,
        coverPhoto: uploadedCoverPhoto,
        accountStatus: 'active',
        school: 'Cor Jesu College',
        verifiedStudent: true,
        createdAt: new Date(),
        reportsCount: 0, // Initialize trophy counter
        trophies: [], // Array to store earned trophies
      };
      
      console.log('Saving to Firestore:', userData);
      
      await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
      
      console.log('Account setup complete!');
      
      // Force reload user data from Firestore
      await refreshUser();
      console.log('User data refreshed!');
      
      setLoading(false);
      navigation.replace('Home', { goToAccount: true });
    } catch (e) {
      setLoading(false);
      console.error('Account setup error:', e);
      alert('Failed to save account info: ' + e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={[styles.infoText, { textAlign: 'center', marginBottom: 10, paddingHorizontal: 30 }]}>
          Your email is verified. Add more details to complete your profile.
        </Text>
        
        {/* Email (Read-only) */}
        <TextInput 
          style={[styles.input, { backgroundColor: '#f0f0f0', color: '#666' }]} 
          placeholder="Email" 
          value={email} 
          editable={false} 
        />
        
        {/* Role Selection */}
        <View style={{ paddingHorizontal: 40, marginBottom: 20 }}>
          <Text style={[styles.infoText, { textAlign: 'left', marginBottom: 12, fontFamily: 'Outfit-Bold', color: '#333', fontSize: 15 }]}>
            Select Your Role
          </Text>
          <View style={{ gap: 10 }}>
            <TouchableOpacity 
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: role === 'student' ? '#2667ff' : '#e0e0e0',
                backgroundColor: role === 'student' ? '#f0f4ff' : '#fff',
              }}
              onPress={() => setRole('student')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginRight: 12 }}>🎓</Text>
                <View>
                  <Text style={{ 
                    fontFamily: 'Outfit-Bold', 
                    fontSize: 16, 
                    color: role === 'student' ? '#2667ff' : '#333' 
                  }}>
                    Student
                  </Text>
                  <Text style={{ 
                    fontFamily: 'Outfit-Regular', 
                    fontSize: 12, 
                    color: '#666',
                    marginTop: 2
                  }}>
                    I am a student at Cor Jesu College
                  </Text>
                </View>
              </View>
              {role === 'student' && (
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: '#2667ff',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 16,
                paddingHorizontal: 20,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: role === 'faculty' ? '#2667ff' : '#e0e0e0',
                backgroundColor: role === 'faculty' ? '#f0f4ff' : '#fff',
              }}
              onPress={() => setRole('faculty')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginRight: 12 }}>👨‍🏫</Text>
                <View>
                  <Text style={{ 
                    fontFamily: 'Outfit-Bold', 
                    fontSize: 16, 
                    color: role === 'faculty' ? '#2667ff' : '#333' 
                  }}>
                    Faculty
                  </Text>
                  <Text style={{ 
                    fontFamily: 'Outfit-Regular', 
                    fontSize: 12, 
                    color: '#666',
                    marginTop: 2
                  }}>
                    I am a faculty member or staff
                  </Text>
                </View>
              </View>
              {role === 'faculty' && (
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: '#2667ff',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Name (Auto-populated from email, editable) */}
        <TextInput 
          style={styles.input} 
          placeholder="Full Name" 
          value={name} 
          onChangeText={setName} 
        />
        
        <TextInput style={styles.input} placeholder="Student ID" value={studentId} onChangeText={setStudentId} />
        <TextInput style={styles.input} placeholder="Birthday (YYYY-MM-DD)" value={birthday} onChangeText={setBirthday} />
        <TextInput style={styles.input} placeholder="Mobile Number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="Address" value={address} onChangeText={setAddress} />
        <TextInput 
          style={[styles.input, { height: 80 }]} 
          placeholder="About (Tell us about yourself)" 
          value={about} 
          onChangeText={setAbout}
          multiline
          numberOfLines={3}
        />
        
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
      </ScrollView>
    </SafeAreaView>
  );
}

function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usePasswordMode, setUsePasswordMode] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState('');
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showOk, setShowOk] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const SCHOOL_EMAIL_DOMAIN = '@g.cjc.edu.ph'; // Cor Jesu College email domain

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

  const validateSchoolEmail = (emailAddress) => {
    return emailAddress.toLowerCase().endsWith(SCHOOL_EMAIL_DOMAIN);
  };

  const handleVerifyLink = async () => {
    if (!verificationUrl || !verificationUrl.trim()) {
      alert('Please paste the verification link from your email');
      return;
    }

    setLoading(true);
    setLoadingMessage('Verifying your account...');

    try {
      if (isSignInWithEmailLink(auth, verificationUrl)) {
        const result = await signInWithEmailLink(auth, email, verificationUrl);
        await AsyncStorage.removeItem('emailForSignIn');
        
        const isNewUser = await AsyncStorage.getItem('isNewUser') === 'true';
        await AsyncStorage.removeItem('isNewUser');

        // Check if user profile exists
        const userDocRef = doc(db, 'users', result.user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists() || !userDocSnap.data().name) {
          // New user - create profile automatically
          await setDoc(userDocRef, {
            email: result.user.email,
            createdAt: new Date(),
            accountStatus: 'active',
            school: 'Cor Jesu College',
            verifiedStudent: true
          });

          // Save login time for session tracking
          await AsyncStorage.setItem('sessionStartTime', Date.now().toString());
          
          setLoadingMessage('Creating your profile...');
          setTimeout(() => {
            setLoading(false);
            navigation.replace('AccountSetup', { email: result.user.email });
          }, 1000);
        } else {
          // Existing user - check if suspended
          const userData = userDocSnap.data();
          if (userData.accountStatus === 'suspended' || userData.status === 'suspended') {
            await signOut(auth);
            alert(`Account suspended: ${userData.suspensionReason || 'Your account has been suspended. Please contact support.'}`);
            setLoading(false);
            return;
          }

          // Save login time for session tracking
          await AsyncStorage.setItem('sessionStartTime', Date.now().toString());
          
          setLoadingMessage('Welcome back! Logging you in...');
          setTimeout(() => {
            setLoading(false);
            navigation.replace('Home');
          }, 1200);
        }
      } else {
        setLoading(false);
        alert('Invalid verification link. Please copy the complete link from your email.');
      }
    } catch (error) {
      console.error('Error verifying email link:', error);
      setLoading(false);
      
      if (error.code === 'auth/invalid-action-code') {
        alert('This verification link has expired or already been used. Please request a new one.');
      } else {
        alert(`Verification failed: ${error.message}`);
      }
    }
  };

  const handlePasswordAuth = async () => {
    if (!email || !email.trim()) {
      alert('Please enter your Cor Jesu College email address');
      return;
    }

    if (!validateSchoolEmail(email)) {
      alert(`Please use your Cor Jesu College email address (${SCHOOL_EMAIL_DOMAIN})`);
      return;
    }

    if (!password || password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setLoadingMessage('Authenticating...');

    try {
      // Try to sign in first
      setLoadingMessage('Signing you in...');
      let userCredential;
      
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Check if suspended
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.data();
        
        if (userData?.accountStatus === 'suspended' || userData?.status === 'suspended') {
          await signOut(auth);
          alert(`Account suspended: ${userData.suspensionReason || 'Your account has been suspended.'}`);
          setLoading(false);
          return;
        }

        // Save login time for session tracking
        await AsyncStorage.setItem('sessionStartTime', Date.now().toString());
        
        // Initialize usage logger for testing
        const testCode = `USER_${userCredential.user.uid.substring(0, 8)}_${Date.now()}`;
        await usageLogger.initSession(testCode, userCredential.user.uid, email, 'User');
        await usageLogger.startFeature(FEATURES.LOGIN);
        
        setLoadingMessage('Welcome back! 🎉');
        setTimeout(() => {
          setLoading(false);
          navigation.replace('Home');
        }, 1000);
        
      } catch (signInError) {
        // If user doesn't exist, create new account
        // Firebase uses 'auth/invalid-credential' for both wrong password AND non-existent users (security feature)
        if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
          setLoadingMessage('Creating your account...');
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          
          // Create user profile
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            email: userCredential.user.email,
            createdAt: new Date(),
            accountStatus: 'active',
            school: 'Cor Jesu College',
            verifiedStudent: true
          });

          // Initialize usage logger for new user
          const testCode = `USER_${userCredential.user.uid.substring(0, 8)}_${Date.now()}`;
          await usageLogger.initSession(testCode, userCredential.user.uid, email, 'User');
          await usageLogger.startFeature(FEATURES.LOGIN);

          setLoadingMessage('Account created! 🎓');
          setTimeout(() => {
            setLoading(false);
            navigation.replace('AccountSetup', { email: userCredential.user.email });
          }, 1000);
        } else {
          throw signInError;
        }
      }
    } catch (error) {
      setLoading(false);
      console.error('Password auth error:', error);
      
      if (error.code === 'auth/wrong-password') {
        alert('Incorrect password. Please try again.');
      } else if (error.code === 'auth/email-already-in-use') {
        alert('This email is already registered. Please sign in instead.');
      } else if (error.code === 'auth/invalid-email') {
        alert('Invalid email address.');
      } else {
        alert(`Authentication failed: ${error.message}`);
      }
    }
  };

  const handleSendVerificationLink = async () => {
    if (!email || !email.trim()) {
      alert('Please enter your Cor Jesu College email address');
      return;
    }

    if (!validateSchoolEmail(email)) {
      alert(`Please use your Cor Jesu College email address (${SCHOOL_EMAIL_DOMAIN})`);
      return;
    }

    setLoading(true);
    setLoadingMessage('Checking account...');
    setShowOk(false);

    try {
      // Check if email is already registered in Firebase Auth (no Firestore query needed)
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      
      if (signInMethods.length > 0) {
        // User already registered - prompt to use password instead
        setLoading(false);
        Alert.alert(
          'Welcome back! 👋',
          'This email is already registered.\n\nPlease use password sign-in instead of email verification.',
          [
            {
              text: 'Use Password',
              onPress: () => setUsePasswordMode(true)
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
        return;
      }
      
      // New user - send verification link
      setLoadingMessage('Sending verification link...');
      
      const actionCodeSettings = {
        // URL you want to redirect back to after email link is clicked
        url: 'https://campulse-8c50e.firebaseapp.com/__/auth/action',
        handleCodeInApp: true,
        iOS: {
          bundleId: 'com.invictus28.safire'
        },
        android: {
          packageName: 'com.invictus28',
          installApp: true,
          minimumVersion: '12'
        }
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Save email locally for verification
      await AsyncStorage.setItem('emailForSignIn', email);
      
      // Reset quota exceeded flag on success
      setQuotaExceeded(false);
      
      setEmailSent(true);
      setLoading(false);
      
      setModalMessage(`✅ Verification link sent to ${email}!\n\nCheck your inbox and click the link to create your account.`);
      setModalVisible(true);
    } catch (error) {
      setLoading(false);
      console.error('Error sending email link:', error);
      
      // Check if quota exceeded
      if (error.code === 'auth/quota-exceeded' || error.message.includes('quota') || error.message.includes('QUOTA_EXCEEDED')) {
        setQuotaExceeded(true);
        setUsePasswordMode(true);
        alert('📧 Email limit reached!\n\nWe\'ve switched to password mode. You can still sign in or create an account using a password (min 6 characters).\n\nEmail verification will work again tomorrow! 🔄');
      } else {
        alert(`Failed to send verification link: ${error.message}`);
      }
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
      <Text style={styles.title}>Sign in to Safire</Text>
      
      {/* Instructions */}
      <Text style={styles.infoText}>
        Enter your Cor Jesu College email address{'\n'}
        {emailSent ? '' : 'We\'ll check if you have an account'}
      </Text>
      
      {/* Email Input */}
      <TextInput
        style={styles.input}
        placeholder="yourlastname@g.cjc.edu.ph"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!emailSent}
      />
      
      {/* Password Input (only in password mode) */}
      {usePasswordMode && !emailSent && (
        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters)"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
      )}
      
      {/* Main Action Button */}
      {!emailSent ? (
        <>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={usePasswordMode ? handlePasswordAuth : handleSendVerificationLink}
          >
            <Text style={styles.nextButtonText}>
              {usePasswordMode ? 'Sign In / Sign Up' : 'Continue'}
            </Text>
          </TouchableOpacity>
          
          {/* Toggle between email link and password */}
          <TouchableOpacity 
            style={{ marginTop: 15 }}
            onPress={() => {
              if (!quotaExceeded) {
                setUsePasswordMode(!usePasswordMode);
              } else {
                // Try email link again to check if quota reset
                setQuotaExceeded(false);
                setUsePasswordMode(false);
              }
            }}
          >
            <Text style={styles.switchText}>
              {quotaExceeded 
                ? '🔄 Try Email Link Again (Quota may have reset)' 
                : (usePasswordMode 
                  ? '📧 Use Email Link Instead' 
                  : '🔑 Use Password Instead')}
            </Text>
          </TouchableOpacity>
          
          {quotaExceeded && (
            <Text style={[styles.infoText, { color: '#ff6b6b', marginTop: 10 }]}>
              Email quota exceeded. Using password mode temporarily.
            </Text>
          )}
        </>
      ) : (
        <View style={{ alignItems: 'center', marginTop: 10, width: '80%', alignSelf: 'center' }}>
          <Text style={[styles.infoText, { color: '#2667ff', fontFamily: 'Outfit-Bold', marginBottom: 10 }]}>
            ✓ Email sent to {email}!
          </Text>
          <Text style={[styles.infoText, { textAlign: 'center', marginBottom: 15 }]}>
            Check your inbox and copy the verification link below:
          </Text>
          
          <TextInput
            style={[styles.input, { width: '100%' }]}
            placeholder="Paste verification link here"
            placeholderTextColor="#999"
            value={verificationUrl}
            onChangeText={setVerificationUrl}
            autoCapitalize="none"
            multiline
          />
          
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleVerifyLink}
          >
            <Text style={styles.nextButtonText}>Verify & Sign In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => { setEmailSent(false); setEmail(''); setVerificationUrl(''); }} style={{ marginTop: 10 }}>
            <Text style={styles.switchText}>Use different email</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Info Text */}
      <View style={[styles.switchRow, { marginTop: 20 }]}>
        <Text style={[styles.infoText, { textAlign: 'center', paddingHorizontal: 30, fontSize: 12 }]}>
          Only Cor Jesu College students with valid school email addresses can access this app.
        </Text>
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
            const firestoreData = userDocSnap.data();
            console.log('Firestore data loaded:', firestoreData);
            userData = { ...userData, ...firestoreData };
            
            // Check if user is suspended
            if (firestoreData.accountStatus === 'suspended' || firestoreData.status === 'suspended') {
              console.log('User account is suspended, signing out...');
              await signOut(auth);
              alert(`Account suspended: ${firestoreData.suspensionReason || 'Your account has been suspended. Please contact support.'}`);
              setUser(null);
              setLoading(false);
              return;
            }
          } else {
            console.log('No Firestore document found for user:', firebaseUser.uid);
          }

          console.log('Final user data set:', userData);
          setUser(userData);
          
          // Check for any pending usage log sessions that weren't uploaded
          try {
            const hasSession = await usageLogger.loadSession();
            if (hasSession) {
              console.log('Found pending usage log session, will auto-upload on background');
            }
          } catch (error) {
            console.error('Error checking for pending usage log:', error);
          }
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
    refreshUser: async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return false;
        
        console.log('Manually refreshing user data...');
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const firestoreData = userDocSnap.data();
          console.log('Refreshed Firestore data:', firestoreData);
          const userData = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            ...firestoreData
          };
          setUser(userData);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error refreshing user:', error);
        return false;
      }
    },
    updateUser: async (updatedData) => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return false;
        
        // Update Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          ...updatedData,
          updatedAt: new Date()
        });
        
        // Update local state
        setUser(prevUser => ({
          ...prevUser,
          ...updatedData
        }));
        
        return true;
      } catch (error) {
        console.error('Error updating user:', error);
        return false;
      }
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
      <ThemeProvider>
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
                <Stack.Screen name="AdminMessaging" component={AdminMessagingScreen} />
                <Stack.Screen name="PostDetail" component={PostDetailScreen} />
                <Stack.Screen name="EditProfile" component={EditProfile} />
                <Stack.Screen name="TestFeedback" component={TestFeedbackScreen} />
              </Stack.Navigator>
              </AuthUserProvider>
            </NavigationContainer>
          </GestureHandlerErrorBoundary>
        </SafeAreaProvider>
      </ThemeProvider>
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
