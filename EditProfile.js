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
import { updateProfile } from 'firebase/auth';
import { auth } from './firebase';
import { useUser } from './contexts/UserContext';

export default function EditProfile({ navigation }) {
  const { user: userData, updateUser } = useUser();
  const [formData, setFormData] = useState({
    name: userData?.name || '',
    email: userData?.email || '',
    bio: userData?.bio || ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name,
        email: userData.email,
        bio: userData.bio || ''
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

      // Update local user data
      await updateUser({
        name: formData.name,
        bio: formData.bio
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
        </View>

        <View style={[styles.formContainer, { paddingBottom: 20 }]}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => handleChange('name', text)}
              placeholder="Enter your name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              editable={false}
              placeholder="Email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={formData.bio}
              onChangeText={(text) => handleChange('bio', text)}
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
    </SafeAreaView>
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
