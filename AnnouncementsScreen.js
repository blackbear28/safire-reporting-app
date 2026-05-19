import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { useUser } from './App';

const COLORS = {
  primary: '#7c3aed',
  bg: '#f5f5f5',
  surface: '#ffffff',
  text: '#111827',
  subtext: '#6b7280',
  border: '#e5e7eb',
};

function isAdminRole(role) {
  const normalized = (role || '').toString().toLowerCase();
  return normalized === 'admin' || normalized === 'superadmin' || normalized === 'super_admin';
}

function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function AnnouncementsScreen({ navigation }) {
  const { user: userData } = useUser();
  const canPost = useMemo(() => isAdminRole(userData?.role), [userData?.role]);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('Announcements subscription error:', err);
        setLoading(false);
        Alert.alert('Error', 'Failed to load announcements.');
      }
    );

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const resetCompose = () => {
    setTitle('');
    setMessage('');
  };

  const handlePublish = async () => {
    if (!canPost) {
      Alert.alert('Not allowed', 'Only admins can create announcements.');
      return;
    }

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle) return Alert.alert('Required', 'Please enter a title.');
    if (!cleanMessage) return Alert.alert('Required', 'Please enter a message.');

    setPublishing(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        title: cleanTitle,
        message: cleanMessage,
        createdAt: serverTimestamp(),
        createdBy: userData?.uid || null,
        createdByName: userData?.name || userData?.displayName || userData?.email || 'Admin',
      });

      setComposeOpen(false);
      resetCompose();
      Alert.alert('Posted', 'Announcement published.');
    } catch (e) {
      console.error('Publish announcement error:', e);
      if (e?.code === 'permission-denied') {
        Alert.alert('Not allowed', 'Your account is not permitted to post announcements.');
      } else {
        Alert.alert('Error', 'Could not publish announcement. Please try again.');
      }
    } finally {
      setPublishing(false);
    }
  };

  const renderItem = ({ item }) => {
    return (
      <View style={s.card}>
        <View style={s.cardTopRow}>
          <View style={s.badge}>
            <Ionicons name="megaphone" size={14} color={COLORS.primary} />
            <Text style={s.badgeText}>ANNOUNCEMENT</Text>
          </View>
          <Text style={s.timeText}>{timeAgo(item.createdAt)}</Text>
        </View>

        <Text style={s.title}>{item.title || 'Untitled'}</Text>
        <Text style={s.message}>{item.message || ''}</Text>

        {!!item.createdByName && (
          <View style={s.footerRow}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.subtext} />
            <Text style={s.footerText}>{item.createdByName}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Announcements</Text>
          <Text style={s.headerSub}>Updates from campus admins</Text>
        </View>
        {canPost ? (
          <TouchableOpacity
            style={s.postBtn}
            onPress={() => setComposeOpen(true)}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={s.postBtnText}>Post</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 68 }} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} size="large" />
      ) : announcements.length === 0 ? (
        <View style={s.emptyBox}>
          <Ionicons name="megaphone-outline" size={58} color={COLORS.subtext} />
          <Text style={s.emptyTitle}>No announcements yet</Text>
          <Text style={s.emptySub}>Check back later for updates.</Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Compose Modal (admin only) */}
      <Modal
        visible={composeOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setComposeOpen(false);
          resetCompose();
        }}
      >
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', paddingHorizontal: 16 }}
          >
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>New Announcement</Text>
                <TouchableOpacity
                  onPress={() => {
                    setComposeOpen(false);
                    resetCompose();
                  }}
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={22} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={s.input}
                placeholder="Title"
                placeholderTextColor="#9ca3af"
                value={title}
                onChangeText={setTitle}
                maxLength={80}
              />

              <TextInput
                style={[s.input, s.textarea]}
                placeholder="Message"
                placeholderTextColor="#9ca3af"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={1200}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[s.publishBtn, publishing && { opacity: 0.6 }]}
                disabled={publishing}
                onPress={handlePublish}
                accessibilityRole="button"
              >
                {publishing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.publishBtnText}>Publish</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', color: COLORS.text },
  headerSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: COLORS.subtext, marginTop: 2 },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  postBtnText: { color: '#fff', fontFamily: 'Outfit-Bold', fontSize: 13 },

  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontFamily: 'Outfit-Bold', fontSize: 16, color: COLORS.text, marginTop: 10 },
  emptySub: { fontFamily: 'Outfit-Regular', fontSize: 12, color: COLORS.subtext, textAlign: 'center', marginTop: 6 },

  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ede9fe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { fontFamily: 'Outfit-Bold', fontSize: 10, color: COLORS.primary, letterSpacing: 0.4 },
  timeText: { fontFamily: 'Outfit-Regular', fontSize: 11, color: COLORS.subtext },
  title: { fontFamily: 'Outfit-Bold', fontSize: 15, color: COLORS.text, marginTop: 10 },
  message: { fontFamily: 'Outfit-Regular', fontSize: 13, color: '#374151', marginTop: 6, lineHeight: 18 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  footerText: { fontFamily: 'Outfit-Regular', fontSize: 12, color: COLORS.subtext },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitle: { fontFamily: 'Outfit-Bold', fontSize: 16, color: COLORS.text },

  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Outfit-Regular',
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  textarea: {
    minHeight: 110,
    maxHeight: 200,
  },
  publishBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  publishBtnText: { color: '#fff', fontFamily: 'Outfit-Bold', fontSize: 15 },
});
