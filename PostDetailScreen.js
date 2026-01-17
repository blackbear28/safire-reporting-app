import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { useUser } from './App';
import { ReportService } from './services/reportService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PostDetailScreen({ navigation, route }) {
  const { postId, post } = route.params;
  const { user: userData } = useUser();
  const insets = useSafeAreaInsets();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [postData, setPostData] = useState(post || null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [postLoading, setPostLoading] = useState(!post);

  // Load fonts
  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          'Outfit-Regular': require('./assets/fonts/Outfit-Regular.ttf'),
          'Outfit-Bold': require('./assets/fonts/Outfit-Bold.ttf'),
          'Outfit-Light': require('./assets/fonts/Outfit-Light.ttf'),
          'Outfit-Medium': require('./assets/fonts/Outfit-Medium.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontsLoaded(true);
      }
    };
    loadFonts();
  }, []);

  // Load post data if not provided
  useEffect(() => {
    const loadPost = async () => {
      if (!post && postId) {
        try {
          setPostLoading(true);
          const result = await ReportService.getReportById(postId);
          if (result.success && result.report) {
            setPostData(result.report);
          } else {
            console.error('Failed to load post:', result.error);
            Alert.alert('Error', 'Failed to load post details');
          }
        } catch (error) {
          console.error('Error loading post:', error);
          Alert.alert('Error', 'Failed to load post details');
        } finally {
          setPostLoading(false);
        }
      }
    };

    loadPost();
  }, [postId, post]);

  // Load comments
  useEffect(() => {
    const loadComments = async () => {
      try {
        setCommentsLoading(true);
        const result = await ReportService.getComments(postId);
        if (result.success) {
          setComments(result.comments || []);
        } else {
          console.warn('Failed to load comments:', result.error);
        }
      } catch (error) {
        console.error('Error loading comments:', error);
      } finally {
        setCommentsLoading(false);
      }
    };

    if (postId) {
      loadComments();
    }
  }, [postId]);

  // Helper functions
  const getTimeAgo = (date) => {
    if (!date) return 'now';
    try {
      const targetDate = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
      if (isNaN(targetDate.getTime())) return 'now';
      
      const now = new Date();
      const diffInMs = now.getTime() - targetDate.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (isNaN(diffInMinutes) || diffInMinutes < 1) return 'now';
      if (diffInMinutes < 60) return `${diffInMinutes}m`;
      if (diffInHours < 24) return `${diffInHours}h`;
      return `${diffInDays}d`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'now';
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffd93d',
      in_progress: '#2667ff',
      resolved: '#51cf66',
      rejected: '#ff6b6b'
    };
    return colors[status] || '#ccc';
  };

  const getCategoryColor = (category) => {
    const colors = {
      academic: '#2667ff',
      infrastructure: '#ff6b6b',
      food: '#51cf66',
      it: '#ffd93d',
      facilities: '#9775fa',
      other: '#868e96'
    };
    return colors[category] || '#ccc';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: '#ff3838',
      high: '#ff9500',
      medium: '#ffd93d',
      low: '#51cf66'
    };
    return colors[priority] || '#ccc';
  };

  const getTextColorForBackground = (backgroundColor) => {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? '#000' : '#fff';
  };

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    if (!userData?.uid) {
      Alert.alert('Error', 'You must be logged in to comment');
      return;
    }

    try {
      setLoading(true);
      const result = await ReportService.addComment(postId, {
        text: newComment.trim(),
        authorId: userData.uid,
        authorName: userData.name || userData.username || 'User',
        authorUsername: userData.username || userData.email?.split('@')[0] || 'user',
        createdAt: new Date(),
      });

      if (result.success) {
        setNewComment('');
        // Reload comments
        const commentsResult = await ReportService.getComments(postId);
        if (commentsResult.success) {
          setComments(commentsResult.comments || []);
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const renderComment = ({ item }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAvatar}>
          <Ionicons name="person-circle" size={32} color="#2667ff" />
        </View>
        <View style={styles.commentContent}>
          <View style={styles.commentMeta}>
            <Text style={styles.commentAuthor}>
              {String((item.authorName && typeof item.authorName === 'string') ? item.authorName : 'User')}
            </Text>
            <Text style={styles.commentUsername}>
              @{String((item.authorUsername && typeof item.authorUsername === 'string') ? item.authorUsername : 'user')}
            </Text>
            <Text style={styles.commentTime}>
              · {String(getTimeAgo(item.createdAt))}
            </Text>
          </View>
          <Text style={styles.commentText}>
            {String((item.text && typeof item.text === 'string') ? item.text : 'No comment text')}
          </Text>
        </View>
      </View>
    </View>
  );

  if (!fontsLoaded || postLoading || !postData) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2667ff" />
          <Text style={{ marginTop: 10, fontFamily: 'System', color: '#666' }}>Loading post...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={styles.headerRight}>
          {/* Show edit button if user is author and within 15 minutes */}
          {userData?.uid === postData?.authorId && (() => {
            const now = new Date();
            const createdAt = postData?.createdAt instanceof Date 
              ? postData.createdAt 
              : (postData?.createdAt?.toDate ? postData.createdAt.toDate() : new Date());
            const diffInMinutes = (now - createdAt) / (1000 * 60);
            return diffInMinutes <= 15;
          })() && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                Alert.alert(
                  'Edit Report',
                  'You can edit your report within 15 minutes of posting. Would you like to edit it now?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Edit', 
                      onPress: () => navigation.navigate('ReportScreen', { 
                        editMode: true,
                        reportId: postData.id,
                        reportData: postData
                      })
                    }
                  ]
                );
              }}
            >
              <Ionicons name="create-outline" size={24} color="#2667ff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Post Content */}
          <View style={styles.postContainer}>
            <View style={styles.postHeader}>
              <View style={styles.postAvatar}>
                <Ionicons 
                  name={postData?.anonymous ? 'person-circle-outline' : 'person-circle'} 
                  size={40} 
                  color={postData?.anonymous ? '#8E8E93' : '#2667ff'} 
                />
              </View>
              <View style={styles.postUserInfo}>
                <View style={styles.postUserMeta}>
                  <Text style={styles.postUserName}>
                    {String(postData?.anonymous ? 'Anonymous User' : (
                      (postData?.authorName && typeof postData.authorName === 'string') 
                        ? postData.authorName 
                        : 'User'
                    ))}
                  </Text>
                  <Text style={styles.postUsername}>
                    @{String(postData?.anonymous ? 'anonymous' : (
                      (postData?.authorUsername && typeof postData.authorUsername === 'string') 
                        ? postData.authorUsername 
                        : (postData?.authorEmail && typeof postData.authorEmail === 'string' 
                          ? postData.authorEmail 
                          : 'user')
                    ))}
                  </Text>
                </View>
                <Text style={styles.postTime}>{String(getTimeAgo(postData?.createdAt))}</Text>
              </View>
              <View style={[styles.postStatusBadge, { backgroundColor: getStatusColor(postData?.status) }]}>
                <Text style={[styles.postStatusText, { color: getTextColorForBackground(getStatusColor(postData?.status)) }]}>
                  {String((postData?.status && typeof postData.status === 'string') 
                    ? postData.status.replace('_', ' ') 
                    : 'pending')}
                </Text>
              </View>
            </View>

            <Text style={styles.postContent}>
              {String((postData?.description && typeof postData.description === 'string') 
                ? postData.description 
                : 'No description available')}
            </Text>

            {/* Display images if available */}
            {postData?.media && Array.isArray(postData.media) && postData.media.length > 0 && (
              <ScrollView 
                horizontal 
                pagingEnabled 
                showsHorizontalScrollIndicator={true}
                style={styles.postImagesContainer}
              >
                {postData.media.map((imageUrl, index) => (
                  <View key={index} style={styles.postImageWrapper}>
                    <Image 
                      source={{ uri: imageUrl }} 
                      style={styles.postImage}
                      resizeMode="contain"
                    />
                    {postData.media.length > 1 && (
                      <View style={styles.imageCounter}>
                        <Text style={styles.imageCounterText}>
                          {index + 1} / {postData.media.length}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.postTags}>
              <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(postData?.category) }]}>
                <Text style={[styles.categoryText, { color: getTextColorForBackground(getCategoryColor(postData?.category)) }]}>
                  {String((postData?.category && typeof postData.category === 'string') 
                    ? postData.category 
                    : 'other')}
                </Text>
              </View>
              <View style={[styles.priorityTag, { backgroundColor: getPriorityColor(postData?.priority) }]}>
                <Text style={[styles.priorityText, { color: getTextColorForBackground(getPriorityColor(postData?.priority)) }]}>
                  {String((postData?.priority && typeof postData.priority === 'string') 
                    ? postData.priority 
                    : 'medium')}
                </Text>
              </View>
              {postData?.location?.building && (
                <View style={styles.locationTag}>
                  <Ionicons name="location-outline" size={12} color="#8E8E93" />
                  <Text style={styles.locationText}>
                    {String((postData.location.building && typeof postData.location.building === 'string')
                      ? `${postData.location.building}${
                          postData.location.room && typeof postData.location.room === 'string' 
                            ? ` - ${postData.location.room}` 
                            : ''
                        }`
                      : 'Unknown location')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.postStats}>
              <Text style={styles.postStat}>
                {String((postData?.upvotes && typeof postData.upvotes === 'number') 
                  ? postData.upvotes 
                  : 0)} upvotes
              </Text>
              <Text style={styles.postStat}>
                {String((comments && Array.isArray(comments)) ? comments.length : 0)} comments
              </Text>
              <Text style={styles.postStat}>
                {String((postData?.viewCount && typeof postData.viewCount === 'number') 
                  ? postData.viewCount 
                  : 0)} views
              </Text>
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments ({String(comments?.length || 0)})</Text>
            
            {commentsLoading ? (
              <View style={styles.commentsLoading}>
                <Text style={styles.loadingText}>Loading comments...</Text>
              </View>
            ) : (!comments || comments.length === 0) ? (
              <View style={styles.noComments}>
                <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
                <Text style={styles.noCommentsText}>No comments yet</Text>
                <Text style={styles.noCommentsSubtext}>Be the first to comment!</Text>
              </View>
            ) : (
              <FlatList
                data={comments || []}
                renderItem={renderComment}
                keyExtractor={(item) => String(item?.id || Math.random())}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <View style={styles.commentInputWrapper}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, newComment.trim() ? styles.sendButtonActive : null]}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || loading}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={newComment.trim() ? '#2667ff' : '#ccc'} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#000',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  postAvatar: {
    marginRight: 12,
  },
  postUserInfo: {
    flex: 1,
    marginRight: 8,
  },
  postUserMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  postUserName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#000',
    marginRight: 8,
    flexShrink: 1,
  },
  postUsername: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: '#8E8E93',
    flexShrink: 1,
  },
  postTime: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: '#8E8E93',
  },
  postStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  postStatusText: {
    fontSize: 10,
    fontFamily: 'Outfit-Bold',
    textTransform: 'uppercase',
  },
  postContent: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: '#000',
    lineHeight: 24,
    marginBottom: 16,
  },
  postTags: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    textTransform: 'capitalize',
  },
  priorityTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 4,
  },
  priorityText: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    textTransform: 'capitalize',
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: '#8E8E93',
    marginLeft: 2,
  },
  postStats: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  postStat: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: '#666',
    marginRight: 16,
  },
  postImagesContainer: {
    marginTop: 12,
    marginBottom: 12,
    maxHeight: 400,
  },
  postImageWrapper: {
    width: Dimensions.get('window').width - 32,
    height: 350,
    marginRight: 0,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  imageCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
  },
  commentsSection: {
    flex: 1,
  },
  commentsTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  commentsLoading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 16,
    color: '#666',
  },
  noComments: {
    padding: 40,
    alignItems: 'center',
  },
  noCommentsText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  noCommentsSubtext: {
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: '#bbb',
    marginTop: 4,
  },
  commentItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commentAvatar: {
    marginRight: 8,
  },
  commentContent: {
    flex: 1,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#000',
    marginRight: 4,
  },
  commentUsername: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: '#8E8E93',
    marginRight: 4,
  },
  commentTime: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    color: '#8E8E93',
  },
  commentText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: '#000',
    lineHeight: 20,
  },
  commentInputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentInput: {
    flex: 1,
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    color: '#000',
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendButton: {
    marginLeft: 8,
    padding: 4,
  },
  sendButtonActive: {
    backgroundColor: '#f0f4ff',
    borderRadius: 16,
  },
  editButton: {
    padding: 8,
  },
});
