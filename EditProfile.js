import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateProfile } from 'firebase/auth';
import { auth } from './firebase';
import { useUser } from './App';

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
    }
  }, [userData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
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
        about: formData.about
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
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
});
