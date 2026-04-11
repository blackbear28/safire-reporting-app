import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { auth } from './firebase';
import { ReportService } from './services/reportService';
import { useUser } from './App';

// ─── Emergency Types ──────────────────────────────────────────────────────────
const EMERGENCY_TYPES = [
  {
    id: 'fire',
    label: 'Fire / Smoke',
    icon: 'flame',
    color: '#ff4500',
    category: 'facilities',
    hint: 'Active fire, smoke, or gas smell',
  },
  {
    id: 'medical',
    label: 'Medical Emergency',
    icon: 'medkit',
    color: '#e91e63',
    category: 'facilities',
    hint: 'Person injured, unconscious, or unwell',
  },
  {
    id: 'threat',
    label: 'Physical Threat',
    icon: 'alert-circle',
    color: '#9c27b0',
    category: 'security',
    hint: 'Violence, assault, or threatening behavior',
  },
  {
    id: 'hazard',
    label: 'Safety Hazard',
    icon: 'warning',
    color: '#ff9800',
    category: 'infrastructure',
    hint: 'Structural damage, electrical, flooding',
  },
  {
    id: 'missing',
    label: 'Missing Person',
    icon: 'person',
    color: '#3f51b5',
    category: 'security',
    hint: 'Student or staff gone missing on campus',
  },
  {
    id: 'other_emergency',
    label: 'Other Emergency',
    icon: 'notifications',
    color: '#607d8b',
    category: 'other',
    hint: 'Any other life-safety situation',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function EmergencyReportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user: userData } = useUser();

  const [selectedType, setSelectedType] = useState(null);
  const [description, setDescription] = useState('');
  const [building, setBuilding] = useState('');
  const [exactSpot, setExactSpot] = useState('');
  const [media, setMedia] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  // Pulse effect timer (for red header urgency indicator)
  const [pulse, setPulse] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 700);
    return () => clearInterval(interval);
  }, []);

  // Auto-fetch GPS on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } catch (_) {}
      }
    })();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll permission is needed to attach photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setMedia([result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets?.length > 0) {
      setMedia([result.assets[0].uri]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Select Emergency Type', 'Please choose what kind of emergency this is.');
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert('Describe the Emergency', 'Please briefly describe what is happening (at least 10 characters).');
      return;
    }
    if (!building.trim()) {
      Alert.alert('Location Required', 'Please enter the building or area where the emergency is happening.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert(
      '🚨 Confirm Emergency Report',
      `Type: ${selectedType.label}\nLocation: ${building.trim()}${exactSpot.trim() ? ', ' + exactSpot.trim() : ''}\n\nThis will be flagged as CRITICAL and sent immediately to administration. Only confirm if this is a real emergency.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SUBMIT NOW',
          style: 'destructive',
          onPress: processSubmit,
        },
      ]
    );
  };

  const processSubmit = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      const reportPayload = {
        userId: user?.uid,
        authorId: user?.uid,
        authorName: userData?.name || user?.displayName || user?.email?.split('@')[0] || 'User',
        authorUsername: user?.email || 'user',
        authorEmail: user?.email,
        authorRole: userData?.role || 'student',
        authorProfilePic: userData?.profilePic || null,
        title: `🚨 ${selectedType.label} — ${building.trim()}`,
        description: description.trim(),
        category: selectedType.category,
        priority: 'critical',
        department: 'Security & Safety',
        location: {
          building: building.trim(),
          room: exactSpot.trim(),
          coordinates: location,
        },
        media: media,
        isComplaint: false,
        isEmergency: true,
        emergencyType: selectedType.id,
        anonymous: false,
        confidential: false,
        tags: ['emergency', selectedType.id],
        sentimentScore: -1,
        emotion: 'fear',
        slaDeadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min SLA
      };

      const result = await ReportService.submitReport(reportPayload);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          '✅ Emergency Report Submitted',
          'Your emergency report has been submitted with CRITICAL priority. Campus security and administration have been notified.\n\nIf this is a life-threatening emergency, call emergency services immediately.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Submission Failed', result.error || 'Could not submit. Please try again or call security directly.');
      }
    } catch (err) {
      console.error('Emergency report error:', err);
      Alert.alert('Error', 'Submission failed. Please try again or contact campus security directly.');
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeData = selectedType;

  return (
    <SafeAreaView style={[eStyles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#c0392b" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header ── */}
        <View style={eStyles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={eStyles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={eStyles.headerCenter}>
            <View style={[eStyles.liveDot, { opacity: pulse ? 1 : 0.2 }]} />
            <Text style={eStyles.headerTitle}>EMERGENCY REPORT</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Disclaimer Banner ── */}
        <View style={eStyles.disclaimerBanner}>
          <Ionicons name="information-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={eStyles.disclaimerText}>
            For life-threatening situations, call <Text style={{ fontWeight: '800' }}>911</Text> or campus security first.
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={eStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Step 1: Emergency Type ── */}
          <Text style={eStyles.sectionLabel}>
            <Text style={eStyles.stepBadge}>1</Text>  What type of emergency?
          </Text>
          <View style={eStyles.typeGrid}>
            {EMERGENCY_TYPES.map((type) => {
              const isSelected = selectedTypeData?.id === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    eStyles.typeCard,
                    isSelected && { borderColor: type.color, borderWidth: 2, backgroundColor: type.color + '15' },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedType(type);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[eStyles.typeIconWrap, { backgroundColor: type.color + '20' }]}>
                    <Ionicons name={type.icon} size={24} color={type.color} />
                  </View>
                  <Text style={[eStyles.typeLabel, isSelected && { color: type.color, fontWeight: '700' }]}>
                    {type.label}
                  </Text>
                  <Text style={eStyles.typeHint}>{type.hint}</Text>
                  {isSelected && (
                    <View style={[eStyles.checkBadge, { backgroundColor: type.color }]}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Step 2: What's Happening ── */}
          <Text style={eStyles.sectionLabel}>
            <Text style={eStyles.stepBadge}>2</Text>  What is happening?
          </Text>
          <TextInput
            style={eStyles.textArea}
            placeholder="Describe the emergency clearly — what you saw, who is involved, any danger present..."
            placeholderTextColor="#aaa"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={eStyles.charCount}>{description.length}/500</Text>

          {/* ── Step 3: Location ── */}
          <Text style={eStyles.sectionLabel}>
            <Text style={eStyles.stepBadge}>3</Text>  Where is it happening?
          </Text>
          <View style={eStyles.locationRow}>
            <Ionicons name="business" size={18} color="#c0392b" style={{ marginRight: 8, marginTop: 12 }} />
            <TextInput
              style={[eStyles.input, { flex: 1 }]}
              placeholder="Building or area (e.g. Main Building, Gym)"
              placeholderTextColor="#aaa"
              value={building}
              onChangeText={setBuilding}
            />
          </View>
          <View style={eStyles.locationRow}>
            <Ionicons name="location" size={18} color="#c0392b" style={{ marginRight: 8, marginTop: 12 }} />
            <TextInput
              style={[eStyles.input, { flex: 1 }]}
              placeholder="Exact spot (Floor, Room, Hallway — optional)"
              placeholderTextColor="#aaa"
              value={exactSpot}
              onChangeText={setExactSpot}
            />
          </View>
          {location && (
            <View style={eStyles.gpsTag}>
              <Ionicons name="navigate" size={12} color="#27ae60" />
              <Text style={eStyles.gpsText}>GPS captured automatically</Text>
            </View>
          )}

          {/* ── Step 4: Photo (optional) ── */}
          <Text style={eStyles.sectionLabel}>
            <Text style={eStyles.stepBadge}>4</Text>  Attach photo{' '}
            <Text style={eStyles.optionalTag}>(optional)</Text>
          </Text>
          {media.length > 0 ? (
            <View style={eStyles.mediaPreviewWrap}>
              <Image source={{ uri: media[0] }} style={eStyles.mediaPreview} />
              <TouchableOpacity
                style={eStyles.removeMedia}
                onPress={() => setMedia([])}
              >
                <Ionicons name="close-circle" size={22} color="#c0392b" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={eStyles.mediaButtons}>
              <TouchableOpacity style={eStyles.mediaBtn} onPress={takePhoto}>
                <Ionicons name="camera" size={20} color="#c0392b" />
                <Text style={eStyles.mediaBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={eStyles.mediaBtn} onPress={pickImage}>
                <Ionicons name="images" size={20} color="#c0392b" />
                <Text style={eStyles.mediaBtnText}>Choose Photo</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[eStyles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="warning" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={eStyles.submitBtnText}>SUBMIT EMERGENCY REPORT</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={eStyles.footerNote}>
            This report will be immediately escalated to campus administration and security with CRITICAL priority.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const eStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#c0392b',
  },
  header: {
    backgroundColor: '#c0392b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff6b6b',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: 'Outfit-Bold',
  },
  disclaimerBanner: {
    backgroundColor: '#922b21',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  disclaimerText: {
    color: '#f5b7b1',
    fontSize: 12,
    flex: 1,
    fontFamily: 'Outfit-Regular',
  },
  scrollContent: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    fontFamily: 'Outfit-Bold',
  },
  stepBadge: {
    backgroundColor: '#c0392b',
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  // Emergency type grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  typeCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  typeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
    fontFamily: 'Outfit-SemiBold',
  },
  typeHint: {
    fontSize: 11,
    color: '#999',
    lineHeight: 15,
    fontFamily: 'Outfit-Regular',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Description
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    padding: 14,
    fontSize: 14,
    color: '#333',
    minHeight: 110,
    marginBottom: 4,
    fontFamily: 'Outfit-Regular',
  },
  charCount: {
    fontSize: 11,
    color: '#bbb',
    textAlign: 'right',
    marginBottom: 20,
  },
  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    padding: 12,
    fontSize: 14,
    color: '#333',
    fontFamily: 'Outfit-Regular',
  },
  gpsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  gpsText: {
    fontSize: 11,
    color: '#27ae60',
    fontFamily: 'Outfit-Regular',
  },
  // Media
  optionalTag: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  mediaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#c0392b',
    paddingVertical: 14,
  },
  mediaBtnText: {
    color: '#c0392b',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
  mediaPreviewWrap: {
    position: 'relative',
    marginBottom: 24,
  },
  mediaPreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  removeMedia: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  // Submit
  submitBtn: {
    backgroundColor: '#c0392b',
    borderRadius: 14,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 14,
    shadowColor: '#c0392b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'Outfit-Bold',
  },
  footerNote: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'Outfit-Regular',
  },
});
