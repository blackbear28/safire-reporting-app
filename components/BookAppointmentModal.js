import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function BookAppointmentModal({ visible, onClose, onBook }) {
  const { colors } = useTheme() || {};
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleBook = async () => {
    if (!name || !email || !reason) {
      Alert.alert('Missing Information', 'Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    try {
      await onBook({ name, email, reason });
      setName('');
      setEmail('');
      setReason('');
      onClose();
      Alert.alert('Appointment Requested', 'Your appointment request has been sent.');
    } catch (e) {
      Alert.alert('Error', 'Failed to book appointment.');
    }
    setSubmitting(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors?.card || '#fff' }]}> 
          <Text style={[styles.title, { color: colors?.text, fontFamily: 'Outfit-Bold' }]}>Book Appointment</Text>
          <Text style={[styles.subtitle, { color: colors?.textSecondary, fontFamily: 'Outfit-Regular' }]}>Fill in your details and reason for booking.</Text>
          <TextInput
            style={[styles.input, { color: colors?.text, borderColor: colors?.primary }]}
            placeholder="Your Name"
            placeholderTextColor={colors?.placeholder || '#999'}
            value={name}
            onChangeText={setName}
            editable={!submitting}
          />
          <TextInput
            style={[styles.input, { color: colors?.text, borderColor: colors?.primary }]}
            placeholder="Your Email"
            placeholderTextColor={colors?.placeholder || '#999'}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!submitting}
          />
          <TextInput
            style={[styles.input, { color: colors?.text, borderColor: colors?.primary, height: 80 }]}
            placeholder="Reason for Appointment"
            placeholderTextColor={colors?.placeholder || '#999'}
            value={reason}
            onChangeText={setReason}
            multiline
            editable={!submitting}
          />
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors?.primary, opacity: submitting ? 0.7 : 1 }]}
            onPress={handleBook}
            disabled={submitting}
          >
            <MaterialCommunityIcons name="calendar-check" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={[styles.actionText, { fontFamily: 'Outfit-Bold' }]}>Book Appointment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={submitting}>
            <Text style={[styles.closeText, { color: colors?.textSecondary, fontFamily: 'Outfit-Regular' }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'stretch',
    elevation: 6,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 18,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 15,
    backgroundColor: '#f8f9fa',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
  },
  closeBtn: {
    marginTop: 8,
    alignSelf: 'center',
    padding: 8,
  },
  closeText: {
    fontSize: 15,
  },
});
