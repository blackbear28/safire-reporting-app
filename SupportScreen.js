import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from './contexts/ThemeContext';
import SupportRequestModal from './components/SupportRequestModal';

const WELLBEING_TIPS = [
  'Take regular breaks and get enough sleep.',
  'Reach out to friends or family when you feel overwhelmed.',
  'Stay hydrated and eat nutritious meals.',
  'Remember, it’s okay to ask for help!',
  'Practice mindfulness or meditation for a few minutes each day.',
];

const COUNSELORS = [
  {
    name: 'Ms. Jane Dela Cruz',
    role: 'Guidance Counselor',
    phone: '+63 912 345 6789',
    email: 'cjcguidance@g.cjc.edu.ph',
  },
  {
    name: 'Mr. John Santos',
    role: 'Student Support',
    phone: '+63 923 456 7890',
    email: 'support@yourcollege.edu.ph',
  },
];

const HOTLINES = [
  {
    label: 'National Mental Health Crisis Hotline',
    phone: '1553',
  },
  {
    label: 'Hopeline PH',
    phone: '0917 558 4673',
  },
];

const MOTIVATIONAL_QUOTES = [
  'You are stronger than you think.',
  'Every day is a fresh start.',
  'Your feelings are valid.',
  'Small steps every day lead to big changes.',
  'You are not alone. Reach out when you need to.',
];

function getRandomQuote() {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

export default function SupportScreen() {
  const { colors } = useTheme() || {};
  const quote = React.useMemo(getRandomQuote, []);
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors?.background }]}
        contentContainerStyle={{ padding: 20 }}>
        <View style={styles.headerSection}>
          <MaterialCommunityIcons name="hand-heart" size={48} color={colors?.primary || '#2667ff'} />
          <Text style={[styles.headerTitle, { color: colors?.text, fontFamily: 'Outfit-Bold' }]}>Student Support & Wellbeing</Text>
          <Text style={[styles.headerSubtitle, { color: colors?.textSecondary, fontFamily: 'Outfit-Regular' }]}>Your mental health matters. Here are some resources and tips to help you thrive.</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors?.primary, fontFamily: 'Outfit-Bold' }]}>Motivational Quote</Text>
          <View style={[styles.quoteBox, { backgroundColor: colors?.card }]}> 
            <Text style={[styles.quoteText, { color: colors?.text, fontFamily: 'Outfit-Italic' }]}> 
              “{quote}”
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors?.primary, fontFamily: 'Outfit-Bold' }]}>Wellbeing Tips</Text>
          {WELLBEING_TIPS.map((tip, idx) => (
            <View key={idx} style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors?.success || '#51cf66'} style={{ marginRight: 8 }} />
              <Text style={[styles.tipText, { color: colors?.text, fontFamily: 'Outfit-Regular' }]}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors?.primary, fontFamily: 'Outfit-Bold' }]}>Counseling Contacts</Text>
          {COUNSELORS.map((c, idx) => (
            <View key={idx} style={[styles.contactCard, { backgroundColor: colors?.card, borderColor: colors?.border }]}> 
              <Text style={[styles.contactName, { color: colors?.text, fontFamily: 'Outfit-Bold' }]}>{c.name}</Text>
              <Text style={[styles.contactRole, { color: colors?.textSecondary, fontFamily: 'Outfit-Regular' }]}>{c.role}</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${c.phone.replace(/\s+/g, '')}`)}>
                <Text style={[styles.contactAction, { color: colors?.primary, fontFamily: 'Outfit-Regular' }]}>Call: {c.phone}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL(`mailto:${c.email}`)}>
                <Text style={[styles.contactAction, { color: colors?.primary, fontFamily: 'Outfit-Regular' }]}>Email: {c.email}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors?.primary, fontFamily: 'Outfit-Bold' }]}>Emergency Hotlines</Text>
          {HOTLINES.map((h, idx) => (
            <TouchableOpacity key={idx} style={[styles.hotlineCard, { backgroundColor: colors?.card, borderColor: colors?.border }]}
              onPress={() => Linking.openURL(`tel:${h.phone.replace(/\s+/g, '')}`)}>
              <Ionicons name="call" size={20} color={colors?.error || '#ff6b6b'} style={{ marginRight: 8 }} />
              <Text style={[styles.hotlineLabel, { color: colors?.text, fontFamily: 'Outfit-Bold' }]}>{h.label}</Text>
              <Text style={[styles.hotlinePhone, { color: colors?.primary, fontFamily: 'Outfit-Bold' }]}>{h.phone}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={[styles.supportBtn, { backgroundColor: colors?.primary }]}
            onPress={() => setModalVisible(true)}
          >
            <MaterialCommunityIcons name="hand-heart" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={[styles.supportBtnText, { fontFamily: 'Outfit-Bold' }]}>Request Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <SupportRequestModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  quoteBox: {
    borderRadius: 10,
    padding: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 15,
  },
  contactCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactRole: {
    fontSize: 14,
    marginBottom: 6,
  },
  contactAction: {
    fontSize: 14,
    marginBottom: 2,
  },
  hotlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  hotlineLabel: {
    fontSize: 15,
    flex: 1,
    fontWeight: 'bold',
  },
  hotlinePhone: {
    fontSize: 15,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    padding: 14,
  },
  supportBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 6,
  },
});
