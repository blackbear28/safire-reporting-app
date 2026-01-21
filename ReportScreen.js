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
  KeyboardAvoidingView,
  Modal,
  StyleSheet,
  Switch
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { auth } from './firebase';
import { styles } from './styles';
import { ReportService } from './services/reportService';
import { usageLogger, FEATURES } from './services/usageLogger';
import { useUser } from './App';

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
  const { user: userData } = useUser();
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
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [preferredOutcome, setPreferredOutcome] = useState(editMode && reportData ? reportData.preferredOutcome || '' : '');
  const [witnesses, setWitnesses] = useState(editMode && reportData ? (reportData.witnesses ? (Array.isArray(reportData.witnesses) ? reportData.witnesses.join('\n') : reportData.witnesses) : '') : '');
  const [confidential, setConfidential] = useState(editMode && reportData ? !!reportData.confidential : false);

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

  // Track feature usage when screen loads
  useEffect(() => {
    const trackFeature = async () => {
      if (route?.params?.isComplaint) {
        await usageLogger.startFeature(FEATURES.SUBMIT_FEEDBACK);
      } else {
        await usageLogger.startFeature(isAnonymous ? FEATURES.ANONYMOUS_REPORT : FEATURES.SUBMIT_REPORT);
      }
    };
    trackFeature();
  }, [isAnonymous]);

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

    // Show warning and confirmation dialog before submitting
    setShowWarningModal(true);
  };

  // Process the actual report submission after confirmation
  const processReportSubmission = async () => {

    setLoading(true);
    try {
      const sentiment = analyzeSentiment(description);
      const user = auth.currentUser;
      
      // Debug: Check user data
      console.log('Current user data:', userData);
      console.log('User role:', userData?.role);
      console.log('User profilePic:', userData?.profilePic);
      
      const reportPayload = {
        userId: isAnonymous ? null : user?.uid,
        authorId: isAnonymous ? null : user?.uid,
        authorName: isAnonymous ? 'Anonymous' : (userData?.name || user?.displayName || user?.email?.split('@')[0] || 'User'),
        authorUsername: isAnonymous ? 'anonymous' : user?.email || 'user',
        authorEmail: isAnonymous ? null : user?.email,
        authorRole: isAnonymous ? null : (userData?.role || 'student'),
        authorProfilePic: isAnonymous ? null : (userData?.profilePic || null),
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
        isComplaint: route?.params?.isComplaint || false,
        preferredOutcome: preferredOutcome || null,
        witnesses: witnesses ? witnesses.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [],
        confidential: !!confidential,
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
        // Update usage logger with accurate feature tracking
        if (media.length > 0) {
          await usageLogger.endFeature(FEATURES.SUBMIT_REPORT_WITH_MEDIA, {
            mediaCount: media.length,
            category: category,
            priority: priority,
            isAnonymous: isAnonymous,
            hasLocation: !!location
          });
        } else {
          await usageLogger.endFeature(
            isAnonymous ? FEATURES.ANONYMOUS_REPORT : FEATURES.SUBMIT_REPORT,
            {
              category: category,
              priority: priority,
              hasLocation: !!location
            }
          );
        }
        
        const successMessage = editMode
          ? 'Your report has been updated successfully!'
          : (reportPayload.isComplaint
              ? 'Your official complaint has been submitted to administration and will not appear on the public feed.'
              : 'Your report has been submitted successfully!');

        Alert.alert('Success', successMessage, [
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

        {route?.params?.isComplaint && (
          <View style={{ paddingHorizontal: 0 }}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preferred Outcome (optional)</Text>
              <TextInput
                style={styles.reportInput}
                value={preferredOutcome}
                onChangeText={setPreferredOutcome}
                placeholder="What outcome are you seeking? e.g., refund, repair, disciplinary review"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Witnesses (optional)</Text>
              <TextInput
                style={[styles.reportInput, { height: 80 }]}
                value={witnesses}
                onChangeText={setWitnesses}
                placeholder="Names or contact info (one per line)"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10, paddingHorizontal: 10 }}>
              <Text style={[styles.inputLabel, { marginRight: 10 }]}>Confidential / Admin-only</Text>
              <Switch value={confidential} onValueChange={setConfidential} />
            </View>
          </View>
        )}

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

      {/* Warning Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showWarningModal}
        onRequestClose={() => setShowWarningModal(false)}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContainer}>
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalIcon}>⚠️</Text>
              <Text style={modalStyles.modalTitle}>Important Reminder</Text>
            </View>

            <View style={modalStyles.modalBody}>
              <View style={modalStyles.reminderSection}>
                <Text style={modalStyles.sectionTitle}>📋 Please ensure your report:</Text>
                <Text style={modalStyles.bulletPoint}>• Does not contain inappropriate or offensive images</Text>
                <Text style={modalStyles.bulletPoint}>• Follows institutional guidelines and policies</Text>
                <Text style={modalStyles.bulletPoint}>• Contains accurate and truthful information</Text>
              </View>

              <View style={modalStyles.warningSection}>
                <Text style={modalStyles.warningText}>
                  <Text style={modalStyles.warningIcon}>🔍 </Text>
                  All reports and media are strictly monitored by admins.
                </Text>
              </View>

              <View style={modalStyles.penaltySection}>
                <Text style={modalStyles.penaltyText}>
                  <Text style={modalStyles.penaltyIcon}>⚖️ </Text>
                  Violations may result in penalties or disciplinary actions.
                </Text>
              </View>

              <Text style={modalStyles.questionText}>
                Do you want to proceed with submitting this report?
              </Text>
            </View>

            <View style={modalStyles.modalButtons}>
              <TouchableOpacity
                style={modalStyles.cancelButton}
                onPress={() => {
                  setShowWarningModal(false);
                  console.log('Report submission cancelled by user');
                }}
              >
                <Text style={modalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={modalStyles.submitButton}
                onPress={() => {
                  setShowWarningModal(false);
                  processReportSubmission();
                }}
              >
                <Text style={modalStyles.submitButtonText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'Outfit-Bold',
  },
  modalBody: {
    padding: 24,
  },
  reminderSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    fontFamily: 'Outfit-Bold',
  },
  bulletPoint: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 22,
    marginBottom: 8,
    paddingLeft: 8,
    fontFamily: 'Outfit-Regular',
  },
  warningSection: {
    backgroundColor: '#fff3cd',
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
    fontFamily: 'Outfit-Regular',
  },
  warningIcon: {
    fontSize: 16,
  },
  penaltySection: {
    backgroundColor: '#f8d7da',
    padding: 14,
    borderRadius: 10,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  penaltyText: {
    fontSize: 14,
    color: '#721c24',
    lineHeight: 20,
    fontFamily: 'Outfit-Regular',
  },
  penaltyIcon: {
    fontSize: 16,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    fontFamily: 'Outfit-Bold',
  },
  modalButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Outfit-Bold',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Outfit-Bold',
  },
});
