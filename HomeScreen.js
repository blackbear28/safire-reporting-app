import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
  Linking,
  Vibration,
  TextInput
} from 'react-native';
import * as Font from 'expo-font';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { TabView, SceneMap } from 'react-native-tab-view';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { useUser } from './App';
import { ReportService } from './services/reportService';
import { useTheme } from './contexts/ThemeContext';
import { usageLogger, FEATURES } from './services/usageLogger';
import { fetchSchoolNews, formatNewsDate, getCategoryColor } from './services/newsService';
import { fetchRealCJCNews, getOptimizedImageUrl } from './services/webScrapingService';
import { ProgressiveImage, useLazyLoading, preloadImages } from './components/ProgressiveImage';
import { LinearGradient } from 'expo-linear-gradient';
import FastImage from './components/FastImage';
import { TrophyDisplay } from './components/TrophySystem';
import CampusNavigatorScreen from './CampusNavigatorScreen';
import SupportScreen from './SupportScreen';

const initialLayout = { width: Dimensions.get('window').width };

// Responsive font sizing function for social media standard sizes
const getResponsiveSize = (baseSize) => {
  const { width } = Dimensions.get('window');
  
  // Define breakpoints similar to Twitter/Instagram
  if (width <= 320) {
    // Small devices (iPhone SE, older Android)
    return Math.round(baseSize * 0.9);
  } else if (width <= 375) {
    // Medium devices (iPhone 12 mini, iPhone 13 mini)
    return baseSize;
  } else if (width <= 414) {
    // Large devices (iPhone 12, iPhone 13)
    return Math.round(baseSize * 1.05);
  } else {
    // Extra large devices (iPhone 12 Pro Max, tablets)
    return Math.round(baseSize * 1.1);
  }
};

// Social media standard font sizes
const FontSizes = {
  // Main content
  bodyText: getResponsiveSize(15),        // 15px - Twitter/Instagram post text
  userName: getResponsiveSize(15),        // 15px - Twitter/Instagram username  
  userHandle: getResponsiveSize(15),      // 15px - Twitter handle, Instagram username
  timestamp: getResponsiveSize(15),       // 15px - Tweet/post timestamps
  
  // Titles and headers
  postTitle: getResponsiveSize(16),       // 16px - Post titles, slightly larger
  sectionTitle: getResponsiveSize(20),    // 20px - Section headers
  pageTitle: getResponsiveSize(28),       // 28px - Main page titles (reduced from 35px)
  
  // Meta information
  metaText: getResponsiveSize(13),        // 13px - Meta info, descriptions
  tagText: getResponsiveSize(12),         // 12px - Tags, badges
  actionText: getResponsiveSize(13),      // 13px - Action buttons, links
  
  // UI elements
  notificationBadge: getResponsiveSize(11), // 11px - Notification badges
  statusBadge: getResponsiveSize(10),     // 10px - Status badges (small, uppercase)
  
  // Account/profile
  profileName: getResponsiveSize(20),     // 20px - Profile display name
  profileHandle: getResponsiveSize(16),   // 16px - Profile handle/username
  profileInfo: getResponsiveSize(15),     // 15px - Profile information
  
  // Navigation and buttons
  buttonText: getResponsiveSize(16),      // 16px - Button text
  navText: getResponsiveSize(12),         // 12px - Navigation labels
  
  // Special elements
  quickActionText: getResponsiveSize(14), // 14px - Quick action cards
  emptyStateTitle: getResponsiveSize(18), // 18px - Empty state titles
  emptyStateText: getResponsiveSize(14),  // 14px - Empty state descriptions
  
  // News section
  newsTitle: getResponsiveSize(16),       // 16px - News article titles
  newsDescription: getResponsiveSize(14), // 14px - News article descriptions
  
  // Word cloud
  wordCloudText: getResponsiveSize(14),   // 14px - Word cloud words
  wordCloudCount: getResponsiveSize(11),  // 11px - Word cloud counts
};

// Helper function to get priority icon
const getPriorityIcon = (priority) => {
  const icons = {
    critical: 'alert-circle',
    high: 'alert-circle-outline',
    medium: 'ellipse-outline',
    low: 'checkmark-circle-outline'
  };
  return icons[priority] || 'ellipse-outline';
};

// Helper function to get color intensity based on count
const getColorIntensity = (count, maxCount, baseColor, type) => {
  const intensity = Math.min(count / Math.max(maxCount, 1), 1);
  
  if (type === 'word') {
    // For words: use a gradient from light gray to deep blue/black
    if (intensity > 0.8) return '#000000'; // Very high frequency: black
    if (intensity > 0.6) return '#1a1a2e'; // High: dark blue-black
    if (intensity > 0.4) return '#2667ff'; // Medium-high: blue
    if (intensity > 0.2) return '#4d79ff'; // Medium: lighter blue  
    return '#999999'; // Low: gray
  } else if (type === 'category') {
    // For categories: use saturated category colors for high frequency
    const alpha = Math.max(0.4, intensity);
    return adjustColorIntensity(baseColor, alpha);
  } else if (type === 'priority') {
    // For priorities: use their natural colors with intensity
    const alpha = Math.max(0.5, intensity);
    return adjustColorIntensity(baseColor, alpha);
  }
  
  return baseColor;
};

// Helper function to adjust color intensity
const adjustColorIntensity = (hexColor, intensity) => {
  // Convert hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Adjust intensity (higher intensity = more saturated/darker)
  const newR = Math.round(r * intensity);
  const newG = Math.round(g * intensity);
  const newB = Math.round(b * intensity);
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

// Memoized Feed Item Component - prevents re-renders when upvoting
const FeedItem = React.memo(({ 
  item, 
  timeAgo,
  colors,
  styles,
  handlePostPress,
  getCategoryColor,
  getTextColorForBackground,
  getPriorityColor,
  getPriorityIcon,
  getStatusColor,
  handleUpvote,
  userUpvotes,
  userData,
  handleDeletePost,
  navigation,
  handleMeToo,
  userAffected,
}) => {
  // Debug: Log the first item to check if authorRole is present
  React.useEffect(() => {
    console.log('Feed item data:', {
      id: item.id,
      anonymous: item.anonymous,
      authorRole: item.authorRole,
      authorName: item.authorName,
      authorProfilePic: item.authorProfilePic
    });
  }, []);
  
  return (
  <View style={[styles.tweetContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <View style={styles.tweetHeader}>
      <View style={styles.tweetAvatar}>
        {!item.anonymous && item.authorProfilePic ? (
          <Image 
            source={{ uri: item.authorProfilePic }} 
            style={{ width: 36, height: 36, borderRadius: 18 }}
          />
        ) : (
          <Ionicons 
            name={item.anonymous ? 'person-circle-outline' : 'person-circle'} 
            size={36} 
            color={item.anonymous ? colors.textSecondary : '#2667ff'} 
          />
        )}
      </View>
      <View style={styles.tweetMainContent}>
        <View style={styles.tweetTopRow}>
          <View style={styles.tweetUserInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.tweetUserName, { color: colors.text }]}>
                {item.anonymous ? 'Anonymous User' : (item.authorName || 'User')}
              </Text>
              {!item.anonymous && item.authorRole && (
                <View style={[
                  styles.roleBadge,
                  { 
                    backgroundColor: item.authorRole === 'faculty' ? '#ff6b6b' : '#51cf66',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4
                  }
                ]}>
                  <Text style={[
                    styles.roleBadgeText,
                    { 
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }
                  ]}>
                    {item.authorRole === 'faculty' ? '👨‍🏫 Faculty' : '🎓 Student'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.tweetUserMeta}>
              <Text style={[styles.tweetUsername, { color: colors.textSecondary }]}>
                @{(() => {
                  if (item.anonymous) return 'anonymous';
                  if (item.authorUsername && typeof item.authorUsername === 'string') {
                    return String(item.authorUsername);
                  }
                  if (item.authorEmail && typeof item.authorEmail === 'string') {
                    return String(item.authorEmail);
                  }
                  return 'user';
                })()}
              </Text>
              <Text style={[styles.tweetTime, { color: colors.textSecondary }]}>Â· {String(timeAgo || 'now')}</Text>
            </View>
          </View>
          <View style={[styles.tweetStatusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={[styles.tweetStatusText, { color: getTextColorForBackground(getStatusColor(item.status)) }]}>
              {String((item.status || 'unknown').replace('_', ' '))}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          onPress={() => handlePostPress(item)}
          activeOpacity={0.9}
        >
          <Text style={[styles.tweetContent, { color: colors.text }]} numberOfLines={4}>
            {String(item.description || 'No description available')}
          </Text>
          
          {item.media && item.media.length > 0 && (
            <View style={styles.tweetImageContainer}>
              {item.media.length === 1 ? (
                <Image 
                  source={{ uri: item.media[0] }} 
                  style={styles.tweetImageSingle}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.tweetImageGrid}>
                  {item.media.slice(0, 4).map((imageUrl, index) => (
                    <Image 
                      key={index}
                      source={{ uri: imageUrl }} 
                      style={[
                        styles.tweetImageMultiple,
                        item.media.length === 2 && styles.tweetImageTwo,
                        item.media.length === 3 && index === 0 && styles.tweetImageThreeFirst,
                        item.media.length === 3 && index > 0 && styles.tweetImageThreeOther
                      ]}
                      resizeMode="cover"
                    />
                  ))}
                  {item.media.length > 4 && (
                    <View style={styles.tweetImageOverlay}>
                      <Text style={styles.tweetImageOverlayText}>+{item.media.length - 4}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
          
          <View style={styles.tweetTags}>
            <View style={[
              styles.tweetCategoryTagSmall, 
              { backgroundColor: getCategoryColor(item.category) }
            ]}>
              <Text style={[
                styles.tweetCategoryTextSmall, 
                { color: getTextColorForBackground(getCategoryColor(item.category)) }
              ]}>
                {String(item.category || 'other')}
              </Text>
            </View>
            <View style={[
              item.priority === 'medium' ? styles.tweetPriorityTagSmall : styles.tweetPriorityTag, 
              { backgroundColor: getPriorityColor(item.priority) }
            ]}>
              {item.priority === 'medium' ? (
                <Ionicons 
                  name={getPriorityIcon(item.priority)} 
                  size={12} 
                  color={getTextColorForBackground(getPriorityColor(item.priority))} 
                />
              ) : (
                <Text style={[
                  styles.tweetPriorityText, 
                  { color: getTextColorForBackground(getPriorityColor(item.priority)) }
                ]}>
                  {String(item.priority || 'medium')}
                </Text>
              )}
            </View>
            {item.location?.building && (
              <View style={[styles.tweetLocationTag, { backgroundColor: colors.inputBackground }]}>
                <Ionicons name="location-outline" size={10} color={colors.textSecondary} />
                <Text style={[styles.tweetLocationText, { color: colors.textSecondary }]}>
                  {(() => {
                    const building = String(item.location?.building || 'Unknown');
                    const room = item.location?.room ? String(item.location.room) : '';
                    return room ? `${building} - ${room}` : building;
                  })()}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <View style={styles.tweetActions}>
          <TouchableOpacity 
            style={[styles.tweetActionBtn, userUpvotes[item.id] && styles.tweetActionBtnActive]}
            onPress={() => handleUpvote(item.id, userData?.uid)}
          >
            <Ionicons 
              name={userUpvotes[item.id] ? "arrow-up" : "arrow-up-outline"} 
              size={18} 
              color={userUpvotes[item.id] ? "#2667ff" : "#8E8E93"} 
            />
            <Text style={[
              styles.tweetActionText,
              userUpvotes[item.id] && styles.tweetActionTextActive
            ]}>
              {String(item.upvotes || 0)}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.tweetActionBtn}
            onPress={() => handlePostPress(item)}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#8E8E93" />
            <Text style={styles.tweetActionText}>{String(item.commentCount || 0)}</Text>
          </TouchableOpacity>

          <View style={styles.tweetActionBtn}>
            <Ionicons name="eye-outline" size={18} color="#8E8E93" />
            <Text style={styles.tweetActionText}>{String(item.viewCount || 0)}</Text>
          </View>

          {!item.anonymous && userData?.uid !== item.authorId && (
            <TouchableOpacity
              style={styles.tweetActionBtn}
              onPress={() => handleMeToo && handleMeToo(item.id)}
            >
              <Ionicons
                name={userAffected?.[item.id] ? 'hand-right' : 'hand-right-outline'}
                size={18}
                color={userAffected?.[item.id] ? '#ff9500' : '#8E8E93'}
              />
              <Text style={[styles.tweetActionText, userAffected?.[item.id] && { color: '#ff9500' }]}>
                {String(item.affectedCount || 0)}
              </Text>
            </TouchableOpacity>
          )}
          
          {userData?.uid === item.authorId && (() => {
            const now = new Date();
            const createdAt = item.createdAt instanceof Date 
              ? item.createdAt 
              : (item.createdAt?.toDate ? item.createdAt.toDate() : new Date());
            const diffInMinutes = (now - createdAt) / (1000 * 60);
            return diffInMinutes <= 15;
          })() && (
            <TouchableOpacity 
              style={styles.tweetActionBtn}
              onPress={() => {
                Alert.alert(
                  'Edit Report',
                  'You have 15 minutes to edit your report. Would you like to edit it now?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Edit', 
                      onPress: () => navigation.navigate('ReportScreen', { 
                        editMode: true,
                        reportId: item.id,
                        reportData: item
                      })
                    }
                  ]
                );
              }}
            >
              <Ionicons name="create-outline" size={18} color="#2667ff" />
              <Text style={[styles.tweetActionText, { color: '#2667ff' }]}>Edit</Text>
            </TouchableOpacity>
          )}
          
          {userData?.uid === item.authorId && (
            <TouchableOpacity 
              style={styles.tweetActionBtn}
              onPress={() => handleDeletePost(item.id, item.authorId)}
            >
              <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
              <Text style={[styles.tweetActionText, { color: '#ff6b6b' }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these props change
  return prevProps.item.id === nextProps.item.id &&
         prevProps.item.upvotes === nextProps.item.upvotes &&
         prevProps.item.affectedCount === nextProps.item.affectedCount &&
         prevProps.userUpvotes[prevProps.item.id] === nextProps.userUpvotes[nextProps.item.id] &&
         (prevProps.userAffected?.[prevProps.item.id]) === (nextProps.userAffected?.[nextProps.item.id]) &&
         prevProps.colors === nextProps.colors;
});

// Tab Components - moved outside to prevent hook order issues
const HomeTab = ({ 
  styles, 
  refreshing, 
  onRefresh, 
  schoolNews, 
  newsLoading, 
  renderNewsItem, 
  wordCloudLoading, 
  trendingWords, 
  getCategoryColor, 
  getPriorityColor, 
  feedLoading, 
  feed, 
  handleResetUpvotes, 
  getTimeAgo, 
  getStatusColor, 
  getTextColorForBackground, 
  handlePostPress, 
  userUpvotes, 
  handleUpvote, 
  userData, 
  handleDeletePost,
  handleMeToo,
  userAffected,
  searchQuery,
  setSearchQuery,
  selectedBuilding,
  setSelectedBuilding,
  buildings,
  filteredFeed,
  navigation,
  colors,
  setIndex,
}) => (
  <View style={[styles.homeTabContainer, { backgroundColor: colors.background }]}>
    <ScrollView 
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={32}
      bounces={Platform.OS === 'ios'}
      overScrollMode="never"
      nestedScrollEnabled={true}
      alwaysBounceVertical={false}
      directionalLockEnabled={true}
      removeClippedSubviews={false}
      scrollEnabled={true}
      automaticallyAdjustContentInsets={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#2667ff']}
          tintColor="#2667ff"
          title="Pull to refresh"
          titleColor="#666"
        />
      }
    >

    {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        HERO BANNER CARD â€” GCash-style greeting + CTA
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
    <LinearGradient
      colors={['#1338be', '#2667ff', '#0ea5e9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: 20,
        paddingBottom: 28,
        paddingHorizontal: 20,
        overflow: 'hidden',
      }}
    >
      {/* Decorative glow circles */}
      <View style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: '#ffffff0d' }} />
      <View style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: '#0ea5e915' }} />
      <View style={{ position: 'absolute', top: 10, right: 80, width: 60, height: 60, borderRadius: 30, backgroundColor: '#ffffff08' }} />
      {/* Top row: greeting + safety pulse */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 12, color: '#ffffffaa', letterSpacing: 0.5 }}>
            Good day,
          </Text>
          <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 20, color: '#fff', marginTop: 1 }} numberOfLines={1}>
            {userData?.name?.split(' ')[0] || 'Hello!'} 👋
          </Text>
        </View>
        {/* Safety status pill */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#ffffff20',
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 6,
        }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ade80', marginRight: 6 }} />
          <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 11, color: '#fff' }}>Campus Safe</Text>
        </View>
      </View>

      {/* CTA card */}
      <View style={{
        backgroundColor: '#ffffff18',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 14, color: '#fff', marginBottom: 4 }}>
            See something? Report it.
          </Text>
          <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 11, color: '#ffffffbb' }}>
            Anonymous, fast, and secure reporting
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('Report')}
          style={{
            backgroundColor: '#fff',
            borderRadius: 22,
            paddingHorizontal: 16,
            paddingVertical: 9,
            marginLeft: 12,
          }}
        >
          <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 12, color: '#2667ff' }}>Report Now</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>

    {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        QUICK ACTIONS GRID â€” 2 Ã— 4 like GCash
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
    <View style={{ backgroundColor: colors.surface, paddingVertical: 20, paddingHorizontal: 8 }}>
      {[
        [
          { label: 'File Report',  icon: 'create-outline',           color: '#2667ff', onPress: () => navigation.navigate('Report') },
          { label: 'Emergency',    icon: 'alert-circle-outline',     color: '#ef4444', onPress: () => navigation.navigate('EmergencyReport') },
          { label: 'My Reports',   icon: 'reader-outline',           color: '#8b5cf6', onPress: () => navigation.navigate('MyReports') },
          { label: 'Hotspot Map',  icon: 'location-outline',         color: '#f59e0b', onPress: () => navigation.navigate('HotspotMap') },
        ],
        [
          { label: 'Appeal',       icon: 'ribbon-outline',           color: '#06b6d4', onPress: () => navigation.navigate('Appeal') },
          { label: 'Messages',     icon: 'chatbubble-ellipses-outline', color: '#22c55e', onPress: () => navigation.navigate('AdminMessaging') },
          { label: 'Navigator',    icon: 'navigate-outline',         color: '#a855f7', onPress: () => setIndex && setIndex(5) },
          { label: 'View All',     icon: 'apps-outline',             color: '#64748b', onPress: () => {} },
        ],
      ].map((row, rowIdx) => (
        <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: rowIdx === 0 ? 4 : 0 }}>
          {row.map((action) => (
            <TouchableOpacity
              key={action.label}
              onPress={action.onPress}
              activeOpacity={0.6}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}
            >
              <Ionicons name={action.icon} size={30} color={action.color} style={{ marginBottom: 8 }} />
              <Text style={{
                fontFamily: 'Outfit-SemiBold',
                fontSize: 11,
                color: colors.text,
                textAlign: 'center',
              }}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>

    {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        CAMPUS SERVICES â€” horizontal scroll like "Do more with GCash"
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
    <View style={{ paddingTop: 20, paddingBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 14 }}>
        <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 15, color: colors.text, flex: 1 }}>
          Do more with Safire!
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
      >
        {[
          { label: 'Smart\nAttendance', icon: 'school-outline',          color: '#2667ff', screen: 'SmartAttendance' },
          { label: 'Lost &\nFound',     icon: 'search-outline',           color: '#d97706', screen: 'LostAndFound' },
          { label: 'Counseling',        icon: 'heart-outline',            color: '#16a34a', screen: null },
          { label: 'Library',           icon: 'book-outline',             color: '#db2777', screen: 'Library' },
          { label: 'Announce-\nments',  icon: 'megaphone-outline',        color: '#7c3aed', screen: null },
          { label: 'Campus\nEvents',    icon: 'calendar-outline',         color: '#ea580c', screen: null },
          { label: 'Facilities',        icon: 'business-outline',         color: '#0891b2', screen: null },
          { label: 'Health\nServices',  icon: 'medkit-outline',           color: '#dc2626', screen: null },
        ].map((svc) => (
          <TouchableOpacity
            key={svc.label}
            activeOpacity={0.6}
            onPress={() => svc.screen ? navigation.navigate(svc.screen) : Alert.alert('Coming Soon', `${svc.label.replace('\n', ' ')} is coming in a future update!`)}
            style={{ alignItems: 'center', width: 64 }}
          >
            <Ionicons name={svc.icon} size={32} color={svc.color} style={{ marginBottom: 8 }} />
            <Text style={{
              fontFamily: 'Outfit-SemiBold',
              fontSize: 10,
              color: colors.text,
              textAlign: 'center',
              lineHeight: 14,
            }}>
              {svc.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>

    {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        FEATURE POSTCARDS â€” promotional banners
    â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
      <Text style={{
        fontFamily: 'Outfit-Bold',
        fontSize: 15,
        color: colors.text,
        marginBottom: 12,
      }}>
        Campus Features
      </Text>

      {/* Postcard 1 â€” Smart Attendance */}
      <View style={{
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#1e3a5f',
      }}>
        <View style={{ padding: 18, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <View style={{
              alignSelf: 'flex-start',
              backgroundColor: '#ffffff22',
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
              marginBottom: 8,
            }}>
              <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 9, color: '#93c5fd', letterSpacing: 1 }}>NEW</Text>
            </View>
            <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 16, color: '#fff', marginBottom: 5 }}>
              Smart Attendance
            </Text>
            <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 12, color: '#93c5fd', lineHeight: 18 }}>
              QR-based check-in for classes, events, and campus activities â€” all in one tap.
            </Text>
          </View>
          <Text style={{ fontSize: 48, marginLeft: 12 }}>🎓</Text>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: '#2563eb', paddingVertical: 11, alignItems: 'center' }}
          onPress={() => navigation.navigate('SmartAttendance')}
        >
          <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 12, color: '#fff' }}>Open Feature</Text>
        </TouchableOpacity>
      </View>

      {/* Postcard 2 â€” AI Safety Monitor */}
      <View style={{
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#1a1a2e',
      }}>
        <View style={{ padding: 18, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <View style={{
              alignSelf: 'flex-start',
              backgroundColor: '#ffffff22',
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
              marginBottom: 8,
            }}>
              <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 9, color: '#a78bfa', letterSpacing: 1 }}>ACTIVE</Text>
            </View>
            <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 16, color: '#fff', marginBottom: 5 }}>
              AI Safety Monitor
            </Text>
            <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 12, color: '#c4b5fd', lineHeight: 18 }}>
              Every report is automatically reviewed by AI to ensure it meets community standards.
            </Text>
          </View>
          <Text style={{ fontSize: 48, marginLeft: 12 }}>🤖</Text>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: '#7c3aed', paddingVertical: 11, alignItems: 'center' }}
          onPress={() => navigation.navigate('Report')}
        >
          <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 12, color: '#fff' }}>Try It Now</Text>
        </TouchableOpacity>
      </View>

      {/* Postcard 3 â€” Anonymous Reporting */}
      <View style={{
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: '#064e3b',
      }}>
        <View style={{ padding: 18, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <View style={{
              alignSelf: 'flex-start',
              backgroundColor: '#ffffff22',
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
              marginBottom: 8,
            }}>
              <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 9, color: '#6ee7b7', letterSpacing: 1 }}>PRIVACY FIRST</Text>
            </View>
            <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 16, color: '#fff', marginBottom: 5 }}>
              Anonymous Reporting
            </Text>
            <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 12, color: '#6ee7b7', lineHeight: 18 }}>
              Your identity is fully protected. Report incidents without fear of exposure.
            </Text>
          </View>
          <Text style={{ fontSize: 48, marginLeft: 12 }}>🛡️</Text>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: '#059669', paddingVertical: 11, alignItems: 'center' }}
          onPress={() => navigation.navigate('Report', { forceAnonymous: true })}
        >
          <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 12, color: '#fff' }}>Report Anonymously</Text>
        </TouchableOpacity>
      </View>

      {/* Postcard 4 â€” Campus Health & Helpline */}
      <View style={{
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 4,
        backgroundColor: '#7f1d1d',
      }}>
        <View style={{ padding: 18, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <View style={{
              alignSelf: 'flex-start',
              backgroundColor: '#ffffff22',
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
              marginBottom: 8,
            }}>
              <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 9, color: '#fca5a5', letterSpacing: 1 }}>24 / 7</Text>
            </View>
            <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 16, color: '#fff', marginBottom: 5 }}>
              Emergency Helpline
            </Text>
            <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 12, color: '#fca5a5', lineHeight: 18 }}>
              Instant SOS reporting with GPS tracking. Response guaranteed within 30 minutes.
            </Text>
          </View>
          <Text style={{ fontSize: 48, marginLeft: 12 }}>🆘</Text>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: '#dc2626', paddingVertical: 11, alignItems: 'center' }}
          onPress={() => navigation.navigate('EmergencyReport')}
        >
          <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 12, color: '#fff' }}>Emergency Report</Text>
        </TouchableOpacity>
      </View>
    </View>

    {/* Divider between marketing and content */}
    <View style={{ height: 8, backgroundColor: colors.background }} />

    {/* School News Feed Section */}
    <View style={[styles.schoolNewsSection, { backgroundColor: colors.background }]}>
      <View style={styles.newsSectionHeader}>
        <Text style={[styles.newsSectionTitle, { color: colors.text }]}>School News</Text>
        <View style={styles.newsHeaderRight}>
          {schoolNews.length > 0 && (
            <View style={styles.newsScrollIndicator}>
              <Ionicons name="swap-horizontal" size={14} color="#999" />
              <Text style={styles.newsScrollIndicatorText}>Swipe</Text>
            </View>
          )}
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => {
              const url = 'https://www.cjc.edu.ph/category/news/';
              if (Platform.OS === 'web') {
                window.open(url, '_blank');
              } else {
                Linking.openURL(url).catch(err => {
                  console.error('Error opening URL:', err);
                  Alert.alert('Error', 'Unable to open news website');
                });
              }
            }}
          >
            <Text style={styles.viewAllButtonText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color="#2667ff" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={{ height: newsLoading || schoolNews.length === 0 ? 80 : 270 }}>
        {newsLoading ? (
          <View style={styles.newsLoadingContainer}>
            <ActivityIndicator size="small" color="#2667ff" style={{ marginRight: 8 }} />
            <Text style={styles.newsLoadingText}>Loading latest news...</Text>
          </View>
        ) : schoolNews.length === 0 ? (
          <View style={styles.emptyNewsContainer}>
            <Ionicons name="newspaper-outline" size={32} color="#ccc" />
            <Text style={styles.emptyNewsText}>No news available</Text>
          </View>
        ) : (
          <FlatList
            data={schoolNews}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 0 }}
            decelerationRate={Platform.OS === 'ios' ? 0.95 : 0.98}
            snapToInterval={null}
            snapToAlignment={undefined}
            bounces={Platform.OS === 'ios'}
            scrollEventThrottle={8}
            removeClippedSubviews={true}
            alwaysBounceHorizontal={true}
            directionalLockEnabled={true}
            nestedScrollEnabled={false}
            maxToRenderPerBatch={4}
            windowSize={7}
            initialNumToRender={3}
            updateCellsBatchingPeriod={30}
            disableIntervalMomentum={false}
            getItemLayout={undefined}
            renderItem={renderNewsItem}
            pagingEnabled={false}
            overScrollMode="always"
            scrollEnabled={true}
          />
        )}
      </View>
    </View>

    {/* Trending Topics Word Cloud Section */}
    <View style={styles.trendingSectionTransparent}>
      <View style={styles.trendingSectionHeader}>
        <View style={styles.trendingTitleContainer}>
          <Ionicons name="trending-up" size={20} color="#2667ff" style={{ marginRight: 8 }} />
          <Text style={styles.trendingSectionTitle}>Trending Topics</Text>
        </View>
        <Text style={styles.trendingSubtitle}>What's being discussed</Text>
      </View>
      
      {wordCloudLoading ? (
        <View style={styles.wordCloudLoadingContainer}>
          <ActivityIndicator size="small" color="#2667ff" style={{ marginRight: 8 }} />
          <Text style={styles.wordCloudLoadingText}>Analyzing trends...</Text>
        </View>
      ) : trendingWords.length === 0 ? (
        <View style={styles.emptyWordCloudContainer}>
          <Ionicons name="analytics-outline" size={32} color="#ccc" />
          <Text style={styles.emptyWordCloudText}>No trending topics yet</Text>
          <Text style={styles.emptyWordCloudSubtext}>Trends will appear as more reports are submitted</Text>
        </View>
      ) : (
        <View style={styles.wordCloudContainer}>
          {trendingWords.map((word, index) => (
            <TouchableOpacity
              key={word.id}
              onPress={() => {
                Alert.alert(
                  'Trending Topic',
                  `"${word.text}" appears in ${word.count} recent ${word.type === 'word' ? 'reports' : word.type + 's'}.`,
                  [{ text: 'OK' }]
                );
              }}
              activeOpacity={0.7}
              style={styles.wordCloudTextItem}
            >
              <Text style={[
                styles.wordCloudText, 
                { 
                  color: word.color,
                  fontSize: word.size
                }
              ]}>
                {word.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>

    {/* Recent Activity Section */}
    <View style={styles.feedSectionTransparent}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
      
      {/* Search and Filter Controls */}
      <View style={styles.searchFilterContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search reports..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.buildingFilterScroll}
          contentContainerStyle={styles.buildingFilterContainer}
        >
          {buildings.map((building) => (
            <TouchableOpacity
              key={building}
              style={[
                styles.buildingChip,
                { backgroundColor: colors.inputBackground, borderColor: colors.border },
                selectedBuilding === building && styles.buildingChipActive
              ]}
              onPress={() => setSelectedBuilding(building)}
            >
              <Ionicons 
                name={building === 'all' ? 'grid-outline' : 'business-outline'} 
                size={14} 
                color={selectedBuilding === building ? '#fff' : '#2667ff'} 
                style={{ marginRight: 4 }}
              />
              <Text style={[
                styles.buildingChipText,
                selectedBuilding === building && styles.buildingChipTextActive
              ]}>
                {building === 'all' ? 'All Buildings' : building}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {(searchQuery !== '' || selectedBuilding !== 'all') && (
          <View style={styles.filterResultsInfo}>
            <Text style={[styles.filterResultsText, { color: colors.textSecondary }]}>
              Showing {filteredFeed.length} of {feed.length} reports
            </Text>
            {(searchQuery !== '' || selectedBuilding !== 'all') && (
              <TouchableOpacity 
                onPress={() => {
                  setSearchQuery('');
                  setSelectedBuilding('all');
                }}
                style={[styles.clearFiltersButton, { backgroundColor: colors.inputBackground }]}
              >
                <Text style={[styles.clearFiltersText, { color: '#2667ff' }]}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      
      {feedLoading ? (
        <View style={styles.feedLoading}>
          <ActivityIndicator size="large" color="#2667ff" />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading reports...</Text>
          <Text style={[styles.loadingHint, { color: colors.textSecondary }]}>Getting latest reports from the community</Text>
        </View>
      ) : filteredFeed.length === 0 ? (
        <View style={styles.emptyFeed}>
          <Ionicons name="document-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.emptyFeedText, { color: colors.text }]}>
            {searchQuery !== '' || selectedBuilding !== 'all' ? 'No reports match your filters' : 'No reports yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFeed}
          renderItem={({ item }) => (
            <FeedItem
              item={item}
              timeAgo={getTimeAgo(item.createdAt)}
              colors={colors}
              styles={styles}
              handlePostPress={handlePostPress}
              getCategoryColor={getCategoryColor}
              getTextColorForBackground={getTextColorForBackground}
              getPriorityColor={getPriorityColor}
              getPriorityIcon={getPriorityIcon}
              getStatusColor={getStatusColor}
              handleUpvote={handleUpvote}
              userUpvotes={userUpvotes}
              userData={userData}
              handleDeletePost={handleDeletePost}
              navigation={navigation}
              handleMeToo={handleMeToo}
              userAffected={userAffected}
            />
          )}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          nestedScrollEnabled={true}
          removeClippedSubviews={false}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10
          }}
        />
      )}
    </View>

    {/* Recent Activity Section */}
    <View style={styles.feedSectionTransparent}>
      <View style={styles.feedSectionHeader}>
        <Text style={[styles.feedSectionTitle, { color: colors.text }]}>Recent Activity</Text>
      </View>
    </View>
  </ScrollView>
  </View>
);

const DashboardTab = ({ styles, navigation }) => {
  const { colors = { background: '#fff', text: '#000', textSecondary: '#666' } } = useTheme() || {};
  const handleDashboardPress = () => {
    try {
      if (navigation && navigation.navigate) {
        navigation.navigate('Dashboard');
      } else {
        console.error('Navigation object not available');
        Alert.alert('Error', 'Navigation not available');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to open dashboard');
    }
  };

  return (
    <View style={[styles.centerTab, { backgroundColor: colors.background }]}>
      <Ionicons name="pie-chart" size={64} color="#2667ff" />
      <Text style={[styles.tabTitle, { color: colors.text }]}>Analytics Dashboard</Text>
      <Text style={[styles.tabSubtitle, { color: colors.textSecondary }]}>View reports, statistics, and insights</Text>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={handleDashboardPress}
      >
        <Text style={styles.actionButtonText}>Open Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
};

const SubmitTab = ({ styles, navigation }) => {
  const { colors = { background: '#fff', text: '#000', textSecondary: '#666' } } = useTheme() || {};
  const handleReportPress = () => {
    try {
      if (navigation && navigation.navigate) {
        navigation.navigate('Report');
      } else {
        console.error('Navigation object not available');
        Alert.alert('Error', 'Navigation not available');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to open report submission');
    }
  };

  return (
    <View style={[styles.centerTab, { backgroundColor: colors.background }]}>
      <Ionicons name="add-circle" size={64} color="#2667ff" />
      <Text style={[styles.tabTitle, { color: colors.text }]}>Submit a Report</Text>
      <Text style={[styles.tabSubtitle, { color: colors.textSecondary }]}>Share an incident or feedback</Text>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={handleReportPress}
      >
        <Text style={styles.actionButtonText}>Submit Report</Text>
      </TouchableOpacity>
    </View>
  );
};

const ComplaintTab = ({ styles, navigation }) => {
  const { colors = { background: '#fff', text: '#000', textSecondary: '#666' } } = useTheme() || {};
  return (
  <View style={[styles.centerTab, { backgroundColor: colors.background }]}>
    <Ionicons name="warning-outline" size={64} color="#ff6b6b" />
    <Text style={[styles.tabTitle, { color: colors.text }]}>File Official Complaint</Text>
    <Text style={[styles.tabSubtitle, { color: colors.textSecondary }]}>Submit formal complaint for administrative review</Text>
    <TouchableOpacity 
      style={styles.actionButton}
      onPress={() => navigation.navigate('Report', { isComplaint: true })}
    >
      <Text style={styles.actionButtonText}>Lodge Complaint</Text>
    </TouchableOpacity>
  </View>
  );
};

const MessagesTab = ({ styles, navigation, userData, colors }) => {
  return (
    <View style={[styles.centerTab, { backgroundColor: colors?.background || '#fff' }]}>
      <Ionicons name="chatbubbles-outline" size={64} color="#2667ff" />
      <Text style={[styles.tabTitle, { color: colors?.text || '#000' }]}>Messages</Text>
      <Text style={[styles.tabSubtitle, { color: colors?.textSecondary || '#666', textAlign: 'center', paddingHorizontal: 40 }]}>
        Chat with admin support team for help and inquiries
      </Text>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => navigation.navigate('AdminMessaging')}
      >
        <Ionicons name="chatbubbles" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.actionButtonText}>Start Conversation</Text>
      </TouchableOpacity>
      <Text style={[{ color: colors?.textSecondary || '#666', fontSize: 12, marginTop: 16 }]}>
        Available 24/7
      </Text>
    </View>
  );
};

const AccountTab = ({ styles, userData, navigation, handleLogout, clearUserData, feedReports, setIndex }) => {
  const { isDarkMode = false, toggleDarkMode = () => {}, colors = { background: '#fff', surface: '#fff', card: '#f0f4ff', text: '#000', textSecondary: '#666', border: '#e0e0e0', inputBackground: '#f5f5f5' } } = useTheme() || {};

  if (!userData) {
    return (
      <View style={[styles.centerTab, { justifyContent: 'center' }]}>
        <Ionicons name="alert-circle" size={50} color="#ff6b6b" />
        <Text style={{ marginTop: 10, color: '#666', fontFamily: 'Outfit-Regular' }}>No user data available</Text>
        <TouchableOpacity style={[styles.logoutBtn, { marginTop: 20 }]} onPress={() => { clearUserData(); navigation.navigate('Login'); }}>
          <Text style={styles.logoutText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Derived values
  const displayName = userData?.name || userData?.username || 'User';
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const username = (() => {
    if (userData?.username) return '@' + userData.username;
    if (userData?.email) return '@' + userData.email.split('@')[0];
    return '@user';
  })();
  const roleBadge = userData?.role === 'faculty' ? 'Faculty' : 'Student';
  const myReports = feedReports.filter(r => r.authorId === userData?.uid);
  const totalReports  = myReports.length;
  const pendingCount  = myReports.filter(r => r.status === 'pending').length;
  const resolvedCount = myReports.filter(r => r.status === 'resolved').length;

  // â”€â”€ Reusable row component (icon + label + right side + chevron) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const MenuRow = ({ icon, iconColor = '#2667ff', label, right, onPress, isLast = false, danger = false }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.65}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        backgroundColor: colors.surface,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      {/* Left icon */}
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: danger ? '#fee2e2' : iconColor + '18',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
      }}>
        <Ionicons name={icon} size={18} color={danger ? '#ef4444' : iconColor} />
      </View>

      {/* Label */}
      <Text style={{
        flex: 1,
        fontFamily: 'Outfit-SemiBold',
        fontSize: 14,
        color: danger ? '#ef4444' : colors.text,
      }}>
        {label}
      </Text>

      {/* Right element (badge, toggle, text) */}
      {right && <View style={{ marginRight: 6 }}>{right}</View>}

      {/* Chevron */}
      {!danger && <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />}
    </TouchableOpacity>
  );

  // â”€â”€ Section wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const MenuSection = ({ title, children }) => (
    <View style={{ marginTop: 20 }}>
      {title && (
        <Text style={{
          fontFamily: 'Outfit-Bold',
          fontSize: 11,
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginLeft: 20,
          marginBottom: 6,
        }}>
          {title}
        </Text>
      )}
      <View style={{
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
      }}>
        {children}
      </View>
    </View>
  );

  // â”€â”€ Dark mode toggle (inline right element) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const DarkModeToggle = () => (
    <TouchableOpacity
      onPress={toggleDarkMode}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        backgroundColor: isDarkMode ? '#2667ff' : '#d1d5db',
        justifyContent: 'center',
        paddingHorizontal: 2,
      }}
    >
      <View style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#fff',
        transform: [{ translateX: isDarkMode ? 18 : 0 }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
      }} />
    </TouchableOpacity>
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* â”€â”€ Header â”€â”€ */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('EditProfile')}
        style={{
          backgroundColor: '#2667ff',
          paddingTop: 28,
          paddingBottom: 24,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {/* Avatar */}
        {userData?.profilePic ? (
          <Image
            source={{ uri: userData.profilePic }}
            style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#ffffff55' }}
          />
        ) : (
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: '#fff',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 22, color: '#2667ff' }}>{initials}</Text>
          </View>
        )}

        {/* Name + role */}
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' }} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 13, color: '#ffffffbb', marginTop: 2 }} numberOfLines={1}>
            {username}
          </Text>
          <View style={{
            marginTop: 5,
            alignSelf: 'flex-start',
            backgroundColor: '#ffffff25',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}>
            <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 11, color: '#fff' }}>{roleBadge}</Text>
          </View>
        </View>

        {/* Chevron to edit profile */}
        <Ionicons name="chevron-forward" size={20} color="#ffffffbb" />
      </TouchableOpacity>

      {/* â”€â”€ Report Stats Strip (CTA below header) â”€â”€ */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        {[
          { label: 'Total',    value: totalReports,  color: '#2667ff' },
          { label: 'Pending',  value: pendingCount,  color: '#f59e0b' },
          { label: 'Resolved', value: resolvedCount, color: '#22c55e' },
        ].map((stat, i) => (
          <TouchableOpacity
            key={stat.label}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 16,
              borderRightWidth: i < 2 ? 1 : 0,
              borderRightColor: colors.border,
            }}
            onPress={() => navigation.navigate('MyReports')}
          >
            <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 22, color: stat.color }}>{stat.value}</Text>
            <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* â”€â”€ Trophies strip â”€â”€ */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
        <TrophyDisplay
          reportsCount={totalReports}
          userTrophies={userData?.trophies || []}
          colors={colors}
          isDarkMode={isDarkMode}
        />
      </View>

      {/* â”€â”€ My Activity â”€â”€ */}
      <MenuSection title="My Activity">
        <MenuRow
          icon="reader-outline"
          label="My Reports"
          right={<Text style={{ fontSize: 13, color: colors.textSecondary, fontFamily: 'Outfit-Regular' }}>{totalReports} total</Text>}
          onPress={() => navigation.navigate('MyReports')}
        />
        <MenuRow
          icon="location-outline"
          iconColor="#ef4444"
          label="Campus Hotspot Map"
          onPress={() => navigation.navigate('HotspotMap')}
        />
        <MenuRow
          icon="ribbon-outline"
          iconColor="#8b5cf6"
          label="My Appeals"
          onPress={() => navigation.navigate('Appeal')}
          isLast
        />
      </MenuSection>

      {/* â”€â”€ Account â”€â”€ */}
      <MenuSection title="Account">
        <MenuRow
          icon="person-circle-outline"
          label="Edit Profile"
          right={<Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: 'Outfit-Regular' }}>{userData?.email || ''}</Text>}
          onPress={() => navigation.navigate('EditProfile')}
        />
        <MenuRow
          icon="card-outline"
          iconColor="#06b6d4"
          label="Student ID"
          right={<Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: 'Outfit-Regular' }}>{userData?.studentId || 'Not set'}</Text>}
          onPress={() => navigation.navigate('EditProfile')}
        />
        <MenuRow
          icon={isDarkMode ? 'moon-outline' : 'sunny-outline'}
          iconColor="#f59e0b"
          label="Dark Mode"
          right={<DarkModeToggle />}
          onPress={toggleDarkMode}
          isLast
        />
      </MenuSection>

      {/* â”€â”€ More â”€â”€ */}
      <MenuSection title="More">
        <MenuRow
          icon="chatbubble-outline"
          iconColor="#22c55e"
          label="Submit Test Feedback"
          onPress={() => navigation.navigate('TestFeedback')}
          isLast
        />
      </MenuSection>

      {/* â”€â”€ Log Out â”€â”€ */}
      <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
        <MenuRow
          icon="log-out-outline"
          label="Log Out"
          danger
          onPress={handleLogout}
          isLast
        />
      </View>
    </ScrollView>
  );
};

// Move renderNewsItem outside the component to avoid hook issues
const createRenderNewsItem = (schoolNews, getCategoryColor, styles) => ({ item, index }) => (
  <TouchableOpacity
    style={[
      styles.newsCardOptimized,
      index === 0 && styles.newsCardFirst,
      index === schoolNews.length - 1 && styles.newsCardLast
    ]}
    onPress={() => {
      const url = item.url;
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        Linking.openURL(url).catch(err => {
          console.error('Error opening article URL:', err);
          Alert.alert('Error', 'Unable to open article');
        });
      }
    }}
    activeOpacity={0.85}
  >
    <View style={styles.newsImageContainerOptimized}>
      <FastImage
        source={{ uri: getOptimizedImageUrl(item.image, 'medium') }}
        style={styles.newsImageOptimized}
        resizeMode="cover"
        category={item.category}
      />
      <View style={styles.categoryBadgeTop}>
        <Text style={styles.categoryBadgeTextTop}>{item.category}</Text>
      </View>
    </View>
    <View style={styles.newsContentOptimized}>
      <Text style={styles.newsTitleOptimized} numberOfLines={2}>{item.title}</Text>
      <TouchableOpacity 
        onPress={() => {
          const url = item.url;
          if (Platform.OS === 'web') {
            window.open(url, '_blank');
          } else {
            Linking.openURL(url).catch(err => {
              console.error('Error opening article URL:', err);
              Alert.alert('Error', 'Unable to open article');
            });
          }
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.newsExcerptOptimized} numberOfLines={3}>
          {item.excerpt}... <Text style={styles.readMoreInlineText}>Read More</Text>
        </Text>
      </TouchableOpacity>
      
      <View style={styles.newsMetaOptimized}>
        <TouchableOpacity 
          style={styles.newsPublishInfo} 
          onPress={() => {
            const fullDate = new Date(item.date).toLocaleDateString('en-US', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            });
            Alert.alert('Publication Date', fullDate);
          }} 
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={12} color="#666" />
          <Text style={styles.newsPublishedText}>
            Published {formatNewsDate(item.date)}
          </Text>
        </TouchableOpacity>
        <View style={styles.newsTimeContainer}>
          <Ionicons name="time-outline" size={12} color="#999" />
          <Text style={styles.newsTimeText}>{(() => {
            try {
              const date = new Date(item.date);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } catch {
              return 'Recent';
            }
          })()}</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>
);

export default function HomeScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { isDarkMode = false, colors = { background: '#fff', surface: '#fff', card: '#f0f4ff', text: '#000', textSecondary: '#666', border: '#e0e0e0', inputBackground: '#f5f5f5', placeholder: '#999' } } = useTheme() || {};
  
  // Ref to maintain scroll position
  const scrollViewRef = useRef(null);
  
  // All hooks must be called at the top level
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false); // Moved to top level
  const [routes] = useState([
    { key: 'home', title: 'Home' },
    { key: 'dashboard', title: 'Support' },
    { key: 'messages', title: 'Messages' },
    { key: 'plus', title: 'Submit' },
    { key: 'complaint', title: 'Complaint' },
    { key: 'navigator', title: 'Navigator' },
    { key: 'account', title: 'Account' },
  ]);
  const { user: userData, loading: userLoading, clearUserData } = useUser();
  const [localLoading, setLocalLoading] = useState(true);
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedInitialized, setFeedInitialized] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userUpvotes, setUserUpvotes] = useState({});
  const [userAffected, setUserAffected] = useState({});
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [schoolNews, setSchoolNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [trendingWords, setTrendingWords] = useState([]);
  const [wordCloudLoading, setWordCloudLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');

  // Get unique buildings from feed (memoized)
  const buildings = useMemo(() => 
    ['all', ...new Set(feed.filter(item => item.location?.building).map(item => item.location.building))],
    [feed]
  );

  // Filter feed based on search query and selected building (memoized)
  const filteredFeed = useMemo(() => 
    feed.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.authorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location?.building?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesBuilding = selectedBuilding === 'all' || item.location?.building === selectedBuilding;
      
      return matchesSearch && matchesBuilding;
    }),
    [feed, searchQuery, selectedBuilding]
  );

  // Update local loading state when user data is loaded
  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const timer = setTimeout(() => {
      console.log('Loading timeout reached, forcing loading to false');
      setLocalLoading(false);
    }, 5000); // 5 second timeout

    // Clean up the timeout if the component unmounts
    return () => clearTimeout(timer);
  }, []); // Empty dependency - this should only run once on mount

  // Update local loading based on userLoading
  useEffect(() => {
    if (!userLoading) {
      setLocalLoading(false);
    }
  }, [userLoading]);

  // Load fonts
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
        console.error('Error loading fonts:', error);
        // Even if fonts fail to load, show the UI with system fonts
        setFontsLoaded(true);
      } finally {
        // Ensure loading is always set to false
        setTimeout(() => setLocalLoading(false), 100);
      }
    };

    loadFonts();
  }, []);

  // Log user data changes for debugging
  useEffect(() => {
    console.log('User data in HomeScreen:', userData);
  }, [userData]);

  // Go to Account tab if coming from AccountSetup
  useEffect(() => {
    if (route?.params?.goToAccount) {
      setIndex(4); // Account tab index
    }
  }, [route]);

  // Set up real-time feed subscription
  useEffect(() => {
    // Only subscribe if user is authenticated
    if (!userData?.uid) {
      console.log('No authenticated user - skipping feed subscription');
      setFeed([]);
      setFeedLoading(false);
      setFeedInitialized(true);
      return;
    }

    console.log('Setting up feed subscription...');
    setFeedLoading(true);
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('Feed loading timeout - setting empty feed');
      setFeed([]);
      setFeedLoading(false);
      setFeedInitialized(true);
    }, 5000);
    
    const unsubscribe = ReportService.subscribeToFeed(
      (reports) => {
        console.log('Feed updated - received reports:', reports.length);
        clearTimeout(loadingTimeout);
      
      // Only update if the data actually changed to prevent unnecessary re-renders
      setFeed(prevFeed => {
        // Check if reports are actually different
        if (prevFeed.length !== reports.length) {
          return reports;
        }
        
        // Check if any report content changed
        const hasChanges = reports.some((newReport, index) => {
          const oldReport = prevFeed[index];
          return !oldReport || 
                 oldReport.id !== newReport.id ||
                 oldReport.upvotes !== newReport.upvotes ||
                 oldReport.commentCount !== newReport.commentCount ||
                 oldReport.status !== newReport.status;
        });
        
        return hasChanges ? reports : prevFeed;
      });
      
      setFeedLoading(false);
      setFeedInitialized(true);
    },
    20, // limit
    userData?.uid // current user ID for filtering
    );

    return () => {
      console.log('Cleaning up feed subscription');
      clearTimeout(loadingTimeout);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userData?.uid]); // Depend on user authentication state

  // Set up notifications subscription
  useEffect(() => {
    if (!userData?.uid) return;

    console.log('Setting up notifications subscription for:', userData.uid);
    
    // Subscribe to notifications
    const notificationsUnsubscribe = ReportService.subscribeToNotifications(
      userData.uid,
      (notifications) => {
        console.log('Notifications updated:', notifications.length);
        setNotifications(notifications);
      }
    );

    // Subscribe to unread count
    const unreadUnsubscribe = ReportService.subscribeToUnreadCount(
      userData.uid,
      (count) => {
        console.log('Unread count updated:', count);
        setUnreadCount(count);
      }
    );

    return () => {
      console.log('Cleaning up notifications subscriptions');
      if (notificationsUnsubscribe) notificationsUnsubscribe();
      if (unreadUnsubscribe) unreadUnsubscribe();
    };
  }, [userData?.uid]);

  // Load user upvotes for feed items - only when feed IDs change
  useEffect(() => {
    if (!userData?.uid || feed.length === 0) return;

    const loadUserVotes = async () => {
      const votes = {};
      for (const item of feed) {
        try {
          const voteResult = await ReportService.getUserVote(item.id, userData.uid);
          votes[item.id] = voteResult.hasVoted && voteResult.voteType === 'upvote';
        } catch (error) {
          console.error('Error loading vote for report:', item.id, error);
        }
      }
      
      // Only update if votes actually changed
      setUserUpvotes(prevVotes => {
        const hasChanges = Object.keys(votes).some(id => prevVotes[id] !== votes[id]) ||
                          Object.keys(prevVotes).length !== Object.keys(votes).length;
        return hasChanges ? votes : prevVotes;
      });
    };

    loadUserVotes();
  }, [feed.map(item => item.id).join(','), userData?.uid]); // Only re-run when feed IDs change

  // Load school news using the advanced news service
  useEffect(() => {
    const loadSchoolNews = async () => {
      try {
        setNewsLoading(true);
        
        // Try to fetch real CJC news first, fallback to mock data
        const news = await fetchRealCJCNews();
        setSchoolNews(news);
        
        // Preload first 3 images for better performance
        if (news.length > 0) {
          const imageUrls = news
            .slice(0, 3)
            .map(article => getOptimizedImageUrl(article.image, 200, 120))
            .filter(Boolean);
          
          // Preload in background without blocking UI
          preloadImages(imageUrls).catch(() => {
            console.log('Image preloading completed with some failures');
          });
        }
      } catch (error) {
        console.error('Error fetching school news:', error);
        setSchoolNews([]);
      } finally {
        setNewsLoading(false);
      }
    };

    loadSchoolNews();
  }, []);

  // Generate trending words when feed updates
  useEffect(() => {
    if (feed.length > 0) {
      setWordCloudLoading(true);
      // Add a small delay to make it feel more natural
      setTimeout(() => {
        const trending = generateTrendingWords(feed);
        setTrendingWords(trending);
        setWordCloudLoading(false);
      }, 300);
    } else {
      setTrendingWords([]);
      setWordCloudLoading(false);
    }
  }, [feed]);

  // Handle upvote functionality - wrapped in useCallback to prevent re-renders
  const handleUpvote = useCallback(async (reportId, currentUserId) => {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to upvote');
      return;
    }

    // Optimistic update - update UI immediately
    const currentUpvoteState = userUpvotes[reportId];
    const newUpvoteState = !currentUpvoteState;
    
    setUserUpvotes(prev => ({
      ...prev,
      [reportId]: newUpvoteState
    }));
    
    setFeed(prevFeed => 
      prevFeed.map(item => 
        item.id === reportId 
          ? { 
              ...item, 
              upvotes: newUpvoteState ? (item.upvotes || 0) + 1 : Math.max((item.upvotes || 0) - 1, 0)
            }
          : item
      )
    );

    try {
      const result = await ReportService.upvoteReport(reportId, currentUserId);
      if (!result.success) {
        // Revert optimistic update on error
        setUserUpvotes(prev => ({
          ...prev,
          [reportId]: currentUpvoteState
        }));
        setFeed(prevFeed => 
          prevFeed.map(item => 
            item.id === reportId 
              ? { 
                  ...item, 
                  upvotes: currentUpvoteState ? (item.upvotes || 0) + 1 : Math.max((item.upvotes || 0) - 1, 0)
                }
              : item
          )
        );
        Alert.alert('Error', result.error || 'Failed to upvote report');
      }
    } catch (error) {
      console.error('Error upvoting report:', error);
      // Revert optimistic update on error
      setUserUpvotes(prev => ({
        ...prev,
        [reportId]: currentUpvoteState
      }));
      setFeed(prevFeed => 
        prevFeed.map(item => 
          item.id === reportId 
            ? { 
                ...item, 
                upvotes: currentUpvoteState ? (item.upvotes || 0) + 1 : Math.max((item.upvotes || 0) - 1, 0)
              }
            : item
        )
      );
      Alert.alert('Error', 'Failed to upvote report');
    }
  }, [userUpvotes]);

  // "Me Too" / also affected by this issue handler
  const handleMeToo = useCallback(async (reportId) => {
    if (!userData?.uid) {
      Alert.alert('Sign in required', 'You must be logged in to mark yourself as affected.');
      return;
    }
    const alreadyAffected = !!userAffected[reportId];
    // Optimistic update
    setUserAffected(prev => ({ ...prev, [reportId]: !alreadyAffected }));
    setFeed(prevFeed =>
      prevFeed.map(item =>
        item.id === reportId
          ? { ...item, affectedCount: alreadyAffected ? Math.max((item.affectedCount || 0) - 1, 0) : (item.affectedCount || 0) + 1 }
          : item
      )
    );
    try {
      const result = await ReportService.meTooReport(reportId, userData.uid, alreadyAffected);
      if (!result.success) throw new Error(result.error);
    } catch (err) {
      console.warn('Me Too error:', err);
      setUserAffected(prev => ({ ...prev, [reportId]: alreadyAffected }));
      setFeed(prevFeed =>
        prevFeed.map(item =>
          item.id === reportId
            ? { ...item, affectedCount: alreadyAffected ? (item.affectedCount || 0) + 1 : Math.max((item.affectedCount || 0) - 1, 0) }
            : item
        )
      );
    }
  }, [userData?.uid, userAffected]);

  // Handle view tracking - wrapped in useCallback
  const handleViewReport = useCallback(async (reportId, currentUserId) => {
    if (!currentUserId) return;
    
    try {
      await ReportService.incrementViewCount(reportId, currentUserId);
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  }, []);

  // Handle post press (open post detail with comments) - wrapped in useCallback
  const handlePostPress = useCallback(async (item) => {
    // Track view when opening post
    if (userData?.uid) {
      await handleViewReport(item.id, userData.uid);
    }
    
    // Navigate to post detail screen - only pass ID to avoid serialization warning
    navigation.navigate('PostDetail', { 
      postId: item.id
    });
  }, [userData, navigation, handleViewReport]);

  // Helper functions for feed display - wrapped in useCallback to prevent re-renders
  const getTimeAgo = useCallback((date) => {
    if (!date) return 'now';
    try {
      const now = new Date();
      const targetDate = date.toDate ? date.toDate() : new Date(date);
      if (isNaN(targetDate.getTime())) return 'now';
      
      const diffInMs = now.getTime() - targetDate.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (isNaN(diffInMinutes) || diffInMinutes < 1) return 'now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInHours < 24) return `${diffInHours}h ago`;
      return `${diffInDays}d ago`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'now';
    }
  }, []);

  const getStatusColor = useCallback((status) => {
    const colors = {
      pending: '#ffd93d',
      in_progress: '#2667ff',
      resolved: '#51cf66',
      rejected: '#ff6b6b'
    };
    return colors[status] || '#ccc';
  }, []);

  const getTextColorForBackground = useCallback((backgroundColor) => {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate brightness using luminance formula
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Return black for light backgrounds, white for dark backgrounds
    return brightness > 155 ? '#000' : '#fff';
  }, []);

  const getCategoryColor = useCallback((category) => {
    const colors = {
      academic: '#2667ff',
      infrastructure: '#ff6b6b',
      food: '#51cf66',
      it: '#ffd93d',
      facilities: '#9775fa',
      other: '#868e96'
    };
    return colors[category] || '#ccc';
  }, []);

  const getPriorityColor = useCallback((priority) => {
    const colors = {
      critical: '#ff3838',
      high: '#ff9500',
      medium: '#ffd93d',
      low: '#51cf66'
    };
    return colors[priority] || '#ccc';
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={[styles.centerTab, { justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color="#113588" />
          <Text style={{ marginTop: 10, color: '#666', fontFamily: 'System' }}>Loading...</Text>
        </View>
      </View>
    );
  }

  // Generate trending words from feed data
  const generateTrendingWords = (feedData) => {
    if (!feedData || feedData.length === 0) return [];

    // Common words to exclude
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
      'me', 'him', 'her', 'us', 'them', 'not', 'no', 'yes', 'very', 'too', 'also', 'just', 'only',
      'so', 'if', 'when', 'where', 'how', 'why', 'what', 'who', 'which', 'than', 'then', 'now',
      'here', 'there', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'more',
      'most', 'other', 'some', 'any', 'each', 'every', 'all', 'both', 'few', 'many', 'much',
      'get', 'got', 'getting', 'go', 'going', 'went', 'come', 'came', 'coming', 'see', 'saw',
      'look', 'looking', 'make', 'made', 'making', 'take', 'took', 'taking', 'know', 'knew',
      'think', 'thought', 'say', 'said', 'tell', 'told', 'ask', 'asked', 'give', 'gave', 'put'
    ]);

    const wordCount = {};
    const categoryCount = {};
    const priorityCount = {};

    feedData.forEach(item => {
      // Extract words from description
      if (item.description) {
        const words = item.description
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 3 && !stopWords.has(word));
        
        words.forEach(word => {
          wordCount[word] = (wordCount[word] || 0) + 1;
        });
      }

      // Count categories
      if (item.category) {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      }

      // Count priorities
      if (item.priority) {
        priorityCount[item.priority] = (priorityCount[item.priority] || 0) + 1;
      }
    });

    // Combine all trending items
    const trendingItems = [];
    
    // Find max counts for intensity calculation
    const maxWordCount = Math.max(...Object.values(wordCount), 1);
    const maxCategoryCount = Math.max(...Object.values(categoryCount), 1);
    const maxPriorityCount = Math.max(...Object.values(priorityCount), 1);

    // Add top words with color intensity
    Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([word, count]) => {
        trendingItems.push({
          text: word,
          count,
          type: 'word',
          color: getColorIntensity(count, maxWordCount, '#2667ff', 'word'),
          size: Math.min(18, 12 + (count * 2)) // Larger size for more frequent words
        });
      });

    // Add categories with intensity-based colors
    Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([category, count]) => {
        const baseColor = getCategoryColor(category);
        trendingItems.push({
          text: category,
          count,
          type: 'category',
          color: getColorIntensity(count, maxCategoryCount, baseColor, 'category'),
          size: Math.min(16, 12 + count)
        });
      });

    // Add priorities with intensity-based colors (only if significant)
    Object.entries(priorityCount)
      .filter(([,count]) => count > 1)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .forEach(([priority, count]) => {
        const baseColor = getPriorityColor(priority);
        trendingItems.push({
          text: priority,
          count,
          type: 'priority',
          color: getColorIntensity(count, maxPriorityCount, baseColor, 'priority'),
          size: Math.min(15, 11 + count)
        });
      });

    // Shuffle and return top items
    const finalItems = trendingItems
      .sort(() => Math.random() - 0.5)
      .slice(0, 15)
      .map((item, index) => ({
        ...item,
        id: `${item.text}-${index}`
      }));

    return finalItems;
  };

  // Handle delete post
  const handleDeletePost = async (postId, authorId) => {
    if (!userData?.uid) {
      Alert.alert('Error', 'You must be logged in to delete posts');
      return;
    }

    if (userData.uid !== authorId) {
      Alert.alert('Error', 'You can only delete your own posts');
      return;
    }

    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await ReportService.deleteReport(postId, userData.uid);
              if (result.success) {
                Alert.alert('Success', 'Post deleted successfully');
                // The feed will automatically update via the subscription
              } else {
                Alert.alert('Error', result.error || 'Failed to delete post');
              }
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          }
        }
      ]
    );
  };

  // Handle notification press
  const handleNotificationPress = async (notification) => {
    try {
      // Mark as read
      await ReportService.markNotificationAsRead(notification.id);
      
      // Navigate to relevant screen or show report details
      setShowNotifications(false);
      
      // You can add navigation logic here if needed
      console.log('Notification pressed:', notification);
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  };

  // Format notification time
  const formatNotificationTime = (date) => {
    if (!date) return 'now';
    try {
      const now = new Date();
      const targetDate = date.toDate ? date.toDate() : new Date(date);
      if (isNaN(targetDate.getTime())) return 'now';
      
      const diffInMs = now.getTime() - targetDate.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (isNaN(diffInMinutes) || diffInMinutes < 1) return 'now';
      if (diffInMinutes < 60) return `${diffInMinutes}m`;
      if (diffInHours < 24) return `${diffInHours}h`;
      return `${diffInDays}d`;
    } catch (error) {
      console.error('Error formatting notification time:', error);
      return 'now';
    }
  };

  // Handle logout functionality
  const handleLogout = async () => {
    try {
      // Complete usage logger session before logout
      try {
        await usageLogger.completeSession();
        console.log('Usage log session completed');
      } catch (logError) {
        console.error('Error completing usage log:', logError);
      }
      
      await signOut(auth);
      clearUserData();
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  // Reset upvote counts (for testing)
  const handleResetUpvotes = async () => {
    Alert.alert(
      'Reset Upvotes',
      'Are you sure you want to reset all upvote counts? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setRefreshing(true);
            try {
              const { collection, getDocs, doc, updateDoc } = await import('firebase/firestore');
              const { db } = await import('./firebase');
              
              const reportsRef = collection(db, 'reports');
              const snapshot = await getDocs(reportsRef);
              
              const updatePromises = snapshot.docs.map(docSnapshot => {
                const reportRef = doc(db, 'reports', docSnapshot.id);
                return updateDoc(reportRef, { 
                  upvotes: 0,
                  upvotedBy: []
                });
              });
              
              await Promise.all(updatePromises);
              setUserUpvotes({});
              Alert.alert('Success', 'All upvote counts have been reset');
            } catch (error) {
              console.error('Error resetting upvotes:', error);
              Alert.alert('Error', 'Failed to reset upvotes');
            } finally {
              setRefreshing(false);
            }
          }
        }
      ]
    );
  };

  // Handle pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Don't set feedLoading during refresh - use refreshing state instead
      console.log('Refreshing feed...');
      
      // Reload user upvotes for existing feed items
      if (userData?.uid && feed.length > 0) {
        const votes = {};
        const votePromises = feed.map(async (item) => {
          try {
            const voteResult = await ReportService.getUserVote(item.id, userData.uid);
            votes[item.id] = voteResult.hasVoted && voteResult.voteType === 'upvote';
          } catch (error) {
            console.error('Error loading vote for report:', item.id, error);
          }
        });
        
        await Promise.all(votePromises);
        setUserUpvotes(votes);
      }
      
      console.log('Feed refreshed successfully');
    } catch (error) {
      console.error('Error refreshing feed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderScene = SceneMap({
    home: () => <HomeTab 
      styles={styles}
      schoolNews={schoolNews}
      newsLoading={newsLoading}
      renderNewsItem={createRenderNewsItem(schoolNews, getCategoryColor, styles)}
      trendingWords={trendingWords}
      wordCloudLoading={wordCloudLoading}
      getCategoryColor={getCategoryColor}
      getPriorityColor={getPriorityColor}
      feedLoading={feedLoading}
      feed={feed}
      refreshing={refreshing}
      onRefresh={onRefresh}
      handleResetUpvotes={handleResetUpvotes}
      getTimeAgo={getTimeAgo}
      getStatusColor={getStatusColor}
      getTextColorForBackground={getTextColorForBackground}
      handlePostPress={handlePostPress}
      handleUpvote={handleUpvote}
      handleDeletePost={handleDeletePost}
      userData={userData}
      userUpvotes={userUpvotes}
      handleMeToo={handleMeToo}
      userAffected={userAffected}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      selectedBuilding={selectedBuilding}
      setSelectedBuilding={setSelectedBuilding}
      buildings={buildings}
      filteredFeed={filteredFeed}
      navigation={navigation}
      colors={colors}
      setIndex={setIndex}
    />,
    dashboard: () => <SupportScreen />,
    messages: () => <MessagesTab navigation={navigation} styles={styles} userData={userData} colors={colors} />,
    plus: () => <SubmitTab navigation={navigation} styles={styles} />,
    complaint: () => <ComplaintTab navigation={navigation} styles={styles} />,
    navigator: () => <CampusNavigatorScreen />,
    account: () => <AccountTab 
      userData={userData}
      navigation={navigation}
      handleLogout={handleLogout}
      clearUserData={clearUserData}
      styles={styles}
      feedReports={feed}
      setIndex={setIndex}
    />,
  });

  // Navigation bar tap handler
  const handleNavPress = async (idx) => {
    // Track feature usage based on tab
    const featureMap = {
      0: FEATURES.TRACK_STATUS, // Home/Feed tab
      1: FEATURES.ADMIN_DASHBOARD, // Dashboard tab
      2: null, // Messages tab
      3: FEATURES.SUBMIT_REPORT, // Submit tab
      4: FEATURES.SUBMIT_FEEDBACK, // Complaint tab
      5: null, // Navigator tab (don't track as separate feature)
      6: null // Account tab (don't track as separate feature)
    };
    
    if (featureMap[idx]) {
      await usageLogger.startFeature(featureMap[idx]);
    }
    
    setIndex(idx);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <View style={[styles.headerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerBrand, { color: colors.text }]}>Safire</Text>
        <View style={styles.headerRightSection}>
          <TouchableOpacity 
            style={styles.chatButton}
            onPress={() => navigation.navigate('Chat')}
          >
            <Ionicons name="help-circle-outline" size={24} color="#2667ff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => setShowNotifications(true)}
          >
            <Ionicons name="notifications-outline" size={24} color="#2667ff" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {(() => {
                    const count = Math.max(0, Math.floor(unreadCount || 0));
                    return count > 99 ? '99+' : String(count);
                  })()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.tabContainer}>
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={initialLayout}
          renderTabBar={() => null}
          swipeEnabled
        />
      </View>
      
      {/* Bottom Navigation with Centered Floating Button */}
      <View style={{ position: 'relative' }}>
        <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navItem} onPress={() => handleNavPress(0)}>
              <Ionicons 
                name={index === 0 ? "home" : "home-outline"} 
                size={24} 
                color={index === 0 ? colors.text : colors.textSecondary} 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => handleNavPress(1)}>
              <Ionicons
                name={index === 1 ? "bar-chart" : "bar-chart-outline"}
                size={24}
                color={index === 1 ? colors.text : colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => handleNavPress(2)}>
              <Ionicons 
                name={index === 2 ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} 
                size={24} 
                color={index === 2 ? colors.text : colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>
          <View style={styles.navSpacer} />
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navItem} onPress={() => handleNavPress(4)}>
              <Ionicons 
                name={index === 4 ? "alert-circle" : "alert-circle-outline"} 
                size={24} 
                color={index === 4 ? colors.text : colors.textSecondary} 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => handleNavPress(5)}>
              <Ionicons 
                name={index === 5 ? "compass" : "compass-outline"} 
                size={24} 
                color={index === 5 ? colors.text : colors.textSecondary} 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navItem} onPress={() => handleNavPress(6)}>
              <Ionicons 
                name={index === 6 ? "person" : "person-outline"} 
                size={24} 
                color={index === 6 ? colors.text : colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Centered Submit Button */}
        <TouchableOpacity 
          style={styles.navPlusItem} 
          onPress={() => handleNavPress(3)}
          activeOpacity={0.8}
        >
          <View style={styles.navPlusButton}>
            <Ionicons name="add" size={30} color="#2667ff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Emergency Quick Report FAB */}
      <TouchableOpacity
        style={styles.emergencyFAB}
        onPress={() => setShowEmergencyModal(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="alert-circle-outline" size={20} color="#fff" />
        <Text style={styles.emergencyFABText}>SOS</Text>
      </TouchableOpacity>

      {/* Emergency Confirmation Modal */}
      <Modal
        visible={showEmergencyModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowEmergencyModal(false)}
      >
        <View style={styles.emergencyOverlay}>
          <View style={styles.emergencyBox}>
            <View style={styles.emergencyIconWrap}>
              <Ionicons name="warning" size={44} color="#ff3b30" />
            </View>
            <Text style={styles.emergencyTitle}>Emergency Report</Text>
            <Text style={styles.emergencyDesc}>
              This will open a pre-filled{`\n`}critical-priority emergency report.{`\n`}Only use for genuine emergencies.
            </Text>
            <TouchableOpacity
              style={styles.emergencyConfirmBtn}
              onPress={() => {
                setShowEmergencyModal(false);
                navigation.navigate('EmergencyReport');
              }}
            >
              <Ionicons name="warning" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.emergencyConfirmText}>Report Emergency Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.emergencyCancelBtn}
              onPress={() => setShowEmergencyModal(false)}
            >
              <Text style={styles.emergencyCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={[styles.notificationModal, { paddingTop: insets.top }]}>
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>Notifications</Text>
            <View style={styles.notificationHeaderButtons}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  style={styles.markAllButton}
                  onPress={async () => {
                    try {
                      await ReportService.markAllNotificationsAsRead(userData?.uid);
                    } catch (error) {
                      console.error('Error marking all as read:', error);
                    }
                  }}
                >
                  <Text style={styles.markAllButtonText}>Mark All Read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowNotifications(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
          
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.notificationItem,
                  !item.read && styles.unreadNotification
                ]}
                onPress={() => handleNotificationPress(item)}
              >
                <View style={styles.notificationIcon}>
                  <Ionicons
                    name={
                      item.type === 'report_resolved' 
                        ? 'checkmark-circle' 
                        : item.type === 'report_upvoted'
                        ? 'arrow-up-circle'
                        : 'notifications'
                    }
                    size={24}
                    color={
                      item.type === 'report_resolved' 
                        ? '#51cf66' 
                        : item.type === 'report_upvoted'
                        ? '#2667ff'
                        : '#666'
                    }
                  />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationMessage}>
                    {String(item.message || 'No message')}
                  </Text>
                  <Text style={styles.notificationReportTitle} numberOfLines={1}>
                    "{String(item.reportTitle || 'Unknown Report')}"
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatNotificationTime(item.createdAt)}
                  </Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyNotifications}>
                <Ionicons name="notifications-off-outline" size={40} color="#ccc" />
                <Text style={styles.emptyNotificationsText}>No notifications yet</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Container Styles
  container: {
    flex: 1,
    // backgroundColor: colors.background (set in JSX)
  },
  safeArea: {
        flex: 1,
        // backgroundColor will be set dynamically using theme
      },
  headerBar: {
        width: '100%',
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20,
        borderBottomWidth: 1,
        // backgroundColor, borderBottomColor, shadowColor will be set dynamically using theme
        elevation: 3,
      },
  headerBrand: {
        fontFamily: 'Outfit-Bold',
        fontSize: FontSizes.pageTitle,
        // color will be set dynamically using theme
      },
  headerRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatButton: {
    padding: 4,
    marginRight: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 4,
  },
  notificationBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        // backgroundColor will be set dynamically using theme
      },
  notificationBadgeText: {
        fontSize: FontSizes.notificationBadge,
        fontFamily: 'Outfit-Bold',
        textAlign: 'center',
        // color will be set dynamically using theme
      },
  tabContainer: {
    flex: 1,
  },

  // Center tab styles
  centerTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        // backgroundColor will be set dynamically using theme
      },
  tabTitle: {
        fontFamily: 'Outfit-Bold',
        fontSize: FontSizes.sectionTitle,
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
        // color will be set dynamically using theme
      },
  tabSubtitle: {
        fontFamily: 'Outfit-Regular',
        fontSize: FontSizes.bodyText,
        textAlign: 'center',
        marginBottom: 24,
        // color will be set dynamically using theme
      },
  actionButton: {
    backgroundColor: '#2667ff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  actionButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.buttonText,
    color: '#fff',
  },

  // Feed loading and empty states
  feedLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.bodyText,
    color: '#666',
    marginTop: 12,
  },
  loadingHint: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.metaText,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyFeed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyFeedText: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.emptyStateTitle,
    color: '#999',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyFeedSubtext: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.emptyStateText,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },

  // User info and account styles
  userInfoContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  profileHeader: {
    position: 'relative',
    marginBottom: 60,
  },
  coverPhoto: {
    height: 120,
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverPhotoImage: {
    width: '100%',
    height: '100%',
  },
  coverPhotoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePicContainer: {
    position: 'absolute',
    bottom: -40,
    left: 16,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  profilePic: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  accountInfo: {
    paddingTop: 8,
  },
  accountName: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.profileName,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  accountUsername: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.profileHandle,
    color: '#666',
    marginBottom: 16,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.profileInfo,
    color: '#333',
    flex: 1,
  },
  editProfileButton: {
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2667ff',
    marginHorizontal: 16,
  },
  editProfileText: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.buttonText,
    color: '#2667ff',
  },
  logoutButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.buttonText,
    color: '#fff',
  },
  logoutBtn: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  // Bottom navigation
  bottomNav: {
    flexDirection: 'row',
    // backgroundColor, borderTopColor, shadowColor: use theme in JSX
    paddingHorizontal: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 10,
  },
  navRow: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  navSpacer: {
    width: 60,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    flex: 1,
    minWidth: 50,
  },
  navPlusItem: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    pointerEvents: 'box-none',
  },
  navPlusButton: {
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
  },

  // Notification Modal Styles
  notificationModal: {
    flex: 1,
    // backgroundColor: colors.background (set in JSX)
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 3,
  },
  notificationTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: '#1a1a1a',
  },
  notificationHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllButton: {
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  markAllButtonText: {
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
    color: '#2667ff',
  },
  closeButton: {
    padding: 4,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 2,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#f8f9ff',
    borderLeftWidth: 3,
    borderLeftColor: '#2667ff',
  },
  notificationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    color: '#333',
    marginBottom: 4,
  },
  unreadText: {
    fontFamily: 'Outfit-Bold',
    color: '#1a1a1a',
  },
  notificationReportTitle: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2667ff',
    marginLeft: 8,
    marginTop: 8,
  },
  emptyNotifications: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyNotificationsText: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: '#999',
    marginTop: 12,
  },
  testButton: {
    backgroundColor: '#2667ff',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#ff6b6b',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  testButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.actionText,
    color: '#fff',
    textAlign: 'center',
  },

  // Home Tab Styles
  homeTabContainer: {
    flex: 1,
    // backgroundColor: colors.background (set in JSX)
  },

  // School News Section
  schoolNewsSection: {
    marginBottom: 20,
  },
  newsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0,
  },
  newsSectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.sectionTitle,
    color: '#1a1a1a',
    flex: 1,
  },
  newsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newsScrollIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  newsScrollIndicatorText: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.metaText,
    color: '#666',
    marginLeft: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 6,
    borderRadius: 0,
    marginLeft: 0,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  viewAllButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.actionText,
    color: '#2667ff',
    marginRight: 4,
  },
  newsLoadingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  newsLoadingText: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.bodyText,
    color: '#666',
  },
  emptyNewsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyNewsText: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.emptyStateTitle,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  newsScrollView: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  newsItem: {
    backgroundColor: '#fefefe',
    borderRadius: 4,
    marginRight: 16,
    width: 280,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: '#e8e6e3',
  },
  newsImage: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: '#f0efec',
  },
  newsContent: {
    padding: 16,
  },
  newsTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.newsTitle,
    color: '#1a1a1a',
    marginBottom: 6,
    lineHeight: 20,
  },
  newsDescription: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.newsDescription,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e8ff',
  },
  readMoreButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.actionText,
    color: '#2667ff',
  },
  newsMetaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0efec',
  },
  newsDate: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.metaText,
    color: '#999',
  },
  newsPublishDate: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.metaText,
    color: '#666',
    fontStyle: 'italic',
  },
  newsSource: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.metaText,
    color: '#2667ff',
  },

  // Word Cloud Styles
  wordCloudContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordCloudTextItem: {
    marginHorizontal: 6,
    marginVertical: 4,
    paddingVertical: 2,
  },
  wordCloudText: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.wordCloudText,
    lineHeight: 20,
  },
  wordCloudLoadingContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  wordCloudLoadingText: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.bodyText,
    color: '#666',
    marginTop: 12,
  },
  emptyWordCloudContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  emptyWordCloudText: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.emptyStateTitle,
    color: '#999',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyWordCloudSubtext: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.emptyStateText,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Trending Section
  trendingSection: {
    marginBottom: 20,
    // backgroundColor: colors.background (set in JSX)
  },
  trendingSectionTransparent: {
    marginBottom: 20,
  },
  trendingSectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  trendingTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trendingSectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.sectionTitle,
    color: '#1a1a1a',
  },
  trendingSubtitle: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.metaText,
    color: '#666',
  },

  // Feed Section
  feedSection: {
    flex: 1,
    // backgroundColor: colors.background (set in JSX)
  },
  feedSectionTransparent: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.sectionTitle,
    color: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },

  // Tweet/Post Feed Styles
  tweetContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tweetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tweetAvatar: {
    marginRight: 12,
    marginTop: 2,
  },
  tweetMainContent: {
    flex: 1,
  },
  tweetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tweetUserInfo: {
    flex: 1,
  },
  tweetUserName: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.userName,
    color: '#1a1a1a',
    marginBottom: 2,
  },
  tweetUserMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tweetUsername: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.userHandle,
    color: '#666',
  },
  tweetTime: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.timestamp,
    color: '#999',
    marginLeft: 4,
  },
  tweetStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  tweetStatusText: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.statusBadge,
    textTransform: 'uppercase',
  },
  tweetContent: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.bodyText,
    color: '#1a1a1a',
    lineHeight: 20,
    marginBottom: 12,
  },
  tweetTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 12,
  },
  tweetCategoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tweetCategoryText: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.tagText,
    textTransform: 'uppercase',
  },
  tweetPriorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tweetPriorityTagSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tweetCategoryTagSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  tweetCategoryTextSmall: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.tagText - 1,
    textTransform: 'uppercase',
  },
  tweetPriorityText: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.tagText,
    textTransform: 'uppercase',
  },
  tweetLocationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  tweetLocationText: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.tagText - 1,
    color: '#666',
    marginLeft: 2,
  },
  tweetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  tweetActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginRight: 16,
    backgroundColor: 'transparent',
  },
  tweetActionBtnActive: {
    backgroundColor: '#f0f4ff',
  },
  tweetActionText: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.actionText,
    color: '#8E8E93',
    marginLeft: 4,
  },
  tweetActionTextActive: {
    color: '#2667ff',
    fontFamily: 'Outfit-Bold',
  },

  // Tweet Image Styles
  tweetImageContainer: {
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tweetImageSingle: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  tweetImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  tweetImageMultiple: {
    width: '49.5%',
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  tweetImageTwo: {
    width: '49.5%',
    height: 200,
  },
  tweetImageThreeFirst: {
    width: '100%',
    height: 200,
  },
  tweetImageThreeOther: {
    width: '49.5%',
    height: 150,
  },
  tweetImageOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: '49.5%',
    height: 150,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tweetImageOverlayText: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Outfit-Bold',
  },

  // Optimized News Card Styles
  newsCardOptimized: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 8,
    width: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  newsCardFirst: {
    marginLeft: 16,
  },
  newsCardLast: {
    marginRight: 16,
  },
  newsImageContainerOptimized: {
    position: 'relative',
    width: '100%',
    height: 120,
    backgroundColor: '#f0efec',
  },
  newsImageOptimized: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
  },
  categoryBadgeTop: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  categoryBadgeTextTop: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.tagText,
    color: '#000',
    textTransform: 'uppercase',
  },
  newsContentOptimized: {
    padding: 12,
  },
  newsTitleOptimized: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.metaText,
    color: '#1a1a1a',
    lineHeight: 18,
    marginBottom: 6,
  },
  newsExcerptContainer: {
    marginBottom: 12,
  },
  newsExcerptOptimized: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.tagText,
    color: '#666',
    lineHeight: 16,
    marginBottom: 8,
  },
  readMoreInlineText: {
    fontFamily: 'Outfit-Bold',
    fontSize: FontSizes.tagText,
    color: '#2667ff',
  },
  newsMetaOptimized: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0efec',
  },
  newsPublishInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newsPublishedText: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.metaText,
    color: '#666',
    marginLeft: 4,
  },
  newsTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newsTimeText: {
    fontFamily: 'Outfit-Regular',
    fontSize: FontSizes.metaText,
    color: '#999',
    marginLeft: 4,
  },

  // Search and Filter Styles
  searchFilterContainer: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.bodyText,
    fontFamily: 'Outfit-Regular',
    color: '#000',
  },
  buildingFilterScroll: {
    marginBottom: 8,
  },
  buildingFilterContainer: {
    flexDirection: 'row',
    paddingRight: 16,
  },
  buildingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2667ff',
    marginRight: 8,
  },
  buildingChipActive: {
    backgroundColor: '#2667ff',
    borderColor: '#2667ff',
  },
  buildingChipText: {
    fontSize: FontSizes.metaText,
    fontFamily: 'Outfit-Medium',
    color: '#2667ff',
  },
  buildingChipTextActive: {
    color: '#fff',
  },
  filterResultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  filterResultsText: {
    fontSize: FontSizes.metaText,
    fontFamily: 'Outfit-Regular',
    color: '#666',
  },
  clearFiltersButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearFiltersText: {
    fontSize: FontSizes.metaText,
    fontFamily: 'Outfit-Medium',
    color: '#2667ff',
  },
  
  // View Reports Button
  viewReportsButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewReportsButtonText: {
    fontFamily: 'Outfit-Medium',
    fontSize: FontSizes.actionText,
    color: '#2667ff',
    marginLeft: 8,
  },
  // â”€â”€ Emergency FAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  emergencyFAB: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff3b30',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    zIndex: 999,
  },
  emergencyFABText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Outfit-Bold',
    marginTop: 1,
  },
  emergencyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emergencyBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  emergencyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ff3b3015',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emergencyTitle: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: '#1a1a1a',
    marginBottom: 10,
    textAlign: 'center',
  },
  emergencyDesc: {
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emergencyConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff3b30',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 10,
  },
  emergencyConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  emergencyCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  emergencyCancelText: {
    color: '#888',
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
  },
});
