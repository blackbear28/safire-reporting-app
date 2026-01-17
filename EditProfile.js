import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  ActivityIndicator,
  Image,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateProfile } from 'firebase/auth';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useUser } from './App';
import { launchImageLibraryAsync, MediaTypeOptions } from 'expo-image-picker';
import { ReportService } from './services/reportService';

export default function EditProfile({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user: userData, updateUser } = useUser();
  const [formData, setFormData] = useState({
    name: userData?.name || '',
    email: userData?.email || '',
    studentId: userData?.studentId || '',
    birthday: userData?.birthday || '',
    mobile: userData?.mobile || '',
    address: userData?.address || '',
    about: userData?.about || ''
  });
  const [profilePic, setProfilePic] = useState(userData?.profilePic || null);
  const [coverPhoto, setCoverPhoto] = useState(userData?.coverPhoto || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        studentId: userData.studentId || '',
        birthday: userData.birthday || '',
        mobile: userData.mobile || '',
        address: userData.address || '',
        about: userData.about || ''
      });
      setProfilePic(userData.profilePic || null);
      setCoverPhoto(userData.coverPhoto || null);
    }
  }, [userData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const pickImage = async (type) => {
    let result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [16, 9],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (type === 'profile') {
        setProfilePic(result.assets[0].uri);
      } else {
        setCoverPhoto(result.assets[0].uri);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Upload images to Supabase if they're local URIs
      let uploadedProfilePic = profilePic;
      let uploadedCoverPhoto = coverPhoto;
      
      if (profilePic && !profilePic.startsWith('http')) {
        Alert.alert('Uploading', 'Uploading profile picture...');
        const url = await ReportService.uploadProfileImage(profilePic, 'profile');
        if (url) {
          uploadedProfilePic = url;
        }
      }
      
      if (coverPhoto && !coverPhoto.startsWith('http')) {
        Alert.alert('Uploading', 'Uploading cover photo...');
        const url = await ReportService.uploadProfileImage(coverPhoto, 'cover');
        if (url) {
          uploadedCoverPhoto = url;
        }
      }
      
      // Update Firebase Auth user
      await updateProfile(auth.currentUser, {
        displayName: formData.name
      });

      // Update local user data with all fields
      await updateUser({
        name: formData.name,
        studentId: formData.studentId,
        birthday: formData.birthday,
        mobile: formData.mobile,
        address: formData.address,
        about: formData.about,
        profilePic: uploadedProfilePic,
        coverPhoto: uploadedCoverPhoto
      });

      // Update all user's posts with new profile picture if it changed
      if (uploadedProfilePic && uploadedProfilePic !== userData?.profilePic) {
        try {
          console.log('Updating profile picture in all posts...');
          const reportsRef = collection(db, 'reports');
          const q = query(reportsRef, where('authorId', '==', auth.currentUser.uid));
          const snapshot = await getDocs(q);
          
          const updatePromises = snapshot.docs.map(docSnapshot => {
            const reportRef = doc(db, 'reports', docSnapshot.id);
            return updateDoc(reportRef, { 
              authorProfilePic: uploadedProfilePic,
              authorName: formData.name // Also update name if it changed
            });
          });
          
          await Promise.all(updatePromises);
          console.log(`Updated ${snapshot.docs.length} posts with new profile picture`);
        } catch (error) {
          console.error('Error updating posts with new profile picture:', error);
          // Don't show error to user since profile update was successful
        }
      }

      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: Math.max(40, insets.bottom + 20) }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
        </View>

        <View style={[styles.formContainer, { paddingBottom: 20 }]}>
          {/* Profile Picture */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Profile Picture</Text>
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={() => pickImage('profile')}
            >
              {profilePic ? (
                <Image source={{ uri: profilePic }} style={styles.previewImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="camera" size={32} color="#666" />
                  <Text style={styles.placeholderText}>Tap to upload</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Cover Photo */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cover Photo</Text>
            <TouchableOpacity 
              style={styles.imagePickerButtonWide}
              onPress={() => pickImage('cover')}
            >
              {coverPhoto ? (
                <Image source={{ uri: coverPhoto }} style={styles.previewImageWide} />
              ) : (
                <View style={styles.placeholderImageWide}>
                  <Ionicons name="camera" size={32} color="#666" />
                  <Text style={styles.placeholderText}>Tap to upload cover</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email (GSuite Account)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#e8e8e8', color: '#666' }]}
              value={formData.email}
              editable={false}
              placeholder="Email"
            />
            <Text style={styles.helperText}>Your GSuite email cannot be changed</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => handleChange('name', text)}
              placeholder="Enter your full name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Student ID</Text>
            <TextInput
              style={styles.input}
              value={formData.studentId}
              onChangeText={(text) => handleChange('studentId', text)}
              placeholder="Enter your student ID"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Birthday</Text>
            <TextInput
              style={styles.input}
              value={formData.birthday}
              onChangeText={(text) => handleChange('birthday', text)}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              value={formData.mobile}
              onChangeText={(text) => handleChange('mobile', text)}
              placeholder="Enter your mobile number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={formData.address}
              onChangeText={(text) => handleChange('address', text)}
              placeholder="Enter your address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>About</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={formData.about}
              onChangeText={(text) => handleChange('about', text)}
              placeholder="Tell us about yourself"
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
  },
  formContainer: {
    padding: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Outfit-Bold',
    color: '#333',
    marginBottom: 5,
  },
  helperText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontFamily: 'Outfit-Regular',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  imagePickerButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  imagePickerButtonWide: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewImageWide: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderImageWide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
});
