import { StyleSheet, Platform, StatusBar } from 'react-native';

export const styles = StyleSheet.create({
  // Main container styles
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scene: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: '#fff',
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabLabel: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  tabIndicator: {
    backgroundColor: '#2667ff',
    height: 3,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navLabel: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Outfit-Regular',
    color: '#b0b0b0',
  },
  navPlusWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2667ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  navPlusButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2667ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  // Account Section Styles
  accountContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  // Profile Header
  coverPhotoContainer: {
    width: '100%',
    position: 'relative',
  },
  profileHeader: {
    marginBottom: 20,
  },
  coverPhoto: {
    width: '100%',
    height: 150,
    backgroundColor: '#f5f8fa',
  },
  coverPhotoPlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#2667ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicContainer: {
    position: 'absolute',
    left: 20,
    bottom: -50,
    width: 100,
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 60,
    padding: 3,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePic: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  profilePicPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: '#2667ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingContainer: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  greetingText: {
    color: '#fff',
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  // Account Info
  accountInfo: {
    padding: 20,
    paddingTop: 60,
  },
  nameContainer: {
    marginBottom: 12,
  },
  accountName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 24,
    color: '#000',
    marginBottom: 4,
  },
  accountUsername: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: '#666',
    marginBottom: 25,
  },
  bioContainer: {
    marginBottom: 16,
  },
  bioText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: '#666',
  },
  // Info Sections
  infoDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 20,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 10,
  },
  infoIcon: {
    width: 24,
    marginRight: 15,
    textAlign: 'center',
    color: '#2667ff',
  },
  infoText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  // Buttons
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#d6e0ff',
  },
  editProfileText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#2667ff',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    margin: 20,
    borderWidth: 1,
    borderColor: '#ffd6d6',
  },
  logoutText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#ff3b30',
    marginLeft: 8,
  },
  // Navigation
  navLabelActive: {
    color: '#2667ff',
    fontWeight: 'bold',
  },
  // Other styles
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
});
