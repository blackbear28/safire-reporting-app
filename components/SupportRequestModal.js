import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import BookAppointmentModal from './BookAppointmentModal';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Alert } from 'react-native';

export default function SupportRequestModal({ visible, onClose }) {
  const { colors } = useTheme() || {};
  const [bookModal, setBookModal] = useState(false);

  // Book appointment handler
  const handleBook = async ({ name, email, reason }) => {
    try {
      await addDoc(collection(db, 'appointments'), {
        name,
        email,
        reason,
        createdAt: serverTimestamp(),
        status: 'pending',
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to book appointment.');
      throw e;
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors?.card || '#fff' }]}> 
            <Text style={[styles.title, { color: colors?.text, fontFamily: 'Outfit-Bold' }]}>Request Support</Text>
            <Text style={[styles.subtitle, { color: colors?.textSecondary, fontFamily: 'Outfit-Regular' }]}>We’re here to help. How would you like to reach out?</Text>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors?.primary }]}
              onPress={() => {
                setBookModal(true);
              }}>
              <MaterialCommunityIcons name="calendar-check" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={[styles.actionText, { fontFamily: 'Outfit-Bold' }]}>Book Appointment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors?.surface, borderWidth: 1, borderColor: colors?.primary }]}
              onPress={() => {
                onClose();
                Linking.openURL('mailto:cjcguidance@g.cjc.edu.ph?subject=Support%20Request');
              }}>
              <MaterialCommunityIcons name="email-outline" size={20} color={colors?.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.actionText, { color: colors?.primary, fontFamily: 'Outfit-Bold' }]}>Send Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors?.surface, borderWidth: 1, borderColor: colors?.primary }]}
              onPress={() => {
                onClose();
                Linking.openURL('tel:+639123456789');
              }}>
              <Ionicons name="call" size={20} color={colors?.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.actionText, { color: colors?.primary, fontFamily: 'Outfit-Bold' }]}>Call Hotline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={[styles.closeText, { color: colors?.textSecondary, fontFamily: 'Outfit-Regular' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <BookAppointmentModal visible={bookModal} onClose={() => setBookModal(false)} onBook={handleBook} />
    </>
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
