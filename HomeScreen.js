import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Platform, 
  StatusBar, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  Image,
  ActivityIndicator
} from 'react-native';
import * as Font from 'expo-font';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { TabView, SceneMap } from 'react-native-tab-view';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { useUser } from './contexts/UserContext';

const initialLayout = { width: Dimensions.get('window').width };

export default function HomeScreen({ navigation, route }) {
  // All hooks must be called at the top level
  const [fontsLoaded, setFontsLoaded] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [loading, setLoading] = useState(false); // Moved to top level
  const [routes] = React.useState([
    { key: 'home', title: 'Home' },
    { key: 'dashboard', title: 'Dashboard' },
    { key: 'plus', title: 'Submit' },
    { key: 'complaint', title: 'Complaint' },
    { key: 'account', title: 'Account' },
  ]);
  const { user: userData, loading: userLoading, clearUserData } = useUser();
  const [localLoading, setLocalLoading] = useState(true);

  // Update local loading state when user data is loaded
  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const timer = setTimeout(() => {
      if (localLoading) {
        console.log('Loading timeout reached, forcing loading to false');
        setLocalLoading(false);
      }
    }, 5000); // 5 second timeout

    // Clean up the timeout if the component unmounts
    return () => clearTimeout(timer);
  }, [localLoading]);

  // Update local loading based on userLoading
  useEffect(() => {
    if (!userLoading) {
      setLocalLoading(false);
    }
  }, [userLoading]);

  // Load fonts
  React.useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          'Outfit-Regular': require('./assets/fonts/Outfit-Regular.ttf'),
          'Outfit-Bold': require('./assets/fonts/Outfit-Bold.ttf'),
          'Outfit-Light': require('./assets/fonts/Outfit-Light.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
      } finally {
        setLocalLoading(false);
      }
    };

    loadFonts();
  }, []);

  // Log user data changes for debugging
  useEffect(() => {
    console.log('User data in HomeScreen:', userData);
  }, [userData]);

  // Go to Account tab if coming from AccountSetup
  React.useEffect(() => {
    if (route?.params?.goToAccount) {
      setIndex(4); // Account tab index
    }
  }, [route]);

  // Sample feed data
  const feed = [
    {
      id: 1,
      user: 'Anonymous',
      time: '2m ago',
      content: 'Wi-Fi in the library is slow during peak hours.',
      upvotes: 12,
      comments: 3,
      anonymous: true,
    },
    {
      id: 2,
      user: 'Jane D.',
      time: '10m ago',
      content: 'Can we have more vegetarian options in the cafeteria?',
      upvotes: 8,
      comments: 1,
      anonymous: false,
    },
    {
      id: 3,
      user: 'Anonymous',
      time: '20m ago',
      content: 'The new study area is awesome! Thanks admin!',
      upvotes: 15,
      comments: 2,
      anonymous: true,
    },
  ];

  if (!fontsLoaded) {
    return null;
  }

  // Tab scenes
  const HomeTab = () => (
    <ScrollView contentContainerStyle={styles.feedScroll}>
      <View style={styles.feedSection}>
        {feed.map((item, idx) => (
          <React.Fragment key={item.id}>
            <View style={styles.feedCard}>
              <View style={styles.feedHeader}>
                <Ionicons name={item.anonymous ? 'person-circle-outline' : 'person'} size={22} color={item.anonymous ? '#b0b0b0' : '#2667ff'} style={{ marginRight: 6 }} />
                <Text style={styles.feedUser}>{item.user}</Text>
                <Text style={styles.feedTime}>· {item.time}</Text>
              </View>
              <Text style={styles.feedContent}>{item.content}</Text>
              <View style={styles.feedActions}>
                <TouchableOpacity style={styles.feedActionBtn}>
                  <Ionicons name="arrow-up-outline" size={18} color="#2667ff" />
                  <Text style={styles.feedActionText}>{item.upvotes}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.feedActionBtn}>
                  <Ionicons name="chatbubble-ellipses-outline" size={17} color="#2667ff" />
                  <Text style={styles.feedActionText}>{item.comments}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {idx !== feed.length - 1 && <View style={styles.feedDivider} />}
          </React.Fragment>
        ))}
      </View>
      <View style={{ height: 80 }} />
    </ScrollView>
  );

  const DashboardTab = () => (
    <View style={styles.centerTab}><Text style={styles.tabTitle}>Dashboard (Coming Soon)</Text></View>
  );
  const SubmitTab = () => (
    <View style={styles.centerTab}><Text style={styles.tabTitle}>Submit Feedback (Coming Soon)</Text></View>
  );
  const ComplaintTab = () => (
    <View style={styles.centerTab}><Text style={styles.tabTitle}>Complaint Section (Coming Soon)</Text></View>
  );
  const handleLogout = async () => {
    try {
      await signOut(auth);
      await clearUserData();
      navigation.replace('Login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const AccountTab = () => {
    console.log('Rendering AccountTab:', { userLoading, localLoading, hasUserData: !!userData, userData });
    
    // Show loading state if we're still loading and don't have user data
    if ((userLoading || localLoading) && !userData) {
      return (
        <View style={[styles.centerTab, { justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color="#2667ff" />
          <Text style={{ marginTop: 10, color: '#666' }}>Loading profile...</Text>
        </View>
      );
    }
    
    if (!userData) {
      return (
        <View style={[styles.centerTab, { justifyContent: 'center' }]}>
          <Ionicons name="alert-circle" size={50} color="#ff6b6b" />
          <Text style={{ marginTop: 10, color: '#666' }}>No user data available</Text>
          <TouchableOpacity 
            style={[styles.logoutBtn, { marginTop: 20 }]} 
            onPress={() => {
              clearUserData();
              navigation.navigate('Login');
            }}
          >
            <Text style={styles.logoutText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // If we have user data, show the profile
    if (userData) {
      return (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 90 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.userInfoContainer, { paddingBottom: 30 }]}>
            <View style={styles.profileHeader}>
              <View style={styles.coverPhoto}>
                {userData?.coverPhoto ? (
                  <Image 
                    source={{ uri: userData.coverPhoto }} 
                    style={styles.coverPhotoImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.coverPhotoPlaceholder}>
                    <Ionicons name="images" size={50} color="#2667ff" />
                  </View>
                )}
              </View>
              
              <View style={styles.profilePicContainer}>
                {userData?.profilePic ? (
                  <Image 
                    source={{ uri: userData.profilePic }} 
                    style={styles.profilePic} 
                  />
                ) : (
                  <Ionicons name="person-circle" size={100} color="#2667ff" />
                )}
              </View>
            </View>

            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{userData?.name || userData?.username || 'User'}</Text>
              <Text style={styles.accountUsername}>@{userData?.username || userData?.email?.split('@')[0] || 'user'}</Text>
              
              <View style={[styles.infoSection, { marginBottom: 5 }]}>
                <Ionicons name="mail" size={20} color="#666" style={styles.infoIcon} />
                <Text style={styles.infoText}>{userData?.email || 'No email'}</Text>
              </View>
              
              <View style={[styles.infoSection, { marginBottom: 5 }]}>
                <Ionicons name="call" size={20} color="#666" style={styles.infoIcon} />
                <Text style={styles.infoText}>{userData?.mobile || 'No phone number'}</Text>
              </View>
              
              <View style={[styles.infoSection, { marginBottom: 5 }]}>
                <Ionicons name="card" size={20} color="#666" style={styles.infoIcon} />
                <Text style={styles.infoText}>Student ID: {userData?.studentID || 'Not provided'}</Text>
              </View>
              
              <View style={[styles.infoSection, { marginBottom: 5 }]}>
                <Ionicons name="calendar" size={20} color="#666" style={styles.infoIcon} />
                <Text style={styles.infoText}>Birthday: {userData?.birthday || 'Not provided'}</Text>
              </View>
              
              <View style={[styles.infoSection, { marginBottom: 5 }]}>
                <Ionicons name="school" size={20} color="#666" style={styles.infoIcon} />
                <Text style={styles.infoText}>School: {userData?.school || 'Not provided'}</Text>
              </View>
              
              <View style={[styles.infoSection, { marginBottom: 5 }]}>
                <Ionicons name="location" size={20} color="#666" style={styles.infoIcon} />
                <Text style={styles.infoText}>{userData?.address || 'No address provided'}</Text>
              </View>

              <View style={[styles.infoSection, { flexDirection: 'column', alignItems: 'flex', marginBottom: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                  <Ionicons name="document-text" size={20} color="#666" style={styles.infoIcon} />
                  <Text style={{ fontFamily: 'Outfit-Bold', color: '#333' }}>About</Text>
                </View>
                <Text style={[styles.infoText, { marginLeft: 5, marginTop: 5 }]}>
                  {userData?.bio || 'No bio provided'}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 25 }}>
              <TouchableOpacity 
                style={styles.editProfileButton}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.logoutButton, { marginTop: 15 }]}
                onPress={handleLogout}
              >
                <Text style={styles.logoutText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      );
    }
    
    // If we don't have user data and not loading, show a message
    return (
      <View style={[styles.centerTab, { justifyContent: 'center' }]}>
        <Ionicons name="alert-circle" size={50} color="#ff6b6b" />
        <Text style={{ marginTop: 10, color: '#666' }}>No user data available</Text>
        <TouchableOpacity 
          style={[styles.logoutBtn, { marginTop: 20 }]} 
          onPress={() => {
            clearUserData();
            navigation.navigate('Login');
          }}
        >
          <Text style={styles.logoutText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderScene = SceneMap({
    home: HomeTab,
    dashboard: DashboardTab,
    plus: SubmitTab,
    complaint: ComplaintTab,
    account: AccountTab,
  });

  // Navigation bar tap handler
  const handleNavPress = (idx) => setIndex(idx);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <Text style={styles.headerBrand}>Safire</Text>
      </View>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={initialLayout}
        renderTabBar={() => null}
        swipeEnabled
      />
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavPress(0)}>
          <Ionicons name="home" size={24} color={index === 0 ? '#2667ff' : '#b0b0b0'} />
          <Text style={[styles.navLabel, index === 0 && styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavPress(1)}>
          <FontAwesome5 name="chart-bar" size={22} color={index === 1 ? '#2667ff' : '#b0b0b0'} />
          <Text style={[styles.navLabel, index === 1 && styles.navLabelActive]}>Dashboard</Text>
        </TouchableOpacity>
        <View style={styles.navPlusWrapper}>
          <TouchableOpacity style={styles.navPlusButton} onPress={() => handleNavPress(2)}>
            <Ionicons name="add" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavPress(3)}>
          <MaterialCommunityIcons name="alert-circle-outline" size={24} color={index === 3 ? '#2667ff' : '#b0b0b0'} />
          <Text style={[styles.navLabel, index === 3 && styles.navLabelActive]}>Complaint</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => handleNavPress(4)}>
          <Ionicons name="person-circle-outline" size={25} color={index === 4 ? '#2667ff' : '#b0b0b0'} />
          <Text style={[styles.navLabel, index === 4 && styles.navLabelActive]}>Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Container Styles
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerBar: {
    width: '100%',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingHorizontal: 18,
    paddingBottom: 5,
    backgroundColor: '#fff',
    alignItems: 'flex-start',
    zIndex: 20,
  },
  headerBrand: {
    fontFamily: 'Outfit-Bold',
    fontSize: 35,
    color: '#2667ff',
    marginTop: 2,
  },

  // Feed Styles
  feedScroll: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 40,
    backgroundColor: '#fff',
  },
  feedSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  feedCard: {
    width: '100%',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  feedDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#e6e6e6',
    marginLeft: 0,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedUser: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#333',
    marginLeft: 6,
  },
  feedTime: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  feedContent: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: '#333',
    marginTop: 8,
    lineHeight: 24,
  },
  feedActions: {
    flexDirection: 'row',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e6e6e6',
    paddingTop: 12,
  },
  feedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  feedActionText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: '#2667ff',
    marginLeft: 8,
  },

  // Account Section Styles
  userInfoContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 20,
  },
  coverPhoto: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: -35,
  },
  coverPhotoImage: {
    width: '100%',
    height: '100%',
  },
  coverPhotoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  profilePicContainer: {
    position: 'absolute',
    left: 20,
    bottom: -50,
    backgroundColor: '#fff',
    borderRadius: 60,
    padding: 3,
    elevation: 3,
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  accountInfo: {
    padding: 15,
    paddingTop: 60,
  },
  accountName: {
    fontSize: 24,
    fontFamily: 'Outfit-Bold',
    color: '#000',
    marginBottom: -5,
  },
  accountUsername: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    fontFamily: 'Outfit-Regular',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 18,
  },
  infoIcon: {
    marginRight: 15,
    width: 24,
    textAlign: 'center',
    color: '#2667ff',
  },
  infoText: {
    fontSize: 15,
    color: '#333',
    fontFamily: 'Outfit-Regular',
    flex: 1,
  },

  // Button Styles
  editProfileButton: {
    backgroundColor: '#ffff',
    paddingVertical: 15,
    borderRadius: 8,
    borderColor:'#081c15',
    borderWidth:1,
    alignItems: 'center',
    width: '100%',
  },
  editProfileText: {
    color: '#081c15',
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#081c15',
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
    width: '100%',


  },
  logoutText: {
    fontFamily: 'Outfit-Bold',
    color: '#2667ff',
    fontSize: 16,
  },
  logoutBtn: {
    marginTop: 30,
    backgroundColor: '#2667ff',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },

  // Tab Styles
  centerTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tabTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: '#2667ff',
  },
  accountTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#2667ff',
    marginBottom: 18,
  },

  // Bottom Nav Styles
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
  },
  navPlusWrapper: {
    position: 'relative',
  },
  navPlusButton: {
    position: 'absolute',
    top: -20,
    backgroundColor: '#2667ff',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  accountTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#2667ff',
    marginBottom: 18,
  },
  logoutBtn: {
    marginTop: 30,
    backgroundColor: '#2667ff',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  logoutText: {
    fontFamily: 'Outfit-Bold',
    color: '#fff',
    fontSize: 16,
  },
  navLabelActive: {
    color: '#2667ff',
    fontWeight: 'bold',
  },
  userInfoContainer: {
    padding: 20,
  },
});
