import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Modal, TextInput,
  StatusBar, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  collection, addDoc, getDocs, query, where, orderBy,
  doc, updateDoc, serverTimestamp, getDoc, writeBatch, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { useUser } from './App';

const COLORS = {
  primary:  '#db2777',
  primaryBg:'#fdf2f8',
  surface:  '#ffffff',
  bg:       '#fdf0f7',
  text:     '#1a1a2e',
  subtext:  '#64748b',
  border:   '#e5e7eb',
  available:'#16a34a',
  borrowed: '#ef4444',
  reserved: '#f59e0b',
};

const GENRES = ['All', 'Science', 'Math', 'Literature', 'History', 'Technology', 'Philosophy', 'Reference'];

// Seed books — written to Firestore on first load if not present
const SEED_BOOKS = [
  { title: 'Introduction to Algorithms', author: 'Cormen et al.', genre: 'Technology', isbn: '978-0262033848', totalCopies: 3, availableCopies: 2, coverColor: '#2667ff', description: 'A comprehensive modern introduction to algorithms and data structures.' },
  { title: 'Calculus: Early Transcendentals', author: 'James Stewart', genre: 'Math', isbn: '978-1285741550', totalCopies: 5, availableCopies: 3, coverColor: '#16a34a', description: 'Standard calculus textbook used by universities worldwide.' },
  { title: 'Noli Me Tangere', author: 'Jose Rizal', genre: 'Literature', isbn: '978-9710817337', totalCopies: 8, availableCopies: 6, coverColor: '#d97706', description: 'The classic Filipino novel by our national hero, Jose Rizal.' },
  { title: 'El Filibusterismo', author: 'Jose Rizal', genre: 'Literature', isbn: '978-9710817344', totalCopies: 7, availableCopies: 5, coverColor: '#dc2626', description: 'Rizal\'s second novel, the sequel to Noli Me Tangere.' },
  { title: 'Brief History of Time', author: 'Stephen Hawking', genre: 'Science', isbn: '978-0553380163', totalCopies: 4, availableCopies: 1, coverColor: '#7c3aed', description: 'A landmark volume in science writing exploring our understanding of the universe.' },
  { title: 'The Republic', author: 'Plato', genre: 'Philosophy', isbn: '978-0872201361', totalCopies: 3, availableCopies: 3, coverColor: '#0891b2', description: 'Plato\'s investigation into the definition of justice and the ideal state.' },
  { title: 'Philippine History', author: 'Zaide & Zaide', genre: 'History', isbn: '978-9710809516', totalCopies: 6, availableCopies: 4, coverColor: '#ea580c', description: 'Comprehensive account of pre-colonial Philippines through modern times.' },
  { title: 'Chemistry: The Central Science', author: 'Brown et al.', genre: 'Science', isbn: '978-0134414232', totalCopies: 4, availableCopies: 2, coverColor: '#059669', description: 'The leading general chemistry textbook for science students.' },
  { title: 'Fundamentals of Physics', author: 'Halliday & Resnick', genre: 'Science', isbn: '978-1118230725', totalCopies: 5, availableCopies: 0, coverColor: '#b45309', description: 'Comprehensive physics textbook covering mechanics, thermodynamics, and electromagnetism.' },
  { title: 'Data Structures & Algorithms', author: 'Goodrich & Tamassia', genre: 'Technology', isbn: '978-1118771334', totalCopies: 3, availableCopies: 2, coverColor: '#6d28d9', description: 'In-depth coverage of data structures and algorithm design and analysis.' },
];

function dueDateStr(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function LibraryScreen({ navigation }) {
  const { user: userData } = useUser();
  const [books, setBooks]     = useState([]);
  const [loans, setLoans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]          = useState('browse'); // browse | myloans
  const [genre, setGenre]      = useState('All');
  const [search, setSearch]    = useState('');
  const [selected, setSelected] = useState(null); // book detail modal
  const [reserving, setReserving] = useState(false);

  const ensureSeedBooks = async () => {
    const snap = await getDocs(collection(db, 'libraryBooks'));
    if (snap.empty) {
      const batch = writeBatch(db);
      SEED_BOOKS.forEach(book => {
        const ref = doc(collection(db, 'libraryBooks'));
        batch.set(ref, { ...book, createdAt: serverTimestamp() });
      });
      await batch.commit();
    }
  };

  const loadData = useCallback(async () => {
    try {
      await ensureSeedBooks();
      const [booksSnap, loansSnap] = await Promise.all([
        getDocs(query(collection(db, 'libraryBooks'), orderBy('title'))),
        getDocs(query(collection(db, 'libraryLoans'), where('userId', '==', userData.uid), orderBy('createdAt', 'desc'))),
      ]);
      setBooks(booksSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoans(loansSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('loadData error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData.uid]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReserve = async (book) => {
    const active = loans.find(l => l.bookId === book.id && l.status !== 'returned');
    if (active) {
      Alert.alert('Already Reserved', `You already have an active loan/reservation for "${book.title}".`);
      return;
    }
    if (book.availableCopies <= 0) {
      Alert.alert('Unavailable', 'No copies are available right now. Please check back later.');
      return;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7-day loan

    Alert.alert(
      'Reserve Book',
      `Book: ${book.title}\nBy: ${book.author}\nDue Date: ${dueDateStr({ toDate: () => dueDate })}\n\nPick up your reserved copy at the library within 24 hours.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reserve',
          onPress: async () => {
            setReserving(true);
            try {
              const batch = writeBatch(db);
              // Add loan record
              const loanRef = doc(collection(db, 'libraryLoans'));
              batch.set(loanRef, {
                userId:    userData.uid,
                userName:  userData.displayName || 'Student',
                userEmail: userData.email || '',
                bookId:    book.id,
                bookTitle: book.title,
                bookAuthor:book.author,
                status:    'reserved',
                reservedAt: serverTimestamp(),
                dueDate:   Timestamp.fromDate(dueDate),
                createdAt: serverTimestamp(),
              });
              // Decrement available copies
              const bookRef = doc(db, 'libraryBooks', book.id);
              batch.update(bookRef, { availableCopies: book.availableCopies - 1 });
              await batch.commit();
              setSelected(null);
              Alert.alert('Reserved! 📚', `"${book.title}" has been reserved for you. Please pick it up at the library within 24 hours. Due date: ${dueDateStr({ toDate: () => dueDate })}`);
              await loadData();
            } catch (e) {
              Alert.alert('Error', 'Could not complete reservation. Please try again.');
            } finally {
              setReserving(false);
            }
          }
        }
      ]
    );
  };

  const handleReturn = async (loan) => {
    Alert.alert(
      'Return Book',
      `Confirm return of "${loan.bookTitle}"?\n\nPlease bring the book to the library desk.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Return',
          onPress: async () => {
            try {
              const batch = writeBatch(db);
              batch.update(doc(db, 'libraryLoans', loan.id), {
                status: 'returned',
                returnedAt: serverTimestamp(),
              });
              // Restore available copy
              const bookSnap = await getDoc(doc(db, 'libraryBooks', loan.bookId));
              if (bookSnap.exists()) {
                batch.update(doc(db, 'libraryBooks', loan.bookId), {
                  availableCopies: (bookSnap.data().availableCopies || 0) + 1,
                });
              }
              await batch.commit();
              Alert.alert('Returned!', 'Thank you for returning the book on time.');
              await loadData();
            } catch (e) {
              Alert.alert('Error', 'Could not process return. Please try again.');
            }
          }
        }
      ]
    );
  };

  const filteredBooks = books.filter(b => {
    const matchGenre  = genre === 'All' || b.genre === genre;
    const matchSearch = !search.trim() ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase());
    return matchGenre && matchSearch;
  });

  const activeLoans   = loans.filter(l => l.status !== 'returned');
  const returnedLoans = loans.filter(l => l.status === 'returned');

  const availabilityColor = (b) =>
    b.availableCopies >= 2 ? COLORS.available :
    b.availableCopies === 1 ? COLORS.reserved :
    COLORS.borrowed;

  const availabilityLabel = (b) =>
    b.availableCopies > 0 ? `${b.availableCopies} of ${b.totalCopies} available` : 'All borrowed';

  const loanStatusColor = (status) =>
    status === 'reserved' ? COLORS.reserved :
    status === 'borrowed' ? COLORS.primary :
    COLORS.available;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Library</Text>
          <Text style={s.headerSub}>{books.length} books in catalog</Text>
        </View>
        <Ionicons name="book-outline" size={26} color={COLORS.primary} />
      </View>

      {/* Search bar */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.subtext} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by title or author..."
          placeholderTextColor={COLORS.subtext}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.subtext} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {[
          { key: 'browse',  label: 'Browse' },
          { key: 'myloans', label: `My Loans${activeLoans.length > 0 ? ` (${activeLoans.length})` : ''}` },
        ].map(t => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[s.tabItem, tab === t.key && s.tabActive]}>
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} size="large" />
      ) : tab === 'browse' ? (
        <>
          {/* Genre filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
            style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border }}
          >
            {GENRES.map(g => (
              <TouchableOpacity key={g} onPress={() => setGenre(g)}
                style={[s.genreChip, genre === g && s.genreChipActive]}>
                <Text style={[s.genreText, genre === g && s.genreTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={filteredBooks}
            keyExtractor={b => b.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
            ListEmptyComponent={
              <View style={s.emptyBox}>
                <Ionicons name="book-outline" size={52} color={COLORS.subtext} />
                <Text style={s.emptyTitle}>No books found</Text>
                <Text style={s.emptySub}>Try a different search or genre.</Text>
              </View>
            }
            renderItem={({ item: book }) => {
              const hasActiveLoan = loans.some(l => l.bookId === book.id && l.status !== 'returned');
              return (
                <TouchableOpacity style={s.bookCard} onPress={() => setSelected(book)}>
                  {/* Color "cover" */}
                  <View style={[s.bookCover, { backgroundColor: book.coverColor }]}>
                    <Ionicons name="book" size={22} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bookTitle} numberOfLines={2}>{book.title}</Text>
                    <Text style={s.bookAuthor}>{book.author}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <View style={s.genreTag}>
                        <Text style={s.genreTagText}>{book.genre}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={[s.availDot, { backgroundColor: availabilityColor(book) }]} />
                        <Text style={[s.availText, { color: availabilityColor(book) }]}>
                          {availabilityLabel(book)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {hasActiveLoan ? (
                    <View style={s.reservedTag}>
                      <Text style={s.reservedTagText}>Reserved</Text>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={COLORS.subtext} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        >
          {loans.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="bookmark-outline" size={52} color={COLORS.subtext} />
              <Text style={s.emptyTitle}>No loans yet</Text>
              <Text style={s.emptySub}>Browse the catalog to reserve a book.</Text>
            </View>
          ) : (
            <>
              {activeLoans.length > 0 && (
                <>
                  <Text style={s.sectionHead}>Active Loans</Text>
                  {activeLoans.map(loan => (
                    <View key={loan.id} style={s.loanCard}>
                      <View style={[s.loanAccent, { backgroundColor: loanStatusColor(loan.status) }]} />
                      <View style={{ flex: 1, paddingLeft: 12 }}>
                        <Text style={s.loanTitle}>{loan.bookTitle}</Text>
                        <Text style={s.loanAuthor}>{loan.bookAuthor}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                          <View style={[s.statusBadge, { backgroundColor: loanStatusColor(loan.status) + '20' }]}>
                            <Text style={[s.statusText, { color: loanStatusColor(loan.status) }]}>
                              {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                            </Text>
                          </View>
                          {loan.dueDate && (
                            <Text style={s.dueText}>Due: {dueDateStr(loan.dueDate)}</Text>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity style={s.returnBtn} onPress={() => handleReturn(loan)}>
                        <Text style={s.returnBtnText}>Return</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}
              {returnedLoans.length > 0 && (
                <>
                  <Text style={[s.sectionHead, { marginTop: 20 }]}>History</Text>
                  {returnedLoans.map(loan => (
                    <View key={loan.id} style={s.loanCard}>
                      <View style={[s.loanAccent, { backgroundColor: '#9ca3af' }]} />
                      <View style={{ flex: 1, paddingLeft: 12 }}>
                        <Text style={s.loanTitle}>{loan.bookTitle}</Text>
                        <Text style={s.loanAuthor}>{loan.bookAuthor}</Text>
                        <View style={[s.statusBadge, { backgroundColor: '#f1f5f9', marginTop: 6, alignSelf: 'flex-start' }]}>
                          <Text style={[s.statusText, { color: COLORS.subtext }]}>Returned</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Book Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={s.modalOverlay}>
          <View style={s.detailSheet}>
            <View style={s.detailHandle} />
            {selected && (
              <ScrollView>
                {/* Cover banner */}
                <View style={[s.coverBanner, { backgroundColor: selected.coverColor }]}>
                  <Ionicons name="book" size={40} color="#fff" />
                  <Text style={s.bannerTitle}>{selected.title}</Text>
                  <Text style={s.bannerAuthor}>{selected.author}</Text>
                </View>

                {[
                  { icon: 'document-text-outline', label: 'Description', value: selected.description },
                  { icon: 'pricetag-outline',       label: 'Genre',       value: selected.genre },
                  { icon: 'barcode-outline',        label: 'ISBN',        value: selected.isbn },
                  { icon: 'copy-outline',           label: 'Copies',      value: `${selected.availableCopies} of ${selected.totalCopies} available` },
                ].map(row => (
                  <View key={row.label} style={s.detailRow}>
                    <Ionicons name={row.icon} size={18} color={COLORS.primary} style={{ width: 26 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.detailLabel}>{row.label}</Text>
                      <Text style={s.detailValue}>{row.value}</Text>
                    </View>
                  </View>
                ))}

                {/* Availability indicator */}
                <View style={[s.availBar, { backgroundColor: availabilityColor(selected) + '18' }]}>
                  <View style={[s.availDot, { backgroundColor: availabilityColor(selected), width: 10, height: 10 }]} />
                  <Text style={[s.availText, { color: availabilityColor(selected), fontSize: 14 }]}>
                    {selected.availableCopies > 0
                      ? `Available – Pick up at the library`
                      : `All copies currently borrowed`}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[s.reserveBtn, { opacity: selected.availableCopies > 0 ? 1 : 0.5 }]}
                  onPress={() => handleReserve(selected)}
                  disabled={reserving || selected.availableCopies <= 0}
                >
                  {reserving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                        <Ionicons name="bookmark-outline" size={18} color="#fff" />
                        <Text style={s.reserveBtnText}>
                          {selected.availableCopies > 0 ? 'Reserve This Book' : 'Not Available'}
                        </Text>
                      </>
                  }
                </TouchableOpacity>
                <TouchableOpacity style={s.closeBtn} onPress={() => setSelected(null)}>
                  <Text style={s.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
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
  searchRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchInput:    { flex: 1, fontFamily: 'Outfit-Regular', fontSize: 14, color: COLORS.text, padding: 0 },
  tabRow:         { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabItem:        { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:      { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText:        { fontFamily: 'Outfit-SemiBold', fontSize: 14, color: COLORS.subtext },
  tabTextActive:  { color: COLORS.primary },
  genreChip:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: 'transparent' },
  genreChipActive:{ backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
  genreText:      { fontFamily: 'Outfit-Regular', fontSize: 13, color: COLORS.subtext },
  genreTextActive:{ color: COLORS.primary, fontFamily: 'Outfit-SemiBold' },
  bookCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, gap: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  bookCover:      { width: 48, height: 60, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bookTitle:      { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: COLORS.text },
  bookAuthor:     { fontFamily: 'Outfit-Regular', fontSize: 13, color: COLORS.subtext, marginTop: 2 },
  genreTag:       { backgroundColor: COLORS.primaryBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  genreTagText:   { fontFamily: 'Outfit-Regular', fontSize: 11, color: COLORS.primary },
  availDot:       { width: 8, height: 8, borderRadius: 4 },
  availText:      { fontFamily: 'Outfit-Regular', fontSize: 12 },
  reservedTag:    { backgroundColor: COLORS.reserved + '20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  reservedTagText:{ fontFamily: 'Outfit-SemiBold', fontSize: 11, color: COLORS.reserved },
  sectionHead:    { fontFamily: 'Outfit-Bold', fontSize: 14, color: COLORS.subtext, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  loanCard:       { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  loanAccent:     { width: 5 },
  loanTitle:      { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: COLORS.text },
  loanAuthor:     { fontFamily: 'Outfit-Regular', fontSize: 13, color: COLORS.subtext, marginTop: 2 },
  statusBadge:    { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  statusText:     { fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  dueText:        { fontFamily: 'Outfit-Regular', fontSize: 12, color: COLORS.subtext },
  returnBtn:      { margin: 12, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.primary, borderRadius: 20, alignSelf: 'center' },
  returnBtnText:  { fontFamily: 'Outfit-SemiBold', fontSize: 13, color: '#fff' },
  emptyBox:       { alignItems: 'center', paddingVertical: 60 },
  emptyTitle:     { fontFamily: 'Outfit-Bold', fontSize: 18, color: COLORS.text, marginTop: 16 },
  emptySub:       { fontFamily: 'Outfit-Regular', fontSize: 14, color: COLORS.subtext, marginTop: 6 },
  // Modal
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  detailSheet:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
  detailHandle:   { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  coverBanner:    { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 },
  bannerTitle:    { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff', marginTop: 10, textAlign: 'center' },
  bannerAuthor:   { fontFamily: 'Outfit-Regular', fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  detailRow:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 8 },
  detailLabel:    { fontFamily: 'Outfit-SemiBold', fontSize: 12, color: COLORS.subtext },
  detailValue:    { fontFamily: 'Outfit-Regular', fontSize: 14, color: COLORS.text, marginTop: 2 },
  availBar:       { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginBottom: 16 },
  reserveBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, marginBottom: 10 },
  reserveBtnText: { fontFamily: 'Outfit-Bold', fontSize: 15, color: '#fff' },
  closeBtn:       { borderRadius: 14, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f1f5f9', marginBottom: 4 },
  closeBtnText:   { fontFamily: 'Outfit-SemiBold', fontSize: 14, color: COLORS.subtext },
});
