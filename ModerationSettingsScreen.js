// ModerationSettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ModerationService from './services/moderationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ModerationSettingsScreen({ navigation }) {
  const [geminiKey, setGeminiKey] = useState('');
  const [hfToken, setHfToken] = useState('');
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const savedGemini = await AsyncStorage.getItem('@moderation_gemini_key');
      const savedHF = await AsyncStorage.getItem('@moderation_hf_token');
      
      if (savedGemini) setGeminiKey(savedGemini);
      if (savedHF) setHfToken(savedHF);
      
      const currentStatus = ModerationService.getStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await ModerationService.saveApiKeys(geminiKey, hfToken);
      
      if (result.success) {
        await loadStatus();
        Alert.alert(
          'Success',
          'API keys saved successfully! Content moderation is now active.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to save API keys');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      // Test text moderation
      const testResult = await ModerationService.moderateText(
        'The library AC is broken and needs repair',
        'report'
      );

      if (testResult.allowed) {
        Alert.alert(
          'Test Successful! ✅',
          `Moderation is working correctly.\n\nMethod: ${testResult.method}\nConfidence: ${(testResult.confidence * 100).toFixed(0)}%`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Test Failed',
          'Test content was unexpectedly blocked. Check your API keys.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Test Failed',
        `Error: ${error.message}\n\nPlease check your API keys and internet connection.`,
        [{ text: 'OK' }]
      );
    } finally {
      setTesting(false);
    }
  };

  const StatusBadge = ({ label, value, isActive }) => (
    <View style={styles.statusBadge}>
      <Text style={styles.statusLabel}>{label}</Text>
      <View style={[
        styles.statusValue,
        { backgroundColor: isActive ? '#e8f5e9' : '#fff3e0' }
      ]}>
        <Text style={[
          styles.statusValueText,
          { color: isActive ? '#2e7d32' : '#e65100' }
        ]}>
          {value}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Moderation Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛡️ Protection Status</Text>
          {status && (
            <View>
              <StatusBadge 
                label="Text Moderation" 
                value={status.textModeration === 'gemini' ? 'Active (AI)' : 'Limited (Keywords)'}
                isActive={status.textModeration === 'gemini'}
              />
              <StatusBadge 
                label="Image Moderation" 
                value={status.imageModeration === 'disabled' ? 'Disabled' : 'Active (AI)'}
                isActive={status.imageModeration !== 'disabled'}
              />
              <View style={styles.statusMessage}>
                <Text style={styles.statusMessageText}>{status.message}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📚 Get Free API Keys:</Text>
          <Text style={styles.infoText}>
            • <Text style={styles.link}>Google Gemini</Text>: makersuite.google.com/app/apikey{'\n'}
            • <Text style={styles.link}>HuggingFace</Text>: huggingface.co/settings/tokens
          </Text>
          <Text style={styles.infoText} style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
            Both services offer generous free tiers perfect for schools!
          </Text>
        </View>

        {/* Configuration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔑 API Configuration</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Google Gemini API Key (Recommended)</Text>
            <TextInput
              style={styles.input}
              value={geminiKey}
              onChangeText={setGeminiKey}
              placeholder="AIza..."
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text style={styles.inputHelper}>
              Used for text & image moderation
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>HuggingFace Token (Optional)</Text>
            <TextInput
              style={styles.input}
              value={hfToken}
              onChangeText={setHfToken}
              placeholder="hf_..."
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text style={styles.inputHelper}>
              Backup for image moderation
            </Text>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>💾 Save Configuration</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, testing && styles.buttonDisabled]}
              onPress={handleTest}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator color="#2667ff" />
              ) : (
                <Text style={[styles.buttonText, { color: '#2667ff' }]}>🧪 Test Moderation</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ What Gets Blocked</Text>
          <View style={styles.featureList}>
            <FeatureItem icon="⚠️" text="Violence, threats, weapons" />
            <FeatureItem icon="🔞" text="Sexual or explicit content" />
            <FeatureItem icon="😡" text="Harassment or bullying" />
            <FeatureItem icon="💔" text="Hate speech" />
            <FeatureItem icon="🆘" text="Self-harm references" />
            <FeatureItem icon="📧" text="Spam and gibberish" />
            <FeatureItem icon="❌" text="Non-school content" />
            <FeatureItem icon="🖼️" text="Inappropriate images" />
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.infoBox} style={{ backgroundColor: '#e3f2fd', borderColor: '#1976d2' }}>
          <Text style={styles.infoTitle}>🔒 Privacy & Security</Text>
          <Text style={styles.infoText}>
            • Content is analyzed but never stored by AI{'\n'}
            • No personal identifiers sent{'\n'}
            • GDPR & COPPA compliant{'\n'}
            • API keys stored locally on device
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const FeatureItem = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 28,
    color: '#2667ff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#202124',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 15,
    color: '#5f6368',
  },
  statusValue: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusValueText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusMessage: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statusMessageText: {
    fontSize: 14,
    color: '#5f6368',
    textAlign: 'center',
  },
  infoBox: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fff9c4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f9a825',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#5f6368',
    lineHeight: 20,
  },
  link: {
    color: '#2667ff',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#202124',
  },
  inputHelper: {
    fontSize: 13,
    color: '#5f6368',
    marginTop: 4,
  },
  buttonGroup: {
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButton: {
    backgroundColor: '#2667ff',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2667ff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#5f6368',
    flex: 1,
  },
});
