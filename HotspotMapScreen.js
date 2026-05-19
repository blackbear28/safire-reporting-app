import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from './firebase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH - 32;
const MAP_HEIGHT = 360;

// ─── Campus building positions on the virtual map ────────────────────────────
const BUILDINGS = [
  { id: 'Administration',   label: 'Admin',       short: 'ADM', x: 0.15, y: 0.14, icon: 'business' },
  { id: 'Main Building',    label: 'Main Bldg',   short: 'MAIN', x: 0.38, y: 0.32, icon: 'school' },
  { id: 'CAS Building',     label: 'CAS',         short: 'CAS', x: 0.70, y: 0.44, icon: 'library-books' },
  { id: 'Library Building', label: 'Library',     short: 'LIB', x: 0.75, y: 0.72, icon: 'menu-book' },
  { id: 'Student Center',   label: 'Stdnt Ctr',   short: 'SC',  x: 0.38, y: 0.72, icon: 'people' },
  { id: 'Gymnasium',        label: 'Gym',         short: 'GYM', x: 0.12, y: 0.78, icon: 'fitness-center' },
  { id: 'Cafeteria',        label: 'Cafeteria',   short: 'CAF', x: 0.55, y: 0.20, icon: 'restaurant' },
];

// ─── Intensity → color + label ───────────────────────────────────────────────
const getIntensityStyle = (score) => {
  if (score === 0)  return { color: '#9ca3af', label: 'None',     bg: '#f3f4f6' };
  if (score <= 3)   return { color: '#22c55e', label: 'Low',      bg: '#dcfce7' };
  if (score <= 8)   return { color: '#f59e0b', label: 'Moderate', bg: '#fef3c7' };
  if (score <= 15)  return { color: '#f97316', label: 'High',     bg: '#ffedd5' };
  return              { color: '#ef4444', label: 'Critical',  bg: '#fee2e2' };
};

// ─── Category colours ─────────────────────────────────────────────────────────
const CAT_COLOR = {
  academic:       '#6366f1',
  infrastructure: '#f97316',
  food:           '#22c55e',
  it:             '#06b6d4',
  facilities:     '#8b5cf6',
  security:       '#ef4444',
  other:          '#94a3b8',
};

const PRIORITY_WEIGHT = { critical: 4, high: 2, medium: 1, low: 0.5 };

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HotspotMapScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('month'); // week | month | all
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const pulseAnims = useRef(BUILDINGS.map(() => new Animated.Value(1))).current;

  // ── Live data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'reports')), (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── Pulse animation for high-risk buildings ────────────────────────────────
  useEffect(() => {
    pulseAnims.forEach((anim, i) => {
      const score = getBuildingScore(BUILDINGS[i].id);
      if (score > 8) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1.25, duration: 700, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
          ])
        ).start();
      } else {
        anim.setValue(1);
      }
    });
  }, [reports, timeFilter, selectedCategory]);

  // ── Filter reports by time + category ─────────────────────────────────────
  const filteredReports = useCallback(() => {
    const now = Date.now();
    const cutoff = timeFilter === 'week'  ? now - 7  * 86400000
                 : timeFilter === 'month' ? now - 30 * 86400000
                 : 0;
    return reports.filter(r => {
      const ts = r.createdAt?.toDate ? r.createdAt.toDate().getTime() : 0;
      const inTime = cutoff === 0 || ts >= cutoff;
      const inCat  = selectedCategory === 'all' || r.category === selectedCategory;
      return inTime && inCat;
    });
  }, [reports, timeFilter, selectedCategory]);

  // ── Score per building ─────────────────────────────────────────────────────
  const getBuildingScore = useCallback((buildingId) => {
    return filteredReports()
      .filter(r => r.location?.building === buildingId)
      .reduce((sum, r) => sum + (PRIORITY_WEIGHT[r.priority] || 1), 0);
  }, [filteredReports]);

  // ── Predictive score (next 7 days estimate) ────────────────────────────────
  const getPredictedScore = useCallback((buildingId) => {
    const recentCutoff = Date.now() - 14 * 86400000;
    const recent = reports.filter(r => {
      const ts = r.createdAt?.toDate ? r.createdAt.toDate().getTime() : 0;
      return r.location?.building === buildingId && ts >= recentCutoff;
    });
    const recentScore = recent.reduce((s, r) => s + (PRIORITY_WEIGHT[r.priority] || 1), 0);
    return Math.round(recentScore / 2); // avg per 7-day window
  }, [reports]);

  // ── Category breakdown for a building ─────────────────────────────────────
  const getBuildingCategories = useCallback((buildingId) => {
    const counts = {};
    filteredReports()
      .filter(r => r.location?.building === buildingId)
      .forEach(r => {
        const cat = r.category || 'other';
        counts[cat] = (counts[cat] || 0) + 1;
      });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredReports]);

  // ── Overall stats ──────────────────────────────────────────────────────────
  const totalFiltered  = filteredReports().length;
  const hottest        = BUILDINGS.reduce((best, b) =>
    getBuildingScore(b.id) > getBuildingScore(best.id) ? b : best, BUILDINGS[0]);
  const hottestScore   = getBuildingScore(hottest.id);

  const TIME_TABS = [
    { key: 'week',  label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all',   label: 'All Time' },
  ];
  const CAT_TABS = ['all', 'academic', 'infrastructure', 'facilities', 'food', 'it', 'security'];

  const selectedBuildingData = selectedBuilding
    ? BUILDINGS.find(b => b.id === selectedBuilding) : null;

  return (
    <SafeAreaView style={[hStyles.safe, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1e2230" />

      {/* ── Header ── */}
      <View style={hStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={hStyles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={hStyles.headerTitle}>Incident Hotspot Map</Text>
          <Text style={hStyles.headerSub}>Predictive campus risk analysis</Text>
        </View>
        <View style={hStyles.livePill}>
          <View style={hStyles.liveDot} />
          <Text style={hStyles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Summary Cards ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={hStyles.statsRow}>
          <View style={hStyles.statCard}>
            <Text style={hStyles.statNum}>{totalFiltered}</Text>
            <Text style={hStyles.statLabel}>Reports</Text>
          </View>
          <View style={[hStyles.statCard, { borderLeftColor: '#ef4444' }]}>
            <Text style={[hStyles.statNum, { color: '#ef4444' }]}>{hottest.label}</Text>
            <Text style={hStyles.statLabel}>Hottest Zone</Text>
          </View>
          <View style={[hStyles.statCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={[hStyles.statNum, { color: '#f59e0b' }]}>{hottestScore}</Text>
            <Text style={hStyles.statLabel}>Risk Score</Text>
          </View>
          <View style={[hStyles.statCard, { borderLeftColor: '#6366f1' }]}>
            <Text style={[hStyles.statNum, { color: '#6366f1' }]}>
              {getPredictedScore(hottest.id)}
            </Text>
            <Text style={hStyles.statLabel}>Next 7-Day Est.</Text>
          </View>
        </ScrollView>

        {/* ── Time Filter ── */}
        <View style={hStyles.filterRow}>
          {TIME_TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[hStyles.filterChip, timeFilter === t.key && hStyles.filterChipActive]}
              onPress={() => setTimeFilter(t.key)}
            >
              <Text style={[hStyles.filterChipText, timeFilter === t.key && hStyles.filterChipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Category Filter ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={hStyles.catRow}>
          {CAT_TABS.map(c => (
            <TouchableOpacity
              key={c}
              style={[
                hStyles.catChip,
                { borderColor: c === 'all' ? '#6366f1' : (CAT_COLOR[c] || '#9ca3af') },
                selectedCategory === c && {
                  backgroundColor: c === 'all' ? '#6366f1' : (CAT_COLOR[c] || '#9ca3af'),
                },
              ]}
              onPress={() => setSelectedCategory(c)}
            >
              <Text style={[
                hStyles.catChipText,
                selectedCategory === c && { color: '#fff' },
              ]}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Campus Bubble Map ── */}
        <View style={hStyles.mapContainer}>
          <Text style={hStyles.mapLabel}>Campus Risk Map — tap a zone to inspect</Text>

          {loading ? (
            <View style={hStyles.mapCanvas}>
              <ActivityIndicator color="#6366f1" size="large" />
            </View>
          ) : (
            <View style={[hStyles.mapCanvas, { width: MAP_WIDTH, height: MAP_HEIGHT }]}>
              {/* Grid lines (decorative) */}
              {[0.25, 0.5, 0.75].map(p => (
                <View key={`h${p}`} style={[hStyles.gridLineH, { top: MAP_HEIGHT * p }]} />
              ))}
              {[0.33, 0.66].map(p => (
                <View key={`v${p}`} style={[hStyles.gridLineV, { left: MAP_WIDTH * p }]} />
              ))}

              {/* Path connectors */}
              {/* (decorative campus paths) */}
              <View style={hStyles.pathH1} />
              <View style={hStyles.pathV1} />

              {/* Building bubbles */}
              {BUILDINGS.map((b, i) => {
                const score   = getBuildingScore(b.id);
                const pred    = getPredictedScore(b.id);
                const style   = getIntensityStyle(score);
                const radius  = Math.max(28, Math.min(56, 28 + score * 2));
                const cx      = MAP_WIDTH  * b.x;
                const cy      = MAP_HEIGHT * b.y;
                const isHot   = score > 8;

                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      hStyles.bubbleWrap,
                      {
                        left: cx - radius,
                        top:  cy - radius,
                        width:  radius * 2,
                        height: radius * 2,
                      },
                    ]}
                    onPress={() => setSelectedBuilding(b.id)}
                    activeOpacity={0.8}
                  >
                    {/* Pulse ring for hot zones */}
                    {isHot && (
                      <Animated.View
                        style={[
                          hStyles.pulseRing,
                          {
                            width:  radius * 2 + 16,
                            height: radius * 2 + 16,
                            borderRadius: radius + 8,
                            borderColor: style.color,
                            left: -8,
                            top:  -8,
                            transform: [{ scale: pulseAnims[i] }],
                          },
                        ]}
                      />
                    )}

                    {/* Main bubble */}
                    <View style={[
                      hStyles.bubble,
                      {
                        width:  radius * 2,
                        height: radius * 2,
                        borderRadius: radius,
                        backgroundColor: style.color + '22',
                        borderColor: style.color,
                        borderWidth: selectedBuilding === b.id ? 3 : 1.5,
                      },
                    ]}>
                      <MaterialIcons name={b.icon} size={radius < 36 ? 14 : 18} color={style.color} />
                      <Text style={[hStyles.bubbleShort, { color: style.color, fontSize: radius < 36 ? 8 : 10 }]}>
                        {b.short}
                      </Text>
                      {score > 0 && (
                        <Text style={[hStyles.bubbleScore, { color: style.color }]}>{score}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Legend */}
          <View style={hStyles.legend}>
            {[
              { color: '#22c55e', label: 'Low (1–3)' },
              { color: '#f59e0b', label: 'Moderate (4–8)' },
              { color: '#f97316', label: 'High (9–15)' },
              { color: '#ef4444', label: 'Critical (15+)' },
            ].map(l => (
              <View key={l.label} style={hStyles.legendItem}>
                <View style={[hStyles.legendDot, { backgroundColor: l.color }]} />
                <Text style={hStyles.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Building Ranking List ── */}
        <View style={hStyles.section}>
          <Text style={hStyles.sectionTitle}>Zone Risk Ranking</Text>
          {BUILDINGS
            .map(b => ({ ...b, score: getBuildingScore(b.id), pred: getPredictedScore(b.id) }))
            .sort((a, b) => b.score - a.score)
            .map((b, rank) => {
              const style = getIntensityStyle(b.score);
              const cats  = getBuildingCategories(b.id);
              return (
                <TouchableOpacity
                  key={b.id}
                  style={hStyles.rankRow}
                  onPress={() => setSelectedBuilding(b.id)}
                >
                  <Text style={hStyles.rankNum}>#{rank + 1}</Text>
                  <View style={[hStyles.rankIcon, { backgroundColor: style.color + '20' }]}>
                    <MaterialIcons name={b.icon} size={18} color={style.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={hStyles.rankName}>{b.label}</Text>
                    <View style={hStyles.rankCats}>
                      {cats.slice(0, 3).map(([cat, cnt]) => (
                        <View key={cat} style={[hStyles.catBadge, { backgroundColor: (CAT_COLOR[cat] || '#94a3b8') + '22' }]}>
                          <Text style={[hStyles.catBadgeText, { color: CAT_COLOR[cat] || '#94a3b8' }]}>
                            {cat} ×{cnt}
                          </Text>
                        </View>
                      ))}
                      {cats.length === 0 && <Text style={hStyles.noData}>No reports</Text>}
                    </View>
                  </View>
                  <View style={hStyles.rankRight}>
                    <Text style={[hStyles.rankScore, { color: style.color }]}>{b.score}</Text>
                    <Text style={hStyles.rankScoreLabel}>score</Text>
                    <View style={[hStyles.riskBadge, { backgroundColor: style.color + '22' }]}>
                      <Text style={[hStyles.riskBadgeText, { color: style.color }]}>{style.label}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
        </View>

        {/* ── Prediction Panel ── */}
        <View style={hStyles.section}>
          <Text style={hStyles.sectionTitle}>🔮 Predicted High-Risk Zones (Next 7 Days)</Text>
          <Text style={hStyles.predSub}>Based on 14-day rolling average per building</Text>
          {BUILDINGS
            .map(b => ({ ...b, pred: getPredictedScore(b.id) }))
            .filter(b => b.pred > 0)
            .sort((a, b) => b.pred - a.pred)
            .slice(0, 4)
            .map((b) => {
              const style = getIntensityStyle(b.pred);
              const barW  = Math.min(100, (b.pred / 20) * 100);
              return (
                <View key={b.id} style={hStyles.predRow}>
                  <MaterialIcons name={b.icon} size={16} color={style.color} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <View style={hStyles.predHeader}>
                      <Text style={hStyles.predName}>{b.label}</Text>
                      <Text style={[hStyles.predVal, { color: style.color }]}>~{b.pred} est.</Text>
                    </View>
                    <View style={hStyles.predBarBg}>
                      <View style={[hStyles.predBar, { width: `${barW}%`, backgroundColor: style.color }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          {BUILDINGS.every(b => getPredictedScore(b.id) === 0) && (
            <Text style={hStyles.noData}>Not enough historical data yet.</Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Building Detail Modal ── */}
      <Modal
        visible={!!selectedBuilding}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedBuilding(null)}
      >
        <TouchableOpacity
          style={hStyles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedBuilding(null)}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={hStyles.detailSheet}>
              {selectedBuildingData && (() => {
                const score = getBuildingScore(selectedBuildingData.id);
                const pred  = getPredictedScore(selectedBuildingData.id);
                const style = getIntensityStyle(score);
                const cats  = getBuildingCategories(selectedBuildingData.id);
                const buildingReports = filteredReports()
                  .filter(r => r.location?.building === selectedBuildingData.id)
                  .slice(0, 5);
                return (
                  <>
                    <View style={hStyles.detailHandle} />
                    <View style={hStyles.detailHeader}>
                      <View style={[hStyles.detailIcon, { backgroundColor: style.color + '20' }]}>
                        <MaterialIcons name={selectedBuildingData.icon} size={28} color={style.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={hStyles.detailTitle}>{selectedBuildingData.label}</Text>
                        <View style={[hStyles.riskBadge, { backgroundColor: style.color + '22', alignSelf: 'flex-start' }]}>
                          <Text style={[hStyles.riskBadgeText, { color: style.color }]}>
                            {style.label} Risk
                          </Text>
                        </View>
                      </View>
                      <Text style={[hStyles.detailScore, { color: style.color }]}>{score}</Text>
                    </View>

                    <View style={hStyles.detailStats}>
                      <View style={hStyles.dStat}>
                        <Text style={hStyles.dStatNum}>{filteredReports().filter(r => r.location?.building === selectedBuildingData.id).length}</Text>
                        <Text style={hStyles.dStatLabel}>Reports</Text>
                      </View>
                      <View style={hStyles.dStat}>
                        <Text style={[hStyles.dStatNum, { color: '#f59e0b' }]}>~{pred}</Text>
                        <Text style={hStyles.dStatLabel}>Predicted (7d)</Text>
                      </View>
                      <View style={hStyles.dStat}>
                        <Text style={[hStyles.dStatNum, { color: '#6366f1' }]}>{cats.length}</Text>
                        <Text style={hStyles.dStatLabel}>Issue Types</Text>
                      </View>
                    </View>

                    <Text style={hStyles.detailSectionLabel}>Issue Breakdown</Text>
                    {cats.length === 0
                      ? <Text style={hStyles.noData}>No reports in this period.</Text>
                      : cats.map(([cat, cnt]) => {
                          const total = filteredReports().filter(r => r.location?.building === selectedBuildingData.id).length || 1;
                          const pct = Math.round((cnt / total) * 100);
                          return (
                            <View key={cat} style={hStyles.catBarRow}>
                              <Text style={[hStyles.catBarLabel, { color: CAT_COLOR[cat] || '#64748b' }]}>
                                {cat}
                              </Text>
                              <View style={hStyles.catBarBg}>
                                <View style={[hStyles.catBarFill, { width: `${pct}%`, backgroundColor: CAT_COLOR[cat] || '#94a3b8' }]} />
                              </View>
                              <Text style={hStyles.catBarPct}>{cnt}</Text>
                            </View>
                          );
                        })
                    }

                    {buildingReports.length > 0 && (
                      <>
                        <Text style={hStyles.detailSectionLabel}>Recent Reports</Text>
                        {buildingReports.map(r => (
                          <View key={r.id} style={hStyles.miniReport}>
                            <View style={[hStyles.miniPriorityDot, {
                              backgroundColor: r.priority === 'critical' ? '#ef4444'
                                : r.priority === 'high' ? '#f97316'
                                : r.priority === 'medium' ? '#f59e0b' : '#22c55e',
                            }]} />
                            <Text style={hStyles.miniReportText} numberOfLines={1}>
                              {r.title || r.description || 'Untitled report'}
                            </Text>
                          </View>
                        ))}
                      </>
                    )}

                    <TouchableOpacity
                      style={hStyles.detailClose}
                      onPress={() => setSelectedBuilding(null)}
                    >
                      <Text style={hStyles.detailCloseText}>Close</Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const hStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#1e2230' },
  header: {
    backgroundColor: '#1e2230',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  headerSub: { color: '#94a3b8', fontSize: 11, fontFamily: 'Outfit-Regular' },
  livePill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef444422',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444' },
  liveText: { color: '#ef4444', fontSize: 11, fontWeight: '700', letterSpacing: 1, fontFamily: 'Outfit-Bold' },

  // Stats
  statsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 10, backgroundColor: '#1e2230' },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
    minWidth: 90,
  },
  statNum: { fontSize: 16, fontWeight: '800', color: '#1e2230', fontFamily: 'Outfit-Bold' },
  statLabel: { fontSize: 10, color: '#64748b', marginTop: 2, fontFamily: 'Outfit-Regular' },

  // Filters
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  filterChipActive: { backgroundColor: '#6366f1' },
  filterChipText: { fontSize: 12, color: '#64748b', fontWeight: '600', fontFamily: 'Outfit-SemiBold' },
  filterChipTextActive: { color: '#fff' },

  catRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#fff',
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  catChipText: { fontSize: 11, color: '#333', fontFamily: 'Outfit-Regular' },

  // Map
  mapContainer: { backgroundColor: '#fff', padding: 16, marginTop: 8 },
  mapLabel: { fontSize: 12, color: '#64748b', marginBottom: 10, fontFamily: 'Outfit-Regular' },
  mapCanvas: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#ffffff0f',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#ffffff0f',
  },
  pathH1: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    top: '50%',
    height: 2,
    backgroundColor: '#334155',
  },
  pathV1: {
    position: 'absolute',
    top: '20%',
    bottom: '15%',
    left: '38%',
    width: 2,
    backgroundColor: '#334155',
  },
  bubbleWrap: { position: 'absolute' },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    opacity: 0.4,
  },
  bubble: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  bubbleShort: { fontWeight: '700', marginTop: 1, fontFamily: 'Outfit-Bold' },
  bubbleScore: { fontSize: 9, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: '#64748b', fontFamily: 'Outfit-Regular' },

  // Ranking
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e2230',
    marginBottom: 12,
    fontFamily: 'Outfit-Bold',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  rankNum: { fontSize: 14, fontWeight: '700', color: '#94a3b8', width: 24, fontFamily: 'Outfit-Bold' },
  rankIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rankName: { fontSize: 13, fontWeight: '600', color: '#1e2230', fontFamily: 'Outfit-SemiBold' },
  rankCats: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  rankRight: { alignItems: 'center' },
  rankScore: { fontSize: 20, fontWeight: '800', fontFamily: 'Outfit-Bold' },
  rankScoreLabel: { fontSize: 9, color: '#94a3b8', fontFamily: 'Outfit-Regular' },
  riskBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  riskBadgeText: { fontSize: 9, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  catBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  catBadgeText: { fontSize: 9, fontWeight: '600', fontFamily: 'Outfit-SemiBold' },
  noData: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', fontFamily: 'Outfit-Regular' },

  // Prediction
  predSub: { fontSize: 11, color: '#94a3b8', marginBottom: 12, fontFamily: 'Outfit-Regular' },
  predRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  predHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  predName: { fontSize: 13, fontWeight: '600', color: '#1e2230', fontFamily: 'Outfit-SemiBold' },
  predVal: { fontSize: 12, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  predBarBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  predBar: { height: 6, borderRadius: 3 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000077',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  detailHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  detailIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  detailTitle: { fontSize: 17, fontWeight: '700', color: '#1e2230', fontFamily: 'Outfit-Bold' },
  detailScore: { fontSize: 32, fontWeight: '800', fontFamily: 'Outfit-Bold' },
  detailStats: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  dStat: { flex: 1, alignItems: 'center' },
  dStatNum: { fontSize: 18, fontWeight: '800', color: '#1e2230', fontFamily: 'Outfit-Bold' },
  dStatLabel: { fontSize: 10, color: '#64748b', marginTop: 2, fontFamily: 'Outfit-Regular' },
  detailSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 4,
    fontFamily: 'Outfit-SemiBold',
  },
  catBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7, gap: 8 },
  catBarLabel: { width: 90, fontSize: 11, fontWeight: '600', textTransform: 'capitalize', fontFamily: 'Outfit-Regular' },
  catBarBg: { flex: 1, height: 7, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: 7, borderRadius: 4 },
  catBarPct: { width: 20, fontSize: 11, color: '#64748b', textAlign: 'right', fontFamily: 'Outfit-Regular' },
  miniReport: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  miniPriorityDot: { width: 8, height: 8, borderRadius: 4 },
  miniReportText: { flex: 1, fontSize: 12, color: '#334155', fontFamily: 'Outfit-Regular' },
  detailClose: {
    marginTop: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  detailCloseText: { fontSize: 14, fontWeight: '600', color: '#64748b', fontFamily: 'Outfit-SemiBold' },
});
