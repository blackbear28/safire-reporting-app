import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Modal, TextInput,
  StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  collection, addDoc, getDocs, query, where, orderBy,
  updateDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { useUser } from './App';

const COLORS = {
  primary:  '#d97706',
  primaryBg:'#fffbeb',
  surface:  '#ffffff',
  bg:       '#fafaf7',
  text:     '#1a1a2e',
  subtext:  '#64748b',
  border:   '#e5e7eb',
  lost:     '#ef4444',
  found:    '#16a34a',
};

const CATEGORIES = ['All', 'Electronics', 'ID / Cards', 'Books', 'Clothing', 'Keys', 'Bags', 'Other'];

const LOCATIONS = [
  'Library', 'Canteen', 'Gymnasium', 'Science Building', 'ICT Building',
  'Chapel', 'Oval / Sports Area', 'Parking Lot', 'Classroom', 'Other',
];

function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function LostAndFoundScreen({ navigation }) {
  const { user: userData } = useUser();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all'); // all | lost | found | mine
  const [catFilter, setCatFilter]   = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailItem, setDetailItem]     = useState(null);

  // Form state
  const [form, setForm] = useState({
    type: 'lost', title: '', description: '', category: 'Other',
    location: 'Other', contactInfo: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const q = query(collection(db, 'lostFoundItems'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const filtered = items.filter(item => {
    const typeOk =
      typeFilter === 'all'  ? true :
      typeFilter === 'mine' ? item.userId === userData.uid :
      item.type === typeFilter;
    const catOk = catFilter === 'All' || item.category === catFilter;
    return typeOk && catOk;
  });

  const handleSubmit = async () => {
    if (!form.title.trim())       return Alert.alert('Required', 'Please enter a title.');
    if (!form.description.trim()) return Alert.alert('Required', 'Please describe the item.');
    if (!form.contactInfo.trim()) return Alert.alert('Required', 'Please provide contact info.');

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'lostFoundItems'), {
        ...form,
        title:       form.title.trim(),
        description: form.description.trim(),
        contactInfo: form.contactInfo.trim(),
        userId:      userData.uid,
        userName:    userData.displayName || 'Anonymous',
        userEmail:   userData.email || '',
        status:      'open',
        createdAt:   serverTimestamp(),
      });
      Alert.alert('Posted!', `Your ${form.type} item has been posted.`);
      setModalVisible(false);
      setForm({ type: 'lost', title: '', description: '', category: 'Other', location: 'Other', contactInfo: '' });
      await loadItems();
    } catch (e) {
      Alert.alert('Error', 'Could not post item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkResolved = async (item) => {
    Alert.alert(
      'Mark as Resolved',
      'Has this item been claimed or found? This will close the post.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Resolved',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'lostFoundItems', item.id), { status: 'resolved' });
              setDetailItem(null);
              await loadItems();
            } catch (e) {
              Alert.alert('Error', 'Could not update status.');
            }
          }
        }
      ]
    );
  };

  const TypeChip = ({ label, value }) => (
    <TouchableOpacity
      onPress={() => setTypeFilter(value)}
      style={[s.typeChip, typeFilter === value && s.typeChipActive]}
    >
      <Text style={[s.typeChipText, typeFilter === value && s.typeChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Lost &amp; Found</Text>
          <Text style={s.headerSub}>{items.filter(i => i.status === 'open').length} open posts</Text>
        </View>
        <TouchableOpacity style={s.postBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.postBtnText}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* Type filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
        style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border }}
      >
        <TypeChip label="All" value="all" />
        <TypeChip label="🔴 Lost" value="lost" />
        <TypeChip label="🟢 Found" value="found" />
        <TypeChip label="My Posts" value="mine" />
      </ScrollView>

      {/* Category filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
        style={{ backgroundColor: '#fafaf7' }}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCatFilter(cat)}
            style={[s.catChip, catFilter === cat && s.catChipActive]}
          >
            <Text style={[s.catChipText, catFilter === cat && s.catChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} size="large" />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadItems(); }} />}
        >
          {filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="search-outline" size={52} color={COLORS.subtext} />
              <Text style={s.emptyTitle}>Nothing here yet</Text>
              <Text style={s.emptySub}>Be the first to post a lost or found item!</Text>
            </View>
          ) : (
            filtered.map(item => (
              <TouchableOpacity key={item.id} style={s.itemCard} onPress={() => setDetailItem(item)}>
                {/* Color accent */}
                <View style={[s.accentBar, { backgroundColor: item.type === 'lost' ? COLORS.lost : COLORS.found }]} />
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <View style={[s.typeBadge, { backgroundColor: (item.type === 'lost' ? COLORS.lost : COLORS.found) + '18' }]}>
                      <Text style={[s.typeText, { color: item.type === 'lost' ? COLORS.lost : COLORS.found }]}>
                        {item.type === 'lost' ? 'LOST' : 'FOUND'}
                      </Text>
                    </View>
                    <Text style={s.catTag}>{item.category}</Text>
                    {item.status === 'resolved' && (
                      <View style={s.resolvedBadge}>
                        <Text style={s.resolvedText}>Resolved</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.itemDesc} numberOfLines={2}>{item.description}</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Ionicons name="location-outline" size={12} color={COLORS.subtext} />
                      <Text style={s.itemMeta}>{item.location}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Ionicons name="person-outline" size={12} color={COLORS.subtext} />
                      <Text style={s.itemMeta}>{item.userName}</Text>
                    </View>
                    <Text style={[s.itemMeta, { marginLeft: 'auto' }]}>{timeAgo(item.createdAt)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Detail Modal */}
      <Modal visible={!!detailItem} animationType="slide" transparent onRequestClose={() => setDetailItem(null)}>
        <View style={s.modalOverlay}>
          <View style={s.detailSheet}>
            <View style={s.detailHandle} />
            {detailItem && (
              <ScrollView>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <View style={[s.typeBadge, { backgroundColor: (detailItem.type === 'lost' ? COLORS.lost : COLORS.found) + '18' }]}>
                    <Text style={[s.typeText, { color: detailItem.type === 'lost' ? COLORS.lost : COLORS.found }]}>
                      {detailItem.type === 'lost' ? 'LOST' : 'FOUND'}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 18, color: COLORS.text, flex: 1 }}>
                    {detailItem.title}
                  </Text>
                </View>
                {[
                  { icon: 'document-text-outline', label: 'Description', value: detailItem.description },
                  { icon: 'pricetag-outline',       label: 'Category',    value: detailItem.category },
                  { icon: 'location-outline',       label: 'Location',    value: detailItem.location },
                  { icon: 'call-outline',           label: 'Contact',     value: detailItem.contactInfo },
                  { icon: 'person-outline',         label: 'Posted by',   value: detailItem.userName },
                  { icon: 'time-outline',           label: 'Date',        value: timeAgo(detailItem.createdAt) },
                ].map(row => (
                  <View key={row.label} style={s.detailRow}>
                    <Ionicons name={row.icon} size={18} color={COLORS.primary} style={{ width: 26 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.detailLabel}>{row.label}</Text>
                      <Text style={s.detailValue}>{row.value}</Text>
                    </View>
                  </View>
                ))}
                {detailItem.userId === userData.uid && detailItem.status === 'open' && (
                  <TouchableOpacity style={s.resolveBtn} onPress={() => handleMarkResolved(detailItem)}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={s.resolveBtnText}>Mark as Resolved</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.closeBtn} onPress={() => setDetailItem(null)}>
                  <Text style={s.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Post Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.postSheet}>
              <View style={s.detailHandle} />
              <Text style={s.sheetTitle}>Post Lost or Found Item</Text>

              {/* Lost / Found toggle */}
              <View style={s.toggleRow}>
                {['lost', 'found'].map(t => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setForm(f => ({ ...f, type: t }))}
                    style={[s.toggleBtn, form.type === t && { backgroundColor: t === 'lost' ? COLORS.lost : COLORS.found }]}
                  >
                    <Text style={[s.toggleText, form.type === t && { color: '#fff' }]}>
                      {t === 'lost' ? 'I Lost Something' : 'I Found Something'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.fieldLabel}>Item Title *</Text>
                <TextInput style={s.input} placeholder="e.g. Black umbrella" placeholderTextColor={COLORS.subtext}
                  value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} />

                <Text style={s.fieldLabel}>Description *</Text>
                <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Describe the item in detail..." placeholderTextColor={COLORS.subtext}
                  multiline value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} />

                <Text style={s.fieldLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}
                  contentContainerStyle={{ gap: 8 }}>
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <TouchableOpacity key={cat}
                      onPress={() => setForm(f => ({ ...f, category: cat }))}
                      style={[s.catChip, form.category === cat && s.catChipActive]}>
                      <Text style={[s.catChipText, form.category === cat && s.catChipTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={s.fieldLabel}>Location</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}
                  contentContainerStyle={{ gap: 8 }}>
                  {LOCATIONS.map(loc => (
                    <TouchableOpacity key={loc}
                      onPress={() => setForm(f => ({ ...f, location: loc }))}
                      style={[s.catChip, form.location === loc && s.catChipActive]}>
                      <Text style={[s.catChipText, form.location === loc && s.catChipTextActive]}>{loc}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={s.fieldLabel}>Contact Info *</Text>
                <TextInput style={s.input} placeholder="Phone / messenger / email" placeholderTextColor={COLORS.subtext}
                  value={form.contactInfo} onChangeText={v => setForm(f => ({ ...f, contactInfo: v }))} />

                <TouchableOpacity style={[s.submitBtn, { backgroundColor: form.type === 'lost' ? COLORS.lost : COLORS.found }]}
                  onPress={handleSubmit} disabled={submitting}>
                  {submitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.submitText}>Post {form.type === 'lost' ? 'Lost Item' : 'Found Item'}</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity style={s.closeBtn} onPress={() => setModalVisible(false)}>
                  <Text style={s.closeBtnText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.bg },
  header:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn:        { marginRight: 10 },
  headerTitle:    { fontFamily: 'Outfit-Bold', fontSize: 18, color: COLORS.text },
  headerSub:      { fontFamily: 'Outfit-Regular', fontSize: 13, color: COLORS.subtext },
  postBtn:        { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  postBtnText:    { fontFamily: 'Outfit-SemiBold', fontSize: 14, color: '#fff' },
  typeChip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: 'transparent' },
  typeChipActive: { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
  typeChipText:   { fontFamily: 'Outfit-SemiBold', fontSize: 13, color: COLORS.subtext },
  typeChipTextActive: { color: COLORS.primary },
  catChip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: 'transparent' },
  catChipActive:  { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
  catChipText:    { fontFamily: 'Outfit-Regular', fontSize: 12, color: COLORS.subtext },
  catChipTextActive: { color: COLORS.primary, fontFamily: 'Outfit-SemiBold' },
  itemCard:       { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  accentBar:      { width: 5 },
  typeBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  typeText:       { fontFamily: 'Outfit-Bold', fontSize: 10, letterSpacing: 0.5 },
  catTag:         { fontFamily: 'Outfit-Regular', fontSize: 12, color: COLORS.subtext },
  resolvedBadge:  { backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  resolvedText:   { fontFamily: 'Outfit-SemiBold', fontSize: 11, color: '#16a34a' },
  itemTitle:      { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: COLORS.text, marginTop: 2 },
  itemDesc:       { fontFamily: 'Outfit-Regular', fontSize: 13, color: COLORS.subtext, marginTop: 3 },
  itemMeta:       { fontFamily: 'Outfit-Regular', fontSize: 12, color: COLORS.subtext },
  emptyBox:       { alignItems: 'center', paddingVertical: 60 },
  emptyTitle:     { fontFamily: 'Outfit-Bold', fontSize: 18, color: COLORS.text, marginTop: 16 },
  emptySub:       { fontFamily: 'Outfit-Regular', fontSize: 14, color: COLORS.subtext, marginTop: 6 },
  // Modals
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  detailSheet:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  postSheet:      { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  detailHandle:   { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:     { fontFamily: 'Outfit-Bold', fontSize: 18, color: COLORS.text, marginBottom: 16 },
  detailRow:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 8 },
  detailLabel:    { fontFamily: 'Outfit-SemiBold', fontSize: 12, color: COLORS.subtext },
  detailValue:    { fontFamily: 'Outfit-Regular', fontSize: 14, color: COLORS.text, marginTop: 2 },
  toggleRow:      { flexDirection: 'row', gap: 10, marginBottom: 16 },
  toggleBtn:      { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  toggleText:     { fontFamily: 'Outfit-SemiBold', fontSize: 13, color: COLORS.text },
  fieldLabel:     { fontFamily: 'Outfit-SemiBold', fontSize: 13, color: COLORS.text, marginBottom: 6 },
  input:          { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontFamily: 'Outfit-Regular', fontSize: 14, color: COLORS.text, marginBottom: 14 },
  submitBtn:      { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  submitText:     { fontFamily: 'Outfit-Bold', fontSize: 15, color: '#fff' },
  resolveBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 12, marginBottom: 10 },
  resolveBtnText: { fontFamily: 'Outfit-SemiBold', fontSize: 14, color: '#fff' },
  closeBtn:       { borderRadius: 14, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f1f5f9', marginBottom: 4 },
  closeBtnText:   { fontFamily: 'Outfit-SemiBold', fontSize: 14, color: COLORS.subtext },
});
