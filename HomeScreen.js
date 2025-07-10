import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import * as Font from 'expo-font';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { TabView, SceneMap } from 'react-native-tab-view';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

const initialLayout = { width: Dimensions.get('window').width };

export default function HomeScreen({ navigation }) {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: 'home', title: 'Home' },
    { key: 'dashboard', title: 'Dashboard' },
    { key: 'plus', title: 'Submit' },
    { key: 'complaint', title: 'Complaint' },
    { key: 'account', title: 'Account' },
  ]);

  React.useEffect(() => {
    Font.loadAsync({
      'Outfit-Regular': require('./assets/fonts/Outfit-Regular.ttf'),
      'Outfit-Bold': require('./assets/fonts/Outfit-Bold.ttf'),
      'Outfit-Light': require('./assets/fonts/Outfit-Light.ttf'),
    }).then(() => setFontsLoaded(true));
  }, []);

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
  const AccountTab = () => (
    <View style={styles.centerTab}>
      <Ionicons name="person-circle-outline" size={60} color="#2667ff" style={{ marginBottom: 10 }} />
      <Text style={styles.accountTitle}>Account</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={async () => {
        await signOut(auth);
        navigation.replace('Login');
      }}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );

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
        <Text style={styles.headerBrand}>CamPulse</Text>
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
    marginBottom: 4,
  },
  feedUser: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#2667ff',
    marginRight: 4,
  },
  feedTime: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: '#888',
  },
  feedContent: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: '#222',
    marginBottom: 8,
    marginLeft: 2,
  },
  feedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
  },
  feedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 18,
  },
  feedActionText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: '#2667ff',
    marginLeft: 3,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e6ed',
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'android' ? 20 : 28,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    zIndex: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPlusWrapper: {
    position: 'relative',
    top: -28,
    zIndex: 20,
    width: 70,
    alignItems: 'center',
  },
  navPlusButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#2667ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#2667ff',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  navLabel: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#2667ff',
    marginTop: 2,
  },
  centerTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  tabTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: '#2667ff',
    marginTop: 10,
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
    borderRadius: 10,
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
});
