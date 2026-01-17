import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';
import { db, auth } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useUser } from './App';

export default function TestFeedbackScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('');  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-populate start time from login timestamp
  useEffect(() => {
    const getLoginTime = async () => {
      try {
        const loginTimestamp = await AsyncStorage.getItem('sessionStartTime');
        if (loginTimestamp) {
          const loginDate = new Date(parseInt(loginTimestamp));
          const timeStr = loginDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });
          setStartTime(timeStr);
        } else {
          // Fallback to current time if no login time found
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });
          setStartTime(timeStr);
        }
      } catch (error) {
        console.error('Error getting login time:', error);
        // Fallback to current time
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
        setStartTime(timeStr);
      }
    };
    getLoginTime();
  }, []);

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing Information', 'Please enter your first and last name.');
      return;
    }

    if (!department) {
      Alert.alert('Missing Information', 'Please select your department.');
      return;
    }

    if (!startTime || !endTime) {
      Alert.alert('Missing Information', 'Please enter both start and end times.');
      return;
    }

    if (!feedback.trim()) {
      Alert.alert('Missing Feedback', 'Please provide your feedback about the app.');
      return;
    }

    setSubmitting(true);

    try {
      // Generate log data
      const logData = {
        userId: user?.uid || 'anonymous',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        department: department,
        userName: user?.name || 'Anonymous User',
        userEmail: user?.email || 'N/A',
        userRole: user?.role || 'N/A',
        sessionStartTime: startTime,
        sessionEndTime: endTime,
        feedback: feedback,
        timestamp: new Date(),
        deviceInfo: {
          platform: 'mobile',
          // You can add more device info here if needed
        },
      };

      // Save to Firestore
      await addDoc(collection(db, 'testFeedback'), logData);

      // Show success message with log preview
      Alert.alert(
        'Thank You! 🎉',
        'Your feedback has been submitted successfully. Administrators can view it in the admin panel.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );

      // Reset form
      setFirstName('');
      setLastName('');
      setDepartment('');
      setStartTime('');
      setEndTime('');
      setFeedback('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const generateLogPreview = () => {
    return `
=== TEST SESSION LOG ===
Name: ${firstName} ${lastName}
Department: ${department}
User: ${user?.name || 'Anonymous'}
Email: ${user?.email || 'N/A'}
Role: ${user?.role || 'N/A'}
Session Start: ${startTime}
Session End: ${endTime}
Date: ${new Date().toLocaleDateString()}

FEEDBACK:
${feedback}
========================
    `.trim();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: Math.max(40, insets.bottom + 20) }}
      >
        {/* Header */}
        <View style={[styles.feedbackHeader, { paddingTop: 20 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={[styles.feedbackTitle, { marginTop: 15 }]}>
            Test Feedback
          </Text>
          <Text style={styles.feedbackSubtitle}>
            Help us improve by sharing your testing experience
          </Text>
          
          {/* Important Notice */}
          <View style={{
            backgroundColor: '#fff3cd',
            borderLeftWidth: 4,
            borderLeftColor: '#ffc107',
            padding: 12,
            marginTop: 15,
            marginHorizontal: 20,
            borderRadius: 8,
          }}>
            <Text style={{
              fontFamily: 'Outfit-Bold',
              fontSize: 13,
              color: '#856404',
              marginBottom: 6,
            }}>
              ⚠️ Important Notice
            </Text>
            <Text style={{
              fontFamily: 'Outfit-Regular',
              fontSize: 12,
              color: '#856404',
              lineHeight: 18,
            }}>
              Please use your actual personal information. Your details are crucial for our testing and will be stored in a safe, confidential place. Thank you for your cooperation.
            </Text>
          </View>
        </View>

        <View style={{ padding: 20 }}>
          {/* Personal Information Section */}
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackLabel}>Personal Information</Text>
            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Outfit-Medium', fontSize: 12, color: '#666', marginBottom: 5 }}>
                  First Name *
                </Text>
                <TextInput
                  style={styles.timeInput}
                  placeholder="Enter first name"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Outfit-Medium', fontSize: 12, color: '#666', marginBottom: 5 }}>
                  Last Name *
                </Text>
                <TextInput
                  style={styles.timeInput}
                  placeholder="Enter last name"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>
            
            {/* Department Dropdown */}
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontFamily: 'Outfit-Medium', fontSize: 12, color: '#666', marginBottom: 5 }}>
                Department *
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['CCIS', 'CABE', 'CEDAS', 'CSP', 'CHS', 'COE'].map((dept) => (
                  <TouchableOpacity
                    key={dept}
                    style={[
                      {
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: department === dept ? '#2667ff' : '#ddd',
                        backgroundColor: department === dept ? '#2667ff' : '#fff',
                        minWidth: 80,
                        alignItems: 'center',
                      },
                    ]}
                    onPress={() => setDepartment(dept)}
                  >
                    <Text
                      style={{
                        fontFamily: 'Outfit-Bold',
                        fontSize: 14,
                        color: department === dept ? '#fff' : '#666',
                      }}
                    >
                      {dept}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Time Tracking Section */}
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackLabel}>Testing Session Time</Text>
            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Outfit-Medium', fontSize: 12, color: '#666', marginBottom: 5 }}>
                  Start Time (Login)
                </Text>
                <TextInput
                  style={[styles.timeInput, { backgroundColor: '#e8e8e8', color: '#666' }]}
                  placeholder="Auto-detected"
                  value={startTime}
                  editable={false}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Outfit-Medium', fontSize: 12, color: '#666', marginBottom: 5 }}>
                  End Time *
                </Text>
                <TextInput
                  style={styles.timeInput}
                  placeholder="e.g., 11:45 AM"
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </View>
            </View>
          </View>

          {/* Feedback Section */}
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackLabel}>Your Feedback</Text>
            <Text style={[styles.feedbackSubtitle, { marginBottom: 10 }]}>
              Share your experience, bugs found, suggestions, or any issues encountered
            </Text>
            <TextInput
              style={styles.feedbackTextArea}
              placeholder="Enter your detailed feedback here..."
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Log Preview */}
          {feedback && startTime && endTime && firstName && lastName && department && (
            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackLabel}>Log Preview</Text>
              <View style={styles.feedbackPreview}>
                <Text style={styles.feedbackPreviewText}>
                  {generateLogPreview()}
                </Text>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitFeedbackButton,
              { backgroundColor: submitting ? '#ccc' : '#000' },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitFeedbackButtonText}>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Text>
          </TouchableOpacity>

          {/* Info Text */}
          <Text
            style={[
              styles.feedbackSubtitle,
              { textAlign: 'center', marginTop: 20, paddingHorizontal: 20 },
            ]}
          >
            Your feedback will be visible in the admin panel for documentation purposes.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
