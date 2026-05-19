// MyReportsScreen.js â€” Personal report history with live status timeline
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { useUser } from './App';
import { useTheme } from './contexts/ThemeContext';

// â”€â”€ Status pipeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATUS_STEPS = [
  {
    key: 'submitted',
    label: 'Submitted',
    icon: 'checkmark-circle-outline',
    activeIcon: 'checkmark-circle',
    color: '#2667ff',
  },
  {
    key: 'acknowledged',
    label: 'Acknowledged',
    icon: 'eye-outline',
    activeIcon: 'eye',
    color: '#ff9500',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    icon: 'construct-outline',
    activeIcon: 'construct',
    color: '#5856d6',
  },
  {
    key: 'resolved',
    label: 'Resolved',
    icon: 'shield-checkmark-outline',
    activeIcon: 'shield-checkmark',
    color: '#34c759',
  },
];

const getActiveStep = (status) => {
  if (!status || status === 'pending') return 0;
  if (status === 'acknowledged') return 1;
  if (status === 'in_progress') return 2;
  if (status === 'resolved') return 3;
  return 0; // rejected / flagged_false handled separately
};

const isRejected = (status) =>
  status === 'rejected' || status === 'flagged_false';

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PRIORITY_COLORS = {
  critical: '#ff3b30',
  high: '#ff9500',
  medium: '#007aff',
  low: '#34c759',
};

const CATEGORY_ICONS = {
  academic: 'school-outline',
  infrastructure: 'construct-outline',
  food: 'restaurant-outline',
  it: 'laptop-outline',
  facilities: 'business-outline',
};

const priorityColor = (p) => PRIORITY_COLORS[p] || '#007aff';
const categoryIcon = (c) => CATEGORY_ICONS[c] || 'flag-outline';

const formatDate = (ts) => {
  if (!ts) return 'Unknown';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Unknown';
  }
};

const STATUS_LABELS = {
  pending: 'Pending',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
  flagged_false: 'Flagged as False',
};

// â”€â”€ Status Timeline Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatusTimeline({ status }) {
  const rejected = isRejected(status);
  const activeStep = getActiveStep(status);

  if (rejected) {
    return (
      <View style={tl.container}>
        <View style={[tl.rejectedBadge]}>
          <Ionicons name="close-circle" size={16} color="#ff3b30" />
          <Text style={tl.rejectedText}>
            {status === 'flagged_false' ? 'Flagged as False Report' : 'Rejected'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={tl.container}>
      {STATUS_STEPS.map((step, i) => {
        const done = i <= activeStep;
        const isCurrent = i === activeStep;

        return (
          <React.Fragment key={step.key}>
            {/* Connector line between steps */}
            {i > 0 && (
              <View
                style={[
                  tl.line,
                  { backgroundColor: i <= activeStep ? STATUS_STEPS[i].color : '#e0e0e0' },
                ]}
              />
            )}

            <View style={tl.step}>
              {/* Circle icon */}
              <View
                style={[
                  tl.circle,
                  {
                    borderColor: done ? step.color : '#d0d0d0',
                    backgroundColor: done ? step.color : '#fff',
                  },
                  isCurrent && tl.circlePulse,
                ]}
              >
                <Ionicons
                  name={done ? step.activeIcon : step.icon}
                  size={14}
                  color={done ? '#fff' : '#ccc'}
                />
              </View>
              {/* Label */}
              <Text
                style={[
                  tl.label,
                  { color: done ? step.color : '#aaa', fontWeight: isCurrent ? '700' : '400' },
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const tl = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 2,
    flexWrap: 'nowrap',
  },
  step: {
    alignItems: 'center',
    width: 60,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  circlePulse: {
    shadowColor: '#2667ff',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  line: {
    flex: 1,
    height: 2,
    marginBottom: 20,
    minWidth: 8,
  },
  label: {
    fontSize: 9,
    textAlign: 'center',
    fontFamily: 'Outfit-Regular',
  },
  rejectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff0ee',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rejectedText: {
    color: '#ff3b30',
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    marginLeft: 5,
  },
});

// â”€â”€ Report Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ReportCard({ report, colors, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(report)}
      style={[
        card.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {/* Top row: icon + title + priority */}
      <View style={card.topRow}>
        <View
          style={[
            card.catIcon,
            { backgroundColor: priorityColor(report.priority) + '18' },
          ]}
        >
          <Ionicons
            name={categoryIcon(report.category)}
            size={18}
            color={priorityColor(report.priority)}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            style={[card.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {report.title || 'Untitled Report'}
          </Text>
          <Text style={[card.meta, { color: colors.textSecondary }]}>
            {formatDate(report.createdAt)} Â·{' '}
            <Text style={{ textTransform: 'capitalize' }}>
              {report.category || 'other'}
            </Text>
          </Text>
        </View>
        <View
          style={[
            card.priorityDot,
            { backgroundColor: priorityColor(report.priority) },
          ]}
        />
      </View>

      {/* Description snippet */}
      <Text
        style={[card.description, { color: colors.textSecondary }]}
        numberOfLines={2}
      >
        {report.description || 'No description.'}
      </Text>

      {/* Status timeline */}
      <StatusTimeline status={report.status} />

      {/* Footer: status label + anonymous badge */}
      <View style={card.footer}>
        <View
          style={[
            card.statusBadge,
            {
              backgroundColor: isRejected(report.status)
                ? '#ff3b3015'
                : report.status === 'resolved'
                ? '#34c75915'
                : '#2667ff15',
            },
          ]}
        >
          <Text
            style={[
              card.statusText,
              {
                color: isRejected(report.status)
                  ? '#ff3b30'
                  : report.status === 'resolved'
                  ? '#34c759'
                  : '#2667ff',
              },
            ]}
          >
            {STATUS_LABELS[report.status] || 'Pending'}
          </Text>
        </View>
        {report.anonymous && (
          <View style={card.anonBadge}>
            <Ionicons name="eye-off-outline" size={11} color="#888" />
            <Text style={card.anonText}>Anonymous</Text>
          </View>
        )}
        {report.priority === 'critical' && (
          <View style={[card.anonBadge, { backgroundColor: '#ff3b3015' }]}>
            <Ionicons name="alert-circle" size={11} color="#ff3b30" />
            <Text style={[card.anonText, { color: '#ff3b30' }]}>Critical</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    marginTop: 1,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  description: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    lineHeight: 18,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
  },
  anonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  anonText: {
    fontSize: 11,
    color: '#888',
    fontFamily: 'Outfit-Regular',
  },
});

// â”€â”€ Detail Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ReportDetailModal({ report, visible, onClose, colors }) {
  if (!report) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[dm.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[dm.header, { borderBottomColor: colors.border }]}>
          <Text style={[dm.headerTitle, { color: colors.text }]}>
            Report Details
          </Text>
          <TouchableOpacity onPress={onClose} style={dm.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={dm.content}>
          {/* Title + badges */}
          <Text style={[dm.title, { color: colors.text }]}>
            {report.title || 'Untitled'}
          </Text>
          <View style={dm.badgeRow}>
            <View
              style={[
                dm.badge,
                { backgroundColor: priorityColor(report.priority) + '20' },
              ]}
            >
              <Text
                style={[dm.badgeText, { color: priorityColor(report.priority) }]}
              >
                {(report.priority || 'medium').toUpperCase()} PRIORITY
              </Text>
            </View>
            <View style={[dm.badge, { backgroundColor: '#f5f5f5' }]}>
              <Text style={[dm.badgeText, { color: '#666' }]}>
                {(report.category || 'other').toUpperCase()}
              </Text>
            </View>
            {report.anonymous && (
              <View style={[dm.badge, { backgroundColor: '#fff3cd' }]}>
                <Ionicons
                  name="eye-off-outline"
                  size={12}
                  color="#856404"
                  style={{ marginRight: 3 }}
                />
                <Text style={[dm.badgeText, { color: '#856404' }]}>
                  ANONYMOUS
                </Text>
              </View>
            )}
          </View>

          {/* Status pipeline */}
          <View style={[dm.section, { borderColor: colors.border }]}>
            <Text style={[dm.sectionTitle, { color: colors.text }]}>
              📋 Status Timeline
            </Text>
            <StatusTimeline status={report.status} />
            <Text style={[dm.currentStatus, { color: colors.textSecondary }]}>
              Current status:{' '}
              <Text style={{ fontFamily: 'Outfit-Bold', color: colors.text }}>
                {STATUS_LABELS[report.status] || 'Pending'}
              </Text>
            </Text>
          </View>

          {/* Description */}
          <View style={[dm.section, { borderColor: colors.border }]}>
            <Text style={[dm.sectionTitle, { color: colors.text }]}>
              📝 Description
            </Text>
            <Text style={[dm.body, { color: colors.textSecondary }]}>
              {report.description || 'No description provided.'}
            </Text>
          </View>

          {/* Location */}
          {(report.location?.building || report.location?.room) && (
            <View style={[dm.section, { borderColor: colors.border }]}>
              <Text style={[dm.sectionTitle, { color: colors.text }]}>
                📍 Location
              </Text>
              <Text style={[dm.body, { color: colors.textSecondary }]}>
                {[report.location.building, report.location.room]
                  .filter(Boolean)
                  .join(' â€” ')}
              </Text>
            </View>
          )}

          {/* Dates */}
          <View style={[dm.section, { borderColor: colors.border }]}>
            <Text style={[dm.sectionTitle, { color: colors.text }]}>
              🗓 Submitted
            </Text>
            <Text style={[dm.body, { color: colors.textSecondary }]}>
              {formatDate(report.createdAt)}
            </Text>
          </View>

          {/* Affected count */}
          {(report.affectedCount || 0) > 0 && (
            <View style={[dm.section, { borderColor: colors.border }]}>
              <Text style={[dm.sectionTitle, { color: colors.text }]}>
                🙋 Community Impact
              </Text>
              <Text style={[dm.body, { color: colors.textSecondary }]}>
                <Text
                  style={{ fontFamily: 'Outfit-Bold', color: '#2667ff' }}
                >
                  {report.affectedCount}
                </Text>{' '}
                other{report.affectedCount !== 1 ? 's' : ''} also affected by
                this issue.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
  },
  closeBtn: { padding: 4 },
  content: { padding: 20, paddingBottom: 60 },
  title: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    marginBottom: 10,
    lineHeight: 26,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Outfit-Bold',
    letterSpacing: 0.5,
  },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Outfit-Bold',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    lineHeight: 20,
  },
  currentStatus: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    marginTop: 10,
  },
});

// â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function MyReportsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user: userData } = useUser();
  const { colors } = useTheme() || {};

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [filter, setFilter] = useState('all'); // all | pending | in_progress | resolved | rejected

  useEffect(() => {
    if (!userData?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'reports'),
      where('userId', '==', userData.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.warn('MyReports snapshot error:', err);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsub();
  }, [userData?.uid]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // The snapshot listener will update automatically; just reset after a bit
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const filteredReports = reports.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'rejected') return isRejected(r.status);
    return r.status === filter || (filter === 'pending' && (!r.status || r.status === 'pending'));
  });

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  // Stats
  const stats = {
    total: reports.length,
    pending: reports.filter((r) => !r.status || r.status === 'pending').length,
    inProgress: reports.filter((r) => r.status === 'in_progress').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
    rejected: reports.filter((r) => isRejected(r.status)).length,
  };

  if (loading) {
    return (
      <View
        style={[
          ss.container,
          {
            backgroundColor: colors?.background || '#fff',
            paddingTop: insets.top,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <ActivityIndicator size="large" color="#2667ff" />
        <Text style={{ color: colors?.textSecondary || '#888', marginTop: 12, fontFamily: 'Outfit-Regular' }}>
          Loading your reportsâ€¦
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        ss.container,
        { backgroundColor: colors?.background || '#fff', paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View
        style={[
          ss.header,
          {
            backgroundColor: colors?.surface || '#fff',
            borderBottomColor: colors?.border || '#f0f0f0',
          },
        ]}
      >
        <TouchableOpacity style={ss.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors?.text || '#000'} />
        </TouchableOpacity>
        <Text style={[ss.headerTitle, { color: colors?.text || '#000' }]}>
          My Reports
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ss.statsRow}
      >
        {[
          { label: 'Total', value: stats.total, color: '#2667ff' },
          { label: 'Pending', value: stats.pending, color: '#ff9500' },
          { label: 'In Progress', value: stats.inProgress, color: '#5856d6' },
          { label: 'Resolved', value: stats.resolved, color: '#34c759' },
          { label: 'Rejected', value: stats.rejected, color: '#ff3b30' },
        ].map((s) => (
          <TouchableOpacity
            key={s.label}
            onPress={() =>
              setFilter(
                s.label === 'Total' ? 'all' : s.label.toLowerCase().replace(' ', '_')
              )
            }
            style={[
              ss.statCard,
              { borderColor: s.color + '40', backgroundColor: s.color + '10' },
            ]}
          >
            <Text style={[ss.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[ss.statLabel, { color: s.color }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ss.filterRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              ss.filterChip,
              filter === f.key && ss.filterChipActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                ss.filterChipText,
                filter === f.key && ss.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Report list */}
      <ScrollView
        contentContainerStyle={ss.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2667ff']}
            tintColor="#2667ff"
          />
        }
      >
        {filteredReports.length === 0 ? (
          <View style={ss.empty}>
            <Ionicons name="document-text-outline" size={64} color="#d0d0d0" />
            <Text style={[ss.emptyTitle, { color: colors?.text || '#333' }]}>
              {filter === 'all' ? 'No reports yet' : `No ${filter.replace('_', ' ')} reports`}
            </Text>
            <Text style={[ss.emptyDesc, { color: colors?.textSecondary || '#888' }]}>
              {filter === 'all'
                ? 'Submit your first report to track it here.'
                : 'Try a different filter.'}
            </Text>
          </View>
        ) : (
          filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              colors={colors || { card: '#fff', border: '#eee', text: '#000', textSecondary: '#888' }}
              onPress={(r) => {
                setSelectedReport(r);
                setDetailVisible(true);
              }}
            />
          ))
        )}
      </ScrollView>

      {/* Detail Modal */}
      <ReportDetailModal
        report={selectedReport}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        colors={colors || { background: '#fff', border: '#eee', text: '#000', textSecondary: '#888' }}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-Bold' },
  statsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  statCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 70,
  },
  statValue: { fontSize: 22, fontFamily: 'Outfit-Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Outfit-Regular', marginTop: 2 },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    backgroundColor: '#fff',
  },
  filterChipActive: {
    borderColor: '#2667ff',
    backgroundColor: '#2667ff',
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
    fontFamily: 'Outfit-Bold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 100,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
