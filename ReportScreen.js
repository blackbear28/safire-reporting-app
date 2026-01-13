import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { auth } from './firebase';
import { styles } from './styles';
import { ReportService } from './services/reportService';

// Smart categorization keywords
const CATEGORY_KEYWORDS = {
  academic: ['class', 'professor', 'exam', 'grade', 'course', 'lecture', 'assignment'],
  infrastructure: ['building', 'elevator', 'stairs', 'lights', 'broken', 'damaged', 'repair'],
  food: ['cafeteria', 'dining', 'food', 'meal', 'kitchen', 'restaurant'],
  it: ['wifi', 'computer', 'internet', 'network', 'password', 'login', 'system', 'website'],
  facilities: ['restroom', 'parking', 'security', 'cleaning', 'maintenance', 'hvac']
};

const PRIORITY_KEYWORDS = {
  critical: ['emergency', 'urgent', 'dangerous', 'safety', 'broken', 'not working'],
  high: ['important', 'asap', 'soon', 'quickly', 'problem'],
  medium: ['issue', 'concern', 'improvement', 'suggestion'],
  low: ['minor', 'eventually', 'when possible', 'feedback']
};

export default function ReportScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const editMode = route?.params?.editMode || false;
  const reportId = route?.params?.reportId || null;
  const reportData = route?.params?.reportData || null;
  
  const [title, setTitle] = useState(editMode && reportData ? reportData.title || '' : '');
  const [description, setDescription] = useState(editMode && reportData ? reportData.description || '' : '');
  const [category, setCategory] = useState(editMode && reportData ? reportData.category || '' : '');
  const [priority, setPriority] = useState(editMode && reportData ? reportData.priority || '' : '');
  const [isAnonymous, setIsAnonymous] = useState(editMode && reportData ? reportData.anonymous || false : false);
  const [media, setMedia] = useState(editMode && reportData && reportData.media ? reportData.media : []);
  const [location, setLocation] = useState(editMode && reportData && reportData.location ? reportData.location : null);
  const [building, setBuilding] = useState(editMode && reportData?.location?.building ? reportData.location.building : '');
  const [room, setRoom] = useState(editMode && reportData?.location?.room ? reportData.location.room : '');
  const [loading, setLoading] = useState(false);

  // Smart categorization based on description
  const analyzeText = (text) => {
    const lowerText = text.toLowerCase();
    
    // Determine category
    let detectedCategory = 'other';
    let maxMatches = 0;
    
    Object.entries(CATEGORY_KEYWORDS).forEach(([cat, keywords]) => {
      const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedCategory = cat;
      }
    });
    
    // Determine priority
    let detectedPriority = 'medium';
    Object.entries(PRIORITY_KEYWORDS).forEach(([pri, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        detectedPriority = pri;
      }
    });
    
    setCategory(detectedCategory);
    setPriority(detectedPriority);
  };

  // Sentiment analysis (simple implementation)
  const analyzeSentiment = (text) => {
    const positiveWords = ['good', 'great', 'excellent', 'satisfied', 'happy', 'love'];
    const negativeWords = ['bad', 'terrible', 'awful', 'frustrated', 'angry', 'hate', 'broken'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (negativeCount > positiveCount) return { score: -0.5, emotion: 'frustrated' };
    if (positiveCount > negativeCount) return { score: 0.5, emotion: 'satisfied' };
    return { score: 0, emotion: 'neutral' };
  };

  // Auto-analyze when description changes
  useEffect(() => {
    if (description.length > 20) {
      analyzeText(description);
    }
  }, [description]);

  // Get user location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for location-based reporting');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Pick image or video
  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Media library permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setMedia([...media, result.assets[0].uri]);
    }
  };

  // Take photo
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setMedia([...media, result.assets[0].uri]);
    }
  };

  // Submit report
  const submitReport = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in title and description');
      return;
    }

    // Check if editing is still allowed (within 15 minutes)
    if (editMode && reportData) {
      const now = new Date();
      const createdAt = reportData.createdAt instanceof Date 
        ? reportData.createdAt 
        : (reportData.createdAt?.toDate ? reportData.createdAt.toDate() : new Date());
      const diffInMinutes = (now - createdAt) / (1000 * 60);
      
      if (diffInMinutes > 15) {
        Alert.alert('Error', 'Edit time has expired. You can only edit reports within 15 minutes of posting.');
        return;
      }
    }

    setLoading(true);
    try {
      const sentiment = analyzeSentiment(description);
      const user = auth.currentUser;
      
      const reportPayload = {
        userId: isAnonymous ? null : user?.uid,
        authorId: isAnonymous ? null : user?.uid,
        authorName: isAnonymous ? 'Anonymous' : user?.displayName || user?.email?.split('@')[0] || 'User',
        authorUsername: isAnonymous ? 'anonymous' : user?.email || 'user',
        authorEmail: isAnonymous ? null : user?.email,
        title: title.trim(),
        description: description.trim(),
        category: category || 'other',
        priority: priority || 'medium',
        department: getDepartmentFromCategory(category),
        location: {
          building: building.trim(),
          room: room.trim(),
          coordinates: location
        },
        media: media,
        anonymous: isAnonymous,
        sentimentScore: sentiment.score,
        emotion: sentiment.emotion,
        tags: extractTags(description),
        slaDeadline: calculateSLADeadline(priority)
      };

      let result;
      if (editMode && reportId) {
        // Update existing report
        result = await ReportService.updateReport(reportId, reportPayload);
      } else {
        // Create new report
        result = await ReportService.submitReport(reportPayload);
      }
      
      if (result.success) {
        Alert.alert('Success', editMode ? 'Your report has been updated successfully!' : 'Your report has been submitted successfully!', [
          { 
            text: 'OK', 
            onPress: () => {
              // Reset form
              setTitle('');
              setDescription('');
              setCategory('');
              setPriority('');
              setMedia([]);
              setBuilding('');
              setRoom('');
              setLocation(null);
              setIsAnonymous(false);
              navigation.goBack();
            }
          }
        ]);
      } else {
        Alert.alert('Error', result.error || `Failed to ${editMode ? 'update' : 'submit'} report. Please try again.`);
      }
      
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getDepartmentFromCategory = (cat) => {
    const mapping = {
      academic: 'Academic Affairs',
      infrastructure: 'Facilities',
      food: 'Food Services',
      it: 'IT Department',
      facilities: 'Facilities'
    };
    return mapping[cat] || 'General Administration';
  };

  const extractTags = (text) => {
    const commonTags = ['wifi', 'broken', 'urgent', 'maintenance', 'security', 'food', 'class'];
    return commonTags.filter(tag => text.toLowerCase().includes(tag));
  };

  const calculateSLADeadline = (priority) => {
    const hours = { critical: 2, high: 24, medium: 72, low: 168 }[priority] || 72;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.container}
          contentContainerStyle={{ paddingBottom: Math.max(120, insets.bottom + 20), flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
          scrollEventThrottle={16}
        >
      {/* Back Navigation */}
      <View style={styles.backNavigation}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome name="arrow-left" size={20} color="#2667ff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.reportHeader}>
        <Text style={styles.reportTitle}>{editMode ? 'Edit Report' : 'Submit Report'}</Text>
        <Text style={styles.reportSubtitle}>
          {editMode ? 'Update your report details' : 'Help us improve your campus experience'}
        </Text>
        {editMode && (
          <Text style={styles.editWarning}>
            ⏱️ You can edit your report within 15 minutes of posting
          </Text>
        )}
      </View>

      <View style={styles.reportForm}>
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Title *</Text>
          <TextInput
            style={styles.reportInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Brief summary of the issue"
            maxLength={100}
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description *</Text>
          <TextInput
            style={[styles.reportInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Detailed description of the issue or feedback"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Smart Suggestions */}
        {category && (
          <View style={styles.suggestionCard}>
            <FontAwesome name="lightbulb-o" size={16} color="#2667ff" />
            <Text style={styles.suggestionText}>
              {(() => {
                const categoryStr = String(category || 'Unknown');
                const priorityStr = String(priority || 'Medium');
                const categoryCapitalized = categoryStr.charAt(0).toUpperCase() + categoryStr.slice(1);
                const priorityCapitalized = priorityStr.charAt(0).toUpperCase() + priorityStr.slice(1);
                return `Auto-detected: ${categoryCapitalized} - ${priorityCapitalized} Priority`;
              })()}
            </Text>
          </View>
        )}

        {/* Category Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Category</Text>
          <View style={styles.categoryGrid}>
            {Object.keys(CATEGORY_KEYWORDS).map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categoryButtonActive
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  category === cat && styles.categoryButtonTextActive
                ]}>
                  {(() => {
                    const catStr = String(cat || '');
                    return catStr.charAt(0).toUpperCase() + catStr.slice(1);
                  })()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Location (Optional)</Text>
          <View style={styles.locationRow}>
            <TextInput
              style={[styles.reportInput, styles.locationInput]}
              value={building}
              onChangeText={setBuilding}
              placeholder="Building"
            />
            <TextInput
              style={[styles.reportInput, styles.locationInput]}
              value={room}
              onChangeText={setRoom}
              placeholder="Room"
            />
            <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
              <FontAwesome name="map-marker" size={20} color="#2667ff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Media Attachment */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Attachments</Text>
          <View style={styles.mediaRow}>
            <TouchableOpacity style={styles.mediaButton} onPress={takePhoto}>
              <FontAwesome name="camera" size={20} color="#2667ff" />
              <Text style={styles.mediaButtonText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaButton} onPress={pickMedia}>
              <FontAwesome name="image" size={20} color="#2667ff" />
              <Text style={styles.mediaButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
          {media.length > 0 && (
            <View style={styles.mediaPreview}>
              {media.map((uri, index) => (
                <Image key={index} source={{ uri }} style={styles.mediaImage} />
              ))}
            </View>
          )}
        </View>

        {/* Anonymous Option */}
        <TouchableOpacity
          style={styles.anonymousToggle}
          onPress={() => setIsAnonymous(!isAnonymous)}
        >
          <FontAwesome
            name={isAnonymous ? "check-square-o" : "square-o"}
            size={20}
            color="#2667ff"
          />
          <Text style={styles.anonymousText}>Submit anonymously</Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={submitReport}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? (editMode ? 'Updating...' : 'Submitting...') : (editMode ? 'Update Report' : 'Submit Report')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
