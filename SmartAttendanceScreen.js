/**
 * SmartAttendanceScreen.js
 * AI-powered attendance tracker for BSIT [CSP]-4 — AY 2025-2026 2nd Semester
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Modal, Animated,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  collection, addDoc, getDocs, query, where, orderBy,
  doc, serverTimestamp, deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { useUser } from './App';

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  primary:  '#2667ff',
  bg:       '#f0f4ff',
  surface:  '#ffffff',
  text:     '#0f172a',
  sub:      '#64748b',
  border:   '#e2e8f0',
  present:  '#16a34a',
  absent:   '#ef4444',
  late:     '#f59e0b',
  excused:  '#8b5cf6',
};

// ─── REAL SCHEDULE — AY 2025-2026 2ND SEMESTER ───────────────────────────────
// Days: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const MY_SUBJECTS = [
  {
    id: 'IT_DP',
    code: 'IT DP',
    title: 'IT Capstone Documentation and Publication',
    units: 3,
    instructor: 'Tecson, Cesar Alipiz',
    room: 'N/A',
    section: 'BSIT [CSP]-4',
    days: [0], // Sunday
    timeStart: { h: 13, m: 0 },
    timeEnd:   { h: 15, m: 30 },
    displayTime: 'Sun 1:00 PM – 3:30 PM',
    color: '#2667ff',
    bg: '#eff6ff',
    maxAbsences: 4,
    totalSessions: 18,
  },
  {
    id: 'IT_IES',
    code: 'IT IES',
    title: 'Advanced Seminars and Exposure',
    units: 3,
    instructor: 'Tecson, Sergio Alipis',
    room: 'N/A',
    section: 'BSIT [CSP]-4',
    days: [6], // Saturday
    timeStart: { h: 17, m: 30 },
    timeEnd:   { h: 20, m: 0 },
    displayTime: 'Sat 5:30 PM – 8:00 PM',
    color: '#7c3aed',
    bg: '#f5f3ff',
    maxAbsences: 4,
    totalSessions: 18,
  },
  {
    id: 'IT_PRC',
    code: 'IT PRC',
    title: 'Information Technology Practicum',
    units: 6,
    instructor: 'Hisola, Daryl Ivan Empuerto',
    room: 'N/A',
    section: 'BSIT [CSP]-4',
    days: [6], // Saturday
    timeStart: { h: 10, m: 0 },
    timeEnd:   { h: 12, m: 30 },
    displayTime: 'Sat 10:00 AM – 12:30 PM',
    color: '#dc2626',
    bg: '#fff1f2',
    maxAbsences: 4,
    totalSessions: 18,
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getTodaySubjects() {
  const day = new Date().getDay(); // 0=Sun … 6=Sat
  return MY_SUBJECTS.filter(s => s.days.includes(day));
}

function isCurrentlyInClass(subject) {
  const now = new Date();
  const nowMins   = now.getHours() * 60 + now.getMinutes();
  const startMins = subject.timeStart.h * 60 + subject.timeStart.m;
  const endMins   = subject.timeEnd.h   * 60 + subject.timeEnd.m;
  return nowMins >= startMins && nowMins <= endMins;
}

function isLate(subject) {
  const now     = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins > (subject.timeStart.h * 60 + subject.timeStart.m + 15);
}

function formatTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

function todayStr() { return new Date().toDateString(); }

function statusColor(s) {
  return s === 'present' ? C.present : s === 'late' ? C.late : s === 'excused' ? C.excused : C.absent;
}
function statusIcon(s) {
  return s === 'present' ? 'checkmark-circle' : s === 'late' ? 'alert-circle'
       : s === 'excused' ? 'information-circle' : 'close-circle';
}

// ─── LOCAL AI ANALYSIS ENGINE ─────────────────────────────────────────────────
function generateAIInsight(records, subjects) {
  const insights = [];
  const warnings = [];

  subjects.forEach(subj => {
    const srecs   = records.filter(r => r.subjectId === subj.id);
    const present = srecs.filter(r => r.status === 'present').length;
    const late    = srecs.filter(r => r.status === 'late').length;
    const absent  = srecs.filter(r => r.status === 'absent').length;
    const total   = srecs.length;
    if (total === 0) return;

    const pct      = Math.round(((present + late) / total) * 100);
    const allowable = subj.maxAbsences - absent;

    if (absent > subj.maxAbsences) {
      warnings.push({
        level: 'critical', icon: 'skull-outline', subject: subj.code,
        msg: `${subj.code}: You have ${absent} absences — exceeds the ${subj.maxAbsences}-absence limit. Risk of being dropped!`,
      });
    } else if (allowable <= 1) {
      warnings.push({
        level: 'danger', icon: 'warning-outline', subject: subj.code,
        msg: `${subj.code}: Only ${allowable} absence${allowable === 1 ? '' : 's'} left before being dropped.`,
      });
    } else if (late >= 3) {
      insights.push({
        icon: 'time-outline',
        msg: `${subj.code}: You have been late ${late} times. 3 lates = 1 absence in most policies.`,
      });
    } else if (pct === 100) {
      insights.push({
        icon: 'trophy-outline',
        msg: `${subj.code}: Perfect attendance so far! You can still afford ${allowable} more absences.`,
      });
    } else if (pct >= 90) {
      insights.push({
        icon: 'star-outline',
        msg: `${subj.code}: Great attendance at ${pct}%. ${allowable} absences remaining.`,
      });
    }
  });

  // Saturday pattern
  const satAbsent = records.filter(r => {
    const d = r.date && r.date.toDate ? r.date.toDate() : new Date(0);
    return d.getDay() === 6 && r.status === 'absent';
  }).length;
  const sunAbsent = records.filter(r => {
    const d = r.date && r.date.toDate ? r.date.toDate() : new Date(0);
    return d.getDay() === 0 && r.status === 'absent';
  }).length;
  if (satAbsent > sunAbsent && satAbsent >= 2) {
    insights.push({
      icon: 'analytics-outline',
      msg: 'Pattern detected: You tend to miss Saturday classes more often. Plan ahead.',
    });
  }

  const totalAttended = records.filter(r => r.status !== 'absent').length;
  const overallPct    = records.length > 0
    ? Math.round((totalAttended / records.length) * 100)
    : null;
  return { insights, warnings, overallPct };
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function SmartAttendanceScreen({ navigation }) {
  const { user: userData } = useUser();
  const [tab, setTab]             = useState('today');
  const [records, setRecords]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(null);
  const [aiPanel, setAiPanel]     = useState(false);
  const [aiResult, setAiResult]   = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [detailSubject, setDetailSubject] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadRecords = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'attendanceRecords'),
        where('userId', '==', userData.uid),
        orderBy('date', 'desc'),
      );
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('loadRecords:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData.uid]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const todayRec = (subjectId) => {
    const today = todayStr();
    return records.find(r =>
      r.subjectId === subjectId &&
      (r.date && r.date.toDate ? r.date.toDate() : new Date(0)).toDateString() === today,
    );
  };

  const commitCheckIn = async (subject, status) => {
    setCheckingIn(subject.id);
    try {
      await addDoc(collection(db, 'attendanceRecords'), {
        userId:      userData.uid,
        userEmail:   userData.email || '',
        userName:    userData.displayName || 'Student',
        subjectId:   subject.id,
        subjectCode: subject.code,
        subjectName: subject.title,
        instructor:  subject.instructor,
        status,
        date:        serverTimestamp(),
        createdAt:   serverTimestamp(),
      });
      await loadRecords();
    } catch {
      Alert.alert('Error', 'Could not save attendance. Check your connection.');
    } finally {
      setCheckingIn(null);
    }
  };

  const handleCheckIn = (subject) => {
    const rec = todayRec(subject.id);
    if (rec) {
      Alert.alert(
        'Already Recorded',
        `${subject.code} already marked as ${rec.status} today.`,
        [
          { text: 'OK' },
          { text: 'Delete & Re-check', style: 'destructive',
            onPress: async () => {
              try {
                await deleteDoc(doc(collection(db, 'attendanceRecords'), rec.id));
                await loadRecords();
                handleCheckIn(subject);
              } catch { Alert.alert('Error', 'Could not delete record.'); }
            }},
        ],
      );
      return;
    }
    const status = isLate(subject) ? 'late' : 'present';
    const time   = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    Alert.alert(
      'Confirm Check-In',
      `Subject: ${subject.code}\n${subject.title}\n\nStatus: ${status === 'late' ? 'Late' : 'Present'}\nTime: ${time}\nInstructor: ${subject.instructor}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark Excused', onPress: () => commitCheckIn(subject, 'excused') },
        { text: `Confirm ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          onPress: () => commitCheckIn(subject, status) },
      ],
    );
  };

  const handleMarkAbsent = (subject) => {
    Alert.alert('Mark as Absent', `Record an absence for ${subject.code} today?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Absent', style: 'destructive', onPress: () => commitCheckIn(subject, 'absent') },
    ]);
  };

  const runAIAnalysis = async () => {
    setAiLoading(true);
    setAiPanel(true);
    await new Promise(r => setTimeout(r, 800));
    setAiResult(generateAIInsight(records, MY_SUBJECTS));
    setAiLoading(false);
  };

  const getSubjectStats = (subjectId) => {
    const r       = records.filter(x => x.subjectId === subjectId);
    const present = r.filter(x => x.status === 'present').length;
    const late    = r.filter(x => x.status === 'late').length;
    const absent  = r.filter(x => x.status === 'absent').length;
    const excused = r.filter(x => x.status === 'excused').length;
    const total   = r.length;
    const pct     = total > 0 ? Math.round(((present + late + excused) / total) * 100) : 100;
    return { present, late, absent, excused, total, pct, records: r };
  };

  // Summary totals
  const totalPresent = records.filter(r => r.status === 'present').length;
  const totalLate    = records.filter(r => r.status === 'late').length;
  const totalAbsent  = records.filter(r => r.status === 'absent').length;
  const overallPct   = records.length > 0
    ? Math.round(((totalPresent + totalLate) / records.length) * 100) : 100;
  const todaySubjects = getTodaySubjects();
  const liveSubject   = todaySubjects.find(s => isCurrentlyInClass(s));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 4 }}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Smart Attendance</Text>
          <Text style={s.headerSub}>
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity onPress={runAIAnalysis} style={s.aiBtn}>
          <Ionicons name="sparkles" size={14} color="#fff" />
          <Text style={s.aiBtnTxt}>AI Insight</Text>
        </TouchableOpacity>
      </View>

      {/* ── Live Banner ── */}
      {liveSubject && (
        <View style={s.liveBanner}>
          <Animated.View style={[s.liveDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={s.liveTxt}>LIVE — {liveSubject.code}: {liveSubject.title}</Text>
        </View>
      )}

      {/* ── Stats Strip ── */}
      <View style={s.statsStrip}>
        {[
          { lbl: 'Overall',  val: overallPct + '%', col: overallPct >= 75 ? C.present : C.absent },
          { lbl: 'Present',  val: totalPresent,     col: C.present },
          { lbl: 'Late',     val: totalLate,         col: C.late },
          { lbl: 'Absent',   val: totalAbsent,       col: C.absent },
        ].map(({ lbl, val, col }) => (
          <View key={lbl} style={s.statItem}>
            <Text style={[s.statVal, { color: col }]}>{val}</Text>
            <Text style={s.statLbl}>{lbl}</Text>
          </View>
        ))}
      </View>

      {overallPct < 80 && records.length > 0 && (
        <View style={s.ruleWarn}>
          <Ionicons name="warning-outline" size={15} color="#92400e" />
          <Text style={s.ruleWarnTxt}>
            Below 80% — CHED requires at least 75% to pass. ({overallPct}%)
          </Text>
        </View>
      )}

      {/* ── Tabs ── */}
      <View style={s.tabRow}>
        {[
          { key: 'today',    lbl: "Today's Classes" },
          { key: 'subjects', lbl: 'My Subjects' },
          { key: 'history',  lbl: 'History' },
        ].map(t => (
          <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && s.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[s.tabTxt, tab === t.key && s.tabTxtAct]}>{t.lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} size="large" style={{ marginTop: 48 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRecords(); }} />}
        >
          {/* ═══ TODAY TAB ═══ */}
          {tab === 'today' && (
            <>
              {todaySubjects.length === 0 ? (
                <View style={s.empty}>
                  <Text style={{ fontSize: 52 }}>😴</Text>
                  <Text style={s.emptyTitle}>No classes today!</Text>
                  <Text style={s.emptySub}>
                    Classes are on Sat (IT PRC & IT IES) and Sun (IT DP).
                  </Text>
                </View>
              ) : todaySubjects.map(subj => {
                const rec       = todayRec(subj.id);
                const isNow     = isCurrentlyInClass(subj);
                const isLoading = checkingIn === subj.id;
                return (
                  <View key={subj.id} style={[s.classCard, isNow && { borderColor: C.present, borderWidth: 1.5 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <View style={[s.codeTag, { backgroundColor: subj.color + '18' }]}>
                        <Text style={[s.codeTxt, { color: subj.color }]}>{subj.code}</Text>
                      </View>
                      {isNow && (
                        <View style={s.nowBadge}>
                          <Animated.View style={[s.liveDotSm, { transform: [{ scale: pulseAnim }] }]} />
                          <Text style={s.nowTxt}>In Progress</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.classTitle}>{subj.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                      <Ionicons name="time-outline" size={13} color={C.sub} />
                      <Text style={s.classMeta}>{subj.displayTime}</Text>
                      <Text style={[s.classMeta, { marginHorizontal: 4 }]}>•</Text>
                      <Ionicons name="person-outline" size={13} color={C.sub} />
                      <Text style={s.classMeta}>{subj.instructor}</Text>
                    </View>

                    {rec ? (
                      <View style={[s.statusRow, { backgroundColor: statusColor(rec.status) + '12' }]}>
                        <Ionicons name={statusIcon(rec.status)} size={18} color={statusColor(rec.status)} />
                        <Text style={[s.statusTxt, { color: statusColor(rec.status) }]}>
                          {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                        </Text>
                        <Text style={s.statusTime}>{formatTime(rec.date)}</Text>
                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              await deleteDoc(doc(collection(db, 'attendanceRecords'), rec.id));
                              await loadRecords();
                              handleCheckIn(subj);
                            } catch { Alert.alert('Error', 'Could not edit.'); }
                          }}
                          style={{ marginLeft: 'auto', padding: 4 }}
                        >
                          <Ionicons name="pencil-outline" size={14} color={C.sub} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        <TouchableOpacity
                          style={[s.checkBtn, { backgroundColor: subj.color, flex: 2 }]}
                          onPress={() => handleCheckIn(subj)}
                          disabled={!!checkingIn}
                        >
                          {isLoading
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <>
                                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                                <Text style={s.checkBtnTxt}>
                                  {isLate(subj) ? 'Check In (Late)' : 'Check In'}
                                </Text>
                              </>
                          }
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.checkBtn, { backgroundColor: '#fee2e2', flex: 1 }]}
                          onPress={() => handleMarkAbsent(subj)}
                        >
                          <Text style={[s.checkBtnTxt, { color: C.absent }]}>Absent</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}

              <Text style={s.sectionHead}>Full Semester Schedule</Text>
              {MY_SUBJECTS.map(subj => (
                <View key={subj.id} style={s.schedRow}>
                  <View style={[s.schedDot, { backgroundColor: subj.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.schedCode}>{subj.code} · {subj.instructor}</Text>
                    <Text style={s.schedSubTitle}>{subj.title}</Text>
                  </View>
                  <Text style={s.schedTime}>{subj.displayTime}</Text>
                </View>
              ))}
            </>
          )}

          {/* ═══ SUBJECTS TAB ═══ */}
          {tab === 'subjects' && MY_SUBJECTS.map(subj => {
            const st  = getSubjectStats(subj.id);
            const rem = subj.maxAbsences - st.absent;
            return (
              <TouchableOpacity key={subj.id} style={s.subjCard} onPress={() => setDetailSubject(subj)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={[s.codeTag, { backgroundColor: subj.color + '18' }]}>
                    <Text style={[s.codeTxt, { color: subj.color }]}>{subj.code}</Text>
                  </View>
                  <Text style={[s.pctBig, { color: st.pct >= 75 ? C.present : C.absent, marginLeft: 'auto' }]}>
                    {st.pct}%
                  </Text>
                </View>
                <Text style={s.subjTitle}>{subj.title}</Text>
                <Text style={s.subjInst}>{subj.instructor} · {subj.units} units · {subj.displayTime}</Text>
                <View style={s.barBg}>
                  <View style={[s.barFill, { width: `${st.pct}%`, backgroundColor: st.pct >= 75 ? C.present : C.absent }]} />
                </View>
                <View style={s.pillRow}>
                  {[
                    { lbl: 'Present', val: st.present, c: C.present },
                    { lbl: 'Late',    val: st.late,    c: C.late },
                    { lbl: 'Absent',  val: st.absent,  c: C.absent },
                    { lbl: 'Allowed', val: Math.max(0, rem), c: rem <= 1 ? C.absent : C.sub },
                  ].map(p => (
                    <View key={p.lbl} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 16, color: p.c }}>{p.val}</Text>
                      <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 11, color: C.sub }}>{p.lbl}</Text>
                    </View>
                  ))}
                </View>
                {rem <= 1 && st.total > 0 && (
                  <View style={s.warnBadge}>
                    <Ionicons name="warning" size={13} color="#92400e" />
                    <Text style={s.warnBadgeTxt}>
                      {rem <= 0 ? 'Absence limit reached!' : 'Only 1 absence left!'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* ═══ HISTORY TAB ═══ */}
          {tab === 'history' && (
            records.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="document-text-outline" size={52} color={C.sub} />
                <Text style={s.emptyTitle}>No records yet</Text>
                <Text style={s.emptySub}>Check in to start tracking attendance.</Text>
              </View>
            ) : records.map(rec => (
              <View key={rec.id} style={s.histRow}>
                <Ionicons name={statusIcon(rec.status)} size={20} color={statusColor(rec.status)} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.histCode}>{rec.subjectCode}</Text>
                  <Text style={s.histDate}>{formatDate(rec.date)} · {formatTime(rec.date)}</Text>
                </View>
                <View style={[s.histBadge, { backgroundColor: statusColor(rec.status) + '18' }]}>
                  <Text style={[s.histBadgeTxt, { color: statusColor(rec.status) }]}>
                    {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ═══ Subject Detail Modal ═══ */}
      <Modal visible={!!detailSubject} animationType="slide" transparent onRequestClose={() => setDetailSubject(null)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            {detailSubject && (() => {
              const st = getSubjectStats(detailSubject.id);
              return (
                <ScrollView>
                  <View style={[s.sheetBanner, { backgroundColor: detailSubject.color }]}>
                    <Text style={s.bannerCode}>{detailSubject.code} · {detailSubject.section}</Text>
                    <Text style={s.bannerTitle}>{detailSubject.title}</Text>
                    <Text style={s.bannerSub}>{detailSubject.displayTime}</Text>
                  </View>
                  {[
                    { icon: 'person-outline',        lbl: 'Instructor',   val: detailSubject.instructor },
                    { icon: 'ribbon-outline',         lbl: 'Units',        val: `${detailSubject.units} units` },
                    { icon: 'stats-chart-outline',    lbl: 'Attendance',   val: `${st.pct}%` },
                    { icon: 'alert-circle-outline',   lbl: 'Max Absences', val: `${detailSubject.maxAbsences} absences allowed` },
                    { icon: 'checkmark-done-outline', lbl: 'Sessions',     val: `${st.total} recorded of ~${detailSubject.totalSessions}` },
                  ].map(row => (
                    <View key={row.lbl} style={s.detailRow}>
                      <Ionicons name={row.icon} size={17} color={detailSubject.color} style={{ width: 24 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.detailLbl}>{row.lbl}</Text>
                        <Text style={s.detailVal}>{row.val}</Text>
                      </View>
                    </View>
                  ))}
                  {st.records.length > 0 && (
                    <>
                      <Text style={[s.sectionHead, { marginBottom: 8 }]}>Recent Records</Text>
                      {st.records.slice(0, 6).map(rec => (
                        <View key={rec.id} style={s.histRow}>
                          <Ionicons name={statusIcon(rec.status)} size={18} color={statusColor(rec.status)} />
                          <Text style={[s.histDate, { marginLeft: 8, flex: 1 }]}>
                            {formatDate(rec.date)} · {formatTime(rec.date)}
                          </Text>
                          <View style={[s.histBadge, { backgroundColor: statusColor(rec.status) + '18' }]}>
                            <Text style={[s.histBadgeTxt, { color: statusColor(rec.status) }]}>
                              {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                  <TouchableOpacity style={s.closeBtn} onPress={() => setDetailSubject(null)}>
                    <Text style={s.closeBtnTxt}>Close</Text>
                  </TouchableOpacity>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ═══ AI Insight Panel ═══ */}
      <Modal visible={aiPanel} animationType="slide" transparent onRequestClose={() => setAiPanel(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <View style={s.aiIcon}>
                <Ionicons name="sparkles" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 17, color: C.text }}>AI Attendance Insight</Text>
                <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 13, color: C.sub }}>BSIT [CSP]-4 · AY 2025-2026 Sem 2</Text>
              </View>
            </View>

            {aiLoading ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <ActivityIndicator color={C.primary} size="large" />
                <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 14, color: C.sub, marginTop: 12, textAlign: 'center' }}>
                  Analyzing your attendance patterns…
                </Text>
              </View>
            ) : aiResult ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Score Card */}
                <View style={s.aiScoreCard}>
                  <Text style={s.aiScoreNum}>
                    {aiResult.overallPct != null ? `${aiResult.overallPct}%` : 'N/A'}
                  </Text>
                  <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 14, color: C.sub, marginTop: 2 }}>
                    Overall Attendance Rate
                  </Text>
                  <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 14, color: C.text, marginTop: 6, textAlign: 'center' }}>
                    {aiResult.overallPct == null    ? 'No records yet — start checking in!'
                     : aiResult.overallPct >= 90   ? 'Excellent — keep it up!'
                     : aiResult.overallPct >= 75   ? 'Passing — stay consistent'
                     : 'Below 75% — attendance is at risk'}
                  </Text>
                </View>

                {aiResult.warnings.length > 0 && (
                  <>
                    <Text style={s.aiSecHead}>Warnings</Text>
                    {aiResult.warnings.map((w, i) => (
                      <View key={i} style={[s.aiCard, { borderLeftColor: C.absent }]}>
                        <Ionicons name={w.icon} size={18} color={C.absent} style={{ marginRight: 10 }} />
                        <Text style={s.aiCardTxt}>{w.msg}</Text>
                      </View>
                    ))}
                  </>
                )}

                {aiResult.insights.length > 0 && (
                  <>
                    <Text style={s.aiSecHead}>Insights</Text>
                    {aiResult.insights.map((ins, i) => (
                      <View key={i} style={[s.aiCard, { borderLeftColor: C.primary }]}>
                        <Ionicons name={ins.icon} size={18} color={C.primary} style={{ marginRight: 10 }} />
                        <Text style={s.aiCardTxt}>{ins.msg}</Text>
                      </View>
                    ))}
                  </>
                )}

                <Text style={s.aiSecHead}>Per Subject Breakdown</Text>
                {MY_SUBJECTS.map(subj => {
                  const st  = getSubjectStats(subj.id);
                  const rem = Math.max(0, subj.maxAbsences - st.absent);
                  return (
                    <View key={subj.id} style={s.aiSubjRow}>
                      <View style={[s.schedDot, { backgroundColor: subj.color }]} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={{ fontFamily: 'Outfit-SemiBold', fontSize: 13, color: C.text }}>{subj.code}</Text>
                        <View style={s.barBg}>
                          <View style={[s.barFill, { width: `${st.pct}%`, backgroundColor: st.pct >= 75 ? C.present : C.absent }]} />
                        </View>
                      </View>
                      <Text style={[{ fontFamily: 'Outfit-Bold', fontSize: 14, width: 46, textAlign: 'right' }, { color: st.pct >= 75 ? C.present : C.absent }]}>
                        {st.pct}%
                      </Text>
                      <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 11, color: C.sub, width: 50, textAlign: 'right' }}>
                        {rem} left
                      </Text>
                    </View>
                  );
                })}

                <View style={s.tipCard}>
                  <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 14, color: C.primary, marginBottom: 6 }}>
                    Study Tip
                  </Text>
                  <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 13, color: C.text, lineHeight: 20 }}>
                    You are in your final semester (4th Year BSIT). Attendance in IT PRC (6 units)
                    and IT DP matters for graduation clearance. Missing even one Saturday session can
                    compound quickly. Aim for 100% this semester!
                  </Text>
                </View>

                {aiResult.warnings.length === 0 && aiResult.insights.length === 0 && records.length === 0 && (
                  <Text style={{ fontFamily: 'Outfit-Regular', fontSize: 14, color: C.sub, textAlign: 'center', marginTop: 12 }}>
                    Check in to your first class to generate smart insights!
                  </Text>
                )}
              </ScrollView>
            ) : null}

            <TouchableOpacity style={s.closeBtn} onPress={() => setAiPanel(false)}>
              <Text style={s.closeBtnTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 17, color: C.text },
  headerSub:   { fontFamily: 'Outfit-Regular', fontSize: 12, color: C.sub },
  aiBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  aiBtnTxt:    { fontFamily: 'Outfit-SemiBold', fontSize: 12, color: '#fff' },
  liveBanner:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  liveDot:     { width: 9, height: 9, borderRadius: 5, backgroundColor: C.present },
  liveDotSm:   { width: 7, height: 7, borderRadius: 4, backgroundColor: C.present },
  liveTxt:     { fontFamily: 'Outfit-SemiBold', fontSize: 13, color: '#14532d', flex: 1 },
  statsStrip:  { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  statItem:    { flex: 1, alignItems: 'center' },
  statVal:     { fontFamily: 'Outfit-Bold', fontSize: 20 },
  statLbl:     { fontFamily: 'Outfit-Regular', fontSize: 12, color: C.sub, marginTop: 2 },
  ruleWarn:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef3c7', paddingHorizontal: 16, paddingVertical: 8 },
  ruleWarnTxt: { fontFamily: 'Outfit-SemiBold', fontSize: 13, color: '#92400e', flex: 1 },
  tabRow:      { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.border },
  tab:         { flex: 1, paddingVertical: 11, alignItems: 'center' },
  tabActive:   { borderBottomWidth: 2, borderBottomColor: C.primary },
  tabTxt:      { fontFamily: 'Outfit-SemiBold', fontSize: 12, color: C.sub },
  tabTxtAct:   { color: C.primary },
  classCard:   { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  codeTag:     { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  codeTxt:     { fontFamily: 'Outfit-Bold', fontSize: 12 },
  nowBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  nowTxt:      { fontFamily: 'Outfit-SemiBold', fontSize: 11, color: '#14532d' },
  classTitle:  { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: C.text, marginBottom: 4, marginTop: 6 },
  classMeta:   { fontFamily: 'Outfit-Regular', fontSize: 12, color: C.sub },
  statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, padding: 10, marginTop: 10 },
  statusTxt:   { fontFamily: 'Outfit-Bold', fontSize: 14, flex: 1 },
  statusTime:  { fontFamily: 'Outfit-Regular', fontSize: 12, color: C.sub },
  checkBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 11 },
  checkBtnTxt: { fontFamily: 'Outfit-Bold', fontSize: 14, color: '#fff' },
  sectionHead: { fontFamily: 'Outfit-SemiBold', fontSize: 13, color: C.sub, marginTop: 8, marginBottom: 10 },
  schedRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  schedDot:    { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  schedCode:   { fontFamily: 'Outfit-Bold', fontSize: 13, color: C.text },
  schedSubTitle:{ fontFamily: 'Outfit-Regular', fontSize: 12, color: C.sub },
  schedTime:   { fontFamily: 'Outfit-Regular', fontSize: 11, color: C.sub },
  subjCard:    { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  pctBig:      { fontFamily: 'Outfit-Bold', fontSize: 22 },
  subjTitle:   { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: C.text, marginBottom: 2 },
  subjInst:    { fontFamily: 'Outfit-Regular', fontSize: 12, color: C.sub, marginBottom: 10 },
  barBg:       { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, marginBottom: 12, overflow: 'hidden' },
  barFill:     { height: 8, borderRadius: 4 },
  pillRow:     { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  warnBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fef3c7', borderRadius: 8, padding: 8, marginTop: 10 },
  warnBadgeTxt:{ fontFamily: 'Outfit-SemiBold', fontSize: 12, color: '#92400e' },
  histRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8 },
  histCode:    { fontFamily: 'Outfit-SemiBold', fontSize: 14, color: C.text },
  histDate:    { fontFamily: 'Outfit-Regular', fontSize: 12, color: C.sub, marginTop: 1 },
  histBadge:   { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  histBadgeTxt:{ fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  empty:       { alignItems: 'center', paddingVertical: 60 },
  emptyTitle:  { fontFamily: 'Outfit-Bold', fontSize: 18, color: C.text, marginTop: 14 },
  emptySub:    { fontFamily: 'Outfit-Regular', fontSize: 14, color: C.sub, marginTop: 6, textAlign: 'center', lineHeight: 22 },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetBanner: { borderRadius: 16, padding: 18, marginBottom: 20 },
  bannerCode:  { fontFamily: 'Outfit-Bold', fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  bannerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  bannerSub:   { fontFamily: 'Outfit-Regular', fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  detailRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 6 },
  detailLbl:   { fontFamily: 'Outfit-SemiBold', fontSize: 12, color: C.sub },
  detailVal:   { fontFamily: 'Outfit-Regular', fontSize: 14, color: C.text, marginTop: 1 },
  closeBtn:    { backgroundColor: '#f1f5f9', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  closeBtnTxt: { fontFamily: 'Outfit-SemiBold', fontSize: 15, color: C.sub },
  aiIcon:      { width: 40, height: 40, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  aiScoreCard: { backgroundColor: C.bg, borderRadius: 16, paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center', marginBottom: 16 },
  aiScoreNum:  { fontFamily: 'Outfit-Bold', fontSize: 52, color: C.primary },
  aiSecHead:   { fontFamily: 'Outfit-Bold', fontSize: 14, color: C.text, marginBottom: 10, marginTop: 4 },
  aiCard:      { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3 },
  aiCardTxt:   { fontFamily: 'Outfit-Regular', fontSize: 13, color: C.text, flex: 1, lineHeight: 20 },
  aiSubjRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 8 },
  tipCard:     { backgroundColor: '#eff6ff', borderRadius: 14, padding: 16, marginTop: 4, marginBottom: 8 },
});
